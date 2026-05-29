# Go 測試完整指南

[← 返回目錄](README.md)

---

歡迎來到 Go 測試的世界！這份指南會帶你從零開始，一步步了解如何在 Go 裡面寫出好的測試。不管你是剛開始學 Go，還是對測試還沒有把握，這裡都有你需要的答案。

---

## 1. 為什麼要寫測試？

很多人剛開始寫程式的時候，都覺得「我的程式跑起來沒問題，為什麼還要寫測試？」。這個問題問得好！讓我們來看看測試能帶給你什麼好處。

### 自動驗證正確性

每次手動執行程式來確認結果，其實很耗時間，而且很容易漏掉某些邊界情況。測試幫你把驗證邏輯寫成程式碼，一個指令就能自動跑完所有情境。

想像你寫了一個計算折扣的函數，你不必每次修改後都自己用計算機確認答案，測試會替你做這件事。

### 重構時的安全網

當你想要優化程式碼、改變內部實作，卻又怕改壞原有功能，這時候測試就是你最好的保護網。只要測試還是綠燈，你就知道行為沒有改變。

### Go 測試的特色

Go 的測試工具非常與眾不同，它把測試支援直接內建進語言和工具鏈裡，你不需要安裝任何額外的框架就能開始寫測試：

- 標準函式庫的 `testing` 套件提供所有基本工具
- `go test` 指令直接執行測試，不需要額外設定
- 測試檔案和主程式放在同一個目錄，管理簡單直覺
- Benchmark 和 Example 測試也是內建支援，不用另外安裝

---

## 2. 基本測試寫法

### 測試檔案命名規則

Go 規定測試檔案必須以 `_test.go` 結尾。例如你有一個 `math.go`，對應的測試檔就叫 `math_test.go`。Go 工具鏈看到這個結尾，就知道這個檔案只在執行測試時才會被編譯進來，正式打包時會被忽略。

```text
myproject/
├── math.go          ← 主程式
├── math_test.go     ← 測試檔
├── utils.go
└── utils_test.go
```

### 測試函數命名規則

測試函數的名稱必須以 `Test` 開頭，後面接上你想測試的功能名稱（第一個字母要大寫），並且接收一個 `*testing.T` 參數。

```go
// math.go
package math

func Add(a, b int) int {
    return a + b
}

func Subtract(a, b int) int {
    return a - b
}
```

```go
// math_test.go
package math

import "testing"

func TestAdd(t *testing.T) {
    result := Add(2, 3)
    if result != 5 {
        t.Errorf("Add(2, 3) = %d，期望是 5", result)
    }
}

func TestSubtract(t *testing.T) {
    result := Subtract(10, 4)
    if result != 6 {
        t.Errorf("Subtract(10, 4) = %d，期望是 6", result)
    }
}
```

### testing.T 的常用方法

`testing.T` 是你在測試函數裡最常打交道的物件，它提供了幾個很實用的方法：

```go
package example

import "testing"

func TestDemonstrateTMethods(t *testing.T) {
    // t.Log：印出訊息，只有在 -v 旗標或測試失敗時才顯示
    t.Log("這是一條除錯訊息")

    // t.Error：標記測試失敗，但繼續執行後面的程式碼
    value := 10
    if value != 20 {
        t.Error("value 應該是 20，但測試還會繼續執行")
    }

    // t.Errorf：同上，但可以格式化訊息（和 fmt.Sprintf 語法一樣）
    got := 10
    want := 20
    if got != want {
        t.Errorf("got = %d，want = %d", got, want)
    }

    // t.Fatal：標記測試失敗，並且立刻停止這個測試函數
    // 適合用在：如果這個檢查失敗，後面的程式碼根本沒辦法跑
    data := []int{1, 2, 3}
    if len(data) == 0 {
        t.Fatal("data 不能是空的，無法繼續後續驗證")
    }

    // t.Fatalf：同上，支援格式化
    if len(data) < 3 {
        t.Fatalf("data 長度期望至少 3，但只有 %d", len(data))
    }
}
```

簡單整理一下這幾個方法的差異：

```text
t.Log     → 只印訊息，不影響測試結果
t.Error   → 測試失敗，但繼續往下跑
t.Errorf  → 測試失敗（格式化），但繼續往下跑
t.Fatal   → 測試失敗，立刻停止這個測試
t.Fatalf  → 測試失敗（格式化），立刻停止這個測試
```

### 執行測試的指令

```bash
# 執行當前目錄的測試
go test .

# 執行當前目錄和所有子目錄的測試（最常用）
go test ./...

# 加上 -v 可以看到每個測試的詳細輸出
go test -v ./...

# 用 -run 只跑名稱符合的測試（支援正規表達式）
go test -run TestAdd ./...

# 只跑名稱包含 "Add" 的測試
go test -run Add ./...
```

```text
範例輸出（加上 -v）：
=== RUN   TestAdd
--- PASS: TestAdd (0.00s)
=== RUN   TestSubtract
--- PASS: TestSubtract (0.00s)
PASS
ok      myproject/math   0.002s
```

---

## 3. Table-Driven Test（表格驅動測試）

### 為什麼推薦這個模式

假設你的 `Add` 函數需要測試十幾種不同的輸入，如果每種情況都寫一個獨立的測試函數，程式碼會變得非常冗長。表格驅動測試把所有測試案例放進一個結構體切片裡，用迴圈一次跑完，整齊又好維護。

這是 Go 社群最推薦的測試寫法，幾乎所有 Go 標準函式庫的測試都是這種風格。

### 完整範例

```go
// calculator.go
package calculator

func Add(a, b int) int {
    return a + b
}

func Divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, fmt.Errorf("除數不能為零")
    }
    return a / b, nil
}
```

```go
// calculator_test.go
package calculator

import (
    "testing"
)

func TestAdd(t *testing.T) {
    // 定義測試表格，每一列是一個測試案例
    tests := []struct {
        name     string // 測試案例的名稱，方便識別
        a        int    // 第一個輸入
        b        int    // 第二個輸入
        expected int    // 期望的結果
    }{
        {name: "兩個正數相加", a: 2, b: 3, expected: 5},
        {name: "正數加負數", a: 10, b: -3, expected: 7},
        {name: "兩個負數相加", a: -5, b: -5, expected: -10},
        {name: "加上零", a: 42, b: 0, expected: 42},
        {name: "兩個零相加", a: 0, b: 0, expected: 0},
    }

    // 用迴圈跑完所有測試案例
    for _, tt := range tests {
        // t.Run 建立子測試，讓每個案例有自己的名稱
        t.Run(tt.name, func(t *testing.T) {
            got := Add(tt.a, tt.b)
            if got != tt.expected {
                t.Errorf("Add(%d, %d) = %d，期望是 %d", tt.a, tt.b, got, tt.expected)
            }
        })
    }
}
```

### 搭配 t.Run 產生子測試

`t.Run` 把每個測試案例變成獨立的子測試，這有幾個好處：

1. 失敗訊息會清楚顯示是哪個案例出問題
2. 可以用 `-run` 只跑特定子測試
3. 可以搭配 `t.Parallel()` 讓子測試並行執行

```bash
# 只跑名稱包含「負數」的子測試
go test -run "TestAdd/負數" ./...

# 輸出範例：
=== RUN   TestAdd
=== RUN   TestAdd/兩個正數相加
--- PASS: TestAdd/兩個正數相加 (0.00s)
=== RUN   TestAdd/正數加負數
--- PASS: TestAdd/正數加負數 (0.00s)
=== RUN   TestAdd/兩個負數相加
--- PASS: TestAdd/兩個負數相加 (0.00s)
--- PASS: TestAdd (0.00s)
```

---

## 4. Benchmark（效能測試）

有時候你不只想知道程式是否正確，還想知道它有多快。Go 的 Benchmark 功能讓你用標準方式測量程式碼的執行時間。

### BenchmarkXxx 命名規則

Benchmark 函數的命名規則和測試函數類似，以 `Benchmark` 開頭，接收的參數是 `*testing.B`。

### b.N 的用途

`b.N` 是 Go 測試框架自動調整的迴圈次數。框架會根據實際執行時間，不斷增加 `b.N` 的值，直到測量結果穩定為止。你只需要讓你的程式碼跑 `b.N` 次，框架會幫你算出每次操作的平均時間。

### 執行 Benchmark

```bash
# 執行所有 Benchmark（. 代表所有）
go test -bench=.

# 加上 -benchmem 顯示記憶體分配資訊
go test -bench=. -benchmem

# 只跑名稱符合的 Benchmark
go test -bench=BenchmarkAdd

# 同時跑測試和 Benchmark
go test -bench=. -benchmem ./...
```

### 範例：比較不同寫法的效能

這個範例比較用 `+` 串接字串，和用 `strings.Builder` 的效能差異：

```go
// string_builder.go
package stringops

import "strings"

// 用 + 運算子串接字串（效能較差，每次都會建立新字串）
func ConcatWithPlus(parts []string) string {
    result := ""
    for _, p := range parts {
        result += p
    }
    return result
}

// 用 strings.Builder 串接字串（效能較好，避免不必要的記憶體分配）
func ConcatWithBuilder(parts []string) string {
    var sb strings.Builder
    for _, p := range parts {
        sb.WriteString(p)
    }
    return sb.String()
}
```

```go
// string_builder_test.go
package stringops

import (
    "strings"
    "testing"
)

// 準備測試資料
var testParts = strings.Split("這是一段用來測試字串串接效能的長文字範例", "")

func BenchmarkConcatWithPlus(b *testing.B) {
    // b.N 由框架自動決定，確保測量結果穩定
    for i := 0; i < b.N; i++ {
        ConcatWithPlus(testParts)
    }
}

func BenchmarkConcatWithBuilder(b *testing.B) {
    for i := 0; i < b.N; i++ {
        ConcatWithBuilder(testParts)
    }
}
```

```text
Benchmark 結果範例：
goos: darwin
goarch: arm64
BenchmarkConcatWithPlus-8      1234567    987 ns/op    512 B/op    12 allocs/op
BenchmarkConcatWithBuilder-8   9876543    123 ns/op     64 B/op     2 allocs/op

欄位說明：
- 1234567       → 執行了多少次（b.N 的最終值）
- 987 ns/op     → 每次操作花費的奈秒數
- 512 B/op      → 每次操作分配的記憶體位元組數（需要 -benchmem）
- 12 allocs/op  → 每次操作的記憶體分配次數（需要 -benchmem）
```

---

## 5. Example 測試

Example 測試是 Go 裡面很獨特的設計，它同時扮演兩個角色：一方面是可以自動驗證的測試，另一方面也是活生生的程式文件。

### ExampleXxx 命名規則

Example 函數以 `Example` 開頭，後面接上你要示範的函數或方法名稱：

```text
Example         → 套件層級的範例
ExampleAdd      → Add 函數的範例
ExampleCalc_Add → Calc 型別的 Add 方法範例（用底線分隔型別和方法）
```

### // Output: 的驗證機制

在 Example 函數結尾加上 `// Output:` 註解，Go 測試框架會執行這個函數，並且比對標準輸出的內容是否和註解一致。如果不一樣，測試就會失敗。

```go
// calculator.go
package calculator

import "fmt"

func Add(a, b int) int {
    return a + b
}

func Multiply(a, b int) int {
    return a * b
}
```

```go
// calculator_test.go
package calculator

import "fmt"

// ExampleAdd 示範如何使用 Add 函數
func ExampleAdd() {
    result := Add(3, 4)
    fmt.Println(result)
    // Output:
    // 7
}

// ExampleMultiply 示範多行輸出的情況
func ExampleMultiply() {
    fmt.Println(Multiply(2, 3))
    fmt.Println(Multiply(5, 5))
    // Output:
    // 6
    // 25
}

// 如果輸出順序不固定，可以用 Unordered output
func ExampleAdd_unordered() {
    fmt.Println(Add(1, 2))
    fmt.Println(Add(3, 4))
    // Unordered output:
    // 7
    // 3
}
```

### 同時作為文件的功能

當你執行 `go doc` 或在 pkg.go.dev 上查看文件時，Example 函數會直接顯示在文件頁面上，讓使用者馬上看到怎麼用你的函數。這是 Go 的設計哲學：程式碼和文件應該住在一起，而且文件應該是可以被驗證的。

```bash
# 在本地查看帶有 Example 的文件
go doc -all .
```

---

## 6. 測試覆蓋率

測試覆蓋率告訴你，你的測試實際上跑到了多少比例的程式碼。雖然 100% 的覆蓋率不等於沒有 bug，但低覆蓋率往往代表有些重要的邏輯沒有被測試到。

### go test -cover

最簡單的方式，直接在執行測試時加上 `-cover` 旗標：

```bash
go test -cover ./...
```

```text
輸出範例：
ok      myproject/calculator   0.003s  coverage: 85.7% of statements
ok      myproject/utils        0.001s  coverage: 100.0% of statements
```

### go test -coverprofile

如果你想更仔細分析哪些程式碼沒有被測到，可以輸出詳細的覆蓋率報告：

```bash
# 產生覆蓋率報告檔
go test -coverprofile=coverage.out ./...

# 在終端機查看每個函數的覆蓋率
go tool cover -func=coverage.out
```

```text
輸出範例：
myproject/calculator/calculator.go:5:   Add         100.0%
myproject/calculator/calculator.go:9:   Divide      75.0%
myproject/calculator/calculator.go:18:  Multiply    100.0%
total:                                  (statements) 88.9%
```

### go tool cover -html 視覺化

這個功能會把覆蓋率報告變成一個 HTML 頁面，用顏色標示哪些程式碼有被測到（綠色）、哪些沒有（紅色）：

```bash
# 用瀏覽器開啟視覺化報告
go tool cover -html=coverage.out
```

綠色代表測試有跑到的程式碼，紅色代表從來沒有被任何測試執行過的程式碼，這讓你一眼就能看出測試的盲點在哪裡。

---

## 7. 測試輔助技巧

### testify 套件（assert、require）簡介

Go 標準的 `testing` 套件比較低階，你需要自己寫 `if` 來判斷結果。`testify` 是社群最受歡迎的測試輔助套件，它提供了更簡潔的斷言語法。

```bash
# 安裝 testify
go get github.com/stretchr/testify
```

```go
package calculator

import (
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestAddWithTestify(t *testing.T) {
    result := Add(2, 3)

    // assert.Equal：失敗後繼續執行，類似 t.Error
    assert.Equal(t, 5, result, "2 + 3 應該等於 5")

    // assert.NotEqual：確認兩個值不相等
    assert.NotEqual(t, 0, result)

    // assert.NoError：確認沒有 error
    val, err := Divide(10, 2)
    assert.NoError(t, err)
    assert.Equal(t, 5.0, val)

    // assert.Error：確認有 error
    _, err = Divide(10, 0)
    assert.Error(t, err)
}

func TestRequireExample(t *testing.T) {
    // require.Equal：失敗後立刻停止，類似 t.Fatal
    // 適合用在：如果這個前提條件不成立，後面的驗證沒有意義
    data, err := fetchData()
    require.NoError(t, err, "取得資料失敗，無法繼續測試")
    require.NotNil(t, data)

    // 只有上面的條件都通過，才會執行到這裡
    assert.Equal(t, "expected", data.Value)
}
```

### t.Helper() 的用途

當你把重複的驗證邏輯抽出來變成輔助函數，如果測試失敗了，Go 會顯示輔助函數內部的行號，而不是呼叫輔助函數的那一行，這樣很難追蹤問題。`t.Helper()` 解決了這個問題，它告訴測試框架：「這個函數是輔助工具，失敗訊息請顯示呼叫我的那一行。」

```go
package calculator

import "testing"

// assertEqual 是自定義的輔助函數
func assertEqual(t *testing.T, got, want int) {
    t.Helper() // 加上這一行，失敗訊息會指向呼叫 assertEqual 的地方
    if got != want {
        t.Errorf("got = %d，want = %d", got, want)
    }
}

func TestAddWithHelper(t *testing.T) {
    assertEqual(t, Add(2, 3), 5)   // 如果失敗，錯誤會指向這一行
    assertEqual(t, Add(0, 0), 0)   // 而不是 assertEqual 函數內部
    assertEqual(t, Add(-1, 1), 0)
}
```

### t.Cleanup() 清理資源

`t.Cleanup` 讓你在測試結束後自動清理資源，不管測試成功還是失敗都會執行，類似 `defer` 但是是針對整個測試的生命週期。

```go
package fileops

import (
    "os"
    "testing"
)

func TestWriteFile(t *testing.T) {
    // 建立一個暫時的測試檔案
    tmpFile, err := os.CreateTemp("", "test-*.txt")
    if err != nil {
        t.Fatal("無法建立暫存檔案", err)
    }

    // 登記清理工作：測試結束後自動刪除暫存檔案
    t.Cleanup(func() {
        os.Remove(tmpFile.Name())
    })

    // 執行你要測試的邏輯
    err = WriteFile(tmpFile.Name(), "hello world")
    if err != nil {
        t.Errorf("WriteFile 失敗：%v", err)
    }

    // 不管這個測試成不成功，t.Cleanup 登記的函數都會執行
}
```

### t.Parallel() 並行測試

如果你的測試之間沒有相互依賴，加上 `t.Parallel()` 可以讓多個測試同時執行，大幅縮短整體測試時間。

```go
package calculator

import "testing"

func TestParallelExample(t *testing.T) {
    tests := []struct {
        name string
        a, b int
        want int
    }{
        {"案例一", 1, 2, 3},
        {"案例二", 5, 5, 10},
        {"案例三", 0, 0, 0},
    }

    for _, tt := range tests {
        tt := tt // 重要！在 Go 1.22 之前，必須在迴圈內重新宣告，避免閉包捕獲問題
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel() // 宣告這個子測試可以並行執行
            got := Add(tt.a, tt.b)
            if got != tt.want {
                t.Errorf("Add(%d, %d) = %d，want %d", tt.a, tt.b, got, tt.want)
            }
        })
    }
}
```

---

## 8. Mock 與測試替身

### 用 interface 解耦讓程式碼可測試

當你的程式依賴外部資源（資料庫、HTTP API、檔案系統），直接在測試裡使用真實的外部依賴會帶來很多問題：測試速度慢、需要特定環境、結果不穩定。解決方案是用 interface 把依賴抽象化，測試時換成假的實作（Mock）。

```go
// user_service.go
package userservice

// 定義 interface，而不是直接依賴具體的資料庫實作
type UserRepository interface {
    GetUser(id int) (*User, error)
    SaveUser(user *User) error
}

type User struct {
    ID   int
    Name string
}

type UserService struct {
    repo UserRepository // 依賴 interface，不依賴具體實作
}

func NewUserService(repo UserRepository) *UserService {
    return &UserService{repo: repo}
}

func (s *UserService) GetUserName(id int) (string, error) {
    user, err := s.repo.GetUser(id)
    if err != nil {
        return "", fmt.Errorf("取得使用者失敗：%w", err)
    }
    return user.Name, nil
}
```

### 手寫 Mock 範例

```go
// user_service_test.go
package userservice

import (
    "errors"
    "testing"
)

// MockUserRepository 是 UserRepository 的假實作，只用於測試
type MockUserRepository struct {
    // 可以設定要回傳的資料或錯誤
    users map[int]*User
    err   error
}

func (m *MockUserRepository) GetUser(id int) (*User, error) {
    if m.err != nil {
        return nil, m.err
    }
    user, ok := m.users[id]
    if !ok {
        return nil, errors.New("使用者不存在")
    }
    return user, nil
}

func (m *MockUserRepository) SaveUser(user *User) error {
    if m.err != nil {
        return m.err
    }
    m.users[user.ID] = user
    return nil
}

func TestGetUserName_Success(t *testing.T) {
    // 準備 Mock，預設回傳一個假的使用者
    mockRepo := &MockUserRepository{
        users: map[int]*User{
            1: {ID: 1, Name: "小明"},
        },
    }

    service := NewUserService(mockRepo)
    name, err := service.GetUserName(1)

    if err != nil {
        t.Fatalf("不期望有錯誤，但得到：%v", err)
    }
    if name != "小明" {
        t.Errorf("期望名字是「小明」，但得到「%s」", name)
    }
}

func TestGetUserName_RepositoryError(t *testing.T) {
    // 模擬資料庫出錯的情況
    mockRepo := &MockUserRepository{
        users: map[int]*User{},
        err:   errors.New("資料庫連線失敗"),
    }

    service := NewUserService(mockRepo)
    _, err := service.GetUserName(1)

    if err == nil {
        t.Error("期望收到錯誤，但沒有")
    }
}
```

### 為什麼避免測試私有函數

Go 的私有函數（小寫開頭）是實作細節，測試應該著重在公開的行為，而不是內部的實作方式。如果你發現自己很想測試私有函數，通常代表：

1. 這個私有函數的邏輯其實應該被提升為公開函數
2. 或者你的公開函數測試不夠完整，沒有涵蓋到這個私有函數的所有情境

測試私有函數會讓你的測試和實作細節綁定得太緊，當你重構內部邏輯時，測試也跟著需要大改，失去了測試作為安全網的意義。

---

## 9. 整合測試 vs 單元測試

### 差異比較

```text
┌─────────────┬───────────────────────────┬───────────────────────────┐
│             │ 單元測試                  │ 整合測試                  │
├─────────────┼───────────────────────────┼───────────────────────────┤
│ 測試範圍    │ 單一函數或模組            │ 多個元件協同運作          │
│ 外部依賴    │ 用 Mock 替代              │ 使用真實的資料庫、API 等  │
│ 執行速度    │ 非常快（毫秒級）          │ 較慢（秒級甚至更長）      │
│ 執行頻率    │ 每次儲存、每次 CI 都跑    │ 通常在特定流程才跑        │
│ 環境需求    │ 不需要特殊環境            │ 需要資料庫、網路等環境    │
│ 問題定位    │ 精確，容易找到 bug 位置   │ 較廣泛，確認整體流程正確  │
└─────────────┴───────────────────────────┴───────────────────────────┘
```

### build tag 控制測試執行

你可以用 build tag 把整合測試和單元測試分開，讓日常開發只跑快速的單元測試，整合測試在特定的 CI 階段才執行。

```go
// db_integration_test.go

//go:build integration
// 注意：上面這行和 package 宣告之間必須有一個空白行

package database

import (
    "database/sql"
    "testing"
    _ "github.com/lib/pq"
)

// 這個測試只有在加上 -tags integration 時才會被編譯和執行
func TestDatabaseConnection(t *testing.T) {
    db, err := sql.Open("postgres", "postgres://localhost/testdb?sslmode=disable")
    if err != nil {
        t.Fatal("無法連接資料庫：", err)
    }
    defer db.Close()

    err = db.Ping()
    if err != nil {
        t.Fatal("資料庫 Ping 失敗：", err)
    }
}

func TestSaveAndGetUser(t *testing.T) {
    // 這裡使用真實的資料庫，驗證整個存取流程
    db, err := sql.Open("postgres", "postgres://localhost/testdb?sslmode=disable")
    if err != nil {
        t.Fatal(err)
    }
    defer db.Close()

    // ... 實際操作資料庫的測試邏輯
}
```

```go
// user_service_test.go（一般的單元測試，不需要任何 build tag）
package database

import "testing"

func TestProcessUser(t *testing.T) {
    // 這個測試沒有 build tag，永遠都會執行
    // 使用 Mock 而不是真實資料庫
}
```

```bash
# 只執行一般的單元測試（預設，不包含整合測試）
go test ./...

# 執行所有測試，包含整合測試
go test -tags integration ./...

# 在 CI 的不同階段分開執行
go test ./...                        # 快速的單元測試，每個 PR 都跑
go test -tags integration ./...      # 整合測試，在部署前才跑
```

你也可以用環境變數來控制，搭配 `testing.Short()` 跳過耗時的測試：

```go
func TestHeavyOperation(t *testing.T) {
    // 如果加了 -short 旗標，就跳過這個耗時測試
    if testing.Short() {
        t.Skip("加了 -short 旗標，跳過耗時測試")
    }

    // ... 耗時的測試邏輯
}
```

```bash
# 跳過所有標記了 t.Skip 的測試
go test -short ./...
```

---

恭喜你看完了這份指南！測試是一項需要時間培養習慣的技能，建議你從今天起，試著為自己下一個寫的函數補上對應的測試，慢慢地就會發現寫測試其實一點都不難，反而讓你對自己的程式碼更有信心。

文件更新日期：2026年5月29日
