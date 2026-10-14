/**
 * 028 — Cómo se lee en pantalla lo que dijo el servicio central. Sin
 * dependencias de servidor: lo usa el componente de Ajustes → Plan.
 */

export type ResultadoCentral = "ok" | "llave_invalida" | "limite" | "rechazado" | "sin_respuesta";

/** Qué pasó en el último latido, en palabras del dueño (AC3, AC4, AC6). */
export function textoDelResultado(resultado: ResultadoCentral | null): { tono: "ok" | "aviso" | "error"; texto: string } | null {
  switch (resultado) {
    case null:
      return null;
    case "ok":
      return { tono: "ok", texto: "Conectado: el central recibió el último latido." };
    case "llave_invalida":
      return {
        tono: "error",
        texto: "El central no reconoce esta llave. Revísala con into o pega la nueva si la rotaron.",
      };
    case "limite":
      return { tono: "aviso", texto: "El central pidió esperar un poco: el siguiente latido sale a su hora." };
    case "rechazado":
      return { tono: "error", texto: "El central rechazó el latido. Avísale a into." };
    case "sin_respuesta":
      return {
        tono: "aviso",
        texto: "Sin respuesta del central. Tu CRM sigue funcionando igual; el siguiente latido sale a su hora.",
      };
  }
}

export const CUENTA_LABEL: Record<"active" | "suspended", string> = {
  active: "Activa",
  suspended: "Suspendida",
};

/** El formato de la llave que emite el central (también lo valida la API). */
export const FORMATO_LLAVE = /^into_live_[0-9A-Za-z]{32}$/;
