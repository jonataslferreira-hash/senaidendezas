# Link curto da sala

O convite do site público usa o endereço fixo `https://is.gd/h4bAV2`, que redireciona à página inicial do Storage Lab. O código de seis dígitos é acrescentado no fragmento, por exemplo `https://is.gd/h4bAV2#s=123456`. O navegador preserva o fragmento no redirecionamento; na chegada, o site o converte ao parâmetro normal `?s=123456` antes de abrir a tela da sala. A confirmação da participação continua dependendo do aluno.

Não há mais chamadas à API do is.gd para cada sala, nem espera pela criação de um novo link. O fragmento não é enviado ao servidor do encurtador na requisição HTTP. O link curto continua dependendo de o is.gd estar acessível na rede e manter o redirecionamento; se não estiver, o convite oferece **Copiar link direto**, QR Code direto e o código da sala. Nenhum URL privado ou de desenvolvimento é convertido para o atalho público.

O QR Code continua usando diretamente o endereço completo da sala. O código não deve ser tratado como segredo: qualquer pessoa que receba o link pode lê-lo. Uma sala encerrada não é reativada pelo link; o código pode eventualmente ser reutilizado por outra sala.
