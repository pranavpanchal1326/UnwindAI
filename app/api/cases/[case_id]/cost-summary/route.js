// app/api/cases/[case_id]/cost-summary/route.js

import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/db/client'

export async function GET(request, { params }) {
  try {
    const supabase = createSupabaseAdminClient()

    // Load all completed tasks with actual costs
    const { data: tasks } = await supabase
      .from('tasks')
      .select(`
        actual_cost_inr, predicted_cost_inr,
        status, phase,
        professionals!inner(role)
      `)
      .eq('case_id', params.case_id)
      .not('actual_cost_inr', 'is', null)

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        total_actual:    0,
        total_predicted: 0,
        by_role:         {},
        by_phase:        {},
        task_count:      0
      })
    }

    const totalActual = tasks.reduce(
      (sum, t) => sum + (t.actual_cost_inr || 0), 0
    )
    const totalPredicted = tasks.reduce(
      (sum, t) => sum + (t.predicted_cost_inr || 0), 0
    )

    // Group by role
    const byRole = {}
    tasks.forEach(t => {
      const role = t.professionals?.role || 'other'
      byRole[role] = (byRole[role] || 0) +
        (t.actual_cost_inr || 0)
    })

    // Group by phase
    const byPhase = {}
    tasks.forEach(t => {
      const phase = t.phase || 'unknown'
      byPhase[phase] = (byPhase[phase] || 0) +
        (t.actual_cost_inr || 0)
    })

    return NextResponse.json({
      total_actual:    totalActual,
      total_predicted: totalPredicted,
      by_role:         byRole,
      by_phase:        byPhase,
      task_count:      tasks.length
    })

  } catch (err) {
    console.error('[Cost Summary] Error:', err.message)
    return NextResponse.json(
      { error: 'Cost summary unavailable.' },
      { status: 500 }
    )
  }
}
