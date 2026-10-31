# FitCoach

App web para entrenadores personales: clientes y grupos, rutinas individuales y grupales con bloques, seguimiento de progreso con gráficos, calendario de citas, mensajes y control de pagos con alertas de vencimiento.

## Demo online

- App: https://fitcoach-peach-eta.vercel.app

Cuentas de prueba (datos de ejemplo, todas con la contraseña `demo1234`):

| Rol | Email |
| --- | --- |
| Entrenador | entrenador@demo.com |
| Cliente | laura@demo.com |

La demo es pública y cualquiera puede modificar sus datos. La API corre en el plan gratis de Render, que se duerme tras 15 minutos sin uso: la primera carga puede tardar cerca de un minuto.

## Capturas

### Panel del entrenador
![Panel de inicio](docs/panel-inicio.png)

### Rutinas con biseries, triseries y circuitos
![Rutinas](docs/rutinas.png)

### Calendario de citas
![Calendario](docs/calendario.png)

### Progreso de los clientes
![Progreso](docs/progreso.png)

### Mensajes
![Mensajes](docs/mensajes.png)

### Versión celular
![Vista de celular](docs/celular.png)

## Funcionalidades

**Entrenador**
- Alta, baja, reactivación y eliminación de clientes, con avatar
- Grupos de entrenamiento con miembros
- Biblioteca propia de ejercicios, con video por link o subido
- Rutinas para un cliente o para un grupo, con ejercicios sueltos, biseries, triseries y circuitos, descanso por bloque y duración
- Historial de rutinas: al vencer o renovar, quedan archivadas y el progreso se conserva
- Calendario de citas, con aviso de choques de horario
- Mensajes con cada cliente y contador de no leídos
- Progreso general (adherencia y avance promedio) y detalle por cliente
- Pagos en efectivo o transferencia, con alertas de vencidos y por vencer
- Notificaciones de pagos, rutinas por vencer y mensajes

**Cliente**
- Sus rutinas vigentes e historial, con video de cada ejercicio
- Registro de peso, series y comentarios de cada sesión
- Cronómetro de descanso con aviso sonoro
- Sus citas, mensajes con su entrenador y gráfico de evolución
- Cambio de contraseña

## Stack

- Frontend: React, Vite, React Router, Recharts, CSS propio
- Backend: Node.js, Express
- Base de datos: PostgreSQL
- Archivos (fotos y videos): Cloudinary, con subida firmada desde el backend
- Autenticación: JWT y bcrypt
- Despliegue: Vercel (frontend), Render (API) y Neon (base de datos)

## Decisiones técnicas

- Roles (entrenador y cliente) con middleware de permisos, y un cliente dado de baja pierde el acceso en su próximo pedido
- Cada consulta filtra por entrenador: nadie ve datos ajenos
- Transacciones al guardar rutinas y sesiones
- Restricciones en la base: una rutina, un pago o una cita es de un cliente o de un grupo, nunca de ambos
- Una rutina con registros de progreso no se puede borrar, solo archivar
- Fechas y horarios en hora de Argentina, calculados en el backend sin depender de la zona del servidor
- La subida de archivos va firmada por el backend, con límite por entrenador, y solo se aceptan URLs de la propia cuenta de Cloudinary
- Contenido de los mensajes siempre como texto, nunca como HTML

## Correrlo en local

Requisitos: Node 20 o superior, PostgreSQL y (opcional, para subir fotos y videos) una cuenta gratis de Cloudinary.

1. Crear la base y las tablas:

```
createdb fitcoach
psql -d fitcoach -f backend/db/schema.sql
```

2. Backend:

```
cd backend
cp .env.example .env   # completar con tus datos
npm install
npm run dev
```

3. Frontend (en otra terminal):

```
cd frontend
cp .env.example .env
npm install
npm run dev
```

Abrir http://localhost:5173

## Estructura

- `backend/`: API REST (rutas, middleware y esquema SQL)
- `frontend/`: aplicación React
- `docs/`: capturas y diseño de referencia