import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'assets', 'lastfm.svg');

const USER = process.env.LASTFM_USER || 'yukinagat000';
const KEY = process.env.LASTFM_API_KEY || '';
const PLACEHOLDER_HASHES = ['2a96cbd8b46e442fc41c2b86b821562f', '4128a3364b50fc2d72f16768f72f47cc'];

const W = 640, H = 184;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '\u2026' : s);

async function getTrack() {
  if (!KEY) throw new Error('LASTFM_API_KEY is not set');
  const qs = `method=user.getrecenttracks&user=${encodeURIComponent(USER)}&api_key=${encodeURIComponent(KEY)}&limit=5&format=json`;
  const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${qs}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Last.fm HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.message || 'Last.fm error');
  const raw = data?.recenttracks?.track;
  if (!raw) return null;
  const tracks = Array.isArray(raw) ? raw : [raw];
  return tracks[0] || null;
}

async function fetchCover(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
    if (!/^image\/(jpeg|png|webp|gif)$/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 400_000) return null;
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

function pickCoverUrl(track) {
  const images = track?.image || [];
  for (let i = images.length - 1; i >= 0; i--) {
    const url = images[i]?.['#text'] || '';
    if (url && !PLACEHOLDER_HASHES.some((h) => url.includes(h))) return url;
  }
  return '';
}

function cleanArtistForSearch(artist) {
  return String(artist || '')
    .replace(/,\s*[\d.,\s]+\s*(?:млн|млрд|тыс|million|billion|thousand|[KMB])?\s*(?:прослушива[а-яё]*|listeners|scrobbles)\s*$/i, '')
    .trim();
}

async function fetchCoverFromItunes(artist, track) {
  try {
    const term = encodeURIComponent(`${cleanArtistForSearch(artist)} ${track}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=1`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return '';
    const data = await res.json();
    const url = data?.results?.[0]?.artworkUrl100 || '';
    return url ? url.replace('100x100', '600x600') : '';
  } catch {
    return '';
  }
}

function buildSvg({ status, line, live, cover }) {
  const bars = [10, 18, 26, 14, 30, 22, 12, 26, 34, 18, 10, 22, 30, 16, 26, 12, 20, 32, 14, 24, 18, 28, 12, 20];
  const barSvg = bars
    .map((h, i) => {
      const x = 168 + i * 10;
      const y = 84 - h / 2;
      const fill = live ? (i % 3 === 0 ? '#67e8f9' : '#a5f3fc') : '#e2e8f0';
      return `<rect x="${x}" y="${y.toFixed(1)}" width="4" height="${h}" rx="2" fill="${fill}"/>`;
    })
    .join('');

  const pillW = Math.round(status.length * 7.6 + 36);
  const dotColor = live ? '#22c55e' : '#94a3b8';

  const coverInner = cover
    ? `<image href="${cover}" x="30" y="36" width="112" height="112" clip-path="url(#coverClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="30" y="36" width="112" height="112" rx="20" fill="url(#phGrad)"/>
       <circle cx="86" cy="92" r="30" fill="none" stroke="#94a3b8" stroke-width="4"/>
       <circle cx="86" cy="92" r="9" fill="#94a3b8"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'JetBrains Mono','Cascadia Mono',Consolas,'Courier New',monospace">
  <defs>
    <linearGradient id="cardBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#f8fafc"/>
    </linearGradient>
    <linearGradient id="phGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f1f5f9"/>
      <stop offset="1" stop-color="#e2e8f0"/>
    </linearGradient>
    <filter id="blurA" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="34"/>
    </filter>
    <filter id="pillGlow" x="-40%" y="-80%" width="180%" height="260%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#a5f3fc" flood-opacity="0.65"/>
    </filter>
    <clipPath id="cardClip">
      <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="26"/>
    </clipPath>
    <clipPath id="coverClip">
      <rect x="30" y="36" width="112" height="112" rx="20"/>
    </clipPath>
  </defs>

  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="26" fill="url(#cardBg)"/>
  <g clip-path="url(#cardClip)">
    <circle cx="${W + 30}" cy="-20" r="130" fill="#a5f3fc" opacity="0.5" filter="url(#blurA)"/>
    <circle cx="-30" cy="${H + 40}" r="110" fill="#67e8f9" opacity="0.28" filter="url(#blurA)"/>
  </g>
  <rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="25.5" fill="none" stroke="#e2e8f0" stroke-width="1.5"/>

  ${coverInner}
  <rect x="30" y="36" width="112" height="112" rx="20" fill="none" stroke="#ffffff" stroke-width="4"/>
  <rect x="28" y="34" width="116" height="116" rx="22" fill="none" stroke="#e2e8f0" stroke-width="1.5"/>

  <text x="168" y="58" font-size="12.5" letter-spacing="2.4" fill="#64748b">CURRENTLY LISTENING</text>
  <circle cx="360" cy="53.5" r="5" fill="${dotColor}"/>
  ${live ? '<circle cx="360" cy="53.5" r="9" fill="#22c55e" opacity="0.25"/>' : ''}

  ${barSvg}

  <text x="168" y="122" font-size="23" font-weight="700" letter-spacing="-0.3" fill="#0a0c10" font-family="Montserrat,'Segoe UI',Roboto,Arial,sans-serif">${esc(trunc(line, 31))}</text>

  <g filter="url(#pillGlow)">
    <rect x="168" y="140" width="${pillW}" height="30" rx="15" fill="#ffffff" stroke="#a5f3fc" stroke-width="1.5"/>
  </g>
  <text x="${168 + pillW / 2}" y="159.5" font-size="12" letter-spacing="1.2" fill="#0f172a" text-anchor="middle">${esc(status)}</text>

  <text x="${W - 26}" y="166" font-size="11.5" letter-spacing="0.8" fill="#94a3b8" text-anchor="end">last.fm/${esc(USER)}</text>
</svg>
`;
}

async function main() {
  let status = 'НИЧЕГО НЕ ИГРАЕТ';
  let line = '';
  let live = false;
  let cover = '';

  try {
    const track = await getTrack();
    if (track && track.name) {
      const artist = track.artist?.['#text'] || 'Unknown Artist';
      const nowAttr = track['@attr'] || {};
      live = nowAttr.nowplaying === 'true' || nowAttr.nowplaying === '1';
      status = live ? 'СЛУШАЕТСЯ' : 'ПОСЛЕДНИЙ ТРЕК';
      line = `${artist} \u2014 ${track.name}`;
      const coverUrl = pickCoverUrl(track);
      if (coverUrl) {
        cover = await fetchCover(coverUrl);
      } else {
        const itunesUrl = await fetchCoverFromItunes(artist, track.name);
        if (itunesUrl) cover = await fetchCover(itunesUrl);
      }
    }
  } catch (err) {
    console.error('lastfm:', err.message);
  }

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, buildSvg({ status, line, live, cover }), 'utf8');
  console.log(`lastfm.svg -> ${status}${line ? ` (${line})` : ''}, cover=${cover ? 'yes' : 'no'}`);
}

main();
