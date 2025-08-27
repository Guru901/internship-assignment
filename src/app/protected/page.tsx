import { AuthButton } from "@/components/auth-button";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <AuthButton />
        </nav>
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          <h1>Protected</h1>
        </div>
      </div>
    </main>
  );
}
