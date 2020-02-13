#0.2.2 / 13-02-2020

**Bigfixes**
- When omitting the deprecated `msg.endpoint` field, the flow still exits prematurely ([#16](https://github.com/rabobank-blockchain/ula-vp-controller/issues/16))

#0.2.1 / 08-01-2020

**Enhancements**
- Updated all dependencies
- Introduced [HISTORY.md](HISTORY.md)

#0.2.0 / 27-12-2019

**BREAKING**
- Updated to `vp-toolkit-models@0.2.0`, introducing a new mandatory field in ChallengeRequest: `postEndpoint`. You need to add this field when you are sending a ULA message manually [(example here)](https://github.com/rabobank-blockchain/ula-vp-controller#manually)

**Enhancements**
- Fixed Handlebars vulnerability [CVE-2019-19919](https://github.com/advisories/GHSA-w457-6q6x-cgp9)

#0.1.0 / 20-09-2019

*Initial release*
