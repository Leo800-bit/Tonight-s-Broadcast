import { NextResponse } from 'next/server'
import { generateBroadcastContent } from '@/lib/openai'
import { getServiceSupabase } from '@/lib/supabase'

export async function POST() {
  try {
    // 1. 调用 DeepSeek (OpenAI-compatible) 生成广播内容
    const content = await generateBroadcastContent()

    // 2. 获取今天日期
    const today = new Date().toISOString().split('T')[0]

    // 3. 保存到 Supabase
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('broadcasts')
      .upsert(
        {
          date: today,
          title: content.title,
          opening: content.opening,
          atmosphere: content.atmosphere,
          listener_message: content.listener_message,
          reply: content.reply,
          story: content.story,
          thought: content.thought,
          closing: content.closing,
        },
        { onConflict: 'date' }
      )
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to save broadcast' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data,
    })
  } catch (error) {
    console.error('Generate broadcast error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
