import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Spec 1001: el instalador valida todo antes de tocar el sistema. Estas
// pruebas solo corren la validación (nunca llegan a Docker ni a /opt).
const SCRIPT = "deploy/install.sh";
const run = (...args: string[]) => spawnSync("bash", [SCRIPT, ...args], { encoding: "utf8" });

describe("deploy/install.sh (spec 1001)", () => {
  it("--ayuda explica el uso y sale bien", () => {
    const r = run("--ayuda");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("--dominio");
    expect(r.stdout).toContain("--central");
    expect(r.stdout).toContain("--sin-central");
  });

  it.each([
    [[], "falta --dominio"],
    [["--dominio", "no es dominio"], "dominio inválido"],
    [["--dominio", "crm.cliente.com;rm"], "dominio inválido"],
    [["--dominio", "crm.cliente.com", "--nombre", "Cliente Uno"], "nombre inválido"],
    [["--dominio", "crm.cliente.com", "--central", "api.into.center"], "URL del central inválida"],
    [["--dominio", "crm.cliente.com", "--central"], "--central necesita la URL"],
    [["--dominio", "crm.cliente.com", "--puertos", "80"], "puertos inválidos"],
    [["--dominio", "crm.cliente.com", "--origen", "/no/existe"], "no existe la carpeta"],
    [["--quien-sabe"], "opción desconocida"],
  ])("rechaza %j antes de tocar nada", (args, message) => {
    const r = run(...args);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain(message);
  });

  it("la capa del VPS apaga el Caddy propio y conecta la app a la red compartida", () => {
    const vps = readFileSync("deploy/docker-compose.vps.yml", "utf8");
    expect(vps).toMatch(/caddy:\s*\n\s*profiles:/);
    expect(vps).toContain("name: into_edge");
    expect(vps).toContain("${EDGE_ALIAS");
  });

  it("el compose le pasa INTO_CENTRAL_URL a la app (sin ella el latido no se enciende)", () => {
    expect(readFileSync("docker-compose.yml", "utf8")).toContain("INTO_CENTRAL_URL: ${INTO_CENTRAL_URL:-}");
  });

  // Spec 1006.
  it("logs each site without the webhook token, with a request id, and closes /api/metrics", () => {
    for (const file of ["Caddyfile", "deploy/install.sh"]) {
      const text = readFileSync(file, "utf8");
      expect(text, file).toContain("request>uri regexp");
      expect(text, file).toContain("[redacted]");
      expect(text, file).toContain("request_header X-Request-Id {http.request.uuid}");
      expect(text, file).toContain("respond /api/metrics 404");
    }
  });

  it("rotates the container logs and passes the metrics token to the app", () => {
    const compose = readFileSync("docker-compose.yml", "utf8");
    expect(compose.match(/logging: \*logging/g)).toHaveLength(3);
    expect(compose).toContain("METRICS_TOKEN: ${METRICS_TOKEN:-}");
  });
});
