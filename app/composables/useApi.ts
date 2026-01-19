import type { UseFetchOptions } from 'nuxt/app'

export function useApi() {
  const authStore = useAuthStore()

  const apiFetch = async <T>(
    url: string,
    options: UseFetchOptions<T> = {}
  ) => {
    const headers: Record<string, string> = {}

    // Add auth header if available
    const token = await authStore.getIdToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return useFetch<T>(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    })
  }

  const apiPost = async <T>(
    url: string,
    body: any,
    options: UseFetchOptions<T> = {}
  ) => {
    return apiFetch<T>(url, {
      method: 'POST',
      body,
      ...options
    })
  }

  const apiPatch = async <T>(
    url: string,
    body: any,
    options: UseFetchOptions<T> = {}
  ) => {
    return apiFetch<T>(url, {
      method: 'PATCH',
      body,
      ...options
    })
  }

  const apiDelete = async <T>(
    url: string,
    options: UseFetchOptions<T> = {}
  ) => {
    return apiFetch<T>(url, {
      method: 'DELETE',
      ...options
    })
  }

  return {
    apiFetch,
    apiPost,
    apiPatch,
    apiDelete
  }
}
