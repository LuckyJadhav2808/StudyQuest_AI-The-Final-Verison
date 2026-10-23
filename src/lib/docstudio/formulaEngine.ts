/**
 * StudyQuest Local-First Spreadsheet Formula Engine
 * 100% Client-Side Pure JavaScript/TypeScript.
 * Supports standard Excel formula syntax, cell references (A1, B2:D10),
 * math expressions, statistical functions, logic, and lookup operations.
 */

export interface SheetGridData {
  headers: string[];
  rows: string[][];
}

/**
 * Converts column letter to 0-based column index:
 * 'A' -> 0, 'Z' -> 25, 'AA' -> 26, 'AB' -> 27
 */
export function columnLetterToIndex(colLetter: string): number {
  let col = 0;
  const upper = colLetter.toUpperCase().trim();
  for (let i = 0; i < upper.length; i++) {
    col = col * 26 + (upper.charCodeAt(i) - 64);
  }
  return col - 1;
}

/**
 * Converts 0-based column index to Excel column letter:
 * 0 -> 'A', 25 -> 'Z', 26 -> 'AA'
 */
export function columnIndexToLetter(colIndex: number): string {
  let label = '';
  let temp = colIndex;
  while (temp >= 0) {
    label = String.fromCharCode((temp % 26) + 65) + label;
    temp = Math.floor(temp / 26) - 1;
  }
  return label;
}

/**
 * Parses a cell reference like "A1", "B2", "$C$5"
 * Returns 0-based colIndex and 1-based excelRowNumber (1 = header, 2 = row[0])
 */
export function parseCellReference(ref: string): { col: number; row: number } | null {
  const clean = ref.replace(/\$/g, '').trim().toUpperCase();
  const match = clean.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;

  const colLetter = match[1];
  const rowNumber = parseInt(match[2], 10);
  if (isNaN(rowNumber) || rowNumber < 1) return null;

  return {
    col: columnLetterToIndex(colLetter),
    row: rowNumber,
  };
}

/**
 * Retrieves raw cell text based on 1-based Excel row number (1 = header, 2 = row[0])
 */
function getCellValue(grid: SheetGridData, col: number, row: number): string {
  if (row === 1) {
    return grid.headers[col] ?? '';
  }
  const dataRowIdx = row - 2;
  if (dataRowIdx >= 0 && dataRowIdx < grid.rows.length) {
    return grid.rows[dataRowIdx]?.[col] ?? '';
  }
  return '';
}

/**
 * Parses a cell range like "A2:B5" and returns an array of evaluated string values
 */
export function getRangeValues(grid: SheetGridData, rangeRef: string): string[] {
  const parts = rangeRef.split(':').map((s) => s.trim());
  if (parts.length === 1) {
    const parsed = parseCellReference(parts[0]);
    if (!parsed) return [];
    return [getCellValue(grid, parsed.col, parsed.row)];
  }

  if (parts.length === 2) {
    const start = parseCellReference(parts[0]);
    const end = parseCellReference(parts[1]);
    if (!start || !end) return [];

    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);

    const values: string[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        values.push(getCellValue(grid, c, r));
      }
    }
    return values;
  }

  return [];
}

/**
 * Helper to extract numeric values from a raw string array
 */
function toNumbers(values: string[]): number[] {
  const numbers: number[] = [];
  for (const v of values) {
    if (v === '' || v === undefined || v === null) continue;
    // Strip currency symbols and commas e.g. "$1,234.50" -> 1234.50
    const clean = String(v).replace(/[$€£,]/g, '').trim();
    const num = parseFloat(clean);
    if (!isNaN(num)) {
      numbers.push(num);
    }
  }
  return numbers;
}

// ============================================================
// FORMULA EVALUATOR CORE
// ============================================================

/**
 * Evaluates an Excel formula string like:
 * "=SUM(A2:A10)"
 * "=AVERAGE(B2:B20) * 1.1"
 * "=IF(A2 > 50, \"Pass\", \"Fail\")"
 * "=CONCATENATE(A1, \" - \", B1)"
 */
export function evaluateFormula(
  formula: string,
  grid: SheetGridData,
  visitedCells: Set<string> = new Set()
): string {
  if (!formula.startsWith('=')) {
    return formula;
  }

  const rawExpression = formula.slice(1).trim();
  if (!rawExpression) return '';

  try {
    return String(evaluateExpression(rawExpression, grid, visitedCells));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '#ERROR!';
    return msg.startsWith('#') ? msg : '#VALUE!';
  }
}

/**
 * Recursive evaluator for math expressions, function calls, and cell references
 */
function evaluateExpression(
  expr: string,
  grid: SheetGridData,
  visited: Set<string>
): string | number | boolean {
  let expression = expr.trim();
  if (!expression) return '';

  // 1. Check for standard Function Calls: FUNCTION_NAME(args...)
  const funcMatch = expression.match(/^([A-Z_]+)\s*\((.*)\)$/i);
  if (funcMatch) {
    const funcName = funcMatch[1].toUpperCase();
    const argsContent = funcMatch[2];
    const args = splitArguments(argsContent);
    return executeFunction(funcName, args, grid, visited);
  }

  // 2. String literal: "Hello World"
  if (
    (expression.startsWith('"') && expression.endsWith('"')) ||
    (expression.startsWith("'") && expression.endsWith("'"))
  ) {
    return expression.slice(1, -1);
  }

  // 3. Single Cell Reference: A1, $B$4
  const cellRef = parseCellReference(expression);
  if (cellRef) {
    const key = `${cellRef.col},${cellRef.row}`;
    if (visited.has(key)) {
      throw new Error('#REF! (Cycle)');
    }
    const cellVal = getCellValue(grid, cellRef.col, cellRef.row);
    if (cellVal.startsWith('=')) {
      const nextVisited = new Set(visited).add(key);
      return evaluateFormula(cellVal, grid, nextVisited);
    }
    const cleanNum = cellVal.replace(/[$€£,]/g, '').trim();
    const asNum = parseFloat(cleanNum);
    return !isNaN(asNum) && String(asNum) === cleanNum ? asNum : cellVal;
  }

  // 4. Comparison Operators (<, >, <=, >=, ==, !=, =)
  const compMatch = expression.match(/^(.+?)\s*(<=|>=|!=|==|=|<|>)\s*(.+)$/);
  if (compMatch) {
    const left = evaluateExpression(compMatch[1], grid, visited);
    const op = compMatch[2];
    const right = evaluateExpression(compMatch[3], grid, visited);

    const leftNum = typeof left === 'number' ? left : parseFloat(String(left));
    const rightNum = typeof right === 'number' ? right : parseFloat(String(right));
    const isBothNum = !isNaN(leftNum) && !isNaN(rightNum);

    const v1 = isBothNum ? leftNum : String(left);
    const v2 = isBothNum ? rightNum : String(right);

    switch (op) {
      case '=':
      case '==':
        return v1 === v2;
      case '!=':
        return v1 !== v2;
      case '<':
        return v1 < v2;
      case '<=':
        return v1 <= v2;
      case '>':
        return v1 > v2;
      case '>=':
        return v1 >= v2;
    }
  }

  // 5. Binary Arithmetic Operations (+, -, *, /, ^)
  // Process with operator precedence (+, - outside; *, / inside)
  const tokens = tokenizeMath(expression);
  if (tokens.length > 1) {
    return evaluateTokens(tokens, grid, visited);
  }

  // 6. Direct Number
  const num = parseFloat(expression);
  if (!isNaN(num)) return num;

  return expression;
}

/**
 * Splits top-level comma-separated arguments, respecting nested parentheses and quotes
 */
function splitArguments(argsStr: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let inQuote = false;
  let quoteChar = '';
  let current = '';

  for (let i = 0; i < argsStr.length; i++) {
    const ch = argsStr[i];
    if ((ch === '"' || ch === "'") && (i === 0 || argsStr[i - 1] !== '\\')) {
      if (!inQuote) {
        inQuote = true;
        quoteChar = ch;
      } else if (quoteChar === ch) {
        inQuote = false;
      }
    }

    if (!inQuote) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ',' && depth === 0) {
        args.push(current.trim());
        current = '';
        continue;
      }
    }
    current += ch;
  }

  if (current.trim().length > 0) {
    args.push(current.trim());
  }

  return args;
}

/**
 * Executes a built-in standard spreadsheet function
 */
function executeFunction(
  name: string,
  args: string[],
  grid: SheetGridData,
  visited: Set<string>
): string | number | boolean {
  // Flatten any range arguments (e.g. A1:B10) into string arrays
  const expandArgValues = (arg: string): string[] => {
    if (arg.includes(':')) {
      return getRangeValues(grid, arg);
    }
    return [String(evaluateExpression(arg, grid, visited))];
  };

  switch (name) {
    // ── Math & Statistics ──
    case 'SUM': {
      const allVals = args.flatMap(expandArgValues);
      const nums = toNumbers(allVals);
      return nums.reduce((acc, curr) => acc + curr, 0);
    }

    case 'AVERAGE':
    case 'AVG': {
      const allVals = args.flatMap(expandArgValues);
      const nums = toNumbers(allVals);
      if (nums.length === 0) return '#DIV/0!';
      const sum = nums.reduce((acc, curr) => acc + curr, 0);
      return Math.round((sum / nums.length) * 10000) / 10000;
    }

    case 'COUNT': {
      const allVals = args.flatMap(expandArgValues);
      return toNumbers(allVals).length;
    }

    case 'COUNTA': {
      const allVals = args.flatMap(expandArgValues);
      return allVals.filter((v) => v !== '' && v !== undefined && v !== null).length;
    }

    case 'MAX': {
      const allVals = args.flatMap(expandArgValues);
      const nums = toNumbers(allVals);
      if (nums.length === 0) return 0;
      return Math.max(...nums);
    }

    case 'MIN': {
      const allVals = args.flatMap(expandArgValues);
      const nums = toNumbers(allVals);
      if (nums.length === 0) return 0;
      return Math.min(...nums);
    }

    case 'ROUND': {
      const val = parseFloat(String(evaluateExpression(args[0], grid, visited)));
      const decimals = args[1] ? parseInt(String(evaluateExpression(args[1], grid, visited)), 10) : 0;
      if (isNaN(val)) return '#VALUE!';
      const factor = Math.pow(10, decimals);
      return Math.round(val * factor) / factor;
    }

    case 'ABS': {
      const val = parseFloat(String(evaluateExpression(args[0], grid, visited)));
      return isNaN(val) ? '#VALUE!' : Math.abs(val);
    }

    case 'SQRT': {
      const val = parseFloat(String(evaluateExpression(args[0], grid, visited)));
      if (isNaN(val) || val < 0) return '#NUM!';
      return Math.sqrt(val);
    }

    // ── Logic ──
    case 'IF': {
      if (args.length < 2) return '#N/A';
      const condition = evaluateExpression(args[0], grid, visited);
      const isTruthy = condition === true || condition === 'true' || (typeof condition === 'number' && condition !== 0);
      if (isTruthy) {
        return evaluateExpression(args[1], grid, visited);
      }
      return args[2] !== undefined ? evaluateExpression(args[2], grid, visited) : false;
    }

    case 'AND': {
      for (const a of args) {
        const res = evaluateExpression(a, grid, visited);
        if (!res || res === 'false' || res === 0) return false;
      }
      return true;
    }

    case 'OR': {
      for (const a of args) {
        const res = evaluateExpression(a, grid, visited);
        if (res && res !== 'false' && res !== 0) return true;
      }
      return false;
    }

    case 'NOT': {
      const res = evaluateExpression(args[0], grid, visited);
      return !res || res === 'false' || res === 0;
    }

    // ── Lookup & References ──
    case 'VLOOKUP': {
      // VLOOKUP(lookupValue, tableRange, colIndex, [rangeLookup])
      if (args.length < 3) return '#N/A';
      const lookupVal = String(evaluateExpression(args[0], grid, visited)).trim().toLowerCase();
      const rangeParts = args[1].split(':').map((s) => s.trim());
      const colIdxParam = parseInt(String(evaluateExpression(args[2], grid, visited)), 10);
      const exactMatch = args[3] ? String(evaluateExpression(args[3], grid, visited)).toLowerCase() !== 'true' : true;

      if (rangeParts.length !== 2 || isNaN(colIdxParam) || colIdxParam < 1) return '#VALUE!';

      const start = parseCellReference(rangeParts[0]);
      const end = parseCellReference(rangeParts[1]);
      if (!start || !end) return '#REF!';

      const minCol = Math.min(start.col, end.col);
      const maxCol = Math.max(start.col, end.col);
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);

      const targetCol = minCol + (colIdxParam - 1);
      if (targetCol > maxCol) return '#REF!';

      for (let r = minRow; r <= maxRow; r++) {
        const firstColVal = getCellValue(grid, minCol, r).trim().toLowerCase();
        if (exactMatch ? firstColVal === lookupVal : firstColVal.includes(lookupVal)) {
          return getCellValue(grid, targetCol, r);
        }
      }
      return '#N/A';
    }

    case 'INDEX': {
      // INDEX(range, rowNum, [colNum])
      if (args.length < 2) return '#N/A';
      const rangeParts = args[0].split(':').map((s) => s.trim());
      const rowNum = parseInt(String(evaluateExpression(args[1], grid, visited)), 10);
      const colNum = args[2] ? parseInt(String(evaluateExpression(args[2], grid, visited)), 10) : 1;

      if (rangeParts.length !== 2) return '#VALUE!';
      const start = parseCellReference(rangeParts[0]);
      const end = parseCellReference(rangeParts[1]);
      if (!start || !end) return '#REF!';

      const minCol = Math.min(start.col, end.col);
      const minRow = Math.min(start.row, end.row);

      return getCellValue(grid, minCol + colNum - 1, minRow + rowNum - 1);
    }

    // ── Text Functions ──
    case 'CONCATENATE':
    case 'CONCAT': {
      return args.map((a) => String(evaluateExpression(a, grid, visited))).join('');
    }

    case 'UPPER': {
      return String(evaluateExpression(args[0], grid, visited)).toUpperCase();
    }

    case 'LOWER': {
      return String(evaluateExpression(args[0], grid, visited)).toLowerCase();
    }

    case 'TRIM': {
      return String(evaluateExpression(args[0], grid, visited)).trim();
    }

    case 'LEN': {
      return String(evaluateExpression(args[0], grid, visited)).length;
    }

    default:
      return `#NAME? (${name})`;
  }
}

// ============================================================
// TOKEN-BASED ARITHMETIC EVALUATOR
// ============================================================

function tokenizeMath(expr: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inParen = 0;

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '(') inParen++;
    if (ch === ')') inParen--;

    if (inParen === 0 && (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^')) {
      if (current.trim()) tokens.push(current.trim());
      tokens.push(ch);
      current = '';
    } else {
      current += ch;
    }
  }

  if (current.trim()) tokens.push(current.trim());
  return tokens;
}

function evaluateTokens(
  tokens: string[],
  grid: SheetGridData,
  visited: Set<string>
): number {
  // First evaluate sub-expressions
  const values: (number | string)[] = tokens.map((t) => {
    if (t === '+' || t === '-' || t === '*' || t === '/' || t === '^') return t;
    const res = evaluateExpression(t, grid, visited);
    return typeof res === 'number' ? res : typeof res === 'boolean' ? (res ? 1 : 0) : parseFloat(String(res)) || 0;
  });

  // 1. Pass: Power (^)
  for (let i = 0; i < values.length; i++) {
    if (values[i] === '^') {
      const left = Number(values[i - 1]);
      const right = Number(values[i + 1]);
      values.splice(i - 1, 3, Math.pow(left, right));
      i -= 2;
    }
  }

  // 2. Pass: Multiply & Divide (*, /)
  for (let i = 0; i < values.length; i++) {
    if (values[i] === '*' || values[i] === '/') {
      const op = values[i];
      const left = Number(values[i - 1]);
      const right = Number(values[i + 1]);
      const result = op === '*' ? left * right : right === 0 ? 0 : left / right;
      values.splice(i - 1, 3, result);
      i -= 2;
    }
  }

  // 3. Pass: Add & Subtract (+, -)
  let result = Number(values[0]) || 0;
  for (let i = 1; i < values.length; i += 2) {
    const op = values[i];
    const right = Number(values[i + 1]) || 0;
    if (op === '+') result += right;
    else if (op === '-') result -= right;
  }

  return Math.round(result * 10000) / 10000;
}
