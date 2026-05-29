# Go context 套件完整指南

[← 返回目錄](README.md)

---

歡迎來到 Go 語言 `context` 套件的完整指南！這份文件專為 Go 入門者設計，會一步一步帶你從「為什麼需要 context」到「如何在實際專案中正確使用它」。每個概念都搭配範例和圖示說明，讓你輕鬆上手。

---

## 目錄

1. [為什麼需要 context？](#1-為什麼需要-context)
2. [context 的四種建立方式](#2-context-的四種建立方式)
3. [ctx.Done() 與取消訊號](#3-ctxdone-與取消訊號)
4. [WithCancel 實際範例](#4-withcancel-實際範例)
5. [WithTimeout / WithDeadline 實際範例](#5-withtimeout--withdeadline-實際範例)
6. [WithValue 傳遞請求資訊](#6-withvalue-傳遞請求資訊)
7. [context 在 HTTP server 的應用](#7-context-在-http-server-的應用)
8. [context 的傳遞規則](#8-context-的傳遞規則)
9. [context 取消的傳播](#9-context-取消的傳播)

---

## 1. 為什麼需要 context？

想像一下，你的程式正在處理一個 HTTP 請求，這個請求需要：
1. 查詢資料庫
2. 呼叫外部 API
3. 做一些計算

在這過程中，用戶可能已經關掉瀏覽器走人了，或是請求超時了。但如果沒有 context，你的程式根本不知道這件事，會繼續傻傻地執行，浪費資源。

### 沒有 context 時的問題

```go
// 沒有 context 的情況 — goroutine 不知道何時該停止
func fetchData() {
    go func() {
        // 這個 goroutine 會一直跑，即使呼叫者已經不需要結果了
        result := queryDatabase()  // 可能跑很久
        callExternalAPI(result)    // 已經沒人在等結果了，但還是繼續跑
        fmt.Println("完成！")      // 誰也不在乎這個結果了
    }()
}
```

問題很明顯：goroutine 不知道要停，就算外面的人已經不需要結果了，它還是繼續消耗 CPU 和記憶體。

### context 解決了什麼

context 提供了一個跨 goroutine 傳遞「取消訊號」的機制。就像一個廣播系統：當老闆說「停工！」，所有工人都能收到訊號然後停下來。

```text
  HTTP 請求進來
       |
       v
  建立 ctx（帶有超時）
       |
       +---> goroutine A（查資料庫）<-- 監聽 ctx.Done()
       |
       +---> goroutine B（呼叫 API）<-- 監聽 ctx.Done()
       |
       +---> goroutine C（計算）   <-- 監聽 ctx.Done()
       |
  超時或用戶取消 --> ctx 關閉 --> 所有 goroutine 同時收到訊號並停下
```

context 的三大功能：
- 傳遞取消訊號（cancel signal）
- 設定超時（timeout）或截止時間（deadline）
- 在 goroutine 之間安全傳遞請求相關的值（如 request ID）

---

## 2. context 的四種建立方式

Go 的 context 套件提供了幾種建立 context 的方法，了解每種用途可以幫助你選對工具。

### context.Background()

這是所有 context 的根節點，就像一棵樹的根部。通常在 `main` 函式、初始化程式，或測試的最外層使用。

```go
package main

import (
    "context"
    "fmt"
)

func main() {
    // 建立根 context，通常在程式最外層使用
    ctx := context.Background()
    fmt.Println(ctx) // 輸出：context.Background

    // 把這個 ctx 傳遞給其他函式
    doSomething(ctx)
}

func doSomething(ctx context.Context) {
    fmt.Println("收到 context，開始工作...")
}
```

### context.TODO()

當你不確定該用什麼 context，或是程式還在開發中、還沒決定如何處理取消邏輯時，用 `TODO()` 作為暫時佔位符。

```go
package main

import (
    "context"
)

func someFunction() {
    // TODO: 之後要從上層傳入正確的 context
    // 現在先用 TODO() 佔位，提醒自己之後要處理
    ctx := context.TODO()

    processData(ctx)
}

func processData(ctx context.Context) {
    // 處理資料...
}
```

`Background()` 和 `TODO()` 在技術上功能完全相同，差別只在語義：
- `Background()` 表示「這就是正確的起點」
- `TODO()` 表示「這邊之後需要處理，先放著」

### context.WithCancel(ctx)

建立一個可以手動取消的 context。會回傳新的 context 和一個 `cancel` 函式，呼叫 `cancel()` 就能取消這個 context。

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func main() {
    // 建立可取消的 context
    ctx, cancel := context.WithCancel(context.Background())

    // 重要！用完一定要呼叫 cancel，釋放資源
    defer cancel()

    go worker(ctx, "工人A")
    go worker(ctx, "工人B")

    time.Sleep(2 * time.Second)
    fmt.Println("叫停所有工人！")
    cancel() // 手動取消，通知所有監聽這個 ctx 的 goroutine

    time.Sleep(1 * time.Second) // 等工人收到訊號並停下
}

func worker(ctx context.Context, name string) {
    for {
        select {
        case <-ctx.Done():
            fmt.Printf("%s 收到取消訊號，停下來了\n", name)
            return
        default:
            fmt.Printf("%s 正在工作...\n", name)
            time.Sleep(500 * time.Millisecond)
        }
    }
}
```

### context.WithTimeout(ctx, duration)

建立一個會在指定時間後自動取消的 context。非常適合用在 HTTP 請求、資料庫查詢等需要限制等待時間的場景。

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func main() {
    // 建立一個 3 秒後自動取消的 context
    ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
    defer cancel() // 就算提前完成，也要呼叫 cancel 釋放資源

    fmt.Println("開始工作，最多等 3 秒...")

    select {
    case <-time.After(5 * time.Second): // 模擬一個需要 5 秒的任務
        fmt.Println("任務完成！")
    case <-ctx.Done():
        fmt.Println("超時了！", ctx.Err()) // 輸出：超時了！ context deadline exceeded
    }
}
```

### context.WithDeadline(ctx, time)

和 `WithTimeout` 類似，但指定的是一個具體的時間點，而不是持續時間。

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func main() {
    // 設定一個具體的截止時間點（現在起 2 秒後）
    deadline := time.Now().Add(2 * time.Second)
    ctx, cancel := context.WithDeadline(context.Background(), deadline)
    defer cancel()

    fmt.Printf("截止時間：%v\n", deadline.Format("15:04:05"))

    select {
    case <-time.After(5 * time.Second):
        fmt.Println("任務完成！")
    case <-ctx.Done():
        fmt.Printf("到達截止時間，停止工作。原因：%v\n", ctx.Err())
    }
}
```

`WithTimeout` 和 `WithDeadline` 的差別：

```text
WithTimeout(ctx, 5*time.Second)
  → 從現在開始算，5 秒後取消
  → 相當於 WithDeadline(ctx, time.Now().Add(5*time.Second))

WithDeadline(ctx, specificTime)
  → 到達 specificTime 這個時間點時取消
  → 適合「下午 5 點前必須完成」這種需求
```

### context.WithValue(ctx, key, val)

在 context 中存入一個 key-value 值，方便在整個請求生命週期內傳遞資訊，例如 request ID 或 user ID。

```go
package main

import (
    "context"
    "fmt"
)

// 使用自訂型別作為 key，避免與其他套件的 key 衝突
type contextKey string

const requestIDKey contextKey = "requestID"

func main() {
    // 把 request ID 放進 context
    ctx := context.WithValue(context.Background(), requestIDKey, "req-12345")

    handleRequest(ctx)
}

func handleRequest(ctx context.Context) {
    // 從 context 取出值
    requestID := ctx.Value(requestIDKey).(string)
    fmt.Printf("處理請求，Request ID：%s\n", requestID)

    processOrder(ctx)
}

func processOrder(ctx context.Context) {
    // 在更深的函式中也能取到值，不用層層傳參數
    requestID := ctx.Value(requestIDKey).(string)
    fmt.Printf("處理訂單，Request ID：%s\n", requestID)
}
```

---

## 3. ctx.Done() 與取消訊號

`ctx.Done()` 是 context 最核心的機制，讓我們深入了解它是如何運作的。

### Done() 回傳一個 channel

`ctx.Done()` 回傳一個 `<-chan struct{}` 型別的 channel。當 context 被取消時，這個 channel 會被關閉。Go 的 channel 有個特性：一個已關閉的 channel 可以立即被讀取（接收到零值），這就是取消訊號傳播的原理。

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func main() {
    ctx, cancel := context.WithCancel(context.Background())

    go func() {
        // 等待 Done() channel 關閉
        <-ctx.Done()
        fmt.Println("context 被取消了！")
        fmt.Println("原因：", ctx.Err())
    }()

    time.Sleep(1 * time.Second)
    cancel() // 關閉 Done() channel，觸發上面的 goroutine
    time.Sleep(100 * time.Millisecond)
}
```

### ctx.Err()

當 context 結束後，`ctx.Err()` 會告訴你結束的原因：

```go
package main

import (
    "context"
    "errors"
    "fmt"
    "time"
)

func main() {
    // 情況一：手動取消
    ctx1, cancel := context.WithCancel(context.Background())
    cancel()
    fmt.Println(ctx1.Err())                          // context.Canceled
    fmt.Println(errors.Is(ctx1.Err(), context.Canceled)) // true

    // 情況二：超時
    ctx2, cancel2 := context.WithTimeout(context.Background(), 1*time.Millisecond)
    defer cancel2()
    time.Sleep(10 * time.Millisecond) // 等超時發生
    fmt.Println(ctx2.Err())                                  // context deadline exceeded
    fmt.Println(errors.Is(ctx2.Err(), context.DeadlineExceeded)) // true
}
```

### 在 select 中監聽取消

實際程式中，通常會在 `select` 裡同時監聽多個事件，包含取消訊號：

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func doWork(ctx context.Context) error {
    for i := 0; i < 10; i++ {
        select {
        case <-ctx.Done():
            // context 被取消或超時，優雅地退出
            fmt.Printf("工作在第 %d 步被中斷：%v\n", i, ctx.Err())
            return ctx.Err()
        case <-time.After(500 * time.Millisecond):
            // 模擬每步工作需要 500ms
            fmt.Printf("完成第 %d 步\n", i+1)
        }
    }
    return nil
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()

    if err := doWork(ctx); err != nil {
        fmt.Println("工作未完成：", err)
    } else {
        fmt.Println("所有工作完成！")
    }
}
```

---

## 4. WithCancel 實際範例

### 範例一：多個 goroutine，任一完成就取消其他

這是一個經典場景：同時向多個伺服器發送相同的請求，誰先回來就用誰的結果，然後取消其他正在進行的請求。

```go
package main

import (
    "context"
    "fmt"
    "math/rand"
    "time"
)

// 模擬向某個伺服器發送請求
func fetchFromServer(ctx context.Context, serverName string, result chan<- string) {
    // 模擬隨機的回應時間（1~3 秒）
    delay := time.Duration(rand.Intn(3)+1) * time.Second

    select {
    case <-time.After(delay):
        // 成功取得結果，嘗試送入 channel
        select {
        case result <- fmt.Sprintf("來自 %s 的結果", serverName):
            fmt.Printf("%s 回應了（耗時 %v）\n", serverName, delay)
        case <-ctx.Done():
            // channel 已經有人先寫了，或 context 被取消了
        }
    case <-ctx.Done():
        fmt.Printf("%s 被取消了\n", serverName)
    }
}

func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    result := make(chan string, 1)

    // 同時向 3 台伺服器發送請求
    go fetchFromServer(ctx, "伺服器A", result)
    go fetchFromServer(ctx, "伺服器B", result)
    go fetchFromServer(ctx, "伺服器C", result)

    // 等待第一個結果
    firstResult := <-result
    cancel() // 取消其他還在跑的請求

    fmt.Printf("\n使用第一個到達的結果：%s\n", firstResult)
    time.Sleep(500 * time.Millisecond) // 等其他 goroutine 印出取消訊息
}
```

### 範例二：Ctrl+C 時優雅地清理

```go
package main

import (
    "context"
    "fmt"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    // 建立可取消的 context
    ctx, cancel := context.WithCancel(context.Background())

    // 監聽系統中斷訊號（Ctrl+C）
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

    go func() {
        sig := <-sigChan
        fmt.Printf("\n收到訊號：%v，開始清理...\n", sig)
        cancel() // 取消 context，通知所有工作停下
    }()

    // 啟動背景工作
    go backgroundWorker(ctx, "排程任務")
    go backgroundWorker(ctx, "資料同步")

    // 等待 context 被取消
    <-ctx.Done()
    fmt.Println("所有工作已停止，程式結束")
}

func backgroundWorker(ctx context.Context, name string) {
    fmt.Printf("%s 開始執行\n", name)
    for {
        select {
        case <-ctx.Done():
            fmt.Printf("%s 收到停止訊號，正在清理...\n", name)
            // 在這裡做清理工作，例如關閉連線、儲存狀態等
            time.Sleep(100 * time.Millisecond)
            fmt.Printf("%s 清理完成\n", name)
            return
        case <-time.After(1 * time.Second):
            fmt.Printf("%s 執行中...\n", name)
        }
    }
}
```

---

## 5. WithTimeout / WithDeadline 實際範例

### 範例一：HTTP 請求超時

```go
package main

import (
    "context"
    "fmt"
    "io"
    "net/http"
    "time"
)

func fetchURL(url string) (string, error) {
    // 設定 10 秒超時
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel() // 不管成功失敗，函式結束時一定要呼叫 cancel

    // 建立帶有 context 的 HTTP 請求
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return "", fmt.Errorf("建立請求失敗：%w", err)
    }

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        // 如果是超時，err 會包含 context deadline exceeded 資訊
        return "", fmt.Errorf("請求失敗：%w", err)
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return "", fmt.Errorf("讀取回應失敗：%w", err)
    }

    return string(body), nil
}

func main() {
    result, err := fetchURL("https://httpbin.org/delay/3")
    if err != nil {
        fmt.Println("錯誤：", err)
        return
    }
    fmt.Println("成功取得資料，長度：", len(result))
}
```

### 範例二：資料庫查詢超時

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "time"
)

func getUserByID(db *sql.DB, userID int) (*User, error) {
    // 資料庫查詢最多等 5 秒
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel() // 記得釋放資源！

    user := &User{}
    // 使用 QueryRowContext 而不是 QueryRow，這樣查詢會受 context 控制
    err := db.QueryRowContext(ctx,
        "SELECT id, name, email FROM users WHERE id = ?",
        userID,
    ).Scan(&user.ID, &user.Name, &user.Email)

    if err == sql.ErrNoRows {
        return nil, fmt.Errorf("用戶 %d 不存在", userID)
    }
    if err != nil {
        return nil, fmt.Errorf("查詢失敗：%w", err)
    }

    return user, nil
}

type User struct {
    ID    int
    Name  string
    Email string
}
```

### defer cancel() 的重要性

`defer cancel()` 絕對不能忘記！讓我們看看忘記呼叫 `cancel()` 會發生什麼：

```go
package main

import (
    "context"
    "fmt"
    "runtime"
    "time"
)

// 錯誤示範：忘記呼叫 cancel
func badExample() {
    for i := 0; i < 100; i++ {
        // 每次都建立新的 context，但從不取消
        ctx, _ := context.WithTimeout(context.Background(), 30*time.Second)
        // ... 使用 ctx 做事 ...
        _ = ctx
        // 函式結束了，但 context 內部的計時器 goroutine 還在跑
        // 這會造成 goroutine leak！
    }
}

// 正確示範：一定要 defer cancel()
func goodExample() {
    for i := 0; i < 100; i++ {
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel() // 函式結束時自動呼叫，釋放所有相關資源

        // ... 使用 ctx 做事 ...
        _ = ctx
    }
}

func main() {
    fmt.Println("goroutine 數量（開始）：", runtime.NumGoroutine())

    badExample()
    fmt.Println("goroutine 數量（badExample 後）：", runtime.NumGoroutine())
    // 可能會看到數量增加，因為有 goroutine leak

    time.Sleep(100 * time.Millisecond)
    goodExample()
    fmt.Println("goroutine 數量（goodExample 後）：", runtime.NumGoroutine())
}
```

```text
cancel() 的作用：
1. 立即關閉 ctx.Done() channel（通知所有監聽者）
2. 釋放 context 內部持有的資源
3. 取消所有子 context

就算 context 已經超時或已經被取消了，
呼叫 cancel() 也不會有任何副作用——所以永遠要 defer cancel()！
```

---

## 6. WithValue 傳遞請求資訊

### 傳遞 request ID、user ID、trace ID

在 Web 服務中，每個請求通常都有唯一的 ID 用來追蹤。使用 `WithValue` 可以在不改變函式簽章的情況下，把這些資訊傳遞到整個請求處理鏈中。

```go
package main

import (
    "context"
    "fmt"
    "math/rand"
)

// 定義 context key 型別（見下一節說明）
type contextKey string

const (
    keyRequestID contextKey = "requestID"
    keyUserID    contextKey = "userID"
    keyTraceID   contextKey = "traceID"
)

// 輔助函式：把常用的值存入 context
func withRequestID(ctx context.Context, requestID string) context.Context {
    return context.WithValue(ctx, keyRequestID, requestID)
}

func withUserID(ctx context.Context, userID int) context.Context {
    return context.WithValue(ctx, keyUserID, userID)
}

// 輔助函式：從 context 取出值
func getRequestID(ctx context.Context) string {
    if v, ok := ctx.Value(keyRequestID).(string); ok {
        return v
    }
    return "unknown"
}

func getUserID(ctx context.Context) int {
    if v, ok := ctx.Value(keyUserID).(int); ok {
        return v
    }
    return 0
}

func handleRequest(ctx context.Context) {
    // 加入請求相關資訊
    ctx = withRequestID(ctx, fmt.Sprintf("req-%d", rand.Intn(10000)))
    ctx = withUserID(ctx, 42)

    // 傳遞給後續的函式
    authenticateUser(ctx)
    fetchUserData(ctx)
    writeResponse(ctx)
}

func authenticateUser(ctx context.Context) {
    fmt.Printf("[認證] RequestID=%s, UserID=%d\n",
        getRequestID(ctx), getUserID(ctx))
}

func fetchUserData(ctx context.Context) {
    fmt.Printf("[取資料] RequestID=%s, UserID=%d\n",
        getRequestID(ctx), getUserID(ctx))
}

func writeResponse(ctx context.Context) {
    fmt.Printf("[回應] RequestID=%s, UserID=%d\n",
        getRequestID(ctx), getUserID(ctx))
}

func main() {
    ctx := context.Background()
    handleRequest(ctx)
}
```

### 用自訂型別作為 key（避免衝突）

這是 `WithValue` 最重要的使用習慣！一定要用自訂型別作為 key，絕對不要用內建型別（如 `string`、`int`）：

```go
package main

import (
    "context"
    "fmt"
)

// 錯誤示範：用 string 作為 key，容易與其他套件衝突
func badKeyExample() {
    ctx := context.WithValue(context.Background(), "userID", 123)

    // 如果另一個套件也用 "userID" 這個 string key
    // 就會不小心取到或覆蓋對方的值！
    _ = ctx
}

// 正確示範：用自訂型別作為 key
type myPackageKey string // 或是用 struct{}{}

const myUserID myPackageKey = "userID"

func goodKeyExample() {
    // 就算其他套件也用 "userID" 這個字串，
    // 但 myPackageKey("userID") != string("userID")，不會衝突
    ctx := context.WithValue(context.Background(), myUserID, 123)

    if v, ok := ctx.Value(myUserID).(int); ok {
        fmt.Println("取到 userID：", v)
    }
}

// 更嚴謹的做法：用 struct{} 型別（完全無法從外部建立相同的 key）
type strictKey struct{}

var theStrictKey = strictKey{}

func strictKeyExample() {
    ctx := context.WithValue(context.Background(), theStrictKey, "secret")
    fmt.Println(ctx.Value(theStrictKey))
}

func main() {
    goodKeyExample()
    strictKeyExample()
}
```

### WithValue 的使用限制

`WithValue` 很方便，但不要濫用。有一些明確的使用準則：

```text
應該放進 context 的值：
  - Request ID（請求追蹤）
  - User ID（已驗證的使用者）
  - Trace ID（分散式追蹤）
  - 認證 token

不應該放進 context 的值：
  - 函式的可選參數（直接用參數傳遞更清楚）
  - 資料庫連線（依賴注入更好）
  - 程式設定（用 config 結構傳遞）
  - 任何會影響函式邏輯的核心資料
```

```go
// 不好的用法：把函式邏輯需要的參數塞進 context
func badUsage(ctx context.Context) {
    limit := ctx.Value("limit").(int)  // 這應該直接當參數傳入
    offset := ctx.Value("offset").(int) // 讓程式難以理解和測試
    _ = limit
    _ = offset
}

// 好的用法：可選的、跨越多層呼叫的元資料才放進 context
func goodUsage(ctx context.Context, limit, offset int) {
    requestID := ctx.Value(keyRequestID).(string) // 這才適合放 context
    fmt.Printf("[%s] 查詢 limit=%d, offset=%d\n", requestID, limit, offset)
}
```

---

## 7. context 在 HTTP server 的應用

### r.Context() 取得請求的 context

Go 的標準 `net/http` 套件會為每個 HTTP 請求自動建立一個 context。你可以透過 `r.Context()` 取得它。

```go
package main

import (
    "context"
    "fmt"
    "net/http"
    "time"
)

type contextKey string

const keyRequestID contextKey = "requestID"

func main() {
    http.HandleFunc("/data", handleData)
    fmt.Println("伺服器啟動在 :8080")
    http.ListenAndServe(":8080", nil)
}

func handleData(w http.ResponseWriter, r *http.Request) {
    // 取得請求的 context
    ctx := r.Context()

    // 加入 request ID
    ctx = context.WithValue(ctx, keyRequestID, "req-abc-123")

    // 設定資料庫查詢超時（在請求 context 的基礎上建立）
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    // 把 ctx 傳遞給所有後續操作
    data, err := fetchData(ctx)
    if err != nil {
        if ctx.Err() != nil {
            // 是超時或取消，不是應用程式錯誤
            http.Error(w, "請求超時", http.StatusGatewayTimeout)
            return
        }
        http.Error(w, "內部錯誤", http.StatusInternalServerError)
        return
    }

    fmt.Fprintln(w, data)
}

func fetchData(ctx context.Context) (string, error) {
    // 模擬耗時操作
    select {
    case <-time.After(2 * time.Second):
        return "資料取得成功", nil
    case <-ctx.Done():
        return "", ctx.Err()
    }
}
```

### 客戶端斷線時 ctx.Done() 會觸發

當使用者關掉瀏覽器或網路中斷，Go 的 HTTP server 會自動取消對應的 context：

```go
package main

import (
    "fmt"
    "net/http"
    "time"
)

func longRunningHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    fmt.Println("開始處理耗時請求...")

    for i := 0; i < 10; i++ {
        select {
        case <-ctx.Done():
            // 客戶端斷線了！停止處理，避免浪費資源
            fmt.Printf("客戶端在第 %d 步斷線，停止處理。原因：%v\n", i, ctx.Err())
            return
        case <-time.After(1 * time.Second):
            fmt.Printf("第 %d 步完成\n", i+1)
        }
    }

    fmt.Fprintln(w, "完成！")
    fmt.Println("請求處理完成")
}

func main() {
    http.HandleFunc("/long", longRunningHandler)
    fmt.Println("伺服器啟動，試著在處理過程中關閉瀏覽器分頁...")
    http.ListenAndServe(":8080", nil)
}
```

### 搭配資料庫操作（db.QueryContext）

Go 的 `database/sql` 套件的所有操作都有對應的 context 版本。永遠使用帶 Context 的版本，這樣當請求被取消時，資料庫查詢也會隨之取消：

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "net/http"
    "time"
)

var db *sql.DB

func getUserHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    // 在請求 context 的基礎上設定資料庫查詢超時
    dbCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
    defer cancel()

    // 使用 QueryContext 而不是 Query
    // 當 ctx 被取消時（例如客戶端斷線），查詢也會停止
    rows, err := db.QueryContext(dbCtx,
        "SELECT id, name FROM users WHERE active = ?", true)
    if err != nil {
        if dbCtx.Err() != nil {
            http.Error(w, "查詢超時", http.StatusGatewayTimeout)
            return
        }
        http.Error(w, "查詢失敗", http.StatusInternalServerError)
        return
    }
    defer rows.Close()

    for rows.Next() {
        var id int
        var name string
        if err := rows.Scan(&id, &name); err != nil {
            continue
        }
        fmt.Fprintf(w, "ID: %d, Name: %s\n", id, name)
    }
}

func main() {
    // 使用 ExecContext、QueryContext、QueryRowContext
    // 永遠不要用沒有 Context 的版本（Exec、Query、QueryRow）
    fmt.Println("正確使用：db.QueryContext(ctx, ...)")
    fmt.Println("避免使用：db.Query(...)  ← 無法被 context 控制")
}
```

---

## 8. context 的傳遞規則

### context 應該是函數的第一個參數

這是 Go 社群的強烈慣例，幾乎所有 Go 標準函式庫和知名套件都遵守：

```go
// 正確：ctx 是第一個參數，名稱就叫 ctx
func DoSomething(ctx context.Context, arg1 string, arg2 int) error {
    // ...
    return nil
}

// 正確：多個函式都遵守這個慣例
func (s *Server) HandleRequest(ctx context.Context, req *Request) (*Response, error) {
    // ...
    return nil, nil
}

// 錯誤：ctx 不應該在中間或最後
func BadFunction(arg1 string, ctx context.Context, arg2 int) error {
    return nil
}

// 錯誤：不應該用其他名稱（除非有特殊理由）
func AnotherBadFunction(c context.Context) error {
    return nil
}
```

### 不要把 context 存在 struct 裡

這是 Go 官方文件明確說明的規則：

```go
// 錯誤示範：把 context 存在 struct 裡
type BadService struct {
    ctx context.Context // 不要這樣做！
    db  *sql.DB
}

func (s *BadService) GetUser(id int) (*User, error) {
    // 使用儲存在 struct 裡的 ctx，但這個 ctx 的生命週期是模糊的
    // 它是什麼時候建立的？什麼時候會過期？很難追蹤
    return nil, nil
}

// 正確示範：每個方法都接受自己的 context
type GoodService struct {
    db *sql.DB // struct 裡只存放不會過期的依賴
}

func (s *GoodService) GetUser(ctx context.Context, id int) (*User, error) {
    // ctx 明確屬於這次呼叫，生命週期清晰
    return nil, nil
}
```

有一個例外：如果你在實作某個需要存 context 的介面（例如某些 middleware 框架），那是可以的。但這種情況相對少見。

### 不要傳入 nil context，用 context.TODO() 代替

```go
package main

import (
    "context"
    "fmt"
)

func process(ctx context.Context) {
    if ctx == nil {
        // 如果傳入 nil，這行會 panic
        fmt.Println(ctx.Done())
    }
}

func main() {
    // 錯誤：永遠不要傳 nil
    // process(nil) // 這會導致 panic

    // 如果你不確定要傳什麼，用 context.TODO()
    process(context.TODO())

    // 如果這確實是程式的起點，用 context.Background()
    process(context.Background())
}
```

```text
context 傳遞的黃金規則：

1. ctx 永遠是函式的第一個參數，名叫 ctx
2. 不要在 struct 中儲存 ctx（除非特殊情況）
3. 不要傳入 nil，用 context.TODO() 代替
4. 不要自己建立 context 傳給子函式，應該把上層給你的 ctx 傳下去
5. 用 WithCancel / WithTimeout 衍生子 context 時，記得 defer cancel()
```

---

## 9. context 取消的傳播

### 父 context 取消，子 context 自動取消

context 的取消是單向向下傳播的：父 context 取消時，所有子 context 也會跟著取消，但子 context 取消不影響父 context。

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func main() {
    // 建立父 context
    parentCtx, parentCancel := context.WithCancel(context.Background())
    defer parentCancel()

    // 建立子 context（從父衍生）
    childCtx, childCancel := context.WithCancel(parentCtx)
    defer childCancel()

    // 建立孫 context（從子衍生）
    grandChildCtx, grandChildCancel := context.WithTimeout(childCtx, 10*time.Second)
    defer grandChildCancel()

    // 監聽各個 context 的狀態
    go func() {
        <-grandChildCtx.Done()
        fmt.Println("孫 context 結束：", grandChildCtx.Err())
    }()

    go func() {
        <-childCtx.Done()
        fmt.Println("子 context 結束：", childCtx.Err())
    }()

    go func() {
        <-parentCtx.Done()
        fmt.Println("父 context 結束：", parentCtx.Err())
    }()

    time.Sleep(500 * time.Millisecond)
    fmt.Println("取消父 context...")
    parentCancel()

    time.Sleep(200 * time.Millisecond)
    // 輸出順序：父、子、孫都會被取消（或任意順序，因為是並行）
}
```

### 樹狀結構示意圖

```text
context 的生命週期是一棵樹，取消訊號由上往下流：

context.Background()
│
├── WithCancel → ctx_A（手動取消）
│   │
│   ├── WithTimeout(3s) → ctx_A1
│   │   │
│   │   └── WithValue("userID") → ctx_A1_v
│   │
│   └── WithDeadline(5pm) → ctx_A2
│
└── WithTimeout(10s) → ctx_B
    │
    └── WithCancel → ctx_B1

規則：
- 取消 ctx_A  → ctx_A1、ctx_A1_v、ctx_A2 全部取消
- 取消 ctx_B  → ctx_B1 取消，但 ctx_A 不受影響
- ctx_A1 超時 → ctx_A1_v 取消，但 ctx_A 不受影響
- Background() 永遠不會被取消
```

### 完整示範：取消傳播的實際行為

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func worker(ctx context.Context, name string) {
    select {
    case <-time.After(5 * time.Second):
        fmt.Printf("[%s] 工作完成\n", name)
    case <-ctx.Done():
        fmt.Printf("[%s] 被取消，原因：%v\n", name, ctx.Err())
    }
}

func main() {
    // 建立一個三層的 context 樹
    rootCtx := context.Background()

    level1Ctx, level1Cancel := context.WithCancel(rootCtx)
    defer level1Cancel()

    level2Ctx, level2Cancel := context.WithTimeout(level1Ctx, 10*time.Second)
    defer level2Cancel()

    level3Ctx, level3Cancel := context.WithCancel(level2Ctx)
    defer level3Cancel()

    // 啟動三個 worker，各使用不同層的 context
    go worker(level1Ctx, "工人-Level1")
    go worker(level2Ctx, "工人-Level2")
    go worker(level3Ctx, "工人-Level3")

    time.Sleep(1 * time.Second)

    fmt.Println("\n=== 取消 Level1 context ===")
    level1Cancel() // Level1 取消 → Level2 和 Level3 也會自動取消

    time.Sleep(500 * time.Millisecond)
    fmt.Println("\n所有 worker 都停了！")
}
```

輸出結果會顯示三個 worker 都被取消，即使只呼叫了 `level1Cancel()`：

```text
=== 取消 Level1 context ===
[工人-Level1] 被取消，原因：context canceled
[工人-Level2] 被取消，原因：context canceled
[工人-Level3] 被取消，原因：context canceled

所有 worker 都停了！
```

---

## 總結

學完這份指南，你現在了解了 context 套件的全貌：

```text
context 的核心概念：

建立方式：
  Background() ── 根節點，程式起點
  TODO()       ── 佔位符，開發中使用
  WithCancel   ── 手動取消
  WithTimeout  ── 指定持續時間後取消
  WithDeadline ── 到達時間點後取消
  WithValue    ── 傳遞請求相關的值

使用原則：
  1. ctx 永遠是第一個參數
  2. 永遠 defer cancel()
  3. 不傳 nil，用 context.TODO()
  4. WithValue 只放元資料，不放業務邏輯
  5. 不把 ctx 存在 struct 裡

取消機制：
  父取消 → 子全部取消（單向向下傳播）
  子取消 → 父不受影響
```

掌握 context 套件，你的 Go 程式就能更好地處理超時、取消和跨 goroutine 的協調。這是寫出穩健生產級 Go 服務的必備技能！

---

[← 返回目錄](README.md)


---

---

[← 返回目錄](README.md)

文件更新日期：2026年5月29日
