// WebAudio chiptune: synthesized sound effects and short looping tunes.
// Everything is generated from oscillators; there are no samples.

const NOTE = {};
(function buildNotes() {
	const names = [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ];
	for (let oct = 1; oct <= 7; oct++) {
		names.forEach((n, i) => {
			NOTE[n + oct] = 440 * Math.pow(2, (oct - 4) + (i - 9) / 12);
		});
	}
})();

// Tunes: arrays of [note, beats]. "-" is a rest. Original melodies.
const TUNES = {
	overworld: {
		bpm: 150,
		wave: "square",
		melody: [
			[ "E5", 0.5 ], [ "E5", 0.5 ], [ "-", 0.5 ], [ "E5", 0.5 ], [ "-", 0.5 ], [ "C5", 0.5 ], [ "E5", 1 ],
			[ "G5", 1 ], [ "-", 1 ], [ "G4", 1 ], [ "-", 1 ],
			[ "C5", 1 ], [ "-", 0.5 ], [ "G4", 1 ], [ "-", 0.5 ], [ "E4", 1 ],
			[ "-", 0.5 ], [ "A4", 1 ], [ "B4", 1 ], [ "A#4", 0.5 ], [ "A4", 1 ],
			[ "G4", 0.66 ], [ "E5", 0.66 ], [ "G5", 0.66 ], [ "A5", 1 ], [ "F5", 0.5 ], [ "G5", 0.5 ],
			[ "-", 0.5 ], [ "E5", 1 ], [ "C5", 0.5 ], [ "D5", 0.5 ], [ "B4", 1 ], [ "-", 1 ],
		],
		bass: [
			[ "C3", 1 ], [ "G3", 1 ], [ "C3", 1 ], [ "G3", 1 ], [ "F3", 1 ], [ "C4", 1 ], [ "F3", 1 ], [ "C4", 1 ],
			[ "G3", 1 ], [ "D4", 1 ], [ "G3", 1 ], [ "D4", 1 ], [ "C3", 1 ], [ "G3", 1 ], [ "C3", 1 ], [ "G3", 1 ],
			[ "A3", 1 ], [ "E4", 1 ], [ "A3", 1 ], [ "E4", 1 ], [ "F3", 1 ], [ "C4", 1 ], [ "G3", 1 ], [ "D4", 1 ],
			[ "C3", 1 ], [ "G3", 1 ], [ "C3", 1 ], [ "G3", 1 ], [ "G3", 1 ], [ "D4", 1 ], [ "G3", 1 ], [ "B3", 1 ],
		],
	},
	underground: {
		bpm: 120,
		wave: "triangle",
		melody: [
			[ "C4", 0.5 ], [ "C5", 0.5 ], [ "A3", 0.5 ], [ "A4", 0.5 ], [ "A#3", 0.5 ], [ "A#4", 0.5 ], [ "-", 1 ],
			[ "-", 2 ],
			[ "F3", 0.5 ], [ "F4", 0.5 ], [ "D3", 0.5 ], [ "D4", 0.5 ], [ "D#3", 0.5 ], [ "D#4", 0.5 ], [ "-", 1 ],
			[ "-", 2 ],
			[ "D#4", 0.5 ], [ "D4", 0.5 ], [ "C#4", 0.5 ], [ "C4", 0.5 ], [ "-", 2 ],
			[ "-", 2 ],
		],
		bass: [
			[ "-", 1 ], [ "-", 1 ], [ "-", 1 ], [ "-", 1 ], [ "C2", 0.5 ], [ "-", 0.5 ], [ "C2", 0.5 ], [ "-", 0.5 ],
			[ "-", 1 ], [ "-", 1 ], [ "-", 1 ], [ "-", 1 ], [ "F2", 0.5 ], [ "-", 0.5 ], [ "F2", 0.5 ], [ "-", 0.5 ],
			[ "-", 1 ], [ "-", 1 ], [ "-", 1 ], [ "-", 1 ], [ "G2", 0.5 ], [ "-", 0.5 ], [ "G2", 0.5 ], [ "-", 0.5 ],
		],
	},
	castle: {
		bpm: 140,
		wave: "sawtooth",
		melody: [
			[ "E4", 0.5 ], [ "F4", 0.5 ], [ "E4", 0.5 ], [ "D#4", 0.5 ], [ "E4", 0.5 ], [ "G4", 0.5 ], [ "A#4", 0.5 ], [ "A4", 0.5 ],
			[ "G4", 0.5 ], [ "-", 0.5 ], [ "E4", 0.5 ], [ "-", 0.5 ], [ "C5", 0.5 ], [ "B4", 0.5 ], [ "G#4", 0.5 ], [ "E4", 0.5 ],
			[ "F4", 0.5 ], [ "G4", 0.5 ], [ "F4", 0.5 ], [ "E4", 0.5 ], [ "F4", 0.5 ], [ "A4", 0.5 ], [ "C5", 0.5 ], [ "B4", 0.5 ],
			[ "A4", 0.5 ], [ "-", 0.5 ], [ "F4", 0.5 ], [ "-", 0.5 ], [ "D5", 0.5 ], [ "C#5", 0.5 ], [ "A4", 0.5 ], [ "F4", 0.5 ],
		],
		bass: [
			[ "E2", 0.5 ], [ "E2", 0.5 ], [ "E3", 0.5 ], [ "E2", 0.5 ], [ "E2", 0.5 ], [ "E2", 0.5 ], [ "E3", 0.5 ], [ "E2", 0.5 ],
			[ "E2", 0.5 ], [ "E2", 0.5 ], [ "E3", 0.5 ], [ "E2", 0.5 ], [ "C3", 0.5 ], [ "C3", 0.5 ], [ "B2", 0.5 ], [ "B2", 0.5 ],
			[ "F2", 0.5 ], [ "F2", 0.5 ], [ "F3", 0.5 ], [ "F2", 0.5 ], [ "F2", 0.5 ], [ "F2", 0.5 ], [ "F3", 0.5 ], [ "F2", 0.5 ],
			[ "F2", 0.5 ], [ "F2", 0.5 ], [ "F3", 0.5 ], [ "F2", 0.5 ], [ "D3", 0.5 ], [ "D3", 0.5 ], [ "C#3", 0.5 ], [ "C#3", 0.5 ],
		],
	},
};

export class Audio {
	constructor() {
		this.ctx = null;
		this.master = null;
		this.muted = false;
		this.music = null;
		this.timer = null;
	}

	// Must be called from a user gesture before anything can play.
	unlock() {
		if (this.ctx) {
			if (this.ctx.state === "suspended") {
				this.ctx.resume();
			}
			return;
		}
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) {
			return;
		}
		this.ctx = new AC();
		this.master = this.ctx.createGain();
		this.master.gain.value = this.muted ? 0 : 0.5;
		this.master.connect(this.ctx.destination);
		this.sfxGain = this.ctx.createGain();
		this.sfxGain.gain.value = 0.6;
		this.sfxGain.connect(this.master);
		this.musicGain = this.ctx.createGain();
		this.musicGain.gain.value = 0.35;
		this.musicGain.connect(this.master);
		if (this.pendingMusic) {
			this.playMusic(this.pendingMusic);
		}
	}

	setMuted(m) {
		this.muted = m;
		if (this.master) {
			this.master.gain.value = m ? 0 : 0.5;
		}
	}

	tone({ type = "square", freq = 440, to = null, dur = 0.1, vol = 0.3, delay = 0, slide = null }) {
		if (!this.ctx) {
			return;
		}
		const t = this.ctx.currentTime + delay;
		const osc = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(freq, t);
		if (to) {
			osc.frequency.exponentialRampToValueAtTime(to, t + dur);
		}
		if (slide) {
			osc.frequency.linearRampToValueAtTime(slide, t + dur);
		}
		g.gain.setValueAtTime(vol, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + dur);
		osc.connect(g);
		g.connect(this.sfxGain);
		osc.start(t);
		osc.stop(t + dur + 0.02);
	}

	noise(dur = 0.1, vol = 0.2, delay = 0) {
		if (!this.ctx) {
			return;
		}
		const ctx = this.ctx;
		const len = Math.floor(ctx.sampleRate * dur);
		const buf = ctx.createBuffer(1, len, ctx.sampleRate);
		const data = buf.getChannelData(0);
		for (let i = 0; i < len; i++) {
			data[i] = (Math.random() * 2 - 1) * (1 - i / len);
		}
		const src = ctx.createBufferSource();
		src.buffer = buf;
		const g = ctx.createGain();
		g.gain.value = vol;
		src.connect(g);
		g.connect(this.sfxGain);
		src.start(ctx.currentTime + delay);
	}

	play(name) {
		if (!this.ctx) {
			return;
		}
		switch (name) {
			case "jump":
				this.tone({ freq: 300, to: 700, dur: 0.14, vol: 0.25 });
				break;
			case "coin":
				this.tone({ freq: 988, dur: 0.07, vol: 0.25 });
				this.tone({ freq: 1319, dur: 0.25, vol: 0.25, delay: 0.07 });
				break;
			case "stomp":
				this.tone({ freq: 500, to: 120, dur: 0.12, vol: 0.3 });
				this.noise(0.06, 0.15);
				break;
			case "kick":
				this.tone({ freq: 200, to: 900, dur: 0.1, vol: 0.3 });
				break;
			case "bump":
				this.tone({ type: "triangle", freq: 180, to: 90, dur: 0.1, vol: 0.4 });
				break;
			case "break":
				this.noise(0.18, 0.3);
				this.tone({ type: "triangle", freq: 220, to: 60, dur: 0.18, vol: 0.3 });
				break;
			case "itemout":
				this.tone({ freq: 200, to: 1000, dur: 0.35, vol: 0.2 });
				break;
			case "powerup":
				[ 523, 659, 784, 1047, 1319, 1568 ].forEach((f, i) => this.tone({ freq: f, dur: 0.09, vol: 0.25, delay: i * 0.06 }));
				break;
			case "oneup":
				[ 659, 784, 1319, 1047, 1175, 1568 ].forEach((f, i) => this.tone({ freq: f, dur: 0.1, vol: 0.25, delay: i * 0.08 }));
				break;
			case "shrink":
				[ 600, 400, 600, 400, 300 ].forEach((f, i) => this.tone({ freq: f, dur: 0.08, vol: 0.2, delay: i * 0.08 }));
				break;
			case "die":
				this.stopMusic();
				this.tone({ freq: 500, dur: 0.15, vol: 0.3 });
				[ 494, 440, 392, 330, 262, 196 ].forEach((f, i) => this.tone({ freq: f, dur: 0.16, vol: 0.3, delay: 0.3 + i * 0.14 }));
				break;
			case "spark":
				this.tone({ freq: 900, to: 300, dur: 0.1, vol: 0.2 });
				break;
			case "pipe":
				this.tone({ type: "triangle", freq: 400, to: 100, dur: 0.4, vol: 0.3 });
				break;
			case "goal":
				this.stopMusic();
				[ 392, 523, 659, 784, 1047 ].forEach((f, i) => this.tone({ freq: f, dur: 0.12, vol: 0.25, delay: i * 0.07 }));
				break;
			case "skid":
				this.noise(0.08, 0.08);
				break;
			case "bosshit":
				this.tone({ type: "sawtooth", freq: 300, to: 60, dur: 0.3, vol: 0.3 });
				this.noise(0.15, 0.2);
				break;
			case "bossdead":
				[ 0, 0.15, 0.3, 0.45 ].forEach((d) => this.noise(0.2, 0.3, d));
				[ 262, 330, 392, 523, 659, 784, 1047 ].forEach((f, i) => this.tone({ freq: f, dur: 0.14, vol: 0.25, delay: 0.5 + i * 0.09 }));
				break;
			case "thud":
				this.noise(0.1, 0.25);
				this.tone({ type: "triangle", freq: 90, to: 40, dur: 0.2, vol: 0.4 });
				break;
			case "bossjump":
				this.tone({ type: "sawtooth", freq: 120, to: 300, dur: 0.2, vol: 0.15 });
				break;
			case "gate":
				[ 523, 659, 784 ].forEach((f, i) => this.tone({ type: "triangle", freq: f, dur: 0.3, vol: 0.3, delay: i * 0.12 }));
				break;
			case "pause":
				this.tone({ freq: 880, dur: 0.06, vol: 0.2 });
				this.tone({ freq: 1175, dur: 0.1, vol: 0.2, delay: 0.07 });
				break;
			case "unpause":
				this.tone({ freq: 1175, dur: 0.06, vol: 0.2 });
				this.tone({ freq: 880, dur: 0.1, vol: 0.2, delay: 0.07 });
				break;
			case "select":
				this.tone({ freq: 660, dur: 0.05, vol: 0.15 });
				break;
			case "start":
				[ 523, 659, 784 ].forEach((f, i) => this.tone({ freq: f, dur: 0.1, vol: 0.25, delay: i * 0.06 }));
				break;
			case "tick":
				this.tone({ freq: 1200, dur: 0.03, vol: 0.12 });
				break;
			case "hurry":
				[ 880, 880, 880, 988, 1175 ].forEach((f, i) => this.tone({ freq: f, dur: 0.08, vol: 0.25, delay: i * 0.1 }));
				break;
			case "gameover":
				[ 523, 392, 330, 262 ].forEach((f, i) => this.tone({ type: "triangle", freq: f, dur: 0.35, vol: 0.3, delay: i * 0.3 }));
				break;
			case "clear":
				[ 523, 587, 659, 784, 880, 1047, 1319 ].forEach((f, i) => this.tone({ freq: f, dur: 0.14, vol: 0.25, delay: i * 0.08 }));
				break;
		}
	}

	playMusic(name) {
		if (!this.ctx) {
			this.pendingMusic = name;
			return;
		}
		this.pendingMusic = null;
		const tune = TUNES[name];
		if (!tune) {
			return;
		}
		this.stopMusic();
		this.music = { tune, beat: 60 / tune.bpm, mi: 0, bi: 0, nextM: this.ctx.currentTime + 0.1, nextB: this.ctx.currentTime + 0.1 };
		this.timer = setInterval(() => this.schedule(), 100);
		this.schedule();
	}

	stopMusic() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
		this.music = null;
		this.pendingMusic = null;
	}

	schedule() {
		const m = this.music;
		if (!m || !this.ctx) {
			return;
		}
		const ahead = this.ctx.currentTime + 0.3;
		while (m.nextM < ahead) {
			const [ note, beats ] = m.tune.melody[m.mi];
			if (note !== "-") {
				this.note(m.tune.wave, NOTE[note], m.nextM, beats * m.beat * 0.85, 0.16);
			}
			m.nextM += beats * m.beat;
			m.mi = (m.mi + 1) % m.tune.melody.length;
		}
		while (m.nextB < ahead) {
			const [ note, beats ] = m.tune.bass[m.bi];
			if (note !== "-") {
				this.note("triangle", NOTE[note], m.nextB, beats * m.beat * 0.9, 0.3);
			}
			m.nextB += beats * m.beat;
			m.bi = (m.bi + 1) % m.tune.bass.length;
		}
	}

	note(type, freq, t, dur, vol) {
		const osc = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		osc.type = type;
		osc.frequency.value = freq;
		g.gain.setValueAtTime(0.0001, t);
		g.gain.linearRampToValueAtTime(vol, t + 0.01);
		g.gain.setValueAtTime(vol, t + dur * 0.6);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		osc.connect(g);
		g.connect(this.musicGain);
		osc.start(t);
		osc.stop(t + dur + 0.02);
	}
}
