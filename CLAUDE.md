# Smart Learning

Password-protected teaching site (Java, Computer Architecture, more courses later). Static site, no database, deployed to GitHub Pages. Every page is encrypted with one shared password at build time (StatiCrypt), so the repo must stay **private**: `content/` holds plaintext lessons.

## When the user gives a topic

**Use the `new-lesson` skill: read `.claude/skills/new-lesson/SKILL.md` and follow it.** The author's standing lesson spec is `docs/lesson-spec.md` and applies to every topic. For **Computer Architecture** topics also read `docs/computer-architecture-spec.md` (the author's course brief: required interactive demos, predict-before-reveal, teacher tools, exam practice); it wins over the general spec where they differ. Never ask the user to paste or restate either spec. The user normally gives only a topic (and sometimes course, level, duration, objectives); apply the defaults in the skill for anything missing.

A topic becomes `content/<course>/<NN-topic>.lesson.json` (interactive lesson: presentation mode, questions, practice, quiz, report) plus an entry in `content/courses.json` with `"type": "lesson"`. Older topics may still be plain Markdown slides (Reveal.js), which is the default when `type` is absent.

## Commands

- `npm run check` validates lesson JSON (fast, no password needed)
- `npm run build` validates, builds and encrypts into `dist/` (needs `ACCESS_PASSWORD` in `.env`)
- `npm start` serves `dist/` at http://localhost:8080

## QR codes

Each lecture has a QR code, and each lecture's quiz has its own that opens the quiz section directly (`page.html#s=quiz`). Codes are built in the browser (`assets/qr.js`, `vendor/qrcode.js`). Set `PUBLIC_URL` (site root, for example `https://name.github.io/repo/`) so the codes work from anywhere; the deploy workflow sets it automatically. On `localhost` the QR dialog warns and lets the teacher type the public address.

## Layout

- `assets/lesson.js`, `assets/lesson.css`: the shared lesson engine. Lessons are data; do not fork the engine per topic.
- `lesson-validate.js`: enforces the spec (errors fail the build, warnings flag drift)
- `build.js`: renders the home page, lesson pages and slides, then encrypts
- `templates/`: login page and loader. `.staticrypt.json` holds the salt: keep it committed and unchanged.

## Working rules

- Verify visually before saying a page works (headless Chrome on a decrypted copy of the built page). Passing `npm run check` is not enough.
- Do not commit or push unless asked. Never commit `.env`.
- Teacher notes live inside the encrypted page but anyone with the password can read them.
