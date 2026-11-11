/* Task clips share a 40-second clock; native pixels and frames remain unchanged. */
(() => {
 'use strict';
 let members=[],generation=0,raf=0,cycle=0;
 function stop(){generation++;cancelAnimationFrame(raf);members.forEach(v=>v.pause());members=[];}
 function ready(v){return v.readyState>=2?Promise.resolve():new Promise((resolve,reject)=>{v.addEventListener('loadeddata',resolve,{once:true});v.addEventListener('error',reject,{once:true});});}
 async function start(videos){
  if(videos.length===members.length&&videos.every((v,i)=>v===members[i]))return;
  stop();members=videos;cycle=0;if(!members.length)return;
  const token=generation;
  const master=members.reduce((a,b)=>Number(a.dataset.playbackRate)>Number(b.dataset.playbackRate)?a:b);
  for(const v of members){v.muted=true;v.loop=false;v.dataset.syncCycle='0';v.dataset.syncReady='false';v.load();}
  try{await Promise.all(members.map(ready));}catch{return;}
  if(token!==generation)return;
  async function restart(){
   const group=[...members];
   for(const v of group){v.pause();v.currentTime=0;v.playbackRate=Number(v.dataset.playbackRate);v.dataset.syncCycle=String(cycle);}
   await Promise.all(group.map(v=>v.seeking?new Promise(resolve=>v.addEventListener('seeked',resolve,{once:true})):Promise.resolve()));
   if(token!==generation)return;
   group.forEach(v=>{v.dataset.syncReady='true';v.play().catch(()=>{});});
   raf=requestAnimationFrame(tick);
  }
  function tick(){
   if(token!==generation)return;
   if(master.ended){cycle++;restart();return;}
   if(!master.paused&&!master.seeking){
    const phase=master.currentTime/Number(master.dataset.playbackRate);
    for(const v of members){if(v===master||v.seeking||v.ended)continue;const drift=v.currentTime/Number(v.dataset.playbackRate)-phase;if(Math.abs(drift)>.12)v.currentTime=Math.min(v.duration,phase*Number(v.dataset.playbackRate));}
   }
   raf=requestAnimationFrame(tick);
  }
  restart();
 }
 window.TASK_VIDEO_SYNC={start,stop,state:()=>({cycle,members:members.length})};
})();
