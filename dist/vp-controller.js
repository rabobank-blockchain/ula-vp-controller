"use strict";
/*
 *  Copyright 2019 Coöperatieve Rabobank U.A.
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const universal_ledger_agent_1 = require("universal-ledger-agent");
const vp_toolkit_models_1 = require("vp-toolkit-models");
const vp_toolkit_1 = require("vp-toolkit")
const verifiable_credential_helper_1 = require("./service/verifiable-credential-helper")
const address_helper_1 = require("./service/address-helper")
/**
 * The VP Controller ULA plugin
 * ensures a correct issue/verify flow
 * by delegating various activities to
 * the correct dependencies.
 */
class VpController {
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
    constructor(_cryptUtil, _accountIdParam, _overrides) {
      this._cryptUtil = _cryptUtil
      this._accountIdParam = _accountIdParam
      this._overrides = _overrides
      this._accountId = _accountIdParam || 0
      // For each object either use override or, if not defined, a new default value
      this._vpGenerator = _overrides && _overrides.vpGenerator ? _overrides.vpGenerator
        : new vp_toolkit_1.VerifiablePresentationGenerator(new vp_toolkit_1.VerifiablePresentationSigner(this._cryptUtil, new vp_toolkit_1.VerifiableCredentialSigner(this._cryptUtil)))
      this._vpSigners = _overrides && _overrides.vpSigners ? _overrides.vpSigners
        : [new vp_toolkit_1.VerifiablePresentationSigner(this._cryptUtil, new vp_toolkit_1.VerifiableCredentialSigner(this._cryptUtil))]
      this._challengeRequestSigners = _overrides && _overrides.challengeRequestSigners
        ? _overrides.challengeRequestSigners
        : [new vp_toolkit_1.ChallengeRequestSigner(this._cryptUtil)]
      this._httpService = _overrides && _overrides.httpService ? _overrides.httpService
        : new universal_ledger_agent_1.BrowserHttpService()
      this._addressHelper = _overrides && _overrides.addressHelper ? _overrides.addressHelper
        : new address_helper_1.AddressHelper(this._cryptUtil)
      this._vcHelper = _overrides && _overrides.vcHelper ? _overrides.vcHelper
        : new verifiable_credential_helper_1.VerifiableCredentialHelper(new vp_toolkit_1.VerifiableCredentialGenerator(new vp_toolkit_1.VerifiableCredentialSigner(this._cryptUtil)), this._addressHelper)
    }
    /**
     * The name of the plugin
     * @return {string}
     */
    get name() {
        return 'VpController';
    }
    /**
     * The current wallet/profile ID
     * @return {number}
     */
    get accountId() {
        return this._accountId;
    }
    /**
     * When the user switches to a different
     * wallet/profile, update the accountId
     * to make sure the correct keys are
     * generated and used.
     */
    set accountId(id) {
        this._accountId = id;
    }
    /**
     * Receive the eventHandler so we can put messages
     * back on the ULA again
     * @param {EventHandler} eventHandler
     */
    initialize(eventHandler) {
        this._eventHandler = eventHandler;
    }
    /**
     * Handle incoming messages
     * @param {Message} message
     * @param callback
     * @return {Promise<string>}
     */
    handleEvent(message, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            if (message.properties.type.match('accept-consent')) {
                return this.handleConsent(message, callback);
            }
            if (message.properties.type !== 'process-challengerequest') {
                return 'ignored'; // This message is not intended for us
            }
            if (!message.properties.endpoint || !message.properties.msg) {
                return 'ignored'; // The message type is correct, but endpoint or msg is missing
            }
            if (!this._eventHandler) {
                this.triggerFailure(callback);
                throw new Error('Plugin not initialized. Did you forget to call initialize() ?');
            }
            try {
                const challengeRequest = new vp_toolkit_models_1.ChallengeRequest(message.properties.msg);
                // Check if we expect a response containing a VP with issued VC's from the issuer (otherwise it is a verifier)
                const matchingCrSigner = this._challengeRequestSigners.find((crSigner) => crSigner.signatureType === challengeRequest.proof.type);
                const isValidChallengeRequest = matchingCrSigner ? matchingCrSigner.verifyChallengeRequest(challengeRequest) : false;
                if (!isValidChallengeRequest) {
                    this.triggerFailure(callback);
                    return 'error-cr';
                }
                // toAttest process
                // Receive the DidInfo to create a new proof using the same DID keys
                const selfAttestedVCsAndDidInfo = yield this._vcHelper.generateSelfAttestedVCs(challengeRequest, this._accountId, this._eventHandler);
                const selfAttestedVCs = selfAttestedVCsAndDidInfo.map((vcd) => vcd.vc);
                // toVerify process
                const vcSearchResult = yield this._vcHelper.findVCsForChallengeRequest(challengeRequest, this._eventHandler);
                const existingVcAddresses = yield this._addressHelper.findDidInfoForVCs(vcSearchResult.matching, this._eventHandler);
                // Transform all DID info so generateVerifiablePresentation can digest it
                const selfAttestedDidInfo = selfAttestedVCsAndDidInfo.map(info => {
                    return { accountId: info.accountId, keyId: info.keyId };
                });
                const existingVcDidInfo = existingVcAddresses.map(addr => {
                    return { accountId: addr.accountId, keyId: addr.keyId };
                });
                // Prepare the response, but make the VP undefined if there are no credentials found
                const allFoundCredentials = selfAttestedVCs.concat(vcSearchResult.matching);
                const selfAttestedVP = allFoundCredentials.length > 0 ?
                    this._vpGenerator.generateVerifiablePresentation({
                        type: ['VerifiablePresentation', 'ChallengeResponse'],
                        verifiableCredential: allFoundCredentials
                    }, selfAttestedDidInfo.concat(existingVcDidInfo), challengeRequest.correspondenceId)
                    : undefined;
                // Ask for consent
                const nextMessage = new universal_ledger_agent_1.UlaResponse({
                    statusCode: 200,
                    body: {
                        confirmAttestations: vcSearchResult.matching.map((vc) => {
                            for (const cs of Object.keys(vc.credentialSubject)) {
                                if (cs !== 'id') {
                                    return {
                                        key: cs.split('/').pop(),
                                        value: vc.credentialSubject[cs],
                                        attestor: vc.additionalFields['issuerName']
                                    };
                                }
                            }
                        }),
                        missingAttestations: vcSearchResult.missing,
                        filledTemplate: {
                            challengeRequest: challengeRequest,
                            verifiablePresentation: selfAttestedVP
                        },
                        url: message.properties.endpoint,
                        type: 'accept-consent'
                    }
                }); // Todo: Redesign this message structure
                // If the counterparty requests data (toVerify), show the consent screen
                if (challengeRequest.toVerify.length > 0) {
                    callback(new universal_ledger_agent_1.UlaResponse({ statusCode: 1, body: { loading: false, success: false, failure: false } }));
                    callback(nextMessage);
                }
                else {
                    nextMessage.body.payload = nextMessage.body.filledTemplate;
                    return this.handleConsent(new universal_ledger_agent_1.Message(nextMessage.body), callback);
                }
            }
            catch (error) {
                this.triggerFailure(callback);
                return 'error';
            }
            return 'success';
        });
    }
    handleConsent(message, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            // Send challengeresponse (VP) and process the response from the endpoint
            const challengeRequest = message.properties.payload.challengeRequest;
            const selfAttestedVP = message.properties.payload.verifiablePresentation;
          const response = yield this._httpService.postRequest(challengeRequest.postEndpoint, selfAttestedVP)
            let issuedCredentials = [];
            // The endpoint can either be an issuer sending back a VP - or a verifier sending back an empty response
            if (challengeRequest.toAttest.length > 0) {
                const vp = new vp_toolkit_models_1.VerifiablePresentation(response);
                issuedCredentials = vp.verifiableCredential;
                const matchingVpSigner = this._vpSigners.find((vpSigner) => vp.proof.length > 0 && vpSigner.signatureType === vp.proof[0].type);
                const vpIsValidVp = matchingVpSigner
                    ? matchingVpSigner.verifyVerifiablePresentation(vp, true)
                    : this._vpSigners[0].verifyVerifiablePresentation(vp, true);
                if (!vpIsValidVp) {
                    this.triggerFailure(callback);
                    return 'error-vp';
                }
            }
            // Save the VC's coming from the issuer
          yield this._vcHelper.processTransaction(challengeRequest.proof.verificationMethod, selfAttestedVP.verifiableCredential.filter(vc => (!vc.type.includes('DidOwnership'))).map(vc => vc.proof.nonce), issuedCredentials,
            // @ts-ignore
            this._eventHandler);
            callback(new universal_ledger_agent_1.UlaResponse({ statusCode: 1, body: { loading: false, success: true, failure: false } }));
            callback(new universal_ledger_agent_1.UlaResponse({ statusCode: 201, body: {} }));
            return 'success';
        });
    }
    triggerFailure(callback) {
        if (callback) {
            callback(new universal_ledger_agent_1.UlaResponse({ statusCode: 1, body: { loading: false, success: false, failure: true } }));
            callback(new universal_ledger_agent_1.UlaResponse({ statusCode: 204, body: {} }));
        }
    }
}
exports.VpController = VpController;
//# sourceMappingURL=vp-controller.js.map
