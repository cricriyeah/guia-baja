'use client'

import { useParams } from 'next/navigation'

import { esLocale } from '../../../dominio/idioma'
import { textos } from '../../textos'

// Aviso para lectores de pantalla. Es de cliente porque loading.tsx no recibe `params` y el idioma sale de la URL.
export function AvisoCarga() {
  const { lang } = useParams<{ lang: string }>()
  return <span className="solo-lector" role="status">{textos(esLocale(lang) ? lang : 'es').cargando}</span>
}
