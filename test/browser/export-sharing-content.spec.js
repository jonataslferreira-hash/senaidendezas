import {test,expect} from '@playwright/test';
import {unzipSync,strFromU8} from 'fflate';
test('exporta capa mista, conteúdo e GIFs dos modelos na ordem das etapas',async({page})=>{
 await page.goto('/');
 const output=await page.evaluate(async()=>{
  const [{newLesson},{createSlideFromTemplate},{newElement},{exportSlides},gifmod]=await Promise.all([import('/src/lessons.js'),import('/src/slide-templates.js'),import('/src/canvas-data.js'),import('/src/export-slides.js'),import('/node_modules/.vite/deps/gifenc.js').catch(()=>import('gifenc'))]);
  const lesson=newLesson(),cover=createSlideFromTemplate('cover'),second=createSlideFromTemplate('cover');
  cover.title='Capa original';cover.background='#ee0000';cover.visualTheme='';cover.backgroundFill=undefined;cover.game={type:'flashcards',cards:[{front:'Pergunta',back:'Resposta'}]};
  cover.elements=[newElement('text',{id:'first',text:'CAPA PRIMEIRO',x:5,y:5,w:50,h:20,fontSize:45})];
  const {GIFEncoder}=gifmod.GIFEncoder?gifmod:gifmod.default, gif=GIFEncoder();gif.writeFrame(new Uint8Array([0,1,1,0]),2,2,{palette:[[255,0,0],[0,0,255]],delay:200,repeat:0});gif.writeFrame(new Uint8Array([1,0,0,1]),2,2,{palette:[[255,0,0],[0,0,255]],delay:200});gif.finish();const data=gif.bytes(),url='data:image/gif;base64,'+btoa(String.fromCharCode(...data));
  second.title='Segundo';second.background='#0000ee';second.visualTheme='';second.backgroundFill=undefined;second.elements=[newElement('text',{id:'second',text:'SEGUNDO SLIDE',x:5,y:5,w:50,h:20}),newElement('image',{id:'animated',image:url,x:10,y:30,w:20,h:30}),newElement('model',{id:'model',model:'ssd',x:40,y:20,w:30,h:60}),newElement('simulation',{id:'sim',simulation:'pendulum',x:70,y:20,w:25,h:60})];
  lesson.slides=[cover,second];lesson.activityBlocks=[{id:'slides',type:'slides',items:[cover.id,second.id]}];
  const pdf=await exportSlides(lesson,'pdf',()=>{},{download:false}),ppt=await exportSlides(lesson,'pptx',()=>{},{download:false});
  const pdfData=await pdf.blob.arrayBuffer();const lib=await import('/node_modules/.vite/deps/pdf-lib.js');const loaded=await lib.PDFDocument.load(pdfData.slice(0));const pdfjs=await import('/node_modules/pdfjs-dist/build/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/node_modules/pdfjs-dist/build/pdf.worker.mjs';const rendered=await pdfjs.getDocument({data:new Uint8Array(pdfData)}).promise;const firstPage=await rendered.getPage(1),viewport=firstPage.getViewport({scale:1}),canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await firstPage.render({canvas,viewport}).promise;const pixel=[...canvas.getContext('2d').getImageData(canvas.width-10,canvas.height-10,1,1).data];return {pages:loaded.getPageCount(),pixel,ppt:[...new Uint8Array(await ppt.blob.arrayBuffer())],gif:[...data]};
 });
 expect(output.pages).toBe(2);expect(output.pixel[0]).toBeGreaterThan(200);expect(output.pixel[2]).toBeLessThan(80);const zip=unzipSync(Uint8Array.from(output.ppt));const slide1=strFromU8(zip['ppt/slides/slide1.xml']),slide2=strFromU8(zip['ppt/slides/slide2.xml']);expect(slide1).toContain('CAPA PRIMEIRO');expect(slide2).toContain('SEGUNDO SLIDE');
 const gifs=Object.entries(zip).filter(([name])=>/^ppt\/media\/.*\.gif$/i.test(name));expect(gifs.length).toBeGreaterThanOrEqual(2);expect(gifs.some(([,data])=>Buffer.from(data).equals(Buffer.from(output.gif)))).toBe(true);expect(slide2).toContain('simulation');
});
