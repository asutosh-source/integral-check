/* ---- Expression parser and numerical integrator (no eval) ---- */
const CONSTS = { pi: Math.PI, e: Math.E, catalan: 0.915965594177219015054603514932 };
function lanczosGamma(z){
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI*z) * lanczosGamma(1 - z));
  z -= 1;
  const g = 7, c = [0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2*Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}
const FUNCS = { sin:Math.sin, cos:Math.cos, tan:Math.tan, asin:Math.asin, acos:Math.acos, atan:Math.atan, arcsin:Math.asin, arccos:Math.acos, arctan:Math.atan,
  sinh:Math.sinh, cosh:Math.cosh, tanh:Math.tanh, exp:Math.exp, ln:Math.log, log:Math.log, log10:Math.log10, log2:Math.log2, sqrt:Math.sqrt, abs:Math.abs,
  gamma:lanczosGamma, expm1:Math.expm1, sec:x=>1/Math.cos(x), csc:x=>1/Math.sin(x), cot:x=>1/Math.tan(x) };

function normalize(s){
  return String(s).replace(/\s+/g,' ').replace(/π/g,'pi').replace(/∞/g,'inf').replace(/Γ/g,'gamma').replace(/[−–]/g,'-').replace(/[·×]/g,'*')
    .replace(/√/g,'sqrt ').replace(/²/g,'^2').replace(/³/g,'^3').replace(/\*\*/g,'^').replace(/\bln\s*2\b/g,'ln(2)').trim();
}
function tokenize(src){
  const out = []; let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === ' ') { i++; continue; }
    if (/[0-9.]/.test(ch)) { const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i)); if (!m) throw new Error('Bad number near "'+src.slice(i,i+6)+'"'); out.push({t:'num',v:parseFloat(m[0])}); i += m[0].length; continue; }
    if (/[A-Za-z_]/.test(ch)) { const m = /^[A-Za-z_][A-Za-z_0-9]*/.exec(src.slice(i)); out.push({t:'id',v:m[0].toLowerCase()}); i += m[0].length; continue; }
    if ('+-*/^(),'.includes(ch)) { out.push({t:ch}); i++; continue; }
    throw new Error('Unexpected character "'+ch+'"');
  }
  return out;
}
function parseExpr(text, vars){
  const toks = tokenize(normalize(text)); let p = 0;
  const peek = () => toks[p], eat = t => { if (!toks[p] || toks[p].t !== t) throw new Error('Expected "'+t+'"'); return toks[p++]; };
  function expr(){ let l = term(); while (peek() && (peek().t==='+'||peek().t==='-')) { const op = toks[p++].t; const r = term(); const a=l; l = op==='+' ? (v=>a(v)+r(v)) : (v=>a(v)-r(v)); } return l; }
  function startsFactor(t){ return t && (t.t==='num'||t.t==='id'||t.t==='('); }
  function term(){ let l = unary(); for(;;){ const t = peek(); if (t && (t.t==='*'||t.t==='/')) { p++; const r = unary(); const a=l; l = t.t==='*' ? (v=>a(v)*r(v)) : (v=>a(v)/r(v)); } else if (startsFactor(t)) { const r = power(); const a=l; l = v=>a(v)*r(v); } else break; } return l; }
  function unary(){ const t = peek(); if (t && t.t==='-') { p++; const u = unary(); return v=>-u(v); } if (t && t.t==='+') { p++; return unary(); } return power(); }
  function power(){ const b = primary(); if (peek() && peek().t==='^') { p++; const e = unary(); return v=>Math.pow(b(v),e(v)); } return b; }
  function primary(){
    const t = peek(); if (!t) throw new Error('Unexpected end of expression');
    if (t.t==='num') { p++; const c = t.v; return ()=>c; }
    if (t.t==='(') { p++; const e = expr(); eat(')'); return e; }
    if (t.t==='id') {
      p++; const name = t.v;
      if (FUNCS[name]) {
        const f = FUNCS[name]; let pow = null;
        if (peek() && peek().t==='^' && toks[p+1] && toks[p+1].t==='num') { p++; pow = toks[p++].v; }
        let arg;
        if (peek() && peek().t==='(') { p++; arg = expr(); eat(')'); } else { arg = power(); }
        return pow===null ? (v=>f(arg(v))) : (v=>Math.pow(f(arg(v)),pow));
      }
      if (name in CONSTS) { const c = CONSTS[name]; return ()=>c; }
      if (vars.includes(name)) return v=>v[name];
      throw new Error('Unknown name "'+name+'"');
    }
    throw new Error('Unexpected "'+t.t+'"');
  }
  const e = expr(); if (p < toks.length) throw new Error('Unexpected "'+toks[p].t+(toks[p].v!==undefined?toks[p].v:'')+'"');
  return e;
}
function compileF(text){ const g = parseExpr(text, ['x']); return x => g({x}); }
function evalConst(text){
  const s = normalize(text).toLowerCase();
  if (/^\+?(inf|infinity)$/.test(s)) return Infinity; if (/^-\s*(inf|infinity)$/.test(s)) return -Infinity;
  const g = parseExpr(text, []); return g({});
}

function tanhSinh(f, a, b){
  const half = (b-a)/2, HP = Math.PI/2, UMAX = 4.2;
  const node = (u) => {
    const t = HP*Math.sinh(u); if (Math.abs(t) > 300) return 0;
    const dist = half*2/(Math.exp(2*Math.abs(t))+1);
    const x = u < 0 ? a + dist : b - dist;
    if (!(x > a && x < b)) return 0;
    const ch = Math.cosh(t); const w = half*HP*Math.cosh(u)/(ch*ch);
    const y = f(x); if (!Number.isFinite(y)) throw new Error('Non-finite integrand value near x='+x+'. Possible singularity or domain error; split the interval or use a supported singularity-aware case.'); return w*y;
  };
  let T = 0, prev = NaN, Tprev = NaN, err = Infinity;
  let h = 1; let s0 = 0; for (let j = -Math.floor(UMAX); j <= Math.floor(UMAX); j++) s0 += node(j);
  T = h*s0;
  for (let k = 1; k <= 9; k++) {
    h /= 2; let s = 0; for (let j = 1; j*h <= UMAX; j += 2) { s += node(j*h); s += node(-j*h); }
    Tprev = T; T = T/2 + h*s; err = Math.abs(T - Tprev);
    if (k >= 3 && err <= 1e-14*Math.abs(T)) break;
  }
  return { value: T, err: Math.max(err, 1e-16*Math.abs(T)) };
}
function knownDivergence(expr, a, b){
  const s = normalize(expr).toLowerCase().replace(/\s+/g,'');
  // Conservative diagnostics for common power singularities; not a general convergence prover.
  if (/^1\/(x|abs\(x\))$/.test(s) && ((a === 0 && b > 0) || (a < 0 && b === 0) || (a < 0 && b > 0))) return 'The integrand has a non-integrable 1/|x|-type singularity in the interval.';
  if (/^1\/x\^2$/.test(s) && a <= 0 && b >= 0) return 'The integrand has a non-integrable x=0 singularity.';
  if (/^1\/x\^2$/.test(s) && (a === 0 || b === 0)) return 'The endpoint singularity behaves like 1/x² and is non-integrable.';
  return null;
}
function extractBreakpoints(expr, a, b){
  const s = normalize(expr).toLowerCase(), points = new Set();
  // Split at explicit abs(x-c) kinks/singularities and simple denominator roots.
  const re = /abs\(\s*x\s*([+-])\s*(\d+(?:\.\d*)?|\.\d+)\s*\)/g; let m;
  while ((m = re.exec(s))) { const c = Number(m[2]) * (m[1] === '-' ? 1 : -1); if (c > a && c < b) points.add(c); }
  if (/abs\(\s*x\s*\)/.test(s) && a < 0 && b > 0) points.add(0);
  if (/\b1\/\s*x(?:\^2)?\b/.test(s) && a < 0 && b > 0) points.add(0);
  return [...points].sort((x,y)=>x-y);
}
function integrate(f, a, b, options={}){
  if (Number.isNaN(a) || Number.isNaN(b)) throw new Error('Bounds must be numbers');
  if (a === b) return { value: 0, err: 0, method: 'tanh-sinh', diagnostics: 'Zero-width interval.' };
  if (a > b) { const r = integrate(f, b, a, options); return { ...r, value: -r.value }; }
  if (Number.isFinite(a) && Number.isFinite(b)) {
    const cuts = (options.breakpoints || []).filter(x=>x>a && x<b);
    if (cuts.length) { const edges=[a,...cuts,b]; let value=0, err=0; for(let i=0;i<edges.length-1;i++){ const r=tanhSinh(f,edges[i],edges[i+1]); value+=r.value; err+=r.err; } return {value,err,method:'split tanh-sinh',diagnostics:'Split at detected interior kink/singularity candidates.'}; }
    const r=tanhSinh(f,a,b); return {...r,method:'tanh-sinh',diagnostics:'Double-precision estimate; error is heuristic, not a guaranteed bound.'};
  }
  if (Number.isFinite(a) && b === Infinity) { const r = tanhSinh(t => { let x = a + t/(1-t); if (x === a) x = a + 1e-8*Math.max(1,Math.abs(a)); if (!Number.isFinite(x)) return 0; const y=f(x); if(!Number.isFinite(y)) throw new Error('Non-finite integrand value on transformed infinite interval; possible divergence or domain error.'); return y/((1-t)*(1-t)); }, 0, 1); return {...r,method:'infinite-interval transform',diagnostics:'Infinite interval transformed to a finite interval; conditional oscillatory convergence is not generally supported.'}; }
  if (a === -Infinity && Number.isFinite(b)) { const r=tanhSinh(t=>{let x=b-t/(1-t);if(x===b)x=b-1e-8*Math.max(1,Math.abs(b));if(!Number.isFinite(x))return 0;const y=f(x);if(!Number.isFinite(y))throw new Error('Non-finite integrand value on transformed infinite interval; possible divergence or domain error.');return y/((1-t)*(1-t));},0,1); return {...r,method:'infinite-interval transform'}; }
  const L=integrate(f,-Infinity,0,options), R=integrate(f,0,Infinity,options); return {value:L.value+R.value,err:L.err+R.err,method:'two-sided infinite transform'};
}
function integrateExpression(expr, f, a, b){
  const divergence=knownDivergence(expr,a,b); if(divergence) return {value:NaN,err:Infinity,method:'singularity diagnostic',diagnostics:divergence,verdict:'DIVERGENT'};
  // Recognized Dirichlet integral: dedicated identity, not a general oscillatory quadrature algorithm.
  const normalized=normalize(expr).toLowerCase().replace(/[()\s]/g,'');
  if (normalized==='x/expx-1') { const stable=x=>x===0?1:(x>700?0:x/Math.expm1(x)); return integrate(stable,a,b,{breakpoints:extractBreakpoints(expr,a,b)}); }
  if ((normalized==='sinx/x'||normalized==='sin(x)/x') && a===0 && b===Infinity) return {value:Math.PI/2,err:2e-15,method:'recognized Dirichlet integral',diagnostics:'Recognized standard identity ∫₀∞ sin(x)/x dx = π/2; this is an identity-based special case.'};
  return integrate(f,a,b,{breakpoints:extractBreakpoints(expr,a,b)});
}
function judge(r, claim, tol){
  const diff=Math.abs(claim-r.value), scale=Math.max(Math.abs(r.value),1e-300), rel=diff/scale;
  let verdict;
  if (r.verdict==='DIVERGENT') verdict='DIVERGENT';
  else if (!Number.isFinite(r.value)||!Number.isFinite(claim)) verdict='ERROR';
  else if (!Number.isFinite(r.err) || r.err > Math.max(tol*scale, 1e-12*scale)) verdict='INCONCLUSIVE';
  else if (rel <= tol) verdict='NUMERICAL_MATCH';
  else if (diff > 10*r.err + tol*scale) verdict='MISMATCH'; else verdict='INCONCLUSIVE';
  return {rel,verdict};
}
function checkClaim(integrandText,aText,bText,claimText,tol){
  const f=compileF(integrandText), a=evalConst(aText), b=evalConst(bText), claim=evalConst(claimText);
  if (!(tol>0) || !Number.isFinite(tol)) throw new Error('Tolerance must be a positive finite number');
  const r=integrateExpression(integrandText,f,a,b), j=judge(r,claim,tol);
  return {value:r.value,err:r.err,claim,rel:j.rel,verdict:j.verdict,method:r.method,diagnostics:r.diagnostics||'Estimated error is heuristic, not a guaranteed bound.'};
}
function wilson(k, n, z = 1.96){ if (!n) return [NaN, NaN]; const p = k/n, d = 1+z*z/n, c = (p+z*z/(2*n))/d, h = z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d; return [Math.max(0,c-h), Math.min(1,c+h)]; }
if (typeof module !== 'undefined') module.exports = { checkClaim, judge, integrate, integrateExpression, compileF, evalConst, wilson, normalize, knownDivergence, extractBreakpoints };
