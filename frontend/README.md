# FitCoach

App web para entrenadores personales: gestión de clientes y grupos, rutinas individuales y grupales, seguimiento de progreso con gráficos y control de pagos con alertas de vencimiento.

## Funcionalidades

**Entrenador**
- Alta, baja y reactivación de clientes
- Grupos de entrenamiento con miembros
- Biblioteca propia de ejercicios
- Rutinas para un cliente o para un grupo completo
- Evolución de peso de cada cliente
- Pagos en efectivo o transferencia, con alertas de vencidos y por vencer

**Cliente**
- Ve sus rutinas (individuales y de sus grupos)
- Registra peso, series y comentarios de cada sesión
- Gráfico de su evolución e historial

## Stack

- Frontend: React, Vite, React Router, Recharts
- Backend: Node.js, Express
- Base de datos: PostgreSQL
- Autenticación: JWT y bcrypt

## Decisiones técnicas

- Roles (entrenador y cliente) con middleware de permisos
- Cada consulta filtra por entrenador: nadie ve datos ajenos
- Transacciones al guardar rutinas y sesiones
- Restricciones en la base: una rutina o un pago es de un cliente o de un grupo, nunca de ambos

## Correrlo en local

Requisitos: Node 20 o superior y PostgreSQL.

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

## Capturas

(Agregar acá las capturas guardadas en la carpeta `docs/`)

## Estructura

- `backend/`: API REST (rutas, middleware y esquema SQL)
- `frontend/`: aplicación React
- `docs/`: diseño de referencia y capturas

## Demo online

- App: https://fitcoach-peach-eta.vercel.app

Cuentas de prueba (datos de ejemplo):

| Rol | Email | Contraseña |
| --- | --- | --- |
| Entrenador | enzo@test.com | 123456 |
| Cliente | laura@test.com | 123456 |

La API corre en el plan gratis de Render, que se duerme tras 15 minutos sin uso: la primera carga puede tardar cerca de un minuto.