/**
 * Type utilities test suite
 *
 * This file contains tests for the type utilities to ensure they compile correctly
 * and provide the expected type transformations.
 */

import { describe, expect, it } from "vitest";
import type {
  ArrayElement,
  Brand,
  MakeOptional,
  Maybe,
  Nullable,
  Optional,
  OptionalExcept,
  PickByType,
  RequireProps,
  Result,
  ValueOf,
} from "@/types/utils";

import {
  brand,
  err,
  hasKey,
  isBoolean,
  isDefined,
  isErr,
  isFunction,
  isNonEmptyArray,
  isNull,
  isNumber,
  isObject,
  isOk,
  isString,
  isUndefined,
  ok,
} from "@/types/utils";

// =============================================================================
// Type Tests (Compile-time checks)
// =============================================================================

describe("Type Utilities - Compile Time", () => {
  it("Nullable type", () => {
    type TestType = Nullable<string>;
    const validNull: TestType = null;
    const validString: TestType = "test";

    expect(validNull).toBeNull();
    expect(validString).toBe("test");
  });

  it("Optional type", () => {
    type TestType = Optional<string>;
    const validUndefined: TestType = undefined;
    const validString: TestType = "test";

    expect(validUndefined).toBeUndefined();
    expect(validString).toBe("test");
  });

  it("Maybe type", () => {
    type TestType = Maybe<string>;
    const validNull: TestType = null;
    const validUndefined: TestType = undefined;
    const validString: TestType = "test";

    expect(validNull).toBeNull();
    expect(validUndefined).toBeUndefined();
    expect(validString).toBe("test");
  });

  it("RequireProps type", () => {
    interface User {
      id?: string;
      name?: string;
    }

    type UserWithId = RequireProps<User, "id">;

    const user: UserWithId = {
      id: "123", // Required
      name: "John", // Optional
    };

    expect(user.id).toBe("123");
  });

  it("MakeOptional type", () => {
    interface User {
      id: string;
      name: string;
      email: string;
    }

    type PartialUser = MakeOptional<User, "email">;

    const user: PartialUser = {
      id: "123",
      name: "John",
      // email is optional
    };

    expect(user.id).toBe("123");
  });

  it("OptionalExcept type", () => {
    interface User {
      id: string;
      name: string;
      email: string;
    }

    type PartialUserWithId = OptionalExcept<User, "id">;

    const user: PartialUserWithId = {
      id: "123", // Required
      // name and email are optional
    };

    expect(user.id).toBe("123");
  });

  it("PickByType type", () => {
    interface TestObj {
      str: string;
      num: number;
      bool: boolean;
    }

    type StringProps = PickByType<TestObj, string>;
    // Should only have 'str' property

    const obj: StringProps = {
      str: "test",
    };

    expect(obj.str).toBe("test");
  });

  it("ArrayElement type", () => {
    type Users = Array<{ name: string }>;
    type User = ArrayElement<Users>;

    const user: User = { name: "John" };

    expect(user.name).toBe("John");
  });

  it("ValueOf type", () => {
    const Status = {
      ACTIVE: "active",
      IDLE: "idle",
      OFFLINE: "offline",
    } as const;

    type StatusValue = ValueOf<typeof Status>;

    const status: StatusValue = "active";

    expect(status).toBe("active");
  });
});

// =============================================================================
// Type Guard Tests (Runtime checks)
// =============================================================================

describe("Type Guards - Runtime", () => {
  it("isDefined - filters null and undefined", () => {
    const value: string | undefined = "test";
    const nullValue: string | null = null;
    const undefinedValue: string | undefined = undefined;

    expect(isDefined(value)).toBe(true);
    expect(isDefined(nullValue)).toBe(false);
    expect(isDefined(undefinedValue)).toBe(false);
  });

  it("isNull - checks for null", () => {
    expect(isNull(null)).toBe(true);
    expect(isNull(undefined)).toBe(false);
    expect(isNull("test")).toBe(false);
    expect(isNull(0)).toBe(false);
  });

  it("isUndefined - checks for undefined", () => {
    expect(isUndefined(undefined)).toBe(true);
    expect(isUndefined(null)).toBe(false);
    expect(isUndefined("test")).toBe(false);
    expect(isUndefined(0)).toBe(false);
  });

  it("isString - checks for string type", () => {
    expect(isString("test")).toBe(true);
    expect(isString(123)).toBe(false);
    expect(isString(null)).toBe(false);
    expect(isString(undefined)).toBe(false);
  });

  it("isNumber - checks for number type", () => {
    expect(isNumber(123)).toBe(true);
    expect(isNumber(123.45)).toBe(true);
    expect(isNumber(Number.NaN)).toBe(false); // NaN is excluded
    expect(isNumber("123")).toBe(false);
    expect(isNumber(null)).toBe(false);
  });

  it("isBoolean - checks for boolean type", () => {
    expect(isBoolean(true)).toBe(true);
    expect(isBoolean(false)).toBe(true);
    expect(isBoolean(1)).toBe(false);
    expect(isBoolean("true")).toBe(false);
  });

  it("isFunction - checks for function type", () => {
    expect(isFunction(() => {})).toBe(true);
    expect(isFunction(() => {})).toBe(true);
    expect(isFunction(async () => {})).toBe(true);
    expect(isFunction("function")).toBe(false);
    expect(isFunction(null)).toBe(false);
  });

  it("isObject - checks for object type (not null, not array)", () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ key: "value" })).toBe(true);
    expect(isObject([])).toBe(false);
    expect(isObject(null)).toBe(false);
    expect(isObject("object")).toBe(false);
  });

  it("isNonEmptyArray - checks for non-empty arrays", () => {
    expect(isNonEmptyArray([1, 2, 3])).toBe(true);
    expect(isNonEmptyArray(["test"])).toBe(true);
    expect(isNonEmptyArray([])).toBe(false);
  });

  it("hasKey - checks if object has a key", () => {
    const obj = { name: "John", age: 30 };

    expect(hasKey(obj, "name")).toBe(true);
    expect(hasKey(obj, "age")).toBe(true);
    expect(hasKey(obj, "email")).toBe(false);
  });
});

// =============================================================================
// Result Type Tests
// =============================================================================

describe("Result Types", () => {
  it("ok - creates success result", () => {
    const result = ok("success value");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("success value");
    }
  });

  it("err - creates failure result", () => {
    const result = err(new Error("Something went wrong"));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("Something went wrong");
    }
  });

  it("isOk - type guards success result", () => {
    const successResult = ok("test");
    const failureResult = err(new Error("error"));

    expect(isOk(successResult)).toBe(true);
    expect(isOk(failureResult)).toBe(false);
  });

  it("isErr - type guards failure result", () => {
    const successResult = ok("test");
    const failureResult = err(new Error("error"));

    expect(isErr(successResult)).toBe(false);
    expect(isErr(failureResult)).toBe(true);
  });

  it("Result type - pattern matching", () => {
    function divide(a: number, b: number): Result<number, string> {
      if (b === 0) {
        return err("Division by zero");
      }
      return ok(a / b);
    }

    const result1 = divide(10, 2);
    const result2 = divide(10, 0);

    if (isOk(result1)) {
      expect(result1.value).toBe(5);
    }

    if (isErr(result2)) {
      expect(result2.error).toBe("Division by zero");
    }
  });
});

// =============================================================================
// Branded Types Tests
// =============================================================================

describe("Branded Types", () => {
  it("brand - creates branded value", () => {
    type UserId = Brand<string, "UserId">;

    const userId = brand<UserId>("user123");

    // At runtime, it's just the value
    expect(userId).toBe("user123");
  });

  it("brand - prevents mixing different brands at compile time", () => {
    type UserId = Brand<string, "UserId">;
    type ProductId = Brand<string, "ProductId">;

    const userId = brand<UserId>("user123");
    const productId = brand<ProductId>("product456");

    // These are both strings at runtime
    expect(typeof userId).toBe("string");
    expect(typeof productId).toBe("string");

    // But TypeScript treats them as different types at compile time
    // This would cause a compile error:
    // const test: UserId = productId; // Error!
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("Integration Tests", () => {
  it("Combined utilities with type guards", () => {
    interface User {
      id?: string;
      name?: string;
      email?: string;
    }

    type UserWithId = RequireProps<User, "id">;

    function processUser(user: Maybe<UserWithId>): string {
      if (isDefined(user) && isDefined(user.name)) {
        return `User: ${user.name}`;
      }
      return "Unknown user";
    }

    const validUser: UserWithId = { id: "123", name: "John" };
    const userWithoutName: UserWithId = { id: "123" };

    expect(processUser(validUser)).toBe("User: John");
    expect(processUser(userWithoutName)).toBe("Unknown user");
    expect(processUser(null)).toBe("Unknown user");
    expect(processUser(undefined)).toBe("Unknown user");
  });

  it("Result type with async operations", async () => {
    async function fetchData(shouldFail: boolean): Promise<Result<string, Error>> {
      await new Promise((resolve) => setTimeout(resolve, 10));

      if (shouldFail) {
        return err(new Error("Fetch failed"));
      }
      return ok("success data");
    }

    const successResult = await fetchData(false);
    const failureResult = await fetchData(true);

    expect(isOk(successResult)).toBe(true);
    expect(isErr(failureResult)).toBe(true);

    if (isOk(successResult)) {
      expect(successResult.value).toBe("success data");
    }

    if (isErr(failureResult)) {
      expect(failureResult.error.message).toBe("Fetch failed");
    }
  });

  it("Non-empty array with type guards", () => {
    function processCards(cards: Array<{ name: string }>): string {
      if (isNonEmptyArray(cards)) {
        // TypeScript knows cards is NonEmptyArray here
        const firstCard = cards[0]; // Safe access
        return `First card: ${firstCard.name}`;
      }
      return "No cards";
    }

    expect(processCards([{ name: "Dragon" }])).toBe("First card: Dragon");
    expect(processCards([])).toBe("No cards");
  });
});
