export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
