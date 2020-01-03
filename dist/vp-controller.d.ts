import { EventHandler, HttpService, Message, Plugin } from 'universal-ledger-agent'
import { ChallengeRequestSigner, VerifiablePresentationGenerator, VerifiablePresentationSigner } from 'vp-toolkit'
import { VerifiableCredentialHelper } from './service/verifiable-credential-helper'
import { AddressHelper } from './service/address-helper'
import { CryptUtil } from 'crypt-util'

/**
 * The VP Controller ULA plugin
 * ensures a correct issue/verify flow
 * by delegating various activities to
 * the correct dependencies.
 */
export declare class VpController implements Plugin {
  private _cryptUtil
  private _accountIdParam?
  private _overrides?
    private _eventHandler?;
  private _accountId
  private readonly _vpGenerator
  private readonly _vpSigners
  private readonly _challengeRequestSigners
  private readonly _httpService
  private readonly _vcHelper
  private readonly _addressHelper
    /**
     * The account ID is the 'wallet' or 'profile'
     * identifier the current user is utilizing.
     * If your wallet implementation does not provide
     * multiple wallets/profiles, use the default value.
     *
     * The overrides allow you to customize the behaviour
     * of the VP controller:
     * - vpGenerator creates VerifiableCredentials
     *   and VerifiablePresentations
     * - Various signers can be provided, so you can
     *   verify objects (VerifiablePresentations &
     *   VerifiableCredentials and ChallengeRequests)
     *   which were signed with different algorithms.
     * - The HttpService is responsible for GETting and
     *   POSTing payloads to the provided endpoints.
     * - The AddressHelper and VerifiableCredentialHelper
     *   act as bridges to the data layer for retrieving
     *   and saving data.
     *
     * The CryptUtil you provide will only be used to
     * create default objects which are not overridden.
     * If you don't deviate from the default protocol,
     * you don't have to provide any overrides.
     *
     * @param {CryptUtil} _cryptUtil
     * @param {number} _accountIdParam
     * @param _overrides
     */
    constructor (_cryptUtil: CryptUtil, _accountIdParam?: number | undefined, _overrides?: {
      vpGenerator?: VerifiablePresentationGenerator | undefined;
      vpSigners?: VerifiablePresentationSigner[] | undefined;
      challengeRequestSigners?: ChallengeRequestSigner[] | undefined;
      httpService?: HttpService | undefined;
      addressHelper?: AddressHelper | undefined;
      vcHelper?: VerifiableCredentialHelper | undefined;
    } | undefined);
    /**
     * The name of the plugin
     * @return {string}
     */
    readonly name: string;
    /**
     * The current wallet/profile ID
     * @return {number}
     */
    /**
    * When the user switches to a different
    * wallet/profile, update the accountId
    * to make sure the correct keys are
    * generated and used.
    */
    accountId: number;
    /**
     * Receive the eventHandler so we can put messages
     * back on the ULA again
     * @param {EventHandler} eventHandler
     */
    initialize(eventHandler: EventHandler): void;
    /**
     * Handle incoming messages
     * @param {Message} message
     * @param callback
     * @return {Promise<string>}
     */
    handleEvent(message: Message, callback: any): Promise<string>;
    private handleConsent;
    private triggerFailure;
}
