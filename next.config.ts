import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  // `next dev` agrega su propio bloque a AGENTS.md; las reglas del repo se mantienen a mano.
  agentRules: false,
  // Los archivos /_next de la guía no deben chocar con los del sitio de reservas (spec §4).
  assetPrefix: '/guia-assets',
  // /_next/image no lleva assetPrefix; las imágenes se sirven directo desde R2 (spec §4.2).
  images: { unoptimized: true },
  // La guía decide su X-Robots-Tag en src/proxy.ts (spec §4.1); el admin y la API nunca se indexan.
  async headers() {
    const noindex = [{ key: 'X-Robots-Tag', value: 'noindex' }]
    return [
      { source: '/admin/:path*', headers: noindex },
      { source: '/api/:path*', headers: noindex },
    ]
  },
  // El formulario llega por salysoltours.com (rewrite): su Server Action debe aceptar ese origen (spec §4).
  experimental: { serverActions: { allowedOrigins: ['salysoltours.com', 'www.salysoltours.com'] } },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
  turbopack: { root: path.resolve(dirname) },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
