// Grumble, Clanker, Flitter, Chompvine and Baron Thornback. Pure logic.
import { TILE } from "./level.js";
import { moveEntity, groundAhead, overlaps } from "./physics.js";

const GRAV = 0.4;
const MAX_FALL = 4.5;

export function spawnEnemy(sp) {
	const x = sp.tx * TILE;
	const y = sp.ty * TILE;
	switch (sp.type) {
		case "grumble":
			return { type: "grumble", x: x + 2, y: y + 2, w: 12, h: 14, vx: 0, vy: 0, dir: sp.dir || -1, speed: sp.speed || 0.6, state: "walk", t: 0, anim: 0 };
		case "clanker":
			return { type: "clanker", x: x + 2, y: y, w: 12, h: 16, vx: 0, vy: 0, dir: sp.dir || -1, state: "walk", t: 0, anim: 0, grace: 0 };
		case "flitter":
			return { type: "flitter", x: x + 1, y: y + 3, w: 14, h: 10, vx: 0, vy: 0, baseX: x + 1, baseY: y + 3, range: sp.range || 56, dir: sp.dir || -1, speed: sp.speed || 0.9, phase: sp.phase || 0, state: "fly", t: 0, anim: 0 };
		case "chompvine":
			return { type: "chompvine", x: x + 10, y: y + TILE, w: 12, h: 22, vx: 0, vy: 0, baseY: y + TILE, state: "hidden", t: sp.delay || 0, anim: 0 };
		case "boss":
			return { type: "boss", x: x, y: y - 12, w: 28, h: 28, vx: 0, vy: 0, dir: -1, hp: 3, state: "walk", t: 0, anim: 0, hits: 0 };
		default:
			throw new Error(`Unknown enemy ${sp.type}`);
	}
}

export function isStompable(e) {
	return e.type !== "chompvine" && e.state !== "dead" && e.state !== "flat";
}

export function isHarmful(e) {
	if (e.state === "dead" || e.state === "flat") {
		return false;
	}
	if (e.type === "chompvine") {
		return e.state !== "hidden";
	}
	if (e.type === "clanker" && e.state === "shell") {
		return false;
	}
	if (e.type === "clanker" && e.state === "slide" && e.grace > 0) {
		return false;
	}
	return true;
}

export function updateEnemy(world, e) {
	e.t++;
	e.anim++;
	switch (e.type) {
		case "grumble":
			updateGrumble(world, e);
			break;
		case "clanker":
			updateClanker(world, e);
			break;
		case "flitter":
			updateFlitter(world, e);
			break;
		case "chompvine":
			updateChompvine(world, e);
			break;
		case "boss":
			updateBoss(world, e);
			break;
	}
}

function fall(e) {
	e.vy = Math.min(MAX_FALL, e.vy + GRAV);
}

function updateDead(world, e) {
	// Flipped over and falling out of the world.
	fall(e);
	e.x += e.vx;
	e.y += e.vy;
	if (e.y > world.room.h * TILE + 32) {
		e.remove = true;
	}
}

function updateGrumble(world, e) {
	if (e.state === "dead") {
		return updateDead(world, e);
	}
	if (e.state === "flat") {
		if (e.t > 40) {
			e.remove = true;
		}
		return;
	}
	e.vx = e.dir * e.speed;
	fall(e);
	const res = moveEntity(world.room, world.tiles, e);
	if (res.wall) {
		e.dir = -res.wall;
	}
	if (e.y > world.room.h * TILE + 32) {
		e.remove = true;
	}
}

function updateClanker(world, e) {
	if (e.state === "dead") {
		return updateDead(world, e);
	}
	if (e.grace > 0) {
		e.grace--;
	}
	if (e.state === "walk") {
		e.vx = e.dir * 0.5;
		fall(e);
		const res = moveEntity(world.room, world.tiles, e);
		if (res.wall) {
			e.dir = -res.wall;
		} else if (res.ground && !groundAhead(world.room, world.tiles, e, e.dir)) {
			e.dir = -e.dir;
		}
	} else if (e.state === "shell") {
		e.vx = 0;
		fall(e);
		moveEntity(world.room, world.tiles, e);
		if (e.t > 360) {
			e.state = "walk";
			e.t = 0;
			e.dir = -1;
		}
	} else if (e.state === "slide") {
		e.vx = e.dir * 3.2;
		fall(e);
		const res = moveEntity(world.room, world.tiles, e, { keepVx: true });
		if (res.wall) {
			e.dir = -res.wall;
			world.emit("bump");
			if (res.wall > 0) {
				world.bumpBlock(Math.floor((e.x + e.w + 1) / TILE), Math.floor((e.y + e.h / 2) / TILE), true);
			} else {
				world.bumpBlock(Math.floor((e.x - 1) / TILE), Math.floor((e.y + e.h / 2) / TILE), true);
			}
		}
		// A sliding shell takes out everything it touches.
		for (const o of world.s.enemies) {
			if (o !== e && !o.remove && o.state !== "dead" && o.state !== "flat" && o.type !== "boss" && overlaps(e, o)) {
				world.killEnemy(o, e.dir);
				world.addScore(100, o.x, o.y);
			} else if (o !== e && o.type === "boss" && o.state !== "dead" && o.state !== "hurt" && overlaps(e, o)) {
				world.hurtBoss(o, 1);
			}
		}
	}
	if (e.y > world.room.h * TILE + 32) {
		e.remove = true;
	}
}

function updateFlitter(world, e) {
	if (e.state === "dead") {
		return updateDead(world, e);
	}
	e.x += e.dir * e.speed;
	if (e.x > e.baseX + e.range) {
		e.dir = -1;
	} else if (e.x < e.baseX - e.range) {
		e.dir = 1;
	}
	e.phase += 0.07;
	e.y = e.baseY + Math.sin(e.phase) * 14;
}

function updateChompvine(world, e) {
	if (e.state === "dead") {
		e.remove = true;
		return;
	}
	const p = world.s.player;
	const near = Math.abs(p.x + p.w / 2 - (e.x + e.w / 2)) < 44;
	const up = e.baseY - e.h + 2;
	switch (e.state) {
		case "hidden":
			e.y = e.baseY;
			if (e.t > 80 && !near) {
				e.state = "rising";
				e.t = 0;
			}
			break;
		case "rising":
			e.y = e.baseY - (e.baseY - up) * Math.min(1, e.t / 40);
			if (e.t >= 40) {
				e.state = "up";
				e.t = 0;
			}
			break;
		case "up":
			e.y = up;
			if (e.t > 70) {
				e.state = "sinking";
				e.t = 0;
			}
			break;
		case "sinking":
			e.y = up + (e.baseY - up) * Math.min(1, e.t / 40);
			if (e.t >= 40) {
				e.state = "hidden";
				e.t = 0;
			}
			break;
	}
}

function updateBoss(world, e) {
	if (e.state === "dead") {
		fall(e);
		e.y += e.vy;
		if (e.y > world.room.h * TILE + 40) {
			e.remove = true;
		}
		return;
	}
	const p = world.s.player;
	const speed = 0.7 + e.hits * 0.35;
	if (e.state === "hurt") {
		e.vx = 0;
		fall(e);
		moveEntity(world.room, world.tiles, e);
		if (e.t > 50) {
			e.state = "walk";
			e.t = 0;
		}
		return;
	}
	if (e.state === "walk") {
		if (e.t % 40 === 0) {
			e.dir = p.x + p.w / 2 < e.x + e.w / 2 ? -1 : 1;
		}
		e.vx = e.dir * speed;
		fall(e);
		const res = moveEntity(world.room, world.tiles, e);
		if (res.wall) {
			e.dir = -res.wall;
		}
		const dist = Math.abs(p.x - e.x);
		if ((e.t > 90 && dist < 70) || e.t > 200) {
			e.state = "jump";
			e.vy = -6.2;
			e.t = 0;
			world.emit("bossjump");
		}
	} else if (e.state === "jump") {
		e.vx = e.dir * (speed + 0.6);
		fall(e);
		const res = moveEntity(world.room, world.tiles, e, { keepVx: true });
		if (res.wall) {
			e.dir = -res.wall;
		}
		if (res.ground && e.vy >= 0 && e.t > 5) {
			e.state = "walk";
			e.t = 1;
			world.emit("thud");
			world.shake(4);
		}
	}
}
