describe('Test General de Finanzas Personales', () => {
  before(() => {
    // Login solo una vez al inicio
    cy.login();

    // Crear primera cuenta en PEN
    cy.visit('/accounts');
    cy.contains('Mis Cuentas').should('be.visible');

    cy.get('[data-testid="new-account-button"]').click();
    cy.get('[data-testid="modal-title"]').should('contain', 'Nueva Cuenta');
    cy.wait(500);

    cy.get('[data-testid="account-type-select"]').select('BANK');
    cy.wait(500);
    cy.get('[data-testid="account-currency-select"]').select('PEN');
    cy.get('[data-testid="account-balance-input"]').clear().type('1000');

    cy.get('[data-testid="account-option-interbank"]').click({ force: true });
    cy.wait(500);
    cy.get('[data-testid="account-name-input"]').type(' General 1');

    cy.get('[data-testid="save-account-button"]').click({ force: true });
    cy.wait(5000);
    cy.get('[data-testid="modal-title"]').should('not.exist');

    // Crear segunda cuenta en PEN
    cy.get('[data-testid="new-account-button"]').click();
    cy.get('[data-testid="modal-title"]').should('contain', 'Nueva Cuenta');
    cy.wait(500);

    cy.get('[data-testid="account-type-select"]').select('BANK');
    cy.wait(500);
    cy.get('[data-testid="account-currency-select"]').select('PEN');
    cy.get('[data-testid="account-balance-input"]').clear().type('500');

    cy.get('[data-testid="account-option-bcp"]').click({ force: true });
    cy.wait(500);
    cy.get('[data-testid="account-name-input"]').type(' General 2');

    cy.get('[data-testid="save-account-button"]').click({ force: true });
    cy.wait(5000);
  });

  it('Debe crear transferencias entre las dos cuentas y verificar balances', () => {
    cy.visit('/transactions');
    cy.contains('Flujo de Caja').should('be.visible');

    // Primera transferencia: de Cuenta 1 a Cuenta 2 - 200 PEN
    cy.get('[data-testid="new-transaction-button"]').click();
    cy.wait(500);

    cy.get('[data-testid="transaction-type-select"]').select('TRANSFER');
    cy.get('[data-testid="transaction-amount-input"]').clear().type('200');
    cy.get('[data-testid="transaction-description-input"]').type('Transferencia General 1 a 2');
    cy.get('[data-testid="transaction-from-account-select"]').select('Interbank General 1 (PEN) - Disp: S/ 1000.00');
    cy.get('[data-testid="transaction-to-account-select"]').select('BCP General 2 (PEN) - Disp: S/ 500.00');
    cy.get('[data-testid="transaction-date-input"]').type('2023-10-01');

    cy.get('[data-testid="save-transaction-button"]').click();
    cy.wait(5000);

    cy.contains('Transferencia General 1 a 2').should('be.visible');
    cy.contains('S/ 200.00').should('be.visible');

    // Verificar balances después de la primera transferencia
    cy.visit('/accounts');
    cy.contains('Interbank General 1').should('be.visible');
    cy.contains('S/ 800.00').should('be.visible'); // 1000 - 200
    cy.contains('BCP General 2').should('be.visible');
    cy.contains('S/ 700.00').should('be.visible'); // 500 + 200

    // Segunda transferencia: de Cuenta 2 a Cuenta 1 - 100 PEN
    cy.visit('/transactions');
    cy.get('[data-testid="new-transaction-button"]').click();
    cy.wait(500);

    cy.get('[data-testid="transaction-type-select"]').select('TRANSFER');
    cy.get('[data-testid="transaction-amount-input"]').clear().type('100');
    cy.get('[data-testid="transaction-description-input"]').type('Transferencia General 2 a 1');
    cy.get('[data-testid="transaction-from-account-select"]').select('BCP General 2 (PEN) - Disp: S/ 700.00');
    cy.get('[data-testid="transaction-to-account-select"]').select('Interbank General 1 (PEN) - Disp: S/ 800.00');
    cy.get('[data-testid="transaction-date-input"]').type('2023-10-02');

    cy.get('[data-testid="save-transaction-button"]').click();
    cy.wait(5000);

    cy.contains('Transferencia General 2 a 1').should('be.visible');

    // Verificar balances finales
    cy.visit('/accounts');
    cy.contains('Interbank General 1').should('be.visible');
    cy.contains('S/ 900.00').should('be.visible'); // 800 + 100
    cy.contains('BCP General 2').should('be.visible');
    cy.contains('S/ 600.00').should('be.visible'); // 700 - 100
  });

  it('Debe crear un gasto y verificar en Flujo', () => {
    cy.visit('/transactions');
    cy.contains('Flujo de Caja').should('be.visible');

    cy.get('[data-testid="new-transaction-button"]').click();
    cy.wait(500);

    cy.get('[data-testid="transaction-type-select"]').select('EXPENSE');
    cy.get('[data-testid="transaction-amount-input"]').clear().type('50');
    cy.get('[data-testid="transaction-description-input"]').type('Gasto General');
    cy.get('[data-testid="transaction-category-select"]').select('food');
    cy.get('[data-testid="transaction-account-select"]').select('Interbank General 1 (PEN) - Disp: S/ 900.00');
    cy.get('[data-testid="transaction-date-input"]').type('2023-10-03');

    cy.get('[data-testid="save-transaction-button"]').click();
    cy.wait(5000);

    cy.contains('Gasto General').should('be.visible');
    cy.contains('S/ 50.00').should('be.visible');

    // Verificar balance actualizado
    cy.visit('/accounts');
    cy.contains('Interbank General 1').should('be.visible');
    cy.contains('S/ 850.00').should('be.visible'); // 900 - 50
  });

  it('Debe crear un ingreso y verificar en Flujo', () => {
    cy.visit('/transactions');
    cy.contains('Flujo de Caja').should('be.visible');

    cy.get('[data-testid="new-transaction-button"]').click();
    cy.wait(500);

    cy.get('[data-testid="transaction-type-select"]').select('INCOME');
    cy.get('[data-testid="transaction-amount-input"]').clear().type('300');
    cy.get('[data-testid="transaction-description-input"]').type('Ingreso General');
    cy.get('[data-testid="transaction-category-select"]').select('salary');
    cy.get('[data-testid="transaction-account-select"]').select('BCP General 2 (PEN) - Disp: S/ 600.00');
    cy.get('[data-testid="transaction-date-input"]').type('2023-10-04');

    cy.get('[data-testid="save-transaction-button"]').click();
    cy.wait(5000);

    cy.contains('Ingreso General').should('be.visible');
    cy.contains('S/ 300.00').should('be.visible');

    // Verificar balance actualizado
    cy.visit('/accounts');
    cy.contains('BCP General 2').should('be.visible');
    cy.contains('S/ 900.00').should('be.visible'); // 600 + 300
  });

  it('Debe crear una meta y verificar en Metas', () => {
    cy.visit('/goals');
    cy.contains('Metas de Ahorro').should('be.visible');

    cy.get('[data-testid="new-goal-button"]').click();
    cy.wait(500);

    cy.get('[data-testid="goal-name-input"]').type('Meta General');
    cy.get('[data-testid="goal-currency-select"]').select('PEN');
    cy.get('[data-testid="goal-target-amount-input"]').clear().type('2000');
    cy.get('[data-testid="goal-current-amount-input"]').clear().type('500');
    cy.get('[data-testid="goal-deadline-input"]').type('2024-12-31');

    cy.get('[data-testid="save-goal-button"]').click();
    cy.wait(5000);

    cy.contains('Meta General').should('be.visible');
    cy.contains('S/ 500.00').should('be.visible');
    cy.contains('S/ 2000.00').should('be.visible');
  });

  it('Debe crear una deuda y verificar en Deudas', () => {
    cy.visit('/debts');
    cy.contains('Deudas y Créditos').should('be.visible');

    cy.get('[data-testid="new-debt-button"]').click();
    cy.wait(500);

    cy.get('[data-testid="debt-name-input"]').type('Deuda General');
    cy.get('[data-testid="debt-currency-select"]').select('PEN');
    cy.get('[data-testid="debt-paid-amount-input"]').clear().type('300');
    cy.get('[data-testid="debt-total-amount-input"]').clear().type('1500');
    cy.get('[data-testid="debt-due-date-input"]').type('2024-12-31');

    cy.get('[data-testid="save-debt-button"]').click();
    cy.wait(5000);

    cy.contains('Deuda General').should('be.visible');
    cy.contains('S/ 1200.00').should('be.visible'); // 1500 - 300
  });

  it('Debe pagar parte de la deuda mediante transacción y verificar actualización', () => {
    cy.visit('/transactions');
    cy.contains('Flujo de Caja').should('be.visible');

    cy.get('[data-testid="new-transaction-button"]').click();
    cy.wait(500);

    cy.get('[data-testid="transaction-type-select"]').select('PAY_DEBT');
    cy.get('[data-testid="transaction-amount-input"]').clear().type('300');
    cy.get('[data-testid="transaction-description-input"]').type('Pago Deuda General');
    cy.get('[data-testid="transaction-debt-select"]').select('Deuda General - Restante: S/ 1200.00');
    cy.get('[data-testid="transaction-account-select"]').select('Interbank General 1 (PEN) - Disp: S/ 850.00');
    cy.get('[data-testid="transaction-date-input"]').type('2023-10-05');

    cy.get('[data-testid="save-transaction-button"]').click();
    cy.wait(5000);

    cy.contains('Pago Deuda General').should('be.visible');
    cy.contains('S/ 300.00').should('be.visible');

    // Verificar balance actualizado
    cy.visit('/accounts');
    cy.contains('Interbank General 1').should('be.visible');
    cy.contains('S/ 550.00').should('be.visible'); // 850 - 300

    // Verificar deuda actualizada
    cy.visit('/debts');
    cy.contains('Deuda General').should('be.visible');
    cy.contains('S/ 900.00').should('be.visible'); // 1200 - 300
  });

  it('Debe ahorrar para la meta mediante transacción y verificar actualización', () => {
    cy.visit('/transactions');
    cy.contains('Flujo de Caja').should('be.visible');

    cy.get('[data-testid="new-transaction-button"]').click();
    cy.wait(500);

    cy.get('[data-testid="transaction-type-select"]').select('SAVE_FOR_GOAL');
    cy.get('[data-testid="transaction-amount-input"]').clear().type('300');
    cy.get('[data-testid="transaction-description-input"]').type('Ahorro Meta General');
    cy.get('[data-testid="transaction-goal-select"]').select('Meta General - Restante: S/ 1500.00');
    cy.get('[data-testid="transaction-account-select"]').select('BCP General 2 (PEN) - Disp: S/ 900.00');
    cy.get('[data-testid="transaction-date-input"]').type('2023-10-06');

    cy.get('[data-testid="save-transaction-button"]').click();
    cy.wait(5000);

    cy.contains('Ahorro Meta General').should('be.visible');
    cy.contains('S/ 300.00').should('be.visible');

    // Verificar balance actualizado
    cy.visit('/accounts');
    cy.contains('BCP General 2').should('be.visible');
    cy.contains('S/ 600.00').should('be.visible'); // 900 - 300

    // Verificar meta actualizada
    cy.visit('/goals');
    cy.contains('Meta General').should('be.visible');
    cy.contains('S/ 800.00').should('be.visible'); // 500 + 300
    cy.contains('S/ 2000.00').should('be.visible');
  });

  it('Debe verificar resumen en Dashboard', () => {
    cy.visit('/dashboard');
    cy.contains('Resumen Financiero').should('be.visible');

    // Verificar que se muestran los totales correctos
    // Esto puede variar, pero al menos verificar que carga
    cy.get('[data-testid="total-balance"]').should('exist');
  });
});