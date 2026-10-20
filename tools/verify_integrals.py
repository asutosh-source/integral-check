"""Integral-answer verification harness.
Numerically integrates each problem to 30 digits (mpmath) and compares a claimed
closed form. Verifies the FINAL ANSWER only; reasoning validity needs a manual rubric."""
import ast
import operator as op
from mpmath import mp, mpf, quad, quadosc, pi, e, log, sqrt, sin, exp, inf, ln, zeta, erf, beta, gamma, cos, tan, polylog, digamma, cosh, sinh, tanh, asin, acos, atan, fabs
mp.dps = 30
NS = dict(pi=pi, e=e, log=log, ln=log, sqrt=sqrt, zeta=zeta, erf=erf,
          beta=beta, gamma=gamma, sin=sin, cos=cos, tan=tan, exp=exp,
          sinh=sinh, cosh=cosh, tanh=tanh, asin=asin, acos=acos, atan=atan,
          digamma=digamma, li2=lambda x: polylog(2, x), inf=inf, abs=fabs)
BINOPS = {ast.Add: lambda a,b:a+b, ast.Sub:lambda a,b:a-b,
          ast.Mult:lambda a,b:a*b, ast.Div:lambda a,b:a/b,
          ast.Pow:lambda a,b:a**b}
UNOPS = {ast.UAdd:lambda a:a, ast.USub:lambda a:-a}

def _safe_eval(node):
    if isinstance(node, ast.Expression): return _safe_eval(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)): return mpf(str(node.value))
    if isinstance(node, ast.Name) and node.id in NS: return NS[node.id]
    if isinstance(node, ast.BinOp) and type(node.op) in BINOPS: return BINOPS[type(node.op)](_safe_eval(node.left), _safe_eval(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in UNOPS: return UNOPS[type(node.op)](_safe_eval(node.operand))
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in NS and callable(NS[node.func.id]):
        if node.keywords: raise ValueError("Keyword arguments are not allowed.")
        return NS[node.func.id](*[_safe_eval(arg) for arg in node.args])
    raise ValueError("Unsupported syntax in claimed expression: " + ast.dump(node, include_attributes=False))

def claimed_value(expr):
    # Only arithmetic and a fixed allowlist of mathematical functions; never execute Python code.
    expr = expr.replace("^", "**").replace("π", "pi").replace("∞", "inf")
    return _safe_eval(ast.parse(expr, mode="eval"))

def check(problem, claimed, tol=mpf('1e-12')):
    f, (a, b), osc = problem["f"], problem["bounds"], problem.get("osc", False)
    truth = quadosc(f, [a, b], omega=1) if osc else quad(f, [a, b])
    c = claimed_value(claimed)
    err = abs(c - truth) / max(abs(truth), mpf('1e-30'))
    return truth, c, err, ("MATCH" if err < tol else "MISMATCH")

PROBLEMS = [
 dict(id=1,  tex="int_0^1 x e^x dx",              f=lambda x: x*exp(x),            bounds=(0,1),        good="1",             bad="e-1"),
 dict(id=2,  tex="int_0^pi sin^2 x dx",           f=lambda x: sin(x)**2,           bounds=(0,pi),       good="pi/2",          bad="pi"),
 dict(id=3,  tex="int_0^1 ln x dx",               f=lambda x: log(x),              bounds=(0,1),        good="-1",            bad="1"),
 dict(id=4,  tex="int_0^inf e^{-x^2} dx",         f=lambda x: exp(-x*x),           bounds=(0,inf),      good="sqrt(pi)/2",    bad="sqrt(pi)"),
 dict(id=5,  tex="int_0^1 x^2/(1+x^2) dx",        f=lambda x: x*x/(1+x*x),         bounds=(0,1),        good="1-pi/4",        bad="pi/4"),
 dict(id=6,  tex="int_0^{pi/2} ln(sin x) dx",     f=lambda x: log(sin(x)),         bounds=(0,pi/2),     good="-pi*log(2)/2",  bad="-pi*log(2)"),
 dict(id=7,  tex="int_0^inf sin x / x dx",        f=lambda x: sin(x)/x,            bounds=(0,inf), osc=True, good="pi/2",     bad="pi"),
 dict(id=8,  tex="int_0^1 ln(1+x)/(1+x^2) dx",    f=lambda x: log(1+x)/(1+x*x),    bounds=(0,1),        good="pi*log(2)/8",   bad="pi*log(2)/4"),
 dict(id=9,  tex="int_0^inf x/(e^x-1) dx",        f=lambda x: x/(exp(x)-1),        bounds=(0,inf),      good="pi**2/6",       bad="pi**2/3"),
 dict(id=10, tex="int_0^1 ln x/(1-x) dx",         f=lambda x: log(x)/(1-x),        bounds=(0,1),        good="-pi**2/6",      bad="pi**2/6"),
]

if __name__ == "__main__":
    print(f"{'#':>2}  {'integral':<28}{'numeric value':>18}  {'claim':<14}{'rel.err':>10}  verdict")
    nm = 0
    rows = []
    for p in PROBLEMS:
        for label, ans in (("correct", p["good"]), ("wrong", p["bad"])):
            t, c, err, v = check(p, ans)
            rows.append((p["id"], p["tex"], label, ans, float(t), float(err), v))
            print(f"{p['id']:>2}  {p['tex']:<28}{float(t):>18.12f}  {ans:<14}{float(err):>10.1e}  {v} ({label})")
    ok = sum(1 for r in rows if (r[2]=="correct")==(r[6]=="MATCH"))
    print(f"\nHarness self-test: {ok}/{len(rows)} verdicts as expected (correct->MATCH, wrong->MISMATCH)")
