import { defineStore } from 'pinia'

/*
 Prefs UI persistidas (version v1):
 {
   particlesEnabled: boolean,
   particleLines: boolean,
   particleMode: 'normal' | 'ultra',
 }
*/

const KEY = 'ui_prefs_v1'

export const useUiStore = defineStore('ui', {
  state: () => ({
    cargado: false,
    particlesEnabled: true,
    particleLines: true,
    particleMode: 'normal', // 'normal' | 'ultra'
  }),
  getters: {
    isUltra: (s) => s.particleMode === 'ultra',
  },
  actions: {
    cargarLocal() {
      if (this.cargado) return
      try {
        const raw = localStorage.getItem(KEY)
        if (raw) {
          const data = JSON.parse(raw)
          if (data && typeof data === 'object') {
            if (typeof data.particlesEnabled === 'boolean')
              this.particlesEnabled = data.particlesEnabled
            if (typeof data.particleLines === 'boolean') this.particleLines = data.particleLines
            if (['normal', 'ultra'].includes(data.particleMode))
              this.particleMode = data.particleMode
          }
        }
      } catch (e) {
        console.warn('No se pudo cargar UI prefs', e)
      } finally {
        this.cargado = true
      }
    },
    persistir() {
      try {
        localStorage.setItem(
          KEY,
          JSON.stringify({
            particlesEnabled: this.particlesEnabled,
            particleLines: this.particleLines,
            particleMode: this.particleMode,
          }),
        )
      } catch (e) {
        console.warn('No se pudo persistir UI prefs', e)
      }
    },
    toggleParticles() {
      this.cargarLocal()
      this.particlesEnabled = !this.particlesEnabled
      this.persistir()
    },
    toggleLines() {
      this.cargarLocal()
      this.particleLines = !this.particleLines
      this.persistir()
    },
    setMode(mode) {
      if (!['normal', 'ultra'].includes(mode)) return { ok: false, error: 'Modo inválido' }
      this.cargarLocal()
      this.particleMode = mode
      this.persistir()
      return { ok: true }
    },
  },
})
