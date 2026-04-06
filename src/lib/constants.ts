import type { BusinessType } from '@/types/database'

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
  transactions: { key: 'transactions', defaultLabel: 'Transacciones', icon: 'ShoppingCart' },
  inventory: { key: 'inventory', defaultLabel: 'Inventario', icon: 'Warehouse' },
  finance: { key: 'finance', defaultLabel: 'Finanzas', icon: 'DollarSign' },
  team: { key: 'team', defaultLabel: 'Equipo', icon: 'Users' },
  contacts: { key: 'contacts', defaultLabel: 'Clientes', icon: 'Contact' },
  reports: { key: 'reports', defaultLabel: 'Reportes', icon: 'BarChart3' },
} as const

// Default modules enabled per business type
export const DEFAULT_MODULES_BY_TYPE: Record<BusinessType, string[]> = {
  restaurant: ['catalog', 'transactions', 'inventory', 'finance', 'team', 'contacts', 'reports'],
  fast_food: ['catalog', 'transactions', 'inventory', 'finance', 'team', 'contacts', 'reports'],
  supermarket: ['catalog', 'transactions', 'inventory', 'finance', 'team', 'contacts', 'reports'],
  barbershop: ['catalog', 'transactions', 'finance', 'team', 'contacts', 'reports'],
  tattoo: ['catalog', 'transactions', 'finance', 'team', 'contacts', 'reports'],
  bar: ['catalog', 'transactions', 'inventory', 'finance', 'team', 'contacts', 'reports'],
  hotel: ['catalog', 'transactions', 'inventory', 'finance', 'team', 'contacts', 'reports'],
  hostel: ['catalog', 'transactions', 'inventory', 'finance', 'team', 'contacts', 'reports'],
  cafe: ['catalog', 'transactions', 'inventory', 'finance', 'team', 'contacts', 'reports'],
  gym: ['catalog', 'transactions', 'finance', 'team', 'contacts', 'reports'],
  laundry: ['catalog', 'transactions', 'finance', 'team', 'contacts', 'reports'],
  clothing: ['catalog', 'transactions', 'inventory', 'finance', 'team', 'contacts', 'reports'],
  veterinary: ['catalog', 'transactions', 'inventory', 'finance', 'team', 'contacts', 'reports'],
  custom: ['catalog', 'transactions', 'finance', 'team', 'contacts', 'reports'],
}
