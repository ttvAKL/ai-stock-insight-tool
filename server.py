from flask import Flask, jsonify
from flask_cors import CORS
import yfinance as yf

app = Flask(__name__)
CORS(app)

# Interpret the financial data and return a summary in plain language
def interpret_financials(info):
    descriptions = []

    # Dividend Yield
    if info.get('dividendYield'):
        descriptions.append("pays_dividends")

    # P/E Ratio
    pe = info.get('trailingPE')
    if pe:
        if pe > 40:
            descriptions.append("high_pe")
        elif pe < 10:
            descriptions.append("low_pe")

    # Beta (Volatility)
    beta = info.get('beta')
    if beta:
        if beta > 1.2:
            descriptions.append("high_beta")
        elif beta < 0.8:
            descriptions.append("low_beta")

    # Profit Margins
    margin = info.get('profitMargins')
    if margin:
        if margin > 0.2:
            descriptions.append("high_margin")
        elif margin < 0.05:
            descriptions.append("low_margin")

    return descriptions

@app.route('/api/stock/<symbol>', methods=['GET'])
def get_stock_data(symbol):
    try:
        # Fetch stock data using yfinance
        stock = yf.Ticker(symbol)
        info = stock.info
        hist = stock.history(period="1mo")

        if hist.empty or 'regularMarketPrice' not in info:
            return jsonify({'error': f'No data found for symbol: {symbol}'}), 404

        latest_date = hist.index[-1].strftime('%Y-%m-%d')
        latest_data = hist.iloc[-1]

        summary = interpret_financials(info)

        return jsonify({
            'symbol': symbol.upper(),
            'date': latest_date,
            'open': round(float(latest_data['Open']), 2),
            'high': round(float(latest_data['High']), 2),
            'low': round(float(latest_data['Low']), 2),
            'close': round(float(latest_data['Close']), 2),
            'volume': int(latest_data['Volume']),
            'name': info.get('shortName'),
            'sector': info.get('sector'),
            'market_cap': info.get('marketCap'),
            'pe_ratio': info.get('trailingPE'),
            'beta': info.get('beta'),
            'dividend_yield': info.get('dividendYield'),
            'profit_margin': info.get('profitMargins'),
            'summary': summary
        })

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': f'Error fetching data for {symbol}'}), 500

if __name__ == '__main__':
    app.run(port=3000)