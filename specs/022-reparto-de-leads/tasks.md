# Tasks — 022 Reparto de leads

## Datos

- [x] T001 Columnas `assigned_user_id` y `assigned_at` en `lead`, tablas `lead_routing` y `lead_routing_member` en `schema.ts`, prefijo `lrm_`
- [x] T002 `pnpm db:generate` → `0017_lead_assignment`
- [x] T003 Migrar una base vacía
- [ ] T003b Migrar una base con datos en `0016` (la tuya local, al revisar)

## Servidor

- [x] T004 `leads/round-robin.ts`: elegir el siguiente vendedor (puro)
- [x] T005 `leads/routing.ts`: tomar el turno con bloqueo; leer y guardar la configuración
- [x] T006 `leads/scope.ts`: alcance por rol, condición SQL y comprobaciones de lead, contacto, conversación y adjunto
- [x] T007 `createLeadForContact` asigna al crear; la captura manual del vendedor se asigna a sí mismo
- [x] T008 Bandeja: lista, detalle, mensajes, adjuntos y plantillas filtrados
- [x] T009 Contactos: lista, detalle, edición e iniciar conversación filtrados
- [x] T010 Pipeline: tablero filtrado con `assignee`, `team` y `canAssign`; `assignedUserId` en el PATCH
- [x] T011 SSE filtrado por suscriptor vendedor
- [x] T012 `GET/PUT /api/settings/lead-routing`

## UI

- [x] T013 Tarjeta del Pipeline con las iniciales del vendedor o «Sin asignar»
- [x] T014 Cajón del trato: vendedor asignado y selector para supervisores
- [x] T015 Ajustes → Equipo: sección «Reparto de leads»

## Pruebas y documentación

- [x] T016 Unitarias del turno y del alcance
- [x] T017 Guion `tests/e2e/us-reparto-de-leads.md`
- [x] T018 `specs/README.md`, `CHANGELOG.md`
- [x] T019 Gate técnico: typecheck, lint, test, build

## Verificación (2026-10-10, local, Postgres 16 en Docker, build de producción)

- Gate técnico: `pnpm typecheck`, `pnpm lint`, `pnpm test` (1006) y `pnpm build`.
- Migración `0017` aplicada sobre una base vacía aparte.
- `scripts/e2e-lead-routing.mjs` contra esa base: 30 comprobaciones en verde.
- Pendiente a mano: Bandeja y SSE con WhatsApp de pruebas (ver el guion).
