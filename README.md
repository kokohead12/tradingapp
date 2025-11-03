# Trading Journal App

A full-stack trading journal application inspired by Tradezella, built to help traders track their trades, analyze performance, and improve their trading strategy.

## Features

- **Trade Management**: Add, view, and delete trades with detailed information
- **Performance Analytics**: Track win rate, P&L, and other key metrics
- **Statistics Dashboard**: Visual charts and graphs for performance analysis
- **Symbol Analysis**: Track performance by individual symbols
- **Monthly Breakdown**: View performance trends over time
- **Open/Closed Trades**: Filter and manage both active and closed positions

## Tech Stack

### Backend
- Node.js + Express
- SQLite database
- RESTful API

### Frontend
- React 18
- Vite (build tool)
- Tailwind CSS (styling)
- React Router (navigation)
- Recharts (data visualization)

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/kokohead12/tradingapp.git
cd tradingapp
```

2. **Install Backend Dependencies**
```bash
cd backend
npm install
```

3. **Install Frontend Dependencies**
```bash
cd ../frontend
npm install
```

4. **Set up Environment Variables**
```bash
cd ../backend
cp .env.example .env
# Edit .env if needed (default PORT is 3001)
```

## Running the Application

### Development Mode

1. **Start the Backend Server**
```bash
cd backend
npm run dev
```
The API will run on `http://localhost:3001`

2. **Start the Frontend (in a new terminal)**
```bash
cd frontend
npm run dev
```
The app will run on `http://localhost:3000`

3. **Open your browser**
Navigate to `http://localhost:3000`

## Tradovate Integration

The app includes integration with Tradovate to automatically import your trades.

### Setup Instructions

1. **Navigate to Tradovate Settings**
   - Open the app and click "Tradovate" in the navigation menu

2. **Enter Your Credentials**
   - Username: Your Tradovate login username
   - Password: Your Tradovate login password
   - Environment: Select "Demo" or "Live"

3. **Test Connection**
   - Click "Test Connection" to verify your credentials work
   - You should see a success message if credentials are correct

4. **Save Settings**
   - Click "Save Settings" to store your credentials
   - Your password is encrypted and stored securely

5. **Sync Trades**
   - Click "Sync Trades from Tradovate Now" to import today's trades
   - Run this daily to keep your journal up to date

### Important Notes

- **Demo Accounts**: Use your regular username/password (free)
- **Live Accounts**: Requires API Access subscription ($25/month from Tradovate)
- **API Limitation**: Tradovate API only returns fills from the current day
- **Best Practice**: Run sync at the end of each trading day
- **Duplicate Prevention**: The system tracks imported trades and won't create duplicates

### Tradovate API Endpoints

The integration uses the following Tradovate API endpoints:
- `POST /auth/accesstokenrequest` - Authentication
- `GET /account/list` - Get account information
- `GET /fill/list` - Get trade fills/executions
- `GET /contract/item` - Get contract details for symbols

### Troubleshooting

**Connection Failed:**
- Verify your username and password are correct
- Make sure you selected the correct environment (Demo/Live)
- Check that your Tradovate account is active

**No Trades Imported:**
- The API only returns today's trades
- Make sure you have executed trades today
- Try running the sync after market close

**Duplicate Trades:**
- The system automatically prevents duplicates
- Trades are tracked by their unique Tradovate order ID

## API Endpoints

### Trades
- `GET /api/trades` - Get all trades
- `GET /api/trades/:id` - Get single trade
- `POST /api/trades` - Create new trade
- `PUT /api/trades/:id` - Update trade
- `DELETE /api/trades/:id` - Delete trade

### Statistics
- `GET /api/stats` - Get overall statistics
- `GET /api/stats/monthly` - Get monthly performance data

### Tags
- `GET /api/tags` - Get all tags
- `POST /api/tags` - Create new tag

### Tradovate Integration
- `GET /api/tradovate/settings` - Get Tradovate settings
- `POST /api/tradovate/settings` - Save Tradovate credentials
- `POST /api/tradovate/test` - Test Tradovate connection
- `POST /api/tradovate/sync` - Manually sync trades from Tradovate
- `DELETE /api/tradovate/settings` - Delete Tradovate settings

### Health Check
- `GET /api/health` - API health check

## Database Schema

The app uses SQLite with the following main tables:

- **trades**: Stores all trade information (symbol, prices, P&L, etc.)
- **tags**: Custom tags for organizing trades
- **trade_tags**: Many-to-many relationship between trades and tags
- **tradovate_settings**: Stores Tradovate API credentials and sync settings
- **imported_trades**: Tracks trades imported from external sources to prevent duplicates

## Project Structure

```
tradingapp/
├── backend/
│   ├── server.js          # Express server and API routes
│   ├── schema.sql         # Database schema
│   ├── package.json       # Backend dependencies
│   └── .env.example       # Environment variables template
├── frontend/
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── App.jsx        # Main app component
│   │   ├── main.jsx       # Entry point
│   │   └── index.css      # Global styles
│   ├── index.html         # HTML template
│   ├── vite.config.js     # Vite configuration
│   ├── tailwind.config.js # Tailwind configuration
│   └── package.json       # Frontend dependencies
└── README.md
```

## Features to Add (Future Enhancements)

- ✅ Tradovate API integration (completed)
- Automatic daily sync scheduler for Tradovate
- User authentication and multi-user support
- Image/screenshot upload for trades
- CSV import/export functionality
- Advanced filtering and search
- Trade journal notes with rich text
- Risk management calculator
- Trade alerts and notifications
- Performance comparison with benchmarks
- Mobile responsive improvements
- Dark mode
- Support for other brokers (Interactive Brokers, TD Ameritrade, etc.)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

## Author

Built with Claude Code
