import { createUuid } from './uuid.js';
import {studioIcon} from './studio-icons.js';
import {newSlide,newQuestion} from './lessons.js';
import {activityBlocks,ensureBlocks,blockNames} from './activity-blocks.js';
export function activityTabs(lesson,tab,blockId,canEdit=true){const order=activityBlocks(lesson),active=blockId||order.find(b=>(b.type==='quiz'?'quiz':'slides')===tab)?.id;return order.map((b,i)=>{const name=blockNames[b.type]+(order.filter(x=>x.type===b.type).length>1?' '+(order.slice(0,i).filter(x=>x.type===b.type).length+1):'');return `<span class="block-tab-wrap"><button class="block-tab" draggable="${canEdit}" data-block="${b.id}" role="tab" aria-selected="${active===b.id}" data-studio-action="tab-${b.type==='quiz'?'quiz':'slides'}" title="Arraste para reorganizar">${name} <span class="block-count">${b.items.length}</span></button><button type="button" class="block-more" data-stage-menu="${b.id}" aria-label="Opções da etapa ${name}" ${canEdit?'':'disabled'}>···</button></span>`;}).join('')+'<button type="button" class="add-activity" data-studio-action="add-activity" aria-label="Adicionar atividade">＋</button>';}
export class ActivityOrder{
 constructor(studio){this.studio=studio;const root=studio.root;
  root.addEventListener('click',e=>{const button=e.target.closest('[data-stage-menu]');if(button)this.menu(button.dataset.stageMenu);});
  root.addEventListener('dragstart',e=>{const b=e.target.closest('[data-block]');if(b)e.dataTransfer.setData('text/sl-block',b.dataset.block);});root.addEventListener('dragover',e=>{if(e.target.closest('[data-block]'))e.preventDefault();});root.addEventListener('drop',e=>{const b=e.target.closest('[data-block]'),from=e.dataTransfer.getData('text/sl-block');if(b&&from){e.preventDefault();this.move(from,b.dataset.block);}});
  root.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;const b=e.target.closest('[data-block]');if(!b)return;this.timer=setTimeout(()=>{this.from=b.dataset.block;b.classList.add('block-dragging');b.setPointerCapture(e.pointerId);},350);});root.addEventListener('pointerup',e=>{clearTimeout(this.timer);if(!this.from)return;const to=document.elementsFromPoint(e.clientX,e.clientY).map(n=>n.closest('[data-block]')).find(Boolean)?.dataset.block;if(to)this.move(this.from,to);this.from='';this.moved=Date.now();root.querySelector('.block-dragging')?.classList.remove('block-dragging');});root.addEventListener('pointercancel',()=>{clearTimeout(this.timer);this.from='';});root.addEventListener('click',e=>{if(Date.now()-(this.moved||0)<400){e.preventDefault();e.stopImmediatePropagation();}},true);
 }
 list(dialog = document.createElement('dialog')) {
  const studio = this.studio;
  const blocks = activityBlocks(studio.draft);
  const canEdit = studio.groups.canEdit;
  dialog.className = 'activity-dialog mobile-stages-dialog';
  dialog.innerHTML = `<header><h2>Roteiro da aula</h2><button type="button" data-close aria-label="Fechar etapas">×</button></header>
    <ol>${blocks.map((block,index)=>`<li>
      <button type="button" data-open-stage="${index}" aria-current="${block.id===studio.currentBlock()?.id?'step':'false'}">${studioIcon(block.type==='quiz'?'sparkle':block.type==='poll'?'collaborate':'sequence')}<span>${blockNames[block.type]}</span><small>${block.items.length}</small></button>
      ${canEdit?`<button type="button" data-move="-1" data-index="${index}" aria-label="Subir etapa" ${index===0?'disabled':''}>↑</button>
        <button type="button" data-move="1" data-index="${index}" aria-label="Descer etapa" ${index===blocks.length-1?'disabled':''}>↓</button>
        <button type="button" data-options="${index}" aria-label="Opções da etapa">···</button>`:''}
    </li>`).join('')}</ol>${canEdit?'<button type="button" data-add-stage>＋ Adicionar etapa</button>':''}`;
  if (canEdit && studio.tab==='slides' && studio.currentBlock()?.type!=='poll') {
    dialog.insertAdjacentHTML('beforeend', `<div class="mobile-stage-page-actions"><strong>Slide atual</strong><div>${studio.itemActions('slide',studio.index,studio.draft.slides.length)}</div></div>`);
  }
  dialog.onclick = event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.studioAction) {
      studio.action(button.dataset.studioAction,button).then(()=>this.list(dialog)).catch(error=>studio.callbacks.toast(error.message));
      return;
    }
    if (button.hasAttribute('data-close')) dialog.close();
    if (button.hasAttribute('data-open-stage')) {
      studio.selectBlock(blocks[Number(button.dataset.openStage)].id);
      studio.writeRoute();
      studio.callbacks.render();
      dialog.close();
    }
    if (button.hasAttribute('data-move')) {
      const index = Number(button.dataset.index);
      this.move(blocks[index].id, blocks[index+Number(button.dataset.move)].id);
      this.list(dialog);
    }
    if (button.hasAttribute('data-options')) { dialog.close(); this.menu(blocks[Number(button.dataset.options)].id); }
    if (button.hasAttribute('data-add-stage')) { dialog.close(); this.open(); }
  };
  if (!dialog.open) {
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    document.body.append(dialog);
    dialog.showModal();
  }
 }
 menu(id){const s=this.studio;if(!s.groups?.canEdit&&s.groups?.live)return;const block=activityBlocks(s.draft).find(b=>b.id===id);if(!block)return;const dialog=document.createElement('dialog');dialog.className='activity-dialog stage-options';dialog.innerHTML=`<header><h2>${blockNames[block.type]}</h2><button type="button" data-close aria-label="Fechar opções da etapa">×</button></header><p>Esta etapa contém ${block.items.length} ${block.type==='quiz'?'pergunta(s)':'item(ns)'}.</p><button type="button" data-delete-stage>Excluir etapa</button>`;dialog.onclick=e=>{if(e.target.closest('[data-close]'))dialog.close();if(e.target.closest('[data-delete-stage]')){dialog.innerHTML=`<header><h2>Excluir ${blockNames[block.type]}?</h2></header><p>A etapa e seus ${block.items.length} itens serão removidos desta aula.</p><button type="button" data-close>Cancelar</button><button type="button" data-confirm-stage>Excluir etapa</button>`;}if(e.target.closest('[data-confirm-stage]')){try{this.remove(id);dialog.close();}catch(error){s.callbacks.toast(error.message);}}};dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();}
 remove(id){const s=this.studio;if(!s.groups?.canEdit&&s.groups?.live)throw Error('Você não tem permissão para editar esta aula.');const blocks=activityBlocks(s.draft).map(b=>({...b,items:[...b.items]})),index=blocks.findIndex(b=>b.id===id);if(index<0)return;const block=blocks[index],ids=new Set(block.items);if(block.type!=='quiz'&&s.draft.slides.every(i=>ids.has(i.id)))throw Error('Mantenha pelo menos um slide na aula.');if(block.type==='quiz')s.draft.questions=s.draft.questions.filter(q=>!ids.has(q.id));else s.draft.slides=s.draft.slides.filter(i=>!ids.has(i.id));blocks.splice(index,1);s.draft.activityBlocks=blocks;const next=blocks[Math.min(index,blocks.length-1)];s.selectBlock(next.id);s.markDirty();s.callbacks.render();}
 move(from,to){if(from===to)return;const s=this.studio;if(!s.groups?.canEdit&&s.groups?.live)return;if(!s.draft.activityBlocks&&['slides','quiz'].includes(from)&&['slides','quiz'].includes(to)){s.draft.activityOrder=[from,to];}else{const blocks=ensureBlocks(s.draft),fromIndex=blocks.findIndex(b=>b.id===from),toIndex=blocks.findIndex(b=>b.id===to);if(fromIndex<0||toIndex<0)return;const [item]=blocks.splice(fromIndex,1);blocks.splice(toIndex,0,item);}s.markDirty();s.callbacks.render();}
 open(){const dialog=document.createElement('dialog');dialog.className='activity-dialog stage-create-dialog';dialog.innerHTML=`<header><h2>Adicionar etapa</h2><button data-close aria-label="Fechar atividades">×</button></header><div class="activity-choices"><button data-add="slide"><i>${studioIcon('sequence')}</i><strong>Slides</strong><span>Uma sequência de slides</span></button><button data-add="poll"><i>${studioIcon('collaborate')}</i><strong>Enquete</strong><span>Votação ao vivo</span></button><button data-add="quiz"><i>${studioIcon('sparkle')}</i><strong>Quiz</strong><span>Uma nova sequência de perguntas</span></button></div>`;
  dialog.onclick=e=>{if(e.target.closest('[data-close]'))dialog.close();const type=e.target.closest('[data-add]')?.dataset.add;if(!type)return;try{const s=this.studio,blocks=ensureBlocks(s.draft);if(blocks.length>=24)throw Error('Use até 24 etapas por aula.');const quiz=type==='quiz';if((quiz?s.draft.questions.length:s.draft.slides.length)>=(quiz?50:80))throw Error('Limite de conteúdo atingido.');const item=quiz?newQuestion():newSlide(),block={id:createUuid(),type:quiz?'quiz':type==='poll'?'poll':'slides',items:[item.id]};if(type==='poll'){item.title='Nova enquete';item.poll={text:'Qual é a sua opinião?',options:['Concordo','Ainda tenho dúvidas']};}if(quiz)s.draft.questions.push(item);else s.draft.slides.push(item);blocks.push(block);s.selectBlock(block.id);s.markDirty();s.callbacks.render();dialog.close();}catch(error){this.studio.callbacks.toast(error.message);}};dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
 }
}
