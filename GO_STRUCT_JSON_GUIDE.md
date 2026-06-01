# Go Struct 深度解析與 JSON 操作指南

[← 返回目錄](README.md)

---

這份文件專為 Go 入門者設計，帶你從 struct 基礎一路走到 JSON 進階技巧。每個章節都有程式碼範例與圖示輔助，讓你學得紮實又有趣。

---

## 目錄

1. [struct 基礎](#1-struct-基礎)
2. [struct 嵌入（Embedding）](#2-struct-嵌入embedding)
3. [struct Tag](#3-struct-tag)
4. [struct 方法設計](#4-struct-方法設計)
5. [encoding/json 基礎](#5-encodingjson-基礎)
6. [JSON Tag 詳細說明](#6-json-tag-詳細說明)
7. [常見 JSON 處理技巧](#7-常見-json-處理技巧)
8. [常見錯誤](#8-常見錯誤)

---

## 1. struct 基礎

struct 是 Go 裡面最重要的資料結構之一，可以把相關的資料欄位組合在一起，就像一個「資料容器」。

### 1.1 宣告與初始化

#### 宣告 struct

```go
// 定義一個 User struct
type User struct {
    Name  string
    Age   int
    Email string
}
```

#### 具名欄位初始化（推薦方式）

```go
package main

import "fmt"

type User struct {
    Name  string
    Age   int
    Email string
}

func main() {
    // 具名欄位初始化：明確指定每個欄位的值
    u := User{
        Name:  "Alice",
        Age:   30,
        Email: "alice@example.com",
    }
    fmt.Println(u.Name)  // Alice
    fmt.Println(u.Age)   // 30
}
```

#### 位置初始化（不推薦，維護性差）

```go
func main() {
    // 位置初始化：依照欄位宣告順序填入值
    // 缺點：欄位順序改變時容易出錯
    u := User{"Bob", 25, "bob@example.com"}
    fmt.Println(u.Name) // Bob
}
```

```text
具名欄位 vs 位置初始化比較：

具名欄位（推薦）:
User{
    Name:  "Alice",   <-- 清楚知道每個值是什麼
    Age:   30,
    Email: "...",
}

位置初始化（風險高）:
User{"Alice", 30, "..."}  <-- 萬一 struct 新增欄位，這裡會編譯錯誤
```

### 1.2 零值行為

當你宣告一個 struct 但沒有初始化時，Go 會自動給每個欄位設定「零值」。

```go
package main

import "fmt"

type Product struct {
    Name     string
    Price    float64
    InStock  bool
    Quantity int
}

func main() {
    var p Product  // 沒有初始化
    fmt.Println(p.Name)     // ""    （string 零值是空字串）
    fmt.Println(p.Price)    // 0     （float64 零值是 0）
    fmt.Println(p.InStock)  // false （bool 零值是 false）
    fmt.Println(p.Quantity) // 0     （int 零值是 0）
}
```

```text
各類型零值對照表：

型別          零值
-----------  ------
string        ""
int/float64   0
bool          false
pointer       nil
slice         nil
map           nil
interface     nil
```

### 1.3 匿名欄位（Anonymous Field）

匿名欄位就是「只寫型別、不寫欄位名稱」的欄位。存取時直接用型別名稱當作欄位名。

```go
package main

import "fmt"

type Address struct {
    City    string
    Country string
}

type Person struct {
    string   // 匿名欄位，型別是 string
    int      // 匿名欄位，型別是 int
    Address  // 匿名欄位，型別是 Address（這也叫做嵌入）
}

func main() {
    p := Person{
        string:  "Charlie",
        int:     28,
        Address: Address{City: "Taipei", Country: "Taiwan"},
    }

    // 存取匿名欄位時，用型別名稱
    fmt.Println(p.string)       // Charlie
    fmt.Println(p.int)          // 28
    fmt.Println(p.Address.City) // Taipei
    fmt.Println(p.City)         // Taipei（也可以直接這樣存取！）
}
```

> 小提示：匿名欄位最常見的用途就是「嵌入 struct」，讓程式碼更簡潔，下一章會詳細說明。

---

## 2. struct 嵌入（Embedding）

嵌入（Embedding）是 Go 實現程式碼重用的核心機制。透過嵌入，你可以讓一個 struct「繼承」另一個 struct 的欄位與方法。

### 2.1 基本嵌入與方法提升

```go
package main

import "fmt"

// 基礎 struct
type Animal struct {
    Name string
}

// Animal 的方法
func (a Animal) Speak() string {
    return a.Name + " 發出聲音"
}

// Dog 嵌入 Animal
type Dog struct {
    Animal        // 嵌入，不寫欄位名稱
    Breed  string // Dog 自己的欄位
}

func main() {
    d := Dog{
        Animal: Animal{Name: "小黑"},
        Breed:  "拉布拉多",
    }

    // 直接存取嵌入的欄位
    fmt.Println(d.Name)   // 小黑（不需要寫 d.Animal.Name）
    fmt.Println(d.Breed)  // 拉布拉多

    // 直接呼叫嵌入的方法（方法提升）
    fmt.Println(d.Speak()) // 小黑 發出聲音
}
```

```text
方法提升示意圖：

  Animal
  ├── Name (欄位)
  └── Speak() (方法)
        ↓ 嵌入後自動提升
  Dog
  ├── Animal.Name → 可用 d.Name 存取
  ├── Animal.Speak() → 可用 d.Speak() 呼叫
  └── Breed (自己的欄位)
```

#### 覆寫嵌入的方法

如果 Dog 自己也定義了 Speak()，它會覆蓋掉 Animal 的 Speak()：

```go
// Dog 自己的 Speak 會覆寫 Animal 的 Speak
func (d Dog) Speak() string {
    return d.Name + " 汪汪叫！"
}

func main() {
    d := Dog{Animal: Animal{Name: "小黑"}, Breed: "拉布拉多"}
    fmt.Println(d.Speak())        // 小黑 汪汪叫！（Dog 的版本）
    fmt.Println(d.Animal.Speak()) // 小黑 發出聲音（Animal 的版本，仍可存取）
}
```

### 2.2 嵌入 vs 繼承的差異

Go 沒有傳統物件導向的繼承，嵌入只是一種組合（Composition）的語法糖。

```text
傳統繼承（Java/C++ 的概念）:
  Animal
    ↑ 繼承
  Dog
  Dog IS-A Animal（Dog 是一種 Animal）

Go 的嵌入（組合）:
  Dog HAS-A Animal（Dog 包含一個 Animal）
  
  Dog struct {
      Animal  <-- Dog 包含 Animal，不是「是」Animal
      Breed string
  }
```

實際差異：

```go
package main

import "fmt"

type Animal struct{ Name string }
type Dog struct {
    Animal
    Breed string
}

func main() {
    d := Dog{Animal: Animal{Name: "小黑"}, Breed: "柴犬"}

    // Go 的嵌入不是繼承，Dog 不能直接當 Animal 使用
    // var a Animal = d  // 這行會編譯錯誤！

    // 但可以明確取出嵌入的部分
    var a Animal = d.Animal  // 這樣才對
    fmt.Println(a.Name)      // 小黑
}
```

### 2.3 多層嵌入與欄位衝突

#### 多層嵌入

```go
package main

import "fmt"

type Base struct {
    ID int
}

type Middle struct {
    Base
    Score float64
}

type Top struct {
    Middle
    Label string
}

func main() {
    t := Top{
        Middle: Middle{
            Base:  Base{ID: 42},
            Score: 99.5,
        },
        Label: "優秀",
    }

    // 多層嵌入，欄位自動提升
    fmt.Println(t.ID)    // 42（從 Base 提升上來）
    fmt.Println(t.Score) // 99.5（從 Middle 提升上來）
    fmt.Println(t.Label) // 優秀
}
```

```text
多層嵌入結構示意：

Top
├── Label
└── Middle (嵌入)
    ├── Score
    └── Base (嵌入)
        └── ID

存取路徑：
t.Label          → 直接存取
t.Score          → 提升自 Middle
t.Middle.Score   → 明確路徑
t.ID             → 提升自 Base（穿越 Middle）
t.Middle.Base.ID → 最完整的明確路徑
```

#### 欄位衝突

當兩個嵌入的 struct 有相同名稱的欄位時，就會發生衝突：

```go
package main

import "fmt"

type A struct {
    Value string
}

type B struct {
    Value string
}

type C struct {
    A
    B
}

func main() {
    c := C{
        A: A{Value: "來自 A"},
        B: B{Value: "來自 B"},
    }

    // c.Value  // 編譯錯誤！模糊不清，不知道是 A.Value 還是 B.Value
    fmt.Println(c.A.Value) // 來自 A（必須明確指定）
    fmt.Println(c.B.Value) // 來自 B
}
```

---

## 3. struct Tag

Tag 是附加在 struct 欄位上的「元資料（metadata）」，格式是一段特殊的字串，讓各種套件（如 json、gorm、validator）知道如何處理這個欄位。

### 3.1 Tag 的語法格式

```go
type User struct {
    //     欄位名稱  型別    Tag
    Name   string   `json:"name" db:"user_name" validate:"required"`
    Age    int      `json:"age,omitempty"`
    Secret string   `json:"-"`
}
```

```text
Tag 語法結構：

`key1:"value1" key2:"value2,option1,option2"`
 ↑              ↑
 鍵名           值（可用逗號分隔多個選項）

整個 tag 用反引號（`）包住
多個 key-value 用空格分隔
```

### 3.2 常見 Tag：json、db、validate

#### json Tag

控制 encoding/json 套件的行為（下一章會詳細說明）：

```go
type Article struct {
    Title   string `json:"title"`           // JSON 欄位名稱改成 "title"
    Content string `json:"content,omitempty"` // 空值時省略
    Secret  string `json:"-"`                // JSON 完全忽略此欄位
}
```

#### db Tag（常用於 sqlx、gorm 等資料庫套件）

```go
// 使用 sqlx 時常見的 db tag
type UserRecord struct {
    ID        int    `db:"id"`
    FirstName string `db:"first_name"`
    LastName  string `db:"last_name"`
    CreatedAt string `db:"created_at"`
}
```

#### validate Tag（常用於 go-playground/validator）

```go
// 使用 validator 套件做欄位驗證
type RegistrationForm struct {
    Username string `json:"username" validate:"required,min=3,max=20"`
    Email    string `json:"email"    validate:"required,email"`
    Age      int    `json:"age"      validate:"gte=18,lte=120"`
    Password string `json:"password" validate:"required,min=8"`
}
```

```go
package main

import (
    "fmt"
    "github.com/go-playground/validator/v10"
)

func main() {
    validate := validator.New()

    form := RegistrationForm{
        Username: "al",          // 太短，min=3
        Email:    "not-an-email", // 格式錯誤
        Age:      15,            // 未滿 18
        Password: "12345678",
    }

    err := validate.Struct(form)
    if err != nil {
        fmt.Println(err) // 會列出所有驗證錯誤
    }
}
```

### 3.3 如何用 reflect 讀取 Tag

Go 的 reflect 套件可以在執行期間讀取 Tag 的內容，這是各種套件底層的實作原理：

```go
package main

import (
    "fmt"
    "reflect"
)

type User struct {
    Name  string `json:"name" validate:"required"`
    Email string `json:"email,omitempty"`
}

func main() {
    t := reflect.TypeOf(User{})

    for i := 0; i < t.NumField(); i++ {
        field := t.Field(i)

        // 讀取整個 tag 字串
        fmt.Println("欄位:", field.Name)
        fmt.Println("  完整 tag:", field.Tag)

        // 讀取特定 key 的 tag 值
        jsonTag := field.Tag.Get("json")
        validateTag := field.Tag.Get("validate")
        fmt.Println("  json tag:", jsonTag)
        fmt.Println("  validate tag:", validateTag)
        fmt.Println()
    }
}

// 輸出：
// 欄位: Name
//   完整 tag: json:"name" validate:"required"
//   json tag: name
//   validate tag: required
//
// 欄位: Email
//   完整 tag: json:"email,omitempty"
//   json tag: email,omitempty
//   validate tag:
```

---

## 4. struct 方法設計

方法（Method）是附加在型別上的函式。在 Go 裡，你可以選擇用「值接收者」或「指標接收者」來定義方法。

### 4.1 值接收者 vs 指標接收者的選擇原則

```go
package main

import "fmt"

type Counter struct {
    Count int
}

// 值接收者：接收的是 Counter 的副本，不會修改原本的值
func (c Counter) Get() int {
    return c.Count
}

// 指標接收者：接收的是指標，可以修改原本的值
func (c *Counter) Increment() {
    c.Count++
}

func main() {
    counter := Counter{Count: 0}

    counter.Increment() // 修改原本的 counter
    counter.Increment()
    fmt.Println(counter.Get()) // 2
}
```

```text
值接收者 vs 指標接收者選擇原則：

使用「指標接收者」的時機：
✓ 方法需要修改 struct 的欄位
✓ struct 很大（複製成本高）
✓ 保持一致性（同一個 struct 的所有方法最好統一用指標接收者）

使用「值接收者」的時機：
✓ 方法不需要修改任何欄位
✓ struct 很小（如 Point{X, Y}）
✓ 代表不可變的值（如時間、座標）
```

#### 指標接收者的注意事項

```go
package main

import "fmt"

type Score struct {
    Value int
}

func (s Score) DisplayValue() int {
    return s.Value
}

func (s *Score) AddPoints(pts int) {
    s.Value += pts
}

func main() {
    s := Score{Value: 10}

    // Go 會自動幫你取址，所以這樣寫也沒問題
    s.AddPoints(5)     // 等同於 (&s).AddPoints(5)
    fmt.Println(s.DisplayValue()) // 15

    // 但如果是不可尋址的值，就不行
    // Score{Value: 10}.AddPoints(5) // 編譯錯誤！
}
```

### 4.2 方法集（Method Set）規則

「方法集」決定了某個型別實現了哪些介面。

```text
方法集規則：

型別 T（值型別）的方法集：
  - 只包含「值接收者」的方法

型別 *T（指標型別）的方法集：
  - 包含「值接收者」的方法
  - 包含「指標接收者」的方法

結論：*T 的方法集是 T 的方法集的超集
```

```go
package main

import "fmt"

type Speaker interface {
    Speak() string
}

type Mover interface {
    Move()
}

type Robot struct {
    Name string
}

func (r Robot) Speak() string { // 值接收者
    return r.Name + " 說話"
}

func (r *Robot) Move() { // 指標接收者
    fmt.Println(r.Name + " 移動")
}

func main() {
    r := Robot{Name: "R2D2"}

    // Robot（值型別）只有值接收者的方法，只實現了 Speaker
    var s Speaker = r       // OK
    // var m Mover = r      // 編譯錯誤！Robot 的方法集沒有 Move()

    // *Robot（指標型別）有所有方法，同時實現 Speaker 和 Mover
    var s2 Speaker = &r     // OK
    var m Mover = &r        // OK

    fmt.Println(s.Speak())
    fmt.Println(s2.Speak())
    m.Move()
}
```

---

## 5. encoding/json 基礎

Go 標準函式庫的 `encoding/json` 套件讓你輕鬆在 struct 和 JSON 字串之間互轉。

### 5.1 json.Marshal（struct → JSON 字串）

```go
package main

import (
    "encoding/json"
    "fmt"
)

type Person struct {
    Name    string `json:"name"`
    Age     int    `json:"age"`
    IsAdmin bool   `json:"is_admin"`
}

func main() {
    p := Person{
        Name:    "Alice",
        Age:     30,
        IsAdmin: true,
    }

    // Marshal：將 struct 轉換成 JSON 的 []byte
    data, err := json.Marshal(p)
    if err != nil {
        fmt.Println("錯誤:", err)
        return
    }

    fmt.Println(string(data))
    // 輸出：{"name":"Alice","age":30,"is_admin":true}
}
```

#### 格式化輸出（MarshalIndent）

```go
func main() {
    p := Person{Name: "Bob", Age: 25, IsAdmin: false}

    // MarshalIndent：產生有縮排的 JSON，方便閱讀
    data, err := json.MarshalIndent(p, "", "  ")
    if err != nil {
        fmt.Println("錯誤:", err)
        return
    }

    fmt.Println(string(data))
    // 輸出：
    // {
    //   "name": "Bob",
    //   "age": 25,
    //   "is_admin": false
    // }
}
```

### 5.2 json.Unmarshal（JSON 字串 → struct）

```go
package main

import (
    "encoding/json"
    "fmt"
)

type Person struct {
    Name    string `json:"name"`
    Age     int    `json:"age"`
    IsAdmin bool   `json:"is_admin"`
}

func main() {
    jsonStr := `{"name":"Charlie","age":35,"is_admin":true}`

    var p Person

    // Unmarshal：將 JSON []byte 解析到 struct
    err := json.Unmarshal([]byte(jsonStr), &p) // 注意：傳入指標
    if err != nil {
        fmt.Println("錯誤:", err)
        return
    }

    fmt.Println(p.Name)    // Charlie
    fmt.Println(p.Age)     // 35
    fmt.Println(p.IsAdmin) // true
}
```

```text
Marshal / Unmarshal 流程圖：

struct  --[json.Marshal]-->   []byte (JSON)
struct  <--[json.Unmarshal]-- []byte (JSON)

記憶技巧：
Marshal   = 「打包」struct 成 JSON
Unmarshal = 「拆包」JSON 成 struct
```

### 5.3 json.Encoder / json.Decoder（串流用法）

當你要處理大量 JSON 或需要直接讀寫 io.Reader/io.Writer（如 HTTP request/response、檔案），應該用 Encoder/Decoder，效能更好。

#### json.Encoder（寫入到 Writer）

```go
package main

import (
    "encoding/json"
    "os"
)

type Config struct {
    Host string `json:"host"`
    Port int    `json:"port"`
}

func main() {
    config := Config{Host: "localhost", Port: 8080}

    // 直接寫入到 os.Stdout（也可以是檔案、HTTP response）
    encoder := json.NewEncoder(os.Stdout)
    encoder.SetIndent("", "  ") // 設定縮排

    err := encoder.Encode(config)
    if err != nil {
        panic(err)
    }
    // 輸出：
    // {
    //   "host": "localhost",
    //   "port": 8080
    // }
}
```

#### json.Decoder（從 Reader 讀取）

```go
package main

import (
    "encoding/json"
    "fmt"
    "strings"
)

type Config struct {
    Host string `json:"host"`
    Port int    `json:"port"`
}

func main() {
    jsonData := `{"host":"example.com","port":443}`
    reader := strings.NewReader(jsonData)

    var config Config
    decoder := json.NewDecoder(reader)

    err := decoder.Decode(&config)
    if err != nil {
        panic(err)
    }

    fmt.Println(config.Host) // example.com
    fmt.Println(config.Port) // 443
}
```

#### HTTP 處理中的實際應用

```go
package main

import (
    "encoding/json"
    "net/http"
)

type CreateUserRequest struct {
    Name  string `json:"name"`
    Email string `json:"email"`
}

type CreateUserResponse struct {
    ID      int    `json:"id"`
    Message string `json:"message"`
}

func createUserHandler(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest

    // 從 HTTP request body 解析 JSON（用 Decoder）
    decoder := json.NewDecoder(r.Body)
    if err := decoder.Decode(&req); err != nil {
        http.Error(w, "無效的 JSON", http.StatusBadRequest)
        return
    }

    // 處理業務邏輯...
    resp := CreateUserResponse{ID: 1, Message: "建立成功"}

    // 將回應寫入 HTTP response body（用 Encoder）
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}
```

---

## 6. JSON Tag 詳細說明

JSON Tag 是控制 encoding/json 行為最重要的工具，讓我們一個個看清楚。

### 6.1 omitempty：零值時省略欄位

加上 `omitempty` 後，如果欄位是該型別的零值，Marshal 時就會省略這個欄位。

```go
package main

import (
    "encoding/json"
    "fmt"
)

type Profile struct {
    Name     string  `json:"name"`
    Nickname string  `json:"nickname,omitempty"` // 空字串時省略
    Score    float64 `json:"score,omitempty"`    // 0 時省略
    Verified bool    `json:"verified,omitempty"` // false 時省略
}

func main() {
    // 只填 Name，其他是零值
    p := Profile{Name: "Dave"}

    data, _ := json.Marshal(p)
    fmt.Println(string(data))
    // 輸出：{"name":"Dave"}
    // Nickname、Score、Verified 都被省略了

    // 填入非零值
    p2 := Profile{
        Name:     "Eve",
        Nickname: "Evie",
        Score:    98.5,
        Verified: true,
    }
    data2, _ := json.Marshal(p2)
    fmt.Println(string(data2))
    // 輸出：{"name":"Eve","nickname":"Evie","score":98.5,"verified":true}
}
```

```text
omitempty 零值對照：

型別          省略條件
-----------  ----------------
string        "" （空字串）
int/float     0
bool          false
pointer       nil
slice         nil 或長度為 0
map           nil 或長度為 0
```

### 6.2 "-"：完全忽略欄位

使用 `json:"-"` 讓某個欄位在 Marshal 和 Unmarshal 時都被完全忽略。

```go
package main

import (
    "encoding/json"
    "fmt"
)

type User struct {
    Name     string `json:"name"`
    Password string `json:"-"`          // 序列化/反序列化時完全忽略
    Token    string `json:"-"`          // 敏感資料，不輸出到 JSON
    Internal int    `json:"-"`          // 內部使用，不對外公開
}

func main() {
    u := User{
        Name:     "Frank",
        Password: "secret123",
        Token:    "abc-token",
        Internal: 999,
    }

    data, _ := json.Marshal(u)
    fmt.Println(string(data))
    // 輸出：{"name":"Frank"}
    // Password、Token、Internal 完全不見了

    // 反過來，從 JSON 解析時，這些欄位也無法被賦值
    jsonStr := `{"name":"Grace","password":"newpass","token":"xyz"}`
    var u2 User
    json.Unmarshal([]byte(jsonStr), &u2)
    fmt.Println(u2.Name)     // Grace
    fmt.Println(u2.Password) // ""（被忽略了，沒有被賦值）
}
```

### 6.3 自訂欄位名稱

把 Go 的欄位名稱對應到不同的 JSON 欄位名稱：

```go
package main

import (
    "encoding/json"
    "fmt"
)

type Article struct {
    // Go 欄位名稱  → JSON 欄位名稱
    Title       string `json:"title"`
    PublishedAt string `json:"published_at"` // 底線命名（snake_case）
    AuthorName  string `json:"author"`        // 完全不同的名稱
    ViewCount   int    `json:"views"`
    IsPublic    bool   `json:"public"`
}

func main() {
    a := Article{
        Title:       "Go 入門教學",
        PublishedAt: "2026-05-29",
        AuthorName:  "老王",
        ViewCount:   1234,
        IsPublic:    true,
    }

    data, _ := json.MarshalIndent(a, "", "  ")
    fmt.Println(string(data))
    // 輸出：
    // {
    //   "title": "Go 入門教學",
    //   "published_at": "2026-05-29",
    //   "author": "老王",
    //   "views": 1234,
    //   "public": true
    // }
}
```

### 6.4 巢狀 struct 的 JSON

#### 正常巢狀（預設行為）

```go
package main

import (
    "encoding/json"
    "fmt"
)

type Address struct {
    City    string `json:"city"`
    Country string `json:"country"`
}

type UserWithAddress struct {
    Name    string  `json:"name"`
    Address Address `json:"address"` // 巢狀 struct
}

func main() {
    u := UserWithAddress{
        Name: "Helen",
        Address: Address{
            City:    "Taipei",
            Country: "Taiwan",
        },
    }

    data, _ := json.MarshalIndent(u, "", "  ")
    fmt.Println(string(data))
    // 輸出：
    // {
    //   "name": "Helen",
    //   "address": {
    //     "city": "Taipei",
    //     "country": "Taiwan"
    //   }
    // }
}
```

#### 使用 inline 展開（用嵌入實現）

```go
type FlatUser struct {
    Name    string  `json:"name"`
    Address         // 嵌入（沒有 json tag）→ 欄位會被展開到同一層
}

func main() {
    u := FlatUser{
        Name:    "Ivan",
        Address: Address{City: "Tainan", Country: "Taiwan"},
    }

    data, _ := json.MarshalIndent(u, "", "  ")
    fmt.Println(string(data))
    // 輸出：
    // {
    //   "name": "Ivan",
    //   "city": "Tainan",     <- 展開到同一層了
    //   "country": "Taiwan"
    // }
}
```

---

## 7. 常見 JSON 處理技巧

### 7.1 處理可能為 null 的欄位（用指標）

當一個欄位可能存在、也可能是 null 時，使用指標型別來區分「零值」和「不存在」：

```go
package main

import (
    "encoding/json"
    "fmt"
)

type UserSettings struct {
    UserID    int     `json:"user_id"`
    MaxItems  *int    `json:"max_items"`  // 用指標，可以是 null
    Nickname  *string `json:"nickname"`   // 用指標，可以是 null
}

func main() {
    // 情況一：有設定值
    maxItems := 50
    nickname := "酷酷的"
    u1 := UserSettings{
        UserID:   1,
        MaxItems: &maxItems,
        Nickname: &nickname,
    }
    data1, _ := json.Marshal(u1)
    fmt.Println(string(data1))
    // {"user_id":1,"max_items":50,"nickname":"酷酷的"}

    // 情況二：沒有設定（nil 指標 → JSON null）
    u2 := UserSettings{UserID: 2}
    data2, _ := json.Marshal(u2)
    fmt.Println(string(data2))
    // {"user_id":2,"max_items":null,"nickname":null}

    // 解析含有 null 的 JSON
    jsonStr := `{"user_id":3,"max_items":null,"nickname":"小明"}`
    var u3 UserSettings
    json.Unmarshal([]byte(jsonStr), &u3)
    fmt.Println(u3.MaxItems)  // <nil>（max_items 是 null）
    fmt.Println(*u3.Nickname) // 小明
}
```

```text
指標 vs 非指標的 JSON 行為：

情況              非指標 int   指標 *int
--------------   ----------   ---------
欄位值為 0        輸出 0        輸出 0
欄位值為 null     無法表示      輸出 null / nil
未設定值          輸出零值      輸出 null
```

### 7.2 未知結構的 JSON

#### 方法一：map[string]interface{}

當你不知道 JSON 的結構時，可以先解析成 map：

```go
package main

import (
    "encoding/json"
    "fmt"
)

func main() {
    jsonStr := `{
        "name": "Jerry",
        "age": 28,
        "tags": ["go", "backend"],
        "meta": {"level": 5}
    }`

    var result map[string]interface{}
    json.Unmarshal([]byte(jsonStr), &result)

    fmt.Println(result["name"])  // Jerry
    fmt.Println(result["age"])   // 28（注意：數字預設是 float64）

    // 需要型別斷言才能使用
    name, ok := result["name"].(string)
    if ok {
        fmt.Println("名字是:", name)
    }

    age, ok := result["age"].(float64) // JSON 數字解析成 float64
    if ok {
        fmt.Println("年齡是:", int(age))
    }
}
```

#### 方法二：json.RawMessage（延遲解析）

`json.RawMessage` 可以先把某個欄位保留成原始 JSON，之後再根據需求解析：

```go
package main

import (
    "encoding/json"
    "fmt"
)

type Event struct {
    Type    string          `json:"type"`
    Payload json.RawMessage `json:"payload"` // 先不解析，保留原始 JSON
}

type ClickPayload struct {
    X int `json:"x"`
    Y int `json:"y"`
}

type KeyPayload struct {
    Key string `json:"key"`
}

func main() {
    // 事件一：click 事件
    clickJSON := `{"type":"click","payload":{"x":100,"y":200}}`
    var event1 Event
    json.Unmarshal([]byte(clickJSON), &event1)

    if event1.Type == "click" {
        var click ClickPayload
        json.Unmarshal(event1.Payload, &click) // 根據 type 決定如何解析 payload
        fmt.Printf("點擊座標: (%d, %d)\n", click.X, click.Y)
    }

    // 事件二：key 事件
    keyJSON := `{"type":"keypress","payload":{"key":"Enter"}}`
    var event2 Event
    json.Unmarshal([]byte(keyJSON), &event2)

    if event2.Type == "keypress" {
        var key KeyPayload
        json.Unmarshal(event2.Payload, &key)
        fmt.Println("按下按鍵:", key.Key)
    }
}
```

### 7.3 自訂 MarshalJSON / UnmarshalJSON

實作 `MarshalJSON()` 和 `UnmarshalJSON()` 介面，完全自訂序列化/反序列化邏輯：

```go
package main

import (
    "encoding/json"
    "fmt"
    "time"
)

// 自訂時間格式（預設是 RFC3339，我們改成 YYYY-MM-DD）
type CustomDate struct {
    time.Time
}

const dateLayout = "2006-01-02"

// 自訂 MarshalJSON：輸出成 "YYYY-MM-DD" 格式
func (d CustomDate) MarshalJSON() ([]byte, error) {
    formatted := fmt.Sprintf(`"%s"`, d.Time.Format(dateLayout))
    return []byte(formatted), nil
}

// 自訂 UnmarshalJSON：從 "YYYY-MM-DD" 格式解析
func (d *CustomDate) UnmarshalJSON(data []byte) error {
    // data 是帶引號的字串，如 `"2026-05-29"`
    var dateStr string
    if err := json.Unmarshal(data, &dateStr); err != nil {
        return err
    }

    t, err := time.Parse(dateLayout, dateStr)
    if err != nil {
        return err
    }
    d.Time = t
    return nil
}

type Event struct {
    Name string     `json:"name"`
    Date CustomDate `json:"date"`
}

func main() {
    // Marshal 測試
    e := Event{
        Name: "年度大會",
        Date: CustomDate{time.Date(2026, 5, 29, 0, 0, 0, 0, time.UTC)},
    }
    data, _ := json.Marshal(e)
    fmt.Println(string(data))
    // {"name":"年度大會","date":"2026-05-29"}

    // Unmarshal 測試
    jsonStr := `{"name":"開幕典禮","date":"2026-06-01"}`
    var e2 Event
    json.Unmarshal([]byte(jsonStr), &e2)
    fmt.Println(e2.Name)             // 開幕典禮
    fmt.Println(e2.Date.Time.Year()) // 2026
}
```

---

## 8. 常見錯誤

### 8.1 小寫欄位無法被 json 存取

這是新手最常踩的坑！Go 的 encoding/json 只能處理「大寫開頭（exported）」的欄位。

```go
package main

import (
    "encoding/json"
    "fmt"
)

type Secret struct {
    Name    string // 大寫，OK
    age     int    // 小寫，json 看不到！
    email   string // 小寫，json 看不到！
}

func main() {
    s := Secret{Name: "Ken", age: 30, email: "ken@example.com"}

    data, _ := json.Marshal(s)
    fmt.Println(string(data))
    // 輸出：{"Name":"Ken"}
    // age 和 email 完全消失了！

    // 反序列化也一樣
    jsonStr := `{"Name":"Leo","age":25,"email":"leo@example.com"}`
    var s2 Secret
    json.Unmarshal([]byte(jsonStr), &s2)
    fmt.Println(s2.Name)  // Leo
    fmt.Println(s2.age)   // 0（沒有被賦值）
    fmt.Println(s2.email) // ""（沒有被賦值）
}
```

```text
正確做法：欄位首字母必須大寫

錯誤:                    正確:
type User struct {       type User struct {
    name string              Name string `json:"name"`
    email string             Email string `json:"email"`
}                        }
```

### 8.2 循環參考導致無限遞迴

當 struct 互相參考時，json.Marshal 會陷入無限迴圈並回傳錯誤：

```go
package main

import (
    "encoding/json"
    "fmt"
)

type Parent struct {
    Name  string
    Child *Child
}

type Child struct {
    Name   string
    Parent *Parent // 指回 Parent，形成循環！
}

func main() {
    parent := &Parent{Name: "爸爸"}
    child := &Child{Name: "小孩", Parent: parent}
    parent.Child = child

    // 這會造成無限遞迴
    _, err := json.Marshal(parent)
    fmt.Println(err)
    // 輸出：json: unsupported value: encountered a cycle via *main.Child
}
```

#### 解決方法

```go
// 方法一：序列化時用 json:"-" 打斷循環
type Child struct {
    Name   string  `json:"name"`
    Parent *Parent `json:"-"` // 序列化時忽略 Parent，避免循環
}

// 方法二：用 ID 取代直接參考
type ChildSafe struct {
    Name     string `json:"name"`
    ParentID int    `json:"parent_id"` // 只存 ID，不存整個 struct
}
```

### 8.3 數字精度問題（大數用 json.Number）

JSON 的數字預設被解析為 `float64`，當遇到非常大的整數（如 64 位元 ID）時，可能會失去精度。

```go
package main

import (
    "encoding/json"
    "fmt"
)

func main() {
    // 超大的 ID（如 Snowflake ID）
    jsonStr := `{"id": 9007199254740993}` // 超過 JS/float64 的精度範圍

    // 錯誤做法：用 map[string]interface{}，數字會被解析成 float64
    var result1 map[string]interface{}
    json.Unmarshal([]byte(jsonStr), &result1)
    fmt.Println(result1["id"]) // 9.007199254740992e+15（精度丟失！）

    // 正確做法一：用 struct 並指定 int64 型別
    type Response struct {
        ID int64 `json:"id"`
    }
    var r Response
    json.Unmarshal([]byte(jsonStr), &r)
    fmt.Println(r.ID) // 9007199254740993（精度正確）

    // 正確做法二：使用 json.Number + Decoder
    var result2 map[string]interface{}
    decoder := json.NewDecoder(strings.NewReader(jsonStr))
    decoder.UseNumber() // 告訴 decoder 把數字保留為 json.Number
    decoder.Decode(&result2)

    num := result2["id"].(json.Number)
    id, _ := num.Int64()
    fmt.Println(id) // 9007199254740993（精度正確）
}
```

```go
package main

import (
    "encoding/json"
    "fmt"
    "strings"
)

func main() {
    jsonStr := `{"id": 9007199254740993}`

    var result map[string]interface{}
    decoder := json.NewDecoder(strings.NewReader(jsonStr))
    decoder.UseNumber()
    decoder.Decode(&result)

    num := result["id"].(json.Number)

    // json.Number 提供的轉換方法
    fmt.Println(num.String())         // "9007199254740993"（原始字串）
    i64, _ := num.Int64()
    fmt.Println(i64)                  // 9007199254740993
    f64, _ := num.Float64()
    fmt.Println(f64)                  // 9.007199254740992e+15（精度丟失）
}
```

```text
數字精度問題總結：

場景                        建議
-----------------------     -------------------------
struct 中的整數欄位          直接用 int64 型別
map 解析時的大數             使用 decoder.UseNumber()
需要最高精度的金融計算        使用 string 傳輸再自行轉換
一般小數字                   float64 通常沒問題
```

---

## 總結

恭喜你讀完這份指南！讓我們快速回顧重點：

```text
學習路徑回顧：

struct 基礎
  → 宣告、初始化、零值、匿名欄位

struct 嵌入
  → 方法提升、組合而非繼承、欄位衝突

struct Tag
  → 語法格式、json/db/validate Tag

方法設計
  → 值/指標接收者選擇、方法集規則

encoding/json 基礎
  → Marshal、Unmarshal、Encoder/Decoder

JSON Tag
  → omitempty、"-"、自訂名稱、巢狀

進階技巧
  → 指標處理 null、RawMessage、自訂序列化

常見錯誤
  → 小寫欄位、循環參考、數字精度
```

掌握這些內容後，你已經能夠應對大多數 Go 開發中的 struct 和 JSON 需求了。繼續加油！

---

[← 返回目錄](README.md)

文件更新日期：2026年5月29日
