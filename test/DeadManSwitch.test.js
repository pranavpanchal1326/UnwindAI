// test/DeadManSwitch.test.js
const {
  loadFixture,
  time
} = require('@nomicfoundation/hardhat-toolbox/network-helpers')
const { expect } = require('chai')
const { ethers }  = require('hardhat')

describe('DeadManSwitch', function () {
  async function deployDMSFixture() {
    const [owner, user] = await ethers.getSigners()
    const DMS = await ethers.getContractFactory('DeadManSwitch')
    const dms = await DMS.deploy(owner.address)
    return { dms, owner, user }
  }

  const caseId = ethers.keccak256(ethers.toUtf8Bytes('case1'))

  describe('Registration + Check-in', function () {
    it('Should register a case', async function () {
      const { dms, user } = await loadFixture(deployDMSFixture)

      await dms.registerCase(caseId, user.address)
      const status = await dms.getCaseStatus(caseId)
      expect(status.isFrozen).to.equal(false)
      expect(status.phase).to.equal('active')
    })

    it('Should prevent duplicate registration', async function () {
      const { dms, user } = await loadFixture(deployDMSFixture)

      await dms.registerCase(caseId, user.address)
      await expect(
        dms.registerCase(caseId, user.address)
      ).to.be.revertedWith('DMS: case already registered')
    })

    it('Should reset timer on check-in', async function () {
      const { dms, user } = await loadFixture(deployDMSFixture)

      await dms.registerCase(caseId, user.address)
      await time.increase(10 * 24 * 60 * 60) // 10 days
      await dms.connect(user).checkIn(caseId)

      const days = await dms.getDaysSinceCheckIn(caseId)
      expect(days).to.equal(0n)
    })
  })

  describe('GAP-06 Thresholds', function () {
    it('Should show warning phase at 7 days', async function () {
      const { dms, user } = await loadFixture(deployDMSFixture)

      await dms.registerCase(caseId, user.address)
      await time.increase(8 * 24 * 60 * 60) // 8 days

      const status = await dms.getCaseStatus(caseId)
      expect(status.phase).to.equal('warning')
    })

    it('Should show paused phase at 21 days', async function () {
      const { dms, user } = await loadFixture(deployDMSFixture)

      await dms.registerCase(caseId, user.address)
      await time.increase(22 * 24 * 60 * 60) // 22 days

      const status = await dms.getCaseStatus(caseId)
      expect(status.phase).to.equal('paused')
    })

    it('Should freeze after 45 days', async function () {
      const { dms, user } = await loadFixture(deployDMSFixture)

      await dms.registerCase(caseId, user.address)
      await time.increase(46 * 24 * 60 * 60) // 46 days

      await dms.freezeCase(caseId)

      const frozen = await dms.isCaseFrozen(caseId)
      expect(frozen).to.equal(true)
    })

    it('Should reject freeze before 45 days', async function () {
      const { dms, user } = await loadFixture(deployDMSFixture)

      await dms.registerCase(caseId, user.address)
      await time.increase(30 * 24 * 60 * 60) // 30 days

      await expect(
        dms.freezeCase(caseId)
      ).to.be.revertedWith('DMS: 45 day threshold not reached')
    })

    it('Should unfreeze on check-in', async function () {
      const { dms, user } = await loadFixture(deployDMSFixture)

      await dms.registerCase(caseId, user.address)
      await time.increase(46 * 24 * 60 * 60)
      await dms.freezeCase(caseId)

      expect(await dms.isCaseFrozen(caseId)).to.equal(true)

      await dms.connect(user).checkIn(caseId)
      expect(await dms.isCaseFrozen(caseId)).to.equal(false)
    })
  })
})
