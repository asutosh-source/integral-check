/* ---------- UI ---------- */
const GRADES = [['','Not graded',''],['A','Valid answer','Value matches and every step is justified.'],['B','Right answer, invalid reasoning','Value matches, but a step is false, unjustified or cancels an earlier error.'],
  ['C','Wrong value','Value does not match; the working has an algebra or calculus error.'],['D','Illegal move','Unjustified interchange of limit and integral, ignored convergence or branch, or an invalid substitution.'],
  ['E','Invented result','Cites an identity or theorem that does not hold or does not exist.'],['F','False "no closed form"','Declines or claims none exists when one does.']];
const $ = id => document.getElementById(id);
const fmt = v => { if (!Number.isFinite(v)) return String(v); const a = Math.abs(v); if (a !== 0 && (a < 1e-4 || a >= 1e7)) return v.toExponential(10); return String(Number(v.toPrecision(13))); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* tabs */
function showTab(name){
  for (const t of ['check','benchmark','method']) { $('panel-'+t).hidden = t !== name; $('tab-'+t).setAttribute('aria-selected', String(t === name)); }
  try { if (!location.hash.startsWith('#problem=')) history.replaceState(null,'','#'+name); } catch(e) {}
}
document.querySelectorAll('nav button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

/* check tab */
function pill(v){ const label=v==='NUMERICAL_MATCH'?'NUMERICAL MATCH':v; const cls=v==='NUMERICAL_MATCH'?'MATCH':v; return '<span class="pill '+(cls||'none')+'">'+(label||'—')+'</span>'; }
function drawIntegrand(){
  const canvas=$('integrand-plot'); if(!canvas)return;
  const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;ctx.clearRect(0,0,W,H);
  let a,b,f;try{a=evalConst($('c-a').value);b=evalConst($('c-b').value);f=compileF($('c-f').value);}catch(e){ctx.fillText('Enter a valid integrand and bounds.',16,28);return;}
  ctx.fillStyle=getComputedStyle(document.body).color;ctx.font='14px sans-serif';
  if(!Number.isFinite(a)||!Number.isFinite(b)||a>=b){ctx.fillText('Enter finite bounds with lower < upper to plot.',16,28);return;}
  const vals=[];for(let i=0;i<=500;i++){const x=a+(b-a)*i/500;let y;try{y=f(x)}catch(e){y=NaN}vals.push({x,y});}
  const finite=vals.filter(v=>Number.isFinite(v.y)&&Math.abs(v.y)<1e6).map(v=>v.y);
  if(!finite.length){ctx.fillText('No finite samples; possible singularity or domain error.',16,28);return;}
  let ymin=Math.min(...finite),ymax=Math.max(...finite);if(ymin===ymax){ymin-=1;ymax+=1;}const pad=(ymax-ymin)*.08;ymin-=pad;ymax+=pad;
  const X=x=>40+(x-a)/(b-a)*(W-55),Y=y=>H-28-(y-ymin)/(ymax-ymin)*(H-48);
  ctx.strokeStyle='rgba(128,128,128,.5)';ctx.beginPath();ctx.moveTo(40,12);ctx.lineTo(40,H-28);ctx.lineTo(W-12,H-28);ctx.stroke();
  if(ymin<0&&ymax>0){ctx.beginPath();ctx.moveTo(40,Y(0));ctx.lineTo(W-12,Y(0));ctx.stroke();}
  ctx.strokeStyle='#e8a33d';ctx.lineWidth=2;ctx.beginPath();let active=false;
  for(const v of vals){if(!Number.isFinite(v.y)||Math.abs(v.y)>=1e6){active=false;continue;}if(!active){ctx.moveTo(X(v.x),Y(v.y));active=true;}else ctx.lineTo(X(v.x),Y(v.y));}ctx.stroke();
}
function runCheck(){
  const out = $('check-result');
  try {
    const r = checkClaim($('c-f').value, $('c-a').value, $('c-b').value, $('c-claim').value, parseFloat($('c-tol').value), $('c-splits').value.split(',').map(v=>v.trim()).filter(Boolean));
    const msg = r.verdict === 'INCONCLUSIVE' ? 'The difference is smaller than the numerical error, so this cannot be called a match or a mismatch.' : r.verdict === 'DIVERGENT' ? 'A known non-integrable singularity was detected. This is a diagnostic, not a general divergence proof.' : r.verdict === 'ERROR' ? 'The integrand or claim could not be evaluated safely. Check for singularities or domain errors.' : r.verdict === 'NUMERICAL_MATCH' ? 'The claimed value agrees numerically within tolerance. This is not a proof of an identity or of valid reasoning.' : 'The claimed value differs from the numerical integral.';
    out.innerHTML = '<div class="row">'+pill(r.verdict)+'<span class="note">'+esc(msg)+'</span></div>'+
      '<p class="note"><b>Method:</b> '+esc(r.method||'numerical integration')+'. '+esc(r.diagnostics||'')+'</p>'+
      '<dl><div><dt>Numerical integral</dt><dd>'+fmt(r.value)+'</dd></div><div><dt>Estimated numerical error (heuristic)</dt><dd>'+Number(r.err).toExponential(1)+'</dd></div>'+
      '<div><dt>Claimed value</dt><dd>'+fmt(r.claim)+'</dd></div><div><dt>Relative difference</dt><dd>'+r.rel.toExponential(2)+'</dd></div></dl>';
  } catch(e) { out.innerHTML = '<div class="row">'+pill('ERROR')+'<span>'+esc(e.message)+'</span></div><p class="note">Check the syntax. The Method tab lists what is accepted.</p>'; }
}
const oldRunCheck=runCheck; runCheck=function(){oldRunCheck();try{drawIntegrand();}catch(e){}};
$('check-form').addEventListener('submit', e => { e.preventDefault(); runCheck(); });
const EXAMPLES = [['x e^x on [0,1], answer 1','x e^x','0','1','1'],['x e^x on [0,1], answer e − 1','x e^x','0','1','e-1'],['exp(−x²) on [0,∞), answer √π/2','exp(-x^2)','0','inf','√π/2'],
  ['x/(eˣ−1) on [0,∞), answer π²/3','x/(exp(x)-1)','0','inf','pi^2/3'],['ln(1+x)/(1+x²) on [0,1], answer π ln 2 / 8','ln(1+x)/(1+x^2)','0','1','π ln 2 / 8'],['1/(1+x²) on (−∞,∞), answer π','1/(1+x^2)','-inf','inf','pi']];
EXAMPLES.forEach(ex => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = ex[0];
  b.addEventListener('click', () => { $('c-f').value = ex[1]; $('c-a').value = ex[2]; $('c-b').value = ex[3]; $('c-claim').value = ex[4]; runCheck(); }); $('chips').appendChild(b); });
const SELF = [['x e^x','0','1','1','e-1'],['sin(x)^2','0','pi','pi/2','pi'],['ln x','0','1','-1','1'],['exp(-x^2)','0','inf','√π/2','√π'],['x^2/(1+x^2)','0','1','1-π/4','π/4'],
  ['ln(sin x)','0','π/2','-π ln 2 / 2','-π ln 2'],['ln(1+x)/(1+x^2)','0','1','π ln 2 / 8','π ln 2 / 4'],['x/(exp(x)-1)','0','∞','π^2/6','π^2/3'],['ln(x)/(1-x)','0','1','-π^2/6','π^2/6'],
  ['1/(1+x^2)','-inf','inf','pi','pi/2'],['x^2 exp(-x)','0','inf','gamma(3)','gamma(2)'],['sin^2 x','0','pi','π/2','π'],['1/sqrt(x)','0','1','2','1']];
$('run-self').addEventListener('click', () => {
  let ok = 0, rows = '';
  for (const [f,a,b,g,w] of SELF) { const r1 = checkClaim(f,a,b,g,1e-8), r2 = checkClaim(f,a,b,w,1e-8); ok += (r1.verdict==='NUMERICAL_MATCH') + (r2.verdict==='MISMATCH');
    rows += '<tr><td class="num">'+esc(f)+'</td><td class="num">['+esc(a)+', '+esc(b)+']</td><td class="num">'+fmt(r1.value)+'</td><td>'+esc(g)+' '+pill(r1.verdict)+'</td><td>'+esc(w)+' '+pill(r2.verdict)+'</td></tr>'; }
  $('self-out').innerHTML = '<p><b>'+ok+' of '+SELF.length*2+'</b> verdicts as expected (right claim should match, wrong claim should not).</p><div class="scroll"><table><thead><tr><th>Integrand</th><th>Bounds</th><th>Numerical value</th><th>Right claim</th><th>Wrong claim</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
});
$('rubric').innerHTML = GRADES.slice(1).map(g => '<tr><td class="num">'+g[0]+'</td><td>'+esc(g[1])+'</td><td>'+esc(g[2])+'</td></tr>').join('');

/* benchmark state */
const KEY = 'integralcheck.v1';
function demoState(){ return { demo:true, names:['System A','System B'], tol:1e-8, nextId:7, problems:[
  {id:1,half:'standard',f:'x e^x',a:'0',b:'1',claims:['1','e-1'],grades:['A','C']},
  {id:2,half:'standard',f:'sin(x)^2',a:'0',b:'pi',claims:['pi/2','pi/2'],grades:['A','A']},
  {id:3,half:'standard',f:'x^2/(1+x^2)',a:'0',b:'1',claims:['1-π/4','1-π/4'],grades:['A','B']},
  {id:4,half:'awkward',f:'ln(sin x)',a:'0',b:'π/2',claims:['-π ln 2 / 2','-π ln 2'],grades:['B','C']},
  {id:5,half:'awkward',f:'ln(1+x)/(1+x^2)',a:'0',b:'1',claims:['π ln 2 / 4','π ln 2 / 8'],grades:['C','A']},
  {id:6,half:'awkward',f:'x/(exp(x)-1)',a:'0',b:'inf',claims:['π^2/6','π^2/3'],grades:['A','E']}] }; }
let S; try { S = JSON.parse(localStorage.getItem(KEY)); } catch(e) { S = null; }
if (!S || !Array.isArray(S.problems)) S = demoState();
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e) {} }

const numCache = new Map();
function numeric(p){
  const key = p.f+'|'+p.a+'|'+p.b; if (numCache.has(key)) return numCache.get(key);
  let res; if (!p.f.trim()) res = {empty:true}; else { try { res = integrateExpression(p.f, compileF(p.f), evalConst(p.a), evalConst(p.b)); } catch(e) { res = {error:e.message}; } }
  numCache.set(key, res); return res;
}
function evaluate(p, s){
  const claim = p.claims[s]; if (!claim.trim()) return {verdict:''};
  const n = numeric(p); if (n.empty) return {verdict:'', note:'Enter the integrand first.'}; if (n.error) return {verdict:'ERROR', note:n.error};
  try { const j = judge(n, evalConst(claim), S.tol); return {verdict:j.verdict, rel:j.rel}; } catch(e) { return {verdict:'ERROR', note:e.message}; }
}

/* summary */
function stat(k, n){ if (!n) return '<td class="num">—</td><td class="num">—</td><td></td>'; const [lo,hi] = wilson(k,n), p = k/n;
  return '<td class="num">'+k+' / '+n+'</td><td class="num">'+Math.round(100*p)+'% <span class="note">('+Math.round(100*lo)+'–'+Math.round(100*hi)+')</span></td><td><div class="track" role="img" aria-label="95% interval '+Math.round(100*lo)+' to '+Math.round(100*hi)+' percent"><div class="range" style="left:'+100*lo+'%;width:'+100*(hi-lo)+'%"></div><div class="dot" style="left:calc('+100*p+'% - 1px)"></div></div></td>'; }
function renderSummary(){
  let html = '';
  for (let s = 0; s < 2; s++) {
    const ev = S.problems.map(p => ({p, e:evaluate(p, s), g:p.grades[s]}));
    const half = h => { const rows = ev.filter(x => x.p.half === h && x.e.verdict); return [rows.filter(x => x.e.verdict === 'NUMERICAL_MATCH').length, rows.length]; };
    const [ks,ns] = half('standard'), [ka,na] = half('awkward'), kt = ks+ka, nt = ns+na;
    const matched = ev.filter(x => x.e.verdict === 'NUMERICAL_MATCH' && x.g); const bN = matched.filter(x => x.g === 'B').length;
    const counts = 'ABCDEF'.split('').map(c => '<span class="cat">'+c+' <b>'+ev.filter(x => x.g === c).length+'</b></span>').join('');
    html += '<div class="card"><h2>'+esc(S.names[s] || 'System '+(s+1))+'</h2><div class="scroll"><table><thead><tr><th>Half</th><th>Correct</th><th>Accuracy (95% interval)</th><th style="width:34%">Interval</th></tr></thead><tbody>'+
      '<tr><td>Standard</td>'+stat(ks,ns)+'</tr><tr><td>Awkward</td>'+stat(ka,na)+'</tr><tr><td>All</td>'+stat(kt,nt)+'</tr></tbody></table></div>'+
      '<p style="margin:14px 0 6px"><b>Right answer, invalid reasoning:</b> '+(matched.length ? bN+' of '+matched.length+' graded correct answers ('+Math.round(100*bN/matched.length)+'%)' : 'no graded correct answers yet')+'</p>'+
      '<div class="cats" aria-label="Grade counts">'+counts+'</div></div>';
  }
  $('summary').innerHTML = html;
}

/* cards */
function refreshCard(p){
  const root = document.querySelector('[data-pid="'+p.id+'"]'); if (!root) return;
  const n = numeric(p); const nv = root.querySelector('.numval');
  nv.textContent = n.empty ? 'Numerical value: enter an integrand' : n.error ? 'Error: '+n.error : 'Numerical value: '+fmt(n.value);
  for (let s = 0; s < 2; s++) {
    const e = evaluate(p, s), box = root.querySelector('[data-s="'+s+'"]');
    box.querySelector('.vp').innerHTML = pill(e.verdict);
    const g = p.grades[s]; let w = '';
    if (e.verdict === 'MISMATCH' && (g === 'A' || g === 'B')) w = 'Grade '+g+' needs a matching answer.';
    else if (e.verdict === 'DIVERGENT') w = 'A recognized non-integrable singularity was detected; confirm independently for unusual expressions.';
    else if (e.verdict === 'NUMERICAL_MATCH' && ['C','D','E','F'].includes(g)) w = 'Grade '+g+' does not fit a matching answer. Use A or B.';
    else if (e.note) w = e.note;
    box.querySelector('.warn').textContent = w;
  }
}
function makeCard(p){
  const el = document.createElement('div'); el.className = 'card prob'; el.dataset.pid = p.id;
  const names = [0,1].map(s => esc(S.names[s]));
  el.innerHTML = '<div class="top"><label>Half<select id="p'+p.id+'-half"><option value="standard">Standard</option><option value="awkward">Awkward</option></select></label>'+
    '<label class="wide">Integrand f(x)<input id="p'+p.id+'-f" autocomplete="off" spellcheck="false"></label>'+
    '<label>Lower<input id="p'+p.id+'-a" autocomplete="off" spellcheck="false"></label><label>Upper<input id="p'+p.id+'-b" autocomplete="off" spellcheck="false"></label></div>'+
    '<div class="row" style="justify-content:space-between"><span class="note numval"></span><button class="btn ghost small rm" type="button">Remove</button></div>'+
    '<div class="sys">'+[0,1].map(s => '<div class="sbox" data-s="'+s+'"><div class="head"><b class="sname">'+names[s]+'</b><span class="vp"></span></div>'+
      '<label>Claimed answer<input id="p'+p.id+'-c'+s+'" autocomplete="off" spellcheck="false"></label>'+
      '<label>Reasoning grade<select id="p'+p.id+'-g'+s+'">'+GRADES.map(g => '<option value="'+g[0]+'">'+(g[0] ? g[0]+'  '+esc(g[1]) : g[1])+'</option>').join('')+'</select></label><p class="warn"></p></div>').join('')+'</div>';
  const set = (id, v) => { el.querySelector('#'+id).value = v; };
  set('p'+p.id+'-half', p.half); set('p'+p.id+'-f', p.f); set('p'+p.id+'-a', p.a); set('p'+p.id+'-b', p.b);
  for (let s = 0; s < 2; s++) { set('p'+p.id+'-c'+s, p.claims[s]); set('p'+p.id+'-g'+s, p.grades[s]); }
  const upd = () => { refreshCard(p); renderSummary(); save(); };
  el.querySelector('#p'+p.id+'-half').addEventListener('change', e => { p.half = e.target.value; upd(); });
  el.querySelector('#p'+p.id+'-f').addEventListener('input', e => { p.f = e.target.value; upd(); });
  el.querySelector('#p'+p.id+'-a').addEventListener('input', e => { p.a = e.target.value; upd(); });
  el.querySelector('#p'+p.id+'-b').addEventListener('input', e => { p.b = e.target.value; upd(); });
  for (let s = 0; s < 2; s++) {
    el.querySelector('#p'+p.id+'-c'+s).addEventListener('input', e => { p.claims[s] = e.target.value; upd(); });
    el.querySelector('#p'+p.id+'-g'+s).addEventListener('change', e => { p.grades[s] = e.target.value; upd(); });
  }
  el.querySelector('.rm').addEventListener('click', () => { S.problems = S.problems.filter(q => q.id !== p.id); el.remove(); renderSummary(); save(); });
  return el;
}
function renderAll(){
  $('name0').value = S.names[0]; $('name1').value = S.names[1]; $('b-tol').value = String(S.tol);
  $('demo-banner').hidden = !S.demo;
  const box = $('problems'); box.innerHTML = '';
  S.problems.forEach(p => box.appendChild(makeCard(p)));
  S.problems.forEach(refreshCard); renderSummary();
}
function syncNames(){ document.querySelectorAll('[data-s="0"] .sname').forEach(n => n.textContent = S.names[0]); document.querySelectorAll('[data-s="1"] .sname').forEach(n => n.textContent = S.names[1]); renderSummary(); save(); }
$('name0').addEventListener('input', e => { S.names[0] = e.target.value; syncNames(); });
$('name1').addEventListener('input', e => { S.names[1] = e.target.value; syncNames(); });
$('b-tol').addEventListener('change', e => { S.tol = parseFloat(e.target.value); S.problems.forEach(refreshCard); renderSummary(); save(); });
$('add-prob').addEventListener('click', () => { const p = {id:S.nextId++ || Date.now(), half:'standard', f:'', a:'0', b:'1', claims:['',''], grades:['','']}; S.problems.push(p); $('problems').appendChild(makeCard(p)); refreshCard(p); renderSummary(); save(); });
$('clear-demo').addEventListener('click', () => { S.demo = false; S.problems.forEach(p => { p.claims = ['','']; p.grades = ['','']; }); renderAll(); save(); });
$('reset-all').addEventListener('click', () => { S = demoState(); renderAll(); save(); });
$('copy-csv').addEventListener('click', () => {
  const q = v => '"'+String(v).replace(/"/g,'""')+'"'; const lines = ['problem,half,integrand,lower,upper,numeric_value,system,claim,verdict,grade'];
  S.problems.forEach((p,i) => { const n = numeric(p); for (let s = 0; s < 2; s++) { const e = evaluate(p, s); lines.push([i+1,p.half,p.f,p.a,p.b,(n.value !== undefined ? n.value : ''),S.names[s],p.claims[s],e.verdict,p.grades[s]].map(q).join(',')); } });
  const text = lines.join('\n'); $('csv-text').value = text; $('csv-box').hidden = false;
  const fallback = () => { $('csv-text').focus(); $('csv-text').select(); };
  try { navigator.clipboard.writeText(text).then(() => { $('copy-csv').textContent = 'Copied'; setTimeout(() => $('copy-csv').textContent = 'Copy CSV', 1500); }, fallback); } catch(e) { fallback(); }
});


function downloadFile(name,type,content){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export-json').addEventListener('click',()=>downloadFile('integral-check-benchmark.json','application/json',JSON.stringify(S,null,2)));
function parseCSV(text){
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}else if(c==='"')quoted=true;else if(c===','){row.push(field);field='';}else if(c==='\n'){row.push(field);rows.push(row);row=[];field='';}else if(c!=='\r')field+=c;}
  if(field.length||row.length){row.push(field);rows.push(row);}return rows;
}
$('import-json').addEventListener('change',async e=>{
  const file=e.target.files&&e.target.files[0];if(!file)return;
  try{
    let d;
    if(file.name.toLowerCase().endsWith('.csv')){
      const rows=parseCSV(await file.text());if(!rows.length)throw new Error('CSV is empty.');
      const headers=rows.shift(),idx=Object.fromEntries(headers.map((h,i)=>[h,i])),groups=new Map(),systemSlots=new Map();
      for(const r of rows){if(!r.length||!r[idx.problem])continue;const id=r[idx.problem];let q=groups.get(id);if(!q){q={id:Number(id)||Date.now()+groups.size,half:r[idx.half]==='awkward'?'awkward':'standard',f:r[idx.integrand]||'',a:r[idx.lower]||'0',b:r[idx.upper]||'1',claims:['',''],grades:['','']};groups.set(id,q);}
        const sys=r[idx.system]||'System A';if(!systemSlots.has(sys))systemSlots.set(sys,Math.min(systemSlots.size,1));const slot=systemSlots.get(sys);q.claims[slot]=r[idx.claim]||'';q.grades[slot]=r[idx.grade]||'';
      }
      d={problems:[...groups.values()],names:[...systemSlots.keys()]};
    }else d=JSON.parse(await file.text());
    if(!d||!Array.isArray(d.problems))throw new Error('File must contain a problems array or a compatible Integral Check CSV export.');
    d.problems=d.problems.map((q,i)=>({id:Number(q.id)||Date.now()+i,half:q.half==='awkward'?'awkward':'standard',f:String(q.f||''),a:String(q.a??'0'),b:String(q.b??'1'),claims:Array.isArray(q.claims)?[String(q.claims[0]||''),String(q.claims[1]||'')]:['',''],grades:Array.isArray(q.grades)?[String(q.grades[0]||''),String(q.grades[1]||'')]:['','']}));
    S={demo:false,names:Array.isArray(d.names)?[String(d.names[0]||'System A'),String(d.names[1]||'System B')]:['System A','System B'],tol:Number(d.tol)||1e-8,nextId:Math.max(1,...d.problems.map(q=>q.id))+1,problems:d.problems};
    numCache.clear();renderAll();save();alert('Benchmark imported.');
  }catch(err){alert('Import failed: '+err.message);}finally{e.target.value='';}
});
$('share-problem').addEventListener('click',()=>{const q={f:$('c-f').value,a:$('c-a').value,b:$('c-b').value,claim:$('c-claim').value,tol:$('c-tol').value,splits:$('c-splits').value};const u=new URL(location.href);u.hash='problem='+encodeURIComponent(JSON.stringify(q));navigator.clipboard.writeText(u.toString()).then(()=>alert('Shareable problem URL copied.'),()=>prompt('Copy this shareable URL:',u.toString()));});
function loadSharedProblem(){const h=location.hash.slice(1);if(!h.startsWith('problem='))return;try{const q=JSON.parse(decodeURIComponent(h.slice(8)));for(const [id,k] of [['c-f','f'],['c-a','a'],['c-b','b'],['c-claim','claim'],['c-tol','tol'],['c-splits','splits']])if(q[k]!==undefined)$(id).value=q[k];showTab('check');runCheck();}catch(e){}}

renderAll(); runCheck(); loadSharedProblem();
const h = (location.hash || '').replace('#','');
showTab(['check','benchmark','method'].includes(h) ? h : 'check');
