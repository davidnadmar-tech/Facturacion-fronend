import { defineStore } from 'pinia'
import api, { API_GATEWAY_URL, isSuccessResponse } from '@/api/axiosConection'

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
  state: () => ({ lista: [], cargado: false, enviando: false, error: null }),
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
    async emitir(datos) {
      // Sustituye la lógica local por POST a API: guardarfactura (creación)
      this.cargarLocal()
      this.error = null
      const codigoLocal = generarCodigo(this.ultimoCodigo)
      const now = new Date().toISOString()
      const base = { ...datos, codigo: codigoLocal, createdAt: now }
      const errores = this.validar(base)
      if (Object.keys(errores).length) return { ok: false, errores }

      // Construcción de payload según contrato
      const fechaStr = typeof base.fecha === 'string' ? base.fecha : new Date().toISOString()
      const fechaISO = (() => {
        try {
          if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr))
            return new Date(`${fechaStr}T00:00:00.000Z`).toISOString()
          return new Date(fechaStr).toISOString()
        } catch {
          return new Date().toISOString()
        }
      })()

      const condicionPago = base.condicionPago || null
      const totalPagar =
        base?.montos?.total ??
        (() => {
          const gravado = (base.items || [])
            .filter((i) => i.tipo === 'gravado')
            .reduce((acc, it) => acc + Number(it.cantidad || 0) * Number(it.precio || 0), 0)
          const exento = (base.items || [])
            .filter((i) => i.tipo === 'exento')
            .reduce((acc, it) => acc + Number(it.cantidad || 0) * Number(it.precio || 0), 0)
          const noSujeto = (base.items || [])
            .filter((i) => i.tipo === 'no_sujeto')
            .reduce((acc, it) => acc + Number(it.cantidad || 0) * Number(it.precio || 0), 0)
          const iva = gravado * 0.13
          return gravado + exento + noSujeto + iva
        })()

      const objeto = {
        name: base?.cliente?.nombre || 'Factura',
        FECHA: fechaISO,
        // Campos TIPODOC y PUNTO_VENTA podrían venir de catálogos; si no hay, se omiten
        TIPODOC: base?.TIPODOC || base?.tipoDocumentoId || undefined,
        PUNTO_VENTA: base?.PUNTO_VENTA || undefined,
        CODCLIENTE: base?.cliente?.backendId || base?.cliente?.codigo || undefined,
        CLIENTE: base?.cliente?.nombre || undefined,
        // FORMA_PAGO: preferir id/código del catálogo, fallback a condicionPago si existe
        FORMA_PAGO: base?.formaPago?.id || base?.formaPago?.codigoCFE || condicionPago || undefined,
        TOTAL_PAGAR: Number(totalPagar?.toFixed ? totalPagar.toFixed(2) : totalPagar) || 0,
      }

      // Normalizar detalles al formato esperado por la API
      const detalles = (base.items || []).map((it) => {
        const cantidad = Number(it.cantidad || 0)
        const precioU = Number(it.precio || 0)
        const baseLinea = cantidad * precioU
        const tipo = it.tipo || 'gravado'
        const isGravado = tipo === 'gravado'
        const isExento = tipo === 'exento'
        const isNoSujeto = tipo === 'no_sujeto'
        const gravado = isGravado ? baseLinea : 0
        const iva = isGravado ? +(baseLinea * 0.13).toFixed(2) : 0
        const exento = isExento ? baseLinea : 0
        const noSujeto = isNoSujeto ? baseLinea : 0
        const total = gravado + iva + exento + noSujeto
        const payload = {
          DESCRIP: it.descripcion || '',
          CANTIDAD: cantidad,
          PRECIO_U: precioU,
          TOTAL: +total.toFixed(2),
        }
        if (gravado) payload.GRAVADO = +gravado.toFixed(2)
        if (iva) payload.IVA = iva
        if (exento) payload.EXENTO = +exento.toFixed(2)
        if (noSujeto) payload.NO_SUJETO = +noSujeto.toFixed(2)
        if (it.INVCOD) payload.INVCOD = it.INVCOD
        return payload
      })

      const body = {
        vc: 'guardarfactura',
        edicion: '0',
        id: '',
        objeto,
        detalles,
      }

      this.enviando = true
      try {
        const { data } = await api.post(API_GATEWAY_URL, body, {
          headers: { 'Content-Type': 'application/json' },
        })
        if (!isSuccessResponse(data)) {
          const msg = data?.Mensaje || 'No se pudo guardar la factura'
          this.error = msg
          return { ok: false, error: msg }
        }
        // Mejor esfuerzo para reflejar en la lista local
        const contenido = data.Contenido || {}
        const record =
          contenido?.factura || contenido?.record || contenido?.objeto || data?.objeto || null
        const created = {
          ...base,
          backendId: record?.id || record?.ID || null,
        }
        this.lista.push(created)
        this.persistir()
        return { ok: true, item: created, raw: data }
      } catch (e) {
        const msg = e?.response?.data?.Mensaje || e?.message || 'Error de red'
        this.error = msg
        return { ok: false, error: msg }
      } finally {
        this.enviando = false
      }
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
