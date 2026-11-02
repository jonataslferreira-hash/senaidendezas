import {prefersReducedMotion} from './motion-preference.js';
// Runs only on request; excludes account details, credentials and document content.
export async function collectDiagnostics(duration=4000){
  const gaps=[],tasks=[];let frame,previous,start=performance.now();
  const observeFrame=now=>{if(previous!==undefined)gaps.push(now-previous);previous=now;frame=requestAnimationFrame(observeFrame);};
  frame=requestAnimationFrame(observeFrame);
  let observer;try{observer=new PerformanceObserver(list=>tasks.push(...list.getEntries().map(e=>e.duration)));observer.observe({type:'longtask',buffered:false});}catch{}
  await new Promise(resolve=>setTimeout(resolve,duration));cancelAnimationFrame(frame);observer?.disconnect();
  const elapsed=performance.now()-start,sorted=[...gaps].sort((a,b)=>a-b),q=f=>Math.round((sorted[Math.floor((sorted.length-1)*f)]||0)*10)/10;
  const title=document.querySelector('.living-title'),current=document.querySelector('.living-title-current'),board=document.querySelector('.demo-board');
  const style=el=>el?getComputedStyle(el):{};
  return {version:2,browser:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,scale:devicePixelRatio,zoom:visualViewport?.scale},
    scene:document.querySelector('#app')?.dataset.scene,visibility:document.visibilityState,
    motion:{effectiveReduced:prefersReducedMotion(),profile:document.documentElement.dataset.motion,systemReduced:matchMedia('(prefers-reduced-motion:reduce)').matches},
    rendering:{titleDisplay:style(title).display,titleOffset:current?Math.round(current.getBoundingClientRect().left-current.closest('h2').getBoundingClientRect().left):null,screenAnimation:style(board).animationName,pauseButtonPresent:Boolean(document.querySelector('[data-showcase-play]')),canvases:document.querySelectorAll('canvas').length,domElements:document.querySelectorAll('*').length},
    performance:{measuredMs:Math.round(elapsed),frames:gaps.length,fps:Math.round(gaps.length*1000/elapsed),medianFrameMs:q(.5),p95FrameMs:q(.95),framesOver50ms:gaps.filter(n=>n>50).length,longTasks:tasks.length,longTaskMs:Math.round(tasks.reduce((a,b)=>a+b,0)),heapMB:performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null},
    connection:{saveData:navigator.connection?.saveData||false,effectiveType:navigator.connection?.effectiveType||null},
    source:document.querySelector('script[type=module][src]')?.getAttribute('src')?.split('?')[0]||null};
}
