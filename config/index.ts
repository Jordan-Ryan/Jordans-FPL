export const config = {
  // FPL API configuration
  fpl: {
    baseUrl: 'https://fantasy.premierleague.com/api',
    endpoints: {
      bootstrap: '/bootstrap-static/',
      fixtures: '/fixtures/',
      elementSummary: '/element-summary/'
    },
    timeouts: {
      request: 10000, // 10 seconds
      elementSummary: 5000 // 5 seconds for individual player calls
    }
  },
  
  // Cache configuration
  cache: {
    ttl: {
      bootstrap: 15 * 60 * 1000, // 15 minutes
      fixtures: 15 * 60 * 1000,  // 15 minutes
      elementSummary: 5 * 60 * 1000, // 5 minutes
      predictions: 60 * 60 * 1000 // 1 hour
    },
    maxKeys: 1000
  },
  
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || 'localhost',
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true
    }
  },
  
  // Feature engineering configuration
  features: {
    rollingWindows: [3, 5, 8, 15],
    homeMultiplier: 1.12,
    awayMultiplier: 0.93,
    opponentMultiplierRange: [0.75, 1.25],
    maxExpectedPoints: 15,
    confidenceRange: {
      default: 1.5,
      lowReliability: 2.0
    }
  },
  
  // Prediction configuration
  prediction: {
    minMinutesForReliability: 50,
    minStartsForReliability: 0.5,
    positionMultipliers: {
      GKP: 1.0,
      DEF: 1.05,
      MID: 1.02,
      FWD: 1.08
    }
  }
};
