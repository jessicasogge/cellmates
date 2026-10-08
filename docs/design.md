# CellMates 🦠: design doc

*A sister game to PetriPals and FunGals, for viruses.*

**Status:** Draft concept, open for feedback
**Author:** Jessica Sogge

---

## 1. The pitch

PetriPals' bacteria and FunGals' fungi grow on agar in a petri dish. Viruses can't. A virus isn't a cell. It has no way to eat, grow or divide by itself, so the only way it can make more of itself is to get inside a living cell and make that cell build copies.

So in **CellMates** the board isn't a petri dish. It's a **cell culture flask**: a sheet of host cells growing one layer thick (a *monolayer*), the way virologists really grow viruses. Your pal drifts over the cells, finds one she can get into, takes it over, and bursts out as a crowd of new virions. Each cell that bursts leaves a clear hole called a **plaque**, and your plaques spread across the flask.

The tagline: *"Viruses can't grow on their own. They need a cell."*

## 2. Goals and non-goals

**Goals**

- Feel like a sibling of PetriPals and FunGals: same cartoon pals, same short rounds, same pop-up fun facts, same "the real science" honesty.
- Teach the virus life cycle by playing it: **attach → enter → copy → burst**. Players should come away knowing that a virus needs the *right* cell (receptors), that it doesn't divide but *assembles* many copies at once, and what a plaque is.
- Work on computers, phones and tablets, with no build step, like PetriPals.

**Non-goals**

- No people getting sick. The board is always a lab flask of cartoon cells, never a body. Fun facts can mention diseases (PetriPals does), but the game itself is about cells in a dish.
- No mutation or evolution sim. Flu's antigenic drift is a single pal gimmick, not a system.
- No accounts, scores or leaderboards.

## 3. The science the game is built on

| Real biology | In the game |
|---|---|
| Viruses only multiply inside a host cell | No nutrients. The board is made of cells, and cells are the food. |
| A virus can only enter a cell with the matching **receptor** on its surface (flu: sialic acid, coronaviruses: ACE2, adenovirus: CAR) | Each cell shows little receptor bumps. Only cells with your pal's shape of bump let her in. |
| After entry there's an **eclipse period**: no virus particles in sight while the cell copies the genome and builds parts | The infected cell glows and a ring fills up while the copies are made. |
| Copies are **assembled** and released all at once, often hundreds per cell (the **burst size**) | The cell pops and releases a handful of virions (scaled down to 3–8). |
| Dead cells leave a clear hole in the monolayer, a **plaque**, which grows as neighbors get infected | Burst cells stay empty. Your plaques grow and merge. |
| Infected cells release **interferon**, which warns neighbors to switch on antiviral defenses | Cells around a plaque can turn "shielded" and become harder to infect. |
| **Neutralizing antibodies** stick to a virus and stop it entering cells | Antibody clouds are Classic mode's hazard, like PetriPals' antibiotic zones. |
| Viruses have no flagella or legs; they drift by **Brownian motion** | Pals drift slowly with some wobble and inertia. They don't swim as freely as PetriPals do. |

**About the petri dish.** Viruses that infect bacteria (**bacteriophages**, or phages) *do* grow on petri dishes. Microbiologists spread a "lawn" of bacteria over the agar, add phages, and count the clear plaques the next day. That's a good crossover: see [Phage Lawn](#45-stretch-phage-lawn-crossover-with-petripals).

## 4. Gameplay

### 4.1 The flask

- The board is a rounded-rectangle **culture flask** (seen from above, with a cap at one end) in place of the round dish.
- Inside is a **hex grid of host cells**, each a soft hexagon with a nucleus, about 9–12 cells across on a phone.
- Each cell has a **receptor badge**: two to four bumps on its edge in one of a few shapes or colors (round, square, forked). Your pal's receptor is shown on her name card above the flask.

### 4.2 The core loop

1. **Drift.** You steer one *lead virion* (your pal). She moves at about 70% of a PetriPal's speed, with a little inertia and a gentle random wobble, so she feels like she's floating.
2. **Attach.** Touch a cell with your receptor and she docks (about 0.3 s). Touch a cell without it and she bumps off harmlessly.
3. **Copy (eclipse).** The cell glows in your pal's color and a ring around it fills up over about 2.5 s. Your lead virion is inside the cell for now. Your **other drifting virions** (see step 5) keep moving, and the camera follows the nearest one.
4. **Burst.** The cell pops with a little confetti puff (reusing `spores.js`) and releases your pal's **burst size** in new virions. The cell becomes an empty plaque tile.
5. **Spread.** One new virion becomes your lead and you steer it. The rest are **free virions**: they drift randomly and attach to any matching cell they bump into, so plaques spread on their own around each burst. Steering matters for *seeding new plaques* in fresh parts of the flask, away from the shielded cells and antibodies.

The counter shows **virions made** (every burst adds its burst size). Reaching the level's target wins.

### 4.3 Controls

The same controls as PetriPals, reused from `keyboard.js` and `touch.js`:

- **Arrow keys** on a computer.
- **Trackpad-style drag** on a touch screen: touch anywhere and slide, and she moves the same way.
- **Press and hold with a mouse** to drift toward the pointer.

The only change is that drift adds a small amount of inertia and wobble on top of the input.

### 4.4 Modes

These mirror PetriPals' three modes, plus one only viruses can have.

#### Classic: Immune Response

- **Hazard:** drops of **neutralizing antibody** placed on the flask, each with a cloud that spreads out over the first few seconds (the same diffusion curve as PetriPals' zones of inhibition, reused from `antibiotic.js`). If your lead virion touches a cloud, she's neutralized and the round ends. Free virions that drift into a cloud just vanish.
- **Passive pressure:** each burst has a chance to **shield** the healthy neighbors of the cell that burst (interferon). Shielded cells take twice as long to copy in, so a plaque slows down unless you seed a new one somewhere else.
- **Levels:** seven, like PetriPals. Each adds an antibody drop and doubles the target: 4, 8, 16 … 256 virions. Later levels also lower the share of cells that have your receptor (from about 80% down to about 40%), so you have to hunt for the right cells.

#### Coinfection (the Mixed Culture equivalent)

- Race one to three computer-steered rival viruses on one flask (rival steering adapted from `rival.js`: head for the nearest matching cell).
- **Superinfection exclusion:** a cell someone else has infected won't let anyone else in. It's a land grab.
- Every cell carries *every* racer's receptor so the race is fair. That's a game liberty (real viruses rarely share a host cell type), stated in the real-science notes the same way PetriPals admits that cocci can't really swim.
- First to 64 virions wins (32 against two or three rivals), matching Mixed Culture.

#### Brownian Brunch (the Petri Picnic equivalent)

- **No steering at all.** This is the most scientifically honest mode in the series, because viruses really can't move on their own.
- Your virions jiggle around randomly. What you *can* do is **rock the flask**: swipe or press an arrow key and a gentle current pushes every floating virion that way for a moment. Virologists really do rock their flasks every 15 minutes or so while the virus is settling, to spread it over the cells.
- Grow to 256 virions. No rush, and no way to lose.

#### Hide & Burst (phage pals only)

- Phages like Lana can choose between two life cycles. In the **lytic** cycle she bursts a cell right away. In the **lysogenic** cycle she slips her DNA into the cell's own DNA and lies low.
- In this mode, the flask is a **lawn of bacteria** that keep dividing. When Lana attaches, you choose:
  - **Burst** (tap or press B): the normal lytic cycle.
  - **Hide** (tap or press H): the cell turns faintly striped and keeps dividing, and *every daughter carries Lana too*.
- At random moments a **UV flash** sweeps the lawn (UV light really does trigger lambda to wake up). Every hidden cell bursts at once. Hiding pays off big, but a hidden cell that's still growing when the timer runs out counts for nothing.
- Goal: the most virions in 60 seconds. This teaches the lytic and lysogenic cycles, which are a staple of school biology.

### 4.5 Stretch: Phage Lawn (crossover with PetriPals)

A mode in **PetriPals** itself: the agar is covered in a lawn of a PetriPal (Goldie, Mona, Sallie…) and you play Tess the phage, clearing plaques in her. The fun facts cover **phage therapy**: using phages to treat infections that antibiotics no longer can. This links the two games and shows that viruses *can* grow on a petri dish, as long as there are bacteria on it.

## 5. The pals

Every pal is a real virus drawn as a cartoon, with her real shape. Like the PetriPals, they're all "she," with a name that hints at the species.

| Pal | Virus | Shape | Host and receptor | Burst | Gimmick |
|---|---|---|---|---|---|
| **Tess** | Enterobacteria phage T4 | Lunar-lander: 20-sided head, tail, six spidery tail fibers | *E. coli* (only in Hide & Burst and Phage Lawn) | 8 | Injects instead of entering: she stays on the outside and her empty shell is left behind |
| **Lana** | Lambda phage | Round head, long thin flexible tail | *E. coli*, LamB receptor | 6 | The only pal who can **Hide** (lysogeny) |
| **Flo** | Influenza A | Round, covered in two kinds of spikes (HA and NA) | Airway cells, sialic acid | 6 | **Antigenic drift:** once per level, tap her to recolor her spikes, and antibody clouds stop hurting her for 5 s |
| **Rota** | Rotavirus | Wheel: three layered shells with spokes (*rota* is Latin for "wheel") | Gut lining cells | 7 | Tough shell: she survives one antibody touch per level |
| **Cora** | Coronavirus | Ball with a crown (*corona*) of club-shaped spikes | ACE2 | 5 | Fuses neighboring cells together: one infection can take two cells at once (syncytia) |
| **Tabby** | Tobacco mosaic virus | Stiff, straight rod, like a tiny pencil | Tobacco leaf cells, no receptor | 4 | Plant cells have tough walls, so she can only get in through **scratched** cells (marked with a nick); then she spreads to neighbors through channels between them (plasmodesmata), with no burst needed |
| **Addie** | Adenovirus | Crisp 20-sided shape with a long fiber knob at every corner | CAR receptor | 5 | Long fibers: she attaches from a little farther away |
| **Mimi** | Mimivirus | Huge 20-sided shape with a fuzzy coat, star-shaped "stargate" on one face | Amoebas, by being eaten | 8 | Too big to sneak in: amoebas wander the flask and she has to get **swallowed** by one |
| **Lyssa** | Rabies virus (*Lyssavirus*) | Bullet-shaped | Nerve cells | 4 | Flask of long, thin nerve cells: once she's in one, she travels along it to its far end before bursting |

The starting roster could be the first six, with the others added later as picker-only pals (the same way PetriPals added Kiki and others).

**Tone check:** Cora and Lyssa are the most real-world-sensitive. Cora could be a cold-causing coronavirus (like OC43) instead of SARS-CoV-2. See [Open questions](#11-open-questions).

## 6. Fun facts and quiz

Every pal has 4–6 fun facts in the PetriPals style, shown in the end-of-level pop-up (reusing `facts.js` and `italics.js`). Examples:

- "Tess has six tail fibers, and she uses them to feel around for the right spot on a bacterium before she lands."
- "Tabby was the first virus ever discovered, in 1892. She was too small to see in any microscope for another 40 years."
- "Mimi is so big that scientists first thought she was a bacterium. Her name stands for 'mimicking microbe.'"
- "Lana can hide inside a bacterium's DNA for generations, getting copied every time it divides."
- "Flo changes her spikes a little every year, which is why the flu vaccine changes every year too."

**Who's That Virus?** works exactly like Who's That Pal?, reusing `whos-that-pal.js` and `guess.js`, with a `quiz-facts.js` that skips facts too broad to point to one pal (like "is an RNA virus").

## 7. Look and feel

- **Palette:** the flask is a pale pinkish-orange, the color of real cell culture medium (it has a pH dye called phenol red). Healthy cells are soft cream hexagons with lilac nuclei. Plaques are clear and show the flask's floor.
- **Pals:** 200 × 200 SVGs with faces, like `pals.js`. Free virions are drawn small and without faces, the way PetriPals' offspring hide theirs (`<g class="face">`).
- **Idle animations:** reuse bob, wobble and squish. Lyssa and Tabby get a new **drift** animation, a slow sideways sway.
- **Electron microscope mode** (the picker's equivalent of microscope mode): viruses are too small for a light microscope, so the picker turns grayscale with a grainy texture and shows each pal's real shape at a scale bar of 100 nm.
- **Win confetti:** reuse `spores.js`, recolored into tiny virions.

## 8. Technical plan

CellMates should be its own repo (`jessicasogge/cellmates`) published on GitHub Pages, like FunGals, so each game stays simple. It uses the same stack: plain HTML, CSS and JavaScript in `public/`, Vitest with jsdom, the coverage gate, and the Pages deploy workflow.

**Copied from PetriPals with little or no change:** `keyboard.js`, `touch.js`, `mover.js`, `facts.js`, `italics.js`, `guess.js`, `whos-that-pal.js`, `spores.js`, `loading.js`, `track.js`, `pal-picker.js`, the page skeletons and styles. If the three games start sharing a lot, a small shared module could come later, but copying is fine to begin with.

**New modules:**

| Module | What it does |
|---|---|
| `flask.js` | Builds the hex grid (axial coordinates), finds the cell under a point, finds neighbors, and draws the flask |
| `host.js` | Each cell's state machine (below) and receptor badge |
| `infect.js` | Attaching, the copy timer, bursting and releasing virions |
| `drift.js` | Movement with inertia and wobble for the lead virion, a random walk for free virions, and the rocking current for Brownian Brunch |
| `immune.js` | Antibody clouds (adapted from `antibiotic.js`) and interferon shielding |
| `lysogeny.js` | Hide & Burst: dividing bacteria, hidden cells, UV flashes |
| `config.js` | `VIRUSES`: each pal's receptor, burst size, copy time, gimmick and facts, documented like PetriPals' `SPECIES` |

**Cell states (`host.js`):**

```
healthy ──attach──▶ infected(owner, progress) ──timer──▶ burst ──▶ plaque
   │                                                                ▲
   ├──interferon──▶ shielded ──attach (slower)──▶ infected ─────────┘
   └──(Hide & Burst) hide──▶ lysogen ──divide──▶ lysogen …  ──UV──▶ burst
```

**Performance:** the number of free virions is capped (about 60). Past the cap, a burst adds to the counter and the extra virions attach to neighbor cells right away instead of being drawn. One canvas layer draws the hex grid and plaques, and DOM movers draw the pals, like PetriPals.

**Accessibility:** support reduced motion (no wobble or bursting animation, just state changes), give cells an outline as well as a color for receptor matching, and give every pal a screen-reader description like PetriPals' `looks`.

## 9. Testing

The same approach and coverage gate as PetriPals:

- Hex grid math: neighbors, point-to-cell lookup, edges of the flask.
- The cell state machine: every transition, superinfection exclusion, and that shielding slows copying.
- Burst counts and the win target per level.
- Brownian Brunch: drift stays inside the flask, and rocking moves every free virion.
- Hide & Burst: daughters of hidden cells stay hidden, and UV bursts them all.
- Every pal has a receptor, burst size, art, and at least four facts, and every quiz fact names one pal.

## 10. Milestones

1. **Prototype:** flask, hex grid, one pal (Flo), drift, attach, copy, burst, plaques. Answers the question: is attach-and-burst fun?
2. **Classic:** antibody clouds, interferon, seven levels, end-of-level facts.
3. **Pals:** the first six, the picker, electron microscope mode.
4. **Coinfection** and **Brownian Brunch.**
5. **Hide & Burst** and **Who's That Virus?**
6. **Polish and launch:** home page, cross-links from PetriPals and FunGals ("sister games"), README with a real-science section.
7. **Stretch:** the Phage Lawn mode in PetriPals.

## 11. Open questions

1. **Name.** CellMates is the working title. Other ideas: *Host & Seek*, *Plaque Pals*, *ViroVille*.
2. **Which viruses.** Is SARS-CoV-2 or rabies too heavy for a cute game? A cold coronavirus and a less scary bullet-shaped virus (like vesicular stomatitis virus, a lab favorite) are options.
3. **Free virions spreading on their own.** Does that make Classic too easy, or is it the satisfying part? It needs playtesting. The spread chance per neighbor is the main tuning knob.
4. **Tabby's mechanic** (scratched cells, spreading without bursting) is the most different. Keep her rules unique, or simplify?
5. **One flask for every pal?** Different hosts (bacteria, amoebas, plant cells, nerve cells) could give each pal her own flask look. That's more art, but more teaching.
