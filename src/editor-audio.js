// As faixas do editor usam áudio direto: um MediaElementAudioSourceNode
// silencia respostas de outras origens sem CORS, mesmo com o tempo avançando.
// Não criar grafo Web Audio para este elemento; arquivos locais e remotos usam
// a mesma saída nativa, sem aplicar o volume duas vezes.
export function applyEditorPlayback(player, {volume = .35, rate = .85} = {}) {
  const speed=Math.max(.5,Math.min(2,Number(rate)||.85));
  player.volume=Math.max(0,Math.min(1,Number.isFinite(Number(volume))?Number(volume):.35));
  player.defaultPlaybackRate=speed;
  player.playbackRate=speed;
  player.preservesPitch=speed>=.999;
  player.mozPreservesPitch=speed>=.999;
  player.webkitPreservesPitch=speed>=.999;
  player.loop=false;
}
