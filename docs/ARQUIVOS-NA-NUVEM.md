# Ativar arquivos no Supabase

O login usa Supabase. Esta é a opção de arquivos quando o R2 não está configurado.
Para o R2 escolhido depois pelo usuário, veja [CLOUDFLARE-R2.md](CLOUDFLARE-R2.md).
Não exige Firebase ou cartão para usar a cota do plano Free do Supabase.
A cota de armazenamento desse plano é 1 GB, com limites de transferência e
50 MB por arquivo. Veja a [página oficial de preços](https://supabase.com/pricing).

## Configurar uma vez

1. Abra o projeto **storagelab** no painel Supabase.
2. Na barra lateral, abra **SQL Editor** e clique em **New query**.
3. Cole todo o conteúdo de [supabase/storage.sql](../supabase/storage.sql).
4. Execute com **Run**. Deve aparecer uma mensagem de sucesso.

O script cria os buckets privados `storage-lab-lessons` e `storage-lab-avatars`,
a tabela `lesson_files`
que lista as aulas da conta e as políticas de acesso. O usuário conectado só
pode acessar sua própria pasta, identificada pelo ID da conta. O script pode
ser executado novamente; ele mantém os arquivos e recria apenas as políticas
com os nomes definidos para esta função.

A chave publicável do frontend não pode criar o bucket/tabela/políticas. Essa
etapa requer a sessão administrativa do proprietário no painel. Não envie
senha de banco, chave secreta ou `service_role` para o site.

## Usar

- Entre na conta, abra uma aula e clique em **Salvar na nuvem**.
- O site envia um JSON portátil, comprimido quando houver economia, com slides,
  modelos, imagens e músicas.
- Em outro dispositivo, entre na mesma conta e abra **Na minha conta →
  Atualizar arquivos**. Escolha **Abrir cópia no editor** para baixar a aula.
- **Salvar aula** continua salvando só neste navegador. O envio à nuvem é
  explícito; faça-o novamente para atualizar a cópia compartilhada.
- O último envio para o mesmo ID de aula substitui a versão da nuvem.
  Abrir da nuvem cria uma cópia local com outro ID para preservar aulas locais.

Não são gerados links públicos. Os alunos recebem o conteúdo do professor
pela conexão da sala e continuam participando sem conta.

Se o upload concluir mas a gravação do índice falhar, repita **Salvar na nuvem**:
o arquivo usa o mesmo caminho e não cria outra cópia nesse caso. As regras
e o funcionamento real do projeto precisam ser conferidos após executar o SQL;
testes com respostas simuladas não validam as políticas publicadas.

Referências:
- [Controle de acesso do Storage](https://supabase.com/docs/guides/storage/security/access-control)
- [Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
