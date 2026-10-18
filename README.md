# CellMates 🦠

A cute virology game for the browser, and the sister game to [PetriPals](https://github.com/jessicasogge/petripals) and [FunGals](https://jessicasogge.github.io/fungals/). Bacteria and fungi grow on agar in a petri dish, but viruses can't: they need a living cell. Pick a real virus, find the cells with your receptor, take them over and burst out to spread across a cell culture flask.

**Status:** a playable prototype: five levels with Flo, the flu virus. See the [design doc](docs/design.md) for the bigger plan.

<img src="docs/flask.png" alt="Flo, a smiling pink flu virus, steering through a flask of hexagonal cells with a trail of small copies behind her. A few cells have teal bumps, burst cells pop with a “×10!” streak, warned cells have yellow outlines, and blue antibody clouds sit on the flask" width="300">

## How to play

Steer Flo with the arrow keys (or slide your finger on the flask). Touch the cells with teal bumps, and don't touch the antibodies!

- **Flo never stops.** Steering over a cell with teal bumps (her receptor) infects it on the way past. About a third of cells have it, so pick your route.
- **Bursts grow your trail.** A moment later, the cell bursts with a pop and releases copies of Flo, which follow behind her in a trail. Copies peel off to grab teal cells near the trail, and each cell they take bursts with one more copy.
- **Chain them.** Bursts close together build a streak (×3!, ×4!…). Your best streak shows when you win.
- **Watch for warned cells.** A burst warns its neighbors (a **yellow outline**). Copies skip them, and they take Flo twice as long.
- **Don't touch the antibodies.** The blue clouds grow for a few seconds, then stop. If Flo touches one, you lose; copies that fly in are lost.

Take the level's share of the open teal cells to win. There are five levels, each with more and bigger antibody clouds.

### The real science

Flu really is grown in flasks of cells, and virologists count the clear holes it leaves, called **plaques**. Infected cells really do warn their neighbors with **interferon**, and **antibodies** really do stop a virus by sticking to its spikes. Three game liberties: real viruses can't swim (they drift), real copies don't follow their parent in a line, and real cells release hundreds of copies over hours, not two in a second.

## Running it locally

The game is plain HTML, CSS and JavaScript in [`public/`](public/), with no build step. To run it with the included dev server:

```sh
npm install
npm run dev
```

Then open http://localhost:3000.

## Tests

```sh
npm test                # run the tests
npm run test:coverage   # run them and check how much of the game they cover
```

The tests use [Vitest](https://vitest.dev/), and most run in [jsdom](https://github.com/jsdom/jsdom), a simulated browser page. The coverage check fails if the tests leave game code untested (the thresholds are in [`vitest.config.js`](vitest.config.js)), and the deploy runs it, so untested code doesn't ship.

## Project layout

| Path | What's there |
|---|---|
| `public/index.html` | Home page, with its row of pals drawn by `script.js` |
| `public/flask.html` | The game page; `game/play.js` runs it |
| `public/game/config.js` | The numbers the game is built on: the flask, Flo, the cells and the levels |
| `public/game/flask.js` | The game itself, with no drawing: steering, infecting cells, bursts, the trail of copies, streaks, warnings and antibodies |
| `public/game/hex.js` | The hexagonal grid of cells |
| `public/game/draw.js` | Drawing the flask on a canvas |
| `public/game/pals.js` | Every pal's name and drawing, in one place. So far: Tess (phage T4), Flo (influenza A), Rota (rotavirus) and Cora (coronavirus) |
| `public/game/` | Also game code carried over from PetriPals: steering with the arrow keys (`keyboard.js`) and by touch or mouse (`touch.js`), the fun-fact pop-up (`facts.js`, with italics for scientific names from `italics.js`), and the win confetti (`spores.js`, using canvas-confetti in `vendor/`) |
| `docs/design.md` | The design doc |
| `test/` | Tests |
| `scripts/simulate.mjs` | Plays each level hundreds of times with a perfect and a human-like computer player, to help tune `config.js` (`node scripts/simulate.mjs`) |
| `src/index.ts` | Small Express server for local development |

## Deployment

Every push to `main` runs the tests and the coverage check and, if they pass, publishes `public/` to GitHub Pages (see [`.github/workflows/pages.yml`](.github/workflows/pages.yml)). Turn on Pages for the repo first, with GitHub Actions as the source.

## Contributing

Bug reports, ideas and fixes are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started, and please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

CellMates is released under the [MIT License](LICENSE). The confetti uses [canvas-confetti](https://github.com/catdad/canvas-confetti), which is ISC licensed ([`public/game/vendor/confetti.LICENSE`](public/game/vendor/confetti.LICENSE)). The home page uses the [Fredoka](https://github.com/hafontia/Fredoka-One) and [Nunito](https://github.com/googlefonts/nunito) fonts, under the SIL Open Font License ([`public/fonts/`](public/fonts/)).

## Credits

Made by Jessica Sogge.
