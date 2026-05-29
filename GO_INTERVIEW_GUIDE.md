# Go 面試題目指南

[← 返回目錄](README.md)

---

涵蓋從初級到進階的常見面試題，每題附上考察重點與參考答案。

---

## 一、基礎語法

### Q1. Go 中 `:=` 和 `var` 的差異是什麼？

**考察重點**：變數宣告的語法與使用場景

**參考答案**：

```go
// var：可用於任何地方（函數外、函數內），可只宣告不賦值
var name string        // 零值 ""
var age int = 30       // 明確指定型別與值

// :=：只能在函數內使用，型別自動推斷，必須同時賦值
name := "Alice"
age := 30
```

| | `var` | `:=` |
| :--- | :--- | :--- |
| 使用位置 | 函數外、函數內 | 僅函數內 |
| 型別 | 可明確指定 | 自動推斷 |
| 初始化 | 可不賦值（給零值） | 必須賦值 |

---

### Q2. Go 有哪些資料型別的零值（zero value）？

**考察重點**：對零值機制的理解，以及 nil 適用哪些型別

**參考答案**：

| 型別 | 零值 |
| :--- | :--- |
| `int`, `float64` | `0` |
| `bool` | `false` |
| `string` | `""` |
| `pointer`, `slice`, `map`, `chan`, `func`, `interface` | `nil` |
| `struct` | 所有欄位各自的零值 |

```go
var i int       // 0
var b bool      // false
var s string    // ""
var p *int      // nil
var sl []int    // nil（但 len(sl) == 0，可以 append）
```

---

### Q3. slice 和 array 的差異？

**考察重點**：理解 slice 的動態性與底層結構

**參考答案**：

```go
// array：長度固定，是值型別（傳遞時複製整個陣列）
arr := [3]int{1, 2, 3}

// slice：長度動態，是參考型別（底層共享陣列）
sl := []int{1, 2, 3}
sl = append(sl, 4)
```

| | Array | Slice |
| :--- | :--- | :--- |
| 長度 | 固定，是型別的一部分 | 動態 |
| 傳遞方式 | 值複製（完整複製） | 傳 header（ptr/len/cap） |
| 零值 | 元素各自零值 | nil |
| 比較 | 可用 `==` | 不能用 `==`（只能和 nil 比） |

---

### Q4. `make` 和 `new` 的差異？

**考察重點**：記憶體分配機制的理解

**參考答案**：

```go
// new：回傳指向零值的指標，適用所有型別
p := new(int)    // *int，*p = 0

// make：初始化內部結構，只適用 slice/map/channel，回傳值本身（非指標）
s := make([]int, 0, 10)
m := make(map[string]int)
ch := make(chan int, 5)
```

> `new` 在實務中很少使用，通常用 `&T{}` 取代；`make` 是初始化 slice/map/channel 的標準寫法。

---

### Q5. defer 的執行順序為何？搭配 return 時的行為？

**考察重點**：LIFO 順序、值捕捉時機、Named Return Value

**參考答案**：

```go
// 1. LIFO 順序
func main() {
    defer fmt.Println("1")
    defer fmt.Println("2")
    defer fmt.Println("3")
}
// 輸出：3 → 2 → 1

// 2. 參數在宣告時捕捉
x := 10
defer fmt.Println(x)           // 輸出 10（宣告時捕捉）
defer func() { fmt.Println(x) }() // 輸出 20（閉包，執行時取值）
x = 20

// 3. Named Return Value：defer 可以修改回傳值
func double(n int) (result int) {
    defer func() { result *= 2 }() // 可以修改具名回傳值
    result = n
    return // 實際回傳 result*2
}
fmt.Println(double(5)) // 10
```

---

### Q6. Go 的 for 有哪幾種用法？

**考察重點**：是否了解 Go 只有 for，沒有 while/do-while

**參考答案**：

```go
for i := 0; i < 5; i++ { }        // 傳統三段式
for n < 10 { }                     // 類似 while
for { }                            // 無限迴圈
for i, v := range slice { }       // 迭代 slice/array
for k, v := range m { }           // 迭代 map（順序不固定）
for i, ch := range "Hello" { }    // 迭代字串（逐 rune）
for v := range ch { }             // 接收 channel 直到關閉
```

---

## 二、函數與閉包

### Q7. 什麼是閉包？常見的陷阱是什麼？

**考察重點**：閉包對外部變數的捕捉方式，迴圈陷阱

**參考答案**：

閉包是「函數 + 它捕捉的外部變數」的組合，捕捉的是**參考**而非值的複製。

```go
// 迴圈閉包陷阱
for i := 0; i < 3; i++ {
    go func() {
        fmt.Println(i) // 全部輸出 3，因為共用同一個 i
    }()
}

// 解法：傳入參數
for i := 0; i < 3; i++ {
    go func(id int) {
        fmt.Println(id) // 0, 1, 2
    }(i)
}

// Go 1.22+ 已修正此行為，每次迭代產生獨立的 i
```

---

### Q8. 什麼是 panic 和 recover？什麼時候該用？

**考察重點**：panic 傳播機制，recover 只能在 defer 中使用

**參考答案**：

```go
func safeRun(f func()) (err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("捕捉到 panic：%v", r)
        }
    }()
    f()
    return
}
```

- `panic`：程式遇到無法繼續的錯誤，向上傳播，執行所有 defer 後崩潰
- `recover`：只能在 `defer` 內呼叫，攔截 panic 讓程式繼續

**使用原則**：
- 函式庫不應對外 panic，應回傳 error
- HTTP handler 等入口可用 recover 統一攔截，防止整個服務崩潰

---

## 三、介面與型別

### Q9. Go 的介面是如何實現的？什麼是隱式實現？

**考察重點**：不需要 implements 宣告，鴨子類型

**參考答案**：

```go
type Writer interface {
    Write(p []byte) (n int, err error)
}

// File 只要有相同簽名的方法，就自動滿足 Writer 介面
// 不需要寫 "implements Writer"
type File struct{}
func (f *File) Write(p []byte) (int, error) { ... }

var w Writer = &File{} // 合法
```

**編譯期驗證技巧**：

```go
var _ Writer = (*File)(nil) // 若 File 未完整實作，編譯報錯
```

---

### Q10. interface{} 和 any 的差異？型別斷言怎麼用？

**考察重點**：any 是 interface{} 的別名，型別斷言的安全用法

**參考答案**：

`any` 是 Go 1.18 引入的 `interface{}` 別名，完全相同。

```go
// 型別斷言
var i any = "hello"

// 不安全：型別不符直接 panic
s := i.(string)

// 安全：用 ok 判斷
s, ok := i.(string)
if ok {
    fmt.Println(s)
}

// 介面升級：斷言成另一個介面
if flusher, ok := w.(http.Flusher); ok {
    flusher.Flush()
}
```

---

### Q11. nil interface 和 interface 包含 nil 指標的差異？

**考察重點**：interface 的內部結構（type + value），常見 bug

**參考答案**：

```go
// interface 內部結構：(動態型別, 動態值)
// 只有兩者都是 nil，才等於 nil

var err error = nil          // (nil, nil) → err == nil 為 true

var p *MyError = nil
var err2 error = p           // (*MyError, nil) → err2 == nil 為 false！

// 常見 bug：
func getError() error {
    var p *MyError = nil
    return p // 回傳 (*MyError, nil)，不是 nil interface！
}
err := getError()
fmt.Println(err == nil) // false，出乎意料
```

**正確寫法**：確認沒有錯誤時直接 `return nil`。

---

## 四、併發

### Q12. Goroutine 和 Thread 的差異？

**考察重點**：輕量級、M:N 排程模型、stack 動態增長

**參考答案**：

| | Thread（作業系統執行緒） | Goroutine |
| :--- | :--- | :--- |
| 建立成本 | 高（~1MB stack） | 低（~2KB stack，動態增長） |
| 排程 | OS 負責（preemptive） | Go runtime 負責（M:N 模型） |
| 切換成本 | 高（context switch） | 低（user space） |
| 數量上限 | 通常數千 | 可輕鬆達數十萬 |
| 建立語法 | 複雜 | `go func(){}()` |

---

### Q13. Channel 的阻塞規則是什麼？

**考察重點**：無緩衝 vs 有緩衝的阻塞時機，deadlock 判斷

**參考答案**：

```text
無緩衝 Channel：
  發送（ch <- val）→ 阻塞，直到有人接收
  接收（<-ch）     → 阻塞，直到有人發送

有緩衝 Channel：
  發送 → 緩衝未滿時不阻塞，緩衝滿時阻塞
  接收 → 緩衝不為空時不阻塞，緩衝空時阻塞

已關閉 Channel：
  接收 → 立即回傳零值，ok = false，不阻塞
  發送 → panic
```

Deadlock 發生條件：所有 goroutine 都在等待，沒有任何一個能繼續執行。

---

### Q14. sync.Mutex 和 sync.RWMutex 的差異？

**考察重點**：讀寫鎖的適用場景，效能取捨

**參考答案**：

```go
// Mutex：任何操作都獨佔
var mu sync.Mutex
mu.Lock()
defer mu.Unlock()

// RWMutex：讀可並發，寫獨佔
var rw sync.RWMutex

// 讀取：多個 goroutine 可同時持有
rw.RLock()
defer rw.RUnlock()

// 寫入：獨佔，阻塞所有讀和寫
rw.Lock()
defer rw.Unlock()
```

**選擇原則**：讀遠多於寫（如快取）用 `RWMutex`；讀寫頻率相近用 `Mutex`，過度使用 RWMutex 反而可能更慢。

---

### Q15. 如何避免 Goroutine 洩漏？

**考察重點**：goroutine 生命週期管理，done channel 模式

**參考答案**：

Goroutine 洩漏：goroutine 永遠阻塞，無法結束，佔用記憶體。

```go
// 危險：沒人接收 ch，goroutine 永遠阻塞
func leak() {
    ch := make(chan int)
    go func() { ch <- 1 }()
    // 函數結束，但 goroutine 還活著
}

// 解法一：確保 channel 有人接收，或用緩衝
ch := make(chan int, 1)
go func() { ch <- 1 }() // 緩衝，不阻塞

// 解法二：用 done channel 通知結束
func worker(done <-chan struct{}) {
    for {
        select {
        case <-done:
            return
        default:
            // 執行工作
        }
    }
}
done := make(chan struct{})
go worker(done)
close(done) // 通知結束
```

---

### Q16. select 的行為是什麼？多個 case 同時就緒時怎麼辦？

**考察重點**：隨機選擇、default 的作用、超時模式

**參考答案**：

```go
select {
case msg := <-ch1:      // 監聽 ch1
    fmt.Println(msg)
case msg := <-ch2:      // 監聽 ch2
    fmt.Println(msg)
case <-time.After(2 * time.Second): // 超時
    fmt.Println("timeout")
default:                // 沒有 case 就緒時執行，讓 select 不阻塞
    fmt.Println("no data")
}
```

- 多個 case 同時就緒 → **隨機選一個執行**，不保證順序
- 有 `default` → 沒有 case 就緒時立即執行，不阻塞
- 沒有 `default` → 阻塞直到有 case 就緒

---

## 五、錯誤處理

### Q17. Go 的錯誤處理哲學是什麼？

**考察重點**：error 作為值，顯式處理，不用 try-catch

**參考答案**：

Go 認為錯誤是預期內的值，呼叫方必須明確決定如何處理：

```go
val, err := doSomething()
if err != nil {
    return fmt.Errorf("doSomething 失敗：%w", err) // %w 包裝 error，保留原始
}
```

**錯誤包裝與解包（Go 1.13+）**：

```go
// 包裝
err := fmt.Errorf("讀取失敗：%w", io.ErrUnexpectedEOF)

// 判斷
errors.Is(err, io.ErrUnexpectedEOF) // true，即使被包裝過

// 取出特定型別
var pathErr *os.PathError
errors.As(err, &pathErr) // true，取出具體型別
```

---

### Q18. `errors.Is` 和 `errors.As` 的差異？

**考察重點**：Is 比較值，As 取出型別

**參考答案**：

```go
// errors.Is：比較錯誤是否「是」某個特定的錯誤值（支援 Unwrap 鏈）
if errors.Is(err, os.ErrNotExist) {
    fmt.Println("檔案不存在")
}

// errors.As：嘗試將錯誤轉換成特定型別（支援 Unwrap 鏈）
var pathErr *os.PathError
if errors.As(err, &pathErr) {
    fmt.Println("路徑：", pathErr.Path)
}
```

---

## 六、記憶體與效能

### Q19. Go 的垃圾回收（GC）機制是什麼？

**考察重點**：三色標記、STW、對效能的影響

**參考答案**：

Go 使用**三色標記清除（Tri-color Mark and Sweep）** + **並發 GC**：

```text
三色標記：
  白色 → 尚未探訪（GC 結束後若還是白色，代表不可達，會被回收）
  灰色 → 已發現但子節點尚未掃描完
  黑色 → 已完全掃描，確認存活

流程：
  1. STW（Stop-the-world）極短暫，標記 root 物件為灰色
  2. 並發掃描：與程式同時執行，把灰色轉黑色
  3. 短暫 STW，處理掃描期間的變動
  4. 清除白色物件
```

**減少 GC 壓力的常見做法**：
- 用 `sync.Pool` 重用物件，減少分配
- 預分配 slice/map 容量，減少擴容
- 避免大量短命的小物件

---

### Q20. Stack 和 Heap 的差異？Go 如何決定變數分配在哪裡？

**考察重點**：逃逸分析（escape analysis）

**參考答案**：

```text
Stack：函數自己的記憶體空間，函數結束自動釋放，速度快
Heap ：GC 管理的記憶體，生命週期不固定，需要 GC 回收
```

Go 編譯器透過**逃逸分析**決定分配位置：

```go
func noEscape() *int {
    x := 42       // x 的位址被回傳，逃逸到 Heap
    return &x
}

func escape() int {
    x := 42       // x 只在函數內使用，分配在 Stack
    return x
}
```

**查看逃逸分析**：

```bash
go build -gcflags="-m" main.go
# 輸出：./main.go:3:2: moved to heap: x
```

---

## 七、進階設計

### Q21. Go 如何實現繼承？

**考察重點**：Go 沒有繼承，用組合（embedding）取代

**參考答案**：

```go
type Animal struct {
    Name string
}
func (a Animal) Breathe() { fmt.Println(a.Name, "在呼吸") }

// 用嵌入（embedding）組合，不是繼承
type Dog struct {
    Animal        // 嵌入，Dog 自動擁有 Animal 的所有方法
    Breed string
}

d := Dog{Animal: Animal{Name: "小黑"}, Breed: "柴犬"}
d.Breathe() // 直接呼叫 Animal 的方法，Dog 不需要重寫
d.Name      // 也可以直接存取 Animal 的欄位
```

**與繼承的差異**：嵌入是組合不是繼承，`Dog` 不是 `Animal` 的子型別，無法直接賦值給 `Animal` 型別的變數（除非透過介面）。

---

### Q22. sync.Once 的使用場景？

**考察重點**：單例模式、延遲初始化，只執行一次的保證

**參考答案**：

```go
var (
    instance *DB
    once     sync.Once
)

func GetDB() *DB {
    once.Do(func() {
        instance = &DB{conn: connect()} // 只執行一次
    })
    return instance
}
```

即使 100 個 goroutine 同時呼叫 `GetDB()`，初始化只會執行一次，且所有 goroutine 都會等到初始化完成後才繼續。

---

### Q23. 什麼是 Worker Pool？為什麼需要它？

**考察重點**：資源限制、goroutine 數量控制

**參考答案**：

直接為每個工作啟動一個 goroutine，在大量請求時會耗盡資源：

```go
// 危險：同時啟動 10000 個 goroutine
for i := 0; i < 10000; i++ {
    go doWork(i)
}

// 解法：Worker Pool 限制同時執行數量
func workerPool(jobs <-chan int, workerCount int) {
    var wg sync.WaitGroup
    for i := 0; i < workerCount; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                doWork(job)
            }
        }()
    }
    wg.Wait()
}
```

---

### Q24. Go 的 context 套件是什麼？為什麼重要？

**考察重點**：取消傳播、超時控制、跨 goroutine 的訊號

**參考答案**：

`context` 用來在整個呼叫鏈中傳遞**取消訊號、截止時間、請求相關的值**：

```go
// 建立帶超時的 context
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel() // 一定要呼叫，釋放資源

// 在函數中檢查是否被取消
func doWork(ctx context.Context) error {
    select {
    case <-ctx.Done():
        return ctx.Err() // context.DeadlineExceeded 或 context.Canceled
    default:
        // 繼續執行
    }
    return nil
}

// HTTP handler 中的 context（請求結束時自動取消）
func handler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    result, err := db.QueryContext(ctx, "SELECT ...")
    // 若客戶端斷線，ctx 自動取消，QueryContext 也會中止
}
```

**四種建立方式**：

| 函數 | 說明 |
| :--- | :--- |
| `context.Background()` | 根節點，通常在 main 或最外層使用 |
| `context.WithCancel(ctx)` | 可手動呼叫 cancel() 取消 |
| `context.WithTimeout(ctx, d)` | 超過時間自動取消 |
| `context.WithDeadline(ctx, t)` | 到達特定時間點自動取消 |

---

## 八、程式碼閱讀題

### Q25. 以下程式碼的輸出是什麼？為什麼？

```go
func main() {
    s := []int{1, 2, 3}
    modify(s)
    fmt.Println(s)
}

func modify(s []int) {
    s[0] = 99
    s = append(s, 4)
}
```

**答案**：`[99 2 3]`

**解析**：
- `s[0] = 99`：修改底層陣列，影響原始 slice → `s[0]` 變成 99
- `s = append(s, 4)`：append 在函數內產生新的 slice header（或新底層陣列），不影響呼叫方的 `s`
- 呼叫方的 `s` 仍指向原底層陣列，len=3，看不到新增的 4

---

### Q26. 以下程式碼有什麼問題？

```go
var wg sync.WaitGroup

for i := 0; i < 5; i++ {
    go func() {
        defer wg.Done()
        fmt.Println(i)
    }()
    wg.Add(1)
}

wg.Wait()
```

**問題一**：`wg.Add(1)` 應在 `go func()` 之前呼叫，否則 goroutine 可能在 Add 之前執行完，導致 Wait 提早通過。

**問題二**：閉包捕捉迴圈變數 `i`，所有 goroutine 可能輸出相同的值（Race Condition）。

**正確寫法**：

```go
for i := 0; i < 5; i++ {
    wg.Add(1)           // 在啟動前 Add
    go func(id int) {   // 傳入當下的 i
        defer wg.Done()
        fmt.Println(id)
    }(i)
}
```

---

## 九、面試評分參考

| 等級 | 期望掌握的題目 |
| :--- | :--- |
| **初級** | Q1–Q6（基礎語法）、Q17（錯誤處理） |
| **中級** | Q7–Q11（函數/介面）、Q12–Q16（併發基礎） |
| **高級** | Q18–Q24（效能/設計模式/context） |
| **加分** | Q25–Q26（程式碼分析），能解釋底層原理 |

---

[← 返回目錄](README.md)


---

---

[← 返回目錄](README.md)

文件更新日期：2026年5月29日
