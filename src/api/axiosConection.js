import axios from 'axios'

export const API_GATEWAY_URL = 'http://localhost:5007/ApiFacturador/'

const api = axios.create({
  baseURL: API_GATEWAY_URL,
  // otras configuraciones globales aquí
})

// Función de utilidad para validar respuestas exitosas de la API
export function isSuccessResponse(data) {
  // Estados exitosos según la API:
  // 1 = "Proceso ejecutado correctamente"
  // 2 = "Exito"
  return data && (data.Estado === 1 || data.Estado === 2)
}

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
