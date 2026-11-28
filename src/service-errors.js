// Falhas de rede, DNS e CORS têm a mesma exceção no navegador: não afirmar a causa.
export function serviceNetworkMessage(context='o serviço') {
 const host=globalThis.location?.hostname||'';
 if(import.meta.env.DEV && (/\.e2b\.app$/i.test(host)||/\.arena\.site$/i.test(host)))return `Não foi possível acessar ${context}. Confira a conexão; nesta prévia, o Worker também precisa permitir a origem ${globalThis.location.origin} em ALLOWED_ORIGINS.`;
 return `Não foi possível acessar ${context}. Confira a conexão e tente novamente.`;
}
