import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoLesson,validateLesson} from '../src/lessons.js';
import {newElement} from '../src/canvas-data.js';
import {presentationSlide,mobileResource,mobileMarkup} from '../src/slide-display.js';

test('slides antigos usam um canvas com IDs estáveis sem modificar a aula original',()=>{
 const lesson=demoLesson(),before=structuredClone(lesson);
 for(const slide of lesson.slides){const a=presentationSlide(slide),b=presentationSlide(slide);assert.equal(a.kind,'canvas');assert.deepEqual(a.elements.map(e=>e.id),b.elements.map(e=>e.id));assert.equal(a.elements.find(e=>e.type==='model').model,slide.model);}
 assert.deepEqual(lesson,before);
});
test('o celular prioriza o modelo e respeita a escolha da imagem ou somente texto após validar',()=>{
 const lesson=demoLesson(),slide=lesson.slides[0];slide.kind='canvas';slide.elements=[newElement('image',{id:'picture',image:'https://example.com/picture.png',imageAlt:'Foto'}),newElement('model',{id:'drive',model:'hdd'})];
 assert.equal(mobileResource(slide).id,'drive');slide.mobileFocus='element:picture';const saved=validateLesson(lesson).slides[0];assert.equal(saved.mobileFocus,'element:picture');assert.equal(mobileResource(saved).id,'picture');assert.match(mobileMarkup(saved),/mobile-slide-image/);assert.doesNotMatch(mobileMarkup(saved),/slide-canvas/);
 slide.mobileFocus='text';assert.equal(mobileResource(slide),null);slide.mobileFocus='element:removed';assert.equal(mobileResource(slide).id,'drive');
});
