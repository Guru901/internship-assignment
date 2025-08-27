import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const { customerId, priceId: price } = await request.json();

  const customer = await stripe.customers.retrieve(customerId);

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [
      {
        price: price,
      },
    ],
  });

  console.log(subscription);

  return NextResponse.json(subscription);
}
