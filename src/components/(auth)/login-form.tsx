"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const createCustomerMutation = useMutation({
    mutationKey: ["getOrCreateCustomer"],
    mutationFn: async ({
      email,
      supabaseId,
    }: {
      email: string;
      supabaseId: string;
    }) => {
      const response = await fetch("/api/get-or-create-customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          description: "Created by the supabase",
          metadata: {
            supabaseUserId: supabaseId,
          },
        }),
      });

      const data = await response.json();
      return data;
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data && data.user) {
        // Check if user already has a customerId
        const existingCustomerId = data.user.user_metadata?.customerId;

        if (!existingCustomerId) {
          // Only create customer if one doesn't exist
          console.log("Creating customer for user:", data.user.id);

          const customerResponse = await createCustomerMutation.mutateAsync({
            email: email,
            supabaseId: data.user.id,
          });

          if (customerResponse.success) {
            const customerId = String(customerResponse.customerId);
            console.log(
              "Customer created, updating user metadata with:",
              customerId
            );

            const { error: updateError } = await supabase.auth.updateUser({
              data: {
                customerId: customerId,
              },
            });

            if (updateError) {
              console.error("Failed to update user metadata:", updateError);
            } else {
              console.log("User metadata updated successfully");
            }
          } else {
            console.error("Failed to create customer:", customerResponse.error);
          }
        } else {
          console.log("User already has customerId:", existingCustomerId);
        }

        // Redirect to protected page
        router.push("/protected");
      }
    } catch (error: unknown) {
      console.error("Login error:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/sign-up"
                className="underline underline-offset-4"
              >
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
