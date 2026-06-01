# Go 工具鏈與工程實務指南

[← 返回目錄](README.md)

本文件涵蓋 Go 語言開發中的工程實務技能，包含模組管理、內建工具鏈、程式碼品質工具、自動化建置（Makefile）、Docker 容器化、開發輔助工具、CI/CD 流程，以及效能分析工具。適合已有基礎 Go 開發經驗、想提升工程實踐能力的開發者。

---

## 1. Go Modules：依賴管理

### 1-1 go.mod 檔案結構說明

`go.mod` 是 Go 模組系統的核心設定檔，記錄模組名稱、Go 版本，以及所有直接與間接依賴。

```text
module github.com/yourname/myapp   ← 模組路徑（即套件引用的根路徑）

go 1.22                            ← 最低 Go 版本需求

require (
    github.com/gin-gonic/gin v1.9.1          // 直接依賴
    github.com/stretchr/testify v1.8.4       // 直接依賴
    golang.org/x/crypto v0.17.0              // 直接依賴
    github.com/bytedance/sonic v1.10.2       // 間接依賴（// indirect）
)
```

#### 欄位說明

| 欄位 | 說明 |
| :--- | :--- |
| `module` | 模組的唯一識別路徑，通常是 GitHub 路徑 |
| `go` | 指定最低支援的 Go 版本 |
| `require` | 直接與間接依賴清單，版本遵循語意化版本 |
| `replace` | 替換依賴來源（本地路徑或其他版本） |
| `exclude` | 排除特定版本（有已知漏洞時使用） |

### 1-2 常用指令（go mod init、tidy、download、vendor）

```bash
# 初始化新模組（在專案根目錄執行）
go mod init github.com/yourname/myapp

# 整理依賴：移除未使用的、補上缺少的
go mod tidy

# 下載所有依賴到本地快取（$GOPATH/pkg/mod）
go mod download

# 將依賴複製到專案內的 vendor/ 目錄
go mod vendor

# 驗證 vendor/ 目錄的完整性
go mod verify

# 查看為什麼需要某個依賴（依賴鏈追蹤）
go mod why github.com/gin-gonic/gin

# 查看所有依賴（含間接依賴）
go list -m all

# 查看可用的更新版本
go list -m -u all
```

> **建議**：每次增減依賴後都執行 `go mod tidy`，確保 `go.mod` 和 `go.sum` 保持乾淨。

#### 升級依賴版本

```bash
# 升級到最新版本（patch + minor）
go get github.com/gin-gonic/gin@latest

# 升級到指定版本
go get github.com/gin-gonic/gin@v1.9.1

# 升級所有依賴（謹慎使用，可能引入 Breaking Change）
go get -u ./...

# 只升級 patch 版本
go get -u=patch ./...
```

### 1-3 go.sum：鎖定版本與安全驗證

`go.sum` 記錄每個依賴模組的加密雜湊值（SHA-256），用於確保下載的內容與預期一致。

```text
github.com/gin-gonic/gin v1.9.1 h1:4idEAncQnU5cB7BeOkPtxjfCSye0AAm1R0RVIqJ+Jmg=
github.com/gin-gonic/gin v1.9.1/go.mod h1:hPrL7YrpYKXt5YId3A/Tnip5kqbEAP+KLuI3SUcPTeU=
```

> **注意**：`go.sum` 必須納入版本控制（git commit）。如果手動修改 `go.sum` 將導致驗證失敗，使用 `go mod tidy` 自動維護。

### 1-4 語意化版本（Semantic Versioning）

Go Modules 採用語意化版本規範（SemVer）：

```text
v主版本.次版本.修訂版本
v  1    .  9   .  1

主版本（Major）：有不相容的 API 變更
次版本（Minor）：向下相容的新功能
修訂版本（Patch）：向下相容的錯誤修正
```

#### 主版本升級的特殊規則

當主版本為 v2 以上時，模組路徑必須包含版本號：

```go
// v1
import "github.com/foo/bar"

// v2（路徑加上 /v2）
import "github.com/foo/bar/v2"
```

```bash
# 引用 v2 版本
go get github.com/foo/bar/v2@v2.1.0
```

### 1-5 replace 指令：本地替換依賴

`replace` 常用於本地開發、測試分支版本，或替換問題依賴：

```text
# go.mod

# 用本地路徑替換（開發共用函式庫時常用）
replace github.com/yourname/shared-lib => ../shared-lib

# 用指定版本替換（有漏洞時緊急替換）
replace github.com/vulnerable/lib v1.0.0 => github.com/safe/fork v1.0.1
```

```bash
# 命令列加入 replace
go mod edit -replace github.com/yourname/shared-lib=../shared-lib
```

> **注意**：`replace` 指向本地路徑時，該路徑也必須有 `go.mod`。發布函式庫前記得移除本地 replace，否則使用者的環境找不到路徑。

### 1-6 Go Workspace（go work）：同時開發多個模組

Go 1.18 引入的 Workspace 功能，讓你在不修改 `go.mod` 的情況下，同時開發多個相互依賴的模組。

```bash
# 工作區目錄結構
workspace/
├── go.work          ← Workspace 設定檔
├── myapp/           ← 主應用程式模組
│   └── go.mod
└── shared-lib/      ← 共用函式庫模組
    └── go.mod
```

```bash
# 在 workspace/ 根目錄初始化
go work init ./myapp ./shared-lib

# 新增模組到 Workspace
go work use ./another-module
```

生成的 `go.work`：

```text
go 1.22

use (
    ./myapp
    ./shared-lib
)
```

> **建議**：`go.work` 和 `go.work.sum` 不要 commit 到版本控制（加入 `.gitignore`），這是本地開發工具，不應影響 CI 環境。

### 1-7 私有模組（GONOSUMCHECK、GOFLAGS）

存取公司內部私有 Git 儲存庫時，需要設定環境變數：

```bash
# 告訴 Go 哪些路徑不走公共 Sum 資料庫驗證
export GONOSUMCHECK=gitlab.internal.company.com/*

# 告訴 Go 哪些路徑不走公共 Proxy
export GOPRIVATE=gitlab.internal.company.com/*

# 等同於同時設定 GONOSUMCHECK + GONOPROXY
export GOPRIVATE=gitlab.internal.company.com/*,github.com/yourcompany/*
```

```bash
# 在 .bashrc / .zshrc 或 CI 環境變數中設定
export GOPRIVATE=gitlab.internal.company.com/*
export GONOSUMDB=gitlab.internal.company.com/*

# 配合 SSH 金鑰或 Personal Access Token 存取私有 repo
git config --global url."git@gitlab.internal.company.com:".insteadOf "https://gitlab.internal.company.com/"
```

---

## 2. Go 內建工具

### 2-1 go build：編譯選項（-o、交叉編譯 GOOS/GOARCH）

```bash
# 基本編譯（輸出與目錄同名的執行檔）
go build ./...

# 指定輸出路徑與名稱
go build -o bin/server ./cmd/server

# 移除除錯符號與 DWARF 資訊（減小二進位檔案大小）
go build -ldflags="-s -w" -o bin/server ./cmd/server

# 注入版本資訊（CI 常用）
VERSION=$(git describe --tags --always)
go build -ldflags="-s -w -X main.version=${VERSION}" -o bin/server ./cmd/server
```

#### 交叉編譯

Go 原生支援交叉編譯，只需設定 `GOOS` 和 `GOARCH` 環境變數：

```bash
# 編譯給 Linux AMD64（最常見的伺服器環境）
GOOS=linux GOARCH=amd64 go build -o bin/server-linux-amd64 ./cmd/server

# 編譯給 Linux ARM64（AWS Graviton、Apple M 系列 Docker）
GOOS=linux GOARCH=arm64 go build -o bin/server-linux-arm64 ./cmd/server

# 編譯給 Windows AMD64
GOOS=windows GOARCH=amd64 go build -o bin/server-windows-amd64.exe ./cmd/server

# 編譯給 macOS Apple Silicon
GOOS=darwin GOARCH=arm64 go build -o bin/server-darwin-arm64 ./cmd/server
```

```bash
# 批次交叉編譯腳本
platforms=("linux/amd64" "linux/arm64" "windows/amd64" "darwin/arm64")
for platform in "${platforms[@]}"; do
    GOOS=$(echo $platform | cut -d/ -f1)
    GOARCH=$(echo $platform | cut -d/ -f2)
    output="bin/server-${GOOS}-${GOARCH}"
    [[ "$GOOS" == "windows" ]] && output="${output}.exe"
    GOOS=$GOOS GOARCH=$GOARCH go build -ldflags="-s -w" -o "$output" ./cmd/server
    echo "Built: $output"
done
```

#### 常用 GOOS / GOARCH 對照表

| 環境 | GOOS | GOARCH |
| :--- | :--- | :--- |
| Linux 64 位元（x86） | linux | amd64 |
| Linux 64 位元（ARM） | linux | arm64 |
| Windows 64 位元 | windows | amd64 |
| macOS Apple Silicon | darwin | arm64 |
| macOS Intel | darwin | amd64 |

### 2-2 go run：執行程式

```bash
# 直接執行（適合快速測試，不產生執行檔）
go run ./cmd/server

# 傳入參數
go run ./cmd/server --port 8080 --env development

# 執行單一檔案（適合獨立腳本）
go run main.go

# 執行多個檔案
go run cmd/server/main.go cmd/server/config.go
```

> **注意**：`go run` 每次都重新編譯，不適合生產環境。開發時搭配 Air 熱重載（見 § 6-1）效率更高。

### 2-3 go test：測試旗標（-run、-v、-race、-count、-timeout）

```bash
# 執行所有測試
go test ./...

# 詳細輸出（顯示每個測試名稱與結果）
go test -v ./...

# 只執行名稱符合 regex 的測試
go test -run TestCreateUser ./internal/service/...

# 執行子測試（t.Run 命名）
go test -run TestCreateUser/有效輸入 ./...

# 啟用 Race Detector（偵測併發資料競爭，必做）
go test -race ./...

# 執行 N 次（預設 1 次，用於偵測 Flaky Test）
go test -count=3 ./...

# 設定逾時（預設 10 分鐘）
go test -timeout 30s ./...

# 同時使用多個旗標
go test -v -race -count=1 -timeout=60s ./...

# 執行 Benchmark
go test -bench=. -benchmem ./...

# 只執行指定 Benchmark
go test -bench=BenchmarkInsert -benchmem ./...

# 產生覆蓋率報告
go test -cover ./...
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html
```

### 2-4 go vet：靜態分析（常見發現的問題）

`go vet` 是 Go 內建的靜態分析工具，能找出語法正確但語意可疑的程式碼：

```bash
# 分析所有套件
go vet ./...

# 分析指定套件
go vet ./internal/service/...
```

#### go vet 常見發現的問題

```go
// 1. Printf 格式字串與參數不符
fmt.Printf("%d", "hello")    // vet 報錯：%d 需要整數，給了字串

// 2. 在 goroutine 中複製 sync.Mutex（會導致 race condition）
var mu sync.Mutex
mu2 := mu    // vet 報錯：copying lock value

// 3. loop 變數在 goroutine 中的閉包問題（Go 1.22 以前）
for _, v := range items {
    go func() {
        fmt.Println(v)    // vet 警告：loop variable captured by func literal
    }()
}

// 4. Unreachable code（return 後的程式碼）
func foo() int {
    return 1
    fmt.Println("never")  // vet 報錯：unreachable code
}

// 5. 錯誤的 struct tag 語法
type User struct {
    Name string `json:"name",omitempty`  // 應該是 json:"name,omitempty"
}
```

### 2-5 go fmt / gofmt：自動格式化

```bash
# 格式化並覆寫檔案（最常用）
gofmt -w .

# 只顯示差異，不修改（用於 CI 檢查）
gofmt -d .

# 格式化並簡化程式碼（-s 旗標）
gofmt -s -w .

# 使用 go fmt（包裝 gofmt）
go fmt ./...
```

> **建議**：在 IDE 中設定「存檔時自動執行 gofmt」，並在 CI 中加入格式檢查步驟，確保團隊程式碼風格統一。

```bash
# CI 格式檢查：若有未格式化的程式碼則失敗
if [ "$(gofmt -l . | wc -l)" -gt 0 ]; then
    echo "以下檔案未格式化："
    gofmt -l .
    exit 1
fi
```

### 2-6 go doc：查詢文件

```bash
# 查看套件文件
go doc fmt

# 查看函數文件
go doc fmt.Printf

# 查看 struct 文件
go doc net/http.Request

# 查看介面文件
go doc io.Reader

# 查看本地套件
go doc ./internal/service

# 顯示所有匯出的符號（-all）
go doc -all net/http
```

### 2-7 go generate：程式碼生成

`go generate` 掃描原始碼中的 `//go:generate` 指令並執行：

```go
// user.go

//go:generate mockgen -source=user.go -destination=mocks/user_mock.go -package=mocks
//go:generate stringer -type=Status

type UserRepository interface {
    FindByID(ctx context.Context, id int64) (*User, error)
    Create(ctx context.Context, user *User) error
}

type Status int

const (
    StatusActive Status = iota
    StatusInactive
    StatusBanned
)
```

```bash
# 執行當前目錄的所有 generate 指令
go generate ./...

# 執行指定檔案
go generate ./internal/repository/user.go
```

常見搭配工具：

| 工具 | 用途 |
| :--- | :--- |
| `mockgen` | 自動生成 Mock（搭配 gomock） |
| `stringer` | 為 int 型別生成 String() 方法 |
| `wire` | 依賴注入程式碼生成 |
| `oapi-codegen` | 由 OpenAPI spec 生成 Go 程式碼 |
| `sqlc` | 由 SQL 查詢生成型別安全的 Go 程式碼 |

### 2-8 go env：查看環境變數

```bash
# 查看所有 Go 環境變數
go env

# 查看特定變數
go env GOPATH
go env GOPROXY
go env GOMODCACHE

# 設定環境變數（寫入使用者設定）
go env -w GOPROXY=https://goproxy.cn,direct
go env -w GONOSUMDB=*.internal.company.com

# 重置為預設值
go env -u GOPROXY
```

常用環境變數說明：

| 變數 | 說明 | 預設值 |
| :--- | :--- | :--- |
| `GOPATH` | Go 工作區根目錄 | `~/go` |
| `GOMODCACHE` | 模組快取目錄 | `$GOPATH/pkg/mod` |
| `GOPROXY` | 模組代理伺服器 | `https://proxy.golang.org,direct` |
| `GONOSUMDB` | 不走 Sum 資料庫驗證的路徑 | 空 |
| `GOPRIVATE` | 私有模組路徑（同時設定 GONOSUMDB+GONOPROXY） | 空 |
| `CGO_ENABLED` | 是否啟用 CGO（0=純靜態編譯） | `1` |
| `GOTELEMETRY` | 遙測資料收集設定（off 關閉） | `local` |

---

## 3. 程式碼品質工具

### 3-1 golangci-lint：多合一 linter

`golangci-lint` 整合了數十種 linter，比個別安裝快且方便：

#### 安裝方式

```bash
# macOS（Homebrew）
brew install golangci-lint

# Linux / Windows（官方腳本，安裝到 ./bin/golangci-lint）
curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh \
    | sh -s -- -b $(go env GOPATH)/bin v1.57.2

# 使用 go install（不建議，版本控制較難）
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# 確認安裝
golangci-lint --version
```

```bash
# 執行 lint
golangci-lint run ./...

# 只顯示新增的問題（CI 增量模式）
golangci-lint run --new-from-rev=HEAD~1 ./...

# 自動修復可自動修正的問題
golangci-lint run --fix ./...
```

#### .golangci.yml 設定範例

```yaml
# .golangci.yml

run:
  timeout: 5m
  go: "1.22"
  # 分析時排除的目錄
  skip-dirs:
    - vendor
    - testdata
    - generated

linters:
  # 只啟用以下 linter（推薦方式：明確列出）
  disable-all: true
  enable:
    - govet          # go vet 標準檢查
    - errcheck       # 檢查未處理的 error
    - staticcheck    # 進階靜態分析
    - gofmt          # 格式化檢查
    - goimports      # import 排序檢查
    - gosec          # 安全性掃描
    - gosimple       # 程式碼簡化建議
    - unused         # 未使用的程式碼
    - misspell       # 英文拼字錯誤
    - gocritic       # 程式碼風格建議
    - godot          # 注釋結尾加句點
    - gochecknoinits # 禁止 init()
    - bodyclose      # HTTP response body 是否有 Close
    - contextcheck   # context 傳遞檢查
    - noctx          # 禁止沒有 context 的 HTTP 請求

linters-settings:
  errcheck:
    # 排除特定函數的 error 檢查（如 io.Closer.Close）
    exclude-functions:
      - (io.Closer).Close
      - (*os.File).Close

  govet:
    enable-all: true

  gosec:
    # 排除特定規則
    excludes:
      - G204  # subprocess with variable（動態命令允許）

  misspell:
    locale: US

  gocritic:
    enabled-tags:
      - diagnostic
      - style
      - performance

issues:
  # 排除特定路徑的特定規則
  exclude-rules:
    - path: "_test\\.go"
      linters:
        - errcheck   # 測試中允許忽略 error
        - gosec
    - path: "cmd/"
      linters:
        - gochecknoinits  # cmd 允許 init()

  # 最多顯示幾個同類問題（0 = 不限）
  max-same-issues: 0
```

#### 常用 linter 說明

| Linter | 用途 | 嚴重程度 |
| :--- | :--- | :--- |
| `govet` | 涵蓋 go vet 所有檢查 | 高 |
| `errcheck` | 偵測未處理的 error | 高 |
| `staticcheck` | 深度靜態分析（效能、正確性） | 高 |
| `gosec` | 安全性問題（SQL Injection、硬編碼密碼） | 高 |
| `bodyclose` | HTTP response.Body 未關閉（記憶體洩漏） | 高 |
| `contextcheck` | context 未正確傳遞 | 中 |
| `gofmt` | 格式化不符 gofmt 標準 | 中 |
| `unused` | 未使用的函數、變數、型別 | 中 |
| `misspell` | 英文拼字錯誤 | 低 |
| `godot` | 注釋最後沒有句點 | 低 |

### 3-2 staticcheck：深度靜態分析

`staticcheck` 是比 `go vet` 更全面的靜態分析工具，能發現效能問題、API 誤用等：

```bash
# 安裝
go install honnef.co/go/tools/cmd/staticcheck@latest

# 執行
staticcheck ./...

# 查看所有規則
staticcheck -list-checks
```

常見的 staticcheck 警告：

```go
// SA1006：strings.Replace 最後一個參數為 0（應為 -1 才能替換全部）
strings.Replace(s, "a", "b", 0)  // 應該是 strings.ReplaceAll(s, "a", "b")

// S1039：不必要的 Sprintf
fmt.Sprintf("%s", str)  // 應直接用 str

// QF1003：可用 strings.Contains 替代
strings.Index(s, sub) != -1  // 應用 strings.Contains(s, sub)

// SA4006：賦值後立即被覆蓋（多餘的賦值）
x := 1
x = 2  // 第一行的 x = 1 沒有被用到
```

### 3-3 gosec：安全性掃描

`gosec` 掃描 Go 程式碼中的常見安全漏洞：

```bash
# 安裝
go install github.com/securego/gosec/v2/cmd/gosec@latest

# 掃描所有套件
gosec ./...

# 輸出 JSON 格式（適合 CI 整合）
gosec -fmt json -out gosec-report.json ./...

# 排除特定規則
gosec -exclude=G304,G401 ./...
```

常見的 gosec 規則：

| 規則 | 說明 |
| :--- | :--- |
| G101 | 程式碼中有疑似硬編碼的密碼 |
| G201/G202 | SQL 查詢可能有注入風險 |
| G304 | 檔案路徑來自使用者輸入（路徑遍歷風險） |
| G401 | 使用了不安全的加密演算法（MD5、SHA1） |
| G501 | 使用了不安全的亂數（math/rand 而非 crypto/rand） |

### 3-4 govulncheck：漏洞掃描

`govulncheck` 由 Go 官方維護，掃描依賴中的已知漏洞（CVE）：

```bash
# 安裝
go install golang.org/x/vuln/cmd/govulncheck@latest

# 掃描當前模組
govulncheck ./...

# 掃描指定二進位檔案
govulncheck -mode binary ./bin/server
```

```text
輸出範例：
=== Symbol Results ===

Vulnerability #1: GO-2023-1988
    Excessive memory allocation in net/http when handling
    chunked requests in golang.org/x/net/http2
  More info: https://pkg.go.dev/vuln/GO-2023-1988
  Module: golang.org/x/net
    Found in: golang.org/x/net@v0.10.0
    Fixed in: golang.org/x/net@v0.17.0
    Example traces found:
      #1: main.go:15:6: main.main calls ...
```

> **建議**：在 CI 中定期執行 `govulncheck`，或搭配 Dependabot / Renovate 自動升級有漏洞的依賴。

---

## 4. Makefile 自動化

### 4-1 為什麼用 Makefile？

Makefile 解決了「每個人執行指令不一致」的問題：

* 新成員一行指令完成環境設定：`make setup`
* CI/CD 與本地開發使用相同的指令
* 避免在 README 中維護落伍的指令列表
* 依賴關係管理（`make docker` 自動先 `make build`）

### 4-2 完整 Makefile 範例（build、test、lint、clean、run、docker）

```makefile
# Makefile

# ---- 變數設定 ----
APP_NAME    := myapp
CMD_PATH    := ./cmd/server
BIN_DIR     := bin
BIN_PATH    := $(BIN_DIR)/$(APP_NAME)

# 版本資訊（從 git 取得）
VERSION     := $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
BUILD_TIME  := $(shell date -u '+%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT  := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# 編譯旗標
LDFLAGS     := -s -w \
               -X main.version=$(VERSION) \
               -X main.buildTime=$(BUILD_TIME) \
               -X main.gitCommit=$(GIT_COMMIT)

# Docker 設定
DOCKER_IMAGE    := yourname/$(APP_NAME)
DOCKER_TAG      := $(VERSION)

# 測試設定
TEST_FLAGS  := -v -race -count=1 -timeout=120s
COVER_FILE  := coverage.out

# Go 工具
GOLANGCI_VERSION := v1.57.2

.DEFAULT_GOAL := help

# ---- 主要目標 ----

.PHONY: help
help: ## 顯示此說明
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: build
build: ## 編譯應用程式
	@mkdir -p $(BIN_DIR)
	CGO_ENABLED=0 go build -ldflags="$(LDFLAGS)" -o $(BIN_PATH) $(CMD_PATH)
	@echo "Built: $(BIN_PATH) ($(VERSION))"

.PHONY: build-linux
build-linux: ## 編譯 Linux AMD64 版本
	@mkdir -p $(BIN_DIR)
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
		go build -ldflags="$(LDFLAGS)" \
		-o $(BIN_DIR)/$(APP_NAME)-linux-amd64 $(CMD_PATH)

.PHONY: build-all
build-all: ## 編譯所有平台版本
	@mkdir -p $(BIN_DIR)
	@for platform in linux/amd64 linux/arm64 windows/amd64 darwin/arm64; do \
		GOOS=$$(echo $$platform | cut -d/ -f1); \
		GOARCH=$$(echo $$platform | cut -d/ -f2); \
		output="$(BIN_DIR)/$(APP_NAME)-$$GOOS-$$GOARCH"; \
		[ "$$GOOS" = "windows" ] && output="$$output.exe"; \
		echo "Building $$output..."; \
		CGO_ENABLED=0 GOOS=$$GOOS GOARCH=$$GOARCH \
			go build -ldflags="$(LDFLAGS)" -o $$output $(CMD_PATH); \
	done

.PHONY: run
run: ## 執行應用程式（開發模式）
	go run $(CMD_PATH)

.PHONY: test
test: ## 執行所有測試（含 race detector）
	go test $(TEST_FLAGS) ./...

.PHONY: test-short
test-short: ## 執行快速測試（跳過整合測試）
	go test -short -race -count=1 ./...

.PHONY: test-cover
test-cover: ## 執行測試並產生覆蓋率報告
	go test -race -coverprofile=$(COVER_FILE) -covermode=atomic ./...
	go tool cover -html=$(COVER_FILE) -o coverage.html
	@echo "Coverage report: coverage.html"

.PHONY: lint
lint: ## 執行 golangci-lint
	golangci-lint run ./...

.PHONY: lint-fix
lint-fix: ## 執行 golangci-lint 並自動修復
	golangci-lint run --fix ./...

.PHONY: vet
vet: ## 執行 go vet
	go vet ./...

.PHONY: fmt
fmt: ## 格式化程式碼
	gofmt -s -w .
	goimports -w .

.PHONY: fmt-check
fmt-check: ## 檢查格式化（CI 使用）
	@if [ "$$(gofmt -l . | wc -l)" -gt 0 ]; then \
		echo "以下檔案未格式化:"; \
		gofmt -l .; \
		exit 1; \
	fi

.PHONY: generate
generate: ## 執行程式碼生成
	go generate ./...

.PHONY: tidy
tidy: ## 整理依賴
	go mod tidy
	go mod verify

.PHONY: vuln
vuln: ## 掃描已知漏洞
	govulncheck ./...

.PHONY: security
security: ## 執行安全性掃描
	gosec -exclude=G204 ./...

# ---- Docker 目標 ----

.PHONY: docker-build
docker-build: ## 建置 Docker 映像檔
	docker build \
		--build-arg VERSION=$(VERSION) \
		--build-arg BUILD_TIME=$(BUILD_TIME) \
		-t $(DOCKER_IMAGE):$(DOCKER_TAG) \
		-t $(DOCKER_IMAGE):latest \
		.

.PHONY: docker-push
docker-push: docker-build ## 推送 Docker 映像檔
	docker push $(DOCKER_IMAGE):$(DOCKER_TAG)
	docker push $(DOCKER_IMAGE):latest

.PHONY: docker-run
docker-run: ## 使用 docker-compose 啟動服務
	docker-compose up -d

.PHONY: docker-down
docker-down: ## 停止 docker-compose 服務
	docker-compose down

# ---- 清理目標 ----

.PHONY: clean
clean: ## 清理建置產物
	rm -rf $(BIN_DIR)
	rm -f $(COVER_FILE) coverage.html
	go clean -cache

# ---- 複合目標 ----

.PHONY: check
check: fmt-check vet lint test ## 執行所有檢查（CI 完整流程）

.PHONY: setup
setup: ## 安裝所有開發工具
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@$(GOLANGCI_VERSION)
	go install golang.org/x/tools/cmd/goimports@latest
	go install github.com/air-verse/air@latest
	go install golang.org/x/vuln/cmd/govulncheck@latest
	go install github.com/securego/gosec/v2/cmd/gosec@latest
	@echo "開發工具安裝完成"
```

### 4-3 變數與環境變數注入

```makefile
# 從環境變數讀取，並提供預設值
DB_HOST ?= localhost
DB_PORT ?= 5432
APP_ENV ?= development

.PHONY: run-dev
run-dev: ## 以開發設定執行
	DB_HOST=$(DB_HOST) DB_PORT=$(DB_PORT) APP_ENV=$(APP_ENV) \
		go run $(CMD_PATH)

# 使用 .env 檔案（若存在）
-include .env
export
```

```bash
# 覆蓋 Makefile 變數
make build VERSION=v1.2.3
make docker-build DOCKER_IMAGE=registry.company.com/myapp
```

### 4-4 .PHONY 的用途

`.PHONY` 告訴 make 這些目標不是實際的檔案名稱，防止與同名目錄衝突：

```makefile
# 若專案根目錄有名為 "test" 的資料夾，
# make 會認為 test 目標已是最新，不執行
# 加上 .PHONY 可強制執行
.PHONY: test build clean

# 慣例：所有不產生同名檔案的目標都加 .PHONY
```

---

## 5. Docker 化 Go 應用

### 5-1 多階段建置（Multi-stage Build）

#### 為什麼用多階段建置（映像檔大小比較）

| 方式 | 映像檔大小 | 說明 |
| :--- | :--- | :--- |
| 直接用 golang:1.22 | ~1.1 GB | 包含整個 Go 工具鏈，生產環境不需要 |
| 單階段 + alpine | ~20 MB | 需要手動安裝 Go，維護較複雜 |
| 多階段建置 + alpine | ~15 MB | 建置階段用完整 Go 環境，執行階段只保留二進位檔 |
| 多階段建置 + scratch | ~8 MB | 最小化，但需靜態編譯 |
| 多階段建置 + distroless | ~10 MB | 比 scratch 多一些系統憑證和時區資料 |

#### 完整 Dockerfile 範例

```dockerfile
# ---- 第一階段：建置（Builder） ----
# 使用完整的 Go 工具鏈映像檔進行編譯
FROM golang:1.22-alpine AS builder

# 安裝 CGO 依賴（如果使用 CGO_ENABLED=1 才需要）
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /build

# 先複製 go.mod 和 go.sum，充分利用 Docker layer 快取
# 只有依賴變更時才重新下載，加速後續建置
COPY go.mod go.sum ./
RUN go mod download

# 複製原始碼
COPY . .

# 建置參數（可從 docker build --build-arg 傳入）
ARG VERSION=dev
ARG BUILD_TIME=unknown

# 靜態編譯：CGO_ENABLED=0 確保二進位檔不依賴系統函式庫
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-s -w -X main.version=${VERSION} -X main.buildTime=${BUILD_TIME}" \
    -o /build/server \
    ./cmd/server

# ---- 第二階段：執行環境（Runner） ----
# 使用最小化映像檔，不包含 Go 工具鏈
FROM alpine:3.19 AS runner

# 安裝必要的系統憑證和時區資料
RUN apk add --no-cache ca-certificates tzdata && \
    # 建立非 root 使用者（安全最佳實踐）
    addgroup -S appgroup && \
    adduser -S appuser -G appgroup

WORKDIR /app

# 只從 builder 複製編譯好的二進位檔
COPY --from=builder /build/server .

# 若有靜態資源或設定檔也一起複製
# COPY --from=builder /build/configs ./configs
# COPY --from=builder /build/static ./static

# 以非 root 使用者執行（安全）
USER appuser

# 宣告監聽的 port（文件用途，不實際開放）
EXPOSE 8080

# 健康檢查（見 § 5-5）
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8080/health || exit 1

ENTRYPOINT ["./server"]
```

### 5-2 最小映像檔（scratch vs alpine vs distroless）

```dockerfile
# ---- scratch（最小，約 0 bytes 基礎層）----
# 需要靜態編譯，不支援 shell（除錯困難）
FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /build/server .
ENTRYPOINT ["/server"]

# ---- alpine（最常用，約 5 MB）----
# 有 shell、包管理器，除錯方便，有少量安全考量
FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /build/server .
ENTRYPOINT ["./server"]

# ---- distroless（Google 維護，約 2 MB）----
# 無 shell、無套件管理器，比 alpine 更安全
FROM gcr.io/distroless/static-debian12
COPY --from=builder /build/server .
ENTRYPOINT ["/server"]
```

#### 選擇建議

| 需求 | 推薦 |
| :--- | :--- |
| 生產環境、安全優先 | distroless 或 scratch |
| 需要偶爾進入容器除錯 | alpine |
| 使用 CGO 或動態函式庫 | alpine（需安裝對應函式庫） |

### 5-3 靜態編譯（CGO_ENABLED=0）

```bash
# CGO_ENABLED=0：停用 CGO，產生靜態連結的二進位檔
# 靜態編譯的二進位檔可在任何 Linux 環境執行，不依賴 glibc
CGO_ENABLED=0 go build -o server ./cmd/server

# 確認是否為靜態連結
file server
# server: ELF 64-bit LSB executable, x86-64, statically linked
```

> **警告**：若使用 `database/sql` 搭配 `mattn/go-sqlite3` 等使用 CGO 的驅動，無法完全靜態編譯。請改用純 Go 實作的驅動（如 `modernc.org/sqlite`）。

### 5-4 docker-compose.yml 範例（App + PostgreSQL + Redis）

```yaml
# docker-compose.yml

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        VERSION: ${VERSION:-dev}
    ports:
      - "8080:8080"
    environment:
      - APP_ENV=development
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=${DB_NAME:-myapp}
      - DB_USER=${DB_USER:-postgres}
      - DB_PASSWORD=${DB_PASSWORD:-secret}
      - REDIS_ADDR=redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-network

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${DB_NAME:-myapp}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-secret}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"    # 開發時方便連線，生產環境應移除
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"    # 開發時方便連線，生產環境應移除
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

volumes:
  postgres-data:
  redis-data:

networks:
  app-network:
    driver: bridge
```

```bash
# 啟動所有服務
docker-compose up -d

# 只啟動依賴服務（開發時本地跑 Go 程式）
docker-compose up -d postgres redis

# 查看日誌
docker-compose logs -f app

# 停止並清除資料
docker-compose down -v
```

### 5-5 健康檢查（HEALTHCHECK）

在 Go 應用程式中加入 `/health` 端點：

```go
// internal/handler/health.go

func (h *Handler) HealthCheck(c *gin.Context) {
    // 可以在這裡檢查資料庫連線、快取連線等
    c.JSON(http.StatusOK, gin.H{
        "status":  "ok",
        "version": h.version,
        "time":    time.Now().UTC(),
    })
}
```

Dockerfile 中的 HEALTHCHECK：

```dockerfile
# 使用 wget（alpine 內建）
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8080/health || exit 1

# 或使用 curl（需另外安裝）
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1
```

---

## 6. 開發環境工具

### 6-1 Air：熱重載（Live Reload）

Air 監聽檔案變更並自動重新編譯、重啟服務，大幅加速開發流程：

#### 安裝與 .air.toml 設定

```bash
# 安裝
go install github.com/air-verse/air@latest

# 在專案根目錄初始化設定
air init
# 這會生成 .air.toml

# 啟動熱重載
air
```

```toml
# .air.toml（完整設定範例）

root = "."
tmp_dir = "tmp"

[build]
  # 執行的命令（先 go build，成功後執行）
  cmd = "go build -o ./tmp/main ./cmd/server"
  # 建置完成後執行的二進位檔
  bin = "tmp/main"
  # 傳給執行程式的參數
  args_bin = ["--env", "development"]
  # 監聽這些副檔名的變更
  include_ext = ["go", "tpl", "tmpl", "html"]
  # 排除目錄
  exclude_dir = ["tmp", "vendor", "testdata", "node_modules", ".git"]
  # 排除特定檔案
  exclude_file = []
  # 排除 regex 匹配的路徑
  exclude_regex = ["_test\\.go"]
  # 有新檔案加入時也觸發重建
  include_dir = []
  # 建置失敗時是否繼續監聽
  stop_on_error = false
  # 建置失敗後的延遲（毫秒），避免頻繁觸發
  delay = 200

[log]
  time = true
  main_only = false

[color]
  main = "magenta"
  watcher = "cyan"
  build = "yellow"
  runner = "green"

[misc]
  clean_on_exit = true
```

#### 排除目錄設定

```toml
# 專案使用 embedded 靜態資源時，排除前端建置目錄
[build]
  exclude_dir = ["tmp", "vendor", "node_modules", "dist", "web/dist", ".git", "testdata"]
```

### 6-2 dlv（Delve）：Go 除錯器

Delve 是 Go 官方推薦的除錯器，支援斷點、單步執行、變數檢查：

#### 安裝

```bash
go install github.com/go-delve/delve/cmd/dlv@latest
```

#### 基本操作（breakpoint、next、step、print）

```bash
# 啟動並除錯
dlv debug ./cmd/server

# 除錯測試
dlv test ./internal/service -- -run TestCreateUser

# 連接到已執行的程序（使用 PID）
dlv attach 12345
```

在 `dlv` 互動介面中：

```text
# 設定斷點（在函數入口）
(dlv) break main.main
(dlv) break internal/service.(*UserService).CreateUser

# 設定行斷點
(dlv) break cmd/server/main.go:25

# 開始執行（到下一個斷點）
(dlv) continue

# 執行下一行（不進入函數）
(dlv) next

# 進入函數內部
(dlv) step

# 跳出當前函數
(dlv) stepout

# 印出變數值
(dlv) print myVariable
(dlv) p myVariable

# 印出本地變數
(dlv) locals

# 印出 goroutine 清單
(dlv) goroutines

# 切換到指定 goroutine
(dlv) goroutine 5

# 查看 goroutine 的 stack trace
(dlv) goroutine 5 bt

# 繼續執行到函數回傳
(dlv) finish

# 列出目前位置的原始碼
(dlv) list

# 退出
(dlv) quit
```

#### 連接遠端 delve（容器內除錯）

在容器內啟動 delve server：

```bash
# 在容器中以除錯模式啟動（監聽 2345 port）
dlv debug --headless --listen=:2345 --api-version=2 --accept-multiclient ./cmd/server
```

```dockerfile
# Dockerfile.debug（開發用）
FROM golang:1.22-alpine
RUN go install github.com/go-delve/delve/cmd/dlv@latest
WORKDIR /app
COPY . .
EXPOSE 8080 2345
CMD ["dlv", "debug", "--headless", "--listen=:2345", \
     "--api-version=2", "--accept-multiclient", "./cmd/server"]
```

從本地連接遠端 delve：

```bash
# 轉發容器的 2345 port 到本地
kubectl port-forward pod/myapp-xxx 2345:2345

# 本地連接遠端 dlv
dlv connect localhost:2345
```

VS Code 的 `.vscode/launch.json` 設定：

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Connect to Remote Delve",
            "type": "go",
            "request": "attach",
            "mode": "remote",
            "remotePath": "/app",
            "port": 2345,
            "host": "localhost"
        }
    ]
}
```

### 6-3 gopls：語言伺服器（LSP）

`gopls` 是 Go 官方的語言伺服器，提供 IDE 自動完成、跳轉定義、重構等功能：

```bash
# 安裝（通常 IDE 外掛會自動安裝）
go install golang.org/x/tools/gopls@latest

# 更新
go install golang.org/x/tools/gopls@latest
```

VS Code 的 `settings.json` 建議設定：

```json
{
    "gopls": {
        "ui.semanticTokens": true,
        "formatting.gofumpt": true,
        "analysis.unusedparams": true,
        "analysis.shadow": true,
        "codelenses": {
            "gc_details": true,
            "generate": true,
            "regenerate_cgo": true,
            "run_govulncheck": true,
            "test": true,
            "tidy": true,
            "upgrade_dependency": true,
            "vendor": true
        }
    },
    "editor.formatOnSave": true,
    "[go]": {
        "editor.defaultFormatter": "golang.go",
        "editor.codeActionsOnSave": {
            "source.organizeImports": "explicit"
        }
    }
}
```

---

## 7. CI/CD 基礎

### 7-1 GitHub Actions 完整範例（lint + test + build）

```yaml
# .github/workflows/ci.yml

name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  GO_VERSION: "1.22"

jobs:
  # ---- 程式碼品質檢查 ----
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - name: Checkout 程式碼
        uses: actions/checkout@v4

      - name: 設定 Go 環境
        uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}
          cache: false  # golangci-lint 有自己的快取

      - name: 執行 golangci-lint
        uses: golangci/golangci-lint-action@v4
        with:
          version: v1.57.2
          args: --timeout=5m

  # ---- 測試 ----
  test:
    name: Test
    runs-on: ubuntu-latest
    # 啟動測試依賴的 PostgreSQL 和 Redis
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout 程式碼
        uses: actions/checkout@v4

      - name: 設定 Go 環境
        uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}

      - name: 快取 Go Modules
        uses: actions/cache@v4
        with:
          path: |
            ~/.cache/go-build
            ~/go/pkg/mod
          key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
          restore-keys: |
            ${{ runner.os }}-go-

      - name: 下載依賴
        run: go mod download

      - name: 執行 go vet
        run: go vet ./...

      - name: 執行測試（含 Race Detector）
        run: go test -race -coverprofile=coverage.out -covermode=atomic ./...
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USER: testuser
          DB_PASSWORD: testpass
          DB_NAME: testdb
          REDIS_ADDR: localhost:6379

      - name: 上傳覆蓋率報告
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage.out
          fail_ci_if_error: false

  # ---- 建置 ----
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [ lint, test ]  # lint 和 test 都通過才執行
    steps:
      - name: Checkout 程式碼
        uses: actions/checkout@v4

      - name: 設定 Go 環境
        uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}

      - name: 快取 Go Modules
        uses: actions/cache@v4
        with:
          path: |
            ~/.cache/go-build
            ~/go/pkg/mod
          key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
          restore-keys: |
            ${{ runner.os }}-go-

      - name: 編譯（Linux AMD64）
        run: |
          CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
          go build \
            -ldflags="-s -w -X main.version=${{ github.sha }}" \
            -o bin/server-linux-amd64 \
            ./cmd/server

      - name: 上傳建置產物
        uses: actions/upload-artifact@v4
        with:
          name: server-linux-amd64
          path: bin/server-linux-amd64
          retention-days: 7
```

### 7-2 快取 Go Modules（actions/cache）

```yaml
# 標準 Go Modules 快取設定（可直接複製使用）
- name: 快取 Go Modules 與建置快取
  uses: actions/cache@v4
  with:
    path: |
      ~/.cache/go-build        # 建置快取
      ~/go/pkg/mod             # 模組快取
    key: ${{ runner.os }}-go-${{ env.GO_VERSION }}-${{ hashFiles('**/go.sum') }}
    restore-keys: |
      ${{ runner.os }}-go-${{ env.GO_VERSION }}-
      ${{ runner.os }}-go-
```

> **注意**：使用 `actions/setup-go@v5` 時，若設定 `cache: true`，它會自動處理快取，不需要額外加 `actions/cache`。兩者選其一即可。

### 7-3 多版本測試（Go matrix）

```yaml
# .github/workflows/matrix.yml

name: Multi-version Test

on: [push, pull_request]

jobs:
  test:
    name: Test Go ${{ matrix.go-version }}
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        go-version: ["1.21", "1.22", "1.23"]
        os: [ubuntu-latest, macos-latest, windows-latest]
        # 排除特定組合
        exclude:
          - os: windows-latest
            go-version: "1.21"
      fail-fast: false  # 一個失敗不影響其他組合

    steps:
      - uses: actions/checkout@v4

      - name: 設定 Go ${{ matrix.go-version }}
        uses: actions/setup-go@v5
        with:
          go-version: ${{ matrix.go-version }}

      - name: 執行測試
        run: go test -race ./...
```

### 7-4 Docker 映像檔推送

```yaml
# .github/workflows/docker.yml

name: Docker Build and Push

on:
  push:
    tags:
      - "v*"   # 只在推 tag 時觸發（如 v1.2.3）

jobs:
  docker:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write  # 推送到 GitHub Container Registry 需要

    steps:
      - name: Checkout 程式碼
        uses: actions/checkout@v4

      - name: 設定 Docker Buildx（支援多架構建置）
        uses: docker/setup-buildx-action@v3

      - name: 登入 GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # 或登入 Docker Hub
      # - name: 登入 Docker Hub
      #   uses: docker/login-action@v3
      #   with:
      #     username: ${{ secrets.DOCKERHUB_USERNAME }}
      #     password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: 取得映像檔 Metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix=

      - name: 建置並推送多架構映像檔
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          build-args: |
            VERSION=${{ github.ref_name }}
            BUILD_TIME=${{ github.event.head_commit.timestamp }}
          # 使用 GitHub Actions 快取
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## 8. 效能分析工具

### 8-1 pprof 啟用（net/http/pprof）

在 HTTP 服務中加入 pprof 端點（僅限非生產環境）：

```go
// cmd/server/main.go

import (
    _ "net/http/pprof"  // 匿名 import 觸發 init()，自動註冊路由
    "net/http"
)

func main() {
    // pprof 端點只在開發/測試環境啟用
    if os.Getenv("ENABLE_PPROF") == "true" {
        go func() {
            // 使用獨立的 port，不暴露到主服務 port
            log.Println("pprof listening on :6060")
            log.Println(http.ListenAndServe("localhost:6060", nil))
        }()
    }

    // 主服務...
}
```

```go
// 若使用 Gin，手動掛載 pprof 路由
import "github.com/gin-contrib/pprof"

func setupRouter(r *gin.Engine) {
    if os.Getenv("ENABLE_PPROF") == "true" {
        pprof.Register(r)
    }
}
```

> **警告**：pprof 端點會暴露記憶體內容和程序資訊，絕對不能在生產環境公開暴露。必須限制只能從內網存取或使用 localhost。

### 8-2 go tool pprof 使用（cpu、memory、goroutine）

```bash
# 採集 30 秒的 CPU profile
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# 採集記憶體 profile（heap）
go tool pprof http://localhost:6060/debug/pprof/heap

# 採集 goroutine profile
go tool pprof http://localhost:6060/debug/pprof/goroutine

# 採集後保存到檔案
curl -o cpu.prof http://localhost:6060/debug/pprof/profile?seconds=30
go tool pprof cpu.prof
```

在 pprof 互動介面中：

```text
# 查看佔用最高的函數（預設按 flat 排序）
(pprof) top

# 查看 top 20 個
(pprof) top 20

# 按累積時間排序
(pprof) top -cum

# 查看特定函數的呼叫鏈
(pprof) list yourFunctionName

# 以 web 介面顯示火焰圖（需安裝 Graphviz）
(pprof) web

# 以 web server 形式啟動互動介面（推薦）
go tool pprof -http=:8081 cpu.prof
```

在程式碼中直接產生 profile 檔案：

```go
import "runtime/pprof"

func profileCPU() {
    f, err := os.Create("cpu.prof")
    if err != nil {
        log.Fatal(err)
    }
    defer f.Close()

    // 開始採集
    if err := pprof.StartCPUProfile(f); err != nil {
        log.Fatal(err)
    }
    defer pprof.StopCPUProfile()

    // 執行要分析的程式碼
    doHeavyWork()
}

func profileMemory() {
    f, err := os.Create("mem.prof")
    if err != nil {
        log.Fatal(err)
    }
    defer f.Close()

    runtime.GC()  // 先執行 GC，讓快照更準確
    if err := pprof.WriteHeapProfile(f); err != nil {
        log.Fatal(err)
    }
}
```

### 8-3 trace：追蹤 goroutine 執行

`trace` 工具比 pprof 更細緻，能看到 goroutine 的排程、GC 事件、網路等待：

```bash
# 採集 trace 資料（5 秒）
curl -o trace.out http://localhost:6060/debug/pprof/trace?seconds=5

# 開啟 trace 視覺化介面
go tool trace trace.out
```

在程式碼中採集：

```go
import "runtime/trace"

func main() {
    f, err := os.Create("trace.out")
    if err != nil {
        log.Fatal(err)
    }
    defer f.Close()

    if err := trace.Start(f); err != nil {
        log.Fatal(err)
    }
    defer trace.Stop()

    // 執行要分析的程式碼
    runWorkload()
}
```

搭配 Benchmark 採集：

```bash
# 執行 Benchmark 時同時採集 trace
go test -bench=BenchmarkMyFunc -trace=trace.out ./...
go tool trace trace.out
```

### 8-4 benchstat：比較 Benchmark 結果

`benchstat` 統計多次 Benchmark 執行的結果，判斷優化是否有顯著效果：

```bash
# 安裝
go install golang.org/x/perf/cmd/benchstat@latest

# 執行 Benchmark 並儲存結果（-count 建議 5-10 次以上）
go test -bench=BenchmarkInsert -benchmem -count=10 ./... > before.txt

# 優化程式碼後再次執行
go test -bench=BenchmarkInsert -benchmem -count=10 ./... > after.txt

# 比較結果
benchstat before.txt after.txt
```

```text
輸出範例：
              │  before.txt  │             after.txt              │
              │    sec/op    │    sec/op     vs base               │
Insert-8        1.234µ ± 2%   0.892µ ± 3%  -27.72% (p=0.000 n=10)

              │  before.txt  │             after.txt              │
              │     B/op     │     B/op      vs base               │
Insert-8        256.0 ± 0%    128.0 ± 0%   -50.00% (p=0.000 n=10)

              │  before.txt  │            after.txt               │
              │  allocs/op   │  allocs/op   vs base               │
Insert-8         4.000 ± 0%    2.000 ± 0%  -50.00% (p=0.000 n=10)
```

`p=0.000` 表示統計上顯著的改善（p-value 接近 0）。

```bash
# 使用新版 benchstat 格式（更清楚）
benchstat -col /goos before.txt after.txt

# 只比較特定 Benchmark
benchstat -filter ".BenchmarkInsert" before.txt after.txt
```

---

## 9. 總結：工具選擇速查表

| 情境 | 工具 | 指令 |
| :--- | :--- | :--- |
| 初始化新專案 | go mod | `go mod init github.com/you/app` |
| 整理依賴 | go mod | `go mod tidy` |
| 同時開發多個模組 | go work | `go work init ./app ./lib` |
| 交叉編譯 Linux | go build | `GOOS=linux GOARCH=amd64 go build` |
| 熱重載開發 | Air | `air` |
| 單步除錯 | Delve | `dlv debug ./cmd/server` |
| 格式化程式碼 | gofmt | `gofmt -s -w .` |
| 靜態分析 | go vet | `go vet ./...` |
| 完整 Lint 檢查 | golangci-lint | `golangci-lint run ./...` |
| 安全性掃描 | gosec | `gosec ./...` |
| 漏洞掃描 | govulncheck | `govulncheck ./...` |
| 執行測試 | go test | `go test -race -v ./...` |
| 測試覆蓋率 | go test | `go test -coverprofile=c.out ./...` |
| 效能分析（CPU） | pprof | `go tool pprof -http=:8081 cpu.prof` |
| Benchmark 比較 | benchstat | `benchstat before.txt after.txt` |
| 建置 Docker 映像 | Docker | `docker build -t myapp .` |
| 自動化工作流程 | Makefile | `make check`、`make docker-build` |
| CI 品質閘門 | GitHub Actions | `.github/workflows/ci.yml` |

---

[← 返回目錄](README.md)

文件更新日期：2026年6月1日
