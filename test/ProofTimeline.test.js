// test/ProofTimeline.test.js
const {
  loadFixture
} = require('@nomicfoundation/hardhat-toolbox/network-helpers')
const { expect } = require('chai')
const { ethers }  = require('hardhat')

describe('ProofTimeline', function () {
  async function deployProofTimelineFixture() {
    const [owner, recorder] = await ethers.getSigners()
    const ProofTimeline = await ethers.getContractFactory('ProofTimeline')
    const timeline = await ProofTimeline.deploy(owner.address)
    return { timeline, owner, recorder }
  }

  const caseId   = ethers.keccak256(ethers.toUtf8Bytes('case1'))
  const dataHash = ethers.keccak256(ethers.toUtf8Bytes('data1'))

  describe('Recording Events', function () {
    it('Should record an event', async function () {
      const { timeline, owner } = await loadFixture(deployProofTimelineFixture)

      await timeline.connect(owner).recordEvent(
        caseId, 'DOC_UPLOADED', dataHash, 'User uploaded property deed'
      )

      expect(await timeline.totalEvents()).to.equal(1n)
      expect(await timeline.getTimelineLength(caseId)).to.equal(1n)
    })

    it('Should emit EventRecorded', async function () {
      const { timeline, owner } = await loadFixture(deployProofTimelineFixture)

      await expect(timeline.connect(owner).recordEvent(
        caseId, 'DOC_UPLOADED', dataHash, 'test'
      )).to.emit(timeline, 'EventRecorded')
        .withArgs(caseId, 'DOC_UPLOADED', dataHash, anyUint, 0n)
    })
  })

  describe('Verification', function () {
    it('Should verify correct data hash', async function () {
      const { timeline, owner } = await loadFixture(deployProofTimelineFixture)

      await timeline.connect(owner).recordEvent(
        caseId, 'DOC_UPLOADED', dataHash, 'test'
      )

      const isValid = await timeline.verifyEvent(caseId, 0, dataHash)
      expect(isValid).to.be.true
    })

    it('Should fail for incorrect data hash', async function () {
      const { timeline, owner } = await loadFixture(deployProofTimelineFixture)

      await timeline.connect(owner).recordEvent(
        caseId, 'DOC_UPLOADED', dataHash, 'test'
      )

      const wrongHash = ethers.keccak256(ethers.toUtf8Bytes('wrong'))
      const isValid = await timeline.verifyEvent(caseId, 0, wrongHash)
      expect(isValid).to.be.false
    })
  })
})

// Helper for anyUint in emit check
const anyUint = (val) => true
