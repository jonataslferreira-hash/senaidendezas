import test from 'node:test';
import assert from 'node:assert/strict';
import {localInstitutions,parseInstitutions} from '../src/institution-search.js';
test('sugestões locais aceitam sigla e ignoram acentos',()=>{
 assert.equal(localInstitutions('se').length,0);assert.ok(localInstitutions('senai').some(i=>i.name.includes('SENAI')));assert.ok(localInstitutions('instituto federal da bahia').length);assert.deepEqual(localInstitutions('sem resultado xyz'),[]);
});
test('normaliza o catálogo público e ignora dados inválidos',()=>{
 assert.deepEqual(parseInstitutions({items:[{names:[{types:['ror_display'],value:'Instituto exemplo'}],locations:[{geonames_details:{name:'Salvador',country_name:'Brazil'}}]},null,{names:[{value:'x'.repeat(81),types:['label']}]}]}),[{name:'Instituto exemplo',place:'Salvador, Brazil'}]);assert.deepEqual(parseInstitutions(null),[]);
});
