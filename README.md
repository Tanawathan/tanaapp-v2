# TanaApp v2 (Reservations)

一個專注於「餐廳消費者端線上訂位」的 Next.js 14 + Supabase 範例。

## 特色
- 現代化首頁與「線上訂位」入口
- 訂位頁支援日期/時間/人數/姓名/電話
- 讀取 Supabase reservations 資料表並顯示
- 送出新訂位，寫回 Supabase

## 環境變數
請建立 `.env.local`：
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESTAURANT_ID=...
```

## 開發
```
npm install
npm run dev
```
開啟 http://localhost:3001

## 注意
- 需要 Supabase 端存在 `reservations`、`restaurants` 資料表，且 `RESTAURANT_ID` 對應存在。
- 若開啟 RLS，請確保 API 可以插入/查詢。
