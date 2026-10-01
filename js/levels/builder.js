// A tiny DSL for writing tile maps without hand-typing 200-column strings.

export function room(w, h, opts = {}) {
	const grid = [];
	for (let y = 0; y < h; y++) {
		grid.push(new Array(w).fill("."));
	}
	const spawns = [];
	const warps = [];
	const api = {
		w,
		h,
		set(x, y, ch) {
			if (x >= 0 && x < w && y >= 0 && y < h) {
				grid[y][x] = ch;
			}
			return api;
		},
		get(x, y) {
			return grid[y] && grid[y][x];
		},
		fill(x1, y1, x2, y2, ch) {
			for (let y = y1; y <= y2; y++) {
				for (let x = x1; x <= x2; x++) {
					api.set(x, y, ch);
				}
			}
			return api;
		},
		// Ground from column x1 to x2 inclusive, `depth` tiles thick at the bottom.
		ground(x1, x2, depth = 2, ch = "#") {
			return api.fill(x1, h - depth, x2, h - 1, ch);
		},
		// Clear the bottom rows to make a pit.
		pit(x1, x2) {
			return api.fill(x1, h - 2, x2, h - 1, ".");
		},
		// Write a horizontal run of chars starting at x, y.
		row(x, y, str) {
			for (let i = 0; i < str.length; i++) {
				if (str[i] !== " ") {
					api.set(x + i, y, str[i]);
				}
			}
			return api;
		},
		// Write a vertical run.
		col(x, y, str) {
			for (let i = 0; i < str.length; i++) {
				if (str[i] !== " ") {
					api.set(x, y + i, str[i]);
				}
			}
			return api;
		},
		// A pipe of `height` tiles whose base sits on row `baseY` (exclusive).
		pipe(x, height, baseY = h - 2, plant = false) {
			const top = baseY - height;
			api.set(x, top, "(").set(x + 1, top, ")");
			for (let y = top + 1; y < baseY; y++) {
				api.set(x, y, "[").set(x + 1, y, "]");
			}
			if (plant) {
				spawns.push({ type: "chompvine", tx: x, ty: top - 1 });
			}
			return api;
		},
		// Stairs of hard blocks. dir 1 climbs to the right, -1 to the left.
		stairs(x, n, dir = 1, baseY = h - 2, ch = "B") {
			for (let i = 0; i < n; i++) {
				const cx = x + i * dir;
				for (let j = 0; j <= i; j++) {
					api.set(cx, baseY - 1 - j, ch);
				}
			}
			return api;
		},
		// Solid column (pillar) from baseY-1 up `height` tiles.
		pillar(x, height, baseY = h - 2, ch = "B") {
			for (let j = 0; j < height; j++) {
				api.set(x, baseY - 1 - j, ch);
			}
			return api;
		},
		// Goal pole standing on the ground at column x.
		pole(x, baseY = h - 2, height = 8) {
			api.set(x, baseY - 1, "B");
			for (let y = baseY - 2; y > baseY - 1 - height; y--) {
				api.set(x, y, "|");
			}
			api.set(x, baseY - 1 - height, "T");
			return api;
		},
		coins(x, y, n, step = 1) {
			for (let i = 0; i < n; i++) {
				api.set(x + i * step, y, "o");
			}
			return api;
		},
		spawn(type, tx, ty, props = {}) {
			spawns.push({ type, tx, ty, ...props });
			return api;
		},
		warp(def) {
			warps.push(def);
			return api;
		},
		build() {
			return {
				map: grid.map((r) => r.join("")),
				spawns,
				warps,
				theme: opts.theme,
				scrollY: opts.scrollY,
				start: opts.start,
			};
		},
	};
	return api;
}
