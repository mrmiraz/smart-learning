---
name: new-lesson
description: Create an interactive teaching page for a topic in any course (Java, Computer Architecture, others). Use whenever the user gives a topic to teach, asks for a new lesson/slide/page, or says "add topic X". The standing lesson spec is already in the repo, so never ask the user to repeat it.
---

# Create an interactive lesson

The author gives a **topic** (plus optionally course, level, duration, objectives). Everything else is decided in `docs/lesson-spec.md`. **Do not ask for the spec again** and do not ask questions the spec already answers.

## Inputs and defaults

| Input | If missing |
| --- | --- |
| Topic | Ask. This is the only thing you cannot invent. |
| Course | Infer from the topic. If it fits an existing course in `content/courses.json`, use it; otherwise ask once. |
| Level | Beginner |
| Duration | 60 minutes |
| Objectives | Write 3-5 yourself from the topic |

If the author's material is incomplete, expand it logically at the student's level. Do not introduce advanced concepts before the fundamentals. Say in one line what you assumed.

## Steps

1. **Read `docs/lesson-spec.md`** (the rules). **For a Computer Architecture class, first read its entry in `docs/course-plans/computer-architecture.md` (the author's syllabus: required Teach list, Reading, demo notes; also check Build status and open questions), and also read `docs/computer-architecture-spec.md` and `docs/computer-architecture-references.md`** (follow the COD and CAQA books for structure and terminology, paraphrase only, cite chapters in `references`, and derive Common Mistake cards from the books' Fallacies and Pitfalls) and build the interactive demos it lists for that topic (it overrides the general spec where they differ) and **`reference.md`** next to this file (the JSON format). Skim a model lesson: `content/computer-architecture/03-quantitative-principles-performance-measurement.lesson.json` (calculators, formulas, predict-before-reveal, exam practice) and `content/computer-architecture/04-isa-fundamentals-risc-vs-cisc.lesson.json` (MIPS examples, flow with examples, RISC vs CISC calculator). `docs/examples/cpu-basics.lesson.json` is a smaller general example. `docs/course-plans/` holds each course's class plan.
2. **Plan the teaching sequence first** (spec section 1): list the concepts, their order, the section time budget (must add up to the duration), where each question and challenge goes. Keep this plan to a few lines in your reply; do not wait for approval unless the topic is ambiguous.
3. **Write `content/<course-id>/<NN-topic-id>.lesson.json`.** Follow the learning loop *Explain, Visualize, Ask, Predict, Reveal, Practice, Feedback, Recall*.
4. **Register it** in `content/courses.json` under the course: `{ "id": "<NN-topic-id>", "title": "...", "type": "lesson" }`. The filename must be `<id>.lesson.json`.
5. **Run `npm run check`.** Fix every error. Treat warnings as spec violations and fix them unless there is a reason not to.
6. **Run `node scripts/smoke.js <your lesson> --shots <screen numbers> --out <dir>`** (works without the password: it opens the lesson in headless Chrome, visits every screen, presses every demo control, reports errors and saves screenshots; read the PNGs). Use the interactive demo blocks in `reference.md` wherever a topic has one (the Computer Architecture spec requires them) and verify every numeric answer you write with a short script or the simulators in `assets/sim.js`. Then **build and look at it:** `npm run build`, then open the result (`npm start`, http://localhost:8080, password in `.env`). For a visual check use headless Chrome on a decrypted copy, as done for the demo lesson. Do not claim it works from the JSON alone.
7. Report briefly: what you built, section timings, anything assumed, and that it is not committed or pushed (only commit/push when asked).

## Lesson shape (the checklist the spec boils down to)

- **Hook** step first: a question or scenario that creates curiosity, with 2-3 `clues`. No answer yet.
- **Objectives** step: 3-5 objectives in simple language (`objectives` array at the top).
- **Concept** steps: ONE idea per screen. Progressive blocks (`flow`, `bullets`, `code` with `steps`, `table`, `compare`, `transform`, `analogy`, `timeline`). Never a paragraph wall: `text` blocks under about 280 characters, at most 6 bullets.
  - Every concept step gets `why` ("Why does this matter?"): real software, phones, websites, AI, student projects.
  - Hard concepts get `explainAgain` (beginner and technical) and an `analogy`. Advanced extras go in `deeper`.
  - Add teacher `notes` (explain, terms, misconceptions, ask, discuss) on the main steps.
- **A question right after each concept** (do not save questions for the end). Mix `mcq`, `tf`, `predict`, `tps` (think-pair-share). Wrong answers must explain the misconception (`misconception` or per-option `feedback`).
- **Mini challenges** at least once: `match`, `arrange`, `find` (find the mistake / debug).
- **Checkpoint** after each major section: 3 questions and the "Understanding: x / y concepts" meter.
- **Practice** section: `practice` steps with `answer`, `solution` and a `mistake`. General lessons use 3 levels; **Computer Architecture lessons set `"practiceLevels": 4`** (1 Easy, 2 Medium, 3 Hard, 4 Challenge) and add **exam practice** steps (`"exam": true`, level 4): numerical, conceptual, diagram interpretation, performance calculation. Solutions stay hidden until the student attempts.
- **Common Mistake** callouts (`mistake` on concept steps; an array gives several animated wrong-versus-right cards) and **Where you see this in real life** (`real`) on every major concept. Name real products only to explain architecture, never to advertise.
- **Interactive numbers, not just formulas:** use a `formula` block (terms explained one at a time) and a `calculator` block (sliders, live results, baseline bars). Put a `predict` step BEFORE the calculator or the animation it explains (for example: "clock rate +20%, what happens to CPU time?").
- A **`discussion`** step (large question, countdown, "Reveal key ideas") and an **"Exam practice"** group. End the review with a step titled **"What you should remember"** (5-7 key points).
- Cover Remember, Understand, Apply, Analyze, Evaluate across the questions (`skill` field). Not everything is recall.
- **Review**: `conceptmap`, then `review` steps: **What you should remember** (5-7 points), understand/apply, common mistakes (3-5), one-minute summary.
- **Quiz**: 3 easy, 3 medium, 2 hard, 1 challenge. Then **`recall`** ("Can you remember?", answer hidden first). Then **`report`** (the learning report is generated automatically).
- Define `concepts` (id, label, section) and tag every question with `concept`, so mastery, "needs review" and the report work.
- Section `minutes` must sum to `duration`.

## Rules that must hold

- Never put too much text on one screen. Prefer visuals. Reveal progressively.
- Examples immediately after concepts. Ask before revealing answers. Explain wrong answers.
- Simple language for beginners; introduce terminology gradually.
- No decorative animation; every reveal should serve understanding.
- QR codes are automatic (lecture and quiz). Give the quiz its own section (id `quiz`) with a `quiz` step so the quiz QR can open it directly. Nothing else to do.
- Auto-play must never answer for the student: questions, practice, discussion and quizzes always pause it (the engine does this). Do not write content that depends on auto-submit.
- Lessons are JSON data only. Do not edit `assets/lesson.js` or `assets/lesson.css` for a single topic; change the engine only for a feature every lesson should get, and then test it.
- Teacher `notes` are inside the encrypted page but visible to anyone who has the site password (students too). Do not put answers or grading secrets in them.
- Keep Java/other-course content correct: check code samples actually compile or run before putting them in a lesson.
