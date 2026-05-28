/**
 * Deploys the ENCL utility / bonding token. Idempotent across networks —
 * the artifact ends up in `artifacts/contracts/ENCL.sol/ENCL.json` so the
 * RWA project (and any other consumer) can read it from the
 * `@enclaves/encl` package without redeploying.
 *
 * Run with:
 *   npx hardhat run scripts/deploy.ts --network <network>
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { ethers, network } from 'hardhat';

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();

  const treasury = process.env.ENCL_TREASURY || deployer.address;
  const wholeSupply = process.env.ENCL_INITIAL_SUPPLY || '1000000000'; // 1B ENCL
  const initialSupply = ethers.parseEther(wholeSupply);

  const Factory = await ethers.getContractFactory('ENCL', deployer);
  const encl = await Factory.deploy(treasury, initialSupply);
  await encl.waitForDeployment();
  const address = await encl.getAddress();

  console.log(`  ENCL deployed at ${address}`);
  console.log(`    network         : ${network.name}`);
  console.log(`    treasury        : ${treasury}`);
  console.log(
    `    initialSupply   : ${wholeSupply} ENCL (${initialSupply.toString()} wei)`
  );

  // Cache the deployment so verify-deployment.ts / export-address.ts can
  // resolve the address without us re-deploying.
  const cacheDir = path.join(__dirname, '..', '.deployments-cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(
    path.join(cacheDir, `${network.name}.json`),
    JSON.stringify({ ENCL: address }, null, 2)
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
