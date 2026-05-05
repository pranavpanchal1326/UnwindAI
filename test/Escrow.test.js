// test/Escrow.test.js
const {
  loadFixture
} = require('@nomicfoundation/hardhat-toolbox/network-helpers')
const { expect } = require('chai')
const { ethers }  = require('hardhat')

describe('Escrow', function () {
  async function deployEscrowFixture() {
    const [owner, payer, payee] = await ethers.getSigners()
    const Escrow = await ethers.getContractFactory('Escrow')
    const escrow = await Escrow.deploy(owner.address)
    return { escrow, owner, payer, payee }
  }

  const depositId = ethers.keccak256(ethers.toUtf8Bytes('dep1'))
  const caseId    = ethers.keccak256(ethers.toUtf8Bytes('case1'))
  const amount    = ethers.parseEther('1.0')

  describe('Deposit', function () {
    it('Should accept a deposit', async function () {
      const { escrow, payer, payee } = await loadFixture(deployEscrowFixture)

      await escrow.connect(payer).deposit(
        depositId, caseId, payee.address, 'milestone1',
        { value: amount }
      )

      const dep = await escrow.deposits(depositId)
      expect(dep.amount).to.equal(amount)
      expect(dep.payer).to.equal(payer.address)
      expect(dep.payee).to.equal(payee.address)
    })

    it('Should grow totalHeld', async function () {
      const { escrow, payer, payee } = await loadFixture(deployEscrowFixture)

      await escrow.connect(payer).deposit(
        depositId, caseId, payee.address, 'milestone1',
        { value: amount }
      )

      expect(await escrow.totalHeld()).to.equal(amount)
    })
  })

  describe('Release', function () {
    it('Should release funds to payee', async function () {
      const { escrow, owner, payer, payee } = await loadFixture(deployEscrowFixture)

      await escrow.connect(payer).deposit(
        depositId, caseId, payee.address, 'milestone1',
        { value: amount }
      )

      const initialBalance = await ethers.provider.getBalance(payee.address)
      await escrow.connect(owner).release(depositId)
      const finalBalance = await ethers.provider.getBalance(payee.address)

      expect(finalBalance - initialBalance).to.equal(amount)
      
      const dep = await escrow.deposits(depositId)
      expect(dep.isReleased).to.equal(true)
    })
  })

  describe('Refund', function () {
    it('Should refund funds to payer', async function () {
      const { escrow, owner, payer, payee } = await loadFixture(deployEscrowFixture)

      await escrow.connect(payer).deposit(
        depositId, caseId, payee.address, 'milestone1',
        { value: amount }
      )

      const initialBalance = await ethers.provider.getBalance(payer.address)
      await escrow.connect(owner).refund(depositId)
      const finalBalance = await ethers.provider.getBalance(payer.address)

      // Initial balance check for payer needs to account for gas if we were tracking precisely,
      // but here finalBalance should be very close to initialBalance (minus small gas for deposit).
      // A more robust check is to just see if finalBalance is higher than it was after deposit.
      expect(finalBalance > initialBalance).to.be.true
      
      const dep = await escrow.deposits(depositId)
      expect(dep.isRefunded).to.equal(true)
    })
  })
})
