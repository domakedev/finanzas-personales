# Documentación Técnica

## Arquitectura general

La aplicación es un **cliente Next.js** que se comunica directamente con **Firebase**. No hay un backend propio ni API REST — toda la lógica de acceso a datos vive en el cliente, protegida por las reglas de seguridad de Firestore.

```
Browser (Next.js)
    ├── Zustand (estado global en memoria)
    ├── Firebase Auth (sesión del usuario)
    └── Firebase Firestore (base de datos)
```

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js | 16 |
| UI | React | 19 |
| Lenguaje | TypeScript | 5 |
| Estilos | Tailwind CSS | 4 |
| Estado | Zustand | 5 |
| Formularios | React Hook Form + Zod | 7 / 4 |
| Base de datos | Firebase Firestore | — |
| Autenticación | Firebase Auth (Google OAuth) | — |
| Tests E2E | Cypress | 15 |

---

## Estructura de carpetas

```
src/
├── app/                  # Páginas (Next.js App Router)
│   ├── page.tsx          # Landing
│   ├── login/            # Pantalla de login
│   ├── dashboard/        # Dashboard principal
│   ├── transactions/     # Historial de transacciones
│   ├── accounts/         # Gestión de cuentas
│   ├── debts/            # Deudas y tarjetas
│   ├── goals/            # Metas de ahorro
│   ├── budgets/          # Presupuesto mensual
│   ├── categories/       # Categorías
│   └── layout.tsx        # Layout raíz con providers
│
├── lib/
│   ├── firebase.ts       # Inicialización de Firebase
│   ├── auth.tsx          # Contexto de autenticación (useAuth)
│   ├── store.ts          # Zustand store (AppState)
│   ├── db.ts             # Todas las operaciones CRUD a Firestore
│   ├── schemas.ts        # Esquemas Zod de validación
│   ├── utils.ts          # Funciones utilitarias
│   └── useLoadData.ts    # Hook de carga inicial de datos
│
├── components/
│   ├── Layout.tsx         # Wrapper con navegación
│   ├── DataLoader.tsx     # Carga los datos del usuario al inicio
│   ├── SavingsTree.tsx    # Visualización animada de metas
│   ├── dashboard/         # Componentes del dashboard
│   ├── forms/             # Formularios de cada entidad
│   └── ui/                # Componentes UI reutilizables
│
├── types/
│   └── index.ts           # Interfaces TypeScript de todas las entidades
│
└── constants/
    └── categories.ts      # Categorías del sistema, bancos y billeteras
```

---

## Modelos de datos (Firestore)

Cada colección en Firestore está particionada por `userId`. Todas las operaciones de lectura y escritura filtran por este campo.

### `accounts`
```typescript
interface Account {
  id: string;
  name: string;
  type: 'BANK' | 'WALLET' | 'CASH';
  currency: 'PEN' | 'USD';
  balance: number;
  logo?: string;       // URL del logo del banco/billetera
  icon?: string;
  userId: string;
}
```

### `transactions`
```typescript
interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: Date;
  createdAt: Date;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'PAY_DEBT'
      | 'SAVE_FOR_GOAL' | 'PAY_CREDIT_CARD' | 'RECEIVE_DEBT_PAYMENT';
  categoryId?: string;
  accountId: string;
  fromAccountId?: string;   // Transferencias: cuenta origen
  debtId?: string;          // Pago de deuda/tarjeta
  goalId?: string;          // Aporte a meta
  exchangeRate?: number;    // Tipo de cambio para transferencias multi-moneda
  convertedAmount?: number;
  fromCurrency?: string;
  toCurrency?: string;
  userId: string;
}
```

### `debts`
```typescript
interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  paidAmount?: number;
  currency: 'PEN' | 'USD';
  dueDate?: Date;
  isLent?: boolean;           // true = "me deben"
  isCreditCard?: boolean;
  paymentDate?: number;       // Día del mes (1-31)
  cutoffDate?: number;        // Día de corte (tarjeta)
  creditLimit?: number;
  minimumPayment?: number;
  totalPayment?: number;
  lastFourDigits?: string;
  logo?: string;
  userId: string;
}
```

### `goals`
```typescript
interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: 'PEN' | 'USD';
  deadline?: Date;
  userId: string;
}
```

### `budgets`
```typescript
interface Budget {
  id?: string;
  userId: string;
  month: number;    // 0-11
  year: number;
  totalIncome: number;
  categoryLimits: Record<string, number>;  // categoryId -> monto límite
}
```

### `categories`
```typescript
interface Category {
  id: string;
  name: string;
  icon: string;      // Emoji
  type: 'EXPENSE' | 'INCOME';
  isSystem?: boolean;
  userId?: string;   // null para categorías del sistema
}
```

---

## Capa de datos (`lib/db.ts`)

Todas las operaciones a Firestore pasan por este archivo. No hay llamadas directas al SDK de Firebase fuera de él.

| Función | Descripción |
|---|---|
| `getAccounts(userId)` | Lee todas las cuentas del usuario |
| `addAccount(userId, data)` | Crea una cuenta |
| `updateAccount(id, data)` | Actualiza campos de una cuenta |
| `deleteAccount(id)` | Elimina una cuenta |
| `getTransactions(userId)` | Lee todas las transacciones (ordenadas por `createdAt` desc) |
| `addTransaction(userId, data)` | Crea una transacción y actualiza saldos |
| `updateTransaction(id, data)` | Actualiza una transacción |
| `deleteTransactionAtomic(id)` | Elimina y revierte todos los efectos en saldos/metas/deudas |
| `getDebts(userId)` | Lee todas las deudas |
| `addDebt / updateDebt / deleteDebt` | CRUD de deudas |
| `getGoals(userId)` | Lee todas las metas |
| `addGoal / updateGoal / deleteGoal` | CRUD de metas |
| `getBudget(userId, month, year)` | Lee el presupuesto del mes |
| `saveBudget(userId, budget)` | Crea o actualiza el presupuesto (upsert) |
| `getCategories(userId)` | Lee categorías del sistema + personalizadas |
| `addCategory / updateCategory / deleteCategory` | CRUD de categorías |

---

## Estado global (`lib/store.ts`)

Zustand gestiona el estado en memoria de la aplicación. Los datos se cargan una vez al iniciar sesión mediante `DataLoader` y se actualizan en el store con cada operación CRUD.

```typescript
interface AppState {
  user: User | null;
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  goals: Goal[];
  budget: Budget | null;
  categories: Category[];
  // Setters y acciones...
}
```

---

## Autenticación

- Proveedor: **Google OAuth 2.0** via Firebase Auth
- El contexto `AuthProvider` (en `lib/auth.tsx`) escucha `onAuthStateChanged` y sincroniza el usuario con el store de Zustand.
- Las rutas protegidas redirigen a `/login` si no hay sesión activa.

---

## Seguridad (Firestore Rules)

Las reglas en `firestore.rules` implementan:
- Acceso autenticado obligatorio (`request.auth != null`)
- Propiedad por usuario: solo el dueño puede leer/escribir sus documentos (`request.auth.uid == resource.data.userId`)
- No existe acceso público a ninguna colección

---

## Validaciones

Los formularios usan **Zod** para validación de esquemas. Todos los mensajes de error están en español. Los esquemas están centralizados en `lib/schemas.ts`.

---

## Tests E2E

Los tests están en `cypress/e2e/` y cubren los flujos principales:

| Archivo | Qué prueba |
|---|---|
| `accounts.cy.ts` | Crear, editar y eliminar cuentas |
| `transactions.cy.ts` | Registrar y eliminar transacciones |
| `debts.cy.ts` | Gestión de deudas |
| `goals.cy.ts` | Metas de ahorro |

Comandos:
```bash
npm run cypress:open         # UI interactiva
npm run test:e2e             # Headless (todos)
npm run test:e2e:accounts    # Solo cuentas
```
