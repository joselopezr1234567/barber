# 📅 ProAgenda

Sistema de reservas online para negocios con agenda (barberías, peluquerías, spas, etc.): flujo de agendamiento móvil en 4 pasos para el
cliente y panel de administración desktop/tablet para el local.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** (tema oscuro con acentos dorados para el público, panel claro para admin)
- **Prisma + SQLite** (`prisma/dev.db` en desarrollo, `/app/data/proagenda.db` en producción con disco persistente en Render)

## Cómo correr

```bash
npm install
npm run db:push     # crea/sincroniza la base de datos
npm run db:seed     # datos de ejemplo (opcional, ya ejecutado)
npm run dev         # http://localhost:3000
```

Producción: `npm run build && npm start`.

## Rutas

| Ruta | Descripción |
|---|---|
| `/` | Portada con accesos a reservar y al panel |
| `/reservar` | **Flujo de reserva en 4 pasos** (mobile-first): sucursal → servicio → barbero + hora → datos y confirmación |
| `/reserva/[token]` | Pantalla de confirmación: Google Calendar, archivo `.ics` (Apple Calendar), reprogramar y cancelar |
| `/admin` | **Agenda interactiva**: columnas por barbero, citas por color (Reservado/Atendido/Cancelado/No asistió), bloqueo rápido de tiempo |
| `/admin/horarios` | Configuración de turnos por día y barbero (soporta jornada partida, ej. almuerzo) |
| `/admin/servicios` | Catálogo: crear, editar, pausar/activar servicios con duración y precio |
| `/admin/clientes` | Ficha digital: historial de visitas + notas privadas por barbero |

## Lógica de disponibilidad

- Grilla de slots cada **15 min**; el servicio debe caber completo dentro del turno.
- Los turnos se configuran por día de semana (varios bloques por día = jornada partida).
- Se descuentan automáticamente: reservas activas, bloqueos puntuales (almuerzo/imprevistos)
  y un margen de 30 minutos desde la hora actual.
- Modo **“Cualquier barbero”**: muestra el slot si al menos un barbero está libre y asigna
  uno al confirmar (validando de nuevo en el último momento).
- Reprogramar libera el slot original y revalida disponibilidad antes de mover.

## API

Públicas: `GET /api/public/bootstrap`, `GET /api/public/availability`,
`POST /api/public/bookings`, `GET|POST /api/public/bookings/[token](/cancel|/reschedule|/ics)`.

Admin: `GET /api/admin/agenda`, `PATCH /api/admin/bookings/[id]`,
`GET|POST|PATCH|DELETE /api/admin/services(/id)`, `GET|PUT /api/admin/shifts`,
`GET|POST|DELETE /api/admin/blocks`, `GET /api/admin/clients(/id)`.

## Persistencia en Render (importante)

Para que la base de datos **no se borre** cuando el servicio se reinicia o redeploya:

1. En Render, crea un **Disco persistente** en el servicio web (Render → servicio → Disks → *Add Disk*),
   con **Mount path: `/app/data`**.
2. Verifica que la variable de entorno sea `DATABASE_URL="file:/app/data/proagenda.db"`
   (el Dockerfile ya la define por defecto).
3. El disco persiste entre deploys y reinicios; sin él, SQLite se regenera en cada arranque y pierdes los datos.

## Notas

- Precios en CLP (`$12.000`), horas en hora local (sin zonas horarias).
- Para reiniciar datos: borra `prisma/dev.db`, `npm run db:push && npm run db:seed`.
# barber
