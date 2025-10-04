<template>
  <div class="login-layout">
    <!-- Panel Branding / Lado Izquierdo -->
    <aside class="brand-panel">
      <div class="brand-content">
        <div class="logo-circle" aria-hidden="true">FE</div>
        <h1 class="brand-title">Factura<span>Pro</span></h1>
        <p class="brand-tagline">
          Plataforma de facturación electrónica<br />segura, ágil y confiable.
        </p>
        <ul class="brand-highlights" aria-label="Ventajas clave">
          <li>• Cumplimiento normativo</li>
          <li>• Reportes en tiempo real</li>
          <li>• Integración sencilla</li>
        </ul>
        <footer class="brand-footer">© {{ new Date().getFullYear() }} FacturaPro</footer>
      </div>
    </aside>

    <!-- Panel Formulario / Lado Derecho -->
    <main class="form-panel" role="main" aria-labelledby="loginTitle">
      <div class="form-wrapper" tabindex="-1">
        <header class="form-header">
          <h2 id="loginTitle">Iniciar sesión</h2>
          <p class="subtitle">Accede a tu cuenta para gestionar tus comprobantes</p>
        </header>
        <form class="login-form" @submit.prevent="onSubmit">
          <div class="field-group">
            <label for="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              placeholder="tucorreo@empresa.com"
              autocomplete="username"
              v-model.trim="identity"
              :disabled="auth.cargando"
            />
          </div>
          <div class="field-group">
            <label for="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
              v-model="password"
              :disabled="auth.cargando"
            />
          </div>
          <div class="options-row">
            <label class="remember">
              <input type="checkbox" />
              <span>Recordarme</span>
            </label>
            <a href="#" class="link-muted" aria-disabled="true" title="(Demostración)"
              >¿Olvidaste tu contraseña?</a
            >
          </div>
          <button class="btn-primary" type="submit" :disabled="auth.cargando">
            <span v-if="!auth.cargando">Ingresar</span>
            <span v-else>Ingresando…</span>
          </button>
          <div class="divider" role="separator" aria-label="O"></div>
          <button class="btn-outline" type="button" disabled title="Solo diseño por ahora">
            Ingresar con certificado
          </button>
          <p v-if="errorMsg" class="error-msg" role="alert">{{ errorMsg }}</p>
        </form>
        <p class="legal-text">
          Al continuar aceptas los <a href="#" tabindex="-1">términos</a> y la
          <a href="#" tabindex="-1">política de privacidad</a>.
        </p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const { isAuthenticated } = storeToRefs(auth)

const identity = ref('')
const password = ref('')
const errorMsg = ref('')

onMounted(() => {
  auth.cargarLocal()
  if (isAuthenticated.value) {
    router.replace({ name: 'dashboard-home' })
  }
})

async function onSubmit() {
  errorMsg.value = ''
  const res = await auth.login({ identity: identity.value, password: password.value })
  if (res.ok) {
    const redirect = router.currentRoute.value.query.redirect || { name: 'dashboard-home' }
    router.replace(redirect)
  } else {
    errorMsg.value = res.error || 'No se pudo iniciar sesión'
  }
}
</script>

<style scoped>
/* Layout base */
.login-layout {
  display: flex;
  min-height: 100vh;
  background: var(--color-background-soft);
  color: var(--color-text);
  overflow: hidden;
}

/* Panel de marca */
.brand-panel {
  flex: 1.05;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(2rem, 4vw, 4rem) clamp(2rem, 3.2vw, 3.5rem);
  background: var(--grad-brand-panel);
  color: #ffffff;
  isolation: isolate;
}

.brand-panel::before,
.brand-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 25% 30%, rgba(255, 255, 255, 0.12), transparent 60%),
    radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.08), transparent 65%);
  mix-blend-mode: overlay;
  pointer-events: none;
}

.brand-content {
  max-width: 480px;
  width: 100%;
  animation: fadeSlide 0.9s ease both;
}

.logo-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--grad-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.15rem;
  letter-spacing: 1px;
  box-shadow: var(--shadow-lg);
  margin-bottom: 1.75rem;
  color: #fff;
  font-family: 'Inter', system-ui, sans-serif;
}

.brand-title {
  font-size: clamp(2rem, 3.3vw, 2.8rem);
  font-weight: 600;
  line-height: 1.1;
  margin: 0 0 0.75rem;
  letter-spacing: 0.5px;
}

.brand-title span {
  background: linear-gradient(
    110deg,
    var(--brand-primary-alt) 0%,
    var(--brand-accent) 50%,
    var(--brand-primary-alt) 100%
  );
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.brand-tagline {
  font-size: clamp(0.95rem, 1vw + 0.4rem, 1.05rem);
  opacity: 0.95;
  margin-bottom: 1.25rem;
  font-weight: 400;
}

.brand-highlights {
  list-style: none;
  padding: 0;
  margin: 1.5rem 0 2.5rem;
  font-size: 0.85rem;
  letter-spacing: 0.3px;
  opacity: 0.9;
  display: grid;
  gap: 0.4rem;
  font-weight: 500;
}

.brand-footer {
  font-size: 0.7rem;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  opacity: 0.55;
  margin-top: 2rem;
}

/* Panel formulario */
.form-panel {
  flex: 0.95;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(2.5rem, 5vw, 5rem) clamp(1.5rem, 3.2vw, 3.25rem);
  position: relative;
}

.form-wrapper {
  width: 100%;
  max-width: 420px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  padding: clamp(2rem, 2vw, 2.75rem) clamp(1.75rem, 2vw, 2.5rem) 2.25rem;
  border-radius: 22px;
  box-shadow:
    0 8px 32px -8px rgba(0, 0, 0, 0.15),
    0 2px 10px -3px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(6px);
  animation: fadeUp 0.6s ease 0.15s both;
}

.form-wrapper:focus-visible {
  outline: 3px solid #36c6a8;
  outline-offset: 4px;
}

.form-header h2 {
  font-size: 1.9rem;
  font-weight: 600;
  margin: 0 0 0.35rem;
  letter-spacing: 0.5px;
  color: var(--color-heading);
}

.subtitle {
  font-size: 0.9rem;
  color: var(--vt-c-text-light-2);
  margin: 0 0 1.75rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.field-group label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--vt-c-text-light-2);
}

.field-group input {
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  padding: 0.85rem 1rem;
  border-radius: 14px;
  font-size: 0.95rem;
  transition:
    border-color 0.25s,
    background-color 0.25s,
    box-shadow 0.25s;
  outline: none;
  font-family: inherit;
}

.field-group input:focus {
  border-color: #36c6a8;
  box-shadow: 0 0 0 3px rgba(54, 198, 168, 0.25);
  background: var(--color-background);
}

.options-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 0.25rem 0 0.25rem;
}

.remember {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.5px;
  cursor: pointer;
  user-select: none;
}

.remember input {
  accent-color: #36c6a8;
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.link-muted {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
  opacity: 0.7;
  color: var(--color-heading);
  transition:
    opacity 0.25s,
    color 0.25s;
}

.link-muted:hover,
.link-muted:focus-visible {
  opacity: 1;
  color: #36c6a8;
}

.btn-primary,
.btn-outline {
  position: relative;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 0.95rem 1.15rem;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  transition:
    background-color 0.35s,
    box-shadow 0.35s,
    transform 0.25s,
    border-color 0.35s,
    color 0.35s;
  width: 100%;
}

.btn-primary {
  background: var(--grad-primary);
  color: #fff;
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(var(--brand-primary-rgb) / 0.6);
}

.btn-primary:hover {
  filter: brightness(1.05);
}

.btn-outline {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  color: var(--color-heading);
}

.btn-outline:hover {
  border-color: #36c6a8;
  color: #0aa57c;
}

.divider {
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-border), transparent);
  margin: 0.5rem 0 0.25rem;
  position: relative;
}

.divider::after {
  content: 'o';
  position: absolute;
  inset: 0;
  margin: auto;
  width: 26px;
  height: 26px;
  font-size: 0.65rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
  opacity: 0.65;
}

.legal-text {
  margin: 1.75rem 0 0;
  font-size: 0.65rem;
  letter-spacing: 0.4px;
  line-height: 1.4;
  color: var(--vt-c-text-light-2);
  text-align: center;
}

.legal-text a {
  color: #0aa57c;
  text-decoration: none;
  font-weight: 600;
}

.legal-text a:hover {
  text-decoration: underline;
}

.error-msg {
  margin-top: 0.75rem;
  color: var(--vt-c-text-danger, #b00020);
  font-size: 0.85rem;
}

/* Animaciones */
@keyframes fadeSlide {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(22px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Dark mode ajustes */
@media (prefers-color-scheme: dark) {
  .form-wrapper {
    background: var(--color-background-soft);
  }
  .field-group input {
    background: var(--color-background-mute);
  }
  .field-group input:focus {
    background: var(--color-background);
  }
  .btn-outline {
    background: var(--color-background-mute);
  }
  .divider::after {
    background: var(--color-background-soft);
  }
}

/* Responsividad */
@media (max-width: 1080px) {
  .login-layout {
    flex-direction: column;
  }
  .brand-panel {
    min-height: 40vh;
    padding: 3rem 2.25rem 2.5rem;
  }
  .form-panel {
    padding: 2.5rem 1.5rem 3rem;
  }
  .form-wrapper {
    max-width: 520px;
  }
  .brand-highlights {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
}

@media (max-width: 560px) {
  .brand-panel {
    min-height: 32vh;
  }
  .brand-title {
    font-size: 2.15rem;
  }
  .logo-circle {
    width: 56px;
    height: 56px;
    font-size: 1rem;
  }
  .form-wrapper {
    border-radius: 18px;
    padding: 1.85rem 1.35rem 2rem;
  }
  .form-header h2 {
    font-size: 1.6rem;
  }
  .btn-primary,
  .btn-outline {
    font-size: 0.75rem;
    border-radius: 14px;
  }
  .brand-highlights {
    font-size: 0.75rem;
  }
}

/* Reduce motion preferencia */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
</style>
