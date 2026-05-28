/**
 * Lightweight programmatic entry for consumers of @enclaves/encl.
 *
 * Re-exports the compiled Hardhat artifacts so applications and other
 * projects (e.g. the `rwa` project) can fetch the canonical ABI without
 * having to know where Hardhat dropped the build files. Throws a clear
 * error if the artifacts aren't compiled yet.
 *
 * Compiled output lives in `dist/`; we walk one level up from `__dirname`
 * to locate `artifacts/` at the package root.
 */

import * as path from 'path';
import * as fs from 'fs';

interface ContractArtifact {
  contractName: string;
  abi: ReadonlyArray<unknown>;
  bytecode: string;
  deployedBytecode: string;
  [key: string]: unknown;
}

type ArtifactName = 'ENCL';

const PKG_ROOT = path.join(__dirname, '..');

const ARTIFACT_ROOTS: Record<ArtifactName, string> = {
  ENCL: path.join(PKG_ROOT, 'artifacts', 'contracts', 'ENCL.sol', 'ENCL.json'),
};

function loadArtifact(name: ArtifactName): ContractArtifact {
  const file = ARTIFACT_ROOTS[name];
  if (!file) {
    throw new Error(`[@enclaves/encl] Unknown artifact "${name}"`);
  }
  if (!fs.existsSync(file)) {
    throw new Error(
      `[@enclaves/encl] Artifact "${name}" not found at ${file}. Did you run "npm run compile"?`
    );
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')) as ContractArtifact;
}

const enclaves = {
  get ENCL(): ContractArtifact {
    return loadArtifact('ENCL');
  },
  artifactPath(name: ArtifactName): string {
    return ARTIFACT_ROOTS[name];
  },
  contractsPath: path.join(PKG_ROOT, 'contracts'),
};

export = enclaves;
