<script setup>
// Solo diseño: datos simulados
const kpis = [
  { label: 'Facturas Hoy', value: '32', trend: '+8%' },
  { label: 'Pendientes', value: '14', trend: '-2%' },
  { label: 'Clientes Activos', value: '210', trend: '+3%' },
  { label: 'Emitidas Mes', value: '1,284', trend: '+12%' },
]

const panels = [
  { title: 'Últimas facturas', lines: 5 },
  { title: 'Clientes recientes', lines: 4 },
  { title: 'Alertas', lines: 3 },
]
</script>

<template>
  <div class="dash-home">
    <section class="kpi-grid" aria-label="Indicadores clave">
      <article v-for="k in kpis" :key="k.label" class="kpi-card">
        <h3 class="kpi-label">{{ k.label }}</h3>
        <div class="kpi-value">{{ k.value }}</div>
        <p
          class="kpi-trend"
          :class="{ up: k.trend.startsWith('+'), down: k.trend.startsWith('-') }"
        >
          {{ k.trend }}
        </p>
      </article>
    </section>

    <section class="panel-grid">
      <article v-for="p in panels" :key="p.title" class="panel-card">
        <header class="panel-head">
          <h3>{{ p.title }}</h3>
          <button class="mini-btn" disabled title="Solo diseño">Ver todo</button>
        </header>
        <ul class="placeholder-list">
          <li v-for="n in p.lines" :key="n">
            <span class="ph-line"></span>
            <span class="ph-sub"></span>
          </li>
        </ul>
      </article>
    </section>
  </div>
</template>

<style scoped>
.dash-home {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.kpi-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}
.kpi-card {
  position: relative;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  padding: 1.05rem 1.15rem 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  box-shadow:
    0 4px 18px -6px rgba(0, 0, 0, 0.08),
    0 2px 8px -4px rgba(0, 0, 0, 0.04);
  transition:
    transform 0.25s,
    box-shadow 0.35s;
}
.kpi-card:hover {
  transform: translateY(-3px);
  box-shadow:
    0 10px 28px -10px rgba(0, 0, 0, 0.18),
    0 4px 16px -6px rgba(0, 0, 0, 0.12);
}
.kpi-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 600;
  opacity: 0.7;
}
.kpi-value {
  font-size: 1.65rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.kpi-trend {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.kpi-trend.up {
  color: #0aa57c;
}
.kpi-trend.down {
  color: #c93d3d;
}

.panel-grid {
  display: grid;
  gap: 1.4rem;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
}
.panel-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 1.1rem 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow:
    0 4px 16px -6px rgba(0, 0, 0, 0.08),
    0 2px 8px -4px rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
}
.panel-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 85% 20%, rgba(10, 165, 124, 0.25), transparent 65%),
    radial-gradient(circle at 15% 85%, rgba(54, 198, 168, 0.22), transparent 55%);
  opacity: 0.35;
  pointer-events: none;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.panel-head h3 {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.6px;
}
.mini-btn {
  font-family: inherit;
  font-size: 0.55rem;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  font-weight: 600;
  padding: 0.45rem 0.7rem;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-background-mute);
  cursor: not-allowed;
}

.placeholder-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.placeholder-list li {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.ph-line {
  width: 55%;
  height: 10px;
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    var(--color-background-mute),
    var(--color-background-soft),
    var(--color-background-mute)
  );
  animation: shimmer 2s ease infinite;
  background-size: 200% 100%;
}
.ph-sub {
  width: 30%;
  height: 6px;
  border-radius: 6px;
  background: var(--color-background-mute);
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 640px) {
  .panel-grid {
    grid-template-columns: 1fr;
  }
  .kpi-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
  .kpi-value {
    font-size: 1.45rem;
  }
}
@media (prefers-color-scheme: dark) {
  .kpi-card,
  .panel-card {
    background: var(--color-background-soft);
  }
  .ph-line {
    background: linear-gradient(
      90deg,
      var(--color-background-mute),
      var(--color-background-soft),
      var(--color-background-mute)
    );
  }
}
@media (prefers-reduced-motion: reduce) {
  .kpi-card {
    transition: none !important;
  }
  .ph-line {
    animation: none !important;
  }
}
</style>
