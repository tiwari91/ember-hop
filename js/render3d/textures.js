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

// Smooth value noise in [0, 1], tiling with period `p` so textures wrap.
function vnoise(x, y, p, seed) {
	const xi = Math.floor(x);
	const yi = Math.floor(y);
	const fx = x - xi;
	const fy = y - yi;
	const ux = fx * fx * (3 - 2 * fx);
	const uy = fy * fy * (3 - 2 * fy);
	const m = (v) => ((v % p) + p) % p;
	const a = hash(m(xi) + seed * 131, m(yi));
	const b = hash(m(xi + 1) + seed * 131, m(yi));
	const c = hash(m(xi) + seed * 131, m(yi + 1));
	const d = hash(m(xi + 1) + seed * 131, m(yi + 1));
	return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

// Fractal noise, tiling over a w x h texture at a base cell of `cell` pixels.
function fbm(x, y, w, cell, seed, octaves = 4) {
	let sum = 0;
	let amp = 0.5;
	let norm = 0;
	let period = Math.max(1, Math.round(w / cell));
	let scale = period / w;
	for (let o = 0; o < octaves; o++) {
		sum += amp * vnoise(x * scale, y * scale, period, seed + o * 17);
		norm += amp;
		amp *= 0.5;
		period *= 2;
		scale *= 2;
	}
	return sum / norm;
}

// Natural grain: multiply the painted texture by fractal noise so flat fills
// read as stone, soil and wood rather than plastic.
function grain(ctx, w, h, seed, amount = 0.16, cell = 32) {
	const img = ctx.getImageData(0, 0, w, h);
	const d = img.data;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const n = fbm(x, y % 128, w, cell, seed, 3);
			const fine = hash(x + seed * 7, y) - 0.5;
			const k = 1 + (n - 0.5) * 2 * amount + fine * amount * 0.35;
			const i = (y * w + x) * 4;
			d[i] = Math.min(255, d[i] * k);
			d[i + 1] = Math.min(255, d[i + 1] * k);
			d[i + 2] = Math.min(255, d[i + 2] * k);
		}
	}
	ctx.putImageData(img, 0, 0);
}

// A height map for bump mapping, taken from the painted texture's brightness:
// mortar, cracks and seams are darker, so they read as recessed.
function heightFrom(src, seed) {
	const w = src.width;
	const h = src.height;
	const c = canvas(w, h);
	const ctx = c.getContext("2d");
	const s = src.getContext("2d").getImageData(0, 0, w, h).data;
	const img = ctx.createImageData(w, h);
	const d = img.data;
	for (let i = 0; i < w * h; i++) {
		const l = (s[i * 4] * 0.3 + s[i * 4 + 1] * 0.55 + s[i * 4 + 2] * 0.15) / 255;
		const x = i % w;
		const y = Math.floor(i / w);
		const v = Math.max(0, Math.min(255, (Math.sqrt(l) * 0.8 + (hash(x + seed, y * 3) - 0.5) * 0.12 + 0.1) * 255));
		d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
		d[i * 4 + 3] = 255;
	}
	ctx.putImageData(img, 0, 0);
	return c;
}

// Radial alpha falloff written pixel by pixel. Canvas gradients are dithered
// by Core Graphics on Apple devices, and once WebGL un-premultiplies the
// near-transparent edge that dither turns into coloured speckles.
function radialAlpha(size, falloff) {
	const c = canvas(size, size);
	const ctx = c.getContext("2d");
	const img = ctx.createImageData(size, size);
	const d = img.data;
	const r = size / 2;
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const dist = Math.hypot(x + 0.5 - r, y + 0.5 - r) / r;
			const i = (y * size + x) * 4;
			d[i] = d[i + 1] = d[i + 2] = 255;
			d[i + 3] = Math.round(255 * Math.max(0, Math.min(1, falloff(Math.min(1, dist)))));
		}
	}
	ctx.putImageData(img, 0, 0);
	return c;
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

// A block atlas: three squares stacked (top, side, bottom). Painted in 64-unit
// coordinates at 2x, then grained; a matching bump map rides along on
// `texture.userData.bump`.
function atlas(key, drawTop, drawSide, drawBottom, rough = 0.16) {
	if (cache.has(key)) {
		return cache.get(key);
	}
	const S = 128;
	const c = canvas(S, S * 3);
	const ctx = c.getContext("2d");
	const parts = [ drawTop, drawSide, drawBottom || drawSide ];
	parts.forEach((draw, i) => {
		ctx.save();
		ctx.translate(0, i * S);
		ctx.beginPath();
		ctx.rect(0, 0, 64 * (S / 64), S);
		ctx.clip();
		ctx.scale(S / 64, S / 64);
		draw(ctx, 64, 64);
		ctx.restore();
	});
	if (rough > 0) {
		grain(ctx, S, S * 3, key.length * 13 + key.charCodeAt(0), rough, 40);
	}
	const t = tex(key, () => c);
	const b = new THREE.CanvasTexture(heightFrom(c, key.length));
	b.wrapS = b.wrapT = THREE.RepeatWrapping;
	b.anisotropy = 4;
	t.userData.bump = b;
	return t;
}

// Darken (k < 1) or lighten (k > 1) a #rrggbb colour.
function shade(hex, k) {
	const n = parseInt(hex.slice(1), 16);
	const ch = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
	return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
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
			// Lit from straight above by the sun, so paint it a shade deeper than the 2D palette.
			gradient(ctx, w, h, g0, shade(g0, 0.72));
			speckle(ctx, w, h, 160, [ shade(g0, 0.6), g1, shade(g1, 0.8) ], 11, 2);
			// blades: short darker and lighter strokes
			for (let i = 0; i < 70; i++) {
				const x = hash(i, 31) * w;
				const y = hash(i, 32) * h;
				ctx.strokeStyle = i % 3 ? shade(g0, 0.55) : g1;
				ctx.globalAlpha = 0.45;
				ctx.lineWidth = 0.8;
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(x + (hash(i, 33) - 0.5) * 3, y - 2 - hash(i, 34) * 3);
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
			bevel(ctx, w, h, g1, shade(g0, 0.5), 3);
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
		return tex("glow", () => radialAlpha(64, (d) => (d < 0.3 ? 1 - (d / 0.3) * 0.4 : 0.6 * Math.pow(1 - (d - 0.3) / 0.7, 1.6))));
	},
	// Soft, lumpy cumulus: a sum of round puffs written as alpha, lit from above
	// with a cooler, darker base.
	cloud() {
		return tex("cloud", () => {
			const W = 256;
			const H = 128;
			const c = canvas(W, H);
			const ctx = c.getContext("2d");
			const img = ctx.createImageData(W, H);
			const d = img.data;
			const puffs = [];
			for (let i = 0; i < 14; i++) {
				const t = i / 13;
				puffs.push([ 40 + t * 176 + (hash(i, 41) - 0.5) * 20, 74 - Math.sin(t * Math.PI) * 26 + (hash(i, 42) - 0.5) * 14, 20 + Math.sin(t * Math.PI) * 18 + hash(i, 43) * 10 ]);
			}
			for (let y = 0; y < H; y++) {
				for (let x = 0; x < W; x++) {
					let a = 0;
					for (const [ px, py, pr ] of puffs) {
						const q = ((x - px) * (x - px) + (y - py) * (y - py)) / (pr * pr);
						if (q < 1) {
							a += (1 - q) * (1 - q);
						}
					}
					// flat-ish bottom, wispy noise at the edges
					const base = Math.max(0, Math.min(1, (96 - y) / 12));
					const n = 0.75 + fbm(x, y, W, 24, 9, 3) * 0.5;
					a = Math.min(1, a * 1.6 * n) * base;
					const shade = 1 - Math.max(0, Math.min(1, (y - 40) / 60)) * 0.32;
					const i = (y * W + x) * 4;
					d[i] = Math.round(255 * shade * 0.97);
					d[i + 1] = Math.round(255 * shade * 0.985);
					d[i + 2] = Math.round(255 * Math.min(1, shade * 1.02 + 0.02));
					d[i + 3] = Math.round(255 * Math.max(0, Math.min(1, a)));
				}
			}
			ctx.putImageData(img, 0, 0);
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
