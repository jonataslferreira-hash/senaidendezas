export class ChatTyping {
 constructor(studio,paint){this.studio=studio;this.paint=paint;this.names=[];this.epoch=0;}
 connect(kind,id){this.close();const epoch=this.epoch;this.channel=this.studio.account.client.channel('sl-typing-'+kind+':'+id,{config:{private:true}}).on('broadcast',{event:'typing'},({payload})=>{if(epoch!==this.epoch||payload?.uid===this.studio.account.user?.id)return;this.names=payload?.active?[String(payload.name||'Alguém').slice(0,60)]:[];clearTimeout(this.expire);this.expire=setTimeout(()=>{this.names=[];this.paint();},3000);this.paint();}).subscribe();}
 send(active=true){if(!this.channel)return;if(active&&Date.now()-(this.last||0)<1000)return;this.last=Date.now();this.channel.send({type:'broadcast',event:'typing',payload:{uid:this.studio.account.user?.id,name:this.studio.account.user?.user_metadata?.display_name||'Alguém',active}}).catch(()=>{});}
 close(){this.epoch++;this.channel?.unsubscribe();this.channel=null;clearTimeout(this.expire);this.names=[];this.last=0;}
}
