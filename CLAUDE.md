# LTCG Project Rules

## TypeScript Return Type Inference

**Prefer TypeScript inference over explicit return types.** Only add explicit return types when they provide meaningful value.

### When to OMIT Return Types (Use Inference)

```typescript
// Simple functions - inference handles these
function getUserName(user: User) {
  return user.name || "Unknown";
}

// Arrow functions and callbacks
const handleClick = (e: MouseEvent) => {
  e.preventDefault();
  doSomething();
};

// Async functions - Promise<T> is inferred
async function fetchUser(id: string) {
  const user = await db.get(id);
  return user;
}

// React components - JSX.Element is inferred
function UserCard({ user }: { user: User }) {
  return <div>{user.name}</div>;
}

// Convex handlers - use `returns` validator for runtime validation
export const getUser = query({
  args: { id: v.id("users") },
  returns: v.object({ name: v.string() }), // Runtime validation, not TS
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Object/array literals - type is obvious
function getConfig() {
  return { debug: true, timeout: 5000 };
}

// When calling well-typed functions
function processData(input: string) {
  return parseJSON(input); // Return type flows from parseJSON
}
```

### When to USE Explicit Return Types

```typescript
// 1. Type guards (language requirement)
function isUser(value: unknown): value is User {
  return typeof value === "object" && value !== null && "id" in value;
}

// 2. Assertion functions (language requirement)
function assertUser(value: unknown): asserts value is User {
  if (!isUser(value)) throw new Error("Not a user");
}

// 3. Overloaded functions
function parse(input: string): number;
function parse(input: string[]): number[];
function parse(input: string | string[]): number | number[] {
  // implementation
}

// 4. Public API contracts (exported library functions)
export function calculateElo(winner: number, loser: number): { newWinner: number; newLoser: number } {
  // When the return type IS the API contract
}

// 5. Recursive functions where inference fails
function traverse(node: Node): Node[] {
  return [node, ...node.children.flatMap(traverse)];
}

// 6. Functions returning union types for documentation
function getElement(archetype: string): "fire" | "water" | "earth" | "wind" | "neutral" {
  // Union type documents valid return values
}

// 7. Void for side-effect-only functions (explicit intent)
function logError(message: string): void {
  console.error(message);
}

// 8. Never for functions that always throw
function fail(message: string): never {
  throw new Error(message);
}
```

### Codebase-Specific Patterns

**Convex Functions**: Use the `returns` validator instead of TypeScript return types:
```typescript
// Correct - runtime validation
export const myQuery = query({
  args: {},
  returns: v.array(v.object({ id: v.id("users") })),
  handler: async (ctx) => { /* ... */ },
});

// Avoid - redundant with returns validator
handler: async (ctx): Promise<{ id: Id<"users"> }[]> => { /* ... */ }
```

**React Hooks**: Let inference work:
```typescript
// Good - inference handles it
function useGameState(gameId: string) {
  const [state, setState] = useState(initialState);
  return { state, setState, isLoading };
}

// Unnecessary - adds noise
function useGameState(gameId: string): { state: GameState; setState: Dispatch<SetStateAction<GameState>>; isLoading: boolean } {
```

**Helper Functions**: Only annotate when the return type isn't obvious from the implementation:
```typescript
// Inference is sufficient
function formatCurrency(amount: number) {
  return `$${amount.toFixed(2)}`;
}

// Annotation adds clarity for complex logic
function parseCardEffect(text: string): ParsedEffect | null {
  // Complex parsing logic where return type documents intent
}
```

### Migration Notes

When refactoring existing code:
1. Remove return types where inference suffices
2. Keep return types on public API boundaries
3. Keep return types where they serve as documentation for complex logic
4. Always keep type guards, assertion functions, and overloads annotated

### ESLint Configuration

If using `@typescript-eslint/explicit-function-return-type`, configure it to allow inference:
```json
{
  "@typescript-eslint/explicit-function-return-type": ["error", {
    "allowExpressions": true,
    "allowTypedFunctionExpressions": true,
    "allowHigherOrderFunctions": true,
    "allowDirectConstAssertionInArrowFunctions": true,
    "allowConciseArrowFunctionExpressionsStartingWithVoid": true
  }]
}
```

---

## Additional Project Standards

See `apps/web/CLAUDE.md` for Bun-specific tooling instructions.

---

## Engineering Memory Loop

Use the project memory system in `docs/engineering` to continuously improve execution quality.

### Required cadence for substantial tasks

1. Review current memory before implementation:
   - `bun run eng:review`
2. Log at least one observation or decision after implementation:
   - `bun run eng:log -- observation "<title>" "<details>"`
   - `bun run eng:log -- decision "<title>" "<details>" "<impact>"`
3. If anything went wrong, log a mistake with explicit prevention:
   - `bun run eng:log -- mistake "<title>" "<what went wrong>" "<prevention rule>"`

### Memory files

- `docs/engineering/observations.md`
- `docs/engineering/mistakes.md`
- `docs/engineering/decisions.md`
- `docs/engineering/action-queue.md`
