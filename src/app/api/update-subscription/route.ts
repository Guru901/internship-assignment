// src/app/api/update-subscription/route.ts
import { getAuth } from "@/lib/get-auth";
import { updateSubscriptionSchema } from "@/lib/schema";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: Request) {
  try {
    const auth = await getAuth();

    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const data = await request.json();

    const safeData = updateSubscriptionSchema.safeParse(data);

    if (!safeData.success) {
      return NextResponse.json(safeData.error, { status: 400 });
    }

    const current = await stripe.subscriptions.retrieve(
      safeData.data.subscriptionId
    );
    if (!current) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    if (current.id !== safeData.data.subscriptionId) {
      return NextResponse.json(
        { error: "You are not authorized to update this subscription" },
        { status: 401 }
      );
    }

    const subscriptionItemId = current.items.data[0]?.id;
    if (!subscriptionItemId) {
      return NextResponse.json(
        { error: "No subscription items to update" },
        { status: 400 }
      );
    }

    const updated = await stripe.subscriptions.update(
      safeData.data.subscriptionId,
      {
        items: [{ id: subscriptionItemId, quantity: 2 }],
        proration_behavior: "create_prorations",
        payment_behavior: "allow_incomplete",
      }
    );

    return NextResponse.json({
      subscriptionId: updated.id,
      status: updated.status,
      items: updated.items.data.map((i) => ({
        id: i.id,
        price: i.price.id,
        quantity: i.quantity,
      })),
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}
