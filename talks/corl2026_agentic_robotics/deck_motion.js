/* Slide-specific design motion and native-video-clock evidence, offline. */
(() => {
 'use strict';
 const mq=matchMedia('(prefers-reduced-motion: reduce)');
 const query=new URLSearchParams(location.search);
 const settled=()=>mq.matches||['render','preview','presenter'].some(k=>query.get(k)==='1');
 let position='',generation=0,owned=[];
 const played=new WeakSet();
 const options=()=>{const c=getComputedStyle(document.documentElement);return{duration:parseFloat(c.getPropertyValue('--ds-reveal-duration'))*1000||600,easing:c.getPropertyValue('--ds-reveal-easing').trim()||'cubic-bezier(.48,0,.34,.99)',stagger:parseFloat(c.getPropertyValue('--ds-child-stagger'))||100};};
 function animate(el,frames,delay=0,duration=options().duration){const a=el.animate(frames,{duration,delay,easing:options().easing,fill:'both'});owned.push(a);return a;}
 function finalNumbers(container){container.querySelectorAll('[data-count]').forEach(e=>e.textContent=e.dataset.final||e.dataset.count+(e.dataset.suffix||''));container.querySelectorAll('[data-value-count]').forEach(e=>e.textContent=e.dataset.valueCount);}
 // Same cubic Bezier as the house motion token, evaluated for count-up figures.
 function eased(x){let t=x;for(let i=0;i<7;i++){const mt=1-t,px=3*mt*mt*t*.48+3*mt*t*t*.34+t*t*t,dx=3*mt*mt*.48+6*mt*t*(.34-.48)+3*t*t*(1-.34);t=Math.max(0,Math.min(1,t-(px-x)/(dx||1)));}return 3*(1-t)*t*t*.99+t*t*t;}
 function count(el,delay=0){const exact=el.dataset.valueCount??el.dataset.final??el.dataset.count;const target=Number(exact),decimals=(exact.split('.')[1]||'').length;const token=generation,begin=performance.now()+delay,duration=options().duration;el.textContent=(0).toFixed(decimals);function tick(now){if(token!==generation)return;const p=Math.max(0,Math.min(1,(now-begin)/duration));el.textContent=p===1?exact:(target*eased(p)).toFixed(decimals);if(p<1)requestAnimationFrame(tick);}requestAnimationFrame(tick);}
 function grow(el,delay){el.style.transformBox='fill-box';el.style.transformOrigin='left center';animate(el,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],delay);}
 function cancel(){generation++;for(const a of owned)a.cancel();owned=[];document.querySelectorAll('.time-headline').forEach(e=>e.style.removeProperty('visibility'));finalNumbers(document);}
 function setBarLayout(slide,compact){
  slide.querySelectorAll('.time-bars [data-large]').forEach(el=>{const values=JSON.parse(compact?el.dataset.compact:el.dataset.large);for(const [key,value]of Object.entries(values)){if(key==='text')el.textContent=value;else el.setAttribute(key,value);}});
  slide.querySelectorAll('.time-bars [data-model-row]').forEach(el=>{el.style.transform=compact?`translateY(${el.dataset.compactTranslate}px)`:'translateY(0px)';});
 }
 function chart(slide,step,previous){
  const {duration,stagger}=options();
  setBarLayout(slide,false);
  if(step===0){
   slide.querySelectorAll('.time-headline [data-count]').forEach(e=>count(e));
   slide.querySelectorAll('.time-bars [data-model-row]').forEach((row,r)=>{
    row.querySelectorAll('.split-segment').forEach((el,j)=>grow(el,duration+j*stagger+r*stagger));
    row.querySelectorAll('.segment-label').forEach((el,j)=>animate(el,[{opacity:0},{opacity:1}],duration*2+j*stagger+r*stagger));
   });
  }else{
   const transition=previous==='7:0',fade=300,reveal=transition?fade+duration:duration;
   if(transition){
    slide.querySelectorAll('.time-headline').forEach(el=>{el.style.visibility='visible';const a=animate(el,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-24px)'}],0,fade);a.onfinish=()=>el.style.removeProperty('visibility');});
    const token=generation;
    const moves=[...slide.querySelectorAll('.time-bars [data-model-row]')].map(el=>animate(el,[{transform:'translateY(0px)'},{transform:`translateY(${el.dataset.compactTranslate}px)`}],fade,duration));
    slide.querySelectorAll('.time-bars .move-rect').forEach(el=>{const target=JSON.parse(el.dataset.compact);animate(el,[{y:el.getAttribute('y')+'px',height:el.getAttribute('height')+'px'},{y:target.y+'px',height:target.height+'px'}],fade,duration);});
    // Labels keep native glyph geometry; hide during the move, then adopt their
    // compact native layout once the bars have arrived. No text is scaled.
    slide.querySelectorAll('.time-bars .segment-label').forEach(el=>animate(el,[{opacity:1},{opacity:0}],fade,100));
    Promise.all(moves.map(a=>a.finished)).then(()=>{if(generation!==token)return;setBarLayout(slide,true);slide.querySelectorAll('.time-bars .segment-label').forEach(el=>animate(el,[{opacity:0},{opacity:1}],0,300));}).catch(()=>{});
   }else{
    setBarLayout(slide,true);slide.querySelectorAll('.time-bars .split-segment').forEach((el,i)=>grow(el,(i%4)*stagger));
   }
   // The entire breakdown, including legend and axis, stays absent until the
   // headline exit and both bar translations have completely finished.
   animate(slide.querySelector('.think-panel'),[{opacity:0},{opacity:1}],reveal,duration);
   slide.querySelectorAll('[data-reason-row]').forEach((row,i)=>{
    const delay=reveal+i*stagger;
    row.querySelectorAll('.reason-bar').forEach(el=>grow(el,delay));
    row.querySelectorAll('[data-value-count]').forEach(el=>count(el,delay));
    row.querySelectorAll('text').forEach(el=>animate(el,[{opacity:0},{opacity:1}],delay));
   });
  }
 }
 function safetyExamples(slide,step,previous){
  if(slide.dataset.slide!=='10'||step!==1)return;
  const exiting=previous==='10:0',delay=exiting?300:0;
  if(exiting)slide.querySelectorAll('.safety-intro').forEach(el=>animate(el,[{visibility:'visible',opacity:1,transform:'translateY(0)'},{visibility:'hidden',opacity:0,transform:'translateY(-24px)'}],0,300));
  slide.querySelectorAll('.safety-examples').forEach(el=>{
   el.classList.remove('revealing');
   animate(el,[{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],delay);
  });
 }
 function toolsAndSimulation(slide){
  const n=slide.dataset.slide;
  if(n==='12'||n==='19'||n==='24'){
   if(played.has(slide))return;played.add(slide);
   slide.querySelectorAll('.numbered-item,.finding-item,.system-statement').forEach((el,i)=>animate(el,[{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],i*100));
  }
  if(n==='15'){
   slide.querySelectorAll('.tools-time-row').forEach(row=>{
    const expanded=row.dataset.mode==='expanded';
    if(expanded)animate(row,[{opacity:0},{opacity:1}],1200,300);
    row.querySelectorAll('.tools-time-segment').forEach((el,i)=>{
     if(expanded)animate(el,[{x:el.dataset.originalX+'px',width:el.dataset.originalWidth+'px'},{x:el.getAttribute('x')+'px',width:el.getAttribute('width')+'px'}],1200,600);
     else grow(el,i*100);
    });
    row.querySelectorAll('.tools-value').forEach(el=>animate(el,[{opacity:0},{opacity:1}],expanded?1800:1000,300));
   });
  }
  if(n==='16'){
   if(played.has(slide))return;played.add(slide);
   const lines=[...slide.querySelectorAll('.prompt-line')],total=lines.reduce((sum,e)=>sum+e.textContent.length,0);let delay=0;
   for(const el of lines){const length=el.textContent.length,duration=1800*length/total;const a=el.animate([{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0% 0 0)'}],{delay,duration,easing:`steps(${length}, end)`,fill:'both'});owned.push(a);delay+=duration;}
  }
 }
 function architectureFocus(slide,step){
  const n=slide.dataset.slide;
  if(!((n==='25'&&step===4)||n==='27'))return;
  if(n==='27'){if(played.has(slide))return;played.add(slide);}
  const svg=slide.querySelector('.ai-architecture'),target=getComputedStyle(svg).color;
  const ink=getComputedStyle(document.documentElement).getPropertyValue('--ds-ink').trim();
  animate(svg,[{color:ink},{color:target}]);
  svg.querySelectorAll('.ai-highlight .ai-module-box').forEach(box=>animate(box,[{transform:'scale(1)',strokeWidth:'1.3',strokeOpacity:.45},{transform:'scale(1.04)',strokeWidth:'2.6',strokeOpacity:1}]));
 }
 // Completion is current, never latched: exact half-open intervals from the blog.
 function paintMug(panel,poster=false){
  const video=panel.querySelector('video');if(!video)return;
  const t=Math.max(0,Math.min(60,poster?Number(panel.dataset.posterTime):video.currentTime));
  const intervals=JSON.parse(panel.dataset.finishedIntervals);
  const finished=intervals.some(([a,b])=>t+1e-6>=a&&t+1e-6<b);
  const status=panel.querySelector('.mug-status'),head=panel.querySelector('.mug-playhead');
  const label='Simulator: '+(finished?'Finished':'Unfinished');
  if(status.textContent!==label)status.textContent=label;
  status.dataset.finished=String(finished);
  panel.querySelector('.mug-clock').textContent=t.toFixed(1)+' / 60 s';
  head.setAttribute('x1',880*t/60);head.setAttribute('x2',880*t/60);
  panel.dataset.time=String(t);panel.dataset.static=String(poster||mq.matches);
 }
 function clock(t,kind){if(kind==='alignment'){const n=Math.max(0,Math.round(t));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');}return t.toFixed(1)+' s';}
 function paint(panel,all=false){
  const video=panel.querySelector('video');if(!video)return;
  const time=all?Number(panel.dataset.end):Math.max(0,video.currentTime*Number(panel.dataset.speed)+Number(panel.dataset.offset));
  const old=Number(panel.dataset.originalTime??-1),reset=time<old-.2;
  panel.dataset.originalTime=time.toFixed(3);panel.dataset.settled=String(all);
  const lines=[...panel.querySelectorAll('.agent-entry')];let current=-1;
  for(let i=0;i<lines.length;i++)if(time+.0001>=Number(lines[i].dataset.start))current=i;
  lines.forEach((el,i)=>{
   if(reset){el.getAnimations().forEach(a=>a.cancel());el.dataset.reached='false';}
   const reached=i<=current,was=el.dataset.reached==='true';
   el.dataset.reached=String(reached);el.classList.toggle('past',i<current);el.classList.toggle('current',i===current);
   if(reached&&!was&&!all&&video.currentTime>.1)el.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:options().duration,easing:options().easing});
  });
  panel.querySelectorAll('[data-progress-start]').forEach(el=>{
   const a=Number(el.dataset.progressStart),b=Number(el.dataset.progressEnd),fraction=all?1:Math.max(0,Math.min(1,(time-a)/(b-a)));
   el.setAttribute('width',Number(el.dataset.fullWidth)*fraction);el.dataset.fraction=fraction.toFixed(6);
  });
  const readout=panel.querySelector('.progress-readout');if(readout)readout.textContent=clock(time,'alignment')+' / 2:16';
 }
 function settleClone(container){if(container.dataset.slide==='7')setBarLayout(container,+container.dataset.currentStep===1);finalNumbers(container);container.querySelectorAll('.replay-state').forEach(p=>paint(p,true));container.querySelectorAll('.mug-player').forEach(p=>paintMug(p,true));}
 function apply(slide,step,reduce=false,force=false){
  const next=slide.dataset.slide+':'+step,previous=position;
  if(next!==position||force){cancel();position=next;if(slide.dataset.slide==='7'){if(reduce)setBarLayout(slide,step===1);else chart(slide,step,previous);}else if(!reduce){toolsAndSimulation(slide);architectureFocus(slide,step);safetyExamples(slide,step,previous);}}
  if(reduce){owned.forEach(a=>a.finish());finalNumbers(slide);}
  if(slide.dataset.slide==='8')slide.querySelectorAll('.replay-state').forEach(p=>paint(p,reduce));
  slide.querySelectorAll('.mug-player').forEach(p=>paintMug(p,['render','preview','presenter'].some(k=>query.get(k)==='1')));
 }
 function frame(){const panel=document.querySelector('#slide-8.active .replay-state[data-visible="true"]');if(panel)paint(panel,settled());const mug=document.querySelector('#slide-28.active .mug-player');if(mug)paintMug(mug,['render','preview','presenter'].some(k=>query.get(k)==='1'));requestAnimationFrame(frame);}
 mq.addEventListener('change',()=>{const slide=document.querySelector('.slide.active');if(slide)apply(slide,Number(slide.dataset.currentStep),settled(),true);});
 window.DECK_MOTION={apply,settleClone,paint,options};requestAnimationFrame(frame);
})();
