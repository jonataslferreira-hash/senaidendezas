export const themes=[['violet','Violeta','#a57bce'],['ocean','Oceano','#3d96b5'],['forest','Floresta','#4b9a72'],['rose','Rosa','#ce6a9e'],['sunset','Pôr do sol','#d98250'],['amber','Dourado','#bd9440'],['teal','Turquesa','#369f99'],['indigo','Índigo','#7379ce']];
export const styles=[['classic','Clássico'],['glass','Liquid Glass'],['aero','Frutiger Aero'],['minimal','Minimalista']];
export const validTheme=value=>themes.some(([id])=>id===value)?value:'violet';
export const validStyle=value=>styles.some(([id])=>id===value)?value:'classic';
