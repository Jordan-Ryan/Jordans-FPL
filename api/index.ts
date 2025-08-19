import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.json({
    service: 'FPL Expected Points API',
    version: '1.0.0',
    description: 'Advanced expected points prediction using FPL API data and feature engineering',
    endpoints: {
      health: '/api/health',
      single_player: '/api/expected-points/players/:playerId?horizon=3',
      batch: '/api/expected-points/batch',
      cache_stats: '/api/expected-points/cache/stats',
      cache_clear: '/api/expected-points/cache/clear'
    },
    documentation: 'See README.md for detailed API documentation',
    status: 'running'
  });
}
