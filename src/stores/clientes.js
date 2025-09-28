import { defineStore } from 'pinia'

/*
 Estructura de cliente:
 {
   codigo: string, // C0001...
   nombre: string,
   telefono?: string,
   email?: string,
   codigoActividad?: string,
   descripcionActividad?: string,
   nrc?: string,
   nit?: string,
   dui?: string,
   departamento?: string,
   municipio?: string,
   createdAt: string
 }
*/

function generarCodigo(last) {
  if (!last) return 'C0001'
  const num = parseInt(last.replace(/\D/g, ''), 10) + 1
  return 'C' + String(num).padStart(4, '0')
}

export const useClientesStore = defineStore('clientes', {
  state: () => ({
    lista: [],
    cargado: false,
  }),
  getters: {
    total: (s) => s.lista.length,
    ultimoCodigo: (s) => (s.lista.length ? s.lista[s.lista.length - 1].codigo : null),
    porNit: (s) => (nit) => s.lista.find((c) => c.nit && c.nit === nit),
    filtrados: (s) => (q) => {
      if (!q) return s.lista
      const qq = q.toLowerCase()
      return s.lista.filter((c) =>
        ['nombre', 'nrc', 'nit', 'dui'].some((k) => c[k] && c[k].toLowerCase().includes(qq)),
      )
    },
  },
  actions: {
    cargarLocal() {
      if (this.cargado) return
      try {
        const raw = localStorage.getItem('clientes_v1')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr)) this.lista = arr
        }
      } catch (e) {
        console.warn('No se pudo cargar clientes_v1', e)
      } finally {
        this.cargado = true
      }
    },
    persistir() {
      try {
        localStorage.setItem('clientes_v1', JSON.stringify(this.lista))
      } catch (e) {
        console.warn('No se pudo persistir clientes_v1', e)
      }
    },
    validar(datos, { edit = false } = {}) {
      const errores = {}
      if (!datos.nombre || !datos.nombre.trim()) errores.nombre = 'Nombre requerido'
      else if (datos.nombre.trim().length < 3) errores.nombre = 'Mínimo 3 caracteres'
      if (datos.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(datos.email))
        errores.email = 'Email inválido'
      if (datos.nit) {
        const existente = this.porNit(datos.nit)
        if (existente && (!edit || existente.codigo !== datos.codigo))
          errores.nit = 'NIT ya registrado'
      }
      return errores
    },
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
      const idx = this.lista.findIndex((c) => c.codigo === codigo)
      if (idx === -1) return { ok: false, error: 'No encontrado' }
      const updated = { ...this.lista[idx], ...patch }
      const errores = this.validar(updated, { edit: true })
      if (Object.keys(errores).length) return { ok: false, errores }
      this.lista[idx] = updated
      this.persistir()
      return { ok: true, item: updated }
    },
    eliminar(codigo) {
      const idx = this.lista.findIndex((c) => c.codigo === codigo)
      if (idx === -1) return { ok: false }
      const [removed] = this.lista.splice(idx, 1)
      this.persistir()
      return { ok: true, item: removed }
    },
    seedDemo() {
      if (this.lista.length) return
      const demo = [
        { nombre: 'Cliente Demo 1', nit: '0614-290112-101-1', email: 'cliente1@demo.com' },
        { nombre: 'Cliente Demo 2', nit: '0614-290112-101-2', email: 'cliente2@demo.com' },
      ]
      demo.forEach((d) => {
        const codigo = generarCodigo(this.ultimoCodigo)
        this.lista.push({ ...d, codigo, createdAt: new Date().toISOString() })
      })
      this.persistir()
    },
  },
})
