# Match Point — portfolio

A multi-page portfolio themed as a tennis match, with code and music mixed in. Plain HTML, CSS and JS: no framework and no build step.

| Page | File | Theme |
|---|---|---|
| Center Court | `index.html` | Hero + playable mini rally game |
| Player Profile | `about.html` | Flippable trading card, career "in sets" |
| Match Records | `projects.html` | Projects as match results, filter by surface |
| The Studio | `skills.html` | Skills as a mixing desk + typing terminal |
| Press Room | `contact.html` | Contact form as a press conference |

## Run locally
```bash
python -m http.server 5173
```
Then open http://localhost:5173.

## The game layer
- Each new page visited wins a point: LOVE → 15 → 30 → 40 → AD → GAME (score bug in the header).
- One hidden tennis ball ("ace") on every page.
- 8 achievements: click the score bug to see them.
- Walkman (bottom-right) plays a procedural lo-fi loop made with the Web Audio API.
- Secret: ↑ ↑ ↓ ↓ ← → ← → B A switches to a clay court.

## Make it yours
- **Projects:** edit the `<article class="project">` blocks in `projects.html` (`data-surface` = `hard` | `clay` | `grass`).
- **Skills:** in `skills.html`, `--v` on each `.channel` is the level (0–100).
- **Email:** change `data-to` on the form and the mailto link in `contact.html`.
- **Socials:** the `.sponsor` links in `contact.html`.
- **Colours:** tokens at the top of `css/style.css`.
