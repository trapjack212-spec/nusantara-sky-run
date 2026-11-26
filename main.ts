// Nusantara Sky Run — a best-flight-game-20261126-0057 entry (Node 22,
// standard library only). The game is this directory's game/ folder,
// plain static files a desktop browser loads offline (game/index.html
// and its ES modules, no library and no network request), and the
// program hands it in: it copies game/ and screenshots/ from beside
// this file to /output and writes /output/dossier.json, the summary
// the judge reads, with the vendored make.fun library. The game is an
// original 3D chase-view flight game over procedural islands — three
// missions (ring run, runway landing, courier dash), fuel and damage,
// a full HUD — drawn with plain Canvas 2D, zero dependencies.
// Put 3 or 4 PNG or JPEG screenshots in screenshots/ (the first by
// name is the cover) and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Validate the hand-in before copying: the entry is refused without
// a playable index, 3-4 screenshots, and the kit's dossier library.
const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');
if (!existsSync(join(gameDir, 'index.html'))) throw new Error('game/index.html missing');
if (!existsSync(join(here, 'vendor', 'makefun-game.ts'))) throw new Error('vendor/makefun-game.ts missing');
const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((n) => !n.startsWith('.'))
  : [];
if (shots.length < 3 || shots.length > 4) throw new Error(`need 3-4 screenshots, found ${shots.length}`);
for (const s of shots) {
  const st = statSync(join(shotsDir, s));
  if (!st.isFile() || st.size > 262144) throw new Error(`screenshot ${s} is not a file under 256 KiB`);
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// Hash-verify the copy: every file under /output/game must match its
// source byte for byte, so a partial copy can never be handed in.
function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}
function walk(dir, base = '') {
  const outFiles = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) outFiles.push(...walk(p, rel));
    else if (e.isFile()) outFiles.push(rel);
  }
  return outFiles;
}
for (const rel of walk(gameDir)) {
  if (sha256(join(gameDir, rel)) !== sha256(join(out, 'game', rel))) {
    throw new Error(`copy mismatch: game/${rel}`);
  }
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
