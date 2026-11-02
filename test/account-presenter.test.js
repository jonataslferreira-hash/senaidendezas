import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AccountPresenter,remoteConnectionMessage} from '../src/account-presenter.js';

test('mensagens do controle distinguem rede, expiração e autorização sem presumir SQL ausente',()=>{
 assert.match(remoteConnectionMessage('TIMED_OUT'),/demorou/);
 assert.match(remoteConnectionMessage('CLOSED',null,false),/sem internet/);
 assert.match(remoteConnectionMessage('CHANNEL_ERROR',new Error('Token expired JWT')),/expirou/);
 assert.match(remoteConnectionMessage('CHANNEL_ERROR',new Error('You do not have permissions to read from this Topic')),/recusou a autorização/);
 assert.doesNotMatch(remoteConnectionMessage('CLOSED'),/sql/i);
});

test('canal privado aguarda autenticação; reconectar remove o anterior e recupera presença',async()=>{
 const calls=[],channels=[];let resolveAuth;
 const auth=new Promise(resolve=>resolveAuth=resolve);
 const client={realtime:{setAuth:async()=>{calls.push('auth');await auth;}},removeChannel:async c=>{calls.push('remove');channels.splice(channels.indexOf(c),1);},channel:(topic,options)=>{
  calls.push('channel');assert.equal(options.config.private,true);const c={topic,on(){return this;},subscribe(callback){this.callback=callback;return this;},track:async()=>{},untrack:async()=>{}};channels.push(c);return c;
 }};
 const presenter=Object.create(AccountPresenter.prototype);Object.assign(presenter,{studio:{account:{user:{id:'owner'},client}},epoch:0,device:'phone',paint(){},local:{code:'123456'}});
 const connecting=presenter.connect();assert.deepEqual(calls,['auth']);resolveAuth();await connecting;assert.deepEqual(calls,['auth','channel']);channels[0].callback('SUBSCRIBED');assert.equal(presenter.ready,true);await presenter.connect(true);assert.deepEqual(calls,['auth','channel','remove','auth','channel']);channels[0].callback('SUBSCRIBED');assert.equal(presenter.ready,true);
});
