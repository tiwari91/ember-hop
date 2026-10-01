// Canvas 2D renderer: camera, layered parallax backgrounds, tiles, entities,
// lighting, vignette and purely visual effects (dust, ambience, squash/stretch).
// Nothing here writes to the simulation state.
import { T, TILE, isSolid } from "./level.js";
import { VIEW_W, VIEW_H } from "./game.js";
import { Sprites, THEMES, tileImage, drawText, glowTexture, colorGlow, vignetteTexture, shadowTexture } from "./sprites.js";

const LAYER_CACHE = new Map();

function layerCanvas(key, w, h, draw) {
	if (!LAYER_CACHE.has(key)) {
		const c = document.createElement("canvas");
		c.width = w;
		c.height = h;
		const ctx = c.getContext("2d");
		draw(ctx, w, h);
		LAYER_CACHE.set(key, c);
	}
	return LAYER_CACHE.get(key);
}

function hash(a, b = 0) {
	let h = (a * 374761393 + b * 668265263) | 0;
	h = (h ^ (h >>> 13)) * 1274126177;
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function hill(ctx, x, baseY, w, h, color, cap = null) {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(x, baseY);
	ctx.bezierCurveTo(x + w * 0.2, baseY - h * 1.05, x + w * 0.8, baseY - h * 1.05, x + w, baseY);
	ctx.closePath();
	ctx.fill();
	if (cap) {
		ctx.fillStyle = cap;
		ctx.beginPath();
		ctx.moveTo(x + w * 0.22, baseY - h * 0.62);
		ctx.bezierCurveTo(x + w * 0.35, baseY - h * 0.98, x + w * 0.6, baseY - h * 0.98, x + w * 0.72, baseY - h * 0.7);
		ctx.bezierCurveTo(x + w * 0.6, baseY - h * 0.8, x + w * 0.4, baseY - h * 0.8, x + w * 0.22, baseY - h * 0.62);
		ctx.closePath();
		ctx.fill();
	}
}

function peak(ctx, x, baseY, w, h, color, snow) {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(x, baseY);
	ctx.lineTo(x + w * 0.38, baseY - h);
	ctx.lineTo(x + w * 0.47, baseY - h * 0.86);
	ctx.lineTo(x + w * 0.58, baseY - h * 0.94);
	ctx.lineTo(x + w, baseY);
	ctx.closePath();
	ctx.fill();
	if (snow) {
		ctx.fillStyle = snow;
		ctx.beginPath();
		ctx.moveTo(x + w * 0.38, baseY - h);
		ctx.lineTo(x + w * 0.47, baseY - h * 0.86);
		ctx.lineTo(x + w * 0.58, baseY - h * 0.94);
		ctx.lineTo(x + w * 0.64, baseY - h * 0.74);
		ctx.lineTo(x + w * 0.52, baseY - h * 0.7);
		ctx.lineTo(x + w * 0.44, baseY - h * 0.76);
		ctx.lineTo(x + w * 0.33, baseY - h * 0.72);
		ctx.closePath();
		ctx.fill();
	}
}

function tree(ctx, x, baseY, h, trunk, leaf, leafLight) {
	ctx.fillStyle = trunk;
	ctx.fillRect(Math.round(x - 1), baseY - h * 0.45, 3, h * 0.45);
	ctx.fillStyle = leaf;
	ctx.beginPath();
	ctx.arc(x + 0.5, baseY - h * 0.62, h * 0.32, 0, Math.PI * 2);
	ctx.arc(x - h * 0.2, baseY - h * 0.5, h * 0.24, 0, Math.PI * 2);
	ctx.arc(x + h * 0.22, baseY - h * 0.5, h * 0.24, 0, Math.PI * 2);
	ctx.fill();
	if (leafLight) {
		ctx.fillStyle = leafLight;
		ctx.beginPath();
		ctx.arc(x - h * 0.05, baseY - h * 0.72, h * 0.14, 0, Math.PI * 2);
		ctx.fill();
	}
}

function pine(ctx, x, baseY, h, color) {
	ctx.fillStyle = color;
	ctx.fillRect(Math.round(x - 1), baseY - h * 0.2, 2, h * 0.2);
	for (let i = 0; i < 3; i++) {
		const w = h * (0.5 - i * 0.12);
		const y = baseY - h * (0.2 + i * 0.26);
		ctx.beginPath();
		ctx.moveTo(x - w / 2, y);
		ctx.lineTo(x, y - h * 0.34);
		ctx.lineTo(x + w / 2, y);
		ctx.closePath();
		ctx.fill();
	}
}

function cloud(ctx, x, y, s, color) {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(x, y, 7 * s, 0, Math.PI * 2);
	ctx.arc(x + 9 * s, y - 4 * s, 8 * s, 0, Math.PI * 2);
	ctx.arc(x + 19 * s, y - 1 * s, 7 * s, 0, Math.PI * 2);
	ctx.arc(x + 27 * s, y + 2 * s, 5 * s, 0, Math.PI * 2);
	ctx.rect(x - 2 * s, y, 32 * s, 5 * s);
	ctx.fill();
}

export class Renderer {
	constructor(canvas, opts = {}) {
		this.canvas = canvas;
		canvas.width = VIEW_W;
		canvas.height = VIEW_H;
		this.ctx = canvas.getContext("2d", { alpha: Boolean(opts.alpha) });
		this.is3d = false;
		this.ctx.imageSmoothingEnabled = false;
		this.reducedMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
		this.tick = 0;
		this.flash = 0;
		this.light = document.createElement("canvas");
		this.light.width = VIEW_W;
		this.light.height = VIEW_H;
		this.lctx = this.light.getContext("2d");
		this.resetFx();
	}

	resetFx() {
		this.fx = {
			prevGround: true,
			prevVy: 0,
			prevFrame: -1,
			prevRoom: null,
			squash: 0,
			stretch: 0,
			vfx: [],
			amb: [],
		};
	}

	// Draw the current world (play, pause, complete screens share this).
	drawWorld(game) {
		const ctx = this.ctx;
		const world = game.world;
		this.tick++;
		if (!world) {
			this.drawScene("overworld", this.tick * 0.4, 12 * TILE);
			return;
		}
		const s = world.s;
		const room = world.room;
		const theme = room.theme || game.level.theme;
		const th = THEMES[theme] || THEMES.overworld;
		const shakeOn = game.state.settings.shake && !this.reducedMotion;
		let camX = Math.round(s.camera.x);
		let camY = Math.round(s.camera.y);
		if (s.shake > 0 && shakeOn) {
			camX += (this.tick % 2 ? 1 : -1) * Math.min(3, s.shake);
			camY += (this.tick % 3 ? 1 : -1) * Math.min(2, s.shake >> 1);
		}
		if (this.fx.prevRoom !== s.roomName || s.frame < this.fx.prevFrame) {
			this.fx.vfx = [];
			this.fx.amb = [];
			this.fx.prevRoom = s.roomName;
		}
		const advancing = s.frame !== this.fx.prevFrame;
		this.drawSky(theme, camY);
		this.drawBackground(theme, th, camX, camY, room);
		ctx.save();
		ctx.translate(-camX, -camY);
		this.drawTiles(world, theme, camX, camY);
		this.drawLavaGlow(world, camX, camY);
		this.drawDecor(world, theme, camX);
		this.drawItems(world);
		this.drawEnemies(world);
		this.drawPlayer(world, advancing);
		if (advancing) {
			this.updateVfx(world, theme, th, camX, camY);
		}
		this.drawVfx(theme, th);
		this.drawParticles(world, th);
		ctx.restore();
		this.drawLighting(world, theme, th, camX, camY);
		this.drawVignette(th);
		if (this.flash > 0) {
			ctx.fillStyle = `rgba(255,255,255,${0.12 * this.flash})`;
			ctx.fillRect(0, 0, VIEW_W, VIEW_H);
			this.flash--;
		}
		this.fx.prevFrame = s.frame;
	}

	// Background-only scene for the title and previews.
	drawScene(theme, camX, roomPixelH) {
		const th = THEMES[theme] || THEMES.overworld;
		const room = { h: Math.round(roomPixelH / TILE), w: 1000 };
		this.drawSky(theme, 0);
		this.drawBackground(theme, th, Math.round(camX), 0, room);
	}

	drawSky(theme, camY = 0) {
		const ctx = this.ctx;
		const th = THEMES[theme] || THEMES.overworld;
		const key = `sky-${theme}`;
		const img = layerCanvas(key, 1, VIEW_H + 64, (c, w, h) => {
			const g = c.createLinearGradient(0, 0, 0, h);
			g.addColorStop(0, th.sky[0]);
			g.addColorStop(0.55, th.sky[1]);
			g.addColorStop(1, th.sky[2]);
			c.fillStyle = g;
			c.fillRect(0, 0, w, h);
		});
		ctx.drawImage(img, 0, -Math.min(64, camY * 0.3), VIEW_W, VIEW_H + 64);
	}

	drawBackground(theme, th, camX, camY, room) {
		const ctx = this.ctx;
		const groundY = room.h * TILE - 32 - camY;
		const t = this.tick;
		if (theme === "overworld" || theme === "dusk") {
			if (th.stars) {
				for (let i = 0; i < 48; i++) {
					const sx = (i * 97 + 13 - Math.floor(camX * 0.04)) % (VIEW_W + 20) - 10;
					const sy = (i * 53) % 96;
					const tw = (Math.sin(t * 0.08 + i * 1.7) + 1) * 0.5;
					ctx.fillStyle = `rgba(255,233,192,${0.35 + tw * 0.6})`;
					ctx.fillRect(sx < 0 ? sx + VIEW_W + 20 : sx, sy, 1, 1);
					if (i % 9 === 0) {
						ctx.fillRect(sx - 1, sy, 3, 1);
						ctx.fillRect(sx, sy - 1, 1, 3);
					}
				}
			}
			// sun
			if (th.sun) {
				const sunX = theme === "dusk" ? 232 - camX * 0.03 : 262 - camX * 0.02;
				const sunY = theme === "dusk" ? groundY - 44 : 30;
				const size = theme === "dusk" ? 120 : 96;
				ctx.globalAlpha = theme === "dusk" ? 0.6 : 0.5;
				ctx.drawImage(colorGlow(th.sun, 64), sunX - size / 2, sunY - size / 2, size, size);
				ctx.globalAlpha = 1;
				ctx.fillStyle = th.sun;
				ctx.beginPath();
				ctx.arc(sunX, sunY, theme === "dusk" ? 13 : 8, 0, Math.PI * 2);
				ctx.fill();
			}
			// far mountains
			const mountains = layerCanvas(`mtn-${theme}`, 480, 110, (c, w, h) => {
				peak(c, -40, h, 220, 92, th.mountains[0], theme === "overworld" ? "#cfe3f7" : null);
				peak(c, 130, h, 260, 108, th.mountains[1], theme === "overworld" ? "#dcebfa" : null);
				peak(c, 330, h, 200, 78, th.mountains[0], theme === "overworld" ? "#cfe3f7" : null);
				// haze at the base
				const g = c.createLinearGradient(0, h - 40, 0, h);
				g.addColorStop(0, "rgba(255,255,255,0)");
				g.addColorStop(1, theme === "overworld" ? "rgba(185,227,251,0.55)" : "rgba(242,154,94,0.35)");
				c.fillStyle = g;
				c.fillRect(0, h - 40, w, 40);
			});
			this.tile(mountains, camX * 0.12, groundY - 110 + 6);
			// clouds, drifting slowly on their own
			if (th.cloud) {
				const clouds = layerCanvas(`cloud-${theme}`, 360, 90, (c) => {
					cloud(c, 20, 30, 1, th.cloud);
					cloud(c, 150, 58, 0.7, th.cloud);
					cloud(c, 240, 22, 1.2, th.cloud);
					cloud(c, 320, 66, 0.55, th.cloud);
				});
				ctx.globalAlpha = theme === "dusk" ? 0.8 : 0.95;
				this.tile(clouds, camX * 0.25 + t * 0.12, 6 - camY * 0.2);
				ctx.globalAlpha = 1;
			}
			// rolling hills
			const hills = layerCanvas(`hills-${theme}`, 400, 72, (c, w, h) => {
				hill(c, -30, h, 190, 52, th.hills[0], th.hills[1]);
				hill(c, 120, h, 150, 38, th.hills[0], th.hills[1]);
				hill(c, 230, h, 210, 60, th.hills[0], th.hills[1]);
			});
			this.tile(hills, camX * 0.3, groundY - 72 + 2);
			// near treeline and bushes
			const near = layerCanvas(`near-${theme}`, 320, 64, (c, w, h) => {
				if (theme === "dusk") {
					for (let i = 0; i < 9; i++) {
						pine(c, 18 + i * 36 + hash(i) * 12, h, 36 + hash(i, 3) * 22, th.near);
					}
				} else {
					hill(c, 40, h, 120, 22, th.near);
					hill(c, 210, h, 150, 26, th.near);
					tree(c, 24, h, 44, "#4a2c12", "#1f6a34", "#2f8a44");
					tree(c, 150, h, 56, "#4a2c12", "#1f6a34", "#2f8a44");
					tree(c, 268, h, 40, "#4a2c12", "#1f6a34", "#2f8a44");
					c.fillStyle = "#246e38";
					for (let i = 0; i < 14; i++) {
						const x = (i * 23 + 7) % 320;
						c.fillRect(x, h - 4, 2, 4);
						c.fillRect(x + 1, h - 6, 1, 2);
					}
				}
			});
			this.tile(near, camX * 0.55, groundY - 64);
			// birds
			if (theme !== "underground") {
				ctx.fillStyle = theme === "dusk" ? "#1a1028" : "#2a3a5a";
				for (let i = 0; i < 2; i++) {
					const bx = ((t * 0.35 + i * 170) % (VIEW_W + 60)) - 30;
					const by = 24 + i * 18 + Math.sin(t * 0.05 + i) * 4;
					const flap = Math.floor(t / 8 + i) % 2;
					ctx.fillRect(Math.round(bx), Math.round(by) + flap, 2, 1);
					ctx.fillRect(Math.round(bx) + 2, Math.round(by) + (flap ? 0 : 1), 1, 1);
					ctx.fillRect(Math.round(bx) + 3, Math.round(by) + flap, 2, 1);
				}
			}
		} else if (theme === "underground") {
			const wall = layerCanvas("ug-wall", 384, VIEW_H, (c, w, h) => {
				c.fillStyle = th.mountains[0];
				c.fillRect(0, 0, w, h);
				c.fillStyle = th.mountains[1];
				for (let i = 0; i < 20; i++) {
					const x = hash(i, 1) * w;
					const y = hash(i, 2) * h;
					c.beginPath();
					c.ellipse(x, y, 14 + hash(i, 3) * 26, 10 + hash(i, 4) * 20, 0, 0, Math.PI * 2);
					c.fill();
				}
				// stalagmites from the floor, far away
				c.fillStyle = th.hills[0];
				for (let i = 0; i < 7; i++) {
					const x = i * 56 + hash(i, 9) * 20;
					const hh = 30 + hash(i, 8) * 50;
					c.beginPath();
					c.moveTo(x - 10, h);
					c.lineTo(x, h - hh);
					c.lineTo(x + 10, h);
					c.closePath();
					c.fill();
				}
			});
			this.tile(wall, camX * 0.15, -camY * 0.2);
			const columns = layerCanvas("ug-cols", 256, VIEW_H, (c, w, h) => {
				c.fillStyle = th.hills[1];
				c.fillRect(30, 0, 18, h);
				c.fillRect(140, 0, 10, h);
				c.fillRect(205, 0, 24, h);
				c.fillStyle = th.hills[0];
				c.fillRect(34, 0, 4, h);
				c.fillRect(214, 0, 6, h);
				// ceiling stalactites
				c.fillStyle = th.hills[1];
				for (let i = 0; i < 9; i++) {
					const x = i * 28 + hash(i, 5) * 14;
					const hh = 14 + hash(i, 6) * 30;
					c.beginPath();
					c.moveTo(x - 6, 0);
					c.lineTo(x, hh);
					c.lineTo(x + 6, 0);
					c.closePath();
					c.fill();
				}
			});
			this.tile(columns, camX * 0.4, 12 - camY * 0.4);
			// glowing crystals
			for (const cr of this.crystals(camX)) {
				const pulse = 0.55 + Math.sin(t * 0.05 + cr.seed * 7) * 0.2;
				ctx.globalAlpha = pulse;
				ctx.drawImage(colorGlow(th.crystal, 64), cr.x - 24, cr.y - 24 - camY * 0.4, 48, 48);
				ctx.globalAlpha = 1;
				ctx.fillStyle = th.crystal;
				ctx.beginPath();
				ctx.moveTo(cr.x, cr.y - 10 - camY * 0.4);
				ctx.lineTo(cr.x + 4, cr.y - camY * 0.4);
				ctx.lineTo(cr.x - 4, cr.y - camY * 0.4);
				ctx.closePath();
				ctx.fill();
				ctx.fillStyle = "#d8ffff";
				ctx.fillRect(cr.x - 1, cr.y - 7 - camY * 0.4, 1, 4);
			}
		} else if (theme === "castle") {
			const wall = layerCanvas("castle-wall", 320, VIEW_H, (c, w, h) => {
				c.fillStyle = th.mountains[0];
				c.fillRect(0, 0, w, h);
				// faint brickwork
				c.fillStyle = th.mountains[1];
				for (let y = 0; y < h; y += 12) {
					for (let x = (y / 12) % 2 ? 0 : 12; x < w; x += 24) {
						c.fillRect(x, y, 22, 10);
					}
				}
				// arched windows showing the night outside
				for (const wx of [ 50, 230 ]) {
					c.fillStyle = "#1d1830";
					c.beginPath();
					c.moveTo(wx, 100);
					c.lineTo(wx, 56);
					c.arc(wx + 14, 56, 14, Math.PI, 0);
					c.lineTo(wx + 28, 100);
					c.closePath();
					c.fill();
					const g = c.createLinearGradient(0, 42, 0, 100);
					g.addColorStop(0, "#3a2050");
					g.addColorStop(1, "#8a3a3a");
					c.fillStyle = g;
					c.beginPath();
					c.moveTo(wx + 3, 100);
					c.lineTo(wx + 3, 58);
					c.arc(wx + 14, 58, 11, Math.PI, 0);
					c.lineTo(wx + 25, 100);
					c.closePath();
					c.fill();
					c.fillStyle = "#1d1830";
					c.fillRect(wx + 13, 46, 2, 54);
					c.fillRect(wx + 3, 72, 22, 2);
				}
			});
			this.tile(wall, camX * 0.2, -camY * 0.2);
			const pillars = layerCanvas("castle-pillars", 192, VIEW_H, (c, w, h) => {
				for (const px of [ 24, 128 ]) {
					c.fillStyle = th.hills[1];
					c.fillRect(px, 0, 20, h);
					c.fillStyle = th.hills[0];
					c.fillRect(px + 2, 0, 4, h);
					c.fillStyle = "#3a2c44";
					c.fillRect(px - 3, 8, 26, 6);
					c.fillRect(px - 3, h - 46, 26, 6);
					// torch bracket
					c.fillStyle = "#4a3a2a";
					c.fillRect(px + 8, 74, 4, 12);
					c.fillRect(px + 6, 84, 8, 2);
				}
				// hanging banner
				c.fillStyle = "#8a2a2a";
				c.fillRect(76, 0, 20, 54);
				c.beginPath();
				c.moveTo(76, 54);
				c.lineTo(86, 64);
				c.lineTo(96, 54);
				c.closePath();
				c.fill();
				c.fillStyle = "#f2c14e";
				c.fillRect(84, 18, 4, 4);
				c.fillRect(82, 22, 8, 2);
				c.fillRect(84, 24, 4, 10);
				c.fillStyle = "#5a1a1a";
				c.fillRect(76, 0, 20, 3);
			});
			this.tile(pillars, camX * 0.45, -camY * 0.45);
			for (const tc of this.torches(camX)) {
				const fl = 0.75 + Math.sin(t * 0.31 + tc.seed * 9) * 0.12 + Math.sin(t * 0.77 + tc.seed) * 0.08;
				ctx.globalAlpha = 0.55 * fl;
				ctx.drawImage(colorGlow(th.torch, 64), tc.x - 40, tc.y - 40 - camY * 0.45, 80, 80);
				ctx.globalAlpha = 1;
				const fy = tc.y - camY * 0.45;
				ctx.fillStyle = "#ff6a24";
				ctx.fillRect(tc.x - 2, fy - 5, 4, 6);
				ctx.fillStyle = "#ffb347";
				ctx.fillRect(tc.x - 1, fy - 6 + ((t + tc.seed) % 3 === 0 ? 1 : 0), 2, 5);
				ctx.fillStyle = "#fff0b0";
				ctx.fillRect(tc.x, fy - 3, 1, 2);
			}
		}
	}

	// Positions of the underground crystals visible for this camera.
	crystals(camX) {
		const out = [];
		const period = 256;
		const start = Math.floor((camX * 0.4) / period) - 1;
		for (let i = start; i < start + 3; i++) {
			for (const [ ox, oy ] of [ [ 90, 150 ], [ 180, 164 ] ]) {
				out.push({ x: Math.round(i * period + ox - camX * 0.4), y: oy, seed: i * 2 + ox });
			}
		}
		return out.filter((c) => c.x > -40 && c.x < VIEW_W + 40);
	}

	// Torch positions on the castle pillars for this camera.
	torches(camX) {
		const out = [];
		const period = 192;
		const start = Math.floor((camX * 0.45) / period) - 1;
		for (let i = start; i < start + 3; i++) {
			for (const px of [ 24, 128 ]) {
				out.push({ x: Math.round(i * period + px + 10 - camX * 0.45), y: 74, seed: i * 3 + px });
			}
		}
		return out.filter((c) => c.x > -40 && c.x < VIEW_W + 40);
	}

	// Draw a horizontally repeating layer at a parallax offset.
	tile(img, offset, y) {
		const ctx = this.ctx;
		const w = img.width;
		let x = -(((offset % w) + w) % w);
		const yy = Math.round(y);
		for (; x < VIEW_W; x += w) {
			ctx.drawImage(img, Math.round(x), yy);
		}
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
				const top = (id === T.GROUND || id === T.CASTLE) && ty > 0 && !isSolid(tiles[(ty - 1) * room.w + tx]);
				const variant = Math.floor(hash(tx, ty) * 3);
				const img = tileImage(id, theme, id === T.LAVA ? lavaFrame : qFrame, top, variant);
				if (img) {
					ctx.drawImage(img, tx * TILE, ty * TILE + dy);
				}
				// soft shadow just under overhangs so floating blocks read as solid
				if ((id === T.BRICK || id === T.QUESTION || id === T.QUESTION_ITEM || id === T.QUESTION_LIFE || id === T.USED || id === T.HARD) &&
					ty + 1 < room.h && !isSolid(tiles[(ty + 1) * room.w + tx])) {
					ctx.fillStyle = "rgba(0,0,0,0.18)";
					ctx.fillRect(tx * TILE, (ty + 1) * TILE + dy, TILE, 2);
				}
			}
		}
		// Flag on the goal pole.
		for (let tx = tx1; tx <= tx2; tx++) {
			for (let ty = ty1; ty <= ty2; ty++) {
				if (tiles[ty * room.w + tx] === T.POLE_TOP) {
					const fy = s.goal ? s.goal.flagY : ty * TILE + 8;
					const wave = Math.floor(this.tick / 10) % 2;
					ctx.fillStyle = "#e8762c";
					ctx.beginPath();
					ctx.moveTo(tx * TILE + 7, fy);
					ctx.lineTo(tx * TILE - 8, fy + 5 + wave);
					ctx.lineTo(tx * TILE + 7, fy + 12);
					ctx.closePath();
					ctx.fill();
					ctx.fillStyle = "#fff3dc";
					ctx.fillRect(tx * TILE - 1, fy + 5 + wave, 3, 2);
					ctx.fillRect(tx * TILE, fy + 4 + wave, 1, 1);
				}
			}
		}
	}

	// Warm glow rising from lava surfaces.
	drawLavaGlow(world, camX, camY) {
		const ctx = this.ctx;
		const room = world.room;
		const tiles = world.tiles;
		const tx1 = Math.max(0, Math.floor(camX / TILE) - 2);
		const tx2 = Math.min(room.w - 1, Math.floor((camX + VIEW_W) / TILE) + 2);
		const ty1 = Math.max(0, Math.floor(camY / TILE));
		const ty2 = Math.min(room.h - 1, Math.floor((camY + VIEW_H) / TILE) + 1);
		const glow = colorGlow("#ff7a2a", 64);
		const pulse = 0.3 + Math.sin(this.tick * 0.07) * 0.06;
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		for (let ty = ty1; ty <= ty2; ty++) {
			for (let tx = tx1; tx <= tx2; tx++) {
				if (tiles[ty * room.w + tx] === T.LAVA && (ty === 0 || tiles[(ty - 1) * room.w + tx] !== T.LAVA)) {
					ctx.globalAlpha = pulse;
					ctx.drawImage(glow, tx * TILE - 16, ty * TILE - 24, 48, 48);
				}
			}
		}
		ctx.restore();
	}

	// Ember's home: a cottage past the goal pole on outdoor levels.
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
				if (fx < camX - 120 || fx > camX + VIEW_W + 20) {
					return;
				}
				this.drawCottage(fx, (room.h - 2) * TILE);
				return;
			}
		}
	}

	// A cosy stone cottage with lit windows and chimney smoke.
	drawCottage(fx, gy) {
		const ctx = this.ctx;
		// walls
		ctx.fillStyle = "#d9b58a";
		ctx.fillRect(fx, gy - 40, 64, 40);
		ctx.fillStyle = "#b8926a";
		for (let i = 0; i < 5; i++) {
			ctx.fillRect(fx + (i % 2) * 6, gy - 36 + i * 8, 64, 1);
		}
		ctx.fillStyle = "#7a5230";
		ctx.fillRect(fx, gy - 40, 1, 40);
		ctx.fillRect(fx + 63, gy - 40, 1, 40);
		// roof
		ctx.fillStyle = "#a8402c";
		ctx.beginPath();
		ctx.moveTo(fx - 6, gy - 40);
		ctx.lineTo(fx + 32, gy - 68);
		ctx.lineTo(fx + 70, gy - 40);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = "#c85a3a";
		for (let i = 0; i < 4; i++) {
			ctx.fillRect(fx + 8 + i * 6, gy - 46 - i * 5, 48 - i * 12, 1);
		}
		// chimney and smoke
		ctx.fillStyle = "#6e6e78";
		ctx.fillRect(fx + 48, gy - 66, 8, 18);
		ctx.fillStyle = "#8a8a94";
		ctx.fillRect(fx + 47, gy - 67, 10, 2);
		ctx.fillStyle = "rgba(240,240,240,0.5)";
		for (let i = 0; i < 3; i++) {
			const ph = (this.tick * 0.4 + i * 18) % 54;
			ctx.beginPath();
			ctx.arc(fx + 52 + Math.sin(ph * 0.15) * 3, gy - 70 - ph, 2 + ph * 0.08, 0, Math.PI * 2);
			ctx.fill();
		}
		// door
		ctx.fillStyle = "#5a3a1a";
		ctx.fillRect(fx + 26, gy - 24, 12, 24);
		ctx.fillStyle = "#7a5230";
		ctx.fillRect(fx + 27, gy - 23, 10, 22);
		ctx.fillStyle = "#f2c14e";
		ctx.fillRect(fx + 35, gy - 12, 1, 1);
		// lit windows
		for (const wx of [ fx + 8, fx + 46 ]) {
			ctx.globalAlpha = 0.45 + Math.sin(this.tick * 0.05) * 0.08;
			ctx.drawImage(colorGlow("#ffcf70", 64), wx - 14, gy - 46, 38, 38);
			ctx.globalAlpha = 1;
			ctx.fillStyle = "#5a3a1a";
			ctx.fillRect(wx - 1, gy - 32, 12, 12);
			ctx.fillStyle = "#ffd27a";
			ctx.fillRect(wx, gy - 31, 10, 10);
			ctx.fillStyle = "#5a3a1a";
			ctx.fillRect(wx + 4, gy - 31, 1, 10);
			ctx.fillRect(wx, gy - 27, 10, 1);
		}
	}

	// Ground shadow under an entity, scanning down for the nearest floor.
	drawShadow(world, e, extraW = 0) {
		const ctx = this.ctx;
		const room = world.room;
		const tiles = world.tiles;
		const cx = e.x + e.w / 2;
		const bottom = e.y + e.h;
		const tx = Math.floor(cx / TILE);
		if (tx < 0 || tx >= room.w) {
			return;
		}
		let ty = Math.floor(bottom / TILE);
		let floorY = -1;
		for (let i = 0; i < 7 && ty < room.h; i++, ty++) {
			const id = tiles[ty * room.w + tx];
			if (ty >= 0 && isSolid(id) && ty * TILE >= bottom - 2) {
				floorY = ty * TILE;
				break;
			}
		}
		if (floorY < 0) {
			for (const it of world.s.items) {
				if (it.type === "platform" && cx > it.x && cx < it.x + it.w && it.y >= bottom - 2 && it.y < bottom + 96) {
					floorY = it.y;
					break;
				}
			}
		}
		if (floorY < 0) {
			return;
		}
		const dist = floorY - bottom;
		const k = Math.max(0.25, 1 - dist / 110);
		const w = Math.round((e.w + 8 + extraW) * k);
		ctx.globalAlpha = k;
		ctx.drawImage(shadowTexture(), Math.round(cx - w / 2), floorY - 3, w, 6);
		ctx.globalAlpha = 1;
	}

	drawItems(world) {
		const ctx = this.ctx;
		for (const it of world.s.items) {
			switch (it.type) {
				case "platform": {
					const x = Math.round(it.x);
					const y = Math.round(it.y);
					ctx.fillStyle = "#8a5a2a";
					ctx.fillRect(x, y, it.w, it.h);
					ctx.fillStyle = "#c8864a";
					ctx.fillRect(x, y, it.w, 2);
					ctx.fillStyle = "#5c3a08";
					for (let i = 0; i < it.w; i += 8) {
						ctx.fillRect(x + i, y + 2, 1, it.h - 2);
					}
					ctx.fillStyle = "#4a2a0c";
					ctx.fillRect(x, y + it.h - 1, it.w, 1);
					// metal brackets
					ctx.fillStyle = "#9a9aa2";
					ctx.fillRect(x + 2, y - 1, 3, it.h + 2);
					ctx.fillRect(x + it.w - 5, y - 1, 3, it.h + 2);
					break;
				}
				case "berry":
				case "plum":
				case "heart": {
					if (it.emerge > 0) {
						ctx.save();
						ctx.beginPath();
						ctx.rect(it.x - 8, it.y - 32, 32, 32 + (TILE - it.emerge * (TILE / 20)) - 2);
						ctx.clip();
					} else {
						this.drawShadow(world, it);
					}
					const img = it.type === "berry" ? Sprites.berry() : it.type === "plum" ? Sprites.plum() : Sprites.heart();
					const bob = it.type === "plum" && it.emerge === 0 ? Math.round(Math.sin(this.tick * 0.1) * 1.5) : 0;
					ctx.globalAlpha = 0.35 + Math.sin(this.tick * 0.12) * 0.1;
					ctx.drawImage(colorGlow(it.type === "heart" ? "#7fe08a" : it.type === "plum" ? "#c08cff" : "#ffb070", 64), Math.round(it.x) - 12, Math.round(it.y) - 12 + bob, 36, 36);
					ctx.globalAlpha = 1;
					ctx.drawImage(img.r, Math.round(it.x) - 2, Math.round(it.y) - 2 + bob);
					if (it.emerge > 0) {
						ctx.restore();
					}
					break;
				}
				case "spark": {
					ctx.save();
					ctx.globalCompositeOperation = "lighter";
					ctx.globalAlpha = 0.6;
					ctx.drawImage(colorGlow("#ffd060", 64), Math.round(it.x) - 10, Math.round(it.y) - 10, 28, 28);
					ctx.restore();
					ctx.drawImage(Sprites.spark(Math.floor(it.t / 3)).r, Math.round(it.x), Math.round(it.y));
					break;
				}
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
			if (!flipped && e.type !== "chompvine") {
				this.drawShadow(world, e, e.type === "boss" ? 8 : 0);
			}
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
						if (e.state === "slide") {
							// motion blur streak behind a sliding shell
							ctx.globalAlpha = 0.25;
							ctx.drawImage(Sprites.shell().r, x - 2 - e.dir * 5, y);
							ctx.globalAlpha = 1;
						}
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

	drawPlayer(world, advancing) {
		const ctx = this.ctx;
		const s = world.s;
		const p = s.player;
		const fx = this.fx;
		// Landing and take-off detection for squash and stretch (visual only).
		if (advancing && s.status === "playing") {
			if (p.ground && !fx.prevGround && fx.prevVy > 1.5) {
				fx.squash = 8;
				const n = fx.prevVy > 4 ? 6 : 4;
				for (let i = 0; i < n; i++) {
					this.dust(p.x + p.w / 2 + (i - n / 2) * 3, p.y + p.h - 1, (i - (n - 1) / 2) * 0.5, -0.3 - hash(this.tick, i) * 0.4, 14);
				}
			} else if (!p.ground && fx.prevGround && p.vy < -2) {
				fx.stretch = 7;
				for (let i = 0; i < 3; i++) {
					this.dust(p.x + p.w / 2 + (i - 1) * 4, p.y + p.h - 1, (i - 1) * 0.4, 0.1, 10);
				}
			}
			if (p.skid && p.ground && this.tick % 3 === 0) {
				this.dust(p.x + (p.facing > 0 ? -2 : p.w + 2), p.y + p.h - 1, -p.facing * 0.6, -0.5, 12);
			} else if (p.ground && Math.abs(p.vx) > 2.2 && this.tick % 7 === 0) {
				this.dust(p.x + (p.vx > 0 ? -1 : p.w + 1), p.y + p.h - 1, -Math.sign(p.vx) * 0.4, -0.3, 10);
			}
			fx.prevGround = p.ground;
			fx.prevVy = p.vy;
		}
		if (fx.squash > 0 && advancing) {
			fx.squash--;
		}
		if (fx.stretch > 0 && advancing) {
			fx.stretch--;
		}
		if (p.invuln > 0 && !p.dying && Math.floor(p.invuln / 3) % 2 === 1 && s.status === "playing") {
			return;
		}
		let power = p.power;
		let pose = p.dying ? "dead" : p.pose;
		if (pose === "jump" && p.vy > 0.6 && s.status === "playing") {
			pose = "fall";
		}
		if (pose === "idle" && !p.dying && (this.tick % 180) < 7) {
			pose = "blink";
		}
		if (p.growT > 0) {
			const alt = Math.floor(p.growT / 4) % 2 === 0;
			power = alt ? p.growTo : p.power;
			pose = "idle";
		}
		const img = Sprites.hero(power, pose, p.anim);
		const sprite = p.facing >= 0 ? img.r : img.l;
		const h = sprite.height;
		const x = Math.round(p.x) - 2;
		const y = Math.round(p.y + p.h) - h;
		if (s.status === "warp" && s.warp) {
			ctx.save();
			ctx.beginPath();
			ctx.rect(x - 8, s.warp.clipY - 64, 32, 64);
			ctx.clip();
			ctx.drawImage(sprite, x, y);
			ctx.restore();
			return;
		}
		if (!p.dying && s.status !== "goal") {
			this.drawShadow(world, p);
		}
		let sx = 1;
		let sy = 1;
		if (fx.squash > 0) {
			const k = fx.squash / 8;
			sx = 1 + 0.22 * k;
			sy = 1 - 0.22 * k;
		} else if (fx.stretch > 0) {
			const k = fx.stretch / 7;
			sx = 1 - 0.12 * k;
			sy = 1 + 0.16 * k;
		}
		const scaled = sx !== 1 || sy !== 1;
		if (scaled) {
			ctx.save();
			ctx.translate(x + 8, y + h);
			ctx.scale(sx, sy);
			ctx.translate(-(x + 8), -(y + h));
		}
		// Dupatta trailing behind Ember, waving with speed.
		if (!p.dying) {
			this.drawScarf(p, x, y, h, power);
		}
		ctx.drawImage(sprite, x, y);
		if (scaled) {
			ctx.restore();
		}
	}

	drawScarf(p, x, y, h, power) {
		const ctx = this.ctx;
		const row = y + (h === 16 ? 9 : 11);
		const speed = Math.min(1, Math.abs(p.vx) / 2.6 + (p.ground ? 0 : 0.4));
		const dir = -p.facing;
		const baseX = p.facing > 0 ? x + 4 : x + 12;
		const main = power === 2 ? "#e2402a" : "#19b3a6";
		const light = power === 2 ? "#ff7a5a" : "#5fe0d0";
		for (let i = 0; i < 5; i++) {
			const wave = Math.sin(this.tick * (0.25 + speed * 0.2) - i * 0.9) * (0.6 + speed * 1.6);
			const px = baseX + dir * (i + 1) * 2;
			const py = row + Math.round(wave + i * (0.4 - speed * 0.3));
			ctx.fillStyle = i === 4 ? light : main;
			ctx.fillRect(px, py, 2, i < 3 ? 2 : 1);
		}
	}

	dust(x, y, vx, vy, life) {
		if (this.fx.vfx.length < 64) {
			this.fx.vfx.push({ kind: "dust", x, y, vx, vy, t: 0, life });
		}
	}

	// Visual-only particles: dust and per-theme ambience.
	updateVfx(world, theme, th, camX, camY) {
		const fx = this.fx;
		const t = this.tick;
		for (const v of fx.vfx) {
			v.t++;
			v.x += v.vx;
			v.y += v.vy;
			v.vx *= 0.9;
			v.vy *= 0.9;
		}
		fx.vfx = fx.vfx.filter((v) => v.t < v.life);

		const room = world.room;
		const tiles = world.tiles;
		const amb = fx.amb;
		const spawnEvery = theme === "castle" ? 6 : theme === "underground" ? 9 : 12;
		const cap = theme === "castle" ? 40 : 24;
		if (amb.length < cap && t % spawnEvery === 0) {
			const r1 = hash(t, 1);
			const r2 = hash(t, 2);
			if (theme === "overworld") {
				amb.push({ kind: "leaf", x: camX + r1 * (VIEW_W + 40) - 20, y: camY - 6, vx: 0.25 + r2 * 0.3, vy: 0.35 + r1 * 0.25, t: 0, life: 420, seed: r2 * 10 });
			} else if (theme === "dusk") {
				amb.push({ kind: "firefly", x: camX + r1 * VIEW_W, y: camY + 60 + r2 * 100, vx: (r2 - 0.5) * 0.3, vy: (r1 - 0.5) * 0.2, t: 0, life: 320, seed: r1 * 10 });
			} else if (theme === "underground") {
				if (r2 < 0.4) {
					amb.push({ kind: "drip", x: camX + r1 * VIEW_W, y: camY + 16, vx: 0, vy: 0.4, t: 0, life: 200, seed: 0 });
				} else {
					amb.push({ kind: "mote", x: camX + r1 * VIEW_W, y: camY + 30 + r2 * 140, vx: (r2 - 0.5) * 0.15, vy: -0.08, t: 0, life: 360, seed: r1 * 10 });
				}
			} else if (theme === "castle") {
				// embers from lava in view, else drifting ash
				const lavaX = [];
				const tx1 = Math.max(0, Math.floor(camX / TILE));
				const tx2 = Math.min(room.w - 1, Math.floor((camX + VIEW_W) / TILE) + 1);
				for (let ty = 0; ty < room.h; ty++) {
					for (let tx = tx1; tx <= tx2; tx++) {
						if (tiles[ty * room.w + tx] === T.LAVA && (ty === 0 || tiles[(ty - 1) * room.w + tx] !== T.LAVA)) {
							lavaX.push([ tx, ty ]);
						}
					}
				}
				if (lavaX.length && r2 < 0.75) {
					const [ tx, ty ] = lavaX[Math.floor(r1 * lavaX.length)];
					amb.push({ kind: "ember", x: tx * TILE + hash(t, 3) * TILE, y: ty * TILE, vx: (r2 - 0.4) * 0.4, vy: -0.5 - r1 * 0.5, t: 0, life: 70 + r2 * 50, seed: r1 * 10 });
				} else {
					amb.push({ kind: "ash", x: camX + r1 * VIEW_W, y: camY + r2 * VIEW_H, vx: -0.1 - r2 * 0.1, vy: -0.05, t: 0, life: 300, seed: r1 * 10 });
				}
			}
		}
		for (const a of amb) {
			a.t++;
			switch (a.kind) {
				case "leaf":
					a.x += a.vx + Math.sin(t * 0.05 + a.seed) * 0.4;
					a.y += a.vy;
					break;
				case "firefly":
					a.x += a.vx + Math.sin(t * 0.03 + a.seed) * 0.25;
					a.y += a.vy + Math.cos(t * 0.04 + a.seed) * 0.25;
					break;
				case "drip": {
					a.vy = Math.min(4, a.vy + 0.12);
					a.y += a.vy;
					const tx = Math.floor(a.x / TILE);
					const ty = Math.floor(a.y / TILE);
					if (ty >= 0 && ty < room.h && tx >= 0 && tx < room.w && isSolid(tiles[ty * room.w + tx])) {
						a.t = a.life;
						this.dust(a.x, ty * TILE - 1, 0, -0.2, 6);
					}
					break;
				}
				case "mote":
				case "ash":
					a.x += a.vx + Math.sin(t * 0.02 + a.seed) * 0.1;
					a.y += a.vy;
					break;
				case "ember":
					a.x += a.vx + Math.sin(t * 0.2 + a.seed) * 0.3;
					a.y += a.vy;
					break;
			}
			if (a.x < camX - 40 || a.x > camX + VIEW_W + 40 || a.y > camY + VIEW_H + 20 || a.y < camY - 40) {
				a.t = a.life;
			}
		}
		fx.amb = amb.filter((a) => a.t < a.life);
	}

	drawVfx(theme, th) {
		const ctx = this.ctx;
		const t = this.tick;
		for (const v of this.fx.vfx) {
			const k = 1 - v.t / v.life;
			const r = 1 + (1 - k) * 3;
			ctx.fillStyle = `rgba(255,245,230,${0.55 * k})`;
			ctx.fillRect(Math.round(v.x - r / 2), Math.round(v.y - r / 2), Math.round(r), Math.round(r));
		}
		for (const a of this.fx.amb) {
			const x = Math.round(a.x);
			const y = Math.round(a.y);
			const life = 1 - a.t / a.life;
			switch (a.kind) {
				case "leaf":
					ctx.fillStyle = Math.floor(a.seed) % 2 ? "#8fd36a" : "#f2c14e";
					ctx.fillRect(x, y, 2, Math.floor(t / 10 + a.seed) % 2 ? 1 : 2);
					break;
				case "firefly": {
					const pulse = 0.4 + Math.sin(t * 0.12 + a.seed * 3) * 0.4;
					ctx.globalAlpha = pulse * Math.min(1, life * 3);
					ctx.drawImage(colorGlow("#f2e07a", 64), x - 8, y - 8, 16, 16);
					ctx.fillStyle = "#fff6c8";
					ctx.fillRect(x, y, 1, 1);
					ctx.globalAlpha = 1;
					break;
				}
				case "drip":
					ctx.fillStyle = "#9ad6ff";
					ctx.fillRect(x, y, 1, 3);
					break;
				case "mote":
					ctx.fillStyle = `rgba(160,210,255,${0.5 * Math.min(1, life * 3)})`;
					ctx.fillRect(x, y, 1, 1);
					break;
				case "ash":
					ctx.fillStyle = `rgba(200,180,170,${0.35 * Math.min(1, life * 3)})`;
					ctx.fillRect(x, y, 1, 1);
					break;
				case "ember": {
					ctx.globalAlpha = Math.min(1, life * 2);
					ctx.fillStyle = life > 0.5 ? "#ffd060" : "#ff6a24";
					ctx.fillRect(x, y, Math.floor(t / 4 + a.seed) % 2 ? 1 : 2, 1);
					ctx.globalAlpha = 1;
					break;
				}
			}
		}
	}

	drawParticles(world, th) {
		const ctx = this.ctx;
		const s = world.s;
		for (const pt of s.particles) {
			const x = Math.round(pt.x);
			const y = Math.round(pt.y);
			if (pt.kind === "shard") {
				ctx.save();
				ctx.translate(x + 3, y + 3);
				ctx.rotate(pt.t * 0.25 * (pt.vx > 0 ? 1 : -1));
				ctx.fillStyle = th.ground[0];
				ctx.fillRect(-3, -3, 6, 6);
				ctx.fillStyle = th.ground[1];
				ctx.fillRect(-3, -3, 6, 2);
				ctx.fillStyle = th.ground[2];
				ctx.fillRect(-3, 1, 6, 2);
				ctx.restore();
			} else if (pt.kind === "puff") {
				const k = pt.t / pt.life;
				const r = 3 + k * 9;
				ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`;
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(x + 2, y + 2, r, 0, Math.PI * 2);
				ctx.stroke();
				ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - k)})`;
				ctx.fillRect(x - 1, y - 1, 6, 6);
			} else if (pt.kind === "sparkle") {
				const k = 1 - pt.t / pt.life;
				const len = Math.round(2 + k * 3);
				ctx.fillStyle = "#fff6c8";
				ctx.fillRect(x, y - len, 1, len * 2 + 1);
				ctx.fillRect(x - len, y, len * 2 + 1, 1);
				ctx.fillStyle = "#f2c14e";
				ctx.fillRect(x, y, 1, 1);
			}
		}
		for (const pop of s.popups) {
			const k = pop.t > 30 ? 1 - (pop.t - 30) / 15 : 1;
			ctx.globalAlpha = Math.max(0, k);
			drawText(ctx, pop.text, pop.x, pop.y, pop.text === "1UP" ? "#7fe08a" : "#fff6c8", 1);
			ctx.globalAlpha = 1;
		}
	}

	// Darkness with light sources cut out, for caves and the castle.
	drawLighting(world, theme, th, camX, camY) {
		if (!th.ambient) {
			return;
		}
		const l = this.lctx;
		const s = world.s;
		const p = s.player;
		l.globalCompositeOperation = "source-over";
		l.clearRect(0, 0, VIEW_W, VIEW_H);
		l.fillStyle = theme === "castle" ? `rgba(8,4,10,${th.ambient})` : `rgba(2,6,16,${th.ambient})`;
		l.fillRect(0, 0, VIEW_W, VIEW_H);
		l.globalCompositeOperation = "destination-out";
		const glow = glowTexture(64);
		const cut = (x, y, size, alpha = 1) => {
			l.globalAlpha = alpha;
			l.drawImage(glow, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
		};
		const flick = 1 + Math.sin(this.tick * 0.3) * 0.03;
		cut(p.x + p.w / 2 - camX, p.y + p.h / 2 - camY, 230 * flick, 1);
		if (theme === "underground") {
			for (const cr of this.crystals(camX)) {
				cut(cr.x, cr.y - 6 - camY * 0.4, 110, 0.8);
			}
		} else {
			for (const tc of this.torches(camX)) {
				cut(tc.x, tc.y - camY * 0.45, 150 * flick, 0.9);
			}
			const room = world.room;
			const tiles = world.tiles;
			const tx1 = Math.max(0, Math.floor(camX / TILE) - 1);
			const tx2 = Math.min(room.w - 1, Math.floor((camX + VIEW_W) / TILE) + 1);
			for (let ty = 0; ty < room.h; ty++) {
				for (let tx = tx1; tx <= tx2; tx += 2) {
					if (tiles[ty * room.w + tx] === T.LAVA && (ty === 0 || tiles[(ty - 1) * room.w + tx] !== T.LAVA)) {
						cut(tx * TILE + 16 - camX, ty * TILE - camY, 120, 0.9);
					}
				}
			}
		}
		for (const it of s.items) {
			if (it.type === "spark") {
				cut(it.x + 4 - camX, it.y + 4 - camY, 90, 0.9);
			} else if (it.type === "berry" || it.type === "plum" || it.type === "heart") {
				cut(it.x + 6 - camX, it.y + 6 - camY, 70, 0.7);
			}
		}
		l.globalAlpha = 1;
		this.ctx.drawImage(this.light, 0, 0);
		// warm tint around torches and lava
		if (theme === "castle") {
			const ctx = this.ctx;
			ctx.save();
			ctx.globalCompositeOperation = "lighter";
			for (const tc of this.torches(camX)) {
				ctx.globalAlpha = 0.18 + Math.sin(this.tick * 0.31 + tc.seed) * 0.04;
				ctx.drawImage(colorGlow("#ff9a40", 64), tc.x - 60, tc.y - 60 - camY * 0.45, 120, 120);
			}
			ctx.restore();
		}
	}

	drawVignette(th) {
		if (!th.vignette) {
			return;
		}
		this.ctx.drawImage(vignetteTexture(VIEW_W, VIEW_H, th.vignette), 0, 0);
	}
}
