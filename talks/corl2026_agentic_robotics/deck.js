/* Offline presentation runtime. No libraries, network calls, or server. */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const presenter = params.get('presenter') === '1';
  const rendering = params.get('render') === '1';
  const preview = params.get('preview') === '1';
  const root = document.documentElement;
  const slides = [...document.querySelectorAll('.slide')];
  const maxSteps = Object.fromEntries(slides.map(s => [+s.dataset.slide, +s.dataset.builds]));
  const storeKey = 'corl2026:' + location.pathname;
  const sender = Math.random().toString(36).slice(2);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || rendering || preview || presenter;
  const safeRead = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const safeWrite = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  // An explicit cut preset replaces prior saved hides, including all earlier presets.
  const initialHidden = params.get('cut') === 'A' ? [17] : safeRead(storeKey + ':hidden', []);
  let state = { slide: +(params.get('slide') || 1), step: +(params.get('step') || 0), hidden: [...new Set(initialHidden)], theme: params.get('theme') || 'light', startedAt: null, revision: 0 };
  let presenterWindow = null;
  let channel = null;
  let lastEvent = '';
  const activeVideos = new Set();
  const counted = new WeakSet();
  const videoStarts = new WeakMap();
  let toastTimeout;
  try { channel = new BroadcastChannel(storeKey); } catch {}
  // Presenter view (speaker notes) is only offered when the deck runs locally,
  // never on the public site. To re-enable it publicly, drop the `local` check.
  const local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const hasNotes = local && !!(window.DECK_NOTES && window.DECK_NOTES.slides);
  const titleOf = n => (hasNotes && window.DECK_NOTES.slides[n]?.title) || (slides[n - 1]?.getAttribute('aria-label') || '').replace(/^Slide \d+:\s*/, '') || `Slide ${n}`;

  // Wrap only result figures, never dates, model names, axis ticks or source text.
  document.querySelectorAll('.metric:not([data-count]),.metric-pair b,.evidence-rail strong,.success-change').forEach(el => {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes=[]; while(walk.nextNode()) nodes.push(walk.currentNode);
    for(const node of nodes){
      const text=node.textContent; const matches=[...text.matchAll(/[−-]?\d+(?:\.\d+)?/g)];if(!matches.length)continue;
      const fragment=document.createDocumentFragment();let cursor=0;
      for(const match of matches){
        fragment.append(document.createTextNode(text.slice(cursor,match.index)));
        const span=document.createElement('span');span.dataset.count=match[0].replace('−','-');span.dataset.final=match[0];span.textContent=match[0];fragment.append(span);cursor=match.index+match[0].length;
      }
      fragment.append(document.createTextNode(text.slice(cursor)));node.replaceWith(fragment);
    }
  });

  function toast(message) {
    const box = document.getElementById('toast');
    if (!box) return;
    box.textContent = message; box.classList.add('visible');
    clearTimeout(toastTimeout); toastTimeout = setTimeout(() => box.classList.remove('visible'), 2200);
  }
  function scale() {
    if (presenter) { scalePreviews(); return; }
    document.getElementById('stage').style.transform = `scale(${Math.min(innerWidth / 1920, innerHeight / 1080)})`;
  }
  function validSlide(n) { return Math.max(1, Math.min(slides.length, Number(n) || 1)); }
  function isHidden(n) { return state.hidden.includes(n); }
  function visibleSlides() { return slides.map(s => +s.dataset.slide).filter(n => !isHidden(n)); }
  function nextPosition(from=state, direction=1) {
    if (direction > 0 && from.step < maxSteps[from.slide]) return { slide: from.slide, step: from.step + 1 };
    if (direction < 0 && from.step > 0) return { slide: from.slide, step: from.step - 1 };
    let n = from.slide + direction;
    while (n >= 1 && n <= slides.length && isHidden(n)) n += direction;
    if (n < 1 || n > slides.length) return { slide: from.slide, step: from.step };
    return { slide: n, step: direction > 0 ? 0 : maxSteps[n] };
  }
  function revealStates(slide, step, animate) {
    slide.dataset.currentStep = step;
    slide.querySelectorAll('[data-step], [data-only]').forEach(el => {
      const show = (el.hasAttribute('data-only') ? Number(el.dataset.only) === step : Number(el.dataset.step) <= step) && (!el.hasAttribute('data-until') || step <= Number(el.dataset.until));
      const wasVisible = el.dataset.visible === 'true';
      el.dataset.visible = show ? 'true' : 'false';
      if (show && !wasVisible && !el.hasAttribute('data-until') && animate && !reduced() && !['7','8'].includes(slide.dataset.slide) && !el.closest('.media')) {
        el.classList.remove('revealing');
        // SVG groups animate opacity/rise without transforming the SVG canvas.
        void el.getBoundingClientRect(); el.classList.add('revealing');
        el.addEventListener('animationend', () => el.classList.remove('revealing'), { once: true });
      } else if (!show) el.classList.remove('revealing');
    });
  }
  function numbers(slide) {
    if(slide.dataset.slide==='7')return;
    slide.querySelectorAll('[data-count]').forEach(el => {
      if (counted.has(el)) return;
      const parent = el.closest('[data-visible]');
      if (parent && parent.dataset.visible !== 'true') return;
      counted.add(el);
      const final = Number(el.dataset.count), suffix = el.dataset.suffix || '';
      const exact = el.dataset.final || `${final}${suffix}`;
      const decimals=(el.dataset.count.split('.')[1]||'').length;
      if (reduced()) { el.textContent = exact; return; }
      el.textContent = `${(0).toFixed(decimals)}${suffix}`;
      const begin = performance.now();
      const tick = now => {
        const progress = Math.min(1, (now - begin) / 600);
        el.textContent = `${(final * (1 - Math.pow(1 - progress, 3))).toFixed(decimals).replace('-',exact.startsWith('−')?'−':'-')}${suffix}`;
        if (progress < 1) requestAnimationFrame(tick); else el.textContent = exact;
      };
      requestAnimationFrame(tick);
    });
  }
  function posterize(container) {
    container.querySelectorAll('video').forEach(video => {
      video.pause();
      if (!video.parentNode.querySelector('.poster')) {
        const img = document.createElement('img');
        img.className = 'poster'; img.src = video.getAttribute('poster'); img.alt = '';
        video.parentNode.append(img);
      }
      video.style.visibility = 'hidden';
    });
  }
  function updateVideos(slide) {
    const wanted = new Set([...slide.querySelectorAll('video')].filter(v => +v.dataset.videoStep <= state.step && !v.closest('[data-visible="false"]')));
    for (const video of activeVideos) {
      if (!wanted.has(video)) {
        video.pause(); videoStarts.set(video, (videoStarts.get(video) || 0) + 1); activeVideos.delete(video);
      }
    }
    if (rendering || preview) { posterize(slide); return; }
    const grouped=[...wanted].filter(v=>v.dataset.syncGroup==='tasks');
    window.TASK_VIDEO_SYNC.start(grouped);
    grouped.forEach(v=>activeVideos.add(v));
    for (const video of wanted) {
      if (activeVideos.has(video)) continue;
      activeVideos.add(video);
      const token = (videoStarts.get(video) || 0) + 1; videoStarts.set(video, token);
      video.muted = true; video.loop = true; video.currentTime = 0;
      // load() restores the poster and discards any old decoded frame on re-entry.
      video.load();
      const start = () => {
        if (videoStarts.get(video) !== token || !activeVideos.has(video)) return;
        video.currentTime = 0;
        video.playbackRate = Number(video.dataset.playbackRate || 1);
        video.play().catch(() => toast('Video paused — press V to play'));
      };
      requestAnimationFrame(() => requestAnimationFrame(start));
    }
  }
  function apply(animate=true) {
    state.slide = validSlide(state.slide);
    state.step = Math.max(0, Math.min(maxSteps[state.slide], Number(state.step) || 0));
    root.dataset.theme = state.theme;
    if (presenter) { renderPresenter(); return; }
    slides.forEach(slide => {
      const active = +slide.dataset.slide === state.slide;
      slide.classList.toggle('active', active);
      slide.setAttribute('aria-hidden', String(!active));
      if (active) { revealStates(slide, state.step, animate); numbers(slide); }
    });
    updateVideos(slides[state.slide - 1]);
    window.DECK_MOTION?.apply(slides[state.slide - 1],state.step,reduced());
    scale();
    document.title = `${state.slide} · ${titleOf(state.slide)} — CoRL 2026`;
  }
  function dispatch(message) {
    const packet = { ...message, sender, id: `${sender}:${Date.now()}:${Math.random()}` };
    channel?.postMessage(packet); safeWrite(storeKey + ':event', packet);
    // file:// support differs between Chromium releases; an opener bridge preserves sync.
    if (presenter && window.opener && !window.opener.closed) window.opener.postMessage(packet, '*');
    if (!presenter && presenterWindow && !presenterWindow.closed) presenterWindow.postMessage(packet, '*');
  }
  function publish() {
    state.revision = Date.now();
    safeWrite(storeKey + ':state', state); safeWrite(storeKey + ':hidden', state.hidden);
    dispatch({ type: 'state', state });
  }
  function action(command, payload={}) {
    if (presenter) { dispatch({ type: 'command', command, payload }); return; }
    if (command === 'next' || command === 'back') {
      const pos = nextPosition(state, command === 'next' ? 1 : -1);
      if (command === 'next' && (pos.slide !== state.slide || pos.step !== state.step) && state.startedAt === null) state.startedAt = Date.now();
      Object.assign(state, pos);
    } else if (command === 'goto') {
      state.slide = validSlide(payload.slide); state.step = payload.step || 0;
    } else if (command === 'theme') {
      state.theme = payload.theme || (state.theme === 'light' ? 'dark' : 'light');
    } else if (command === 'hidden') {
      const n = validSlide(payload.slide || state.slide);
      if (isHidden(n)) state.hidden = state.hidden.filter(x => x !== n);
      else if (visibleSlides().length > 1) state.hidden.push(n);
      else { toast('Keep at least one slide visible'); return; }
      toast(`Slide ${n} ${isHidden(n) ? 'hidden' : 'visible'} — H toggles; P shows all slides`);
    } else if (command === 'reset') {
      state.startedAt = null; toast('Timer reset — starts on next advance');
    } else if (command === 'video') {
      const vids = [...activeVideos]; const shouldPlay = vids.some(v => v.paused);
      for (const v of vids) shouldPlay ? v.play().catch(() => {}) : v.pause();
    } else if (command === 'sync') { publish(); return; }
    apply(); publish();
  }
  const seen = new Set();
  function receive(packet) {
    if (!packet || packet.sender === sender || !packet.id || seen.has(packet.id)) return;
    seen.add(packet.id); if (seen.size > 1000) seen.delete(seen.values().next().value);
    if (packet.type === 'command' && !presenter) action(packet.command, packet.payload);
    if (packet.type === 'state' && presenter) {
      if ((packet.state.revision || 0) < state.revision) return;
      state = { ...packet.state }; apply(false);
    }
  }
  if (channel) channel.onmessage = e => receive(e.data);
  window.addEventListener('storage', e => { if (e.key === storeKey + ':event' && e.newValue) { try { receive(JSON.parse(e.newValue)); } catch {} } });
  window.addEventListener('message', e => {
    if (e.source === window.opener || e.source === presenterWindow) receive(e.data);
  });
  function openPresenter() {
    if (presenter) return;
    if (!hasNotes) { toast('Speaker notes are not available here'); return; }
    const url = new URL(location.href); url.search = ''; url.searchParams.set('presenter','1');
    presenterWindow = window.open(url.href, 'corl2026-presenter', 'width=1500,height=1000');
    if (!presenterWindow) toast('Allow this local file to open the presenter window');
    else publish();
  }
  function keyboard(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    const key = event.key.toLowerCase();
    const map = { arrowright:'next',' ':'next',pagedown:'next',arrowleft:'back',pageup:'back',h:'hidden',t:'theme',r:'reset',v:'video' };
    if (map[key]) { event.preventDefault(); action(map[key]); }
    else if (key === 'p') { event.preventDefault(); openPresenter(); }
    else if (key === 'f') {
      event.preventDefault();
      if (document.fullscreenElement) document.exitFullscreen(); else root.requestFullscreen().catch(() => toast('Fullscreen unavailable'));
    } else if (key === 'home') { event.preventDefault(); action('goto', { slide: visibleSlides()[0], step:0 }); }
    else if (key === 'end') { event.preventDefault(); const n=visibleSlides().at(-1); action('goto',{slide:n,step:maxSteps[n]}); }
  }
  function escapeHTML(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function inline(s) {
    return escapeHTML(s).replace(/`\[click\]`|\[click\]/g, '<span class="click-marker">[click]</span>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');
  }
  function markdown(s) {
    const lines=s.split('\n'); let out='', table=false, list=false;
    for (const raw of lines) {
      const l=raw.trim();
      if (l.startsWith('|')) {
        if (!table) { out+='<table>'; table=true; }
        if (/^\|[-\s:|]+\|$/.test(l)) continue;
        out+='<tr>'+l.slice(1,-1).split('|').map(c=>`<td>${inline(c.trim())}</td>`).join('')+'</tr>';continue;
      }
      if (table) {out+='</table>';table=false;}
      if (l.startsWith('- ')) {if(!list){out+='<ul>';list=true;}out+=`<li>${inline(l.slice(2))}</li>`;continue;}
      if(list){out+='</ul>';list=false;}
      if(l)out+=`<p>${inline(l)}</p>`;
    }
    return out+(table?'</table>':'')+(list?'</ul>':'');
  }
  function setupPresenter() {
    root.classList.add('presenter-root');
    document.body.classList.add('presenter');
    const n=window.DECK_NOTES;
    document.body.innerHTML=`<div class="presenter-shell"><div class="presenter-main"><div class="presenter-toolbar"><button data-command="back">← Back</button><button data-command="next">Next →</button><button data-command="hidden">H · Hide / show</button><button data-command="theme">T · Theme</button><button data-command="reset">R · Reset</button><div class="presenter-time"><div>Elapsed<strong id="elapsed">00:00</strong></div><div>Target<strong id="target"></strong></div><div>Full clock<strong id="clock-target"></strong></div></div></div><div class="preview-grid"><div><div class="preview-heading"><span id="current-label">Current</span><span id="hidden-status"></span></div><div id="current-preview" class="preview-container"></div></div><div><div class="preview-heading">Next build / slide</div><div id="next-preview" class="preview-container"></div></div></div><div class="slide-strip" id="slide-strip"></div><h2 class="notes-title" id="notes-title"></h2><div class="notes-meta" id="notes-meta"></div><div class="notes-body" id="notes-body"></div></div><aside class="presenter-aside"><h2>Checkpoints</h2>${markdown(n.panels['Checkpoints (presenter timer)'])}<h2>Cut plan</h2>${markdown(n.panels['Cut plan'])}<details><summary>Timing summary</summary>${markdown(n.panels['Timing summary'])}</details><details><summary>Rehearsal plan</summary>${markdown(n.panels['Rehearsal plan (talk is Thu Nov 12)'])}</details><div class="presenter-keys">→ / Space / PageDown: next<br>← / PageUp: back · H: hide/show<br>T: theme · R: reset timer · V: video<br>Click a slide number to inspect or unhide it.</div></aside></div>`;
    document.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.command)));
    const cached=safeRead(storeKey+':state',null);if(cached)state=cached;
    setInterval(updateTimer,250);
    dispatch({type:'command',command:'sync',payload:{}});
  }
  function previewSlide(container,n,step) {
    if(container.dataset.position===`${n}:${step}:${state.theme}`)return;
    container.dataset.position=`${n}:${step}:${state.theme}`;
    const clone=slides[n-1].cloneNode(true); clone.classList.add('active');
    clone.removeAttribute('id'); clone.querySelectorAll('[id]').forEach(e=>{
      // Keep SVG marker URLs paired when several diagram previews coexist.
      const id=e.id;const prefix=container.id+'-';e.id=prefix+id;
      clone.querySelectorAll('*').forEach(node=>{
        for(const a of [...node.attributes])if(a.value.includes(`url(#${id})`))node.setAttribute(a.name,a.value.replaceAll(`url(#${id})`,`url(#${prefix}${id})`));
      });
    });
    revealStates(clone,step,false);posterize(clone);window.DECK_MOTION?.settleClone(clone);
    clone.querySelectorAll('[data-count]').forEach(e=>e.textContent=e.dataset.final||e.dataset.count+(e.dataset.suffix||''));
    container.replaceChildren(clone);scalePreviews();
  }
  function scalePreviews() {
    document.querySelectorAll('.preview-container').forEach(c=>{if(c.firstElementChild)c.firstElementChild.style.transform=`scale(${c.clientWidth/1920})`;});
  }
  function renderPresenter() {
    if(!document.getElementById('notes-body'))return;
    const note=window.DECK_NOTES.slides[state.slide];
    document.getElementById('current-label').textContent=`Current · ${state.slide} / ${slides.length} · build ${state.step} / ${maxSteps[state.slide]}`;
    document.getElementById('hidden-status').textContent=isHidden(state.slide)?'HIDDEN':'';
    document.getElementById('current-preview').classList.toggle('hidden-slide',isHidden(state.slide));
    previewSlide(document.getElementById('current-preview'),state.slide,state.step);
    const next=nextPosition();previewSlide(document.getElementById('next-preview'),next.slide,next.step);
    document.getElementById('target').textContent=note.target;
    document.getElementById('clock-target').textContent=note.clock;
    document.getElementById('notes-title').textContent=`${state.slide} · ${note.title}`;
    document.getElementById('notes-meta').textContent=`Target ${note.target} · clock ${note.clock}${note.tags?' · '+note.tags:''}`;
    document.getElementById('notes-body').innerHTML=markdown(note.markdown);
    const strip=document.getElementById('slide-strip');strip.innerHTML='';
    for(const slide of slides){const n=+slide.dataset.slide;const b=document.createElement('button');b.textContent=n;b.title=titleOf(n);b.className=`${isHidden(n)?'is-hidden ':''}${n===state.slide?'is-current':''}`;b.addEventListener('click',()=>action('goto',{slide:n,step:0}));strip.append(b);}
    updateTimer();
  }
  function updateTimer(){const e=document.getElementById('elapsed');if(e){const seconds=state.startedAt===null?0:Math.max(0,Math.floor((Date.now()-state.startedAt)/1000));e.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}}

  document.body.classList.toggle('render-mode',rendering);document.body.classList.toggle('preview-mode',preview);
  if(presenter&&!hasNotes){location.replace(location.pathname);return;}
  if(presenter)setupPresenter();
  else if(!rendering&&!preview&&isHidden(state.slide)){state.slide=visibleSlides()[0];state.step=0;}
  addEventListener('keydown',keyboard);addEventListener('resize',scale);
  window.DECK_API={
    getState:()=>JSON.parse(JSON.stringify(state)),
    goTo:(slide,step=0)=>action('goto',{slide,step}),advance:()=>action('next'),back:()=>action('back'),
    toggleHidden:(slide)=>action('hidden',{slide}),setTheme:theme=>action('theme',{theme}),
    resetTimer:()=>action('reset'),openPresenter,visibleSlides,slideBuilds:()=>({...maxSteps}),
    settle:async()=>{await Promise.all([document.fonts.load('400 30px Geist'),document.fonts.load('600 70px Geist'),document.fonts.load('400 20px "Geist Mono"')]);await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}
  };
  apply(false);if(!presenter&&!preview&&!rendering)publish();
})();
