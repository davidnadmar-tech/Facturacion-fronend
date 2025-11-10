<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useClientesStore } from '@/stores/clientes'
import { useCatalogosStore } from '@/stores/catalogos'
import { useFormAuxStore } from '@/stores/formAux'

// Store
const store = useClientesStore()
const catalogosStore = useCatalogosStore()
const formAuxStore = useFormAuxStore()

// UI State
const mostrarForm = ref(false)
const editCodigo = ref(null) // null = creando
const filtro = ref('')
const buscando = computed(() => store.cargando)
const eliminando = computed(() => store.eliminando)
const eliminandoId = computed(() => store.eliminandoId)
const feedback = ref(null) // { tipo:'ok'|'error', msg }
const errores = reactive({})
const enviando = ref(false)
const mostrarModalEliminar = ref(false)
const clienteAEliminar = ref(null)
const modalEditarVisible = ref(false)
const modalEditarContainer = ref(null)
const editFeedback = ref(null)
const editProcesando = ref(false)
const clienteEditando = ref(null)
let formularioClonado = null
const form = reactive({
  codigo: '',
  backendId: '',
  nombre: '',
  telefono: '',
  email: '',
  actividadId: '',
  codigoActividad: '',
  descripcionActividad: '',
  nrc: '',
  nit: '',
  dui: '',
  departamento: '',
  municipio: '',
})
const filtroActividad = ref('')
const actividadesEconomicas = computed(() => {
  const filtradas = catalogosStore.buscarActividades(filtroActividad.value)
  const seleccionActual = form.actividadId ? catalogosStore.actividadPorId(form.actividadId) : null
  if (!seleccionActual) return filtradas
  const existe = filtradas.some((item) => item.id === seleccionActual.id)
  return existe ? filtradas : [seleccionActual, ...filtradas]
})
const cargandoActividades = computed(() => catalogosStore.actividadesCargando)
const cargandoDepartamentos = computed(() => catalogosStore.departamentosCargando)
const departamentosDisponibles = computed(() => {
  const lista = catalogosStore.departamentosOrdenados || []
  const actual = form.departamento ? catalogosStore.departamentoPorId(form.departamento) : null
  if (!actual) return lista
  const existe = lista.some((item) => item.id === actual.id)
  return existe ? lista : [actual, ...lista]
})
const municipiosDisponibles = computed(() => {
  if (!form.departamento) return []
  const lista = catalogosStore.municipiosDeDepartamento(form.departamento) || []
  const actual = form.municipio ? catalogosStore.municipioPorId(form.municipio) : null
  if (!actual || actual.deptoId !== form.departamento) return lista
  const existe = lista.some((item) => item.id === actual.id)
  return existe ? lista : [actual, ...lista]
})
const basePerPageOptions = [10, 20, 30, 50]
const paginaActual = computed(() => store.paginaActual)
const totalPaginas = computed(() => store.totalPaginas)
const totalRegistros = computed(() => store.totalRegistros)
const porPagina = computed(() => store.porPagina)
const perPageOptions = computed(() => {
  const opciones = new Set(basePerPageOptions)
  const actual = Number(porPagina.value)
  if (actual) opciones.add(actual)
  return Array.from(opciones).sort((a, b) => a - b)
})
const perPageSeleccionado = ref(String(store.porPagina))
const puedeRetroceder = computed(() => paginaActual.value > 1)
const puedeAvanzar = computed(() => paginaActual.value < totalPaginas.value)

const listaFiltrada = computed(() => store.filtrados(filtro.value))
const registrosPagina = computed(() => listaFiltrada.value.length)
const rangoInicio = computed(() => {
  if (!registrosPagina.value) return 0
  return (paginaActual.value - 1) * porPagina.value + 1
})
const rangoFin = computed(() => {
  if (!registrosPagina.value) return 0
  return rangoInicio.value + registrosPagina.value - 1
})
const mostrarResumen = computed(() => registrosPagina.value > 0)

async function cargarClientesRemoto(
  busqueda = store.busquedaActual,
  opciones = {},
  controles = {},
) {
  const params = { ...opciones }
  const { silencioso = false } = controles
  if (params.page === undefined) params.page = String(paginaActual.value)
  if (params.perPage === undefined) params.perPage = String(porPagina.value)
  const query = typeof busqueda === 'string' ? busqueda : store.busquedaActual
  const res = await store.cargarClientes(query, params)
  if (!res.ok) {
    if (!silencioso) {
      feedback.value = {
        tipo: 'error',
        msg: res.error || 'No se pudieron cargar los clientes',
      }
    }
  } else if (!silencioso && feedback.value && feedback.value.tipo === 'error') {
    feedback.value = null
  }
  if (res.ok && typeof query === 'string') filtro.value = query
  return res
}

async function buscarRemoto() {
  const termino = filtro.value.trim()
  await cargarClientesRemoto(termino, { page: '1' })
}

async function irPagina(pagina) {
  const objetivo = Math.min(Math.max(1, pagina), totalPaginas.value || 1)
  if (objetivo === paginaActual.value) return null
  return cargarClientesRemoto(store.busquedaActual, { page: String(objetivo) })
}

async function paginaAnterior() {
  if (!puedeRetroceder.value || buscando.value) return
  return irPagina(paginaActual.value - 1)
}

async function paginaSiguiente() {
  if (!puedeAvanzar.value || buscando.value) return
  return irPagina(paginaActual.value + 1)
}

async function irPrimerPagina() {
  if (!puedeRetroceder.value) return
  return irPagina(1)
}

async function irUltimaPagina() {
  if (!puedeAvanzar.value) return
  return irPagina(totalPaginas.value)
}

async function cambiarPerPage(valor, previoSeleccionado) {
  const numero = Number(valor)
  if (!numero || numero === porPagina.value) return
  const resultado = await cargarClientesRemoto(store.busquedaActual, {
    page: '1',
    perPage: String(numero),
  })
  if (!resultado?.ok && previoSeleccionado !== undefined) {
    perPageSeleccionado.value = previoSeleccionado
  }
  return resultado
}

async function onPerPageChange(event) {
  const previo = perPageSeleccionado.value
  const valor = Number(event.target.value)
  perPageSeleccionado.value = String(valor || porPagina.value)
  if (!valor) {
    perPageSeleccionado.value = previo
    return
  }
  await cambiarPerPage(valor, previo)
}

async function cargarCatalogos() {
  const [actividadesRes, departamentosRes] = await Promise.all([
    catalogosStore.cargarActividadesEconomicas(),
    catalogosStore.cargarDepartamentos({ expand: 'DATA_MUNICS', perPage: '200' }),
  ])
  const errores = []
  if (!actividadesRes.ok) errores.push(actividadesRes.error || 'No se cargaron actividades')
  if (!departamentosRes.ok) errores.push(departamentosRes.error || 'No se cargaron departamentos')
  if (errores.length) {
    feedback.value = { tipo: 'error', msg: errores.join(' | ') }
  } else if (feedback.value && feedback.value.tipo === 'error') {
    feedback.value = null
  }
}

onMounted(() => {
  cargarClientesRemoto()
  cargarCatalogos()
})

function abrirNuevo() {
  limpiar()
  form.codigo = '' // se genera al guardar
  editCodigo.value = null
  mostrarForm.value = true
  feedback.value = null
  Object.keys(errores).forEach((k) => delete errores[k])
  scrollTop()
}

function scrollTop() {
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
}

function estaEliminando(cliente) {
  if (!cliente) return false
  const candidatos = [cliente.backendId, cliente.codigo].filter(Boolean)
  if (!candidatos.length) return false
  return candidatos.some((valor) => valor === eliminandoId.value)
}

function limpiar() {
  Object.assign(form, {
    codigo: '',
    backendId: '',
    nombre: '',
    telefono: '',
    email: '',
    actividadId: '',
    codigoActividad: '',
    descripcionActividad: '',
    nrc: '',
    nit: '',
    dui: '',
    departamento: '',
    municipio: '',
  })
  filtroActividad.value = ''
}

function cancelar() {
  mostrarForm.value = false
  editCodigo.value = null
  feedback.value = null
  Object.keys(errores).forEach((k) => delete errores[k])
  filtroActividad.value = ''
}

function onDepartamentoChange() {
  if (!form.departamento) {
    form.municipio = ''
    return
  }
  const municipioInfo = catalogosStore.municipioPorId(form.municipio)
  if (!municipioInfo || municipioInfo.deptoId !== form.departamento) {
    form.municipio = ''
  }
}

async function enviar() {
  Object.keys(errores).forEach((k) => delete errores[k])
  feedback.value = null
  const payload = { ...form }
  let resp = { ok: false }
  enviando.value = true
  try {
    if (!editCodigo.value) {
      resp = await store.crearCliente(payload)
      if (resp.ok) await cargarClientesRemoto(store.busquedaActual)
    } else {
      resp = await store.actualizar(editCodigo.value, payload)
    }
  } finally {
    enviando.value = false
  }
  if (!resp.ok) {
    if (resp.errores) Object.assign(errores, resp.errores)
    feedback.value = {
      tipo: 'error',
      msg: resp.error || 'Revisa los campos marcados',
    }
    return
  }
  feedback.value = { tipo: 'ok', msg: editCodigo.value ? 'Cliente actualizado' : 'Cliente creado' }
  if (!editCodigo.value) {
    limpiar()
    mostrarForm.value = true
    scrollTop()
  }
  editCodigo.value = null
}

function abrirConfirmacion(cliente) {
  if (!cliente) return
  clienteAEliminar.value = cliente
  mostrarModalEliminar.value = true
}

function cerrarModalEliminar(force = false) {
  if (eliminando.value && !force) return
  mostrarModalEliminar.value = false
  clienteAEliminar.value = null
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function confirmarEliminacion() {
  if (!clienteAEliminar.value || eliminando.value) return
  const objetivo = clienteAEliminar.value
  feedback.value = null
  cerrarModalEliminar(true)
  const resultado = await store.eliminarCliente(objetivo)
  if (!resultado.ok) {
    feedback.value = {
      tipo: 'error',
      msg: resultado.error || 'No se pudo eliminar el cliente',
    }
    return
  }
  const eliminado = resultado.item || objetivo
  const paginaObjetivo = String(store.paginaActual || 1)
  const maxIntentos = 3
  for (let intento = 0; intento < maxIntentos; intento += 1) {
    const silencioso = intento < maxIntentos - 1
    const refresco = await cargarClientesRemoto(
      store.busquedaActual,
      { page: paginaObjetivo },
      {
        silencioso,
      },
    )
    if (!refresco.ok) {
      feedback.value = {
        tipo: 'error',
        msg: refresco.error || 'Cliente eliminado, pero no se pudo actualizar la lista',
      }
      return
    }

    if (!eliminado) break
    const aunPresente = Array.isArray(refresco.items)
      ? refresco.items.some((c) => {
          const backendActual = c.backendId ?? c.id ?? null
          const backendEliminado = eliminado.backendId ?? eliminado.id ?? null
          const codigoActual = c.codigo ?? null
          const codigoEliminado = eliminado.codigo ?? null
          if (backendActual && backendEliminado) {
            return String(backendActual) === String(backendEliminado)
          }
          if (codigoActual && codigoEliminado) {
            return String(codigoActual) === String(codigoEliminado)
          }
          return false
        })
      : false

    if (!aunPresente) break

    if (intento === maxIntentos - 1) {
      feedback.value = {
        tipo: 'error',
        msg: 'El backend aún no refleja la eliminación. Intenta nuevamente en unos segundos.',
      }
      return
    }

    await esperar(300)
  }
  feedback.value = { tipo: 'ok', msg: 'Cliente eliminado' }
  scrollTop()
}

function blurError(campo) {
  if (errores[campo]) return
  // Validación ligera on-blur si se requiere
}

async function asegurarCatalogosEdicion() {
  const tareas = []
  if (!catalogosStore.actividadesCargadas && !catalogosStore.actividadesCargando)
    tareas.push(catalogosStore.cargarActividadesEconomicas())
  if (!catalogosStore.departamentosCargados && !catalogosStore.departamentosCargando)
    tareas.push(catalogosStore.cargarDepartamentos({ expand: 'DATA_MUNICS', perPage: '200' }))
  if (tareas.length) await Promise.all(tareas)
}

function habilitarCampo(elemento) {
  if (!elemento) return
  elemento.disabled = false
  elemento.removeAttribute('disabled')
}

function limpiarFormularioClonado() {
  if (formularioClonado) {
    formularioClonado.removeEventListener('submit', manejarSubmitEdicion)
  }
  if (modalEditarContainer.value) modalEditarContainer.value.innerHTML = ''
  formularioClonado = null
}

function cerrarModalEditar(force = false) {
  if (editProcesando.value && !force) return
  modalEditarVisible.value = false
  clienteEditando.value = null
  editFeedback.value = null
  editProcesando.value = false
  limpiarFormularioClonado()
}

function generarOpcionesDepartamento(selectEl, seleccionado) {
  if (!selectEl) return
  habilitarCampo(selectEl)
  selectEl.innerHTML = ''
  const placeholder = document.createElement('option')
  placeholder.value = ''
  placeholder.textContent = cargandoDepartamentos.value ? 'Cargando…' : 'Seleccionar'
  selectEl.appendChild(placeholder)
  if (cargandoDepartamentos.value) return
  const lista = catalogosStore.departamentosOrdenados || []
  lista.forEach((item) => {
    const option = document.createElement('option')
    option.value = item.id
    option.textContent = item.name
    selectEl.appendChild(option)
  })
  if (seleccionado) selectEl.value = seleccionado
}

function generarOpcionesMunicipio(selectEl, deptoId, seleccionado) {
  if (!selectEl) return
  habilitarCampo(selectEl)
  selectEl.innerHTML = ''
  const optionDefault = document.createElement('option')
  optionDefault.value = ''
  optionDefault.textContent = deptoId ? 'Seleccionar' : 'Seleccione un departamento'
  selectEl.appendChild(optionDefault)
  if (!deptoId) return
  const lista = catalogosStore.municipiosDeDepartamento(deptoId) || []
  lista.forEach((item) => {
    const option = document.createElement('option')
    option.value = item.id
    option.textContent = item.name
    selectEl.appendChild(option)
  })
  if (seleccionado) selectEl.value = seleccionado
}

function actualizarDatosActividadClon(actividadId) {
  if (!formularioClonado) return
  const actividad = catalogosStore.actividadPorId(actividadId)
  const descripcionInput = formularioClonado.querySelector('[name="descripcionActividad"]')
  const codigoInput = formularioClonado.querySelector('[name="codigoActividad"]')
  if (descripcionInput) descripcionInput.value = actividad?.descripcion || actividad?.name || ''
  if (codigoInput) codigoInput.value = actividad?.codigo || actividad?.codigoSFE || ''
}

function generarOpcionesActividad(selectEl, seleccionado) {
  if (!selectEl) return
  habilitarCampo(selectEl)
  selectEl.innerHTML = ''
  const optionDefault = document.createElement('option')
  optionDefault.value = ''
  optionDefault.textContent = cargandoActividades.value ? 'Cargando…' : 'Seleccionar'
  selectEl.appendChild(optionDefault)
  if (cargandoActividades.value) return
  const lista = catalogosStore.actividadesOrdenadas || actividadesEconomicas.value || []
  const usados = new Set()
  lista.forEach((item) => {
    if (usados.has(item.id)) return
    usados.add(item.id)
    const option = document.createElement('option')
    const codigo = item.codigoSFE || item.codigo || 'Sin código'
    const descripcion = item.descripcion || item.name || 'Sin descripción'
    option.value = item.id
    option.textContent = `${codigo} · ${descripcion}`
    selectEl.appendChild(option)
  })
  if (seleccionado) selectEl.value = seleccionado
  actualizarDatosActividadClon(selectEl.value)
}

function configurarListenersFormularioClonado(datos) {
  if (!formularioClonado) return
  const deptoSelect = formularioClonado.querySelector('[name="departamento"]')
  generarOpcionesDepartamento(deptoSelect, datos.departamento)
  const municipioSelect = formularioClonado.querySelector('[name="municipio"]')
  generarOpcionesMunicipio(
    municipioSelect,
    deptoSelect?.value || datos.departamento,
    datos.municipio,
  )
  if (deptoSelect) {
    deptoSelect.addEventListener('change', (event) => {
      generarOpcionesMunicipio(municipioSelect, event.target.value)
    })
  }
  const actividadSelect = formularioClonado.querySelector('[name="actividadId"]')
  generarOpcionesActividad(actividadSelect, datos.actividadId)
  if (actividadSelect) {
    actividadSelect.addEventListener('change', (event) => {
      actualizarDatosActividadClon(event.target.value)
    })
  }
}

async function prepararFormularioEdicion(datos) {
  const respaldo = { ...form }
  const respaldoFiltroActividad = filtroActividad.value
  const estabaVisible = mostrarForm.value
  Object.keys(respaldo).forEach((clave) => {
    form[clave] = datos[clave] ?? ''
  })
  await nextTick()
  const resultado = formAuxStore.clonarFormulario('cliente-form-base')
  Object.keys(respaldo).forEach((clave) => {
    form[clave] = respaldo[clave]
  })
  filtroActividad.value = respaldoFiltroActividad
  mostrarForm.value = estabaVisible
  if (!resultado.ok) return resultado
  formularioClonado = resultado.nodo
  formularioClonado.classList.add('form-clonado')
  formularioClonado.removeAttribute('id')
  const acciones = formularioClonado.querySelector('.form-actions')
  if (acciones) acciones.remove()
  const feedbackNodo = formularioClonado.querySelector('.feedback')
  if (feedbackNodo) feedbackNodo.remove()
  const codigoInput = formularioClonado.querySelector('[name="codigo"]')
  if (codigoInput) {
    codigoInput.value = datos.codigo || ''
    codigoInput.disabled = true
  }
  const backendInput = formularioClonado.querySelector('[name="backendId"]')
  if (backendInput) backendInput.value = datos.backendId || ''
  habilitarCampo(formularioClonado.querySelector('[name="busquedaActividad"]'))
  formularioClonado.addEventListener('submit', manejarSubmitEdicion)
  if (modalEditarContainer.value) {
    modalEditarContainer.value.innerHTML = ''
    modalEditarContainer.value.appendChild(formularioClonado)
  }
  configurarListenersFormularioClonado(datos)
  return { ok: true }
}

async function abrirModalEditar(cliente) {
  if (!cliente) return
  editFeedback.value = null
  editProcesando.value = false
  await asegurarCatalogosEdicion()
  const identificador = cliente.backendId || cliente.codigo || cliente.id
  const detalle = await store.obtenerClientePorId(identificador)
  if (!detalle.ok) {
    editFeedback.value = {
      tipo: 'error',
      msg: detalle.error || 'No se pudo obtener el cliente',
    }
    return
  }
  clienteEditando.value = detalle.item
  modalEditarVisible.value = true
  await nextTick()
  const resultado = await prepararFormularioEdicion(detalle.item)
  if (!resultado.ok) {
    editFeedback.value = {
      tipo: 'error',
      msg: resultado.error || 'No se pudo preparar el formulario de edición',
    }
  }
}

function leerFormularioClonado() {
  if (!formularioClonado) return {}
  const datos = new FormData(formularioClonado)
  const resultado = {}
  datos.forEach((valor, clave) => {
    resultado[clave] = typeof valor === 'string' ? valor.trim() : valor
  })
  delete resultado.busquedaActividad
  return resultado
}

async function manejarSubmitEdicion(event) {
  event.preventDefault()
  if (!clienteEditando.value || editProcesando.value) return
  editProcesando.value = true
  editFeedback.value = null
  const datos = leerFormularioClonado()
  const payload = {
    ...clienteEditando.value,
    ...datos,
    backendId: clienteEditando.value.backendId,
  }
  const respuesta = await store.actualizar(clienteEditando.value.codigo, payload)
  editProcesando.value = false
  if (!respuesta.ok) {
    editFeedback.value = {
      tipo: 'error',
      msg: respuesta.error || 'No se pudo actualizar el cliente',
    }
    return
  }
  await cargarClientesRemoto(store.busquedaActual, { page: String(store.paginaActual) })
  feedback.value = { tipo: 'ok', msg: 'Cliente actualizado' }
  cerrarModalEditar(true)
  scrollTop()
}

function enviarEdicion() {
  if (formularioClonado) formularioClonado.requestSubmit()
}

watch(
  () => store.porPagina,
  (valor) => {
    perPageSeleccionado.value = String(valor)
  },
  { immediate: true },
)

watch(
  () => [form.departamento, catalogosStore.departamentosCargados, form.municipio],
  ([deptoId, cargados, municipioId]) => {
    if (!cargados) return
    if (!deptoId) {
      if (municipioId) form.municipio = ''
      return
    }
    const municipioInfo = catalogosStore.municipioPorId(municipioId)
    if (!municipioInfo || municipioInfo.deptoId !== deptoId) {
      form.municipio = ''
    }
  },
)

watch(
  () => form.actividadId,
  (nuevo) => {
    if (!nuevo) {
      form.descripcionActividad = ''
      form.codigoActividad = ''
      return
    }
    const actividad = catalogosStore.actividadPorId(nuevo)
    if (actividad) {
      form.descripcionActividad = actividad.descripcion || actividad.name || ''
      form.codigoActividad = actividad.codigo || actividad.codigoSFE || ''
    } else {
      form.descripcionActividad = ''
      form.codigoActividad = ''
    }
  },
  { immediate: true },
)

watch(
  () => filtroActividad.value,
  (valor) => {
    if (!valor && form.actividadId) {
      const actividad = catalogosStore.actividadPorId(form.actividadId)
      if (!actividad) {
        form.actividadId = ''
        form.codigoActividad = ''
      }
    }
  },
)
</script>

<template>
  <div class="clientes-view fade-in">
    <!-- Header de acciones -->
    <section class="actions-bar surface-soft elev-1" aria-label="Acciones clientes">
      <div class="left">
        <h2 class="title">Clientes</h2>
        <p class="subtitle text-muted">Mantenimiento y consulta de clientes registrados</p>
      </div>
      <div class="right">
        <div class="search-group">
          <input
            v-model.trim="filtro"
            type="text"
            placeholder="Buscar por nombre o documento"
            :disabled="buscando"
            @keyup.enter="buscarRemoto"
            aria-label="Filtro clientes"
          />
          <button class="btn btn-search" type="button" @click="buscarRemoto" :disabled="buscando">
            {{ buscando ? 'Buscando…' : 'Buscar' }}
          </button>
        </div>
        <button class="btn btn-primary" type="button" @click="abrirNuevo">Nuevo Cliente</button>
      </div>
    </section>

    <!-- Formulario -->
    <section
      v-show="mostrarForm"
      class="form-wrapper surface-card elev-2"
      aria-label="Formulario cliente"
    >
      <header class="form-head">
        <h3>{{ editCodigo ? 'Editar Cliente' : 'Nuevo Cliente' }}</h3>
        <small class="text-muted upper">Campos básicos</small>
      </header>
      <form id="cliente-form-base" class="grid-form" @submit.prevent="enviar">
        <input type="hidden" name="backendId" v-model="form.backendId" />
        <div class="f-group">
          <label>Código</label>
          <input
            type="text"
            name="codigo"
            v-model="form.codigo"
            placeholder="Autogenerado"
            disabled
          />
        </div>
        <div class="f-group span-2" :class="{ error: errores.nombre }">
          <label>Nombre *</label>
          <input
            type="text"
            name="nombre"
            v-model.trim="form.nombre"
            @blur="blurError('nombre')"
            placeholder="Nombre completo"
          />
          <span v-if="errores.nombre" class="err-msg">{{ errores.nombre }}</span>
        </div>
        <div class="f-group">
          <label>Teléfono</label>
          <input type="text" name="telefono" v-model.trim="form.telefono" placeholder="Opcional" />
        </div>
        <div class="f-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            v-model.trim="form.email"
            placeholder="correo@dominio.com"
            :class="{ invalid: errores.email }"
          />
          <span v-if="errores.email" class="err-msg">{{ errores.email }}</span>
        </div>
        <div class="f-group" :class="{ loading: cargandoActividades }">
          <label>Actividad económica</label>
          <input
            v-model.trim="filtroActividad"
            type="search"
            name="busquedaActividad"
            placeholder="Buscar actividad por código o nombre"
            :disabled="cargandoActividades || !catalogosStore.actividadesCargadas"
            class="mini-search"
          />
          <select
            name="actividadId"
            v-model="form.actividadId"
            :disabled="
              cargandoActividades ||
              (!catalogosStore.actividadesCargadas && !actividadesEconomicas.length)
            "
          >
            <option value="">{{ cargandoActividades ? 'Cargando…' : 'Seleccionar' }}</option>
            <option
              v-for="actividad in actividadesEconomicas"
              :key="actividad.id"
              :value="actividad.id"
            >
              {{
                (actividad.codigoSFE || actividad.codigo || 'Sin código') +
                ' · ' +
                (actividad.descripcion || actividad.name)
              }}
            </option>
          </select>
          <small v-if="!cargandoActividades && !actividadesEconomicas.length" class="text-muted">
            {{ filtroActividad ? 'Sin coincidencias' : 'Sin actividades disponibles' }}
          </small>
        </div>
        <div class="f-group span-2">
          <label>Descripción Actividad / Giro</label>
          <input
            type="text"
            name="descripcionActividad"
            v-model="form.descripcionActividad"
            placeholder="Autocompletar"
            readonly
          />
        </div>
        <input type="hidden" name="codigoActividad" :value="form.codigoActividad" />
        <div class="f-group">
          <label>NRC</label>
          <input
            type="text"
            name="nrc"
            v-model.trim="form.nrc"
            placeholder="NRC"
            :class="{ invalid: errores.nrc }"
            @blur="blurError('nrc')"
          />
          <span v-if="errores.nrc" class="err-msg">{{ errores.nrc }}</span>
        </div>
        <div class="f-group" :class="{ error: errores.nit }">
          <label>NIT</label>
          <input
            type="text"
            name="nit"
            v-model.trim="form.nit"
            placeholder="NIT"
            :class="{ invalid: errores.nit }"
            @blur="blurError('nit')"
          />
          <span v-if="errores.nit" class="err-msg">{{ errores.nit }}</span>
        </div>
        <div class="f-group">
          <label>DUI</label>
          <input
            type="text"
            name="dui"
            v-model.trim="form.dui"
            placeholder="DUI"
            :class="{ invalid: errores.dui }"
            @blur="blurError('dui')"
          />
          <span v-if="errores.dui" class="err-msg">{{ errores.dui }}</span>
        </div>
        <div class="f-group">
          <label>Departamento</label>
          <select
            name="departamento"
            v-model="form.departamento"
            @change="onDepartamentoChange"
            :disabled="cargandoDepartamentos || !departamentosDisponibles.length"
          >
            <option value="">{{ cargandoDepartamentos ? 'Cargando…' : 'Seleccionar' }}</option>
            <option v-for="d in departamentosDisponibles" :key="d.id" :value="d.id">
              {{ d.name }}
            </option>
          </select>
          <small
            v-if="!cargandoDepartamentos && !departamentosDisponibles.length"
            class="text-muted"
          >
            Sin departamentos disponibles
          </small>
        </div>
        <div class="f-group">
          <label>Municipio</label>
          <select
            name="municipio"
            v-model="form.municipio"
            :disabled="!form.departamento || !municipiosDisponibles.length"
          >
            <option value="">
              {{
                form.departamento
                  ? cargandoDepartamentos
                    ? 'Cargando municipios…'
                    : 'Seleccionar'
                  : 'Seleccione un departamento'
              }}
            </option>
            <option v-for="m in municipiosDisponibles" :key="m.id" :value="m.id">
              {{ m.name }}
            </option>
          </select>
          <small
            v-if="form.departamento && !cargandoDepartamentos && !municipiosDisponibles.length"
            class="text-muted"
          >
            Sin municipios asociados
          </small>
        </div>
        <div class="form-actions span-3">
          <button type="submit" class="btn btn-primary" :disabled="enviando">
            {{ editCodigo ? 'Actualizar' : 'Guardar' }}
          </button>
          <button type="button" class="btn" @click="cancelar">Cancelar</button>
        </div>
        <div v-if="feedback" class="feedback" :class="feedback.tipo">{{ feedback.msg }}</div>
      </form>
    </section>
    <!-- LISTA DE CLIENTES -->
<section class="clientes-lista-wrapper surface-card elev-2" aria-label="Listado clientes">
  <header class="lista-head">
    <h3>Clientes registrados ({{ totalRegistros }})</h3>
    <small class="text-muted" v-if="filtro">Filtro activo</small>
  </header>

  <div class="lista-scroll">
    <ul class="clientes-lista">
      <li
        class="cliente-item"
        v-for="c in listaFiltrada"
        :key="c.codigo"
      >
        <div class="cliente-info">
          <h4 class="cliente-nombre">{{ c.nombre }}</h4>
          <p class="cliente-detalles">
            <strong>NRC:</strong> {{ c.nrc }} |
            <strong>NIT:</strong> {{ c.nit }} |
            <strong>DUI:</strong> {{ c.dui }}
          </p>
          <p class="cliente-email"><strong>Email:</strong> {{ c.email }}</p>
          <p class="cliente-actividad">
            <strong>Actividad:</strong> {{ c.descripcionActividad }}
          </p>
        </div>

        <div class="cliente-acciones">
          <button
            class="btn btn-outline btn-sm"
            type="button"
            :disabled="buscando"
            @click="abrirModalEditar(c)"
          >
            ✏️ Editar
          </button>
          <button
            class="btn btn-danger btn-sm"
            type="button"
            :disabled="buscando || eliminando || estaEliminando(c)"
            @click="abrirConfirmacion(c)"
          >
            {{ estaEliminando(c) ? 'Eliminando…' : '🗑️ Borrar' }}
          </button>
        </div>
      </li>
    </ul>
  </div>

  <footer class="lista-foot">
    <div class="summary">
      <span v-if="mostrarResumen">
        Mostrando {{ rangoInicio }} - {{ rangoFin }} de {{ totalRegistros }}
      </span>
      <span v-else>Sin resultados</span>
    </div>

    <div class="pager">
      <button class="pager-btn" @click="irPrimerPagina" :disabled="buscando || !puedeRetroceder">&lt;&lt;</button>
      <button class="pager-btn" @click="paginaAnterior" :disabled="buscando || !puedeRetroceder">&lt;</button>
      <span class="page-indicator">Página {{ paginaActual }} de {{ totalPaginas }}</span>
      <button class="pager-btn" @click="paginaSiguiente" :disabled="buscando || !puedeAvanzar">&gt;</button>
      <button class="pager-btn" @click="irUltimaPagina" :disabled="buscando || !puedeAvanzar">&gt;&gt;</button>
    </div>

    <div class="per-page-control">
      <label for="per-page-select">Por página</label>
      <select
        id="per-page-select"
        :value="perPageSeleccionado"
        @change="onPerPageChange"
        :disabled="buscando"
      >
        <option v-for="opcion in perPageOptions" :key="opcion" :value="opcion">
          {{ opcion }}
        </option>
      </select>
    </div>
  </footer>
</section>


    <div
      v-if="mostrarModalEliminar"
      class="modal-backdrop-modern"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      @click.self="cerrarModalEliminar"
    >
      <div class="modal-modern-confirm surface-card elev-3">
        <header class="modal-header-modern">
          <div class="modal-title-section">
            <h4 id="confirm-modal-title" class="modal-title">Eliminar Cliente</h4>
            <p class="modal-subtitle">Esta acción no se puede deshacer.</p>
          </div>
          <button
            type="button"
            class="btn btn-xs btn-outline"
            :disabled="eliminando"
            aria-label="Cerrar"
            @click="cerrarModalEliminar"
          >
            ✕
          </button>
        </header>
        <div class="modal-content">
          <div class="confirm-message-modern">
            <div class="confirm-icon">🗑️</div>
            <div class="confirm-text">
              <p>
                ¿Seguro que deseas eliminar al cliente
                <strong>{{ (clienteAEliminar && clienteAEliminar.nombre) || 'Sin nombre' }}</strong
                >?
              </p>
            </div>
          </div>

          <div v-if="clienteAEliminar" class="client-details-card">
            <div class="detail-row">
              <span class="detail-label">Nombre</span>
              <span class="detail-value">{{ clienteAEliminar.nombre || 'Sin nombre' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">DUI</span>
              <span class="detail-value">{{ clienteAEliminar.dui || 'Sin DUI' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email</span>
              <span class="detail-value">{{ clienteAEliminar.email || 'Sin correo' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Código</span>
              <span class="detail-value">{{ clienteAEliminar.codigo || 'Sin código' }}</span>
            </div>
          </div>
        </div>
        <footer class="modal-footer-modern">
          <button type="button" class="btn" @click="cerrarModalEliminar" :disabled="eliminando">
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-danger"
            :disabled="eliminando"
            @click="confirmarEliminacion"
          >
            {{ eliminando ? 'Eliminando…' : 'Eliminar Cliente' }}
          </button>
        </footer>
      </div>
    </div>
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
            <h4 id="edit-modal-title" class="modal-title">Editar Cliente</h4>
            <p class="modal-subtitle">Actualiza los datos necesarios y guarda los cambios.</p>
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
        <div class="modal-content">
          <!-- Stats del cliente -->
          <div class="modal-stats">
            <div class="stat-item">
              <div class="stat-label">Código</div>
              <div class="stat-value">{{ clienteEditando?.codigo || 'N/A' }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Estado</div>
              <div class="stat-value">
                {{ clienteEditando?.activo !== false ? 'Activo' : 'Inactivo' }}
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Actividad</div>
              <div class="stat-value">{{ clienteEditando?.codigoActividad || 'Sin asignar' }}</div>
            </div>
          </div>

          <!-- Formulario -->
          <div class="form-container-modern">
            <div ref="modalEditarContainer" class="edit-form-container"></div>
          </div>

          <!-- Feedback -->
          <div v-if="editFeedback" class="alert-modern" :class="editFeedback.tipo">
            <span class="alert-icon">{{ editFeedback.tipo === 'error' ? '⚠️' : '✅' }}</span>
            <span class="alert-message">{{ editFeedback.msg }}</span>
          </div>
        </div>
        <footer class="modal-footer-modern">
          <button type="button" class="btn" @click="cerrarModalEditar" :disabled="editProcesando">
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="editProcesando"
            @click="enviarEdicion"
          >
            {{ editProcesando ? 'Actualizando…' : 'Guardar cambios' }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.clientes-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

/* Actions bar */
.actions-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
  align-items: flex-end;
  padding: var(--space-5) var(--space-6);
  border-radius: var(--radius-xl);
  position: relative;
  overflow: hidden;
}
.actions-bar::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background:
    radial-gradient(circle at 85% 20%, rgba(var(--brand-primary-rgb) / 0.25), transparent 65%),
    radial-gradient(circle at 15% 85%, rgba(var(--brand-accent-rgb) / 0.25), transparent 60%);
  opacity: 0.35;
}
.title {
  font-size: 1.4rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.subtitle {
  font-size: 0.8rem;
  letter-spacing: 0.5px;
}
.right {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  flex-wrap: wrap;
  margin-left: auto;
}

.search-group {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-background);
}
.search-group input {
  border: 0;
  padding: 0.75rem 0.9rem;
  font-size: 0.8rem;
  background: transparent;
  min-width: 240px;
}
.search-group input:focus {
  outline: none;
}
.btn-search {
  border: 0;
  background: var(--grad-primary);
  color: #fff;
  padding: 0.7rem 1rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.6px;
  cursor: not-allowed;
}
/* .main-btn sustituido por utilidades .btn / .btn-primary */

/* Form */
.form-wrapper {
  padding: var(--space-6) var(--space-6) var(--space-6);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.form-head h3 {
  font-size: 1rem;
  font-weight: 600;
}
.grid-form {
  display: grid;
  gap: var(--space-5);
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
.f-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.f-group label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  opacity: 0.8;
}
.f-group input,
.f-group select {
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  padding: 0.75rem 0.85rem;
  border-radius: var(--radius-md);
  font-size: 0.8rem;
}
.f-group .mini-search {
  margin-top: var(--space-2);
  padding: 0.55rem 0.75rem;
  font-size: var(--fz-sm);
}
.f-group input:focus,
.f-group select:focus {
  outline: 2px solid rgba(var(--brand-primary-rgb) / 0.3);
  background: var(--color-background);
}
.input-inline {
  display: flex;
  gap: 0.5rem;
}
.input-inline input {
  flex: 1;
}
.mini-btn {
  font-family: inherit;
  font-size: 0.55rem;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  font-weight: 600;
  padding: 0.4rem 0.55rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  cursor: not-allowed;
}
.form-actions {
  display: flex;
  gap: var(--space-4);
}

.span-2 {
  grid-column: span 2;
}
.span-3 {
  grid-column: span 3;
}
@media (max-width: 680px) {
  .span-2,
  .span-3 {
    grid-column: span 1;
  }
}

/* Tabla */
.table-wrapper {
  padding: var(--space-6) var(--space-5) var(--space-6);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.table-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.table-head h3 {
  font-size: 0.95rem;
  font-weight: 600;
}
.table-scroll {
  width: 100%;
  overflow-x: auto;
}
.table-scroll table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
  min-width: 880px;
}
.table-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  font-size: 0.75rem;
}
.table-foot .summary {
  min-width: 200px;
  font-weight: 500;
  letter-spacing: 0.3px;
}
.pager {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  justify-content: center;
}
.pager-btn {
  min-width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition:
    background var(--transition-base),
    border-color var(--transition-base);
}
.pager-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.pager-btn:not(:disabled):hover {
  background: var(--color-background-mute);
}
.page-indicator {
  font-weight: 600;
  letter-spacing: 0.6px;
}
.per-page-control {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.per-page-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
.per-page-control select {
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  padding: 0.45rem 0.8rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
}
.per-page-control select:focus {
  outline: 2px solid rgba(var(--brand-primary-rgb) / 0.3);
}
.table-scroll thead th {
  text-align: left;
  font-weight: 600;
  letter-spacing: 0.7px;
  font-size: 0.63rem;
  text-transform: uppercase;
  padding: 0.75rem 0.85rem;
  background: var(--color-background-soft);
  position: sticky;
  top: 0;
  z-index: 5;
}
.table-scroll tbody td {
  padding: 0.7rem 0.85rem;
  border-top: 1px solid var(--color-border);
}
.table-scroll tbody tr {
  transition: background 0.25s;
}
.table-scroll tbody tr:hover {
  background: var(--color-background-mute);
}
.table-scroll .center {
  text-align: center;
}
.table-btn {
  font-size: 0.55rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.55px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  color: var(--brand-primary);
  padding: 0.45rem 0.65rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  line-height: 1;
  transition:
    background var(--transition-base),
    border-color var(--transition-base);
}
.table-btn + .table-btn {
  margin-left: 0.35rem;
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
.actividad {
  max-width: 160px;
}
.acciones-col {
  white-space: nowrap;
}

/* Estado vacío */
.empty {
  text-align: center;
  font-size: 0.7rem;
  letter-spacing: 0.5px;
  opacity: 0.7;
}

/* Errores formulario */
.f-group.error input {
  border-color: #d92d20;
  background: rgba(217 45 32 / 0.08);
}
.err-msg {
  font-size: 0.55rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #d92d20;
}
.invalid {
  border-color: #d92d20;
}

/* Feedback */
.feedback {
  grid-column: 1 / -1;
  font-size: 0.65rem;
  letter-spacing: 0.5px;
  font-weight: 600;
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.feedback.ok {
  background: linear-gradient(90deg, #d1fadf, #a6f4c5);
  color: #067647;
}
.feedback.error {
  background: linear-gradient(90deg, #fee4e2, #fecdca);
  color: #b42318;
}

/* Modales Modernos */
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

.modal-modern-edit {
  width: min(900px, 95vw);
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

.modal-modern-confirm {
  width: min(520px, 95vw);
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

.form-container-modern {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
}

.edit-form-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-clonado {
  display: grid;
  gap: var(--space-5);
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.form-clonado .f-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.form-clonado .f-group label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--color-text);
  opacity: 0.8;
}

.form-clonado input,
.form-clonado select {
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  padding: 0.75rem 0.85rem;
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  color: var(--color-text);
  transition:
    border-color var(--transition-base),
    box-shadow var(--transition-base);
}

.form-clonado input:focus,
.form-clonado select:focus {
  outline: none;
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 2px rgba(var(--brand-primary-rgb) / 0.15);
  background: var(--color-background);
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

.alert-modern.ok {
  background: rgba(34, 197, 94, 0.1);
  color: #059669;
  border: 1px solid rgba(34, 197, 94, 0.2);
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

/* Modal de Confirmación */
.confirm-message-modern {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--color-background-soft);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.confirm-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.confirm-text {
  flex: 1;
}

.confirm-text p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--color-text);
}

.confirm-text strong {
  color: var(--color-heading);
  font-weight: 600;
}

.client-details-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text);
  opacity: 0.7;
}

.detail-value {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-heading);
}

/* Responsive */
@media (max-width: 768px) {
  .modal-modern-edit,
  .modal-modern-confirm {
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

  .form-clonado {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .modal-backdrop-modern {
    padding: var(--space-2);
  }

  .modal-modern-edit,
  .modal-modern-confirm {
    width: 100vw;
    height: 100vh;
    max-height: none;
    border-radius: 0;
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .table-scroll thead th {
    background: var(--color-background-mute);
  }
  .table-btn {
    background: var(--color-background-soft);
  }
}
@media (prefers-reduced-motion: reduce) {
  .table-scroll tbody tr {
    transition: none !important;
  }
}

.clientes-lista-wrapper {
  padding: 1rem;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  transition: 0.3s ease;
}

.lista-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.lista-scroll {
  max-height: 480px;
  overflow-y: auto;
}

.clientes-lista {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.cliente-item {
  background: #fafafa;
  border: 1px solid #e3e3e3;
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  transition: 0.25s;
}

.cliente-item:hover {
  background: #f0f7ff;
  border-color: #2196f3;
}

.cliente-nombre {
  margin: 0;
  font-size: 1.1rem;
  color: #1e293b;
  font-weight: 600;
}

.cliente-detalles,
.cliente-email,
.cliente-actividad {
  font-size: 0.9rem;
  margin: 0.25rem 0;
  color: #475569;
}

.cliente-acciones {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.btn {
  border-radius: 6px;
  font-size: 0.85rem;
  padding: 0.4rem 0.7rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline {
  border: 1px solid #2196f3;
  background: transparent;
  color: #2196f3;
}
.btn-outline:hover {
  background: #2196f3;
  color: white;
}

.btn-danger {
  border: 1px solid #e53935;
  background: #e53935;
  color: white;
}
.btn-danger:hover {
  opacity: 0.9;
}

.lista-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pager {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.pager-btn {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  transition: 0.2s;
}
.pager-btn:hover {
  background: #2196f3;
  color: white;
}

.page-indicator {
  font-size: 0.85rem;
  color: #475569;
}

</style>
