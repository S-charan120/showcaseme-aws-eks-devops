const crypto = require('node:crypto');
const fs = require('node:fs');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { validateRegistration, validatePortfolio } = require('./domain');
const { migrate } = require('./migrate');

const app = express();
app.set('trust proxy', 1); // API is reachable only through the trusted Nginx reverse proxy.
const port = Number(process.env.PORT || 8081);
const jwtSecret = process.env.JWT_SECRET || '';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 15, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, ssl: process.env.PGSSLMODE === 'verify-full' ? { rejectUnauthorized: true, ca: fs.readFileSync(process.env.PGSSLROOTCERT || '/etc/ssl/certs/rds-global-bundle.pem', 'utf8') } : undefined });
const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
const bucketName = process.env.S3_BUCKET || '';
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '64kb', strict: true }));
app.use((req, res, next) => {
  const origin = req.get('origin');
  const allowed = (process.env.WEB_ORIGIN || '').split(',').map(x => x.trim()).filter(Boolean);
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });

function issueToken(user) { return jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: '15m', issuer: 'showcaseme-api', audience: 'showcaseme-web' }); }
function authenticate(req, res, next) {
  const match = /^Bearer\s+(.+)$/i.exec(req.get('authorization') || '');
  if (!match) return res.status(401).json({ error: 'authentication required' });
  try {
    const claims = jwt.verify(match[1], jwtSecret, { issuer: 'showcaseme-api', audience: 'showcaseme-web' });
    req.user = { id: claims.sub, email: claims.email };
    return next();
  } catch { return res.status(401).json({ error: 'session expired or invalid; sign in again' }); }
}
function safePortfolio(row) {
  return { id: row.id, slug: row.slug, displayName: row.display_name, headline: row.headline, bio: row.bio, profession: row.profession, experience: row.experience, skills: row.skills, projects: row.projects, templateKey: row.template_key, published: row.published, createdAt: row.created_at, updatedAt: row.updated_at, publishedAt: row.published_at };
}
function portfolioInput(p) {
  return [p.slug, p.displayName.trim(), p.headline || '', p.bio || '', p.profession || '', JSON.stringify(p.experience || []), JSON.stringify(p.skills || []), JSON.stringify(p.projects || []), p.templateKey || 'minimal'];
}
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'showcaseme-api' }));
app.get('/ready', async (_req, res) => {
  try { await pool.query('SELECT 1'); return res.json({ status: 'ready', database: 'ok' }); }
  catch { return res.status(503).json({ status: 'not-ready', database: 'unavailable' }); }
});
app.post('/api/auth/register', authLimiter, async (req, res, next) => {
  try {
    const errors = validateRegistration(req.body);
    if (errors.length) return res.status(400).json({ error: 'validation failed', details: errors });
    const email = req.body.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const result = await pool.query('INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id,email,created_at', [email, passwordHash]);
    const user = result.rows[0];
    return res.status(201).json({ accessToken: issueToken(user), tokenType: 'Bearer', expiresIn: 900, user: { id: user.id, email: user.email } });
  } catch (err) { if (err.code === '23505') return res.status(409).json({ error: 'an account with this email already exists' }); return next(err); }
});
app.post('/api/auth/login', authLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password || password.length > 72) return res.status(400).json({ error: 'email and password are required' });
    const result = await pool.query('SELECT id,email,password_hash FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'invalid email or password' });
    return res.json({ accessToken: issueToken(user), tokenType: 'Bearer', expiresIn: 900, user: { id: user.id, email: user.email } });
  } catch (err) { return next(err); }
});
app.get('/api/me', authenticate, async (req, res, next) => {
  try { const result = await pool.query('SELECT id,email,created_at FROM users WHERE id=$1', [req.user.id]); return result.rowCount ? res.json({ id: result.rows[0].id, email: result.rows[0].email, createdAt: result.rows[0].created_at }) : res.status(401).json({ error: 'account no longer exists' }); }
  catch (err) { return next(err); }
});
app.get('/api/portfolios', authenticate, async (req, res, next) => {
  try { const result = await pool.query('SELECT * FROM portfolios WHERE user_id=$1 ORDER BY updated_at DESC', [req.user.id]); return res.json({ items: result.rows.map(safePortfolio) }); }
  catch (err) { return next(err); }
});
app.post('/api/portfolios', authenticate, async (req, res, next) => {
  try {
    const errors = validatePortfolio(req.body);
    if (errors.length) return res.status(400).json({ error: 'validation failed', details: errors });
    const result = await pool.query('INSERT INTO portfolios(user_id,slug,display_name,headline,bio,profession,experience,skills,projects,template_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *', [req.user.id, ...portfolioInput(req.body)]);
    return res.status(201).json(safePortfolio(result.rows[0]));
  } catch (err) { if (err.code === '23505') return res.status(409).json({ error: 'this public slug is already in use' }); return next(err); }
});
app.put('/api/portfolios/:slug', authenticate, async (req, res, next) => {
  try {
    const input = { ...req.body, slug: req.params.slug };
    const errors = validatePortfolio(input);
    if (errors.length) return res.status(400).json({ error: 'validation failed', details: errors });
    const p = portfolioInput(input);
    const result = await pool.query('UPDATE portfolios SET display_name=$3,headline=$4,bio=$5,profession=$6,experience=$7,skills=$8,projects=$9,template_key=$10,updated_at=NOW() WHERE slug=$1 AND user_id=$2 RETURNING *', [req.params.slug, req.user.id, ...p.slice(1)]);
    return result.rowCount ? res.json(safePortfolio(result.rows[0])) : res.status(404).json({ error: 'portfolio not found' });
  } catch (err) { return next(err); }
});
app.post('/api/portfolios/:slug/publish', authenticate, async (req, res, next) => {
  try { const result = await pool.query('UPDATE portfolios SET published=TRUE,published_at=NOW(),updated_at=NOW() WHERE slug=$1 AND user_id=$2 RETURNING *', [req.params.slug, req.user.id]); return result.rowCount ? res.json(safePortfolio(result.rows[0])) : res.status(404).json({ error: 'portfolio not found' }); }
  catch (err) { return next(err); }
});
app.post('/api/portfolios/:slug/unpublish', authenticate, async (req, res, next) => {
  try { const result = await pool.query('UPDATE portfolios SET published=FALSE,updated_at=NOW() WHERE slug=$1 AND user_id=$2 RETURNING *', [req.params.slug, req.user.id]); return result.rowCount ? res.json(safePortfolio(result.rows[0])) : res.status(404).json({ error: 'portfolio not found' }); }
  catch (err) { return next(err); }
});
app.delete('/api/portfolios/:slug', authenticate, async (req, res, next) => {
  try { const result = await pool.query('DELETE FROM portfolios WHERE slug=$1 AND user_id=$2', [req.params.slug, req.user.id]); return result.rowCount ? res.sendStatus(204) : res.status(404).json({ error: 'portfolio not found' }); }
  catch (err) { return next(err); }
});
app.get('/api/public/:slug', async (req, res, next) => {
  try { const result = await pool.query('SELECT * FROM portfolios WHERE slug=$1 AND published=TRUE', [req.params.slug]); return result.rowCount ? res.json(safePortfolio(result.rows[0])) : res.status(404).json({ error: 'published portfolio not found' }); }
  catch (err) { return next(err); }
});
app.post('/api/assets/upload-url', authenticate, async (req, res, next) => {
  try {
    if (!bucketName) return res.status(503).json({ error: 'asset storage is not configured' });
    const { fileName, contentType } = req.body || {};
    if (typeof fileName !== 'string' || !/^[a-zA-Z0-9._-]{1,100}$/.test(fileName) || !['image/jpeg','image/png','image/webp'].includes(contentType)) return res.status(400).json({ error: 'supported image fileName and contentType are required' });
    const objectKey = `portfolio-assets/${req.user.id}/${crypto.randomUUID()}-${fileName}`;
    const command = new PutObjectCommand({ Bucket: bucketName, Key: objectKey, ContentType: contentType });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
    return res.status(201).json({ uploadUrl, objectKey, expiresInSeconds: 600 });
  } catch (err) { return next(err); }
});
app.use((err, _req, res, _next) => {
  console.error(JSON.stringify({ level: 'error', message: err.message, code: err.code || 'unknown' }));
  if (err instanceof SyntaxError && err.status === 400) return res.status(400).json({ error: 'invalid JSON' });
  if (err.code === '23505') return res.status(409).json({ error: 'resource conflict' });
  return res.status(500).json({ error: 'internal server error' });
});

async function start() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (Buffer.byteLength(jwtSecret) < 32) throw new Error('JWT_SECRET must be at least 32 bytes');
  await migrate(pool);
  await pool.query('SELECT 1');
  const server = app.listen(port, '0.0.0.0', () => console.log(JSON.stringify({ level: 'info', event: 'api_started', port })));
  const shutdown = async signal => { console.log(JSON.stringify({ level: 'info', event: 'shutdown', signal })); server.close(async () => { await pool.end(); process.exit(0); }); setTimeout(() => process.exit(1), 10_000).unref(); };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}
if (require.main === module) start().catch(err => { console.error(err); process.exit(1); });
module.exports = { app, start, pool };
