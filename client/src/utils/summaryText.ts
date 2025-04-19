const summaryMap: { [key: string]: string } = {
    pays_dividends: 'This stock pays regular dividends.',
    high_pe: 'This stock has a high price-to-earnings (P/E) ratio.',
    low_pe: 'This stock has a low price-to-earnings (P/E) ratio.',
    high_beta: 'This stock is highly volatile compared to the market.',
    low_beta: 'This stock is stable and less volatile.',
    high_margin: 'This stock has a strong profit margin.',
    low_margin: 'This stock has a low profit margin.',
}

export function getSummaryText(tag: string): string {
    return summaryMap[tag] || tag;
}