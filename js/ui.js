// Title, menus, HUD, pause, level card, level complete, game over, ending.
import { VIEW_W, VIEW_H, TITLE_MENU, PAUSE_MENU, SETTINGS_MENU, GAMEOVER_MENU } from "./game.js";
import { TILE } from "./level.js";
import { Sprites, tileImage, drawText, textWidth, logoImage, colorGlow, vignetteTexture } from "./sprites.js";
import { HERO } from "./hero.js";

const GOLD = "#f2c14e";
const CREAM = "#fff3dc";
const DIM = "#9aa3c7";
const WHITE = "#ffffff";

const TAGLINES = {
	"Meadow Mile": "SUNNY HILLS AND THE FIRST GRUMBLES",
	"Hollow Deep": "DARK TUNNELS AND FLITTERS IN THE GLOOM",
	"Windy Ridge": "TALL PILLARS OVER LONG DROPS AT DUSK",
	"Crag Keep": "LAVA, LIFTS AND BARON THORNBACK",
};

function pad(n, len) {
	return String(n).padStart(len, "0");
}

function fmtTime(frames) {
	const total = frames / 60;
	const m = Math.floor(total / 60);
	const s = Math.floor(total % 60);
	const tenths = Math.floor((total * 10) % 10);
	return `${m}:${pad(s, 2)}.${tenths}`;
}

export class UI {
	constructor(renderer) {
		this.r = renderer;
		this.ctx = renderer.ctx;
		this.tick = 0;
		this.touch = false;
		this.lastScreen = null;
		this.prevScreen = null;
		this.transT = 99;
	}

	// The 2D painter used for thumbnails (the 3D renderer wraps a 2D one).
	get painter() {
		return this.r.is3d ? this.r.r2d : this.r;
	}

	draw(game) {
		const st = game.state;
		this.tick++;
		if (this.r.is3d) {
			this.ctx.clearRect(0, 0, VIEW_W, VIEW_H);
		}
		if (st.screen !== this.lastScreen) {
			this.prevScreen = this.lastScreen;
			this.lastScreen = st.screen;
			this.transT = 0;
			if (st.screen === "card" || st.screen === "title" || st.screen === "gameover") {
				this.r.resetFx();
			}
		} else {
			this.transT++;
		}
		switch (st.screen) {
			case "title":
				this.drawTitle(game);
				break;
			case "levels":
				this.drawLevels(game);
				break;
			case "controls":
				this.drawControls(game);
				break;
			case "settings":
				this.drawSettings(game);
				break;
			case "card":
				this.drawCard(game);
				break;
			case "play":
				this.r.drawWorld(game);
				this.drawHud(game);
				this.drawIris(game);
				break;
			case "pause":
				this.r.drawWorld(game);
				this.drawHud(game);
				this.drawPause(game);
				break;
			case "complete":
				this.r.drawWorld(game);
				this.drawHud(game);
				this.drawComplete(game);
				break;
			case "gameover":
				this.drawGameOver(game);
				break;
			case "ending":
				this.drawEnding(game);
				break;
		}
		this.drawFade(st);
	}

	// --- shared drawing helpers ---------------------------------------------

	overlay(alpha, color = "0,0,0") {
		this.ctx.fillStyle = `rgba(${color},${alpha})`;
		this.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
	}

	center(str, y, color = WHITE, scale = 1, shadow = "#1c1c24") {
		return drawText(this.ctx, str, (VIEW_W - textWidth(str, scale)) / 2, y, color, scale, shadow);
	}

	right(str, x, y, color = WHITE, scale = 1) {
		return drawText(this.ctx, str, x - textWidth(str, scale), y, color, scale);
	}

	// A dark panel with a light border and clipped corners.
	panel(x, y, w, h, opts = {}) {
		const ctx = this.ctx;
		const border = opts.border || CREAM;
		ctx.fillStyle = opts.fill || "rgba(14,16,30,0.9)";
		ctx.fillRect(x + 1, y, w - 2, h);
		ctx.fillRect(x, y + 1, w, h - 2);
		ctx.fillStyle = border;
		ctx.fillRect(x + 2, y, w - 4, 1);
		ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
		ctx.fillRect(x, y + 2, 1, h - 4);
		ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
		ctx.fillRect(x + 1, y + 1, 1, 1);
		ctx.fillRect(x + w - 2, y + 1, 1, 1);
		ctx.fillRect(x + 1, y + h - 2, 1, 1);
		ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
		if (opts.title) {
			const tw = textWidth(opts.title);
			ctx.fillStyle = opts.fill || "rgba(14,16,30,0.9)";
			ctx.fillRect(x + (w - tw) / 2 - 4, y - 3, tw + 8, 7);
			drawText(ctx, opts.title, x + (w - tw) / 2, y - 3, GOLD);
		}
	}

	cursor(x, y, color = GOLD) {
		const ctx = this.ctx;
		const bob = Math.floor(this.tick / 15) % 2;
		ctx.fillStyle = "#1c1c24";
		ctx.fillRect(x + bob + 1, y + 1, 4, 7);
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.moveTo(x + bob, y);
		ctx.lineTo(x + bob + 4, y + 3.5);
		ctx.lineTo(x + bob, y + 7);
		ctx.closePath();
		ctx.fill();
	}

	// Vertical menu. Returns the y of each row for callers that add widgets.
	menu(items, x, y, step, cur, opts = {}) {
		const ys = [];
		for (let i = 0; i < items.length; i++) {
			const yy = y + i * step;
			ys.push(yy);
			const active = i === cur;
			if (active) {
				this.ctx.fillStyle = "rgba(242,193,78,0.12)";
				this.ctx.fillRect(x - 10, yy - 3, opts.width || 120, step - 1);
				this.cursor(x - 8, yy);
			}
			drawText(this.ctx, items[i], x, yy, active ? GOLD : opts.color || CREAM);
		}
		return ys;
	}

	slider(x, y, value, max = 10, active = false) {
		const ctx = this.ctx;
		drawText(ctx, "<", x - 8, y, active ? GOLD : DIM);
		for (let i = 0; i < max; i++) {
			ctx.fillStyle = i < value ? (active ? GOLD : "#d9ad46") : "#363b58";
			ctx.fillRect(x + i * 5, y + 1, 4, 5);
		}
		drawText(ctx, ">", x + max * 5 + 2, y, active ? GOLD : DIM);
		drawText(ctx, String(value).padStart(2, " "), x + max * 5 + 12, y, active ? GOLD : CREAM);
	}

	hint(str, y = VIEW_H - 14) {
		this.center(str, y, DIM);
	}

	// Round photo portrait (assets/hero-face.png) with a gold ring.
	portrait(x, y, size) {
		const ctx = this.ctx;
		const img = HERO.face;
		ctx.fillStyle = GOLD;
		ctx.beginPath();
		ctx.arc(x + size / 2, y + size / 2, size / 2 + 1, 0, Math.PI * 2);
		ctx.fill();
		ctx.save();
		ctx.beginPath();
		ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
		ctx.clip();
		const sq = Math.min(img.width, img.height);
		ctx.imageSmoothingEnabled = true;
		ctx.drawImage(img, (img.width - sq) / 2, (img.height - sq) / 2, sq, sq, x, y, size, size);
		ctx.restore();
		ctx.imageSmoothingEnabled = false;
	}

	// Ground strip used under title and ending scenes.
	groundStrip(theme, offset, y = VIEW_H - 32) {
		const ctx = this.ctx;
		const topImg = tileImage(1, theme, 0, true, 1);
		const midImg = tileImage(1, theme, 0, false, 0);
		const ox = -(((Math.floor(offset) % TILE) + TILE) % TILE);
		for (let x = ox; x < VIEW_W; x += TILE) {
			ctx.drawImage(topImg, x, y);
			ctx.drawImage(midImg, x, y + TILE);
		}
	}

	drawFade(st) {
		const ctx = this.ctx;
		const fadeScreens = [ "title", "levels", "controls", "settings", "card", "gameover", "ending" ];
		if (fadeScreens.includes(st.screen) && this.transT < 12 && !(st.screen === "title" && this.prevScreen === null)) {
			ctx.fillStyle = `rgba(0,0,0,${1 - this.transT / 12})`;
			ctx.fillRect(0, 0, VIEW_W, VIEW_H);
		}
		if (st.screen === "card" && st.screenT > 96) {
			ctx.fillStyle = `rgba(0,0,0,${Math.min(1, (st.screenT - 96) / 14)})`;
			ctx.fillRect(0, 0, VIEW_W, VIEW_H);
		}
	}

	// Iris wipe from the player when a level starts.
	drawIris(game) {
		if (this.prevScreen !== "card" || this.transT > 28) {
			return;
		}
		const ctx = this.ctx;
		const w = game.state.world;
		if (!w) {
			return;
		}
		const p = w.player;
		const cx = p.x + p.w / 2 - w.camera.x;
		const cy = p.y + p.h / 2 - w.camera.y;
		const k = this.transT / 28;
		const r = 8 + k * k * 420;
		ctx.save();
		ctx.beginPath();
		ctx.rect(0, 0, VIEW_W, VIEW_H);
		ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
		ctx.fillStyle = "#000";
		ctx.fill();
		ctx.restore();
	}

	// --- screens -----------------------------------------------------------

	drawTitle(game) {
		const ctx = this.ctx;
		const st = game.state;
		const scroll = this.tick * 0.9;
		this.r.showcasePose = "walk";
		this.r.drawScene("overworld", scroll, 12 * TILE);
		if (!this.r.is3d) {
			this.drawTitleActors(scroll);
		}
		this.drawTitleMenu(game);
	}

	drawTitleActors(scroll) {
		const ctx = this.ctx;
		this.groundStrip("overworld", scroll);
		// Ember running along the meadow with a trail of dust
		const frame = Math.floor(this.tick / 5) % 4;
		const fox = Sprites.hero(1, "walk", frame).r;
		const fy = VIEW_H - 32 - fox.height;
		ctx.globalAlpha = 0.5;
		ctx.drawImage(colorGlow("#ffd9a0", 64), 24, fy - 6, 44, 44);
		ctx.globalAlpha = 1;
		for (let i = 0; i < 3; i++) {
			const k = ((this.tick + i * 7) % 20) / 20;
			ctx.fillStyle = `rgba(255,245,230,${0.5 * (1 - k)})`;
			const r = 1 + k * 3;
			ctx.fillRect(Math.round(32 - k * 14 - i * 4), Math.round(VIEW_H - 33 - r / 2 - k * 3), Math.round(r), Math.round(r));
		}
		this.r.drawScarf({ vx: 2.6, facing: 1, ground: true }, 32, fy, fox.height, 1);
		ctx.drawImage(fox, 32, fy);
		// coins arcing ahead of her
		for (let i = 0; i < 3; i++) {
			const cy = VIEW_H - 64 - Math.sin(this.tick * 0.08 + i * 0.9) * 6 - i * 4;
			ctx.drawImage(Sprites.coin(Math.floor(this.tick / 6 + i)).r, 262 + i * 18, Math.round(cy));
		}
		// a Grumble trundling the other way
		ctx.drawImage(Sprites.grumble(Math.floor(this.tick / 8)).l, 230, VIEW_H - 32 - 14);
	}

	drawTitleMenu(game) {
		const ctx = this.ctx;
		const st = game.state;
		// Logo
		const logo = logoImage();
		const lx = Math.round((VIEW_W - logo.width) / 2);
		const ly = 14 + Math.round(Math.sin(this.tick * 0.04) * 1.5);
		ctx.globalAlpha = 0.5;
		ctx.drawImage(colorGlow("#ffb347", 64), lx - 20, ly - 36, logo.width + 40, logo.height + 72);
		ctx.globalAlpha = 1;
		ctx.drawImage(logo, lx, ly);
		this.center("A GIRL, A SCARF AND A VERY LONG WAY HOME", ly + logo.height + 2, CREAM);

		// Menu
		const pw = 132;
		const px = (VIEW_W - pw) / 2;
		const py = 84;
		this.panel(px, py, pw, 66);
		this.menu(TITLE_MENU, px + 24, py + 9, 13, st.menu, { width: pw - 20 });

		if (st.best > 0) {
			drawText(ctx, `BEST ${pad(st.best, 6)}`, 8, VIEW_H - 12, CREAM);
		}
		const hintText = this.touch ? "D-PAD MOVE   A SELECT" : "ARROWS MOVE   Z OR SPACE SELECT";
		this.right(hintText, VIEW_W - 8, VIEW_H - 12, CREAM);
	}

	drawLevels(game) {
		const ctx = this.ctx;
		const st = game.state;
		const level = game.levels[st.selected];
		this.r.showcasePose = "walk";
		this.r.drawScene(level.theme, this.tick * 0.5 + st.selected * 300, 12 * TILE);
		this.overlay(0.5);
		this.center("LEVEL SELECT", 10, GOLD);
		ctx.fillStyle = GOLD;
		ctx.fillRect(VIEW_W / 2 - 40, 19, 80, 1);

		const cw = 72;
		const ch = 100;
		const gap = 6;
		const x0 = (VIEW_W - (cw * 4 + gap * 3)) / 2;
		const y0 = 30;
		for (let i = 0; i < game.levels.length; i++) {
			const lv = game.levels[i];
			const locked = i > st.unlocked;
			const sel = i === st.selected;
			const x = Math.round(x0 + i * (cw + gap));
			const y = y0 - (sel ? 3 : 0);
			if (sel) {
				ctx.globalAlpha = 0.5;
				ctx.drawImage(colorGlow(GOLD, 64), x - 14, y - 10, cw + 28, ch + 20);
				ctx.globalAlpha = 1;
			}
			this.panel(x, y, cw, ch, { border: sel ? GOLD : locked ? "#4a4f6a" : "#8a90b0", fill: sel ? "rgba(22,24,44,0.96)" : "rgba(14,16,30,0.9)" });
			// preview
			ctx.save();
			ctx.beginPath();
			ctx.rect(x + 4, y + 4, cw - 8, 40);
			ctx.clip();
			ctx.translate(x + 4, y + 4);
			ctx.scale((cw - 8) / VIEW_W, 40 / VIEW_H);
			this.painter.drawScene(lv.theme, i * 400 + this.tick * (sel ? 0.6 : 0.15), 12 * TILE);
			this.groundStrip(lv.theme, i * 400 + this.tick * (sel ? 0.6 : 0.15), VIEW_H - 32);
			if (lv.theme === "underground" || lv.theme === "castle") {
				this.ctx.drawImage(vignetteTexture(VIEW_W, VIEW_H, 0.5), 0, 0);
			}
			ctx.restore();
			if (locked) {
				ctx.fillStyle = "rgba(0,0,0,0.6)";
				ctx.fillRect(x + 4, y + 4, cw - 8, 40);
				ctx.drawImage(Sprites.icon("lock").r, x + cw / 2 - 4, y + 20);
			} else {
				const fox = Sprites.hero(0, sel ? "walk" : "idle", Math.floor(this.tick / 6)).r;
				ctx.drawImage(fox, x + 8, y + 44 - 16 - 4);
			}
			drawText(ctx, `LEVEL ${i + 1}`, x + 6, y + 50, locked ? DIM : GOLD);
			const name = lv.name.toUpperCase();
			const words = name.split(" ");
			drawText(ctx, words[0], x + 6, y + 60, locked ? DIM : CREAM);
			if (words[1]) {
				drawText(ctx, words.slice(1).join(" "), x + 6, y + 69, locked ? DIM : CREAM);
			}
			const best = st.bests[i];
			if (locked) {
				drawText(ctx, "LOCKED", x + 6, y + 84, DIM);
			} else if (best) {
				drawText(ctx, pad(best.score, 6), x + 6, y + 80, WHITE);
				drawText(ctx, fmtTime(best.frames), x + 6, y + 89, DIM);
			} else {
				drawText(ctx, "NOT YET", x + 6, y + 80, DIM);
				drawText(ctx, "CLEARED", x + 6, y + 89, DIM);
			}
		}
		this.center(TAGLINES[level.name] || "", 142, CREAM);
		this.hint(this.touch ? "LEFT RIGHT CHOOSE   A PLAY   PAUSE BACK" : "< > CHOOSE   Z OR SPACE PLAY   ESC BACK", 170);
	}

	drawControls(game) {
		const ctx = this.ctx;
		this.r.showcasePose = "idle";
		this.r.drawScene("dusk", this.tick * 0.4, 12 * TILE);
		this.overlay(0.55);
		const pw = 288;
		const ph = 150;
		const px = (VIEW_W - pw) / 2;
		const py = 18;
		this.panel(px, py, pw, ph, { title: "CONTROLS" });
		const rows = this.touch
			? [
				[ "MOVE", "LEFT / RIGHT", "" ],
				[ "JUMP", "A BUTTON", "HOLD FOR HEIGHT" ],
				[ "RUN / SPARK", "B BUTTON", "" ],
				[ "CROUCH / PIPE", "DOWN", "" ],
				[ "PAUSE", "PAUSE BUTTON", "" ],
			]
			: [
				[ "MOVE", "ARROWS OR A / D", "STICK / D-PAD" ],
				[ "JUMP", "Z OR SPACE", "A" ],
				[ "RUN / SPARK", "X OR SHIFT", "X OR TRIGGER" ],
				[ "CROUCH / PIPE", "DOWN OR S", "D-PAD DOWN" ],
				[ "PAUSE", "P OR ESC", "START" ],
				[ "MUTE", "M", "" ],
			];
		const c1 = px + 12;
		const c2 = px + 104;
		const c3 = px + 200;
		drawText(ctx, "ACTION", c1, py + 12, DIM);
		drawText(ctx, this.touch ? "TOUCH" : "KEYBOARD", c2, py + 12, DIM);
		drawText(ctx, this.touch ? "" : "GAMEPAD", c3, py + 12, DIM);
		ctx.fillStyle = "#363b58";
		ctx.fillRect(px + 8, py + 21, pw - 16, 1);
		rows.forEach((r, i) => {
			const y = py + 27 + i * 12;
			drawText(ctx, r[0], c1, y, GOLD);
			drawText(ctx, r[1], c2, y, CREAM);
			drawText(ctx, r[2], c3, y, CREAM);
		});
		ctx.fillRect(px + 8, py + ph - 36, pw - 16, 1);
		this.center("HOLD JUMP TO GO HIGHER. RUN JUMPS GO FURTHER.", py + ph - 29, CREAM);
		this.center("STOMP ENEMIES. BUMP BLOCKS. GRAB THE POLE HIGH.", py + ph - 19, CREAM);
		this.hint(this.touch ? "A OR PAUSE  BACK" : "Z, SPACE OR ESC  BACK", 176);
	}

	drawSettings(game) {
		const ctx = this.ctx;
		const st = game.state;
		if (st.from === "pause" && game.world) {
			this.r.drawWorld(game);
			this.overlay(0.6);
		} else {
			this.r.showcasePose = "idle";
			this.r.drawScene("underground", this.tick * 0.3, 12 * TILE);
			this.overlay(0.35);
		}
		const pw = 200;
		const ph = 94;
		const px = (VIEW_W - pw) / 2;
		const py = 44;
		this.panel(px, py, pw, ph, { title: "SETTINGS" });
		const ys = this.menu(SETTINGS_MENU, px + 24, py + 14, 15, st.menu, { width: pw - 30 });
		const s = st.settings;
		this.slider(px + 108, ys[0], s.music, 10, st.menu === 0);
		this.slider(px + 108, ys[1], s.sfx, 10, st.menu === 1);
		drawText(ctx, s.shake ? "ON" : "OFF", px + 108, ys[2], st.menu === 2 ? GOLD : CREAM);
		if (this.r.reducedMotion) {
			drawText(ctx, "(REDUCED MOTION)", px + 128, ys[2], DIM);
		}
		const viewLabel = s.view === "3d" ? (this.r.is3d ? "3D" : "3D (NO WEBGL)") : "2D CLASSIC";
		drawText(ctx, viewLabel, px + 108, ys[3], st.menu === 3 ? GOLD : CREAM);
		this.hint(this.touch ? "D-PAD ADJUST   A BACK" : "ARROWS ADJUST   Z OR ESC BACK", 156);
	}

	drawCard(game) {
		const ctx = this.ctx;
		const s = game.session;
		const level = game.level;
		const st = game.state;
		this.r.showcasePose = "idle";
		this.r.drawScene(level.theme, st.screenT * 0.3 + s.levelIndex * 500, 12 * TILE);
		if (!this.r.is3d) {
			this.groundStrip(level.theme, st.screenT * 0.3 + s.levelIndex * 500);
		}
		this.overlay(0.62);
		this.ctx.drawImage(vignetteTexture(VIEW_W, VIEW_H, 0.5), 0, 0);
		this.drawHud(game);
		const pw = 212;
		const ph = 86;
		const px = (VIEW_W - pw) / 2;
		const py = 50;
		this.panel(px, py, pw, ph, { fill: "rgba(14,16,30,0.82)" });
		this.center(`LEVEL ${s.levelIndex + 1} OF ${game.levels.length}`, py + 10, DIM);
		this.center(level.name.toUpperCase(), py + 22, GOLD, 2);
		ctx.fillStyle = "#363b58";
		ctx.fillRect(px + 20, py + 42, pw - 40, 1);
		this.center(TAGLINES[level.name] || "", py + 48, CREAM);
		const fox = Sprites.hero(s.power, "idle", 0).r;
		const fx = VIEW_W / 2 - 24;
		const fy = py + 78 - fox.height;
		ctx.globalAlpha = 0.5;
		ctx.drawImage(colorGlow("#ffd9a0", 64), fx - 8, fy - 4 + fox.height - 32, 32, 32);
		ctx.globalAlpha = 1;
		if (HERO.face) {
			this.portrait(fx - 2, py + 50, 20);
		} else {
			ctx.drawImage(fox, fx, fy);
		}
		drawText(ctx, `x ${s.lives}`, VIEW_W / 2 + 2, py + 66, WHITE, 1);
		if (s.coins > 0 || s.score > 0) {
			drawText(ctx, `${pad(s.score, 6)}`, VIEW_W / 2 + 2, py + 56, DIM);
		}
		this.center(this.touch ? "TAP A TO START" : "PRESS Z OR SPACE TO START", 156, Math.floor(this.tick / 25) % 2 ? DIM : CREAM);
	}

	drawHud(game) {
		const ctx = this.ctx;
		const s = game.session;
		if (!s) {
			return;
		}
		const w = game.state.world;
		// translucent band so the HUD reads on every theme
		const g = ctx.createLinearGradient(0, 0, 0, 26);
		g.addColorStop(0, "rgba(0,0,0,0.42)");
		g.addColorStop(1, "rgba(0,0,0,0)");
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, VIEW_W, 26);

		// portrait + lives
		if (HERO.face) {
			this.portrait(5, 4, 12);
		} else {
			ctx.drawImage(Sprites.heroHead(s.power).r, 4, 5);
		}
		drawText(ctx, `x${s.lives}`, 21, 7, WHITE);
		// score
		drawText(ctx, pad(s.score, 6), 44, 7, WHITE);
		// coins
		ctx.drawImage(Sprites.coin(Math.floor(this.tick / 6)).r, 90, 3);
		drawText(ctx, `x${pad(s.coins, 2)}`, 106, 7, WHITE);
		// time
		const timer = w ? w.timer : game.level.time;
		const hurry = w && w.hurry && w.timer < 100;
		ctx.drawImage(Sprites.icon("clock").r, 140, 6);
		drawText(ctx, pad(timer, 3), 151, 7, hurry && this.tick % 20 < 10 ? "#ff6a3a" : WHITE);
		// level badge + name, right aligned
		const name = game.level.name.toUpperCase();
		const nw = textWidth(name);
		const nx = VIEW_W - 6 - nw;
		drawText(ctx, name, nx, 7, CREAM);
		ctx.fillStyle = GOLD;
		ctx.fillRect(nx - 13, 5, 10, 10);
		ctx.fillStyle = "#1c1c24";
		ctx.fillRect(nx - 12, 6, 8, 8);
		drawText(ctx, String(s.levelIndex + 1), nx - 10, 7, GOLD, 1, null);
		if (game.state.muted) {
			ctx.drawImage(Sprites.icon("mute").r, VIEW_W - 12, VIEW_H - 12);
		}
	}

	drawPause(game) {
		const ctx = this.ctx;
		const st = game.state;
		this.overlay(0.55);
		const pw = 176;
		const ph = 90;
		const px = (VIEW_W - pw) / 2;
		const py = 44;
		this.panel(px, py, pw, ph, { title: "PAUSED" });
		const ys = this.menu(PAUSE_MENU, px + 22, py + 14, 15, st.menu, { width: pw - 26 });
		this.slider(px + 84, ys[2], st.settings.music, 10, st.menu === 2);
		this.slider(px + 84, ys[3], st.settings.sfx, 10, st.menu === 3);
		this.hint(this.touch ? "D-PAD MOVE   A SELECT   PAUSE RESUME" : "ARROWS MOVE   Z SELECT   P RESUME", py + ph + 8);
	}

	drawComplete(game) {
		const ctx = this.ctx;
		const st = game.state;
		const w = st.world;
		const s = game.session;
		if (st.screenT < 24) {
			return;
		}
		const k = Math.min(1, (st.screenT - 24) / 12);
		this.overlay(0.45 * k);
		const pw = 190;
		const ph = 104;
		const px = (VIEW_W - pw) / 2;
		const py = Math.round(44 + (1 - k) * 20);
		ctx.globalAlpha = k;
		this.panel(px, py, pw, ph);
		this.center("LEVEL CLEAR!", py + 10, GOLD, 2);
		ctx.fillStyle = "#363b58";
		ctx.fillRect(px + 16, py + 30, pw - 32, 1);
		const rowY = (i) => py + 38 + i * 11;
		const label = (i, l, v, color = WHITE) => {
			drawText(ctx, l, px + 18, rowY(i), CREAM);
			this.right(v, px + pw - 18, rowY(i), color);
		};
		label(0, "TIME BONUS", `${pad(w.timer, 3)} x 50`, st.screenT > 70 && w.timer > 0 ? GOLD : WHITE);
		label(1, "COINS", pad(w.stats.coins, 2));
		label(2, "STOMPS", pad(w.stats.stomps, 2));
		ctx.fillStyle = "#363b58";
		ctx.fillRect(px + 16, rowY(3) - 2, pw - 32, 1);
		label(3, "SCORE", pad(s.score, 6), GOLD);
		const levelScore = s.score - s.levelStartScore;
		const best = st.bests[s.levelIndex];
		if (w.timer === 0 && (!best || levelScore > best.score) && Math.floor(this.tick / 12) % 2 === 0) {
			this.center("NEW BEST!", rowY(4) + 2, "#7fe08a");
		}
		ctx.globalAlpha = 1;
	}

	drawGameOver(game) {
		const ctx = this.ctx;
		const st = game.state;
		const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
		g.addColorStop(0, "#1a0a10");
		g.addColorStop(1, "#050306");
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, VIEW_W, VIEW_H);
		ctx.globalAlpha = 0.35;
		ctx.drawImage(colorGlow("#8a1a2a", 64), VIEW_W / 2 - 110, -40, 220, 220);
		ctx.globalAlpha = 1;
		const fox = Sprites.hero(0, "dead", 0).r;
		ctx.drawImage(fox, VIEW_W / 2 - 8, 42 + Math.round(Math.sin(this.tick * 0.05) * 2));
		this.center("GAME OVER", 66, "#ff6a3a", 2);
		if (game.session) {
			this.center(`SCORE ${pad(game.session.score, 6)}`, 92, CREAM);
		}
		if (st.best > 0) {
			this.center(`BEST  ${pad(st.best, 6)}`, 102, DIM);
		}
		if (st.screenT > 60) {
			const pw = 120;
			const px = (VIEW_W - pw) / 2;
			this.panel(px, 120, pw, 40);
			this.menu(GAMEOVER_MENU, px + 30, 129, 13, st.menu, { width: pw - 30 });
		}
		this.ctx.drawImage(vignetteTexture(VIEW_W, VIEW_H, 0.6), 0, 0);
	}

	drawEnding(game) {
		const ctx = this.ctx;
		const st = game.state;
		this.r.showcasePose = "idle";
		this.r.drawScene("dusk", 120 + this.tick * 0.1, 12 * TILE);
		if (!this.r.is3d) {
			this.groundStrip("dusk", 0);
			this.r.drawCottage(VIEW_W / 2 + 28, VIEW_H - 32);
			const fox = Sprites.hero(game.session.power, Math.floor(this.tick / 90) % 10 === 0 ? "blink" : "idle", 0).r;
			ctx.globalAlpha = 0.5;
			ctx.drawImage(colorGlow("#ffd9a0", 64), VIEW_W / 2 - 24, VIEW_H - 32 - fox.height - 10, 44, 44);
			ctx.globalAlpha = 1;
			ctx.drawImage(fox, VIEW_W / 2 - 2, VIEW_H - 32 - fox.height);
			this.r.drawScarf({ vx: 0, facing: 1, ground: true }, VIEW_W / 2 - 2, VIEW_H - 32 - fox.height, fox.height, game.session.power);
		}
		this.overlay(0.2);
		this.center("EMBER MADE IT HOME!", 34, GOLD, 2);
		this.center("BARON THORNBACK IS BEATEN", 62, CREAM);
		this.center("AND CRAG KEEP IS QUIET AGAIN.", 72, CREAM);
		this.center(`FINAL SCORE ${pad(game.session.score, 6)}`, 92, WHITE);
		if (st.screenT > 60 && Math.floor(this.tick / 30) % 2 === 0) {
			this.center("THANKS FOR PLAYING", 118, CREAM);
		}
		this.ctx.drawImage(vignetteTexture(VIEW_W, VIEW_H, 0.4), 0, 0);
	}
}

