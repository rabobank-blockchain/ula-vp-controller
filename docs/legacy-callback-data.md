# Callback data structure (v0.1 & v0.2)
Whenever you call the ULA using it's `processMsg()` function, you need to provide a callback function.
This plugin will use that callback function to inform your app in three cases:

## Asking for consent
```typescript
// UlaResponse object with the following structure:
const ulaResponse =
{
  statuscode: 200,
  body: {
    confirmAttestations: [
      // Zero or more entries like:
      {
          key: 'predicateName', // Without https://schema.org/x/.../
          value: 'theValue',
          attestor: 'issuerName' // Originating from the verifiableCredential.issuerName field
      }
    ],
    missingAttestations: [
      // Zero or more entries like:
      {
        predicate: 'predicateName', // Without https://schema.org/x/.../
        reason: 'missing-reason-code'
      }
    ]
  }
}
```
If `confirmAttestations` is empty, it means that there are no matching VerifiableCredentials found.
The `missingAttestations` array gives you more context about the request could not be fulfilled for a specific datapoint (predicate).

### Missing attestation codes
- **`missing`**: The `predicate` does not appear in any locally stored VerifiableCredentials
- **`no-matching-issuer`**: One or more matching VerifiableCredentials were found, but none of them were issued by the party/parties trusted by the verifier.

## Receiving new credentials
```typescript
// UlaResponse object with the following structure:
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
// UlaResponse object with the following structure:
const ulaResponse =
{
  statuscode: 500, // The statuscode always is 500 in case of an error
  body: {
    error: new Error('Some message')
  }
}
```
