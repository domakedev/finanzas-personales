describe('Transactions CRUD Operations', () => {
  before(() => {
    // Crear cuentas necesarias antes de todos los tests
    cy.login();
    cy.visit('/accounts');
    cy.contains('Mis Cuentas').should('be.visible');

    // Crear cuenta Interbank Test
    cy.get('[data-testid="new-account-button"]').click();
    cy.get('[data-testid="modal-title"]').should('contain', 'Nueva Cuenta');
    cy.wait(500);

    cy.get('[data-testid="account-type-select"]').select('BANK', {force: true});
    cy.get('[data-testid="account-currency-select"]').select('PEN', {force: true});
    cy.get('[data-testid="account-balance-input"]').clear().type('1000', {force: true});

    cy.get('[data-testid="account-option-interbank"]').click({ force: true });
    cy.get('[data-testid="account-name-input"]').type(' Test', {force: true});

    cy.get('[data-testid="save-account-button"]').click({force: true});
    cy.wait(5000);

    // Crear cuenta BCP Dollars
    cy.get('[data-testid="new-account-button"]').click();
    cy.wait(500);

    cy.get('[data-testid="account-type-select"]').select('BANK', {force: true});
    cy.get('[data-testid="account-currency-select"]').select('USD', {force: true});
    cy.get('[data-testid="account-balance-input"]').clear().type('500', {force: true});

    cy.get('[data-testid="account-option-bcp"]').click({ force: true });
    cy.get('[data-testid="account-name-input"]').type(' Dollars', {force: true});

    cy.get('[data-testid="save-account-button"]').click({force: true});
    cy.wait(5000);
  });

  beforeEach(() => {
    // Login antes de cada test
    cy.login();
    // Navegar a la página de transacciones
    cy.visit('/transactions');
    // Esperar a que cargue la página
    cy.contains('Flujo de Caja').should('be.visible');
  });

  describe('CREATE - Crear Nuevas Transacciones', () => {
    it('Debe crear un gasto', () => {
      // Hacer click en "Nueva Transacción"
      cy.get('[data-testid="new-transaction-button"]').click();

      // Esperar a que el modal se abra completamente
      cy.get('[data-testid="modal-title"]').should('contain', 'Nueva Transacción');
      cy.wait(500);

      // Llenar el formulario
      cy.get('[data-testid="transaction-type-select"]').select('EXPENSE');
      cy.get('[data-testid="transaction-amount-input"]').clear().type('50');
      cy.get('[data-testid="transaction-description-input"]').type('Almuerzo');
      cy.get('[data-testid="transaction-category-select"]').select('food');
      cy.get('[data-testid="transaction-account-select"]').select('Interbank Test (PEN)');
      cy.get('[data-testid="transaction-date-input"]').type('2023-10-01');

      // Guardar
      cy.get('[data-testid="save-transaction-button"]').click();

      // Esperar a que se guarde
      cy.wait(5000);

      // Verificar que la transacción aparece en la lista
      cy.contains('Almuerzo').should('be.visible');
      cy.contains('S/ 50.00').should('be.visible');
    });

    it('Debe crear un ingreso', () => {
      cy.get('[data-testid="new-transaction-button"]').click();
      cy.wait(500);

      cy.get('[data-testid="transaction-type-select"]').select('INCOME');
      cy.get('[data-testid="transaction-amount-input"]').clear().type('1000');
      cy.get('[data-testid="transaction-description-input"]').type('Salario');
      cy.get('[data-testid="transaction-category-select"]').select('salary');
      cy.get('[data-testid="transaction-account-select"]').select('BCP Dollars (USD)');
      cy.get('[data-testid="transaction-date-input"]').type('2023-10-01');

      cy.get('[data-testid="save-transaction-button"]').click();

      // Esperar a que se guarde
      cy.wait(5000);

      cy.contains('Salario').should('be.visible');
      cy.contains('$ 1000.00').should('be.visible');
    });

    it('Debe crear una transferencia', () => {
      cy.get('[data-testid="new-transaction-button"]').click();
      cy.wait(500);

      cy.get('[data-testid="transaction-type-select"]').select('TRANSFER');
      cy.get('[data-testid="transaction-amount-input"]').clear().type('200');
      cy.get('[data-testid="transaction-description-input"]').type('Transferencia de prueba');
      cy.get('[data-testid="transaction-from-account-select"]').select('Interbank Test (PEN)');
      cy.get('[data-testid="transaction-to-account-select"]').select('BCP Dollars (USD)');
      cy.get('[data-testid="transaction-exchange-rate-input"]').clear().type('3.8');
      cy.get('[data-testid="transaction-date-input"]').type('2023-10-01');

      cy.get('[data-testid="save-transaction-button"]').click();

      // Esperar a que se guarde
      cy.wait(5000);

      cy.contains('Transferencia de prueba').should('be.visible');
      cy.contains('S/ 200.00').should('be.visible');
    });
  });

  describe('READ - Ver Lista de Transacciones', () => {
    it('Debe mostrar todas las transacciones con sus datos correctos', () => {
      // Verificar que hay al menos una transacción
      cy.contains('Almuerzo').should('be.visible');
    });
  });

  describe('UPDATE - Editar Transacción', () => {
    it('Debe editar el monto de una transacción', () => {
      // Buscar la transacción por descripción
      cy.contains('Almuerzo').should('be.visible');

      // Encontrar el botón de editar
      cy.get('[data-testid="transaction-Almuerzo"]').find('[data-testid^="edit-transaction-"]').click();

      // Confirmar el diálogo de advertencia
      cy.contains('⚠️ Cuidado').should('be.visible');
      cy.get('[data-testid="confirm-action-button"]').click();

      // Esperar a que el modal de edición se abra
      cy.get('[data-testid="modal-title"]').should('contain', 'Editar Transacción');
      cy.wait(500);

      // Editar el monto
      cy.get('[data-testid="transaction-amount-input"]').clear().type('60');

      // Guardar
      cy.get('[data-testid="save-transaction-button"]').click();

      // Esperar a que se guarde
      cy.wait(5000);

      // Verificar el cambio
      cy.contains('S/ 60.00').should('be.visible');
    });
  });

  describe('DELETE - Eliminar Transacción', () => {
    it('Debe eliminar una transacción', () => {
      // Buscar la transacción
      cy.contains('Almuerzo').should('be.visible');

      // Encontrar el botón de eliminar
      cy.get('[data-testid="transaction-Almuerzo"]').find('[data-testid^="delete-transaction-"]').click();

      // Confirmar eliminación
      cy.get('[data-testid="modal-title"]').should('contain', 'Eliminar Transacción');
      cy.get('[data-testid="confirm-action-button"]').click();

      // Esperar y verificar que se eliminó
      cy.wait(1000);
      cy.contains('Almuerzo').should('not.exist');
    });
  });
});