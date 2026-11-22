import test from 'node:test';
import assert from 'node:assert/strict';
import {AccountPresenter} from '../src/account-presenter.js';

function remote(){
 const actions=[];
 const obj=Object.create(AccountPresenter.prototype);
 Object.assign(obj,{device:'host',local:{documentId:'doc-allowed',code:'123456'},studio:{callbacks:{remoteAction:(...a)=>actions.push(a)}},seen:new Map(),statuses:new Map(),handled:[],waiting:new Map(),paint(){},send(){},announce(){}});
 return {obj,actions};
}
test('controle colaborativo só aceita comandos do canal da aula apresentada',()=>{
 const {obj,actions}=remote();
 const message={kind:'control',from:'other',target:'host',id:'1',action:'next-slide'};
 obj.receive(message,'doc-other'); assert.equal(actions.length,0);
 obj.receive(message,'doc-allowed'); assert.deepEqual(actions,[['next-slide',undefined]]);
 obj.receive(message,'doc-allowed'); assert.equal(actions.length,1);
});
test('conexão compartilhada é associada ao documento para resposta dirigida',()=>{
 const {obj}=remote();
 obj.receive({kind:'presence',from:'peer',code:'123456',title:'Aula',total:4},'doc-allowed');
 assert.equal(obj.sessions[0].scope,'doc-allowed');
});

test('configuração ICE aceita apenas URLs STUN/TURN válidas',async()=>{
 const {parseIceServers}=await import('../src/network.js');
 assert.equal(parseIceServers('inválido'),undefined);
 assert.equal(parseIceServers('[{"urls":"https://invalido"}]'),undefined);
 assert.deepEqual(parseIceServers('[{"urls":"turns:relay.example:443?transport=tcp","username":"u","credential":"p"}]'),[{urls:'turns:relay.example:443?transport=tcp',username:'u',credential:'p'}]);
});

test('dois aparelhos em contas diferentes descobrem e comandam a mesma aula compartilhada',async()=>{
 const id='12345678-1234-1234-1234-123456789abc',channels=[];
 const client={channel(topic){
   const channel={topic,send({payload}){for(const other of channels)if(other!==channel&&other.topic===topic)other.handler?.({payload});},on(_kind,_filter,handler){channel.handler=handler;return channel;},subscribe(cb){queueMicrotask(()=>cb('SUBSCRIBED'));return channel;}};
   channels.push(channel);return channel;
 },removeChannel(channel){channels.splice(channels.indexOf(channel),1);}};
 function device(name,documentId){
   const {obj,actions}=remote();Object.assign(obj,{device:name,owner:name,studio:{account:{user:{id:name},client},callbacks:{remoteAction:(...a)=>actions.push(a)}},local:documentId?{documentId,code:'123456',title:'Compartilhada',total:3,slide:0}:null,sharedChannels:new Map(),bus:null,channel:null,ready:false});
   delete obj.send;delete obj.announce;
   obj.syncShared([{id}]);return {obj,actions};
 }
 const host=device('professor',id),other=device('colaborador');
 await new Promise(resolve=>setImmediate(resolve));
 host.obj.announce(true);
 assert.equal(other.obj.sessions[0].device,'professor');
 other.obj.open='professor'; assert.ok(other.obj.available());
 other.obj.send({kind:'control',target:'professor',id:'cmd',action:'next-slide'});
 assert.deepEqual(host.actions,[['next-slide',undefined]]);
 // Um canal de outra aula não pode enviar comando para essa apresentação.
 host.obj.receive({kind:'control',target:'professor',from:'x',id:'bad',action:'previous'},'outra-aula');
 assert.equal(host.actions.length,1);
});
