import type { Miga } from '../datos/tipos'

const absoluta = (ruta: string, base: string) => new URL(ruta, base).toString()

export function migasLd(migas: Miga[], base: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: migas.map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: m.nombre, item: absoluta(m.ruta, base) })),
  }
}

export function listaLd(items: { nombre: string; ruta: string }[], base: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.nombre, url: absoluta(x.ruta, base) })),
  }
}
