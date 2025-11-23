describe('Debts CRUD Operations', () => {
  beforeEach(() => {
    // Login antes de cada test
    cy.login();
    // Navegar a la página de deudas
    cy.visit('/debts');
    // Esperar a que cargue la página
    cy.contains('Deudas y Créditos').should('be.visible');
  });

  describe('CREATE - Crear Nuevas Deudas', () => {
    it('Debe crear una deuda en PEN', () => {
      // Hacer click en "Nueva Deuda"
      cy.get('[data-testid="new-debt-button"]').click();

      // Esperar a que el modal se abra completamente
      cy.get('[data-testid="modal-title"]').should('contain', 'Registrar Deuda');
      cy.wait(500);

      // Llenar el formulario
      cy.get('[data-testid="debt-name-input"]').type('Deuda Prueba');
      cy.get('[data-testid="debt-currency-select"]').select('PEN');
      cy.get('[data-testid="debt-paid-amount-input"]').clear().type('200');
      cy.get('[data-testid="debt-total-amount-input"]').clear().type('1000');
      cy.get('[data-testid="debt-due-date-input"]').type('2024-12-31');

      // Guardar
      cy.get('[data-testid="save-debt-button"]').click();

      // Esperar a que se guarde
      cy.wait(5000);

      // Verificar que la deuda aparece en la lista
      cy.contains('Deuda Prueba').should('be.visible');
      cy.contains('S/ 800.00').should('be.visible');
    });
  });

  describe('READ - Ver Lista de Deudas', () => {
    it('Debe mostrar todas las deudas con sus datos correctos', () => {
      // Verificar que hay al menos una deuda
      cy.contains('Deuda Prueba').should('be.visible');
    });
  });

  describe('UPDATE - Editar Deuda', () => {
    it('Debe editar el monto pagado de una deuda', () => {
      // Buscar la deuda por nombre
      cy.contains('Deuda Prueba').should('be.visible');

      // Encontrar el botón de editar
      cy.get('[data-testid="debt-Deuda Prueba"]').find('[data-testid^="edit-debt-"]').click();

      // Confirmar el diálogo de advertencia
      cy.contains('⚠️ Cuidado').should('be.visible');
      cy.get('[data-testid="confirm-action-button"]').click();

      // Esperar a que el modal de edición se abra
      cy.get('[data-testid="modal-title"]').should('contain', 'Editar Deuda');
      cy.wait(500);

      // Editar el monto pagado
      cy.get('[data-testid="debt-paid-amount-input"]').clear().type('300');
      cy.get('[data-testid="debt-total-amount-input"]').clear().type('1000');
      cy.get('[data-testid="debt-due-date-input"]').clear().type('2024-12-31');

      // Guardar
      cy.get('[data-testid="save-debt-button"]').click();

      // Esperar a que se guarde
      cy.wait(5000);

      // Verificar el cambio
      cy.contains('S/ 700.00').should('be.visible');
    });
  });

  describe('DELETE - Eliminar Deuda', () => {
    it('Debe eliminar una deuda', () => {
      // Buscar la deuda
      cy.contains('Deuda Prueba').should('be.visible');

      // Encontrar el botón de eliminar
      cy.get('[data-testid="debt-Deuda Prueba"]').find('[data-testid^="delete-debt-"]').click();

      // Confirmar eliminación
      cy.get('[data-testid="modal-title"]').should('contain', 'Eliminar Deuda');
      cy.get('[data-testid="confirm-action-button"]').click();

      // Esperar y verificar que se eliminó
      cy.wait(1000);
      cy.contains('Deuda Prueba').should('not.exist');
    });
  });
});