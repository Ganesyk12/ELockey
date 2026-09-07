export interface PasswordOptions {
  mode: "chars" | "passphrase";
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  avoidAmbiguous: boolean;
  wordCount: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
}

export interface PasswordStrength {
  score: number; // 0: Sangat Lemah, 1: Lemah, 2: Cukup, 3: Kuat, 4: Sangat Kuat
  entropy: number;
  label: string;
  color: string;
  percent: number;
}

export const defaultOptions: PasswordOptions = {
  mode: "chars",
  length: 18,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  avoidAmbiguous: false,
  wordCount: 4,
  separator: "-",
  capitalize: true,
  includeNumber: true,
};

// Wordlist dwi-bahasa yang ramah & mudah diingat (Diceware style)
const WORDLIST = [
  "garuda", "kopi", "roket", "langit", "pantai", "ombak", "gunung", "bintang",
  "sungai", "mentari", "lentera", "rahasia", "samudra", "cakrawala", "merdeka",
  "sahabat", "cakra", "anggrek", "komet", "satelit", "kompas", "berlian",
  "kristal", "zamrud", "safir", "mutiara", "delima", "pelangi", "pesawat",
  "kereta", "hutan", "lembah", "kelinci", "kijang", "harimau", "elang",
  "cendrawasih", "merpati", "panda", "lumba", "singa", "rubah", "merak",
  "bumi", "surya", "galaksi", "nebula", "meteor", "aurora", "badai",
  "gurun", "padang", "savana", "danau", "teluk", "selat", "taman",
  "cahaya", "bayang", "nada", "melodi", "irama", "simfoni", "puisi",
  "kisah", "fajar", "senja", "malam", "embun", "kabut", "gerimis",
  "hujan", "kilat", "guntur", "angin", "pagi", "siang", "sore",
  "musim", "bunga", "daun", "pohon", "akar", "dahan", "ranting",
  "kelopak", "benih", "buah", "apel", "mangga", "jeruk", "pisang",
  "stroberi", "melon", "kelapa", "nanas", "madu", "teh", "susu",
  "cokelat", "vanila", "kayu", "batu", "pasir", "kerikil", "emas",
  "perak", "tembaga", "perunggu", "besi", "baja", "titanium", "platina",
  "kertas", "pena", "buku", "jurnal", "lukisan", "sketsa", "kanvas",
  "peta", "kunci", "gembok", "brankas", "pintu", "jendela", "atap",
  "menara", "istana", "benteng", "jembatan", "dermaga", "pelabuhan", "stasiun",
  "pulau", "benua", "dunia", "semesta", "orbit", "kosmos", "zenit",
  "satria", "pahlawan", "pendekar", "rajawali", "macan", "badak", "komodo"
];

const CHARSETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
  ambiguous: "0O1lI",
};

/**
 * Generate cryptographically secure random integer [0, max)
 */
function secureRandomInt(max: number): number {
  if (max <= 0) return 0;
  const array = new Uint32Array(1);
  const maxUint32 = 0xffffffff;
  const limit = maxUint32 - (maxUint32 % max);
  let rand: number;
  do {
    window.crypto.getRandomValues(array);
    rand = array[0];
  } while (rand >= limit);
  return rand % max;
}

/**
 * Generate password based on options
 */
export function generatePassword(options: PasswordOptions = defaultOptions): string {
  if (options.mode === "passphrase") {
    return generatePassphrase(options);
  }
  return generateRandomChars(options);
}

function generateRandomChars(options: PasswordOptions): string {
  let availableChars = "";
  const requiredChars: string[] = [];

  let lower = CHARSETS.lowercase;
  let upper = CHARSETS.uppercase;
  let nums = CHARSETS.numbers;
  let syms = CHARSETS.symbols;

  if (options.avoidAmbiguous) {
    const ambRegex = new RegExp(`[${CHARSETS.ambiguous}]`, "g");
    lower = lower.replace(ambRegex, "");
    upper = upper.replace(ambRegex, "");
    nums = nums.replace(ambRegex, "");
    syms = syms.replace(ambRegex, "");
  }

  if (options.lowercase) {
    availableChars += lower;
    requiredChars.push(lower[secureRandomInt(lower.length)]);
  }
  if (options.uppercase) {
    availableChars += upper;
    requiredChars.push(upper[secureRandomInt(upper.length)]);
  }
  if (options.numbers) {
    availableChars += nums;
    requiredChars.push(nums[secureRandomInt(nums.length)]);
  }
  if (options.symbols) {
    availableChars += syms;
    requiredChars.push(syms[secureRandomInt(syms.length)]);
  }

  if (!availableChars) {
    availableChars = CHARSETS.lowercase + CHARSETS.numbers;
  }

  const length = Math.max(8, Math.min(64, options.length));
  const result: string[] = [...requiredChars];

  while (result.length < length) {
    result.push(availableChars[secureRandomInt(availableChars.length)]);
  }

  // Fisher-Yates Shuffle using secure random
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join("");
}

function generatePassphrase(options: PasswordOptions): string {
  const count = Math.max(3, Math.min(8, options.wordCount));
  const words: string[] = [];

  for (let i = 0; i < count; i++) {
    let word = WORDLIST[secureRandomInt(WORDLIST.length)];
    if (options.capitalize) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }
    words.push(word);
  }

  if (options.includeNumber) {
    const randomNum = secureRandomInt(90) + 10; // 10 - 99
    words[words.length - 1] = `${words[words.length - 1]}${randomNum}`;
  }

  return words.join(options.separator || "-");
}

/**
 * Calculate password entropy & strength
 */
export function calculateStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, entropy: 0, label: "Kosong", color: "#64748b", percent: 0 };
  }

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32;

  // Passphrase bonus if contains hyphens/spaces and longer length
  const isPassphrase = /[-_\s]/.test(password) && password.length >= 15;
  if (isPassphrase) {
    poolSize = Math.max(poolSize, 80);
  }

  const entropy = Math.round(password.length * (Math.log2(poolSize || 10)));

  if (entropy < 35 || password.length < 8) {
    return {
      score: 1,
      entropy,
      label: `Sangat Lemah (${entropy} bit)`,
      color: "#ef4444",
      percent: 25,
    };
  }
  if (entropy < 55 || password.length < 12) {
    return {
      score: 2,
      entropy,
      label: `Cukup (${entropy} bit)`,
      color: "#f59e0b",
      percent: 50,
    };
  }
  if (entropy < 75 || password.length < 16) {
    return {
      score: 3,
      entropy,
      label: `Kuat (${entropy} bit)`,
      color: "#10b981",
      percent: 75,
    };
  }
  return {
    score: 4,
    entropy,
    label: `Sangat Kuat (${entropy} bit)`,
    color: "#3b82f6",
    percent: 100,
  };
}
