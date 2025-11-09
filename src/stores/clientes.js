/*
import { defineStore } from 'pinia'

function generarCodigo(last) {
  if (!last) return 'C0001'
  const num = parseInt(last.replace(/\D/g, ''), 10) + 1
  return 'C' + String(num).padStart(4, '0')
}

export const useClientesStore = defineStore('clientes', {
  state: () => ({
    lista: [],
    cargado: false,
  }),
  getters: {
    total: (s) => s.lista.length,
    ultimoCodigo: (s) => (s.lista.length ? s.lista[s.lista.length - 1].codigo : null),
    porNit: (s) => (nit) => s.lista.find((c) => c.nit && c.nit === nit),
    filtrados: (s) => (q) => {
      if (!q) return s.lista
      const qq = q.toLowerCase()
      return s.lista.filter((c) =>
        ['nombre', 'nrc', 'nit', 'dui'].some((k) => c[k] && c[k].toLowerCase().includes(qq)),
      )
    },
  },
  actions: {
    cargarLocal() {
      if (this.cargado) return
      try {
        const raw = localStorage.getItem('clientes_v1')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr)) this.lista = arr
        }
      } catch (e) {
        console.warn('No se pudo cargar clientes_v1', e)
      } finally {
        this.cargado = true
      }
    },
    persistir() {
      try {
        localStorage.setItem('clientes_v1', JSON.stringify(this.lista))
      } catch (e) {
        console.warn('No se pudo persistir clientes_v1', e)
      }
    },
    validar(datos, { edit = false } = {}) {
      const errores = {}
      if (!datos.nombre || !datos.nombre.trim()) errores.nombre = 'Nombre requerido'
      else if (datos.nombre.trim().length < 3) errores.nombre = 'Mínimo 3 caracteres'
      if (datos.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(datos.email))
        errores.email = 'Email inválido'
      if (datos.nit) {
        const existente = this.porNit(datos.nit)
        if (existente && (!edit || existente.codigo !== datos.codigo))
          errores.nit = 'NIT ya registrado'
      }
      return errores
    },
    agregar(datos) {
      this.cargarLocal()
      const codigo = generarCodigo(this.ultimoCodigo)
      const base = { ...datos, codigo, createdAt: new Date().toISOString() }
      const errores = this.validar(base)
      if (Object.keys(errores).length) return { ok: false, errores }
      this.lista.push(base)
      this.persistir()
      return { ok: true, item: base }
    },
    actualizar(codigo, patch) {
      const idx = this.lista.findIndex((c) => c.codigo === codigo)
      if (idx === -1) return { ok: false, error: 'No encontrado' }
      const updated = { ...this.lista[idx], ...patch }
      const errores = this.validar(updated, { edit: true })
      if (Object.keys(errores).length) return { ok: false, errores }
      this.lista[idx] = updated
      this.persistir()
      return { ok: true, item: updated }
    },
    eliminar(codigo) {
      const idx = this.lista.findIndex((c) => c.codigo === codigo)
      if (idx === -1) return { ok: false }
      const [removed] = this.lista.splice(idx, 1)
      this.persistir()
      return { ok: true, item: removed }
    },
    seedDemo() {
      if (this.lista.length) return
      const demo = [
        { nombre: 'Cliente Demo 1', nit: '0614-290112-101-1', email: 'cliente1@demo.com' },
        { nombre: 'Cliente Demo 2', nit: '0614-290112-101-2', email: 'cliente2@demo.com' },
      ]
      demo.forEach((d) => {
        const codigo = generarCodigo(this.ultimoCodigo)
        this.lista.push({ ...d, codigo, createdAt: new Date().toISOString() })
      })
      this.persistir()
    },
  },
})
*/

import { defineStore } from 'pinia'
import api, { API_GATEWAY_URL, isSuccessResponse } from '@/api/axiosConection'
import { useFormAuxStore } from './formAux'
const CODIGO_CLIENTE_REGEX_KEY = 'codigoCliente'
const CODIGO_CLIENTE_CHARSET = 'C0123456789'
const CODIGO_CLIENTE_LONGITUD = 5
const CODIGO_GENERACION_INTENTOS = 200

function generarCodigoCliente(existentes = []) {
  const formAux = useFormAuxStore()
  const usados = new Set(Array.isArray(existentes) ? existentes.filter(Boolean) : [])
  for (let intento = 0; intento < CODIGO_GENERACION_INTENTOS; intento += 1) {
    const candidato = formAux.generarCodigo({
      regex: CODIGO_CLIENTE_REGEX_KEY,
      longitud: CODIGO_CLIENTE_LONGITUD,
      charset: CODIGO_CLIENTE_CHARSET,
      maxIntentos: CODIGO_GENERACION_INTENTOS,
    })
    if (!candidato.ok) return candidato
    if (!usados.has(candidato.valor)) return { ok: true, valor: candidato.valor }
  }
  return { ok: false, error: 'No se pudo generar un código único' }
}

function limpiarObjeto(obj) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined || obj[key] === null || obj[key] === '') delete obj[key]
  })
  return obj
}

function mapFormToApiObjeto(form) {
  return limpiarObjeto({
    name: form.nombre || '',
    DESCRIPCION: form.descripcionActividad || '',
    DATA_OBJETO: form.dataObjeto,
    TIPO: form.tipo || 'SERVICIO',
    ACTIVA: form.activa ?? true,
    HASH: form.hash,
    CODIGOACTIVIDAD: form.actividadId || form.codigoActividad,
    TELEFONO: form.telefono,
    EMAIL: form.email,
    NRC: form.nrc,
    NIT: form.nit,
    DUI: form.dui,
    DEPTO: form.departamento,
    MUNICIP: form.municipio,
  })
}

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

function generarIdLocal() {
  return `tmp-${Math.random().toString(36).slice(2, 10)}`
}

function mapApiRecordToLocal(record, original) {
  const src = record || {}
  const base = original || {}
  const expand = src.expand || {}
  const deptoExpand = expand.DEPTO || {}
  const municipExpand = expand.MUNICIP || {}
  const actividadExpand = expand.CODIGOACTIVIDAD || {}

  const actividadId =
    actividadExpand.id || src.CODIGOACTIVIDAD || base.actividadId || base.codigoActividad || ''
  const actividadCodigo =
    actividadExpand.codigo || actividadExpand.codigoSFE || base.codigoActividad || ''

  return {
    codigo: src.codigo || src.id || base.codigo || generarIdLocal(),
    backendId: src.id || base.backendId || null,
    nombre: src.name || base.nombre || '',
    telefono: src.TELEFONO ?? base.telefono ?? '',
    email: src.EMAIL ?? base.email ?? '',
    actividadId,
    codigoActividad: actividadCodigo,
    descripcionActividad:
      src.DESCRIPCION ||
      actividadExpand.DESCRIPCION ||
      actividadExpand.name ||
      base.descripcionActividad ||
      '',
    actividadNombre: actividadExpand.name || base.actividadNombre || '',
    nrc: src.NRC ?? base.nrc ?? '',
    nit: src.NIT ?? base.nit ?? '',
    dui: src.DUI ?? base.dui ?? '',
    departamento: src.DEPTO || deptoExpand.id || base.departamento || '',
    municipio: src.MUNICIP || municipExpand.id || base.municipio || '',
    departamentoNombre: deptoExpand.name || base.departamentoNombre || '',
    municipioNombre: municipExpand.name || base.municipioNombre || '',
    activa: src.ACTIVA ?? base.activa ?? true,
    createdAt: src.CREADA || src.created || base.createdAt || new Date().toISOString(),
    updatedAt: src.ACTUALIZADA || base.updatedAt || null,
  }
}

function validarFormulario(form) {
  const errores = {}
  const formAux = useFormAuxStore()
  if (!form.nombre || !form.nombre.trim()) errores.nombre = 'Nombre requerido'
  if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errores.email = 'Email inválido'
  if (form.nrc) {
    const res = formAux.validarNRC(form.nrc)
    if (!res.ok) errores.nrc = res.error
  }
  if (form.dui) {
    const res = formAux.validarDUI(form.dui)
    if (!res.ok) errores.dui = res.error
  }
  if (form.nit) {
    const res = formAux.validarNIT(form.nit)
    if (!res.ok) errores.nit = res.error
  }
  return errores
}

export const useClientesStore = defineStore('clientes', {
  state: () => ({
    clientes: [],
    cargando: false,
    creando: false,
    actualizando: false,
    eliminando: false,
    eliminandoId: null,
    error: null,
    busquedaActual: '',
    paginaActual: 1,
    totalPaginas: 1,
    totalRegistros: 0,
    porPagina: 50,
  }),
  getters: {
    total: (s) => s.clientes.length,
    filtrados: (s) => (q) => {
      if (!q) return s.clientes
      const qq = q.toLowerCase()
      return s.clientes.filter((c) =>
        ['nombre', 'nrc', 'nit', 'dui', 'email'].some(
          (k) => c[k] && String(c[k]).toLowerCase().includes(qq),
        ),
      )
    },
  },
  actions: {
    setClientes(list) {
      this.clientes = Array.isArray(list) ? [...list] : []
    },
    async cargarClientes(busqueda = '', opciones = {}) {
      this.cargando = true
      this.error = null
      const page = opciones.page ?? String(this.paginaActual)
      const perPage = opciones.perPage ?? String(this.porPagina)
      const sort = opciones.sort ?? '-CREADA'
      const fields = opciones.fields ?? '*'
      const expand = opciones.expand ?? 'CODIGOACTIVIDAD,DEPTO,MUNICIP'
      const body = {
        vc: 'consultaclientes',
        busqueda: busqueda ?? '',
        page,
        perPage,
        sort,
        fields,
        expand,
      }
      try {
        const { data } = await api.post(API_GATEWAY_URL, body, {
          headers: { 'Content-Type': 'application/json' },
        })
        if (!isSuccessResponse(data)) {
          const msg = data?.Mensaje || 'No se pudieron obtener los clientes'
          this.error = msg
          return { ok: false, error: msg }
        }
        const contenidoParseado = parseContenido(data.Contenido)
        const contenedor =
          contenidoParseado &&
          typeof contenidoParseado === 'object' &&
          !Array.isArray(contenidoParseado)
            ? contenidoParseado
            : {}
        const coleccion = (() => {
          if (Array.isArray(data.Contenido)) return data.Contenido
          if (Array.isArray(contenidoParseado)) return contenidoParseado
          if (Array.isArray(contenedor.items)) return contenedor.items
          if (Array.isArray(contenedor.datos)) return contenedor.datos
          if (Array.isArray(contenedor.lista)) return contenedor.lista
          return []
        })()
        const mapped = coleccion.map((item) => mapApiRecordToLocal(item))
        this.busquedaActual = body.busqueda || ''
        const pagina = Number(contenedor.page ?? page) || 1
        const porPaginaNum = Number(contenedor.perPage ?? perPage) || Number(this.porPagina)
        const totalItems =
          Number(
            contenedor.totalItems ??
              contenedor.total_registros ??
              data?.TotalRegistros ??
              data?.totalItems ??
              data?.total_registros ??
              mapped.length,
          ) || mapped.length
        const totalPages =
          Number(
            contenedor.totalPages ??
              contenedor.total_paginas ??
              data?.TotalPaginas ??
              data?.totalPages ??
              data?.total_paginas,
          ) || Math.max(1, Math.ceil(totalItems / (porPaginaNum || 1)))
        this.paginaActual = pagina
        this.totalPaginas = totalPages
        this.totalRegistros = totalItems
        this.porPagina = porPaginaNum || this.porPagina
        this.setClientes(mapped)
        return {
          ok: true,
          items: mapped,
          meta: {
            page: pagina,
            perPage: porPaginaNum || this.porPagina,
            totalItems,
            totalPages,
          },
        }
      } catch (err) {
        const msg = err?.response?.data?.Mensaje || err?.message || 'Error de red'
        this.error = msg
        return { ok: false, error: msg }
      } finally {
        this.cargando = false
      }
    },
    async crearCliente(form) {
      const errores = validarFormulario(form)
      if (Object.keys(errores).length) return { ok: false, errores }

      this.creando = true
      this.error = null
      const body = {
        vc: 'guardarcliente',
        edicion: '0',
        id: form.backendId || '',
        objeto: mapFormToApiObjeto(form),
      }
      try {
        const { data } = await api.post(API_GATEWAY_URL, body, {
          headers: { 'Content-Type': 'application/json' },
        })
        if (!isSuccessResponse(data)) {
          const msg = data?.Mensaje || 'No se pudo guardar el cliente'
          this.error = msg
          return { ok: false, error: msg }
        }
        const parsed = parseContenido(data.Contenido)
        const record = parsed?.record || parsed || null
        const codigosExistentes = this.clientes.map((c) => c.codigo).filter(Boolean)
        let item = mapApiRecordToLocal(record, form)
        if (!item.codigo || item.codigo.startsWith('tmp-')) {
          const nuevoCodigo = generarCodigoCliente(codigosExistentes)
          if (nuevoCodigo.ok) {
            codigosExistentes.push(nuevoCodigo.valor)
            item = { ...item, codigo: nuevoCodigo.valor }
          }
        }
        const idx = this.clientes.findIndex(
          (c) => c.backendId && item.backendId && c.backendId === item.backendId,
        )
        if (idx !== -1) this.clientes.splice(idx, 1, item)
        else this.clientes.push(item)
        this.totalRegistros += idx === -1 ? 1 : 0
        return { ok: true, item }
      } catch (err) {
        const msg = err?.response?.data?.Mensaje || err?.message || 'Error de red'
        this.error = msg
        return { ok: false, error: msg }
      } finally {
        this.creando = false
      }
    },
    async actualizar(codigo, form) {
      const errores = validarFormulario(form)
      if (Object.keys(errores).length) return { ok: false, errores }

      const actual = this.clientes.find(
        (c) =>
          (codigo && c.codigo === codigo) || (form.backendId && c.backendId === form.backendId),
      )
      const backendId = form.backendId || actual?.backendId
      if (!backendId)
        return { ok: false, error: 'No se encontró identificador remoto para actualizar' }

      this.actualizando = true
      this.error = null
      const body = {
        vc: 'guardarcliente',
        edicion: '1',
        id: backendId,
        objeto: mapFormToApiObjeto({ ...actual, ...form, backendId }),
      }
      try {
        const { data } = await api.post(API_GATEWAY_URL, body, {
          headers: { 'Content-Type': 'application/json' },
        })
        if (!isSuccessResponse(data)) {
          const msg = data?.Mensaje || 'No se pudo actualizar el cliente'
          this.error = msg
          return { ok: false, error: msg }
        }
        const parsed = parseContenido(data.Contenido)
        const record = parsed?.record || parsed || null
        const item = mapApiRecordToLocal(record, actual || form)
        const idx = this.clientes.findIndex((c) => c.backendId === backendId)
        if (idx !== -1) this.clientes.splice(idx, 1, item)
        else this.clientes.push(item)
        if (idx === -1) this.totalRegistros += 1
        return { ok: true, item }
      } catch (err) {
        const msg = err?.response?.data?.Mensaje || err?.message || 'Error de red'
        this.error = msg
        return { ok: false, error: msg }
      } finally {
        this.actualizando = false
      }
    },
    actualizarPagina(page) {
      this.paginaActual = Number(page) || 1
    },
    actualizarBusqueda(busqueda) {
      this.busquedaActual = busqueda ?? ''
    },
    async obtenerClientePorId(criterio, { sincronizar = false } = {}) {
      const busqueda =
        typeof criterio === 'string'
          ? criterio
          : criterio?.backendId || criterio?.id || criterio?.codigo || null
      if (!busqueda) return { ok: false, error: 'Identificador requerido' }

      const body = {
        vc: 'consultaclientes',
        busqueda,
        page: '1',
        perPage: '1',
        sort: '-CREADA',
        fields: '*',
        expand: 'CODIGOACTIVIDAD,DEPTO,MUNICIP',
      }

      try {
        const { data } = await api.post(API_GATEWAY_URL, body, {
          headers: { 'Content-Type': 'application/json' },
        })
        if (!isSuccessResponse(data)) {
          const msg = data?.Mensaje || 'No se encontró el cliente solicitado'
          return { ok: false, error: msg }
        }
        const contenidoParseado = parseContenido(data.Contenido)
        const contenedor =
          contenidoParseado &&
          typeof contenidoParseado === 'object' &&
          !Array.isArray(contenidoParseado)
            ? contenidoParseado
            : {}
        const coleccion = (() => {
          if (Array.isArray(data.Contenido)) return data.Contenido
          if (Array.isArray(contenidoParseado)) return contenidoParseado
          if (Array.isArray(contenedor.items)) return contenedor.items
          if (Array.isArray(contenedor.datos)) return contenedor.datos
          if (Array.isArray(contenedor.lista)) return contenedor.lista
          return []
        })()
        if (!coleccion.length) return { ok: false, error: 'Cliente no disponible' }
        const item = mapApiRecordToLocal(coleccion[0])
        if (sincronizar) {
          const idx = this.clientes.findIndex(
            (c) =>
              (item.backendId && c.backendId === item.backendId) ||
              (item.codigo && c.codigo === item.codigo),
          )
          if (idx !== -1) this.clientes.splice(idx, 1, item)
        }
        return { ok: true, item }
      } catch (err) {
        const msg = err?.response?.data?.Mensaje || err?.message || 'Error de red'
        return { ok: false, error: msg }
      }
    },
    async eliminarCliente(criterio) {
      const targetCodigo = typeof criterio === 'string' ? criterio : criterio?.codigo || null
      const targetBackendId =
        typeof criterio === 'object' && criterio?.backendId
          ? criterio.backendId
          : typeof criterio === 'string'
            ? null
            : null
      const cliente = this.clientes.find((c) => {
        if (targetBackendId && c.backendId === targetBackendId) return true
        if (targetCodigo && c.codigo === targetCodigo) return true
        if (
          typeof criterio === 'object' &&
          criterio?.backendId &&
          c.backendId === criterio.backendId
        )
          return true
        return false
      })
      const backendId = targetBackendId || cliente?.backendId
      if (!backendId)
        return { ok: false, error: 'No se encontró identificador remoto para eliminar' }

      const referencia = backendId || targetCodigo || cliente?.codigo || null

      this.eliminando = true
      this.eliminandoId = referencia
      this.error = null
      const body = {
        vc: 'eliminarcliente',
        id: backendId,
      }

      try {
        const { data } = await api.post(API_GATEWAY_URL, body, {
          headers: { 'Content-Type': 'application/json' },
        })
        if (!isSuccessResponse(data)) {
          const msg = data?.Mensaje || 'No se pudo eliminar el cliente'
          this.error = msg
          return { ok: false, error: msg }
        }

        const idx = this.clientes.findIndex(
          (c) => c.backendId === backendId || (targetCodigo && c.codigo === targetCodigo),
        )
        const eliminado = idx !== -1 ? this.clientes.splice(idx, 1)[0] : cliente || null
        const nuevoTotal = Math.max(0, this.totalRegistros - 1)
        this.totalRegistros = nuevoTotal
        const nuevoTotalPaginas = Math.max(1, Math.ceil(nuevoTotal / (this.porPagina || 1)))
        this.totalPaginas = nuevoTotalPaginas
        if (this.paginaActual > nuevoTotalPaginas) this.paginaActual = nuevoTotalPaginas

        return { ok: true, item: eliminado }
      } catch (err) {
        const msg = err?.response?.data?.Mensaje || err?.message || 'Error de red'
        this.error = msg
        return { ok: false, error: msg }
      } finally {
        this.eliminando = false
        this.eliminandoId = null
      }
    },
  },
})
