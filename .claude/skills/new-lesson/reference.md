# Lesson JSON reference

File: `content/<course-id>/<topic-id>.lesson.json`, registered in `content/courses.json` with `"type": "lesson"`. `npm run check` validates it; `npm run build` refuses to build on errors.

Strings accept light markup: `**bold**`, `*italic*`, `` `code` ``. No raw HTML. Use `\n` for line breaks in `code`, `answer` and `solution`.

## Top level

```json
{
  "id": "unique-lesson-id",
  "title": "How a CPU Works",
  "subtitle": "optional line on the cover",
  "level": "Beginner",
  "duration": 60,
  "practiceLevels": 4,
  "objectives": ["3 to 5 simple outcomes"],
  "concepts": [{ "id": "cycle", "label": "Fetch, decode, execute", "section": "cycle" }],
  "sections": [{ "id": "hook", "label": "Hook", "minutes": 3, "steps": [ ] }]
}
```

- `references`: `[{ "book": "CAQA" | "COD", "chapter": "1", "title": "...", "topics": "...", "sections": "optional, only once the edition is known" }]`. Shown on the cover (Textbook reading) and in the report (Where to read more). Required for Computer Architecture lessons.
- `practiceLevels`: omit for 3 levels (Basic, Application, Challenge). Use `4` for Easy, Medium, Hard, Challenge (required for Computer Architecture).
- `concepts[].section` is the section to revisit when the student misses that concept.
- `sections[].minutes` must add up to `duration`. `label` is shown in the navigation (keep it short).
- Optional on any step: `id`, `title`, `skill` (Remember, Understand, Apply, Analyze, Evaluate), `concept` (a concept id, enables mastery tracking), `notes`.

## Teacher notes (any step)

```json
"notes": { "explain": "...", "terms": ["**Term** - meaning"], "misconceptions": ["..."], "ask": "...", "discuss": "...", "minutes": 3, "difficulty": "Easy" }
```

## Step types

| type | Required | Optional | What the student does |
| --- | --- | --- | --- |
| `hook` | `question` | `context`, `clues[]` | Reads the question; clues reveal one by one |
| `objectives` | - | `intro` | Objectives reveal one by one (text from top-level `objectives`) |
| `concept` | `title`, `blocks[]` | `why`, `explainAgain`, `deeper`, `concept` | Reveals blocks step by step (see Blocks) |
| `mcq` | `question`, `options[]`, `answer` (index), `why` | `misconception`, `feedback[]` (one per option), `code`, `skill` | Picks an option; retry allowed; first-try scores |
| `tf` | `statement`, `answer` (true/false), `why` | `misconception` | True or false |
| `predict` | `question`, `options[]`, `reveal[]` (blocks) | `answer` (index), `result`, `code` | Predicts, then the reveal animates |
| `tps` | `prompt`, `answer` | `think` (secs, default 30), `pair` (secs, 45), `code` | Think timer, pair timer, then answer |
| `practice` | `level` (1-3, or 1-4 with `practiceLevels: 4`), `question`, `answer` | `solution`, `mistake` (common mistake text), `hint`, `think`, `code`, `exam` (true = labelled Exam practice) | Types an answer, Check my answer (shows Your answer, Correct answer), Explain the solution (Why + Common mistake), self-rates, Try again |
| `discussion` | `question` | `seconds` (default 60), `ideas[]`, `context` | Class discussion with a countdown, then Reveal key ideas one by one |
| `match` | `prompt`, `pairs[{a,b}]` | `why` | Matches left items to right items |
| `arrange` | `prompt`, `items[]` (in correct order), `why` | - | Puts shuffled items in order |
| `find` | `prompt`, `lines[]`, `wrong` (index or array), `explain` | `fix`, `lang` (adds code styling) | Clicks the wrong line |
| `checkpoint` | `questions[{q}]` | `a`, `concept` per question, `intro` | Reveals answer, self-rates, meter updates |
| `conceptmap` | `root`, `branches[{label}]` | `example`, `section` per branch | Map builds up; branch click jumps to its section |
| `review` | any of `remember[]`, `understand[]`, `apply[]`, `mistakes[{wrong,right}]`, `summary` | `title` | Cards reveal; split across several steps to keep screens light |
| `quiz` | `questions[]` | - | Scored quiz with results and recommended review |
| `recall` | `items[{q,a}]` | `concept` per item | Answers from memory, then reveals |
| `report` | - | - | Auto-generated learning report |

Quiz questions: `level` is `easy`, `medium`, `hard` or `challenge`; `type` is `mcq` (default) or `tf`; same fields as `mcq` / `tf`; add `concept`. Target mix: 3 easy, 3 medium, 2 hard, 1 challenge.

Concept steps also accept `real` (string, shown as "Where you see this in real life") and `mistake` (an object `{wrong, right, why}` or an array of them, shown as animated Common Mistake cards).

`explainAgain`: a string, or `{ "beginner": "...", "technical": "...", "analogy": "..." }`.
`deeper`: a string, or `{ "text": "...", "items": ["..."], "code": { } }`.

## Blocks (inside `concept.blocks` and `predict.reveal`)

Any block can set `"reveal": true` to appear on its own click. Blocks with several parts reveal one part per click.

| block | Fields | Reveals |
| --- | --- | --- |
| `text` | `text`, `style` (`lead` or `muted`) | whole block (with `reveal`) |
| `bullets` | `items[]` (string or `{text, sub}`), `numbered` | one per click |
| `flow` | `nodes[{label, sub, icon, children[], note}]`, `layout` (`row`, `column`, `grid`), `cols`, `zoom`, `arrows`, `replay` | one node per click; the node's `note` shows as the caption; clicking a node re-highlights it; Replay button animates the whole flow |
| `compare` | `left{title, items[]}`, `right{...}` | left, then right |
| `transform` | `before{title, text, code, lang}`, `process`, `after{...}` | before, process, after |
| `table` | `head[]`, `rows[][]` | one row per click |
| `code` | `code`, `lang` (java, js, python, c, cpp, asm), `steps[{lines[], note}]` | one step per click: highlights those lines and shows the note |
| `analogy` | `pairs[{real, tech, note}]`, `realTitle`, `techTitle` | one pair per click; "Test me" hides the technical names |
| `timeline` | `items[{when, label, note}]` | one per click |
| `callout` | `text`, `title`, `tone` (`why`, `warn`, `real`) | whole block |
| `formula` | `terms[]` (strings or `{t, note}`) | one noted term per click: the term highlights and its note shows |
| `calculator` | `inputs[{id,label,value,min,max,step,unit}]`, `results[{label,formula,format,digits,unit,better}]` | none (always live) |
| `mistake` | `wrong`, `right`, `why` | wrong claim, then it is struck through and the truth appears |
| `example` | `text`, `title`, `code{}` | whole block |

**Calculator rules.** `formula` uses input ids, numbers, `+ - * / ^ ( )` and `min max sqrt log2 pow` only (no other names). Input ids must not be JavaScript reserved words (`new`, `yield`, `in`, ...) and must not look like `r1`, `r2` (those are result slots). `format` is `time` (value in seconds, shown as s/ms/us/ns), `num`, `x` (times), or `pct` (value 0-1). `better: "lower"` or `"higher"` adds Baseline/Now bars and a change line. `equation` (shown above the sliders) and `trace` (a live line; use `{inputId}` and `{r0}`, `{r1}` for results) are optional. Example in the Class 3 lesson.

Flow nodes may also carry `example` (shown under the caption) and `links` (indices of related nodes that pulse when this node is clicked), which gives the CPU-dashboard behavior.

Use `flow` with `layout: "grid"` and `zoom: true` for build-up diagrams (parts appear and enlarge one at a time); use `flow` row for processes (A to B to C).

## Interactive demo blocks (Computer Architecture and any technical course)

These go in `concept.blocks` like any other block (usually alone on a screen, with a short `why` and a question after). All are always live once shown (no click-by-click reveal), so put a **predict** step before the demo and a **question** after it. A complete working example of every block is `docs/examples/demos.lesson.json`; run `node scripts/smoke.js docs/examples/demos.lesson.json --shots 3,5` to see them. Common optional fields: `title`, `hint` (a sentence shown under the title).

| block | What it is | Main fields |
| --- | --- | --- |
| `walkthrough` | Formula-driven animated stages (Instruction, Address calculation, Memory, Data). Sliders change numbers live. Use for addressing modes, PC-relative targets, tag/index/offset breakdowns, page-table lookups, anything that is "inputs flow through stages". | `modes[{ name, inputs[{id,label,value,min,max,step,unit,fmt}], stages[{label,text}], result, note }]` (or the same fields directly for one mode). In `text` and `result`, `{expr}` or `{expr\|fmt}` is replaced by a live value; `expr` uses input ids, numbers, `+ - * / % ^ ( )` and `min max sqrt log2 pow floor ceil round abs mod xor and or shl shr`; `fmt` is `hex`, `hexN`, `binN`, `fixedN`, `dec`. Markdown works in `text`. |
| `bits` | Number representation playground: clickable bits | `modes`: any of `twos` (two's complement), `add` (addition with carries and overflow), `ieee` (IEEE 754 single precision fields), `endian` (big vs little endian bytes), `mul` (shift and add), `div` (restoring division). Options: `bits`, `value`, `a`, `b`. |
| `encoder` | MIPS instruction builder and decoder: type an instruction, see opcode/rs/rt/rd/shamt/funct or immediate/target fields, binary and hex; or decode hex | `mode` (`encode`, `decode`, `both`), `presets[]` (assembly strings), `initial`. Branch offsets are numbers (in words). |
| `mips` | A small MIPS simulator: Step, Run, Reset, highlighted current instruction, registers (changed ones glow), memory words, an explanation of every step | `program` (text, labels and `#` comments allowed), `registers {"$s1": 5}`, `memory {"0x10010000": 7}` (words), `watch` (registers to show), `editable` (student can edit), `endian` (`big` default), `hint`. Supports add addu sub subu and or xor nor slt sltu sll srl sra addi addiu slti sltiu andi ori xori lui lw sw lb lbu sb lh lhu sh beq bne j jal jr and pseudo `li move nop`. `$sp` starts at 0x7FFF0000. |
| `diagram` | Progressive SVG diagram (datapaths, state machines, pipeline registers, block diagrams) with animated scenarios | `width`, `height`, `nodes[{id,label,kind,x,y,w,h,sub}]` (`kind`: `unit` `reg` `mem` `alu` `mux` `adder` `ctrl` `state`; `\n` in `label` makes lines), `edges[{id,points,from,to,label,labelAt,kind,arrow}]` (give `points` as `[[x,y],...]` for reliable routing; `kind: "control"` is dashed red), `labels[{x,y,text,anchor}]`, `steps[{show:[ids],text}]` (BUILD-UP: each next click shows more; the diagram is never shown complete at first), `scenarios[{name, steps[{highlight:[ids], text, values:{nodeId:"text"}}]}]` (animated runs with Play/Step/Back). **Always render it and look at it** (screenshots) before finishing. A ready, tested single-cycle datapath is in `docs/examples/datapath-single-cycle.json`; copy it as a block. |
| `pipeline` | Pipeline and hazard simulator: timing diagram of IF ID EX MEM WB, Play/Pause/Step one clock cycle/Reset/speed, stalls, bubbles, flushes, forwarding, CPI and speedup | `scenarios[{name, instructions[...], note}]` where an instruction is a MIPS string or `{ "t": "beq $t1,$t2,L", "taken": true }`. `options` `{forwarding:true, branchStage:"ID"\|"EX"\|"MEM", predict:"not-taken"\|"stall", unifiedMemory:false}`. `controls` lists the toggles to show: `forwarding`, `memory` (one memory for instructions and data = structural hazard), `branch`, `compare` (view without pipelining), `hazards`. Timing follows the classic five-stage MIPS pipeline (register file written in the first half of a cycle and read in the second; load-use needs one stall even with forwarding). |
| `scheduler` | Instruction scheduling: in-order vs out-of-order, issue width, register renaming; shows issue, exec, write per cycle, total cycles, IPC | `instructions[{t, dest, srcs[], lat}]` (explicit registers and latency), `options {mode:"inorder"\|"ooo", width, rename}`, `controls` (`mode`, `width`, `rename`). |
| `predictor` | 1-bit and 2-bit branch predictors: step through an outcome sequence, see the state machine, predictions, accuracy | `presets[{name, seq:"T T T N ..."}]` (tokens `T`/`N`, or `A:T` to give a branch id for aliasing with `tableSize`), `bits` (1 or 2), `init`, `tableSize`, `fixedStart`. |
| `cache` | Cache simulator: address broken into tag/index/offset, cache contents, hit or miss (compulsory, capacity, conflict), hit rate, optional AMAT and write policy | `config {blockBytes, lines, assoc (1, 2, 4, "full"), addrBits}`, `sequences[{name, accesses:[byte addresses or {addr, op:"R"\|"W"}]}]`, `controls` (`assoc`, `lines`, `block`, `write`), `amat {hitTime, missPenalty}`. Sizes must be powers of two. |
| `hierarchy` | Clickable memory hierarchy (speed, capacity, cost, purpose, example per level; a value travels up to the CPU) plus an optional locality demo (repeated, nearby, scattered patterns; "found at" each level) | `levels[{name,speed,capacity,cost,purpose,example}]`, `locality {title, hint, blockWords, levels[{name,blocks}], patterns[{name, seq:[word addresses]}]}`. |
| `vm` | Virtual to physical translation: VPN and offset, TLB hit or miss, page table, page fault, frame eviction, tables update | `config {pageBytes, tlbEntries, frames, vaBits, pageTable {"0":{valid,ppn}}, tlb [{vpn,ppn}]}`, `sequence[]` (example virtual addresses). |
| `raid` | RAID 0, 1, 5, 6, 10 layouts; click a disk to fail it; shows survival, capacity, notes | `levels` (subset of `["0","1","5","6","10"]`), `disks`, `rows`. |
| `coherence` | Cache coherence (MSI) with a toggle to turn the protocol off and show stale data | `cores`, `memory` (initial value). |
| `race` | Two threads incrementing a shared counter: step them yourself, see a lost update, then add a lock | `locked` (start state). |
| `simd` | Scalar vs vector add: lanes, cycles, speedup | `a[]`, `b[]`, `lanes`. |

The simulators behind them are in `assets/sim.js` and are unit-tested (`npm test`), so numbers shown by a demo are trustworthy. Use `node` to call them (`require('./assets/sim.js')`) to double-check any answer you write in a question: for example `S.pipeline([...], {forwarding:true}).cycles`, `S.cacheSim(cfg, addrs).counts`, `S.encode(S.assemble('add $s0,$s1,$s2').instrs[0])`.

**Check your work with `npm run check` and `node scripts/smoke.js <lesson> --shots 5,12 --out <dir>`** (the second opens the lesson in headless Chrome, visits every screen, presses every demo control, reports errors and saves screenshots you can read). Fix every problem before reporting.

## QR codes and deep links (automatic)

Every lecture page gets a QR code on its cover, a **QR / links** button (key `L`) with a large Lecture code and Quiz code, and a QR card next to the quiz questions. The home page has a **QR** button on each topic. Nothing to write in the lesson JSON, but the quiz code needs a section containing a `quiz` step.

Links use `#s=<section id>`: `page.html#s=quiz` skips the cover and opens that section; `#quiz` is a shortcut for the quiz section. Codes are drawn in the browser from the page's own address. A `PUBLIC_URL` baked in at build time (set automatically by the GitHub Pages workflow) or an address typed by the teacher into the QR dialog replaces it, which is how `localhost` pages produce codes that phones can open.

## Engine behavior (do not re-implement per lesson)

Toolbar, section navigation, progress bar, learning dashboard (click Progress), concept mastery meter, points, streaks, badges, auto-play (about 8 s per reveal, 15 s to read; it always pauses on questions, practice, discussion and quizzes), think-pair-share timers, the classroom timer (30 s, 1, 2, 5 minutes, custom), whiteboard (pen, highlighter, circle, text, eraser), keyboard shortcuts (`Right` `Left` `Space` `R` `A` `F` `Q` `S` show/hide solution, `T` timer, `W` whiteboard, `N` notes, `K` skip animation, `H` hide controls, `L` QR codes and links, `?` help, `1-9` pick an option), reduce-animation and text-size settings, optional read-aloud, teacher notes panel, light/dark theme, resume where you left off, and the learning report all come from `assets/lesson.js`.
