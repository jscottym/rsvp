# Pickup Sports RSVP Application

## Quick Start for Claude Agents

**IMPORTANT:** This project uses **Nuxt 4** and **Nuxt UI 4**.

### Required MCP Servers

Before making changes, query these MCP servers for up-to-date documentation:

| Server | Tool | Purpose |
|--------|------|---------|
| **Nuxt UI** | `mcp__nuxt-ui__get-component` | Get component docs (Button, Input, etc.) |
| **Nuxt UI** | `mcp__nuxt-ui__list-components` | List all available components |
| **Nuxt UI** | `mcp__nuxt-ui__get-component-metadata` | Get props, slots, events |
| **Context7** | `mcp__context7__resolve-library-id` | Find library ID for docs |
| **Context7** | `mcp__context7__query-docs` | Query Nuxt/Vue documentation |

**Always query component docs before using Nuxt UI components** - the API changes between versions.

### Installed Skills

The **frontend-design** skill is installed at `.claude/skills/frontend-design/SKILL.md`. It contains:
- Mobile-first design patterns for this project
- Tap-based UI component templates
- Color semantics and typography guidelines
- CSS utilities for scrollers and animations

Invoke with `/frontend-design` or let Claude load it automatically for design work.

## Design Philosophy

### Mobile-First, Touch-Optimized
This app is **mobile-first** and must be:
- **Gorgeous** - Beautiful gradients, shadows, and animations
- **Clickable** - Large touch targets (44px minimum), satisfying interactions
- **Minimal data entry** - Tap-to-select over typing, smart defaults, horizontal scroll selectors

### UI Patterns Used
- Tap-based selection (horizontal scroll pickers for dates, times, player counts)
- Large colorful buttons with gradients (`bg-gradient-to-br from-teal-400 to-teal-600`)
- Cards with rounded corners (`rounded-2xl`, `rounded-3xl`)
- Shadows with color (`shadow-teal-500/30`)
- Fixed bottom CTA buttons for important actions
- Pill-shaped tags for displaying RSVPs

### Color System (Based on Logo)
Custom color palette defined in `app/assets/css/main.css` and configured in `app.config.ts`:

| Color | Tailwind | Semantic | Usage |
|-------|----------|----------|-------|
| **Teal** | `teal-*` | `primary` | Actions, "In" responses, CTAs, brand color |
| **Sand** | `sand-*` | `secondary` | Warm accents, complementary UI |
| **Cream** | `cream-*` | - | Warm neutral backgrounds |
| **Red** | `red-*` | `error` | "Out" responses, destructive actions |
| **Amber** | `amber-*` | `warning` | "Maybe" responses, warnings |
| **Blue** | `blue-*` | `info` | "In If..." conditional responses |
| **Slate** | `slate-*` | `neutral` | Text, borders, backgrounds |

**Prefer semantic colors** (`color="primary"`) in Nuxt UI components over raw Tailwind classes.

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Nuxt | 4.2.2 |
| UI Components | Nuxt UI | 4.3.0 |
| State Management | Pinia | 3.0.0 |
| CSS | Tailwind CSS | 4.1.18 |
| Database ORM | Prisma | 6.0.0 |
| Database | PostgreSQL | - |
| Auth | Firebase Auth (Phone) | 11.0.0 |
| Validation | Zod | 3.24.0 |

## Project Structure

```
pickup-sports/
├── app/                      # Frontend (Vue 3 / Nuxt 4)
│   ├── assets/css/          # Global styles
│   ├── components/
│   │   ├── auth/            # AuthModal, ProfileModal
│   │   └── event/           # EventForm, RsvpButtons, ShareLinkCard
│   ├── composables/         # useFirebase, useApi
│   ├── layouts/             # default.vue
│   ├── middleware/          # auth.ts (route protection)
│   ├── pages/               # Routes
│   │   ├── e/[slug]/        # Event detail & manage pages
│   │   └── groups/          # Group pages
│   ├── stores/              # Pinia stores (auth, events, groups)
│   └── app.vue              # Root component
├── server/                   # Backend (Nuxt Server Engine)
│   ├── api/
│   │   ├── auth/            # firebase-login, me, profile, logout
│   │   ├── events/          # CRUD, RSVP endpoints
│   │   └── groups/          # CRUD, join requests
│   ├── middleware/          # auth.ts (token verification)
│   └── utils/               # db, firebase-admin, slug
├── prisma/
│   └── schema.prisma        # Database schema
└── nuxt.config.ts           # Nuxt configuration
```

## Database Models

### User
- `id`, `firebaseUid`, `phone` (unique), `name`, `nickname`
- Relations: organizedEvents, rsvps, ownedGroups, groupMemberships, joinRequests

### Event
- `id`, `slug` (unique), `title`, `sportType`, `location`, `datetime`, `endDatetime`
- `minPlayers`, `maxPlayers`, `allowSharing`, `sharingNote`
- Relations: organizer (User), rsvps

### Rsvp
- `id`, `status` (IN|OUT|MAYBE|IN_IF|WAITLIST), `comment`
- `guestName`, `guestPhone` (for non-authenticated RSVPs)
- Unique constraint: (eventId, userId) and (eventId, guestPhone)

### Group, GroupMember, GroupJoinRequest
- Groups can be PUBLIC or PRIVATE
- Join requests for PUBLIC groups with PENDING|APPROVED|REJECTED status

## Key Files to Understand

### Authentication Flow
- `app/composables/useFirebase.ts` - Phone auth with Firebase
- `app/stores/auth.ts` - Auth state management
- `server/api/auth/firebase-login.post.ts` - Token verification & user sync
- `server/middleware/auth.ts` - Server-side token validation

### Event Creation
- `app/components/event/EventForm.vue` - Reusable form with tap-based pickers
- `app/pages/create.vue` - Create event page
- `server/api/events/index.post.ts` - Event creation endpoint

### RSVP Flow
- `app/pages/e/[slug]/index.vue` - Event detail with RSVP UI
- `server/api/events/[slug]/rsvp.post.ts` - RSVP submission

## API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /api/auth/firebase-login | No | Verify token, sync user |
| GET | /api/auth/me | Yes | Get current user |
| PATCH | /api/auth/profile | Yes | Update name/nickname |
| GET | /api/events | Yes | List user's events |
| POST | /api/events | Yes | Create event |
| GET | /api/events/[slug] | No* | Get event details |
| PATCH | /api/events/[slug] | Yes | Update event (organizer) |
| DELETE | /api/events/[slug] | Yes | Delete event (organizer) |
| POST | /api/events/[slug]/rsvp | Yes | Submit/update RSVP |
| GET | /api/events/[slug]/rsvps | Yes | Get full RSVP list (organizer) |

*Public events visible to all; authenticated users see their own RSVP status

## Development Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm db:migrate       # Run Prisma migrations
pnpm db:push          # Push schema changes
pnpm db:studio        # Open Prisma Studio
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Firebase Client (Public)
NUXT_PUBLIC_FIREBASE_API_KEY=
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NUXT_PUBLIC_FIREBASE_PROJECT_ID=
NUXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (Server)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

## UI Component Patterns

### Tap-to-Select Horizontal Scrollers
Used for dates, times, durations. See `EventForm.vue`:
```vue
<div class="flex gap-2 overflow-x-auto pb-2 px-4 scrollbar-hide">
  <button
    v-for="item in items"
    @click="selected = item.value"
    class="flex-shrink-0 ... rounded-2xl transition-all duration-200 active:scale-95"
    :class="[selected === item.value ? 'bg-gradient-to-br from-teal-400 to-teal-600' : 'bg-white']"
  >
```

### Large Selection Cards
Used for RSVP responses. See `pages/e/[slug]/index.vue`:
```vue
<button
  class="relative p-5 rounded-2xl border-2 transition-all text-left"
  :class="[
    selectedStatus === 'IN'
      ? 'border-teal-500 bg-teal-50'
      : 'border-gray-200 hover:border-teal-300'
  ]"
>
```

### Fixed Bottom CTA
For primary actions on full pages:
```vue
<div class="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-8 z-40">
  <UButton size="xl" block class="h-20 rounded-2xl shadow-xl">
```

## Notes for Future Development

1. **Sport Type**: Currently hardcoded to "pickleball" during creation. The schema supports any sport type.

2. **Guest RSVPs**: Schema supports RSVPs without user accounts (guestName, guestPhone), but UI currently requires authentication.

3. **WAITLIST Status**: Defined in schema but not yet implemented in UI.

4. **Groups Feature**: Partially implemented. Groups can be created, joined (public), but not yet used to invite members to events.

5. **Sharing**: Events can be shared via SMS/email links. The share card generates proper URLs.

## Style Guidelines

- Use Nuxt UI components (`UButton`, `UInput`, `UCard`, etc.)
- Prefer gradients over flat colors for primary actions
- Always include `active:scale-95` or `active:scale-[0.98]` for tap feedback
- Use `transition-all duration-200` for smooth interactions
- Icons from Heroicons via `i-heroicons-*` classes
- Dark mode support with `dark:` variants

## Common Nuxt UI Components Used

| Component | Usage | Notes |
|-----------|-------|-------|
| `UButton` | CTAs, actions | Use `size="xl"` for touch, `block` for full-width |
| `UInput` | Text input | Use `size="xl"`, add `icon` prop for leading icon |
| `UTextarea` | Multi-line text | Use `size="xl"`, `rows` prop |
| `UIcon` | Icons | `i-heroicons-{name}` or `i-heroicons-{name}-solid` |
| `UDropdownMenu` | User menus | Use for navigation, NOT for form selection |
| `UAlert` | Banners | `variant="soft"`, various `color` options |
| `UCard` | Content containers | Rarely used - prefer custom styled divs |
| `USlideover` | Side panels | For edit forms, detail views |
| `UModal` | Dialogs | For auth, confirmations |

## File Naming Conventions

- Pages: `kebab-case.vue` or `[param].vue` for dynamic routes
- Components: `PascalCase.vue`
- Composables: `useCamelCase.ts`
- Stores: `camelCase.ts`
- API routes: `method.ts` (e.g., `index.get.ts`, `index.post.ts`)

## Testing Events Locally

1. Create event at `/create`
2. Copy the generated slug from URL (`/e/{slug}`)
3. Open in incognito to test RSVP as different user
4. Use Prisma Studio (`pnpm db:studio`) to inspect data

## Debugging Tips

- Check browser console for client-side errors
- Check terminal for server-side Nuxt errors
- Use Vue DevTools for component state inspection
- Pinia DevTools for store state
- Firebase console for auth issues
