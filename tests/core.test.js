const test = require('node:test');
const assert = require('node:assert/strict');
const { checkClaim, integrate, compileF, evalConst, wilson } = require('../docs/assets/core.js');

// [integrand, lower, upper, correct claim, wrong claim]
const CASES = [
  ['x e^x', '0', '1', '1', 'e-1'],
  ['sin(x)^2', '0', 'pi', 'pi/2', 'pi'],
  ['ln x', '0', '1', '-1', '1'],
  ['exp(-x^2)', '0', 'inf', '\u221a\u03c0/2', '\u221a\u03c0'],
  ['x^2/(1+x^2)', '0', '1', '1-\u03c0/4', '\u03c0/4'],
  ['ln(sin x)', '0', '\u03c0/2', '-\u03c0 ln 2 / 2', '-\u03c0 ln 2'],
  ['ln(1+x)/(1+x^2)', '0', '1', '\u03c0 ln 2 / 8', '\u03c0 ln 2 / 4'],
  ['x/(exp(x)-1)', '0', '\u221e', '\u03c0^2/6', '\u03c0^2/3'],
  ['ln(x)/(1-x)', '0', '1', '-\u03c0^2/6', '\u03c0^2/6'],
  ['1/(1+x^2)', '-inf', 'inf', 'pi', 'pi/2'],
  ['x^2 exp(-x)', '0', 'inf', 'gamma(3)', 'gamma(2)'],
  ['sin^2 x', '0', 'pi', '\u03c0/2', '\u03c0'],
  ['1/sqrt(x)', '0', '1', '2', '1'],
];

for (const [f, a, b, good, bad] of CASES) {
  test(`integral of ${f} on [${a}, ${b}]`, () => {
    assert.equal(checkClaim(f, a, b, good, 1e-8).verdict, 'NUMERICAL_MATCH');
    assert.equal(checkClaim(f, a, b, bad, 1e-8).verdict, 'MISMATCH');
  });
}

test('reversed bounds flip the sign', () => {
  const f = compileF('x^2');
  const fwd = integrate(f, 0, 2).value, rev = integrate(f, 2, 0).value;
  assert.ok(Math.abs(fwd - 8 / 3) < 1e-12);
  assert.ok(Math.abs(fwd + rev) < 1e-12);
});

test('parser accepts the documented syntax', () => {
  for (const s of ['x e^x', 'sin^2 x', '2pi', '\u221a\u03c0/2', 'x**2', 'log10(x)', 'gamma(3)', '-x^2']) {
    assert.doesNotThrow(() => compileF(s), s);
  }
  assert.ok(Math.abs(evalConst('2pi') - 2 * Math.PI) < 1e-15);
  assert.ok(Math.abs(evalConst('-\u03c0 ln 2 / 2') + Math.PI * Math.log(2) / 2) < 1e-15);
});

test('parser rejects bad input without evaluating it', () => {
  for (const s of ['foo(x)', '1+', 'x $ 2', 'process.exit()', '(1+2']) {
    assert.throws(() => compileF(s), s);
  }
});

test('divergent integral is not reported as a match', () => {
  assert.notEqual(checkClaim('1', '0', 'inf', '1', 1e-8).verdict, 'MATCH');
});

test('Wilson interval for 12 of 15', () => {
  const [lo, hi] = wilson(12, 15);
  assert.ok(Math.abs(lo - 0.548) < 0.002 && Math.abs(hi - 0.930) < 0.002);
});


test('known non-integrable endpoint singularities are explicitly diagnosed', () => {
  assert.equal(checkClaim('1/x','0','1','100',1e-8).verdict, 'DIVERGENT');
  assert.equal(checkClaim('1/x^2','0','1','100',1e-8).verdict, 'DIVERGENT');
});

test('interior absolute-value singularity is split into subintervals', () => {
  const r=checkClaim('1/sqrt(abs(x))','-1','1','4',1e-6);
  assert.ok(Math.abs(r.value-4)<1e-4, `got ${r.value}`);
});

test('absolute-value kink at a nonzero point is split', () => {
  const r=checkClaim('abs(x-0.3)','0','1','0.29',1e-8);
  assert.ok(Math.abs(r.value-0.29)<1e-8, `got ${r.value}`);
});

test('Dirichlet integral recognized with explicit method note', () => {
  const r=checkClaim('sin(x)/x','0','inf','pi/2',1e-8);
  assert.equal(r.verdict,'NUMERICAL_MATCH');
  assert.match(r.method,/recognized Dirichlet/);
});

test('power singularities with exponent p >= 1 are diagnosed conservatively', () => {
  assert.equal(checkClaim('1/x^1.5','0','1','1',1e-8).verdict, 'DIVERGENT');
  assert.equal(checkClaim('1/x^0.5','0','1','2',1e-8).verdict, 'NUMERICAL_MATCH');
});
test('user supplied split point is accepted', () => {
  const r=checkClaim('abs(x-0.3)','0','1','0.29',1e-8,[0.3]);
  assert.ok(Math.abs(r.value-0.29)<1e-8);
});
test('limited LaTeX fractions normalize to arithmetic', () => {
  assert.ok(Math.abs(evalConst('\\frac{1}{2}')-0.5)<1e-12);
});
test('added special functions parse', () => {
  for(const x of ['erf(x)','zeta(2)','beta(2,3)','li2(0.5)','digamma(3)']) assert.doesNotThrow(()=>compileF(x),x);
});
