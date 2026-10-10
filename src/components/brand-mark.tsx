import type { Branding } from "@/lib/branding";
import {
  BRAND_GREEN,
  BRAND_GREEN_ON_TILE,
  BRAND_MARK_BODY,
  BRAND_MARK_STROKE,
  BRAND_MARK_TAIL,
  isBrandName,
} from "@/lib/brand";
import { faviconHref, faviconInitial } from "@/lib/favicon";
import { cn } from "@/lib/utils";

/**
 * Lo que la marca necesita para dibujarse: el nombre, el acento y si hay
 * logo subido (el acento entra en la URL versionada del icono generado).
 */
export type BrandingMark = Pick<Branding, "name" | "accent" | "favicon">;

/**
 * El isotipo de la marca: las dos flechas de into. La primera hereda
 * `currentColor`; píntala con `text-brand` (o blanco sobre el mosaico) y la
 * segunda sigue siendo verde.
 */
export function BrandMark({
  className,
  green = BRAND_GREEN,
}: {
  className?: string;
  green?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d={BRAND_MARK_BODY}
        stroke="currentColor"
        strokeWidth={BRAND_MARK_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d={BRAND_MARK_TAIL}
        stroke={green}
        strokeWidth={BRAND_MARK_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * Mosaico cuadrado con degradado del acento: es el favicon en grande. Con un
 * logo subido lleva el logo (el MISMO archivo y la MISMA URL versionada que
 * la pestaña, así lo que se sube en Ajustes → Marca se ve en los dos sitios);
 * sin él, las flechas de into o la inicial del nombre white-label.
 */
export function BrandTile({
  branding,
  className,
}: {
  branding: BrandingMark;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "brand-tile flex shrink-0 items-center justify-center overflow-hidden text-brand-fg",
        className
      )}
      aria-hidden
    >
      {branding.favicon ? (
        // Sin next/image a propósito: es un archivo de una ruta propia, ya
        // pequeño; pasarlo por el optimizador sería trabajo para no ahorrar.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faviconHref(branding)}
          alt=""
          className="h-full w-full object-contain"
        />
      ) : isBrandName(branding.name) ? (
        <BrandMark className="h-[64%] w-[64%]" green={BRAND_GREEN_ON_TILE} />
      ) : (
        <span className="font-bold leading-none">{faviconInitial(branding.name)}</span>
      )}
    </span>
  );
}

const WORDMARK_SIZE = {
  md: "text-[21px]",
  lg: "text-[30px]",
} as const;

const MARK_SIZE = {
  md: "h-[24px] w-[24px]",
  lg: "h-[34px] w-[34px]",
} as const;

const TILE_SIZE = {
  md: "h-[30px] w-[30px] rounded-[9px] text-[15px]",
  lg: "h-[44px] w-[44px] rounded-[13px] text-[22px]",
} as const;

/**
 * La marca completa: isotipo + wordmark "intosales" en minúsculas, con
 * "into" en el acento y "sales" en el verde de marca. Una instancia rebautizada ve en su
 * lugar el mosaico con la inicial y su nombre (white-label). Con logo subido
 * gana el logo, se llame como se llame: quien sube un archivo quiere verlo.
 */
export function BrandLogo({
  branding,
  size = "md",
  className,
}: {
  branding: BrandingMark;
  size?: keyof typeof WORDMARK_SIZE;
  className?: string;
}) {
  if (isBrandName(branding.name) && !branding.favicon) {
    return (
      <span className={cn("flex items-center gap-2 text-foreground", className)}>
        <BrandMark className={cn("shrink-0 text-brand", MARK_SIZE[size])} />
        <span
          className={cn(
            "font-[700] leading-none tracking-[-0.02em]",
            WORDMARK_SIZE[size]
          )}
        >
          <span className="text-brand-ink">into</span>
          <span style={{ color: BRAND_GREEN }}>sales</span>
        </span>
      </span>
    );
  }
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <BrandTile branding={branding} className={TILE_SIZE[size]} />
      <span
        className={cn(
          "truncate font-[750] leading-none tracking-tight",
          size === "lg" ? "text-[26px]" : "text-[17px]"
        )}
      >
        {branding.name}
      </span>
    </span>
  );
}
