// Boot, fixed-step loop, scaling, visibility pause, save/audio plumbing.
import { Game, VIEW_W, VIEW_H, EMPTY_INPUT } from "./game.js";
import { LEVELS } from "./levels/index.js";
import { Renderer } from "./render.js";
import { Renderer3D, webglAvailable } from "./render3d/renderer3d.js";
import { UI } from "./ui.js";
import { HERO, loadHeroFace } from "./hero.js";
import { Input } from "./input.js";
import { Audio } from "./audio.js";
import { loadSave, writeSave } from "./storage.js";

const STEP = 1000 / 60;
const MAX_STEPS = 5;

const canvas = document.getElementById("game");
const glCanvas = document.getElementById("gl");
const input = new Input(window);
const audio = new Audio();
const saved = loadSave();
const game = new Game(LEVELS, saved);
audio.setMuted(Boolean(saved.muted));

// Renderers: the 3D view is the default; the 2D painter is the fallback and a setting.
const renderer2d = new Renderer(canvas, { alpha: true });
let renderer3d = null;
const can3d = webglAvailable();
function get3d() {
	if (!renderer3d && can3d) {
		try {
			renderer3d = new Renderer3D(canvas, glCanvas, game.levels);
			if (HERO.face) {
				renderer3d.setFace(HERO.face);
			}
		} catch (err) {
			console.warn("3D renderer unavailable, using 2D", err);
			renderer3d = null;
		}
	}
	return renderer3d;
}
const ui = new UI(renderer2d);
function applyView() {
	const want3d = game.state.settings.view === "3d";
	const r3 = want3d ? get3d() : null;
	ui.r = r3 || renderer2d;
	ui.ctx = ui.r.ctx;
	document.body.classList.toggle("view3d", Boolean(r3));
	glCanvas.hidden = !r3;
	if (r3) {
		r3.resize(canvas.clientWidth, canvas.clientHeight);
	}
}
applySettings();
applyView();
loadHeroFace((img) => {
	if (renderer3d) {
		renderer3d.setFace(img);
	}
});

const touchRoot = document.getElementById("touch");
input.bindTouch(touchRoot);
const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
const touchy = coarse || ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
if (touchy) {
	document.body.classList.add("touch");
	ui.touch = true;
}

input.onAny = () => {
	audio.unlock();
	hold = false;
};
for (const type of [ "pointerdown", "touchend", "click", "keydown" ]) {
	window.addEventListener(type, () => audio.unlock(), { passive: true });
}

// Integer scaling keeps pixels crisp on desktops. On phones an integer scale
// often drops to 1x and wastes most of the screen, so fill the space instead.
function safeInsets() {
	const cs = getComputedStyle(document.documentElement);
	const read = name => parseFloat(cs.getPropertyValue(name)) || 0;

	return { t: read("--sat"), r: read("--sar"), b: read("--sab"), l: read("--sal") };
}

// The size to lay out against. The visual viewport tracks Safari's toolbars,
// but it also shrinks while the page is pinch-zoomed, so fall back to the
// layout viewport then instead of shrinking the game with the zoom.
function viewportSize() {
	const vv = window.visualViewport;
	const de = document.documentElement;
	if (vv && Math.abs((vv.scale || 1) - 1) < 0.01) {
		return { vw: vv.width, vh: vv.height };
	}
	return { vw: de.clientWidth || window.innerWidth, vh: de.clientHeight || window.innerHeight };
}

let layoutKey = "";
function resize() {
	const { vw, vh } = viewportSize();
	if (!(vw > 0 && vh > 0)) {
		return;
	}
	const touch = document.body.classList.contains("touch");
	const portrait = touch && vh > vw;
	document.body.classList.toggle("portrait", portrait);
	const ins = safeInsets();

	let availW = vw - ins.l - ins.r;
	let availH = vh - ins.t - ins.b;
	if (portrait) {
		availW -= 16; // side gutter
		availH -= 48 + 220; // pause button row above, touch controls below
	} else if (touch) {
		availH -= 8;
	}

	const fit = Math.max(0.5, Math.min(availW / VIEW_W, availH / VIEW_H));
	let scale = Math.floor(fit);
	if (scale < 1 || (touch && (fit - scale) / fit > 0.12)) {
		scale = fit;
	}
	const w = Math.floor(VIEW_W * scale);
	const h = Math.floor(VIEW_H * scale);
	const key = `${w}x${h}@${window.devicePixelRatio || 1}`;
	if (key !== layoutKey) {
		layoutKey = key;
		canvas.style.width = `${w}px`;
		canvas.style.height = `${h}px`;
		glCanvas.style.width = `${w}px`;
		glCanvas.style.height = `${h}px`;
	}
	if (renderer3d) {
		renderer3d.resize(w, h);
	}
}

// iOS reports the new size late after a rotation or toolbar change, and not
// always through the same event, so coalesce every signal into one re-measure
// per frame and check again once the animation has settled.
let resizeQueued = false;
function queueResize() {
	if (resizeQueued) {
		return;
	}
	resizeQueued = true;
	requestAnimationFrame(() => {
		resizeQueued = false;
		resize();
	});
}
function settleResize() {
	queueResize();
	for (const ms of [ 120, 350, 700 ]) {
		setTimeout(queueResize, ms);
	}
}
if (window.visualViewport) {
	window.visualViewport.addEventListener("resize", queueResize);
}
window.addEventListener("resize", queueResize);
window.addEventListener("orientationchange", settleResize);
if (screen.orientation && screen.orientation.addEventListener) {
	screen.orientation.addEventListener("change", settleResize);
}
if (typeof ResizeObserver === "function") {
	new ResizeObserver(queueResize).observe(document.getElementById("stage"));
}
resize();

// Pinch and double-tap zoom: iOS ignores user-scalable=no, so stop the gestures.
for (const type of [ "gesturestart", "gesturechange" ]) {
	document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}
document.addEventListener("touchmove", (e) => {
	if (e.touches.length > 1 || (e.scale !== undefined && e.scale !== 1)) {
		e.preventDefault();
	}
}, { passive: false });
let lastTouchEnd = 0;
document.addEventListener("touchend", (e) => {
	const now = Date.now();
	if (now - lastTouchEnd < 350) {
		e.preventDefault();
	}
	lastTouchEnd = now;
	audio.unlock();
}, { passive: false });

// Coming back to the page: after a tab switch, or a restore from the
// back/forward cache, re-measure and restart the loop clock so the simulation
// does not try to catch up on the time spent away. Audio resumes on the next
// touch (iOS only allows that from a gesture).
function wake() {
	last = performance.now();
	acc = 0;
	settleResize();
	kickLoop();
}

document.addEventListener("visibilitychange", () => {
	if (document.hidden) {
		if (game.state.screen === "play") {
			game.state.menu = 0;
			game.setScreen("pause");
			audio.stopMusic();
		}
	} else {
		wake();
	}
});
window.addEventListener("pageshow", (e) => {
	if (e.persisted) {
		wake();
	}
});
window.addEventListener("focus", wake);

function save() {
	writeSave(game.saveData());
}

function applySettings() {
	const s = game.state.settings;
	audio.setVolumes(s.music / 10, s.sfx / 10);
	if (typeof applyView === "function" && ui) {
		applyView();
	}
}

// Test hook support: after startLevel() the loop holds the simulation until a
// replay or stepFrames() call (or real input) so the recorded inputs line up.
let hold = false;

// Hit-stop: a few frames of freeze on impactful hits. Purely presentational;
// the simulation only ever sees the input sequence, so replays are unaffected.
let hitStop = 0;

function handleEvents() {
	for (const ev of game.drainEvents()) {
		if (ev === "save") {
			save();
		} else if (ev === "settings") {
			applySettings();
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
			if (ev === "stomp" || ev === "kick") {
				hitStop = Math.max(hitStop, 3);
			} else if (ev === "bosshit" || ev === "bossdead") {
				hitStop = Math.max(hitStop, 6);
				ui.r.flash = 3;
			} else if (ev === "break") {
				hitStop = Math.max(hitStop, 2);
			}
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

// Render timing for the performance check.
const frameTimes = [];
const frameGaps = [];
let lastFrameAt = 0;
function recordFrame(ms, now) {
	frameTimes.push(ms);
	if (frameTimes.length > 240) {
		frameTimes.shift();
	}
	if (lastFrameAt) {
		frameGaps.push(now - lastFrameAt);
		if (frameGaps.length > 240) {
			frameGaps.shift();
		}
	}
	lastFrameAt = now;
}

// Render interpolation. The simulation advances in fixed 60 Hz steps, but the
// display refreshes on its own clock: a frame can land just before or just
// after a step, so drawing the latest state as-is alternates between 0 and 2
// steps per frame and reads as judder. Instead every moving body remembers
// where it was before the last step and is drawn part of the way between the
// two states, by how far the clock has run into the next step.
const prevPos = new WeakMap();
const TELEPORT = 40;

function remember(o) {
	let p = prevPos.get(o);
	if (!p) {
		p = { x: 0, y: 0, step: -1 };
		prevPos.set(o, p);
	}
	p.x = o.x;
	p.y = o.y;
	p.step = stepCount;
}

function rememberList(list) {
	for (let i = 0; i < list.length; i++) {
		remember(list[i]);
	}
}

function rememberWorld() {
	const s = game.state.screen === "play" ? game.state.world : null;
	if (!s) {
		return;
	}
	remember(s.camera);
	remember(s.player);
	rememberList(s.enemies);
	rememberList(s.items);
	rememberList(s.particles);
}

const blended = [];
function blend(o, alpha) {
	const p = prevPos.get(o);
	if (!p || p.step !== stepCount - 1) {
		return;
	}
	const dx = o.x - p.x;
	const dy = o.y - p.y;
	if (Math.abs(dx) > TELEPORT || Math.abs(dy) > TELEPORT || (dx === 0 && dy === 0)) {
		return;
	}
	blended.push(o, o.x, o.y);
	o.x = p.x + dx * alpha;
	o.y = p.y + dy * alpha;
}

function blendWorld(alpha) {
	const s = game.state.screen === "play" ? game.state.world : null;
	if (!s || alpha >= 1) {
		return;
	}
	blend(s.camera, alpha);
	blend(s.player, alpha);
	for (const list of [ s.enemies, s.items, s.particles ]) {
		for (let i = 0; i < list.length; i++) {
			blend(list[i], alpha);
		}
	}
}

function unblendWorld() {
	for (let i = 0; i < blended.length; i += 3) {
		blended[i].x = blended[i + 1];
		blended[i].y = blended[i + 2];
	}
	blended.length = 0;
}

let stepCount = 0;
let last = performance.now();
let acc = 0;
let rafId = 0;
let tickAcc = 0;
let lastTick = performance.now();
function frame(now) {
	rafId = requestAnimationFrame(frame);
	lastTick = performance.now();
	let dt = Math.min(250, Math.max(0, now - last));
	last = now;
	// Snap near-vsync intervals to exactly one step so a 60 Hz display steps once per frame.
	if (Math.abs(dt - STEP) < 0.6) {
		dt = STEP;
	}
	acc += dt;
	let steps = 0;
	let alpha = 1;
	if (replay.queue) {
		// Fast-forward through recorded inputs (used by tests/check.mjs).
		hitStop = 0;
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
	} else if (hold) {
		acc = 0;
	} else if (hitStop > 0 && game.state.screen === "play") {
		if (acc >= STEP) {
			hitStop--;
			acc = Math.min(acc - STEP, STEP);
		}
	} else {
		while (acc >= STEP && steps < MAX_STEPS) {
			rememberWorld();
			stepCount++;
			stepOnce(input.snapshot());
			acc -= STEP;
			steps++;
			if (hitStop > 0) {
				break;
			}
		}
		if (steps === MAX_STEPS) {
			acc = 0;
		}
		alpha = hitStop > 0 ? 1 : Math.min(1, acc / STEP);
	}
	watchContext(now);
	// Presentation clocks (run cycles, flicker, drifting clouds) count 60 Hz
	// ticks of display time, so they keep their speed at 30 Hz (Low Power
	// Mode) or 120 Hz instead of following the frame rate.
	tickAcc += dt;
	const ticks = Math.min(4, Math.floor(tickAcc / STEP));
	tickAcc -= ticks * STEP;
	if (tickAcc > STEP) {
		tickAcc = 0;
	}
	ui.tickStep = ticks;
	ui.r.tickStep = ticks;
	const t0 = performance.now();
	blendWorld(alpha);
	try {
		ui.draw(game);
	} finally {
		unblendWorld();
	}
	recordFrame(performance.now() - t0, t0);
}

// If the WebGL context is lost and not given back within a few seconds, draw
// with the 2D painter until it returns, rather than showing a frozen frame.
let lostSince = 0;
function watchContext(now) {
	if (!renderer3d) {
		return;
	}
	if (renderer3d.contextLost) {
		lostSince = lostSince || now;
		if (ui.r === renderer3d && now - lostSince > 2500) {
			ui.r = renderer2d;
			ui.ctx = renderer2d.ctx;
			document.body.classList.remove("view3d");
			glCanvas.hidden = true;
		}
	} else if (lostSince) {
		lostSince = 0;
		applyView();
	}
}

// Start the loop, or restart it if the browser stopped delivering frames
// (seen on iOS after a restore from the back/forward cache).
function kickLoop() {
	cancelAnimationFrame(rafId);
	last = performance.now();
	acc = 0;
	rafId = requestAnimationFrame(frame);
}
kickLoop();
setInterval(() => {
	if (!document.hidden && performance.now() - lastTick > 1000) {
		kickLoop();
	}
}, 1000);

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
		hold = true;
	},
	replay(inputs, speed = 20, pauseAt = -1) {
		hold = false;
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
		hold = false;
		for (let i = 0; i < n; i++) {
			const full = { ...EMPTY_INPUT, ...snap };
			full.jumpP = Boolean(full.jump && !hookPrev.jump);
			full.runP = Boolean(full.run && !hookPrev.run);
			hookPrev = full;
			stepOnce(full);
		}
	},
	// Render cost of recent frames in milliseconds.
	frameStats() {
		const n = frameTimes.length;
		if (!n) {
			return { avg: 0, max: 0, p95: 0, n: 0 };
		}
		const sorted = frameTimes.slice().sort((a, b) => a - b);
		const gaps = frameGaps.length ? frameGaps.reduce((a, b) => a + b, 0) / frameGaps.length : 0;
		return {
			avg: frameTimes.reduce((a, b) => a + b, 0) / n,
			max: sorted[n - 1],
			p95: sorted[Math.floor(n * 0.95)],
			fps: gaps ? 1000 / gaps : 0,
			n,
		};
	},
	resetFrameStats() {
		frameTimes.length = 0;
		frameGaps.length = 0;
	},
	view() {
		return ui.r.is3d ? "3d" : "2d";
	},
	renderer3d() {
		return renderer3d;
	},
	debugZoom(z) {
		if (renderer3d) {
			renderer3d.debugZoom = z;
		}
	},
	setView(v) {
		game.state.settings.view = v;
		applyView();
	},
};
