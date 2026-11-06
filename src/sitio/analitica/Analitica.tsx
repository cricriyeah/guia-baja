'use client'

import { useEffect } from 'react'

import { montarAnalitica } from './escucha'

// No pinta nada: solo engancha el listener delegado de los links con data-evento.
export function Analitica() {
  useEffect(() => montarAnalitica(document), [])
  return null
}
