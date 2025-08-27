import { AuthButton } from "@/components/(auth)/auth-button";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import CreateSubscriptionButton from "./create-subscription";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const customer = await stripe.customers.retrieve(
    user.user_metadata.customerId
  );

  const products = await stripe.products.search({
    query: `name~"test product"`,
  });

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
            <div>
              <h1>Product</h1>
              <CreateSubscriptionButton
                customerId={user.user_metadata.customerId}
                priceId={products.data[0].default_price as string}
              />
              <div>
                {products.data.map((product) => (
                  <div key={product.id}>{product.name}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
