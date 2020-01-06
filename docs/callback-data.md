# Callback data structure
Whenever you call the ULA using it's `processMsg()` function, you need to provide a callback function.
This plugin will use that callback function to inform your app in three cases.
**This structure is used since v0.3.0**. If you use a lower version of this plugin, please refer to the [legacy structure](legacy-callback-data.md).

## Asking for consent
```typescript
// Your callback function will be called with an
// UlaResponse object conform the following structure:
const ulaResponse =
{
  statuscode: 200,
  body: {
    attestationsToConfirm: [
      // Zero or more entries like:
      {
          predicate: 'predicate', // Depends on the issuer, but preferrably something like https://schema.org/PredicateName
          value: 'theValue',
          issuer: 'anyIssuerReference', // This is the VerifiableCredential.issuer value. You need to resolve this value (URI or DID) into a name.
      }
    ],
    missingAttestations: [
      // Zero or more entries like:
      {
        predicate: 'predicate',
        reason: 'missing-reason-code'
      }
    ],
    challengeRequest: new ChallengeRequest(...), // ChallengeRequest type, required in ULA message after consent
    verifiablePresentation: new VerifiablePresentation(...) // VerifiablePresentation type, required in ULA message after consent
  }
}
```
We advise you to translate the `predicate` to a human-readable text.
If `confirmAttestations` is empty, it means that there are no matching VerifiableCredentials found.
The `missingAttestations` array gives you more context about the request could not be fulfilled for a specific datapoint (predicate).

### Missing attestation codes
- **`missing`**: The `predicate` does not appear in any locally stored VerifiableCredentials
- **`no-matching-issuer`**: One or more matching VerifiableCredentials were found, but none of them were issued by the party/parties trusted by the verifier.

## Receiving new credentials
```typescript
// Your callback function will be called with an
// UlaResponse object conform the following structure:
const ulaResponse =
{
  statuscode: 201,
  body: {} // Empty body
}
```

This response is only used to inform you that VerifiableCredentials were saved successfully.
In order to show the new attestations in your app, please check the usage of the [ula-vc-data-management plugin](https://github.com/rabobank-blockchain/ula-vc-data-management).

## An error occurred
```typescript
// Your callback function will be called with an
// UlaResponse object conform the following structure:
const ulaResponse =
{
  statuscode: 500, // The statuscode always is 500 in case of an error
  body: {
    error: new Error('Some message')
  }
}
```
