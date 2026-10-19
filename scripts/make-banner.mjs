import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATAR = path.join(__dirname, '..', 'assets', 'avatar.jpg');
const OUT = path.join(__dirname, '..', 'assets', 'banner.svg');

const W = 1200, H = 360;
const MONO = "'JetBrains Mono','Cascadia Mono',Consolas,'Courier New',monospace";
const SANS = "Montserrat,'Segoe UI',Roboto,Arial,sans-serif";
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function pill(x, cy, label, opts = {}) {
  const fs_ = opts.fontSize || 14;
  const w = Math.round(label.length * fs_ * 0.62 + 36);
  const h = 36;
  const glow = opts.glow
    ? `<g filter="url(#pillGlow)"><rect x="${x}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="#ffffff" stroke="#a5f3fc" stroke-width="1.5"/></g>`
    : `<rect x="${x}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>`;
  const text = `<text x="${x + w / 2}" y="${cy}" font-size="${fs_}" fill="#0f172a" text-anchor="middle" dominant-baseline="central" font-family="${MONO}" letter-spacing="0.5">${esc(label)}</text>`;
  return { svg: glow + text, width: w };
}

async function main() {
  const avatarB64 = (await fs.readFile(AVATAR)).toString('base64');
  const avatar = `data:image/jpeg;base64,${avatarB64}`;

  let px = 286;
  const pills = ['I use Arch btw', 'Code', 'Music'];
  const pillSvgs = pills.map((label, i) => {
    const p = pill(px, 258, label, { glow: i === 0 });
    px += p.width + 14;
    return p.svg;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#f1f5f9"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="#e2e8f0" stroke-width="1" stroke-opacity="0.7"/>
    </pattern>
    <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="1" fill="#0a0c10" opacity="0.035"/>
    </pattern>
    <filter id="blurA" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="36"/>
    </filter>
    <filter id="avatarGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="14"/>
    </filter>
    <filter id="pillGlow" x="-50%" y="-100%" width="200%" height="300%">
      <feDropShadow dx="0" dy="4" stdDeviation="7" flood-color="#a5f3fc" flood-opacity="0.7"/>
    </filter>
    <clipPath id="frameClip">
      <rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="26"/>
    </clipPath>
    <clipPath id="avatarClip">
      <circle cx="152" cy="180" r="86"/>
    </clipPath>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g clip-path="url(#frameClip)">
    <rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="url(#grid)"/>
    <circle cx="1010" cy="20" r="170" fill="#a5f3fc" opacity="0.55" filter="url(#blurA)"/>
    <circle cx="1170" cy="330" r="130" fill="#67e8f9" opacity="0.3" filter="url(#blurA)"/>
    <circle cx="40" cy="350" r="120" fill="#cffafe" opacity="0.7" filter="url(#blurA)"/>
    <rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="url(#scan)"/>
  </g>
  <rect x="6.75" y="6.75" width="${W - 13.5}" height="${H - 13.5}" rx="25.5" fill="none" stroke="#0f172a" stroke-opacity="0.1" stroke-width="1.5"/>

  <circle cx="152" cy="180" r="94" fill="#a5f3fc" opacity="0.75" filter="url(#avatarGlow)"/>
  <image href="${avatar}" x="66" y="94" width="172" height="172" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>
  <circle cx="152" cy="180" r="86" fill="none" stroke="#ffffff" stroke-width="5"/>
  <circle cx="152" cy="180" r="88.5" fill="none" stroke="#e2e8f0" stroke-width="1.5"/>
  <circle cx="214" cy="242" r="14" fill="#22c55e" stroke="#ffffff" stroke-width="5"/>

  <text x="${W - 44}" y="52" font-size="13" letter-spacing="4" fill="#94a3b8" text-anchor="end" font-family="${MONO}">01 // \u041F\u0420\u041E\u0424\u0418\u041B\u042C</text>

  <text x="286" y="176" font-size="58" font-weight="800" letter-spacing="-1" fill="#0a0c10" font-family="${SANS}">yukinagat000</text>
  <text x="288" y="212" font-size="17" fill="#475569" font-family="${MONO}">@yukinagat000 \u00B7 \u041C\u0443\u0437\u044B\u043A\u0430\u043D\u0442 \u00B7 \u043A\u043E\u0434\u0435\u0440 \u00B7 \u0434\u0438\u0437\u0430\u0439\u043D\u0435\u0440</text>

  ${pillSvgs}

  <text x="${W - 44}" y="${H - 30}" font-size="13" letter-spacing="1" fill="#94a3b8" text-anchor="end" font-family="${MONO}">github.com/yukinagat000</text>
</svg>
`;

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, svg, 'utf8');
  console.log(`banner.svg written (${svg.length} bytes)`);
}

main();
