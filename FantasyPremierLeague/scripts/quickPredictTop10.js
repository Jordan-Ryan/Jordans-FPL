/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const model = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/models/fplModel2025-26.json'), 'utf8'));

function calcFeatures(history) {
  if (!history || history.length === 0) {
    return {
      roll3_points: 3.5, roll5_points: 3.5, roll8_points: 3.5, roll15_points: 3.5,
      roll3_minutes: 65, roll5_minutes: 65, roll8_minutes: 65,
      roll5_consistency: 0.5, roll5_starts: 0.7, form_trend: 0,
      avg_ict: 25, avg_bps: 20, avg_expected_gi: 0.8,
      data_quality: 'minimal'
    };
  }
  const h = [...history].sort((a,b)=>a.round-b.round);
  const last = (n) => h.slice(-n);
  const avg = (arr) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
  const std = (arr) => {
    if (arr.length <= 1) return 1;
    const mu = avg(arr);
    return Math.sqrt(avg(arr.map(x => (x-mu)**2)));
  };
  const pts = (arr)=>arr.map(g=>Number(g.total_points||0));
  const mins = (arr)=>arr.map(g=>Number(g.minutes||0));
  return {
    roll3_points: avg(pts(last(3))),
    roll5_points: avg(pts(last(5))),
    roll8_points: avg(pts(last(8))),
    roll15_points: avg(pts(last(15))),
    roll3_minutes: avg(mins(last(3))),
    roll5_minutes: avg(mins(last(5))),
    roll8_minutes: avg(mins(last(8))),
    roll5_consistency: 1/(1+std(pts(last(5)))),
    roll5_starts: avg(last(5).map(g=>g.minutes>=60?1:0)),
    form_trend: avg(pts(last(3))) - avg(pts(last(8))),
    avg_ict: avg(h.map(g=>Number(g.ict_index||0))),
    avg_bps: avg(h.map(g=>Number(g.bps||0))),
    avg_expected_gi: avg(h.map(g=>Number(g.expected_goal_involvements||0))),
    data_quality: h.length>=10?'good':h.length>=5?'limited':'minimal'
  };
}

function predict(features, context) {
  const { weights, rule_adjustments } = model;
  let prediction =
    features.roll3_points * weights.form_weights.roll3 +
    features.roll5_points * weights.form_weights.roll5 +
    features.roll8_points * weights.form_weights.roll8 +
    features.roll15_points * weights.form_weights.roll15;

  const minutesReliability = Math.min(features.roll5_minutes / 90.0, 1.2);
  prediction *= minutesReliability * weights.context_weights.minutes_factor;

  const consistencyFactor = weights.context_weights.consistency_factor * features.roll5_consistency;
  prediction *= (0.8 + 0.4 * consistencyFactor);

  const startsFactor = weights.context_weights.starts_factor * features.roll5_starts;
  prediction *= (0.7 + 0.3 * startsFactor);

  prediction += features.avg_bps * weights.feature_scaling.bps_scale;
  prediction += features.avg_ict * weights.feature_scaling.ict_scale;
  prediction += features.avg_expected_gi * weights.feature_scaling.expected_gi_scale;

  const defensiveBoost = rule_adjustments.defensive_contributions[String(context.element_type)] || 0;
  prediction *= (1 + defensiveBoost);
  prediction *= rule_adjustments.assists_boost;

  if (context.element_type === 1) prediction *= rule_adjustments.bps_adjustments.goalkeepers;
  else if (context.element_type === 2) prediction *= rule_adjustments.bps_adjustments.defenders;
  else if (prediction > 8) prediction *= rule_adjustments.bps_adjustments.penalty_takers;

  const posMult = model.weights.position_multipliers[String(context.element_type)] || 1.0;
  prediction *= posMult;

  prediction *= context.is_home ? weights.context_weights.home_advantage : 0.94;

  const chance = context.chance_of_playing_next_round ?? 100;
  const avail = chance>=100?1: chance>=75?0.9: chance>=50?0.75: chance>=25?0.5: 0.25;
  prediction *= avail;

  if (features.data_quality === 'minimal') prediction *= 0.8;
  else if (features.data_quality === 'limited') prediction *= 0.9;

  return Math.max(0, Math.min(20, Math.round(prediction*10)/10));
}

(async () => {
  console.log('🔮 Computing EP for top-10 form players...');
  const boot = await (await fetch('https://fantasy.premierleague.com/api/bootstrap-static/')).json();
  const teams = boot.teams;
  const top10 = [...boot.elements]
    .sort((a,b)=>parseFloat(b.form||'0')-parseFloat(a.form||'0'))
    .slice(0,10);

  const out = [];
  for (const p of top10) {
    const sum = await (await fetch(`https://fantasy.premierleague.com/api/element-summary/${p.id}/`)).json();
    const features = calcFeatures(sum.history||[]);
    const fixtures = (sum.fixtures||[]).slice(0,3);
    // Fallback fixtures if needed
    while (fixtures.length<3) fixtures.push({event: 2+fixtures.length, is_home: fixtures.length%2===0});

    const gwXP = fixtures.map((f, idx)=> predict(features, {element_type: p.element_type, is_home: !!f.is_home, chance_of_playing_next_round: p.chance_of_playing_next_round ?? 100}));
    const [gw2_xp, gw3_xp, gw4_xp] = [gwXP[0]||0, gwXP[1]||0, gwXP[2]||0];
    const total_3gw_xp = Math.round(((gw2_xp+gw3_xp+gw4_xp))*10)/10;
    out.push({ id:p.id, name:p.web_name, pos:['','GK','DEF','MID','FWD'][p.element_type], price:p.now_cost/10, gw2_xp, gw3_xp, gw4_xp, total_3gw_xp });
  }

  out.sort((a,b)=>b.total_3gw_xp-a.total_3gw_xp);
  console.log('\n🏆 Top-10 sample EP (GW2-4 & total):');
  out.forEach((r,i)=> console.log(`${i+1}. ${r.name} (${r.pos}) £${r.price}m -> ${r.gw2_xp}, ${r.gw3_xp}, ${r.gw4_xp} | Total ${r.total_3gw_xp}`));
  const savePath = path.join(__dirname, 'top10_ep.json');
  fs.writeFileSync(savePath, JSON.stringify(out, null, 2));
  console.log(`\n💾 Saved to ${savePath}`);
})();
