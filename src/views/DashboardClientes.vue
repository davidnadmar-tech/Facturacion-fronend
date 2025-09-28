<script setup>
import { ref, reactive, computed } from 'vue'
import { useClientesStore } from '@/stores/clientes'

// Store
const store = useClientesStore()
store.cargarLocal()
store.seedDemo()

// UI State
const mostrarForm = ref(false)
const editCodigo = ref(null) // null = creando
const filtro = ref('')
const buscando = ref(false)
const feedback = ref(null) // { tipo:'ok'|'error', msg }
const errores = reactive({})

// Catálogos mínimos (placeholder) — se pueden externalizar
const departamentos = ['San Salvador', 'La Libertad', 'Santa Ana', 'San Miguel', 'Sonsonate']
const municipiosPorDepartamento = {
  'San Salvador': ['San Salvador', 'Soyapango', 'Ilopango'],
  'La Libertad': ['Santa Tecla', 'Antiguo Cuscatlán', 'Zaragoza'],
  'Santa Ana': ['Santa Ana', 'Metapán'],
  'San Miguel': ['San Miguel', 'Chinameca'],
  Sonsonate: ['Sonsonate', 'Acajutla'],
}

// Formulario controlado
const form = reactive({
  codigo: '',
  nombre: '',
  telefono: '',
  email: '',
  codigoActividad: '',
  descripcionActividad: '',
  nrc: '',
  nit: '',
  dui: '',
  departamento: '',
  municipio: '',
})

const municipios = computed(() =>
  form.departamento ? municipiosPorDepartamento[form.departamento] || [] : [],
)

const listaFiltrada = computed(() => store.filtrados(filtro.value))

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

function limpiar() {
  Object.assign(form, {
    codigo: '',
    nombre: '',
    telefono: '',
    email: '',
    codigoActividad: '',
    descripcionActividad: '',
    nrc: '',
    nit: '',
    dui: '',
    departamento: '',
    municipio: '',
  })
}

function cancelar() {
  mostrarForm.value = false
  editCodigo.value = null
  feedback.value = null
  Object.keys(errores).forEach((k) => delete errores[k])
}

function editar(c) {
  limpiar()
  Object.assign(form, c)
  editCodigo.value = c.codigo
  mostrarForm.value = true
  feedback.value = null
  Object.keys(errores).forEach((k) => delete errores[k])
  scrollTop()
}

function enviar() {
  Object.keys(errores).forEach((k) => delete errores[k])
  feedback.value = null
  const payload = { ...form }
  let resp
  if (!editCodigo.value) {
    resp = store.agregar(payload)
  } else {
    resp = store.actualizar(editCodigo.value, payload)
  }
  if (!resp.ok) {
    if (resp.errores) Object.assign(errores, resp.errores)
    feedback.value = { tipo: 'error', msg: 'Revisa los campos marcados' }
    return
  }
  feedback.value = { tipo: 'ok', msg: editCodigo.value ? 'Cliente actualizado' : 'Cliente creado' }
  if (!editCodigo.value) limpiar()
  if (!editCodigo.value) mostrarForm.value = false
  editCodigo.value = null
}

function eliminar(codigo) {
  if (!confirm('¿Eliminar cliente?')) return
  const r = store.eliminar(codigo)
  if (r.ok) feedback.value = { tipo: 'ok', msg: 'Cliente eliminado' }
}

function blurError(campo) {
  if (errores[campo]) return
  // Validación ligera on-blur si se requiere
}
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
            aria-label="Filtro clientes"
          />
          <button class="btn-search" type="button" disabled>Filtrar</button>
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
      <form class="grid-form" @submit.prevent="enviar">
        <div class="f-group">
          <label>Código</label>
          <input type="text" v-model="form.codigo" placeholder="Autogenerado" disabled />
        </div>
        <div class="f-group span-2" :class="{ error: errores.nombre }">
          <label>Nombre *</label>
          <input
            type="text"
            v-model.trim="form.nombre"
            @blur="blurError('nombre')"
            placeholder="Nombre completo"
          />
          <span v-if="errores.nombre" class="err-msg">{{ errores.nombre }}</span>
        </div>
        <div class="f-group">
          <label>Teléfono</label>
          <input type="text" v-model.trim="form.telefono" placeholder="Opcional" />
        </div>
        <div class="f-group">
          <label>Email</label>
          <input
            type="email"
            v-model.trim="form.email"
            placeholder="correo@dominio.com"
            :class="{ invalid: errores.email }"
          />
          <span v-if="errores.email" class="err-msg">{{ errores.email }}</span>
        </div>
        <div class="f-group">
          <label>Código Actividad</label>
          <div class="input-inline">
            <input type="text" v-model="form.codigoActividad" placeholder="Seleccionar" />
            <button type="button" class="mini-btn" disabled title="Pendiente modal">Buscar</button>
          </div>
        </div>
        <div class="f-group span-2">
          <label>Descripción Actividad / Giro</label>
          <input type="text" v-model="form.descripcionActividad" placeholder="Autocompletar" />
        </div>
        <div class="f-group">
          <label>NRC</label>
          <input type="text" v-model.trim="form.nrc" placeholder="NRC" />
        </div>
        <div class="f-group" :class="{ error: errores.nit }">
          <label>NIT</label>
          <input type="text" v-model.trim="form.nit" placeholder="NIT" />
          <span v-if="errores.nit" class="err-msg">{{ errores.nit }}</span>
        </div>
        <div class="f-group">
          <label>DUI</label>
          <input type="text" v-model.trim="form.dui" placeholder="DUI" />
        </div>
        <div class="f-group">
          <label>Departamento</label>
          <select v-model="form.departamento">
            <option value="">Seleccionar</option>
            <option v-for="d in departamentos" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div class="f-group">
          <label>Municipio</label>
          <select v-model="form.municipio" :disabled="!municipios.length">
            <option value="">Seleccionar</option>
            <option v-for="m in municipios" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
        <div class="form-actions span-3">
          <button type="submit" class="btn btn-primary">
            {{ editCodigo ? 'Actualizar' : 'Guardar' }}
          </button>
          <button type="button" class="btn" @click="cancelar">Cancelar</button>
        </div>
        <div v-if="feedback" class="feedback" :class="feedback.tipo">{{ feedback.msg }}</div>
      </form>
    </section>

    <!-- Tabla -->
    <section class="table-wrapper surface-card elev-2" aria-label="Listado clientes">
      <header class="table-head">
        <h3>Lista de Clientes ({{ store.total }})</h3>
        <small class="text-muted" v-if="filtro">Filtro activo</small>
      </header>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>NRC</th>
              <th>NIT</th>
              <th>DUI</th>
              <th>Email</th>
              <th>Actividad</th>
              <th class="center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!listaFiltrada.length">
              <td colspan="7" class="empty">No hay clientes</td>
            </tr>
            <tr v-for="c in listaFiltrada" :key="c.codigo">
              <td>{{ c.nombre }}</td>
              <td>{{ c.nrc }}</td>
              <td>{{ c.nit }}</td>
              <td>{{ c.dui }}</td>
              <td>{{ c.email }}</td>
              <td class="actividad">{{ c.descripcionActividad }}</td>
              <td class="center acciones-col">
                <button class="table-btn" type="button" @click="editar(c)">Editar</button>
                <button class="table-btn danger" type="button" @click="eliminar(c.codigo)">
                  Borrar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Modal placeholder (sin funcionalidad) -->
    <dialog class="modal-actividad" open hidden>
      <div class="modal-surface surface-card elev-3">
        <header class="modal-head">
          <h4>Buscar Actividad Económica</h4>
          <button class="close-btn" disabled>&times;</button>
        </header>
        <div class="modal-body">
          <div class="search-row">
            <input type="text" placeholder="Buscar..." disabled />
            <button class="mini-btn" disabled>Buscar</button>
          </div>
          <div class="placeholder-table">
            <div class="ph-row" v-for="n in 6" :key="n">
              <span class="ph-block w-20"></span>
              <span class="ph-block w-60"></span>
            </div>
          </div>
        </div>
        <footer class="modal-foot">
          <button class="btn-outline" disabled>Cerrar</button>
        </footer>
      </div>
    </dialog>
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

/* Modal placeholder */
.modal-actividad[open] {
  display: none;
}
.modal-surface {
  max-width: 720px;
  margin: 2rem auto;
  padding: var(--space-6) var(--space-5) var(--space-5);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.modal-head h4 {
  font-size: 0.9rem;
  font-weight: 600;
}
.close-btn {
  background: transparent;
  border: 0;
  font-size: 1.4rem;
  line-height: 1;
  cursor: not-allowed;
}
.search-row {
  display: flex;
  gap: 0.6rem;
}
.search-row input {
  flex: 1;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  padding: 0.7rem 0.85rem;
  border-radius: var(--radius-md);
}
.placeholder-table {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.ph-row {
  display: flex;
  gap: 0.75rem;
}
.ph-block {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    var(--color-background-mute),
    var(--color-background-soft),
    var(--color-background-mute)
  );
  background-size: 200% 100%;
  animation: shimmer 2.2s ease-in-out infinite;
}
.w-20 {
  width: 20%;
}
.w-60 {
  width: 60%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
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
  .ph-block {
    animation: none !important;
  }
}
</style>
