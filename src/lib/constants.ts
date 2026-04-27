export type BusinessType =
  | 'restaurant'
  | 'fast_food'
  | 'supermarket'
  | 'barbershop'
  | 'tattoo'
  | 'bar'
  | 'hotel'
  | 'hostel'
  | 'cafe'
  | 'gym'
  | 'laundry'
  | 'clothing'
  | 'veterinary'
  | 'custom';

export const APP_NAME = 'Spot'
export const APP_TAGLINE = 'Tu negocio, tu lugar'
export const APP_DESCRIPTION = 'Plataforma todo-en-uno para negocios locales'

export const BUSINESS_TYPES: Record<BusinessType, { label: string; icon: string; color: string }> = {
  restaurant: { label: 'Restaurante', icon: '🍽️', color: '#ef4444' },
  fast_food: { label: 'Comida Rápida', icon: '🍔', color: '#f97316' },
  supermarket: { label: 'Supermercado', icon: '🛒', color: '#22c55e' },
  barbershop: { label: 'Barbería', icon: '💈', color: '#3b82f6' },
  tattoo: { label: 'Tattoo Shop', icon: '🎨', color: '#8b5cf6' },
  bar: { label: 'Bar / Club', icon: '🍺', color: '#a855f7' },
  hotel: { label: 'Hotel', icon: '🏨', color: '#06b6d4' },
  hostel: { label: 'Hostal', icon: '🛏️', color: '#14b8a6' },
  cafe: { label: 'Café', icon: '☕', color: '#78716c' },
  gym: { label: 'Gimnasio', icon: '🏋️', color: '#dc2626' },
  laundry: { label: 'Lavandería', icon: '🧼', color: '#0ea5e9' },
  clothing: { label: 'Tienda de Ropa', icon: '👗', color: '#ec4899' },
  veterinary: { label: 'Veterinaria', icon: '🐕', color: '#84cc16' },
  custom: { label: 'Personalizado', icon: '📱', color: '#6366f1' },
}

export const MODULES = {
  catalog: { key: 'catalog', defaultLabel: 'Catálogo', icon: 'Package' },
  reservations: { key: 'reservations', defaultLabel: 'Reservas', icon: 'CalendarDays' },
  transactions: { key: 'transactions', defaultLabel: 'Transacciones', icon: 'ShoppingCart' },
  inventory: { key: 'inventory', defaultLabel: 'Inventario', icon: 'Warehouse' },
  finance: { key: 'finance', defaultLabel: 'Finanzas', icon: 'DollarSign' },
  team: { key: 'team', defaultLabel: 'Equipo', icon: 'Users' },
  contacts: { key: 'contacts', defaultLabel: 'Clientes', icon: 'Contact' },
  reports: { key: 'reports', defaultLabel: 'Reportes', icon: 'BarChart3' },
} as const

// Default modules enabled per business type
export const DEFAULT_MODULES_BY_TYPE: Record<BusinessType, string[]> = {
  restaurant: ['catalog', 'transactions', 'reservations', 'inventory', 'finance', 'team', 'contacts', 'reports'],
  fast_food: ['catalog', 'transactions', 'inventory', 'finance', 'team', 'contacts', 'reports'],
  supermarket: ['catalog', 'transactions', 'inventory', 'finance', 'team', 'contacts', 'reports'],
  barbershop: ['catalog', 'transactions', 'reservations', 'finance', 'team', 'contacts', 'reports'],
  tattoo: ['catalog', 'transactions', 'reservations', 'finance', 'team', 'contacts', 'reports'],
  bar: ['catalog', 'transactions', 'reservations', 'inventory', 'finance', 'team', 'contacts', 'reports'],
  hotel: ['catalog', 'transactions', 'reservations', 'inventory', 'finance', 'team', 'contacts', 'reports'],
  hostel: ['catalog', 'transactions', 'reservations', 'inventory', 'finance', 'team', 'contacts', 'reports'],
  cafe: ['catalog', 'transactions', 'inventory', 'finance', 'team', 'contacts', 'reports'],
  gym: ['catalog', 'transactions', 'reservations', 'finance', 'team', 'contacts', 'reports'],
  laundry: ['catalog', 'transactions', 'finance', 'team', 'contacts', 'reports'],
  clothing: ['catalog', 'transactions', 'inventory', 'finance', 'team', 'contacts', 'reports'],
  veterinary: ['catalog', 'transactions', 'reservations', 'inventory', 'finance', 'team', 'contacts', 'reports'],
  custom: ['catalog', 'transactions', 'reservations', 'finance', 'team', 'contacts', 'reports'],
}

// ── Standardized Roles (Positions) by Business Type ──────────────
export const ROLES_BY_TYPE: Record<BusinessType, string[]> = {
  restaurant: ['Chef', 'Cocinero(a)', 'Auxiliar de Cocina', 'Mesero(a)', 'Barman', 'Cajero(a)', 'Administrador(a)', 'Repartidor(a)', 'Auxiliar de Aseo'],
  fast_food: ['Cocinero(a)', 'Preparador(a)', 'Cajero(a)', 'Repartidor(a)', 'Administrador(a)', 'Auxiliar de Aseo'],
  supermarket: ['Cajero(a)', 'Bodeguero(a)', 'Auxiliar de Percha', 'Administrador(a)', 'Carnicero(a)', 'Panadero(a)', 'Guardia de Seguridad'],
  barbershop: ['Barbero(a)', 'Estilista', 'Recepcionista', 'Auxiliar', 'Administrador(a)'],
  tattoo: ['Tatuador(a)', 'Piercer', 'Recepcionista', 'Diseñador(a)', 'Administrador(a)'],
  bar: ['Barman', 'Mesero(a)', 'DJ', 'Cajero(a)', 'Guardia de Seguridad', 'Administrador(a)', 'Auxiliar de Aseo'],
  hotel: ['Recepcionista', 'Botones', 'Camarero(a) de Pisos', 'Cocinero(a)', 'Mesero(a)', 'Conserje', 'Guardia de Seguridad', 'Mantenimiento', 'Administrador(a)', 'Gerente'],
  hostel: ['Recepcionista', 'Auxiliar de Limpieza', 'Guía Turístico(a)', 'Administrador(a)', 'Cocinero(a)'],
  cafe: ['Barista', 'Pastelero(a)', 'Cajero(a)', 'Mesero(a)', 'Administrador(a)'],
  gym: ['Entrenador(a) Personal', 'Instructor(a) de Clases', 'Recepcionista', 'Nutricionista', 'Administrador(a)', 'Mantenimiento'],
  laundry: ['Operador(a) de Máquinas', 'Planchador(a)', 'Recepcionista', 'Repartidor(a)', 'Administrador(a)'],
  clothing: ['Vendedor(a)', 'Cajero(a)', 'Visual Merchandiser', 'Bodeguero(a)', 'Administrador(a)'],
  veterinary: ['Veterinario(a)', 'Auxiliar Veterinario(a)', 'Peluquero(a) Canino', 'Recepcionista', 'Administrador(a)'],
  custom: ['Administrador(a)', 'Asistente', 'Operario(a)', 'Vendedor(a)', 'Cajero(a)', 'Recepcionista', 'Repartidor(a)', 'Gerente'],
}

// ── Standardized Departments by Business Type ────────────────────
export const DEPARTMENTS_BY_TYPE: Record<BusinessType, string[]> = {
  restaurant: ['Cocina', 'Salón', 'Barra', 'Caja', 'Administración', 'Domicilios', 'Aseo y Mantenimiento'],
  fast_food: ['Cocina', 'Caja', 'Domicilios', 'Administración', 'Aseo'],
  supermarket: ['Cajas', 'Bodega', 'Góndolas', 'Carnes', 'Panadería', 'Administración', 'Seguridad'],
  barbershop: ['Corte y Estilo', 'Recepción', 'Administración'],
  tattoo: ['Tatuaje', 'Piercing', 'Diseño', 'Recepción', 'Administración'],
  bar: ['Barra', 'Salón', 'Cabina DJ', 'Caja', 'Seguridad', 'Administración', 'Aseo'],
  hotel: ['Recepción', 'Pisos', 'Cocina', 'Restaurante', 'Conserjería', 'Seguridad', 'Mantenimiento', 'Administración', 'Gerencia'],
  hostel: ['Recepción', 'Limpieza', 'Cocina', 'Tours', 'Administración'],
  cafe: ['Barra', 'Repostería', 'Caja', 'Salón', 'Administración'],
  gym: ['Piso de Entrenamiento', 'Clases Grupales', 'Recepción', 'Nutrición', 'Administración', 'Mantenimiento'],
  laundry: ['Lavado', 'Planchado', 'Recepción', 'Domicilios', 'Administración'],
  clothing: ['Ventas', 'Caja', 'Exhibición', 'Bodega', 'Administración'],
  veterinary: ['Consulta', 'Cirugía', 'Peluquería', 'Recepción', 'Administración'],
  custom: ['Operaciones', 'Ventas', 'Administración', 'Recepción', 'Logística'],
}

