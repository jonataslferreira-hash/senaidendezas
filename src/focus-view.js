// Item em destaque em tela cheia: o professor escolhe um item do slide
// (experimento, modelo 3D ou imagem) e qualquer pessoa pode abri-lo ocupando a
// tela inteira, no computador ou no celular, sem precisar rolar a página.
import {simulationMarkup,simulationNames,Simulations} from './simulations.js';
import {CanvasModels} from './canvas-view.js';
import {fillAssetImages} from './assets.js';
import {mobileResource} from './slide-display.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function focusLabel(resource){
  if(!resource)return '';
  if(resource.type==='simulation')return simulationNames[resource.simulation]||'Experimento';
  if(resource.type==='model')return 'Modelo 3D';
  return 'Imagem';
}
// Botão mostrado na apresentação quando o slide tem um item em destaque.
export function focusButton(slide){
  const resource=mobileResource(slide);
  if(!resource)return '';
  const label=focusLabel(resource);
  return `<button type="button" class="focus-open" data-action="focus-item" aria-label="Abrir em tela cheia: ${esc(label)}" title="Abrir em tela cheia: ${esc(label)}"><span aria-hidden="true">⛶</span> Tela cheia<small> · ${esc(label)}</small></button>`;
}

export class FocusView{
  constructor(){this.dialog=null;this.slideId='';this.simulations=new Simulations();this.models=new CanvasModels();this.ownFullscreen=false;
    // Esc sai da tela cheia do navegador: o destaque fecha junto.
    document.addEventListener('fullscreenchange',()=>{if(this.ownFullscreen&&!document.fullscreenElement){this.ownFullscreen=false;this.close();}});
  }
  get isOpen(){return Boolean(this.dialog?.open);}
  open(slide){
    const resource=mobileResource(slide);
    if(!resource)return false;
    this.close();
    const dialog=document.createElement('dialog');
    dialog.className='focus-view';dialog.dataset.kind=resource.type;
    dialog.setAttribute('aria-label','Tela cheia: '+focusLabel(resource));
    const body=resource.type==='simulation'?simulationMarkup(resource.simulation)
      :resource.type==='model'?`<div class="focus-model" data-canvas-model="${esc(resource.id)}"></div>${resource.model!=='custom'?`<button type="button" class="focus-explode" data-focus-explode>Abrir ou fechar camadas</button>`:''}`
      :`<img class="focus-image" ${resource.image?'src="'+esc(resource.image)+'"':resource.assetId?'data-asset-id="'+esc(resource.assetId)+'"':''} alt="${esc(resource.imageAlt||slide.title||'')}">`;
    dialog.innerHTML=`<header class="focus-view-bar"><strong>${esc(focusLabel(resource))}</strong><span>${esc(slide.title||'')}</span><button type="button" data-focus-close aria-label="Sair da tela cheia" title="Sair da tela cheia (Esc)">✕ Fechar</button></header><div class="focus-view-body">${body}</div>`;
    document.body.append(dialog);
    this.dialog=dialog;this.slideId=slide.id;
    dialog.addEventListener('close',()=>this.teardown(dialog));
    dialog.addEventListener('click',event=>{
      if(event.target.closest('[data-focus-close]'))dialog.close();
      else if(event.target.closest('[data-focus-explode]')){
        const viewer=this.models.viewers.get(resource.id);
        if(viewer){this.exploded=!this.exploded;viewer.setModel(resource.model||'ssd',this.exploded);}
      }
    });
    const show=()=>{
      if(this.dialog!==dialog)return;
      dialog.showModal();
      // A página por trás não rola enquanto o destaque está aberto.
      document.documentElement.classList.add('focus-locked');
      this.exploded=false;
      if(resource.type==='simulation')this.simulations.mount(dialog);
      else if(resource.type==='model')this.models.mount(dialog,{elements:[resource]});
      else fillAssetImages(dialog);
    };
    // Tela cheia de verdade onde o navegador permite, pedida antes de abrir o
    // painel. O iPhone não permite: lá o painel já cobre a tela toda.
    if(!document.fullscreenElement&&document.documentElement.requestFullscreen&&matchMedia('(hover:hover) and (pointer:fine)').matches){
      document.documentElement.requestFullscreen().then(()=>{this.ownFullscreen=true;},()=>{}).then(show);
    }else show();
    return true;
  }
  teardown(dialog){
    if(this.dialog!==dialog)return;
    this.simulations.mount(null);this.models.mount(null,null);
    dialog.remove();this.dialog=null;this.slideId='';
    document.documentElement.classList.remove('focus-locked');
    if(this.ownFullscreen&&document.fullscreenElement)document.exitFullscreen().catch(()=>{});
    this.ownFullscreen=false;
  }
  close(){if(this.dialog){const dialog=this.dialog;if(dialog.open)dialog.close();this.teardown(dialog);}}
  // Chamado a cada render: trocar de slide fecha o destaque do slide anterior.
  sync(slideId){if(this.dialog&&this.slideId!==slideId)this.close();}
}
