// Search bot: plays each level in the headless simulation and records the
// input sequence that completes it. Usage: node tests/bot.mjs [levelIndex]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Game, EMPTY_INPUT } from "../js/game.js";
import { LEVELS } from "../js/levels/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));

// Input frames are stored as bitmasks of held buttons.
export const BITS = { left: 1, right: 2, up: 4, down: 8, jump: 16, run: 32 };

export function decodeInput(bits, prevBits = 0) {
	return {
		left: Boolean(bits & BITS.left),
		right: Boolean(bits & BITS.right),
		up: Boolean(bits & BITS.up),
		down: Boolean(bits & BITS.down),
		jump: Boolean(bits & BITS.jump),
		run: Boolean(bits & BITS.run),
		jumpP: Boolean(bits & BITS.jump) && !(prevBits & BITS.jump),
		runP: Boolean(bits & BITS.run) && !(prevBits & BITS.run),
		pauseP: false,
		startP: false,
	};
}

function held(opts) {
	let b = 0;
	for (const k of Object.keys(opts)) {
		if (opts[k]) {
			b |= BITS[k];
		}
	}
	return b;
}

// Macro actions. Each returns the bits for frame i, or null to end.
function macros() {
	const list = [];
	const add = (name, maxFrames, fn, opts = {}) => list.push({ name, maxFrames, fn, ...opts });
	for (const hold of [ 26, 16, 8, 3 ]) {
		add(`RJ${hold}`, 90, (i) => held({ right: 1, run: 1, jump: i < hold }), { jump: true });
	}
	for (const hold of [ 26, 14, 6 ]) {
		add(`rj${hold}`, 90, (i) => held({ right: 1, jump: i < hold }), { jump: true });
	}
	add("R", 10, () => held({ right: 1, run: 1 }));
	add("r", 10, () => held({ right: 1 }));
	add("r3", 3, () => held({ right: 1 }));
	add("J26", 90, (i) => held({ jump: i < 26 }), { jump: true });
	add("J8", 90, (i) => held({ jump: i < 8 }), { jump: true });
	add("W", 12, () => 0);
	add("W40", 40, () => 0);
	add("D", 12, () => held({ down: 1 }));
	add("L", 10, () => held({ left: 1 }));
	add("l3", 3, () => held({ left: 1 }));
	add("LJ20", 90, (i) => held({ left: 1, jump: i < 20 }), { jump: true });
	add("LJ8", 90, (i) => held({ left: 1, run: 1, jump: i < 8 }), { jump: true });
	add("RF", 6, (i) => held({ right: 1, run: i === 2 }));
	add("F", 6, (i) => held({ run: i === 2 }));
	return list;
}

class Heap {
	constructor() {
		this.a = [];
	}
	push(item) {
		const a = this.a;
		a.push(item);
		let i = a.length - 1;
		while (i > 0) {
			const p = (i - 1) >> 1;
			if (a[p].pri >= a[i].pri) {
				break;
			}
			[ a[p], a[i] ] = [ a[i], a[p] ];
			i = p;
		}
	}
	pop() {
		const a = this.a;
		const top = a[0];
		const last = a.pop();
		if (a.length) {
			a[0] = last;
			let i = 0;
			for (;;) {
				const l = i * 2 + 1;
				const r = l + 1;
				let m = i;
				if (l < a.length && a[l].pri > a[m].pri) {
					m = l;
				}
				if (r < a.length && a[r].pri > a[m].pri) {
					m = r;
				}
				if (m === i) {
					break;
				}
				[ a[m], a[i] ] = [ a[i], a[m] ];
				i = m;
			}
		}
		return top;
	}
	get size() {
		return this.a.length;
	}
}

function roomRank(level, roomName) {
	if (roomName === "main") {
		return 0;
	}
	const room = level.rooms[roomName];
	return room.warps.length ? 0 : 1; // a room with no way back is the exit
}

function progressOf(game) {
	const w = game.state.world;
	const level = game.level;
	const p = w.player;
	const rank = roomRank(level, w.roomName);
	let x = p.x;
	if (rank === 0 && w.roomName !== "main") {
		// Bonus rooms count as the main-room x of the pipe that leads back.
		const back = level.rooms[w.roomName].warps[0];
		x = back ? back.to.x * 16 : 0;
	}
	let objective = 0;
	for (const e of w.enemies) {
		if (e.type === "boss") {
			objective = e.hits * 300;
		}
	}
	if (w.gateOpen) {
		objective = 2000;
	}
	return rank * 100000 + x + objective;
}

function stateKey(game) {
	const w = game.state.world;
	const p = w.player;
	let boss = "";
	for (const e of w.enemies) {
		if (e.type === "boss") {
			boss = `b${e.hits}${e.state[0]}`;
		}
	}
	const vb = p.vx > 1.6 ? 2 : p.vx > 0.3 ? 1 : p.vx < -0.3 ? -1 : 0;
	return `${w.roomName}|${Math.round(p.x / 8)}|${Math.round(p.y / 8)}|${p.ground ? 1 : 0}|${vb}|${w.frame >> 7}|${p.power > 0 ? 1 : 0}|${boss}|${w.gateOpen ? 1 : 0}`;
}

function newGame(levelIndex) {
	const game = new Game(LEVELS);
	game.startSession(levelIndex);
	game.step({ ...EMPTY_INPUT, startP: true });
	game.drainEvents();
	return game;
}

export function solveLevel(levelIndex, opts = {}) {
	const maxNodes = opts.maxNodes || 60000;
	const macroList = macros();
	const game = newGame(levelIndex);
	const start = structuredClone(game.state);
	const heap = new Heap();
	const visited = new Set();
	heap.push({ state: start, inputs: [], pri: progressOf(game), depth: 0 });
	let nodes = 0;
	let best = { pri: -Infinity, inputs: [], x: 0 };
	const t0 = Date.now();
	while (heap.size && nodes < maxNodes) {
		const node = heap.pop();
		nodes++;
		for (const m of macroList) {
			game.state = structuredClone(node.state);
			const inputs = node.inputs.slice();
			let prevBits = inputs.length ? inputs[inputs.length - 1] : 0;
			let dead = false;
			let done = false;
			let airborne = false;
			// Release jump first so a new press registers as an edge.
			if (m.jump && (prevBits & BITS.jump)) {
				const bits = m.fn(0) & ~BITS.jump;
				game.step(decodeInput(bits, prevBits));
				inputs.push(bits);
				prevBits = bits;
			}
			for (let i = 0; i < m.maxFrames; i++) {
				const bits = m.fn(i);
				game.step(decodeInput(bits, prevBits));
				inputs.push(bits);
				prevBits = bits;
				const st = game.state;
				if (st.screen === "complete" || st.screen === "ending") {
					done = true;
					break;
				}
				if (st.screen !== "play") {
					dead = true;
					break;
				}
				const w = st.world;
				if (w.status === "dying" || w.status === "dead") {
					dead = true;
					break;
				}
				if (w.status === "warp" || w.status === "goal" || w.status === "finishing") {
					// Let the transition play out with no input.
					let guard = 0;
					while (st.world.status !== "playing" && st.screen === "play" && guard++ < 400) {
						game.step(decodeInput(0, prevBits));
						inputs.push(0);
						prevBits = 0;
					}
					if (st.screen === "complete") {
						done = true;
					}
					break;
				}
				if (m.jump) {
					const p = w.player;
					if (!p.ground) {
						airborne = true;
					} else if (airborne) {
						break; // landed: decide again
					}
				}
			}
			if (dead) {
				continue;
			}
			if (done) {
				const elapsed = Date.now() - t0;
				return { ok: true, inputs, nodes, frames: inputs.length, ms: elapsed, stats: game.state.world.stats };
			}
			game.drainEvents();
			const key = stateKey(game);
			if (visited.has(key)) {
				continue;
			}
			visited.add(key);
			const pri = progressOf(game) - inputs.length * 0.002;
			if (pri > best.pri) {
				best = { pri, inputs, x: game.state.world.player.x, room: game.state.world.roomName };
			}
			heap.push({ state: structuredClone(game.state), inputs, pri, depth: node.depth + 1 });
		}
	}
	return { ok: false, nodes, best: { x: best.x, room: best.room, frames: best.inputs.length }, ms: Date.now() - t0 };
}

// Replay a recorded solution and report the outcome (used by check.mjs too).
export function replaySolution(levelIndex, inputs) {
	const game = newGame(levelIndex);
	let prev = 0;
	for (const bits of inputs) {
		game.step(decodeInput(bits, prev));
		prev = bits;
		if (game.state.screen === "complete") {
			return { ok: true, stats: game.state.world.stats, score: game.session.score };
		}
	}
	return { ok: game.state.screen === "complete", screen: game.state.screen, status: game.state.world && game.state.world.status };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
	const only = process.argv[2] !== undefined ? [ Number(process.argv[2]) ] : LEVELS.map((_, i) => i);
	let allOk = true;
	for (const i of only) {
		const res = solveLevel(i);
		if (res.ok) {
			const verify = replaySolution(i, res.inputs);
			console.log(`level ${i + 1} ${LEVELS[i].name}: solved in ${res.frames} frames (${(res.frames / 60).toFixed(1)} s), ${res.nodes} nodes, ${res.ms} ms, replay ${verify.ok ? "ok" : "FAILED"}; stomps=${res.stats.stomps} coins=${res.stats.coins}`);
			fs.mkdirSync(path.join(here, "solutions"), { recursive: true });
			fs.writeFileSync(path.join(here, "solutions", `level${i + 1}.json`), JSON.stringify(res.inputs));
			if (!verify.ok) {
				allOk = false;
			}
		} else {
			allOk = false;
			console.log(`level ${i + 1} ${LEVELS[i].name}: NOT SOLVED after ${res.nodes} nodes (${res.ms} ms). Furthest: room ${res.best.room} x=${res.best.x.toFixed(0)} (tile ${(res.best.x / 16).toFixed(1)})`);
		}
	}
	process.exit(allOk ? 0 : 1);
}
