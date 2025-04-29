const STARTER_PACKS: Record<string, string[]> = {
  'Popular': ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'META', 'GOOGL', 'PLTR', 'COIN', 'NIO'],
  'Blue Chips': ['JNJ', 'KO', 'PG', 'V', 'HD', 'MA', 'UNH', 'PFE', 'DIS', 'XOM'],
  'Growth Picks': ['TSLA', 'NVDA', 'UPST', 'SNOW', 'AFRM', 'SHOP', 'RIVN', 'PLTR', 'MARA', 'RIOT'],
  'Dividend Payers': ['T', 'O', 'MO', 'PFE', 'JNJ', 'PEP', 'KO', 'CVX', 'IBM', 'XOM'],
  'Value Stocks': ['F', 'INTC', 'WBA', 'C', 'BAC', 'GM', 'CSCO', 'TFC', 'PFG', 'VZ']
};

// Flatten all tickers into a single array (no duplicates)
export const STARTER_TICKERS: string[] = Array.from(
  new Set(Object.values(STARTER_PACKS).flat())
);

export default STARTER_PACKS;