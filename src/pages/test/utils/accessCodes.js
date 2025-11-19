const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_GROUP_SIZE = 4;
const CODE_GROUPS = 3;
const CODE_LENGTH = CODE_GROUP_SIZE * CODE_GROUPS;

export const normalizeAccessCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

export const formatAccessCodeInput = (value) => {
  const cleaned = normalizeAccessCode(String(value || "").replace(/[^A-Za-z0-9]/g, ""));
  if (!cleaned) return "";
  const limited = cleaned.slice(0, CODE_LENGTH);
  const chunks = [];
  for (let i = 0; i < limited.length; i += CODE_GROUP_SIZE) {
    chunks.push(limited.slice(i, i + CODE_GROUP_SIZE));
  }
  return chunks.filter(Boolean).join("-");
};

export const isValidAccessCodeFormat = (value) =>
  /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalizeAccessCode(value));

const hashString = (input) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const codeFromSeed = (seed) => {
  let state = hashString(seed);
  let output = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    output += ALPHABET[state % ALPHABET.length];
  }
  return formatAccessCodeInput(output);
};

export const computeRotatingCode = (seed, intervalMinutes = 30, offset = 0) => {
  if (!seed) return null;
  const intervalMs = Math.max(1, Number(intervalMinutes) || 30) * 60 * 1000;
  const idx = Math.floor(Date.now() / intervalMs) + offset;
  return codeFromSeed(`${seed}:${idx}`);
};

export const generateRandomCodes = (count) => {
  const total = Math.max(0, Math.min(500, Number(count) || 0));
  const codes = [];
  for (let i = 0; i < total; i += 1) {
    const raw = Array.from({ length: CODE_LENGTH }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join(
      ""
    );
    codes.push(formatAccessCodeInput(raw));
  }
  return codes;
};
