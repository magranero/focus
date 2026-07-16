/**
 * Detects credentials pasted in free text (AI prompt box) or present in
 * widget packages. Shared logic with the Marketplace upload validator —
 * keep this file dependency-free so it can be copied verbatim.
 */

// Order matters: more specific patterns first (dedup keeps the first match).
export const CREDENTIAL_PATTERNS = [
  { kind: 'anthropic_api_key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { kind: 'openai_api_key', re: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { kind: 'google_api_key', re: /\bAIza[0-9A-Za-z_-]{30,}\b/g },
  { kind: 'github_token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
  { kind: 'slack_token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { kind: 'stripe_key', re: /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  { kind: 'aws_access_key', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { kind: 'private_key_block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { kind: 'jwt', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/g },
  { kind: 'bearer_token', re: /\bBearer\s+[A-Za-z0-9._~+/-]{20,}=*/gi },
  { kind: 'password_assignment', re: /\b(?:password|passwd|pwd|contraseña)\s*[:=]\s*\S{6,}/gi },
  { kind: 'generic_secret_assignment', re: /\b(?:api[_-]?key|apikey|secret|token|clave)\s*[:=]\s*['"]?[A-Za-z0-9_\-./+]{16,}['"]?/gi }
];

/**
 * Scan free text. Returns [{ kind, match }] with duplicates removed.
 * Anthropic keys also match the OpenAI pattern, so more specific kinds win.
 */
export function scanText(text) {
  const found = [];
  for (const { kind, re } of CREDENTIAL_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(String(text))) !== null) {
      found.push({ kind, match: m[0] });
    }
  }
  // Prefer the most specific (longest) match when ranges overlap.
  const unique = [];
  for (const f of found.sort((a, b) => b.match.length - a.match.length)) {
    if (!unique.some((u) => u.match.includes(f.match))) unique.push(f);
  }
  return unique;
}

/** Remove detected credentials from text, replacing with a settings placeholder. */
export function redactText(text, findings) {
  let out = String(text);
  findings.forEach((f, i) => {
    out = out.split(f.match).join(`{{settings.secret_${i + 1}}}`);
  });
  return out;
}
