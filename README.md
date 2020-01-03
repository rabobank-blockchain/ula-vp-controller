# ula-vp-controller-plugin

[![Build Status](https://travis-ci.org/rabobank-blockchain/ula-vp-controller.svg?branch=master)](https://travis-ci.org/rabobank-blockchain/ula-vp-controller)
[![Test Coverage](https://api.codeclimate.com/v1/badges/c3583b99edad5c48168e/test_coverage)](https://codeclimate.com/github/rabobank-blockchain/ula-vp-controller/test_coverage)
[![Maintainability](https://api.codeclimate.com/v1/badges/c3583b99edad5c48168e/maintainability)](https://codeclimate.com/github/rabobank-blockchain/ula-vp-controller/maintainability)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

This Holder [ULA](https://github.com/rabobank-blockchain/universal-ledger-agent) plugin responds to an incoming [ChallengeRequest](https://github.com/rabobank-blockchain/vp-toolkit-models/blob/master/src/model/challenge-request.ts) from the issuer and/or verifier.
This implementation uses secp256k1 by default. If you want to use a different cryptographic algorithm, then provide your own [crypt-util](https://github.com/rabobank-blockchain/crypt-util) instance.

## Installation

**If you work with QR codes, please read the instructions in the [ula-process-eth-barcode](https://github.com/rabobank-blockchain/ula-process-eth-barcode) repository.
Also, in order to save credentials properly, we advise to install the [ula-vc-data-management](https://github.com/rabobank-blockchain/ula-vc-data-management) plugin.**

In an existing project (with `package.json`), install the ULA and this plugin by running the following commands:

```bash
npm install universal-ledger-agent --save
npm install crypt-util --save
npm install ula-vp-controller --save
```

Then setup this plugin and enable the ULA.

```typescript
import { EventHandler } from "universal-ledger-agent";
import { VpController } from "ula-vp-controller";
import { LocalCryptUtils } from "crypt-util";

// You need to provide a CryptUtil object in order to sign and verify objects
const yourPrivateMasterKey = 'xprv9s21ZrQH143K4Hahxy3chUqrrHbCynU5CcnRg9xijCvCG4f3AJb1PgiaXpjik6pDnT1qRmf3V3rzn26UNMWDjfEpUKL4ouy6t5ZVa4GAJVG'
const cryptUtil = new LocalCryptUtils()
cryptUtil.importMasterPrivateKey(yourPrivateMasterKey)

// Instantiate the plugin
const vpControllerPlugin = new VpController(cryptUtil)

// Setup the ULA and inject the plugin
const ulaEventHandler = new EventHandler([vpControllerPlugin /*, other ULA plugins here */])
```

### Usage
#### Trigger using an existing ULA plugin
Add the [ula-process-eth-barcode](https://github.com/rabobank-blockchain/ula-process-eth-barcode) plugin to automatically trigger this plugin!

#### Manually
If you want to invoke this plugin manually, send a ULA message with this format:

```typescript
const msg = {
  type: 'process-challengerequest',
  endpoint: '{endpoint from QR code}',
  msg: { /* IChallengeRequestParams fields */
    toVerify: [{predicate: "{schema.org URL}", allowedIssuers: ["did:eth:allowedIssuer"]}, {predicate: "{schema.org URL}"}],
    toAttest: [{predicate: "{schema.org URL}"}, {predicate: "{schema.org URL}"}],
    postEndpoint: '{endpoint URL}', // The holder will post a VerifiablePresentation object here
    proof: { /* Proof object */ },
    nonce: "{uuid}"
  }
}

ulaEventHandler.processMsg(msg, (response: UlaResponse) => {
  // Handle callback
  // If statuscode is 1, update the UI
})
```
The `msg` property contains fields defined in the [IChallengeRequestParams](https://github.com/rabobank-blockchain/vp-toolkit-models/blob/8345a16bab8c1ec46d41077d9e37100f7a9e1369/src/model/challenge-request.ts#L52) interface.
You can generate a signed `ChallengeRequest` object by using the [vp-toolkit](https://github.com/rabobank-blockchain/vp-toolkit) library, then flatten it using `challengeRequest.toJson()` and put all the flattened fields into `msg`.

Note: `toVerify` and `toAttest` fields are optional. You can use both at the same time or omit one of them. If you omit both fields, the plugin will complete without sending any visual feedback.

### Callbacks

When the plugin has finished, the callback function will be called **twice**.
The first time for updating the user interface and the second time for passing operation details (in this case, only a status code).

In case of a successful situation:
```typescript
// Dont show loading screen, show success screen
callback(new UlaResponse({ statusCode: 1, body: { loading: false, success: true, failure: false } }))
callback(new UlaResponse({ statusCode: 201, body: {} })) // Everything went OK
```

In case of an error:
```typescript
// Don't show loading screen, but show failure screen
callback(new UlaResponse({ statusCode: 1, body: { loading: false, success: false, failure: true } }))
callback(new UlaResponse({ statusCode: 204, body: {} })) // No information available
```

## Running tests

Besides unit testing with Mocha, the effectivity of all tests are also measured with the Stryker mutation testing framework.

```bash
npm run test
npm run stryker
```

We aim to achieve a coverage of 100%. Stryker and/or mocha test scores below 80% will fail the build.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License and disclaimer

[apache-2.0](https://choosealicense.com/licenses/apache-2.0/) with a [notice](NOTICE).

We discourage the use of this work in production environments as it is in active development and not mature enough.
