// Manifiesto de la app instalada de UN cliente: igual que public/manifest.json pero con `start_url` en su enlace
// (/?c=<token>). Un acceso directo arranca en el start_url del manifiesto; con el general ("/") el cliente caía en la
// pantalla de entrenadores y "se salía de su enlace". La página del cliente apunta su <link rel="manifest"> aquí
// (src/lib/clientLink.ts). Es una función de Vercel: no toca la base de datos ni guarda nada.
//
// El token solo se refleja en el manifiesto si tiene forma de token (letras, números, guion y guion bajo): así
// nunca se cuela texto arbitrario en una dirección.

const PLAUSIBLE = /^[A-Za-z0-9_-]{8,128}$/

export function buildManifest(origin, token) {
  return {
    name: 'PanelFit',
    short_name: 'PanelFit',
    description: 'Tu panel de entrenamiento personal',
    start_url: `${origin}/?c=${token}`,
    scope: `${origin}/`,
    display: 'standalone',
    background_color: '#f5f0ea',
    theme_color: '#6e5438',
    orientation: 'portrait',
    icons: [
      { src: `${origin}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: `${origin}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  }
}

export default function handler(req, res) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  const token = new URL(req.url || '/', 'http://localhost').searchParams.get('c')

  if (!host || !PLAUSIBLE.test(token || '') || !/^https?$/.test(proto)) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('Enlace no válido')
    return
  }
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8')
  // El enlace va en la propia dirección: nada que compartir entre clientes, y se puede guardar un rato en el dispositivo.
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.end(JSON.stringify(buildManifest(`${proto}://${host}`, token)))
}
