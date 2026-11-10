import { studioIcon } from './studio-icons.js';
import { esc } from './canvas-view.js';

export function chatComposer({ id, field, action, draft, placeholder, disabled, sending, reference = '' }) {
  return `<form id="${id}" class="chat-composer" data-chat-part="composer">
    <label class="sr-only" for="${field}">Mensagem</label>
    <textarea id="${field}" maxlength="2000" rows="2" placeholder="${placeholder}" ${disabled?'disabled':''}>
${esc(draft)}</textarea>
    <div class="chat-compose-actions">
      <button type="button" class="studio-btn quiet" ${action}="voice" aria-label="Gravar áudio" title="Gravar áudio" ${disabled||sending?'disabled':''}>${studioIcon('mic')}</button>
      <button type="submit" class="studio-btn accent" aria-label="${sending?'Enviando…':'Enviar mensagem'}" title="Enviar mensagem" ${disabled||sending?'disabled':''}>${studioIcon('send')}</button>
    </div>${reference}
  </form>`;
}

// Keep the panel, composer and message nodes mounted while requests and
// Realtime update their contents. In particular, preserve playing voice notes.
export function paintChatPanel(slot, markup) {
  if (!slot) return;
  const template = document.createElement('template');
  template.innerHTML = markup;
  const next = template.content.firstElementChild;
  const panel = slot.firstElementChild;
  if (!next || !panel) {
    slot.replaceChildren(template.content);
  } else if (panel.dataset.chatView !== next.dataset.chatView) {
    panel.dataset.chatView = next.dataset.chatView;
    panel.replaceChildren(...next.children);
  } else {
    const log = panel.querySelector('[role=log]');
    const nearBottom = !log || log.scrollHeight - log.clientHeight - log.scrollTop < 36;
    for (const source of next.children) {
      if (!source.dataset.chatPart) continue;
      const target = panel.querySelector(`:scope > [data-chat-part="${source.dataset.chatPart}"]`);
      if (!target) continue;
      if (source.matches('[role=log]')) {
        const existing = new Map([...target.children].map(row => [row.dataset.messageId, row]));
        let position = target.firstElementChild;
        for (const row of [...source.children]) {
          const current = existing.get(row.dataset.messageId);
          if (current) {
            existing.delete(row.dataset.messageId);
            current.style.cssText = row.style.cssText;
            current.dataset.senderStyle = row.dataset.senderStyle;
            const avatar = current.querySelector('.person-avatar');
            const updated = row.querySelector('.person-avatar');
            if (avatar && updated && avatar.innerHTML !== updated.innerHTML) avatar.replaceWith(updated);
          }
          const message = current || row;
          if (message !== position) target.insertBefore(message, position);
          position = message.nextElementSibling;
        }
        for (const row of existing.values()) row.remove();
      } else if (source.matches('form')) {
        const fields = target.querySelectorAll('input,textarea,button');
        for (const [index, field] of [...source.querySelectorAll('input,textarea,button')].entries()) {
          const current = fields[index];
          if (!current) continue;
          current.disabled = field.disabled;
          if (field.matches('textarea,input:not([type=checkbox])') && current.value !== field.value) current.value = field.value;
          if (field.type === 'checkbox') current.checked = field.checked;
          if (field.hasAttribute('aria-label')) current.setAttribute('aria-label',field.getAttribute('aria-label'));
        }
      } else if (target.innerHTML !== source.innerHTML) {
        target.replaceChildren(...source.childNodes);
      }
    }
    if (log && nearBottom) log.scrollTop = log.scrollHeight;
    return;
  }
  const log = slot.querySelector('[role=log]');
  if (log) log.scrollTop = log.scrollHeight;
}
