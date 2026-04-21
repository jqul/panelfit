import { NextRequest, NextResponse } from 'next/server'

// Este middleware intercepta requests a subdominios personalizados
// carlos.panelfit.app → carga el panel del entrenador carlos
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const mainDomain = 'panelfit.vercel.app'
  const customDomain = 'panelfit.app'

  // Si es un subdominio (carlos.panelfit.app)
  const isSubdomain = host.endsWith(`.${customDomain}`) && host !== customDomain
  if (!isSubdomain) return NextResponse.next()

  const subdomain = host.replace(`.${customDomain}`, '')
  if (!subdomain || subdomain === 'www') return NextResponse.next()

  // Redirigir a la app principal con el subdominio como parámetro
  const url = request.nextUrl.clone()
  url.hostname = mainDomain
  url.searchParams.set('trainer', subdomain)

  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
