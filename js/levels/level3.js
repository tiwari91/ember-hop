// 3. Windy Ridge (overworld at dusk)
import { room } from "./builder.js";

const main = room(222, 12, { theme: "dusk" });
main.ground(0, 221);
main.set(3, 9, "S");
main.set(8, 6, "?");
main.set(12, 6, "M");
main.pipe(16, 2, 10, true);
main.pipe(24, 3, 10, true);
main.pit(31, 33);
main.pillar(38, 2);
main.pillar(39, 2);
main.pit(40, 42);
main.pillar(43, 3);
main.pillar(44, 3);
main.pit(45, 47);
main.pillar(48, 4);
main.pillar(49, 4);
main.pillar(50, 4);
main.spawn("grumble", 54, 9);
main.spawn("grumble", 57, 9);
main.row(56, 6, "=?=?=");
main.row(55, 2, "=======");
main.coins(55, 1, 7);
main.spawn("flitter", 66, 5);
main.pit(70, 84);
main.spawn("platformH", 72, 7, { range: 3, speed: 0.022 });
main.spawn("platformH", 79, 6, { range: 3, speed: 0.022, phase: Math.PI / 2 });
main.spawn("flitter", 78, 3, { range: 30 });
main.pipe(90, 2, 10, true);
main.spawn("clanker", 96, 9);
main.fill(98, 6, 110, 6, "=");
main.spawn("grumble", 100, 9);
main.spawn("grumble", 102, 9);
main.spawn("grumble", 104, 9);
main.spawn("grumble", 106, 9);
main.pit(112, 114);
main.stairs(118, 4, 1);
main.fill(122, 6, 130, 9, "B");
main.spawn("flitter", 126, 2);
main.coins(123, 4, 7);
main.stairs(134, 4, -1);
main.pit(138, 140);
main.pipe(144, 4, 10, true);
main.set(150, 5, "!");
main.set(152, 6, "M");
main.spawn("clanker", 156, 9);
main.spawn("clanker", 160, 9);
main.spawn("grumble", 164, 9);
main.spawn("grumble", 166, 9);
main.pit(170, 172);
main.pillar(173, 2);
main.pillar(174, 3);
main.pit(175, 177);
main.pit(184, 187);
main.spawn("platformV", 185, 6, { range: 2, speed: 0.025 });
main.spawn("grumble", 192, 9);
main.spawn("grumble", 195, 9);
main.stairs(200, 8, 1);
main.pole(215);

export default {
	name: "Windy Ridge",
	theme: "dusk",
	music: "overworld",
	time: 300,
	rooms: { main: main.build() },
};
