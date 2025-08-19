# FPL Expected Points - Advanced Prediction System

A comprehensive Fantasy Premier League (FPL) expected points prediction system with a Node.js/TypeScript backend API and React Native mobile client.

## 🚀 Features

### Backend API
- **Advanced Feature Engineering**: Rolling statistics, form trends, consistency metrics
- **Intelligent Caching**: Multi-level caching with configurable TTLs
- **Batch Processing**: Efficient batch predictions for multiple players
- **Confidence Intervals**: Dynamic confidence ranges based on player reliability
- **FPL API Integration**: Direct integration with official FPL endpoints

### React Native Client
- **Real-time Predictions**: Live expected points for next 3 gameweeks
- **Advanced Filtering**: Position, team, and search-based filtering
- **Smart Sorting**: Multiple sort options with visual indicators
- **Offline Caching**: AsyncStorage-based caching with TTL
- **Pull-to-Refresh**: Easy data refresh with visual feedback

## 🏗️ Architecture

```
├── backend/                 # Node.js/TypeScript API server
│   ├── src/
│   │   ├── services/       # Business logic services
│   │   ├── routes/         # API endpoint definitions
│   │   ├── utils/          # Utility functions
│   │   └── config/         # Configuration management
│   └── package.json
├── FantasyPremierLeague/   # React Native mobile app
│   ├── src/
│   │   ├── services/       # API client services
│   │   ├── hooks/          # Custom React hooks
│   │   ├── components/     # Reusable UI components
│   │   └── screens/        # App screens
│   └── package.json
└── README.md
```

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Caching**: node-cache (in-memory)
- **HTTP Client**: Axios
- **Security**: Helmet, CORS

### Frontend
- **Framework**: React Native
- **Language**: TypeScript
- **State Management**: React Hooks
- **Storage**: AsyncStorage
- **UI**: Custom components with StyleSheet

## 📊 Prediction Model

### Feature Engineering
- **Rolling Windows**: 3, 5, 8, 15 matches using shift(1) to avoid data leakage
- **Form Trends**: Recent vs medium-term performance analysis
- **Consistency Metrics**: Inverse standard deviation for reliability
- **Minutes Reliability**: Playing time and starts percentage
- **ICT Index**: Influence, Creativity, Threat metrics

### Prediction Algorithm
- **Weighted Rolling Averages**: Recent performance weighted higher
- **Context Multipliers**: Home/away, opponent difficulty, position
- **Reliability Adjustments**: Minutes and consistency factors
- **Availability Scaling**: Chance of playing adjustments
- **Confidence Calculation**: Dynamic ranges based on data quality

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
npm run dev
```

The API will be available at `http://localhost:3001`

### 2. React Native Setup

```bash
cd FantasyPremierLeague
npm install
npm start
```

### 3. Environment Configuration

Create `.env` file in backend directory:
```env
PORT=3001
HOST=localhost
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

## 📱 API Endpoints

### Core Endpoints
- `GET /api/players/:playerId/expected-points?horizon=3` - Single player prediction
- `POST /api/expected-points/batch` - Batch predictions for multiple players
- `GET /health` - Health check
- `GET /api/expected-points/cache/stats` - Cache statistics
- `POST /api/expected-points/cache/clear` - Clear prediction cache

### Example Usage

#### Single Player Prediction
```bash
curl "http://localhost:3001/api/players/430/expected-points?horizon=3"
```

#### Batch Prediction
```bash
curl -X POST "http://localhost:3001/api/expected-points/batch" \
  -H "Content-Type: application/json" \
  -d '{"playerIds": [430, 123, 456], "horizon": 3}'
```

## 🎯 Expected Results

### Prediction Ranges
- **Elite Attackers**: 25-35 XP for 3GW (Haaland, Salah)
- **Good Players**: 15-22 XP for 3GW
- **Starting GKs**: 12-16 XP per GW (only 1 per team)
- **Backup Players**: Near 0 XP (proper selection gating)

### Confidence Levels
- **High**: ±1.5 points (consistent, reliable players)
- **Medium**: ±2.0 points (moderate reliability)
- **Low**: ±2.5+ points (inconsistent, low minutes)

## 🔧 Configuration

### Backend Configuration
```typescript
// config/index.ts
export const config = {
  fpl: {
    baseUrl: 'https://fantasy.premierleague.com/api',
    timeouts: { request: 10000, elementSummary: 5000 }
  },
  cache: {
    ttl: {
      bootstrap: 15 * 60 * 1000,      // 15 minutes
      fixtures: 15 * 60 * 1000,       // 15 minutes
      elementSummary: 5 * 60 * 1000,  // 5 minutes
      predictions: 60 * 60 * 1000      // 1 hour
    }
  },
  features: {
    rollingWindows: [3, 5, 8, 15],
    homeMultiplier: 1.12,
    awayMultiplier: 0.93
  }
};
```

### React Native Configuration
```typescript
// services/expectedPointsApi.ts
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3001' 
  : 'https://your-production-api.com';
```

## 📈 Performance

### Backend Performance
- **Response Time**: <2 seconds for batch predictions
- **Concurrency**: 5 concurrent FPL API calls
- **Cache Hit Rate**: 80%+ for repeated requests
- **Memory Usage**: Configurable cache limits

### React Native Performance
- **Offline Support**: Full offline functionality with cached data
- **Smooth Scrolling**: Optimized FlatList with proper key extraction
- **Memory Management**: Automatic cache cleanup and TTL enforcement

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test
```

### TypeScript Compilation
```bash
cd backend
npx tsc --noEmit
```

### React Native Testing
```bash
cd FantasyPremierLeague
npm test
```

## 🚀 Deployment

### Backend Deployment
1. Set `NODE_ENV=production`
2. Configure CORS origin for your domain
3. Set appropriate cache TTLs
4. Consider Redis for distributed caching
5. Monitor memory usage and cache hit rates

### React Native Deployment
1. Update API base URL for production
2. Configure iOS/Android bundle settings
3. Test offline functionality
4. Validate cache behavior

## 🔍 Monitoring & Debugging

### Backend Monitoring
- **Health Checks**: `/health` endpoint
- **Cache Statistics**: `/api/expected-points/cache/stats`
- **Request Logging**: Automatic request/response logging
- **Error Tracking**: Comprehensive error handling and logging

### React Native Debugging
- **API Connectivity**: Real-time connection status
- **Cache Status**: Visual indicators for cache hits/misses
- **Error Handling**: User-friendly error messages with retry options
- **Performance Metrics**: Loading states and response times

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the existing issues
2. Create a new issue with detailed information
3. Include error logs and reproduction steps

## 🔮 Future Enhancements

- **Machine Learning Integration**: Python microservice for advanced ML models
- **Real-time Updates**: WebSocket support for live data
- **Advanced Analytics**: Player comparison and trend analysis
- **Team Optimization**: FPL team selection recommendations
- **Historical Analysis**: Season-long performance tracking

---

**Built with ❤️ for the FPL community**
