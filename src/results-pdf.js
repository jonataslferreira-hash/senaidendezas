// Relatório do apresentador: nenhum dado individual de respostas é enviado aos alunos.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export function resultsFilename(title) {
 const base=String(title||'Aula').replace(/[\\/:*?"<>|\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim().slice(0,120)||'Aula';
 return `${base} resultados.pdf`;
}
export async function buildResultsPdf(state, title='Aula', date=new Date()) {
 const pdf=await PDFDocument.create();
 const font=await pdf.embedFont(StandardFonts.Helvetica), bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const allowed=new Set(font.getCharacterSet());
 const safe=value=>Array.from(String(value??'')).map(c=>allowed.has(c.codePointAt(0))?c:'?').join('');
 const W=595,H=842,margin=48,width=W-2*margin;
 let page,y;
 const addPage=()=>{page=pdf.addPage([W,H]);y=H-margin;};
 const space=(height=18)=>{if(y-height<margin)addPage();};
 function write(text,{size=11,strong=false,color=rgb(.13,.11,.19),indent=0,after=5}={}) {
  const used=strong?bold:font, max=width-indent, words=safe(text).split(/\s+/); let line='';
  const draw=line=>{space(size+5);page.drawText(line,{x:margin+indent,y,size,font:used,color});y-=size+5;};
  for(let word of words){
   while(word&&used.widthOfTextAtSize(word,size)>max){let n=word.length;while(n>1&&used.widthOfTextAtSize(word.slice(0,n),size)>max)n--;if(line){draw(line);line='';}draw(word.slice(0,n));word=word.slice(n);}
   const candidate=line?line+' '+word:word;
   if(line&&used.widthOfTextAtSize(candidate,size)>max){draw(line);line=word;}else line=candidate;
  }
  if(line)draw(line);y-=after;
 }
 const heading=text=>{space(45);y-=8;write(text,{size:15,strong:true,color:rgb(.39,.23,.59),after:6});};
 addPage();
 write('STORAGE LAB  |  RELATÓRIO DA AULA',{size:10,strong:true,color:rgb(.39,.23,.59)});
 write(title,{size:22,strong:true,after:8});
 write(`Data: ${date.toLocaleDateString('pt-BR')}   |   Participantes na classificação: ${(state.ranking||[]).length}`,{size:10});
 const teams=[...(state.teams||[])].sort((a,b)=>(b.score||0)-(a.score||0));
 if(teams.length){heading('Classificação dos times');teams.forEach((team,i)=>{
   write(`${i+1}º  Time ${team.name}  —  ${(Number(team.score)||0).toLocaleString('pt-BR')} pontos`,{strong:true});
   const members=(team.members||[]).map(p=>p.name).join(', ');if(members)write(`Integrantes: ${members}`,{indent:15,size:10});
 });}
 const quizPodium=!teams.length&&(state.activity?.type==='quiz'||state.resultScope==='quiz'||!state.activity)&&Array.isArray(state.quizRanking);
 if(quizPodium){heading('Classificação do quiz (pódio)');state.quizRanking.forEach((person,i)=>write(`${i+1}º  ${person.name}  —  ${(Number(person.score)||0).toLocaleString('pt-BR')} pontos  |  ${Number(person.correct)||0} acertos`,{size:10}));}
 heading(quizPodium?'Classificação individual geral':'Classificação individual');
 const ranking=state.ranking||[];
 if(!ranking.length)write('Nenhum participante registrado.');
 ranking.forEach((person,i)=>write(`${i+1}º  ${person.name}  —  ${(Number(person.score)||0).toLocaleString('pt-BR')} pontos  |  ${Number(person.correct)||0} acertos no quiz`,{size:10}));
 const questions=state.quizReport||[];
 const difficult=questions.filter(q=>q.answered>0).sort((a,b)=>a.correctCount/a.answered-b.correctCount/b.answered).slice(0,5);
 if(difficult.length){heading('Questões com menor taxa de acerto');difficult.forEach(q=>write(`${q.text} — ${Math.round(100*q.correctCount/q.answered)}% de acerto (${q.correctCount} de ${q.answered} respostas)`,{size:10}));}
 heading('Desempenho nas perguntas do quiz');
 if(!questions.length)write('Não há respostas de quiz registradas nesta sessão. Resultados das outras dinâmicas aparecem no placar geral.');
 questions.forEach((q,i)=>{
  space(65);write(`${i+1}. ${q.text}`,{strong:true});
  write(`${q.answered} resposta(s) de ${q.participants} participante(s) registrados no momento da revelação; ${q.correctCount} acerto(s).`,{size:10});
  (q.options||[]).forEach((option,index)=>write(`${String.fromCharCode(65+index)}. ${option} — ${q.counts?.[index]||0} resposta(s)${index===q.correct?' (correta)':''}`,{size:10,indent:15,after:2}));
 });
 write('Os pontos incluem quiz e dinâmicas. O detalhamento acima corresponde às perguntas de quiz reveladas durante esta sessão.',{size:9,color:rgb(.35,.35,.4),after:0});
 return pdf.save();
}
export async function downloadResultsPdf(state,title) {
 const bytes=await buildResultsPdf(state,title), url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
 const link=document.createElement('a');link.href=url;link.download=resultsFilename(title);link.click();
 setTimeout(()=>URL.revokeObjectURL(url),5000);
}
