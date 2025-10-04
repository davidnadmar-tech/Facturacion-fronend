import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock de localStorage en memoria
const memory = {}
const ls = {
  getItem: (k) => (k in memory ? memory[k] : null),
  setItem: (k, v) => (memory[k] = v),
  removeItem: (k) => delete memory[k],
}
Object.defineProperty(globalThis, 'localStorage', { value: ls })

// Mock del api de axios conectado
const postMock = vi.fn()
const apiMock = {
  post: postMock,
  defaults: { headers: { common: {} } },
}
vi.mock('@/api/axiosConection', () => ({ default: apiMock }))

// Importar después del mock
import { useAuthStore } from '../auth'

describe('store auth', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // limpiar memoria
    Object.keys(memory).forEach((k) => delete memory[k])
    postMock.mockReset()
    apiMock.defaults.headers.common = {}
  })

  it('setSession y logout persisten y limpian correctamente', () => {
    const s = useAuthStore()
    const user = { id: 'u1', name: 'Demo' }
    const token = 'tkn-123'
    const r1 = s.setSession({ user, token })
    expect(r1.ok).toBe(true)
    expect(s.isAuthenticated).toBe(true)
    expect(JSON.parse(localStorage.getItem('auth_v1'))).toEqual({ user, token })
    expect(apiMock.defaults.headers.common.Authorization).toBe(`Bearer ${token}`)

    const r2 = s.logout()
    expect(r2.ok).toBe(true)
    expect(s.isAuthenticated).toBe(false)
    expect(localStorage.getItem('auth_v1')).toBeUndefined()
    expect(apiMock.defaults.headers.common.Authorization).toBeUndefined()
  })

  it('login exitoso parsea Contenido y establece sesión', async () => {
    const s = useAuthStore()
    const contenido = { record: { id: '5wp', name: 'prueba' }, token: 'jwt-xyz' }
    postMock.mockResolvedValueOnce({
      data: { Estado: 2, Mensaje: 'Exito', Contenido: JSON.stringify(contenido) + '\n' },
    })
    const r = await s.login({ identity: 'a@b.es', password: '123' })
    expect(r.ok).toBe(true)
    expect(s.token).toBe('jwt-xyz')
    expect(s.user?.id).toBe('5wp')
  })

  it('login falla si Contenido es inválido', async () => {
    const s = useAuthStore()
    postMock.mockResolvedValueOnce({
      data: { Estado: 2, Mensaje: 'Exito', Contenido: 'not-json' },
    })
    const r = await s.login({ identity: 'a@b.es', password: '123' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/inválida|invalida/i)
  })

  it('login maneja error de red', async () => {
    const s = useAuthStore()
    postMock.mockRejectedValueOnce(new Error('Network Error'))
    const r = await s.login({ identity: 'a@b.es', password: '123' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/error/i)
  })
})
