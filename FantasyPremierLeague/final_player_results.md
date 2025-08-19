# FPL Player ID Search Results

## ✅ FOUND PLAYERS

### Starting XI (3-4-3 formation)
1. **James Trafford** (Burnley) - ❌ NOT FOUND in FPL
   - Note: There's a "Trafford" at Man City (ID: 182) but not at Burnley

2. **Micky van de Ven** (Tottenham) - ✅ FOUND
   - **FPL ID: 575**
   - Web Name: Van de Ven
   - Team: Spurs
   - Position: DEF
   - Cost: £4.5m
   - Form: 6.0
   - Total Points: 6

3. **Ezri Konsa** (Aston Villa) - ✅ FOUND
   - **FPL ID: 38**
   - Web Name: Konsa
   - Team: Aston Villa
   - Position: DEF
   - Cost: £4.5m
   - Form: 3.0
   - Total Points: 3

4. **Pedro Porro** (Tottenham) - ✅ FOUND
   - **FPL ID: 568**
   - Web Name: Pedro Porro
   - Team: Spurs
   - Position: DEF
   - Cost: £5.5m
   - Form: 6.0
   - Total Points: 6

5. **Rayan Cherki** (Tottenham) - ❌ NOT FOUND at Spurs
   - Note: There's a "Cherki" at Man City (ID: 417) but not at Spurs

6. **Mohamed Salah** (Liverpool) - ✅ FOUND
   - **FPL ID: 381**
   - Web Name: M.Salah
   - Team: Liverpool
   - Position: MID
   - Cost: £14.5m
   - Form: 8.0
   - Total Points: 8

7. **Florian Wirtz** (Bayer Leverkusen) - ❌ NOT FOUND
   - Note: Bayer Leverkusen is not in the Premier League/FPL

8. **Mohammed Kudus** (West Ham) - ⚠️ FOUND but at different club
   - **FPL ID: 582**
   - Web Name: Kudus
   - Team: Spurs (not West Ham)
   - Position: MID

9. **João Pedro** (Brighton) - ⚠️ FOUND but at different club
   - **FPL ID: 249**
   - Web Name: João Pedro
   - Team: Chelsea (not Brighton)
   - Position: FWD

10. **Jarrod Bowen** (West Ham) - ✅ FOUND
    - **FPL ID: 624**
    - Web Name: Bowen
    - Team: West Ham
    - Position: FWD
    - Cost: £8.0m
    - Form: 2.0
    - Total Points: 2

11. **Hugo Ekitike** (Liverpool) - ✅ FOUND
    - **FPL ID: 661**
    - Web Name: Ekitiké
    - Team: Liverpool
    - Position: FWD

### Bench Players
12. **Martin Dúbravka** (Newcastle) - ⚠️ FOUND but at different club
    - **FPL ID: 470**
    - Web Name: Dúbravka
    - Team: Burnley (not Newcastle)
    - Position: GK

13. **Marc Guéhi** (Crystal Palace) - ✅ FOUND
    - **FPL ID: 260**
    - Web Name: Guéhi
    - Team: Crystal Palace
    - Position: DEF
    - Cost: £4.5m
    - Form: 0.0
    - Total Points: 0

14. **Aaron Wan-Bissaka** (Manchester United) - ⚠️ FOUND but at different club
    - **FPL ID: 610**
    - Web Name: Wan-Bissaka
    - Team: West Ham (not Manchester United)
    - Position: DEF

15. **Eberechi Eze** (Crystal Palace) - ✅ FOUND
    - **FPL ID: 266**
    - Web Name: Eze
    - Team: Crystal Palace
    - Position: MID
    - Cost: £7.5m
    - Form: 0.0
    - Total Points: 0

## 📊 SUMMARY

- **Total Players Found**: 10 out of 15
- **Correct Club & ID**: 6 players
- **Wrong Club but Found**: 4 players
- **Not Found in FPL**: 5 players

## 🎯 RECOMMENDATIONS

### Players to Keep (Correct Club & ID)
- Micky van de Ven (ID: 575) - Spurs
- Ezri Konsa (ID: 38) - Aston Villa  
- Pedro Porro (ID: 568) - Spurs
- Mohamed Salah (ID: 381) - Liverpool
- Jarrod Bowen (ID: 624) - West Ham
- Marc Guéhi (ID: 260) - Crystal Palace
- Eberechi Eze (ID: 266) - Crystal Palace

### Players Found but Wrong Club
- Mohammed Kudus (ID: 582) - Currently at Spurs, not West Ham
- João Pedro (ID: 249) - Currently at Chelsea, not Brighton
- Hugo Ekitike (ID: 661) - Currently at Liverpool
- Martin Dúbravka (ID: 470) - Currently at Burnley, not Newcastle
- Aaron Wan-Bissaka (ID: 610) - Currently at West Ham, not Man Utd

### Players Not Found in FPL
- James Trafford (Burnley)
- Rayan Cherki (Tottenham)
- Florian Wirtz (Bayer Leverkusen - not in Premier League)

## 💻 UPDATED CODE FOR HomeScreen.tsx

```typescript
const [players, setPlayers] = useState<Player[]>([
  // Starting XI - 3-4-3 formation
  { id: 0, starter: true, captain: false, vice_captain: true, team_position: 1, name: 'James Trafford' }, // NOT FOUND - Burnley
  { id: 575, starter: true, captain: false, vice_captain: false, team_position: 2, name: 'Van de Ven' }, // DEF - Spurs
  { id: 38, starter: true, captain: false, vice_captain: false, team_position: 3, name: 'Konsa' }, // DEF - Aston Villa
  { id: 568, starter: true, captain: false, vice_captain: false, team_position: 4, name: 'Pedro Porro' }, // DEF - Spurs
  { id: 0, starter: true, captain: false, vice_captain: false, team_position: 5, name: 'Rayan Cherki' }, // NOT FOUND - Tottenham
  { id: 381, starter: true, captain: false, vice_captain: false, team_position: 6, name: 'M.Salah' }, // MID - Liverpool
  { id: 0, starter: true, captain: false, vice_captain: false, team_position: 7, name: 'Florian Wirtz' }, // NOT FOUND - Bayer Leverkusen
  { id: 582, starter: true, captain: false, vice_captain: false, team_position: 8, name: 'Kudus' }, // MID - Spurs (not West Ham)
  { id: 249, starter: true, captain: true, vice_captain: false, team_position: 9, name: 'João Pedro' }, // FWD - Chelsea (not Brighton)
  { id: 624, starter: true, captain: false, vice_captain: false, team_position: 10, name: 'Bowen' }, // FWD - West Ham
  { id: 661, starter: true, captain: false, vice_captain: false, team_position: 11, name: 'Ekitiké' }, // FWD - Liverpool
  
  // Bench players
  { id: 470, starter: false, captain: false, vice_captain: false, bench_position: 1, name: 'Dúbravka' }, // GK - Burnley (not Newcastle)
  { id: 260, starter: false, captain: false, vice_captain: false, bench_position: 2, name: 'Guéhi' }, // DEF - Crystal Palace
  { id: 610, starter: false, captain: false, vice_captain: false, bench_position: 3, name: 'Wan-Bissaka' }, // DEF - West Ham (not Man Utd)
  { id: 266, starter: false, captain: false, vice_captain: false, bench_position: 4, name: 'Eze' }, // MID - Crystal Palace
]);
```

## ⚠️ IMPORTANT NOTES

1. **Club Changes**: Several players have moved clubs since your squad was created
2. **Not in FPL**: Some players (like Wirtz) are not in the Premier League
3. **Missing Players**: Some players may need to be replaced with alternatives
4. **Captain/Vice-Captain**: João Pedro is set as captain but is now at Chelsea, not Brighton 