// End-to-end checks: headless bot runs plus Playwright checks in Chromium.
// Usage: node tests/check.mjs   (serves the repo itself on a free port)
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { solveLevel, replaySolution } from "./bot.mjs";
import { LEVELS } from "../js/levels/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const PW = process.env.PLAYWRIGHT_PATH || "/Users/shankartiwar/Cayuse/s2s-web-client/node_modules/playwright/index.mjs";
const CHROME = process.env.CHROME_PATH || `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell`;

const results = [];
function record(name, ok, detail = "") {
	results.push({ name, ok, detail });
	console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function check(name, fn) {
	try {
		const detail = await fn();
		record(name, true, typeof detail === "string" ? detail : "");
	} catch (err) {
		record(name, false, err && err.message ? err.message : String(err));
	}
}

function assert(cond, msg) {
	if (!cond) {
		throw new Error(msg);
	}
}

// --- 1. Headless: the bot beats every level ------------------------------
const solutions = [];
for (let i = 0; i < LEVELS.length; i++) {
	await check(`bot beats level ${i + 1} (${LEVELS[i].name}) headless`, () => {
		const res = solveLevel(i);
		assert(res.ok, `not solved; furthest ${JSON.stringify(res.best)}`);
		const rep = replaySolution(i, res.inputs);
		assert(rep.ok, "replay of solution failed");
		solutions[i] = res.inputs;
		fs.mkdirSync(path.join(here, "solutions"), { recursive: true });
		fs.writeFileSync(path.join(here, "solutions", `level${i + 1}.json`), JSON.stringify(res.inputs));
		return `${res.frames} frames, ${(res.frames / 60).toFixed(1)} s game time, ${res.nodes} nodes, ${res.ms} ms`;
	});
}

// --- 2. Static server ------------------------------------------------------
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const server = http.createServer((req, res) => {
	let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
	if (p === "/") {
		p = "/index.html";
	}
	const file = path.join(root, p);
	if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
		res.writeHead(404);
		res.end("not found");
		return;
	}
	res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
	fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;

// --- 3. Browser checks -----------------------------------------------------
const { chromium } = await import(PW);
const browser = await chromium.launch({ executablePath: CHROME });
const shots = path.join(root, "screenshots");
fs.mkdirSync(shots, { recursive: true });

const errors = [];
async function newPage(opts = {}) {
	const context = await browser.newContext({ viewport: { width: 960, height: 576 }, ...opts });
	const page = await context.newPage();
	page.on("console", (m) => {
		if (m.type() === "error") {
			errors.push(m.text());
		}
	});
	page.on("pageerror", (e) => errors.push(String(e)));
	await page.goto(base, { waitUntil: "load" });
	await page.waitForFunction(() => window.__game && window.__game.state);
	return { page, context };
}

const screen = (page) => page.evaluate(() => window.__game.state.screen);
const player = (page) => page.evaluate(() => {
	const w = window.__game.state.world;
	return w ? { x: w.player.x, y: w.player.y, ground: w.player.ground, vy: w.player.vy, status: w.status } : null;
});
const waitReplay = (page, timeout = 60000) => page.waitForFunction(() => !window.__game.replaying(), null, { timeout });

const { page } = await newPage();

await check("boots with zero console errors", async () => {
	await page.waitForTimeout(500);
	assert(errors.length === 0, errors.join(" | "));
	assert((await screen(page)) === "title", "not on title");
	await page.screenshot({ path: path.join(shots, "title.png") });
	return "title screen rendered";
});

await check("title -> level 1 starts", async () => {
	await page.keyboard.press("Space");
	await page.waitForFunction(() => window.__game.state.screen === "card");
	await page.keyboard.press("Space");
	await page.waitForFunction(() => window.__game.state.screen === "play");
	const p = await player(page);
	assert(p && p.status === "playing", "world not playing");
	return `player at x=${p.x.toFixed(0)}`;
});

await check("player moves right and jumps", async () => {
	const before = await player(page);
	await page.keyboard.down("ArrowRight");
	await page.waitForTimeout(500);
	await page.keyboard.up("ArrowRight");
	const after = await player(page);
	assert(after.x > before.x + 20, `x ${before.x} -> ${after.x}`);
	await page.keyboard.down("KeyZ");
	await page.waitForTimeout(120);
	const mid = await player(page);
	await page.keyboard.up("KeyZ");
	assert(!mid.ground && mid.y < after.y - 8, `did not leave ground: y ${after.y} -> ${mid.y}`);
	await page.waitForTimeout(800);
	const landed = await player(page);
	assert(landed.ground, "did not land");
	return `moved ${(after.x - before.x).toFixed(0)} px, jumped ${(after.y - mid.y).toFixed(0)} px`;
});

await check("pause and resume", async () => {
	await page.keyboard.press("KeyP");
	await page.waitForFunction(() => window.__game.state.screen === "pause");
	const a = await player(page);
	await page.waitForTimeout(200);
	const b = await player(page);
	assert(a.x === b.x && a.y === b.y, "world advanced while paused");
	await page.keyboard.press("KeyP");
	await page.waitForFunction(() => window.__game.state.screen === "play");
	return "P toggles pause";
});

await check("death and respawn", async () => {
	// Walk into the first Grumble without jumping: small Ember loses a life.
	const livesBefore = await page.evaluate(() => window.__game.state.session.lives);
	const st = await page.evaluate((lives) => {
		const g = window.__game;
		let frames = 0;
		while (g.state.session.lives === lives && frames < 1500) {
			g.stepFrames(30, { right: true });
			frames += 30;
		}
		const out = { screen: g.state.screen, lives: g.state.session.lives, frames };
		let guard = 0;
		while (g.state.screen === "card" && guard++ < 200) {
			g.stepFrames(1);
		}
		return out;
	}, livesBefore);
	assert(st.lives === livesBefore - 1, `lives ${livesBefore} -> ${st.lives}`);
	assert(st.screen === "card" || st.screen === "play", `screen ${st.screen}`);
	await page.waitForFunction(() => window.__game.state.screen === "play");
	const p = await player(page);
	assert(p.x < 80, `respawned at x=${p.x}`);
	return `lives ${livesBefore} -> ${st.lives}, respawn x=${p.x.toFixed(0)}`;
});

await check("level 1 replay: stomp, coins, goal pole, level complete transition", async () => {
	await page.evaluate(() => window.__game.startLevel(0));
	await page.evaluate((inputs) => window.__game.replay(inputs, 20, 560), solutions[0]);
	await page.waitForFunction(() => window.__game.paused(), null, { timeout: 20000 });
	await page.waitForTimeout(100);
	await page.screenshot({ path: path.join(shots, "level1.png") });
	await page.evaluate(() => window.__game.resume());
	await waitReplay(page);
	const last = await page.evaluate(() => window.__game.lastReplay());
	assert(last.screen === "complete", `ended on ${last.screen}/${last.status}`);
	assert(last.stats.stomps >= 1, "no stomps");
	assert(last.stats.coins >= 1 && last.coins >= 1, "no coins");
	assert(last.score > 0, "no score");
	await page.waitForFunction(() => window.__game.state.screen === "card" && window.__game.state.session.levelIndex === 1, null, { timeout: 15000 });
	return `stomps=${last.stats.stomps} coins=${last.stats.coins} score=${last.score}, advanced to level 2 card`;
});

await check("coin collect increments the counter directly", async () => {
	// Bump the first ? block in level 1 (tile 16, row 6) from below.
	const res = await page.evaluate(() => {
		const g = window.__game;
		g.startLevel(0);
		const w = g.state.world;
		w.player.x = 16 * 16 + 2;
		const before = g.state.session.coins;
		g.stepFrames(1, { jump: true });
		g.stepFrames(40, { jump: true });
		return { before, after: g.state.session.coins, blocks: w.stats.blocks };
	});
	assert(res.after === res.before + 1, `coins ${res.before} -> ${res.after}`);
	return `coins ${res.before} -> ${res.after}`;
});

for (let i = 0; i < LEVELS.length; i++) {
	await check(`level ${i + 1} (${LEVELS[i].name}) beatable in the browser via bot replay`, async () => {
		await page.evaluate((idx) => window.__game.startLevel(idx), i);
		const pauseAt = i === 1 ? 420 : i === 3 ? 1380 : -1;
		await page.evaluate(([ inputs, at ]) => window.__game.replay(inputs, 30, at), [ solutions[i], pauseAt ]);
		if (pauseAt >= 0) {
			await page.waitForFunction(() => window.__game.paused(), null, { timeout: 20000 });
			await page.waitForTimeout(100);
			await page.screenshot({ path: path.join(shots, `level${i + 1}.png`) });
			await page.evaluate(() => window.__game.resume());
		}
		await waitReplay(page);
		const last = await page.evaluate(() => window.__game.lastReplay());
		assert(last.screen === "complete", `ended on ${last.screen}/${last.status} after ${last.frames} frames`);
		return `${last.frames} frames, score ${last.score}`;
	});
}

await check("no console errors during play", async () => {
	assert(errors.length === 0, errors.join(" | "));
	return "clean";
});

await check("phone landscape viewport shows touch controls that move the player", async () => {
	const mobile = await newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
	const m = mobile.page;
	await m.waitForTimeout(300);
	const vis = await m.evaluate(() => {
		const b = document.querySelector("[data-action=right]");
		const r = b.getBoundingClientRect();
		return { touchClass: document.body.classList.contains("touch"), visible: r.width > 0 && getComputedStyle(b).visibility !== "hidden", canvas: document.getElementById("game").getBoundingClientRect().width };
	});
	assert(vis.touchClass && vis.visible, "touch controls hidden");
	await m.dispatchEvent("[data-action=jump]", "pointerdown");
	await m.dispatchEvent("[data-action=jump]", "pointerup");
	await m.waitForFunction(() => window.__game.state.screen === "card");
	await m.dispatchEvent("[data-action=jump]", "pointerdown");
	await m.dispatchEvent("[data-action=jump]", "pointerup");
	await m.waitForFunction(() => window.__game.state.screen === "play");
	const before = await player(m);
	await m.dispatchEvent("[data-action=right]", "pointerdown");
	await m.waitForTimeout(500);
	await m.dispatchEvent("[data-action=right]", "pointerup");
	const after = await player(m);
	assert(after.x > before.x + 20, `touch right did not move: ${before.x} -> ${after.x}`);
	await m.screenshot({ path: path.join(shots, "phone.png") });
	await mobile.context.close();
	return `canvas ${vis.canvas}px wide, moved ${(after.x - before.x).toFixed(0)} px`;
});

await browser.close();
server.close();

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
