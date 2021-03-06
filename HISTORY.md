# 0.2.5 / 24-07-2020

**Enhancements**
- Security patches updates from dependent packages

# 0.2.4 / 24-03-2020

**Enhancements**
- Add `sessionId` in the generated VP ([#25](https://github.com/rabobank-blockchain/ula-vp-controller/issues/25))
- Add predicate in self-attested VC ([#24](https://github.com/rabobank-blockchain/ula-vp-controller/issues/24))
- Updated dependencies
- Rollback Typescript to 3.4.5 to output proper `d.ts` files

# 0.2.3 / 10-03-2020

**Security fixes**
- Updated to `vp-toolkit@0.2.2` due to two Verifier vulnerabilities (not applicable here)

# 0.2.2 / 13-02-2020

**Bugfixes**
- When omitting the deprecated `msg.endpoint` field, the flow still exits prematurely ([#16](https://github.com/rabobank-blockchain/ula-vp-controller/issues/16))

# 0.2.1 / 08-01-2020

**Enhancements**
- Updated all dependencies
- Introduced [HISTORY.md](HISTORY.md)

# 0.2.0 / 27-12-2019

**BREAKING**
- Updated to `vp-toolkit-models@0.2.0`, introducing a new mandatory field in ChallengeRequest: `postEndpoint`. You need to add this field when you are sending a ULA message manually [(example here)](https://github.com/rabobank-blockchain/ula-vp-controller#manually)

**Enhancements**
- Fixed Handlebars vulnerability [CVE-2019-19919](https://github.com/advisories/GHSA-w457-6q6x-cgp9)

# 0.1.0 / 20-09-2019

*Initial release*
