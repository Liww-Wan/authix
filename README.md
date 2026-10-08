# 🔐 WebAuth Vault

Um **cofre de códigos de segurança** que funciona direto no navegador. Ele gera aqueles códigos de 6 números que mudam a cada 30 segundos, usados para entrar em contas como Google, Microsoft e GitHub com mais segurança.

**Tudo fica só no seu aparelho.** Nada é enviado para a Internet, não há cadastro, anúncios nem rastreadores.

---

## 🤔 Para que serve?

Muitos sites pedem uma "verificação em duas etapas": além da senha, você digita um código que muda toda hora. Este app cria esse código para você, sem precisar de outro aplicativo instalado.

---

## 🚀 Como começar (passo a passo)

### 1. Abra o app
Acesse o endereço onde ele foi publicado. No celular, você pode escolher "Adicionar à tela inicial" para abrir como um aplicativo.

### 2. Crie o seu cofre
Escolha uma **senha mestra** com pelo menos 12 caracteres. Uma frase longa é uma boa ideia, por exemplo: *"meu gato come peixe todo domingo"*. Digite a senha duas vezes e clique em **Criar cofre**.

> ⚠️ **Muito importante:** se você esquecer a senha mestra e não tiver um backup, **ninguém consegue abrir o cofre de novo**, nem eu. Anote a senha num lugar seguro.

### 3. Adicione uma conta
Clique em **+ Adicionar**. Você pode:
- **escanear o QR Code** que o site mostra (com a câmera, ou usando uma foto/print do QR);
- **colar o link** que começa com `otpauth://`;
- **digitar a chave** (uma sequência de letras e números) que o site fornece.

Exemplo com o Google: entre na sua conta Google, abra **Segurança → Verificação em duas etapas → Aplicativo autenticador** e escaneie o QR que aparecer.

### 4. Use o código
Cada conta mostra um código que muda a cada 30 segundos. A barra azul mostra quanto tempo falta.
- **Mostrar/Ocultar:** mostra ou esconde o código.
- **Copiar:** copia o código para você colar no site.
- Digite o código na página oficial (por exemplo, a do Google). O app **nunca** entra na sua conta por você.

### 5. Faça um backup
Clique em **Backup**, digite a senha mestra e escolha uma senha para o backup (pode ser diferente). O app baixa um arquivo chamado `webauth-vault.wv`, que é **trancado com senha**. Guarde esse arquivo num lugar seguro, fora do celular (por exemplo, no e-mail ou num pen drive). Faça um backup novo sempre que adicionar uma conta.

### 6. Recupere o backup
Se trocar de aparelho ou apagar o cofre: crie um cofre novo, clique em **Backup**, escolha o arquivo `.wv`, digite a **senha do backup** e clique em **Importar**.

### 7. Use sem Internet
Depois da primeira visita, o app funciona mesmo sem Internet.

### 8. Apague tudo
Na tela de desbloqueio, clique em **Apagar cofre deste navegador**. Isso apaga as contas daquele aparelho. Sem backup, não dá para desfazer.

---

## 🛡️ Como seu cofre é protegido

- Sua senha mestra **nunca é guardada**. Ela só serve para trancar e destrancar o cofre.
- As suas contas ficam **embaralhadas** (criptografadas) dentro do navegador. Sem a senha, o conteúdo parece só letras sem sentido.
- Depois de **2 minutos sem uso**, o cofre se tranca sozinho.
- O app não usa Google Analytics, anúncios, cookies de rastreamento nem servidor próprio.

---

## ⚠️ O que o app NÃO consegue fazer

Nenhum programa é 100% seguro. Fique atento:
- Se o aparelho tiver **vírus** ou uma extensão maliciosa, o cofre aberto pode ser espiado.
- Se alguém pegar o seu aparelho com o cofre **destrancado**, vai ver os códigos. Tranque com o botão **Bloquear** quando sair.
- O navegador pode apagar os dados do site (por exemplo, ao limpar o histórico). **Por isso o backup é tão importante.**
- Use uma senha mestra **longa**. Quanto maior, mais difícil de adivinhar.
- Cuidado com o botão Copiar: o código copiado fica na área de transferência, que outros programas podem ler.

---

## 📋 Resumo rápido

| Quero... | Faço assim |
|---|---|
| Começar | Crio o cofre com uma senha mestra longa |
| Adicionar conta | **+ Adicionar** e escaneio o QR |
| Pegar o código | **Copiar** ou **Mostrar/Ocultar** |
| Guardar com segurança | **Backup** e guardo o arquivo `.wv` |
| Recuperar | Crio um cofre novo e uso **Importar** |
| Sair com segurança | Clico em **Bloquear** |

---

## 👩‍💻 Para quem publica o projeto (GitHub Pages)

1. Crie um repositório **público** no GitHub e envie os arquivos para a raiz dele.
2. Vá em **Settings → Pages**, escolha **Deploy from a branch**, branch **main**, pasta **/ (root)** e clique em **Save**.
3. Espere cerca de 1 a 3 minutos. O endereço será parecido com `https://usuario.github.io/nome-do-repositorio/`.

**Testar no seu computador:** abra um terminal na pasta do projeto, rode `python3 -m http.server 8000` e acesse `http://localhost:8000/`.

**Atualizar:** edite os arquivos e, em `service-worker.js`, aumente o número da linha `const VERSION` (por exemplo, de `wv-v9` para `wv-v10`). Faça o commit e recarregue o site duas vezes.

**Arquivos do projeto:** `index.html`, `css/style.css`, `js/` (`app.js`, `crypto.js`, `totp.js`, `vault.js`, `qr.js` e a pasta `vendor/`), `manifest.json`, `service-worker.js` e `icons/`.

---

## 🔧 Detalhes técnicos

- **Cofre:** a senha mestra passa por PBKDF2-HMAC-SHA-256 (600.000 iterações, salt aleatório de 16 bytes) e gera uma chave AES-256-GCM não extraível. Cada gravação usa um IV aleatório novo de 12 bytes. Os dados cifrados ficam no `localStorage`.
- **Por que PBKDF2 e não Argon2id:** Argon2id exigiria código de terceiros (WebAssembly). Optei só pela Web Crypto nativa do navegador, que tem menos superfície de ataque. Em troca, PBKDF2 resiste menos a ataques com placas de vídeo, por isso a senha mestra deve ser longa.
- **TOTP (RFC 6238):** SHA-1, SHA-256 e SHA-512, com 6 ou 8 dígitos e período configurável. Conferido com os vetores de teste da RFC.
- **QR Code:** leitura com jsQR 1.4.0 e geração com qrcode-generator 1.4.4, ambas copiadas para `js/vendor/` (sem CDN) e processadas localmente.
- **Proteção da página:** CSP via `<meta>` (sem scripts inline, sem `eval`, `connect-src 'self'`); a interface usa `textContent` e `createElement`, nunca `innerHTML`.
- **Backup:** arquivo `.wv` cifrado com salt e IV próprios, com senha independente da senha mestra. Na importação, o app valida o formato, limita as iterações (100 mil a 5 milhões) e o tamanho do arquivo.
- **Service worker:** rede primeiro, cache apenas como reserva offline; só atende pedidos GET do mesmo site e nunca guarda backups.
- **Não implementado:** WebAuthn/Passkeys (era opcional). Se for adicionado, servirá só como desbloqueio extra da interface, sem substituir a criptografia do cofre.
- **Revisão de segurança:** foi uma autoanálise, **não** uma auditoria independente. Confira os commits do repositório e proteja sua conta do GitHub, porque quem controla o repositório controla o código que roda no navegador.

---

## 🆘 Esqueci a senha mestra

Sem a senha mestra e sem um backup válido, o cofre **não pode ser recuperado**. O app não tem senha de administrador nem acesso secreto, de propósito.
