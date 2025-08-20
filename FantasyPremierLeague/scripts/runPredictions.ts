/* eslint-disable no-console */
import { FPLPredictor2025_26, PlayerPrediction } from '../src/services/fplPredictor2025-26';

// Minimal FPL API client for Node
const fplApiService = {
  async fetchBootstrapData() {
    const resp = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (!resp.ok) throw new Error(`bootstrap-static failed: ${resp.status}`);
    return await resp.json();
  },
  async getElementSummary(playerId: number) {
    const resp = await fetch(`https://fantasy.premierleague.com/api/element-summary/${playerId}/`);
    if (!resp.ok) throw new Error(`element-summary ${playerId} failed: ${resp.status}`);
    return await resp.json();
  }
};

async function main() {
  console.log('🔮 Running Expected Points generation for all players...');
  const predictor = new FPLPredictor2025_26();
  const predictions: PlayerPrediction[] = await predictor.predictAllPlayers(fplApiService as any);

  console.log(`✅ Generated predictions for ${predictions.length} players`);
  const nonZero = predictions.filter(p => (p.total_3gw_xp || 0) > 0);
  console.log(`📊 Non-zero XP players: ${nonZero.length}`);

  // Print top 10 by total_3gw_xp
  const top10 = [...predictions]
    .sort((a, b) => (b.total_3gw_xp || 0) - (a.total_3gw_xp || 0))
    .slice(0, 10);
  console.log('\n🏆 Top 10 by Total 3GW XP:');
  top10.forEach((p, idx) => {
    console.log(
      `${idx + 1}. ${p.name} (${p.position}) £${p.price}m – GW2:${p.gw2_xp} GW3:${p.gw3_xp} GW4:${p.gw4_xp} | Total:${p.total_3gw_xp}`
    );
  });

  // Save full results
  const fs = await import('fs');
  const path = await import('path');
  const outPath = path.join(process.cwd(), 'scripts', 'predictions.json');
  fs.writeFileSync(outPath, JSON.stringify(predictions, null, 2));
  console.log(`\n💾 Saved full predictions to ${outPath}`);
}

main().catch(err => {
  console.error('❌ Failed to run predictions:', err);
  process.exit(1);
});
