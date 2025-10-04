import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:9090/',
  // otras configuraciones globales aquí
})

// Cargar token si existe (sin importar el store) para primeras llamadas
try {
  const raw = localStorage.getItem('auth_v1')
  if (raw) {
    const { token } = JSON.parse(raw) || {}
    if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`
  }
} catch {
  // noop
}

// Interceptor de respuesta para capturar 401 y limpiar token
api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    if (error?.response?.status === 401) {
      try {
        const data = JSON.parse(localStorage.getItem('auth_v1') || '{}')
        if (data?.token) {
          // limpiar sesión básica
          localStorage.removeItem('auth_v1')
          delete api.defaults.headers.common.Authorization
        }
      } catch {
        // noop
      }
    }
    return Promise.reject(error)
  },
)

export default api
