const endpoints = {
  analyze: '/api/analyze',
  generate: '/api/generate'
};

async function apiPost(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return res.json();
}

function setBadgeText(el, rating) {
  const map = {
    'Very Strong': ['Very Strong', 'badge-very'],
    'Strong': ['Strong', 'badge-strong'],
    'Medium': ['Moderate', 'badge-moderate'],
    'Weak': ['Weak', 'badge-weak']
  };
  const info = map[rating] || ['No Data', ''];
  el.textContent = info[0];
  el.className = 'rating-badge ' + info[1];
}

function setMeter(score) {
  const fill = document.getElementById('meterFill');
  fill.style.width = `${score}%`;
  if (score < 50) fill.style.background = 'linear-gradient(90deg,#ef4444,#f97316)';
  else if (score < 70) fill.style.background = 'linear-gradient(90deg,#f97316,#f59e0b)';
  else if (score < 85) fill.style.background = 'linear-gradient(90deg,#60a5fa,#3b82f6)';
  else fill.style.background = 'linear-gradient(90deg,#34d399,#10b981)';
}

function yesNo(flag) { return flag ? 'Yes' : 'No'; }

function renderResult(data) {
  // Avoid displaying sensitive raw values; only show metrics
  setBadgeText(document.getElementById('ratingBadge'), data.rating);
  document.getElementById('scoreVal').textContent = data.score;
  setMeter(data.score);
  document.getElementById('len').textContent = data.length;
  document.getElementById('upper').textContent = yesNo(data.flags.uppercase);
  document.getElementById('lower').textContent = yesNo(data.flags.lowercase);
  document.getElementById('num').textContent = yesNo(data.flags.number);
  document.getElementById('spec').textContent = yesNo(data.flags.special);
  document.getElementById('entropy').textContent = data.entropy_bits;
  document.getElementById('crack').textContent = data.estimated_resistance_at_1e9_guesses_per_sec;

  const recWrap = document.getElementById('recs');
  recWrap.innerHTML = '';
  if (data.recommendations && data.recommendations.length) {
    const h = document.createElement('h3'); h.textContent = 'Recommendations';
    const ul = document.createElement('ul'); ul.className = 'rec-list';
    data.recommendations.forEach(r => { const li = document.createElement('li'); li.textContent = r; ul.appendChild(li); });
    recWrap.appendChild(h);
    recWrap.appendChild(ul);
  } else {
    const ok = document.createElement('div'); ok.textContent = 'No immediate recommendations — this password looks strong.'; ok.style.color = 'rgba(230,238,248,0.7)'; recWrap.appendChild(ok);
  }
}

async function analyzeFlow(pw) {
  const btn = document.getElementById('analyze');
  btn.disabled = true; btn.textContent = 'Analyzing...';
  try {
    const res = await apiPost(endpoints.analyze, { password: pw });
    renderResult(res);
  } catch (e) {
    alert('Analysis failed: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Analyze';
  }
}

document.getElementById('analyze').addEventListener('click', async () => {
  const pw = document.getElementById('pw').value.trim();
  if (!pw) return alert('Enter a password');
  analyzeFlow(pw);
});

document.getElementById('gen').addEventListener('click', async () => {
  const btn = document.getElementById('gen');
  btn.disabled = true; btn.textContent = 'Generating...';
  try {
    const res = await apiPost(endpoints.generate, { length: 20 });
    const pw = res.password;
    document.getElementById('pw').value = pw;
    analyzeFlow(pw);
  } catch (e) {
    alert('Generate failed: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Generate Strong';
  }
});

document.getElementById('copy').addEventListener('click', async () => {
  const pw = document.getElementById('pw').value;
  if (!pw) return alert('Nothing to copy');
  try {
    await navigator.clipboard.writeText(pw);
    const btn = document.getElementById('copy');
    btn.textContent = 'Copied';
    setTimeout(() => btn.textContent = 'Copy', 1500);
  } catch (e) {
    alert('Copy failed');
  }
});

// Initialize with a generated strong password
// No automatic password generation on load — input stays empty on refresh.

// showToast utility for inline feedback
function showToast(message, type = 'success'){
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = `toast show ${type}`;
  clearTimeout(el._timer);
  el._timer = setTimeout(()=>{ el.className = 'toast'; }, 3000);
}

// Replace alerts with showToast where appropriate
const originalAlert = window.alert;
window.alert = (msg) => showToast(msg, 'error');

// Enter key triggers analysis
document.getElementById('pw').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const pw = document.getElementById('pw').value.trim();
    if (pw) analyzeFlow(pw);
  }
});

// Toggle password visibility (eye icon)
function eyeSvg(show){
  if (show) return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 5c7 0 11 6 11 7s-4 7-11 7S1 15 1 14s4-9 11-9zm0 13a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"/></svg>';
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M2.7 1.8L1.3 3.2l3.1 3.1C3.3 7 2.1 9 1 11c1 2 2.4 4 5.3 5.6 2.6 1.4 5.6 1.7 8.4 1 1-.3 1.9-.7 2.7-1.3l3.2 3.2 1.4-1.4L2.7 1.8zm8.9 8.9a3 3 0 0 0 4.3 4.3l-4.3-4.3z"/></svg>';
}

const toggleBtn = document.getElementById('toggleVis');
toggleBtn && toggleBtn.addEventListener('click', () => {
  const pwInput = document.getElementById('pw');
  const isHidden = pwInput.type === 'password';
  pwInput.type = isHidden ? 'text' : 'password';
  toggleBtn.setAttribute('aria-pressed', String(isHidden));
  toggleBtn.title = isHidden ? 'Hide password' : 'Show password';
  const eyeIcon = document.getElementById('eyeIcon');
  if (eyeIcon) eyeIcon.outerHTML = eyeSvg(!isHidden);
});

// Improve copy handling and user feedback
document.getElementById('copy').addEventListener('click', async () => {
  const pw = document.getElementById('pw').value;
  if (!pw) return showToast('Nothing to copy', 'error');
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(pw);
    } else {
      const ta = document.createElement('textarea'); ta.value = pw; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    const btn = document.getElementById('copy');
    btn.textContent = 'Copied';
    showToast('Password copied to clipboard');
    setTimeout(() => btn.textContent = 'Copy', 1500);
  } catch (e) {
    showToast('Copy failed', 'error');
  }
});

// Use toast for errors in analyze/generate flows
async function analyzeFlow(pw) {
  const btn = document.getElementById('analyze');
  btn.disabled = true; btn.textContent = 'Analyzing...';
  try {
    const res = await apiPost(endpoints.analyze, { password: pw });
    renderResult(res);
  } catch (e) {
    showToast('Analysis failed', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Analyze';
  }
}

document.getElementById('analyze').addEventListener('click', async () => {
  const pw = document.getElementById('pw').value.trim();
  if (!pw) return showToast('Enter a password', 'error');
  analyzeFlow(pw);
});

document.getElementById('gen').addEventListener('click', async () => {
  const btn = document.getElementById('gen');
  btn.disabled = true; btn.textContent = 'Generating...';
  try {
    const res = await apiPost(endpoints.generate, { length: 20 });
    const pw = res.password;
    document.getElementById('pw').value = pw;
    analyzeFlow(pw);
    showToast('Strong password generated');
  } catch (e) {
    showToast('Generate failed', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Generate Strong';
  }
});
