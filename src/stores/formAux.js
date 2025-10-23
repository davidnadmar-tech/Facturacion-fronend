import { defineStore } from 'pinia'

const regexMap = {
  nrc: /^(\d{6,7})$/,
  duiGuion: /^(\d{8}-\d)$/,
  duiCompacto: /^(\d{9})$/,
  nitGuiones: /^(\d{4}-\d{6}-\d{3}-\d{1})$/,
  nitCompacto: /^(\d{14})$/,
  pasaporteGenerico: /^[a-zA-Z0-9]{5,10}$/,
  pasaporteEs: /^[a-zA-Z]{3}[0-9]{6}[a-zA-Z]?$/,
  codigoCliente: /^C[0-9]{4}$/,
}

function normalizarValor(valor) {
  return typeof valor === 'string' ? valor.trim() : (valor ?? '')
}

const DEFAULT_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function generarCadena(longitud, charset = DEFAULT_CHARSET) {
  const chars = charset || DEFAULT_CHARSET
  const max = chars.length
  let resultado = ''
  for (let i = 0; i < longitud; i += 1) {
    resultado += chars.charAt(Math.floor(Math.random() * max))
  }
  return resultado
}

export const useFormAuxStore = defineStore('formAux', {
  state: () => ({
    expresiones: regexMap,
  }),
  getters: {
    obtenerRegex: (state) => (clave) => state.expresiones[clave] || null,
  },
  actions: {
    validarNRC(valor) {
      const limpio = normalizarValor(valor)
      if (!limpio) return { ok: true }
      const valido = regexMap.nrc.test(limpio)
      return { ok: valido, error: valido ? null : 'NRC inválido (6-7 dígitos)' }
    },
    validarDUI(valor, { permitirCompacto = true } = {}) {
      const limpio = normalizarValor(valor)
      if (!limpio) return { ok: true }
      const conGuion = regexMap.duiGuion.test(limpio)
      const compacto = permitirCompacto && regexMap.duiCompacto.test(limpio)
      const ok = conGuion || compacto
      return {
        ok,
        error: ok ? null : 'DUI inválido (formato 12345678-9)',
      }
    },
    validarNIT(valor, { permitirCompacto = true } = {}) {
      const limpio = normalizarValor(valor)
      if (!limpio) return { ok: true }
      const conGuiones = regexMap.nitGuiones.test(limpio)
      const compacto = permitirCompacto && regexMap.nitCompacto.test(limpio)
      const ok = conGuiones || compacto
      return {
        ok,
        error: ok ? null : 'NIT inválido (formato 0614-250993-102-5)',
      }
    },
    validarPasaporte(valor, { tipo = 'generico' } = {}) {
      const limpio = normalizarValor(valor)
      if (!limpio) return { ok: true }
      const expresion = tipo === 'es' ? regexMap.pasaporteEs : regexMap.pasaporteGenerico
      const ok = expresion.test(limpio)
      return {
        ok,
        error: ok ? null : 'Pasaporte inválido',
      }
    },
    generarCodigo({ regex, maxIntentos = 100, longitud = 8, charset = DEFAULT_CHARSET } = {}) {
      if (!regex) return { ok: false, error: 'Regex requerido' }
      const patron = regex instanceof RegExp ? regex : this.obtenerRegex(regex) || null
      if (!patron) return { ok: false, error: 'Expresión inválida' }
      for (let intento = 0; intento < maxIntentos; intento += 1) {
        const candidato = generarCadena(longitud, charset)
        if (patron.test(candidato)) return { ok: true, valor: candidato }
      }
      return { ok: false, error: 'No se pudo generar un código válido' }
    },
    clonarFormulario(origen, { limpiarId = true } = {}) {
      if (!origen) return { ok: false, error: 'Identificador requerido' }
      const nodoOriginal = typeof origen === 'string' ? document.getElementById(origen) : origen
      if (!nodoOriginal) return { ok: false, error: 'Formulario no encontrado' }
      const clon = nodoOriginal.cloneNode(true)
      if (limpiarId && clon.id) clon.removeAttribute('id')
      return { ok: true, nodo: clon }
    },
  },
})
