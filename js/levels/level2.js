// 2. Hollow Deep (underground)
import { room } from "./builder.js";

const main = room(200, 12, { theme: "underground" });
main.ground(0, 199);
main.fill(0, 0, 199, 0, "#");
main.set(3, 9, "S");
main.row(8, 4, "=====");
main.coins(8, 3, 5);
main.spawn("clanker", 14, 9);
main.row(20, 6, "?M?");
main.fill(28, 1, 32, 5, "#");
main.pit(36, 38);
main.spawn("flitter", 42, 5);
main.stairs(46, 3, 1);
main.fill(49, 7, 60, 9, "#");
main.spawn("grumble", 52, 6);
main.spawn("grumble", 56, 6);
main.coins(50, 5, 9);
main.pit(61, 63);
main.row(66, 6, "=====");
main.set(68, 2, "!");
main.spawn("clanker", 74, 9);
main.spawn("grumble", 78, 9);
main.pit(82, 93);
main.spawn("platformH", 84, 7, { range: 2, speed: 0.025 });
main.spawn("platformH", 90, 7, { range: 2, speed: 0.025, phase: Math.PI });
main.pipe(98, 3, 10, true);
main.spawn("flitter", 104, 4);
main.row(108, 6, "=?=?=");
main.spawn("flitter", 112, 6);
main.pit(118, 120);
main.spawn("clanker", 124, 9);
main.spawn("grumble", 132, 9);
main.spawn("grumble", 135, 9);
main.spawn("grumble", 138, 9);
main.fill(140, 1, 160, 4, "#");
main.pillar(146, 2);
main.pit(147, 149);
main.pillar(150, 2);
main.pit(151, 153);
main.pillar(154, 2);
main.pit(158, 160);
main.spawn("platformV", 164, 7, { range: 2, speed: 0.02 });
main.fill(168, 5, 180, 9, "#");
main.spawn("grumble", 174, 4);
main.coins(170, 3, 6);
main.pipe(190, 3, 10, false);
main.warp({ tx: 190, ty: 7, to: { room: "exit", x: 3, y: 8, exit: "up" } });

const exit = room(30, 12, { theme: "overworld" });
exit.ground(0, 29);
exit.pipe(3, 2);
exit.set(10, 6, "?");
exit.stairs(12, 4, 1);
exit.pole(22);

export default {
	name: "Hollow Deep",
	theme: "underground",
	music: "underground",
	time: 300,
	rooms: { main: main.build(), exit: exit.build() },
};
