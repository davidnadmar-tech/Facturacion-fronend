import { defineStore } from 'pinia'
import api from '@/api/axiosConection'

// Clave de persistencia versionada
const LS_KEY = 'auth_v1'

// Endpoint ABSOLUTO (no duplicar axios.create): se usará URL completa
const AUTH_BASE_URL = 'http://localhost:5000/ApiFacturador/'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // objeto record del usuario
    token: null, // string JWT
    cargado: false,
    cargando: false,
  }),
  getters: {
    isAuthenticated: (s) => Boolean(s.token),
    nombre: (s) => (s.user?.name ? s.user.name : ''),
  },
  actions: {
    cargarLocal() {
      if (this.cargado) return
      try {
        const raw = localStorage.getItem(LS_KEY)
        if (raw) {
          const data = JSON.parse(raw)
          if (data && typeof data === 'object') {
            this.user = data.user || null
            this.token = data.token || null
          }
        }
        // Si hay token, configuro Authorization de axios
        if (this.token) {
          api.defaults.headers.common.Authorization = `Bearer ${this.token}`
        } else {
          delete api.defaults.headers.common.Authorization
        }
      } catch (e) {
        console.warn('No se pudo cargar auth local', e)
      } finally {
        this.cargado = true
      }
    },
    persistir() {
      try {
        const data = { user: this.user, token: this.token }
        localStorage.setItem(LS_KEY, JSON.stringify(data))
      } catch (e) {
        console.warn('No se pudo persistir auth', e)
      }
    },
    setSession({ user, token }) {
      this.user = user
      this.token = token
      // Setear header Authorization para siguientes requests
      if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`
      else delete api.defaults.headers.common.Authorization
      this.persistir()
      return { ok: true }
    },
    async login({ identity, password }) {
      this.cargarLocal()
      if (!identity || !password) return { ok: false, error: 'Credenciales incompletas' }
      this.cargando = true
      try {
        // El API espera este shape específico
        const payload = { vc: 'logintoken', identity, password }
        // Usamos URL absoluta, la instancia api respetará esto
        const { data } = await api.post(AUTH_BASE_URL, payload, {
          headers: { 'Content-Type': 'application/json' },
        })

        // Estructura esperada desde el backend provisto:
        // { Estado: 2, Mensaje: 'Exito', Contenido: '{"record":{...},"token":"..."}\n' }
        if (!data || data.Estado !== 2) {
          const msg = data?.Mensaje || 'No se pudo iniciar sesión'
          return { ok: false, error: msg }
        }

        // Contenido viene como string JSON; debemos parsearlo
        let contenido
        try {
          contenido = JSON.parse((data.Contenido || '').trim())
        } catch {
          return { ok: false, error: 'Respuesta inválida del servidor' }
        }
        const user = contenido?.record || null
        const token = contenido?.token || null
        if (!token || !user) return { ok: false, error: 'Token o usuario ausente' }

        this.setSession({ user, token })
        return { ok: true, user }
      } catch (err) {
        const msg = err?.response?.data?.Mensaje || err?.message || 'Error de red'
        return { ok: false, error: msg }
      } finally {
        this.cargando = false
      }
    },
    logout() {
      this.user = null
      this.token = null
      delete api.defaults.headers.common.Authorization
      try {
        localStorage.removeItem(LS_KEY)
      } catch (err) {
        console.warn('No se pudo limpiar auth local', err)
      }
      return { ok: true }
    },
    async signOut() {
      // Intenta invalidar token en backend, luego limpia local siempre
      this.cargarLocal()
      try {
        await api.post(
          AUTH_BASE_URL,
          { vc: 'logout' },
          {
            headers: { 'Content-Type': 'application/json' },
          },
        )
      } catch {
        // ignorar fallo de red; se procede a limpiar local
      }
      return this.logout()
    },
  },
})
