import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

interface NotificationRow {
  id: string
  user_id: string
  type: string
  payload: {
    title?: string
    body?: string
    event_id?: string
  } | null
}

Deno.serve(async (req) => {
  try {
    const body = await req.json()

    // Supabase Webhook payload: { type, table, record, ... }
    const record: NotificationRow = body.record ?? body

    if (!record?.user_id) {
      return new Response('Missing user_id', { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Kullanıcının push token'ını al
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', record.user_id)
      .single()

    if (error || !profile?.expo_push_token) {
      // Token yok — push gönderilmez, hata değil
      return new Response('No push token', { status: 200 })
    }

    const token = profile.expo_push_token
    const title = record.payload?.title ?? 'Paltivity'
    const bodyText = record.payload?.body ?? ''
    const eventId = record.payload?.event_id ?? null

    // Bildirim tipine göre navigasyon hedefi
    let screen: string | null = null
    if (record.type === 'chat_message' && eventId) {
      screen = `/chat/${eventId}`
    } else if (record.type === 'event_kicked') {
      screen = null
    } else if (eventId) {
      screen = `/event/${eventId}`
    }

    const message = {
      to: token,
      sound: 'default',
      title,
      body: bodyText,
      data: {
        type: record.type,
        event_id: eventId,
        screen,
      },
    }

    const pushRes = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    const pushData = await pushRes.json()

    return new Response(JSON.stringify(pushData), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(String(err), { status: 500 })
  }
})
