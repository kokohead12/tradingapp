const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'tradingjournal',
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL database:', err);
    return;
  }
  console.log('Connected to PostgreSQL database');
  release();
  initializeDatabase();
});

// Initialize database with schema
async function initializeDatabase() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// Helper function to get point value/multiplier for futures contracts
function getPointValue(symbol) {
  const upperSymbol = symbol.toUpperCase();

  // Nasdaq futures (NQ, MNQ)
  if (upperSymbol.includes('NQ') || upperSymbol === 'NQ' || upperSymbol === 'MNQ') {
    return 20; // $20 per point
  }

  // ES (S&P 500 futures)
  if (upperSymbol.includes('ES') || upperSymbol === 'ES' || upperSymbol === 'MES') {
    return 50; // $50 per point
  }

  // YM (Dow futures)
  if (upperSymbol.includes('YM') || upperSymbol === 'YM' || upperSymbol === 'MYM') {
    return 5; // $5 per point
  }

  // RTY (Russell 2000 futures)
  if (upperSymbol.includes('RTY') || upperSymbol === 'RTY' || upperSymbol === 'M2K') {
    return 50; // $50 per point
  }

  // Default to 1 for stocks (no multiplier)
  return 1;
}

// Calculate P&L with futures support
function calculateProfitLoss(symbol, trade_type, entry_price, exit_price, quantity, fees = 0) {
  const pointValue = getPointValue(symbol);
  const pointDifference = trade_type === 'LONG'
    ? (exit_price - entry_price)
    : (entry_price - exit_price);

  const profit_loss = (pointDifference * quantity * pointValue) - fees;

  // For percentage calculation, use the notional entry value
  const total_entry = entry_price * quantity * pointValue;
  const profit_loss_percent = (profit_loss / total_entry) * 100;

  return { profit_loss, profit_loss_percent };
}

// ==================== TRADE ROUTES ====================

// Get all trades
app.get('/api/trades', async (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM trades';
  const params = [];

  if (status) {
    query += ' WHERE status = $1';
    params.push(status);
  }

  query += ' ORDER BY entry_date DESC';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single trade
app.get('/api/trades/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM trades WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Trade not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new trade
app.post('/api/trades', async (req, res) => {
  const {
    symbol,
    trade_type,
    entry_date,
    exit_date,
    entry_price,
    exit_price,
    quantity,
    stop_loss,
    take_profit,
    fees,
    strategy,
    notes,
    screenshot_url
  } = req.body;

  // Calculate P&L - all trades are closed (futures trading)
  let profit_loss = null;
  let profit_loss_percent = null;
  const status = 'CLOSED'; // All trades are closed trades

  if (exit_price) {
    const plResult = calculateProfitLoss(symbol, trade_type, entry_price, exit_price, quantity, fees || 0);
    profit_loss = plResult.profit_loss;
    profit_loss_percent = plResult.profit_loss_percent;
  }

  const query = `
    INSERT INTO trades (
      symbol, trade_type, entry_date, exit_date, entry_price, exit_price,
      quantity, stop_loss, take_profit, profit_loss, profit_loss_percent,
      fees, status, strategy, notes, screenshot_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING id
  `;

  try {
    const result = await pool.query(query, [
      symbol, trade_type, entry_date, exit_date, entry_price, exit_price,
      quantity, stop_loss, take_profit, profit_loss, profit_loss_percent,
      fees, status, strategy, notes, screenshot_url
    ]);
    res.status(201).json({ id: result.rows[0].id, message: 'Trade created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update trade
app.put('/api/trades/:id', async (req, res) => {
  const {
    symbol,
    trade_type,
    entry_date,
    exit_date,
    entry_price,
    exit_price,
    quantity,
    stop_loss,
    take_profit,
    fees,
    strategy,
    notes,
    screenshot_url
  } = req.body;

  // Calculate P&L - all trades are closed (futures trading)
  let profit_loss = null;
  let profit_loss_percent = null;
  const status = 'CLOSED'; // All trades are closed trades

  if (exit_price) {
    const plResult = calculateProfitLoss(symbol, trade_type, entry_price, exit_price, quantity, fees || 0);
    profit_loss = plResult.profit_loss;
    profit_loss_percent = plResult.profit_loss_percent;
  }

  const query = `
    UPDATE trades SET
      symbol = $1, trade_type = $2, entry_date = $3, exit_date = $4,
      entry_price = $5, exit_price = $6, quantity = $7, stop_loss = $8,
      take_profit = $9, profit_loss = $10, profit_loss_percent = $11,
      fees = $12, status = $13, strategy = $14, notes = $15, screenshot_url = $16,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $17
  `;

  try {
    const result = await pool.query(query, [
      symbol, trade_type, entry_date, exit_date, entry_price, exit_price,
      quantity, stop_loss, take_profit, profit_loss, profit_loss_percent,
      fees, status, strategy, notes, screenshot_url, req.params.id
    ]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Trade not found' });
      return;
    }
    res.json({ message: 'Trade updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete trade
app.delete('/api/trades/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM trades WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Trade not found' });
      return;
    }
    res.json({ message: 'Trade deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== STATISTICS ROUTES ====================

// Get trading statistics
app.get('/api/stats', async (req, res) => {
  try {
    // Get overall stats
    const overallQuery = `
      SELECT
        COUNT(*) as total_trades,
        COUNT(*) as closed_trades,
        0 as open_trades,
        SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as winning_trades,
        SUM(CASE WHEN profit_loss < 0 THEN 1 ELSE 0 END) as losing_trades,
        SUM(profit_loss) as total_profit_loss,
        AVG(profit_loss) as avg_profit_loss,
        MAX(profit_loss) as best_trade,
        MIN(profit_loss) as worst_trade,
        AVG(profit_loss_percent) as avg_return_percent
      FROM trades
      WHERE profit_loss IS NOT NULL
    `;

    const overallResult = await pool.query(overallQuery);
    const row = overallResult.rows[0];

    const winRate = row.total_trades > 0
      ? (row.winning_trades / row.total_trades) * 100
      : 0;

    const stats = {
      overall: {
        ...row,
        win_rate: winRate.toFixed(2)
      }
    };

    // Get stats by symbol
    const symbolQuery = `
      SELECT
        symbol,
        COUNT(*) as trades_count,
        SUM(profit_loss) as total_pl,
        AVG(profit_loss) as avg_pl,
        SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as wins,
        COUNT(*) as total
      FROM trades
      WHERE profit_loss IS NOT NULL
      GROUP BY symbol
      ORDER BY total_pl DESC
    `;

    const symbolResult = await pool.query(symbolQuery);
    stats.by_symbol = symbolResult.rows.map(row => ({
      ...row,
      win_rate: ((row.wins / row.total) * 100).toFixed(2)
    }));

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get monthly performance
app.get('/api/stats/monthly', async (req, res) => {
  const query = `
    SELECT
      TO_CHAR(entry_date, 'YYYY-MM') as month,
      COUNT(*) as trades_count,
      SUM(profit_loss) as total_pl,
      SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as wins,
      COUNT(*) as total
    FROM trades
    WHERE profit_loss IS NOT NULL
    GROUP BY TO_CHAR(entry_date, 'YYYY-MM')
    ORDER BY month DESC
  `;

  try {
    const result = await pool.query(query);
    const formatted = result.rows.map(row => ({
      ...row,
      win_rate: ((row.wins / row.total) * 100).toFixed(2)
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ADVANCED ANALYTICS ROUTES ====================

// Get daily P&L for calendar heatmap
app.get('/api/analytics/daily', async (req, res) => {
  const query = `
    SELECT
      entry_date::date as date,
      COUNT(*) as trades_count,
      SUM(profit_loss) as daily_pl,
      SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN profit_loss < 0 THEN 1 ELSE 0 END) as losses
    FROM trades
    WHERE profit_loss IS NOT NULL
    GROUP BY entry_date::date
    ORDER BY date DESC
  `;

  try {
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get equity curve data
app.get('/api/analytics/equity-curve', async (req, res) => {
  const query = `
    SELECT
      entry_date::date as date,
      entry_date,
      symbol,
      profit_loss
    FROM trades
    WHERE profit_loss IS NOT NULL
    ORDER BY entry_date ASC
  `;

  try {
    const result = await pool.query(query);

    // Calculate cumulative P&L
    let cumulative = 0;
    const equityCurve = result.rows.map(row => {
      cumulative += parseFloat(row.profit_loss);
      return {
        date: row.date,
        cumulative_pl: cumulative,
        trade_pl: parseFloat(row.profit_loss),
        symbol: row.symbol
      };
    });

    res.json(equityCurve);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get time-based analysis
app.get('/api/analytics/time', async (req, res) => {
  try {
    // Hour of day analysis
    const hourQuery = `
      SELECT
        EXTRACT(HOUR FROM entry_date)::integer as hour,
        COUNT(*) as trades_count,
        SUM(profit_loss) as total_pl,
        AVG(profit_loss) as avg_pl,
        SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as wins,
        COUNT(*) as total
      FROM trades
      WHERE profit_loss IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM entry_date)
      ORDER BY hour ASC
    `;

    // Day of week analysis
    const dayQuery = `
      SELECT
        EXTRACT(DOW FROM entry_date)::integer as day_of_week,
        COUNT(*) as trades_count,
        SUM(profit_loss) as total_pl,
        AVG(profit_loss) as avg_pl,
        SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as wins,
        COUNT(*) as total
      FROM trades
      WHERE profit_loss IS NOT NULL
      GROUP BY EXTRACT(DOW FROM entry_date)
      ORDER BY day_of_week ASC
    `;

    const hourResult = await pool.query(hourQuery);
    const dayResult = await pool.query(dayQuery);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const formattedHourData = hourResult.rows.map(row => ({
      ...row,
      hour_label: `${row.hour}:00`,
      win_rate: ((row.wins / row.total) * 100).toFixed(2)
    }));

    const formattedDayData = dayResult.rows.map(row => ({
      ...row,
      day_name: dayNames[row.day_of_week],
      win_rate: ((row.wins / row.total) * 100).toFixed(2)
    }));

    res.json({
      by_hour: formattedHourData,
      by_day: formattedDayData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get strategy/setup performance
app.get('/api/analytics/strategies', async (req, res) => {
  const query = `
    SELECT
      COALESCE(strategy, 'No Strategy') as strategy,
      COUNT(*) as trades_count,
      SUM(profit_loss) as total_pl,
      AVG(profit_loss) as avg_pl,
      SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN profit_loss < 0 THEN 1 ELSE 0 END) as losses,
      COUNT(*) as total,
      MAX(profit_loss) as best_trade,
      MIN(profit_loss) as worst_trade
    FROM trades
    WHERE profit_loss IS NOT NULL
    GROUP BY strategy
    ORDER BY total_pl DESC
  `;

  try {
    const result = await pool.query(query);
    const formatted = result.rows.map(row => ({
      ...row,
      win_rate: ((row.wins / row.total) * 100).toFixed(2),
      avg_win: row.wins > 0 ? (row.total_pl / row.wins).toFixed(2) : 0,
      avg_loss: row.losses > 0 ? (Math.abs(row.total_pl - (row.total_pl / row.wins) * row.wins) / row.losses).toFixed(2) : 0
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get advanced metrics
app.get('/api/analytics/advanced-metrics', async (req, res) => {
  const query = `
    SELECT
      COUNT(*) as total_trades,
      SUM(CASE WHEN profit_loss > 0 THEN profit_loss ELSE 0 END) as gross_profit,
      SUM(CASE WHEN profit_loss < 0 THEN ABS(profit_loss) ELSE 0 END) as gross_loss,
      SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as winning_trades,
      SUM(CASE WHEN profit_loss < 0 THEN 1 ELSE 0 END) as losing_trades,
      SUM(CASE WHEN profit_loss > 0 THEN profit_loss ELSE 0 END) / NULLIF(SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END), 0) as avg_win,
      SUM(CASE WHEN profit_loss < 0 THEN ABS(profit_loss) ELSE 0 END) / NULLIF(SUM(CASE WHEN profit_loss < 0 THEN 1 ELSE 0 END), 0) as avg_loss,
      SUM(profit_loss) as net_profit
    FROM trades
    WHERE profit_loss IS NOT NULL
  `;

  try {
    const result = await pool.query(query);
    const row = result.rows[0];

    const winRate = row.total_trades > 0 ? (row.winning_trades / row.total_trades) : 0;
    const profitFactor = row.gross_loss > 0 ? (row.gross_profit / row.gross_loss) : 0;
    const avgRR = row.avg_loss > 0 ? (row.avg_win / row.avg_loss) : 0;
    const expectancy = (winRate * row.avg_win) - ((1 - winRate) * row.avg_loss);

    // Calculate max drawdown from equity curve
    const equityQuery = `
      SELECT profit_loss
      FROM trades
      WHERE profit_loss IS NOT NULL
      ORDER BY entry_date ASC
    `;

    const equityResult = await pool.query(equityQuery);

    let cumulative = 0;
    let peak = 0;
    let maxDrawdown = 0;

    equityResult.rows.forEach(trade => {
      cumulative += parseFloat(trade.profit_loss);
      if (cumulative > peak) {
        peak = cumulative;
      }
      const drawdown = peak - cumulative;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    res.json({
      profit_factor: profitFactor.toFixed(2),
      avg_rr_ratio: avgRR.toFixed(2),
      expectancy: expectancy.toFixed(2),
      max_drawdown: maxDrawdown.toFixed(2),
      gross_profit: parseFloat(row.gross_profit || 0).toFixed(2),
      gross_loss: parseFloat(row.gross_loss || 0).toFixed(2),
      net_profit: parseFloat(row.net_profit || 0).toFixed(2),
      win_rate: (winRate * 100).toFixed(2),
      avg_win: parseFloat(row.avg_win || 0).toFixed(2),
      avg_loss: parseFloat(row.avg_loss || 0).toFixed(2)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get hold time analysis
app.get('/api/analytics/hold-time', async (req, res) => {
  const query = `
    SELECT
      symbol,
      entry_date,
      exit_date,
      profit_loss,
      EXTRACT(EPOCH FROM (exit_date - entry_date)) / 86400 as hold_days,
      EXTRACT(EPOCH FROM (exit_date - entry_date)) / 3600 as hold_hours
    FROM trades
    WHERE exit_date IS NOT NULL
      AND profit_loss IS NOT NULL
    ORDER BY entry_date ASC
  `;

  try {
    const result = await pool.query(query);
    const rows = result.rows;

    const winners = rows.filter(t => parseFloat(t.profit_loss) > 0);
    const losers = rows.filter(t => parseFloat(t.profit_loss) < 0);

    const avgHoldWinners = winners.length > 0
      ? winners.reduce((sum, t) => sum + parseFloat(t.hold_hours), 0) / winners.length
      : 0;

    const avgHoldLosers = losers.length > 0
      ? losers.reduce((sum, t) => sum + parseFloat(t.hold_hours), 0) / losers.length
      : 0;

    const avgHoldAll = rows.length > 0
      ? rows.reduce((sum, t) => sum + parseFloat(t.hold_hours), 0) / rows.length
      : 0;

    // Group by hold time ranges
    const holdRanges = {
      '< 1 hour': rows.filter(t => parseFloat(t.hold_hours) < 1),
      '1-4 hours': rows.filter(t => parseFloat(t.hold_hours) >= 1 && parseFloat(t.hold_hours) < 4),
      '4-8 hours': rows.filter(t => parseFloat(t.hold_hours) >= 4 && parseFloat(t.hold_hours) < 8),
      '1-3 days': rows.filter(t => parseFloat(t.hold_days) >= 1 && parseFloat(t.hold_days) < 3),
      '3-7 days': rows.filter(t => parseFloat(t.hold_days) >= 3 && parseFloat(t.hold_days) < 7),
      '7+ days': rows.filter(t => parseFloat(t.hold_days) >= 7)
    };

    const rangeStats = Object.keys(holdRanges).map(range => {
      const trades = holdRanges[range];
      const wins = trades.filter(t => parseFloat(t.profit_loss) > 0).length;
      const totalPL = trades.reduce((sum, t) => sum + parseFloat(t.profit_loss), 0);

      return {
        range,
        count: trades.length,
        wins,
        losses: trades.length - wins,
        win_rate: trades.length > 0 ? ((wins / trades.length) * 100).toFixed(2) : 0,
        total_pl: totalPL.toFixed(2)
      };
    });

    res.json({
      avg_hold_winners: avgHoldWinners.toFixed(2),
      avg_hold_losers: avgHoldLosers.toFixed(2),
      avg_hold_all: avgHoldAll.toFixed(2),
      by_range: rangeStats,
      all_trades: rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== TAG ROUTES ====================

// Get all tags
app.get('/api/tags', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tags ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create tag
app.post('/api/tags', async (req, res) => {
  const { name, color } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO tags (name, color) VALUES ($1, $2) RETURNING id',
      [name, color || '#3B82F6']
    );
    res.status(201).json({ id: result.rows[0].id, message: 'Tag created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== CSV IMPORT ROUTES ====================

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// CSV Import endpoint
app.post('/api/import/csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      res.status(400).json({ error: 'CSV file is empty or invalid' });
      return;
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());

    // Required fields
    const requiredFields = ['symbol', 'type', 'entry_date', 'entry_price', 'quantity'];
    const missingFields = requiredFields.filter(f => !header.includes(f));

    if (missingFields.length > 0) {
      res.status(400).json({
        error: `Missing required columns: ${missingFields.join(', ')}`,
        hint: 'Required columns: symbol, type, entry_date, entry_price, quantity'
      });
      return;
    }

    let imported = 0;
    let skipped = 0;
    let errors = [];

    // Parse and import trades
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        const trade = {};

        // Map values to trade object
        header.forEach((col, idx) => {
          trade[col] = values[idx];
        });

        // Validate required fields
        if (!trade.symbol || !trade.type || !trade.entry_date || !trade.entry_price || !trade.quantity) {
          errors.push({ line: i + 1, error: 'Missing required field(s)' });
          continue;
        }

        // Create unique ID for duplicate detection
        const externalId = `csv_${trade.symbol}_${trade.entry_date}_${trade.entry_price}_${trade.quantity}`;

        // Check for duplicates
        const existing = await pool.query(
          'SELECT id FROM imported_trades WHERE external_id = $1',
          [externalId]
        );

        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }

        // Calculate P&L if exit data exists
        let profitLoss = null;
        let profitLossPercent = null;
        const status = 'CLOSED'; // All trades are closed

        if (trade.exit_price && parseFloat(trade.exit_price) > 0) {
          const entryPrice = parseFloat(trade.entry_price);
          const exitPrice = parseFloat(trade.exit_price);
          const quantity = parseInt(trade.quantity);
          const fees = trade.fees ? parseFloat(trade.fees) : 0;
          const tradeType = trade.type.toUpperCase();

          const plResult = calculateProfitLoss(trade.symbol, tradeType, entryPrice, exitPrice, quantity, fees);
          profitLoss = plResult.profit_loss;
          profitLossPercent = plResult.profit_loss_percent;
        }

        // Insert trade
        const tradeResult = await pool.query(
          `INSERT INTO trades (
            symbol, trade_type, entry_date, exit_date, entry_price, exit_price,
            quantity, stop_loss, take_profit, profit_loss, profit_loss_percent,
            fees, status, strategy, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING id`,
          [
            trade.symbol,
            trade.type.toUpperCase(),
            trade.entry_date,
            trade.exit_date || null,
            parseFloat(trade.entry_price),
            trade.exit_price ? parseFloat(trade.exit_price) : null,
            parseInt(trade.quantity),
            trade.stop_loss ? parseFloat(trade.stop_loss) : null,
            trade.take_profit ? parseFloat(trade.take_profit) : null,
            profitLoss,
            profitLossPercent,
            trade.fees ? parseFloat(trade.fees) : 0,
            status,
            trade.strategy || null,
            trade.notes || null
          ]
        );

        const tradeId = tradeResult.rows[0].id;

        // Track as imported
        await pool.query(
          'INSERT INTO imported_trades (external_id, source, trade_id) VALUES ($1, $2, $3)',
          [externalId, 'csv', tradeId]
        );

        imported++;
      } catch (error) {
        errors.push({ line: i + 1, error: error.message });
      }
    }

    res.json({
      success: true,
      message: 'CSV import completed',
      imported,
      skipped,
      total: lines.length - 1,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Trading Journal API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await pool.end();
    console.log('Database connection pool closed');
    process.exit(0);
  } catch (err) {
    console.error('Error closing database pool:', err);
    process.exit(1);
  }
});
