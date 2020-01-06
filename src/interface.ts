import { VerifiableCredential } from 'vp-toolkit-models'

export interface VcSearchResult {
  matching: VerifiableCredential[],
  missing: { predicate: string, reason: string }[]
}

/**
 * This data is sent back to the app
 * using the callback function so the
 * user can give consent to sharing this
 * information with the third party.
 */
export interface CredentialConsentData {
  /**
   * Differs per issuer, but preferrably something
   * like 'https://schema.org/predicateName'
   */
  predicate: string,

  /**
   * The actual value for the given predicate
   */
  value: any,

  /**
   * Equals the VerifiableCredential.issuer field
   */
  issuer: string
}
