// Procedural 3D models for the 2.5D view: Ember, enemies, items and decor.
// Each factory returns a THREE.Group with an `update(state, t)` method that
// animates it from simulation state. Units are world pixels (one tile = 16).
import { Textures } from "./textures.js";

const matCache = new Map();

export function mat(color, opts = {}) {
	const key = `${color}|${opts.roughness ?? 0.75}|${opts.metalness ?? 0}|${opts.emissive || ""}|${opts.emissiveIntensity ?? 0}|${opts.flat ? 1 : 0}`;
	if (!matCache.has(key)) {
		matCache.set(key, new THREE.MeshStandardMaterial({
			color,
			roughness: opts.roughness ?? 0.75,
			metalness: opts.metalness ?? 0,
			emissive: opts.emissive || 0x000000,
			emissiveIntensity: opts.emissiveIntensity ?? 0,
			flatShading: Boolean(opts.flat),
		}));
	}
	return matCache.get(key);
}

function mesh(geo, material, x = 0, y = 0, z = 0) {
	const m = new THREE.Mesh(geo, material);
	m.position.set(x, y, z);
	m.castShadow = true;
	m.receiveShadow = false;
	return m;
}

const GEO = {
	sphere: new THREE.SphereGeometry(1, 20, 14),
	sphereLow: new THREE.SphereGeometry(1, 12, 9),
	box: new THREE.BoxGeometry(1, 1, 1),
	cone: new THREE.ConeGeometry(1, 1, 10),
	cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
	coin: new THREE.CylinderGeometry(5.2, 5.2, 1.6, 28),
	coinRim: new THREE.TorusGeometry(5.2, 0.5, 8, 28),
};

function eye(x, y, z, r = 1.2) {
	const g = new THREE.Group();
	const white = mesh(GEO.sphere, mat(0xfff3dc, { roughness: 0.4 }));
	white.scale.setScalar(r);
	const pupil = mesh(GEO.sphere, mat(0x1c1c24, { roughness: 0.3 }));
	pupil.scale.setScalar(r * 0.55);
	pupil.position.set(0, 0, r * 0.6);
	g.add(white, pupil);
	g.position.set(x, y, z);
	g.userData.pupil = pupil;
	return g;
}

// --- Ember ----------------------------------------------------------------------

const SKIN = 0xc98a5a;
const HAIR = 0x2a1a1e;

export function makeHero(faceTexture) {
	const g = new THREE.Group();
	const kurta = mat(0xe8762c, { roughness: 0.7 });
	const kurtaSpark = mat(0xf2c14e, { roughness: 0.5, emissive: 0xf2c14e, emissiveIntensity: 0.15 });
	const legging = mat(0x2a3a6a, { roughness: 0.85 });
	const skin = mat(SKIN, { roughness: 0.65 });
	const hair = mat(HAIR, { roughness: 0.55 });
	const shoe = mat(0x1c1c24, { roughness: 0.6 });
	const teal = mat(0x19b3a6, { roughness: 0.6 });
	const tealSpark = mat(0xe2402a, { roughness: 0.6 });

	// legs with hip pivots
	const legs = [];
	for (const side of [ -1, 1 ]) {
		const hip = new THREE.Group();
		hip.position.set(side * 2.1, 10, 0);
		const leg = mesh(new THREE.CapsuleGeometry(1.8, 6, 4, 10), legging, 0, -4.6, 0);
		const foot = mesh(GEO.sphere, shoe, 0, -9.3, 0.8);
		foot.scale.set(2.1, 1.3, 2.8);
		hip.add(leg, foot);
		g.add(hip);
		legs.push(hip);
	}
	// torso and kurta hem
	const torso = new THREE.Group();
	torso.position.y = 10;
	const body = mesh(new THREE.CapsuleGeometry(3.9, 5.5, 4, 14), kurta, 0, 6.2, 0);
	const hem = mesh(new THREE.CylinderGeometry(4.3, 5.6, 4.2, 16, 1, true), kurta, 0, 1.4, 0);
	hem.material.side = THREE.DoubleSide;
	const neck = mesh(GEO.cyl, skin, 0, 12.6, 0);
	neck.scale.set(1.5, 2, 1.5);
	torso.add(body, hem, neck);
	// dupatta sash across the torso
	const sash = mesh(GEO.box, teal, 0.6, 7.4, 3.2);
	sash.scale.set(2.6, 9.5, 1.2);
	sash.rotation.z = 0.45;
	torso.add(sash);
	// arms with shoulder pivots
	const arms = [];
	for (const side of [ -1, 1 ]) {
		const shoulder = new THREE.Group();
		shoulder.position.set(side * 4.6, 10.6, 0);
		const sleeve = mesh(new THREE.CapsuleGeometry(1.35, 3.2, 4, 10), kurta, 0, -2.4, 0);
		const forearm = mesh(new THREE.CapsuleGeometry(1.2, 2.8, 4, 10), skin, 0, -6, 0);
		const hand = mesh(GEO.sphere, skin, 0, -8.2, 0);
		hand.scale.setScalar(1.45);
		shoulder.add(sleeve, forearm, hand);
		torso.add(shoulder);
		arms.push(shoulder);
	}
	// head
	const head = new THREE.Group();
	head.position.y = 24.6;
	const skull = mesh(GEO.sphere, skin, 0, 0, 0);
	skull.scale.setScalar(5.1);
	const cap = mesh(GEO.sphere, hair, 0, 0.7, -1.1);
	cap.scale.set(5.6, 5.5, 5.4);
	const bangs = mesh(GEO.sphere, hair, 0.6, 3.9, 3.2);
	bangs.scale.set(4.2, 1.6, 2.2);
	bangs.rotation.z = -0.15;
	const bun = mesh(GEO.sphere, hair, 0, 3.2, -4.8);
	bun.scale.setScalar(2.6);
	const tail = new THREE.Group();
	tail.position.set(0, 2.4, -5.6);
	const tailMesh = mesh(new THREE.CapsuleGeometry(1.5, 5.5, 4, 10), hair, 0, -4.2, -0.8);
	tail.add(tailMesh);
	// face patch wrapped onto the front of the skull
	const faceGeo = new THREE.SphereGeometry(5.3, 18, 14, Math.PI / 2 - 1.05, 2.1, Math.PI / 2 - 1.0, 1.95);
	const faceMat = new THREE.MeshStandardMaterial({ map: faceTexture || Textures.face(), transparent: true, roughness: 0.6 });
	const face = new THREE.Mesh(faceGeo, faceMat);
	face.position.y = -0.2;
	face.castShadow = false;
	const earrings = [ -1, 1 ].map((s) => {
		const e = mesh(GEO.sphere, mat(0xf2c14e, { metalness: 0.7, roughness: 0.3 }), s * 5.2, -1.2, 0.6);
		e.scale.setScalar(0.7);
		return e;
	});
	head.add(skull, cap, bangs, bun, tail, face, ...earrings);
	// trailing dupatta: a chain of small panels behind the shoulders
	const ribbon = [];
	for (let i = 0; i < 8; i++) {
		const seg = mesh(GEO.box, teal);
		seg.scale.set(2.2, 3.4 - i * 0.22, 0.5);
		seg.castShadow = false;
		g.add(seg);
		ribbon.push(seg);
	}
	g.add(torso, head);

	const state = { phase: 0, yaw: 0.35, blink: 0, breathe: 0 };
	g.userData = { torso, head, arms, legs, tail, ribbon, sash, body, hem, state, faceMat, cap, bangs, bun, tailMesh };

	// Swap the face texture at runtime (when a portrait photo loads).
	g.setFace = (texture) => {
		faceMat.map = texture;
		faceMat.needsUpdate = true;
	};

	g.update = (p, t, extra = {}) => {
		const st = state;
		const spark = p.power === 2;
		body.material = spark ? kurtaSpark : kurta;
		hem.material = spark ? kurtaSpark : kurta;
		for (const a of arms) {
			a.children[0].material = spark ? kurtaSpark : kurta;
		}
		sash.material = spark ? tealSpark : teal;
		for (const r of ribbon) {
			r.material = spark ? tealSpark : teal;
		}
		const speed = Math.min(1, Math.abs(p.vx) / 2.6);
		const pose = extra.pose || p.pose;
		if (!extra.frozen) {
			st.phase += Math.abs(p.vx) * 0.16 + (pose === "walk" ? 0.04 : 0);
		}
		// facing: three-quarter turn toward the camera, eased
		const targetYaw = p.facing >= 0 ? 0.42 : Math.PI - 0.42;
		let d = targetYaw - st.yaw;
		while (d > Math.PI) {
			d -= Math.PI * 2;
		}
		while (d < -Math.PI) {
			d += Math.PI * 2;
		}
		st.yaw += d * 0.25;
		g.rotation.y = st.yaw;

		const swing = Math.sin(st.phase);
		const lift = Math.cos(st.phase);
		let lean = 0;
		if (pose === "walk" || pose === "skid") {
			legs[0].rotation.x = swing * (0.6 + speed * 0.5);
			legs[1].rotation.x = -swing * (0.6 + speed * 0.5);
			arms[0].rotation.x = -swing * (0.5 + speed * 0.4);
			arms[1].rotation.x = swing * (0.5 + speed * 0.4);
			arms[0].rotation.z = 0.25;
			arms[1].rotation.z = -0.25;
			torso.position.y = 10 + Math.abs(lift) * speed * 0.9;
			lean = -speed * 0.18;
			if (pose === "skid") {
				lean = 0.35;
				legs[0].rotation.x = 0.7;
				legs[1].rotation.x = -0.2;
				arms[0].rotation.x = arms[1].rotation.x = 0.9;
			}
		} else if (pose === "jump" || pose === "pole" || pose === "throw") {
			legs[0].rotation.x = 0.9;
			legs[1].rotation.x = -0.4;
			arms[0].rotation.x = -2.6;
			arms[1].rotation.x = -2.2;
			arms[0].rotation.z = 0.5;
			arms[1].rotation.z = -0.5;
			torso.position.y = 10;
		} else if (pose === "fall") {
			legs[0].rotation.x = 0.5;
			legs[1].rotation.x = -0.6;
			arms[0].rotation.x = -0.6;
			arms[1].rotation.x = -0.6;
			arms[0].rotation.z = 1.9;
			arms[1].rotation.z = -1.9;
			torso.position.y = 10;
		} else if (pose === "dead") {
			legs[0].rotation.x = 0.4;
			legs[1].rotation.x = -0.4;
			arms[0].rotation.x = -2.8;
			arms[1].rotation.x = -2.8;
			arms[0].rotation.z = 0.8;
			arms[1].rotation.z = -0.8;
		} else {
			// idle: breathe, arms relaxed
			st.breathe += 0.05;
			const b = Math.sin(st.breathe);
			legs[0].rotation.x = legs[1].rotation.x = 0;
			arms[0].rotation.x = arms[1].rotation.x = 0.1 + b * 0.04;
			arms[0].rotation.z = 0.22;
			arms[1].rotation.z = -0.22;
			torso.position.y = 10 + b * 0.25;
		}
		g.rotation.z = lean * (p.facing >= 0 ? 1 : -1);
		head.position.y = torso.position.y + 14.6;
		head.rotation.x = pose === "fall" ? -0.2 : pose === "jump" ? 0.1 : 0;
		head.rotation.y = Math.sin(t * 0.02) * 0.05;
		// hair swing
		tail.rotation.x = -0.25 - speed * 0.35 + Math.sin(st.phase * 0.5 + t * 0.05) * 0.18;
		tail.rotation.z = Math.sin(t * 0.07) * 0.12;
		// dupatta trail: hangs behind, flows out with speed
		const flow = 0.3 + speed * 1.2 + (p.ground ? 0 : 0.5);
		for (let i = 0; i < ribbon.length; i++) {
			const seg = ribbon[i];
			const k = i + 1;
			const wave = Math.sin(t * 0.28 - k * 0.75) * (0.35 + speed * 0.9);
			seg.position.set(-(k * 1.45) * (0.6 + flow * 0.4), torso.position.y + 10.4 - k * (1.5 - flow * 0.85) + wave, -2.6 - k * 0.1);
			seg.rotation.z = -0.5 + flow * 0.4 + wave * 0.1;
		}
		// blink
		if (!extra.frozen) {
			st.blink = (st.blink + 1) % 200;
		}
	};
	return g;
}

// --- Enemies -------------------------------------------------------------------

export function makeGrumble() {
	const g = new THREE.Group();
	const rock = mat(0x8a7a6a, { roughness: 0.95, flat: true });
	const body = mesh(new THREE.DodecahedronGeometry(7.4, 1), rock, 0, 7.6, 0);
	body.scale.set(1, 0.9, 0.92);
	const brow = mat(0x5a4a3c, { roughness: 0.9 });
	const eyes = [ eye(-2.6, 9, 5.6, 1.5), eye(2.6, 9, 5.6, 1.5) ];
	const brows = [ -1, 1 ].map((s) => {
		const b = mesh(GEO.box, brow, s * 2.6, 11.2, 6.2);
		b.scale.set(3.2, 1, 0.8);
		b.rotation.z = s * -0.45;
		return b;
	});
	const mouth = mesh(GEO.box, mat(0x1c1c24), 0, 5.4, 6.4);
	mouth.scale.set(5.5, 1.8, 0.8);
	const tongue = mesh(GEO.box, mat(0xd8503c, { roughness: 0.6 }), 0, 4.9, 6.6);
	tongue.scale.set(3.2, 0.8, 0.6);
	const feet = [ -1, 1 ].map((s) => {
		const f = mesh(GEO.sphere, mat(0x1c1c24, { roughness: 0.7 }), s * 3.4, 1.4, 1.2);
		f.scale.set(2.4, 1.4, 3);
		return f;
	});
	g.add(body, ...eyes, ...brows, mouth, tongue, ...feet);
	g.update = (e, t) => {
		if (e.state === "flat") {
			g.scale.set(1.25, 0.35, 1.25);
			return;
		}
		g.scale.set(1, 1, 1);
		const ph = e.anim * 0.35;
		feet[0].position.y = 1.4 + Math.max(0, Math.sin(ph)) * 1.4;
		feet[1].position.y = 1.4 + Math.max(0, -Math.sin(ph)) * 1.4;
		body.position.y = 7.6 + Math.abs(Math.sin(ph)) * 0.5;
		body.rotation.z = Math.sin(ph) * 0.06;
		g.rotation.y = e.dir > 0 ? 0.45 : -0.45;
		if (e.state === "dead") {
			g.rotation.x = Math.PI;
			g.position.y += 14;
		} else {
			g.rotation.x = 0;
		}
	};
	return g;
}

export function makeClanker() {
	const g = new THREE.Group();
	const shellMat = mat(0x2a9ec8, { roughness: 0.35, metalness: 0.1 });
	const ridge = mat(0xa8ecfa, { roughness: 0.3 });
	const yellow = mat(0xf2c14e, { roughness: 0.7 });
	const shell = new THREE.Group();
	const dome = mesh(new THREE.SphereGeometry(7, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), shellMat, 0, 5, 0);
	dome.scale.set(1, 0.95, 1.1);
	const rim = mesh(new THREE.TorusGeometry(7, 1.1, 8, 24), mat(0x145a78, { roughness: 0.5 }), 0, 5, 0);
	rim.rotation.x = Math.PI / 2;
	rim.scale.set(1, 1.1, 1);
	const ridges = [];
	for (let i = 0; i < 3; i++) {
		const r = mesh(new THREE.TorusGeometry(6.6 - i * 2.1, 0.45, 6, 24), ridge, 0, 5 + i * 2.1 + 0.5, 0);
		r.rotation.x = Math.PI / 2;
		ridges.push(r);
	}
	shell.add(dome, rim, ...ridges);
	const head = new THREE.Group();
	head.position.set(5.5, 4.2, 1.5);
	const skull = mesh(GEO.sphere, yellow);
	skull.scale.set(3.2, 3, 3);
	head.add(skull, eye(1.4, 0.8, 2.4, 0.9), eye(1.4, 0.8, -1.2, 0.9));
	const feet = [ -1, 1 ].map((s) => {
		const f = mesh(GEO.sphere, yellow, s * 3, 1.3, 1.5);
		f.scale.set(2.2, 1.3, 2.6);
		return f;
	});
	g.add(shell, head, ...feet);
	g.update = (e, t) => {
		const hiding = e.state !== "walk";
		head.visible = !hiding;
		feet[0].visible = feet[1].visible = !hiding;
		g.rotation.y = e.dir > 0 ? 0 : Math.PI;
		if (e.state === "slide") {
			shell.rotation.z -= e.dir * 0.35;
			shell.position.y = 0;
		} else {
			shell.rotation.z = 0;
			shell.position.y = hiding ? -1 : Math.abs(Math.sin(e.anim * 0.3)) * 0.6;
		}
		if (e.state === "walk") {
			const ph = e.anim * 0.3;
			feet[0].position.y = 1.3 + Math.max(0, Math.sin(ph)) * 1.2;
			feet[1].position.y = 1.3 + Math.max(0, -Math.sin(ph)) * 1.2;
		}
		if (e.state === "shell" && e.t > 300) {
			g.position.x += (Math.floor(e.t / 4) % 2) * 1.5 - 0.75;
		}
		g.rotation.x = e.state === "dead" ? Math.PI : 0;
		if (e.state === "dead") {
			g.position.y += 12;
		}
	};
	return g;
}

export function makeFlitter() {
	const g = new THREE.Group();
	const purple = mat(0x7a4ad8, { roughness: 0.7 });
	const dark = mat(0x4a2a98, { roughness: 0.8 });
	const body = mesh(GEO.sphere, dark, 0, 5, 0);
	body.scale.set(3.6, 3.2, 3.2);
	const ears = [ -1, 1 ].map((s) => {
		const e = mesh(GEO.cone, dark, s * 1.8, 8.4, 0);
		e.scale.set(1.2, 2.4, 1.2);
		return e;
	});
	const eyes = [ eye(-1.3, 5.4, 2.8, 0.8), eye(1.3, 5.4, 2.8, 0.8) ];
	eyes.forEach((ey) => {
		ey.userData.pupil.material = mat(0xff5a5a, { emissive: 0xff5a5a, emissiveIntensity: 0.6 });
	});
	const wingGeo = new THREE.BufferGeometry();
	wingGeo.setAttribute("position", new THREE.Float32BufferAttribute([ 0, 0, 0, 9, 3, 0, 10, -2, 0, 7, -4, 0, 3, -3.5, 0 ], 3));
	wingGeo.setIndex([ 0, 1, 2, 0, 2, 3, 0, 3, 4 ]);
	wingGeo.computeVertexNormals();
	const wingMat = mat(0x7a4ad8, { roughness: 0.8 });
	wingMat.side = THREE.DoubleSide;
	const wings = [ -1, 1 ].map((s) => {
		const w = new THREE.Mesh(wingGeo, wingMat);
		w.position.set(s * 2.4, 5.5, -0.5);
		w.scale.x = s;
		w.castShadow = true;
		return w;
	});
	g.add(body, ...ears, ...eyes, ...wings);
	g.update = (e, t) => {
		const flap = Math.sin(e.anim * 0.55) * 0.9;
		wings[0].rotation.z = flap;
		wings[1].rotation.z = -flap;
		g.rotation.y = e.dir > 0 ? 0.3 : -0.3;
		g.rotation.x = e.state === "dead" ? Math.PI : 0;
		if (e.state === "dead") {
			g.position.y += 10;
		}
	};
	return g;
}

export function makeChompvine() {
	const g = new THREE.Group();
	const red = mat(0xd8503c, { roughness: 0.6 });
	const green = mat(0x2a9d4a, { roughness: 0.8 });
	const stem = mesh(GEO.cyl, green, 0, 6, 0);
	stem.scale.set(2, 14, 2);
	const leaves = [ -1, 1 ].map((s) => {
		const l = mesh(GEO.sphere, green, s * 4, 8, 0);
		l.scale.set(3.6, 1.1, 2);
		return l;
	});
	const head = new THREE.Group();
	head.position.y = 17;
	const upper = mesh(new THREE.SphereGeometry(6.5, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), red, 0, 0, 0);
	const lower = mesh(new THREE.SphereGeometry(6.5, 18, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), red, 0, 0, 0);
	const mouth = mesh(GEO.cyl, mat(0x5a0a1a), 0, 0, 0);
	mouth.scale.set(6.2, 0.6, 6.2);
	const spots = [];
	for (let i = 0; i < 6; i++) {
		const a = i * 1.05;
		const sp = mesh(GEO.sphere, mat(0xfff3dc, { roughness: 0.5 }), Math.cos(a) * 5.2, 2.5 + Math.sin(i * 2.1) * 1.5, Math.sin(a) * 5.2);
		sp.scale.setScalar(1.3);
		spots.push(sp);
	}
	const teeth = [];
	for (let i = 0; i < 8; i++) {
		const a = (i / 8) * Math.PI * 2;
		const tooth = mesh(GEO.cone, mat(0xfff3dc), Math.cos(a) * 5.4, 0.9, Math.sin(a) * 5.4);
		tooth.scale.set(0.9, 1.8, 0.9);
		tooth.rotation.x = Math.PI;
		teeth.push(tooth);
	}
	head.add(upper, lower, mouth, ...spots, ...teeth);
	g.add(stem, ...leaves, head);
	g.update = (e, t) => {
		const open = (Math.sin(e.anim * 0.14) + 1) * 0.5;
		upper.position.y = open * 2.2;
		upper.rotation.z = open * 0.2;
		lower.position.y = -open * 1.4;
		g.rotation.y = Math.sin(t * 0.02) * 0.4;
	};
	return g;
}

export function makeBoss() {
	const g = new THREE.Group();
	const red = mat(0xa8302c, { roughness: 0.7 });
	const dark = mat(0x5c1414, { roughness: 0.8 });
	const gold = mat(0xf2c14e, { metalness: 0.6, roughness: 0.35 });
	const body = mesh(new THREE.DodecahedronGeometry(13, 2), red, 0, 14, 0);
	body.scale.set(1, 0.95, 0.95);
	const belly = mesh(GEO.sphere, dark, 0, 11, 8);
	belly.scale.set(7, 6, 4);
	const horns = [ -1, 1 ].map((s) => {
		const h = mesh(GEO.cone, gold, s * 7, 26, 0);
		h.scale.set(2.2, 7, 2.2);
		h.rotation.z = s * -0.5;
		return h;
	});
	const spikes = [];
	for (let i = 0; i < 5; i++) {
		const a = (i / 5) * Math.PI * 2;
		const sp = mesh(GEO.cone, gold, Math.cos(a) * 6, 25.5, Math.sin(a) * 6);
		sp.scale.set(1.4, 3.5, 1.4);
		sp.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
		spikes.push(sp);
	}
	const eyes = [ eye(-4.5, 17, 11, 2.4), eye(4.5, 17, 11, 2.4) ];
	eyes.forEach((ey) => {
		ey.userData.pupil.material = mat(0xff6a3a, { emissive: 0xff6a3a, emissiveIntensity: 0.7 });
	});
	const brows = [ -1, 1 ].map((s) => {
		const b = mesh(GEO.box, dark, s * 4.6, 20.4, 11.6);
		b.scale.set(5.5, 1.6, 1);
		b.rotation.z = s * -0.5;
		return b;
	});
	const mouth = mesh(GEO.box, mat(0x1c1c24), 0, 9.5, 12);
	mouth.scale.set(12, 3.6, 1);
	const teeth = [];
	for (let i = 0; i < 5; i++) {
		const tooth = mesh(GEO.cone, mat(0xfff3dc), -4.8 + i * 2.4, 9.2, 12.4);
		tooth.scale.set(0.9, 2.2, 0.9);
		teeth.push(tooth);
	}
	const feet = [ -1, 1 ].map((s) => {
		const f = mesh(GEO.sphere, mat(0x1c1c24, { roughness: 0.7 }), s * 6.5, 2.2, 2);
		f.scale.set(4.6, 2.4, 5.6);
		return f;
	});
	g.add(body, belly, ...horns, ...spikes, ...eyes, ...brows, mouth, ...teeth, ...feet);
	g.update = (e, t) => {
		const ph = e.anim * 0.25;
		feet[0].position.y = 2.2 + Math.max(0, Math.sin(ph)) * 2;
		feet[1].position.y = 2.2 + Math.max(0, -Math.sin(ph)) * 2;
		body.position.y = 14 + Math.abs(Math.sin(ph)) * 0.8;
		g.rotation.y = e.dir > 0 ? 0.5 : -0.5;
		const hurt = e.state === "hurt" && Math.floor(e.t / 3) % 2 === 0;
		body.material = hurt ? mat(0xff8a7a, { emissive: 0xff4a3a, emissiveIntensity: 0.6 }) : red;
		g.rotation.x = e.state === "dead" ? Math.PI : 0;
		if (e.state === "dead") {
			g.position.y += 28;
		}
		if (e.state === "jump") {
			body.rotation.z += 0.03 * -e.dir;
		} else {
			body.rotation.z *= 0.8;
		}
	};
	return g;
}

// --- Items ---------------------------------------------------------------------

export const GOLD = mat(0xf2c14e, { metalness: 0.75, roughness: 0.25, emissive: 0xd8901a, emissiveIntensity: 0.25 });

export function makeCoin() {
	const g = new THREE.Group();
	const disc = mesh(GEO.coin, GOLD);
	disc.rotation.x = Math.PI / 2;
	const inner = mesh(new THREE.CylinderGeometry(3.6, 3.6, 1.9, 24), mat(0xffe08a, { metalness: 0.6, roughness: 0.3, emissive: 0xf2c14e, emissiveIntensity: 0.35 }));
	inner.rotation.x = Math.PI / 2;
	g.add(disc, inner);
	g.update = (t, phase = 0) => {
		g.rotation.y = t * 0.08 + phase;
	};
	return g;
}

export function makeBerry() {
	const g = new THREE.Group();
	const fruit = mesh(GEO.sphere, mat(0xe2402a, { roughness: 0.4 }), 0, 6, 0);
	fruit.scale.set(6, 5.6, 6);
	const shine = mesh(GEO.sphere, mat(0xfff3dc, { roughness: 0.3 }), -2.2, 8.4, 3.6);
	shine.scale.set(1.3, 1, 1);
	const stem = mesh(GEO.cyl, mat(0x17602a), 0.5, 11.4, 0);
	stem.scale.set(0.6, 2.4, 0.6);
	const leaf = mesh(GEO.sphere, mat(0x2a9d4a), 2.4, 11.8, 0);
	leaf.scale.set(2.6, 0.7, 1.4);
	leaf.rotation.z = 0.4;
	g.add(fruit, shine, stem, leaf);
	g.update = (t) => {
		g.rotation.y = Math.sin(t * 0.05) * 0.4;
	};
	return g;
}

export function makePlum() {
	const g = new THREE.Group();
	const fruit = mesh(GEO.sphere, mat(0x8a4ad8, { roughness: 0.35, emissive: 0x4a2a98, emissiveIntensity: 0.25 }), 0, 6, 0);
	fruit.scale.set(5.6, 6, 5.6);
	const shine = mesh(GEO.sphere, mat(0xfff3dc, { roughness: 0.3 }), -2, 8.6, 3.4);
	shine.scale.set(1.2, 0.9, 1);
	const stem = mesh(GEO.cyl, mat(0x17602a), 0, 12, 0);
	stem.scale.set(0.5, 2, 0.5);
	const sparks = [];
	for (let i = 0; i < 3; i++) {
		const s = mesh(new THREE.OctahedronGeometry(1.1), mat(0xf2c14e, { emissive: 0xf2c14e, emissiveIntensity: 0.9 }));
		sparks.push(s);
		g.add(s);
	}
	g.add(fruit, shine, stem);
	g.update = (t) => {
		g.rotation.y = t * 0.03;
		sparks.forEach((s, i) => {
			const a = t * 0.08 + i * 2.1;
			s.position.set(Math.cos(a) * 7.5, 6 + Math.sin(a * 1.3) * 3, Math.sin(a) * 7.5);
		});
	};
	return g;
}

export function makeHeart() {
	const g = new THREE.Group();
	const green = mat(0x2a9d4a, { roughness: 0.45, emissive: 0x17602a, emissiveIntensity: 0.3 });
	const l = mesh(GEO.sphere, green, -2.6, 8.4, 0);
	l.scale.set(3.4, 3.2, 2.6);
	const r = mesh(GEO.sphere, green, 2.6, 8.4, 0);
	r.scale.set(3.4, 3.2, 2.6);
	const tip = mesh(GEO.cone, green, 0, 4.2, 0);
	tip.scale.set(5.6, 7, 2.6);
	tip.rotation.x = Math.PI;
	const shine = mesh(GEO.sphere, mat(0xfff3dc, { roughness: 0.3 }), -3.4, 10, 2.1);
	shine.scale.set(1, 0.8, 0.6);
	g.add(l, r, tip, shine);
	g.update = (t) => {
		g.rotation.y = Math.sin(t * 0.06) * 0.6;
		const s = 1 + Math.sin(t * 0.15) * 0.05;
		g.scale.set(s, s, s);
	};
	return g;
}

export function makeSpark() {
	const g = new THREE.Group();
	const core = mesh(new THREE.OctahedronGeometry(3.4, 1), mat(0xfff3dc, { emissive: 0xffd060, emissiveIntensity: 1.2, roughness: 0.2 }));
	core.castShadow = false;
	g.add(core);
	g.update = (t) => {
		core.rotation.x = t * 0.2;
		core.rotation.y = t * 0.3;
	};
	return g;
}

export function makePlatform(w) {
	const g = new THREE.Group();
	const wood = new THREE.MeshStandardMaterial({ map: Textures.wood(), roughness: 0.85 });
	const plank = mesh(new THREE.BoxGeometry(w, 7, 18), wood, w / 2, -3.5, 0);
	plank.receiveShadow = true;
	const steel = mat(0x9a9aa2, { metalness: 0.7, roughness: 0.4 });
	for (const x of [ 4, w - 4 ]) {
		const b = mesh(GEO.box, steel, x, -3.5, 9.4);
		b.scale.set(3, 9, 1);
		g.add(b);
		const b2 = mesh(GEO.box, steel, x, -3.5, -9.4);
		b2.scale.set(3, 9, 1);
		g.add(b2);
	}
	g.add(plank);
	return g;
}

export function makeCottage() {
	const g = new THREE.Group();
	const wall = mat(0xd9b58a, { roughness: 0.9 });
	const walls = mesh(GEO.box, wall, 32, 20, 0);
	walls.scale.set(64, 40, 44);
	walls.receiveShadow = true;
	const roof = mesh(new THREE.ConeGeometry(1, 1, 4), mat(0xa8402c, { roughness: 0.8 }), 32, 52, 0);
	roof.scale.set(54, 26, 40);
	roof.rotation.y = Math.PI / 4;
	const chimney = mesh(GEO.box, mat(0x6e6e78), 50, 60, -4);
	chimney.scale.set(8, 20, 8);
	const door = mesh(GEO.box, mat(0x5a3a1a), 32, 11, 22.4);
	door.scale.set(12, 22, 1.2);
	const knob = mesh(GEO.sphere, mat(0xf2c14e, { metalness: 0.7, roughness: 0.3 }), 35.5, 11, 23.2);
	knob.scale.setScalar(0.8);
	const lit = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffb347, emissiveIntensity: 1.1 });
	for (const wx of [ 14, 52 ]) {
		const win = mesh(GEO.box, lit, wx, 26, 22.4);
		win.scale.set(10, 10, 1.2);
		const frame = mesh(GEO.box, mat(0x5a3a1a), wx, 26, 22.2);
		frame.scale.set(12, 12, 1);
		g.add(frame, win);
	}
	g.add(walls, roof, chimney, door, knob);
	return g;
}

export function makeTree(h, trunkColor, leafColor, leafLight) {
	const g = new THREE.Group();
	const trunk = mesh(GEO.cyl, mat(trunkColor, { roughness: 0.95 }), 0, h * 0.25, 0);
	trunk.scale.set(h * 0.07, h * 0.5, h * 0.07);
	const leaves = mat(leafColor, { roughness: 0.9 });
	const light = mat(leafLight, { roughness: 0.9 });
	for (const [ x, y, z, r, m ] of [ [ 0, h * 0.68, 0, h * 0.3, leaves ], [ -h * 0.2, h * 0.55, h * 0.05, h * 0.22, leaves ], [ h * 0.2, h * 0.56, -h * 0.05, h * 0.22, leaves ], [ -h * 0.05, h * 0.78, h * 0.12, h * 0.16, light ] ]) {
		const s = mesh(GEO.sphereLow, m, x, y, z);
		s.scale.setScalar(r);
		g.add(s);
	}
	g.add(trunk);
	return g;
}

export function makePine(h, color) {
	const g = new THREE.Group();
	const trunk = mesh(GEO.cyl, mat(0x1a1028, { roughness: 0.95 }), 0, h * 0.12, 0);
	trunk.scale.set(h * 0.05, h * 0.25, h * 0.05);
	for (let i = 0; i < 3; i++) {
		const c = mesh(GEO.cone, mat(color, { roughness: 0.95 }), 0, h * (0.35 + i * 0.22), 0);
		c.scale.set(h * (0.32 - i * 0.07), h * 0.3, h * (0.32 - i * 0.07));
		g.add(c);
	}
	g.add(trunk);
	return g;
}

export function makeTorch() {
	const g = new THREE.Group();
	const bracket = mesh(GEO.box, mat(0x4a3a2a, { roughness: 0.9 }), 0, -6, 0);
	bracket.scale.set(3, 12, 3);
	const cup = mesh(new THREE.CylinderGeometry(3, 2, 4, 10), mat(0x6a5a4a, { metalness: 0.5, roughness: 0.6 }), 0, 1, 0);
	const flame = mesh(GEO.cone, new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff8a2a, emissiveIntensity: 1.6 }), 0, 6, 0);
	flame.scale.set(2.2, 7, 2.2);
	flame.castShadow = false;
	g.add(bracket, cup, flame);
	g.userData.flame = flame;
	return g;
}

export function makeCrystal(color) {
	const g = new THREE.Group();
	const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45, roughness: 0.2, transparent: true, opacity: 0.92 });
	for (const [ x, h, tilt ] of [ [ 0, 14, 0 ], [ -4, 9, 0.4 ], [ 4.5, 10, -0.35 ] ]) {
		const c = mesh(new THREE.ConeGeometry(2.4, h, 6), m, x, h / 2, 0);
		c.rotation.z = tilt;
		c.castShadow = false;
		g.add(c);
	}
	return g;
}
