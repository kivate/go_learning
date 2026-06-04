# Go 語法深度解析：指標、集合、介面

[← 返回目錄](README.md)

---

這份文件針對已了解 Go 基礎語法的入門者，深入解說四個核心觀念。
每個章節都從「為什麼需要它」出發，搭配圖示與範例，幫助建立正確的心智模型。

---

## 1. 指標（Pointer）：傳值 vs 傳址

### 1-1. 什麼是傳值？

Go 預設所有函數呼叫都是**傳值（pass by value）**，意思是「把資料複製一份給函數」。

```go
func double(n int) {
    n = n * 2 // 修改的是複製品，不影響原始變數
}

x := 5
double(x)
fmt.Println(x) // 仍然是 5
```

```text
記憶體示意圖：

main:   x = 5   →   位址 0x001
                     ┌───┐
                     │ 5 │
                     └───┘

呼叫 double(x)：

double: n = 5   →   位址 0x002（全新的複製品）
                     ┌───┐
                     │ 5 │ ← 修改這裡，不影響 0x001
                     └───┘
```

---

### 1-2. 什麼是傳址（指標）？

**指標**儲存的是另一個變數的**記憶體位址**，傳址就是「把地址給函數，讓它直接操作原本的資料」。

| 符號 | 說明 | 範例 |
| :--- | :--- | :--- |
| `&x` | 取得 x 的記憶體位址 | `p := &x` |
| `*p` | 透過指標取得實際值（解參考） | `fmt.Println(*p)` |
| `*int` | 型別：「指向 int 的指標」 | `var p *int` |

```go
func double(n *int) {
    *n = *n * 2 // 透過指標修改原始變數
}

x := 5
double(&x) // 傳入 x 的位址
fmt.Println(x) // 10，原始變數被修改了
```

```text
記憶體示意圖：

main:   x = 5   →   位址 0x001
                     ┌───┐
                     │ 5 │
                     └───┘
                       ↑
double: n = 0x001 ─────┘  （n 儲存的是位址，不是複製品）
        *n = 10            （透過位址直接修改原始資料）
```

---

### 1-3. 效能影響：什麼時候用指標？

傳值會複製資料，當資料很大時，複製成本就很高。

```go
type BigStruct struct {
    Data [1000000]int // 8MB 的資料
}

// 每次呼叫複製 8MB，非常慢
func processValue(b BigStruct) { ... }

// 只傳 8 bytes 的指標位址，快很多
func processPointer(b *BigStruct) { ... }
```

```text
struct 大小 ≤ 3-4 個 int（~32 bytes）→ 傳值，簡單安全
struct 大小 > 32 bytes              → 傳指標，避免複製成本
需要修改原始資料                     → 一定要傳指標
```

```go
// 小 struct，傳值沒問題
type Point struct {
    X, Y int
}
func movePoint(p Point, dx, dy int) Point {
    return Point{p.X + dx, p.Y + dy}
}

// 大 struct 或需要修改，用指標
type User struct {
    Name    string
    Profile [500]byte
}
func updateName(u *User, name string) {
    u.Name = name // 直接修改原始資料
}
```

---

### 1-4. 常見錯誤：nil 指標

使用指標前必須確認它不是 `nil`，否則程式會 panic。

```go
var p *int      // p 是 nil，沒有指向任何位址
fmt.Println(*p) // panic: nil pointer dereference

// 正確做法：先確認不是 nil
if p != nil {
    fmt.Println(*p)
}

// 或者先分配記憶體
p = new(int)   // 分配一個 int 的記憶體，p 指向它
*p = 42
fmt.Println(*p) // 42
```

---

### 1-5. 指標接收者 vs 值接收者（方法）

struct 的方法也有傳值與傳址的選擇：

```go
type Counter struct {
    count int
}

// 值接收者：修改的是複製品，不影響原始 struct
func (c Counter) GetCount() int {
    return c.count
}

// 指標接收者：修改原始 struct
func (c *Counter) Increment() {
    c.count++ // 這才能真正修改 count
}

c := Counter{}
c.Increment()
c.Increment()
fmt.Println(c.GetCount()) // 2
```

> **規則**：同一個 struct 的方法，建議統一用指標接收者或值接收者，不要混用，避免行為不一致。

---

## 2. Slice：動態陣列的底層原理

### 2-1. make 與 new：初始化的差異

Slice、Map、Channel 的零值都是 `nil`，直接使用會 panic 或永遠阻塞：

```go
var s []int
var m map[string]int

s = append(s, 1) // 可以，append 遇到 nil slice 會自動分配
m["key"] = 1     // panic：assignment to entry in nil map
```

`make` 負責**分配記憶體並初始化內部結構**，讓它們可以立即使用：

```go
// Slice：make([]T, len) 或 make([]T, len, cap)
s1 := make([]int, 3)      // [0 0 0]，len=3, cap=3
s2 := make([]int, 0, 10)  // []，len=0, cap=10（最常見：先預留，再 append）

// Map：make(map[K]V) 或 make(map[K]V, hint)
m1 := make(map[string]int)       // 空 map，可直接寫入
m2 := make(map[string]int, 100)  // 預估放 100 個 key，減少擴容

// Channel：make(chan T) 或 make(chan T, n)
ch1 := make(chan int)    // 無緩衝
ch2 := make(chan int, 5) // 緩衝大小 5
```

`new` 也是內建函數，但行為不同：

```go
p := new(int)              // 回傳 *int，*p = 0，可以使用
m := new(map[string]int)   // 回傳 *map，但 *m 仍是 nil，不能寫入！
```

```text
new(T)  → 分配記憶體 → 回傳 *T（指標），值是 T 的零值
make(T) → 分配 + 初始化內部結構 → 回傳 T（非指標），可立即使用
```

| | `make` | `new` |
| :--- | :--- | :--- |
| 適用型別 | Slice、Map、Channel | 任何型別 |
| 回傳值 | 初始化好的值（非指標） | 指向零值的指標 |
| 可立即使用 | 是 | Slice/Map/Channel 仍是 nil |
| 實務使用頻率 | 高 | 低（通常用 `&T{}` 取代） |

---

### 2-2. Slice 的底層結構

Slice 看起來像動態陣列，但底層其實是一個包含三個欄位的 header：

```text
Slice 的內部結構：

┌──────────┬─────┬─────┐
│  ptr     │ len │ cap │
│（指向底層 │（長 │（容 │
│  陣列）  │ 度） │ 量） │
└──────────┴─────┴─────┘
      │
      ↓
┌───┬───┬───┬───┬───┐
│ 0 │ 1 │ 2 │   │   │  ← 底層陣列（實際儲存資料的地方）
└───┴───┴───┴───┴───┘
  0   1   2   3   4    ← index
```

```text
make([]int, 3, 5) 的記憶體配置：

┌─────┬─────┬─────┐
│ ptr │ len │ cap │   ← Slice header（3 個欄位）
│     │  3  │  5  │
└──┬──┴─────┴─────┘
   ↓
┌───┬───┬───┬───┬───┐
│ 0 │ 0 │ 0 │   │   │  ← 底層陣列（len=3 初始化為零，後 2 個預留）
└───┴───┴───┴───┴───┘
```

| 欄位 | 說明 |
| :--- | :--- |
| `ptr` | 指向底層陣列的起始位址 |
| `len`（長度） | 目前儲存了幾個元素，`len(s)` 取得 |
| `cap`（容量） | 底層陣列最多能放幾個，`cap(s)` 取得 |

```go
s := make([]int, 3, 5) // 長度 3，容量 5
fmt.Println(len(s)) // 3
fmt.Println(cap(s)) // 5

s = append(s, 10)   // 使用預留容量，不需重新分配
fmt.Println(len(s)) // 4
fmt.Println(cap(s)) // 5（容量未變）
```

---

### 2-3. append 的擴容機制

當 `len == cap` 時繼續 `append`，Go 會自動**重新分配一塊更大的底層陣列**（通常是原來的 2 倍），並把舊資料複製過去。

```go
s := make([]int, 0, 2)
fmt.Println(len(s), cap(s)) // 0 2

s = append(s, 1)
fmt.Println(len(s), cap(s)) // 1 2

s = append(s, 2)
fmt.Println(len(s), cap(s)) // 2 2

s = append(s, 3) // 容量不夠，觸發擴容！
fmt.Println(len(s), cap(s)) // 3 4（新容量變 4）
```

```text
擴容過程：

舊底層陣列：  [1][2]         容量 2，已滿
                              ↓ append(s, 3)
新底層陣列：  [1][2][3][ ]   容量 4，複製舊資料 + 新元素
```

> **效能提示**：如果知道大概需要多少元素，提前用 `make([]int, 0, n)` 指定容量，可以避免多次擴容。

---

### 2-4. 共享底層陣列的陷阱

切片操作（`s[a:b]`）產生的新 slice 會**共享同一個底層陣列**：

```go
original := []int{1, 2, 3, 4, 5}
sub := original[1:3] // 取 index 1 到 2

fmt.Println(sub) // [2 3]

sub[0] = 99      // 修改 sub
fmt.Println(original) // [1 99 3 4 5]，original 也被改了！
```

```text
original:  [1][99][3][4][5]
               ↑   ↑
sub:          [99][3]        ← 共享同一塊記憶體
```

**避免共享，用 copy：**

```go
original := []int{1, 2, 3, 4, 5}
sub := make([]int, 2)
copy(sub, original[1:3]) // 複製到獨立的底層陣列

sub[0] = 99
fmt.Println(original) // [1 2 3 4 5]，不受影響
```

---

## 3. Map：雜湊表與併發安全

### 3-1. Map 的底層原理與基本操作

Map 是一個雜湊表（hash table），Go runtime 在底層管理所有的雜湊計算與桶（bucket）分配。

```go
m := make(map[string]int)
m["apple"] = 3
m["banana"] = 5

// 讀取（key 不存在時回傳零值，不 panic）
fmt.Println(m["apple"])   // 3
fmt.Println(m["cherry"])  // 0

// 判斷 key 是否存在（雙回傳值）
val, ok := m["cherry"]
fmt.Println(val, ok) // 0 false

// 刪除
delete(m, "apple")
```

> **注意**：Map 的 `range` 迭代順序**每次都不固定**，這是刻意設計的，不能依賴順序。

---

### 3-2. 併發讀寫的問題

Map 在 Go 中**不是執行緒安全的**。多個 Goroutine 同時讀寫同一個 map，會造成 panic 或資料損毀。

```go
// 危險：兩個 goroutine 同時寫 map
m := map[string]int{}
go func() { m["a"] = 1 }()
go func() { m["b"] = 2 }()
// panic: concurrent map writes
```

---

### 3-3. 解法一：map + sync.Mutex

最直接的方案，讀寫都加鎖，適合讀寫都頻繁的場景。

```go
type SafeMap struct {
    mu sync.RWMutex
    m  map[string]int
}

func NewSafeMap() *SafeMap {
    return &SafeMap{m: make(map[string]int)}
}

func (s *SafeMap) Set(key string, val int) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.m[key] = val
}

func (s *SafeMap) Get(key string) (int, bool) {
    s.mu.RLock() // 讀取用 RLock，允許多個 goroutine 同時讀
    defer s.mu.RUnlock()
    v, ok := s.m[key]
    return v, ok
}
```

---

### 3-4. 解法二：sync.Map（讀多寫少）

Go 標準庫提供的併發安全 Map，針對「讀遠多於寫」的場景優化。

```go
var sm sync.Map

// 寫入
sm.Store("a", 1)

// 讀取
val, ok := sm.Load("a")
fmt.Println(val, ok) // 1 true

// 刪除
sm.Delete("a")

// 遍歷（回傳 false 停止）
sm.Range(func(key, value any) bool {
    fmt.Println(key, value)
    return true
})
```

> **注意**：`sync.Map` 在寫入頻繁時效能反而比 `map + Mutex` 差，不要無腦替換。

---

### 3-5. 解法三：分片鎖（高併發寫入）

把一個大 map 切成 N 個小 map（shard），每個 shard 有獨立的鎖。寫入時只鎖住對應的 shard，其餘 shard 不受影響，大幅降低鎖的競爭。

```text
一般 map + Mutex：          分片鎖（32 個 shard）：

┌──────────────┐            ┌──────┐ ┌──────┐ ┌──────┐
│   一把大鎖   │            │ 鎖 0 │ │ 鎖 1 │ │ 鎖 2 │ ...
│  map[key]val │            │ map  │ │ map  │ │ map  │
└──────────────┘            └──────┘ └──────┘ └──────┘
所有 goroutine 搶同一把鎖    每把鎖只保護 1/32 的資料
```

```go
package main

import (
    "fmt"
    "hash/fnv"
    "sync"
)

const shardCount = 32

type ShardedMap struct {
    shards [shardCount]*shard
}

type shard struct {
    mu sync.RWMutex
    m  map[string]any
}

func NewShardedMap() *ShardedMap {
    sm := &ShardedMap{}
    for i := range sm.shards {
        sm.shards[i] = &shard{m: make(map[string]any)}
    }
    return sm
}

// getShard 用 FNV hash 決定 key 落在哪個 shard
func (sm *ShardedMap) getShard(key string) *shard {
    h := fnv.New32a()
    h.Write([]byte(key))
    return sm.shards[h.Sum32()%shardCount]
}

func (sm *ShardedMap) Set(key string, value any) {
    s := sm.getShard(key)
    s.mu.Lock()
    defer s.mu.Unlock()
    s.m[key] = value
}

func (sm *ShardedMap) Get(key string) (any, bool) {
    s := sm.getShard(key)
    s.mu.RLock()
    defer s.mu.RUnlock()
    v, ok := s.m[key]
    return v, ok
}

func (sm *ShardedMap) Delete(key string) {
    s := sm.getShard(key)
    s.mu.Lock()
    defer s.mu.Unlock()
    delete(s.m, key)
}

func main() {
    sm := NewShardedMap()

    var wg sync.WaitGroup
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func(n int) {
            defer wg.Done()
            sm.Set(fmt.Sprintf("key-%d", n), n)
        }(i)
    }
    wg.Wait()

    if v, ok := sm.Get("key-42"); ok {
        fmt.Println("key-42 =", v) // key-42 = 42
    }
}
```

FNV（Fowler-Noll-Vo）是一種非密碼學 hash 函數，計算極快、分佈均勻，`hash/fnv` 是 Go 標準庫，不需要額外依賴。

---

### 3-6. 三種方案的選擇指南

| 方案 | 讀效能 | 寫效能 | 適用場景 |
| :--- | :--- | :--- | :--- |
| `map` + `sync.Mutex` | 中 | 中 | 一般併發，簡單優先 |
| `sync.Map` | 高（讀多時） | 低（寫多時） | 讀遠多於寫 |
| 分片鎖 | 高 | 高 | 讀寫都頻繁、高吞吐量 |

> **建議**：除非 Benchmark 確認是效能瓶頸，否則優先用 `map + Mutex`，分片鎖實作較複雜，引入時機要謹慎。

---

## 4. 介面設計：鴨子類型與隱式實現

### 4-1. 什麼是介面（Interface）？

介面定義了「一組方法的集合」，任何型別只要實作了這些方法，就自動滿足這個介面，**不需要宣告 `implements`**。

這就是「鴨子類型（Duck Typing）」：
> 「如果它走路像鴨子、叫聲像鴨子，那它就是鴨子。」

```go
type Animal interface {
    Speak() string
}

type Dog struct{ Name string }
func (d Dog) Speak() string { return "汪！" }

type Cat struct{ Name string }
func (c Cat) Speak() string { return "喵～" }

func makeSound(a Animal) {
    fmt.Println(a.Speak())
}

makeSound(Dog{Name: "小黑"}) // 汪！
makeSound(Cat{Name: "花花"}) // 喵～
```

---

### 4-2. 隱式實現 vs 顯式實現

Go 與其他語言的關鍵差異：

```text
Java / C#（顯式）：
  class Dog implements Animal { ... }  ← 必須明確宣告

Go（隱式）：
  type Dog struct { ... }
  func (d Dog) Speak() string { ... }  ← 只要方法簽名相符，自動滿足
```

好處：**解耦合**。你不需要知道一個型別是否「打算」實作某個介面，只要它有對應的方法就行。你甚至可以為別人的 struct 定義介面，而不需要修改原始程式碼。

---

### 4-3. 編譯期驗證慣用法

隱式實現的缺點是：少寫了某個方法，執行時才發現。Go 社群有一個慣用技巧，能在**編譯時**強制驗證：

```go
var _ Animal = (*Dog)(nil)
```

```text
var _            → 空白識別字，只觸發型別檢查，不使用這個變數
Animal           → 要驗證的介面
(*Dog)(nil)      → Dog 指標的 nil 值，不分配記憶體，純粹做型別比對
```

```go
type Animal interface {
    Speak() string
    Move()
}

type Dog struct{}
func (d *Dog) Speak() string { return "汪" }
// 故意忘記實作 Move()

var _ Animal = (*Dog)(nil)
// 編譯報錯：*Dog does not implement Animal (missing Move method)
```

值接收者與指標接收者的差異：

```go
type Dog struct{}
func (d Dog) Speak() string { return "汪" } // 值接收者

var _ Animal = Dog{}       // 通過
var _ Animal = (*Dog)(nil) // 通過

type Cat struct{}
func (c *Cat) Speak() string { return "喵" } // 指標接收者

var _ Animal = (*Cat)(nil) // 通過
var _ Animal = Cat{}       // 編譯錯誤！值型別無法使用指標接收者的方法
```

**慣例放置位置**：緊接在型別定義之後，作為「意圖宣告」：

```go
type MySQLDB struct{ conn *sql.DB }

var _ Database = (*MySQLDB)(nil) // 明確宣告必須完整實作 Database 介面

func (m *MySQLDB) Insert(user User) error         { ... }
func (m *MySQLDB) FindByID(id int) (User, error)  { ... }
```

| | 隱式（預設） | 編譯期驗證 |
| :--- | :--- | :--- |
| 宣告方式 | 不需要任何宣告 | `var _ Interface = (*Type)(nil)` |
| 發現缺少方法 | 執行時 panic 或編譯報錯（視情況） | 編譯時立即報錯 |
| 適用場景 | 快速開發、小型專案 | 函式庫、大型專案、需明確意圖 |

---

### 4-4. 介面的實際用途：依賴抽象

```go
// 沒有介面：只能處理 MySQL，改用其他資料庫就要改程式碼
func saveUser(db *MySQL, user User) {
    db.Insert(user)
}

// 用介面：不在乎具體型別，只要實作 Database 介面就行
type Database interface {
    Insert(user User) error
    FindByID(id int) (User, error)
}

func saveUser(db Database, user User) error {
    return db.Insert(user)
}

// 可以自由切換，saveUser 完全不用改
saveUser(&MySQL{}, user)
saveUser(&PostgreSQL{}, user)
```

---

### 4-5. 空介面（any）：接受任何型別

`interface{}`（Go 1.18+ 可以寫 `any`）是沒有任何方法的介面，**所有型別都滿足它**。

```go
func printAnything(v any) {
    fmt.Println(v)
}

printAnything(42)         // 整數
printAnything("hello")    // 字串
printAnything([]int{1,2}) // slice
```

> 雖然方便，但用太多 `any` 會失去型別安全的好處，應優先使用具體介面或泛型（Go 1.18+）。

---

### 4-6. 型別斷言（Type Assertion）

當你有一個介面值，想取出它實際的型別時，用型別斷言：

```go
var a Animal = Dog{Name: "小黑"}

// 直接斷言（確定型別時用）
d := a.(Dog)
fmt.Println(d.Name) // 小黑

// 若型別不符，會 panic
// c := a.(Cat) // panic: interface conversion

// 安全斷言（不確定型別時用，一律優先）
d, ok := a.(Dog)
if ok {
    fmt.Println("是 Dog：", d.Name)
}
```

---

### 4-7. 介面升級：斷言成另一個介面

檢查一個型別是否「額外」實作了某個介面，選擇性地呼叫擴充方法——這是標準庫大量使用的模式：

```go
type Animal interface { Speak() string }
type Swimmer interface { Swim() string }

type Dog struct{}
func (d Dog) Speak() string { return "汪" }
func (d Dog) Swim() string  { return "狗爬式！" }

type Cat struct{}
func (c Cat) Speak() string { return "喵" }

func describe(a Animal) {
    fmt.Println(a.Speak())
    if s, ok := a.(Swimmer); ok {
        fmt.Println("會游泳：", s.Swim())
    }
}

describe(Dog{}) // 汪 → 會游泳：狗爬式！
describe(Cat{}) // 喵
```

```text
Animal（基本介面）      Swimmer（擴充介面）
┌──────────┐           ┌──────────┐
│ Speak()  │           │ Swim()   │
└──────────┘           └──────────┘
      ↑                      ↑
   Dog 同時實作兩個介面
   Cat 只實作 Animal

a.(Swimmer) → 執行時動態檢查，不符合只是 ok=false，不會 panic
```

標準庫的實際應用：

```go
// http.Flusher：支援的情況下才呼叫，不支援也不 panic
if flusher, ok := w.(http.Flusher); ok {
    flusher.Flush()
}
```

| 寫法 | 目的 | 型別不符時 |
| :--- | :--- | :--- |
| `a.(Dog)` | 取出具體型別 | panic |
| `d, ok := a.(Dog)` | 安全取出具體型別 | ok = false |
| `s, ok := a.(Swimmer)` | 介面升級，呼叫擴充方法 | ok = false |

---

### 4-8. 型別選擇（Type Switch）

當介面可能是多種型別時，用 `switch` 逐一比對：

```go
func describe(i any) {
    switch v := i.(type) {
    case int:
        fmt.Printf("整數，值是 %d\n", v)
    case string:
        fmt.Printf("字串，值是 %q\n", v)
    case bool:
        fmt.Printf("布林，值是 %t\n", v)
    case Dog:
        fmt.Printf("是狗，名字是 %s\n", v.Name)
    default:
        fmt.Printf("未知型別：%T\n", v)
    }
}
```

---

### 4-9. 組合介面

介面可以像 struct 一樣組合，把多個介面合併成一個更大的介面：

```go
type Reader interface { Read() string }
type Writer interface { Write(s string) }
type Closer interface { Close() error }

// ReadWriteCloser 同時要求實作三個介面
type ReadWriteCloser interface {
    Reader
    Writer
    Closer
}

type File struct{ content string }
func (f *File) Read() string   { return f.content }
func (f *File) Write(s string) { f.content = s }
func (f *File) Close() error   { return nil }

var rwc ReadWriteCloser = &File{}
```

---

### 4-10. 介面設計原則

小介面優於大介面：

```go
// 不好：一個介面塞太多方法，實作者負擔重
type BigInterface interface {
    Read() string
    Write(s string)
    Delete()
    List() []string
    Connect() error
    Close() error
}

// 好：小介面，各司其職，按需組合
type Reader interface { Read() string }
type Writer interface { Write(s string) }
type Closer interface { Close() error }
```

> Go 標準庫最著名的 `io.Reader` 只有一個方法：`Read(p []byte) (n int, err error)`，這就是小介面的最佳典範。

---

## 總結對照表

| 觀念 | 核心重點 | 最常見錯誤 |
| :--- | :--- | :--- |
| 傳值 | 複製資料，安全但有成本 | 以為函數內修改會影響外部 |
| 傳址（指標） | 傳位址，直接操作原始資料 | 使用 nil 指標導致 panic |
| make vs new | make 初始化內部結構，new 只分配記憶體 | 用 new 初始化 map 後直接寫入導致 panic |
| Slice len/cap | len 是當前長度，cap 是底層陣列容量 | 切片操作共享底層陣列，修改互相影響 |
| Map 併發 | map 非執行緒安全，並發需加鎖 | 多個 goroutine 同時寫 map 導致 panic |
| 分片鎖 | N 個 shard 各有獨立鎖，降低競爭 | 過早優化，未 Benchmark 就引入 |
| 介面隱式實現 | 有對應方法就自動滿足，不需宣告 | 忘記用指標接收者導致介面未實現 |
| 型別斷言 | 從介面取出具體型別，用 ok 判斷 | 直接斷言錯誤型別導致 panic |

---

[← 返回目錄](README.md)

文件更新日期：2026年6月2日
