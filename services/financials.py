def interpret_financials(info):
    descriptions = []

    if info.get('dividendYield'):
        descriptions.append("pays_dividends")

    try:
        pe = float(info.get('PERatio', ''))
        if pe > 40:
            descriptions.append("high_pe")
        elif pe < 10:
            descriptions.append("low_pe")
    except:
        pass

    try:
        beta = float(info.get('Beta', ''))
        if beta > 1.2:
            descriptions.append("high_beta")
        elif beta < 0.8:
            descriptions.append("low_beta")
    except:
        pass

    try:
        margin = float(info.get('ProfitMargin', ''))
        if margin > 0.2:
            descriptions.append("high_margin")
        elif margin < 0.05:
            descriptions.append("low_margin")
    except:
        pass

    categories = []

    if 'pays_dividends' in descriptions:
        categories.append("Dividend Payers")
    if 'high_pe' in descriptions or 'high_beta' in descriptions:
        categories.append("Growth Picks")
    if 'low_beta' in descriptions or 'low_pe' in descriptions:
        categories.append("Value Stocks")

    return categories