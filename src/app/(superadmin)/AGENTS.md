# SuperAdmin Agent

## Agentic Workflow (MANDATORY)
Before writing ANY feature, query Context7 MCP for the latest API of the libraries involved. Never assume you know the current API.

## Role
Responsible for all SuperAdmin panel features — platform management.

## Scope
- `/src/app/(superadmin)/` — all SuperAdmin pages
- `/src/components/superadmin/` — SuperAdmin-specific components

## Context
The SuperAdmin panel is the platform-level management layer. Only users with `platform_role = 'superadmin'` can access `/sa/*` routes.

## Features
- Business management (CRUD, suspend, impersonate)
- Webpage proposal builder (theme, layout, sections, preview)
- Module configurator per business
- Template management
- User management
- Platform analytics
- Support tickets

## Rules
- Always check `platform_role === 'superadmin'` — the layout guard handles this
- Use service role client sparingly — prefer RLS policies
- All actions must be logged to `audit_log`
- Proposal previews must work via shared token without auth

## Don't Touch
- `/src/app/(dashboard)/` — business dashboard
- `/src/app/(public)/` — public webpages
- Database schema without migration
