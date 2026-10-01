// Canvas 2D renderer: camera, parallax backgrounds, tiles, entities, effects.
import { T, TILE, isSolid } from "./level.js";
import { VIEW_W, VIEW_H } from "./game.js";
import { Sprites, THEMES, tileImage, drawText } from "./sprites.js";

export class Renderer {
	constructor(canvas) {
		this.canvas = canvas;
		canvas.width = VIEW_W;
		canvas.height = VIEW_H;
		this.ctx = canvas.getContext("2d", { alpha: false });
		this.ctx.imageSmoothingEnabled = false;
		this.reducedMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
		this.tick = 0;
	}

	// Draw the current world (play, pause, complete screens share this).
	drawWorld(game) {
		const ctx = this.ctx;
		const world = game.world;
		this.tick++;
		if (!world) {
			this.drawSky("overworld");
			return;
		}
		const s = world.s;
		const room = world.room;
		const theme = room.theme || game.level.theme;
		const th = THEMES[theme] || THEMES.overworld;
		let camX = Math.round(s.camera.x);
		let camY = Math.round(s.camera.y);
		if (s.shake > 0 && !this.reducedMotion) {
			camX += (this.tick % 2 ? 1 : -1) * Math.min(3, s.shake);
			camY += (this.tick % 3 ? 1 : -1) * Math.min(2, s.shake >> 1);
		}
		this.drawSky(theme);
		this.drawBackground(theme, th, camX, camY, room);
		ctx.save();
		ctx.translate(-camX, -camY);
		this.drawTiles(world, theme, camX, camY);
		this.drawDecor(world, theme, camX);
		this.drawItems(world);
		this.drawEnemies(world);
		this.drawPlayer(world);
		this.drawParticles(world, th);
		ctx.restore();
	}

	drawSky(theme) {
		const ctx = this.ctx;
		const th = THEMES[theme] || THEMES.overworld;
		if (th.sky !== th.skyBottom) {
			const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
			g.addColorStop(0, th.sky);
			g.addColorStop(1, th.skyBottom);
			ctx.fillStyle = g;
		} else {
			ctx.fillStyle = th.sky;
		}
		ctx.fillRect(0, 0, VIEW_W, VIEW_H);
	}

	drawBackground(theme, th, camX, camY, room) {
		const ctx = this.ctx;
		const groundY = room.h * TILE - 32 - camY;
		if (theme === "overworld" || theme === "dusk") {
			if (th.stars) {
				ctx.fillStyle = "#ffe9c0";
				for (let i = 0; i < 40; i++) {
					const sx = (i * 97 + 13) % (VIEW_W + 40) - (camX * 0.05) % 40;
					const sy = (i * 53) % 90;
					ctx.fillRect(Math.round(sx), sy, 1, 1);
				}
			}
			// far hills
			const hx = -((camX * 0.25) % 256);
			for (let i = -1; i < 3; i++) {
				const bx = hx + i * 256;
				this.hill(bx + 40, groundY, 80, 40, th.hills[0]);
				this.hill(bx + 170, groundY, 56, 26, th.hills[0]);
			}
			// near hills and bushes
			const nx = -((camX * 0.5) % 320);
			for (let i = -1; i < 3; i++) {
				const bx = nx + i * 320;
				this.hill(bx + 230, groundY, 60, 20, th.hills[1]);
				this.bush(bx + 90, groundY, 40, th.hills[1]);
				this.bush(bx + 300, groundY, 24, th.hills[1]);
			}
			if (th.cloud) {
				const cx = -((camX * 0.3) % 320);
				for (let i = -1; i < 3; i++) {
					const bx = cx + i * 320;
					this.cloud(bx + 30, 30, th.cloud);
					this.cloud(bx + 150, 58, th.cloud);
					this.cloud(bx + 250, 22, th.cloud);
				}
			}
		} else if (theme === "underground") {
			const cx = -((camX * 0.3) % 96);
			ctx.fillStyle = th.hills[1];
			for (let i = -1; i < 5; i++) {
				ctx.fillRect(Math.round(cx + i * 96 + 20), 16, 12, VIEW_H);
				ctx.fillRect(Math.round(cx + i * 96 + 60), 40, 6, VIEW_H);
			}
		} else if (theme === "castle") {
			const cx = -((camX * 0.4) % 128);
			ctx.fillStyle = th.hills[1];
			for (let i = -1; i < 4; i++) {
				const bx = Math.round(cx + i * 128);
				ctx.fillRect(bx + 20, 40, 24, 56);
				ctx.fillStyle = "#30506a";
				ctx.fillRect(bx + 28, 48, 8, 20);
				ctx.fillStyle = th.hills[1];
				ctx.fillRect(bx + 80, 24, 16, 90);
			}
		}
	}

	hill(x, groundY, w, h, color) {
		const ctx = this.ctx;
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.moveTo(Math.round(x), groundY);
		ctx.lineTo(Math.round(x + w / 2), groundY - h);
		ctx.lineTo(Math.round(x + w), groundY);
		ctx.closePath();
		ctx.fill();
	}

	bush(x, groundY, w, color) {
		const ctx = this.ctx;
		ctx.fillStyle = color;
		ctx.fillRect(Math.round(x), groundY - 6, w, 6);
		ctx.fillRect(Math.round(x + 4), groundY - 10, w - 8, 4);
		ctx.fillRect(Math.round(x + 8), groundY - 13, w - 16, 3);
	}

	cloud(x, y, color) {
		const ctx = this.ctx;
		ctx.fillStyle = color;
		ctx.fillRect(Math.round(x), y + 6, 36, 8);
		ctx.fillRect(Math.round(x + 6), y + 2, 14, 4);
		ctx.fillRect(Math.round(x + 18), y, 10, 6);
	}

	drawTiles(world, theme, camX, camY) {
		const ctx = this.ctx;
		const room = world.room;
		const tiles = world.tiles;
		const s = world.s;
		const tx1 = Math.max(0, Math.floor(camX / TILE));
		const tx2 = Math.min(room.w - 1, Math.floor((camX + VIEW_W) / TILE) + 1);
		const ty1 = Math.max(0, Math.floor(camY / TILE));
		const ty2 = Math.min(room.h - 1, Math.floor((camY + VIEW_H) / TILE) + 1);
		const qFrame = Math.floor(this.tick / 10) % 3;
		const lavaFrame = Math.floor(this.tick / 8) % 4;
		const coinFrame = Math.floor(this.tick / 6) % 4;
		for (let ty = ty1; ty <= ty2; ty++) {
			for (let tx = tx1; tx <= tx2; tx++) {
				const id = tiles[ty * room.w + tx];
				if (id === T.EMPTY || id === T.HIDDEN) {
					continue;
				}
				let dy = 0;
				for (const b of s.bumps) {
					if (b.tx === tx && b.ty === ty) {
						dy = -Math.round(Math.sin((b.t / 12) * Math.PI) * 5);
					}
				}
				if (id === T.COIN) {
					ctx.drawImage(Sprites.coin(coinFrame).r, tx * TILE, ty * TILE);
					continue;
				}
				const top = id === T.GROUND && ty > 0 && !isSolid(tiles[(ty - 1) * room.w + tx]);
				const img = tileImage(id, theme, id === T.LAVA ? lavaFrame : qFrame, top);
				if (img) {
					ctx.drawImage(img, tx * TILE, ty * TILE + dy);
				}
			}
		}
		// Flag on the goal pole.
		if (s.goal || true) {
			for (let tx = tx1; tx <= tx2; tx++) {
				for (let ty = ty1; ty <= ty2; ty++) {
					if (tiles[ty * room.w + tx] === T.POLE_TOP) {
						const fy = s.goal ? s.goal.flagY : ty * TILE + 8;
						ctx.fillStyle = "#e2402a";
						ctx.beginPath();
						ctx.moveTo(tx * TILE + 7, fy);
						ctx.lineTo(tx * TILE - 7, fy + 6);
						ctx.lineTo(tx * TILE + 7, fy + 12);
						ctx.closePath();
						ctx.fill();
						ctx.fillStyle = "#fff3dc";
						ctx.fillRect(tx * TILE - 1, fy + 5, 3, 2);
					}
				}
			}
		}
	}

	// Theme decorations that are not tiles: the little fort after the pole.
	drawDecor(world, theme, camX) {
		if (theme !== "overworld" && theme !== "dusk") {
			return;
		}
		const ctx = this.ctx;
		const room = world.room;
		const tiles = world.tiles;
		for (let tx = 0; tx < room.w; tx++) {
			if (tiles[1 * room.w + tx] === T.POLE_TOP || tiles[2 * room.w + tx] === T.POLE_TOP) {
				const fx = (tx + 4) * TILE;
				if (fx < camX - 100 || fx > camX + VIEW_W + 20) {
					return;
				}
				const gy = (room.h - 2) * TILE;
				ctx.fillStyle = "#8a5a2a";
				ctx.fillRect(fx, gy - 48, 64, 48);
				ctx.fillStyle = "#c8743c";
				ctx.fillRect(fx + 8, gy - 64, 48, 16);
				ctx.fillStyle = "#5c3a08";
				for (let i = 0; i < 4; i++) {
					ctx.fillRect(fx + 8 + i * 14, gy - 70, 6, 6);
				}
				ctx.fillStyle = "#1c1c24";
				ctx.fillRect(fx + 26, gy - 24, 12, 24);
				ctx.fillRect(fx + 14, gy - 44, 6, 8);
				ctx.fillRect(fx + 44, gy - 44, 6, 8);
				return;
			}
		}
	}

	drawItems(world) {
		const ctx = this.ctx;
		for (const it of world.s.items) {
			switch (it.type) {
				case "platform": {
					const x = Math.round(it.x);
					const y = Math.round(it.y);
					ctx.fillStyle = "#c8743c";
					ctx.fillRect(x, y, it.w, it.h);
					ctx.fillStyle = "#e49a62";
					ctx.fillRect(x, y, it.w, 2);
					ctx.fillStyle = "#5c3a08";
					for (let i = 0; i < it.w; i += 8) {
						ctx.fillRect(x + i, y + 2, 1, it.h - 2);
					}
					break;
				}
				case "berry":
				case "plum":
				case "heart": {
					if (it.emerge > 0) {
						// Clip to above the block it rises from.
						ctx.save();
						ctx.beginPath();
						ctx.rect(it.x - 8, it.y - 32, 32, 32 + (TILE - it.emerge * (TILE / 20)) - 2);
						ctx.clip();
					}
					const img = it.type === "berry" ? Sprites.berry() : it.type === "plum" ? Sprites.plum() : Sprites.heart();
					ctx.drawImage(img.r, Math.round(it.x) - 2, Math.round(it.y) - 2);
					if (it.emerge > 0) {
						ctx.restore();
					}
					break;
				}
				case "spark":
					ctx.drawImage(Sprites.spark(Math.floor(it.t / 3)).r, Math.round(it.x), Math.round(it.y));
					break;
				case "coinPop":
					ctx.drawImage(Sprites.coin(Math.floor(it.t / 3)).r, Math.round(it.x) - 4, Math.round(it.y));
					break;
			}
		}
	}

	drawEnemies(world) {
		const ctx = this.ctx;
		for (const e of world.s.enemies) {
			const x = Math.round(e.x);
			const y = Math.round(e.y);
			const anim = Math.floor(e.anim / 8);
			const flipped = e.state === "dead";
			ctx.save();
			if (flipped) {
				ctx.translate(x + e.w / 2, y + e.h / 2);
				ctx.scale(1, -1);
				ctx.translate(-(x + e.w / 2), -(y + e.h / 2));
			}
			switch (e.type) {
				case "grumble":
					if (e.state === "flat") {
						ctx.drawImage(Sprites.grumble(0).r, 0, 8, 16, 8, x - 2, y, 16, 8);
					} else {
						const img = Sprites.grumble(anim);
						ctx.drawImage(e.dir > 0 ? img.r : img.l, x - 2, y - 2);
					}
					break;
				case "clanker":
					if (e.state === "walk") {
						const img = Sprites.clanker(anim);
						ctx.drawImage(e.dir > 0 ? img.r : img.l, x - 2, y);
					} else {
						const wiggle = e.state === "shell" && e.t > 300 ? (Math.floor(e.t / 4) % 2) * 2 - 1 : 0;
						ctx.drawImage(Sprites.shell().r, x - 2 + wiggle, y);
					}
					break;
				case "flitter": {
					const img = Sprites.flitter(Math.floor(e.anim / 6));
					ctx.drawImage(e.dir > 0 ? img.r : img.l, x - 1, y - 4);
					break;
				}
				case "chompvine": {
					const img = Sprites.chompvine(Math.floor(e.anim / 12));
					// Clip so the plant never shows below the pipe mouth.
					ctx.save();
					ctx.beginPath();
					ctx.rect(x - 8, e.baseY - 64, 32, 64);
					ctx.clip();
					ctx.drawImage(img.r, x - 2, y);
					ctx.restore();
					break;
				}
				case "boss": {
					if (e.state === "hurt" && Math.floor(e.t / 3) % 2) {
						break;
					}
					const img = Sprites.boss(anim);
					ctx.drawImage(e.dir > 0 ? img.r : img.l, x - 2, y - 4);
					break;
				}
			}
			ctx.restore();
		}
	}

	drawPlayer(world) {
		const ctx = this.ctx;
		const s = world.s;
		const p = s.player;
		if (p.invuln > 0 && !p.dying && Math.floor(p.invuln / 3) % 2 === 1 && s.status === "playing") {
			return;
		}
		let power = p.power;
		let pose = p.dying ? "dead" : p.pose;
		// Grow / shrink flicker between sizes.
		if (p.growT > 0) {
			const alt = Math.floor(p.growT / 4) % 2 === 0;
			power = alt ? p.growTo : p.power;
			pose = "idle";
		}
		const img = Sprites.fox(power, pose, p.anim);
		const sprite = p.facing >= 0 ? img.r : img.l;
		const h = sprite.height;
		const x = Math.round(p.x) - 2;
		const y = Math.round(p.y + p.h) - h;
		if (s.status === "warp" && s.warp) {
			ctx.save();
			ctx.beginPath();
			const clipY = s.warp.phase === "down" ? s.warp.clipY : s.warp.clipY;
			ctx.rect(x - 8, clipY - 64, 32, 64);
			ctx.clip();
			ctx.drawImage(sprite, x, y);
			ctx.restore();
			return;
		}
		ctx.drawImage(sprite, x, y);
		if (p.skid && p.ground && !p.dying) {
			ctx.fillStyle = "#ffffffaa";
			ctx.fillRect(Math.round(p.x) + (p.facing > 0 ? -4 : p.w + 2), Math.round(p.y + p.h) - 3, 3, 2);
		}
	}

	drawParticles(world, th) {
		const ctx = this.ctx;
		const s = world.s;
		for (const pt of s.particles) {
			const x = Math.round(pt.x);
			const y = Math.round(pt.y);
			if (pt.kind === "shard") {
				ctx.fillStyle = th.ground[0];
				ctx.fillRect(x, y, 6, 6);
				ctx.fillStyle = th.ground[2];
				ctx.fillRect(x, y + 4, 6, 2);
			} else if (pt.kind === "puff") {
				const r = 2 + pt.t;
				ctx.fillStyle = "#ffffffcc";
				ctx.fillRect(x - r / 2 + 2, y - r / 2 + 2, r, r);
			} else if (pt.kind === "sparkle") {
				ctx.fillStyle = "#fff3dc";
				ctx.fillRect(x, y, 2, 2);
				ctx.fillRect(x - 2, y + 1, 6, 1);
			}
		}
		for (const pop of s.popups) {
			drawText(ctx, pop.text, pop.x, pop.y, "#ffffff", 1);
		}
	}
}
