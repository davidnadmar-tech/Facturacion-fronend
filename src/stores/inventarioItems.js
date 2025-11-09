import { defineStore } from 'pinia'
import api, { API_GATEWAY_URL, isSuccessResponse } from '@/api/axiosConection'

function parseJsonMaybe(valor) {
  if (!valor) return null
  if (typeof valor === 'string') {
    try {
      return JSON.parse(valor)
    } catch {
      return null
    }
  }
  if (typeof valor === 'object') return valor
  return null
}

function pickFirst(obj, claves) {
  if (!obj || typeof obj !== 'object') return undefined
  for (const clave of claves) {
    if (Object.prototype.hasOwnProperty.call(obj, clave) && obj[clave] !== undefined) {
      return obj[clave]
    }
  }
  return undefined
}

function normalizarDetalleLista(origen) {
  const candidato =
    origen && typeof origen === 'object'
      ? (pickFirst(origen, ['DETALLE', 'detalle', 'Detalle', 'detalles', 'DETALLES']) ?? origen)
      : origen
  if (Array.isArray(candidato)) return candidato
  if (typeof candidato === 'string') {
    const parseado = parseJsonMaybe(candidato)
    if (Array.isArray(parseado)) return parseado
  }
  if (candidato && typeof candidato === 'object') {
    const valores = Object.values(candidato)
    if (Array.isArray(valores) && valores.length) return valores
  }
  return []
}

function mapDetalle(detalle) {
  if (!detalle || typeof detalle !== 'object') {
    return {
      ACTIVO: false,
      CANTIDAD: 0,
      GRACIA: '00:00:00',
      HORA: '00:00:00',
      MONTO: 0,
      TEXTO: '',
    }
  }
  const activo = pickFirst(detalle, ['ACTIVO', 'activo', 'Activo'])
  const cantidad = pickFirst(detalle, ['CANTIDAD', 'cantidad', 'Cantidad'])
  const gracia = pickFirst(detalle, ['GRACIA', 'gracia', 'Gracia'])
  const hora = pickFirst(detalle, ['HORA', 'hora', 'Hora'])
  const monto = pickFirst(detalle, ['MONTO', 'monto', 'Monto'])
  const texto = pickFirst(detalle, ['TEXTO', 'texto', 'Texto', 'descripcion', 'Descripcion'])
  return {
    ACTIVO: activo !== undefined ? Boolean(activo) : false,
    CANTIDAD: Number.parseInt(cantidad, 10) || 0,
    GRACIA: typeof gracia === 'string' && gracia.trim() ? gracia : '00:00:00',
    HORA: typeof hora === 'string' && hora.trim() ? hora : '00:00:00',
    MONTO: Number.parseFloat(monto) || 0,
    TEXTO: texto ? String(texto) : '',
  }
}

function mapItem(record) {
  if (!record || typeof record !== 'object') return null
  const dataObjetoFuente =
    record.DATA_OBJETO ?? record.dataObjeto ?? record.data_objeto ?? record.data ?? null
  const dataObjetoParseado = parseJsonMaybe(dataObjetoFuente) || {}
  const detalleLista = normalizarDetalleLista(dataObjetoParseado)
  const expand = record.expand && typeof record.expand === 'object' ? record.expand : {}
  return {
    ACTIVA: Boolean(record.ACTIVA),
    ACTUALIZADA: record.ACTUALIZADA || null,
    CODE: record.CODE || '',
    CREADA: record.CREADA || null,
    DATA_OBJETO: {
      ...(dataObjetoParseado && typeof dataObjetoParseado === 'object' ? dataObjetoParseado : {}),
      DETALLE: detalleLista.map((detalle) => mapDetalle(detalle)),
    },
    DESCRIPCION: record.DESCRIPCION || '',
    HASH: record.HASH || '',
    ORDEN: Number(record.ORDEN) || 0,
    REL_TIPO_ITEM: record.REL_TIPO_ITEM || '',
    TIPO: record.TIPO || record.tipo || '',
    avatar: Array.isArray(record.avatar) ? record.avatar : [],
    collectionId: record.collectionId || '',
    collectionName: record.collectionName || 'INV_ITEM',
    expand,
    id: record.id || record.CODE || `tmp-${Math.random().toString(36).slice(2, 10)}`,
    name: record.name || record.DESCRIPCION || '',
  }
}

export const useInventarioItemsStore = defineStore('inventarioItems', {
  state: () => ({
    items: [],
    cargando: false,
    cargado: false,
    error: null,
    creando: false,
    actualizando: false,
    eliminando: false,
    eliminandoId: null,
    paginaActual: 1,
    totalPaginas: 1,
    totalItems: 0,
    porPagina: 25,
    busquedaActual: '',
    tipoActual: '',
    ultimaRespuesta: null,
  }),
  getters: {
    itemsOrdenados: (state) => state.items,
    resumenPaginacion: (state) => ({
      pagina: state.paginaActual,
      totalPaginas: state.totalPaginas,
      totalItems: state.totalItems,
      porPagina: state.porPagina,
    }),
  },
  actions: {
    setItems(lista, { pagina, totalPaginas, totalItems, porPagina, busqueda, tipo }) {
      this.items = Array.isArray(lista) ? lista : []
      this.paginaActual = Number(pagina) || 1
      this.totalPaginas = Number(totalPaginas) || 1
      this.totalItems = Number(totalItems) || this.items.length
      this.porPagina = Number(porPagina) || this.porPagina || 25
      this.busquedaActual = typeof busqueda === 'string' ? busqueda : this.busquedaActual
      this.tipoActual = typeof tipo === 'string' ? tipo : this.tipoActual
      this.cargado = true
    },
    async cargarItems(
      busqueda = this.busquedaActual,
      { page, perPage, tipo, sort = '', fields = '*', expand = 'REL_TIPO_ITEM' } = {},
    ) {
      if (this.cargando) {
        return { ok: false, error: 'Consulta en progreso' }
      }
      this.cargando = true
      this.error = null
      const body = {
        vc: 'consultaritems',
        page: page !== undefined ? String(page) : String(this.paginaActual || 1),
        perPage: perPage !== undefined ? String(perPage) : String(this.porPagina || 25),
        sort,
        fields,
        expand,
      }
      const filtroBusqueda = typeof busqueda === 'string' ? busqueda.trim() : ''
      const filtroTipo = typeof tipo === 'string' ? tipo.trim() : this.tipoActual
      if (filtroBusqueda) body.busqueda = filtroBusqueda
      if (filtroTipo) body.tipo = filtroTipo
      try {
        const { data } = await api.post(API_GATEWAY_URL, body, {
          headers: { 'Content-Type': 'application/json' },
        })
        if (!isSuccessResponse(data)) {
          const msg = data?.Mensaje || 'No se pudo consultar inventario'
          this.error = msg
          return { ok: false, error: msg }
        }
        const contenido = data.Contenido || {}
        const listaFuente = Array.isArray(contenido.items)
          ? contenido.items
          : Array.isArray(contenido.lista)
            ? contenido.lista
            : []
        const items = listaFuente.map((item) => mapItem(item)).filter(Boolean)
        this.setItems(items, {
          pagina: contenido.page,
          totalPaginas: contenido.totalPages,
          totalItems: contenido.totalItems,
          porPagina: contenido.perPage,
          busqueda: filtroBusqueda,
          tipo: filtroTipo,
        })
        this.ultimaRespuesta = contenido
        return {
          ok: true,
          items,
          pagination: {
            page: this.paginaActual,
            totalPages: this.totalPaginas,
            perPage: this.porPagina,
            totalItems: this.totalItems,
          },
        }
      } catch (error) {
        const msg = error?.response?.data?.Mensaje || error?.message || 'Error de red'
        this.error = msg
        return { ok: false, error: msg }
      } finally {
        this.cargando = false
      }
    },
    async crearItem(objeto, { refrescar = false } = {}) {
      if (!objeto || typeof objeto !== 'object') {
        return { ok: false, error: 'Objeto de item inválido' }
      }
      this.error = null
      this.creando = true
      const payload = {
        vc: 'guardaritem',
        edicion: '0',
        id: '',
        objeto,
      }
      try {
        const { data } = await api.post(API_GATEWAY_URL, payload, {
          headers: { 'Content-Type': 'application/json' },
        })
        if (!isSuccessResponse(data)) {
          const msg = data?.Mensaje || 'No se pudo guardar el item'
          return { ok: false, error: msg }
        }
        const contenido = data.Contenido || {}
        const candidato =
          pickFirst(contenido, ['item', 'ITEM', 'objeto', 'registro', 'ITEM_GUARDADO']) ||
          (Array.isArray(contenido.items) && contenido.items.length ? contenido.items[0] : null) ||
          data.objeto ||
          data.item ||
          null
        let mapped = candidato ? mapItem(candidato) : null
        if (mapped) {
          const indice = this.items.findIndex((item) => String(item.id) === String(mapped.id))
          if (indice !== -1) {
            this.items.splice(indice, 1, mapped)
          } else {
            this.items = [mapped, ...this.items]
          }
        }
        if (refrescar) {
          await this.cargarItems(this.busquedaActual, {
            page: String(this.paginaActual || 1),
            perPage: String(this.porPagina || 25),
            tipo: this.tipoActual || undefined,
          })
          if (mapped) {
            mapped = this.items.find((item) => String(item.id) === String(mapped.id)) || mapped
          }
        }
        return { ok: true, item: mapped, raw: data }
      } catch (error) {
        const msg = error?.response?.data?.Mensaje || error?.message || 'Error de red'
        return { ok: false, error: msg }
      } finally {
        this.creando = false
      }
    },
    async editarItem(id, objeto, { refrescar = false } = {}) {
      if (!id) return { ok: false, error: 'ID requerido' }
      if (!objeto || typeof objeto !== 'object') {
        return { ok: false, error: 'Objeto de item inválido' }
      }
      this.error = null
      this.actualizando = true
      const payload = {
        vc: 'guardaritem',
        edicion: '1',
        id: String(id),
        objeto,
      }
      try {
        const { data } = await api.post(API_GATEWAY_URL, payload, {
          headers: { 'Content-Type': 'application/json' },
        })
        if (!isSuccessResponse(data)) {
          const msg = data?.Mensaje || 'No se pudo actualizar el item'
          this.error = msg
          return { ok: false, error: msg }
        }
        const contenido = data.Contenido || {}
        const candidato =
          pickFirst(contenido, ['item', 'ITEM', 'objeto', 'registro', 'ITEM_GUARDADO']) ||
          (Array.isArray(contenido.items) && contenido.items.length ? contenido.items[0] : null) ||
          data.objeto ||
          data.item ||
          null
        const mapped = candidato ? mapItem(candidato) : null
        if (mapped) {
          const idx = this.items.findIndex((it) => String(it.id) === String(mapped.id))
          if (idx !== -1) this.items.splice(idx, 1, mapped)
          else this.items = [mapped, ...this.items]
        }
        if (refrescar) {
          await this.cargarItems(this.busquedaActual, {
            page: String(this.paginaActual || 1),
            perPage: String(this.porPagina || 25),
            tipo: this.tipoActual || undefined,
          })
        }
        return { ok: true, item: mapped, raw: data }
      } catch (error) {
        const msg = error?.response?.data?.Mensaje || error?.message || 'Error de red'
        this.error = msg
        return { ok: false, error: msg }
      } finally {
        this.actualizando = false
      }
    },
    async eliminarItem(criterio) {
      const id = typeof criterio === 'object' ? criterio?.id : criterio
      if (!id) return { ok: false, error: 'Identificador requerido' }
      this.eliminando = true
      this.eliminandoId = id
      this.error = null
      const payload = {
        vc: 'eliminaritem',
        id: String(id),
      }
      try {
        const { data } = await api.post(API_GATEWAY_URL, payload, {
          headers: { 'Content-Type': 'application/json' },
        })
        if (!isSuccessResponse(data)) {
          const msg = data?.Mensaje || 'No se pudo eliminar el item'
          this.error = msg
          return { ok: false, error: msg }
        }
        const idx = this.items.findIndex((it) => String(it.id) === String(id))
        const eliminado = idx !== -1 ? this.items.splice(idx, 1)[0] : null
        const nuevoTotal = Math.max(0, (this.totalItems || this.items.length) - 1)
        this.totalItems = nuevoTotal
        const nuevoTotalPaginas = Math.max(1, Math.ceil(nuevoTotal / (this.porPagina || 1)))
        this.totalPaginas = nuevoTotalPaginas
        if (this.paginaActual > nuevoTotalPaginas) this.paginaActual = nuevoTotalPaginas
        return { ok: true, item: eliminado, raw: data }
      } catch (error) {
        const msg = error?.response?.data?.Mensaje || error?.message || 'Error de red'
        this.error = msg
        return { ok: false, error: msg }
      } finally {
        this.eliminando = false
        this.eliminandoId = null
      }
    },
    agregarTemporal(item) {
      const mapped = mapItem(item)
      if (!mapped) return { ok: false, error: 'Item inválido' }
      this.items = [mapped, ...this.items]
      this.totalItems = (this.totalItems || 0) + 1
      return { ok: true, item: mapped }
    },
    actualizarDetalleLocal(id, detalle) {
      if (!id) return { ok: false, error: 'Identificador requerido' }
      const index = this.items.findIndex((item) => String(item.id) === String(id))
      if (index === -1) return { ok: false, error: 'Item no encontrado' }
      const actual = this.items[index]
      const detalleSeguro = Array.isArray(detalle) ? detalle.map((fila) => mapDetalle(fila)) : []
      const actualizado = {
        ...actual,
        DATA_OBJETO: {
          ...(actual.DATA_OBJETO || {}),
          DETALLE: detalleSeguro,
        },
      }
      this.items.splice(index, 1, actualizado)
      return { ok: true, item: actualizado }
    },
  },
})
