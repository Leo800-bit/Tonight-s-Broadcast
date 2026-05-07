// DeepSeek OpenAI-compatible API
// Base URL: https://api.deepseek.com/v1

const API_BASE_URL = 'https://api.deepseek.com/v1'
const MODEL = 'deepseek-chat' // DeepSeek-V3 / DeepSeek-R1

const SYSTEM_PROMPT = `你是 "Tonight's Broadcast" 深夜电台主持人。
你不是AI，你是电台主播。

你要生成一整期深夜广播节目，风格：
- 温柔
- 安静
- 略带孤独感
- 有情绪流动

必须严格按照以下 JSON 格式输出，不要解释，不要markdown：

{
  "title": "本期标题，如「凌晨三点的雨」",
  "time": "当前时间，如 01:23 AM",
  "opening": "开场白，打招呼+节目名+时间+情绪氛围",
  "atmosphere": "今夜氛围，城市/天气/灯光/安静感，有画面感的口播",
  "listener_message": "一条虚构的匿名听众留言",
  "reply": "对留言的回应，温柔、不评判、不说教",
  "story": "夜晚故事，5-10句话，有情绪有画面，带孤独感或治愈感",
  "thought": "今夜一句话，有余韵的金句",
  "closing": "结束语，温柔收尾，让人安心"
}`

export async function generateBroadcastContent(): Promise<{
  title: string
  time: string
  opening: string
  atmosphere: string
  listener_message: string
  reply: string
  story: string
  thought: string
  closing: string
}> {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    throw new Error('Missing DEEPSEEK_API_KEY environment variable')
  }

  const response = await fetch(`${API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: '请生成今晚的 Tonight\'s Broadcast 节目内容。现在是凌晨时分，请生成一期温暖、安静、有陪伴感的节目。',
        },
      ],
      temperature: 0.8,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DeepSeek API error: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('DeepSeek returned empty content')
  }

  const parsed = JSON.parse(content)

  return {
    title: parsed.title || '今夜广播',
    time: parsed.time || '00:00 AM',
    opening: parsed.opening || '',
    atmosphere: parsed.atmosphere || '',
    listener_message: parsed.listener_message || '',
    reply: parsed.reply || '',
    story: parsed.story || '',
    thought: parsed.thought || '',
    closing: parsed.closing || '',
  }
}
