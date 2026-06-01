# Go HTTP 開發完整指南

[← 返回目錄](README.md)

本文件涵蓋 Go 語言 HTTP 開發的完整知識，從原生 `net/http` 套件到 Gin 框架，包含 HTTP Server 建立、Client 請求發送、Middleware 設計、請求驗證、統一回應格式與 RESTful API 設計規範。適合已掌握 Go 基礎語法（變數、函數、struct、介面），準備開始撰寫 Web API 的入門開發者。

---

## 1. net/http 基礎：原生 HTTP Server

### 1-1 最簡單的 HTTP Server

Go 標準函式庫內建 `net/http`，不需要任何第三方套件就能啟動一個 HTTP Server。

```go
package main

import (
    "fmt"
    "net/http"
)

func helloHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "Hello, World!")
}

func main() {
    http.HandleFunc("/hello", helloHandler)

    fmt.Println("Server 啟動於 http://localhost:8080")
    if err := http.ListenAndServe(":8080", nil); err != nil {
        fmt.Printf("Server 啟動失敗：%v\n", err)
    }
}
```

```text
輸出（終端機）：
Server 啟動於 http://localhost:8080

瀏覽器訪問 http://localhost:8080/hello：
Hello, World!
```

`http.ListenAndServe` 的第二個參數傳 `nil` 代表使用預設的 `DefaultServeMux` 路由器。

> **注意**：`http.ListenAndServe` 是阻塞呼叫，程式會一直在這裡等待請求，不會往下執行。

---

### 1-2 Handler 的兩種寫法（HandlerFunc vs Handler interface）

Go HTTP 有兩種方式定義 Handler：

#### 方式一：函數（HandlerFunc）

最常見，直接用符合 `func(http.ResponseWriter, *http.Request)` 簽名的函數：

```go
package main

import (
    "fmt"
    "net/http"
)

// 符合 http.HandlerFunc 型別的函數
func userHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "使用者頁面")
}

func main() {
    http.HandleFunc("/user", userHandler)
    http.ListenAndServe(":8080", nil)
}
```

#### 方式二：實作 http.Handler 介面

適合需要攜帶狀態（如資料庫連線）的 Handler：

```go
package main

import (
    "fmt"
    "net/http"
)

// 定義帶狀態的 Handler struct
type UserHandler struct {
    prefix string
}

// 實作 http.Handler 介面的 ServeHTTP 方法
func (h *UserHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "%s：使用者頁面\n", h.prefix)
}

func main() {
    handler := &UserHandler{prefix: "[API]"}
    http.Handle("/user", handler)

    fmt.Println("Server 啟動於 http://localhost:8080")
    http.ListenAndServe(":8080", nil)
}
```

```text
輸出（瀏覽器訪問 /user）：
[API]：使用者頁面
```

兩種方式的差別：

| 方式 | 適用情境 | 語法 |
| :--- | :--- | :--- |
| HandlerFunc（函數） | 簡單、無狀態的 Handler | `http.HandleFunc(path, fn)` |
| Handler 介面（struct） | 需要注入依賴（DB、Config）的 Handler | `http.Handle(path, handler)` |

---

### 1-3 ServeMux 路由分發

`http.ServeMux` 是 Go 內建的路由器（Router），負責將不同路徑分發到對應的 Handler。

```go
package main

import (
    "fmt"
    "net/http"
)

func homeHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "首頁")
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "使用者列表")
}

func productHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "產品頁面")
}

func main() {
    // 建立自訂的 ServeMux，而非使用全域的 DefaultServeMux
    mux := http.NewServeMux()

    mux.HandleFunc("/", homeHandler)
    mux.HandleFunc("/users", usersHandler)
    mux.HandleFunc("/products/", productHandler) // 尾斜線代表前綴匹配

    server := &http.Server{
        Addr:    ":8080",
        Handler: mux,
    }

    fmt.Println("Server 啟動於 http://localhost:8080")
    if err := server.ListenAndServe(); err != nil {
        fmt.Printf("啟動失敗：%v\n", err)
    }
}
```

> **注意**：原生 `ServeMux` 的路由比較陽春，不支援路徑參數（如 `/users/:id`）和 HTTP 方法過濾。實際專案通常使用 Gin 或其他框架。

ServeMux 路由匹配規則：

```text
路由路徑結尾帶 /（如 /products/）→ 前綴匹配（/products/123 也會匹配）
路由路徑結尾不帶 /（如 /users）  → 精確匹配（/users/123 不會匹配）
```

---

### 1-4 request 物件解析（URL、Header、Body、Query、Form）

`*http.Request` 包含所有請求資訊：

```go
package main

import (
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

func requestInfoHandler(w http.ResponseWriter, r *http.Request) {
    // 1. HTTP 方法
    fmt.Fprintf(w, "方法：%s\n", r.Method)

    // 2. URL 路徑
    fmt.Fprintf(w, "路徑：%s\n", r.URL.Path)

    // 3. Query 參數（?name=Alice&age=18）
    queryParams := r.URL.Query()
    name := queryParams.Get("name") // 取單一值
    fmt.Fprintf(w, "name 參數：%s\n", name)

    // 4. Header
    contentType := r.Header.Get("Content-Type")
    authorization := r.Header.Get("Authorization")
    fmt.Fprintf(w, "Content-Type：%s\n", contentType)
    fmt.Fprintf(w, "Authorization：%s\n", authorization)

    // 5. 讀取 Body（JSON）
    if r.Method == http.MethodPost {
        body, err := io.ReadAll(r.Body)
        if err != nil {
            http.Error(w, "讀取 Body 失敗", http.StatusBadRequest)
            return
        }
        defer r.Body.Close()

        var data map[string]any
        if err := json.Unmarshal(body, &data); err != nil {
            http.Error(w, "解析 JSON 失敗", http.StatusBadRequest)
            return
        }
        fmt.Fprintf(w, "Body 內容：%v\n", data)
    }

    // 6. Form 表單（application/x-www-form-urlencoded）
    if err := r.ParseForm(); err == nil {
        username := r.FormValue("username")
        fmt.Fprintf(w, "表單 username：%s\n", username)
    }
}

func main() {
    http.HandleFunc("/request-info", requestInfoHandler)
    fmt.Println("Server 啟動於 http://localhost:8080")
    http.ListenAndServe(":8080", nil)
}
```

> **注意**：`r.Body` 讀取後會清空，只能讀一次。如果需要多次讀取，需要先將內容存到變數或使用 `bytes.Buffer` 重新填入。

---

### 1-5 response 寫法（狀態碼、Header、JSON 回應）

```go
package main

import (
    "encoding/json"
    "net/http"
)

type User struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}

func getUserHandler(w http.ResponseWriter, r *http.Request) {
    // 1. 設定 Header（必須在 WriteHeader 之前）
    w.Header().Set("Content-Type", "application/json")
    w.Header().Set("X-Request-ID", "abc-123")

    // 2. 設定狀態碼（必須在 Write 之前）
    w.WriteHeader(http.StatusOK) // 200

    // 3. 寫入回應 Body
    user := User{ID: 1, Name: "Alice"}
    if err := json.NewEncoder(w).Encode(user); err != nil {
        // 注意：此時 header 已送出，無法再改狀態碼
        return
    }
}

func notFoundHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusNotFound) // 404

    resp := map[string]string{"error": "資源不存在"}
    json.NewEncoder(w).Encode(resp)
}

func main() {
    http.HandleFunc("/user", getUserHandler)
    http.HandleFunc("/missing", notFoundHandler)
    http.ListenAndServe(":8080", nil)
}
```

> **警告**：`w.Header().Set(...)` 必須在 `w.WriteHeader(...)` 之前呼叫，一旦 WriteHeader 或 Write 被呼叫，Header 就無法再修改。

Header、WriteHeader、Write 的順序：

```text
正確順序：
  1. w.Header().Set("Content-Type", "application/json")  ← 先設 Header
  2. w.WriteHeader(http.StatusCreated)                   ← 再設狀態碼
  3. w.Write(body) / json.NewEncoder(w).Encode(data)     ← 最後寫 Body

若不呼叫 WriteHeader，第一次呼叫 Write 時會自動寫入 200。
```

---

### 1-6 中介層（Middleware）手動串接

Middleware 是在 Handler 前後執行邏輯的函數，常用於記錄 Log、驗證 Token、計算耗時。

```go
package main

import (
    "fmt"
    "net/http"
    "time"
)

// Middleware 型別：接收一個 Handler，回傳一個新的 Handler
type Middleware func(http.HandlerFunc) http.HandlerFunc

// 計時 Middleware
func loggingMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        fmt.Printf("[LOG] %s %s 開始\n", r.Method, r.URL.Path)

        next(w, r) // 呼叫下一個 Handler

        elapsed := time.Since(start)
        fmt.Printf("[LOG] %s %s 完成，耗時 %v\n", r.Method, r.URL.Path, elapsed)
    }
}

// 認證 Middleware
func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        if token != "Bearer secret-token" {
            http.Error(w, "未授權", http.StatusUnauthorized)
            return // 不呼叫 next，中斷請求
        }
        next(w, r)
    }
}

// 串接多個 Middleware（從右到左包裹）
func chain(h http.HandlerFunc, middlewares ...Middleware) http.HandlerFunc {
    for i := len(middlewares) - 1; i >= 0; i-- {
        h = middlewares[i](h)
    }
    return h
}

func protectedHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "受保護的資源")
}

func main() {
    mux := http.NewServeMux()

    // 套用兩層 Middleware
    mux.HandleFunc("/protected", chain(
        protectedHandler,
        loggingMiddleware,
        authMiddleware,
    ))

    fmt.Println("Server 啟動於 http://localhost:8080")
    http.ListenAndServe(":8080", mux)
}
```

```text
執行流程（有 token）：
  [LOG] GET /protected 開始
  → authMiddleware 驗證通過
  → protectedHandler 執行
  [LOG] GET /protected 完成，耗時 123µs
```

---

## 2. net/http 客戶端：發送 HTTP 請求

### 2-1 基本 GET / POST 請求

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

func doGet() {
    resp, err := http.Get("https://httpbin.org/get?name=Alice")
    if err != nil {
        fmt.Printf("GET 失敗：%v\n", err)
        return
    }
    defer resp.Body.Close() // 必須關閉 Body，否則連線不會釋放

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        fmt.Printf("讀取 Body 失敗：%v\n", err)
        return
    }

    fmt.Printf("狀態碼：%d\n", resp.StatusCode)
    fmt.Printf("回應內容：%s\n", string(body))
}

func doPost() {
    payload := map[string]string{
        "name":  "Alice",
        "email": "alice@example.com",
    }

    jsonBody, err := json.Marshal(payload)
    if err != nil {
        fmt.Printf("序列化失敗：%v\n", err)
        return
    }

    resp, err := http.Post(
        "https://httpbin.org/post",
        "application/json",
        bytes.NewBuffer(jsonBody),
    )
    if err != nil {
        fmt.Printf("POST 失敗：%v\n", err)
        return
    }
    defer resp.Body.Close()

    fmt.Printf("狀態碼：%d\n", resp.StatusCode)
}

func main() {
    fmt.Println("=== GET 請求 ===")
    doGet()

    fmt.Println("\n=== POST 請求 ===")
    doPost()
}
```

> **警告**：必須呼叫 `resp.Body.Close()`，否則 HTTP 連線不會歸還到連線池，最終導致連線洩漏。建議使用 `defer resp.Body.Close()`。

---

### 2-2 自訂 http.Client（Timeout、Transport）

> **警告**：永遠不要使用 `http.Get`、`http.Post` 這類套件層級函數於生產環境，它們使用沒有 Timeout 的預設 Client，一旦對方伺服器沒有回應，程式會永遠卡住。

```go
package main

import (
    "fmt"
    "io"
    "net/http"
    "time"
)

func main() {
    // 自訂 Transport，控制底層連線行為
    transport := &http.Transport{
        MaxIdleConns:        100,              // 最大閒置連線數
        MaxIdleConnsPerHost: 10,               // 每個 host 最大閒置連線數
        IdleConnTimeout:     90 * time.Second, // 閒置連線逾時
    }

    // 自訂 Client，設定 Timeout
    client := &http.Client{
        Timeout:   10 * time.Second, // 整個請求（含讀取 Body）的逾時
        Transport: transport,
    }

    resp, err := client.Get("https://httpbin.org/delay/1")
    if err != nil {
        fmt.Printf("請求失敗（可能逾時）：%v\n", err)
        return
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        fmt.Printf("讀取失敗：%v\n", err)
        return
    }

    fmt.Printf("狀態碼：%d，Body 長度：%d bytes\n", resp.StatusCode, len(body))
}
```

> **建議**：將 `http.Client` 宣告為套件層級變數並重複使用，不要每次請求都建立新的 Client（會浪費連線池）。

---

### 2-3 設定 Header 與 Bearer Token

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

var httpClient = &http.Client{
    Timeout: 10 * time.Second,
}

func createUserRequest(token string, name string, email string) error {
    payload := map[string]string{
        "name":  name,
        "email": email,
    }

    jsonBody, err := json.Marshal(payload)
    if err != nil {
        return fmt.Errorf("序列化 payload 失敗：%w", err)
    }

    req, err := http.NewRequest(http.MethodPost, "https://httpbin.org/post", bytes.NewBuffer(jsonBody))
    if err != nil {
        return fmt.Errorf("建立請求失敗：%w", err)
    }

    // 設定 Header
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Accept", "application/json")
    req.Header.Set("Authorization", "Bearer "+token)
    req.Header.Set("X-Request-ID", "req-001")

    resp, err := httpClient.Do(req)
    if err != nil {
        return fmt.Errorf("發送請求失敗：%w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(resp.Body)
        return fmt.Errorf("伺服器回傳 %d：%s", resp.StatusCode, string(body))
    }

    return nil
}

func main() {
    err := createUserRequest("my-secret-token", "Alice", "alice@example.com")
    if err != nil {
        fmt.Printf("失敗：%v\n", err)
        return
    }
    fmt.Println("成功")
}
```

---

### 2-4 解析 JSON Response

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "time"
)

// 對應 API 回應的 struct
type GitHubUser struct {
    Login     string `json:"login"`
    ID        int    `json:"id"`
    AvatarURL string `json:"avatar_url"`
    Name      string `json:"name"`
    Company   string `json:"company"`
    Followers int    `json:"followers"`
}

var httpClient = &http.Client{
    Timeout: 10 * time.Second,
}

func getGitHubUser(username string) (*GitHubUser, error) {
    url := fmt.Sprintf("https://api.github.com/users/%s", username)

    req, err := http.NewRequest(http.MethodGet, url, nil)
    if err != nil {
        return nil, fmt.Errorf("建立請求失敗：%w", err)
    }
    req.Header.Set("Accept", "application/vnd.github.v3+json")

    resp, err := httpClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("發送請求失敗：%w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("API 回傳狀態碼 %d", resp.StatusCode)
    }

    var user GitHubUser
    if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
        return nil, fmt.Errorf("解析 JSON 失敗：%w", err)
    }

    return &user, nil
}

func main() {
    user, err := getGitHubUser("golang")
    if err != nil {
        fmt.Printf("失敗：%v\n", err)
        return
    }

    fmt.Printf("使用者：%s\n", user.Login)
    fmt.Printf("名稱：%s\n", user.Name)
    fmt.Printf("追蹤者：%d\n", user.Followers)
}
```

---

### 2-5 常見錯誤與注意事項

| 問題 | 原因 | 解法 |
| :--- | :--- | :--- |
| 程式卡住不回應 | 使用沒有 Timeout 的預設 Client | 自訂 `http.Client{Timeout: ...}` |
| 連線數持續增長 | 忘記 `resp.Body.Close()` | 使用 `defer resp.Body.Close()` |
| 每次請求都很慢 | 每次建立新的 `http.Client` | 宣告為全域變數重複使用 |
| 收到 200 但 Body 是空的 | Body 已被讀取過 | Body 只能讀一次，先存到變數 |
| JSON 欄位都是零值 | struct tag 名稱對不上 | 確認 `json:"field_name"` 正確 |

---

## 3. Gin 框架入門

### 3-1 為什麼用 Gin（vs 原生 net/http）

原生 `net/http` 雖然夠用，但在實際開發中有幾個不便之處：

| 功能 | 原生 net/http | Gin |
| :--- | :--- | :--- |
| 路徑參數（`/users/:id`） | 不支援，需手動解析 | 原生支援 |
| HTTP 方法路由（GET/POST 分開） | 需手動判斷 `r.Method` | 原生支援 |
| 自動解析 JSON Body | 需手動 `json.Unmarshal` | `ShouldBindJSON` 一行搞定 |
| 請求驗證 | 需手動撰寫 | struct tag 自動驗證 |
| 路由群組與 Middleware | 需手動串接 | 原生支援 |
| 效能 | 普通 | 比原生快（httprouter 底層） |

---

### 3-2 安裝與最簡範例

```bash
go get github.com/gin-gonic/gin
```

```go
package main

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.Default() // 包含 Logger 和 Recovery middleware

    r.GET("/ping", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "message": "pong",
        })
    })

    r.Run(":8080") // 監聽 0.0.0.0:8080
}
```

```text
輸出（終端機）：
[GIN-debug] GET    /ping                     --> main.main.func1 (3 handlers)
[GIN-debug] [WARNING] Creating an engine instance with the Logger and Recovery middleware already attached.
[GIN-debug] Listening and serving HTTP on :8080
```

```text
訪問 http://localhost:8080/ping 回應：
{"message":"pong"}
```

---

### 3-3 路由：GET、POST、PUT、DELETE、群組

```go
package main

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.Default()

    // 基本 HTTP 方法
    r.GET("/users", listUsers)
    r.POST("/users", createUser)
    r.PUT("/users/:id", updateUser)
    r.DELETE("/users/:id", deleteUser)

    // 路由群組：統一前綴與 Middleware
    api := r.Group("/api/v1")
    {
        users := api.Group("/users")
        {
            users.GET("", listUsers)
            users.POST("", createUser)
            users.GET("/:id", getUser)
            users.PUT("/:id", updateUser)
            users.DELETE("/:id", deleteUser)
        }

        products := api.Group("/products")
        {
            products.GET("", listProducts)
            products.POST("", createProduct)
        }
    }

    r.Run(":8080")
}

func listUsers(c *gin.Context)   { c.JSON(http.StatusOK, gin.H{"users": []string{}}) }
func createUser(c *gin.Context)  { c.JSON(http.StatusCreated, gin.H{"message": "created"}) }
func getUser(c *gin.Context)     { c.JSON(http.StatusOK, gin.H{"user": "Alice"}) }
func updateUser(c *gin.Context)  { c.JSON(http.StatusOK, gin.H{"message": "updated"}) }
func deleteUser(c *gin.Context)  { c.JSON(http.StatusOK, gin.H{"message": "deleted"}) }
func listProducts(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"products": []string{}}) }
func createProduct(c *gin.Context) { c.JSON(http.StatusCreated, gin.H{"message": "created"}) }
```

---

### 3-4 路徑參數與 Query 參數

```go
package main

import (
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.Default()

    // 路徑參數：/users/123
    r.GET("/users/:id", func(c *gin.Context) {
        idStr := c.Param("id") // 取得 :id 的值，型別為 string
        id, err := strconv.Atoi(idStr)
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "id 必須是數字"})
            return
        }
        c.JSON(http.StatusOK, gin.H{"id": id})
    })

    // 萬用路由：/files/a/b/c
    r.GET("/files/*filepath", func(c *gin.Context) {
        filepath := c.Param("filepath") // 包含開頭的 /
        c.JSON(http.StatusOK, gin.H{"filepath": filepath})
    })

    // Query 參數：/search?keyword=Go&page=1&limit=20
    r.GET("/search", func(c *gin.Context) {
        keyword := c.Query("keyword")             // 必要參數，沒有回傳空字串
        page := c.DefaultQuery("page", "1")        // 有預設值
        limit := c.DefaultQuery("limit", "20")     // 有預設值

        c.JSON(http.StatusOK, gin.H{
            "keyword": keyword,
            "page":    page,
            "limit":   limit,
        })
    })

    r.Run(":8080")
}
```

```text
訪問 /users/42 → {"id":42}
訪問 /files/images/cat.png → {"filepath":"/images/cat.png"}
訪問 /search?keyword=Go&page=2 → {"keyword":"Go","limit":"20","page":"2"}
```

---

### 3-5 請求綁定：ShouldBindJSON、ShouldBindQuery

```go
package main

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

// JSON Body 的 struct
type CreateUserRequest struct {
    Name  string `json:"name"  binding:"required,min=2,max=50"`
    Email string `json:"email" binding:"required,email"`
    Age   int    `json:"age"   binding:"gte=0,lte=150"`
}

// Query 參數的 struct
type ListUsersQuery struct {
    Page    int    `form:"page"    binding:"min=1"`
    Limit   int    `form:"limit"   binding:"min=1,max=100"`
    Keyword string `form:"keyword"`
}

func main() {
    r := gin.Default()

    // 綁定 JSON Body
    r.POST("/users", func(c *gin.Context) {
        var req CreateUserRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            return
        }
        // 使用 req.Name、req.Email、req.Age
        c.JSON(http.StatusCreated, gin.H{
            "name":  req.Name,
            "email": req.Email,
            "age":   req.Age,
        })
    })

    // 綁定 Query 參數
    r.GET("/users", func(c *gin.Context) {
        var query ListUsersQuery
        query.Page = 1  // 設定預設值
        query.Limit = 20
        if err := c.ShouldBindQuery(&query); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            return
        }
        c.JSON(http.StatusOK, gin.H{
            "page":    query.Page,
            "limit":   query.Limit,
            "keyword": query.Keyword,
        })
    })

    r.Run(":8080")
}
```

---

### 3-6 回應：c.JSON、c.String、c.File

```go
package main

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

type User struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}

func main() {
    r := gin.Default()

    // JSON 回應
    r.GET("/user/json", func(c *gin.Context) {
        user := User{ID: 1, Name: "Alice"}
        c.JSON(http.StatusOK, user)
    })

    // 純文字回應
    r.GET("/user/text", func(c *gin.Context) {
        c.String(http.StatusOK, "Hello, %s!", "Alice")
    })

    // HTML 回應（需先載入 template）
    r.GET("/user/html", func(c *gin.Context) {
        c.HTML(http.StatusOK, "user.html", gin.H{"name": "Alice"})
    })

    // 重新導向
    r.GET("/old-path", func(c *gin.Context) {
        c.Redirect(http.StatusMovedPermanently, "/user/json")
    })

    // 下載檔案
    r.GET("/download", func(c *gin.Context) {
        c.File("./static/report.pdf")
    })

    // 自訂 Header 的回應
    r.GET("/user/custom", func(c *gin.Context) {
        c.Header("X-Custom-Header", "custom-value")
        c.JSON(http.StatusOK, gin.H{"message": "ok"})
    })

    r.Run(":8080")
}
```

---

## 4. Gin Middleware

### 4-1 Middleware 的執行順序（圖解）

Middleware 像洋蔥層，請求從外到內穿越，回應從內到外返回：

```text
請求進來
    │
    ▼
┌─────────────────────────────┐
│  Middleware 1（如 Logger）   │
│  ┌───────────────────────┐  │
│  │ Middleware 2（如 Auth）│  │
│  │  ┌─────────────────┐  │  │
│  │  │   Handler 執行  │  │  │
│  │  └─────────────────┘  │  │
│  │    ↑ c.Next() 返回    │  │
│  └───────────────────────┘  │
│    ↑ c.Next() 返回          │
└─────────────────────────────┘
    │
    ▼
回應送出

c.Next() 之前的程式碼：請求進來時執行
c.Next() 之後的程式碼：Handler 執行完後執行
```

---

### 4-2 內建 Middleware：Logger、Recovery

```go
package main

import (
    "github.com/gin-gonic/gin"
)

func main() {
    // gin.Default() 等同於以下程式碼：
    r := gin.New()
    r.Use(gin.Logger())   // 記錄每個請求的方法、路徑、狀態碼、耗時
    r.Use(gin.Recovery()) // 捕捉 panic，回傳 500，避免整個 Server 崩潰

    r.GET("/ping", func(c *gin.Context) {
        // 即使這裡發生 panic，Recovery 也會幫你攔截
        c.JSON(200, gin.H{"message": "pong"})
    })

    r.Run(":8080")
}
```

> **建議**：生產環境必須掛載 `gin.Recovery()`，否則任何未捕捉的 panic 都會讓整個 Server 當掉。

---

### 4-3 自訂 Middleware：認證、Request ID、CORS

```go
package main

import (
    "fmt"
    "net/http"
    "strings"
    "time"

    "github.com/gin-gonic/gin"
)

// 1. 認證 Middleware
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "缺少 Authorization Header",
            })
            return
        }

        if !strings.HasPrefix(authHeader, "Bearer ") {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "Authorization 格式錯誤，需使用 Bearer token",
            })
            return
        }

        token := strings.TrimPrefix(authHeader, "Bearer ")
        // 實際驗證 token 的邏輯（此處簡化）
        if token != "valid-token" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "Token 無效",
            })
            return
        }

        // 將使用者 ID 存入 Context，供後續 Handler 使用
        c.Set("userID", 42)
        c.Next() // 繼續往下執行
    }
}

// 2. Request ID Middleware
func RequestIDMiddleware() gin.HandlerFunc {
    counter := 0
    return func(c *gin.Context) {
        counter++
        requestID := fmt.Sprintf("req-%d-%d", time.Now().UnixNano(), counter)
        c.Set("requestID", requestID)
        c.Header("X-Request-ID", requestID)
        c.Next()
    }
}

// 3. CORS Middleware
func CORSMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("Access-Control-Allow-Origin", "*")
        c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID")

        // 處理 OPTIONS 預檢請求
        if c.Request.Method == http.MethodOptions {
            c.AbortWithStatus(http.StatusNoContent)
            return
        }

        c.Next()
    }
}

// 4. 計時 Middleware
func TimingMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        c.Next() // 執行後續 Handler
        elapsed := time.Since(start)
        // c.Next() 之後的程式碼在 Handler 完成後執行
        fmt.Printf("[Timing] %s %s 耗時 %v\n", c.Request.Method, c.Request.URL.Path, elapsed)
    }
}

func main() {
    r := gin.New()
    r.Use(gin.Recovery())

    // 全域 Middleware
    r.Use(CORSMiddleware())
    r.Use(RequestIDMiddleware())
    r.Use(TimingMiddleware())

    // 公開路由（不需認證）
    r.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"status": "ok"})
    })

    // 受保護路由（需要認證）
    protected := r.Group("/api")
    protected.Use(AuthMiddleware())
    {
        protected.GET("/profile", func(c *gin.Context) {
            userID, _ := c.Get("userID")
            c.JSON(http.StatusOK, gin.H{"userID": userID})
        })
    }

    r.Run(":8080")
}
```

---

### 4-4 c.Set / c.Get 傳遞資料給後續 Handler

```go
package main

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

// 定義常數 Key，避免散落的字串常數
const (
    ContextKeyUserID   = "userID"
    ContextKeyUsername = "username"
    ContextKeyRole     = "role"
)

// 模擬從 token 解析使用者資訊的 Middleware
func ParseUserMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 實際應從 JWT token 解析
        c.Set(ContextKeyUserID, int64(123))
        c.Set(ContextKeyUsername, "Alice")
        c.Set(ContextKeyRole, "admin")
        c.Next()
    }
}

func profileHandler(c *gin.Context) {
    // 從 Context 取出 Middleware 設定的值
    userID, exists := c.Get(ContextKeyUserID)
    if !exists {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "找不到使用者資訊"})
        return
    }

    username, _ := c.Get(ContextKeyUsername)
    role, _ := c.Get(ContextKeyRole)

    c.JSON(http.StatusOK, gin.H{
        "userID":   userID,
        "username": username,
        "role":     role,
    })
}

func main() {
    r := gin.Default()

    api := r.Group("/api")
    api.Use(ParseUserMiddleware())
    {
        api.GET("/profile", profileHandler)
    }

    r.Run(":8080")
}
```

> **注意**：`c.Get` 回傳的型別是 `any`，需要做型別斷言。若斷言失敗不會 panic，但得到的值會是 nil。建議使用 `c.GetInt64`、`c.GetString` 等型別安全的方法。

---

### 4-5 c.Abort 與 c.AbortWithStatusJSON 的選擇

```go
package main

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

// 錯誤示範：c.Abort 後繼續寫回應
func badMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Abort()
        // ❌ 危險：Abort 後又呼叫 JSON，會造成回應被寫兩次的問題
        c.JSON(http.StatusUnauthorized, gin.H{"error": "未授權"})
    }
}

// 正確寫法：使用 AbortWithStatusJSON
func goodMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            // ✅ 正確：AbortWithStatusJSON 同時停止後續 Handler 並寫回應
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "未授權",
            })
            return // return 確保 Middleware 函數也停止執行
        }
        c.Next()
    }
}

func main() {
    r := gin.Default()

    r.GET("/protected", goodMiddleware(), func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"message": "受保護的資源"})
    })

    r.Run(":8080")
}
```

> **警告**：呼叫 `c.Abort()` 後，若再呼叫 `c.JSON()`，兩個寫入操作都會執行，造成 HTTP 回應損毀。正確做法是使用 `c.AbortWithStatusJSON()` 並加上 `return`。

---

## 5. 統一回應格式

### 5-1 定義統一 Response struct

建立 `pkg/response/response.go`：

```go
package response

// Response 是所有 API 的統一回應格式
type Response struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
    Data    any    `json:"data,omitempty"`
}
```

---

### 5-2 Success / Fail 輔助函數

```go
package main

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

// Response 統一回應格式
type Response struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
    Data    any    `json:"data,omitempty"`
}

// Success 回傳成功回應
func Success(c *gin.Context, data any) {
    c.JSON(http.StatusOK, Response{
        Code:    0,
        Message: "ok",
        Data:    data,
    })
}

// Created 回傳建立成功回應
func Created(c *gin.Context, data any) {
    c.JSON(http.StatusCreated, Response{
        Code:    0,
        Message: "created",
        Data:    data,
    })
}

// Fail 回傳失敗回應
func Fail(c *gin.Context, httpStatus int, code int, msg string) {
    c.JSON(httpStatus, Response{
        Code:    code,
        Message: msg,
    })
}

// 使用範例
type User struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}

func getUserHandler(c *gin.Context) {
    user := &User{ID: 1, Name: "Alice"}
    Success(c, user)
}

func main() {
    r := gin.Default()
    r.GET("/user", getUserHandler)
    r.Run(":8080")
}
```

```json
成功回應範例：
{
    "code": 0,
    "message": "ok",
    "data": {
        "id": 1,
        "name": "Alice"
    }
}

失敗回應範例：
{
    "code": 40001,
    "message": "使用者不存在"
}
```

---

### 5-3 業務錯誤碼設計

```go
package main

import (
    "errors"
    "net/http"

    "github.com/gin-gonic/gin"
)

// 業務錯誤碼常數
const (
    CodeSuccess         = 0
    CodeBadRequest      = 40000
    CodeUnauthorized    = 40001
    CodeForbidden       = 40003
    CodeUserNotFound    = 40401
    CodeProductNotFound = 40402
    CodeDuplicateEmail  = 40901
    CodeInternalError   = 50000
)

// 定義業務錯誤
var (
    ErrUserNotFound    = errors.New("user not found")
    ErrProductNotFound = errors.New("product not found")
    ErrDuplicateEmail  = errors.New("email already exists")
    ErrUnauthorized    = errors.New("unauthorized")
)

// Response 統一格式
type Response struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
    Data    any    `json:"data,omitempty"`
}

func Fail(c *gin.Context, httpStatus int, code int, msg string) {
    c.JSON(httpStatus, Response{Code: code, Message: msg})
}

func Success(c *gin.Context, data any) {
    c.JSON(http.StatusOK, Response{Code: CodeSuccess, Message: "ok", Data: data})
}

// Handler 層將 service error 對應到 HTTP 回應
func handleServiceError(c *gin.Context, err error) {
    switch {
    case errors.Is(err, ErrUserNotFound):
        Fail(c, http.StatusNotFound, CodeUserNotFound, "使用者不存在")
    case errors.Is(err, ErrProductNotFound):
        Fail(c, http.StatusNotFound, CodeProductNotFound, "產品不存在")
    case errors.Is(err, ErrDuplicateEmail):
        Fail(c, http.StatusConflict, CodeDuplicateEmail, "Email 已被使用")
    case errors.Is(err, ErrUnauthorized):
        Fail(c, http.StatusUnauthorized, CodeUnauthorized, "未授權")
    default:
        Fail(c, http.StatusInternalServerError, CodeInternalError, "伺服器錯誤")
    }
}

func getUserHandler(c *gin.Context) {
    // 模擬 service 回傳錯誤
    err := ErrUserNotFound

    if err != nil {
        handleServiceError(c, err)
        return
    }

    Success(c, nil)
}

func main() {
    r := gin.Default()
    r.GET("/user", getUserHandler)
    r.Run(":8080")
}
```

---

## 6. 請求驗證

### 6-1 binding tag 驗證規則（required、min、max、email、gte、lte）

```go
package main

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

type CreateUserRequest struct {
    Name     string `json:"name"      binding:"required,min=2,max=50"`
    Email    string `json:"email"     binding:"required,email"`
    Age      int    `json:"age"       binding:"gte=0,lte=150"`
    Password string `json:"password"  binding:"required,min=8"`
    Role     string `json:"role"      binding:"required,oneof=admin user guest"`
    Website  string `json:"website"   binding:"omitempty,url"`
}

type ListProductsQuery struct {
    Page     int     `form:"page"      binding:"min=1"`
    Limit    int     `form:"limit"     binding:"min=1,max=100"`
    MinPrice float64 `form:"min_price" binding:"gte=0"`
    MaxPrice float64 `form:"max_price" binding:"gtefield=MinPrice"`
}

func main() {
    r := gin.Default()

    r.POST("/users", func(c *gin.Context) {
        var req CreateUserRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            return
        }
        c.JSON(http.StatusCreated, gin.H{"name": req.Name, "email": req.Email})
    })

    r.GET("/products", func(c *gin.Context) {
        query := ListProductsQuery{Page: 1, Limit: 20}
        if err := c.ShouldBindQuery(&query); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            return
        }
        c.JSON(http.StatusOK, gin.H{"page": query.Page, "limit": query.Limit})
    })

    r.Run(":8080")
}
```

常用 binding tag 對照表：

| Tag | 說明 | 範例 |
| :--- | :--- | :--- |
| `required` | 必填，不能為零值 | `binding:"required"` |
| `min=N` | 字串最小長度 / 數字最小值 | `binding:"min=2"` |
| `max=N` | 字串最大長度 / 數字最大值 | `binding:"max=50"` |
| `gte=N` | 數字 >= N | `binding:"gte=0"` |
| `lte=N` | 數字 <= N | `binding:"lte=100"` |
| `email` | 必須是合法 Email 格式 | `binding:"email"` |
| `url` | 必須是合法 URL | `binding:"url"` |
| `oneof=a b c` | 必須是指定值之一 | `binding:"oneof=admin user"` |
| `omitempty` | 若為零值則跳過驗證 | `binding:"omitempty,url"` |
| `len=N` | 長度必須等於 N | `binding:"len=11"` |

---

### 6-2 驗證失敗的錯誤格式化

validator 預設的錯誤訊息對前端不友善，建議格式化後再回傳：

```go
package main

import (
    "fmt"
    "net/http"

    "github.com/gin-gonic/gin"
    "github.com/go-playground/validator/v10"
)

// 將 validator 的錯誤轉換成友善的訊息
func formatValidationErrors(err error) []string {
    var messages []string

    validationErrors, ok := err.(validator.ValidationErrors)
    if !ok {
        messages = append(messages, err.Error())
        return messages
    }

    for _, fieldErr := range validationErrors {
        var msg string
        switch fieldErr.Tag() {
        case "required":
            msg = fmt.Sprintf("%s 為必填欄位", fieldErr.Field())
        case "min":
            msg = fmt.Sprintf("%s 最少需要 %s 個字元", fieldErr.Field(), fieldErr.Param())
        case "max":
            msg = fmt.Sprintf("%s 最多允許 %s 個字元", fieldErr.Field(), fieldErr.Param())
        case "email":
            msg = fmt.Sprintf("%s 必須是合法的 Email 格式", fieldErr.Field())
        case "gte":
            msg = fmt.Sprintf("%s 必須大於或等於 %s", fieldErr.Field(), fieldErr.Param())
        case "lte":
            msg = fmt.Sprintf("%s 必須小於或等於 %s", fieldErr.Field(), fieldErr.Param())
        case "oneof":
            msg = fmt.Sprintf("%s 必須是 [%s] 其中之一", fieldErr.Field(), fieldErr.Param())
        default:
            msg = fmt.Sprintf("%s 驗證失敗（規則：%s）", fieldErr.Field(), fieldErr.Tag())
        }
        messages = append(messages, msg)
    }

    return messages
}

type CreateProductRequest struct {
    Name  string  `json:"name"  binding:"required,min=1,max=100"`
    Price float64 `json:"price" binding:"required,gte=0"`
    Stock int     `json:"stock" binding:"gte=0"`
}

func main() {
    r := gin.Default()

    r.POST("/products", func(c *gin.Context) {
        var req CreateProductRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{
                "code":   40000,
                "errors": formatValidationErrors(err),
            })
            return
        }
        c.JSON(http.StatusCreated, gin.H{"name": req.Name, "price": req.Price})
    })

    r.Run(":8080")
}
```

```json
驗證失敗的回應：
{
    "code": 40000,
    "errors": [
        "Name 為必填欄位",
        "Price 必須大於或等於 0"
    ]
}
```

---

### 6-3 自訂驗證器

```go
package main

import (
    "net/http"
    "regexp"
    "unicode"

    "github.com/gin-gonic/gin"
    "github.com/go-playground/validator/v10"
)

// 自訂驗證：台灣手機號碼（09 開頭，共 10 碼）
var taiwanPhoneRegex = regexp.MustCompile(`^09\d{8}$`)

func validateTaiwanPhone(fl validator.FieldLevel) bool {
    phone := fl.Field().String()
    return taiwanPhoneRegex.MatchString(phone)
}

// 自訂驗證：密碼強度（至少含一個大寫、一個數字）
func validateStrongPassword(fl validator.FieldLevel) bool {
    password := fl.Field().String()
    hasUpper := false
    hasDigit := false
    for _, ch := range password {
        if unicode.IsUpper(ch) {
            hasUpper = true
        }
        if unicode.IsDigit(ch) {
            hasDigit = true
        }
    }
    return hasUpper && hasDigit
}

type RegisterRequest struct {
    Name     string `json:"name"     binding:"required,min=2"`
    Phone    string `json:"phone"    binding:"required,taiwan_phone"`
    Password string `json:"password" binding:"required,min=8,strong_password"`
}

func main() {
    r := gin.Default()

    // 取得 validator 實例並註冊自訂規則
    if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
        v.RegisterValidation("taiwan_phone", validateTaiwanPhone)
        v.RegisterValidation("strong_password", validateStrongPassword)
    }

    r.POST("/register", func(c *gin.Context) {
        var req RegisterRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            return
        }
        c.JSON(http.StatusCreated, gin.H{"message": "註冊成功"})
    })

    r.Run(":8080")
}
```

> **注意**：上方範例需要引入 `"github.com/gin-gonic/gin/binding"`，完整的自訂驗證器需搭配 Gin 的 `binding.Validator` 介面。

---

## 7. RESTful API 設計規範

### 7-1 路由命名慣例

RESTful API 路由以「資源」為中心，動詞由 HTTP 方法表達：

```text
資源：users（使用者）

GET    /users          → 列出所有使用者
POST   /users          → 建立新使用者
GET    /users/:id      → 取得特定使用者
PUT    /users/:id      → 完整更新特定使用者
PATCH  /users/:id      → 部分更新特定使用者
DELETE /users/:id      → 刪除特定使用者

巢狀資源：
GET    /users/:id/orders      → 取得某使用者的所有訂單
POST   /users/:id/orders      → 為某使用者建立訂單
GET    /users/:id/orders/:oid → 取得某使用者的特定訂單
```

路由命名規則：

| 規則 | 正確範例 | 錯誤範例 |
| :--- | :--- | :--- |
| 使用名詞（複數） | `/users` | `/getUsers`、`/user` |
| 全小寫，用 `-` 分隔 | `/product-categories` | `/productCategories` |
| 版本放在前綴 | `/api/v1/users` | `/users/v1` |
| 動作用 HTTP 方法表達 | `DELETE /users/:id` | `POST /users/:id/delete` |

---

### 7-2 HTTP 狀態碼選擇

```go
package main

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.Default()

    // 200 OK：查詢、更新成功
    r.GET("/users/:id", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"id": 1, "name": "Alice"})
    })

    // 201 Created：建立資源成功（建議同時回傳新資源）
    r.POST("/users", func(c *gin.Context) {
        c.JSON(http.StatusCreated, gin.H{"id": 2, "name": "Bob"})
    })

    // 204 No Content：刪除成功（不需要回傳內容）
    r.DELETE("/users/:id", func(c *gin.Context) {
        c.Status(http.StatusNoContent)
    })

    // 400 Bad Request：請求格式錯誤、驗證失敗
    r.POST("/bad", func(c *gin.Context) {
        c.JSON(http.StatusBadRequest, gin.H{"error": "格式錯誤"})
    })

    // 401 Unauthorized：未帶 Token 或 Token 無效
    r.GET("/secret", func(c *gin.Context) {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "請先登入"})
    })

    // 403 Forbidden：有登入但沒有權限
    r.DELETE("/admin/users/:id", func(c *gin.Context) {
        c.JSON(http.StatusForbidden, gin.H{"error": "權限不足"})
    })

    // 404 Not Found：資源不存在
    r.GET("/not-exist", func(c *gin.Context) {
        c.JSON(http.StatusNotFound, gin.H{"error": "資源不存在"})
    })

    // 409 Conflict：資源衝突（如 Email 重複）
    r.POST("/duplicate", func(c *gin.Context) {
        c.JSON(http.StatusConflict, gin.H{"error": "Email 已存在"})
    })

    // 500 Internal Server Error：伺服器內部錯誤
    r.GET("/error", func(c *gin.Context) {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "伺服器錯誤"})
    })

    r.Run(":8080")
}
```

狀態碼速查表：

| 狀態碼 | 名稱 | 使用情境 |
| :--- | :--- | :--- |
| 200 | OK | 查詢、更新成功 |
| 201 | Created | 建立資源成功 |
| 204 | No Content | 刪除成功，無回傳內容 |
| 400 | Bad Request | 格式錯誤、驗證失敗 |
| 401 | Unauthorized | 未認證或 Token 無效 |
| 403 | Forbidden | 已認證但無權限 |
| 404 | Not Found | 資源不存在 |
| 409 | Conflict | 資源衝突（重複資料） |
| 422 | Unprocessable Entity | 格式正確但語意錯誤 |
| 500 | Internal Server Error | 伺服器內部錯誤 |

---

### 7-3 分頁設計

```go
package main

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

// PageRequest 分頁請求參數
type PageRequest struct {
    Page  int `form:"page"  binding:"min=1"`
    Limit int `form:"limit" binding:"min=1,max=100"`
}

// 設定預設值
func (p *PageRequest) SetDefaults() {
    if p.Page == 0 {
        p.Page = 1
    }
    if p.Limit == 0 {
        p.Limit = 20
    }
}

// Offset 計算資料庫查詢的偏移量
func (p *PageRequest) Offset() int {
    return (p.Page - 1) * p.Limit
}

// PageResponse 分頁回應格式
type PageResponse struct {
    Items      any `json:"items"`
    Total      int `json:"total"`
    Page       int `json:"page"`
    Limit      int `json:"limit"`
    TotalPages int `json:"total_pages"`
}

// NewPageResponse 建立分頁回應
func NewPageResponse(items any, total int, req PageRequest) PageResponse {
    totalPages := total / req.Limit
    if total%req.Limit > 0 {
        totalPages++
    }
    return PageResponse{
        Items:      items,
        Total:      total,
        Page:       req.Page,
        Limit:      req.Limit,
        TotalPages: totalPages,
    }
}

type Product struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}

func main() {
    r := gin.Default()

    r.GET("/products", func(c *gin.Context) {
        var req PageRequest
        req.SetDefaults()
        if err := c.ShouldBindQuery(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            return
        }

        // 模擬資料庫查詢結果
        products := []Product{
            {ID: 1, Name: "商品A"},
            {ID: 2, Name: "商品B"},
        }
        total := 100 // 模擬總筆數

        c.JSON(http.StatusOK, NewPageResponse(products, total, req))
    })

    r.Run(":8080")
}
```

```json
GET /products?page=2&limit=10 的回應：
{
    "items": [
        {"id": 1, "name": "商品A"},
        {"id": 2, "name": "商品B"}
    ],
    "total": 100,
    "page": 2,
    "limit": 10,
    "total_pages": 10
}
```

---

### 7-4 API 版本控制

```go
package main

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

func setupV1Routes(r *gin.Engine) {
    v1 := r.Group("/api/v1")
    {
        v1.GET("/users", func(c *gin.Context) {
            c.JSON(http.StatusOK, gin.H{"version": "v1", "users": []string{}})
        })
        v1.GET("/products", func(c *gin.Context) {
            c.JSON(http.StatusOK, gin.H{"version": "v1", "products": []string{}})
        })
    }
}

func setupV2Routes(r *gin.Engine) {
    v2 := r.Group("/api/v2")
    {
        // v2 可能有不同的回應格式或新增欄位
        v2.GET("/users", func(c *gin.Context) {
            c.JSON(http.StatusOK, gin.H{
                "version": "v2",
                "data":    gin.H{"users": []string{}},
                "meta":    gin.H{"total": 0},
            })
        })
    }
}

func main() {
    r := gin.Default()

    setupV1Routes(r)
    setupV2Routes(r)

    r.Run(":8080")
}
```

版本控制方式比較：

| 方式 | 範例 | 優點 | 缺點 |
| :--- | :--- | :--- | :--- |
| URL 路徑版本 | `/api/v1/users` | 直觀、易測試 | URL 較長 |
| Header 版本 | `Accept: application/vnd.api+json;version=1` | URL 簡潔 | 不易手動測試 |
| Query 版本 | `/users?version=1` | 簡單 | 不符合 REST 精神 |

> **建議**：大多數專案使用 URL 路徑版本（`/api/v1/`），最直觀且易於除錯。

---

## 8. 常見問題與陷阱

### 8-1 ShouldBindJSON vs BindJSON 差異

```go
package main

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

type LoginRequest struct {
    Email    string `json:"email"    binding:"required,email"`
    Password string `json:"password" binding:"required,min=8"`
}

func main() {
    r := gin.Default()

    // ❌ 錯誤示範：使用 BindJSON
    // BindJSON 驗證失敗時會自動呼叫 c.AbortWithError 並寫入 400
    // 你的自訂錯誤回應完全不會被執行
    r.POST("/login/bad", func(c *gin.Context) {
        var req LoginRequest
        if err := c.BindJSON(&req); err != nil {
            // 這段 JSON 回應不一定能正確送出，因為 BindJSON 可能已先寫入回應
            c.JSON(http.StatusBadRequest, gin.H{"error": "自訂錯誤訊息"})
            return
        }
        c.JSON(http.StatusOK, gin.H{"message": "登入成功"})
    })

    // ✅ 正確示範：使用 ShouldBindJSON
    // ShouldBindJSON 只回傳 error，不自動寫回應，你完全掌控錯誤格式
    r.POST("/login/good", func(c *gin.Context) {
        var req LoginRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{
                "code":  40000,
                "error": err.Error(),
            })
            return
        }
        c.JSON(http.StatusOK, gin.H{"message": "登入成功"})
    })

    r.Run(":8080")
}
```

| 方法 | 驗證失敗行為 | 適用情境 |
| :--- | :--- | :--- |
| `BindJSON` | 自動寫 400 回應，你失去控制 | 幾乎不建議使用 |
| `ShouldBindJSON` | 只回傳 error，你自行處理 | 所有情況均優先使用 |

---

### 8-2 c.Abort 後繼續寫回應的問題

```go
package main

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

// ❌ 危險寫法
func badAuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "未授權"}) // 先寫回應
            c.Abort()                                                  // 再中止，但 JSON 已送出
            // 如果下面還有程式碼，Header 已送出無法再改
            return
        }
        c.Next()
    }
}

// ✅ 正確寫法
func goodAuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            // AbortWithStatusJSON = 寫回應 + 中止，一次完成
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "未授權",
            })
            return
        }
        c.Next()
    }
}

func main() {
    r := gin.Default()

    r.GET("/protected",
        goodAuthMiddleware(),
        func(c *gin.Context) {
            c.JSON(http.StatusOK, gin.H{"message": "ok"})
        },
    )

    r.Run(":8080")
}
```

---

### 8-3 大量上傳檔案的處理

```go
package main

import (
    "fmt"
    "net/http"
    "path/filepath"

    "github.com/gin-gonic/gin"
)

const maxUploadSize = 10 << 20 // 10 MB

func main() {
    r := gin.Default()

    // 設定上傳大小限制
    r.MaxMultipartMemory = maxUploadSize

    // 單一檔案上傳
    r.POST("/upload", func(c *gin.Context) {
        file, err := c.FormFile("file")
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "取得檔案失敗"})
            return
        }

        // 驗證副檔名
        ext := filepath.Ext(file.Filename)
        allowed := map[string]bool{".jpg": true, ".png": true, ".pdf": true}
        if !allowed[ext] {
            c.JSON(http.StatusBadRequest, gin.H{"error": "不支援的檔案類型"})
            return
        }

        // 驗證檔案大小
        if file.Size > maxUploadSize {
            c.JSON(http.StatusBadRequest, gin.H{"error": "檔案超過 10MB 限制"})
            return
        }

        savePath := fmt.Sprintf("./uploads/%s", file.Filename)
        if err := c.SaveUploadedFile(file, savePath); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "儲存檔案失敗"})
            return
        }

        c.JSON(http.StatusOK, gin.H{
            "filename": file.Filename,
            "size":     file.Size,
            "path":     savePath,
        })
    })

    // 多檔案上傳
    r.POST("/upload/multiple", func(c *gin.Context) {
        form, err := c.MultipartForm()
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "解析表單失敗"})
            return
        }

        files := form.File["files"]
        var uploaded []string

        for _, file := range files {
            savePath := fmt.Sprintf("./uploads/%s", file.Filename)
            if err := c.SaveUploadedFile(file, savePath); err != nil {
                c.JSON(http.StatusInternalServerError, gin.H{
                    "error": fmt.Sprintf("儲存 %s 失敗", file.Filename),
                })
                return
            }
            uploaded = append(uploaded, file.Filename)
        }

        c.JSON(http.StatusOK, gin.H{
            "uploaded": uploaded,
            "count":    len(uploaded),
        })
    })

    r.Run(":8080")
}
```

> **警告**：永遠不要直接使用使用者上傳的檔案名稱作為儲存路徑，可能遭受路徑遍歷攻擊（Path Traversal）。應使用 UUID 或亂數產生安全的檔案名稱。

---

### 8-4 CORS 設定

```go
package main

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

// 自訂 CORS Middleware（不依賴第三方套件）
func CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
    originSet := make(map[string]bool)
    for _, o := range allowedOrigins {
        originSet[o] = true
    }

    return func(c *gin.Context) {
        origin := c.Request.Header.Get("Origin")

        // 只允許白名單內的 Origin
        if originSet[origin] || len(allowedOrigins) == 0 {
            c.Header("Access-Control-Allow-Origin", origin)
        }

        c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID")
        c.Header("Access-Control-Allow-Credentials", "true")
        c.Header("Access-Control-Max-Age", "86400") // 24 小時快取預檢結果

        if c.Request.Method == http.MethodOptions {
            c.AbortWithStatus(http.StatusNoContent)
            return
        }

        c.Next()
    }
}

func main() {
    r := gin.Default()

    // 設定允許的 Origin 白名單
    allowedOrigins := []string{
        "http://localhost:3000",
        "https://www.example.com",
    }

    r.Use(CORSMiddleware(allowedOrigins))

    r.GET("/api/data", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"data": "ok"})
    })

    r.Run(":8080")
}
```

> **警告**：不要在生產環境設定 `Access-Control-Allow-Origin: *`（萬用字元），這會允許任何網站對你的 API 發起跨域請求，可能導致安全漏洞。應明確列出允許的 Origin 白名單。

---

## 9. 總結對照表

### net/http 原生 vs Gin 框架

| 功能 | net/http 原生 | Gin |
| :--- | :--- | :--- |
| 路徑參數 | 需手動解析 | `c.Param("id")` |
| Query 參數 | `r.URL.Query().Get("key")` | `c.Query("key")` |
| 解析 JSON Body | `json.NewDecoder(r.Body).Decode` | `c.ShouldBindJSON(&req)` |
| 請求驗證 | 手動撰寫 | struct tag 自動驗證 |
| 回傳 JSON | `json.NewEncoder(w).Encode` | `c.JSON(status, data)` |
| Middleware | 手動函數包裹 | `r.Use(middleware)` |
| 路由群組 | 手動管理前綴 | `r.Group("/api/v1")` |
| Recovery（防 panic） | 手動實作 | `gin.Recovery()` |

### 常用 HTTP 狀態碼

| 狀態碼 | 常數 | 使用時機 |
| :--- | :--- | :--- |
| 200 | `http.StatusOK` | 查詢、更新成功 |
| 201 | `http.StatusCreated` | 建立資源成功 |
| 204 | `http.StatusNoContent` | 刪除成功 |
| 400 | `http.StatusBadRequest` | 請求格式錯誤 |
| 401 | `http.StatusUnauthorized` | 未認證 |
| 403 | `http.StatusForbidden` | 無權限 |
| 404 | `http.StatusNotFound` | 資源不存在 |
| 409 | `http.StatusConflict` | 資源衝突 |
| 500 | `http.StatusInternalServerError` | 伺服器錯誤 |

### Gin Handler 設計原則

| 層級 | 職責 | 禁止事項 |
| :--- | :--- | :--- |
| Handler | 解析請求 → 呼叫 Service → 回傳回應 | 不寫業務邏輯、不直接操作 DB |
| Service | 業務邏輯，接受 `context.Context` | 不接受 `*gin.Context` |
| Repository | 資料存取，接受 `context.Context` | 不接受 `*gin.Context` |
| Middleware | 認證、日誌、限流、CORS | 不寫業務邏輯 |

### 常見陷阱速查

| 陷阱 | 症狀 | 解法 |
| :--- | :--- | :--- |
| 忘記 `resp.Body.Close()` | 連線洩漏，程式越跑越慢 | 使用 `defer resp.Body.Close()` |
| 使用預設 HTTP Client | 程式卡死，無法逾時 | 自訂 `http.Client{Timeout: ...}` |
| 使用 `BindJSON` | 無法自訂錯誤格式 | 改用 `ShouldBindJSON` |
| `c.Abort()` 後又寫回應 | 回應損毀或 panic | 改用 `c.AbortWithStatusJSON()` |
| `c.Set` Key 用裸字串 | Key 打錯難以察覺 | 定義常數 `const ContextKeyXxx = "..."` |
| CORS 設 `*` | 安全漏洞 | 明確列出 Origin 白名單 |

---

[← 返回目錄](README.md)

文件更新日期：2026年6月1日
