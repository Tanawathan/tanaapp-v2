-- OPTIMIZED TANA APP DATABASE SCHEMA
-- 整理後的資料庫架構，去除重複並統一相似功能

-- ============================================================================
-- 核心管理表格
-- ============================================================================

-- 餐廳基本資訊
CREATE TABLE public.restaurants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  address text,
  phone character varying,
  email character varying,
  website character varying,
  tax_rate numeric DEFAULT 0.1000,
  service_charge_rate numeric DEFAULT 0.0000,
  currency character varying DEFAULT 'TWD'::character varying,
  timezone character varying DEFAULT 'Asia/Taipei'::character varying,
  business_hours jsonb,
  reservation_settings jsonb DEFAULT '{"businessHours": {"friday": {"isOpen": true, "openTime": "14:00", "closeTime": "21:00"}, "monday": {"isOpen": true, "openTime": "14:00", "closeTime": "21:00"}, "sunday": {"isOpen": true, "openTime": "14:00", "closeTime": "21:00"}, "tuesday": {"isOpen": true, "openTime": "14:00", "closeTime": "21:00"}, "saturday": {"isOpen": true, "openTime": "14:00", "closeTime": "21:00"}, "thursday": {"isOpen": true, "openTime": "14:00", "closeTime": "21:00"}, "wednesday": {"isOpen": true, "openTime": "14:00", "closeTime": "21:00"}}, "autoAssignment": {"enabled": true, "capacityWeight": 0.5, "aiPriorityWeight": 0.2, "preferenceWeight": 0.3}, "reservationSettings": {"lastReservationTime": "19:30", "mealDurationMinutes": 90, "slotDurationMinutes": 30, "maxAdvanceBookingDays": 30, "minAdvanceBookingHours": 2}}'::jsonb,
  settings jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb,
  CONSTRAINT restaurants_pkey PRIMARY KEY (id)
);

-- 餐廳假日設定
CREATE TABLE public.restaurant_holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  holiday_date date NOT NULL,
  holiday_name character varying NOT NULL,
  is_recurring boolean DEFAULT false,
  recurrence_type character varying CHECK (recurrence_type::text = ANY (ARRAY['yearly'::character varying, 'monthly'::character varying, 'weekly'::character varying]::text[])),
  is_closed boolean DEFAULT true,
  special_hours jsonb,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT restaurant_holidays_pkey PRIMARY KEY (id),
  CONSTRAINT restaurant_holidays_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);

-- ============================================================================
-- 統一用戶系統 (整合 users, profiles, customer_users)
-- ============================================================================

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phone character varying NOT NULL UNIQUE,
  email character varying UNIQUE,
  name character varying,
  password_hash character varying, -- 可選，支援密碼登入
  avatar_url text,
  birthday date,
  gender character varying,
  preferred_language character varying DEFAULT 'zh-TW'::character varying,
  timezone character varying DEFAULT 'Asia/Taipei'::character varying,
  member_tier character varying DEFAULT 'bronze'::character varying,
  registration_source character varying DEFAULT 'mobile'::character varying,
  is_active boolean DEFAULT true,
  last_active_at timestamp with time zone DEFAULT now(),
  last_login timestamp with time zone,
  terms_accepted boolean DEFAULT false,
  marketing_consent boolean DEFAULT false,
  notification_preferences jsonb DEFAULT '{}'::jsonb,
  privacy_settings jsonb DEFAULT '{}'::jsonb,
  custom_preferences jsonb DEFAULT '{}'::jsonb,
  login_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- 用戶會話管理
CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token character varying NOT NULL UNIQUE,
  ip_address inet,
  user_agent text,
  device_info jsonb,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  last_used_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  CONSTRAINT user_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- 用戶偏好設定 (整合 customer_preferences)
CREATE TABLE public.user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  spice_tolerance integer DEFAULT 3 CHECK (spice_tolerance >= 1 AND spice_tolerance <= 5),
  sweet_preference integer DEFAULT 3 CHECK (sweet_preference >= 1 AND sweet_preference <= 5),
  sour_preference integer DEFAULT 3 CHECK (sour_preference >= 1 AND sour_preference <= 5),
  salty_preference integer DEFAULT 3 CHECK (salty_preference >= 1 AND salty_preference <= 5),
  dietary_restrictions jsonb DEFAULT '[]'::jsonb,
  allergens jsonb DEFAULT '[]'::jsonb,
  avoided_ingredients jsonb DEFAULT '[]'::jsonb,
  preferred_cuisines jsonb DEFAULT '[]'::jsonb,
  favorite_dishes jsonb DEFAULT '[]'::jsonb,
  disliked_dishes jsonb DEFAULT '[]'::jsonb,
  ordering_frequency character varying DEFAULT 'monthly'::character varying,
  avg_order_value numeric DEFAULT 0,
  preferred_meal_times jsonb DEFAULT '[]'::jsonb,
  party_size_usual integer DEFAULT 2,
  decision_speed character varying DEFAULT 'moderate'::character varying,
  price_sensitivity character varying DEFAULT 'moderate'::character varying,
  adventurous_level integer DEFAULT 5 CHECK (adventurous_level >= 1 AND adventurous_level <= 10),
  confidence_scores jsonb DEFAULT '{}'::jsonb,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ============================================================================
-- 統一積分/點數系統 (整合 loyalty_points, customer_points)
-- ============================================================================

CREATE TABLE public.user_points (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  points_balance integer DEFAULT 0,
  total_earned integer DEFAULT 0,
  total_redeemed integer DEFAULT 0,
  tier character varying DEFAULT 'bronze'::character varying,
  tier_expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_points_pkey PRIMARY KEY (id),
  CONSTRAINT user_points_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.user_points_transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  type character varying NOT NULL, -- 'earned', 'redeemed', 'expired', 'bonus'
  points integer NOT NULL,
  balance_after integer NOT NULL,
  reference_type character varying, -- 'order', 'review', 'referral', 'promotion'
  reference_id uuid,
  description text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT user_points_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT user_points_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ============================================================================
-- 桌位管理系統
-- ============================================================================

CREATE TABLE public.tables (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  table_number integer NOT NULL,
  name character varying,
  capacity integer DEFAULT 4,
  min_capacity integer DEFAULT 1,
  max_capacity integer,
  status character varying DEFAULT 'available'::character varying CHECK (status::text = ANY (ARRAY['available'::character varying, 'occupied'::character varying, 'reserved'::character varying, 'cleaning'::character varying, 'maintenance'::character varying, 'inactive'::character varying]::text[])),
  floor_level integer DEFAULT 1,
  zone character varying,
  position_x numeric DEFAULT 0,
  position_y numeric DEFAULT 0,
  table_type character varying DEFAULT 'square'::character varying,
  features jsonb,
  qr_code text,
  qr_enabled boolean DEFAULT true,
  ai_assignment_priority integer DEFAULT 5,
  ai_features_score jsonb,
  current_session_id uuid,
  last_occupied_at timestamp with time zone,
  last_cleaned_at timestamp with time zone,
  cleaning_duration_minutes integer DEFAULT 15,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb,
  CONSTRAINT tables_pkey PRIMARY KEY (id),
  CONSTRAINT tables_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);

-- ============================================================================
-- 統一訂位系統 (整合 reservations, customer_reservations, table_reservations)
-- ============================================================================

CREATE TABLE public.reservations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  user_id uuid, -- 註冊用戶
  table_id uuid,
  -- 基本訂位資訊
  customer_name character varying NOT NULL,
  customer_phone character varying NOT NULL,
  customer_email character varying,
  party_size integer NOT NULL CHECK (party_size > 0 AND party_size <= 20),
  adult_count integer DEFAULT 0,
  child_count integer DEFAULT 0,
  child_chair_needed boolean DEFAULT false,
  -- 時間相關
  reservation_date date NOT NULL,
  reservation_time time without time zone NOT NULL,
  duration_minutes integer DEFAULT 120,
  estimated_end_time timestamp with time zone,
  -- 狀態管理
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'confirmed'::character varying, 'seated'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'no_show'::character varying]::text[])),
  -- 額外資訊
  special_requests text,
  occasion character varying,
  notes text,
  customer_notes text,
  -- 付費相關
  deposit_amount numeric DEFAULT 0,
  deposit_paid boolean DEFAULT false,
  deposit_payment_method character varying,
  -- 來源和AI
  created_via character varying DEFAULT 'website'::character varying CHECK (created_via::text = ANY (ARRAY['ai_chat'::character varying, 'manual'::character varying, 'phone'::character varying, 'website'::character varying]::text[])),
  confidence_score numeric DEFAULT 1.0,
  -- 提醒
  reminder_sent boolean DEFAULT false,
  -- 時間戳記
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  confirmed_at timestamp with time zone,
  seated_at timestamp with time zone,
  completed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  check_in_time timestamp with time zone,
  -- 其他
  reservation_type character varying DEFAULT 'dining'::character varying,
  created_by character varying,
  cancellation_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT reservations_pkey PRIMARY KEY (id),
  CONSTRAINT reservations_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.tables(id),
  CONSTRAINT reservations_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id),
  CONSTRAINT reservations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- 桌位使用會話
CREATE TABLE public.table_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  table_id uuid NOT NULL,
  reservation_id uuid,
  user_id uuid,
  customer_name character varying,
  party_size integer NOT NULL,
  seated_at timestamp with time zone NOT NULL DEFAULT now(),
  estimated_duration integer DEFAULT 120,
  actual_duration integer,
  status character varying DEFAULT 'occupied'::character varying CHECK (status::text = ANY (ARRAY['occupied'::character varying, 'ordering'::character varying, 'dining'::character varying, 'paying'::character varying, 'completed'::character varying]::text[])),
  total_amount numeric DEFAULT 0,
  total_orders integer DEFAULT 0,
  service_rating integer CHECK (service_rating >= 1 AND service_rating <= 5),
  service_feedback text,
  notes text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT table_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT table_sessions_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id),
  CONSTRAINT table_sessions_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id),
  CONSTRAINT table_sessions_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.tables(id),
  CONSTRAINT table_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ============================================================================
-- 統一商品系統 (整合 products, menu_items, combo_products)
-- ============================================================================

-- 商品分類 (整合 categories, menu_categories)
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  display_order integer DEFAULT 0,
  color character varying DEFAULT '#3B82F6'::character varying,
  icon character varying DEFAULT '🍽️'::character varying,
  image_url text,
  parent_id uuid,
  level integer DEFAULT 1,
  path text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  ai_visibility_score numeric DEFAULT 1.0,
  ai_popularity_rank integer,
  metadata jsonb,
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id),
  CONSTRAINT categories_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);

-- 統一商品表 (支援一般商品和套餐)
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  category_id uuid,
  name character varying NOT NULL,
  description text,
  sku character varying UNIQUE,
  barcode character varying,
  price numeric NOT NULL DEFAULT 0,
  cost numeric DEFAULT 0,
  image_url text,
  images jsonb,
  sort_order integer DEFAULT 0,
  is_available boolean DEFAULT true,
  is_active boolean DEFAULT true,
  -- 庫存管理
  track_inventory boolean DEFAULT false,
  current_stock numeric DEFAULT 0,
  min_stock numeric DEFAULT 0,
  max_stock numeric DEFAULT 0,
  unit character varying DEFAULT 'item'::character varying,
  -- 時間相關
  prep_time_minutes integer DEFAULT 15,
  cook_time_minutes integer DEFAULT 0,
  total_time_minutes integer DEFAULT 15,
  availability_start time without time zone,
  availability_end time without time zone,
  available_days jsonb,
  -- 營養和標籤
  calories integer,
  nutrition_info jsonb,
  allergens jsonb,
  dietary_tags jsonb,
  tags text[],
  -- 套餐相關
  product_type character varying DEFAULT 'single'::character varying CHECK (product_type::text = ANY (ARRAY['single'::character varying, 'combo'::character varying]::text[])),
  combo_type character varying CHECK (combo_type::text = ANY (ARRAY['fixed'::character varying, 'selectable'::character varying, 'build_your_own'::character varying]::text[])),
  min_items integer,
  max_items integer,
  discount_type character varying DEFAULT 'fixed'::character varying,
  discount_value numeric DEFAULT 0,
  -- AI 和統計
  ai_popularity_score numeric DEFAULT 0.5,
  ai_recommended boolean DEFAULT false,
  ai_demand_forecast jsonb,
  popularity_score integer DEFAULT 0,
  total_sold integer DEFAULT 0,
  revenue_generated numeric DEFAULT 0,
  last_sold_at timestamp with time zone,
  -- 時間戳記
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb,
  custom_fields jsonb,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT products_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);

-- 商品變體
CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL,
  name character varying NOT NULL,
  sku character varying,
  price_adjustment numeric DEFAULT 0,
  cost_adjustment numeric DEFAULT 0,
  is_default boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_variants_pkey PRIMARY KEY (id),
  CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- 商品選項和修飾符
CREATE TABLE public.product_modifiers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  type character varying NOT NULL,
  price numeric DEFAULT 0,
  is_required boolean DEFAULT false,
  max_selections integer DEFAULT 1,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_modifiers_pkey PRIMARY KEY (id),
  CONSTRAINT product_modifiers_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- 套餐選擇規則 (適用於套餐類商品)
CREATE TABLE public.combo_selection_rules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  combo_id uuid NOT NULL,
  category_id uuid,
  selection_name character varying NOT NULL,
  description text,
  min_selections integer DEFAULT 1,
  max_selections integer DEFAULT 1,
  is_required boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT combo_selection_rules_pkey PRIMARY KEY (id),
  CONSTRAINT combo_selection_rules_combo_id_fkey FOREIGN KEY (combo_id) REFERENCES public.products(id),
  CONSTRAINT combo_selection_rules_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);

-- 套餐選項
CREATE TABLE public.combo_selection_options (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  rule_id uuid NOT NULL,
  product_id uuid NOT NULL,
  additional_price numeric DEFAULT 0,
  is_default boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT combo_selection_options_pkey PRIMARY KEY (id),
  CONSTRAINT combo_selection_options_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.combo_selection_rules(id),
  CONSTRAINT combo_selection_options_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- ============================================================================
-- 統一訂單系統 (整合 orders, customer_orders)
-- ============================================================================

CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  user_id uuid, -- 如果是註冊用戶
  table_id uuid,
  session_id uuid,
  order_number character varying NOT NULL UNIQUE,
  order_type character varying DEFAULT 'dine_in'::character varying,
  -- 客戶資訊
  customer_name character varying,
  customer_phone character varying,
  customer_email character varying,
  -- 桌位資訊
  table_number integer,
  party_size integer DEFAULT 1,
  -- 金額計算
  subtotal numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  service_charge numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  -- 積分相關
  points_used integer DEFAULT 0,
  points_earned integer DEFAULT 0,
  -- 狀態管理
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'confirmed'::character varying, 'preparing'::character varying, 'ready'::character varying, 'served'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])),
  payment_status character varying DEFAULT 'unpaid'::character varying CHECK (payment_status::text = ANY (ARRAY['unpaid'::character varying, 'partial'::character varying, 'paid'::character varying, 'refunded'::character varying, 'voided'::character varying]::text[])),
  -- 時間管理
  ordered_at timestamp with time zone DEFAULT now(),
  confirmed_at timestamp with time zone,
  preparation_started_at timestamp with time zone,
  ready_at timestamp with time zone,
  served_at timestamp with time zone,
  completed_at timestamp with time zone,
  estimated_ready_time timestamp with time zone,
  estimated_prep_time integer,
  actual_prep_time integer,
  -- AI 相關
  ai_optimized boolean DEFAULT false,
  ai_estimated_prep_time integer,
  ai_recommendations jsonb,
  ai_efficiency_score numeric,
  -- 其他資訊
  notes text,
  special_instructions text,
  delivery_address jsonb,
  payment_method character varying,
  source character varying DEFAULT 'pos'::character varying,
  created_by character varying,
  updated_by character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id),
  CONSTRAINT orders_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.table_sessions(id),
  CONSTRAINT orders_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.tables(id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- 訂單項目
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  product_id uuid,
  item_type character varying DEFAULT 'product'::character varying,
  product_name character varying NOT NULL,
  product_sku character varying,
  variant_name character varying,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  cost_price numeric DEFAULT 0,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'confirmed'::character varying, 'preparing'::character varying, 'ready'::character varying, 'served'::character varying, 'cancelled'::character varying]::text[])),
  ordered_at timestamp with time zone DEFAULT now(),
  preparation_started_at timestamp with time zone,
  ready_at timestamp with time zone,
  served_at timestamp with time zone,
  estimated_prep_time integer,
  actual_prep_time integer,
  special_instructions text,
  modifiers jsonb,
  kitchen_station character varying,
  priority_level integer DEFAULT 3,
  quality_checked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

-- 套餐選擇記錄
CREATE TABLE public.order_combo_selections (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_item_id uuid NOT NULL,
  rule_id uuid NOT NULL,
  selected_product_id uuid NOT NULL,
  quantity integer DEFAULT 1,
  additional_price numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_combo_selections_pkey PRIMARY KEY (id),
  CONSTRAINT order_combo_selections_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id),
  CONSTRAINT order_combo_selections_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.combo_selection_rules(id),
  CONSTRAINT order_combo_selections_selected_product_id_fkey FOREIGN KEY (selected_product_id) REFERENCES public.products(id)
);

-- ============================================================================
-- 付款和收據系統
-- ============================================================================

CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  payment_method character varying NOT NULL CHECK (payment_method::text = ANY (ARRAY['cash'::character varying, 'card'::character varying, 'mobile_pay'::character varying, 'voucher'::character varying, 'points'::character varying, 'bank_transfer'::character varying, 'digital_wallet'::character varying]::text[])),
  payment_provider character varying,
  amount numeric NOT NULL,
  received_amount numeric,
  change_amount numeric,
  tip_amount numeric DEFAULT 0,
  transaction_id character varying,
  reference_number character varying,
  authorization_code character varying,
  card_last_four character varying,
  card_type character varying,
  card_brand character varying,
  mobile_provider character varying,
  mobile_account character varying,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'refunded'::character varying, 'voided'::character varying]::text[])),
  processed_at timestamp with time zone DEFAULT now(),
  confirmed_at timestamp with time zone,
  refund_amount numeric DEFAULT 0,
  refund_reason text,
  refunded_at timestamp with time zone,
  processed_by character varying,
  terminal_id character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

CREATE TABLE public.receipts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  payment_id uuid,
  receipt_number character varying NOT NULL UNIQUE,
  invoice_type character varying DEFAULT 'receipt'::character varying,
  buyer_name character varying,
  buyer_tax_id character varying,
  buyer_address text,
  buyer_email character varying,
  items jsonb NOT NULL,
  subtotal numeric NOT NULL,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric NOT NULL,
  service_charge numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  payment_method character varying NOT NULL,
  received_amount numeric,
  change_amount numeric,
  status character varying DEFAULT 'issued'::character varying,
  issued_at timestamp with time zone DEFAULT now(),
  printed_at timestamp with time zone,
  emailed_at timestamp with time zone,
  voided_at timestamp with time zone,
  issued_by character varying,
  void_reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT receipts_pkey PRIMARY KEY (id),
  CONSTRAINT receipts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT receipts_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id)
);

-- ============================================================================
-- 統一收藏和評價系統 (整合 favorites, customer_favorites, reviews, customer_reviews)
-- ============================================================================

CREATE TABLE public.user_favorites (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_favorites_pkey PRIMARY KEY (id),
  CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_favorites_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT user_favorites_unique UNIQUE (user_id, product_id)
);

CREATE TABLE public.user_reviews (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  order_id uuid NOT NULL,
  product_id uuid,
  overall_rating integer NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  food_rating integer CHECK (food_rating >= 1 AND food_rating <= 5),
  service_rating integer CHECK (service_rating >= 1 AND service_rating <= 5),
  ambiance_rating integer CHECK (ambiance_rating >= 1 AND ambiance_rating <= 5),
  review_text text,
  comment text,
  photos jsonb,
  is_anonymous boolean DEFAULT false,
  is_approved boolean DEFAULT false,
  response_text text,
  response_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT user_reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT user_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT user_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ============================================================================
-- 優惠券系統 (整合 customer_coupons)
-- ============================================================================

CREATE TABLE public.user_coupons (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  coupon_code character varying NOT NULL UNIQUE,
  title character varying NOT NULL,
  description text,
  discount_type character varying NOT NULL,
  discount_value numeric,
  minimum_order_amount numeric DEFAULT 0,
  maximum_discount_amount numeric,
  applicable_items jsonb,
  usage_limit integer DEFAULT 1,
  used_count integer DEFAULT 0,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  source character varying,
  created_at timestamp with time zone DEFAULT now(),
  used_at timestamp with time zone,
  CONSTRAINT user_coupons_pkey PRIMARY KEY (id),
  CONSTRAINT user_coupons_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ============================================================================
-- AI 相關系統 (保持現有功能但統一命名)
-- ============================================================================

CREATE TABLE public.ai_pets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name character varying DEFAULT 'AI助手'::character varying,
  avatar character varying DEFAULT 'default_ai'::character varying,
  birth_date timestamp with time zone DEFAULT now(),
  level integer DEFAULT 1 CHECK (level >= 1 AND level <= 10),
  experience_points integer DEFAULT 0,
  next_level_exp integer DEFAULT 100,
  friendliness integer DEFAULT 50 CHECK (friendliness >= 0 AND friendliness <= 100),
  formality integer DEFAULT 70 CHECK (formality >= 0 AND formality <= 100),
  proactivity integer DEFAULT 30 CHECK (proactivity >= 0 AND proactivity <= 100),
  humor integer DEFAULT 40 CHECK (humor >= 0 AND humor <= 100),
  memory_focus character varying DEFAULT 'taste'::character varying,
  learning_speed numeric DEFAULT 1.0,
  adaptation_rate numeric DEFAULT 1.0,
  total_conversations integer DEFAULT 0,
  successful_recommendations integer DEFAULT 0,
  customer_satisfaction_avg numeric DEFAULT 5.0,
  mood character varying DEFAULT 'neutral'::character varying,
  energy_level integer DEFAULT 100 CHECK (energy_level >= 0 AND energy_level <= 100),
  special_abilities jsonb DEFAULT '[]'::jsonb,
  personality_quirks jsonb DEFAULT '[]'::jsonb,
  evolution_history jsonb DEFAULT '[]'::jsonb,
  milestones_achieved jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_interaction_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_pets_pkey PRIMARY KEY (id),
  CONSTRAINT ai_pets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.ai_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ai_pet_id uuid NOT NULL,
  session_id uuid,
  user_message text NOT NULL,
  ai_response text NOT NULL,
  interaction_type character varying DEFAULT 'chat'::character varying,
  user_sentiment character varying,
  user_emotion jsonb,
  ai_emotional_response character varying,
  intent_detected character varying,
  service_provided character varying,
  recommendation_made jsonb DEFAULT '[]'::jsonb,
  recommendation_accepted boolean,
  satisfaction_rating integer CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  feedback_text text,
  learning_points integer DEFAULT 1,
  personality_adjustments jsonb DEFAULT '{}'::jsonb,
  preference_updates jsonb DEFAULT '{}'::jsonb,
  response_time_ms integer,
  interaction_duration_ms integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_interactions_pkey PRIMARY KEY (id),
  CONSTRAINT ai_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT ai_interactions_ai_pet_id_fkey FOREIGN KEY (ai_pet_id) REFERENCES public.ai_pets(id)
);

-- ============================================================================
-- 通知和行銷系統
-- ============================================================================

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  type text,
  title text,
  body text,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.marquees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message text NOT NULL,
  href text,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT marquees_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 成就和虛擬寵物系統 (原先遺漏的)
-- ============================================================================

-- 成就系統
CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  description text NOT NULL,
  category character varying NOT NULL,
  requirements jsonb NOT NULL,
  reward_exp integer DEFAULT 0,
  reward_items jsonb DEFAULT '[]'::jsonb,
  rarity character varying DEFAULT 'common'::character varying,
  icon character varying,
  is_active boolean DEFAULT true,
  is_hidden boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT achievements_pkey PRIMARY KEY (id)
);

-- 用戶成就記錄
CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL,
  ai_pet_id uuid,
  achieved_at timestamp with time zone DEFAULT now(),
  progress_data jsonb DEFAULT '{}'::jsonb,
  reward_claimed boolean DEFAULT false,
  claimed_at timestamp with time zone,
  CONSTRAINT user_achievements_pkey PRIMARY KEY (id),
  CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id),
  CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_achievements_ai_pet_id_fkey FOREIGN KEY (ai_pet_id) REFERENCES public.ai_pets(id)
);

-- 虛擬寵物系統 (不同於 AI 助手)
CREATE TABLE public.virtual_pets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  species text NOT NULL,
  level integer NOT NULL DEFAULT 1,
  experience integer NOT NULL DEFAULT 0,
  experience_to_next integer NOT NULL DEFAULT 100,
  health integer NOT NULL DEFAULT 100,
  max_health integer NOT NULL DEFAULT 100,
  happiness integer NOT NULL DEFAULT 80,
  max_happiness integer NOT NULL DEFAULT 100,
  energy integer NOT NULL DEFAULT 90,
  max_energy integer NOT NULL DEFAULT 100,
  hunger integer NOT NULL DEFAULT 30,
  max_hunger integer NOT NULL DEFAULT 100,
  chat_skill integer NOT NULL DEFAULT 5,
  service_skill integer NOT NULL DEFAULT 5,
  loyalty_skill integer NOT NULL DEFAULT 5,
  mood text NOT NULL DEFAULT 'happy'::text,
  activity text NOT NULL DEFAULT 'chatting'::text,
  last_feed_time timestamp with time zone NOT NULL DEFAULT (now() - '02:00:00'::interval),
  last_interaction_time timestamp with time zone NOT NULL DEFAULT (now() - '00:30:00'::interval),
  appearance jsonb NOT NULL DEFAULT jsonb_build_object('color', 'orange', 'pattern', 'standard', 'accessories', '[]', 'emoji', '🦊'),
  total_interactions integer NOT NULL DEFAULT 0,
  total_feedings integer NOT NULL DEFAULT 0,
  days_alive integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT virtual_pets_pkey PRIMARY KEY (id),
  CONSTRAINT virtual_pets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- 虛擬寵物互動記錄
CREATE TABLE public.pet_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  interaction_type text NOT NULL,
  experience_gained integer NOT NULL DEFAULT 0,
  result text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pet_interactions_pkey PRIMARY KEY (id),
  CONSTRAINT pet_interactions_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.virtual_pets(id)
);

-- 候位系統
CREATE TABLE public.waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  restaurant_id uuid NOT NULL,
  party_size integer NOT NULL,
  estimated_wait_time integer,
  status text NOT NULL DEFAULT 'waiting'::text,
  position integer,
  phone character varying,
  name character varying,
  special_requests text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  called_at timestamp with time zone,
  seated_at timestamp with time zone,
  CONSTRAINT waitlist_pkey PRIMARY KEY (id),
  CONSTRAINT waitlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT waitlist_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);

-- ============================================================================
-- AI 進階功能 (原先遺漏的)
-- ============================================================================

-- AI 分析日誌
CREATE TABLE public.ai_analysis_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  analysis_type character varying NOT NULL,
  analysis_scope character varying,
  input_data jsonb NOT NULL,
  parameters jsonb,
  ai_response text NOT NULL,
  result_data jsonb,
  confidence_score numeric,
  execution_time_ms integer,
  model_version character varying,
  created_by character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_analysis_logs_pkey PRIMARY KEY (id),
  CONSTRAINT ai_analysis_logs_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);

-- AI 效能指標
CREATE TABLE public.ai_performance_metrics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  metric_date date NOT NULL,
  metric_hour integer CHECK (metric_hour >= 0 AND metric_hour <= 23),
  table_utilization_rate numeric,
  average_wait_time_minutes integer,
  kitchen_efficiency_score numeric,
  service_speed_score numeric,
  demand_forecast_accuracy numeric,
  prep_time_prediction_accuracy numeric,
  ai_driven_revenue numeric,
  cost_savings numeric,
  waste_reduction_percentage numeric,
  customer_satisfaction_score numeric,
  order_accuracy_rate numeric,
  complaint_resolution_time integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_performance_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT ai_performance_metrics_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);

-- AI 推薦系統
CREATE TABLE public.ai_recommendations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  recommendation_type character varying NOT NULL,
  category character varying,
  priority integer DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  title character varying NOT NULL,
  description text NOT NULL,
  action_items jsonb,
  estimated_impact jsonb,
  confidence_score numeric,
  target_entity character varying,
  target_id uuid,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'reviewed'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'implemented'::character varying]::text[])),
  expires_at timestamp with time zone,
  feedback jsonb,
  implementation_notes text,
  reviewed_by character varying,
  implemented_by character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_recommendations_pkey PRIMARY KEY (id),
  CONSTRAINT ai_recommendations_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);

-- AI 寵物進化日誌
CREATE TABLE public.ai_evolution_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ai_pet_id uuid NOT NULL,
  evolution_type character varying NOT NULL,
  trigger_event character varying,
  changes_made jsonb NOT NULL,
  previous_state jsonb,
  new_state jsonb,
  interaction_count integer,
  user_satisfaction numeric,
  learning_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_evolution_log_pkey PRIMARY KEY (id),
  CONSTRAINT ai_evolution_log_ai_pet_id_fkey FOREIGN KEY (ai_pet_id) REFERENCES public.ai_pets(id)
);

-- ============================================================================
-- 供應商和庫存管理 (原先遺漏的)
-- ============================================================================

-- 供應商管理
CREATE TABLE public.suppliers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  name character varying NOT NULL,
  code character varying,
  contact_person character varying,
  phone character varying,
  email character varying,
  website character varying,
  address text,
  payment_terms character varying,
  delivery_days jsonb,
  min_order_amount numeric DEFAULT 0,
  credit_limit numeric,
  discount_rate numeric DEFAULT 0,
  quality_rating integer CHECK (quality_rating >= 1 AND quality_rating <= 5),
  delivery_rating integer CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  service_rating integer CHECK (service_rating >= 1 AND service_rating <= 5),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT suppliers_pkey PRIMARY KEY (id),
  CONSTRAINT suppliers_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);

-- 原料管理
CREATE TABLE public.raw_materials (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  supplier_id uuid,
  name character varying NOT NULL,
  category character varying NOT NULL,
  sku character varying UNIQUE,
  barcode character varying,
  unit character varying NOT NULL,
  current_stock numeric NOT NULL DEFAULT 0,
  min_stock numeric NOT NULL DEFAULT 0,
  max_stock numeric NOT NULL DEFAULT 0,
  reorder_point numeric NOT NULL DEFAULT 0,
  cost_per_unit numeric NOT NULL DEFAULT 0,
  last_purchase_cost numeric,
  average_cost numeric,
  shelf_life_days integer,
  storage_location character varying,
  storage_conditions text,
  quality_standards text,
  inspection_required boolean DEFAULT false,
  last_restock_date timestamp with time zone,
  last_used_date timestamp with time zone,
  total_consumed numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT raw_materials_pkey PRIMARY KEY (id),
  CONSTRAINT raw_materials_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id),
  CONSTRAINT raw_materials_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)
);

-- 採購訂單
CREATE TABLE public.purchase_orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  purchase_number character varying NOT NULL UNIQUE,
  order_date date NOT NULL,
  expected_delivery_date date,
  actual_delivery_date date,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  shipping_cost numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status character varying DEFAULT 'draft'::character varying CHECK (status::text = ANY (ARRAY['draft'::character varying, 'sent'::character varying, 'confirmed'::character varying, 'partially_received'::character varying, 'received'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])),
  payment_status character varying DEFAULT 'pending'::character varying CHECK (payment_status::text = ANY (ARRAY['pending'::character varying, 'partial'::character varying, 'paid'::character varying, 'overdue'::character varying]::text[])),
  invoice_number character varying,
  invoice_date date,
  payment_due_date date,
  notes text,
  internal_notes text,
  created_by character varying,
  approved_by character varying,
  received_by character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT purchase_orders_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id),
  CONSTRAINT purchase_orders_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);

-- 採購訂單明細
CREATE TABLE public.purchase_order_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  purchase_order_id uuid NOT NULL,
  raw_material_id uuid NOT NULL,
  quantity_ordered numeric NOT NULL,
  quantity_received numeric DEFAULT 0,
  unit character varying NOT NULL,
  unit_cost numeric NOT NULL,
  total_cost numeric NOT NULL,
  quality_checked boolean DEFAULT false,
  quality_rating integer CHECK (quality_rating >= 1 AND quality_rating <= 5),
  quality_notes text,
  expiry_date date,
  lot_number character varying,
  batch_number character varying,
  status character varying DEFAULT 'ordered'::character varying CHECK (status::text = ANY (ARRAY['ordered'::character varying, 'received'::character varying, 'rejected'::character varying, 'cancelled'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_order_items_raw_material_id_fkey FOREIGN KEY (raw_material_id) REFERENCES public.raw_materials(id),
  CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id)
);

-- 庫存異動記錄
CREATE TABLE public.stock_movements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  item_id uuid NOT NULL,
  item_type character varying NOT NULL, -- 'raw_material', 'product'
  movement_type character varying NOT NULL, -- 'in', 'out', 'adjustment', 'waste', 'transfer'
  quantity numeric NOT NULL,
  unit character varying NOT NULL,
  unit_cost numeric,
  total_cost numeric,
  reference_type character varying, -- 'purchase_order', 'order', 'adjustment', 'waste'
  reference_id uuid,
  reference_number character varying,
  reason character varying,
  notes text,
  created_by character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stock_movements_pkey PRIMARY KEY (id),
  CONSTRAINT stock_movements_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);

-- ============================================================================
-- 其他遺漏的實用功能
-- ============================================================================

-- 餐廳休假日 (單日休息)
CREATE TABLE public.restaurant_closures (
  id bigint NOT NULL DEFAULT nextval('restaurant_closures_id_seq'::regclass),
  restaurant_id uuid NOT NULL,
  date date NOT NULL UNIQUE,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT restaurant_closures_pkey PRIMARY KEY (id),
  CONSTRAINT restaurant_closures_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);

-- 外帶序號管理
CREATE TABLE public.takeaway_sequences (
  restaurant_id uuid NOT NULL,
  date date NOT NULL,
  last_sequence integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT takeaway_sequences_pkey PRIMARY KEY (restaurant_id, date),
  CONSTRAINT takeaway_sequences_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);

-- ============================================================================
-- 系統管理和日誌
-- ============================================================================

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL,
  table_name character varying NOT NULL,
  record_id uuid,
  action character varying NOT NULL,
  old_data jsonb,
  new_data jsonb,
  changed_fields jsonb,
  user_id character varying,
  user_type character varying,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);

CREATE TABLE public.error_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  restaurant_id uuid,
  error_type character varying NOT NULL,
  error_message text NOT NULL,
  stack_trace text,
  context jsonb,
  request_data jsonb,
  severity character varying DEFAULT 'medium'::character varying CHECK (severity::text = ANY (ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying]::text[])),
  status character varying DEFAULT 'open'::character varying CHECK (status::text = ANY (ARRAY['open'::character varying, 'investigating'::character varying, 'resolved'::character varying, 'ignored'::character varying]::text[])),
  resolution_notes text,
  reported_by character varying,
  assigned_to character varying,
  resolved_by character varying,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT error_logs_pkey PRIMARY KEY (id),
  CONSTRAINT error_logs_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);

CREATE TABLE public.analytics_events (
  id bigint NOT NULL DEFAULT nextval('analytics_events_id_seq'::regclass),
  user_id uuid,
  event_name text NOT NULL,
  event_time timestamp with time zone DEFAULT now(),
  metadata jsonb,
  CONSTRAINT analytics_events_pkey PRIMARY KEY (id),
  CONSTRAINT analytics_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ============================================================================
-- 索引優化 (提升查詢效能)
-- ============================================================================

-- 用戶相關索引
CREATE INDEX idx_users_phone ON public.users(phone);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);

-- 訂位相關索引
CREATE INDEX idx_reservations_date_time ON public.reservations(reservation_date, reservation_time);
CREATE INDEX idx_reservations_restaurant_status ON public.reservations(restaurant_id, status);
CREATE INDEX idx_reservations_phone ON public.reservations(customer_phone);

-- 訂單相關索引
CREATE INDEX idx_orders_restaurant_date ON public.orders(restaurant_id, created_at);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

-- 商品相關索引
CREATE INDEX idx_products_restaurant_category ON public.products(restaurant_id, category_id);
CREATE INDEX idx_products_active ON public.products(is_active, is_available);

-- AI 相關索引
CREATE INDEX idx_ai_interactions_user_pet ON public.ai_interactions(user_id, ai_pet_id);
CREATE INDEX idx_ai_interactions_created ON public.ai_interactions(created_at);

-- 系統日誌索引
CREATE INDEX idx_audit_logs_restaurant_table ON public.audit_logs(restaurant_id, table_name);
CREATE INDEX idx_error_logs_severity_status ON public.error_logs(severity, status);

-- 創建序列 (如果需要)
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS analytics_events_id_seq;
CREATE SEQUENCE IF NOT EXISTS restaurant_closures_id_seq;

-- ============================================================================
-- 額外索引優化 (新增表格的索引)
-- ============================================================================

-- 成就系統索引
CREATE INDEX idx_achievements_code ON public.achievements(code);
CREATE INDEX idx_user_achievements_user_achievement ON public.user_achievements(user_id, achievement_id);

-- 虛擬寵物索引
CREATE INDEX idx_virtual_pets_user_id ON public.virtual_pets(user_id);
CREATE INDEX idx_pet_interactions_pet_id ON public.pet_interactions(pet_id);

-- 候位系統索引
CREATE INDEX idx_waitlist_restaurant_status ON public.waitlist(restaurant_id, status);
CREATE INDEX idx_waitlist_position ON public.waitlist(restaurant_id, position);

-- 供應商和庫存索引
CREATE INDEX idx_suppliers_restaurant_active ON public.suppliers(restaurant_id, is_active);
CREATE INDEX idx_raw_materials_restaurant_category ON public.raw_materials(restaurant_id, category);
CREATE INDEX idx_purchase_orders_restaurant_status ON public.purchase_orders(restaurant_id, status);
CREATE INDEX idx_stock_movements_restaurant_item ON public.stock_movements(restaurant_id, item_id, item_type);
CREATE INDEX idx_stock_movements_reference ON public.stock_movements(reference_type, reference_id);

-- AI 系統索引
CREATE INDEX idx_ai_analysis_logs_restaurant_type ON public.ai_analysis_logs(restaurant_id, analysis_type);
CREATE INDEX idx_ai_performance_metrics_restaurant_date ON public.ai_performance_metrics(restaurant_id, metric_date);
CREATE INDEX idx_ai_recommendations_restaurant_status ON public.ai_recommendations(restaurant_id, status);

-- 其他索引
CREATE INDEX idx_restaurant_closures_date ON public.restaurant_closures(restaurant_id, date);
CREATE INDEX idx_takeaway_sequences_restaurant_date ON public.takeaway_sequences(restaurant_id, date);

-- ============================================================================
-- 創建序列 (如果需要)
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS analytics_events_id_seq;
CREATE SEQUENCE IF NOT EXISTS restaurant_closures_id_seq;

-- ============================================================================
-- 註釋說明
-- ============================================================================

COMMENT ON SCHEMA public IS '完整整理後的 TanaApp 資料庫架構';
COMMENT ON TABLE public.users IS '統一用戶表，整合原本的 users, profiles, customer_users';
COMMENT ON TABLE public.products IS '統一商品表，支援一般商品和套餐，整合 products, menu_items, combo_products';
COMMENT ON TABLE public.reservations IS '統一訂位表，整合 reservations, customer_reservations, table_reservations';
COMMENT ON TABLE public.orders IS '統一訂單表，整合 orders, customer_orders';
COMMENT ON TABLE public.user_favorites IS '統一收藏表，整合 favorites, customer_favorites';
COMMENT ON TABLE public.user_reviews IS '統一評價表，整合 reviews, customer_reviews';
COMMENT ON TABLE public.user_points IS '統一積分表，整合 loyalty_points, customer_points';
COMMENT ON TABLE public.achievements IS '成就系統，支援用戶獎勵機制';
COMMENT ON TABLE public.virtual_pets IS '虛擬寵物系統，不同於 AI 助手的遊戲化功能';
COMMENT ON TABLE public.waitlist IS '候位系統，管理等待入座的顧客';
COMMENT ON TABLE public.suppliers IS '供應商管理，支援採購流程';
COMMENT ON TABLE public.raw_materials IS '原料庫存管理';
COMMENT ON TABLE public.stock_movements IS '庫存異動追蹤';
COMMENT ON TABLE public.ai_analysis_logs IS 'AI 分析日誌，記錄 AI 決策過程';
COMMENT ON TABLE public.ai_performance_metrics IS 'AI 效能監控指標';
COMMENT ON TABLE public.ai_recommendations IS 'AI 推薦系統，提供營運建議';
