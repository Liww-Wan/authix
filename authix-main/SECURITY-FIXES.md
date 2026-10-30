# Authix — correções de segurança

Esta revisão aplica endurecimento defensivo ao código do cliente:

- Campos de senhas e chave TOTP usam `type="password"` nativo em todos os navegadores.
- Metadados do cofre e dos backups são validados antes da derivação de chave; PBKDF2 é limitado a 100.000–1.000.000 iterações.
- Salt, IV e texto cifrado são validados estruturalmente.
- Conteúdo descriptografado é validado quanto ao esquema, limites e campos das contas.
- Importação limitada a 5 MiB e 500 contas, com mesclagem validada e reversão em falha de gravação.
- Alterações e exclusões no cofre revertem o estado em memória se a gravação falhar.
- Service worker só faz cache de uma lista explícita de recursos estáticos da mesma origem; remove caches antigos `authix-*`.

## Limitações

Estas alterações não substituem uma auditoria independente, testes em navegadores reais, análise de dependências nem validação dos cabeçalhos HTTP do servidor de hospedagem. A CSP continua definida por meta tag no HTML; quando possível, configure também cabeçalhos HTTP no servidor. O cache do navegador, extensões maliciosas e comprometimento da origem de publicação continuam fora do alcance da criptografia em repouso.
