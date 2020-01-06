# ula-vp-controller-plugin

[![Build Status](https://travis-ci.org/rabobank-blockchain/ula-vp-controller.svg?branch=master)](https://travis-ci.org/rabobank-blockchain/ula-vp-controller)
[![Test Coverage](https://api.codeclimate.com/v1/badges/c3583b99edad5c48168e/test_coverage)](https://codeclimate.com/github/rabobank-blockchain/ula-vp-controller/test_coverage)
[![Maintainability](https://api.codeclimate.com/v1/badges/c3583b99edad5c48168e/maintainability)](https://codeclimate.com/github/rabobank-blockchain/ula-vp-controller/maintainability)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

This Holder [ULA](https://github.com/rabobank-blockchain/universal-ledger-agent) plugin responds to an incoming [ChallengeRequest](https://github.com/rabobank-blockchain/vp-toolkit-models/blob/master/src/model/challenge-request.ts) from the issuer and/or verifier and is responsible for the exchange of credentials.
This implementation uses secp256k1 by default. If you want to use a different cryptographic algorithm, then provide your own [crypt-util](https://github.com/rabobank-blockchain/crypt-util) instance.

## Installation

If you work with QR codes, please read the instructions in the [ula-process-eth-barcode](https://github.com/rabobank-blockchain/ula-process-eth-barcode) repository.
Also, in order to save credentials properly, we advise to install the [ula-vc-data-management](https://github.com/rabobank-blockchain/ula-vc-data-management) plugin as well.

In an existing project (with `package.json`), install the plugin by running the following commands:

```bash
npm install universal-ledger-agent --save
npm install crypt-util --save
npm install vp-toolkit --save
npm install ula-vp-controller-plugin --save
```

## Usage

This is an example of enabling this plugin in the ULA in a browser environment.

```typescript
import { BrowserHttpService, EventHandler } from "universal-ledger-agent";
import { VpController } from "ula-vp-controller";
import { LocalCryptUtils } from "crypt-util";
import {
  VerifiableCredentialGenerator,
  VerifiableCredentialSigner,
  VerifiablePresentationGenerator,
  VerifiablePresentationSigner
} from "vp-toolkit";

// Prepare plugin dependencies
const browserHttpService = new BrowserHttpService()
const cryptUtil = new LocalCryptUtils()
const vcSigner = new VerifiableCredentialSigner(cryptUtil)
const vcGenerator = new VerifiableCredentialGenerator(vcSigner)
const vpSigner = new VerifiablePresentationSigner(cryptUtil)
const vpGenerator = new VerifiablePresentationGenerator(vpSigner)
// Instantiate the plugin
const vpControllerPlugin = new VpController(cryptUtil, vcGenerator, vpGenerator, browserHttpService)

// Setup the ULA and inject the plugin
const ulaEventHandler = new EventHandler([vpControllerPlugin /*, other ULA plugins here */])
```

### Invoke this plugin

Add the [ula-process-eth-barcode](https://github.com/rabobank-blockchain/ula-process-eth-barcode) plugin to receive input from that plugin and you're set to go!

If you wish to invoke this plugin manually, [please continue reading here](docs/manual-invoke.md).

### Callback to your app

Whenever you send your first ULA message, you need to provide a `callback` argument.
This plugin will use the callback argument in three scenario's which you need to handle in your app:

- Asking for consent
- Receiving new credentials
- An Error occurred

Please use the example below (which uses the `ula-process-eth-barcode` plugin) in your app.
For more details on the callback structures, refer to the [callback data overview](docs/callback-data.md).
```typescript
import { UlaResponse } from "universal-ledger-agent"

const qrCodeContents = {
  type: 'ethereum-qr',
  url: '{endpoint}'
}
ulaEventHandler.processMsg(qrCodeContents, (callbackData: UlaResponse) => {
  switch(callbackData.statusCode){
    case 200: // Ask the user for consent
      if (yourUI.askUserConsent(callbackData.body.attestationsToConfirm, callbackData.body.missingAttestations)) {
        // Received consent, continue the flow
        ulaEventHandler.processMsg({
        type: 'accept-consent',
        challengeRequest: callbackData.body.challengeRequest,
        verifiablePresentation: callbackData.body.verifiablePresentation
        }, (callbackData: UlaResponse) => {
          // Listen to case 201 to get a confirmation of the exchange
          // Listen to case 500 to catch any errors whilst sharing the credential(s)
        })
      }
      // More info on the body structure, see docs/callback-data.md
      break;
    case 201: // Received new VerifiableCredentials
      yourUI.showSuccessMessage()
      break;
    case 500: // Error occurred
      throw callbackData.body.error
  }
});
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
