/*
 *  Copyright 2020 Coöperatieve Rabobank U.A.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { EventHandler, HttpService, Message, Plugin } from 'universal-ledger-agent'
import { ChallengeRequestSigner, VerifiablePresentationGenerator, VerifiablePresentationSigner } from 'vp-toolkit'
import { VerifiableCredentialHelper } from './service/verifiable-credential-helper'
import { AddressHelper } from './service/address-helper'

/**
 * The VP Controller ULA plugin
 * ensures a correct issue/verify flow
 * by delegating various activities to
 * the correct dependencies.
 */
export declare class VpController implements Plugin {
  /**
   * The name of the plugin
   * @return {string}
   */
  readonly name: string
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
  accountId: number
  private _challengeRequestSigners
  private _httpService
  private _vcHelper
  private _addressHelper
  private _accountId
  private _eventHandler?
  private _vpGenerator
  private _vpSigners

  /**
   * Provide the generators you want to use
   * in order to generate VerifiableCredentials
   * and VerifiablePresentations.
   *
   * Multiple signers for one class can be provided,
   * so you can verify objects which were signed with
   * different algorithms. If the VerifiablePresentation
   * from the issuer does not contain any proofs, the
     * first given VerifiablePresentationSigner will be
     * used. Create your own signer by overriding the
     * existing signer class.
     *
     * The account ID is the 'wallet' or 'profile'
     * identifier the current user is utilizing.
     * If your wallet implementation does not provide
     * multiple wallets/profiles, then you can
   * provide 0 as accountId value.
   *
   * @param {VerifiablePresentationGenerator} _vpGenerator
   * @param {VerifiablePresentationSigner[]} _vpSigners
   * @param {ChallengeRequestSigner[]} _challengeRequestSigners
   * @param {HttpService} _httpService
   * @param {VerifiableCredentialHelper} _vcHelper
   * @param {AddressHelper} _addressHelper
   * @param {number} _accountId
   */
  constructor (_vpGenerator: VerifiablePresentationGenerator, _vpSigners: VerifiablePresentationSigner[], _challengeRequestSigners: ChallengeRequestSigner[], _httpService: HttpService, _vcHelper: VerifiableCredentialHelper, _addressHelper: AddressHelper, _accountId: number);

  /**
   * Receive the eventHandler so we can put messages
   * back on the ULA again
   * @param {EventHandler} eventHandler
   */
  initialize (eventHandler: EventHandler): void;

  /**
   * Handle incoming messages
   * @param {Message} message
   * @param callback
   * @return {Promise<string>}
   */
  handleEvent (message: Message, callback: any): Promise<string>;

  private handleConsent
  private triggerFailure
}
