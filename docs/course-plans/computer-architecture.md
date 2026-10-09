# Computer Architecture: 24-class syllabus (24 classes x 60 minutes)

Written by the course author. This is the standing syllabus: when the author names a class number or topic, build exactly that class's content from this file. It supersedes the earlier four-class outline (which split classes 3 and 4 differently).

**Course goal.** Students should understand how a program becomes machine instructions, how the CPU executes those instructions, why pipelining makes CPUs faster, why memory becomes a bottleneck, and how modern processors overcome these limitations.

**Books.** Patterson and Hennessy, *Computer Organization and Design* (`COD`) is the primary student textbook. Hennessy and Patterson, *Computer Architecture: A Quantitative Approach* (`CAQA`) is the instructor and advanced reference. See `docs/computer-architecture-references.md` for how to use them (paraphrase, never copy).

Chapter numbers below are **as written by the author**. Editions: `COD` 5th edition, MIPS Edition (2013); `CAQA` 2nd edition. The author's CAQA numbers (ILP Ch. 4, caches Ch. 5, storage Ch. 6, multiprocessors Ch. 8) match the 2nd edition. One mismatch: the 5th edition of COD has no storage chapter (its Ch. 6 is parallel processors), so the "COD Ch. 6" reading for Classes 21 and 22 is unconfirmed; use CAQA Ch. 6 as the main source there.

**Instruction set for examples: MIPS** (inferred from the COD MIPS Edition; the author's wording was "MIPS or RISC-V, depending on your university's existing convention"). Switch only if the author says the class uses RISC-V.

## The 24 classes

| Class | Topic | Primary book | Chapter / section |
| --- | --- | --- | --- |
| 1 | Introduction to Computer Architecture and Computer Design | COD | Ch. 1 Introduction |
| 2 | Technology Trends, Moore's Law and Computer Performance | COD + CAQA | COD Ch. 1; CAQA Ch. 1 |
| 3 | Quantitative Principles and Performance Measurement | COD + CAQA | COD Ch. 1; CAQA Ch. 1 |
| 4 | ISA Fundamentals, RISC vs CISC | COD | Ch. 2 |
| 5 | MIPS/RISC-V Instructions, Registers and Operands | COD | Ch. 2 |
| 6 | Addressing Modes and Memory Access | COD | Ch. 2 |
| 7 | Instruction Encoding and Assembly Programming | COD | Ch. 2 |
| 8 | Procedures, Branches and Translating High-Level Code | COD | Ch. 2 |
| 9 | Computer Arithmetic and Floating Point | COD | Ch. 3 |
| 10 | CPU Datapath and Single-Cycle Processor | COD | Ch. 4 |
| 11 | Multi-Cycle Datapath and Control | COD | Ch. 4 |
| 12 | Pipelining Fundamentals | COD | Ch. 4 |
| 13 | Pipeline Hazards and Hazard Resolution | COD | Ch. 4 |
| 14 | Advanced Pipelining and Instruction-Level Parallelism | COD + CAQA | COD Ch. 4; CAQA Ch. 4 |
| 15 | Dynamic Scheduling and Out-of-Order Execution | CAQA | Ch. 4 |
| 16 | Branch Prediction and Speculative Execution | CAQA | Ch. 4 |
| 17 | Memory Hierarchy and Locality | COD | Ch. 5 |
| 18 | Cache Organization and Mapping | COD | Ch. 5 |
| 19 | Cache Misses, Hit Time and Miss Penalty | COD + CAQA | Ch. 5 |
| 20 | Main Memory, Virtual Memory and TLB | COD | Ch. 5 |
| 21 | Storage Systems and I/O | COD + CAQA | COD Ch. 6; CAQA Ch. 6 |
| 22 | Buses, Reliability, Availability and RAID | CAQA | Ch. 6 |
| 23 | Multiprocessors, Shared Memory and Synchronization | COD + CAQA | COD Ch. 6; CAQA Ch. 8 |
| 24 | Vector Processing, RISC/x86 and Course Review | COD + CAQA | Appendices / ISA chapters |

## Part 1: Fundamentals

### Class 1: What is computer architecture?
Teach: computer architecture vs computer organization; what a computer architect does; CPU; memory; I/O; the software-hardware interface; instruction execution overview; design goals (performance, cost, power, reliability).
Student reading: COD Ch. 1 (start with the introductory sections). Instructor reference: CAQA Ch. 1.

### Class 2: Technology and trends
Teach: transistors; integrated circuits; Moore's Law; CPU evolution; memory technology; storage technology; power/energy trends; why clock frequency stopped increasing rapidly; multicore processors.
Core idea to introduce: **computer architecture changes because technology changes.**
Reading: COD Ch. 1; CAQA Ch. 1.

### Class 3: Performance and quantitative principles
A **problem-solving class**: students solve numerical problems.
Teach: response time; throughput; CPU execution time; clock cycle; clock rate; CPI; instruction count; CPU performance equation; speedup; Amdahl's Law.
Reading: COD Ch. 1; CAQA Ch. 1.

## Part 2: Instruction Set Architecture

### Class 4: ISA fundamentals
Teach: what is an ISA; ISA as the software/hardware interface; instruction classes; RISC; CISC; load/store architecture; register-based architecture.
Reading: COD Ch. 2 Instructions.

### Class 5: Instructions, registers and operands
"Now make the course practical."
Teach: registers; register file; integer operands; floating-point operands; immediate operands; instruction types; arithmetic instructions; logical instructions; data movement. Use MIPS or RISC-V examples, depending on the university's existing convention.
Reading: COD Ch. 2.

### Class 6: Addressing modes and memory access
Teach: immediate addressing; register addressing; base/displacement; PC-relative; memory addressing; load/store; alignment; big endian vs little endian. Examples: `lw`, `sw`. Students should **calculate actual memory addresses**.
Reading: COD Ch. 2.

### Class 7: Instruction encoding
"One of the most valuable practical classes."
Teach: assembly -> instruction format -> binary machine code; opcode; register fields; immediate fields; instruction formats; R-type; I-type; J-type; encoding; decoding.
Reading: COD Ch. 2.

### Class 8: Branches, procedures and high-level code
Teach: if; if-else; while; for; arrays; branch instructions; jump instructions; procedure calls; return addresses; the stack; register spilling.
Example to translate: C/Java `if (a < b) x = y; else x = z;` to assembly. "This makes ISA meaningful to students."
Reading: COD Ch. 2.

## Part 3: Arithmetic and CPU implementation

### Class 9: Computer arithmetic
Teach: unsigned integers; signed integers; two's complement; addition; subtraction; multiplication; division; overflow; floating-point representation; IEEE 754. (Better here than at the very end of the course.)
Reading: COD Ch. 3 Arithmetic for Computers.

### Class 10: Datapath and the single-cycle CPU
The class where students finally understand **what actually happens inside the CPU when an instruction executes**.
Teach: PC; register file; ALU; instruction memory; data memory; multiplexers; control unit; datapath. Then build the single-cycle processor.
Reading: COD Ch. 4 The Processor.

### Class 11: Multi-cycle processor
Teach: why single-cycle is not ideal. Then multiple cycles; instruction fetch; decode; execute; memory access; write back; the multi-cycle datapath; control FSM.
Students compare single-cycle and multi-cycle:

| Single-cycle | Multi-cycle |
| --- | --- |
| One instruction = one cycle | An instruction can use multiple cycles |
| Long clock cycle | Shorter clock cycle |
| Hardware duplication | Better hardware reuse |

Reading: COD Ch. 4.

## Part 4: Pipelining

### Class 12: Pipeline fundamentals
Teach: the classic IF -> ID -> EX -> MEM -> WB; pipeline stages; pipeline registers; latency; throughput; speedup; pipeline timing diagrams. Use actual instructions and draw the pipeline cycle by cycle.
Reading: COD Ch. 4.

### Class 13: Pipeline hazards
Teach: three major hazards (structural, data, control). Data dependencies: RAW, WAR, WAW. Then forwarding; stalling; bubble; flush.
Reading: COD Ch. 4.

### Class 14: ILP and advanced pipelining
Transition from basic undergraduate pipeline concepts toward modern processors.
Teach: instruction-level parallelism; multiple instructions per cycle; superscalar processors; static vs dynamic scheduling; dependency limitations.
Reading: COD processor chapter / advanced pipeline sections; CAQA Ch. 4.

### Class 15: Dynamic scheduling
Teach: out-of-order execution; dynamic scheduling; reservation stations; Tomasulo's algorithm; register renaming; dependencies. **Do not teach every implementation detail.** Goal: students understand why modern CPUs do not necessarily execute instructions in program order.
Reading: CAQA Ch. 4.

### Class 16: Branch prediction
Teach: branch penalty; static prediction; dynamic prediction; 1-bit predictor; 2-bit predictor; branch target buffer; speculative execution. Use a small prediction table as an exercise.
Reading: CAQA Ch. 4.

## Part 5: Memory hierarchy

### Class 17: Memory hierarchy and locality
Start by asking: why can't we simply build one huge, extremely fast memory? Then introduce Registers -> L1 cache -> L2 cache -> L3 cache -> DRAM -> SSD/HDD; capacity; cost; speed; temporal locality; spatial locality.
Reading: COD Ch. 5 Memory Hierarchy.

Interactive demo notes (from the author's sketch for this class): a CPU requesting a sequence of values (for example A0..A5) shown against the hierarchy levels, with the visual message "fast and costly per bit at the top, large capacity and high latency at the bottom". Show **spatial locality** (nearby values copied up together, for example 4 L1 hits after one fill) and a **miss** before a lower level (L2) supplies the value. A "Found at" indicator for each access (Registers, L1, L2, L3, DRAM, Storage) and an access **pattern** switch: repeated, nearby, scattered.

### Class 18: Cache organization
Teach: cache block; cache line; tag; index; offset; hit/miss; direct mapped; fully associative; set associative. Contains lots of numerical exercises.
Reading: COD Ch. 5.

### Class 19: Cache performance
Teach: three important misses (compulsory, capacity, conflict). Then hit time; miss rate; miss penalty; AMAT; larger block size; higher associativity; multi-level cache; write-through; write-back.
Reading: COD Ch. 5; CAQA Ch. 5.

### Class 20: Main memory and virtual memory
Teach first: SRAM; DRAM; main memory; memory bandwidth; memory latency. Then virtual address; physical address; page; page table; TLB; page fault; demand paging; protection.
Students should understand the path: virtual address -> TLB -> page table -> physical address -> RAM.
Reading: COD Ch. 5.

## Part 6: Storage and I/O

### Class 21: Storage systems and I/O
Teach: HDD; SSD; flash; storage hierarchy; sequential vs random access; I/O devices; I/O latency; I/O bandwidth; I/O performance.
Reading: COD I/O/storage chapter; CAQA Ch. 6.

### Class 22: Buses, reliability and RAID
Teach: buses (data, address, control, bus bandwidth); reliability (reliability, availability, MTBF, MTTR); RAID (RAID 0, 1, 5, 6, 10).
Practical scenario: "You are designing storage for a banking database. Which RAID configuration would you choose and why?"
Reading: CAQA Ch. 6.

## Part 7: Multiprocessors

### Class 23: Multicore and shared-memory multiprocessors
Teach: why multiple processors; multicore CPUs; shared-memory architecture; centralized shared memory; distributed shared memory; cache coherence; synchronization; race conditions; locks; atomic operations.
Reading: COD multiprocessor/parallel processing chapter; CAQA Ch. 8.

### Class 24: Vector processing, RISC/x86 and review
A **survey and integration** class, not a class of heavy new material.
- Vector processing: scalar vs vector; vector registers; SIMD; applications.
- RISC architectures: MIPS; RISC-V; ARM; RISC principles.
- Intel x86: 8086 to modern x86-64; CISC; variable-length instructions; registers; modern x86 processors.
Reading: appendices / ISA chapters (COD + CAQA).

## Build status

| Syllabus class | Status |
| --- | --- |
| 1 | Built: `01-introduction-to-computer-architecture` (architecture vs organization, components, buses overview, below your program, instruction execution overview, design goals, the architect and the eight great ideas) |
| 2 | Built: `02-technology-trends-moores-law-performance` (transistors and ICs, die cost and yield, Moore's Law and CPU evolution, memory and storage technology, power and the clock-speed stall, multicore) |
| 3 | Built: `03-quantitative-principles-performance-measurement` (problem-solving class: response time, throughput, speedup, elapsed vs CPU time, the CPU equation, Amdahl's Law, quantitative principles, benchmarks and the MIPS pitfall) |
| 4 | Built: `04-isa-fundamentals-risc-vs-cisc` (what an ISA is, instruction classes and operands, stack/accumulator/register-memory/load-store, registers, RISC vs CISC, MIPS examples) |
| 5 | Built: `05-mips-instructions-registers-operands` (MIPS operations, registers, register vs memory operands, immediates, simulator practice) |
| 6 | Built: `06-addressing-modes-memory-access` (addressing modes, lw/sw address calculation, alignment, big vs little endian) |
| 7 | Built: `07-instruction-encoding-assembly` (R, I and J formats, encoding and decoding by hand, branch offsets and jump targets, encoder demo) |
| 8 | Built: `08-branches-procedures-high-level-code` (if, if-else, while, for, arrays, jal/jr, the stack, register spilling) |
| 9 | Built: `09-computer-arithmetic-floating-point` (two's complement, add/subtract, overflow, shift-add multiply, restoring division, IEEE 754) |
| 10 | Built: `10-datapath-single-cycle-cpu` (components, build-up diagram, add/lw/sw/beq scenarios, control signals, clock cycle time) |
| 11 | Built: `11-multi-cycle-datapath-control` (why not single-cycle, IR/MDR/A/B/ALUOut, multi-cycle datapath diagram, control FSM diagram, single vs multi calculator) |
| 12 | Built: `12-pipelining-fundamentals` (five stages, pipeline registers, timing diagrams, latency vs throughput, ideal speedup, unbalanced stages) |
| 13 | Built: `13-pipeline-hazards` (structural, data and control hazards, RAW/WAR/WAW, stalls and bubbles, forwarding, load-use, flush, predict not taken) |
| 14 | Built: `14-ilp-advanced-pipelining` (ILP, IPC, superscalar issue width, static vs dynamic scheduling, loop unrolling, dependences and limits) |
| 15 | Built: `15-dynamic-scheduling-out-of-order` (in-order vs out-of-order, reservation stations, simplified Tomasulo diagram, register renaming) |
| 16 | Built: `16-branch-prediction-speculation` (branch penalty and CPI, static prediction, 1-bit and 2-bit predictors, aliasing table exercise, BTB, speculative execution) |
| 17 | Built: `17-memory-hierarchy-locality` (why a hierarchy, levels, temporal and spatial locality, hierarchy and cache demos, average access time preview) |
| 18 | Built: `18-cache-organization-mapping` (tag/index/offset, direct-mapped, set-associative, fully associative, LRU, tag bits and storage; many numerical exercises) |
| 19 | Built: `19-cache-performance` (three Cs, hit time, miss rate, miss penalty, AMAT, two-level AMAT, block size and associativity trade-offs, write-through vs write-back) |
| 20 | Built: `20-main-memory-virtual-memory` (SRAM/DRAM, latency and bandwidth, pages and page tables, TLB, page faults, demand paging, protection, translation-path diagram) |
| 21 | Built: `21-storage-systems-io` (HDD access time, SSD and flash, sequential vs random, I/O latency, bandwidth and IOPS, DMA, storage hierarchy, Amdahl for I/O). COD reading unconfirmed; CAQA Ch. 6 used |
| 22 | Built: `22-buses-reliability-raid` (data/address/control buses and bandwidth, MTTF/MTTR/availability, RAID 0, 1, 5, 6, 10, parity, banking-database scenario) |
| 23 | Built: `23-multiprocessors-shared-memory` (why multicore, Amdahl, UMA and NUMA diagrams, MSI coherence demo, race condition and lock demo, atomic operations) |
| 24 | Built: `24-vector-risc-x86-review` (SIMD, MIPS vs RISC-V vs ARM, x86 history and CISC, course-wide review and concept map) |

All 24 classes are built.

## Open questions for the author

1. **Class 21 and 22 reading.** COD 5th edition has no storage chapter; confirm the reading for these classes (CAQA Ch. 6 plus any COD sections the author prefers).
2. Resolved: Classes 2 and 3 are sliced as in this syllabus. Resolved: editions (COD 5th, MIPS; CAQA 2nd). Instruction set: MIPS (inferred from the MIPS Edition; confirm).
