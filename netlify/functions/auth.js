// POST /api/auth  { code }
// Đổi Lark OAuth code lấy user info

export default async (req, res) => {
  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST')    { res.status(405).json({ message: 'Method not allowed' }); return }

  const { code } = JSON.parse(req.body || '{}')
  if (!code) { res.status(400).json({ message: 'Missing code' }); return }

  // 1. Lấy app_access_token
  const tokenRes = await fetch('https://open.larksuite.com/open-apis/auth/v3/app_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id:     process.env.LARK_APP_ID,
      app_secret: process.env.LARK_APP_SECRET,
    }),
  })
  const tokenData = await tokenRes.json()
  if (tokenData.code !== 0) {
    res.status(500).json({ message: `App token error: ${tokenData.msg}` }); return
  }

  // 2. Đổi code lấy user_access_token
  const userRes = await fetch('https://open.larksuite.com/open-apis/authen/v1/oidc/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenData.app_access_token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ grant_type: 'authorization_code', code }),
  })
  const userData = await userRes.json()
  if (userData.code !== 0) {
    res.status(401).json({ message: `User token error: ${userData.msg}` }); return
  }

  // 3. Lấy user info
  const infoRes = await fetch('https://open.larksuite.com/open-apis/authen/v1/user_info', {
    headers: { 'Authorization': `Bearer ${userData.data.access_token}` },
  })
  const info = await infoRes.json()

  res.status(200).json({
    name:        info.data?.name || '',
    avatar:      info.data?.avatar_url || '',
    email:       info.data?.email || '',
    openId:      info.data?.open_id || '',
    accessToken: userData.data.access_token,
  })
}

export const config = { path: '/api/auth' }
