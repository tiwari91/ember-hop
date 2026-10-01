// Ember, the hero. Movement, jumping, power states and sparks. Pure logic.
import { T, TILE, isPipeTop } from "./level.js";
import { moveEntity, overlappedTiles } from "./physics.js";

export const PHYS = {
	WALK: 1.5,
	RUN: 2.6,
	ACC: 0.09,
	RUN_ACC: 0.12,
	DEC: 0.12,
	SKID: 0.28,
	AIR_ACC: 0.08,
	GRAV_HOLD: 0.22,
	GRAV: 0.55,
	MAX_FALL: 4.8,
	JUMP: -5.4,
	JUMP_RUN: -0.5,
	COYOTE: 6,
	BUFFER: 6,
	STOMP_BOUNCE: -4,
	STOMP_BOUNCE_HELD: -6.2,
	INVULN: 90,
};

export const SMALL_H = 14;
export const BIG_H = 28;

export function createPlayer(x, y, power = 0) {
	return {
		type: "player",
		x,
		y: y + TILE - (power > 0 ? BIG_H : SMALL_H),
		w: 12,
		h: power > 0 ? BIG_H : SMALL_H,
		vx: 0,
		vy: 0,
		facing: 1,
		power,
		ground: false,
		coyote: 0,
		jumpBuf: 0,
		rising: false,
		invuln: 0,
		anim: 0,
		animT: 0,
		skid: false,
		growT: 0,
		growTo: 0,
		sparkCd: 0,
		combo: 0,
		platform: -1,
		prevBottom: 0,
		dying: false,
		deathT: 0,
		pose: "idle",
	};
}

export function setPower(p, power) {
	const bottom = p.y + p.h;
	p.power = power;
	p.h = power > 0 ? BIG_H : SMALL_H;
	p.y = bottom - p.h;
}

export function updatePlayer(world, input) {
	const s = world.s;
	const p = s.player;
	const room = world.room;
	const tiles = world.tiles;
	p.prevBottom = p.y + p.h;
	if (p.invuln > 0) {
		p.invuln--;
	}
	if (p.sparkCd > 0) {
		p.sparkCd--;
	}

	const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
	const max = input.run ? PHYS.RUN : PHYS.WALK;
	if (p.ground) {
		if (dir !== 0) {
			if (p.vx !== 0 && Math.sign(p.vx) !== dir) {
				p.vx += dir * PHYS.SKID;
				if (!p.skid && Math.abs(p.vx) > 1) {
					world.emit("skid");
				}
				p.skid = true;
			} else {
				if (Math.abs(p.vx) < max) {
					p.vx += dir * (input.run ? PHYS.RUN_ACC : PHYS.ACC);
				}
				p.skid = false;
			}
			p.facing = dir;
		} else {
			if (Math.abs(p.vx) <= PHYS.DEC) {
				p.vx = 0;
			} else {
				p.vx -= Math.sign(p.vx) * PHYS.DEC;
			}
			p.skid = false;
		}
	} else {
		if (dir !== 0) {
			if (Math.abs(p.vx) < max || Math.sign(p.vx) !== dir) {
				p.vx += dir * PHYS.AIR_ACC;
			}
			if (Math.sign(p.vx) === dir) {
				p.facing = dir;
			}
		}
		p.skid = false;
	}
	if (Math.abs(p.vx) > max) {
		p.vx = Math.sign(p.vx) * Math.max(max, Math.abs(p.vx) - 0.08);
	}
	if (Math.abs(p.vx) < 0.001) {
		p.vx = 0;
	}

	// Jump with buffering and coyote time.
	if (input.jumpP) {
		p.jumpBuf = PHYS.BUFFER;
	} else if (p.jumpBuf > 0) {
		p.jumpBuf--;
	}
	if (p.ground) {
		p.coyote = PHYS.COYOTE;
	} else if (p.coyote > 0) {
		p.coyote--;
	}
	if (p.jumpBuf > 0 && p.coyote > 0) {
		p.vy = PHYS.JUMP + PHYS.JUMP_RUN * Math.min(1, Math.abs(p.vx) / PHYS.RUN);
		p.jumpBuf = 0;
		p.coyote = 0;
		p.ground = false;
		p.rising = true;
		p.platform = -1;
		world.emit("jump");
	}
	if (p.vy >= 0 || !input.jump) {
		p.rising = false;
	}
	const g = p.rising ? PHYS.GRAV_HOLD : PHYS.GRAV;
	p.vy = Math.min(PHYS.MAX_FALL, p.vy + g);

	const wasGround = p.ground;
	const res = moveEntity(room, tiles, p);
	p.ground = res.ground;
	if (res.head && res.headTiles.length) {
		// Bump the tile nearest to the player's centre.
		const cx = p.x + p.w / 2;
		let best = null;
		let bestD = Infinity;
		for (const t of res.headTiles) {
			const d = Math.abs(t.tx * TILE + TILE / 2 - cx);
			if (d < bestD) {
				bestD = d;
				best = t;
			}
		}
		world.bumpBlock(best.tx, best.ty);
	}
	if (res.lava) {
		world.killPlayer();
		return;
	}

	ridePlatforms(world, p);

	if (p.ground) {
		if (!wasGround) {
			p.combo = 0;
		}
		p.rising = false;
	}

	// Fell into a pit.
	if (p.y > room.h * TILE + 8) {
		world.killPlayer(true);
		return;
	}

	// Pipe warps: stand on a pipe and press down.
	if (input.down && p.ground && world.room.warps.length) {
		const ty = Math.floor((p.y + p.h + 1) / TILE);
		const tx = Math.floor((p.x + p.w / 2) / TILE);
		const below = world.tile(tx, ty);
		if (isPipeTop(below)) {
			const leftTx = below === T.PIPE_TL ? tx : tx - 1;
			const warp = world.room.warps.find((w) => w.tx === leftTx && w.ty === ty);
			if (warp) {
				world.startWarp(warp, leftTx);
				return;
			}
		}
	}

	// Sparks.
	if (p.power === 2 && input.runP && p.sparkCd === 0) {
		const sparks = s.items.filter((i) => i.type === "spark").length;
		if (sparks < 2) {
			s.items.push({
				type: "spark",
				x: p.facing > 0 ? p.x + p.w : p.x - 8,
				y: p.y + (p.h - 8) / 2 - 2,
				w: 8,
				h: 8,
				vx: p.facing * 3.6,
				vy: 1,
				t: 0,
			});
			p.sparkCd = 10;
			p.pose = "throw";
			p.animT = 0;
			world.emit("spark");
		}
	}

	collectTiles(world, p);
	animate(p, dir);
}

function ridePlatforms(world, p) {
	const s = world.s;
	p.platform = -1;
	if (p.vy < 0) {
		return;
	}
	for (let i = 0; i < s.items.length; i++) {
		const pl = s.items[i];
		if (pl.type !== "platform") {
			continue;
		}
		const bottom = p.y + p.h;
		if (p.x + p.w > pl.x + 1 && p.x < pl.x + pl.w - 1 &&
			p.prevBottom <= pl.prevY + 2 && bottom >= pl.y - 2) {
			p.y = pl.y - p.h;
			p.vy = 0;
			p.ground = true;
			p.coyote = PHYS.COYOTE;
			p.platform = i;
			p.x += pl.dx;
			return;
		}
	}
}

function collectTiles(world, p) {
	const tiles = overlappedTiles(world.room, world.tiles, p, 3);
	for (const t of tiles) {
		if (t.id === T.COIN) {
			world.setTile(t.tx, t.ty, T.EMPTY);
			world.addCoin(t.tx * TILE + 4, t.ty * TILE);
		} else if (t.id === T.POLE || t.id === T.POLE_TOP) {
			world.startGoal(t.tx);
			return;
		} else if (t.id === T.GATE_OPEN) {
			world.finish();
			return;
		}
	}
}

function animate(p, dir) {
	if (p.pose === "throw") {
		p.animT++;
		if (p.animT > 8) {
			p.pose = "idle";
		} else {
			return;
		}
	}
	if (!p.ground) {
		p.pose = "jump";
	} else if (p.skid) {
		p.pose = "skid";
	} else if (p.vx !== 0) {
		p.pose = "walk";
		p.animT += Math.abs(p.vx);
		if (p.animT > 6) {
			p.animT = 0;
			p.anim = (p.anim + 1) % 3;
		}
	} else {
		p.pose = "idle";
		p.anim = 0;
	}
}
