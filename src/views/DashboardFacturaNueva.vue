<script setup>
// Emisión de factura con integración a stores (facturas/clientes)
// Formato adaptado a factura / comprobante El Salvador (IVA 13%)
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useFacturasStore } from '@/stores/facturas'
import { useClientesStore } from '@/stores/clientes'
import { useCatalogosStore } from '@/stores/catalogos'
import { useInventarioItemsStore } from '@/stores/inventarioItems'

// Asunciones (pueden ajustarse luego):
// - Precio ingresado es base (sin IVA) para líneas Gravadas.
// - Para Exento y No Sujeto no se calcula IVA.
// - Tipo de documento afecta potencialmente validaciones futuras (por ahora solo UI).

const router = useRouter()
const facturasStore = useFacturasStore()
const clientesStore = useClientesStore()
const catalogosStore = useCatalogosStore()
const inventarioStore = useInventarioItemsStore()

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

function generarIdLineaFactura() {
  return `linea-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const items = ref([])

const productosModalAbierto = ref(false)
const busquedaProducto = ref('')
const tipoProductoFiltro = ref('')
const productosFeedback = ref(null)
const productoSeleccionado = ref(null)
const detallesProductoSeleccionado = ref([])
const usarTotalProducto = ref(false)
const errorSeleccionProducto = ref(null)

const productosInventario = computed(() => inventarioStore.itemsOrdenados || [])
const tiposProductoInventario = computed(() => {
  const set = new Set()
  productosInventario.value.forEach((producto) => {
    if (producto?.TIPO) set.add(String(producto.TIPO).toUpperCase())
  })
  return Array.from(set).sort()
})

const productosFiltrados = computed(() => {
  const termino = busquedaProducto.value.trim().toLowerCase()
  const tipoFiltro = tipoProductoFiltro.value.trim().toLowerCase()
  if (!termino && !tipoFiltro) return productosInventario.value
  return productosInventario.value.filter((producto) => {
    const textoBusqueda =
      `${producto?.name || ''} ${producto?.DESCRIPCION || ''} ${producto?.CODE || ''}`.toLowerCase()
    const coincideTexto = !termino || textoBusqueda.includes(termino)
    const coincideTipo = !tipoFiltro || (producto?.TIPO || '').toLowerCase().includes(tipoFiltro)
    return coincideTexto && coincideTipo
  })
})

const cargandoProductos = computed(() => inventarioStore.cargando)
const totalProductoSeleccionado = computed(() =>
  productoSeleccionado.value ? calcularPrecioProducto(productoSeleccionado.value) : 0,
)
const resumenSeleccionProducto = computed(() => {
  const seleccionados = detallesProductoSeleccionado.value.filter((detalle) => detalle.incluido)
  const total = seleccionados.reduce(
    (acc, detalle) => acc + Number(detalle.cantidad || 0) * Number(detalle.precio || 0),
    0,
  )
  const unidades = seleccionados.reduce((acc, detalle) => acc + Number(detalle.cantidad || 0), 0)
  return {
    cantidad: seleccionados.length,
    unidades,
    total,
  }
})
const hayDetallesSeleccionables = computed(() => detallesProductoSeleccionado.value.length > 0)
const todosDetallesSeleccionados = computed(() => {
  if (!hayDetallesSeleccionables.value) return false
  return detallesProductoSeleccionado.value.every((detalle) => detalle.incluido)
})

const agregarItem = () => {
  items.value.push({
    id: generarIdLineaFactura(),
    descripcion: '',
    cantidad: 1,
    precio: 0,
    tipo: 'gravado',
    productoId: null,
    productoCodigo: null,
  })
}

const eliminarItem = (id) => {
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

function inferirTipoDesdeProducto(producto) {
  const etiqueta = String(producto?.TIPO || '').toLowerCase()
  if (etiqueta.includes('exento')) return 'exento'
  if (etiqueta.includes('no suj')) return 'no_sujeto'
  return 'gravado'
}

function calcularPrecioProducto(producto) {
  const detalle = Array.isArray(producto?.DATA_OBJETO?.DETALLE) ? producto.DATA_OBJETO.DETALLE : []
  if (!detalle.length) return 0
  return detalle.reduce((acc, fila) => {
    if (!fila) return acc
    const activo = fila.ACTIVO
    const estaActivo =
      typeof activo === 'boolean'
        ? activo
        : activo === undefined
          ? true
          : ['0', 'false', 'no', 'inactivo'].includes(String(activo).trim().toLowerCase())
            ? false
            : Boolean(activo)
    if (!estaActivo) return acc
    const monto = Number.parseFloat(fila.MONTO) || 0
    const cantidad = Number.parseFloat(fila.CANTIDAD) || 1
    const factor = cantidad > 0 ? cantidad : 1
    return acc + monto * factor
  }, 0)
}

function construirDescripcionProducto(producto) {
  const nombre = producto?.name || ''
  const descripcion = producto?.DESCRIPCION || ''
  if (nombre && descripcion) return `${nombre} — ${descripcion}`
  return nombre || descripcion || 'Producto sin nombre'
}

function mapearDetallesProducto(producto) {
  if (!producto) return []
  const lista = Array.isArray(producto?.DATA_OBJETO?.DETALLE) ? producto.DATA_OBJETO.DETALLE : []
  return lista
    .map((detalle, indice) => {
      if (!detalle || typeof detalle !== 'object') return null
      const activo = detalle.ACTIVO
      const estaActivo =
        typeof activo === 'boolean'
          ? activo
          : activo === undefined
            ? true
            : ['0', 'false', 'no', 'inactivo'].includes(String(activo).trim().toLowerCase())
              ? false
              : Boolean(activo)
      if (!estaActivo) return null
      const cantidad = Number.parseFloat(detalle.CANTIDAD)
      const monto = Number.parseFloat(detalle.MONTO)
      const cantidadNormalizada = Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 1
      const montoNormalizado = Number.isFinite(monto) && monto >= 0 ? monto : 0
      const texto = detalle.TEXTO || detalle.descripcion || detalle.Descripcion || ''
      return {
        indice,
        texto: texto || producto?.name || 'Detalle sin descripción',
        cantidad: cantidadNormalizada,
        precio: montoNormalizado,
      }
    })
    .filter(Boolean)
}

function insertarDetallesProductoEnFactura(producto, detalles) {
  const tipoLinea = inferirTipoDesdeProducto(producto)
  detalles.forEach((detalle) => {
    items.value.push({
      id: generarIdLineaFactura(),
      descripcion: producto?.name ? `${producto.name} · ${detalle.texto}` : detalle.texto,
      cantidad: detalle.cantidad,
      precio: detalle.precio,
      tipo: tipoLinea,
      productoId: producto.id || null,
      productoCodigo: producto.CODE || null,
      productoDetalleIndice: detalle.indice,
    })
  })
}

async function abrirSelectorProductos() {
  productosFeedback.value = null
  productosModalAbierto.value = true
  if (!inventarioStore.cargado && !inventarioStore.cargando) {
    const res = await inventarioStore.cargarItems('', {
      page: '1',
      perPage: '50',
    })
    if (!res.ok) {
      productosFeedback.value = { tipo: 'error', msg: res.error || 'No se pudo cargar inventario' }
    }
  }
}

function cerrarSelectorProductos() {
  limpiarSeleccionProducto()
  productosModalAbierto.value = false
  productosFeedback.value = null
  busquedaProducto.value = ''
  tipoProductoFiltro.value = ''
}

async function buscarProductosInventario() {
  productosFeedback.value = null
  const res = await inventarioStore.cargarItems(busquedaProducto.value, {
    page: '1',
    perPage: '50',
    tipo: tipoProductoFiltro.value || undefined,
  })
  if (!res.ok) {
    productosFeedback.value = { tipo: 'error', msg: res.error || 'No se encontraron productos' }
  }
}

function prepararSeleccionProducto(producto) {
  if (!producto) return
  productoSeleccionado.value = producto
  productosFeedback.value = null
  errorSeleccionProducto.value = null
  const detalles = mapearDetallesProducto(producto)
  detallesProductoSeleccionado.value = detalles.map((detalle) => ({
    ...detalle,
    incluido: true,
  }))
  usarTotalProducto.value = !detalles.length
}

function seleccionarTodosDetalles(incluir) {
  detallesProductoSeleccionado.value = detallesProductoSeleccionado.value.map((detalle) => ({
    ...detalle,
    incluido: incluir,
  }))
}

function limpiarSeleccionProducto() {
  productoSeleccionado.value = null
  detallesProductoSeleccionado.value = []
  usarTotalProducto.value = false
  errorSeleccionProducto.value = null
}

function confirmarSeleccionProducto() {
  if (!productoSeleccionado.value) return

  const producto = productoSeleccionado.value
  errorSeleccionProducto.value = null

  if (usarTotalProducto.value) {
    const detallesCompletos = mapearDetallesProducto(producto)
    if (detallesCompletos.length) {
      insertarDetallesProductoEnFactura(producto, detallesCompletos)
      productosFeedback.value = {
        tipo: 'ok',
        msg: `${producto?.name || producto?.DESCRIPCION || 'Producto'}: ${
          detallesCompletos.length
        } detalle${detallesCompletos.length === 1 ? '' : 's'} añadidos a la factura`,
      }
      limpiarSeleccionProducto()
      return
    }

    const base = calcularPrecioProducto(producto)
    const precio = Number.isFinite(base) ? Number(base.toFixed(2)) : 0
    items.value.push({
      id: generarIdLineaFactura(),
      descripcion: construirDescripcionProducto(producto),
      cantidad: 1,
      precio,
      tipo: inferirTipoDesdeProducto(producto),
      productoId: producto.id || null,
      productoCodigo: producto.CODE || null,
    })

    productosFeedback.value = {
      tipo: base > 0 ? 'ok' : 'error',
      msg:
        base > 0
          ? `${producto?.name || producto?.DESCRIPCION || 'Producto'} añadido como línea única.`
          : `${
              producto?.name || producto?.DESCRIPCION || 'Producto'
            } no tiene total sugerido, se agregó con precio 0. Ajusta manualmente si aplica.`,
    }
    limpiarSeleccionProducto()
    return
  }

  if (!usarTotalProducto.value) {
    const detallesSeleccionados = detallesProductoSeleccionado.value.filter(
      (detalle) => detalle.incluido,
    )
    if (!detallesSeleccionados.length) {
      errorSeleccionProducto.value = 'Selecciona al menos un detalle del producto.'
      return
    }

    insertarDetallesProductoEnFactura(producto, detallesSeleccionados)

    productosFeedback.value = {
      tipo: 'ok',
      msg: `${
        producto?.name || producto?.DESCRIPCION || 'Producto'
      }: ${detallesSeleccionados.length} detalle${
        detallesSeleccionados.length === 1 ? '' : 's'
      } añadidos a la factura`,
    }
    limpiarSeleccionProducto()
    return
  }
}

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

watch(usarTotalProducto, (valor) => {
  if (valor && detallesProductoSeleccionado.value.length) {
    seleccionarTodosDetalles(true)
  }
})

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
      productoId: i.productoId || undefined,
      productoCodigo: i.productoCodigo || undefined,
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
                <button class="btn btn-xs btn-outline" type="button" @click="buscarClientes">
                  Buscar
                </button>
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
                <button class="btn btn-xs btn-outline" type="button" @click="abrirNuevoCliente">
                  Agregar
                </button>
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
            <div class="items-actions">
              <button class="btn btn-xs btn-outline" type="button" @click="abrirSelectorProductos">
                Agregar desde productos
              </button>
              <button class="btn btn-xs btn-outline" @click="agregarItem" type="button">
                Añadir línea
              </button>
            </div>
          </div>
          <div class="items-table-wrapper">
            <table class="items-table table-modern">
              <thead>
                <tr>
                  <th class="col-desc upper">Descripción</th>
                  <th class="col-cant upper center">Cant.</th>
                  <th class="col-tipo upper">Tipo</th>
                  <th class="col-precio upper">Precio Base</th>
                  <th class="col-iva upper">IVA</th>
                  <th class="col-total upper">Total Línea</th>
                  <th class="col-acciones"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!items.length">
                  <td class="items-empty" colspan="7">
                    <span class="items-empty-icon">🧾</span>
                    <div class="items-empty-text">
                      No hay líneas agregadas. Usa “Añadir línea” o selecciona un producto del
                      inventario.
                    </div>
                  </td>
                </tr>
                <tr v-for="it in items" :key="it.id">
                  <td class="col-desc">
                    <input
                      v-model="it.descripcion"
                      placeholder="Descripción del producto/servicio"
                    />
                  </td>
                  <td class="center col-cant">
                    <input v-model.number="it.cantidad" type="number" min="1" />
                  </td>
                  <td class="col-tipo">
                    <select v-model="it.tipo">
                      <option value="gravado">Gravado</option>
                      <option value="exento">Exento</option>
                      <option value="no_sujeto">No Sujeto</option>
                    </select>
                  </td>
                  <td class="col-precio">
                    <input v-model.number="it.precio" type="number" min="0" step="0.01" />
                  </td>
                  <td class="importe text-right col-iva">
                    {{
                      it.tipo === 'gravado' ? (it.cantidad * it.precio * 0.13).toFixed(2) : '0.00'
                    }}
                  </td>
                  <td class="importe text-right col-total">{{ totalLinea(it).toFixed(2) }}</td>
                  <td class="center col-acciones">
                    <button
                      class="btn btn-icon btn-xs btn-outline"
                      type="button"
                      aria-label="Eliminar detalle"
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
            <button
              :disabled="enviando"
              class="btn btn-outline"
              type="button"
              @click="emitirFactura"
            >
              {{ enviando ? 'Enviando...' : 'Guardar' }}
            </button>
            <button
              :disabled="enviando"
              class="btn btn-primary"
              type="button"
              @click="emitirFactura"
            >
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
        <button
          :disabled="enviando"
          class="btn btn-outline btn-sm"
          type="button"
          @click="emitirFactura"
        >
          {{ enviando ? '...' : 'Guardar' }}
        </button>
        <button
          :disabled="enviando"
          class="btn btn-primary btn-sm"
          type="button"
          @click="emitirFactura"
        >
          {{ enviando ? '...' : 'Emitir' }}
        </button>
      </div>
    </div>

    <div
      v-if="productosModalAbierto"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="productos-modal-title"
      @click.self="cerrarSelectorProductos"
    >
      <div class="modal-card productos-modal surface-card">
        <header class="modal-head">
          <h4 id="productos-modal-title">Agregar productos del inventario</h4>
          <button
            class="btn btn-icon btn-xs btn-outline"
            type="button"
            @click="cerrarSelectorProductos"
          >
            ✕
          </button>
        </header>
        <div class="modal-body productos-modal-body">
          <div class="productos-controls">
            <input
              v-model="busquedaProducto"
              type="search"
              placeholder="Buscar por nombre, código o descripción"
              @keyup.enter="buscarProductosInventario"
            />
            <select v-model="tipoProductoFiltro">
              <option value="">Todos los tipos</option>
              <option v-for="tipo in tiposProductoInventario" :key="tipo" :value="tipo">
                {{ tipo }}
              </option>
            </select>
            <button
              class="btn btn-xs btn-outline"
              type="button"
              :disabled="cargandoProductos"
              @click="buscarProductosInventario"
            >
              {{ cargandoProductos ? 'Buscando…' : 'Buscar' }}
            </button>
          </div>

          <div v-if="productosFeedback" class="productos-feedback" :class="productosFeedback.tipo">
            {{ productosFeedback.msg }}
          </div>

          <div class="productos-list" role="list">
            <div v-if="cargandoProductos" class="productos-empty text-muted">
              Cargando productos…
            </div>
            <div v-else-if="!productosFiltrados.length" class="productos-empty text-muted">
              No hay productos para mostrar.
            </div>
            <table v-else class="productos-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Código</th>
                  <th>Tipo</th>
                  <th>Precio sugerido</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="producto in productosFiltrados" :key="producto.id">
                  <td>
                    <div class="producto-nombre">{{ producto.name || producto.DESCRIPCION }}</div>
                    <small class="text-muted">{{ producto.DESCRIPCION }}</small>
                  </td>
                  <td>{{ producto.CODE || '—' }}</td>
                  <td>{{ producto.TIPO || 'N/D' }}</td>
                  <td class="importe">{{ calcularPrecioProducto(producto).toFixed(2) }}</td>
                  <td class="center">
                    <button
                      class="btn btn-xs btn-outline"
                      type="button"
                      @click="prepararSeleccionProducto(producto)"
                    >
                      Seleccionar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-if="productoSeleccionado" class="producto-seleccion surface-soft">
          <header class="ps-head">
            <div class="ps-info">
              <p class="ps-title">
                {{
                  productoSeleccionado.name ||
                  productoSeleccionado.DESCRIPCION ||
                  'Producto sin nombre'
                }}
              </p>
              <small class="text-muted">
                Código {{ productoSeleccionado.CODE || 'N/D' }} · Tipo
                {{ productoSeleccionado.TIPO || 'N/D' }}
              </small>
            </div>
            <button class="btn btn-xs btn-outline" type="button" @click="limpiarSeleccionProducto">
              Limpiar
            </button>
          </header>
          <div class="ps-toggle">
            <label>
              <input v-model="usarTotalProducto" type="checkbox" />
              Usar total del producto ({{ totalProductoSeleccionado.toFixed(2) }})
            </label>
          </div>
          <div v-if="!usarTotalProducto" class="ps-detalles">
            <template v-if="hayDetallesSeleccionables">
              <div class="ps-detalles-head">
                <span>Selecciona los detalles a incluir</span>
                <button
                  class="btn btn-xs btn-outline"
                  type="button"
                  @click="seleccionarTodosDetalles(!todosDetallesSeleccionados)"
                >
                  {{ todosDetallesSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos' }}
                </button>
              </div>
              <table class="ps-detalles-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Descripción</th>
                    <th>Cant.</th>
                    <th>Precio</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="detalle in detallesProductoSeleccionado" :key="detalle.indice">
                    <td class="center">
                      <input v-model="detalle.incluido" type="checkbox" />
                    </td>
                    <td>{{ detalle.texto }}</td>
                    <td>{{ detalle.cantidad }}</td>
                    <td class="importe">{{ Number(detalle.precio || 0).toFixed(2) }}</td>
                  </tr>
                </tbody>
              </table>
            </template>
            <div v-else class="ps-detalles-empty text-muted">
              Este producto no tiene detalles activos. Activa la opción "Usar total del producto".
            </div>
          </div>
          <div class="ps-resumen">
            <template v-if="usarTotalProducto">
              <span>Total sugerido</span>
              <strong>{{ totalProductoSeleccionado.toFixed(2) }}</strong>
            </template>
            <template v-else>
              <span>
                {{ resumenSeleccionProducto.cantidad }} detalle{{
                  resumenSeleccionProducto.cantidad === 1 ? '' : 's'
                }}
                seleccionados
              </span>
              <span>
                {{ resumenSeleccionProducto.unidades }} unidad{{
                  resumenSeleccionProducto.unidades === 1 ? '' : 'es'
                }}
              </span>
              <span>Total {{ resumenSeleccionProducto.total.toFixed(2) }}</span>
            </template>
          </div>
          <div v-if="errorSeleccionProducto" class="ps-error text-danger">
            {{ errorSeleccionProducto }}
          </div>
          <div class="ps-actions">
            <button class="btn btn-outline btn-xs" type="button" @click="limpiarSeleccionProducto">
              Cancelar selección
            </button>
            <button
              class="btn btn-primary btn-xs"
              type="button"
              @click="confirmarSeleccionProducto"
            >
              Agregar a factura
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Crear Cliente Rápido -->
    <div v-if="mostrarModalCliente" class="modal-overlay" role="dialog" aria-modal="true">
      <div class="modal-card surface-card">
        <header class="modal-head">
          <h4>Nuevo Cliente</h4>
          <button class="btn btn-icon btn-xs btn-outline" type="button" @click="cerrarModalCliente">
            ✕
          </button>
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
          <button class="btn btn-outline" type="button" @click="cerrarModalCliente">
            Cancelar
          </button>
          <button class="btn btn-primary" type="button" @click="crearClienteDesdeModal">
            Guardar
          </button>
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
.items-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.items-table-wrapper {
  overflow-x: auto;
  border-radius: var(--radius-lg);
}
.items-table {
  min-width: 760px;
}
.items-table thead th {
  font-size: var(--fz-xs);
  letter-spacing: 0.75px;
  color: var(--color-heading);
}
.items-table thead th.col-acciones {
  width: 56px;
}
.items-table tbody td {
  vertical-align: middle;
}
.items-table .col-desc {
  width: 36%;
}
.items-table .col-cant {
  width: 90px;
}
.items-table .col-tipo {
  width: 160px;
}
.items-table .col-precio,
.items-table .col-iva,
.items-table .col-total {
  width: 140px;
}
.items-table input,
.items-table select {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-background);
  font: inherit;
  padding: 0.45rem 0.55rem;
  transition:
    border-color var(--transition-base),
    box-shadow var(--transition-base);
}
.items-table input:focus,
.items-table select:focus {
  outline: none;
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 3px rgba(var(--brand-primary-rgb) / 0.15);
}
.items-table .text-right {
  text-align: right;
}
.items-table .items-empty {
  background: var(--color-background-soft);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 2.5rem 1rem;
  color: var(--color-text);
}
.items-empty-icon {
  font-size: 1.6rem;
}
.items-empty-text {
  text-align: center;
  font-size: var(--fz-sm);
  max-width: 320px;
}
.items-table .col-acciones .btn {
  min-width: 2rem;
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

.productos-modal {
  width: min(900px, 95vw);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.productos-modal-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 70vh;
  overflow-y: auto;
  overflow-x: hidden;
}
.productos-controls {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.productos-controls input,
.productos-controls select {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 0.55rem 0.75rem;
  font: inherit;
  background: var(--color-background);
}
.productos-controls select {
  min-width: 160px;
}
.productos-controls input {
  flex: 1 1 220px;
}
.productos-list {
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-background);
  overflow: hidden;
}
.productos-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.75rem;
}
.productos-table th {
  text-align: left;
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  font-weight: 600;
  opacity: 0.7;
  background: var(--color-background-soft);
  padding: 0.6rem;
}
.productos-table td {
  padding: 0.6rem;
  border-top: 1px solid var(--color-border);
  vertical-align: middle;
}
.productos-table tbody tr:hover {
  background: var(--color-background-soft);
}
.producto-nombre {
  font-weight: 600;
  font-size: 0.78rem;
}
.productos-empty {
  padding: 1rem;
  text-align: center;
  font-size: 0.75rem;
}
.productos-feedback {
  border-radius: 12px;
  padding: 0.55rem 0.75rem;
  font-size: 0.7rem;
  letter-spacing: 0.6px;
}
.productos-feedback.ok {
  background: rgba(12, 111, 84, 0.12);
  color: var(--brand-primary);
}
.productos-feedback.error {
  background: rgba(217, 45, 32, 0.12);
  color: #d92d20;
}

/* Panel selección detalles producto */
.producto-seleccion {
  margin-top: 0.85rem;
  border-radius: 14px;
  border: 1px solid var(--color-border);
  padding: 0.85rem 0.9rem 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.ps-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}
.ps-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.ps-title {
  font-size: 0.85rem;
  font-weight: 600;
}
.ps-toggle label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.72rem;
}
.ps-toggle input {
  width: 16px;
  height: 16px;
}
.ps-detalles {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.ps-detalles-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.7rem;
}
.ps-detalles-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.72rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
}
.ps-detalles-table th {
  text-align: left;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  font-weight: 600;
  background: var(--color-background-soft);
  padding: 0.55rem;
}
.ps-detalles-table td {
  padding: 0.5rem 0.55rem;
  border-top: 1px solid var(--color-border);
}
.ps-detalles-table td.center {
  text-align: center;
}
.ps-detalles-table tbody tr:hover {
  background: var(--color-background-soft);
}
.ps-detalles-empty {
  font-size: 0.72rem;
}
.ps-resumen {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  font-size: 0.7rem;
  align-items: baseline;
}
.ps-resumen strong {
  font-size: 0.85rem;
  color: var(--brand-primary);
}
.ps-error {
  font-size: 0.7rem;
}
.ps-actions {
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
  .productos-controls {
    flex-direction: column;
    align-items: stretch;
  }
  .productos-controls input {
    flex: 1 1 auto;
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
