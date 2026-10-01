// 1. Meadow Mile (overworld)
import { room } from "./builder.js";

const main = room(190, 12, { theme: "overworld" });
main.ground(0, 189);
main.set(3, 9, "S");
main.set(16, 6, "?");
main.row(20, 6, "=?M?=");
main.spawn("grumble", 26, 9);
main.pipe(32, 2);
main.pipe(40, 3);
main.spawn("grumble", 46, 9);
main.pipe(50, 4);
main.warp({ tx: 50, ty: 6, to: { room: "bonus", x: 2, y: 1, exit: "none" } });
main.pit(58, 60);
main.row(64, 6, "?==?");
main.set(70, 5, "!");
main.spawn("grumble", 72, 9);
main.spawn("grumble", 75, 9);
main.pit(80, 82);
main.row(85, 6, "=M=");
main.row(84, 2, "=====");
main.coins(84, 1, 5);
main.stairs(94, 4, 1);
main.stairs(101, 4, -1);
main.pipe(106, 2);
main.spawn("clanker", 112, 9);
main.set(116, 6, "?");
main.row(118, 2, "====");
main.coins(118, 1, 4);
main.spawn("grumble", 122, 9);
main.pit(126, 128);
main.spawn("flitter", 132, 5, { range: 40 });
main.pillar(136, 1);
main.pillar(137, 2);
main.pillar(138, 3);
main.pit(139, 142);
main.pillar(143, 2);
main.pillar(144, 1);
main.row(150, 6, "?o?");
main.spawn("grumble", 150, 9);
main.spawn("grumble", 153, 9);
main.stairs(160, 8, 1);
main.pole(176);

const bonus = room(22, 12, { theme: "underground" });
bonus.ground(0, 21);
bonus.fill(0, 0, 21, 0, "=");
bonus.fill(0, 1, 0, 9, "=");
bonus.fill(3, 4, 12, 4, "=");
bonus.coins(3, 7, 10);
bonus.coins(3, 8, 10);
bonus.coins(3, 9, 10);
bonus.pipe(17, 2);
bonus.warp({ tx: 17, ty: 8, to: { room: "main", x: 106, y: 8, exit: "up" } });

export default {
	name: "Meadow Mile",
	theme: "overworld",
	music: "overworld",
	time: 300,
	rooms: { main: main.build(), bonus: bonus.build() },
};
