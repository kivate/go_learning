# Go 語言學習資源導讀

本目錄收錄十份 Go 語言學習文件，依照學習階段循序漸進，建議按以下順序閱讀。

---

## 文件總覽

```text
go_lang_data/
├── README.md                   ← 你在這裡
│
├── ── 基礎入門 ──
├── GO_LEARNING_GUIDE.md        ← 第一步：入門知識地圖
├── GO_DEPTH_GUIDE.md           ← 第二步：語法深度解析
│
├── ── 核心主題 ──
├── GO_STRUCT_JSON_GUIDE.md     ← Struct 設計與 JSON 處理
├── GO_CONCURRENCY_GUIDE.md     ← 併發控制完整指南
├── GO_CONTEXT_GUIDE.md         ← context 套件完整指南
│
├── ── 進階主題 ──
├── GO_GENERICS_GUIDE.md        ← 泛型（Go 1.18+）
├── GO_PATTERNS_GUIDE.md        ← 常用設計模式
├── GO_MEMORY_MODEL_GUIDE.md    ← 記憶體模型與效能
│
├── ── 工程實踐 ──
├── GO_TESTING_GUIDE.md         ← 測試完整指南
│
└── ── 面試準備 ──
    └── GO_INTERVIEW_GUIDE.md   ← 面試題目與解析（26題）
```

---

## 建議學習順序

### 第一步｜[GO_LEARNING_GUIDE.md](GO_LEARNING_GUIDE.md)
**Go 入門指南：核心特性與基礎架構**

適合剛接觸 Go 的初學者，建立整體知識地圖。

| 章節 | 內容 |
| :--- | :--- |
| 1. 設計哲學 | Less is More、組合優於繼承、原生併發 |
| 2. 關鍵字地圖 | 25 個關鍵字分類一覽 |
| 3. 核心程式結構 | 變數宣告、nil、for 迴圈、defer、閉包 |
| 4. 併發核心 | Goroutine、Channel、select、close、常見陷阱 |
| 5. 錯誤處理 | error、panic、recover |

---

### 第二步｜[GO_DEPTH_GUIDE.md](GO_DEPTH_GUIDE.md)
**語法深度解析：指標、集合、介面**

適合已掌握基礎語法，想深入理解底層機制的學習者。

| 章節 | 內容 |
| :--- | :--- |
| 1. 指標 | 傳值 vs 傳址、效能影響、nil 指標、接收者選擇 |
| 2. 集合操作 | make/new、Slice len/cap、append 擴容、共享陷阱、Map 原理 |
| 3. 介面設計 | 隱式實現、編譯期驗證、型別斷言、介面升級、組合介面 |

---

### 第三步｜[GO_STRUCT_JSON_GUIDE.md](GO_STRUCT_JSON_GUIDE.md)：Struct 深度解析與 JSON 操作

幾乎所有 API 開發都會用到的核心知識。

| 章節 | 內容 |
| :--- | :--- |
| 1. struct 基礎 | 初始化、零值、匿名欄位 |
| 2. struct 嵌入 | 方法提升、多層嵌入、欄位衝突 |
| 3. struct Tag | json / db / validate Tag 語法 |
| 4. 方法設計 | 值 vs 指標接收者、方法集規則 |
| 5–8. JSON | Marshal/Unmarshal、omitempty、null 處理、自訂序列化 |

---

### 第四步｜[GO_CONCURRENCY_GUIDE.md](GO_CONCURRENCY_GUIDE.md)：併發控制深度指南

掌握正確的併發控制，避免 Race Condition 與 Deadlock。

| 章節 | 內容 |
| :--- | :--- |
| 1. 為什麼需要併發控制 | Race Condition 根因解析 |
| 2. Channel 阻塞機制 | 無緩衝/有緩衝、select、Deadlock |
| 3. sync 套件 | Mutex、RWMutex、WaitGroup、Once、Map 五方案、Cond、atomic |
| 4. 綜合範例 | Worker Pool 實作 |

---

### 第五步｜[GO_CONTEXT_GUIDE.md](GO_CONTEXT_GUIDE.md)：context 套件完整指南

分散式系統與 HTTP 開發的必備知識。

| 章節 | 內容 |
| :--- | :--- |
| 1–2. 為什麼需要 context | 場景說明、六種建立方式 |
| 3–5. 取消機制 | Done()、WithCancel、WithTimeout 實際範例 |
| 6–7. 傳值與 HTTP | WithValue、r.Context()、客戶端斷線偵測 |
| 8–9. 使用規範 | 傳遞規則、取消的樹狀傳播 |

---

### 第六步｜[GO_GENERICS_GUIDE.md](GO_GENERICS_GUIDE.md)：泛型（Generics）完整指南（Go 1.18+）

寫出可復用的泛型資料結構與工具函數。

| 章節 | 內容 |
| :--- | :--- |
| 1–2. 為什麼、基礎語法 | 痛點說明、型別參數語法 |
| 3. 型別約束 | any、comparable、自訂約束、聯合型別（~） |
| 4–5. 實際範例 | Map/Filter/Reduce、泛型 Stack、Pair |
| 6–8. 限制與選擇 | 不支援泛型方法、vs interface 的取捨 |

---

### 第七步｜[GO_PATTERNS_GUIDE.md](GO_PATTERNS_GUIDE.md)：Go 常用設計模式

理解開源庫設計思路，寫出更優雅的程式碼。

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

### 第八步｜[GO_MEMORY_MODEL_GUIDE.md](GO_MEMORY_MODEL_GUIDE.md)：記憶體模型、Stack、Heap 與效能優化

理解底層記憶體管理，寫出對 GC 友善的程式碼。

| 章節 | 內容 |
| :--- | :--- |
| 1–2. Stack vs Heap | 差異圖解、何時分配在哪裡 |
| 3. 逃逸分析 | 什麼情況逃逸、如何查看 `-gcflags="-m"` |
| 4. GC 機制 | 三色標記演算法、STW 說明 |
| 5–6. 優化技巧 | sync.Pool、記憶體對齊、預分配 |
| 7. 效能分析 | pprof、-benchmem 使用方式 |

---

### 第九步｜[GO_TESTING_GUIDE.md](GO_TESTING_GUIDE.md)：Go 測試完整指南

寫出可靠的測試，建立重構的安全網。

| 章節 | 內容 |
| :--- | :--- |
| 1–2. 基礎 | 命名規則、testing.T 方法、go test 指令 |
| 3. Table-Driven Test | 表格驅動測試、t.Run 子測試 |
| 4–5. Benchmark & Example | 效能測試、文件測試 |
| 6. 覆蓋率 | -cover、-coverprofile、視覺化報告 |
| 7–9. 進階 | testify、Mock、整合測試 vs 單元測試 |

---

### 第十步｜[GO_INTERVIEW_GUIDE.md](GO_INTERVIEW_GUIDE.md)：Go 面試題目與解析（26 題）

自我檢核學習成果，準備技術面試。

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
| Channel 什麼情況會阻塞？ | GO_CONCURRENCY_GUIDE § 2-1 |
| Deadlock 是怎麼發生的？ | GO_CONCURRENCY_GUIDE § 2-6 |
| sync.Map vs map + Mutex？ | GO_CONCURRENCY_GUIDE § 3-5-1 |
| context 怎麼傳遞取消訊號？ | GO_CONTEXT_GUIDE § 3–4 |
| HTTP 請求超時怎麼設定？ | GO_CONTEXT_GUIDE § 5 |
| 什麼是泛型約束？ | GO_GENERICS_GUIDE § 3 |
| Functional Options 模式？ | GO_PATTERNS_GUIDE § 1 |
| Fan-out / Fan-in 怎麼實作？ | GO_PATTERNS_GUIDE § 4 |
| 變數什麼時候會逃逸到 Heap？ | GO_MEMORY_MODEL_GUIDE § 2 |
| 如何用 pprof 找記憶體問題？ | GO_MEMORY_MODEL_GUIDE § 7 |
| Table-Driven Test 怎麼寫？ | GO_TESTING_GUIDE § 3 |
| 怎麼寫 Mock 測試？ | GO_TESTING_GUIDE § 8 |
| panic 何時該用？ | GO_INTERVIEW_GUIDE Q8 |
| Goroutine 洩漏怎麼避免？ | GO_INTERVIEW_GUIDE Q15 |

---

文件更新日期：2026年5月29日
