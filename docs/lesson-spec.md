# Interactive Lesson Specification

This is the standing brief for **every topic page** on this site. It was written by the course author and applies to all courses (Java, Computer Architecture, and any later course). The author gives only the topic inputs below; everything else in this document is already decided and must not be re-asked.

Edit this file to change the rules for all future lessons.

> **Primary goal:** Students should understand the topic, interact with it, practice it, and remember it, not just watch slides.

The page must feel like a combination of an interactive presentation, a learning application, a visual textbook, a quiz platform, a practice environment and a teacher presentation tool. It must NOT feel like a traditional PowerPoint.

## 1. Inputs

The author provides, per lesson:

- **Topic**
- **Course**
- **Student level:** Beginner / Intermediate / Advanced
- **Class duration** (for example 60 minutes)
- **Learning objectives**

If the content is incomplete, organize and expand it logically at the student's level. Do not introduce advanced concepts before the fundamentals. **Before generating the page, organize the topic into a logical teaching sequence**, then implement the interactive experience around that sequence.

## 2. Learning flow

1. **Hook.** Start with an interesting question, problem, scenario, surprising fact or real situation ("How does your computer execute millions of instructions every second?"). Do not give the answer immediately. Create curiosity first.
2. **Learning objectives.** Show 3-5 clear objectives in simple language ("By the end of this lesson, students will be able to..."). The teacher briefly introduces them.
3. **Teach the concept** in small sections. One major idea at a time. Use animated and flow diagrams, interactive illustrations, icons, step-by-step animation, highlighting, progressive text reveal, visual comparisons, timelines, tables, code examples where appropriate and real-world analogies. Avoid large paragraphs. Pattern: **Concept, Visual, Explanation, Example, Check.**

The loop to follow throughout: **Explain, Visualize, Ask, Predict, Reveal, Practice, Feedback, Recall.** Never produce Text, Text, Text, Text, Quiz.

## 3. Animation system

Animations must help understanding, not decorate. Use:

- **Step-by-step reveal** (Input, Processing, Output) rather than everything at once
- **Flow animation** for processes (A to B to C to D)
- **Highlight animation** on the exact component being discussed
- **Transformation animation** (Before, Process, After)
- **Zoom animation** into important parts of a diagram
- **Build-up animation** that constructs complicated diagrams gradually (CPU, then ALU + Control Unit, then Registers, then data flow)

No excessive animation.

## 4. Teacher presentation mode

A dedicated Presentation Mode. The teacher can: start presentation, pause, resume, next, previous, jump to a section, restart animation, skip animation, start/stop auto-play, show/hide answers, start quizzes, start practice questions.

Keyboard: `Right` next, `Left` previous, `Space` pause/resume, `R` restart current animation, `A` toggle auto-play, `F` fullscreen, `Q` start question, `H` show/hide teacher controls. Suitable for classroom projectors.

## 5. Auto-play

Each section can have an entry animation, explanation, pause for reading and transition. The teacher can always pause. Show a progress indicator ("Section 3 / 8") and a countdown ("Next section in 8 seconds"). The teacher can continue manually at any time. Never too fast.

## 6. Questions during teaching

Do not wait until the end. Insert short questions throughout, in different types:

- **Multiple choice.** Correct: show "Correct!" then explain WHY. Wrong: show "Not quite." then explain the misconception.
- **True / False** with an explanation.
- **Prediction question.** Ask "What do you think will happen next?" before the animation, then reveal the answer through animation.
- **Think-Pair-Share.** "Think for 30 seconds", then "Discuss with a partner", then "Let's reveal the answer", with a countdown timer.

## 7. Practice mode

After an important concept, a dedicated practice section with three levels:

- **Level 1 Basic:** fundamental understanding
- **Level 2 Application:** apply the concept
- **Level 3 Challenge:** reasoning or problem solving

Do not reveal the answer immediately. Give thinking time, then **Show Answer**, and afterwards **Explain the Solution**.

## 8. Progressive difficulty

**Remember, Understand, Apply, Analyze, Evaluate.** Not every question is memorization. Include questions that explain, compare, predict, calculate, debug, design, reason and apply.

## 9. Real-world connection

For every major concept add **"Why does this matter?"**, connected to real software, smartphones, computers, websites, AI, everyday technology, industry or student projects.

## 10. Analogy mode

For difficult concepts give a simple real-world analogy with an interactive visual comparison. Example: Desk, Drawer, Cabinet, Storage room mapped to Register, Cache, RAM, Storage.

## 11. Mini challenges

Small game-like challenges, not exams: **Predict** (what happens next), **Find the mistake**, **Match** components to functions, **Arrange** steps in order, **Debug** (find the error in code), **Design** (how would you solve this).

## 12. Knowledge checkpoints

After every major section: "Can you answer these three questions? 1. What is X? 2. Why is X important? 3. How is X different from Y?" Show progress, for example **Understanding: 4 / 5 concepts**.

## 13. Visual knowledge map

At the end of the teaching portion, an animated concept map showing how the concepts connect (Main topic, Concepts, Examples).

## 14. Final review

Concise: **Remember** (key facts), **Understand** (key concepts), **Apply** (key techniques), **Common mistakes** (3-5), and a **One-minute summary**.

## 15. Final quiz

About 3 easy, 3 medium, 2 difficult and 1 challenge question. Show a score ("Your Score: 8 / 9") **and** meaningful feedback: what you understood, what to review, which sections to revisit. Never only a score.

## 16. Spaced recall

A section **"Can You Remember?"** that asks (definition, why it exists, what happens before/after, difference between X and Y) without showing the explanation first, then reveals the answer.

## 17. Student engagement

Occasional prompts: "Think about it.", "Predict what happens next.", "Discuss with your partner.", "Raise your hand if you think A is correct.", "Try solving it before continuing.", "Explain this to your friend." Avoid a passive page.

## 18. Modern UI design

Modern educational SaaS style: clean, minimal, professional, high readability, strong visual hierarchy, rounded cards, subtle shadows, smooth transitions, modern typography, consistent spacing, accessible contrast, restrained palette. Not childish. Think Notion + modern SaaS dashboard + interactive learning platform, without copying any site.

## 19. Responsive design

Works on classroom projector, desktop, laptop, tablet and mobile. **Prioritize the projector:** large readable text, high contrast.

## 20. Navigation

Persistent but unobtrusive, for example **01 Hook, 02 Concept, 03 Example, 04 Practice, 05 Challenge, 06 Review, 07 Quiz**. Shows the current position. The teacher can jump between sections.

## 21. Progress system

**Lesson Progress** bar with percentage, and **Concepts mastered: 6 / 8**, to motivate students.

## 22. "Explain Again"

For difficult concepts, a button showing a simpler explanation (simpler language, analogy, visual, small example). Optionally **Beginner Explanation** and **Technical Explanation**.

## 23. "Go Deeper"

Optional expandable content for advanced students. The main lesson stays simple.

## 24. Teacher notes

An optional teacher-only panel: what to explain, important terminology, common misconceptions, suggested class question, suggested discussion, approximate time, expected difficulty. Not shown in normal student presentation mode.

## 25. Timing

Divide the lesson into time blocks whose total matches the requested duration (for example Hook 3, Concept 1 8, Interactive question 3, Concept 2 10, Practice 8, Challenge 5, Review 5, Quiz 8).

## 26. Accessibility

Keyboard navigation, large readable text, high contrast, reduced-motion option, clear focus indicators, screen-reader-friendly semantic HTML, never rely on color alone, and a **Reduce Animation** option.

## 27. Optional narration

If practical, optional narration the teacher can play, pause and continue manually. Audio is never required; the lesson works completely without sound.

## 28. Gamification (careful)

Lightweight: points, progress, streaks, challenge badges, mastery indicators. Not a children's game. Learning comes first.

## 29. Content rules (strict)

1. Never put too much text on one screen.
2. One screen communicates one main idea.
3. Prefer visual explanation over paragraphs.
4. Reveal complex information progressively.
5. Use examples immediately after concepts.
6. Ask questions before revealing answers.
7. Explain incorrect answers.
8. Connect theory to real-world applications.
9. Use simple language for beginners.
10. Introduce technical terminology gradually.
11. Avoid unnecessary decorative animations.
12. Keep navigation consistent.
13. Make every interaction meaningful.

## 30. End-of-lesson learning report

**Your Learning Report:** concepts learned (8 / 8), quiz score (85%), strong areas, needs review, and recommended review ("Section 4: Pipeline"), so students can see what to study again.

## 30b. QR access (added by the course author)

Every lecture has a QR code that opens that lecture, and every lecture's quiz section has its own QR code that opens the quiz directly. Students scan from the projector or a printed handout. Implemented by the engine for all lessons and slides with no per-lesson content; see `assets/qr.js`.

## 31. Technical requirements

A self-contained interactive webpage in HTML, CSS and JavaScript, built as a real learning application rather than a static collection of slides. Smooth, performant animation. Avoid unnecessary external dependencies.

## 32. Presentation controls

A compact toolbar: Previous, Next, Play/Pause, Auto-play, Progress, Fullscreen, Restart animation, Quiz, Settings. It disappears automatically during presentation and reappears on mouse move or key press.

## 33. Educational principle

**Explain, Visualize, Ask, Predict, Reveal, Practice, Feedback, Recall.** The page continuously involves the student.

## 34. Final goal

When presented in class, students should feel they are participating, not watching slides. The teacher is **Guide + Questioner + Explainer + Mentor**, not the person who reads slides. Polished enough for a real university classroom.

---

## How this repo implements the spec

| Spec section | Where it lives |
| --- | --- |
| Presentation mode, toolbar, shortcuts, auto-play, settings, notes, progress, gamification, report (4, 5, 12, 20, 21, 24, 26-28, 30, 32) | `assets/lesson.js` and `assets/lesson.css`, shared by every lesson |
| Content: hook, objectives, concepts, questions, practice, review, quiz (1-3, 6-16, 22, 23, 25, 29) | one `content/<course>/<topic>.lesson.json` per topic |
| QR codes for each lecture and its quiz, `#s=<section>` deep links (30b) | `assets/qr.js`, `assets/qr.css`, `vendor/qrcode.js`; `PUBLIC_URL` in the build |
| Checks that a lesson follows the spec | `lesson-validate.js` (`npm run check`) |
| How to author one | `.claude/skills/new-lesson/SKILL.md` and `reference.md` |

Example lessons to copy from: `content/computer-architecture/03-cost-performance-quantitative-principles.lesson.json` (calculators, formulas, exam practice) and `docs/examples/cpu-basics.lesson.json`. The Computer Architecture brief is `docs/computer-architecture-spec.md`.
