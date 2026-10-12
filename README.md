# 🔐 WebAuth Vault (Authix)

Um **cofre de códigos de segurança** que funciona direto no navegador. Ele gera aqueles códigos de 6 números que mudam a cada 30 segundos, usados para entrar em contas como Google, Microsoft e GitHub com mais segurança.

**Tudo fica só no seu aparelho.** Nada é enviado para a Internet, não há cadastro, anúncios nem rastreadores.

## 🤔 Para que serve?

Muitos sites pedem uma "verificação em duas etapas": além da senha, você digita um código que muda toda hora. Este app cria esse código para você, sem precisar de outro aplicativo instalado.

## 🚀 Como começar

1. **Abra o app.** No celular, você pode escolher "Adicionar à tela inicial" para abrir como um aplicativo.
2. **Crie o seu cofre.** Escolha uma **senha mestra** com pelo menos 12 caracteres. Uma frase longa é uma boa ideia, por exemplo: *"meu gato come peixe todo domingo"*. Digite duas vezes e clique em **Criar cofre**.
   > ⚠️ Se você esquecer a senha mestra e não tiver um backup, **ninguém consegue abrir o cofre de novo**. Anote a senha num lugar seguro.
3. **Adicione uma conta.** Clique em **+ Adicionar** e escaneie o QR Code do site, cole o link que começa com `otpauth://` ou digite a chave. No Google: **Segurança → Verificação em duas etapas → Aplicativo autenticador**.
4. **Use o código.** A barra azul mostra quanto tempo falta. Use **Mostrar/Ocultar** e **Copiar**, e digite o código na página oficial. O app **nunca** entra na sua conta por você.
5. **Faça um backup.** Clique em **Backup**, digite a senha mestra e escolha uma senha para o backup. O app baixa o arquivo `webauth-vault.wv`, trancado com senha. Guarde fora do celular e refaça sempre que adicionar uma conta.
6. **Recupere o backup.** Crie um cofre novo, clique em **Backup**, escolha o arquivo `.wv`, digite a senha do backup e clique em **Importar**.
7. **Sem Internet.** Depois da primeira visita, o app funciona offline.
8. **Apagar tudo.** Na tela de desbloqueio, clique em **Apagar cofre deste navegador**. Sem backup, não dá para desfazer.

## 🛡️ Como seu cofre é protegido

- Sua senha mestra **nunca é guardada**.
- As contas ficam **criptografadas** no navegador. Sem a senha, parecem só letras sem sentido.
- Depois de **2 minutos sem uso**, o cofre se tranca sozinho.
- Sem Google Analytics, anúncios, rastreadores nem servidor próprio.

## ⚠️ O que o app NÃO consegue fazer

Nenhum programa é 100% seguro.
- Se o aparelho tiver **vírus** ou extensão maliciosa, o cofre aberto pode ser espiado.
- Se alguém pegar o aparelho com o cofre **aberto**, vai ver os códigos. Use **Bloquear** ao sair.
- O navegador pode apagar os dados do site (por exemplo, ao limpar o histórico). **Por isso o backup é tão importante.**
- Use uma senha mestra **longa**.
- O código copiado fica na área de transferência, que outros programas podem ler.
- Projeto pessoal, **sem auditoria independente**. Guarde também os códigos de recuperação das suas contas.

## 📋 Resumo rápido

| Quero... | Faço assim |
|---|---|
| Começar | Crio o cofre com uma senha mestra longa |
| Adicionar conta | **+ Adicionar** e escaneio o QR |
| Pegar o código | **Copiar** ou **Mostrar/Ocultar** |
| Guardar com segurança | **Backup** e guardo o arquivo `.wv` |
| Recuperar | Crio um cofre novo e uso **Importar** |
| Sair com segurança | Clico em **Bloquear** |

## 👩‍💻 Para quem publica o projeto (GitHub Pages)

1. Crie um repositório **público** e envie os arquivos para a raiz dele.
2. **Settings → Pages → Deploy from a branch → `main` / `/ (root)` → Save**.
3. Espere 1 a 3 minutos. O endereço será parecido com `https://usuario.github.io/nome-do-repositorio/`.

**Testar no computador:** na pasta do projeto, rode `python3 -m http.server 8000` e abra `http://localhost:8000/`.

**Atualizar:** edite os arquivos e aumente o número da linha `const VERSION` em `service-worker.js`. Faça o commit e recarregue o site duas vezes.

**Arquivos:** `index.html`, `css/style.css`, `js/` (`app.js`, `crypto.js`, `totp.js`, `vault.js`, `qr.js`, `vendor/`), `manifest.json`, `service-worker.js`, `icons/`.

## 🔧 Detalhes técnicos

- **Cofre:** senha mestra → PBKDF2-HMAC-SHA-256 (600.000 iterações, salt aleatório de 16 bytes) → chave AES-256-GCM não extraível. IV aleatório novo de 12 bytes a cada gravação. Dados cifrados no `localStorage`.
- **PBKDF2 e não Argon2id:** Argon2id exigiria código de terceiros (WebAssembly). Optei só pela Web Crypto nativa. PBKDF2 resiste menos a placas de vídeo, por isso a senha mestra deve ser longa.
- **TOTP (RFC 6238):** SHA-1, SHA-256 e SHA-512, 6 ou 8 dígitos, período configurável, conferido com os vetores da RFC.
- **QR Code:** jsQR 1.4.0 (leitura) e qrcode-generator 1.4.4 (geração), em `js/vendor/`, sem CDN, processados localmente.
- **Proteção da página:** CSP via `<meta>` (sem inline, sem `eval`, `connect-src 'self'`); interface sem `innerHTML`.
- **Backup:** `.wv` cifrado com salt e IV próprios e senha independente. A importação valida o formato e limita iterações e tamanho.
- **Service worker:** rede primeiro, cache só como reserva offline; só pedidos GET do mesmo site.
- **Não implementado:** WebAuthn/Passkeys (opcional).
- **Revisão de segurança:** autoanálise, **não** auditoria independente. O `localStorage` vale para toda a origem `usuario.github.io`; evite hospedar outros sites com scripts de terceiros no mesmo endereço. Quem controla o repositório controla o código: proteja sua conta do GitHub.

## 🆘 Esqueci a senha mestra

Sem a senha mestra e sem um backup válido, o cofre **não pode ser recuperado**. Não há senha de administrador nem acesso secreto, de propósito.
