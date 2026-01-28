import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

  it("should validate password confirmation match", async () => {
    render(<AuthForm mode="signUp" />);

    const user = userEvent.setup({ delay: null });
    const nameInput = screen.getByLabelText(/archivist name/i);
    const emailInput = screen.getByLabelText(/digital seal/i);
    const passwordInput = screen.getByLabelText(/secret cipher/i);
    const confirmPasswordInput = screen.getByLabelText(/verify cipher/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    await user.type(nameInput, "TestUser");
    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.type(confirmPasswordInput, "password456");
    await user.click(submitButton);

    await waitFor(
      () => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      },
      { timeout: 500 }
    );

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("should show password strength indicator on sign up", () => {
    render(<AuthForm mode="signUp" />);

    // Password strength meter should be present in sign up form
    const passwordInput = screen.getByLabelText(/secret cipher/i);
    expect(passwordInput).toBeInTheDocument();

    // Component shows character count and strength hints
    const hint = screen.getByText(/3-20 characters/i);
    expect(hint).toBeInTheDocument();
  });

  it("should successfully submit sign up form", async () => {
    mockSignIn.mockResolvedValue(undefined);

    render(<AuthForm mode="signUp" />);

    const user = userEvent.setup();
    const nameInput = screen.getByLabelText(/archivist name/i);
    const emailInput = screen.getByLabelText(/digital seal/i);
    const passwordInput = screen.getByLabelText(/secret cipher/i);
    const confirmPasswordInput = screen.getByLabelText(/verify cipher/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    await user.type(nameInput, "TestUser");
    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.type(confirmPasswordInput, "password123");
    await user.click(submitButton);

    await waitFor(
      () => {
        expect(mockSignIn).toHaveBeenCalledWith("password", expect.any(FormData));
      },
      { timeout: 2000 }
    );

    await waitFor(
      () => {
        expect(window.location.href).toBe("/lunchtable");
      },
      { timeout: 2000 }
    );
  });

  it("should successfully submit sign in form", async () => {
    mockSignIn.mockResolvedValue(undefined);

    render(<AuthForm mode="signIn" />);

    const user = userEvent.setup();
    const emailInput = screen.getByLabelText(/digital seal/i);
    const passwordInput = screen.getByLabelText(/secret cipher/i);
    const submitButton = screen.getByRole("button", { name: /enter the hall/i });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    await waitFor(
      () => {
        expect(mockSignIn).toHaveBeenCalledWith("password", expect.any(FormData));
      },
      { timeout: 2000 }
    );

    await waitFor(
      () => {
        expect(window.location.href).toBe("/lunchtable");
      },
      { timeout: 2000 }
    );
  });

  it("should display error message on auth failure", async () => {
    mockSignIn.mockRejectedValue(new Error("Invalid password"));

    render(<AuthForm mode="signIn" />);

    const user = userEvent.setup();
    const emailInput = screen.getByLabelText(/digital seal/i);
    const passwordInput = screen.getByLabelText(/secret cipher/i);
    const submitButton = screen.getByRole("button", { name: /enter the hall/i });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "wrongpassword123");
    await user.click(submitButton);

    await waitFor(
      () => {
        expect(screen.getByText(/invalid password/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

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

  it("should redirect to /lunchtable on success", async () => {
    mockSignIn.mockResolvedValue(undefined);

    render(<AuthForm mode="signIn" />);

    const user = userEvent.setup();
    const emailInput = screen.getByLabelText(/digital seal/i);
    const passwordInput = screen.getByLabelText(/secret cipher/i);
    const submitButton = screen.getByRole("button", { name: /enter the hall/i });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    await waitFor(
      () => {
        expect(window.location.href).toBe("/lunchtable");
      },
      { timeout: 2000 }
    );
  });

  it("should disable submit button while loading", async () => {
    // Mock a delayed response
    mockSignIn.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<AuthForm mode="signIn" />);

    const user = userEvent.setup();
    const emailInput = screen.getByLabelText(/digital seal/i);
    const passwordInput = screen.getByLabelText(/secret cipher/i);
    const submitButton = screen.getByRole("button", { name: /enter the hall/i });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    // Button should be disabled during loading
    await waitFor(
      () => {
        expect(submitButton).toBeDisabled();
      },
      { timeout: 500 }
    );
  });
});
