# Go 記憶體模型：Stack、Heap 與逃逸分析

[← 返回目錄](README.md)

---

這份文件幫助入門者理解 Go 在記憶體管理上的運作方式，
包含 Stack vs Heap 的差異、GC 機制，以及如何寫出對記憶體友善的程式碼。

---

## 1. Stack 與 Heap：兩種記憶體區域

Go 程式執行時，記憶體主要分成兩個區域：

```text
┌─────────────────────────────────────┐
│              程式記憶體               │
├─────────────────┬───────────────────┤
│      Stack      │       Heap        │
│  （每個 goroutine │  （GC 管理的共享  │
│   各自擁有）      │   記憶體區域）     │
├─────────────────┼───────────────────┤
│ • 函數呼叫的區域  │ • 需要跨函數存活  │
│ • 函數結束自動清除│ • 由 GC 負責回收  │
│ • 速度極快       │ • 速度較慢        │
│ • 大小有限       │ • 大小彈性        │
└─────────────────┴───────────────────┘
```

### Stack（堆疊）

每個 Goroutine 都有自己的 Stack，函數呼叫時在 Stack 上分配空間，函數結束時自動釋放，不需要 GC。

```go
func add(a, b int) int {
    result := a + b  // result 分配在 Stack
    return result
}                    // 函數結束，result 自動消失
```

```text
函數呼叫時的 Stack 變化：

main() 呼叫 add(3, 5)：

Stack
┌─────────────┐  ← Stack 頂端
│  add 的框架  │
│  a = 3      │
│  b = 5      │
│  result = 8 │
├─────────────┤
│  main 的框架 │
│  x = ...    │
└─────────────┘

add() 返回後：
┌─────────────┐  ← Stack 頂端
│  main 的框架 │  ← add 的框架消失，空間立即回收
│  x = 8      │
└─────────────┘
```

Go 的 Goroutine Stack 初始只有約 **2KB**，會動態增長（最大預設 1GB），遠比作業系統 Thread（通常 1–8MB 固定）輕量。

### Heap（堆積）

Heap 是所有 Goroutine 共享的記憶體區域，由 Go 的垃圾回收器（GC）負責管理。當一個變數需要在函數結束後繼續存活，就會被分配到 Heap。

```go
func newUser(name string) *User {
    u := &User{Name: name}  // u 分配在 Heap
    return u                 // 函數結束後 u 仍然存活
}

user := newUser("Alice")    // user 指向 Heap 上的 User
// 只要 user 還被使用，GC 不會回收它
```

---

## 2. 逃逸分析（Escape Analysis）

Go 編譯器會自動分析每個變數應該放在 Stack 還是 Heap，這個過程叫**逃逸分析**。

### 什麼情況會逃逸到 Heap？

```go
// 情況一：位址被回傳（最常見）
func newInt() *int {
    x := 42
    return &x  // x 的位址被帶出函數，x 必須逃逸到 Heap
}

// 情況二：被介面包裝
func printAny(v any) {
    fmt.Println(v)
}
x := 42
printAny(x)  // x 被轉換成 interface{}，逃逸到 Heap

// 情況三：Goroutine 捕捉
x := 10
go func() {
    fmt.Println(x)  // x 被閉包捕捉且在不同 goroutine 使用，逃逸
}()

// 情況四：大小在編譯期未知
n := getSize()       // n 在執行時才知道
s := make([]int, n)  // 大小動態，逃逸到 Heap
```

### 留在 Stack 的情況

```go
// 變數只在函數內使用，不逃逸
func sum(nums []int) int {
    total := 0       // total 留在 Stack
    for _, n := range nums {
        total += n
    }
    return total     // 回傳值，不是位址
}

// 小的 struct，且只在函數內使用
func process() {
    p := Point{X: 1, Y: 2}  // 留在 Stack
    fmt.Println(p.X + p.Y)
}
```

### 如何查看逃逸分析結果

```bash
go build -gcflags="-m" main.go

# 輸出範例：
# ./main.go:4:2: moved to heap: x        ← 逃逸到 Heap
# ./main.go:9:13: ... does not escape    ← 留在 Stack
# ./main.go:12:2: x escapes to heap      ← 逃逸到 Heap

# 更詳細的資訊：
go build -gcflags="-m -m" main.go
```

---

## 3. 垃圾回收（Garbage Collection）

### 什麼是 GC？

當 Heap 上的物件沒有任何變數指向它，就成為「垃圾」，GC 負責自動回收這些記憶體。

```go
func main() {
    u := &User{Name: "Alice"}  // u 指向 Heap 上的 User
    u = &User{Name: "Bob"}     // u 改指向新的 User，原本的 Alice 無人指向
    // Alice 那個 User 成為垃圾，等待 GC 回收
}
```

### Go 的三色標記 GC

Go 使用**三色標記清除（Tri-color Mark and Sweep）**演算法，搭配**並發執行**（與程式同時跑），減少停頓時間。

```text
三種顏色代表的狀態：

白色 ─ 尚未被掃描，GC 結束後還是白色 = 垃圾，會被回收
灰色 ─ 已發現，但其子節點（指向的物件）尚未掃描完
黑色 ─ 已完整掃描，確認存活，不會被回收

GC 流程：

1. STW（極短暫停）→ 把所有 Root 物件標為灰色
   Root：全域變數、每個 Goroutine 的 Stack 上的變數

2. 並發掃描（與程式同時執行）：
   取出灰色物件 → 把它指向的物件標為灰色 → 自己變黑色
   重複直到沒有灰色物件

3. STW（極短暫停）→ 處理掃描期間的變動

4. 清除（Sweep）→ 回收所有白色物件的記憶體
```

```text
範例：

Root → A → B → C
       ↓
       D

初始：A B C D 全是白色

Step 1：A 是 root，標為灰色
         [灰:A] [白:B] [白:C] [白:D]

Step 2：掃描 A，把 B、D 標灰，A 變黑
         [黑:A] [灰:B] [白:C] [灰:D]

Step 3：掃描 B，把 C 標灰，B 變黑
         [黑:A] [黑:B] [灰:C] [灰:D]

Step 4：掃描 C、D，沒有子節點，變黑
         [黑:A] [黑:B] [黑:C] [黑:D]

沒有白色物件 → 沒有垃圾，本輪 GC 結束
```

### STW（Stop-the-World）

GC 期間需要極短暫地暫停所有 Goroutine（STW），Go 已將 STW 時間優化到通常 **< 1ms**。

```text
程式執行時間軸：

程式執行 ──────│STW│─── 並發 GC ──────│STW│──── 清除 ──── 程式執行
               極短  （與程式同步）      極短
```

---

## 4. sync.Pool：物件重用，減少 GC 壓力

每次分配到 Heap 的物件都需要 GC 回收。`sync.Pool` 讓你重用物件，減少分配次數。

```go
var bufPool = sync.Pool{
    New: func() any {
        return make([]byte, 0, 1024) // Pool 空時自動建立新物件
    },
}

func processRequest(data []byte) {
    // 從 Pool 取出，而不是每次 make 新的
    buf := bufPool.Get().([]byte)
    defer func() {
        buf = buf[:0]         // 清空內容，但保留底層陣列
        bufPool.Put(buf)      // 歸還給 Pool，下次可以重用
    }()

    buf = append(buf, data...)
    // ... 使用 buf 處理請求
}
```

```text
沒有 Pool：

request 1 → make([]byte) → 使用 → GC 回收
request 2 → make([]byte) → 使用 → GC 回收
request 3 → make([]byte) → 使用 → GC 回收
（每次都分配 + GC，頻繁 GC 影響效能）

有 Pool：

request 1 → Pool.Get() → 使用 → Pool.Put() ──┐
request 2 → Pool.Get()◀────────────────────────┘ 重用
request 3 → Pool.Get()◀────────────────────────┘ 重用
（大幅減少 Heap 分配，GC 壓力降低）
```

> **注意**：Pool 裡的物件在 GC 時可能被清除，不能用來做持久化儲存，適合短命且頻繁建立的物件（如 buffer、臨時 struct）。

---

## 5. 記憶體對齊（Memory Alignment）

CPU 讀取記憶體時有對齊要求，struct 欄位的排列順序會影響實際佔用的記憶體大小。

```go
// 排列不佳：中間有填充（padding），佔用 24 bytes
type BadStruct struct {
    a bool    // 1 byte + 7 bytes padding
    b int64   // 8 bytes
    c bool    // 1 byte + 7 bytes padding
}

// 排列良好：欄位從大到小，佔用 16 bytes
type GoodStruct struct {
    b int64   // 8 bytes
    a bool    // 1 byte
    c bool    // 1 byte + 6 bytes padding
}
```

```text
BadStruct 的記憶體佈局（24 bytes）：

[a:1][pad:7][b:8][c:1][pad:7]
 ^填充       ^8字節  ^填充

GoodStruct 的記憶體佈局（16 bytes）：

[b:8][a:1][c:1][pad:6]
 ^8字節 ^合併   ^只需一次填充
```

**查看 struct 大小：**

```go
import "unsafe"

fmt.Println(unsafe.Sizeof(BadStruct{}))  // 24
fmt.Println(unsafe.Sizeof(GoodStruct{})) // 16
```

> 一般應用不需要刻意優化，但當 struct 有大量實例時（如百萬筆資料），欄位排列的差異可能節省數十 MB 記憶體。

---

## 6. 常見的記憶體問題與最佳實踐

### 問題一：不必要的 Heap 分配

```go
// 不好：每次呼叫都在 Heap 分配 User
func createUser(name string) *User {
    return &User{Name: name}
}

// 改善：如果只在函數內使用，傳值即可
func processUser(name string) {
    u := User{Name: name} // 留在 Stack
    doWork(u)
}
```

### 問題二：大 slice 預分配

```go
// 不好：多次 append 觸發多次擴容，每次都在 Heap 重新分配
var s []int
for i := 0; i < 10000; i++ {
    s = append(s, i) // 可能觸發數次擴容
}

// 好：預先知道大小就提前分配
s := make([]int, 0, 10000) // 一次分配到位
for i := 0; i < 10000; i++ {
    s = append(s, i) // 不觸發擴容
}
```

### 問題三：字串拼接

```go
// 不好：每次 + 都建立新的 string（字串不可變），產生大量垃圾
result := ""
for i := 0; i < 1000; i++ {
    result += fmt.Sprintf("%d", i) // 每次都分配新 string
}

// 好：用 strings.Builder，內部用 []byte，最後一次轉 string
var sb strings.Builder
for i := 0; i < 1000; i++ {
    fmt.Fprintf(&sb, "%d", i)
}
result := sb.String()
```

### 問題四：interface 裝箱（Boxing）

```go
// 每次把基本型別塞入 interface{}，都會在 Heap 分配一個包裝物件
var v any = 42    // int 被裝箱到 Heap

// 高頻呼叫時避免不必要的 interface{} 轉換
func logValue(v any) { ... }   // 每次呼叫都裝箱
func logInt(v int) { ... }     // 更直接，沒有裝箱成本
```

---

## 7. 效能分析工具

### pprof：找出記憶體分配熱點

```go
import (
    "net/http"
    _ "net/http/pprof" // 匯入後自動註冊 /debug/pprof 路由
)

func main() {
    go http.ListenAndServe(":6060", nil)
    // ... 程式主體
}
```

```bash
# 擷取記憶體 profile
go tool pprof http://localhost:6060/debug/pprof/heap

# 互動式查看
(pprof) top10        # 前 10 個分配最多的函數
(pprof) list main    # 查看 main 函數的逐行分配
(pprof) web          # 用瀏覽器顯示視覺化圖表
```

### Benchmark + -memprofile

```bash
go test -bench=. -benchmem -memprofile=mem.out
go tool pprof mem.out
```

---

## 8. 總結對照表

| 概念 | 重點 | 常見問題 |
| :--- | :--- | :--- |
| **Stack** | 函數內使用，自動管理，速度快 | 遞迴太深導致 Stack overflow |
| **Heap** | 跨函數存活，GC 管理，速度較慢 | 頻繁分配增加 GC 壓力 |
| **逃逸分析** | 編譯器自動決定 Stack or Heap | 不必要的取址讓變數逃逸 |
| **三色 GC** | 並發標記，STW < 1ms | 大量短命物件增加 GC 頻率 |
| **sync.Pool** | 重用物件，減少分配 | Pool 內物件 GC 時可能被清除 |
| **記憶體對齊** | struct 欄位從大到小排列 | 排列不佳浪費記憶體 |
| **pprof** | 找出記憶體分配熱點 | 需要在程式中主動啟用 |

---

[← 返回目錄](README.md)


---

---

[← 返回目錄](README.md)

文件更新日期：2026年5月29日
