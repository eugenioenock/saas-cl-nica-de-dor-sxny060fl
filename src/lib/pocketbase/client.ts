import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

pb.beforeSend = function (url, options) {
  const isCUD = options.method === 'POST' || options.method === 'PATCH' || options.method === 'PUT'
  const isApiCollection = url.includes('/api/collections/') && !url.includes('auth')

  if (isCUD && isApiCollection) {
    const clinicId = pb.authStore.record?.clinic_id
    if (clinicId) {
      if (options.body && typeof options.body === 'string') {
        try {
          const body = JSON.parse(options.body)
          if (!body.clinic_id) {
            body.clinic_id = clinicId
            options.body = JSON.stringify(body)
          }
        } catch (e) {
          // Ignore parse errors
        }
      } else if (options.body instanceof FormData) {
        if (!options.body.has('clinic_id')) {
          options.body.append('clinic_id', clinicId)
        }
      }
    }
  }
  return { url, options }
}

export default pb
