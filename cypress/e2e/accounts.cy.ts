describe('Accounts CRUD Operations', () => {
  beforeEach(() => {
    // Login antes de cada test
    cy.login();
    // Navegar a la página de cuentas
    cy.visit('/accounts');
    // Esperar a que cargue la página
    cy.contains('Mis Cuentas').should('be.visible');
  });

  describe('CREATE - Crear Nuevas Cuentas', () => {
    it('Debe crear una cuenta bancaria en PEN', () => {
      // Hacer click en "Nueva Cuenta"
      cy.get('[data-testid="new-account-button"]').click();

      // Esperar a que el modal se abra completamente
      cy.get('[data-testid="modal-title"]').should('contain', 'Nueva Cuenta');
      cy.wait(500);

      // Llenar el formulario
      cy.get('[data-testid="account-type-select"]').select('BANK');
      cy.get('[data-testid="account-currency-select"]').select('PEN');
      cy.get('[data-testid="account-balance-input"]').clear().type('1000');

      // Seleccionar logo de Interbank (usar force porque el backdrop puede estar encima)
      cy.get('[data-testid="account-option-interbank"]').click({ force: true });

      // El nombre se autocompleta con 'Interbank', añadir ' Test'
      cy.get('[data-testid="account-name-input"]').type(' Test');

      // Guardar
      cy.get('[data-testid="save-account-button"]').click();
      
      // Esperar a que el modal se cierre (usar not.be.visible en lugar de not.exist)
      cy.wait(5000); // Dar tiempo para que Firebase guarde
      
      // Verificar que la cuenta aparece en la lista
      cy.contains('Interbank Test').should('be.visible');
      cy.contains('S/ 1000.00').should('be.visible');
    });

    it('Debe crear una cuenta bancaria en USD', () => {
      cy.get('[data-testid="new-account-button"]').click();
      cy.wait(500);

      cy.get('[data-testid="account-type-select"]').select('BANK');
      cy.get('[data-testid="account-currency-select"]').select('USD');
      cy.get('[data-testid="account-balance-input"]').clear().type('500');

      cy.get('[data-testid="account-option-bcp"]').click({ force: true });

      // El nombre se autocompleta con 'BCP', añadir ' Dollars'
      cy.get('[data-testid="account-name-input"]').type(' Dollars');
      cy.get('[data-testid="save-account-button"]').click();
      
      // Esperar a que se guarde
      cy.wait(5000);
      
      cy.contains('BCP Dollars').should('be.visible');
      cy.contains('$ 500.00').should('be.visible');
    });

    it('Debe crear una billetera digital', () => {
      cy.get('[data-testid="new-account-button"]').click();
      cy.wait(500);

      cy.get('[data-testid="account-type-select"]').select('WALLET');
      cy.get('[data-testid="account-currency-select"]').select('PEN');
      cy.get('[data-testid="account-balance-input"]').clear().type('250');

      cy.get('[data-testid="account-option-yape"]').click({ force: true });

      // El nombre se autocompleta con 'Yape', añadir ' Test'
      cy.get('[data-testid="account-name-input"]').type(' Test');
      cy.get('[data-testid="save-account-button"]').click();
      
      // Esperar a que se guarde
      cy.wait(5000);
      
      cy.contains('Yape Test').should('be.visible');
      cy.contains('S/ 250.00').should('be.visible');
    });

    it('Debe crear una cuenta de efectivo', () => {
      cy.get('[data-testid="new-account-button"]').click();
      cy.wait(500);

      cy.get('[data-testid="account-type-select"]').select('CASH');
      cy.get('[data-testid="account-currency-select"]').select('PEN');
      cy.get('[data-testid="account-balance-input"]').clear().type('100');

      // Para efectivo, no hay opción específica, type el nombre directamente
      cy.get('[data-testid="account-name-input"]').type('Efectivo Casa');

      // Cash no necesita logo, solo guardar
      cy.get('[data-testid="save-account-button"]').click();
      
      // Esperar a que se guarde
      cy.wait(5000);
      
      cy.contains('Efectivo Casa').should('be.visible');
      cy.contains('S/ 100.00').should('be.visible');
    });
  });

  describe('READ - Ver Lista de Cuentas', () => {
    it('Debe mostrar todas las cuentas con sus datos correctos', () => {
      // Verificar que las cuentas se muestran
      cy.get('[data-testid="accounts-grid"]').should('exist');
      // Verificar que hay al menos una cuenta
      cy.contains('Interbank Test').should('be.visible');
    });

    it('Debe mostrar los símbolos de moneda correctos', () => {
      // Verificar que se muestran símbolos de moneda
      cy.contains(/S\/|\$/).should('exist');
    });
  });

  describe('UPDATE - Editar Cuenta', () => {
    it('Debe editar el nombre de una cuenta', () => {
      // Buscar la primera cuenta por su nombre
      cy.contains('Interbank Test').should('be.visible');

      // Encontrar el botón de editar
      cy.get('[data-testid="edit-account-Interbank Test"]').click({ force: true });

      // Confirmar el diálogo de advertencia
      cy.contains('⚠️ Cuidado').should('be.visible');
      cy.get('[data-testid="confirm-action-button"]').click();

      // Esperar a que el modal de edición se abra
      cy.get('[data-testid="modal-title"]').should('contain', 'Editar Cuenta');
      cy.wait(500);

      // Editar el nombre
      cy.get('[data-testid="account-name-input"]').clear().type('Cuenta Editada');

      // Guardar
      cy.get('[data-testid="save-account-button"]').click();
      
      // Esperar a que se guarde
      cy.wait(5000);
      
      // Verificar el cambio
      cy.contains('Cuenta Editada').should('be.visible');
    });
  });

  describe('DELETE - Eliminar Cuenta', () => {
    it('Debe eliminar una cuenta sin transacciones', () => {
      // Buscar una cuenta específica para eliminar (la última creada)
      cy.contains('Efectivo Casa').should('be.visible');

      // Encontrar el botón de eliminar
      cy.get('[data-testid="delete-account-Efectivo Casa"]').click({ force: true });

      // Confirmar eliminación
      cy.get('[data-testid="modal-title"]').should('contain', 'Eliminar Cuenta');
      cy.get('[data-testid="confirm-action-button"]').click();
      
      // Esperar y verificar que se eliminó
      cy.wait(1000);
      cy.contains('Efectivo Casa').should('not.exist');
    });

    it('Debe cancelar la eliminación si se cancela el diálogo', () => {
      cy.contains('BCP Dollars').should('be.visible');

      cy.get('[data-testid="delete-account-BCP Dollars"]').click({ force: true });

      // Cancelar
      cy.get('[data-testid="modal-title"]').should('contain', 'Eliminar Cuenta');
      cy.get('[data-testid="confirm-cancel-button"]').click();
      
      // Esperar y verificar que NO se eliminó
      cy.wait(500);
      cy.contains('BCP Dollars').should('be.visible');
    });
  });
});
