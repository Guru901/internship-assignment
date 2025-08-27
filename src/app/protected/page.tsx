import { AuthButton } from "@/components/auth-button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <AuthButton />
        </nav>
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          <h1>Protected</h1>
          <div className="space-y-4">
            <p>
              <strong>Email:</strong> {user?.email}
            </p>
            <p>
              <strong>Customer ID:</strong>{" "}
              {user?.user_metadata?.customerId || "Not found"}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
