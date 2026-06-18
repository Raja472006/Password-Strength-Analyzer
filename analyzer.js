const crypto = require('crypto');

const commonPasswords = new Set([
  '123456', 'password', '12345678', 'qwerty', 'abc123', 'letmein', 'admin', 'welcome', 'iloveyou'
]);

function hasUpper(s) { return /[A-Z]/.test(s); }
function hasLower(s) { return /[a-z]/.test(s); }
function hasNumber(s) { return /[0-9]/.test(s); }
function hasSpecial(s) { return /[^A-Za-z0-9]/.test(s); }

function detectRepeat(s) {
  const counts = {};
  for (const ch of s) counts[ch] = (counts[ch] || 0) + 1;
  const max = Math.max(...Object.values(counts));
  return { repeated: max > s.length * 0.6, mostRepeated: max };
}

function detectSequence(s) {
  const seqs = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  const lower = s.toLowerCase();
  for (const seq of seqs) {
    for (let i = 0; i < seq.length - 3; i++) {
      const sub = seq.slice(i, i + 4);
      if (lower.includes(sub)) return true;
    }
  }
  return false;
}

function estimateEntropy(password) {
  let charset = 0;
  if (hasLower(password)) charset += 26;
  if (hasUpper(password)) charset += 26;
  if (hasNumber(password)) charset += 10;
  if (hasSpecial(password)) charset += 32;
  if (charset === 0) charset = 1;
  const bits = Math.log2(Math.pow(charset, password.length));
  return { bits, guesses: Math.pow(2, bits) };
}

function humanTimeForGuesses(guesses, speedPerSec = 1e9) {
  const seconds = guesses / speedPerSec;
  const years = seconds / (3600 * 24 * 365);
  if (years < 1 / (3600 * 24)) return `${Math.round(seconds)}s`;
  if (years < 1) return `${(seconds / 3600).toFixed(1)}h`;
  if (years < 24) return `${(seconds / 3600 / 24).toFixed(1)}d`;
  if (years < 365) return `${(seconds / 3600 / 24 / 365).toFixed(1)}y`;
  return `${years.toFixed(1)} years`;
}

function scorePassword(pw) {
  let score = 0;
  // Length
  if (pw.length > 12) score += 25;
  else if (pw.length >= 8) score += 10;

  if (hasUpper(pw)) score += 15;
  if (hasLower(pw)) score += 15;
  if (hasNumber(pw)) score += 15;
  if (hasSpecial(pw)) score += 20;

  const seq = detectSequence(pw);
  const rep = detectRepeat(pw);
  const lower = pw.toLowerCase();
  const common = commonPasswords.has(lower) || /password|123456|qwerty|admin/.test(lower);
  if (!seq && !rep.repeated && !common) score += 10;

  if (score > 100) score = 100;
  return score;
}

function ratingFromScore(score) {
  if (score >= 85) return 'Very Strong';
  if (score >= 70) return 'Strong';
  if (score >= 50) return 'Medium';
  return 'Weak';
}

function suggestVariations(pw) {
  const subs = { a: '4', e: '3', i: '1', o: '0', s: '$', t: '7' };
  const leet = pw.split('').map(ch => (subs[ch.toLowerCase()] || ch)).join('');
  const plusSymbol = pw + '!#2026';
  const title = pw.charAt(0).toUpperCase() + pw.slice(1) + '@2026';
  return [leet, plusSymbol, title].slice(0, 3);
}

function generate(length = 16) {
  const upp = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const low = 'abcdefghijklmnopqrstuvwxyz';
  const nums = '0123456789';
  const syms = '!@#$%^&*()-_=+[]{};:,.<>?';
  const all = upp + low + nums + syms;
  const rnd = crypto.randomBytes(length);
  let pw = '';
  for (let i = 0; i < length; i++) pw += all[rnd[i] % all.length];
  // ensure at least one of each type when length >=4
  if (length >= 4) pw = upp[rnd[0] % upp.length] + low[rnd[1] % low.length] + nums[rnd[2] % nums.length] + syms[rnd[3] % syms.length] + pw.slice(4);
  return pw;
}

function analyze(password) {
  const length = password.length;
  const flags = {
    uppercase: hasUpper(password),
    lowercase: hasLower(password),
    number: hasNumber(password),
    special: hasSpecial(password)
  };
  const repeats = detectRepeat(password);
  const sequence = detectSequence(password);
  const lower = password.toLowerCase();
  const common = commonPasswords.has(lower) || /password|123456|qwerty|admin/.test(lower);

  const score = scorePassword(password);
  const rating = ratingFromScore(score);

  const entropy = estimateEntropy(password);
  const estimated_at_1e9 = humanTimeForGuesses(entropy.guesses, 1e9);

  const recommendations = [];
  if (length < 8) recommendations.push('Use at least 8 characters (12+ recommended)');
  if (!flags.uppercase) recommendations.push('Add uppercase letters');
  if (!flags.lowercase) recommendations.push('Add lowercase letters');
  if (!flags.number) recommendations.push('Include digits');
  if (!flags.special) recommendations.push('Include special characters like !@#$%');
  if (repeats.repeated) recommendations.push('Avoid long repeated characters');
  if (sequence) recommendations.push('Avoid sequential patterns like 1234 or abcd');
  if (common) recommendations.push('Avoid common passwords or predictable words');

  return {
    password: '[REDACTED]',
    length,
    flags,
    score,
    rating,
    recommendations,
    suggestions: rating === 'Weak' || rating === 'Medium' ? suggestVariations(password) : [],
    entropy_bits: Math.round(entropy.bits),
    estimated_resistance_at_1e9_guesses_per_sec: estimated_at_1e9
  };
}

module.exports = { analyze, generate };
