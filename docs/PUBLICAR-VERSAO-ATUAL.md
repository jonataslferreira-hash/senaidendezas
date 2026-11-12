# Publicar a versão atual

## 1. Cloudflare

Antes de publicar o site, atualize o Worker `storage-lab-files`.

- Pelo terminal na pasta do projeto: `npm.cmd exec -- wrangler deploy --config cloudflare/wrangler.toml --keep-vars`.
- Ou, pelo painel, substitua todo o código em Edit code pelo conteúdo de `cloudflare/worker-ready.js` e clique Deploy.
- Preserve o bucket `FILES`, as variáveis e os segredos já configurados. Não coloque chaves privadas em arquivos do site ou variáveis com prefixo `VITE_`.
- `ALLOWED_ORIGINS` precisa conter `https://jonataslferreira-hash.github.io` (sem o caminho `/senaidendezas/`).
- Para storageAI, mantenha a chave do provedor que você configurou como segredo no Worker. O Bing não precisa de chave de API.
- Abra `https://storage-lab-files.lagujf.workers.dev/health`: a versão deste código é 20 e deve mostrar `imageSearch: true`. Isso verifica a versão, não garante disponibilidade dos serviços externos.

O Bing é consultado pelo servidor, tanto no teste local quanto pelo Worker. O GitHub Pages hospeda a interface e consulta o Worker. Os resultados podem sofrer limites ou mudanças do Bing.

## 2. Supabase

Esta correção das miniaturas e da janela de busca não exige SQL novo. Preserve as configurações e migrações já aplicadas.

Para os e-mails de acesso do site publicado, confira em Authentication → URL Configuration o endereço público `https://jonataslferreira-hash.github.io/senaidendezas/` e permita também o endereço local usado nos testes. Se login, colaboração ou histórico não funcionarem, precisam ser conferidos separadamente; o teste das miniaturas não valida esses serviços.

## 3. GitHub

1. No GitHub Desktop, selecione o repositório `senaidendezas` e a branch `main`.
2. Confira as alterações. Inclua os arquivos novos de `src` e o Worker atualizado. Não inclua `.env.local`, chaves privadas, `node_modules`, relatórios de testes ou arquivos pessoais.
3. Faça o commit e depois Push origin.
4. O fluxo `.github/workflows` já instala dependências, executa testes, compila e publica `dist` automaticamente ao receber um push na `main`.
5. Se Pages ainda não estiver configurado, escolha GitHub Actions como origem em Settings → Pages.
6. Aguarde o fluxo “Publicar no GitHub Pages” terminar com sucesso em Actions.

Não precisa enviar `dist` manualmente. O fluxo já aponta para `https://storage-lab-files.lagujf.workers.dev`, salvo se você tiver definido outra variável `VITE_R2_API_URL` no repositório.

## 4. Conferir a versão publicada

Abra `https://jonataslferreira-hash.github.io/senaidendezas/` e confira:

- Miniaturas visíveis no editor, no PC e no celular.
- Busca por “Hello Kitty PNG” e inserção de uma imagem.
- Salvamento e reabertura da mesma aula.
- Uma geração real do storageAI com sua conta.
- Uma apresentação e, se usar colaboração, acesso com a segunda conta.

O localhost tem uma biblioteca local separada do endereço do GitHub. Antes de mudar, salve na nuvem as aulas locais que deseja abrir no site publicado. Não apague os dados do navegador durante essa passagem.
