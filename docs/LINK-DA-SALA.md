# Link curto da sala

O QR continua apontando diretamente para o endereço original da sala. Ao abrir o convite de uma sala no site público, o navegador tenta gerar um link curto gratuito pelo is.gd; o botão Copiar passa a copiar o curto quando estiver pronto. Enquanto carrega, ou caso o serviço falhe, permaneçam disponíveis o endereço direto e o código da sala. O encurtamento é tentado uma vez por sala nesta sessão, não em cada renderização.

Apenas URLs HTTPS públicas do projeto com o parâmetro numérico `s` são enviadas ao is.gd; links locais, de prévia e convites privados não são enviados. O serviço conhece o endereço e os links são permanentes, portanto o código de sala não deve ser tratado como segredo. Uma sala encerrada não é reativada pelo link; um código pode eventualmente ser usado por outra sala.

A API JSONP do provedor é executada em iframe sandbox de origem opaca, sem acesso ao DOM, aos dados ou às credenciais da aplicação. A resposta é validada e limitada ao domínio `is.gd`. O acesso à API e ao destino depende da rede do usuário; se o is.gd for bloqueado, o QR direto e o código continuam disponíveis. Não requer publicar um Worker novo.

Referências: https://is.gd/apishorteningreference.php, https://is.gd/usagelimits.php, https://is.gd/terms.php.
