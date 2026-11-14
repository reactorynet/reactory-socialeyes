/**
 * Credential redaction for socialeyes macros.
 *
 * Every macro in this module echoes its `props` back inside the tool result, and
 * several accept an OAuth token as an input. A tool result is sent to the model
 * provider and persisted into the conversation, so anything echoed here becomes
 * stored credential material.
 *
 * Two complementary defences, applied in a single traversal:
 *
 *  - **key-based masking** — any property whose name looks credential-bearing is
 *    replaced wholesale with `[REDACTED]`. This is the primary defence: it does
 *    not depend on knowing the value.
 *  - **value scrubbing** — a credential the caller supplied may also be echoed
 *    back into an ordinary display field (`name`, `bio`, an error message), where
 *    key-based masking cannot see it. Every string in the payload is scanned for
 *    the known secret values and their URL-encoded forms.
 *
 * This is deliberately a shared module rather than helpers private to one file:
 * the class of bug it prevents is "the next macro copies the echo", so the fix
 * has to be reachable by every macro without duplicating it.
 */

/**
 * Placeholder substituted for any value that must not leave the macro layer.
 */
export const REDACTED_VALUE = '[REDACTED]';

/**
 * Shortest secret value worth scanning for in free text.
 *
 * This is a deliberate trade-off. Value scrubbing is a substring replace over
 * every string in a result, so a short or low-entropy needle mangles legitimate
 * data (`accessToken: 'read'` would redact the granted scopes list). Real OAuth
 * tokens are far longer than this, so a higher floor costs nothing in practice.
 *
 * Credential *fields* are still masked by key at any length — this floor only
 * governs the defence-in-depth scrub of values echoed into other strings.
 */
export const MIN_SCRUB_SECRET_LENGTH = 12;

/**
 * Property names that carry credentials.
 *
 * `tokenExpiry` is matched deliberately: the expiry of a live OAuth token is
 * token metadata, not account data, and the caller has no legitimate use for it.
 *
 * `auth` and `scope` are special-cased exactly (not by pattern) because they are
 * the provider shapes that can carry a token blob, while `scopes` — the granted
 * scope list — must stay visible and useful.
 */
const SENSITIVE_KEY_PATTERN =
  /(token|secret|password|passphrase|credential|authorization|bearer|api[-_]?key|oauth|private[-_]?key)/i;

export function isSensitiveKey(key: string): boolean {
  const normalisedKey = key.toLowerCase();
  return normalisedKey === 'auth' || normalisedKey === 'scope' || SENSITIVE_KEY_PATTERN.test(key);
}

const REGEXP_SPECIAL_CHARACTERS = '\\^$.*+?()[]{}|';

function escapeRegExp(value: string): string {
  let escaped = '';
  for (const character of value) {
    escaped += REGEXP_SPECIAL_CHARACTERS.includes(character) ? `\\${character}` : character;
  }
  return escaped;
}

/**
 * URL-encodes a secret so its encoded form can be scrubbed too. Returns null when
 * the value cannot be encoded — a lone surrogate, which a model-supplied or
 * corrupted token can legitimately contain — so the caller falls back to
 * scrubbing the raw form only instead of throwing out of an error handler.
 */
function encodeVariant(value: string): string | null {
  try {
    return encodeURIComponent(value);
  } catch {
    return null;
  }
}

/**
 * A prepared scrubber: the alternation regex is compiled once and reused for
 * every string in a payload.
 *
 * Building it per string was the previous behaviour and it is quadratic in
 * practice: a list of N accounts × ~10 string fields × 2 variants per secret
 * recompiled thousands of regexes for one tool call.
 */
export interface SecretScrubber {
  /** Replaces every known secret in `text`. Non-strings yield an empty string. */
  scrub(text: string): string;
  /** True when this scrubber has nothing to look for, so callers can skip work. */
  readonly isEmpty: boolean;
}

const PASSTHROUGH_SCRUBBER: SecretScrubber = {
  scrub: (text: string) => (typeof text === 'string' ? text : ''),
  isEmpty: true,
};

/**
 * Compiles one scrubber for a set of secret values.
 *
 * Needles are de-duplicated and sorted longest-first so a shorter secret that is
 * a substring of a longer one cannot mask it partially and leave a tail behind.
 * Matching is case-insensitive because upstream errors routinely re-case values.
 */
export function scrubberFor(secrets: Array<string | undefined>): SecretScrubber {
  const needles = new Set<string>();

  for (const secret of secrets) {
    if (typeof secret !== 'string' || secret.length < MIN_SCRUB_SECRET_LENGTH) continue;
    needles.add(secret);
    const encoded = encodeVariant(secret);
    if (encoded) needles.add(encoded);
  }

  if (needles.size === 0) return PASSTHROUGH_SCRUBBER;

  const alternation = new RegExp(
    Array.from(needles)
      .sort((left, right) => right.length - left.length)
      .map(escapeRegExp)
      .join('|'),
    'gi',
  );

  return {
    // `String.replace` with a global regex resets `lastIndex`, so one compiled
    // regex is safely reused across calls.
    scrub: (text: string) => (typeof text === 'string' ? text.replace(alternation, REDACTED_VALUE) : ''),
    isEmpty: false,
  };
}

/**
 * Single sanitising traversal: masks credential-bearing keys and scrubs secret
 * values out of strings in the same walk.
 *
 * `ancestors` holds only the objects on the *current* path, so genuine cycles
 * (including self-referencing arrays) terminate, while shared acyclic references
 * are still copied in full rather than being mistaken for a cycle.
 *
 * One pass rather than two matters for more than speed: the previous code had
 * `redactValue` and `scrubDeepValues` as near-identical traversals whose cycle,
 * `Date` and `__proto__` handling had to be kept in sync by hand.
 */
export function sanitize(value: unknown, scrubber: SecretScrubber, ancestors: WeakSet<object>): unknown {
  if (typeof value === 'string') return scrubber.scrub(value);
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (ancestors.has(value as object)) return REDACTED_VALUE;

  ancestors.add(value as object);
  try {
    if (Array.isArray(value)) return value.map((entry) => sanitize(entry, scrubber, ancestors));

    const sanitised: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      // defineProperty rather than assignment so a literal `__proto__` key becomes
      // an own enumerable property instead of rewriting the result's prototype.
      Object.defineProperty(sanitised, key, {
        value: isSensitiveKey(key) ? REDACTED_VALUE : sanitize(entry, scrubber, ancestors),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return sanitised;
  } finally {
    ancestors.delete(value as object);
  }
}

/**
 * Returns a redacted deep copy of `value`, safe to place in a tool result.
 *
 * Key-based masking only — no value scrubbing. Use this for the echoed `props`,
 * where every credential is an identifiable field; use `safePayload` when the
 * payload might carry a credential echoed into an ordinary field.
 */
export function redactSecrets<T>(value: T): T {
  return sanitize(value, PASSTHROUGH_SCRUBBER, new WeakSet<object>()) as T;
}

/**
 * Collects the credential values carried by an object so they can be scrubbed
 * out of free text (error messages, instruction strings, log lines).
 */
export function secretValuesFrom(source: unknown, depth = 0): string[] {
  // Bounded so a pathological payload cannot make the needle scan expensive; a
  // credential nested this deep is not a shape these macros produce.
  if (depth > 4 || source === null || typeof source !== 'object') return [];

  const secrets: string[] = [];
  for (const [key, entry] of Object.entries(source as Record<string, unknown>)) {
    if (typeof entry === 'string') {
      // `tokenExpiry` is masked in results but is not a secret value: scrubbing an
      // ISO timestamp out of a message would mangle unrelated diagnostics.
      if (isSensitiveKey(key) && !/expir/i.test(key)) secrets.push(entry);
    } else {
      secrets.push(...secretValuesFrom(entry, depth + 1));
    }
  }
  return secrets;
}

/**
 * Strips secret values out of free text. Upstream GraphQL/adapter errors
 * sometimes echo the credential they rejected, and those messages travel to the
 * model, the persisted conversation and the log files.
 *
 * Retained as a convenience wrapper; prefer `scrubberFor` when scrubbing more
 * than one string.
 */
export function scrubSecretValues(text: unknown, secrets: Array<string | undefined>): string {
  if (typeof text !== 'string') return '';
  return scrubberFor(secrets).scrub(text);
}

/**
 * Prepares a payload for the tool result: credential keys masked and credential
 * values (from the given sources) scrubbed out of every string, in one pass.
 */
export function safePayload<T>(value: T, ...sources: unknown[]): T {
  const scrubber = scrubberFor(sources.flatMap((source) => secretValuesFrom(source)));
  return sanitize(value, scrubber, new WeakSet<object>()) as T;
}

/**
 * Final guard for any prose a macro returns.
 *
 * Instructions are built from the already-sanitised payload, so credential *keys*
 * are gone; this additionally scrubs credential *values* from every source in
 * play in case one was echoed into a display field.
 */
export function safeInstructions(text: string, ...sources: unknown[]): string {
  return scrubberFor(sources.flatMap((source) => secretValuesFrom(source))).scrub(text);
}

/**
 * Normalises anything that can be thrown into a message string, so an error
 * handler cannot itself fail on a non-Error rejection.
 */
export function errorMessageOf(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error !== null && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return error === undefined || error === null ? 'Unknown error' : String(error);
}

/**
 * Serialises a non-Error object (or a nested Error) into a scrubbed, log-safe
 * value.
 *
 * Plain `JSON.stringify` is not enough: `Error.message` and `Error.stack` are
 * non-enumerable, so Apollo's `networkError` — which *is* an `Error` — serialised
 * to `{}` and its root cause was lost. Other diagnostics (`statusCode`, `cause`,
 * `response`, `clientErrors`) were dropped entirely when the previous code only
 * looked at `graphQLErrors` and `networkError`.
 */
function describeDetail(value: unknown, scrubber: SecretScrubber, depth: number): unknown {
  if (typeof value === 'string') return scrubber.scrub(value);
  if (value === null || typeof value === 'undefined') return value;
  if (typeof value !== 'object') return value;
  if (value instanceof Error) return describeErrorForLog(value, scrubber, depth + 1);

  let serialised: string;
  try {
    serialised = JSON.stringify(value) ?? String(value);
  } catch {
    serialised = String(value);
  }
  return scrubber.scrub(serialised);
}

/**
 * Builds a structured, scrubbed, log-safe rendering of an error.
 *
 * Name, message and stack are read explicitly (they are non-enumerable on an
 * `Error`), and every remaining enumerable property is carried through so the
 * actionable detail — an HTTP status, a transport error, a GraphQL error list —
 * survives to the log instead of collapsing to `{}`.
 */
export function describeErrorForLog(
  error: unknown,
  scrubber: SecretScrubber,
  depth = 0,
): Record<string, unknown> {
  // Bounded: a self-referencing `cause` chain must not recurse forever.
  if (depth > 3) return { note: 'nested error truncated' };

  const entry: Record<string, unknown> = {
    name: error instanceof Error ? error.name : typeof error,
    message: scrubber.scrub(errorMessageOf(error)),
  };

  if (error instanceof Error && typeof error.stack === 'string') {
    entry.stack = scrubber.scrub(error.stack);
  }

  if (error !== null && typeof error === 'object') {
    for (const [key, value] of Object.entries(error as Record<string, unknown>)) {
      if (key === 'name' || key === 'message' || key === 'stack') continue;
      entry[key] = describeDetail(value, scrubber, depth);
    }
  }

  return entry;
}

/**
 * Convenience wrapper: build a scrubber from a list of known secret values and
 * describe `error` for the log.
 *
 * Takes secret *values* (not source objects) so a catch block that already
 * computed them does not re-walk the payload.
 */
export function scrubErrorForLog(
  error: unknown,
  secrets: Array<string | undefined>,
): Record<string, unknown> {
  return describeErrorForLog(error, scrubberFor(secrets));
}
