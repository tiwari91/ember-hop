// Tile ids, char map and the level loader. Pure data, no DOM.

export const TILE = 16;

export const T = {
	EMPTY: 0,
	GROUND: 1,
	BRICK: 2,
	QUESTION: 3,
	QUESTION_ITEM: 4,
	USED: 5,
	HARD: 6,
	HIDDEN: 7,
	PIPE_TL: 8,
	PIPE_TR: 9,
	PIPE_L: 10,
	PIPE_R: 11,
	COIN: 12,
	LAVA: 13,
	CASTLE: 14,
	POLE: 15,
	POLE_TOP: 16,
	GATE: 17,
	GATE_OPEN: 18,
	BRIDGE: 19,
	QUESTION_LIFE: 20,
};

export const CHAR_TO_TILE = {
	".": T.EMPTY,
	"#": T.GROUND,
	"=": T.BRICK,
	"?": T.QUESTION,
	"M": T.QUESTION_ITEM,
	"U": T.USED,
	"B": T.HARD,
	"!": T.HIDDEN,
	"(": T.PIPE_TL,
	")": T.PIPE_TR,
	"[": T.PIPE_L,
	"]": T.PIPE_R,
	"o": T.COIN,
	"~": T.LAVA,
	"C": T.CASTLE,
	"|": T.POLE,
	"T": T.POLE_TOP,
	"D": T.GATE,
	"_": T.BRIDGE,
	"H": T.QUESTION_LIFE,
};

// Entity markers that appear in map strings. Each spawns an entity and leaves EMPTY.
export const MARKERS = {
	"S": "start",
	"w": "grumble",
	"k": "clanker",
	"f": "flitter",
	"p": "chompvine",
	"X": "boss",
	"m": "platformH",
	"v": "platformV",
};

const SOLID = new Set([
	T.GROUND, T.BRICK, T.QUESTION, T.QUESTION_ITEM, T.QUESTION_LIFE, T.USED, T.HARD,
	T.PIPE_TL, T.PIPE_TR, T.PIPE_L, T.PIPE_R, T.CASTLE, T.GATE, T.BRIDGE,
]);

export function isSolid(id) {
	return SOLID.has(id);
}

export function isBumpable(id) {
	return id === T.BRICK || id === T.QUESTION || id === T.QUESTION_ITEM ||
		id === T.QUESTION_LIFE || id === T.HIDDEN;
}

export function isPipeTop(id) {
	return id === T.PIPE_TL || id === T.PIPE_TR;
}

// Turn a level definition into a runtime level. Rooms get Uint8Array tile grids.
export function loadLevel(def) {
	const rooms = {};
	for (const [ name, room ] of Object.entries(def.rooms)) {
		rooms[name] = loadRoom(name, room);
	}
	return {
		name: def.name,
		theme: def.theme,
		time: def.time || 300,
		music: def.music || def.theme,
		rooms,
	};
}

function loadRoom(name, room) {
	const rows = room.map;
	const h = rows.length;
	const w = Math.max(...rows.map((r) => r.length));
	const tiles = new Uint8Array(w * h);
	const spawns = [];
	let start = null;
	for (let y = 0; y < h; y++) {
		const row = rows[y];
		for (let x = 0; x < w; x++) {
			const ch = row[x] || ".";
			if (MARKERS[ch]) {
				const kind = MARKERS[ch];
				if (kind === "start") {
					start = { x: x * TILE, y: y * TILE };
				} else {
					spawns.push({ type: kind, tx: x, ty: y });
				}
				continue;
			}
			const id = CHAR_TO_TILE[ch];
			if (id === undefined) {
				throw new Error(`Unknown tile char '${ch}' in room ${name} at ${x},${y}`);
			}
			tiles[y * w + x] = id;
		}
	}
	for (const s of room.spawns || []) {
		spawns.push(s);
	}
	return {
		name,
		w,
		h,
		theme: room.theme,
		tiles,
		spawns,
		start: start || room.start || { x: 2 * TILE, y: (h - 3) * TILE },
		warps: room.warps || [],
		// When a room is taller than the viewport the camera follows vertically.
		scrollY: Boolean(room.scrollY),
	};
}

export function tileAt(room, tiles, tx, ty) {
	if (tx < 0 || tx >= room.w) {
		return T.HARD; // walls at the level edges
	}
	if (ty < 0) {
		return T.EMPTY;
	}
	if (ty >= room.h) {
		return T.EMPTY; // falling below the map is a pit
	}
	return tiles[ty * room.w + tx];
}
