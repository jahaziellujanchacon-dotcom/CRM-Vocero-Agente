# Probar IntoSales en tu computadora con WhatsApp real (túnel de Cloudflare)

Meta solo entrega los mensajes de WhatsApp a una dirección pública con HTTPS.
Un túnel de Cloudflare le da esa dirección a tu `pnpm dev` sin abrir puertos
ni contratar un servidor. Con eso pruebas todo: la Bandeja, el Pipeline y el
agente de IA contestando de verdad.

Necesitas tu computadora encendida y `pnpm dev` corriendo mientras pruebas: si
se apaga, Meta reintenta un rato y después descarta los mensajes.

## Túnel rápido o túnel con nombre

| | Túnel rápido | Túnel con nombre |
|---|---|---|
| Cuenta de Cloudflare | No hace falta | Sí, gratis |
| Dominio | No | Sí, en Cloudflare (por ejemplo `into.center`) |
| Dirección | Cambia cada vez que lo reinicias (`https://xxxx.trycloudflare.com`) | Fija (por ejemplo `https://dev.into.center`) |
| Cuándo usarlo | Para probar hoy | Para probar seguido sin reconfigurar Meta |

Empieza con el rápido. Cuando tengas el dominio, pasa al de nombre (sección
final).

## Antes de empezar

- **App de Meta con WhatsApp** en [developers.facebook.com](https://developers.facebook.com).
  Meta te da un número de prueba gratis. Con él solo puedes escribir a los
  números que agregues como destinatarios en *WhatsApp → API Setup* (hasta 5):
  agrega el tuyo.
- **Datos del número** (en *WhatsApp → API Setup*): el **Phone Number ID**, el
  **WhatsApp Business Account ID** (WABA ID) y un **token**. El token
  temporal dura 24 horas; para no renovarlo cada día, crea un usuario del
  sistema con un token permanente (README → «Modo directo»).
- **App Secret** (opcional, recomendado): *Configuración de la app → Básica*.
- **Llave de un proveedor de IA** compatible con OpenRouter, para el agente.
  Lo que gaste el agente se paga a ese proveedor, uses túnel o no.

## 1. Instala cloudflared

En macOS:

```bash
brew install cloudflared
```

En otros sistemas: [descargas de cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).

## 2. Levanta el túnel hacia el puerto 3000

```bash
cloudflared tunnel --url http://localhost:3000
```

Entre lo que imprime aparece una línea con tu dirección, por ejemplo
`https://palabras-al-azar.trycloudflare.com`. Deja esa terminal abierta: si la
cierras, el túnel se cae.

## 3. Ajusta el `.env`

La app arma la URL del webhook y el inicio de sesión con `APP_BASE_URL`, así
que tiene que ser la dirección del túnel:

```bash
APP_BASE_URL=https://palabras-al-azar.trycloudflare.com
META_WEBHOOK_VERIFY_TOKEN=un-texto-largo-y-dificil-de-adivinar
META_APP_SECRET=el-app-secret-de-tu-app
```

- `META_WEBHOOK_VERIFY_TOKEN` es la contraseña del webhook: va dentro de la
  URL y Meta la manda en la verificación. Si `pnpm init-env` ya te generó
  una, déjala.
- Con `META_APP_SECRET`, la app rechaza cualquier mensaje que no venga firmado
  por tu app de Meta. Con la URL pública, conviene ponerlo.
- No actives los simuladores (`WA_MOCK_ENABLED=true`) mientras el túnel esté
  abierto.

Reinicia `pnpm dev` para que tome los cambios (corta con Ctrl+C y vuelve a
correrlo).

## 4. Entra a la app por la dirección del túnel

Abre `https://palabras-al-azar.trycloudflare.com` en el navegador e inicia
sesión ahí, no en `localhost:3000`: la sesión queda atada a `APP_BASE_URL`.

## 5. Conecta el número

En **Configuración → WhatsApp**: pega el WABA ID, el Phone Number ID y el
token → **Probar conexión** → **Guardar**.

Al guardar, IntoSales registra el webhook en Meta por ti y te lo confirma en
pantalla. Si Meta lo rechaza:

1. Pulsa **«Registrar en Meta»** en la tarjeta del webhook para reintentar.
2. Si sigue fallando, hazlo a mano en Meta: *WhatsApp → Configuration →
   Webhook → Edit*. Pega la **URL del webhook** y el **verify token** que te
   muestra esa misma tarjeta (botones de copiar) y pulsa *Verify and save*.
3. En *Webhook fields*, suscribe **`messages`** y, si usarás plantillas,
   **`message_template_status_update`**.

La URL tiene esta forma:
`https://palabras-al-azar.trycloudflare.com/api/webhooks/wa/<tu verify token>`.

## 6. Prueba que llegan los mensajes

Desde tu celular (el que agregaste como destinatario), escríbele al número de
prueba. En segundos el mensaje aparece en la **Bandeja** y se crea su lead en
el **Pipeline**. Contesta desde la Bandeja y te llega al celular.

## 7. Prueba el agente de IA de punta a punta

1. **Configuración → IA**: elige el proveedor, el modelo, pega la llave y
   pulsa **Probar conexión**.
2. **Agente**: revisa el perfil y el conocimiento. Para partir de un rubro,
   carga sus ejemplos (por ejemplo `pnpm seed:fashion`).
3. **Laboratorio**: corre una prueba. Clientes simulados conversan con el
   agente sin tocar WhatsApp; así ves cómo responde antes de encenderlo.
4. **Agente**: enciende el interruptor.
5. Escribe otra vez desde tu celular, como si fueras un cliente. El agente
   contesta por WhatsApp y la respuesta aparece en la Bandeja marcada como de
   la IA.
6. Prueba el pase a una persona: pide «quiero hablar con un humano». La
   conversación pasa a atención humana y el agente deja de contestar en ella.

Si el agente no contesta, la tarjeta **«Quién responde»** de la pantalla
Agente dice qué falta (llave de IA, interruptor o número).

## Cuando la dirección del túnel cambia

El túnel rápido estrena dirección cada vez que lo reinicias. Entonces:

1. Copia la nueva dirección en `APP_BASE_URL` y reinicia `pnpm dev`.
2. Entra por la nueva dirección.
3. **Configuración → WhatsApp → «Registrar en Meta»**, para que Meta mande los
   mensajes a la dirección nueva.

## Túnel con nombre (dirección fija)

Necesitas el dominio agregado a tu cuenta de Cloudflare (por ejemplo
`into.center`, con sus DNS en Cloudflare).

```bash
cloudflared tunnel login
```

```bash
cloudflared tunnel create intosales-dev
```

```bash
cloudflared tunnel route dns intosales-dev dev.into.center
```

```bash
cloudflared tunnel run --url http://localhost:3000 intosales-dev
```

Luego, en `.env`, `APP_BASE_URL=https://dev.into.center`, reinicia
`pnpm dev` y registra el webhook una vez (paso 5). Desde ahí, cada vez que
quieras probar solo corres `pnpm dev` y el último comando.

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| Meta dice que no pudo verificar el webhook | La URL o el verify token no coinciden con los de la tarjeta del webhook, o `pnpm dev` / el túnel no están corriendo. |
| No puedes iniciar sesión por el túnel | `APP_BASE_URL` no es exactamente la dirección del túnel, o no reiniciaste `pnpm dev`. |
| La página carga sin estilos o sin reaccionar | Reinicia `pnpm dev` después de cambiar `APP_BASE_URL`: la app solo acepta como origen de desarrollo la dirección que tiene ahí. |
| Los mensajes no llegan a la Bandeja | El túnel cambió de dirección (ver arriba), el campo `messages` no está suscrito, o tu número no está como destinatario del número de prueba. |
| Llegan pero la app responde 401 en la terminal | `META_APP_SECRET` no es el de esta app de Meta. |
| El agente no contesta | Mira la tarjeta «Quién responde» en Agente. |
