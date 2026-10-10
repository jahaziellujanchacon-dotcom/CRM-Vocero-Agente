import { isBrandName } from "@/lib/brand";
import { DEFAULT_BRANDING } from "@/lib/branding";
import { getBranding } from "@/server/branding";
import { BrandLogo } from "@/components/brand-mark";

/**
 * Pantalla de entrada: papel frío, rejilla difuminada y dos resplandores
 * (azul y verde de into) detrás del formulario. Con la marca IntoSales se
 * remata con el lema de into; una instancia white-label ve su nombre y una
 * descripción neutra.
 */
export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const branding = await getBranding().catch(() => DEFAULT_BRANDING);
  const marca = isBrandName(branding.name);
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-subtle p-4">
      <div className="brand-grid absolute inset-0" aria-hidden />
      <div className="brand-glow brand-glow-a" aria-hidden />
      <div className="brand-glow brand-glow-b" aria-hidden />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <BrandLogo branding={branding} size="lg" />
          {marca ? (
            <h1 className="text-[24px] font-bold leading-tight tracking-[-0.03em]">
              Programamos{" "}
              <span
                className="bg-clip-text font-serif text-[1.18em] font-normal italic tracking-[-0.01em] text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(92deg, var(--accent) 12%, #33b44a 88%)",
                }}
              >
                tu éxito.
              </span>
            </h1>
          ) : (
            <div>
              <h1 className="sr-only">{branding.name}</h1>
              <p className="text-sm text-text-3">CRM de WhatsApp con agente de IA</p>
            </div>
          )}
        </div>
        {children}
      </div>
    </main>
  );
}
