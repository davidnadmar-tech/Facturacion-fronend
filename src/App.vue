<script setup>
import { computed } from 'vue'
import { useRoute, RouterLink, RouterView } from 'vue-router'
import ResponsiveNav from '@/components/navigation/ResponsiveNav.vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
// import global components si los necesitas en el futuro

const route = useRoute()

// Nombre del layout según meta. Si no existe, usa 'default'
const currentLayout = computed(() => route.meta?.layout || 'default')
const isBlank = computed(() => currentLayout.value === 'blank')
const isDashboard = computed(() => currentLayout.value === 'dashboard')

// Título dinámico básico (opcional). Podrías moverlo a un afterEach del router.
document.title = route.meta?.title ? `${route.meta.title} | FacturaPro` : 'FacturaPro'
</script>

<template>
  <div :class="['app-shell', `layout-${currentLayout}`]">
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
