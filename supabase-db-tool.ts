/**
 * TanaApp Supabase 資料庫管理工具
 * 使用 Supabase API 進行資料庫分析、遷移和操作
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// 環境變數配置
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 請確保已設定 SUPABASE_URL 和 SUPABASE_SERVICE_KEY 環境變數')
  process.exit(1)
}

// 創建 Supabase 客戶端 (使用 Service Role Key 以獲得完整權限)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

/**
 * Supabase 資料庫分析器
 */
class SupabaseDatabaseAnalyzer {
  private supabase: any

  constructor() {
    this.supabase = supabase
  }

  /**
   * 獲取資料庫中所有表格的資訊
   */
  async getAllTables() {
    try {
      console.log('🔍 正在分析資料庫結構...')
      
      // 查詢所有表格
  type InfoSchemaTable = { table_name: string; table_schema: string }
  const { data: tables, error }: { data: InfoSchemaTable[] | null; error: any } = await this.supabase
        .from('information_schema.tables')
        .select('table_name, table_schema')
        .eq('table_schema', 'public')
        .order('table_name')

      if (error) {
        console.error('❌ 無法獲取表格列表:', error)
        return []
      }

  const rows: InfoSchemaTable[] = tables ?? []
  return rows.map((t: InfoSchemaTable) => t.table_name)
    } catch (err) {
      console.error('❌ 查詢表格時發生錯誤:', err)
      return []
    }
  }

  /**
   * 獲取表格的詳細結構
   */
  async getTableStructure(tableName: string) {
    try {
      // 使用 RPC 調用獲取表格結構
      const { data, error } = await this.supabase.rpc('get_table_structure', {
        table_name: tableName
      })

      if (error && error.code !== 'PGRST116') { // 忽略函數不存在的錯誤
        console.warn(`⚠️ 無法獲取 ${tableName} 的結構:`, error.message)
      }

      return data
    } catch (err) {
      // 備用方法：直接查詢資訊模式
      return await this.getTableColumns(tableName)
    }
  }

  /**
   * 備用方法：從 information_schema 獲取列資訊
   */
  async getTableColumns(tableName: string) {
    try {
      const { data, error } = await this.supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', tableName)
        .eq('table_schema', 'public')
        .order('ordinal_position')

      if (error) {
        console.warn(`⚠️ 無法獲取 ${tableName} 的列資訊:`, error)
        return null
      }

      return data
    } catch (err) {
      console.warn(`⚠️ 查詢 ${tableName} 列資訊時發生錯誤:`, err)
      return null
    }
  }

  /**
   * 獲取表格的記錄數量
   */
  async getTableRowCount(tableName: string) {
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
      console.warn(`⚠️ 查詢 ${tableName} 記錄數量時發生錯誤:`, err)
      return 0
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
      tables: [] as any[]
    }

    console.log(`📋 發現 ${tables.length} 個表格\n`)

    for (const tableName of tables) {
      console.log(`🔍 分析表格: ${tableName}`)
      
      const structure = await this.getTableStructure(tableName)
      const rowCount = await this.getTableRowCount(tableName)
      
      const tableInfo = {
        name: tableName,
        rowCount,
        structure,
        hasData: rowCount > 0
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
  async exportReport(report: any, filename: string = 'database-report.json') {
    try {
      const filepath = path.join(process.cwd(), filename)
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2))
      console.log(`💾 報告已儲存到: ${filepath}`)
    } catch (err) {
      console.error('❌ 儲存報告時發生錯誤:', err)
    }
  }
}

/**
 * Supabase 資料遷移工具
 */
class SupabaseMigrationTool {
  private supabase: any

  constructor() {
    this.supabase = supabase
  }

  /**
   * 備份指定表格的資料
   */
  async backupTable(tableName: string) {
    try {
      console.log(`🔄 正在備份表格: ${tableName}`)
      
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')

      if (error) {
        console.error(`❌ 備份 ${tableName} 失敗:`, error)
        return null
      }

      // 儲存備份到檔案
      const backupPath = path.join(process.cwd(), 'backups', `${tableName}_backup.json`)
      const backupDir = path.dirname(backupPath)
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }

      fs.writeFileSync(backupPath, JSON.stringify(data, null, 2))
      console.log(`✅ ${tableName} 備份完成 (${data?.length || 0} 筆記錄)`)
      
      return data
    } catch (err) {
      console.error(`❌ 備份 ${tableName} 時發生錯誤:`, err)
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
    
  const backupResults: Record<string, { success: boolean; recordCount: number }> = {}
    
    for (const tableName of tablesToBackup) {
      const backupData = await this.backupTable(tableName)
      backupResults[tableName] = {
        success: backupData !== null,
        recordCount: backupData?.length || 0
      }
    }

    console.log('\n📊 備份摘要:')
    for (const tableName of Object.keys(backupResults)) {
      const result = backupResults[tableName]
      const status = result.success ? '✅' : '❌'
      console.log(`   ${status} ${tableName}: ${result.recordCount} 筆記錄`)
    }

    return backupResults
  }

  /**
   * 執行資料遷移 - 用戶資料
   */
  async migrateUsers() {
    console.log('🔄 開始遷移用戶資料...')
    
    try {
      // 從備份檔案讀取資料
      const customerUsersPath = path.join(process.cwd(), 'backups', 'customer_users_backup.json')
      const profilesPath = path.join(process.cwd(), 'backups', 'profiles_backup.json')
      
      if (!fs.existsSync(customerUsersPath)) {
        console.warn('⚠️ customer_users 備份檔案不存在，跳過遷移')
        return
      }

  const customerUsers: any[] = JSON.parse(fs.readFileSync(customerUsersPath, 'utf8'))
  let profiles: any[] = []
      
      if (fs.existsSync(profilesPath)) {
        profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'))
      }

      // 合併資料並插入到新的 users 表
      const usersData = (customerUsers as any[]).map((cu: any) => {
        const profile = (profiles as any[]).find((p: any) => p.id === cu.id)
        
        return {
          id: cu.id,
          phone: cu.phone,
          email: cu.email,
          name: cu.name,
          password_hash: cu.password_hash,
          avatar_url: cu.avatar_url,
          birthday: cu.birth_date,
          gender: cu.gender,
          member_tier: profile?.member_tier || 'bronze',
          is_active: cu.is_active,
          last_active_at: cu.last_login,
          terms_accepted: cu.terms_accepted,
          marketing_consent: cu.marketing_consent,
          created_at: cu.created_at,
          updated_at: cu.updated_at
        }
      })

      // 批量插入 (分批處理以避免超時)
      const batchSize = 100
      let successCount = 0

      for (let i = 0; i < usersData.length; i += batchSize) {
        const batch = usersData.slice(i, i + batchSize)
        
        const { data, error } = await this.supabase
          .from('users')
          .upsert(batch, { onConflict: 'id' })

        if (error) {
          console.error(`❌ 批次 ${Math.floor(i/batchSize) + 1} 插入失敗:`, error)
        } else {
          successCount += batch.length
          console.log(`✅ 已遷移 ${successCount}/${usersData.length} 筆用戶資料`)
        }
      }

      console.log(`✅ 用戶資料遷移完成: ${successCount} 筆記錄`)
      
    } catch (err) {
      console.error('❌ 用戶資料遷移失敗:', err)
    }
  }

  /**
   * 執行資料遷移 - 商品資料
   */
  async migrateProducts() {
    console.log('🔄 開始遷移商品資料...')
    
    try {
      // 讀取備份資料
      const menuItemsPath = path.join(process.cwd(), 'backups', 'menu_items_backup.json')
      const comboProductsPath = path.join(process.cwd(), 'backups', 'combo_products_backup.json')
      
      const restaurantId = await this.getDefaultRestaurantId()
      
      // 遷移一般商品
      if (fs.existsSync(menuItemsPath)) {
        const menuItems: any[] = JSON.parse(fs.readFileSync(menuItemsPath, 'utf8'))
        
        const productsData = (menuItems as any[]).map((item: any) => ({
          id: item.id,
          restaurant_id: restaurantId,
          category_id: item.category_id,
          name: item.name,
          description: item.description,
          price: item.price,
          image_url: item.image_url,
          is_available: item.is_active,
          is_active: item.is_active,
          tags: item.tags,
          popularity_score: item.popularity_score,
          product_type: 'single',
          created_at: item.created_at,
          updated_at: item.updated_at
        }))

        const { error } = await this.supabase
          .from('products')
          .upsert(productsData, { onConflict: 'id' })

        if (error) {
          console.error('❌ 一般商品遷移失敗:', error)
        } else {
          console.log(`✅ 一般商品遷移完成: ${productsData.length} 筆記錄`)
        }
      }

      // 遷移套餐商品
      if (fs.existsSync(comboProductsPath)) {
        const comboProducts: any[] = JSON.parse(fs.readFileSync(comboProductsPath, 'utf8'))
        
        const combosData = (comboProducts as any[]).map((combo: any) => ({
          id: combo.id,
          restaurant_id: combo.restaurant_id,
          category_id: combo.category_id,
          name: combo.name,
          description: combo.description,
          price: combo.price,
          cost: combo.cost,
          image_url: combo.image_url,
          is_available: combo.is_available,
          is_active: combo.is_active,
          product_type: 'combo',
          combo_type: combo.combo_type,
          min_items: combo.min_items,
          max_items: combo.max_items,
          discount_type: combo.discount_type,
          discount_value: combo.discount_value,
          prep_time_minutes: combo.preparation_time,
          created_at: combo.created_at,
          updated_at: combo.updated_at
        }))

        const { error } = await this.supabase
          .from('products')
          .upsert(combosData, { onConflict: 'id' })

        if (error) {
          console.error('❌ 套餐商品遷移失敗:', error)
        } else {
          console.log(`✅ 套餐商品遷移完成: ${combosData.length} 筆記錄`)
        }
      }

    } catch (err) {
      console.error('❌ 商品資料遷移失敗:', err)
    }
  }

  /**
   * 獲取預設餐廳ID
   */
  async getDefaultRestaurantId() {
    try {
      const { data, error } = await this.supabase
        .from('restaurants')
        .select('id')
        .limit(1)
        .single()

      if (error || !data) {
        console.warn('⚠️ 未找到餐廳記錄，將使用預設ID')
        return '00000000-0000-0000-0000-000000000000'
      }

      return data.id
    } catch (err) {
      console.warn('⚠️ 查詢餐廳ID時發生錯誤，將使用預設ID')
      return '00000000-0000-0000-0000-000000000000'
    }
  }

  /**
   * 驗證遷移結果
   */
  async validateMigration() {
    console.log('🔍 開始驗證遷移結果...\n')
    
    const validations = [
      { table: 'users', backupFile: 'customer_users_backup.json' },
      { table: 'products', backupFiles: ['menu_items_backup.json', 'combo_products_backup.json'] }
    ]

    for (const validation of validations) {
      try {
        // 計算新表格的記錄數
        const { count: newCount } = await this.supabase
          .from(validation.table)
          .select('*', { count: 'exact', head: true })

        // 計算備份的記錄數
        let backupCount = 0
        
        if (validation.backupFile) {
          const backupPath = path.join(process.cwd(), 'backups', validation.backupFile)
          if (fs.existsSync(backupPath)) {
            const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
            backupCount = backupData.length
          }
        } else if (validation.backupFiles) {
          for (const file of validation.backupFiles) {
            const backupPath = path.join(process.cwd(), 'backups', file)
            if (fs.existsSync(backupPath)) {
              const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
              backupCount += backupData.length
            }
          }
        }

        const status = newCount >= backupCount ? '✅' : '⚠️'
        console.log(`${status} ${validation.table}: 備份 ${backupCount} 筆 → 新表 ${newCount || 0} 筆`)

      } catch (err) {
        console.error(`❌ 驗證 ${validation.table} 時發生錯誤:`, err)
      }
    }
  }

  /**
   * 執行完整的遷移流程
   */
  async runFullMigration() {
    console.log('🚀 開始執行完整的資料遷移流程...\n')
    
    try {
      // 第一步：備份資料
      console.log('📋 第一步：備份原始資料')
      await this.backupAllTables()
      
      console.log('\n📋 第二步：遷移用戶資料')
      await this.migrateUsers()
      
      console.log('\n📋 第三步：遷移商品資料')
      await this.migrateProducts()
      
      console.log('\n📋 第四步：驗證遷移結果')
      await this.validateMigration()
      
      console.log('\n✅ 遷移流程完成！')
      
    } catch (err) {
      console.error('❌ 遷移過程中發生錯誤:', err)
    }
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

  switch (command) {
    case 'analyze':
      console.log('🔍 執行資料庫分析...')
      const report = await analyzer.generateDatabaseReport()
      await analyzer.exportReport(report)
      break

    case 'backup':
      console.log('💾 執行資料備份...')
      await migrator.backupAllTables()
      break

    case 'migrate':
      console.log('🔄 執行資料遷移...')
      await migrator.runFullMigration()
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
  migrate   - 執行完整遷移流程
  validate  - 驗證遷移結果

範例:
  node supabase-db-tool.js analyze
  node supabase-db-tool.js backup
  node supabase-db-tool.js migrate
      `)
  }
}

// 如果直接執行此檔案
if (require.main === module) {
  main().catch(console.error)
}

export { SupabaseDatabaseAnalyzer, SupabaseMigrationTool }
