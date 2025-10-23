<script setup>
// Emisión de factura con integración a stores (facturas/clientes)
// Formato adaptado a factura / comprobante El Salvador (IVA 13%)
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useFacturasStore } from '@/stores/facturas'
import { useClientesStore } from '@/stores/clientes'
import { useCatalogosStore } from '@/stores/catalogos'

// Asunciones (pueden ajustarse luego):
// - Precio ingresado es base (sin IVA) para líneas Gravadas.
// - Para Exento y No Sujeto no se calcula IVA.
// - Tipo de documento afecta potencialmente validaciones futuras (por ahora solo UI).

const router = useRouter()
const facturasStore = useFacturasStore()
const clientesStore = useClientesStore()
const catalogosStore = useCatalogosStore()

const numeroControl = ref('NC-00000001') // Placeholder (normalmente backend)
const serie = ref('A001')
const fecha = ref(new Date().toISOString().substring(0, 10))
// Tipo de documento: proviene de catálogo (tipos de factura)
const tipoDocumentoId = ref('')
// Cliente: selección desde store de clientes + alta rápida
const busquedaCliente = ref('')
const clienteSeleccionado = ref(null) // objeto del store clientes
const cliente = ref('') // fallback visual
const nit = ref('')
const nrc = ref('')
const giro = ref('')
const direccion = ref('')
const municipio = ref('')
const departamento = ref('')
const formaPagoId = ref('')
const diasCredito = ref(30)
const formasPago = computed(() => catalogosStore.formasPagoOrdenadas)
const formaPagoSeleccionada = computed(() => catalogosStore.formaPagoPorId(formaPagoId.value))
const esCredito = computed(() =>
  (formaPagoSeleccionada.value?.name || '').toLowerCase().includes('credito'),
)
const tiposFactura = computed(() => catalogosStore.tiposFacturaOrdenados)

// Establecimientos y puntos de venta
const establecimientoId = ref('')
const puntoVentaId = ref('')
const establecimientos = computed(() => catalogosStore.establecimientosOrdenados)
const puntosVenta = computed(() =>
  catalogosStore.puntosVentaDeEstablecimiento(establecimientoId.value),
)

const items = ref([
  { id: 1, descripcion: '', cantidad: 1, precio: 0, tipo: 'gravado' }, // tipo: gravado|exento|no_sujeto
])

const agregarItem = () => {
  items.value.push({ id: Date.now(), descripcion: '', cantidad: 1, precio: 0, tipo: 'gravado' })
}

const eliminarItem = (id) => {
  if (items.value.length === 1) return
  items.value = items.value.filter((i) => i.id !== id)
}

const totalLinea = (it) => {
  const base = Number(it.cantidad || 0) * Number(it.precio || 0)
  if (it.tipo === 'gravado') return base + base * 0.13
  return base
}

const gravadoBase = computed(() =>
  items.value
    .filter((i) => i.tipo === 'gravado')
    .reduce((acc, it) => acc + Number(it.cantidad || 0) * Number(it.precio || 0), 0),
)
const exento = computed(() =>
  items.value
    .filter((i) => i.tipo === 'exento')
    .reduce((acc, it) => acc + Number(it.cantidad || 0) * Number(it.precio || 0), 0),
)
const noSujeto = computed(() =>
  items.value
    .filter((i) => i.tipo === 'no_sujeto')
    .reduce((acc, it) => acc + Number(it.cantidad || 0) * Number(it.precio || 0), 0),
)
const iva = computed(() => gravadoBase.value * 0.13)
const subtotalGeneral = computed(() => gravadoBase.value + exento.value + noSujeto.value)
const total = computed(() => subtotalGeneral.value + iva.value)

// Texto en letras (placeholder simple)
const totalEnLetras = computed(() => {
  const t = total.value || 0
  return `USD ${t.toFixed(2)} (solo diseño)`
})

// Visibilidad panel totales para mostrar versión flotante
const summaryRef = ref(null)
const summaryVisible = ref(true)
const scrollY = ref(0)
const showFloating = computed(() => scrollY.value > 400 && !summaryVisible.value)

const onScroll = () => {
  scrollY.value = window.scrollY || 0
}
let observer
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  observer = new IntersectionObserver((entries) => {
    if (entries[0]) summaryVisible.value = entries[0].isIntersecting
  })
  if (summaryRef.value) observer.observe(summaryRef.value)
  // cargar clientes para selector inicial
  clientesStore.cargarClientes('')
  // cargar formas de pago
  catalogosStore.cargarFormasPago({})
  // cargar establecimientos
  catalogosStore.cargarEstablecimientos({})
  // cargar tipos de factura
  catalogosStore.cargarTiposFactura({})
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  if (observer && summaryRef.value) observer.unobserve(summaryRef.value)
})

// Sincronizar campos visibles cuando cambia el cliente seleccionado
watch(
  () => clienteSeleccionado.value,
  (c) => {
    if (!c) return
    cliente.value = c.nombre || ''
    nit.value = c.nit || ''
    nrc.value = c.nrc || ''
    giro.value = c.descripcionActividad || c.actividadNombre || ''
    // Campos dirección (si existen en el modelo)
    departamento.value = c.departamentoNombre || ''
    municipio.value = c.municipioNombre || ''
  },
)

function seleccionarClientePorCodigo(codigo) {
  const c = clientesStore.clientes.find((x) => x.codigo === codigo)
  if (c) clienteSeleccionado.value = c
}

async function buscarClientes() {
  await clientesStore.cargarClientes(busquedaCliente.value || '')
}

// Alta rápida de cliente
const mostrarModalCliente = ref(false)
const clienteForm = ref({ nombre: '', nit: '', nrc: '', email: '', descripcionActividad: '' })
const clienteErrores = ref({})

function abrirNuevoCliente() {
  clienteForm.value = { nombre: '', nit: '', nrc: '', email: '', descripcionActividad: '' }
  clienteErrores.value = {}
  mostrarModalCliente.value = true
}
function cerrarModalCliente() {
  mostrarModalCliente.value = false
}
async function crearClienteDesdeModal() {
  const res = await clientesStore.crearCliente(clienteForm.value)
  if (!res.ok) {
    clienteErrores.value = res.errores || { general: res.error || 'Error al guardar' }
    return
  }
  clienteSeleccionado.value = res.item
  mostrarModalCliente.value = false
}

// Emitir factura
const enviando = computed(() => facturasStore.enviando)
const errorEnvio = computed(() => facturasStore.error)

async function emitirFactura() {
  const datos = {
    fecha: fecha.value,
    tipoDocumentoId: tipoDocumentoId.value || undefined,
    cliente: clienteSeleccionado.value
      ? {
          nombre: clienteSeleccionado.value.nombre,
          codigo: clienteSeleccionado.value.codigo,
          backendId: clienteSeleccionado.value.backendId,
        }
      : { nombre: cliente.value, codigo: null, backendId: null },
    formaPago: formaPagoSeleccionada.value
      ? {
          id: formaPagoSeleccionada.value.id,
          name: formaPagoSeleccionada.value.name,
          codigoCFE: formaPagoSeleccionada.value.codigoCFE,
        }
      : null,
    PUNTO_VENTA: puntoVentaId.value || undefined,
    diasCredito: esCredito.value ? Number(diasCredito.value || 0) : undefined,
    items: items.value.map((i) => ({
      descripcion: i.descripcion,
      cantidad: i.cantidad,
      precio: i.precio,
      tipo: i.tipo,
    })),
    montos: {
      gravado: gravadoBase.value,
      exento: exento.value,
      noSujeto: noSujeto.value,
      iva: iva.value,
      subtotal: subtotalGeneral.value,
      total: total.value,
    },
  }
  const res = await facturasStore.emitir(datos)
  if (!res.ok) return
  // Redirigir a listado de facturas
  router.push('/dashboard/facturas')
}
</script>

<template>
  <div class="factura-form">
    <header class="ff-head">
      <h2>Nueva Factura</h2>
    </header>
    <div class="factura-layout">
      <div class="factura-main">
        <section class="panel surface-card">
          <h3 class="panel-title">Datos Generales</h3>
          <div class="form-grid">
            <div class="field">
              <label>Número Control</label>
              <input v-model="numeroControl" type="text" disabled />
            </div>
            <div class="field">
              <label>Serie</label>
              <input v-model="serie" type="text" disabled />
            </div>
            <div class="field">
              <label>Fecha Emisión</label>
              <input v-model="fecha" type="date" />
            </div>
            <div class="field">
              <label>Tipo Documento</label>
              <select v-model="tipoDocumentoId">
                <option value="">Seleccione</option>
                <option v-for="t in tiposFactura" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
            </div>
            <div class="field span-2">
              <label>Cliente / Razón Social</label>
              <div class="cliente-picker">
                <input
                  v-model="busquedaCliente"
                  type="text"
                  placeholder="Buscar cliente por nombre, NIT, NRC"
                  @keyup.enter="buscarClientes"
                />
                <button class="mini-btn" type="button" @click="buscarClientes">Buscar</button>
              </div>
              <div class="cliente-select">
                <select
                  :value="clienteSeleccionado?.codigo || ''"
                  @change="(e) => seleccionarClientePorCodigo(e.target.value)"
                >
                  <option value="">Seleccione un cliente</option>
                  <option v-for="c in clientesStore.clientes" :key="c.codigo" :value="c.codigo">
                    {{ c.nombre }}
                    {{ c.nit ? ` · NIT ${c.nit}` : '' }}
                  </option>
                </select>
                <button class="mini-btn" type="button" @click="abrirNuevoCliente">Agregar</button>
              </div>
            </div>
            <div class="field">
              <label>NIT</label>
              <input v-model="nit" type="text" readonly />
            </div>
            <div class="field">
              <label>NRC</label>
              <input v-model="nrc" type="text" readonly />
            </div>
            <div class="field">
              <label>Giro (Actividad Económica)</label>
              <input v-model="giro" type="text" readonly />
            </div>
            <div class="field span-2">
              <label>Dirección</label>
              <input v-model="direccion" type="text" />
            </div>
            <div class="field">
              <label>Municipio</label>
              <input v-model="municipio" type="text" />
            </div>
            <div class="field">
              <label>Departamento</label>
              <input v-model="departamento" type="text" />
            </div>
            <div class="field">
              <label>Forma de Pago</label>
              <select v-model="formaPagoId">
                <option value="">Seleccione</option>
                <option v-for="fp in formasPago" :key="fp.id" :value="fp.id">{{ fp.name }}</option>
              </select>
            </div>
            <div class="field" v-if="esCredito">
              <label>Días Crédito</label>
              <input v-model.number="diasCredito" type="number" min="1" />
            </div>
            <div class="field">
              <label>Establecimiento</label>
              <select v-model="establecimientoId">
                <option value="">Seleccione</option>
                <option v-for="e in establecimientos" :key="e.id" :value="e.id">
                  {{ e.name }}
                  {{ e.codMH ? ` · MH ${e.codMH}` : '' }}
                </option>
              </select>
            </div>
            <div class="field">
              <label>Punto de Venta</label>
              <select v-model="puntoVentaId" :disabled="!establecimientoId || !puntosVenta.length">
                <option value="">Seleccione</option>
                <option v-for="pv in puntosVenta" :key="pv.id" :value="pv.id">{{ pv.name }}</option>
              </select>
            </div>
          </div>
        </section>
        <section class="panel surface-card">
          <div class="items-head">
            <h3 class="panel-title">Detalle de Items (IVA 13%)</h3>
            <button class="mini-btn" @click="agregarItem" type="button">Añadir línea</button>
          </div>
          <div class="items-table-wrapper">
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 33%">Descripción</th>
                  <th>Cant.</th>
                  <th>Tipo</th>
                  <th>Precio Base</th>
                  <th>IVA</th>
                  <th>Total Línea</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="it in items" :key="it.id">
                  <td>
                    <input
                      v-model="it.descripcion"
                      placeholder="Descripción del producto/servicio"
                    />
                  </td>
                  <td>
                    <input v-model.number="it.cantidad" type="number" min="1" />
                  </td>
                  <td>
                    <select v-model="it.tipo">
                      <option value="gravado">Gravado</option>
                      <option value="exento">Exento</option>
                      <option value="no_sujeto">No Sujeto</option>
                    </select>
                  </td>
                  <td>
                    <input v-model.number="it.precio" type="number" min="0" step="0.01" />
                  </td>
                  <td class="importe">
                    {{
                      it.tipo === 'gravado' ? (it.cantidad * it.precio * 0.13).toFixed(2) : '0.00'
                    }}
                  </td>
                  <td class="importe">{{ totalLinea(it).toFixed(2) }}</td>
                  <td class="center">
                    <button
                      class="icon-btn"
                      type="button"
                      :disabled="items.length === 1"
                      @click="eliminarItem(it.id)"
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <aside class="factura-side">
        <section ref="summaryRef" class="totales panel surface-soft sticky">
          <h3 class="panel-title small">Resumen</h3>
          <div class="tot-line">
            <span>Gravado</span><strong>{{ gravadoBase.toFixed(2) }}</strong>
          </div>
          <div class="tot-line">
            <span>Exento</span><strong>{{ exento.toFixed(2) }}</strong>
          </div>
          <div class="tot-line">
            <span>No Sujeto</span><strong>{{ noSujeto.toFixed(2) }}</strong>
          </div>
          <div class="tot-line">
            <span>IVA 13%</span><strong>{{ iva.toFixed(2) }}</strong>
          </div>
          <div class="tot-line sub-sep">
            <span>Subtotal</span><strong>{{ subtotalGeneral.toFixed(2) }}</strong>
          </div>
          <div class="tot-line grand">
            <span>Total</span><strong>{{ total.toFixed(2) }}</strong>
          </div>
          <div class="tot-letras">Son: {{ totalEnLetras }}</div>
          <div class="tot-actions">
            <button :disabled="enviando" class="btn-outline" type="button" @click="emitirFactura">
              {{ enviando ? 'Enviando...' : 'Guardar' }}
            </button>
            <button :disabled="enviando" class="btn-primary" type="button" @click="emitirFactura">
              {{ enviando ? 'Enviando...' : 'Emitir' }}
            </button>
            <small v-if="errorEnvio" class="text-danger">{{ errorEnvio }}</small>
          </div>
        </section>
      </aside>
    </div>
    <div
      v-if="showFloating"
      class="floating-resumen surface-card"
      role="status"
      aria-label="Resumen total factura"
    >
      <div class="fr-line">
        <span>Subtotal</span><strong>{{ subtotalGeneral.toFixed(2) }}</strong>
      </div>
      <div class="fr-line">
        <span>IVA</span><strong>{{ iva.toFixed(2) }}</strong>
      </div>
      <div class="fr-line grand">
        <span>Total</span><strong>{{ total.toFixed(2) }}</strong>
      </div>
      <div class="fr-actions">
        <button :disabled="enviando" class="btn-outline mini" type="button" @click="emitirFactura">
          {{ enviando ? '...' : 'Guardar' }}
        </button>
        <button :disabled="enviando" class="btn-primary mini" type="button" @click="emitirFactura">
          {{ enviando ? '...' : 'Emitir' }}
        </button>
      </div>
    </div>

    <!-- Modal: Crear Cliente Rápido -->
    <div v-if="mostrarModalCliente" class="modal-overlay" role="dialog" aria-modal="true">
      <div class="modal-card surface-card">
        <header class="modal-head">
          <h4>Nuevo Cliente</h4>
          <button class="icon-btn" type="button" @click="cerrarModalCliente">✕</button>
        </header>
        <div class="modal-body">
          <div class="form-grid">
            <div class="field span-2">
              <label>Nombre</label>
              <input v-model="clienteForm.nombre" type="text" />
              <small v-if="clienteErrores.nombre" class="text-danger">{{
                clienteErrores.nombre
              }}</small>
            </div>
            <div class="field">
              <label>NIT</label>
              <input v-model="clienteForm.nit" type="text" />
              <small v-if="clienteErrores.nit" class="text-danger">{{ clienteErrores.nit }}</small>
            </div>
            <div class="field">
              <label>NRC</label>
              <input v-model="clienteForm.nrc" type="text" />
              <small v-if="clienteErrores.nrc" class="text-danger">{{ clienteErrores.nrc }}</small>
            </div>
            <div class="field span-2">
              <label>Giro / Actividad económica</label>
              <input v-model="clienteForm.descripcionActividad" type="text" />
            </div>
            <div class="field span-2">
              <label>Email</label>
              <input v-model="clienteForm.email" type="email" />
              <small v-if="clienteErrores.email" class="text-danger">{{
                clienteErrores.email
              }}</small>
            </div>
          </div>
        </div>
        <footer class="modal-foot">
          <button class="btn-outline" type="button" @click="cerrarModalCliente">Cancelar</button>
          <button class="btn-primary" type="button" @click="crearClienteDesdeModal">Guardar</button>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.factura-form {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  animation: fade-in 0.4s ease;
}
.factura-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 1.5rem;
  align-items: start;
}
.factura-main {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
}
.factura-side {
  position: relative;
}
.sticky {
  position: sticky;
  top: 72px;
}
.ff-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.ff-head h2 {
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.ff-actions {
  display: none;
}

.panel {
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 1.15rem 1.1rem 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
}
.panel-title {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 600;
  opacity: 0.75;
}

.form-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.field label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  opacity: 0.7;
}
.field input,
.field select {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 0.6rem 0.75rem;
  font: inherit;
  background: var(--color-background);
}
.field input:focus {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}
.span-2 {
  grid-column: span 2;
}

.items-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.items-table-wrapper {
  overflow-x: auto;
}
.items-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 0.55rem;
}
.items-table th {
  text-align: left;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  font-weight: 600;
  opacity: 0.65;
  padding: 0 0.5rem;
}
.items-table td {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  padding: 0.55rem 0.5rem;
  font-size: 0.75rem;
  vertical-align: middle;
}
.items-table td:first-child {
  border-radius: 12px 0 0 12px;
}
.items-table td:last-child {
  border-radius: 0 12px 12px 0;
}
.items-table input[type='text'],
.items-table input[type='number'],
.items-table select {
  width: 100%;
  border: 0;
  background: transparent;
  font: inherit;
  padding: 0;
}
.items-table input:focus {
  outline: none;
}
.center {
  text-align: center;
}
.icon-btn {
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  width: 26px;
  height: 26px;
  font-size: 0.8rem;
  cursor: pointer;
}
.icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.importe {
  font-weight: 600;
  letter-spacing: 0.5px;
}

.totales {
  align-self: flex-start;
  min-width: 260px;
  border-radius: 18px;
  padding: 1rem 1.1rem 1.15rem;
  gap: 0.55rem;
}
.panel-title.small {
  font-size: 0.7rem;
}
.tot-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.9rem;
}
.tot-actions .btn-primary,
.tot-actions .btn-outline {
  width: 100%;
  cursor: not-allowed;
}
.floating-resumen {
  position: fixed;
  right: clamp(0.75rem, 2.2vw, 2rem);
  bottom: 1rem;
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.85rem 0.95rem 0.95rem;
  width: 210px;
  border: 1px solid var(--color-border);
  border-radius: 18px;
  box-shadow:
    0 8px 28px -10px rgba(0, 0, 0, 0.25),
    0 4px 14px -6px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(6px);
  background: var(--color-background);
}
.floating-resumen .fr-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.65rem;
}
.floating-resumen .fr-line strong {
  font-size: 0.75rem;
  letter-spacing: 0.5px;
}
.floating-resumen .fr-line.grand {
  margin-top: 0.25rem;
  padding-top: 0.4rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.75rem;
}
.floating-resumen .fr-line.grand strong {
  font-size: 0.85rem;
  color: var(--brand-primary);
}
.floating-resumen .fr-actions {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.35rem;
}
.floating-resumen .mini {
  font-size: 0.55rem;
  padding: 0.45rem 0.6rem;
  border-radius: 10px;
  letter-spacing: 0.7px;
  cursor: not-allowed;
}
.tot-line.sub-sep {
  margin-top: 0.35rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--color-border);
}
.tot-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
}
.tot-line strong {
  font-size: 0.8rem;
  font-weight: 600;
}
.tot-line.grand {
  margin-top: 0.4rem;
  padding-top: 0.65rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.9rem;
}
.tot-line.grand strong {
  font-size: 1rem;
  color: var(--brand-primary);
}
.tot-letras {
  margin-top: 0.5rem;
  font-size: 0.6rem;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  opacity: 0.7;
  font-weight: 600;
}

.btn-primary,
.btn-outline,
.mini-btn {
  font-family: inherit;
  font-size: 0.65rem;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  font-weight: 600;
  padding: 0.65rem 0.9rem;
  border-radius: 14px;
  cursor: not-allowed;
}
.btn-primary {
  background: linear-gradient(130deg, #36c6a8, #0aa57c);
  color: #fff;
  border: 1px solid #0aa57c;
}
.btn-outline {
  background: var(--color-background);
  border: 1px solid var(--color-border);
}
.mini-btn {
  padding: 0.45rem 0.65rem;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  cursor: pointer;
}

.cliente-picker {
  display: flex;
  gap: 0.4rem;
}
.cliente-select {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: grid;
  place-items: center;
  z-index: 1000;
}
.modal-card {
  width: min(720px, 92vw);
  border-radius: 18px;
  border: 1px solid var(--color-border);
  padding: 0.8rem 0.85rem 0.95rem;
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.modal-body {
  margin-top: 0.6rem;
}
.modal-foot {
  margin-top: 0.9rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

@media (max-width: 1080px) {
  .factura-layout {
    grid-template-columns: minmax(0, 1fr) 300px;
  }
}
@media (max-width: 980px) {
  .factura-layout {
    grid-template-columns: 1fr;
  }
  .factura-side {
    order: -1;
  }
  .sticky {
    position: relative;
    top: 0;
  }
}
@media (max-width: 980px) {
  .floating-resumen {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    bottom: 0.75rem;
    width: min(420px, 92%);
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.55rem 0.9rem;
    padding: 0.75rem 0.85rem;
  }
  .floating-resumen .fr-actions {
    flex: 1 1 100%;
    justify-content: flex-end;
  }
}
@media (max-width: 840px) {
  .span-2 {
    grid-column: span 1;
  }
}
@media (max-width: 620px) {
  .items-table th,
  .items-table td {
    font-size: 0.65rem;
  }
}
@media (prefers-color-scheme: dark) {
  .panel {
    background: var(--color-background-soft);
  }
  .items-table td {
    background: var(--color-background-soft);
  }
}
@media (prefers-color-scheme: dark) {
  .floating-resumen {
    background: var(--color-background-soft);
  }
}
@media (prefers-reduced-motion: reduce) {
  .factura-form {
    animation: none !important;
  }
}
</style>
