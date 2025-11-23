# Configuración de Usuario de Prueba para Cypress

## Problema

Tu app usa **Google OAuth** para autenticación, pero Cypress no puede interactuar con popups de OAuth de Google. 

## Solución

Crear un **usuario de prueba con email/password** solo para testing, que se autenticará programáticamente.

## Pasos

### 1. Crear Usuario de Prueba en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. En el menú lateral: **Authentication** → **Users**
4. Click en **Add User**
5. Ingresa:
   - **Email:** `test@example.com` (o el que prefieras)
   - **Password:** `test123456` (o el que prefieras)
6. Click en **Add User**

### 2. Habilitar Email/Password Provider (si no está habilitado)

1. En Firebase Console → **Authentication** → **Sign-in method**
2. Busca **Email/Password**
3. Click en **Enable** si no está habilitado
4. Guarda los cambios

### 3. Obtener Firebase API Key

Tu API Key está en tu código fuente, en el archivo de configuración de Firebase.

Busca en `src/lib/firebase.ts` (o donde tengas la config):

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXX", // ← Esta es tu API Key
  // ...
};
```

### 4. Configurar Cypress

Crea el archivo `cypress.env.json` con:

```json
{
  "TEST_EMAIL": "test@example.com",
  "TEST_PASSWORD": "test123456",
  "FIREBASE_API_KEY": "TU_API_KEY_DE_FIREBASE",
  "FIREBASE_PROJECT_ID": "tu-project-id"
}
```

### 5. Probar el Login

```bash
npm run cypress:open
```

Abre el test de `accounts.cy.ts` y verifica que el login funcione.

## Cómo Funciona

El comando `cy.login()` ahora:

1. ✅ Llama a la Firebase REST API para autenticar
2. ✅ Obtiene el token de autenticación
3. ✅ Lo guarda en `localStorage` en el formato que Firebase espera
4. ✅ Navega al dashboard
5. ✅ Firebase reconoce la sesión automáticamente

**NO** intenta abrir el popup de Google OAuth (que Cypress no puede manejar).

## Seguridad

- ✅ El archivo `cypress.env.json` está en `.gitignore`
- ✅ Las credenciales NO se commitean al repositorio
- ✅ El usuario de prueba solo tiene acceso a datos de testing
- ⚠️ Usa un email/password diferente al de producción

## Troubleshooting

### Error: "Invalid email or password"
- Verifica que creaste el usuario en Firebase Console
- Verifica que el email/password en `cypress.env.json` coincidan

### Error: "INVALID_API_KEY"
- Verifica que copiaste correctamente el API Key de `firebase.ts`

### El login funciona pero no carga datos
- Asegúrate de que el usuario de prueba tenga datos en Firestore
- Verifica las reglas de seguridad de Firestore

### "Cannot read property 'uid' of null"
- Aumenta el `cy.wait()` después del login a 3000ms
- Firebase puede tardar en reconocer la sesión
