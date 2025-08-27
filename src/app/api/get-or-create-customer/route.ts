import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createCustomerSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const data = await request.json();

  const safeData = createCustomerSchema.safeParse(data);

  if (!safeData.success) {
    return NextResponse.json(safeData.error, { status: 400 });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const customer = await stripe.customers.create({
      email: safeData.data.email,
      description: safeData.data.description,
      metadata: safeData.data.metadata,
    });

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
