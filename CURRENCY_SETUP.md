# Currency Conversion Setup Guide

## Database Setup

### 1. Create Exchange Rates Table

Run this SQL command in your Supabase database:

```sql
CREATE TABLE exchange_rates (
  target_currency TEXT PRIMARY KEY,
  rate NUMERIC NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Set up Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Allow read access for all users (since exchange rates are public data)
CREATE POLICY "Allow read access to exchange rates" ON exchange_rates
FOR SELECT USING (true);

-- Allow insert/update for authenticated users only (for the application to update rates)
CREATE POLICY "Allow authenticated users to modify exchange rates" ON exchange_rates
FOR ALL USING (auth.role() = 'authenticated');
```

## API Configuration

The system uses the Exchange Rate API with this endpoint:
```
https://v6.exchangerate-api.com/v6/7397ee4c761a45e0a6344edb/latest/NPR
```

**Base Currency:** NPR (Nepalese Rupee)
**Supported Currencies:** USD, AUD, GBP, AED

## Features

### 1. Automatic Rate Caching
- Exchange rates are cached in the database for 12 hours
- Fresh rates are fetched from the API when cache expires
- Fallback to cached rates if API is unavailable

### 2. Currency Selector
- Fixed position dropdown in the top-right corner
- Responsive design for mobile devices
- User's selection is saved in localStorage

### 3. Price Conversion
- Real-time conversion of all prices on the page
- Updates product grid, cart, and order summary
- Proper currency symbols for each currency

### 4. Supported Currency Symbols
- NPR: Rs. 
- USD: $
- AUD: A$
- GBP: £
- AED: د.إ 

## How It Works

1. **Initialization**: System loads cached rates from database
2. **Background Updates**: Fetches fresh rates from API if cache is stale
3. **Currency Change**: When user selects new currency, all prices update instantly
4. **Rate Storage**: New rates are automatically saved to database

## Error Handling

- Falls back to 1:1 conversion if API fails
- Graceful degradation if database is unavailable
- Console logging for debugging

## Testing

To test the currency conversion:

1. Change the currency selector
2. Verify prices update across:
   - Product grid
   - Product modal
   - Shopping cart
   - Order summary
3. Check that rates are being cached in the `exchange_rates` table
4. Verify localStorage saves the selected currency

## Monitoring

Check the browser console for these logs:
- "Exchange rates updated successfully" - Rates fetched and saved
- Exchange rate errors for debugging API or database issues 