# Go 架構設計實戰指南

[← 返回目錄](README.md)

這份文件適合有 CRUD 開發經驗、但還不熟悉如何組織大型 Go 專案架構的開發者。你將學會如何用 Clean Architecture 的概念分層，讓 Handler、Service、Repository 各司其職；如何用依賴注入（Dependency Injection）讓程式碼易於測試；如何管理多環境設定、撰寫結構化日誌，以及實作 Graceful Shutdown。讀完這份文件後，你會知道如何從零搭建一個生產等級的 Go Web 服務骨架。

---

## 1. Clean Architecture 概念

### 1-1 為什麼需要分層架構？

許多入門者寫 CRUD 時，習慣把「讀取資料庫」、「業務邏輯」和「回傳 HTTP 回應」全部塞在同一個函數裡：

```go
// 反面示範：一個函數做太多事
func CreateUserHandler(c *gin.Context) {
    var req struct {
        Name  string `json:"name"`
        Email string `json:"email"`
    }
    c.ShouldBindJSON(&req)

    // 直接在 handler 操作資料庫
    db.Exec("INSERT INTO users (name, email) VALUES (?, ?)", req.Name, req.Email)

    // 直接在 handler 寫業務邏輯
    if req.Email == "" {
        c.JSON(400, gin.H{"error": "email required"})
        return
    }

    c.JSON(201, gin.H{"ok": true})
}
```

這樣寫有幾個問題：

* **無法單元測試**：想測業務邏輯，必須真的連資料庫
* **難以替換實作**：換成 PostgreSQL 時，要改的地方分散各處
* **職責混亂**：HTTP 細節和業務規則混在一起，閱讀困難
* **重用性差**：同樣的業務邏輯若要提供 gRPC 或 CLI 介面，要重寫

分層架構的核心思想是：**讓每一層只負責一件事，並透過介面（interface）讓各層可以獨立替換與測試**。

### 1-2 Go 中的三層架構（Handler → Service → Repository）

```text
HTTP 請求
    │
    ▼
┌─────────────────────────────────────┐
│           Handler Layer             │
│  職責：解析 HTTP 請求，呼叫 Service  │
│  知道：gin.Context、HTTP 狀態碼      │
│  不知道：資料庫、業務規則細節         │
└─────────────────┬───────────────────┘
                  │  呼叫
                  ▼
┌─────────────────────────────────────┐
│           Service Layer             │
│  職責：業務邏輯、驗證、組合資料       │
│  知道：業務規則、Repository 介面      │
│  不知道：HTTP、資料庫實作細節         │
└─────────────────┬───────────────────┘
                  │  呼叫
                  ▼
┌─────────────────────────────────────┐
│         Repository Layer            │
│  職責：資料存取（DB、Cache、外部API） │
│  知道：SQL、ORM、Redis 操作           │
│  不知道：業務邏輯、HTTP               │
└─────────────────┬───────────────────┘
                  │  操作
                  ▼
             資料庫 / 外部服務
```

請求的完整流程：

```text
Client
  │  POST /users {"name":"Alice","email":"alice@example.com"}
  ▼
Handler.CreateUser(c *gin.Context)
  │  解析 JSON → CreateUserRequest
  │  呼叫 service.CreateUser(ctx, req)
  ▼
Service.CreateUser(ctx, req)
  │  驗證業務規則（email 不能重複）
  │  呼叫 repo.FindByEmail(ctx, email)
  │  呼叫 repo.Create(ctx, user)
  ▼
Repository.Create(ctx, user)
  │  執行 INSERT SQL
  ▼
  DB 回傳新建的 User
  │
  └→ Service 拿到 User，回傳給 Handler
       │
       └→ Handler 回傳 201 Created + JSON
```

#### 每層的職責說明

| 層級 | 輸入 | 輸出 | 知道什麼 | 不知道什麼 |
| :--- | :--- | :--- | :--- | :--- |
| Handler | `*gin.Context` | HTTP 回應 | HTTP 格式、狀態碼 | SQL、業務規則 |
| Service | `context.Context` + DTO | 業務物件或 error | 業務規則、介面 | HTTP、SQL 語法 |
| Repository | `context.Context` + 業務物件 | 業務物件或 error | SQL、ORM | HTTP、業務邏輯 |

### 1-3 依賴方向規則（依賴反轉原則）

依賴方向必須永遠**由外向內**，絕對不能反過來：

```text
Handler ──depends on──▶ Service 介面
Service ──depends on──▶ Repository 介面
Repository 實作 ──implements──▶ Repository 介面

（介面由「使用方」定義，讓實作方依賴抽象而非反過來）
```

> **注意**：Repository 的介面要定義在 `service` 套件中（使用方），而不是 `repository` 套件中（實作方）。這是 Go 推薦的慣例，讓 service 只依賴自己定義的抽象，不直接依賴 repository 的具體實作。

### 1-4 專案目錄結構（完整範例）

```text
user-api/
├── cmd/
│   └── server/
│       └── main.go              # 啟動入口：初始化所有元件、啟動伺服器
├── internal/
│   ├── handler/
│   │   ├── user_handler.go      # UserHandler：處理 HTTP 請求
│   │   └── user_handler_test.go
│   ├── service/
│   │   ├── user_service.go      # UserService：業務邏輯
│   │   ├── user_service_test.go
│   │   └── errors.go            # 業務錯誤定義
│   ├── repository/
│   │   ├── user_repository.go   # UserRepository 的 MySQL 實作
│   │   └── user_repository_test.go
│   └── middleware/
│       ├── auth.go              # JWT 認證 middleware
│       ├── request_id.go        # Request ID middleware
│       └── logger.go            # 請求日誌 middleware
├── router/
│   └── router.go                # 路由集中管理
├── pkg/
│   └── response/
│       └── response.go          # 統一回應格式
├── config/
│   └── config.go                # 設定結構與載入邏輯
├── testdata/                    # 測試用靜態資料
├── .env                         # 本地環境設定（不提交 git）
├── .env.example                 # 設定範例（提交 git）
├── go.mod
└── go.sum
```

---

## 2. Repository Layer：資料存取層

### 2-1 定義 Repository 介面（在 service 層定義，不在 repository）

```go
// internal/service/user_service.go
// 介面定義在「使用方」（service 套件），而非實作方（repository 套件）
package service

import (
    "context"
    "time"
)

// User 是業務層的 User 模型
type User struct {
    ID        int64     `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

// UserRepository 定義 service 需要的資料存取能力
// 介面定義在 service 套件，讓 service 依賴抽象，不依賴具體實作
type UserRepository interface {
    Create(ctx context.Context, user *User) error
    FindByID(ctx context.Context, id int64) (*User, error)
    FindByEmail(ctx context.Context, email string) (*User, error)
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id int64) error
}
```

### 2-2 完整的 UserRepository 實作（CRUD）

```go
// internal/repository/user_repository.go
package repository

import (
    "context"
    "database/sql"
    "errors"
    "fmt"
    "time"

    "user-api/internal/service"
)

// userRepositoryImpl 是 UserRepository 介面的 MySQL 實作
type userRepositoryImpl struct {
    db *sql.DB
}

// 編譯期驗證：確保 userRepositoryImpl 實作了 service.UserRepository 介面
// 若介面方法有變動但 struct 沒跟著改，這一行會在編譯時報錯
var _ service.UserRepository = (*userRepositoryImpl)(nil)

// NewUserRepository 建立 UserRepository 實例
func NewUserRepository(db *sql.DB) service.UserRepository {
    return &userRepositoryImpl{db: db}
}

func (r *userRepositoryImpl) Create(ctx context.Context, user *User) error {
    query := `INSERT INTO users (name, email, created_at, updated_at)
              VALUES (?, ?, ?, ?)`
    now := time.Now()
    result, err := r.db.ExecContext(ctx, query, user.Name, user.Email, now, now)
    if err != nil {
        return fmt.Errorf("userRepository.Create: %w", err)
    }

    id, err := result.LastInsertId()
    if err != nil {
        return fmt.Errorf("userRepository.Create: get last insert id: %w", err)
    }

    user.ID = id
    user.CreatedAt = now
    user.UpdatedAt = now
    return nil
}

func (r *userRepositoryImpl) FindByID(ctx context.Context, id int64) (*service.User, error) {
    query := `SELECT id, name, email, created_at, updated_at
              FROM users WHERE id = ? AND deleted_at IS NULL`

    user := &service.User{}
    err := r.db.QueryRowContext(ctx, query, id).Scan(
        &user.ID, &user.Name, &user.Email, &user.CreatedAt, &user.UpdatedAt,
    )
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            // 將 sql 的錯誤轉換為業務層的錯誤
            return nil, service.ErrUserNotFound
        }
        return nil, fmt.Errorf("userRepository.FindByID: %w", err)
    }

    return user, nil
}

func (r *userRepositoryImpl) FindByEmail(ctx context.Context, email string) (*service.User, error) {
    query := `SELECT id, name, email, created_at, updated_at
              FROM users WHERE email = ? AND deleted_at IS NULL`

    user := &service.User{}
    err := r.db.QueryRowContext(ctx, query, email).Scan(
        &user.ID, &user.Name, &user.Email, &user.CreatedAt, &user.UpdatedAt,
    )
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, nil // email 不存在，回傳 nil 代表「沒找到」
        }
        return nil, fmt.Errorf("userRepository.FindByEmail: %w", err)
    }

    return user, nil
}

func (r *userRepositoryImpl) Update(ctx context.Context, user *service.User) error {
    query := `UPDATE users SET name = ?, email = ?, updated_at = ?
              WHERE id = ? AND deleted_at IS NULL`

    now := time.Now()
    result, err := r.db.ExecContext(ctx, query, user.Name, user.Email, now, user.ID)
    if err != nil {
        return fmt.Errorf("userRepository.Update: %w", err)
    }

    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return fmt.Errorf("userRepository.Update: rows affected: %w", err)
    }
    if rowsAffected == 0 {
        return service.ErrUserNotFound
    }

    user.UpdatedAt = now
    return nil
}

func (r *userRepositoryImpl) Delete(ctx context.Context, id int64) error {
    // 軟刪除：設定 deleted_at 而非真正刪除
    query := `UPDATE users SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`
    result, err := r.db.ExecContext(ctx, query, time.Now(), id)
    if err != nil {
        return fmt.Errorf("userRepository.Delete: %w", err)
    }

    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return fmt.Errorf("userRepository.Delete: rows affected: %w", err)
    }
    if rowsAffected == 0 {
        return service.ErrUserNotFound
    }

    return nil
}
```

### 2-3 為什麼介面要在使用方定義？

這是 Go 與 Java / C# 最不同的地方。在 Java 中，你通常先定義介面，再寫實作。在 Go 中，**介面是隱式實作的**，只要你的 struct 有介面要求的所有方法，就自動滿足該介面，不需要明確宣告。

因此，Go 推薦把介面定義在使用方（呼叫端），原因是：

```text
Java 慣例（不適合 Go）：
repository 套件定義 UserRepository 介面
    → service 套件 import repository，依賴 repository 套件
    → 換實作時，service 還是和 repository 套件耦合

Go 推薦方式：
service 套件定義 UserRepository 介面（只包含 service 需要的方法）
    → repository 套件的 struct 只要有這些方法就自動滿足介面
    → service 套件完全不需要 import repository 套件
    → repository 套件可以獨立替換（換成 PostgreSQL、MongoDB 都不影響 service）
```

> **建議**：介面定義在使用方，讓介面「恰好夠用」（最小介面原則）。如果 service 只需要 `FindByID`，介面就只定義 `FindByID`，不需要把所有 DB 操作都塞進去。

---

## 3. Service Layer：業務邏輯層

### 3-1 Service 接受 context.Context，不接受 \*gin.Context

Service 層不應該知道任何 HTTP 框架的存在。這樣設計的好處是：

* 同樣的 service 可以被 HTTP handler、gRPC handler、CLI 指令呼叫
* 單元測試時不需要建立假的 `*gin.Context`，只需要 `context.Background()`

```go
// 正確：service 只接受標準 context
func (s *userService) CreateUser(ctx context.Context, req CreateUserRequest) (*User, error)

// 禁止：service 依賴 gin，無法跨協定重用
func (s *userService) CreateUser(c *gin.Context, req CreateUserRequest) (*User, error)
```

### 3-2 完整的 UserService 實作（Create、FindByID、Update、Delete）

```go
// internal/service/user_service.go
package service

import (
    "context"
    "fmt"
)

// CreateUserRequest 是建立使用者的請求 DTO
type CreateUserRequest struct {
    Name  string
    Email string
}

// UpdateUserRequest 是更新使用者的請求 DTO
type UpdateUserRequest struct {
    Name  string
    Email string
}

// UserService 定義業務層能力（讓 handler 依賴此介面）
type UserService interface {
    CreateUser(ctx context.Context, req CreateUserRequest) (*User, error)
    GetUser(ctx context.Context, id int64) (*User, error)
    UpdateUser(ctx context.Context, id int64, req UpdateUserRequest) (*User, error)
    DeleteUser(ctx context.Context, id int64) error
}

// userService 是 UserService 的實作
type userService struct {
    repo UserRepository // 依賴 Repository 介面（定義在本套件）
}

// 編譯期驗證
var _ UserService = (*userService)(nil)

// NewUserService 建立 UserService 實例（依賴注入）
func NewUserService(repo UserRepository) UserService {
    return &userService{repo: repo}
}

func (s *userService) CreateUser(ctx context.Context, req CreateUserRequest) (*User, error) {
    // 業務規則：Email 不能重複
    existing, err := s.repo.FindByEmail(ctx, req.Email)
    if err != nil {
        return nil, fmt.Errorf("userService.CreateUser: check email: %w", err)
    }
    if existing != nil {
        return nil, ErrDuplicateEmail
    }

    user := &User{
        Name:  req.Name,
        Email: req.Email,
    }

    if err := s.repo.Create(ctx, user); err != nil {
        return nil, fmt.Errorf("userService.CreateUser: %w", err)
    }

    return user, nil
}

func (s *userService) GetUser(ctx context.Context, id int64) (*User, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("userService.GetUser: %w", err)
    }
    return user, nil
}

func (s *userService) UpdateUser(ctx context.Context, id int64, req UpdateUserRequest) (*User, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("userService.UpdateUser: %w", err)
    }

    // 若 Email 有變動，檢查新 Email 是否已被使用
    if req.Email != user.Email {
        existing, err := s.repo.FindByEmail(ctx, req.Email)
        if err != nil {
            return nil, fmt.Errorf("userService.UpdateUser: check email: %w", err)
        }
        if existing != nil {
            return nil, ErrDuplicateEmail
        }
    }

    user.Name = req.Name
    user.Email = req.Email

    if err := s.repo.Update(ctx, user); err != nil {
        return nil, fmt.Errorf("userService.UpdateUser: %w", err)
    }

    return user, nil
}

func (s *userService) DeleteUser(ctx context.Context, id int64) error {
    if err := s.repo.Delete(ctx, id); err != nil {
        return fmt.Errorf("userService.DeleteUser: %w", err)
    }
    return nil
}
```

### 3-3 業務錯誤的定義與傳播（Sentinel Error）

```go
// internal/service/errors.go
package service

import "errors"

// Sentinel Error：讓呼叫方可以用 errors.Is 判斷錯誤類型
var (
    ErrUserNotFound   = errors.New("user not found")
    ErrDuplicateEmail = errors.New("email already exists")
    ErrInvalidInput   = errors.New("invalid input")
)
```

錯誤傳播的正確方式：

```go
// repository 層：將 DB 錯誤轉為業務錯誤
if errors.Is(err, sql.ErrNoRows) {
    return nil, service.ErrUserNotFound  // 轉換成業務錯誤
}

// service 層：包裝錯誤並保留原始錯誤鏈
return nil, fmt.Errorf("userService.CreateUser: %w", err)

// handler 層：用 errors.Is 判斷錯誤類型，對應 HTTP 狀態碼
if errors.Is(err, service.ErrUserNotFound) {
    // 回傳 404
}
```

> **注意**：使用 `%w` 包裝 error，可以保留整條錯誤鏈。呼叫方用 `errors.Is(err, target)` 或 `errors.As(err, &target)` 仍能正確匹配原始錯誤，即使它被多層包裝。

### 3-4 Service 的單元測試（Mock Repository）

```go
// internal/service/user_service_test.go
package service_test

import (
    "context"
    "testing"

    "user-api/internal/service"
)

// mockUserRepository 是 UserRepository 的假實作，只用於測試
type mockUserRepository struct {
    users map[int64]*service.User
    // 控制 FindByEmail 的回傳結果
    findByEmailResult *service.User
    findByEmailErr    error
    createErr         error
}

func (m *mockUserRepository) Create(ctx context.Context, user *service.User) error {
    if m.createErr != nil {
        return m.createErr
    }
    user.ID = 1 // 模擬資料庫自動產生的 ID
    return nil
}

func (m *mockUserRepository) FindByID(ctx context.Context, id int64) (*service.User, error) {
    u, ok := m.users[id]
    if !ok {
        return nil, service.ErrUserNotFound
    }
    return u, nil
}

func (m *mockUserRepository) FindByEmail(ctx context.Context, email string) (*service.User, error) {
    return m.findByEmailResult, m.findByEmailErr
}

func (m *mockUserRepository) Update(ctx context.Context, user *service.User) error {
    return nil
}

func (m *mockUserRepository) Delete(ctx context.Context, id int64) error {
    return nil
}

func TestUserService_CreateUser(t *testing.T) {
    cases := []struct {
        name          string
        req           service.CreateUserRequest
        existingEmail *service.User  // FindByEmail 回傳值
        wantErr       error
    }{
        {
            name:          "成功建立使用者",
            req:           service.CreateUserRequest{Name: "Alice", Email: "alice@example.com"},
            existingEmail: nil, // email 不存在
            wantErr:       nil,
        },
        {
            name:          "Email 已被使用",
            req:           service.CreateUserRequest{Name: "Bob", Email: "alice@example.com"},
            existingEmail: &service.User{ID: 1, Email: "alice@example.com"},
            wantErr:       service.ErrDuplicateEmail,
        },
    }

    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {
            repo := &mockUserRepository{
                users:             make(map[int64]*service.User),
                findByEmailResult: tc.existingEmail,
            }
            svc := service.NewUserService(repo)

            user, err := svc.CreateUser(context.Background(), tc.req)

            if tc.wantErr != nil {
                if !errors.Is(err, tc.wantErr) {
                    t.Errorf("CreateUser() error = %v, wantErr %v", err, tc.wantErr)
                }
                return
            }

            if err != nil {
                t.Fatalf("CreateUser() unexpected error: %v", err)
            }
            if user.Name != tc.req.Name {
                t.Errorf("user.Name = %q, want %q", user.Name, tc.req.Name)
            }
        })
    }
}
```

---

## 4. Handler Layer：HTTP 請求處理層

### 4-1 Handler 只做：解析 → 呼叫 Service → 回應

Handler 的三個步驟應該非常清晰：

```text
步驟一：解析請求
    c.ShouldBindJSON(&req)    ← 解析 JSON body
    c.Param("id")             ← 取 URL 參數
    c.Query("page")           ← 取 Query String

步驟二：呼叫 Service
    user, err := h.service.CreateUser(c.Request.Context(), req)

步驟三：回傳回應
    response.Success(c, user)
    response.Fail(c, http.StatusBadRequest, "格式錯誤")
```

### 4-2 完整的 UserHandler 實作（Gin）

```go
// internal/handler/user_handler.go
package handler

import (
    "errors"
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"

    "user-api/internal/service"
    "user-api/pkg/response"
)

// UserHandler 處理與 User 相關的 HTTP 請求
type UserHandler struct {
    userService service.UserService
}

// NewUserHandler 建立 UserHandler（依賴注入 UserService）
func NewUserHandler(userService service.UserService) *UserHandler {
    return &UserHandler{userService: userService}
}

// CreateUserRequest 是 HTTP 層的請求結構
type CreateUserRequest struct {
    Name  string `json:"name"  binding:"required,min=2,max=50"`
    Email string `json:"email" binding:"required,email"`
}

// UpdateUserRequest 是 HTTP 層的更新請求結構
type UpdateUserRequest struct {
    Name  string `json:"name"  binding:"required,min=2,max=50"`
    Email string `json:"email" binding:"required,email"`
}

// CreateUser 處理 POST /users
func (h *UserHandler) CreateUser(c *gin.Context) {
    // 步驟一：解析請求
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        response.Fail(c, http.StatusBadRequest, "請求格式錯誤："+err.Error())
        return
    }

    // 步驟二：呼叫 Service（傳入標準 context，不傳 gin.Context）
    user, err := h.userService.CreateUser(c.Request.Context(), service.CreateUserRequest{
        Name:  req.Name,
        Email: req.Email,
    })
    if err != nil {
        h.handleServiceError(c, err)
        return
    }

    // 步驟三：回傳回應
    response.Success(c, http.StatusCreated, user)
}

// GetUser 處理 GET /users/:id
func (h *UserHandler) GetUser(c *gin.Context) {
    id, err := strconv.ParseInt(c.Param("id"), 10, 64)
    if err != nil {
        response.Fail(c, http.StatusBadRequest, "無效的使用者 ID")
        return
    }

    user, err := h.userService.GetUser(c.Request.Context(), id)
    if err != nil {
        h.handleServiceError(c, err)
        return
    }

    response.Success(c, http.StatusOK, user)
}

// UpdateUser 處理 PUT /users/:id
func (h *UserHandler) UpdateUser(c *gin.Context) {
    id, err := strconv.ParseInt(c.Param("id"), 10, 64)
    if err != nil {
        response.Fail(c, http.StatusBadRequest, "無效的使用者 ID")
        return
    }

    var req UpdateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        response.Fail(c, http.StatusBadRequest, "請求格式錯誤："+err.Error())
        return
    }

    user, err := h.userService.UpdateUser(c.Request.Context(), id, service.UpdateUserRequest{
        Name:  req.Name,
        Email: req.Email,
    })
    if err != nil {
        h.handleServiceError(c, err)
        return
    }

    response.Success(c, http.StatusOK, user)
}

// DeleteUser 處理 DELETE /users/:id
func (h *UserHandler) DeleteUser(c *gin.Context) {
    id, err := strconv.ParseInt(c.Param("id"), 10, 64)
    if err != nil {
        response.Fail(c, http.StatusBadRequest, "無效的使用者 ID")
        return
    }

    if err := h.userService.DeleteUser(c.Request.Context(), id); err != nil {
        h.handleServiceError(c, err)
        return
    }

    response.Success(c, http.StatusNoContent, nil)
}

// handleServiceError 將 service 層錯誤對應到 HTTP 狀態碼
func (h *UserHandler) handleServiceError(c *gin.Context, err error) {
    switch {
    case errors.Is(err, service.ErrUserNotFound):
        response.Fail(c, http.StatusNotFound, "使用者不存在")
    case errors.Is(err, service.ErrDuplicateEmail):
        response.Fail(c, http.StatusConflict, "Email 已被使用")
    case errors.Is(err, service.ErrInvalidInput):
        response.Fail(c, http.StatusBadRequest, "輸入資料無效")
    default:
        response.Fail(c, http.StatusInternalServerError, "伺服器內部錯誤")
    }
}
```

### 4-3 錯誤對應到 HTTP 狀態碼

```text
業務錯誤                    HTTP 狀態碼     說明
─────────────────────────────────────────────────────
ErrUserNotFound          → 404 Not Found   資源不存在
ErrDuplicateEmail        → 409 Conflict    資源衝突
ErrInvalidInput          → 400 Bad Request 請求無效
（其他未預期錯誤）         → 500 Internal   伺服器錯誤
JSON binding 失敗         → 400 Bad Request 格式錯誤
URL 參數解析失敗           → 400 Bad Request 參數錯誤
```

### 4-4 Handler 的測試（httptest）

```go
// internal/handler/user_handler_test.go
package handler_test

import (
    "context"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"

    "github.com/gin-gonic/gin"

    "user-api/internal/handler"
    "user-api/internal/service"
)

// mockUserService 是 UserService 的假實作
type mockUserService struct {
    createUserFn func(ctx context.Context, req service.CreateUserRequest) (*service.User, error)
}

func (m *mockUserService) CreateUser(ctx context.Context, req service.CreateUserRequest) (*service.User, error) {
    return m.createUserFn(ctx, req)
}

func (m *mockUserService) GetUser(ctx context.Context, id int64) (*service.User, error) {
    return nil, nil
}

func (m *mockUserService) UpdateUser(ctx context.Context, id int64, req service.UpdateUserRequest) (*service.User, error) {
    return nil, nil
}

func (m *mockUserService) DeleteUser(ctx context.Context, id int64) error {
    return nil
}

func TestUserHandler_CreateUser(t *testing.T) {
    gin.SetMode(gin.TestMode)

    cases := []struct {
        name           string
        body           string
        serviceErr     error
        wantStatusCode int
    }{
        {
            name:           "成功建立使用者",
            body:           `{"name":"Alice","email":"alice@example.com"}`,
            serviceErr:     nil,
            wantStatusCode: http.StatusCreated,
        },
        {
            name:           "Email 已被使用",
            body:           `{"name":"Bob","email":"dup@example.com"}`,
            serviceErr:     service.ErrDuplicateEmail,
            wantStatusCode: http.StatusConflict,
        },
        {
            name:           "JSON 格式錯誤",
            body:           `{"name":""}`,
            serviceErr:     nil,
            wantStatusCode: http.StatusBadRequest,
        },
    }

    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {
            mockSvc := &mockUserService{
                createUserFn: func(ctx context.Context, req service.CreateUserRequest) (*service.User, error) {
                    if tc.serviceErr != nil {
                        return nil, tc.serviceErr
                    }
                    return &service.User{ID: 1, Name: req.Name, Email: req.Email}, nil
                },
            }

            r := gin.New()
            h := handler.NewUserHandler(mockSvc)
            r.POST("/users", h.CreateUser)

            req := httptest.NewRequest(http.MethodPost, "/users", strings.NewReader(tc.body))
            req.Header.Set("Content-Type", "application/json")
            w := httptest.NewRecorder()

            r.ServeHTTP(w, req)

            if w.Code != tc.wantStatusCode {
                t.Errorf("status code = %d, want %d; body = %s",
                    w.Code, tc.wantStatusCode, w.Body.String())
            }
        })
    }
}
```

---

## 5. 依賴注入（Dependency Injection）

### 5-1 什麼是依賴注入？為什麼不用全域變數？

依賴注入（Dependency Injection，DI）的核心概念是：**物件所需的依賴不由自己建立，而是從外部傳入**。

```go
// 反面示範：物件自己建立依賴（難以測試）
type UserService struct{}

func (s *UserService) CreateUser(ctx context.Context, req CreateUserRequest) (*User, error) {
    // 直接建立 DB 連線，測試時無法替換
    db, _ := sql.Open("mysql", "user:pass@tcp(localhost:3306)/mydb")
    repo := NewUserRepository(db)
    return repo.Create(ctx, &User{...})
}

// 正確做法：從外部注入依賴
type userService struct {
    repo UserRepository  // 透過介面依賴，可以注入任何實作
}

func NewUserService(repo UserRepository) UserService {
    return &userService{repo: repo}
}
```

全域變數的問題：

```go
// 反面示範：全域變數導致測試污染
var globalDB *sql.DB
var globalUserService service.UserService

// 測試 A 改了 globalUserService，測試 B 的行為就會受影響
// 平行測試時更容易出現 race condition
```

> **建議**：所有依賴都透過 constructor 函數注入，不使用全域可變變數。這樣每個測試都能建立獨立的元件實例，互不干擾。

### 5-2 手動 Wire-up：在 main.go 組裝所有元件

```text
main.go 的職責：
    1. 載入設定
    2. 建立基礎設施（DB 連線、logger）
    3. 建立各層元件（repo → service → handler）
    4. 設定路由
    5. 啟動伺服器

原則：main.go 只做組裝，不寫業務邏輯
```

### 5-3 完整的 main.go 初始化範例

```go
// cmd/server/main.go
package main

import (
    "context"
    "database/sql"
    "log/slog"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    _ "github.com/go-sql-driver/mysql"
    "github.com/gin-gonic/gin"

    "user-api/config"
    "user-api/internal/handler"
    "user-api/internal/middleware"
    "user-api/internal/repository"
    "user-api/internal/service"
    "user-api/router"
)

func main() {
    // 1. 載入設定
    cfg, err := config.Load()
    if err != nil {
        slog.Error("failed to load config", "error", err)
        os.Exit(1)
    }

    // 2. 建立資料庫連線
    db, err := sql.Open("mysql", cfg.Database.DSN())
    if err != nil {
        slog.Error("failed to open database", "error", err)
        os.Exit(1)
    }
    defer db.Close()

    db.SetMaxOpenConns(cfg.Database.MaxOpenConns)
    db.SetMaxIdleConns(cfg.Database.MaxIdleConns)
    db.SetConnMaxLifetime(time.Duration(cfg.Database.ConnMaxLifetimeSec) * time.Second)

    // 3. 建立各層元件（依賴注入：由內而外組裝）
    userRepo := repository.NewUserRepository(db)        // Repository 層
    userSvc := service.NewUserService(userRepo)         // Service 層
    userHandler := handler.NewUserHandler(userSvc)      // Handler 層

    // 4. 設定路由
    r := gin.New()
    r.Use(gin.Recovery())
    r.Use(middleware.RequestID())
    r.Use(middleware.Logger())

    handlers := &router.Handlers{
        User: userHandler,
    }
    router.Setup(r, handlers)

    // 5. 啟動伺服器（帶 Graceful Shutdown）
    srv := &http.Server{
        Addr:    ":" + cfg.Server.Port,
        Handler: r,
    }

    go func() {
        slog.Info("server starting", "port", cfg.Server.Port)
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            slog.Error("server error", "error", err)
            os.Exit(1)
        }
    }()

    // 等待 OS 訊號
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    slog.Info("shutting down server...")
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        slog.Error("server forced to shutdown", "error", err)
        os.Exit(1)
    }

    slog.Info("server exited")
}
```

### 5-4 Google Wire 工具（程式碼生成式 DI）

當專案變大，手動 wire-up 的程式碼會越來越長且重複性高。Google Wire 是一個**編譯期**的依賴注入程式碼生成工具。

#### Wire 的安裝與基本使用

```bash
# 安裝 wire 工具
go install github.com/google/wire/cmd/wire@latest

# 在 go.mod 加入依賴
go get github.com/google/wire
```

#### Provider、Injector 概念

```go
// wire/wire.go（只在開發時使用，不進入 build）
//go:build wireinject

package wire

import (
    "database/sql"

    "github.com/google/wire"

    "user-api/internal/handler"
    "user-api/internal/repository"
    "user-api/internal/service"
)

// InitializeUserHandler 是 Wire 的 Injector 函數
// Wire 會分析依賴關係，自動生成組裝程式碼
func InitializeUserHandler(db *sql.DB) (*handler.UserHandler, error) {
    wire.Build(
        repository.NewUserRepository, // Provider：建立 Repository
        service.NewUserService,       // Provider：建立 Service
        handler.NewUserHandler,       // Provider：建立 Handler
    )
    return nil, nil // Wire 會替換這行
}
```

執行 `wire` 指令後，Wire 會自動生成 `wire_gen.go`：

```go
// wire/wire_gen.go（自動生成，不要手動修改）
// Code generated by Wire. DO NOT EDIT.

package wire

import (
    "database/sql"

    "user-api/internal/handler"
    "user-api/internal/repository"
    "user-api/internal/service"
)

func InitializeUserHandler(db *sql.DB) (*handler.UserHandler, error) {
    userRepository := repository.NewUserRepository(db)
    userService := service.NewUserService(userRepository)
    userHandler := handler.NewUserHandler(userService)
    return userHandler, nil
}
```

---

## 6. 設定管理（Configuration）

### 6-1 用 struct 定義設定結構

```go
// config/config.go
package config

import "fmt"

// Config 是整個應用的設定結構
type Config struct {
    Server   ServerConfig
    Database DatabaseConfig
    JWT      JWTConfig
    Log      LogConfig
}

// ServerConfig 是 HTTP 伺服器設定
type ServerConfig struct {
    Port string
    Mode string // "debug" | "release"
}

// DatabaseConfig 是資料庫設定
type DatabaseConfig struct {
    Host               string
    Port               string
    Name               string
    User               string
    Password           string
    MaxOpenConns       int
    MaxIdleConns       int
    ConnMaxLifetimeSec int
}

// DSN 組合 MySQL DSN 字串
func (d DatabaseConfig) DSN() string {
    return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&loc=Local",
        d.User, d.Password, d.Host, d.Port, d.Name)
}

// JWTConfig 是 JWT 設定
type JWTConfig struct {
    Secret     string
    ExpireHour int
}

// LogConfig 是日誌設定
type LogConfig struct {
    Level string // "debug" | "info" | "warn" | "error"
}
```

### 6-2 從環境變數讀取（os.Getenv + godotenv）

```go
// config/config.go（續）
package config

import (
    "fmt"
    "os"
    "strconv"

    "github.com/joho/godotenv"
)

// Load 從環境變數載入設定
// 本地開發時從 .env 檔案讀取，生產環境直接從系統環境變數讀取
func Load() (*Config, error) {
    // 嘗試載入 .env 檔案（找不到時不報錯，代表是生產環境）
    _ = godotenv.Load()

    cfg := &Config{}

    // Server
    cfg.Server.Port = getEnvOrDefault("SERVER_PORT", "8080")
    cfg.Server.Mode = getEnvOrDefault("GIN_MODE", "debug")

    // Database
    cfg.Database.Host = getEnvOrDefault("DB_HOST", "localhost")
    cfg.Database.Port = getEnvOrDefault("DB_PORT", "3306")
    cfg.Database.Name = mustGetEnv("DB_NAME")
    cfg.Database.User = mustGetEnv("DB_USER")
    cfg.Database.Password = mustGetEnv("DB_PASSWORD")
    cfg.Database.MaxOpenConns = getEnvAsInt("DB_MAX_OPEN_CONNS", 25)
    cfg.Database.MaxIdleConns = getEnvAsInt("DB_MAX_IDLE_CONNS", 10)
    cfg.Database.ConnMaxLifetimeSec = getEnvAsInt("DB_CONN_MAX_LIFETIME_SEC", 300)

    // JWT
    cfg.JWT.Secret = mustGetEnv("JWT_SECRET")
    cfg.JWT.ExpireHour = getEnvAsInt("JWT_EXPIRE_HOUR", 24)

    // Log
    cfg.Log.Level = getEnvOrDefault("LOG_LEVEL", "info")

    return cfg, nil
}

// mustGetEnv 取得必要的環境變數，若不存在則 panic（初始化失敗允許 panic）
func mustGetEnv(key string) string {
    val := os.Getenv(key)
    if val == "" {
        panic(fmt.Sprintf("required environment variable %q is not set", key))
    }
    return val
}

func getEnvOrDefault(key, defaultVal string) string {
    if val := os.Getenv(key); val != "" {
        return val
    }
    return defaultVal
}

func getEnvAsInt(key string, defaultVal int) int {
    val := os.Getenv(key)
    if val == "" {
        return defaultVal
    }
    i, err := strconv.Atoi(val)
    if err != nil {
        return defaultVal
    }
    return i
}
```

### 6-3 Viper 套件：多來源設定（env、yaml、.env）

```go
// config/viper_config.go
package config

import (
    "strings"

    "github.com/spf13/viper"
)

// LoadWithViper 使用 Viper 從多個來源載入設定
// 優先順序：環境變數 > .env 檔案 > config.yaml > 預設值
func LoadWithViper() (*Config, error) {
    v := viper.New()

    // 設定預設值
    v.SetDefault("server.port", "8080")
    v.SetDefault("database.max_open_conns", 25)
    v.SetDefault("jwt.expire_hour", 24)
    v.SetDefault("log.level", "info")

    // 讀取 YAML 設定檔
    v.SetConfigName("config")
    v.SetConfigType("yaml")
    v.AddConfigPath("./config")
    v.AddConfigPath(".")
    // 找不到設定檔時不報錯（可以純用環境變數）
    _ = v.ReadInConfig()

    // 讀取 .env 檔案
    v.SetConfigFile(".env")
    v.SetConfigType("env")
    _ = v.MergeInConfig()

    // 讀取環境變數（最高優先權）
    v.AutomaticEnv()
    v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

    cfg := &Config{}
    if err := v.Unmarshal(cfg); err != nil {
        return nil, err
    }

    return cfg, nil
}
```

範例 `config.yaml`：

```text
server:
  port: "8080"
  mode: "release"

database:
  host: "localhost"
  port: "3306"
  max_open_conns: 25
  max_idle_conns: 10

log:
  level: "info"
```

### 6-4 多環境設定（dev / staging / prod）

```text
.env              ← 本地開發（不提交 git）
.env.example      ← 範例，說明需要哪些變數（提交 git）
config/
├── config.yaml         ← 通用預設值
├── config.dev.yaml     ← 開發環境覆寫
├── config.staging.yaml ← Staging 環境覆寫
└── config.prod.yaml    ← 生產環境覆寫
```

```go
// 根據 APP_ENV 環境變數載入對應設定檔
env := getEnvOrDefault("APP_ENV", "dev")
v.SetConfigName("config." + env) // 例如 config.prod.yaml
```

### 6-5 敏感設定的處理（Secret、DB Password）

```text
.env 檔案（本地開發）：
    DB_PASSWORD=local_dev_password
    JWT_SECRET=dev-secret-key-not-for-prod

生產環境：
    使用 Kubernetes Secret 或 AWS Secrets Manager
    透過環境變數注入，絕對不寫在程式碼或設定檔中
```

> **警告**：絕對不能把 DB Password、JWT Secret、API Key 等敏感資訊提交到 git。`.env` 檔案必須加入 `.gitignore`。只提交 `.env.example`，用假值或說明文字替代真實值。

---

## 7. 結構化日誌（Structured Logging）

### 7-1 為什麼不用 fmt.Println 做日誌？

```go
// 反面示範：用 fmt.Println 輸出日誌
fmt.Println("user created: " + strconv.FormatInt(user.ID, 10))
// 輸出：user created: 42
// 問題：無法過濾等級、無法解析、無法加入 context 資訊
```

結構化日誌的好處：

* 每條日誌都是 JSON，方便 ELK / Grafana 等工具解析
* 可以帶入 key-value，例如 `request_id`、`user_id`
* 支援日誌等級（Debug / Info / Warn / Error）
* 可以控制哪些等級要輸出

### 7-2 log/slog 標準庫（Go 1.21+）

```go
// 使用 Go 1.21 內建的 slog
package main

import (
    "context"
    "log/slog"
    "os"
)

func main() {
    // 建立 JSON 格式的 logger
    logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelInfo,
    }))
    slog.SetDefault(logger)

    // 基本使用
    slog.Info("server starting", "port", 8080)
    slog.Warn("high memory usage", "usage_percent", 85.5)
    slog.Error("database error", "error", err, "query", sql)

    // 帶 context 的日誌（方便傳入 request_id 等）
    ctx := context.Background()
    slog.InfoContext(ctx, "user created", "user_id", 42)
}
```

```text
輸出（JSON 格式）：
{"time":"2026-06-01T10:00:00Z","level":"INFO","msg":"server starting","port":8080}
{"time":"2026-06-01T10:00:01Z","level":"WARN","msg":"high memory usage","usage_percent":85.5}
```

### 7-3 Zap：高效能日誌套件

#### 安裝與初始化

```bash
go get go.uber.org/zap
```

```go
// pkg/logger/logger.go
package logger

import (
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

// New 根據環境建立 logger
func New(level string, isDevelopment bool) (*zap.Logger, error) {
    var cfg zap.Config

    if isDevelopment {
        cfg = zap.NewDevelopmentConfig()
        cfg.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
    } else {
        cfg = zap.NewProductionConfig()
    }

    logLevel, err := zapcore.ParseLevel(level)
    if err != nil {
        logLevel = zapcore.InfoLevel
    }
    cfg.Level = zap.NewAtomicLevelAt(logLevel)

    return cfg.Build()
}
```

#### Sugar vs Logger 的差異

```go
// Logger：強型別，效能最高（生產環境推薦）
logger.Info("user created",
    zap.Int64("user_id", user.ID),
    zap.String("email", user.Email),
)

// Sugar：類似 fmt，方便快速開發（開發環境可用）
sugar := logger.Sugar()
sugar.Infof("user created: id=%d email=%s", user.ID, user.Email)
sugar.Infow("user created",
    "user_id", user.ID,
    "email", user.Email,
)
```

#### 加入 Request ID

```go
// 在 middleware 建立帶 request_id 的 logger，並存入 context
func requestLogger(logger *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        requestID := c.GetString(middleware.ContextKeyRequestID)

        // 建立帶有 request_id 的 child logger
        reqLogger := logger.With(zap.String("request_id", requestID))

        // 存入 gin.Context，後續 handler 可以取出使用
        c.Set("logger", reqLogger)

        c.Next()
    }
}

// handler 中取出 logger
func (h *UserHandler) CreateUser(c *gin.Context) {
    logger := c.MustGet("logger").(*zap.Logger)
    logger.Info("creating user")
    // ...
}
```

### 7-4 在 middleware 中記錄每次請求

```go
// internal/middleware/logger.go
package middleware

import (
    "time"

    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
)

// Logger 記錄每次 HTTP 請求的 middleware
func Logger(logger *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path
        query := c.Request.URL.RawQuery

        c.Next()

        duration := time.Since(start)
        statusCode := c.Writer.Status()
        requestID := c.GetString(ContextKeyRequestID)

        logFn := logger.Info
        if statusCode >= 500 {
            logFn = logger.Error
        } else if statusCode >= 400 {
            logFn = logger.Warn
        }

        logFn("http request",
            zap.String("request_id", requestID),
            zap.String("method", c.Request.Method),
            zap.String("path", path),
            zap.String("query", query),
            zap.Int("status", statusCode),
            zap.Duration("duration", duration),
            zap.String("ip", c.ClientIP()),
            zap.Int("body_size", c.Writer.Size()),
        )
    }
}
```

### 7-5 日誌等級設計（Debug 只在開發環境開啟）

```text
等級        使用場景
───────────────────────────────────────────────────────
DEBUG    開發期間詳細追蹤，如 SQL 查詢內容、函數進出。生產環境關閉。
INFO     正常業務事件，如「使用者登入」、「訂單建立」
WARN     可以繼續運作但需要注意，如「重試第 2 次」、「記憶體使用偏高」
ERROR    發生錯誤需要調查，如「DB 連線失敗」、「外部 API 逾時」
```

```go
// 根據環境決定 log level
level := "info"
if cfg.Server.Mode == "debug" {
    level = "debug"
}
```

---

## 8. Graceful Shutdown（優雅關閉）

### 8-1 什麼是 Graceful Shutdown？為什麼重要？

當你按下 Ctrl+C 或 Kubernetes 要縮容一個 Pod 時，作業系統會送 `SIGTERM` 訊號給你的程序。如果你的程序直接結束：

```text
問題情境：
  1. 使用者剛發出一個「下訂單」請求
  2. 程序收到 SIGTERM，立刻結束
  3. 訂單寫入資料庫到一半，資料不一致
  4. 使用者收到 502 Bad Gateway，但不知道訂單是否成功
```

Graceful Shutdown 的做法：

```text
收到 SIGTERM 後：
  1. 停止接受新的連線
  2. 等待目前進行中的請求全部完成（有 timeout 上限）
  3. 關閉資料庫連線、清空 cache
  4. 程序正常結束（exit code 0）
```

### 8-2 監聽 OS Signal（SIGINT、SIGTERM）

```go
package main

import (
    "os"
    "os/signal"
    "syscall"
)

func waitForSignal() {
    quit := make(chan os.Signal, 1)

    // SIGINT  = Ctrl+C（開發時用）
    // SIGTERM = Kubernetes / systemd 要求關閉
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

    // 阻塞直到收到訊號
    sig := <-quit
    // sig 的值會是 os.Interrupt 或 syscall.SIGTERM
    _ = sig
}
```

### 8-3 http.Server.Shutdown 實作

```go
// http.Server.Shutdown 會：
// 1. 關閉 Listener（不再接受新連線）
// 2. 等待已建立的連線上的請求完成
// 3. 若 ctx 超時，強制關閉剩餘連線

ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

if err := srv.Shutdown(ctx); err != nil {
    // ctx deadline exceeded 代表有請求在 5 秒內沒完成，被強制中斷
    log.Printf("server forced shutdown: %v", err)
}
```

### 8-4 等待進行中的請求完成

```text
時間軸：
  t=0s   收到 SIGTERM，呼叫 srv.Shutdown(ctx)
  t=0s   不再接受新連線，已建立的 200 個請求繼續執行
  t=1s   180 個請求已完成
  t=2s   198 個請求已完成
  t=3s   200 個請求全部完成 → Shutdown 正常返回
  t=3s   程序結束（exit 0）

  如果有請求超過 5 秒未完成：
  t=5s   context deadline exceeded
  t=5s   剩餘連線被強制關閉 → Shutdown 返回 error
  t=5s   程序結束（exit 1）
```

### 8-5 完整 main.go 範例（帶 Graceful Shutdown）

```go
// cmd/server/main.go
package main

import (
    "context"
    "errors"
    "log/slog"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/gin-gonic/gin"
)

func main() {
    // 初始化 router（省略設定和依賴注入，詳見第 5 章）
    r := gin.New()
    r.Use(gin.Recovery())
    r.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"status": "ok"})
    })

    srv := &http.Server{
        Addr:         ":8080",
        Handler:      r,
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    // 在 goroutine 中啟動伺服器（非阻塞）
    go func() {
        slog.Info("server starting", "addr", srv.Addr)
        if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
            slog.Error("server listen error", "error", err)
            os.Exit(1)
        }
    }()

    // 等待系統訊號
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    sig := <-quit
    slog.Info("received signal, shutting down", "signal", sig.String())

    // 給正在進行的請求最多 5 秒完成
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        slog.Error("server shutdown error", "error", err)
        os.Exit(1)
    }

    // 在這裡釋放其他資源（DB 連線池、redis 連線等）
    // db.Close()
    // redisClient.Close()

    slog.Info("server exited gracefully")
}
```

```text
執行結果：
2026-06-01T10:00:00Z INFO server starting addr=:8080
（按下 Ctrl+C）
2026-06-01T10:00:05Z INFO received signal, shutting down signal=interrupt
2026-06-01T10:00:07Z INFO server exited gracefully
```

---

## 9. Middleware 設計

### 9-1 Request ID Middleware

每個請求都加上唯一識別碼，方便追蹤日誌：

```go
// internal/middleware/request_id.go
package middleware

import (
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
)

const ContextKeyRequestID = "request_id"
const HeaderRequestID = "X-Request-ID"

// RequestID 為每個請求注入唯一 ID
func RequestID() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 優先使用客戶端傳來的 X-Request-ID（方便跨服務追蹤）
        requestID := c.GetHeader(HeaderRequestID)
        if requestID == "" {
            requestID = uuid.NewString()
        }

        c.Set(ContextKeyRequestID, requestID)

        // 在回應 Header 中也帶上 Request ID
        c.Header(HeaderRequestID, requestID)

        c.Next()
    }
}
```

### 9-2 認證 Middleware（JWT 驗證）

```go
// internal/middleware/auth.go
package middleware

import (
    "errors"
    "net/http"
    "strings"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v5"
)

const ContextKeyUserID = "user_id"
const ContextKeyRole   = "role"

// JWTClaims 是 JWT payload 的結構
type JWTClaims struct {
    UserID int64  `json:"user_id"`
    Role   string `json:"role"`
    jwt.RegisteredClaims
}

// Auth 驗證 JWT Token 的 middleware
func Auth(jwtSecret string) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 從 Authorization Header 取得 token
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "code":    http.StatusUnauthorized,
                "message": "缺少 Authorization Header",
            })
            return
        }

        // Bearer Token 格式：Authorization: Bearer <token>
        parts := strings.SplitN(authHeader, " ", 2)
        if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "code":    http.StatusUnauthorized,
                "message": "Authorization Header 格式錯誤，應為 Bearer <token>",
            })
            return
        }
        tokenStr := parts[1]

        // 解析並驗證 JWT
        claims := &JWTClaims{}
        token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
            // 驗證簽名演算法
            if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, errors.New("unexpected signing method")
            }
            return []byte(jwtSecret), nil
        })

        if err != nil || !token.Valid {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "code":    http.StatusUnauthorized,
                "message": "Token 無效或已過期",
            })
            return
        }

        // 將使用者資訊存入 context，讓後續 handler 可以使用
        c.Set(ContextKeyUserID, claims.UserID)
        c.Set(ContextKeyRole, claims.Role)

        c.Next()
    }
}

// GenerateToken 產生 JWT Token（通常在登入 handler 中使用）
func GenerateToken(userID int64, role, secret string, expireHour int) (string, error) {
    claims := &JWTClaims{
        UserID: userID,
        Role:   role,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expireHour) * time.Hour)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(secret))
}
```

### 9-3 限流 Middleware

```go
// internal/middleware/rate_limit.go
package middleware

import (
    "net/http"
    "sync"
    "time"

    "github.com/gin-gonic/gin"
)

// simpleLimiter 是一個簡易的令牌桶限流器（生產環境建議用 golang.org/x/time/rate）
type simpleLimiter struct {
    mu       sync.Mutex
    tokens   int
    maxTokens int
    refillAt  time.Time
    refillDur time.Duration
}

func newSimpleLimiter(rps int) *simpleLimiter {
    return &simpleLimiter{
        tokens:    rps,
        maxTokens: rps,
        refillAt:  time.Now().Add(time.Second),
        refillDur: time.Second,
    }
}

func (l *simpleLimiter) allow() bool {
    l.mu.Lock()
    defer l.mu.Unlock()

    now := time.Now()
    if now.After(l.refillAt) {
        l.tokens = l.maxTokens
        l.refillAt = now.Add(l.refillDur)
    }

    if l.tokens <= 0 {
        return false
    }
    l.tokens--
    return true
}

// RateLimit 每秒最多 rps 個請求的限流 middleware
func RateLimit(rps int) gin.HandlerFunc {
    limiter := newSimpleLimiter(rps)

    return func(c *gin.Context) {
        if !limiter.allow() {
            c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
                "code":    http.StatusTooManyRequests,
                "message": "請求過於頻繁，請稍後再試",
            })
            return
        }
        c.Next()
    }
}
```

### 9-4 Panic Recovery Middleware

```go
// internal/middleware/recovery.go
package middleware

import (
    "net/http"
    "runtime/debug"

    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
)

// Recovery 捕捉 panic 並回傳 500，防止整個伺服器崩潰
func Recovery(logger *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        defer func() {
            if r := recover(); r != nil {
                // 記錄 panic 資訊和 stack trace
                logger.Error("panic recovered",
                    zap.Any("error", r),
                    zap.ByteString("stack", debug.Stack()),
                    zap.String("request_id", c.GetString(ContextKeyRequestID)),
                    zap.String("path", c.Request.URL.Path),
                )

                c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
                    "code":    http.StatusInternalServerError,
                    "message": "伺服器內部錯誤",
                })
            }
        }()
        c.Next()
    }
}
```

---

## 10. 完整應用範例（User API）

### 目錄結構

```text
user-api/
├── cmd/server/main.go
├── internal/
│   ├── handler/user_handler.go
│   ├── service/
│   │   ├── user_service.go    （含 UserRepository 介面定義）
│   │   └── errors.go
│   ├── repository/user_repository.go
│   └── middleware/
│       ├── request_id.go
│       ├── auth.go
│       └── logger.go
├── router/router.go
├── pkg/response/response.go
└── config/config.go
```

### 統一回應格式

```go
// pkg/response/response.go
package response

import "github.com/gin-gonic/gin"

// Response 是所有 API 回應的統一格式
type Response struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
    Data    any    `json:"data,omitempty"`
}

// Success 回傳成功回應
func Success(c *gin.Context, statusCode int, data any) {
    c.JSON(statusCode, Response{
        Code:    0,
        Message: "ok",
        Data:    data,
    })
}

// Fail 回傳失敗回應
func Fail(c *gin.Context, statusCode int, message string) {
    c.JSON(statusCode, Response{
        Code:    statusCode,
        Message: message,
    })
}
```

### 路由設定

```go
// router/router.go
package router

import (
    "github.com/gin-gonic/gin"

    "user-api/internal/handler"
    "user-api/internal/middleware"
)

// Handlers 集合所有 handler，方便 router 使用
type Handlers struct {
    User *handler.UserHandler
}

// Setup 設定所有路由
func Setup(r *gin.Engine, h *Handlers, jwtSecret string) {
    // 公開路由（不需要認證）
    public := r.Group("/api/v1")
    {
        public.POST("/register", h.User.CreateUser)
    }

    // 需要認證的路由
    authorized := r.Group("/api/v1")
    authorized.Use(middleware.Auth(jwtSecret))
    {
        users := authorized.Group("/users")
        users.GET("/:id", h.User.GetUser)
        users.PUT("/:id", h.User.UpdateUser)
        users.DELETE("/:id", h.User.DeleteUser)
    }
}
```

### 完整串接：Create User 流程

```text
POST /api/v1/register
    Body: {"name":"Alice","email":"alice@example.com"}

Step 1：middleware 執行
    RequestID  → 產生 request_id = "550e8400-e29b-41d4-a716-446655440000"
    Logger     → 記錄請求開始

Step 2：router 解析路由
    → 匹配到 POST /api/v1/register
    → 呼叫 UserHandler.CreateUser(c)

Step 3：Handler 層
    ShouldBindJSON → {Name:"Alice", Email:"alice@example.com"}
    呼叫 userService.CreateUser(ctx, req)

Step 4：Service 層
    FindByEmail("alice@example.com") → nil（不存在）
    repo.Create(ctx, &User{Name:"Alice", Email:"alice@example.com"})
    回傳 &User{ID:1, Name:"Alice", Email:"alice@example.com"}

Step 5：Repository 層
    INSERT INTO users (name, email, ...) VALUES (?, ?, ...)
    回傳 LastInsertId = 1

Step 6：回應鏈路倒回
    Handler 收到 user，呼叫 response.Success(c, 201, user)

Step 7：HTTP 回應
    HTTP/1.1 201 Created
    X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
    Content-Type: application/json

    {
        "code": 0,
        "message": "ok",
        "data": {
            "id": 1,
            "name": "Alice",
            "email": "alice@example.com",
            "created_at": "2026-06-01T10:00:00Z",
            "updated_at": "2026-06-01T10:00:00Z"
        }
    }
```

---

## 11. 總結對照表

| 主題 | 核心原則 | 常見錯誤 |
| :--- | :--- | :--- |
| 分層架構 | Handler → Service → Repository，單向依賴 | 在 Handler 直接呼叫 DB |
| 介面定義位置 | 定義在使用方（service 套件） | 定義在實作方（repository 套件） |
| context 傳遞 | Service 接受 `context.Context`，不接受 `*gin.Context` | 把 `*gin.Context` 傳入 Service |
| 編譯期驗證 | `var _ Interface = (*impl)(nil)` | 不驗證，執行期才發現介面未實作 |
| 業務錯誤 | 定義 Sentinel Error，用 `errors.Is` 判斷 | 直接比較 error string |
| 錯誤包裝 | `fmt.Errorf("context: %w", err)` | `fmt.Errorf("context: %v", err)`（%v 會切斷錯誤鏈） |
| 依賴注入 | Constructor 函數傳入依賴 | 使用全域變數 |
| 設定管理 | struct + 環境變數，敏感值不進 git | 設定值寫死在程式碼中 |
| 日誌 | 結構化日誌（slog / zap），生產環境不開 Debug | 用 `fmt.Println` 打日誌 |
| Graceful Shutdown | `srv.Shutdown(ctx)` + 5 秒 timeout | 直接 `os.Exit(0)` 終止程序 |
| JWT Middleware | 從 Header 取 token，解析後存入 `c.Set` | 每個 handler 自己解析 token |
| Panic Recovery | 掛載 Recovery middleware，防止服務崩潰 | 不處理 panic，讓整個服務掛掉 |
| Handler 測試 | `httptest.NewRecorder()` + Mock Service | 必須起真實伺服器才能測試 |
| Service 測試 | Mock Repository 介面，純函數邏輯測試 | 必須連真實 DB 才能測試 |

---

[← 返回目錄](README.md)

文件更新日期：2026年6月1日
