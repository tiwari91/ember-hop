// AABB movement against the tile grid. Entities are { x, y, w, h, vx, vy }.
import { T, TILE, isSolid, tileAt } from "./level.js";

export function overlaps(a, b) {
	return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function tileSolidFor(id, dir) {
	if (id === T.HIDDEN) {
		return dir === "up"; // hidden blocks only exist for a head bump
	}
	return isSolid(id);
}

// Move an entity by its velocity, resolving collisions on each axis separately.
// Returns { ground, head, wall, headTiles } for the caller to react to.
export function moveEntity(room, tiles, e, opts = {}) {
	const res = { ground: false, head: false, wall: 0, headTiles: [], lava: false };
	const maxStep = TILE - 1;
	let dx = e.vx;
	let dy = e.vy;
	// Sub-step large motions so fast objects do not tunnel through tiles.
	while (dx !== 0 || dy !== 0) {
		const sx = Math.max(-maxStep, Math.min(maxStep, dx));
		const sy = Math.max(-maxStep, Math.min(maxStep, dy));
		dx -= sx;
		dy -= sy;
		if (sx !== 0) {
			e.x += sx;
			const hit = collideX(room, tiles, e, sx);
			if (hit) {
				res.wall = sx > 0 ? 1 : -1;
				dx = 0;
				if (!opts.keepVx) {
					e.vx = 0;
				}
			}
		}
		if (sy !== 0) {
			e.y += sy;
			const hit = collideY(room, tiles, e, sy, res);
			if (hit) {
				if (sy > 0) {
					res.ground = true;
				} else {
					res.head = true;
				}
				dy = 0;
				e.vy = 0;
			}
		}
	}
	if (!res.ground) {
		res.ground = onGround(room, tiles, e);
	}
	res.lava = touchesTile(room, tiles, e, T.LAVA);
	return res;
}

function collideX(room, tiles, e, sx) {
	const dir = sx > 0 ? "right" : "left";
	const x = sx > 0 ? e.x + e.w - 0.001 : e.x;
	const tx = Math.floor(x / TILE);
	const ty1 = Math.floor(e.y / TILE);
	const ty2 = Math.floor((e.y + e.h - 0.001) / TILE);
	for (let ty = ty1; ty <= ty2; ty++) {
		if (tileSolidFor(tileAt(room, tiles, tx, ty), dir)) {
			e.x = sx > 0 ? tx * TILE - e.w : (tx + 1) * TILE;
			return true;
		}
	}
	return false;
}

function collideY(room, tiles, e, sy, res) {
	const dir = sy > 0 ? "down" : "up";
	const y = sy > 0 ? e.y + e.h - 0.001 : e.y;
	const ty = Math.floor(y / TILE);
	const tx1 = Math.floor((e.x + 0.5) / TILE);
	const tx2 = Math.floor((e.x + e.w - 0.5) / TILE);
	let hit = false;
	for (let tx = tx1; tx <= tx2; tx++) {
		const id = tileAt(room, tiles, tx, ty);
		if (tileSolidFor(id, dir)) {
			hit = true;
			if (dir === "up") {
				res.headTiles.push({ tx, ty, id });
			}
		}
	}
	if (hit) {
		e.y = sy > 0 ? ty * TILE - e.h : (ty + 1) * TILE;
	}
	return hit;
}

export function onGround(room, tiles, e) {
	const ty = Math.floor((e.y + e.h + 0.5) / TILE);
	if ((e.y + e.h) % TILE > 0.51 && (e.y + e.h) % TILE < TILE - 0.5) {
		return false;
	}
	const tx1 = Math.floor((e.x + 0.5) / TILE);
	const tx2 = Math.floor((e.x + e.w - 0.5) / TILE);
	for (let tx = tx1; tx <= tx2; tx++) {
		if (tileSolidFor(tileAt(room, tiles, tx, ty), "down")) {
			return true;
		}
	}
	return false;
}

// Is there solid ground one tile ahead and below the entity's leading edge?
export function groundAhead(room, tiles, e, dir) {
	const x = dir > 0 ? e.x + e.w + 1 : e.x - 1;
	const tx = Math.floor(x / TILE);
	const ty = Math.floor((e.y + e.h + 1) / TILE);
	return tileSolidFor(tileAt(room, tiles, tx, ty), "down");
}

export function touchesTile(room, tiles, e, id) {
	const tx1 = Math.floor(e.x / TILE);
	const tx2 = Math.floor((e.x + e.w - 0.001) / TILE);
	const ty1 = Math.floor(e.y / TILE);
	const ty2 = Math.floor((e.y + e.h - 0.001) / TILE);
	for (let ty = ty1; ty <= ty2; ty++) {
		for (let tx = tx1; tx <= tx2; tx++) {
			if (tileAt(room, tiles, tx, ty) === id) {
				return true;
			}
		}
	}
	return false;
}

// Every tile id overlapped by the entity (used for coins and the goal pole).
export function overlappedTiles(room, tiles, e, inset = 2) {
	const out = [];
	const tx1 = Math.floor((e.x + inset) / TILE);
	const tx2 = Math.floor((e.x + e.w - inset) / TILE);
	const ty1 = Math.floor((e.y + inset) / TILE);
	const ty2 = Math.floor((e.y + e.h - inset) / TILE);
	for (let ty = ty1; ty <= ty2; ty++) {
		for (let tx = tx1; tx <= tx2; tx++) {
			out.push({ tx, ty, id: tileAt(room, tiles, tx, ty) });
		}
	}
	return out;
}
