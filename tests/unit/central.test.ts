import { describe, expect, it, vi } from "vitest";
import { CUENTA_LABEL, FORMATO_LLAVE, textoDelResultado } from "@/lib/central";
import { settingsSections } from "@/lib/nav";
import { chequeosDelLatido, peorEstado } from "@/server/central/checks";
import { CHECK_IDS, enviarLatido, intervaloSiguiente, LICENSE_KEY_PATTERN, type CuerpoLatido } from "@/server/central/client";
import { leerConfigCentral } from "@/server/central/flag";
import { checkCentral } from "@/server/doctor/checks";
import { healthFeatures } from "@/server/health";

const LLAVE = "into_live_" + "A".repeat(28) + "1234";
const CUERPO: CuerpoLatido = {
  app_version: "1.5.0",
  app_started_at: "2026-10-14T03:00:00.000Z",
  checks: [{ id: "database", status: "ok" }],
};
const respuesta = (status: number, body: unknown) =>
  async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status });

describe("028 — bandera INTO_CENTRAL_URL (D1)", () => {
  it("apagada sin la variable; encendida con una URL http(s)", () => {
    expect(leerConfigCentral({})).toEqual({ activo: false, host: null, problema: null });
    expect(leerConfigCentral({ INTO_CENTRAL_URL: "  " })).toMatchObject({ activo: false, problema: null });
    expect(leerConfigCentral({ INTO_CENTRAL_URL: "https://api.into.center/" })).toEqual({
      activo: true,
      url: "https://api.into.center",
      host: "api.into.center",
    });
    expect(leerConfigCentral({ INTO_CENTRAL_URL: "http://localhost:3011" })).toMatchObject({ activo: true, url: "http://localhost:3011" });
  });

  it("mal escrita queda inactiva y lo dice, sin tumbar nada", () => {
    for (const raw of ["api.into.center", "ftp://api.into.center", "https://u:p@api.into.center"]) {
      expect(leerConfigCentral({ INTO_CENTRAL_URL: raw })).toMatchObject({ activo: false, problema: "url" });
    }
    expect(checkCentral({ INTO_CENTRAL_URL: "nope" }).status).toBe("warn");
    expect(checkCentral({}).status).toBe("skip");
    expect(checkCentral({ INTO_CENTRAL_URL: "https://api.into.center" })).toMatchObject({ status: "ok", detail: expect.stringContaining("api.into.center") });
  });

  it("decide si existen «Plan» y features.central (AC1)", () => {
    const negocio = (central: boolean) => settingsSections({ central }).find((s) => s.title === "Negocio")!.links.map((l) => l.label);
    expect(negocio(false)).not.toContain("Plan");
    expect(negocio(true)).toContain("Plan");
    expect(healthFeatures({}).central).toBe(false);
    expect(healthFeatures({ INTO_CENTRAL_URL: "https://api.into.center" }).central).toBe(true);
    expect(healthFeatures({ INTO_CENTRAL_URL: "mal" }).central).toBe(false);
  });
});

describe("028 — adaptador del central (contrato de into-central)", () => {
  it("manda el cuerpo con la llave solo en la cabecera", async () => {
    const fetchImpl = vi.fn(
      respuesta(200, { customer: { name: "A", status: "active" }, plan: { code: "CE-PYM", name: "Pyme" }, next_heartbeat_seconds: 900 }),
    );
    const r = await enviarLatido({ url: "https://api.into.center", llave: LLAVE, cuerpo: CUERPO, fetchImpl });
    expect(r).toEqual({ ok: true, respuesta: expect.objectContaining({ plan: { code: "CE-PYM", name: "Pyme" } }) });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.into.center/v1/heartbeat");
    expect((init.headers as Record<string, string>).authorization).toBe(`Bearer ${LLAVE}`);
    expect(String(init.body)).not.toContain(LLAVE);
    expect(JSON.parse(String(init.body))).toEqual(CUERPO);
  });

  it("traduce cada respuesta a un resultado cerrado, sin la llave (AC4, AC6)", async () => {
    const casos: [() => Promise<Response>, string][] = [
      [respuesta(401, { error: {} }), "llave_invalida"],
      [respuesta(429, { error: {} }), "limite"],
      [respuesta(400, { error: {} }), "rechazado"],
      [respuesta(500, "boom"), "sin_respuesta"],
      [respuesta(200, { raro: true }), "sin_respuesta"],
      [respuesta(200, "no es json"), "sin_respuesta"],
      [
        async () => {
          throw new TypeError(`fetch failed ${LLAVE}`);
        },
        "sin_respuesta",
      ],
    ];
    for (const [fetchImpl, esperado] of casos) {
      const r = await enviarLatido({ url: "https://x", llave: LLAVE, cuerpo: CUERPO, fetchImpl });
      expect(r).toMatchObject({ ok: false, resultado: esperado });
      expect(JSON.stringify(r)).not.toContain(LLAVE);
    }
  });

  it("acota el intervalo que pide el central (D5)", () => {
    expect(intervaloSiguiente(undefined)).toBe(900);
    expect(intervaloSiguiente(null)).toBe(900);
    expect(intervaloSiguiente(5)).toBe(60);
    expect(intervaloSiguiente(900)).toBe(900);
    expect(intervaloSiguiente(86400)).toBe(3600);
  });

  it("reconoce el formato de la llave del central", () => {
    expect(LICENSE_KEY_PATTERN.test(LLAVE)).toBe(true);
    expect(FORMATO_LLAVE.test(LLAVE)).toBe(true);
    for (const mala of ["into_live_corta", `into_test_${"A".repeat(32)}`, `${LLAVE}x`, ""]) {
      expect(LICENSE_KEY_PATTERN.test(mala)).toBe(false);
    }
  });
});

describe("028 — chequeos del latido (D3)", () => {
  it("manda solo los cinco ids y su estado, nunca el detalle", async () => {
    const checks = await chequeosDelLatido("org_1", {
      mediaDir: async () => ({ writable: true }),
      whatsapp: async () => [
        { status: "ok", label: "WhatsApp +51 999 (Org)", detail: "token …abcd" },
        { status: "fail", label: "WhatsApp +51 888 (Org)", detail: "token vencido" },
      ],
      ia: async () => ({ activa: false, motivo: "sin_configurar" }),
      despacho: () => ({ status: "skip", label: "BRAIN_DISPATCH_URL" }),
    });
    expect(checks).toEqual([
      { id: "database", status: "ok" },
      { id: "media_dir", status: "ok" },
      { id: "whatsapp", status: "fail" },
      { id: "ai", status: "skip" },
      { id: "dispatch", status: "skip" },
    ]);
    expect(checks.map((c) => c.id)).toEqual([...CHECK_IDS]);
    expect(JSON.stringify(checks)).not.toMatch(/999|abcd|vencido|Org/);
  });

  it("un chequeo que revienta va como aviso y el latido sale igual (D4)", async () => {
    const checks = await chequeosDelLatido("org_1", {
      mediaDir: async () => null,
      whatsapp: async () => {
        throw new Error("BD caída");
      },
      ia: async () => ({ activa: false, motivo: "token_invalido" }),
      despacho: () => ({ status: "warn", label: "BRAIN_DISPATCH_URL" }),
    });
    expect(checks).toEqual([
      { id: "database", status: "ok" },
      { id: "media_dir", status: "skip" },
      { id: "whatsapp", status: "warn" },
      { id: "ai", status: "fail" },
      { id: "dispatch", status: "warn" },
    ]);
  });

  it("el peor estado manda", () => {
    expect(peorEstado(["ok", "warn", "skip"])).toBe("warn");
    expect(peorEstado(["ok", "fail", "warn"])).toBe("fail");
    expect(peorEstado(["skip"])).toBe("skip");
    expect(peorEstado([])).toBe("skip");
  });
});

describe("028 — textos de Ajustes → Plan", () => {
  it("dice qué pasó en el último latido", () => {
    expect(textoDelResultado(null)).toBeNull();
    expect(textoDelResultado("ok")?.tono).toBe("ok");
    expect(textoDelResultado("llave_invalida")?.texto).toMatch(/no reconoce esta llave/);
    expect(textoDelResultado("sin_respuesta")?.texto).toMatch(/Sin respuesta del central.*sigue funcionando/);
    expect(CUENTA_LABEL).toEqual({ active: "Activa", suspended: "Suspendida" });
  });
});
