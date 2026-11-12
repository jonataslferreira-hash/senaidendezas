import {canvasThemes} from './canvas-data.js';
import {openLayouts} from './open-slide-layouts.js';
import {esc} from './canvas-view.js';
import './slide-style-picker.css';

export const localLayouts = {title:'Título e conteúdo', split:'Duas colunas', spotlight:'Destaque visual'};

export function slideStylePicker(kind, slide, {inspector=false}={}) {
  const theme = kind==='theme';
  const title = theme?'Tema do slide':'Layout do slide';
  const selected = theme?slide.visualTheme:slide.layout;
  const options = theme?Object.entries(canvasThemes):[
    ...Object.entries(localLayouts).map(([id,name])=>[id,{name}]),...openLayouts
  ];
  const current = options.find(([id])=>id===selected)?.[1].name;
  return `<div class="slide-style-picker"><button type="button" data-style-picker="${kind}" aria-expanded="false" aria-label="${title}" title="${title}">${esc(inspector?title:current||(theme?'Tema':'Layout'))} ▾</button>
    <div class="slide-style-menu" popover aria-label="${title}">
      <header><strong>${title}</strong><small>Passe o mouse ou foque por 1 s para ver no slide.</small>
      ${inspector?'<label><input type="checkbox" data-style-all> Aplicar a todos os slides</label>':''}</header>
      <div class="slide-style-options">${options.map(([id,option])=>`<button type="button" data-style-kind="${kind}" data-style-value="${id}" aria-pressed="${id===selected}">
        ${theme?`<i aria-hidden="true" style="--swatch:${option.background};--swatch-accent:${option.accent}"></i>`:''}${esc(option.name)}</button>`).join('')}</div>
    </div></div>`;
}
