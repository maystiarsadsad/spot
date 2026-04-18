# Spot — Platform for Local Businesses

## Project Overview
Multi-tenant SaaS platform for local businesses (restaurants, hotels, barbershops, tattoo shops, bars, gyms, etc.). One codebase, three access levels: SuperAdmin, Business Dashboard, Public Webpage.

## Technical Stack
- **Framework**: Next.js 15+ (App Router, TypeScript)
- **Package Manager**: npm
- **UI**: Tailwind CSS v4 + shadcn/ui (exclusive — no other UI libs)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Hosting**: Vercel (edge functions, cron jobs)
- **i18n**: es, en, pt-BR via static JSON dictionaries

## Mandatory Rules
- **Server Components first**: Only use `'use client'` for interactivity (hooks, event handlers, browser APIs)
- **Reduce bundle**: Keep Client Components small by extracting interactive parts — layout and data fetching stay in Server Components
- **Data fetching**: Use async Server Components with direct Supabase queries — no `getServerSideProps`
- **Mutations**: Use Server Actions with `'use server'` + `revalidatePath()` or `revalidateTag()`
- **Multi-tenant**: ALL queries must filter by `business_id` — RLS is the safety net
- **Security**: Always call `supabase.auth.getUser()` in Server Actions before mutations
- **No external UI libraries**: shadcn/ui + Lucide icons only
- **No n8n**: Edge functions and cron jobs via Vercel
- **No Supabase MCP**: Use `supabase` CLI for all DB operations (migrations, queries, user management)
- **i18n**: Use dictionary files, never hardcode user-facing text

## Agentic Workflow (MANDATORY)
Every coding action must follow this flow:
1. **Context7 first** — Before writing ANY code, query Context7 MCP to get the latest docs for the library/framework you're about to use (Next.js, Supabase, shadcn, Tailwind, etc.). Your training data may be outdated.
2. **Plan** — Outline exactly what you're going to build, which files you'll touch, and why.
3. **Act** — Execute in small, atomic steps. One component, one file, one function at a time.
4. **Verify** — Run `npm run dev` or `npm run build` to validate after each change.
5. **Reflect** — Review the result, check for errors, and iterate.

### Context7 Usage
- Use `resolve-library-id` to find the library, then `query-docs` with a specific question.
- **Always query** before: creating components, setting up auth, configuring middleware, writing Server Actions, using any API you haven't verified in this session.
- **Never assume** you know the latest API — Next.js, Supabase, and shadcn/ui change frequently.

### Git Workflow
- **NO commits during the day** — only at EOD (End of Day) via `/eod` workflow
- **`/sod`** — Run at start of each session: status check, dev server, task planning
- **`/eod`** — Run at end of each session: build verify, single commit, push, plan update
- Commit messages must be descriptive and group the full day's work

## Commands
- `npm run dev` — Start local dev server (Turbopack)
- `npm run build` — Production build
- `npm run lint` — Run ESLint
- `supabase db push` — Push migrations to remote
- `supabase gen types typescript --project-id lswjtmbyboalwysrsavd > src/types/database.ts` — Regenerate types

## Architecture
```
src/
├── app/
│   ├── (auth)/          # Login, Register — public routes
│   ├── (superadmin)/sa/ # Platform admin — requires superadmin role
│   ├── (dashboard)/d/   # Business panel — requires auth + business membership
│   ├── (public)/[slug]/ # Public webpages — anonymous access
│   └── api/             # API routes, webhooks, crons
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── shared/          # Cross-cutting components
│   ├── dashboard/       # Dashboard-specific
│   ├── superadmin/      # SuperAdmin-specific
│   └── public/          # Public webpage components
├── lib/
│   ├── supabase/        # Client, server, middleware helpers
│   ├── i18n/            # Locale config and dictionary loader
│   ├── constants.ts     # Business types, modules
│   └── utils.ts         # Shared utilities (cn, formatters)
├── hooks/               # Client-side hooks
├── types/               # TypeScript types (database.ts is generated)
└── proxy.ts              # Auth session refresh + route protection (Next.js 16 proxy convention)
```

## Patterns

### Server Component with Data Fetching
```tsx
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data } = await supabase.from('businesses').select('*')
  return <BusinessList businesses={data ?? []} />
}
```

### Client Component (interactive only)
```tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function SearchBar({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState('')
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />
}
```

### Server Action with Mutation
```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTransaction(businessId: string, data: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('transactions')
    .insert({ business_id: businessId, ...parseFormData(data) })

  if (error) throw new Error('Failed to create')
  revalidatePath('/d/orders')
}
```

### Layout with Selective Client Components
```tsx
import { Sidebar } from '@/components/dashboard/sidebar' // Server
import { Search } from '@/components/shared/search'       // Client ('use client')

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Search />
        {children}
      </main>
    </div>
  )
}
```

## Existing Businesses (Seed Data)
- **Sandy Papas** — Fast food / restaurant (slug: `sandypapas`)
- **Temporadas de Sol** — Hotel (slug: `temporadasdesol`)

## Documentation
- `docs/` — Architecture decisions and guides
- `node_modules/next/dist/docs/` — Next.js version-specific docs (read before writing code)

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
