// Procedural canvas textures for the 3D view. Everything is generated at load,
// so the game still ships without image files. THREE is the global UMD build.
const cache = new Map();

function canvas(w, h) {
	const c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	return c;
}

function hash(a, b = 0) {
	let h = (a * 374761393 + b * 668265263) | 0;
	h = (h ^ (h >>> 13)) * 1274126177;
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function speckle(ctx, w, h, n, colors, seed, size = 2) {
	for (let i = 0; i < n; i++) {
		ctx.fillStyle = colors[i % colors.length];
		ctx.globalAlpha = 0.25 + hash(seed, i) * 0.5;
		ctx.fillRect(Math.floor(hash(seed + 1, i) * w), Math.floor(hash(seed + 2, i) * h), size, size);
	}
	ctx.globalAlpha = 1;
}

// Soft bevel: light top/left edge, dark bottom/right edge.
function bevel(ctx, w, h, light, dark, size = 4) {
	ctx.fillStyle = light;
	ctx.globalAlpha = 0.45;
	ctx.fillRect(0, 0, w, size);
	ctx.fillRect(0, 0, size, h);
	ctx.fillStyle = dark;
	ctx.fillRect(0, h - size, w, size);
	ctx.fillRect(w - size, 0, size, h);
	ctx.globalAlpha = 1;
}

function tex(key, make) {
	if (!cache.has(key)) {
		const c = make();
		const t = new THREE.CanvasTexture(c);
		t.encoding = THREE.sRGBEncoding;
		t.anisotropy = 4;
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		cache.set(key, t);
	}
	return cache.get(key);
}

// A block atlas: three 64x64 squares stacked (top, side, bottom).
function atlas(key, drawTop, drawSide, drawBottom) {
	return tex(key, () => {
		const c = canvas(64, 192);
		const ctx = c.getContext("2d");
		ctx.save();
		drawTop(ctx, 64, 64);
		ctx.restore();
		ctx.save();
		ctx.translate(0, 64);
		drawSide(ctx, 64, 64);
		ctx.restore();
		ctx.save();
		ctx.translate(0, 128);
		(drawBottom || drawSide)(ctx, 64, 64);
		ctx.restore();
		return c;
	});
}

function fill(ctx, w, h, color) {
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, w, h);
}

function gradient(ctx, w, h, a, b) {
	const g = ctx.createLinearGradient(0, 0, 0, h);
	g.addColorStop(0, a);
	g.addColorStop(1, b);
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, w, h);
}

export const Textures = {
	grassBlock(th) {
		const [ base, light, dark ] = th.ground;
		const [ g0, g1, g2 ] = th.grass;
		return atlas(`grass-${g1}`, (ctx, w, h) => {
			gradient(ctx, w, h, g2, g1);
			speckle(ctx, w, h, 90, [ g0, g2, "#ffffff" ], 11, 3);
			bevel(ctx, w, h, "#ffffff", g0, 3);
		}, (ctx, w, h) => {
			gradient(ctx, w, h, base, dark);
			// grass lip hanging over the top edge of the side faces
			ctx.fillStyle = g1;
			ctx.fillRect(0, 0, w, 10);
			ctx.fillStyle = g0;
			for (let x = 0; x < w; x += 8) {
				ctx.fillRect(x + (hash(x, 3) > 0.5 ? 2 : 0), 10, 4, 3 + Math.floor(hash(x, 4) * 4));
			}
			speckle(ctx, w, h - 14, 70, [ light, dark ], 5, 3);
			bevel(ctx, w, h, light, dark, 3);
		}, (ctx, w, h) => {
			gradient(ctx, w, h, dark, dark);
			speckle(ctx, w, h, 50, [ base, light ], 6, 3);
		});
	},
	dirtBlock(th) {
		const [ base, light, dark ] = th.ground;
		return atlas(`dirt-${base}`, (ctx, w, h) => {
			gradient(ctx, w, h, light, base);
			speckle(ctx, w, h, 80, [ light, dark ], 7, 3);
			bevel(ctx, w, h, light, dark, 3);
		}, (ctx, w, h) => {
			gradient(ctx, w, h, base, dark);
			speckle(ctx, w, h, 80, [ light, dark ], 8, 3);
			// faint stone outlines
			ctx.strokeStyle = dark;
			ctx.globalAlpha = 0.35;
			ctx.lineWidth = 2;
			ctx.strokeRect(6, 6, 24, 20);
			ctx.strokeRect(34, 30, 24, 26);
			ctx.globalAlpha = 1;
			bevel(ctx, w, h, light, dark, 3);
		});
	},
	brick(th) {
		const [ base, light, dark ] = th.ground;
		const draw = (ctx, w, h) => {
			fill(ctx, w, h, dark);
			for (let r = 0; r < 4; r++) {
				const y = r * 16;
				const off = r % 2 ? 16 : 0;
				for (let x = -32; x < w; x += 32) {
					const bx = x + off;
					ctx.fillStyle = base;
					ctx.fillRect(bx + 2, y + 2, 28, 12);
					ctx.fillStyle = light;
					ctx.globalAlpha = 0.5;
					ctx.fillRect(bx + 2, y + 2, 28, 2);
					ctx.fillRect(bx + 2, y + 2, 2, 12);
					ctx.globalAlpha = 1;
				}
			}
			speckle(ctx, w, h, 40, [ light, dark ], 9, 2);
		};
		return atlas(`brick-${base}`, draw, draw);
	},
	hard(th) {
		const [ base, light, dark ] = th.ground;
		const draw = (ctx, w, h) => {
			fill(ctx, w, h, base);
			bevel(ctx, w, h, light, dark, 8);
			ctx.fillStyle = light;
			ctx.globalAlpha = 0.25;
			ctx.fillRect(16, 16, 32, 32);
			ctx.globalAlpha = 1;
			ctx.fillStyle = dark;
			ctx.globalAlpha = 0.3;
			ctx.fillRect(20, 20, 24, 24);
			ctx.globalAlpha = 1;
		};
		return atlas(`hard-${base}`, draw, draw);
	},
	question() {
		const draw = (ctx, w, h) => {
			gradient(ctx, w, h, "#ffd868", "#e8a830");
			bevel(ctx, w, h, "#fff4c0", "#a86a12", 6);
			ctx.fillStyle = "#7a4a08";
			for (const [ x, y ] of [ [ 8, 8 ], [ 50, 8 ], [ 8, 50 ], [ 50, 50 ] ]) {
				ctx.beginPath();
				ctx.arc(x + 3, y + 3, 3, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.font = "bold 40px system-ui, sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillStyle = "#fff4c0";
			ctx.fillText("?", 34, 36);
			ctx.fillStyle = "#5c3a08";
			ctx.fillText("?", 32, 33);
		};
		return atlas("question", draw, draw);
	},
	used() {
		const draw = (ctx, w, h) => {
			gradient(ctx, w, h, "#9c6a2a", "#7a4e18");
			bevel(ctx, w, h, "#b88a44", "#5c3a08", 6);
			ctx.fillStyle = "#5c3a08";
			for (const [ x, y ] of [ [ 8, 8 ], [ 50, 8 ], [ 8, 50 ], [ 50, 50 ] ]) {
				ctx.beginPath();
				ctx.arc(x + 3, y + 3, 3, 0, Math.PI * 2);
				ctx.fill();
			}
		};
		return atlas("used", draw, draw);
	},
	castle() {
		const draw = (ctx, w, h) => {
			fill(ctx, w, h, "#3a3a42");
			const block = (x, y, bw, bh, c) => {
				ctx.fillStyle = c;
				ctx.fillRect(x, y, bw, bh);
				ctx.fillStyle = "#a2a2aa";
				ctx.globalAlpha = 0.5;
				ctx.fillRect(x, y, bw, 2);
				ctx.fillRect(x, y, 2, bh);
				ctx.globalAlpha = 1;
			};
			block(2, 2, 28, 26, "#80808a");
			block(34, 2, 28, 26, "#78787f");
			block(2, 32, 12, 30, "#78787f");
			block(18, 32, 44, 30, "#80808a");
			speckle(ctx, w, h, 40, [ "#5a5a64", "#9a9aa2" ], 12, 2);
		};
		return atlas("castle", draw, draw);
	},
	wood() {
		const draw = (ctx, w, h) => {
			gradient(ctx, w, h, "#8a5a2a", "#6a4218");
			ctx.strokeStyle = "#5c3a08";
			ctx.lineWidth = 2;
			for (let i = 0; i < 6; i++) {
				ctx.beginPath();
				ctx.moveTo(0, 6 + i * 10 + hash(i) * 4);
				ctx.bezierCurveTo(20, 8 + i * 10, 44, 2 + i * 10, 64, 6 + i * 10 + hash(i, 2) * 4);
				ctx.stroke();
			}
			bevel(ctx, w, h, "#b8824a", "#3a2408", 3);
		};
		return atlas("wood", draw, draw);
	},
	gate() {
		const draw = (ctx, w, h) => {
			gradient(ctx, w, h, "#5a3a1a", "#3c2612");
			ctx.fillStyle = "#2a1a10";
			for (const x of [ 16, 32, 48 ]) {
				ctx.fillRect(x - 1, 0, 2, h);
			}
			ctx.fillStyle = "#2a2228";
			ctx.fillRect(0, 14, w, 8);
			ctx.fillRect(0, 42, w, 8);
			ctx.fillStyle = "#c8a040";
			for (const x of [ 8, 56 ]) {
				ctx.fillRect(x - 2, 16, 4, 4);
				ctx.fillRect(x - 2, 44, 4, 4);
			}
		};
		return atlas("gate", draw, draw);
	},
	lava() {
		return tex("lava", () => {
			const c = canvas(128, 128);
			const ctx = c.getContext("2d");
			gradient(ctx, 128, 128, "#ff8a2a", "#d8381e");
			for (let i = 0; i < 24; i++) {
				ctx.fillStyle = i % 3 ? "#ffd060" : "#9a1e14";
				ctx.globalAlpha = 0.6;
				ctx.beginPath();
				ctx.ellipse(hash(i, 1) * 128, hash(i, 2) * 128, 8 + hash(i, 3) * 16, 5 + hash(i, 4) * 10, 0, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
			return c;
		});
	},
	rock(theme) {
		return tex(`rock-${theme}`, () => {
			const c = canvas(256, 256);
			const ctx = c.getContext("2d");
			const dark = theme === "castle" ? "#1a1420" : "#0d172c";
			const mid = theme === "castle" ? "#241a2a" : "#13203a";
			const light = theme === "castle" ? "#302438" : "#1a2b4c";
			fill(ctx, 256, 256, dark);
			for (let i = 0; i < 60; i++) {
				ctx.fillStyle = i % 2 ? mid : light;
				ctx.globalAlpha = 0.6;
				ctx.beginPath();
				ctx.ellipse(hash(i, 1) * 256, hash(i, 2) * 256, 14 + hash(i, 3) * 40, 10 + hash(i, 4) * 30, hash(i, 5) * 3, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
			if (theme === "castle") {
				ctx.fillStyle = light;
				ctx.globalAlpha = 0.5;
				for (let y = 0; y < 256; y += 24) {
					for (let x = (y / 24) % 2 ? 0 : 24; x < 256; x += 48) {
						ctx.fillRect(x, y, 44, 20);
					}
				}
				ctx.globalAlpha = 1;
			}
			return c;
		});
	},
	// Round soft glow for sprites.
	glow() {
		return tex("glow", () => {
			const c = canvas(64, 64);
			const ctx = c.getContext("2d");
			const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
			g.addColorStop(0, "rgba(255,255,255,1)");
			g.addColorStop(0.3, "rgba(255,255,255,0.6)");
			g.addColorStop(1, "rgba(255,255,255,0)");
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, 64, 64);
			return c;
		});
	},
	// Fluffy cloud sprite.
	cloud() {
		return tex("cloud", () => {
			const c = canvas(128, 64);
			const ctx = c.getContext("2d");
			ctx.fillStyle = "#ffffff";
			for (const [ x, y, r ] of [ [ 30, 40, 18 ], [ 55, 30, 24 ], [ 85, 36, 20 ], [ 105, 44, 14 ], [ 60, 46, 20 ] ]) {
				ctx.beginPath();
				ctx.arc(x, y, r, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.globalCompositeOperation = "source-atop";
			const g = ctx.createLinearGradient(0, 10, 0, 64);
			g.addColorStop(0, "rgba(255,255,255,0)");
			g.addColorStop(1, "rgba(180,200,230,0.6)");
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, 128, 64);
			return c;
		});
	},
	// Default face for Ember, used when assets/hero-face.png is absent.
	face() {
		return tex("face", () => {
			const c = canvas(128, 128);
			const ctx = c.getContext("2d");
			// eyes
			for (const x of [ 44, 84 ]) {
				ctx.fillStyle = "#fff3dc";
				ctx.beginPath();
				ctx.ellipse(x, 56, 11, 13, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = "#2a1a1e";
				ctx.beginPath();
				ctx.ellipse(x + 2, 58, 6, 8, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = "#ffffff";
				ctx.beginPath();
				ctx.arc(x + 4, 53, 2.5, 0, Math.PI * 2);
				ctx.fill();
				// lashes / brow
				ctx.strokeStyle = "#2a1a1e";
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.arc(x, 40, 12, Math.PI * 1.15, Math.PI * 1.85);
				ctx.stroke();
			}
			// bindi
			ctx.fillStyle = "#d8203c";
			ctx.beginPath();
			ctx.arc(64, 30, 4, 0, Math.PI * 2);
			ctx.fill();
			// nose
			ctx.strokeStyle = "#9a6240";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(64, 62);
			ctx.lineTo(61, 76);
			ctx.lineTo(67, 77);
			ctx.stroke();
			// smile
			ctx.strokeStyle = "#b8203c";
			ctx.lineWidth = 3.5;
			ctx.beginPath();
			ctx.arc(64, 84, 14, Math.PI * 0.15, Math.PI * 0.85);
			ctx.stroke();
			// blush
			ctx.fillStyle = "rgba(230,120,110,0.35)";
			for (const x of [ 34, 94 ]) {
				ctx.beginPath();
				ctx.ellipse(x, 78, 9, 5, 0, 0, Math.PI * 2);
				ctx.fill();
			}
			return c;
		});
	},
	// A photo face: the image is drawn into a circle so any portrait works.
	photoFace(img) {
		const c = canvas(256, 256);
		const ctx = c.getContext("2d");
		ctx.beginPath();
		ctx.arc(128, 128, 126, 0, Math.PI * 2);
		ctx.clip();
		const s = Math.min(img.width, img.height);
		ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256);
		const t = new THREE.CanvasTexture(c);
		t.encoding = THREE.sRGBEncoding;
		return t;
	},
	flag() {
		return tex("flag", () => {
			const c = canvas(64, 48);
			const ctx = c.getContext("2d");
			fill(ctx, 64, 48, "#e8762c");
			ctx.fillStyle = "#fff3dc";
			ctx.beginPath();
			ctx.arc(24, 24, 9, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = "#19b3a6";
			ctx.fillRect(40, 0, 6, 48);
			return c;
		});
	},
	sky(th) {
		return tex(`sky-${th.sky[0]}`, () => {
			const c = canvas(4, 256);
			const ctx = c.getContext("2d");
			const g = ctx.createLinearGradient(0, 0, 0, 256);
			g.addColorStop(0, th.sky[0]);
			g.addColorStop(0.55, th.sky[1]);
			g.addColorStop(1, th.sky[2]);
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, 4, 256);
			return c;
		});
	},
};

// Remap a BoxGeometry's UVs so each face reads one third of a vertical atlas:
// top face -> first third, sides -> middle, bottom -> last third.
export function atlasBox(w, h, d) {
	const g = new THREE.BoxGeometry(w, h, d);
	const uv = g.attributes.uv;
	// Groups: 0 +x, 1 -x, 2 +y (top), 3 -y (bottom), 4 +z, 5 -z; 4 vertices each.
	for (let i = 0; i < uv.count; i++) {
		const face = Math.floor(i / 4);
		const v = uv.getY(i);
		let band = 1;
		if (face === 2) {
			band = 0;
		} else if (face === 3) {
			band = 2;
		}
		uv.setY(i, (2 - band + v) / 3);
	}
	uv.needsUpdate = true;
	return g;
}
