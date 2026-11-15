// Ponte de sincronia dos experimentos importados. Este trecho roda DENTRO do
// iframe isolado do experimento: no professor ele anota cliques, arrastes,
// teclas e campos alterados; no aluno ele repete os mesmos gestos. Fica parado
// até a página de fora dizer qual é o papel ("send", "follow" ou "off").
function bridge() {
  var role = 'off', queue = [], timer = 0, lastMove = 0, skipped = null, out = window.parent;
  var mouse = { pointerdown: 1, pointermove: 1, pointerup: 1, pointercancel: 1, mousedown: 1, mousemove: 1, mouseup: 1, click: 1, dblclick: 1 };
  function pathOf(node) {
    var path = [];
    if (!node || node.nodeType !== 1) return path;
    while (node && node !== document.documentElement && node.parentNode) { path.unshift(Array.prototype.indexOf.call(node.parentNode.children, node)); node = node.parentNode; }
    return path;
  }
  function find(path) { var node = document.documentElement; for (var i = 0; i < path.length && node; i++) node = node.children[path[i]]; return node; }
  function fields() { return Array.prototype.slice.call(document.querySelectorAll('input,select,textarea'), 0, 40); }
  function read(field) { return field.type === 'checkbox' || field.type === 'radio' ? (field.checked ? '1' : '0') : String(field.value).slice(0, 60); }
  function write(field, value) { if (field.type === 'checkbox' || field.type === 'radio') field.checked = value === '1'; else field.value = value; }
  function flush() { timer = 0; if (skipped) { queue.push(skipped); skipped = null; } if (queue.length) out.postMessage({ storageLab: 'sim-events', events: queue.splice(0), values: fields().map(read) }, '*'); }
  function record(event) {
    if (role !== 'send' || !event.isTrusted) return;
    var type = event.type, target = event.target && event.target.nodeType === 1 ? event.target : document.documentElement, item = { t: type, p: pathOf(target) };
    var moving = type === 'pointermove' || type === 'mousemove', early = moving && event.timeStamp - lastMove < 30;
    if (moving && !event.buttons) return;
    // Movimentos muito seguidos são resumidos, mas a última posição sempre chega.
    if (skipped && (!early || skipped.t !== type)) { queue.push(skipped); skipped = null; }
    if (mouse[type]) {
      if (moving && !early) lastMove = event.timeStamp;
      var box = target.getBoundingClientRect();
      item.x = box.width ? Math.round((event.clientX - box.left) / box.width * 10000) / 10000 : 0;
      item.y = box.height ? Math.round((event.clientY - box.top) / box.height * 10000) / 10000 : 0;
      item.b = event.button; item.s = event.buttons;
    } else if (type === 'input' || type === 'change') {
      if (!/^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
      item.v = read(target);
      // Vários valores seguidos do mesmo campo: basta o último.
      var last = queue[queue.length - 1];
      if (last && last.t === type && last.p.join() === item.p.join()) { last.v = item.v; return; }
    } else {
      // Dentro de um campo, o que vale é o valor digitado (input/change), não a tecla.
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return; item.k = String(event.key).slice(0, 20); item.c = String(event.code).slice(0, 20); }
    if (early) skipped = item; else if (queue.length < 24) queue.push(item);
    if (!timer) timer = setTimeout(flush, 70);
  }
  function replay(item) {
    var target = find(item.p || []), type = String(item.t);
    if (!target) return;
    if (mouse[type]) {
      var box = target.getBoundingClientRect(), init = { bubbles: true, cancelable: true, composed: true, view: window, clientX: box.left + (Number(item.x) || 0) * box.width, clientY: box.top + (Number(item.y) || 0) * box.height, button: Number(item.b) || 0, buttons: Number(item.s) || 0 };
      if (type.indexOf('pointer') === 0) { init.pointerId = 1; init.pointerType = 'mouse'; init.isPrimary = true; target.dispatchEvent(new PointerEvent(type, init)); }
      else target.dispatchEvent(new MouseEvent(type, init));
    } else if (type === 'input' || type === 'change') {
      if (!/^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
      write(target, String(item.v)); target.dispatchEvent(new Event(type, { bubbles: true }));
    } else if (type === 'keydown' || type === 'keyup') target.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, key: String(item.k), code: String(item.c) }));
  }
  Object.keys(mouse).concat(['input', 'change', 'keydown', 'keyup']).forEach(function (type) { window.addEventListener(type, record, true); });
  // Gestos repetidos não têm um ponteiro "de verdade": capturar o ponteiro daria erro.
  ['setPointerCapture', 'releasePointerCapture'].forEach(function (name) {
    var original = Element.prototype[name];
    Element.prototype[name] = function (id) { try { return original.call(this, id); } catch (error) { /* ponteiro repetido */ } };
  });
  window.addEventListener('message', function (event) {
    var data = event.data;
    if (event.source !== out || !data || typeof data !== 'object') return;
    if (data.storageLab === 'sim-role') role = data.role === 'send' || data.role === 'follow' ? data.role : 'off';
    else if (data.storageLab === 'sim-replay' && role === 'follow' && Array.isArray(data.events)) data.events.slice(0, 24).forEach(function (item) { try { replay(item); } catch (error) { /* gesto que não se aplica */ } });
    else if (data.storageLab === 'sim-state' && role === 'follow' && Array.isArray(data.values)) fields().forEach(function (field, index) {
      var value = data.values[index];
      if (typeof value !== 'string' || read(field) === value) return;
      write(field, value); field.dispatchEvent(new Event('input', { bubbles: true })); field.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  var ready = function () { out.postMessage({ storageLab: 'sim-ready' }, '*'); };
  if (document.readyState === 'complete') ready(); else window.addEventListener('load', ready);
}
export const BRIDGE_SCRIPT = '<script>(' + bridge.toString() + ')();</' + 'script>';

// Confere o que chegou do iframe do professor antes de repassar para a turma.
export function cleanSimEvents(events) {
  if (!Array.isArray(events)) return [];
  const clean = [];
  for (const item of events.slice(0, 24)) {
    if (!item || typeof item.t !== 'string' || item.t.length > 14 || !Array.isArray(item.p) || item.p.length > 40 || !item.p.every(Number.isInteger)) continue;
    const next = { t: item.t, p: item.p };
    for (const key of ['x', 'y', 'b', 's']) if (Number.isFinite(item[key])) next[key] = item[key];
    for (const key of ['v', 'k', 'c']) if (typeof item[key] === 'string') next[key] = item[key].slice(0, 60);
    clean.push(next);
  }
  return clean;
}
export const cleanSimValues = values => Array.isArray(values) ? values.slice(0, 40).filter(value => typeof value === 'string').map(value => value.slice(0, 60)) : [];
