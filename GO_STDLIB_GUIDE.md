# Go 常用標準庫指南

[← 返回目錄](README.md)

這份文件涵蓋 Go 語言最常用的標準庫套件，包含 `strings`、`strconv`、`time`、`os`、`io`、`bufio`、`fmt`、`regexp`、`sort`、`flag`、`log` 與 `log/slog`。每個套件都附有完整可執行的程式碼範例，並特別指出入門者容易踩到的陷阱。適合有其他語言背景但不熟悉 Go 標準庫的開發者，以及準備 Go 面試的工程師。

---

## 1. strings 套件：字串操作

`strings` 套件提供所有與 UTF-8 字串相關的操作函數。Go 的字串是不可變的（immutable），每次修改都會產生新字串，因此大量拼接時需要改用 `strings.Builder`。

### 1-1 常用函數一覽

常用函數包含 `Contains`、`HasPrefix`、`HasSuffix`、`Count`、`Index`。

```go
package main

import (
	"fmt"
	"strings"
)

func main() {
	s := "Hello, Go World!"

	// Contains：是否包含子字串
	fmt.Println(strings.Contains(s, "Go"))      // true
	fmt.Println(strings.Contains(s, "Python"))  // false

	// HasPrefix / HasSuffix：前綴 / 後綴判斷
	fmt.Println(strings.HasPrefix(s, "Hello"))  // true
	fmt.Println(strings.HasSuffix(s, "World!")) // true

	// Count：計算子字串出現次數
	fmt.Println(strings.Count(s, "o")) // 3

	// Index：找第一個出現的位置（byte 位置），找不到回傳 -1
	fmt.Println(strings.Index(s, "Go"))     // 7
	fmt.Println(strings.Index(s, "Python")) // -1

	// LastIndex：找最後一個出現的位置
	fmt.Println(strings.LastIndex(s, "o")) // 13
}
```

```text
輸出：
true
false
true
true
3
7
-1
13
```

### 1-2 修剪與分割

`TrimSpace`、`Trim`、`Split`、`Fields` 是處理輸入資料最常用的函數。

```go
package main

import (
	"fmt"
	"strings"
)

func main() {
	// TrimSpace：去除前後空白（含換行符）
	raw := "  hello world\n  "
	fmt.Printf("%q\n", strings.TrimSpace(raw)) // "hello world"

	// Trim：去除前後指定字元集合
	path := "///usr/local///"
	fmt.Println(strings.Trim(path, "/")) // usr/local

	// TrimLeft / TrimRight：只去除單側
	fmt.Println(strings.TrimLeft("###title###", "#"))  // title###
	fmt.Println(strings.TrimRight("###title###", "#")) // ###title

	// Split：依分隔符切割，回傳 []string
	parts := strings.Split("a,b,c,d", ",")
	fmt.Println(parts)       // [a b c d]
	fmt.Println(len(parts))  // 4

	// SplitN：最多切 n 段
	parts2 := strings.SplitN("a:b:c:d", ":", 2)
	fmt.Println(parts2) // [a b:c:d]

	// Fields：以連續空白切割（自動忽略多餘空白）
	words := strings.Fields("  foo   bar  baz  ")
	fmt.Println(words) // [foo bar baz]
}
```

```text
輸出：
"hello world"
usr/local
title###
###title
[a b c d]
4
[a b:c:d]
[foo bar baz]
```

### 1-3 替換

`Replace`、`ReplaceAll`、`Map` 提供彈性的字串替換能力。

```go
package main

import (
	"fmt"
	"strings"
	"unicode"
)

func main() {
	s := "aababab"

	// Replace(s, old, new, n)：替換前 n 個，n=-1 代表全部
	fmt.Println(strings.Replace(s, "ab", "X", 2))  // aXXab
	fmt.Println(strings.Replace(s, "ab", "X", -1)) // aXXX

	// ReplaceAll：等同 Replace(..., -1)
	fmt.Println(strings.ReplaceAll("foo bar foo", "foo", "baz")) // baz bar baz

	// Map：對每個 rune 套用函數，可用於字元級別轉換
	rot13 := func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z':
			return 'a' + (r-'a'+13)%26
		case r >= 'A' && r <= 'Z':
			return 'A' + (r-'A'+13)%26
		}
		return r
	}
	fmt.Println(strings.Map(rot13, "Hello, World!")) // Uryyb, Jbeyq!

	// 移除所有非字母字元
	removeNonLetter := func(r rune) rune {
		if unicode.IsLetter(r) {
			return r
		}
		return -1 // 回傳 -1 代表刪除這個字元
	}
	fmt.Println(strings.Map(removeNonLetter, "Hello, 123 World!")) // HelloWorld
}
```

```text
輸出：
aXXab
aXXX
baz bar baz
Uryyb, Jbeyq!
HelloWorld
```

### 1-4 大小寫轉換

```go
package main

import (
	"fmt"
	"strings"
)

func main() {
	s := "hello world"

	fmt.Println(strings.ToUpper(s))  // HELLO WORLD
	fmt.Println(strings.ToLower("HELLO WORLD")) // hello world

	// Title：每個單字首字母大寫（已過時，建議用 golang.org/x/text）
	fmt.Println(strings.Title(s)) // Hello World（已標記為 Deprecated）

	// ToTitle：全部大寫（與 ToUpper 差異在 Unicode 處理）
	fmt.Println(strings.ToTitle("hello")) // HELLO

	// 不分大小寫比較
	fmt.Println(strings.EqualFold("Go", "go"))     // true
	fmt.Println(strings.EqualFold("Go", "GO"))     // true

	// 不分大小寫搜尋（技巧：都轉小寫再搜尋）
	haystack := "Hello World"
	needle := "world"
	fmt.Println(strings.Contains(
		strings.ToLower(haystack),
		strings.ToLower(needle),
	)) // true
}
```

```text
輸出：
HELLO WORLD
hello world
Hello World
HELLO
true
true
true
```

> **注意**：`strings.Title` 在 Go 1.18 起標記為 Deprecated，因為它無法正確處理 Unicode。多語言場景請使用 `golang.org/x/text/cases` 套件。

### 1-5 strings.Builder：高效字串拼接

在迴圈中用 `+` 拼接字串，每次都會產生新的記憶體分配，效能極差。`strings.Builder` 內部使用可增長的 `[]byte`，大量拼接時效能遠優於 `+`。

```go
package main

import (
	"fmt"
	"strings"
)

func main() {
	// 壞的寫法：每次 += 都會分配新記憶體
	// result := ""
	// for i := 0; i < 10000; i++ {
	//     result += "a"  // 產生大量垃圾回收壓力
	// }

	// 好的寫法：使用 strings.Builder
	var sb strings.Builder

	// 如果已知大概長度，可以預先分配
	sb.Grow(100)

	for i := 0; i < 5; i++ {
		sb.WriteString("hello")
		sb.WriteByte(' ')
	}

	result := sb.String()
	fmt.Println(result) // hello hello hello hello hello

	// Reset 可以重複使用同一個 Builder
	sb.Reset()
	sb.WriteString("reset done")
	fmt.Println(sb.String()) // reset done

	// 實用場景：用 Builder 實作 Join（了解原理用，實際用 strings.Join）
	words := []string{"Go", "is", "awesome"}
	var b strings.Builder
	for i, w := range words {
		if i > 0 {
			b.WriteString(" ")
		}
		b.WriteString(w)
	}
	fmt.Println(b.String()) // Go is awesome

	// 更簡單：直接用 strings.Join
	fmt.Println(strings.Join(words, " ")) // Go is awesome
}
```

```text
輸出：
hello hello hello hello hello 
reset done
Go is awesome
Go is awesome
```

> **建議**：只要在迴圈內拼接字串，就應該使用 `strings.Builder`。`strings.Join` 是最簡潔的切片轉字串方式。

### 1-6 strings.Reader：把字串當 io.Reader

`strings.Reader` 讓字串可以當作 `io.Reader` 使用，在需要傳入 `io.Reader` 參數的函數中非常實用。

```go
package main

import (
	"fmt"
	"io"
	"strings"
)

func main() {
	// 建立一個 strings.Reader
	r := strings.NewReader("Hello, Go!")

	fmt.Println("Size:", r.Len()) // 尚未讀取的 byte 數

	// 當作 io.Reader 使用
	buf := make([]byte, 5)
	n, err := r.Read(buf)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Printf("Read %d bytes: %s\n", n, buf[:n])
	fmt.Println("Remaining:", r.Len())

	// ReadAll 讀取剩餘全部
	rest, err := io.ReadAll(r)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println("Rest:", string(rest))

	// 實際應用：HTTP 測試時傳入 body
	// req := httptest.NewRequest("POST", "/", strings.NewReader(`{"name":"Alice"}`))
}
```

```text
輸出：
Size: 10
Read 5 bytes: Hello
Remaining: 5
Rest: , Go!
```

---

## 2. strconv 套件：型別轉換

`strconv` 套件負責字串與基本型別之間的相互轉換，是處理使用者輸入、設定檔讀取最常用的套件。

### 2-1 整數與字串互轉

`Itoa`（Integer to ASCII）與 `Atoi`（ASCII to Integer）是最常用的整數轉換函數。

```go
package main

import (
	"fmt"
	"strconv"
)

func main() {
	// Itoa：int 轉 string（最常用）
	n := 42
	s := strconv.Itoa(n)
	fmt.Printf("Type: %T, Value: %s\n", s, s) // Type: string, Value: 42

	// Atoi：string 轉 int，會回傳 error
	num, err := strconv.Atoi("123")
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println(num + 1) // 124

	// 處理非法輸入
	_, err = strconv.Atoi("abc")
	if err != nil {
		fmt.Println("Error:", err) // 會印出錯誤訊息
	}

	// 也可以用 fmt.Sprintf，但 strconv.Itoa 效能更好
	s2 := fmt.Sprintf("%d", 100)
	fmt.Println(s2) // 100
}
```

```text
輸出：
Type: string, Value: 42
124
Error: strconv.Atoi: parsing "abc": invalid syntax
100
```

### 2-2 浮點數轉換

```go
package main

import (
	"fmt"
	"strconv"
)

func main() {
	// FormatFloat：float64 轉 string
	// 參數：(值, 格式, 精度, 位元大小)
	// 格式：'f' 小數點、'e' 科學記號、'g' 自動選擇
	f := 3.14159265358979
	fmt.Println(strconv.FormatFloat(f, 'f', 2, 64))  // 3.14
	fmt.Println(strconv.FormatFloat(f, 'f', 6, 64))  // 3.141593
	fmt.Println(strconv.FormatFloat(f, 'e', 4, 64))  // 3.1416e+00
	fmt.Println(strconv.FormatFloat(f, 'g', -1, 64)) // 3.14159265358979

	// ParseFloat：string 轉 float64
	pi, err := strconv.ParseFloat("3.14", 64)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Printf("%.4f\n", pi) // 3.1400

	// 處理非法輸入
	_, err = strconv.ParseFloat("not_a_number", 64)
	if err != nil {
		fmt.Println("Error:", err)
	}
}
```

```text
輸出：
3.14
3.141593
3.1416e+00
3.14159265358979
3.1400
Error: strconv.ParseFloat: parsing "not_a_number": invalid syntax
```

### 2-3 布林值轉換

```go
package main

import (
	"fmt"
	"strconv"
)

func main() {
	// FormatBool：bool 轉 string
	fmt.Println(strconv.FormatBool(true))  // true
	fmt.Println(strconv.FormatBool(false)) // false

	// ParseBool：接受多種合法格式
	// "1", "t", "T", "TRUE", "true", "True" → true
	// "0", "f", "F", "FALSE", "false", "False" → false
	for _, s := range []string{"true", "True", "TRUE", "1", "t"} {
		b, _ := strconv.ParseBool(s)
		fmt.Printf("ParseBool(%q) = %v\n", s, b)
	}

	// 非法值會回傳 error
	_, err := strconv.ParseBool("yes")
	if err != nil {
		fmt.Println("Error:", err)
	}
}
```

```text
輸出：
true
false
ParseBool("true") = true
ParseBool("True") = true
ParseBool("TRUE") = true
ParseBool("1") = true
ParseBool("t") = true
Error: strconv.ParseBool: parsing "yes": invalid syntax
```

### 2-4 ParseInt / FormatInt 進制轉換

```go
package main

import (
	"fmt"
	"strconv"
)

func main() {
	// ParseInt(s, base, bitSize)
	// base：進制（2=二進位、8=八進位、10=十進位、16=十六進位、0=自動偵測）
	// bitSize：0=int、8=int8、16=int16、32=int32、64=int64

	// 十六進位字串轉整數
	n, err := strconv.ParseInt("FF", 16, 64)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println(n) // 255

	// 二進位字串轉整數
	n2, _ := strconv.ParseInt("1010", 2, 64)
	fmt.Println(n2) // 10

	// base=0：自動偵測前綴（0x=十六進位、0o=八進位、0b=二進位）
	n3, _ := strconv.ParseInt("0xFF", 0, 64)
	fmt.Println(n3) // 255

	// FormatInt：整數轉指定進制字串
	fmt.Println(strconv.FormatInt(255, 16)) // ff
	fmt.Println(strconv.FormatInt(255, 2))  // 11111111
	fmt.Println(strconv.FormatInt(255, 8))  // 377

	// ParseUint：無號整數版本
	u, _ := strconv.ParseUint("FFFF", 16, 64)
	fmt.Println(u) // 65535
}
```

```text
輸出：
255
10
255
ff
11111111
377
65535
```

### 2-5 常見錯誤：ParseInt 的 *NumError

當 `ParseInt`、`ParseFloat` 等函數解析失敗時，回傳的 error 是 `*strconv.NumError` 型別，可以透過型別斷言取得詳細資訊。

```go
package main

import (
	"errors"
	"fmt"
	"strconv"
)

func main() {
	_, err := strconv.Atoi("999999999999999999999")
	if err != nil {
		// 用 errors.As 取得 *strconv.NumError
		var numErr *strconv.NumError
		if errors.As(err, &numErr) {
			fmt.Println("Func:", numErr.Func)   // Atoi
			fmt.Println("Num:", numErr.Num)     // 原始字串
			fmt.Println("Err:", numErr.Err)     // strconv.ErrRange 或 ErrSyntax
		}

		// 判斷是範圍錯誤還是語法錯誤
		switch {
		case errors.Is(err, strconv.ErrRange):
			fmt.Println("數字超出範圍")
		case errors.Is(err, strconv.ErrSyntax):
			fmt.Println("語法錯誤")
		}
	}
}
```

```text
輸出：
Func: Atoi
Num: 999999999999999999999
Err: value out of range
數字超出範圍
```

---

## 3. time 套件：時間操作

`time` 套件提供時間的表示、格式化、解析與計算功能。Go 有一個讓所有新手困惑的設計：格式化字串不用 `%Y-%m-%d` 這種格式，而是用一個特定的「參考時間」。

### 3-1 取得當前時間與時區

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	// 取得當前時間（包含時區資訊）
	now := time.Now()
	fmt.Println(now)

	// 取得 UTC 時間
	utc := now.UTC()
	fmt.Println("UTC:", utc)

	// 取得時區
	loc, offset := now.Zone()
	fmt.Printf("時區：%s，UTC 偏移：%d 秒\n", loc, offset)

	// 載入指定時區
	taipei, err := time.LoadLocation("Asia/Taipei")
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	taipeiTime := now.In(taipei)
	fmt.Println("台北時間:", taipeiTime)

	// 取得時間的各個部分
	fmt.Println("年:", now.Year())
	fmt.Println("月:", now.Month())          // time.Month 型別
	fmt.Println("月（數字）:", int(now.Month()))
	fmt.Println("日:", now.Day())
	fmt.Println("時:", now.Hour())
	fmt.Println("分:", now.Minute())
	fmt.Println("秒:", now.Second())
	fmt.Println("星期:", now.Weekday())       // time.Weekday 型別
	fmt.Println("Unix timestamp:", now.Unix()) // 秒
	fmt.Println("Unix nano:", now.UnixNano())  // 奈秒
}
```

```text
輸出（範例）：
2026-06-01 14:30:00.123456789 +0800 CST m=+0.000000001
UTC: 2026-06-01 06:30:00.123456789 +0000 UTC
時區：CST，UTC 偏移：28800 秒
台北時間: 2026-06-01 14:30:00.123456789 +0800 CST
年: 2026
月: June
月（數字）: 6
日: 1
時: 14
分: 30
秒: 0
星期: Monday
Unix timestamp: 1748755800
Unix nano: 1748755800123456789
```

### 3-2 時間格式化

#### Go 格式化字串的特殊規則

這是 Go 最讓新手困惑的設計：Go **不使用** `%Y`、`%m`、`%d` 這類格式符號，而是使用一個固定的「參考時間」（reference time）來定義格式。

這個參考時間是 **2006年1月2日，下午3點4分5秒，星期一，時區 -0700**，對應到數字就是：

```text
年    月  日   時  分  秒   時區
2006  01  02  15  04  05  -07:00
```

這個時間的選取有其規律：從 1 到 7 分別對應月、日、時、分、秒、年（後兩位）、時區（-7）：

```text
月(01) 日(02) 時(15/03) 分(04) 秒(05) 年(06) 時區(-07)
  1     2       3        4      5      6       7
```

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	t := time.Date(2026, 6, 1, 14, 30, 45, 0, time.Local)

	// 常用格式
	fmt.Println(t.Format("2006-01-02"))                    // 2026-06-01
	fmt.Println(t.Format("2006/01/02 15:04:05"))           // 2026/06/01 14:30:45
	fmt.Println(t.Format("2006年01月02日 15:04:05"))        // 2026年06月01日 14:30:45
	fmt.Println(t.Format("01/02/2006"))                    // 06/01/2026（美式日期）
	fmt.Println(t.Format("3:04 PM"))                       // 2:30 PM（12 小時制）
	fmt.Println(t.Format("Mon, 02 Jan 2006 15:04:05 MST")) // RFC822 風格

	// Go 內建的預定義格式
	fmt.Println(t.Format(time.RFC3339))       // 2026-06-01T14:30:45+08:00
	fmt.Println(t.Format(time.RFC1123))       // Mon, 01 Jun 2026 14:30:45 CST
	fmt.Println(t.Format(time.DateOnly))      // 2026-06-01（Go 1.20+）
	fmt.Println(t.Format(time.TimeOnly))      // 14:30:45（Go 1.20+）
	fmt.Println(t.Format(time.DateTime))      // 2026-06-01 14:30:45（Go 1.20+）
}
```

```text
輸出：
2026-06-01
2026/06/01 14:30:45
2026年06月01日 14:30:45
06/01/2026
2:30 PM
Mon, 01 Jun 2026 14:30:45 CST
2026-06-01T14:30:45+08:00
Mon, 01 Jun 2026 14:30:45 CST
2026-06-01
14:30:45
2026-06-01 14:30:45
```

> **警告**：Go 的格式字串必須使用 `2006`、`01`、`02`、`15`、`04`、`05` 這些特定數字。如果你寫 `2024-12-31`，Go 不會把它當成日期格式，而是格式化成奇怪的結果。常見錯誤是寫 `2024` 或 `YYYY`，這些都是錯誤的。

### 3-3 時間解析

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	// Parse(layout, value)：layout 就是格式字串，必須與 value 完全匹配
	t, err := time.Parse("2006-01-02", "2026-06-01")
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println(t) // 2026-06-01 00:00:00 +0000 UTC

	// 注意：time.Parse 預設使用 UTC！
	t2, _ := time.Parse("2006-01-02 15:04:05", "2026-06-01 14:30:45")
	fmt.Println(t2.Location()) // UTC

	// 若要解析含時區的字串，用 time.ParseInLocation
	taipei, _ := time.LoadLocation("Asia/Taipei")
	t3, _ := time.ParseInLocation("2006-01-02 15:04:05", "2026-06-01 14:30:45", taipei)
	fmt.Println(t3)            // 2026-06-01 14:30:45 +0800 CST
	fmt.Println(t3.Location()) // Asia/Taipei

	// 解析 RFC3339（含時區的 ISO 8601）
	t4, _ := time.Parse(time.RFC3339, "2026-06-01T14:30:45+08:00")
	fmt.Println(t4.UTC()) // 2026-06-01 06:30:45 +0000 UTC

	// 從 Unix timestamp 建立 time.Time
	ts := time.Unix(1748755800, 0)
	fmt.Println(ts)
}
```

```text
輸出：
2026-06-01 00:00:00 +0000 UTC
UTC
2026-06-01 14:30:45 +0800 CST
Asia/Taipei
2026-06-01 06:30:45 +0000 UTC
2026-06-01 06:30:00 +0000 UTC
```

> **警告**：`time.Parse` 解析出的時間時區是 UTC，不是本地時區。如果需要本地時區，必須使用 `time.ParseInLocation`。這是非常常見的 bug 來源。

### 3-4 時間計算

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	now := time.Now()

	// Add：加減時間長度（time.Duration）
	oneHourLater := now.Add(1 * time.Hour)
	twoDaysAgo := now.Add(-48 * time.Hour)
	fmt.Println("1 小時後:", oneHourLater.Format("15:04:05"))
	fmt.Println("2 天前:", twoDaysAgo.Format("2006-01-02"))

	// Sub：兩個時間相差的 Duration
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	diff := end.Sub(start)
	fmt.Printf("相差 %.0f 天\n", diff.Hours()/24) // 相差 151 天

	// Since / Until：與現在的差距
	deadline := time.Date(2026, 12, 31, 23, 59, 59, 0, time.UTC)
	fmt.Printf("距離年底還有 %.0f 天\n", time.Until(deadline).Hours()/24)

	// Before / After / Equal：時間比較
	t1 := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	t2 := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	fmt.Println(t1.Before(t2)) // true
	fmt.Println(t2.After(t1))  // true

	// AddDate：加減年月日（處理月底等邊界情況）
	t := time.Date(2026, 1, 31, 0, 0, 0, 0, time.UTC)
	fmt.Println(t.AddDate(0, 1, 0)) // 2026-03-03（1月31日加1個月）
}
```

```text
輸出（範例）：
1 小時後: 15:30:00
2 天前: 2026-05-30
相差 151 天
距離年底還有 213 天
true
true
2026-03-03 00:00:00 +0000 UTC
```

### 3-5 time.Duration：時間長度

`time.Duration` 是 `int64` 的型別別名，單位是**奈秒**。Go 提供了各種預定義常數讓計算更直觀。

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	// Duration 常數（都是 time.Duration 型別）
	fmt.Println(time.Nanosecond)  // 1ns
	fmt.Println(time.Microsecond) // 1µs
	fmt.Println(time.Millisecond) // 1ms
	fmt.Println(time.Second)      // 1s
	fmt.Println(time.Minute)      // 1m0s
	fmt.Println(time.Hour)        // 1h0m0s

	// 組合 Duration
	d := 2*time.Hour + 30*time.Minute + 15*time.Second
	fmt.Println(d)              // 2h30m15s
	fmt.Println(d.Hours())      // 2.504166...
	fmt.Println(d.Minutes())    // 150.25
	fmt.Println(d.Seconds())    // 9015
	fmt.Println(d.Milliseconds()) // 9015000

	// time.ParseDuration：從字串解析 Duration
	d2, _ := time.ParseDuration("1h30m")
	fmt.Println(d2) // 1h30m0s

	d3, _ := time.ParseDuration("300ms")
	fmt.Println(d3) // 300ms

	// 測量函數執行時間
	start := time.Now()
	time.Sleep(10 * time.Millisecond) // 模擬耗時操作
	elapsed := time.Since(start)
	fmt.Printf("耗時：%v\n", elapsed) // 耗時：10.xxx ms
}
```

```text
輸出：
1ns
1µs
1ms
1s
1m0s
1h0m0s
2h30m15s
2.504166666666667
150.25
9015
9015000
1h30m0s
300ms
耗時：10.xxx ms
```

### 3-6 time.Timer 與 time.Ticker

`Timer` 是單次計時器，`Ticker` 是重複計時器，兩者都透過 channel 傳遞訊號。

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	// Timer：延遲一次
	timer := time.NewTimer(100 * time.Millisecond)
	<-timer.C // 等待觸發
	fmt.Println("Timer 觸發")

	// 也可以用更簡潔的 time.After（但要注意 timer 洩漏）
	<-time.After(10 * time.Millisecond)
	fmt.Println("After 觸發")

	// Ticker：定期重複觸發
	ticker := time.NewTicker(50 * time.Millisecond)
	defer ticker.Stop() // 用完一定要 Stop，否則 goroutine 洩漏

	count := 0
	for {
		<-ticker.C
		count++
		fmt.Printf("Tick %d\n", count)
		if count >= 3 {
			break
		}
	}

	// 常見模式：Ticker + context
	// ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	// defer cancel()
	// for {
	//     select {
	//     case <-ticker.C:
	//         doWork()
	//     case <-ctx.Done():
	//         return
	//     }
	// }
}
```

```text
輸出：
Timer 觸發
After 觸發
Tick 1
Tick 2
Tick 3
```

> **警告**：`time.NewTicker` 和 `time.NewTimer` 使用完畢後必須呼叫 `.Stop()`，否則底層 goroutine 會洩漏。`time.After` 在短時間大量呼叫時也會有記憶體壓力，因為每次都建立新的 timer。

### 3-7 常見陷阱：Go 的時間格式參考時間

總結 Go 時間格式的記憶方式：

```text
參考時間：Mon Jan 2 15:04:05 MST 2006

分解記憶法（數字 1~7 按位置記）：
  月  日  時   分  秒  年  時區
  01  02  15  04  05  06  -07

實際應用對照：
  輸入格式字串：  "2006-01-02 15:04:05"
  實際日期格式：  "年-月-日 時:分:秒"
```

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	t := time.Date(2026, 6, 1, 14, 30, 45, 0, time.UTC)

	// 正確 ✓
	fmt.Println(t.Format("2006-01-02")) // 2026-06-01

	// 錯誤示範 ✗（不要這樣寫）
	fmt.Println(t.Format("2024-12-31")) // 格式化結果是錯誤的
	fmt.Println(t.Format("YYYY-MM-DD")) // 這是 Java/JS 格式，Go 不認識

	// 備忘：time 套件提供的常數
	fmt.Println(time.RFC3339)     // "2006-01-02T15:04:05Z07:00"
	fmt.Println(time.DateOnly)    // "2006-01-02"（Go 1.20+）
	fmt.Println(time.TimeOnly)    // "15:04:05"（Go 1.20+）
	fmt.Println(time.DateTime)    // "2006-01-02 15:04:05"（Go 1.20+）
}
```

```text
輸出：
2026-06-01
0020-12-31  ← 這是錯誤輸出！
YYYY-MM-DD  ← 根本沒有格式化
2006-01-02T15:04:05Z07:00
2006-01-02
15:04:05
2006-01-02 15:04:05
```

> **建議**：直接使用 Go 1.20+ 提供的 `time.DateOnly`、`time.TimeOnly`、`time.DateTime` 常數，避免手寫格式字串出錯。

---

## 4. os 套件：作業系統操作

`os` 套件提供作業系統相關的功能，包含環境變數、命令列參數、文件系統操作等，是撰寫 CLI 工具與後端服務最常用的套件之一。

### 4-1 環境變數

```go
package main

import (
	"fmt"
	"os"
)

func main() {
	// Getenv：取得環境變數，不存在時回傳空字串
	home := os.Getenv("HOME")
	fmt.Println("HOME:", home)

	// LookupEnv：區分「不存在」和「值為空字串」
	val, ok := os.LookupEnv("HOME")
	fmt.Printf("val=%q, ok=%v\n", val, ok)

	// 環境變數不存在的情況
	val2, ok2 := os.LookupEnv("NON_EXISTENT_VAR")
	fmt.Printf("val=%q, ok=%v\n", val2, ok2) // val="", ok=false

	// Setenv：設定環境變數（只影響當前程序）
	err := os.Setenv("MY_APP_ENV", "production")
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println(os.Getenv("MY_APP_ENV")) // production

	// Unsetenv：刪除環境變數
	os.Unsetenv("MY_APP_ENV")
	fmt.Println(os.Getenv("MY_APP_ENV")) // 空字串

	// Environ：取得所有環境變數（[]string，格式為 "KEY=VALUE"）
	envs := os.Environ()
	fmt.Printf("共 %d 個環境變數\n", len(envs))

	// 實用的設定讀取模式
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // 預設值
	}
	fmt.Println("Port:", port)
}
```

```text
輸出：
HOME: /home/user
val="/home/user", ok=true
val="", ok=false
production

共 XX 個環境變數
Port: 8080
```

> **建議**：使用 `LookupEnv` 而非 `Getenv`，可以明確區分「環境變數不存在」與「環境變數值為空字串」兩種情況，避免設定讀取錯誤。

### 4-2 命令列參數

```go
package main

import (
	"fmt"
	"os"
)

func main() {
	// os.Args[0] 是程式本身的路徑
	// os.Args[1:] 是使用者傳入的參數
	fmt.Println("程式名:", os.Args[0])
	fmt.Println("參數數量:", len(os.Args)-1)

	if len(os.Args) < 2 {
		fmt.Println("用法: program <名字>")
		os.Exit(1) // 以非零 exit code 退出
	}

	name := os.Args[1]
	fmt.Println("Hello,", name)
}
```

```bash
$ go run main.go Alice
程式名: /tmp/go-build/main
參數數量: 1
Hello, Alice
```

> **建議**：複雜的命令列參數解析請使用 `flag` 套件（見第 9 章）或第三方套件如 `cobra`，不要手動解析 `os.Args`。

### 4-3 文件操作

```go
package main

import (
	"fmt"
	"os"
)

func main() {
	// 寫入文件：os.Create 若文件存在則截斷
	f, err := os.Create("example.txt")
	if err != nil {
		fmt.Println("建立文件失敗:", err)
		return
	}
	defer f.Close() // 無論如何都要關閉文件

	_, err = f.WriteString("Hello, Go!\n第二行\n")
	if err != nil {
		fmt.Println("寫入失敗:", err)
		return
	}
	fmt.Println("寫入成功")

	// 讀取文件：os.ReadFile 最簡單（一次讀全部）
	data, err := os.ReadFile("example.txt")
	if err != nil {
		fmt.Println("讀取失敗:", err)
		return
	}
	fmt.Print(string(data))

	// os.Open：唯讀開啟（等同 OpenFile 的 O_RDONLY）
	f2, err := os.Open("example.txt")
	if err != nil {
		fmt.Println("開啟失敗:", err)
		return
	}
	defer f2.Close()

	// OpenFile：精細控制開啟模式
	// os.O_APPEND | os.O_WRONLY：附加模式寫入
	f3, err := os.OpenFile("example.txt", os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		fmt.Println("開啟失敗:", err)
		return
	}
	defer f3.Close()
	f3.WriteString("附加的第三行\n")

	// 刪除文件
	err = os.Remove("example.txt")
	if err != nil {
		fmt.Println("刪除失敗:", err)
	}
	fmt.Println("文件已刪除")

	// Rename：重新命名 / 移動文件
	// os.Rename("old.txt", "new.txt")

	// WriteFile：最簡單的寫入方式（一次寫入）
	err = os.WriteFile("quick.txt", []byte("快速寫入"), 0644)
	if err != nil {
		fmt.Println("WriteFile 失敗:", err)
	}
	defer os.Remove("quick.txt")
}
```

```text
輸出：
寫入成功
Hello, Go!
第二行
文件已刪除
```

> **警告**：`defer f.Close()` 必須緊接在 error 判斷之後。常見錯誤是在 `err != nil` 檢查之前就 `defer f.Close()`，這樣當 `f` 為 `nil` 時會 panic。正確順序是：呼叫 os.Open → 檢查 err → defer f.Close()。

### 4-4 目錄操作

```go
package main

import (
	"fmt"
	"os"
)

func main() {
	// Mkdir：建立單層目錄
	err := os.Mkdir("testdir", 0755)
	if err != nil {
		fmt.Println("Mkdir:", err)
	}

	// MkdirAll：建立多層目錄（類似 mkdir -p）
	err = os.MkdirAll("a/b/c", 0755)
	if err != nil {
		fmt.Println("MkdirAll:", err)
		return
	}
	fmt.Println("目錄建立成功")

	// ReadDir：列出目錄內容
	entries, err := os.ReadDir(".")
	if err != nil {
		fmt.Println("ReadDir:", err)
		return
	}
	for _, entry := range entries {
		if entry.IsDir() {
			fmt.Printf("[DIR]  %s\n", entry.Name())
		} else {
			info, _ := entry.Info()
			fmt.Printf("[FILE] %s (%d bytes)\n", entry.Name(), info.Size())
		}
	}

	// Stat：取得文件/目錄資訊
	info, err := os.Stat("a")
	if err != nil {
		fmt.Println("Stat:", err)
	} else {
		fmt.Println("Name:", info.Name())
		fmt.Println("IsDir:", info.IsDir())
		fmt.Println("ModTime:", info.ModTime().Format("2006-01-02"))
	}

	// Getwd：取得當前工作目錄
	wd, _ := os.Getwd()
	fmt.Println("工作目錄:", wd)

	// 清理
	os.RemoveAll("testdir")
	os.RemoveAll("a")
}
```

```text
輸出：
目錄建立成功
[DIR]  a
[DIR]  testdir
...
Name: a
IsDir: true
ModTime: 2026-06-01
工作目錄: /current/working/dir
```

### 4-5 程序控制

```go
package main

import (
	"fmt"
	"os"
)

func main() {
	// Getpid：取得當前程序 ID
	fmt.Println("PID:", os.Getpid())

	// Getppid：取得父程序 ID
	fmt.Println("PPID:", os.Getppid())

	// os.Exit(code)：立即終止程序
	// code=0：成功；code!=0：失敗
	// 注意：os.Exit 不會執行 defer！

	// 正常退出（通常不需要顯式呼叫）
	// os.Exit(0)

	// 錯誤退出
	// os.Exit(1)
	fmt.Println("程序正常結束")
}
```

```text
輸出：
PID: 12345
PPID: 12344
程序正常結束
```

> **警告**：`os.Exit()` 會**立即**終止程序，所有 `defer` 都不會執行。如果你的程序需要 defer 來做資源清理（關閉 DB、刷新 log），不要用 `os.Exit` 直接退出，應該讓 `main()` 函數自然返回。

### 4-6 錯誤判斷

```go
package main

import (
	"errors"
	"fmt"
	"os"
)

func main() {
	// 檢查文件是否存在的正確方式
	_, err := os.Stat("nonexistent.txt")
	if err != nil {
		// 舊寫法（Go 1.13 之前）
		if os.IsNotExist(err) {
			fmt.Println("文件不存在（舊寫法）")
		}

		// 新寫法（推薦，Go 1.13+）
		if errors.Is(err, os.ErrNotExist) {
			fmt.Println("文件不存在（新寫法）")
		}
	}

	// 其他常用的 os 錯誤
	// os.ErrExist：文件已存在
	// os.ErrPermission：沒有權限
	// os.ErrClosed：文件已關閉

	// 實用的「不存在才建立」模式
	_, err = os.Stat("myfile.txt")
	if errors.Is(err, os.ErrNotExist) {
		f, createErr := os.Create("myfile.txt")
		if createErr != nil {
			fmt.Println("建立失敗:", createErr)
			return
		}
		f.Close()
		fmt.Println("文件已建立")
	}
	defer os.Remove("myfile.txt")

	// 檢查是否有讀取權限
	f, err := os.Open("/root/secret.txt")
	if err != nil {
		if errors.Is(err, os.ErrPermission) {
			fmt.Println("沒有讀取權限")
		} else if errors.Is(err, os.ErrNotExist) {
			fmt.Println("文件不存在")
		} else {
			fmt.Println("其他錯誤:", err)
		}
		return
	}
	defer f.Close()
}
```

```text
輸出：
文件不存在（舊寫法）
文件不存在（新寫法）
文件已建立
文件不存在
```

> **建議**：優先使用 `errors.Is(err, os.ErrNotExist)` 而非 `os.IsNotExist(err)`。新的寫法支援 error wrapping，可以正確處理用 `fmt.Errorf("...: %w", err)` 包裝過的錯誤。

---

## 5. io 與 bufio 套件：I/O 操作

`io` 套件定義了 Go 最重要的兩個介面：`io.Reader` 和 `io.Writer`。`bufio` 套件在這兩個介面上加入緩衝層，提升大量小片段讀寫的效能。

### 5-1 io.Reader 與 io.Writer 介面

```go
package main

import (
	"fmt"
	"io"
	"strings"
)

// io.Reader 介面定義：
// type Reader interface {
//     Read(p []byte) (n int, err error)
// }

// io.Writer 介面定義：
// type Writer interface {
//     Write(p []byte) (n int, err error)
// }

// 自訂 Reader：轉換大寫的 Reader
type UpperReader struct {
	r io.Reader
}

func (u UpperReader) Read(p []byte) (int, error) {
	n, err := u.r.Read(p)
	for i := 0; i < n; i++ {
		if p[i] >= 'a' && p[i] <= 'z' {
			p[i] -= 32 // 轉大寫
		}
	}
	return n, err
}

func main() {
	// 使用自訂 Reader
	original := strings.NewReader("hello, world!")
	upper := UpperReader{r: original}

	result, err := io.ReadAll(upper)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println(string(result)) // HELLO, WORLD!

	// 許多標準庫函數都接受 io.Reader / io.Writer
	// os.File 實作了 io.Reader 和 io.Writer
	// strings.Reader 實作了 io.Reader
	// bytes.Buffer 實作了 io.Reader 和 io.Writer
	// net.Conn 實作了 io.Reader 和 io.Writer
	// http.ResponseWriter 實作了 io.Writer
}
```

```text
輸出：
HELLO, WORLD!
```

### 5-2 io.ReadAll：讀取全部內容

```go
package main

import (
	"fmt"
	"io"
	"strings"
)

func main() {
	r := strings.NewReader("這是一段測試文字，包含中文。")

	// io.ReadAll：一次讀取所有內容
	data, err := io.ReadAll(r)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println(string(data))
	fmt.Println("長度:", len(data), "bytes") // 中文每字 3 bytes

	// io.ReadAll 等同於：
	// var buf bytes.Buffer
	// _, err = io.Copy(&buf, r)
	// data = buf.Bytes()
}
```

```text
輸出：
這是一段測試文字，包含中文。
長度: 39 bytes
```

> **警告**：`io.ReadAll` 會將所有內容讀入記憶體。對於 HTTP response body 或大型文件，應考慮使用 `bufio.Scanner` 或 `io.Copy` 進行串流處理，避免記憶體耗盡。

### 5-3 io.Copy：串流複製

```go
package main

import (
	"fmt"
	"io"
	"os"
	"strings"
)

func main() {
	src := strings.NewReader("Hello, io.Copy!\n")

	// io.Copy(dst, src)：從 src 讀取並寫入 dst
	// 內部使用 32KB 緩衝，不會把所有內容放入記憶體
	n, err := io.Copy(os.Stdout, src)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Printf("複製了 %d bytes\n", n)

	// 實際用途：複製文件
	copyFile := func(dst, src string) error {
		srcFile, err := os.Open(src)
		if err != nil {
			return fmt.Errorf("open src: %w", err)
		}
		defer srcFile.Close()

		dstFile, err := os.Create(dst)
		if err != nil {
			return fmt.Errorf("create dst: %w", err)
		}
		defer dstFile.Close()

		_, err = io.Copy(dstFile, srcFile)
		return err
	}
	_ = copyFile // 避免 unused 警告

	// io.TeeReader：邊讀邊複製（類似 Unix tee）
	// 從 reader 讀取的同時，同步寫入 writer
	// tee := io.TeeReader(reader, writer)
}
```

```text
輸出：
Hello, io.Copy!
複製了 16 bytes
```

### 5-4 bufio.Scanner：逐行讀取文件

`bufio.Scanner` 是逐行讀取大型文件最推薦的方式，記憶體佔用低，不需要一次載入全部內容。

```go
package main

import (
	"bufio"
	"fmt"
	"strings"
)

func main() {
	// 模擬一個多行輸入
	input := `第一行
第二行
第三行
空白行後有內容

第五行（前面有空行）`

	r := strings.NewReader(input)
	scanner := bufio.NewScanner(r)

	lineNum := 0
	for scanner.Scan() {
		lineNum++
		line := scanner.Text() // 取得當前行（不含換行符）
		fmt.Printf("%d: %s\n", lineNum, line)
	}

	// 掃描結束後必須檢查 Err()（不包含 io.EOF）
	if err := scanner.Err(); err != nil {
		fmt.Println("Scanner error:", err)
	}

	fmt.Printf("共 %d 行\n", lineNum)

	// 處理超長行：預設 bufio.MaxScanTokenSize = 64KB
	// 若行長度超過限制，需要自訂 buffer
	scanner2 := bufio.NewScanner(strings.NewReader("short line"))
	buf := make([]byte, 0, 64*1024)
	scanner2.Buffer(buf, 1024*1024) // 最大允許 1MB 的行
	for scanner2.Scan() {
		fmt.Println(scanner2.Text())
	}
}
```

```text
輸出：
1: 第一行
2: 第二行
3: 第三行
4: 空白行後有內容
5: 
6: 第五行（前面有空行）
共 6 行
short line
```

> **建議**：讀取大型 CSV、Log 文件時，永遠用 `bufio.Scanner` 而非 `io.ReadAll`。`io.ReadAll` 會把整個文件載入記憶體，1GB 的文件就需要 1GB 以上的記憶體。

### 5-5 bufio.Reader / bufio.Writer：緩衝 I/O

```go
package main

import (
	"bufio"
	"fmt"
	"strings"
)

func main() {
	// bufio.Reader：加入緩衝層，減少系統呼叫次數
	input := "Hello\nWorld\nGo\n"
	r := bufio.NewReader(strings.NewReader(input))

	// ReadString：讀取到分隔符為止（含分隔符）
	for {
		line, err := r.ReadString('\n')
		if len(line) > 0 {
			fmt.Printf("%q\n", line) // 包含 \n
		}
		if err != nil {
			break // io.EOF 或其他錯誤
		}
	}

	// Peek：預覽接下來的 N bytes（不消耗）
	r2 := bufio.NewReader(strings.NewReader("Hello, World"))
	peeked, _ := r2.Peek(5)
	fmt.Println(string(peeked)) // Hello

	// 讀取後 Peek 的內容依然存在
	buf := make([]byte, 5)
	r2.Read(buf)
	fmt.Println(string(buf)) // Hello
}
```

```text
輸出：
"Hello\n"
"World\n"
"Go\n"
Hello
Hello
```

### 5-6 完整範例：讀取大型 CSV 文件

```go
package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

// 模擬讀取 CSV，記憶體友善版本
func processCSV(filename string) error {
	f, err := os.Open(filename)
	if err != nil {
		return fmt.Errorf("open file: %w", err)
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)

	// 讀取標題行
	if !scanner.Scan() {
		if err := scanner.Err(); err != nil {
			return fmt.Errorf("read header: %w", err)
		}
		return fmt.Errorf("empty file")
	}
	headers := strings.Split(scanner.Text(), ",")
	fmt.Println("欄位:", headers)

	// 逐行處理資料
	rowCount := 0
	for scanner.Scan() {
		rowCount++
		fields := strings.Split(scanner.Text(), ",")
		// 處理每一行...
		_ = fields
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("scan error: %w", err)
	}

	fmt.Printf("處理了 %d 行資料\n", rowCount)
	return nil
}

func main() {
	// 建立測試 CSV
	content := "name,age,email\nAlice,30,alice@example.com\nBob,25,bob@example.com\n"
	err := os.WriteFile("test.csv", []byte(content), 0644)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	defer os.Remove("test.csv")

	if err := processCSV("test.csv"); err != nil {
		fmt.Println("Error:", err)
	}
}
```

```text
輸出：
欄位: [name age email]
處理了 2 行資料
```

---

## 6. fmt 套件：格式化輸出

`fmt` 套件提供格式化輸入輸出功能，是 Go 中最常用的套件之一。

### 6-1 Print / Println / Printf 差異

```go
package main

import "fmt"

func main() {
	// Print：直接輸出，相鄰非字串間加空格，無換行
	fmt.Print("Hello")
	fmt.Print("World")
	fmt.Print("\n") // 手動換行
	// 輸出：HelloWorld

	fmt.Print(1, 2, 3)
	fmt.Print("\n")
	// 輸出：1 2 3（數字間有空格）

	// Println：每個參數間加空格，結尾自動換行
	fmt.Println("Hello", "World")
	// 輸出：Hello World

	fmt.Println(1, 2, 3)
	// 輸出：1 2 3

	// Printf：格式化輸出，無自動換行
	name := "Alice"
	age := 30
	fmt.Printf("姓名：%s，年齡：%d\n", name, age)
	// 輸出：姓名：Alice，年齡：30
}
```

```text
輸出：
HelloWorld
1 2 3
Hello World
1 2 3
姓名：Alice，年齡：30
```

### 6-2 Sprintf / Fprintf / Errorf

```go
package main

import (
	"fmt"
	"os"
)

func main() {
	// Sprintf：格式化並回傳字串（不輸出）
	msg := fmt.Sprintf("Hello, %s! You are %d years old.", "Alice", 30)
	fmt.Println(msg)

	// Fprintf：格式化並寫入 io.Writer
	fmt.Fprintf(os.Stderr, "Error: %s\n", "something went wrong")
	fmt.Fprintf(os.Stdout, "Status: %d\n", 200)

	// Errorf：建立帶格式的 error
	userID := 42
	err := fmt.Errorf("user %d not found", userID)
	fmt.Println(err)

	// Errorf + %w：包裝 error（保留原始錯誤鏈）
	original := fmt.Errorf("database connection failed")
	wrapped := fmt.Errorf("getUserByID: %w", original)
	fmt.Println(wrapped)

	// Sscanf：從字串解析（見 6-5）
}
```

```text
輸出：
Hello, Alice! You are 30 years old.
Status: 200
user 42 not found
getUserByID: database connection failed
（Stderr 輸出：Error: something went wrong）
```

### 6-3 格式化動詞一覽

| 動詞 | 說明 | 範例輸入 | 輸出 |
| :--- | :--- | :--- | :--- |
| `%v` | 預設格式 | `{1 Alice}` | `{1 Alice}` |
| `%+v` | 包含欄位名稱 | `{ID:1 Name:Alice}` | `{ID:1 Name:Alice}` |
| `%#v` | Go 語法格式 | `main.User{ID:1, Name:"Alice"}` | Go 語法 |
| `%T` | 型別名稱 | `int`, `main.User` | 型別字串 |
| `%d` | 十進位整數 | `42` | `42` |
| `%b` | 二進位 | `42` | `101010` |
| `%o` | 八進位 | `42` | `52` |
| `%x` | 十六進位（小寫） | `255` | `ff` |
| `%X` | 十六進位（大寫） | `255` | `FF` |
| `%f` | 小數點浮點數 | `3.14` | `3.140000` |
| `%e` | 科學記號 | `3.14` | `3.140000e+00` |
| `%s` | 字串 | `"hello"` | `hello` |
| `%q` | 帶引號字串 | `"hello"` | `"hello"` |
| `%p` | 指標位址 | `&x` | `0xc000...` |
| `%t` | 布林值 | `true` | `true` |
| `%c` | Unicode 字元 | `65` | `A` |

```go
package main

import "fmt"

type User struct {
	ID   int
	Name string
}

func main() {
	u := User{ID: 1, Name: "Alice"}

	fmt.Printf("%v\n", u)   // {1 Alice}
	fmt.Printf("%+v\n", u)  // {ID:1 Name:Alice}
	fmt.Printf("%#v\n", u)  // main.User{ID:1, Name:"Alice"}
	fmt.Printf("%T\n", u)   // main.User

	// 寬度與精度
	fmt.Printf("|%10d|\n", 42)    // |        42| 右對齊，寬度 10
	fmt.Printf("|%-10d|\n", 42)   // |42        | 左對齊
	fmt.Printf("|%010d|\n", 42)   // |0000000042| 補零
	fmt.Printf("|%.2f|\n", 3.14159) // |3.14|     小數點後 2 位
	fmt.Printf("|%8.2f|\n", 3.14)  // |    3.14|  寬度 8，小數後 2 位

	// %q 對 debug 很有用：可以看出空格和特殊字元
	s := "hello\nworld"
	fmt.Printf("%s\n", s) // 輸出兩行
	fmt.Printf("%q\n", s) // "hello\nworld"（顯示跳脫字元）
}
```

```text
輸出：
{1 Alice}
{ID:1 Name:Alice}
main.User{ID:1, Name:"Alice"}
main.User
|        42|
|42        |
|0000000042|
|3.14|
|    3.14|
hello
world
"hello\nworld"
```

### 6-4 fmt.Stringer 介面

實作 `fmt.Stringer` 介面可以自訂型別的 `%v` 輸出格式，讓 debug 更方便。

```go
package main

import "fmt"

type Direction int

const (
	North Direction = iota
	South
	East
	West
)

// 實作 fmt.Stringer 介面
func (d Direction) String() string {
	switch d {
	case North:
		return "北"
	case South:
		return "南"
	case East:
		return "東"
	case West:
		return "西"
	default:
		return fmt.Sprintf("Direction(%d)", int(d))
	}
}

type Point struct {
	X, Y float64
}

func (p Point) String() string {
	return fmt.Sprintf("(%.1f, %.1f)", p.X, p.Y)
}

func main() {
	d := North
	fmt.Println(d)           // 北（呼叫 String()）
	fmt.Printf("%v\n", d)   // 北
	fmt.Printf("%s\n", d)   // 北
	fmt.Printf("%d\n", d)   // 0（%d 使用整數值，忽略 String()）

	p := Point{3.5, 4.2}
	fmt.Println(p)  // (3.5, 4.2)

	// fmt.Errorf 也可以接受實作 error 介面的自訂型別
}
```

```text
輸出：
北
北
北
0
(3.5, 4.2)
```

### 6-5 fmt.Sscanf：從字串解析

```go
package main

import "fmt"

func main() {
	// Sscanf：從字串按格式解析值
	var name string
	var age int
	var score float64

	n, err := fmt.Sscanf("Alice 30 98.5", "%s %d %f", &name, &age, &score)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Printf("解析了 %d 個值\n", n)
	fmt.Printf("姓名：%s，年齡：%d，分數：%.1f\n", name, age, score)

	// Sscan（無格式，以空白分隔）
	var a, b, c int
	fmt.Sscan("1 2 3", &a, &b, &c)
	fmt.Println(a, b, c) // 1 2 3

	// 解析日期格式
	var year, month, day int
	fmt.Sscanf("2026-06-01", "%d-%d-%d", &year, &month, &day)
	fmt.Printf("年:%d 月:%d 日:%d\n", year, month, day)
}
```

```text
輸出：
解析了 3 個值
姓名：Alice，年齡：30，分數：98.5
1 2 3
年:2026 月:6 日:1
```

---

## 7. regexp 套件：正規表達式

`regexp` 套件使用 RE2 語法，保證線性時間複雜度，不會有回溯攻擊（ReDoS）問題。

### 7-1 編譯正則：Compile vs MustCompile

```go
package main

import (
	"fmt"
	"regexp"
)

// 全域正則：用 MustCompile（程式啟動時就知道是否有問題）
var emailRegexp = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

func main() {
	// Compile：回傳 error，適合動態建立的正則（如來自使用者輸入）
	pattern := `\d+`
	re, err := regexp.Compile(pattern)
	if err != nil {
		fmt.Println("正則語法錯誤:", err)
		return
	}
	fmt.Println(re.MatchString("abc123")) // true

	// MustCompile：若正則語法錯誤則 panic
	// 只用於：程式碼中寫死的正則（package-level 變數、init 函數）
	re2 := regexp.MustCompile(`[a-z]+`)
	fmt.Println(re2.MatchString("hello")) // true
}
```

```text
輸出：
true
true
```

> **警告**：`MustCompile` 如果正則語法有誤會 panic，因此只適合用於全域變數或 `init()` 中的固定字串正則。如果正則來自使用者輸入或設定檔，必須使用 `Compile` 並處理 error。

> **建議**：正規表達式的編譯（`Compile`）有一定成本，**不要在迴圈內反覆編譯相同的正則**。應在函數外定義為 package-level 變數，或使用 `sync.Once` 延遲初始化。

### 7-2 MatchString、FindString、FindAllString

```go
package main

import (
	"fmt"
	"regexp"
)

func main() {
	re := regexp.MustCompile(`\b\d+\b`)
	text := "I have 3 cats and 12 dogs, total 15 animals."

	// MatchString：只判斷是否匹配（最快）
	fmt.Println(re.MatchString(text))   // true
	fmt.Println(re.MatchString("hello")) // false

	// FindString：找第一個匹配
	fmt.Println(re.FindString(text)) // 3

	// FindAllString：找所有匹配，n=-1 代表全部
	all := re.FindAllString(text, -1)
	fmt.Println(all) // [3 12 15]

	// FindAllString(s, 2)：最多找 2 個
	first2 := re.FindAllString(text, 2)
	fmt.Println(first2) // [3 12]

	// FindStringIndex：回傳匹配位置 [start, end]
	idx := re.FindStringIndex(text)
	fmt.Println(idx)             // [7 8]（"3" 的位置）
	fmt.Println(text[idx[0]:idx[1]]) // 3
}
```

```text
輸出：
true
false
3
[3 12 15]
[3 12]
[7 8]
3
```

### 7-3 FindStringSubmatch：擷取捕獲群組

```go
package main

import (
	"fmt"
	"regexp"
)

func main() {
	// 捕獲群組用 () 標記
	re := regexp.MustCompile(`(\d{4})-(\d{2})-(\d{2})`)
	text := "今天是 2026-06-01，明天是 2026-06-02。"

	// FindStringSubmatch：回傳 [完整匹配, 群組1, 群組2, 群組3]
	match := re.FindStringSubmatch(text)
	if match != nil {
		fmt.Println("完整匹配:", match[0]) // 2026-06-01
		fmt.Println("年:", match[1])      // 2026
		fmt.Println("月:", match[2])      // 06
		fmt.Println("日:", match[3])      // 01
	}

	// FindAllStringSubmatch：找所有匹配的群組
	allMatches := re.FindAllStringSubmatch(text, -1)
	for _, m := range allMatches {
		fmt.Printf("日期：%s，年=%s 月=%s 日=%s\n", m[0], m[1], m[2], m[3])
	}

	// 使用具名捕獲群組 (?P<name>pattern)
	re2 := regexp.MustCompile(`(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})`)
	m2 := re2.FindStringSubmatch("2026-06-01")
	// 取得群組名稱
	for i, name := range re2.SubexpNames() {
		if i != 0 && name != "" {
			fmt.Printf("%s = %s\n", name, m2[i])
		}
	}
}
```

```text
輸出：
完整匹配: 2026-06-01
年: 2026
月: 06
日: 01
日期：2026-06-01，年=2026 月=06 日=01
日期：2026-06-02，年=2026 月=06 日=02
year = 2026
month = 06
day = 01
```

### 7-4 ReplaceAllString

```go
package main

import (
	"fmt"
	"regexp"
	"strings"
)

func main() {
	// ReplaceAllString：替換所有匹配
	re := regexp.MustCompile(`\d+`)
	result := re.ReplaceAllString("I have 3 cats and 12 dogs", "N")
	fmt.Println(result) // I have N cats and N dogs

	// ReplaceAllString 支援引用捕獲群組：$1、$2...
	re2 := regexp.MustCompile(`(\w+)@(\w+)\.(\w+)`)
	masked := re2.ReplaceAllString(
		"Contact: alice@example.com or bob@test.org",
		"$1@[hidden]",
	)
	fmt.Println(masked) // Contact: alice@[hidden] or bob@[hidden]

	// ReplaceAllStringFunc：用函數決定替換結果
	re3 := regexp.MustCompile(`\b\w+\b`)
	upper := re3.ReplaceAllStringFunc("hello world go", strings.ToUpper)
	fmt.Println(upper) // HELLO WORLD GO
}
```

```text
輸出：
I have N cats and N dogs
Contact: alice@[hidden] or bob@[hidden]
HELLO WORLD GO
```

### 7-5 常見 Pattern 範例

```go
package main

import (
	"fmt"
	"regexp"
)

var (
	// Email 基本驗證（生產環境建議更嚴格）
	emailRe = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

	// 台灣手機號碼（09xxxxxxxx）
	phoneRe = regexp.MustCompile(`^09\d{8}$`)

	// URL（簡化版）
	urlRe = regexp.MustCompile(`^https?://[^\s/$.?#].[^\s]*$`)

	// 純數字
	digitsOnlyRe = regexp.MustCompile(`^\d+$`)

	// IPv4
	ipv4Re = regexp.MustCompile(`^(\d{1,3}\.){3}\d{1,3}$`)
)

func main() {
	tests := []struct {
		pattern string
		re      *regexp.Regexp
		cases   []string
	}{
		{"Email", emailRe, []string{"alice@example.com", "invalid@", "a@b.c"}},
		{"手機", phoneRe, []string{"0912345678", "09123456", "0812345678"}},
		{"URL", urlRe, []string{"https://go.dev", "http://example.com/path", "ftp://bad"}},
	}

	for _, t := range tests {
		fmt.Printf("\n=== %s ===\n", t.pattern)
		for _, c := range t.cases {
			fmt.Printf("  %s → %v\n", c, t.re.MatchString(c))
		}
	}
}
```

```text
輸出：

=== Email ===
  alice@example.com → true
  invalid@ → false
  a@b.c → true

=== 手機 ===
  0912345678 → true
  09123456 → false
  0812345678 → false

=== URL ===
  https://go.dev → true
  http://example.com/path → true
  ftp://bad → false
```

---

## 8. sort 與 slices 套件：排序

Go 提供 `sort` 套件（所有版本）和 `slices` 套件（Go 1.21+）進行排序操作。

### 8-1 sort.Slice：自訂排序

```go
package main

import (
	"fmt"
	"sort"
)

func main() {
	// 基本型別排序
	nums := []int{5, 2, 8, 1, 9, 3}
	sort.Ints(nums)
	fmt.Println(nums) // [1 2 3 5 8 9]

	strs := []string{"banana", "apple", "cherry"}
	sort.Strings(strs)
	fmt.Println(strs) // [apple banana cherry]

	// sort.Slice：自訂排序條件
	data := []int{5, 2, 8, 1, 9, 3}
	sort.Slice(data, func(i, j int) bool {
		return data[i] > data[j] // 降序
	})
	fmt.Println(data) // [9 8 5 3 2 1]

	// 檢查是否已排序
	fmt.Println(sort.IntsAreSorted([]int{1, 2, 3})) // true
	fmt.Println(sort.IntsAreSorted([]int{3, 2, 1})) // false

	// sort.SliceStable：穩定排序（相等元素保持原有順序）
	type Item struct {
		Name  string
		Score int
	}
	items := []Item{
		{"C", 80}, {"A", 90}, {"B", 80}, {"D", 90},
	}
	sort.SliceStable(items, func(i, j int) bool {
		return items[i].Score > items[j].Score
	})
	fmt.Println(items) // [{A 90} {D 90} {C 80} {B 80}]（相同分數保持原順序）
}
```

```text
輸出：
[1 2 3 5 8 9]
[apple banana cherry]
[9 8 5 3 2 1]
true
false
[{A 90} {D 90} {C 80} {B 80}]
```

### 8-2 slices.SortFunc：型別安全排序（Go 1.21+）

```go
package main

import (
	"cmp"
	"fmt"
	"slices"
)

func main() {
	// slices.Sort：泛型版本，型別安全
	nums := []int{5, 2, 8, 1, 9, 3}
	slices.Sort(nums)
	fmt.Println(nums) // [1 2 3 5 8 9]

	// slices.SortFunc：自訂比較函數（cmp < 0 表示 a 在 b 前面）
	strs := []string{"banana", "apple", "cherry"}
	slices.SortFunc(strs, func(a, b string) int {
		return cmp.Compare(a, b) // cmp.Compare 是 Go 1.21+ 的泛型比較
	})
	fmt.Println(strs) // [apple banana cherry]

	// 降序
	slices.SortFunc(nums, func(a, b int) int {
		return cmp.Compare(b, a) // 交換 a, b 順序即為降序
	})
	fmt.Println(nums) // [9 8 5 3 2 1]

	// slices.Contains：檢查是否包含元素（Go 1.21+）
	sorted := []int{1, 2, 3, 5, 8, 9}
	fmt.Println(slices.Contains(sorted, 5)) // true
	fmt.Println(slices.Contains(sorted, 7)) // false

	// slices.Index：找元素位置
	fmt.Println(slices.Index(sorted, 5)) // 3
}
```

```text
輸出：
[1 2 3 5 8 9]
[apple banana cherry]
[9 8 5 3 2 1]
true
false
3
```

### 8-3 sort.Search：二分搜尋

```go
package main

import (
	"fmt"
	"sort"
)

func main() {
	// sort.Search(n, f)：在 [0, n) 中找最小的 i 使得 f(i) == true
	// 前提：f 必須在某個 i 之後都為 true（單調遞增）
	sorted := []int{1, 3, 5, 7, 9, 11, 13}
	target := 7

	idx := sort.Search(len(sorted), func(i int) bool {
		return sorted[i] >= target
	})

	if idx < len(sorted) && sorted[idx] == target {
		fmt.Printf("找到 %d，位於索引 %d\n", target, idx)
	} else {
		fmt.Printf("找不到 %d\n", target)
	}

	// 找插入位置
	insertVal := 6
	insertIdx := sort.Search(len(sorted), func(i int) bool {
		return sorted[i] >= insertVal
	})
	fmt.Printf("%d 應插入在索引 %d\n", insertVal, insertIdx) // 3（5 和 7 之間）
}
```

```text
輸出：
找到 7，位於索引 3
6 應插入在索引 3
```

### 8-4 排序 struct slice 實例

```go
package main

import (
	"fmt"
	"sort"
)

type Student struct {
	Name  string
	Grade int
	Age   int
}

func main() {
	students := []Student{
		{"Alice", 90, 20},
		{"Bob", 85, 22},
		{"Carol", 90, 19},
		{"Dave", 85, 21},
	}

	// 多條件排序：先按成績降序，成績相同按年齡升序
	sort.SliceStable(students, func(i, j int) bool {
		if students[i].Grade != students[j].Grade {
			return students[i].Grade > students[j].Grade // 成績降序
		}
		return students[i].Age < students[j].Age // 年齡升序
	})

	fmt.Println("排序結果：")
	for _, s := range students {
		fmt.Printf("  %s：成績 %d，年齡 %d\n", s.Name, s.Grade, s.Age)
	}
}
```

```text
輸出：
排序結果：
  Carol：成績 90，年齡 19
  Alice：成績 90，年齡 20
  Dave：成績 85，年齡 21
  Bob：成績 85，年齡 22
```

---

## 9. flag 套件：命令列參數

`flag` 套件提供命令列參數解析功能，適合中小型 CLI 工具。大型多子命令工具建議使用 `cobra` 等第三方套件。

### 9-1 定義 flag

```go
package main

import (
	"flag"
	"fmt"
	"time"
)

func main() {
	// 方式一：回傳指標
	host := flag.String("host", "localhost", "伺服器主機名稱")
	port := flag.Int("port", 8080, "伺服器埠號")
	verbose := flag.Bool("verbose", false, "是否顯示詳細輸出")
	timeout := flag.Duration("timeout", 30*time.Second, "連線超時時間")

	// 方式二：綁定到現有變數
	var outputFile string
	flag.StringVar(&outputFile, "output", "result.txt", "輸出文件路徑")

	// 解析命令列參數
	flag.Parse()

	// 使用解析後的值（注意需要解引用指標）
	fmt.Printf("Host: %s\n", *host)
	fmt.Printf("Port: %d\n", *port)
	fmt.Printf("Verbose: %v\n", *verbose)
	fmt.Printf("Timeout: %v\n", *timeout)
	fmt.Printf("Output: %s\n", outputFile)

	// flag.Args()：回傳非 flag 的剩餘參數
	fmt.Printf("其他參數: %v\n", flag.Args())
}
```

```bash
$ go run main.go -host example.com -port 9090 -verbose file1.txt file2.txt
Host: example.com
Port: 9090
Verbose: true
Timeout: 30s
Output: result.txt
其他參數: [file1.txt file2.txt]
```

### 9-2 flag.Parse() 與讀取值

```go
package main

import (
	"flag"
	"fmt"
	"os"
)

func main() {
	debug := flag.Bool("debug", false, "開啟除錯模式")
	count := flag.Int("count", 1, "執行次數")
	flag.Parse()

	// 必須在 Parse() 之後才能讀取值
	if *debug {
		fmt.Println("[DEBUG] 除錯模式已開啟")
	}

	for i := 0; i < *count; i++ {
		fmt.Printf("執行第 %d 次\n", i+1)
	}

	// 非法 flag 的行為：預設印出 usage 並以 exit code 2 退出
	// 可以用 flag.ContinueOnError 改變行為：
	fs := flag.NewFlagSet("custom", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	name := fs.String("name", "", "姓名")
	err := fs.Parse(os.Args[1:])
	if err != nil {
		fmt.Println("解析失敗:", err)
		return
	}
	if *name != "" {
		fmt.Println("名字:", *name)
	}
}
```

### 9-3 自訂 Usage 說明

```go
package main

import (
	"flag"
	"fmt"
	"os"
)

func main() {
	// 自訂 Usage 函數
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "用法：%s [選項] <輸入文件>\n\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "選項：\n")
		flag.PrintDefaults()
		fmt.Fprintf(os.Stderr, "\n範例：\n")
		fmt.Fprintf(os.Stderr, "  %s -port 9090 -verbose input.txt\n", os.Args[0])
	}

	port := flag.Int("port", 8080, "監聽埠號")
	verbose := flag.Bool("verbose", false, "詳細輸出")
	flag.Parse()

	fmt.Printf("Port: %d, Verbose: %v\n", *port, *verbose)
}
```

```bash
$ go run main.go -help
用法：/tmp/main [選項] <輸入文件>

選項：
  -port int
        監聽埠號 (default 8080)
  -verbose
        詳細輸出

範例：
  /tmp/main -port 9090 -verbose input.txt
```

### 9-4 子命令模式

```go
package main

import (
	"flag"
	"fmt"
	"os"
)

func runAdd(args []string) {
	fs := flag.NewFlagSet("add", flag.ExitOnError)
	name := fs.String("name", "", "要新增的名稱（必填）")
	fs.Parse(args)

	if *name == "" {
		fmt.Fprintln(os.Stderr, "錯誤：-name 為必填參數")
		fs.Usage()
		os.Exit(1)
	}
	fmt.Println("新增:", *name)
}

func runList(args []string) {
	fs := flag.NewFlagSet("list", flag.ExitOnError)
	limit := fs.Int("limit", 10, "顯示筆數")
	fs.Parse(args)

	fmt.Printf("列出前 %d 筆資料\n", *limit)
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "用法：program <命令> [選項]")
		fmt.Fprintln(os.Stderr, "命令：add、list")
		os.Exit(1)
	}

	switch os.Args[1] {
	case "add":
		runAdd(os.Args[2:])
	case "list":
		runList(os.Args[2:])
	default:
		fmt.Fprintf(os.Stderr, "未知命令：%s\n", os.Args[1])
		os.Exit(1)
	}
}
```

```bash
$ go run main.go add -name Alice
新增: Alice

$ go run main.go list -limit 5
列出前 5 筆資料
```

---

## 10. log 與 log/slog 套件：日誌

Go 提供兩個日誌套件：`log`（簡單，所有版本）和 `log/slog`（結構化，Go 1.21+）。現代 Go 專案推薦使用 `log/slog`。

### 10-1 log 套件基礎

```go
package main

import (
	"log"
	"os"
)

func main() {
	// 預設 logger 輸出到 Stderr，包含日期與時間前綴
	log.Println("這是一條普通日誌")
	log.Printf("格式化：%s=%d\n", "count", 42)

	// Fatal：輸出後呼叫 os.Exit(1)
	// log.Fatal("致命錯誤，程序終止")

	// Panic：輸出後呼叫 panic
	// log.Panic("這會觸發 panic")

	// 自訂 logger
	logger := log.New(
		os.Stdout,
		"[APP] ",                          // 前綴
		log.Ldate|log.Ltime|log.Lshortfile, // 旗標
	)
	logger.Println("自訂 logger 的輸出")

	// 常用旗標：
	// log.Ldate      - 日期 2009/01/23
	// log.Ltime      - 時間 01:23:23
	// log.Lmicroseconds - 微秒精度
	// log.Llongfile  - 完整文件路徑和行號
	// log.Lshortfile - 短文件名和行號
	// log.LUTC       - 使用 UTC 時間

	// 設定全域 logger 的輸出位置
	logFile, err := os.Create("app.log")
	if err != nil {
		log.Fatal("無法建立 log 文件:", err)
	}
	defer logFile.Close()
	defer os.Remove("app.log")

	log.SetOutput(logFile)
	log.Println("這條日誌寫入文件")
}
```

```text
輸出（範例）：
2026/06/01 14:30:00 這是一條普通日誌
2026/06/01 14:30:00 格式化：count=42
[APP] 2026/06/01 14:30:00 main.go:20: 自訂 logger 的輸出
```

### 10-2 log/slog：結構化日誌

`log/slog` 是 Go 1.21 引入的結構化日誌套件，輸出的日誌帶有固定 key-value 欄位，方便機器解析。

```go
package main

import (
	"log/slog"
	"os"
)

func main() {
	// 預設 logger：輸出文字格式到 Stderr
	slog.Info("伺服器啟動", "port", 8080, "env", "production")
	slog.Warn("記憶體使用率偏高", "usage", 85.5, "threshold", 80.0)
	slog.Error("資料庫連線失敗", "host", "db.example.com", "error", "connection refused")

	// 使用 slog.Attr 明確指定型別
	slog.Info("用戶登入",
		slog.String("user", "alice"),
		slog.Int("userID", 42),
		slog.Bool("mfa_enabled", true),
	)

	// 建立 JSON logger
	jsonLogger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	jsonLogger.Info("JSON 格式日誌", "key", "value")

	// 建立文字格式 logger
	textLogger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	textLogger.Info("文字格式日誌", "key", "value")

	// 設定為全域預設 logger
	slog.SetDefault(jsonLogger)
	slog.Info("現在使用 JSON 格式", "version", "1.0")
}
```

```text
輸出（範例）：
2026/06/01 14:30:00 INFO 伺服器啟動 port=8080 env=production
2026/06/01 14:30:00 WARN 記憶體使用率偏高 usage=85.5 threshold=80
2026/06/01 14:30:00 ERROR 資料庫連線失敗 host=db.example.com error="connection refused"
2026/06/01 14:30:00 INFO 用戶登入 user=alice userID=42 mfa_enabled=true
{"time":"2026-06-01T14:30:00Z","level":"INFO","msg":"JSON 格式日誌","key":"value"}
time=2026-06-01T14:30:00Z level=INFO msg="文字格式日誌" key=value
{"time":"2026-06-01T14:30:00Z","level":"INFO","msg":"現在使用 JSON 格式","version":"1.0"}
```

### 10-3 slog 的 Level

```go
package main

import (
	"log/slog"
	"os"
)

func main() {
	// 設定最低輸出等級（低於此等級的日誌不會輸出）
	opts := &slog.HandlerOptions{
		Level: slog.LevelWarn, // 只輸出 Warn 以上
	}
	logger := slog.New(slog.NewTextHandler(os.Stdout, opts))

	logger.Debug("這條不會出現")  // 低於 Warn
	logger.Info("這條不會出現")   // 低於 Warn
	logger.Warn("這條會出現")    // 等於 Warn
	logger.Error("這條會出現")   // 高於 Warn

	// 等級對應數值
	// slog.LevelDebug = -4
	// slog.LevelInfo  =  0
	// slog.LevelWarn  =  4
	// slog.LevelError =  8

	// 動態調整等級
	var level slog.LevelVar // 預設 Info
	level.Set(slog.LevelDebug)

	dynamicOpts := &slog.HandlerOptions{Level: &level}
	dynamicLogger := slog.New(slog.NewTextHandler(os.Stdout, dynamicOpts))
	dynamicLogger.Debug("現在 Debug 也會出現")

	level.Set(slog.LevelError)
	dynamicLogger.Info("這條現在不會出現了")
	dynamicLogger.Error("只有 Error 會出現")
}
```

```text
輸出：
time=... level=WARN msg="這條會出現"
time=... level=ERROR msg="這條會出現"
time=... level=DEBUG msg="現在 Debug 也會出現"
time=... level=ERROR msg="只有 Error 會出現"
```

### 10-4 自訂 Handler（JSON 格式輸出）

```go
package main

import (
	"log/slog"
	"os"
)

func main() {
	// JSON Handler：適合生產環境，方便 ELK / Loki 等日誌收集系統解析
	jsonHandler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level:     slog.LevelInfo,
		AddSource: true, // 加入原始碼位置（文件名 + 行號）
	})
	logger := slog.New(jsonHandler)

	logger.Info("應用程式啟動",
		slog.String("version", "1.2.3"),
		slog.String("env", "production"),
	)

	// Group：將相關欄位分組
	logger.Info("HTTP 請求",
		slog.Group("request",
			slog.String("method", "POST"),
			slog.String("path", "/api/users"),
			slog.Int("status", 201),
		),
	)
}
```

```text
輸出（格式化後）：
{
  "time": "2026-06-01T14:30:00Z",
  "level": "INFO",
  "source": {"function": "main.main", "file": "main.go", "line": 16},
  "msg": "應用程式啟動",
  "version": "1.2.3",
  "env": "production"
}
{
  "time": "2026-06-01T14:30:00Z",
  "level": "INFO",
  "msg": "HTTP 請求",
  "request": {"method": "POST", "path": "/api/users", "status": 201}
}
```

### 10-5 加入 context 追蹤

```go
package main

import (
	"context"
	"log/slog"
	"os"
)

// 在 context 中加入追蹤 ID
type contextKey string

const traceIDKey contextKey = "traceID"

func withTraceID(ctx context.Context, traceID string) context.Context {
	return context.WithValue(ctx, traceIDKey, traceID)
}

func processRequest(ctx context.Context, logger *slog.Logger) {
	// slog.With：建立帶有固定欄位的子 logger
	traceID, _ := ctx.Value(traceIDKey).(string)
	reqLogger := logger.With(
		slog.String("traceID", traceID),
		slog.String("service", "user-service"),
	)

	reqLogger.Info("開始處理請求")
	reqLogger.Info("查詢資料庫")
	reqLogger.Info("請求完成", slog.Int("statusCode", 200))
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	ctx := withTraceID(context.Background(), "abc-123-xyz")
	processRequest(ctx, logger)
}
```

```text
輸出（格式化後）：
{"time":"...","level":"INFO","msg":"開始處理請求","traceID":"abc-123-xyz","service":"user-service"}
{"time":"...","level":"INFO","msg":"查詢資料庫","traceID":"abc-123-xyz","service":"user-service"}
{"time":"...","level":"INFO","msg":"請求完成","traceID":"abc-123-xyz","service":"user-service","statusCode":200}
```

> **建議**：現代 Go 專案推薦使用 `log/slog` 取代 `log` 套件。`slog` 的結構化日誌方便與日誌收集系統（ELK、Loki、CloudWatch）整合，且效能更好。使用 `slog.With` 預先綁定 traceID、userID 等欄位，可以讓同一個請求的所有日誌自動帶上這些資訊。

---

## 11. 總結速查表

| 套件 | 核心功能 | 最常用函數 / 型別 |
| :--- | :--- | :--- |
| `strings` | 字串操作 | `Contains`, `Split`, `TrimSpace`, `ReplaceAll`, `Builder`, `Join` |
| `strconv` | 型別轉換 | `Itoa`, `Atoi`, `ParseFloat`, `FormatFloat`, `ParseInt` |
| `time` | 時間操作 | `Now`, `Parse`, `Format`, `Since`, `Until`, `Duration`, `Ticker` |
| `os` | 作業系統 | `Getenv`, `ReadFile`, `WriteFile`, `Open`, `Create`, `ReadDir` |
| `io` | I/O 介面 | `Reader`, `Writer`, `ReadAll`, `Copy`, `TeeReader` |
| `bufio` | 緩衝 I/O | `Scanner`, `NewReader`, `NewWriter` |
| `fmt` | 格式化 | `Printf`, `Sprintf`, `Fprintf`, `Errorf`, `Stringer` |
| `regexp` | 正規表達式 | `MustCompile`, `MatchString`, `FindAllString`, `ReplaceAllString` |
| `sort` | 排序 | `Slice`, `SliceStable`, `Ints`, `Strings`, `Search` |
| `slices` | 泛型排序（1.21+） | `Sort`, `SortFunc`, `Contains`, `Index` |
| `flag` | 命令列參數 | `String`, `Int`, `Bool`, `Duration`, `Parse`, `Args` |
| `log` | 基礎日誌 | `Println`, `Printf`, `Fatal`, `New` |
| `log/slog` | 結構化日誌（1.21+） | `Info`, `Warn`, `Error`, `With`, `NewJSONHandler` |

#### 重要注意事項彙整

| 項目 | 錯誤寫法 | 正確寫法 |
| :--- | :--- | :--- |
| time 格式 | `"2024-12-31"` 或 `"YYYY-MM-DD"` | `"2006-01-02"` |
| time.Parse 時區 | 直接用 `time.Parse` | 需要本地時區用 `ParseInLocation` |
| 文件關閉 | 在 err 檢查前 defer | err 檢查後立即 `defer f.Close()` |
| 大量字串拼接 | 迴圈中用 `+=` | 使用 `strings.Builder` |
| regexp 在迴圈 | 迴圈內 `regexp.Compile` | 定義為 package-level 變數 |
| MustCompile 使用時機 | 動態 / 使用者提供的正則 | 只用於硬式碼的固定正則 |
| 錯誤判斷 | `os.IsNotExist(err)` | `errors.Is(err, os.ErrNotExist)` |
| os.Exit 與 defer | 在有 defer 清理的程式中呼叫 | 讓 main 自然返回 |
| 讀大文件 | `io.ReadAll` | `bufio.Scanner` 逐行處理 |
| 日誌套件 | `log` 套件（Go 1.21+ 專案） | `log/slog` 結構化日誌 |

---

[← 返回目錄](README.md)

文件更新日期：2026年6月1日
