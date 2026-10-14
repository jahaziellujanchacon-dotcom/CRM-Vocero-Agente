import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { canConfigure } from "@/lib/auth/roles";
import { LICENSE_KEY_PATTERN } from "@/server/central/client";
import { centralDisabledResponse, leerConfigCentral } from "@/server/central/flag";
import { latirAhora } from "@/server/central/heartbeat";
import { getLicenciaPublica, guardarLlave, quitarLlave } from "@/server/central/license";

export const dynamic = "force-dynamic";

/**
 * 028 — Ajustes → Plan: la llave de licencia de into y lo último que dijo el
 * central. Sin la bandera `INTO_CENTRAL_URL`, 404. La llave entra una vez y
 * nunca vuelve a salir: la respuesta lleva sus últimos 4.
 */

async function vista(organizationId: string) {
  const config = leerConfigCentral();
  return {
    central: config.activo ? config.host : null,
    licencia: await getLicenciaPublica(organizationId),
  };
}

const putSchema = z.object({
  llave: z
    .string()
    .trim()
    .regex(LICENSE_KEY_PATTERN, "La llave empieza con into_live_ y sigue con 32 letras y números"),
});

export const GET = withAuth(async (session) => {
  if (!leerConfigCentral().activo) return centralDisabledResponse();
  if (!canConfigure(session.role)) return apiError(403, "forbidden", "Solo quien configura el negocio");
  return Response.json(await vista(session.organizationId));
});

export const PUT = withAuth(async (session, req: Request) => {
  if (!leerConfigCentral().activo) return centralDisabledResponse();
  if (!canConfigure(session.role)) return apiError(403, "forbidden", "Solo quien configura el negocio");
  const body = await parseBody(req, putSchema);
  if (!body.ok) return body.response;
  await guardarLlave(session.organizationId, body.data.llave);
  // AC3: late en ese momento; con el central caído responde igual (10 s de límite).
  await latirAhora(session.organizationId);
  return Response.json(await vista(session.organizationId));
});

export const DELETE = withAuth(async (session) => {
  if (!leerConfigCentral().activo) return centralDisabledResponse();
  if (!canConfigure(session.role)) return apiError(403, "forbidden", "Solo quien configura el negocio");
  await quitarLlave(session.organizationId);
  return Response.json(await vista(session.organizationId));
});
