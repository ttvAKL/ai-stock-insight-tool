const express = require('express');
const axios = require('axios'); // axios for calling APIs (not yfinance since it's Python)
const url = `http://127.0.0.1:5000/api/stock/${symbol}`;
const response = await axios.get(url);


const app = express();
const PORT = 3000;

app.use(express.static('frontend')); // Serve static HTML

app.get('/api/stock/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  const url = `http://127.0.0.1:5000/api/stock/${symbol}`;  // This should call your Flask API

  try {
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching stock data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});