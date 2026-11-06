// src/sitio/ui/Imagen.tsx
import type { Imagen as ImagenT } from '../datos/tipos'

// Spec §4.2: srcset con los tamaños de Payload, servidos directo de R2; sin optimizador de Next.
// `data-img` pinta el esqueleto de la foto (base.css) hasta que Efectos ve que cargó o falló.
export function Imagen(props: { imagen: ImagenT | null; sizes?: string; cargar?: 'lazy' | 'eager'; className?: string; alt?: string }) {
  const { imagen, sizes = '100vw', cargar = 'lazy', className, alt } = props
  if (!imagen) return null
  return (
    <img
      className={className}
      data-img=""
      src={imagen.src}
      srcSet={imagen.srcset || undefined}
      sizes={imagen.srcset ? sizes : undefined}
      width={imagen.ancho ?? undefined}
      height={imagen.alto ?? undefined}
      alt={alt ?? imagen.alt}
      loading={cargar}
      decoding="async"
    />
  )
}
