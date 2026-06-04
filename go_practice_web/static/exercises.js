/* eslint-disable */
const EXERCISES = [

  // ============================================================
  // 第 1 章：基礎語法
  // ============================================================
  {
    id: 'basic-01',
    chapterId: 'basic',
    chapterTitle: '1. 基礎語法',
    title: '1-1 變數宣告與格式化',
    difficulty: 'easy',
    concept: `## 變數宣告

Go 提供三種宣告方式：

\`\`\`go
// 方式一：完整 var 宣告
var name string = "Alice"

// 方式二：型別推斷（最常用）
age := 25

// 方式三：一次宣告多個
a, b := 1, 2
\`\`\`

### fmt.Sprintf 格式化符號

| 符號 | 用途 |
|------|------|
| \`%s\` | 字串 |
| \`%d\` | 整數 |
| \`%.1f\` | 浮點數（1 位小數） |
| \`%v\` | 任意型別 |`,
    description: `### 練習：格式化使用者資訊

實作 \`describeUser\`，接收四個變數並回傳格式化字串。

**函數簽名**：
\`\`\`go
func describeUser(name string, age int, score float64, isPass bool) string
\`\`\`

**範例**：
\`\`\`
describeUser("Alice", 25, 98.5, true) → "name=Alice, age=25, score=98.5, pass=true"
\`\`\``,
    prefix: `package main

import "fmt"

`,
    template: `func describeUser(name string, age int, score float64, isPass bool) string {
    // TODO: 用 fmt.Sprintf 回傳格式化字串
    // 格式: "name=Alice, age=25, score=98.5, pass=true"
    return ""
}`,
    solution: `func describeUser(name string, age int, score float64, isPass bool) string {
    return fmt.Sprintf("name=%s, age=%d, score=%.1f, pass=%v", name, age, score, isPass)
}`,
    suffix: `
func main() {
	type tc struct {
		name  string
		age   int
		score float64
		pass  bool
		want  string
	}
	tests := []tc{
		{"Alice", 25, 98.5, true, "name=Alice, age=25, score=98.5, pass=true"},
		{"Bob", 30, 72.3, false, "name=Bob, age=30, score=72.3, pass=false"},
		{"Carol", 22, 60.0, true, "name=Carol, age=22, score=60.0, pass=true"},
	}
	passed := 0
	for i, t := range tests {
		got := describeUser(t.name, t.age, t.score, t.pass)
		if got == t.want {
			passed++
			fmt.Printf("✓ Test %d 通過\\n", i+1)
		} else {
			fmt.Printf("✗ Test %d 失敗\\n  期望: %q\\n  實際: %q\\n", i+1, t.want, got)
		}
	}
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  {
    id: 'basic-02',
    chapterId: 'basic',
    chapterTitle: '1. 基礎語法',
    title: '1-2 for 迴圈：乘法表',
    difficulty: 'easy',
    concept: `## for 迴圈

Go 只有一種迴圈：\`for\`，但能模擬多種形式。

\`\`\`go
// 標準三段式
for i := 0; i < 5; i++ {
    fmt.Println(i)
}

// range 遍歷 slice
for i, v := range []int{10, 20, 30} {
    fmt.Println(i, v)
}
\`\`\`

### 巢狀 for

\`\`\`go
for i := 1; i <= 3; i++ {
    for j := 1; j <= 3; j++ {
        fmt.Printf("%d*%d=%d\\t", i, j, i*j)
    }
    fmt.Println()
}
\`\`\``,
    description: `### 練習：產生乘法表

實作 \`multiTable(n int) []int\`，回傳 n*1 到 n*9 的結果。

**函數簽名**：
\`\`\`go
func multiTable(n int) []int
\`\`\`

**範例**：
\`\`\`
multiTable(3) → [3, 6, 9, 12, 15, 18, 21, 24, 27]
\`\`\``,
    prefix: `package main

import (
	"fmt"
	"reflect"
)

`,
    template: `func multiTable(n int) []int {
    // TODO: 用 for 迴圈計算 n*1 到 n*9，填入 result
    result := make([]int, 9)
    return result
}`,
    solution: `func multiTable(n int) []int {
    result := make([]int, 9)
    for j := 1; j <= 9; j++ {
        result[j-1] = n * j
    }
    return result
}`,
    suffix: `
func main() {
	type tc struct {
		n    int
		want []int
	}
	tests := []tc{
		{3, []int{3, 6, 9, 12, 15, 18, 21, 24, 27}},
		{5, []int{5, 10, 15, 20, 25, 30, 35, 40, 45}},
		{7, []int{7, 14, 21, 28, 35, 42, 49, 56, 63}},
		{1, []int{1, 2, 3, 4, 5, 6, 7, 8, 9}},
	}
	passed := 0
	for i, t := range tests {
		got := multiTable(t.n)
		if reflect.DeepEqual(got, t.want) {
			passed++
			fmt.Printf("✓ Test %d 通過（n=%d）\\n", i+1, t.n)
		} else {
			fmt.Printf("✗ Test %d 失敗\\n  期望: %v\\n  實際: %v\\n", i+1, t.want, got)
		}
	}
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  {
    id: 'basic-03',
    chapterId: 'basic',
    chapterTitle: '1. 基礎語法',
    title: '1-3 函數：GCD 與 LCM',
    difficulty: 'easy',
    concept: `## 函數定義

\`\`\`go
// 基本函數
func add(a, b int) int {
    return a + b
}

// 多回傳值（Go 特色）
func divide(a, b int) (int, int) {
    return a / b, a % b
}
\`\`\`

### 輾轉相除法（Euclidean Algorithm）

\`\`\`
gcd(48, 18):
  48 = 2 × 18 + 12  → gcd(18, 12)
  18 = 1 × 12 + 6   → gcd(12, 6)
  12 = 2 × 6  + 0   → 答案 = 6
\`\`\`

> **注意**：同型別參數可合併：\`func add(a, b int)\``,
    description: `### 練習：最大公因數與最小公倍數

實作 \`gcd(a, b int) int\` 和 \`lcm(a, b int) int\`。

**公式**：lcm(a, b) = a * b / gcd(a, b)

**範例**：
\`\`\`
gcd(48, 18) = 6
lcm(48, 18) = 144
\`\`\``,
    prefix: `package main

import "fmt"

`,
    template: `// TODO: 輾轉相除法
func gcd(a, b int) int {
    return 0
}

// TODO: 利用 gcd 計算 lcm
func lcm(a, b int) int {
    return 0
}`,
    solution: `func gcd(a, b int) int {
    for b != 0 {
        a, b = b, a%b
    }
    return a
}

func lcm(a, b int) int {
    return a * b / gcd(a, b)
}`,
    suffix: `
func main() {
	type tc struct{ a, b, wantGCD, wantLCM int }
	tests := []tc{
		{48, 18, 6, 144},
		{12, 8, 4, 24},
		{100, 75, 25, 300},
		{7, 13, 1, 91},
		{36, 48, 12, 144},
	}
	passed := 0
	for i, t := range tests {
		g, l := gcd(t.a, t.b), lcm(t.a, t.b)
		ok := g == t.wantGCD && l == t.wantLCM
		if ok {
			passed++
			fmt.Printf("✓ Test %d 通過  gcd(%d,%d)=%d  lcm=%d\\n", i+1, t.a, t.b, g, l)
		} else {
			fmt.Printf("✗ Test %d 失敗  gcd 期望=%d 實際=%d  lcm 期望=%d 實際=%d\\n",
				i+1, t.wantGCD, g, t.wantLCM, l)
		}
	}
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  // ============================================================
  // 第 2 章：進階特性
  // ============================================================
  {
    id: 'adv-01',
    chapterId: 'advanced',
    chapterTitle: '2. 進階特性',
    title: '2-1 defer：LIFO 執行順序',
    difficulty: 'easy',
    concept: `## defer

\`defer\` 讓陳述式在**函數回傳前**執行，多個 defer 以 **LIFO（後進先出）** 順序執行。

\`\`\`go
func example() {
    defer fmt.Println("第三個")
    defer fmt.Println("第二個")
    defer fmt.Println("第一個")
    fmt.Println("函數本體")
}
// 輸出：函數本體 → 第一個 → 第二個 → 第三個
\`\`\`

### 命名回傳值 + defer

defer 可修改**命名回傳值**：

\`\`\`go
func withDefer() (result []string) {
    defer func() { result = append(result, "last") }()
    result = append(result, "first")
    return // defer 在這之後才執行
}
// 回傳: ["first", "last"]
\`\`\`

> **注意**：defer 的參數在**宣告時**就求值，不是執行時。`,
    description: `### 練習：用 defer 實作倒數收集

實作 \`countdown(n int) []int\`：
- 使用 **for 迴圈 + defer** 讓數字以 **LIFO** 順序加入 result
- 利用**命名回傳值**讓 defer 能修改回傳的 slice

**範例**：
\`\`\`
countdown(3) → [3, 2, 1]
countdown(5) → [5, 4, 3, 2, 1]
\`\`\``,
    prefix: `package main

import (
	"fmt"
	"reflect"
)

`,
    template: `func countdown(n int) (result []int) {
    // TODO: 用 for 迴圈 + defer 讓數字倒序加入 result
    // 提示：for i := 1; i <= n; i++ { v := i; defer func(){ ... }() }
    return
}`,
    solution: `func countdown(n int) (result []int) {
    for i := 1; i <= n; i++ {
        v := i
        defer func() {
            result = append(result, v)
        }()
    }
    return
}`,
    suffix: `
func main() {
	type tc struct {
		n    int
		want []int
	}
	tests := []tc{
		{3, []int{3, 2, 1}},
		{5, []int{5, 4, 3, 2, 1}},
		{1, []int{1}},
		{4, []int{4, 3, 2, 1}},
	}
	passed := 0
	for i, t := range tests {
		got := countdown(t.n)
		if reflect.DeepEqual(got, t.want) {
			passed++
			fmt.Printf("✓ Test %d 通過  countdown(%d)=%v\\n", i+1, t.n, got)
		} else {
			fmt.Printf("✗ Test %d 失敗\\n  期望: %v\\n  實際: %v\\n", i+1, t.want, got)
		}
	}
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  {
    id: 'adv-02',
    chapterId: 'advanced',
    chapterTitle: '2. 進階特性',
    title: '2-2 閉包：計數器工廠',
    difficulty: 'easy',
    concept: `## 閉包（Closure）

函數可以**捕捉**外部作用域的變數，每個閉包都有獨立的變數副本。

\`\`\`go
func makeAdder(x int) func(int) int {
    return func(y int) int {
        return x + y  // 捕捉 x
    }
}

add5  := makeAdder(5)
fmt.Println(add5(3))   // 8
\`\`\`

### 閉包共享狀態

\`\`\`go
func makeCounter() func() int {
    count := 0
    return func() int {
        count++
        return count
    }
}
c := makeCounter()
fmt.Println(c(), c(), c()) // 1 2 3
\`\`\``,
    description: `### 練習：帶步進的計數器工廠

實作 \`makeCounter(step int) func() int\`：
- 每次呼叫回傳**目前值**，然後增加 \`step\`
- 初始值為 0

**範例**：
\`\`\`
c2 := makeCounter(2)
c2() → 0, c2() → 2, c2() → 4

c5 := makeCounter(5)
c5() → 0, c5() → 5, c5() → 10
\`\`\``,
    prefix: `package main

import "fmt"

`,
    template: `// TODO: 實作 makeCounter，每次呼叫回傳目前值再增加 step
func makeCounter(step int) func() int {
    return nil
}`,
    solution: `func makeCounter(step int) func() int {
    current := 0
    return func() int {
        val := current
        current += step
        return val
    }
}`,
    suffix: `
func main() {
	passed := 0
	total := 0

	check := func(label string, got, want int) {
		total++
		if got == want {
			passed++
			fmt.Printf("✓ %s → %d\\n", label, got)
		} else {
			fmt.Printf("✗ %s 期望=%d 實際=%d\\n", label, want, got)
		}
	}

	c2 := makeCounter(2)
	check("c2() 第1次", c2(), 0)
	check("c2() 第2次", c2(), 2)
	check("c2() 第3次", c2(), 4)
	check("c2() 第4次", c2(), 6)

	c5 := makeCounter(5)
	check("c5() 第1次", c5(), 0)
	check("c5() 第2次", c5(), 5)
	check("c5() 第3次", c5(), 10)

	// 兩個 counter 互不干擾
	check("c2() 第5次", c2(), 8)

	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, total)
}`,
  },

  {
    id: 'adv-03',
    chapterId: 'advanced',
    chapterTitle: '2. 進階特性',
    title: '2-3 iota：Weekday 枚舉',
    difficulty: 'easy',
    concept: `## iota

\`iota\` 是 \`const\` 區塊的自動遞增計數器，從 0 開始。

\`\`\`go
type Direction int
const (
    North Direction = iota // 0
    East                   // 1
    South                  // 2
    West                   // 3
)
\`\`\`

### 位元旗標（常見於權限）

\`\`\`go
const (
    Read    = 1 << iota // 1  (001)
    Write               // 2  (010)
    Execute             // 4  (100)
)
\`\`\`

> **技巧**：\`_ = iota\` 可跳過 0 這個值。`,
    description: `### 練習：定義 Weekday 枚舉

1. 用 \`iota\` 定義 Monday(0)…Sunday(6)
2. 實作 \`WeekdayName(d Weekday) string\` 回傳中文名稱
3. 實作 \`IsWeekend(d Weekday) bool\`

**範例**：
\`\`\`
WeekdayName(Monday) → "星期一"
IsWeekend(Saturday) → true
IsWeekend(Monday)   → false
\`\`\``,
    prefix: `package main

import "fmt"

`,
    template: `type Weekday int

const (
    Monday Weekday = iota
    // TODO: 補上 Tuesday ~ Sunday
)

func WeekdayName(d Weekday) string {
    // TODO: 回傳對應的中文名稱
    return ""
}

func IsWeekend(d Weekday) bool {
    // TODO: Saturday 和 Sunday 回傳 true
    return false
}`,
    solution: `type Weekday int

const (
    Monday Weekday = iota
    Tuesday
    Wednesday
    Thursday
    Friday
    Saturday
    Sunday
)

var weekdayNames = []string{
    "星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日",
}

func WeekdayName(d Weekday) string {
    if int(d) < 0 || int(d) >= len(weekdayNames) {
        return "未知"
    }
    return weekdayNames[d]
}

func IsWeekend(d Weekday) bool {
    return d == Saturday || d == Sunday
}`,
    suffix: `
func main() {
	type tc struct {
		d        Weekday
		wantName string
		wantEnd  bool
	}
	tests := []tc{
		{Monday, "星期一", false},
		{Wednesday, "星期三", false},
		{Friday, "星期五", false},
		{Saturday, "星期六", true},
		{Sunday, "星期日", true},
	}
	passed := 0
	for i, t := range tests {
		name := WeekdayName(t.d)
		end := IsWeekend(t.d)
		ok := name == t.wantName && end == t.wantEnd
		if ok {
			passed++
			fmt.Printf("✓ Test %d 通過  %s 週末=%v\\n", i+1, name, end)
		} else {
			fmt.Printf("✗ Test %d 失敗  name 期望=%s 實際=%s  weekend 期望=%v 實際=%v\\n",
				i+1, t.wantName, name, t.wantEnd, end)
		}
	}
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  // ============================================================
  // 第 3 章：Struct 與 JSON
  // ============================================================
  {
    id: 'struct-01',
    chapterId: 'struct',
    chapterTitle: '3. Struct 與 JSON',
    title: '3-1 Struct 設計與方法',
    difficulty: 'medium',
    concept: `## Struct

\`\`\`go
type Person struct {
    Name string
    Age  int
}

// Constructor
func NewPerson(name string, age int) *Person {
    return &Person{Name: name, Age: age}
}

// 值接收者（不修改 struct）
func (p Person) Greet() string {
    return "Hi, I'm " + p.Name
}

// 指標接收者（修改 struct）
func (p *Person) Birthday() {
    p.Age++
}
\`\`\`

### fmt.Stringer 介面

實作 \`String() string\` 後，\`fmt.Println\` 會自動呼叫：

\`\`\`go
func (p Person) String() string {
    return fmt.Sprintf("%s(%d)", p.Name, p.Age)
}
\`\`\``,
    description: `### 練習：Employee struct

1. 定義 \`Employee\` struct，含 \`Name\`、\`Department\`、\`Salary float64\`
2. 實作 \`String() string\` 回傳格式：\`"Alice/工程部/NT$80000.00"\`
3. 實作 \`Raise(percent float64)\`，薪資增加 percent%

**函數簽名**：
\`\`\`go
func NewEmployee(name, dept string, salary float64) *Employee
func (e Employee) String() string
func (e *Employee) Raise(percent float64)
\`\`\``,
    prefix: `package main

import "fmt"

`,
    template: `// TODO: 定義 Employee struct
type Employee struct {
}

// TODO: Constructor
func NewEmployee(name, dept string, salary float64) *Employee {
    return nil
}

// TODO: String() 格式 "Alice/工程部/NT$80000.00"
func (e Employee) String() string {
    return ""
}

// TODO: Raise 薪資增加 percent%
func (e *Employee) Raise(percent float64) {
}`,
    solution: `type Employee struct {
    Name       string
    Department string
    Salary     float64
}

func NewEmployee(name, dept string, salary float64) *Employee {
    return &Employee{Name: name, Department: dept, Salary: salary}
}

func (e Employee) String() string {
    return fmt.Sprintf("%s/%s/NT$%.2f", e.Name, e.Department, e.Salary)
}

func (e *Employee) Raise(percent float64) {
    e.Salary *= 1 + percent/100
}`,
    suffix: `
func main() {
	passed := 0
	total := 0

	check := func(label, got, want string) {
		total++
		if got == want {
			passed++
			fmt.Printf("✓ %s\\n", label)
		} else {
			fmt.Printf("✗ %s\\n  期望: %q\\n  實際: %q\\n", label, want, got)
		}
	}

	e := NewEmployee("Alice", "工程部", 80000)
	check("String 初始", e.String(), "Alice/工程部/NT$80000.00")

	e.Raise(10)
	check("Raise 10%", fmt.Sprintf("NT$%.2f", e.Salary), "NT$88000.00")

	e.Raise(25)
	check("Raise 25%", fmt.Sprintf("NT$%.2f", e.Salary), "NT$110000.00")

	e2 := NewEmployee("Bob", "行銷部", 50000)
	e2.Raise(20)
	check("e2 Raise 20%", fmt.Sprintf("NT$%.2f", e2.Salary), "NT$60000.00")

	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, total)
}`,
  },

  {
    id: 'struct-02',
    chapterId: 'struct',
    chapterTitle: '3. Struct 與 JSON',
    title: '3-2 JSON 序列化與反序列化',
    difficulty: 'medium',
    concept: `## encoding/json

\`\`\`go
type User struct {
    Name  string \`json:"name"\`
    Email string \`json:"email"\`
    Age   int    \`json:"age,omitempty"\` // 0 時省略
}

// struct → JSON
b, err := json.Marshal(user)

// JSON → struct
var u User
err = json.Unmarshal([]byte(raw), &u)
\`\`\`

### 常用 struct tag

| Tag | 說明 |
|-----|------|
| \`json:"name"\` | 指定欄位名稱 |
| \`json:",omitempty"\` | 零值時省略 |
| \`json:"-"\` | 永遠忽略 |`,
    description: `### 練習：解析產品 JSON

定義 \`Product\` struct 並實作 \`parseProduct(raw string) (Product, error)\`。

JSON 格式：
\`\`\`json
{"id":101,"name":"Go 語言聖經","price":650.0,"in_stock":true}
\`\`\`

**回傳結構的欄位**：ID int, Name string, Price float64, InStock bool`,
    prefix: `package main

import (
	"encoding/json"
	"fmt"
)

`,
    template: `// TODO: 定義 Product struct，加上正確的 json tag
type Product struct {
}

// TODO: 解析 JSON 字串，回傳 Product 和 error
func parseProduct(raw string) (Product, error) {
    return Product{}, nil
}`,
    solution: `type Product struct {
    ID      int     \`json:"id"\`
    Name    string  \`json:"name"\`
    Price   float64 \`json:"price"\`
    InStock bool    \`json:"in_stock"\`
}

func parseProduct(raw string) (Product, error) {
    var p Product
    if err := json.Unmarshal([]byte(raw), &p); err != nil {
        return Product{}, err
    }
    return p, nil
}`,
    suffix: `
func main() {
	type tc struct {
		raw     string
		wantID  int
		wantN   string
		wantP   float64
		wantS   bool
		wantErr bool
	}
	tests := []tc{
		{
			\`{"id":101,"name":"Go 語言聖經","price":650.0,"in_stock":true}\`,
			101, "Go 語言聖經", 650.0, true, false,
		},
		{
			\`{"id":202,"name":"Clean Code","price":420.5,"in_stock":false}\`,
			202, "Clean Code", 420.5, false, false,
		},
		{
			\`invalid json\`,
			0, "", 0, false, true,
		},
	}
	passed := 0
	for i, t := range tests {
		p, err := parseProduct(t.raw)
		if t.wantErr {
			if err != nil {
				passed++
				fmt.Printf("✓ Test %d 通過（正確偵測無效 JSON）\\n", i+1)
			} else {
				fmt.Printf("✗ Test %d 失敗（應回傳 error）\\n", i+1)
			}
			continue
		}
		if err != nil {
			fmt.Printf("✗ Test %d 失敗 error=%v\\n", i+1, err)
			continue
		}
		ok := p.ID == t.wantID && p.Name == t.wantN && p.Price == t.wantP && p.InStock == t.wantS
		if ok {
			passed++
			fmt.Printf("✓ Test %d 通過  ID=%d Name=%s Price=%.1f\\n", i+1, p.ID, p.Name, p.Price)
		} else {
			fmt.Printf("✗ Test %d 失敗  %+v\\n", i+1, p)
		}
	}
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  // ============================================================
  // 第 4 章：指標
  // ============================================================
  {
    id: 'ptr-01',
    chapterId: 'pointer',
    chapterTitle: '4. 指標',
    title: '4-1 指標：swap 函數',
    difficulty: 'easy',
    concept: `## 指標（Pointer）

\`\`\`go
x := 42
p := &x       // p 是指向 x 的指標（型別：*int）
fmt.Println(*p) // 取值：42
*p = 100        // 透過指標修改 x
fmt.Println(x)  // x = 100
\`\`\`

### 為什麼需要指標？

Go 預設**傳值**，函數收到的是副本：

\`\`\`go
// 只改副本，呼叫方看不到
func double(n int) { n *= 2 }

// 改原始值
func doublePtr(n *int) { *n *= 2 }
\`\`\`

### new 關鍵字

\`\`\`go
p := new(int)   // 分配一個 int（零值 0），回傳 *int
\`\`\``,
    description: `### 練習：實作 swap 與 double

1. 實作 \`swap(a, b *int)\`，交換兩整數（不用暫存變數）
2. 實作 \`doubleInPlace(n *int)\`，將整數翻倍

**範例**：
\`\`\`
a, b := 10, 20 → swap → a=20, b=10
n := 7 → doubleInPlace → n=14
\`\`\``,
    prefix: `package main

import "fmt"

`,
    template: `// TODO: 用指標實作 swap（利用多值賦值，不用暫存變數）
func swap(a, b *int) {
}

// TODO: 將 n 指向的值翻倍
func doubleInPlace(n *int) {
}`,
    solution: `func swap(a, b *int) {
    *a, *b = *b, *a
}

func doubleInPlace(n *int) {
    *n *= 2
}`,
    suffix: `
func main() {
	passed := 0
	total := 0

	check := func(label string, got, want int) {
		total++
		if got == want {
			passed++
			fmt.Printf("✓ %s = %d\\n", label, got)
		} else {
			fmt.Printf("✗ %s 期望=%d 實際=%d\\n", label, want, got)
		}
	}

	a, b := 10, 20
	swap(&a, &b)
	check("swap a", a, 20)
	check("swap b", b, 10)

	x, y := 100, 200
	swap(&x, &y)
	check("swap x", x, 200)
	check("swap y", y, 100)

	n := 7
	doubleInPlace(&n)
	check("double(7)", n, 14)

	m := 50
	doubleInPlace(&m)
	check("double(50)", m, 100)

	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, total)
}`,
  },

  // ============================================================
  // 第 5 章：Slice
  // ============================================================
  {
    id: 'slice-01',
    chapterId: 'slice',
    chapterTitle: '5. Slice',
    title: '5-1 高階函數 Filter 與 Map',
    difficulty: 'medium',
    concept: `## Slice 操作

\`\`\`go
s := []int{1, 2, 3, 4, 5}
s2 := make([]int, 0, 10) // len=0, cap=10

s = append(s, 6)   // 尾端加入
s[1:3]             // [2 3]（切片）
\`\`\`

### 函數作為參數

\`\`\`go
func apply(s []int, fn func(int) int) []int {
    result := make([]int, len(s))
    for i, v := range s {
        result[i] = fn(v)
    }
    return result
}

doubled := apply([]int{1,2,3}, func(x int) int {
    return x * 2
})
\`\`\``,
    description: `### 練習：實作 Filter 和 MapInts

- \`Filter(s []int, pred func(int) bool) []int\` — 保留滿足條件的元素
- \`MapInts(s []int, fn func(int) int) []int\` — 轉換每個元素

**範例**：
\`\`\`
Filter([1..10], 偶數) → [2,4,6,8,10]
MapInts([1..5], 平方) → [1,4,9,16,25]
\`\`\``,
    prefix: `package main

import (
	"fmt"
	"reflect"
)

`,
    template: `func Filter(s []int, pred func(int) bool) []int {
    // TODO: 只保留 pred(v) == true 的元素
    return nil
}

func MapInts(s []int, fn func(int) int) []int {
    // TODO: 對每個元素套用 fn，回傳新 slice
    return nil
}`,
    solution: `func Filter(s []int, pred func(int) bool) []int {
    result := make([]int, 0, len(s))
    for _, v := range s {
        if pred(v) {
            result = append(result, v)
        }
    }
    return result
}

func MapInts(s []int, fn func(int) int) []int {
    result := make([]int, len(s))
    for i, v := range s {
        result[i] = fn(v)
    }
    return result
}`,
    suffix: `
func main() {
	passed := 0
	total := 0

	checkSlice := func(label string, got, want []int) {
		total++
		if reflect.DeepEqual(got, want) {
			passed++
			fmt.Printf("✓ %s = %v\\n", label, got)
		} else {
			fmt.Printf("✗ %s\\n  期望: %v\\n  實際: %v\\n", label, want, got)
		}
	}

	nums := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
	checkSlice("Filter 偶數", Filter(nums, func(n int) bool { return n%2 == 0 }),
		[]int{2, 4, 6, 8, 10})
	checkSlice("Filter >5", Filter(nums, func(n int) bool { return n > 5 }),
		[]int{6, 7, 8, 9, 10})
	checkSlice("Filter 奇數", Filter([]int{1, 2, 3, 4, 5}, func(n int) bool { return n%2 != 0 }),
		[]int{1, 3, 5})

	checkSlice("MapInts 平方", MapInts([]int{1, 2, 3, 4, 5}, func(n int) int { return n * n }),
		[]int{1, 4, 9, 16, 25})
	checkSlice("MapInts *3", MapInts([]int{2, 4, 6}, func(n int) int { return n * 3 }),
		[]int{6, 12, 18})

	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, total)
}`,
  },

  // ============================================================
  // 第 6 章：Map
  // ============================================================
  {
    id: 'map-01',
    chapterId: 'map',
    chapterTitle: '6. Map',
    title: '6-1 字元頻率統計',
    difficulty: 'easy',
    concept: `## Map 操作

\`\`\`go
m := map[string]int{}

m["key"] = 1
v := m["key"]           // 1（不存在回傳零值）
v, ok := m["key"]       // ok=true 表示 key 存在
delete(m, "key")

for k, v := range m {   // 遍歷（順序不固定）
    fmt.Println(k, v)
}
\`\`\`

### 常見模式：累加計數

\`\`\`go
freq := map[rune]int{}
for _, ch := range "hello" {
    freq[ch]++  // 不存在時零值 0 自動初始化
}
\`\`\``,
    description: `### 練習：統計字元出現次數

實作 \`charFreq(s string) map[rune]int\`，
統計字串中每個字元的出現次數（包含空格）。

**範例**：
\`\`\`
charFreq("hello") → {'h':1, 'e':1, 'l':2, 'o':1}
charFreq("aab")   → {'a':2, 'b':1}
\`\`\``,
    prefix: `package main

import "fmt"

`,
    template: `func charFreq(s string) map[rune]int {
    // TODO: 遍歷字串，統計每個 rune 的出現次數
    return nil
}`,
    solution: `func charFreq(s string) map[rune]int {
    freq := map[rune]int{}
    for _, ch := range s {
        freq[ch]++
    }
    return freq
}`,
    suffix: `
func main() {
	passed := 0
	total := 0

	check := func(label string, got map[rune]int, key rune, want int) {
		total++
		if got[key] == want {
			passed++
			fmt.Printf("✓ %s  freq[%q]=%d\\n", label, key, got[key])
		} else {
			fmt.Printf("✗ %s  freq[%q] 期望=%d 實際=%d\\n", label, key, want, got[key])
		}
	}

	f1 := charFreq("hello")
	check("hello h", f1, 'h', 1)
	check("hello l", f1, 'l', 2)
	check("hello o", f1, 'o', 1)

	f2 := charFreq("golang")
	check("golang g", f2, 'g', 2)
	check("golang o", f2, 'o', 1)
	check("golang a", f2, 'a', 1)

	f3 := charFreq("aabbcc")
	check("aabbcc a", f3, 'a', 2)
	check("aabbcc b", f3, 'b', 2)
	check("aabbcc c", f3, 'c', 2)

	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, total)
}`,
  },

  {
    id: 'map-02',
    chapterId: 'map',
    chapterTitle: '6. Map',
    title: '6-2 分組（Group By）',
    difficulty: 'medium',
    concept: `## map of slices 模式

按某個欄位把資料分組：

\`\`\`go
type Student struct {
    Name  string
    Grade string
}

byGrade := map[string][]Student{}
for _, s := range students {
    byGrade[s.Grade] = append(byGrade[s.Grade], s)
}
\`\`\`

這是 Go 中處理分組資料的標準寫法。
\`append\` 對 nil slice 也能正常運作，無需預先初始化。`,
    description: `### 練習：按部門分組員工

實作 \`groupByDept(employees []Employee) map[string][]string\`，
按 \`Department\` 分組，value 為員工 \`Name\` 的 slice。

**範例**：
\`\`\`
[{Alice 工程部} {Bob 行銷部} {Charlie 工程部}]
→ {"工程部": ["Alice","Charlie"], "行銷部": ["Bob"]}
\`\`\``,
    prefix: `package main

import (
	"fmt"
	"reflect"
	"sort"
)

type Employee struct {
	Name       string
	Department string
}

`,
    template: `func groupByDept(employees []Employee) map[string][]string {
    // TODO: 按 Department 分組，收集 Name
    return nil
}`,
    solution: `func groupByDept(employees []Employee) map[string][]string {
    result := map[string][]string{}
    for _, e := range employees {
        result[e.Department] = append(result[e.Department], e.Name)
    }
    return result
}`,
    suffix: `
func main() {
	employees := []Employee{
		{"Alice", "工程部"}, {"Bob", "行銷部"},
		{"Charlie", "工程部"}, {"Diana", "人資部"}, {"Eve", "人資部"},
	}

	got := groupByDept(employees)

	// 對每個 group 的 names 排序，消除順序差異
	for k := range got {
		sort.Strings(got[k])
	}

	want := map[string][]string{
		"工程部": {"Alice", "Charlie"},
		"行銷部": {"Bob"},
		"人資部": {"Diana", "Eve"},
	}

	passed := 0
	total := len(want)
	for dept, wantNames := range want {
		gotNames := got[dept]
		if reflect.DeepEqual(gotNames, wantNames) {
			passed++
			fmt.Printf("✓ %s: %v\\n", dept, gotNames)
		} else {
			fmt.Printf("✗ %s: 期望=%v 實際=%v\\n", dept, wantNames, gotNames)
		}
	}
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, total)
}`,
  },

  // ============================================================
  // 第 7 章：介面
  // ============================================================
  {
    id: 'iface-01',
    chapterId: 'interface',
    chapterTitle: '7. 介面',
    title: '7-1 Shape 介面與多型',
    difficulty: 'medium',
    concept: `## 介面（Interface）

Go 的介面是**隱式實現**，只要有對應方法就自動滿足：

\`\`\`go
type Shape interface {
    Area() float64
    Perimeter() float64
}

type Circle struct{ Radius float64 }

func (c Circle) Area() float64      { return math.Pi * c.Radius * c.Radius }
func (c Circle) Perimeter() float64 { return 2 * math.Pi * c.Radius }
// Circle 自動滿足 Shape，不需要 implements 宣告
\`\`\`

### 型別 switch

\`\`\`go
switch v := s.(type) {
case Circle:
    fmt.Println("圓形", v.Radius)
case Rectangle:
    fmt.Println("矩形", v.Width, v.Height)
}
\`\`\``,
    description: `### 練習：實作 Circle 和 Rectangle

讓 \`Circle\` 和 \`Rectangle\` 實作 \`Shape\` 介面。

**函數**：
\`\`\`go
func (c Circle) Area() float64
func (c Circle) Perimeter() float64
func (r Rectangle) Area() float64
func (r Rectangle) Perimeter() float64
\`\`\`

**範例**：
\`\`\`
Circle{5}.Area()      → 78.5398...
Rectangle{3,4}.Area() → 12.0
\`\`\``,
    prefix: `package main

import (
	"fmt"
	"math"
)

type Shape interface {
	Area() float64
	Perimeter() float64
}

type Circle struct{ Radius float64 }
type Rectangle struct{ Width, Height float64 }

`,
    template: `// TODO: 實作 Circle 的 Area 和 Perimeter
func (c Circle) Area() float64 {
    return 0
}
func (c Circle) Perimeter() float64 {
    return 0
}

// TODO: 實作 Rectangle 的 Area 和 Perimeter
func (r Rectangle) Area() float64 {
    return 0
}
func (r Rectangle) Perimeter() float64 {
    return 0
}`,
    solution: `func (c Circle) Area() float64      { return math.Pi * c.Radius * c.Radius }
func (c Circle) Perimeter() float64 { return 2 * math.Pi * c.Radius }

func (r Rectangle) Area() float64      { return r.Width * r.Height }
func (r Rectangle) Perimeter() float64 { return 2 * (r.Width + r.Height) }`,
    suffix: `
func approxEq(a, b float64) bool {
	diff := a - b
	if diff < 0 { diff = -diff }
	return diff < 0.001
}

func main() {
	passed := 0
	total := 0

	check := func(label string, got, want float64) {
		total++
		if approxEq(got, want) {
			passed++
			fmt.Printf("✓ %s = %.4f\\n", label, got)
		} else {
			fmt.Printf("✗ %s 期望=%.4f 實際=%.4f\\n", label, want, got)
		}
	}

	c := Circle{Radius: 5}
	check("Circle{5}.Area", c.Area(), math.Pi*25)
	check("Circle{5}.Perimeter", c.Perimeter(), 2*math.Pi*5)

	c2 := Circle{Radius: 3}
	check("Circle{3}.Area", c2.Area(), math.Pi*9)

	r := Rectangle{Width: 3, Height: 4}
	check("Rect{3,4}.Area", r.Area(), 12.0)
	check("Rect{3,4}.Perimeter", r.Perimeter(), 14.0)

	r2 := Rectangle{Width: 6, Height: 8}
	check("Rect{6,8}.Area", r2.Area(), 48.0)
	check("Rect{6,8}.Perimeter", r2.Perimeter(), 28.0)

	// 多型：透過介面呼叫
	shapes := []Shape{Circle{1}, Rectangle{2, 5}}
	var totalArea float64
	for _, s := range shapes {
		totalArea += s.Area()
	}
	check("多型 totalArea", totalArea, math.Pi+10)

	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, total)
}`,
  },

  // ============================================================
  // 第 8 章：錯誤處理
  // ============================================================
  {
    id: 'err-01',
    chapterId: 'error',
    chapterTitle: '8. 錯誤處理',
    title: '8-1 自訂 error 與 errors.As',
    difficulty: 'medium',
    concept: `## error 介面

\`\`\`go
type error interface {
    Error() string
}
\`\`\`

### 自訂 error 型別

\`\`\`go
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Message)
}
\`\`\`

### errors.Is / errors.As

\`\`\`go
// errors.Is：比對 sentinel error
var ErrNotFound = errors.New("not found")
if errors.Is(err, ErrNotFound) { ... }

// errors.As：取出特定型別
var ve *ValidationError
if errors.As(err, &ve) {
    fmt.Println(ve.Field)
}
\`\`\``,
    description: `### 練習：安全除法

1. 定義 \`DivisionError\` 自訂 error（含 divisor 欄位）
2. 實作 \`safeDivide(a, b float64) (float64, error)\`

**規則**：
- b == 0 → 回傳 \`&DivisionError{Divisor: 0}\`
- 否則回傳商

**範例**：
\`\`\`
safeDivide(10, 2) → 5.0, nil
safeDivide(5, 0)  → 0, DivisionError
\`\`\``,
    prefix: `package main

import (
	"errors"
	"fmt"
)

`,
    template: `// TODO: 定義 DivisionError struct（含 Divisor float64 欄位）
type DivisionError struct {
    Divisor float64
}

func (e *DivisionError) Error() string {
    // TODO: 回傳錯誤訊息，如 "不能除以 0.00"
    return ""
}

func safeDivide(a, b float64) (float64, error) {
    // TODO: b==0 時回傳 &DivisionError{Divisor: b}
    return a / b, nil
}`,
    solution: `type DivisionError struct {
    Divisor float64
}

func (e *DivisionError) Error() string {
    return fmt.Sprintf("不能除以 %.2f", e.Divisor)
}

func safeDivide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, &DivisionError{Divisor: b}
    }
    return a / b, nil
}`,
    suffix: `
func main() {
	passed := 0
	total := 0

	check := func(label string, cond bool, detail string) {
		total++
		if cond {
			passed++
			fmt.Printf("✓ %s\\n", label)
		} else {
			fmt.Printf("✗ %s  %s\\n", label, detail)
		}
	}

	// 正常除法
	r1, err1 := safeDivide(10, 2)
	check("10/2 無 error", err1 == nil, fmt.Sprintf("err=%v", err1))
	check("10/2 = 5.0", r1 == 5.0, fmt.Sprintf("got=%.1f", r1))

	r2, err2 := safeDivide(7, 2)
	check("7/2 = 3.5", r2 == 3.5, fmt.Sprintf("got=%.1f", r2))

	// 除以零
	_, err3 := safeDivide(5, 0)
	check("5/0 回傳 error", err3 != nil, "err=nil")

	var de *DivisionError
	check("errors.As DivisionError", errors.As(err3, &de), "errors.As failed")

	// 確認 error 訊息不為空
	if err3 != nil {
		check("error message 不空", len(err3.Error()) > 0, "empty message")
	}

	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, total)
}`,
  },

  // ============================================================
  // 第 9 章：並發
  // ============================================================
  {
    id: 'conc-01',
    chapterId: 'concurrency',
    chapterTitle: '9. Goroutine 與 Channel',
    title: '9-1 goroutine + WaitGroup：平方和',
    difficulty: 'medium',
    concept: `## Goroutine

\`go\` 關鍵字啟動一個輕量的並發執行單元：

\`\`\`go
go func() {
    fmt.Println("在 goroutine 裡")
}()
\`\`\`

### sync.WaitGroup

等待多個 goroutine 完成：

\`\`\`go
var wg sync.WaitGroup

for i := 0; i < 5; i++ {
    wg.Add(1)
    go func(id int) {
        defer wg.Done()
        fmt.Println("worker", id)
    }(i)          // 傳入 i 的副本
}
wg.Wait()
\`\`\`

### sync.Mutex 保護共享狀態

\`\`\`go
var mu sync.Mutex
var total int

mu.Lock()
total += value
mu.Unlock()
\`\`\``,
    description: `### 練習：並發計算平方和

實作 \`sumSquares(n int) int\`：
用 **n 個 goroutine** 分別計算 1²…n²，加總後回傳。

**注意**：需用 Mutex 或 channel 保護共享的 total。

**範例**：
\`\`\`
sumSquares(5)  → 55   (1+4+9+16+25)
sumSquares(10) → 385
\`\`\``,
    prefix: `package main

import (
	"fmt"
	"sync"
)

`,
    template: `func sumSquares(n int) int {
    var wg sync.WaitGroup
    var mu sync.Mutex
    total := 0

    for i := 1; i <= n; i++ {
        wg.Add(1)
        go func(num int) {
            defer wg.Done()
            // TODO: 計算 num*num，加入 total（需用 mu 保護）
        }(i)
    }

    wg.Wait()
    return total
}`,
    solution: `func sumSquares(n int) int {
    var wg sync.WaitGroup
    var mu sync.Mutex
    total := 0

    for i := 1; i <= n; i++ {
        wg.Add(1)
        go func(num int) {
            defer wg.Done()
            sq := num * num
            mu.Lock()
            total += sq
            mu.Unlock()
        }(i)
    }

    wg.Wait()
    return total
}`,
    suffix: `
func main() {
	type tc struct{ n, want int }
	tests := []tc{
		{1, 1},
		{5, 55},
		{10, 385},
		{3, 14},
		{4, 30},
	}
	passed := 0
	for i, t := range tests {
		got := sumSquares(t.n)
		if got == t.want {
			passed++
			fmt.Printf("✓ Test %d  sumSquares(%d)=%d\\n", i+1, t.n, got)
		} else {
			fmt.Printf("✗ Test %d  sumSquares(%d) 期望=%d 實際=%d\\n", i+1, t.n, t.want, got)
		}
	}
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  {
    id: 'conc-02',
    chapterId: 'concurrency',
    chapterTitle: '9. Goroutine 與 Channel',
    title: '9-2 Channel Pipeline：平方管線',
    difficulty: 'hard',
    concept: `## Channel

\`\`\`go
ch := make(chan int)      // 無緩衝
ch := make(chan int, 10)  // 緩衝 10 個

ch <- 42    // 傳送（阻塞直到有人接收）
v := <-ch   // 接收
close(ch)   // 關閉（只有 sender 關閉）

for v := range ch { // 讀到 close 為止
    fmt.Println(v)
}
\`\`\`

### Pipeline 模式

\`\`\`text
generate → square → 收集結果
\`\`\`

每個階段接收 \`<-chan T\`，回傳 \`<-chan T\`。`,
    description: `### 練習：三階段 Pipeline

實作：
1. \`generate(nums ...int) <-chan int\` — 把數字送入 channel 後 close
2. \`square(in <-chan int) <-chan int\` — 從 in 讀取，平方後送出
3. \`pipelineSquares(nums []int) []int\` — 串接 pipeline，收集所有結果

**範例**：
\`\`\`
pipelineSquares([1,2,3,4,5]) → [1,4,9,16,25]
\`\`\``,
    prefix: `package main

import (
	"fmt"
	"reflect"
	"sort"
)

`,
    template: `// TODO: generate 把 nums 送入 channel 後 close
func generate(nums ...int) <-chan int {
    return nil
}

// TODO: square 從 in 讀取，平方後送出並 close
func square(in <-chan int) <-chan int {
    return nil
}

func pipelineSquares(nums []int) []int {
    // TODO: 用 generate + square 串接，收集結果
    return nil
}`,
    solution: `func generate(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        for _, n := range nums {
            out <- n
        }
        close(out)
    }()
    return out
}

func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for v := range in {
            out <- v * v
        }
        close(out)
    }()
    return out
}

func pipelineSquares(nums []int) []int {
    result := []int{}
    for v := range square(generate(nums...)) {
        result = append(result, v)
    }
    return result
}`,
    suffix: `
func main() {
	type tc struct {
		nums []int
		want []int
	}
	tests := []tc{
		{[]int{1, 2, 3, 4, 5}, []int{1, 4, 9, 16, 25}},
		{[]int{3, 1, 4, 1, 5}, []int{1, 1, 9, 16, 25}},
		{[]int{10}, []int{100}},
		{[]int{2, 4, 6}, []int{4, 16, 36}},
	}
	passed := 0
	for i, t := range tests {
		got := pipelineSquares(t.nums)
		// pipeline 輸出順序可能與輸入不同，排序後比較
		want := make([]int, len(t.want))
		copy(want, t.want)
		sort.Ints(got)
		sort.Ints(want)
		if reflect.DeepEqual(got, want) {
			passed++
			fmt.Printf("✓ Test %d  %v → %v\\n", i+1, t.nums, got)
		} else {
			fmt.Printf("✗ Test %d  %v 期望=%v 實際=%v\\n", i+1, t.nums, want, got)
		}
	}
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  // ============================================================
  // 第 10 章：泛型
  // ============================================================
  {
    id: 'gen-01',
    chapterId: 'generics',
    chapterTitle: '10. 泛型（Go 1.18+）',
    title: '10-1 泛型函數 Min / Max / Sum',
    difficulty: 'medium',
    concept: `## 泛型（Generics）

Go 1.18 加入泛型，讓函數適用多種型別。

\`\`\`go
func Contains[T comparable](s []T, target T) bool {
    for _, v := range s {
        if v == target { return true }
    }
    return false
}

Contains([]int{1,2,3}, 2)           // T=int 推斷
Contains[string]([]string{"a"}, "a") // 明確指定
\`\`\`

### 常用約束

\`\`\`go
// 自訂數值約束
type Number interface {
    ~int | ~int64 | ~float64
}
\`\`\`

\`~int\` 表示底層型別為 int 的所有型別都符合。`,
    description: `### 練習：泛型 Min / Max / Sum

實作三個泛型函數：
- \`Min[T Number](a, b T) T\`
- \`Max[T Number](a, b T) T\`
- \`Sum[T Number](s []T) T\`

**範例**：
\`\`\`
Min(3, 7)     → 3
Sum([1,2,3])  → 6
Sum([1.1,2.2]) → 3.3
\`\`\``,
    prefix: `package main

import "fmt"

type Number interface {
	~int | ~int64 | ~float64
}

`,
    template: `// TODO: 實作 Min
func Min[T Number](a, b T) T {
    return a
}

// TODO: 實作 Max
func Max[T Number](a, b T) T {
    return a
}

// TODO: 實作 Sum
func Sum[T Number](s []T) T {
    var total T
    return total
}`,
    solution: `func Min[T Number](a, b T) T {
    if a < b { return a }
    return b
}

func Max[T Number](a, b T) T {
    if a > b { return a }
    return b
}

func Sum[T Number](s []T) T {
    var total T
    for _, v := range s {
        total += v
    }
    return total
}`,
    suffix: `
func main() {
	passed := 0
	total := 0

	checkI := func(label string, got, want int) {
		total++
		if got == want {
			passed++
			fmt.Printf("✓ %s = %d\\n", label, got)
		} else {
			fmt.Printf("✗ %s 期望=%d 實際=%d\\n", label, want, got)
		}
	}
	checkF := func(label string, got, want float64) {
		total++
		diff := got - want
		if diff < 0 { diff = -diff }
		if diff < 0.001 {
			passed++
			fmt.Printf("✓ %s = %.2f\\n", label, got)
		} else {
			fmt.Printf("✗ %s 期望=%.2f 實際=%.2f\\n", label, want, got)
		}
	}

	checkI("Min(3,7)", Min(3, 7), 3)
	checkI("Min(9,2)", Min(9, 2), 2)
	checkI("Max(3,7)", Max(3, 7), 7)
	checkI("Max(9,2)", Max(9, 2), 9)
	checkI("Sum int", Sum([]int{1, 2, 3, 4, 5}), 15)
	checkI("Sum empty", Sum([]int{}), 0)
	checkF("Min float", Min(1.5, 2.3), 1.5)
	checkF("Sum float", Sum([]float64{1.1, 2.2, 3.3}), 6.6)

	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, total)
}`,
  },

  {
    id: 'gen-02',
    chapterId: 'generics',
    chapterTitle: '10. 泛型（Go 1.18+）',
    title: '10-2 泛型 Stack',
    difficulty: 'hard',
    concept: `## 泛型 struct

型別參數也可以用在 struct 上：

\`\`\`go
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(v T) {
    s.items = append(s.items, v)
}

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    last := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return last, true
}
\`\`\`

> **技巧**：\`var zero T\` 是取型別零值的慣用法。`,
    description: `### 練習：完整泛型 Stack

實作 \`Stack[T any]\` 含：
- \`Push(v T)\`
- \`Pop() (T, bool)\` — 空時 bool=false
- \`Peek() (T, bool)\` — 看頂端但不移除
- \`Len() int\`
- \`IsEmpty() bool\``,
    prefix: `package main

import "fmt"

`,
    template: `// TODO: 定義 Stack[T any] struct 並實作所有方法

type Stack[T any] struct {
    // TODO
}

func (s *Stack[T]) Push(v T)         {}
func (s *Stack[T]) Len() int          { return 0 }
func (s *Stack[T]) IsEmpty() bool     { return true }

func (s *Stack[T]) Pop() (T, bool) {
    var zero T
    return zero, false
}

func (s *Stack[T]) Peek() (T, bool) {
    var zero T
    return zero, false
}`,
    solution: `type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(v T)     { s.items = append(s.items, v) }
func (s *Stack[T]) Len() int      { return len(s.items) }
func (s *Stack[T]) IsEmpty() bool { return len(s.items) == 0 }

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    last := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return last, true
}

func (s *Stack[T]) Peek() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    return s.items[len(s.items)-1], true
}`,
    suffix: `
func main() {
	passed := 0
	total := 0

	check := func(label string, cond bool, detail string) {
		total++
		if cond {
			passed++
			fmt.Printf("✓ %s\\n", label)
		} else {
			fmt.Printf("✗ %s  %s\\n", label, detail)
		}
	}

	var s Stack[int]
	check("初始 IsEmpty", s.IsEmpty(), "")
	check("初始 Len=0", s.Len() == 0, fmt.Sprintf("got=%d", s.Len()))

	s.Push(1)
	s.Push(2)
	s.Push(3)
	check("Push 後 Len=3", s.Len() == 3, fmt.Sprintf("got=%d", s.Len()))

	top, ok := s.Peek()
	check("Peek = 3", top == 3 && ok, fmt.Sprintf("got=%d ok=%v", top, ok))
	check("Peek 不移除 Len=3", s.Len() == 3, "")

	v1, _ := s.Pop()
	check("Pop = 3", v1 == 3, fmt.Sprintf("got=%d", v1))
	v2, _ := s.Pop()
	check("Pop = 2", v2 == 2, fmt.Sprintf("got=%d", v2))
	v3, _ := s.Pop()
	check("Pop = 1", v3 == 1, fmt.Sprintf("got=%d", v3))
	check("Pop 後 IsEmpty", s.IsEmpty(), "")

	_, ok2 := s.Pop()
	check("空 Stack Pop ok=false", !ok2, fmt.Sprintf("ok=%v", ok2))

	// 字串 Stack
	var ss Stack[string]
	ss.Push("hello")
	ss.Push("world")
	sv, _ := ss.Pop()
	check("string Stack Pop=world", sv == "world", fmt.Sprintf("got=%q", sv))

	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, total)
}`,
  },

  // ============================================================
  // 第 11 章：Context
  // ============================================================
  {
    id: 'ctx-01',
    chapterId: 'context',
    chapterTitle: '11. Context',
    title: '11-1 WithTimeout 取消長任務',
    difficulty: 'hard',
    concept: `## context 套件

\`context.Context\` 傳播取消訊號與截止時間。

\`\`\`go
// 設定逾時
ctx, cancel := context.WithTimeout(
    context.Background(), 3*time.Second)
defer cancel() // 必須呼叫，釋放資源

// 在函數中偵測取消
select {
case result := <-doWork():
    fmt.Println(result)
case <-ctx.Done():
    fmt.Println("已取消:", ctx.Err())
}
\`\`\`

### 使用原則

- \`ctx\` 永遠是函數**第一個參數**，命名為 \`ctx\`
- 不要把 ctx 存在 struct 裡
- 不要傳 \`nil\`，用 \`context.Background()\``,
    description: `### 練習：帶逾時的模擬請求

實作 \`fetchData(ctx context.Context, delay time.Duration) (string, error)\`：
- 模擬需要 \`delay\` 時間完成的網路請求
- ctx 取消時立即回傳 \`ctx.Err()\`
- 成功時回傳 "data fetched"

**測試**：
- timeout=200ms, delay=100ms → 成功
- timeout=100ms, delay=500ms → 逾時錯誤`,
    prefix: `package main

import (
	"context"
	"fmt"
	"time"
)

`,
    template: `func fetchData(ctx context.Context, delay time.Duration) (string, error) {
    select {
    case <-time.After(delay):
        // TODO: 回傳成功結果
        return "", nil
    case <-ctx.Done():
        // TODO: 回傳 ctx.Err()
        return "", nil
    }
}`,
    solution: `func fetchData(ctx context.Context, delay time.Duration) (string, error) {
    select {
    case <-time.After(delay):
        return "data fetched", nil
    case <-ctx.Done():
        return "", ctx.Err()
    }
}`,
    suffix: `
func main() {
	passed := 0
	total := 0

	check := func(label string, cond bool, detail string) {
		total++
		if cond {
			passed++
			fmt.Printf("✓ %s\\n", label)
		} else {
			fmt.Printf("✗ %s  %s\\n", label, detail)
		}
	}

	// 場景一：timeout 充裕，應成功
	ctx1, cancel1 := context.WithTimeout(context.Background(), 300*time.Millisecond)
	defer cancel1()
	data, err := fetchData(ctx1, 100*time.Millisecond)
	check("充裕 timeout 無 error", err == nil, fmt.Sprintf("err=%v", err))
	check("充裕 timeout 有資料", data == "data fetched", fmt.Sprintf("data=%q", data))

	// 場景二：timeout 不夠，應逾時
	ctx2, cancel2 := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel2()
	_, err2 := fetchData(ctx2, 500*time.Millisecond)
	check("逾時 error 不為 nil", err2 != nil, "err=nil")
	check("逾時 error 為 DeadlineExceeded", err2 == context.DeadlineExceeded,
		fmt.Sprintf("err=%v", err2))

	// 場景三：手動取消
	ctx3, cancel3 := context.WithCancel(context.Background())
	go func() {
		time.Sleep(50 * time.Millisecond)
		cancel3()
	}()
	_, err3 := fetchData(ctx3, 500*time.Millisecond)
	check("手動取消 error 不為 nil", err3 != nil, "err=nil")

	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, total)
}`,
  },

  // ============================================================
  // 第 3 章補充：Struct Embedding
  // ============================================================
  {
    id: 'struct-03',
    chapterId: 'struct',
    chapterTitle: '3. Struct 與 JSON',
    title: '3-3 Struct 嵌入（Embedding）',
    difficulty: 'medium',
    concept: `## Struct 嵌入（Embedding）

嵌入讓子結構**自動繼承**父結構的欄位與方法：

\`\`\`go
type Animal struct {
    Name string
}

func (a Animal) Speak() string {
    return a.Name + " says something"
}

// Dog 嵌入 Animal
type Dog struct {
    Animal        // 匿名欄位（無欄位名）
    Breed string
}

d := Dog{Animal: Animal{Name: "Rex"}, Breed: "Husky"}
fmt.Println(d.Name)    // 直接存取 Animal.Name（提升）
fmt.Println(d.Speak()) // 直接呼叫 Animal.Speak()（提升）
\`\`\`

### 方法覆寫

子結構可以定義同名方法來**覆寫**：

\`\`\`go
func (d Dog) Speak() string {
    return d.Name + " says Woof!"
}
\`\`\``,
    description: `### 練習：Animal 嵌入層級

定義三個 struct：
1. \`Animal\`：含 \`Name string\`，方法 \`Describe() string\` 回傳 \`"動物: <Name>"\`
2. \`Dog\`：嵌入 \`Animal\`，加 \`Breed string\`，**覆寫** \`Speak() string\` 回傳 \`"<Name>: Woof!"\`
3. \`Cat\`：嵌入 \`Animal\`，加 \`Indoor bool\`，**覆寫** \`Speak() string\` 回傳 \`"<Name>: Meow!"\`

**範例**：
\`\`\`
Dog{Animal{"Rex"}, "Husky"}.Describe() → "動物: Rex"
Dog{Animal{"Rex"}, "Husky"}.Speak()    → "Rex: Woof!"
Cat{Animal{"Mimi"}, true}.Speak()      → "Mimi: Meow!"
\`\`\``,
    prefix: `package main

import "fmt"

`,
    template: `// TODO: 定義 Animal struct 與 Describe() 方法
type Animal struct {
}

func (a Animal) Describe() string {
    return ""
}

// TODO: 定義 Dog（嵌入 Animal + Breed）並覆寫 Speak()
type Dog struct {
}

func (d Dog) Speak() string {
    return ""
}

// TODO: 定義 Cat（嵌入 Animal + Indoor）並覆寫 Speak()
type Cat struct {
}

func (c Cat) Speak() string {
    return ""
}`,
    solution: `type Animal struct {
    Name string
}

func (a Animal) Describe() string {
    return "動物: " + a.Name
}

type Dog struct {
    Animal
    Breed string
}

func (d Dog) Speak() string {
    return d.Name + ": Woof!"
}

type Cat struct {
    Animal
    Indoor bool
}

func (c Cat) Speak() string {
    return c.Name + ": Meow!"
}`,
    suffix: `
func main() {
	passed := 0
	total := 0
	check := func(label, got, want string) {
		total++
		if got == want {
			passed++
			fmt.Printf("✓ %s\\n", label)
		} else {
			fmt.Printf("✗ %s\\n  期望: %q\\n  實際: %q\\n", label, want, got)
		}
	}

	dog := Dog{Animal: Animal{Name: "Rex"}, Breed: "Husky"}
	check("Dog.Describe() 繼承自 Animal", dog.Describe(), "動物: Rex")
	check("Dog.Name 欄位提升", dog.Name, "Rex")
	check("Dog.Speak() 覆寫", dog.Speak(), "Rex: Woof!")
	check("Dog.Breed", dog.Breed, "Husky")

	cat := Cat{Animal: Animal{Name: "Mimi"}, Indoor: true}
	check("Cat.Describe() 繼承自 Animal", cat.Describe(), "動物: Mimi")
	check("Cat.Speak() 覆寫", cat.Speak(), "Mimi: Meow!")

	dog2 := Dog{Animal: Animal{Name: "Buddy"}, Breed: "Labrador"}
	check("Dog2.Speak()", dog2.Speak(), "Buddy: Woof!")

	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, total)
}`,
  },

  // ============================================================
  // 第 7 章補充：型別斷言與 type switch
  // ============================================================
  {
    id: 'iface-02',
    chapterId: 'interface',
    chapterTitle: '7. 介面',
    title: '7-2 型別斷言與 type switch',
    difficulty: 'medium',
    concept: `## 型別斷言（Type Assertion）

\`\`\`go
var i interface{} = "hello"

// 單回傳：失敗時 panic
s := i.(string)

// 雙回傳：失敗時 ok=false（推薦）
s, ok := i.(string)
if !ok { ... }
\`\`\`

## type switch

同時判斷多個型別：

\`\`\`go
func describe(i any) string {
    switch v := i.(type) {
    case int:
        return fmt.Sprintf("整數: %d", v)
    case string:
        return fmt.Sprintf("字串: %q", v)
    case bool:
        return fmt.Sprintf("布林: %v", v)
    case []int:
        return fmt.Sprintf("切片長度: %d", len(v))
    default:
        return fmt.Sprintf("未知型別: %T", v)
    }
}
\`\`\``,
    description: `### 練習：實作 describe 函數

實作 \`describe(i any) string\`，用 **type switch** 處理以下型別：

| 型別 | 回傳格式 |
|------|---------|
| \`int\` | \`"int:42"\` |
| \`float64\` | \`"float64:3.14"\` |
| \`string\` | \`"string:hello"\` |
| \`bool\` | \`"bool:true"\` |
| \`[]int\` | \`"[]int len=3"\` |
| 其他 | \`"unknown"\` |`,
    prefix: `package main

import "fmt"

`,
    template: `func describe(i any) string {
    // TODO: 用 type switch 判斷型別並回傳對應字串
    switch v := i.(type) {
    default:
        _ = v
        return "unknown"
    }
}`,
    solution: `func describe(i any) string {
    switch v := i.(type) {
    case int:
        return fmt.Sprintf("int:%d", v)
    case float64:
        return fmt.Sprintf("float64:%.2f", v)
    case string:
        return fmt.Sprintf("string:%s", v)
    case bool:
        return fmt.Sprintf("bool:%v", v)
    case []int:
        return fmt.Sprintf("[]int len=%d", len(v))
    default:
        return "unknown"
    }
}`,
    suffix: `
func main() {
	type tc struct{ input any; want string }
	tests := []tc{
		{42, "int:42"},
		{3.14, "float64:3.14"},
		{"hello", "string:hello"},
		{true, "bool:true"},
		{false, "bool:false"},
		{[]int{1, 2, 3}, "[]int len=3"},
		{[]int{}, "[]int len=0"},
		{nil, "unknown"},
	}
	passed := 0
	for i, t := range tests {
		got := describe(t.input)
		if got == t.want {
			passed++
			fmt.Printf("✓ Test %d  describe(%v)=%q\\n", i+1, t.input, got)
		} else {
			fmt.Printf("✗ Test %d  期望=%q 實際=%q\\n", i+1, t.want, got)
		}
	}
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  // ============================================================
  // 第 2 章補充：panic & recover
  // ============================================================
  {
    id: 'adv-04',
    chapterId: 'advanced',
    chapterTitle: '2. 進階特性',
    title: '2-4 panic 與 recover',
    difficulty: 'medium',
    concept: `## panic & recover

\`panic\` 讓程式立即停止並展開呼叫堆疊；\`recover\` 在 \`defer\` 中捕捉 panic：

\`\`\`go
func safeDiv(a, b int) (result int, err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("recovered: %v", r)
        }
    }()
    return a / b, nil  // b==0 觸發 panic: integer divide by zero
}
\`\`\`

### 使用原則

* \`panic\` 只用於**無法繼續執行**的狀況（如設定檔缺少必要欄位）
* 業務邏輯用 \`error\` 而非 \`panic\`
* \`recover\` 只在 \`defer\` 內有效
* 中介軟體常用 \`recover\` 防止單一請求崩潰整個服務`,
    description: `### 練習：safeCall — 捕捉任意 panic

實作 \`safeCall(fn func()) (err error)\`：
- 執行 \`fn()\`
- 若 fn 觸發 panic，用 recover 捕捉並回傳 error
- 若正常執行，回傳 nil

**範例**：
\`\`\`
safeCall(func(){}) → nil
safeCall(func(){ panic("oops") }) → error("oops")
safeCall(func(){ var s []int; _ = s[0] }) → error(runtime error...)
\`\`\``,
    prefix: `package main

import "fmt"

`,
    template: `func safeCall(fn func()) (err error) {
    defer func() {
        // TODO: 用 recover() 捕捉 panic，轉為 error 回傳
    }()
    fn()
    return nil
}`,
    solution: `func safeCall(fn func()) (err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("%v", r)
        }
    }()
    fn()
    return nil
}`,
    suffix: `
func main() {
	passed := 0
	total := 0
	check := func(label string, cond bool, detail string) {
		total++
		if cond {
			passed++
			fmt.Printf("✓ %s\\n", label)
		} else {
			fmt.Printf("✗ %s  %s\\n", label, detail)
		}
	}

	// 正常執行
	err1 := safeCall(func() {})
	check("正常執行回傳 nil", err1 == nil, fmt.Sprintf("got=%v", err1))

	// string panic
	err2 := safeCall(func() { panic("something went wrong") })
	check("捕捉 string panic", err2 != nil, "err=nil")
	check("error 包含 panic 訊息", err2 != nil && len(err2.Error()) > 0, "empty message")

	// runtime panic（index out of range）
	err3 := safeCall(func() {
		s := []int{}
		_ = s[0]
	})
	check("捕捉 runtime panic", err3 != nil, "err=nil")

	// int panic
	err4 := safeCall(func() { panic(42) })
	check("捕捉 int panic", err4 != nil, "err=nil")

	// 多次呼叫互不影響
	err5 := safeCall(func() {})
	check("再次正常呼叫", err5 == nil, fmt.Sprintf("got=%v", err5))

	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, total)
}`,
  },

  // ============================================================
  // 第 9 章補充：select 多路復用
  // ============================================================
  {
    id: 'conc-03',
    chapterId: 'concurrency',
    chapterTitle: '9. Goroutine 與 Channel',
    title: '9-3 select 多路復用',
    difficulty: 'hard',
    concept: `## select

\`select\` 同時監聽多個 channel，哪個先就緒就執行哪個：

\`\`\`go
select {
case v := <-ch1:
    fmt.Println("ch1:", v)
case v := <-ch2:
    fmt.Println("ch2:", v)
case <-time.After(1 * time.Second):
    fmt.Println("timeout")
}
\`\`\`

### default 分支（非阻塞）

\`\`\`go
select {
case v := <-ch:
    process(v)
default:
    // ch 無資料時立即執行
}
\`\`\`

### done channel 模式

用 \`done\` channel 通知 goroutine 退出：

\`\`\`go
func worker(done <-chan struct{}, jobs <-chan int) {
    for {
        select {
        case j := <-jobs:
            process(j)
        case <-done:
            return
        }
    }
}
\`\`\``,
    description: `### 練習：first — 取得最先回應的結果

實作 \`first(a, b <-chan string) string\`：
用 select 取得 **最先送出值** 的 channel 的結果並回傳。

再實作 \`orDone(done <-chan struct{}, in <-chan int) []int\`：
從 \`in\` 收集資料，直到 \`done\` 被關閉為止，回傳已收集的 slice。`,
    prefix: `package main

import (
	"fmt"
	"reflect"
	"sort"
	"time"
)

`,
    template: `// TODO: 回傳最先送出值的 channel 的結果
func first(a, b <-chan string) string {
    select {
    case v := <-a:
        return v
    case v := <-b:
        return v
    }
}

// TODO: 從 in 收集資料直到 done 被關閉
func orDone(done <-chan struct{}, in <-chan int) []int {
    result := []int{}
    for {
        select {
        case <-done:
            return result
        case v := <-in:
            result = append(result, v)
        }
    }
}`,
    solution: `func first(a, b <-chan string) string {
    select {
    case v := <-a:
        return v
    case v := <-b:
        return v
    }
}

func orDone(done <-chan struct{}, in <-chan int) []int {
    result := []int{}
    for {
        select {
        case <-done:
            return result
        case v, ok := <-in:
            if !ok {
                return result
            }
            result = append(result, v)
        }
    }
}`,
    suffix: `
func after(d time.Duration, val string) <-chan string {
	ch := make(chan string, 1)
	go func() { time.Sleep(d); ch <- val }()
	return ch
}

func main() {
	passed := 0
	total := 0
	check := func(label string, cond bool, detail string) {
		total++
		if cond {
			passed++
			fmt.Printf("✓ %s\\n", label)
		} else {
			fmt.Printf("✗ %s  %s\\n", label, detail)
		}
	}

	// first：a 先到
	r1 := first(after(10*time.Millisecond, "A"), after(100*time.Millisecond, "B"))
	check("first：a 先到 → A", r1 == "A", fmt.Sprintf("got=%q", r1))

	// first：b 先到
	r2 := first(after(100*time.Millisecond, "A"), after(10*time.Millisecond, "B"))
	check("first：b 先到 → B", r2 == "B", fmt.Sprintf("got=%q", r2))

	// orDone：done 關閉後停止收集
	done := make(chan struct{})
	in := make(chan int, 10)
	for _, v := range []int{1, 2, 3, 4, 5} {
		in <- v
	}
	time.Sleep(5 * time.Millisecond)
	close(done)
	got := orDone(done, in)
	sort.Ints(got)
	want := []int{1, 2, 3, 4, 5}
	check("orDone 收集 done 前的資料", reflect.DeepEqual(got, want),
		fmt.Sprintf("got=%v", got))

	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, total)
}`,
  },

  // ============================================================
  // 第 9 章補充：sync.Once 與 sync.RWMutex
  // ============================================================
  {
    id: 'conc-04',
    chapterId: 'concurrency',
    chapterTitle: '9. Goroutine 與 Channel',
    title: '9-4 sync.Once 與 sync.RWMutex',
    difficulty: 'hard',
    concept: `## sync.Once

確保某段程式碼只執行**一次**，常用於單例初始化：

\`\`\`go
var (
    instance *Config
    once     sync.Once
)

func GetConfig() *Config {
    once.Do(func() {
        instance = &Config{Port: 8080}
    })
    return instance
}
\`\`\`

## sync.RWMutex

讀多寫少的場景：允許多個 goroutine 同時**讀**，寫時獨佔：

\`\`\`go
type Cache struct {
    mu    sync.RWMutex
    store map[string]string
}

func (c *Cache) Get(key string) (string, bool) {
    c.mu.RLock()         // 多個讀者可以同時進來
    defer c.mu.RUnlock()
    v, ok := c.store[key]
    return v, ok
}

func (c *Cache) Set(key, val string) {
    c.mu.Lock()          // 寫時獨佔
    defer c.mu.Unlock()
    c.store[key] = val
}
\`\`\``,
    description: `### 練習：執行緒安全的 Cache

實作 \`Cache\` struct（含 sync.RWMutex）：
- \`NewCache() *Cache\`
- \`Set(key, value string)\`
- \`Get(key string) (string, bool)\`
- \`Delete(key string)\`

再實作 \`initOnce() string\`，用 \`sync.Once\` 確保初始化訊息只印一次，回傳 \`"initialized"\`。`,
    prefix: `package main

import (
	"fmt"
	"sync"
)

`,
    template: `type Cache struct {
    mu    sync.RWMutex
    store map[string]string
}

func NewCache() *Cache {
    // TODO
    return nil
}

func (c *Cache) Set(key, value string) {
    // TODO: 寫鎖
}

func (c *Cache) Get(key string) (string, bool) {
    // TODO: 讀鎖
    return "", false
}

func (c *Cache) Delete(key string) {
    // TODO: 寫鎖
}

var (
    once        sync.Once
    initMessage string
)

func initOnce() string {
    once.Do(func() {
        // TODO: 設定 initMessage = "initialized"
    })
    return initMessage
}`,
    solution: `type Cache struct {
    mu    sync.RWMutex
    store map[string]string
}

func NewCache() *Cache {
    return &Cache{store: map[string]string{}}
}

func (c *Cache) Set(key, value string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.store[key] = value
}

func (c *Cache) Get(key string) (string, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    v, ok := c.store[key]
    return v, ok
}

func (c *Cache) Delete(key string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    delete(c.store, key)
}

var (
    once        sync.Once
    initMessage string
)

func initOnce() string {
    once.Do(func() {
        initMessage = "initialized"
    })
    return initMessage
}`,
    suffix: `
func main() {
	passed := 0
	total := 0
	check := func(label string, cond bool, detail string) {
		total++
		if cond {
			passed++
			fmt.Printf("✓ %s\\n", label)
		} else {
			fmt.Printf("✗ %s  %s\\n", label, detail)
		}
	}

	c := NewCache()
	check("NewCache 不為 nil", c != nil, "got nil")

	c.Set("name", "Alice")
	v, ok := c.Get("name")
	check("Set + Get", ok && v == "Alice", fmt.Sprintf("v=%q ok=%v", v, ok))

	_, ok2 := c.Get("missing")
	check("Get 不存在 key", !ok2, "ok=true")

	c.Delete("name")
	_, ok3 := c.Get("name")
	check("Delete 後 Get", !ok3, "ok=true")

	// 並發讀寫
	var wg sync.WaitGroup
	for i := 0; i < 5; i++ {
		wg.Add(2)
		go func(n int) {
			defer wg.Done()
			c.Set(fmt.Sprintf("k%d", n), "v")
		}(i)
		go func(n int) {
			defer wg.Done()
			c.Get(fmt.Sprintf("k%d", n))
		}(i)
	}
	wg.Wait()
	check("並發讀寫不 panic", true, "")

	// sync.Once
	r1 := initOnce()
	r2 := initOnce()
	r3 := initOnce()
	check("Once 第1次", r1 == "initialized", fmt.Sprintf("got=%q", r1))
	check("Once 第2次相同", r2 == "initialized", fmt.Sprintf("got=%q", r2))
	check("Once 第3次相同", r3 == "initialized", fmt.Sprintf("got=%q", r3))

	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, total)
}`,
  },

  // ============================================================
  // 第 11 章補充：context WithCancel / WithValue
  // ============================================================
  {
    id: 'ctx-02',
    chapterId: 'context',
    chapterTitle: '11. Context',
    title: '11-2 WithCancel 與 WithValue',
    difficulty: 'hard',
    concept: `## context.WithCancel

手動取消，不依賴計時器：

\`\`\`go
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

go func() {
    time.Sleep(100 * time.Millisecond)
    cancel() // 通知取消
}()

select {
case <-ctx.Done():
    fmt.Println("已取消:", ctx.Err()) // context.Canceled
}
\`\`\`

## context.WithValue

在 context 中攜帶鍵值（僅限請求範圍資料，如 requestID）：

\`\`\`go
type key string
const requestIDKey key = "requestID"

ctx := context.WithValue(context.Background(), requestIDKey, "abc-123")

// 讀取
id := ctx.Value(requestIDKey).(string)
\`\`\`

> **注意**：key 應使用自訂型別，避免與其他套件的 key 衝突。`,
    description: `### 練習：帶 requestID 的 worker

實作兩個函數：

1. \`withRequestID(ctx context.Context, id string) context.Context\`
   — 把 requestID 存入 context

2. \`getRequestID(ctx context.Context) string\`
   — 從 context 取出 requestID，不存在時回傳 \`"unknown"\`

3. \`cancelableWorker(ctx context.Context) string\`
   — 監聽 ctx.Done()，取消時回傳 \`"canceled"\`，否則工作完成回傳 \`"done"\`（模擬 50ms 工作）`,
    prefix: `package main

import (
	"context"
	"fmt"
	"time"
)

type ctxKey string

const requestIDKey ctxKey = "requestID"

`,
    template: `func withRequestID(ctx context.Context, id string) context.Context {
    // TODO: 用 context.WithValue 存入 requestID
    return ctx
}

func getRequestID(ctx context.Context) string {
    // TODO: 從 ctx.Value 取出，不存在回傳 "unknown"
    return "unknown"
}

func cancelableWorker(ctx context.Context) string {
    select {
    case <-time.After(50 * time.Millisecond):
        // TODO: 回傳 "done"
        return ""
    case <-ctx.Done():
        // TODO: 回傳 "canceled"
        return ""
    }
}`,
    solution: `func withRequestID(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, requestIDKey, id)
}

func getRequestID(ctx context.Context) string {
    id, ok := ctx.Value(requestIDKey).(string)
    if !ok {
        return "unknown"
    }
    return id
}

func cancelableWorker(ctx context.Context) string {
    select {
    case <-time.After(50 * time.Millisecond):
        return "done"
    case <-ctx.Done():
        return "canceled"
    }
}`,
    suffix: `
func main() {
	passed := 0
	total := 0
	check := func(label, got, want string) {
		total++
		if got == want {
			passed++
			fmt.Printf("✓ %s\\n", label)
		} else {
			fmt.Printf("✗ %s  期望=%q 實際=%q\\n", label, want, got)
		}
	}

	// WithValue / GetValue
	ctx := context.Background()
	check("無 ID 時回傳 unknown", getRequestID(ctx), "unknown")

	ctx2 := withRequestID(ctx, "req-001")
	check("存入後可取出", getRequestID(ctx2), "req-001")

	ctx3 := withRequestID(ctx2, "req-002")
	check("覆蓋後取新值", getRequestID(ctx3), "req-002")
	check("原 ctx2 不受影響", getRequestID(ctx2), "req-001")

	// cancelableWorker：工作完成
	bgCtx := context.Background()
	r1 := cancelableWorker(bgCtx)
	check("未取消 → done", r1, "done")

	// cancelableWorker：取消
	cCtx, cancel := context.WithCancel(context.Background())
	cancel() // 立即取消
	r2 := cancelableWorker(cCtx)
	check("已取消 → canceled", r2, "canceled")

	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, total)
}`,
  },

  // ============================================================
  // 第 12 章：測試實踐
  // ============================================================
  {
    id: 'test-01',
    chapterId: 'testing',
    chapterTitle: '12. 測試實踐',
    title: '12-1 Table-Driven Test 模式',
    difficulty: 'medium',
    concept: `## Go 測試基礎

測試檔命名為 \`xxx_test.go\`，函數以 \`Test\` 開頭：

\`\`\`go
func TestAdd(t *testing.T) {
    got := Add(1, 2)
    if got != 3 {
        t.Errorf("Add(1,2) = %d, want 3", got)
    }
}
\`\`\`

## Table-Driven Test（推薦）

\`\`\`go
func TestAdd(t *testing.T) {
    cases := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"正數", 1, 2, 3},
        {"負數", -1, 1, 0},
        {"零", 0, 0, 0},
    }
    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {
            got := Add(tc.a, tc.b)
            if got != tc.expected {
                t.Errorf("got %d, want %d", got, tc.expected)
            }
        })
    }
}
\`\`\`

## 常用 t 方法

| 方法 | 說明 |
|------|------|
| \`t.Error\` | 標記失敗，繼續執行 |
| \`t.Fatal\` | 標記失敗，立即停止 |
| \`t.Errorf\` | 格式化失敗訊息 |
| \`t.Run\` | 子測試 |`,
    description: `### 練習：實作 calculator 並通過所有測試

實作以下函數：
- \`Add(a, b int) int\`
- \`Sub(a, b int) int\`
- \`Mul(a, b int) int\`
- \`Div(a, b int) (int, error)\`（b==0 回傳 error）

平台會用類似 Table-Driven 的方式自動測試每個函數。`,
    prefix: `package main

import (
	"errors"
	"fmt"
)

`,
    template: `func Add(a, b int) int {
    // TODO
    return 0
}

func Sub(a, b int) int {
    // TODO
    return 0
}

func Mul(a, b int) int {
    // TODO
    return 0
}

func Div(a, b int) (int, error) {
    // TODO: b==0 回傳 errors.New("division by zero")
    return 0, nil
}`,
    solution: `func Add(a, b int) int { return a + b }
func Sub(a, b int) int { return a - b }
func Mul(a, b int) int { return a * b }

func Div(a, b int) (int, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}`,
    suffix: `
func main() {
	passed := 0
	total := 0
	check := func(label string, got, want int) {
		total++
		if got == want {
			passed++
			fmt.Printf("✓ %s = %d\\n", label, got)
		} else {
			fmt.Printf("✗ %s 期望=%d 實際=%d\\n", label, want, got)
		}
	}
	checkErr := func(label string, got int, err error, wantVal int, wantErr bool) {
		total++
		if wantErr {
			if err != nil {
				passed++
				fmt.Printf("✓ %s 正確回傳 error\\n", label)
			} else {
				fmt.Printf("✗ %s 應回傳 error\\n", label)
			}
		} else {
			if err == nil && got == wantVal {
				passed++
				fmt.Printf("✓ %s = %d\\n", label, got)
			} else {
				fmt.Printf("✗ %s 期望=%d err=%v\\n", label, wantVal, err)
			}
		}
	}

	// Add
	check("Add(1,2)", Add(1, 2), 3)
	check("Add(-1,1)", Add(-1, 1), 0)
	check("Add(0,0)", Add(0, 0), 0)
	check("Add(100,-50)", Add(100, -50), 50)

	// Sub
	check("Sub(5,3)", Sub(5, 3), 2)
	check("Sub(0,5)", Sub(0, 5), -5)

	// Mul
	check("Mul(3,4)", Mul(3, 4), 12)
	check("Mul(-2,5)", Mul(-2, 5), -10)
	check("Mul(0,99)", Mul(0, 99), 0)

	// Div
	r1, e1 := Div(10, 2)
	checkErr("Div(10,2)", r1, e1, 5, false)
	r2, e2 := Div(7, 3)
	checkErr("Div(7,3)", r2, e2, 2, false)
	_, e3 := Div(5, 0)
	checkErr("Div(5,0) 除以零", 0, e3, 0, true)

	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, total)
}`,
  },
]
