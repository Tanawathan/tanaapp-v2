# TanaApp API 更新建議

## /api/auth/profile

**原始:** profiles 表

**新版:** users 表

**建議變更:**
- 更新查詢語句
- 調整欄位對應
- 合併 customer_users 邏輯

## /api/customers

**原始:** customer_users 表

**新版:** users 表 (where user_type = customer)

**建議變更:**
- 統一用戶查詢
- 更新註冊流程
- 整合會員系統

## /api/menu

**原始:** menu_items, menu_categories

**新版:** products, categories

**建議變更:**
- 更新商品查詢
- 整合套餐邏輯
- 統一分類系統

## /api/reservations

**原始:** customer_reservations, table_reservations

**新版:** reservations (統一表)

**建議變更:**
- 合併訂位邏輯
- 統一狀態管理
- 整合桌位分配

## /api/orders

**原始:** customer_orders, orders

**新版:** orders (統一表)

**建議變更:**
- 合併訂單系統
- 統一支付流程
- 整合積分計算

## /api/favorites

**原始:** favorites, customer_favorites

**新版:** user_favorites

**建議變更:**
- 統一收藏系統
- 支援多種收藏類型

