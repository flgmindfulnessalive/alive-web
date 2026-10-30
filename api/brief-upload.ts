// Vercel Function: POST /api/brief-upload
// Emite permisos de subida directa a Vercel Blob (privado) desde el navegador, así los archivos
// no pasan por la función (que admite como máximo ~4,5 MB por petición).
// Solo para una sesión de brief firmada, dentro de su carpeta y con tipos y tamaños permitidos.
//
// Requiere un Blob Store privado conectado al proyecto (crea BLOB_READ_WRITE_TOKEN).
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { ALLOWED_TYPES, BRIEF_LIMITS } from '../src/brief/questions.js'
import { json, parseSession } from './_brief-auth.js'

const GROUPS = ['logo', 'fotos', 'otros']

export async function POST(request: Request): Promise<Response> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return json(503, { error: 'La subida de archivos no está disponible ahora mismo.' })
  }
  let body: HandleUploadBody
  try {
    body = (await request.json()) as HandleUploadBody
  } catch {
    return json(400, { error: 'Petición no válida.' })
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let payload: unknown = null
        try {
          payload = JSON.parse(clientPayload ?? '')
        } catch {
          // se rechaza abajo
        }
        const session = parseSession(payload)
        const [root, id, group, ...rest] = pathname.split('/')
        if (!session || root !== 'briefs' || id !== session.id || !GROUPS.includes(group) || rest.length !== 1) {
          throw new Error('Sesión de brief no válida')
        }
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: BRIEF_LIMITS.fileSize,
          addRandomSuffix: true,
        }
      },
      // Sin onUploadCompleted: los archivos se listan al enviar el brief, así Vercel Blob no
      // necesita llamar de vuelta a esta función al terminar cada subida.
    })
    return json(200, result as unknown as Record<string, unknown>)
  } catch (error) {
    return json(400, { error: error instanceof Error ? error.message : 'No se pudo autorizar la subida.' })
  }
}
