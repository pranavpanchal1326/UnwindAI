// app/api/settings/checkin/route.js
// Records user check-in both in Supabase and on-chain
// Supabase: update last_active_at
// Blockchain: call DeadManSwitch.checkIn (via server wallet)

import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/db/client'

export async function POST(request) {
  try {
    if (process.env.DEMO_MODE === 'true') {
      const body = await request.json();
      return NextResponse.json({
        success: true,
        checked_in_at: new Date().toISOString(),
        case_id: body.case_id,
        blockchain_recorded: false,
        previous_status: 'active'
      })
    }

    const { case_id } = await request.json()

    if (!case_id) {
      return NextResponse.json(
        { error: 'case_id required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    // Update last_active_at in users table
    const { data: caseRecord } = await supabase
      .from('cases')
      .select('user_id, status')
      .eq('id', case_id)
      .single()

    if (!caseRecord) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      )
    }

    // Update user last_active_at
    await supabase
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', caseRecord.user_id)

    // Unfreeze case if it was frozen
    if (caseRecord.status === 'frozen' ||
        caseRecord.status === 'paused') {
      await supabase
        .from('cases')
        .update({ status: 'active' })
        .eq('id', case_id)

      // Reactivate blocked tasks
      if (caseRecord.status === 'paused') {
        await supabase
          .from('tasks')
          .update({ status: 'pending' })
          .eq('case_id', case_id)
          .eq('status', 'blocked')
      }
    }

    // Attempt on-chain check-in (non-fatal if fails)
    // Server wallet calls checkIn on behalf of user
    let blockchainCheckedIn = false
    try {
      blockchainCheckedIn = await recordBlockchainCheckIn(case_id)
    } catch (blockchainErr) {
      console.warn(
        '[CheckIn] Blockchain check-in failed (non-fatal):',
        blockchainErr.message
      )
    }

    return NextResponse.json({
      success:             true,
      checked_in_at:       new Date().toISOString(),
      case_id,
      blockchain_recorded: blockchainCheckedIn,
      previous_status:     caseRecord.status
    })

  } catch (err) {
    console.error('[CheckIn] Error:', err.message)
    return NextResponse.json(
      { error: 'Check-in failed. Please try again.' },
      { status: 500 }
    )
  }
}

async function recordBlockchainCheckIn(caseId) {
  // Server-side ethers.js call to DeadManSwitch.checkIn()
  // Uses WALLET_PRIVATE_KEY from env

  if (!process.env.WALLET_PRIVATE_KEY ||
      !process.env.POLYGON_RPC_URL) {
    return false
  }

  try {
    const deployments = await import(
      '@/lib/web3/deployments.json',
      { with: { type: 'json' } }
    )
    const dmsAddress = deployments.default?.contracts?.DeadManSwitch

    if (!dmsAddress) return false

    const { ethers } = await import('ethers')

    const provider = new ethers.JsonRpcProvider(
      process.env.POLYGON_RPC_URL
    )
    const wallet = new ethers.Wallet(
      process.env.WALLET_PRIVATE_KEY,
      provider
    )

    const dmsAbi = [
      'function checkIn(bytes32 caseId) external'
    ]
    const contract = new ethers.Contract(
      dmsAddress,
      dmsAbi,
      wallet
    )

    const caseIdBytes32 = ethers.keccak256(
      ethers.toUtf8Bytes(caseId)
    )

    const tx = await contract.checkIn(caseIdBytes32)
    await tx.wait(1)
    // Wait for 1 confirmation

    console.log(
      `[CheckIn] Blockchain check-in confirmed: ${tx.hash}`
    )
    return true

  } catch (err) {
    console.error('[CheckIn] ethers call failed:', err.message)
    return false
  }
}
