// Title, HUD, pause, level card, level complete, game over, ending.
import { VIEW_W, VIEW_H } from "./game.js";
import { Sprites, drawText, textWidth } from "./sprites.js";

function center(ctx, str, y, color = "#ffffff", scale = 1) {
	drawText(ctx, str, (VIEW_W - textWidth(str, scale)) / 2, y, color, scale);
}

function pad(n, len) {
	return String(n).padStart(len, "0");
}

export class UI {
	constructor(renderer) {
		this.r = renderer;
		this.ctx = renderer.ctx;
		this.tick = 0;
		this.touch = false;
	}

	draw(game) {
		const st = game.state;
		this.tick++;
		switch (st.screen) {
			case "title":
				this.drawTitle(game);
				break;
			case "card":
				this.drawCard(game);
				break;
			case "play":
				this.r.drawWorld(game);
				this.drawHud(game);
				break;
			case "pause":
				this.r.drawWorld(game);
				this.drawHud(game);
				this.overlay(0.5);
				center(this.ctx, "PAUSED", 80, "#ffffff", 2);
				center(this.ctx, this.touch ? "TAP PAUSE TO RESUME" : "PRESS P TO RESUME", 104);
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
	}

	overlay(alpha) {
		this.ctx.fillStyle = `rgba(0,0,0,${alpha})`;
		this.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
	}

	drawTitle(game) {
		const ctx = this.ctx;
		const st = game.state;
		this.r.drawSky("overworld");
		const fakeRoom = { h: 12 };
		this.r.drawBackground("overworld", { hills: [ "#2a9048", "#4ec05a" ], cloud: "#ffffff" }, this.tick * 0.5, 0, fakeRoom);
		ctx.fillStyle = "#c8743c";
		ctx.fillRect(0, VIEW_H - 32, VIEW_W, 32);
		ctx.fillStyle = "#3cb84c";
		ctx.fillRect(0, VIEW_H - 32, VIEW_W, 3);

		// Logo
		ctx.fillStyle = "#1c1c24";
		ctx.fillRect(58, 22, 204, 44);
		ctx.fillStyle = "#e8762c";
		ctx.fillRect(60, 24, 200, 40);
		center(ctx, "EMBER HOP", 32, "#fff3dc", 4);
		drawText(ctx, "A FOX AND A VERY LONG WAY HOME", (VIEW_W - textWidth("A FOX AND A VERY LONG WAY HOME")) / 2, 70, "#fff3dc");

		// Hero bouncing on the ground
		const bounce = Math.abs(Math.sin(this.tick / 20)) * 12;
		const fox = Sprites.fox(1, bounce > 2 ? "jump" : "idle", 0).r;
		ctx.drawImage(fox, 24, VIEW_H - 32 - 32 - Math.round(bounce));
		ctx.drawImage(Sprites.grumble(Math.floor(this.tick / 8)).l, 272, VIEW_H - 32 - 14);
		ctx.drawImage(Sprites.coin(Math.floor(this.tick / 6)).r, 250, VIEW_H - 80);

		// Level select
		const lvl = game.levels[st.selected];
		const arrows = st.unlocked > 0;
		center(ctx, `${arrows ? "< " : ""}LEVEL ${st.selected + 1}  ${lvl.name.toUpperCase()}${arrows ? " >" : ""}`, 90, "#ffffff");
		if (Math.floor(this.tick / 30) % 2 === 0) {
			center(ctx, this.touch ? "TAP A TO START" : "PRESS Z OR SPACE TO START", 104, "#f2c14e");
		}
		if (!this.touch) {
			const lines = [
				"ARROWS / WASD  MOVE      Z / SPACE  JUMP",
				"X / SHIFT  RUN + SPARK   DOWN  ENTER PIPE",
				"P / ESC  PAUSE           M  MUTE",
			];
			lines.forEach((l, i) => center(ctx, l, 122 + i * 9, "#dfe8ff"));
		} else {
			center(ctx, "TOUCH: LEFT RIGHT DOWN / A JUMP / B RUN", 126, "#dfe8ff");
		}
		if (st.best > 0) {
			center(ctx, `BEST ${pad(st.best, 6)}`, VIEW_H - 22, "#fff3dc");
		}
	}

	drawCard(game) {
		const ctx = this.ctx;
		const s = game.session;
		const level = game.level;
		ctx.fillStyle = "#000000";
		ctx.fillRect(0, 0, VIEW_W, VIEW_H);
		this.drawHud(game);
		center(ctx, `LEVEL ${s.levelIndex + 1}`, 64, "#ffffff", 1);
		center(ctx, level.name.toUpperCase(), 76, "#f2c14e", 2);
		const fox = Sprites.fox(s.power, "idle", 0).r;
		ctx.drawImage(fox, VIEW_W / 2 - 24, 104 - (fox.height - 16));
		drawText(ctx, `x ${s.lives}`, VIEW_W / 2 + 2, 110, "#ffffff", 1);
	}

	drawHud(game) {
		const ctx = this.ctx;
		const s = game.session;
		if (!s) {
			return;
		}
		const w = game.state.world;
		drawText(ctx, "EMBER", 8, 4, "#fff3dc");
		drawText(ctx, pad(s.score, 6), 8, 12);
		ctx.drawImage(Sprites.coin(Math.floor(this.tick / 6)).r, 70, 2, 16, 16);
		drawText(ctx, `x${pad(s.coins, 2)}`, 84, 8);
		drawText(ctx, "LEVEL", 130, 4, "#fff3dc");
		drawText(ctx, `${s.levelIndex + 1}-${game.levels.length}`, 134, 12);
		drawText(ctx, "TIME", 190, 4, "#fff3dc");
		const timer = w ? w.timer : game.level.time;
		drawText(ctx, pad(timer, 3), 190, 12, w && w.hurry && w.timer < 100 && this.tick % 20 < 10 ? "#ff6a3a" : "#ffffff");
		drawText(ctx, "LIVES", 250, 4, "#fff3dc");
		drawText(ctx, `x${s.lives}`, 254, 12);
		if (game.state.muted) {
			drawText(ctx, "MUTE", 290, 12, "#f2c14e");
		}
	}

	drawComplete(game) {
		const ctx = this.ctx;
		const st = game.state;
		const w = st.world;
		if (st.screenT < 20) {
			return;
		}
		this.overlay(0.35);
		center(ctx, "LEVEL CLEAR!", 70, "#f2c14e", 2);
		center(ctx, `TIME BONUS  ${pad(w.timer, 3)} x 50`, 96);
		center(ctx, `SCORE ${pad(game.session.score, 6)}`, 108);
	}

	drawGameOver(game) {
		const ctx = this.ctx;
		ctx.fillStyle = "#000000";
		ctx.fillRect(0, 0, VIEW_W, VIEW_H);
		center(ctx, "GAME OVER", 70, "#ff6a3a", 2);
		center(ctx, `SCORE ${pad(game.session.score, 6)}`, 96);
		if (game.state.best > 0) {
			center(ctx, `BEST  ${pad(game.state.best, 6)}`, 106);
		}
		if (game.state.screenT > 60 && Math.floor(this.tick / 30) % 2 === 0) {
			center(ctx, this.touch ? "TAP A FOR THE TITLE" : "PRESS Z OR SPACE", 130, "#f2c14e");
		}
	}

	drawEnding(game) {
		const ctx = this.ctx;
		this.r.drawSky("dusk");
		ctx.fillStyle = "#9c5a40";
		ctx.fillRect(0, VIEW_H - 32, VIEW_W, 32);
		const fox = Sprites.fox(game.session.power, "idle", 0).r;
		ctx.drawImage(fox, VIEW_W / 2 - 8, VIEW_H - 32 - fox.height);
		center(ctx, "EMBER MADE IT HOME!", 50, "#f2c14e", 2);
		center(ctx, "BARON THORNBACK IS BEATEN", 76);
		center(ctx, "AND CRAG KEEP IS QUIET AGAIN.", 86);
		center(ctx, `FINAL SCORE ${pad(game.session.score, 6)}`, 104, "#fff3dc");
		if (game.state.screenT > 60 && Math.floor(this.tick / 30) % 2 === 0) {
			center(ctx, "THANKS FOR PLAYING", 130, "#ffffff");
		}
	}
}
