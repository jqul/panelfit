// Límites antes de pasarle un archivo a xlsx (SheetJS) — es contenido que
// sube el propio usuario, así que aunque la versión instalada ya corrige las
// vulnerabilidades conocidas (prototype pollution / ReDoS), conviene no
// parsear a ciegas un archivo gigante o con una extensión rara.
const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024 // 5 MB — de sobra para una rutina/dieta en Excel
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv']

export function assertImportFileIsSafe(file: File) {
  const name = file.name.toLowerCase()
  if (!ALLOWED_EXTENSIONS.some(ext => name.endsWith(ext))) {
    throw new Error('Formato no soportado — sube un .xlsx, .xls o .csv')
  }
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error(`El archivo pesa demasiado (máx. ${MAX_IMPORT_FILE_BYTES / 1024 / 1024}MB)`)
  }
  if (file.size === 0) {
    throw new Error('El archivo está vacío')
  }
}
