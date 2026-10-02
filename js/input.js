// Keyboard, gamepad and touch, folded into one per-frame snapshot.
const KEYS = {
	ArrowLeft: "left", KeyA: "left",
	ArrowRight: "right", KeyD: "right",
	ArrowUp: "up", KeyW: "up",
	ArrowDown: "down", KeyS: "down",
	KeyZ: "jump", Space: "jump",
	KeyX: "run", ShiftLeft: "run", ShiftRight: "run",
	KeyP: "pause", Escape: "pause",
	Enter: "start",
	KeyM: "mute",
};

export class Input {
	constructor(target = window) {
		this.keys = {};
		this.touch = {};
		this.pad = {};
		this.prev = {};
		// Presses shorter than a frame are latched until the next snapshot.
		this.latch = {};
		this.onAny = null;
		this.hasTouch = false;
		target.addEventListener("keydown", (e) => {
			const a = KEYS[e.code];
			if (a) {
				this.keys[a] = true;
				this.latch[a] = true;
				if (e.code !== "Escape" && e.code !== "KeyM") {
					e.preventDefault();
				}
			}
			if (this.onAny) {
				this.onAny();
			}
		});
		target.addEventListener("keyup", (e) => {
			const a = KEYS[e.code];
			if (a) {
				this.keys[a] = false;
			}
		});
		target.addEventListener("blur", () => {
			this.keys = {};
			this.touch = {};
		});
	}

	// Wire on-screen buttons: elements with data-action inside `root`. Each
	// finger is tracked on its own and hit-tested as it moves, so sliding from
	// one button to the next (left to right, or run onto jump) switches the
	// action without lifting, the way a real d-pad rolls.
	bindTouch(root) {
		const buttons = Array.from(root.querySelectorAll("[data-action]"));
		const fingers = new Map();
		const refresh = () => {
			const held = {};
			for (const btn of fingers.values()) {
				if (btn) {
					held[btn.dataset.action] = true;
				}
			}
			for (const btn of buttons) {
				const a = btn.dataset.action;
				const on = Boolean(held[a]);
				if (on && !this.touch[a]) {
					this.latch[a] = true;
				}
				this.touch[a] = on;
				btn.classList.toggle("held", on);
			}
		};
		const hit = (x, y) => {
			const el = document.elementFromPoint(x, y);
			return el && el.closest ? el.closest("[data-action]") : null;
		};
		const down = (e) => {
			const btn = e.target.closest ? e.target.closest("[data-action]") : null;
			if (!btn) {
				return;
			}
			e.preventDefault();
			if (btn.hasPointerCapture && btn.hasPointerCapture(e.pointerId)) {
				btn.releasePointerCapture(e.pointerId);
			}
			this.hasTouch = true;
			fingers.set(e.pointerId, btn);
			refresh();
			if (this.onAny) {
				this.onAny();
			}
		};
		const move = (e) => {
			if (!fingers.has(e.pointerId)) {
				return;
			}
			e.preventDefault();
			const btn = hit(e.clientX, e.clientY);
			if (btn !== fingers.get(e.pointerId)) {
				fingers.set(e.pointerId, btn);
				refresh();
			}
		};
		const up = (e) => {
			if (fingers.delete(e.pointerId)) {
				e.preventDefault();
				refresh();
			}
		};
		root.addEventListener("pointerdown", down);
		window.addEventListener("pointermove", move, { passive: false });
		window.addEventListener("pointerup", up);
		window.addEventListener("pointercancel", up);
		// Safari still scrolls, zooms or pops the magnifier off raw touches.
		root.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
		root.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
		root.addEventListener("contextmenu", (e) => e.preventDefault());
		window.addEventListener("blur", () => {
			fingers.clear();
			refresh();
		});
		document.addEventListener("visibilitychange", () => {
			if (document.hidden) {
				fingers.clear();
				refresh();
			}
		});
	}

	pollGamepad() {
		this.pad = {};
		if (typeof navigator === "undefined" || !navigator.getGamepads) {
			return;
		}
		let pads;
		try {
			pads = navigator.getGamepads();
		} catch (err) {
			return;
		}
		for (const gp of pads || []) {
			if (!gp) {
				continue;
			}
			const b = (i) => Boolean(gp.buttons[i] && gp.buttons[i].pressed);
			const ax = gp.axes[0] || 0;
			this.pad.left = b(14) || ax < -0.4;
			this.pad.right = b(15) || ax > 0.4;
			this.pad.up = b(12) || (gp.axes[1] || 0) < -0.5;
			this.pad.down = b(13) || (gp.axes[1] || 0) > 0.5;
			this.pad.jump = b(0) || b(1);
			this.pad.run = b(2) || b(3) || b(5) || b(7);
			this.pad.pause = b(9);
			this.pad.start = b(9);
			if (Object.values(this.pad).some(Boolean) && this.onAny) {
				this.onAny();
			}
		}
	}

	held(action) {
		return Boolean(this.keys[action] || this.touch[action] || this.pad[action]);
	}

	// Build the frame's input and remember it for edge detection.
	snapshot() {
		this.pollGamepad();
		const now = {};
		for (const a of [ "left", "right", "up", "down", "jump", "run", "pause", "start", "mute" ]) {
			now[a] = this.held(a) || Boolean(this.latch[a]);
		}
		this.latch = {};
		const snap = {
			left: now.left,
			right: now.right,
			up: now.up,
			down: now.down,
			jump: now.jump,
			run: now.run,
			jumpP: now.jump && !this.prev.jump,
			runP: now.run && !this.prev.run,
			pauseP: now.pause && !this.prev.pause,
			startP: now.start && !this.prev.start,
			muteP: now.mute && !this.prev.mute,
		};
		this.prev = now;
		return snap;
	}
}
