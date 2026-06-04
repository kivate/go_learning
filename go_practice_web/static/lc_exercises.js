'use strict';

/* ──────────────────────────────────────────────────────────────
   LeetCode 風格練習題
   type: 'lc'
   使用者只需填入函數主體；前端執行時自動組合：
       prefix  +  使用者程式碼  +  suffix
   suffix 包含測試執行器，輸出每個測試案例的通過/失敗
   ────────────────────────────────────────────────────────────── */

const LC_EXERCISES = [

  // ────────────────────────────────────────────────────────────
  // EASY
  // ────────────────────────────────────────────────────────────

  {
    id: 'lc-001', type: 'lc',
    chapterId: 'leetcode', chapterTitle: '📋 LeetCode 題庫',
    number: 1, difficulty: 'easy',
    title: '兩數之和', titleEn: 'Two Sum',
    tags: ['陣列', '雜湊表'],
    concept: '',
    description: `## #1 兩數之和（Two Sum）

<span class="badge easy">簡單</span> <span class="tag">陣列</span> <span class="tag">雜湊表</span>

---

給定一個整數陣列 \`nums\` 和一個目標值 \`target\`，
請找出陣列中**和為 target** 的兩個數的索引。

假設每種輸入只對應**唯一答案**，且不能使用同一個元素兩次。

### 範例

\`\`\`
範例 1：
  Input:  nums = [2,7,11,15], target = 9
  Output: [0,1]
  說明：nums[0] + nums[1] = 2 + 7 = 9

範例 2：
  Input:  nums = [3,2,4], target = 6
  Output: [1,2]

範例 3：
  Input:  nums = [3,3], target = 6
  Output: [0,1]
\`\`\`

### 限制條件

- \`2 ≤ nums.length ≤ 10⁴\`
- \`-10⁹ ≤ nums[i] ≤ 10⁹\`
- \`-10⁹ ≤ target ≤ 10⁹\`
- 只有唯一有效答案

> **提示**：使用 Map 可以把時間複雜度從 O(n²) 降到 O(n)。`,
    template: `func twoSum(nums []int, target int) []int {
    // TODO: 找出兩個索引使 nums[i] + nums[j] == target
    return nil
}`,
    solution: `func twoSum(nums []int, target int) []int {
    seen := map[int]int{}
    for i, v := range nums {
        if j, ok := seen[target-v]; ok {
            return []int{j, i}
        }
        seen[v] = i
    }
    return nil
}`,
    prefix: `package main

import (
    "fmt"
    "reflect"
)

`,
    suffix: `

func main() {
    type tc struct {
        nums     []int
        target   int
        expected []int
    }
    tests := []tc{
        {[]int{2, 7, 11, 15}, 9, []int{0, 1}},
        {[]int{3, 2, 4}, 6, []int{1, 2}},
        {[]int{3, 3}, 6, []int{0, 1}},
        {[]int{1, 5, 3, 8, 2}, 10, []int{1, 3}},
    }
    passed := 0
    for i, t := range tests {
        got := twoSum(t.nums, t.target)
        ok := reflect.DeepEqual(got, t.expected)
        if ok {
            passed++
            fmt.Printf("✓ Test %d 通過\\n", i+1)
        } else {
            fmt.Printf("✗ Test %d 失敗\\n  輸入:  nums=%v, target=%d\\n  預期:  %v\\n  實際:  %v\\n\\n",
                i+1, t.nums, t.target, t.expected, got)
        }
    }
    fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'lc-002', type: 'lc',
    chapterId: 'leetcode', chapterTitle: '📋 LeetCode 題庫',
    number: 20, difficulty: 'easy',
    title: '有效括號', titleEn: 'Valid Parentheses',
    tags: ['字串', 'Stack'],
    concept: '',
    description: `## #20 有效括號（Valid Parentheses）

<span class="badge easy">簡單</span> <span class="tag">字串</span> <span class="tag">Stack</span>

---

給定一個只包含 \`(\`、\`)\`、\`{\`、\`}\`、\`[\`、\`]\` 的字串，判斷括號是否有效。

有效條件：
1. 開括號必須由**相同類型**的閉括號關閉
2. 開括號必須以**正確順序**關閉
3. 每個閉括號都有對應的**開括號**

### 範例

\`\`\`
範例 1：Input: "()"        Output: true
範例 2：Input: "()[]{}"    Output: true
範例 3：Input: "(]"        Output: false
範例 4：Input: "([)]"      Output: false
範例 5：Input: "{[]}"      Output: true
\`\`\`

### 限制條件

- \`1 ≤ s.length ≤ 10⁴\`
- \`s\` 只包含 \`()[]{}\`

> **提示**：用 Stack 記錄開括號，遇到閉括號時比對 Stack 頂端。`,
    template: `func isValid(s string) bool {
    // TODO: 用 Stack 判斷括號是否合法
    return false
}`,
    solution: `func isValid(s string) bool {
    stack := []rune{}
    pair := map[rune]rune{')': '(', ']': '[', '}': '{'}
    for _, ch := range s {
        if ch == '(' || ch == '[' || ch == '{' {
            stack = append(stack, ch)
        } else {
            if len(stack) == 0 || stack[len(stack)-1] != pair[ch] {
                return false
            }
            stack = stack[:len(stack)-1]
        }
    }
    return len(stack) == 0
}`,
    prefix: `package main

import "fmt"

`,
    suffix: `

func main() {
    type tc struct {
        s        string
        expected bool
    }
    tests := []tc{
        {"()", true},
        {"()[]{}", true},
        {"(]", false},
        {"([)]", false},
        {"{[]}", true},
        {"", true},
        {"]", false},
    }
    passed := 0
    for i, t := range tests {
        got := isValid(t.s)
        if got == t.expected {
            passed++
            fmt.Printf("✓ Test %d 通過\\n", i+1)
        } else {
            fmt.Printf("✗ Test %d 失敗\\n  輸入:  %q\\n  預期:  %v\\n  實際:  %v\\n\\n",
                i+1, t.s, t.expected, got)
        }
    }
    fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'lc-003', type: 'lc',
    chapterId: 'leetcode', chapterTitle: '📋 LeetCode 題庫',
    number: 136, difficulty: 'easy',
    title: '只出現一次的數字', titleEn: 'Single Number',
    tags: ['陣列', '位元運算'],
    concept: '',
    description: `## #136 只出現一次的數字（Single Number）

<span class="badge easy">簡單</span> <span class="tag">陣列</span> <span class="tag">位元運算</span>

---

給定一個非空整數陣列，其中除了**某一個元素只出現一次**外，其餘每個元素都出現**兩次**。
找出只出現一次的元素。

要求：時間複雜度 O(n)、空間複雜度 O(1)。

### 範例

\`\`\`
範例 1：Input: [2,2,1]      Output: 1
範例 2：Input: [4,1,2,1,2]  Output: 4
範例 3：Input: [1]           Output: 1
\`\`\`

### 限制條件

- \`1 ≤ nums.length ≤ 3 × 10⁴\`
- \`-3 × 10⁴ ≤ nums[i] ≤ 3 × 10⁴\`
- 除了一個元素，其餘都恰好出現兩次

> **提示**：XOR 的特性：\`a ^ a = 0\`、\`a ^ 0 = a\`，相同數字 XOR 後消失。`,
    template: `func singleNumber(nums []int) int {
    // TODO: 利用 XOR 位元運算找出只出現一次的數
    return 0
}`,
    solution: `func singleNumber(nums []int) int {
    result := 0
    for _, v := range nums {
        result ^= v
    }
    return result
}`,
    prefix: `package main

import "fmt"

`,
    suffix: `

func main() {
    type tc struct {
        nums     []int
        expected int
    }
    tests := []tc{
        {[]int{2, 2, 1}, 1},
        {[]int{4, 1, 2, 1, 2}, 4},
        {[]int{1}, 1},
        {[]int{0, 1, 0}, 1},
    }
    passed := 0
    for i, t := range tests {
        got := singleNumber(t.nums)
        if got == t.expected {
            passed++
            fmt.Printf("✓ Test %d 通過\\n", i+1)
        } else {
            fmt.Printf("✗ Test %d 失敗\\n  輸入:  %v\\n  預期:  %d\\n  實際:  %d\\n\\n",
                i+1, t.nums, t.expected, got)
        }
    }
    fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'lc-004', type: 'lc',
    chapterId: 'leetcode', chapterTitle: '📋 LeetCode 題庫',
    number: 268, difficulty: 'easy',
    title: '缺失的數字', titleEn: 'Missing Number',
    tags: ['陣列', '數學', '位元運算'],
    concept: '',
    description: `## #268 缺失的數字（Missing Number）

<span class="badge easy">簡單</span> <span class="tag">陣列</span> <span class="tag">數學</span>

---

給定一個包含 \`n\` 個不重複數字的陣列，數字範圍為 \`[0, n]\`，找出 **0 到 n 中缺少的那個數字**。

### 範例

\`\`\`
範例 1：
  Input:  [3,0,1]     （n=3，0~3 缺少 2）
  Output: 2

範例 2：
  Input:  [0,1]       （n=2，0~2 缺少 2）
  Output: 2

範例 3：
  Input:  [9,6,4,2,3,5,7,0,1]
  Output: 8
\`\`\`

### 限制條件

- \`n == nums.length\`
- \`0 ≤ nums[i] ≤ n\`
- 所有數字各不相同

> **提示**：0+1+…+n 的總和為 n*(n+1)/2，減去陣列元素總和即為缺失值。`,
    template: `func missingNumber(nums []int) int {
    // TODO: 用數學公式找出缺失的數字
    return 0
}`,
    solution: `func missingNumber(nums []int) int {
    n := len(nums)
    expected := n * (n + 1) / 2
    actual := 0
    for _, v := range nums {
        actual += v
    }
    return expected - actual
}`,
    prefix: `package main

import "fmt"

`,
    suffix: `

func main() {
    type tc struct {
        nums     []int
        expected int
    }
    tests := []tc{
        {[]int{3, 0, 1}, 2},
        {[]int{0, 1}, 2},
        {[]int{9, 6, 4, 2, 3, 5, 7, 0, 1}, 8},
        {[]int{0}, 1},
    }
    passed := 0
    for i, t := range tests {
        got := missingNumber(t.nums)
        if got == t.expected {
            passed++
            fmt.Printf("✓ Test %d 通過\\n", i+1)
        } else {
            fmt.Printf("✗ Test %d 失敗\\n  輸入:  %v\\n  預期:  %d\\n  實際:  %d\\n\\n",
                i+1, t.nums, t.expected, got)
        }
    }
    fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'lc-005', type: 'lc',
    chapterId: 'leetcode', chapterTitle: '📋 LeetCode 題庫',
    number: 70, difficulty: 'easy',
    title: '爬樓梯', titleEn: 'Climbing Stairs',
    tags: ['動態規劃', '記憶化'],
    concept: '',
    description: `## #70 爬樓梯（Climbing Stairs）

<span class="badge easy">簡單</span> <span class="tag">動態規劃</span>

---

你需要爬 \`n\` 階樓梯才能到達頂部。每次可以爬 **1 或 2 階**。問有多少種不同的方法可以爬到頂部？

### 範例

\`\`\`
範例 1：
  Input:  n = 2
  Output: 2
  說明：[1+1] 或 [2]

範例 2：
  Input:  n = 3
  Output: 3
  說明：[1+1+1]、[1+2]、[2+1]
\`\`\`

### 限制條件

- \`1 ≤ n ≤ 45\`

> **提示**：f(n) = f(n-1) + f(n-2)，這正是費氏數列！
> 用迴圈而非遞迴，避免重複計算。`,
    template: `func climbStairs(n int) int {
    // TODO: 動態規劃，f(n) = f(n-1) + f(n-2)
    return 0
}`,
    solution: `func climbStairs(n int) int {
    if n <= 2 {
        return n
    }
    a, b := 1, 2
    for i := 3; i <= n; i++ {
        a, b = b, a+b
    }
    return b
}`,
    prefix: `package main

import "fmt"

`,
    suffix: `

func main() {
    type tc struct {
        n        int
        expected int
    }
    tests := []tc{
        {1, 1}, {2, 2}, {3, 3}, {4, 5}, {5, 8}, {10, 89}, {45, 1836311903},
    }
    passed := 0
    for i, t := range tests {
        got := climbStairs(t.n)
        if got == t.expected {
            passed++
            fmt.Printf("✓ Test %d 通過  (n=%d → %d)\\n", i+1, t.n, got)
        } else {
            fmt.Printf("✗ Test %d 失敗\\n  輸入:  n=%d\\n  預期:  %d\\n  實際:  %d\\n\\n",
                i+1, t.n, t.expected, got)
        }
    }
    fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'lc-006', type: 'lc',
    chapterId: 'leetcode', chapterTitle: '📋 LeetCode 題庫',
    number: 704, difficulty: 'easy',
    title: '二分搜尋', titleEn: 'Binary Search',
    tags: ['陣列', '二分搜尋'],
    concept: '',
    description: `## #704 二分搜尋（Binary Search）

<span class="badge easy">簡單</span> <span class="tag">陣列</span> <span class="tag">二分搜尋</span>

---

給定一個**升序排列**的整數陣列 \`nums\` 和目標值 \`target\`，
若 \`target\` 在陣列中，回傳其索引；否則回傳 \`-1\`。

必須使用時間複雜度 **O(log n)** 的演算法。

### 範例

\`\`\`
範例 1：
  Input:  nums=[-1,0,3,5,9,12], target=9
  Output: 4

範例 2：
  Input:  nums=[-1,0,3,5,9,12], target=2
  Output: -1
\`\`\`

### 限制條件

- \`1 ≤ nums.length ≤ 10⁴\`
- \`-10⁴ < nums[i], target < 10⁴\`
- \`nums\` 中所有元素不重複
- \`nums\` 升序排列

> **提示**：每次比較中間元素，縮小搜尋範圍一半。`,
    template: `func search(nums []int, target int) int {
    // TODO: 二分搜尋
    return -1
}`,
    solution: `func search(nums []int, target int) int {
    lo, hi := 0, len(nums)-1
    for lo <= hi {
        mid := lo + (hi-lo)/2
        if nums[mid] == target {
            return mid
        } else if nums[mid] < target {
            lo = mid + 1
        } else {
            hi = mid - 1
        }
    }
    return -1
}`,
    prefix: `package main

import "fmt"

`,
    suffix: `

func main() {
    type tc struct {
        nums     []int
        target   int
        expected int
    }
    tests := []tc{
        {[]int{-1, 0, 3, 5, 9, 12}, 9, 4},
        {[]int{-1, 0, 3, 5, 9, 12}, 2, -1},
        {[]int{5}, 5, 0},
        {[]int{5}, 3, -1},
        {[]int{1, 3, 5, 7, 9}, 1, 0},
        {[]int{1, 3, 5, 7, 9}, 9, 4},
    }
    passed := 0
    for i, t := range tests {
        got := search(t.nums, t.target)
        if got == t.expected {
            passed++
            fmt.Printf("✓ Test %d 通過\\n", i+1)
        } else {
            fmt.Printf("✗ Test %d 失敗\\n  輸入:  nums=%v, target=%d\\n  預期:  %d\\n  實際:  %d\\n\\n",
                i+1, t.nums, t.target, t.expected, got)
        }
    }
    fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  // ────────────────────────────────────────────────────────────
  // MEDIUM
  // ────────────────────────────────────────────────────────────

  {
    id: 'lc-007', type: 'lc',
    chapterId: 'leetcode', chapterTitle: '📋 LeetCode 題庫',
    number: 53, difficulty: 'medium',
    title: '最大子陣列', titleEn: 'Maximum Subarray',
    tags: ['陣列', '動態規劃', 'Kadane 演算法'],
    concept: '',
    description: `## #53 最大子陣列（Maximum Subarray）

<span class="badge medium">中等</span> <span class="tag">陣列</span> <span class="tag">動態規劃</span>

---

給定一個整數陣列，找到**連續子陣列**（至少包含一個元素），使其**和最大**，並回傳該和。

### 範例

\`\`\`
範例 1：
  Input:  [-2,1,-3,4,-1,2,1,-5,4]
  Output: 6
  說明：子陣列 [4,-1,2,1] 的和最大，為 6

範例 2：
  Input:  [1]
  Output: 1

範例 3：
  Input:  [5,4,-1,7,8]
  Output: 23
\`\`\`

### 限制條件

- \`1 ≤ nums.length ≤ 10⁵\`
- \`-10⁴ ≤ nums[i] ≤ 10⁴\`

> **提示（Kadane 演算法）**：維護「當前子陣列總和 cur」，
> 若 cur 變負，就從下一個元素重新開始。`,
    template: `func maxSubArray(nums []int) int {
    // TODO: Kadane 演算法
    // cur = 目前子陣列總和（若為負就重設）
    // best = 目前最大值
    return 0
}`,
    solution: `func maxSubArray(nums []int) int {
    cur, best := nums[0], nums[0]
    for _, v := range nums[1:] {
        if cur < 0 {
            cur = v
        } else {
            cur += v
        }
        if cur > best {
            best = cur
        }
    }
    return best
}`,
    prefix: `package main

import "fmt"

`,
    suffix: `

func main() {
    type tc struct {
        nums     []int
        expected int
    }
    tests := []tc{
        {[]int{-2, 1, -3, 4, -1, 2, 1, -5, 4}, 6},
        {[]int{1}, 1},
        {[]int{5, 4, -1, 7, 8}, 23},
        {[]int{-1}, -1},
        {[]int{-2, -1}, -1},
    }
    passed := 0
    for i, t := range tests {
        got := maxSubArray(t.nums)
        if got == t.expected {
            passed++
            fmt.Printf("✓ Test %d 通過\\n", i+1)
        } else {
            fmt.Printf("✗ Test %d 失敗\\n  輸入:  %v\\n  預期:  %d\\n  實際:  %d\\n\\n",
                i+1, t.nums, t.expected, got)
        }
    }
    fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'lc-008', type: 'lc',
    chapterId: 'leetcode', chapterTitle: '📋 LeetCode 題庫',
    number: 3, difficulty: 'medium',
    title: '無重複字元的最長子字串', titleEn: 'Longest Substring Without Repeating Characters',
    tags: ['字串', '雜湊表', '滑動視窗'],
    concept: '',
    description: `## #3 無重複字元的最長子字串

<span class="badge medium">中等</span> <span class="tag">字串</span> <span class="tag">滑動視窗</span>

---

給定一個字串 \`s\`，找出**不含重複字元的最長子字串的長度**。

### 範例

\`\`\`
範例 1：
  Input:  "abcabcbb"
  Output: 3
  說明：最長子字串為 "abc"，長度為 3

範例 2：
  Input:  "bbbbb"
  Output: 1
  說明：最長子字串為 "b"，長度為 1

範例 3：
  Input:  "pwwkew"
  Output: 3
  說明：最長子字串為 "wke"，長度為 3
\`\`\`

### 限制條件

- \`0 ≤ s.length ≤ 5 × 10⁴\`

> **提示（滑動視窗）**：用 Map 記錄字元上次出現的位置，
> 左邊界遇到重複時右移跳過。`,
    template: `func lengthOfLongestSubstring(s string) int {
    // TODO: 滑動視窗
    // lastSeen map[byte]int 記錄字元上次出現的位置
    return 0
}`,
    solution: `func lengthOfLongestSubstring(s string) int {
    lastSeen := map[byte]int{}
    best, left := 0, 0
    for right := 0; right < len(s); right++ {
        ch := s[right]
        if pos, ok := lastSeen[ch]; ok && pos >= left {
            left = pos + 1
        }
        lastSeen[ch] = right
        if right-left+1 > best {
            best = right - left + 1
        }
    }
    return best
}`,
    prefix: `package main

import "fmt"

`,
    suffix: `

func main() {
    type tc struct {
        s        string
        expected int
    }
    tests := []tc{
        {"abcabcbb", 3},
        {"bbbbb", 1},
        {"pwwkew", 3},
        {"", 0},
        {"au", 2},
        {"dvdf", 3},
    }
    passed := 0
    for i, t := range tests {
        got := lengthOfLongestSubstring(t.s)
        if got == t.expected {
            passed++
            fmt.Printf("✓ Test %d 通過\\n", i+1)
        } else {
            fmt.Printf("✗ Test %d 失敗\\n  輸入:  %q\\n  預期:  %d\\n  實際:  %d\\n\\n",
                i+1, t.s, t.expected, got)
        }
    }
    fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'lc-009', type: 'lc',
    chapterId: 'leetcode', chapterTitle: '📋 LeetCode 題庫',
    number: 283, difficulty: 'medium',
    title: '移動零', titleEn: 'Move Zeroes',
    tags: ['陣列', '雙指針'],
    concept: '',
    description: `## #283 移動零（Move Zeroes）

<span class="badge medium">中等</span> <span class="tag">陣列</span> <span class="tag">雙指針</span>

---

給定一個整數陣列，將所有 \`0\` 移到末尾，同時**保持非零元素的相對順序**。
必須**原地修改**，不能使用額外陣列。

### 範例

\`\`\`
範例 1：
  Input:  [0,1,0,3,12]
  Output: [1,3,12,0,0]

範例 2：
  Input:  [0]
  Output: [0]
\`\`\`

### 限制條件

- \`1 ≤ nums.length ≤ 10⁴\`
- \`-2³¹ ≤ nums[i] ≤ 2³¹-1\`

> **提示（雙指針）**：\`write\` 指針指向下一個可以放非零元素的位置，
> 遍歷時把非零元素複製到 \`write\`，最後把剩餘位置填 0。`,
    template: `func moveZeroes(nums []int) {
    // TODO: 原地移動，將 0 移到末尾
    // write := 0
    // 第一輪：把非零元素依序填到前面
    // 第二輪：把剩餘位置填 0
}`,
    solution: `func moveZeroes(nums []int) {
    write := 0
    for _, v := range nums {
        if v != 0 {
            nums[write] = v
            write++
        }
    }
    for write < len(nums) {
        nums[write] = 0
        write++
    }
}`,
    prefix: `package main

import (
    "fmt"
    "reflect"
)

`,
    suffix: `

func main() {
    type tc struct {
        nums     []int
        expected []int
    }
    tests := []tc{
        {[]int{0, 1, 0, 3, 12}, []int{1, 3, 12, 0, 0}},
        {[]int{0}, []int{0}},
        {[]int{1}, []int{1}},
        {[]int{0, 0, 1}, []int{1, 0, 0}},
        {[]int{1, 0, 2, 0, 3}, []int{1, 2, 3, 0, 0}},
    }
    passed := 0
    for i, t := range tests {
        moveZeroes(t.nums)
        ok := reflect.DeepEqual(t.nums, t.expected)
        if ok {
            passed++
            fmt.Printf("✓ Test %d 通過\\n", i+1)
        } else {
            fmt.Printf("✗ Test %d 失敗\\n  預期:  %v\\n  實際:  %v\\n\\n",
                i+1, t.expected, t.nums)
        }
    }
    fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'lc-010', type: 'lc',
    chapterId: 'leetcode', chapterTitle: '📋 LeetCode 題庫',
    number: 238, difficulty: 'medium',
    title: '除自身以外陣列的積', titleEn: 'Product of Array Except Self',
    tags: ['陣列', '前綴積'],
    concept: '',
    description: `## #238 除自身以外陣列的積

<span class="badge medium">中等</span> <span class="tag">陣列</span> <span class="tag">前綴積</span>

---

給定一個整數陣列 \`nums\`，回傳陣列 \`answer\`，
其中 \`answer[i]\` 等於 \`nums\` 中除了 \`nums[i]\` 之外其餘各元素的乘積。

**不能使用除法**，且時間複雜度必須為 O(n)。

### 範例

\`\`\`
範例 1：
  Input:  [1,2,3,4]
  Output: [24,12,8,6]

範例 2：
  Input:  [-1,1,0,-3,3]
  Output: [0,0,9,0,0]
\`\`\`

### 限制條件

- \`2 ≤ nums.length ≤ 10⁵\`
- \`-30 ≤ nums[i] ≤ 30\`

> **提示（前綴積/後綴積）**：
> answer[i] = 左側所有元素的積 × 右側所有元素的積。
> 先算左前綴積，再從右往左乘以後綴積（右累乘就地計算）。`,
    template: `func productExceptSelf(nums []int) []int {
    n := len(nums)
    answer := make([]int, n)
    // TODO:
    // 第一輪：計算每個位置的「左前綴積」
    // 第二輪：從右往左乘以「右後綴積」（用一個變數追蹤）
    return answer
}`,
    solution: `func productExceptSelf(nums []int) []int {
    n := len(nums)
    answer := make([]int, n)
    answer[0] = 1
    for i := 1; i < n; i++ {
        answer[i] = answer[i-1] * nums[i-1]
    }
    right := 1
    for i := n - 1; i >= 0; i-- {
        answer[i] *= right
        right *= nums[i]
    }
    return answer
}`,
    prefix: `package main

import (
    "fmt"
    "reflect"
)

`,
    suffix: `

func main() {
    type tc struct {
        nums     []int
        expected []int
    }
    tests := []tc{
        {[]int{1, 2, 3, 4}, []int{24, 12, 8, 6}},
        {[]int{-1, 1, 0, -3, 3}, []int{0, 0, 9, 0, 0}},
        {[]int{2, 3}, []int{3, 2}},
        {[]int{1, 1, 1, 1}, []int{1, 1, 1, 1}},
    }
    passed := 0
    for i, t := range tests {
        got := productExceptSelf(t.nums)
        ok := reflect.DeepEqual(got, t.expected)
        if ok {
            passed++
            fmt.Printf("✓ Test %d 通過\\n", i+1)
        } else {
            fmt.Printf("✗ Test %d 失敗\\n  輸入:  %v\\n  預期:  %v\\n  實際:  %v\\n\\n",
                i+1, t.nums, t.expected, got)
        }
    }
    fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  // ────────────────────────────────────────────────────────────
  {
    id: 'lc-011', type: 'lc',
    chapterId: 'leetcode', chapterTitle: '📋 LeetCode 題庫',
    number: 49, difficulty: 'medium',
    title: '字母異位詞分組', titleEn: 'Group Anagrams',
    tags: ['陣列', '雜湊表', '字串'],
    concept: '',
    description: `## #49 字母異位詞分組（Group Anagrams）

<span class="badge medium">中等</span> <span class="tag">陣列</span> <span class="tag">雜湊表</span>

---

給定一個字串陣列，將所有**字母異位詞**（由相同字母重新排列組成的詞）分組在一起。
回傳結果的順序不限。

**字母異位詞**：使用相同的字母，但順序不同的詞，如 "eat"、"tea"、"ate"。

### 範例

\`\`\`
範例 1：
  Input:  ["eat","tea","tan","ate","nat","bat"]
  Output: [["bat"],["nat","tan"],["ate","eat","tea"]]

範例 2：
  Input:  [""]
  Output: [[""]]

範例 3：
  Input:  ["a"]
  Output: [["a"]]
\`\`\`

### 限制條件

- \`1 ≤ strs.length ≤ 10⁴\`
- \`0 ≤ strs[i].length ≤ 100\`
- \`strs[i]\` 只包含小寫英文字母

> **提示**：把每個字串的字母排序後作為 Map 的 key，相同 key 的字串放在一組。`,
    template: `func groupAnagrams(strs []string) [][]string {
    // TODO:
    // 1. 建立 map[string][]string
    // 2. 對每個字串排序後作為 key
    // 3. 把原字串加入對應群組
    return nil
}`,
    solution: `func groupAnagrams(strs []string) [][]string {
    groups := map[string][]string{}
    for _, s := range strs {
        key := sortString(s)
        groups[key] = append(groups[key], s)
    }
    result := make([][]string, 0, len(groups))
    for _, g := range groups {
        result = append(result, g)
    }
    return result
}

func sortString(s string) string {
    b := []byte(s)
    for i := 0; i < len(b)-1; i++ {
        for j := i + 1; j < len(b); j++ {
            if b[i] > b[j] {
                b[i], b[j] = b[j], b[i]
            }
        }
    }
    return string(b)
}`,
    prefix: `package main

import (
    "fmt"
    "sort"
    "strings"
)

`,
    suffix: `

// 比較兩個分組結果（忽略順序）
func equalGroups(a, b [][]string) bool {
    if len(a) != len(b) {
        return false
    }
    normalize := func(groups [][]string) []string {
        keys := make([]string, len(groups))
        for i, g := range groups {
            cp := append([]string(nil), g...)
            sort.Strings(cp)
            keys[i] = strings.Join(cp, "|")
        }
        sort.Strings(keys)
        return keys
    }
    na, nb := normalize(a), normalize(b)
    for i := range na {
        if na[i] != nb[i] {
            return false
        }
    }
    return true
}

func main() {
    type tc struct {
        strs     []string
        expected [][]string
    }
    tests := []tc{
        {
            []string{"eat", "tea", "tan", "ate", "nat", "bat"},
            [][]string{{"bat"}, {"nat", "tan"}, {"ate", "eat", "tea"}},
        },
        {[]string{""}, [][]string{{""}}},
        {[]string{"a"}, [][]string{{"a"}}},
    }
    passed := 0
    for i, t := range tests {
        got := groupAnagrams(t.strs)
        ok := equalGroups(got, t.expected)
        if ok {
            passed++
            fmt.Printf("✓ Test %d 通過\\n", i+1)
        } else {
            fmt.Printf("✗ Test %d 失敗\\n  輸入:  %v\\n  實際:  %v\\n\\n",
                i+1, t.strs, got)
        }
    }
    fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },

  // ────────────────────────────────────────────────────────────
  // HARD
  // ────────────────────────────────────────────────────────────

  {
    id: 'lc-012', type: 'lc',
    chapterId: 'leetcode', chapterTitle: '📋 LeetCode 題庫',
    number: 42, difficulty: 'hard',
    title: '接雨水', titleEn: 'Trapping Rain Water',
    tags: ['陣列', 'Stack', '雙指針', '動態規劃'],
    concept: '',
    description: `## #42 接雨水（Trapping Rain Water）

<span class="badge hard">困難</span> <span class="tag">陣列</span> <span class="tag">雙指針</span>

---

給定 \`n\` 個非負整數代表每個寬度為 1 的柱子高度圖，計算按此排列的柱子能接住多少雨水。

### 範例

\`\`\`
範例 1：
  Input:  [0,1,0,2,1,0,1,3,2,1,2,1]
  Output: 6

  ╔═══════╗
  ║       ║     ║
  ║   ║   ║ ║   ║ ║
  ║ ║ ║ ║ ║ ║ ║ ║ ║
  ─────────────────
  水量 = 6

範例 2：
  Input:  [4,2,0,3,2,5]
  Output: 9
\`\`\`

### 限制條件

- \`n == height.length\`
- \`1 ≤ n ≤ 2 × 10⁴\`

> **提示（雙指針）**：
> 用左右兩個指針，記錄左/右最大高度。
> 哪邊最大值較小，就從那邊收縮並累加水量。`,
    template: `func trap(height []int) int {
    // TODO: 雙指針法
    // left, right := 0, len(height)-1
    // leftMax, rightMax := 0, 0
    // water := 0
    return 0
}`,
    solution: `func trap(height []int) int {
    left, right := 0, len(height)-1
    leftMax, rightMax := 0, 0
    water := 0
    for left < right {
        if height[left] < height[right] {
            if height[left] >= leftMax {
                leftMax = height[left]
            } else {
                water += leftMax - height[left]
            }
            left++
        } else {
            if height[right] >= rightMax {
                rightMax = height[right]
            } else {
                water += rightMax - height[right]
            }
            right--
        }
    }
    return water
}`,
    prefix: `package main

import "fmt"

`,
    suffix: `

func main() {
    type tc struct {
        height   []int
        expected int
    }
    tests := []tc{
        {[]int{0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1}, 6},
        {[]int{4, 2, 0, 3, 2, 5}, 9},
        {[]int{1, 0, 1}, 1},
        {[]int{3, 0, 2, 0, 4}, 7},
    }
    passed := 0
    for i, t := range tests {
        got := trap(t.height)
        if got == t.expected {
            passed++
            fmt.Printf("✓ Test %d 通過\\n", i+1)
        } else {
            fmt.Printf("✗ Test %d 失敗\\n  輸入:  %v\\n  預期:  %d\\n  實際:  %d\\n\\n",
                i+1, t.height, t.expected, got)
        }
    }
    fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`,
  },
]
