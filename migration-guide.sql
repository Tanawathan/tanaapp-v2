-- TanaApp 資料庫架構比較與遷移指南
-- =====================================================

-- 此檔案包含從原始架構到優化架構的完整遷移計劃

-- ============================================================================
-- 表格整合對應關係
-- ============================================================================

/*
原始表格                    -->  優化表格                   說明
-------------------------------------------------------------------------
customer_users              -->  users                     統一用戶系統
profiles                    -->  users                     整合用戶資料
customer_preferences        -->  user_preferences          統一偏好設定
customer_points             -->  user_points               統一積分系統
customer_points_transactions-->  user_points_transactions  積分交易記錄
loyalty_points              -->  user_points               合併忠誠度系統
loyalty_transactions        -->  user_points_transactions  合併交易記錄

menu_items                  -->  products                  統一商品系統
menu_categories             -->  categories                統一分類系統
combo_products              -->  products (combo_type)     套餐整合到商品

customer_reservations       -->  reservations              統一訂位系統
table_reservations          -->  reservations              合併訂位邏輯

customer_orders             -->  orders                    統一訂單系統

customer_favorites          -->  user_favorites            統一收藏系統
favorites                   -->  user_favorites            合併收藏功能

customer_reviews            -->  user_reviews              統一評價系統
reviews                     -->  user_reviews              合併評價功能

customer_coupons            -->  user_coupons              統一優惠券系統

restaurant_settings         -->  restaurants.settings      設定整合到主表
*/

-- ============================================================================
-- 第一階段：資料備份
-- ============================================================================

-- 建立備份表格以確保資料安全
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

-- ============================================================================
-- 第二階段：創建優化後的表格結構
-- ============================================================================

-- 請執行 supabase_optimized.sql 中的所有 CREATE TABLE 語句

-- ============================================================================
-- 第三階段：資料遷移
-- ============================================================================

-- 1. 遷移用戶資料 (customer_users -> users)
INSERT INTO users (
    id, phone, email, name, password_hash, avatar_url, birthday, gender,
    is_active, last_active_at, terms_accepted, marketing_consent,
    created_at, updated_at, member_tier
)
SELECT 
    cu.id,
    cu.phone,
    cu.email,
    cu.name,
    cu.password_hash,
    cu.avatar_url,
    cu.birth_date as birthday,
    cu.gender,
    cu.is_active,
    cu.last_login as last_active_at,
    cu.terms_accepted,
    cu.marketing_consent,
    cu.created_at,
    cu.updated_at,
    COALESCE(p.member_tier, 'bronze') as member_tier
FROM customer_users_backup cu
LEFT JOIN profiles_backup p ON cu.id = p.id;

-- 2. 遷移用戶偏好設定 (customer_preferences -> user_preferences)
INSERT INTO user_preferences (
    id, user_id, spice_tolerance, sweet_preference, sour_preference, salty_preference,
    dietary_restrictions, allergens, avoided_ingredients, preferred_cuisines,
    favorite_dishes, disliked_dishes, ordering_frequency, avg_order_value,
    preferred_meal_times, party_size_usual, decision_speed, price_sensitivity,
    adventurous_level, confidence_scores, created_at, updated_at
)
SELECT 
    cp.id, cp.user_id, cp.spice_tolerance, cp.sweet_preference, cp.sour_preference,
    cp.salty_preference, cp.dietary_restrictions, cp.allergens, cp.avoided_ingredients,
    cp.preferred_cuisines, cp.favorite_dishes, cp.disliked_dishes, cp.ordering_frequency,
    cp.avg_order_value, cp.preferred_meal_times, cp.party_size_usual, cp.decision_speed,
    cp.price_sensitivity, cp.adventurous_level, cp.confidence_scores, cp.created_at, cp.updated_at
FROM customer_preferences_backup cp;

-- 3. 遷移積分資料 (customer_points + loyalty_points -> user_points)
INSERT INTO user_points (
    user_id, points_balance, total_earned, total_redeemed, tier, tier_expires_at,
    created_at, updated_at
)
SELECT 
    COALESCE(cp.customer_id, lp.user_id) as user_id,
    COALESCE(cp.points_balance, lp.balance, 0) as points_balance,
    COALESCE(cp.total_earned, 0) as total_earned,
    COALESCE(cp.total_redeemed, 0) as total_redeemed,
    COALESCE(cp.tier, 'bronze') as tier,
    cp.tier_expires_at,
    COALESCE(cp.created_at, lp.created_at, NOW()) as created_at,
    COALESCE(cp.updated_at, lp.updated_at, NOW()) as updated_at
FROM customer_points_backup cp
FULL OUTER JOIN loyalty_points_backup lp ON cp.customer_id = lp.user_id;

-- 4. 遷移積分交易記錄
INSERT INTO user_points_transactions (
    user_id, type, points, balance_after, reference_type, reference_id,
    description, expires_at, created_at, created_by
)
-- 從 customer_points_transactions 遷移
SELECT 
    customer_id as user_id, type, points, balance_after, reference_type,
    reference_id, description, expires_at, created_at, created_by
FROM customer_points_transactions_backup
UNION ALL
-- 從 loyalty_transactions 遷移
SELECT 
    user_id, 
    CASE WHEN delta > 0 THEN 'earned' ELSE 'redeemed' END as type,
    ABS(delta) as points,
    0 as balance_after, -- 需要重新計算
    'legacy_import' as reference_type,
    NULL as reference_id,
    reason as description,
    NULL as expires_at,
    created_at,
    NULL as created_by
FROM loyalty_transactions_backup;

-- 5. 遷移商品分類 (menu_categories -> categories)
INSERT INTO categories (
    id, restaurant_id, name, description, sort_order, display_order, is_active,
    created_at, updated_at
)
SELECT 
    gen_random_uuid() as id,
    'YOUR_RESTAURANT_ID_HERE'::uuid as restaurant_id, -- 替換為實際餐廳 ID
    mc.name,
    NULL as description,
    mc.display_order as sort_order,
    mc.display_order,
    mc.is_active,
    NOW() as created_at,
    NOW() as updated_at
FROM menu_categories_backup mc;

-- 6. 遷移商品資料 (menu_items -> products)
INSERT INTO products (
    id, restaurant_id, category_id, name, description, price, image_url,
    is_available, is_active, tags, popularity_score, product_type,
    created_at, updated_at
)
SELECT 
    mi.id,
    'YOUR_RESTAURANT_ID_HERE'::uuid as restaurant_id, -- 替換為實際餐廳 ID
    c.id as category_id, -- 需要對應新的分類 ID
    mi.name,
    mi.description,
    mi.price,
    mi.image_url,
    mi.is_active as is_available,
    mi.is_active,
    mi.tags,
    mi.popularity_score,
    'single' as product_type,
    mi.created_at,
    mi.updated_at
FROM menu_items_backup mi
LEFT JOIN categories c ON c.name = (
    SELECT name FROM menu_categories_backup mc WHERE mc.id = mi.category_id
);

-- 7. 遷移套餐商品 (combo_products -> products)
INSERT INTO products (
    id, restaurant_id, category_id, name, description, price, cost, image_url,
    is_available, is_active, product_type, combo_type, min_items, max_items,
    discount_type, discount_value, prep_time_minutes, created_at, updated_at
)
SELECT 
    cp.id,
    cp.restaurant_id,
    cp.category_id,
    cp.name,
    cp.description,
    cp.price,
    cp.cost,
    cp.image_url,
    cp.is_available,
    cp.is_active,
    'combo' as product_type,
    cp.combo_type,
    cp.min_items,
    cp.max_items,
    cp.discount_type,
    cp.discount_value,
    cp.preparation_time as prep_time_minutes,
    cp.created_at,
    cp.updated_at
FROM combo_products_backup cp;

-- 8. 遷移訂位資料 (customer_reservations -> reservations)
INSERT INTO reservations (
    id, restaurant_id, user_id, table_id, customer_name, customer_phone, customer_email,
    party_size, reservation_date, reservation_time, status, special_requests,
    notes, reminder_sent, check_in_time, seated_at, created_at, updated_at,
    cancelled_at, cancellation_reason, created_via
)
SELECT 
    cr.id,
    'YOUR_RESTAURANT_ID_HERE'::uuid as restaurant_id, -- 替換為實際餐廳 ID
    cr.customer_id as user_id,
    cr.table_id,
    u.name as customer_name,
    cr.contact_phone as customer_phone,
    cr.contact_email as customer_email,
    cr.party_size,
    cr.reservation_date,
    cr.reservation_time,
    cr.status,
    cr.special_requests,
    cr.notes,
    cr.reminder_sent,
    cr.check_in_time,
    cr.seated_time as seated_at,
    cr.created_at,
    cr.updated_at,
    cr.cancelled_at,
    cr.cancellation_reason,
    'manual' as created_via
FROM customer_reservations_backup cr
LEFT JOIN users u ON u.id = cr.customer_id;

-- 9. 遷移桌位訂位 (table_reservations -> reservations)
INSERT INTO reservations (
    id, restaurant_id, table_id, customer_name, customer_phone, customer_email,
    party_size, reservation_date, reservation_time, duration_minutes, status,
    special_requests, notes, adult_count, child_count, child_chair_needed,
    deposit_amount, deposit_paid, deposit_payment_method, created_by,
    confirmed_at, seated_at, completed_at, created_at, updated_at, created_via
)
SELECT 
    tr.id,
    tr.restaurant_id,
    tr.table_id,
    tr.customer_name,
    tr.customer_phone,
    tr.customer_email,
    tr.party_size,
    tr.reservation_time::date as reservation_date,
    tr.reservation_time::time as reservation_time,
    tr.duration_minutes,
    tr.status,
    tr.special_requests,
    tr.notes,
    tr.adult_count,
    tr.child_count,
    tr.child_chair_needed,
    tr.deposit_amount,
    tr.deposit_paid,
    tr.deposit_payment_method,
    tr.created_by,
    tr.confirmed_at,
    tr.seated_at,
    tr.completed_at,
    tr.created_at,
    tr.updated_at,
    'manual' as created_via
FROM table_reservations_backup tr;

-- 10. 遷移訂單資料 (customer_orders -> orders)
INSERT INTO orders (
    id, restaurant_id, user_id, table_id, order_number, order_type, status,
    subtotal, tax_amount, discount_amount, points_used, points_earned,
    total_amount, payment_method, payment_status, notes, delivery_address,
    estimated_ready_time, completed_at, created_at, updated_at
)
SELECT 
    co.id,
    'YOUR_RESTAURANT_ID_HERE'::uuid as restaurant_id, -- 替換為實際餐廳 ID
    co.customer_id as user_id,
    co.table_id,
    co.order_number,
    co.order_type,
    co.status,
    co.subtotal,
    co.tax_amount,
    co.discount_amount,
    co.points_used,
    co.points_earned,
    co.total_amount,
    co.payment_method,
    co.payment_status,
    co.notes,
    co.delivery_address,
    co.estimated_ready_time,
    co.completed_at,
    co.created_at,
    co.updated_at
FROM customer_orders_backup co;

-- 11. 遷移收藏資料 (favorites + customer_favorites -> user_favorites)
INSERT INTO user_favorites (user_id, product_id, created_at)
-- 從 favorites 遷移
SELECT user_id, menu_item_id as product_id, created_at
FROM favorites_backup
UNION ALL
-- 從 customer_favorites 遷移
SELECT customer_id as user_id, product_id, created_at
FROM customer_favorites_backup;

-- 12. 遷移評價資料 (reviews + customer_reviews -> user_reviews)
INSERT INTO user_reviews (
    id, user_id, order_id, product_id, overall_rating, food_rating,
    service_rating, ambiance_rating, review_text, comment, photos,
    is_anonymous, is_approved, response_text, response_at,
    created_at, updated_at
)
-- 從 reviews 遷移
SELECT 
    r.id, r.user_id, NULL as order_id, r.menu_item_id as product_id,
    r.rating as overall_rating, NULL as food_rating, NULL as service_rating,
    NULL as ambiance_rating, r.comment as review_text, r.comment,
    NULL as photos, false as is_anonymous, true as is_approved,
    NULL as response_text, NULL as response_at, r.created_at, NOW() as updated_at
FROM reviews_backup r
UNION ALL
-- 從 customer_reviews 遷移
SELECT 
    cr.id, cr.customer_id as user_id, cr.order_id, cr.product_id,
    cr.overall_rating, cr.food_rating, cr.service_rating, cr.ambiance_rating,
    cr.review_text, cr.review_text as comment, cr.photos, cr.is_anonymous,
    cr.is_approved, cr.response_text, cr.response_at, cr.created_at, cr.updated_at
FROM customer_reviews_backup cr;

-- 13. 遷移優惠券資料 (customer_coupons -> user_coupons)
INSERT INTO user_coupons (
    id, user_id, coupon_code, title, description, discount_type, discount_value,
    minimum_order_amount, maximum_discount_amount, applicable_items,
    usage_limit, used_count, valid_from, valid_until, is_active, source,
    created_at, used_at
)
SELECT 
    cc.id, cc.customer_id as user_id, cc.coupon_code, cc.title, cc.description,
    cc.discount_type, cc.discount_value, cc.minimum_order_amount,
    cc.maximum_discount_amount, cc.applicable_items, cc.usage_limit,
    cc.used_count, cc.valid_from, cc.valid_until, cc.is_active, cc.source,
    cc.created_at, cc.used_at
FROM customer_coupons_backup cc;

-- ============================================================================
-- 第四階段：資料驗證
-- ============================================================================

-- 驗證用戶遷移
SELECT 
    'customer_users' as source_table,
    COUNT(*) as backup_count,
    (SELECT COUNT(*) FROM users) as migrated_count;

-- 驗證商品遷移
SELECT 
    'menu_items' as source_table,
    COUNT(*) as backup_count,
    (SELECT COUNT(*) FROM products WHERE product_type = 'single') as migrated_count
FROM menu_items_backup;

-- 驗證套餐遷移
SELECT 
    'combo_products' as source_table,
    COUNT(*) as backup_count,
    (SELECT COUNT(*) FROM products WHERE product_type = 'combo') as migrated_count
FROM combo_products_backup;

-- 驗證訂位遷移
SELECT 
    'reservations' as total,
    (SELECT COUNT(*) FROM customer_reservations_backup) + 
    (SELECT COUNT(*) FROM table_reservations_backup) as backup_count,
    (SELECT COUNT(*) FROM reservations) as migrated_count;

-- 驗證積分遷移
SELECT 
    'points' as total,
    (SELECT COUNT(*) FROM customer_points_backup) + 
    (SELECT COUNT(*) FROM loyalty_points_backup) as backup_count,
    (SELECT COUNT(*) FROM user_points) as migrated_count;

-- ============================================================================
-- 第五階段：更新相關約束和索引
-- ============================================================================

-- 更新外鍵約束以確保資料完整性
-- (這些會在執行 supabase_optimized.sql 時自動創建)

-- 重新計算積分餘額
UPDATE user_points 
SET points_balance = (
    SELECT COALESCE(SUM(
        CASE 
            WHEN type IN ('earned', 'bonus') THEN points
            WHEN type IN ('redeemed', 'expired') THEN -points
            ELSE 0
        END
    ), 0)
    FROM user_points_transactions 
    WHERE user_points_transactions.user_id = user_points.user_id
);

-- ============================================================================
-- 第六階段：清理和最佳化
-- ============================================================================

-- 更新統計資訊
ANALYZE users;
ANALYZE products;
ANALYZE reservations;
ANALYZE orders;
ANALYZE user_favorites;
ANALYZE user_reviews;
ANALYZE user_points;
ANALYZE user_points_transactions;

-- 重建索引 (如果需要)
REINDEX TABLE users;
REINDEX TABLE products;
REINDEX TABLE reservations;
REINDEX TABLE orders;

-- ============================================================================
-- 第七階段：備份表格清理 (確認無誤後執行)
-- ============================================================================

/*
-- 取消註釋以刪除備份表格
DROP TABLE customer_users_backup;
DROP TABLE profiles_backup;
DROP TABLE customer_preferences_backup;
DROP TABLE customer_points_backup;
DROP TABLE customer_points_transactions_backup;
DROP TABLE loyalty_points_backup;
DROP TABLE loyalty_transactions_backup;
DROP TABLE menu_items_backup;
DROP TABLE menu_categories_backup;
DROP TABLE combo_products_backup;
DROP TABLE customer_reservations_backup;
DROP TABLE table_reservations_backup;
DROP TABLE customer_orders_backup;
DROP TABLE customer_favorites_backup;
DROP TABLE favorites_backup;
DROP TABLE customer_reviews_backup;
DROP TABLE reviews_backup;
DROP TABLE customer_coupons_backup;
*/

-- ============================================================================
-- 注意事項和後續步驟
-- ============================================================================

/*
1. 執行前請務必：
   - 完整備份現有資料庫
   - 在測試環境中先行測試
   - 確認餐廳 ID 等關鍵參數

2. 執行順序：
   - 先執行此檔案的第一、二階段
   - 然後執行 supabase_optimized.sql
   - 再執行此檔案的第三到七階段

3. 後續工作：
   - 更新 API 路由代碼
   - 調整前端查詢邏輯
   - 更新文檔和測試用例
   - 監控系統效能

4. 回滾計劃：
   - 保留備份表格直到確認遷移成功
   - 準備回滾腳本以防出現問題
*/
