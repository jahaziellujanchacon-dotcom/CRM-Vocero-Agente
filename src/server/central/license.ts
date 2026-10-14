import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import type { ResultadoLatido } from "@/server/central/client";

/**
 * 028 — La llave de licencia de into de la organización (cifrada en reposo,
 * como el token de WhatsApp) y lo último que dijo el central.
 */

type Row = typeof schema.centralLicense.$inferSelect;

/** Lo que puede salir hacia el cliente. NUNCA incluye la llave. */
export type LicenciaPublica = {
  llaveLast4: string;
  ultimoIntento: Date | null;
  ultimoResultado: Row["lastResult"];
  ultimoOk: Date | null;
  plan: { codigo: string; nombre: string } | null;
  cuenta: "active" | "suspended" | null;
};

export function toPublica(row: Row): LicenciaPublica {
  return {
    llaveLast4: row.keyLast4,
    ultimoIntento: row.lastAttemptAt,
    ultimoResultado: row.lastResult,
    ultimoOk: row.lastOkAt,
    plan: row.planCode && row.planName ? { codigo: row.planCode, nombre: row.planName } : null,
    cuenta: row.customerStatus,
  };
}

async function rowDe(organizationId: string): Promise<Row | null> {
  const rows = await getDb()
    .select()
    .from(schema.centralLicense)
    .where(scoped(schema.centralLicense.organizationId, organizationId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getLicenciaPublica(organizationId: string): Promise<LicenciaPublica | null> {
  const row = await rowDe(organizationId);
  return row ? toPublica(row) : null;
}

export async function getLlave(organizationId: string): Promise<{ llave: string; intervalo: number | null } | null> {
  const row = await rowDe(organizationId);
  if (!row) return null;
  return {
    llave: decryptSecret({ cipher: row.keyCipher, iv: row.keyIv, tag: row.keyTag }),
    intervalo: row.nextHeartbeatSeconds,
  };
}

/** Las organizaciones que tienen llave (en la raíz, a lo más una). */
export async function organizacionesConLlave(): Promise<string[]> {
  const rows = await getDb()
    .select({ organizationId: schema.centralLicense.organizationId })
    .from(schema.centralLicense);
  return rows.map((r) => r.organizationId);
}

/**
 * Guarda una llave nueva y reemplaza la anterior entera: lo del último latido
 * era de otra llave y no vale para esta (data-model).
 */
export async function guardarLlave(organizationId: string, llave: string): Promise<void> {
  const enc = encryptSecret(llave);
  const now = new Date();
  const valores = {
    keyCipher: enc.cipher,
    keyIv: enc.iv,
    keyTag: enc.tag,
    keyLast4: llave.slice(-4),
    lastAttemptAt: null,
    lastResult: null,
    lastOkAt: null,
    planCode: null,
    planName: null,
    customerStatus: null,
    nextHeartbeatSeconds: null,
    updatedAt: now,
  };
  await getDb()
    .insert(schema.centralLicense)
    .values({ id: newId("centralLicense"), organizationId, ...valores })
    .onConflictDoUpdate({ target: schema.centralLicense.organizationId, set: valores });
}

export async function quitarLlave(organizationId: string): Promise<void> {
  await getDb()
    .delete(schema.centralLicense)
    .where(scoped(schema.centralLicense.organizationId, organizationId));
}

/** D6: anota el intento; si el central aceptó, también el plan y la cuenta. */
export async function anotarResultado(organizationId: string, resultado: ResultadoLatido, now: Date): Promise<void> {
  const set = resultado.ok
    ? {
        lastAttemptAt: now,
        lastResult: "ok" as const,
        lastOkAt: now,
        planCode: resultado.respuesta.plan.code,
        planName: resultado.respuesta.plan.name,
        customerStatus: resultado.respuesta.customer.status,
        nextHeartbeatSeconds: resultado.respuesta.next_heartbeat_seconds ?? null,
        updatedAt: now,
      }
    : { lastAttemptAt: now, lastResult: resultado.resultado, updatedAt: now };
  await getDb()
    .update(schema.centralLicense)
    .set(set)
    .where(scoped(schema.centralLicense.organizationId, organizationId));
}
