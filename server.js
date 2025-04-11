const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

app.use(express.static('client')); // Serve the static HTML file

app.get('/api/stock/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  const AlphaVantageApi = 'https://www.alphavantage.co/query';
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${AlphaVantageApi}`;
  
  try {
    const response = await axios.get(url);
    const data = response.data;
    
    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) {
      return res.status(404).json({ error: `No data found for symbol: ${symbol}` });
    }

    const sortedDates = Object.keys(timeSeries).sort((a, b) => new Date(b) - new Date(a));
    const latestDate = sortedDates[0];
    const latestData = timeSeries[latestDate];

    res.json({
      symbol: symbol,
      date: latestDate,
      open: latestData['1. open'],
      high: latestData['2. high'],
      low: latestData['3. low'],
      close: latestData['4. close'],
      volume: latestData['5. volume'],
    });
  } catch (error) {
    console.error(error);
    res.json({ error: 'Error fetching data for ' + symbol });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
