export function prefersReducedMotion(){
  const choice=document.documentElement.dataset.motion;
  if(choice==='normal')return false;
  if(choice==='reduced')return true;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}
