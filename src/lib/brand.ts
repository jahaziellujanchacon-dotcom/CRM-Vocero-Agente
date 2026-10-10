/**
 * La marca IntoSales, de la familia "into" (azul #0081C8 y verde #33B44A).
 *
 * Vive aquí, sin React, porque la usan dos mundos: los componentes (el trazo
 * del panel lateral y del login) y el servidor (el favicon generado que se
 * sirve como texto). Tener el dibujo en un solo sitio es lo que garantiza que
 * la pestaña y la barra lateral enseñen el MISMO isotipo.
 *
 * El isotipo son dos flechas que avanzan. La primera se pinta con
 * `currentColor` (así hereda el acento white-label); la segunda es el verde
 * de marca y NO se recalcula con el acento: es lo que la hace reconocible.
 *
 * PROVISIONAL: es un trazo hecho a mano a partir de la descripción del
 * isotipo de flechas de into. Cuando exista el SVG oficial, sus trazos
 * reemplazan estas dos constantes.
 */

/** Primera flecha: se pinta con el color del contexto. */
export const BRAND_MARK_BODY = "M4.5 5.5 11 12l-6.5 6.5";

/** Segunda flecha, siempre verde. */
export const BRAND_MARK_TAIL = "M12.5 5.5 19 12l-6.5 6.5";

export const BRAND_MARK_STROKE = 3.4;

/** Azul into, el del logo. */
export const BRAND_BLUE = "#0081c8";

/** Verde into sobre fondos claros (texto azul al lado). */
export const BRAND_GREEN = "#33b44a";

/** Verde sobre el mosaico azul: un punto más claro para que no se hunda. */
export const BRAND_GREEN_ON_TILE = "#5fd474";

/**
 * ¿Esta instancia se llama IntoSales? Solo entonces se dibuja el logo: una
 * agencia que rebautizó el CRM para su cliente no debe ver las flechas de
 * otro producto en su barra lateral ni en su pestaña. El nombre por defecto
 * es "IntoSales", así que una instancia sin configurar lo ve de inmediato.
 */
export function isBrandName(name: string): boolean {
  return name.trim().toLowerCase().replace(/\s+/g, "") === "intosales";
}
