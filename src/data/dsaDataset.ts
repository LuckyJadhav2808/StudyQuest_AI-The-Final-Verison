// ============================================================
// StudyQuest AI — Curated DSA Dataset (NeetCode 150 + Striver A2Z)
// Dual-Tagged by Data Structure Topic & Algorithmic Pattern
// ============================================================

import { DsaProblem } from '@/types/dsa';

export const DSA_PROBLEMS: DsaProblem[] = [
  // ------------------------------------------------------------
  // ARRAYS & HASHING / TWO POINTERS
  // ------------------------------------------------------------
  {
    id: 'two-sum',
    leetcodeId: 1,
    title: 'Two Sum',
    difficulty: 'easy',
    category: 'Arrays & Hashing',
    pattern: 'Two Pointers',
    leetcodeUrl: 'https://leetcode.com/problems/two-sum/',
    description:
      'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.',
    statementExplanation:
      'You are given an array of numbers and a target value. Your goal is to find two numbers in the array whose sum equals target, and return their 0-indexed positions [i, j].',
    problemBreakdown: [
      '💡 Key Goal: Find indices `i` and `j` such that `nums[i] + nums[j] === target`.',
      '🎯 Unique Pair Guarantee: There is guaranteed to be exactly one solution for the given inputs.',
      '⚠️ Constraint Watch: You cannot use the same element at the same index twice (e.g. index i + index i).',
      '⚡ Optimization Strategy: Instead of nested loop O(N²), store target - nums[i] in a Hash Map to solve in O(N).',
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.',
    ],
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
      },
    ],
    templates: {
      javascript: `function twoSum(nums, target) {
  // Write your code here
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) {
      return [map.get(diff), i];
    }
    map.set(nums[i], i);
  }
  return [];
}

console.log(twoSum([2, 7, 11, 15], 9));`,
      python: `def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []

print(twoSum([2, 7, 11, 15], 9))`,
      java: `import java.util.*;

class Solution {
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(twoSum(new int[]{2, 7, 11, 15}, 9)));
    }
}`,
      cpp: `#include <iostream>
#include <vector>
#include <unordered_map>

std::vector<int> twoSum(const std::vector<int>& nums, int target) {
    std::unordered_map<int, int> map;
    for (int i = 0; i < nums.size(); i++) {
        int diff = target - nums[i];
        if (map.find(diff) != map.end()) {
            return {map[diff], i};
        }
        map[nums[i]] = i;
    }
    return {};
}

int main() {
    auto res = twoSum({2, 7, 11, 15}, 9);
    std::cout << "[" << res[0] << ", " << res[1] << "]" << std::endl;
    return 0;
}`,
    },
    testCases: [
      { id: 1, input: '[2,7,11,15], 9', expectedOutput: '[0,1]' },
      { id: 2, input: '[3,2,4], 6', expectedOutput: '[1,2]' },
      { id: 3, input: '[3,3], 6', expectedOutput: '[0,1]' },
    ],
    approaches: [
      {
        title: 'Approach 1: Brute Force (Nested Loops)',
        type: 'brute-force',
        intuition:
          'Check every possible pair of elements in the array to see if their sum equals the target.',
        timeComplexity: 'O(N^2)',
        spaceComplexity: 'O(1)',
        explanation: [
          'Use two nested loops: outer loop i from 0 to N-1, inner loop j from i+1 to N-1.',
          'Check if nums[i] + nums[j] == target.',
          'If match found, return [i, j].',
        ],
        code: {
          javascript: `function twoSumBrute(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) return [i, j];
    }
  }
  return [];
}`,
          python: `def twoSumBrute(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []`,
          java: `public int[] twoSumBrute(int[] nums, int target) {
    for (int i = 0; i < nums.length; i++) {
        for (int j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] == target) return new int[]{i, j};
        }
    }
    return new int[0];
}`,
          cpp: `vector<int> twoSumBrute(vector<int>& nums, int target) {
    for (int i = 0; i < nums.size(); i++) {
        for (int j = i + 1; j < nums.size(); j++) {
            if (nums[i] + nums[j] == target) return {i, j};
        }
    }
    return {};
}`,
        },
      },
      {
        title: 'Approach 2: One-Pass Hash Map (Optimal)',
        type: 'optimal',
        intuition:
          'As we iterate through the array, we look up if the complement `target - nums[i]` is already stored in a Hash Map.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(N)',
        explanation: [
          'Create a hash map storing value -> index.',
          'For each element x at index i, calculate complement = target - x.',
          'If complement exists in the map, return [map[complement], i].',
          'Otherwise, insert map[x] = i and continue.',
        ],
        code: {
          javascript: `function twoSumOptimal(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) return [map.get(complement), i];
    map.set(nums[i], i);
  }
  return [];
}`,
          python: `def twoSumOptimal(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []`,
          java: `public int[] twoSumOptimal(int[] nums, int target) {
    Map<Integer, Integer> map = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];
        if (map.containsKey(complement)) return new int[]{map.get(complement), i};
        map.put(nums[i], i);
    }
    return new int[0];
}`,
          cpp: `vector<int> twoSumOptimal(vector<int>& nums, int target) {
    unordered_map<int, int> map;
    for (int i = 0; i < nums.size(); i++) {
        int diff = target - nums[i];
        if (map.count(diff)) return {map[diff], i};
        map[nums[i]] = i;
    }
    return {};
}`,
        },
      },
    ],
    tips: [
      'Hash Map reduces search time from O(N) to O(1).',
      'Make sure to check complement BEFORE adding the current element to avoid using the same index twice.',
    ],
  },
  {
    id: 'valid-anagram',
    leetcodeId: 242,
    title: 'Valid Anagram',
    difficulty: 'easy',
    category: 'Arrays & Hashing',
    pattern: 'Two Pointers',
    leetcodeUrl: 'https://leetcode.com/problems/valid-anagram/',
    description:
      'Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.\n\nAn Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.',
    constraints: ['1 <= s.length, t.length <= 5 * 10^4', 's and t consist of lowercase English letters.'],
    examples: [
      { input: 's = "anagram", t = "nagaram"', output: 'true' },
      { input: 's = "rat", t = "car"', output: 'false' },
    ],
    templates: {
      javascript: `function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = new Array(26).fill(0);
  for (let i = 0; i < s.length; i++) {
    count[s.charCodeAt(i) - 97]++;
    count[t.charCodeAt(i) - 97]--;
  }
  return count.every(c => c === 0);
}

console.log(isAnagram("anagram", "nagaram"));`,
      python: `def isAnagram(s: str, t: str) -> bool:
    if len(s) != len(t): return False
    count = {}
    for char in s: count[char] = count.get(char, 0) + 1
    for char in t:
        if char not in count or count[char] == 0: return False
        count[char] -= 1
    return True

print(isAnagram("anagram", "nagaram"))`,
      java: `class Solution {
    public static boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;
        int[] count = new int[26];
        for (int i = 0; i < s.length(); i++) {
            count[s.charAt(i) - 'a']++;
            count[t.charAt(i) - 'a']--;
        }
        for (int c : count) if (c != 0) return false;
        return true;
    }
    public static void main(String[] args) { System.out.println(isAnagram("anagram", "nagaram")); }
}`,
      cpp: `#include <iostream>
#include <string>
#include <vector>

bool isAnagram(std::string s, std::string t) {
    if (s.length() != t.length()) return false;
    std::vector<int> count(26, 0);
    for (size_t i = 0; i < s.length(); i++) {
        count[s[i] - 'a']++;
        count[t[i] - 'a']--;
    }
    for (int c : count) if (c != 0) return false;
    return true;
}

int main() { std::cout << (isAnagram("anagram", "nagaram") ? "true" : "false") << std::endl; }`,
    },
    testCases: [
      { id: 1, input: '"anagram", "nagaram"', expectedOutput: 'true' },
      { id: 2, input: '"rat", "car"', expectedOutput: 'false' },
    ],
    approaches: [
      {
        title: 'Approach 1: Sorting Both Strings',
        type: 'brute-force',
        intuition: 'If two strings are anagrams, sorting their characters will result in identical strings.',
        timeComplexity: 'O(N log N)',
        spaceComplexity: 'O(1) or O(N)',
        explanation: [
          'Sort character array of s and character array of t.',
          'Compare if sorted_s == sorted_t.',
        ],
        code: {
          javascript: `function isAnagram(s, t) { return s.split('').sort().join('') === t.split('').sort().join(''); }`,
          python: `def isAnagram(s, t): return sorted(s) == sorted(t)`,
          java: `public boolean isAnagram(String s, String t) { char[] sArr = s.toCharArray(), tArr = t.toCharArray(); Arrays.sort(sArr); Arrays.sort(tArr); return Arrays.equals(sArr, tArr); }`,
          cpp: `bool isAnagram(string s, string t) { sort(s.begin(), s.end()); sort(t.begin(), t.end()); return s == t; }`,
        },
      },
      {
        title: 'Approach 2: Character Frequency Array (Optimal)',
        type: 'optimal',
        intuition: 'Count character occurrences using a fixed array of size 26.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1) - fixed 26 elements',
        explanation: [
          'First check if s.length == t.length. If not, return false.',
          'Increment count for s[i] and decrement count for t[i].',
          'Check if all counts are 0.',
        ],
        code: {
          javascript: `function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = new Array(26).fill(0);
  for (let i = 0; i < s.length; i++) {
    count[s.charCodeAt(i) - 97]++;
    count[t.charCodeAt(i) - 97]--;
  }
  return count.every(c => c === 0);
}`,
          python: `def isAnagram(s, t):
  if len(s) != len(t): return False
  count = [0] * 26
  for i in range(len(s)):
      count[ord(s[i]) - 97] += 1
      count[ord(t[i]) - 97] -= 1
  return all(c == 0 for c in count)`,
          java: `public boolean isAnagram(String s, String t) {
  if (s.length() != t.length()) return false;
  int[] count = new int[26];
  for (int i = 0; i < s.length(); i++) {
      count[s.charAt(i) - 'a']++;
      count[t.charAt(i) - 'a']--;
  }
  for (int c : count) if (c != 0) return false;
  return true;
}`,
          cpp: `bool isAnagram(string s, string t) {
  if (s.length() != t.length()) return false;
  vector<int> count(26, 0);
  for (int i = 0; i < s.length(); i++) {
      count[s[i] - 'a']++;
      count[t[i] - 'a']--;
  }
  for (int c : count) if (c != 0) return false;
  return true;
}`,
        },
      },
    ],
  },

  // ------------------------------------------------------------
  // SLIDING WINDOW PATTERN
  // ------------------------------------------------------------
  {
    id: 'longest-substring-without-repeating',
    leetcodeId: 3,
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'medium',
    category: 'Sliding Window',
    pattern: 'Sliding Window',
    leetcodeUrl: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
    description:
      'Given a string `s`, find the length of the longest substring without repeating characters.',
    constraints: ['0 <= s.length <= 5 * 10^4', 's consists of English letters, digits, symbols and spaces.'],
    examples: [
      { input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc", with the length of 3.' },
      { input: 's = "bbbbb"', output: '1', explanation: 'The answer is "b", with the length of 1.' },
    ],
    templates: {
      javascript: `function lengthOfLongestSubstring(s) {
  let left = 0, maxLen = 0;
  const set = new Set();
  for (let right = 0; right < s.length; right++) {
    while (set.has(s[right])) {
      set.delete(s[left]);
      left++;
    }
    set.add(s[right]);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}

console.log(lengthOfLongestSubstring("abcabcbb"));`,
      python: `def lengthOfLongestSubstring(s: str) -> int:
    char_set = set()
    left = 0
    max_len = 0
    for right in range(len(s)):
        while s[right] in char_set:
            char_set.remove(s[left])
            left += 1
        char_set.add(s[right])
        max_len = max(max_len, right - left + 1)
    return max_len

print(lengthOfLongestSubstring("abcabcbb"))`,
      java: `import java.util.*;

class Solution {
    public static int lengthOfLongestSubstring(String s) {
        Set<Character> set = new HashSet<>();
        int left = 0, maxLen = 0;
        for (int right = 0; right < s.length(); right++) {
            while (set.contains(s.charAt(right))) {
                set.remove(s.charAt(left));
                left++;
            }
            set.add(s.charAt(right));
            maxLen = Math.max(maxLen, right - left + 1);
        }
        return maxLen;
    }
    public static void main(String[] args) { System.out.println(lengthOfLongestSubstring("abcabcbb")); }
}`,
      cpp: `#include <iostream>
#include <string>
#include <unordered_set>
#include <algorithm>

int lengthOfLongestSubstring(std::string s) {
    std::unordered_set<char> set;
    int left = 0, maxLen = 0;
    for (int right = 0; right < s.length(); right++) {
        while (set.count(s[right])) {
            set.erase(s[left]);
            left++;
        }
        set.insert(s[right]);
        maxLen = std::max(maxLen, right - left + 1);
    }
    return maxLen;
}

int main() { std::cout << lengthOfLongestSubstring("abcabcbb") << std::endl; }`,
    },
    testCases: [
      { id: 1, input: '"abcabcbb"', expectedOutput: '3' },
      { id: 2, input: '"bbbbb"', expectedOutput: '1' },
      { id: 3, input: '"pwwkew"', expectedOutput: '3' },
    ],
    approaches: [
      {
        title: 'Approach 1: Sliding Window Set (Optimal)',
        type: 'optimal',
        intuition:
          'Use two pointers (left and right) defining a window. Dynamically shrink from left when a duplicate character is encountered.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(min(N, M)) where M is character set size',
        explanation: [
          'Maintain a HashSet of active window characters.',
          'Expand `right` pointer one by one.',
          'If `s[right]` exists in set, shrink window by incrementing `left` and removing `s[left]` until `s[right]` is unique.',
          'Update `maxLen = max(maxLen, right - left + 1)`.',
        ],
        code: {
          javascript: `function lengthOfLongestSubstring(s) {
  let left = 0, maxLen = 0;
  const set = new Set();
  for (let right = 0; right < s.length; right++) {
    while (set.has(s[right])) { set.delete(s[left]); left++; }
    set.add(s[right]);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}`,
          python: `def lengthOfLongestSubstring(s):
  left = 0
  max_len = 0
  seen = set()
  for right in range(len(s)):
      while s[right] in seen:
          seen.remove(s[left])
          left += 1
      seen.add(s[right])
      max_len = max(max_len, right - left + 1)
  return max_len`,
          java: `public int lengthOfLongestSubstring(String s) {
  Set<Character> set = new HashSet<>();
  int left = 0, maxLen = 0;
  for (int right = 0; right < s.length(); right++) {
      while (set.contains(s.charAt(right))) {
          set.remove(s.charAt(left));
          left++;
      }
      set.add(s.charAt(right));
      maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}`,
          cpp: `int lengthOfLongestSubstring(string s) {
  unordered_set<char> set;
  int left = 0, maxLen = 0;
  for (int right = 0; right < s.length(); right++) {
      while (set.count(s[right])) {
          set.erase(s[left]);
          left++;
      }
      set.insert(s[right]);
      maxLen = max(maxLen, right - left + 1);
  }
  return maxLen;
}`,
        },
      },
    ],
  },

  // ------------------------------------------------------------
  // STACK & QUEUE / MONOTONIC STACK
  // ------------------------------------------------------------
  {
    id: 'valid-parentheses',
    leetcodeId: 20,
    title: 'Valid Parentheses',
    difficulty: 'easy',
    category: 'Stack & Queue',
    pattern: 'Monotonic Stack',
    leetcodeUrl: 'https://leetcode.com/problems/valid-parentheses/',
    description:
      'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.',
    constraints: ['1 <= s.length <= 10^4', 's consists of brackets only `()[]{}`.'],
    examples: [
      { input: 's = "()"', output: 'true' },
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "(]"', output: 'false' },
    ],
    templates: {
      javascript: `function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const char of s) {
    if (char in map) {
      if (stack.pop() !== map[char]) return false;
    } else {
      stack.push(char);
    }
  }
  return stack.length === 0;
}

console.log(isValid("()[]{}"));`,
      python: `def isValid(s: str) -> bool:
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping:
            top_element = stack.pop() if stack else '#'
            if mapping[char] != top_element:
                return False
        else:
            stack.append(char)
    return not stack

print(isValid("()[]{}"))`,
      java: `import java.util.Stack;

class Solution {
    public static boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();
        for (char c : s.toCharArray()) {
            if (c == '(') stack.push(')');
            else if (c == '{') stack.push('}');
            else if (c == '[') stack.push(']');
            else if (stack.isEmpty() || stack.pop() != c) return false;
        }
        return stack.isEmpty();
    }
    public static void main(String[] args) { System.out.println(isValid("()[]{}")); }
}`,
      cpp: `#include <iostream>
#include <string>
#include <stack>

bool isValid(std::string s) {
    std::stack<char> st;
    for (char c : s) {
        if (c == '(') st.push(')');
        else if (c == '{') st.push('}');
        else if (c == '[') st.push(']');
        else {
            if (st.empty() || st.top() != c) return false;
            st.pop();
        }
    }
    return st.empty();
}

int main() { std::cout << (isValid("()[]{}") ? "true" : "false") << std::endl; }`,
    },
    testCases: [
      { id: 1, input: '"()"', expectedOutput: 'true' },
      { id: 2, input: '"()[]{}"', expectedOutput: 'true' },
      { id: 3, input: '"(]"', expectedOutput: 'false' },
    ],
    approaches: [
      {
        title: 'Approach 1: Stack Matching (Optimal)',
        type: 'optimal',
        intuition: 'Use LIFO (Last In First Out) Stack structure to match most recent open bracket with closing bracket.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(N)',
        explanation: [
          'Push opening brackets onto stack.',
          'When closing bracket is met, pop top element and verify matching pair.',
          'Return true if stack is empty at end.',
        ],
        code: {
          javascript: `function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (let c of s) {
    if (c in map) {
      if (stack.pop() !== map[c]) return false;
    } else stack.push(c);
  }
  return stack.length === 0;
}`,
          python: `def isValid(s):
  stack = []
  map = {')': '(', '}': '{', ']': '['}
  for c in s:
      if c in map:
          if not stack or stack.pop() != map[c]: return False
      else: stack.append(c)
  return len(stack) == 0`,
          java: `public boolean isValid(String s) {
  Stack<Character> st = new Stack<>();
  for (char c : s.toCharArray()) {
      if (c == '(') st.push(')');
      else if (c == '{') st.push('}');
      else if (c == '[') st.push(']');
      else if (st.isEmpty() || st.pop() != c) return false;
  }
  return st.isEmpty();
}`,
          cpp: `bool isValid(string s) {
  stack<char> st;
  for (char c : s) {
      if (c == '(') st.push(')');
      else if (c == '{') st.push('}');
      else if (c == '[') st.push(']');
      else {
          if (st.empty() || st.top() != c) return false;
          st.pop();
      }
  }
  return st.empty();
}`,
        },
      },
    ],
  },

  // ------------------------------------------------------------
  // BINARY SEARCH
  // ------------------------------------------------------------
  {
    id: 'binary-search',
    leetcodeId: 704,
    title: 'Binary Search',
    difficulty: 'easy',
    category: 'Binary Search',
    pattern: 'Two Pointers',
    leetcodeUrl: 'https://leetcode.com/problems/binary-search/',
    description:
      'Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return `-1`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.',
    constraints: ['1 <= nums.length <= 10^4', '-10^4 < nums[i], target < 10^4', 'All elements in nums are unique.', 'nums is sorted in ascending order.'],
    examples: [
      { input: 'nums = [-1,0,3,5,9,12], target = 9', output: '4', explanation: '9 exists in nums and its index is 4' },
      { input: 'nums = [-1,0,3,5,9,12], target = 2', output: '-1', explanation: '2 does not exist in nums so return -1' },
    ],
    templates: {
      javascript: `function search(nums, target) {
  let low = 0, high = nums.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}

console.log(search([-1,0,3,5,9,12], 9));`,
      python: `def search(nums: list[int], target: int) -> int:
    low, high = 0, len(nums) - 1
    while low <= high:
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

print(search([-1, 0, 3, 5, 9, 12], 9))`,
      java: `class Solution {
    public static int search(int[] nums, int target) {
        int low = 0, high = nums.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }
    public static void main(String[] args) { System.out.println(search(new int[]{-1, 0, 3, 5, 9, 12}, 9)); }
}`,
      cpp: `#include <iostream>
#include <vector>

int search(const std::vector<int>& nums, int target) {
    int low = 0, high = nums.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

int main() { std::cout << search({-1, 0, 3, 5, 9, 12}, 9) << std::endl; }`,
    },
    testCases: [
      { id: 1, input: '[-1,0,3,5,9,12], 9', expectedOutput: '4' },
      { id: 2, input: '[-1,0,3,5,9,12], 2', expectedOutput: '-1' },
    ],
    approaches: [
      {
        title: 'Approach 1: Divide and Conquer Binary Search (Optimal)',
        type: 'optimal',
        intuition: 'Repeatedly divide search interval in half by comparing target with middle element.',
        timeComplexity: 'O(log N)',
        spaceComplexity: 'O(1)',
        explanation: [
          'Set low = 0, high = N - 1.',
          'Calculate mid = low + (high - low) / 2.',
          'If nums[mid] == target, return mid.',
          'If nums[mid] < target, shift search space right (low = mid + 1).',
          'Else shift search space left (high = mid - 1).',
        ],
        code: {
          javascript: `function search(nums, target) {
  let low = 0, high = nums.length - 1;
  while (low <= high) {
    let mid = Math.floor((low + high) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}`,
          python: `def search(nums, target):
  l, r = 0, len(nums) - 1
  while l <= r:
      m = (l + r) // 2
      if nums[m] == target: return m
      if nums[m] < target: l = m + 1
      else: r = m - 1
  return -1`,
          java: `public int search(int[] nums, int target) {
  int l = 0, r = nums.length - 1;
  while (l <= r) {
      int m = l + (r - l) / 2;
      if (nums[m] == target) return m;
      if (nums[m] < target) l = m + 1;
      else r = m - 1;
  }
  return -1;
}`,
          cpp: `int search(vector<int>& nums, int target) {
  int l = 0, r = nums.size() - 1;
  while (l <= r) {
      int m = l + (r - l) / 2;
      if (nums[m] == target) return m;
      if (nums[m] < target) l = m + 1;
      else r = m - 1;
  }
  return -1;
}`,
        },
      },
    ],
  },

  // ------------------------------------------------------------
  // DYNAMIC PROGRAMMING
  // ------------------------------------------------------------
  {
    id: 'climbing-stairs',
    leetcodeId: 70,
    title: 'Climbing Stairs',
    difficulty: 'easy',
    category: 'Dynamic Programming',
    pattern: '0/1 Knapsack (DP)',
    leetcodeUrl: 'https://leetcode.com/problems/climbing-stairs/',
    description:
      'You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?',
    constraints: ['1 <= n <= 45'],
    examples: [
      { input: 'n = 2', output: '2', explanation: '1. 1 step + 1 step\n2. 2 steps' },
      { input: 'n = 3', output: '3', explanation: '1. 1+1+1\n2. 1+2\n3. 2+1' },
    ],
    templates: {
      javascript: `function climbStairs(n) {
  if (n <= 2) return n;
  let prev2 = 1, prev1 = 2;
  for (let i = 3; i <= n; i++) {
    const curr = prev1 + prev2;
    prev2 = prev1;
    prev1 = curr;
  }
  return prev1;
}

console.log(climbStairs(5));`,
      python: `def climbStairs(n: int) -> int:
    if n <= 2: return n
    prev2, prev1 = 1, 2
    for i in range(3, n + 1):
        prev2, prev1 = prev1, prev1 + prev2
    return prev1

print(climbStairs(5))`,
      java: `class Solution {
    public static int climbStairs(int n) {
        if (n <= 2) return n;
        int prev2 = 1, prev1 = 2;
        for (int i = 3; i <= n; i++) {
            int curr = prev1 + prev2;
            prev2 = prev1;
            prev1 = curr;
        }
        return prev1;
    }
    public static void main(String[] args) { System.out.println(climbStairs(5)); }
}`,
      cpp: `#include <iostream>

int climbStairs(int n) {
    if (n <= 2) return n;
    int prev2 = 1, prev1 = 2;
    for (int i = 3; i <= n; i++) {
        int curr = prev1 + prev2;
        prev2 = prev1;
        prev1 = curr;
    }
    return prev1;
}

int main() { std::cout << climbStairs(5) << std::endl; }`,
    },
    testCases: [
      { id: 1, input: '2', expectedOutput: '2' },
      { id: 2, input: '3', expectedOutput: '3' },
      { id: 3, input: '5', expectedOutput: '8' },
    ],
    approaches: [
      {
        title: 'Approach 1: Recursion with Memoization',
        type: 'better',
        intuition: 'Top-down DP storing computed subproblem states.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(N) recursion stack & memo table',
        explanation: ['dp[n] = dp[n-1] + dp[n-2]', 'Store results in memo array to prevent recalculating.'],
        code: {
          javascript: `function climbStairs(n, memo = {}) {
  if (n <= 2) return n;
  if (n in memo) return memo[n];
  memo[n] = climbStairs(n - 1, memo) + climbStairs(n - 2, memo);
  return memo[n];
}`,
          python: `def climbStairs(n, memo={}):
  if n <= 2: return n
  if n in memo: return memo[n]
  memo[n] = climbStairs(n - 1, memo) + climbStairs(n - 2, memo)
  return memo[n]`,
          java: `public int climbStairs(int n) {
  int[] memo = new int[n + 1];
  return helper(n, memo);
}
private int helper(int n, int[] memo) {
  if (n <= 2) return n;
  if (memo[n] > 0) return memo[n];
  memo[n] = helper(n - 1, memo) + helper(n - 2, memo);
  return memo[n];
}`,
          cpp: `int climbStairs(int n) {
  vector<int> memo(n + 1, 0);
  return helper(n, memo);
}
int helper(int n, vector<int>& memo) {
  if (n <= 2) return n;
  if (memo[n] > 0) return memo[n];
  memo[n] = helper(n - 1, memo) + helper(n - 2, memo);
  return memo[n];
}`,
        },
      },
      {
        title: 'Approach 2: Space-Optimized Bottom-Up DP (Optimal)',
        type: 'optimal',
        intuition: 'Since dp[n] only relies on dp[n-1] and dp[n-2], maintain only two variables.',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)',
        explanation: ['Iterate from 3 to N, constantly shifting variables.'],
        code: {
          javascript: `function climbStairs(n) {
  if (n <= 2) return n;
  let p2 = 1, p1 = 2;
  for (let i = 3; i <= n; i++) {
    let curr = p1 + p2;
    p2 = p1;
    p1 = curr;
  }
  return p1;
}`,
          python: `def climbStairs(n):
  if n <= 2: return n
  p2, p1 = 1, 2
  for _ in range(3, n + 1):
      p2, p1 = p1, p1 + p2
  return p1`,
          java: `public int climbStairs(int n) {
  if (n <= 2) return n;
  int p2 = 1, p1 = 2;
  for (int i = 3; i <= n; i++) {
      int curr = p1 + p2;
      p2 = p1;
      p1 = curr;
  }
  return p1;
}`,
          cpp: `int climbStairs(int n) {
  if (n <= 2) return n;
  int p2 = 1, p1 = 2;
  for (int i = 3; i <= n; i++) {
      int curr = p1 + p2;
      p2 = p1;
      p1 = curr;
  }
  return p1;
}`,
        },
      },
    ],
  },
];
