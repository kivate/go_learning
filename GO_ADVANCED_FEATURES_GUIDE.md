# Go 進階語言特性指南

[← 返回目錄](README.md)

本文件適合已掌握 Go 基礎語法（變數、函數、struct、介面、goroutine）的開發者，深入探討 Go 語言中較少見但非常重要的進階特性。涵蓋 `init()` 執行機制、`iota` 常數枚舉、具名回傳值、型別系統、反射、條件編譯、靜態資源嵌入、高階函數，以及 `unsafe` 套件的基礎認識。讀完本文件後，你將能撰寫更慣用、更有效率的 Go 程式碼，並理解許多知名開源套件背後的實作原理。

---

## 1. init() 函數

### 1-1 init() 是什麼？與 main() 的執行順序

`init()` 是 Go 提供的一個特殊函數，在套件被載入時**自動執行**，不需要也不能被手動呼叫。它沒有參數，也沒有回傳值。

執行順序：**全域變數初始化 → `init()` → `main()`**

```go
package main

import "fmt"

var greeting = initGreeting()

func initGreeting() string {
    fmt.Println("1. 全域變數初始化")
    return "Hello"
}

func init() {
    fmt.Println("2. init() 執行")
}

func main() {
    fmt.Println("3. main() 執行")
    fmt.Println(greeting)
}
```

```text
輸出：
1. 全域變數初始化
2. init() 執行
3. main() 執行
Hello
```

### 1-2 同一個檔案多個 init()

Go 允許同一個檔案（甚至同一個套件）中定義多個 `init()` 函數。它們會**依序**執行，順序為在檔案中出現的先後順序。

```go
package main

import "fmt"

func init() {
    fmt.Println("init() 第一個")
}

func init() {
    fmt.Println("init() 第二個")
}

func init() {
    fmt.Println("init() 第三個")
}

func main() {
    fmt.Println("main() 執行")
}
```

```text
輸出：
init() 第一個
init() 第二個
init() 第三個
main() 執行
```

> **注意**：雖然語法合法，但同一個檔案定義多個 `init()` 會降低可讀性。除非有明確的分組理由，否則建議合併為一個。

### 1-3 跨套件的 init() 執行順序（import 依賴圖）

Go 的套件初始化遵循**依賴優先**原則：被 import 的套件一定比 import 它的套件先初始化。

假設有以下套件結構：

```text
main
├── import pkgA
│   └── import pkgC
└── import pkgB
    └── import pkgC  （同一個 pkgC，只初始化一次）
```

執行順序：`pkgC → pkgA → pkgB → main`

若 `pkgA` 和 `pkgB` 同層且都依賴 `pkgC`，`pkgC` 只會初始化一次（Go runtime 保證）。

### 1-4 用 ASCII 圖解說明執行順序

```text
套件依賴圖：

  main
  ├── import "myapp/config"   ← 先初始化
  │   └── import "myapp/logger"  ← 最先初始化
  └── import "myapp/db"       ← 第二初始化
      └── import "myapp/logger"  ← 已初始化，跳過

執行順序：

┌─────────────────────────────────────────────────┐
│  logger 套件                                     │
│  1. 全域變數初始化                                │
│  2. logger.init()                                │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│  config 套件                                     │
│  3. 全域變數初始化                                │
│  4. config.init()                                │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│  db 套件                                         │
│  5. 全域變數初始化                                │
│  6. db.init()                                    │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│  main 套件                                       │
│  7. 全域變數初始化                                │
│  8. main.init()                                  │
│  9. main.main()                                  │
└─────────────────────────────────────────────────┘
```

### 1-5 init() 的合理使用場景

`init()` 適合用來做**無法在宣告時完成的一次性初始化**：

```go
package config

import (
    "log"
    "os"
)

var (
    AppName string
    Debug   bool
)

func init() {
    // 從環境變數讀取設定，適合放在 init()
    AppName = os.Getenv("APP_NAME")
    if AppName == "" {
        AppName = "my-app"
    }

    if os.Getenv("DEBUG") == "true" {
        Debug = true
    }

    log.Printf("config 初始化完成：AppName=%s, Debug=%v", AppName, Debug)
}
```

另一個常見場景是**注冊資料庫驅動**：

```go
package main

import (
    "database/sql"
    _ "github.com/lib/pq" // 只需要 init() 的副作用，用空白 import
)

func main() {
    db, err := sql.Open("postgres", "...")
    if err != nil {
        panic(err)
    }
    defer db.Close()
}
```

空白 import `_ "github.com/lib/pq"` 的目的就是觸發該套件的 `init()`，讓它向 `database/sql` 注冊驅動。

> **建議**：`init()` 適合以下場景：
>
> * 注冊插件／驅動（如資料庫驅動）
> * 讀取環境變數設定全域設定值
> * 初始化查詢表（lookup table）、正規表達式等靜態資料

### 1-6 常見陷阱：init() 中的複雜邏輯

> **警告**：`init()` 中的錯誤**無法被 caller 捕捉**。如果初始化失敗，只能 `panic` 或 `log.Fatal`，而且這讓測試變得困難。

```go
// 不好的寫法：在 init() 中連線資料庫
func init() {
    db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
    if err != nil {
        panic(err) // 測試時很難控制這個行為
    }
    globalDB = db
}

// 好的寫法：提供明確的初始化函數，讓呼叫方決定何時初始化
func InitDB(dsn string) (*sql.DB, error) {
    return sql.Open("postgres", dsn)
}
```

---

## 2. iota：常數枚舉

### 2-1 基本用法

`iota` 是 Go 在 `const` 區塊中的計數器，從 `0` 開始，每行遞增 `1`。

```go
package main

import "fmt"

type Weekday int

const (
    Sunday Weekday = iota // 0
    Monday                // 1
    Tuesday               // 2
    Wednesday             // 3
    Thursday              // 4
    Friday                // 5
    Saturday              // 6
)

func main() {
    fmt.Println(Sunday, Monday, Tuesday) // 0 1 2
}
```

```text
輸出：
0 1 2
```

### 2-2 跳值與自訂表達式

可以用 `_` 跳過某個值，或用表達式讓 `iota` 產生非線性的序列：

```go
package main

import "fmt"

type ByteSize float64

const (
    _           = iota             // 跳過 0
    KB ByteSize = 1 << (10 * iota) // 1 << 10 = 1024
    MB                             // 1 << 20
    GB                             // 1 << 30
    TB                             // 1 << 40
)

func main() {
    fmt.Printf("KB = %.0f\n", float64(KB))
    fmt.Printf("MB = %.0f\n", float64(MB))
    fmt.Printf("GB = %.0f\n", float64(GB))
}
```

```text
輸出：
KB = 1024
MB = 1048576
GB = 1073741824
```

### 2-3 位元旗標（BitFlag）：用 iota 實作

位元旗標（Bit Flag）讓你可以用一個整數同時表示多個選項，使用 `|` 組合、`&` 檢查：

```go
package main

import "fmt"

type Permission uint

const (
    PermRead    Permission = 1 << iota // 1  (001)
    PermWrite                          // 2  (010)
    PermExecute                        // 4  (100)
)

func HasPermission(user, required Permission) bool {
    return user&required == required
}

func main() {
    // 使用者同時擁有讀取和寫入權限
    userPerm := PermRead | PermWrite // 1 | 2 = 3 (011)

    fmt.Printf("使用者權限: %03b\n", userPerm)

    fmt.Println("可讀取:", HasPermission(userPerm, PermRead))    // true
    fmt.Println("可寫入:", HasPermission(userPerm, PermWrite))   // true
    fmt.Println("可執行:", HasPermission(userPerm, PermExecute)) // false

    // 移除寫入權限：用 &^ (AND NOT)
    userPerm &^= PermWrite
    fmt.Printf("移除寫入後: %03b\n", userPerm) // 001
}
```

```text
輸出：
使用者權限: 011
可讀取: true
可寫入: true
可執行: false
移除寫入後: 001
```

### 2-4 Stringer 介面搭配 iota

實作 `String()` 方法讓列舉值可以直接印出有意義的名稱：

```go
package main

import "fmt"

type Color int

const (
    Red Color = iota
    Green
    Blue
)

func (c Color) String() string {
    switch c {
    case Red:
        return "Red"
    case Green:
        return "Green"
    case Blue:
        return "Blue"
    default:
        return fmt.Sprintf("Color(%d)", int(c))
    }
}

func main() {
    c := Green
    fmt.Println(c)        // Green（自動呼叫 String()）
    fmt.Printf("%v\n", c) // Green
    fmt.Printf("%d\n", c) // 1（用 %d 可取得底層整數）
}
```

```text
輸出：
Green
Green
1
```

> **建議**：可以使用 `go generate` + `stringer` 工具自動生成 `String()` 方法，避免手動維護：
>
> ```bash
> go install golang.org/x/tools/cmd/stringer@latest
> ```

### 2-5 常見陷阱：第一個常數的零值

> **警告**：`iota` 的第一個值是 `0`，這等同於 Go 的**零值**（zero value）。如果沒有特別處理，一個未初始化的變數會看起來像是有效的枚舉值。

```go
package main

import "fmt"

type Status int

// 不好的設計：Active = 0 容易與未初始化混淆
const (
    Active   Status = iota // 0
    Inactive               // 1
    Deleted                // 2
)

// 好的設計：讓 0 表示「未知/無效」
const (
    StatusUnknown  Status = iota // 0 ← 零值，代表「未設定」
    StatusActive                 // 1
    StatusInactive               // 2
    StatusDeleted                // 3
)

func main() {
    var s Status // 未初始化，值為 0
    fmt.Println(s == StatusUnknown) // true，語意清楚
}
```

---

## 3. 具名回傳值（Named Return Values）

### 3-1 語法與基本用法

具名回傳值（Named Return Values）讓函數可以在簽名中給回傳值命名，它們會被當作在函數頂端宣告的區域變數：

```go
package main

import (
    "errors"
    "fmt"
)

// 具名回傳值
func divide(a, b float64) (result float64, err error) {
    if b == 0 {
        err = errors.New("除數不能為零")
        return // naked return，等同 return result, err
    }
    result = a / b
    return // naked return，等同 return result, err
}

func main() {
    result, err := divide(10, 3)
    if err != nil {
        fmt.Println("錯誤:", err)
        return
    }
    fmt.Printf("結果: %.4f\n", result)
}
```

```text
輸出：
結果: 3.3333
```

### 3-2 naked return（裸 return）

具名回傳值可以使用「裸 return」（`return` 不帶任何值），直接回傳當前具名變數的值：

```go
package main

import "fmt"

func minMax(nums []int) (min, max int) {
    if len(nums) == 0 {
        return // min=0, max=0（零值）
    }
    min, max = nums[0], nums[0]
    for _, n := range nums[1:] {
        if n < min {
            min = n
        }
        if n > max {
            max = n
        }
    }
    return // 裸 return：回傳當前 min, max
}

func main() {
    mn, mx := minMax([]int{3, 1, 4, 1, 5, 9, 2, 6})
    fmt.Printf("最小值: %d, 最大值: %d\n", mn, mx)
}
```

```text
輸出：
最小值: 1, 最大值: 9
```

> **注意**：裸 return 在短函數中可以增加可讀性，但在長函數中容易讓讀者搞不清楚回傳了什麼值，應謹慎使用。

### 3-3 與 defer 的互動（修改回傳值）

這是 Go 中最微妙的特性之一：**具名回傳值可以在 `defer` 中被修改**。

執行步驟說明：

```text
函數執行流程（具名回傳值 + defer）：

1. 函數開始，具名回傳值 err 被宣告並初始化為 nil
2. 業務邏輯執行
3. 遇到 return 語句：
   a. 將 return 的值賦給具名回傳值（err = someError）
   b. 執行 defer 函數（此時可以讀取並修改 err）
   c. 函數真正回傳（回傳的是被 defer 可能修改過的值）
```

```go
package main

import (
    "errors"
    "fmt"
)

var ErrDatabase = errors.New("資料庫錯誤")

// 使用 defer 包裝錯誤，加上 context
func queryUser(id int) (user string, err error) {
    defer func() {
        if err != nil {
            // 在 defer 中修改具名回傳值 err
            err = fmt.Errorf("queryUser id=%d: %w", id, err)
        }
    }()

    if id <= 0 {
        return "", ErrDatabase // defer 會包裝這個 error
    }

    return "Alice", nil // defer 看到 err=nil，不做任何事
}

func main() {
    user, err := queryUser(0)
    if err != nil {
        fmt.Println("錯誤:", err)
        // 仍然可以用 errors.Is 解開包裝
        fmt.Println("是資料庫錯誤:", errors.Is(err, ErrDatabase))
        return
    }
    fmt.Println("使用者:", user)
}
```

```text
輸出：
錯誤: queryUser id=0: 資料庫錯誤
是資料庫錯誤: true
```

### 3-4 何時用、何時避免

```text
✅ 適合使用具名回傳值：
* 函數短（< 20 行），裸 return 不影響閱讀
* 需要在 defer 中修改 error（常見模式）
* 多個回傳值含義不明確，命名可增加自解釋性

❌ 避免使用的情況：
* 函數很長，裸 return 讓人不知道回傳什麼
* 具名變數名稱沒有增加任何資訊（如 result, err 在大多數情況下都這樣叫）
```

### 3-5 實際應用：資源清理函數

```go
package main

import (
    "fmt"
    "os"
)

// 開啟檔案並確保任何錯誤都被正確包裝
func openAndProcess(path string) (content []byte, err error) {
    f, err := os.Open(path)
    if err != nil {
        return nil, fmt.Errorf("openAndProcess: %w", err)
    }
    defer func() {
        if closeErr := f.Close(); closeErr != nil && err == nil {
            // 只在沒有其他錯誤時才回報 close 錯誤
            err = fmt.Errorf("openAndProcess close: %w", closeErr)
        }
    }()

    content, err = os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("openAndProcess read: %w", err)
    }
    return content, nil
}

func main() {
    content, err := openAndProcess("go.mod")
    if err != nil {
        fmt.Println("錯誤:", err)
        return
    }
    fmt.Printf("讀取 %d 個位元組\n", len(content))
}
```

---

## 4. 型別別名 vs 型別定義

### 4-1 型別別名（type A = B）

型別別名（Type Alias）讓 `A` 完全等同於 `B`，它們是**同一個型別**，可以互相賦值，方法集完全相同：

```go
package main

import "fmt"

type MyString = string // 型別別名，MyString 就是 string

func printString(s string) {
    fmt.Println(s)
}

func main() {
    var s MyString = "Hello"
    printString(s) // ✅ 可以直接傳入，因為 MyString 就是 string

    var t string = s // ✅ 直接賦值，不需要轉換
    fmt.Println(t)
}
```

```text
輸出：
Hello
Hello
```

### 4-2 型別定義（type A B）

型別定義（Type Definition）建立一個**全新的型別**，雖然底層型別相同，但它們是不同的型別，不能直接互相賦值，也不繼承方法集：

```go
package main

import "fmt"

type Celsius float64    // 型別定義
type Fahrenheit float64 // 型別定義

func (c Celsius) ToFahrenheit() Fahrenheit {
    return Fahrenheit(c*9/5 + 32)
}

func main() {
    boiling := Celsius(100)
    fmt.Printf("%.1f°C = %.1f°F\n", boiling, boiling.ToFahrenheit())

    // var temp float64 = boiling // ❌ 編譯錯誤：不同型別
    var temp float64 = float64(boiling) // ✅ 必須明確轉換
    fmt.Println(temp)
}
```

```text
輸出：
100.0°C = 212.0°F
100
```

### 4-3 兩者的差異（可賦值性、方法集）

```text
┌─────────────────┬─────────────────────────┬─────────────────────────┐
│ 特性            │ 型別別名 (type A = B)    │ 型別定義 (type A B)     │
├─────────────────┼─────────────────────────┼─────────────────────────┤
│ 是否同一型別    │ 是（A 就是 B）           │ 否（A 是新型別）         │
│ 直接賦值        │ ✅ 可以                  │ ❌ 需明確轉換            │
│ 繼承 B 的方法   │ ✅ 完整繼承              │ ❌ 不繼承（需重新定義）   │
│ 可為 A 加方法   │ ❌ 不能（A 就是 B）      │ ✅ 可以                  │
│ 主要用途        │ 重構遷移、跨套件別名     │ 語義區分、新增行為       │
└─────────────────┴─────────────────────────┴─────────────────────────┘
```

### 4-4 型別定義的用途：語義區分

```go
package main

import "fmt"

// 用型別定義區分「使用者 ID」和「訂單 ID」
// 雖然底層都是 int64，但語義不同，可避免意外混用
type UserID int64
type OrderID int64

func GetUserOrders(userID UserID) []OrderID {
    fmt.Printf("查詢使用者 %d 的訂單\n", userID)
    return []OrderID{OrderID(1001), OrderID(1002)}
}

func main() {
    uid := UserID(42)
    oid := OrderID(999)

    orders := GetUserOrders(uid)
    fmt.Println("訂單:", orders)

    // GetUserOrders(oid) // ❌ 編譯錯誤：型別不符，有效防止 bug
    _ = oid
}
```

### 4-5 型別別名的用途：重構與遷移

型別別名最常見的使用場景是**跨套件重構**，讓舊名稱繼續可用的同時指向新位置：

```go
// 舊套件 oldpkg/user.go
package oldpkg

// 重構時，User 已移至 newpkg，但為了向下相容保留別名
// type User = newpkg.User
```

Go 標準庫中 `io` 和 `os` 套件就大量使用型別別名做重構遷移。

---

## 5. reflect 反射套件

### 5-1 什麼是反射？什麼時候需要它？

反射（Reflection）讓程式在**執行期間（runtime）**能夠檢查和操作自身的型別與值，而不需要在編譯期就知道確切的型別。

需要反射的典型場景：

* JSON/XML 序列化（`encoding/json` 內部大量使用）
* ORM 框架（將 struct 對應到資料庫欄位）
* 測試框架（`testing` 中的 `reflect.DeepEqual`）
* 依賴注入容器（根據型別自動注入依賴）

> **注意**：反射是一把雙面刃，它破壞了型別安全並帶來效能損耗。只在泛型和介面都無法解決的情況下才使用。

### 5-2 reflect.TypeOf 與 reflect.ValueOf

```go
package main

import (
    "fmt"
    "reflect"
)

type User struct {
    Name string
    Age  int
}

func main() {
    u := User{Name: "Alice", Age: 30}

    // reflect.TypeOf 取得型別資訊
    t := reflect.TypeOf(u)
    fmt.Println("型別名稱:", t.Name())   // User
    fmt.Println("套件路徑:", t.PkgPath()) // main

    // reflect.ValueOf 取得值資訊
    v := reflect.ValueOf(u)
    fmt.Println("值:", v)             // {Alice 30}
    fmt.Println("欄位數:", t.NumField()) // 2

    // 取得各欄位的值
    for i := 0; i < t.NumField(); i++ {
        field := t.Field(i)
        value := v.Field(i)
        fmt.Printf("  %s (%s) = %v\n", field.Name, field.Type, value)
    }
}
```

```text
輸出：
型別名稱: User
套件路徑: main
值: {Alice 30}
欄位數: 2
  Name (string) = Alice
  Age (int) = 30
```

### 5-3 Kind vs Type 的差異

`Type` 是具體型別（如 `User`、`int64`、`MyString`），`Kind` 是底層分類（如 `struct`、`int`、`string`）：

```go
package main

import (
    "fmt"
    "reflect"
)

type MyInt int
type User struct{ Name string }

func describe(i interface{}) {
    t := reflect.TypeOf(i)
    fmt.Printf("Type: %-15v Kind: %v\n", t, t.Kind())
}

func main() {
    describe(42)           // Type: int            Kind: int
    describe(MyInt(10))    // Type: main.MyInt      Kind: int
    describe("hello")      // Type: string          Kind: string
    describe(User{})       // Type: main.User        Kind: struct
    describe(&User{})      // Type: *main.User       Kind: ptr
    describe([]int{1, 2})  // Type: []int            Kind: slice
}
```

```text
輸出：
Type: int             Kind: int
Type: main.MyInt      Kind: int
Type: string          Kind: string
Type: main.User       Kind: struct
Type: *main.User      Kind: ptr
Type: []int           Kind: slice
```

### 5-4 讀取 struct 欄位與 Tag

```go
package main

import (
    "fmt"
    "reflect"
)

type Product struct {
    ID    int    `json:"id"    db:"product_id"`
    Name  string `json:"name"  db:"product_name"`
    Price float64 `json:"price" db:"price"`
}

func main() {
    t := reflect.TypeOf(Product{})

    for i := 0; i < t.NumField(); i++ {
        field := t.Field(i)
        jsonTag := field.Tag.Get("json")
        dbTag := field.Tag.Get("db")
        fmt.Printf("%-8s json:%-12s db:%s\n", field.Name, jsonTag, dbTag)
    }
}
```

```text
輸出：
ID       json:id           db:product_id
Name     json:name         db:product_name
Price    json:price        db:price
```

### 5-5 動態呼叫方法（reflect.Value.MethodByName）

```go
package main

import (
    "fmt"
    "reflect"
)

type Calculator struct {
    Value float64
}

func (c Calculator) Double() float64 {
    return c.Value * 2
}

func (c Calculator) Add(n float64) float64 {
    return c.Value + n
}

func callMethod(obj interface{}, methodName string, args ...interface{}) {
    v := reflect.ValueOf(obj)
    method := v.MethodByName(methodName)
    if !method.IsValid() {
        fmt.Printf("方法 %s 不存在\n", methodName)
        return
    }

    // 將 args 轉換為 []reflect.Value
    in := make([]reflect.Value, len(args))
    for i, arg := range args {
        in[i] = reflect.ValueOf(arg)
    }

    results := method.Call(in)
    for _, r := range results {
        fmt.Printf("%s 回傳: %v\n", methodName, r)
    }
}

func main() {
    c := Calculator{Value: 10}
    callMethod(c, "Double")
    callMethod(c, "Add", 5.5)
    callMethod(c, "Multiply") // 不存在的方法
}
```

```text
輸出：
Double 回傳: 20
Add 回傳: 15.5
方法 Multiply 不存在
```

### 5-6 修改值（CanSet 的條件）

要透過反射修改值，必須滿足兩個條件：

1. 傳入的必須是**指標**
2. 透過 `.Elem()` 解引用後，欄位必須是**可匯出**的（大寫開頭）

```text
修改值的必要步驟：

  傳入指標             取得指標的 Value        解引用（Elem）
  &myStruct    →    reflect.ValueOf(&s)   →   .Elem()   → 可修改的 Value
                                                              │
                                                              ▼
                                                         .Field(i).Set(...)
```

```go
package main

import (
    "fmt"
    "reflect"
)

type Config struct {
    Host string
    Port int
    Debug bool
}

func setField(obj interface{}, fieldName string, value interface{}) error {
    v := reflect.ValueOf(obj)
    if v.Kind() != reflect.Ptr {
        return fmt.Errorf("必須傳入指標")
    }

    // 透過 Elem() 解引用指標，取得可修改的 Value
    elem := v.Elem()
    field := elem.FieldByName(fieldName)
    if !field.IsValid() {
        return fmt.Errorf("欄位 %s 不存在", fieldName)
    }
    if !field.CanSet() {
        return fmt.Errorf("欄位 %s 不可修改（未匯出）", fieldName)
    }

    field.Set(reflect.ValueOf(value))
    return nil
}

func main() {
    cfg := Config{}
    setField(&cfg, "Host", "localhost")
    setField(&cfg, "Port", 8080)
    setField(&cfg, "Debug", true)
    fmt.Printf("%+v\n", cfg)
}
```

```text
輸出：
{Host:localhost Port:8080 Debug:true}
```

### 5-7 完整範例：實作一個簡單的 JSON 序列化

```go
package main

import (
    "fmt"
    "reflect"
    "strings"
)

// simpleToJSON 將 struct 序列化為 JSON 字串（僅支援基本型別，示範用途）
func simpleToJSON(obj interface{}) string {
    v := reflect.ValueOf(obj)
    t := reflect.TypeOf(obj)

    // 如果是指標，解引用
    if v.Kind() == reflect.Ptr {
        v = v.Elem()
        t = t.Elem()
    }

    if v.Kind() != reflect.Struct {
        return fmt.Sprintf("%v", v)
    }

    var parts []string
    for i := 0; i < t.NumField(); i++ {
        field := t.Field(i)
        fieldVal := v.Field(i)

        // 讀取 json tag，若無則使用欄位名稱小寫
        key := field.Tag.Get("json")
        if key == "" {
            key = strings.ToLower(field.Name)
        }

        var valStr string
        switch fieldVal.Kind() {
        case reflect.String:
            valStr = fmt.Sprintf("%q", fieldVal.String())
        case reflect.Int, reflect.Int64:
            valStr = fmt.Sprintf("%d", fieldVal.Int())
        case reflect.Bool:
            valStr = fmt.Sprintf("%t", fieldVal.Bool())
        default:
            valStr = fmt.Sprintf("%v", fieldVal)
        }

        parts = append(parts, fmt.Sprintf("%q:%s", key, valStr))
    }

    return "{" + strings.Join(parts, ",") + "}"
}

type Article struct {
    ID      int    `json:"id"`
    Title   string `json:"title"`
    Published bool `json:"published"`
}

func main() {
    a := Article{ID: 1, Title: "Go 反射入門", Published: true}
    fmt.Println(simpleToJSON(a))
    fmt.Println(simpleToJSON(&a)) // 指標也可以
}
```

```text
輸出：
{"id":1,"title":"Go 反射入門","published":true}
{"id":1,"title":"Go 反射入門","published":true}
```

### 5-8 效能警告：反射的成本

> **警告**：反射操作比直接操作**慢 10~100 倍**，並且會造成更多 GC 壓力（因為需要大量 interface{} boxing）。

以下是一個簡單的對比說明：

```text
操作                    相對耗時
直接欄位存取             1x（基準）
reflect.ValueOf         ~5x
.Field(i).Interface()   ~30x
.MethodByName().Call()  ~100x
```

在高頻呼叫路徑（如每個 HTTP request 都執行）中使用反射，必須搭配快取機制，或改用程式碼生成（`go generate`）。

### 5-9 何時用、何時避免反射

```text
✅ 適合使用反射：
* 撰寫通用序列化 / 反序列化工具
* 撰寫 ORM 或資料綁定框架
* 測試工具（reflect.DeepEqual）
* 依賴注入容器

❌ 不適合使用反射：
* 可以用介面（interface）解決的問題
* 可以用泛型（Go 1.18+）解決的問題
* 高頻執行路徑（每個請求都呼叫）
* 業務邏輯代碼（過度複雜、難以維護）
```

---

## 6. Build Tags（條件編譯）

### 6-1 //go:build 語法（Go 1.17+）

Build Tags 讓你能根據作業系統、CPU 架構、或自訂條件，決定某個檔案是否要被編譯。Go 1.17 引入了新的 `//go:build` 語法，放在**檔案的最頂端**，比 `import` 宣告還前面：

```go
//go:build linux

package main

// 這個檔案只在 Linux 上編譯
```

### 6-2 常用場景：作業系統、架構、測試環境

```go
//go:build windows

package syscall

// Windows 專屬的系統呼叫實作
```

```go
//go:build amd64 || arm64

package crypto

// 僅在 64 位元架構上使用的優化實作
```

Go 內建的 GOOS / GOARCH tag：

```text
作業系統 tag：linux, windows, darwin, freebsd
架構 tag：amd64, arm64, 386, arm
Go 版本 tag：go1.18, go1.21
```

### 6-3 整合測試標籤：//go:build integration

```go
//go:build integration

package repository_test

import (
    "context"
    "testing"
    "database/sql"
    _ "github.com/lib/pq"
)

// 這個測試需要真實資料庫，只在明確指定 integration tag 時才執行
func TestUserRepository_Integration(t *testing.T) {
    db, err := sql.Open("postgres", "postgres://localhost/testdb")
    if err != nil {
        t.Fatal(err)
    }
    defer db.Close()

    // ... 實際整合測試邏輯
    t.Log("整合測試通過")
}
```

### 6-4 多條件組合（&&、||、!）

```go
//go:build (linux || darwin) && amd64

package main
// 只在 Linux 或 macOS 的 64 位元版本編譯
```

```go
//go:build !windows

package main
// 除了 Windows 以外的所有平台
```

```go
//go:build integration && !race

package main
// 整合測試，但排除 race detector 模式
```

### 6-5 舊語法 // +build 的說明（向下相容）

Go 1.17 之前使用 `// +build` 語法，你可能在舊代碼中看到：

```go
// +build linux darwin
// +build amd64

package main
```

> **注意**：舊語法中，**同一行**用空格表示 `OR`，**不同行**表示 `AND`。這個規則非常容易混淆，這也是 Go 1.17 改用新語法的原因。

Go 1.17+ 鼓勵同時保留兩種格式以維持相容性：

```go
//go:build linux && amd64

// +build linux,amd64

package main
```

### 6-6 執行帶 tag 的測試

```bash
# 只執行有 integration tag 的測試
go test -tags integration ./...

# 執行所有測試（包含 integration）
go test -tags "integration unit" ./...

# 執行時帶 race detector
go test -race -tags integration ./...
```

---

## 7. //go:embed 嵌入靜態資源

### 7-1 為什麼需要 embed？

傳統部署 Go 應用時，需要將二進位檔案和靜態資源（HTML、設定檔、SQL 腳本）一起打包。`//go:embed`（Go 1.16+）讓你能將靜態資源直接編譯進二進位檔案，實現**單一檔案部署**。

### 7-2 嵌入單一檔案（字串、[]byte）

```go
package main

import (
    _ "embed"
    "fmt"
)

//go:embed config/default.json
var defaultConfig string // 嵌入為字串

//go:embed assets/logo.png
var logo []byte // 嵌入為 []byte

func main() {
    fmt.Printf("預設設定: %s\n", defaultConfig)
    fmt.Printf("Logo 大小: %d bytes\n", len(logo))
}
```

> **注意**：必須 import `_ "embed"` 才能使用 `//go:embed`，即使你沒有直接呼叫任何 embed 函數。

### 7-3 嵌入整個目錄（embed.FS）

```go
package main

import (
    "embed"
    "fmt"
    "io/fs"
)

//go:embed templates
var templateFiles embed.FS

//go:embed static
var staticFiles embed.FS

func main() {
    // 讀取單一嵌入檔案
    data, err := templateFiles.ReadFile("templates/index.html")
    if err != nil {
        fmt.Println("錯誤:", err)
        return
    }
    fmt.Printf("模板大小: %d bytes\n", len(data))

    // 列出目錄中的所有嵌入檔案
    err = fs.WalkDir(staticFiles, ".", func(path string, d fs.DirEntry, err error) error {
        if err != nil {
            return err
        }
        if !d.IsDir() {
            fmt.Println("嵌入檔案:", path)
        }
        return nil
    })
    if err != nil {
        fmt.Println("Walk 錯誤:", err)
    }
}
```

### 7-4 實際應用：嵌入 HTML 模板、設定檔、SQL 腳本

這是最實用的應用場景之一——將資料庫 migration 腳本嵌入應用程式，確保部署時不會漏掉 SQL 檔案：

```go
package database

import (
    "database/sql"
    "embed"
    "fmt"
    "io/fs"
    "sort"
)

// 將 migrations 目錄下的所有 .sql 檔案嵌入
//
//go:embed migrations
var migrationFiles embed.FS

// RunMigrations 執行所有尚未執行的資料庫 migration
func RunMigrations(db *sql.DB) error {
    // 取得所有 migration 檔案，並按檔名排序（確保順序一致）
    var files []string
    err := fs.WalkDir(migrationFiles, "migrations", func(path string, d fs.DirEntry, err error) error {
        if err != nil {
            return err
        }
        if !d.IsDir() && len(path) > 4 && path[len(path)-4:] == ".sql" {
            files = append(files, path)
        }
        return nil
    })
    if err != nil {
        return fmt.Errorf("掃描 migration 檔案: %w", err)
    }

    sort.Strings(files) // 按檔名（通常含版本號）排序

    for _, f := range files {
        content, err := migrationFiles.ReadFile(f)
        if err != nil {
            return fmt.Errorf("讀取 migration %s: %w", f, err)
        }

        _, err = db.Exec(string(content))
        if err != nil {
            return fmt.Errorf("執行 migration %s: %w", f, err)
        }

        fmt.Printf("Migration 執行成功: %s\n", f)
    }

    return nil
}
```

對應的目錄結構：

```text
database/
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_orders.sql
│   └── 003_add_index.sql
└── migrate.go
```

### 7-5 embed 的限制（不能嵌入 . 開頭的隱藏檔案等）

```text
限制說明：

❌ 不能嵌入的檔案：
* . 開頭的隱藏檔案（.env、.gitignore）
* _ 開頭的特殊檔案
* 指向 embed 目錄外部的 symlink
* 在 Go module 根目錄外的檔案

✅ 繞過隱藏檔案限制的方法：
* 使用 all: 前綴：//go:embed all:config
  （包含 . 和 _ 開頭的檔案，但仍不包含 .git）
```

```go
//go:embed all:config
var configFiles embed.FS // 包含 config/.env
```

---

## 8. 方法值與方法表達式

### 8-1 方法值（Method Value）：obj.Method

方法值（Method Value）是將**特定物件的方法**綁定成一個函數值，可以像普通函數一樣傳遞和呼叫：

```go
package main

import (
    "fmt"
    "strings"
)

type Greeter struct {
    Prefix string
}

func (g Greeter) Greet(name string) string {
    return g.Prefix + ", " + name + "!"
}

func applyToAll(names []string, fn func(string) string) []string {
    result := make([]string, len(names))
    for i, name := range names {
        result[i] = fn(name)
    }
    return result
}

func main() {
    g := Greeter{Prefix: "Hello"}

    // g.Greet 是一個「方法值」，已綁定 g 這個接收者
    greetFn := g.Greet // 型別是 func(string) string

    fmt.Println(greetFn("Alice")) // Hello, Alice!

    // 可以傳入需要 func(string) string 的地方
    names := []string{"Bob", "Carol", "Dave"}
    results := applyToAll(names, g.Greet)
    fmt.Println(results)

    // 也可以使用標準庫的方法值
    upper := strings.ToUpper
    fmt.Println(upper("hello")) // HELLO
}
```

```text
輸出：
Hello, Alice!
[Hello, Bob! Hello, Carol! Hello, Dave!]
HELLO
```

### 8-2 方法表達式（Method Expression）：Type.Method

方法表達式（Method Expression）讓你把方法當作一個普通函數，但需要**明確傳入接收者**作為第一個參數：

```go
package main

import "fmt"

type Counter struct {
    count int
}

func (c *Counter) Increment() {
    c.count++
}

func (c Counter) Value() int {
    return c.count
}

func main() {
    c1 := &Counter{}
    c2 := &Counter{}

    // 方法表達式：(*Counter).Increment 型別為 func(*Counter)
    inc := (*Counter).Increment

    inc(c1) // 等同 c1.Increment()
    inc(c1) // 再呼叫一次
    inc(c2) // 對 c2 呼叫

    fmt.Printf("c1: %d\n", c1.Value()) // 2
    fmt.Printf("c2: %d\n", c2.Value()) // 1

    // 方法表達式的實際應用：批次操作多個物件
    counters := []*Counter{c1, c2}
    for _, c := range counters {
        inc(c)
    }
    fmt.Printf("批次後 c1: %d, c2: %d\n", c1.Value(), c2.Value())
}
```

```text
輸出：
c1: 2
c2: 1
批次後 c1: 3, c2: 2
```

### 8-3 實際應用場景

```go
package main

import (
    "fmt"
    "sort"
)

type Person struct {
    Name string
    Age  int
}

type ByAge []Person
type ByName []Person

func (a ByAge) Len() int           { return len(a) }
func (a ByAge) Less(i, j int) bool { return a[i].Age < a[j].Age }
func (a ByAge) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }

func (a ByName) Len() int           { return len(a) }
func (a ByName) Less(i, j int) bool { return a[i].Name < a[j].Name }
func (a ByName) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }

func main() {
    people := []Person{
        {"Charlie", 30},
        {"Alice", 25},
        {"Bob", 35},
    }

    // 方法值讓 sort 的使用更靈活
    sort.Sort(ByAge(people))
    fmt.Println("依年齡排序:", people)

    sort.Sort(ByName(people))
    fmt.Println("依姓名排序:", people)
}
```

```text
輸出：
依年齡排序: [{Alice 25} {Charlie 30} {Bob 35}]
依姓名排序: [{Alice 25} {Bob 35} {Charlie 30}]
```

---

## 9. 函數型別與高階函數

### 9-1 函數作為第一類值（First-class Function）

在 Go 中，函數是第一類值（First-class Citizen）：可以賦值給變數、傳入函數作為參數、從函數中回傳。

```go
package main

import "fmt"

func main() {
    // 函數賦值給變數
    add := func(a, b int) int {
        return a + b
    }

    multiply := func(a, b int) int {
        return a * b
    }

    // 函數存入 slice
    ops := []func(int, int) int{add, multiply}

    for _, op := range ops {
        fmt.Println(op(3, 4))
    }
}
```

```text
輸出：
7
12
```

### 9-2 函數型別的宣告

```go
package main

import "fmt"

// 宣告一個函數型別
type Transformer func(int) int
type Predicate func(int) bool

func filter(nums []int, pred Predicate) []int {
    result := make([]int, 0, len(nums))
    for _, n := range nums {
        if pred(n) {
            result = append(result, n)
        }
    }
    return result
}

func mapSlice(nums []int, fn Transformer) []int {
    result := make([]int, len(nums))
    for i, n := range nums {
        result[i] = fn(n)
    }
    return result
}

func main() {
    nums := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}

    isEven := Predicate(func(n int) bool { return n%2 == 0 })
    double := Transformer(func(n int) int { return n * 2 })

    evens := filter(nums, isEven)
    doubled := mapSlice(evens, double)

    fmt.Println("偶數:", evens)
    fmt.Println("偶數的兩倍:", doubled)
}
```

```text
輸出：
偶數: [2 4 6 8 10]
偶數的兩倍: [4 8 12 16 20]
```

### 9-3 函數作為參數（Middleware 模式）

Middleware 模式是 HTTP 框架中最常見的高階函數應用。原理是把 handler 包裹在另一個 handler 中：

```go
package main

import (
    "fmt"
    "time"
)

type HandlerFunc func(req string) string

// Middleware 型別：接收 handler，回傳加強版 handler
type Middleware func(HandlerFunc) HandlerFunc

// loggingMiddleware 記錄請求和耗時
func loggingMiddleware(next HandlerFunc) HandlerFunc {
    return func(req string) string {
        start := time.Now()
        fmt.Printf("[LOG] 開始處理: %s\n", req)
        result := next(req)
        fmt.Printf("[LOG] 完成，耗時: %v\n", time.Since(start))
        return result
    }
}

// authMiddleware 驗證請求
func authMiddleware(next HandlerFunc) HandlerFunc {
    return func(req string) string {
        if req == "unauthorized" {
            return "403 Forbidden"
        }
        return next(req)
    }
}

// chain 將多個 middleware 串接起來
func chain(h HandlerFunc, middlewares ...Middleware) HandlerFunc {
    // 反向套用，讓第一個 middleware 最外層
    for i := len(middlewares) - 1; i >= 0; i-- {
        h = middlewares[i](h)
    }
    return h
}

func main() {
    // 業務 handler
    handler := HandlerFunc(func(req string) string {
        return "200 OK: " + req
    })

    // 套用 middleware chain
    wrapped := chain(handler, loggingMiddleware, authMiddleware)

    fmt.Println(wrapped("GET /users"))
    fmt.Println("---")
    fmt.Println(wrapped("unauthorized"))
}
```

```text
輸出：
[LOG] 開始處理: GET /users
[LOG] 完成，耗時: 1µs（實際時間會不同）
200 OK: GET /users
---
[LOG] 開始處理: unauthorized
[LOG] 完成，耗時: 1µs
403 Forbidden
```

### 9-4 函數作為回傳值（Closure 工廠）

閉包工廠（Closure Factory）是一種常見模式：回傳一個「記住」某些狀態的函數：

```go
package main

import "fmt"

// multiplierFactory 回傳一個固定乘數的函數
func multiplierFactory(factor int) func(int) int {
    return func(n int) int {
        return n * factor // 閉包捕捉 factor
    }
}

// retryFactory 回傳一個有重試機制的函數
func retryFactory(maxRetries int, fn func() error) func() error {
    return func() error {
        var lastErr error
        for i := 0; i <= maxRetries; i++ {
            lastErr = fn()
            if lastErr == nil {
                return nil
            }
            fmt.Printf("第 %d 次重試...\n", i+1)
        }
        return fmt.Errorf("重試 %d 次後仍失敗: %w", maxRetries, lastErr)
    }
}

func main() {
    double := multiplierFactory(2)
    triple := multiplierFactory(3)

    fmt.Println(double(5), triple(5)) // 10 15

    attempt := 0
    flaky := func() error {
        attempt++
        if attempt < 3 {
            return fmt.Errorf("暫時性錯誤")
        }
        return nil
    }

    withRetry := retryFactory(3, flaky)
    if err := withRetry(); err != nil {
        fmt.Println("最終失敗:", err)
    } else {
        fmt.Println("成功！")
    }
}
```

```text
輸出：
10 15
第 1 次重試...
第 2 次重試...
成功！
```

### 9-5 與泛型結合使用

Go 1.18+ 可以用泛型讓高階函數更通用：

```go
package main

import "fmt"

// Filter 泛型版本：不再限定 int
func Filter[T any](slice []T, pred func(T) bool) []T {
    result := make([]T, 0)
    for _, v := range slice {
        if pred(v) {
            result = append(result, v)
        }
    }
    return result
}

// Map 泛型版本：輸入和輸出型別可以不同
func Map[T, U any](slice []T, fn func(T) U) []U {
    result := make([]U, len(slice))
    for i, v := range slice {
        result[i] = fn(v)
    }
    return result
}

func main() {
    // 過濾偶數
    nums := []int{1, 2, 3, 4, 5}
    evens := Filter(nums, func(n int) bool { return n%2 == 0 })
    fmt.Println("偶數:", evens)

    // 轉換型別：int → string
    strs := Map(nums, func(n int) string {
        return fmt.Sprintf("num_%d", n)
    })
    fmt.Println("字串:", strs)

    // 也可用於字串 slice
    words := []string{"hello", "world", "go"}
    long := Filter(words, func(s string) bool { return len(s) > 3 })
    fmt.Println("長詞:", long)
}
```

```text
輸出：
偶數: [2 4]
字串: [num_1 num_2 num_3 num_4 num_5]
長詞: [hello world]
```

---

## 10. unsafe 套件（了解即可）

> **警告**：`unsafe` 套件**繞過了 Go 的型別系統和記憶體安全保證**。錯誤使用會導致記憶體損壞、資料競爭、程式崩潰，且問題往往難以除錯。業務代碼**絕對不應該使用** `unsafe`。本章節純粹是為了理解底層運作原理，以及閱讀底層 library 代碼時能看懂。

### 10-1 unsafe.Sizeof、Alignof、Offsetof

這三個函數在**編譯期**計算型別的記憶體佈局，不帶來執行期開銷：

```go
package main

import (
    "fmt"
    "unsafe"
)

type BadLayout struct {
    A bool    // 1 byte
    B int64   // 8 bytes（需要 8 byte 對齊，前面填充 7 bytes）
    C bool    // 1 byte（後面填充 7 bytes）
}
// 實際大小：1 + 7(padding) + 8 + 1 + 7(padding) = 24 bytes

type GoodLayout struct {
    B int64   // 8 bytes
    A bool    // 1 byte
    C bool    // 1 byte（後面填充 6 bytes）
}
// 實際大小：8 + 1 + 1 + 6(padding) = 16 bytes

func main() {
    fmt.Printf("BadLayout  大小: %d bytes\n", unsafe.Sizeof(BadLayout{}))
    fmt.Printf("GoodLayout 大小: %d bytes\n", unsafe.Sizeof(GoodLayout{}))

    fmt.Printf("\nBadLayout 欄位偏移:\n")
    var bad BadLayout
    fmt.Printf("  A: offset=%d\n", unsafe.Offsetof(bad.A))
    fmt.Printf("  B: offset=%d\n", unsafe.Offsetof(bad.B))
    fmt.Printf("  C: offset=%d\n", unsafe.Offsetof(bad.C))
}
```

```text
輸出：
BadLayout  大小: 24 bytes
GoodLayout 大小: 16 bytes

BadLayout 欄位偏移:
  A: offset=0
  B: offset=8
  C: offset=16
```

### 10-2 unsafe.Pointer 的合法轉換規則

Go 的 `unsafe` 文件定義了六種合法的 `unsafe.Pointer` 使用模式。最常見的兩種：

```go
package main

import (
    "fmt"
    "unsafe"
)

func main() {
    // 模式 1：將 *T1 轉為 *T2（兩者大小相同且記憶體佈局相容）
    // 用途：把 []byte 解讀為特定結構（底層網路/序列化）
    var i int64 = 0x0102030405060708
    // 將 int64 的位元重新解讀為 [8]byte
    b := (*[8]byte)(unsafe.Pointer(&i))
    fmt.Printf("int64 的位元組: %v\n", b)

    // 模式 2：string 和 []byte 的零拷貝轉換（高效能場景）
    // 注意：轉換後不能修改 []byte，否則 string 的不可變性被破壞
    s := "hello"
    // 這只是示範，實際應用請用 []byte(s)，除非真的需要零拷貝
    _ = unsafe.Pointer(&s)
}
```

> **警告**：上面的程式碼僅作為原理展示。在 GC（垃圾回收）移動物件時，不合法的 `unsafe.Pointer` 使用會導致懸空指標（dangling pointer），產生極難除錯的記憶體錯誤。

### 10-3 何時會看到 unsafe（底層 library）

以下是你在知名 Go 套件中可能看到 `unsafe` 的場景：

```text
套件                    用途
─────────────────────────────────────────────
sync.Pool               存取內部的 poolLocal 結構
runtime                 GC、goroutine 排程器的底層操作
reflect                 直接存取 interface{} 的內部表示
encoding/json           高效能字串轉 []byte
syscall                 與作業系統的 ABI 對接
net                     零拷貝的 socket buffer 操作
```

### 10-4 為什麼一般業務代碼絕不使用 unsafe

```text
理由 1：型別安全
Go 的型別系統防止大量 bug。unsafe 讓你繞過它，
也繞過了編譯器的保護。

理由 2：GC 相容性
Go GC 可以移動物件（未來版本更可能如此）。
不合規的 unsafe.Pointer 使用在 GC 後會變成懸空指標。

理由 3：跨平台問題
不同作業系統和 CPU 架構的記憶體對齊規則不同，
依賴 unsafe 的代碼很可能在某些平台出錯。

理由 4：版本相容性
Go 只保證合法 unsafe 模式的相容性，
非標準使用可能在新版本 Go 中悄悄失效。

理由 5：更好的替代方案永遠存在
* 需要型別轉換 → 泛型或介面
* 需要零拷貝 → io.Reader/Writer 或 sync.Pool
* 需要記憶體佈局最佳化 → 調整 struct 欄位順序（見 10-1）
* 需要互動作業系統 → syscall 套件
```

---

## 11. 總結對照表

| 特性 | 核心用途 | 何時使用 | 何時避免 |
| :--- | :--- | :--- | :--- |
| `init()` | 套件初始化副作用 | 注冊驅動、讀取環境變數 | 複雜初始化、有錯誤需處理 |
| `iota` | 常數枚舉 | 狀態、位元旗標、有序列舉 | 非連續的常數（直接賦值更清楚） |
| 具名回傳值 | 語義化回傳、defer 修改 | 短函數、error 包裝 | 長函數、裸 return 降低可讀性 |
| 型別別名 | 重構遷移、跨套件別名 | 漸進式重構 | 新增行為（應用型別定義） |
| 型別定義 | 語義區分、新增方法 | UserID vs OrderID 等 | 頻繁需要互轉（增加轉換負擔） |
| `reflect` | 執行期型別操作 | 序列化框架、ORM、DI 容器 | 高頻路徑、可用泛型替代的場景 |
| Build Tags | 條件編譯 | 平台差異、整合測試隔離 | 日常代碼邏輯（用 if 就好） |
| `//go:embed` | 靜態資源嵌入 | HTML、SQL、設定檔嵌入二進位 | 頻繁更新的資源（每次都要重編） |
| 方法值/表達式 | 函數式操作 | 傳入 callback、批次操作 | 不需要特別命名的簡單場景 |
| 高階函數 | 行為抽象 | Middleware、工廠、通用算法 | 過度抽象讓代碼難以追蹤 |
| `unsafe` | 底層記憶體操作 | 底層 library 作者 | **業務代碼永遠不要使用** |

---

[← 返回目錄](README.md)

文件更新日期：2026年6月1日
