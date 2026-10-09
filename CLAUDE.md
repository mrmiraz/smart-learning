# Smart Learning

Password-protected teaching site (Java, Computer Architecture, more courses later). Static site, no database, deployed to GitHub Pages. Every page is encrypted with one shared password at build time (StatiCrypt), so the repo must stay **private**: `content/` holds plaintext lessons.

## When the user gives a topic

**Use the `new-lesson` skill: read `.claude/skills/new-lesson/SKILL.md` and follow it.** The author's standing lesson spec is `docs/lesson-spec.md` and applies to every topic. For **Computer Architecture** topics also read `docs/computer-architecture-spec.md` (the author's course brief: required interactive demos, predict-before-reveal, teacher tools, exam practice); it wins over the general spec where they differ. **For a class number or topic from the 24-class syllabus, read its entry in `docs/course-plans/computer-architecture.md` and cover exactly its Teach list**, using its Reading line for `references` and its demo notes where given. Editions: COD 5th edition (MIPS Edition, 2013) and CAQA 2nd edition; examples use MIPS. Also read `docs/computer-architecture-references.md` (the two reference books, how to use them without copying, and the chapter map). Never ask the user to paste or restate either spec. The user normally gives only a topic (and sometimes course, level, duration, objectives); apply the defaults in the skill for anything missing.

A topic becomes `content/<course>/<NN-topic>.lesson.json` (interactive lesson: presentation mode, questions, practice, quiz, report) plus an entry in `content/courses.json` with `"type": "lesson"`. Older topics may still be plain Markdown slides (Reveal.js), which is the default when `type` is absent.

## Languages (English + Bangla, more later)

The site is bilingual and the visitor can switch at any time. **Never hard-code user-visible text**: interface strings go through `t('key')` (`assets/i18n.js`, `kit.t` in demo blocks, `data-i18n` in static HTML) and live in `locales/en.json` + `locales/bn.json` (add both; `npm run check` fails on missing keys in code and on placeholder mismatches). Lessons are written in English first, then translated to Bangla as `<topic>.lesson.bn.json` with `scripts/lesson-i18n.js` (extract, translate the values, apply), and the topic title goes into `content/courses.bn.json`. A translated lesson must keep the original's structure exactly (the validator enforces it). Adding a language = new `locales/<code>.json` plus optional content files, no code change. Rules, style and workflow: `docs/languages.md` (read it when touching anything language-related).

## Design rules (apply to every page and every change, without being asked)

- **Small screens first-class.** Every page and component must work at 360-375px wide (phones) as well as desktop: no horizontal page scroll, no clipped or overlapping content, no text squeezed into a narrow column, tap targets about 36px or more. Check at 360px and 375px (headless Chrome with a mobile viewport) before saying a UI change is done, in both English and Bangla (Bangla text is longer and taller), and fix what you find; never wait to be told. `scripts/responsive-audit.js` sweeps every page and every lesson screen for overflow.
- **Small-screen patterns already in use** (reuse them): top bars collapse into a three-dot (⋮) menu (Home, courses, theme, QR) while the language switcher stays visible beside it; a lesson's top bar becomes two rows (back, language, ⋮ on top; the section tabs full width below); the lesson toolbar becomes two rows (playback and status, then tools scrolling sideways); grids and flow cards reflow with `minmax(0, 1fr)` / `auto-fit`, never fixed widths; popups use `min(94vw, ...)` widths and stay inside the viewport.
- **Both languages and both themes.** New UI is checked in English and Bangla, and in light and dark mode. Long Bangla strings must wrap, not overflow.
- **Home shows courses only**; a course's topics live on its own page (`courses/<id>.html`). The Courses menu lists courses, not topics.

## Commands

- `npm run check` validates lesson JSON, translations and the language files (fast, no password needed)
- `npm run build` validates, builds and encrypts into `dist/` (needs `ACCESS_PASSWORD` in `.env`)
- `npm start` serves `dist/` at http://localhost:8080

## QR codes

Each lecture has a QR code, and each lecture's quiz has its own that opens the quiz section directly (`page.html#s=quiz`). Codes are built in the browser (`assets/qr.js`, `vendor/qrcode.js`). Set `PUBLIC_URL` (site root, for example `https://name.github.io/repo/`) so the codes work from anywhere; the deploy workflow sets it automatically. On `localhost` the QR dialog warns and lets the teacher type the public address.

## Layout

- `assets/lesson.js`, `assets/lesson.css`: the shared lesson engine. Lessons are data; do not fork the engine per topic.
- `assets/i18n.js` (language runtime, switcher), `assets/home.js` (home page), `locales/*.json` (interface text per language), `locales-lib.js`, `scripts/i18n-check.js`, `scripts/lesson-i18n.js`
- `lesson-validate.js`: enforces the spec (errors fail the build, warnings flag drift)
- `build.js`: renders the home page, lesson pages and slides, then encrypts
- `templates/`: login page and loader. `.staticrypt.json` holds the salt: keep it committed and unchanged.

## Working rules

- Verify visually before saying a page works (headless Chrome on a decrypted copy of the built page). Passing `npm run check` is not enough.
- Do not commit or push unless asked. Never commit `.env`.
- Teacher notes live inside the encrypted page but anyone with the password can read them.
