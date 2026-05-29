# Go 常用設計模式

[← 返回目錄](README.md)

---

> 這份文件適合 Go 入門者閱讀，帶你認識在 Go 專案中最常見的設計模式。
> 每個模式都會說明「為什麼需要它」、「怎麼寫」，並附上完整可執行的範例。

---

## 目錄

1. [Functional Options（函數選項模式）](#1-functional-options函數選項模式)
2. [Builder 模式](#2-builder-模式)
3. [Pipeline 模式](#3-pipeline-模式)
4. [Fan-out / Fan-in 模式](#4-fan-out--fan-in-模式)
5. [Worker Pool 模式](#5-worker-pool-模式)
6. [單例模式（Singleton）](#6-單例模式singleton)
7. [選項模式 vs 配置 Struct 比較表](#7-選項模式-vs-配置-struct-比較表)
8. [錯誤處理模式](#8-錯誤處理模式)

---

## 1. Functional Options（函數選項模式）

### 問題：函數參數太多怎麼辦？

當你需要建立一個功能豐富的物件時，它可能有很多設定選項。
初學者最常遇到的問題就是：「我到底要怎麼傳這麼多參數？」

### 傳統做法的缺點

#### 做法一：參數爆炸

```go
// 問題：呼叫時根本記不住每個參數的意義
func NewServer(host string, port int, timeout int, maxConn int, tls bool) *Server {
    // ...
}

// 呼叫端一眼看不出這些數字代表什麼
server := NewServer("localhost", 8080, 30, 100, true)
```

#### 做法二：Config Struct（有改善，但仍有缺點）

```go
type ServerConfig struct {
    Host    string
    Port    int
    Timeout int
    MaxConn int
    TLS     bool
}

func NewServer(cfg ServerConfig) *Server {
    // ...
}

// 呼叫端稍微好讀，但每次都要建立完整的 struct
server := NewServer(ServerConfig{
    Host:    "localhost",
    Port:    8080,
    Timeout: 30,
    MaxConn: 100,
    TLS:     true,
})

// 問題：零值（zero value）陷阱 — 如果忘記設定 Port，它會是 0，不是你期望的預設值
// 另外，函式庫升級後若新增欄位，所有呼叫端都需要更新
```

### Functional Options 的完整實作

Functional Options 的核心概念：
- 定義一個「Server」結構（內有預設值）
- 定義一個函數型別 `Option`，它的職責是「修改 Server 的設定」
- 每個設定項目包裝成一個回傳 `Option` 的函數

```go
package main

import (
    "fmt"
    "time"
)

// Server 結構（內部使用，設定集中在這）
type Server struct {
    host    string
    port    int
    timeout time.Duration
    maxConn int
    tls     bool
}

// Option 是一個函數型別，接受 *Server 並修改它
type Option func(*Server)

// 每個設定都包裝成一個函數
func WithHost(host string) Option {
    return func(s *Server) {
        s.host = host
    }
}

func WithPort(port int) Option {
    return func(s *Server) {
        s.port = port
    }
}

func WithTimeout(timeout time.Duration) Option {
    return func(s *Server) {
        s.timeout = timeout
    }
}

func WithMaxConn(maxConn int) Option {
    return func(s *Server) {
        s.maxConn = maxConn
    }
}

func WithTLS(tls bool) Option {
    return func(s *Server) {
        s.tls = tls
    }
}

// NewServer 設定預設值，再套用所有 Option
func NewServer(opts ...Option) *Server {
    // 先設定安全的預設值
    s := &Server{
        host:    "localhost",
        port:    8080,
        timeout: 30 * time.Second,
        maxConn: 100,
        tls:     false,
    }

    // 依序套用每個 Option（會覆蓋預設值）
    for _, opt := range opts {
        opt(s)
    }

    return s
}

func (s *Server) String() string {
    return fmt.Sprintf("Server{host:%s, port:%d, timeout:%v, maxConn:%d, tls:%v}",
        s.host, s.port, s.timeout, s.maxConn, s.tls)
}

func main() {
    // 使用預設值，完全不傳任何參數
    s1 := NewServer()
    fmt.Println("預設設定:", s1)

    // 只覆蓋需要的設定，其他保持預設
    s2 := NewServer(
        WithPort(9090),
        WithTLS(true),
        WithTimeout(60*time.Second),
    )
    fmt.Println("自訂設定:", s2)
}
```

執行結果：

```text
預設設定: Server{host:localhost, port:8080, timeout:30s, maxConn:100, tls:false}
自訂設定: Server{host:localhost, port:9090, timeout:1m0s, maxConn:100, tls:true}
```

### 實際應用：建立資料庫連線

```go
package main

import (
    "fmt"
    "time"
)

type DBConfig struct {
    dsn         string
    maxOpen     int
    maxIdle     int
    maxLifetime time.Duration
    debug       bool
}

type DBOption func(*DBConfig)

func WithDSN(dsn string) DBOption {
    return func(c *DBConfig) {
        c.dsn = dsn
    }
}

func WithMaxOpenConns(n int) DBOption {
    return func(c *DBConfig) {
        c.maxOpen = n
    }
}

func WithDebug() DBOption {
    return func(c *DBConfig) {
        c.debug = true
    }
}

func WithMaxLifetime(d time.Duration) DBOption {
    return func(c *DBConfig) {
        c.maxLifetime = d
    }
}

// DB 模擬資料庫連線物件
type DB struct {
    cfg *DBConfig
}

func NewDB(opts ...DBOption) (*DB, error) {
    cfg := &DBConfig{
        dsn:         "root:password@tcp(localhost:3306)/mydb",
        maxOpen:     25,
        maxIdle:     5,
        maxLifetime: 5 * time.Minute,
        debug:       false,
    }

    for _, opt := range opts {
        opt(cfg)
    }

    if cfg.dsn == "" {
        return nil, fmt.Errorf("DSN 不能為空")
    }

    fmt.Printf("連線到資料庫: %s (maxOpen=%d, debug=%v)\n",
        cfg.dsn, cfg.maxOpen, cfg.debug)

    return &DB{cfg: cfg}, nil
}

func main() {
    // 使用預設值
    db1, _ := NewDB()
    _ = db1

    // 自訂設定
    db2, err := NewDB(
        WithDSN("admin:secret@tcp(prod-db:3306)/production"),
        WithMaxOpenConns(50),
        WithDebug(),
        WithMaxLifetime(10*time.Minute),
    )
    if err != nil {
        fmt.Println("連線失敗:", err)
        return
    }
    _ = db2
}
```

---

## 2. Builder 模式

### 問題：複雜物件的逐步建構

有些物件的建構邏輯很複雜，甚至需要依照「步驟」來組裝。
Builder 模式讓你可以把建構邏輯拆開，一步一步設定，最後再「建置」出最終物件。

### Go 的 Builder 寫法（鏈式呼叫）

Go 的 Builder 慣例是每個設定方法都回傳 `*Builder` 自身，讓你可以連續呼叫（method chaining）。

```go
package main

import (
    "fmt"
    "strings"
)

// QueryBuilder 負責組裝 SQL 查詢
type QueryBuilder struct {
    table      string
    conditions []string
    columns    []string
    orderBy    string
    limit      int
    offset     int
}

// NewQueryBuilder 建立新的 Builder
func NewQueryBuilder(table string) *QueryBuilder {
    return &QueryBuilder{
        table:   table,
        columns: []string{"*"},
        limit:   -1, // -1 表示不限制
    }
}

// Select 設定要查詢的欄位
func (b *QueryBuilder) Select(columns ...string) *QueryBuilder {
    b.columns = columns
    return b
}

// Where 加入篩選條件
func (b *QueryBuilder) Where(condition string) *QueryBuilder {
    b.conditions = append(b.conditions, condition)
    return b
}

// OrderBy 設定排序
func (b *QueryBuilder) OrderBy(column string) *QueryBuilder {
    b.orderBy = column
    return b
}

// Limit 設定回傳筆數上限
func (b *QueryBuilder) Limit(n int) *QueryBuilder {
    b.limit = n
    return b
}

// Offset 設定從第幾筆開始
func (b *QueryBuilder) Offset(n int) *QueryBuilder {
    b.offset = n
    return b
}

// Build 組裝出最終的 SQL 字串
func (b *QueryBuilder) Build() string {
    var sb strings.Builder

    // SELECT
    sb.WriteString("SELECT ")
    sb.WriteString(strings.Join(b.columns, ", "))

    // FROM
    sb.WriteString(" FROM ")
    sb.WriteString(b.table)

    // WHERE
    if len(b.conditions) > 0 {
        sb.WriteString(" WHERE ")
        sb.WriteString(strings.Join(b.conditions, " AND "))
    }

    // ORDER BY
    if b.orderBy != "" {
        sb.WriteString(" ORDER BY ")
        sb.WriteString(b.orderBy)
    }

    // LIMIT
    if b.limit > 0 {
        sb.WriteString(fmt.Sprintf(" LIMIT %d", b.limit))
    }

    // OFFSET
    if b.offset > 0 {
        sb.WriteString(fmt.Sprintf(" OFFSET %d", b.offset))
    }

    return sb.String()
}

func main() {
    // 簡單查詢
    q1 := NewQueryBuilder("users").
        Build()
    fmt.Println("查詢1:", q1)

    // 複雜查詢（鏈式呼叫）
    q2 := NewQueryBuilder("orders").
        Select("id", "user_id", "total", "created_at").
        Where("status = 'paid'").
        Where("total > 1000").
        OrderBy("created_at DESC").
        Limit(20).
        Offset(40).
        Build()
    fmt.Println("查詢2:", q2)

    // 分頁查詢
    page := 3
    pageSize := 10
    q3 := NewQueryBuilder("products").
        Select("id", "name", "price").
        Where("category = 'electronics'").
        Where("stock > 0").
        Limit(pageSize).
        Offset((page - 1) * pageSize).
        Build()
    fmt.Println("查詢3:", q3)
}
```

執行結果：

```text
查詢1: SELECT * FROM users
查詢2: SELECT id, user_id, total, created_at FROM orders WHERE status = 'paid' AND total > 1000 ORDER BY created_at DESC LIMIT 20 OFFSET 40
查詢3: SELECT id, name, price FROM products WHERE category = 'electronics' AND stock > 0 LIMIT 10 OFFSET 20
```

---

## 3. Pipeline 模式

### 用 Channel 串接多個處理階段

Pipeline（管線）模式的概念跟 Linux 的 `|` 管道一樣：
上一個步驟的輸出，直接成為下一個步驟的輸入。

```text
資料來源 → [Stage 1] → [Stage 2] → [Stage 3] → 結果
            過濾        運算        收集
```

每個 stage 是一個函數：
- 接收一個 `<-chan T`（input channel）
- 回傳一個 `<-chan T`（output channel）
- 在一個 goroutine 裡處理資料，處理完就關閉 output channel

### 完整範例：讀取數字 → 過濾偶數 → 平方 → 收集

```go
package main

import "fmt"

// generate：產生數字，放入 channel（資料來源）
func generate(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out) // 送完資料後關閉 channel，通知下游
        for _, n := range nums {
            out <- n
        }
    }()
    return out
}

// filterEven：只保留偶數（Stage 1）
func filterEven(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in { // range channel 會等到 channel 關閉才結束
            if n%2 == 0 {
                out <- n
            }
        }
    }()
    return out
}

// square：計算平方（Stage 2）
func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            out <- n * n
        }
    }()
    return out
}

// addPrefix：加上前綴，轉換成字串（Stage 3）
func addPrefix(in <-chan int, prefix string) <-chan string {
    out := make(chan string)
    go func() {
        defer close(out)
        for n := range in {
            out <- fmt.Sprintf("%s%d", prefix, n)
        }
    }()
    return out
}

func main() {
    // 串接 Pipeline
    // 1. 產生 1~10
    nums := generate(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

    // 2. 過濾偶數：2, 4, 6, 8, 10
    evens := filterEven(nums)

    // 3. 計算平方：4, 16, 36, 64, 100
    squares := square(evens)

    // 4. 加前綴：result=4, result=16, ...
    results := addPrefix(squares, "result=")

    // 5. 收集結果（在 main goroutine 中讀取）
    fmt.Println("Pipeline 結果：")
    for r := range results {
        fmt.Println(" ", r)
    }
}
```

執行結果：

```text
Pipeline 結果：
  result=4
  result=16
  result=36
  result=64
  result=100
```

流程圖：

```text
generate(1~10)
    │
    ▼
filterEven → 只留 2,4,6,8,10
    │
    ▼
square     → 變成 4,16,36,64,100
    │
    ▼
addPrefix  → 變成 "result=4", ...
    │
    ▼
main 收集列印
```

---

## 4. Fan-out / Fan-in 模式

### Fan-out：一個輸入，多個 Worker 並行處理

當一個 stage 的處理很耗時，可以開多個 worker goroutine 同時處理同一個 input channel，這就是 Fan-out。

### Fan-in：多個 Channel 合併成一個

多個 worker 各自有輸出 channel，Fan-in 把它們合併回一個 channel，讓下游只需要讀一個地方。

```text
                   ┌─ Worker 1 ─┐
input channel ──▶  ├─ Worker 2 ─┼──▶ merged output channel
                   └─ Worker 3 ─┘
      Fan-out                        Fan-in
```

### 完整範例

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

// 模擬耗時的任務：計算數字的平方（假裝很慢）
func slowSquare(id int, in <-chan int) <-chan string {
    out := make(chan string)
    go func() {
        defer close(out)
        for n := range in {
            time.Sleep(100 * time.Millisecond) // 模擬耗時
            result := fmt.Sprintf("[Worker %d] %d^2 = %d", id, n, n*n)
            out <- result
        }
    }()
    return out
}

// merge（Fan-in）：把多個 channel 合併成一個
func merge(channels ...<-chan string) <-chan string {
    var wg sync.WaitGroup
    merged := make(chan string)

    // 為每個 input channel 啟動一個 goroutine 把資料轉發到 merged
    output := func(c <-chan string) {
        defer wg.Done()
        for v := range c {
            merged <- v
        }
    }

    wg.Add(len(channels))
    for _, c := range channels {
        go output(c)
    }

    // 等所有 input channel 都讀完後，關閉 merged channel
    go func() {
        wg.Wait()
        close(merged)
    }()

    return merged
}

func main() {
    // 產生任務
    jobs := make(chan int)
    go func() {
        defer close(jobs)
        for i := 1; i <= 9; i++ {
            jobs <- i
        }
    }()

    // Fan-out：開 3 個 worker 並行處理
    numWorkers := 3
    workerChannels := make([]<-chan string, numWorkers)
    for i := 0; i < numWorkers; i++ {
        workerChannels[i] = slowSquare(i+1, jobs)
    }

    // Fan-in：合併 3 個 worker 的輸出
    results := merge(workerChannels...)

    // 收集結果
    start := time.Now()
    fmt.Println("開始處理（3 個 worker 並行）...")
    for r := range results {
        fmt.Println(" ", r)
    }
    fmt.Printf("總耗時：%v（若單一 worker 需 ~900ms）\n", time.Since(start).Round(time.Millisecond))
}
```

執行結果（順序可能不同，因為是並行的）：

```text
開始處理（3 個 worker 並行）...
  [Worker 2] 2^2 = 4
  [Worker 1] 1^2 = 1
  [Worker 3] 3^2 = 9
  [Worker 1] 4^2 = 16
  [Worker 2] 5^2 = 25
  [Worker 3] 6^2 = 36
  ...
總耗時：~300ms（若單一 worker 需 ~900ms）
```

Fan-out / Fan-in 的效益：

```text
單一 Worker：
任務1 → 任務2 → 任務3 → ... → 任務9
耗時：9 × 100ms = 900ms

3 個 Worker（Fan-out）：
Worker1: 任務1 → 任務4 → 任務7
Worker2: 任務2 → 任務5 → 任務8
Worker3: 任務3 → 任務6 → 任務9
耗時：3 × 100ms ≈ 300ms（快了 3 倍）
```

---

## 5. Worker Pool 模式

### 限制同時執行的 Goroutine 數量

Fan-out 的問題：如果有 10,000 個任務，你不會想開 10,000 個 goroutine。
Worker Pool 的解法：事先建立固定數量的 worker，讓他們輪流從 jobs channel 取任務。

```text
jobs channel ──▶ Worker 1 ──▶ results channel
             ──▶ Worker 2 ──▶
             ──▶ Worker 3 ──▶
             （固定 N 個 worker）
```

### 完整實作

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

// Job 代表一個任務
type Job struct {
    ID    int
    Value int
}

// Result 代表任務的執行結果
type Result struct {
    JobID  int
    Output int
    Worker int
}

// worker：從 jobs 取任務，把結果送到 results
func worker(id int, jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
    defer wg.Done()
    for job := range jobs {
        // 模擬耗時工作
        time.Sleep(50 * time.Millisecond)
        result := Result{
            JobID:  job.ID,
            Output: job.Value * job.Value,
            Worker: id,
        }
        results <- result
    }
}

func main() {
    const numJobs = 20
    const numWorkers = 4

    jobs := make(chan Job, numJobs)
    results := make(chan Result, numJobs)

    // 啟動固定數量的 worker
    var wg sync.WaitGroup
    for i := 1; i <= numWorkers; i++ {
        wg.Add(1)
        go worker(i, jobs, results, &wg)
    }

    // 送入任務
    for i := 1; i <= numJobs; i++ {
        jobs <- Job{ID: i, Value: i}
    }
    close(jobs) // 送完後關閉，worker 會在讀完後自動結束

    // 等所有 worker 完成後，關閉 results channel
    go func() {
        wg.Wait()
        close(results)
    }()

    // 收集結果
    start := time.Now()
    fmt.Printf("使用 %d 個 worker 處理 %d 個任務\n", numWorkers, numJobs)
    for r := range results {
        fmt.Printf("  任務 %2d → 結果 %3d（Worker %d）\n", r.JobID, r.Output, r.Worker)
    }
    fmt.Printf("完成！耗時：%v\n", time.Since(start).Round(time.Millisecond))
}
```

### 動態調整 Worker 數量

你可以根據任務量或系統資源動態決定 worker 數量：

```go
package main

import (
    "fmt"
    "runtime"
)

func optimalWorkers(numJobs int) int {
    cpus := runtime.NumCPU()

    // 策略：CPU 密集型任務 → worker 數 = CPU 核心數
    //        I/O 密集型任務 → worker 數可以更多（例如 CPU * 4）

    // 這裡示範 I/O 密集型的建議
    suggested := cpus * 4

    // 不超過任務總數（開比任務更多的 worker 沒有意義）
    if suggested > numJobs {
        return numJobs
    }

    return suggested
}

func main() {
    tasks := 100
    workers := optimalWorkers(tasks)
    fmt.Printf("CPU 核心數：%d\n", runtime.NumCPU())
    fmt.Printf("建議 Worker 數（I/O 密集）：%d\n", workers)
}
```

---

## 6. 單例模式（Singleton）

### 用 sync.Once 實現執行緒安全的單例

單例模式確保某個物件在程式執行期間只會被建立一次。
在 Go 裡，最安全的做法是使用 `sync.Once`。

### 範例：全域設定

```go
package main

import (
    "fmt"
    "sync"
)

// AppConfig 全域設定
type AppConfig struct {
    AppName    string
    Version    string
    DebugMode  bool
    MaxWorkers int
}

var (
    instance *AppConfig
    once     sync.Once
)

// GetConfig 回傳唯一的設定實例
// 第一次呼叫時初始化，之後每次都回傳同一個實例
func GetConfig() *AppConfig {
    once.Do(func() {
        fmt.Println("（初始化設定，只會執行一次）")
        instance = &AppConfig{
            AppName:    "MyApp",
            Version:    "1.0.0",
            DebugMode:  false,
            MaxWorkers: 10,
        }
    })
    return instance
}

func main() {
    var wg sync.WaitGroup

    // 模擬多個 goroutine 同時取得設定（只會初始化一次）
    for i := 0; i < 5; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            cfg := GetConfig()
            fmt.Printf("goroutine %d 取得設定：%s v%s\n",
                id, cfg.AppName, cfg.Version)
        }(i)
    }

    wg.Wait()
}
```

執行結果：

```text
（初始化設定，只會執行一次）
goroutine 2 取得設定：MyApp v1.0.0
goroutine 0 取得設定：MyApp v1.0.0
goroutine 1 取得設定：MyApp v1.0.0
goroutine 3 取得設定：MyApp v1.0.0
goroutine 4 取得設定：MyApp v1.0.0
```

### 範例：資料庫連線池

```go
package main

import (
    "fmt"
    "sync"
)

// DBPool 模擬資料庫連線池
type DBPool struct {
    dsn      string
    maxConns int
}

func (p *DBPool) Query(sql string) string {
    return fmt.Sprintf("[DB:%s] 執行: %s", p.dsn, sql)
}

var (
    dbPool     *DBPool
    dbPoolOnce sync.Once
)

func GetDBPool() *DBPool {
    dbPoolOnce.Do(func() {
        fmt.Println("建立資料庫連線池（只建立一次）")
        dbPool = &DBPool{
            dsn:      "postgres://localhost/mydb",
            maxConns: 20,
        }
    })
    return dbPool
}

func main() {
    // 不管在哪裡呼叫，都是同一個連線池
    pool1 := GetDBPool()
    pool2 := GetDBPool()
    pool3 := GetDBPool()

    fmt.Println("pool1 == pool2:", pool1 == pool2) // true
    fmt.Println("pool2 == pool3:", pool2 == pool3) // true

    fmt.Println(pool1.Query("SELECT * FROM users"))
}
```

注意事項：

```text
sync.Once 的保證：
  - once.Do(f) 確保函數 f 在整個程式生命週期中只被執行一次
  - 即使同時有 1000 個 goroutine 呼叫 GetConfig()，初始化也只發生一次
  - 其他 goroutine 會等到初始化完成才繼續（不會拿到未初始化的值）
```

---

## 7. 選項模式 vs 配置 Struct 比較表

| 比較項目 | 參數爆炸 | Config Struct | Functional Options |
|---------|---------|--------------|-------------------|
| 程式碼可讀性 | 差（靠位置辨識） | 中（靠欄位名稱） | 佳（語意清楚） |
| 預設值處理 | 需要手動判斷零值 | 零值陷阱 | 建構子直接設定預設值 |
| 向後相容性 | 新增參數會破壞 API | 新增欄位影響較小 | 完全向後相容 |
| 選填參數 | 需要多個函數重載 | 用零值判斷（易出錯） | 自然支援 |
| 文件友善度 | 需要靠文件說明 | 欄位名稱即文件 | 函數名稱即文件 |
| 適合場景 | 參數少（1~3 個） | 設定多且固定 | 設定多且需要彈性 |

建議選擇原則：

```text
參數 ≤ 3 個，且都是必填  →  直接傳參數
參數多，但都是必填       →  Config Struct
參數多，且很多是選填     →  Functional Options（推薦）
需要向外部函式庫暴露 API →  Functional Options（最佳實踐）
```

---

## 8. 錯誤處理模式

Go 的錯誤處理是初學者最常覺得「囉嗦」的部分，但它背後有一套清晰的模式。

### Sentinel Error（哨兵錯誤）

哨兵錯誤是預先定義好的特定錯誤值，讓呼叫端可以直接比對。

```go
package main

import (
    "errors"
    "fmt"
)

// 在 package 層級宣告哨兵錯誤（慣例：以 Err 開頭）
var (
    ErrNotFound      = errors.New("找不到資料")
    ErrUnauthorized  = errors.New("未授權")
    ErrInvalidInput  = errors.New("輸入資料無效")
)

func findUser(id int) (string, error) {
    if id <= 0 {
        return "", ErrInvalidInput
    }
    if id > 100 {
        return "", ErrNotFound
    }
    return fmt.Sprintf("User_%d", id), nil
}

func main() {
    // 使用 errors.Is 比對哨兵錯誤
    _, err := findUser(999)
    if errors.Is(err, ErrNotFound) {
        fmt.Println("處理找不到的情況：", err)
    }

    _, err = findUser(-1)
    if errors.Is(err, ErrInvalidInput) {
        fmt.Println("處理輸入無效的情況：", err)
    }

    name, err := findUser(42)
    if err == nil {
        fmt.Println("找到使用者：", name)
    }
}
```

### 自訂 Error 型別（實作 error interface）

當你需要在錯誤中附帶額外資訊時，可以自訂 error 型別。

```go
package main

import (
    "errors"
    "fmt"
)

// ValidationError 帶有欄位名稱和訊息的驗證錯誤
type ValidationError struct {
    Field   string
    Message string
}

// 實作 error interface（只需要 Error() string 方法）
func (e *ValidationError) Error() string {
    return fmt.Sprintf("驗證失敗：欄位 [%s] %s", e.Field, e.Message)
}

// NotFoundError 帶有資源類型和 ID 的找不到錯誤
type NotFoundError struct {
    Resource string
    ID       int
}

func (e *NotFoundError) Error() string {
    return fmt.Sprintf("%s（ID=%d）不存在", e.Resource, e.ID)
}

func validateAge(age int) error {
    if age < 0 {
        return &ValidationError{Field: "age", Message: "不能為負數"}
    }
    if age > 150 {
        return &ValidationError{Field: "age", Message: "超過合理範圍"}
    }
    return nil
}

func getProduct(id int) (string, error) {
    if id != 42 {
        return "", &NotFoundError{Resource: "Product", ID: id}
    }
    return "Go 程式設計書", nil
}

func main() {
    // 使用 errors.As 取得自訂錯誤型別（可以讀取額外資訊）
    err := validateAge(-5)
    var valErr *ValidationError
    if errors.As(err, &valErr) {
        fmt.Printf("欄位 '%s' 有問題：%s\n", valErr.Field, valErr.Message)
    }

    _, err = getProduct(99)
    var notFound *NotFoundError
    if errors.As(err, &notFound) {
        fmt.Printf("資源 '%s' ID=%d 找不到，請確認後再試\n",
            notFound.Resource, notFound.ID)
    }
}
```

### 錯誤包裝（%w）與解包（errors.Is / errors.As）

在函數中傳遞錯誤時，建議加上上下文資訊再往上傳：

```go
package main

import (
    "errors"
    "fmt"
)

var ErrDatabase = errors.New("資料庫錯誤")

// 模擬底層資料庫操作
func queryDB(userID int) error {
    if userID == 0 {
        return ErrDatabase
    }
    return nil
}

// 中間層：加上上下文後包裝錯誤
func getUserData(userID int) error {
    err := queryDB(userID)
    if err != nil {
        // %w 包裝錯誤（保留原始錯誤，讓上層可以 errors.Is / errors.As）
        return fmt.Errorf("getUserData（userID=%d）失敗：%w", userID, err)
    }
    return nil
}

// 最上層
func handleRequest(userID int) error {
    err := getUserData(userID)
    if err != nil {
        return fmt.Errorf("handleRequest 失敗：%w", err)
    }
    return nil
}

func main() {
    err := handleRequest(0)
    if err != nil {
        fmt.Println("錯誤訊息（含完整鏈路）：")
        fmt.Println(" ", err)
        fmt.Println()

        // errors.Is 可以穿透包裝，找到原始錯誤
        if errors.Is(err, ErrDatabase) {
            fmt.Println("確認是資料庫錯誤，執行重試邏輯...")
        }
    }
}
```

執行結果：

```text
錯誤訊息（含完整鏈路）：
  handleRequest 失敗：getUserData（userID=0）失敗：資料庫錯誤

確認是資料庫錯誤，執行重試邏輯...
```

錯誤處理的比較：

```text
errors.Is(err, target)  → 比對「是不是這個錯誤」（包含包裝後的版本）
errors.As(err, &target) → 把錯誤轉成特定型別（取得額外資訊）
fmt.Errorf("...: %w", err) → 包裝錯誤（加上下文，但保留原始錯誤）
fmt.Errorf("...: %v", err) → 格式化錯誤（加上下文，但不可解包）
```

### 何時 panic、何時 error

這是 Go 初學者很常問的問題：

```go
package main

import "fmt"

// 適合用 panic 的情況：
// 1. 程式設計錯誤（不是執行時會遇到的問題）
// 2. 初始化失敗且無法繼續（例如：必要的設定檔不存在）

func mustGetConfig(key string) string {
    configs := map[string]string{
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
    }
    val, ok := configs[key]
    if !ok {
        // 這是程式設計錯誤：呼叫端傳入了不存在的 key
        // 用 panic 讓問題在開發期間就被發現
        panic(fmt.Sprintf("設定 key 不存在：%s", key))
    }
    return val
}

// 適合用 error 的情況：
// 1. 外部輸入問題（使用者輸入錯誤、網路失敗、檔案不存在）
// 2. 預期內可能失敗的操作

func readFile(path string) ([]byte, error) {
    // 檔案不存在是「可能發生的情況」，用 error 回傳讓呼叫端處理
    return nil, fmt.Errorf("找不到檔案：%s", path)
}

func main() {
    // 正確使用 mustGetConfig
    host := mustGetConfig("DB_HOST")
    fmt.Println("DB Host:", host)

    // 讀取檔案失敗是正常情況，用 error 處理
    _, err := readFile("/etc/config.json")
    if err != nil {
        fmt.Println("讀取失敗（預期內）：", err)
    }
}
```

何時該用哪個的決策樹：

```text
這個錯誤是「使用者/外部輸入」造成的嗎？
  ├─ 是 → 用 error（例如：檔案不存在、網路逾時、輸入格式錯誤）
  └─ 否 → 是「程式邏輯本身的 bug」嗎？
              ├─ 是 → 用 panic（例如：index out of range、nil pointer）
              └─ 否 → 是「初始化必要資源失敗」嗎？
                          ├─ 是 → 可以用 panic 或 log.Fatal
                          └─ 否 → 用 error

原則：
  panic 是給「開發者看的」，代表程式本身有問題
  error 是給「呼叫端處理的」，代表這種情況是預期內的
```

---

## 總結

| 模式 | 解決的問題 | 核心機制 |
|------|-----------|---------|
| Functional Options | 參數過多、選填參數 | 函數型別 + 閉包 |
| Builder | 複雜物件的分步建構 | 鏈式呼叫（回傳 self） |
| Pipeline | 串聯多個處理步驟 | Channel + Goroutine |
| Fan-out / Fan-in | 並行加速 + 結果合併 | 多 worker + sync.WaitGroup |
| Worker Pool | 控制並行數量 | 固定 goroutine + jobs channel |
| Singleton | 全域唯一實例 | sync.Once |
| Sentinel Error | 可比對的特定錯誤 | errors.New + errors.Is |
| 自訂 Error | 錯誤帶附加資訊 | 實作 error interface + errors.As |

學習建議：不需要一次全部記住。先從 Functional Options 和 Pipeline 開始，
這兩個在 Go 的日常開發中最常見。其他模式在你遇到對應問題時再回來查閱就好。

---

[← 返回目錄](README.md)


---

---

[← 返回目錄](README.md)

文件更新日期：2026年5月29日
