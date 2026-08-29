import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Spot — Tu negocio, tu lugar',
    short_name: 'Spot',
    description: 'Plataforma todo-en-uno para negocios locales: ventas, inventario, equipo, reportes y más.',
    start_url: '/d',
    display: 'standalone',
    orientation: 'any',
    background_color: '#15140f',
    theme_color: '#15140f',
    categories: ['business', 'productivity', 'utilities'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
