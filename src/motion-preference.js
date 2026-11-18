import { localMotion } from './motion-storage.js';
// Escolha de animação fica no navegador (funciona sem conta) e é aplicada antes
// do primeiro quadro, então vale para o site inteiro.
const chosen = localMotion();
if (chosen !== 'system' && typeof document !== 'undefined' && !document.documentElement.hasAttribute('data-motion')) document.documentElement.dataset.motion = chosen;
export function prefersReducedMotion(){
  const choice=document.documentElement.dataset.motion;
  if(choice==='normal')return false;
  if(choice==='reduced')return true;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}
