# Go 語言學習資源導讀

本目錄收錄十六份 Go 語言學習文件，並附有互動式練習網站，依照學習階段循序漸進，建議按以下順序閱讀。

---

## 🖥️ 互動練習網站

**Go 語言練習平台**是本資源的配套工具，提供即時編譯與自動測試。

### 功能特色

| 功能 | 說明 |
| :--- | :--- |
| **Monaco 編輯器** | VS Code 同款編輯器，支援 Go 語法高亮 |
| **即時執行** | 按 `Ctrl+Enter` 或點擊「▶ 執行」，後端呼叫本機 Go 執行 |
| **自動測試** | LeetCode 風格，每題自動執行多組測試案例，顯示 ✓/✗ |
| **難度標示** | 簡單 / 中等 / 困難 三級難度，對應文件學習階段 |
| **26 道概念題** | 對應文件 1–12 章的核心概念，只需填函數主體 |
| **12 道演算法題** | LeetCode 經典題（Two Sum、接雨水等），按難度分級 |
| **隨機挑戰** | 10 種題型即時隨機出題，每次參數不同 |
| **進度追蹤** | localStorage 自動儲存程式碼與完成狀態 |
| **深色/淺色主題** | 一鍵切換，偏好持久化 |

### 啟動方式

```bash
# 方法一：直接雙擊（Windows）
go_practice_web\run.bat

# 方法二：命令列
cd go_practice_web
go run main.go
# 瀏覽器開啟 http://localhost:8080
```

> **需求**：已安裝 Go 1.21+，網路連線（Monaco 編輯器從 CDN 載入）

### 練習題章節對應

```text
go_practice_web/
├── static/
│   ├── exercises.js       ← 26 道概念練習題（第 1–12 章）
│   ├── lc_exercises.js    ← 12 道 LeetCode 演算法題
│   └── random_exercises.js ← 10 種隨機挑戰題型
├── main.go                ← Go HTTP 伺服器（/api/run 執行端點）
└── run.bat                ← Windows 一鍵啟動
```

| 練習章節 | 對應文件 | 題數 |
| :--- | :--- | :--- |
| 1. 基礎語法 | GO_LEARNING_GUIDE | 3 題 |
| 2. 進階特性 | GO_LEARNING_GUIDE + GO_ADVANCED_FEATURES_GUIDE | 4 題 |
| 3. Struct 與 JSON | GO_STRUCT_JSON_GUIDE | 3 題 |
| 4. 指標 | GO_DEPTH_GUIDE | 1 題 |
| 5. Slice | GO_DEPTH_GUIDE | 1 題 |
| 6. Map | GO_DEPTH_GUIDE | 2 題 |
| 7. 介面 | GO_DEPTH_GUIDE | 2 題 |
| 8. 錯誤處理 | GO_LEARNING_GUIDE | 1 題 |
| 9. Goroutine 與 Channel | GO_CONCURRENCY_GUIDE | 4 題 |
| 10. 泛型 | GO_GENERICS_GUIDE | 2 題 |
| 11. Context | GO_CONTEXT_GUIDE | 2 題 |
| 12. 測試實踐 | GO_TESTING_GUIDE | 1 題 |
| LeetCode 演算法 | — | 12 題 |
| 隨機挑戰 | — | 10 種題型 |

---

## 文件總覽

```text
go_lang_data/
├── README.md                        ← 你在這裡
│
├── go_practice_web/                 ← 互動練習網站
│   ├── main.go
│   ├── run.bat
│   └── static/
│
├── ── 基礎入門 ──
├── GO_LEARNING_GUIDE.md             ← 第 1 步：入門知識地圖
├── GO_DEPTH_GUIDE.md                ← 第 2 步：語法深度解析
│
├── ── 核心語言特性 ──
├── GO_STRUCT_JSON_GUIDE.md          ← 第 3 步：Struct 設計與 JSON 處理
├── GO_ADVANCED_FEATURES_GUIDE.md    ← 第 4 步：進階語言特性
├── GO_CONCURRENCY_GUIDE.md          ← 第 5 步：併發控制完整指南
├── GO_CONTEXT_GUIDE.md              ← 第 6 步：context 套件完整指南
│
├── ── 實戰應用 ──
├── GO_STDLIB_GUIDE.md               ← 第 7 步：常用標準庫指南
├── GO_HTTP_GUIDE.md                 ← 第 8 步：HTTP 開發完整指南
├── GO_DATABASE_GUIDE.md             ← 第 9 步：資料庫操作完整指南
│
├── ── 進階主題 ──
├── GO_GENERICS_GUIDE.md             ← 第 10 步：泛型（Go 1.18+）
├── GO_PATTERNS_GUIDE.md             ← 第 11 步：常用設計模式
├── GO_MEMORY_MODEL_GUIDE.md         ← 第 12 步：記憶體模型與效能
├── GO_ARCHITECTURE_GUIDE.md         ← 第 13 步：架構設計實戰指南
│
├── ── 工程實踐 ──
├── GO_TESTING_GUIDE.md              ← 第 14 步：測試完整指南
├── GO_TOOLCHAIN_GUIDE.md            ← 第 15 步：工具鏈與工程實務
│
└── ── 面試準備 ──
    └── GO_INTERVIEW_GUIDE.md        ← 第 16 步：面試題目與解析（26題）
```

---

## 建議學習順序

### 第 1 步｜[GO_LEARNING_GUIDE.md](GO_LEARNING_GUIDE.md)

Go 入門指南：核心特性與基礎架構。適合剛接觸 Go 的初學者，建立整體知識地圖。

| 章節 | 內容 |
| :--- | :--- |
| 1. 設計哲學 | Less is More、組合優於繼承、原生併發 |
| 2. 關鍵字地圖 | 25 個關鍵字分類一覽 |
| 3. 核心程式結構 | 變數宣告、nil、for 迴圈、defer、閉包 |
| 4. 併發核心 | Goroutine、Channel、select、close、常見陷阱 |
| 5. 錯誤處理 | error、panic、recover |

**對應練習**：概念題第 1 章（基礎語法）、第 2 章（進階特性）

---

### 第 2 步｜[GO_DEPTH_GUIDE.md](GO_DEPTH_GUIDE.md)

語法深度解析：指標、集合、介面。適合已掌握基礎語法，想深入理解底層機制的學習者。

| 章節 | 內容 |
| :--- | :--- |
| 1. 指標 | 傳值 vs 傳址、效能影響、nil 指標、接收者選擇 |
| 2. 集合操作 | make/new、Slice len/cap、append 擴容、共享陷阱、Map 原理 |
| 3. 介面設計 | 隱式實現、編譯期驗證、型別斷言、介面升級、組合介面 |

**對應練習**：概念題第 4 章（指標）、第 5 章（Slice）、第 6 章（Map）、第 7 章（介面）

---

### 第 3 步｜[GO_STRUCT_JSON_GUIDE.md](GO_STRUCT_JSON_GUIDE.md)

Struct 深度解析與 JSON 操作。幾乎所有 API 開發都會用到的核心知識。

| 章節 | 內容 |
| :--- | :--- |
| 1. struct 基礎 | 初始化、零值、匿名欄位 |
| 2. struct 嵌入 | 方法提升、多層嵌入、欄位衝突 |
| 3. struct Tag | json / db / validate Tag 語法 |
| 4. 方法設計 | 值 vs 指標接收者、方法集規則 |
| 5–8. JSON | Marshal/Unmarshal、omitempty、null 處理、自訂序列化 |

**對應練習**：概念題第 3 章（Struct 與 JSON）

---

### 第 4 步｜[GO_ADVANCED_FEATURES_GUIDE.md](GO_ADVANCED_FEATURES_GUIDE.md)

進階語言特性：init()、iota、reflect、embed 等。補完語言細節，避免常見陷阱。

| 章節 | 內容 |
| :--- | :--- |
| 1. init() | 執行順序圖解、跨套件依賴、合理使用場景 |
| 2. iota | 位元旗標、跳值、Stringer 搭配 |
| 3. 具名回傳值 | naked return、與 defer 互動、修改回傳值 |
| 4. 型別別名 vs 型別定義 | 可賦值性差異、方法集差異 |
| 5. reflect | TypeOf/ValueOf、struct tag 讀取、動態呼叫、效能警告 |
| 6. Build Tags | //go:build 語法、整合測試隔離 |
| 7. //go:embed | 嵌入檔案、目錄、embed.FS |
| 8–10. 函數型別、高階函數、unsafe | 第一類函數、Middleware 模式、unsafe 警告 |

**對應練習**：概念題第 2 章（iota、閉包、defer、panic & recover）

---

### 第 5 步｜[GO_CONCURRENCY_GUIDE.md](GO_CONCURRENCY_GUIDE.md)

併發控制深度指南。掌握正確的併發控制，避免 Race Condition 與 Deadlock。

| 章節 | 內容 |
| :--- | :--- |
| 1. 為什麼需要併發控制 | Race Condition 根因解析 |
| 2. Channel 阻塞機制 | 無緩衝/有緩衝、select、Deadlock |
| 3. sync 套件 | Mutex、RWMutex、WaitGroup、Once、Map 五方案、Cond、atomic |
| 4. 綜合範例 | Worker Pool 實作 |

**對應練習**：概念題第 9 章（goroutine、channel pipeline、select、sync.Once/RWMutex）

---

### 第 6 步｜[GO_CONTEXT_GUIDE.md](GO_CONTEXT_GUIDE.md)

context 套件完整指南。分散式系統與 HTTP 開發的必備知識。

| 章節 | 內容 |
| :--- | :--- |
| 1–2. 為什麼需要 context | 場景說明、六種建立方式 |
| 3–5. 取消機制 | Done()、WithCancel、WithTimeout 實際範例 |
| 6–7. 傳值與 HTTP | WithValue、r.Context()、客戶端斷線偵測 |
| 8–9. 使用規範 | 傳遞規則、取消的樹狀傳播 |

**對應練習**：概念題第 11 章（WithTimeout、WithCancel、WithValue）

---

### 第 7 步｜[GO_STDLIB_GUIDE.md](GO_STDLIB_GUIDE.md)

常用標準庫指南。掌握日常開發中最常使用的標準套件。

| 章節 | 內容 |
| :--- | :--- |
| 1. strings | Contains/Split/Builder/Reader |
| 2. strconv | Itoa/Atoi、ParseFloat、進制轉換 |
| 3. time | 格式化、Parse、Duration、Timer/Ticker |
| 4. os | 環境變數、文件操作、目錄操作 |
| 5. io / bufio | Reader/Writer 介面、逐行讀取、串流複製 |
| 6. fmt | 格式動詞對照表、Stringer 介面 |
| 7. regexp | Compile vs MustCompile、擷取群組 |
| 8. sort / slices | 自訂排序、Go 1.21 新 API |
| 9. flag | 命令列參數、子命令模式 |
| 10. log / slog | 結構化日誌（Go 1.21+）、JSON Handler |

---

### 第 8 步｜[GO_HTTP_GUIDE.md](GO_HTTP_GUIDE.md)

HTTP 開發完整指南：net/http 原生用法與 Gin 框架實戰。

| 章節 | 內容 |
| :--- | :--- |
| 1. net/http Server | Handler 介面、ServeMux、Request/Response 解析 |
| 2. net/http Client | GET/POST、自訂 Client 與 Timeout、JSON Response 解析 |
| 3. Gin 入門 | 路由群組、路徑/Query 參數、ShouldBindJSON |
| 4. Gin Middleware | 執行順序圖解、認證/RequestID/CORS 實作 |
| 5. 統一回應格式 | Response struct、Success/Fail 輔助函數 |
| 6. 請求驗證 | binding tag、驗證錯誤格式化、自訂驗證器 |
| 7. RESTful 規範 | 路由命名、狀態碼選擇、分頁設計 |
| 8. 常見陷阱 | ShouldBind vs Bind、Abort 正確用法 |

---

### 第 9 步｜[GO_DATABASE_GUIDE.md](GO_DATABASE_GUIDE.md)

資料庫操作完整指南。掌握 Go 中三大資料庫操作方式，從標準庫到 ORM。

| 章節 | 內容 |
| :--- | :--- |
| 1. database/sql | Driver 模式、連線池設定、Query/Exec/Scan |
| 2. Prepared Statement | SQL Injection 防護、Stmt 生命週期 |
| 3. Transaction | Begin/Commit/Rollback、defer 安全模式、轉帳範例 |
| 4. sqlx | StructScan、Named Query、IN 查詢、Get vs Select |
| 5–8. GORM | Model 定義、CRUD、進階查詢、關聯、Transaction |
| 9. 常見陷阱 | rows 洩漏、N+1 問題、軟刪除、時區 |
| 10. Repository Pattern | 介面設計、GORM 實作、Mock 測試 |

---

### 第 10 步｜[GO_GENERICS_GUIDE.md](GO_GENERICS_GUIDE.md)

泛型（Generics）完整指南（Go 1.18+）。寫出可復用的泛型資料結構與工具函數。

| 章節 | 內容 |
| :--- | :--- |
| 1–2. 為什麼、基礎語法 | 痛點說明、型別參數語法 |
| 3. 型別約束 | any、comparable、自訂約束、聯合型別（~） |
| 4–5. 實際範例 | Map/Filter/Reduce、泛型 Stack、Pair |
| 6–8. 限制與選擇 | 不支援泛型方法、vs interface 的取捨 |

**對應練習**：概念題第 10 章（泛型函數 Min/Max/Sum、泛型 Stack）

---

### 第 11 步｜[GO_PATTERNS_GUIDE.md](GO_PATTERNS_GUIDE.md)

Go 常用設計模式。理解開源庫設計思路，寫出更優雅的程式碼。

| 章節 | 內容 |
| :--- | :--- |
| 1. Functional Options | 解決參數爆炸問題 |
| 2. Builder | 鏈式呼叫建構複雜物件 |
| 3. Pipeline | Channel 串接多個處理階段 |
| 4. Fan-out / Fan-in | 並行處理後合併結果 |
| 5. Worker Pool | 限制同時執行的 goroutine 數量 |
| 6. 單例模式 | sync.Once 實現執行緒安全單例 |
| 7–8. 比較表 & 錯誤處理 | 模式選擇指南、Sentinel Error、自訂 error |

---

### 第 12 步｜[GO_MEMORY_MODEL_GUIDE.md](GO_MEMORY_MODEL_GUIDE.md)

記憶體模型、Stack、Heap 與效能優化。理解底層記憶體管理，寫出對 GC 友善的程式碼。

| 章節 | 內容 |
| :--- | :--- |
| 1–2. Stack vs Heap | 差異圖解、何時分配在哪裡 |
| 3. 逃逸分析 | 什麼情況逃逸、如何查看 `-gcflags="-m"` |
| 4. GC 機制 | 三色標記演算法、STW 說明 |
| 5–6. 優化技巧 | sync.Pool、記憶體對齊、預分配 |
| 7. 效能分析 | pprof、-benchmem 使用方式 |

---

### 第 13 步｜[GO_ARCHITECTURE_GUIDE.md](GO_ARCHITECTURE_GUIDE.md)

架構設計實戰指南。將所有知識整合，設計可維護、可測試的 Go 服務。

| 章節 | 內容 |
| :--- | :--- |
| 1. Clean Architecture | 三層架構圖解、依賴方向規則、目錄結構 |
| 2–4. 三層實作 | Repository / Service / Handler 完整範例 |
| 5. 依賴注入 | 手動 wire-up、Google Wire 工具 |
| 6. 設定管理 | godotenv、Viper 多來源設定、多環境切換 |
| 7. 結構化日誌 | slog、Zap Sugar vs Logger、Request ID 追蹤 |
| 8. Graceful Shutdown | Signal 監聽、http.Server.Shutdown、5 秒 Timeout |
| 9. Middleware 設計 | JWT 認證、限流、Panic Recovery |
| 10. 完整範例 | User API 端對端串接 |

---

### 第 14 步｜[GO_TESTING_GUIDE.md](GO_TESTING_GUIDE.md)

Go 測試完整指南。寫出可靠的測試，建立重構的安全網。

| 章節 | 內容 |
| :--- | :--- |
| 1–2. 基礎 | 命名規則、testing.T 方法、go test 指令 |
| 3. Table-Driven Test | 表格驅動測試、t.Run 子測試 |
| 4–5. Benchmark & Example | 效能測試、文件測試 |
| 6. 覆蓋率 | -cover、-coverprofile、視覺化報告 |
| 7–9. 進階 | testify、Mock、整合測試 vs 單元測試 |

**對應練習**：概念題第 12 章（Table-Driven Test 模式）

---

### 第 15 步｜[GO_TOOLCHAIN_GUIDE.md](GO_TOOLCHAIN_GUIDE.md)

工具鏈與工程實務指南。掌握 Go 的完整開發工具鏈，提升工程品質與交付效率。

| 章節 | 內容 |
| :--- | :--- |
| 1. Go Modules | go.mod/go.sum 結構、replace、Go Workspace |
| 2. 內建工具 | go build 交叉編譯、go vet、go generate |
| 3. 程式碼品質 | golangci-lint、.golangci.yml 設定、gosec |
| 4. Makefile | 完整 Makefile 範例（build/test/lint/docker） |
| 5. Docker 化 | 多階段建置、scratch vs alpine、docker-compose |
| 6. 開發環境 | Air 熱重載、Delve 除錯器 |
| 7. CI/CD | GitHub Actions 完整範例、Go 版本矩陣測試 |
| 8. 效能分析 | pprof 啟用、go tool pprof、benchstat |

---

### 第 16 步｜[GO_INTERVIEW_GUIDE.md](GO_INTERVIEW_GUIDE.md)

Go 面試題目與解析（26 題）。自我檢核學習成果，準備技術面試。

| 類別 | 題數 | 代表題目 |
| :--- | :--- | :--- |
| 基礎語法 | Q1–Q6 | `:=` vs `var`、defer 行為 |
| 函數與閉包 | Q7–Q8 | 閉包迴圈陷阱、panic/recover |
| 介面與型別 | Q9–Q11 | 隱式實現、nil interface 陷阱 |
| 併發 | Q12–Q16 | Goroutine vs Thread、Channel 阻塞 |
| 錯誤處理 | Q17–Q18 | errors.Is vs errors.As |
| 記憶體與效能 | Q19–Q20 | GC 三色標記、逃逸分析 |
| 進階設計 | Q21–Q24 | Worker Pool、context |
| 程式碼閱讀 | Q25–Q26 | slice 傳遞、WaitGroup 錯誤 |

---

## 知識點速查表

遇到特定問題時，直接跳到對應章節：

| 問題 | 查閱位置 |
| :--- | :--- |
| nil 是什麼？哪些型別是 nil？ | GO_LEARNING_GUIDE § B-1 |
| defer 的執行順序？ | GO_LEARNING_GUIDE § D |
| 閉包為什麼在迴圈中會出錯？ | GO_LEARNING_GUIDE § E-4 |
| slice 的 len 和 cap 差在哪？ | GO_DEPTH_GUIDE § 2-1 |
| make 和 new 的差異？ | GO_DEPTH_GUIDE § 2-0 |
| 如何確認型別有實作介面？ | GO_DEPTH_GUIDE § 3-2-1 |
| 型別斷言怎麼呼叫額外方法？ | GO_DEPTH_GUIDE § 3-5-1 |
| struct Tag 怎麼寫？ | GO_STRUCT_JSON_GUIDE § 3 |
| JSON 如何處理 null 欄位？ | GO_STRUCT_JSON_GUIDE § 7 |
| init() 的執行順序是什麼？ | GO_ADVANCED_FEATURES_GUIDE § 1 |
| iota 如何實作位元旗標？ | GO_ADVANCED_FEATURES_GUIDE § 2-3 |
| 具名回傳值 + defer 如何修改回傳值？ | GO_ADVANCED_FEATURES_GUIDE § 3-3 |
| 型別別名 vs 型別定義有什麼差？ | GO_ADVANCED_FEATURES_GUIDE § 4 |
| reflect 如何讀取 struct tag？ | GO_ADVANCED_FEATURES_GUIDE § 5-4 |
| //go:build 整合測試標籤怎麼用？ | GO_ADVANCED_FEATURES_GUIDE § 6-3 |
| //go:embed 如何嵌入整個目錄？ | GO_ADVANCED_FEATURES_GUIDE § 7-3 |
| Channel 什麼情況會阻塞？ | GO_CONCURRENCY_GUIDE § 2-1 |
| Deadlock 是怎麼發生的？ | GO_CONCURRENCY_GUIDE § 2-6 |
| sync.Map vs map + Mutex？ | GO_CONCURRENCY_GUIDE § 3-5-1 |
| context 怎麼傳遞取消訊號？ | GO_CONTEXT_GUIDE § 3–4 |
| HTTP 請求超時怎麼設定？ | GO_CONTEXT_GUIDE § 5 |
| 字串高效拼接用什麼？ | GO_STDLIB_GUIDE § 1-5 |
| Go 的時間格式字串為何是 2006？ | GO_STDLIB_GUIDE § 3-7 |
| 如何逐行讀取大型文件？ | GO_STDLIB_GUIDE § 5-4 |
| fmt 格式動詞 %v 和 %+v 差在哪？ | GO_STDLIB_GUIDE § 6-3 |
| slog 結構化日誌怎麼用？ | GO_STDLIB_GUIDE § 10-2 |
| ShouldBindJSON vs BindJSON 差異？ | GO_HTTP_GUIDE § 8-1 |
| Gin Middleware 的執行順序？ | GO_HTTP_GUIDE § 4-1 |
| 如何寫統一 API 回應格式？ | GO_HTTP_GUIDE § 5 |
| net/http Client 如何設定 Timeout？ | GO_HTTP_GUIDE § 2-2 |
| database/sql 如何防止 SQL Injection？ | GO_DATABASE_GUIDE § 2-1 |
| rows.Close() 為何要用 defer？ | GO_DATABASE_GUIDE § 9-1 |
| Transaction 的 defer Rollback 寫法？ | GO_DATABASE_GUIDE § 3-3 |
| N+1 問題是什麼？如何解決？ | GO_DATABASE_GUIDE § 9-2 |
| GORM Preload vs Joins 差在哪？ | GO_DATABASE_GUIDE § 6-5 |
| database/sql vs sqlx vs GORM 怎麼選？ | GO_DATABASE_GUIDE § 9-5 |
| Repository Pattern 怎麼寫？ | GO_DATABASE_GUIDE § 10 |
| 什麼是泛型約束？ | GO_GENERICS_GUIDE § 3 |
| Functional Options 模式？ | GO_PATTERNS_GUIDE § 1 |
| Fan-out / Fan-in 怎麼實作？ | GO_PATTERNS_GUIDE § 4 |
| 變數什麼時候會逃逸到 Heap？ | GO_MEMORY_MODEL_GUIDE § 2 |
| 如何用 pprof 找記憶體問題？ | GO_MEMORY_MODEL_GUIDE § 7 |
| Clean Architecture 三層各自負責什麼？ | GO_ARCHITECTURE_GUIDE § 1-2 |
| 依賴注入 main.go 怎麼組裝元件？ | GO_ARCHITECTURE_GUIDE § 5-3 |
| Graceful Shutdown 如何實作？ | GO_ARCHITECTURE_GUIDE § 8 |
| JWT Middleware 怎麼寫？ | GO_ARCHITECTURE_GUIDE § 9-2 |
| Viper 多環境設定怎麼設計？ | GO_ARCHITECTURE_GUIDE § 6-4 |
| Table-Driven Test 怎麼寫？ | GO_TESTING_GUIDE § 3 |
| 怎麼寫 Mock 測試？ | GO_TESTING_GUIDE § 8 |
| go.mod replace 指令怎麼用？ | GO_TOOLCHAIN_GUIDE § 1-5 |
| golangci-lint 如何設定？ | GO_TOOLCHAIN_GUIDE § 3-1 |
| Go 如何交叉編譯不同平台？ | GO_TOOLCHAIN_GUIDE § 2-1 |
| Docker 多階段建置怎麼寫？ | GO_TOOLCHAIN_GUIDE § 5-1 |
| Air 熱重載如何設定？ | GO_TOOLCHAIN_GUIDE § 6-1 |
| panic 何時該用？ | GO_INTERVIEW_GUIDE Q8 |
| Goroutine 洩漏怎麼避免？ | GO_INTERVIEW_GUIDE Q15 |

---

文件更新日期：2026年6月4日
