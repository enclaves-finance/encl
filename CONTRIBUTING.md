# Contributing

Thanks for taking the time to contribute to `@enclaves/encl`. The ENCL token
itself rarely changes — it's a fixed-supply ERC-20 — so most contributions land
in the tests, scripts, or docs. Either way, the same rules apply.

## Ground rules

- Open an issue before sending a non-trivial PR so we can sanity-check the
  direction.
- Don't change `contracts/ENCL.sol` semantics without an extremely strong
  reason and a corresponding test.
- Don't open public GitHub issues for security problems — see
  [`SECURITY.md`](SECURITY.md).

## Development setup

```bash
nvm use                  # node 20
npm install              # runs `prepare` → compiles contracts + builds dist/
cp .env.example .env
npm test
```

You'll need Node 20 or 22 (`.nvmrc` pins 20; CI runs both). The full suite
runs against the in-process Hardhat Network — no separate chain or sibling
services required. `npm install` runs the `prepare` lifecycle hook, which
both compiles `contracts/` (auto-generating TypeChain bindings into
`typechain-types/` via `@typechain/hardhat`) and builds the publishable
`dist/` artifact from `index.ts`. Re-run `npm run compile` whenever you
change a contract — the generated `.d.ts` files are what give the test
files their typed `ethers.getContractFactory('ENCL')` calls.

## Style

- Solidity: format with `npm run format`, lint with `npm run lint`.
- TypeScript: tests use Mocha + `describe(...)` / `it(...)` with
  `ethers.getContractFactory()` / `ethers.getContractAt()` for
  contract handles, and `expect(...)` matchers from
  `@nomicfoundation/hardhat-chai-matchers` for revert / event /
  balance-change assertions. Contract instance variables get the
  matching TypeChain class as their type
  (`let encl: ENCL;` imported from `../typechain-types`). The whole TS
  surface compiles under `strict: true`; run `npm run typecheck`
  before sending a PR.
- Keep test names readable in CI output — they're our living spec.

## Commit hygiene

- One logical change per commit. Rebase before opening the PR.
- Commit messages: short imperative summary on line 1, optional body explaining
  why (not what — the diff already shows that).

## Tests

Every behavioural change needs a test. Coverage isn't measured in basis points
here — what matters is that the test reads like spec prose, not implementation
narration. Look at `test/ENCL.test.ts` for the house style.

## Releasing

Releases are cut by maintainers. If you're a maintainer, the flow is:

1. Bump `version` in `package.json`.
2. Tag `vX.Y.Z` after the merge.
3. Re-run `npm run deploy:<network>` if the change altered bytecode and you're
   rotating the deployed address.
