<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, RouterLink, RouterView } from 'vue-router'
import ResponsiveNav from '@/components/navigation/ResponsiveNav.vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import { useUiStore } from '@/stores/ui'
// import global components si los necesitas en el futuro

const route = useRoute()
const ui = useUiStore()
ui.cargarLocal()
const panelOpen = ref(false)

// Sincronizar fades globales mediante data attribute
watch(
  () => ui.particlesEnabled,
  (v) => {
    document.documentElement.toggleAttribute('data-particles-on', v)
  },
  { immediate: true },
)

// Nombre del layout según meta. Si no existe, usa 'default'
const currentLayout = computed(() => route.meta?.layout || 'default')
const isBlank = computed(() => currentLayout.value === 'blank')
const isDashboard = computed(() => currentLayout.value === 'dashboard')

// Título dinámico básico (opcional). Podrías moverlo a un afterEach del router.
document.title = route.meta?.title ? `${route.meta.title} | FacturaPro` : 'FacturaPro'
</script>

<template>
  <div :class="['app-shell', `layout-${currentLayout}`]">
    <!-- Botón flotante preferencias partículas (en todos los layouts excepto blank login) -->
    <button
      v-if="!isBlank"
      class="fx-toggle-btn"
      type="button"
      :aria-expanded="panelOpen"
      @click="panelOpen = !panelOpen"
      :title="panelOpen ? 'Cerrar preferencias visuales' : 'Preferencias visuales'"
    >
      ✨
    </button>
    <div
      v-if="panelOpen"
      class="fx-panel surface-card"
      role="dialog"
      aria-label="Preferencias de fondo"
    >
      <header class="fx-head">
        <h3>Fondo Interactivo</h3>
        <button class="close-btn" @click="panelOpen = false" aria-label="Cerrar">×</button>
      </header>
      <div class="fx-body">
        <label class="fx-row">
          <input type="checkbox" v-model="ui.particlesEnabled" @change="ui.persistir()" />
          <span>Activar partículas</span>
        </label>
        <label class="fx-row">
          <input
            type="checkbox"
            v-model="ui.particleLines"
            @change="ui.persistir()"
            :disabled="!ui.particlesEnabled"
          />
          <span>Líneas</span>
        </label>
        <div class="fx-row mode">
          <span class="m-label">Modo</span>
          <select
            v-model="ui.particleMode"
            @change="ui.persistir()"
            :disabled="!ui.particlesEnabled"
          >
            <option value="normal">Normal</option>
            <option value="ultra">Ultra Low</option>
          </select>
        </div>
        <p class="hint" v-if="ui.particleMode === 'ultra'">
          Ultra Low reduce densidad, velocidad y líneas para ahorrar recursos.
        </p>
      </div>
    </div>
    <!-- Rama Dashboard -->
    <DashboardLayout v-if="isDashboard">
      <RouterView />
    </DashboardLayout>

    <!-- Rama Default / Blank -->
    <template v-else>
      <!-- Header principal oculto en layouts 'blank' -->
      <header v-if="!isBlank" class="app-header">
        <div class="brand-area">
          <RouterLink to="/" class="brand-link" aria-label="Ir al inicio">
            <img alt="Logo" class="logo" src="@/assets/logo.svg" width="48" height="48" />
            <span class="brand-name">Factura<span>Pro</span></span>
          </RouterLink>
        </div>
        <ResponsiveNav />
      </header>

      <!-- Contenido -->
      <main class="view-container" :class="{ 'no-padding': isBlank }" role="main">
        <RouterView />
      </main>

      <!-- Footer simple opcional -->
      <footer v-if="!isBlank" class="app-footer">
        <small>© {{ new Date().getFullYear() }} FacturaPro · Todos los derechos reservados</small>
      </footer>
    </template>
  </div>
</template>

<style scoped>
/* -------- Shell base -------- */
.app-shell {
  min-height: 100dvh; /* soporta mobile browsers modernos */
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
}

/* ---------- Panel partículas global ---------- */
.fx-toggle-btn {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 120;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  box-shadow: 0 4px 14px -6px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  font-size: 1.15rem;
  display: grid;
  place-items: center;
  transition:
    background 0.3s,
    transform 0.35s;
}
.fx-toggle-btn:hover {
  background: var(--color-background-mute);
  transform: translateY(-3px);
}

.fx-panel {
  position: fixed;
  bottom: 4.5rem;
  right: 1rem;
  width: 250px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.9rem 0.9rem 1.1rem;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow:
    0 10px 28px -12px rgba(0, 0, 0, 0.25),
    0 4px 14px -6px rgba(0, 0, 0, 0.18);
  animation: fadeIn 0.35s ease;
  z-index: 130;
  max-height: 70vh;
  backdrop-filter: blur(6px);
}
.fx-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.fx-head h3 {
  margin: 0;
  font-size: 0.8rem;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  font-weight: 600;
}
.close-btn {
  background: transparent;
  border: 0;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  padding: 0.25rem 0.4rem;
  border-radius: 8px;
}
.close-btn:hover {
  background: var(--color-background-mute);
}
.fx-body {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  font-size: 0.7rem;
}
.fx-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.fx-row.mode {
  justify-content: space-between;
}
.fx-row select {
  flex: 1;
  font-size: 0.7rem;
  padding: 0.3rem 0.4rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
}
.hint {
  margin: 0;
  font-size: 0.6rem;
  line-height: 1.3;
  opacity: 0.75;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 640px) {
  .fx-panel {
    right: 0.6rem;
    left: 0.6rem;
    width: auto;
  }
  .fx-toggle-btn {
    bottom: 0.75rem;
    right: 0.75rem;
  }
}

/* Layout blank ocupa todo sin header/footer */
.layout-blank.app-shell {
  min-height: 100dvh;
}

/* -------- Header -------- */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem clamp(1rem, 4vw, 2.25rem);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background-soft);
  position: sticky;
  top: 0;
  z-index: 40;
  backdrop-filter: blur(8px);
}

.brand-link {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  font-weight: 600;
  text-decoration: none;
  font-size: 1.05rem;
  letter-spacing: 0.5px;
  color: var(--color-heading);
}

.brand-name span {
  color: #0aa57c;
}

.logo {
  display: block;
}

/* -------- Contenido -------- */
.view-container {
  flex: 1;
  width: 100%;
  padding: clamp(1rem, 2.5vw, 2rem) clamp(0.75rem, 2.2vw, 1.75rem) clamp(2.5rem, 3vw, 2.75rem);
  display: flex;
  flex-direction: column;
}

.view-container.no-padding {
  padding: 0;
}

/* -------- Footer -------- */
.app-footer {
  padding: 1.1rem clamp(1rem, 4vw, 2.25rem);
  border-top: 1px solid var(--color-border);
  font-size: 0.65rem;
  letter-spacing: 0.75px;
  text-transform: uppercase;
  background: var(--color-background-soft);
  text-align: center;
  opacity: 0.8;
}

/* -------- Responsive -------- */
@media (max-width: 820px) {
  /* navegación desktop comprimida ya gestionada por ResponsiveNav */
  .brand-link {
    font-size: 0.95rem;
  }
  .app-header {
    padding: 0.65rem 0.95rem;
  }
  .app-footer {
    font-size: 0.55rem;
  }
}

@media (max-width: 520px) {
  .view-container {
    padding: 0.85rem 0.8rem 2.2rem;
  }
}

/* Soporte dark mode */
@media (prefers-color-scheme: dark) {
  .app-header,
  .app-footer {
    background: var(--color-background-soft);
  }
  .nav-item:hover {
    background: var(--color-background-mute);
  }
}
</style>
