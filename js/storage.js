// Best score, unlocked levels and mute flag in localStorage, always guarded.
const KEY = "ember-hop-save-v1";

export function loadSave() {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) {
			return {};
		}
		const data = JSON.parse(raw);
		return typeof data === "object" && data ? data : {};
	} catch (err) {
		return {};
	}
}

export function writeSave(data) {
	try {
		localStorage.setItem(KEY, JSON.stringify(data));
		return true;
	} catch (err) {
		return false;
	}
}
