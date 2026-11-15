export const themes=[
  ['violet','Violeta','#a57bce'],
  ['ocean','Oceano','#3d96b5'],
  ['forest','Floresta','#4b9a72'],
  ['rose','Rosa','#ce6a9e'],
  ['sunset','Pôr do sol','#d98250'],
  ['amber','Dourado','#bd9440'],
  ['teal','Turquesa','#369f99'],
  ['indigo','Índigo','#7379ce'],
  // Gradientes: continuam sendo uma única "cor do espaço" para o perfil.
  ['aurora','Aurora','linear-gradient(135deg,#4fe0c4 0%,#6aa6f0 50%,#a877ea 100%)'],
  ['candy','Candy','linear-gradient(135deg,#f06aa8 0%,#f79a8a 50%,#fbbf6a 100%)'],
  ['galaxy','Galáxia','linear-gradient(135deg,#3f63d6 0%,#8a5bd0 52%,#e06ac4 100%)'],
  ['citrus','Citrino','linear-gradient(135deg,#d9e04f 0%,#7fd67a 50%,#3ac7bd 100%)'],
  // Duplas sorteadas uma vez e deixadas fixas para escolher.
  ['prism','Esmeralda e Azul','linear-gradient(135deg,#58ee76 0%,#6eede0 50%,#5894ee 100%)'],
  ['lagoon','Violeta e Laranja','linear-gradient(135deg,#a158ee 0%,#ed6eb2 50%,#ee9c58 100%)'],
  ['ember','Rubi e Esmeralda','linear-gradient(135deg,#ee585a 0%,#e6ed6e 50%,#58ee6c 100%)'],
  ['nebula','Lima e Azul','linear-gradient(135deg,#a3ee58 0%,#6eedbc 50%,#5880ee 100%)']
];
export const styles=[['classic','Clássico'],['glass','Liquid Glass'],['aero','Frutiger Aero'],['minimal','Minimalista'],['editorial','Office'],['arcade','8-Bit']];
export const validTheme=value=>themes.some(([id])=>id===value)?value:'violet';
export const validStyle=value=>value==='material'?'editorial':styles.some(([id])=>id===value)?value:'classic';
