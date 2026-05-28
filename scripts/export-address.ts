/**
 * encl/scripts/export-address.ts
 *
 * After `npm run deploy:<network>`, writes the deployed ENCL address to
 * `deployments/<network>.json`. The companion @enclaves/rwa project reads
 * this file to bind its StakingBond to the canonical token.
 *
 *   npx hardhat run scripts/export-address.ts --network sepolia
 *
 * Output (deployments/sepolia.json):
 *   {
 *     "network": "sepolia",
 *     "chainId": 11155111,
 *     "deployedAt": "2026-…",
 *     "ENCL": "0x…"
 *   }
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { ethers, network } from 'hardhat';

function resolveEnclAddress(net: string): string {
  if (process.env.ENCL_ADDRESS) return process.env.ENCL_ADDRESS;
  const cacheFile = path.join(__dirname, '..', '.deployments-cache', `${net}.json`);
  if (fs.existsSync(cacheFile)) {
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8')) as { ENCL?: string };
    if (cached.ENCL) return cached.ENCL;
  }
  throw new Error(
    `No cached ENCL address found for "${net}". Run "npm run deploy:${net}" before exporting.`
  );
}

async function main(): Promise<void> {
  const address = resolveEnclAddress(network.name);
  const encl = await ethers.getContractAt('ENCL', address);
  // Confirm the address actually hosts a contract that responds to ENCL's
  // ABI before we record it in the per-network deployment file.
  await encl.name();
  const { chainId } = await ethers.provider.getNetwork();

  const out = {
    network: network.name,
    chainId: Number(chainId),
    deployedAt: new Date().toISOString(),
    ENCL: address,
  };

  const dir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${network.name}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${file}`);
  console.log(`  ENCL: ${address}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
