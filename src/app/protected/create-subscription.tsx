"use client";

import { Button } from "@/components/ui/button";

export default function CreateSubscriptionButton({
  customerId,
  priceId,
}: {
  customerId: string;
  priceId: string;
}) {
  return (
    <Button
      onClick={async () => {
        const subscription = await fetch("/api/create-subscription", {
          method: "POST",
          body: JSON.stringify({
            customerId,
            priceId,
          }),
        });

        const data = await subscription.json();

        console.log(data);
      }}
    >
      Create Subscription
    </Button>
  );
}
