-- TanaApp 資料庫遷移腳本
-- 從原始架構遷移到優化架構
-- 生成時間: 2025-08-14T07:26:29.545Z

-- ============================================================================
-- 第一步: 備份現有資料
-- ============================================================================

CREATE TABLE customer_users_backup AS SELECT * FROM customer_users;
CREATE TABLE profiles_backup AS SELECT * FROM profiles;
CREATE TABLE customer_preferences_backup AS SELECT * FROM customer_preferences;
CREATE TABLE customer_points_backup AS SELECT * FROM customer_points;
CREATE TABLE customer_points_transactions_backup AS SELECT * FROM customer_points_transactions;
CREATE TABLE loyalty_points_backup AS SELECT * FROM loyalty_points;
CREATE TABLE loyalty_transactions_backup AS SELECT * FROM loyalty_transactions;
CREATE TABLE menu_items_backup AS SELECT * FROM menu_items;
CREATE TABLE menu_categories_backup AS SELECT * FROM menu_categories;
CREATE TABLE combo_products_backup AS SELECT * FROM combo_products;
CREATE TABLE customer_reservations_backup AS SELECT * FROM customer_reservations;
CREATE TABLE table_reservations_backup AS SELECT * FROM table_reservations;
CREATE TABLE customer_orders_backup AS SELECT * FROM customer_orders;
CREATE TABLE customer_favorites_backup AS SELECT * FROM customer_favorites;
CREATE TABLE favorites_backup AS SELECT * FROM favorites;
CREATE TABLE customer_reviews_backup AS SELECT * FROM customer_reviews;
CREATE TABLE reviews_backup AS SELECT * FROM reviews;
CREATE TABLE customer_coupons_backup AS SELECT * FROM customer_coupons;
CREATE TABLE restaurant_settings_backup AS SELECT * FROM restaurant_settings;

-- ============================================================================
-- 第二步: 創建新的優化表格結構
-- ============================================================================

-- 請執行 supabase_optimized.sql 中的 CREATE TABLE 語句

-- ============================================================================
-- 第三步: 資料遷移
-- ============================================================================

-- 遷移用戶資料
INSERT INTO users (
  id, phone, email, name, password_hash, avatar_url, birthday, 
  preferred_language, timezone, is_active, last_active_at, 
  terms_accepted, marketing_consent, created_at, updated_at
)
SELECT 
  id, phone, email, name, password_hash, avatar_url, birth_date,
  'zh-TW', 'Asia/Taipei', is_active, last_login,
  terms_accepted, marketing_consent, created_at, updated_at
FROM customer_users_backup;

-- 遷移商品資料 (從 menu_items)
INSERT INTO products (
  id, restaurant_id, category_id, name, description, price,
  image_url, is_available, is_active, tags, created_at, updated_at
)
SELECT 
  id, 'your-restaurant-uuid-here', category_id::uuid, name, description, price,
  image_url, is_active, is_active, tags, created_at, updated_at
FROM menu_items_backup;

-- 遷移訂位資料 (從 customer_reservations)
INSERT INTO reservations (
  id, restaurant_id, user_id, customer_name, customer_phone, customer_email,
  party_size, reservation_date, reservation_time, status, special_requests,
  created_at, updated_at
)
SELECT 
  id, 'your-restaurant-uuid-here', customer_id, 
  (SELECT name FROM customer_users_backup WHERE id = customer_id),
  contact_phone, contact_email, party_size, reservation_date, reservation_time,
  status, special_requests, created_at, updated_at
FROM customer_reservations_backup;


-- ============================================================================
-- 第四步: 驗證資料完整性
-- ============================================================================

-- 驗證 customer_users -> users 的資料遷移
SELECT COUNT(*) as customer_users_backup_count FROM customer_users_backup;
SELECT COUNT(*) as users_count FROM users WHERE migration_source = 'customer_users';

-- 驗證 profiles -> users 的資料遷移
SELECT COUNT(*) as profiles_backup_count FROM profiles_backup;
SELECT COUNT(*) as users_count FROM users WHERE migration_source = 'profiles';

-- 驗證 customer_preferences -> user_preferences 的資料遷移
SELECT COUNT(*) as customer_preferences_backup_count FROM customer_preferences_backup;
SELECT COUNT(*) as user_preferences_count FROM user_preferences WHERE migration_source = 'customer_preferences';

-- 驗證 customer_points -> user_points 的資料遷移
SELECT COUNT(*) as customer_points_backup_count FROM customer_points_backup;
SELECT COUNT(*) as user_points_count FROM user_points WHERE migration_source = 'customer_points';

-- 驗證 customer_points_transactions -> user_points_transactions 的資料遷移
SELECT COUNT(*) as customer_points_transactions_backup_count FROM customer_points_transactions_backup;
SELECT COUNT(*) as user_points_transactions_count FROM user_points_transactions WHERE migration_source = 'customer_points_transactions';

-- 驗證 loyalty_points -> user_points 的資料遷移
SELECT COUNT(*) as loyalty_points_backup_count FROM loyalty_points_backup;
SELECT COUNT(*) as user_points_count FROM user_points WHERE migration_source = 'loyalty_points';

-- 驗證 loyalty_transactions -> user_points_transactions 的資料遷移
SELECT COUNT(*) as loyalty_transactions_backup_count FROM loyalty_transactions_backup;
SELECT COUNT(*) as user_points_transactions_count FROM user_points_transactions WHERE migration_source = 'loyalty_transactions';

-- 驗證 menu_items -> products 的資料遷移
SELECT COUNT(*) as menu_items_backup_count FROM menu_items_backup;
SELECT COUNT(*) as products_count FROM products WHERE migration_source = 'menu_items';

-- 驗證 menu_categories -> categories 的資料遷移
SELECT COUNT(*) as menu_categories_backup_count FROM menu_categories_backup;
SELECT COUNT(*) as categories_count FROM categories WHERE migration_source = 'menu_categories';

-- 驗證 combo_products -> products 的資料遷移
SELECT COUNT(*) as combo_products_backup_count FROM combo_products_backup;
SELECT COUNT(*) as products_count FROM products WHERE migration_source = 'combo_products';

-- 驗證 customer_reservations -> reservations 的資料遷移
SELECT COUNT(*) as customer_reservations_backup_count FROM customer_reservations_backup;
SELECT COUNT(*) as reservations_count FROM reservations WHERE migration_source = 'customer_reservations';

-- 驗證 table_reservations -> reservations 的資料遷移
SELECT COUNT(*) as table_reservations_backup_count FROM table_reservations_backup;
SELECT COUNT(*) as reservations_count FROM reservations WHERE migration_source = 'table_reservations';

-- 驗證 customer_orders -> orders 的資料遷移
SELECT COUNT(*) as customer_orders_backup_count FROM customer_orders_backup;
SELECT COUNT(*) as orders_count FROM orders WHERE migration_source = 'customer_orders';

-- 驗證 customer_favorites -> user_favorites 的資料遷移
SELECT COUNT(*) as customer_favorites_backup_count FROM customer_favorites_backup;
SELECT COUNT(*) as user_favorites_count FROM user_favorites WHERE migration_source = 'customer_favorites';

-- 驗證 favorites -> user_favorites 的資料遷移
SELECT COUNT(*) as favorites_backup_count FROM favorites_backup;
SELECT COUNT(*) as user_favorites_count FROM user_favorites WHERE migration_source = 'favorites';

-- 驗證 customer_reviews -> user_reviews 的資料遷移
SELECT COUNT(*) as customer_reviews_backup_count FROM customer_reviews_backup;
SELECT COUNT(*) as user_reviews_count FROM user_reviews WHERE migration_source = 'customer_reviews';

-- 驗證 reviews -> user_reviews 的資料遷移
SELECT COUNT(*) as reviews_backup_count FROM reviews_backup;
SELECT COUNT(*) as user_reviews_count FROM user_reviews WHERE migration_source = 'reviews';

-- 驗證 customer_coupons -> user_coupons 的資料遷移
SELECT COUNT(*) as customer_coupons_backup_count FROM customer_coupons_backup;
SELECT COUNT(*) as user_coupons_count FROM user_coupons WHERE migration_source = 'customer_coupons';

-- 驗證 restaurant_settings -> restaurants 的資料遷移
SELECT COUNT(*) as restaurant_settings_backup_count FROM restaurant_settings_backup;
SELECT COUNT(*) as restaurants_count FROM restaurants WHERE migration_source = 'restaurant_settings';

-- ============================================================================
-- 第五步: 清理備份表格 (確認無誤後執行)
-- ============================================================================

-- DROP TABLE customer_users_backup; -- 取消註釋以執行
-- DROP TABLE profiles_backup; -- 取消註釋以執行
-- DROP TABLE customer_preferences_backup; -- 取消註釋以執行
-- DROP TABLE customer_points_backup; -- 取消註釋以執行
-- DROP TABLE customer_points_transactions_backup; -- 取消註釋以執行
-- DROP TABLE loyalty_points_backup; -- 取消註釋以執行
-- DROP TABLE loyalty_transactions_backup; -- 取消註釋以執行
-- DROP TABLE menu_items_backup; -- 取消註釋以執行
-- DROP TABLE menu_categories_backup; -- 取消註釋以執行
-- DROP TABLE combo_products_backup; -- 取消註釋以執行
-- DROP TABLE customer_reservations_backup; -- 取消註釋以執行
-- DROP TABLE table_reservations_backup; -- 取消註釋以執行
-- DROP TABLE customer_orders_backup; -- 取消註釋以執行
-- DROP TABLE customer_favorites_backup; -- 取消註釋以執行
-- DROP TABLE favorites_backup; -- 取消註釋以執行
-- DROP TABLE customer_reviews_backup; -- 取消註釋以執行
-- DROP TABLE reviews_backup; -- 取消註釋以執行
-- DROP TABLE customer_coupons_backup; -- 取消註釋以執行
-- DROP TABLE restaurant_settings_backup; -- 取消註釋以執行
