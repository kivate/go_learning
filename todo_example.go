package main

import (
	"bufio"   // 用於高效讀取輸入（如鍵盤輸入）
	"fmt"     // 用於格式化輸出與列印
	"os"      // 用於系統相關操作，這裡用來代表標準輸入/輸出
)

// Todo 結構體：這是 Go 的自定義資料類型，類似其他語言的物件
// 我們用它來定義一條「待辦事項」應該包含哪些資料欄位
type Todo struct {
	ID    int    // 任務的唯一編號
	Task  string // 任務的內容描述
	Done  bool   // 任務是否已完成（true 為完成，false 為未完成）
}

// 全域變數宣告
// todos 是一個「切片 (Slice)」，它像是一個可以動態伸縮的陣列，用來存儲多個 Todo 結構體
var todos []Todo

// nextID 用來記錄下一個任務要編號多少，每次新增任務後會加 1
var nextID = 1

func main() {
	// 建立一個 Scanner 讀取器，準備從鍵盤 (os.Stdin) 讀取使用者的輸入
	scanner := bufio.NewScanner(os.Stdin)

	fmt.Println("--- 歡迎使用 Go Todo 簡易版 ---")

	// for { ... } 在 Go 中代表「無窮迴圈」，程式會一直執行直到我們手動退出
	for {
		fmt.Println("\n1. 新增事項 | 2. 列出事項 | 3. 完成事項 | 4. 退出")
		fmt.Print("請選擇操作: ")

		// scanner.Scan() 會等待使用者輸入並按下 Enter
		scanner.Scan()
		// scanner.Text() 會取得剛才輸入的字串內容
		choice := scanner.Text()

		// 使用 switch 判斷使用者選了哪個選單
		switch choice {
		case "1":
			fmt.Print("請輸入任務內容: ")
			scanner.Scan()
			task := scanner.Text()
			addTodo(task) // 呼叫新增函數
		case "2":
			listTodos() // 呼叫列表函數
		case "3":
			fmt.Print("請輸入要標記完成的 ID: ")
			scanner.Scan()
			var id int
			// fmt.Sscanf 可以把字串轉成數字並存入 id 變數
			fmt.Sscanf(scanner.Text(), "%d", &id)
			completeTodo(id) // 呼叫完成函數
		case "4":
			fmt.Println("再見！")
			return // 結束 main 函數，也就是退出程式
		default:
			fmt.Println("無效的選擇，請重新輸入。")
		}
	}
}

// addTodo 函數：接收一個字串參數，建立新任務並存入 Slice
func addTodo(task string) {
	// 建立一個新的 Todo 結構體實例
	newTodo := Todo{
		ID:   nextID,
		Task: task,
		Done: false, // 剛新增的任務預設為未完成
	}

	// append 是 Go 的內建函數，用來把資料加進切片 (Slice) 的末端
	// 它會回傳一個新的切片，我們再把它存回 todos 變數
	todos = append(todos, newTodo)

	// 更新下一個任務的 ID
	nextID++
	fmt.Println("已新增任務！")
}

// listTodos 函數：遍歷 Slice 並印出所有任務
func listTodos() {
	fmt.Println("\n--- 目前的待辦清單 ---")

	// len(todos) 可以取得切片中目前的元素個數
	if len(todos) == 0 {
		fmt.Println("(清單目前是空的)")
		return
	}

	// range 是 Go 的迭代神器
	// _ 代表我們不需要用到索引編號 (index)，t 則是當前遍歷到的 Todo 物件
	for _, t := range todos {
		status := " " // 預設空格代表未完成
		if t.Done {
			status = "V" // 如果 Done 為 true，就顯示 V
		}
		// %s 是字串佔位符，%d 是整數佔位符
		fmt.Printf("[%s] ID: %d | 任務: %s\n", status, t.ID, t.Task)
	}
}

// completeTodo 函數：根據 ID 尋找任務並修改狀態
func completeTodo(id int) {
	// 這裡我們需要修改 Slice 裡面的資料，所以用索引 (i) 來存取
	for i := range todos {
		if todos[i].ID == id {
			// 找到了對應的 ID，將其 Done 改為 true
			todos[i].Done = true
			fmt.Printf("任務 ID %d 已標記為完成！\n", id)
			return // 找到就結束函數，不需要繼續找下去
		}
	}
	fmt.Println("找不到該 ID 的任務。")
}
