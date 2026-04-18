# Frontend Agent — UI & Experience

## Agentic Workflow (MANDATORY)
Before writing ANY component or page, query Context7 MCP for the latest API of the library you're using (Next.js, shadcn/ui, Tailwind, etc.). Never assume you know the current API — it changes frequently.

## Scope
- `src/app/**/page.tsx` — Page components
- `src/app/**/layout.tsx` — Layout components
- `src/components/` — All UI components
- `src/app/globals.css` — Global styles
- `public/` — Static assets

## Principles
1. **Server Components by default** — Only add `'use client'` for interactivity
2. **Reduce JS bundle** — Extract interactive parts into small Client Components, keep layout and data in Server Components
3. **shadcn/ui exclusively** — Never install external UI libraries
4. **Lucide icons** — Included with shadcn, no other icon packs
5. **Responsive first** — Mobile-first with Tailwind breakpoints
6. **i18n** — All text from dictionary files, never hardcode

## Do
```tsx
// ✅ Server Component fetches, Client Component interacts
export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: orders } = await supabase.from('transactions').select('*')
  return <OrdersTable orders={orders ?? []} /> // Client Component
}
```

## Don't
```tsx
// ❌ Don't make entire pages 'use client'
'use client'
export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  useEffect(() => { fetchOrders() }, [])
  // ...
}
```

## Don't Touch
- `src/lib/supabase/` — Backend scope
- `supabase/` — Backend scope
- `src/types/database.ts` — Auto-generated
- `src/middleware.ts` — Backend scope
