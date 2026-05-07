export interface Broadcast {
  id?: string
  date: string
  title: string
  opening: string
  atmosphere: string
  listener_message: string
  reply: string
  story: string
  thought: string
  closing: string
  created_at?: string
}

export interface ListenerMessage {
  id?: string
  content: string
  created_at?: string
}

export interface GenerateBroadcastResponse {
  success: boolean
  data?: Broadcast
  error?: string
}

export interface SubmitMessageResponse {
  success: boolean
  error?: string
}
