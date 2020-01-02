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

import * as chai from 'chai'
import * as sinon from 'sinon'
import * as sinonChai from 'sinon-chai'
import * as chaiAsPromised from 'chai-as-promised'
import { AddressHelper, VerifiableCredentialHelper, VpController } from '../../src'
import { BrowserHttpService, EventHandler, Message, UlaResponse } from 'universal-ledger-agent'
import {
  ChallengeRequest,
  IChallengeRequestParams,
  IProofParams,
  IVerifiableCredentialParams,
  IVerifiablePresentationParams,
  VerifiableCredential,
  VerifiablePresentation
} from 'vp-toolkit-models'
import { LocalCryptUtils } from 'crypt-util'
import {
  ChallengeRequestSigner,
  VerifiableCredentialGenerator,
  VerifiableCredentialSigner,
  VerifiablePresentationGenerator,
  VerifiablePresentationSigner
} from 'vp-toolkit'
import { Address, IAddress } from 'ula-vc-data-management'
import { ChallengeRequestSignerMock } from '../mock/cr-signer-mock'
import { VerifiablePresentationSignerMock } from '../mock/vp-signer-mock'

before(() => {
  chai.should()
  chai.use(chaiAsPromised)
  chai.use(sinonChai)
})

describe('vp controller handle event', function () {
  let clock: sinon.SinonFakeTimers
  const accountId = 2020
  let cryptUtil = new LocalCryptUtils()
  const crSigner = new ChallengeRequestSigner(cryptUtil)
  const vcSigner = new VerifiableCredentialSigner(cryptUtil)
  const vcGenerator = new VerifiableCredentialGenerator(vcSigner)
  const vpSigner = new VerifiablePresentationSigner(cryptUtil, vcSigner)
  const vpGenerator = new VerifiablePresentationGenerator(vpSigner)
  const httpService = new BrowserHttpService()
  const addressHelper = new AddressHelper(cryptUtil)
  const vcHelper = new VerifiableCredentialHelper(vcGenerator, addressHelper)
  let sut = getNewSut()
  const testProof = {
    type: 'SomeSignature2019',
    created: new Date('01-01-2019 12:34:00'),
    verificationMethod: 'pubkey',
    nonce: '9f2f4712-a16f-44c2-8271-d6129de2b91f',
    signatureValue: 'signature'
  }
  const issueAndVerifyCRParams: IChallengeRequestParams = {
    correspondenceId: '3ead8ae0-2d8b-41de-a54b-2d99927e458c',
    toAttest: [{ predicate: 'http://schema.org/givenName' }],
    toVerify: [{ predicate: 'http://schema.org/familyName' }],
    postEndpoint: 'http://domain.org/ssi/verifiable-presentation-endpoint',
    proof: testProof
  }
  const initialUlaMessageType = 'process-challengerequest'
  const initialUlaMessage = new Message(
    {
      type: initialUlaMessageType,
      msg: issueAndVerifyCRParams
    }
  )

  beforeEach(() => {
    clock = sinon.useFakeTimers({
      now: new Date(2019, 0, 1, 12, 34),
      shouldAdvanceTime: false
    })
  })

  afterEach(() => {
    cryptUtil = new LocalCryptUtils()
    sut = new VpController(cryptUtil, accountId, {
      vpGenerator,
      vpSigners: [vpSigner],
      challengeRequestSigners: [crSigner],
      httpService,
      addressHelper,
      vcHelper
    })
    clock.restore()
    sinon.restore()
  })

  it('should always return "ignored" when the message type does not match', () => {
    const wrongMessage = new Message({ type: 'did:any:address', msg: {} })
    sut.initialize(new EventHandler([]))
    const handleEventCall = sut.handleEvent(wrongMessage, undefined)
    return handleEventCall.should.eventually.equal('ignored')
  })

  it('should return "ignored" when the message does not contain an msg property', () => {
    const incompleteMessage = new Message({
      type: initialUlaMessageType
    })
    const handleEventCall = sut.handleEvent(incompleteMessage, undefined)
    return handleEventCall.should.eventually.equal('ignored')
  })

  it('should throw when the plugin was not initialized', (done) => {
    let callbackResponse: UlaResponse

    sut.handleEvent(initialUlaMessage, (response: UlaResponse) => {
      callbackResponse = response
    }).then((outcome) => {
      callbackResponse.statusCode.should.be.equal(500)
      callbackResponse.body.error.message.should.be.equal('Plugin not initialized. Did you forget to call initialize() ?')
      outcome.should.be.equal('error-initialize')
      done()
    })
  })

  it('should return "error-cr" when the challengeRequest signature validation fails', (done) => {
    let callbackResponse: UlaResponse
    const crSignerStub = sinon.stub(crSigner, 'verifyChallengeRequest').returns(false)
    sinon.stub(crSigner, 'signatureType').get(() => testProof.type)
    sut.initialize(new EventHandler([]))

    sut.handleEvent(initialUlaMessage, (response: UlaResponse) => {
      callbackResponse = response
    }).then((outcome) => {
      callbackResponse.statusCode.should.be.equal(500)
      callbackResponse.body.error.message.should.be.equal('ChallengeRequest verification failed: The signature is invalid')
      crSignerStub.should.have.been.calledOnceWithExactly(new ChallengeRequest(issueAndVerifyCRParams))
      outcome.should.be.equal('error-cr')
      done()
    })
  })

  it('should return "error" when the given challengeRequest json is invalid', (done) => {
    let callbackResponse: UlaResponse
    const incompleteMessage = new Message({
      type: initialUlaMessageType,
      msg: { a: 'b' }
    })
    sut.initialize(new EventHandler([]))

    sut.handleEvent(incompleteMessage, (response: UlaResponse) => {
      callbackResponse = response
    }).then((outcome) => {
      callbackResponse.statusCode.should.be.equal(500)
      callbackResponse.body.error.message.should.be.equal('One or more fields are empty')
      outcome.should.be.equal('error')
      done()
    })
  })

  it('should return "error-vp" when the received VP from the issuer is invalid', (done) => {
    let callbackResponse: UlaResponse
    // Arranging dummydata
    const testData = prepareDummyData()
    // Arranging stubs and sut
    const eventHandler = new EventHandler([])
    sinon.stub(httpService, 'postRequest').resolves(testData.issuerVpWithProof.toJSON())
    sinon.stub(vpSigner, 'signatureType').get(() => testProof.type)
    sinon.stub(vpSigner, 'verifyVerifiablePresentation').returns(false) // Fail
    const acceptConsentMessage = new Message(
      {
        type: 'accept-consent',
        challengeRequest: issueAndVerifyCRParams,
        verifiablePresentation: testData.issuerVpWithProof
      }
    )
    sut = getNewSut()
    sut.initialize(eventHandler)

    sut.handleEvent(acceptConsentMessage, (response: UlaResponse) => {
      callbackResponse = response
    }).then((outcome) => {
      callbackResponse.statusCode.should.be.equal(500)
      callbackResponse.body.error.message.should.be.equal('The VerifiablePresentation from the issuer is invalid')
      outcome.should.be.equal('error-vp')
      done()
    })
  })

  it('should use the correct VPsigner for validating the VP', (done) => {
    // Arranging dummydata
    const testData = prepareDummyData()
    const wrongvpSigner = new VerifiablePresentationSignerMock(cryptUtil, vcSigner)
    // Arranging stubs and sut
    const eventHandler = new EventHandler([])
    sinon.stub(httpService, 'postRequest').resolves(testData.issuerVpWithProof.toJSON())
    sinon.stub(vpSigner, 'signatureType').get(() => testProof.type)
    const wrongVpSignerStub = sinon.stub(wrongvpSigner, 'verifyVerifiablePresentation')
    const vpSignerVerifyStub = sinon.stub(vpSigner, 'verifyVerifiablePresentation').returns(true)
    sinon.stub(vcHelper, 'saveIssuedVCs').resolves()
    const acceptConsentMessage = new Message(
      {
        type: 'accept-consent',
        challengeRequest: issueAndVerifyCRParams,
        verifiablePresentation: testData.issuerVpWithProof
      }
    )
    sut = new VpController(cryptUtil, accountId, {
      vpGenerator,
      vpSigners: [wrongvpSigner, vpSigner, wrongvpSigner],
      challengeRequestSigners: [crSigner],
      httpService,
      addressHelper,
      vcHelper
    })

    sut.initialize(eventHandler)

    sut.handleEvent(acceptConsentMessage, () => {
      // Do nothing
    }).then(() => {
      const expectedIssuerVp = new VerifiablePresentation(testData.issuerVpWithProof.toJSON() as IVerifiablePresentationParams)
      vpSignerVerifyStub.should.have.been.calledOnceWithExactly(expectedIssuerVp, true)
      wrongVpSignerStub.callCount.should.be.equal(0)
      done()
    })
  })

  it('should use the first available VPsigner for validating a VP without proofs', (done) => {
    // Arranging dummydata
    const testData = prepareDummyData()
    testData.issuerVpWithoutProof.proof = [] // Field still needs to be initialized
    const wrongvpSigner = new VerifiablePresentationSignerMock(cryptUtil, vcSigner)
    // Arranging stubs and sut
    const eventHandler = new EventHandler([])
    sinon.stub(httpService, 'postRequest').resolves(testData.issuerVpWithoutProof) // No proofs
    sinon.stub(vpSigner, 'signatureType').get(() => testProof.type)
    const wrongVpSignerStub = sinon.stub(wrongvpSigner, 'verifyVerifiablePresentation').returns(false)
    const vpSignerStub = sinon.stub(vpSigner, 'verifyVerifiablePresentation')
    sinon.stub(vcHelper, 'saveIssuedVCs').resolves()
    const acceptConsentMessage = new Message(
      {
        type: 'accept-consent',
        challengeRequest: issueAndVerifyCRParams,
        verifiablePresentation: testData.issuerVpWithProof
      }
    )
    sut = new VpController(cryptUtil, accountId, {
      vpGenerator,
      vpSigners: [wrongvpSigner, vpSigner],
      challengeRequestSigners: [crSigner],
      httpService,
      addressHelper,
      vcHelper
    })

    sut.initialize(eventHandler)

    sut.handleEvent(acceptConsentMessage, () => {
      // Do nothing
    }).then(() => {
      const expectedIssuerVp = new VerifiablePresentation(testData.issuerVpWithoutProof as IVerifiablePresentationParams)
      vpSignerStub.callCount.should.be.equal(0)
      wrongVpSignerStub.should.have.been.calledOnceWithExactly(expectedIssuerVp, true)
      done()
    })
  })

  it('should use the correct CRsigner for validating the ChallengeRequest', (done) => {
    // Arranging dummydata
    const testData = prepareDummyData()
    const wrongcrSigner = new ChallengeRequestSignerMock(cryptUtil)
    // Arranging stubs and sut
    const eventHandler = new EventHandler([])
    sinon.stub(vcHelper, 'generateSelfAttestedVCs').resolves([])
    sinon.stub(vcHelper, 'findVCsForChallengeRequest').resolves({ matching: [], missing: [] })
    sinon.stub(addressHelper, 'findDidInfoForVCs').resolves([])
    sinon.stub(vpGenerator, 'generateVerifiablePresentation').returns(testData.selfSignedVpWithProof)
    sinon.stub(httpService, 'postRequest').resolves(testData.issuerVpWithProof.toJSON())
    const wrongCrSignerStub = sinon.stub(wrongcrSigner, 'verifyChallengeRequest')
    const crSignerVerifyStub = sinon.stub(crSigner, 'verifyChallengeRequest').returns(true)
    sinon.stub(crSigner, 'signatureType').get(() => testProof.type)
    sinon.stub(vpSigner, 'verifyVerifiablePresentation').returns(true)
    sinon.stub(vpSigner, 'signatureType').get(() => testProof.type)
    sinon.stub(vcHelper, 'saveIssuedVCs').resolves()
    sut = new VpController(cryptUtil, accountId, {
      vpGenerator,
      vpSigners: [vpSigner],
      challengeRequestSigners: [wrongcrSigner, crSigner, wrongcrSigner],
      httpService,
      addressHelper,
      vcHelper
    })

    sut.initialize(eventHandler)

    sut.handleEvent(initialUlaMessage, () => {
      // Do nothing
    }).then(() => {
      const expectedChallengeRequestObj = new ChallengeRequest(issueAndVerifyCRParams)
      crSignerVerifyStub.should.have.been.calledOnceWithExactly(expectedChallengeRequestObj)
      wrongCrSignerStub.callCount.should.be.equal(0)
      done()
    })
  })

  it('should return "error-cr" when no appropriate crSigner is present', (done) => {
    let callbackResponse: UlaResponse
    const wrongcrSigner = new ChallengeRequestSignerMock(cryptUtil)
    const wrongCrSignerStub = sinon.stub(wrongcrSigner, 'verifyChallengeRequest')
    sut = new VpController(cryptUtil, accountId, {
      vpGenerator,
      vpSigners: [vpSigner],
      challengeRequestSigners: [wrongcrSigner, wrongcrSigner],
      httpService,
      addressHelper,
      vcHelper
    })

    sut.initialize(new EventHandler([]))

    sut.handleEvent(initialUlaMessage, (response: UlaResponse) => {
      callbackResponse = response
    }).then((outcome) => {
      callbackResponse.statusCode.should.be.equal(500)
      callbackResponse.body.error.message.should.be.equal('ChallengeRequest verification failed: The object was signed with an unknown encryption scheme')
      wrongCrSignerStub.callCount.should.be.equal(0)
      outcome.should.be.equal('error-cr')
      done()
    })
  })

  it('should return "success" and use proper consent callbacks for issuing and verifying', (done) => {
    // Arranging dummydata
    const testData = prepareDummyData()
    // Arranging stubs and sut
    const eventHandler = new EventHandler([])
    sinon.stub(crSigner, 'signatureType').get(() => testProof.type)
    const crSignerStub = sinon.stub(crSigner, 'verifyChallengeRequest').returns(true)
    const vcHelperSelfAttestStub = sinon.stub(vcHelper, 'generateSelfAttestedVCs')
      .resolves([testData.selfSignedVcWithProof])
    const vcHelperFindVcMatchStub = sinon.stub(vcHelper, 'findVCsForChallengeRequest')
      .resolves({
        matching: [testData.issuerVcWithProof],
        missing: [{ predicate: 'http://schema.org/familyName', reason: 'missing' }]
      })
    const addressHelperStub = sinon.stub(addressHelper, 'findDidInfoForVCs').resolves([new Address({
      accountId: 100,
      keyId: 100,
      address: 'did:eth:someAddress',
      predicate: 'http://schema.org/givenName'
    })])
    const vpGeneratorStub = sinon.stub(vpGenerator, 'generateVerifiablePresentation')
      .returns(testData.selfSignedVpWithProof)
    let ulaResponses: UlaResponse[] = []

    sut.initialize(eventHandler)

    sut.handleEvent(initialUlaMessage, (response: UlaResponse) => {
      ulaResponses.push(response)
    }).then((outcome: string) => {
      const expectedChallengeRequestObj = new ChallengeRequest(issueAndVerifyCRParams)
      ulaResponses.length.should.be.equal(1)
      ulaResponses[0].statusCode.should.be.equal(200)
      ulaResponses[0].body.should.be.deep.equal(testData.consentRequest)
      crSignerStub.should.have.been.calledOnceWithExactly(expectedChallengeRequestObj)
      addressHelperStub.should.have.been.calledOnceWith([testData.issuerVcWithProof])
      vcHelperSelfAttestStub.should.have.been.calledOnceWith(expectedChallengeRequestObj, accountId)
      vcHelperFindVcMatchStub.should.have.been.calledOnceWith(expectedChallengeRequestObj)
      vpGeneratorStub.should.have.been.calledOnceWithExactly(testData.selfSignedVpWithoutProof, [
        { accountId: 0, keyId: 0 },
        { accountId: 100, keyId: 100 }
      ], issueAndVerifyCRParams.correspondenceId)
      outcome.should.be.equal('success')
      done()
    })
  })

  it('should return "success" and use proper callbacks after giving consent for issuing and verifying', (done) => {
    // Arranging dummydata
    const testData = prepareDummyData()
    // Arranging stubs and sut
    const eventHandler = new EventHandler([])
    const httpServiceStub = sinon.stub(httpService, 'postRequest')
      .resolves(testData.issuerVpWithProof.toJSON())
    sinon.stub(vpSigner, 'signatureType').get(() => testProof.type)
    const vpSignerStub = sinon.stub(vpSigner, 'verifyVerifiablePresentation').returns(true)
    const vcHelperSaveStub = sinon.stub(vcHelper, 'saveIssuedVCs').resolves()
    let ulaResponses: UlaResponse[] = []
    const consentUlaMessage = new Message(
      {
        type: 'accept-consent',
        challengeRequest: testData.consentRequest.challengeRequest,
        verifiablePresentation: testData.consentRequest.verifiablePresentation
      }
    )
    sut.initialize(eventHandler)

    sut.handleEvent(consentUlaMessage, (response: UlaResponse) => {
      ulaResponses.push(response)
    }).then((outcome: string) => {
      const expectedIssuerVp = new VerifiablePresentation(testData.issuerVpWithProof.toJSON() as IVerifiablePresentationParams)
      ulaResponses.length.should.be.equal(1)
      ulaResponses[0].statusCode.should.be.equal(201)
      ulaResponses[0].body.should.be.deep.equal({})
      httpServiceStub.should.have.been.calledOnceWithExactly(testData.consentRequest.challengeRequest.postEndpoint, testData.selfSignedVpWithProof)
      vpSignerStub.should.have.been.calledOnceWithExactly(expectedIssuerVp, true)
      vcHelperSaveStub.should.have.been.calledOnceWith(expectedIssuerVp.verifiableCredential)
      outcome.should.be.equal('success')
      done()
    })
  })

  // This test prevents the code trying to assemble an empty VerifiablePresentation
  it('should return "success" and use proper feedback callbacks when no matching credentials were found', (done) => {
    // Arranging dummydata
    const testData = prepareDummyData()
    // Arranging stubs and sut
    const eventHandler = new EventHandler([])
    sinon.stub(crSigner, 'signatureType').get(() => testProof.type)
    const crSignerStub = sinon.stub(crSigner, 'verifyChallengeRequest').returns(true)
    const vcHelperSelfAttestStub = sinon.stub(vcHelper, 'generateSelfAttestedVCs').resolves([])
    const vcHelperFindVcMatchStub = sinon.stub(vcHelper, 'findVCsForChallengeRequest')
      .resolves({
        matching: [], // No matching credentials
        missing: [{ predicate: 'http://schema.org/familyName', reason: 'missing' }]
      })
    const addressHelperStub = sinon.stub(addressHelper, 'findDidInfoForVCs').resolves([])
    const vpGeneratorStub = sinon.stub(vpGenerator, 'generateVerifiablePresentation')
    let ulaResponses: UlaResponse[] = []

    sut.initialize(eventHandler)

    sut.handleEvent(initialUlaMessage, (response: UlaResponse) => {
      ulaResponses.push(response)
    }).then((outcome: string) => {
      const expectedChallengeRequestObj = new ChallengeRequest(issueAndVerifyCRParams)
      ulaResponses.length.should.be.equal(1)
      ulaResponses[0].statusCode.should.be.equal(200)
      ulaResponses[0].body.should.be.deep.equal(testData.emptyConsentRequest)
      crSignerStub.should.have.been.calledOnceWithExactly(expectedChallengeRequestObj)
      addressHelperStub.should.have.been.calledOnceWith([])
      vcHelperSelfAttestStub.should.have.been.calledOnceWith(expectedChallengeRequestObj, accountId)
      vcHelperFindVcMatchStub.should.have.been.calledOnceWith(expectedChallengeRequestObj)
      vpGeneratorStub.callCount.should.have.been.equals(0)
      outcome.should.be.equal('success')
      done()
    })
  })

  it('should not include DidOwnership credentials into a transaction', (done) => {
    // Arranging dummydata
    const testData = prepareDummyData()
    // Arranging stubs and sut
    const eventHandler = new EventHandler([])
    sinon.stub(httpService, 'postRequest')
      .resolves(testData.issuerVpWithProof.toJSON())
    sinon.stub(vpSigner, 'signatureType').get(() => testProof.type)
    sinon.stub(vpSigner, 'verifyVerifiablePresentation').returns(true)
    const vcHelperSaveStub = sinon.stub(vcHelper, 'processTransaction').resolves()
    const consentUlaMessage = new Message(
      {
        type: 'accept-consent',
        challengeRequest: testData.consentRequest.challengeRequest,
        verifiablePresentation: testData.consentRequest.verifiablePresentation
      }
    )
    sut.initialize(eventHandler)

    sut.handleEvent(consentUlaMessage, () => {
      // Do nothing
    }).then(() => {
      const deserializedVp = new VerifiablePresentation(testData.issuerVpWithProof.toJSON() as IVerifiablePresentationParams)
      vcHelperSaveStub.should.have.been.calledOnceWithExactly(
        testData.consentRequest.challengeRequest.proof.verificationMethod,
        [testData.issuerVcWithProof.proof.nonce],
        deserializedVp.verifiableCredential,
        eventHandler
      )
      done()
    })
  })

  it('should return "success" and use proper callbacks after giving consent for ONLY verifying', (done) => {
    // Arranging dummydata
    const testData = prepareDummyData()
    testData.consentRequest.challengeRequest = new ChallengeRequest(
      {
        // Nothing to attest
        toVerify: testData.consentRequest.challengeRequest.toVerify,
        postEndpoint: testData.consentRequest.challengeRequest.postEndpoint,
        proof: testData.consentRequest.challengeRequest.proof.toJSON() as IProofParams
      }
    )
    // Arranging stubs and sut
    const eventHandler = new EventHandler([])
    const httpServiceStub = sinon.stub(httpService, 'postRequest')
      .resolves({})
    const vpSignerStub = sinon.stub(vpSigner, 'verifyVerifiablePresentation')
    sinon.stub(vpSigner, 'signatureType').get(() => testProof.type)
    const vcHelperSaveStub = sinon.stub(vcHelper, 'processTransaction').resolves()
    const consentUlaMessage = new Message(
      {
        type: 'accept-consent',
        challengeRequest: testData.consentRequest.challengeRequest,
        verifiablePresentation: testData.consentRequest.verifiablePresentation
      }
    )
    let ulaResponses: UlaResponse[] = []

    sut.initialize(eventHandler)

    sut.handleEvent(consentUlaMessage, (response: UlaResponse) => {
      ulaResponses.push(response)
    }).then((outcome: string) => {
      ulaResponses.length.should.be.equal(1)
      ulaResponses[0].statusCode.should.be.equal(201)
      ulaResponses[0].body.should.be.deep.equal({})
      httpServiceStub.should.have.been.calledOnceWithExactly(
        testData.consentRequest.challengeRequest.postEndpoint,
        testData.selfSignedVpWithProof
      )
      vpSignerStub.callCount.should.be.equal(0)
      vcHelperSaveStub.callCount.should.be.equal(1)
      outcome.should.be.equal('success')
      done()
    })
  })

  it('should return "success" and complete the entire flow for ONLY issuing', (done) => {
    // Arranging dummydata
    const testData = prepareDummyData()
    const issuerChallengeRequest = new ChallengeRequest(
      {
        // Issuer has nothing to verify
        toAttest: testData.consentRequest.challengeRequest.toAttest,
        postEndpoint: testData.consentRequest.challengeRequest.postEndpoint,
        proof: testData.consentRequest.challengeRequest.proof.toJSON() as IProofParams
      })
    testData.consentRequest.challengeRequest = issuerChallengeRequest
    // Arranging stubs and sut
    const eventHandler = new EventHandler([])
    sinon.stub(crSigner, 'signatureType').get(() => testProof.type)
    sinon.stub(crSigner, 'verifyChallengeRequest').returns(true)
    sinon.stub(vcHelper, 'generateSelfAttestedVCs')
      .resolves([testData.selfSignedVcWithProof])
    sinon.stub(vcHelper, 'findVCsForChallengeRequest')
      .resolves({ matching: [], missing: [] })
    sinon.stub(addressHelper, 'findDidInfoForVCs').resolves([new Address({
      accountId: 100,
      keyId: 100,
      address: 'did:eth:someAddress',
      predicate: 'http://schema.org/givenName'
    })])
    sinon.stub(vpGenerator, 'generateVerifiablePresentation')
      .returns(testData.selfSignedVpWithProof)
    const httpServiceStub = sinon.stub(httpService, 'postRequest')
      .resolves(testData.issuerVpWithProof.toJSON())
    const verifyVpStub = sinon.stub(vpSigner, 'verifyVerifiablePresentation').returns(true)
    sinon.stub(vpSigner, 'signatureType').get(() => testProof.type)
    const vcHelperSaveStub = sinon.stub(vcHelper, 'saveIssuedVCs').resolves()
    let ulaResponses: UlaResponse[] = []
    const ulaMessage = new Message(
      {
        type: initialUlaMessageType,
        msg: issuerChallengeRequest.toJSON()
      })

    sut.initialize(eventHandler)

    sut.handleEvent(ulaMessage, (response: UlaResponse) => {
      ulaResponses.push(response)
    }).then((outcome: string) => {
      const expectedIssuerVp = new VerifiablePresentation(testData.issuerVpWithProof.toJSON() as IVerifiablePresentationParams)
      ulaResponses.length.should.be.equal(1)
      ulaResponses[0].statusCode.should.be.equal(201)
      ulaResponses[0].body.should.be.deep.equal({})
      verifyVpStub.should.have.been.calledOnceWithExactly(expectedIssuerVp, true)
      vcHelperSaveStub.should.have.been.calledOnceWith(expectedIssuerVp.verifiableCredential)
      httpServiceStub.should.have.been.calledOnceWithExactly(testData.consentRequest.challengeRequest.postEndpoint, testData.selfSignedVpWithProof)
      outcome.should.be.equal('success')
      done()
    })
  })

  /**
   * Creates a new VpController object
   * with all specified overrides
   * @return {VpController}
   */
  function getNewSut (): VpController {
    return new VpController(cryptUtil, accountId, {
      vpGenerator,
      vpSigners: [vpSigner],
      challengeRequestSigners: [crSigner],
      httpService,
      addressHelper,
      vcHelper
    })
  }

  /**
   * Creating data for the happy flow in
   * a separate method to keep the tests
   * clean.
   */
  function prepareDummyData () {
    // Holder (sending a self signed VP, proving DID ownership and sending current VC's as requested by issuer)
    let holderPubAddress = '0xholderAddress'
    let holderDid = 'did:eth:' + holderPubAddress
    let givenNamePredicate = 'http://schema.org/givenName'
    let selfSignedVcWithoutProof: IVerifiableCredentialParams = {
      type: ['VerifiableCredential', 'DidOwnership'],
      credentialSubject: {},
      '@context': [givenNamePredicate],
      issuanceDate: new Date(),
      issuer: holderDid
    }
    const selfSignedTestProof = {
      type: 'SomeSignature2019',
      created: new Date('01-01-2019 12:34:00'),
      verificationMethod: 'pubkey',
      nonce: 'a198b2a1-91bb-4c15-8d69-f6de3c27fa3e',
      signatureValue: 'signature'
    }
    let selfSignedVcWithProof = {
      accountId: 0, keyId: 0, vc: new VerifiableCredential(
        Object.assign({ proof: selfSignedTestProof }, selfSignedVcWithoutProof)
      )
    }

    // Issuer (sending a VP with attested data back to the holder)
    let issuerPubAddress = '0xissuerAddress'
    let issuerDid = 'did:eth:' + issuerPubAddress
    let issuerVcWithoutProof = {
      type: ['VerifiableCredential'],
      credentialSubject: {
        id: holderDid,
        'http://schema.org/givenName': 'Tom'
      },
      '@context': [givenNamePredicate],
      issuanceDate: new Date(),
      issuer: issuerDid,
      issuerName: 'Organisation'
    } as IVerifiableCredentialParams
    let issuerVcWithProof = new VerifiableCredential(
      Object.assign({ proof: testProof }, issuerVcWithoutProof)
    )
    let issuerVpWithoutProof: IVerifiablePresentationParams = {
      type: ['VerifiablePresentation'],
      verifiableCredential: [issuerVcWithProof]
    }
    let issuerVpWithProof = new VerifiablePresentation(
      Object.assign({ proof: [testProof] }, issuerVpWithoutProof)
    )
    let issuerAddressParams: IAddress = {
      address: holderPubAddress,
      accountId: 100,
      keyId: 0,
      predicate: givenNamePredicate
    }

    // Holder (VP, requesting consent to app)
    let selfSignedVpWithoutProof: IVerifiablePresentationParams = {
      type: ['VerifiablePresentation', 'ChallengeResponse'],
      verifiableCredential: [selfSignedVcWithProof.vc, issuerVcWithProof]
    }
    let selfSignedVpWithProof = new VerifiablePresentation(
      Object.assign({ proof: [testProof] }, selfSignedVpWithoutProof)
    )
    let consentRequest = {
      attestationsToConfirm: [{
        predicate: givenNamePredicate,
        value: 'Tom',
        issuer: issuerDid
      }],
      missingAttestations: [{ predicate: 'http://schema.org/familyName', reason: 'missing' }], // Also testing missingAttestations array
      challengeRequest: new ChallengeRequest(issueAndVerifyCRParams),
      verifiablePresentation: selfSignedVpWithProof
    }
    let emptyConsentRequest = {
      attestationsToConfirm: [],
      missingAttestations: consentRequest.missingAttestations,
      challengeRequest: consentRequest.challengeRequest,
      verifiablePresentation: undefined
    }

    return {
      selfSignedVcWithProof: selfSignedVcWithProof,
      selfSignedVpWithoutProof: selfSignedVpWithoutProof,
      selfSignedVpWithProof: selfSignedVpWithProof,
      issuerVcWithoutProof: issuerVcWithoutProof,
      issuerVcWithProof: issuerVcWithProof,
      issuerVpWithoutProof: issuerVpWithoutProof,
      issuerVpWithProof: issuerVpWithProof,
      issuerAddressParams: issuerAddressParams,
      consentRequest: consentRequest,
      emptyConsentRequest: emptyConsentRequest
    }
  }
})
