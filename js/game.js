// Pure simulation. Game owns the session and screens; World runs one level attempt.
// Nothing here touches the DOM, so the same code runs in Node for the bot.
import { T, TILE, loadLevel, tileAt, isBumpable } from "./level.js";
import { createPlayer, setPower, updatePlayer, PHYS } from "./player.js";
import { spawnEnemy, updateEnemy, isStompable, isHarmful } from "./enemies.js";
import { spawnPlatform, spawnPowerUp, updateItem, updateParticles } from "./items.js";
import { overlaps } from "./physics.js";

export const VIEW_W = 320;
export const VIEW_H = 192;
export const START_LIVES = 3;
const TIMER_FRAMES = 36; // one timer tick every 0.6 s
const CARD_FRAMES = 110;
const COMPLETE_FRAMES = 230;

export const EMPTY_INPUT = Object.freeze({
	left: false, right: false, up: false, down: false, jump: false, run: false,
	jumpP: false, runP: false, pauseP: false, startP: false,
});

// Menu definitions. Sliders are adjusted with left/right.
export const TITLE_MENU = [ "START", "LEVEL SELECT", "CONTROLS", "SETTINGS" ];
export const PAUSE_MENU = [ "RESUME", "RESTART LEVEL", "MUSIC", "SOUND", "QUIT TO TITLE" ];
export const SETTINGS_MENU = [ "MUSIC", "SOUND", "SCREEN SHAKE", "BACK" ];
export const GAMEOVER_MENU = [ "TRY AGAIN", "TITLE" ];
export const DEFAULT_SETTINGS = Object.freeze({ music: 6, sfx: 8, shake: true });

function makeRng(seed) {
	return { s: seed >>> 0 };
}

export function rand(rng) {
	// xorshift32
	let x = rng.s || 0x9e3779b9;
	x ^= x << 13;
	x >>>= 0;
	x ^= x >>> 17;
	x ^= x << 5;
	x >>>= 0;
	rng.s = x;
	return x / 4294967296;
}

function clamp(v, lo, hi) {
	return Math.max(lo, Math.min(hi, v));
}

export class Game {
	constructor(levelDefs, saved = {}) {
		this.levels = levelDefs.map(loadLevel);
		const settings = { ...DEFAULT_SETTINGS, ...(saved.settings || {}) };
		settings.music = clamp(Math.round(settings.music), 0, 10);
		settings.sfx = clamp(Math.round(settings.sfx), 0, 10);
		settings.shake = Boolean(settings.shake);
		this.state = {
			screen: "title",
			screenT: 0,
			selected: 0,
			unlocked: Math.min(saved.unlocked || 0, this.levels.length - 1),
			best: saved.best || 0,
			// Per-level bests: { score, frames } or null.
			bests: this.levels.map((_, i) => (Array.isArray(saved.bests) && saved.bests[i]) || null),
			muted: Boolean(saved.muted),
			settings,
			menu: 0,
			from: "title",
			nav: 0,
			navH: 0,
			session: null,
			world: null,
			events: [],
			message: "",
		};
	}

	get session() {
		return this.state.session;
	}

	get level() {
		return this.state.session ? this.levels[this.state.session.levelIndex] : null;
	}

	// A World wrapper around the current world state (cheap to create).
	get world() {
		if (!this.state.world) {
			return null;
		}
		return new World(this, this.level, this.state.world);
	}

	emit(name) {
		this.state.events.push(name);
	}

	drainEvents() {
		const ev = this.state.events;
		this.state.events = [];
		return ev;
	}

	saveData() {
		const st = this.state;
		return { best: st.best, unlocked: st.unlocked, bests: st.bests, muted: st.muted, settings: st.settings };
	}

	startSession(levelIndex) {
		this.state.session = {
			lives: START_LIVES,
			score: 0,
			coins: 0,
			levelIndex,
			power: 0,
			timeBonus: 0,
			completed: false,
			levelStartScore: 0,
			levelScore: 0,
			levelFrames: 0,
		};
		this.beginLevel();
	}

	beginLevel() {
		this.state.world = null;
		this.session.levelStartScore = this.session.score;
		this.setScreen("card");
	}

	setScreen(name) {
		this.state.screen = name;
		this.state.screenT = 0;
		this.state.nav = 0;
		this.state.navH = 0;
	}

	spawnWorld() {
		const level = this.level;
		this.state.world = World.create(level, this.session.power, this.session.levelIndex);
	}

	// Vertical menu navigation with key repeat. Returns -1, 0 or 1.
	navV(input) {
		const st = this.state;
		const dir = (input.down ? 1 : 0) - (input.up ? 1 : 0);
		if (dir === 0) {
			st.nav = 0;
			return 0;
		}
		st.nav++;
		return st.nav === 1 || (st.nav > 18 && st.nav % 7 === 0) ? dir : 0;
	}

	navHoriz(input) {
		const st = this.state;
		const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
		if (dir === 0) {
			st.navH = 0;
			return 0;
		}
		st.navH++;
		return st.navH === 1 || (st.navH > 18 && st.navH % 6 === 0) ? dir : 0;
	}

	moveCursor(dir, len) {
		const st = this.state;
		if (dir !== 0) {
			st.menu = (st.menu + dir + len) % len;
			this.emit("menu");
		}
	}

	adjustSetting(key, dir) {
		const s = this.state.settings;
		if (dir === 0) {
			return;
		}
		if (key === "shake") {
			s.shake = !s.shake;
		} else {
			const next = clamp(s[key] + dir, 0, 10);
			if (next === s[key]) {
				return;
			}
			s[key] = next;
		}
		this.emit("menu");
		this.emit("settings");
	}

	openSettings(from) {
		this.state.from = from;
		this.state.menu = 0;
		this.setScreen("settings");
	}

	quitToTitle() {
		this.recordBest();
		this.state.session = null;
		this.state.world = null;
		this.state.menu = 0;
		this.setScreen("title");
		this.emit("music:stop");
	}

	step(input) {
		const st = this.state;
		st.screenT++;
		const confirm = input.startP || input.jumpP;
		switch (st.screen) {
			case "title":
				this.moveCursor(this.navV(input), TITLE_MENU.length);
				if (confirm && st.screenT > 2) {
					this.emit("confirm");
					switch (st.menu) {
						case 0:
							st.selected = 0;
							this.emit("start");
							this.startSession(0);
							break;
						case 1:
							this.setScreen("levels");
							break;
						case 2:
							st.from = "title";
							this.setScreen("controls");
							break;
						case 3:
							this.openSettings("title");
							break;
					}
				}
				break;
			case "levels": {
				const h = this.navHoriz(input);
				if (h !== 0) {
					const next = clamp(st.selected + h, 0, st.unlocked);
					if (next !== st.selected) {
						st.selected = next;
						this.emit("menu");
					}
				}
				if (confirm && st.screenT > 4) {
					this.emit("start");
					this.startSession(st.selected);
				} else if (input.pauseP) {
					this.emit("back");
					st.menu = 1;
					this.setScreen("title");
				}
				break;
			}
			case "controls":
				if ((confirm || input.pauseP) && st.screenT > 4) {
					this.emit("back");
					st.menu = st.from === "pause" ? 0 : 2;
					this.setScreen(st.from);
				}
				break;
			case "settings": {
				this.moveCursor(this.navV(input), SETTINGS_MENU.length);
				const h = this.navHoriz(input);
				const key = [ "music", "sfx", "shake", null ][st.menu];
				if (key) {
					this.adjustSetting(key, key === "shake" ? (h !== 0 || confirm ? 1 : 0) : h);
				}
				if (((confirm && !key) || input.pauseP) && st.screenT > 4) {
					this.emit("back");
					this.emit("save");
					st.menu = st.from === "pause" ? 0 : 3;
					this.setScreen(st.from);
				}
				break;
			}
			case "card":
				if (st.screenT >= CARD_FRAMES || input.startP || input.jumpP) {
					this.spawnWorld();
					this.setScreen("play");
					this.emit("music:" + this.level.music);
				}
				break;
			case "play": {
				if (input.pauseP) {
					st.menu = 0;
					this.setScreen("pause");
					this.emit("pause");
					break;
				}
				const world = this.world;
				world.step(input);
				if (world.s.status === "dead") {
					this.onDeath();
				} else if (world.s.status === "complete") {
					this.session.power = world.s.player.power;
					this.session.levelFrames = world.s.frame;
					this.setScreen("complete");
					this.emit("music:stop");
				}
				break;
			}
			case "pause": {
				this.moveCursor(this.navV(input), PAUSE_MENU.length);
				const h = this.navHoriz(input);
				if (st.menu === 2) {
					this.adjustSetting("music", h);
				} else if (st.menu === 3) {
					this.adjustSetting("sfx", h);
				}
				if (input.pauseP) {
					this.setScreen("play");
					this.emit("unpause");
					break;
				}
				if (confirm && st.screenT > 4) {
					switch (st.menu) {
						case 0:
							this.setScreen("play");
							this.emit("unpause");
							break;
						case 1:
							this.emit("confirm");
							this.emit("music:stop");
							this.beginLevel();
							break;
						case 4:
							this.emit("confirm");
							this.emit("save");
							this.quitToTitle();
							break;
					}
				}
				break;
			}
			case "complete": {
				const w = this.state.world;
				if (w.timer > 0 && st.screenT > 70) {
					const take = Math.min(w.timer, 3);
					w.timer -= take;
					this.session.score += take * 50;
					if (st.screenT % 4 === 0) {
						this.emit("tick");
					}
				} else if (st.screenT > COMPLETE_FRAMES) {
					this.nextLevel();
				}
				break;
			}
			case "gameover":
				this.moveCursor(this.navV(input), GAMEOVER_MENU.length);
				if (st.screenT > 60 && confirm) {
					this.emit("confirm");
					if (st.menu === 0) {
						const idx = this.session ? this.session.levelIndex : 0;
						this.startSession(idx);
					} else {
						this.quitToTitle();
					}
				} else if (st.screenT > 900) {
					this.quitToTitle();
				}
				break;
			case "ending":
				if (st.screenT > 60 && confirm) {
					this.quitToTitle();
				}
				break;
		}
	}

	onDeath() {
		const s = this.session;
		s.lives--;
		s.power = 0;
		this.emit("music:stop");
		if (s.lives < 0) {
			this.recordBest();
			this.state.menu = 0;
			this.setScreen("gameover");
			this.emit("gameover");
		} else {
			this.beginLevel();
		}
	}

	nextLevel() {
		const s = this.session;
		const idx = s.levelIndex;
		const next = idx + 1;
		s.levelScore = s.score - s.levelStartScore;
		this.recordLevelBest(idx, s.levelScore, s.levelFrames);
		if (next > this.state.unlocked) {
			this.state.unlocked = Math.min(next, this.levels.length - 1);
		}
		this.emit("save");
		if (next >= this.levels.length) {
			s.completed = true;
			this.recordBest();
			this.setScreen("ending");
			this.emit("ending");
		} else {
			s.levelIndex = next;
			this.beginLevel();
		}
	}

	recordLevelBest(idx, score, frames) {
		const prev = this.state.bests[idx];
		this.state.bests[idx] = {
			score: Math.max(score, prev ? prev.score : 0),
			frames: prev && prev.frames ? Math.min(frames, prev.frames) : frames,
		};
	}

	recordBest() {
		if (this.session && this.session.score > this.state.best) {
			this.state.best = this.session.score;
			this.emit("save");
		}
	}

	addScore(n) {
		if (this.session) {
			this.session.score += n;
		}
	}

	addCoin() {
		const s = this.session;
		s.coins++;
		s.score += 200;
		if (s.coins >= 100) {
			s.coins -= 100;
			this.addLife();
		}
	}

	addLife() {
		this.session.lives++;
		this.emit("oneup");
	}
}

// ---------------------------------------------------------------------------

export class World {
	constructor(game, level, s) {
		this.game = game;
		this.level = level;
		this.s = s;
	}

	static create(level, power, seed) {
		const rooms = {};
		for (const [ name, room ] of Object.entries(level.rooms)) {
			rooms[name] = {
				tiles: Uint8Array.from(room.tiles),
				enemies: [],
				items: [],
				spawned: new Uint8Array(room.spawns.length),
			};
		}
		const main = level.rooms.main;
		const s = {
			roomName: "main",
			rooms,
			frame: 0,
			rng: makeRng(1234 + seed * 7919),
			player: createPlayer(main.start.x, main.start.y, power),
			enemies: rooms.main.enemies,
			items: rooms.main.items,
			particles: [],
			popups: [],
			bumps: [],
			camera: { x: 0, y: 0 },
			shake: 0,
			status: "playing",
			statusT: 0,
			timer: level.time,
			timerFrame: 0,
			hurry: false,
			stats: { coins: 0, stomps: 0, kills: 0, blocks: 0, powerups: 0, warps: 0, deaths: 0 },
			goal: null,
			warp: null,
			gateOpen: false,
		};
		const w = new World(null, level, s);
		w.enterRoom("main", true);
		return s;
	}

	get room() {
		return this.level.rooms[this.s.roomName];
	}

	get tiles() {
		return this.s.rooms[this.s.roomName].tiles;
	}

	tile(tx, ty) {
		return tileAt(this.room, this.tiles, tx, ty);
	}

	setTile(tx, ty, id) {
		const room = this.room;
		if (tx >= 0 && tx < room.w && ty >= 0 && ty < room.h) {
			this.tiles[ty * room.w + tx] = id;
		}
	}

	emit(name) {
		if (this.game) {
			this.game.emit(name);
		}
	}

	addScore(n, x, y) {
		if (this.game) {
			this.game.addScore(n);
		}
		if (x !== undefined) {
			this.s.popups.push({ x, y, text: String(n), t: 0 });
		}
	}

	addCoin(x, y) {
		this.s.stats.coins++;
		if (this.game) {
			this.game.addCoin();
		}
		this.emit("coin");
		if (x !== undefined) {
			this.s.particles.push({ x: x + 2, y: y + 4, vx: 0, vy: -1.5, g: 0, t: 0, life: 14, kind: "sparkle" });
		}
	}

	shake(n) {
		this.s.shake = Math.max(this.s.shake, n);
	}

	puff(x, y) {
		this.s.particles.push({ x, y, vx: 0, vy: 0, g: 0, t: 0, life: 10, kind: "puff" });
	}

	enterRoom(name, first = false) {
		const s = this.s;
		s.roomName = name;
		s.enemies = s.rooms[name].enemies;
		s.items = s.rooms[name].items;
		const room = this.room;
		// Platforms exist from the start; enemies spawn as the camera approaches.
		room.spawns.forEach((sp, i) => {
			if ((sp.type === "platformH" || sp.type === "platformV") && !s.rooms[name].spawned[i]) {
				s.rooms[name].spawned[i] = 1;
				s.items.push(spawnPlatform(sp));
			}
		});
		if (first) {
			this.updateCamera(true);
		}
	}

	step(input) {
		const s = this.s;
		s.frame++;
		s.statusT++;
		if (s.shake > 0) {
			s.shake--;
		}
		const p = s.player;

		if (p.growT > 0) {
			// The world freezes while Ember grows or shrinks.
			p.growT--;
			if (p.growT === 0) {
				setPower(p, p.growTo);
			}
			return;
		}

		switch (s.status) {
			case "playing":
				this.tickTimer();
				this.spawnEnemies();
				this.updateItems();
				updatePlayer(this, input);
				if (s.status !== "playing") {
					break;
				}
				this.updateEnemies();
				this.resolveEnemies(input);
				this.resolveItems();
				updateParticles(this);
				this.updateCamera();
				break;
			case "dying":
				this.updateDying();
				updateParticles(this);
				break;
			case "goal":
				this.updateGoal();
				this.updateItems();
				updateParticles(this);
				this.updateCamera();
				break;
			case "warp":
				this.updateWarp();
				updateParticles(this);
				break;
			case "finishing":
				if (s.statusT > 30) {
					s.status = "complete";
				}
				break;
		}
	}

	tickTimer() {
		const s = this.s;
		s.timerFrame++;
		if (s.timerFrame >= TIMER_FRAMES) {
			s.timerFrame = 0;
			s.timer--;
			if (s.timer === 100 && !s.hurry) {
				s.hurry = true;
				this.emit("hurry");
			}
			if (s.timer <= 0) {
				s.timer = 0;
				this.killPlayer();
			}
		}
	}

	spawnEnemies() {
		const s = this.s;
		const room = this.room;
		const rs = s.rooms[s.roomName];
		const right = s.camera.x + VIEW_W + 24;
		const left = s.camera.x - 24;
		room.spawns.forEach((sp, i) => {
			if (rs.spawned[i]) {
				return;
			}
			const x = sp.tx * TILE;
			if (x < right && x > left - 48) {
				rs.spawned[i] = 1;
				s.enemies.push(spawnEnemy(sp));
			}
		});
	}

	updateEnemies() {
		const s = this.s;
		const cam = s.camera;
		for (const e of s.enemies) {
			if (e.remove) {
				continue;
			}
			// Enemies far off screen sleep.
			if (e.x < cam.x - 200 || e.x > cam.x + VIEW_W + 200) {
				continue;
			}
			updateEnemy(this, e);
		}
		s.enemies = s.enemies.filter((e) => !e.remove);
		s.rooms[s.roomName].enemies = s.enemies;
	}

	updateItems() {
		const s = this.s;
		for (const it of s.items) {
			if (!it.remove) {
				updateItem(this, it);
			}
		}
		s.items = s.items.filter((it) => !it.remove);
		s.rooms[s.roomName].items = s.items;
	}

	resolveEnemies(input) {
		const s = this.s;
		const p = s.player;
		if (p.dying) {
			return;
		}
		for (const e of s.enemies) {
			if (e.remove || e.state === "dead" || e.state === "flat") {
				continue;
			}
			if (!overlaps(p, e)) {
				continue;
			}
			const falling = p.vy > 0 || p.prevBottom <= e.y + 4;
			const fromAbove = p.prevBottom <= e.y + 6 && falling;
			if (isStompable(e) && fromAbove) {
				this.stomp(e, input);
				continue;
			}
			if (e.type === "clanker" && e.state === "shell") {
				this.kickShell(e, p.x + p.w / 2 < e.x + e.w / 2 ? 1 : -1);
				continue;
			}
			if (isHarmful(e)) {
				this.hurtPlayer();
				if (s.status !== "playing") {
					return;
				}
			}
		}
	}

	stomp(e, input) {
		const s = this.s;
		const p = s.player;
		p.vy = input.jump ? PHYS.STOMP_BOUNCE_HELD : PHYS.STOMP_BOUNCE;
		p.rising = false;
		p.y = e.y - p.h;
		p.combo = Math.min(p.combo + 1, 5);
		const points = [ 100, 200, 400, 800, 1600 ][p.combo - 1];
		s.stats.stomps++;
		this.emit("stomp");
		switch (e.type) {
			case "grumble":
				e.state = "flat";
				e.t = 0;
				e.h = 8;
				e.y += 6;
				this.addScore(points, e.x, e.y - 8);
				break;
			case "flitter":
				this.killEnemy(e, 0);
				this.addScore(points, e.x, e.y - 8);
				break;
			case "clanker":
				if (e.state === "shell") {
					this.kickShell(e, p.x + p.w / 2 < e.x + e.w / 2 ? 1 : -1);
				} else {
					e.state = "shell";
					e.t = 0;
					e.vx = 0;
					this.addScore(points, e.x, e.y - 8);
				}
				break;
			case "boss":
				this.hurtBoss(e, 1);
				break;
		}
		this.s.particles.push({ x: e.x + e.w / 2 - 2, y: e.y, vx: 0, vy: 0, g: 0, t: 0, life: 8, kind: "puff" });
	}

	kickShell(e, dir) {
		e.state = "slide";
		e.dir = dir;
		e.t = 0;
		e.grace = 12;
		e.x += dir * 4;
		this.addScore(400, e.x, e.y - 8);
		this.emit("kick");
	}

	killEnemy(e, dir) {
		e.state = "dead";
		e.vx = dir * 1.2;
		e.vy = -3.5;
		this.s.stats.kills++;
	}

	hurtBoss(e, dmg) {
		if (e.state === "hurt" || e.state === "dead") {
			return;
		}
		e.hp -= dmg;
		e.hits++;
		this.emit("bosshit");
		this.shake(3);
		if (e.hp <= 0) {
			e.state = "dead";
			e.vy = -5;
			this.addScore(5000, e.x, e.y - 8);
			this.emit("bossdead");
			this.openGate();
		} else {
			e.state = "hurt";
			e.t = 0;
			this.addScore(1000, e.x, e.y - 8);
		}
	}

	openGate() {
		const room = this.room;
		const tiles = this.tiles;
		for (let i = 0; i < tiles.length; i++) {
			if (tiles[i] === T.GATE) {
				tiles[i] = T.GATE_OPEN;
			}
		}
		this.s.gateOpen = true;
		this.emit("gate");
		void room;
	}

	hurtPlayer() {
		const p = this.s.player;
		if (p.invuln > 0) {
			return;
		}
		if (p.power > 0) {
			p.invuln = PHYS.INVULN;
			p.growT = 30;
			p.growTo = 0;
			this.emit("shrink");
		} else {
			this.killPlayer();
		}
	}

	killPlayer(pit = false) {
		const s = this.s;
		const p = s.player;
		if (p.dying) {
			return;
		}
		p.dying = true;
		p.vx = 0;
		p.vy = pit ? 0 : -5.5;
		p.deathT = pit ? 40 : 0;
		s.status = "dying";
		s.statusT = 0;
		s.stats.deaths++;
		this.emit("die");
	}

	updateDying() {
		const s = this.s;
		const p = s.player;
		p.deathT++;
		if (p.deathT > 24) {
			p.vy = Math.min(5, p.vy + 0.3);
			p.y += p.vy;
		}
		if (p.deathT > 150 || p.y > this.room.h * TILE + 100) {
			s.status = "dead";
		}
	}

	resolveItems() {
		const s = this.s;
		const p = s.player;
		for (const it of s.items) {
			if (it.remove || it.emerge > 0) {
				continue;
			}
			if (it.type === "berry" || it.type === "plum" || it.type === "heart") {
				if (overlaps(p, it)) {
					it.remove = true;
					this.collectPowerUp(it);
				}
			}
		}
	}

	collectPowerUp(it) {
		const s = this.s;
		const p = s.player;
		s.stats.powerups++;
		if (it.type === "heart") {
			if (this.game) {
				this.game.addLife();
			}
			s.popups.push({ x: it.x, y: it.y - 8, text: "1UP", t: 0 });
			return;
		}
		this.addScore(1000, it.x, it.y - 8);
		this.emit("powerup");
		if (it.type === "berry" && p.power === 0) {
			p.growT = 30;
			p.growTo = 1;
		} else if (it.type === "plum") {
			if (p.power === 0) {
				p.growT = 30;
				p.growTo = 1;
			} else {
				p.growT = 20;
				p.growTo = 2;
			}
		}
	}

	// A block hit from below (by Ember's head or a sliding shell).
	bumpBlock(tx, ty, byShell = false) {
		const id = this.tile(tx, ty);
		if (!isBumpable(id)) {
			if (id !== T.EMPTY && !byShell) {
				this.emit("bump");
			}
			return;
		}
		const s = this.s;
		const p = s.player;
		s.stats.blocks++;
		this.knockEnemiesOn(tx, ty);
		switch (id) {
			case T.QUESTION:
				this.setTile(tx, ty, T.USED);
				s.items.push({ type: "coinPop", x: tx * TILE + 4, y: ty * TILE - 8, vy: -4.5, t: 0 });
				this.addCoin();
				s.bumps.push({ tx, ty, t: 0 });
				break;
			case T.QUESTION_ITEM: {
				this.setTile(tx, ty, T.USED);
				const kind = p.power === 0 ? "berry" : "plum";
				s.items.push(spawnPowerUp(kind, tx, ty));
				s.bumps.push({ tx, ty, t: 0 });
				this.emit("itemout");
				break;
			}
			case T.QUESTION_LIFE:
			case T.HIDDEN:
				this.setTile(tx, ty, T.USED);
				s.items.push(spawnPowerUp("heart", tx, ty));
				s.bumps.push({ tx, ty, t: 0 });
				this.emit("itemout");
				break;
			case T.BRICK:
				if (p.power > 0 || byShell) {
					this.setTile(tx, ty, T.EMPTY);
					this.addScore(50);
					for (let i = 0; i < 4; i++) {
						s.particles.push({
							x: tx * TILE + (i % 2) * 8,
							y: ty * TILE + Math.floor(i / 2) * 8,
							vx: (i % 2 ? 1 : -1) * (1 + rand(s.rng)),
							vy: -3 - (i < 2 ? 1.5 : 0) - rand(s.rng),
							t: 0,
							life: 60,
							kind: "shard",
						});
					}
					this.emit("break");
				} else {
					s.bumps.push({ tx, ty, t: 0 });
					this.emit("bump");
				}
				break;
		}
	}

	knockEnemiesOn(tx, ty) {
		const top = ty * TILE;
		for (const e of this.s.enemies) {
			if (e.remove || e.state === "dead" || e.state === "flat") {
				continue;
			}
			if (Math.abs(e.y + e.h - top) < 2 && e.x + e.w > tx * TILE && e.x < (tx + 1) * TILE) {
				if (e.type === "boss") {
					continue;
				}
				this.killEnemy(e, e.x + e.w / 2 < tx * TILE + 8 ? -1 : 1);
				this.addScore(100, e.x, e.y);
			}
		}
	}

	startGoal(tx) {
		const s = this.s;
		const p = s.player;
		// Find the pole's extent.
		let top = 0;
		let ty = 0;
		for (ty = 0; ty < this.room.h; ty++) {
			const id = this.tile(tx, ty);
			if (id === T.POLE_TOP) {
				top = ty;
			}
			if (id !== T.POLE && id !== T.POLE_TOP && ty > top) {
				break;
			}
		}
		const baseY = ty * TILE; // the block under the pole
		const topY = top * TILE;
		const frac = Math.max(0, Math.min(1, (baseY - (p.y + p.h)) / (baseY - topY)));
		const bonus = frac > 0.9 ? 5000 : frac > 0.7 ? 2000 : frac > 0.5 ? 800 : frac > 0.3 ? 400 : frac > 0.1 ? 200 : 100;
		this.addScore(bonus, tx * TILE + 10, p.y);
		s.status = "goal";
		s.statusT = 0;
		s.goal = { tx, baseY, phase: "slide", t: 0, flagY: topY + 8 };
		p.x = tx * TILE + 8 - p.w - 2;
		p.vx = 0;
		p.vy = 0;
		p.facing = 1;
		p.pose = "pole";
		this.emit("goal");
	}

	updateGoal() {
		const s = this.s;
		const p = s.player;
		const g = s.goal;
		g.t++;
		if (g.phase === "slide") {
			p.y = Math.min(g.baseY - p.h, p.y + 2);
			g.flagY = Math.min(g.baseY - 20, g.flagY + 2);
			if (p.y >= g.baseY - p.h && g.t > 20) {
				g.phase = "walk";
				g.t = 0;
				p.x = g.tx * TILE + TILE + 2;
				p.pose = "walk";
				this.emit("music:clear");
			}
		} else if (g.phase === "walk") {
			p.vx = 1.2;
			p.vy = Math.min(PHYS.MAX_FALL, p.vy + PHYS.GRAV);
			p.x += p.vx;
			p.y += p.vy;
			const ty = Math.floor((p.y + p.h) / TILE);
			const tx = Math.floor((p.x + p.w / 2) / TILE);
			if (this.tile(tx, ty) !== T.EMPTY) {
				p.y = ty * TILE - p.h;
				p.vy = 0;
			}
			p.animT += 1.2;
			if (p.animT > 6) {
				p.animT = 0;
				p.anim = (p.anim + 1) % 3;
			}
			if (g.t > 110) {
				s.status = "complete";
			}
		}
	}

	finish() {
		const s = this.s;
		if (s.status !== "playing") {
			return;
		}
		s.status = "finishing";
		s.statusT = 0;
		s.player.pose = "idle";
		s.player.vx = 0;
		this.emit("goal");
		this.emit("music:clear");
	}

	startWarp(warp, leftTx) {
		const s = this.s;
		const p = s.player;
		s.status = "warp";
		s.statusT = 0;
		s.stats.warps++;
		s.warp = { warp, phase: "down", t: 0, clipY: p.y + p.h };
		p.x = leftTx * TILE + TILE - p.w / 2;
		p.vx = 0;
		p.vy = 0;
		p.pose = "idle";
		this.emit("pipe");
	}

	updateWarp() {
		const s = this.s;
		const p = s.player;
		const w = s.warp;
		w.t++;
		if (w.phase === "down") {
			p.y += 0.8;
			if (w.t >= 40) {
				const to = w.warp.to;
				this.enterRoom(to.room);
				p.x = to.x * TILE + 2;
				p.y = to.y * TILE + (TILE - p.h);
				if (to.exit === "up") {
					// Rise out of the pipe whose top-left tile is (to.x, to.y).
					p.x = to.x * TILE + TILE - p.w / 2;
					p.y = to.y * TILE - 2;
					w.clipY = to.y * TILE;
					w.phase = "up";
					w.t = 0;
					this.emit("pipe");
				} else {
					w.phase = "done";
				}
				this.updateCamera(true);
			}
		} else if (w.phase === "up") {
			p.y -= 0.8;
			const target = w.warp.to.y * TILE - p.h;
			if (p.y <= target) {
				p.y = target;
				w.phase = "done";
			}
		}
		if (w.phase === "done") {
			s.status = "playing";
			s.statusT = 0;
			s.warp = null;
			p.ground = false;
			p.vy = 0;
		}
	}

	updateCamera(snap = false) {
		const s = this.s;
		const p = s.player;
		const room = this.room;
		const cam = s.camera;
		const maxX = Math.max(0, room.w * TILE - VIEW_W);
		const maxY = Math.max(0, room.h * TILE - VIEW_H);
		const lead = p.facing > 0 ? 120 : 160;
		let tx = p.x + p.w / 2 - lead;
		tx = Math.max(0, Math.min(maxX, tx));
		let ty = maxY;
		if (room.scrollY) {
			ty = Math.max(0, Math.min(maxY, p.y + p.h / 2 - VIEW_H / 2));
		}
		if (snap) {
			cam.x = tx;
			cam.y = ty;
		} else {
			cam.x += (tx - cam.x) * 0.12;
			cam.y += (ty - cam.y) * 0.1;
			if (Math.abs(tx - cam.x) < 0.05) {
				cam.x = tx;
			}
			if (Math.abs(ty - cam.y) < 0.05) {
				cam.y = ty;
			}
		}
	}
}
