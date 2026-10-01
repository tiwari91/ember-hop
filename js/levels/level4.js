// 4. Crag Keep (castle) with Baron Thornback
import { room } from "./builder.js";

const main = room(186, 12, { theme: "castle" });
main.ground(0, 185, 2, "C");
main.fill(0, 0, 185, 1, "C");
main.set(3, 9, "S");
main.fill(12, 10, 14, 11, "~");
main.fill(16, 10, 25, 11, "~");
main.fill(18, 7, 19, 7, "C");
main.fill(22, 8, 23, 8, "C");
main.spawn("clanker", 30, 9);
main.spawn("flitter", 34, 5);
main.row(36, 6, "?M?");
main.fill(40, 10, 42, 11, "~");
main.pillar(43, 2, 10, "C");
main.pillar(44, 2, 10, "C");
main.fill(45, 10, 47, 11, "~");
main.spawn("grumble", 52, 9);
main.spawn("grumble", 55, 9);
main.fill(50, 2, 62, 5, "C");
main.fill(64, 10, 72, 11, "~");
main.spawn("platformH", 66, 7, { range: 2, speed: 0.025 });
main.spawn("flitter", 76, 4);
main.spawn("flitter", 80, 6);
main.stairs(84, 3, 1, 10, "C");
main.fill(87, 7, 94, 9, "C");
main.spawn("clanker", 90, 6);
main.fill(98, 10, 100, 11, "~");
main.set(104, 5, "!");
main.coins(106, 6, 5);
main.spawn("clanker", 108, 9);
main.spawn("grumble", 112, 9);
main.spawn("grumble", 114, 9);
main.spawn("grumble", 116, 9);
main.fill(120, 10, 123, 11, "~");
main.spawn("platformV", 121, 7, { range: 2, speed: 0.02 });
main.pillar(128, 1, 10, "C");
main.pillar(130, 2, 10, "C");
main.pillar(132, 3, 10, "C");
main.fill(133, 10, 135, 11, "~");
main.pillar(136, 3, 10, "C");
main.pillar(137, 2, 10, "C");
main.set(142, 6, "M");
main.pillar(149, 3, 10, "C");
main.spawn("boss", 166, 9);
main.fill(178, 2, 178, 9, "D");

export default {
	name: "Crag Keep",
	theme: "castle",
	music: "castle",
	time: 300,
	rooms: { main: main.build() },
};
