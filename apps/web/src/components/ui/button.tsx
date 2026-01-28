import { cn } from "@/lib/utils";
import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "default" | "ghost" | "primary" | "outline" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "default", asChild = false, children, ...props },
    ref
  ) => {
    const buttonClasses = cn(
      "inline-flex items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-50 rounded-lg font-medium",
      variant === "ghost" && "hover:bg-secondary/10",
      variant === "primary" && "tcg-button-primary",
      variant === "outline" && "border border-border bg-transparent hover:bg-secondary/10",
      variant === "default" && "tcg-button",
      variant === "destructive" && "bg-red-600 text-white hover:bg-red-500",
      variant === "secondary" && "bg-slate-700 text-white hover:bg-slate-600",
      size === "default" && "h-10 px-4 py-2",
      size === "sm" && "h-9 px-3 text-sm",
      size === "lg" && "h-11 px-8",
      size === "icon" && "h-10 w-10",
      className
    );

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        className: cn(buttonClasses, (children.props as any).className),
      } as any);
    }

    return (
      <button className={buttonClasses} ref={ref} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
