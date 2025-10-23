import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFormAuxStore } from '../formAux'

describe('formAux store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('genera un código coincidente con la expresión nombrada', () => {
    const store = useFormAuxStore()
    const resultado = store.generarCodigo({
      regex: 'codigoCliente',
      longitud: 5,
      charset: 'C0123456789',
      maxIntentos: 200,
    })
    expect(resultado.ok).toBe(true)
    expect(resultado.valor).toMatch(/^C[0-9]{4}$/)
  })

  it('retorna error cuando no es posible cumplir el patrón', () => {
    const store = useFormAuxStore()
    const resultado = store.generarCodigo({
      regex: /^[0-9]{4}$/,
      longitud: 4,
      charset: 'ABCD',
      maxIntentos: 5,
    })
    expect(resultado.ok).toBe(false)
    expect(resultado.error).toBe('No se pudo generar un código válido')
  })
})
