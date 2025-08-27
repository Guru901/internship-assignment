import { AuthButton } from "@/components/(auth)/auth-button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import CreateSubscriptionButton from "./create-subscription";
import { CancelSubscription } from "./cancel-subscription";
import { UpdateSubscription } from "./update-subscription";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const customerId = user.user_metadata?.customerId;

  // Fetch data in parallel
  const [products, subscriptions, paymentIntents, invoices] = await Promise.all(
    [
      stripe.products.search({ query: `name~"test product"` }),
      customerId
        ? stripe.subscriptions.list({
            customer: customerId,
            limit: 10,
            expand: ["data.default_payment_method", "data.items.data.price"],
          })
        : { data: [] },
      customerId
        ? stripe.paymentIntents.list({
            customer: customerId,
            limit: 10,
          })
        : { data: [] },
      customerId
        ? stripe.invoices.list({
            customer: customerId,
            limit: 10,
          })
        : { data: [] },
    ]
  );

  // Fetch product details for subscriptions separately
  const productIds = new Set<string>();
  subscriptions.data.forEach((subscription: any) => {
    subscription.items.data.forEach((item: any) => {
      if (item.price?.product && typeof item.price.product === "string") {
        productIds.add(item.price.product);
      }
    });
  });

  const productDetails = new Map<string, Stripe.Product>();
  if (productIds.size > 0) {
    const productPromises = Array.from(productIds).map((id) =>
      stripe.products.retrieve(id).catch(() => null)
    );
    const fetchedProducts = await Promise.all(productPromises);
    fetchedProducts.forEach((product) => {
      if (product) {
        productDetails.set(product.id, product);
      }
    });
  }

  const formatCurrency = (
    amount: number | null | undefined,
    currency: string = "usd"
  ) => {
    if (!amount) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getProductName = (subscription: Stripe.Subscription) => {
    const item = subscription.items.data[0];
    if (!item?.price?.product) return "Subscription";

    const productId =
      typeof item.price.product === "string"
        ? item.price.product
        : item.price.product.id;

    const product = productDetails.get(productId);
    return product?.name || "Subscription";
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: "bg-green-100 text-green-800 border-green-200",
      canceled: "bg-red-100 text-red-800 border-red-200",
      incomplete: "bg-yellow-100 text-yellow-800 border-yellow-200",
      past_due: "bg-orange-100 text-orange-800 border-orange-200",
      succeeded: "bg-green-100 text-green-800 border-green-200",
      pending: "bg-blue-100 text-blue-800 border-blue-200",
      failed: "bg-red-100 text-red-800 border-red-200",
      paid: "bg-green-100 text-green-800 border-green-200",
      open: "bg-blue-100 text-blue-800 border-blue-200",
      draft: "bg-gray-100 text-gray-800 border-gray-200",
    };

    return (
      statusColors[status as keyof typeof statusColors] ||
      "bg-gray-100 text-gray-800 border-gray-200"
    );
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            <AuthButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Info Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Account Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500">Email</span>
              <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">
                Customer ID
              </span>
              <p className="mt-1 text-sm text-gray-900 font-mono">
                {customerId || "Not found"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Subscriptions
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {
                      subscriptions.data.filter(
                        (sub: any) => sub.status === "active"
                      ).length
                    }
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Payments
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {
                      paymentIntents.data.filter(
                        (pi: any) => pi.status === "succeeded"
                      ).length
                    }
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Invoices
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {invoices.data.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Available Products */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Available Products
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.data.map((product: any) => (
                <div
                  key={product.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <h4 className="font-medium text-gray-900 mb-2">
                    {product.name}
                  </h4>
                  <p className="text-sm text-gray-500 mb-4">
                    {product.description}
                  </p>
                  <CreateSubscriptionButton
                    customerId={customerId}
                    priceId={product.default_price as string}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Subscriptions */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Active Subscriptions
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {subscriptions.data.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No subscriptions
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating your first subscription.
                  </p>
                </div>
              ) : (
                subscriptions.data.map((subscription: Stripe.Subscription) => (
                  <div key={subscription.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-sm font-medium text-gray-900">
                            {getProductName(subscription)}
                          </h4>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                              subscription.status
                            )}`}
                          >
                            {subscription.status}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <span>
                            {formatCurrency(
                              subscription.items.data[0]?.price?.unit_amount,
                              subscription.items.data[0]?.price?.currency
                            )}
                          </span>
                          <div className="space-x-2">
                            <CancelSubscription subscription={subscription} />
                            <UpdateSubscription subscription={subscription} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Payments */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Recent Payments
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {paymentIntents.data.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No payments
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Your payment history will appear here.
                  </p>
                </div>
              ) : (
                paymentIntents.data.slice(0, 5).map((payment: any) => (
                  <div key={payment.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(payment.amount, payment.currency)}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                              payment.status
                            )}`}
                          >
                            {payment.status}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          {formatDate(payment.created)} •{" "}
                          {payment.payment_method_types.join(", ")}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Invoices */}
        {invoices.data.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm mt-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Recent Invoices
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.data.slice(0, 5).map((invoice: any) => (
                    <tr key={invoice.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{invoice.number}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">
                          {invoice.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                            invoice.status || "draft"
                          )}`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.created)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {invoice.hosted_invoice_url && (
                          <a
                            href={invoice.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
