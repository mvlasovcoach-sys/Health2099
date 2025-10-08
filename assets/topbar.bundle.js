/*
Health2099 — Top Bar (Energy + SRV + Device)
Один JS‑файл для GitHub Pages. Подключи на каждой странице:

  <script src="/Health2099/assets/topbar.bundle.js" defer></script>

Панель сама вставится в начало <body>. API доступен как window.H2099TopBar
*/
(function(){
  const css = `:root{--bg:#0b1020;--panel:#101833;--border:rgba(255,255,255,.08);--text:#e7ecff;--muted:rgba(231,236,255,.6);--primary:#1f6eff;--accent:#ffa62b;--c-green:#22c55e;--c-yellow:#facc15;--c-red:#ef4444;--c-burgundy:#7f1d1d;--radius:18px;--shadow:0 8px 30px rgba(0,0,0,.35);} .h2099-topbar{position:sticky;top:0;z-index:999;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02));backdrop-filter:blur(8px);border-bottom:1px solid var(--border);} .h2099-wrap{max-width:1200px;margin:0 auto;padding:12px 16px;display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:12px;color:var(--text);font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif} .card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:14px;display:flex;align-items:center;gap:12px} .gauge{position:relative;width:120px;height:120px;display:grid;place-items:center} .gauge svg{transform:rotate(-90deg)} .gauge .value{position:absolute;font-weight:800;font-size:30px;letter-spacing:.5px} .g-meta{display:flex;flex-direction:column;gap:6px} .g-title{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)} .g-delta{font-size:13px} .delta-pos{color:var(--c-green)} .delta-neg{color:var(--c-red)} .quality{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--muted)} .q-dot{width:8px;height:8px;border-radius:50%;background:var(--muted);opacity:.7} .q-auto .q-dot{background:var(--primary)} .q-manual .q-dot{background:var(--accent)} .q-timeout .q-dot{background:var(--c-yellow)} .device{display:flex;flex-wrap:wrap;gap:8px} .pill{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;border:1px solid var(--border);background:rgba(255,255,255,.03);font-size:13px} .online{background:rgba(34,197,94,.12);color:var(--c-green);border-color:rgba(34,197,94,.25)} .warn{background:rgba(250,204,21,.12);color:var(--c-yellow);border-color:rgba(250,204,21,.25)} .down{background:rgba(239,68,68,.12);color:var(--c-red);border-color:rgba(239,68,68,.25)} .manual{background:rgba(255,166,43,.12);color:var(--accent);border-color:rgba(255,166,43,.25)} .sync-btn{margin-left:auto;padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:linear-gradient(135deg,rgba(31,110,255,.25),rgba(31,110,255,.12));color:#cfe0ff;cursor:pointer} .sync-btn:hover{filter:brightness(1.08)} @media(max-width:980px){.h2099-wrap{grid-template-columns:1fr;}}`;
  const html = `\n<div class="h2099-topbar">\n  <div class="h2099-wrap">\n    <div class="card" id="card-energy">\n      <div class="gauge" data-kind="energy">\n        <svg width="120" height="120" viewBox="0 0 120 120">\n          <circle cx="60" cy="60" r="50" stroke="rgba(255,255,255,.08)" stroke-width="16" fill="none"/>\n          <circle class="ring-bg" cx="60" cy="60" r="50" stroke="rgba(31,110,255,.25)" stroke-width="16" fill="none" stroke-linecap="round"/>\n          <circle class="ring-val" cx="60" cy="60" r="50" stroke="var(--primary)" stroke-width="16" fill="none" stroke-linecap="round" stroke-dasharray="0 999"/>\n        </svg>\n        <div class="value" id="energy-value">70</div>\n      </div>\n      <div class="g-meta">\n        <div class="g-title">ENERGY</div>\n        <div class="g-delta" id="energy-delta">Δ 15m · <span class="delta-pos">+4</span></div>\n        <div class="quality q-auto" id="energy-quality"><span class="q-dot"></span><span class="q-dot"></span><span class="q-dot"></span> Auto</div>\n      </div>\n    </div>\n    <div class="card" id="card-srv">\n      <div class="gauge" data-kind="srv">\n        <svg width="120" height="120" viewBox="0 0 120 120">\n          <circle cx="60" cy="60" r="50" stroke="rgba(255,255,255,.08)" stroke-width="16" fill="none"/>\n          <circle class="ring-bg" cx="60" cy="60" r="50" stroke="rgba(255,166,43,.25)" stroke-width="16" fill="none" stroke-linecap="round"/>\n          <circle class="ring-val" cx="60" cy="60" r="50" stroke="var(--accent)" stroke-width="16" fill="none" stroke-linecap="round" stroke-dasharray="0 999"/>\n        </svg>\n        <div class="value" id="srv-value">53</div>\n      </div>\n      <div class="g-meta">\n        <div class="g-title">SRV (STRESS)</div>\n        <div class="g-delta" id="srv-delta">Δ 15m · <span class="delta-neg">-1</span></div>\n        <div class="quality q-manual" id="srv-quality"><span class="q-dot"></span><span class="q-dot"></span><span class="q-dot"></span> Manual</div>\n      </div>\n    </div>\n    <div class="card" id="card-device" style="align-items:flex-start;">\n      <div class="g-meta" style="gap:10px;flex:1">\n        <div class="g-title">DEVICE STATUS</div>\n        <div class="device" id="device-pills"></div>\n      </div>\n      <button class="sync-btn" id="syncBtn">Sync</button>\n    </div>\n  </div>\n</div>`;

  function inject(){
    const style=document.createElement('style'); style.textContent=css; document.head.appendChild(style);
    const wrap=document.createElement('div'); wrap.innerHTML=html; document.body.insertBefore(wrap.firstChild, document.body.firstChild);
  }

  const TAU=Math.PI*2, R=50, CIRC=TAU*R;
  function setRing(el,v){v=Math.max(0,Math.min(100, v|0)); const dash=(v/100)*CIRC; el.setAttribute('stroke-dasharray', `${dash} ${CIRC}`);}
  function setDelta(el,minutes,delta){ const sign=delta>0?'+':''; const cls=delta>=0?'delta-pos':'delta-neg'; el.innerHTML=`Δ ${minutes}m · <span class="${cls}">${sign}${delta}</span>`;}
  function setQuality(el,mode){ el.classList.remove('q-auto','q-manual','q-timeout'); const map={auto:'q-auto', manual:'q-manual', timeout:'q-timeout'}; el.classList.add(map[mode]||'q-auto'); el.lastChild && (el.lastChild.textContent=' '+mode.charAt(0).toUpperCase()+mode.slice(1)); }

  function renderDevice({minutesSince,lastBattery,source}){
    const pillsWrap=document.getElementById('device-pills'); if(!pillsWrap) return; pillsWrap.innerHTML='';
    const pill=(txt,cls)=>{const span=document.createElement('span'); span.className='pill '+cls; span.textContent=txt; return span};
    let cls='online', label='Online <5 min';
    if(minutesSince>=10){cls='down'; label='Offline 10+ min'} else if(minutesSince>=5){cls='warn'; label='Offline 5–10 min'}
    pillsWrap.appendChild(pill(label, cls));
    if(typeof lastBattery==='number') pillsWrap.appendChild(pill(`Battery: ${lastBattery}%`, ''));
    const srcMap={manual:'manual',auto:'online',timeout:'warn'}; const srcLbl={manual:'Manual',auto:'Auto',timeout:'Timeout'};
    pillsWrap.appendChild(pill(srcLbl[source]||'Auto', srcMap[source]||'online'));
  }

  function initAPI(){
    const energyRing=document.querySelector('#card-energy .ring-val');
    const energyVal=document.getElementById('energy-value');
    const energyDelta=document.getElementById('energy-delta');
    const energyQual=document.getElementById('energy-quality');
    const srvRing=document.querySelector('#card-srv .ring-val');
    const srvVal=document.getElementById('srv-value');
    const srvDelta=document.getElementById('srv-delta');
    const srvQual=document.getElementById('srv-quality');
    const syncBtn=document.getElementById('syncBtn');

    window.H2099TopBar={
      setEnergy({value,minutes=15,delta=0,quality='auto'}){ energyVal.textContent=Math.round(value); setRing(energyRing,value); setDelta(energyDelta,minutes,delta); setQuality(energyQual,quality); localStorage.setItem('h2099_energy', JSON.stringify({value,minutes,delta,quality,ts:Date.now()})); },
      setSRV({value,minutes=15,delta=0,quality='manual'}){ srvVal.textContent=Math.round(value); setRing(srvRing,value); setDelta(srvDelta,minutes,delta); setQuality(srvQual,quality); localStorage.setItem('h2099_srv', JSON.stringify({value,minutes,delta,quality,ts:Date.now()})); },
      setDevice({minutesSince=0,battery=82,source='auto'}){ renderDevice({minutesSince,lastBattery:battery,source}); localStorage.setItem('h2099_device', JSON.stringify({minutesSince,battery,source,ts:Date.now()})); },
      applyEvent(evt){ try{ const e=JSON.parse(localStorage.getItem('h2099_energy')||'{}'); const s=JSON.parse(localStorage.getItem('h2099_srv')||'{}'); if(evt.type==='water'){ e.value=Math.min(100,(e.value||70)+1); s.value=Math.max(0,(s.value||53)-.5);} if(evt.type==='coffee'){ s.value=Math.min(100,(s.value||53)+1);} if(evt.type==='walk'){ e.value=Math.min(100,(e.value||70)+2); s.value=Math.max(0,(s.value||53)-1);} if(evt.type==='measurement' && typeof evt.energy==='number'){ e.value=evt.energy;} this.setEnergy({value:e.value||70,delta:0,minutes:15,quality:'auto'}); this.setSRV({value:s.value||53,delta:0,minutes:15,quality:'auto'});}catch(err){console.warn(err)} }
    };

    const e=JSON.parse(localStorage.getItem('h2099_energy')||'{"value":70,"minutes":15,"delta":4,"quality":"auto"}');
    const s=JSON.parse(localStorage.getItem('h2099_srv')||'{"value":53,"minutes":15,"delta":-1,"quality":"manual"}');
    const d=JSON.parse(localStorage.getItem('h2099_device')||'{"minutesSince":12,"battery":82,"source":"manual"}');
    window.H2099TopBar.setEnergy(e); window.H2099TopBar.setSRV(s); window.H2099TopBar.setDevice(d);

    syncBtn && syncBtn.addEventListener('click',()=>{ const d=JSON.parse(localStorage.getItem('h2099_device')||'{}'); d.minutesSince=0; d.source='auto'; window.H2099TopBar.setDevice(d); });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{inject(); initAPI();}); else {inject(); initAPI();}
})();
