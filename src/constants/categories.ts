export const TRANSACTION_CATEGORIES = [
  { id: 'food', name: 'Alimentación', icon: '🍔' },
  { id: 'transport', name: 'Transporte', icon: '🚗' },
  { id: 'entertainment', name: 'Entretenimiento', icon: '🎬' },
  { id: 'health', name: 'Salud', icon: '🏥' },
  { id: 'education', name: 'Educación', icon: '📚' },
  { id: 'shopping', name: 'Compras', icon: '🛍️' },
  { id: 'bills', name: 'Servicios', icon: '📄' },
  { id: 'housing', name: 'Vivienda', icon: '🏠' },
  { id: 'salary', name: 'Salario', icon: '💼' },
  { id: 'investment', name: 'Inversión', icon: '📈' },
  { id: 'gift', name: 'Regalo', icon: '🎁' },
  { id: 'other', name: 'Otro', icon: '📌' },
];

// Bancos disponibles
export const BANKS = [
  { id: 'interbank', name: 'Interbank', logo: '/logos/interbank.png', type: 'BANK' },
  { id: 'bcp', name: 'BCP', logo: '/logos/bcp.png', type: 'BANK' },
  { id: 'bbva', name: 'BBVA', logo: '/logos/bbva.png', type: 'BANK' },
  { id: 'io', name: 'io', logo: '/logos/io.png', type: 'BANK' },
  { id: 'oh', name: 'oh!', logo: '/logos/oh.png', type: 'BANK' },
];

// Billeteras digitales
export const DIGITAL_WALLETS = [
  { id: 'yape', name: 'Yape', logo: '/logos/yape.png', type: 'WALLET' },
  { id: 'plin', name: 'Plin', logo: '/logos/plin.png', type: 'WALLET' },
];

// Efectivo
export const CASH_OPTIONS = [
  { id: 'cash', name: 'Físico', icon: '💵', type: 'CASH' },
];

// Todas las opciones de cuentas combinadas
export const ACCOUNT_OPTIONS = [
  ...BANKS,
  ...DIGITAL_WALLETS,
  ...CASH_OPTIONS,
];

// Fuentes de ingreso personalizadas
export const INCOME_SOURCES = [
  { id: 'salary', name: 'Sueldos', icon: '💼' },
  { id: 'clinton-rent', name: 'Cajamarca cuartos (Alquileres)', icon: '🏠' },
  { id: 'other-income', name: 'Otro ingreso', icon: '💰' },
];

export const ACCOUNT_TYPES_LABELS = {
  BANK: 'Cuenta Bancaria',
  WALLET: 'Billetera Digital',
  CASH: 'Efectivo',
};
