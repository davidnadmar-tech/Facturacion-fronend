import { defineStore } from 'pinia'

/*
 Estructura de factura (simplificada - solo para UI local):
 {
   codigo: string, // F0001 ...
   numeroControl: string,
   serie: string,
   fecha: string (YYYY-MM-DD),
   tipoDocumento: string,
   cliente: {
     nombre: string,
     nit?: string,
     nrc?: string
   },
   condicionPago: 'contado' | 'credito',
   diasCredito?: number,
   items: [ { descripcion, cantidad, precio, tipo } ],
   montos: { gravado, exento, noSujeto, iva, subtotal, total },
   createdAt: string
 }
*/

function generarCodigo(last) {
  if (!last) return 'F0001'
  const num = parseInt(last.replace(/\D/g, ''), 10) + 1
  return 'F' + String(num).padStart(4, '0')
}

export const useFacturasStore = defineStore('facturas', {
  state: () => ({ lista: [], cargado: false }),
  getters: {
    total: (s) => s.lista.length,
    ultimoCodigo: (s) => (s.lista.length ? s.lista[s.lista.length - 1].codigo : null),
    porCodigo: (s) => (codigo) => s.lista.find((f) => f.codigo === codigo),
    filtradas: (s) => (q) => {
      if (!q) return s.lista
      const qq = q.toLowerCase()
      return s.lista.filter(
        (f) =>
          f.codigo.toLowerCase().includes(qq) ||
          (f.cliente?.nombre && f.cliente.nombre.toLowerCase().includes(qq)) ||
          (f.cliente?.nit && f.cliente.nit.toLowerCase().includes(qq)),
      )
    },
  },
  actions: {
    cargarLocal() {
      if (this.cargado) return
      try {
        const raw = localStorage.getItem('facturas_v1')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr)) this.lista = arr
        }
      } catch (e) {
        console.warn('No se pudo cargar facturas_v1', e)
      } finally {
        this.cargado = true
      }
    },
    persistir() {
      try {
        localStorage.setItem('facturas_v1', JSON.stringify(this.lista))
      } catch (e) {
        console.warn('No se pudo persistir facturas_v1', e)
      }
    },
    validar(base) {
      const errores = {}
      if (!base.fecha) errores.fecha = 'Fecha requerida'
      if (!base.items || !base.items.length) errores.items = 'Debe agregar al menos un ítem'
      else if (base.items.some((i) => !i.descripcion || !i.cantidad || i.cantidad <= 0))
        errores.items = 'Items incompletos'
      if (!base.cliente || !base.cliente.nombre) errores.cliente = 'Cliente requerido'
      return errores
    },
    emitir(datos) {
      this.cargarLocal()
      const codigo = generarCodigo(this.ultimoCodigo)
      const now = new Date().toISOString()
      const base = { ...datos, codigo, createdAt: now }
      const errores = this.validar(base)
      if (Object.keys(errores).length) return { ok: false, errores }
      this.lista.push(base)
      this.persistir()
      return { ok: true, item: base }
    },
    eliminar(codigo) {
      const idx = this.lista.findIndex((f) => f.codigo === codigo)
      if (idx === -1) return { ok: false }
      const [removed] = this.lista.splice(idx, 1)
      this.persistir()
      return { ok: true, item: removed }
    },
    seedDemo() {
      if (this.lista.length) return
      const demo = [
        {
          numeroControl: 'NC-00000001',
          serie: 'A001',
          fecha: new Date().toISOString().substring(0, 10),
          tipoDocumento: 'credito_fiscal',
          cliente: { nombre: 'Cliente Demo 1', nit: '0614-290112-101-1' },
          condicionPago: 'contado',
          items: [
            { descripcion: 'Servicio A', cantidad: 2, precio: 50, tipo: 'gravado' },
            { descripcion: 'Producto B', cantidad: 1, precio: 100, tipo: 'exento' },
          ],
        },
      ]
      demo.forEach((d) => {
        const gravado = d.items
          .filter((i) => i.tipo === 'gravado')
          .reduce((acc, it) => acc + it.cantidad * it.precio, 0)
        const exento = d.items
          .filter((i) => i.tipo === 'exento')
          .reduce((acc, it) => acc + it.cantidad * it.precio, 0)
        const noSujeto = 0
        const iva = gravado * 0.13
        const subtotal = gravado + exento + noSujeto
        const total = subtotal + iva
        const montos = { gravado, exento, noSujeto, iva, subtotal, total }
        const codigo = generarCodigo(this.ultimoCodigo)
        this.lista.push({ ...d, codigo, montos, createdAt: new Date().toISOString() })
      })
      this.persistir()
    },
  },
})

export { generarCodigo as generarCodigoFactura }
