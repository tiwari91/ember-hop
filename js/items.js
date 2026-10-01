// Coins, power-ups, sparks, platforms, particles and score popups. Pure logic.
import { TILE } from "./level.js";
import { moveEntity, overlaps } from "./physics.js";

export function spawnPlatform(sp) {
	const x = sp.tx * TILE;
	const y = sp.ty * TILE;
	const horizontal = sp.type === "platformH";
	return {
		type: "platform",
		x,
		y,
		w: (sp.width || 3) * TILE,
		h: 8,
		baseX: x,
		baseY: y,
		axis: horizontal ? "h" : "v",
		range: (sp.range || (horizontal ? 4 : 3)) * TILE,
		speed: sp.speed || 0.02,
		phase: sp.phase || 0,
		dx: 0,
		dy: 0,
		prevY: y,
	};
}

export function spawnPowerUp(kind, tx, ty) {
	return {
		type: kind, // berry | plum | heart
		x: tx * TILE + 2,
		y: ty * TILE,
		w: 12,
		h: 14,
		vx: 0,
		vy: 0,
		dir: 1,
		emerge: 20,
		t: 0,
	};
}

export function updateItem(world, it) {
	it.t++;
	switch (it.type) {
		case "platform":
			updatePlatform(it);
			break;
		case "berry":
		case "heart":
		case "plum":
			updatePowerUp(world, it);
			break;
		case "spark":
			updateSpark(world, it);
			break;
		case "coinPop":
			it.vy += 0.35;
			it.y += it.vy;
			if (it.t > 28) {
				it.remove = true;
			}
			break;
	}
}

function updatePlatform(pl) {
	pl.prevY = pl.y;
	const prevX = pl.x;
	pl.phase += pl.speed;
	const off = Math.sin(pl.phase) * pl.range;
	if (pl.axis === "h") {
		pl.x = pl.baseX + off;
		pl.y = pl.baseY;
	} else {
		pl.x = pl.baseX;
		pl.y = pl.baseY + off;
	}
	pl.dx = pl.x - prevX;
	pl.dy = pl.y - pl.prevY;
}

function updatePowerUp(world, it) {
	if (it.emerge > 0) {
		it.emerge--;
		it.y -= TILE / 20;
		return;
	}
	if (it.type === "plum") {
		return;
	}
	it.vx = it.dir * 0.8;
	it.vy = Math.min(4, it.vy + 0.35);
	const res = moveEntity(world.room, world.tiles, it);
	if (res.wall) {
		it.dir = -res.wall;
	}
	if (it.y > world.room.h * TILE + 32) {
		it.remove = true;
	}
}

function updateSpark(world, it) {
	it.vy = Math.min(4.5, it.vy + 0.45);
	const res = moveEntity(world.room, world.tiles, it, { keepVx: true });
	if (res.wall) {
		it.remove = true;
		world.puff(it.x, it.y);
		return;
	}
	if (res.ground) {
		it.vy = -3.2;
	}
	const cam = world.s.camera;
	if (it.x < cam.x - 16 || it.x > cam.x + 336 || it.y > world.room.h * TILE) {
		it.remove = true;
		return;
	}
	for (const e of world.s.enemies) {
		if (e.remove || e.state === "dead" || e.state === "flat") {
			continue;
		}
		if (overlaps(it, e)) {
			it.remove = true;
			world.puff(it.x, it.y);
			if (e.type === "boss") {
				world.hurtBoss(e, 0.5);
			} else {
				world.killEnemy(e, Math.sign(it.vx) || 1);
				world.addScore(e.type === "chompvine" ? 200 : 100, e.x, e.y);
			}
			return;
		}
	}
}

export function updateParticles(world) {
	const s = world.s;
	for (const pt of s.particles) {
		pt.t++;
		pt.vy += pt.g === undefined ? 0.3 : pt.g;
		pt.x += pt.vx;
		pt.y += pt.vy;
		if (pt.t > pt.life) {
			pt.remove = true;
		}
	}
	s.particles = s.particles.filter((pt) => !pt.remove);
	for (const pop of s.popups) {
		pop.t++;
		pop.y -= 0.5;
		if (pop.t > 45) {
			pop.remove = true;
		}
	}
	s.popups = s.popups.filter((pop) => !pop.remove);
	for (const b of s.bumps) {
		b.t++;
		if (b.t > 12) {
			b.remove = true;
		}
	}
	s.bumps = s.bumps.filter((b) => !b.remove);
}
