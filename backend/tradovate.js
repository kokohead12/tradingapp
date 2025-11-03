const https = require('https');

class TradovateAPI {
  constructor(environment = 'demo') {
    this.environment = environment;
    this.baseURL = environment === 'demo'
      ? 'demo.tradovateapi.com'
      : 'live.tradovateapi.com';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Make HTTP request helper
  makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseURL,
        port: 443,
        path: `/v1${path}`,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      const req = https.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(response);
            } else {
              reject(new Error(`API Error: ${response.errorText || body}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${body}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  // Authenticate and get access token
  async authenticate(username, password) {
    try {
      const response = await this.makeRequest('POST', '/auth/accesstokenrequest', {
        name: username,
        password: password,
        appId: 'trading-journal',
        appVersion: '1.0',
        deviceId: 'web-app',
        cid: null,
        sec: null
      });

      this.accessToken = response.accessToken;
      this.tokenExpiry = new Date(response.expirationTime);

      return {
        accessToken: response.accessToken,
        expirationTime: response.expirationTime,
        userId: response.userId
      };
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  // Check if token is valid
  isTokenValid() {
    if (!this.accessToken || !this.tokenExpiry) {
      return false;
    }
    return new Date() < new Date(this.tokenExpiry);
  }

  // Get account information
  async getAccount(token = null) {
    const authToken = token || this.accessToken;
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    try {
      const accounts = await this.makeRequest('GET', '/account/list', null, authToken);
      return accounts;
    } catch (error) {
      throw new Error(`Failed to get account: ${error.message}`);
    }
  }

  // Get fills (executions) for today
  async getFills(accountId, token = null) {
    const authToken = token || this.accessToken;
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    try {
      const fills = await this.makeRequest('GET', `/fill/list?accountId=${accountId}`, null, authToken);
      return fills;
    } catch (error) {
      throw new Error(`Failed to get fills: ${error.message}`);
    }
  }

  // Get orders for today
  async getOrders(accountId, token = null) {
    const authToken = token || this.accessToken;
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    try {
      const orders = await this.makeRequest('GET', `/order/list?accountId=${accountId}`, null, authToken);
      return orders;
    } catch (error) {
      throw new Error(`Failed to get orders: ${error.message}`);
    }
  }

  // Get positions
  async getPositions(accountId, token = null) {
    const authToken = token || this.accessToken;
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    try {
      const positions = await this.makeRequest('GET', `/position/list?accountId=${accountId}`, null, authToken);
      return positions;
    } catch (error) {
      throw new Error(`Failed to get positions: ${error.message}`);
    }
  }

  // Get contract details
  async getContract(contractId, token = null) {
    const authToken = token || this.accessToken;
    if (!authToken) {
      throw new Error('Not authenticated');
    }

    try {
      const contract = await this.makeRequest('GET', `/contract/item?id=${contractId}`, null, authToken);
      return contract;
    } catch (error) {
      throw new Error(`Failed to get contract: ${error.message}`);
    }
  }

  // Convert fills to trade format
  async convertFillsToTrades(fills, accountId, token = null) {
    const trades = [];
    const fillsByOrder = {};

    // Group fills by order ID
    for (const fill of fills) {
      if (!fillsByOrder[fill.orderId]) {
        fillsByOrder[fill.orderId] = [];
      }
      fillsByOrder[fill.orderId].push(fill);
    }

    // Process each order's fills
    for (const [orderId, orderFills] of Object.entries(fillsByOrder)) {
      try {
        // Get contract details for symbol
        const firstFill = orderFills[0];
        const contract = await this.getContract(firstFill.contractId, token);

        // Calculate average entry price and total quantity
        let totalQty = 0;
        let totalValue = 0;
        let totalFees = 0;

        for (const fill of orderFills) {
          totalQty += Math.abs(fill.qty);
          totalValue += Math.abs(fill.qty) * fill.price;
          totalFees += fill.commission || 0;
        }

        const avgPrice = totalValue / totalQty;
        const tradeType = firstFill.action === 'Buy' ? 'LONG' : 'SHORT';

        trades.push({
          external_id: `tradovate_${orderId}`,
          symbol: contract.name || `Contract_${firstFill.contractId}`,
          trade_type: tradeType,
          entry_date: new Date(firstFill.timestamp).toISOString(),
          entry_price: avgPrice,
          quantity: totalQty,
          fees: totalFees,
          status: 'OPEN', // Will need to check positions to determine if closed
          notes: `Imported from Tradovate - Order ID: ${orderId}`
        });
      } catch (error) {
        console.error(`Error processing order ${orderId}:`, error.message);
      }
    }

    return trades;
  }
}

module.exports = TradovateAPI;
