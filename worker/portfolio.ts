/**
 * The portfolio — WEBSITE-SPEC §15 (APP-11).
 *
 * A public page at `/portfolio`, with no sign-in: Dave's rated pizzas that
 * have a photo, as a grid, and a page for each at `/portfolio/{id}`. The
 * Worker builds them as plain HTML with no script, so a link preview reads
 * the same page a person does, and each pizza's link previews its own photo.
 *
 * What leaves: the fields `portfolioPizzas` keeps (name, pre-bake,
 * post-bake, rating, photo, id) of the ideas it lists, and their photos.
 * Notes, comments, dates, hidden ideas and their photos never do. A photo
 * is served only when a listed idea names it.
 *
 * GitHub is read with the Worker's token, in one GraphQL request for every
 * idea's text and the photo folder's listing. That snapshot is kept for a
 * minute, and the last good one for a week, so a burst of visitors costs
 * one request and a GitHub outage still shows the page. A photo is read by
 * its git blob, whose content never changes, and kept as long as the cache
 * holds it.
 *
 * Like `app.ts`, this uses only web-standard APIs and takes its GitHub
 * `fetch` and its cache as arguments, so `tests/portfolio.worker.test.ts`
 * runs it in Node.
 */

import { formatRating } from '../src/lib/format';
import { PORTFOLIO_FIELDS, portfolioPizzas, toppingsLine, type PortfolioPizza } from '../src/lib/portfolio';
import { RATING_MAX, isPhotoName, parseIdea, type ToppingIdea } from '../src/lib/toppings';
import { escapeHtml, markdownToHtml } from './markdownHtml';

// ---------------------------------------------------------------------------
// What the routes are given
// ---------------------------------------------------------------------------

/** A byte cache with an age limit per entry (the Workers Cache API in production). */
export interface PortfolioCache {
  get(key: string): Promise<Uint8Array | null>;
  put(key: string, value: Uint8Array, maxAgeS: number): Promise<void>;
}

export interface PortfolioDeps {
  githubFetch: (url: string, init: RequestInit) => Promise<Response>;
  githubToken: string | undefined;
  owner: string;
  repo: string;
  /** Tests point this at a fake; production leaves it unset. */
  githubApi?: string | undefined;
  cache: PortfolioCache;
}

/**
 * The cache keys for the view of the ideas. A new key with each change to
 * what a pizza carries, so a copy cached by the build before is never read
 * without its fields.
 */
export const SNAPSHOT_KEY = 'snapshot-v2';
export const SNAPSHOT_LAST_GOOD_KEY = 'snapshot-last-good-v2';

/** How long the page's view of the ideas is reused before GitHub is asked again. */
export const SNAPSHOT_MAX_AGE_S = 60;
/** The last good view, shown while GitHub can't be read. */
export const LAST_GOOD_MAX_AGE_S = 7 * 24 * 60 * 60;
/** A photo's blob never changes, so it is kept until the cache lets it go. */
export const BLOB_MAX_AGE_S = 30 * 24 * 60 * 60;
/** How long a browser or a link preview reuses a page and a photo. */
export const PAGE_MAX_AGE_S = 60;
export const PHOTO_MAX_AGE_S = 60 * 60;

const GITHUB_API = 'https://api.github.com';

// ---------------------------------------------------------------------------
// Reading GitHub
// ---------------------------------------------------------------------------

/** The listed pizzas, and the git blob of each one's photo. */
export interface Snapshot {
  pizzas: PortfolioPizza[];
  photos: Record<string, string>;
}

/** One request: every file under `toppings/` with its text, and the photo folder's names. */
export const SNAPSHOT_QUERY = `query($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    ideas: object(expression: "HEAD:toppings") {
      ... on Tree { entries { name type object { ... on Blob { text isTruncated } } } }
    }
    images: object(expression: "HEAD:toppings/images") {
      ... on Tree { entries { name type oid } } }
  }
}`;

class GitHubUnavailable extends Error {}

function githubHeaders(token: string): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'pizza-calculator-worker',
  };
}

interface TreeEntry {
  name?: unknown;
  type?: unknown;
  oid?: unknown;
  object?: { text?: unknown; isTruncated?: unknown } | null;
}

const entriesOf = (tree: unknown): TreeEntry[] => {
  const entries = (tree as { entries?: unknown } | null)?.entries;
  return Array.isArray(entries) ? (entries as TreeEntry[]) : [];
};

async function readSnapshot(deps: PortfolioDeps): Promise<Snapshot> {
  if (!deps.githubToken) throw new GitHubUnavailable('no token');
  let res: Response;
  try {
    res = await deps.githubFetch(`${deps.githubApi ?? GITHUB_API}/graphql`, {
      method: 'POST',
      headers: { ...githubHeaders(deps.githubToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: SNAPSHOT_QUERY, variables: { owner: deps.owner, repo: deps.repo } }),
    });
  } catch {
    throw new GitHubUnavailable('unreachable');
  }
  if (!res.ok) throw new GitHubUnavailable(`status ${res.status}`);
  const body = (await res.json().catch(() => null)) as { data?: { repository?: { ideas?: unknown; images?: unknown } }; errors?: unknown } | null;
  const repository = body?.data?.repository;
  if (!repository || body?.errors) throw new GitHubUnavailable('no repository');

  const blobs = new Map<string, string>();
  for (const e of entriesOf(repository.images)) {
    if (e.type !== 'blob' || typeof e.name !== 'string' || typeof e.oid !== 'string') continue;
    const name = e.name.replace(/\.jpg$/, '');
    if (name !== e.name && isPhotoName(name)) blobs.set(name, e.oid);
  }
  const ideas: ToppingIdea[] = [];
  for (const e of entriesOf(repository.ideas)) {
    if (e.type !== 'blob' || typeof e.name !== 'string' || !e.name.endsWith('.json')) continue;
    const text = e.object?.text;
    if (typeof text !== 'string' || e.object?.isTruncated === true) continue;
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      continue;
    }
    const idea = parseIdea(raw);
    if (idea) ideas.push(idea);
  }
  const pizzas = portfolioPizzas(ideas, (photo) => blobs.has(photo));
  return { pizzas, photos: Object.fromEntries(pizzas.map((p) => [p.photo, blobs.get(p.photo)!])) };
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Only the listed fields go into the cache, so nothing else can come back out of it. */
function storedSnapshot(s: Snapshot): Uint8Array {
  const pizzas = s.pizzas.map((p) => Object.fromEntries(PORTFOLIO_FIELDS.map((k) => [k, p[k]])));
  return encoder.encode(JSON.stringify({ pizzas, photos: s.photos }));
}

async function cachedSnapshot(deps: PortfolioDeps, key: string): Promise<Snapshot | null> {
  const bytes = await deps.cache.get(key);
  if (!bytes) return null;
  try {
    return JSON.parse(decoder.decode(bytes)) as Snapshot;
  } catch {
    return null;
  }
}

/** The view of the ideas: a minute old at most, or the last good one while GitHub can't be read. */
export async function snapshot(deps: PortfolioDeps): Promise<Snapshot> {
  const fresh = await cachedSnapshot(deps, SNAPSHOT_KEY);
  if (fresh) return fresh;
  try {
    const read = await readSnapshot(deps);
    const bytes = storedSnapshot(read);
    await deps.cache.put(SNAPSHOT_KEY, bytes, SNAPSHOT_MAX_AGE_S);
    await deps.cache.put(SNAPSHOT_LAST_GOOD_KEY, bytes, LAST_GOOD_MAX_AGE_S);
    return read;
  } catch (e) {
    const lastGood = e instanceof GitHubUnavailable ? await cachedSnapshot(deps, SNAPSHOT_LAST_GOOD_KEY) : null;
    if (lastGood) return lastGood;
    throw e;
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function photoBytes(deps: PortfolioDeps, blobSha: string): Promise<Uint8Array> {
  const key = `blob-${blobSha}`;
  const cached = await deps.cache.get(key);
  if (cached) return cached;
  if (!deps.githubToken) throw new GitHubUnavailable('no token');
  const base = deps.githubApi ?? GITHUB_API;
  let res: Response;
  try {
    res = await deps.githubFetch(
      `${base}/repos/${encodeURIComponent(deps.owner)}/${encodeURIComponent(deps.repo)}/git/blobs/${blobSha}`,
      { method: 'GET', headers: githubHeaders(deps.githubToken) },
    );
  } catch {
    throw new GitHubUnavailable('unreachable');
  }
  if (!res.ok) throw new GitHubUnavailable(`status ${res.status}`);
  const body = (await res.json().catch(() => null)) as { content?: unknown; encoding?: unknown } | null;
  if (typeof body?.content !== 'string' || body.encoding !== 'base64') throw new GitHubUnavailable('unreadable');
  const bytes = base64ToBytes(body.content);
  await deps.cache.put(key, bytes, BLOB_MAX_AGE_S);
  return bytes;
}

// ---------------------------------------------------------------------------
// The pages
// ---------------------------------------------------------------------------

/** §15's rendered copy. */
export const COPY = {
  title: "Dave's pizzas",
  subtitle: 'Neo-Neapolitan style',
  back: 'All pizzas',
  rating: "Dave's rating",
  preBake: 'Pre-bake',
  postBake: 'Post-bake',
  desserts: 'Dessert pizzas',
  empty: 'No pizzas here yet.',
  notFound: "That pizza isn't in the portfolio.",
  unavailable: "The pizzas couldn't be loaded. Try again in a minute.",
} as const;

/** No script, nothing from elsewhere: images from this address, and the page's own styles. */
export const PAGE_CSP =
  "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const STYLE = `
:root{color-scheme:light dark;--bg:#e9e6e1;--ink:#151311;--muted:#5d5751;--frame:#fff;--accent:#c2410c;--star:#c2410c;
  --shadow:0 1px 2px rgba(0,0,0,.08),0 6px 16px rgba(0,0,0,.08)}
@media (prefers-color-scheme:dark){:root{--bg:#121110;--ink:#f4f1ec;--muted:#a39d95;--frame:#1f1d1b;--accent:#fb923c;--star:#fb923c;
  --shadow:0 1px 2px rgba(0,0,0,.5)}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;min-height:100dvh;background:var(--bg);color:var(--ink);
  font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
img{display:block}
a{color:inherit}
.wrap{max-width:72rem;margin:0 auto;padding:0 16px 48px}
header{padding:30px 0 20px;display:flex;align-items:flex-end;justify-content:space-between;gap:12px;
  border-bottom:3px solid var(--ink);margin-bottom:18px}
h1.title{margin:0;font-size:2.3rem;line-height:.95;text-transform:uppercase;font-weight:900;letter-spacing:-.02em}
h1.title em{font-style:normal;color:var(--accent)}
.sub{margin:0;color:var(--muted);font-size:.95rem;text-align:right;line-height:1.3}
.grid{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
@media (min-width:640px){.grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}}
@media (min-width:1024px){.grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:22px}}
.tile{display:block;height:100%;background:var(--frame);padding:7px 7px 0;box-shadow:var(--shadow);border-radius:3px;text-decoration:none}
.tile img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:1px;background:var(--bg)}
.tile span{display:flex;align-items:center;min-height:3.4rem;padding:6px 3px 8px;font-weight:800;text-transform:uppercase;
  letter-spacing:.02em;font-size:.86rem;line-height:1.2;overflow-wrap:anywhere}
.tile:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
.note{color:var(--muted);font-size:1.05rem}
.kind{margin:36px 0 18px;padding-bottom:10px;border-bottom:3px solid var(--ink);font-size:1.5rem;line-height:1;
  text-transform:uppercase;font-weight:900;letter-spacing:-.01em;color:var(--accent)}
.bar{position:sticky;top:0;z-index:1;background:var(--bg);margin:0 -16px;padding:4px 12px}
.back{min-height:48px;min-width:48px;display:inline-flex;align-items:center;gap:6px;font-weight:600;text-decoration:none}
.back svg{width:22px;height:22px}
.pizza{display:grid;gap:22px;max-width:30rem;margin:0 auto}
@media (min-width:768px){.pizza{max-width:none;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px;align-items:start;padding-top:8px}}
.print{background:var(--frame);padding:10px 10px 18px;box-shadow:var(--shadow);border-radius:3px}
.print img{width:100%;aspect-ratio:1;object-fit:cover;background:var(--bg)}
.print h1{margin:14px 4px 6px;font-size:1.7rem;text-transform:uppercase;font-weight:900;line-height:1.05;letter-spacing:-.01em;overflow-wrap:anywhere}
.rating{display:flex;align-items:center;gap:10px;margin:0 4px;font-weight:700;font-size:.85rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.stars{display:inline-flex;gap:2px}
.stars svg{width:22px;height:22px}
.sects{display:grid;gap:18px}
.sect{border-top:3px solid var(--ink);padding-top:8px;font-size:1.05rem;line-height:1.45;overflow-wrap:anywhere}
.sect h2{margin:0 0 4px;font-size:.85rem;text-transform:uppercase;letter-spacing:.08em;color:var(--accent)}
.sect ul,.sect ol{margin:0;padding-left:1.25em}
.sect li{margin:.2em 0}
.sect p{margin:.3em 0}
.sect a{text-decoration:underline;text-underline-offset:2px}
`;

const BACK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';

const STAR_PATH = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z';

/** Five stars, the half drawn as a half, as the Toppings tab draws them; screen readers hear the number. */
export function starsHtml(rating: number): string {
  const stars = Array.from({ length: RATING_MAX }, (_, i) => {
    const fill = Math.max(0, Math.min(1, rating - i)) * 100;
    return (
      `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="star-${i}">` +
      `<stop offset="${fill}%" style="stop-color:var(--star)"/><stop offset="${fill}%" style="stop-color:transparent"/>` +
      `</linearGradient></defs><path d="${STAR_PATH}" fill="url(#star-${i})" style="stroke:var(--star)" stroke-width="1.5" stroke-linejoin="round"/></svg>`
    );
  }).join('');
  return `<span class="stars" role="img" aria-label="Rated ${formatRating(rating)} of ${RATING_MAX}">${stars}</span>`;
}

const photoPath = (photo: string) => `/portfolio/photos/${photo}.jpg`;

interface Preview {
  title: string;
  description: string;
  image: { url: string; width?: number; height?: number } | null;
  url: string;
}

/**
 * The grid's link preview (§15.1): the title over a grid of pizzas, made by
 * `scripts/portfolio-preview.py` and served from `public/` as a static file.
 */
export const GRID_PREVIEW = { path: '/portfolio-preview.jpg', width: 1200, height: 630 } as const;

function pageDocument(title: string, body: string, preview: Preview | null): string {
  const meta = preview
    ? [
        `<meta name="description" content="${escapeHtml(preview.description)}">`,
        `<meta property="og:type" content="website">`,
        `<meta property="og:title" content="${escapeHtml(preview.title)}">`,
        `<meta property="og:description" content="${escapeHtml(preview.description)}">`,
        `<meta property="og:url" content="${escapeHtml(preview.url)}">`,
        ...(preview.image
          ? [
              `<meta property="og:image" content="${escapeHtml(preview.image.url)}">`,
              ...(preview.image.width && preview.image.height
                ? [
                    `<meta property="og:image:width" content="${preview.image.width}">`,
                    `<meta property="og:image:height" content="${preview.image.height}">`,
                  ]
                : []),
              `<meta name="twitter:card" content="summary_large_image">`,
            ]
          : []),
      ].join('\n')
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>${escapeHtml(title)}</title>
${meta}
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>${STYLE}</style>
</head>
<body>
<div class="wrap">
${body}
</div>
</body>
</html>
`;
}

const masthead = `<header><h1 class="title">${escapeHtml("Dave's")}<br><em>pizzas</em></h1><p class="sub">${escapeHtml(COPY.subtitle)}</p></header>`;
const backBar = (to: string) => `<nav class="bar"><a class="back" href="${escapeHtml(to)}">${BACK_ICON}${escapeHtml(COPY.back)}</a></nav>`;

const tile = (p: PortfolioPizza, eager: boolean) =>
  `<li id="${p.id}"><a class="tile" href="/portfolio/${p.id}">` +
  `<img src="${photoPath(p.photo)}" alt="" ${eager ? '' : 'loading="lazy" '}decoding="async">` +
  `<span>${escapeHtml(p.name)}</span></a></li>`;

const tileList = (pizzas: readonly PortfolioPizza[], eagerCount: number) =>
  `<ul class="grid">\n${pizzas.map((p, i) => tile(p, i < eagerCount)).join('\n')}\n</ul>`;

/**
 * The pizzas, then the dessert pizzas under their own heading (Dave, 12 Nov
 * 2026). The heading shows only when both kinds are listed: with dessert
 * pizzas alone, the title already says what they are.
 */
export function gridPage(s: Snapshot, origin: string): string {
  const pizzas = s.pizzas.filter((p) => !p.dessert);
  const desserts = s.pizzas.filter((p) => p.dessert);
  const lists =
    pizzas.length && desserts.length
      ? tileList(pizzas, 4) + `\n<h2 class="kind">${escapeHtml(COPY.desserts)}</h2>\n` + tileList(desserts, 0)
      : tileList(s.pizzas, 4);
  const body = masthead + (s.pizzas.length ? lists : `<p class="note">${escapeHtml(COPY.empty)}</p>`);
  return pageDocument(COPY.title, body, {
    title: COPY.title,
    description: COPY.subtitle,
    image: s.pizzas.length ? { url: origin + GRID_PREVIEW.path, width: GRID_PREVIEW.width, height: GRID_PREVIEW.height } : null,
    url: `${origin}/portfolio`,
  });
}

export function pizzaPage(p: PortfolioPizza, origin: string): string {
  const sections = (
    [
      [COPY.preBake, p.pre_bake],
      [COPY.postBake, p.post_bake],
    ] as const
  )
    .filter(([, text]) => text.trim() !== '')
    .map(([heading, text]) => `<section class="sect"><h2>${escapeHtml(heading)}</h2>${markdownToHtml(text)}</section>`)
    .join('\n');
  const body =
    backBar(`/portfolio#${p.id}`) +
    `<article class="pizza"><div class="print"><img src="${photoPath(p.photo)}" alt="${escapeHtml(p.name)}">` +
    `<h1>${escapeHtml(p.name)}</h1><div class="rating">${starsHtml(p.rating)}<span>${escapeHtml(COPY.rating)}</span></div></div>` +
    `<div class="sects">${sections}</div></article>`;
  return pageDocument(`${p.name} · ${COPY.title}`, body, {
    title: p.name,
    description: toppingsLine(p.pre_bake),
    image: { url: origin + photoPath(p.photo) },
    url: `${origin}/portfolio/${p.id}`,
  });
}

function messagePage(text: string, withBack: boolean): string {
  return pageDocument(COPY.title, (withBack ? backBar('/portfolio') : masthead) + `<p class="note">${escapeHtml(text)}</p>`, null);
}

// ---------------------------------------------------------------------------
// The routes
// ---------------------------------------------------------------------------

function html(request: Request, status: number, body: string, maxAgeS: number | null): Response {
  return new Response(request.method === 'HEAD' ? null : body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': maxAgeS === null ? 'no-store' : `public, max-age=${maxAgeS}`,
      'Content-Security-Policy': PAGE_CSP,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
    },
  });
}

/** True for every path this file answers: `/portfolio` and anything under it. */
export function isPortfolioPath(pathname: string): boolean {
  return pathname === '/portfolio' || pathname.startsWith('/portfolio/');
}

export async function handlePortfolio(request: Request, deps: PortfolioDeps): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  if (url.pathname === '/portfolio/') return Response.redirect(`${url.origin}/portfolio`, 308);

  const photo = /^\/portfolio\/photos\/([\w-]+)\.jpg$/.exec(url.pathname)?.[1];
  const id = /^\/portfolio\/([\w-]+)$/.exec(url.pathname)?.[1];
  if (url.pathname !== '/portfolio' && photo === undefined && id === undefined) {
    return html(request, 404, messagePage(COPY.notFound, true), null);
  }

  let s: Snapshot;
  try {
    s = await snapshot(deps);
  } catch {
    return html(request, 503, messagePage(COPY.unavailable, false), null);
  }

  if (photo !== undefined) {
    const blob = Object.hasOwn(s.photos, photo) ? s.photos[photo] : undefined;
    if (!blob) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    let bytes: Uint8Array;
    try {
      bytes = await photoBytes(deps, blob);
    } catch {
      return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    return new Response(request.method === 'HEAD' ? null : new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': `public, max-age=${PHOTO_MAX_AGE_S}`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
  if (id !== undefined) {
    const pizza = s.pizzas.find((p) => p.id === id);
    return pizza
      ? html(request, 200, pizzaPage(pizza, url.origin), PAGE_MAX_AGE_S)
      : html(request, 404, messagePage(COPY.notFound, true), null);
  }
  return html(request, 200, gridPage(s, url.origin), PAGE_MAX_AGE_S);
}
