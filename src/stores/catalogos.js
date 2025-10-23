import { defineStore } from 'pinia'
import api from '@/api/axiosConection'

const API_GATEWAY_URL = 'http://localhost:5000/ApiFacturador/'

function parseContenido(contenido) {
  if (!contenido) return null
  if (typeof contenido === 'string') {
    try {
      return JSON.parse(contenido.trim())
    } catch {
      return null
    }
  }
  return contenido
}

function mapActividad(record) {
  if (!record) return null
  const codigoSFE = record.CODIGOACTIVIDADSFE || record.codigoSFE || record.codigo || ''
  const codigo = record.CODIGOACTIVIDAD || codigoSFE || ''
  const id = record.id || codigo || `tmp-${Math.random().toString(36).slice(2, 10)}`
  return {
    id,
    name: record.name || '',
    descripcion: record.DESCRIPCION || record.DESCRIP || '',
    codigo,
    codigoSFE,
  }
}

function mapTipoItem(record) {
  if (!record) return null
  const id = record.id || `tmp-${Math.random().toString(36).slice(2, 10)}`
  return {
    id,
    name: record.name || '',
    descripcion: record.DESCRIPCION || record.descripcion || '',
    activa: record.ACTIVA ?? true,
  }
}

function mapMunicipio(record, deptoId) {
  if (!record) return null
  const id = record.id || `tmp-${Math.random().toString(36).slice(2, 10)}`
  return {
    id,
    name: record.name || '',
    codigoSFE: record.CODIGOSFE || record.codigoSFE || '',
    deptoId: record.IDDEPTO || record.deptoId || deptoId || '',
  }
}

function mapDepartamento(record) {
  if (!record) return null
  const id = record.id || `tmp-${Math.random().toString(36).slice(2, 10)}`
  const municipiosMap = new Map()
  const municipiosExpand = Array.isArray(record.expand?.DATA_MUNICS)
    ? record.expand.DATA_MUNICS
    : []
  municipiosExpand.forEach((mun) => {
    const mapped = mapMunicipio(mun, id)
    if (mapped?.id) municipiosMap.set(mapped.id, mapped)
  })
  if (Array.isArray(record.DATA_MUNICS)) {
    record.DATA_MUNICS.forEach((entry) => {
      if (typeof entry === 'string') {
        if (!municipiosMap.has(entry)) {
          municipiosMap.set(entry, {
            id: entry,
            name: entry,
            codigoSFE: '',
            deptoId: id,
          })
        }
      } else if (entry && typeof entry === 'object') {
        const mapped = mapMunicipio(entry, id)
        if (mapped?.id && !municipiosMap.has(mapped.id)) municipiosMap.set(mapped.id, mapped)
      }
    })
  }
  const municipios = Array.from(municipiosMap.values())
  return {
    id,
    name: record.name || '',
    codigoSFE: record.CODIGOSFE || record.codigoSFE || '',
    municipios,
  }
}

function mapFormaPago(record) {
  if (!record) return null
  const id = record.id || record.ID || `tmp-${Math.random().toString(36).slice(2, 10)}`
  const codigoCFE = record.CODIGO_CFE || record.CODIGOCFE || record.codigoCFE || ''
  return {
    id,
    name: record.name || record.NOMBRE || record.descripcion || '',
    descripcion: record.DESCRIPCION || record.descripcion || '',
    codigoCFE,
    activo: record.ACTIVA ?? record.activo ?? true,
  }
}

function mapTipoFactura(record) {
  if (!record) return null
  const id = record.id || record.ID || `tmp-${Math.random().toString(36).slice(2, 10)}`
  const name = record.name || record.NOMBRE || ''
  const descripcion = record.DESCRIPCION || record.DESCRIP || ''
  const codigoMH = record.CODIGO_MH || record.CODMH || ''
  const activa = record.ACTIVA ?? record.activo ?? true
  return { id, name, descripcion, codigoMH, activa }
}

function mapEstablecimiento(record) {
  if (!record) return null
  const id = record.id || record.ID || `tmp-${Math.random().toString(36).slice(2, 10)}`
  const name = record.name || record.NOMBRE || ''
  const codMH = record.COD_MH || record.CODMH || ''
  // Construir índice de expand si viene
  const expandList = Array.isArray(record.expand?.DATA_PUNTOSVENTA)
    ? record.expand.DATA_PUNTOSVENTA
    : []
  const expandIndex = new Map()
  expandList.forEach((pv) => {
    const pid = pv?.id || pv?.ID || null
    if (pid) {
      const pname = pv?.name || pv?.NOMBRE || pv?.DESCRIPCION || pv?.DESCRIP || pv?.COD_MH || ''
      expandIndex.set(String(pid), { id: String(pid), name: String(pname || pid) })
    }
  })
  const puntosVenta = Array.isArray(record.DATA_PUNTOSVENTA)
    ? record.DATA_PUNTOSVENTA.map((pv) => {
        if (typeof pv === 'string') {
          const fromExpand = expandIndex.get(String(pv))
          return fromExpand || { id: String(pv), name: String(pv) }
        }
        if (pv && typeof pv === 'object') {
          const pid = pv.id || pv.ID || ''
          const pname = pv.name || pv.NOMBRE || pv.DESCRIPCION || pv.COD_MH || pid
          return { id: String(pid), name: String(pname) }
        }
        return null
      }).filter(Boolean)
    : expandList.map((pv) => ({
        id: String(pv.id || pv.ID),
        name: String(pv.name || pv.NOMBRE || pv.DESCRIPCION || pv.COD_MH || pv.id),
      }))
  return { id, name, codMH, puntosVenta }
}

export const useCatalogosStore = defineStore('catalogos', {
  state: () => ({
    actividades: [],
    actividadesCargando: false,
    actividadesCargadas: false,
    errorActividades: null,
    tiposItems: [],
    tiposItemsCargando: false,
    tiposItemsCargados: false,
    errorTiposItems: null,
    departamentos: [],
    departamentosCargando: false,
    departamentosCargados: false,
    errorDepartamentos: null,
    municipiosIndex: {},
    // Formas de Pago
    formasPago: [],
    formasPagoCargando: false,
    formasPagoCargadas: false,
    errorFormasPago: null,
    // Establecimientos
    establecimientos: [],
    establecimientosCargando: false,
    establecimientosCargados: false,
    errorEstablecimientos: null,
    // Tipos de Factura
    tiposFactura: [],
    tiposFacturaCargando: false,
    tiposFacturaCargados: false,
    errorTiposFactura: null,
  }),
  getters: {
    actividadPorId: (state) => (valor) => {
      if (valor === undefined || valor === null) return undefined
      const target = String(valor).toLowerCase()
      return state.actividades.find((a) =>
        [a.id, a.codigo, a.codigoSFE]
          .filter(Boolean)
          .some((candidate) => String(candidate).toLowerCase() === target),
      )
    },
    buscarActividades: (state) => (termino) => {
      const lista = state.actividades
      if (!termino) return lista
      const q = String(termino).trim().toLowerCase()
      if (!q) return lista
      return lista.filter((item) =>
        [item.name, item.descripcion, item.codigo, item.codigoSFE]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q)),
      )
    },
    tiposItemsOrdenados: (state) => state.tiposItems,
    tipoItemPorId: (state) => (valor) => {
      if (valor === undefined || valor === null) return undefined
      const target = String(valor).toLowerCase()
      return state.tiposItems.find((tipo) => String(tipo.id).toLowerCase() === target)
    },
    departamentoPorId: (state) => (id) => {
      if (!id) return undefined
      return state.departamentos.find((d) => d.id === id)
    },
    departamentosOrdenados: (state) => state.departamentos,
    municipiosDeDepartamento: (state) => (deptoId) => {
      if (!deptoId) return []
      const depto = state.departamentos.find((d) => d.id === deptoId)
      return depto?.municipios || []
    },
    municipioPorId: (state) => (id) => {
      if (!id) return undefined
      return state.municipiosIndex[id]
    },
    formasPagoOrdenadas: (state) => state.formasPago,
    formaPagoPorId: (state) => (id) => {
      if (!id) return undefined
      const target = String(id).toLowerCase()
      return state.formasPago.find((f) => String(f.id).toLowerCase() === target)
    },
    establecimientosOrdenados: (state) => state.establecimientos,
    establecimientoPorId: (state) => (id) => {
      if (!id) return undefined
      const target = String(id).toLowerCase()
      return state.establecimientos.find((e) => String(e.id).toLowerCase() === target)
    },
    puntosVentaDeEstablecimiento: (state) => (id) => {
      const est = id ? state.establecimientos.find((e) => e.id === id) : null
      return est?.puntosVenta || []
    },
    tiposFacturaOrdenados: (state) => state.tiposFactura,
    tipoFacturaPorId: (state) => (id) => {
      if (!id) return undefined
      const target = String(id).toLowerCase()
      return state.tiposFactura.find((t) => String(t.id).toLowerCase() === target)
    },
  },
  actions: {
    setActividades(list) {
      this.actividades = Array.isArray(list) ? list.filter(Boolean) : []
      this.actividadesCargadas = true
    },
    setTiposItems(list) {
      this.tiposItems = Array.isArray(list) ? list.filter(Boolean) : []
      this.tiposItemsCargados = true
    },
    setDepartamentos(list) {
      const items = Array.isArray(list) ? list.filter(Boolean) : []
      this.departamentos = items
      const index = {}
      items.forEach((depto) => {
        if (!Array.isArray(depto.municipios)) depto.municipios = []
        depto.municipios.forEach((mun) => {
          if (mun?.id) index[mun.id] = mun
        })
      })
      this.municipiosIndex = index
      this.departamentosCargados = true
    },
    async cargarActividadesEconomicas({ force = false, page = '1', perPage = '50000' } = {}) {
      if (this.actividadesCargadas && !force) {
        return { ok: true, items: this.actividades }
      }
      this.actividadesCargando = true
      this.errorActividades = null
      const body = {
        vc: 'obteneractivseconomicas',
        page,
        perPage,
      }
      try {
        const { data } = await api.post(API_GATEWAY_URL, body, {
          headers: { 'Content-Type': 'application/json' },
        })
        if (!data || data.Estado !== 2) {
          const msg = data?.Mensaje || 'No se pudieron obtener las actividades económicas'
          this.errorActividades = msg
          return { ok: false, error: msg }
        }
        const contenido = parseContenido(data.Contenido)
        const listaFuente = Array.isArray(contenido)
          ? contenido
          : Array.isArray(contenido?.items)
            ? contenido.items
            : Array.isArray(contenido?.datos)
              ? contenido.datos
              : Array.isArray(contenido?.lista)
                ? contenido.lista
                : []
        const items = listaFuente.map((item) => mapActividad(item)).filter(Boolean)
        this.setActividades(items)
        return { ok: true, items }
      } catch (err) {
        const msg = err?.response?.data?.Mensaje || err?.message || 'Error de red'
        this.errorActividades = msg
        return { ok: false, error: msg }
      } finally {
        this.actividadesCargando = false
      }
    },
    limpiarActividades() {
      this.actividades = []
      this.actividadesCargadas = false
      this.errorActividades = null
    },
    async cargarTiposItems({ force = false, page = '1', perPage = '100', busqueda = '' } = {}) {
      if (this.tiposItemsCargados && !force) {
        return { ok: true, items: this.tiposItems }
      }
      this.tiposItemsCargando = true
      this.errorTiposItems = null
      const body = {
        vc: 'obtenertipositems',
        page,
        perPage,
        busqueda,
      }
      try {
        const { data } = await api.post(API_GATEWAY_URL, body, {
          headers: { 'Content-Type': 'application/json' },
        })
        if (!data || data.Estado !== 2) {
          const msg = data?.Mensaje || 'No se pudieron obtener los tipos de items'
          this.errorTiposItems = msg
          return { ok: false, error: msg }
        }
        const contenido = parseContenido(data.Contenido)
        const listaFuente = Array.isArray(contenido)
          ? contenido
          : Array.isArray(contenido?.items)
            ? contenido.items
            : Array.isArray(contenido?.datos)
              ? contenido.datos
              : Array.isArray(contenido?.lista)
                ? contenido.lista
                : []
        const items = listaFuente.map((item) => mapTipoItem(item)).filter(Boolean)
        this.setTiposItems(items)
        return { ok: true, items }
      } catch (err) {
        const msg = err?.response?.data?.Mensaje || err?.message || 'Error de red'
        this.errorTiposItems = msg
        return { ok: false, error: msg }
      } finally {
        this.tiposItemsCargando = false
      }
    },
    limpiarTiposItems() {
      this.tiposItems = []
      this.tiposItemsCargados = false
      this.errorTiposItems = null
    },
    async cargarDepartamentos({
      force = false,
      page = '1',
      perPage = '100',
      expand = 'DATA_MUNICS',
    } = {}) {
      if (this.departamentosCargados && !force) {
        return { ok: true, items: this.departamentos }
      }
      this.departamentosCargando = true
      this.errorDepartamentos = null
      const body = {
        vc: 'obtenerdepartamentos',
        page,
        perPage,
        expand,
      }
      try {
        const { data } = await api.post(API_GATEWAY_URL, body, {
          headers: { 'Content-Type': 'application/json' },
        })
        if (!data || data.Estado !== 2) {
          const msg = data?.Mensaje || 'No se pudieron obtener los departamentos'
          this.errorDepartamentos = msg
          return { ok: false, error: msg }
        }
        const contenido = parseContenido(data.Contenido)
        const listaFuente = Array.isArray(contenido)
          ? contenido
          : Array.isArray(contenido?.items)
            ? contenido.items
            : Array.isArray(contenido?.datos)
              ? contenido.datos
              : Array.isArray(contenido?.lista)
                ? contenido.lista
                : []
        const items = listaFuente.map((item) => mapDepartamento(item)).filter(Boolean)
        this.setDepartamentos(items)
        return { ok: true, items }
      } catch (err) {
        const msg = err?.response?.data?.Mensaje || err?.message || 'Error de red'
        this.errorDepartamentos = msg
        return { ok: false, error: msg }
      } finally {
        this.departamentosCargando = false
      }
    },
    limpiarDepartamentos() {
      this.departamentos = []
      this.departamentosCargados = false
      this.errorDepartamentos = null
      this.municipiosIndex = {}
    },
    async cargarFormasPago({ force = false, page = '1', perPage = '50', busqueda = '' } = {}) {
      if (this.formasPagoCargadas && !force) {
        return { ok: true, items: this.formasPago }
      }
      this.formasPagoCargando = true
      this.errorFormasPago = null
      const body = {
        vc: 'obtenerformasdepago',
        page,
        perPage,
      }
      if (busqueda) body.busqueda = busqueda
      try {
        const { data } = await api.post(API_GATEWAY_URL, body, {
          headers: { 'Content-Type': 'application/json' },
        })
        if (!data || data.Estado !== 2) {
          const msg = data?.Mensaje || 'No se pudieron obtener las formas de pago'
          this.errorFormasPago = msg
          return { ok: false, error: msg }
        }
        const contenido = parseContenido(data.Contenido)
        const listaFuente = Array.isArray(contenido)
          ? contenido
          : Array.isArray(contenido?.items)
            ? contenido.items
            : Array.isArray(contenido?.datos)
              ? contenido.datos
              : Array.isArray(contenido?.lista)
                ? contenido.lista
                : []
        const items = listaFuente.map((item) => mapFormaPago(item)).filter(Boolean)
        this.formasPago = items
        this.formasPagoCargadas = true
        return { ok: true, items }
      } catch (err) {
        const msg = err?.response?.data?.Mensaje || err?.message || 'Error de red'
        this.errorFormasPago = msg
        return { ok: false, error: msg }
      } finally {
        this.formasPagoCargando = false
      }
    },
    limpiarFormasPago() {
      this.formasPago = []
      this.formasPagoCargadas = false
      this.errorFormasPago = null
    },
    async cargarEstablecimientos({
      force = false,
      page = '1',
      perPage = '50',
      busqueda = '',
      expand = 'DATA_PUNTOSVENTA',
    } = {}) {
      if (this.establecimientosCargados && !force) {
        return { ok: true, items: this.establecimientos }
      }
      this.establecimientosCargando = true
      this.errorEstablecimientos = null
      const body = { vc: 'obtenerestablecimientos', page, perPage, expand }
      if (busqueda) body.busqueda = busqueda
      try {
        const { data } = await api.post(API_GATEWAY_URL, body, {
          headers: { 'Content-Type': 'application/json' },
        })
        if (!data || data.Estado !== 2) {
          const msg = data?.Mensaje || 'No se pudieron obtener los establecimientos'
          this.errorEstablecimientos = msg
          return { ok: false, error: msg }
        }
        const contenido = parseContenido(data.Contenido)
        const listaFuente = Array.isArray(contenido)
          ? contenido
          : Array.isArray(contenido?.items)
            ? contenido.items
            : Array.isArray(contenido?.datos)
              ? contenido.datos
              : Array.isArray(contenido?.lista)
                ? contenido.lista
                : []
        const items = listaFuente.map((it) => mapEstablecimiento(it)).filter(Boolean)
        this.establecimientos = items
        this.establecimientosCargados = true
        return { ok: true, items }
      } catch (err) {
        const msg = err?.response?.data?.Mensaje || err?.message || 'Error de red'
        this.errorEstablecimientos = msg
        return { ok: false, error: msg }
      } finally {
        this.establecimientosCargando = false
      }
    },
    limpiarEstablecimientos() {
      this.establecimientos = []
      this.establecimientosCargados = false
      this.errorEstablecimientos = null
    },
    async cargarTiposFactura({ force = false, page = '1', perPage = '50000', busqueda = '' } = {}) {
      if (this.tiposFacturaCargados && !force) {
        return { ok: true, items: this.tiposFactura }
      }
      this.tiposFacturaCargando = true
      this.errorTiposFactura = null
      const body = { vc: 'obtenertiposfactura', page, perPage }
      if (busqueda) body.busqueda = busqueda
      try {
        const { data } = await api.post(API_GATEWAY_URL, body, {
          headers: { 'Content-Type': 'application/json' },
        })
        if (!data || data.Estado !== 2) {
          const msg = data?.Mensaje || 'No se pudieron obtener los tipos de factura'
          this.errorTiposFactura = msg
          return { ok: false, error: msg }
        }
        const contenido = parseContenido(data.Contenido)
        const listaFuente = Array.isArray(contenido)
          ? contenido
          : Array.isArray(contenido?.items)
            ? contenido.items
            : Array.isArray(contenido?.datos)
              ? contenido.datos
              : Array.isArray(contenido?.lista)
                ? contenido.lista
                : []
        const items = listaFuente.map((item) => mapTipoFactura(item)).filter(Boolean)
        this.tiposFactura = items
        this.tiposFacturaCargados = true
        return { ok: true, items }
      } catch (err) {
        const msg = err?.response?.data?.Mensaje || err?.message || 'Error de red'
        this.errorTiposFactura = msg
        return { ok: false, error: msg }
      } finally {
        this.tiposFacturaCargando = false
      }
    },
    limpiarTiposFactura() {
      this.tiposFactura = []
      this.tiposFacturaCargados = false
      this.errorTiposFactura = null
    },
  },
})
