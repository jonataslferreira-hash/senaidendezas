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
  ['aurora','Aurora','linear-gradient(135deg,#5ee7df 0%,#6a8dff 48%,#b490ca 100%)'],
  ['candy','Candy','linear-gradient(135deg,#ff9ecd 0%,#ffb7a0 50%,#ffe37a 100%)'],
  ['galaxy','Galáxia','linear-gradient(135deg,#3d2b7a 0%,#7a4fd4 52%,#f06ba8 100%)'],
  ['citrus','Citrino','linear-gradient(135deg,#b8f27a 0%,#5fd6a4 48%,#39b8d8 100%)']
];
export const styles=[['classic','Clássico'],['glass','Liquid Glass'],['aero','Frutiger Aero'],['minimal','Minimalista'],['material','Material Design']];
export const validTheme=value=>themes.some(([id])=>id===value)?value:'violet';
export const validStyle=value=>styles.some(([id])=>id===value)?value:'classic';
