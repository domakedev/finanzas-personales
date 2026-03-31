# Finanzas Personales

Aplicación web para la gestión de finanzas personales, orientada al mercado peruano. Permite administrar cuentas, ingresos, gastos, deudas, metas de ahorro y presupuestos mensuales en soles (PEN) y dólares (USD).

## Stack

- **Frontend:** Next.js 16 + React 19 + TypeScript
- **Estilos:** Tailwind CSS 4
- **Base de datos:** Firebase Firestore
- **Autenticación:** Firebase Auth (Google OAuth)
- **Estado:** Zustand

## Módulos principales

| Módulo | Descripción |
|---|---|
| Dashboard | Patrimonio neto, flujo de caja, salud del presupuesto y resumen general |
| Cuentas | Bancos, billeteras digitales (Yape/Plin) y efectivo |
| Transacciones | Ingresos, gastos, transferencias, pagos y cobros |
| Deudas | Deudas comunes, tarjetas de crédito y préstamos realizados |
| Metas | Metas de ahorro con seguimiento de progreso |
| Presupuestos | Límites por categoría de gasto |
| Categorías | Categorías predefinidas y personalizadas |

## Requisitos previos

- Node.js v18+
- Proyecto en Firebase con Firestore y Authentication habilitados

## Configuración

Crea un archivo `.env.local` en la raíz con las variables de tu proyecto Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Ver `env.example` como referencia.

## Levantar el proyecto

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## Otros comandos

```bash
npm run build          # Build de producción
npm run lint           # Linting
npm run cypress:open   # Abrir Cypress (tests E2E)
npm run test:e2e       # Ejecutar todos los tests E2E headless
```

## Documentación

- [Negocio](docs/negocio.md) — Flujos, reglas y lógica del dominio
- [Técnico](docs/tecnico.md) — Arquitectura, modelos y estructura del código
- [Onboarding](docs/onboarding.md) — Guía para nuevos desarrolladores
