# Smart Learning

Slide-based courses (Java, Computer Architecture). Static site, no database, deployed to GitHub Pages.
Every page is encrypted with one shared password (StatiCrypt); learners enter it in the browser.

## Add content
1. Add a topic to `content/courses.json`.
2. Write slides in `content/<course>/<topic>.md` (`---` separates slides, `Note:` starts speaker notes).

## Build / preview locally
    cp .env.example .env      # set ACCESS_PASSWORD
    npm install
    npm run build && npm start   # http://localhost:8080

## Deploy
Keep this repo **private**: `content/` holds the plaintext slides. Only the encrypted `dist/` is published.
In GitHub: Settings > Secrets > Actions > add `ACCESS_PASSWORD`; Settings > Pages > Source = GitHub Actions.
(Pages from a private repo needs a paid GitHub plan. On the free plan, build locally and push only `dist/` to a separate public repo.)
Change the password = change the secret and redeploy. Keep `.staticrypt.json` (the salt) committed so "remember me" survives redeploys.
# smart-learning
