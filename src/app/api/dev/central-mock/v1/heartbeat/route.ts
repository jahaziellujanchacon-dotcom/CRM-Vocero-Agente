import { mockGuard } from "@/lib/dev-guard";

export const dynamic = "force-dynamic";

/**
 * 028 — `POST /v1/heartbeat` del servicio central, para el self-test. Mismo
 * contrato que into-central. El final de la llave elige el caso:
 * `…0000` → 401, `…5000` → 500, `…4290` → 429; el resto, 200 con un plan.
 * Guarda el último cuerpo recibido para que el guion compruebe qué se mandó.
 */

const globalMock = globalThis as unknown as { __centralMockUltimo?: unknown };

export async function POST(req: Request) {
  const guard = mockGuard();
  if (guard) return guard;

  const llave = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "")?.[1] ?? "";
  if (!llave || llave.endsWith("0000")) {
    return Response.json({ error: { code: "invalid_api_key", message: "Invalid or revoked license key" } }, { status: 401 });
  }
  if (llave.endsWith("5000")) return new Response("boom", { status: 500 });
  if (llave.endsWith("4290")) {
    return Response.json({ error: { code: "rate_limited", message: "Too many heartbeats" } }, { status: 429 });
  }
  globalMock.__centralMockUltimo = await req.json().catch(() => null);
  return Response.json({
    customer: { name: "Academia Ejemplo", status: llave.endsWith("9999") ? "suspended" : "active" },
    plan: { code: "CE-PYM", name: "Pyme" },
    next_heartbeat_seconds: 900,
  });
}

/** Lo último que recibió el mock (solo existe con los mocks encendidos). */
export async function GET() {
  const guard = mockGuard();
  if (guard) return guard;
  return Response.json({ ultimo: globalMock.__centralMockUltimo ?? null });
}
