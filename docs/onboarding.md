# Onboarding para desarrolladores

Guía para poner en marcha el proyecto desde cero y entender cómo está organizado.

---

## 1. Requisitos previos

- **Node.js** v18 o superior
- **npm** v9 o superior
- Una cuenta de **Google** para crear el proyecto en Firebase
- Acceso al repositorio

---

## 2. Configurar Firebase

El proyecto usa Firebase como backend. Necesitás crear tu propio proyecto:

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Crear un nuevo proyecto
3. Habilitar **Authentication** → Proveedores → **Google**
4. Habilitar **Firestore Database** en modo producción
5. En Configuración del proyecto → Tus apps → Agregar app web
6. Copiar las credenciales que te da Firebase

---

## 3. Variables de entorno

En la raíz del proyecto, crear el archivo `.env.local` (existe `env.example` como referencia):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Pegar los valores copiados de Firebase en cada campo.

---

## 4. Reglas de Firestore

Las reglas de seguridad están en `firestore.rules`. Para aplicarlas:

1. Instalar Firebase CLI si no lo tenés: `npm install -g firebase-tools`
2. Autenticarse: `firebase login`
3. Inicializar el proyecto: `firebase init firestore` (seleccionar el proyecto creado)
4. Desplegar las reglas: `firebase deploy --only firestore:rules`

Alternativamente, las podés copiar y pegar manualmente desde la consola de Firebase → Firestore → Reglas.

---

## 5. Instalar dependencias y levantar

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000). Si las variables de entorno están correctas, debería aparecer la pantalla de login.

---

## 6. Primer login

1. Hacer clic en "Continuar con Google"
2. Autorizar con tu cuenta de Google
3. La app crea automáticamente la sesión y carga los datos (vacíos al inicio)
4. Llegás al dashboard — desde ahí podés empezar a crear cuentas y transacciones

---

## 7. Estructura del código que necesitás conocer primero

| Archivo | Por qué es importante |
|---|---|
| [src/lib/db.ts](../src/lib/db.ts) | Toda la capa de acceso a datos. Si algo falla con Firestore, acá se investiga |
| [src/lib/store.ts](../src/lib/store.ts) | Estado global. Si un dato no aparece en pantalla, acá se revisa |
| [src/lib/auth.tsx](../src/lib/auth.tsx) | Contexto de autenticación. Punto de entrada para entender el ciclo de sesión |
| [src/types/index.ts](../src/types/index.ts) | Interfaces de todas las entidades del dominio |
| [src/lib/schemas.ts](../src/lib/schemas.ts) | Validaciones Zod de formularios |
| [src/components/DataLoader.tsx](../src/components/DataLoader.tsx) | Carga inicial de datos al autenticarse |

---

## 8. Cómo se agregan nuevas funcionalidades (patrón del proyecto)

El patrón que sigue el proyecto para cualquier entidad nueva es consistente:

1. **Tipo:** Agregar la interfaz en `src/types/index.ts`
2. **DB:** Agregar las funciones CRUD en `src/lib/db.ts`
3. **Store:** Agregar el slice de estado en `src/lib/store.ts`
4. **Schema:** Agregar la validación Zod en `src/lib/schemas.ts`
5. **Componente de carga:** Actualizar `src/components/DataLoader.tsx` para cargar los datos al iniciar
6. **Formulario:** Crear el formulario en `src/components/forms/`
7. **Página:** Crear la página en `src/app/<nombre>/page.tsx`
8. **Navegación:** Agregar el link en `src/components/Layout.tsx`

---

## 9. Comandos útiles del día a día

```bash
npm run dev                   # Servidor de desarrollo
npm run lint                  # Ver errores de TypeScript/ESLint
npm run build                 # Verificar que compila para producción
npm run cypress:open          # Tests E2E con interfaz visual
npm run test:e2e              # Tests E2E headless (todos)
```

---

## 10. Cosas a tener en cuenta

- **No hay backend propio.** Toda la lógica está en el cliente. Los datos van directo a Firestore.
- **El estado en Zustand se carga una sola vez** al iniciar sesión y se mantiene sincronizado manualmente con cada operación.
- **La eliminación de transacciones es atómica** — al borrar una transacción, se revierten sus efectos en saldos, deudas y metas. Esto está implementado en `deleteTransactionAtomic` en `lib/db.ts`.
- **Multi-moneda:** las transferencias entre cuentas de distinta moneda requieren tipo de cambio. Los montos se guardan en la moneda de cada cuenta.
- **Todo el texto de la UI está en español (es-PE)** — no hay i18n, no se necesita.
