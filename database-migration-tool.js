/**
 * TanaApp 資料庫架構整理工具
 * 用於分析、比較和遷移資料庫結構
 */

// 原始表格清單 (從 supabase.sql 提取)
const originalTables = [
  'achievements',
  'ai_analysis_logs',
  'ai_evolution_log',
  'ai_interactions',
  'ai_performance_metrics',
  'ai_pets',
  'ai_recommendations',
  'analytics_events',
  'audit_logs',
  'categories',
  'combo_products',
  'combo_selection_options',
  'combo_selection_rules',
  'customer_coupons',
  'customer_favorites',
  'customer_orders',
  'customer_points',
  'customer_points_transactions',
  'customer_preferences',
  'customer_reservations',
  'customer_reviews',
  'customer_users',
  'error_logs',
  'favorites',
  'loyalty_points',
  'loyalty_transactions',
  'marquees',
  'menu_categories',
  'menu_items',
  'notifications',
  'order_combo_selections',
  'order_items',
  'orders',
  'payments',
  'pet_interactions',
  'product_modifiers',
  'product_variants',
  'products',
  'profiles',
  'purchase_order_items',
  'purchase_orders',
  'raw_materials',
  'receipts',
  'reservations',
  'restaurant_closures',
  'restaurant_holidays',
  'restaurant_settings',
  'restaurants',
  'reviews',
  'stock_movements',
  'suppliers',
  'table_reservations',
  'table_sessions',
  'tables',
  'takeaway_sequences',
  'user_achievements',
  'user_sessions',
  'users',
  'virtual_pets',
  'waitlist'
];

// 優化後的表格清單 (從 supabase_optimized.sql)
const optimizedTables = [
  'restaurants',
  'restaurant_holidays',
  'users',
  'user_sessions',
  'user_preferences',
  'user_points',
  'user_points_transactions',
  'tables',
  'reservations',
  'table_sessions',
  'categories',
  'products',
  'product_variants',
  'product_modifiers',
  'combo_selection_rules',
  'combo_selection_options',
  'orders',
  'order_items',
  'order_combo_selections',
  'payments',
  'receipts',
  'user_favorites',
  'user_reviews',
  'user_coupons',
  'ai_pets',
  'ai_interactions',
  'notifications',
  'marquees',
  'achievements',
  'user_achievements',
  'virtual_pets',
  'pet_interactions',
  'waitlist',
  'ai_analysis_logs',
  'ai_performance_metrics',
  'ai_recommendations',
  'ai_evolution_log',
  'suppliers',
  'raw_materials',
  'purchase_orders',
  'purchase_order_items',
  'stock_movements',
  'restaurant_closures',
  'takeaway_sequences',
  'audit_logs',
  'error_logs',
  'analytics_events'
];

// 表格整合映射關係
const tableMappings = {
  // 用戶相關整合
  'customer_users': 'users',
  'profiles': 'users',
  'customer_preferences': 'user_preferences',
  'customer_points': 'user_points',
  'customer_points_transactions': 'user_points_transactions',
  'loyalty_points': 'user_points',
  'loyalty_transactions': 'user_points_transactions',
  
  // 商品相關整合
  'menu_items': 'products',
  'menu_categories': 'categories',
  'combo_products': 'products',
  
  // 訂位相關整合
  'customer_reservations': 'reservations',
  'table_reservations': 'reservations',
  
  // 訂單相關整合
  'customer_orders': 'orders',
  
  // 收藏和評價整合
  'customer_favorites': 'user_favorites',
  'favorites': 'user_favorites',
  'customer_reviews': 'user_reviews',
  'reviews': 'user_reviews',
  
  // 優惠券整合
  'customer_coupons': 'user_coupons',
  
  // 設定整合到主表
  'restaurant_settings': 'restaurants' // 整合到 restaurants.settings jsonb 欄位
};

/**
 * 分析表格變更
 */
class DatabaseAnalyzer {
  constructor() {
    this.originalTables = originalTables;
    this.optimizedTables = optimizedTables;
    this.mappings = tableMappings;
  }

  // 分析哪些表格被整合了
  getIntegratedTables() {
    const integrated = {};
    
    for (const [originalTable, newTable] of Object.entries(this.mappings)) {
      if (!integrated[newTable]) {
        integrated[newTable] = [];
      }
      integrated[newTable].push(originalTable);
    }
    
    return integrated;
  }

  // 找出新增的表格
  getNewTables() {
    const originalMapped = Object.keys(this.mappings);
    const newTables = this.optimizedTables.filter(table => 
      !this.originalTables.includes(table) && 
      !Object.values(this.mappings).includes(table)
    );
    
    return newTables;
  }

  // 找出保持不變的表格
  getUnchangedTables() {
    const mappedOriginal = Object.keys(this.mappings);
    const mappedNew = Object.values(this.mappings);
    
    return this.originalTables.filter(table => 
      this.optimizedTables.includes(table) && 
      !mappedOriginal.includes(table) && 
      !mappedNew.includes(table)
    );
  }

  // 產生分析報告
  generateReport() {
    const integrated = this.getIntegratedTables();
    const newTables = this.getNewTables();
    const unchanged = this.getUnchangedTables();

    console.log('='.repeat(80));
    console.log('📊 TanaApp 資料庫整理分析報告');
    console.log('='.repeat(80));
    
    console.log('\n🔄 整合的表格:');
    for (const [newTable, originalTables] of Object.entries(integrated)) {
      console.log(`  ✅ ${newTable} ← [${originalTables.join(', ')}]`);
    }
    
    console.log('\n🆕 新增的表格:');
    newTables.forEach(table => {
      console.log(`  ✨ ${table}`);
    });
    
    console.log('\n📝 保持不變的表格:');
    unchanged.forEach(table => {
      console.log(`  ➡️ ${table}`);
    });
    
    console.log('\n📈 統計資訊:');
    console.log(`  原始表格數量: ${this.originalTables.length}`);
    console.log(`  優化後表格數量: ${this.optimizedTables.length}`);
    console.log(`  整合的表格組數: ${Object.keys(integrated).length}`);
    console.log(`  新增的表格數: ${newTables.length}`);
    console.log(`  保持不變的表格數: ${unchanged.length}`);
    
    const reductionPercentage = ((this.originalTables.length - this.optimizedTables.length) / this.originalTables.length * 100).toFixed(1);
    console.log(`  表格數量減少: ${reductionPercentage}%`);
    
    return {
      integrated,
      newTables,
      unchanged,
      stats: {
        original: this.originalTables.length,
        optimized: this.optimizedTables.length,
        reduction: reductionPercentage
      }
    };
  }
}

/**
 * 資料遷移計劃生成器
 */
class MigrationPlanner {
  constructor() {
    this.analyzer = new DatabaseAnalyzer();
  }

  // 生成遷移 SQL 指令
  generateMigrationSQL() {
    const report = this.analyzer.generateReport();
    let migrationSQL = '';

    migrationSQL += `-- TanaApp 資料庫遷移腳本\n`;
    migrationSQL += `-- 從原始架構遷移到優化架構\n`;
    migrationSQL += `-- 生成時間: ${new Date().toISOString()}\n\n`;

    migrationSQL += `-- ============================================================================\n`;
    migrationSQL += `-- 第一步: 備份現有資料\n`;
    migrationSQL += `-- ============================================================================\n\n`;
    
    // 為每個要整合的表格生成備份指令
    for (const originalTable of Object.keys(tableMappings)) {
      migrationSQL += `CREATE TABLE ${originalTable}_backup AS SELECT * FROM ${originalTable};\n`;
    }

    migrationSQL += `\n-- ============================================================================\n`;
    migrationSQL += `-- 第二步: 創建新的優化表格結構\n`;
    migrationSQL += `-- ============================================================================\n\n`;
    migrationSQL += `-- 請執行 supabase_optimized.sql 中的 CREATE TABLE 語句\n\n`;

    migrationSQL += `-- ============================================================================\n`;
    migrationSQL += `-- 第三步: 資料遷移\n`;
    migrationSQL += `-- ============================================================================\n\n`;

    // 生成具體的資料遷移指令
    migrationSQL += this.generateDataMigrations();

    migrationSQL += `\n-- ============================================================================\n`;
    migrationSQL += `-- 第四步: 驗證資料完整性\n`;
    migrationSQL += `-- ============================================================================\n\n`;
    
    for (const [originalTable, newTable] of Object.entries(tableMappings)) {
      migrationSQL += `-- 驗證 ${originalTable} -> ${newTable} 的資料遷移\n`;
      migrationSQL += `SELECT COUNT(*) as ${originalTable}_backup_count FROM ${originalTable}_backup;\n`;
      migrationSQL += `SELECT COUNT(*) as ${newTable}_count FROM ${newTable} WHERE migration_source = '${originalTable}';\n\n`;
    }

    migrationSQL += `-- ============================================================================\n`;
    migrationSQL += `-- 第五步: 清理備份表格 (確認無誤後執行)\n`;
    migrationSQL += `-- ============================================================================\n\n`;
    
    for (const originalTable of Object.keys(tableMappings)) {
      migrationSQL += `-- DROP TABLE ${originalTable}_backup; -- 取消註釋以執行\n`;
    }

    return migrationSQL;
  }

  // 生成具體的資料遷移指令
  generateDataMigrations() {
    let migrations = '';

    // 用戶資料遷移
    migrations += `-- 遷移用戶資料\n`;
    migrations += `INSERT INTO users (\n`;
    migrations += `  id, phone, email, name, password_hash, avatar_url, birthday, \n`;
    migrations += `  preferred_language, timezone, is_active, last_active_at, \n`;
    migrations += `  terms_accepted, marketing_consent, created_at, updated_at\n`;
    migrations += `)\n`;
    migrations += `SELECT \n`;
    migrations += `  id, phone, email, name, password_hash, avatar_url, birth_date,\n`;
    migrations += `  'zh-TW', 'Asia/Taipei', is_active, last_login,\n`;
    migrations += `  terms_accepted, marketing_consent, created_at, updated_at\n`;
    migrations += `FROM customer_users_backup;\n\n`;

    // 商品資料遷移
    migrations += `-- 遷移商品資料 (從 menu_items)\n`;
    migrations += `INSERT INTO products (\n`;
    migrations += `  id, restaurant_id, category_id, name, description, price,\n`;
    migrations += `  image_url, is_available, is_active, tags, created_at, updated_at\n`;
    migrations += `)\n`;
    migrations += `SELECT \n`;
    migrations += `  id, '${this.getDefaultRestaurantId()}', category_id::uuid, name, description, price,\n`;
    migrations += `  image_url, is_active, is_active, tags, created_at, updated_at\n`;
    migrations += `FROM menu_items_backup;\n\n`;

    // 訂位資料遷移
    migrations += `-- 遷移訂位資料 (從 customer_reservations)\n`;
    migrations += `INSERT INTO reservations (\n`;
    migrations += `  id, restaurant_id, user_id, customer_name, customer_phone, customer_email,\n`;
    migrations += `  party_size, reservation_date, reservation_time, status, special_requests,\n`;
    migrations += `  created_at, updated_at\n`;
    migrations += `)\n`;
    migrations += `SELECT \n`;
    migrations += `  id, '${this.getDefaultRestaurantId()}', customer_id, \n`;
    migrations += `  (SELECT name FROM customer_users_backup WHERE id = customer_id),\n`;
    migrations += `  contact_phone, contact_email, party_size, reservation_date, reservation_time,\n`;
    migrations += `  status, special_requests, created_at, updated_at\n`;
    migrations += `FROM customer_reservations_backup;\n\n`;

    return migrations;
  }

  // 獲取預設餐廳 ID (需要根據實際情況調整)
  getDefaultRestaurantId() {
    return 'your-restaurant-uuid-here';
  }

  // 生成完整的遷移計劃
  generateMigrationPlan() {
    const sql = this.generateMigrationSQL();
    console.log('\n📋 生成遷移 SQL 完成！');
    return sql;
  }
}

/**
 * API 更新建議生成器
 */
class APIUpdateSuggester {
  constructor() {
    this.tableMappings = tableMappings;
  }

  // 生成 API 路由更新建議
  generateAPIUpdates() {
    console.log('\n🔧 API 路由更新建議:');
    console.log('='.repeat(50));

    const suggestions = {
      // 用戶相關 API
      '/api/auth/profile': {
        old: 'profiles 表',
        new: 'users 表',
        changes: ['更新查詢語句', '調整欄位對應', '合併 customer_users 邏輯']
      },
      '/api/customers': {
        old: 'customer_users 表',
        new: 'users 表 (where user_type = customer)',
        changes: ['統一用戶查詢', '更新註冊流程', '整合會員系統']
      },
      '/api/menu': {
        old: 'menu_items, menu_categories',
        new: 'products, categories',
        changes: ['更新商品查詢', '整合套餐邏輯', '統一分類系統']
      },
      '/api/reservations': {
        old: 'customer_reservations, table_reservations',
        new: 'reservations (統一表)',
        changes: ['合併訂位邏輯', '統一狀態管理', '整合桌位分配']
      },
      '/api/orders': {
        old: 'customer_orders, orders',
        new: 'orders (統一表)',
        changes: ['合併訂單系統', '統一支付流程', '整合積分計算']
      },
      '/api/favorites': {
        old: 'favorites, customer_favorites',
        new: 'user_favorites',
        changes: ['統一收藏系統', '支援多種收藏類型']
      }
    };

    for (const [endpoint, info] of Object.entries(suggestions)) {
      console.log(`\n📍 ${endpoint}`);
      console.log(`   原始: ${info.old}`);
      console.log(`   新版: ${info.new}`);
      console.log(`   建議變更:`);
      info.changes.forEach(change => {
        console.log(`     - ${change}`);
      });
    }

    return suggestions;
  }
}

// ============================================================================
// 執行工具
// ============================================================================

// 建立分析器實例
const analyzer = new DatabaseAnalyzer();
const migrationPlanner = new MigrationPlanner();
const apiSuggester = new APIUpdateSuggester();

// 執行分析
function runAnalysis() {
  console.log('🚀 開始分析 TanaApp 資料庫架構...\n');
  
  // 1. 生成分析報告
  const report = analyzer.generateReport();
  
  // 2. 生成遷移計劃
  console.log('\n' + '='.repeat(80));
  console.log('📋 生成資料遷移計劃...');
  const migrationSQL = migrationPlanner.generateMigrationPlan();
  
  // 3. 生成 API 更新建議
  const apiUpdates = apiSuggester.generateAPIUpdates();
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ 分析完成！');
  console.log('\n📁 輸出檔案:');
  console.log('   - migration.sql (資料遷移腳本)');
  console.log('   - api_updates.md (API 更新建議)');
  
  return {
    report,
    migrationSQL,
    apiUpdates
  };
}

// 輸出結果到檔案的函數
function saveToFiles(results) {
  const fs = require('fs');
  
  // 儲存遷移 SQL
  fs.writeFileSync('migration.sql', results.migrationSQL);
  
  // 儲存 API 更新建議
  let apiMd = '# TanaApp API 更新建議\n\n';
  for (const [endpoint, info] of Object.entries(results.apiUpdates)) {
    apiMd += `## ${endpoint}\n\n`;
    apiMd += `**原始:** ${info.old}\n\n`;
    apiMd += `**新版:** ${info.new}\n\n`;
    apiMd += `**建議變更:**\n`;
    info.changes.forEach(change => {
      apiMd += `- ${change}\n`;
    });
    apiMd += '\n';
  }
  
  fs.writeFileSync('api_updates.md', apiMd);
  
  console.log('\n💾 檔案已儲存成功！');
}

// 導出模組
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DatabaseAnalyzer,
    MigrationPlanner,
    APIUpdateSuggester,
    runAnalysis,
    saveToFiles
  };
}

// 如果直接執行此腳本
if (require.main === module) {
  const results = runAnalysis();
  saveToFiles(results);
}
