# Languages (English and Bangla, more later)

Every page can be switched between languages at any time (switcher on the home page, login page, lesson cover, lesson top bar and
slide pages; key `G` inside a lesson). The choice is remembered per browser. `?lang=bn` on any page address opens it in that
language. Nothing is hard-coded: a language is a set of files, and a missing translation falls back to the default language, so
a language can be added and filled in gradually.

## What lives where

| What | English (default) | Another language `xx` |
| --- | --- | --- |
| Interface text (buttons, labels, messages, demos, login, QR dialog) | `locales/en.json` | `locales/xx.json` |
| Course and topic titles | `content/courses.json` | `content/courses.xx.json` |
| Interactive lesson | `content/<course>/<id>.lesson.json` | `content/<course>/<id>.lesson.xx.json` |
| Markdown slide lesson (older Java topics) | `content/<course>/<id>.md` | `content/<course>/<id>.xx.md` |

The default language is the one whose `_meta` has `"default": true` (English). Lesson ids, types, code, formulas, MIPS programs and
numbers never change between languages; only wording does. `npm run check` enforces that (a translated lesson must have exactly the
same structure as the original).

## Add a language (for example Hindi, `hi`)

1. Copy `locales/en.json` to `locales/hi.json`, set `_meta` (`name` shown on the switcher, `short`, `htmlLang`, `dir`, `numerals`),
   and translate the values. Keep `{placeholders}`, `**bold**` and `` `code` `` marks as they are. Keys ending `_one` / `_other` are
   plural forms (CLDR categories of that language: Bangla needs only `_other`).
2. Optional, in any order: `content/courses.hi.json`, then lessons (below). Untranslated parts show in English.
3. If the script needs a particular font, add an `html[lang="hi"]` rule in `assets/i18n.css`. A right-to-left language also needs
   `"dir": "rtl"` and a pass over `assets/*.css` (the styles use left and right in places).
4. `npm run check`, then `npm run build`. No code change is needed: the build finds `locales/*.json` by itself.

## Translate a lesson

```
node scripts/lesson-i18n.js extract content/<course>/<id>.lesson.json strings.json   # every translatable string by position
# translate the values in strings.json (keep the keys), leaving things like code, "MIPS" mnemonics and numbers alone
node scripts/lesson-i18n.js apply   content/<course>/<id>.lesson.json bn strings.json # writes <id>.lesson.bn.json
node scripts/lesson-i18n.js status                                                      # which lessons have which languages
npm run check
```

`apply` refuses a translation that breaks `{placeholders}` or `` `code` `` spans, and the result is validated against the original.
Strings left out of `strings.json` stay in English. When the English lesson changes, redo `extract` and translate what changed (the
structure check catches added or removed screens, questions and options, but not reworded sentences).

## Style for the Bangla interface and lessons

- Plain classroom Bangla for university students. Address the learner as আপনি, or avoid the pronoun with imperatives.
- Keep widely used technical terms as they are taught: CPU, cache, pipeline, register, instruction, bit, byte, MIPS, ISA, RISC.
  Give a Bangla explanation the first time where it helps, in plain text, not in brackets everywhere.
- Digits stay 0-9 (`"numerals": "latn"` in `_meta`) so numbers match code, tables and diagrams. Change `numerals` to `"beng"` to show ০-৯
  in interface numbers.
- Keep the short, direct tone of the English buttons and feedback.

Glossary (keep these renderings the same in every lesson and in `locales/bn.json`; extend the list as new terms appear):

| English | Bangla |
| --- | --- |
| computer architecture / architecture | কম্পিউটার আর্কিটেকচার / আর্কিটেকচার |
| organization (contrasted with architecture) | অর্গানাইজেশন |
| performance, throughput, execution time | পারফরম্যান্স, থ্রুপুট, এক্সিকিউশন টাইম |
| cost, reliability | খরচ, নির্ভরযোগ্যতা |
| instruction set, machine code | ইন্সট্রাকশন সেট, মেশিন কোড |
| fetch / decode / execute | ফেচ / ডিকোড / এক্সিকিউট |
| address / data / control bus | অ্যাড্রেস / ডেটা / কন্ট্রোল বাস |
| program counter | প্রোগ্রাম কাউন্টার |
| student, teacher, programmer | শিক্ষার্থী, শিক্ষক, প্রোগ্রামার |
| true / false | সত্য / মিথ্যা |
| trade-off | ট্রেড-অফ |
| memory | মেমরি (lesson text); stage names in diagrams: ফেচ / ডিকোড / এক্সিকিউট / মেমোরি / রাইট ব্যাক |
| pseudo-direct, alignment, endian | সিউডো-ডাইরেক্ট, অ্যালাইনমেন্ট, এন্ডিয়ান |
| overflow, carry | ওভারফ্লো, ক্যারি |
| yield, die, wafer | ইল্ড, ডাই, ওয়েফার |
| elapsed time, diminishing returns | ইলাপসড টাইম, ডিমিনিশিং রিটার্ন |
| Amdahl's Law | অ্যামডালের সূত্র |
| interrupt, polling | ইন্টারাপ্ট, পোলিং |
| striping / mirroring / parity | স্ট্রাইপিং / মিররিং / প্যারিটি |
| fault / error / failure | ফল্ট / এরর / ফেইলিওর |
| idle (table cells) | অলস |
| right / wrong | সঠিক / ভুল |
| Kept in English (inside Bangla sentences) | two's complement, sign bit, bias, significand, trap, spill, hit, miss, block, line, set, tag, index, offset, valid bit, associativity, LRU, taken / not taken, squash, commit, flush, alias, register file, data memory, multiplexer, critical path, finite-state machine, TLB, page, frame, latency, bandwidth. Hardware box labels, signal names (PC, ALUSrc, MemtoReg ...), state labels (S0, S3), MIPS mnemonics and units (cycles, ns, GB/s) also stay. Book chapter titles in `references` stay in English. |

## For developers

- Code never contains user-visible English. Use `t('key', { vars })` (`assets/i18n.js`; `kit.t` inside demo blocks; `data-i18n` and
  `data-i18n-attr` in static HTML). `npm run check` reports keys used in code but missing from `locales/en.json`, keys a language
  lacks, and `{placeholder}` mismatches.
- Pages with a lesson embed every language's lesson and switch in place, keeping the student's position and progress. Slide pages
  reload on a switch. Language-dependent text must be rendered again on `SL.onChange`.
- Key naming: `area.name` (`quiz.next`, `demo.cache.reset`). Static HTML text carries `data-i18n` so it re-translates in place.
