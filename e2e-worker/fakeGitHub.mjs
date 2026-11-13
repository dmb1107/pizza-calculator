// A fake GitHub contents API for the Worker's end-to-end run (§14.2), and
// the one GraphQL query the portfolio sends (§15.3).
// Answers only for the one repository and only with the test token, and
// logs every request it receives, so the test can show what reached it.
// GET /__log returns the log and the files; POST /__reset clears both.
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';

const PORT = Number(process.env.FAKE_GITHUB_PORT ?? 8790);
const TOKEN = 'local-test-token';
const BASE = '/repos/dmb1107/pizza-bake-log';
let files = new Map();
let log = [];
const sha = (s) => createHash('sha1').update(s).digest('hex');

createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks).toString('utf8');
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const json = (status, value) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(value ?? {}));
  };
  if (url.pathname === '/__log') return json(200, { log, files: [...files.keys()] });
  if (url.pathname === '/__reset') {
    files = new Map();
    log = [];
    return json(200, {});
  }
  log.push({ method: req.method, path: url.pathname + url.search, auth: req.headers.authorization ?? null, cookie: req.headers.cookie ?? null });
  if (req.headers.authorization !== `Bearer ${TOKEN}`) return json(401, { message: 'Bad credentials' });
  // The portfolio's one query (§15.3): the files under toppings/ with their
  // text, and the photo folder's names and blobs. The query itself isn't
  // parsed; the answer has its shape.
  if (url.pathname === '/graphql' && req.method === 'POST') {
    const tree = (dir, withText) => {
      const entries = [];
      for (const [p, f] of files) {
        if (!p.startsWith(`${dir}/`) || p.slice(dir.length + 1).includes('/')) continue;
        const name = p.slice(dir.length + 1);
        const text = Buffer.from(f.content, 'base64').toString('utf8');
        entries.push({ name, type: 'blob', oid: f.sha, ...(withText ? { object: { text, isTruncated: false } } : {}) });
      }
      return entries.length ? { entries } : null;
    };
    return json(200, { data: { repository: { ideas: tree('toppings', true), images: tree('toppings/images', false) } } });
  }
  if (!url.pathname.startsWith(BASE)) return json(404, { message: 'Not Found' });
  const path = url.pathname.slice(BASE.length);
  if (path === '') return json(200, { full_name: 'dmb1107/pizza-bake-log', private: true });
  const blob = /^\/git\/blobs\/([0-9a-f]+)$/.exec(path)?.[1];
  if (blob) {
    const f = [...files.values()].find((x) => x.sha === blob);
    return f ? json(200, { sha: f.sha, content: f.content, encoding: 'base64' }) : json(404);
  }
  const file = path.replace(/^\/contents\//, '');
  if (req.method === 'GET' && !files.has(file)) {
    const entries = new Map();
    for (const [p, f] of files) {
      if (!p.startsWith(`${file}/`)) continue;
      const rest = p.slice(file.length + 1);
      const slash = rest.indexOf('/');
      if (slash === -1) entries.set(rest, { type: 'file', name: rest, sha: f.sha, download_url: `https://raw.example/${p}?token=TEMP` });
      else entries.set(rest.slice(0, slash), { type: 'dir', name: rest.slice(0, slash), sha: 'tree' });
    }
    return entries.size ? json(200, [...entries.values()]) : json(404, { message: 'Not Found' });
  }
  if (req.method === 'GET') {
    const f = files.get(file);
    return json(200, { ...f, download_url: `https://raw.example/${file}?token=TEMP` });
  }
  const parsed = body ? JSON.parse(body) : {};
  if (req.method === 'PUT') {
    const current = files.get(file);
    if (current && !parsed.sha) return json(422, { message: 'sha required' });
    if (current && parsed.sha !== current.sha) return json(409, { message: 'conflict' });
    const s = sha(parsed.content + file);
    files.set(file, { content: parsed.content, sha: s });
    return json(201, { content: { sha: s, download_url: `https://raw.example/${file}?token=TEMP` } });
  }
  if (req.method === 'DELETE') {
    files.delete(file);
    return json(200, {});
  }
  return json(405, {});
}).listen(PORT, '127.0.0.1');
