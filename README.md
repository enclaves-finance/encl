# @enclaves/encl

The **ENCL** utility / bonding token used across the Enclaves platform.

ENCL is a plain ERC-20 + EIP-2612 (`permit`) token with a fixed supply
minted in full to a treasury at deployment. It is intentionally *not*
ERC-3643: there is no compliance gate, no pause, no freeze, no blacklist,
and no mint capability beyond the constructor.

ENCL is the collateral every RWA issuer must lock up via the `StakingBond`
contract (which lives in the `@enclaves/rwa` package) before any of their
real-world-asset tokens are allowed to mint.

This repository is intentionally tiny — the token rarely changes and the
deployment address is treated as part of the platform's permanent ABI.

## Layout

```
encl/
├── contracts/
│   └── ENCL.sol             ERC-20 + ERC-2612 + fixed-supply constructor
├── scripts/
│   ├── deploy.ts            Deploys ENCL with treasury / supply from .env
│   ├── verify-deployment.ts Post-deploy invariant checks
│   └── export-address.ts    Writes deployments/<network>.json
├── test/
│   └── ENCL.test.ts         Unit + ERC-2612 permit signature tests
├── typechain-types/         Auto-generated, gitignored — see Toolchain notes
├── index.ts                 Programmatic artifact loader for consumers
├── hardhat.config.ts
├── tsconfig.json            Strict TS config used by `npm run typecheck`
├── tsconfig.build.json      Build-only config — emits `dist/` from `index.ts`
└── package.json
```

## Setup

```bash
nvm use                  # node 20
npm install
cp .env.example .env     # fill in ENCL_TREASURY etc.
npm run compile
```

## Test

```bash
npm test                 # runs the suite against the in-process Hardhat Network
```

The ERC-2612 permit test signs an EIP-712 typed payload off-chain with
alice's private key and submits the resulting `(v, r, s)` from a different
account, asserting that the allowance lands correctly and the nonce is
incremented. This is the canonical proof that `permit()` works end-to-end.

To attach to a long-running local chain instead, in one shell run
`npm run node` (Hardhat Network on `:8546`, the same port the RWA project
expects); in another run `npm run test:local`.

## Deployment

```bash
npm run deploy:sepolia        # = hardhat run scripts/deploy.ts + verify + export
# or individually:
npx hardhat run scripts/deploy.ts --network sepolia
npx hardhat run scripts/verify-deployment.ts --network sepolia
npx hardhat run scripts/export-address.ts --network sepolia
```

Required environment:

| Variable               | Default     | Description                              |
| ---------------------- | ----------- | ---------------------------------------- |
| `ENCL_TREASURY`        | deployer    | Address that receives the entire supply  |
| `ENCL_INITIAL_SUPPLY`  | 1000000000  | Whole ENCL to mint (× 1e18 internally)   |

Etherscan / Polygonscan source verification uses Hardhat's first-party
plugin:

```bash
npx hardhat verify --network sepolia <ENCL address> <treasury> <initialSupplyWei>
```

## Consuming the artifact from another project

[`@enclaves/rwa`](https://github.com/enclaves-finance/rwa) depends on this
package via `file:../encl` so its Hardhat test runner picks up the compiled
`ENCL.json` artifact; check both repos out side-by-side.

The package exposes a single CommonJS-friendly entry module
(`dist/index.js`). On a fresh clone the `prepare` lifecycle hook runs
`npm run compile && npm run build`, which produces both
`artifacts/contracts/ENCL.sol/ENCL.json` and `dist/index.{js,d.ts}`, so
downstream consumers do not need to know anything about Hardhat:

```ts
import enclaves from '@enclaves/encl';
const permitAbi = enclaves.ENCL.abi.find(
  (x) => (x as { name?: string }).name === 'permit',
);
console.log(enclaves.artifactPath('ENCL'));
// /…/enclaves/encl/artifacts/contracts/ENCL.sol/ENCL.json
```

## Notes on supply

ENCL has no `mint()` function — circulating supply is set in the
constructor and only ever decreases (through transfers to slash receivers
in `StakingBond.slash()`). Anyone wanting more headroom for future
distribution should set `ENCL_INITIAL_SUPPLY` accordingly before
deployment; the default 1B aligns with the spec.

## Toolchain notes

This is a **Hardhat 2 + ethers v6 + TypeChain** project, deliberately so:

- **Hardhat 2** is the long-term-stable runner for an audited release.
  Hardhat 3 is still a moving target; we may revisit once its plugin
  ecosystem (verify, gas reporter, coverage) catches up.
- **[ethers v6][ethers]** with `@nomicfoundation/hardhat-ethers` and
  `@nomicfoundation/hardhat-chai-matchers` provides the test surface
  (`describe` / `it`, `expect(tx).to.be.revertedWith(...)`,
  `.to.emit(...).withArgs(...)`, etc.). Native `bigint` everywhere — no
  BN wrapper.
- **Solidity 0.8.30** with the `london` EVM target so the compiled
  bytecode runs on every L1 + L2 we plan to deploy on without depending
  on Shanghai's `PUSH0` (introduced in 0.8.20 by default) or Cancun's
  transient storage.
- **[TypeChain][typechain]** (target `ethers-v6`) generates a typed
  contract class per `.sol` file at compile time
  (`npx hardhat compile` runs it via `@typechain/hardhat`). The
  generated bindings live in `typechain-types/` (gitignored) and are
  what makes `tsconfig.json`'s `strict: true` pass — every contract
  call is typed end-to-end with no escape hatches.

Run `npm run typecheck` to lint the entire TS surface (test files
included) under full strict mode without emitting JavaScript.
`npm run build` produces only the publishable `dist/` from `index.ts`.

[ethers]: https://docs.ethers.org/v6/
[typechain]: https://github.com/dethcrypto/TypeChain

## License

`@enclaves/encl` is released under [GPL-3.0](LICENSE), matching the
`SPDX-License-Identifier` of `contracts/ENCL.sol`.
