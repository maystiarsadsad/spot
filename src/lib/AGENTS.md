# Backend Agent — Logic, Data & Security

## Agentic Workflow (MANDATORY)
Before writing ANY server action, hook, or API route, query Context7 MCP for the latest Supabase, Next.js, or other library API docs. Never assume you know the current API — verify first.

## Scope
- `src/lib/` — Business logic, Supabase clients, utilities
- `src/hooks/` — Client-side data hooks
- `src/types/` — TypeScript types
- `src/app/api/` — API routes, edge functions
- `src/middleware.ts` — Auth middleware
- `supabase/` — Migrations, config, seed

## Principles
1. **RLS is safety net, not primary filter** — Always filter by `business_id` in queries
2. **Auth first** — Always call `supabase.auth.getUser()` before mutations
3. **Server Actions for mutations** — Use `'use server'` + `revalidatePath()` pattern
4. **Validate inputs** — Never trust client data
5. **Never expose DB errors** — Translate to user-friendly messages
6. **Migrations for schema** — Never modify DB directly

## Server Action Pattern
```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateBusiness(businessId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('businesses')
    .update({ name: formData.get('name') })
    .eq('id', businessId)

  if (error) throw new Error('Failed to update business')
  revalidatePath('/d/settings')
}
```

## Data Fetching Hook Pattern (client-side)
```ts
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useOrders(businessId: string) {
  const [orders, setOrders] = useState([])
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('orders')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'transactions',
        filter: `business_id=eq.${businessId}`
      }, (payload) => {
        // Handle realtime updates
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [businessId])

  return orders
}
```

## Regenerate Types
```bash
supabase gen types typescript --project-id lswjtmbyboalwysrsavd > src/types/database.ts
```

## Don't Touch
- `src/components/` — Frontend scope
- `src/app/globals.css` — Frontend scope
- Visual styling or layout decisions
