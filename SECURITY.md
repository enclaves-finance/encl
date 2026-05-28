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

Email **security@enclaves.io** with:

1. A description of the issue and its impact
2. Reproduction steps or a minimal proof of concept
3. Suggested remediation, if you have one
4. Your contact for follow-up (optional)

Encrypt sensitive details with our PGP key (available on request).

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
non-trivial value is locked behind it.
