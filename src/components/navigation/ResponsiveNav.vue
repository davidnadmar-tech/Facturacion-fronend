<script setup>
import { useRoute, RouterLink } from 'vue-router'

// Ítems de navegación (solo diseño; sin permisos ni auth todavía)
const navItems = [
  { label: 'Inicio', to: '/', icon: 'home' },
  { label: 'Acerca', to: '/about', icon: 'info' },
  { label: 'Panel', to: '/dashboard', icon: 'grid' },
  { label: 'Acceso', to: '/login', icon: 'lock' },
]

const route = useRoute()

const isActive = (to) => route.path === to

// Generador de iconos minimalistas SVG (inline para facilidad de estilo)
const iconPath = {
  home: 'M3 11.25 12 3l9 8.25V20a1 1 0 0 1-1 1h-5.5v-5.25h-5V21H4a1 1 0 0 1-1-1v-8.75Z',
  info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm.75 5.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM11 9.75h2v7.5h-2v-7.5Z',
  lock: 'M7 9V7a5 5 0 1 1 10 0v2h1.25A1.75 1.75 0 0 1 20 10.75v8.5A1.75 1.75 0 0 1 18.25 21H5.75A1.75 1.75 0 0 1 4 19.25v-8.5A1.75 1.75 0 0 1 5.75 9H7Zm2-2a3 3 0 1 1 6 0v2H9V7Zm3 5.25a2 2 0 0 1 1 3.732V17a1 1 0 1 1-2 0v-1.018A2 2 0 0 1 12 12.25Z',
  more: 'M6.5 12a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0Zm7 0a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0Zm5.25 1.75a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z',
  grid: 'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
}

const icon = (name) => iconPath[name] || ''
</script>

<template>
  <nav class="nav-root" aria-label="Navegación principal">
    <!-- Desktop / Tablet horizontal -->
    <ul class="nav-desktop" role="menubar">
      <li v-for="item in navItems" :key="item.to" role="none">
        <RouterLink :to="item.to" custom v-slot="{ navigate }">
          <button
            :aria-current="isActive(item.to) ? 'page' : undefined"
            class="nav-btn"
            :class="{ active: isActive(item.to) }"
            role="menuitem"
            type="button"
            @click="navigate"
          >
            <span class="icon-wrapper" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="0"
                :data-icon="item.icon"
              >
                <path :d="icon(item.icon)" fill="currentColor" />
              </svg>
            </span>
            <span class="label">{{ item.label }}</span>
          </button>
        </RouterLink>
      </li>
    </ul>

    <!-- Bottom Rounded Nav (Mobile) -->
    <div class="nav-mobile" role="menubar" aria-label="Barra inferior de navegación">
      <ul class="mobile-list">
        <li v-for="item in navItems" :key="item.to" role="none">
          <RouterLink :to="item.to" custom v-slot="{ navigate }">
            <button
              :aria-current="isActive(item.to) ? 'page' : undefined"
              class="mobile-btn"
              :class="{ active: isActive(item.to) }"
              role="menuitem"
              type="button"
              @click="navigate"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="0"
                aria-hidden="true"
              >
                <path :d="icon(item.icon)" fill="currentColor" />
              </svg>
              <span class="m-label">{{ item.label }}</span>
            </button>
          </RouterLink>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style scoped>
.nav-root {
  width: 100%;
}

/* Desktop */
.nav-desktop {
  list-style: none;
  display: flex;
  gap: 0.4rem;
  padding: 0;
  margin: 0;
  align-items: center;
}

.nav-btn {
  --btn-bg: transparent;
  --btn-color: var(--color-heading);
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  padding: 0.7rem 0.95rem;
  border-radius: 14px;
  background: var(--btn-bg);
  color: var(--btn-color);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition:
    background-color 0.25s,
    color 0.25s,
    border-color 0.25s,
    transform 0.25s;
}

.nav-btn:hover {
  background: var(--color-background-mute);
}
.nav-btn.active {
  --btn-bg: linear-gradient(130deg, #0aa57c, #36c6a8);
  --btn-color: #fff;
  border-color: #0aa57c;
  box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.25);
}
.nav-btn.active:hover {
  filter: brightness(1.05);
}

.icon-wrapper {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
}

.label {
  position: relative;
  top: 1px;
}

/* Mobile Bottom Nav */
.nav-mobile {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 70;
  display: none; /* visible solo en mobile */
  pointer-events: none; /* container ignora click, botones sí */
  padding: 0.75rem 0.85rem calc(0.75rem + env(safe-area-inset-bottom));
}

.mobile-list {
  margin: 0 auto;
  padding: 0.35rem 0.55rem;
  list-style: none;
  display: flex;
  justify-content: space-around;
  gap: 0.25rem;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(14px) saturate(160%);
  border: 1px solid var(--color-border);
  border-radius: 28px;
  max-width: 620px;
  box-shadow:
    0 12px 40px -12px rgba(0, 0, 0, 0.22),
    0 4px 16px -6px rgba(0, 0, 0, 0.18);
  pointer-events: auto;
}

.mobile-btn {
  --m-color: var(--color-heading);
  background: transparent;
  border: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.65rem 0.9rem;
  min-width: 68px;
  font-size: 0.6rem;
  letter-spacing: 0.6px;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 18px;
  color: var(--m-color);
  transition:
    background-color 0.25s,
    color 0.3s,
    transform 0.25s;
}

.mobile-btn svg {
  width: 20px;
  height: 20px;
}

.mobile-btn:hover {
  background: var(--color-background-mute);
}
.mobile-btn.active {
  --m-color: #0aa57c;
  background: linear-gradient(150deg, rgba(10, 165, 124, 0.12), rgba(54, 198, 168, 0.08));
  box-shadow: inset 0 0 0 1px rgba(10, 165, 124, 0.4);
}
.mobile-btn.active svg {
  filter: drop-shadow(0 0 4px rgba(10, 165, 124, 0.4));
}

.m-label {
  font-weight: 600;
}

/* Breakpoints */
@media (max-width: 880px) {
  .nav-btn {
    font-size: 0.6rem;
    padding: 0.55rem 0.75rem;
  }
}
@media (max-width: 720px) {
  .nav-desktop {
    display: none;
  }
  .nav-mobile {
    display: block;
  }
}
@media (max-width: 420px) {
  .mobile-btn {
    min-width: 60px;
    padding: 0.55rem 0.65rem;
  }
  .mobile-btn svg {
    width: 18px;
    height: 18px;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .mobile-list {
    background: rgba(24, 24, 24, 0.82);
  }
  .nav-btn {
    border-color: var(--color-border);
  }
  .nav-btn:hover {
    background: var(--color-background-mute);
  }
  .nav-btn.active {
    box-shadow: 0 4px 14px -4px rgba(0, 0, 0, 0.55);
  }
  .mobile-btn:hover {
    background: var(--color-background-mute);
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-btn,
  .mobile-btn {
    transition: none !important;
  }
}
</style>
