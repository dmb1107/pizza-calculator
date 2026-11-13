/**
 * The portfolio — WEBSITE-SPEC §15 (APP-11).
 *
 * The rules (`src/lib/portfolio.ts`, the switch in `src/lib/toppings.ts`)
 * and the Worker's pages (`worker/portfolio.ts`), run in Node against a fake
 * GitHub that answers the one GraphQL query and the blobs API, and a cache
 * with a clock the tests move.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PORTFOLIO_FIELDS, portfolioPizzas, toppingsLine } from '../src/lib/portfolio';
import {
  EMPTY_DRAFT,
  PORTFOLIO_HIDE_BELOW,
  draftOf,
  hiddenFromPortfolio,
  inPortfolio,
  parseIdea,
  savedIdea,
  type ToppingIdea,
} from '../src/lib/toppings';
import { escapeHtml, markdownToHtml } from '../worker/markdownHtml';
import {
  BLOB_MAX_AGE_S,
  COPY,
  GRID_PREVIEW,
  PAGE_CSP,
  SNAPSHOT_KEY,
  SNAPSHOT_MAX_AGE_S,
  handlePortfolio,
  isPortfolioPath,
  type PortfolioCache,
  type PortfolioDeps,
} from '../worker/portfolio';

const SPEC = readFileSync('docs/WEBSITE-SPEC-biga-calculator.md', 'utf8');
const SECTION_15 = SPEC.slice(SPEC.indexOf('## 15. The portfolio'));
const ORIGIN = 'https://pizza.dave-becker.com';
const TOKEN = 'github_pat_TEST_ONLY_not_a_real_token_0123456789';

function idea(id: string, overrides: Partial<ToppingIdea> = {}): ToppingIdea {
  return {
    id,
    name: `Idea ${id}`,
    pre_bake: '* Tomato sauce\n* Mozzarella',
    post_bake: '* Basil',
    notes: 'PRIVATE-NOTES the dough recipe',
    comments: 'PRIVATE-COMMENTS too salty',
    rating: 4,
    photo: `${id}-0123456789ab`,
    dessert: false,
    portfolio: 'follow',
    photo_taken: null,
    created: '2026-11-01T18:00:00.000Z',
    updated: '2026-11-01T18:00:00.000Z',
    ...overrides,
  };
}

describe('§15 the switch (11d)', () => {
  it('follows the rating until Dave sets it: on below 3, off from 3 and for an untested idea', () => {
    expect(PORTFOLIO_HIDE_BELOW).toBe(3);
    expect(hiddenFromPortfolio({ rating: 2.5, portfolio: 'follow' })).toBe(true);
    expect(hiddenFromPortfolio({ rating: 3, portfolio: 'follow' })).toBe(false);
    expect(hiddenFromPortfolio({ rating: 5, portfolio: 'follow' })).toBe(false);
    expect(hiddenFromPortfolio({ rating: null, portfolio: 'follow' })).toBe(false);
  });

  it("holds Dave's setting whatever the rating does", () => {
    expect(hiddenFromPortfolio({ rating: 5, portfolio: 'hidden' })).toBe(true);
    expect(hiddenFromPortfolio({ rating: 1, portfolio: 'shown' })).toBe(false);
  });

  it('starts at follow, reads a missing or null one as follow, and refuses anything else', () => {
    expect(EMPTY_DRAFT.portfolio).toBe('follow');
    const raw = { ...idea('a') } as Record<string, unknown>;
    delete raw['portfolio'];
    expect(parseIdea(raw)?.portfolio).toBe('follow');
    expect(parseIdea({ ...raw, portfolio: null })?.portfolio).toBe('follow');
    expect(parseIdea({ ...raw, portfolio: 'hidden' })?.portfolio).toBe('hidden');
    expect(parseIdea({ ...raw, portfolio: 'shown' })?.portfolio).toBe('shown');
    expect(parseIdea({ ...raw, portfolio: true })).toBeNull();
    expect(parseIdea({ ...raw, portfolio: 'off' })).toBeNull();
  });

  it('is saved with the idea and comes back in its draft', () => {
    const saved = savedIdea({ ...draftOf(idea('a')), portfolio: 'hidden' }, idea('a'), 'a', new Date('2026-11-12T20:00:00Z'));
    expect(saved.portfolio).toBe('hidden');
    expect(draftOf(saved).portfolio).toBe('hidden');
  });

  it('is described in §13.2 and §15 with its rendered copy', () => {
    expect(SPEC).toContain('| `portfolio` |');
    expect(SECTION_15).toContain('**Hide from portfolio**');
    expect(SECTION_15).toContain(`**On for a rating below ${PORTFOLIO_HIDE_BELOW} until you set it.**`);
    const editor = readFileSync('src/components/Toppings.tsx', 'utf8');
    expect(editor).toContain('>Hide from portfolio</span>');
    expect(editor).toContain('{`On for a rating below ${PORTFOLIO_HIDE_BELOW} until you set it.`}');
  });
});

describe('§15 which pizzas, in what order (11a, 11b)', () => {
  it('lists rated ideas with a photo that are not hidden', () => {
    expect(inPortfolio(idea('a'))).toBe(true);
    expect(inPortfolio(idea('a', { rating: null }))).toBe(false);
    expect(inPortfolio(idea('a', { photo: null }))).toBe(false);
    expect(inPortfolio(idea('a', { rating: 2 }))).toBe(false);
    expect(inPortfolio(idea('a', { rating: 2, portfolio: 'shown' }))).toBe(true);
    expect(inPortfolio(idea('a', { portfolio: 'hidden' }))).toBe(false);
  });

  it('lists the pizzas, then the dessert pizzas, each best first, ties most recently updated first', () => {
    const ideas = [
      idea('old5', { rating: 5, updated: '2026-11-01T18:00:00.000Z' }),
      idea('four', { rating: 4 }),
      idea('new5', { rating: 5, dessert: true, updated: '2026-11-10T18:00:00.000Z' }),
      idea('half', { rating: 4.5 }),
      idea('sweet', { rating: 4, dessert: true }),
    ];
    expect(portfolioPizzas(ideas, () => true).map((p) => p.id)).toEqual(['old5', 'half', 'four', 'new5', 'sweet']);
  });

  it('leaves out an idea whose photo is not in the repository yet', () => {
    expect(portfolioPizzas([idea('a'), idea('b')], (photo) => photo.startsWith('a-')).map((p) => p.id)).toEqual(['a']);
  });

  it('keeps only the public fields (11c)', () => {
    const [pizza] = portfolioPizzas([idea('a')], () => true);
    expect(Object.keys(pizza!).sort()).toEqual([...PORTFOLIO_FIELDS].sort());
    expect(JSON.stringify(pizza)).not.toMatch(/PRIVATE|created|updated|portfolio/);
  });

  it('makes a preview line from the pre-bake bullets', () => {
    expect(toppingsLine('* Tomato sauce\n* **Fresh** mozzarella\n    * `Nduja\n\n* Basil')).toBe('Tomato sauce, Fresh mozzarella, `Nduja, Basil');
  });
});

describe('§15 the toppings as HTML', () => {
  it('renders bullets, nesting, bold and line breaks as the app does', () => {
    expect(markdownToHtml('* Tomato\n    * San Marzano\n* **Fior** di latte')).toBe(
      '<ul>\n<li>Tomato\n<ul>\n<li>San Marzano</li>\n</ul>\n</li>\n<li><strong>Fior</strong> di latte</li>\n</ul>',
    );
    expect(markdownToHtml('one\ntwo')).toBe('<p>one<br>\ntwo</p>');
  });

  it('keeps http, https and mailto links, opening in a new tab, and drops every other address', () => {
    expect(markdownToHtml('[r](https://example.com/a?b=1&c=2)')).toBe(
      '<p><a href="https://example.com/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">r</a></p>',
    );
    expect(markdownToHtml('[x](javascript:alert(1))')).toBe('<p>x</p>');
    expect(markdownToHtml('[x](/portfolio)')).toBe('<p>x</p>');
    expect(markdownToHtml('[x](data:text/html,hi)')).toBe('<p>x</p>');
  });

  it('never writes raw HTML, images or attributes from the Markdown', () => {
    const out = markdownToHtml('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n![a](https://example.com/a.jpg) <b onclick="x">b</b>');
    expect(out).not.toMatch(/<script|<img|onerror|onclick|<b[ >]/);
    expect(escapeHtml(`<a href="x">'&`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
  });
});

// ---------------------------------------------------------------------------
// The Worker's pages
// ---------------------------------------------------------------------------

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const blobOf = (photo: string) => photo.replace(/[^0-9a-f]/g, '').padEnd(40, '0').slice(0, 40);

function harness(ideas: ToppingIdea[], photos: string[] = ideas.flatMap((i) => (i.photo ? [i.photo] : []))) {
  let now = Date.UTC(2026, 10, 12, 18, 0, 0);
  const calls: Call[] = [];
  let down = false;
  const entries = new Map<string, { bytes: Uint8Array; expires: number }>();
  const cache: PortfolioCache = {
    async get(key) {
      const e = entries.get(key);
      return e && now < e.expires ? e.bytes : null;
    },
    async put(key, bytes, maxAgeS) {
      entries.set(key, { bytes, expires: now + maxAgeS * 1000 });
    },
  };
  const deps: PortfolioDeps = {
    githubToken: TOKEN,
    owner: 'dmb1107',
    repo: 'pizza-bake-log',
    cache,
    githubFetch: async (url, init) => {
      calls.push({
        url,
        method: init.method ?? 'GET',
        headers: init.headers as Record<string, string>,
        ...(typeof init.body === 'string' ? { body: init.body } : {}),
      });
      if (down) return new Response('{"message":"Server Error"}', { status: 502 });
      if (url === 'https://api.github.com/graphql') {
        const data = {
          repository: {
            ideas: {
              entries: [
                { name: 'images', type: 'tree', object: {} },
                { name: 'README.md', type: 'blob', object: { text: '# not an idea', isTruncated: false } },
                { name: 'broken.json', type: 'blob', object: { text: '{', isTruncated: false } },
                ...ideas.map((i) => ({ name: `${i.id}.json`, type: 'blob', object: { text: JSON.stringify(i), isTruncated: false } })),
              ],
            },
            images: { entries: photos.map((p) => ({ name: `${p}.jpg`, type: 'blob', oid: blobOf(p) })) },
          },
        };
        return Response.json({ data });
      }
      const blob = /\/repos\/dmb1107\/pizza-bake-log\/git\/blobs\/([0-9a-f]{40})$/.exec(url)?.[1];
      if (blob && photos.some((p) => blobOf(p) === blob)) return Response.json({ sha: blob, content: b64(JPEG), encoding: 'base64' });
      return Response.json({ message: 'Not Found' }, { status: 404 });
    },
  };
  const get = (path: string, method = 'GET') => handlePortfolio(new Request(`${ORIGIN}${path}`, { method }), deps);
  return {
    deps,
    calls,
    get,
    entries,
    advance: (ms: number) => void (now += ms),
    setDown: (v: boolean) => void (down = v),
  };
}

const PIZZAS = [
  idea('margherita', { name: 'Margherita Pizza', rating: 5 }),
  idea('chili-dog', { name: 'Chili Dog Pizza', rating: 4.5, post_bake: '' }),
  idea('tiramisu', { name: 'Tiramisu Pizza', rating: 3, dessert: true }),
  idea('low', { name: 'Potato pizza', rating: 2 }),
  idea('hidden', { name: 'Secret Pizza', rating: 5, portfolio: 'hidden' }),
  idea('untested', { name: 'Okonomiyaki Pizza', rating: null }),
  idea('nophoto', { name: 'French Toast pizza', rating: 3, photo: null }),
  idea('notsynced', { name: 'Unsynced Pizza', rating: 4 }),
];
const SYNCED = PIZZAS.flatMap((i) => (i.photo && i.id !== 'notsynced' ? [i.photo] : []));

describe('§15 the grid', () => {
  it('lists the qualifying pizzas best first, each linking to its page, with no rating shown', async () => {
    const h = harness(PIZZAS, SYNCED);
    const res = await h.get('/portfolio');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    const page = await res.text();
    const names = [...page.matchAll(/<a class="tile" href="\/portfolio\/([\w-]+)">/g)].map((m) => m[1]);
    expect(names).toEqual(['margherita', 'chili-dog', 'tiramisu']);
    expect(page).not.toMatch(/Secret|Potato|Okonomiyaki|French Toast|Unsynced|class="stars"|aria-label="Rated/);
    expect(page).toContain(`<img src="/portfolio/photos/margherita-0123456789ab.jpg"`);
  });

  it('carries the copy, and a link preview with the title-and-grid image', async () => {
    const page = await (await harness(PIZZAS, SYNCED).get('/portfolio')).text();
    expect(page).toContain(`<title>${escapeHtml(COPY.title)}</title>`);
    expect(page).toContain(escapeHtml(COPY.subtitle));
    expect(page).toContain(`<meta property="og:title" content="${escapeHtml(COPY.title)}">`);
    expect(page).toContain(`<meta property="og:image" content="${ORIGIN}${GRID_PREVIEW.path}">`);
    expect(page).toContain(`<meta property="og:image:width" content="1200">`);
    expect(page).toContain(`<meta property="og:image:height" content="630">`);
    expect(page).toContain(`<meta property="og:url" content="${ORIGIN}/portfolio">`);
    // The image ships with the page, at the size the tags give.
    const jpeg = readFileSync(`public${GRID_PREVIEW.path}`);
    expect(jpeg.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
    const sof = jpeg.findIndex((b, i) => b === 0xff && (jpeg[i + 1] === 0xc0 || jpeg[i + 1] === 0xc2));
    expect([jpeg.readUInt16BE(sof + 7), jpeg.readUInt16BE(sof + 5)]).toEqual([GRID_PREVIEW.width, GRID_PREVIEW.height]);
  });

  it('puts the dessert pizzas under their own heading, after the pizzas', async () => {
    const page = await (await harness(PIZZAS, SYNCED).get('/portfolio')).text();
    const heading = `<h2 class="kind">${COPY.desserts}</h2>`;
    expect(page.split(heading)).toHaveLength(2);
    const [before, after] = page.split(heading);
    expect(before).toContain('href="/portfolio/chili-dog"');
    expect(before).not.toContain('href="/portfolio/tiramisu"');
    expect(after).toContain('href="/portfolio/tiramisu"');
    expect(after).not.toContain('href="/portfolio/margherita"');
  });

  it('shows no dessert heading unless both kinds are listed', async () => {
    const onlyPizzas = await (await harness([idea('a'), idea('b')]).get('/portfolio')).text();
    const onlyDesserts = await (await harness([idea('a', { dessert: true })]).get('/portfolio')).text();
    for (const page of [onlyPizzas, onlyDesserts]) expect(page).not.toContain('class="kind"');
    expect(onlyDesserts).toContain('href="/portfolio/a"');
  });

  it('says so when nothing qualifies', async () => {
    const page = await (await harness([idea('low', { rating: 1 })]).get('/portfolio')).text();
    expect(page).toContain(COPY.empty);
    expect(page).not.toContain('og:image');
  });
});

describe('§15 a pizza', () => {
  it('shows the photo, the toppings and the rating as stars labelled "Dave\'s rating" (11c)', async () => {
    const res = await harness(PIZZAS, SYNCED).get('/portfolio/margherita');
    expect(res.status).toBe(200);
    const page = await res.text();
    expect(page).toContain('<img src="/portfolio/photos/margherita-0123456789ab.jpg" alt="Margherita Pizza">');
    expect(page).toContain('<h1>Margherita Pizza</h1>');
    expect(page).toContain('aria-label="Rated 5 of 5"');
    expect(page).toContain(escapeHtml(COPY.rating));
    expect(page).toContain(`<h2>${COPY.preBake}</h2><ul>`);
    expect(page).toContain(`<h2>${COPY.postBake}</h2><ul>`);
    expect(page).toContain(`<a class="back" href="/portfolio">`);
    expect(page).toContain(`<meta property="og:description" content="Tomato sauce, Mozzarella">`);
    expect(page).toContain(`<meta property="og:image" content="${ORIGIN}/portfolio/photos/margherita-0123456789ab.jpg">`);
  });

  it('leaves out an empty Post-bake', async () => {
    const page = await (await harness(PIZZAS, SYNCED).get('/portfolio/chili-dog')).text();
    expect(page).toContain(`<h2>${COPY.preBake}</h2>`);
    expect(page).not.toContain(`<h2>${COPY.postBake}</h2>`);
    expect(page).toContain('aria-label="Rated 4.5 of 5"');
  });

  it('is not found for every idea the grid leaves out, and for anything else', async () => {
    const h = harness(PIZZAS, SYNCED);
    for (const id of ['hidden', 'low', 'untested', 'nophoto', 'notsynced', 'nothing', 'photos']) {
      const res = await h.get(`/portfolio/${id}`);
      expect(res.status, id).toBe(404);
      expect(await res.text()).toContain(escapeHtml(COPY.notFound));
    }
    expect((await h.get('/portfolio/a/b')).status).toBe(404);
    expect((await h.get('/portfolio/..%2Fapi')).status).toBe(404);
  });
});

describe('§15 what leaves the Worker', () => {
  it('never carries notes, comments, dates or a hidden idea, on any page', async () => {
    const h = harness(PIZZAS, SYNCED);
    for (const path of ['/portfolio', '/portfolio/margherita', '/portfolio/chili-dog', '/portfolio/tiramisu', '/portfolio/hidden']) {
      const page = await (await h.get(path)).text();
      const leak = page.match(/PRIVATE|2026-11-01|Secret Pizza|portfolio":/);
      expect(leak?.[0], path).toBeUndefined();
    }
    // The cache holds only the listed fields too.
    const cached = new TextDecoder().decode(h.entries.get(SNAPSHOT_KEY)!.bytes);
    expect(cached).not.toMatch(/PRIVATE|2026-11-01|Secret|Potato/);
  });

  it('serves a listed pizza\'s photo, and no other, even one in the repository', async () => {
    const h = harness(PIZZAS, SYNCED);
    const ok = await h.get('/portfolio/photos/margherita-0123456789ab.jpg');
    expect(ok.status).toBe(200);
    expect(ok.headers.get('Content-Type')).toBe('image/jpeg');
    expect(new Uint8Array(await ok.arrayBuffer())).toEqual(JPEG);
    for (const name of ['hidden-0123456789ab', 'low-0123456789ab', 'untested-0123456789ab', 'nope']) {
      expect((await h.get(`/portfolio/photos/${name}.jpg`)).status, name).toBe(404);
    }
  });

  it('escapes every name and topping it writes', async () => {
    const evil = idea('evil', { name: '<script>alert(1)</script> & "quotes"', pre_bake: '* <img src=x onerror=alert(1)>\n* [x](javascript:alert(1))' });
    const h = harness([evil]);
    const grid = await (await h.get('/portfolio')).text();
    const page = await (await h.get('/portfolio/evil')).text();
    for (const p of [grid, page]) {
      expect(p).not.toMatch(/<script>alert|<img src=x|href="javascript:/);
      expect(p).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quotes&quot;');
    }
  });

  it('runs no script and loads nothing from elsewhere', async () => {
    const h = harness(PIZZAS, SYNCED);
    for (const path of ['/portfolio', '/portfolio/margherita', '/portfolio/nothing']) {
      const res = await h.get(path);
      expect(res.headers.get('Content-Security-Policy'), path).toBe(PAGE_CSP);
      const page = await res.text();
      expect(page, path).not.toContain('<script');
      for (const [, src] of page.matchAll(/(?:src|href)="([^"]*)"/g)) expect(src, path).toMatch(/^\//);
    }
    expect(PAGE_CSP).toContain("default-src 'none'");
    expect(PAGE_CSP).not.toContain('script-src');
  });

  it('asks GitHub with the token, for this repository, and never writes', async () => {
    const h = harness(PIZZAS, SYNCED);
    await h.get('/portfolio');
    await h.get('/portfolio/photos/margherita-0123456789ab.jpg');
    expect(h.calls.map((c) => c.method)).toEqual(['POST', 'GET']);
    expect(h.calls.every((c) => c.headers['Authorization'] === `Bearer ${TOKEN}`)).toBe(true);
    expect(JSON.parse(h.calls[0]!.body!).variables).toEqual({ owner: 'dmb1107', repo: 'pizza-bake-log' });
    expect(h.calls[0]!.body).not.toMatch(/mutation/);
  });
});

describe('§15 reading GitHub', () => {
  it('reuses its view for a minute, then reads again', async () => {
    const h = harness(PIZZAS, SYNCED);
    await h.get('/portfolio');
    await h.get('/portfolio/margherita');
    await h.get('/portfolio');
    expect(h.calls).toHaveLength(1);
    h.advance(SNAPSHOT_MAX_AGE_S * 1000);
    await h.get('/portfolio');
    expect(h.calls).toHaveLength(2);
  });

  it('past the minute, answers with the last good view and reads GitHub behind it', async () => {
    const ideas = [idea('margherita', { name: 'Margherita Pizza' })];
    const h = harness(ideas, ['margherita-0123456789ab', 'new-0123456789ab']);
    const work: Promise<unknown>[] = [];
    h.deps.waitUntil = (p) => void work.push(p);
    await h.get('/portfolio');
    expect(work).toHaveLength(0);

    ideas.push(idea('new', { name: 'New Pizza', photo: 'new-0123456789ab' }));
    h.advance(SNAPSHOT_MAX_AGE_S * 1000);
    const stale = await (await h.get('/portfolio')).text();
    expect(stale).not.toContain('New Pizza');
    expect(work).toHaveLength(1);
    await Promise.all(work);
    expect(h.calls).toHaveLength(2);
    expect(await (await h.get('/portfolio')).text()).toContain('New Pizza');

    // A read that fails behind the answer leaves the last good view in place.
    h.advance(SNAPSHOT_MAX_AGE_S * 1000);
    h.setDown(true);
    expect((await h.get('/portfolio')).status).toBe(200);
    await Promise.all(work);
    expect((await h.get('/portfolio')).status).toBe(200);
  });

  it('reads a photo once while the cache holds it', async () => {
    const h = harness(PIZZAS, SYNCED);
    await h.get('/portfolio/photos/margherita-0123456789ab.jpg');
    h.advance(SNAPSHOT_MAX_AGE_S * 1000);
    await h.get('/portfolio/photos/margherita-0123456789ab.jpg');
    expect(h.calls.filter((c) => c.url.includes('/git/blobs/'))).toHaveLength(1);
    expect(BLOB_MAX_AGE_S).toBeGreaterThan(SNAPSHOT_MAX_AGE_S);
  });

  it('shows the last good view while GitHub is down, and says so when there is none', async () => {
    const h = harness(PIZZAS, SYNCED);
    await h.get('/portfolio');
    h.advance(SNAPSHOT_MAX_AGE_S * 1000);
    h.setDown(true);
    expect((await h.get('/portfolio')).status).toBe(200);

    const cold = harness(PIZZAS, SYNCED);
    cold.setDown(true);
    const res = await cold.get('/portfolio');
    expect(res.status).toBe(503);
    expect(await res.text()).toContain(escapeHtml(COPY.unavailable));
  });

  it('says the same without a token, and asks GitHub nothing', async () => {
    const h = harness(PIZZAS, SYNCED);
    h.deps.githubToken = undefined;
    expect((await h.get('/portfolio')).status).toBe(503);
    expect(h.calls).toHaveLength(0);
  });
});

describe('§15 the routes', () => {
  it('answers /portfolio and below only', () => {
    expect(isPortfolioPath('/portfolio')).toBe(true);
    expect(isPortfolioPath('/portfolio/x')).toBe(true);
    expect(isPortfolioPath('/portfolios')).toBe(false);
    expect(isPortfolioPath('/api/github')).toBe(false);
  });

  it('takes GET and HEAD, and moves a trailing slash', async () => {
    const h = harness(PIZZAS, SYNCED);
    expect((await h.get('/portfolio', 'POST')).status).toBe(405);
    const head = await h.get('/portfolio', 'HEAD');
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    const slash = await h.get('/portfolio/');
    expect(slash.status).toBe(308);
    expect(slash.headers.get('Location')).toBe(`${ORIGIN}/portfolio`);
  });

  it('is routed to the Worker before the static page', () => {
    const wrangler = readFileSync('wrangler.jsonc', 'utf8');
    expect(wrangler).toContain('"run_worker_first": ["/api/*", "/portfolio", "/portfolio/*"]');
  });

  it('holds the page copy to §15', () => {
    for (const text of Object.values(COPY)) expect(SECTION_15, text).toContain(`**${text}**`);
  });
});
