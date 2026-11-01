# Storage Lab · Professor por um dia

Site interativo em português para a apresentação do **grupo 4 — Armazenamento: HDD e SSD**, baseado no roteiro do PDF “Professor por um dia — Anatomia e Funcionamento Físico do Computador”.

## O que tem

- Sete momentos de aula, planejados para cerca de 10–12 minutos com o quiz.
- Modelos 3D didáticos de HDD, SSD SATA de 2,5” e SSD M.2 PCIe/NVMe, com rotação, zoom, camadas e peças selecionáveis.
- Sala com código de seis números, QR Code e link para os celulares.
- Slides, modelo escolhido e abertura das camadas sincronizados pelo apresentador. O aluno pode girar e explorar o modelo independentemente.
- Duas perguntas para discussão e a situação-problema solicitada no PDF.
- Cinco perguntas de quiz, pontuação por acerto, dificuldade e tempo, avatares predefinidos, pódio, ranking e exportação CSV.
- Trilha sintetizada opcional, sem arquivos de áudio externos. Cada dispositivo controla seu som.
- Prévia local da aula e do quiz sem criar uma sala ou acessar o sinalizador.

## Hospedagem no GitHub Pages

O site é **estático**. Node.js é necessário apenas para desenvolver, testar e gerar `dist/`; não existe servidor de aplicação para hospedar.

1. Envie os arquivos deste projeto para a branch `main` do repositório.
2. No GitHub, abra **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. O workflow `.github/workflows/pages.yml` instala as dependências com `npm ci`, executa os testes, gera o site e publica o conteúdo de `dist/`. Também pode ser iniciado em **Actions → Publicar no GitHub Pages → Run workflow**.
4. Aguarde a conclusão e abra a URL fornecida pelo GitHub. Para este repositório, o endereço padrão esperado é `https://jonataslferreira-hash.github.io/senaidendezas/`, caso Pages esteja habilitado e não haja domínio personalizado.

Os caminhos do build são relativos, compatíveis com o subdiretório do repositório. Não publique apenas o `index.html` do código-fonte: ele precisa dos arquivos gerados pelo Vite. Não são necessárias chaves de API, banco de dados ou segredos para a configuração atual.

Configurar o workflow no projeto não habilita Pages nem executa a publicação por conta própria. Não há publicação confirmada apenas por existir uma URL prevista.

## Como apresentar

1. No computador, abra o site publicado e clique em **Apresentar uma aula**.
2. Projete o QR Code. Os colegas abrem o link no celular, escolhem um nome e um avatar e entram. Também podem acessar o site e informar o código.
3. Mantenha a aba do apresentador aberta, com o computador acordado. Use **Próximo** ou as setas do teclado para avançar. O ícone de expansão abre a tela cheia quando o navegador permite.
4. Abra os modelos e selecione as peças. Os modelos são esquemas explicativos, não reproduções de um produto específico. No celular, arraste para girar e use dois dedos para aproximar/afastar.
5. Consulte o **Roteiro do apresentador** para sugestões de fala e duração. Faça as duas perguntas durante a explicação e reserve tempo para o desafio.
6. Ao final, clique em **Iniciar quiz**. É necessário pelo menos um participante conectado. Quem entrar pela primeira vez depois do início deve esperar a próxima rodada.
7. Cada pergunta termina ao esgotar o tempo ou quando o apresentador clica em **Revelar resposta**. O apresentador avança após a explicação. Ao final, exiba o pódio e, se quiser, baixe o CSV.

O convite usa a URL atual do site. Em **Configurar endereço público**, é possível informar a URL publicada para corrigir o QR Code durante uma execução local. Um endereço `localhost` não abre nos celulares.

### Pontuação

Resposta correta: `arredondar(base × (0,5 + 0,5 × fração do tempo restante))`.

| Dificuldade | Máximo | Mínimo por acerto dentro do tempo |
|---|---:|---:|
| Fácil | 1.000 | 500 |
| Média | 1.500 | 750 |
| Difícil | 2.000 | 1.000 |

Erro, ausência de resposta ou chegada depois do prazo: zero. O tempo é medido no apresentador quando a resposta chega; latência de rede pode influenciar. Só é aceita uma resposta por pergunta. Pontos e alternativa correta são enviados aos alunos apenas na revelação. Empates são ordenados por mais acertos e depois pelo nome em ordem alfabética.

## Conexão, privacidade e limites

O GitHub Pages entrega os arquivos. **PeerJS Cloud** faz a sinalização WebRTC em `0.peerjs.com` (HTTPS/WSS). Os navegadores usam STUN e, quando necessário e disponível, os servidores TURN públicos configurados pela biblioteca. A conexão de dados liga cada aluno ao computador apresentador; TURN pode retransmiti-la.

- Precisa de internet. Algumas redes escolares bloqueiam WebRTC, STUN ou TURN. **Teste com o PC e alguns celulares na rede real antes da apresentação.** Testes com sinalização local não garantem acesso ao serviço público na escola.
- O serviço público não oferece garantia de disponibilidade para esta aula. Não há garantia de que todas as combinações de firewall/NAT funcionem; se a rede impedir WebRTC, será necessário liberar o acesso com a escola ou configurar sinalização/TURN próprios.
- Os testes de navegador simulam PC e celular. O limite de 60 participantes é um teto de entrada, não capacidade comprovada em teste de carga. O hardware e a rede do apresentador determinam o limite prático.
- A sala vive na aba do apresentador. Um snapshot em `sessionStorage` ajuda a retomar após recarregar **a mesma aba**, e os alunos tentam reconectar. Fechar a aba ou limpar os dados pode perder a sessão; não é um banco persistente.
- Não é necessário microfone, câmera, cadastro nem foto pessoal. Os avatares são ícones. Nomes e pontuação são compartilhados com a sala. Use apelidos se preferir e não use dados sensíveis.
- É um quiz educativo entre colegas, sem mecanismo antifraude para provas formais. Os arquivos de um site estático são públicos, inclusive o banco de questões. O apresentador é a autoridade dos pontos e pode inspecionar os dados locais.
- Sem WebGL, as explicações e o quiz continuam acessíveis, mas o modelo 3D fica indisponível.

## Desenvolvimento e testes

Requer **Node.js 22 ou superior**.

```sh
npm ci
npm run dev
npm test
npm run build
```

O servidor de desenvolvimento escuta em todas as interfaces. Em ambientes que restringem escrita no diretório pessoal, use `npm ci --cache /tmp/storage-lab-npm-cache`.

Testes de navegador usam Chromium e um servidor PeerJS **local**, sem depender do serviço público:

```sh
npx playwright install chromium
npm run test:e2e
```

O Playwright inicia Vite na porta 5173 e o sinalizador local na 9000. O parâmetro `?localSignal` só altera o sinalizador em modo de desenvolvimento; o build de produção sempre usa a configuração pública. Se já houver um Chromium compatível instalado, configure `CHROMIUM_PATH=/caminho/do/chromium`. O navegador pode exigir bibliotecas do sistema operacional.

Para verificar o build estático, execute `npm run preview`. Não há serviço Node.js para manter em execução depois da publicação no Pages.

## Roteiro e divisão da equipe

| Parte | Tempo sugerido | O que demonstrar |
|---|---|---|
| Armazenamento de longo prazo | 1 min | Armário × bancada; diferença em relação à RAM |
| HDD | 1 min 20 s | Pratos, motor e braço no modelo |
| SSD | 1 min 20 s | Flash NAND e controlador; pergunta 1 |
| Comparação HDD × SSD | 1 min | Latência, impacto, ruído e custo por GB |
| SATA, NVMe e M.2 | 1 min 30 s | Interface/protocolo × formato; pergunta 2 |
| Situação-problema | 1 min 30 s | Escolher um SSD compatível e justificar |
| Fechamento | 40 s | Retomar as ideias principais |
| Quiz e ranking | cerca de 2 min | Cinco perguntas e breves explicações |

A equipe deve distribuir essas partes entre seus integrantes e ensaiar; o site não substitui o domínio do conteúdo. A fala e a discussão determinam a duração real.

O PDF do professor é a referência para o escopo e a avaliação. Modelos, perguntas e textos explicativos deste projeto foram elaborados para esse roteiro; confiram também com o material da aula. As peças são ilustrativas: disposição, dimensões e presença de componentes variam por modelo. NVMe é um protocolo normalmente sobre PCIe; M.2 é um formato/conector e não garante NVMe.

### Onde editar

- `src/content.js`: roteiro dos slides, notas e avatares.
- `src/room.js`: perguntas, dificuldade, tempo e regras de pontuação.
- `src/models.js`: modelos 3D e informações sobre as peças.
- `src/network.js`: sinalização e transporte WebRTC.
- `src/app.js` e `src/style.css`: interface e identidade visual.
