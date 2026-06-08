// Chạy: node test-lark.mjs
import { readFileSync } from 'fs'

// Load .env.local
const env = {}
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const [k, v] = line.split('=')
  if (k && v && !k.startsWith('#')) env[k.trim()] = v.trim()
})

const APP_ID     = env.LARK_APP_ID
const APP_SECRET = env.LARK_APP_SECRET
const BASE_ID    = env.LARK_BASE_ID
const TBL_RELEASES = env.LARK_TABLE_RELEASES
const TBL_APPS     = env.LARK_TABLE_APPS

console.log('App ID:', APP_ID)
console.log('Base ID:', BASE_ID)
console.log('')

// 1. Get token
console.log('--- Step 1: Auth ---')
const authRes = await fetch('https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
})
const authData = await authRes.json()
console.log('code:', authData.code, '| msg:', authData.msg)
if (authData.code !== 0) { console.error('Auth failed!'); process.exit(1) }

const token = authData.tenant_access_token
console.log('Token OK:', token.slice(0, 20) + '...')

const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

// 2. Fetch releases
console.log('\n--- Step 2: Releases ---')
const relRes = await fetch(
  `https://open.larksuite.com/open-apis/bitable/v1/apps/${BASE_ID}/tables/${TBL_RELEASES}/records?page_size=5`,
  { headers }
)
const relData = await relRes.json()
console.log('code:', relData.code, '| msg:', relData.msg)
if (relData.code === 0) {
  console.log('Records:', relData.data?.items?.length ?? 0)
  if (relData.data?.items?.[0]) {
    console.log('Sample fields:', JSON.stringify(relData.data.items[0].fields, null, 2))
  }
} else {
  console.error('Error:', JSON.stringify(relData))
}

// 3. Fetch apps
console.log('\n--- Step 3: Apps ---')
const appsRes = await fetch(
  `https://open.larksuite.com/open-apis/bitable/v1/apps/${BASE_ID}/tables/${TBL_APPS}/records?page_size=5`,
  { headers }
)
const appsData = await appsRes.json()
console.log('code:', appsData.code, '| msg:', appsData.msg)
if (appsData.code === 0) {
  console.log('Records:', appsData.data?.items?.length ?? 0)
  if (appsData.data?.items?.[0]) {
    console.log('Sample fields:', JSON.stringify(appsData.data.items[0].fields, null, 2))
  }
} else {
  console.error('Error:', JSON.stringify(appsData))
}
