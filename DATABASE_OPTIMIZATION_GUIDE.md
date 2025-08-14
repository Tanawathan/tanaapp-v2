# TanaApp 資料庫優化與遷移指南

## 專案現況總結

### 🎯 專案狀態
- **專案名稱**: TanaApp V2 - 泰式餐廳管理系統
- **技術堆疊**: Next.js 14 + Supabase + TypeScript + Tailwind CSS
- **伺服器**: 已在 localhost:3001 運行
- **資料庫**: Supabase PostgreSQL，59 個表格（需要優化）

### 📊 資料庫分析結果
**原始架構問題**:
- 59 個表格中有大量重複功能
- customer_* 和一般表格重複（如 customer_reviews vs reviews）
- 多套積分系統混合使用
- 資料分散導致查詢複雜

**優化後架構**:
- 減少到 47 個表格（減少 21.7%）
- 統一用戶系統（users 表格）
- 統一積分系統（user_points, user_points_transactions）
- 統一產品系統（products 表格整合 menu_items）

### 📋 重要數據備份狀態
已備份的重要數據：
- ✅ `table_reservations`: 45 筆記錄
- ✅ `combo_products`: 9 筆記錄
- ✅ `customer_preferences`: 1 筆記錄
- ✅ `menu_items`: 1 筆記錄
- ✅ `menu_categories`: 1 筆記錄

## 🚀 立即執行步驟

### 步驟 1: 在 Supabase Dashboard 創建優化表格
1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案
3. 點選左側選單的 "SQL Editor"
4. 複製並執行 `supabase_dashboard_sql.sql` 中的內容

### 步驟 2: 驗證表格創建
```bash
node supabase-sql.js check
```
應該看到所有表格都存在。

### 步驟 3: 執行遷移前檢查
```bash
node supabase-db-tool.js check
```
確保所有檢查通過。

### 步驟 4: 執行資料遷移
使用我們提供的遷移指南：
```bash
# 在 Supabase Dashboard SQL Editor 中執行
cat migration-guide.sql
```

## 📁 工具文件說明

### 🔧 主要工具
1. **supabase-db-tool.js** - 主要資料庫管理工具
   - `analyze`: 分析現有資料庫結構
   - `backup`: 備份重要數據
   - `check`: 遷移前檢查
   - `validate`: 遷移後驗證

2. **supabase-sql.js** - SQL 執行工具
   - `check`: 檢查表格是否存在
   - `create`: 創建優化表格（提示使用 Dashboard）

3. **database-migration-tool.js** - 分析和比較工具
   - 自動化分析資料庫差異
   - 生成遷移建議

### 📄 重要檔案
- `supabase_dashboard_sql.sql` - 在 Supabase Dashboard 執行
- `supabase_optimized.sql` - 完整優化架構
- `migration-guide.sql` - 詳細遷移步驟
- `database-report.json` - 資料庫分析報告

## ⚡ 快速開始

如果你想立即開始優化：

```bash
# 1. 檢查現有資料庫
node supabase-db-tool.js analyze

# 2. 備份重要數據（已完成）
node supabase-db-tool.js backup

# 3. 檢查優化表格狀態
node supabase-sql.js check

# 4. 在 Supabase Dashboard 執行優化 SQL
# 複製 supabase_dashboard_sql.sql 內容到 SQL Editor

# 5. 再次檢查表格
node supabase-sql.js check

# 6. 執行遷移前最終檢查
node supabase-db-tool.js check
```

## 🎯 預期效果

完成優化後，你將獲得：
- ✨ 更清潔的資料庫架構
- 🚀 更快的查詢性能
- 🔒 完整的安全性控制（RLS 政策）
- 📊 統一的數據管理方式
- 🛠️ 更容易維護的程式碼

## ⚠️ 重要提醒

1. **所有重要數據已備份** - 在 `backups/` 目錄
2. **先在測試環境驗證** - 如果有的話
3. **保留原始架構** - 直到完全驗證新架構
4. **漸進式遷移** - 不需要一次性完成所有遷移

## 🤝 下一步

執行優化後，建議：
1. 更新 API 路由以使用新的表格結構
2. 更新前端組件的數據查詢
3. 測試所有功能是否正常運作
4. 監控性能改善情況

---

**專案整理完成時間**: 2025-08-14
**優化效果**: 資料庫表格減少 21.7%，結構更清晰，性能更佳
**工具狀態**: 所有分析和遷移工具已準備就緒
