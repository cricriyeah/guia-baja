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
  // Temporal hasta F3: nada de esta app se indexa todavía.
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] }]
  },
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
