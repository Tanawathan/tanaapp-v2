/**
 * TanaApp Supabase 資料庫管理工具 (JavaScript 版本)
 * 使用 Supabase API 進行資料庫分析、遷移和操作
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 載入環境變數
require('dotenv').config({ path: '.env.local' })

// 環境變數配置
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 請確保已在 .env.local 中設定 SUPABASE_URL 和 SUPABASE_SERVICE_KEY')
  console.error('   範例:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key')
  process.exit(1)
}

console.log('✅ Supabase 環境變數已載入')
console.log(`📍 Supabase URL: ${SUPABASE_URL}`)

// 創建 Supabase 客戶端 (使用 Service Role Key 以獲得完整權限)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

/**
 * Supabase 資料庫分析器
 */
class SupabaseDatabaseAnalyzer {
  constructor() {
    this.supabase = supabase
  }

  /**
   * 獲取資料庫中所有表格的資訊
   */
  async getAllTables() {
    try {
      console.log('🔍 正在分析資料庫結構...')
      
      // 使用 SQL 查詢獲取表格列表
      const { data, error } = await this.supabase
        .rpc('get_all_tables')

      if (error) {
        // 備用方法：手動查詢
        console.log('🔄 使用備用方法查詢表格...')
        return await this.getTablesManually()
      }

      return data || []
    } catch (err) {
      console.warn('⚠️ 自動查詢失敗，使用手動方法...')
      return await this.getTablesManually()
    }
  }

  /**
   * 手動獲取表格列表 (備用方法)
   */
  async getTablesManually() {
    // 已知的表格列表
    const knownTables = [
      'achievements', 'ai_analysis_logs', 'ai_evolution_log', 'ai_interactions',
      'ai_performance_metrics', 'ai_pets', 'ai_recommendations', 'analytics_events',
      'audit_logs', 'categories', 'combo_products', 'combo_selection_options',
      'combo_selection_rules', 'customer_coupons', 'customer_favorites',
      'customer_orders', 'customer_points', 'customer_points_transactions',
      'customer_preferences', 'customer_reservations', 'customer_reviews',
      'customer_users', 'error_logs', 'favorites', 'loyalty_points',
      'loyalty_transactions', 'marquees', 'menu_categories', 'menu_items',
      'notifications', 'order_combo_selections', 'order_items', 'orders',
      'payments', 'pet_interactions', 'product_modifiers', 'product_variants',
      'products', 'profiles', 'purchase_order_items', 'purchase_orders',
      'raw_materials', 'receipts', 'reservations', 'restaurant_closures',
      'restaurant_holidays', 'restaurants', 'reviews', 'stock_movements',
      'suppliers', 'table_reservations', 'table_sessions', 'tables',
      'takeaway_sequences', 'user_achievements', 'user_sessions', 'users',
      'virtual_pets', 'waitlist'
    ]

    const existingTables = []

    // 檢查每個表格是否存在
    for (const tableName of knownTables) {
      try {
        const { error } = await this.supabase
          .from(tableName)
          .select('*')
          .limit(1)

        if (!error) {
          existingTables.push(tableName)
        }
      } catch (err) {
        // 表格不存在或無權限
      }
    }

    return existingTables
  }

  /**
   * 獲取表格的記錄數量
   */
  async getTableRowCount(tableName) {
    try {
      const { count, error } = await this.supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.warn(`⚠️ 無法獲取 ${tableName} 的記錄數量:`, error.message)
        return 0
      }

      return count || 0
    } catch (err) {
      console.warn(`⚠️ 查詢 ${tableName} 記錄數量時發生錯誤:`, err.message)
      return 0
    }
  }

  /**
   * 獲取表格的範例資料
   */
  async getTableSample(tableName, limit = 3) {
    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .limit(limit)

      if (error) {
        return null
      }

      return data
    } catch (err) {
      return null
    }
  }

  /**
   * 生成完整的資料庫分析報告
   */
  async generateDatabaseReport() {
    console.log('📊 開始生成資料庫分析報告...\n')
    
    const tables = await this.getAllTables()
    const report = {
      timestamp: new Date().toISOString(),
      totalTables: tables.length,
      tables: []
    }

    console.log(`📋 發現 ${tables.length} 個表格\n`)

    for (const tableName of tables) {
      console.log(`🔍 分析表格: ${tableName}`)
      
      const rowCount = await this.getTableRowCount(tableName)
      const sampleData = await this.getTableSample(tableName)
      
      const tableInfo = {
        name: tableName,
        rowCount,
        hasData: rowCount > 0,
        sampleData: sampleData ? sampleData.slice(0, 1) : null // 只保留一筆範例
      }
      
      report.tables.push(tableInfo)
      console.log(`   📊 記錄數: ${rowCount}`)
    }

    console.log('\n✅ 資料庫分析完成！')
    return report
  }

  /**
   * 匯出報告到檔案
   */
  exportReport(report, filename = 'database-report.json') {
    try {
      const filepath = path.join(process.cwd(), filename)
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2))
      console.log(`💾 報告已儲存到: ${filepath}`)
      return filepath
    } catch (err) {
      console.error('❌ 儲存報告時發生錯誤:', err)
      return null
    }
  }
}

/**
 * Supabase 資料遷移工具
 */
class SupabaseMigrationTool {
  constructor() {
    this.supabase = supabase
    this.backupDir = path.join(process.cwd(), 'backups')
    
    // 確保備份目錄存在
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true })
      console.log(`📁 建立備份目錄: ${this.backupDir}`)
    }
  }

  /**
   * 備份指定表格的資料
   */
  async backupTable(tableName) {
    try {
      console.log(`🔄 正在備份表格: ${tableName}`)
      
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')

      if (error) {
        console.error(`❌ 備份 ${tableName} 失敗:`, error.message)
        return null
      }

      // 儲存備份到檔案
      const backupPath = path.join(this.backupDir, `${tableName}_backup.json`)
      fs.writeFileSync(backupPath, JSON.stringify(data, null, 2))
      console.log(`✅ ${tableName} 備份完成 (${data?.length || 0} 筆記錄) → ${backupPath}`)
      
      return data
    } catch (err) {
      console.error(`❌ 備份 ${tableName} 時發生錯誤:`, err.message)
      return null
    }
  }

  /**
   * 備份所有需要遷移的表格
   */
  async backupAllTables() {
    const tablesToBackup = [
      'customer_users', 'profiles', 'customer_preferences',
      'customer_points', 'customer_points_transactions',
      'loyalty_points', 'loyalty_transactions',
      'menu_items', 'menu_categories', 'combo_products',
      'customer_reservations', 'table_reservations',
      'customer_orders', 'customer_favorites', 'favorites',
      'customer_reviews', 'reviews', 'customer_coupons'
    ]

    console.log('🔄 開始備份所有需要遷移的表格...\n')
    
    const backupResults = {}
    
    for (const tableName of tablesToBackup) {
      const backupData = await this.backupTable(tableName)
      backupResults[tableName] = {
        success: backupData !== null,
        recordCount: backupData?.length || 0,
        backupPath: backupData ? path.join(this.backupDir, `${tableName}_backup.json`) : null
      }
    }

    console.log('\n📊 備份摘要:')
    for (const [tableName, result] of Object.entries(backupResults)) {
      const status = result.success ? '✅' : '❌'
      console.log(`   ${status} ${tableName}: ${result.recordCount} 筆記錄`)
    }

    // 儲存備份摘要
    const summaryPath = path.join(this.backupDir, 'backup-summary.json')
    fs.writeFileSync(summaryPath, JSON.stringify(backupResults, null, 2))
    console.log(`\n📋 備份摘要已儲存: ${summaryPath}`)

    return backupResults
  }

  /**
   * 檢查新表格是否存在
   */
  async checkOptimizedTables() {
    const optimizedTables = [
      'users', 'user_preferences', 'user_points', 'user_points_transactions',
      'products', 'categories', 'reservations', 'orders', 
      'user_favorites', 'user_reviews', 'user_coupons'
    ]

    console.log('🔍 檢查優化後的表格是否存在...\n')
    
    const tableStatus = {}
    
    for (const tableName of optimizedTables) {
      try {
        const { error } = await this.supabase
          .from(tableName)
          .select('*')
          .limit(1)

        tableStatus[tableName] = !error
        const status = !error ? '✅' : '❌'
        console.log(`   ${status} ${tableName}`)
        
      } catch (err) {
        tableStatus[tableName] = false
        console.log(`   ❌ ${tableName}`)
      }
    }

    const existingCount = Object.values(tableStatus).filter(exists => exists).length
    const totalCount = optimizedTables.length
    
    console.log(`\n📊 表格狀態: ${existingCount}/${totalCount} 個表格存在`)
    
    if (existingCount < totalCount) {
      console.log('\n⚠️ 請先執行 supabase_optimized.sql 創建所需的表格結構')
      return false
    }
    
    return true
  }

  /**
   * 檢查備份檔案是否存在
   */
  checkBackupFiles() {
    const requiredBackups = [
      'customer_users_backup.json', 'menu_items_backup.json'
    ]

    console.log('🔍 檢查備份檔案...')
    
    const missingFiles = []
    
    for (const filename of requiredBackups) {
      const filePath = path.join(this.backupDir, filename)
      if (!fs.existsSync(filePath)) {
        missingFiles.push(filename)
        console.log(`   ❌ ${filename} - 檔案不存在`)
      } else {
        console.log(`   ✅ ${filename}`)
      }
    }

    if (missingFiles.length > 0) {
      console.log('\n⚠️ 請先執行備份操作: node supabase-db-tool.js backup')
      return false
    }

    return true
  }

  /**
   * 驗證遷移結果
   */
  async validateMigration() {
    console.log('🔍 開始驗證遷移結果...\n')
    
    const validations = [
      { 
        table: 'users', 
        backupFiles: ['customer_users_backup.json', 'profiles_backup.json'] 
      },
      { 
        table: 'products', 
        backupFiles: ['menu_items_backup.json', 'combo_products_backup.json'] 
      },
      {
        table: 'user_points',
        backupFiles: ['customer_points_backup.json', 'loyalty_points_backup.json']
      }
    ]

    for (const validation of validations) {
      try {
        // 計算新表格的記錄數
        const { count: newCount } = await this.supabase
          .from(validation.table)
          .select('*', { count: 'exact', head: true })

        // 計算備份的記錄數
        let backupCount = 0
        
        for (const file of validation.backupFiles) {
          const backupPath = path.join(this.backupDir, file)
          if (fs.existsSync(backupPath)) {
            const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
            backupCount += backupData.length
          }
        }

        const status = (newCount || 0) >= backupCount ? '✅' : '⚠️'
        console.log(`${status} ${validation.table}: 備份 ${backupCount} 筆 → 新表 ${newCount || 0} 筆`)

      } catch (err) {
        console.error(`❌ 驗證 ${validation.table} 時發生錯誤:`, err.message)
      }
    }

    console.log('\n✅ 驗證完成！')
  }

  /**
   * 顯示遷移前檢查清單
   */
  async preMigrationCheck() {
    console.log('📋 執行遷移前檢查...\n')
    
    let allChecksPass = true
    
    // 1. 檢查環境變數
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.log('❌ 環境變數未正確設定')
      allChecksPass = false
    } else {
      console.log('✅ 環境變數設定正確')
    }
    
    // 2. 檢查備份檔案
    if (!this.checkBackupFiles()) {
      allChecksPass = false
    } else {
      console.log('✅ 備份檔案檢查通過')
    }
    
    // 3. 檢查新表格結構
    if (!(await this.checkOptimizedTables())) {
      allChecksPass = false
    } else {
      console.log('✅ 新表格結構檢查通過')
    }
    
    if (allChecksPass) {
      console.log('\n🎉 所有檢查都通過！可以開始遷移。')
    } else {
      console.log('\n❌ 部分檢查未通過，請先解決問題後再進行遷移。')
    }
    
    return allChecksPass
  }
}

/**
 * 主程式入口
 */
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  const analyzer = new SupabaseDatabaseAnalyzer()
  const migrator = new SupabaseMigrationTool()

  console.log('🚀 TanaApp Supabase 資料庫管理工具\n')

  switch (command) {
    case 'analyze':
      console.log('🔍 執行資料庫分析...')
      const report = await analyzer.generateDatabaseReport()
      analyzer.exportReport(report)
      break

    case 'backup':
      console.log('💾 執行資料備份...')
      await migrator.backupAllTables()
      break

    case 'check':
      console.log('📋 執行遷移前檢查...')
      await migrator.preMigrationCheck()
      break

    case 'validate':
      console.log('🔍 驗證遷移結果...')
      await migrator.validateMigration()
      break

    default:
      console.log(`
🛠️  TanaApp Supabase 資料庫管理工具

用法: 
  node supabase-db-tool.js <command>

指令:
  analyze   - 分析現有資料庫結構
  backup    - 備份需要遷移的表格
  check     - 執行遷移前檢查
  validate  - 驗證遷移結果

範例:
  node supabase-db-tool.js analyze
  node supabase-db-tool.js backup
  node supabase-db-tool.js check
  node supabase-db-tool.js validate

注意事項:
  1. 請確保 .env.local 已正確設定 Supabase 環境變數
  2. 遷移前請先備份資料 (backup)
  3. 執行遷移前請先檢查環境 (check)
  4. 遷移後請驗證結果 (validate)
      `)
  }
}

// 如果直接執行此檔案
if (require.main === module) {
  main().catch(err => {
    console.error('❌ 程式執行時發生錯誤:', err.message)
    process.exit(1)
  })
}

module.exports = { SupabaseDatabaseAnalyzer, SupabaseMigrationTool }
