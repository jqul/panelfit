// Textos de privacidad y consentimiento que ve el cliente. BORRADOR: deben
// revisarse con un profesional jurídico antes de usarse con clientes reales
// (ver docs/rgpd.md). Cualquier cambio de fondo en estos textos exige subir
// CONSENT_VERSION: así se vuelve a pedir el consentimiento a todos.
export const CONSENT_VERSION = '2026-10'

export const CONSENT_SALUD_LABEL = 'Consiento el tratamiento de mis datos de salud'
export const CONSENT_SALUD_TEXT =
  'Tu entrenador necesita tratar datos de salud tuyos para prepararte y adaptarte el entrenamiento: tu cuestionario de salud, ' +
  'el dolor y las molestias que registres, tu peso y composición corporal, tus registros de entrenamiento y tu estado de recuperación. ' +
  'Solo los usa para ese fin y no se ceden a terceros, salvo a los proveedores técnicos que alojan la aplicación (Supabase y Vercel). ' +
  'Sin este consentimiento no se pueden guardar esos datos.'

export const CONSENT_FOTOS_LABEL = 'Consiento que mi entrenador guarde mis fotos y medidas de progreso'
export const CONSENT_FOTOS_TEXT =
  'Es opcional. Las fotos de progreso son datos sensibles: solo las ve tu entrenador, se guardan en un espacio privado ' +
  'y puedes borrarlas cuando quieras. Si no lo aceptas, el resto de la app funciona igual.'

export const PRIVACY_INFO: { titulo: string; texto: string }[] = [
  { titulo: 'Quién es el responsable', texto: 'Tu entrenador, que decide para qué se usan tus datos. PanelFit es la herramienta que los guarda por su cuenta.' },
  { titulo: 'Para qué', texto: 'Preparar y ajustar tu plan de entrenamiento y nutrición, y hacer tu seguimiento.' },
  { titulo: 'Por qué se pueden tratar', texto: 'Por tu consentimiento explícito (art. 9.2.a RGPD) para los datos de salud y las fotos, y por la relación con tu entrenador para el resto.' },
  { titulo: 'Cuánto tiempo', texto: 'Mientras seas su cliente. Cuando dejes de serlo, tu entrenador debe borrarlos (como máximo a los 24 meses sin actividad), salvo lo que la ley le obligue a conservar.' },
  { titulo: 'Tus derechos', texto: 'Acceder a tus datos y descargarlos, rectificarlos, borrarlos, retirar tu consentimiento cuando quieras y reclamar ante la Agencia Española de Protección de Datos (aepd.es).' },
]
