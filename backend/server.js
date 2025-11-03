const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const TradovateAPI = require('./tradovate');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, 'trading.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database with schema
function initializeDatabase() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema, (err) => {
    if (err) {
      console.error('Error initializing database:', err);
    } else {
      console.log('Database initialized successfully');
    }
  });
}

// ==================== TRADE ROUTES ====================

// Get all trades
app.get('/api/trades', (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM trades';
  const params = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY entry_date DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get single trade
app.get('/api/trades/:id', (req, res) => {
  db.get('SELECT * FROM trades WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Trade not found' });
      return;
    }
    res.json(row);
  });
});

// Create new trade
app.post('/api/trades', (req, res) => {
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

  // Calculate P&L if exit price is provided
  let profit_loss = null;
  let profit_loss_percent = null;
  let status = 'OPEN';

  if (exit_price) {
    const total_entry = entry_price * quantity;
    const total_exit = exit_price * quantity;
    profit_loss = trade_type === 'LONG'
      ? (total_exit - total_entry - (fees || 0))
      : (total_entry - total_exit - (fees || 0));
    profit_loss_percent = (profit_loss / total_entry) * 100;
    status = 'CLOSED';
  }

  const query = `
    INSERT INTO trades (
      symbol, trade_type, entry_date, exit_date, entry_price, exit_price,
      quantity, stop_loss, take_profit, profit_loss, profit_loss_percent,
      fees, status, strategy, notes, screenshot_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [
      symbol, trade_type, entry_date, exit_date, entry_price, exit_price,
      quantity, stop_loss, take_profit, profit_loss, profit_loss_percent,
      fees, status, strategy, notes, screenshot_url
    ],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ id: this.lastID, message: 'Trade created successfully' });
    }
  );
});

// Update trade
app.put('/api/trades/:id', (req, res) => {
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

  // Calculate P&L if exit price is provided
  let profit_loss = null;
  let profit_loss_percent = null;
  let status = 'OPEN';

  if (exit_price) {
    const total_entry = entry_price * quantity;
    const total_exit = exit_price * quantity;
    profit_loss = trade_type === 'LONG'
      ? (total_exit - total_entry - (fees || 0))
      : (total_entry - total_exit - (fees || 0));
    profit_loss_percent = (profit_loss / total_entry) * 100;
    status = 'CLOSED';
  }

  const query = `
    UPDATE trades SET
      symbol = ?, trade_type = ?, entry_date = ?, exit_date = ?,
      entry_price = ?, exit_price = ?, quantity = ?, stop_loss = ?,
      take_profit = ?, profit_loss = ?, profit_loss_percent = ?,
      fees = ?, status = ?, strategy = ?, notes = ?, screenshot_url = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(
    query,
    [
      symbol, trade_type, entry_date, exit_date, entry_price, exit_price,
      quantity, stop_loss, take_profit, profit_loss, profit_loss_percent,
      fees, status, strategy, notes, screenshot_url, req.params.id
    ],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Trade not found' });
        return;
      }
      res.json({ message: 'Trade updated successfully' });
    }
  );
});

// Delete trade
app.delete('/api/trades/:id', (req, res) => {
  db.run('DELETE FROM trades WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Trade not found' });
      return;
    }
    res.json({ message: 'Trade deleted successfully' });
  });
});

// ==================== STATISTICS ROUTES ====================

// Get trading statistics
app.get('/api/stats', (req, res) => {
  const stats = {};

  // Get overall stats
  const overallQuery = `
    SELECT
      COUNT(*) as total_trades,
      SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed_trades,
      SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open_trades,
      SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as winning_trades,
      SUM(CASE WHEN profit_loss < 0 THEN 1 ELSE 0 END) as losing_trades,
      SUM(profit_loss) as total_profit_loss,
      AVG(profit_loss) as avg_profit_loss,
      MAX(profit_loss) as best_trade,
      MIN(profit_loss) as worst_trade,
      AVG(profit_loss_percent) as avg_return_percent
    FROM trades
    WHERE status = 'CLOSED'
  `;

  db.get(overallQuery, [], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const winRate = row.closed_trades > 0
      ? (row.winning_trades / row.closed_trades) * 100
      : 0;

    stats.overall = {
      ...row,
      win_rate: winRate.toFixed(2)
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
      WHERE status = 'CLOSED'
      GROUP BY symbol
      ORDER BY total_pl DESC
    `;

    db.all(symbolQuery, [], (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      stats.by_symbol = rows.map(row => ({
        ...row,
        win_rate: ((row.wins / row.total) * 100).toFixed(2)
      }));

      res.json(stats);
    });
  });
});

// Get monthly performance
app.get('/api/stats/monthly', (req, res) => {
  const query = `
    SELECT
      strftime('%Y-%m', entry_date) as month,
      COUNT(*) as trades_count,
      SUM(profit_loss) as total_pl,
      SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as wins,
      COUNT(*) as total
    FROM trades
    WHERE status = 'CLOSED'
    GROUP BY month
    ORDER BY month DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const result = rows.map(row => ({
      ...row,
      win_rate: ((row.wins / row.total) * 100).toFixed(2)
    }));

    res.json(result);
  });
});

// ==================== TAG ROUTES ====================

// Get all tags
app.get('/api/tags', (req, res) => {
  db.all('SELECT * FROM tags ORDER BY name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Create tag
app.post('/api/tags', (req, res) => {
  const { name, color } = req.body;

  db.run(
    'INSERT INTO tags (name, color) VALUES (?, ?)',
    [name, color || '#3B82F6'],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ id: this.lastID, message: 'Tag created successfully' });
    }
  );
});

// ==================== TRADOVATE ROUTES ====================

// Get Tradovate settings
app.get('/api/tradovate/settings', (req, res) => {
  db.get('SELECT id, username, environment, auto_sync_enabled, last_sync_date FROM tradovate_settings LIMIT 1', [], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(row || { configured: false });
  });
});

// Save Tradovate credentials
app.post('/api/tradovate/settings', (req, res) => {
  const { username, password, environment, auto_sync_enabled } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  // Check if settings exist
  db.get('SELECT id FROM tradovate_settings LIMIT 1', [], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const query = row
      ? `UPDATE tradovate_settings SET username = ?, password = ?, environment = ?, auto_sync_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      : `INSERT INTO tradovate_settings (username, password, environment, auto_sync_enabled) VALUES (?, ?, ?, ?)`;

    const params = row
      ? [username, password, environment || 'demo', auto_sync_enabled ? 1 : 0, row.id]
      : [username, password, environment || 'demo', auto_sync_enabled ? 1 : 0];

    db.run(query, params, function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Tradovate settings saved successfully' });
    });
  });
});

// Test Tradovate connection
app.post('/api/tradovate/test', async (req, res) => {
  const { username, password, environment } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  try {
    const api = new TradovateAPI(environment || 'demo');
    const authResult = await api.authenticate(username, password);

    // Get account to verify full access
    const accounts = await api.getAccount(authResult.accessToken);

    res.json({
      success: true,
      message: 'Connection successful',
      accounts: accounts.length,
      userId: authResult.userId
    });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
});

// Manual sync trades from Tradovate
app.post('/api/tradovate/sync', async (req, res) => {
  try {
    // Get stored credentials
    db.get('SELECT * FROM tradovate_settings LIMIT 1', [], async (err, settings) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (!settings) {
        res.status(400).json({ error: 'Tradovate not configured. Please add your credentials first.' });
        return;
      }

      try {
        const api = new TradovateAPI(settings.environment);

        // Authenticate
        const authResult = await api.authenticate(settings.username, settings.password);

        // Update access token in database
        db.run(
          'UPDATE tradovate_settings SET access_token = ?, token_expiry = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [authResult.accessToken, authResult.expirationTime, settings.id]
        );

        // Get accounts
        const accounts = await api.getAccount(authResult.accessToken);

        if (accounts.length === 0) {
          res.status(400).json({ error: 'No accounts found' });
          return;
        }

        const accountId = accounts[0].id;

        // Get fills
        const fills = await api.getFills(accountId, authResult.accessToken);

        if (!fills || fills.length === 0) {
          // Update last sync date even if no trades
          db.run(
            'UPDATE tradovate_settings SET last_sync_date = CURRENT_TIMESTAMP WHERE id = ?',
            [settings.id]
          );
          res.json({ message: 'No new trades to import', imported: 0, skipped: 0 });
          return;
        }

        // Convert fills to trades
        const trades = await api.convertFillsToTrades(fills, accountId, authResult.accessToken);

        let imported = 0;
        let skipped = 0;

        // Import each trade
        for (const trade of trades) {
          // Check if already imported
          const existing = await new Promise((resolve) => {
            db.get(
              'SELECT id FROM imported_trades WHERE external_id = ?',
              [trade.external_id],
              (err, row) => resolve(row)
            );
          });

          if (existing) {
            skipped++;
            continue;
          }

          // Insert trade
          const tradeId = await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO trades (symbol, trade_type, entry_date, entry_price, quantity, fees, status, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [trade.symbol, trade.trade_type, trade.entry_date, trade.entry_price, trade.quantity, trade.fees, trade.status, trade.notes],
              function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
              }
            );
          });

          // Track as imported
          await new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO imported_trades (external_id, source, trade_id) VALUES (?, ?, ?)',
              [trade.external_id, 'tradovate', tradeId],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });

          imported++;
        }

        // Update last sync date
        db.run(
          'UPDATE tradovate_settings SET last_sync_date = CURRENT_TIMESTAMP WHERE id = ?',
          [settings.id]
        );

        res.json({
          success: true,
          message: `Sync completed`,
          imported,
          skipped,
          total: trades.length
        });

      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Tradovate settings
app.delete('/api/tradovate/settings', (req, res) => {
  db.run('DELETE FROM tradovate_settings', [], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Tradovate settings deleted successfully' });
  });
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
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    }
    console.log('Database connection closed');
    process.exit(0);
  });
});
