import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Presentation,PresentationFile} from '@oai/artifact-tool';

const workspaceDir=process.cwd();
const staging=path.resolve('.codex-pptx-test');
const skill='C:/Users/jonat/.codex/plugins/cache/openai-primary-runtime/presentations/26.1105.12137/skills/presentations';
const runtime='C:/Users/jonat/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const deck=Presentation.create({slideSize:{width:1280,height:720}});
const ink='#142634', paper='#F3EFE5', green='#B4E785', rust='#963A1C', muted='#415864';
const source='https://www.kingston.com/en/blog/personal-storage/ssd-vs-hdd-differences';
const slots=[];

function tx(slide,text,x,y,width,height,style={}){
  const box=slide.shapes.add({name:style.slot||text.slice(0,48),geometry:'textbox',position:{left:x,top:y,width,height},fill:'none',line:{fill:'none',width:0}});
  const {slot,...font}=style;
  if(slot)slots.push({box,slot,text});
  box.text=slot?'{{'+slot+'}}':text;
  box.text.style={typeface:'Arial',fontSize:28,color:ink,insets:{left:0,right:0,top:0,bottom:0},...font};
  return box;
}
function rule(slide,x,y,width,height,fill){
  slide.shapes.add({geometry:'rect',name:'Linha de leitura',position:{left:x,top:y,width,height},fill,line:{fill:'none',width:0}});
}
async function photo(slide,file,alt,x,y,width,height){
  slide.images.add({blob:new Uint8Array(await fs.readFile(path.join(staging,file))),contentType:'image/jpeg',alt,fit:'cover',position:{left:x,top:y,width,height}});
}
function slide(color){const s=deck.slides.add();s.background.fill=color;return s;}
const cover=slide(ink);
await photo(cover,'cover.jpg','Pratos magnéticos de um disco rígido desmontado',600,0,680,720);
tx(cover,'SENAI   /   ARMAZENAMENTO',62,72,510,40,{fontSize:21,bold:true,color:green});
tx(cover,'HDD e SSD',62,226,515,104,{fontSize:77,bold:true,color:'#FFFFFF',slot:'capa_titulo'});
tx(cover,'Como os computadores guardam dados',64,350,465,108,{fontSize:36,color:'#DBE8ED',slot:'capa_subtitulo'});
rule(cover,64,555,115,5,green);
cover.speakerNotes.text='Foto: Vidar Løkken, domínio público. https://commons.wikimedia.org/wiki/File:Harddrive_platters.jpg';

const hdd=slide(paper);
await photo(hdd,'hdd.jpg','HDD aberto, com prato e cabeça de leitura visíveis',678,52,548,585);
tx(hdd,'01  /  DISCO RÍGIDO',64,67,515,40,{fontSize:20,bold:true,color:rust});
tx(hdd,'Dentro de um HDD',64,128,565,78,{fontSize:53,bold:true,slot:'hdd_titulo'});
rule(hdd,65,236,539,2,rust);
tx(hdd,'Pratos magnéticos',65,269,530,42,{fontSize:30,bold:true});
tx(hdd,'Os pratos giram e armazenam os dados em superfícies magnéticas.',65,322,530,85,{fontSize:29,color:muted,slot:'hdd_pratos'});
tx(hdd,'Cabeça de leitura e gravação',65,449,570,45,{fontSize:30,bold:true});
tx(hdd,'Um braço posiciona a cabeça sobre o local onde estão os dados.',65,500,530,93,{fontSize:29,color:muted,slot:'hdd_cabeca'});
tx(hdd,'HDD aberto com o conjunto mecânico exposto.',678,654,548,30,{fontSize:18,color:muted});
hdd.speakerNotes.text='Referência técnica: '+source+'\nFoto: Zzubnik, domínio público. https://commons.wikimedia.org/wiki/File:Open_hard-drive.jpg';

const ssd=slide(ink);
await photo(ssd,'ssd.jpg','Placa de SSD com chips de memória NAND',54,88,644,488);
tx(ssd,'02  /  MEMÓRIA FLASH',752,71,450,35,{fontSize:20,bold:true,color:green});
tx(ssd,'Dentro de um SSD',752,130,470,124,{fontSize:51,bold:true,color:'#FFFFFF',slot:'ssd_titulo'});
tx(ssd,'Memória NAND',752,264,460,42,{fontSize:30,bold:true,color:green});
tx(ssd,'Os chips preservam os dados mesmo com o computador desligado.',752,318,455,100,{fontSize:28,color:'#DBE8ED',slot:'ssd_nand'});
tx(ssd,'Controlador',752,458,460,42,{fontSize:30,bold:true,color:green});
tx(ssd,'Organiza a leitura e a gravação. O SSD não precisa mover uma cabeça para buscar os dados.',752,511,455,130,{fontSize:28,color:'#DBE8ED',slot:'ssd_controlador'});
tx(ssd,'Foto: Phiarc · Wikimedia Commons · CC BY-SA 4.0 · enquadrada',54,599,644,32,{fontSize:16,color:'#DBE8ED'});
ssd.speakerNotes.text='Referência técnica: '+source+'\nFoto: Phiarc. https://commons.wikimedia.org/wiki/File:Intel_SSD_330_Series_NAND_flash_PCB.jpg\nLicença da fotografia: https://creativecommons.org/licenses/by-sa/4.0/';

const compare=slide(paper);
tx(compare,'03  /  ESCOLHA DO ARMAZENAMENTO',64,70,1100,36,{fontSize:20,bold:true,color:rust});
tx(compare,'Qual unidade faz sentido?',64,140,1160,84,{fontSize:58,bold:true,slot:'comparacao_titulo'});
rule(compare,64,258,1152,3,ink);
rule(compare,637,300,2,254,'#A4ABA9');
tx(compare,'HDD',64,312,500,72,{fontSize:51,bold:true,color:rust});
tx(compare,'Guardar muitos arquivos',64,411,490,53,{fontSize:32,bold:true,slot:'comparacao_hdd'});
tx(compare,'Costuma oferecer menor custo por gigabyte.',64,481,490,98,{fontSize:29,color:muted,slot:'comparacao_hdd_corpo'});
tx(compare,'SSD',696,312,500,72,{fontSize:51,bold:true,color:'#276653'});
tx(compare,'Abrir o sistema e os programas',696,411,510,61,{fontSize:32,bold:true,slot:'comparacao_ssd'});
tx(compare,'O acesso rápido ajuda a reduzir o tempo de carregamento.',696,481,490,98,{fontSize:29,color:muted,slot:'comparacao_ssd_corpo'});
compare.speakerNotes.text='Referência técnica: '+source;

const templatePath=path.join(staging,'modelo-armazenamento.pptx');
await (await PresentationFile.exportPptx(deck)).save(templatePath);
for(const {box,text} of slots)box.text.replace(box.text.toString(),text);
const candidatePath=path.join(staging,'aula-preenchida.pptx');
await (await PresentationFile.exportPptx(deck)).save(candidatePath);
for(const [index,page] of deck.slides.items.entries()){
  const png=await deck.export({slide:page,format:'png',scale:.8});
  await fs.writeFile(path.join(staging,'slide-'+(index+1)+'.png'),new Uint8Array(await png.arrayBuffer()));
}
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
await finalizePresentation({
  workspaceDir,candidatePath,finalPath:path.resolve('artifacts/HDD-e-SSD-SENAI.pptx'),
  explicitTotalSlideCount:4,pythonExecutable:path.join(runtime,'python/python.exe'),
  integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs:['--expected-slide-size-emu','12192000,6858000'],
  fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,
  receiptPath:path.join(staging,'validation.json')
});
