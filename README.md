# Ember Hop

A classic side-scrolling platformer for the browser. Plain HTML, CSS and ES modules.
No build step, no runtime dependencies, no image or audio files: every sprite is drawn
from palette arrays onto offscreen canvases and every sound is synthesized with WebAudio.

Open `index.html` through any static server (for example `python3 -m http.server`) and play.

## Design

### Hero: Ember

Ember is a small orange fox with a blue scarf who is trying to get home to the top of
Crag Keep. She runs, jumps, stomps and, once powered up, throws bouncing sparks.

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

Theme A is the sunny overworld, theme B is the underground, theme C is the castle.

1. **Meadow Mile** (overworld). Gentle hills, the first Grumbles and a Clanker, a hidden Heart Leaf block and a pipe to a coin cellar.
2. **Hollow Deep** (underground). Tight ceilings, brick ceilings to break for coins, Flitters in the dark, a long moving-platform crossing.
3. **Windy Ridge** (overworld, dusk). Tall pillars, moving platforms over long pits, Chompvines in every pipe, a shell-bowling corridor of Grumbles.
4. **Crag Keep** (castle). Lava pits, pillar jumps, a vertical lift, then Baron Thornback's arena and the final gate.

Every level is fully beatable without power-ups. `tests/check.mjs` runs a search bot through
each level in a headless simulation and again in the browser to prove it.

### Scoring

Stomp 100 (chains double up to 1600), coin 200, block coin 200, power-up 1000,
Heart Leaf 1 life, goal pole 100 to 5000 by height, time bonus 50 per tick.

### Controls

| Action | Keyboard | Gamepad | Touch |
|--------|----------|---------|-------|
| Move | Arrow keys or A / D | left stick, d-pad | left / right buttons |
| Jump | Z or Space | A (bottom face) | A |
| Run / throw spark | X or Shift | X (left face) or right trigger | B |
| Crouch / enter pipe | Down or S | d-pad down | down button |
| Pause | P or Escape | Start | pause button |
| Mute | M | | |

## File layout

```
index.html            page shell, canvas, touch buttons
css/style.css         layout, integer-scaled canvas, touch controls
js/main.js            boot, fixed-step loop (60 Hz), resize, visibility pause
js/input.js           keyboard, gamepad, touch; per-frame pressed/held snapshot
js/physics.js         AABB vs tile collision, overlap helpers
js/player.js          hero state machine, movement, power states, sparks
js/enemies.js         Grumble, Clanker, Flitter, Chompvine, Baron Thornback
js/items.js           coins, blocks, power-ups, particles, score popups, goal pole
js/level.js           tile ids, level loader (rooms, warps, spawns)
js/levels/builder.js  tiny DSL that turns calls into tile rows
js/levels/*.js        level data
js/game.js            pure simulation: Game (screens, session) and World (one level)
js/render.js          Canvas 2D renderer, camera, parallax, sprites
js/sprites.js         pixel art as palette strings, rendered to offscreen canvases
js/audio.js           WebAudio chiptune SFX and looping tunes
js/ui.js              title, HUD, pause, game over, level card, level complete
js/storage.js         best score and unlocked levels in localStorage
tests/bot.mjs         search bot that plays a level in the headless simulation
tests/check.mjs       Playwright checks and bot runs
```

The simulation (`game.js`, `player.js`, `enemies.js`, `items.js`, `level.js`,
`physics.js`) never touches the DOM, uses a seeded RNG and runs at a fixed 60 Hz, so a
recorded input sequence replays identically in Node and in the browser.

## Development

```sh
python3 -m http.server 8123          # then open http://localhost:8123/
node tests/bot.mjs                   # solve every level headlessly, write tests/solutions
node tests/check.mjs                 # full check suite (needs Playwright on NODE_PATH)
```
