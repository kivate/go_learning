# Go 泛型（Generics）完整指南（Go 1.18+）

[← 返回目錄](README.md)

---

這份指南專為 Go 入門者設計，帶你從「為什麼需要泛型」開始，一步步理解泛型的語法、用法與限制。每個概念都附有實際範例，讓你讀完就能上手。

---

## 1. 為什麼需要泛型？

### 沒有泛型時的痛點

在 Go 1.18 之前，如果你想寫一個「找出 slice 中最大值」的函數，你必須為每種型別各寫一份：

```go
// 只能用在 int
func MaxInt(a, b int) int {
    if a > b {
        return a
    }
    return b
}

// 只能用在 float64，程式碼幾乎一樣，但必須複製
func MaxFloat64(a, b float64) float64 {
    if a > b {
        return a
    }
    return b
}

// 只能用在 string，又複製一次...
func MaxString(a, b string) string {
    if a > b {
        return a
    }
    return b
}
```

這就是「重複程式碼」的痛點：邏輯完全相同，只有型別不同，卻必須寫三份。

### 用 interface{} 的問題：失去型別安全

你可能會想：「用 `interface{}` 不就可以通用了嗎？」

```go
func MaxAny(a, b interface{}) interface{} {
    // 問題：interface{} 不能直接用 > 比較！
    // 需要型別斷言，程式碼變得醜陋
    switch v := a.(type) {
    case int:
        if v > b.(int) {
            return a
        }
        return b
    case float64:
        if v > b.(float64) {
            return a
        }
        return b
    }
    return nil
}

func main() {
    result := MaxAny(3, 5)
    // 回傳的是 interface{}，你必須自己做型別斷言才能用
    fmt.Println(result.(int) + 1) // 容易出錯，編譯器不幫你檢查
}
```

```text
interface{} 的問題：
1. 呼叫端收到 interface{}，必須自行斷言型別
2. 型別錯誤要等到執行時才會爆發，不是編譯時
3. 程式碼內部還是要寫大量 switch/type assertion
```

### 泛型解決的問題：寫一次，適用多種型別

有了泛型，你只需要寫一次：

```go
// 一個函數，適用 int、float64、string 等所有可比較的型別
func Max[T int | float64 | string](a, b T) T {
    if a > b {
        return a
    }
    return b
}

func main() {
    fmt.Println(Max(3, 5))         // 輸出：5（自動推斷 T = int）
    fmt.Println(Max(3.14, 2.71))   // 輸出：3.14（自動推斷 T = float64）
    fmt.Println(Max("apple", "banana")) // 輸出：banana
}
```

---

## 2. 型別參數（Type Parameter）基礎

### 函數的型別參數語法

型別參數放在函數名稱後面的方括號 `[]` 裡：

```go
// 語法：func 函數名稱[型別參數 約束](一般參數) 回傳型別
func 函數名稱[T any](x T) T {
    return x
}
```

```text
拆解說明：
  func Print[T any](x T)
             ↑       ↑
             │       └─ 一般參數，型別是 T
             └─ 型別參數，T 是名稱，any 是約束（任何型別都行）
```

實際範例：

```go
// 接受任何型別，原樣回傳
func Identity[T any](x T) T {
    return x
}

func main() {
    fmt.Println(Identity(42))       // 輸出：42
    fmt.Println(Identity("hello"))  // 輸出：hello
    fmt.Println(Identity(3.14))     // 輸出：3.14
}
```

### 呼叫時自動推斷或明確指定型別

Go 編譯器通常能從引數自動推斷型別，你也可以明確指定：

```go
func Double[T int | float64](x T) T {
    return x * 2
}

func main() {
    // 自動推斷（推薦，較簡潔）
    fmt.Println(Double(5))    // T 被推斷為 int，輸出：10
    fmt.Println(Double(2.5))  // T 被推斷為 float64，輸出：5

    // 明確指定型別（當編譯器無法推斷時使用）
    fmt.Println(Double[int](5))      // 明確指定 T = int
    fmt.Println(Double[float64](5))  // 明確指定 T = float64，輸出：10（而非 10.0 的整數版）
}
```

### 多個型別參數

一個函數可以有多個型別參數，用逗號分隔：

```go
// 兩個不同型別的參數
func ZipMap[K comparable, V any](keys []K, values []V) map[K]V {
    result := make(map[K]V)
    for i := 0; i < len(keys) && i < len(values); i++ {
        result[keys[i]] = values[i]
    }
    return result
}

func main() {
    keys := []string{"name", "age", "city"}
    values := []interface{}{"Alice", 30, "Taipei"}
    m := ZipMap(keys, values)
    fmt.Println(m) // map[age:30 city:Taipei name:Alice]
}
```

---

## 3. 型別約束（Constraints）

約束（Constraint）決定了型別參數 T 可以是哪些型別，以及在函數內能對 T 做什麼操作。

### any：無任何限制

`any` 等同於 `interface{}`，表示接受任何型別：

```go
func PrintAll[T any](items []T) {
    for _, item := range items {
        fmt.Println(item)
    }
}

func main() {
    PrintAll([]int{1, 2, 3})
    PrintAll([]string{"a", "b", "c"})
}
```

```text
注意：用 any 約束時，你只能對 T 做「所有型別都支援的操作」
例如：可以賦值、傳遞、印出（fmt.Println 接受 interface{}）
但是：不能做 +、>、== 等運算（因為不是所有型別都支援）
```

### comparable：可以用 == 比較

`comparable` 約束表示型別支援 `==` 和 `!=` 運算：

```go
// 在 slice 中尋找元素是否存在
func Contains[T comparable](slice []T, target T) bool {
    for _, v := range slice {
        if v == target { // 因為有 comparable 約束，才能用 ==
            return true
        }
    }
    return false
}

func main() {
    nums := []int{1, 2, 3, 4, 5}
    fmt.Println(Contains(nums, 3))    // 輸出：true
    fmt.Println(Contains(nums, 10))   // 輸出：false

    words := []string{"go", "rust", "python"}
    fmt.Println(Contains(words, "go")) // 輸出：true
}
```

### 自訂 interface 約束（限制必須有哪些方法）

你可以用 interface 定義約束，要求型別必須實作某些方法：

```go
// 定義約束：型別必須有 String() 方法
type Stringer interface {
    String() string
}

// 印出任何有 String() 方法的型別
func PrintString[T Stringer](item T) {
    fmt.Println(item.String())
}

// 實作 String() 方法的自訂型別
type Person struct {
    Name string
    Age  int
}

func (p Person) String() string {
    return fmt.Sprintf("%s (age %d)", p.Name, p.Age)
}

type Color int

func (c Color) String() string {
    colors := []string{"Red", "Green", "Blue"}
    return colors[c]
}

func main() {
    PrintString(Person{Name: "Alice", Age: 30}) // 輸出：Alice (age 30)
    PrintString(Color(1))                        // 輸出：Green
}
```

### 聯合型別約束：~int | ~string（底層型別）

用 `|` 可以列出多個可接受的型別；加上 `~` 表示「底層型別為這個的都接受」：

```go
// 定義數值型別的約束
type Number interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64 |
    ~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 |
    ~float32 | ~float64
}

func Sum[T Number](nums []T) T {
    var total T
    for _, n := range nums {
        total += n
    }
    return total
}

// ~ 的重要性：自訂型別的底層型別也會被接受
type MyInt int  // 底層型別是 int

func main() {
    fmt.Println(Sum([]int{1, 2, 3, 4, 5}))           // 輸出：15
    fmt.Println(Sum([]float64{1.1, 2.2, 3.3}))        // 輸出：6.6

    myNums := []MyInt{10, 20, 30}
    fmt.Println(Sum(myNums)) // 因為有 ~int，MyInt 也被接受，輸出：60
}
```

```text
~ 的含義：
  int         只接受精確的 int 型別
  ~int        接受 int，以及所有底層型別為 int 的自訂型別（如 type MyInt int）
```

### golang.org/x/exp/constraints 套件常用約束

Go 官方擴充套件提供了現成的常用約束：

```go
import "golang.org/x/exp/constraints"

// constraints.Integer  = 所有整數型別（含 ~int, ~int8, ..., ~uint, ...）
// constraints.Float    = ~float32 | ~float64
// constraints.Number   = Integer | Float
// constraints.Ordered  = Integer | Float | ~string（支援 < > <= >= 比較）

func Min[T constraints.Ordered](a, b T) T {
    if a < b {
        return a
    }
    return b
}

func main() {
    fmt.Println(Min(3, 5))        // 輸出：3
    fmt.Println(Min(3.14, 2.71)) // 輸出：2.71
    fmt.Println(Min("apple", "banana")) // 輸出：apple
}
```

如果不想引入外部套件，可以自己定義相同效果的約束：

```go
// 自己定義 Ordered（等同 constraints.Ordered）
type Ordered interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64 |
    ~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 |
    ~float32 | ~float64 | ~string
}
```

---

## 4. 泛型函數實際範例

### 泛型 Map：將 slice 每個元素轉換

```go
// Map 將 []T 的每個元素，透過 f 函數轉換成 U，回傳 []U
func Map[T, U any](slice []T, f func(T) U) []U {
    result := make([]U, len(slice))
    for i, v := range slice {
        result[i] = f(v)
    }
    return result
}

func main() {
    // int slice 轉換成 string slice
    nums := []int{1, 2, 3, 4, 5}
    strs := Map(nums, func(n int) string {
        return fmt.Sprintf("No.%d", n)
    })
    fmt.Println(strs) // 輸出：[No.1 No.2 No.3 No.4 No.5]

    // 取出每個字串的長度
    words := []string{"go", "generics", "are", "awesome"}
    lengths := Map(words, func(s string) int {
        return len(s)
    })
    fmt.Println(lengths) // 輸出：[2 8 3 7]

    // 所有數字乘以 2
    doubled := Map(nums, func(n int) int { return n * 2 })
    fmt.Println(doubled) // 輸出：[2 4 6 8 10]
}
```

### 泛型 Filter：過濾 slice

```go
// Filter 回傳 slice 中所有讓 f 回傳 true 的元素
func Filter[T any](slice []T, f func(T) bool) []T {
    var result []T
    for _, v := range slice {
        if f(v) {
            result = append(result, v)
        }
    }
    return result
}

func main() {
    nums := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}

    // 過濾出偶數
    evens := Filter(nums, func(n int) bool { return n%2 == 0 })
    fmt.Println(evens) // 輸出：[2 4 6 8 10]

    // 過濾出大於 5 的數
    big := Filter(nums, func(n int) bool { return n > 5 })
    fmt.Println(big) // 輸出：[6 7 8 9 10]

    // 過濾出長度大於 3 的字串
    words := []string{"go", "rust", "python", "c", "java"}
    long := Filter(words, func(s string) bool { return len(s) > 3 })
    fmt.Println(long) // 輸出：[rust python java]
}
```

### 泛型 Reduce：聚合計算

```go
// Reduce 從初始值 init 開始，依序對每個元素套用 f，最終得到一個結果
func Reduce[T, U any](slice []T, init U, f func(U, T) U) U {
    result := init
    for _, v := range slice {
        result = f(result, v)
    }
    return result
}

func main() {
    nums := []int{1, 2, 3, 4, 5}

    // 加總
    sum := Reduce(nums, 0, func(acc, n int) int { return acc + n })
    fmt.Println(sum) // 輸出：15

    // 乘積
    product := Reduce(nums, 1, func(acc, n int) int { return acc * n })
    fmt.Println(product) // 輸出：120

    // 將 int slice 轉成字串拼接
    result := Reduce(nums, "", func(acc string, n int) string {
        if acc == "" {
            return fmt.Sprintf("%d", n)
        }
        return acc + "," + fmt.Sprintf("%d", n)
    })
    fmt.Println(result) // 輸出：1,2,3,4,5
}
```

### 泛型 Contains：查找元素

```go
func Contains[T comparable](slice []T, target T) bool {
    for _, v := range slice {
        if v == target {
            return true
        }
    }
    return false
}

func main() {
    nums := []int{10, 20, 30, 40, 50}
    fmt.Println(Contains(nums, 30))  // 輸出：true
    fmt.Println(Contains(nums, 99))  // 輸出：false

    tags := []string{"go", "backend", "api"}
    fmt.Println(Contains(tags, "go"))      // 輸出：true
    fmt.Println(Contains(tags, "frontend")) // 輸出：false
}
```

### Min / Max 函數

```go
type Ordered interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64 |
    ~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 |
    ~float32 | ~float64 | ~string
}

func Min[T Ordered](a, b T) T {
    if a < b {
        return a
    }
    return b
}

func Max[T Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}

// 在 slice 中找最小值
func MinSlice[T Ordered](slice []T) T {
    if len(slice) == 0 {
        panic("empty slice")
    }
    m := slice[0]
    for _, v := range slice[1:] {
        if v < m {
            m = v
        }
    }
    return m
}

func main() {
    fmt.Println(Min(3, 7))           // 輸出：3
    fmt.Println(Max(3.14, 2.71))     // 輸出：3.14
    fmt.Println(Min("apple", "fig")) // 輸出：apple

    nums := []int{5, 2, 8, 1, 9, 3}
    fmt.Println(MinSlice(nums)) // 輸出：1
}
```

---

## 5. 泛型 struct

### 帶型別參數的 struct 宣告

struct 的型別參數也放在方括號 `[]` 裡，緊接在 struct 名稱後面：

```go
// 語法
type 結構名稱[T 約束] struct {
    欄位 T
}
```

### 泛型 Stack（堆疊）完整實作

Stack 是一個後進先出（LIFO）的資料結構，用泛型實作後可以存放任何型別：

```go
package main

import (
    "errors"
    "fmt"
)

// 泛型 Stack，可存放任意型別 T
type Stack[T any] struct {
    items []T
}

// Push：把元素推入堆疊頂端
func (s *Stack[T]) Push(item T) {
    s.items = append(s.items, item)
}

// Pop：從堆疊頂端取出元素
func (s *Stack[T]) Pop() (T, error) {
    var zero T // T 的零值
    if len(s.items) == 0 {
        return zero, errors.New("stack is empty")
    }
    top := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return top, nil
}

// Peek：查看頂端元素但不取出
func (s *Stack[T]) Peek() (T, error) {
    var zero T
    if len(s.items) == 0 {
        return zero, errors.New("stack is empty")
    }
    return s.items[len(s.items)-1], nil
}

// Size：回傳堆疊大小
func (s *Stack[T]) Size() int {
    return len(s.items)
}

// IsEmpty：是否為空
func (s *Stack[T]) IsEmpty() bool {
    return len(s.items) == 0
}

func main() {
    // int 版 Stack
    var intStack Stack[int]
    intStack.Push(1)
    intStack.Push(2)
    intStack.Push(3)

    top, _ := intStack.Pop()
    fmt.Println(top)           // 輸出：3
    fmt.Println(intStack.Size()) // 輸出：2

    // string 版 Stack，同樣的程式碼！
    var strStack Stack[string]
    strStack.Push("first")
    strStack.Push("second")
    strStack.Push("third")

    peek, _ := strStack.Peek()
    fmt.Println(peek) // 輸出：third（沒有取出）
    fmt.Println(strStack.Size()) // 輸出：3
}
```

### 泛型 Pair（鍵值對）

```go
// Pair 可以存放兩個不同型別的值
type Pair[F, S any] struct {
    First  F
    Second S
}

// 建立 Pair 的輔助函數
func NewPair[F, S any](first F, second S) Pair[F, S] {
    return Pair[F, S]{First: first, Second: second}
}

// Swap：交換兩個值（回傳新的 Pair）
func (p Pair[F, S]) Swap() Pair[S, F] {
    return Pair[S, F]{First: p.Second, Second: p.First}
}

func main() {
    // string 和 int 的 Pair
    p1 := NewPair("Alice", 30)
    fmt.Printf("Name: %s, Age: %d\n", p1.First, p1.Second)
    // 輸出：Name: Alice, Age: 30

    // 交換
    p2 := p1.Swap()
    fmt.Printf("Age: %d, Name: %s\n", p2.First, p2.Second)
    // 輸出：Age: 30, Name: Alice

    // 任意型別組合
    coord := NewPair(121.5, 25.0) // 經緯度
    fmt.Printf("座標：(%.1f, %.1f)\n", coord.First, coord.Second)
    // 輸出：座標：(121.5, 25.0)

    // 在 map 中使用
    index := NewPair("user", 42) // ("索引鍵名稱", 索引值)
    fmt.Println(index.First, index.Second)
    // 輸出：user 42
}
```

---

## 6. 泛型的限制（重要）

### 不支援泛型方法（只能在函數層級）

Go 目前不允許在方法上直接定義新的型別參數：

```go
type MyContainer struct{}

// 錯誤！方法不能有自己的型別參數
// func (c MyContainer) Transform[T any](x T) T { ... }

// 正確做法：用一般函數（不是方法）
func Transform[T any](c MyContainer, x T) T {
    return x
}

// 或者，把型別參數放在 struct 層級
type TypedContainer[T any] struct {
    value T
}

// 這樣方法可以使用 struct 的型別參數（但不是方法自己的）
func (c TypedContainer[T]) Get() T {
    return c.value
}
```

```text
規則：
  可以：struct 定義型別參數，方法使用這個參數
  不可以：方法自己額外定義新的型別參數

原因：Go 團隊認為泛型方法讓語言過於複雜，
      且大部分需求可以透過泛型函數滿足
```

### 型別參數不能只用在部分欄位

如果 struct 的某個欄位需要泛型，整個 struct 必須泛型化：

```go
// 錯誤思路：只想讓 Value 欄位是泛型
// type Box struct {
//     Label string
//     Value T  // 無法這樣寫！T 從哪裡來？
// }

// 正確做法：整個 struct 泛型化
type Box[T any] struct {
    Label string
    Value T // 現在 T 有定義了
}

func main() {
    intBox := Box[int]{Label: "number", Value: 42}
    strBox := Box[string]{Label: "text", Value: "hello"}

    fmt.Printf("%s: %v\n", intBox.Label, intBox.Value)
    fmt.Printf("%s: %v\n", strBox.Label, strBox.Value)
}
```

### 執行時沒有額外成本（編譯期決議）

這是個好消息：泛型在編譯時就決定了具體型別，不是執行時的動態機制。

```text
編譯期發生的事：
  你寫了 Max[T Ordered](a, b T) T

  編譯器看到你呼叫 Max(3, 5)    → 產生 Max_int 的實作
  編譯器看到你呼叫 Max(3.14, 2.71) → 產生 Max_float64 的實作

  實際上等同於你手寫了 MaxInt 和 MaxFloat64
  所以執行效能與手寫版相同，沒有額外的動態分派成本
```

```go
// 這兩種寫法的執行效能是一樣的：

// 寫法一：泛型（Go 1.18+）
func MaxGeneric[T int | float64](a, b T) T {
    if a > b {
        return a
    }
    return b
}

// 寫法二：手寫版
func MaxInt(a, b int) int {
    if a > b {
        return a
    }
    return b
}
// 泛型版在編譯後的機器碼和手寫版幾乎相同
```

---

## 7. 什麼時候該用泛型

### 適合使用泛型的場景

#### 資料結構（Stack、Queue、Set）

資料結構的邏輯與存放的型別無關，泛型非常適合：

```go
// 泛型 Set（集合）
type Set[T comparable] struct {
    items map[T]struct{}
}

func NewSet[T comparable]() Set[T] {
    return Set[T]{items: make(map[T]struct{})}
}

func (s *Set[T]) Add(item T) {
    s.items[item] = struct{}{}
}

func (s *Set[T]) Has(item T) bool {
    _, ok := s.items[item]
    return ok
}

func (s *Set[T]) Remove(item T) {
    delete(s.items, item)
}

func main() {
    tags := NewSet[string]()
    tags.Add("go")
    tags.Add("backend")
    tags.Add("go") // 重複加入不會有兩個

    fmt.Println(tags.Has("go"))      // 輸出：true
    fmt.Println(tags.Has("frontend")) // 輸出：false
}
```

#### 工具函數（Map / Filter / Reduce）

第 4 章已示範過，這類通用的集合操作非常適合泛型。

### 不適合使用泛型的場景

#### 業務邏輯

業務邏輯通常針對特定型別，強行使用泛型只會讓程式碼變複雜：

```go
// 不需要泛型：這就是針對 User 的操作
func CreateUser(name string, age int) User {
    return User{Name: name, Age: age}
}

// 不需要泛型：這就是特定的業務計算
func CalculateDiscount(price float64, memberLevel int) float64 {
    return price * (1.0 - float64(memberLevel)*0.05)
}
```

#### 用 interface 已足夠的場景

如果你只需要「呼叫某個方法」，interface 比泛型更清晰：

```go
// 情況：你需要各種動物都能叫
type Animal interface {
    Sound() string
}

// 用 interface 就夠了，不需要泛型
func MakeSound(a Animal) {
    fmt.Println(a.Sound())
}

// 如果用泛型反而變複雜
// func MakeSound[T Animal](a T) { ... }  // 沒有比上面更好
```

### 判斷原則

```text
判斷要不要用泛型的核心問題：

「如果沒有泛型，你會複製貼上同樣的邏輯、只改型別嗎？」

  答案是「是」→ 應該用泛型
  答案是「否」→ 不需要泛型

另外兩個輔助判斷：
  - 這是資料結構或工具函數嗎？    → 考慮用泛型
  - 這是業務邏輯或領域模型嗎？    → 不要用泛型
```

---

## 8. 與 interface 的選擇

### 泛型 vs interface 對比表

```text
┌─────────────────┬───────────────────────────┬────────────────────────────┐
│ 特性            │ 泛型（Generics）           │ interface                  │
├─────────────────┼───────────────────────────┼────────────────────────────┤
│ 型別安全        │ 編譯期確認，完全型別安全   │ 可能需要執行期型別斷言     │
│ 效能            │ 編譯期決議，無額外成本     │ 動態分派，略有成本         │
│ 彈性            │ 約束明確，可做型別相關運算 │ 只能呼叫 interface 定義的方法│
│ 可讀性          │ 型別參數可能讓語法複雜     │ 通常更直覺、更簡單         │
│ 適用場景        │ 容器/工具函數/演算法       │ 行為抽象/依賴注入/多型     │
│ 呼叫端使用      │ 自動型別推斷，使用簡單     │ 需要實作 interface         │
│ 回傳型別        │ 保留原始型別資訊           │ 回傳 interface，需斷言     │
└─────────────────┴───────────────────────────┴────────────────────────────┘
```

### 各自適合的場景

#### 選擇泛型的情境

```go
// 情境：你想寫一個通用的快取，可以存放任何型別的值
type Cache[K comparable, V any] struct {
    data map[K]V
}

func (c *Cache[K, V]) Set(key K, value V) {
    if c.data == nil {
        c.data = make(map[K]V)
    }
    c.data[key] = value
}

func (c *Cache[K, V]) Get(key K) (V, bool) {
    v, ok := c.data[key]
    return v, ok
}

func main() {
    // 使用 string key，int value 的快取
    cache := Cache[string, int]{}
    cache.Set("score", 100)

    score, ok := cache.Get("score")
    if ok {
        // score 直接就是 int，不需要型別斷言！
        fmt.Println(score + 1) // 輸出：101
    }
}
```

#### 選擇 interface 的情境

```go
// 情境：你有多種付款方式，每種行為不同
type PaymentMethod interface {
    Pay(amount float64) error
    GetName() string
}

type CreditCard struct{ CardNumber string }
func (c CreditCard) Pay(amount float64) error { /* 信用卡扣款邏輯 */ return nil }
func (c CreditCard) GetName() string { return "Credit Card" }

type LinePay struct{ PhoneNumber string }
func (l LinePay) Pay(amount float64) error { /* LINE Pay 扣款邏輯 */ return nil }
func (l LinePay) GetName() string { return "LINE Pay" }

// 用 interface 清晰表達「任何付款方式」
func Checkout(payment PaymentMethod, total float64) {
    fmt.Printf("使用 %s 付款 %.2f 元\n", payment.GetName(), total)
    payment.Pay(total)
}

func main() {
    // 可以傳入任何實作了 PaymentMethod 的型別
    Checkout(CreditCard{CardNumber: "1234-5678"}, 350.0)
    Checkout(LinePay{PhoneNumber: "0912345678"}, 120.0)
}
```

```text
選擇指引總結：

用泛型當：
  ✓ 你在寫容器（Stack、Queue、Cache、Set）
  ✓ 你在寫集合操作（Map、Filter、Reduce、Sort）
  ✓ 邏輯相同，只有型別不同
  ✓ 你希望回傳值保留原始型別，不需要型別斷言

用 interface 當：
  ✓ 你在定義行為規範（「所有付款方式都要能 Pay()」）
  ✓ 你在做依賴注入（方便測試時替換實作）
  ✓ 各個型別的行為實作完全不同
  ✓ 你需要在執行期動態決定用哪個實作
```

---

## 小結

泛型是 Go 語言一個強大的補充，讓你在保持型別安全的同時，避免重複程式碼。記住以下幾個核心概念：

1. 型別參數放在 `[]` 裡，緊接在函數名或 struct 名後面
2. 約束決定了你能對型別參數做什麼操作
3. `any` = 無限制，`comparable` = 可用 `==`，自訂 interface = 需要特定方法
4. `~T` 表示接受所有底層型別為 T 的型別
5. 泛型方法不支援自己的型別參數，但可以使用 struct 的型別參數
6. 編譯期決議，執行效能與手寫版相同
7. 「如果沒有泛型你會複製貼上」→ 就該用泛型

---

[← 返回目錄](README.md)

文件更新日期：2026年5月29日
