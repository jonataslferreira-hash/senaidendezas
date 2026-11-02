# Perfil, arquivos menores e consumo de CPU

No cabeçalho, abra a conta e use **Editar perfil** para escolher foto, nome
de exibição, instituição, bio, cores e redução de movimento. **Salvar perfil**
atualiza os dados da conta Supabase. A foto é recortada no centro em quadrado,
otimizada para WebP de 256×256 e armazenada de forma privada. Com R2 ativo,
ela fica no R2; sem R2, requer o bucket de avatares criado pelo SQL do Supabase.
Cancelar não aplica as alterações pendentes da foto.

**Alterar senha** exige a senha atual e duas cópias da nova senha. O site
valida a confirmação, autentica novamente e usa Supabase Auth para atualizar
a senha. Senhas não são guardadas na biblioteca nem no perfil. A foto não é
gravada como base64 nos metadados do login ou no token da conta.

## Compressão

- Imagens enviadas ao editor podem ter até 15 MB na origem. Elas são reduzidas
  para até 1600 px no maior lado e convertidas para WebP com qualidade 82%.
  Se o resultado ficar maior, o arquivo original é mantido. A imagem final
  precisa respeitar o limite de 1,4 MB do slide. GIFs mantêm suas animações e
  não passam pela conversão automática.
- Aulas enviadas à nuvem usam gzip quando isso economiza espaço. A compressão
  ocorre em um Web Worker separado da interface. A mensagem de conclusão
  informa a porcentagem economizada. O download reconhece gzip e recupera o
  JSON; a descompressão tem limite de 64 MB para rejeitar arquivos exagerados.
- Música e modelos já comprimidos não são convertidos com perda. Os arquivos
  originais dessas mídias ficam incorporados na aula; gzip reduz a representação
  completa quando possível. Exportar JSON continua gerando um arquivo portátil
  legível, sem exigir a nuvem para abrir uma cópia.

## Redução de CPU

O explorador 3D renderiza sob demanda. Quando câmera e peças param, não mantém
um laço contínuo de quadros. Durante interação, agenda no máximo cerca de
30 quadros por segundo e usa densidade de pixels limitada a 1,35. Instâncias
fora da área visível ou em abas ocultas pausam; ao descartar um modelo, timers
e observadores são encerrados. Reduzir movimento também elimina a transição
de abertura das peças.

As animações de interface usam transformação e opacidade, respeitam a
preferência do sistema e a opção do perfil. A decoração inicial da biblioteca
tem duração limitada; não há processamento JavaScript contínuo para animá-la.

Durante esta tarefa, os processos dos testes 3D e de seus navegadores foram
encerrados após o relato de CPU alta. A revisão seguinte usou **test:light**,
com um navegador e WebGL desativado, além dos testes de regras em Node.
Uma amostra após encerrar os processos mostrou o Node do projeto abaixo de 1%
de CPU; isso não é uma medição global ou uma garantia para outras cargas.

```powershell
npm test
npm run test:light
```

`npm run test:e2e` executa também a suíte completa de modelos 3D, documentos e
salas com múltiplos navegadores. Execute-a quando precisar dessa verificação;
ela é mais pesada, especialmente quando a renderização usa software.
