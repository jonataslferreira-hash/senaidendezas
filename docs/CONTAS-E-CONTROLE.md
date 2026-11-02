# Proposta para contas e controle pelo celular

Cadastro, login por e-mail/senha, recuperação de senha e saída da conta estão
implementados com Supabase Auth. O armazenamento no Supabase está preparado,
aguardando a aplicação do SQL (veja [ARQUIVOS-NA-NUVEM.md](ARQUIVOS-NA-NUVEM.md)). O controle
remoto autenticado ainda é próxima etapa. Entrar na conta não envia aulas locais.

## Configurar o projeto conectado

O projeto `qkpgiwjsqtocvjmqinii` está configurado em `src/auth-config.js` com
URL e chave publicável. Essa chave foi feita para o navegador e não concede
permissão administrativa. Variáveis Vite podem sobrescrever os valores (veja
`.env.example`). Não use chaves secretas ou `service_role` no frontend.

No painel Supabase, abra **Authentication → URL Configuration**:

- **Site URL:** `https://jonataslferreira-hash.github.io/senaidendezas/`
- **Redirect URLs:** adicione `https://jonataslferreira-hash.github.io/senaidendezas/`
  e `http://localhost:5173/`.
- Se usar outro domínio ou endereço de desenvolvimento, cadastre também o
  endereço exato, com caminho e barra final. Os links retornam à página base,
  sem código de sala ou parâmetros de convite.

Em **Authentication → Sign In / Providers**, mantenha Email habilitado.
O projeto consultado exige confirmação de e-mail. O site orienta o professor
a confirmar o cadastro antes de entrar. Confirmação e recuperação dependem
da entrega de e-mail do Supabase; configure SMTP próprio para uma operação
com mais usuários conforme as restrições do serviço de e-mail padrão.

Para testar, abra **Entrar / Criar conta** no cabeçalho, crie sua conta,
confirme pelo e-mail e entre. A conta é restaurada ao recarregar a página.
**Esqueci minha senha** envia um link; ao retornar, o site pede a nova senha.
**Sair da conta** encerra a sessão deste navegador e preserva as aulas locais.

O teste automatizado usa respostas simuladas para não criar contas nem enviar
e-mails reais. A consulta somente de leitura a `/auth/v1/settings` confirmou
que a chave funciona, Email está habilitado e o cadastro está permitido.

## Serviços

A proposta é manter o site no GitHub Pages e usar Supabase:

- **Auth:** entrada por Google e/ou email, sessões e recuperação de acesso.
- **Postgres:** aulas e metadados associados ao identificador do professor.
- **Supabase Storage:** aulas e arquivos incorporados da biblioteca da conta,
  privados para o proprietário por políticas de acesso.
- **Realtime:** canal privado de comandos entre o computador e o celular
  autenticados como o dono da apresentação.

As políticas de acesso devem limitar cada professor às suas aulas e arquivos.
O frontend usa a chave publicável do projeto. Chaves administrativas ficam
fora do site e do repositório.

## Fluxo do professor

1. Entrar na conta no computador.
2. Enviar explicitamente as aulas locais escolhidas para a biblioteca da conta.
3. Iniciar uma apresentação.
4. Entrar na mesma conta no celular e escolher **Controlar apresentação**.
5. O celular envia comandos de avançar, voltar e abrir atividades pelo canal
   privado daquela sessão.
6. O computador aplica o comando e distribui o estado aos alunos.

A sessão precisa ter um identificador próprio além do código público da turma.
Só a conta proprietária pode enviar comandos do professor. O código/QR dos
alunos não concede esse papel.

Inicialmente, o PC pode continuar coordenando os alunos por PeerJS/WebRTC.
O canal autenticado de controle fica separado. Uma migração do transporte
dos alunos para Realtime pode ser avaliada depois.

## Fluxo dos alunos

Os alunos continuam entrando por QR Code, link ou código, com nome e avatar.
Não é necessário obrigar os alunos a criarem contas para participar.
Recebem o slide/modelo atual e as atividades liberadas pelo professor.

## Configuração necessária

- Criar um projeto Supabase do proprietário do site.
- Definir as tabelas de aulas/sessões e políticas de acesso por proprietário.
- Criar o armazenamento privado dos arquivos.
- Configurar os endereços de retorno do login para localhost e GitHub Pages.
- Habilitar o método de login escolhido. Google exige também configurar o
  aplicativo OAuth no Google e cadastrar as credenciais no painel do Supabase.
- Integrar biblioteca da conta e controle remoto; as telas de entrada estão prontas.

Não é necessário publicar senhas ou chaves administrativas no GitHub.
A configuração administrativa do painel (URLs, provedores, SMTP e futuras
políticas de banco/Storage) não é alterada pela chave publicável do site.

## Referências

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Login Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [Políticas por usuário](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Acesso ao Storage](https://supabase.com/docs/guides/storage/security/access-control)
- [Autorização do Realtime](https://supabase.com/docs/guides/realtime/authorization)
