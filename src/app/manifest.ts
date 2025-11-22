import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Finanzas Personales Perú',
    short_name: 'Finanzas PE',
    description: 'Gestión financiera personal gamificada para Perú',
    start_url: '/',
    display: 'standalone',
    background_color: '#F2F2F2',
    theme_color: '#5478BF',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
