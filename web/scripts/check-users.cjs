const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envRaw = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8')
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)

const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

s.auth.admin.listUsers().then(({ data, error }) => {
  if (error) { console.error('Error:', error); return }
  data?.users?.forEach(u => console.log(u.email))
  console.log('Total:', data?.users?.length || 0)
})
