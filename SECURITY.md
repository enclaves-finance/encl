# Security Policy

## Reporting a Vulnerability

The ENCL token is a fixed-supply ERC-20 deployed on production chains; bugs
here have a small surface area but can carry permanent on-chain consequences.
We take vulnerability reports seriously and will respond promptly.

### What to report

Please report any of the following privately, **not** as a public GitHub issue:

- A way to mint, freeze, or relock the supply post-deployment
- A way to bypass the `permit()` signature check or replay a permit
- Any deviation from ERC-20 / ERC-2612 invariants under any code path
- Compiler-level or supply-chain concerns in the build pipeline

### How to report

Two equivalent private channels — pick whichever you prefer:

1. **GitHub Private Vulnerability Reporting** (preferred when you have a
   GitHub account). On this repository, open `Security → Report a
   vulnerability` to file a private advisory that only the maintainers
   can see. See [GitHub's docs][gh-pvr] for the contributor side.
2. **Email** `security@enclaves.io`. Encrypt sensitive details with
   our PGP key (available on request).

Either way, include:

1. A description of the issue and its impact
2. Reproduction steps or a minimal proof of concept
3. Suggested remediation, if you have one
4. Your contact for follow-up (optional)

[gh-pvr]: https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability

### What to expect

- Acknowledgement within **48 hours**
- An initial triage assessment within **5 business days**
- For confirmed issues, a private patch + coordinated disclosure timeline
- Public credit (if you wish) in the release notes once a fix ships

### Scope

In scope:
- Everything under `contracts/` in this repository
- The deploy / verify scripts under `scripts/`
- Build-pipeline issues that affect what bytecode ends up on chain

Out of scope:
- Issues in third-party dependencies (please report upstream, then ping us)
- The Enclaves platform / backend services (separate disclosure channel)
- Best-practice nits without an exploit path — file these as regular issues

### Bounty

Bounty terms are handled case by case; high-impact reports affecting deployed
contracts are eligible for a reward proportional to severity. We follow the
[Immunefi severity classification](https://immunefi.com/severity-updated/) as a
reference.

## Audit history

This contract has not yet undergone a third-party audit. Until it does, treat
production usage at your own risk and consider commissioning an audit before
non-trivial value is locked behind it. Public auditability is additional, not
a replacement, for paid review.

## Operational security expectations

These are how *we* operate the repository, documented so contributors know what
to expect — and so that any deviation is visible.

- **Deploy keys live elsewhere.** Deployment scripts in this repo never embed
  mnemonics, private keys, or authenticated RPC URLs. The real deployer key
  is held by a multisig under separate, locked-down infrastructure. If you
  see a commit landing a `.env`, `mnemonic`, or `PRIVATE_KEY` value, treat
  it as a confirmed leak: rotate immediately and assume git history is
  forever (force-push history rewrites do not help once forks exist).
- **Every PR is read in full by two people**, regardless of how long the
  contributor has been around. Long-game contributors building reputation
  over months before slipping in a backdoor is a real threat against
  high-value token repos; the only reliable countermeasure is treating
  every diff as if it were from a stranger.
- **Branch protection on `main` requires** PR review by a code owner,
  passing required status checks (test / lint / typecheck / coverage /
  Slither), signed commits, linear history, up-to-date branches, and no
  admin bypass. The point of "include administrators" is to defend
  against a compromised maintainer account, not to make rules optional
  for the trusted few.
- **GitHub Actions are pinned to commit SHAs**, never to movable tags
  like `@v4`. Dependabot proposes bumps; humans read each diff before
  merging. This is direct mitigation for the tag-rewrite supply-chain
  attacks that have hit the wider ecosystem.
- **Maintainer accounts require hardware-key 2FA** (FIDO/U2F, e.g.
  YubiKey). SMS-based 2FA is not permitted for any account with write
  access. Personal Access Tokens are scoped minimally and expire within
  90 days.
