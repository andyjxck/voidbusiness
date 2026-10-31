# Game Balance, Stat Scaling & Progression Summary

This is a high-level balance audit of `tap-game-rn`. It covers the core data files under `src/data/`, with tables for the major entity lists and the key formulas used for scaling.

## 1. Core Loop & Currencies

- **Main currency:** Cash (`money`). All earnings, costs and sales are denominated in dollars.
- **Primary progression loop:**
  1. Tap / take jobs to earn early money.
  2. Buy businesses that generate passive income, then upgrade them (exponential scaling).
  3. Buy real estate and investment assets for passive yields and capital gains.
  4. Once wealth is high enough, buy Legacy private estates and collectibles.
  5. Complete collection sets to gain a global business income multiplier.
- **Time is real-time offline-elapsed:** the app catches up elapsed minutes on load, computing business, market, legacy and auction ticks.
- **Persistence:** all state is saved in `AsyncStorage` and restored on launch.

## 2. Jobs (early-game tap economy)

| Job | Success Rate | $/tap | Total Taps |
| --- | ---: | ---: | ---: |
| Astronaut | 3% | 500 | 600 |
| CEO | 5% | 300 | 500 |
| Surgeon | 8% | 200 | 450 |
| Lawyer | 12% | 150 | 400 |
| Pilot | 20% | 80 | 300 |
| Executive | 15% | 120 | 350 |
| Developer | 28% | 50 | 250 |
| Nurse | 35% | 25 | 200 |
| Sales | 45% | 15 | 150 |
| Office Worker | 40% | 20 | 180 |
| Mechanic | 60% | 6 | 100 |
| Delivery | 55% | 8 | 120 |
| Waiter | 80% | 2 | 60 |
| Retail | 70% | 3 | 80 |
| Barista | 85% | 1 | 50 |

- A random roll ≤ `successRate` is required to get the job.
- Each successful tap adds `perTapBonus` dollars until `totalTaps` is consumed.

## 3. Market / Investments

### Asset Types

| Type | Count | Price Ranges |
| --- | ---: | --- |
| Stocks | 95 | $3.5 – $920 base, volatility 0.06 – 0.45 |
| Crypto | 30 | $0.00001 – $67,000 base, volatility 0.40 – 0.88 |
| Real Estate | 20 | $250k – $45M base, see full table below |

### Real Estate

| Property | Base Price | Hourly Income |
| --- | ---: | ---: |
| Downtown Studio | $250,000 | $48 |
| City Apartment | $450,000 | $88 |
| Suburban House | $850,000 | $168 |
| Townhouse | $650,000 | $128 |
| Luxury Condo | $1,200,000 | $232 |
| Luxury Penthouse | $2,500,000 | $480 |
| Beachfront Villa | $3,800,000 | $740 |
| Country Ranch | $1,800,000 | $352 |
| Industrial Loft | $950,000 | $184 |
| Duplex Property | $720,000 | $144 |
| Beverly Hills Mansion | $8,500,000 | $1,600 |
| Country Estate | $5,500,000 | $1,080 |
| Boutique Hotel | $12,000,000 | $2,320 |
| Skyscraper Floor | $15,000,000 | $2,880 |
| Island Resort | $22,000,000 | $4,200 |
| Private Island | $25,000,000 | $4,800 |
| Vineyard Estate | $8,500,000 | $1,640 |
| European Castle | $18,000,000 | $3,440 |
| Office Skyscraper | $45,000,000 | $8,800 |
| Shopping Mall | $32,000,000 | $6,200 |

- Real estate hourly income is 4x the authored value (`RE_INCOME_MULT = 4`).
- Stock dividends are an hourly % of the current price per sector, ranging from **0.002%** to **0.020%**.
- Crypto staking yield: **0.015%** of price per hour.
- Investment tax: **15%** on passive income.

### Price Simulation (GBM)

```
change = exp((drift * dt) - 0.5 * (volatility * sqrt(dt))^2 + volatility * sqrt(dt) * Z)
newPrice = max(0.01, currentPrice * change)
```

- `drift` is deterministic per asset, -0.8% to +0.8% per hour.
- `dt = minutesElapsed / 60`.
- `Z` is a Box-Muller normal variate.

### Passive Income (per minute)

```
realEstateIncome  = asset.hourlyIncome * quantity * (minutes / 60)
stockIncome       = sectorYield * price * quantity * (minutes / 60)
cryptoIncome      = 0.00015 * price * quantity * (minutes / 60)
net               = (totalIncome) * (1 - 0.15)
```

## 4. Business System

### Business Tiers

| Type | Name | Base Cost | Max Level | Base Hourly | Growth Rate |
| --- | --- | ---: | ---: | ---: | ---: |
| cafe | Local Cafe | $5,000 | 30 | $250 | 1.12 |
| bus | Void City Bus Service | $25,000 | 30 | $0 | sector formula |
| courier | Void City Courier | $120,000 | 30 | $0 | sector formula |
| clothing | Clothing Factory | $600,000 | 30 | $0 | sector formula |
| construction | Construction Firm | $3,000,000 | 30 | $0 | sector formula |
| dealership | Vehicle Dealership | $15,000,000 | 30 | $0 | sector formula |
| gamedev | Indie Studio | $80,000,000 | 30 | $0 | sector formula |
| moviestudio | Movie Studio | $400,000,000 | 30 | $0 | sector formula |
| bank | Void City Bank | $2,500,000,000 | 30 | $0 | sector formula |

### Universal Business Formulas

- **Upgrade cost:** `cost = floor(baseCost * 0.1 * 1.22^level)`
- **Generic income (if applicable):** `income = floor(baseHourlyIncome * growthRate^(level-1))`
- **Global boost:** `10x income` for 1 hour (`getGlobalBoostMultiplier`).
- **Stock-based income:** income is scaled by available stock when `stockPerHourPerLevel` > 0.
- **Tax owed after `days` days:** `incomePerHour * taxRate * 24 * days`
- **Suspension threshold:** 5 days (`120h`) of unpaid taxes.
- **Sell price:** `baseCost + sum(upgradeCosts) + 0.5*allTimeEarnings + fleetValue - taxOwed`
- **Upgrade duration:** random `3s` to `45m` (`getUpgradeDuration`).

### Tax Rates by Business

| Type | Tax Rate |
| --- | ---: |
| Bus | 5% |
| Courier | 15% |
| Cafe | 20% |
| Construction | 12% |
| Dealership | 18% |
| Clothing | 22% |
| Gamedev | 25% |
| Movie Studio | 25% |
| Bank | 28% |
| Default | 20% |

### Business-Specific Mechanics

Each major business has its own simulation file (`src/data/`) with deeper tables:
- `bank.js`, `bus.js`, `cafe.js`, `clothing.js`, `construction.js`, `courier.js`, `dealership.js`, `gamedev.js`, `moviestudio.js`.
- Common shared constants:
  - Staff hire cost/salary/hiring times vary by sector.
  - Staff hire time: random `3s` to `45m`.
  - Max concurrent hires: `3`.
  - Staff salary is subtracted from hourly income.
  - Fatigue/repeat penalty caps at **0.6** (`FATIGUE_MAX`) within a 7-day window.
  - Max active projects: `5` (games/movies).

## 5. Legacy / Collection System

### Collection Categories

| Category | Scale | Scaled Price Range | Item Count |
| --- | ---: | --- | ---: |
| Rare Spirits | 500 | $25M – $25B | 18 |
| Ancient Artifacts | 100 | $10M – $50B | 18 |
| Vintage Timepieces | 300 | $30M – $30B | 18 |
| Crown Jewels | 100 | $100M – $100B | 18 |
| Meteorites | 200 | $40M – $40B | 18 |
| First Editions | 300 | $15M – $30B | 18 |
| Domain Empire | 500 | $60M – $25B | 18 |
| Space Ventures | 120 | $120M – $60B | 18 |
| Private Estates | 100 | $1B – $500B | 18 |

### Estate Upgrades (6 lines per property, max level 5)

| Upgrade | Value Bonus / Level | Cost Base (% of estate price) |
| --- | ---: | ---: |
| Landscaped Grounds | +4% | 5% |
| West Wing Extension | +8% | 12% |
| Infinity Pool & Spa | +5% | 6% |
| Climate Wine Cellar | +5% | 5.5% |
| Private Helipad | +7% | 9% |
| Smart Estate Systems | +6% | 7% |

- **Upgrade cost formula:** `estatePrice * costPct * 1.55^level`
- **Guard hire cost:** `estatePrice * 0.02 * 1.4^guards`
- **Guard vault capacity:** +6 slots per guard.
- **Base display slots per estate:** `2 + estateIndex`.
- **Vault base slots:** `2 * displaySlots`.

### Storage Rooms

| Room | Effect |
| --- | --- |
| The Vault | Holds everything not in a display room; expands with guards. |
| The Gallery | Pieces appreciate **2x** the base rate. |
| The Showroom | Contributes 25% of displayed value to Prestige. |

### Appreciation Formula

```
basePrice   = rawPrice * CATEGORY_SCALE
yearsHeld   = elapsedMs / (365 days in ms)
volatility  = 0.5 + hash(id) * 1.3   // ~0.5x – 1.8x base rate
rate        = 0.35 * volatility * (gallery ? 2 : 1)
growth      = 1 + rate * yearsHeld
wobble      = 1 + sin(elapsed/6h + phase) * 0.06
value       = round(basePrice * growth * wobble * improvements)
```

### Estate Income

```
getEstateHourlyIncome = sum(ownedEstateValue * 0.0015)  // 0.15% of value/hr
```

### Set Bonus & Prestige

- **Set bonus:** +2% business income for every completed collection set.
- **Prestige:**
  - `1 point` per $1B of total collection value.
  - `250 points` per completed set.
  - `+ floor(showroomValue / $1B) * (1/4 of displayed value)`.

### Acquisition Channels

| Channel | Cadence | Mechanic |
| --- | --- | --- |
| Retail (Boutique) | 3s – 45m delivery | `marketPrice * 1.5` markup |
| Auction House | 10-minute windows | 3 lots; rivals bid up to `0.8–1.25x` market |
| Private Dealer | Hourly restock | Hidden floor `0.78–0.95x` market; 3 patience |
| The Exchange | 1-minute repricing | Sell at `0.9–1.15x` appreciated value, **8%** commission |

### Channel Formulas

- **Auction opening bid:** `market * (0.45 + rand*0.2)`
- **Auction rival ceiling:** `market * (0.8 + rand*0.45)`
- **Dealer ask:** `market * (1.05 + rand*0.3)`
- **Dealer floor:** `market * (0.78 + rand*0.17)`
- **Exchange multiplier:** `0.9 + rand(window) * 0.25`
- **Exchange proceeds:** `gross * (1 - 0.08)`
- **Auction min increment:** `max(1, round(bid * 0.05))`
- **Rival outbid (if player leading, below ceiling, 50% chance):** `bid * (1.03–1.09)`

## 6. Hardcoded Caps, Bottlenecks & Outliers

| System | Cap / Bottleneck |
| --- | --- |
| Business max level | 30 for every business |
| Business upgrade duration | 3s – 45m random |
| Estate upgrade max level | 5 per upgrade line |
| Estate build time | 20m |
| Guard onboarding | 10m |
| Max concurrent hires (all sectors) | 3 |
| Bus fleet slots | `3 + 27 * (level-1)/29`, so 3 → 30 |
| Bus delivery time | 2 hours |
| Real estate purchase timer | 3 – 8 real hours (App.js) |
| Collection delivery | 3s – 45m |
| Auction window | 10 minutes |
| Dealer window | 1 hour |
| Exchange window | 1 minute |
| Movie / game max active | 5 |
| Contract / movie lifespan | 48h – 96h |
| Fatigue penalty cap | 0.6 (60%) |
| Global business boost | 10x for 1 hour |
| Legacy unlock | $2.5B (`LEGACY_UNLOCK_AT`) |

## 7. Exponential vs Linear Scaling

- **Exponential costs:**
  - Business upgrades (`1.22^level`)
  - Estate upgrades (`1.55^level`)
  - Guard hires (`1.4^guards`)
- **Exponential income (when base > 0):**
  - Generic business income (`growthRate^(level-1)`)
  - Cafe / simple businesses
- **Linear-ish:**
  - Stock/crypto price changes are GBM (log-normal, exponential in price but not deterministic).
  - Real estate income is fixed per asset.
  - Collection appreciation is multiplicative by hold time, but based on a fixed yearly rate.

## 8. Key Source Files

- `src/data/market.js` — stocks, crypto, real estate, price simulation, passive income.
- `src/data/businesses.js` — business categories, upgrade/income/tax formulas.
- `src/data/progression.js` — legacy collections, estate upgrades, auction/dealer/exchange, appreciation.
- `src/data/jobs.js` — job table.
- `src/data/bus.js`, `cafe.js`, `clothing.js`, `construction.js`, `courier.js`, `dealership.js`, `gamedev.js`, `bank.js`, `moviestudio.js` — per-sector simulation constants and tables.
- `App.js` — tick loop, save/load, offline catch-up, unlock thresholds.
