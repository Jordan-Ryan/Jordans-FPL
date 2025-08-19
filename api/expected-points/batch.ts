import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PredictionService } from '../../services/predict';
import { BatchRequest } from '../../types';

const predictionService = new PredictionService();

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ 
      error: 'Method not allowed', 
      message: 'Only POST requests are allowed for this endpoint' 
    });
    return;
  }

  try {
    const { playerIds, horizon = 3 }: BatchRequest = req.body;

    // Validate request body
    if (!playerIds || !Array.isArray(playerIds)) {
      res.status(400).json({
        error: 'Invalid request body',
        message: 'playerIds must be an array of player IDs'
      });
      return;
    }

    if (playerIds.length === 0) {
      res.status(400).json({
        error: 'Empty player list',
        message: 'playerIds array cannot be empty'
      });
      return;
    }

    if (playerIds.length > 100) {
      res.status(400).json({
        error: 'Too many players',
        message: 'Maximum 100 players per batch request'
      });
      return;
    }

    if (horizon < 1 || horizon > 10) {
      res.status(400).json({
        error: 'Invalid horizon',
        message: 'Horizon must be between 1 and 10'
      });
      return;
    }

    // Validate all player IDs
    const validPlayerIds = playerIds.filter(id => 
      typeof id === 'number' && !isNaN(id) && id > 0
    );

    if (validPlayerIds.length !== playerIds.length) {
      res.status(400).json({
        error: 'Invalid player IDs',
        message: 'All player IDs must be positive integers'
      });
      return;
    }

    console.log(`Processing batch request for ${validPlayerIds.length} players (horizon: ${horizon})`);

    // Get predictions from the service
    const predictions = await predictionService.predictBatchExpectedPoints(validPlayerIds, horizon);
    
    res.json({
      success: true,
      data: predictions,
      timestamp: new Date().toISOString(),
      processed: validPlayerIds.length,
      horizon: horizon
    });

  } catch (error) {
    console.error('Error in batch expected points:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    });
  }
}
