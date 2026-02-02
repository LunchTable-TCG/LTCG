import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("should render button with default variant", () => {
    render(<Button>Default Button</Button>);

    const button = screen.getByRole("button", { name: /default button/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("tcg-button");
  });

  it("should render button with ghost variant", () => {
    render(<Button variant="ghost">Ghost Button</Button>);

    const button = screen.getByRole("button", { name: /ghost button/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("hover:bg-secondary/10");
  });

  it("should render button with primary variant", () => {
    render(<Button variant="primary">Primary Button</Button>);

    const button = screen.getByRole("button", { name: /primary button/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("tcg-button-primary");
  });

  it("should render button with outline variant", () => {
    render(<Button variant="outline">Outline Button</Button>);

    const button = screen.getByRole("button", { name: /outline button/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("border", "border-border", "bg-transparent");
  });

  it("should render button with destructive variant", () => {
    render(<Button variant="destructive">Delete</Button>);

    const button = screen.getByRole("button", { name: /delete/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-red-600", "text-white");
  });

  it("should render button with default size", () => {
    render(<Button>Default Size</Button>);

    const button = screen.getByRole("button", { name: /default size/i });
    expect(button).toHaveClass("h-10", "px-4", "py-2");
  });

  it("should render button with sm size", () => {
    render(<Button size="sm">Small Button</Button>);

    const button = screen.getByRole("button", { name: /small button/i });
    expect(button).toHaveClass("h-9", "px-3", "text-sm");
  });

  it("should render button with lg size", () => {
    render(<Button size="lg">Large Button</Button>);

    const button = screen.getByRole("button", { name: /large button/i });
    expect(button).toHaveClass("h-11", "px-8");
  });

  it("should handle onClick event", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const user = userEvent.setup();
    const button = screen.getByRole("button", { name: /click me/i });

    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should be disabled when disabled prop is true", async () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled Button
      </Button>
    );

    const user = userEvent.setup();
    const button = screen.getByRole("button", { name: /disabled button/i });

    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:pointer-events-none", "disabled:opacity-50");

    // Attempt to click
    await user.click(button);

    // Should not have been called because button is disabled
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("should render as child element when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );

    const link = screen.getByRole("link", { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test");
    expect(link).toHaveClass("inline-flex", "items-center", "justify-center");
  });

  it("should merge custom className with default classes", () => {
    render(<Button className="custom-class">Custom Button</Button>);

    const button = screen.getByRole("button", { name: /custom button/i });
    expect(button).toHaveClass("custom-class");
    expect(button).toHaveClass("inline-flex", "items-center", "justify-center");
  });
});
