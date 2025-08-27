// src/app/api/update-subscription/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: Request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const { subscriptionId }: { subscriptionId: string } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "subscriptionId is required" },
        { status: 400 }
      );
    }

    const current = await stripe.subscriptions.retrieve(subscriptionId);
    if (!current) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    const subscriptionItemId = current.items.data[0]?.id;
    if (!subscriptionItemId) {
      return NextResponse.json(
        { error: "No subscription items to update" },
        { status: 400 }
      );
    }

    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: subscriptionItemId, quantity: 2 }],
      proration_behavior: "create_prorations",
      payment_behavior: "allow_incomplete",
    });

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
