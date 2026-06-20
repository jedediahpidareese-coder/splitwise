// Supabase Edge Function: send a web-push notification to the OTHER person.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'

function detail(e: unknown) {
  if (e instanceof Error) return e.message
  try {
    return JSON.stringify(e)
  } catch {
    return String(e)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return json({ stage: 'auth', error: 'missing Authorization' }, 401)

    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: ures, error: uerr } = await asUser.auth.getUser()
    if (uerr || !ures.user) return json({ stage: 'auth', error: detail(uerr) }, 401)
    const callerId = ures.user.id

    const { title, body } = await req.json().catch(() => ({}))

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: subs, error: serr } = await admin
      .from('push_subscriptions')
      .select('*')
      .neq('user_id', callerId)
    if (serr) {
      return json(
        { stage: 'read_subs', error: detail(serr), serviceRolePresent: SERVICE_ROLE.length > 0 },
        500,
      )
    }

    // Configure VAPID (report if this throws).
    try {
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
    } catch (e) {
      return json(
        {
          stage: 'vapid',
          error: detail(e),
          haveVapidPublic: VAPID_PUBLIC.length > 0,
          haveVapidPrivate: VAPID_PRIVATE.length > 0,
        },
        500,
      )
    }

    const payload = JSON.stringify({
      title: title ?? 'SplitWise',
      body: body ?? 'New activity',
    })

    const results: Array<{ ok: boolean; status?: number; error?: string }> = []
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        )
        results.push({ ok: true })
      } catch (e) {
        const status = (e as { statusCode?: number })?.statusCode
        results.push({ ok: false, status, error: detail(e) })
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
        }
      }
    }

    return json({
      total: (subs ?? []).length,
      sent: results.filter((r) => r.ok).length,
      results,
    })
  } catch (err) {
    return json({ stage: 'top', error: detail(err) }, 500)
  }
})
