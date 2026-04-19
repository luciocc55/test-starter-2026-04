import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Photo counts per listing (from listings.json)
const photoCounts = [4,3,4,3,4,3,4,3,4,3,4,3,4,3,4,3,4,3,4,3,4,4,4,3,4];

function hsl(h, s, l) {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

// Hero + photo SVGs
for (let i = 1; i <= 25; i++) {
  const id = String(i).padStart(3, "0");
  const hue = Math.round((i - 1) * (360 / 25));
  const hueB = (hue + 40) % 360;

  const makePhoto = (label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${hsl(hue, 45, 32)}"/>
      <stop offset="100%" stop-color="${hsl(hueB, 35, 22)}"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#bg)"/>
  <text x="800" y="490" font-family="sans-serif" font-size="56" fill="rgba(255,255,255,0.85)" text-anchor="middle" dominant-baseline="middle">${label}</text>
  <text x="1560" y="975" font-family="sans-serif" font-size="22" fill="rgba(255,255,255,0.55)" text-anchor="end">Placeholder — replace with real media</text>
</svg>`;

  writeFileSync(
    join(root, "public/images/listings", `listing-${id}-hero.svg`),
    makePhoto(`listing-${id}-hero`)
  );

  const count = photoCounts[i - 1];
  for (let p = 1; p <= count; p++) {
    const hueP = (hue + p * 15) % 360;
    const makePh = (label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${hsl(hueP, 40, 28)}"/>
      <stop offset="100%" stop-color="${hsl((hueP + 50) % 360, 30, 18)}"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#bg)"/>
  <text x="800" y="490" font-family="sans-serif" font-size="56" fill="rgba(255,255,255,0.85)" text-anchor="middle" dominant-baseline="middle">${label}</text>
  <text x="1560" y="975" font-family="sans-serif" font-size="22" fill="rgba(255,255,255,0.55)" text-anchor="end">Placeholder — replace with real media</text>
</svg>`;
    writeFileSync(
      join(root, "public/images/listings", `listing-${id}-photo-${p}.svg`),
      makePh(`listing-${id}-photo-${p}`)
    );
  }
}

console.log("Hero + photo SVGs written.");

// Floor plan SVGs
const roomSets = [
  ["RECEPTION", "OPEN OFFICE", "CONFERENCE", "PANTRY", "PHONE BOOTH"],
  ["OPEN OFFICE", "EXEC OFFICE", "COLLAB", "CONFERENCE", "LOUNGE", "PANTRY"],
  ["RECEPTION", "CONFERENCE", "PHONE BOOTH", "OPEN OFFICE", "EXEC OFFICE", "PANTRY", "LOUNGE"],
  ["OPEN OFFICE", "COLLAB", "CONFERENCE", "PHONE BOOTH", "PANTRY"],
  ["RECEPTION", "EXEC OFFICE", "EXEC OFFICE", "CONFERENCE", "OPEN OFFICE", "PANTRY", "PHONE BOOTH", "LOUNGE"],
  ["OPEN OFFICE", "CONFERENCE", "PANTRY", "LOUNGE"],
  ["RECEPTION", "OPEN OFFICE", "CONFERENCE", "EXEC OFFICE", "COLLAB", "PANTRY"],
  ["OPEN OFFICE", "PHONE BOOTH", "CONFERENCE", "PANTRY", "LOUNGE", "EXEC OFFICE", "COLLAB", "RECEPTION"],
];

const fills = ["#f0f4f8", "#f5f0eb", "#eef5ee", "#f0eef5", "#f5eef0", "#f5f5ee", "#eef5f5", "#f5eeee"];

function makeFP(listingNum, rooms) {
  const id = String(listingNum).padStart(3, "0");
  const n = rooms.length;

  // Layout: perimeter rect, then divide interior into n rooms in a grid-ish arrangement
  const margin = 60;
  const w = 1200 - margin * 2;
  const h = 800 - margin * 2;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const cw = Math.floor(w / cols);
  const ch = Math.floor(h / rows);
  const fillColor = fills[listingNum % fills.length];

  let rects = "";
  for (let r = 0; r < n; r++) {
    const col = r % cols;
    const row = Math.floor(r / cols);
    const x = margin + col * cw + 4;
    const y = margin + row * ch + 4;
    const rw = cw - 8;
    const rh = ch - 8;
    const cx = x + rw / 2;
    const cy = y + rh / 2;
    rects += `  <rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="${fillColor}" stroke="#555" stroke-width="1.5"/>
  <text x="${cx}" y="${cy}" font-family="sans-serif" font-size="13" fill="#333" text-anchor="middle" dominant-baseline="middle">${rooms[r]}</text>\n`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <rect x="${margin}" y="${margin}" width="${w}" height="${h}" fill="none" stroke="#222" stroke-width="3"/>
${rects}  <text x="600" y="25" font-family="sans-serif" font-size="16" fill="#666" text-anchor="middle">listing-${id} — Floor Plan (Schematic)</text>
</svg>`;
}

for (let i = 1; i <= 25; i++) {
  const id = String(i).padStart(3, "0");
  const rooms = roomSets[i % roomSets.length];
  writeFileSync(
    join(root, "public/floorplans", `listing-${id}.svg`),
    makeFP(i, rooms)
  );
}

console.log("Floor plan SVGs written.");
