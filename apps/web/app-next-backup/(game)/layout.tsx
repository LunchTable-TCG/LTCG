export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Immersive layout - no sidebar, no footer */}
      {children}
    </div>
  );
}
