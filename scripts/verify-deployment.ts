/**
 * encl/scripts/verify-deployment.ts
 *
 * Post-deploy sanity check for the standalone ENCL project. Run after
 * `npm run deploy:*` on any network to confirm the token deployed
 * correctly and minted the expected supply to the configured treasury.
 *
 *   npx hardhat run scripts/verify-deployment.ts --network sepolia
 *
 * Exits non-zero on any failure; suitable for CI / deployment runbooks.
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { ethers, network } from 'hardhat';

interface Check {
  label: string;
  status: 'ok' | 'FAIL';
  value: string;
}

const checks: Check[] = [];
function ok(label: string, value: string): void {
  checks.push({ label, status: 'ok', value });
}
function fail(label: string, value: string): void {
  checks.push({ label, status: 'FAIL', value });
}
function eq(label: string, actual: string, expected: string): void {
  if (actual === expected) ok(label, actual);
  else fail(label, `expected=${expected} actual=${actual}`);
}

// The script needs to find the ENCL address. We first try the cache file
// written by scripts/deploy.ts; failing that we accept ENCL_ADDRESS from
// the environment.
function resolveEnclAddress(net: string): string {
  if (process.env.ENCL_ADDRESS) return process.env.ENCL_ADDRESS;
  const cacheFile = path.join(__dirname, '..', '.deployments-cache', `${net}.json`);
  if (fs.existsSync(cacheFile)) {
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8')) as { ENCL?: string };
    if (cached.ENCL) return cached.ENCL;
  }
  const deploymentsFile = path.join(__dirname, '..', 'deployments', `${net}.json`);
  if (fs.existsSync(deploymentsFile)) {
    const json = JSON.parse(fs.readFileSync(deploymentsFile, 'utf8')) as { ENCL?: string };
    if (json.ENCL) return json.ENCL;
  }
  throw new Error(
    `Could not locate the ENCL address for "${net}". Set ENCL_ADDRESS or run "npm run deploy:${net}" first.`
  );
}

async function main(): Promise<void> {
  const address = resolveEnclAddress(network.name);
  const encl = await ethers.getContractAt('ENCL', address);

  console.log(`\n=== Verifying ENCL deployment on "${network.name}" ===\n`);

  eq('ENCL.name', await encl.name(), 'Enclaves');
  eq('ENCL.symbol', await encl.symbol(), 'ENCL');
  eq('ENCL.decimals', (await encl.decimals()).toString(), '18');

  const total = (await encl.totalSupply()).toString();
  const expectedSupply = ethers
    .parseEther(process.env.ENCL_INITIAL_SUPPLY || '1000000000')
    .toString();
  eq('ENCL.totalSupply', total, expectedSupply);

  const treasury = process.env.ENCL_TREASURY;
  if (treasury) {
    eq(
      'treasury balance == totalSupply',
      (await encl.balanceOf(treasury)).toString(),
      total
    );
  } else {
    console.log('  (skipped treasury check — ENCL_TREASURY not set)');
  }

  // ERC-2612 / EIP-712 surface present?
  const domain: string = await encl.DOMAIN_SEPARATOR();
  if (/^0x[0-9a-f]{64}$/i.test(domain)) {
    ok('DOMAIN_SEPARATOR', domain);
  } else {
    fail('DOMAIN_SEPARATOR', domain);
  }

  const okCount = checks.filter((c) => c.status === 'ok').length;
  const failCount = checks.filter((c) => c.status === 'FAIL').length;

  console.log(`\nENCL deployed at: ${address}\n`);
  for (const c of checks) {
    const marker = c.status === 'ok' ? '  \u2713 ' : '  \u2717 ';
    console.log(`${marker}${c.label}: ${c.value}`);
  }
  console.log(`\n${okCount} ok, ${failCount} failed`);

  if (failCount > 0) throw new Error(`${failCount} verification check(s) failed`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
