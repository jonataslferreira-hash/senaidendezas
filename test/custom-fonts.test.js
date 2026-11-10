import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateCustomFonts} from '../src/custom-fonts.js';
import {newLesson,validateLesson} from '../src/lessons.js';
import {compactLesson,lessonAssetIds} from '../src/assets.js';
import {recommendFonts} from '../src/fonts.js';
test('fontes próprias são validadas e compactadas sem perder a referência do arquivo',()=>{const l=newLesson(),family='SLFont-'+crypto.randomUUID(),assetId='asset-'+crypto.randomUUID();l.customFonts=[{family,name:'Minha fonte',data:'data:font/ttf;base64,AAEAAA==',assetId}];const parsed=validateLesson(l);assert.equal(parsed.customFonts[0].name,'Minha fonte');assert.equal(compactLesson(parsed).customFonts[0].data,'');assert.ok(lessonAssetIds(parsed).includes(assetId));assert.throws(()=>validateCustomFonts([{family,name:'A',data:'data:text/html;base64,YQ=='}]),/Use fontes/);assert.throws(()=>validateCustomFonts([{family,name:'A',assetId:'../../x'}]),/Referência/);});
test('recomendações consideram o tema do slide e a função do texto',()=>{assert.ok(recommendFonts({title:'HDD e SSD',elements:[]},{role:'title'}).includes('Space Grotesk'));assert.ok(recommendFonts({title:'História e literatura',elements:[]},{}).includes('Lora'));assert.notDeepEqual(recommendFonts({title:'Aula',elements:[]},{role:'title'}),recommendFonts({title:'Aula',elements:[]},{}));});
