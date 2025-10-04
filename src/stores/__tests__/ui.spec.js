import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useUiStore } from '../ui'

// Mock localStorage sencillo
const mem = {}
const lsMock = {
  getItem: vi.fn((k) => (k in mem ? mem[k] : null)),
  setItem: vi.fn((k, v) => {
    mem[k] = String(v)
  }),
  removeItem: vi.fn((k) => {
    delete mem[k]
  }),
  clear: vi.fn(() => {
    Object.keys(mem).forEach((k) => delete mem[k])
  }),
}

Object.defineProperty(window, 'localStorage', { value: lsMock })

describe('ui store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    lsMock.clear()
    lsMock.getItem.mockClear()
    lsMock.setItem.mockClear()
  })

  it('carga valores por defecto', () => {
    const ui = useUiStore()
    expect(ui.particlesEnabled).toBe(true)
    expect(ui.particleLines).toBe(true)
    expect(ui.particleMode).toBe('normal')
  })

  it('persiste cambios en toggleParticles', () => {
    const ui = useUiStore()
    ui.toggleParticles()
    expect(ui.particlesEnabled).toBe(false)
    expect(lsMock.setItem).toHaveBeenCalled()
  })

  it('cambia modo válido y persiste', () => {
    const ui = useUiStore()
    const r = ui.setMode('ultra')
    expect(r.ok).toBe(true)
    expect(ui.particleMode).toBe('ultra')
  })

  it('rechaza modo inválido', () => {
    const ui = useUiStore()
    const r = ui.setMode('x')
    expect(r.ok).toBeFalsy()
    expect(ui.particleMode).toBe('normal')
  })

  it('carga desde localStorage si existe', () => {
    // semilla
    mem['ui_prefs_v1'] = JSON.stringify({
      particlesEnabled: false,
      particleLines: false,
      particleMode: 'ultra',
    })
    const ui = useUiStore()
    ui.cargarLocal()
    expect(ui.particlesEnabled).toBe(false)
    expect(ui.particleLines).toBe(false)
    expect(ui.particleMode).toBe('ultra')
  })
})
