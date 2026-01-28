import type { CSSProperties, ReactNode } from "react";

const floatingParticles: (CSSProperties & { id: string })[] = Array.from(
  { length: 15 },
  (_, i) => ({
    id: `particle-${i}`,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 5}s`,
    animationDuration: `${6 + Math.random() * 4}s`,
  })
);

interface AuthPageShellProps {
  children: ReactNode;
}

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto overflow-x-hidden">
      {/* Background layers - fixed to viewport */}
      <div className="fixed inset-0 bg-auth" />
      <div className="fixed inset-0 bg-vignette" />
      <div className="fixed inset-0 grid-pattern opacity-30" />

      {/* Floating particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {floatingParticles.map(({ id, ...style }) => (
          <div
            key={id}
            className="absolute w-1 h-1 rounded-full bg-cyan-400/30 animate-float"
            style={style}
          />
        ))}
      </div>

      {/* Content - scrollable if needed */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4 py-16">{children}</div>
    </div>
  );
}
