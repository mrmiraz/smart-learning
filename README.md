# Smart Learning

Slide-based courses (Java, Computer Architecture). Static site, no database, deployed to GitHub Pages.
Every page is encrypted with one shared password (StatiCrypt); learners enter it in the browser.

## Add a topic (interactive lesson)
Just tell Claude Code the topic (course, level, duration and objectives are optional). The lesson rules live in
`docs/lesson-spec.md` and are applied automatically through `CLAUDE.md` and the `new-lesson` skill, so you never
paste the brief again. A topic becomes `content/<course>/<topic>.lesson.json`; the shared engine
(`assets/lesson.js`) provides presentation mode, questions, practice, quiz and the learning report.
`npm run check` validates a lesson against the spec. Examples: `content/computer-architecture/03-quantitative-principles-performance-measurement.lesson.json`, `docs/examples/cpu-basics.lesson.json`.

## Add plain Markdown slides (older style)
1. Add a topic to `content/courses.json`.
2. Write slides in `content/<course>/<topic>.md` (`---` separates slides, `Note:` starts speaker notes).

## Build / preview locally
    cp .env.example .env      # set ACCESS_PASSWORD
    npm install
    npm run build && npm start   # http://localhost:8080

## QR codes
Every lecture and every quiz has a QR code (press `L` in a lesson, or use the **QR** button next to a topic on the home page). Scanning the quiz code opens the quiz directly. The codes use the address the page is opened at; on `localhost` they would only work on your computer, so type the real address into the QR dialog, or set `PUBLIC_URL` (the GitHub Pages workflow does this for you).

## Deploy
Keep this repo **private**: `content/` holds the plaintext slides. Only the encrypted `dist/` is published.
In GitHub: Settings > Secrets > Actions > add `ACCESS_PASSWORD`; Settings > Pages > Source = GitHub Actions.
(Pages from a private repo needs a paid GitHub plan. On the free plan, build locally and push only `dist/` to a separate public repo.)
Change the password = change the secret and redeploy. Keep `.staticrypt.json` (the salt) committed so "remember me" survives redeploys.
# smart-learning
