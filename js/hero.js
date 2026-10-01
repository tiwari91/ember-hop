// The heroine. Drop a square portrait at assets/hero-face.png and it becomes
// Ember's face in 3D, the HUD portrait and the level card portrait. Without it
// the game uses the drawn face.
export const HERO = {
	name: "Ember",
	face: null, // HTMLImageElement once assets/hero-face.png has loaded
	facePath: "assets/hero-face.png",
};

export function loadHeroFace(onLoad) {
	if (typeof Image === "undefined") {
		return;
	}
	const img = new Image();
	img.onload = () => {
		// The shipped file is a 1x1 placeholder so the page never 404s; any real
		// portrait (bigger than 2px) replaces the drawn face.
		if (img.naturalWidth <= 2 || img.naturalHeight <= 2) {
			HERO.face = null;
			return;
		}
		HERO.face = img;
		if (onLoad) {
			onLoad(img);
		}
	};
	img.onerror = () => {
		HERO.face = null;
	};
	img.src = HERO.facePath;
}
