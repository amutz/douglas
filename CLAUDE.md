# About This Project

This is a **fun web game** built with regular web technology — HTML, CSS,
and JavaScript. No fancy build tools or frameworks unless they're really
needed. Keep things simple so the game just works when someone opens it
in a browser.

The game is hosted for free using **GitHub Pages**, which means whatever
is in this repository (on the `main` branch) becomes a live website that
anyone can play in their browser.

# Who's Working On This

I'm not a professional software engineer — I just want to build a fun game.
Please:

- Explain things in plain, simple language. Avoid jargon, or explain it
  the first time you use it.
- Don't assume I know git commands, terminal tricks, or dev tools.
- Prefer simple, easy-to-understand code over clever or complicated code.
- If there's a simple way and a "correct but complicated" way to do
  something, pick the simple way unless there's a good reason not to.

# How We Work With Git

- We only use **one branch: `main`**. There are no other branches to
  worry about.
- Always commit changes directly to `main` and push them there.
- Don't create pull requests, feature branches, or anything like that
  unless I specifically ask for it.
- Write short, plain-English commit messages that describe what changed,
  like "Add jump sound effect" or "Fix player falling through floor."

# How the Game Gets Deployed

- This project is deployed with **GitHub Pages**.
- GitHub Pages serves the files straight from the `main` branch — there is
  no separate build or deploy step to run. Pushing to `main` is the
  deployment.
- That means: once something is pushed to `main`, it goes live on the
  website. Only push things that are actually ready to be seen/played.
- The game should be playable by just opening `index.html` in a browser
  — no server setup, no installs, no build commands required.

# Coding Guidelines

- Keep the game as plain HTML/CSS/JavaScript files whenever possible.
- Avoid adding new libraries, frameworks, or build tools unless they
  clearly solve a real problem — more tools means more things that can
  break or confuse things.
- Keep files organized simply, for example:
  - `index.html` – the main page that loads the game
  - `style.css` – how things look
  - `game.js` (or similar) – the game logic
  - `assets/` – images, sounds, fonts, etc.
- Add short comments in the code only when something is tricky or
  non-obvious — not to explain every line.

# Testing Changes

- Before committing, make sure the game actually works by opening
  `index.html` in a browser (or running a simple local server) and
  playing through it.
- Since everything pushed to `main` goes live immediately, double-check
  that changes don't break the game before pushing.
