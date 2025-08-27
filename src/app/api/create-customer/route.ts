import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const search = await stripe.customers.search({
      query: `email:'${data.email}'`,
      limit: 1,
    });

    let customer = search.data?.[0];

    if (!customer) {
      customer = await stripe.customers.create({
        email: data.email,
        description: data.description,
        metadata: data.metadata,
      });
    }

    const product = await stripe.products.search({
      query: `name:'test product'`,
      limit: 1,
    });

    if (!product.data || product.data.length === 0) {
      await stripe.products.create({
        name: "test product",
        description: "test description",
        default_price_data: {
          currency: "usd",
          unit_amount: 1000,
        },
      });
    }

    if (!customer.id) {
      return NextResponse.json(
        { error: "Failed to create customer", success: false },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      customerId: customer.id,
      message: "customer created",
      success: true,
    });
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Failed to create customer", success: false },
      { status: 500 }
    );
  }
}
