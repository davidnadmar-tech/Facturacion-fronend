<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const collapsed = ref(false)
const route = useRoute()

const menu = [
  { label: 'Resumen', to: '/dashboard', icon: 'grid' },
  { label: 'Facturas', to: '/dashboard/facturas', icon: 'doc' },
  { label: 'Clientes', to: '/dashboard/clientes', icon: 'users' },
  { label: 'Reportes', to: '/dashboard/reportes', icon: 'chart' },
]

const secondary = [{ label: 'Configuración', to: '/dashboard/configuracion', icon: 'settings' }]

const isActive = (to) => route.path === to

const toggle = () => (collapsed.value = !collapsed.value)
const router = useRouter()
const auth = useAuthStore()

const onLogout = async () => {
  const r = await auth.signOut()
  if (r.ok) router.replace({ name: 'login' })
}

const displayName = computed(() => auth.user?.name || auth.user?.email || 'Usuario')
const initials = computed(() => {
  const n = (auth.user?.name || auth.user?.email || 'U').trim()
  const parts = n.split(/[\s.@_+-]+/).filter(Boolean)
  const first = parts[0]?.[0] || 'U'
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
})
const userMenuOpen = ref(false)
const toggleUserMenu = () => (userMenuOpen.value = !userMenuOpen.value)
const closeUserMenu = () => (userMenuOpen.value = false)
</script>

<template>
  <div class="dash-shell" :class="{ collapsed }">
    <aside class="dash-sidebar" aria-label="Navegación lateral">
      <div class="brand" @click="toggle" role="button" :aria-pressed="collapsed" tabindex="0">
        <div class="brand-logo">FE</div>
        <span class="brand-name">Factura<span>Pro</span></span>
        <button
          class="collapse-btn"
          type="button"
          :title="collapsed ? 'Expandir' : 'Colapsar'"
          @click.stop="toggle"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="currentColor" d="M10 17 15 12 10 7v10Z" />
          </svg>
        </button>
      </div>
      <nav class="menu" aria-label="Principal">
        <ul>
          <li v-for="item in menu" :key="item.to">
            <RouterLink :to="item.to" class="m-link" :class="{ active: isActive(item.to) }">
              <span class="icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="0"
                >
                  <path :d="icon(item.icon)" fill="currentColor" />
                </svg>
              </span>
              <span class="label">{{ item.label }}</span>
            </RouterLink>
          </li>
        </ul>
      </nav>
      <nav class="menu secondary" aria-label="Secundario">
        <ul>
          <li v-for="item in secondary" :key="item.to">
            <RouterLink :to="item.to" class="m-link" :class="{ active: isActive(item.to) }">
              <span class="icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="0"
                >
                  <path :d="icon(item.icon)" fill="currentColor" />
                </svg>
              </span>
              <span class="label">{{ item.label }}</span>
            </RouterLink>
          </li>
        </ul>
      </nav>
    </aside>

    <div class="dash-main">
      <header class="dash-header">
        <h1 class="page-title">Dashboard</h1>
        <div class="actions">
          <button type="button" class="ghost-btn" disabled title="Pendiente de implementación">
            Buscar
          </button>
          <RouterLink
            to="/dashboard/facturas/nueva"
            class="primary-btn link-btn"
            title="Crear nueva factura"
          >
            Nueva Factura
          </RouterLink>
          <div class="user-box" @keydown.escape.prevent.stop="closeUserMenu">
            <button
              type="button"
              class="user-btn"
              @click="toggleUserMenu"
              :aria-expanded="userMenuOpen"
            >
              <span class="avatar" aria-hidden="true">{{ initials }}</span>
              <span class="name">{{ displayName }}</span>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" class="chev">
                <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
              </svg>
            </button>
            <div v-if="userMenuOpen" class="user-menu" @click.stop>
              <RouterLink to="/dashboard/configuracion" class="um-item" @click="closeUserMenu">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path :d="icon('user')" fill="currentColor" />
                </svg>
                <span>Mi perfil</span>
              </RouterLink>
              <button type="button" class="um-item" @click="onLogout">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path :d="icon('logout')" fill="currentColor" />
                </svg>
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      <main class="dash-content">
        <slot />
      </main>
      <footer class="dash-footer">© {{ new Date().getFullYear() }} FacturaPro</footer>
    </div>
  </div>
</template>

<script>
// Helper de iconos simple (opcional mover a util)
export function icon(name) {
  const paths = {
    grid: 'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
    doc: 'M6 2h7l5 5v13.25A1.75 1.75 0 0 1 16.25 22H6.75A1.75 1.75 0 0 1 5 20.25V3.75A1.75 1.75 0 0 1 6.75 2H6Zm7 6V3.5L18.5 8H13Z',
    users:
      'M7 11a4 4 0 1 1 2.83-6.83A5.5 5.5 0 0 1 15.5 4c.51 0 1 .07 1.47.2a4 4 0 0 1 2.03 6.63A5.5 5.5 0 0 1 22 16.5V18h-2v-1.5a3.5 3.5 0 0 0-3.5-3.5h-7A3.5 3.5 0 0 0 6 16.5V18H4v-1.5a5.5 5.5 0 0 1 3.17-5A4 4 0 0 1 7 11Zm3.5 2h3a5.5 5.5 0 0 1 5.5 5.5V21h-2v-1.5a3.5 3.5 0 0 0-3.5-3.5h-3a3.5 3.5 0 0 0-3.5 3.5V21H6v-1.5a5.5 5.5 0 0 1 5.5-5.5Z',
    chart: 'M4 20V9h3v11H4Zm6 0V4h3v16h-3Zm6 0v-8h3v8h-3Z',
    settings:
      'M12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7ZM4 13.2v-2.4l2.06-.32a6 6 0 0 1 .6-1.46l-1.2-1.7 1.7-1.7 1.7 1.2a6 6 0 0 1 1.46-.6L10.8 4h2.4l.32 2.06a6 6 0 0 1 1.46.6l1.7-1.2 1.7 1.7-1.2 1.7a6 6 0 0 1 .6 1.46L20 10.8v2.4l-2.06.32a6 6 0 0 1-.6 1.46l1.2 1.7-1.7 1.7-1.7-1.2a6 6 0 0 1-1.46.6L13.2 20h-2.4l-.32-2.06a6 6 0 0 1-1.46-.6l-1.7 1.2-1.7-1.7 1.2-1.7a6 6 0 0 1-.6-1.46L4 13.2Z',
    user: 'M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z',
    logout: 'M16 17v-3H8v-4h8V7l5 5-5 5Zm-2 4H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9v2H5v14h9v2Z',
  }
  return paths[name] || ''
}
</script>

<style scoped>
.dash-shell {
  display: grid;
  grid-template-columns: 250px 1fr;
  min-height: 100dvh;
  background: var(--color-background-soft);
  transition: grid-template-columns 0.35s ease;
}
.dash-shell.collapsed {
  grid-template-columns: 84px 1fr;
}

.dash-sidebar {
  position: sticky;
  top: 0;
  height: 100dvh;
  padding: 1rem 0.9rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background: linear-gradient(155deg, #0f2538, #132f47 55%, #1c4669);
  color: #fff;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.brand {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  user-select: none;
  padding: 0.65rem 0.75rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  transition: background 0.3s;
}
.brand:hover {
  background: rgba(255, 255, 255, 0.12);
}

.brand-logo {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #36c6a8, #0aa57c);
  font-size: 0.9rem;
  letter-spacing: 0.5px;
  font-weight: 600;
  box-shadow:
    0 4px 12px -4px rgba(0, 0, 0, 0.55),
    0 2px 6px -2px rgba(0, 0, 0, 0.38);
}
.brand-name span {
  color: #36c6a8;
}

.collapse-btn {
  margin-left: auto;
  background: rgba(255, 255, 255, 0.08);
  border: 0;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 10px;
  cursor: pointer;
  transition:
    background 0.25s,
    transform 0.35s;
}
.collapse-btn:hover {
  background: rgba(255, 255, 255, 0.18);
}
.collapsed .collapse-btn svg {
  transform: rotate(180deg);
}

.menu ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.menu.secondary {
  margin-top: auto;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.m-link {
  --active-bg: linear-gradient(120deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.07));
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.65rem 0.8rem;
  text-decoration: none;
  border-radius: 12px;
  font-size: 0.78rem;
  letter-spacing: 0.6px;
  font-weight: 500;
  color: #e8ecef;
  background: transparent;
  position: relative;
  transition:
    background 0.3s,
    color 0.3s;
}
.m-link:hover {
  background: rgba(255, 255, 255, 0.12);
}
.m-link.active {
  background: var(--active-bg);
  color: #fff;
}

.icon {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
}

.dash-shell.collapsed .brand-name,
.dash-shell.collapsed .label {
  opacity: 0;
  pointer-events: none;
  width: 0;
}
.dash-shell.collapsed .brand {
  justify-content: center;
}
.dash-shell.collapsed .collapse-btn {
  position: absolute;
  right: 6px;
}
.dash-shell.collapsed .m-link {
  justify-content: center;
  padding: 0.7rem;
}
.dash-shell.collapsed .m-link .icon {
  width: 24px;
  height: 24px;
}

.dash-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.dash-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: space-between;
  padding: 0.9rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(10px);
  background: var(--color-background-soft);
  position: sticky;
  top: 0;
  z-index: 20;
}
.page-title {
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.actions {
  display: flex;
  gap: 0.6rem;
}
.ghost-btn,
.primary-btn {
  font-family: inherit;
  font-size: 0.7rem;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  border-radius: 12px;
  padding: 0.7rem 0.95rem;
  font-weight: 600;
  cursor: not-allowed;
  border: 1px solid var(--color-border);
  background: var(--color-background-mute);
  color: var(--color-heading);
  transition:
    background 0.3s,
    color 0.3s,
    border-color 0.3s;
}
.primary-btn {
  background: linear-gradient(130deg, #36c6a8, #0aa57c);
  color: #fff;
  border-color: #0aa57c;
}
.primary-btn:hover {
  filter: brightness(1.05);
}
.link-btn {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.user-box {
  position: relative;
}
.user-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-background-mute);
  color: var(--color-heading);
  padding: 0.45rem 0.6rem;
  border-radius: 999px;
  cursor: pointer;
}
.user-btn:hover {
  filter: brightness(1.02);
}
.user-btn .avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #fff;
  background: linear-gradient(135deg, #36c6a8, #0aa57c);
}
.user-btn .name {
  font-size: 0.8rem;
  font-weight: 600;
}
.user-btn .chev {
  opacity: 0.7;
}
.user-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  border-radius: 12px;
  min-width: 180px;
  padding: 0.35rem;
  z-index: 50;
}
.um-item {
  width: 100%;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.6rem;
  border-radius: 10px;
  border: 0;
  background: transparent;
  color: var(--color-heading);
  text-decoration: none;
  cursor: pointer;
}
.um-item:hover {
  background: var(--color-background-soft);
}

.dash-content {
  padding: 1.4rem clamp(1rem, 2.5vw, 2rem) 2.5rem;
  flex: 1;
  width: 100%;
}
.dash-footer {
  padding: 0.9rem 1.5rem;
  font-size: 0.6rem;
  letter-spacing: 0.75px;
  text-transform: uppercase;
  opacity: 0.65;
  border-top: 1px solid var(--color-border);
  text-align: center;
}

/* Responsive */
@media (max-width: 1020px) {
  .dash-shell {
    grid-template-columns: 210px 1fr;
  }
  .dash-shell.collapsed {
    grid-template-columns: 78px 1fr;
  }
}
@media (max-width: 820px) {
  .dash-shell {
    grid-template-columns: 84px 1fr;
  }
  .dash-sidebar {
    padding: 0.85rem 0.6rem 1rem;
  }
  .dash-content {
    padding: 1rem 0.9rem 2.2rem;
  }
  .dash-shell:not(.collapsed) .brand-name,
  .dash-shell:not(.collapsed) .label {
    display: none;
  }
  .collapse-btn {
    display: none;
  }
}
@media (max-width: 640px) {
  .dash-header {
    padding: 0.75rem 0.9rem;
  }
  .page-title {
    font-size: 0.95rem;
  }
  .actions {
    gap: 0.45rem;
  }
}
@media (prefers-color-scheme: dark) {
  .dash-header {
    background: var(--color-background-soft);
  }
  .ghost-btn {
    background: var(--color-background-mute);
  }
}
@media (prefers-reduced-motion: reduce) {
  .dash-shell {
    transition: none !important;
  }
  .m-link,
  .brand,
  .collapse-btn,
  .ghost-btn,
  .primary-btn {
    transition: none !important;
  }
}
</style>
