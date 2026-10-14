# State

Inventory of this tree, taken from `package.json`, `app.json`, the Expo app under `FantasyPremierLeague/`, and the scripts next to it.

## Repository

The repository root contains `README.md`, `AGENTS.md`, `.gitignore`, and the `FantasyPremierLeague/` app directory. The app calls `https://fantasy.premierleague.com/api` from the client. `package.json` scripts start Expo, not a local API server.

Root `.gitignore` includes Next.js and Vercel patterns (`.next/`, `.vercel/`). The app’s own ignore file is `FantasyPremierLeague/.gitignore` (Expo, `node_modules/`, native build output, `.env`).

There is no `LICENSE` file.

## Client

- Entry: `FantasyPremierLeague/index.ts` calls `registerRootComponent` with `App.tsx`.
- Tabs: Points, Fixtures, Players, Squad, Best 11.
- Loading: `LoadingScreen` runs `comprehensiveDataService.loadAllData` (nine progress steps in that screen) and then `setCachedData` and `setIsLoading(false)`.
- Theme: one object in `src/context/ThemeContext.tsx`. `app.json` `userInterfaceStyle` is `light`.
- Player modal props in `PlayerDetailsModal.tsx`: `visible`, `onClose`, `fplPlayer`, `team`. `PlayerStatsSection` tabs: `matches`, `stats`, `history`, `xp`.
- Players filters: search, position, club, max price from £4.0m to £14.5m in £0.5m steps, plus Unlimited. Sortable columns include form, price, selected, current gameweek points, total points, ICT, baseline gameweeks, transfers, bonus (`dreamteam_count`), three fixture columns, three XP columns, and total 3GW XP. Initial sort key is `total_3gw_xp` descending.
- Points and Squad request `entry/{squadId}/event/{gameweek}/picks/`. Initial squad id in both screens is `397418`.
- `fplApi.ts` `baseUrl` is `https://fantasy.premierleague.com/api`. Photo URLs use `https://resources.premierleague.com/premierleague25/photos/players/110x140/`.

`Best11Screen` reads `cachedData.best11Teams` and `preRenderedBest11Data`. `comprehensiveDataService.createBest11Teams` constructs `OptimalTeamBuilder`. `best11Optimizer.ts` has no other importers.

`SquadManager` is rendered from `PointsScreen` only when `showSquadManager` is true. That state is initialized to `false` and has no other write in the file. The component itself loads `squadData` from `src/data/squadData.ts` and keeps edits in React state.

## Baseline file

`src/data/2024-25-baseline-processed.json` metadata:

- `source`: `GitHub FPL repository`
- `pulled_at`: `2025-08-28T14:24:47.282Z`
- `total_players`: `805`

The same object includes `success_count`, `error_count`, `validation_issues`, and `data_quality`. Pull scripts set `data_quality` to `PASSED` or `ISSUES_FOUND` from the validation count at pull time.

`FPLPredictor2025_26` assigns `baselineData2024_25.players` in its constructor.

## Model JSON vs TypeScript predictor

`src/models/fplModel2025-26.json` is `model_type` `rule_adjusted_2025_26`, `version` `2.0`. `predict()` uses:

- `weights.form_weights`: roll3 `0.35`, roll5 `0.30`, roll8 `0.25`, roll15 `0.10`
- `weights.context_weights`: minutes `1.15`, consistency `0.85`, home `1.10`, starts `0.90`
- `weights.feature_scaling`: ict `0.08`, bps `0.015`, expected_gi `1.05`

Constants in `fplPredictor2025-26.ts` (not taken from those JSON fields):

- Position multipliers in `getPositionMultiplier2025_26`: GK `1.05`, DEF `1.15`, MID `1.12`, FWD `1.15`
- Defensive-contribution boosts in `apply2025_26Rules`: GK `0`, DEF `0.10`, MID `0.08`, FWD `0.04`, applied as `1 + boost`
- Assist multiplier: `1.02`
- Goalkeeper BPS multiplier: `1.08`; defender: `1.03`; if `basePrediction > 8` and the player is not GK or DEF: `0.95`
- Away multiplier: `0.94`. Home uses `weights.context_weights.home_advantage`.
- Fixture difficulty map in `getFixtureDifficultyMultiplier`: `1 → 0.70`, `2 → 0.85`, `3 → 1.00`, `4 → 1.15`, `5 → 1.25`. Home uses `team_h_difficulty`, away uses `team_a_difficulty`, then `difficulty_score`, then `3`.
- `classifyPlayer` promoted team ids: `[3, 11, 17]` (the source comment names Burnley, Leeds, and Sunderland)
- Penalty multipliers: baseline history length `0` → `0.65`; promoted club and not new → `0.70`; `effectiveHistoryLength < 15` and `now_cost <= 60`, and not new and not promoted → `0.75`; insufficient data (`effectiveHistoryLength < 10`, no baseline object, not new, not promoted) → `0.65` under 3 games, `0.75` under 6, otherwise `0.85`
- `applyConservativeCaps` multiplies by `0.95` when `gameweek >= 6` and by `0.90` when `gameweek >= 8`
- Final clamp in `predict()`: minimum `0.5` when `penaltyMultiplier < 0.8`, otherwise `1.0`; maximum `15.0`
- Availability steps in `getAvailabilityMultiplier`: `>= 100` → `1.0`, `>= 75` → `0.9`, `>= 50` → `0.7`, `>= 25` → `0.5`, else `0.3`

The JSON `position_multipliers` are GK `1.08`, DEF `1.23`, MID `1.20`, FWD `1.23`. JSON `rule_adjustments.defensive_contributions` are `0`, `0.20`, `0.15`, `0.08`, and `assists_boost` is `1.05`. `scripts/quickPredictTop10.js` uses those JSON values. `test-expected-points-calculation.js` uses its own mock weights.

## npm scripts

From `FantasyPremierLeague/package.json`:

- `start`: `expo start`
- `android`: `expo run:android`
- `ios`: `expo run:ios`
- `web`: `expo start --web`
- `dev` and `server:bg`: Expo web on port `8082` (`server:bg` backgrounds the process)
- `server:stop`: `pkill -f 'expo start'`
- `prebuild`: `expo prebuild --clean`

`bash start-server.sh` runs `npx expo start --web --port 8082` in the background and writes `server.log`.

## Flagged markdown

`FantasyPremierLeague/SQUAD_DATA_README.md` was left in place. The player fields and `squadHelpers` it describes match `src/data/squadData.ts`, and `SquadManager` still has the Check Status control. The same file refers to `src/screens/HomeScreen.tsx`, which is not in the tree, and its AsyncStorage block is an example in the doc. `SquadManager` stores squad edits in component state. Points and Squad load entry picks by id, as described above.
