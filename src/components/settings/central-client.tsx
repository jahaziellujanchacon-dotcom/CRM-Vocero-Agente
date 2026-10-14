"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CUENTA_LABEL, FORMATO_LLAVE, textoDelResultado, type ResultadoCentral } from "@/lib/central";

/**
 * 028 — Ajustes → Plan: la llave de licencia de into y el plan que devuelve
 * el servicio central. La llave se manda una vez y no vuelve: la pantalla
 * solo muestra sus últimos 4. Nada de esto afecta al resto del CRM.
 */

type Licencia = {
  llaveLast4: string;
  ultimoIntento: string | null;
  ultimoResultado: ResultadoCentral | null;
  ultimoOk: string | null;
  plan: { codigo: string; nombre: string } | null;
  cuenta: "active" | "suspended" | null;
};

type Vista = { central: string | null; licencia: Licencia | null };

type Mensaje = { kind: "ok" | "error"; text: string };

const fecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" });

export function CentralClient() {
  const [vista, setVista] = useState<Vista | null>(null);
  const [llave, setLlave] = useState("");
  const [ocupado, setOcupado] = useState<"guardar" | "quitar" | null>(null);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/settings/central").catch(() => null);
    if (res?.ok) setVista((await res.json()) as Vista);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    const limpia = llave.trim();
    if (!FORMATO_LLAVE.test(limpia)) {
      setMensaje({ kind: "error", text: "La llave empieza con into_live_ y sigue con 32 letras y números." });
      return;
    }
    setOcupado("guardar");
    const res = await fetch("/api/settings/central", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ llave: limpia }),
    }).catch(() => null);
    setOcupado(null);
    if (!res?.ok) {
      setMensaje({ kind: "error", text: "No se pudo guardar la llave. Inténtalo de nuevo." });
      return;
    }
    setLlave("");
    setVista((await res.json()) as Vista);
    setMensaje({ kind: "ok", text: "Llave guardada." });
  }

  async function quitar() {
    setMensaje(null);
    setOcupado("quitar");
    const res = await fetch("/api/settings/central", { method: "DELETE" }).catch(() => null);
    setOcupado(null);
    if (res?.ok) {
      setVista((await res.json()) as Vista);
      setMensaje({ kind: "ok", text: "Llave quitada: el CRM dejó de latir al central." });
    }
  }

  const lic = vista?.licencia ?? null;
  const resultado = textoDelResultado(lic?.ultimoResultado ?? null);

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          <CardDescription>
            Tu plan con into. Con la llave de licencia, este CRM le avisa a into cada 15 minutos que
            sigue en pie y si algo falla (sin datos de tus clientes), y aquí ves el plan que tienes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {vista === null ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : lic ? (
            <div className="space-y-3 rounded-md border p-3 text-sm" data-testid="central-estado">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold" data-testid="central-plan">
                  {lic.plan ? lic.plan.nombre : "Plan sin confirmar"}
                </span>
                {lic.plan && <code className="font-mono text-xs text-muted-foreground">{lic.plan.codigo}</code>}
                {lic.cuenta && (
                  <Badge variant={lic.cuenta === "active" ? "success" : "warning"} data-testid="central-cuenta">
                    {CUENTA_LABEL[lic.cuenta]}
                  </Badge>
                )}
              </div>
              <dl className="grid gap-x-4 gap-y-1 text-muted-foreground sm:grid-cols-[auto_1fr]">
                <dt>Llave</dt>
                <dd className="font-mono" data-testid="central-llave">
                  ••••{lic.llaveLast4}
                </dd>
                <dt>Último latido</dt>
                <dd>{lic.ultimoIntento ? fecha.format(new Date(lic.ultimoIntento)) : "Todavía ninguno"}</dd>
                {vista.central && (
                  <>
                    <dt>Central</dt>
                    <dd className="break-all">{vista.central}</dd>
                  </>
                )}
              </dl>
              {resultado && (
                <p
                  data-testid="central-resultado"
                  className={
                    resultado.tono === "ok"
                      ? "text-success-text"
                      : resultado.tono === "error"
                        ? "text-danger-text"
                        : "text-warning-text"
                  }
                >
                  {resultado.texto}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Todavía no hay llave: pega la que te dio into. Sin ella, el CRM funciona igual y no le
              avisa nada al central.
            </p>
          )}

          <form onSubmit={guardar} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="central-llave">{lic ? "Reemplazar la llave" : "Llave de licencia"}</Label>
              <Input
                id="central-llave"
                type="password"
                autoComplete="off"
                value={llave}
                onChange={(e) => setLlave(e.target.value)}
                placeholder={lic ? `•••• ${lic.llaveLast4}` : "into_live_…"}
              />
              <p className="text-xs text-muted-foreground">Se guarda cifrada en tu servidor. No la compartas por chat.</p>
            </div>
            {mensaje && (
              <p
                role={mensaje.kind === "error" ? "alert" : "status"}
                className={mensaje.kind === "error" ? "text-sm text-danger-text" : "text-sm text-success-text"}
              >
                {mensaje.text}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={ocupado !== null || llave.trim() === ""}>
                {ocupado === "guardar" ? "Guardando…" : "Guardar y probar"}
              </Button>
              {lic && (
                <button
                  type="button"
                  onClick={quitar}
                  disabled={ocupado !== null}
                  className="text-sm text-text-3 hover:text-foreground"
                >
                  Quitar
                </button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
