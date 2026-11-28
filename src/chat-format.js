// Calendar grouping uses the viewer's local day, including DST transitions.
const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function localDay(value){const d=new Date(value);if(!Number.isFinite(d.getTime()))return null;return {key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,stamp:Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()),date:d};}
export function chatDayLabel(value,now=new Date()){
 const day=localDay(value),today=localDay(now);if(!day||!today)return '';
 const difference=(today.stamp-day.stamp)/86400000;
 if(difference===0)return 'Hoje';if(difference===1)return 'Ontem';if(difference===2)return 'Anteontem';
 return day.date.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
}
export function sortChatMessages(messages){return [...messages].sort((a,b)=>{
 const x=Date.parse(a.created_at),y=Date.parse(b.created_at);return (Number.isFinite(x)?x:0)-(Number.isFinite(y)?y:0)||String(a.id).localeCompare(String(b.id));
});}
export function chatRows(messages,render){let previous;return messages.map(message=>{
 const day=localDay(message.created_at),key=day?.key;
 const separator=key&&key!==previous?`<div class="chat-day" data-message-id="day:${escape(key)}" role="separator" aria-label="${escape(chatDayLabel(message.created_at))}"><span>${escape(chatDayLabel(message.created_at))}</span></div>`:'';
 previous=key;return separator+render(message);
}).join('');}
