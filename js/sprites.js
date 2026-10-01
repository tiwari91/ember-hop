// All art is generated here: palette strings rendered to offscreen canvases,
// procedural tiles, a 5x7 pixel font and a few cached effect textures.
const cache = new Map();

// Ember, the heroine --------------------------------------------------------
// Warm skin, dark hair in a ponytail, saffron kurta, teal dupatta, navy leggings.

const HERO = {
	".": null,
	"H": "#2a1a1e", // hair
	"S": "#c98a5a", // skin
	"s": "#9a6240", // skin shadow
	"O": "#e8762c", // kurta
	"o": "#f29a4c", // kurta highlight
	"B": "#19b3a6", // dupatta
	"b": "#5fe0d0", // dupatta highlight
	"L": "#2a3a6a", // leggings
	"K": "#1c1c24", // shoes, pupils
	"W": "#fff3dc", // eyes
	"R": "#d8203c", // bindi, lips
	"Y": "#f2c14e", // earring
};
const HERO_SPARK = { ...HERO, "O": "#f2c14e", "o": "#ffe08a", "B": "#e2402a", "b": "#ff7a5a" };

const SMALL_HEAD = [
	"....HHHHHHH.....",
	"...HHHHHHHHH....",
	"..HHHHHHHHHHH...",
	".HHHSSSRSSSHH...",
	".HHSSWKSSWKSH...",
	".HHSSSSSSSSSH...",
	"..HHSSSRRSSSH...",
	"..H.HSSSSSSH....",
];
const SMALL_HEAD_BLINK = SMALL_HEAD.map((r, i) => (i === 4 ? ".HHSSSKSSSKSH..." : r));
const SMALL_HEAD_DEAD = SMALL_HEAD.map((r, i) => (i === 4 ? ".HHSSKKSSKKSH..." : i === 6 ? "..HHSSSKKSSSH..." : r));

const SMALL_BODY = [
	"....BBbBBBBB....",
	"...SOOOBBOOOS...",
	"...SOOOOBBOOS...",
	"....OOOOOBBO....",
	"....OOOOOOOO....",
];
const LEGS_IDLE = [ ".....LL..LL.....", ".....LL..LL.....", "....KKK..KKK...." ];
const LEGS_W1 = [ ".....LL..LL.....", "....LL....LL....", "...KKK....KKK..." ];
const LEGS_W2 = [ "......LLLL......", "......LLLL......", ".....KKKKKK....." ];
const LEGS_W3 = [ "....LL....LL....", "...LL......LL...", "..KKK......KKK.." ];
const LEGS_W4 = [ ".....LLLL.......", "......LLL.......", ".....KKKK......." ];
const LEGS_SKID = [ "....LLL..LL.....", "...LLL...LL.....", "..KKKK..KKK....." ];

const SMALL_IDLE = [ ...SMALL_HEAD, ...SMALL_BODY, ...LEGS_IDLE ];
const SMALL_BLINK = [ ...SMALL_HEAD_BLINK, ...SMALL_BODY, ...LEGS_IDLE ];
const SMALL_WALK = [ LEGS_W1, LEGS_W2, LEGS_W3, LEGS_W4 ].map((legs) => [ ...SMALL_HEAD, ...SMALL_BODY, ...legs ]);
const SMALL_SKID = [ ...SMALL_HEAD, "....BBbBBBBB....", "...SOOOBBOOOS...", "..SOOOOOBBOOS...", "...OOOOOOBBO....", "...OOOOOOOOO....", ...LEGS_SKID ];
const SMALL_JUMP = [
	...SMALL_HEAD,
	"...SBBbBBBBBS...",
	"...SOOOBBOOOS...",
	"....OOOOBBOO....",
	"....OOOOOBBO....",
	"....OOOOOOOO....",
	".....LL..LL.....",
	"....KKK..KKK....",
	"................",
];
const SMALL_FALL = [
	...SMALL_HEAD,
	"....BBbBBBBB....",
	"..SSOOOBBOOOSS..",
	"....OOOOBBOO....",
	"....OOOOOBBO....",
	"....OOOOOOOO....",
	"....LL....LL....",
	"...KKK....KKK...",
	"................",
];
const SMALL_DEAD = [
	...SMALL_HEAD_DEAD,
	"...SBBbBBBBBS...",
	"...SOOOBBOOOS...",
	"....OOOOBBOO....",
	"....OOOOOBBO....",
	"....OOOOOOOO....",
	"....LL....LL....",
	"...KKK....KKK...",
	"................",
];

const BIG_TOP = [
	"....HHHHHHHH....",
	"...HHHHHHHHHH...",
	"..HHHHHHHHHHHH..",
	".HHHHHHHHHHHHH..",
	".HHHSSSSRSSSHH..",
	".HHSSSSSSSSSSH..",
	".HHSSWWKSSWWKSH.",
	".HHSSWWKSSWWKSH.",
	"..HHSSSSSSSSSH..",
	"..H.HSSSRRSSSH..",
	"....HHSSSSSSH...",
	"......SSSS......",
	"....BBBbBBBBB...",
	"...SOOOOBBOOOS..",
	"...SOOOOOBBOOS..",
	"...SOOOOOOBBOS..",
	"...SOOOOOOOBBS..",
	"....OOOOOOOOBB..",
	"....OOOOOOOO.B..",
	"....OoOOOOOO....",
	"....OoOOOOOO....",
	"....OOOOOOOO....",
	"....OOOOOOOO....",
	"....OOOOOOOO....",
];
const BIG_TOP_BLINK = BIG_TOP.map((r, i) => (i === 6 ? ".HHSSSSSSSSSSH.." : i === 7 ? ".HHSSKKKSSKKKSH." : r));
const BIG_LEGS_IDLE = [
	".....LLL.LLL....",
	".....LLL.LLL....",
	".....LLL.LLL....",
	".....LLL.LLL....",
	".....LLL.LLL....",
	".....LLL.LLL....",
	"....KKKK.KKKK...",
	"....KKKK.KKKK...",
];
const BIG_LEGS_W1 = [
	".....LLL.LLL....",
	"....LLL...LLL...",
	"....LLL...LLL...",
	"...LLL.....LLL..",
	"...LLL.....LLL..",
	"...LLL.....LLL..",
	"..KKKK.....KKKK.",
	"..KKKK.....KKKK.",
];
const BIG_LEGS_W2 = [
	".....LLLLLLL....",
	".....LLLLLL.....",
	"......LLLL......",
	"......LLLL......",
	"......LLLL......",
	"......LLLL......",
	".....KKKKKK.....",
	".....KKKKKK.....",
];
const BIG_LEGS_W3 = [
	".....LLL.LLL....",
	"...LLL....LLL...",
	"..LLL......LLL..",
	"..LLL.......LLL.",
	".LLL........LLL.",
	".LLL........LLL.",
	"KKKK........KKKK",
	"KKKK........KKKK",
];
const BIG_LEGS_W4 = [
	".....LLLLLLL....",
	"......LLLLL.....",
	"......LLLL......",
	".......LLL......",
	".......LLL......",
	".......LLL......",
	"......KKKKK.....",
	"......KKKKK.....",
];
const BIG_LEGS_JUMP = [
	".....LLL.LLL....",
	"....LLL...LLL...",
	"...LLL.....LLL..",
	"...KKKK...KKKK..",
	"..KKKK.....KKKK.",
	"................",
	"................",
	"................",
];
const BIG_LEGS_FALL = [
	".....LLL.LLL....",
	"....LLL...LLL...",
	"...LLL.....LLL..",
	"..LLL.......LLL.",
	"..KKKK.....KKKK.",
	".KKKK.......KKKK",
	"................",
	"................",
];
const BIG_LEGS_SKID = [
	"....LLLL.LLL....",
	"...LLLL..LLL....",
	"..LLLL...LLL....",
	"..LLL....LLL....",
	".LLL.....LLL....",
	".LLL.....LLL....",
	"KKKK....KKKK....",
	"KKKK....KKKK....",
];
const BIG_JUMP_TOP = BIG_TOP.map((row, i) => {
	if (i === 12) {
		return "...SBBBbBBBBBS..";
	}
	if (i >= 13 && i <= 16) {
		return [ "...SOOOOBBOOOS..", "....OOOOOBBOO...", "....OOOOOOBBO...", "....OOOOOOOBB..." ][i - 13];
	}
	return row;
});
const BIG_FALL_TOP = BIG_TOP.map((row, i) => {
	if (i === 13) {
		return "..SSOOOOBBOOOSS.";
	}
	if (i >= 14 && i <= 16) {
		return [ "....OOOOOBBOO...", "....OOOOOOBBO...", "....OOOOOOOBB..." ][i - 14];
	}
	return row;
});

// Enemies -------------------------------------------------------------------

const GRUMBLE_PAL = { ".": null, "G": "#8a7a6a", "H": "#b8a890", "g": "#6a5a4c", "K": "#1c1c24", "W": "#fff3dc", "R": "#d8503c" };
const GRUMBLE = [
	"................",
	"....GGGGGGGG....",
	"...GHHGGGGHHGG..",
	"..GHGGGGGGGGHGG.",
	"..GGWWGGGGWWGGG.",
	"..GWWKGGGGKWWGG.",
	"..GGWWGGGGWWGGG.",
	"..GGGGGGGGGGGGg.",
	"..GGGKKKKKKKGGg.",
	"..GGGKRRRRRKGGg.",
	"..GGGGKKKKKGGgg.",
	"...GGGGGGGGGggg.",
	"....GGGGGGggg...",
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
	"...SLLSSSSSLLSE.",
	"...SSLLSSSLLSEE.",
	"....SSSLLLSSEE..",
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
	"...SLLSSSSSLLSE.",
	"...SSLLSSSLLSEE.",
	"....SSSLLLSSEE..",
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
	if (i === 3 || i === 6) {
		return "..RRRRRRRRRRRR..";
	}
	if (i === 4 || i === 5) {
		return "..RMWMWMWMWMMR..";
	}
	return r;
});

const BOSS_PAL = { ".": null, "R": "#a8302c", "r": "#c84a3c", "D": "#5c1414", "Y": "#f2c14e", "K": "#1c1c24", "W": "#fff3dc", "E": "#ff6a3a" };
const BOSS = [
	"..Y....YY....Y..",
	"..YY..YRRY..YY..",
	"..DYYDRrrRDYYD..",
	".DRRRRrrrrRRRRD.",
	".DRRRrrrrrrRRRD.",
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

// Items ---------------------------------------------------------------------

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

// HUD icons (8x8)
const ICON_PAL = { ".": null, "W": "#fff3dc", "K": "#1c1c24", "Y": "#f2c14e", "y": "#c48a1a", "R": "#e2402a", "G": "#8a8a94", "L": "#5a94f0" };
const ICON_CLOCK = [
	"..WWWW..",
	".WKKKKW.",
	"WKKWKKKW",
	"WKKWKKKW",
	"WKKWWWKW",
	"WKKKKKKW",
	".WKKKKW.",
	"..WWWW..",
];
const ICON_MUTE = [
	"...W....",
	"..WW.R.R",
	"WWWW..R.",
	"WWWW..R.",
	"WWWW.R.R",
	"..WW....",
	"...W....",
	"........",
];
const ICON_LOCK = [
	"..GGGG..",
	".GG..GG.",
	".G....G.",
	"YYYYYYYY",
	"YYYyYYYY",
	"YYYyYYYY",
	"YYYYYYYY",
	"YYYYYYYY",
];
const ICON_CURSOR = [
	"W.......",
	"WW......",
	"WWW.....",
	"WWWW....",
	"WWW.....",
	"WW......",
	"W.......",
	"........",
];
const ICON_SPEAKER = [
	"...W....",
	"..WW.L..",
	"WWWW..L.",
	"WWWW.L.L",
	"WWWW..L.",
	"..WW.L..",
	"...W....",
	"........",
];

function makeCanvas(w, h) {
	const c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	return c;
}

function render(rows, pal, scale = 1) {
	const h = rows.length;
	const w = rows[0].length;
	const c = makeCanvas(w * scale, h * scale);
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
	const f = makeCanvas(c.width, c.height);
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

function smallHeroRows(pose, frame) {
	switch (pose) {
		case "dead":
			return SMALL_DEAD;
		case "jump":
		case "pole":
		case "throw":
			return SMALL_JUMP;
		case "fall":
			return SMALL_FALL;
		case "skid":
			return SMALL_SKID;
		case "walk":
			return SMALL_WALK[frame % 4];
		case "blink":
			return SMALL_BLINK;
		default:
			return SMALL_IDLE;
	}
}

function bigHeroRows(pose, frame) {
	switch (pose) {
		case "jump":
		case "pole":
		case "throw":
			return [ ...BIG_JUMP_TOP, ...BIG_LEGS_JUMP ];
		case "fall":
			return [ ...BIG_FALL_TOP, ...BIG_LEGS_FALL ];
		case "skid":
			return [ ...BIG_TOP, ...BIG_LEGS_SKID ];
		case "walk":
			return [ ...BIG_TOP, ...[ BIG_LEGS_W1, BIG_LEGS_W2, BIG_LEGS_W3, BIG_LEGS_W4 ][frame % 4] ];
		case "blink":
			return [ ...BIG_TOP_BLINK, ...BIG_LEGS_IDLE ];
		default:
			return [ ...BIG_TOP, ...BIG_LEGS_IDLE ];
	}
}

// Public lookups. Each returns { r, l } (facing right / facing left).
export const Sprites = {
	// poses: idle | blink | walk | skid | jump | fall | throw | pole | dead
	hero(power, pose, frame) {
		const pal = power === 2 ? HERO_SPARK : HERO;
		const tag = power === 2 ? "s" : "n";
		if (power === 0) {
			return sprite(`hero-s-${tag}-${pose}-${frame % 4}`, smallHeroRows(pose, frame), pal);
		}
		return sprite(`hero-b-${tag}-${pose}-${frame % 4}`, bigHeroRows(pose, frame), pal);
	},
	heroHead(power = 0) {
		const pal = power === 2 ? HERO_SPARK : HERO;
		return sprite(`herohead-${power === 2 ? "s" : "n"}`, SMALL_HEAD, pal);
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
	icon(name) {
		const rows = { clock: ICON_CLOCK, mute: ICON_MUTE, lock: ICON_LOCK, cursor: ICON_CURSOR, speaker: ICON_SPEAKER }[name];
		return sprite(`icon-${name}`, rows, ICON_PAL);
	},
};

// Themes --------------------------------------------------------------------

export const THEMES = {
	overworld: {
		sky: [ "#3d7ee6", "#6fb0f5", "#b9e3fb" ],
		sun: "#fff6c8",
		mountains: [ "#7faee6", "#95bfee" ],
		hills: [ "#3a9a4f", "#52b85e" ],
		near: "#2d8a44",
		treeTrunk: "#6a3c18",
		cloud: "#ffffff",
		ground: [ "#b8683a", "#d08c58", "#6e3514" ],
		grass: [ "#3f9c3a", "#5fc84a", "#8fe07a" ],
		vignette: 0.16,
		ambient: 0,
	},
	dusk: {
		sky: [ "#2a1a4e", "#8a3e6a", "#f29a5e" ],
		sun: "#ffb347",
		mountains: [ "#2c1a48", "#3f2762" ],
		hills: [ "#4a2f6c", "#5b3b7c" ],
		near: "#241638",
		treeTrunk: "#1a1028",
		cloud: "#f7c2a4",
		ground: [ "#8e5038", "#b07056", "#4a2414" ],
		grass: [ "#2a6e3e", "#3f8a4e", "#6ab06a" ],
		vignette: 0.28,
		ambient: 0,
		stars: true,
	},
	underground: {
		sky: [ "#05070e", "#0b1222", "#101b33" ],
		sun: null,
		mountains: [ "#0d172c", "#13203a" ],
		hills: [ "#13203a", "#1a2b4c" ],
		near: "#0a1225",
		cloud: null,
		ground: [ "#355fa8", "#5484cf", "#1a3568" ],
		grass: null,
		crystal: "#6ff0ff",
		vignette: 0.45,
		ambient: 0.42,
	},
	castle: {
		sky: [ "#0a0810", "#140c16", "#24121a" ],
		sun: null,
		mountains: [ "#1a1420", "#241a2a" ],
		hills: [ "#241a2a", "#302438" ],
		near: "#120c16",
		cloud: null,
		ground: [ "#6e6e78", "#929299", "#3a3a42" ],
		grass: null,
		torch: "#ffb347",
		vignette: 0.42,
		ambient: 0.36,
	},
};

function tileCanvas(key, draw) {
	if (!cache.has(key)) {
		const c = makeCanvas(16, 16);
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

// Deterministic hash for tile variants.
function hash(a, b) {
	let h = (a * 374761393 + b * 668265263) | 0;
	h = (h ^ (h >>> 13)) * 1274126177;
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function dirtSpecks(ctx, seed, light, dark, from = 4) {
	for (let i = 0; i < 6; i++) {
		const r = hash(seed, i);
		const x = Math.floor(r * 16);
		const y = from + Math.floor(hash(seed + 7, i) * (16 - from));
		px(ctx, x, y, 2, 1, i % 2 ? light : dark);
	}
}

export function tileImage(id, theme, frame = 0, top = false, variant = 0) {
	const th = THEMES[theme] || THEMES.overworld;
	switch (id) {
		case 1: // ground
			return tileCanvas(`ground-${theme}-${top ? "top" : "mid"}-${variant}`, (ctx) => {
				const [ base, light, dark ] = th.ground;
				px(ctx, 0, 0, 16, 16, base);
				// subtle depth: darker towards the bottom
				ctx.globalAlpha = 0.18;
				px(ctx, 0, 10, 16, 6, dark);
				px(ctx, 0, 13, 16, 3, dark);
				ctx.globalAlpha = 1;
				dirtSpecks(ctx, variant * 31 + 3, light, dark, top ? 6 : 1);
				// stone outline on the left/bottom to read as blocks
				ctx.globalAlpha = 0.35;
				px(ctx, 0, 0, 1, 16, dark);
				px(ctx, 0, 15, 16, 1, dark);
				ctx.globalAlpha = 1;
				if (th.grass && top) {
					const [ g0, g1, g2 ] = th.grass;
					px(ctx, 0, 1, 16, 3, g1);
					px(ctx, 0, 4, 16, 1, g0);
					// scalloped underside
					for (let x = 0; x < 16; x += 4) {
						px(ctx, x + 1, 5, 2, 1, g0);
					}
					// blades sticking up into the sky
					const blades = [ 1, 4, 6, 9, 12, 14 ];
					for (let i = 0; i < blades.length; i++) {
						if (hash(variant * 17 + 5, i) > 0.35) {
							px(ctx, blades[i], 0, 1, 1, g1);
						}
					}
					px(ctx, 2, 1, 1, 1, g2);
					px(ctx, 7, 1, 2, 1, g2);
					px(ctx, 12, 2, 1, 1, g2);
					// a flower or pebble now and then
					if (variant === 2) {
						px(ctx, 10, 0, 1, 1, theme === "dusk" ? "#ffd27a" : "#fff3dc");
					}
				} else if (top) {
					// stone caps for cave/castle themes
					px(ctx, 0, 0, 16, 2, light);
					px(ctx, 0, 2, 16, 1, base);
				}
			});
		case 2: // brick
			return tileCanvas(`brick-${theme}`, (ctx) => {
				const [ base, light, dark ] = th.ground;
				px(ctx, 0, 0, 16, 16, dark);
				const rows = [ [ 0, 7 ], [ 8, 15 ] ];
				const draw = (x, y, w) => {
					px(ctx, x, y, w, 3, base);
					px(ctx, x, y, w, 1, light);
					px(ctx, x, y, 1, 3, light);
				};
				for (let r = 0; r < 4; r++) {
					const y = r * 4;
					if (r % 2 === 0) {
						draw(0, y, 7);
						draw(8, y, 8);
					} else {
						draw(0, y, 3);
						draw(4, y, 11);
					}
				}
				void rows;
			});
		case 3: // question
		case 4:
		case 20:
			return tileCanvas(`q-${frame % 3}`, (ctx) => {
				const glow = [ "#f2c14e", "#f8d878", "#e0a830" ][frame % 3];
				px(ctx, 0, 0, 16, 16, "#a86a12");
				px(ctx, 1, 1, 14, 14, glow);
				px(ctx, 1, 1, 14, 1, "#fff0b0");
				px(ctx, 1, 1, 1, 14, "#fff0b0");
				px(ctx, 1, 14, 14, 1, "#c48a1a");
				px(ctx, 14, 1, 1, 14, "#c48a1a");
				for (const [ x, y ] of [ [ 2, 2 ], [ 13, 2 ], [ 2, 13 ], [ 13, 13 ] ]) {
					px(ctx, x, y, 1, 1, "#7a4a08");
				}
				const k = "#5c3a08";
				const s = "#fff0b0";
				px(ctx, 6, 4, 6, 2, s);
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
				px(ctx, 1, 1, 14, 1, "#b88a44");
				px(ctx, 1, 1, 1, 14, "#b88a44");
				px(ctx, 3, 3, 10, 10, "#8a5a1e");
				px(ctx, 4, 4, 8, 8, "#7a4e18");
			});
		case 6: // hard block
			return tileCanvas(`hard-${theme}`, (ctx) => {
				const [ base, light, dark ] = th.ground;
				px(ctx, 0, 0, 16, 16, dark);
				px(ctx, 0, 0, 15, 15, light);
				px(ctx, 2, 2, 13, 13, base);
				px(ctx, 13, 2, 2, 13, dark);
				px(ctx, 2, 13, 13, 2, dark);
				ctx.globalAlpha = 0.35;
				px(ctx, 4, 4, 7, 7, light);
				ctx.globalAlpha = 1;
				px(ctx, 5, 5, 5, 5, base);
			});
		case 8:
		case 9:
		case 10:
		case 11:
			return tileCanvas(`pipe-${id}`, (ctx) => {
				const top = id === 8 || id === 9;
				const left = id === 8 || id === 10;
				// Cylinder shading across the two tiles: dark edge, light band, mid, dark edge.
				const shades = left
					? [ "#17602a", "#2a8a3a", "#3cb84c", "#6fd86a", "#9ce890", "#8ee083", "#6fd86a", "#55c85a", "#4cc04f", "#45b848", "#3cb84c", "#3cb84c", "#38ae46", "#34a642", "#2f9c3e", "#2a9239" ]
					: [ "#2a9239", "#288c37", "#268634", "#248031", "#227a2e", "#20742c", "#1e6e2a", "#1c6828", "#1a6226", "#195e24", "#185a23", "#175622", "#165221", "#154e20", "#17602a", "#0f4a1e" ];
				for (let x = 0; x < 16; x++) {
					px(ctx, x, 0, 1, 16, shades[x]);
				}
				if (top) {
					px(ctx, 0, 0, 16, 1, "#9ce890");
					px(ctx, 0, 1, 16, 1, "#6fd86a");
					px(ctx, 0, 14, 16, 2, "#17602a");
					if (left) {
						px(ctx, 0, 0, 1, 16, "#0f4a1e");
					} else {
						px(ctx, 15, 0, 1, 16, "#0f4a1e");
					}
				} else if (left) {
					px(ctx, 0, 0, 1, 16, "#0f4a1e");
					px(ctx, 1, 0, 1, 16, "#17602a");
				} else {
					px(ctx, 14, 0, 1, 16, "#17602a");
					px(ctx, 15, 0, 1, 16, "#0f4a1e");
				}
			});
		case 13: // lava
			return tileCanvas(`lava-${frame % 4}`, (ctx) => {
				const f = frame % 4;
				px(ctx, 0, 0, 16, 16, "#d8381e");
				ctx.globalAlpha = 0.5;
				px(ctx, 0, 8, 16, 8, "#9a1e14");
				ctx.globalAlpha = 1;
				// bright surface with a wave offset per frame
				px(ctx, 0, 0, 16, 2, "#ffd060");
				px(ctx, 0, 2, 16, 1, "#ffb030");
				for (let x = 0; x < 16; x += 4) {
					px(ctx, (x + f) % 16, 0, 2, 1, "#fff0a0");
					px(ctx, (x + 2 - f + 16) % 16, 3, 2, 1, "#ff8030");
				}
				// blobs and bubbles
				px(ctx, (f * 4) % 16, 5, 4, 2, "#ff9a30");
				px(ctx, (f * 4 + 9) % 16, 9, 3, 2, "#ff7a2a");
				px(ctx, (f * 5 + 3) % 16, 13, 4, 1, "#ff6a24");
				px(ctx, (f * 3 + 6) % 16, 7 + (f % 2), 1, 1, "#ffe080");
			});
		case 14: // castle stone
			return tileCanvas(`castle-${variant}`, (ctx) => {
				px(ctx, 0, 0, 16, 16, "#3a3a42");
				const block = (x, y, w, h, c) => {
					px(ctx, x, y, w, h, c);
					px(ctx, x, y, w, 1, "#a2a2aa");
					px(ctx, x, y, 1, h, "#a2a2aa");
					px(ctx, x + w - 1, y, 1, h, "#5a5a64");
					px(ctx, x, y + h - 1, w, 1, "#5a5a64");
				};
				block(0, 0, 7, 7, "#80808a");
				block(8, 0, 8, 7, "#78787f");
				block(0, 8, 3, 7, "#78787f");
				block(4, 8, 11, 7, "#80808a");
				if (variant === 1) {
					px(ctx, 10, 2, 1, 3, "#5a5a64");
					px(ctx, 11, 4, 1, 2, "#5a5a64");
				} else if (variant === 2) {
					px(ctx, 6, 10, 3, 1, "#5a5a64");
					px(ctx, 2, 3, 2, 1, "#9a9aa2");
				}
			});
		case 15: // pole
			return tileCanvas("pole", (ctx) => {
				px(ctx, 6, 0, 4, 16, "#8a9aa0");
				px(ctx, 7, 0, 1, 16, "#e8f0f0");
				px(ctx, 8, 0, 1, 16, "#b8c8c8");
			});
		case 16: // pole top
			return tileCanvas("poletop", (ctx) => {
				px(ctx, 6, 8, 4, 8, "#8a9aa0");
				px(ctx, 7, 8, 1, 8, "#e8f0f0");
				px(ctx, 5, 2, 6, 6, "#f2c14e");
				px(ctx, 6, 1, 4, 1, "#f2c14e");
				px(ctx, 6, 8, 4, 1, "#c48a1a");
				px(ctx, 6, 3, 2, 2, "#fff0b0");
				px(ctx, 9, 6, 1, 1, "#c48a1a");
			});
		case 17: // gate (closed)
			return tileCanvas("gate", (ctx) => {
				px(ctx, 0, 0, 16, 16, "#2a1a10");
				px(ctx, 1, 0, 14, 16, "#5a3a1a");
				for (const x of [ 4, 8, 12 ]) {
					px(ctx, x, 0, 1, 16, "#3c2612");
				}
				px(ctx, 1, 0, 14, 1, "#7a5230");
				px(ctx, 1, 4, 14, 2, "#2a2228");
				px(ctx, 1, 11, 14, 2, "#2a2228");
				px(ctx, 3, 4, 1, 2, "#c8a040");
				px(ctx, 12, 4, 1, 2, "#c8a040");
				px(ctx, 3, 11, 1, 2, "#c8a040");
				px(ctx, 12, 11, 1, 2, "#c8a040");
			});
		case 18: // gate open
			return tileCanvas("gateopen", (ctx) => {
				const g = ctx.createLinearGradient(0, 0, 16, 0);
				g.addColorStop(0, "#000000");
				g.addColorStop(0.5, "#1a1014");
				g.addColorStop(1, "#000000");
				ctx.fillStyle = g;
				ctx.fillRect(0, 0, 16, 16);
				px(ctx, 0, 0, 2, 16, "#2a1a10");
				px(ctx, 14, 0, 2, 16, "#2a1a10");
			});
		case 19: // bridge
			return tileCanvas("bridge", (ctx) => {
				px(ctx, 0, 0, 16, 6, "#8a5a2a");
				px(ctx, 0, 0, 16, 1, "#b8824a");
				px(ctx, 0, 5, 16, 1, "#4a2a0c");
				px(ctx, 4, 0, 1, 6, "#5c3a08");
				px(ctx, 11, 0, 1, 6, "#5c3a08");
				px(ctx, 0, 6, 16, 1, "#2a1a0a");
			});
		default:
			return null;
	}
}

// Effect textures -------------------------------------------------------------

// Soft radial glow, white centre fading to transparent. Tint with globalCompositeOperation
// or fillStyle via drawGlow().
export function glowTexture(size = 64) {
	const key = `glow-${size}`;
	if (!cache.has(key)) {
		const c = makeCanvas(size, size);
		const ctx = c.getContext("2d");
		const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
		g.addColorStop(0, "rgba(255,255,255,1)");
		g.addColorStop(0.35, "rgba(255,255,255,0.55)");
		g.addColorStop(1, "rgba(255,255,255,0)");
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, size, size);
		cache.set(key, c);
	}
	return cache.get(key);
}

// Coloured glow sprite (cached per colour and size).
export function colorGlow(color, size = 64) {
	const key = `cglow-${color}-${size}`;
	if (!cache.has(key)) {
		const c = makeCanvas(size, size);
		const ctx = c.getContext("2d");
		ctx.drawImage(glowTexture(size), 0, 0);
		ctx.globalCompositeOperation = "source-in";
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, size, size);
		cache.set(key, c);
	}
	return cache.get(key);
}

export function vignetteTexture(w, h, strength) {
	const key = `vig-${w}-${h}-${strength}`;
	if (!cache.has(key)) {
		const c = makeCanvas(w, h);
		const ctx = c.getContext("2d");
		const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.72);
		g.addColorStop(0, "rgba(0,0,0,0)");
		g.addColorStop(1, `rgba(0,0,0,${strength})`);
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, w, h);
		cache.set(key, c);
	}
	return cache.get(key);
}

// Soft elliptical shadow used under characters.
export function shadowTexture() {
	const key = "shadow";
	if (!cache.has(key)) {
		const c = makeCanvas(32, 8);
		const ctx = c.getContext("2d");
		const g = ctx.createRadialGradient(16, 4, 1, 16, 4, 16);
		g.addColorStop(0, "rgba(0,0,0,0.45)");
		g.addColorStop(1, "rgba(0,0,0,0)");
		ctx.fillStyle = g;
		ctx.save();
		ctx.scale(1, 0.25);
		ctx.beginPath();
		ctx.arc(16, 16, 16, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		cache.set(key, c);
	}
	return cache.get(key);
}

// Font ----------------------------------------------------------------------
// 5x7 glyphs, 6px advance. Lowercase letters fall back to uppercase, except for
// the few lowercase symbols defined explicitly (the multiplication 'x').

const F = {
	"A": [ ".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#" ],
	"B": [ "####.", "#...#", "#...#", "####.", "#...#", "#...#", "####." ],
	"C": [ ".####", "#....", "#....", "#....", "#....", "#....", ".####" ],
	"D": [ "####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####." ],
	"E": [ "#####", "#....", "#....", "####.", "#....", "#....", "#####" ],
	"F": [ "#####", "#....", "#....", "####.", "#....", "#....", "#...." ],
	"G": [ ".####", "#....", "#....", "#.###", "#...#", "#...#", ".####" ],
	"H": [ "#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#" ],
	"I": [ "#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####" ],
	"J": [ "..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.." ],
	"K": [ "#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#" ],
	"L": [ "#....", "#....", "#....", "#....", "#....", "#....", "#####" ],
	"M": [ "#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#" ],
	"N": [ "#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#" ],
	"O": [ ".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###." ],
	"P": [ "####.", "#...#", "#...#", "####.", "#....", "#....", "#...." ],
	"Q": [ ".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#" ],
	"R": [ "####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#" ],
	"S": [ ".####", "#....", "#....", ".###.", "....#", "....#", "####." ],
	"T": [ "#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.." ],
	"U": [ "#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###." ],
	"V": [ "#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.." ],
	"W": [ "#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#" ],
	"X": [ "#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#" ],
	"Y": [ "#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.." ],
	"Z": [ "#####", "....#", "...#.", "..#..", ".#...", "#....", "#####" ],
	"0": [ ".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###." ],
	"1": [ "..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###." ],
	"2": [ ".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####" ],
	"3": [ "#####", "...#.", "..#..", "...#.", "....#", "#...#", ".###." ],
	"4": [ "...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#." ],
	"5": [ "#####", "#....", "####.", "....#", "....#", "#...#", ".###." ],
	"6": [ "..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###." ],
	"7": [ "#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..." ],
	"8": [ ".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###." ],
	"9": [ ".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.." ],
	" ": [ ".....", ".....", ".....", ".....", ".....", ".....", "....." ],
	".": [ ".....", ".....", ".....", ".....", ".....", "..#..", "..#.." ],
	",": [ ".....", ".....", ".....", ".....", "..#..", "..#..", ".#..." ],
	":": [ ".....", "..#..", "..#..", ".....", "..#..", "..#..", "....." ],
	"-": [ ".....", ".....", ".....", ".###.", ".....", ".....", "....." ],
	"!": [ "..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.." ],
	"?": [ ".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.." ],
	"/": [ "....#", "....#", "...#.", "..#..", ".#...", "#....", "#...." ],
	"x": [ ".....", ".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#" ],
	"'": [ "..#..", "..#..", ".....", ".....", ".....", ".....", "....." ],
	"(": [ "...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#." ],
	")": [ ".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..." ],
	"+": [ ".....", "..#..", "..#..", "#####", "..#..", "..#..", "....." ],
	"=": [ ".....", ".....", "#####", ".....", "#####", ".....", "....." ],
	"<": [ "...#.", "..#..", ".#...", "#....", ".#...", "..#..", "...#." ],
	">": [ ".#...", "..#..", "...#.", "....#", "...#.", "..#..", ".#..." ],
	"%": [ "##..#", "##.#.", "...#.", "..#..", ".#...", "#.##.", "#..##" ],
	"#": [ ".#.#.", "#####", ".#.#.", ".#.#.", ".#.#.", "#####", ".#.#." ],
	"*": [ ".....", "..#..", "#.#.#", ".###.", "#.#.#", "..#..", "....." ],
};

export const FONT_W = 5;
export const FONT_H = 7;
export const FONT_ADV = 6;

const fontCache = new Map();

export function glyph(ch, color) {
	const key = ch + color;
	if (!fontCache.has(key)) {
		const rows = F[ch] || F[ch.toUpperCase()] || F["?"];
		const c = makeCanvas(FONT_W, FONT_H);
		const ctx = c.getContext("2d");
		ctx.fillStyle = color;
		for (let y = 0; y < FONT_H; y++) {
			for (let x = 0; x < FONT_W; x++) {
				if (rows[y][x] === "#") {
					ctx.fillRect(x, y, 1, 1);
				}
			}
		}
		fontCache.set(key, c);
	}
	return fontCache.get(key);
}

export function textWidth(str, scale = 1) {
	return str.length * FONT_ADV * scale - scale;
}

// Draw a string with the pixel font. Returns the width drawn.
export function drawText(ctx, str, x, y, color = "#ffffff", scale = 1, shadow = "#1c1c24") {
	x = Math.round(x);
	y = Math.round(y);
	for (let i = 0; i < str.length; i++) {
		const ch = str[i];
		if (ch !== " ") {
			const gx = x + i * FONT_ADV * scale;
			if (shadow) {
				const gs = glyph(ch, shadow);
				ctx.drawImage(gs, gx + scale, y + scale, FONT_W * scale, FONT_H * scale);
			}
			ctx.drawImage(glyph(ch, color), gx, y, FONT_W * scale, FONT_H * scale);
		}
	}
	return textWidth(str, scale);
}

// Outlined text: a 1px (scaled) outline in `outline` around `color`.
export function drawTextOutlined(ctx, str, x, y, color, outline, scale = 1) {
	for (const [ ox, oy ] of [ [ -1, 0 ], [ 1, 0 ], [ 0, -1 ], [ 0, 1 ], [ -1, -1 ], [ 1, -1 ], [ -1, 1 ], [ 1, 1 ] ]) {
		drawText(ctx, str, x + ox * scale, y + oy * scale, outline, scale, null);
	}
	return drawText(ctx, str, x, y, color, scale, null);
}

// The title logo, cached: gradient-filled "EMBER HOP" with a dark outline and a
// warm drop shadow.
export function logoImage() {
	const key = "logo";
	if (!cache.has(key)) {
		const scale = 3;
		const text = "EMBER HOP";
		const w = textWidth(text, scale) + scale * 6;
		const h = FONT_H * scale + scale * 6;
		const c = makeCanvas(w, h);
		const ctx = c.getContext("2d");
		const tx = scale * 3;
		const ty = scale * 2;
		// shadow
		drawTextOutlined(ctx, text, tx, ty + scale * 2, "#3a140a", "#3a140a", scale);
		// outline
		drawTextOutlined(ctx, text, tx, ty, "#ffffff", "#5a200c", scale);
		// gradient fill via source-atop on a text-only layer
		const layer = makeCanvas(w, h);
		const lctx = layer.getContext("2d");
		drawText(lctx, text, tx, ty, "#ffffff", scale, null);
		lctx.globalCompositeOperation = "source-atop";
		const g = lctx.createLinearGradient(0, ty, 0, ty + FONT_H * scale);
		g.addColorStop(0, "#ffe27a");
		g.addColorStop(0.45, "#ffb347");
		g.addColorStop(0.5, "#f08a2c");
		g.addColorStop(1, "#d8501e");
		lctx.fillStyle = g;
		lctx.fillRect(0, 0, w, h);
		ctx.drawImage(layer, 0, 0);
		// a thin highlight along the top of each letter
		lctx.globalCompositeOperation = "source-over";
		lctx.clearRect(0, 0, w, h);
		drawText(lctx, text, tx, ty, "#fff6c8", scale, null);
		lctx.globalCompositeOperation = "destination-in";
		lctx.fillStyle = "#fff";
		lctx.fillRect(0, ty, w, scale);
		ctx.drawImage(layer, 0, 0);
		cache.set(key, c);
	}
	return cache.get(key);
}
