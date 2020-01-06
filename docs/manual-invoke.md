# Invoke this plugin manually
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

ulaEventHandler.processMsg(msg, (callbackData: UlaResponse) => {
  // Handle callback as described in README.md
})
```

The `msg` property contains a [ChallengeRequest](https://github.com/rabobank-blockchain/vp-toolkit-models/blob/master/src/model/challenge-request.ts) object. Generate a ChallengeRequest object by using the [vp-toolkit](https://github.com/rabobank-blockchain/vp-toolkit) library.

Note: `toVerify` and `toAttest` fields are optional. You can use both at the same time or omit one of them. If you omit both fields, the plugin will complete without sending any visual feedback.
