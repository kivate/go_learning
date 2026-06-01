# Go 資料庫操作完整指南

[← 返回目錄](README.md)

本文件涵蓋 Go 語言中資料庫操作的三大層次：標準庫 `database/sql`、增強版 `sqlx`，以及全功能 ORM `GORM`。適合有 SQL 基礎、但不熟悉 Go 資料庫操作的開發者。讀完後你將能夠安全地執行 CRUD、管理 Transaction、使用 GORM 做關聯查詢，並用 Repository Pattern 寫出可測試的資料存取層。

---

## 1. database/sql 基礎

### 1-1 什麼是 database/sql？Driver 模式說明

`database/sql` 是 Go 標準庫提供的資料庫抽象層。它本身**不包含**任何資料庫的連線實作，而是定義了一套統一介面，讓各資料庫的 Driver（驅動程式）去實作細節。

```text
你的程式碼
    ↓ 使用
database/sql（標準介面層）
    ↓ 呼叫
Driver 實作（postgres / mysql / sqlite 等）
    ↓ 連線
實際資料庫
```

常用 Driver 套件：

| 資料庫 | Driver 套件 | import 路徑 |
| :--- | :--- | :--- |
| PostgreSQL | pgx | `github.com/jackc/pgx/v5/stdlib` |
| MySQL | go-sql-driver | `github.com/go-sql-driver/mysql` |
| SQLite | go-sqlite3 | `github.com/mattn/go-sqlite3` |

Driver 必須透過空白 import 來完成自動註冊：

```go
import (
    "database/sql"
    _ "github.com/go-sql-driver/mysql" // 只要 init() 的副作用
)
```

### 1-2 連線設定（sql.Open、DSN 格式）

`sql.Open` 並不真正建立連線，只是設定好連線參數。真正的連線會在第一次查詢時才建立（延遲連線）。

```go
package main

import (
    "database/sql"
    "fmt"
    "log"

    _ "github.com/go-sql-driver/mysql"
)

func main() {
    // MySQL DSN 格式：user:password@tcp(host:port)/dbname?參數
    dsn := "root:secret@tcp(127.0.0.1:3306)/myapp?parseTime=true&charset=utf8mb4"

    db, err := sql.Open("mysql", dsn)
    if err != nil {
        log.Fatalf("sql.Open 失敗: %v", err)
    }
    defer db.Close()

    // sql.Open 不會真正連線，需要用 Ping 驗證連線是否可用
    if err := db.Ping(); err != nil {
        log.Fatalf("資料庫連線失敗: %v", err)
    }

    fmt.Println("資料庫連線成功！")
}
```

常見 DSN 格式範例：

```text
# MySQL
user:password@tcp(127.0.0.1:3306)/dbname?parseTime=true

# PostgreSQL（使用 lib/pq）
postgres://user:password@localhost:5432/dbname?sslmode=disable

# SQLite
file:./myapp.db?cache=shared
```

> **注意**：MySQL 必須加 `parseTime=true`，否則 `time.Time` 欄位無法正確掃描。

### 1-3 連線池設定（MaxOpenConns、MaxIdleConns、ConnMaxLifetime）

`sql.DB` 本身就是一個連線池，預設行為可能不符合生產需求，必須手動調整。

```go
package main

import (
    "database/sql"
    "log"
    "time"

    _ "github.com/go-sql-driver/mysql"
)

func NewDB(dsn string) (*sql.DB, error) {
    db, err := sql.Open("mysql", dsn)
    if err != nil {
        return nil, fmt.Errorf("sql.Open: %w", err)
    }

    // 最大開啟連線數（包含使用中 + 閒置）
    // 建議：依據資料庫最大允許連線數設定，通常 25~100
    db.SetMaxOpenConns(25)

    // 最大閒置連線數（等待複用的連線）
    // 建議：不超過 MaxOpenConns，一般設為 MaxOpenConns / 2
    db.SetMaxIdleConns(10)

    // 連線最長存活時間
    // 建議：5~30 分鐘，避免使用到被伺服器斷開的舊連線
    db.SetConnMaxLifetime(5 * time.Minute)

    // 閒置連線最長等待時間（Go 1.15+）
    // 建議：略短於 ConnMaxLifetime
    db.SetConnMaxIdleTime(3 * time.Minute)

    if err := db.Ping(); err != nil {
        return nil, fmt.Errorf("db.Ping: %w", err)
    }

    return db, nil
}
```

各參數說明：

| 參數 | 預設值 | 建議值 | 說明 |
| :--- | :--- | :--- | :--- |
| `MaxOpenConns` | 0（無限） | 25~100 | 防止連線數爆炸 |
| `MaxIdleConns` | 2 | 10~25 | 太小會頻繁建立/銷毀連線 |
| `ConnMaxLifetime` | 0（永久） | 5~30 分鐘 | 避免使用被伺服器關閉的連線 |
| `ConnMaxIdleTime` | 0（永久） | 3~10 分鐘 | 減少閒置連線占用資源 |

> **建議**：`MaxIdleConns` 設定為 `MaxOpenConns` 的一半，這樣在流量高峰後能快速回收，但平時又有足夠的連線可以複用。

### 1-4 Query vs QueryRow vs Exec 的差異

`database/sql` 提供三種執行 SQL 的函數，用途各不相同：

| 函數 | 適用場景 | 回傳值 |
| :--- | :--- | :--- |
| `db.Query` | SELECT 多筆 | `*sql.Rows, error` |
| `db.QueryRow` | SELECT 單筆 | `*sql.Row`（不回傳 error） |
| `db.Exec` | INSERT / UPDATE / DELETE | `sql.Result, error` |

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"

    _ "github.com/go-sql-driver/mysql"
)

func demonstrateQueryMethods(ctx context.Context, db *sql.DB) {
    // Query：查詢多筆資料，回傳 *Rows
    rows, err := db.QueryContext(ctx, "SELECT id, name FROM users WHERE age > ?", 18)
    if err != nil {
        log.Printf("Query 失敗: %v", err)
        return
    }
    defer rows.Close() // 必須關閉，否則連線不會釋放

    // QueryRow：查詢單筆，error 延遲到 Scan 時才出現
    var name string
    err = db.QueryRowContext(ctx, "SELECT name FROM users WHERE id = ?", 1).Scan(&name)
    if err == sql.ErrNoRows {
        fmt.Println("找不到該筆資料")
    } else if err != nil {
        log.Printf("QueryRow 失敗: %v", err)
    }

    // Exec：執行不回傳資料列的 SQL
    result, err := db.ExecContext(ctx, "UPDATE users SET name = ? WHERE id = ?", "Alice", 1)
    if err != nil {
        log.Printf("Exec 失敗: %v", err)
        return
    }

    affected, err := result.RowsAffected()
    if err != nil {
        log.Printf("RowsAffected 失敗: %v", err)
        return
    }
    fmt.Printf("更新了 %d 筆資料\n", affected)
}
```

> **注意**：所有函數都有對應的 `Context` 版本（`QueryContext`、`ExecContext`），生產程式碼應一律使用 Context 版本，方便設定超時與取消。

### 1-5 rows.Scan 讀取資料

`rows.Scan` 將每列的欄位值掃描進 Go 變數中，必須按照 SELECT 欄位順序一一對應。

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"
    "time"

    _ "github.com/go-sql-driver/mysql"
)

type User struct {
    ID        int64
    Name      string
    Email     string
    CreatedAt time.Time
}

func getUsers(ctx context.Context, db *sql.DB) ([]User, error) {
    rows, err := db.QueryContext(ctx, `
        SELECT id, name, email, created_at
        FROM users
        ORDER BY id
    `)
    if err != nil {
        return nil, fmt.Errorf("QueryContext: %w", err)
    }
    defer rows.Close() // 無論如何都要關閉

    var users []User
    for rows.Next() {
        var u User
        // Scan 的順序必須對應 SELECT 的欄位順序
        if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.CreatedAt); err != nil {
            return nil, fmt.Errorf("rows.Scan: %w", err)
        }
        users = append(users, u)
    }

    // 迴圈結束後，必須檢查是否有錯誤（例如網路中斷）
    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("rows.Err: %w", err)
    }

    return users, nil
}
```

> **警告**：迴圈結束後**一定要檢查** `rows.Err()`！`rows.Next()` 在發生錯誤時會返回 `false` 並提前結束迴圈，錯誤資訊存在 `rows.Err()` 中，若不檢查會靜默地忽略錯誤。

處理可空欄位（`NULL`）時需使用 `sql.NullString`、`sql.NullInt64` 等類型：

```go
package main

import (
    "database/sql"
    "fmt"
)

type UserProfile struct {
    ID       int64
    Name     string
    Bio      sql.NullString // 可能是 NULL
    Age      sql.NullInt64  // 可能是 NULL
}

func scanNullable(row *sql.Row) (*UserProfile, error) {
    var p UserProfile
    err := row.Scan(&p.ID, &p.Name, &p.Bio, &p.Age)
    if err != nil {
        return nil, fmt.Errorf("Scan: %w", err)
    }

    // 使用前先判斷 Valid
    if p.Bio.Valid {
        fmt.Printf("個人簡介：%s\n", p.Bio.String)
    } else {
        fmt.Println("尚未填寫個人簡介")
    }

    return &p, nil
}
```

### 1-6 完整 CRUD 範例（使用 MySQL）

先建立資料表：

```sql
CREATE TABLE users (
    id         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(200) NOT NULL UNIQUE,
    age        INT          NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

完整 CRUD 實作：

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"
    "time"

    _ "github.com/go-sql-driver/mysql"
)

type User struct {
    ID        int64
    Name      string
    Email     string
    Age       int
    CreatedAt time.Time
    UpdatedAt time.Time
}

type UserRepository struct {
    db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
    return &UserRepository{db: db}
}

// Create 新增使用者
func (r *UserRepository) Create(ctx context.Context, name, email string, age int) (*User, error) {
    result, err := r.db.ExecContext(ctx,
        "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
        name, email, age,
    )
    if err != nil {
        return nil, fmt.Errorf("Create ExecContext: %w", err)
    }

    id, err := result.LastInsertId()
    if err != nil {
        return nil, fmt.Errorf("Create LastInsertId: %w", err)
    }

    return r.FindByID(ctx, id)
}

// FindByID 依 ID 查詢單筆
func (r *UserRepository) FindByID(ctx context.Context, id int64) (*User, error) {
    var u User
    err := r.db.QueryRowContext(ctx,
        "SELECT id, name, email, age, created_at, updated_at FROM users WHERE id = ?",
        id,
    ).Scan(&u.ID, &u.Name, &u.Email, &u.Age, &u.CreatedAt, &u.UpdatedAt)

    if err == sql.ErrNoRows {
        return nil, nil // 回傳 nil 代表找不到，由呼叫方決定如何處理
    }
    if err != nil {
        return nil, fmt.Errorf("FindByID Scan: %w", err)
    }

    return &u, nil
}

// FindAll 查詢所有使用者
func (r *UserRepository) FindAll(ctx context.Context) ([]User, error) {
    rows, err := r.db.QueryContext(ctx,
        "SELECT id, name, email, age, created_at, updated_at FROM users ORDER BY id",
    )
    if err != nil {
        return nil, fmt.Errorf("FindAll QueryContext: %w", err)
    }
    defer rows.Close()

    var users []User
    for rows.Next() {
        var u User
        if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Age, &u.CreatedAt, &u.UpdatedAt); err != nil {
            return nil, fmt.Errorf("FindAll Scan: %w", err)
        }
        users = append(users, u)
    }

    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("FindAll rows.Err: %w", err)
    }

    return users, nil
}

// Update 更新使用者
func (r *UserRepository) Update(ctx context.Context, id int64, name string, age int) error {
    result, err := r.db.ExecContext(ctx,
        "UPDATE users SET name = ?, age = ? WHERE id = ?",
        name, age, id,
    )
    if err != nil {
        return fmt.Errorf("Update ExecContext: %w", err)
    }

    affected, err := result.RowsAffected()
    if err != nil {
        return fmt.Errorf("Update RowsAffected: %w", err)
    }
    if affected == 0 {
        return fmt.Errorf("Update: 找不到 id=%d 的使用者", id)
    }

    return nil
}

// Delete 刪除使用者
func (r *UserRepository) Delete(ctx context.Context, id int64) error {
    result, err := r.db.ExecContext(ctx, "DELETE FROM users WHERE id = ?", id)
    if err != nil {
        return fmt.Errorf("Delete ExecContext: %w", err)
    }

    affected, err := result.RowsAffected()
    if err != nil {
        return fmt.Errorf("Delete RowsAffected: %w", err)
    }
    if affected == 0 {
        return fmt.Errorf("Delete: 找不到 id=%d 的使用者", id)
    }

    return nil
}

func main() {
    db, err := sql.Open("mysql", "root:secret@tcp(127.0.0.1:3306)/myapp?parseTime=true")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    repo := NewUserRepository(db)
    ctx := context.Background()

    // Create
    user, err := repo.Create(ctx, "Alice", "alice@example.com", 30)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("新增成功：%+v\n", user)

    // FindByID
    found, err := repo.FindByID(ctx, user.ID)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("查詢結果：%+v\n", found)

    // Update
    if err := repo.Update(ctx, user.ID, "Alice Wu", 31); err != nil {
        log.Fatal(err)
    }
    fmt.Println("更新成功")

    // Delete
    if err := repo.Delete(ctx, user.ID); err != nil {
        log.Fatal(err)
    }
    fmt.Println("刪除成功")
}
```

---

## 2. Prepared Statement

### 2-1 為什麼用 Prepared Statement（SQL Injection 防護）

SQL Injection 是最嚴重的資安漏洞之一。當你用字串拼接組合 SQL 時，攻擊者可以注入任意 SQL 指令。

```go
package main

import (
    "database/sql"
    "fmt"
    _ "github.com/go-sql-driver/mysql"
)

// 危險：字串拼接，容易被 SQL Injection 攻擊
func dangerousQuery(db *sql.DB, userInput string) {
    // 若 userInput = "' OR '1'='1"
    // 這段 SQL 會變成：SELECT * FROM users WHERE name = '' OR '1'='1'
    // 結果：回傳所有使用者！
    query := fmt.Sprintf("SELECT * FROM users WHERE name = '%s'", userInput)
    rows, _ := db.Query(query) // 禁止這樣寫
    defer rows.Close()
}

// 安全：使用佔位符，driver 會自動跳脫特殊字元
func safeQuery(db *sql.DB, userInput string) {
    // driver 會確保 userInput 被視為純資料，不是 SQL 指令
    rows, err := db.Query("SELECT * FROM users WHERE name = ?", userInput)
    if err != nil {
        return
    }
    defer rows.Close()
}
```

佔位符語法因資料庫而不同：

| 資料庫 | 佔位符語法 |
| :--- | :--- |
| MySQL | `?` |
| PostgreSQL | `$1, $2, $3` |
| SQLite | `?` 或 `$1` |

### 2-2 db.Prepare vs db.Query 直接使用佔位符

兩種方式都能防止 SQL Injection，差別在於效能：

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"

    _ "github.com/go-sql-driver/mysql"
)

func demonstratePrepare(ctx context.Context, db *sql.DB) error {
    // 方式一：db.Query 直接使用佔位符（適合執行一次的查詢）
    // 每次呼叫都會向資料庫發送「準備 + 執行」兩個請求
    rows, err := db.QueryContext(ctx, "SELECT name FROM users WHERE age > ?", 18)
    if err != nil {
        return fmt.Errorf("QueryContext: %w", err)
    }
    defer rows.Close()

    // 方式二：db.Prepare（適合同一 SQL 重複執行多次）
    // 只需一次「準備」，後續多次「執行」效率更高
    stmt, err := db.PrepareContext(ctx, "SELECT name FROM users WHERE age > ?")
    if err != nil {
        return fmt.Errorf("PrepareContext: %w", err)
    }
    defer stmt.Close() // 用完必須關閉

    // 重複執行同一個 prepared statement
    for _, age := range []int{18, 25, 30} {
        rows2, err := stmt.QueryContext(ctx, age)
        if err != nil {
            return fmt.Errorf("stmt.QueryContext(age=%d): %w", age, err)
        }

        for rows2.Next() {
            var name string
            if err := rows2.Scan(&name); err != nil {
                rows2.Close()
                return fmt.Errorf("Scan: %w", err)
            }
            fmt.Printf("age > %d: %s\n", age, name)
        }
        rows2.Close()

        if err := rows2.Err(); err != nil {
            return fmt.Errorf("rows.Err: %w", err)
        }
    }

    return nil
}
```

```text
選擇建議：
* 執行一次       → db.Query/Exec 直接帶佔位符
* 同 SQL 執行多次 → db.Prepare，重複使用 Stmt
* 批次插入       → db.Prepare，在迴圈中重複執行
```

### 2-3 Stmt 的生命週期管理

`Stmt` 是一個資源，必須明確地 Close。若在 Transaction 中使用，需特別注意作用範圍：

```go
package main

import (
    "context"
    "database/sql"
    "fmt"

    _ "github.com/go-sql-driver/mysql"
)

func batchInsert(ctx context.Context, db *sql.DB, users []struct{ Name, Email string }) error {
    // 在函數層級準備 statement，在迴圈中重複使用
    stmt, err := db.PrepareContext(ctx, "INSERT INTO users (name, email) VALUES (?, ?)")
    if err != nil {
        return fmt.Errorf("PrepareContext: %w", err)
    }
    defer stmt.Close() // 函數結束時釋放

    for _, u := range users {
        if _, err := stmt.ExecContext(ctx, u.Name, u.Email); err != nil {
            return fmt.Errorf("stmt.ExecContext(name=%s): %w", u.Name, err)
        }
    }

    return nil
}

// 在 Transaction 中使用 Prepared Statement
func batchInsertTx(ctx context.Context, db *sql.DB, users []struct{ Name, Email string }) error {
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return fmt.Errorf("BeginTx: %w", err)
    }
    defer tx.Rollback() // 若 Commit 成功，Rollback 是 no-op（無副作用）

    // 用 tx.PrepareContext，statement 綁定在 transaction 上
    stmt, err := tx.PrepareContext(ctx, "INSERT INTO users (name, email) VALUES (?, ?)")
    if err != nil {
        return fmt.Errorf("tx.PrepareContext: %w", err)
    }
    defer stmt.Close()

    for _, u := range users {
        if _, err := stmt.ExecContext(ctx, u.Name, u.Email); err != nil {
            return fmt.Errorf("stmt.ExecContext: %w", err)
        }
    }

    if err := tx.Commit(); err != nil {
        return fmt.Errorf("Commit: %w", err)
    }

    return nil
}
```

---

## 3. Transaction（交易）

### 3-1 什麼情況需要 Transaction

Transaction 保證一組操作要麼**全部成功**，要麼**全部失敗回滾**，具有 ACID 特性：

```text
場景一：銀行轉帳
  步驟1：A 帳戶扣款 1000 元
  步驟2：B 帳戶增加 1000 元
  → 如果步驟1成功、步驟2失敗，錢就憑空消失！
  → 必須用 Transaction：要麼兩步都成功，要麼都不執行

場景二：建立訂單
  步驟1：INSERT orders 建立訂單
  步驟2：UPDATE inventory 扣減庫存
  步驟3：INSERT order_items 新增訂單明細
  → 任一步驟失敗都必須全部回滾

場景三：多表維護一致性
  → 需要同時更新多個相關聯的資料表時
```

### 3-2 Begin、Commit、Rollback

```go
package main

import (
    "context"
    "database/sql"
    "fmt"

    _ "github.com/go-sql-driver/mysql"
)

func transferMoney(ctx context.Context, db *sql.DB, fromID, toID int64, amount float64) error {
    // 開始 Transaction
    tx, err := db.BeginTx(ctx, &sql.TxOptions{
        Isolation: sql.LevelSerializable, // 隔離等級，預設為資料庫預設值
        ReadOnly:  false,
    })
    if err != nil {
        return fmt.Errorf("BeginTx: %w", err)
    }

    // 執行操作
    _, err = tx.ExecContext(ctx,
        "UPDATE accounts SET balance = balance - ? WHERE id = ?",
        amount, fromID,
    )
    if err != nil {
        tx.Rollback() // 失敗時手動 Rollback
        return fmt.Errorf("扣款失敗: %w", err)
    }

    _, err = tx.ExecContext(ctx,
        "UPDATE accounts SET balance = balance + ? WHERE id = ?",
        amount, toID,
    )
    if err != nil {
        tx.Rollback() // 失敗時手動 Rollback
        return fmt.Errorf("入帳失敗: %w", err)
    }

    // 全部成功才 Commit
    if err := tx.Commit(); err != nil {
        return fmt.Errorf("Commit: %w", err)
    }

    return nil
}
```

### 3-3 用 defer 確保 Rollback

手動在每個錯誤路徑呼叫 `Rollback` 很容易遺漏。正確做法是在 `BeginTx` 後立即 `defer tx.Rollback()`：

```go
package main

import (
    "context"
    "database/sql"
    "fmt"

    _ "github.com/go-sql-driver/mysql"
)

func safeTransaction(ctx context.Context, db *sql.DB) error {
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return fmt.Errorf("BeginTx: %w", err)
    }

    // 關鍵技巧：立即 defer Rollback
    // 若後續 Commit 成功，Rollback 什麼都不做（no-op）
    // 若函數在任何地方 return error，Rollback 會自動執行
    defer tx.Rollback()

    if _, err := tx.ExecContext(ctx, "UPDATE users SET name = ? WHERE id = ?", "Bob", 1); err != nil {
        return fmt.Errorf("更新名稱失敗: %w", err) // defer 會自動 Rollback
    }

    if _, err := tx.ExecContext(ctx, "UPDATE accounts SET balance = balance - 100 WHERE user_id = ?", 1); err != nil {
        return fmt.Errorf("更新餘額失敗: %w", err) // defer 會自動 Rollback
    }

    // 只有到這裡才 Commit
    if err := tx.Commit(); err != nil {
        return fmt.Errorf("Commit: %w", err)
    }

    // Commit 成功後，defer 的 Rollback 執行時因為 tx 已結束，是 no-op
    return nil
}
```

> **建議**：這是 Go 中 Transaction 的標準模式。`defer tx.Rollback()` 後立刻接業務邏輯，最後 `tx.Commit()`。不需要在每個錯誤路徑手動呼叫 Rollback。

### 3-4 完整 Transaction 範例（轉帳場景）

```go
package main

import (
    "context"
    "database/sql"
    "errors"
    "fmt"
    "log"

    _ "github.com/go-sql-driver/mysql"
)

var (
    ErrInsufficientBalance = errors.New("餘額不足")
    ErrAccountNotFound     = errors.New("帳戶不存在")
)

type Account struct {
    ID      int64
    UserID  int64
    Balance float64
}

type TransferService struct {
    db *sql.DB
}

func NewTransferService(db *sql.DB) *TransferService {
    return &TransferService{db: db}
}

func (s *TransferService) Transfer(ctx context.Context, fromID, toID int64, amount float64) error {
    tx, err := s.db.BeginTx(ctx, &sql.TxOptions{
        Isolation: sql.LevelRepeatableRead,
    })
    if err != nil {
        return fmt.Errorf("Transfer BeginTx: %w", err)
    }
    defer tx.Rollback()

    // 查詢來源帳戶（加 FOR UPDATE 鎖定該列，防止並發問題）
    var fromBalance float64
    err = tx.QueryRowContext(ctx,
        "SELECT balance FROM accounts WHERE id = ? FOR UPDATE",
        fromID,
    ).Scan(&fromBalance)
    if err == sql.ErrNoRows {
        return ErrAccountNotFound
    }
    if err != nil {
        return fmt.Errorf("查詢來源帳戶: %w", err)
    }

    // 檢查餘額
    if fromBalance < amount {
        return ErrInsufficientBalance
    }

    // 確認目標帳戶存在（也加鎖）
    var toBalance float64
    err = tx.QueryRowContext(ctx,
        "SELECT balance FROM accounts WHERE id = ? FOR UPDATE",
        toID,
    ).Scan(&toBalance)
    if err == sql.ErrNoRows {
        return ErrAccountNotFound
    }
    if err != nil {
        return fmt.Errorf("查詢目標帳戶: %w", err)
    }

    // 扣款
    if _, err := tx.ExecContext(ctx,
        "UPDATE accounts SET balance = balance - ? WHERE id = ?",
        amount, fromID,
    ); err != nil {
        return fmt.Errorf("扣款失敗: %w", err)
    }

    // 入帳
    if _, err := tx.ExecContext(ctx,
        "UPDATE accounts SET balance = balance + ? WHERE id = ?",
        amount, toID,
    ); err != nil {
        return fmt.Errorf("入帳失敗: %w", err)
    }

    // 寫入交易記錄
    if _, err := tx.ExecContext(ctx,
        "INSERT INTO transfer_logs (from_id, to_id, amount) VALUES (?, ?, ?)",
        fromID, toID, amount,
    ); err != nil {
        return fmt.Errorf("寫入交易記錄失敗: %w", err)
    }

    if err := tx.Commit(); err != nil {
        return fmt.Errorf("Transfer Commit: %w", err)
    }

    return nil
}

func main() {
    db, err := sql.Open("mysql", "root:secret@tcp(127.0.0.1:3306)/bank?parseTime=true")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    svc := NewTransferService(db)
    ctx := context.Background()

    err = svc.Transfer(ctx, 1, 2, 500.0)
    switch {
    case errors.Is(err, ErrInsufficientBalance):
        fmt.Println("錯誤：餘額不足，無法轉帳")
    case errors.Is(err, ErrAccountNotFound):
        fmt.Println("錯誤：帳戶不存在")
    case err != nil:
        log.Printf("轉帳失敗：%v", err)
    default:
        fmt.Println("轉帳成功！")
    }
}
```

---

## 4. sqlx：database/sql 的增強版

### 4-1 sqlx vs database/sql 差異

`sqlx` 是 `database/sql` 的擴充套件，完全相容標準庫，主要解決幾個痛點：

```text
database/sql 的痛點：
1. 欄位很多時，rows.Scan(&u.ID, &u.Name, &u.Email, ...) 很冗長
2. 不支援 Named Parameters（:name 語法）
3. 不能直接把結果掃描進 struct

sqlx 解決方案：
1. StructScan / Get / Select：自動對應欄位名稱到 struct
2. NamedExec / NamedQuery：使用 :name 具名佔位符
3. In：自動展開 slice 為 IN (?, ?, ?)
```

安裝：

```bash
go get github.com/jmoiron/sqlx
go get github.com/go-sql-driver/mysql
```

連線方式（與 database/sql 幾乎相同）：

```go
package main

import (
    "fmt"
    "log"

    "github.com/jmoiron/sqlx"
    _ "github.com/go-sql-driver/mysql"
)

func main() {
    // sqlx.Open 與 sql.Open 用法相同
    db, err := sqlx.Open("mysql", "root:secret@tcp(127.0.0.1:3306)/myapp?parseTime=true")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    if err := db.Ping(); err != nil {
        log.Fatal(err)
    }

    fmt.Println("sqlx 連線成功")
}
```

### 4-2 StructScan：自動對應欄位

`StructScan` 根據 struct tag（`db:"欄位名"`）自動將查詢結果對應到 struct，不需要逐欄位 Scan：

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/jmoiron/sqlx"
    _ "github.com/go-sql-driver/mysql"
)

// db tag 指定對應的資料庫欄位名稱
type User struct {
    ID        int64     `db:"id"`
    Name      string    `db:"name"`
    Email     string    `db:"email"`
    Age       int       `db:"age"`
    CreatedAt time.Time `db:"created_at"`
}

func getUsersWithStructScan(ctx context.Context, db *sqlx.DB) ([]User, error) {
    rows, err := db.QueryxContext(ctx, "SELECT id, name, email, age, created_at FROM users")
    if err != nil {
        return nil, fmt.Errorf("QueryxContext: %w", err)
    }
    defer rows.Close()

    var users []User
    for rows.Next() {
        var u User
        // StructScan 根據 db tag 自動對應，不需要手動列出每個欄位
        if err := rows.StructScan(&u); err != nil {
            return nil, fmt.Errorf("StructScan: %w", err)
        }
        users = append(users, u)
    }

    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("rows.Err: %w", err)
    }

    return users, nil
}

func main() {
    db, err := sqlx.Open("mysql", "root:secret@tcp(127.0.0.1:3306)/myapp?parseTime=true")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    users, err := getUsersWithStructScan(context.Background(), db)
    if err != nil {
        log.Fatal(err)
    }

    for _, u := range users {
        fmt.Printf("ID:%d Name:%s Email:%s\n", u.ID, u.Name, u.Email)
    }
}
```

### 4-3 Named Query：具名佔位符（:name）

Named Query 讓 SQL 更易讀，特別是參數多時特別有用：

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/jmoiron/sqlx"
    _ "github.com/go-sql-driver/mysql"
)

type CreateUserRequest struct {
    Name  string `db:"name"`
    Email string `db:"email"`
    Age   int    `db:"age"`
}

func createUserNamed(ctx context.Context, db *sqlx.DB, req CreateUserRequest) error {
    // 使用 :欄位名 作為佔位符，對應 struct 的 db tag 或 map 的 key
    _, err := db.NamedExecContext(ctx,
        "INSERT INTO users (name, email, age) VALUES (:name, :email, :age)",
        req,
    )
    if err != nil {
        return fmt.Errorf("NamedExecContext: %w", err)
    }
    return nil
}

// 也可以傳入 map
func createUserNamedMap(ctx context.Context, db *sqlx.DB) error {
    params := map[string]interface{}{
        "name":  "Bob",
        "email": "bob@example.com",
        "age":   25,
    }

    _, err := db.NamedExecContext(ctx,
        "INSERT INTO users (name, email, age) VALUES (:name, :email, :age)",
        params,
    )
    if err != nil {
        return fmt.Errorf("NamedExecContext: %w", err)
    }
    return nil
}

func main() {
    db, err := sqlx.Open("mysql", "root:secret@tcp(127.0.0.1:3306)/myapp?parseTime=true")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    req := CreateUserRequest{Name: "Alice", Email: "alice@example.com", Age: 30}
    if err := createUserNamed(context.Background(), db, req); err != nil {
        log.Fatal(err)
    }
    fmt.Println("新增成功")
}
```

### 4-4 In 查詢（sqlx.In）

`IN (?)` 語法在標準庫中無法直接傳入 slice，`sqlx.In` 幫你展開：

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/jmoiron/sqlx"
    _ "github.com/go-sql-driver/mysql"
)

type User struct {
    ID    int64  `db:"id"`
    Name  string `db:"name"`
    Email string `db:"email"`
}

func getUsersByIDs(ctx context.Context, db *sqlx.DB, ids []int64) ([]User, error) {
    if len(ids) == 0 {
        return nil, nil
    }

    // sqlx.In 展開 slice，回傳展開後的 query 和 args
    // "SELECT ... WHERE id IN (?)" + []int64{1,2,3}
    // → "SELECT ... WHERE id IN (?,?,?)" + 1, 2, 3
    query, args, err := sqlx.In("SELECT id, name, email FROM users WHERE id IN (?)", ids)
    if err != nil {
        return nil, fmt.Errorf("sqlx.In: %w", err)
    }

    // Rebind 將 ? 轉換為對應資料庫的佔位符格式（PostgreSQL 需要 $1, $2...）
    query = db.Rebind(query)

    var users []User
    if err := db.SelectContext(ctx, &users, query, args...); err != nil {
        return nil, fmt.Errorf("SelectContext: %w", err)
    }

    return users, nil
}

func main() {
    db, err := sqlx.Open("mysql", "root:secret@tcp(127.0.0.1:3306)/myapp?parseTime=true")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    users, err := getUsersByIDs(context.Background(), db, []int64{1, 2, 3})
    if err != nil {
        log.Fatal(err)
    }

    for _, u := range users {
        fmt.Printf("%d: %s (%s)\n", u.ID, u.Name, u.Email)
    }
}
```

### 4-5 Get vs Select 的差異

`Get` 和 `Select` 是 sqlx 最常用的兩個函數，大幅簡化程式碼：

```go
package main

import (
    "context"
    "database/sql"
    "errors"
    "fmt"
    "log"

    "github.com/jmoiron/sqlx"
    _ "github.com/go-sql-driver/mysql"
)

type User struct {
    ID    int64  `db:"id"`
    Name  string `db:"name"`
    Email string `db:"email"`
    Age   int    `db:"age"`
}

func demonstrateGetAndSelect(ctx context.Context, db *sqlx.DB) {
    // Get：查詢單筆，自動 StructScan，等同於 QueryRowx + StructScan
    // 找不到資料時回傳 sql.ErrNoRows
    var user User
    err := db.GetContext(ctx, &user, "SELECT id, name, email, age FROM users WHERE id = ?", 1)
    if errors.Is(err, sql.ErrNoRows) {
        fmt.Println("找不到使用者")
    } else if err != nil {
        log.Printf("Get 失敗: %v", err)
    } else {
        fmt.Printf("Get 結果: %+v\n", user)
    }

    // Select：查詢多筆，自動掃描進 slice，等同於 Queryx + 迴圈 StructScan
    var users []User
    err = db.SelectContext(ctx, &users, "SELECT id, name, email, age FROM users WHERE age > ?", 18)
    if err != nil {
        log.Printf("Select 失敗: %v", err)
        return
    }
    fmt.Printf("Select 結果：共 %d 筆\n", len(users))
    for _, u := range users {
        fmt.Printf("  %+v\n", u)
    }
}

func main() {
    db, err := sqlx.Open("mysql", "root:secret@tcp(127.0.0.1:3306)/myapp?parseTime=true")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    demonstrateGetAndSelect(context.Background(), db)
}
```

| 函數 | 場景 | 找不到時 |
| :--- | :--- | :--- |
| `Get` | 查單筆，自動掃描進 struct | 回傳 `sql.ErrNoRows` |
| `Select` | 查多筆，自動掃描進 slice | 回傳空 slice（不報錯） |

---

## 5. GORM 基礎

### 5-1 GORM 是什麼？安裝與連線

GORM 是 Go 語言最流行的 ORM（Object-Relational Mapping）框架，讓你用 Go struct 操作資料庫，不需要手寫大部分 SQL。

安裝：

```bash
go get gorm.io/gorm
go get gorm.io/driver/mysql    # MySQL
go get gorm.io/driver/postgres  # PostgreSQL
go get gorm.io/driver/sqlite    # SQLite
```

建立連線：

```go
package main

import (
    "fmt"
    "log"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

func NewGormDB() (*gorm.DB, error) {
    dsn := "root:secret@tcp(127.0.0.1:3306)/myapp?charset=utf8mb4&parseTime=True&loc=Local"

    db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
        // 設定日誌等級：Info 會印出所有 SQL（開發用），Warn 只印慢查詢（生產用）
        Logger: logger.Default.LogMode(logger.Info),
    })
    if err != nil {
        return nil, fmt.Errorf("gorm.Open: %w", err)
    }

    // 取得底層 *sql.DB 來設定連線池
    sqlDB, err := db.DB()
    if err != nil {
        return nil, fmt.Errorf("db.DB(): %w", err)
    }

    sqlDB.SetMaxOpenConns(25)
    sqlDB.SetMaxIdleConns(10)

    return db, nil
}

func main() {
    db, err := NewGormDB()
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("GORM 連線成功：%T\n", db)
}
```

### 5-2 Model 定義（gorm.Model 的欄位）

GORM Model 就是加了 gorm tag 的 Go struct：

```go
package main

import (
    "time"

    "gorm.io/gorm"
)

// gorm.Model 提供四個基礎欄位（可以嵌入使用）
// type Model struct {
//     ID        uint           `gorm:"primarykey"`
//     CreatedAt time.Time
//     UpdatedAt time.Time
//     DeletedAt gorm.DeletedAt `gorm:"index"` // 軟刪除欄位
// }

// 方式一：嵌入 gorm.Model（自動包含 ID、CreatedAt、UpdatedAt、DeletedAt）
type User struct {
    gorm.Model         // 嵌入後自動擁有 ID、CreatedAt、UpdatedAt、DeletedAt
    Name      string   `gorm:"size:100;not null"`
    Email     string   `gorm:"uniqueIndex;size:200;not null"`
    Age       int      `gorm:"default:0"`
    Active    bool     `gorm:"default:true"`
}

// 方式二：自訂欄位（不嵌入 gorm.Model）
type Order struct {
    ID          uint           `gorm:"primarykey;autoIncrement"`
    CreatedAt   time.Time
    UpdatedAt   time.Time
    DeletedAt   gorm.DeletedAt `gorm:"index"`
    UserID      uint           `gorm:"not null;index"`
    TotalAmount float64        `gorm:"type:decimal(10,2);not null"`
    Status      string         `gorm:"size:20;default:'pending'"`
}
```

常用 gorm tag 說明：

| Tag | 說明 | 範例 |
| :--- | :--- | :--- |
| `primarykey` | 主鍵 | `gorm:"primarykey"` |
| `autoIncrement` | 自動遞增 | `gorm:"autoIncrement"` |
| `not null` | 非空 | `gorm:"not null"` |
| `uniqueIndex` | 唯一索引 | `gorm:"uniqueIndex"` |
| `index` | 一般索引 | `gorm:"index"` |
| `size` | 欄位長度 | `gorm:"size:100"` |
| `default` | 預設值 | `gorm:"default:0"` |
| `column` | 自訂欄位名 | `gorm:"column:user_name"` |
| `type` | 欄位型別 | `gorm:"type:decimal(10,2)"` |
| `-` | 忽略此欄位 | `gorm:"-"` |

### 5-3 AutoMigrate：自動建立 / 更新資料表

```go
package main

import (
    "fmt"
    "log"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

type User struct {
    gorm.Model
    Name  string `gorm:"size:100;not null"`
    Email string `gorm:"uniqueIndex;not null"`
    Age   int
}

type Order struct {
    gorm.Model
    UserID uint    `gorm:"not null;index"`
    Amount float64 `gorm:"type:decimal(10,2)"`
    Status string  `gorm:"size:20;default:'pending'"`
}

func main() {
    db, err := gorm.Open(mysql.Open("root:secret@tcp(127.0.0.1:3306)/myapp?parseTime=True"), &gorm.Config{})
    if err != nil {
        log.Fatal(err)
    }

    // AutoMigrate：若資料表不存在則建立，若存在則新增缺少的欄位（不會刪除欄位）
    if err := db.AutoMigrate(&User{}, &Order{}); err != nil {
        log.Fatalf("AutoMigrate 失敗: %v", err)
    }

    fmt.Println("AutoMigrate 完成")
}
```

> **注意**：`AutoMigrate` 只會**新增**欄位和索引，不會**刪除**或**修改**已存在的欄位。生產環境建議使用專門的 Migration 工具（如 `golang-migrate`）以精確控制 Schema 變更。

### 5-4 基本 CRUD

#### 建立（Create）

```go
package main

import (
    "errors"
    "fmt"
    "log"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

type User struct {
    gorm.Model
    Name  string `gorm:"size:100;not null"`
    Email string `gorm:"uniqueIndex;not null"`
    Age   int
}

func createExamples(db *gorm.DB) {
    // 建立單筆
    user := User{Name: "Alice", Email: "alice@example.com", Age: 30}
    result := db.Create(&user) // 傳入指標，建立後 user.ID 會被填入
    if result.Error != nil {
        log.Printf("Create 失敗: %v", result.Error)
        return
    }
    fmt.Printf("建立成功，ID: %d\n", user.ID) // user.ID 已被填入

    // 建立多筆
    users := []User{
        {Name: "Bob", Email: "bob@example.com", Age: 25},
        {Name: "Carol", Email: "carol@example.com", Age: 28},
    }
    result = db.Create(&users)
    if result.Error != nil {
        log.Printf("批次建立失敗: %v", result.Error)
        return
    }
    fmt.Printf("批次建立成功，影響 %d 筆\n", result.RowsAffected)

    // 只建立指定欄位
    partialUser := User{Name: "Dave", Email: "dave@example.com", Age: 35}
    result = db.Select("Name", "Email").Create(&partialUser) // 只插入 name 和 email
    if result.Error != nil {
        log.Printf("部分建立失敗: %v", result.Error)
    }
}

func main() {
    db, err := gorm.Open(mysql.Open("root:secret@tcp(127.0.0.1:3306)/myapp?parseTime=True"), &gorm.Config{})
    if err != nil {
        log.Fatal(err)
    }
    db.AutoMigrate(&User{})
    createExamples(db)
}
```

#### 查詢（First、Find、Where）

```go
package main

import (
    "errors"
    "fmt"
    "log"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

type User struct {
    gorm.Model
    Name  string
    Email string
    Age   int
}

func queryExamples(db *gorm.DB) {
    // First：查詢第一筆（依主鍵排序），找不到時回傳 gorm.ErrRecordNotFound
    var user User
    result := db.First(&user, 1) // 等同於 WHERE id = 1 ORDER BY id LIMIT 1
    if errors.Is(result.Error, gorm.ErrRecordNotFound) {
        fmt.Println("找不到使用者")
    } else if result.Error != nil {
        log.Printf("First 失敗: %v", result.Error)
    } else {
        fmt.Printf("First 結果: %+v\n", user)
    }

    // Find：查詢多筆
    var users []User
    result = db.Find(&users) // 查詢所有使用者
    if result.Error != nil {
        log.Printf("Find 失敗: %v", result.Error)
        return
    }
    fmt.Printf("共 %d 位使用者\n", len(users))

    // Where + Find：條件查詢
    var adults []User
    result = db.Where("age >= ?", 18).Find(&adults)
    if result.Error != nil {
        log.Printf("Where Find 失敗: %v", result.Error)
        return
    }
    fmt.Printf("18 歲以上共 %d 位\n", len(adults))

    // Where 條件多樣化
    var specificUsers []User
    db.Where("name = ? AND age > ?", "Alice", 20).Find(&specificUsers)
    db.Where(map[string]interface{}{"name": "Alice", "age": 30}).Find(&specificUsers)

    // Take：查詢單筆（不排序），找不到時回傳 gorm.ErrRecordNotFound
    var anyUser User
    db.Take(&anyUser)
}
```

#### 更新（Save、Updates）

```go
package main

import (
    "fmt"
    "log"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

type User struct {
    gorm.Model
    Name   string
    Email  string
    Age    int
    Active bool
}

func updateExamples(db *gorm.DB) {
    // Save：全欄位更新（包含零值），需要先查詢出記錄
    var user User
    db.First(&user, 1)
    user.Name = "Alice Updated"
    user.Age = 31
    result := db.Save(&user) // 更新所有欄位
    if result.Error != nil {
        log.Printf("Save 失敗: %v", result.Error)
    }

    // Updates：只更新非零值欄位（使用 struct 時）
    result = db.Model(&user).Updates(User{Name: "Alice V2", Age: 32})
    // 注意：Active = false 是零值，不會被更新！
    if result.Error != nil {
        log.Printf("Updates(struct) 失敗: %v", result.Error)
    }

    // Updates 使用 map：可以更新零值欄位
    result = db.Model(&user).Updates(map[string]interface{}{
        "name":   "Alice V3",
        "age":    33,
        "active": false, // map 可以更新 false 這樣的零值
    })
    if result.Error != nil {
        log.Printf("Updates(map) 失敗: %v", result.Error)
    }

    // Update：更新單一欄位
    result = db.Model(&user).Update("name", "Alice Final")
    if result.Error != nil {
        log.Printf("Update 單欄位失敗: %v", result.Error)
    }

    fmt.Printf("更新成功，影響 %d 筆\n", result.RowsAffected)
}
```

> **警告**：使用 `Updates(struct)` 時，**零值欄位不會被更新**。例如 `Active: false`、`Age: 0` 都不會生效。若需要更新零值，改用 `Updates(map[string]interface{}{...})`。

#### 刪除（Delete、軟刪除）

```go
package main

import (
    "fmt"
    "log"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

type User struct {
    gorm.Model // 包含 DeletedAt，啟用軟刪除
    Name  string
    Email string
}

func deleteExamples(db *gorm.DB) {
    // 軟刪除：因為 User 嵌入了 gorm.Model（含 DeletedAt），
    // db.Delete 只會設定 deleted_at 欄位，資料不會真正消失
    var user User
    db.First(&user, 1)
    result := db.Delete(&user) // 設定 deleted_at = NOW()
    if result.Error != nil {
        log.Printf("Delete 失敗: %v", result.Error)
        return
    }
    fmt.Printf("軟刪除成功，ID: %d\n", user.ID)

    // 軟刪除後，一般查詢會自動加上 WHERE deleted_at IS NULL
    var users []User
    db.Find(&users) // 不會找到已軟刪除的記錄

    // 若要查詢包含已刪除的記錄，使用 Unscoped
    var allUsers []User
    db.Unscoped().Find(&allUsers) // 包含軟刪除的記錄

    // 真正刪除（永久刪除）：使用 Unscoped().Delete
    var deletedUser User
    db.Unscoped().First(&deletedUser, 1) // 找到軟刪除的記錄
    db.Unscoped().Delete(&deletedUser)    // 永久刪除

    // 依條件刪除（不需要先查詢）
    result = db.Where("age < ?", 18).Delete(&User{})
    if result.Error != nil {
        log.Printf("條件刪除失敗: %v", result.Error)
        return
    }
    fmt.Printf("條件刪除 %d 筆\n", result.RowsAffected)
}
```

---

## 6. GORM 進階查詢

### 6-1 Where 條件（字串、struct、Map）

```go
package main

import (
    "fmt"
    "log"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

type User struct {
    gorm.Model
    Name   string
    Email  string
    Age    int
    Active bool
}

func whereExamples(db *gorm.DB) {
    var users []User

    // 字串條件（靈活，支援複雜條件）
    db.Where("name = ?", "Alice").Find(&users)
    db.Where("age BETWEEN ? AND ?", 20, 30).Find(&users)
    db.Where("name IN ?", []string{"Alice", "Bob"}).Find(&users)
    db.Where("name LIKE ?", "%ali%").Find(&users)

    // Struct 條件（零值欄位會被忽略）
    db.Where(&User{Name: "Alice", Age: 30}).Find(&users)
    // 注意：Active: false 是零值，不會被加入條件

    // Map 條件（可以包含零值）
    db.Where(map[string]interface{}{
        "name":   "Alice",
        "active": false, // 可以用 false
    }).Find(&users)

    // Not 條件
    db.Not("name = ?", "Alice").Find(&users)

    // Or 條件
    db.Where("name = ?", "Alice").Or("name = ?", "Bob").Find(&users)

    fmt.Printf("查詢結果：%d 筆\n", len(users))
}
```

### 6-2 Order、Limit、Offset（分頁）

```go
package main

import (
    "fmt"
    "log"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

type User struct {
    gorm.Model
    Name string
    Age  int
}

type PaginationResult struct {
    Users      []User
    Total      int64
    Page       int
    PageSize   int
    TotalPages int
}

func paginate(db *gorm.DB, page, pageSize int) (*PaginationResult, error) {
    var total int64
    var users []User

    // 計算總筆數（不含 LIMIT / OFFSET）
    if err := db.Model(&User{}).Count(&total).Error; err != nil {
        return nil, fmt.Errorf("Count: %w", err)
    }

    offset := (page - 1) * pageSize

    result := db.
        Order("created_at DESC"). // 依建立時間降冪
        Order("id ASC").          // 再依 ID 升冪（二次排序）
        Limit(pageSize).
        Offset(offset).
        Find(&users)

    if result.Error != nil {
        return nil, fmt.Errorf("Find: %w", result.Error)
    }

    totalPages := int(total) / pageSize
    if int(total)%pageSize > 0 {
        totalPages++
    }

    return &PaginationResult{
        Users:      users,
        Total:      total,
        Page:       page,
        PageSize:   pageSize,
        TotalPages: totalPages,
    }, nil
}
```

### 6-3 Select 指定欄位

```go
package main

import (
    "fmt"
    "log"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

type User struct {
    gorm.Model
    Name  string
    Email string
    Age   int
}

// 用於只需要部分欄位的輕量 struct
type UserSummary struct {
    ID   uint
    Name string
    Age  int
}

func selectExamples(db *gorm.DB) {
    // 只查詢需要的欄位（減少資料傳輸）
    var users []User
    db.Select("id", "name", "age").Find(&users)

    // 掃描到不同 struct（更安全，避免暴露不必要的欄位）
    var summaries []UserSummary
    if err := db.Model(&User{}).Select("id, name, age").Scan(&summaries).Error; err != nil {
        log.Printf("Scan 失敗: %v", err)
        return
    }

    for _, s := range summaries {
        fmt.Printf("ID:%d Name:%s Age:%d\n", s.ID, s.Name, s.Age)
    }
}
```

### 6-4 Joins：關聯查詢

```go
package main

import (
    "fmt"
    "log"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

type User struct {
    gorm.Model
    Name   string
    Orders []Order
}

type Order struct {
    gorm.Model
    UserID uint
    Amount float64
    Status string
}

type UserOrderSummary struct {
    UserID     uint
    UserName   string
    TotalOrders int64
    TotalAmount float64
}

func joinsExample(db *gorm.DB) {
    var summaries []UserOrderSummary

    result := db.Model(&User{}).
        Select("users.id as user_id, users.name as user_name, COUNT(orders.id) as total_orders, COALESCE(SUM(orders.amount), 0) as total_amount").
        Joins("LEFT JOIN orders ON orders.user_id = users.id AND orders.deleted_at IS NULL").
        Where("users.deleted_at IS NULL").
        Group("users.id, users.name").
        Scan(&summaries)

    if result.Error != nil {
        log.Printf("Joins 失敗: %v", result.Error)
        return
    }

    for _, s := range summaries {
        fmt.Printf("使用者 %s：%d 筆訂單，總金額 %.2f\n", s.UserName, s.TotalOrders, s.TotalAmount)
    }
}
```

### 6-5 Preload vs Joins 的差異

這是 GORM 中最常混淆的概念之一：

```text
Preload（N+1 變 1+1）：
  查詢 Users → SELECT * FROM users
  再查詢關聯 → SELECT * FROM orders WHERE user_id IN (1,2,3,...)
  = 2 次 SQL，結果自動填入 User.Orders

Joins（單次查詢）：
  SELECT users.*, orders.* FROM users LEFT JOIN orders ON ...
  = 1 次 SQL，適合需要過濾關聯欄位的場景
```

```go
package main

import (
    "fmt"
    "log"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

type User struct {
    gorm.Model
    Name   string
    Orders []Order
}

type Order struct {
    gorm.Model
    UserID uint
    Amount float64
    Status string
    User   User // 反向關聯
}

func preloadVsJoins(db *gorm.DB) {
    // Preload：適合「取得所有使用者及其訂單」
    // 優點：不限制 Orders 的數量，程式碼直觀
    var usersWithOrders []User
    db.Preload("Orders").Find(&usersWithOrders)
    // 產生 SQL：
    //   SELECT * FROM users
    //   SELECT * FROM orders WHERE user_id IN (1,2,3,...)

    // Preload 帶條件：只載入特定狀態的訂單
    var usersWithPaidOrders []User
    db.Preload("Orders", "status = ?", "paid").Find(&usersWithPaidOrders)

    // Joins：適合「依訂單欄位過濾使用者」
    // 例：找出有已付款訂單的使用者
    var usersHavingPaidOrders []User
    db.Joins("JOIN orders ON orders.user_id = users.id AND orders.status = ?", "paid").
        Find(&usersHavingPaidOrders)
    // 產生 SQL：
    //   SELECT users.* FROM users
    //   JOIN orders ON orders.user_id = users.id AND orders.status = 'paid'

    fmt.Printf("Preload 結果：%d 位使用者\n", len(usersWithOrders))
    fmt.Printf("Joins 結果：%d 位使用者有已付款訂單\n", len(usersHavingPaidOrders))
}
```

| 情境 | 使用 | 原因 |
| :--- | :--- | :--- |
| 取得關聯資料 | Preload | 自動填入 struct，程式碼簡潔 |
| 依關聯欄位過濾 | Joins | 在單次 SQL 中加條件 |
| 大量資料的關聯 | Preload | 避免 Cartesian Product |
| 計算聚合值 | Joins + Select | SUM、COUNT 等聚合查詢 |

### 6-6 Raw SQL 與 Scan

有時候 GORM 的 DSL 不夠用，可以直接寫 Raw SQL：

```go
package main

import (
    "fmt"
    "log"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

type MonthlyStats struct {
    Month       string
    OrderCount  int64
    TotalAmount float64
}

func rawSQLExamples(db *gorm.DB) {
    // Raw + Scan：執行原始 SQL，結果掃描進 struct
    var stats []MonthlyStats
    result := db.Raw(`
        SELECT
            DATE_FORMAT(created_at, '%Y-%m') as month,
            COUNT(*) as order_count,
            SUM(amount) as total_amount
        FROM orders
        WHERE deleted_at IS NULL
          AND created_at >= ?
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
    `, "2024-01-01").Scan(&stats)

    if result.Error != nil {
        log.Printf("Raw 失敗: %v", result.Error)
        return
    }

    for _, s := range stats {
        fmt.Printf("%s：%d 筆訂單，總金額 %.2f\n", s.Month, s.OrderCount, s.TotalAmount)
    }

    // Exec：執行不回傳資料的 Raw SQL
    result = db.Exec("UPDATE users SET age = age + 1 WHERE id = ?", 1)
    if result.Error != nil {
        log.Printf("Exec 失敗: %v", result.Error)
        return
    }
    fmt.Printf("Raw Exec 影響 %d 筆\n", result.RowsAffected)
}
```

---

## 7. GORM 關聯

### 7-1 Has One / Has Many / Belongs To

```go
package main

import "gorm.io/gorm"

// Belongs To：每個 Order 屬於一個 User
// GORM 約定：有 UserID 欄位 → User 為外鍵關聯對象
type Order struct {
    gorm.Model
    UserID uint   `gorm:"not null;index"` // 外鍵（GORM 約定）
    Amount float64
    Status string
    User   User   // Belongs To：關聯對象（可選，用於 Preload）
}

// Has Many：一個 User 有多個 Orders
type User struct {
    gorm.Model
    Name    string
    Email   string
    Orders  []Order  // Has Many：一對多
    Profile *Profile // Has One：一對一
}

// Has One：一個 User 只有一個 Profile
type Profile struct {
    gorm.Model
    UserID uint   `gorm:"uniqueIndex"` // 唯一外鍵
    Bio    string
    Avatar string
    User   User
}
```

### 7-2 Many to Many

```go
package main

import "gorm.io/gorm"

// 標籤（Tag）與文章（Article）是多對多關係
// GORM 會自動建立中間表 article_tags
type Article struct {
    gorm.Model
    Title   string
    Content string
    Tags    []Tag `gorm:"many2many:article_tags;"`
}

type Tag struct {
    gorm.Model
    Name     string    `gorm:"uniqueIndex"`
    Articles []Article `gorm:"many2many:article_tags;"`
}

// 如果需要自訂中間表（加額外欄位），手動定義：
type ArticleTag struct {
    ArticleID uint      `gorm:"primaryKey"`
    TagID     uint      `gorm:"primaryKey"`
    AddedBy   string    // 額外欄位：誰加的標籤
}
```

### 7-3 外鍵設定

```go
package main

import "gorm.io/gorm"

// GORM 預設約定：
// 外鍵欄位名 = 關聯 struct 名稱 + "ID"
// 例：User → UserID、Category → CategoryID

// 自訂外鍵名稱
type Comment struct {
    gorm.Model
    AuthorID  uint   `gorm:"column:author_id"`          // 自訂欄位名
    ArticleID uint
    Content   string
    // foreignKey 指定外鍵欄位，references 指定參照的主鍵
    Author    User    `gorm:"foreignKey:AuthorID;references:ID"`
    Article   Article `gorm:"foreignKey:ArticleID"`
}

type User struct {
    gorm.Model
    Name     string
    Comments []Comment `gorm:"foreignKey:AuthorID"` // 反向關聯
}

type Article struct {
    gorm.Model
    Title    string
    Comments []Comment // GORM 預設找 ArticleID 外鍵
}
```

### 7-4 Preload 載入關聯

```go
package main

import (
    "fmt"
    "log"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

type User struct {
    gorm.Model
    Name    string
    Orders  []Order
    Profile *Profile
}

type Order struct {
    gorm.Model
    UserID uint
    Amount float64
    Status string
    Items  []OrderItem
}

type OrderItem struct {
    gorm.Model
    OrderID     uint
    ProductName string
    Quantity    int
    Price       float64
}

type Profile struct {
    gorm.Model
    UserID uint
    Bio    string
}

func preloadExamples(db *gorm.DB) {
    // 單層 Preload
    var users []User
    db.Preload("Orders").Find(&users)

    // 多層 Preload（Orders 及其 Items）
    db.Preload("Orders.Items").Find(&users)

    // 多個關聯同時 Preload
    db.Preload("Orders").Preload("Profile").Find(&users)

    // 巢狀 Preload + 條件
    db.Preload("Orders", func(db *gorm.DB) *gorm.DB {
        return db.Where("status = ?", "paid").Order("created_at DESC")
    }).Find(&users)

    // 使用 clause.Associations 載入所有關聯（不建議生產環境用）
    // db.Preload(clause.Associations).Find(&users)

    for _, u := range users {
        fmt.Printf("使用者 %s 有 %d 筆訂單\n", u.Name, len(u.Orders))
        for _, o := range u.Orders {
            fmt.Printf("  訂單 %d：%.2f 元，%d 個商品\n", o.ID, o.Amount, len(o.Items))
        }
    }
}
```

---

## 8. GORM Transaction

### 8-1 db.Transaction 自動管理

`db.Transaction` 是最簡潔的 Transaction 寫法，自動處理 Commit 和 Rollback：

```go
package main

import (
    "errors"
    "fmt"
    "log"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

type User struct {
    gorm.Model
    Name  string
    Email string
}

type Account struct {
    gorm.Model
    UserID  uint
    Balance float64
}

func createUserWithAccount(db *gorm.DB, name, email string, initialBalance float64) error {
    // db.Transaction 自動管理：
    // - fn 回傳 nil → 自動 Commit
    // - fn 回傳 error 或 panic → 自動 Rollback
    return db.Transaction(func(tx *gorm.DB) error {
        // 注意：在 Transaction 內部一定要用 tx，不能用 db！
        user := User{Name: name, Email: email}
        if err := tx.Create(&user).Error; err != nil {
            return fmt.Errorf("建立使用者失敗: %w", err)
        }

        account := Account{UserID: user.ID, Balance: initialBalance}
        if err := tx.Create(&account).Error; err != nil {
            return fmt.Errorf("建立帳戶失敗: %w", err)
        }

        return nil // 回傳 nil → 自動 Commit
    })
}

func main() {
    db, err := gorm.Open(mysql.Open("root:secret@tcp(127.0.0.1:3306)/myapp?parseTime=True"), &gorm.Config{})
    if err != nil {
        log.Fatal(err)
    }
    db.AutoMigrate(&User{}, &Account{})

    if err := createUserWithAccount(db, "Alice", "alice@example.com", 1000.0); err != nil {
        log.Printf("建立失敗: %v", err)
        return
    }
    fmt.Println("建立成功")
}
```

### 8-2 手動 Begin / Commit / Rollback

當需要更精細的控制（例如 Transaction 橫跨多個函數）時，使用手動方式：

```go
package main

import (
    "fmt"

    "gorm.io/gorm"
)

type Order struct {
    gorm.Model
    UserID  uint
    Amount  float64
    Status  string
}

type Inventory struct {
    gorm.Model
    ProductID uint
    Quantity  int
}

func createOrderManual(db *gorm.DB, userID uint, productID uint, quantity int, amount float64) error {
    // 手動開始 Transaction
    tx := db.Begin()
    if tx.Error != nil {
        return fmt.Errorf("Begin: %w", tx.Error)
    }

    // 標準 defer Rollback 模式
    defer func() {
        if r := recover(); r != nil {
            tx.Rollback()
        }
    }()

    // 也可以用 defer tx.Rollback()，但要注意 GORM 的行為
    // 若 tx 已 Commit，Rollback 會回傳 ErrTxDone（可安全忽略）

    order := Order{UserID: userID, Amount: amount, Status: "pending"}
    if err := tx.Create(&order).Error; err != nil {
        tx.Rollback()
        return fmt.Errorf("建立訂單: %w", err)
    }

    if err := tx.Model(&Inventory{}).
        Where("product_id = ? AND quantity >= ?", productID, quantity).
        Update("quantity", gorm.Expr("quantity - ?", quantity)).Error; err != nil {
        tx.Rollback()
        return fmt.Errorf("扣減庫存: %w", err)
    }

    if err := tx.Commit().Error; err != nil {
        return fmt.Errorf("Commit: %w", err)
    }

    return nil
}
```

### 8-3 SavePoint（巢狀 Transaction）

GORM 支援 SavePoint，讓你在 Transaction 內部設定還原點：

```go
package main

import (
    "fmt"
    "log"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

type User struct {
    gorm.Model
    Name  string
    Email string
}

func savepointExample(db *gorm.DB) error {
    tx := db.Begin()
    if tx.Error != nil {
        return fmt.Errorf("Begin: %w", tx.Error)
    }
    defer tx.Rollback()

    // 第一步：建立主要使用者
    if err := tx.Create(&User{Name: "Alice", Email: "alice@example.com"}).Error; err != nil {
        return fmt.Errorf("建立 Alice: %w", err)
    }

    // 設定 SavePoint（在這個點之前的操作可以保留）
    tx.SavePoint("after_alice")

    // 第二步：嘗試建立次要使用者
    if err := tx.Create(&User{Name: "Bob", Email: "duplicate@example.com"}).Error; err != nil {
        // 若失敗，只回滾到 SavePoint，Alice 的操作仍然保留
        tx.RollbackTo("after_alice")
        fmt.Println("建立 Bob 失敗，已回滾到 SavePoint，Alice 保留")
    }

    if err := tx.Commit().Error; err != nil {
        return fmt.Errorf("Commit: %w", err)
    }

    return nil
}

func main() {
    db, err := gorm.Open(mysql.Open("root:secret@tcp(127.0.0.1:3306)/myapp?parseTime=True"), &gorm.Config{})
    if err != nil {
        log.Fatal(err)
    }
    db.AutoMigrate(&User{})

    if err := savepointExample(db); err != nil {
        log.Printf("失敗: %v", err)
        return
    }
    fmt.Println("完成")
}
```

---

## 9. 常見問題與陷阱

### 9-1 未關閉 rows 導致連線洩漏

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
)

// 錯誤示範：忘記關閉 rows
func leakRows(ctx context.Context, db *sql.DB) {
    rows, err := db.QueryContext(ctx, "SELECT id FROM users")
    if err != nil {
        return
    }
    // 忘記 defer rows.Close()！
    // rows 未關閉 → 連線無法返回連線池 → 連線洩漏
    for rows.Next() {
        var id int
        rows.Scan(&id)
        fmt.Println(id)
    }
}

// 正確示範：立即 defer rows.Close()
func noLeak(ctx context.Context, db *sql.DB) error {
    rows, err := db.QueryContext(ctx, "SELECT id FROM users")
    if err != nil {
        return fmt.Errorf("QueryContext: %w", err)
    }
    defer rows.Close() // ← 立即加上，永遠不會忘記

    for rows.Next() {
        var id int
        if err := rows.Scan(&id); err != nil {
            return fmt.Errorf("Scan: %w", err)
        }
        fmt.Println(id)
    }

    return rows.Err()
}
```

> **警告**：每次 `db.Query` 後必須立即 `defer rows.Close()`，否則每個未關閉的 rows 都會佔用一個資料庫連線，最終耗盡連線池。

### 9-2 N+1 查詢問題與解法

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"

    "gorm.io/gorm"
)

// 問題：N+1 查詢（1 次查 Users + N 次查 Orders）
func badN1Query(db *gorm.DB) {
    var users []struct {
        gorm.Model
        Name string
    }
    db.Find(&users) // 查詢 1 次

    for _, u := range users {
        var orders []struct {
            gorm.Model
            Amount float64
        }
        // 每個 user 查詢 1 次 = N 次
        db.Where("user_id = ?", u.ID).Find(&orders)
        fmt.Printf("%s 有 %d 筆訂單\n", u.Name, len(orders))
    }
    // 總共執行 1 + N 次 SQL！
}

// 解法一：GORM Preload（1+1 次查詢）
type UserWithOrders struct {
    gorm.Model
    Name   string
    Orders []struct {
        gorm.Model
        UserID uint
        Amount float64
    } `gorm:"foreignKey:UserID"`
}

func goodPreload(db *gorm.DB) {
    var users []UserWithOrders
    db.Preload("Orders").Find(&users)
    // SQL：
    //   SELECT * FROM users
    //   SELECT * FROM orders WHERE user_id IN (1,2,3,...)
    // 只有 2 次查詢！
}

// 解法二：database/sql 手動 JOIN（1 次查詢）
func goodJoin(ctx context.Context, db *sql.DB) error {
    rows, err := db.QueryContext(ctx, `
        SELECT u.id, u.name, o.id, o.amount
        FROM users u
        LEFT JOIN orders o ON o.user_id = u.id
        WHERE u.deleted_at IS NULL
        ORDER BY u.id
    `)
    if err != nil {
        return fmt.Errorf("QueryContext: %w", err)
    }
    defer rows.Close()

    for rows.Next() {
        var userID int64
        var userName string
        var orderID sql.NullInt64
        var amount sql.NullFloat64
        if err := rows.Scan(&userID, &userName, &orderID, &amount); err != nil {
            return fmt.Errorf("Scan: %w", err)
        }
        // 處理結果...
        _ = userID
        _ = userName
    }

    return rows.Err()
}
```

### 9-3 GORM 軟刪除的注意事項

```go
package main

import (
    "fmt"

    "gorm.io/gorm"
)

type User struct {
    gorm.Model // 包含 DeletedAt，啟用軟刪除
    Name  string
    Email string `gorm:"uniqueIndex"`
}

func softDeleteTraps(db *gorm.DB) {
    // 陷阱一：刪除後再建立相同 Email 會失敗
    // 因為軟刪除的記錄仍在資料表中，uniqueIndex 會衝突
    user := User{Name: "Alice", Email: "alice@example.com"}
    db.Create(&user)
    db.Delete(&user) // 軟刪除

    // 再次建立相同 Email → Duplicate entry 錯誤！
    newUser := User{Name: "Alice V2", Email: "alice@example.com"}
    if err := db.Create(&newUser).Error; err != nil {
        fmt.Printf("預期中的錯誤：%v\n", err)
    }

    // 解法：唯一索引加上 deleted_at
    // gorm:"uniqueIndex:idx_email_deleted,composite:deleted_at"

    // 陷阱二：Count 也會過濾軟刪除
    var count int64
    db.Model(&User{}).Count(&count) // 不計算軟刪除的記錄

    var allCount int64
    db.Unscoped().Model(&User{}).Count(&allCount) // 包含軟刪除

    fmt.Printf("活躍使用者：%d，全部使用者（含已刪除）：%d\n", count, allCount)

    // 陷阱三：Association 預設也會過濾軟刪除的關聯
    // 若要包含軟刪除的關聯，需手動用 Unscoped
}
```

### 9-4 時區問題（parseTime=true）

```go
package main

import (
    "fmt"
    "log"
    "time"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

type Event struct {
    gorm.Model
    Name      string
    StartTime time.Time
}

func timezoneExample() {
    // 問題：不加 loc=Local，時間會以 UTC 返回，與資料庫儲存的時區不符
    // 錯誤 DSN（缺少 loc 參數）：
    // "root:secret@tcp(localhost:3306)/myapp?parseTime=True"

    // 正確 DSN：
    dsn := "root:secret@tcp(127.0.0.1:3306)/myapp?parseTime=True&loc=Local"
    // parseTime=True：將 DATETIME/TIMESTAMP 欄位解析為 time.Time
    // loc=Local：使用本機時區（也可指定 Asia%2FTaipei）

    db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatal(err)
    }
    db.AutoMigrate(&Event{})

    // 存入台北時間
    taipei := time.FixedZone("Asia/Taipei", 8*60*60)
    event := Event{
        Name:      "會議",
        StartTime: time.Date(2024, 6, 1, 10, 0, 0, 0, taipei),
    }
    db.Create(&event)

    // 讀回時應與存入時一致
    var found Event
    db.First(&found, event.ID)
    fmt.Printf("原始時間：%v\n", event.StartTime)
    fmt.Printf("讀回時間：%v\n", found.StartTime)
}
```

> **建議**：DSN 中永遠加上 `parseTime=True&loc=Local`（MySQL），或 PostgreSQL 中使用 `timezone=Asia/Taipei` 參數，確保時區一致。

### 9-5 database/sql vs sqlx vs GORM 選擇指南

```text
database/sql（標準庫）
  適合：需要完全控制 SQL、效能極敏感、不想依賴第三方套件
  優點：效能最佳、無額外依賴、完全掌控
  缺點：程式碼量多、Scan 繁瑣、無自動對應

sqlx
  適合：想要 database/sql 的效能，但減少重複程式碼
  優點：與 database/sql 完全相容、StructScan 減少程式碼、支援 Named Query
  缺點：仍需手寫 SQL、比 GORM 學習曲線平緩但功能有限

GORM
  適合：快速開發、CRUD 為主、有複雜關聯關係
  優點：程式碼量最少、自動遷移、關聯管理方便、有豐富的生態系
  缺點：效能略低於手寫 SQL、複雜查詢可讀性差、Magic 行為多（零值問題等）
```

| 特性 | database/sql | sqlx | GORM |
| :--- | :---: | :---: | :---: |
| 效能 | 最佳 | 佳 | 良好 |
| 程式碼量 | 多 | 中 | 少 |
| 學習曲線 | 低 | 低 | 中 |
| 複雜查詢 | 容易 | 容易 | 有時複雜 |
| 自動遷移 | 無 | 無 | 有 |
| 關聯管理 | 手動 | 手動 | 自動 |
| 適合場景 | 高效能/底層 | 中等複雜度 | 快速開發 |

---

## 10. Repository Pattern 實作

### 10-1 定義 Repository 介面

介面定義在使用方（service 層），讓實作細節對業務邏輯透明：

```go
package repository

import (
    "context"
    "time"
)

// User 是資料層的領域物件
type User struct {
    ID        int64
    Name      string
    Email     string
    Age       int
    CreatedAt time.Time
    UpdatedAt time.Time
}

// CreateUserInput 封裝建立使用者所需的參數
type CreateUserInput struct {
    Name  string
    Email string
    Age   int
}

// UpdateUserInput 封裝更新使用者所需的參數
type UpdateUserInput struct {
    Name *string // 用指標區分「不更新」和「更新為空字串」
    Age  *int
}

// UserRepository 定義使用者資料存取的介面
// 由 service 層定義，repository 層實作
type UserRepository interface {
    Create(ctx context.Context, input CreateUserInput) (*User, error)
    FindByID(ctx context.Context, id int64) (*User, error)
    FindByEmail(ctx context.Context, email string) (*User, error)
    FindAll(ctx context.Context) ([]User, error)
    Update(ctx context.Context, id int64, input UpdateUserInput) (*User, error)
    Delete(ctx context.Context, id int64) error
}

// 編譯期確認 gormUserRepository 有實作 UserRepository 介面
var _ UserRepository = (*gormUserRepository)(nil)
```

### 10-2 GORM 實作

```go
package repository

import (
    "context"
    "errors"
    "fmt"

    "gorm.io/gorm"
)

// gormUser 是 GORM 的 Model（與資料庫欄位對應）
type gormUser struct {
    gorm.Model
    Name  string `gorm:"size:100;not null"`
    Email string `gorm:"uniqueIndex;not null"`
    Age   int    `gorm:"default:0"`
}

// 將 GORM Model 轉換為領域物件
func toUser(g *gormUser) *User {
    return &User{
        ID:        int64(g.ID),
        Name:      g.Name,
        Email:     g.Email,
        Age:       g.Age,
        CreatedAt: g.CreatedAt,
        UpdatedAt: g.UpdatedAt,
    }
}

type gormUserRepository struct {
    db *gorm.DB
}

// NewGormUserRepository 建構子，回傳介面而非具體型別
func NewGormUserRepository(db *gorm.DB) UserRepository {
    return &gormUserRepository{db: db}
}

func (r *gormUserRepository) Create(ctx context.Context, input CreateUserInput) (*User, error) {
    g := gormUser{Name: input.Name, Email: input.Email, Age: input.Age}
    if err := r.db.WithContext(ctx).Create(&g).Error; err != nil {
        return nil, fmt.Errorf("UserRepository.Create: %w", err)
    }
    return toUser(&g), nil
}

func (r *gormUserRepository) FindByID(ctx context.Context, id int64) (*User, error) {
    var g gormUser
    err := r.db.WithContext(ctx).First(&g, id).Error
    if errors.Is(err, gorm.ErrRecordNotFound) {
        return nil, nil // 找不到時回傳 nil，由 service 層決定如何處理
    }
    if err != nil {
        return nil, fmt.Errorf("UserRepository.FindByID: %w", err)
    }
    return toUser(&g), nil
}

func (r *gormUserRepository) FindByEmail(ctx context.Context, email string) (*User, error) {
    var g gormUser
    err := r.db.WithContext(ctx).Where("email = ?", email).First(&g).Error
    if errors.Is(err, gorm.ErrRecordNotFound) {
        return nil, nil
    }
    if err != nil {
        return nil, fmt.Errorf("UserRepository.FindByEmail: %w", err)
    }
    return toUser(&g), nil
}

func (r *gormUserRepository) FindAll(ctx context.Context) ([]User, error) {
    var gs []gormUser
    if err := r.db.WithContext(ctx).Find(&gs).Error; err != nil {
        return nil, fmt.Errorf("UserRepository.FindAll: %w", err)
    }

    users := make([]User, len(gs))
    for i, g := range gs {
        g := g // Go 1.22 以前需要複製
        users[i] = *toUser(&g)
    }
    return users, nil
}

func (r *gormUserRepository) Update(ctx context.Context, id int64, input UpdateUserInput) (*User, error) {
    updates := map[string]interface{}{}
    if input.Name != nil {
        updates["name"] = *input.Name
    }
    if input.Age != nil {
        updates["age"] = *input.Age
    }

    if len(updates) == 0 {
        return r.FindByID(ctx, id) // 沒有需要更新的欄位，直接返回現有資料
    }

    result := r.db.WithContext(ctx).Model(&gormUser{}).Where("id = ?", id).Updates(updates)
    if result.Error != nil {
        return nil, fmt.Errorf("UserRepository.Update: %w", result.Error)
    }
    if result.RowsAffected == 0 {
        return nil, fmt.Errorf("UserRepository.Update: 找不到 id=%d", id)
    }

    return r.FindByID(ctx, id)
}

func (r *gormUserRepository) Delete(ctx context.Context, id int64) error {
    result := r.db.WithContext(ctx).Delete(&gormUser{}, id)
    if result.Error != nil {
        return fmt.Errorf("UserRepository.Delete: %w", result.Error)
    }
    if result.RowsAffected == 0 {
        return fmt.Errorf("UserRepository.Delete: 找不到 id=%d", id)
    }
    return nil
}
```

### 10-3 測試用 Mock Repository

```go
package repository_test

import (
    "context"
    "testing"

    "your-project/internal/repository"
)

// mockUserRepository 實作 UserRepository 介面，用於測試
type mockUserRepository struct {
    users  map[int64]*repository.User
    nextID int64
}

func newMockUserRepository() repository.UserRepository {
    return &mockUserRepository{
        users:  make(map[int64]*repository.User),
        nextID: 1,
    }
}

func (m *mockUserRepository) Create(ctx context.Context, input repository.CreateUserInput) (*repository.User, error) {
    u := &repository.User{
        ID:    m.nextID,
        Name:  input.Name,
        Email: input.Email,
        Age:   input.Age,
    }
    m.users[m.nextID] = u
    m.nextID++
    return u, nil
}

func (m *mockUserRepository) FindByID(ctx context.Context, id int64) (*repository.User, error) {
    u, ok := m.users[id]
    if !ok {
        return nil, nil
    }
    return u, nil
}

func (m *mockUserRepository) FindByEmail(ctx context.Context, email string) (*repository.User, error) {
    for _, u := range m.users {
        if u.Email == email {
            return u, nil
        }
    }
    return nil, nil
}

func (m *mockUserRepository) FindAll(ctx context.Context) ([]repository.User, error) {
    users := make([]repository.User, 0, len(m.users))
    for _, u := range m.users {
        users = append(users, *u)
    }
    return users, nil
}

func (m *mockUserRepository) Update(ctx context.Context, id int64, input repository.UpdateUserInput) (*repository.User, error) {
    u, ok := m.users[id]
    if !ok {
        return nil, nil
    }
    if input.Name != nil {
        u.Name = *input.Name
    }
    if input.Age != nil {
        u.Age = *input.Age
    }
    return u, nil
}

func (m *mockUserRepository) Delete(ctx context.Context, id int64) error {
    delete(m.users, id)
    return nil
}

// 測試使用 Mock
func TestUserService_Create(t *testing.T) {
    cases := []struct {
        name        string
        input       repository.CreateUserInput
        expectError bool
    }{
        {
            name:        "正常建立使用者",
            input:       repository.CreateUserInput{Name: "Alice", Email: "alice@example.com", Age: 30},
            expectError: false,
        },
    }

    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {
            repo := newMockUserRepository()
            ctx := context.Background()

            user, err := repo.Create(ctx, tc.input)

            if tc.expectError && err == nil {
                t.Error("預期有錯誤，但沒有")
            }
            if !tc.expectError && err != nil {
                t.Errorf("預期無錯誤，但得到：%v", err)
            }
            if user == nil && !tc.expectError {
                t.Error("預期有使用者，但得到 nil")
            }
            if user != nil && user.Name != tc.input.Name {
                t.Errorf("Name = %s，want %s", user.Name, tc.input.Name)
            }
        })
    }
}
```

---

## 11. 總結對照表

### 三大工具功能對照

| 功能 | database/sql | sqlx | GORM |
| :--- | :---: | :---: | :---: |
| 基本 CRUD | 手寫 SQL | 手寫 SQL | 自動產生 |
| 結果對應 struct | 手動 Scan | StructScan / Get / Select | 自動 |
| Named Parameters | 無 | `:name` 語法 | 無（用 `?`） |
| IN 查詢（slice） | 手動展開 | `sqlx.In` | 直接傳 slice |
| Transaction | `Begin / Commit / Rollback` | 同 database/sql | `db.Transaction` |
| 關聯查詢 | 手動 JOIN | 手動 JOIN | Preload / Joins |
| 自動建表 | 無 | 無 | AutoMigrate |
| 軟刪除 | 手動 | 手動 | 內建（DeletedAt） |

### 常見函數速查

| 操作 | database/sql | sqlx | GORM |
| :--- | :--- | :--- | :--- |
| 查多筆 | `db.QueryContext` | `db.SelectContext` | `db.Find` |
| 查單筆 | `db.QueryRowContext` | `db.GetContext` | `db.First` / `db.Take` |
| 執行 DML | `db.ExecContext` | `db.ExecContext` | `db.Create` / `db.Save` / `db.Delete` |
| 開始 TX | `db.BeginTx` | `db.BeginTxx` | `db.Begin` / `db.Transaction` |
| 原始 SQL | `db.QueryContext` | `db.QueryxContext` | `db.Raw` / `db.Exec` |

### 關鍵錯誤處理模式

| 場景 | 做法 |
| :--- | :--- |
| QueryRow 找不到資料 | 判斷 `err == sql.ErrNoRows` |
| GORM First 找不到資料 | 判斷 `errors.Is(err, gorm.ErrRecordNotFound)` |
| Transaction 安全寫法 | `defer tx.Rollback()` + 最後 `Commit` |
| rows 使用完畢 | `defer rows.Close()` + 結尾檢查 `rows.Err()` |
| GORM 更新零值欄位 | 使用 `Updates(map[string]interface{}{...})` |

### 效能最佳實踐

| 場景 | 建議 |
| :--- | :--- |
| 連線池設定 | `MaxOpenConns(25)`, `MaxIdleConns(10)`, `ConnMaxLifetime(5min)` |
| 同 SQL 重複執行 | 使用 Prepared Statement |
| 批次插入 | `db.Create(&slice)` 或 Prepared Statement 迴圈 |
| N+1 問題 | GORM Preload 或 JOIN |
| 只需部分欄位 | `db.Select("col1, col2")` |

[← 返回目錄](README.md)

文件更新日期：2026年6月1日
