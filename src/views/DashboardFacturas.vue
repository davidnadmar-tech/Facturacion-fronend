<script setup>
import { ref, computed } from 'vue'
import { useFacturasStore } from '@/stores/facturas'

const store = useFacturasStore()
store.cargarLocal()
store.seedDemo()

const filtro = ref('')
const lista = computed(() => store.filtradas(filtro.value))

const columnas = [
  { key: 'codigo', label: 'Código' },
  { key: 'fecha', label: 'Fecha' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'gravado', label: 'Gravado' },
  { key: 'exento', label: 'Exento' },
  { key: 'iva', label: 'IVA' },
  { key: 'total', label: 'Total' },
  { key: 'acciones', label: 'Acciones', center: true },
]

function formatear(n) {
  return Number(n || 0).toLocaleString('es-SV', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function eliminar(codigo) {
  if (!confirm('¿Eliminar factura?')) return
  const r = store.eliminar(codigo)
  if (!r.ok) return
}

function ver(f) {
  // Placeholder: futura vista detalle / modal
  alert(`Factura ${f.codigo} - Total: ${formatear(f.montos.total)}`)
}
</script>

<template>
  <div class="facturas-view fade-in">
    <section class="actions-bar surface-soft elev-1" aria-label="Acciones facturas">
      <div class="left">
        <h2 class="title">Facturas</h2>
        <p class="subtitle text-muted">Listado de comprobantes emitidos</p>
      </div>
      <div class="right">
        <div class="search-group">
          <input v-model.trim="filtro" type="text" placeholder="Buscar (código, cliente, NIT)" />
          <button class="btn-search" type="button" disabled>Filtrar</button>
        </div>
        <RouterLink to="/dashboard/facturas/nueva" class="btn btn-primary">Nueva</RouterLink>
      </div>
    </section>

    <section class="table-wrapper surface-card elev-2" aria-label="Listado facturas">
      <header class="table-head">
        <h3>Lista de Facturas ({{ store.total }})</h3>
        <small class="text-muted" v-if="filtro">Filtro activo</small>
      </header>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th v-for="col in columnas" :key="col.key" :class="{ center: col.center }">
                {{ col.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!lista.length">
              <td :colspan="columnas.length" class="empty">No hay facturas</td>
            </tr>
            <tr v-for="f in lista" :key="f.codigo">
              <td>{{ f.codigo }}</td>
              <td>{{ f.fecha }}</td>
              <td>{{ f.cliente?.nombre }}</td>
              <td>{{ formatear(f.montos?.gravado) }}</td>
              <td>{{ formatear(f.montos?.exento) }}</td>
              <td>{{ formatear(f.montos?.iva) }}</td>
              <td>{{ formatear(f.montos?.total) }}</td>
              <td class="center acciones-col">
                <button class="table-btn" type="button" @click="ver(f)">Ver</button>
                <button class="table-btn danger" type="button" @click="eliminar(f.codigo)">
                  Borrar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.facturas-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}
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
  font-size: 1.25rem;
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
  min-width: 920px;
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
.empty {
  text-align: center;
  font-size: 0.7rem;
  letter-spacing: 0.5px;
  opacity: 0.7;
}
.acciones-col {
  white-space: nowrap;
}
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
</style>
