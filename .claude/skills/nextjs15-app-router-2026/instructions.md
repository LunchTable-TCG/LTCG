---
name: nextjs15-app-router-2026
description: "Next.js 15 App Router best practices for 2026 - Server/Client Components, data fetching, caching, routing, and performance optimization"
allowed-tools: [Bash, Read, Write, Edit, Glob, Grep, Task, TodoWrite, mcp__context7__query-docs]
---

# Next.js 15 App Router Best Practices (2026)

Based on official Next.js 15.1.8 documentation and Context7 library data (January 2026).

## Core Principles

1. **Server Components by Default** - Use "use client" only when necessary
2. **Fetch on the Server** - Data fetching in Server Components, not Client Components
3. **Strategic Caching** - Understand and control Next.js caching layers
4. **Type Safety** - Leverage TypeScript for props and API responses
5. **Performance First** - Optimize bundle size and rendering strategy

---

## Server vs Client Components

### Default: Server Components

**All components in `app/` are Server Components by default.**

```tsx
// app/dashboard/page.tsx
// ✅ Server Component (default) - can fetch data directly

async function getUserData() {
  const res = await fetch('https://api.example.com/user')
  return res.json()
}

export default async function DashboardPage() {
  const user = await getUserData()

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <UserStats stats={user.stats} />
    </div>
  )
}
```

**Benefits:**
- Fetch data on server
- Access backend resources directly
- Smaller client bundle
- Better SEO

### When to Use "use client"

Add `"use client"` at the top of a file only when you need:

1. **React Hooks** (useState, useEffect, useContext, etc.)
2. **Event Handlers** (onClick, onChange, etc.)
3. **Browser APIs** (localStorage, window, navigator, etc.)
4. **Third-party libraries** that rely on React hooks or browser APIs

```tsx
// components/Counter.tsx
"use client"

import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  )
}
```

### Composition Pattern: Place "use client" Boundaries Strategically

**❌ Anti-pattern: Marking entire tree as Client Component**

```tsx
"use client"  // ❌ BAD: Entire page is now client-side

import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Content } from './Content'

export default function Page() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <Header />  {/* Unnecessarily client-rendered */}
      <Sidebar />  {/* Unnecessarily client-rendered */}
      <Content isOpen={isOpen} setIsOpen={setIsOpen} />
    </div>
  )
}
```

**✅ Good: Push "use client" down to leaf components**

```tsx
// app/page.tsx
// ✅ Server Component

import { Header } from './Header'  // Server Component
import { Sidebar } from './Sidebar'  // Server Component
import { InteractiveContent } from './InteractiveContent'  // Client Component

export default function Page() {
  return (
    <div>
      <Header />
      <Sidebar />
      <InteractiveContent />
    </div>
  )
}
```

```tsx
// components/InteractiveContent.tsx
"use client"  // ✅ GOOD: Only this component is client-rendered

import { useState } from 'react'

export function InteractiveContent() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>
        Toggle
      </button>
      {isOpen && <p>Content</p>}
    </div>
  )
}
```

**Benefits:**
- Reduces client JavaScript bundle
- Improves page load performance
- Better server-side rendering

---

## Data Fetching Strategies

### 1. Static Data (Cached by Default)

```tsx
// app/blog/page.tsx
export default async function BlogPage() {
  // ✅ Cached until manually invalidated (like getStaticProps)
  // `force-cache` is the default and can be omitted
  const posts = await fetch('https://api.example.com/posts', {
    cache: 'force-cache'
  })

  return <PostList posts={await posts.json()} />
}
```

### 2. Dynamic Data (Refetch Every Request)

```tsx
// app/dashboard/page.tsx
export default async function DashboardPage() {
  // ✅ Refetch on every request (like getServerSideProps)
  const data = await fetch('https://api.example.com/live-data', {
    cache: 'no-store'
  })

  return <Dashboard data={await data.json()} />
}
```

### 3. Revalidated Data (Time-Based Refresh)

```tsx
// app/news/page.tsx
export default async function NewsPage() {
  // ✅ Cache for 10 seconds, then revalidate (like getStaticProps with revalidate)
  const news = await fetch('https://api.example.com/news', {
    next: { revalidate: 10 }
  })

  return <NewsList items={await news.json()} />
}
```

### 4. Parallel Data Fetching

```tsx
// app/profile/[id]/page.tsx
export default async function ProfilePage({ params }: { params: { id: string } }) {
  // ✅ Fetch in parallel for better performance
  const [user, posts, followers] = await Promise.all([
    fetch(`https://api.example.com/users/${params.id}`).then(r => r.json()),
    fetch(`https://api.example.com/users/${params.id}/posts`).then(r => r.json()),
    fetch(`https://api.example.com/users/${params.id}/followers`).then(r => r.json()),
  ])

  return (
    <div>
      <UserProfile user={user} />
      <UserPosts posts={posts} />
      <FollowersList followers={followers} />
    </div>
  )
}
```

### 5. Streaming with Suspense

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react'

async function RevenueData() {
  const data = await fetch('https://api.example.com/revenue')
  return <RevenueChart data={await data.json()} />
}

async function UserData() {
  const data = await fetch('https://api.example.com/users')
  return <UserTable data={await data.json()} />
}

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* ✅ Stream components independently */}
      <Suspense fallback={<RevenueChartSkeleton />}>
        <RevenueData />
      </Suspense>

      <Suspense fallback={<UserTableSkeleton />}>
        <UserData />
      </Suspense>
    </div>
  )
}
```

---

## Route Handlers (API Routes)

### Basic Route Handler

```typescript
// app/api/users/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const users = await fetchUsersFromDB()
  return NextResponse.json({ users })
}

export async function POST(request: Request) {
  const body = await request.json()
  const newUser = await createUser(body)
  return NextResponse.json({ user: newUser }, { status: 201 })
}
```

### Dynamic Route Handler

```typescript
// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await fetchUserById(params.id)

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user })
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json()
  const updatedUser = await updateUser(params.id, body)
  return NextResponse.json({ user: updatedUser })
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  await deleteUser(params.id)
  return NextResponse.json({ success: true }, { status: 204 })
}
```

### ⚠️ Important: Do NOT Call Route Handlers from Server Components

**❌ Anti-pattern:**

```tsx
// app/dashboard/page.tsx
export default async function DashboardPage() {
  // ❌ BAD: Unnecessary HTTP request from server to server
  const response = await fetch('http://localhost:3000/api/users')
  const users = await response.json()

  return <UserList users={users} />
}
```

**✅ Good: Access backend resources directly**

```tsx
// app/dashboard/page.tsx
import { getUsers } from '@/lib/db'

export default async function DashboardPage() {
  // ✅ GOOD: Direct database access in Server Component
  const users = await getUsers()

  return <UserList users={users} />
}
```

**When to use Route Handlers:**
- Called from Client Components
- External webhook endpoints
- External service integrations
- CORS requirements

---

## Middleware

Middleware runs before requests are completed. Use for:
- Authentication checks
- Redirects
- Header/cookie manipulation
- A/B testing
- Bot detection

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check authentication
  const token = request.cookies.get('auth-token')

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Add custom header
  const response = NextResponse.next()
  response.headers.set('x-custom-header', 'value')

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
```

---

## Caching Strategies

Next.js 15 has multiple caching layers. Understanding them is critical.

### 1. Request Memoization (Automatic)

Deduplicates identical `fetch` requests in a single render pass.

```tsx
// These two calls to the same URL will only make ONE network request
async function Header() {
  const user = await fetch('https://api.example.com/user')
  return <div>{user.name}</div>
}

async function Sidebar() {
  const user = await fetch('https://api.example.com/user')  // Cached!
  return <div>{user.avatar}</div>
}
```

### 2. Data Cache (`fetch` cache option)

Controls HTTP caching behavior.

```typescript
// Static (default)
fetch(url, { cache: 'force-cache' })  // Cache indefinitely

// Dynamic
fetch(url, { cache: 'no-store' })  // Never cache

// Revalidated
fetch(url, { next: { revalidate: 60 } })  // Cache for 60 seconds
```

### 3. Full Route Cache

Next.js caches the rendered output of routes at build time.

```typescript
// app/blog/page.tsx

// Static (cached at build time)
export default async function BlogPage() {
  const posts = await fetch('https://api.example.com/posts')
  return <PostList posts={await posts.json()} />
}

// Opt out of caching
export const dynamic = 'force-dynamic'

// Or use revalidation
export const revalidate = 3600  // Revalidate every hour
```

### 4. Router Cache (Client-side)

Next.js caches route segments on the client for instant navigation.

**Manual Invalidation:**

```typescript
"use client"

import { useRouter } from 'next/navigation'

export function RefreshButton() {
  const router = useRouter()

  return (
    <button onClick={() => router.refresh()}>
      Refresh
    </button>
  )
}
```

### Revalidation Patterns

**1. Time-based Revalidation**

```typescript
// app/blog/page.tsx
export const revalidate = 3600  // Revalidate every hour

export default async function BlogPage() {
  const posts = await fetch('https://api.example.com/posts')
  return <PostList posts={await posts.json()} />
}
```

**2. On-Demand Revalidation**

```typescript
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { path, tag } = await request.json()

  if (path) {
    revalidatePath(path)
  }

  if (tag) {
    revalidateTag(tag)
  }

  return Response.json({ revalidated: true, now: Date.now() })
}
```

**Using tags:**

```typescript
// app/blog/page.tsx
export default async function BlogPage() {
  const posts = await fetch('https://api.example.com/posts', {
    next: { tags: ['posts'] }
  })

  return <PostList posts={await posts.json()} />
}

// Revalidate from API route or Server Action
revalidateTag('posts')
```

---

## Performance Optimization

### 1. Minimize Client JavaScript Bundle

- Use Server Components by default
- Push `"use client"` boundaries down to leaf components
- Lazy load heavy Client Components

```tsx
// app/page.tsx
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false  // Skip SSR if not needed
})

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <HeavyChart />
    </div>
  )
}
```

### 2. Image Optimization

```tsx
import Image from 'next/image'

export function Hero() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero image"
      width={1200}
      height={600}
      priority  // Load immediately for LCP
      placeholder="blur"
      blurDataURL="data:image/..."
    />
  )
}
```

### 3. Font Optimization

```typescript
// app/layout.tsx
import { Inter, Roboto_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-mono',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

### 4. Metadata Optimization (SEO)

```typescript
// app/blog/[slug]/page.tsx
import { Metadata } from 'next'

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const post = await getPost(params.slug)

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  }
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  // ...
}
```

---

## TypeScript Patterns

### Typed Route Parameters

```typescript
// app/blog/[slug]/page.tsx
interface PageProps {
  params: { slug: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function BlogPost({ params, searchParams }: PageProps) {
  const post = await getPost(params.slug)
  const commentsPage = Number(searchParams.page) || 1

  return (
    <div>
      <h1>{post.title}</h1>
      <Comments postId={post.id} page={commentsPage} />
    </div>
  )
}
```

### Typed Route Handlers

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateUserSchema.parse(body)

    const user = await createUser(validatedData)

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## Common Pitfalls to Avoid

### ❌ 1. Calling Route Handlers from Server Components

Use direct backend access instead.

### ❌ 2. Over-using "use client"

Push client boundaries down to leaf components.

### ❌ 3. Not Understanding Caching

Learn the 4 caching layers and control them explicitly.

### ❌ 4. Forgetting Error Boundaries

```tsx
// app/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

### ❌ 5. Not Using Loading States

```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return <DashboardSkeleton />
}
```

---

## Quick Reference

### File Conventions

| File | Purpose |
|------|---------|
| `page.tsx` | Route UI |
| `layout.tsx` | Shared UI for route segments |
| `loading.tsx` | Loading UI (Suspense fallback) |
| `error.tsx` | Error UI (Error boundary) |
| `not-found.tsx` | 404 UI |
| `route.ts` | API endpoint (Route Handler) |
| `middleware.ts` | Request middleware |
| `template.tsx` | Re-rendered layout (for animations) |

### Data Fetching

| Pattern | Fetch Option | Use Case |
|---------|--------------|----------|
| Static | `{ cache: 'force-cache' }` | Rarely changing data |
| Dynamic | `{ cache: 'no-store' }` | Real-time data |
| Revalidated | `{ next: { revalidate: 60 } }` | Periodically updated data |

### Component Types

| Type | Where | Can Use Hooks | Can Fetch Data |
|------|-------|---------------|----------------|
| Server Component | Default | ❌ No | ✅ Yes (async) |
| Client Component | `"use client"` | ✅ Yes | ✅ Yes (via hooks) |

---

## Resources

- **Official Docs**: https://nextjs.org/docs
- **App Router Migration**: https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration
- **Context7 Next.js**: /vercel/next.js/v15.1.8
