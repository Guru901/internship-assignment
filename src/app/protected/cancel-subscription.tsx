"use client";

import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import Stripe from "stripe";

export function CancelSubscription({
  subscription,
}: {
  subscription: Stripe.Subscription;
}) {
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (variables: { subscriptionId: string }) => {
      const subscription = await fetch("/api/cancel-subscription", {
        method: "POST",
        body: JSON.stringify({
          subscriptionId: variables.subscriptionId,
        }),
      });

      const data = await subscription.json();

      return data;
    },
    onSuccess: () => {
      toast.success("Subscription cancelled successfully");
      location.reload();
    },
    onError: (error) => {
      console.error(error);
    },
  });

  return (
    <Button
      type="submit"
      variant={"destructive"}
      size={"sm"}
      onClick={async () => {
        await cancelSubscriptionMutation.mutateAsync({
          subscriptionId: subscription.id,
        });
      }}
      disabled={
        subscription.status !== "active" || cancelSubscriptionMutation.isPending
      }
    >
      {cancelSubscriptionMutation.isPending ? "Canceling..." : "Cancel"}
    </Button>
  );
}
