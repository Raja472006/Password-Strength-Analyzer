const express = require('express');
const cors = require('cors');
const path = require('path');
const analyzer = require('./analyzer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/analyze', (req, res) => {
  const { password } = req.body;
  if (typeof password !== 'string') return res.status(400).json({ error: 'password required' });
  try {
    const result = analyzer.analyze(password);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/generate', (req, res) => {
  const length = parseInt(req.body && req.body.length, 10) || 16;
  res.json({ password: analyzer.generate(Math.max(8, Math.min(64, length))) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Password Strength Analyzer running on http://localhost:${PORT}`);
});
