# FPL Expected Points API

Advanced expected points prediction using FPL API data and feature engineering.

## Features

- **Advanced Feature Engineering**: Rolling statistics, form trends, consistency metrics
- **Intelligent Caching**: Multi-level caching with configurable TTLs
- **Batch Processing**: Efficient batch predictions for multiple players
- **Confidence Intervals**: Dynamic confidence ranges based on player reliability
- **FPL API Integration**: Direct integration with official FPL endpoints

## API Endpoints

### Single Player Prediction
```
GET /api/players/:playerId/expected-points?horizon=3
```

### Batch Prediction
```
POST /api/expected-points/batch
Body: { "playerIds": [430, 123, 456], "horizon": 3 }
```

### Health & Cache
```
GET /health
GET /api/expected-points/cache/stats
POST /api/expected-points/cache/clear
```

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create `.env` file:
   ```env
   PORT=3001
   HOST=localhost
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000
   ```

3. **Build & Run**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## Feature Engineering

The system calculates rolling statistics using **shift(1)** to avoid data leakage:

- **Rolling Windows**: 3, 5, 8, 15 matches
- **Form Trends**: Recent vs medium-term performance
- **Consistency**: Inverse of standard deviation
- **Minutes Reliability**: Playing time and starts percentage
- **ICT Index**: Influence, Creativity, Threat metrics

## Prediction Model

Uses a parametric approximation with:

- **Weighted Rolling Averages**: Recent performance weighted higher
- **Context Multipliers**: Home/away, opponent difficulty, position
- **Reliability Adjustments**: Minutes and consistency factors
- **Availability Scaling**: Chance of playing adjustments

## Caching Strategy

- **Bootstrap Data**: 15 minutes (teams, players, events)
- **Fixtures**: 15 minutes (schedule, difficulty ratings)
- **Element Summaries**: 5 minutes (player history)
- **Predictions**: 1 hour (calculated expected points)

## Performance

- **Batch Processing**: Up to 100 players per request
- **Concurrency Control**: 5 concurrent FPL API calls
- **Memory Efficient**: Configurable cache limits
- **Response Time**: <2 seconds for batch predictions

## Error Handling

- **Graceful Degradation**: Fallback to cached data
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Respectful FPL API usage
- **Detailed Logging**: Request/response monitoring

## Development

```bash
# Run tests
npm test

# Type checking
npx tsc --noEmit

# Linting (if configured)
npm run lint
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure CORS origin for your domain
3. Set appropriate cache TTLs
4. Monitor memory usage and cache hit rates
5. Consider Redis for distributed caching

## License

MIT License - see LICENSE file for details.
