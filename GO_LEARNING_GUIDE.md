# Go (Golang) 入門指南：核心特性與基礎架構

[← 返回目錄](README.md)

---

這份文件旨在為 Go 語言初學者提供一個清晰的知識地圖。Go 是一門為了提高開發效率、系統效能以及多核心併發處理而設計的靜態語言。

---

## 1. Go 的設計哲學：為什麼它與眾不同？

*   **Less is More (少即是多)**：Go 故意去掉了許多複雜的特性（如：類別繼承、異常拋出、泛型在早期也沒有），讓程式碼更易於閱讀與維護。
*   **組合優於繼承**：透過 `struct` (結構體) 和 `interface` (介面) 的組合來達成程式碼復用，而非複雜的類別樹。
*   **原生支撐併發**：將併發視為語言的一等公民，透過 `Goroutine` 讓並行運算變得極其廉價且簡單。

---

## 2. 關鍵字地圖 (The 25 Keywords)

Go 只有 25 個關鍵字，記憶負擔極小：

| 類別 | 關鍵字 |
| :--- | :--- |
| **程式結構** | `package`, `import` |
| **宣告** | `var`, `const`, `func`, `type`, `struct`, `interface` |
| **流程控制** | `if`, `else`, `switch`, `case`, `default`, `for`, `range`, `break`, `continue`, `fallthrough`, `goto` |
| **函數返回** | `return` |
| **異步/延遲** | `go`, `select`, `chan`, `defer` |
| **其他** | `map` |

---

## 3. 核心程式結構與流程

### A. 程式進入點
每個 Go 專案的執行起點都是 `package main` 裡面的 `main` 函數。

```go
package main // 定義包名

import "fmt" // 引入標準庫

func main() {
    fmt.Println("Hello, Go!")
}
```

### B. 變數宣告 (Variable Declaration)
Go 提供兩種宣告方式：
1. `var name string = "Go"` (明確型別)
2. `name := "Go"` (簡短宣告，自動推斷型別，限函數內部使用)

---

### B-1. nil：Go 的「空值」

`nil` 是 Go 中特定型別的**零值（zero value）**，代表「這個變數目前沒有指向任何東西」。它不是關鍵字，而是一個預先宣告的識別字。

#### 哪些型別的零值是 nil

```go
var p   *int            // 指標，零值 = nil
var s   []int           // slice，零值 = nil
var m   map[string]int  // map，零值 = nil
var f   func()          // 函數，零值 = nil
var ch  chan int         // channel，零值 = nil
var i   interface{}     // interface，零值 = nil
```

> `int`、`bool`、`string`、`struct` 的零值**不是** nil，分別是 `0`、`false`、`""`、空結構體。

#### nil 的行為：各型別不同

```go
// Pointer：nil 指標取值會 panic
var p *int
fmt.Println(p)  // <nil>（印出地址是 nil）
fmt.Println(*p) // panic: nil pointer dereference

// Slice：nil slice 可以 append，長度為 0
var s []int
fmt.Println(s == nil) // true
fmt.Println(len(s))   // 0
s = append(s, 1)      // 安全，不會 panic

// Map：nil map 可以讀（回傳零值），但不能寫
var m map[string]int
fmt.Println(m["key"]) // 0（回傳零值，不 panic）
m["key"] = 1          // panic: assignment to entry in nil map

// Channel：nil channel 永遠阻塞
var ch chan int
ch <- 1   // 永遠阻塞（不 panic，但會 deadlock）
<-ch      // 永遠阻塞

// Function：nil 函數呼叫會 panic
var f func()
f() // panic: runtime error: invalid memory address or nil pointer dereference

// Interface：只有當型別與值都是 nil 才等於 nil
var i interface{} = nil
fmt.Println(i == nil) // true

var p2 *int = nil
var i2 interface{} = p2
fmt.Println(i2 == nil) // false！型別已知（*int），只有值是 nil
```

#### nil 的比較

```go
var p *int
var s []int
var m map[string]int

fmt.Println(p == nil) // true
fmt.Println(s == nil) // true
fmt.Println(m == nil) // true

// slice 和 map 不能互相比較，只能和 nil 比較
// fmt.Println(s == s) // 編譯錯誤
```

#### interface nil 陷阱（常見 bug）

```go
func getError() error {
    var p *MyError = nil
    return p // 回傳的 error 介面不是 nil！
}

err := getError()
fmt.Println(err == nil) // false，因為介面包含型別資訊 (*MyError)
```

```text
介面的內部結構 = (型別, 值)

nil interface  → (nil,     nil)   → == nil 為 true
包含 nil 指標  → (*MyError, nil)  → == nil 為 false  ← 陷阱！
```

**正確做法**：若要回傳 nil error，直接回傳 `nil` 而非 nil 指標。

```go
func getError() error {
    // 有錯誤時
    if someCondition {
        return &MyError{msg: "出錯了"}
    }
    return nil // 直接回傳 nil，不要回傳 (*MyError)(nil)
}
```

#### 防禦性寫法：使用前先判斷 nil

```go
// Pointer
if p != nil {
    fmt.Println(*p)
}

// Map：使用前先初始化
if m == nil {
    m = make(map[string]int)
}
m["key"] = 1

// Slice：nil slice 可以直接 append，不需特別判斷
s = append(s, 1)

// Interface：判斷是否為 nil
if i == nil {
    fmt.Println("介面是空的")
}
```

---

### C. 唯一的迴圈：`for`
Go 沒有 `while`，所有迴圈邏輯都由 `for` 完成：

#### 1. 傳統三段式（類似 C 的 for）

```go
for i := 0; i < 5; i++ {
    fmt.Println(i) // 0, 1, 2, 3, 4
}
```

#### 2. 條件循環（類似 while）

```go
n := 0
for n < 5 {
    n++
}
```

#### 3. 無限迴圈

```go
for {
    // 永遠執行，直到 break 或 return
    if done {
        break
    }
}
```

#### 4. `range` 迭代（Array / Slice）

```go
nums := []int{10, 20, 30}
for index, value := range nums {
    fmt.Println(index, value) // 0 10, 1 20, 2 30
}

// 只要 index，忽略 value
for i := range nums { ... }

// 只要 value，忽略 index
for _, v := range nums { ... }
```

#### 5. `range` 迭代 Map

```go
m := map[string]int{"a": 1, "b": 2}
for key, val := range m {
    fmt.Println(key, val) // 順序不固定
}
```

#### 6. `range` 迭代 String（逐 rune）

```go
for i, ch := range "Hello" {
    fmt.Println(i, string(ch)) // 依 Unicode codepoint 拆分，非 byte
}
```

#### 7. `break` / `continue` 搭配標籤（跳出多層迴圈）

```go
outer:
for i := 0; i < 3; i++ {
    for j := 0; j < 3; j++ {
        if j == 1 {
            break outer // 直接跳出外層迴圈
        }
        fmt.Println(i, j)
    }
}
```

### D. 延遲執行：`defer`
`defer` 會將函數延後到「包含它的函數即將回傳前」才執行。常用於資源釋放（關閉檔案、鎖定解除）。
```go
file, _ := os.Open("test.txt")
defer file.Close() // 確保函數結束時檔案一定會關閉
```

#### 多個 `defer`：LIFO 堆疊順序

當函數中有多個 `defer`，執行順序為**後進先出（LIFO）**，像堆疊一樣。
```go
func main() {
    defer fmt.Println("1") // 最後執行
    defer fmt.Println("2")
    defer fmt.Println("3") // 最先執行
}
// 輸出：3, 2, 1
```

**實務應用**：多個資源的清理順序會自動符合「後開先關」的正確邏輯。
```go
func process() {
    mu.Lock()
    defer mu.Unlock()   // 第三個執行

    f, _ := os.Open("file.txt")
    defer f.Close()     // 第二個執行

    db.Begin()
    defer db.Rollback() // 第一個執行
}
```

#### `defer` 的值捕捉行為
`defer` 在**宣告當下**就捕捉參數值，而非執行時的值。若要取最新值，需使用閉包。
```go
x := 10
defer fmt.Println(x)          // 捕捉當下值，輸出 10
defer func() { fmt.Println(x) }() // 閉包取最新值，輸出 20
x = 20
```

> **注意**：在迴圈中大量使用 `defer` 會導致所有清理動作堆積到函數結束才執行，可能造成資源洩漏，建議改用匿名函數包裝或手動呼叫。

---

### E. 閉包 (Closure)

閉包是一個**函數 + 它所捕捉的外部變數**的組合。函數「記住」了它被定義時的環境，即使外部函數已經結束，被捕捉的變數仍然存活。

#### 1. 基本概念

```go
func counter() func() int {
    n := 0
    return func() int {
        n++ // 捕捉並修改外部的 n
        return n
    }
}

c := counter()
fmt.Println(c()) // 1
fmt.Println(c()) // 2
fmt.Println(c()) // 3

c2 := counter() // 全新的 n，與 c 互不干擾
fmt.Println(c2()) // 1
```

> 每次呼叫 `counter()` 都產生獨立的 `n`，彼此隔離。

#### 2. 工廠函數（用閉包產生帶狀態的函數）

```go
func multiplier(factor int) func(int) int {
    return func(x int) int {
        return x * factor // 捕捉 factor
    }
}

double := multiplier(2)
triple := multiplier(3)

fmt.Println(double(5)) // 10
fmt.Println(triple(5)) // 15
```

#### 3. 閉包捕捉的是「參考」不是「複製」

```go
x := 10
add := func(n int) int {
    return x + n // 捕捉 x 的參考
}

x = 20
fmt.Println(add(5)) // 25，不是 15，因為取的是最新的 x
```

#### 4. 迴圈閉包陷阱

**為什麼會出錯？**

`for` 迴圈中宣告的 `i` 在整個迴圈只有**一個記憶體位址**。閉包捕捉的是這個位址的**參考**，而不是當下的值。等到閉包真正被呼叫時，迴圈早已跑完，`i` 的值停在最後一次迭代。

```text
迴圈執行時（只定義，不呼叫）：

  i=0 → funcs[0] 的閉包記住「i 的位址」
  i=1 → funcs[1] 的閉包記住「i 的位址」（同一個）
  i=2 → funcs[2] 的閉包記住「i 的位址」（同一個）
  i=3 → 迴圈結束，i 停在 3

呼叫 funcs[0]() → 去看 i 的位址 → 值是 3
呼叫 funcs[1]() → 去看 i 的位址 → 值是 3
呼叫 funcs[2]() → 去看 i 的位址 → 值是 3
```

##### 錯誤示範

```go
funcs := make([]func(), 3)

for i := 0; i < 3; i++ {
    funcs[i] = func() {
        fmt.Println(i) // 捕捉 i 的參考，不是當下的值
    }
}

funcs[0]() // 3（預期 0）
funcs[1]() // 3（預期 1）
funcs[2]() // 3（預期 2）
```

##### 解法一：用新變數遮蔽（最常見）

```go
for i := 0; i < 3; i++ {
    i := i // 在迴圈體內宣告新的 i，每次迭代產生獨立的記憶體位址
    funcs[i] = func() {
        fmt.Println(i) // 捕捉的是這個迴圈體內的 i，各自獨立
    }
}

funcs[0]() // 0
funcs[1]() // 1
funcs[2]() // 2
```

##### 解法二：透過函數參數傳值（最清楚）

```go
for i := 0; i < 3; i++ {
    funcs[i] = func(id int) func() { // 外層函數接收 id
        return func() {
            fmt.Println(id) // 捕捉的是 id 的值，已是獨立副本
        }
    }(i) // 立即呼叫，將當下的 i 傳入
}
```

##### 解法三：Go 1.22+ 迴圈變數語意修正

Go 1.22 起，`for` 迴圈的變數**每次迭代都是新的獨立變數**，舊的陷阱不再存在。

```go
// Go 1.22+ 以下行為正確，無需額外處理
for i := 0; i < 3; i++ {
    funcs[i] = func() {
        fmt.Println(i) // 輸出 0, 1, 2（Go 1.22+ 自動修正）
    }
}
```

> **實務建議**：若專案需相容 Go 1.21 以下，仍應使用解法一或解法二，養成習慣也能避免在 Goroutine 場景中出現同樣問題。

---

## 4. 併發核心：Goroutine & Channel

這是 Go 的靈魂所在。

### A. Goroutine 基本範例

#### 1. 最簡單的啟動

```go
go doSomething() // 非同步執行，不等待結果
```

#### 2. 搭配匿名函數

```go
go func(msg string) {
    fmt.Println(msg)
}("Hello") // 立即傳入參數，避免閉包捕捉到錯誤的值
```

#### 3. WaitGroup：等待所有 Goroutine 完成

`sync.WaitGroup` 內部維護一個計數器，透過三個方法控制：

| 方法 | 說明 |
| :--- | :--- |
| `wg.Add(n)` | 計數器 +n，代表「還有 n 個工作要等」 |
| `wg.Done()` | 計數器 -1，代表「我完成了」 |
| `wg.Wait()` | 阻塞，直到計數器歸零才繼續 |

```go
var wg sync.WaitGroup

for i := 0; i < 3; i++ {
    wg.Add(1)              // 每啟動一個 goroutine 前 +1，計數器：1 → 2 → 3
    go func(id int) {
        defer wg.Done()    // goroutine 結束時 -1
        fmt.Println("worker", id)
    }(i)                   // 傳入 i 的當下值，避免閉包問題
}

wg.Wait()                  // 計數器歸零前阻塞，所有 worker 完成後繼續
fmt.Println("所有 worker 完成")
```

**執行流程：**

```text
main goroutine        worker 0          worker 1          worker 2
─────────────         ────────          ────────          ────────
wg.Add(1) → 計數=1
啟動 worker 0  ──────→ 開始執行
wg.Add(1) → 計數=2
啟動 worker 1  ───────────────────────→ 開始執行
wg.Add(1) → 計數=3
啟動 worker 2  ────────────────────────────────────────→ 開始執行
wg.Wait()（計數=3，阻塞）
               輸出 "worker 0"
               wg.Done() → 計數=2
                                        輸出 "worker 1"
                                        wg.Done() → 計數=1
                                                          輸出 "worker 2"
                                                          wg.Done() → 計數=0
wg.Wait() 解除阻塞
輸出 "所有 worker 完成"
```

> **注意**：Goroutine 的執行順序不固定，`worker 0 / 1 / 2` 的輸出順序每次執行可能不同，但 `"所有 worker 完成"` 一定在三者都結束後才印出。

**常見錯誤：`wg.Add` 位置放錯**

```go
// 危險：goroutine 可能在 Add 之前就結束，導致 Wait 提早解除
for i := 0; i < 3; i++ {
    go func(id int) {
        wg.Add(1)       // 太晚了，應在啟動前 Add
        defer wg.Done()
        fmt.Println("worker", id)
    }(i)
}
wg.Wait() // 可能在所有 goroutine 完成前就通過
```

#### 4. Channel：傳遞結果

Channel 是 Goroutine 之間傳遞資料的管道，是 Go 實現「以通訊共享記憶體」的核心機制。

**無緩衝 Channel（Unbuffered）：**

發送方與接收方必須**同時就緒**，否則先到的那方會阻塞等待。

```go
ch := make(chan int) // 無緩衝

go func() {
    fmt.Println("goroutine：準備發送")
    ch <- 42             // 阻塞，直到有人接收
    fmt.Println("goroutine：發送完畢")
}()

fmt.Println("main：準備接收")
result := <-ch           // 阻塞，直到有人發送
fmt.Println("main：收到", result)

// 輸出（順序固定，兩端互相等待）：
// main：準備接收
// goroutine：準備發送
// goroutine：發送完畢
// main：收到 42
```

```text
goroutine         channel          main
─────────         ───────          ────
ch <- 42  ──────→ [等待接收方]
                                   result := <-ch
                  ──────────────→  收到 42
發送完畢
```

> 關閉偵測（`ok` 判斷）與 `range` 自動收完請見 **Section 4-D `close()`**。

---

#### 5. Buffered Channel：不阻塞的發送

有緩衝的 Channel 在**緩衝未滿**時，發送不會阻塞；緩衝滿了才阻塞。

```go
ch := make(chan int, 3) // 緩衝大小為 3

ch <- 1 // 不阻塞，放入緩衝
ch <- 2 // 不阻塞，放入緩衝
ch <- 3 // 不阻塞，緩衝剛好滿
// ch <- 4 // 阻塞！緩衝已滿，沒有人接收就卡住

fmt.Println(<-ch) // 1（先進先出 FIFO）
fmt.Println(<-ch) // 2
fmt.Println(<-ch) // 3
```

**無緩衝 vs 有緩衝對比：**

```text
無緩衝：  發送方 ──直接握手──→ 接收方     （同步，雙方必須同時在線）
有緩衝：  發送方 ──→ [■■■□] ──→ 接收方     （非同步，緩衝當作暫存區）
```

| | 無緩衝 | 有緩衝 |
| :--- | :--- | :--- |
| 建立 | `make(chan T)` | `make(chan T, n)` |
| 發送阻塞時機 | 無人接收時 | 緩衝滿時 |
| 接收阻塞時機 | 無人發送時 | 緩衝空時 |
| 適用場景 | 同步協調、確保對方收到 | 削峰填谷、生產者消費者 |

---

#### 6. select：同時監聽多個 Channel

`select` 類似 `switch`，但每個 `case` 是一個 channel 操作。Go 會執行**第一個就緒**的 case，若同時多個就緒則隨機選一個。

```go
ch1 := make(chan string, 1)
ch2 := make(chan string, 1)

ch1 <- "來自 ch1"

select {
case msg := <-ch1:
    fmt.Println("收到：", msg) // 執行這個，因為 ch1 有值
case msg := <-ch2:
    fmt.Println("收到：", msg) // ch2 沒有值，跳過
}
// 輸出：收到： 來自 ch1
```

**搭配 `default` 避免阻塞：**

```go
select {
case msg := <-ch:
    fmt.Println("有值：", msg)
default:
    fmt.Println("沒有值，不阻塞，繼續往下走")
}
```

**搭配 `time.After` 做超時處理：**

```go
select {
case msg := <-ch:
    fmt.Println("收到：", msg)
case <-time.After(2 * time.Second):
    fmt.Println("等超過 2 秒，放棄等待") // 超時才執行
}
```

**用 `for + select` 持續監聽：**

```go
for {
    select {
    case msg := <-jobs:
        fmt.Println("處理工作：", msg)
    case <-quit:
        fmt.Println("收到結束訊號")
        return
    }
}
```

**`select {}`：永遠阻塞**

空的 `select`（沒有任何 case）會讓當前 goroutine 永遠等待，CPU 使用率為零。常用於讓 `main` 不退出，等待背景 goroutine 持續運行：

```go
func main() {
    go startServer()  // 啟動背景服務
    go startWorker()  // 啟動背景工作

    select {}         // main 不退出，讓兩個 goroutine 持續跑
}
```

實務上通常搭配 OS 信號做**優雅關機（Graceful Shutdown）**：

```go
func main() {
    go startServer()

    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

    <-quit  // 等到 Ctrl+C 或 kill 信號才繼續
    fmt.Println("關閉中...")
    // 執行清理工作
}
```

| 寫法 | 行為 | 建議 |
| :--- | :--- | :--- |
| `select {}` | 永遠阻塞，CPU 使用率 0 | 適合最簡單的場景 |
| `<-quit`（OS 信號） | 等信號才繼續 | 實務上更常用，可做優雅關機 |
| `for {}` | 無限迴圈 | **佔用 CPU，不應用來等待** |

---

#### 7. done Channel：通知 Goroutine 結束

使用 `chan struct{}` 作為純訊號用途（不傳資料），`close(done)` 會讓所有監聽者同時收到訊號。

```go
done := make(chan struct{})

go func() {
    for {
        select {
        case <-done:
            fmt.Println("goroutine 收到結束訊號，退出")
            return
        default:
            fmt.Println("工作中...")
            time.Sleep(500 * time.Millisecond)
        }
    }
}()

time.Sleep(1500 * time.Millisecond)
close(done) // 廣播給所有監聽 done 的 goroutine
// 輸出：
// 工作中...
// 工作中...
// 工作中...
// goroutine 收到結束訊號，退出
```

> **為什麼用 `struct{}`？** `struct{}` 不佔任何記憶體，語意上明確表示「這個 channel 只傳訊號，不傳資料」。

---

### B. 常見陷阱與注意事項

#### 陷阱 1：閉包捕捉迴圈變數（最常見錯誤）

Goroutine 與閉包搭配時，閉包捕捉的是變數的**參考**而非當下的值，迴圈結束後所有 goroutine 看到的 `i` 都是最終值。

```go
// 錯誤：i 的值在迴圈跑完後是 3，所有 goroutine 都輸出 3
for i := 0; i < 3; i++ {
    go func() {
        fmt.Println(i) // 可能全部輸出 3
    }()
}

// 正確：傳入參數，每次複製當下的值
for i := 0; i < 3; i++ {
    go func(id int) {
        fmt.Println(id) // 0, 1, 2（順序不定）
    }(i)
}
```

> 詳細說明與三種解法見 **Section 3-E `#### 4. 迴圈閉包陷阱`**。

#### 陷阱 2：main 結束，所有 Goroutine 強制終止

```go
func main() {
    go fmt.Println("可能來不及執行")
    // main 結束，goroutine 被殺掉
    // 解法：用 WaitGroup 或 Channel 等待
}
```

#### 陷阱 3：多個 Goroutine 同時寫同一變數（Race Condition）

```go
// 危險：concurrent map writes 會 panic
m := map[string]int{}
go func() { m["a"] = 1 }()
go func() { m["b"] = 2 }()

// 解法 1：用 sync.Mutex 保護
var mu sync.Mutex
mu.Lock()
m["a"] = 1
mu.Unlock()

// 解法 2：改用 sync.Map（適合讀多寫少的場景）
var sm sync.Map
sm.Store("a", 1)
val, _ := sm.Load("a")
```

#### 陷阱 4：Goroutine 洩漏（Goroutine Leak）

```go
// 危險：沒人接收 ch，goroutine 永遠阻塞
func leak() {
    ch := make(chan int)
    go func() {
        ch <- 1 // 永遠卡在這裡
    }()
    // 函數結束，但 goroutine 還活著
}

// 解法：用帶緩衝的 channel 或確保有人接收
```

> **偵測 Race Condition**：執行時加上 `-race` 旗標，Go 的競態偵測器會自動警告。

```bash
go run -race main.go
go test -race ./...
```

---

### C. Channel 基本操作

*   **Channel**: 用於 Goroutine 之間的通訊，遵循「不要透過共享記憶體來通訊，而要透過通訊來共享記憶體」的原則。

| 操作 | 語法 | 說明 |
| :--- | :--- | :--- |
| 建立（無緩衝） | `make(chan T)` | 發送與接收必須同時就緒 |
| 建立（有緩衝） | `make(chan T, n)` | 緩衝未滿時發送不阻塞 |
| 發送 | `ch <- val` | 阻塞直到有人接收 |
| 接收 | `val := <-ch` | 阻塞直到有值可取 |
| 關閉 | `close(ch)` | 只有發送方關閉，接收方可繼續取剩餘值 |
| 判斷已關閉 | `val, ok := <-ch` | `ok` 為 false 表示 channel 已關閉且無值 |

---

### D. close()：關閉 Channel

`close(ch)` 用來通知接收方「資料已全部發送完畢，不會再有新資料了」。

#### 關閉後的接收行為

```go
ch := make(chan int, 3)
ch <- 10
ch <- 20
ch <- 30
close(ch) // 關閉，但緩衝內的值還在

// 仍可取出所有緩衝值，最後再取會得到零值
fmt.Println(<-ch)       // 10
fmt.Println(<-ch)       // 20
fmt.Println(<-ch)       // 30
fmt.Println(<-ch)       // 0（零值，channel 已關閉且無值）

// 用 ok 判斷是否真的有值
val, ok := <-ch
fmt.Println(val, ok)    // 0 false
```

```text
close 之後的接收行為：

  緩衝還有值  → 正常取值，ok = true
  緩衝已空    → 立刻回傳零值，ok = false（不會阻塞）
  未關閉且空  → 阻塞等待
```

#### 用 range 自動偵測關閉

`range` 會持續從 channel 取值，直到 channel 被關閉且緩衝清空，自動結束迴圈。

```go
ch := make(chan int, 3)
ch <- 1
ch <- 2
ch <- 3
close(ch)

for val := range ch {   // 自動在 close 且清空後停止
    fmt.Println(val)
}
// 輸出：1, 2, 3
```

#### close 的規則與常見錯誤

```go
// 規則 1：只有發送方應該關閉 channel
// 規則 2：不能關閉已關閉的 channel（會 panic）
// 規則 3：不能向已關閉的 channel 發送資料（會 panic）
// 規則 4：nil channel 永遠阻塞，close(nil) 會 panic

ch := make(chan int)
close(ch)
close(ch)  // panic: close of closed channel
ch <- 1    // panic: send on closed channel
```

#### 安全關閉模式：sync.Once 防止重複關閉

```go
type SafeChan struct {
    ch   chan int
    once sync.Once
}

func (s *SafeChan) Close() {
    s.once.Do(func() {
        close(s.ch) // 無論呼叫幾次，只會執行一次
    })
}
```

#### close 作為廣播訊號

`close(done)` 是廣播的慣用寫法：發送（`ch <- signal`）只能喚醒**一個**接收者，而 `close` 能同時喚醒**所有**等待的 Goroutine。完整範例見 **Section 4-A `#### 7. done Channel`**。

---

## 5. 錯誤處理 (Error Handling)

Go 不使用 `try-catch`。它認為錯誤是預期內的值，必須明確處理。

```go
val, err := funcName()
if err != nil {
    // 處理錯誤邏輯
    return err
}
// 繼續正常邏輯
```

---

### A. panic：程式崩潰

`panic` 代表「程式遇到無法繼續的嚴重錯誤」，呼叫後會立即停止當前函數，沿著 call stack 向上傳播，最終導致程式崩潰並印出錯誤訊息與 stack trace。

#### 什麼情況會觸發 panic

**Runtime 自動觸發（不需要手動呼叫）：**

```go
// 1. 存取超出範圍的 slice index
s := []int{1, 2, 3}
fmt.Println(s[10]) // panic: runtime error: index out of range [10] with length 3

// 2. 對 nil 指標取值
var p *int
fmt.Println(*p) // panic: runtime error: nil pointer dereference

// 3. 對已關閉的 channel 發送資料
ch := make(chan int)
close(ch)
ch <- 1 // panic: send on closed channel

// 4. map 並發讀寫
m := map[string]int{}
go func() { m["a"] = 1 }()
go func() { m["b"] = 2 }() // panic: concurrent map writes

// 5. 型別斷言失敗
var i interface{} = "hello"
n := i.(int) // panic: interface conversion: interface {} is string, not int
_ = n
```

**手動呼叫 `panic`：**

```go
func divide(a, b int) int {
    if b == 0 {
        panic("除數不能為零") // 主動觸發 panic
    }
    return a / b
}
```

#### panic 的傳播流程

```text
main()
  └→ funcA()
       └→ funcB()
            └→ panic("出錯了！")  ← 從這裡開始
                 ↑ 向上傳播
            funcB 的 defer 執行
                 ↑
            funcA 的 defer 執行
                 ↑
            main 的 defer 執行
                 ↑
       程式崩潰，印出 stack trace
```

> `defer` 在 panic 傳播過程中**仍然會執行**，這是 `recover` 得以攔截的關鍵。

#### panic 崩潰輸出範例

```text
goroutine 1 [running]:
main.divide(...)
    /tmp/main.go:5
main.main()
    /tmp/main.go:10 +0x27
exit status 2
```

---

### B. recover：攔截 panic

`recover` 只能在 `defer` 內使用，用來攔截 panic、取得錯誤訊息，讓程式得以繼續執行而不崩潰。

#### 基本用法

```go
func safeDiv(a, b int) (result int, err error) {
    defer func() {
        if r := recover(); r != nil {
            // r 是 panic 傳入的值（可能是 string、error 或任意型別）
            err = fmt.Errorf("捕捉到 panic：%v", r)
        }
    }()

    return a / b, nil // b=0 會觸發 panic
}

func main() {
    result, err := safeDiv(10, 0)
    if err != nil {
        fmt.Println("錯誤：", err) // 錯誤：捕捉到 panic：runtime error: integer divide by zero
        return
    }
    fmt.Println("結果：", result)
}
```

#### recover 的執行順序

```text
safeDiv(10, 0) 被呼叫
  ↓
defer 被登記（尚未執行）
  ↓
a / b 觸發 panic
  ↓
panic 開始傳播，執行所有 defer
  ↓
defer 內呼叫 recover() → 攔截 panic，回傳 panic 的值
  ↓
panic 被消除，函數正常返回（err 被賦值）
  ↓
main 繼續執行
```

#### recover 失效的情況

```go
// 錯誤：recover 沒有在 defer 內直接呼叫，無法攔截
defer func() {
    // 沒問題
}()
recover() // 這行在 defer 外面，無效

// 錯誤：recover 在巢狀函數內，無法攔截上層的 panic
defer func() {
    func() {
        recover() // 只能攔截這個匿名函數內的 panic，攔不到外層
    }()
}()
```

---

### C. panic vs error：如何選擇

| | `error` | `panic` |
| :--- | :--- | :--- |
| **性質** | 預期內的失敗 | 預期外的嚴重錯誤 |
| **範例** | 檔案不存在、網路逾時 | nil 指標、index 越界 |
| **呼叫方** | 必須明確處理 | 通常讓程式崩潰 |
| **使用時機** | 幾乎所有錯誤場景 | 程式無法繼續的嚴重問題 |
| **recover** | 不需要 | 必要時才使用 |

**實務原則：**

* 函式庫（library）中應避免 `panic`，將錯誤包成 `error` 回傳給呼叫方決定
* 在程式進入點（`main` 或 HTTP handler）可用 `recover` 統一攔截，防止整個服務崩潰
* 確認「永遠不可能發生」的條件失敗時（invariant 違反），才用 `panic`

```go
// HTTP server 統一攔截 panic，避免單一 request 搞垮整個服務
func safeHandler(h http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                http.Error(w, "Internal Server Error", 500)
                log.Printf("panic: %v", err)
            }
        }()
        h(w, r)
    }
}
```

---

## 6. 學習路徑建議

1.  **基礎語法**：變數、迴圈、條件判斷。
2.  **資料結構**：了解 `Array`, `Slice` (動態陣列), `Map` (鍵值對)。
3.  **指標 (Pointer)**：了解 `&` (取位址) 與 `*` (取值)，Go 的指標不允許運算，相對安全。
4.  **結構體與介面**：學習如何組織資料與定義行為。
5.  **併發編程**：實作簡單的 `go` 與 `chan` 協作。
6.  **標準庫探索**：特別是 `net/http`, `os`, `io`, `encoding/json`。

---

## 7. 學習 Go 所需的知識與技能

要從入門到熟悉，建議掌握以下維度：

### 核心硬實力
*   **計算機基礎**：理解記憶體管理（Stack vs Heap）、進程與線程的差異。
*   **Go 語法深度**：
    *   **指標觀念**：理解傳值與傳址的效能影響。
    *   **集合操作**：熟練 Slice 的底層原理（Len vs Cap）與 Map 的併發安全性。
    *   **介面設計**：掌握「鴨子類型 (Duck Typing)」的隱式介面實現。
*   **併發控制**：不只是會用 `go` 關鍵字，還要理解 `Channel` 的阻塞機制與 `sync` 套件的鎖機制。
*   **工具鏈使用**：熟練 `go mod` 依賴管理、`go test` 單元測試以及 `go build` 跨平台編譯。

### 軟實力與實踐
*   **Idiomatic Go**：寫出符合社群規範的程式碼（例如：簡短的變數命名、顯式的錯誤處理）。
*   **閱讀原始碼**：Go 的標準庫是最好的老師，建議從 `io` 或 `errors` 開始閱讀。

---

[← 返回目錄](README.md)

*文件更新日期：2026年5月28日*
