<script setup>
// =============================================================
//  About (Acerca de la Empresa)
//  Este archivo está pensado para ser FÁCIL de mantener.
//  Solo edita los arrays/objetos siguientes cuando cambie info corporativa.
//  Puedes eliminar secciones completas quitando el bloque correspondiente
//  del template (marcados con comentarios <!-- SECTION: ... --> ).
// =============================================================

// Hero principal (título y subtítulo)
import ParticleField from '@/components/ParticleField.vue'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
const ui = useUiStore()
ui.cargarLocal()
const { particlesEnabled, particleLines, particleMode } = storeToRefs(ui)
const hero = {
  title: 'Acerca de Blue Dragonfly Automation',
  tagline: 'Impulsamos la eficiencia mediante automatización, simplicidad y escalabilidad segura.',
  intro:
    'Nuestra plataforma de facturación es el núcleo sobre el cual construimos servicios de validación fiscal, reportería y flujos automáticos que reducen carga operativa.',
}

// Misión y visión (texto corto y claro)
const mision = `Desarrollar soluciones modulares que optimicen procesos administrativos y fiscales, reduciendo fricción y asegurando integridad de la información.`
const vision = `Ser un habilitador estratégico de automatización documental y operativa en la región, integrando datos, cumplimiento normativo y analítica accionable.`

// Valores (usa máximo ~6 para mantener lectura ágil)
const valores = [
  {
    icon: '⚙️',
    titulo: 'Eficiencia',
    desc: 'Reducimos pasos innecesarios y aceleramos tareas repetitivas.',
  },
  {
    icon: '🧩',
    titulo: 'Modularidad',
    desc: 'Cada bloque se integra sin generar dependencia rígida.',
  },
  { icon: '🔒', titulo: 'Confianza', desc: 'Priorizamos consistencia y protección de datos.' },
  {
    icon: '📈',
    titulo: 'Escalabilidad',
    desc: 'Soluciones preparadas para crecer con tu operación.',
  },
  { icon: '🤝', titulo: 'Colaboración', desc: 'Construimos escuchando necesidades reales.' },
  {
    icon: '🚀',
    titulo: 'Innovación Sostenible',
    desc: 'Iteramos con propósito, evitando complejidad innecesaria.',
  },
]

// Línea de tiempo / Hitos (puedes agregar más años)
const timeline = [
  {
    year: '2024',
    title: 'Concepto Inicial',
    desc: 'Definición de base para plataforma facturable y modular.',
  },
  {
    year: '2025',
    title: 'Fundamentos UI/UX',
    desc: 'Diseño estandarizado y estructura extensible con Pinia + layouts.',
  },
  {
    year: '2025-Q3',
    title: 'Automatización Inicial',
    desc: 'Primeras rutinas para emisión y preparación de validaciones.',
  },
  {
    year: '2025-Q4',
    title: 'Extensión Fiscal',
    desc: 'Integraciones planeadas para autorizaciones y reporte electrónico.',
  },
]

// Diferenciadores (bullets destacados)
const diferenciadores = [
  'Arquitectura pensada para integrar APIs fiscales sin reescrituras masivas.',
  'Separación clara entre presentación, estado y futura capa de servicios.',
  'Escalado progresivo: comenzar simple, crecer sin deuda técnica excesiva.',
  'Diseño accesible con componentes semánticos y soporte responsivo.',
  'Preparado para trazabilidad e indicadores operativos.',
]

// CTA final (Call to Action)
const cta = {
  title: 'Construyamos el siguiente módulo',
  text: '¿Requieres validación fiscal, reportería avanzada o integración documental? Este es el momento ideal para extender la plataforma.',
  button: 'Contacto / Próximos Pasos',
  link: '#contacto', // reemplaza con tu ruta real o mailto:
}
</script>

<template>
  <div class="about-page">
    <!-- SECTION: Hero -->
    <section class="about-hero surface-soft">
      <ParticleField
        :count="60"
        :maxSpeed="0.16"
        :colors="['#0aa57c', '#0fbf9d', '#0a8fdd']"
        :enabled="particlesEnabled"
        :link-lines="particleLines"
        :mode="particleMode"
      />
      <div class="hero-content">
        <h1 class="hero-title">
          {{ hero.title }}
        </h1>
        <p class="hero-tagline">{{ hero.tagline }}</p>
        <p class="hero-intro">{{ hero.intro }}</p>
        <div class="fx-toggles" aria-label="Controles visuales">
          <!-- <label class="t-item"
            ><input type="checkbox" v-model="particlesEnabled" @change="ui.persistir()" />
            Partículas</label
          >
          <label class="t-item"
            ><input
              type="checkbox"
              v-model="particleLines"
              @change="ui.persistir()"
              :disabled="!particlesEnabled"
            />
            Líneas</label
          > -->
          <!-- <label class="t-item mode-sel"
            >Modo
            <select v-model="particleMode" @change="ui.persistir()">
              <option value="normal">Normal</option>
              <option value="ultra">Ultra</option>
            </select>
          </label> -->
        </div>
        <nav class="mini-nav" aria-label="Secciones de la página">
          <a href="#mision-vision">Misión & Visión</a>
          <a href="#valores">Valores</a>
          <a href="#hitos">Hitos</a>
          <a href="#diferenciadores">Diferenciadores</a>
          <a href="#cta">Contacto</a>
        </nav>
      </div>
      <div class="hero-accent" aria-hidden="true"></div>
    </section>

    <!-- SECTION: Misión / Visión -->
    <section id="mision-vision" class="mv-grid">
      <article class="mv-card surface-card">
        <h2>Misión</h2>
        <p>{{ mision }}</p>
      </article>
      <article class="mv-card surface-card">
        <h2>Visión</h2>
        <p>{{ vision }}</p>
      </article>
    </section>

    <!-- SECTION: Valores -->
    <section id="valores" class="valores">
      <header class="sec-head">
        <h2>Valores</h2>
        <p>Principios que guían decisiones y diseño de la plataforma.</p>
      </header>
      <div class="valores-grid">
        <div v-for="v in valores" :key="v.titulo" class="valor-card surface-card">
          <div class="icon" aria-hidden="true">{{ v.icon }}</div>
          <h3 class="v-title">{{ v.titulo }}</h3>
          <p class="v-desc">{{ v.desc }}</p>
        </div>
      </div>
    </section>

    <!-- SECTION: Línea de tiempo -->
    <section id="hitos" class="timeline">
      <header class="sec-head">
        <h2>Hitos</h2>
        <p>Evolución y foco de desarrollo por etapas.</p>
      </header>
      <ol class="timeline-list">
        <li v-for="t in timeline" :key="t.year" class="tl-item">
          <div class="tl-marker" aria-hidden="true"></div>
          <div class="tl-body">
            <span class="tl-year">{{ t.year }}</span>
            <h3 class="tl-title">{{ t.title }}</h3>
            <p class="tl-desc">{{ t.desc }}</p>
          </div>
        </li>
      </ol>
    </section>

    <!-- SECTION: Diferenciadores -->
    <section id="diferenciadores" class="diff">
      <header class="sec-head">
        <h2>Diferenciadores</h2>
        <p>Lo que hace distinta a la plataforma desde el núcleo.</p>
      </header>
      <ul class="diff-list">
        <li v-for="d in diferenciadores" :key="d">{{ d }}</li>
      </ul>
    </section>

    <!-- SECTION: CTA -->
    <section id="cta" class="cta surface-card">
      <div class="cta-body">
        <h2>{{ cta.title }}</h2>
        <p>{{ cta.text }}</p>
        <a :href="cta.link" class="btn btn-primary">{{ cta.button }}</a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.about-page {
  display: flex;
  flex-direction: column;
  gap: clamp(2.5rem, 5vw, 4rem);
  padding-bottom: 4rem;
}

/* Hero */
.about-hero {
  position: relative;
  padding: clamp(2.2rem, 5.5vw, 4rem) clamp(1rem, 5vw, 3.5rem) clamp(2rem, 4vw, 3rem);
  border-radius: 1.75rem;
  overflow: hidden;
  display: grid;
  gap: 2rem;
}
.about-hero :deep(.particle-wrapper) {
  z-index: 1;
}
.about-hero .hero-content,
.about-hero .mini-nav {
  position: relative;
  z-index: 2;
}
.hero-content {
  max-width: 880px;
  position: relative;
  z-index: 2;
}
.hero-title {
  font-size: clamp(1.9rem, 4.5vw, 3.1rem);
  line-height: 1.05;
  margin: 0 0 1rem;
}
.hero-tagline {
  font-size: clamp(0.95rem, 1.2vw, 1.05rem);
  font-weight: 500;
  margin: 0 0 0.75rem;
  color: var(--brand-primary);
}
.hero-intro {
  margin: 0 0 1.25rem;
  max-width: 60ch;
  font-size: 0.95rem;
  line-height: 1.5;
}
.fx-toggles {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  opacity: 0.85;
  margin-bottom: 0.6rem;
}
.fx-toggles .t-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: var(--color-background-soft);
  padding: 0.35rem 0.6rem 0.3rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
}
.fx-toggles .mode-sel select {
  font-size: 0.55rem;
  padding: 0.2rem 0.3rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-background-mute);
}
.fx-toggles input {
  accent-color: var(--brand-primary);
}

.mini-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}
.mini-nav a {
  text-decoration: none;
  font-size: 0.7rem;
  letter-spacing: 0.8px;
  padding: 0.55rem 0.9rem 0.5rem;
  border-radius: 999px;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  text-transform: uppercase;
  font-weight: 600;
  color: var(--text-color, #222);
  transition:
    background 0.3s,
    color 0.3s;
}
.mini-nav a:hover {
  background: var(--brand-primary);
  color: #fff;
}

/* hero-accent sustituido por partículas; si deseas conservarlo, reinsertar bloque anterior */

/* Misión / Visión */
.mv-grid {
  display: grid;
  gap: 1.4rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  padding: 0 clamp(1rem, 5vw, 3.5rem);
}
.mv-card {
  padding: 1.4rem 1.35rem 1.6rem;
  border-radius: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.mv-card h2 {
  margin: 0;
  font-size: 1rem;
  letter-spacing: 0.5px;
  font-weight: 600;
}
.mv-card p {
  margin: 0;
  line-height: 1.5;
  font-size: 0.9rem;
}

/* Valores */
.valores {
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  padding: 0 clamp(1rem, 5vw, 3.5rem);
}
.valores-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
.valor-card {
  position: relative;
  padding: 1.1rem 1rem 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.valor-card .icon {
  font-size: 1.3rem;
  line-height: 1;
}
.valor-card .v-title {
  margin: 0;
  font-size: 0.85rem;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  font-weight: 600;
  opacity: 0.8;
}
.valor-card .v-desc {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.4;
}
.valor-card:hover {
  box-shadow: 0 6px 18px -8px rgba(0, 0, 0, 0.18);
}

/* Timeline */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 1.8rem;
  padding: 0 clamp(1rem, 5vw, 3.5rem);
}
.timeline-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  position: relative;
}
.timeline-list:before {
  content: '';
  position: absolute;
  left: 10px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: var(--color-border);
}
.tl-item {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  position: relative;
  padding-left: 0.5rem;
}
.tl-marker {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--brand-primary);
  box-shadow: 0 0 0 4px rgba(39, 177, 255, 0.25);
  flex-shrink: 0;
  position: relative;
  left: -1px;
}
.tl-body {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.tl-year {
  font-size: 0.65rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: 600;
  opacity: 0.7;
}
.tl-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}
.tl-desc {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.45;
  max-width: 60ch;
}

/* Diferenciadores */
.diff {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding: 0 clamp(1rem, 5vw, 3.5rem);
}
.diff-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}
.diff-list li {
  font-size: 0.8rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  padding: 0.85rem 0.9rem;
  border-radius: 0.9rem;
  line-height: 1.4;
  position: relative;
}
.diff-list li:before {
  content: '›';
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.4;
  font-size: 0.9rem;
}
.diff-list li {
  padding-left: 1.7rem;
}

/* CTA */
.cta {
  margin: 0 clamp(1rem, 5vw, 3.5rem);
  padding: clamp(1.6rem, 3vw, 2.1rem) clamp(1.2rem, 3vw, 2rem);
  border-radius: 1.5rem;
  display: grid;
  gap: 1.1rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.cta:before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 70% 40%, rgba(39, 177, 255, 0.18), transparent 60%);
  pointer-events: none;
}
.cta h2 {
  margin: 0;
  font-size: clamp(1.1rem, 2.2vw, 1.6rem);
}
.cta p {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  line-height: 1.5;
}
.cta .btn {
  align-self: center;
}

/* Section headers */
.sec-head {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.sec-head h2 {
  margin: 0;
  font-size: 1.1rem;
  letter-spacing: 0.5px;
}
.sec-head p {
  margin: 0;
  font-size: 0.8rem;
  opacity: 0.85;
}

@media (max-width: 640px) {
  .mini-nav a {
    font-size: 0.62rem;
  }
  .tl-desc {
    max-width: 100%;
  }
}

@media (prefers-color-scheme: dark) {
  .valor-card:hover {
    box-shadow: 0 10px 24px -12px rgba(0, 0, 0, 0.55);
  }
  .diff-list li {
    background: var(--color-background-mute);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mini-nav a {
    transition: none !important;
  }
  .valor-card {
    transition: none !important;
  }
}
</style>
