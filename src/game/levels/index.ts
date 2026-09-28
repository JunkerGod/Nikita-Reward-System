import { Build } from "./build";
import type { LevelDef } from "../types";

// The seven dates, played newest first. Level 1 is the 7th date (Penrith) and level 7 is where it
// all started (Timezone, Parramatta).

// ---------------------------------------------------------------------------
// Level 1: 13 September, Penrith
// ---------------------------------------------------------------------------

function penrith(): LevelDef {
  const b = new Build(230);
  b.ground(0, 230);
  b.put(2, 9, "N");
  b.set(1, 9, "0"); // Westfield sign
  b.set(5, 9, "1"); // hi at the boba shop
  b.set(12, 9, "2"); // boba shop
  b.arc(7, 7, 5);
  // up to the boba he hid
  b.ledge(18, 8, 3).put(18, 7, "rrr");
  b.set(21, 9, "3"); // plant
  b.ledge(22, 6, 3).put(22, 5, "r.r");
  b.ledge(26, 4, 3).put(27, 3, "K");
  b.put(31, 8, "r.r.r.r");
  b.on(34, "P");
  b.ledge(39, 7, 4).put(40, 6, "l");
  b.put(36, 5, "c");
  // barber
  b.set(46, 9, "4");
  b.set(47, 9, "6");
  b.set(51, 9, "5");
  // waiting for him: kiosks and shoppers
  b.ledge(57, 8, 3).put(57, 7, "rrr");
  b.ledge(61, 6, 3).put(62, 5, "f");
  b.ledge(66, 8, 3);
  b.on(64, "P");
  b.set(70, 9, "7"); // escalator
  b.put(66, 3, "l");
  b.arc(71, 7, 6);
  b.on(76, "P");
  // maccas
  b.set(81, 9, "9");
  b.set(86, 9, "8");
  b.put(84, 7, "r.r.r");
  b.put(90, 8, "w");
  // the staff room
  b.set(95, 9, "!");
  b.block(97, 5, 12, 1);
  b.ledge(100, 8, 3).put(100, 7, "r.r");
  b.ledge(104, 7, 3).put(105, 6, "G");
  b.put(98, 9, ".r.r.r.r");
  // outside: bus stands and Neon
  b.set(111, 9, "F");
  b.set(114, 9, "@");
  for (const c of [117, 121, 125, 129, 133, 137]) b.on(c, "h");
  b.set(127, 9, "$");
  b.on(123, "B");
  b.put(118, 7, "r...r...r...r...r");
  // street with gaps
  b.set(146, 9, "^");
  b.put(144, 8, "rrr");
  b.gap(151, 2).put(150, 6, "rr.r");
  b.on(156, "P");
  b.set(158, 9, "&");
  b.ledge(161, 7, 5).put(161, 6, "r.l.r");
  b.gap(162, 3);
  b.put(170, 8, "k");
  b.arc(172, 7, 5);
  b.on(178, "t");
  // Penrith station
  b.set(185, 9, "*");
  b.set(188, 9, "+");
  b.block(187, 7, 14, 1);
  b.on(191, "o");
  b.on(196, "o");
  b.set(202, 9, "F");
  b.on(207, "P");
  b.put(204, 7, "r.r.r.r");
  b.ledge(210, 8, 3).put(211, 7, "l");
  b.on(214, "P");
  b.set(217, 9, "?");
  b.put(219, 8, "rrr");
  b.set(224, 9, "J");
  return {
    id: 1,
    date: "13 September",
    short: "13 Sep",
    place: "Penrith",
    blurb: "Boba, a haircut, Maccas and hiding from Neon",
    outfit: "sep13",
    song: "mall",
    rows: b.done(),
    zones: [
      { at: 0, theme: "mall" },
      { at: 110, theme: "street" },
      { at: 182, theme: "station" },
    ],
    anchors: {
      "0": { prop: { kind: "sign", label: "Westfield\nPenrith", color: "#d62d2d" } },
      "2": { prop: { kind: "shop", label: "boba", sub: "brown sugar milk tea", color: "#b5835a", w: 5, variant: 2 } },
      "3": { prop: { kind: "plant" } },
      "4": { prop: { kind: "barberPole" } },
      "5": { prop: { kind: "shop", label: "barber", color: "#2f5d8a", w: 5, variant: 5 } },
      "7": { prop: { kind: "escalator" } },
      "8": { prop: { kind: "shop", label: "maccas", sub: "fries n cheese sticks", color: "#da291c", w: 6, variant: 8 } },
      "!": { prop: { kind: "door", label: "STAFF ONLY" } },
      $: { prop: { kind: "busShelter", w: 5 } },
      "^": { prop: { kind: "lamp" } },
      "&": { prop: { kind: "lamp" } },
      "*": { prop: { kind: "stationSign", label: "Penrith" } },
      "+": { prop: { kind: "pole" } },
      "?": { prop: { kind: "stationSign", label: "Penrith" } },
      "1": {
        story: {
          id: "l1-hi",
          jag: { dx: 4 },
          lines: [
            { who: "j", text: "HIII NIKI" },
            { who: "n", text: "Hiii jaggy ☺️" },
            { who: "j", text: "I got us boba" },
            { who: "n", text: "YAY" },
            { who: "n", text: "Wait where is it" },
            { who: "j", text: "Hehe i hid urs somewhere up high" },
            { who: "n", text: "Jag :(" },
            { who: "j", text: "Find it bean" },
          ],
          tip: "Roses and lilies pay for upgrades in the shop",
        },
      },
      "6": {
        story: {
          id: "l1-barber",
          jag: { dx: 3, stay: true },
          lines: [
            { who: "j", text: "Oke i gotta get my haircut rn" },
            { who: "n", text: "Nooo" },
            { who: "n", text: "Dont let them touch the curls :(" },
            { who: "j", text: "Js a trim i promise" },
            { who: "j", text: "Wait for me oke" },
            { who: "n", text: "Okiii" },
          ],
        },
      },
      "9": {
        story: {
          id: "l1-maccas",
          jag: { dx: 3 },
          lines: [
            { who: "j", text: "IM BACK" },
            { who: "n", text: "Wait ur hair looks so good" },
            { who: "j", text: "Hehe really" },
            { who: "n", text: "Mhm ☺️" },
            { who: "j", text: "Fries n cheese sticks on me" },
            { who: "n", text: "YAY" },
            { who: "j", text: "Lets hang in the back room" },
            { who: "n", text: "Wait are we allowed" },
            { who: "j", text: "Js dont tell anyone hehe" },
          ],
        },
      },
      "@": {
        story: {
          id: "l1-neon",
          jag: { dx: -1, facing: 1 },
          lines: [
            { who: "n", text: "Wait" },
            { who: "n", text: "THATS MY BROTHER" },
            { who: "j", text: "NEON?? 😭" },
            { who: "n", text: "He cant know im here" },
            { who: "j", text: "Hide behind stuff when he turns around" },
            { who: "n", text: "Oki oki" },
          ],
          tip: "Hold down behind a pillar, bin or plant to hide from Neon",
        },
      },
    },
    keepsake: { id: "boba", name: "Boba", note: "Our boba at Penrith. U waited for me at the barber n didnt even complain hehe" },
    secret: { id: "goldrose", name: "Golden rose", note: "Found in the staff room. Our little secret 🤫" },
    outro: [
      { who: "n", text: "That was so close" },
      { who: "j", text: "U almost gave me a heart attack 😭" },
      { who: "n", text: "He didnt see me tho ☺️" },
      { who: "j", text: "Sneaky bean" },
      { who: "n", text: "I dont wanna go home :(" },
      { who: "j", text: "Aww i know" },
      { who: "j", text: "Text me when ur on the train oke" },
      { who: "n", text: "Okiii" },
      { who: "j", text: "I 🫒 u" },
      { who: "n", text: "I 🫒 u more" },
      { who: "j", text: "Most" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Level 2: 21 August, Blacktown to Schofields (skewers)
// ---------------------------------------------------------------------------

function skewers(): LevelDef {
  const b = new Build(226);
  b.ground(0, 226);
  b.put(2, 9, "N");
  b.set(4, 9, "1");
  b.set(10, 9, "0"); // Blacktown sign
  b.arc(12, 7, 6);
  b.on(20, "C");
  b.put(24, 8, "rrr");
  // out onto the street
  b.gap(33, 2).put(32, 7, "rr.r");
  b.set(38, 9, "3"); // lamp
  b.on(42, "t");
  b.ledge(44, 7, 3).put(45, 6, "l");
  // Bigz Skewer House
  b.set(50, 9, "2");
  b.set(55, 9, "4");
  b.ledge(58, 7, 3).put(58, 6, "r.r");
  b.ledge(62, 5, 3);
  b.ledge(66, 3, 3).put(67, 2, "K");
  b.put(63, 4, "r");
  b.on(64, "t");
  b.put(70, 8, "y");
  b.gap(74, 3).ledge(74, 7, 3).put(74, 6, "rrr");
  b.arc(79, 7, 5);
  b.on(86, "t");
  b.set(90, 9, "F");
  // back to Blacktown station: gates and peak hour
  b.set(97, 9, "5");
  b.block(99, 7, 13, 1);
  b.set(100, 9, "6");
  b.on(103, "o");
  b.on(108, "o");
  b.put(112, 8, "rrrr");
  b.on(118, "C");
  b.ledge(121, 7, 4).put(121, 6, "r.r.");
  b.on(128, "C");
  b.put(126, 5, "p");
  b.gap(133, 2).put(132, 7, "r..r");
  b.on(139, "t");
  b.set(144, 9, "F");
  // Schofields: people keep coming
  b.set(150, 9, "7");
  b.set(153, 9, "8");
  b.on(160, "P");
  b.arc(158, 7, 5);
  b.ledge(164, 7, 3);
  b.ledge(168, 5, 3).put(168, 4, "r.r");
  b.ledge(172, 3, 2).put(172, 2, "G");
  b.on(170, "P");
  b.put(176, 8, "w");
  b.on(181, "P");
  b.put(183, 7, "r.r.r");
  b.set(188, 9, "9");
  b.on(193, "P");
  b.ledge(196, 7, 4).put(197, 6, "l");
  b.on(202, "P");
  b.put(205, 8, "rrr");
  b.set(210, 9, "!");
  b.set(218, 9, "J");
  return {
    id: 2,
    date: "21 August",
    short: "21 Aug",
    place: "Blacktown to Schofields",
    blurb: "Skewers after school, then Schofields station",
    outfit: "aug",
    song: "station",
    rows: b.done(),
    zones: [
      { at: 0, theme: "station" },
      { at: 30, theme: "street" },
      { at: 94, theme: "station" },
    ],
    anchors: {
      "0": { prop: { kind: "stationSign", label: "Blacktown" } },
      "2": { prop: { kind: "shop", label: "BIGZ", sub: "skewer house", color: "#d3262d", w: 6, variant: 3 } },
      "3": { prop: { kind: "lamp" } },
      "5": { prop: { kind: "stationSign", label: "Blacktown" } },
      "6": { prop: { kind: "pole" } },
      "7": { prop: { kind: "stationSign", label: "Schofields" } },
      "9": { prop: { kind: "bench" } },
      "!": { prop: { kind: "stationSign", label: "Schofields" } },
      "1": {
        story: {
          id: "l2-hi",
          jag: { dx: 4 },
          lines: [
            { who: "j", text: "Hiii bean" },
            { who: "n", text: "Hiii jag" },
            { who: "n", text: "Wait im so hungry" },
            { who: "j", text: "Skewers" },
            { who: "n", text: "SKEWERS ☺️" },
          ],
          tip: "Peak hour crowds push u back, jump over them",
        },
      },
      "4": {
        story: {
          id: "l2-bigz",
          jag: { dx: -2, facing: 1 },
          lines: [
            { who: "j", text: "Grab the cup i'll find us a seat" },
            { who: "n", text: "Wait which ones r urs" },
            { who: "j", text: "The cheese ones r mine" },
            { who: "n", text: "Mmm we'll see hehe" },
          ],
        },
      },
      "8": {
        prop: { kind: "bench" },
        story: {
          id: "l2-schofields",
          jag: { dx: 3 },
          lines: [
            { who: "n", text: "Finally no ones here" },
            { who: "j", text: "Wait someone's coming 😭" },
            { who: "n", text: "Ugh" },
            { who: "n", text: "Why does everyone come here" },
            { who: "j", text: "Js ignore them hehe" },
          ],
          tip: "People keep coming, dodge them or hop on their heads",
        },
      },
    },
    keepsake: { id: "skewers", name: "Bigz skewers", note: "Skewers at Blacktown after school. U stole my cheese ones 😭" },
    secret: { id: "goldrose", name: "Golden rose", note: "Hiding up on the canopy at Schofields" },
    outro: [
      { who: "n", text: "My bus is coming :(" },
      { who: "j", text: "Aww already" },
      { who: "j", text: "Get home safe oke" },
      { who: "n", text: "I will" },
      { who: "n", text: "I miss u already" },
      { who: "j", text: "I miss u more" },
      { who: "n", text: "I miss u most 🥹" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Level 3: 18 August, Fried Brothers then the train to Schofields
// ---------------------------------------------------------------------------

function burger(): LevelDef {
  const b = new Build(236);
  b.ground(0, 236);
  b.put(2, 9, "N");
  b.set(4, 9, "1");
  b.set(12, 9, "2"); // Fried Brothers
  b.set(17, 9, "3");
  b.ledge(20, 7, 3).put(20, 6, "r.r");
  b.ledge(24, 5, 3);
  b.ledge(28, 3, 3).put(29, 2, "K");
  b.put(25, 4, "r");
  b.on(26, "t");
  b.arc(32, 7, 6);
  b.gap(39, 3).put(39, 6, "rrr");
  b.set(45, 9, "4"); // lamp
  b.on(48, "t");
  b.ledge(51, 7, 4).put(52, 6, "l");
  b.put(57, 8, "c");
  b.on(60, "t");
  b.gap(63, 2).put(62, 7, "r..r");
  b.set(67, 9, "F");
  // Blacktown station
  b.set(72, 9, "5");
  b.block(75, 7, 14, 1);
  b.set(76, 9, "6");
  b.on(79, "o");
  b.on(83, "o");
  b.on(87, "o");
  b.put(91, 8, "rrr");
  b.on(96, "C");
  b.on(101, "t");
  b.ledge(98, 7, 3).put(98, 6, "r.r");
  b.set(106, 9, "F");
  // on the train: seats are ledges, the top deck runs along row 4
  b.set(112, 9, "7");
  for (const c of [116, 124, 134, 146, 158, 170, 182, 194]) b.ledge(c, 8, 3);
  b.ledge(120, 6, 16).ledge(140, 6, 14).ledge(158, 6, 20).ledge(182, 6, 14);
  b.put(121, 5, "r.r.r.r.r.r.r");
  b.put(141, 5, "r.r.l.r.r");
  b.put(160, 5, "r.r.r.G");
  b.put(183, 5, "r.r.l.r");
  b.put(116, 7, "rrr").put(134, 7, "rrr").put(146, 7, "r.r").put(170, 7, "rrr");
  b.on(130, "P");
  b.on(152, "C");
  b.on(165, "P");
  b.put(154, 8, "f");
  b.on(178, "P");
  b.on(190, "C");
  b.set(200, 9, "F");
  // Schofields
  b.set(208, 9, "8");
  b.on(212, "P");
  b.put(214, 7, "r.r.r");
  b.set(219, 9, "9");
  b.set(228, 9, "J");
  return {
    id: 3,
    date: "18 August",
    short: "18 Aug",
    place: "Blacktown to Schofields",
    blurb: "Fried Brothers, a walk, then the train together",
    outfit: "aug",
    song: "city",
    rows: b.done(),
    zones: [
      { at: 0, theme: "street" },
      { at: 70, theme: "station" },
      { at: 110, theme: "train" },
      { at: 204, theme: "station" },
    ],
    anchors: {
      "2": { prop: { kind: "shop", label: "FRIED BROTHERS", sub: "burgers n loaded fries", color: "#1c1b20", w: 7, variant: 4 } },
      "3": { prop: { kind: "sign", label: "blacktown", color: "#2f5d8a" } },
      "4": { prop: { kind: "lamp" } },
      "5": { prop: { kind: "stationSign", label: "Blacktown" } },
      "6": { prop: { kind: "pole" } },
      "8": { prop: { kind: "stationSign", label: "Schofields" } },
      "9": { prop: { kind: "bench" } },
      "1": {
        story: {
          id: "l3-hi",
          jag: { dx: 5 },
          lines: [
            { who: "j", text: "Hii niki" },
            { who: "n", text: "Hiii" },
            { who: "j", text: "Fried brothers" },
            { who: "n", text: "Again?? hehe" },
            { who: "j", text: "U know u want it" },
            { who: "n", text: "Ok fine ☺️" },
            { who: "j", text: "Ur burger is up there somewhere hehe" },
            { who: "n", text: "Why is it always up high" },
          ],
          tip: "Trackwork signs walk around, jump on them",
        },
      },
      "7": {
        story: {
          id: "l3-train",
          jag: { dx: 3 },
          lines: [
            { who: "j", text: "Top deck" },
            { who: "n", text: "Obviously" },
            { who: "n", text: "I like the train with u" },
            { who: "j", text: "Aww me too" },
          ],
          tip: "Seats and the top deck are platforms, hold down and jump to drop through",
        },
      },
    },
    keepsake: { id: "burger", name: "Fried Brothers burger", note: "Burger n loaded fries at Blacktown, then the train to Schofields together" },
    secret: { id: "goldrose", name: "Golden rose", note: "Top deck, obviously" },
    outro: [
      { who: "n", text: "Why was the train so fast today" },
      { who: "j", text: "Cuz ur with me hehe" },
      { who: "n", text: "Shut up ☺️" },
      { who: "j", text: "Come i'll walk u to the bus" },
      { who: "n", text: "Okiii" },
      { who: "n", text: "Bye bean 🥹" },
      { who: "j", text: "Byeee bebe" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Level 4: 26 July, double date in the city, then our bridge
// ---------------------------------------------------------------------------

function city(): LevelDef {
  const b = new Build(232);
  b.ground(0, 232);
  b.put(2, 9, "N");
  b.set(6, 9, "1");
  b.set(12, 9, "2"); // Fried Brothers Haymarket
  b.arc(18, 7, 6);
  b.on(26, "C");
  b.ledge(29, 7, 4).put(29, 6, "r.r.");
  b.on(36, "C");
  b.set(40, 9, "3");
  b.gap(44, 2).put(43, 7, "r..r");
  b.on(50, "C");
  b.ledge(52, 6, 3).put(53, 5, "l");
  b.put(57, 8, "k");
  b.on(62, "C");
  b.arc(64, 7, 6);
  b.on(72, "t");
  b.set(76, 9, "F");
  // George St up to Town Hall
  b.set(82, 9, "4");
  b.on(86, "C");
  b.ledge(88, 7, 3).ledge(92, 5, 3).ledge(96, 3, 2).put(96, 2, "G");
  b.put(89, 6, "r.r").put(93, 4, "r");
  b.on(98, "C");
  b.gap(102, 3).put(102, 6, "rrr");
  b.on(108, "t");
  b.put(111, 8, "rrrr");
  b.set(118, 9, "F");
  // Hamafilm
  b.set(122, 9, "5");
  b.set(126, 9, "6");
  b.set(131, 9, "7");
  b.set(137, 9, "8");
  b.ledge(140, 7, 3).put(140, 6, "r.r");
  b.ledge(144, 5, 3).put(145, 4, "K");
  b.set(150, 9, "9"); // fridge
  b.put(153, 8, "rrr");
  b.set(158, 9, "F");
  // back in Parramatta by the river
  b.set(166, 9, "!");
  b.arc(168, 7, 5);
  b.gap(175, 3).ledge(175, 7, 3).put(175, 6, "r.r");
  b.set(181, 9, "@"); // tree
  b.put(184, 8, "p");
  b.gap(188, 2).put(187, 6, "l");
  b.arc(191, 7, 6);
  b.set(210, 9, "$"); // our bridge
  b.put(200, 8, "r.r.r");
  b.set(213, 9, "J");
  return {
    id: 4,
    date: "26 July",
    short: "26 Jul",
    place: "Haymarket, Town Hall and our bridge",
    blurb: "Double date with Chichi and Aayam, Hamafilm, then just us",
    outfit: "jul26",
    song: "city",
    rows: b.done(),
    zones: [
      { at: 0, theme: "haymarket" },
      { at: 80, theme: "street" },
      { at: 120, theme: "booth" },
      { at: 162, theme: "river" },
    ],
    anchors: {
      "2": { prop: { kind: "shop", label: "FRIED BROTHERS", sub: "haymarket", color: "#1c1b20", w: 7, variant: 6 } },
      "3": { prop: { kind: "lamp" } },
      "4": { prop: { kind: "sign", label: "Town Hall", color: "#2f5d8a" } },
      "5": { prop: { kind: "booth", label: "hamafilm" } },
      "7": { prop: { kind: "booth", label: "hamafilm" } },
      "8": { prop: { kind: "sign", label: "hamafilm.com.au", color: "#e27aa8" } },
      "9": { prop: { kind: "fridge" } },
      "!": { prop: { kind: "sign", label: "Parramatta\nRiver", color: "#2f5d3a" } },
      "@": { prop: { kind: "tree" } },
      $: { prop: { kind: "bridge", w: 9, h: 5, label: "Marsden St" } },
      "1": {
        story: {
          id: "l4-hi",
          jag: { dx: 3 },
          npcs: [
            { who: "chichi", dx: 5 },
            { who: "aayam", dx: 6 },
          ],
          lines: [
            { who: "c", text: "NIKITAAA" },
            { who: "n", text: "CHICHI" },
            { who: "a", text: "Yo" },
            { who: "j", text: "Double date hehe" },
            { who: "n", text: "Wait this is so fun" },
          ],
          tip: "Crowds push u back, bounce off their heads",
        },
      },
      "6": {
        story: {
          id: "l4-booth",
          jag: { dx: 2 },
          npcs: [
            { who: "chichi", dx: 4 },
            { who: "aayam", dx: 5 },
          ],
          lines: [
            { who: "n", text: "PHOTOBOOTH" },
            { who: "j", text: "Oke oke" },
            { who: "c", text: "Bear ears on everyone" },
            { who: "j", text: "Even me??" },
            { who: "n", text: "Especially u ☺️" },
          ],
        },
      },
    },
    keepsake: { id: "strip", name: "Hamafilm strip", note: "The 4 of us at Hamafilm with the bear ears. Then just us under our bridge" },
    secret: { id: "goldrose", name: "Golden rose", note: "Found in the city" },
    outro: [
      { who: "n", text: "Wait i love that they came" },
      { who: "j", text: "Me too" },
      { who: "j", text: "But i like this part more" },
      { who: "n", text: "Just us ☺️" },
      { who: "j", text: "Just 2 beans" },
      { who: "n", text: "Under our bridge" },
      { who: "j", text: "Our bridge hehe" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Level 5: 17 July, the train to Town Hall and 9 floors up to the roof
// ---------------------------------------------------------------------------

function rooftop(): LevelDef {
  const R = 46;
  const F = 42; // street level
  const b = new Build(214, R, F);
  b.ground(0, 128);
  b.put(2, F - 1, "N");
  b.set(4, F - 1, "1");
  b.set(10, F - 1, "0");
  b.arc(12, F - 3, 6);
  b.on(20, "C");
  b.set(26, F - 1, "F");
  // the train: seats and the top deck
  b.set(32, F - 1, "2");
  for (const c of [36, 46, 58, 70, 82]) b.ledge(c, F - 2, 3);
  b.ledge(40, F - 4, 14).ledge(62, F - 4, 18);
  b.put(41, F - 5, "r.r.r.r.r.r.r");
  b.put(63, F - 5, "r.r.l.r.r.r");
  b.put(47, F - 1, "K");
  b.on(55, "P");
  b.on(74, "C");
  b.put(84, F - 3, "rrr");
  b.set(90, F - 1, "F");
  // Town Hall station
  b.set(95, F - 1, "3");
  b.block(98, F - 3, 12, 1);
  b.on(101, "o");
  b.on(106, "o");
  b.put(111, F - 2, "rrr");
  b.on(116, "t");
  b.set(120, F - 1, "4"); // race u to the top
  b.put(123, F - 2, "s");
  // the carpark: 9 floors, each 4 rows, alternating openings with a car roof to climb on
  const x0 = 128;
  const x1 = 152;
  b.ground(x0, x1, F);
  const levels = ["A", "D", "E", "I", "L", "M", "O", "Q", "R"];
  for (let i = 0; i < 9; i++) {
    const floorRow = F - i * 4;
    b.set(x0 + 2, floorRow - 1, levels[i]);
    if (i === 8) break;
    const slab = floorRow - 4;
    const openLeft = i % 2 === 1;
    // the next floor up, with an opening on one side
    if (openLeft) b.block(x0 + 4, slab, x1 - x0 - 4, 1);
    else b.block(x0, slab, x1 - x0 - 4, 1);
    // a car roof / ledge halfway to climb up through the opening
    b.ledge(openLeft ? x0 + 1 : x1 - 4, floorRow - 2, 3);
    b.put(openLeft ? x0 + 6 : x0 + 8, floorRow - 1, i % 3 === 0 ? "r.r.r" : "rr.rr");
    if (i === 3) b.on(x0 + 14, "t");
    if (i === 5) b.put(x0 + 16, floorRow - 1, "t");
    if (i === 6) b.put(x0 + 12, floorRow - 2, "w");
  }
  // walls of the carpark
  b.block(x0 - 1, F - 36, 1, 34);
  b.block(x1, F - 32, 1, 32);
  // the roof
  const roof = F - 32;
  b.ground(x1, 214, roof);
  b.set(158, roof - 1, "5");
  b.arc(160, roof - 2, 6);
  b.set(170, roof - 1, "6"); // stair tower
  b.put(163, roof - 1, "s");
  b.ledge(166, roof - 3, 2).ledge(168, roof - 5, 2);
  // the last steps up the stair tower only show up with the Smiski glow
  b.hidden(170, roof - 7, 3).hidden(174, roof - 9, 2);
  b.put(175, roof - 10, "G");
  b.put(171, roof - 8, "l");
  b.on(180, "t");
  b.put(182, roof - 2, "r.r.r.r");
  b.set(190, roof - 1, "7");
  b.set(198, roof - 1, "8");
  b.set(204, roof - 1, "J");
  return {
    id: 5,
    date: "17 July",
    short: "17 Jul",
    place: "Town Hall carpark rooftop",
    blurb: "A Smiski on the train, 9 floors up, and the view",
    outfit: "jul17",
    song: "rooftop",
    rows: b.done(),
    zones: [
      { at: 0, theme: "station" },
      { at: 30, theme: "train" },
      { at: 92, theme: "station" },
      { at: 126, theme: "carpark" },
      { at: 153, theme: "rooftop" },
    ],
    dark: [[128, 152]],
    anchors: {
      "0": { prop: { kind: "stationSign", label: "Blacktown" } },
      "3": { prop: { kind: "stationSign", label: "Town Hall" } },
      "5": { prop: { kind: "sign", label: "level 9\nroof", color: "#e6c229" } },
      "6": { prop: { kind: "tower", w: 5, h: 6 } },
      "7": { prop: { kind: "bench" } },
      "8": { prop: { kind: "sign", label: "the view", color: "#8a4fc8" } },
      A: { prop: { kind: "levelNum", label: "L1" } },
      D: { prop: { kind: "levelNum", label: "L2" } },
      E: { prop: { kind: "levelNum", label: "L3" } },
      I: { prop: { kind: "levelNum", label: "L4" } },
      L: { prop: { kind: "levelNum", label: "L5" } },
      M: { prop: { kind: "levelNum", label: "L6" } },
      O: { prop: { kind: "levelNum", label: "L7" } },
      Q: { prop: { kind: "levelNum", label: "L8" } },
      R: { prop: { kind: "levelNum", label: "L9" } },
      "1": {
        story: {
          id: "l5-hi",
          jag: { dx: 4 },
          lines: [
            { who: "j", text: "GOODMORNINGGG" },
            { who: "n", text: "Goodmorningngngng ☺️" },
            { who: "j", text: "Ready for the city" },
            { who: "n", text: "Mhm" },
          ],
        },
      },
      "2": {
        story: {
          id: "l5-smiski",
          jag: { dx: 3 },
          lines: [
            { who: "j", text: "Close ur eyes niki" },
            { who: "n", text: "Wait why" },
            { who: "j", text: "Js do it" },
            { who: "n", text: "Okiii" },
            { who: "j", text: "Got u something" },
            { who: "n", text: "A SMISKI ☺️☺️" },
            { who: "n", text: "I love him" },
            { who: "j", text: "Hes urs now hehe" },
          ],
        },
      },
      "4": {
        story: {
          id: "l5-race",
          jag: { dx: 2 },
          lines: [
            { who: "j", text: "Race u to the top" },
            { who: "n", text: "Its 9 floors jag" },
            { who: "j", text: "Hehe go" },
          ],
          tip: "Grab the Smiski, it glows in the dark and shows secret ledges",
        },
      },
    },
    keepsake: { id: "smiski", name: "Smiski", note: "Ur Smiski. I gave it to u on the train to Town Hall" },
    secret: { id: "njheart", name: "N+J on the wall", note: "U wrote our names on the rooftop wall with the henna cone ☺️" },
    outro: [
      { who: "n", text: "Wait the view" },
      { who: "j", text: "Told u" },
      { who: "n", text: "Its so pretty up here" },
      { who: "j", text: "Js like u hehe" },
      { who: "n", text: "Stoppp ☺️" },
      { who: "n", text: "Wait i wanna write our names on the wall" },
      { who: "j", text: "Do it" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Level 6: 16 July, the flowers and our bridge
// ---------------------------------------------------------------------------

function flowers(): LevelDef {
  const b = new Build(220);
  b.ground(0, 220);
  b.put(3, 9, "N");
  b.set(1, 9, "0");
  b.set(6, 9, "1");
  b.set(12, 9, "2");
  b.arc(9, 7, 6);
  b.ledge(18, 7, 3).put(18, 6, "r.r");
  b.on(22, "P");
  b.ledge(22, 5, 3).put(23, 4, "l");
  b.set(30, 9, "3");
  b.put(33, 8, "rrr");
  b.on(38, "P");
  b.set(44, 9, "4");
  b.arc(46, 7, 5);
  b.set(54, 9, "F");
  // outside by the river: the bench
  b.set(60, 9, "5"); // tree
  b.set(64, 9, "6"); // story at the bench
  b.set(69, 9, "7"); // bench
  b.put(69, 8, "K");
  b.set(74, 9, "8"); // tree with the Ferreros
  b.ledge(75, 7, 2).ledge(78, 5, 2).ledge(75, 3, 3).put(76, 2, "G");
  b.put(79, 4, "r");
  b.arc(84, 7, 6);
  b.gap(92, 3).ledge(92, 7, 3).put(92, 6, "rrr");
  b.on(98, "t");
  b.set(102, 9, "9");
  b.put(104, 8, "c");
  b.gap(108, 2).put(107, 6, "r..r");
  b.on(113, "t");
  b.ledge(116, 7, 4).put(117, 6, "l");
  b.set(122, 9, "F");
  b.arc(125, 7, 6);
  b.gap(133, 3).ledge(133, 6, 3).put(133, 5, "r.r");
  b.on(140, "t");
  b.set(144, 9, "!");
  b.put(147, 8, "y");
  b.gap(152, 2).put(151, 6, "l");
  b.arc(156, 7, 6);
  b.on(164, "t");
  b.put(168, 8, "rrr");
  b.set(172, 9, "@");
  b.arc(176, 7, 5);
  b.set(194, 9, "$"); // Marsden St bridge
  b.put(186, 8, "r.r.r");
  b.set(197, 9, "J");
  return {
    id: 6,
    date: "16 July",
    short: "16 Jul",
    place: "Parramatta, the bench and our bridge",
    blurb: "The pipe cleaner flowers, Ferreros and finding our bridge",
    outfit: "jul16",
    song: "river",
    rows: b.done(),
    zones: [
      { at: 0, theme: "mall" },
      { at: 56, theme: "river" },
    ],
    anchors: {
      "0": { prop: { kind: "sign", label: "Westfield\nParramatta", color: "#d62d2d" } },
      "2": { prop: { kind: "shop", label: "parra plaza", color: "#e27aa8", w: 5, variant: 9 } },
      "3": { prop: { kind: "plant" } },
      "4": { prop: { kind: "shop", label: "gifts", color: "#7cc3e8", w: 4, variant: 12 } },
      "5": { prop: { kind: "tree" } },
      "7": { prop: { kind: "bench" } },
      "8": { prop: { kind: "tree" } },
      "9": { prop: { kind: "lamp" } },
      "!": { prop: { kind: "tree" } },
      "@": { prop: { kind: "sign", label: "Marsden St", color: "#2f5d3a" } },
      $: { prop: { kind: "bridge", w: 9, h: 5, label: "Marsden St" } },
      "1": {
        story: {
          id: "l6-hi",
          jag: { dx: 4 },
          lines: [
            { who: "j", text: "Hiii" },
            { who: "n", text: "Hiii jaggy" },
            { who: "j", text: "Come to the bench i got u something" },
            { who: "n", text: "Wait what is it" },
            { who: "j", text: "U'll see hehe" },
          ],
        },
      },
      "6": {
        story: {
          id: "l6-flowers",
          jag: { dx: 3, pose: "idle" },
          lines: [
            { who: "j", text: "Close ur eyes" },
            { who: "n", text: "Okiii" },
            { who: "j", text: "Made these for u" },
            { who: "n", text: "WAIT U MADE THESE" },
            { who: "j", text: "Took me forever 😭" },
            { who: "n", text: "Theyre so pretty 🥹" },
            { who: "j", text: "N ferreros cuz u deserve it" },
            { who: "n", text: "I olive u so much" },
            { who: "j", text: "I 🫒 u too" },
          ],
        },
      },
    },
    keepsake: { id: "bouquet", name: "Pipe cleaner flowers", note: "I made every single one of these for u. Took me forever 😭" },
    secret: { id: "ferrero", name: "Ferrero Rochers", note: "Cuz u deserve it" },
    outro: [
      { who: "n", text: "Wait this spot is so nice" },
      { who: "j", text: "Our bridge now" },
      { who: "n", text: "Our bridge ☺️" },
      { who: "j", text: "Todays our day now" },
      { who: "n", text: "16 July ☺️" },
      { who: "j", text: "Every year hehe" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Level 7: 9 July, the first date. Timezone, GYG and sitting outside
// ---------------------------------------------------------------------------

function firstDate(): LevelDef {
  const b = new Build(206);
  b.ground(0, 206);
  b.put(3, 9, "N");
  b.set(1, 9, "0");
  b.set(6, 9, "1");
  b.arc(8, 7, 6);
  b.on(16, "P");
  b.ledge(19, 7, 3).put(19, 6, "r.r");
  b.set(25, 9, "2"); // Timezone sign
  b.set(29, 9, "F");
  // Timezone
  b.set(33, 9, "3");
  b.set(36, 9, "4"); // hoop
  b.put(33, 6, "b.b");
  b.ledge(40, 7, 3).put(41, 6, "b");
  b.set(46, 9, "5"); // claw
  b.ledge(44, 5, 3).put(45, 4, "b");
  b.set(54, 9, "6"); // hoop
  b.ledge(56, 7, 3).put(56, 6, "rrr");
  b.gap(60, 2).put(59, 6, "r..r");
  b.on(64, "P");
  b.set(68, 9, "7"); // hoop
  b.ledge(70, 7, 3).ledge(74, 5, 3).put(75, 4, "G");
  b.put(71, 6, "b");
  b.set(80, 9, "8"); // claw
  b.arc(82, 7, 6);
  b.on(88, "P");
  b.set(92, 9, "9"); // hoop
  b.put(94, 6, "b.b");
  b.set(100, 9, "F");
  // GYG
  b.set(106, 9, "!");
  b.set(110, 9, "@");
  b.put(114, 8, "rrr");
  b.on(118, "t");
  b.gap(122, 2).put(121, 6, "r..r");
  b.ledge(126, 7, 3).put(127, 6, "k");
  b.arc(131, 7, 6);
  b.on(138, "P");
  b.set(142, 9, "F");
  // outside Arthur Phillip High
  b.set(150, 9, "$");
  b.arc(146, 7, 5);
  b.on(158, "t");
  b.put(160, 8, "w");
  b.set(164, 9, "%"); // tree
  b.arc(166, 7, 6);
  b.set(180, 9, "&"); // where we sat
  b.set(184, 9, "J");
  return {
    id: 7,
    date: "9 July",
    short: "9 Jul",
    place: "Timezone, Parramatta",
    blurb: "Our first date. Where it all started",
    outfit: "jul9",
    song: "arcade",
    final: true,
    rows: b.done(),
    zones: [
      { at: 0, theme: "mall" },
      { at: 31, theme: "arcade" },
      { at: 103, theme: "outdoor" },
    ],
    anchors: {
      "0": { prop: { kind: "sign", label: "Parra\nPlaza", color: "#d62d2d" } },
      "2": { prop: { kind: "shop", label: "timezone", sub: "games n prizes", color: "#1d5bff", w: 5, variant: 7 } },
      "4": { prop: { kind: "hoop" } },
      "5": { prop: { kind: "claw" } },
      "6": { prop: { kind: "hoop" } },
      "7": { prop: { kind: "hoop" } },
      "8": { prop: { kind: "claw" } },
      "9": { prop: { kind: "hoop" } },
      "@": { prop: { kind: "shop", label: "GYG", sub: "guzman y gomez", color: "#c8102e", w: 5, variant: 11 } },
      $: { prop: { kind: "fence", w: 12, label: "Arthur Phillip High School", sub: "Parramatta" } },
      "%": { prop: { kind: "tree" } },
      "&": { prop: { kind: "bench" } },
      "1": {
        story: {
          id: "l7-hi",
          lines: [
            { who: "n", text: "Wait im here" },
            { who: "j", text: "Im at timezone" },
            { who: "n", text: "Omg im nervous" },
            { who: "j", text: "Me too lowk 😭" },
          ],
        },
      },
      "3": {
        story: {
          id: "l7-timezone",
          jag: { dx: 2 },
          lines: [
            { who: "j", text: "Hiii" },
            { who: "n", text: "Hiii ☺️" },
            { who: "j", text: "Bet i win at basketball" },
            { who: "n", text: "Bet u dont" },
            { who: "j", text: "If u say so" },
            { who: "n", text: "I do say so" },
          ],
          tip: "Grab the basketballs for SWISH points",
        },
      },
      "!": {
        story: {
          id: "l7-gyg",
          jag: { dx: 2 },
          lines: [
            { who: "j", text: "Im so hungry" },
            { who: "n", text: "GYG?" },
            { who: "j", text: "GYG" },
          ],
        },
      },
    },
    keepsake: { id: "heart", name: "Jagath", note: "The last thing to collect was me hehe. Where it all started, 9 July" },
    secret: { id: "goldrose", name: "Golden rose", note: "Won it at Timezone" },
    outro: [
      { who: "n", text: "Wait" },
      { who: "n", text: "I had fun today" },
      { who: "j", text: "Me too niki" },
      { who: "j", text: "Like a lot" },
      { who: "n", text: "Mmm" },
      { who: "n", text: "Can i tell u something" },
      { who: "j", text: "Mhm" },
      { who: "n", text: "I found u ☺️" },
      { who: "j", text: "Took u long enough hehe" },
    ],
  };
}

export const LEVELS: LevelDef[] = [penrith(), skewers(), burger(), city(), rooftop(), flowers(), firstDate()];

export const CREDITS = [
  "Niki",
  "u just played every date we've been on, backwards",
  "from Penrith all the way back to where it started",
  "the boba, the trains to Schofields, the carpark roof, our bridge",
  "thank u for every single one",
  "u da best bean",
  "I 🫒 u",
  "jag",
];
