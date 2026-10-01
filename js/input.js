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

	// Wire on-screen buttons: elements with data-action inside `root`.
	bindTouch(root) {
		const buttons = root.querySelectorAll("[data-action]");
		for (const btn of buttons) {
			const action = btn.dataset.action;
			const down = (e) => {
				e.preventDefault();
				this.hasTouch = true;
				this.touch[action] = true;
				this.latch[action] = true;
				btn.classList.add("down");
				if (this.onAny) {
					this.onAny();
				}
			};
			const up = (e) => {
				if (e) {
					e.preventDefault();
				}
				this.touch[action] = false;
				btn.classList.remove("down");
			};
			btn.addEventListener("pointerdown", down);
			btn.addEventListener("pointerup", up);
			btn.addEventListener("pointercancel", up);
			btn.addEventListener("pointerleave", up);
			btn.addEventListener("contextmenu", (e) => e.preventDefault());
		}
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
