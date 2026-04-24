// Pure helper: group a flat list of revenue postings into coarse
// "revenue types" so the Receita expansion inside the Mês tab can show a
// grouped-by-type list (a flat repetition of the full revenue list would
// defeat the purpose of an expansion — the full list already lives on its
// own tab in Transações).
//
// Shape of input (see backend/app/routes/revenues.py):
//   [{ date: 'YYYY-MM-DD', description: string, amount: number }, ...]
//
// Shape of output:
//   [{ type: string, total: number, count: number, items: Revenue[] }, ...]
//
// Sorted by `total` desc. Deterministic, no locale dependence beyond a
// lowercase fold — safe to use in tests without a DOM.
//
// The grouping is heuristic because bank statements vary wildly: the same
// salary may arrive as "Pagamento Empresa XYZ" one month and
// "Pgto Salario Empresa XYZ 2026-04-05" the next. The normalization below
// removes the most common noise (dates, "#12345" refs, split markers,
// stopwords) and then keeps the first two significant tokens to build a
// label. If the heuristic mis-groups, the worst case is two near-siblings
// showing up as separate rows — the user can still see the underlying
// transactions in the Transações tab.

// Stopwords dropped when they appear at the BEGINNING of a description.
// Targets the most common Portuguese prefixes for income postings.
const LEADING_STOPWORDS = new Set([
  'pagamento',
  'recebimento',
  'credito',
  'crédito',
  'de',
  'do',
  'da',
  'em',
  'para',
]);

// Remove a few typical trailing noise patterns from a description. Applied
// one after the other so "Salario 2026-04-05 #12" normalizes cleanly.
const TRAILING_NOISE_PATTERNS = [
  /\s+\d{4}-\d{2}-\d{2}$/u,          // ISO date suffix: "... 2026-04-05"
  /\s+\([^)]*\)$/u,                  // trailing parens: "... (corr. 29-30/03)"
  /\s+#\s*\d+$/u,                    // reference marker: "... #12"
  /\s+\d+\s*\/\s*\d+$/u,             // split marker: "... 1/3" or "... 01/03"
];

function stripTrailingNoise(s) {
  let out = s;
  // Iterate until nothing changes — a posting might carry multiple noise
  // markers at once ("Salario 2026-04-05 #12").
  let prev;
  do {
    prev = out;
    for (const re of TRAILING_NOISE_PATTERNS) {
      out = out.replace(re, '');
    }
  } while (out !== prev);
  return out.trim();
}

function titleCase(s) {
  if (!s) return s;
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Derive a deterministic "type" label from a revenue description.
 * Exported for testing — production code should use `groupReceitas`.
 *
 * @param {string} description
 * @returns {string} the normalized label (Title Case, up to 2 tokens)
 */
export function deriveType(description) {
  if (!description) return '—';

  // 1. lowercase + collapse whitespace
  let s = String(description).toLowerCase().replace(/\s+/u, ' ').trim();

  // 2. strip trailing ISO dates / parens / refs / split markers
  s = stripTrailingNoise(s);

  // 3. drop leading stopwords — repeat until the head is a significant word.
  let tokens = s.split(/\s+/u).filter(Boolean);
  while (tokens.length > 1 && LEADING_STOPWORDS.has(tokens[0])) {
    tokens = tokens.slice(1);
  }

  // 4. keep only first 2 tokens → coarse type label
  const significant = tokens.slice(0, 2).join(' ');

  if (!significant) return '—';
  return titleCase(significant);
}

/**
 * @param {Array<{date:string,description:string,amount:number}>} revenues
 * @returns {Array<{type:string,total:number,count:number,items:object[]}>}
 */
export function groupReceitas(revenues) {
  if (!Array.isArray(revenues) || revenues.length === 0) return [];

  const buckets = new Map();
  for (const rev of revenues) {
    const type = deriveType(rev?.description);
    const amount = Number(rev?.amount) || 0;
    const existing = buckets.get(type);
    if (existing) {
      existing.total += amount;
      existing.count += 1;
      existing.items.push(rev);
    } else {
      buckets.set(type, {
        type,
        total: amount,
        count: 1,
        items: [rev],
      });
    }
  }

  return Array.from(buckets.values()).sort((a, b) => b.total - a.total);
}

export default groupReceitas;
