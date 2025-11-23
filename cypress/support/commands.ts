// ***********************************************
// Custom commands for testing
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>;
      logout(): Chainable<void>;
    }
  }
}

/**
 * Login programático con Firebase
 */
Cypress.Commands.add('login', () => {
  const email = Cypress.env('TEST_EMAIL');
  const password = Cypress.env('TEST_PASSWORD');
  const apiKey = Cypress.env('FIREBASE_API_KEY');
  
  if (!email || !password || !apiKey) {
    throw new Error(
      'Debes configurar TEST_EMAIL, TEST_PASSWORD y FIREBASE_API_KEY en cypress.env.json'
    );
  }

  cy.log('🔐 Autenticando...');
  
  // Autenticar usando Firebase REST API
  cy.request({
    method: 'POST',
    url: `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    body: {
      email,
      password,
      returnSecureToken: true
    },
    failOnStatusCode: true
  }).then((response) => {
    const { idToken, refreshToken, localId, expiresIn } = response.body;
    
    cy.log('✅ Token obtenido');
    
    // Visitar dashboard y configurar sesión
    cy.visit('/dashboard');
    
    // Inyectar el token en el contexto de la app
    cy.window().then((win: any) => {
      const now = Date.now();
      const expirationTime = now + parseInt(expiresIn) * 1000;
      
      const authData = {
        uid: localId,
        email: email,
        emailVerified: true,
        isAnonymous: false,
        metadata: {
          creationTime: now,
          lastSignInTime: now
        },
        providerData: [{
          providerId: 'password',
          uid: email,
          displayName: null,
          email: email,
          phoneNumber: null,
          photoURL: null
        }],
        stsTokenManager: {
          refreshToken: refreshToken,
          accessToken: idToken,
          expirationTime: expirationTime
        },
        createdAt: String(now),
        lastLoginAt: String(now),
        apiKey: apiKey,
        appName: '[DEFAULT]'
      };
      
      // Guardar en localStorage
      const key = `firebase:authUser:${apiKey}:[DEFAULT]`;
      win.localStorage.setItem(key, JSON.stringify(authData));
      
      // También marcar persistencia
      win.localStorage.setItem(`firebase:persistence:${apiKey}:[DEFAULT]`, '"local"');
      
      cy.log('✅ Token guardado');
    });
    
    // Recargar para que Firebase detecte el token
    cy.reload();
    
    // Esperar suficiente tiempo para que Firebase Auth se inicialice
    cy.wait(5000);
    
    cy.log('✅ Login completado');
  });
});

/**
 * Logout
 */
Cypress.Commands.add('logout', () => {
  cy.log('Cerrando sesión...');
  
  cy.window().then((win) => {
    // Limpiar todo el localStorage y sessionStorage
    win.localStorage.clear();
    win.sessionStorage.clear();
  });
  
  cy.visit('/login');
});

export {};
