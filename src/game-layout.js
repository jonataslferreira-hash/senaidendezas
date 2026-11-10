// Fit long questions to their allocated area rather than introducing a scrollbar.
export class GameLayout{
 constructor(){this.observer=new ResizeObserver(()=>this.fit());}
 mount(root){this.observer.disconnect();this.root=root?.querySelector('.game-question');if(this.root){this.observer.observe(this.root);this.fit();}}
 fit(){if(!this.root?.isConnected)return;for(const node of this.root.querySelectorAll('h1,.option-copy,.answer-explanation p')){if(!node.clientHeight)continue;node.style.fontSize='';const start=parseFloat(getComputedStyle(node).fontSize),min=node.matches('h1')?12:10;let size=start;while(size>min&&(node.scrollHeight>node.clientHeight+1||node.scrollWidth>node.clientWidth+1)){node.style.fontSize=--size+'px';}}}
}
