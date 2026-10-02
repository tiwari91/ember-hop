// 2.5D renderer: the deterministic side-scrolling simulation drawn as a lit,
// shadowed three.js scene. Menus and HUD stay on the 2D overlay canvas, which
// this class exposes through the same interface as the 2D Renderer.
import { T, TILE, isSolid } from "../level.js";
import { VIEW_W, VIEW_H } from "../game.js";
import { THEMES, drawText, vignetteTexture } from "../sprites.js";
import { Renderer } from "../render.js";
import { Textures, atlasBox } from "./textures.js";
import * as M from "./models.js";

const FOV = 38;
const CAM_DIST = (VIEW_H / 2) / Math.tan((FOV / 2) * Math.PI / 180);
const CAM_RISE = 26;

export function webglAvailable() {
	try {
		if (typeof window === "undefined" || !window.THREE) {
			return false;
		}
		const c = document.createElement("canvas");
		return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
	} catch (err) {
		return false;
	}
}

function hash(a, b = 0) {
	let h = (a * 374761393 + b * 668265263) | 0;
	h = (h ^ (h >>> 13)) * 1274126177;
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Backdrop meshes share two vertex-coloured materials.
let mountainMat = null;
let hillMat = null;
function MOUNTAIN_MAT() {
	mountainMat = mountainMat || new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
	return mountainMat;
}
function HILL_MAT() {
	hillMat = hillMat || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
	return hillMat;
}

// A mountain: a cone whose rings are pushed in and out by noise, so the
// silhouette breaks into ridges, coloured darker at the foot, with rock
// strata and (optionally) snow above a jagged line. Base at y = 0.
function mountainGeometry(r, h, seed, color, snow) {
	const g = new THREE.ConeGeometry(r, h, 18, 7, true);
	g.translate(0, h / 2, 0);
	const pos = g.attributes.position;
	const base = new THREE.Color(color).multiplyScalar(0.8);
	const dark = base.clone().multiplyScalar(0.5);
	const snowC = snow ? new THREE.Color(snow) : null;
	const c = new THREE.Color();
	const colors = [];
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const y = pos.getY(i);
		const z = pos.getZ(i);
		const t = y / h;
		const ang = Math.atan2(z, x);
		const ridge = 1 + (hash(Math.round(ang * 3) + seed * 17, Math.round(t * 7)) - 0.5) * 0.35 * (1 - t);
		if (t < 0.999) {
			pos.setX(i, x * ridge);
			pos.setZ(i, z * ridge);
			pos.setY(i, y + (hash(Math.round(ang * 5) + seed, Math.round(t * 9) + 3) - 0.5) * h * 0.05 * (1 - t));
		}
		const strata = 0.92 + hash(Math.round(t * 14) + seed * 5, 7) * 0.16;
		c.copy(dark).lerp(base, Math.min(1, t * 1.6)).multiplyScalar(strata);
		const line = 0.8 + (hash(Math.round(ang * 4) + seed * 3, 11) - 0.5) * 0.12;
		if (snowC && t > line) {
			c.copy(snowC).multiplyScalar(0.94 + hash(i, seed) * 0.06);
		}
		colors.push(c.r, c.g, c.b);
	}
	g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
	g.computeVertexNormals();
	return g;
}

// A hill: a unit sphere with mottled grass and a darker, shadowed base.
function hillGeometry(color, seed) {
	const g = new THREE.SphereGeometry(1, 24, 14);
	const pos = g.attributes.position;
	const base = new THREE.Color(color).multiplyScalar(0.78);
	const c = new THREE.Color();
	const colors = [];
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const y = pos.getY(i);
		const patch = hash(Math.round(x * 6) + seed * 7, Math.round(y * 6)) * 0.14 + 0.93;
		const ao = 0.62 + 0.38 * Math.min(1, Math.max(0, y + 0.15) * 1.6);
		c.copy(base).multiplyScalar(patch * ao);
		colors.push(c.r, c.g, c.b);
	}
	g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
	return g;
}

const THEME_LEVEL = { overworld: 0, underground: 1, dusk: 2, castle: 3 };

// hemi/env: sky fill (the env dome is image-based light, scaled by `env`);
// sun: key light that casts the shadows; rim: cool back light for silhouettes.
const LIGHTING = {
	overworld: { hemiSky: 0xbfe3ff, hemiGround: 0x4a7a30, hemi: 0.18, env: 0.55, sun: 0xfff1d6, sunI: 1.3, rim: 0x8ab8ff, rimI: 0.4, fog: 0xb9e3fb, fogNear: 700, fogFar: 1900, exposure: 0.92, dark: false },
	dusk: { hemiSky: 0x8a4e8a, hemiGround: 0x3a2a4a, hemi: 0.22, env: 0.5, sun: 0xffb070, sunI: 1.2, rim: 0x7a6aff, rimI: 0.5, fog: 0xd87a62, fogNear: 600, fogFar: 1700, exposure: 0.95, dark: false },
	underground: { hemiSky: 0x3a5a9a, hemiGround: 0x0a1020, hemi: 0.3, env: 0.35, sun: 0x7aa0e0, sunI: 0.4, rim: 0x6ff0ff, rimI: 0.35, fog: 0x070b16, fogNear: 180, fogFar: 760, exposure: 1.0, dark: true },
	castle: { hemiSky: 0x6a4a5a, hemiGround: 0x1a0a10, hemi: 0.3, env: 0.35, sun: 0xffb080, sunI: 0.45, rim: 0xff7a40, rimI: 0.45, fog: 0x14080c, fogNear: 200, fogFar: 820, exposure: 1.0, dark: true },
};

export class Renderer3D {
	constructor(overlayCanvas, glCanvas, levels) {
		this.r2d = new Renderer(overlayCanvas, { alpha: true });
		this.ctx = this.r2d.ctx;
		this.canvas = overlayCanvas;
		this.glCanvas = glCanvas;
		this.levels = levels;
		this.is3d = true;
		this.reducedMotion = this.r2d.reducedMotion;
		this.tick = 0;
		this.flash = 0;
		this.showcasePose = "walk";

		if (THREE.ColorManagement) {
			THREE.ColorManagement.legacyMode = false;
		}
		const gl = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: false, powerPreference: "high-performance" });
		gl.outputEncoding = THREE.sRGBEncoding;
		gl.toneMapping = THREE.ACESFilmicToneMapping;
		gl.toneMappingExposure = 1.05;
		gl.shadowMap.enabled = true;
		gl.shadowMap.type = THREE.PCFSoftShadowMap;
		this.gl = gl;

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(FOV, VIEW_W / VIEW_H, 4, 3200);
		this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
		this.sun = new THREE.DirectionalLight(0xffffff, 1.2);
		this.sun.castShadow = true;
		this.sun.shadow.mapSize.set(1024, 1024);
		this.sun.shadow.camera.near = 50;
		this.sun.shadow.camera.far = 900;
		this.sun.shadow.camera.left = -250;
		this.sun.shadow.camera.right = 250;
		this.sun.shadow.camera.top = 170;
		this.sun.shadow.camera.bottom = -170;
		this.sun.shadow.bias = -0.0015;
		this.sun.shadow.normalBias = 0.6;
		this.rim = new THREE.DirectionalLight(0xffffff, 0.5);
		this.heroLight = new THREE.PointLight(0xffd9a0, 0, 240, 2);
		this.spotLights = [ 0, 1, 2 ].map(() => new THREE.PointLight(0xffb347, 0, 200, 2));
		this.scene.add(this.hemi, this.sun, this.sun.target, this.rim, this.heroLight, ...this.spotLights);

		this.staticGroup = new THREE.Group();
		this.dynGroup = new THREE.Group();
		this.fxGroup = new THREE.Group();
		this.scene.add(this.staticGroup, this.dynGroup, this.fxGroup);

		this.built = { key: null, checksum: -1, theme: null };
		this.models = new Map();
		this.hero = null;
		this.faceTexture = null;
		this.look = 0;
		this.fx = { prevGround: true, prevVy: 0, prevFrame: -1, squash: 0, stretch: 0 };
		this.pool = this.makePools();
		this.amb = [];
		this.dust = [];
		this.showcase = null;
		this.lastSize = { w: 0, h: 0, dpr: 0 };
		this.contextLost = false;

		// iOS drops WebGL contexts under memory pressure or after the tab sits in
		// the background. three.js re-creates its GPU state on restore; we also
		// rebuild the room and re-apply the size so nothing is left stale.
		glCanvas.addEventListener("webglcontextlost", (e) => {
			e.preventDefault();
			this.contextLost = true;
		}, false);
		glCanvas.addEventListener("webglcontextrestored", () => {
			this.contextLost = false;
			this.envCache = {};
			this.pmrem = null;
			this.built = { key: null, checksum: -1, theme: null };
			this.gl.shadowMap.needsUpdate = true;
			const { w, h } = this.lastSize;
			this.lastSize = { w: 0, h: 0, dpr: 0 };
			if (w && h) {
				this.resize(w, h);
			}
		}, false);
	}

	// --- interface shared with the 2D renderer -----------------------------

	resetFx() {
		this.fx = { prevGround: true, prevVy: 0, prevFrame: -1, squash: 0, stretch: 0 };
		this.dust = [];
		this.amb = [];
	}

	drawScarf(...args) {
		return this.r2d.drawScarf(...args);
	}

	drawCottage(...args) {
		return this.r2d.drawCottage(...args);
	}

	setFace(img) {
		this.faceTexture = img ? Textures.photoFace(img) : null;
		if (this.hero) {
			this.hero.setFace(this.faceTexture || Textures.face());
		}
		if (this.showcase && this.showcase.hero) {
			this.showcase.hero.setFace(this.faceTexture || Textures.face());
		}
	}

	resize(cssW, cssH) {
		// Cap the backing store: crisp on phones and laptops, kind to weak GPUs.
		// At most 2x, at most 1920 px wide and about 2.1 M pixels in all, well
		// inside iOS's canvas and texture limits.
		const area = Math.max(1, cssW * cssH);
		const dpr = Math.min(2, window.devicePixelRatio || 1, 1920 / Math.max(1, cssW), Math.sqrt(2.1e6 / area));
		if (cssW === this.lastSize.w && cssH === this.lastSize.h && dpr === this.lastSize.dpr) {
			return;
		}
		this.lastSize = { w: cssW, h: cssH, dpr };
		this.gl.setPixelRatio(dpr);
		this.gl.setSize(cssW, cssH, false);
	}

	// --- pools for particles ------------------------------------------------

	makePools() {
		const glowTex = Textures.glow();
		const sprites = [];
		for (let i = 0; i < 96; i++) {
			const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
			s.visible = false;
			this.fxGroup.add(s);
			sprites.push(s);
		}
		const shards = [];
		const shardGeo = new THREE.BoxGeometry(5, 5, 5);
		for (let i = 0; i < 24; i++) {
			const m = new THREE.Mesh(shardGeo, M.mat(0xb8683a, { roughness: 0.9 }));
			m.visible = false;
			m.castShadow = true;
			this.fxGroup.add(m);
			shards.push(m);
		}
		const soft = [];
		for (let i = 0; i < 48; i++) {
			const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }));
			s.visible = false;
			this.fxGroup.add(s);
			soft.push(s);
		}
		return { sprites, shards, soft, si: 0, hi: 0, oi: 0 };
	}

	beginPools() {
		const p = this.pool;
		p.si = p.hi = p.oi = 0;
	}

	endPools() {
		const p = this.pool;
		for (let i = p.si; i < p.sprites.length; i++) {
			p.sprites[i].visible = false;
		}
		for (let i = p.hi; i < p.shards.length; i++) {
			p.shards[i].visible = false;
		}
		for (let i = p.oi; i < p.soft.length; i++) {
			p.soft[i].visible = false;
		}
	}

	glow(x, y, z, size, color, opacity = 0.8) {
		const p = this.pool;
		if (p.si >= p.sprites.length) {
			return;
		}
		const s = p.sprites[p.si++];
		s.visible = true;
		s.position.set(x, y, z);
		s.scale.set(size, size, 1);
		s.material.color.set(color);
		s.material.opacity = opacity;
	}

	softSprite(x, y, z, size, color, opacity = 0.5) {
		const p = this.pool;
		if (p.oi >= p.soft.length) {
			return;
		}
		const s = p.soft[p.oi++];
		s.visible = true;
		s.position.set(x, y, z);
		s.scale.set(size, size, 1);
		s.material.color.set(color);
		s.material.opacity = opacity;
	}

	shard(x, y, z, rot, material) {
		const p = this.pool;
		if (p.hi >= p.shards.length) {
			return;
		}
		const m = p.shards[p.hi++];
		m.visible = true;
		m.position.set(x, y, z);
		m.rotation.set(rot, rot * 0.7, rot * 0.3);
		m.material = material;
	}

	// --- static room geometry ------------------------------------------------

	checksum(tiles) {
		let c = 0;
		for (let i = 0; i < tiles.length; i++) {
			c = (c + tiles[i] * (i * 31 + 7)) >>> 0;
		}
		return c;
	}

	clearGroup(group) {
		while (group.children.length) {
			const c = group.children.pop();
			if (c.geometry && c.userData.ownGeometry) {
				c.geometry.dispose();
			}
		}
	}

	ensureRoom(level, roomName, room, tiles, theme) {
		const key = `${level.name}/${roomName}`;
		const sum = this.checksum(tiles);
		if (this.built.key === key && this.built.checksum === sum) {
			return;
		}
		const sameRoom = this.built.key === key;
		this.built = { key, checksum: sum, theme };
		if (!sameRoom) {
			this.clearGroup(this.staticGroup);
			this.backdrop = new THREE.Group();
			this.staticGroup.add(this.backdrop);
			this.buildBackdrop(theme, room, tiles);
			this.tileGroup = new THREE.Group();
			this.staticGroup.add(this.tileGroup);
			this.models.clear();
			this.clearGroup(this.dynGroup);
			this.hero = null;
			this.applyLighting(theme);
		} else {
			this.clearGroup(this.tileGroup);
		}
		this.buildTiles(theme, room, tiles);
	}

	// Image-based light: a tiny gradient sky/ground dome per theme, prefiltered
	// once, so every surface picks up soft sky fill from above, bounce from
	// below and believable highlights on metal and glossy blocks.
	envFor(theme, L) {
		this.envCache = this.envCache || {};
		if (this.envCache[theme]) {
			return this.envCache[theme];
		}
		const scene = new THREE.Scene();
		const geo = new THREE.SphereGeometry(100, 32, 16);
		const top = new THREE.Color(L.hemiSky);
		const horizon = new THREE.Color(L.fog);
		const ground = new THREE.Color(L.hemiGround);
		const sun = new THREE.Color(L.sun);
		const pos = geo.attributes.position;
		const colors = [];
		const c = new THREE.Color();
		const sunDir = new THREE.Vector3(0.45, 0.75, 0.5).normalize();
		const v = new THREE.Vector3();
		for (let i = 0; i < pos.count; i++) {
			v.fromBufferAttribute(pos, i).normalize();
			if (v.y >= 0) {
				c.copy(horizon).lerp(top, Math.pow(v.y, 0.6));
			} else {
				c.copy(horizon).lerp(ground, Math.min(1, -v.y * 3));
			}
			const glint = Math.pow(Math.max(0, v.dot(sunDir)), 24) * (L.dark ? 0.6 : 2.5);
			c.r += sun.r * glint;
			c.g += sun.g * glint;
			c.b += sun.b * glint;
			colors.push(c.r * L.env, c.g * L.env, c.b * L.env);
		}
		geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
		scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
		this.pmrem = this.pmrem || new THREE.PMREMGenerator(this.gl);
		const rt = this.pmrem.fromScene(scene, 0.02);
		geo.dispose();
		this.envCache[theme] = rt.texture;
		return rt.texture;
	}

	applyLighting(theme) {
		const L = LIGHTING[theme] || LIGHTING.overworld;
		const th = THEMES[theme] || THEMES.overworld;
		try {
			this.scene.environment = this.envFor(theme, L);
		} catch (err) {
			this.scene.environment = null;
		}
		this.hemi.color.set(L.hemiSky);
		this.hemi.groundColor.set(L.hemiGround);
		this.hemi.intensity = L.hemi;
		this.sun.color.set(L.sun);
		this.sun.intensity = L.sunI;
		this.rim.color.set(L.rim);
		this.rim.intensity = L.rimI;
		this.scene.fog = new THREE.Fog(L.fog, L.fogNear, L.fogFar);
		this.gl.toneMappingExposure = L.exposure;
		this.heroLight.intensity = L.dark ? 1.4 : 0;
		this.heroLight.color.set(theme === "underground" ? 0xbfe8ff : 0xffd9a0);
		for (const l of this.spotLights) {
			l.intensity = 0;
			l.color.set(theme === "underground" ? 0x6ff0ff : 0xffb347);
		}
		if (L.dark) {
			this.scene.background = new THREE.Color(th.sky[0]);
		} else {
			this.scene.background = Textures.sky(th);
		}
		this.lighting = L;
	}

	groundTopAt(room, tiles, tx) {
		tx = Math.max(0, Math.min(room.w - 1, tx));
		for (let ty = 2; ty < room.h; ty++) {
			if (isSolid(tiles[ty * room.w + tx])) {
				return -(ty * TILE);
			}
		}
		return -(room.h * TILE - 32);
	}

	buildBackdrop(theme, room, tiles) {
		const th = THEMES[theme] || THEMES.overworld;
		const g = this.backdrop;
		const W = room.w * TILE;
		const baseY = -(room.h * TILE - 32);
		const add = (obj) => {
			g.add(obj);
			return obj;
		};
		this.lights = { torches: [], crystals: [] };
		this.clouds = [];
		this.stars = null;
		this.sunSprite = null;
		if (theme === "overworld" || theme === "dusk") {
			const dusk = theme === "dusk";
			// sun
			const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: Textures.glow(), color: th.sun, transparent: true, opacity: dusk ? 0.95 : 0.85, depthWrite: false, fog: false }));
			sun.scale.set(dusk ? 900 : 340, dusk ? 900 : 340, 1);
			this.sunSprite = add(sun);
			// stars
			if (dusk) {
				const pts = [];
				for (let i = 0; i < 260; i++) {
					pts.push((hash(i, 1) - 0.5) * 2400, 80 + hash(i, 2) * 700, -1400 - hash(i, 3) * 400);
				}
				const geo = new THREE.BufferGeometry();
				geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
				this.stars = add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffe9c0, size: 5, sizeAttenuation: true, transparent: true, opacity: 0.9, fog: false })));
			}
			// mountains: displaced, faceted peaks with rock strata and snow by height
			for (let i = -2; i < W / 230 + 3; i++) {
				const x = i * 230 + hash(i, 4) * 120;
				const h = 240 + hash(i, 5) * 200;
				const r = 230 + hash(i, 6) * 120;
				const z = -620 - hash(i, 7) * 260;
				const peakMesh = new THREE.Mesh(mountainGeometry(r, h, i, i % 2 ? th.mountains[0] : th.mountains[1], dusk ? null : 0xeef4fb), MOUNTAIN_MAT());
				peakMesh.position.set(x, baseY - 10, z);
				peakMesh.rotation.y = hash(i, 8) * 1.2;
				peakMesh.userData.ownGeometry = true;
				add(peakMesh);
			}
			// hills, two rows, with mottled grass and darker bases
			for (const [ z, color, rMin, rVar, sy, step ] of [ [ -380, th.hills[0], 170, 90, 0.42, 300 ], [ -190, th.hills[1], 110, 60, 0.5, 210 ] ]) {
				for (let i = -2; i < W / step + 3; i++) {
					const r = rMin + hash(i, 9 + z) * rVar;
					const hillMesh = new THREE.Mesh(hillGeometry(color, i + z), HILL_MAT());
					hillMesh.scale.set(r, r * sy, r * 0.6);
					hillMesh.position.set(i * step + hash(i, 10 + z) * 100, baseY - 4, z);
					hillMesh.userData.ownGeometry = true;
					hillMesh.receiveShadow = true;
					add(hillMesh);
				}
			}
			// trees or pines
			for (let i = -1; i < W / 170 + 2; i++) {
				const x = i * 170 + hash(i, 11) * 90;
				const z = -120 - hash(i, 12) * 80;
				const h = 60 + hash(i, 13) * 44;
				const tree = dusk ? M.makePine(h, i % 2 ? "#241638" : "#2e1c44") : M.makeTree(h, "#4a2c12", i % 3 ? "#1f6a34" : "#257a3c", "#3a9a4e");
				tree.position.set(x, baseY, z);
				add(tree);
			}
			// bushes along the ground line
			for (let i = -1; i < W / 70 + 2; i++) {
				const bush = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), M.mat(dusk ? "#2a6e3e" : th.near, { roughness: 1 }));
				bush.scale.set(12 + hash(i, 14) * 10, 7 + hash(i, 15) * 5, 9);
				bush.position.set(i * 70 + hash(i, 16) * 40, baseY + 1, -22 - hash(i, 17) * 10);
				bush.castShadow = true;
				bush.receiveShadow = true;
				add(bush);
			}
			// clouds
			const cloudTex = Textures.cloud();
			for (let i = 0; i < 10; i++) {
				const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: th.cloud, transparent: true, opacity: dusk ? 0.75 : 0.95, depthWrite: false }));
				const s = 90 + hash(i, 18) * 120;
				c.scale.set(s, s / 2, 1);
				c.position.set(hash(i, 19) * 1400 - 200, baseY + 150 + hash(i, 20) * 130, -300 - hash(i, 21) * 300);
				c.userData.speed = 0.06 + hash(i, 22) * 0.08;
				this.clouds.push(add(c));
			}
			// grass tufts and flowers on top tiles
			this.buildGrass(room, tiles, th);
		} else if (theme === "underground") {
			const wall = new THREE.Mesh(new THREE.PlaneGeometry(W + 800, 520), new THREE.MeshStandardMaterial({ map: Textures.rock("underground"), roughness: 1 }));
			wall.material.map.repeat.set((W + 800) / 256, 2);
			wall.position.set(W / 2, baseY + 60, -52);
			wall.receiveShadow = true;
			add(wall);
			for (let i = -1; i < W / 150 + 2; i++) {
				const col = new THREE.Mesh(new THREE.CylinderGeometry(9 + hash(i, 1) * 5, 12 + hash(i, 2) * 6, 260, 10), M.mat("#13203a", { roughness: 1, flat: true }));
				col.position.set(i * 150 + hash(i, 3) * 80, baseY + 100, -38);
				col.castShadow = true;
				col.receiveShadow = true;
				add(col);
			}
			for (let i = -1; i < W / 34 + 2; i++) {
				const h = 10 + hash(i, 5) * 26;
				const st = new THREE.Mesh(new THREE.ConeGeometry(3 + hash(i, 6) * 3, h, 6), M.mat("#1a2b4c", { roughness: 1, flat: true }));
				st.position.set(i * 34 + hash(i, 7) * 20, -TILE - h / 2 + 2, -18 - hash(i, 8) * 16);
				st.rotation.x = Math.PI;
				st.castShadow = true;
				add(st);
			}
			for (let i = 0; i < W / 170 + 1; i++) {
				const tx = Math.floor((i * 170 + hash(i, 9) * 90) / TILE);
				const y = this.groundTopAt(room, tiles, tx);
				const cr = M.makeCrystal(th.crystal);
				cr.position.set(tx * TILE + 8, y, -22);
				cr.rotation.y = hash(i, 10) * 3;
				add(cr);
				this.lights.crystals.push({ x: tx * TILE + 8, y: y + 8, z: -18 });
			}
		} else if (theme === "castle") {
			const wall = new THREE.Mesh(new THREE.PlaneGeometry(W + 800, 520), new THREE.MeshStandardMaterial({ map: Textures.rock("castle"), roughness: 1 }));
			wall.material.map.repeat.set((W + 800) / 256, 2);
			wall.position.set(W / 2, baseY + 60, -46);
			wall.receiveShadow = true;
			add(wall);
			const winMat = new THREE.MeshStandardMaterial({ color: 0x6a3a5a, emissive: 0x5a2a3a, emissiveIntensity: 0.9, roughness: 1 });
			for (let i = -1; i < W / 128 + 2; i++) {
				const x = i * 128 + 40;
				const pillar = new THREE.Mesh(new THREE.CylinderGeometry(9, 10, 300, 12), M.mat("#302438", { roughness: 1 }));
				pillar.position.set(x, baseY + 120, -30);
				pillar.castShadow = true;
				pillar.receiveShadow = true;
				add(pillar);
				const capital = new THREE.Mesh(new THREE.BoxGeometry(26, 6, 26), M.mat("#3a2c44", { roughness: 1 }));
				capital.position.set(x, baseY + 150, -30);
				add(capital);
				const torch = M.makeTorch();
				torch.position.set(x, baseY + 78, -18);
				add(torch);
				this.lights.torches.push({ x, y: baseY + 86, z: -10, flame: torch.userData.flame });
				if (i % 2 === 0) {
					const win = new THREE.Mesh(new THREE.PlaneGeometry(26, 60), winMat);
					win.position.set(x + 64, baseY + 110, -44);
					add(win);
					const arch = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 1, 16, 1, false, 0, Math.PI), winMat);
					arch.rotation.x = Math.PI / 2;
					arch.position.set(x + 64, baseY + 140, -44);
					add(arch);
				} else {
					const banner = new THREE.Mesh(new THREE.PlaneGeometry(22, 60), M.mat("#8a2a2a", { roughness: 1 }));
					banner.material.side = THREE.DoubleSide;
					banner.position.set(x + 64, baseY + 118, -40);
					add(banner);
					const emblem = new THREE.Mesh(new THREE.CircleGeometry(5, 12), M.mat(0xf2c14e, { metalness: 0.6, roughness: 0.4 }));
					emblem.position.set(x + 64, baseY + 124, -39.5);
					add(emblem);
				}
			}
		}
	}

	buildGrass(room, tiles, th) {
		const spots = [];
		for (let ty = 1; ty < room.h; ty++) {
			for (let tx = 0; tx < room.w; tx++) {
				if (tiles[ty * room.w + tx] === T.GROUND && !isSolid(tiles[(ty - 1) * room.w + tx])) {
					for (let k = 0; k < 2; k++) {
						if (hash(tx * 3 + k, ty) > 0.45) {
							spots.push([ tx * TILE + 3 + hash(tx, k + 7) * 10, -(ty * TILE), (hash(tx, k + 3) - 0.5) * 12 ]);
						}
					}
				}
			}
		}
		if (!spots.length) {
			return;
		}
		const geo = new THREE.ConeGeometry(1.6, 6, 5);
		const im = new THREE.InstancedMesh(geo, M.mat(th.grass[1], { roughness: 1 }), spots.length);
		const m = new THREE.Matrix4();
		const q = new THREE.Quaternion();
		const sc = new THREE.Vector3();
		spots.forEach((s, i) => {
			const h = 0.8 + hash(i, 1) * 0.7;
			sc.set(1, h, 1);
			q.setFromEuler(new THREE.Euler(0, hash(i, 2) * 3, (hash(i, 3) - 0.5) * 0.5));
			m.compose(new THREE.Vector3(s[0], s[1] + 3 * h, s[2]), q, sc);
			im.setMatrixAt(i, m);
		});
		im.castShadow = true;
		im.userData.ownGeometry = true;
		this.backdrop.add(im);
		this.grass = im;
		// a few flowers
		const flowers = [];
		spots.forEach((s, i) => {
			if (hash(i, 9) > 0.86) {
				flowers.push(s);
			}
		});
		if (flowers.length) {
			const fg = new THREE.SphereGeometry(1.6, 8, 6);
			const fm = new THREE.InstancedMesh(fg, M.mat(0xfff3dc, { roughness: 0.6, emissive: 0xffe9a0, emissiveIntensity: 0.2 }), flowers.length);
			flowers.forEach((s, i) => {
				m.compose(new THREE.Vector3(s[0] + 2, s[1] + 5, s[2] + 2), q.identity(), sc.set(1, 1, 1));
				fm.setMatrixAt(i, m);
			});
			fm.userData.ownGeometry = true;
			this.backdrop.add(fm);
		}
	}

	buildTiles(theme, room, tiles) {
		// The 2D palette's cave blue reads as plastic once lit; in 3D the cave is
		// wet slate with a cold tint instead.
		const th = theme === "underground" ? { ...THEMES.underground, ground: [ "#3a4862", "#56688a", "#1b2334" ] } : (THEMES[theme] || THEMES.overworld);
		const g = this.tileGroup;
		const W = room.w;
		const cats = {};
		const push = (cat, tx, ty) => {
			(cats[cat] = cats[cat] || []).push([ tx, ty ]);
		};
		this.tileInstance = new Map();
		this.coinTiles = [];
		this.lavaTops = [];
		this.pipes = [];
		for (let ty = 0; ty < room.h; ty++) {
			for (let tx = 0; tx < W; tx++) {
				const id = tiles[ty * W + tx];
				if (id === T.EMPTY || id === T.HIDDEN) {
					continue;
				}
				const top = ty === 0 || !isSolid(tiles[(ty - 1) * W + tx]);
				switch (id) {
					case T.GROUND:
						push(top && th.grass ? "grassTop" : top ? "groundTop" : "ground", tx, ty);
						break;
					case T.CASTLE:
						push("castle", tx, ty);
						break;
					case T.BRICK:
						push("brick", tx, ty);
						break;
					case T.QUESTION:
					case T.QUESTION_ITEM:
					case T.QUESTION_LIFE:
						push("question", tx, ty);
						break;
					case T.USED:
						push("used", tx, ty);
						break;
					case T.HARD:
						push("hard", tx, ty);
						break;
					case T.GATE:
						push("gate", tx, ty);
						break;
					case T.GATE_OPEN:
						push("gateOpen", tx, ty);
						break;
					case T.BRIDGE:
						push("bridge", tx, ty);
						break;
					case T.POLE:
						push("pole", tx, ty);
						break;
					case T.POLE_TOP:
						this.buildPoleTop(tx, ty);
						push("pole", tx, ty);
						break;
					case T.LAVA:
						push("lava", tx, ty);
						if (ty === 0 || tiles[(ty - 1) * W + tx] !== T.LAVA) {
							this.lavaTops.push([ tx, ty ]);
						}
						break;
					case T.COIN: {
						const coin = M.makeCoin();
						coin.position.set(tx * TILE + 8, -(ty * TILE + 8), 0);
						coin.userData.phase = hash(tx, ty) * 6;
						g.add(coin);
						this.coinTiles.push(coin);
						break;
					}
					case T.PIPE_TL: {
						let h = 1;
						while (ty + h < room.h && tiles[(ty + h) * W + tx] === T.PIPE_L) {
							h++;
						}
						this.buildPipe(tx, ty, h);
						break;
					}
					default:
						break;
				}
			}
		}
		const deepGeo = atlasBox(16, 16, 44);
		const blockGeo = atlasBox(16, 16, 16);
		const defs = {
			grassTop: { geo: deepGeo, z: -14, tex: th.grass ? Textures.grassBlock(th) : Textures.dirtBlock(th) },
			groundTop: { geo: deepGeo, z: -14, tex: Textures.dirtBlock(th) },
			ground: { geo: deepGeo, z: -14, tex: Textures.dirtBlock(th) },
			castle: { geo: deepGeo, z: -14, tex: Textures.castle(), bump: 0.7 },
			brick: { geo: blockGeo, z: 0, tex: Textures.brick(th), bump: 0.7 },
			question: { geo: blockGeo, z: 0, tex: Textures.question(), emissive: 0xf2c14e, emissiveIntensity: 0.14, rough: 0.42, bump: 0.25 },
			used: { geo: blockGeo, z: 0, tex: Textures.used() },
			hard: { geo: blockGeo, z: 0, tex: Textures.hard(th) },
			gate: { geo: atlasBox(16, 16, 8), z: -2, tex: Textures.gate() },
			gateOpen: { geo: new THREE.BoxGeometry(16, 16, 2), z: -7, color: 0x050305 },
			bridge: { geo: new THREE.BoxGeometry(16, 6, 20), z: 0, dy: 5, tex: Textures.wood() },
			pole: { geo: new THREE.CylinderGeometry(1.4, 1.4, 16, 10), z: 0, color: 0xcfd8dc, metal: true },
			lava: { geo: new THREE.BoxGeometry(16, 14, 44), z: -14, dy: -1, lava: true },
		};
		const m4 = new THREE.Matrix4();
		for (const [ cat, list ] of Object.entries(cats)) {
			const def = defs[cat];
			if (!def || !list.length) {
				continue;
			}
			let material;
			if (def.lava) {
				material = this.lavaMaterial = this.lavaMaterial || new THREE.MeshStandardMaterial({ map: Textures.lava(), emissive: 0xff6a24, emissiveMap: Textures.lava(), emissiveIntensity: 1.1, roughness: 0.6 });
			} else if (def.tex) {
				material = new THREE.MeshStandardMaterial({
					map: def.tex,
					bumpMap: def.tex.userData.bump || null,
					bumpScale: def.bump ?? 0.45,
					roughness: def.rough ?? 0.92,
					// Ground tops are seen at a grazing angle, where a bright sky
					// reflection washes them out; keep the sky fill subtle there.
					envMapIntensity: def.geo === deepGeo ? 0.45 : 0.8,
					emissive: def.emissive || 0x000000,
					emissiveIntensity: def.emissiveIntensity || 0,
				});
				if (cat === "question") {
					this.questionMaterial = material;
				}
			} else {
				material = M.mat(def.color, { roughness: def.metal ? 0.3 : 0.8, metalness: def.metal ? 0.8 : 0 });
			}
			const im = new THREE.InstancedMesh(def.geo, material, list.length);
			im.castShadow = !def.lava;
			im.receiveShadow = true;
			list.forEach(([ tx, ty ], i) => {
				m4.makeTranslation(tx * TILE + 8, -(ty * TILE + 8) + (def.dy || 0), def.z);
				im.setMatrixAt(i, m4);
				this.tileInstance.set(ty * W + tx, { im, i, x: tx * TILE + 8, y: -(ty * TILE + 8) + (def.dy || 0), z: def.z });
			});
			g.add(im);
		}
	}

	buildPipe(tx, ty, h) {
		const g = this.tileGroup;
		const green = M.mat(0x3cb84c, { roughness: 0.45, metalness: 0.15 });
		const dark = M.mat(0x2a9239, { roughness: 0.5, metalness: 0.15 });
		const cx = tx * TILE + 16;
		const topY = -(ty * TILE);
		const rim = new THREE.Mesh(new THREE.CylinderGeometry(17.5, 17.5, 16, 28), green);
		rim.position.set(cx, topY - 8, 0);
		rim.castShadow = true;
		rim.receiveShadow = true;
		rim.userData.ownGeometry = true;
		const lip = new THREE.Mesh(new THREE.TorusGeometry(16.2, 1.4, 8, 28), dark);
		lip.rotation.x = Math.PI / 2;
		lip.position.set(cx, topY - 0.6, 0);
		lip.userData.ownGeometry = true;
		const mouth = new THREE.Mesh(new THREE.CircleGeometry(15.4, 28), M.mat(0x0a2a12, { roughness: 1 }));
		mouth.rotation.x = -Math.PI / 2;
		mouth.position.set(cx, topY - 0.2, 0);
		mouth.userData.ownGeometry = true;
		g.add(rim, lip, mouth);
		if (h > 1) {
			const body = new THREE.Mesh(new THREE.CylinderGeometry(15.5, 15.5, (h - 1) * 16, 28), green);
			body.position.set(cx, topY - 16 - ((h - 1) * 16) / 2, 0);
			body.castShadow = true;
			body.receiveShadow = true;
			body.userData.ownGeometry = true;
			g.add(body);
		}
		this.pipes.push({ tx, ty, h });
	}

	buildPoleTop(tx, ty) {
		const g = this.tileGroup;
		const ball = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), M.GOLD);
		ball.position.set(tx * TILE + 8, -(ty * TILE + 3), 0);
		ball.castShadow = true;
		g.add(ball);
		const flag = new THREE.Mesh(new THREE.PlaneGeometry(18, 12, 6, 1), new THREE.MeshStandardMaterial({ map: Textures.flag(), side: THREE.DoubleSide, roughness: 0.9 }));
		flag.position.set(tx * TILE + 8 - 9, -(ty * TILE + 14), 0.5);
		flag.castShadow = true;
		flag.userData.ownGeometry = true;
		g.add(flag);
		this.flag = { mesh: flag, tx, ty };
	}

	// --- per-frame -----------------------------------------------------------

	drawWorld(game) {
		const world = game.world;
		this.tick += this.tickStep ?? 1;
		const ctx = this.ctx;
		if (!world) {
			this.drawScene("overworld", this.tick * 0.5, 12 * TILE);
			return;
		}
		const s = world.s;
		const room = world.room;
		const tiles = world.tiles;
		const theme = room.theme || game.level.theme;
		const th = THEMES[theme] || THEMES.overworld;
		const shakeOn = game.state.settings.shake && !this.reducedMotion;
		let camX = s.camera.x;
		let camY = s.camera.y;
		if (s.shake > 0 && shakeOn) {
			camX += (this.tick % 2 ? 1 : -1) * Math.min(3, s.shake);
			camY += (this.tick % 3 ? 1 : -1) * Math.min(2, s.shake >> 1);
		}
		this.ensureRoom(game.level, s.roomName, room, tiles, theme);
		const advancing = s.frame !== this.fx.prevFrame;
		if (s.frame < this.fx.prevFrame) {
			this.dust = [];
			this.amb = [];
		}
		const p = s.player;
		// camera with a little lookahead
		const targetLook = p.facing * Math.min(1, Math.abs(p.vx) / 2.6) * 10;
		this.look += (targetLook - this.look) * 0.05;
		let cx = camX + VIEW_W / 2 + this.look;
		let cy = -(camY + VIEW_H / 2);
		if (this.debugZoom > 1) {
			cx = p.x + p.w / 2;
			cy = -(p.y + p.h / 2);
		}
		this.placeCamera(cx, cy);
		this.updateLights(cx, cy, theme, p, s);
		this.updateBackdrop(cx, cy, theme);
		this.animateTiles(s, room);

		this.beginPools();
		this.syncHero(s, advancing);
		this.syncEnemies(s);
		this.syncItems(s);
		this.drawSimParticles(s, th);
		if (advancing) {
			this.updateAmbience(s, room, tiles, theme, camX, camY);
		}
		this.drawAmbience(theme);
		this.drawLavaGlow(camX, camY);
		this.endPools();
		this.fx.prevFrame = s.frame;

		if (!this.contextLost) {
			this.gl.render(this.scene, this.camera);
		}

		// overlay: score popups, vignette, flash
		ctx.clearRect(0, 0, VIEW_W, VIEW_H);
		for (const pop of s.popups) {
			const pt = this.project(pop.x + 6, -(pop.y));
			const k = pop.t > 30 ? 1 - (pop.t - 30) / 15 : 1;
			ctx.globalAlpha = Math.max(0, k);
			drawText(ctx, pop.text, pt.x - 6, pt.y - 4, pop.text === "1UP" ? "#7fe08a" : "#fff6c8", 1);
			ctx.globalAlpha = 1;
		}
		ctx.drawImage(vignetteTexture(VIEW_W, VIEW_H, Math.max(0.12, th.vignette * 0.8)), 0, 0);
		if (this.flash > 0) {
			ctx.fillStyle = `rgba(255,255,255,${0.12 * this.flash})`;
			ctx.fillRect(0, 0, VIEW_W, VIEW_H);
			this.flash--;
		}
	}

	placeCamera(cx, cy) {
		const zoom = this.debugZoom || 1;
		this.camera.position.set(cx, cy + CAM_RISE / zoom, CAM_DIST / zoom);
		this.camera.lookAt(cx, cy - 2 / zoom, 0);
	}

	project(x, y) {
		const v = new THREE.Vector3(x, y, 0).project(this.camera);
		return { x: (v.x + 1) / 2 * VIEW_W, y: (1 - v.y) / 2 * VIEW_H };
	}

	updateLights(cx, cy, theme, p, s) {
		this.sun.position.set(cx + 160, cy + 320, 240);
		this.sun.target.position.set(cx, cy, 0);
		this.sun.target.updateMatrixWorld();
		this.rim.position.set(cx - 200, cy + 120, -180);
		this.rim.target.position.set(cx, cy, 0);
		this.rim.target.updateMatrixWorld();
		if (p) {
			this.heroLight.position.set(p.x + p.w / 2, -(p.y + p.h / 2) + 6, 30);
		}
		if (!this.lights) {
			return;
		}
		const sources = theme === "castle" ? this.lights.torches : theme === "underground" ? this.lights.crystals : [];
		const sorted = sources.slice().sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx));
		this.spotLights.forEach((l, i) => {
			const src = sorted[i];
			if (!src) {
				l.intensity = 0;
				return;
			}
			const flicker = theme === "castle" ? 0.85 + Math.sin(this.tick * 0.31 + src.x) * 0.1 + Math.sin(this.tick * 0.77 + src.x * 0.3) * 0.05 : 0.7 + Math.sin(this.tick * 0.05 + src.x) * 0.15;
			l.position.set(src.x, src.y, src.z + 16);
			l.intensity = (theme === "castle" ? 1.6 : 1.1) * flicker;
		});
		if (theme === "castle") {
			for (const tc of this.lights.torches) {
				tc.flame.scale.y = 6 + Math.sin(this.tick * 0.4 + tc.x) * 1.2;
				tc.flame.rotation.z = Math.sin(this.tick * 0.3 + tc.x * 0.7) * 0.15;
			}
		}
	}

	updateBackdrop(cx, cy, theme) {
		if (this.sunSprite) {
			const dusk = theme === "dusk";
			this.sunSprite.position.set(cx + (dusk ? 140 : 260), cy + (dusk ? -20 : 230), -1500);
		}
		if (this.stars) {
			this.stars.position.set(cx * 0.9, cy * 0.5, 0);
		}
		for (const c of this.clouds) {
			c.position.x += c.userData.speed;
			if (c.position.x > cx + 1100) {
				c.position.x -= 2200;
			} else if (c.position.x < cx - 1100) {
				c.position.x += 2200;
			}
		}
		if (this.grass && !this.reducedMotion) {
			this.grass.rotation.z = Math.sin(this.tick * 0.03) * 0.04;
		}
	}

	animateTiles(s, room) {
		const t = this.tick;
		for (const c of this.coinTiles) {
			c.update(t, c.userData.phase);
		}
		if (this.questionMaterial) {
			this.questionMaterial.emissiveIntensity = 0.15 + (Math.sin(t * 0.12) + 1) * 0.12;
		}
		if (this.lavaMaterial) {
			this.lavaMaterial.map.offset.set(t * 0.0015, Math.sin(t * 0.01) * 0.05);
		}
		if (this.flag) {
			const f = this.flag;
			const fy = s.goal ? s.goal.flagY : f.ty * TILE + 8;
			f.mesh.position.y = -(fy + 6);
			const pos = f.mesh.geometry.attributes.position;
			for (let i = 0; i < pos.count; i++) {
				const x = pos.getX(i);
				pos.setZ(i, Math.sin(t * 0.2 + x * 0.4) * (0.5 + (9 - x) * 0.12));
			}
			pos.needsUpdate = true;
		}
		// bumped blocks hop
		const m4 = new THREE.Matrix4();
		const active = new Set();
		for (const b of s.bumps) {
			const idx = b.ty * room.w + b.tx;
			const inst = this.tileInstance.get(idx);
			if (!inst) {
				continue;
			}
			active.add(idx);
			const dy = Math.sin((b.t / 12) * Math.PI) * 6;
			m4.makeTranslation(inst.x, inst.y + dy, inst.z);
			inst.im.setMatrixAt(inst.i, m4);
			inst.im.instanceMatrix.needsUpdate = true;
			inst.bumping = true;
		}
		for (const [ idx, inst ] of this.tileInstance) {
			if (inst.bumping && !active.has(idx)) {
				m4.makeTranslation(inst.x, inst.y, inst.z);
				inst.im.setMatrixAt(inst.i, m4);
				inst.im.instanceMatrix.needsUpdate = true;
				inst.bumping = false;
			}
		}
	}

	ensureHero() {
		if (!this.hero) {
			this.hero = M.makeHero(this.faceTexture);
			this.dynGroup.add(this.hero);
		}
		return this.hero;
	}

	syncHero(s, advancing) {
		const p = s.player;
		const h = this.ensureHero();
		const fx = this.fx;
		if (advancing && s.status === "playing") {
			if (p.ground && !fx.prevGround && fx.prevVy > 1.5) {
				fx.squash = 8;
				const n = fx.prevVy > 4 ? 7 : 4;
				for (let i = 0; i < n; i++) {
					this.puffDust(p.x + p.w / 2 + (i - n / 2) * 3, p.y + p.h, (i - (n - 1) / 2) * 0.5, -0.3 - hash(this.tick, i) * 0.4, 16);
				}
			} else if (!p.ground && fx.prevGround && p.vy < -2) {
				fx.stretch = 7;
			}
			if (p.skid && p.ground && this.tick % 3 === 0) {
				this.puffDust(p.x + (p.facing > 0 ? -2 : p.w + 2), p.y + p.h, -p.facing * 0.6, -0.5, 12);
			} else if (p.ground && Math.abs(p.vx) > 2.2 && this.tick % 6 === 0) {
				this.puffDust(p.x + (p.vx > 0 ? -1 : p.w + 1), p.y + p.h, -Math.sign(p.vx) * 0.4, -0.3, 12);
			}
			fx.prevGround = p.ground;
			fx.prevVy = p.vy;
		}
		if (advancing) {
			if (fx.squash > 0) {
				fx.squash--;
			}
			if (fx.stretch > 0) {
				fx.stretch--;
			}
		}
		const flicker = p.invuln > 0 && !p.dying && Math.floor(p.invuln / 3) % 2 === 1 && s.status === "playing";
		h.visible = !flicker;
		let power = p.power;
		let pose = p.dying ? "dead" : p.pose;
		if (pose === "jump" && p.vy > 0.6 && s.status === "playing") {
			pose = "fall";
		}
		if (p.growT > 0) {
			const alt = Math.floor(p.growT / 4) % 2 === 0;
			power = alt ? p.growTo : p.power;
			pose = "idle";
		}
		const base = power > 0 ? 1.08 : 0.62;
		let sx = base;
		let sy = base;
		if (fx.squash > 0) {
			const k = fx.squash / 8;
			sx *= 1 + 0.22 * k;
			sy *= 1 - 0.22 * k;
		} else if (fx.stretch > 0) {
			const k = fx.stretch / 7;
			sx *= 1 - 0.12 * k;
			sy *= 1 + 0.16 * k;
		}
		h.scale.set(sx, sy, sx);
		h.position.set(p.x + p.w / 2, -(p.y + p.h), 0);
		if (p.dying) {
			h.rotation.z = Math.min(1.2, p.deathT * 0.02);
		}
		h.update({ ...p, power }, this.tick, { pose, frozen: !advancing });
		if (p.dying) {
			h.rotation.z = Math.min(1.4, p.deathT * 0.03) * (p.facing > 0 ? 1 : -1);
		}
	}

	modelFor(obj, make) {
		let m = this.models.get(obj);
		if (!m) {
			m = make();
			m.userData.sim = obj;
			this.dynGroup.add(m);
			this.models.set(obj, m);
		}
		m.userData.seen = this.tick;
		return m;
	}

	pruneModels() {
		for (const [ obj, m ] of this.models) {
			if (m.userData.seen !== this.tick) {
				this.dynGroup.remove(m);
				this.models.delete(obj);
			}
		}
	}

	syncEnemies(s) {
		const makers = { grumble: M.makeGrumble, clanker: M.makeClanker, flitter: M.makeFlitter, chompvine: M.makeChompvine, boss: M.makeBoss };
		for (const e of s.enemies) {
			if (e.remove) {
				continue;
			}
			const make = makers[e.type];
			if (!make) {
				continue;
			}
			const m = this.modelFor(e, make);
			m.position.set(e.x + e.w / 2, -(e.y + e.h), e.type === "chompvine" ? 0 : 0);
			if (e.type === "chompvine") {
				// stem rooted in the pipe; hide completely while hidden
				m.position.y = -(e.y + e.h) - 2;
				m.visible = e.state !== "hidden";
			}
			m.update(e, this.tick);
		}
	}

	syncItems(s) {
		for (const it of s.items) {
			if (it.remove) {
				continue;
			}
			let m;
			switch (it.type) {
				case "platform":
					m = this.modelFor(it, () => M.makePlatform(it.w));
					m.position.set(it.x, -it.y, 0);
					break;
				case "berry":
				case "plum":
				case "heart":
					m = this.modelFor(it, it.type === "berry" ? M.makeBerry : it.type === "plum" ? M.makePlum : M.makeHeart);
					m.position.set(it.x + it.w / 2, -(it.y + it.h), it.emerge > 0 ? -7 : 0);
					m.update(this.tick);
					if (it.emerge === 0) {
						this.glow(it.x + 6, -(it.y + 6), 4, 36, it.type === "heart" ? 0x7fe08a : it.type === "plum" ? 0xc08cff : 0xffb070, 0.35);
					}
					break;
				case "spark":
					m = this.modelFor(it, M.makeSpark);
					m.position.set(it.x + 4, -(it.y + 4), 2);
					m.update(this.tick);
					this.glow(it.x + 4, -(it.y + 4), 6, 40, 0xffd060, 0.8);
					break;
				case "coinPop":
					m = this.modelFor(it, M.makeCoin);
					m.position.set(it.x + 4, -(it.y + 8), 2);
					m.update(this.tick * 3);
					this.glow(it.x + 4, -(it.y + 8), 6, 26, 0xffe08a, 0.5);
					break;
			}
		}
		this.pruneModels();
		for (const c of this.coinTiles) {
			this.glow(c.position.x, c.position.y, 6, 22, 0xffd060, 0.22 + Math.sin(this.tick * 0.1 + c.userData.phase) * 0.08);
		}
	}

	drawSimParticles(s, th) {
		const shardMat = M.mat(th.ground[0], { roughness: 0.9 });
		for (const pt of s.particles) {
			if (pt.kind === "shard") {
				this.shard(pt.x + 3, -(pt.y + 3), 4, pt.t * 0.25 * (pt.vx > 0 ? 1 : -1), shardMat);
			} else if (pt.kind === "puff") {
				const k = pt.t / pt.life;
				this.softSprite(pt.x + 2, -(pt.y + 2), 8, 10 + k * 26, 0xffffff, 0.7 * (1 - k));
			} else if (pt.kind === "sparkle") {
				const k = 1 - pt.t / pt.life;
				this.glow(pt.x, -pt.y, 8, 10 + k * 14, 0xfff6c8, 0.9 * k);
			}
		}
	}

	puffDust(x, y, vx, vy, life) {
		if (this.dust.length < 48) {
			this.dust.push({ x, y, vx, vy, t: 0, life });
		}
	}

	updateAmbience(s, room, tiles, theme, camX, camY) {
		const t = this.tick;
		for (const v of this.dust) {
			v.t++;
			v.x += v.vx;
			v.y += v.vy;
			v.vx *= 0.9;
			v.vy *= 0.92;
		}
		this.dust = this.dust.filter((v) => v.t < v.life);
		const amb = this.amb;
		const spawnEvery = theme === "castle" ? 5 : theme === "underground" ? 8 : 10;
		const cap = theme === "castle" ? 36 : 24;
		if (amb.length < cap && t % spawnEvery === 0) {
			const r1 = hash(t, 1);
			const r2 = hash(t, 2);
			if (theme === "overworld") {
				amb.push({ kind: "leaf", x: camX + r1 * (VIEW_W + 40) - 20, y: camY - 6, z: (r2 - 0.5) * 40, vx: 0.25 + r2 * 0.3, vy: 0.35 + r1 * 0.25, t: 0, life: 420, seed: r2 * 10 });
			} else if (theme === "dusk") {
				amb.push({ kind: "firefly", x: camX + r1 * VIEW_W, y: camY + 60 + r2 * 100, z: (r2 - 0.5) * 60, vx: (r2 - 0.5) * 0.3, vy: (r1 - 0.5) * 0.2, t: 0, life: 320, seed: r1 * 10 });
			} else if (theme === "underground") {
				if (r2 < 0.4) {
					amb.push({ kind: "drip", x: camX + r1 * VIEW_W, y: camY + 16, z: (r2 - 0.5) * 20, vx: 0, vy: 0.4, t: 0, life: 200, seed: 0 });
				} else {
					amb.push({ kind: "mote", x: camX + r1 * VIEW_W, y: camY + 30 + r2 * 140, z: (r1 - 0.5) * 40, vx: (r2 - 0.5) * 0.15, vy: -0.08, t: 0, life: 360, seed: r1 * 10 });
				}
			} else if (theme === "castle") {
				const visible = this.lavaTops.filter(([ tx ]) => tx * TILE > camX - 32 && tx * TILE < camX + VIEW_W + 32);
				if (visible.length && r2 < 0.75) {
					const [ tx, ty ] = visible[Math.floor(r1 * visible.length)];
					amb.push({ kind: "ember", x: tx * TILE + hash(t, 3) * TILE, y: ty * TILE, z: (r2 - 0.5) * 20, vx: (r2 - 0.4) * 0.4, vy: -0.5 - r1 * 0.5, t: 0, life: 70 + r2 * 50, seed: r1 * 10 });
				} else {
					amb.push({ kind: "ash", x: camX + r1 * VIEW_W, y: camY + r2 * VIEW_H, z: (r1 - 0.5) * 40, vx: -0.1 - r2 * 0.1, vy: -0.05, t: 0, life: 300, seed: r1 * 10 });
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
						this.puffDust(a.x, ty * TILE, 0, -0.2, 8);
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
		this.amb = amb.filter((a) => a.t < a.life);
	}

	drawAmbience(theme) {
		const t = this.tick;
		for (const v of this.dust) {
			const k = 1 - v.t / v.life;
			this.softSprite(v.x, -v.y + 2, 6, 5 + (1 - k) * 12, 0xfff4e6, 0.55 * k);
		}
		for (const a of this.amb) {
			const life = 1 - a.t / a.life;
			switch (a.kind) {
				case "leaf":
					this.softSprite(a.x, -a.y, a.z, 3.5, Math.floor(a.seed) % 2 ? 0x8fd36a : 0xf2c14e, 0.9);
					break;
				case "firefly": {
					const pulse = 0.4 + Math.sin(t * 0.12 + a.seed * 3) * 0.4;
					this.glow(a.x, -a.y, a.z, 14, 0xf2e07a, pulse * Math.min(1, life * 3));
					break;
				}
				case "drip":
					this.softSprite(a.x, -a.y, a.z, 2.5, 0x9ad6ff, 0.9);
					break;
				case "mote":
					this.softSprite(a.x, -a.y, a.z, 2, 0xa0d2ff, 0.5 * Math.min(1, life * 3));
					break;
				case "ash":
					this.softSprite(a.x, -a.y, a.z, 2, 0xc8b4aa, 0.35 * Math.min(1, life * 3));
					break;
				case "ember":
					this.glow(a.x, -a.y, a.z, 6, life > 0.5 ? 0xffd060 : 0xff6a24, Math.min(1, life * 2));
					break;
			}
		}
	}

	drawLavaGlow(camX, camY) {
		if (this.lights) {
			for (const cr of this.lights.crystals) {
				if (cr.x > camX - 60 && cr.x < camX + VIEW_W + 60) {
					this.glow(cr.x, cr.y, cr.z, 70, 0x6ff0ff, 0.4 + Math.sin(this.tick * 0.05 + cr.x) * 0.12);
				}
			}
		}
		const pulse = 0.35 + Math.sin(this.tick * 0.07) * 0.08;
		for (const [ tx, ty ] of this.lavaTops) {
			const x = tx * TILE;
			if (x < camX - 40 || x > camX + VIEW_W + 40) {
				continue;
			}
			this.glow(x + 8, -(ty * TILE) + 6, 4, 54, 0xff7a2a, pulse);
		}
	}

	// --- showcase scene for the title, level select and cards -----------------

	drawScene(theme, camX, roomPixelH) {
		this.tick += this.tickStep ?? 1;
		const idx = THEME_LEVEL[theme] ?? 0;
		const level = this.levels[idx];
		const room = level.rooms.main;
		const tiles = room.tiles;
		this.ensureRoom(level, "main", room, tiles, theme);
		if (!this.showcase || this.showcase.level !== level) {
			this.showcase = { level, hero: null, phase: 0 };
			this.models.clear();
			this.clearGroup(this.dynGroup);
			this.hero = null;
		}
		// Entities from a finished game must not linger in the showcase.
		this.pruneModels();
		const span = Math.max(1, room.w * TILE - VIEW_W - 300);
		const scroll = ((camX % span) + span) % span;
		const cx = 150 + scroll + VIEW_W / 2;
		const groundY = -(room.h * TILE - 32);
		const cy = groundY + 64;
		this.placeCamera(cx, cy);
		const hero = this.ensureHero();
		const walking = this.showcasePose === "walk";
		const hx = cx - 118;
		const hy = this.groundTopAt(room, tiles, Math.floor(hx / TILE));
		hero.position.set(hx, hy, 0);
		hero.scale.set(1, 1, 1);
		hero.visible = true;
		hero.update({ x: hx, y: -hy - 28, w: 12, h: 28, vx: walking ? 2.4 : 0, facing: 1, ground: true, power: 1, pose: walking ? "walk" : "idle" }, this.tick, { pose: walking ? "walk" : "idle" });
		this.updateLights(cx, cy, theme, { x: hx - 6, y: -hy - 28, w: 12, h: 28 }, null);
		this.updateBackdrop(cx, cy, theme);
		this.animateTiles({ bumps: [], goal: null }, room);
		this.beginPools();
		if (walking && this.tick % 5 === 0) {
			this.puffDust(hx - 4, -hy, -0.5, -0.3, 14);
		}
		for (const v of this.dust) {
			v.t++;
			v.x += v.vx;
			v.y += v.vy;
		}
		this.dust = this.dust.filter((v) => v.t < v.life);
		this.drawAmbience(theme);
		for (const c of this.coinTiles) {
			this.glow(c.position.x, c.position.y, 6, 22, 0xffd060, 0.25);
		}
		this.drawLavaGlow(cx - VIEW_W / 2, -cy - VIEW_H / 2);
		this.endPools();
		if (!this.contextLost) {
			this.gl.render(this.scene, this.camera);
		}
		this.ctx.clearRect(0, 0, VIEW_W, VIEW_H);
	}
}
