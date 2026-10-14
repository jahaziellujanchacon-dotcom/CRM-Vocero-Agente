import { checkDispatch, checkWhatsApp, type CheckResult } from "@/server/doctor/checks";
import { estadoIaDe } from "@/lib/ai/provider";
import { mediaDirStatus } from "@/server/media-dir";
import type { CheckId, CheckStatus } from "@/server/central/client";

/**
 * 028, D3 — Los cinco chequeos del latido, con las MISMAS funciones del
 * doctor. Solo viaja el estado: el detalle (teléfonos, motivos, rutas) se
 * queda en el CRM (contrato del central; su Principio II, «Mínimo dato»).
 */

const PEOR: CheckStatus[] = ["fail", "warn", "ok", "skip"];

/** Con varios números de WhatsApp, cuenta el peor. */
export function peorEstado(estados: CheckStatus[]): CheckStatus {
  for (const e of PEOR) if (estados.includes(e)) return e;
  return "skip";
}

export type DependenciasChequeos = {
  mediaDir?: () => Promise<{ writable: boolean } | null>;
  whatsapp?: () => Promise<CheckResult[]>;
  ia?: (organizationId: string) => Promise<{ activa: boolean; motivo?: string }>;
  despacho?: () => CheckResult;
};

/**
 * Nunca lanza: un chequeo que no se pudo correr va como `warn`, porque el
 * latido tiene que salir igual (D4).
 */
export async function chequeosDelLatido(
  organizationId: string,
  deps: DependenciasChequeos = {}
): Promise<{ id: CheckId; status: CheckStatus }[]> {
  const mediaDir = deps.mediaDir ?? mediaDirStatus;
  const whatsapp = deps.whatsapp ?? (() => checkWhatsApp());
  const ia = deps.ia ?? estadoIaDe;
  const despacho = deps.despacho ?? (() => checkDispatch(process.env));

  const seguro = async (f: () => Promise<CheckStatus>): Promise<CheckStatus> => {
    try {
      return await f();
    } catch {
      return "warn";
    }
  };

  return [
    // El latido acaba de leer la llave de la base: si llegó aquí, responde.
    { id: "database", status: "ok" },
    {
      id: "media_dir",
      status: await seguro(async () => {
        const media = await mediaDir();
        return media ? (media.writable ? "ok" : "fail") : "skip";
      }),
    },
    { id: "whatsapp", status: await seguro(async () => peorEstado((await whatsapp()).map((r) => r.status))) },
    {
      id: "ai",
      status: await seguro(async () => {
        const estado = await ia(organizationId);
        if (estado.activa) return "ok";
        return estado.motivo === "sin_configurar" ? "skip" : "fail";
      }),
    },
    { id: "dispatch", status: await seguro(async () => despacho().status) },
  ];
}
