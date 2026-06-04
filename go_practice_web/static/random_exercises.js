'use strict';

// ── 工具函數 ──────────────────────────────────────────────────
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randArray(count, min, max) {
  return Array.from({ length: count }, () => randInt(min, max));
}

function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) return false;
  }
  return true;
}

function factorial(n) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function gcd(a, b) {
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function isPalindrome(s) {
  return s === s.split('').reverse().join('');
}

// ── 公用 test runner suffix ───────────────────────────────────
function testRunnerSuffix(tests, callExpr) {
  // tests: [{label, got, want}] — inline in suffix
  // This helper generates a Go test harness in suffix form.
  // Used by each template's suffixFn.
  return '';
}

// ── 10 種隨機題型 ─────────────────────────────────────────────
const RANDOM_TEMPLATES = [

  // ── 1. 陣列統計 ────────────────────────────────────────────
  {
    key: 'array-stats',
    chapterTitle: '🎲 隨機挑戰',
    titlePrefix: 'R-1 陣列統計',
    difficulty: 'easy',
    generate() {
      const nums = randArray(randInt(5, 8), 1, 99);
      const sum = nums.reduce((a, b) => a + b, 0);
      const avg = parseFloat((sum / nums.length).toFixed(2));
      const max = Math.max(...nums);
      const min = Math.min(...nums);
      return { nums, sum, avg, max, min };
    },
    concept: `## 陣列統計

常用的 slice 聚合操作：

\`\`\`go
nums := []int{3, 17, 42}
sum := 0
maxV := nums[0]
for _, v := range nums {
    sum += v
    if v > maxV { maxV = v }
}
avg := float64(sum) / float64(len(nums))
\`\`\``,
    descriptionFn(p) {
      return `### 練習：計算陣列統計

實作 \`arrayStats(nums []int) (sum int, avg float64, maxV, minV int)\`。

給定整數陣列：\`${JSON.stringify(p.nums)}\`

**預期回傳**：
\`\`\`
sum=${p.sum}, avg=${p.avg}, max=${p.max}, min=${p.min}
\`\`\``;
    },
    prefix: `package main

import "fmt"

`,
    templateFn(p) {
      return `func arrayStats(nums []int) (sum int, avg float64, maxV, minV int) {
    // TODO: 計算 sum, avg, maxV, minV
    return
}`;
    },
    solutionFn(p) {
      return `func arrayStats(nums []int) (sum int, avg float64, maxV, minV int) {
    maxV, minV = nums[0], nums[0]
    for _, v := range nums {
        sum += v
        if v > maxV { maxV = v }
        if v < minV { minV = v }
    }
    avg = float64(sum) / float64(len(nums))
    return
}`;
    },
    suffixFn(p) {
      return `
func main() {
	nums := []int{${p.nums.join(', ')}}
	sum, avg, maxV, minV := arrayStats(nums)
	passed := 0
	total := 4
	check := func(label string, got, want interface{}) {
		if fmt.Sprintf("%v", got) == fmt.Sprintf("%v", want) {
			passed++
			fmt.Printf("✓ %s = %v\\n", label, got)
		} else {
			fmt.Printf("✗ %s 期望=%v 實際=%v\\n", label, want, got)
		}
	}
	check("sum", sum, ${p.sum})
	check("avg", fmt.Sprintf("%.2f", avg), "${p.avg.toFixed(2)}")
	check("max", maxV, ${p.max})
	check("min", minV, ${p.min})
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, total)
}`;
    },
  },

  // ── 2. FizzBuzz 變體 ────────────────────────────────────────
  {
    key: 'fizzbuzz',
    chapterTitle: '🎲 隨機挑戰',
    titlePrefix: 'R-2 FizzBuzz 變體',
    difficulty: 'easy',
    generate() {
      const limit = randInt(10, 20);
      const divA = shuffle([3, 4, 5, 6, 7])[0];
      const divB = shuffle([7, 8, 9, 11, 13].filter(x => x !== divA))[0];
      const wordA = shuffle(['Fizz', 'Buzz', 'Go', 'Hello', 'Rock'])[0];
      const wordB = shuffle(['Buzz', 'Jazz', 'World', 'Gopher', 'Roll'].filter(x => x !== wordA))[0];
      const lines = [];
      for (let i = 1; i <= limit; i++) {
        if (i % divA === 0 && i % divB === 0) lines.push(wordA + wordB);
        else if (i % divA === 0) lines.push(wordA);
        else if (i % divB === 0) lines.push(wordB);
        else lines.push(String(i));
      }
      return { limit, divA, divB, wordA, wordB, lines };
    },
    concept: `## FizzBuzz

經典的條件判斷練習：

\`\`\`go
for i := 1; i <= 20; i++ {
    switch {
    case i%3 == 0 && i%5 == 0:
        fmt.Println("FizzBuzz")
    case i%3 == 0:
        fmt.Println("Fizz")
    case i%5 == 0:
        fmt.Println("Buzz")
    default:
        fmt.Println(i)
    }
}
\`\`\``,
    descriptionFn(p) {
      const preview = p.lines.slice(0, 5).join(', ') + ' ...';
      return `### 練習：FizzBuzz 變體

實作 \`fizzBuzz(i int) string\`，對單一數字回傳對應字串：
- 能被 **${p.divA}** 整除 → \`"${p.wordA}"\`
- 能被 **${p.divB}** 整除 → \`"${p.wordB}"\`
- 兩者都能整除 → \`"${p.wordA + p.wordB}"\`
- 否則 → 數字字串，如 \`"1"\`

**1 到 ${p.limit} 的前幾個結果**：${preview}`;
    },
    prefix: `package main

import (
	"fmt"
	"strconv"
)

`,
    templateFn(p) {
      return `func fizzBuzz(i int) string {
    // TODO: 判斷 ${p.divA} / ${p.divB} / 兩者
    return strconv.Itoa(i)
}`;
    },
    solutionFn(p) {
      return `func fizzBuzz(i int) string {
    switch {
    case i%${p.divA} == 0 && i%${p.divB} == 0:
        return "${p.wordA + p.wordB}"
    case i%${p.divA} == 0:
        return "${p.wordA}"
    case i%${p.divB} == 0:
        return "${p.wordB}"
    default:
        return strconv.Itoa(i)
    }
}`;
    },
    suffixFn(p) {
      const cases = p.lines.map((line, idx) =>
        `{${idx + 1}, "${line}"}`
      ).join(', ');
      return `
func main() {
	tests := []struct{ i int; want string }{${cases}}
	passed := 0
	for _, t := range tests {
		got := fizzBuzz(t.i)
		if got == t.want {
			passed++
		} else {
			fmt.Printf("✗ fizzBuzz(%d) 期望=%q 實際=%q\\n", t.i, t.want, got)
		}
	}
	if passed == len(tests) {
		fmt.Printf("✓ 全部 %d 個測試通過\\n", len(tests))
	}
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`;
    },
  },

  // ── 3. 判斷質數 ─────────────────────────────────────────────
  {
    key: 'prime',
    chapterTitle: '🎲 隨機挑戰',
    titlePrefix: 'R-3 質數判斷',
    difficulty: 'easy',
    generate() {
      const candidates = randArray(6, 2, 60);
      const results = candidates.map(n => ({ n, prime: isPrime(n) }));
      return { candidates, results };
    },
    concept: `## 質數判斷

判斷一個數是否為質數（只能被 1 和自身整除）：

\`\`\`go
func isPrime(n int) bool {
    if n < 2 { return false }
    for i := 2; i*i <= n; i++ {
        if n%i == 0 { return false }
    }
    return true
}
\`\`\`

> **效率**：只需檢查到 √n，因為因數成對出現。`,
    descriptionFn(p) {
      const lines = p.results.map(r =>
        `isPrime(${r.n}) → ${r.prime}`).join('\n');
      return `### 練習：實作 isPrime

實作 \`isPrime(n int) bool\`，判斷整數是否為質數。

**測試案例**：
\`\`\`
${lines}
\`\`\``;
    },
    prefix: `package main

import "fmt"

`,
    templateFn(p) {
      return `// TODO: 實作 isPrime（效率：只需檢查到 √n）
func isPrime(n int) bool {
    return false
}`;
    },
    solutionFn(p) {
      return `func isPrime(n int) bool {
    if n < 2 { return false }
    for i := 2; i*i <= n; i++ {
        if n%i == 0 { return false }
    }
    return true
}`;
    },
    suffixFn(p) {
      const cases = p.results.map(r =>
        `{${r.n}, ${r.prime}}`
      ).join(', ');
      return `
func main() {
	tests := []struct{ n int; want bool }{${cases}}
	passed := 0
	for i, t := range tests {
		got := isPrime(t.n)
		if got == t.want {
			passed++
			fmt.Printf("✓ Test %d  isPrime(%d)=%v\\n", i+1, t.n, got)
		} else {
			fmt.Printf("✗ Test %d  isPrime(%d) 期望=%v 實際=%v\\n", i+1, t.n, t.want, got)
		}
	}
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`;
    },
  },

  // ── 4. 計算階乘 ─────────────────────────────────────────────
  {
    key: 'factorial',
    chapterTitle: '🎲 隨機挑戰',
    titlePrefix: 'R-4 計算階乘',
    difficulty: 'easy',
    generate() {
      const ns = shuffle([5, 6, 7, 8, 9, 10]).slice(0, 4).sort((a, b) => a - b);
      const results = ns.map(n => ({ n, fact: factorial(n) }));
      return { ns, results };
    },
    concept: `## 階乘（Factorial）

n! = 1 × 2 × 3 × … × n

\`\`\`go
// 迴圈版（推薦，無 stack overflow 風險）
func factorial(n int) int {
    result := 1
    for i := 2; i <= n; i++ {
        result *= i
    }
    return result
}
\`\`\``,
    descriptionFn(p) {
      const lines = p.results.map(r => `factorial(${r.n}) → ${r.fact}`).join('\n');
      return `### 練習：計算階乘

實作 \`factorial(n int) int\`（用迴圈，不用遞迴）。

**測試案例**：
\`\`\`
${lines}
\`\`\``;
    },
    prefix: `package main

import "fmt"

`,
    templateFn(p) {
      return `// TODO: 實作 factorial（用迴圈，不用遞迴）
func factorial(n int) int {
    return 0
}`;
    },
    solutionFn(p) {
      return `func factorial(n int) int {
    result := 1
    for i := 2; i <= n; i++ {
        result *= i
    }
    return result
}`;
    },
    suffixFn(p) {
      const cases = p.results.map(r => `{${r.n}, ${r.fact}}`).join(', ');
      return `
func main() {
	tests := []struct{ n, want int }{${cases}}
	passed := 0
	for i, t := range tests {
		got := factorial(t.n)
		if got == t.want {
			passed++
			fmt.Printf("✓ Test %d  %d! = %d\\n", i+1, t.n, got)
		} else {
			fmt.Printf("✗ Test %d  %d! 期望=%d 實際=%d\\n", i+1, t.n, t.want, got)
		}
	}
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`;
    },
  },

  // ── 5. 字串反轉與迴文判斷 ──────────────────────────────────
  {
    key: 'palindrome',
    chapterTitle: '🎲 隨機挑戰',
    titlePrefix: 'R-5 字串反轉與迴文',
    difficulty: 'easy',
    generate() {
      const palindromes = ['racecar', 'level', 'madam', 'radar', 'refer', 'noon'];
      const normals = ['golang', 'gopher', 'hello', 'world', 'channel'];
      const words = shuffle([
        shuffle(palindromes)[0],
        shuffle(palindromes)[1],
        shuffle(normals)[0],
        shuffle(normals)[1],
      ]);
      const results = words.map(w => ({
        w,
        rev: w.split('').reverse().join(''),
        pal: isPalindrome(w),
      }));
      return { words, results };
    },
    concept: `## 字串操作

Go 字串是 UTF-8 位元組序列，用 \`[]rune\` 處理 Unicode：

\`\`\`go
// 反轉字串
func reverse(s string) string {
    r := []rune(s)
    for i, j := 0, len(r)-1; i < j; i, j = i+1, j-1 {
        r[i], r[j] = r[j], r[i]
    }
    return string(r)
}

// 迴文判斷
func isPalindrome(s string) bool {
    r := []rune(s)
    for i, j := 0, len(r)-1; i < j; i, j = i+1, j-1 {
        if r[i] != r[j] { return false }
    }
    return true
}
\`\`\``,
    descriptionFn(p) {
      const lines = p.results.map(r =>
        `reverse("${r.w}") → "${r.rev}", isPalindrome → ${r.pal}`).join('\n');
      return `### 練習：反轉字串並判斷迴文

實作 \`reverse(s string) string\` 和 \`isPalindrome(s string) bool\`。

**測試案例**：
\`\`\`
${lines}
\`\`\``;
    },
    prefix: `package main

import "fmt"

`,
    templateFn(p) {
      return `// TODO: 實作 reverse（用 []rune 處理）
func reverse(s string) string {
    return ""
}

// TODO: 實作 isPalindrome
func isPalindrome(s string) bool {
    return false
}`;
    },
    solutionFn(p) {
      return `func reverse(s string) string {
    r := []rune(s)
    for i, j := 0, len(r)-1; i < j; i, j = i+1, j-1 {
        r[i], r[j] = r[j], r[i]
    }
    return string(r)
}

func isPalindrome(s string) bool {
    r := []rune(s)
    for i, j := 0, len(r)-1; i < j; i, j = i+1, j-1 {
        if r[i] != r[j] { return false }
    }
    return true
}`;
    },
    suffixFn(p) {
      const revCases = p.results.map(r =>
        `{"${r.w}", "${r.rev}"}`
      ).join(', ');
      const palCases = p.results.map(r =>
        `{"${r.w}", ${r.pal}}`
      ).join(', ');
      return `
func main() {
	revTests := []struct{ s, want string }{${revCases}}
	palTests := []struct{ s string; want bool }{${palCases}}
	passed, total := 0, 0

	for i, t := range revTests {
		total++
		got := reverse(t.s)
		if got == t.want {
			passed++
			fmt.Printf("✓ reverse(%q) = %q\\n", t.s, got)
		} else {
			fmt.Printf("✗ Test %d reverse(%q) 期望=%q 實際=%q\\n", i+1, t.s, t.want, got)
		}
	}
	for i, t := range palTests {
		total++
		got := isPalindrome(t.s)
		if got == t.want {
			passed++
			fmt.Printf("✓ isPalindrome(%q) = %v\\n", t.s, got)
		} else {
			fmt.Printf("✗ Test %d isPalindrome(%q) 期望=%v 實際=%v\\n", i+1, t.s, t.want, got)
		}
	}
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, total)
}`;
    },
  },

  // ── 6. 泡沫排序 ─────────────────────────────────────────────
  {
    key: 'bubble-sort',
    chapterTitle: '🎲 隨機挑戰',
    titlePrefix: 'R-6 泡沫排序',
    difficulty: 'medium',
    generate() {
      const arr = randArray(randInt(6, 9), 1, 99);
      const sorted = [...arr].sort((a, b) => a - b);
      return { arr, sorted };
    },
    concept: `## 泡沫排序（Bubble Sort）

反覆比較相鄰元素，把較大的往後推：

\`\`\`go
func bubbleSort(arr []int) {
    n := len(arr)
    for i := 0; i < n-1; i++ {
        for j := 0; j < n-1-i; j++ {
            if arr[j] > arr[j+1] {
                arr[j], arr[j+1] = arr[j+1], arr[j]
            }
        }
    }
}
\`\`\`

時間複雜度：O(n²)，空間複雜度：O(1)。`,
    descriptionFn(p) {
      return `### 練習：實作泡沫排序

實作 \`bubbleSort(arr []int)\`，**原地**升序排序。

**測試輸入**：\`${JSON.stringify(p.arr)}\`

**排序後**：\`${JSON.stringify(p.sorted)}\``;
    },
    prefix: `package main

import (
	"fmt"
	"reflect"
)

`,
    templateFn(p) {
      return `// TODO: 實作 bubbleSort（原地排序，不能用 sort 套件）
func bubbleSort(arr []int) {
}`;
    },
    solutionFn(p) {
      return `func bubbleSort(arr []int) {
    n := len(arr)
    for i := 0; i < n-1; i++ {
        for j := 0; j < n-1-i; j++ {
            if arr[j] > arr[j+1] {
                arr[j], arr[j+1] = arr[j+1], arr[j]
            }
        }
    }
}`;
    },
    suffixFn(p) {
      return `
func main() {
	tests := []struct {
		input, want []int
	}{
		{[]int{${p.arr.join(', ')}}, []int{${p.sorted.join(', ')}}},
		{[]int{5, 3, 1, 4, 2}, []int{1, 2, 3, 4, 5}},
		{[]int{9, 8, 7}, []int{7, 8, 9}},
		{[]int{1}, []int{1}},
	}
	passed := 0
	for i, t := range tests {
		arr := make([]int, len(t.input))
		copy(arr, t.input)
		bubbleSort(arr)
		if reflect.DeepEqual(arr, t.want) {
			passed++
			fmt.Printf("✓ Test %d  %v → %v\\n", i+1, t.input, arr)
		} else {
			fmt.Printf("✗ Test %d  期望=%v 實際=%v\\n", i+1, t.want, arr)
		}
	}
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`;
    },
  },

  // ── 7. 費氏數列 ─────────────────────────────────────────────
  {
    key: 'fibonacci',
    chapterTitle: '🎲 隨機挑戰',
    titlePrefix: 'R-7 費氏數列',
    difficulty: 'easy',
    generate() {
      const n = randInt(7, 12);
      const seq = [0, 1];
      for (let i = 2; i < n; i++) seq.push(seq[i - 1] + seq[i - 2]);
      return { n, seq };
    },
    concept: `## 費氏數列（Fibonacci）

F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2)

\`\`\`go
// 迴圈版（效率最佳）
func fibonacci(n int) []int {
    if n <= 0 { return nil }
    seq := make([]int, n)
    if n >= 2 { seq[1] = 1 }
    for i := 2; i < n; i++ {
        seq[i] = seq[i-1] + seq[i-2]
    }
    return seq
}
\`\`\``,
    descriptionFn(p) {
      return `### 練習：印出費氏數列前 ${p.n} 項

實作 \`fibonacci(n int) []int\`，回傳前 n 項費氏數列。

**預期**：fibonacci(${p.n}) → [${p.seq.join(', ')}]`;
    },
    prefix: `package main

import (
	"fmt"
	"reflect"
)

`,
    templateFn(p) {
      return `// TODO: 實作 fibonacci，回傳前 n 項
func fibonacci(n int) []int {
    return nil
}`;
    },
    solutionFn(p) {
      return `func fibonacci(n int) []int {
    if n <= 0 { return nil }
    seq := make([]int, n)
    if n >= 2 { seq[1] = 1 }
    for i := 2; i < n; i++ {
        seq[i] = seq[i-1] + seq[i-2]
    }
    return seq
}`;
    },
    suffixFn(p) {
      return `
func main() {
	type tc struct{ n int; want []int }
	tests := []tc{
		{${p.n}, []int{${p.seq.join(', ')}}},
		{1, []int{0}},
		{2, []int{0, 1}},
		{6, []int{0, 1, 1, 2, 3, 5}},
	}
	passed := 0
	for i, t := range tests {
		got := fibonacci(t.n)
		if reflect.DeepEqual(got, t.want) {
			passed++
			fmt.Printf("✓ Test %d  fibonacci(%d)=%v\\n", i+1, t.n, got)
		} else {
			fmt.Printf("✗ Test %d  期望=%v 實際=%v\\n", i+1, t.want, got)
		}
	}
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`;
    },
  },

  // ── 8. GCD / LCM 批次 ──────────────────────────────────────
  {
    key: 'gcd-lcm',
    chapterTitle: '🎲 隨機挑戰',
    titlePrefix: 'R-8 GCD 與 LCM',
    difficulty: 'easy',
    generate() {
      const pairs = Array.from({ length: 4 }, () => {
        const a = randInt(10, 60);
        const b = randInt(10, 60);
        const g = gcd(a, b);
        return { a, b, g, l: a * b / g };
      });
      return { pairs };
    },
    concept: `## 最大公因數與最小公倍數

\`\`\`go
// 輾轉相除法
func gcd(a, b int) int {
    for b != 0 {
        a, b = b, a%b
    }
    return a
}

// lcm = a * b / gcd(a, b)
func lcm(a, b int) int {
    return a * b / gcd(a, b)
}
\`\`\``,
    descriptionFn(p) {
      const lines = p.pairs.map(p =>
        `gcd(${p.a}, ${p.b})=${p.g}  lcm(${p.a}, ${p.b})=${p.l}`).join('\n');
      return `### 練習：批次計算 GCD 和 LCM

實作 \`gcd(a, b int) int\` 和 \`lcm(a, b int) int\`。

**測試案例**：
\`\`\`
${lines}
\`\`\``;
    },
    prefix: `package main

import "fmt"

`,
    templateFn(p) {
      return `func gcd(a, b int) int {
    // TODO: 輾轉相除法
    return 0
}

func lcm(a, b int) int {
    // TODO: 利用 gcd 計算
    return 0
}`;
    },
    solutionFn(p) {
      return `func gcd(a, b int) int {
    for b != 0 {
        a, b = b, a%b
    }
    return a
}

func lcm(a, b int) int {
    return a * b / gcd(a, b)
}`;
    },
    suffixFn(p) {
      const cases = p.pairs.map(pair =>
        `{${pair.a}, ${pair.b}, ${pair.g}, ${pair.l}}`
      ).join(', ');
      return `
func main() {
	tests := []struct{ a, b, wantGCD, wantLCM int }{${cases}}
	passed := 0
	for i, t := range tests {
		g, l := gcd(t.a, t.b), lcm(t.a, t.b)
		ok := g == t.wantGCD && l == t.wantLCM
		if ok {
			passed++
			fmt.Printf("✓ Test %d  gcd(%d,%d)=%d  lcm=%d\\n", i+1, t.a, t.b, g, l)
		} else {
			fmt.Printf("✗ Test %d  gcd 期望=%d 實際=%d  lcm 期望=%d 實際=%d\\n",
				i+1, t.wantGCD, g, t.wantLCM, l)
		}
	}
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`;
    },
  },

  // ── 9. 過濾陣列 ─────────────────────────────────────────────
  {
    key: 'filter',
    chapterTitle: '🎲 隨機挑戰',
    titlePrefix: 'R-9 陣列過濾',
    difficulty: 'medium',
    generate() {
      const arr = randArray(randInt(7, 10), -15, 30);
      const threshold = randInt(5, 12);
      const positives = arr.filter(n => n > 0);
      const aboveThreshold = arr.filter(n => n > threshold);
      const evens = arr.filter(n => n % 2 === 0);
      return { arr, threshold, positives, aboveThreshold, evens };
    },
    concept: `## 陣列過濾（Filter 模式）

\`\`\`go
func filter(s []int, pred func(int) bool) []int {
    result := make([]int, 0, len(s))
    for _, v := range s {
        if pred(v) {
            result = append(result, v)
        }
    }
    return result
}

// 使用
pos := filter(nums, func(n int) bool { return n > 0 })
\`\`\``,
    descriptionFn(p) {
      return `### 練習：三種過濾條件

實作 \`filter(s []int, pred func(int) bool) []int\`。

對陣列 \`${JSON.stringify(p.arr)}\` 分別過濾：
1. 正數 → \`${JSON.stringify(p.positives)}\`
2. 大於 ${p.threshold} → \`${JSON.stringify(p.aboveThreshold)}\`
3. 偶數 → \`${JSON.stringify(p.evens)}\``;
    },
    prefix: `package main

import (
	"fmt"
	"reflect"
)

`,
    templateFn(p) {
      return `func filter(s []int, pred func(int) bool) []int {
    // TODO: 只保留 pred(v) == true 的元素
    return nil
}`;
    },
    solutionFn(p) {
      return `func filter(s []int, pred func(int) bool) []int {
    result := make([]int, 0, len(s))
    for _, v := range s {
        if pred(v) {
            result = append(result, v)
        }
    }
    return result
}`;
    },
    suffixFn(p) {
      const pos = JSON.stringify(p.positives).replace(/\[/, '[]int{').replace(/\]/, '}').replace(/,/g, ', ');
      const above = JSON.stringify(p.aboveThreshold).replace(/\[/, '[]int{').replace(/\]/, '}').replace(/,/g, ', ');
      const evens = JSON.stringify(p.evens).replace(/\[/, '[]int{').replace(/\]/, '}').replace(/,/g, ', ');
      const posGo = p.positives.length === 0 ? '[]int{}'
        : `[]int{${p.positives.join(', ')}}`;
      const aboveGo = p.aboveThreshold.length === 0 ? '[]int{}'
        : `[]int{${p.aboveThreshold.join(', ')}}`;
      const evensGo = p.evens.length === 0 ? '[]int{}'
        : `[]int{${p.evens.join(', ')}}`;
      return `
func main() {
	nums := []int{${p.arr.join(', ')}}
	type tc struct {
		label string
		got   []int
		want  []int
	}
	tests := []tc{
		{"正數", filter(nums, func(n int) bool { return n > 0 }), ${posGo}},
		{">${p.threshold}", filter(nums, func(n int) bool { return n > ${p.threshold} }), ${aboveGo}},
		{"偶數", filter(nums, func(n int) bool { return n%2 == 0 }), ${evensGo}},
	}
	passed := 0
	for i, t := range tests {
		got := t.got
		if got == nil { got = []int{} }
		want := t.want
		if want == nil { want = []int{} }
		if reflect.DeepEqual(got, want) {
			passed++
			fmt.Printf("✓ Test %d [%s] = %v\\n", i+1, t.label, got)
		} else {
			fmt.Printf("✗ Test %d [%s]\\n  期望=%v\\n  實際=%v\\n", i+1, t.label, want, got)
		}
	}
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`;
    },
  },

  // ── 10. 矩形星號圖案 ────────────────────────────────────────
  {
    key: 'pattern',
    chapterTitle: '🎲 隨機挑戰',
    titlePrefix: 'R-10 星號圖案',
    difficulty: 'easy',
    generate() {
      const rows = randInt(4, 7);
      const cols = randInt(5, 10);
      const border = [];
      const filled = [];
      for (let r = 0; r < rows; r++) {
        let bLine = '';
        let fLine = '';
        for (let c = 0; c < cols; c++) {
          bLine += (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) ? '*' : ' ';
          fLine += '*';
        }
        border.push(bLine);
        filled.push(fLine);
      }
      const type_ = Math.random() < 0.5 ? 'border' : 'filled';
      return { rows, cols, border, filled, type: type_ };
    },
    concept: `## 巢狀迴圈與字串建構

\`\`\`go
// 印出 rows×cols 的矩形
for r := 0; r < rows; r++ {
    for c := 0; c < cols; c++ {
        fmt.Print("*")
    }
    fmt.Println()
}

// 只印邊框
for r := 0; r < rows; r++ {
    for c := 0; c < cols; c++ {
        isBorder := r==0 || r==rows-1 || c==0 || c==cols-1
        if isBorder {
            fmt.Print("*")
        } else {
            fmt.Print(" ")
        }
    }
    fmt.Println()
}
\`\`\``,
    descriptionFn(p) {
      const target = p.type === 'border' ? p.border : p.filled;
      const label = p.type === 'border' ? '只有邊框（中間空白）' : '全填滿';
      return `### 練習：buildPattern

實作 \`buildPattern(rows, cols int, filled bool) []string\`，
回傳 ${p.rows}×${p.cols} 的矩形（每行一個字串）。

- \`filled=true\` → 全填滿 \`*\`
- \`filled=false\` → 只有邊框

**本題為 ${label}（${p.type === 'border' ? 'filled=false' : 'filled=true'}）**

**預期**：
\`\`\`
${target.join('\n')}
\`\`\``;
    },
    prefix: `package main

import (
	"fmt"
	"reflect"
	"strings"
)

`,
    templateFn(p) {
      return `func buildPattern(rows, cols int, filled bool) []string {
    result := make([]string, rows)
    for r := 0; r < rows; r++ {
        var sb strings.Builder
        for c := 0; c < cols; c++ {
            // TODO: filled=true 全填 *；filled=false 只填邊框
            sb.WriteByte(' ')
        }
        result[r] = sb.String()
    }
    return result
}`;
    },
    solutionFn(p) {
      return `func buildPattern(rows, cols int, filled bool) []string {
    result := make([]string, rows)
    for r := 0; r < rows; r++ {
        var sb strings.Builder
        for c := 0; c < cols; c++ {
            isBorder := r == 0 || r == rows-1 || c == 0 || c == cols-1
            if filled || isBorder {
                sb.WriteByte('*')
            } else {
                sb.WriteByte(' ')
            }
        }
        result[r] = sb.String()
    }
    return result
}`;
    },
    suffixFn(p) {
      const target = p.type === 'border' ? p.border : p.filled;
      const filledBool = p.type !== 'border';
      const wantLines = target.map(l => `"${l}"`).join(', ');
      return `
func main() {
	type tc struct {
		rows, cols int
		filled     bool
		want       []string
	}
	tests := []tc{
		{${p.rows}, ${p.cols}, ${filledBool}, []string{${wantLines}}},
		{3, 5, true, []string{"*****", "*****", "*****"}},
		{3, 5, false, []string{"*****", "*   *", "*****"}},
	}
	passed := 0
	for i, t := range tests {
		got := buildPattern(t.rows, t.cols, t.filled)
		if reflect.DeepEqual(got, t.want) {
			passed++
			fmt.Printf("✓ Test %d (%dx%d filled=%v)\\n", i+1, t.rows, t.cols, t.filled)
		} else {
			fmt.Printf("✗ Test %d\\n  期望:\\n")
			for _, l := range t.want { fmt.Printf("    %q\\n", l) }
			fmt.Printf("  實際:\\n")
			for _, l := range got { fmt.Printf("    %q\\n", l) }
		}
	}
	fmt.Printf("\\n結果：%d / %d 通過\\n", passed, len(tests))
}`;
    },
  },
];

// ── 對外 API ─────────────────────────────────────────────────
function generateRandomExercise(keyHint) {
  let tmpl;
  if (keyHint) {
    tmpl = RANDOM_TEMPLATES.find(t => t.key === keyHint);
  }
  if (!tmpl) {
    tmpl = RANDOM_TEMPLATES[Math.floor(Math.random() * RANDOM_TEMPLATES.length)];
  }

  const params = tmpl.generate();
  return {
    id: 'random-' + tmpl.key + '-' + Date.now(),
    chapterId: 'random',
    chapterTitle: tmpl.chapterTitle,
    title: tmpl.titlePrefix,
    difficulty: tmpl.difficulty,
    concept: tmpl.concept,
    description: tmpl.descriptionFn(params),
    prefix: tmpl.prefix,
    template: tmpl.templateFn(params),
    solution: tmpl.solutionFn(params),
    suffix: tmpl.suffixFn(params),
    _key: tmpl.key,
    _params: params,
    isRandom: true,
  };
}
