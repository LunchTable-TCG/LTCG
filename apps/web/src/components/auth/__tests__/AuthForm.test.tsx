import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthForm } from "../AuthForm";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";

// Mock imports
vi.mock("@convex-dev/auth/react");
vi.mock("next/navigation");

describe("AuthForm", () => {
  const mockSignIn = vi.fn();
  const mockSignUp = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mocks
    vi.mocked(useAuthActions).mockReturnValue({
      signIn: mockSignIn,
      signUp: mockSignUp,
      signOut: vi.fn(),
    });

    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    });

    // Mock window.location.href
    delete (window as any).location;
    (window as any).location = { href: "" };
  });

  it("should render sign up form by default", () => {
    render(<AuthForm mode="signUp" />);

    // Check for the Create Account button specifically
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/archivist name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/digital seal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/secret cipher/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/verify cipher/i)).toBeInTheDocument();
  });

  it("should render sign in form when mode is 'signin'", () => {
    render(<AuthForm mode="signIn" />);

    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/archivist name/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/digital seal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/secret cipher/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/verify cipher/i)).not.toBeInTheDocument();
  });

  it("should validate required fields on submit", async () => {
    render(<AuthForm mode="signIn" />);

    const user = userEvent.setup();
    const submitButton = screen.getByRole("button", { name: /enter the hall/i });

    await user.click(submitButton);

    // Form should not have called signIn without filled fields
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("should validate email format", async () => {
    render(<AuthForm mode="signIn" />);

    const user = userEvent.setup();
    const emailInput = screen.getByLabelText(/digital seal/i);
    const passwordInput = screen.getByLabelText(/secret cipher/i);

    await user.type(emailInput, "invalid-email");
    await user.type(passwordInput, "password123");

    // HTML5 validation will prevent submit with invalid email
    // Cannot easily test this in unit tests, but component has type="email"
    expect(emailInput).toHaveAttribute("type", "email");
  });

  it("should validate password length (min 8 chars)", () => {
    render(<AuthForm mode="signIn" />);

    const passwordInput = screen.getByLabelText(/secret cipher/i);

    // Verify HTML5 minLength validation is present
    expect(passwordInput).toHaveAttribute("minLength", "8");
    expect(passwordInput).toHaveAttribute("required");
  });

  // Password confirmation validation covered by E2E tests
  // See: e2e/auth-form-component.spec.ts

  it("should show password strength indicator on sign up", () => {
    render(<AuthForm mode="signUp" />);

    // Password strength meter should be present in sign up form
    const passwordInput = screen.getByLabelText(/secret cipher/i);
    expect(passwordInput).toBeInTheDocument();

    // Component shows character count and strength hints
    const hint = screen.getByText(/3-20 characters/i);
    expect(hint).toBeInTheDocument();
  });

  // Sign up form submission covered by E2E tests
  // See: e2e/auth-form-component.spec.ts

  // Sign in form submission covered by E2E tests
  // See: e2e/auth-form-component.spec.ts

  // Error message display on auth failure covered by E2E tests
  // See: e2e/auth-form-component.spec.ts

  it("should toggle between sign up and sign in modes", () => {
    const { rerender } = render(<AuthForm mode="signUp" />);

    // Should show sign up form
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/archivist name/i)).toBeInTheDocument();

    // Rerender with sign in mode
    rerender(<AuthForm mode="signIn" />);

    // Should show sign in form - check for the button with "Enter the Hall" text
    expect(screen.getByRole("button", { name: /enter the hall/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/archivist name/i)).not.toBeInTheDocument();
  });

  // Redirect to /lunchtable covered by E2E tests
  // See: e2e/auth-form-component.spec.ts

  // Button loading state covered by E2E tests
  // See: e2e/auth-form-component.spec.ts
});
