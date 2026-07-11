import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('/private/tmp/krypt-trailer-render/node_modules/sharp');
const ffmpegPath = require('/private/tmp/krypt-trailer-render/node_modules/ffmpeg-static');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const framesDir = path.join(__dirname, 'frames');
const outputVideo = path.join(__dirname, 'krypt-linkedin-trailer.mp4');
const poster = path.join(__dirname, 'krypt-linkedin-poster.png');
const iconSvg = fs.readFileSync(path.join(repoRoot, 'frontend/public/krypt-mark.svg'), 'utf8');
const iconDataUri = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString('base64')}`;

const W = 1080;
const H = 1350;
const FPS = 24;
const DURATION = 22;
const FRAME_COUNT = Math.round(FPS * DURATION);

const colors = {
  bg: '#030711',
  panel: '#07131f',
  panel2: '#0b1827',
  border: '#213448',
  ink: '#edf6ff',
  muted: '#9fb0c5',
  dim: '#61758c',
  teal: '#2dd4bf',
  cyan: '#67e8f9',
  blue: '#60a5fa',
  gold: '#d6b86a',
  green: '#34d399',
  purple: '#a78bfa',
  red: '#f87171',
};

const scenes = [
  { start: 0, end: 3.2, render: sceneIntro },
  { start: 3.2, end: 6.9, render: sceneDeploy },
  { start: 6.9, end: 12.9, render: sceneFeatures },
  { start: 12.9, end: 17.2, render: sceneFlow },
  { start: 17.2, end: DURATION, render: sceneFinal },
];

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const xml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fade = (p) => clamp(Math.min(p / 0.16, (1 - p) / 0.16));

function text(x, y, value, size, opts = {}) {
  const {
    fill = colors.ink,
    weight = 760,
    anchor = 'middle',
    opacity = 1,
    family = 'Inter, Arial, Helvetica, sans-serif',
  } = opts;
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${fill}" opacity="${opacity}" font-family="${family}" font-size="${size}" font-weight="${weight}" letter-spacing="0">${xml(value)}</text>`;
}

function rect(x, y, w, h, opts = {}) {
  const {
    rx = 8,
    fill = 'none',
    stroke = colors.border,
    strokeWidth = 1,
    opacity = 1,
    filter = '',
  } = opts;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" ${filter ? `filter="${filter}"` : ''}/>`;
}

function line(x1, y1, x2, y2, opts = {}) {
  const {
    stroke = colors.teal,
    width = 2,
    opacity = 1,
    dash = '',
  } = opts;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" opacity="${opacity}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
}

function logo(cx, cy, size, opacity = 1) {
  return `<image href="${iconDataUri}" x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" opacity="${opacity}"/>`;
}

function background(t) {
  const drift = (t * 20) % 110;
  const grid = Array.from({ length: 18 }, (_, i) => {
    const x = i * 86 - drift - 70;
    const y = i * 94 + drift * 0.4 - 120;
    return `
      <line x1="${x}" y1="0" x2="${x + 420}" y2="${H}" stroke="#0f2233" stroke-width="1" opacity="0.33"/>
      <line x1="0" y1="${y}" x2="${W}" y2="${y - 260}" stroke="#0e1d2b" stroke-width="1" opacity="0.22"/>
    `;
  }).join('');
  return `
    <defs>
      <radialGradient id="mainGlow" cx="50%" cy="42%" r="72%">
        <stop offset="0" stop-color="#0d2c38" stop-opacity="0.9"/>
        <stop offset="0.42" stop-color="#071724" stop-opacity="0.72"/>
        <stop offset="1" stop-color="#030711" stop-opacity="1"/>
      </radialGradient>
      <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
        <stop stop-color="#2dd4bf" stop-opacity="0"/>
        <stop offset="0.5" stop-color="#2dd4bf" stop-opacity="0.26"/>
        <stop offset="1" stop-color="#60a5fa" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
        <stop stop-color="#2dd4bf" stop-opacity="0"/>
        <stop offset="0.45" stop-color="#2dd4bf" stop-opacity="1"/>
        <stop offset="1" stop-color="#60a5fa" stop-opacity="0"/>
      </linearGradient>
      <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="26" stdDeviation="32" flood-color="#000000" flood-opacity="0.42"/>
      </filter>
      <filter id="blur">
        <feGaussianBlur stdDeviation="22"/>
      </filter>
    </defs>
    <rect width="${W}" height="${H}" fill="${colors.bg}"/>
    <rect width="${W}" height="${H}" fill="url(#mainGlow)"/>
    ${grid}
    <circle cx="${160 + Math.sin(t * 0.5) * 20}" cy="${1120 + Math.cos(t * 0.3) * 24}" r="290" fill="#0b3135" opacity="0.26" filter="url(#blur)"/>
    <circle cx="${920 + Math.cos(t * 0.4) * 20}" cy="${240 + Math.sin(t * 0.34) * 16}" r="260" fill="#0b2744" opacity="0.18" filter="url(#blur)"/>
    <rect x="-180" y="${925 + Math.sin(t * 0.6) * 18}" width="1500" height="92" fill="url(#sweep)" opacity="0.35" transform="rotate(-13 540 675)"/>
  `;
}

function label(x, y, value, opts = {}) {
  const w = opts.width || Math.max(132, value.length * 12 + 48);
  return `
    ${rect(x - w / 2, y - 27, w, 48, { rx: 24, fill: opts.fill || '#08272c', stroke: opts.stroke || '#165e5d', opacity: opts.opacity ?? 1 })}
    ${text(x, y + 4, value, opts.size || 19, { fill: opts.color || '#ccfbf1', weight: 780, opacity: opts.opacity ?? 1 })}
  `;
}

function cursor(x, y, scale = 1, opacity = 1) {
  return `
    <g opacity="${opacity}" transform="translate(${x} ${y}) scale(${scale})">
      <path d="M0 0 0 62 18 46 30 74 47 67 34 39 58 39Z" fill="#f8fafc" stroke="#0b1320" stroke-width="3" stroke-linejoin="round"/>
    </g>
  `;
}

function featureCard(x, y, title, detail, accent, progress, active = false) {
  const p = clamp(progress);
  const slide = lerp(36, 0, easeOut(p));
  const stroke = active ? accent : colors.border;
  const fill = active ? '#092328' : colors.panel2;
  return `
    <g opacity="${p}" transform="translate(0 ${slide})">
      ${rect(x, y, 418, 126, { rx: 20, fill, stroke, strokeWidth: active ? 2.2 : 1.2, filter: active ? 'url(#shadow)' : '' })}
      <rect x="${x + 24}" y="${y + 30}" width="58" height="58" rx="16" fill="${accent}" opacity="${active ? 0.28 : 0.18}" stroke="${accent}" stroke-width="1.4"/>
      <path d="M${x + 44} ${y + 59}h18M${x + 53} ${y + 50}v18" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
      ${text(x + 106, y + 55, title, 28, { anchor: 'start', weight: 820 })}
      ${text(x + 106, y + 90, detail, 18, { anchor: 'start', fill: colors.muted, weight: 650 })}
    </g>
  `;
}

function sceneIntro(p, t) {
  const op = fade(p);
  const reveal = easeOut(p);
  const logoSize = lerp(150, 205, reveal);
  return `
    <g opacity="${op}">
      <circle cx="540" cy="430" r="${lerp(120, 178, reveal)}" fill="#08272c" opacity="0.46" filter="url(#blur)"/>
      <g filter="url(#shadow)">${logo(540, 430, logoSize)}</g>
      ${text(540, 668, 'Krypt', 86, { weight: 880, opacity: clamp((p - 0.18) / 0.34) })}
      ${text(540, 728, 'privacy tools, finally shipped', 34, { fill: colors.muted, weight: 720, opacity: clamp((p - 0.34) / 0.34) })}
      ${label(540, 845, 'launch build', { width: 190, opacity: clamp((p - 0.48) / 0.32) })}
    </g>
  `;
}

function sceneDeploy(p) {
  const op = fade(p);
  const cardP = easeOut(p);
  const checkP = clamp((p - 0.28) / 0.22);
  const liveP = clamp((p - 0.55) / 0.25);
  return `
    <g opacity="${op}">
      ${text(92, 210, 'Deploying launch build', 44, { anchor: 'start', weight: 850 })}
      ${text(92, 262, 'From learning project to live product surface.', 26, { anchor: 'start', fill: colors.muted, weight: 660 })}
      <g transform="translate(0 ${lerp(60, 0, cardP)})">
        ${rect(92, 376, 896, 474, { rx: 28, fill: colors.panel, stroke: '#264055', filter: 'url(#shadow)' })}
        <rect x="92" y="376" width="896" height="72" rx="28" fill="#0b1b2a"/>
        <circle cx="136" cy="412" r="9" fill="#f87171"/>
        <circle cx="166" cy="412" r="9" fill="#fbbf24"/>
        <circle cx="196" cy="412" r="9" fill="#34d399"/>
        ${text(132, 520, '$ npm run build', 30, { anchor: 'start', fill: colors.cyan, weight: 760 })}
        ${line(132, 570, lerp(132, 840, checkP), 570, { stroke: colors.teal, width: 8, opacity: 0.9 })}
        ${text(132, 650, checkP > 0.98 ? '✓ build passed' : 'building interface...', 30, { anchor: 'start', fill: checkP > 0.98 ? colors.green : colors.muted, weight: 760 })}
        ${text(132, 715, liveP > 0.98 ? '✓ deployed' : 'preparing deploy...', 30, { anchor: 'start', fill: liveP > 0.98 ? colors.green : colors.muted, weight: 760 })}
        <g opacity="${liveP}">
          ${label(780, 748, 'LIVE', { width: 140, fill: '#062d25', stroke: colors.teal, color: '#a7f3d0' })}
        </g>
      </g>
      ${cursor(785, lerp(942, 802, easeInOut(clamp((p - 0.55) / 0.36))), 0.8, clamp((p - 0.45) / 0.28))}
    </g>
  `;
}

function sceneFeatures(p) {
  const op = fade(p);
  const activeIndex = Math.min(5, Math.floor(clamp((p - 0.18) / 0.62) * 6));
  const cards = [
    ['Text Encryption', 'encrypt, decrypt, copy', colors.blue],
    ['File Encryption', 'AES-GCM packages', colors.teal],
    ['Steganography', 'hide text in images', colors.gold],
    ['QR Encryption', 'scanable payloads', colors.purple],
    ['Secure Notes', 'save ciphertext only', colors.green],
    ['Privacy Scanner', 'spot risky text', colors.red],
  ];
  const rendered = cards.map((item, i) => {
    const x = i % 2 === 0 ? 92 : 570;
    const y = 396 + Math.floor(i / 2) * 158;
    return featureCard(x, y, item[0], item[1], item[2], clamp((p - 0.08 - i * 0.055) / 0.34), i === activeIndex);
  }).join('');
  const cursorX = activeIndex % 2 === 0 ? 426 : 904;
  const cursorY = 444 + Math.floor(activeIndex / 2) * 158;
  return `
    <g opacity="${op}">
      ${text(92, 190, 'Core tools', 52, { anchor: 'start', weight: 860 })}
      ${text(92, 246, 'The useful workflows are now easy to reach.', 27, { anchor: 'start', fill: colors.muted, weight: 660 })}
      ${rendered}
      ${cursor(cursorX, cursorY, 0.62, clamp((p - 0.22) / 0.24))}
      ${label(540, 1018, 'interactive workspace', { width: 282, opacity: clamp((p - 0.62) / 0.22) })}
    </g>
  `;
}

function workflowPanel(x, y, title, accent, progress) {
  const p = clamp(progress);
  return `
    <g opacity="${p}" transform="translate(0 ${lerp(34, 0, easeOut(p))})">
      ${rect(x, y, 270, 220, { rx: 24, fill: colors.panel2, stroke: colors.border })}
      <rect x="${x + 28}" y="${y + 30}" width="214" height="18" rx="9" fill="#1d3347"/>
      <rect x="${x + 28}" y="${y + 72}" width="${lerp(90, 194, p)}" height="18" rx="9" fill="${accent}" opacity="0.78"/>
      <rect x="${x + 28}" y="${y + 114}" width="164" height="18" rx="9" fill="#244056"/>
      ${text(x + 135, y + 180, title, 26, { weight: 820 })}
    </g>
  `;
}

function sceneFlow(p) {
  const op = fade(p);
  const a = clamp((p - 0.04) / 0.3);
  const b = clamp((p - 0.24) / 0.3);
  const c = clamp((p - 0.44) / 0.3);
  return `
    <g opacity="${op}">
      ${text(92, 210, 'One simple flow', 50, { anchor: 'start', weight: 860 })}
      ${text(92, 264, 'Create. Encrypt. Save or share.', 28, { anchor: 'start', fill: colors.muted, weight: 680 })}
      ${workflowPanel(92, 438, 'input', colors.blue, a)}
      ${workflowPanel(405, 438, 'encrypt', colors.teal, b)}
      ${workflowPanel(718, 438, 'output', colors.green, c)}
      ${line(362, 548, 402, 548, { stroke: colors.teal, width: 4, opacity: b, dash: '8 10' })}
      ${line(675, 548, 715, 548, { stroke: colors.teal, width: 4, opacity: c, dash: '8 10' })}
      <g opacity="${clamp((p - 0.62) / 0.22)}">
        ${rect(190, 785, 700, 120, { rx: 28, fill: '#071c22', stroke: '#1d5a56', filter: 'url(#shadow)' })}
        ${logo(248, 845, 58)}
        ${text(304, 854, 'keys stay with the user', 32, { anchor: 'start', weight: 780 })}
      </g>
    </g>
  `;
}

function sceneFinal(p) {
  const op = fade(p);
  const titleP = clamp((p - 0.18) / 0.28);
  const subP = clamp((p - 0.34) / 0.3);
  const lineP = clamp((p - 0.52) / 0.25);
  return `
    <g opacity="${op}">
      <circle cx="540" cy="376" r="${lerp(110, 150, easeOut(p))}" fill="#08272c" opacity="0.42" filter="url(#blur)"/>
      <g filter="url(#shadow)">${logo(540, 376, lerp(122, 164, easeOut(p)))}</g>
      ${text(540, 602, 'Krypt is live', 74, { weight: 880, opacity: titleP })}
      ${text(540, 678, 'encryption tools in one workspace', 34, { fill: colors.muted, weight: 720, opacity: subP })}
      <path d="M${540 - 250 * lineP} 770H${540 + 250 * lineP}" stroke="url(#lineGrad)" stroke-width="3" stroke-linecap="round" opacity="${lineP}"/>
      <g opacity="${clamp((p - 0.62) / 0.26)}">
        ${label(540, 885, 'launching now', { width: 242 })}
        ${text(540, 1004, 'feedback welcome', 30, { fill: colors.muted, weight: 700 })}
      </g>
    </g>
  `;
}

function renderFrame(frame) {
  const t = frame / FPS;
  const scene = scenes.find((item) => t >= item.start && t < item.end) || scenes.at(-1);
  const p = clamp((t - scene.start) / (scene.end - scene.start));
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      ${background(t)}
      ${scene.render(p, t)}
    </svg>
  `;
}

async function main() {
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
    await sharp(Buffer.from(renderFrame(frame)))
      .png()
      .toFile(path.join(framesDir, `frame_${String(frame).padStart(4, '0')}.png`));
    if (frame % 72 === 0) process.stdout.write(`rendered ${frame}/${FRAME_COUNT}\n`);
  }

  fs.copyFileSync(path.join(framesDir, 'frame_0508.png'), poster);

  const result = spawnSync(ffmpegPath, [
    '-y',
    '-framerate',
    String(FPS),
    '-i',
    path.join(framesDir, 'frame_%04d.png'),
    '-f',
    'lavfi',
    '-i',
    'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-shortest',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-profile:v',
    'high',
    '-level',
    '4.1',
    '-crf',
    '18',
    '-preset',
    'medium',
    '-c:a',
    'aac',
    '-b:a',
    '96k',
    '-movflags',
    '+faststart',
    outputVideo,
  ], { stdio: 'inherit' });

  if (result.status !== 0) throw new Error(`ffmpeg failed with status ${result.status}`);
  fs.rmSync(framesDir, { recursive: true, force: true });
  console.log(`video: ${outputVideo}`);
  console.log(`poster: ${poster}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
