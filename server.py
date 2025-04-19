from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf

app = Flask(__name__)
CORS(app)

def interpret_financials(info):
    descriptions = []

    if info.get('dividendYield'):
        descriptions.append("pays_dividends")

    pe = info.get('trailingPE')
    if pe:
        if pe > 40:
            descriptions.append("high_pe")
        elif pe < 10:
            descriptions.append("low_pe")

    beta = info.get('beta')
    if beta:
        if beta > 1.2:
            descriptions.append("high_beta")
        elif beta < 0.8:
            descriptions.append("low_beta")

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
        
        range_param = request.args.get('range', '6mo')
        
        # Fetch stock data using yfinance
        stock = yf.Ticker(symbol)
        info = stock.info or {}
        
        interval_map = {
            '1d': '5m',
            '5d': '30m',
            '1mo': '1d',
            '6mo': '1d',
            '1y': '1wk',
            '5y': '1mo'
        }
        interval = interval_map.get(range_param, '1d')
        
        hist = stock.history(period=range_param, interval=interval)

        if not isinstance(info, dict) or hist is None:
            return jsonify({'error': f'Invalid data received for symbol: {symbol}'}), 500
        
        if hist.empty or 'regularMarketPrice' not in info:
            return jsonify({'error': f'No data found for symbol: {symbol}'}), 404

        latest_date = hist.index[-1].strftime('%Y-%m-%d')
        latest_data = hist.iloc[-1].to_dict()

        summary = interpret_financials(info)

        # Extract recent historical close prices
        history = [
            {"date": idx.isoformat(), "close": round(row["Close"], 2)}
            for idx, row in hist.iterrows()
        ]

        return jsonify({
            'symbol': symbol.upper(),
            'date': latest_date,
            'open': round(float(latest_data.get('Open', 0)), 2),
            'high': round(float(latest_data.get('High', 0)), 2),
            'low': round(float(latest_data.get('Low', 0)), 2),
            'close': round(float(latest_data.get('Close', 0)), 2),
            'volume': int(latest_data.get('Volume', 0)),
            'name': info.get('shortName', 'N/A'),
            'sector': info.get('sector', 'N/A'),
            'market_cap': info.get('marketCap', 0),
            'pe_ratio': info.get('trailingPE', None),
            'beta': info.get('beta', None),
            'dividend_yield': info.get('dividendYield', None),
            'profit_margin': info.get('profitMargins', None),
            'summary': summary,
            'history': history
        })

    except Exception as e:
        import traceback
        print(f"Error: {e}")
        traceback.print_exc()
        return jsonify({'error': f'Error fetching data for {symbol}'}), 500

if __name__ == '__main__':
    app.run(port=3000)