<script setup>
// Componente ligero de fondo de partículas (sin dependencias externas)
// Props ajustables: count, colors, maxSpeed.
// Respeta 'prefers-reduced-motion'.
// Uso:
// <ParticleField :count="70" :colors="['#27b1ff','#0a6fb8']" :maxSpeed="0.25" />

import { ref, onMounted, onBeforeUnmount, watchEffect } from 'vue'

const props = defineProps({
  count: { type: Number, default: 55 },
  colors: { type: Array, default: () => ['#27b1ff', '#0a6fb8', '#0a92d6'] },
  maxSpeed: { type: Number, default: 0.22 },
  opacity: { type: Number, default: 0.35 },
  responsiveScale: { type: Boolean, default: true }, // reduce partículas en pantallas pequeñas
  enabled: { type: Boolean, default: true },
  linkLines: { type: Boolean, default: true },
  linkDistance: { type: Number, default: 140 },
  linkColor: { type: String, default: 'rgba(39,177,255,0.28)' },
  linkWidth: { type: Number, default: 1 },
  mode: { type: String, default: 'normal' }, // 'normal' | 'ultra'
})

const canvasRef = ref(null)
let ctx,
  particles = [],
  rafId,
  w,
  h

function resize() {
  if (!canvasRef.value) return
  w = canvasRef.value.offsetWidth
  h = canvasRef.value.offsetHeight
  const dpr = window.devicePixelRatio || 1
  canvasRef.value.width = w * dpr
  canvasRef.value.height = h * dpr
  ctx.scale(dpr, dpr)
}

function init() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const baseCount = props.count
  const ultra =
    props.mode === 'ultra' ||
    document.documentElement.getAttribute('data-particles-mode') === 'ultra'
  const finalCount = reduce
    ? Math.round(baseCount * 0.25)
    : ultra
      ? Math.round(baseCount * 0.35)
      : props.responsiveScale && w < 640
        ? Math.round(baseCount * 0.55)
        : baseCount
  particles = Array.from({ length: finalCount }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: 1 + Math.random() * 2.2,
    vx: (Math.random() - 0.5) * (ultra ? props.maxSpeed * 0.5 : props.maxSpeed),
    vy: (Math.random() - 0.5) * (ultra ? props.maxSpeed * 0.5 : props.maxSpeed),
    c: props.colors[Math.floor(Math.random() * props.colors.length)],
  }))
}

function step() {
  if (!props.enabled) {
    ctx.clearRect(0, 0, w, h)
    rafId = requestAnimationFrame(step)
    return
  }
  ctx.clearRect(0, 0, w, h)
  // Partículas
  for (const p of particles) {
    p.x += p.vx
    p.y += p.vy
    if (p.x < 0) p.x = w
    if (p.x > w) p.x = 0
    if (p.y < 0) p.y = h
    if (p.y > h) p.y = 0
    ctx.beginPath()
    ctx.fillStyle = p.c
    ctx.globalAlpha = props.opacity
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
  }
  // Líneas
  if (props.linkLines) {
    ctx.globalAlpha = 1
    ctx.lineWidth = props.linkWidth
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i]
        const b = particles[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= props.linkDistance) {
          const alpha = 1 - dist / props.linkDistance
          ctx.strokeStyle = props.linkColor.replace(
            /rgba\(([^)]+),(\s*[^,]+)\)$/,
            'rgba($1,' + (alpha * 0.8).toFixed(3) + ')',
          )
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }
    }
  }
  rafId = requestAnimationFrame(step)
}

function start() {
  if (!canvasRef.value) return
  ctx = canvasRef.value.getContext('2d')
  resize()
  init()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduce) step()
}

onMounted(() => {
  start()
  let resizeRaf = null
  const handleResize = () => {
    if (resizeRaf) return
    resizeRaf = requestAnimationFrame(() => {
      if (!ctx) return
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      resize()
      init()
      resizeRaf = null
    })
  }
  window.addEventListener('resize', handleResize, { passive: true })
  cleanupFns.push(() => window.removeEventListener('resize', handleResize))
})

const cleanupFns = []

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  cleanupFns.forEach((f) => f())
})

// Si cambian colores dinámicamente (raro), re-inicializamos partículas
watchEffect(() => {
  if (!ctx) return
  // Re-init si cambian props base visuales
  init()
})
</script>

<template>
  <div class="particle-wrapper" :class="{ off: !props.enabled }" aria-hidden="true">
    <div class="canvas-fade">
      <canvas ref="canvasRef" class="particle-canvas" />
    </div>
  </div>
</template>

<style scoped>
.particle-wrapper {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 1; /* Ajustar según layering necesario */
  opacity: 1;
  transition: opacity 0.6s ease;
}
.particle-wrapper.off {
  opacity: 0;
}
.canvas-fade {
  width: 100%;
  height: 100%;
}
.particle-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
