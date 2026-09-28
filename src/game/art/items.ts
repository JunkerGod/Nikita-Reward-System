import { INK, blob, circle, clipped, ellipse, fillStroke, heartPath, linGrad, poly, radGrad, rng, rrect, shade, text, type Ctx } from "./draw";
import { AAYAM, CHICHI, OUTFITS, drawPerson, type Look } from "./people";

// Every collectible, drawn in a 100 x 100 box centred on (0, 0). The same drawing is used for
// the small pickup in the level and the big pop-up, so the details match.

export type ItemId =
  | "boba"
  | "skewers"
  | "burger"
  | "strip"
  | "smiski"
  | "bouquet"
  | "ferrero"
  | "njheart"
  | "yochi"
  | "chai"
  | "flan"
  | "watermelon"
  | "kfc"
  | "rose"
  | "lily"
  | "goldrose"
  | "heart";

const W = 2.2; // outline width in item units

function boba(ctx: Ctx) {
  // straw behind the lid
  ctx.save();
  ctx.translate(10, -40);
  ctx.rotate(0.28);
  rrect(ctx, -4.5, -26, 9, 40, 3);
  fillStroke(ctx, "#f28bb0", INK, W);
  ctx.restore();
  // cup
  const cup = () => poly(ctx, [
    [-27, -34],
    [27, -34],
    [21, 40],
    [-21, 40],
  ]);
  cup();
  fillStroke(ctx, linGrad(ctx, 0, -30, 0, 40, [
    [0, "#e7c9a4"],
    [1, "#c7976a"],
  ]), INK, W);
  cup();
  clipped(ctx, () => {
    // pearls
    const r = rng(4);
    for (let i = 0; i < 22; i++) {
      const x = -20 + r() * 40;
      const y = 22 + r() * 18;
      circle(ctx, x, y, 4.2);
      ctx.fillStyle = "#2c1a12";
      ctx.fill();
      circle(ctx, x - 1.3, y - 1.4, 1.2);
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fill();
    }
    // milk swirl + plastic shine
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-26, -8);
    ctx.bezierCurveTo(-8, -16, 6, 2, 26, -10);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(-19, -30, 5, 62);
  });
  // sealed lid film
  ellipse(ctx, 0, -34, 28, 5.5);
  fillStroke(ctx, "#fff4f8", INK, W);
  heartPath(ctx, 0, -33, 5);
  ctx.fillStyle = "#f28bb0";
  ctx.fill();
  // straw through the film
  ctx.save();
  ctx.translate(10, -40);
  ctx.rotate(0.28);
  rrect(ctx, -4.5, -26, 9, 22, 3);
  fillStroke(ctx, "#f28bb0", INK, W);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(-2.5, -24, 2, 18);
  ctx.restore();
  // sticker
  rrect(ctx, -13, 4, 26, 12, 6);
  fillStroke(ctx, "#fff", INK, 1.4);
  text(ctx, "boba", 0, 10.5, 8, "#c92f6d");
}

function skewers(ctx: Ctx) {
  const r = rng(9);
  // skewers first (behind the cup rim)
  const sticks: { x: number; top: number; kind: "long" | "pop" | "meat" | "cheese"; tilt: number }[] = [
    { x: -20, top: -48, kind: "long", tilt: -0.14 },
    { x: -11, top: -44, kind: "pop", tilt: -0.07 },
    { x: -3, top: -46, kind: "pop", tilt: -0.02 },
    { x: 4, top: -50, kind: "meat", tilt: 0.02 },
    { x: 10, top: -48, kind: "meat", tilt: 0.06 },
    { x: 17, top: -42, kind: "cheese", tilt: 0.1 },
    { x: 23, top: -40, kind: "cheese", tilt: 0.16 },
  ];
  for (const s of sticks) {
    ctx.save();
    ctx.translate(s.x, -8);
    ctx.rotate(s.tilt);
    const len = -8 - s.top;
    ctx.fillStyle = "#e3c58f";
    ctx.fillRect(-1, -len - 7, 2, 8);
    const col = s.kind === "long" ? "#d7792d" : s.kind === "pop" ? "#e39a45" : s.kind === "meat" ? "#6b3620" : "#e9c25d";
    if (s.kind === "pop" || s.kind === "meat") {
      for (let y = -4; y > -len; y -= 7.5) {
        blob(ctx, [
          [-5, y],
          [-4, y - 6],
          [0, y - 8.5],
          [5, y - 5],
          [4, y + 1],
        ]);
        fillStroke(ctx, shade(col, (r() - 0.5) * 0.15), INK, 1.4);
      }
    } else {
      rrect(ctx, s.kind === "long" ? -5.5 : -4.5, -len, s.kind === "long" ? 11 : 9, len, 4);
      fillStroke(ctx, col, INK, 1.4);
      ctx.fillStyle = shade(col, -0.25);
      for (let i = 0; i < 16; i++) {
        circle(ctx, (r() - 0.5) * 7, -r() * len, 0.9);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  // red cup
  const cup = () => poly(ctx, [
    [-28, -12],
    [28, -12],
    [22, 46],
    [-22, 46],
  ]);
  cup();
  fillStroke(ctx, "#d3262d", INK, W);
  cup();
  clipped(ctx, () => {
    // peach clouds at the top of the cup
    ctx.fillStyle = "#f4b39b";
    for (const [x, y, s] of [
      [-22, -8, 9],
      [-10, -10, 10],
      [4, -9, 8],
      [15, -11, 9],
    ] as const) {
      circle(ctx, x, y, s);
      ctx.fill();
    }
    ctx.strokeStyle = "#e07a62";
    ctx.lineWidth = 1.2;
    for (const [x, y] of [
      [-14, -5],
      [8, -6],
    ] as const) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0.2, 4.6);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(14, -12, 14, 60);
    // burger/grill doodle at the bottom
    ctx.fillStyle = "#f0c27a";
    ellipse(ctx, 8, 40, 12, 5);
    ctx.fill();
  });
  // logo
  circle(ctx, 0, 16, 13);
  fillStroke(ctx, "#c01f27", "#fff", 1.6);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, 5);
  ctx.lineTo(6, 13);
  ctx.moveTo(6, 5);
  ctx.lineTo(-6, 13);
  ctx.stroke();
  text(ctx, "BIGZ", 0, 19, 7, "#fff");
  text(ctx, "SKEWER HOUSE", 0, 25, 2.8, "#fff");
  // gold rim
  rrect(ctx, -30, -15, 60, 5, 2.5);
  fillStroke(ctx, "#d9b35a", INK, 1.6);
}

function burger(ctx: Ctx) {
  // kraft box lid behind
  poly(ctx, [
    [-10, -46],
    [44, -40],
    [40, 6],
    [-12, 4],
  ]);
  fillStroke(ctx, "#caa27a", INK, W);
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fill();
  // can of Pepsi Max behind
  rrect(ctx, 26, -34, 16, 30, 3);
  fillStroke(ctx, "#18161a", INK, 1.6);
  circle(ctx, 34, -22, 5);
  ctx.fillStyle = "#1f58b8";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(34, -22, 5, Math.PI * 1.1, Math.PI * 1.9);
  ctx.fillStyle = "#e3263a";
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillRect(29, -23, 10, 1.4);
  // box base
  poly(ctx, [
    [-46, -4],
    [40, -4],
    [36, 40],
    [-42, 40],
  ]);
  fillStroke(ctx, "#d2ab80", INK, W);
  // fries with pink sauce and pickles
  const r = rng(3);
  for (let i = 0; i < 16; i++) {
    ctx.save();
    ctx.translate(-8 + r() * 44, -2 + r() * 8);
    ctx.rotate((r() - 0.5) * 1.6);
    rrect(ctx, -2.2, -11, 4.4, 20, 1.4);
    fillStroke(ctx, "#f2c35f", INK, 1.1);
    ctx.restore();
  }
  ctx.strokeStyle = "#e6a08c";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-4, -6);
  ctx.bezierCurveTo(6, 4, 14, -10, 24, 2);
  ctx.bezierCurveTo(30, 8, 34, -4, 36, 2);
  ctx.stroke();
  for (const [x, y] of [
    [8, 4],
    [26, -6],
    [30, 8],
  ] as const) {
    circle(ctx, x, y, 4.2);
    fillStroke(ctx, "#8fae4a", INK, 1.2);
    circle(ctx, x, y, 2.4);
    ctx.strokeStyle = "#c5d88a";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  // fried chicken tender poking out
  blob(ctx, [
    [-44, -16],
    [-30, -24],
    [-16, -20],
    [-12, -10],
    [-30, -4],
    [-46, -6],
  ]);
  fillStroke(ctx, "#c56a2a", INK, W);
  ctx.fillStyle = "#9e4e1c";
  for (let i = 0; i < 20; i++) {
    circle(ctx, -42 + r() * 28, -20 + r() * 14, 1.1);
    ctx.fill();
  }
  // brioche bun with the scored top
  ellipse(ctx, -14, -6, 24, 17);
  fillStroke(ctx, linGrad(ctx, 0, -22, 0, 12, [
    [0, "#e58a3a"],
    [1, "#c9651e"],
  ]), INK, W);
  ctx.strokeStyle = "#8f4414";
  ctx.lineWidth = 2;
  for (const dx of [-10, -2, 6]) {
    ctx.beginPath();
    ctx.moveTo(-14 + dx - 5, -14);
    ctx.quadraticCurveTo(-14 + dx, -6, -14 + dx - 3, 2);
    ctx.stroke();
  }
  ellipse(ctx, -22, -14, 6, 3, -0.4);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fill();
  // lettuce peeking under the bun
  ctx.strokeStyle = "#9cc15a";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-36, 8);
  ctx.quadraticCurveTo(-26, 12, -14, 9);
  ctx.quadraticCurveTo(-4, 12, 8, 7);
  ctx.stroke();
}

function miniPeople(ctx: Ctx, people: { look: Look; x: number; flip?: boolean; kind?: "idle" | "kiss" | "wave" }[], y: number, s: number) {
  for (const p of people) {
    ctx.save();
    ctx.translate(p.x, y);
    ctx.scale(p.flip ? -s : s, s);
    drawPerson(ctx, p.look, { kind: p.kind ?? "idle", t: 0, happy: p.kind !== "kiss" });
    ctx.restore();
  }
}

function strip(ctx: Ctx, detailed: boolean) {
  const fw = 42;
  const fh = 96;
  rrect(ctx, -fw / 2, -fh / 2, fw, fh, 2.5);
  fillStroke(ctx, linGrad(ctx, 0, -fh / 2, 0, fh / 2, [
    [0, "#f5b3cc"],
    [0.55, "#c9b8ee"],
    [1, "#a9b4ec"],
  ]), INK, W);
  const panels = 4;
  const ph = 18.5;
  const nik = { ...OUTFITS.nikita.jul26, bearEars: "#c9a27a" };
  const chi = { ...CHICHI, bearEars: "#c9a27a" };
  const jag = OUTFITS.jagath.jul26;
  for (let i = 0; i < panels; i++) {
    const py = -fh / 2 + 9 + i * (ph + 2.6);
    rrect(ctx, -fw / 2 + 3.5, py, fw - 7, ph, 1.2);
    fillStroke(ctx, linGrad(ctx, 0, py, 0, py + ph, [
      [0, "#cfe6fb"],
      [1, "#8fc2ee"],
    ]), INK, 1);
    if (detailed) {
      rrect(ctx, -fw / 2 + 3.5, py, fw - 7, ph, 1.2);
      clipped(ctx, () => {
        const base = py + ph + 22;
        if (i === 0) miniPeople(ctx, [{ look: nik, x: -6 }, { look: chi, x: 6, flip: true }], base, 0.72);
        if (i === 1) miniPeople(ctx, [{ look: nik, x: -4, kind: "kiss" }, { look: jag, x: 5, flip: true, kind: "kiss" }], base + 4, 0.72);
        if (i === 2) miniPeople(ctx, [{ look: chi, x: -5, kind: "wave" }, { look: AAYAM, x: 7, flip: true }], base + 4, 0.72);
        if (i === 3)
          miniPeople(
            ctx,
            [
              { look: jag, x: -11 },
              { look: nik, x: -3 },
              { look: chi, x: 5, flip: true },
              { look: AAYAM, x: 12, flip: true },
            ],
            base + 6,
            0.62,
          );
      });
    }
  }
  // stickers from the Hamafilm frame
  circle(ctx, fw / 2 - 6, -fh / 2 + 9, 4.6);
  fillStroke(ctx, "#ffd84a", INK, 1.1);
  ctx.fillStyle = INK;
  circle(ctx, fw / 2 - 7.6, -fh / 2 + 8.2, 0.7);
  ctx.fill();
  circle(ctx, fw / 2 - 4.4, -fh / 2 + 8.2, 0.7);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(fw / 2 - 6, -fh / 2 + 9.6, 2.2, 0.3, Math.PI - 0.3);
  ctx.stroke();
  rrect(ctx, -fw / 2 + 1.5, -fh / 2 + 24, 8, 6, 1.4);
  fillStroke(ctx, "#fff", INK, 0.9);
  heartPath(ctx, -fw / 2 + 5.5, -fh / 2 + 28, 2.2);
  ctx.fillStyle = "#ef5f95";
  ctx.fill();
  rrect(ctx, fw / 2 - 17, -fh / 2 + 24.5, 14, 4.4, 1);
  fillStroke(ctx, "#fff", INK, 0.7);
  text(ctx, "YES", fw / 2 - 13.4, -fh / 2 + 26.8, 2.4, "#e3558d");
  text(ctx, "NO", fw / 2 - 6.6, -fh / 2 + 26.8, 2.4, "#6477c9");
  // window bar
  rrect(ctx, -fw / 2 + 3.5, 1, fw - 7, 3.4, 0.8);
  fillStroke(ctx, "#7c86d8", INK, 0.7);
  text(ctx, "□ - ×", fw / 2 - 9, 2.8, 2.4, "#fff", { weight: 700 });
  text(ctx, "hamafilm", 0, -fh / 2 + 4.6, 3.6, "#3b2430", { weight: 800 });
  text(ctx, "HAMA", 0, fh / 2 - 4, 4, "#3b2430");
}

export function smiski(ctx: Ctx, glow = true) {
  if (glow) {
    circle(ctx, 0, 0, 50);
    ctx.fillStyle = radGrad(ctx, 0, -2, 8, 50, [
      [0, "rgba(214,250,160,0.55)"],
      [1, "rgba(214,250,160,0)"],
    ]);
    ctx.fill();
  }
  const body = "#dff4b4";
  // legs
  rrect(ctx, -11, 26, 9, 16, 4);
  fillStroke(ctx, body, INK, W);
  rrect(ctx, 2, 26, 9, 16, 4);
  fillStroke(ctx, body, INK, W);
  // body
  ellipse(ctx, 0, 18, 15, 16);
  fillStroke(ctx, body, INK, W);
  // head
  ellipse(ctx, 0, -12, 23, 21);
  fillStroke(ctx, body, INK, W);
  // droopy night cap flopping to one side
  ctx.beginPath();
  ctx.moveTo(-23, -14);
  ctx.bezierCurveTo(-24, -40, 18, -42, 23, -16);
  ctx.bezierCurveTo(18, -22, 6, -26, -6, -24);
  ctx.bezierCurveTo(-18, -22, -26, -8, -34, -6);
  ctx.bezierCurveTo(-30, -9, -26, -12, -23, -14);
  ctx.closePath();
  fillStroke(ctx, "#a9d65c", INK, W);
  ctx.beginPath();
  ctx.moveTo(-23, -15);
  ctx.bezierCurveTo(-10, -22, 10, -22, 23, -16);
  ctx.strokeStyle = "#8cbf45";
  ctx.lineWidth = 3;
  ctx.stroke();
  // face
  ctx.fillStyle = "#2a2a22";
  circle(ctx, -7, -6, 2.1);
  ctx.fill();
  circle(ctx, 7, -6, 2.1);
  ctx.fill();
  circle(ctx, 0, 2, 1.4);
  ctx.fill();
  // arms holding the little green book
  rrect(ctx, -9, 8, 18, 15, 2);
  fillStroke(ctx, "#8cc24a", INK, W);
  ctx.strokeStyle = "#6fa336";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-5, 12);
  ctx.lineTo(5, 12);
  ctx.moveTo(-5, 16);
  ctx.lineTo(3, 16);
  ctx.stroke();
  ellipse(ctx, -11, 14, 4.2, 5.4, 0.4);
  fillStroke(ctx, body, INK, W);
  ellipse(ctx, 11, 14, 4.2, 5.4, -0.4);
  fillStroke(ctx, body, INK, W);
}

function petal(ctx: Ctx, cx: number, cy: number, a: number, len: number, wid: number, fill: string, edge: string | null) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-wid, -len * 0.35, -wid * 0.7, -len * 0.9, 0, -len);
  ctx.bezierCurveTo(wid * 0.7, -len * 0.9, wid, -len * 0.35, 0, 0);
  ctx.closePath();
  fillStroke(ctx, fill, edge ?? INK, edge ? 2.6 : 1.4);
  if (edge) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }
  // fuzzy pipe cleaner loops
  ctx.strokeStyle = "rgba(170,170,190,0.55)";
  ctx.lineWidth = 0.7;
  for (const f of [-0.45, 0, 0.45]) {
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(wid * f * 1.3, -len * 0.5, 0, -len + 2);
    ctx.stroke();
  }
  ctx.restore();
}

function flower(ctx: Ctx, x: number, y: number, size: number, edge: string | null, petals = 6, rot = 0) {
  for (let i = 0; i < petals; i++) petal(ctx, x, y, rot + (i / petals) * Math.PI * 2, size, size * 0.42, "#fbfbff", edge);
  for (let i = 0; i < 5; i++) {
    circle(ctx, x + Math.cos(i * 1.3) * 1.8, y + Math.sin(i * 1.3) * 1.8, 1.9);
    fillStroke(ctx, "#f1e04a", INK, 0.7);
  }
}

function bouquet(ctx: Ctx) {
  // paper wrap behind
  poly(ctx, [
    [-38, -18],
    [-20, -30],
    [0, -24],
    [22, -32],
    [40, -16],
    [8, 46],
    [-6, 46],
  ]);
  fillStroke(ctx, "#fbf6f8", INK, W);
  // coloured-edge flowers around
  flower(ctx, -24, -6, 15, "#2fb3d6", 5, 0.2);
  flower(ctx, 22, -2, 15, "#6a3bd1", 5, -0.3);
  flower(ctx, 20, -26, 12, "#39b54a", 5, 0.5);
  flower(ctx, -18, -30, 11, "#e2323f", 5, 0.1);
  // orange coiled flower
  circle(ctx, -8, 8, 11);
  fillStroke(ctx, "#f0561f", INK, W);
  ctx.strokeStyle = "#c73d10";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(-8, 8, 2.5 + i * 2.2, i, i + 4.2);
    ctx.stroke();
  }
  // the big white lily in the middle
  flower(ctx, 2, -14, 20, null, 6, 0.26);
  // paper front fold
  poly(ctx, [
    [-26, 12],
    [0, 20],
    [26, 10],
    [8, 46],
    [-6, 46],
  ]);
  fillStroke(ctx, "#ffffff", INK, W);
  ctx.strokeStyle = "#e9dfe4";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-10, 18);
  ctx.lineTo(0, 44);
  ctx.moveTo(12, 16);
  ctx.lineTo(4, 44);
  ctx.stroke();
}

function ferrero(ctx: Ctx) {
  for (const [x, y] of [
    [-20, 8],
    [20, 8],
    [0, -10],
  ] as const) {
    ellipse(ctx, x, y + 14, 16, 5);
    fillStroke(ctx, "#6b3a1c", INK, 1.6);
    circle(ctx, x, y, 17);
    fillStroke(ctx, radGrad(ctx, x - 6, y - 6, 2, 20, [
      [0, "#fff3b8"],
      [0.4, "#e3b440"],
      [1, "#a8741a"],
    ]), INK, W);
    ctx.strokeStyle = "rgba(120,80,10,0.5)";
    ctx.lineWidth = 1;
    const r = rng(x + 40);
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(x + (r() - 0.5) * 24, y + (r() - 0.5) * 24);
      ctx.lineTo(x + (r() - 0.5) * 24, y + (r() - 0.5) * 24);
      ctx.stroke();
    }
    ellipse(ctx, x, y + 3, 7, 4.5);
    fillStroke(ctx, "#fff", "#a8741a", 1);
  }
}

function njheart(ctx: Ctx) {
  rrect(ctx, -46, -40, 92, 80, 6);
  fillStroke(ctx, "#8a4fc8", INK, W);
  rrect(ctx, -46, -40, 92, 80, 6);
  clipped(ctx, () => {
    ctx.strokeStyle = "#4fc26a";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(-50, -30);
    ctx.bezierCurveTo(-10, -50, 20, 0, 60, -30);
    ctx.stroke();
    ctx.strokeStyle = "#e0342f";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-50, 34);
    ctx.bezierCurveTo(-20, 10, 20, 50, 60, 20);
    ctx.stroke();
  });
  heartPath(ctx, 0, 14, 30);
  ctx.strokeStyle = "#3a2216";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.font = "italic 700 18px ui-rounded, 'Nunito Variable', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#3a2216";
  ctx.fillText("N+J", 0, 6);
  ctx.restore();
}

function yochi(ctx: Ctx) {
  // swirl
  const swirl = "#ecd4ac";
  ctx.beginPath();
  ctx.moveTo(-30, -6);
  ctx.bezierCurveTo(-34, -24, -18, -26, -14, -28);
  ctx.bezierCurveTo(-18, -40, 4, -46, 6, -42);
  ctx.bezierCurveTo(2, -54, 12, -52, 8, -64);
  ctx.bezierCurveTo(22, -52, 22, -44, 18, -38);
  ctx.bezierCurveTo(30, -34, 28, -26, 24, -22);
  ctx.bezierCurveTo(36, -20, 34, -8, 30, -6);
  ctx.closePath();
  fillStroke(ctx, linGrad(ctx, 0, -60, 0, -6, [
    [0, "#f4e2c2"],
    [1, "#dcb988"],
  ]), INK, W);
  ctx.strokeStyle = "#c9a26e";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-28, -14);
  ctx.bezierCurveTo(-10, -22, 12, -18, 30, -14);
  ctx.moveTo(-14, -28);
  ctx.bezierCurveTo(-2, -34, 10, -32, 20, -28);
  ctx.moveTo(0, -42);
  ctx.bezierCurveTo(6, -46, 12, -44, 16, -40);
  ctx.stroke();
  // salted butterscotch drizzle
  ctx.strokeStyle = "#c07a2c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-18, -24);
  ctx.bezierCurveTo(-8, -18, 4, -30, 14, -20);
  ctx.stroke();
  ctx.fillStyle = swirl;
  // cup
  poly(ctx, [
    [-34, -8],
    [34, -8],
    [27, 42],
    [-27, 42],
  ]);
  fillStroke(ctx, "#fbfbfa", INK, W);
  rrect(ctx, -36, -11, 72, 6, 3);
  fillStroke(ctx, "#ffffff", INK, 1.6);
  text(ctx, "YO-CHI", 0, 18, 15, "#141414", { weight: 900 });
}

function chai(ctx: Ctx) {
  const cup = () => poly(ctx, [
    [-26, -44],
    [26, -44],
    [20, 44],
    [-20, 44],
  ]);
  cup();
  fillStroke(ctx, linGrad(ctx, 0, -44, 0, 44, [
    [0, "#d9b894"],
    [1, "#b48763"],
  ]), INK, W);
  cup();
  clipped(ctx, () => {
    // ice cubes
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.strokeStyle = "rgba(90,50,30,0.45)";
    ctx.lineWidth = 1;
    for (const [x, y, a] of [
      [-12, -34, 0.3],
      [10, -30, -0.2],
      [-4, -18, 0.6],
      [14, -8, 0.1],
      [-14, 2, -0.3],
    ] as const) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      rrect(ctx, -6, -6, 12, 12, 2.5);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // condensation
    const r = rng(12);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    for (let i = 0; i < 40; i++) {
      circle(ctx, -24 + r() * 48, -42 + r() * 86, 0.6 + r() * 1.1);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(-18, -44, 5, 90);
  });
  ctx.save();
  ctx.font = "italic 800 13px 'Nunito Variable', ui-rounded, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.fillText("McCafé", 0, 4);
  ctx.restore();
  ellipse(ctx, 0, -44, 26, 3.5);
  fillStroke(ctx, "#f3e6d6", INK, 1.6);
}

function flan(ctx: Ctx) {
  ellipse(ctx, 0, 30, 44, 12);
  fillStroke(ctx, "#ffffff", INK, W);
  ellipse(ctx, 0, 28, 34, 8);
  ctx.fillStyle = "#b86a2a";
  ctx.fill();
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(-30, 26);
    ctx.lineTo(-22, -16);
    ctx.quadraticCurveTo(0, -24, 22, -16);
    ctx.lineTo(30, 26);
    ctx.quadraticCurveTo(0, 34, -30, 26);
    ctx.closePath();
  };
  body();
  fillStroke(ctx, linGrad(ctx, 0, -20, 0, 30, [
    [0, "#f5cd5c"],
    [1, "#e8a93a"],
  ]), INK, W);
  // caramel top dripping down
  ctx.beginPath();
  ctx.moveTo(-22, -16);
  ctx.quadraticCurveTo(0, -24, 22, -16);
  ctx.lineTo(23, -8);
  ctx.quadraticCurveTo(20, -2, 17, -8);
  ctx.quadraticCurveTo(10, -4, 6, -9);
  ctx.quadraticCurveTo(2, 4, -3, -9);
  ctx.quadraticCurveTo(-10, -4, -14, -9);
  ctx.quadraticCurveTo(-19, 0, -23, -9);
  ctx.closePath();
  fillStroke(ctx, "#8a4a1c", INK, 1.6);
  ellipse(ctx, -8, -16, 7, 2.2, -0.1);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fill();
}

function watermelon(ctx: Ctx) {
  ctx.beginPath();
  ctx.moveTo(-42, -14);
  ctx.quadraticCurveTo(0, 60, 42, -14);
  ctx.closePath();
  fillStroke(ctx, "#3f9a4c", INK, W);
  ctx.beginPath();
  ctx.moveTo(-36, -14);
  ctx.quadraticCurveTo(0, 50, 36, -14);
  ctx.closePath();
  ctx.fillStyle = "#dff3c6";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-33, -14);
  ctx.quadraticCurveTo(0, 44, 33, -14);
  ctx.closePath();
  ctx.fillStyle = "#ef4d5c";
  ctx.fill();
  ctx.fillStyle = "#1d1714";
  for (const [x, y] of [
    [-18, -6],
    [-6, 2],
    [8, -4],
    [20, -8],
    [0, 12],
    [-12, 10],
    [12, 8],
  ] as const) {
    ellipse(ctx, x, y, 1.8, 3, 0.2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-42, -14);
  ctx.lineTo(42, -14);
  ctx.strokeStyle = INK;
  ctx.lineWidth = W;
  ctx.stroke();
}

function kfc(ctx: Ctx) {
  // drumsticks
  for (const [x, a] of [
    [-14, -0.4],
    [0, 0.05],
    [14, 0.45],
  ] as const) {
    ctx.save();
    ctx.translate(x, -14);
    ctx.rotate(a);
    rrect(ctx, -3, -30, 6, 14, 3);
    fillStroke(ctx, "#f3e2c4", INK, 1.6);
    blob(ctx, [
      [-13, 0],
      [-12, -16],
      [-4, -22],
      [6, -22],
      [12, -14],
      [13, 2],
    ]);
    fillStroke(ctx, "#d58a38", INK, W);
    ctx.fillStyle = "#b86a22";
    const r = rng(x + 99);
    for (let i = 0; i < 12; i++) {
      circle(ctx, -9 + r() * 18, -18 + r() * 18, 1.2);
      ctx.fill();
    }
    ctx.restore();
  }
  // striped bucket
  const bucket = () => poly(ctx, [
    [-32, -12],
    [32, -12],
    [24, 44],
    [-24, 44],
  ]);
  bucket();
  fillStroke(ctx, "#ffffff", INK, W);
  bucket();
  clipped(ctx, () => {
    ctx.fillStyle = "#d62d2d";
    for (let x = -36; x < 36; x += 12) ctx.fillRect(x, -14, 6, 60);
    rrect(ctx, -12, 4, 24, 18, 5);
    fillStroke(ctx, "#ffffff", INK, 1.4);
    heartPath(ctx, 0, 15, 7);
    ctx.fillStyle = "#d62d2d";
    ctx.fill();
  });
  rrect(ctx, -34, -15, 68, 6, 3);
  fillStroke(ctx, "#d62d2d", INK, 1.6);
}

function rose(ctx: Ctx, gold = false) {
  const petalCol = gold ? "#f2c23a" : "#e2334f";
  const dark = gold ? "#c28e12" : "#a91c38";
  // leaves
  ellipse(ctx, -16, 20, 12, 6, -0.6);
  fillStroke(ctx, "#4fa35a", INK, W);
  ellipse(ctx, 16, 20, 12, 6, 0.6);
  fillStroke(ctx, "#4fa35a", INK, W);
  // bloom
  blob(ctx, [
    [-26, -4],
    [-20, -26],
    [0, -32],
    [20, -26],
    [26, -4],
    [14, 16],
    [-14, 16],
  ]);
  fillStroke(ctx, petalCol, INK, W);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(0, -8, 12, 0.4, 3.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(1, -10, 6, 3.4, 6.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-16, 6);
  ctx.quadraticCurveTo(0, 16, 16, 6);
  ctx.stroke();
  if (gold) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ellipse(ctx, -10, -18, 4, 2.5, -0.5);
    ctx.fill();
  }
}

function lily(ctx: Ctx) {
  // pink stargazer lily
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((i / 6) * Math.PI * 2 + 0.26);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-11, -12, -8, -34, 0, -40);
    ctx.bezierCurveTo(8, -34, 11, -12, 0, 0);
    ctx.closePath();
    fillStroke(ctx, linGrad(ctx, 0, 0, 0, -40, [
      [0, "#e24d86"],
      [0.6, "#f7a8c6"],
      [1, "#fff4f8"],
    ]), INK, W);
    ctx.fillStyle = "#b91f5c";
    for (const y of [-12, -18, -24]) {
      circle(ctx, -2.5, y, 1.1);
      ctx.fill();
      circle(ctx, 2.5, y - 3, 1.1);
      ctx.fill();
    }
    ctx.restore();
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.strokeStyle = "#8aa84a";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
    ctx.stroke();
    ellipse(ctx, Math.cos(a) * 13, Math.sin(a) * 13, 2.6, 1.5, a);
    ctx.fillStyle = "#a8481f";
    ctx.fill();
  }
}

function heartItem(ctx: Ctx) {
  heartPath(ctx, 0, 14, 40);
  fillStroke(ctx, linGrad(ctx, 0, -30, 0, 30, [
    [0, "#ff7aa8"],
    [1, "#e2336f"],
  ]), INK, W);
  ellipse(ctx, -14, -8, 7, 4, -0.6);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fill();
}

/** Draw an item into a box of `size` units centred at (x, y). */
export function drawItem(ctx: Ctx, id: ItemId, x: number, y: number, size: number, detailed = size > 60) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  switch (id) {
    case "boba":
      boba(ctx);
      break;
    case "skewers":
      skewers(ctx);
      break;
    case "burger":
      burger(ctx);
      break;
    case "strip":
      strip(ctx, detailed);
      break;
    case "smiski":
      smiski(ctx);
      break;
    case "bouquet":
      bouquet(ctx);
      break;
    case "ferrero":
      ferrero(ctx);
      break;
    case "njheart":
      njheart(ctx);
      break;
    case "yochi":
      yochi(ctx);
      break;
    case "chai":
      chai(ctx);
      break;
    case "flan":
      flan(ctx);
      break;
    case "watermelon":
      watermelon(ctx);
      break;
    case "kfc":
      kfc(ctx);
      break;
    case "rose":
      rose(ctx);
      break;
    case "goldrose":
      rose(ctx, true);
      break;
    case "lily":
      lily(ctx);
      break;
    case "heart":
      heartItem(ctx);
      break;
  }
  ctx.restore();
}
