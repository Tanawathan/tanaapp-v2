-- 快速創建優化後的資料庫表格結構（僅必要表格）
-- 這個腳本只創建遷移檢查所需的表格

-- 1. 確保 users 表格存在（統一用戶系統）
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email character varying UNIQUE,
  phone character varying UNIQUE,
  name character varying NOT NULL,
  avatar_url character varying,
  date_of_birth date,
  gender character varying,
  preferences jsonb DEFAULT '{}'::jsonb,
  role character varying DEFAULT 'customer'::character varying,
  status character varying DEFAULT 'active'::character varying,
  registration_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- 2. 用戶偏好表格（替代 customer_preferences）
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  dietary_restrictions text[],
  allergies text[],
  preferred_cuisine text[],
  spice_level integer DEFAULT 1,
  notification_preferences jsonb DEFAULT '{}'::jsonb,
  language_preference character varying DEFAULT 'zh-TW'::character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 3. 統一積分系統（替代多個 customer_points 表格）
CREATE TABLE IF NOT EXISTS public.user_points (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  total_points integer DEFAULT 0,
  available_points integer DEFAULT 0,
  used_points integer DEFAULT 0,
  tier character varying DEFAULT 'bronze'::character varying,
  tier_valid_until date,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 4. 統一積分交易記錄
CREATE TABLE IF NOT EXISTS public.user_points_transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  points integer NOT NULL,
  transaction_type character varying NOT NULL,
  description text,
  order_id uuid,
  reference_id uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 5. 用戶收藏表格（統一 favorites）
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  UNIQUE(user_id, product_id)
);

-- 6. 用戶評論表格（統一 reviews）
CREATE TABLE IF NOT EXISTS public.user_reviews (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  product_id uuid,
  order_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_verified boolean DEFAULT false,
  is_published boolean DEFAULT true,
  helpful_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL
);

-- 7. 用戶優惠券表格
CREATE TABLE IF NOT EXISTS public.user_coupons (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
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
  valid_from timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  valid_until timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 創建必要的索引
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON public.user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_transactions_user_id ON public.user_points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_user_id ON public.user_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_id ON public.user_coupons(user_id);
