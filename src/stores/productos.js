import { defineStore } from 'pinia'

/*
 Estructura de producto:
 {
   codigo: string, // P0001...
   nombre: string,
   descripcion?: string,
   precio: number,
   cantidad: number,
   categoria?: string,
   createdAt: string
 }
*/

function generarCodigo(last) {
  if (!last) return 'P0001'
  const num = parseInt(last.replace(/\D/g, ''), 10) + 1
  return 'P' + String(num).padStart(4, '0')
}

export const useProductosStore = defineStore('productos', {
  state: () => ({
    lista: [],
    cargado: false,
  }),
  getters: {
    total(state) {
      return state.lista.length
    },
    ultimoCodigo(state) {
      return state.lista.length ? state.lista[state.lista.length - 1].codigo : null
    },
    porCodigo(state) {
      return (codigo) => state.lista.find((p) => p.codigo === codigo)
    },
    filtrados(state) {
      return (q) => {
        if (!q) return state.lista
        const qq = q.toLowerCase()
        return state.lista.filter((p) =>
          ['nombre', 'descripcion', 'categoria'].some(
            (k) => p[k] && p[k].toLowerCase().includes(qq)
          )
        )
      }
    },
  },
  actions: {
    cargarLocal() {
      if (this.cargado) return
      try {
        const raw = localStorage.getItem('productos_v1')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr)) this.lista = arr
        }
      } catch (e) {
        console.warn('No se pudo cargar productos_v1', e)
      } finally {
        this.cargado = true
      }
    },
    persistir() {
      try {
        localStorage.setItem('productos_v1', JSON.stringify(this.lista))
      } catch (e) {
        console.warn('No se pudo persistir productos_v1', e)
      }
    },
    validar(datos, { edit = false } = {}) {
  const errores = {}
  if (!datos.nombre || !datos.nombre.trim()) errores.nombre = 'Nombre requerido'
  else if (datos.nombre.trim().length < 3) errores.nombre = 'Mínimo 3 caracteres'
  if (datos.precio == null || datos.precio < 0) errores.precio = 'Precio inválido'
  if (datos.cantidad == null || datos.cantidad < 0) errores.cantidad = 'Cantidad inválida'

  // Ejemplo de uso de edit:
  if (!edit && !datos.codigo) errores.codigo = 'Código requerido'

  return errores
}
,
    agregar(datos) {
      this.cargarLocal()
      const codigo = generarCodigo(this.ultimoCodigo)
      const base = { ...datos, codigo, createdAt: new Date().toISOString() }
      const errores = this.validar(base)
      if (Object.keys(errores).length) return { ok: false, errores }
      this.lista.push(base)
      this.persistir()
      return { ok: true, item: base }
    },
    actualizar(codigo, patch) {
      const idx = this.lista.findIndex((p) => p.codigo === codigo)
      if (idx === -1) return { ok: false, error: 'No encontrado' }
      const updated = { ...this.lista[idx], ...patch }
      const errores = this.validar(updated, { edit: true })
      if (Object.keys(errores).length) return { ok: false, errores }
      this.lista[idx] = updated
      this.persistir()
      return { ok: true, item: updated }
    },
    eliminar(codigo) {
      const idx = this.lista.findIndex((p) => p.codigo === codigo)
      if (idx === -1) return { ok: false }
      const [removed] = this.lista.splice(idx, 1)
      this.persistir()
      return { ok: true, item: removed }
    },
    seedDemo() {
      if (this.lista.length) return
      const demo = [
        { nombre: 'Producto Demo 1', descripcion: 'Descripción demo', precio: 10.5, cantidad: 5, categoria: 'General' },
        { nombre: 'Producto Demo 2', descripcion: 'Otro demo', precio: 25.0, cantidad: 3, categoria: 'General' },
      ]
      demo.forEach((d) => {
        const codigo = generarCodigo(this.ultimoCodigo)
        this.lista.push({ ...d, codigo, createdAt: new Date().toISOString() })
      })
      this.persistir()
    },
  },
})
