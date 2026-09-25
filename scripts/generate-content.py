#!/usr/bin/env python3
"""
Regenerate src/content/steps.ts, concepts.ts, reference.ts and capacity.ts from
WEBSITE-SPEC §8, §9, §11, and §7.3's capacity messages with §6's split hint.

    python3 scripts/generate-content.py

§8 prose is the product, not decoration, and `tests/steps.test.ts` re-parses the
spec on every run and compares character for character. So the content files are
GENERATED, never hand-edited: to change step or concept prose, edit the spec and
run this.

⚠️ This script and the test parser must agree by construction. They implement
the same grammar twice, on purpose — the generator writes the content and the
test independently re-derives it, so a parser bug shows up as a mismatch rather
than as silently agreeing garbage. If you change one, change the other.

Three parse edge cases are already handled; all three cost a debugging round:

  * An italic editorial note may sit between a block marker and its blockquote.
    UNEXERCISED since MESSAGE-8 moved notes out of §8.2, and it will not fail if
    it breaks — see FINDINGS-8.
  * §8.2 carries prose subheadings that are not steps. A chunk is a step only if
    it opens with the `id` — title form.
  * Write this as a FILE, never as an inline heredoc. Backticks in the regexes
    get mangled by the shell even inside a quoted heredoc.
"""

import re, json
spec=open('docs/WEBSITE-SPEC-biga-calculator.md').read()
body=spec[spec.index('### 8.2 Steps'):spec.index('### 8.3 Concepts')]
def field(c,n):
    m=re.search(r'^\*\*%s:\*\*\s*(.*)$'%n, c, re.M); return m.group(1).strip() if m else None
def bq(c,marker):
    lines=c.split('\n')
    try: st=next(i for i,l in enumerate(lines) if l.strip()==marker)
    except StopIteration: return None
    out=[]
    for i in range(st+1,len(lines)):
        l=lines[i]
        if l.startswith('>'): out.append(re.sub(r'^> ?','',l))
        elif l.strip()=='' and out and i+1<len(lines) and lines[i+1].startswith('>'): out.append('')
        elif l.strip()=='' and not out: continue
        # UNEXERCISED since MESSAGE-8 moved editorial notes out of 8.2. Kept as
        # defence, but it will not fail if it breaks - the bound-but-unused
        # token check is what would actually catch a note reappearing.
        elif not out and l.strip().startswith('*') and not l.strip().startswith('**'): continue
        else: break
    while out and out[-1]=='': out.pop()
    return '\n'.join(out)
def table(c,marker):
    lines=c.split('\n')
    try: st=next(i for i,l in enumerate(lines) if l.strip()==marker)
    except StopIteration: return None
    raw=[]
    for i in range(st+1,len(lines)):
        l=lines[i].strip()
        if not l.startswith('|'):
            if l=='' and not raw: continue
            break
        raw.append([x.strip() for x in l[1:-1].split('|')])
    return {'headers':raw[0],'rows':raw[2:]} if len(raw)>=3 else None
# The field markers §8.2 uses. Mirrored in tests/steps.test.ts.
KNOWN_MARKERS=[r'phase', r'summary', r'summary \(retarded\)', r'summary \(classic\)', r'values',
    r'timer', r'speed', r'watchFor', r'concepts', r'detail', r'troubleshoot', r'repeatsPerMix',
    r'shown only when', r'detail, shown only when `[^`]+`', r'warning, shown when `[^`]+`']
steps=[]
for c in body.split('\n#### ')[1:]:
    # A step ends at the next section heading as well as the next step. Without
    # this, mix-8 swallowed all of 8.2a (a ### section between mix-8 and bulk-1)
    # - harmless while fields were first-match, but a generic condition parser
    # would read any marker 8.2a quotes as mix-8's own.
    c=c.split('\n### ',1)[0]
    h=re.search(r'^`([a-z0-9-]+)` — (.+)$', c, re.M)
    if not h: continue
    ph=field(c,'phase'); rm=field(c,'repeatsPerMix')
    # 8.2 "**shown only when:** `<condition>` - prose". Take only the backticked
    # condition; the prose after the em-dash is rationale for a reader.
    sw=re.search(r'^\*\*shown only when:\*\*\s*`([^`]+)`', c, re.M)
    s={'id':h.group(1),'title':h.group(2).strip(),'phase':ph,
       'summary':field(c,'summary'),'summaryRetarded':field(c,r'summary \(retarded\)'),
       'summaryClassic':field(c,r'summary \(classic\)'),'values':field(c,'values'),
       'timer':field(c,'timer'),'speed':field(c,'speed'),'watchFor':field(c,'watchFor'),
       'concepts':field(c,'concepts'),'detail':bq(c,'**detail:**'),
       'troubleshoot':table(c,'**troubleshoot:**'),
       'repeatsPerMix':ph=='mix','suppressOnFinal':bool(rm and 'suppress' in rm.lower()),
       'shownWhen':sw.group(1) if sw else None}
    # Every **marker:** line must be one this grammar knows. A marker nothing
    # parses is prose that silently never renders - see the note below.
    for mk in re.findall(r'^\*\*([^*\n]+?):\*\*', c, re.M):
        if not any(re.fullmatch(k, mk) for k in KNOWN_MARKERS):
            raise SystemExit('%s: unknown field marker **%s:** - teach the generator AND tests/steps.test.ts' % (h.group(1), mk))
    # Conditional detail blocks, matched GENERICALLY. This used to loop over a
    # hard-coded ['nMix > 1','nBiga > 1'], so bulk-2's openDiameterCapped block
    # was dropped - and the test parser shared the list, so the verbatim check
    # passed. Which conditions are valid is decided where they are resolved
    # (detailConditionHolds), not here.
    conds=re.findall(r'^\*\*detail, shown only when `([^`]+)`:\*\*$', c, re.M)
    if len(conds)>1:
        raise SystemExit('%s: %d conditional detail blocks, but a Step holds one' % (h.group(1), len(conds)))
    for cond in conds:
        b=bq(c,'**detail, shown only when `%s`:**'%cond)
        if b: s['detailWhen']={'condition':cond,'detail':b}
    m=re.search(r'^\*\*warning, shown when `([^`]+)`:\*\*$', c, re.M)
    if m:
        t=bq(c,m.group(0))
        if t: s['warningWhen']={'condition':m.group(1),'text':t}
    steps.append(s)
def tpl(x): return x.replace('\\','\\\\').replace('`','\\`').replace('${','\\${')
def parse_timer(l):
    if not l: return None
    m=re.match(r'^(\d+)[\u2013-](\d+)\s*min', l)
    if m: return '[%s, %s]'%(m.group(1),m.group(2))
    m=re.match(r'^(\d+)\s*min', l)
    return m.group(1) if m else None
def parse_speed(l):
    if not l: return None
    m=re.match(r'^(\d+)%\s*/\s*(\d+)\s*RPM,\s*~?(\d+)(?:[\u2013-](\d+))?\s*min', l)
    if not m: return None
    d,r,lo=m.group(1),m.group(2),m.group(3); hi=m.group(4) or lo
    return '{ dial: %s, rpm: %s, minutes: [%s, %s], label: `%s` }'%(d,r,lo,hi,tpl(l))
old=open('src/content/steps.ts').read()
head=old[:old.index('export const STEPS')]
tail=old[old.index('\n];\n', old.index('export const STEPS'))+4:]
out=[head,'export const STEPS: readonly Step[] = [\n']
for s in steps:
    out.append('  {\n')
    out.append('    id: %s,\n'%json.dumps(s['id']))
    out.append('    phase: %s,\n'%json.dumps(s['phase']))
    if s['shownWhen']: out.append('    shownWhen: %s,\n'%json.dumps(s['shownWhen']))
    out.append('    title: `%s`,\n'%tpl(s['title']))
    out.append('    summary: `%s`,\n'%tpl(s['summary'] or s['summaryRetarded'] or ''))
    if s['summaryRetarded']: out.append('    summaryRetarded: `%s`,\n'%tpl(s['summaryRetarded']))
    if s['summaryClassic']: out.append('    summaryClassic: `%s`,\n'%tpl(s['summaryClassic']))
    if s['values']:
        parts=[p.strip() for p in s['values'].split(' · ')]
        out.append('    values: [%s],\n'%', '.join('`%s`'%tpl(p) for p in parts))
    if s['timer']:
        out.append('    timerLabel: `%s`,\n'%tpl(s['timer']))
        tm=parse_timer(s['timer'])
        if tm: out.append('    timerMinutes: %s,\n'%tm)
    if s['speed']:
        sp=parse_speed(s['speed'])
        if sp: out.append('    speed: %s,\n'%sp)
    if s['detail']: out.append('    detail: `%s`,\n'%tpl(s['detail']))
    if s.get('detailWhen'):
        d=s['detailWhen']
        out.append('    detailWhen: {\n      condition: %s,\n      detail: `%s`,\n    },\n'%(json.dumps(d['condition']),tpl(d['detail'])))
    if s['watchFor']: out.append('    watchFor: `%s`,\n'%tpl(s['watchFor']))
    if s['troubleshoot']:
        t=s['troubleshoot']
        out.append('    troubleshoot: {\n      headers: [%s],\n      rows: [\n'%', '.join(json.dumps(x) for x in t['headers']))
        for r in t['rows']: out.append('        [%s],\n'%', '.join('`%s`'%tpl(x) for x in r))
        out.append('      ],\n    },\n')
    if s['concepts']:
        out.append('    concepts: [%s],\n'%', '.join(json.dumps(x) for x in s['concepts'].split()))
    if s['repeatsPerMix']: out.append('    repeatsPerMix: true,\n')
    if s['suppressOnFinal']: out.append('    suppressOnFinal: true,\n')
    if s.get('warningWhen'):
        w=s['warningWhen']
        out.append('    warningWhen: {\n      condition: %s,\n      text: `%s`,\n    },\n'%(json.dumps(w['condition']),tpl(w['text'])))
    out.append('  },\n')
out.append('];\n')
open('src/content/steps.ts','w').write(''.join(out)+tail)
print("steps: %d, warningWhen: %s"%(len(steps),[s['id'] for s in steps if 'warningWhen' in s]))

# --- §8.3 concepts ----------------------------------------------------------

cbody = spec[spec.index('### 8.3 Concepts'):spec.index('## 9. Reference tables')]
concepts = []
cur = None
for l in cbody.split('\n'):
    m = re.match(r'^\*\*`([a-z0-9-]+)`\*\* — \*(.+)\*$', l.strip())
    if m:
        cur = {'id': m.group(1), 'title': m.group(2), 'body': []}
        concepts.append(cur)
        continue
    if cur is None:
        continue
    if l.startswith('>'):
        cur['body'].append(re.sub(r'^> ?', '', l))
    elif l.strip() == '' and cur['body']:
        cur['body'].append('')
    elif l.strip() != '':
        cur = None
for c in concepts:
    while c['body'] and c['body'][-1] == '':
        c['body'].pop()
    c['body'] = '\n'.join(c['body'])

cold = open('src/content/concepts.ts').read()
chead = cold[:cold.index('export const CONCEPTS')]
ctail = cold[cold.index('];\n', cold.index('export const CONCEPTS')) + 3:]
cout = [chead, 'export const CONCEPTS: readonly Concept[] = [\n']
for c in concepts:
    cout.append('  {\n    id: %s,\n    title: %s,\n    body: `%s`,\n  },\n'
                % (json.dumps(c['id']), json.dumps(c['title']), tpl(c['body'])))
cout.append('];\n')
open('src/content/concepts.ts', 'w').write(''.join(cout) + ctail)
print("concepts: %d, %d chars" % (len(concepts), sum(len(c['body']) for c in concepts)))

# --- §9 reference tables and §11 sources -------------------------------------
#
# §9's subsections render verbatim. The line above the first `###` ("Put these
# on a secondary page or in a drawer") is an instruction to the implementer,
# and is left out by structure rather than by editing.
#
# §11's intro mixes an instruction with content. The instruction sentence is
# removed by exact match, and its absence is an error: if the spec rewords it,
# this must be looked at again rather than silently rendering it to a baker.

ABOUT_INSTRUCTION = 'Link these from an About page. '

def slug(t): return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')

rbody = spec[spec.index('## 9. Reference tables'):spec.index('## 10.')]
sections = []
cur = None
for l in rbody.split('\n'):
    if l.startswith('### '):
        cur = {'id': slug(l[4:]), 'title': l[4:].strip(), 'body': []}
        sections.append(cur)
    elif l.strip() == '---':
        cur = None
    elif cur is not None:
        cur['body'].append(l)
for r in sections:
    while r['body'] and r['body'][0].strip() == '': r['body'].pop(0)
    while r['body'] and r['body'][-1].strip() == '': r['body'].pop()
    r['body'] = '\n'.join(r['body'])

sbody = spec[spec.index('## 11. Sources'):spec.index('## 12.')]
slines = [l for l in sbody.split('\n')[1:]]
intro = next(l for l in slines if l.strip() and not l.startswith('- '))
if not intro.startswith(ABOUT_INSTRUCTION):
    raise SystemExit('§11 intro no longer opens with %r — check what it says now' % ABOUT_INSTRUCTION)
intro = intro[len(ABOUT_INSTRUCTION):]
sources = []
for l in slines:
    if not l.startswith('- '): continue
    m = re.match(r'^- \[(.+?)\]\((https?://[^)\s]+)\) — (.+)$', l)
    if not m: raise SystemExit('unparsed §11 source line: %r' % l)
    sources.append({'title': m.group(1), 'url': m.group(2), 'note': m.group(3)})

rold = open('src/content/reference.ts').read()
rhead = rold[:rold.index('export const REFERENCE')]
rtail = rold[rold.index('// --- end generated ---'):]
rout = [rhead, 'export const REFERENCE: readonly ReferenceSection[] = [\n']
for r in sections:
    rout.append('  {\n    id: %s,\n    title: %s,\n    body: `%s`,\n  },\n'
                % (json.dumps(r['id']), json.dumps(r['title']), tpl(r['body'])))
rout.append('];\n\nexport const ABOUT_INTRO = %s;\n\nexport const SOURCES: readonly Source[] = [\n' % json.dumps(intro))
for x in sources:
    rout.append('  {\n    title: %s,\n    url: %s,\n    note: %s,\n  },\n'
                % (json.dumps(x['title'], ensure_ascii=False), json.dumps(x['url']), json.dumps(x['note'], ensure_ascii=False)))
rout.append('];\n\n')
open('src/content/reference.ts', 'w').write(''.join(rout) + rtail)
print("reference: %s; sources: %d" % ([r['id'] for r in sections], len(sources)))

# --- §7.3 capacity messages, and §6's split hint (MESSAGE-29) -----------------
#
# Each message is found by the bold label or phrase that introduces it, and a
# missing anchor is an error rather than an empty string.

cap = spec[spec.index('#### Capacity'):spec.index('#### The stagger warning')]
clines = cap.split('\n')

def quote_after(label):
    """The blockquote on the line after the one starting with `label`."""
    for i, l in enumerate(clines):
        if l.startswith(label):
            nxt = clines[i + 1]
            if not nxt.startswith('> '): raise SystemExit('no blockquote after %r' % label)
            return nxt[2:]
    raise SystemExit('capacity label not found: %r' % label)

def italic_quote(text, lead):
    """The *"..."* that follows `lead` on one line."""
    for l in text.split('\n'):
        i = l.find(lead)
        if i < 0: continue
        m = re.search(r'\*"(.+?)"\*', l[i:])
        if m: return m.group(1)
    raise SystemExit('quoted message not found after %r' % lead)

panel1 = spec[spec.index('### Panel 1'):spec.index('### Panel 2')]
capacity = [
    ('split', quote_after('**Split required')),
    ('bigaSplit', quote_after('**Biga split required')),
    ('divideBiga', italic_quote(cap, "keep §4.5's line:")),
    ('nearLimit', quote_after('**Near the limit')),
    ('belowMinimum', quote_after('- **As a guard')),
    ('minimumAtInput', italic_quote(cap, 'shows, next to the field:')),
    ('splitHint', italic_quote(panel1, 'show beside the field:')),
]

kold = open('src/content/capacity.ts').read()
khead = kold[:kold.index('export const CAPACITY')]
ktail = kold[kold.index('// --- end generated ---'):]
kout = [khead, 'export const CAPACITY = {\n']
for k, v in capacity:
    kout.append('  %s: `%s`,\n' % (k, tpl(v)))
kout.append('} as const;\n\n')
open('src/content/capacity.ts', 'w').write(''.join(kout) + ktail)
print("capacity: %s" % [k for k, _ in capacity])
