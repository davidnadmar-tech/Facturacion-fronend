<script setup>
import { reactive, ref, computed, watch, onMounted } from 'vue'
import { useInventarioItemsStore } from '@/stores/inventarioItems'
import { useCatalogosStore } from '@/stores/catalogos'
import { useFormAuxStore } from '@/stores/formAux'

const inventarioStore = useInventarioItemsStore()
const catalogosStore = useCatalogosStore()
const formAuxStore = useFormAuxStore()

const filtroBusqueda = ref('')
const filtroTipo = ref('')
const perPageOptions = [10, 25, 50]
const perPageSeleccionado = ref(String(inventarioStore.porPagina || 25))

const mostrarForm = ref(false)
const editId = ref(null)

// Variables para modal de edición
const modalEditarVisible = ref(false)
const editFeedback = ref(null)
const editProcesando = ref(false)
const itemEditando = ref(null)

const selectedId = ref(null)
const modalContexto = ref(null)
const modalAbierto = ref(false)
const detalleEditable = ref([])
const detalleEdicion = ref([])
const detalleEdicionFeedback = ref(null)
const modalFeedback = ref(null)
const enviando = ref(false)
const errorDetalle = ref(null)
const codigoRegex = /^[A-Z0-9]{8}$/

const mostrarModalEliminar = ref(false)
const itemAEliminar = ref(null)
const eliminando = computed(() => inventarioStore.eliminando)
const eliminandoId = computed(() => inventarioStore.eliminandoId)

const items = computed(() => inventarioStore.itemsOrdenados || [])
const totalItems = computed(() => {
  const remoto = Number(inventarioStore.totalItems) || 0
  if (remoto > 0) return remoto
  return items.value.length
})

const paginaActual = computed(() => inventarioStore.paginaActual)
const totalPaginas = computed(() => inventarioStore.totalPaginas)
const porPagina = computed(() => inventarioStore.porPagina)
const cargando = computed(() => inventarioStore.cargando)
const errorCarga = computed(() => inventarioStore.error)

const itemSeleccionado = computed(() => {
  if (!selectedId.value) return null
  return items.value.find((item) => String(item.id) === String(selectedId.value)) || null
})

const detalleListado = computed(() => {
  const item = itemSeleccionado.value
  if (!item?.DATA_OBJETO?.DETALLE) return []
  return item.DATA_OBJETO.DETALLE.map((detalle, index) => ({
    ...detalle,
    fila: index + 1,
  }))
})

const totalActivos = computed(
  () => detalleListado.value.filter((detalle) => Boolean(detalle.ACTIVO)).length,
)

const tiposDisponibles = computed(() => catalogosStore.tiposItemsOrdenados || [])
const cargandoTipos = computed(() => catalogosStore.tiposItemsCargando)

const tiposFiltro = computed(() => {
  const set = new Set()
  tiposDisponibles.value.forEach((tipo) => {
    if (tipo?.name) set.add(String(tipo.name).toUpperCase())
  })
  items.value.forEach((item) => {
    if (item?.TIPO) set.add(String(item.TIPO).toUpperCase())
  })
  return Array.from(set).sort()
})

const registrosPagina = computed(() => items.value.length)
const rangoInicio = computed(() => {
  if (!registrosPagina.value) return 0
  return (paginaActual.value - 1) * (porPagina.value || 1) + 1
})
const rangoFin = computed(() => {
  if (!registrosPagina.value) return 0
  return rangoInicio.value + registrosPagina.value - 1
})
const mostrarResumen = computed(() => registrosPagina.value > 0)
const puedeRetroceder = computed(() => paginaActual.value > 1)
const puedeAvanzar = computed(() => paginaActual.value < totalPaginas.value)
const busquedaActiva = computed(() => Boolean(inventarioStore.busquedaActual))
const tipoActivo = computed(() => Boolean(inventarioStore.tipoActual))

const nuevoItem = reactive({
  ACTIVA: true,
  DESCRIPCION: '',
  REL_TIPO_ITEM: '',
  TIPO: '',
  CODE: '',
  name: '',
  DATA_OBJETO: {
    DETALLE: [],
  },
})

const detalleNuevoMonto = computed(() =>
  nuevoItem.DATA_OBJETO.DETALLE.reduce((acc, detalle) => {
    const monto = Number.parseFloat(detalle.MONTO || 0) || 0
    const cantidad = Number.parseInt(detalle.CANTIDAD, 10) || 0
    return acc + monto * cantidad
  }, 0),
)

const detalleNuevoResumen = computed(() =>
  Array.isArray(nuevoItem.DATA_OBJETO?.DETALLE) ? nuevoItem.DATA_OBJETO.DETALLE.length : 0,
)

const detalleEdicionStats = computed(() => {
  const lista = detalleEdicion.value
  const total = lista.length
  const monto = lista.reduce((acc, detalle) => {
    const montoDetalle = Number.parseFloat(detalle.MONTO || 0) || 0
    const cantidad = Number.parseInt(detalle.CANTIDAD, 10) || 0
    return acc + montoDetalle * cantidad
  }, 0)
  const activos = lista.filter((detalle) => Boolean(detalle.ACTIVO)).length
  return { total, monto, activos }
})

const feedbackCreacion = ref(null)
const erroresCreacion = reactive({})

const totalMonto = computed(() =>
  detalleListado.value.reduce((acc, detalle) => {
    const monto = Number.parseFloat(detalle.MONTO || 0) || 0
    const cantidad = Number.parseInt(detalle.CANTIDAD, 10) || 0
    return acc + monto * cantidad
  }, 0),
)

function generarUidDetalle(prefijo = 'detalle') {
  return `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function construirFilaDetalleBase(overrides = {}) {
  return {
    _uid: overrides._uid || generarUidDetalle('detalle'),
    TEXTO: '',
    MONTO: 0,
    CANTIDAD: 1,
    HORA: '00:00:00',
    GRACIA: '00:00:00',
    ACTIVO: true,
    ...overrides,
  }
}

function transformarValorActivo(valor, fallback = true) {
  if (typeof valor === 'boolean') return valor
  if (typeof valor === 'number') return valor !== 0
  if (typeof valor === 'string') {
    const normalizado = valor.trim().toLowerCase()
    if (!normalizado) return fallback
    if (['0', 'false', 'inactivo', 'no'].includes(normalizado)) return false
    if (['1', 'true', 'activo', 'sí', 'si', 'yes'].includes(normalizado)) return true
  }
  if (valor == null) return fallback
  return Boolean(valor)
}

function mapearDetalleEditable(detalles = []) {
  return detalles.map((detalle) => {
    const cantidad = Number.parseInt(detalle?.CANTIDAD, 10)
    const monto = Number.parseFloat(detalle?.MONTO)
    return construirFilaDetalleBase({
      TEXTO: detalle?.TEXTO || '',
      MONTO: Number.isNaN(monto) ? 0 : monto,
      CANTIDAD: Number.isNaN(cantidad) ? 1 : cantidad,
      HORA: detalle?.HORA || '00:00:00',
      GRACIA: detalle?.GRACIA || '00:00:00',
      ACTIVO: transformarValorActivo(detalle?.ACTIVO, true),
    })
  })
}

function normalizarListaDetalle(lista = []) {
  return lista.map((fila) => ({
    TEXTO: String(fila?.TEXTO || '').trim(),
    MONTO: Number.parseFloat(fila?.MONTO) || 0,
    CANTIDAD: Number.parseInt(fila?.CANTIDAD, 10) || 0,
    HORA: fila?.HORA || '00:00:00',
    GRACIA: fila?.GRACIA || '00:00:00',
    ACTIVO: transformarValorActivo(fila?.ACTIVO, false),
  }))
}

function validarListaDetalles(lista = []) {
  if (!lista.length) {
    return { ok: false, error: 'Configura al menos un detalle para el item.' }
  }

  const detalleInvalido = lista.some((detalle) => {
    const texto = detalle?.TEXTO ? String(detalle.TEXTO).trim() : ''
    const monto = Number.parseFloat(detalle?.MONTO)
    const cantidad = Number.parseInt(detalle?.CANTIDAD, 10)
    return !texto || Number.isNaN(monto) || monto <= 0 || Number.isNaN(cantidad) || cantidad <= 0
  })

  if (detalleInvalido) {
    return {
      ok: false,
      error: 'Cada detalle debe incluir texto, monto (>0) y cantidad (>0).',
    }
  }

  return { ok: true }
}

// function formatearFecha(fecha) {
//   if (!fecha) return 'Sin registro'
//   const valor = new Date(fecha)
//   if (Number.isNaN(valor.getTime())) return 'Sin registro'
//   return new Intl.DateTimeFormat('es-SV', {
//     dateStyle: 'medium',
//     timeStyle: 'short',
//   }).format(valor)
// }

function formatearMonto(valor) {
  const numero = Number.parseFloat(valor || 0)
  if (Number.isNaN(numero)) return '$0.00'
  return new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(numero)
}

function mostrarTipo(item) {
  if (!item) return 'Sin categoría'
  const rel = item.expand?.REL_TIPO_ITEM
  if (rel?.name) return rel.name
  if (item.TIPO) return item.TIPO
  return 'Sin categoría'
}

function mostrarRelacion(item) {
  if (!item) return '—'
  const rel = item.expand?.REL_TIPO_ITEM
  if (rel?.id) return rel.id
  return item.REL_TIPO_ITEM || '—'
}

function mostrarTipoSeleccionado(item) {
  if (!item) return 'Sin asignar'

  // Si tenemos REL_TIPO_ITEM, buscar el tipo en la lista
  if (item.REL_TIPO_ITEM) {
    const tipo = tiposDisponibles.value.find((t) => t.id === item.REL_TIPO_ITEM)
    if (tipo) return tipo.name
  }

  // Fallback al campo TIPO
  return item.TIPO || 'Sin asignar'
}

function seleccionarItemPorDefecto() {
  const lista = items.value
  if (!lista.length) {
    selectedId.value = null
    return
  }
  if (!selectedId.value || !lista.some((item) => String(item.id) === String(selectedId.value))) {
    selectedId.value = lista[0].id
  }
}

async function cargarCatalogos() {
  if (!catalogosStore.tiposItemsCargados && !catalogosStore.tiposItemsCargando) {
    await catalogosStore.cargarTiposItems({ perPage: '200' })
  }
}

async function cargarInventario({ page, perPage } = {}) {
  const respuesta = await inventarioStore.cargarItems(filtroBusqueda.value, {
    page,
    perPage,
    tipo: filtroTipo.value || undefined,
  })
  if (respuesta.ok) seleccionarItemPorDefecto()
  return respuesta
}

async function inicializar() {
  await cargarCatalogos()
  await cargarInventario({ page: '1' })
}

onMounted(() => {
  inicializar()
})

watch(
  () => items.value,
  () => {
    seleccionarItemPorDefecto()
  },
  { immediate: true },
)

watch(
  () => inventarioStore.porPagina,
  (valor) => {
    perPageSeleccionado.value = String(valor || 25)
  },
  { immediate: true },
)

watch(
  () => nuevoItem.REL_TIPO_ITEM,
  (valor) => {
    if (!valor) {
      nuevoItem.TIPO = ''
      return
    }
    const tipo = tiposDisponibles.value.find((item) => String(item.id) === String(valor))
    nuevoItem.TIPO = tipo && tipo.name ? String(tipo.name).toUpperCase() : ''
  },
)

watch(
  detalleEdicion,
  (lista) => {
    if (!itemEditando.value) return
    const detalleNormalizado = normalizarListaDetalle(lista)
    itemEditando.value.DATA_OBJETO = {
      ...(itemEditando.value.DATA_OBJETO && typeof itemEditando.value.DATA_OBJETO === 'object'
        ? { ...itemEditando.value.DATA_OBJETO }
        : {}),
      DETALLE: detalleNormalizado,
    }
  },
  { deep: true },
)

watch(
  () => nuevoItem.CODE,
  (valor) => {
    if (typeof valor !== 'string' || !valor) return
    const limpio = valor.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (limpio !== valor) {
      nuevoItem.CODE = limpio
    }
  },
)

function limpiarErroresCreacion() {
  Object.keys(erroresCreacion).forEach((clave) => delete erroresCreacion[clave])
}

function generarCodigoItem() {
  const resultado = formAuxStore.generarCodigo({ regex: codigoRegex, longitud: 8 })
  if (resultado.ok && resultado.valor) {
    nuevoItem.CODE = resultado.valor
    if (feedbackCreacion.value?.tipo === 'error') feedbackCreacion.value = null
    delete erroresCreacion.CODE
    return
  }
  feedbackCreacion.value = {
    tipo: 'error',
    msg: resultado.error || 'No se pudo generar un código válido',
  }
}

function limpiarNuevoItem() {
  Object.assign(nuevoItem, {
    ACTIVA: true,
    DESCRIPCION: '',
    REL_TIPO_ITEM: '',
    TIPO: '',
    CODE: '',
    name: '',
    DATA_OBJETO: {
      DETALLE: [],
    },
  })
  limpiarErroresCreacion()
  errorDetalle.value = null
  feedbackCreacion.value = null
  editId.value = null
}

function seleccionarItem(id) {
  if (!id) return
  selectedId.value = id
}

function abrirNuevo() {
  limpiarNuevoItem()
  mostrarForm.value = true
}

function verDetallesItem(item) {
  if (!item) return
  seleccionarItem(item.id)
  abrirModal({ contexto: 'existente' })
}

async function abrirModalEditar(item) {
  if (!item) return
  editFeedback.value = null
  editProcesando.value = false

  // Clonar el item para edición sin afectar el original
  itemEditando.value = {
    ...item,
    // Asegurar que los datos estén disponibles
    ACTIVA: Boolean(item.ACTIVA),
    DESCRIPCION: item.DESCRIPCION || '',
    TIPO: item.TIPO || '',
    REL_TIPO_ITEM: item.REL_TIPO_ITEM || '',
    CODE: item.CODE || '',
    name: item.name || '',
    DATA_OBJETO: item.DATA_OBJETO || { DETALLE: [] },
  }

  inicializarDetalleEdicion(itemEditando.value)
  detalleEdicionFeedback.value = null

  modalEditarVisible.value = true
}
function cerrarModalEditar(force = false) {
  if (editProcesando.value && !force) return
  modalEditarVisible.value = false
  itemEditando.value = null
  editFeedback.value = null
  editProcesando.value = false
  detalleEdicion.value = []
  detalleEdicionFeedback.value = null
}

function actualizarTipoProducto() {
  if (!itemEditando.value || !itemEditando.value.REL_TIPO_ITEM) {
    itemEditando.value.TIPO = ''
    return
  }

  // Buscar el tipo seleccionado y actualizar el campo TIPO
  const tipoSeleccionado = tiposDisponibles.value.find(
    (tipo) => tipo.id === itemEditando.value.REL_TIPO_ITEM,
  )

  if (tipoSeleccionado) {
    itemEditando.value.TIPO = tipoSeleccionado.name
  }
}

async function guardarEdicionProducto() {
  if (!itemEditando.value || editProcesando.value) return

  if (!validarDetallesEdicion()) {
    return
  }

  editProcesando.value = true
  editFeedback.value = null

  const detallesNormalizados = normalizarListaDetalle(detalleEdicion.value)
  const dataObjeto = {
    ...(itemEditando.value.DATA_OBJETO && typeof itemEditando.value.DATA_OBJETO === 'object'
      ? { ...itemEditando.value.DATA_OBJETO }
      : {}),
    DETALLE: detallesNormalizados,
  }

  const payload = {
    ACTIVA: itemEditando.value.ACTIVA,
    DESCRIPCION: itemEditando.value.DESCRIPCION || '',
    TIPO: itemEditando.value.TIPO || '',
    REL_TIPO_ITEM: itemEditando.value.REL_TIPO_ITEM || '',
    CODE: itemEditando.value.CODE || '',
    name: itemEditando.value.name || '',
    DATA_OBJETO: dataObjeto,
  }

  try {
    const respuesta = await inventarioStore.editarItem(itemEditando.value.id, payload, {
      refrescar: true,
    })

    if (!respuesta.ok) {
      editFeedback.value = {
        tipo: 'error',
        msg: respuesta.error || 'No se pudo actualizar el producto',
      }
      return
    }

    // Recargar inventario para reflejar cambios
    await cargarInventario({ page: String(paginaActual.value) })

    // Cerrar modal y mostrar mensaje de éxito
    cerrarModalEditar(true)
    feedbackCreacion.value = { tipo: 'ok', msg: 'Producto actualizado correctamente' }

    // Mantener selección en el item editado
    if (respuesta.item?.id) {
      selectedId.value = respuesta.item.id
    }
  } catch (error) {
    editFeedback.value = {
      tipo: 'error',
      msg: error.message || 'Error inesperado al actualizar el producto',
    }
  } finally {
    editProcesando.value = false
  }
}

function alternarEstadoNuevoItem() {
  if (enviando.value) return
  nuevoItem.ACTIVA = !nuevoItem.ACTIVA
}

function agregarFila() {
  detalleEditable.value = [...detalleEditable.value, construirFilaDetalleBase()]
}

function eliminarFila(uid) {
  detalleEditable.value = detalleEditable.value.filter((fila) => fila._uid !== uid)
  if (!detalleEditable.value.length) agregarFila()
}

function actualizarCampo(uid, campo, valor) {
  detalleEditable.value = detalleEditable.value.map((fila) => {
    if (fila._uid !== uid) return fila
    if (campo === 'ACTIVO') {
      return { ...fila, [campo]: Boolean(valor) }
    }
    if (campo === 'CANTIDAD') {
      const cantidad = Number.parseInt(valor, 10)
      return { ...fila, [campo]: Number.isNaN(cantidad) ? 0 : cantidad }
    }
    if (campo === 'MONTO') {
      const monto = Number.parseFloat(valor)
      return { ...fila, [campo]: Number.isNaN(monto) ? 0 : monto }
    }
    return { ...fila, [campo]: valor }
  })
}

function alternarActivo(uid) {
  detalleEditable.value = detalleEditable.value.map((fila) =>
    fila._uid === uid ? { ...fila, ACTIVO: !fila.ACTIVO } : fila,
  )
}

function inicializarDetalleEdicion(item) {
  const detalles = Array.isArray(item?.DATA_OBJETO?.DETALLE) ? item.DATA_OBJETO.DETALLE : []
  const lista = mapearDetalleEditable(detalles)
  detalleEdicion.value = lista.length ? lista : [construirFilaDetalleBase()]
}

function agregarFilaEdicion() {
  detalleEdicion.value = [...detalleEdicion.value, construirFilaDetalleBase()]
  detalleEdicionFeedback.value = null
}

function eliminarFilaEdicion(uid) {
  detalleEdicion.value = detalleEdicion.value.filter((fila) => fila._uid !== uid)
  if (!detalleEdicion.value.length) {
    agregarFilaEdicion()
  }
  detalleEdicionFeedback.value = null
}

function actualizarCampoEdicion(uid, campo, valor) {
  detalleEdicion.value = detalleEdicion.value.map((fila) => {
    if (fila._uid !== uid) return fila
    if (campo === 'ACTIVO') {
      return { ...fila, [campo]: Boolean(valor) }
    }
    if (campo === 'CANTIDAD') {
      const cantidad = Number.parseInt(valor, 10)
      return { ...fila, [campo]: Number.isNaN(cantidad) ? 0 : cantidad }
    }
    if (campo === 'MONTO') {
      const monto = Number.parseFloat(valor)
      return { ...fila, [campo]: Number.isNaN(monto) ? 0 : monto }
    }
    return { ...fila, [campo]: valor }
  })
  detalleEdicionFeedback.value = null
}

function alternarActivoEdicion(uid) {
  detalleEdicion.value = detalleEdicion.value.map((fila) =>
    fila._uid === uid ? { ...fila, ACTIVO: !fila.ACTIVO } : fila,
  )
  detalleEdicionFeedback.value = null
}

function validarDetallesEdicion() {
  const resultado = validarListaDetalles(detalleEdicion.value)
  if (!resultado.ok) {
    detalleEdicionFeedback.value = { tipo: 'error', msg: resultado.error }
    return false
  }
  detalleEdicionFeedback.value = null
  return true
}

function validarDetalles() {
  const resultado = validarListaDetalles(detalleEditable.value)
  if (!resultado.ok) {
    modalFeedback.value = { tipo: 'error', msg: resultado.error }
    return false
  }
  modalFeedback.value = null
  return true
}

function abrirModal({ contexto = 'existente' } = {}) {
  modalFeedback.value = null
  if (contexto === 'nuevo') {
    modalContexto.value = { tipo: 'nuevo' }
    const detalles = nuevoItem.DATA_OBJETO?.DETALLE || []
    detalleEditable.value = mapearDetalleEditable(detalles)
    modalAbierto.value = true
    if (!detalleEditable.value.length) agregarFila()
    return
  }
  const item = itemSeleccionado.value
  if (!item) return
  modalContexto.value = { tipo: 'existente', id: item.id }
  const detalles = Array.isArray(item.DATA_OBJETO?.DETALLE) ? item.DATA_OBJETO.DETALLE : []
  detalleEditable.value = mapearDetalleEditable(detalles)
  modalAbierto.value = true
  if (!detalleEditable.value.length) agregarFila()
}

function cerrarModal() {
  modalAbierto.value = false
  modalFeedback.value = null
  detalleEditable.value = []
  modalContexto.value = null
}

function guardarCambios() {
  if (!validarDetalles()) return
  const detalles = normalizarListaDetalle(
    detalleEditable.value.map((fila) => {
      const detalle = { ...fila }
      delete detalle._uid
      return detalle
    }),
  )
  if (modalContexto.value?.tipo === 'nuevo') {
    nuevoItem.DATA_OBJETO = { ...nuevoItem.DATA_OBJETO, DETALLE: detalles }
    errorDetalle.value = null
    cerrarModal()
    return
  }
  if (modalContexto.value?.tipo === 'existente') {
    const objetivo = modalContexto.value.id
    const resultado = inventarioStore.actualizarDetalleLocal(objetivo, detalles)
    if (!resultado.ok) {
      modalFeedback.value = {
        tipo: 'error',
        msg: resultado.error || 'No se pudo actualizar el item',
      }
      return
    }
    errorDetalle.value = null
  }
  cerrarModal()
}

function validarNuevoItem() {
  let valido = true
  limpiarErroresCreacion()
  errorDetalle.value = null

  const nombre = nuevoItem.name ? nuevoItem.name.trim() : ''
  const descripcion = nuevoItem.DESCRIPCION ? nuevoItem.DESCRIPCION.trim() : ''
  const codigo = nuevoItem.CODE ? nuevoItem.CODE.trim() : ''

  if (!nombre) {
    erroresCreacion.name = 'Nombre requerido'
    valido = false
  }

  if (!descripcion) {
    erroresCreacion.DESCRIPCION = 'Descripción requerida'
    valido = false
  }

  if (!nuevoItem.REL_TIPO_ITEM) {
    erroresCreacion.REL_TIPO_ITEM = 'Selecciona un tipo'
    valido = false
  }

  if (!codigo) {
    erroresCreacion.CODE = 'Código requerido'
    valido = false
  } else if (!codigoRegex.test(codigo)) {
    erroresCreacion.CODE = 'Código inválido (8 caracteres alfanuméricos)'
    valido = false
  }

  const detalles = Array.isArray(nuevoItem.DATA_OBJETO?.DETALLE)
    ? nuevoItem.DATA_OBJETO.DETALLE
    : []

  const validacionDetalles = validarListaDetalles(detalles)
  if (!validacionDetalles.ok) {
    errorDetalle.value = validacionDetalles.error
    valido = false
  }

  return valido
}

async function registrarItem() {
  feedbackCreacion.value = null
  if (!validarNuevoItem()) {
    feedbackCreacion.value = { tipo: 'error', msg: 'Revisa los campos marcados' }
    return
  }

  const detallesNormalizados = normalizarListaDetalle(nuevoItem.DATA_OBJETO.DETALLE)

  const dataObjeto = {
    ...(nuevoItem.DATA_OBJETO && typeof nuevoItem.DATA_OBJETO === 'object'
      ? { ...nuevoItem.DATA_OBJETO }
      : {}),
    DETALLE: detallesNormalizados,
  }

  const objetoBase = {
    CODE: nuevoItem.CODE.trim(),
    TIPO: nuevoItem.TIPO || '',
    name: nuevoItem.name.trim(),
    DESCRIPCION: nuevoItem.DESCRIPCION.trim(),
    ACTIVA: Boolean(nuevoItem.ACTIVA),
    REL_TIPO_ITEM: nuevoItem.REL_TIPO_ITEM,
  }
  const objeto = editId.value
    ? {
        ...objetoBase,
        // En edición, preferimos el detalle actual del item seleccionado (si existe)
        DATA_OBJETO: (itemSeleccionado.value && itemSeleccionado.value.DATA_OBJETO) || dataObjeto,
      }
    : { ...objetoBase, DATA_OBJETO: dataObjeto }

  enviando.value = true
  try {
    const respuesta = editId.value
      ? await inventarioStore.editarItem(editId.value, objeto, { refrescar: true })
      : await inventarioStore.crearItem(objeto, { refrescar: true })
    if (!respuesta.ok) {
      feedbackCreacion.value = {
        tipo: 'error',
        msg:
          respuesta.error ||
          (editId.value ? 'No se pudo actualizar el item' : 'No se pudo guardar el item'),
      }
      return
    }

    feedbackCreacion.value = {
      tipo: 'ok',
      msg: editId.value ? 'Item actualizado correctamente' : 'Item guardado correctamente',
    }

    if (respuesta.item?.id) {
      selectedId.value = respuesta.item.id
    } else {
      seleccionarItemPorDefecto()
    }

    if (editId.value) {
      // Mantener el formulario abierto pero en modo creación tras editar
      const idEditado = editId.value
      limpiarNuevoItem()
      editId.value = null
      mostrarForm.value = false
      // volver a seleccionar el item editado
      selectedId.value = idEditado
    } else {
      limpiarNuevoItem()
    }
  } catch (error) {
    const msg = error?.message || 'Error inesperado al guardar el item'
    feedbackCreacion.value = { tipo: 'error', msg }
  } finally {
    enviando.value = false
  }
}

async function buscarItems() {
  await cargarInventario({ page: '1' })
}

async function aplicarFiltroTipo() {
  await cargarInventario({ page: '1' })
}

async function paginaAnterior() {
  if (!puedeRetroceder.value || cargando.value) return
  await cargarInventario({ page: String(paginaActual.value - 1) })
}

async function paginaSiguiente() {
  if (!puedeAvanzar.value || cargando.value) return
  await cargarInventario({ page: String(paginaActual.value + 1) })
}

async function irPrimerPagina() {
  if (!puedeRetroceder.value || cargando.value) return
  await cargarInventario({ page: '1' })
}

async function irUltimaPagina() {
  if (!puedeAvanzar.value || cargando.value) return
  await cargarInventario({ page: String(totalPaginas.value) })
}

async function onPerPageChange(event) {
  const valor = Number(event.target.value)
  if (!valor || valor === porPagina.value) {
    perPageSeleccionado.value = String(porPagina.value)
    return
  }
  perPageSeleccionado.value = String(valor)
  await cargarInventario({ page: '1', perPage: String(valor) })
}

function abrirConfirmacion(item) {
  itemAEliminar.value = item
  mostrarModalEliminar.value = true
}

function cerrarModalEliminar() {
  if (eliminando.value) return
  mostrarModalEliminar.value = false
  itemAEliminar.value = null
}

function estaEliminando(item) {
  if (!item) return false
  return String(eliminandoId.value || '') === String(item.id || '')
}

async function confirmarEliminacion() {
  if (!itemAEliminar.value || eliminando.value) return
  const objetivo = itemAEliminar.value
  mostrarModalEliminar.value = false
  const res = await inventarioStore.eliminarItem(objetivo.id)
  if (!res.ok) {
    feedbackCreacion.value = { tipo: 'error', msg: res.error || 'No se pudo eliminar' }
    return
  }
  // Si la lista queda vacía en la página actual, recargar página previa si aplica
  if (items.value.length === 0 && paginaActual.value > 1) {
    await cargarInventario({ page: String(paginaActual.value - 1) })
  } else {
    await cargarInventario({ page: String(paginaActual.value) })
  }
  seleccionarItemPorDefecto()
  feedbackCreacion.value = { tipo: 'ok', msg: 'Item eliminado' }
}
</script>

<template>
  <div class="inventario-view fade-in">
    <section class="hero surface-soft elev-1" aria-label="Resumen inventario">
      <div class="hero-text">
        <h2 class="title">Inventario · Items</h2>
        <p class="subtitle text-muted">
          Gestiona la configuración local y consulta el inventario disponible desde la API.
        </p>
      </div>
      <div class="hero-actions">
        <span class="count-chip">{{ totalItems }} {{ totalItems === 1 ? 'item' : 'items' }}</span>
        <button class="btn btn-primary" type="button" @click="abrirNuevo">Nuevo item</button>
        <button
          class="btn btn-outline"
          type="button"
          :disabled="!itemSeleccionado || cargando"
          @click="abrirModal({ contexto: 'existente' })"
        >
          Configurar detalle seleccionado
        </button>
      </div>
    </section>

    <section
      v-show="mostrarForm && !editId"
      class="form-card surface-card elev-2"
      aria-label="Formulario nuevo item"
    >
      <header class="form-head">
        <div>
          <h3>Nuevo item de inventario</h3>
          <small class="text-muted upper">Se guardará en FacturaPro</small>
        </div>
        <div class="detail-pill">
          <span
            >{{ detalleNuevoResumen }}
            {{ detalleNuevoResumen === 1 ? 'detalle' : 'detalles' }}</span
          >
          <span class="text-muted">{{ formatearMonto(detalleNuevoMonto) }}</span>
        </div>
      </header>
      <form class="grid-form" @submit.prevent="registrarItem">
        <div class="f-group span-2" :class="{ error: erroresCreacion.name }">
          <label>Nombre *</label>
          <input type="text" v-model.trim="nuevoItem.name" placeholder="Nombre visible del item" />
          <span v-if="erroresCreacion.name" class="err-msg">{{ erroresCreacion.name }}</span>
        </div>
        <div class="f-group span-3" :class="{ error: erroresCreacion.DESCRIPCION }">
          <label>Descripción *</label>
          <textarea
            v-model.trim="nuevoItem.DESCRIPCION"
            rows="3"
            placeholder="Describe el item y su finalidad"
          ></textarea>
          <span v-if="erroresCreacion.DESCRIPCION" class="err-msg">
            {{ erroresCreacion.DESCRIPCION }}
          </span>
        </div>
        <div class="f-group" :class="{ error: erroresCreacion.REL_TIPO_ITEM }">
          <label>Tipo relacionado *</label>
          <select v-model="nuevoItem.REL_TIPO_ITEM" :disabled="enviando">
            <option value="">Seleccionar</option>
            <option v-for="tipo in tiposDisponibles" :key="tipo.id" :value="tipo.id">
              {{ tipo.name }}
            </option>
          </select>
          <span v-if="erroresCreacion.REL_TIPO_ITEM" class="err-msg">
            {{ erroresCreacion.REL_TIPO_ITEM }}
          </span>
        </div>
        <div class="f-group">
          <label>Categoría</label>
          <input
            type="text"
            v-model="nuevoItem.TIPO"
            placeholder="Autocompletado por tipo"
            readonly
          />
        </div>
        <div class="f-group" :class="{ error: erroresCreacion.CODE }">
          <label>Código *</label>
          <div class="input-inline">
            <input
              type="text"
              v-model.trim="nuevoItem.CODE"
              placeholder="Genera o ingresa un código"
              :disabled="!!editId"
            />
            <button
              type="button"
              class="btn btn-xs btn-outline"
              :disabled="enviando"
              @click="generarCodigoItem"
            >
              Generar
            </button>
          </div>
          <span v-if="erroresCreacion.CODE" class="err-msg">{{ erroresCreacion.CODE }}</span>
        </div>
        <div class="f-group estado-toggle">
          <label>Estado</label>
          <button
            type="button"
            class="toggle-btn"
            :class="nuevoItem.ACTIVA ? 'active' : 'inactive'"
            :disabled="enviando"
            @click="alternarEstadoNuevoItem"
          >
            {{ nuevoItem.ACTIVA ? 'Activo' : 'Inactivo' }}
          </button>
        </div>
        <div class="f-group span-3 detail-control">
          <label>Detalle del item</label>
          <div class="detail-actions">
            <div class="detail-meta">
              <span
                >{{ detalleNuevoResumen }} {{ detalleNuevoResumen === 1 ? 'fila' : 'filas' }}</span
              >
              <small class="text-muted">Total {{ formatearMonto(detalleNuevoMonto) }}</small>
            </div>
            <button
              type="button"
              class="btn btn-outline"
              :disabled="enviando"
              @click="abrirModal({ contexto: 'nuevo' })"
            >
              Configurar detalle
            </button>
          </div>
          <small v-if="errorDetalle" class="err-msg detail-error">{{ errorDetalle }}</small>
        </div>
        <div class="form-actions span-3">
          <button type="submit" class="btn btn-primary" :disabled="enviando">
            {{
              enviando
                ? editId
                  ? 'Actualizando…'
                  : 'Guardando…'
                : editId
                  ? 'Actualizar item'
                  : 'Guardar item'
            }}
          </button>
          <button type="button" class="btn" :disabled="enviando" @click="limpiarNuevoItem">
            Limpiar
          </button>
        </div>
        <div v-if="feedbackCreacion" class="feedback" :class="feedbackCreacion.tipo">
          {{ feedbackCreacion.msg }}
        </div>
      </form>
    </section>

    <section class="items-card surface-card elev-2" aria-label="Listado items locales">
      <header class="items-head">
        <div>
          <h3>Items registrados ({{ totalItems }})</h3>
          <p class="text-muted">Selecciona un item para visualizar su detalle.</p>
        </div>
      </header>
      <div class="list-controls">
        <div class="search-group">
          <input
            v-model.trim="filtroBusqueda"
            type="search"
            placeholder="Buscar por nombre o código"
            :disabled="cargando"
            @keyup.enter="buscarItems"
          />
          <button type="button" class="btn btn-search" :disabled="cargando" @click="buscarItems">
            {{ cargando ? 'Buscando…' : 'Buscar' }}
          </button>
        </div>
        <div class="filters-group">
          <label class="filter-label" for="tipo-select">Tipo</label>
          <select
            id="tipo-select"
            v-model="filtroTipo"
            :disabled="cargando || cargandoTipos"
            @change="aplicarFiltroTipo"
          >
            <option value="">Todos</option>
            <option v-for="tipo in tiposFiltro" :key="tipo" :value="tipo">{{ tipo }}</option>
          </select>
          <span v-if="cargandoTipos" class="filter-hint text-muted">Cargando tipos…</span>
          <div class="per-page-control">
            <label class="per-page-label" for="inventario-per-page">Por página</label>
            <select
              id="inventario-per-page"
              :value="perPageSeleccionado"
              @change="onPerPageChange"
              :disabled="cargando"
            >
              <option v-for="opcion in perPageOptions" :key="opcion" :value="opcion">
                {{ opcion }}
              </option>
            </select>
          </div>
        </div>
      </div>
      <small v-if="busquedaActiva || tipoActivo" class="filter-summary text-muted">
        <span v-if="busquedaActiva">Búsqueda: "{{ inventarioStore.busquedaActual }}"</span>
        <span v-if="tipoActivo">Tipo: {{ inventarioStore.tipoActual }}</span>
      </small>
      <div v-if="errorCarga" class="list-feedback error">
        {{ errorCarga }}
      </div>
      <div class="table-scroll">
        <table class="table-modern">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Código</th>
              <th>Relación</th>
              <th>Detalle</th>
              <th class="center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="cargando">
              <tr>
                <td colspan="6" class="empty">Cargando inventario…</td>
              </tr>
            </template>
            <template v-else-if="!items.length">
              <tr>
                <td colspan="6" class="empty">Sin items consultados</td>
              </tr>
            </template>
            <template v-else>
              <tr
                v-for="item in items"
                :key="item.id"
                :class="{ selected: String(item.id) === String(selectedId) }"
              >
                <td>{{ item.name }}</td>
                <td>{{ mostrarTipo(item) }}</td>
                <td>{{ item.CODE }}</td>
                <td>{{ mostrarRelacion(item) }}</td>
                <td>{{ item.DATA_OBJETO?.DETALLE?.length || 0 }}</td>
                <td class="center">
                  <button
                    type="button"
                    class="btn btn-xs btn-outline"
                    @click="verDetallesItem(item)"
                  >
                    Ver detalle
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-outline"
                    @click="abrirModalEditar(item)"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs btn-danger"
                    :disabled="estaEliminando(item) || eliminando"
                    @click="abrirConfirmacion(item)"
                  >
                    {{ estaEliminando(item) ? 'Eliminando…' : 'Borrar' }}
                  </button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <div class="table-foot">
        <div class="summary">
          <span v-if="mostrarResumen">
            Mostrando {{ rangoInicio }}-{{ rangoFin }} de {{ totalItems }}
          </span>
          <span v-else>Sin registros</span>
        </div>
        <div class="pager">
          <button
            type="button"
            class="pager-btn"
            :disabled="!puedeRetroceder || cargando"
            @click="irPrimerPagina"
            aria-label="Primera página"
          >
            «
          </button>
          <button
            type="button"
            class="pager-btn"
            :disabled="!puedeRetroceder || cargando"
            @click="paginaAnterior"
            aria-label="Página anterior"
          >
            ‹
          </button>
          <span class="page-indicator"> Página {{ paginaActual }} de {{ totalPaginas || 1 }} </span>
          <button
            type="button"
            class="pager-btn"
            :disabled="!puedeAvanzar || cargando"
            @click="paginaSiguiente"
            aria-label="Página siguiente"
          >
            ›
          </button>
          <button
            type="button"
            class="pager-btn"
            :disabled="!puedeAvanzar || cargando"
            @click="irUltimaPagina"
            aria-label="Última página"
          >
            »
          </button>
        </div>
      </div>
    </section>

    <!-- <section
      v-if="itemSeleccionado"
      class="info-card surface-card elev-2"
      aria-label="Resumen item seleccionado"
  >
      <header class="info-head">
        <div>
          <h3 class="info-title">{{ itemSeleccionado.name }}</h3>
          <p class="info-subtitle text-muted">{{ itemSeleccionado.DESCRIPCION }}</p>
        </div>
        <span class="badge" :class="itemSeleccionado.ACTIVA ? 'badge-ok' : 'badge-off'">
          {{ itemSeleccionado.ACTIVA ? 'Activo' : 'Inactivo' }}
        </span>
      </header>
      <div class="info-grid">
        <div class="info-block">
          <span class="label">Tipo</span>
          <span class="value">{{ mostrarTipo(itemSeleccionado) }}</span>
        </div>
        <div class="info-block">
          <span class="label">Rel. Tipo Item</span>
          <span class="value">{{ mostrarRelacion(itemSeleccionado) }}</span>
        </div>
        <div class="info-block">
          <span class="label">Código interno</span>
          <span class="value">{{ itemSeleccionado.CODE }}</span>
        </div>
        <div class="info-block">
          <span class="label">ID Colección</span>
          <span class="value">{{ itemSeleccionado.collectionId }}</span>
        </div>
        <div class="info-block">
          <span class="label">Creado</span>
          <span class="value">{{ formatearFecha(itemSeleccionado.CREADA) }}</span>
        </div>
        <div class="info-block">
          <span class="label">Actualizado</span>
          <span class="value">{{ formatearFecha(itemSeleccionado.ACTUALIZADA) }}</span>
        </div>
      </div>
    </section>
    <section v-else class="placeholder-card surface-soft elev-1">
      <p class="text-muted">Registra un item o selecciona uno existente para ver su detalle.</p>
    </section> -->

    <section
      v-if="itemSeleccionado"
      class="detalle-card surface-card elev-2"
      aria-label="Detalle configurado"
    >
      <header class="detalle-head">
        <div>
          <h3>Detalle configurado</h3>
          <p class="text-muted">
            {{ totalActivos }} activo(s) · Total aproximado {{ formatearMonto(totalMonto) }}
          </p>
        </div>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="cargando"
          @click="abrirModal({ contexto: 'existente' })"
        >
          Ajustar detalle
        </button>
      </header>
      <div class="detalle-table">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Texto</th>
              <th>Cantidad</th>
              <th>Monto</th>
              <th>Hora</th>
              <th>Gracia</th>
              <th>Estatus</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!detalleListado.length">
              <td colspan="7" class="empty">Sin configuraciones registradas</td>
            </tr>
            <tr v-for="detalle in detalleListado" :key="`${detalle.TEXTO}-${detalle.fila}`">
              <td>{{ detalle.fila }}</td>
              <td>{{ detalle.TEXTO }}</td>
              <td>{{ detalle.CANTIDAD }}</td>
              <td>{{ formatearMonto(detalle.MONTO) }}</td>
              <td>{{ detalle.HORA }}</td>
              <td>{{ detalle.GRACIA }}</td>
              <td>
                <span class="chip" :class="detalle.ACTIVO ? 'chip-ok' : 'chip-off'">
                  {{ detalle.ACTIVO ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div
      v-if="modalAbierto"
      class="modal-backdrop-modern"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detalle-modal-title"
      @click.self="cerrarModal"
    >
      <div class="modal-modern surface-card elev-4">
        <header class="modal-header-modern">
          <div class="modal-title-section">
            <h4 id="detalle-modal-title" class="modal-title">Configurar Elementos del Item</h4>
            <p class="modal-subtitle">
              Ajusta cada fila siguiendo la estructura requerida para DATA_OBJETO.DETALLE.
            </p>
          </div>
          <button
            type="button"
            class="btn btn-icon btn-xs btn-outline"
            aria-label="Cerrar"
            @click="cerrarModal"
          >
            ×
          </button>
        </header>

        <div class="modal-content">
          <div class="modal-stats">
            <div class="stat-item">
              <span class="stat-label">Filas</span>
              <span class="stat-value">{{ detalleEditable.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Total Aproximado</span>
              <span class="stat-value">{{
                formatearMonto(
                  detalleEditable.reduce(
                    (sum, fila) => sum + Number(fila.MONTO || 0) * Number(fila.CANTIDAD || 0),
                    0,
                  ),
                )
              }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Activos</span>
              <span class="stat-value">{{ detalleEditable.filter((f) => f.ACTIVO).length }}</span>
            </div>
          </div>

          <div class="table-container-modern">
            <div class="table-scroll-modern">
              <table class="table-editor">
                <thead>
                  <tr>
                    <th class="col-text">Descripción</th>
                    <th class="col-number">Cantidad</th>
                    <th class="col-number">Monto</th>
                    <th class="col-time">Hora</th>
                    <th class="col-time">Gracia</th>
                    <th class="col-status">Estado</th>
                    <th class="col-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="fila in detalleEditable" :key="fila._uid" class="editor-row">
                    <td class="col-text">
                      <div class="input-wrapper">
                        <input
                          type="text"
                          :value="fila.TEXTO"
                          placeholder="Descripción del elemento"
                          class="input-modern input-text"
                          @input="actualizarCampo(fila._uid, 'TEXTO', $event.target.value)"
                        />
                      </div>
                    </td>
                    <td class="col-number">
                      <div class="input-wrapper">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          :value="fila.CANTIDAD"
                          class="input-modern input-number"
                          @input="actualizarCampo(fila._uid, 'CANTIDAD', $event.target.value)"
                        />
                      </div>
                    </td>
                    <td class="col-number">
                      <div class="input-wrapper">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          :value="fila.MONTO"
                          class="input-modern input-number"
                          @input="actualizarCampo(fila._uid, 'MONTO', $event.target.value)"
                        />
                      </div>
                    </td>
                    <td class="col-time">
                      <div class="input-wrapper">
                        <input
                          type="time"
                          :value="fila.HORA"
                          step="1"
                          class="input-modern input-time"
                          @input="actualizarCampo(fila._uid, 'HORA', $event.target.value)"
                        />
                      </div>
                    </td>
                    <td class="col-time">
                      <div class="input-wrapper">
                        <input
                          type="time"
                          :value="fila.GRACIA"
                          step="1"
                          class="input-modern input-time"
                          @input="actualizarCampo(fila._uid, 'GRACIA', $event.target.value)"
                        />
                      </div>
                    </td>
                    <td class="col-status">
                      <button
                        type="button"
                        class="btn btn-xs toggle-status"
                        :class="fila.ACTIVO ? 'btn-success' : 'btn-outline'"
                        @click="alternarActivo(fila._uid)"
                      >
                        {{ fila.ACTIVO ? 'Activo' : 'Inactivo' }}
                      </button>
                    </td>
                    <td class="col-actions">
                      <button
                        type="button"
                        class="btn btn-xs btn-danger"
                        @click="eliminarFila(fila._uid)"
                        :disabled="detalleEditable.length === 1"
                        title="Eliminar fila"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="table-footer-modern">
              <button type="button" class="btn btn-outline btn-sm" @click="agregarFila">
                <span>+ Agregar Fila</span>
              </button>
            </div>
          </div>

          <div v-if="modalFeedback" class="alert-modern" :class="modalFeedback.tipo">
            <span class="alert-icon">⚠</span>
            <span class="alert-message">{{ modalFeedback.msg }}</span>
          </div>
        </div>

        <footer class="modal-footer-modern">
          <button type="button" class="btn btn-outline" @click="cerrarModal">Cancelar</button>
          <button type="button" class="btn btn-primary" @click="guardarCambios">
            Guardar Cambios
          </button>
        </footer>
      </div>
    </div>
  </div>
  <div
    v-if="mostrarModalEliminar"
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="confirm-del-title"
    @click.self="cerrarModalEliminar"
  >
    <div class="modal surface-card elev-3" style="max-width: 520px">
      <header class="modal-head">
        <div>
          <h4 id="confirm-del-title">Eliminar item</h4>
          <p class="text-muted">Esta acción no se puede deshacer.</p>
        </div>
        <button type="button" class="close-btn" :disabled="eliminando" @click="cerrarModalEliminar">
          ×
        </button>
      </header>
      <div class="modal-body">
        <p>
          ¿Seguro que deseas eliminar el item
          <strong>{{ (itemAEliminar && itemAEliminar.name) || 'Sin nombre' }}</strong
          >?
        </p>
        <ul class="confirm-list">
          <li>
            <span class="label">Código</span>
            <span class="value">{{ itemAEliminar?.CODE || '—' }}</span>
          </li>
          <li>
            <span class="label">Tipo</span>
            <span class="value">{{ mostrarTipo(itemAEliminar) }}</span>
          </li>
        </ul>
      </div>
      <footer class="modal-foot">
        <button type="button" class="btn" :disabled="eliminando" @click="cerrarModalEliminar">
          Cancelar
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="eliminando"
          @click="confirmarEliminacion"
        >
          {{ eliminando ? 'Eliminando…' : 'Eliminar' }}
        </button>
      </footer>
    </div>
  </div>

  <!-- Modal de Edición de Producto -->
  <div
    v-if="modalEditarVisible"
    class="modal-backdrop-modern"
    role="dialog"
    aria-modal="true"
    aria-labelledby="edit-modal-title"
    @click.self="cerrarModalEditar"
  >
    <div class="modal-modern-edit surface-card elev-3">
      <header class="modal-header-modern">
        <div class="modal-title-section">
          <h4 id="edit-modal-title" class="modal-title">Editar Producto</h4>
          <p class="modal-subtitle">Actualiza la información del producto del inventario.</p>
        </div>
        <button
          type="button"
          class="btn btn-xs btn-outline"
          :disabled="editProcesando"
          aria-label="Cerrar"
          @click="cerrarModalEditar"
        >
          ✕
        </button>
      </header>

      <div class="modal-body-split">
        <section class="edit-pane">
          <div class="modal-stats">
            <div class="stat-item">
              <div class="stat-label">Código</div>
              <div class="stat-value">{{ itemEditando?.CODE || 'N/A' }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Estado</div>
              <div class="stat-value">{{ itemEditando?.ACTIVA ? 'Activo' : 'Inactivo' }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Tipo</div>
              <div class="stat-value">{{ mostrarTipoSeleccionado(itemEditando) }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Detalles</div>
              <div class="stat-value">{{ detalleEdicionStats.total }}</div>
            </div>
          </div>

          <div class="form-container-modern">
            <div class="product-edit-form">
              <div class="f-group">
                <label>Nombre del Producto</label>
                <input
                  type="text"
                  v-model="itemEditando.name"
                  class="input-modern"
                  placeholder="Nombre del producto"
                />
              </div>

              <div class="f-group span-2">
                <label>Descripción</label>
                <textarea
                  v-model="itemEditando.DESCRIPCION"
                  class="input-modern"
                  rows="4"
                  placeholder="Descripción del producto"
                ></textarea>
              </div>

              <div class="f-group">
                <label>Código Interno</label>
                <input
                  type="text"
                  v-model="itemEditando.CODE"
                  class="input-modern"
                  placeholder="Código interno"
                  disabled
                />
              </div>

              <div class="f-group">
                <label>Tipo</label>
                <select
                  v-model="itemEditando.REL_TIPO_ITEM"
                  class="input-modern"
                  @change="actualizarTipoProducto"
                >
                  <option value="">Seleccionar tipo</option>
                  <option v-for="tipo in tiposDisponibles" :key="tipo.id" :value="tipo.id">
                    {{ tipo.name }}
                  </option>
                </select>
              </div>

              <div class="f-group">
                <label>Estado</label>
                <button
                  type="button"
                  class="btn btn-sm toggle-status"
                  :class="itemEditando?.ACTIVA ? 'btn-success' : 'btn-outline'"
                  @click="itemEditando.ACTIVA = !itemEditando.ACTIVA"
                >
                  {{ itemEditando?.ACTIVA ? 'Activo' : 'Inactivo' }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="editFeedback" class="alert-modern" :class="editFeedback.tipo">
            <span class="alert-icon">{{ editFeedback.tipo === 'error' ? '⚠️' : '✅' }}</span>
            <span class="alert-message">{{ editFeedback.msg }}</span>
          </div>
        </section>

        <section class="detail-pane">
          <div class="detail-pane-head">
            <h5>Detalles del producto</h5>
            <p class="detail-pane-subtitle text-muted">
              Ajusta cada fila de DATA_OBJETO.DETALLE para reflejar el contenido comercial.
            </p>
          </div>

          <div class="detail-pane-stats">
            <div class="stat-item">
              <span class="stat-label">Filas</span>
              <span class="stat-value">{{ detalleEdicionStats.total }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Total estimado</span>
              <span class="stat-value">{{ formatearMonto(detalleEdicionStats.monto) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Activos</span>
              <span class="stat-value">{{ detalleEdicionStats.activos }}</span>
            </div>
          </div>

          <div class="detail-table-wrapper">
            <div class="table-scroll-modern">
              <table class="table-editor">
                <thead>
                  <tr>
                    <th class="col-text">Descripción</th>
                    <th class="col-number">Cantidad</th>
                    <th class="col-number">Monto</th>
                    <th class="col-time">Hora</th>
                    <th class="col-time">Gracia</th>
                    <th class="col-status">Estado</th>
                    <th class="col-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="fila in detalleEdicion" :key="fila._uid" class="editor-row">
                    <td class="col-text">
                      <div class="input-wrapper">
                        <input
                          type="text"
                          :value="fila.TEXTO"
                          placeholder="Descripción del elemento"
                          class="input-modern input-text"
                          @input="actualizarCampoEdicion(fila._uid, 'TEXTO', $event.target.value)"
                        />
                      </div>
                    </td>
                    <td class="col-number">
                      <div class="input-wrapper">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          :value="fila.CANTIDAD"
                          class="input-modern input-number"
                          @input="
                            actualizarCampoEdicion(fila._uid, 'CANTIDAD', $event.target.value)
                          "
                        />
                      </div>
                    </td>
                    <td class="col-number">
                      <div class="input-wrapper">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          :value="fila.MONTO"
                          class="input-modern input-number"
                          @input="actualizarCampoEdicion(fila._uid, 'MONTO', $event.target.value)"
                        />
                      </div>
                    </td>
                    <td class="col-time">
                      <div class="input-wrapper">
                        <input
                          type="time"
                          :value="fila.HORA"
                          step="1"
                          class="input-modern input-time"
                          @input="actualizarCampoEdicion(fila._uid, 'HORA', $event.target.value)"
                        />
                      </div>
                    </td>
                    <td class="col-time">
                      <div class="input-wrapper">
                        <input
                          type="time"
                          :value="fila.GRACIA"
                          step="1"
                          class="input-modern input-time"
                          @input="actualizarCampoEdicion(fila._uid, 'GRACIA', $event.target.value)"
                        />
                      </div>
                    </td>
                    <td class="col-status">
                      <button
                        type="button"
                        class="btn btn-xs toggle-status"
                        :class="fila.ACTIVO ? 'btn-success' : 'btn-outline'"
                        @click="alternarActivoEdicion(fila._uid)"
                      >
                        {{ fila.ACTIVO ? 'Activo' : 'Inactivo' }}
                      </button>
                    </td>
                    <td class="col-actions">
                      <button
                        type="button"
                        class="btn btn-xs btn-danger"
                        @click="eliminarFilaEdicion(fila._uid)"
                        :disabled="detalleEdicion.length === 1"
                        title="Eliminar fila"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="detail-actions">
            <button type="button" class="btn btn-outline btn-sm" @click="agregarFilaEdicion">
              + Agregar fila
            </button>
          </div>

          <div
            v-if="detalleEdicionFeedback"
            class="alert-modern"
            :class="detalleEdicionFeedback.tipo"
          >
            <span class="alert-icon">⚠</span>
            <span class="alert-message">{{ detalleEdicionFeedback.msg }}</span>
          </div>
        </section>
      </div>

      <footer class="modal-footer-modern">
        <button type="button" class="btn" @click="cerrarModalEditar" :disabled="editProcesando">
          Cancelar
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="editProcesando"
          @click="guardarEdicionProducto"
        >
          {{ editProcesando ? 'Guardando…' : 'Guardar Cambios' }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.inventario-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.hero {
  padding: var(--space-6) var(--space-6);
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-4);
  position: relative;
  overflow: hidden;
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 18% 20%, rgba(var(--brand-primary-rgb) / 0.18), transparent 65%),
    radial-gradient(circle at 80% 75%, rgba(var(--brand-accent-rgb) / 0.18), transparent 70%);
  opacity: 0.35;
  pointer-events: none;
}
.hero-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.title {
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: 0.6px;
}
.subtitle {
  font-size: 0.82rem;
  max-width: 38ch;
}
.hero-actions {
  display: flex;
  gap: var(--space-3);
}

.count-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  background: rgba(var(--brand-primary-rgb) / 0.18);
  color: var(--brand-primary);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.form-card {
  padding: var(--space-6) var(--space-6) var(--space-5);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.form-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.detail-pill {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-1);
  padding: 0.45rem 0.7rem;
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
  font-size: 0.7rem;
  letter-spacing: 0.4px;
  min-width: 110px;
}

.grid-form {
  display: grid;
  gap: var(--space-5);
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.span-2 {
  grid-column: span 2;
}

.span-3 {
  grid-column: span 3;
}

.f-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.f-group label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.9px;
  text-transform: uppercase;
  opacity: 0.72;
}

.f-group input,
.f-group select,
.f-group textarea {
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  padding: 0.75rem 0.85rem;
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  resize: vertical;
}

.f-group input:focus,
.f-group select:focus,
.f-group textarea:focus {
  outline: 2px solid rgba(var(--brand-primary-rgb) / 0.3);
  background: var(--color-background);
}

.f-group.error input,
.f-group.error select,
.f-group.error textarea {
  border-color: #d92d20;
  background: rgba(217 45 32 / 0.08);
}

.err-msg {
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #d92d20;
}

.input-inline {
  display: flex;
  gap: var(--space-2);
  align-items: stretch;
}

.input-inline textarea {
  flex: 1;
}

.mini-btn {
  font-family: inherit;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  font-weight: 600;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: var(--radius-sm);
  padding: 0.45rem 0.6rem;
  cursor: pointer;
}

.mini-btn:hover {
  background: var(--color-background-soft);
}

.detail-control {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.estado-toggle {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.toggle-btn {
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  border-radius: var(--radius-md);
  padding: 0.65rem 0.85rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.55px;
  text-transform: uppercase;
  cursor: pointer;
}

.toggle-btn.active {
  background: linear-gradient(135deg, rgba(54 198 168 / 0.25), rgba(10 165 124 / 0.3));
  color: #0a8a66;
  border-color: transparent;
}

.toggle-btn.inactive {
  background: linear-gradient(135deg, rgba(245 143 143 / 0.22), rgba(229 62 62 / 0.2));
  color: #b42318;
  border-color: transparent;
}

.toggle-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.detail-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.detail-meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.detail-error {
  display: inline-block;
  margin-top: var(--space-2);
}

.form-actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.feedback {
  grid-column: 1 / -1;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius-md);
  letter-spacing: 0.5px;
}

.feedback.ok {
  background: linear-gradient(135deg, rgba(54 198 168 / 0.22), rgba(10 165 124 / 0.22));
  color: #0a8a66;
}

.feedback.error {
  background: linear-gradient(135deg, rgba(245 143 143 / 0.22), rgba(229 62 62 / 0.22));
  color: #b42318;
}

.items-card {
  padding: var(--space-6) var(--space-6) var(--space-5);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.items-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.list-controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  justify-content: space-between;
  align-items: center;
}

.search-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.search-group input {
  min-width: 220px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  padding: 0.7rem 0.9rem;
  border-radius: var(--radius-md);
  font-size: 0.78rem;
}

.search-group input:focus {
  outline: 2px solid rgba(var(--brand-primary-rgb) / 0.3);
  background: var(--color-background);
}

.btn-search {
  font-family: inherit;
  font-size: 0.65rem;
  letter-spacing: 0.55px;
  text-transform: uppercase;
  font-weight: 600;
  padding: 0.6rem 0.9rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background);
  cursor: pointer;
}

.btn-search:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-search:not(:disabled):hover {
  background: var(--color-background-soft);
}

.filters-group {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.filters-group select {
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  min-width: 160px;
}

.filter-label {
  font-size: 0.62rem;
  letter-spacing: 0.55px;
  text-transform: uppercase;
  font-weight: 600;
  opacity: 0.7;
}

.filter-hint {
  font-size: 0.62rem;
}

.filter-summary {
  display: inline-flex;
  gap: var(--space-3);
  margin-top: -0.5rem;
}

.list-feedback {
  margin-top: var(--space-3);
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-md);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.45px;
}

.list-feedback.error {
  background: linear-gradient(135deg, rgba(245 143 143 / 0.22), rgba(229 62 62 / 0.18));
  color: #b42318;
}

.per-page-control {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.per-page-label {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.55px;
  font-weight: 600;
  opacity: 0.7;
}

.per-page-control select {
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  padding: 0.5rem 0.65rem;
  border-radius: var(--radius-md);
  font-size: 0.72rem;
}

.table-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.summary {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: 0.7rem;
  font-weight: 600;
}

.pager {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.pager-btn {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: var(--radius-sm);
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  cursor: pointer;
}

.pager-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pager-btn:not(:disabled):hover {
  background: var(--color-background-soft);
}

.page-indicator {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.4px;
}

.items-card table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
  min-width: 760px;
}

.items-card thead th {
  text-align: left;
  font-size: 0.62rem;
  letter-spacing: 0.55px;
  text-transform: uppercase;
  padding: 0.7rem 0.8rem;
  background: var(--color-background-soft);
}

.items-card tbody td {
  padding: 0.65rem 0.8rem;
  border-top: 1px solid var(--color-border);
}

.items-card tbody tr:hover {
  background: var(--color-background-mute);
}

.items-card tbody tr.selected {
  background: rgba(var(--brand-primary-rgb) / 0.1);
}

.placeholder-card {
  padding: var(--space-6) var(--space-6);
  border-radius: var(--radius-xl);
  text-align: center;
  font-size: 0.78rem;
}

.info-card {
  padding: var(--space-6) var(--space-6) var(--space-5);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.info-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
}
.info-title {
  font-size: 1.1rem;
  font-weight: 600;
}
.info-subtitle {
  font-size: 0.78rem;
  letter-spacing: 0.4px;
}
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.65rem;
  letter-spacing: 0.6px;
  font-weight: 600;
  text-transform: uppercase;
}
.badge-ok {
  background: linear-gradient(135deg, rgba(54 198 168 / 0.2), rgba(10 165 124 / 0.25));
  color: #0a8a66;
}
.badge-off {
  background: linear-gradient(135deg, rgba(245 98 83 / 0.18), rgba(229 62 62 / 0.22));
  color: #bc2b2b;
}
.info-grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}
.info-block {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
}
.label {
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: rgba(17 24 39 / 0.55);
}
.value {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-heading);
  word-break: break-all;
}

.detalle-card {
  padding: var(--space-6) var(--space-6) var(--space-5);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.detalle-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}
.detalle-table {
  width: 100%;
  overflow-x: auto;
}
.detalle-table table {
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;
  font-size: 0.78rem;
}
.detalle-table thead th {
  text-align: left;
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.55px;
  padding: 0.7rem 0.8rem;
  background: var(--color-background-soft);
  position: sticky;
  top: 0;
  z-index: 5;
}
.detalle-table tbody td {
  padding: 0.65rem 0.8rem;
  border-top: 1px solid var(--color-border);
}
.empty {
  text-align: center;
  letter-spacing: 0.5px;
  color: rgba(17 24 39 / 0.6);
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.55px;
}
.chip-ok {
  background: linear-gradient(135deg, rgba(54 198 168 / 0.25), rgba(10 165 124 / 0.3));
  color: #0a8a66;
}
.chip-off {
  background: linear-gradient(135deg, rgba(245 143 143 / 0.25), rgba(229 62 62 / 0.28));
  color: #b42318;
}

/* Modal Moderno Mejorado */
.modal-backdrop-modern {
  position: fixed;
  inset: 0;
  background: rgba(17 24 39 / 0.65);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  z-index: 60;
  animation: fadeInBackdrop 0.3s ease-out;
}

@keyframes fadeInBackdrop {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(8px);
  }
}

.modal-modern {
  width: min(1100px, 95vw);
  max-height: 90vh;
  border-radius: var(--radius-2xl);
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  animation: slideInModal 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  background: var(--color-background);
}

@keyframes slideInModal {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header-modern {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-6) var(--space-6) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background-soft);
}

.modal-title-section {
  flex: 1;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0 0 var(--space-2) 0;
  letter-spacing: 0.3px;
}

.modal-subtitle {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.7;
  margin: 0;
  line-height: 1.4;
}

.modal-content {
  flex: 1;
  padding: var(--space-6);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.modal-stats {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--color-background-soft);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  flex: 1;
}

.stat-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text);
  opacity: 0.7;
}

.stat-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--brand-primary);
}

.table-container-modern {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.table-scroll-modern {
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
}

.table-editor {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.8rem;
  min-width: 720px;
}

.table-editor thead th {
  background: var(--color-background-soft);
  padding: var(--space-3) var(--space-3);
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-heading);
  border-bottom: 2px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.table-editor .col-text {
  width: 35%;
  min-width: 200px;
}

.table-editor .col-number {
  width: 12%;
  min-width: 80px;
}

.table-editor .col-time {
  width: 12%;
  min-width: 90px;
}

.table-editor .col-status {
  width: 15%;
  min-width: 100px;
}

.table-editor .col-actions {
  width: 10%;
  min-width: 60px;
  text-align: center;
}

.editor-row {
  transition: background var(--transition-base);
}

.editor-row:hover {
  background: var(--color-background-soft);
}

.editor-row td {
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.input-wrapper {
  width: 100%;
  position: relative;
}

.input-modern {
  width: 100%;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-family: inherit;
  color: var(--color-text);
  transition:
    border-color var(--transition-base),
    box-shadow var(--transition-base);
}

.input-modern:focus {
  outline: none;
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 2px rgba(var(--brand-primary-rgb) / 0.15);
}

.input-text {
  min-width: 180px;
}

.input-number {
  text-align: right;
}

.input-time {
  font-family: ui-monospace, monospace;
}

.toggle-status {
  min-width: 80px;
  white-space: nowrap;
}

.table-footer-modern {
  padding: var(--space-3);
  background: var(--color-background-soft);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-start;
}

.alert-modern {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  font-weight: 500;
}

.alert-modern.error {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.alert-icon {
  font-size: 0.9rem;
}

.alert-message {
  flex: 1;
}

.modal-footer-modern {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  background: var(--color-background-soft);
  border-top: 1px solid var(--color-border);
}

/* Responsive */
@media (max-width: 768px) {
  .modal-modern {
    width: 95vw;
    max-height: 95vh;
  }

  .modal-header-modern,
  .modal-content,
  .modal-footer-modern {
    padding-left: var(--space-4);
    padding-right: var(--space-4);
  }

  .modal-stats {
    flex-direction: column;
    gap: var(--space-3);
  }

  .stat-item {
    flex-direction: row;
    justify-content: space-between;
  }

  .table-editor {
    min-width: 600px;
  }
}

@media (max-width: 640px) {
  .modal-backdrop-modern {
    padding: var(--space-2);
  }

  .modal-modern {
    width: 100vw;
    height: 100vh;
    max-height: none;
    border-radius: 0;
  }
}

/* Modal de Edición de Producto */
.modal-modern-edit {
  width: min(1100px, 96vw);
  max-height: 90vh;
  border-radius: var(--radius-2xl);
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  animation: slideInModal 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  background: var(--color-background);
}

.modal-body-split {
  display: grid;
  grid-template-columns: minmax(280px, 0.85fr) minmax(420px, 1.15fr);
  gap: var(--space-6);
  padding: var(--space-6);
  padding-top: var(--space-2);
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.edit-pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  min-width: 0;
}

.detail-pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  background: var(--color-background-soft);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  min-width: 0;
}

.detail-pane-head {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.detail-pane-head h5 {
  font-size: 0.95rem;
  font-weight: 600;
}

.detail-pane-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--space-3);
}

.detail-pane-stats .stat-item {
  background: var(--color-background);
  padding: var(--space-3);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.detail-table-wrapper {
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-background);
  overflow: hidden;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
}

.detail-pane .alert-modern {
  margin: 0;
}

@media (max-width: 1020px) {
  .modal-body-split {
    grid-template-columns: 1fr;
    max-height: 70vh;
    overflow-y: auto;
    padding: var(--space-5);
  }

  .detail-pane {
    margin-bottom: var(--space-3);
  }
}

.product-edit-form {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

.f-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.f-group label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--color-text);
  opacity: 0.8;
}

.f-group .input-modern,
.f-group textarea,
.f-group select {
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  padding: 0.75rem 0.85rem;
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  color: var(--color-text);
  transition:
    border-color var(--transition-base),
    box-shadow var(--transition-base);
  width: 100%;
  font-family: inherit;
}

.f-group .input-modern:focus,
.f-group textarea:focus,
.f-group select:focus {
  outline: none;
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 2px rgba(var(--brand-primary-rgb) / 0.15);
  background: var(--color-background);
}

.f-group .input-modern:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--color-background-mute);
}

.f-group textarea {
  resize: vertical;
  min-height: 80px;
}

/* Responsive para formulario de producto */
@media (max-width: 768px) {
  .product-edit-form {
    grid-template-columns: 1fr;
  }

  .modal-modern-edit {
    width: 95vw;
    max-height: 95vh;
  }

  .modal-body-split {
    padding: var(--space-4);
    gap: var(--space-4);
  }

  .detail-pane {
    padding: var(--space-4);
  }
}

.chip-btn {
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
}
.table-btn {
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  border-radius: var(--radius-sm);
  padding: 0.35rem 0.55rem;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.55px;
  cursor: pointer;
}
.table-btn:hover {
  background: var(--color-background-mute);
}
.table-btn.danger {
  background: linear-gradient(90deg, #ffe2de, #ffc9c3);
  border-color: #ffb1a9;
  color: #b42318;
}
.table-btn.danger:hover {
  filter: brightness(0.96);
}
.table-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--space-3);
}
.modal-feedback {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.55rem 0.75rem;
  border-radius: var(--radius-md);
}
.modal-feedback.error {
  background: linear-gradient(135deg, rgba(252 211 211 / 0.6), rgba(248 113 113 / 0.5));
  color: #b42318;
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
.close-btn {
  border: 0;
  background: transparent;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  color: rgba(17 24 39 / 0.65);
}
.close-btn:hover {
  color: rgba(17 24 39 / 0.9);
}

.confirm-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: 0.75rem;
}

@media (max-width: 720px) {
  .hero {
    padding: var(--space-5);
  }
  .info-card,
  .detalle-card,
  .form-card,
  .items-card {
    padding: var(--space-5);
  }
  .span-2,
  .span-3 {
    grid-column: span 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .table-btn,
  .chip-btn,
  .btn,
  .hero,
  .info-card,
  .detalle-card {
    transition: none !important;
  }
}
</style>
