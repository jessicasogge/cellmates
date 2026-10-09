# CellMates 🦠

A cute virology game for the browser, and the sister game to [PetriPals](https://github.com/jessicasogge/petripals) and [FunGals](https://jessicasogge.github.io/fungals/). Bacteria and fungi grow on agar in a petri dish, but viruses can't: they need a living cell. Pick a real virus, find the cells with your receptor, take them over and burst out to spread across a cell culture flask.

**Status:** v1, with one mate and one mode. See the [design doc](docs/design.md) for the plan.

## How to play

1. **Press Start**, then pick a mate. For now that's Flo, an influenza A virus.
2. **Drift around the flask** with the arrow keys, or on a touch screen, by touching the flask and sliding your finger.
3. **Find cells with the teal dot.** That's the receptor Flo's spikes fit, like a key in a lock. The other cells have locks for other viruses: a gray square, a gold ring, a purple triangle or an orange diamond. Those are walls, so the flask is a maze: Flo can only move over cells with her dot and patches where cells have burst.
4. **Copy and burst.** Drift onto a cell and Flo slips inside. The cell makes copies of her, then bursts, and the copies take over the matching cells next door, which burst too.
5. **Dodge the antibodies.** Their clouds spread out from a few drops and slowly creep after Flo. Touch one and she's neutralized.

Burst enough cells to clear the level: 10, then 15, 20, 25 and 30. Each level adds another antibody.

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
| `public/index.html` | Home page, with its row of mates drawn by `script.js` and the Press Start to Play button |
| `public/pick.html` | Pick a mate (just Flo so far), drawn by `game/pick.js` |
| `public/flask.html` | The game, laid out like PetriPals' dish page, with how to play under the flask: the flask (`game/main.js`), with the rules in `game/flask.js` and the sheet of cells in `game/hexgrid.js` |
| `public/game/mates.js` | Every mate's name, drawing and details, in one place; `PLAYABLE` lists who you can play as. So far: Tess (phage T4), Flo (influenza A), Rota (rotavirus) and Cora (coronavirus) |
| `public/game/` | Game code carried over from PetriPals: steering with the arrow keys (`keyboard.js`) and by touch or mouse (`touch.js`), the fun-fact pop-up (`facts.js`, with italics for scientific names from `italics.js`), and the win confetti (`spores.js`, using canvas-confetti in `vendor/`) |
| `docs/design.md` | The design doc |
| `test/` | Tests |
| `src/index.ts` | Small Express server for local development |

## Deployment

Every push to `main` runs the tests and the coverage check and, if they pass, publishes `public/` to GitHub Pages (see [`.github/workflows/pages.yml`](.github/workflows/pages.yml)). Turn on Pages for the repo first, with GitHub Actions as the source.

## Contributing

Bug reports, ideas and fixes are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started, and please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

CellMates is released under the [MIT License](LICENSE). The confetti uses [canvas-confetti](https://github.com/catdad/canvas-confetti), which is ISC licensed ([`public/game/vendor/confetti.LICENSE`](public/game/vendor/confetti.LICENSE)). The home page uses the [Fredoka](https://github.com/hafontia/Fredoka-One) and [Nunito](https://github.com/googlefonts/nunito) fonts, under the SIL Open Font License ([`public/fonts/`](public/fonts/)).

## Credits

Made by Jessica Sogge.
