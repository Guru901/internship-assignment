import { getAuth } from "@/lib/get-auth";
import { cancelSubscriptionSchema } from "@/lib/schema";
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
    const safeData = cancelSubscriptionSchema.safeParse(data);

    if (!safeData.success) {
      return NextResponse.json(safeData.error, { status: 400 });
    }

    const subscription = await stripe.subscriptions.retrieve(
      safeData.data.subscriptionId
    );

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    await stripe.subscriptions.cancel(safeData.data.subscriptionId);

    return NextResponse.json({
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
