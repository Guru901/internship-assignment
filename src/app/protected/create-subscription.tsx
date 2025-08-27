"use client";

import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export default function CreateSubscriptionButton({
  customerId,
  priceId,
}: {
  customerId: string;
  priceId: string;
}) {
  const createSubscriptionMutation = useMutation({
    mutationFn: async (variables: { customerId: string; priceId: string }) => {
      const subscription = await fetch("/api/create-subscription", {
        method: "POST",
        body: JSON.stringify({
          customerId: variables.customerId,
          priceId: variables.priceId,
        }),
      });

      const data = await subscription.json();

      return data;
    },
    onSuccess: (data) => {
      toast.success("Subscription created successfully");
      location.reload();
    },
    onError: (error) => {
      console.error(error);
    },
  });

  return (
    <Button
      onClick={async () => {
        await createSubscriptionMutation.mutateAsync({ customerId, priceId });
      }}
      disabled={createSubscriptionMutation.isPending}
    >
      {createSubscriptionMutation.isPending
        ? "Creating..."
        : "Create Subscription"}
    </Button>
  );
}
