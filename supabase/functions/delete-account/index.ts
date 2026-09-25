// Deletes the calling user's account. Everything they own (profile, synced
// routines and sessions, room memberships, set logs) goes with it through the
// `on delete cascade` foreign keys.
//
// Deploy: supabase functions deploy delete-account
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const authorization = req.headers.get('Authorization')
  if (!authorization) return json({ error: 'not_authenticated' }, 401)

  const url = Deno.env.get('SUPABASE_URL')!
  // Projects on the new API keys: set a `SERVICE_KEY` secret to the `sb_secret_…` key
  // (`npx supabase secrets set SERVICE_KEY=…`) if the legacy service-role key isn't available.
  const serviceKey = Deno.env.get('SERVICE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!serviceKey) return json({ error: 'server_misconfigured' }, 500)

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Verify the caller from their own access token — never trust a user id from the body.
  const token = authorization.replace(/^Bearer\s+/i, '')
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return json({ error: 'not_authenticated' }, 401)

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id)
  if (deleteError) return json({ error: deleteError.message }, 500)

  return json({ deleted: true })
})
