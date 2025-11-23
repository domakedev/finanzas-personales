describe('Goals CRUD Operations', () => {
  beforeEach(() => {
    // Login antes de cada test
    cy.login();
    // Navegar a la página de metas
    cy.visit('/goals');
    // Esperar a que cargue la página
    cy.contains('Metas de Ahorro').should('be.visible');
  });

  describe('CREATE - Crear Nuevas Metas', () => {
    it('Debe crear una meta en USD', () => {
      // Hacer click en "Nueva Meta"
      cy.get('[data-testid="new-goal-button"]').click();

      // Esperar a que el modal se abra completamente
      cy.get('[data-testid="modal-title"]').should('contain', 'Nueva Meta');
      cy.wait(500);

      // Llenar el formulario
      cy.get('[data-testid="goal-name-input"]').type('Meta Laptop');
      cy.get('[data-testid="goal-currency-select"]').select('USD');
      cy.get('[data-testid="goal-target-amount-input"]').clear().type('1500');
      cy.get('[data-testid="goal-current-amount-input"]').clear().type('300');
      cy.get('[data-testid="goal-deadline-input"]').type('2024-12-31');

      // Guardar
      cy.get('[data-testid="save-goal-button"]').click();

      // Esperar a que se guarde
      cy.wait(5000);

      // Verificar que la meta aparece en la lista
      cy.contains('Meta Laptop').should('be.visible');
      cy.contains('$ 300.00').should('be.visible');
      cy.contains('$ 1500.00').should('be.visible');
    });
  });

  describe('READ - Ver Lista de Metas', () => {
    it('Debe mostrar todas las metas con sus datos correctos', () => {
      // Verificar que hay al menos una meta
      cy.contains('Meta Laptop').should('be.visible');
    });
  });

  describe('UPDATE - Editar Meta', () => {
    it('Debe editar el monto ahorrado de una meta', () => {
      // Buscar la meta por nombre
      cy.contains('Meta Laptop').should('be.visible');

      // Encontrar el botón de editar
      cy.get('[data-testid="goal-Meta Laptop"]').find('[data-testid^="edit-goal-"]').click();

      // Confirmar el diálogo de advertencia
      cy.contains('⚠️ Cuidado').should('be.visible');
      cy.get('[data-testid="confirm-action-button"]').click();

      // Esperar a que el modal de edición se abra
      cy.get('[data-testid="modal-title"]').should('contain', 'Editar Meta');
      cy.wait(500);

      // Editar el monto ahorrado
      cy.get('[data-testid="goal-current-amount-input"]').clear().type('500');
      cy.get('[data-testid="goal-target-amount-input"]').clear().type('1500');
      cy.get('[data-testid="goal-deadline-input"]').clear().type('2024-12-31');

      // Guardar
      cy.get('[data-testid="save-goal-button"]').click();

      // Esperar a que se guarde
      cy.wait(5000);

      // Verificar el cambio
      cy.contains('$ 500.00').should('be.visible');
      cy.contains('$ 1500.00').should('be.visible');
    });
  });

  describe('DELETE - Eliminar Meta', () => {
    it('Debe eliminar una meta', () => {
      // Buscar la meta
      cy.contains('Meta Laptop').should('be.visible');

      // Encontrar el botón de eliminar
      cy.get('[data-testid="goal-Meta Laptop"]').find('[data-testid^="delete-goal-"]').click();

      // Confirmar eliminación
      cy.get('[data-testid="modal-title"]').should('contain', 'Eliminar Meta');
      cy.get('[data-testid="confirm-action-button"]').click();

      // Esperar y verificar que se eliminó
      cy.wait(1000);
      cy.contains('Meta Laptop').should('not.exist');
    });
  });
});