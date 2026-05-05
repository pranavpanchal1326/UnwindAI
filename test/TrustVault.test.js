// test/TrustVault.test.js
const {
  loadFixture,
  time
} = require('@nomicfoundation/hardhat-toolbox/network-helpers')
const { expect } = require('chai')
const { ethers }  = require('hardhat')

describe('TrustVault', function () {
  async function deployTrustVaultFixture() {
    const [owner, user, lawyer, therapist, ca] =
      await ethers.getSigners()
    const TrustVault =
      await ethers.getContractFactory('TrustVault')
    const vault = await TrustVault.deploy(owner.address)
    return { vault, owner, user, lawyer, therapist, ca }
  }

  describe('Document Registration', function () {
    it('Should register a document', async function () {
      const { vault, owner } =
        await loadFixture(deployTrustVaultFixture)

      const docId    = ethers.keccak256(ethers.toUtf8Bytes('doc1'))
      const caseId   = ethers.keccak256(ethers.toUtf8Bytes('case1'))
      const keyHash  = ethers.keccak256(ethers.toUtf8Bytes('key1'))
      const ipfsCid  = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
      const docType  = 'property_deed'

      await vault.registerDocument(
        docId, caseId, keyHash, ipfsCid, docType
      )

      const doc = await vault.documents(docId)
      expect(doc.ipfsCid).to.equal(ipfsCid)
      expect(doc.isActive).to.equal(true)
      expect(doc.caseId).to.equal(caseId)
    })

    it('Should prevent duplicate registration', async function () {
      const { vault } = await loadFixture(deployTrustVaultFixture)
      const docId   = ethers.keccak256(ethers.toUtf8Bytes('doc1'))
      const caseId  = ethers.keccak256(ethers.toUtf8Bytes('case1'))
      const keyHash = ethers.keccak256(ethers.toUtf8Bytes('key1'))

      await vault.registerDocument(
        docId, caseId, keyHash, 'cid1', 'petition'
      )

      await expect(
        vault.registerDocument(
          docId, caseId, keyHash, 'cid2', 'petition'
        )
      ).to.be.revertedWith('TrustVault: document already registered')
    })

    it('Should reject empty IPFS CID', async function () {
      const { vault } = await loadFixture(deployTrustVaultFixture)
      const docId   = ethers.keccak256(ethers.toUtf8Bytes('doc2'))
      const caseId  = ethers.keccak256(ethers.toUtf8Bytes('case1'))
      const keyHash = ethers.keccak256(ethers.toUtf8Bytes('key1'))

      await expect(
        vault.registerDocument(docId, caseId, keyHash, '', 'other')
      ).to.be.revertedWith('TrustVault: IPFS CID cannot be empty')
    })
  })

  describe('Access Control — 48h Expiry', function () {
    it('Should grant 48h access', async function () {
      const { vault, lawyer } =
        await loadFixture(deployTrustVaultFixture)

      const docId  = ethers.keccak256(ethers.toUtf8Bytes('doc1'))
      const caseId = ethers.keccak256(ethers.toUtf8Bytes('case1'))
      const keyHash = ethers.keccak256(ethers.toUtf8Bytes('k1'))

      await vault.registerDocument(
        docId, caseId, keyHash, 'cid1', 'petition'
      )
      await vault.grantAccess(docId, lawyer.address, 'lawyer')

      const hasAccess = await vault.hasValidAccess(
        docId, lawyer.address
      )
      expect(hasAccess).to.equal(true)
    })

    it('Should expire access after 48 hours', async function () {
      const { vault, lawyer } =
        await loadFixture(deployTrustVaultFixture)

      const docId  = ethers.keccak256(ethers.toUtf8Bytes('doc1'))
      const caseId = ethers.keccak256(ethers.toUtf8Bytes('case1'))
      const keyHash = ethers.keccak256(ethers.toUtf8Bytes('k1'))

      await vault.registerDocument(
        docId, caseId, keyHash, 'cid1', 'petition'
      )
      await vault.grantAccess(docId, lawyer.address, 'lawyer')

      // Advance time by 49 hours
      await time.increase(49 * 60 * 60)

      const hasAccess = await vault.hasValidAccess(
        docId, lawyer.address
      )
      expect(hasAccess).to.equal(false)
    })

    it('Should revoke access immediately', async function () {
      const { vault, lawyer } =
        await loadFixture(deployTrustVaultFixture)

      const docId  = ethers.keccak256(ethers.toUtf8Bytes('doc1'))
      const caseId = ethers.keccak256(ethers.toUtf8Bytes('case1'))
      const keyHash = ethers.keccak256(ethers.toUtf8Bytes('k1'))

      await vault.registerDocument(
        docId, caseId, keyHash, 'cid1', 'petition'
      )
      await vault.grantAccess(docId, lawyer.address, 'lawyer')
      await vault.revokeAccess(docId, lawyer.address)

      const hasAccess = await vault.hasValidAccess(
        docId, lawyer.address
      )
      expect(hasAccess).to.equal(false)
    })

    it('Should prevent non-owner from granting access',
    async function () {
      const { vault, user, lawyer } =
        await loadFixture(deployTrustVaultFixture)

      const docId  = ethers.keccak256(ethers.toUtf8Bytes('doc1'))
      const caseId = ethers.keccak256(ethers.toUtf8Bytes('case1'))
      const keyHash = ethers.keccak256(ethers.toUtf8Bytes('k1'))

      await vault.registerDocument(
        docId, caseId, keyHash, 'cid1', 'petition'
      )

      await expect(
        vault.connect(user).grantAccess(
          docId, lawyer.address, 'lawyer'
        )
      ).to.be.reverted
    })
  })

  describe('Access Log', function () {
    it('Should record access log on registration', async function () {
      const { vault } = await loadFixture(deployTrustVaultFixture)
      const docId   = ethers.keccak256(ethers.toUtf8Bytes('doc1'))
      const caseId  = ethers.keccak256(ethers.toUtf8Bytes('case1'))
      const keyHash = ethers.keccak256(ethers.toUtf8Bytes('k1'))

      await vault.registerDocument(
        docId, caseId, keyHash, 'cid1', 'petition'
      )

      const logLength = await vault.getAccessLogLength(docId)
      expect(logLength).to.equal(1n)

      const entry = await vault.getAccessLogEntry(docId, 0)
      expect(entry.action).to.equal('registered')
    })

    it('Should grow log on grant + revoke', async function () {
      const { vault, lawyer } =
        await loadFixture(deployTrustVaultFixture)
      const docId   = ethers.keccak256(ethers.toUtf8Bytes('doc1'))
      const caseId  = ethers.keccak256(ethers.toUtf8Bytes('case1'))
      const keyHash = ethers.keccak256(ethers.toUtf8Bytes('k1'))

      await vault.registerDocument(
        docId, caseId, keyHash, 'cid1', 'petition'
      )
      await vault.grantAccess(docId, lawyer.address, 'lawyer')
      await vault.revokeAccess(docId, lawyer.address)

      const logLength = await vault.getAccessLogLength(docId)
      expect(logLength).to.equal(3n)
      // registered + access_granted + access_revoked
    })
  })
})
