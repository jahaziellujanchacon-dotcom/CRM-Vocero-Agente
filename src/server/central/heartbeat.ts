import { APP_VERSION, resolveCommit } from "@/lib/version";
import { chequeosDelLatido } from "@/server/central/checks";
import {
  enviarLatido,
  intervaloSiguiente,
  type CuerpoLatido,
  type ResultadoLatido,
} from "@/server/central/client";
import { leerConfigCentral } from "@/server/central/flag";
import { anotarResultado, getLlave, organizacionesConLlave } from "@/server/central/license";

/**
 * 028 — El latido al servicio central. Corre fuera de cualquier petición de
 * usuario (salvo el inmediato al guardar la llave) y nunca lanza: un fallo del
 * central se anota y el siguiente latido llega a su hora (D4). Jamás escribe
 * la llave en el registro.
 */

/** Cuándo arrancó este proceso: viaja como `app_started_at`. */
const ARRANQUE = new Date();

export async function armarCuerpo(organizationId: string): Promise<CuerpoLatido> {
  const { commit } = resolveCommit();
  return {
    app_version: APP_VERSION,
    ...(commit ? { app_commit: commit } : {}),
    app_started_at: ARRANQUE.toISOString(),
    checks: await chequeosDelLatido(organizationId),
  };
}

export type LatidoHecho =
  | { hecho: false; motivo: "apagado" | "sin_llave" }
  | { hecho: true; resultado: ResultadoLatido; siguienteSegundos: number };

/** Un latido de una organización, ahora. Anota el resultado en su fila. */
export async function latirAhora(organizationId: string, now: () => Date = () => new Date()): Promise<LatidoHecho> {
  const config = leerConfigCentral();
  if (!config.activo) return { hecho: false, motivo: "apagado" };
  const guardada = await getLlave(organizationId);
  if (!guardada) return { hecho: false, motivo: "sin_llave" };
  const resultado = await enviarLatido({
    url: config.url,
    llave: guardada.llave,
    cuerpo: await armarCuerpo(organizationId),
  });
  await anotarResultado(organizationId, resultado, now());
  const pedido = resultado.ok ? resultado.respuesta.next_heartbeat_seconds : guardada.intervalo;
  return { hecho: true, resultado, siguienteSegundos: intervaloSiguiente(pedido) };
}

const globalLatido = globalThis as unknown as { __intoCentralTimer?: ReturnType<typeof setTimeout> | null };

/**
 * El temporizador: late al arrancar y vuelve a programarse con el intervalo
 * que pidió el central (D5). Con varias organizaciones, el más corto.
 */
export function iniciarLatidos(log: (linea: string) => void = console.log): void {
  if (globalLatido.__intoCentralTimer !== undefined) return;
  globalLatido.__intoCentralTimer = null;

  const programar = (segundos: number) => {
    const timer = setTimeout(() => void ronda(), segundos * 1000);
    timer.unref?.();
    globalLatido.__intoCentralTimer = timer;
  };

  async function ronda(): Promise<void> {
    let siguiente = intervaloSiguiente(null);
    try {
      const orgs = await organizacionesConLlave();
      const intervalos: number[] = [];
      for (const org of orgs) {
        try {
          const hecho = await latirAhora(org);
          if (!hecho.hecho) continue;
          intervalos.push(hecho.siguienteSegundos);
          if (!hecho.resultado.ok) {
            log(`[central] latido sin éxito: ${hecho.resultado.resultado}${hecho.resultado.http ? ` (HTTP ${hecho.resultado.http})` : ""}`);
          }
        } catch (err) {
          log(`[central] el latido falló: ${err instanceof Error ? err.name : "Error"}`);
        }
      }
      if (intervalos.length > 0) siguiente = Math.min(...intervalos);
    } catch (err) {
      // La base puede no estar lista todavía: se reintenta a la hora normal.
      log(`[central] no se pudieron leer las llaves: ${err instanceof Error ? err.name : "Error"}`);
    }
    programar(siguiente);
  }

  void ronda();
}
