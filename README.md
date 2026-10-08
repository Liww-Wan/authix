# WebAuth Vault

Autenticador 2FA/TOTP (RFC 6238) **100% client-side**, estático, para GitHub Pages. Sem backend, sem telemetria, sem contas.

## Arquitetura de segurança
Senha mestra → PBKDF2-HMAC-SHA-256 (600.000 iterações, salt aleatório de 16 bytes) → chave AES-256-GCM (não extraível) → cofre cifrado em `localStorage`. Cada gravação usa IV aleatório novo de 12 bytes (`crypto.getRandomValues`).
- **Por que PBKDF2 e não Argon2id:** Argon2id exigiria WASM de terceiros; preferi apenas a Web Crypto nativa (menos superfície de ataque). Compensação: PBKDF2 é menos resistente a GPUs, então use uma senha mestra longa (frase-senha).
- **TOTP:** SHA-1/256/512, 6 ou 8 dígitos, período configurável (validado com os vetores da RFC 6238).
- **QR:** leitura (`jsQR 1.4.0`) e geração (`qrcode-generator 1.4.4`) locais; ambas são cópias vendorizadas em `js/vendor/` (sem CDN).
- **CSP** por `<meta>` (sem inline, sem eval, `connect-src 'self'`); a UI usa `textContent`/`createElement`, nunca `innerHTML`.
- **Auto-bloqueio** após 2 min de inatividade (`LOCK_MS` em `js/app.js`).
- **Não implementado:** WebAuthn/Passkeys (opcional no pedido). Se adicionado, serviria só como desbloqueio extra da interface; não substitui a cifragem do cofre (cifragem = proteger dados em repouso; autenticação = provar quem usa; TOTP = gerar o código).

## Estrutura
`index.html`, `css/style.css`, `js/{app,crypto,totp,vault,qr}.js`, `js/vendor/`, `manifest.json`, `service-worker.js`, `icons/`. Todos os caminhos são relativos, então funciona em `https://usuario.github.io/webauth/`.

## Publicar no GitHub Pages
1. Crie um repositório público (ex.: `webauth`) e envie estes arquivos na raiz: `git init && git add . && git commit -m "WebAuth Vault" && git branch -M main && git remote add origin <URL> && git push -u origin main`.
2. No GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/ (root)` → Save**.
3. Aguarde ~1 min e abra `https://usuario.github.io/webauth/`.

## Testar localmente
`python3 -m http.server 8000` e abra `http://localhost:8000/` (service worker e câmera exigem HTTPS ou localhost).

## Atualizar
Edite os arquivos, **incremente `VERSION` em `service-worker.js`** (ex.: `wv-v2`), faça commit e push. Os clientes recebem a versão nova na visita seguinte.

## Uso
1. **Abrir:** acesse a URL do Pages (no celular, "Adicionar à tela inicial").
2. **Criar cofre:** defina a senha mestra (mín. 12 caracteres) e confirme.
3. **Adicionar conta Google:** na página de segurança do Google, escolha configurar app autenticador e clique em **+ Adicionar**.
4. **Escanear QR:** botão "Escanear com câmera" ou "Imagem de QR"; também dá para colar o `otpauth://` ou digitar a chave Base32.
5. **Gerar código:** clique em "Mostrar/Ocultar" ou "Copiar" e digite o código na página oficial do Google (o app nunca faz login nem usa OAuth).
6. **Backup:** Backup → confirme a senha mestra → defina a senha do backup (pode ser diferente) → baixa `webauth-vault.wv` (cifrado).
7. **Restaurar:** em outro navegador crie um cofre, vá em Backup → escolha o `.wv` → senha do backup → Importar (mescla sem duplicar).
8. **Offline:** após a primeira visita, o service worker guarda os arquivos; funciona sem Internet. A senha mestra nunca é armazenada.
9. **Apagar tudo:** tela de bloqueio → "Apagar cofre deste navegador" (e, se quiser, limpe os dados do site e desregistre o service worker).

## ⚠️ Recuperação
Se esquecer a senha mestra e não tiver um backup válido, **o cofre é irrecuperável**. Não há senha administrativa nem backdoor.

## Revisão de segurança (autoanálise, não é auditoria independente)
- XSS: sem `innerHTML`; dados do usuário só via `textContent`/atributos; CSP sem `unsafe-inline`/`unsafe-eval`.
- Segredos: nenhum em código, URL ou parâmetros GET; sem `console.log`; nenhuma chamada de rede (`connect-src 'self'`). CSRF não se aplica (sem backend).
- IV: aleatório por cifragem (12 bytes); salt aleatório por cofre e por backup.
- Importação: valida formato e limita iterações (100k–5M) e tamanho do arquivo.
- Service worker: só GET do mesmo origin, só arquivos estáticos; backups são downloads, nunca vão ao cache.
- Dependências: 2 bibliotecas fixas, vendorizadas; confira os hashes ao atualizá-las.

## Limitações reais
**Não é "100% seguro".** O navegador não permite apagar memória de forma garantida: limpar variáveis ao bloquear reduz, mas não elimina, resíduos (GC, swap). Malware, extensões maliciosas ou XSS em outro conteúdo do mesmo origin podem ler o cofre desbloqueado. `localStorage` pode ser apagado pelo navegador (mantenha backups). A CSP via `<meta>` não cobre `frame-ancestors`. Um atacante com o cofre cifrado pode tentar força bruta offline: use senha longa. A área de transferência é compartilhada com outros apps. Quem controlar o repositório/Pages pode publicar código alterado: use um repositório protegido e confira os commits.
