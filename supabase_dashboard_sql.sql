-- 在 Supabase Dashboard SQL Editor 中執行此文件
-- 創建優化後的表格結構（缺失的表格）

-- 1. 用戶偏好表格（替代 customer_preferences）
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dietary_restrictions text[],
  allergies text[],
  preferred_cuisine text[],
  spice_level integer DEFAULT 1,
  notification_preferences jsonb DEFAULT '{}'::jsonb,
  language_preference character varying DEFAULT 'zh-TW'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 2. 統一積分系統（替代多個 customer_points 表格）
CREATE TABLE IF NOT EXISTS public.user_points (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  total_points integer DEFAULT 0,
  available_points integer DEFAULT 0,
  used_points integer DEFAULT 0,
  tier character varying DEFAULT 'bronze'::character varying,
  tier_valid_until date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 3. 統一積分交易記錄
CREATE TABLE IF NOT EXISTS public.user_points_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL,
  transaction_type character varying NOT NULL,
  description text,
  order_id uuid,
  reference_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 4. 用戶收藏表格（統一 favorites）
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  UNIQUE(user_id, product_id)
);

-- 5. 用戶評論表格（統一 reviews）
CREATE TABLE IF NOT EXISTS public.user_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid,
  order_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_verified boolean DEFAULT false,
  is_published boolean DEFAULT true,
  helpful_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL
);

-- 6. 用戶優惠券表格
CREATE TABLE IF NOT EXISTS public.user_coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  coupon_code character varying NOT NULL,
  coupon_name character varying NOT NULL,
  discount_type character varying NOT NULL,
  discount_value numeric NOT NULL,
  minimum_amount numeric DEFAULT 0,
  maximum_discount numeric,
  is_used boolean DEFAULT false,
  used_at timestamp with time zone,
  order_id uuid,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 創建必要的索引
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON public.user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_transactions_user_id ON public.user_points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_user_id ON public.user_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_id ON public.user_coupons(user_id);

-- 啟用 RLS（Row Level Security）
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;

-- 創建 RLS 政策
CREATE POLICY "用戶只能查看自己的偏好" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "用戶只能查看自己的積分" ON public.user_points FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "用戶只能查看自己的積分交易" ON public.user_points_transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "用戶只能管理自己的收藏" ON public.user_favorites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "用戶可以查看所有評論，但只能管理自己的" ON public.user_reviews FOR SELECT USING (true);
CREATE POLICY "用戶只能管理自己的評論" ON public.user_reviews FOR INSERT, UPDATE, DELETE USING (auth.uid() = user_id);
CREATE POLICY "用戶只能查看自己的優惠券" ON public.user_coupons FOR ALL USING (auth.uid() = user_id);
