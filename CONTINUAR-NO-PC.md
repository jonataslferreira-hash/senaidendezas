# Continuação local

O projeto do chat “Configurar senaidendezas” foi recuperado para esta pasta.
O conteúdo da aula, os modelos 3D, a lógica de salas e os testes vieram do
histórico. A parte final da interface e os estilos que estavam truncados
foram recompostos localmente.

## Executar

Requer Node.js 22 ou superior.

```powershell
npm ci
npm run dev
```

Abra o endereço mostrado pelo Vite. “Explorar a aula” funciona sem criar sala.
Para apresentar, clique em “Apresentar” na aula e compartilhe o QR Code.
Os celulares precisam conseguir acessar o endereço do site; localhost só
funciona no próprio computador. O site publicado usa HTTPS.

## Enviar pelo GitHub Desktop

1. Revise os arquivos em Changes.
2. Faça o commit e clique em Push origin.
3. No GitHub, configure Settings → Pages → Source → GitHub Actions.
4. Aguarde o workflow “Publicar no GitHub Pages”
   e use o endereço informado pelo GitHub.

A publicação e o envio ficam sob seu controle no GitHub Desktop.

## Plataforma de criação de aulas

A aula HDD/SSD é a demonstração inicial de uma plataforma reutilizável.
Biblioteca, editor de slides e perguntas personalizáveis estão implementados.
As aulas são salvas neste navegador e podem ser exportadas/importadas em JSON,
mantendo hospedagem estática no Pages. Contas e biblioteca sincronizada entre
dispositivos ainda não fazem parte desta versão. Consulte o README atualizado.

Antes da apresentação, teste o computador e pelo menos um celular na rede
do Senai. A sincronização usa PeerJS/WebRTC e depende da rede disponível.
