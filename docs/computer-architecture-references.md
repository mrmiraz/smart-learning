# Computer Architecture: textbook references (standing brief)

The course author named these two books, and the exact editions, as the references to follow when generating slides and questions. They apply to **every Computer Architecture lesson**, together with `docs/computer-architecture-spec.md`, the syllabus `docs/course-plans/computer-architecture.md` and `docs/lesson-spec.md`.

| Code in lesson JSON | Book and edition used by the class |
| --- | --- |
| `COD` | Patterson and Hennessy, *Computer Organization and Design: The Hardware/Software Interface*, **5th edition, MIPS Edition (2013)** (student textbook) |
| `CAQA` | Hennessy and Patterson, *Computer Architecture: A Quantitative Approach*, **2nd edition** (instructor / advanced reference) |

**Instruction set for examples: MIPS** (the COD edition is the MIPS Edition). Use MIPS assembly, MIPS registers and MIPS instruction formats from Class 5 onward. This was inferred from the edition; switch only if the author says the class uses RISC-V.

**Chapter numbers.** Lessons cite chapter numbers and titles, not section numbers (the author has not asked for them, and section numbering is easy to get wrong). The chapter lists below are written from memory of these editions: treat them as a working map and correct them if a chapter title does not match the author's copy. The syllabus (`docs/course-plans/computer-architecture.md`) gives the author's own chapter number for every class and **wins** if it differs.

**Edition consequences for content.**
- The 2nd edition of CAQA predates the "classes of computers" and "trends in power and energy" sections of later editions, so cite those ideas to COD 5th edition Chapter 1 (the PostPC era, the power wall, the shift to multiprocessors), not to CAQA.
- CAQA 2nd edition Chapter 1 contains the course's Part 1 material: the task of a computer designer, technology and computer usage trends, cost and trends in cost, measuring and reporting performance, quantitative principles of computer design, fallacies and pitfalls.
- COD 5th edition Chapter 6 is *Parallel Processors from Client to Cloud*. It is not a storage chapter. The syllabus lists "COD Ch. 6" for storage and I/O (Classes 21 and 22); for those classes rely on CAQA Chapter 6 (Storage Systems) and the dependability material in COD Chapter 5, and mark the COD reading as unconfirmed.

## How to use the books

- **Follow their structure, terminology and notation** (for example CPU time = instruction count x CPI x clock cycle time, the names of the eight great ideas). Introduce a term as the book does, then use it consistently.
- **Do not copy.** Paraphrase everything. Never reproduce book text, figures, tables, numbers taken from tables, or exercise questions. Write original examples and original numeric problems in the same style. Book facts (formulas, definitions, history) are fine to teach in your own words.
- Technical claims must match the books. If unsure of a number, teach the idea qualitatively or hedge ("about").
- Every lesson gets a `references` list (chapters and topics it follows). The engine shows it on the cover and in the learning report so students know what to read.

## Mapping the books' features to lesson elements

| In the books | In a lesson |
| --- | --- |
| "The Big Picture" boxes | the `why` callout ("Why does this matter?") |
| "Check Yourself" questions | `mcq`, `tf` or `checkpoint` right after the concept |
| "Hardware/Software Interface" boxes | a `real` callout (where you see this) |
| "Elaboration" boxes | `deeper` (Go Deeper) |
| "Fallacies and Pitfalls" | `mistake` cards (Common Mistake), and a Find the mistake step |
| "Understanding Program Performance" | a `calculator` or worked example |
| "Real Stuff" sections | a short real-world example, never an advertisement |
| End-of-chapter exercises, case studies | style model for Exam practice (numerical, conceptual, diagram, case-style); write new ones |
| CAQA "quantitative" emphasis | numeric predict-before-reveal and calculators for every formula |

## Chapter map: the two editions

| Topic | `COD` 5th edition (MIPS) | `CAQA` 2nd edition |
| --- | --- | --- |
| Fundamentals, trends, cost, performance, Amdahl, CPU equation | Ch 1 Computer Abstractions and Technology | Ch 1 Fundamentals of Computer Design |
| Instruction set architecture, addressing, encoding, MIPS and ARM/x86 examples | Ch 2 Instructions: Language of the Computer | Ch 2 Instruction Set Principles and Examples |
| Arithmetic and floating point | Ch 3 Arithmetic for Computers | Appendix on computer arithmetic |
| Datapath, control, single-cycle and multi-cycle | Ch 4 The Processor | Ch 3 Pipelining (basic implementation ideas) |
| Pipelining and hazards | Ch 4 The Processor | Ch 3 Pipelining |
| Instruction-level parallelism, dynamic scheduling, branch prediction | Ch 4 The Processor (the instruction-level parallelism section) | Ch 4 Advanced Pipelining and Instruction-Level Parallelism |
| Memory hierarchy, caches, virtual memory | Ch 5 Large and Fast: Exploiting Memory Hierarchy | Ch 5 Memory-Hierarchy Design |
| Storage, I/O, buses, reliability, RAID | Ch 5 (dependable memory hierarchy); no dedicated storage chapter (unconfirmed) | Ch 6 Storage Systems |
| Multiprocessors, shared memory, synchronization | Ch 6 Parallel Processors from Client to Cloud | Ch 8 Multiprocessors |
| Vector processing, RISC survey, x86 | Ch 2 (ARM and x86 real-stuff sections); appendix on RISC architectures | Appendices: vector processors, survey of RISC architectures, the Intel 80x86 |
