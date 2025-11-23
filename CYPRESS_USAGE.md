# Guía de Uso: Cypress E2E Tests

## Configuración Inicial

### 1. Crear archivo de credenciales de prueba

Copia el archivo de ejemplo y agrega tus credenciales:

```bash
cp cypress.env.json.example cypress.env.json
```

Edita `cypress.env.json` con tus credenciales de prueba:

```json
{
  "TEST_EMAIL": "tu-email-real@gmail.com",
  "TEST_PASSWORD": "tu-password-real"
}
```

> ⚠️ **Importante:** Este archivo está en `.gitignore` para no exponer tus credenciales.

### 2. Asegúrate de tener el servidor corriendo

```bash
npm run dev
```

El servidor debe estar corriendo en `http://localhost:3000`

## Ejecutar Tests

### Modo Interactivo (recomendado para desarrollo)

```bash
npm run cypress:open
```

Esto abrirá la interfaz de Cypress donde puedes:
- Ver todos los tests disponibles
- Ejecutar tests individuales
- Ver el navegador en tiempo real
- Usar Time Travel Debugging

### Modo Headless (para CI/CD)

```bash
# Todos los tests de accounts
npm run test:e2e

# Con navegador visible
npm run test:e2e:headed

# Todos los tests de Cypress
npm run cypress:run
```

## Estructura de Tests

### `cypress/e2e/accounts.cy.ts`

Tests completos para CRUD de Cuentas:

#### ✅ CREATE (Crear)
- Crear cuenta bancaria en PEN
- Crear cuenta bancaria en USD
- Crear billetera digital
- Crear cuenta de efectivo

#### ✅ READ (Leer)
- Ver lista de cuentas
- Verificar símbolos de moneda

#### ✅ UPDATE (Actualizar)
- Editar nombre de cuenta

#### ✅ DELETE (Eliminar)
- Eliminar cuenta sin transacciones
- Mostrar error con transacciones
- Cancelar eliminación

## Comandos Personalizados

### `cy.login()`
Autenticar usuario automáticamente antes de cada test.

```typescript
cy.login();
```

### `cy.logout()`
Limpiar sesión y datos del navegador.

```typescript
cy.logout();
```

## Tips de Debugging

### Ver el navegador durante los tests

```bash
npm run test:e2e:headed
```

### Pausar en un test específico

Agrega `.only` al test:

```typescript
it.only('Debe crear una cuenta bancaria en PEN', () => {
  // ...
});
```

### Ver valores en la consola

```typescript
cy.get('[class*="Card"]').then($cards => {
  console.log('Número de cuentas:', $cards.length);
});
```

## Solución de Problemas

### Error: "Cannot find module"
```bash
npm install
```

### Tests fallan por timeout
Aumenta el timeout en `cypress.config.ts`:
```typescript
defaultCommandTimeout: 15000,
pageLoadTimeout: 45000,
```

### Login falla
Verifica tus credenciales en `cypress.env.json`

### "Element is detached from DOM"
Agrega `cy.wait(500)` después de operaciones que modifican el DOM

## Próximos Pasos

Una vez que funcionen los tests de Accounts, se pueden crear tests similares para:
- 📊 Transactions (flujo de caja)
- 💳 Debts (deudas)
- 🎯 Goals (metas)
- 📈 Dashboard (resumen)
