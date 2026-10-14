# Jordans-FPL

The app is the Expo project in `FantasyPremierLeague/`. It is a React Native client written in TypeScript. `App.tsx` registers five bottom tabs: Points, Fixtures, Players, Squad, and Best 11. On launch, `LoadingScreen` calls `comprehensiveDataService.loadAllData`, which reads the public Fantasy Premier League API and the checked-in 2024-25 baseline file, then stores the result in `DataContext`.

`package.json` names the package `fantasypremierleague` at version `1.0.0`. `app.json` sets the Expo name to `FantasyPremierLeague`, version `1.0.0`, `newArchEnabled` to `true`, and `userInterfaceStyle` to `light`.

## Setup

From a clone of this repository:

```bash
cd FantasyPremierLeague
npm install
```

`package-lock.json` is the lockfile. `package.json` has no `engines` field. Application code does not read environment variables, so no `.env` file is required to start the app.

## Run

Run these from `FantasyPremierLeague/`.

| Command | What `package.json` or the shell script runs |
| --- | --- |
| `npm start` | `expo start` |
| `npm run web` | `expo start --web` |
| `npm run dev` | `expo start --web --port 8082` |
| `npm run android` | `expo run:android` |
| `npm run ios` | `expo run:ios` |
| `npm run prebuild` | `expo prebuild --clean` |
| `npm run server:bg` | `expo start --web --port 8082 &` |
| `npm run server:stop` | `pkill -f 'expo start'` |
| `bash start-server.sh` | `npx expo start --web --port 8082` in the background, logging to `server.log` |

`ios/` and `android/` are already in the tree. `ios/Podfile` uses iOS `15.1` when `Podfile.properties.json` does not set `ios.deploymentTarget`. That properties file sets Hermes and `newArchEnabled` to true. `android/gradle.properties` sets `newArchEnabled=true`. The iOS bundle identifier and Android package in `app.json` are `com.anonymous.FantasyPremierLeague`.

`package.json` has no `test` script and no `lint` script.

Direct dependencies include Expo `~53.0.20`, React `19.0.0`, React Native `0.79.5`, React Navigation (`native`, `bottom-tabs`, and `stack`), AsyncStorage, `react-native-element-dropdown`, and TypeScript `~5.8.3` as a devDependency.

## Layout

```
FantasyPremierLeague/
  App.tsx                 # bottom tab navigator
  index.ts                # registerRootComponent(App)
  app.json
  src/screens/            # Points, Fixtures, Players, Squad, Best 11, Loading
  src/components/         # player modal, squad manager, photos
  src/context/            # DataContext, ThemeContext
  src/services/           # FPL API client, predictor, team builder
  src/data/               # squad list, clubs, 2024-25 baseline JSON
  src/models/fplModel2025-26.json
  scripts/                # Node helpers; not npm scripts
  ios/  android/
```

Styling is React Native `StyleSheet` modules in `src/styles/` and the single theme object in `src/context/ThemeContext.tsx`.

## Data the client requests

- `https://fantasy.premierleague.com/api/bootstrap-static/`
- `https://fantasy.premierleague.com/api/fixtures/`
- `https://fantasy.premierleague.com/api/element-summary/{playerId}/`
- `https://fantasy.premierleague.com/api/entry/{squadId}/event/{gameweek}/picks/` from Points and Squad. Both screens initialize the squad id to `397418`.
- Player photos from `https://resources.premierleague.com/premierleague25/photos/players/110x140/{code}.png` (`fplApi.ts`)
- Baseline history from `src/data/2024-25-baseline-processed.json`. Its metadata records `pulled_at` `2025-08-28T14:24:47.282Z` and `total_players` `805`.

`PlayerStatsSection` tabs are `matches`, `stats`, `history`, and `xp`. The Players screen filters by name, position, club, and a max price. Price options run from £4.0m to £14.5m in £0.5m steps, plus Unlimited. Default sort is `total_3gw_xp` descending.

`docs/STATE.md` lists the constants in `fplPredictor2025-26.ts`. `AGENTS.md` notes where the Node scripts differ from that file.

## Node scripts

These are not npm scripts. Run them from `FantasyPremierLeague/`.

- `node scripts/quickPredictTop10.js` reads bootstrap and element summaries and writes `scripts/top10_ep.json`. It applies `rule_adjustments` and `position_multipliers` from `src/models/fplModel2025-26.json`.
- `node scripts/list-zero-baseline.js` writes `zero-baseline-non-promoted.csv`.
- `node scripts/discover-folders.js` lists player folders from `vaastav/Fantasy-Premier-League` `data/2024-25/players`.
- `node scripts/find-folder-names.js`, `node scripts/test-csv-format.js`, `node scripts/test-name-preservation.js`, and `node scripts/test-simple-pull.js` are smaller helpers next to the baseline pull.
- `node scripts/pull-baseline-data.js` writes `src/data/2024-25-baseline-processed.json`.
- `node scripts/pull-baseline-data-from-list.js` reads `./player-folders-list.json` and writes the same baseline file. A log line prints a local absolute path; the write uses `path.join(__dirname, '../src/data/2024-25-baseline-processed.json')`.

`scripts/runPredictions.ts` imports `FPLPredictor2025_26` and writes `scripts/predictions.json`. `scripts/tsconfig.pred.json` compiles only `src/services/fplPredictor2025-26.ts` to `scripts/dist` as CommonJS. `ts-node` and `tsx` are not dependencies. `scripts/debugExpectedPoints.js` and `test-predictor.js` `require` the `.ts` predictor file. `test-expected-points-calculation.js` is a separate mock: form weights `0.3 / 0.4 / 0.2 / 0.1` and home multiplier `1.12`.
