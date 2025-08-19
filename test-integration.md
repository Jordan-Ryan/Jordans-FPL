# Testing Expected Points Integration

## Prerequisites

1. **Backend API Server** must be running
2. **React Native App** must be running
3. **Expo Go** must be connected

## Test Steps

### 1. Start Backend API
```bash
cd backend
npm run dev
```
- Verify API is running at `http://localhost:3001`
- Check health endpoint: `http://localhost:3001/health`

### 2. Start React Native App
```bash
cd FantasyPremierLeague
npm start
```
- Scan QR code with Expo Go
- Navigate to Players tab

### 3. Verify Expected Points Integration

#### ✅ **What You Should See:**

1. **Status Indicator** above the table:
   - 🔄 "Loading Expected Points..." (initially)
   - ✅ "Expected Points Loaded" (when successful)
   - ⚠️ Error message (if API fails)

2. **4 New Columns** in the Players table:
   - **GW2 XP** (next gameweek expected points)
   - **GW3 XP** (gameweek +2 expected points)  
   - **GW4 XP** (gameweek +3 expected points)
   - **3GW Total** (sum of all 3 gameweeks)

3. **Refresh Button** (🔄 XP) in the filter bar
   - Click to manually refresh expected points
   - Shows loading state while refreshing

4. **Expected Points Values**:
   - Elite attackers: 25-35 XP for 3GW total
   - Good players: 15-22 XP for 3GW total
   - Starting GKs: 12-16 XP per GW
   - Backup players: Near 0 XP

#### ❌ **Common Issues & Solutions:**

1. **"Failed to load expected points"**
   - Check if backend API is running
   - Verify API is accessible at `http://localhost:3001`
   - Check console for detailed error messages

2. **Expected points showing as 0 or missing**
   - Verify FPL API is accessible
   - Check if player IDs are valid
   - Ensure backend can fetch FPL data

3. **Slow loading**
   - Expected points fetch may take 2-5 seconds
   - First load includes feature engineering
   - Subsequent loads use cached data

### 4. Test API Endpoints

#### Test Single Player:
```bash
curl "http://localhost:3001/api/players/430/expected-points?horizon=3"
```

#### Test Batch Players:
```bash
curl -X POST "http://localhost:3001/api/expected-points/batch" \
  -H "Content-Type: application/json" \
  -d '{"playerIds": [430, 123, 456], "horizon": 3}'
```

### 5. Verify Data Flow

1. **FPL API** → Backend fetches player/team/fixture data
2. **Feature Engineering** → Backend calculates rolling statistics
3. **Prediction Model** → Backend generates expected points
4. **React Native** → Frontend fetches predictions via API
5. **UI Display** → Players tab shows XP in 4 columns

## Success Criteria

✅ **Backend API** responds to health check  
✅ **Expected Points** load within 5 seconds  
✅ **4 XP columns** display in Players table  
✅ **Values are realistic** (elite players 25-35 XP)  
✅ **Refresh button** works and updates data  
✅ **Error handling** shows user-friendly messages  
✅ **Loading states** provide visual feedback  

## Troubleshooting

### Backend Issues:
- Check `npm run dev` output for errors
- Verify port 3001 is not in use
- Check FPL API connectivity

### Frontend Issues:
- Check React Native console for errors
- Verify API base URL in `expectedPointsApi.ts`
- Check network requests in Expo DevTools

### Data Issues:
- Verify FPL API is returning data
- Check if current gameweek is correct
- Ensure player IDs exist in FPL system

## Next Steps

Once integration is verified:
1. **Test with real FPL data** (current season)
2. **Validate prediction accuracy** against actual results
3. **Optimize performance** if needed
4. **Add more players** to the batch processing
5. **Implement advanced features** (ML models, real-time updates)
