// Boot, fixed-step loop, scaling, visibility pause, save/audio plumbing.
import { Game, VIEW_W, VIEW_H, EMPTY_INPUT } from "./game.js";
import { LEVELS } from "./levels/index.js";
import { Renderer } from "./render.js";
import { UI } from "./ui.js";
import { Input } from "./input.js";
import { Audio } from "./audio.js";
import { loadSave, writeSave } from "./storage.js";

const STEP = 1000 / 60;
const MAX_STEPS = 5;

const canvas = document.getElementById("game");
const renderer = new Renderer(canvas);
const ui = new UI(renderer);
const input = new Input(window);
const audio = new Audio();
const saved = loadSave();
const game = new Game(LEVELS, saved);
audio.setMuted(Boolean(saved.muted));

const touchRoot = document.getElementById("touch");
input.bindTouch(touchRoot);
const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
const touchy = coarse || ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
if (touchy) {
	document.body.classList.add("touch");
	ui.touch = true;
}

input.onAny = () => audio.unlock();
window.addEventListener("pointerdown", () => audio.unlock(), { passive: true });

// Integer scaling so pixels stay crisp.
function resize() {
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const touchPad = document.body.classList.contains("touch") ? 0 : 0;
	let scale = Math.floor(Math.min(vw / VIEW_W, (vh - touchPad) / VIEW_H));
	if (scale < 1) {
		scale = Math.min(vw / VIEW_W, vh / VIEW_H); // tiny screens: fractional fallback
	}
	canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
	canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
}
window.addEventListener("resize", resize);
resize();

document.addEventListener("visibilitychange", () => {
	if (document.hidden && game.state.screen === "play") {
		game.setScreen("pause");
		audio.stopMusic();
	}
});

function save() {
	writeSave({ best: game.state.best, unlocked: game.state.unlocked, muted: game.state.muted });
}

function handleEvents() {
	for (const ev of game.drainEvents()) {
		if (ev === "save") {
			save();
		} else if (ev.startsWith("music:")) {
			const name = ev.slice(6);
			if (name === "stop") {
				audio.stopMusic();
			} else if (name === "clear") {
				audio.stopMusic();
				audio.play("clear");
			} else {
				audio.playMusic(name);
			}
		} else if (ev === "unpause") {
			audio.play(ev);
			audio.playMusic(game.level.music);
		} else {
			audio.play(ev);
		}
	}
}

// Replay support for automated checks: queue of input bitmasks.
const replay = { queue: null, prev: 0, speed: 1, index: 0, pauseAt: -1, paused: false, last: null };
const BITS = { left: 1, right: 2, up: 4, down: 8, jump: 16, run: 32 };
function decode(bits, prev) {
	return {
		left: Boolean(bits & BITS.left), right: Boolean(bits & BITS.right), up: Boolean(bits & BITS.up),
		down: Boolean(bits & BITS.down), jump: Boolean(bits & BITS.jump), run: Boolean(bits & BITS.run),
		jumpP: Boolean(bits & BITS.jump) && !(prev & BITS.jump), runP: Boolean(bits & BITS.run) && !(prev & BITS.run),
		pauseP: false, startP: false,
	};
}

function stepOnce(snap) {
	if (snap.muteP) {
		game.state.muted = !game.state.muted;
		audio.setMuted(game.state.muted);
		save();
	}
	game.step(snap);
	handleEvents();
}

let last = performance.now();
let acc = 0;
function frame(now) {
	requestAnimationFrame(frame);
	acc += Math.min(250, now - last);
	last = now;
	let steps = 0;
	if (replay.queue) {
		// Fast-forward through recorded inputs (used by tests/check.mjs).
		for (let i = 0; i < replay.speed && !replay.paused && replay.index < replay.queue.length; i++) {
			if (replay.index === replay.pauseAt) {
				replay.paused = true;
				break;
			}
			const bits = replay.queue[replay.index++];
			stepOnce(decode(bits, replay.prev));
			replay.prev = bits;
			if (game.state.screen !== "play") {
				break;
			}
		}
		if (replay.index >= replay.queue.length || (game.state.screen !== "play" && !replay.paused)) {
			const w = game.state.world;
			replay.last = {
				screen: game.state.screen,
				status: w ? w.status : null,
				stats: w ? { ...w.stats } : null,
				score: game.session ? game.session.score : 0,
				coins: game.session ? game.session.coins : 0,
				lives: game.session ? game.session.lives : 0,
				levelIndex: game.session ? game.session.levelIndex : -1,
				frames: replay.index,
			};
			replay.queue = null;
		}
		acc = 0;
	} else {
		while (acc >= STEP && steps < MAX_STEPS) {
			stepOnce(input.snapshot());
			acc -= STEP;
			steps++;
		}
		if (steps === MAX_STEPS) {
			acc = 0;
		}
	}
	ui.draw(game);
}
requestAnimationFrame(frame);

// Debug / test hooks.
let hookPrev = EMPTY_INPUT;
window.__game = {
	game,
	get state() {
		return game.state;
	},
	startLevel(i) {
		game.state.selected = i;
		game.startSession(i);
		game.step({ ...EMPTY_INPUT, startP: true });
		handleEvents();
	},
	replay(inputs, speed = 20, pauseAt = -1) {
		replay.queue = inputs.slice();
		replay.prev = 0;
		replay.index = 0;
		replay.speed = speed;
		replay.pauseAt = pauseAt;
		replay.paused = false;
		replay.last = null;
	},
	resume() {
		replay.pauseAt = -1;
		replay.paused = false;
	},
	replaying() {
		return Boolean(replay.queue);
	},
	paused() {
		return replay.paused;
	},
	lastReplay() {
		return replay.last;
	},
	stepFrames(n, snap = EMPTY_INPUT) {
		for (let i = 0; i < n; i++) {
			const full = { ...EMPTY_INPUT, ...snap };
			full.jumpP = Boolean(full.jump && !hookPrev.jump);
			full.runP = Boolean(full.run && !hookPrev.run);
			hookPrev = full;
			stepOnce(full);
		}
	},
};
