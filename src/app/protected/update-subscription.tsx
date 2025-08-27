"use client";

import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import Stripe from "stripe";

export function UpdateSubscription({
  subscription,
}: {
  subscription: Stripe.Subscription;
}) {
  const updateSubscriptionMutation = useMutation({
    mutationFn: async (variables: { subscriptionId: string }) => {
      const subscription = await fetch("/api/update-subscription", {
        method: "POST",
        body: JSON.stringify({
          subscriptionId: variables.subscriptionId,
        }),
      });

      const data = await subscription.json();

      return data;
    },
    onSuccess: () => {
      toast.success("Subscription updated successfully");
      location.reload();
    },
    onError: (error) => {
      console.error(error);
    },
  });

  return (
    <Button
      type="submit"
      variant={"secondary"}
      size={"sm"}
      onClick={async () => {
        await updateSubscriptionMutation.mutateAsync({
          subscriptionId: subscription.id,
        });
      }}
      disabled={updateSubscriptionMutation.isPending}
    >
      {updateSubscriptionMutation.isPending ? "Updating..." : "Update"}
    </Button>
  );
}
