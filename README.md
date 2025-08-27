## Installation

1. Clone the repository
2. Install dependencies
3. Create a Supabase project
4. Copy .env.example to .env.local and update the environment variables

### Required environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
```

## Setup

#### Supabase Setup

1. Create a Supabase project
2. Get the environment variables from Supabase
3. Go to the Supabase SQL editor and run the following SQL

```sql
-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_invoice_id ON payments(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(stripe_customer_id);
```

4. Then go to the Supabase Edge Functions and create a new Edge Function and paste the code from the [edge-functions.js](edge-functions.js) file
5. Then go to the Secret's tab and add the following environment variables:

- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

6. Then go to Details tab and turn `Verify JWT with legacy secret` off

---

#### Stripe Setup

1. Create a Stripe account
2. Get the environment variables from Stripe
3. Go to the Stripe Dashboard and create a new webhook
4. Select `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted` events.
5. Copy the supabase's edge function url and paste it in the webhook url.
6. Then copy the webhook secret and paste it in the Supabase Edge Functions

## Starting the development server

```bash
bun run dev
```

After you log in, you will be redirected to `/protected` route.

Where you would see your stripe's customer id.

Then you can go to the Stripe Dashboard and you would see your user created in that.

## How to fire webhooks

Go to `/protected` route and click on `Create Subscription` button.

After that, a webhook will be triggered and you will see a new subscription in your Stripe Dashboard and Supabase DB.

Then you will be able to see the subscription in the ui, and you can delete or update it, both will trigger a webhook.

## How to test webhooks manually

From your terminal run:

```bash
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

## Assumptions

1. You have a Stripe account
2. You have Stripe's cli installed.
3. You have a Supabase account
4. You have a Stripe webhooks set up
5. You have Supabase Edge Functions set up
6. You have Supabase Schema set up

## Time spent

I have never used Supbase/Firebase, Webhooks and Stripe before. So it took me a while to figure out how to do this. I'm sure there are better ways to do this, but this is what I came up with.

It took me around 7-8 hrs to figure out how to do this.
