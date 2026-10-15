# CellMates 🦠

A cute virology game for the browser, and the sister game to [PetriPals](https://github.com/jessicasogge/petripals) and [FunGals](https://jessicasogge.github.io/fungals/). Bacteria and fungi grow on agar in a petri dish, but viruses can't: they need a living cell. Pick a real virus, find the cells with your receptor, take them over and burst out to spread across a cell culture flask.

**Status:** a playable prototype: three levels with Flo, the flu virus. See the [design doc](docs/design.md) for the bigger plan.

<img src="docs/flask.png" alt="Flo, a smiling pink flu virus, floating over a flask of hexagonal cells. Cells with teal bumps have her receptor. Around her, a few cells are empty, a few have yellow outlines, small copies of her drift about, and two blue antibody clouds sit on the flask" width="300">

## How to play

1. **Steer Flo.** Use the arrow keys, or on a touch screen, touch the flask and slide your finger, just like PetriPals.
2. **Get into cells with teal bumps.** That's her receptor; the plain cells won't let her in. Steer onto one and she gets in. A moment later, the cell releases her with copies of her, and leaves a clear hole (a plaque).
3. **Let the copies spread.** They drift off and get into cells nearby on their own.
4. **Watch for warned cells.** A cell that releases copies warns its neighbors (a **yellow outline**). Copies can't get into a warned cell. Flo can, but it takes her twice as long. So when the spreading stalls, steer Flo somewhere fresh.
5. **Don't touch the antibodies.** The blue clouds keep spreading the whole level, so the longer you take, the less room there is. If Flo touches one, the game is over, and copies that drift in are stopped.

Take the level's number of cells to win. There are three levels, and each adds an antibody cloud.

### The real science

Flu really is grown in flasks of cells, and virologists count the clear holes it leaves, called **plaques**. Infected cells really do warn their neighbors with **interferon**, and **antibodies** really do stop a virus by sticking to its spikes. Two game liberties: real viruses can't swim (they drift), and real cells release hundreds of copies, over hours, not four in a second.

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
| `public/game/flask.js` | The game itself, with no drawing: steering, getting into cells, copies spreading, warnings and antibodies |
| `public/game/hex.js` | The hexagonal grid of cells |
| `public/game/draw.js` | Drawing the flask on a canvas |
| `public/game/pals.js` | Every pal's name and drawing, in one place. So far: Tess (phage T4), Flo (influenza A), Rota (rotavirus) and Cora (coronavirus) |
| `public/game/` | Also game code carried over from PetriPals: steering with the arrow keys (`keyboard.js`) and by touch or mouse (`touch.js`), the fun-fact pop-up (`facts.js`, with italics for scientific names from `italics.js`), and the win confetti (`spores.js`, using canvas-confetti in `vendor/`) |
| `docs/design.md` | The design doc |
| `test/` | Tests |
| `scripts/simulate.mjs` | Plays each level hundreds of times with a simple computer player, to help tune `config.js` (`node scripts/simulate.mjs`) |
| `src/index.ts` | Small Express server for local development |

## Deployment

Every push to `main` runs the tests and the coverage check and, if they pass, publishes `public/` to GitHub Pages (see [`.github/workflows/pages.yml`](.github/workflows/pages.yml)). Turn on Pages for the repo first, with GitHub Actions as the source.

## Contributing

Bug reports, ideas and fixes are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started, and please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

CellMates is released under the [MIT License](LICENSE). The confetti uses [canvas-confetti](https://github.com/catdad/canvas-confetti), which is ISC licensed ([`public/game/vendor/confetti.LICENSE`](public/game/vendor/confetti.LICENSE)). The home page uses the [Fredoka](https://github.com/hafontia/Fredoka-One) and [Nunito](https://github.com/googlefonts/nunito) fonts, under the SIL Open Font License ([`public/fonts/`](public/fonts/)).

## Credits

Made by Jessica Sogge.
