import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useClientesStore } from '../clientes'

// Mock localStorage sencillo
const memoryStore = {}
const localStorageMock = {
  getItem: (k) => (k in memoryStore ? memoryStore[k] : null),
  setItem: (k, v) => {
    memoryStore[k] = v
  },
  removeItem: (k) => {
    delete memoryStore[k]
  },
}
// Asignar mock
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('store clientes', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    for (const k of Object.keys(memoryStore)) delete memoryStore[k]
  })

  it('agrega un cliente válido', () => {
    const s = useClientesStore()
    const r = s.agregar({ nombre: 'Cliente A', nit: '0614-290112-101-1' })
    expect(r.ok).toBe(true)
    expect(s.total).toBe(1)
    expect(s.lista[0].codigo).toMatch(/^C0+\d/) // formato
  })

  it('rechaza NIT duplicado', () => {
    const s = useClientesStore()
    s.agregar({ nombre: 'Cliente A', nit: '0614-290112-101-1' })
    const r = s.agregar({ nombre: 'Otro', nit: '0614-290112-101-1' })
    expect(r.ok).toBe(false)
    expect(r.errores.nit).toBeDefined()
  })

  it('actualiza un cliente existente', () => {
    const s = useClientesStore()
    const r1 = s.agregar({ nombre: 'Cliente A', nit: '0614-290112-101-1' })
    const codigo = r1.item.codigo
    const r2 = s.actualizar(codigo, { nombre: 'Cliente A Editado' })
    expect(r2.ok).toBe(true)
    expect(s.lista[0].nombre).toBe('Cliente A Editado')
  })

  it('valida nombre requerido', () => {
    const s = useClientesStore()
    const r = s.agregar({ nombre: '  ' })
    expect(r.ok).toBe(false)
    expect(r.errores.nombre).toBeDefined()
  })

  it('valida email inválido', () => {
    const s = useClientesStore()
    const r = s.agregar({ nombre: 'X', email: 'correo@mal' })
    expect(r.ok).toBe(false)
    expect(r.errores.email).toBeDefined()
  })
})
