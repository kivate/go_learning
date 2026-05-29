# Go 併發控制深度指南：Channel 阻塞機制與 sync 套件

[← 返回目錄](README.md)

---

這份文件針對已了解 `go` 關鍵字基本用法的入門者，深入解說 Go 併發的兩大核心：
**Channel 的阻塞機制** 與 **sync 套件的鎖與同步工具**。

---

## 1. 為什麼需要併發控制？

先從一個問題開始：

```go
count := 0

for i := 0; i < 1000; i++ {
    go func() {
        count++ // 1000 個 goroutine 同時執行這行
    }()
}

time.Sleep(time.Second)
fmt.Println(count) // 你以為是 1000，實際上不固定，可能是 800、943、甚至更少
```

**為什麼結果不是 1000？**

`count++` 看起來是一行，但 CPU 實際執行分成三步：

```text
1. 讀取 count 的值（假設是 5）
2. 加 1，得到 6
3. 把 6 寫回 count

問題：兩個 goroutine 同時執行時：

goroutine A：讀取 count = 5
goroutine B：讀取 count = 5（同時讀，還沒等 A 寫回）
goroutine A：寫回 count = 6
goroutine B：寫回 count = 6（覆蓋了 A 的結果！）

本來應該是 7，結果卻是 6，少加了一次。
```

這就是 **Race Condition（競態條件）**，是多執行緒程式最常見的 bug。

解決方案有兩種方向：
- **Channel**：用通訊代替共享，一次只有一方持有資料
- **sync 套件**：用鎖明確控制「同一時間只有一個人能進入」

---

## 2. Channel 的阻塞機制

### 2-1. 阻塞是什麼？

**阻塞（Block）** 的意思是：Goroutine 暫停執行，等待某個條件成立，才繼續往下走。

Channel 的阻塞規則：

```text
無緩衝 Channel：
  發送（ch <- val）→ 阻塞，直到有人接收
  接收（<-ch）     → 阻塞，直到有人發送

有緩衝 Channel：
  發送（ch <- val）→ 緩衝未滿時不阻塞，緩衝滿時阻塞
  接收（<-ch）     → 緩衝不為空時不阻塞，緩衝空時阻塞

已關閉 Channel：
  接收（<-ch）     → 立即回傳零值，不阻塞
  發送（ch <- val）→ 立即 panic
```

---

### 2-2. 無緩衝 Channel：強制同步

無緩衝 Channel 像一個「直接交接」的傳遞點，發送方和接收方必須**同時到達**，才能完成交接：

```go
ch := make(chan string)

go func() {
    fmt.Println("goroutine：準備發送")
    ch <- "資料"              // 阻塞，等待 main 來接
    fmt.Println("goroutine：發送完畢")
}()

time.Sleep(500 * time.Millisecond)
fmt.Println("main：準備接收")
msg := <-ch                   // 解除 goroutine 的阻塞
fmt.Println("main：收到", msg)

// 輸出（順序固定）：
// goroutine：準備發送
// main：準備接收
// goroutine：發送完畢
// main：收到 資料
```

```text
時間軸：

goroutine   ──發送──→ [阻塞等待] ──────────────────→ 發送完畢
                            ↕ 交接點
main        ────────────────────────→ 接收 ──→ 繼續執行
```

**用途**：當你需要確保「A 完成後 B 才繼續」的同步點。

---

### 2-3. 有緩衝 Channel：非同步緩衝區

有緩衝 Channel 像一個「傳送帶」，發送方把東西放上去就走，接收方自行來取：

```go
ch := make(chan int, 3) // 緩衝大小 3

// 發送三次，完全不阻塞（因為緩衝夠用）
ch <- 1
ch <- 2
ch <- 3

fmt.Println("三筆資料已放入緩衝")

// 此時 ch <- 4 會阻塞，因為緩衝滿了

// 接收（FIFO 順序）
fmt.Println(<-ch) // 1
fmt.Println(<-ch) // 2
fmt.Println(<-ch) // 3
```

```text
緩衝狀態示意：

ch <- 1 → [1][ ][ ]   len=1, cap=3
ch <- 2 → [1][2][ ]   len=2, cap=3
ch <- 3 → [1][2][3]   len=3, cap=3  ← 滿了，再發送就阻塞
<-ch    → [2][3][ ]   len=2, cap=3
<-ch    → [3][ ][ ]   len=1, cap=3
<-ch    → [ ][ ][ ]   len=0, cap=3  ← 空了，再接收就阻塞
```

**用途**：生產者消費者模式，控制流量、削峰填谷。

---

### 2-4. 用 Channel 解決 Race Condition

回到最開始的 count++ 問題，用 Channel 改寫：

```go
// 方法：用一個專責 goroutine 統一管理 count，其他 goroutine 只能透過 channel 操作它
func main() {
    ch := make(chan int)
    done := make(chan struct{})

    // 統一管理 count 的 goroutine
    go func() {
        count := 0
        for range ch {   // 每收到一個訊號就加一
            count++
        }
        fmt.Println(count) // channel 關閉後印出結果
        close(done)
    }()

    // 啟動 1000 個 goroutine，各自發送一個訊號
    var wg sync.WaitGroup
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            ch <- 1 // 發送訊號，不直接修改 count
        }()
    }

    wg.Wait()  // 等 1000 個 goroutine 都發送完
    close(ch)  // 關閉 channel，通知統計 goroutine 結束
    <-done     // 等待結果印出
}
// 輸出：1000（永遠正確）
```

---

### 2-5. select 的阻塞行為

`select` 等待**多個** channel，哪個先就緒就執行哪個：

```go
ch1 := make(chan string)
ch2 := make(chan string)

go func() {
    time.Sleep(200 * time.Millisecond)
    ch1 <- "來自 ch1"
}()
go func() {
    time.Sleep(100 * time.Millisecond)
    ch2 <- "來自 ch2"
}()

select {
case msg := <-ch1:
    fmt.Println(msg)
case msg := <-ch2:
    fmt.Println(msg) // ch2 先就緒，執行這個
}
// 輸出：來自 ch2
```

**`default`：讓 select 不阻塞**

```go
select {
case msg := <-ch:
    fmt.Println("有資料：", msg)
default:
    fmt.Println("沒有資料，繼續執行") // 沒有 channel 就緒時立即執行這個
}
```

**`time.After`：加入超時機制**

```go
select {
case msg := <-ch:
    fmt.Println("收到：", msg)
case <-time.After(3 * time.Second):
    fmt.Println("等超過 3 秒，放棄")
}
```

---

### 2-6. Deadlock：所有 Goroutine 都在等待

當所有 goroutine 都在阻塞等待，沒有任何一個能繼續執行，就會發生 **Deadlock（死鎖）**：

```go
// 案例一：只有發送，沒有接收
ch := make(chan int)
ch <- 1 // 永遠阻塞，main 被卡住，程式死鎖
// fatal error: all goroutines are asleep - deadlock!

// 案例二：互相等待
ch1 := make(chan int)
ch2 := make(chan int)

go func() {
    <-ch1      // 等 ch1
    ch2 <- 1   // 才發送 ch2
}()

<-ch2          // main 等 ch2，但 goroutine 在等 ch1，沒人送 ch1
// 死鎖！

// 案例三：nil channel 永遠阻塞
var ch chan int
ch <- 1   // 永遠阻塞
<-ch      // 永遠阻塞
```

**偵測死鎖**：Go runtime 會自動偵測並印出：

```text
fatal error: all goroutines are asleep - deadlock!

goroutine 1 [chan receive]:
main.main()
    /tmp/main.go:8 +0x28
```

---

## 3. sync 套件：鎖與同步工具

### 3-1. sync.Mutex：互斥鎖

`Mutex`（Mutual Exclusion，互斥）確保**同一時間只有一個 Goroutine** 能進入被保護的程式碼區塊。

```text
Mutex 的概念：

goroutine A  ──→ Lock() ──→ [進入] ──→ Unlock()
goroutine B  ──→ Lock() ──→ [阻塞，等 A 解鎖] ──→ [進入] ──→ Unlock()
goroutine C  ──→ Lock() ──→ [阻塞，等 B 解鎖] ──→ [進入] ──→ Unlock()
```

**解決 count++ 的 Race Condition：**

```go
var mu sync.Mutex
count := 0

var wg sync.WaitGroup
for i := 0; i < 1000; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()

        mu.Lock()   // 進入前加鎖，其他 goroutine 會在這裡阻塞
        count++     // 同一時間只有一個 goroutine 能執行這行
        mu.Unlock() // 解鎖，讓下一個 goroutine 進入
    }()
}

wg.Wait()
fmt.Println(count) // 永遠是 1000
```

**用 defer 確保解鎖：**

```go
func increment(mu *sync.Mutex, count *int) {
    mu.Lock()
    defer mu.Unlock() // 不管函數怎麼結束（含 panic），一定會解鎖
    *count++
}
```

**常見錯誤：忘記解鎖（死鎖）**

```go
mu.Lock()
if someCondition {
    return // 忘記 Unlock！下一個呼叫 Lock() 的 goroutine 永遠等待
}
mu.Unlock()

// 正確：用 defer，return 也會執行
mu.Lock()
defer mu.Unlock()
if someCondition {
    return // defer 會在 return 前執行 Unlock，安全
}
```

---

### 3-2. sync.RWMutex：讀寫鎖

`RWMutex` 比 `Mutex` 更細緻：允許**多個 goroutine 同時讀**，但**寫的時候獨佔**。

```text
RWMutex 規則：

讀鎖（RLock）：可以多個 goroutine 同時持有
寫鎖（Lock） ：獨佔，持有時其他讀鎖和寫鎖都阻塞

場景示意：
goroutine A  RLock ──→ [讀取] ──→ RUnlock
goroutine B  RLock ──→ [讀取] ──→ RUnlock  （A、B 可以同時讀）
goroutine C  Lock  ──→ [阻塞，等 A、B 讀完] ──→ [寫入] ──→ Unlock
goroutine D  RLock ──→ [阻塞，等 C 寫完]   ──→ [讀取] ──→ RUnlock
```

**適用場景：讀多寫少**

```go
type SafeCache struct {
    mu    sync.RWMutex
    cache map[string]string
}

// 讀取：用讀鎖，多個 goroutine 可同時讀
func (c *SafeCache) Get(key string) (string, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    val, ok := c.cache[key]
    return val, ok
}

// 寫入：用寫鎖，獨佔
func (c *SafeCache) Set(key, val string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.cache[key] = val
}
```

**Mutex vs RWMutex 選擇：**

| | `sync.Mutex` | `sync.RWMutex` |
| :--- | :--- | :--- |
| 讀取時 | 獨佔（其他全部等待） | 允許多個同時讀 |
| 寫入時 | 獨佔 | 獨佔 |
| 適用場景 | 讀寫頻率相近 | 讀遠多於寫（如快取） |
| 複雜度 | 簡單 | 稍高，用錯反而更慢 |

---

### 3-3. sync.WaitGroup：等待一組 Goroutine

`WaitGroup` 就像一個倒數計時器，等所有工作完成才繼續。

```text
WaitGroup 三個方法：

Add(n)  → 計數器 +n（啟動幾個 goroutine 就 Add 幾次）
Done()  → 計數器 -1（goroutine 完成時呼叫）
Wait()  → 阻塞，直到計數器歸零
```

```go
var wg sync.WaitGroup
results := make([]int, 5)

for i := 0; i < 5; i++ {
    wg.Add(1)
    go func(idx int) {
        defer wg.Done()
        results[idx] = idx * idx // 每個 goroutine 寫不同的 index，沒有競爭
    }(i)
}

wg.Wait() // 等所有 goroutine 完成
fmt.Println(results) // [0 1 4 9 16]
```

**搭配 Channel 收集結果：**

```go
func fetchAll(urls []string) []string {
    results := make(chan string, len(urls))
    var wg sync.WaitGroup

    for _, url := range urls {
        wg.Add(1)
        go func(u string) {
            defer wg.Done()
            // 模擬 HTTP 請求
            results <- "回應：" + u
        }(url)
    }

    // 等所有請求完成後關閉 channel
    go func() {
        wg.Wait()
        close(results)
    }()

    // 收集所有結果
    var all []string
    for r := range results {
        all = append(all, r)
    }
    return all
}
```

---

### 3-4. sync.Once：只執行一次

`Once` 確保某段程式碼**無論有多少個 goroutine 同時呼叫，只會執行一次**。

最常用於**單例模式（Singleton）**和**延遲初始化**：

```go
var (
    instance *Database
    once     sync.Once
)

func GetDatabase() *Database {
    once.Do(func() {
        // 這個 func 無論被呼叫幾次，只會執行一次
        fmt.Println("初始化資料庫連線...")
        instance = &Database{conn: connect()}
    })
    return instance
}

// 就算 100 個 goroutine 同時呼叫 GetDatabase()
// "初始化資料庫連線..." 只會印一次
for i := 0; i < 100; i++ {
    go GetDatabase()
}
```

```text
Once 的執行流程：

第 1 次呼叫 once.Do(f) → 執行 f
第 2 次呼叫 once.Do(f) → 直接跳過，不執行
第 3 次呼叫 once.Do(f) → 直接跳過，不執行
...

即使第 2、3 次的 f 和第 1 次不同，也不會執行。
```

---

### 3-5. sync.Map：併發安全的 Map

`sync.Map` 是執行緒安全版的 map，不需要手動加鎖，適合**讀多寫少**或**各 goroutine 讀寫不同 key** 的場景。

```go
var sm sync.Map

// 寫入（Store）
sm.Store("name", "Alice")
sm.Store("age", 30)

// 讀取（Load）
val, ok := sm.Load("name")
if ok {
    fmt.Println(val) // Alice
}

// 讀取，key 不存在時寫入預設值（LoadOrStore）
actual, loaded := sm.LoadOrStore("score", 100)
fmt.Println(actual, loaded) // 100 false（代表是新寫入的）

actual, loaded = sm.LoadOrStore("score", 999)
fmt.Println(actual, loaded) // 100 true（代表 key 已存在，回傳舊值）

// 刪除（Delete）
sm.Delete("age")

// 遍歷（Range）
sm.Range(func(key, value any) bool {
    fmt.Println(key, "=", value)
    return true // 回傳 false 會停止遍歷
})
```

---

### 3-5-1. 併發 Map 完整比較

Go 生態中共有五種常見的併發 Map 解法，適用不同場景。

#### 方案一：map + sync.Mutex

最基本、最通用的做法，任何讀寫都獨佔：

```go
type SafeMap struct {
    mu sync.Mutex
    m  map[string]int
}

func NewSafeMap() *SafeMap {
    return &SafeMap{m: make(map[string]int)}
}

func (s *SafeMap) Set(k string, v int) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.m[k] = v
}

func (s *SafeMap) Get(k string) (int, bool) {
    s.mu.Lock()
    defer s.mu.Unlock()
    v, ok := s.m[k]
    return v, ok
}
```

```text
優點：簡單、正確、支援所有操作（包含複合操作）
缺點：讀也需要鎖，高並發讀取時效能較低
適用：讀寫頻率相近、需要複合操作（check-then-act）
```

---

#### 方案二：map + sync.RWMutex

讀多寫少場景的最佳選擇，讀取可以並發：

```go
type RWSafeMap struct {
    mu sync.RWMutex
    m  map[string]int
}

func (s *RWSafeMap) Set(k string, v int) {
    s.mu.Lock()         // 寫：獨佔鎖
    defer s.mu.Unlock()
    s.m[k] = v
}

func (s *RWSafeMap) Get(k string) (int, bool) {
    s.mu.RLock()        // 讀：共享鎖，多個 goroutine 可同時讀
    defer s.mu.RUnlock()
    v, ok := s.m[k]
    return v, ok
}
```

```text
優點：讀取可並發，效能優於純 Mutex
缺點：有寫入時仍然全部阻塞；寫多時效能反而比 Mutex 差
適用：讀操作佔 80% 以上，例如設定檔快取、路由表
```

---

#### 方案三：sync.Map

Go 標準庫內建，不需要手動加鎖，內部用 **read/dirty 雙層結構** 優化讀取：

```go
var sm sync.Map

sm.Store("k", 1)
val, ok := sm.Load("k")
sm.Delete("k")
sm.LoadOrStore("k", 0)      // 存在就讀，不存在就寫
sm.LoadAndDelete("k")       // 讀取並刪除（Go 1.15+）
sm.Range(func(k, v any) bool {
    return true             // false 停止遍歷
})
```

```text
sync.Map 內部結構：

read map（atomic.Value）← 無鎖讀取，大多數讀操作在這裡完成
dirty map（加 Mutex）  ← 新 key 先寫這裡，累積夠多後提升到 read map

讀取流程：先查 read map（無鎖）→ 找不到才查 dirty map（加鎖）
寫入流程：寫到 dirty map（加鎖）
```

**sync.Map 的限制：**

```go
// 無法原子性地複合操作（先讀後寫不安全）
val, _ := sm.Load("count")
sm.Store("count", val.(int)+1) // 兩個操作之間可能被其他 goroutine 插入！

// 正確做法：用 LoadOrStore 或 map + Mutex 做複合操作
```

```text
優點：讀多寫少場景效能極好；不同 goroutine 寫不同 key 時競爭低
缺點：不支援原子複合操作；key 型別是 any，失去型別安全；遍歷不保證一致性
適用：讀極多寫極少、各 goroutine 固定寫自己的 key（如 goroutine-local 快取）
```

---

#### 方案四：分片鎖 Map（Sharded Map）

高並發寫入時，單一把鎖是瓶頸。分片鎖將 map 切割成 N 個獨立的分片，每個分片有自己的鎖，大幅降低競爭：

```go
const shardCount = 32

type ShardedMap struct {
    shards [shardCount]struct {
        sync.RWMutex
        m map[string]int
    }
}

func NewShardedMap() *ShardedMap {
    sm := &ShardedMap{}
    for i := range sm.shards {
        sm.shards[i].m = make(map[string]int)
    }
    return sm
}

// 用 key 的 hash 決定要操作哪個分片
func (s *ShardedMap) shard(key string) int {
    h := fnv.New32a()
    h.Write([]byte(key))
    return int(h.Sum32()) % shardCount
}

func (s *ShardedMap) Set(k string, v int) {
    idx := s.shard(k)
    s.shards[idx].Lock()
    defer s.shards[idx].Unlock()
    s.shards[idx].m[k] = v
}

func (s *ShardedMap) Get(k string) (int, bool) {
    idx := s.shard(k)
    s.shards[idx].RLock()
    defer s.shards[idx].RUnlock()
    v, ok := s.shards[idx].m[k]
    return v, ok
}
```

```text
分片鎖示意：

key "user:1"  → hash → 分片 7  → 鎖 7
key "user:2"  → hash → 分片 13 → 鎖 13  （與鎖 7 不衝突，可並發）
key "user:3"  → hash → 分片 7  → 鎖 7   （與 user:1 競爭同一把鎖）

32 個分片 ≈ 鎖競爭降低為 1/32
```

```text
優點：高並發寫入效能最佳，鎖競爭最低
缺點：遍歷所有 key 需要鎖所有分片（複雜）；實作較繁瑣
適用：大量 goroutine 高頻寫入，如計數器、session 管理
```

---

#### 方案五：Channel-based Map（單一擁有者）

讓一個專責 goroutine 統一管理 map，其他 goroutine 透過 channel 操作，徹底避免共享記憶體：

```go
type request struct {
    key    string
    val    int
    isSet  bool
    resp   chan int
}

func mapManager(req <-chan request) {
    m := make(map[string]int)
    for r := range req {
        if r.isSet {
            m[r.key] = r.val
        } else {
            r.resp <- m[r.key]
        }
    }
}

// 使用
reqCh := make(chan request, 100)
go mapManager(reqCh)

// 寫入
reqCh <- request{key: "a", val: 1, isSet: true}

// 讀取
resp := make(chan int, 1)
reqCh <- request{key: "a", resp: resp}
fmt.Println(<-resp)
```

```text
優點：完全無鎖，符合 Go「以通訊共享記憶體」的哲學
缺點：每次操作都有 channel 的 overhead；程式碼較複雜
適用：操作本身需要序列化（如事件驅動、queue 處理）
```

---

#### 五種方案總比較

| 方案 | 讀效能 | 寫效能 | 複合操作 | 型別安全 | 複雜度 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `map + Mutex` | 中 | 中 | 安全 | 是 | 低 |
| `map + RWMutex` | 高（並發讀） | 中 | 安全 | 是 | 低 |
| `sync.Map` | 極高（讀多寫少） | 低（寫多時差） | 不安全 | 否（any） | 低 |
| 分片鎖 | 高 | 極高 | 安全 | 是 | 高 |
| Channel-based | 低 | 低 | 安全（序列） | 是 | 高 |

**選擇決策樹：**

```text
需要複合操作（先讀後寫）？
  → 是：map + Mutex 或 map + RWMutex

不需要複合操作：
  讀 >> 寫（讀佔 80% 以上）？
    → 是：sync.Map 或 map + RWMutex

  高並發寫入（goroutine 數量龐大）？
    → 是：分片鎖 Map

  操作需要序列化（事件驅動）？
    → 是：Channel-based Map

  一般情況？
    → map + Mutex（最簡單正確）
```

---

### 3-6. sync.Cond：條件變數

`Cond` 讓 goroutine 在某個條件不成立時**休眠等待**，條件成立時被喚醒。適合「等待某個狀態改變」的場景。

```go
var mu sync.Mutex
cond := sync.NewCond(&mu)
ready := false

// 消費者：等待 ready 變成 true
go func() {
    mu.Lock()
    for !ready {          // 用 for 而非 if，避免虛假喚醒
        cond.Wait()       // 暫時釋放鎖並休眠，被喚醒後重新取得鎖
    }
    fmt.Println("消費者：收到通知，開始處理")
    mu.Unlock()
}()

// 生產者：準備好後通知消費者
time.Sleep(time.Second)
mu.Lock()
ready = true
cond.Signal()  // 喚醒一個等待的 goroutine
// cond.Broadcast() // 喚醒所有等待的 goroutine
mu.Unlock()
```

```text
Cond 的三個方法：

Wait()      → 釋放鎖 + 休眠，被喚醒後重新取鎖
Signal()    → 喚醒一個正在 Wait() 的 goroutine
Broadcast() → 喚醒所有正在 Wait() 的 goroutine
```

> **注意**：`Wait()` 必須搭配 `for` 迴圈判斷條件，不能用 `if`，因為 goroutine 被喚醒後條件不一定真的成立（虛假喚醒）。

---

### 3-7. atomic：不用鎖的原子操作

對於簡單的數值操作（加減、比較交換），可以用 `sync/atomic` 套件，比 Mutex 更輕量：

```go
import "sync/atomic"

var count int64 = 0

var wg sync.WaitGroup
for i := 0; i < 1000; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        atomic.AddInt64(&count, 1) // 原子加一，不需要 Mutex
    }()
}

wg.Wait()
fmt.Println(atomic.LoadInt64(&count)) // 1000
```

**常用 atomic 操作：**

```go
var n int64

atomic.AddInt64(&n, 1)          // n++
atomic.AddInt64(&n, -1)         // n--
atomic.LoadInt64(&n)            // 讀取 n（安全的讀）
atomic.StoreInt64(&n, 42)       // 寫入 n（安全的寫）
atomic.SwapInt64(&n, 99)        // 將 n 設為 99，回傳舊值
atomic.CompareAndSwapInt64(&n, 5, 10) // 若 n==5 則改為 10，回傳是否成功
```

**Mutex vs atomic 選擇：**

| | `sync.Mutex` | `sync/atomic` |
| :--- | :--- | :--- |
| 適用操作 | 任意複雜操作 | 單一數值的讀寫加減 |
| 效能 | 較慢（涉及 OS 排程） | 較快（CPU 指令級別） |
| 使用難度 | 簡單直觀 | 容易誤用（複合操作不安全） |

---

## 4. 綜合範例：Worker Pool 工作池

結合 Channel、WaitGroup、Mutex，實作一個「限制同時執行數量」的工作池：

```go
func workerPool(jobs []string, workerCount int) {
    jobCh := make(chan string, len(jobs))
    var wg sync.WaitGroup
    var mu sync.Mutex
    var results []string

    // 啟動固定數量的 worker
    for i := 0; i < workerCount; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            for job := range jobCh { // 持續從 channel 取工作，直到關閉
                result := process(job) // 處理工作

                mu.Lock()
                results = append(results, result) // 寫入共享結果，需要加鎖
                mu.Unlock()

                fmt.Printf("worker %d 完成：%s\n", id, job)
            }
        }(i)
    }

    // 把所有工作放入 channel
    for _, job := range jobs {
        jobCh <- job
    }
    close(jobCh) // 關閉 channel，worker 的 range 迴圈會自動結束

    wg.Wait() // 等所有 worker 完成
    fmt.Println("所有結果：", results)
}

func process(job string) string {
    time.Sleep(100 * time.Millisecond) // 模擬處理時間
    return "done:" + job
}

workerPool([]string{"A", "B", "C", "D", "E"}, 3)
```

```text
工作池執行示意（3 個 worker，5 個工作）：

jobCh：  [A][B][C][D][E]

worker 0  ──→ A ──→ D（A 完成後繼續取）
worker 1  ──→ B ──→ E（B 完成後繼續取）
worker 2  ──→ C ──→ （C 完成後 channel 空了，結束）

比起啟動 5 個 goroutine，只用 3 個限制了資源消耗。
```

---

## 5. 工具對照總表

| 工具 | 用途 | 關鍵方法 |
| :--- | :--- | :--- |
| **Channel（無緩衝）** | 同步傳遞，確保雙方都準備好 | `ch <- val` / `<-ch` |
| **Channel（有緩衝）** | 非同步緩衝，生產消費解耦 | `make(chan T, n)` |
| **select** | 同時監聽多個 channel | `case <-ch` / `default` |
| **sync.Mutex** | 保護任意共享資料，獨佔存取 | `Lock()` / `Unlock()` |
| **sync.RWMutex** | 讀多寫少場景，讀可並發 | `RLock()` / `Lock()` |
| **sync.WaitGroup** | 等待一組 goroutine 全部完成 | `Add()` / `Done()` / `Wait()` |
| **sync.Once** | 確保某段程式碼只執行一次 | `Do(f)` |
| **sync.Map** | 併發安全的 map | `Store()` / `Load()` / `Range()` |
| **sync.Cond** | 等待特定條件成立再執行 | `Wait()` / `Signal()` / `Broadcast()` |
| **sync/atomic** | 輕量的單一數值原子操作 | `AddInt64()` / `LoadInt64()` |

---

## 6. 選擇指南

```text
需要在 goroutine 之間傳遞資料？
  → Channel

需要保護共享變數？
  ├─ 只是簡單的數值加減？ → atomic
  ├─ 讀多寫少？          → sync.RWMutex
  └─ 一般情況？          → sync.Mutex

需要等待多個 goroutine 完成？
  → sync.WaitGroup

需要某段初始化只執行一次？
  → sync.Once

需要等待某個條件成立？
  → sync.Cond

需要限制同時執行的 goroutine 數量？
  → 有緩衝 Channel 當作信號量（Semaphore）
```

---

[← 返回目錄](README.md)


---

---

[← 返回目錄](README.md)

*文件更新日期：2026年5月28日*
