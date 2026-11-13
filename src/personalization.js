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
  ['aurora','Aurora','linear-gradient(135deg,#70dfce 0%,#7ca8ea 53%,#a58add 100%)'],
  ['candy','Candy','linear-gradient(135deg,#e790b3 0%,#f2a9a2 55%,#ffd0a4 100%)'],
  ['galaxy','Galáxia','linear-gradient(135deg,#4957a1 0%,#7560b5 54%,#ba77b3 100%)'],
  ['citrus','Citrino','linear-gradient(135deg,#c0d883 0%,#79c997 52%,#4bbab1 100%)']
];
export const styles=[['classic','Clássico'],['glass','Liquid Glass'],['aero','Frutiger Aero'],['minimal','Minimalista'],['editorial','Office'],['arcade','8-Bit']];
export const validTheme=value=>themes.some(([id])=>id===value)?value:'violet';
export const validStyle=value=>value==='material'?'editorial':styles.some(([id])=>id===value)?value:'classic';
