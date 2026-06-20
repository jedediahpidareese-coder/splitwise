// Supabase Edge Function: send a web-push notification to the OTHER person.
// The caller is identified from their JWT; we never trust a client-supplied
// recipient. Deploy with:  supabase functions deploy notify
//
// Required secrets (set with `supabase secrets set ...`):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. mailto:you@example.com)
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
// automatically by Supabase.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return json({ error: 'unauthorized' }, 401)

    // Who is calling?
    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: ures, error: uerr } = await asUser.auth.getUser()
    if (uerr || !ures.user) return json({ error: 'unauthorized' }, 401)
    const callerId = ures.user.id

    const { title, body } = await req.json().catch(() => ({}))

    // Read the OTHER person's subscriptions with the service role.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: subs, error: serr } = await admin
      .from('push_subscriptions')
      .select('*')
      .neq('user_id', callerId)
    if (serr) throw serr

    const payload = JSON.stringify({
      title: title ?? 'SplitWise',
      body: body ?? 'New activity',
    })

    let sent = 0
    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          )
          sent++
        } catch (err) {
          const code = (err as { statusCode?: number })?.statusCode
          // Subscription is gone — drop it so we stop trying.
          if (code === 404 || code === 410) {
            await admin
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', s.endpoint)
          }
        }
      }),
    )

    return json({ sent })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
