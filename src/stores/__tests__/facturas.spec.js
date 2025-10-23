import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFacturasStore, generarCodigoFactura } from '../facturas'
import api from '@/api/axiosConection'

// Mock localStorage simple en memoria
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

describe('store facturas', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    lsMock.clear()
    lsMock.getItem.mockClear()
    lsMock.setItem.mockClear()
    // mock API por defecto
    vi.spyOn(api, 'post').mockResolvedValue({
      data: { Estado: 2, Contenido: { record: { id: 'fac-1' } } },
    })
  })

  it('generarCodigoFactura genera secuencia correcta', () => {
    expect(generarCodigoFactura(null)).toBe('F0001')
    expect(generarCodigoFactura('F0001')).toBe('F0002')
    expect(generarCodigoFactura('F0099')).toBe('F0100')
  })

  it('emitir rechaza factura sin items', async () => {
    const s = useFacturasStore()
    const r = await s.emitir({
      fecha: '2025-09-28',
      cliente: { nombre: 'Cliente X' },
      items: [],
    })
    expect(r.ok).toBe(false)
    expect(r.errores.items).toBeDefined()
  })

  it('emitir factura válida y persiste', async () => {
    const s = useFacturasStore()
    const r = await s.emitir({
      fecha: '2025-09-28',
      cliente: { nombre: 'Cliente Y', nit: '0614-290112-101-1' },
      items: [{ descripcion: 'Servicio', cantidad: 1, precio: 100, tipo: 'gravado' }],
      montos: {
        gravado: 100,
        exento: 0,
        noSujeto: 0,
        iva: 13,
        subtotal: 100,
        total: 113,
      },
    })
    expect(r.ok).toBe(true)
    expect(s.total).toBe(1)
    expect(lsMock.setItem).toHaveBeenCalled()
  })

  it('eliminar factura existente', async () => {
    const s = useFacturasStore()
    const creado = await s.emitir({
      fecha: '2025-09-28',
      cliente: { nombre: 'Cliente Z' },
      items: [{ descripcion: 'Prod', cantidad: 2, precio: 50, tipo: 'gravado' }],
      montos: { gravado: 100, exento: 0, noSujeto: 0, iva: 13, subtotal: 100, total: 113 },
    })
    expect(creado.ok).toBe(true)
    const codigo = creado.item.codigo
    const del = s.eliminar(codigo)
    expect(del.ok).toBe(true)
    expect(s.total).toBe(0)
  })

  it('filtradas busca por código y nombre cliente', async () => {
    const s = useFacturasStore()
    await s.emitir({
      fecha: '2025-09-28',
      cliente: { nombre: 'Panaderia Central' },
      items: [{ descripcion: 'Harina', cantidad: 3, precio: 10, tipo: 'gravado' }],
      montos: { gravado: 30, exento: 0, noSujeto: 0, iva: 3.9, subtotal: 30, total: 33.9 },
    })
    await s.emitir({
      fecha: '2025-09-28',
      cliente: { nombre: 'Ferreteria Lopez' },
      items: [{ descripcion: 'Martillo', cantidad: 1, precio: 15, tipo: 'exento' }],
      montos: { gravado: 0, exento: 15, noSujeto: 0, iva: 0, subtotal: 15, total: 15 },
    })
    const all = s.filtradas('')
    expect(all.length).toBe(2)
    const porNombre = s.filtradas('lopez')
    expect(porNombre.length).toBe(1)
    const primerCodigo = s.lista[0].codigo
    const porCodigo = s.filtradas(primerCodigo)
    expect(porCodigo.length).toBe(1)
  })
})
