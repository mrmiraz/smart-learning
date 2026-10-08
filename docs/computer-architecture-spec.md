# Computer Architecture: Course Spec (standing brief)

Written by the course author. **Applies to every Computer Architecture lesson**, on top of the general `docs/lesson-spec.md`. If the two conflict, this file wins for Computer Architecture. Never ask the author to repeat it.

**Course:** Computer Architecture. **Audience:** university undergraduate CSE/CS students. **Level:** beginner to intermediate. Students know basic programming and digital/computer fundamentals, but NOT advanced architecture, so explain every important concept from first principles before using advanced terminology.

**Goal:** an interactive classroom experience, not a PowerPoint replacement: **Learn, Visualize, Predict, Answer, Practice, Receive Feedback, Recall.** The teacher teaches a whole lecture from the page. Every major concept: **Visual, Animation, Interaction, Question, Practice, Feedback, Recall.** The student should feel "I am discovering how a computer works", not "I am reading a PowerPoint".

## Concept learning loop

Introduce, Why (why does this problem exist?), Visualize (animation/diagram), Explain, Example, Predict (what happens next?), Reveal (animate the right answer), Practice, Feedback (why right/wrong), Recall (explain it again). Never Heading, Bullets, Heading, Bullets.

## Lecture structure (approximately)

01 Hook, 02 Learning objectives, 03 Concept, 04 Visual simulation, 05 Question, 06 Example, 07 Practice, 08 Challenge, 09 Real world, 10 Recap, 11 Quiz, 12 Recall.

## Course modules and required interactive content

The architecture must support all of these topics as lessons (data only, no per-lesson engine code).

**Module 1: Fundamentals of Computer Design.** What is computer architecture; architecture vs organization; tasks of a computer architect; system components; technology trends; cost trends; performance measurement; quantitative principles; Amdahl's Law; CPU performance equation; CPI; clock cycle; clock rate; instruction count; performance vs execution time.

- **Performance calculator (interactive).** Student changes Instruction Count, CPI, Clock Rate. Show `CPU Time = Instruction Count x CPI x Clock Cycle Time` and `CPU Time = Instruction Count x CPI / Clock Rate`, recomputed live, animating how each variable moves performance. Predict question: "If clock rate increases by 20%, what happens to CPU execution time?" Students predict before the result is revealed.

**Memory hierarchy.** Why it exists; registers, cache, main memory, secondary storage; speed, capacity, cost; locality (temporal, spatial).
- Animated hierarchy CPU, Registers, Cache, RAM, SSD/HDD with data moving between levels. Each level is clickable and shows approximate speed, capacity, cost, purpose, example. Visual message: closer to the CPU = faster but smaller.
- **Locality demo.** `for i = 0 to 999: sum += array[i]` animates sequential access (spatial locality); a second example repeatedly touching one variable (temporal locality). Ask: "Which type of locality is being demonstrated?"

**Instruction Set Architecture.** What an ISA is; ISA vs hardware implementation; instructions and types; operands; registers; memory operands; encoding; formats.
- **Instruction builder.** Student builds Opcode + registers + immediate/address, e.g. `ADD R1, R2, R3`, broken visually into opcode / source / source / destination, then shown how the CPU interprets it.

**Memory addressing.** Immediate, register, base/displacement, direct, indirect. Click a mode to animate Instruction, Address Calculation, Memory, Data. Include practice questions.

**Instruction execution.** Animated cycle FETCH, DECODE, EXECUTE, MEMORY ACCESS, WRITE BACK. An instruction moves through Program Counter, Instruction Register, Register File, ALU, Memory, Control Unit. Each component is clickable and shows: what it does, why it is needed, what information enters, what leaves.

**Datapath.** Built progressively, never shown complete at first: Registers, then ALU, then Memory, then Control Unit, then connect everything, animated.

**Instruction-level visualization.** For `ADD R1, R2, R3` animate: fetch, decode, read registers, send values to ALU, add, write the result to the destination register. Students follow Instruction, Data, ALU, Result visually. This is extremely important.

**Pipelining (the most visual part).** First the problem: "Why can't we simply finish one instruction before starting the next?" Compare without pipeline (I1 I2 I3 sequential) vs pipeline (overlapped), animate both, show the throughput gain.
- **Stage animation.** IF, ID, EX, MEM, WB with Play, Pause, Step one clock cycle, Reset, speed up/down, and a clock-cycle timeline.
- **Hazard simulator.** Structural (two instructions need one resource), data (dependency), control (branch/jump changes flow), each animated.
- **Data hazard.** `ADD R1,R2,R3` then `SUB R4,R1,R5`: the second needs R1 before it is written. Animate the dependency, then **stall** and **forwarding**. A Forwarding ON/OFF toggle shows the difference.
- **Control hazard.** `BEQ R1, R2, LABEL`: animate fetching, then the taken branch; explain wrong-path instructions, flush, branch prediction (advanced parts optional).

**Multi-cycle operations.** Compare ADD, LOAD, STORE, BRANCH; pick one and see which datapath components it uses.

**Instruction-level parallelism.** Independent instructions (`ADD R1,R2,R3`, `SUB R4,R5,R6`, `MUL R7,R8,R9`) overlap; then show dependencies that limit parallelism.

**Interactive CPU dashboard.** A simplified CPU (Control Unit, Registers, ALU). Clicking a component highlights it, explains its purpose, shows an example, animates its interaction with others.

## Questions and practice

- Questions appear **right after the concept**, not all at the end. Types: multiple choice, true/false, predict the result, find the mistake, match components, arrange steps, calculate performance, identify hazard, trace instruction, explain in your own words.
- **Practice engine:** each topic has Easy (recognition), Medium (application), Hard (reasoning), Challenge (exam/interview). After submission show: Your Answer, Correct Answer, Why, Common Mistake, Try Again.
- **Exam Practice section:** short, conceptual, numerical, diagram interpretation, performance calculation, pipeline timing, hazard identification, cache/memory, ISA questions. Solution hidden until the student attempts it.
- **Predict Before Reveal** is a major feature. Before every important animation ask "What do you think will happen?" (e.g. Instruction 2 needs Instruction 1's result: A execute normally, B stall, C delete Instruction 1, D restart CPU), then animate the correct behavior.
- **Common Mistake** callouts throughout, with animated comparisons: higher clock speed always means a faster CPU; more GHz = better performance; cache is just a smaller RAM; pipelining shortens every individual instruction; more pipeline stages always means better performance; the CPU runs every instruction in one cycle; memory and storage are the same thing.
- **Where You See This in Real Life** for each major concept (CPU performance, smartphone processors, Intel/AMD, ARM, Apple Silicon, GPUs, cache, SSD, modern CPUs, AI accelerators). Use them only to explain architecture, never as product advertising.

## Teacher tools

- Presentation mode, Play/Pause/Next/Previous/Restart, auto-play with sensible durations (concept animation about 8 s, explanation about 15 s). **Questions and practice always pause. Never auto-submit.** Resume only when the teacher continues.
- Teacher controls: start, pause, resume, next, previous, restart animation, skip animation, show/hide answer, start quiz, start timer, toggle auto-play, fullscreen, jump to section.
- Shortcuts: Right next, Left previous, Space play/pause, R restart, A auto-play, F fullscreen, Q question, S show/hide solution, T timer.
- **Classroom timer:** 30 s, 1 min, 2 min, 5 min, custom ("Think about this for 60 seconds").
- **Discussion mode:** a large discussion question with countdown, then **Reveal Key Ideas** (e.g. "Why do modern CPUs use cache instead of simply making RAM faster?").
- **Whiteboard mode:** blank canvas overlay: draw, write, circle, highlight, erase.

## Student progress

- Learning dashboard (progress %, concepts n / N, practice n / N, quiz %, weak area).
- End of lecture, **What You Should Remember**: 5-7 key points (e.g. performance depends on more than clock speed; CPI is average cycles per instruction; memory hierarchy balances speed, capacity, cost; pipelines improve throughput; hazards reduce pipeline efficiency).
- **Final learning report:** concept understanding, practice, quiz, strong areas, review recommended, recommended sections, with links to revisit weak sections.

## Design, accessibility, devices

- Modern university/technology look: clean, professional, minimal, high readability; dark/light themes; rounded cards, subtle shadows, smooth transitions; monospace for assembly/code; consistent icons. No childish gamification, no excessive gradients or distracting effects.
- Presentation screen maximizes educational content: title and `04 / 12` counter on top, the animated diagram and short explanation in the middle, unobtrusive Previous / progress dots / Next at the bottom.
- Accessibility: keyboard navigation, large fonts, high contrast, reduced motion (**Reduce Animation** in settings), clear focus indicators, screen-reader-friendly HTML, **never information by color alone**.
- Works on desktop, laptop, projector, tablet and mobile. On mobile **reorganize** diagrams, do not just shrink them.

## Content quality

- Technically accurate terminology; explain terms before abbreviating; always distinguish architecture from organization; consistent notation; realistic examples; clearly label simplified models; do not oversimplify into incorrectness.
- Render formulas clearly (e.g. `CPU Time = Instruction Count x CPI x Clock Cycle Time`) and use interactive numeric examples, not formulas alone.
- Build it as a **reusable architecture**: a future lecture is added by providing lesson content only, never by rebuilding the app.
