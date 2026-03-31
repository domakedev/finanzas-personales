# Documentación de Negocio

## ¿Qué es la aplicación?

Finanzas Personales es una herramienta de gestión financiera para usuarios peruanos que quieren tener control sobre su dinero. El usuario puede registrar todo su flujo de dinero, saber cuánto debe, cuánto tiene ahorrado y cómo va su presupuesto mensual, en soles (PEN) y dólares (USD).

---

## Entidades del dominio

### Cuenta
Representa un lugar donde el usuario guarda dinero.

- **Banco:** cuenta de ahorros o corriente (BCP, Interbank, BBVA, etc.)
- **Billetera digital:** Yape, Plin, etc.
- **Efectivo:** dinero en mano

Cada cuenta tiene moneda (PEN o USD) y saldo, que se actualiza automáticamente con cada transacción.

---

### Transacción
Movimiento de dinero registrado por el usuario. Es el núcleo del sistema.

| Tipo | Descripción |
|---|---|
| `INCOME` | Ingreso de dinero a una cuenta |
| `EXPENSE` | Gasto desde una cuenta |
| `TRANSFER` | Movimiento de dinero entre dos cuentas propias |
| `PAY_DEBT` | Pago de una deuda o tarjeta de crédito |
| `PAY_CREDIT_CARD` | Pago específico a tarjeta de crédito |
| `SAVE_FOR_GOAL` | Aporte a una meta de ahorro |
| `RECEIVE_DEBT_PAYMENT` | Cobro de dinero prestado a un tercero |

Las transacciones pueden tener categoría, descripción y fecha. Las transferencias entre cuentas de distinta moneda requieren ingresar el tipo de cambio.

---

### Deuda
Registra obligaciones financieras del usuario. Hay tres variantes:

1. **Deuda común:** cualquier deuda con monto total, pagos registrados y fecha de vencimiento.
2. **Tarjeta de crédito:** incluye fecha de corte, fecha de pago, límite de crédito, pago mínimo y últimos 4 dígitos.
3. **Préstamo realizado ("Me deben"):** dinero que el usuario prestó a un tercero y espera cobrar.

---

### Meta de ahorro
Objetivo financiero con monto objetivo, monto actual y fecha límite opcional. El progreso avanza al registrar transacciones de tipo `SAVE_FOR_GOAL` hacia esa meta.

---

### Presupuesto
Configuración mensual de límites de gasto por categoría. El sistema calcula el porcentaje de presupuesto consumido y lo muestra en el dashboard.

- **Sano:** 0–80% del presupuesto usado
- **En alerta:** 80–100%
- **Excedido:** más del 100%

---

### Categoría
Etiqueta que clasifica ingresos y gastos. Existen categorías del sistema (predefinidas) y categorías personalizadas por usuario.

Categorías de gasto del sistema: Alimentación, Transporte, Entretenimiento, Salud, Educación, Compras, Servicios, Vivienda, Inversión, Regalo, Otros.

Categorías de ingreso del sistema: Sueldo, otros.

---

## Flujos principales

### Flujo de autenticación
1. El usuario entra a la app y es redirigido al login.
2. Hace clic en "Continuar con Google".
3. Firebase autentica al usuario con su cuenta de Google.
4. La app carga todos sus datos desde Firestore.
5. El usuario llega al dashboard.

---

### Flujo de ingreso/gasto
1. El usuario va a **Transacciones** y hace clic en "Nueva transacción".
2. Selecciona tipo (`INCOME` o `EXPENSE`), cuenta, monto, categoría y descripción.
3. Al guardar, el saldo de la cuenta se actualiza automáticamente.
4. La transacción aparece en el historial y afecta el dashboard.

---

### Flujo de transferencia entre cuentas
1. El usuario crea una transacción de tipo `TRANSFER`.
2. Selecciona cuenta origen y cuenta destino.
3. Si las cuentas tienen distinta moneda, ingresa el tipo de cambio.
4. Al guardar, la cuenta origen descuenta el monto y la cuenta destino lo acredita (convirtiendo si aplica).

---

### Flujo de pago de deuda
1. El usuario va a **Deudas** y selecciona una deuda.
2. Hace clic en "Pagar" e ingresa el monto y la cuenta desde la que paga.
3. Se crea una transacción de tipo `PAY_DEBT` o `PAY_CREDIT_CARD`.
4. El saldo de la cuenta origen disminuye y el monto pagado de la deuda aumenta.

---

### Flujo de meta de ahorro
1. El usuario crea una meta en **Metas** con nombre, monto objetivo y fecha límite.
2. Al registrar transacciones de tipo `SAVE_FOR_GOAL` asociadas a esa meta, el progreso avanza.
3. En el dashboard y en la sección de metas se muestra el porcentaje alcanzado.

---

### Flujo de presupuesto mensual
1. El usuario configura límites por categoría en **Presupuestos**.
2. Al registrar gastos en esas categorías, el sistema calcula cuánto del límite se ha consumido.
3. El dashboard muestra el estado general de salud del presupuesto del mes.

---

## Reglas de negocio importantes

- Cada usuario solo ve y modifica sus propios datos (aislamiento por `userId`).
- Al eliminar una transacción, todos sus efectos sobre saldos, deudas y metas se revierten automáticamente (eliminación atómica).
- El saldo de una cuenta no puede quedar negativo por configuración de UI, aunque la base de datos no lo impide.
- El patrimonio neto del dashboard se calcula como: `Activos (cuentas) - Pasivos (deudas pendientes)`.
- El flujo de caja mensual muestra ingresos vs gastos del mes en curso.
- Las monedas soportadas son únicamente PEN y USD.
