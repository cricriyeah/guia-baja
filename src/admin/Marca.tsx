/* eslint-disable @next/next/no-img-element -- SVG estático de public/: el optimizador de imágenes no aplica. */

// Marca del admin de Payload (admin.components.graphics en payload.config.ts).

// Pantallas de entrada y de restablecer contraseña.
export function Logo() {
  return (
    <div className="sbe-marca">
      <img className="sbe-marca__logo" src="/guia-assets/logos/logolg.svg" width={286} height={91} alt="SBE Guide" />
      <p className="sbe-marca__titulo">Sitio de administración editorial para SBE Guide</p>
    </div>
  )
}

// Navegación interna del admin.
export function Icono() {
  return <img className="sbe-icono" src="/guia-assets/logos/logosm.svg" width={18} height={18} alt="SBE Guide" />
}
