import test from 'node:test';
import assert from 'node:assert/strict';
import {localInstitutions,parseInstitutions} from '../src/institution-search.js';
test('sugestões locais aceitam sigla e ignoram acentos',()=>{
 assert.equal(localInstitutions('se').length,0);assert.ok(localInstitutions('senai').some(i=>i.name.includes('SENAI')));assert.ok(localInstitutions('instituto federal da bahia').length);assert.deepEqual(localInstitutions('sem resultado xyz'),[]);
});
test('normaliza o catálogo público e ignora dados inválidos',()=>{
 assert.deepEqual(parseInstitutions({items:[{names:[{types:['ror_display'],value:'Instituto exemplo'}],locations:[{geonames_details:{name:'Salvador',country_name:'Brazil'}}]},null,{names:[{value:'x'.repeat(81),types:['label']}]}]}),[{name:'Instituto exemplo',place:'Salvador, Brazil'}]);assert.deepEqual(parseInstitutions(null),[]);
});
test('SENAI Dendezeiros aparece com marca somente para a unidade conhecida',async()=>{
 const {institutionLogo}=await import('../src/institution-search.js');
 assert.equal(localInstitutions('dendezeiros')[0].name,'SENAI Dendezeiros');
 assert.ok(institutionLogo('SENAI Dendezeiros'));assert.ok(institutionLogo('SENAI São Paulo'));assert.equal(institutionLogo('Escola não cadastrada'),'');
});
test('logos são obtidas apenas pelo identificador cadastrado no ROR e respeitam o nome do arquivo',async()=>{
 const {fetchInstitutionLogos,institutionLogoInfo}=await import('../src/institution-search.js');
 const parsed=parseInstitutions({items:[{names:[{value:'Exemplo',types:['ror_display']}],external_ids:[{type:'wikidata',all:['Q987654321']}] }]});assert.equal(parsed[0].wikidata,'Q987654321');
 await fetchInstitutionLogos(['Q987654321','https://evil.example'],async url=>{assert.equal(url.hostname,'www.wikidata.org');assert.equal(url.searchParams.get('ids'),'Q987654321');return new Response(JSON.stringify({entities:{Q987654321:{claims:{P154:[{rank:'normal',mainsnak:{datavalue:{value:'Logo Exemplo.svg'}}}]}}}}));});
 const info=institutionLogoInfo('Exemplo','Q987654321');assert.equal(new URL(info.url).hostname,'commons.wikimedia.org');assert.ok(info.credit.includes('Logo%20Exemplo.svg'));
});
