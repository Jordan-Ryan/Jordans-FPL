# AGENTS.md

Check `package.json`, `app.json`, and the source files named here before describing how the app runs.

## App root

The Expo app lives in `FantasyPremierLeague/`. `index.ts` registers `App.tsx`. Navigation is `@react-navigation/bottom-tabs` with Points, Fixtures, Players, Squad, and Best 11. `@react-navigation/stack` is a dependency and `App.tsx` does not create a stack navigator.

Styling is `StyleSheet` modules under `src/styles/` and the theme object in `src/context/ThemeContext.tsx`. `app.json` sets `userInterfaceStyle` to `light`. There is no Tailwind config in the tree.

`src/services/fplApi.ts` imports `expo-file-system`. That package is not listed in `package.json` dependencies.

## Commands

From `FantasyPremierLeague/`:

- Install: `npm install` (`package-lock.json`)
- Metro: `npm start` (`expo start`)
- Web: `npm run web` (`expo start --web`)
- Web on port 8082: `npm run dev`, or `bash start-server.sh` (background, log file `server.log`)
- Stop a background Expo process started the same way: `npm run server:stop` (`pkill -f 'expo start'`)
- Native: `npm run ios`, `npm run android`
- Regenerate native projects: `npm run prebuild` (`expo prebuild --clean`)

`ios/` and `android/` are already checked in. `package.json` has no `test` script, no `lint` script, and no `engines` field. Application code does not read `process.env`.

## Prediction

In-app expected points come from `src/services/fplPredictor2025-26.ts`. `LoadingScreen` loads through `src/services/comprehensiveDataService.ts`, which calls that predictor. Best 11 teams are built with `src/services/optimalTeamBuilder.ts` (`BUDGET` 100, squad limits GK 2 / DEF 5 / MID 5 / FWD 3). `src/services/best11Optimizer.ts` is not imported anywhere else.

`predict()` reads `weights.form_weights`, `weights.context_weights`, and `weights.feature_scaling` from `src/models/fplModel2025-26.json`. Position multipliers, defensive-contribution boosts, the assist multiplier `1.02`, and the away multiplier `0.94` are constants in the TypeScript file. The JSON also contains `position_multipliers`, `rule_adjustments`, `feature_importance`, and `accuracy`. `predict()` does not read those fields. Current numeric values are in `docs/STATE.md`.

`scripts/quickPredictTop10.js` does apply `rule_adjustments` and `position_multipliers` from the JSON, then writes `scripts/top10_ep.json`. It is a separate calculation from the TypeScript predictor.

`scripts/runPredictions.ts` is the entry that imports `FPLPredictor2025_26`. `scripts/tsconfig.pred.json` includes only the predictor module (`outDir` `./dist`, CommonJS). `ts-node` and `tsx` are not in `package.json`. `scripts/debugExpectedPoints.js` and `FantasyPremierLeague/test-predictor.js` `require` the `.ts` source path.

## Squad data

`src/data/squadData.ts` is the 15-player list used by `src/components/SquadManager.tsx` (captain, vice-captain, starter, bench). `PointsScreen` initializes `showSquadManager` to `false` and never calls the setter. The visible Points and Squad paths request `https://fantasy.premierleague.com/api/entry/{id}/event/{gameweek}/picks/` and start from squad id `397418`.

`FantasyPremierLeague/SQUAD_DATA_README.md` still matches the fields and helpers in `squadData.ts`. It also names `src/screens/HomeScreen.tsx`, which is not in the tree.

## Baseline file

`node scripts/pull-baseline-data.js` and `node scripts/pull-baseline-data-from-list.js` overwrite `src/data/2024-25-baseline-processed.json`. The from-list script reads `./player-folders-list.json` from the current working directory. Source URLs point at `vaastav/Fantasy-Premier-League` `data/2024-25/players`.

## Docs

Setup and run steps are in the root `README.md`. `docs/STATE.md` is the inventory of screens, constants, and markdown left in place. `FantasyPremierLeague/README.md` points at the root README.
