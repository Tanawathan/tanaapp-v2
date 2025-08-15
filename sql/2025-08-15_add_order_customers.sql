-- Link orders to CRM customers
CREATE TABLE IF NOT EXISTS public.order_customers (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customer_users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_customers_customer_id ON public.order_customers(customer_id);
