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

## QR codes and deep links (automatic)

Every lecture page gets a QR code on its cover, a **QR / links** button (key `L`) with a large Lecture code and Quiz code, and a QR card next to the quiz questions. The home page has a **QR** button on each topic. Nothing to write in the lesson JSON, but the quiz code needs a section containing a `quiz` step.

Links use `#s=<section id>`: `page.html#s=quiz` skips the cover and opens that section; `#quiz` is a shortcut for the quiz section. Codes are drawn in the browser from the page's own address. A `PUBLIC_URL` baked in at build time (set automatically by the GitHub Pages workflow) or an address typed by the teacher into the QR dialog replaces it, which is how `localhost` pages produce codes that phones can open.

## Engine behavior (do not re-implement per lesson)

Toolbar, section navigation, progress bar, learning dashboard (click Progress), concept mastery meter, points, streaks, badges, auto-play (about 8 s per reveal, 15 s to read; it always pauses on questions, practice, discussion and quizzes), think-pair-share timers, the classroom timer (30 s, 1, 2, 5 minutes, custom), whiteboard (pen, highlighter, circle, text, eraser), keyboard shortcuts (`Right` `Left` `Space` `R` `A` `F` `Q` `S` show/hide solution, `T` timer, `W` whiteboard, `N` notes, `K` skip animation, `H` hide controls, `L` QR codes and links, `?` help, `1-9` pick an option), reduce-animation and text-size settings, optional read-aloud, teacher notes panel, light/dark theme, resume where you left off, and the learning report all come from `assets/lesson.js`.
