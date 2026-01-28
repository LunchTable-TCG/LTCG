---
name: react19-patterns-2026
description: "React 19 best practices for 2026 - hooks patterns, useEffect guidelines, performance optimization, TypeScript integration, and anti-patterns to avoid"
allowed-tools: [Bash, Read, Write, Edit, Glob, Grep, Task, TodoWrite, mcp__context7__query-docs]
---

# React 19 Patterns & Best Practices (2026)

Based on official React documentation (react.dev) and Context7 library data (January 2026).

## Core Principles

1. **Hooks at Top Level** - Never call hooks conditionally, in loops, or after returns
2. **useEffect Minimally** - Prefer derived state and event handlers
3. **Memoize Wisely** - Use useMemo/useCallback only when necessary
4. **Server Actions** - Leverage React Server Actions with useTransition
5. **Type Safety** - Embrace TypeScript for props and state

---

## Hooks Patterns

### Rules of Hooks

**✅ Always call hooks at the top level of your component**

```typescript
function Good({ cond }: { cond: boolean }) {
  // ✅ GOOD: Hooks at top level
  const [state, setState] = useState(0)
  const theme = useContext(ThemeContext)

  useEffect(() => {
    // Effect logic
  }, [])

  if (cond) {
    return <div>Conditional render</div>
  }

  return <div>Normal render</div>
}
```

**❌ Never call hooks conditionally, in loops, or after returns**

```typescript
function Bad({ cond }: { cond: boolean }) {
  if (cond) {
    // ❌ BAD: Hook inside condition
    const theme = useContext(ThemeContext)
  }

  for (let i = 0; i < 10; i++) {
    // ❌ BAD: Hook inside loop
    const theme = useContext(ThemeContext)
  }

  if (cond) {
    return <div>Early return</div>
  }

  // ❌ BAD: Hook after conditional return
  const theme = useContext(ThemeContext)

  function handleClick() {
    // ❌ BAD: Hook inside event handler
    const theme = useContext(ThemeContext)
  }

  const style = useMemo(() => {
    // ❌ BAD: Hook inside useMemo
    const theme = useContext(ThemeContext)
    return createStyle(theme)
  }, [])

  return <div>Render</div>
}
```

**❌ Never use hooks in class components or try/catch blocks**

```typescript
class Bad extends React.Component {
  render() {
    // ❌ BAD: Hook in class component
    useEffect(() => {})
    return <div>Render</div>
  }
}

function Bad() {
  try {
    // ❌ BAD: Hook in try/catch
    const [x, setX] = useState(0)
  } catch {
    const [x, setX] = useState(1)
  }
}
```

---

## useEffect Guidelines

### When NOT to Use useEffect

**❌ Anti-pattern: Using useEffect for derived state**

```typescript
function Bad({ items }: { items: Item[] }) {
  const [selectedItems, setSelectedItems] = useState<Item[]>([])

  // ❌ BAD: Don't use useEffect to compute derived state
  useEffect(() => {
    setSelectedItems(items.filter(item => item.selected))
  }, [items])

  return <ItemList items={selectedItems} />
}
```

**✅ Good: Compute during render**

```typescript
function Good({ items }: { items: Item[] }) {
  // ✅ GOOD: Compute derived state directly
  const selectedItems = items.filter(item => item.selected)

  return <ItemList items={selectedItems} />
}
```

**✅ Good: Use useMemo for expensive computations**

```typescript
function Good({ items }: { items: Item[] }) {
  // ✅ GOOD: Memoize expensive computation
  const selectedItems = useMemo(
    () => items.filter(item => item.selected),
    [items]
  )

  return <ItemList items={selectedItems} />
}
```

### When TO Use useEffect

**✅ Synchronizing with external systems**

```typescript
function ChatRoom({ roomId }: { roomId: string }) {
  useEffect(() => {
    // ✅ GOOD: Connect to external chat service
    const connection = createConnection({ roomId })
    connection.connect()

    return () => {
      // ✅ GOOD: Cleanup on unmount or roomId change
      connection.disconnect()
    }
  }, [roomId])

  return <div>Chat Room: {roomId}</div>
}
```

### Avoid Object/Array Dependencies

**❌ Anti-pattern: Object literal in dependencies causes infinite loop**

```typescript
function Bad({ roomId }: { roomId: string }) {
  const [message, setMessage] = useState('')

  const options = {
    serverUrl: 'https://localhost:1234',
    roomId: roomId
  }

  useEffect(() => {
    const connection = createConnection(options)
    connection.connect()
    return () => connection.disconnect()
  }, [options]) // ❌ BAD: options changes every render!

  return <input value={message} onChange={e => setMessage(e.target.value)} />
}
```

**✅ Option 1: Move object inside useEffect**

```typescript
function Good({ roomId }: { roomId: string }) {
  const [message, setMessage] = useState('')

  useEffect(() => {
    // ✅ GOOD: Object created inside effect
    const options = {
      serverUrl: 'https://localhost:1234',
      roomId: roomId
    }

    const connection = createConnection(options)
    connection.connect()
    return () => connection.disconnect()
  }, [roomId]) // ✅ Only depends on primitive roomId

  return <input value={message} onChange={e => setMessage(e.target.value)} />
}
```

**✅ Option 2: Use useMemo to stabilize object reference**

```typescript
function Good({ roomId }: { roomId: string }) {
  const [message, setMessage] = useState('')

  const options = useMemo(() => ({
    serverUrl: 'https://localhost:1234',
    roomId: roomId
  }), [roomId])

  useEffect(() => {
    const connection = createConnection(options)
    connection.connect()
    return () => connection.disconnect()
  }, [options]) // ✅ options stable unless roomId changes

  return <input value={message} onChange={e => setMessage(e.target.value)} />
}
```

### useEffect Best Practices

**✅ Separate unrelated effects**

```typescript
function Good({ roomId }: { roomId: string }) {
  // ✅ GOOD: Two separate effects for different purposes

  useEffect(() => {
    const connection = createConnection({ roomId })
    connection.connect()
    return () => connection.disconnect()
  }, [roomId])

  useEffect(() => {
    post('/analytics/event', { eventName: 'visit_chat', roomId })
  }, [roomId])

  return <div>Chat Room: {roomId}</div>
}
```

**❌ Don't combine unrelated logic in one effect**

```typescript
function Bad({ roomId }: { roomId: string }) {
  // ❌ BAD: Mixing connection and analytics
  useEffect(() => {
    const connection = createConnection({ roomId })
    connection.connect()

    post('/analytics/event', { eventName: 'visit_chat', roomId })

    return () => connection.disconnect()
  }, [roomId])

  return <div>Chat Room: {roomId}</div>
}
```

---

## Performance Optimization

### useMemo and useCallback

**When to use:**
- Expensive computations
- Preserving reference equality for child component props
- Dependencies in useEffect

**When NOT to use:**
- Simple computations (addition, filtering small arrays)
- Every single value/function (premature optimization)

```typescript
import { useMemo, useCallback } from 'react'

function ProductPage({ productId, referrer }: Props) {
  const product = useData('/product/' + productId)

  // ✅ useMemo: Cache expensive computation result
  const requirements = useMemo(() => {
    return computeRequirements(product) // Expensive operation
  }, [product])

  // ✅ useCallback: Cache function itself for referential equality
  const handleSubmit = useCallback((orderDetails: OrderDetails) => {
    post('/product/' + productId + '/buy', {
      referrer,
      orderDetails,
    })
  }, [productId, referrer])

  return (
    <div>
      <ShippingForm requirements={requirements} onSubmit={handleSubmit} />
    </div>
  )
}
```

**❌ Don't memoize everything**

```typescript
function Bad({ a, b }: { a: number, b: number }) {
  // ❌ BAD: Premature optimization for simple addition
  const sum = useMemo(() => a + b, [a, b])

  // ❌ BAD: Simple function doesn't need memoization
  const handleClick = useCallback(() => {
    console.log('clicked')
  }, [])

  return <div onClick={handleClick}>{sum}</div>
}
```

**✅ Just compute directly**

```typescript
function Good({ a, b }: { a: number, b: number }) {
  // ✅ GOOD: Simple computation, no memoization needed
  const sum = a + b

  // ✅ GOOD: Define function normally
  const handleClick = () => {
    console.log('clicked')
  }

  return <div onClick={handleClick}>{sum}</div>
}
```

### React.memo for Component Memoization

**Use when:**
- Component re-renders often with same props
- Component is expensive to render
- Parent re-renders frequently

```typescript
import { memo } from 'react'

interface ExpensiveChartProps {
  data: ChartData[]
  config: ChartConfig
}

// ✅ Wrap expensive component in memo
const ExpensiveChart = memo(function ExpensiveChart({
  data,
  config
}: ExpensiveChartProps) {
  // Expensive rendering logic
  return <canvas>{/* chart rendering */}</canvas>
})

export function Dashboard() {
  const [count, setCount] = useState(0)
  const chartData = useChartData()
  const chartConfig = useMemo(() => ({ theme: 'dark' }), [])

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
      {/* ✅ ExpensiveChart won't re-render when count changes */}
      <ExpensiveChart data={chartData} config={chartConfig} />
    </div>
  )
}
```

---

## Server Actions with useTransition

**Pattern: Optimistic UI updates with pending state**

```tsx
"use client"

import { useState, useTransition } from 'react'
import { updateName } from './actions'

export function UpdateNameForm() {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const submitAction = async () => {
    startTransition(async () => {
      const { error } = await updateName(name)
      if (error) {
        setError(error)
      } else {
        setName('')
        setError(null)
      }
    })
  }

  return (
    <form action={submitAction}>
      <input
        type="text"
        name="name"
        value={name}
        onChange={e => setName(e.target.value)}
        disabled={isPending}
      />
      {isPending && <span>Updating...</span>}
      {error && <span className="error">Failed: {error}</span>}
      <button type="submit" disabled={isPending || !name.trim()}>
        Update
      </button>
    </form>
  )
}
```

```typescript
// actions.ts
"use server"

export async function updateName(name: string) {
  try {
    await db.user.update({ name })
    return { success: true }
  } catch (error) {
    return { error: 'Failed to update name' }
  }
}
```

---

## TypeScript Integration

### Typed Component Props

```typescript
interface UserCardProps {
  user: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  onEdit?: (userId: string) => void
  variant?: 'default' | 'compact' | 'detailed'
}

export function UserCard({ user, onEdit, variant = 'default' }: UserCardProps) {
  return (
    <div className={`user-card user-card--${variant}`}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      {onEdit && (
        <button onClick={() => onEdit(user.id)}>Edit</button>
      )}
    </div>
  )
}
```

### Typed Hooks

```typescript
import { useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  email: string
}

export function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchUser() {
      try {
        setLoading(true)
        const response = await fetch(`/api/users/${userId}`)
        if (!response.ok) throw new Error('Failed to fetch user')

        const data: User = await response.json()

        if (!cancelled) {
          setUser(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchUser()

    return () => {
      cancelled = true
    }
  }, [userId])

  return { user, loading, error }
}
```

### Generic Components

```typescript
interface SelectProps<T> {
  options: T[]
  value: T | null
  onChange: (value: T) => void
  getLabel: (option: T) => string
  getValue: (option: T) => string | number
}

export function Select<T>({
  options,
  value,
  onChange,
  getLabel,
  getValue,
}: SelectProps<T>) {
  return (
    <select
      value={value ? getValue(value) : ''}
      onChange={e => {
        const selected = options.find(opt => getValue(opt) === e.target.value)
        if (selected) onChange(selected)
      }}
    >
      <option value="">Select...</option>
      {options.map(option => (
        <option key={getValue(option)} value={getValue(option)}>
          {getLabel(option)}
        </option>
      ))}
    </select>
  )
}

// Usage
interface User {
  id: number
  name: string
}

function UserSelector() {
  const [selected, setSelected] = useState<User | null>(null)
  const users: User[] = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ]

  return (
    <Select<User>
      options={users}
      value={selected}
      onChange={setSelected}
      getLabel={user => user.name}
      getValue={user => user.id}
    />
  )
}
```

---

## Error Boundaries

**Class-based Error Boundary (still required in React 19)**

```typescript
import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div role="alert">
          <h2>Something went wrong</h2>
          <pre>{this.state.error?.message}</pre>
        </div>
      )
    }

    return this.props.children
  }
}

// Usage
function App() {
  return (
    <ErrorBoundary
      fallback={<ErrorFallback />}
      onError={(error, info) => {
        logErrorToService(error, info)
      }}
    >
      <MyComponent />
    </ErrorBoundary>
  )
}
```

---

## Common Anti-Patterns to Avoid

### ❌ 1. Mutating State Directly

```typescript
function Bad() {
  const [items, setItems] = useState<string[]>(['a', 'b', 'c'])

  const handleAdd = () => {
    // ❌ BAD: Mutating state
    items.push('d')
    setItems(items)
  }

  return <button onClick={handleAdd}>Add</button>
}
```

**✅ Good: Create new array**

```typescript
function Good() {
  const [items, setItems] = useState<string[]>(['a', 'b', 'c'])

  const handleAdd = () => {
    // ✅ GOOD: Create new array
    setItems([...items, 'd'])
  }

  return <button onClick={handleAdd}>Add</button>
}
```

### ❌ 2. setState in Render (Causes Infinite Loop)

```typescript
function Bad({ count }: { count: number }) {
  const [doubledCount, setDoubledCount] = useState(0)

  // ❌ BAD: setState during render causes infinite loop
  setDoubledCount(count * 2)

  return <div>{doubledCount}</div>
}
```

**✅ Good: Compute during render**

```typescript
function Good({ count }: { count: number }) {
  // ✅ GOOD: Just compute directly
  const doubledCount = count * 2

  return <div>{doubledCount}</div>
}
```

### ❌ 3. Missing Cleanup in useEffect

```typescript
function Bad({ url }: { url: string }) {
  useEffect(() => {
    const subscription = subscribeToData(url, (data) => {
      console.log(data)
    })
    // ❌ BAD: No cleanup, causes memory leak
  }, [url])

  return <div>Subscribed</div>
}
```

**✅ Good: Always cleanup subscriptions/timers**

```typescript
function Good({ url }: { url: string }) {
  useEffect(() => {
    const subscription = subscribeToData(url, (data) => {
      console.log(data)
    })

    // ✅ GOOD: Cleanup function
    return () => {
      subscription.unsubscribe()
    }
  }, [url])

  return <div>Subscribed</div>
}
```

### ❌ 4. Prop Drilling

```typescript
// ❌ BAD: Passing props through many levels
function App() {
  const [user, setUser] = useState(null)

  return <Layout user={user} setUser={setUser} />
}

function Layout({ user, setUser }) {
  return <Sidebar user={user} setUser={setUser} />
}

function Sidebar({ user, setUser }) {
  return <UserMenu user={user} setUser={setUser} />
}

function UserMenu({ user, setUser }) {
  // Finally used here
  return <div>{user?.name}</div>
}
```

**✅ Good: Use Context for deeply nested props**

```typescript
import { createContext, useContext, useState, ReactNode } from 'react'

interface User {
  name: string
  email: string
}

interface UserContextValue {
  user: User | null
  setUser: (user: User | null) => void
}

const UserContext = createContext<UserContextValue | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}

// Usage - no prop drilling
function App() {
  return (
    <UserProvider>
      <Layout />
    </UserProvider>
  )
}

function Layout() {
  return <Sidebar />
}

function Sidebar() {
  return <UserMenu />
}

function UserMenu() {
  const { user } = useUser() // ✅ Direct access
  return <div>{user?.name}</div>
}
```

---

## Quick Reference

### Hook Constraints

| Hook | Top Level | Conditional | Loop | Event Handler | Class |
|------|-----------|-------------|------|---------------|-------|
| useState | ✅ | ❌ | ❌ | ❌ | ❌ |
| useEffect | ✅ | ❌ | ❌ | ❌ | ❌ |
| useContext | ✅ | ❌ | ❌ | ❌ | ❌ |
| useMemo | ✅ | ❌ | ❌ | ❌ | ❌ |
| useCallback | ✅ | ❌ | ❌ | ❌ | ❌ |
| useRef | ✅ | ❌ | ❌ | ❌ | ❌ |
| useTransition | ✅ | ❌ | ❌ | ❌ | ❌ |

### When to Use Each Approach

| Need | Solution |
|------|----------|
| Derived state | Compute during render |
| Expensive computation | useMemo |
| Stable function reference | useCallback |
| Prevent re-render | React.memo |
| External system sync | useEffect |
| Global state | Context or state management library |
| Form submission | Server Actions + useTransition |

---

## Resources

- **Official Docs**: https://react.dev
- **Rules of Hooks**: https://react.dev/reference/rules/rules-of-hooks
- **useEffect Guide**: https://react.dev/learn/synchronizing-with-effects
- **Context7 React**: /websites/react_dev
