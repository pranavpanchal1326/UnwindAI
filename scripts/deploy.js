// scripts/deploy.js
const { ethers } = require('hardhat')

async function main() {
  console.log('Deploying UnwindAI contracts to Polygon Amoy...')

  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  const balance = await ethers.provider.getBalance(
    deployer.address
  )
  console.log(
    `Balance: ${ethers.formatEther(balance)} MATIC`
  )

  // Deploy TrustVault
  const TrustVault = await ethers.getContractFactory('TrustVault')
  const trustVault = await TrustVault.deploy(deployer.address)
  await trustVault.waitForDeployment()
  const tvAddress = await trustVault.getAddress()
  console.log(`✅ TrustVault deployed: ${tvAddress}`)

  // Deploy ProofTimeline
  const ProofTimeline =
    await ethers.getContractFactory('ProofTimeline')
  const proofTimeline = await ProofTimeline.deploy(deployer.address)
  await proofTimeline.waitForDeployment()
  const ptAddress = await proofTimeline.getAddress()
  console.log(`✅ ProofTimeline deployed: ${ptAddress}`)

  // Deploy Escrow
  const Escrow = await ethers.getContractFactory('Escrow')
  const escrow = await Escrow.deploy(deployer.address)
  await escrow.waitForDeployment()
  const escrowAddress = await escrow.getAddress()
  console.log(`✅ Escrow deployed: ${escrowAddress}`)

  // Deploy DeadManSwitch
  const DeadManSwitch =
    await ethers.getContractFactory('DeadManSwitch')
  const dms = await DeadManSwitch.deploy(deployer.address)
  await dms.waitForDeployment()
  const dmsAddress = await dms.getAddress()
  console.log(`✅ DeadManSwitch deployed: ${dmsAddress}`)

  // Save deployment addresses
  const deployments = {
    network:        'polygon-amoy',
    chainId:        80002,
    deployedAt:     new Date().toISOString(),
    deployer:       deployer.address,
    contracts: {
      TrustVault:    tvAddress,
      ProofTimeline: ptAddress,
      Escrow:        escrowAddress,
      DeadManSwitch: dmsAddress
    }
  }

  const { writeFileSync, existsSync, mkdirSync } = require('fs')
  if (!existsSync('lib/web3')) {
    mkdirSync('lib/web3', { recursive: true })
  }
  
  writeFileSync(
    'lib/web3/deployments.json',
    JSON.stringify(deployments, null, 2)
  )

  console.log('\n═══════════════════════════════════════')
  console.log('All 4 contracts deployed to Polygon Amoy')
  console.log('Deployment saved to lib/web3/deployments.json')
  console.log('═══════════════════════════════════════')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
