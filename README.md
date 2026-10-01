# Ember Hop

A side-scrolling platformer for the browser, rendered as a lit and shadowed 3D world
(three.js, 2.5D) on top of a deterministic 2D simulation. Plain HTML, CSS and ES modules.
No build step. The only runtime dependency is three.js, loaded from cdnjs; every model,
texture, sprite and sound is generated in code.

Open `index.html` through any static server (for example `python3 -m http.server`) and play.
Without WebGL (or offline, when the three.js script cannot load) the game falls back to the
2D pixel-art renderer automatically. The view can also be switched in Settings.

## Design

### Heroine: Ember

Ember is a girl with dark hair in a ponytail, a saffron kurta and a long teal dupatta that
flows behind her as she runs. She is trying to get home to the top of Crag Keep. She runs,
jumps, stomps and, once powered up, throws bouncing sparks.

**Portrait photo.** Drop a square photo at `assets/hero-face.png` (the shipped file is a 1x1
placeholder). When it is larger than 2px it is used as:

- the face texture wrapped onto the 3D model's head (`js/render3d/models.js`, `makeHero`),
- the round HUD portrait and the level-card portrait (`js/ui.js`, `portrait`).

Without a photo the game uses a drawn face. The lookup lives in one place: `js/hero.js`.

Movement is tuned for a tight arcade feel:

- acceleration and deceleration on the ground, weaker steering in the air
- walk and run speeds, with a skid when turning around at speed
- variable jump height (hold to go higher), run jumps go higher and further
- coyote time (6 frames) after leaving a ledge and jump buffering (6 frames) before landing
- head bumps activate the block above and knock enemies standing on it
- stomping an enemy bounces Ember upward, higher if jump is held

### Power states

| State | How | What it does |
|-------|-----|--------------|
| Small Ember | start, or after being hit while big | one hit and she loses a life |
| Big Ember | eat a **Sun Berry** | twice as tall, can break bricks from below, one hit drops to small |
| Spark Ember | eat a **Spark Plum** while big | press run/fire to throw bouncing sparks (two on screen) |

A **Heart Leaf** gives an extra life. 100 coins also give an extra life.
After taking a hit Ember flickers and is invincible for about 1.5 seconds.

### Enemies

| Enemy | Behaviour |
|-------|-----------|
| Grumble | a grumpy rock blob that walks and turns at walls. Stomp it and it squashes flat. |
| Clanker | a shelled beetle. Stomp it once and it hides in its shell; touch the shell to kick it. A sliding shell bounces off walls and takes out every enemy it hits, including Ember if she gets in the way. Stomp a sliding shell to stop it. It wakes up after a while. |
| Flitter | a bat that glides in a sine wave over a patrol range. One stomp. |
| Chompvine | a snapping plant that lives inside pipes. It stays hidden while Ember stands next to its pipe. Cannot be stomped; a spark finishes it. |
| Baron Thornback | the boss of Crag Keep. He charges across his arena and leaps when Ember gets close. Three stomps (or six sparks) and the gate opens. |

### Blocks and items

- `?` blocks give a coin; some hold a Sun Berry (a Spark Plum when Ember is already big)
- bricks shake when small Ember bumps them and shatter when Big Ember does
- hidden blocks only appear when bumped from below; they hold Heart Leaves
- coins: 200 points each, 100 coins = 1 life
- moving platforms, horizontal and vertical
- pipes: stand on one and press down to warp to a bonus room full of coins
- the goal pole: grab it as high as you can for up to 5000 bonus points, then the remaining time is added at 50 points per tick

### Worlds and levels

1. **Meadow Mile** (sunny overworld). Gentle hills, the first Grumbles and a Clanker, a hidden Heart Leaf block and a pipe to a coin cellar.
2. **Hollow Deep** (underground). Tight ceilings, brick ceilings to break for coins, Flitters in the dark, a long moving-platform crossing. Ember carries her own light; crystals glow.
3. **Windy Ridge** (dusk). Tall pillars, moving platforms over long pits, Chompvines in every pipe, a shell-bowling corridor of Grumbles.
4. **Crag Keep** (castle). Lava pits, pillar jumps, a vertical lift, torch-lit halls, then Baron Thornback's arena and the final gate.

Every level is fully beatable without power-ups. `tests/check.mjs` runs a search bot through
each level in a headless simulation and again in the browser to prove it.

### Scoring

Stomp 100 (chains double up to 1600), coin 200, block coin 200, power-up 1000,
Heart Leaf 1 life, goal pole 100 to 5000 by height, time bonus 50 per tick.

## Screens and menus

- **Title**: Start, Level Select, Controls, Settings. Up/down to move, jump or Enter to confirm.
- **Level Select**: left/right to pick an unlocked level; shows the best score and time per level. Escape goes back.
- **Settings**: music and sound volume (0 to 10), screen shake on/off, view (3D or 2D classic). Saved in localStorage.
- **Pause** (P or Escape): Resume, Restart Level, Music, Sound, Quit to Title.
- **Level card** before each attempt, a **tally** after each clear (time bonus, coins, stomps, score, new best), **Game Over** with Try Again / Title, and an **ending** scene after Crag Keep.

### Controls

| Action | Keyboard | Gamepad | Touch |
|--------|----------|---------|-------|
| Move / menus | Arrow keys or A / D (up/down in menus) | left stick, d-pad | d-pad |
| Jump / confirm | Z or Space (Enter also confirms) | A (bottom face) | A |
| Run / throw spark | X or Shift | X (left face) or right trigger | B |
| Crouch / enter pipe | Down or S | d-pad down | d-pad down |
| Pause / back | P or Escape | Start | pause button |
| Mute | M | | |

## Presentation

The simulation runs at a fixed 60 Hz and never touches the DOM. Two renderers draw it:

- **3D (default)**, `js/render3d/`. Every tile is an instanced, bevel-textured block; pipes are
  cylinders; coins spin; lava is emissive and animated. Per-theme lighting (hemisphere + shadowed
  sun + rim light), fog for depth, procedurally built backdrops (mountains, hills, trees, pines,
  clouds, cave walls, stalactites, crystals, castle pillars, torches, banners), point lights for
  torches and crystals, additive glow sprites, dust on landing and skids, drifting leaves,
  fireflies, cave drips, embers and ash. Ember, the enemies and the items are procedural models
  with animation (run cycle, jump and fall poses, flowing dupatta, blinking, squash and stretch).
  Instancing keeps draw calls low; the shadow map is 1024 and the pixel ratio is capped at 2.
- **2D classic**, `js/render.js` + `js/sprites.js`. Layered parallax, pixel art with a 5x7 font,
  lighting overlays for the dark themes, vignette, shadows and particles.

Hit-stop on stomps and boss hits, screen shake (off under `prefers-reduced-motion` or in
Settings), iris and fade transitions and the HUD are shared by both views.

## File layout

```
index.html                 page shell, two stacked canvases, touch controls, three.js script
css/style.css              layout, integer-scaled canvases, glassy touch controls
assets/hero-face.png       1x1 placeholder; replace with a square photo to use it as Ember's face
js/main.js                 boot, fixed-step loop (60 Hz), renderer selection, hit-stop, resize
js/hero.js                 heroine config and portrait loader
js/input.js                keyboard, gamepad, touch; per-frame pressed/held snapshot
js/physics.js              AABB vs tile collision, overlap helpers
js/player.js               hero state machine, movement, power states, sparks
js/enemies.js              Grumble, Clanker, Flitter, Chompvine, Baron Thornback
js/items.js                coins, blocks, power-ups, particles, score popups, goal pole
js/level.js                tile ids, level loader (rooms, warps, spawns)
js/levels/builder.js       tiny DSL that turns calls into tile rows
js/levels/*.js             level data
js/game.js                 pure simulation: Game (screens, menus, settings, bests) and World (one level)
js/render.js               2D Canvas renderer: camera, parallax, tiles, sprites, lighting, effects
js/sprites.js              pixel art, procedural tiles, 5x7 font, logo, glow and vignette textures
js/render3d/renderer3d.js  three.js scene: camera, lights, instanced tiles, backdrops, effects
js/render3d/models.js      procedural models: Ember, enemies, items, trees, torches, cottage
js/render3d/textures.js    procedural canvas textures and the block texture atlas
js/audio.js                WebAudio chiptune SFX, menu sounds, looping tunes, volume control
js/ui.js                   title, menus, HUD, pause, level card, tally, game over, ending
js/storage.js              save data (bests, unlocked levels, settings, mute) in localStorage
tests/bot.mjs              search bot that plays a level in the headless simulation
tests/check.mjs            Playwright checks and bot runs
tests/solutions/*.json     recorded inputs that beat each level
```

The simulation (`game.js`, `player.js`, `enemies.js`, `items.js`, `level.js`,
`physics.js`) uses a seeded RNG and runs at a fixed 60 Hz, so a recorded input sequence
replays identically in Node and in the browser. Both renderers read the simulation state and
never write to it; hit-stop lives in the loop, so it delays frames without changing them.

## Development

```sh
python3 -m http.server 8123          # then open http://localhost:8123/
node tests/bot.mjs                   # solve every level headlessly, write tests/solutions
node tests/check.mjs                 # full check suite (needs Playwright on NODE_PATH)
```

`tests/check.mjs` covers: the bot beating every level headlessly and in the browser (3D view),
zero console errors, the 3D view booting with WebGL and rendering frames, title menus, level
select, settings persistence, pause menu (restart and quit), death and respawn, level complete
and best times, the 2D fallback, draw time under 16 ms, and the phone layout with touch
controls. It also writes fresh screenshots to `screenshots/`.

Debug hooks on `window.__game`: `startLevel(i)`, `replay(inputs)`, `stepFrames(n, input)`,
`frameStats()`, `setView("2d" | "3d")`, `debugZoom(z)`.
