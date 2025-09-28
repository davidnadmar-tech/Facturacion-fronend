<script setup>
// Solo diseño estático por ahora
const redes = [
  { name: 'LinkedIn', url: '#', icon: 'linkedin' },
  { name: 'Facebook', url: '#', icon: 'facebook' },
  { name: 'Instagram', url: '#', icon: 'instagram' },
  { name: 'GitHub', url: '#', icon: 'github' },
]

function icon(name) {
  const paths = {
    linkedin:
      'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm3.5 5A1.5 1.5 0 1 0 7 7.5 1.5 1.5 0 0 0 7.5 8Zm.75 2h-1.5v7h1.5v-7Zm3 0h-1.5v7h1.5v-4.1c0-1.35.73-2.08 1.87-2.08.91 0 1.38.52 1.38 1.96V17h1.5v-4.74C16.5 10.75 15.62 10 14.28 10c-1.01 0-1.86.44-2.28 1.2V10Z',
    facebook: 'M13 4h3V1h-3a5 5 0 0 0-5 5v3H5v3h3v8h3v-8h3l1-3h-4V6a2 2 0 0 1 2-2Z',
    instagram:
      'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm8 3h2v2h-2V5Zm-5 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
    github:
      'M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.61-3.37-1.18-3.37-1.18-.46-1.16-1.12-1.47-1.12-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.05 1.53 1.05.9 1.55 2.36 1.1 2.94.84.09-.65.35-1.1.63-1.35-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 12 6.8c.85.01 1.71.12 2.51.34 1.9-1.29 2.74-1.02 2.74-1.02.55 1.37.2 2.39.1 2.64.64.7 1.02 1.59 1.02 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86v2.76c0 .26.18.57.69.47A10 10 0 0 0 12 2Z',
  }
  return paths[name] || ''
}
</script>

<template>
  <section class="home-hero" aria-label="Bienvenida">
    <div class="hero-inner">
      <div class="brand-block">
        <div class="logo-wrap" aria-hidden="true">
          <!-- Placeholder SVG logo (puede reemplazarse por <img />) -->
          <svg class="dragonfly" viewBox="0 0 200 200" role="img" aria-label="Blue Dragonfly">
            <circle cx="100" cy="100" r="94" fill="url(#grad)" opacity="0.08" />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#27b1ff" />
                <stop offset="60%" stop-color="#0a6fb8" />
              </linearGradient>
            </defs>
            <g fill="none" stroke="#0a6fb8" stroke-width="2" stroke-linecap="round">
              <path
                d="M100 30c5 12 8 24 8 38 0 14-3 26-8 38-5-12-8-24-8-38 0-14 3-26 8-38Z"
                fill="#0a92d6"
                stroke="none"
              />
              <path
                d="M100 70c15 0 32-8 50-20-14 20-29 36-50 36s-36-16-50-36c18 12 35 20 50 20Z"
                fill="#27b1ff"
                stroke="none"
              />
              <path
                d="M100 82c11 0 24 6 38 14-11 10-24 18-38 18s-27-8-38-18c14-8 27-14 38-14Z"
                fill="#0a6fb8"
                stroke="none"
              />
              <path
                d="M100 114c8 0 17 4 26 9-8 7-17 12-26 12s-18-5-26-12c9-5 18-9 26-9Z"
                fill="#0a92d6"
                stroke="none"
              />
              <path
                d="M100 135c5 0 10 3 14 6-4 3-9 5-14 5s-10-2-14-5c4-3 9-6 14-6Z"
                fill="#27b1ff"
                stroke="none"
              />
            </g>
          </svg>
        </div>
        <h1 class="hero-title">Blue Dragonfly <span>Automation</span></h1>
        <p class="hero-tag">Optimización inteligente y automatización a tu alcance.</p>
      </div>
      <div class="hero-copy">
        <p>
          Bienvenido a la plataforma de facturación. Este entorno unifica emisión, control y
          análisis de comprobantes, ofreciendo una experiencia ágil mientras avanzamos hacia la
          integración completa de procesos.
        </p>
        <p>
          Blue Dragonfly Automation se enfoca en crear soluciones modulares, escalables y seguras.
          Este frontend es la base sobre la cual conectaremos servicios de validación fiscal,
          reportería avanzada y automatización documental.
        </p>
        <div class="social" aria-label="Redes de la empresa">
          <a
            v-for="r in redes"
            :key="r.name"
            :href="r.url"
            target="_blank"
            rel="noopener"
            class="s-link"
            :title="r.name"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path :d="icon(r.icon)" fill="currentColor" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  </section>

  <section class="home-panels" aria-label="Destacados">
    <article class="panel-card surface-card">
      <h3>Agilidad</h3>
      <p>Diseño optimizado para ingresar datos rápidamente reduciendo fricción operativa.</p>
    </article>
    <article class="panel-card surface-card">
      <h3>Escalabilidad</h3>
      <p>Arquitectura preparada para integrar APIs de autorización, validación y reporting.</p>
    </article>
    <article class="panel-card surface-card">
      <h3>Automatización</h3>
      <p>Base para flujos automáticos: generación de PDF, envío programado y conciliaciones.</p>
    </article>
  </section>
</template>

<style scoped>
.home-hero {
  position: relative;
  padding: clamp(2.5rem, 6vw, 4.5rem) clamp(1rem, 4vw, 3rem);
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}
.hero-inner {
  display: grid;
  gap: 2.5rem;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  align-items: center;
}
.logo-wrap {
  width: 180px;
  aspect-ratio: 1;
  position: relative;
}
.dragonfly {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.15));
}
.hero-title {
  font-size: clamp(1.8rem, 4.2vw, 3.2rem);
  line-height: 1.05;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.hero-title span {
  color: var(--brand-primary);
}
.hero-tag {
  font-size: clamp(0.9rem, 1.2vw, 1.05rem);
  font-weight: 500;
  letter-spacing: 0.6px;
  margin-top: 0.5rem;
}
.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  font-size: 0.9rem;
  line-height: 1.5;
}
.hero-copy p {
  margin: 0;
}
.social {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.75rem;
}
.s-link {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: var(--color-background-soft);
  color: var(--brand-primary);
  border: 1px solid var(--color-border);
  transition:
    background 0.3s,
    color 0.3s,
    transform 0.35s;
}
.s-link:hover {
  background: var(--brand-primary);
  color: #fff;
  transform: translateY(-3px);
}

.home-panels {
  display: grid;
  gap: 1.2rem;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  padding: 0 clamp(1rem, 4vw, 3rem) clamp(3rem, 6vw, 4.5rem);
}
.panel-card {
  position: relative;
  padding: 1.1rem 1rem 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background: var(--color-background);
  box-shadow:
    0 4px 18px -6px rgba(0, 0, 0, 0.08),
    0 2px 8px -4px rgba(0, 0, 0, 0.04);
}
.panel-card h3 {
  font-size: 0.85rem;
  letter-spacing: 0.6px;
  font-weight: 600;
  text-transform: uppercase;
  opacity: 0.75;
}
.panel-card p {
  font-size: 0.75rem;
  line-height: 1.4;
  margin: 0;
}
.panel-card:hover {
  box-shadow:
    0 10px 28px -10px rgba(0, 0, 0, 0.18),
    0 4px 16px -6px rgba(0, 0, 0, 0.12);
}

@media (max-width: 640px) {
  .logo-wrap {
    width: 150px;
  }
  .hero-inner {
    gap: 2rem;
  }
  .social {
    flex-wrap: wrap;
  }
}
@media (prefers-color-scheme: dark) {
  .panel-card {
    background: var(--color-background-soft);
  }
  .s-link {
    background: var(--color-background-mute);
  }
}
@media (prefers-reduced-motion: reduce) {
  .s-link {
    transition: none !important;
  }
  .panel-card {
    transition: none !important;
  }
}
</style>
