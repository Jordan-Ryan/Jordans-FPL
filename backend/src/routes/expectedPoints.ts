import { Router, Request, Response } from 'express';
import { PredictionService } from '../services/predict';
import { BatchRequest, BatchResponse } from '../types';

const router = Router();
const predictionService = new PredictionService();

/**
 * GET /api/players/:playerId/expected-points
 * Get expected points for a single player
 */
router.get('/players/:playerId/expected-points', async (req: Request, res: Response) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const horizon = parseInt(req.query.horizon as string) || 3;

    if (isNaN(playerId) || playerId <= 0) {
      return res.status(400).json({
        error: 'Invalid player ID',
        message: 'Player ID must be a positive integer'
      });
    }

    if (horizon < 1 || horizon > 10) {
      return res.status(400).json({
        error: 'Invalid horizon',
        message: 'Horizon must be between 1 and 10'
      });
    }

    console.log(`GET /api/players/${playerId}/expected-points?horizon=${horizon}`);

    const predictions = await predictionService.predictPlayerExpectedPoints(playerId, horizon);
    
    res.json({
      success: true,
      data: predictions,
      timestamp: new Date().toISOString(),
      cache_hit: false // TODO: Implement cache hit detection
    });

  } catch (error) {
    console.error(`Error in GET /api/players/:playerId/expected-points:`, error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/expected-points/batch
 * Get expected points for multiple players in batch
 */
router.post('/expected-points/batch', async (req: Request, res: Response) => {
  try {
    const { playerIds, horizon = 3 }: BatchRequest = req.body;

    if (!playerIds || !Array.isArray(playerIds)) {
      return res.status(400).json({
        error: 'Invalid request body',
        message: 'playerIds must be an array of player IDs'
      });
    }

    if (playerIds.length === 0) {
      return res.status(400).json({
        error: 'Empty player list',
        message: 'playerIds array cannot be empty'
      });
    }

    if (playerIds.length > 100) {
      return res.status(400).json({
        error: 'Too many players',
        message: 'Maximum 100 players per batch request'
      });
    }

    if (horizon < 1 || horizon > 10) {
      return res.status(400).json({
        error: 'Invalid horizon',
        message: 'Horizon must be between 1 and 10'
      });
    }

    // Validate all player IDs
    const validPlayerIds = playerIds.filter(id => 
      typeof id === 'number' && !isNaN(id) && id > 0
    );

    if (validPlayerIds.length !== playerIds.length) {
      return res.status(400).json({
        error: 'Invalid player IDs',
        message: 'All player IDs must be positive integers'
      });
    }

    console.log(`POST /api/expected-points/batch - ${playerIds.length} players, horizon: ${horizon}`);

    const predictions = await predictionService.predictBatchExpectedPoints(validPlayerIds, horizon);
    
    const response: BatchResponse = {
      predictions,
      timestamp: new Date().toISOString(),
      cache_hit: false // TODO: Implement cache hit detection
    };

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error in POST /api/expected-points/batch:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/expected-points/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'FPL Expected Points API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET /api/expected-points/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', (req: Request, res: Response) => {
  try {
    const stats = predictionService.getCacheStats();
    
    res.json({
      success: true,
      data: {
        cache_stats: stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve cache statistics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/expected-points/cache/clear
 * Clear prediction cache
 */
router.post('/cache/clear', (req: Request, res: Response) => {
  try {
    predictionService.clearCache();
    
    res.json({
      success: true,
      message: 'Prediction cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to clear cache',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
