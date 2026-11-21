// This guard is not an upload endpoint. Uploads remain disabled until persistent
// quotas, cleanup and provider-backed integration have been verified.
export async function authorizeDevelopmentUpload(request, env, getUser) {
  const isDev = env.NODE_ENV === 'development'
  const isPrivateTesting = env.SET2GO_PRIVATE_TESTING === 'enabled'
  if ((!isDev && !isPrivateTesting) || env.SET2GO_DEV_CLOUD_UPLOAD !== 'enabled') return null
  const configured = env.SET2GO_DEV_CLOUD_ORIGIN
  const allowlisted = env.SET2GO_DEV_CLOUD_USER_ID
  if (!configured || !allowlisted || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(allowlisted)) return null
  let origin
  try { origin = new URL(configured) } catch { return null }
  const isLocalOrigin = isDev && origin.origin === configured && origin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
  const isProdOrigin = isPrivateTesting && origin.origin === configured && origin.protocol === 'https:' && origin.hostname === 'djhq.app'
  if (!isLocalOrigin && !isProdOrigin) return null
  if (request.headers.get('origin') !== configured) return null
  let requestUrl
  try { requestUrl = new URL(request.url) } catch { return null }
  if (requestUrl.origin !== configured) return null
  const user = await getUser()
  return user?.id === allowlisted ? user.id : null
}
