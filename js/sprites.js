// All art is generated here: palette strings rendered to offscreen canvases.
const cache = new Map();

const FOX = {
	".": null,
	"O": "#e8762c",
	"D": "#9c3f14",
	"W": "#fff3dc",
	"K": "#1c1c24",
	"B": "#2f6fdc",
	"P": "#ffb0a0",
};
const FOX_SPARK = { ...FOX, "O": "#f2c14e", "D": "#a86a12", "B": "#e2402a" };

const SMALL_HEAD = [
	"...D.........D..",
	"..DOD.......DOD.",
	"..DOPD.....DPOD.",
	"..DOOODDDDDOOOD.",
	"..DOOOOOOOOOOOD.",
	"..DOOOWKOOOWKOD.",
	"..DOOOWKOOOWKOD.",
	"...DOOOOWWWOOD..",
	"...DOOOWWWKWOD..",
];

const SMALL_IDLE = [
	...SMALL_HEAD,
	"....DBBBBBBBD...",
	"....DOOWWWOOD...",
	"....DOOWWWOOD...",
	"....DOOOOOOOD...",
	".....DOOOOOD....",
	".....KK..KK.....",
	"....KKK..KKK....",
];
const SMALL_WALK1 = [
	...SMALL_HEAD,
	"....DBBBBBBBD...",
	"....DOOWWWOOD...",
	"....DOOWWWOOD...",
	"....DOOOOOOOD...",
	".....DOOOOOD....",
	"....KK....KK....",
	"...KKK....KKK...",
];
const SMALL_WALK2 = [
	...SMALL_HEAD,
	"....DBBBBBBBD...",
	"....DOOWWWOOD...",
	"....DOOWWWOOD...",
	"....DOOOOOOOD...",
	".....DOOOOOD....",
	".......KKKK.....",
	"......KKKKKK....",
];
const SMALL_JUMP = [
	...SMALL_HEAD,
	"..DODBBBBBBBDOD.",
	"..DOODOWWWODOOD.",
	"...DDDOWWWODDD..",
	"....DOOOOOOOD...",
	".....DOOOOOD....",
	"....KKK..KKK....",
	"....KK....KK....",
];
const SMALL_DEAD = [
	"................",
	"....DOOOOOOOD...",
	"....DOOOOOOOD...",
	"...DOOKWOOWKOOD.",
	"...DOOWKOOKWOOD.",
	"...DOOOOOOOOOOD.",
	"..DOOOODDDDOOOOD",
	"..DOOOOOOOOOOOOD",
	"...DOOOOOOOOOOD.",
	"....DBBBBBBBBD..",
	".....DOWWWWOD...",
	"......DOOOOD....",
	"......DOOOOD....",
	".....DD....DD...",
	"....KKK....KKK..",
	"................",
];

const BIG_TOP = [
	"...D.........D..",
	"..DOD.......DOD.",
	"..DOPD.....DPOD.",
	"..DOOODDDDDOOOD.",
	"..DOOOOOOOOOOOD.",
	"..DOOOOOOOOOOOD.",
	"..DOOOWKOOOWKOD.",
	"..DOOOWKOOOWKOD.",
	"...DOOOOWWWOOD..",
	"...DOOOWWWKWOD..",
	"....DOOOOOOOD...",
	"....DBBBBBBBD...",
	"...DOBBBBBBBOD..",
	"..DOODOWWWODOOD.",
	"..DOODOWWWODOOD.",
	"..DOODOWWWODOOD.",
	"..DOODOWWWODOOD.",
	"..DOODOOOOODOOD.",
	"...DDDOOOOODDD..",
	".....DOOOOOD....",
	".....DOOOOOD....",
	".....DOOOOOD....",
	".....DOOOOOD....",
	".....DOOOOOD....",
];
const BIG_LEGS_IDLE = [
	".....DOO.OOD....",
	".....DOO.OOD....",
	".....DOO.OOD....",
	".....DOO.OOD....",
	".....DOO.OOD....",
	".....KKK.KKK....",
	"....KKKK.KKKK...",
	"....KKKK.KKKK...",
];
const BIG_LEGS_WALK1 = [
	".....DOO.OOD....",
	"....DOO...OOD...",
	"....DOO...OOD...",
	"...DOO.....OOD..",
	"...DOO.....OOD..",
	"...KKK.....KKK..",
	"..KKKK.....KKKK.",
	"..KKKK.....KKKK.",
];
const BIG_LEGS_WALK2 = [
	".....DOOOOOD....",
	".....DOOOOOD....",
	"......DOOOD.....",
	"......DOOOD.....",
	"......DOOOD.....",
	".......KKKK.....",
	"......KKKKKK....",
	"......KKKKKK....",
];
const BIG_LEGS_JUMP = [
	".....DOO.OOD....",
	"....DOO...OOD...",
	"...DOO.....OOD..",
	"...KKK.....KKK..",
	"..KKKK.....KKKK.",
	"..KKK.......KKK.",
	"................",
	"................",
];
const BIG_JUMP_TOP = BIG_TOP.map((row, i) => {
	if (i === 11) {
		return "..DODBBBBBBBDOD.";
	}
	if (i === 12) {
		return "..DOODBBBBBDOOD.";
	}
	if (i >= 13 && i <= 17) {
		return "...DDDOWWWODDD..".replace("WWW", i === 17 ? "OOO" : "WWW");
	}
	if (i === 18) {
		return "......OOOOO.....";
	}
	return row;
});

const GRUMBLE_PAL = { ".": null, "G": "#8a7a6a", "H": "#b8a890", "K": "#1c1c24", "W": "#fff3dc", "R": "#d8503c" };
const GRUMBLE = [
	"................",
	"....GGGGGGGG....",
	"...GHHGGGGHHGG..",
	"..GHGGGGGGGGHGG.",
	"..GGWWGGGGWWGGG.",
	"..GWWKGGGGKWWGG.",
	"..GGWWGGGGWWGGG.",
	"..GGGGGGGGGGGGG.",
	"..GGGKKKKKKKGGG.",
	"..GGGKRRRRRKGGG.",
	"..GGGGKKKKKGGGG.",
	"...GGGGGGGGGGG..",
	"....GGGGGGGGG...",
	"...KKK....KKK...",
	"..KKKK....KKKK..",
	"................",
];
const GRUMBLE2 = GRUMBLE.map((r, i) => (i === 13 ? "....KKK..KKK...." : i === 14 ? "...KKKK..KKKK..." : r));

const CLANKER_PAL = { ".": null, "S": "#2a9ec8", "L": "#a8ecfa", "Y": "#f2c14e", "K": "#1c1c24", "W": "#fff3dc", "E": "#145a78" };
const CLANKER = [
	"................",
	"......SSSSS.....",
	"....SSSLLLSSS...",
	"...SSLLSSSLLSS..",
	"...SLLSSSSSLLS..",
	"..SSLSSSSSSSLSS.",
	"..SLLSSSSSSSLLS.",
	"..SSLSSSSSSSLSS.",
	"...SLLSSSSSLLS..",
	"...SSLLSSSLLSS..",
	"....SSSLLLSSS...",
	".....EEEEEEE....",
	"....YYYYYYYYY...",
	"...YWKY...YKWY..",
	"...YYYY...YYYY..",
	"....KK.....KK...",
];
const CLANKER2 = CLANKER.map((r, i) => (i === 15 ? "...KK.......KK.." : r));
const SHELL = [
	"................",
	"................",
	"................",
	"......SSSSS.....",
	"....SSSLLLSSS...",
	"...SSLLSSSLLSS..",
	"...SLLSSSSSLLS..",
	"..SSLSSSSSSSLSS.",
	"..SLLSSSSSSSLLS.",
	"..SSLSSSSSSSLSS.",
	"...SLLSSSSSLLS..",
	"...SSLLSSSLLSS..",
	"....SSSLLLSSS...",
	".....EEEEEEE....",
	"....EEEEEEEEE...",
	"................",
];

const FLITTER_PAL = { ".": null, "P": "#7a4ad8", "Q": "#4a2a98", "W": "#fff3dc", "K": "#1c1c24", "R": "#ff5a5a" };
const FLITTER1 = [
	"................",
	"................",
	"..P..........P..",
	"..PP........PP..",
	"..PPP..QQ..PPP..",
	"..PPPPQQQQPPPP..",
	"...PPPQRQRQPPP..",
	"....PPQQQQQPP...",
	".....PQKKQP.....",
	"......Q..Q......",
	"................",
	"................",
	"................",
	"................",
	"................",
	"................",
];
const FLITTER2 = [
	"................",
	"................",
	"................",
	"................",
	".......QQ.......",
	"......QQQQ......",
	"..PPPPQRQRQPPPP.",
	"..PPPPQQQQQPPPP.",
	"...PPPPQKKQPPP..",
	"....PP.Q..Q.PP..",
	"....P........P..",
	"................",
	"................",
	"................",
	"................",
	"................",
];

const VINE_PAL = { ".": null, "G": "#2a9d4a", "E": "#17602a", "R": "#d8503c", "M": "#8a1a3a", "W": "#fff3dc", "K": "#1c1c24" };
// 16 x 24
const CHOMPVINE = [
	"....RRRRRRRR....",
	"...RRWRRRRWRR...",
	"..RRRRRRRRRRRR..",
	"..RMMMMMMMMMMR..",
	"..RMWMWMWMWMMR..",
	"..RMMMMMMMMMMR..",
	"..RRMWMWMWMWRR..",
	"...RRRRRRRRRR...",
	"....RRRRRRRR....",
	"......GGGG......",
	"....EGGGGGGE....",
	"...EGG.GG.GGE...",
	"......GGGG......",
	"......GGGG......",
	"....EGGGGGGE....",
	"...EGG.GG.GGE...",
	"......GGGG......",
	"......GGGG......",
	"......GGGG......",
	"......GGGG......",
	"......GGGG......",
	"......GGGG......",
	"......GGGG......",
	"......GGGG......",
];
const CHOMPVINE2 = CHOMPVINE.map((r, i) => {
	if (i === 3) {
		return "..RRRRRRRRRRRR..";
	}
	if (i === 4) {
		return "..RMWMWMWMWMMR..";
	}
	if (i === 5) {
		return "..RMWMWMWMWMMR..";
	}
	if (i === 6) {
		return "..RRRRRRRRRRRR..";
	}
	return r;
});

const BOSS_PAL = { ".": null, "R": "#a8302c", "D": "#5c1414", "Y": "#f2c14e", "K": "#1c1c24", "W": "#fff3dc", "E": "#ff6a3a" };
// 16 x 16, drawn at 2x
const BOSS = [
	"..Y....YY....Y..",
	"..YY..YRRY..YY..",
	"..DYYDRRRRDYYD..",
	".DRRRRRRRRRRRRD.",
	".DRRRRRRRRRRRRD.",
	"DRRWWERRRREWWRRD",
	"DRRWKERRRREKWRRD",
	"DRRRRRRRRRRRRRRD",
	"DRRRDKKKKKKDRRRD",
	"DRRRDKWKWKWDRRRD",
	".DRRRDDDDDDRRRD.",
	".DRRRRRRRRRRRRD.",
	"..DRRRRRRRRRRD..",
	"..KKK.KKKK.KKK..",
	".KKKK.KKKK.KKKK.",
	"................",
];
const BOSS2 = BOSS.map((r, i) => (i === 13 ? ".KKK..KKKK..KKK." : i === 14 ? "KKKK..KKKK..KKKK" : r));

const ITEM_PAL = { ".": null, "Y": "#f2c14e", "y": "#c48a1a", "W": "#fff3dc", "R": "#e2402a", "r": "#9a1e14", "G": "#2a9d4a", "E": "#17602a", "P": "#8a4ad8", "p": "#4a2a98", "K": "#1c1c24" };
const COIN = [
	[
		"................",
		".....YYYYYY.....",
		"....YyyyyyyY....",
		"...YyYYYYYYyY...",
		"...YyYWWYYYyY...",
		"...YyYWYYYYyY...",
		"...YyYWYYYYyY...",
		"...YyYWYYYYyY...",
		"...YyYWYYYYyY...",
		"...YyYWYYYYyY...",
		"...YyYWWYYYyY...",
		"...YyYYYYYYyY...",
		"....YyyyyyyY....",
		".....YYYYYY.....",
		"................",
		"................",
	],
	[
		"................",
		"......YYYY......",
		".....YyyyyY.....",
		".....YyYYyY.....",
		".....YyWYyY.....",
		".....YyWYyY.....",
		".....YyWYyY.....",
		".....YyWYyY.....",
		".....YyWYyY.....",
		".....YyWYyY.....",
		".....YyWYyY.....",
		".....YyYYyY.....",
		".....YyyyyY.....",
		"......YYYY......",
		"................",
		"................",
	],
	[
		"................",
		".......YY.......",
		".......yy.......",
		".......yy.......",
		".......yy.......",
		".......yy.......",
		".......yy.......",
		".......yy.......",
		".......yy.......",
		".......yy.......",
		".......yy.......",
		".......yy.......",
		".......yy.......",
		".......YY.......",
		"................",
		"................",
	],
];
const BERRY = [
	"................",
	".......GE.......",
	"......GGE.......",
	".....GGEE.......",
	"....RRRRRRRR....",
	"...RRWWRRRRRR...",
	"..RRWWRRRRRRRR..",
	"..RRWRRRRRRRRR..",
	"..RRRRRRRRRRRR..",
	"..RRRRRRRRRRrr..",
	"..RRRRRRRRRrrr..",
	"...RRRRRRRrrr...",
	"....rrrrrrrr....",
	"................",
	"................",
	"................",
];
const PLUM = [
	"................",
	"......GE........",
	".......E........",
	"....PPPPPPPP....",
	"...PPWWPPPPPP...",
	"..PPWWPPPPPPPP..",
	"..PPWPPPPPPPPP..",
	"..PPPPPPPPPPPP..",
	"..PPPPPPPPPPpp..",
	"..PPPPPPPPPppp..",
	"...PPPPPPPppp...",
	"....pppppppp....",
	"................",
	"....Y......Y....",
	"...YYY....YYY...",
	"....Y......Y....",
];
const HEART = [
	"................",
	"................",
	"...GGG....GGG...",
	"..GGGGG..GGGGG..",
	".GGWGGGGGGGGGGG.",
	".GGWGGGGGGGGGGG.",
	".GGGGGGGGGGGGGG.",
	".GGGGGGGGGGGGGG.",
	"..GGGGGGGGGGGG..",
	"...GGGGGGGGGG...",
	"....GGGGGGGG....",
	".....GGGGGG.....",
	"......GGGG......",
	".......GG.......",
	"................",
	"................",
];
const SPARK1 = [
	"...YY...",
	"..YWWY..",
	".YWWWWY.",
	"YWWYYWWY",
	"YWWYYWWY",
	".YWWWWY.",
	"..YWWY..",
	"...YY...",
];
const SPARK2 = [
	"Y..YY..Y",
	".YYWWYY.",
	".YWWWWY.",
	"YWWWWWWY",
	"YWWWWWWY",
	".YWWWWY.",
	".YYWWYY.",
	"Y..YY..Y",
];

function render(rows, pal, scale = 1) {
	const h = rows.length;
	const w = rows[0].length;
	const c = document.createElement("canvas");
	c.width = w * scale;
	c.height = h * scale;
	const ctx = c.getContext("2d");
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const col = pal[rows[y][x]];
			if (col) {
				ctx.fillStyle = col;
				ctx.fillRect(x * scale, y * scale, scale, scale);
			}
		}
	}
	return c;
}

function flip(c) {
	const f = document.createElement("canvas");
	f.width = c.width;
	f.height = c.height;
	const ctx = f.getContext("2d");
	ctx.translate(c.width, 0);
	ctx.scale(-1, 1);
	ctx.drawImage(c, 0, 0);
	return f;
}

function sprite(key, rows, pal, scale = 1) {
	if (!cache.has(key)) {
		const img = render(rows, pal, scale);
		cache.set(key, { r: img, l: flip(img) });
	}
	return cache.get(key);
}

// Public lookups. Each returns { r, l } (facing right / facing left).
export const Sprites = {
	fox(power, pose, frame) {
		const pal = power === 2 ? FOX_SPARK : FOX;
		const tag = power === 2 ? "s" : "n";
		if (power === 0) {
			let rows = SMALL_IDLE;
			if (pose === "dead") {
				rows = SMALL_DEAD;
			} else if (pose === "jump" || pose === "pole") {
				rows = SMALL_JUMP;
			} else if (pose === "walk" || pose === "skid") {
				rows = [ SMALL_IDLE, SMALL_WALK1, SMALL_WALK2 ][frame % 3];
			}
			return sprite(`fox-s-${tag}-${pose}-${frame % 3}`, rows, pal);
		}
		let rows;
		if (pose === "jump" || pose === "pole" || pose === "throw") {
			rows = [ ...BIG_JUMP_TOP, ...BIG_LEGS_JUMP ];
		} else if (pose === "walk" || pose === "skid") {
			rows = [ ...BIG_TOP, ...[ BIG_LEGS_IDLE, BIG_LEGS_WALK1, BIG_LEGS_WALK2 ][frame % 3] ];
		} else {
			rows = [ ...BIG_TOP, ...BIG_LEGS_IDLE ];
		}
		return sprite(`fox-b-${tag}-${pose}-${frame % 3}`, rows, pal);
	},
	grumble(frame) {
		return sprite(`grumble${frame % 2}`, frame % 2 ? GRUMBLE2 : GRUMBLE, GRUMBLE_PAL);
	},
	clanker(frame) {
		return sprite(`clanker${frame % 2}`, frame % 2 ? CLANKER2 : CLANKER, CLANKER_PAL);
	},
	shell() {
		return sprite("shell", SHELL, CLANKER_PAL);
	},
	flitter(frame) {
		return sprite(`flitter${frame % 2}`, frame % 2 ? FLITTER2 : FLITTER1, FLITTER_PAL);
	},
	chompvine(frame) {
		return sprite(`vine${frame % 2}`, frame % 2 ? CHOMPVINE2 : CHOMPVINE, VINE_PAL);
	},
	boss(frame) {
		return sprite(`boss${frame % 2}`, frame % 2 ? BOSS2 : BOSS, BOSS_PAL, 2);
	},
	coin(frame) {
		const seq = [ 0, 1, 2, 1 ];
		return sprite(`coin${seq[frame % 4]}`, COIN[seq[frame % 4]], ITEM_PAL);
	},
	berry() {
		return sprite("berry", BERRY, ITEM_PAL);
	},
	plum() {
		return sprite("plum", PLUM, ITEM_PAL);
	},
	heart() {
		return sprite("heart", HEART, ITEM_PAL);
	},
	spark(frame) {
		return sprite(`spark${frame % 2}`, frame % 2 ? SPARK2 : SPARK1, ITEM_PAL);
	},
};

// Procedural tiles ---------------------------------------------------------

export const THEMES = {
	overworld: {
		sky: "#5c94fc",
		skyBottom: "#5c94fc",
		ground: [ "#c8743c", "#e49a62", "#7a3a14" ],
		grass: "#3cb84c",
		hills: [ "#2a9048", "#4ec05a" ],
		cloud: "#ffffff",
		text: "#ffffff",
	},
	dusk: {
		sky: "#4a2a7a",
		skyBottom: "#f08a5a",
		ground: [ "#9c5a40", "#c88060", "#5a2a18" ],
		grass: "#2e8a4a",
		hills: [ "#2a1848", "#43286a" ],
		cloud: "#ffd0b0",
		text: "#ffffff",
		stars: true,
	},
	underground: {
		sky: "#000000",
		skyBottom: "#000000",
		ground: [ "#3a6ab8", "#5a8ad8", "#1a3a78" ],
		grass: null,
		hills: [ "#0c1428", "#142040" ],
		cloud: null,
		text: "#ffffff",
	},
	castle: {
		sky: "#0a0810",
		skyBottom: "#0a0810",
		ground: [ "#7a7a84", "#a0a0a8", "#404048" ],
		grass: null,
		hills: [ "#1a1420", "#2a2030" ],
		cloud: null,
		text: "#ffffff",
	},
};

function tileCanvas(key, draw) {
	if (!cache.has(key)) {
		const c = document.createElement("canvas");
		c.width = 16;
		c.height = 16;
		const ctx = c.getContext("2d");
		draw(ctx);
		cache.set(key, c);
	}
	return cache.get(key);
}

function px(ctx, x, y, w, h, col) {
	ctx.fillStyle = col;
	ctx.fillRect(x, y, w, h);
}

export function tileImage(id, theme, frame = 0, top = false) {
	const th = THEMES[theme] || THEMES.overworld;
	switch (id) {
		case 1: // ground
			return tileCanvas(`ground-${theme}-${top ? "top" : "mid"}`, (ctx) => {
				const [ base, light, dark ] = th.ground;
				px(ctx, 0, 0, 16, 16, base);
				// cobble pattern
				px(ctx, 0, 0, 7, 7, light);
				px(ctx, 8, 8, 7, 7, light);
				px(ctx, 1, 1, 5, 5, base);
				px(ctx, 9, 9, 5, 5, base);
				px(ctx, 7, 0, 1, 16, dark);
				px(ctx, 0, 7, 16, 1, dark);
				px(ctx, 15, 0, 1, 16, dark);
				px(ctx, 0, 15, 16, 1, dark);
				if (th.grass && top) {
					px(ctx, 0, 0, 16, 3, th.grass);
					px(ctx, 2, 3, 2, 1, th.grass);
					px(ctx, 7, 3, 3, 1, th.grass);
					px(ctx, 13, 3, 2, 1, th.grass);
				}
			});
		case 2: // brick
			return tileCanvas(`brick-${theme}`, (ctx) => {
				const [ base, , dark ] = th.ground;
				px(ctx, 0, 0, 16, 16, dark);
				px(ctx, 0, 0, 7, 3, base);
				px(ctx, 8, 0, 8, 3, base);
				px(ctx, 0, 4, 3, 3, base);
				px(ctx, 4, 4, 11, 3, base);
				px(ctx, 0, 8, 7, 3, base);
				px(ctx, 8, 8, 8, 3, base);
				px(ctx, 0, 12, 3, 3, base);
				px(ctx, 4, 12, 11, 3, base);
			});
		case 3: // question
		case 4:
		case 20:
			return tileCanvas(`q-${frame % 3}`, (ctx) => {
				const glow = [ "#f2c14e", "#f8d878", "#e0a830" ][frame % 3];
				px(ctx, 0, 0, 16, 16, "#a86a12");
				px(ctx, 1, 1, 14, 14, glow);
				px(ctx, 1, 1, 1, 1, "#a86a12");
				px(ctx, 14, 1, 1, 1, "#a86a12");
				px(ctx, 1, 14, 1, 1, "#a86a12");
				px(ctx, 14, 14, 1, 1, "#a86a12");
				const k = "#5c3a08";
				px(ctx, 5, 3, 6, 2, k);
				px(ctx, 4, 4, 2, 3, k);
				px(ctx, 10, 4, 2, 3, k);
				px(ctx, 8, 7, 3, 2, k);
				px(ctx, 7, 8, 2, 3, k);
				px(ctx, 7, 12, 2, 2, k);
			});
		case 5: // used
			return tileCanvas("used", (ctx) => {
				px(ctx, 0, 0, 16, 16, "#5c3a08");
				px(ctx, 1, 1, 14, 14, "#9c6a2a");
				px(ctx, 3, 3, 10, 10, "#8a5a1e");
			});
		case 6: // hard block
			return tileCanvas(`hard-${theme}`, (ctx) => {
				const [ base, light, dark ] = th.ground;
				px(ctx, 0, 0, 16, 16, dark);
				px(ctx, 0, 0, 15, 15, light);
				px(ctx, 2, 2, 13, 13, base);
				px(ctx, 2, 2, 11, 11, base);
				px(ctx, 13, 2, 2, 13, dark);
				px(ctx, 2, 13, 13, 2, dark);
			});
		case 8:
		case 9:
		case 10:
		case 11:
			return tileCanvas(`pipe-${id}`, (ctx) => {
				const g = "#3cb84c";
				const l = "#9ce890";
				const d = "#17602a";
				const top = id === 8 || id === 9;
				const left = id === 8 || id === 10;
				px(ctx, 0, 0, 16, 16, g);
				if (top) {
					px(ctx, 0, 0, 16, 2, d);
					px(ctx, 0, 14, 16, 2, d);
					if (left) {
						px(ctx, 0, 0, 2, 16, d);
						px(ctx, 3, 2, 3, 12, l);
					} else {
						px(ctx, 14, 0, 2, 16, d);
						px(ctx, 11, 2, 2, 12, d);
					}
				} else if (left) {
					px(ctx, 1, 0, 2, 16, d);
					px(ctx, 5, 0, 3, 16, l);
				} else {
					px(ctx, 13, 0, 2, 16, d);
					px(ctx, 10, 0, 2, 16, d);
				}
			});
		case 13: // lava
			return tileCanvas(`lava-${frame % 4}`, (ctx) => {
				px(ctx, 0, 0, 16, 16, "#e2402a");
				px(ctx, 0, 0, 16, 3, "#ffb030");
				const f = frame % 4;
				px(ctx, (f * 4) % 16, 4, 4, 2, "#ffb030");
				px(ctx, (f * 4 + 9) % 16, 9, 3, 2, "#ff8030");
				px(ctx, (f * 5 + 3) % 16, 13, 4, 1, "#ff8030");
			});
		case 14: // castle stone
			return tileCanvas("castle", (ctx) => {
				px(ctx, 0, 0, 16, 16, "#404048");
				px(ctx, 0, 0, 7, 7, "#8a8a94");
				px(ctx, 8, 0, 8, 7, "#7a7a84");
				px(ctx, 0, 8, 3, 7, "#7a7a84");
				px(ctx, 4, 8, 11, 7, "#8a8a94");
				px(ctx, 1, 1, 2, 1, "#a0a0a8");
				px(ctx, 9, 1, 2, 1, "#a0a0a8");
			});
		case 15: // pole
			return tileCanvas("pole", (ctx) => {
				px(ctx, 7, 0, 2, 16, "#b8c8c8");
				px(ctx, 7, 0, 1, 16, "#e8f0f0");
			});
		case 16: // pole top
			return tileCanvas("poletop", (ctx) => {
				px(ctx, 7, 8, 2, 8, "#b8c8c8");
				px(ctx, 5, 2, 6, 6, "#3cb84c");
				px(ctx, 6, 1, 4, 1, "#3cb84c");
				px(ctx, 6, 8, 4, 1, "#3cb84c");
				px(ctx, 6, 3, 2, 2, "#9ce890");
			});
		case 17: // gate (closed)
			return tileCanvas("gate", (ctx) => {
				px(ctx, 0, 0, 16, 16, "#2a1a10");
				px(ctx, 1, 0, 14, 16, "#5a3a1a");
				px(ctx, 7, 0, 2, 16, "#2a1a10");
				px(ctx, 1, 4, 14, 1, "#2a1a10");
				px(ctx, 1, 11, 14, 1, "#2a1a10");
				px(ctx, 3, 7, 2, 2, "#c8a040");
				px(ctx, 11, 7, 2, 2, "#c8a040");
			});
		case 18: // gate open
			return tileCanvas("gateopen", (ctx) => {
				px(ctx, 0, 0, 16, 16, "#000000");
				px(ctx, 0, 0, 2, 16, "#2a1a10");
				px(ctx, 14, 0, 2, 16, "#2a1a10");
			});
		case 19: // bridge
			return tileCanvas("bridge", (ctx) => {
				px(ctx, 0, 0, 16, 6, "#8a5a2a");
				px(ctx, 0, 2, 16, 1, "#5c3a08");
				px(ctx, 4, 0, 1, 6, "#5c3a08");
				px(ctx, 11, 0, 1, 6, "#5c3a08");
			});
		default:
			return null;
	}
}

// A tiny 3x5 pixel font for the HUD and menus.
const FONT = {
	"A": "010101111101101", "B": "110101110101110", "C": "011100100100011", "D": "110101101101110",
	"E": "111100110100111", "F": "111100110100100", "G": "011100101101011", "H": "101101111101101",
	"I": "111010010010111", "J": "001001001101010", "K": "101101110101101", "L": "100100100100111",
	"M": "101111111101101", "N": "110101101101101", "O": "010101101101010", "P": "110101110100100",
	"Q": "010101101111011", "R": "110101110101101", "S": "011100010001110", "T": "111010010010010",
	"U": "101101101101111", "V": "101101101101010", "W": "101101111111101", "X": "101101010101101",
	"Y": "101101010010010", "Z": "111001010100111",
	"0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111",
	"4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001001001001",
	"8": "111101111101111", "9": "111101111001111",
	" ": "000000000000000", ".": "000000000000010", ":": "000010000010000", "-": "000000111000000",
	"!": "010010010000010", "?": "111001011000010", "/": "001001010100100", "x": "000101010101000",
	"'": "010010000000000", ",": "000000000010100", "(": "010100100100010", ")": "010001001001010",
	"+": "000010111010000", "=": "000111000111000", "<": "001010100010001", ">": "100010001010100",
};

const fontCache = new Map();

export function glyph(ch, color) {
	const key = ch + color;
	if (!fontCache.has(key)) {
		const bits = FONT[ch.toUpperCase()] || FONT["?"];
		const c = document.createElement("canvas");
		c.width = 3;
		c.height = 5;
		const ctx = c.getContext("2d");
		ctx.fillStyle = color;
		for (let i = 0; i < 15; i++) {
			if (bits[i] === "1") {
				ctx.fillRect(i % 3, Math.floor(i / 3), 1, 1);
			}
		}
		fontCache.set(key, c);
	}
	return fontCache.get(key);
}

export function textWidth(str, scale = 1) {
	return str.length * 4 * scale - scale;
}

// Draw a string with the pixel font. Returns the width drawn.
export function drawText(ctx, str, x, y, color = "#ffffff", scale = 1, shadow = "#1c1c24") {
	x = Math.round(x);
	y = Math.round(y);
	for (let i = 0; i < str.length; i++) {
		const ch = str[i];
		if (ch !== " ") {
			const g = glyph(ch, color);
			if (shadow) {
				const gs = glyph(ch, shadow);
				ctx.drawImage(gs, x + i * 4 * scale + scale, y + scale, 3 * scale, 5 * scale);
			}
			ctx.drawImage(g, x + i * 4 * scale, y, 3 * scale, 5 * scale);
		}
	}
	return textWidth(str, scale);
}
