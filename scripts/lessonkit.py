"""Authoring kit for interactive lessons. Cuts the boilerplate of writing *.lesson.json by hand.

    import sys; sys.path.insert(0, 'scripts')
    from lessonkit import *
    L = Lesson('ca-05-mips', 'MIPS Instructions', 'subtitle', refs=[('COD', '2', 'Instructions: Language of the Computer', 'topics')],
               objectives=[...], concepts=[('reg', 'Registers', 'regs'), ...])
    S = L.section('hook', 'Hook', 3); hook(S, 'question', ['clue', ...]); objectives(S)
    S = L.section('regs', 'Registers', 9); concept(S, 'reg', 'Title', [bullets([...])], why='...')
    ...
    finish(L, ...)   # review + quiz sections
    L.save('content/computer-architecture/05-....lesson.json')

Every helper returns nothing and appends a step to the section list `S`. Strings accept the lesson markup (**bold**, `code`)."""
import json


class Lesson:
    def __init__(self, id, title, subtitle, refs, objectives, concepts, level='Beginner', duration=60, levels=4):
        self.d = {'id': id, 'title': title, 'subtitle': subtitle, 'level': level, 'duration': duration, 'practiceLevels': levels,
                  'references': [{'book': b, 'chapter': c, 'title': t, 'topics': tp} for b, c, t, tp in refs],
                  'objectives': objectives, 'concepts': [{'id': i, 'label': l, 'section': s} for i, l, s in concepts], 'sections': []}

    def section(self, id, label, minutes):
        s = {'id': id, 'label': label, 'minutes': minutes, 'steps': []}
        self.d['sections'].append(s)
        return s['steps']

    def save(self, path):
        total = sum(s['minutes'] for s in self.d['sections'])
        assert total == self.d['duration'], f'minutes add up to {total}'
        with open(path, 'w') as f:
            json.dump(self.d, f, indent=2, ensure_ascii=False); f.write('\n')
        print(path, 'steps:', sum(len(s['steps']) for s in self.d['sections']))


def _put(S, step, notes):
    if notes: step['notes'] = notes if isinstance(notes, dict) else {'explain': notes}
    S.append(step)


# ---------- blocks ----------
def bullets(items, numbered=False): return {'type': 'bullets', 'items': items, **({'numbered': True} if numbered else {})}
def text(t, style=None, reveal=False): return {'type': 'text', 'text': t, **({'style': style} if style else {}), **({'reveal': True} if reveal else {})}
def table(head, rows): return {'type': 'table', 'head': head, 'rows': rows}
def compare(lt, li, rt, ri): return {'type': 'compare', 'left': {'title': lt, 'items': li}, 'right': {'title': rt, 'items': ri}}
def code(c, lang='asm', steps=None): return {'type': 'code', 'lang': lang, 'code': c, **({'steps': steps} if steps else {})}
def timeline(items): return {'type': 'timeline', 'items': [{'when': w, 'label': l, **({'note': n} if n else {})} for w, l, n in items]}
def transform(bt, bx, process, at, ax): return {'type': 'transform', 'before': {'title': bt, 'text': bx}, 'process': process, 'after': {'title': at, 'text': ax}}
def node(label, sub=None, note=None, example=None, children=None, links=None):
    d = {'label': label}
    for k, v in (('sub', sub), ('note', note), ('example', example), ('children', children), ('links', links)):
        if v: d[k] = v
    return d
def flow(nodes, layout=None, cols=None, zoom=False, **kw):
    d = {'type': 'flow', 'nodes': nodes, **kw}
    if layout: d['layout'] = layout
    if cols: d['cols'] = cols
    if zoom: d['zoom'] = True
    return d
def formula(terms): return {'type': 'formula', 'terms': [{'t': t[0], 'note': t[1]} if isinstance(t, tuple) else {'t': t} for t in terms]}
def inp(id, label, value, mn, mx, step=1, unit=None):
    d = {'id': id, 'label': label, 'value': value, 'min': mn, 'max': mx, 'step': step}
    if unit: d['unit'] = unit
    return d
def res(label, formula, fmt='num', digits=2, unit=None, better=None):
    d = {'label': label, 'formula': formula, 'format': fmt, 'digits': digits}
    if unit: d['unit'] = unit
    if better: d['better'] = better
    return d
def calc(title, equation, inputs, results, trace=None): return {'type': 'calculator', 'title': title, 'equation': equation, 'inputs': inputs, 'results': results, **({'trace': trace} if trace else {})}
def mips(program, title='MIPS simulator', registers=None, memory=None, watch=None, editable=False, hint=None, endian=None, expect_error=False):
    d = {'type': 'mips', 'title': title, 'program': program}
    if expect_error: d['expectError'] = True
    for k, v in (('registers', registers), ('memory', memory), ('watch', watch), ('hint', hint), ('endian', endian)):
        if v: d[k] = v
    if editable: d['editable'] = True
    return d
def demo(type, **kw): return {'type': type, **kw}


# ---------- steps ----------
def hook(S, question, clues, notes=None, context=None):
    _put(S, {'type': 'hook', 'question': question, 'clues': clues, **({'context': context} if context else {})}, notes or 'Let students guess before revealing the clues.')

def objectives(S, notes=None):
    _put(S, {'type': 'objectives'}, notes or 'Read the objectives aloud; they return in the learning report.')

def concept(S, concept, title, blocks, why=None, real=None, mistake=None, explain=None, deeper=None, notes=None):
    st = {'type': 'concept', 'concept': concept, 'title': title, 'blocks': blocks}
    if why: st['why'] = why
    if real: st['real'] = real
    if mistake: st['mistake'] = [{'wrong': w, 'right': r} for w, r in mistake] if isinstance(mistake, list) else {'wrong': mistake[0], 'right': mistake[1]}
    if explain: st['explainAgain'] = explain if isinstance(explain, dict) else {'beginner': explain}
    if deeper: st['deeper'] = deeper if isinstance(deeper, dict) else {'text': deeper}
    _put(S, st, notes)

def mcq(S, concept, question, options, answer, why, mis=None, skill=None, code=None, feedback=None, title=None):
    st = {'type': 'mcq', 'concept': concept, 'question': question, 'options': options, 'answer': answer, 'why': why}
    if feedback: st['feedback'] = feedback
    elif mis: st['misconception'] = mis
    else: st['misconception'] = 'Re-read the options carefully and work the numbers step by step.'
    if skill: st['skill'] = skill
    if code: st['code'] = code
    if title: st['title'] = title
    S.append(st)

def tf(S, concept, statement, answer, why, skill=None):
    st = {'type': 'tf', 'concept': concept, 'statement': statement, 'answer': answer, 'why': why}
    if skill: st['skill'] = skill
    S.append(st)

def predict(S, concept, question, options, answer, reveal, result, skill='Apply', code=None, notes=None):
    st = {'type': 'predict', 'concept': concept, 'skill': skill, 'question': question, 'options': options, 'answer': answer, 'reveal': reveal, 'result': result}
    if code: st['code'] = code
    _put(S, st, notes)

def practice(S, level, concept, question, answer, solution=None, hint=None, mistake=None, exam=False, title=None, think=None, code=None, skill=None):
    st = {'type': 'practice', 'level': level, 'concept': concept, 'question': question, 'answer': answer}
    for k, v in (('solution', solution), ('hint', hint), ('mistake', mistake), ('title', title), ('think', think), ('code', code), ('skill', skill)):
        if v: st[k] = v
    if exam: st['exam'] = True
    S.append(st)

def exam(S, concept, title, question, answer, solution, mistake=None, hint=None, think=90, skill=None, code=None):
    practice(S, 4, concept, question, answer, solution, hint, mistake, True, 'Exam practice: ' + title, think, code, skill)

def match(S, concept, prompt, pairs, why, title='Mini challenge', skill='Understand'):
    S.append({'type': 'match', 'concept': concept, 'skill': skill, 'title': title, 'prompt': prompt, 'pairs': [{'a': a, 'b': b} for a, b in pairs], 'why': why})

def arrange(S, concept, prompt, items, why, title='Mini challenge', skill='Understand'):
    S.append({'type': 'arrange', 'concept': concept, 'skill': skill, 'title': title, 'prompt': prompt, 'items': items, 'why': why})

def find(S, concept, prompt, lines, wrong, explain, fix=None, title='Find the mistake', lang=None, skill='Analyze'):
    st = {'type': 'find', 'concept': concept, 'skill': skill, 'title': title, 'prompt': prompt, 'lines': lines, 'wrong': wrong, 'explain': explain}
    if fix: st['fix'] = fix
    if lang: st['lang'] = lang
    S.append(st)

def tps(S, prompt, answer, think=20, pair=40, notes=None):
    _put(S, {'type': 'tps', 'title': 'Think, pair, share', 'prompt': prompt, 'think': think, 'pair': pair, 'answer': answer}, notes)

def discussion(S, concept, question, ideas, seconds=60, notes=None):
    _put(S, {'type': 'discussion', 'title': 'Discussion', 'concept': concept, 'question': question, 'seconds': seconds, 'ideas': ideas}, notes)

def checkpoint(S, questions):
    S.append({'type': 'checkpoint', 'title': 'Checkpoint', 'questions': [{'q': q, 'a': a, 'concept': c} for q, a, c in questions]})


# ---------- quiz questions ----------
def Q(level, concept, question, options, answer, why, mis, code=None):
    d = {'level': level, 'concept': concept, 'question': question, 'options': options, 'answer': answer, 'why': why, 'misconception': mis}
    if code: d['code'] = code
    return d

def TF(level, concept, statement, answer, why, mis):
    return {'level': level, 'type': 'tf', 'concept': concept, 'statement': statement, 'answer': answer, 'why': why, 'misconception': mis}


def finish(L, root, branches, remember, mistakes, summary, quiz, recall, review_min=4, quiz_min=8, understand=None):
    """Appends the review and quiz sections. branches: [(label, example, section)], mistakes: [(wrong, right)], recall: [(q, a, concept)]."""
    S = L.section('review', 'Review', review_min)
    S.append({'type': 'conceptmap', 'title': 'How it all connects', 'root': root, 'branches': [{'label': l, 'example': e, 'section': s} for l, e, s in branches]})
    S.append({'type': 'review', 'title': 'What you should remember', 'remember': remember})
    S.append({'type': 'review', 'title': 'Common mistakes', 'mistakes': [{'wrong': w, 'right': r} for w, r in mistakes]})
    S.append({'type': 'review', 'title': 'One-minute summary', 'summary': summary})
    S = L.section('quiz', 'Quiz', quiz_min)
    lv = [q['level'] for q in quiz]
    assert [lv.count(x) for x in ('easy', 'medium', 'hard', 'challenge')] == [3, 3, 2, 1], 'quiz mix must be 3/3/2/1'
    S.append({'type': 'quiz', 'title': 'Final quiz', 'questions': quiz})
    S.append({'type': 'recall', 'title': 'Can you remember?', 'items': [{'q': q, 'a': a, 'concept': c} for q, a, c in recall]})
    S.append({'type': 'report', 'title': 'Your learning report'})


# ---------- verification against the simulators (assets/sim.js) ----------
import subprocess, os
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def sim(js):
    """Run JavaScript with `S = require('assets/sim.js')` and return its JSON output."""
    r = subprocess.run(['node', '-e', "const S=require('./assets/sim.js');const out=(x)=>console.log(JSON.stringify(x));" + js], capture_output=True, text=True, cwd=_ROOT)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)

def run_mips(prog, registers=None, memory=None, endian='big'):
    """Assemble and run a MIPS program. Returns {'regs': {name: value}, 'mem': {addr: word}, 'error': str|None, 'steps': n}."""
    js = ('const p=S.assemble(%s);if(p.errors.length)throw new Error(JSON.stringify(p.errors));const st=S.run(S.newState(p,{registers:%s,memory:%s,endian:%s}));'
          'const regs={};for(let i=1;i<32;i++)if(st.regs[i])regs[S.REGS[i]]=st.regs[i];const mem={};const seen=new Set();for(const a of st.mem.keys()){const w=a-(a%%4);if(!seen.has(w)){seen.add(w);mem[w]=S.loadWord(st,w)}}'
          'out({regs,mem,error:st.error,steps:st.steps})') % (json.dumps(prog), json.dumps(registers or {}), json.dumps(memory or {}), json.dumps(endian))
    return sim(js)

def pipe_cycles(instrs, **opt):
    """Total cycles for the five-stage pipeline timing model. instrs: strings or {'t':..,'taken':True}."""
    return sim('out(S.pipeline(%s,%s).cycles)' % (json.dumps(instrs), json.dumps(opt)))

def encode(asm):
    return sim('const p=S.assemble(%s);out(S.encode(p.instrs[0])>>>0)' % json.dumps(asm))
