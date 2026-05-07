import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]

    // 1. 尝试从 Supabase 获取今天的广播
    const { data, error } = await supabase
      .from('broadcasts')
      .select('*')
      .eq('date', today)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = 没有找到记录
      console.error('Supabase query error:', error)
      return NextResponse.json(
        { success: false, error: 'Database query failed' },
        { status: 500 }
      )
    }

    if (data) {
      // 已有今天的广播，直接返回
      return NextResponse.json({
        success: true,
        hasBroadcast: true,
        data,
      })
    }

    // 2. 没有今天的广播，返回提示
    return NextResponse.json({
      success: true,
      hasBroadcast: false,
      data: null,
      message: 'No broadcast for today yet. Please generate one.',
    })
  } catch (error) {
    console.error('Get today broadcast error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
