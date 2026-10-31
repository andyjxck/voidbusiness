# Tap Game — Comprehensive Product & Technical Audit

**Audit date:** 27 July 2026  
**Scope:** Entire application: economy, business systems, investments, core tap loop, jobs, UX, consistency, app state, persistence, ad flows, code structure, and reliability.  
**Changes made:** None.

---

## Executive Summary

The application has a strong amount of content and several good individual gameplay ideas: city maps, active production chains, stock/crypto/estate investing, business specializations, timed deliveries, contracts, and upgrades. The current product does not yet operate as one coherent game economy.

The core issue is not a shortage of features. It is that each feature was built as a separate mini-game with its own rules for money, timers, staff, ads, business progression, and state. Players cannot reliably reason about what an hourly income value means, what an upgrade actually changes, when an ad reward is available, or why two businesses that look similar behave differently.

### Immediate conclusions

1. **The accounting model is inconsistent and sometimes wrong.** Losses are hidden or not charged in several systems.
2. **The economy has no unified progression curve.** Entry prices, payout curves, resource requirements, timers, and passive income are not calibrated against one another.
3. **Ads are simulated local countdowns, not rewarded ads.** Every screen implements its own variation.
4. **Staff is four different systems rather than one system.** Most businesses have anonymous counters; Movie Studio has rated people but no names.
5. **The UI is visually consistent in places but behaviorally inconsistent.** Similar cards, tabs, maps, and modals expose different controls and rules.
6. **There is substantial duplicated and legacy code.** This is the main source of current regressions and makes future balancing costly.

---

# Severity Ranking

## P0 — Correct before balancing anything else

### 1. Negative cashflow is hidden or never charged

Several hourly-income functions clamp negative values to `0`. This causes screens to show break-even while payroll and operating cost should create a loss. Movie Studio and Courier also suppress the loss during processing, meaning the player can keep oversized teams for free when revenue is zero.

**Impact:** Finance screens are misleading; business decisions have no reliable downside; every economic balance calculation is compromised.

### 2. There is no single accounting contract

The app uses “income” to mean different things:

- Forecast hourly gross revenue
- Forecast hourly net revenue
- Realized cashflow
- A value clamped at zero
- A value before tax
- A value after automatic tax

A player should always be able to see:

- Gross revenue/hour
- Operating costs/hour
- Payroll/hour
- Tax accrual/hour
- Net cashflow/hour
- Actual cash collected since last tick

### 3. Rewarded ads are not implemented as rewarded ads

All current “ad” behavior is an in-app five-second countdown. The app itself grants the reward when the player presses a button. There is no provider SDK, load state, reward callback, failure state, cooldown, frequency cap, or anti-abuse policy.

**Impact:** The UX promises an ad but is not actually an ad. Reward availability and behavior differ by screen.

### 4. Shared staff can be used multiple times simultaneously

Construction can use the same workers across multiple jobs. Game Dev can use the same team for games and contracts. Movie Studio can cast the same actor/crew member in several active movies.

**Impact:** Staff requirements are not real constraints. Staffing balance and upgrades are undermined.

---

# Whole-Game Economy Audit

## Progression ladder is not calibrated

Business entry prices range from approximately `$4.6k` for a local cafe to `$7.5m` for a bank. That can be valid, but there is no visible target payback period or income-band design tying these costs together.

Examples of incompatible economic assumptions:

- A cafe has deterministic stock-based passive earnings.
- Bus and Courier rely on vehicle asset loops.
- Construction jumps from small jobs to multi-million payouts.
- Game Dev and Movie Studio rely on high-variance release outcomes.
- Bank is expensive but uses simple fixed rate arithmetic.
- Investments use real-time volatility plus passive hourly yields.

The player can exploit whichever system currently offers the best payout/time ratio rather than choosing a business because it is a meaningful strategic path.

## Upgrade costs are based on misleading numbers

For several custom businesses, level-up cost is computed from current `hourly income` while that value may be clamped to zero. This creates flat minimum upgrade costs after losses, during downtime, or before a release. A business can become cheaper to upgrade at its weakest state rather than being tied to capital, assets, or expected marginal value.

Upgrade titles are largely cosmetic. Names such as `Better Cameras`, `AI Risk Assessment`, `Fleet Expansion`, and `Bigger Warehouse` imply specific mechanics, but the global upgrade system mostly applies generic level progression.

## Boost multiplier is over-broad

A global 10x boost is applied to processed income for most custom businesses. It is not consistently framed as applying to gross revenue versus net cashflow, and it is not clearly reconciled with wages, tax, passive income, or time-based sales.

## Tax model needs one policy

Tax rates exist per industry, but taxes are applied through different mechanisms. Some systems calculate/owe tax separately; investments automatically deduct tax; some operational screens show tax finances but do not make tax part of the displayed net cashflow. Define one tax policy before more content is added.

---

# System Audit

## Core tap loop, jobs, events, and onboarding

### Strengths

- Tap progression, jobs, and random events give the player something active to do while businesses run.
- Job cooldowns and rotating subsets prevent the list from being static.
- Market news is a good presentation idea.

### Problems

- The tap loop, jobs, events, business ownership, investments, and ad boosts are separate money faucets with no shared economy budget.
- Job success/rejection state supports legacy number and object formats. This signals state migration/consistency debt.
- Job refreshes are ad-gated through the same simulated reward pattern.
- The player is exposed to many systems before a clear primary loop is established: taps, jobs, business stock, fleets, staff, markets, property, tax, maps, and upgrades.

### Product recommendation

Establish a clear sequence:

1. Tap + job loop
2. First simple business
3. One specialization choice
4. Passive investments
5. Complex city expansion

Do not expose every financial system at once.

## Market and investments

### Strengths

- Asset list is broad and category-based.
- Price history and fluctuating prices create a visible market loop.
- Real estate gives stable passive income while stocks/crypto give volatility.

### Problems

- Market simulation is independent per asset with no sector correlation, macro events, liquidity, or player-facing reason for price movement beyond generated news.
- Price movement uses one large stochastic move for offline elapsed time. A long absence can produce unintuitive jumps instead of a traceable multi-step history.
- Real estate has a 3–8 hour purchase delay while stock/crypto trading is immediate. This can be a valid distinction, but the opportunity cost and payout curve are not explained.
- Passive yields are direct hourly percentages of current price. This is highly generous for some asset classes and can become a dominant money source without requiring operational decisions.
- Pending real-estate purchases are persisted separately from the rest of game state, creating a separate persistence pathway and potential consistency risk.

### Product recommendation

Give investments a stated role: capital preservation, long-term passive income, or high-risk speculation. Calibrate the expected return versus business ROI. Add sector correlation and a small number of understandable events rather than a large list of mostly equivalent assets.

## Generic Cafe businesses

### Strengths

- Simple entry point.
- Stock consumption is understandable.

### Problems

- It is mechanically isolated from custom businesses.
- No staff, locations, events, or production identity.
- The generic detail screen makes it feel like an older, less-developed game than the custom businesses.
- Its deterministic stock loop does not prepare the player for fleet, job, inventory, or production systems.

### Recommendation

Either make cafe the deliberate tutorial business with a path into specialization, or remove/replace it. It currently looks like a prototype path beside the custom game.

## Bus Service

### Strengths

- Best route-planning fantasy in the app.
- District map and connected route constraints are meaningful.
- Maintenance and delivery create an asset lifecycle.

### Problems

- Custom assigned-route income ignores vehicle base hourly income. Cheap and premium buses can earn the same custom-route value.
- The card can display base hourly income while actual assigned-route earnings use district income.
- No drivers/staff/payroll; fleet expansion is only capital constrained.
- Maintenance can scrap a bus randomly; this is a large punishment without robust forecasting, insurance, or a meaningful mitigation decision.
- Delivery ad skip exists, but maintenance and route risk have no equivalent supporting loop.

### Recommendation

Use bus tier/capacity as a multiplier on district demand. Add drivers or dispatch capacity. Make maintenance risk legible before the player pays.

## Courier Service

### Strengths

- Vehicle, zones, job types, mileage, and staffing fit the theme.
- Vehicle tiers are easy to understand.

### Problems

- Payroll losses are clamped away.
- Starts with three staff and no fleet, but neither charges the resulting idle payroll nor explains why they exist.
- Staff are anonymous global capacity; no driver-to-vehicle assignment.
- Job type unlocks require high staff thresholds relative to early fleet scale.
- Global staff can support all qualifying vehicles with no location, shift, or worker allocation.
- Maintenance/scrap risk scales independently of the player’s ability to forecast return.

### Recommendation

Choose one model: either staff are drivers assigned to vehicles, or staff are dispatch capacity. Do not use a generic counter that implies both.

## Game Dev

### Strengths

- Strongest design space: genre/topic/platform/audience combinations, release quality, marketing, contracts, and decaying royalties.
- Multi-select choices create actual player expression.

### Problems

- Negative salary is hidden by the net-income clamp.
- Staff requirements do not reserve staff across active games/contracts.
- Size timing is very short relative to spend and revenue potential; large projects are not meaningfully long-term commitments.
- Contracts and game production compete for the same invisible staff without allocation UI.
- Ad support differs by activity: game/hire skips exist but contract skips do not.
- Rating randomness can overshadow meaningful player choices without a detailed post-release explanation.

### Recommendation

Make staff allocation explicit and make each game’s outcome breakdown visible: genre fit, platform fit, audience, staff, level, marketing, and random factor.

## Construction

### Strengths

- Most complete operational loop: materials, delivery, zones, job offers, crews, payouts, and completion.
- Has a credible active-management feel.

### Problems

- Hourly income is a forecast based on active jobs while cash only arrives at completion.
- The same crew can satisfy several jobs at once.
- Job payouts escalate extremely sharply versus resource cost and business entry cost.
- Construction has far more ad skips than other businesses, giving it a privileged acceleration loop.
- Timers, deliveries, zones, materials, jobs, staff, and finance all live in one highly stateful screen.

### Recommendation

Reserve workers per job, distinguish forecast from realized cash, and put a hard balance table behind job payout/resource/staff/duration ratios.

## Dealership and Clothing

### Strengths

- Visually rich map/inventory/sales loops.
- Timed delivery, upgrading, retail margin, and location expansion are intuitive.

### Problems

- They are almost the same game with different nouns.
- Both process actual losses but display zero instead of a negative hourly result.
- Multi-hire UI loops a one-person hire method; it can charge the requested batch cost when the cap prevents the full batch from being queued.
- Staff are anonymous counters with global bonuses, not location-specific employees.
- All advertisements are locally simulated and have inconsistent coverage.
- Inventory capacity and sale rate mechanics are not sufficiently explained in the UI.

### Recommendation

Extract one shared retail engine. Differentiate the fantasies: dealership should focus on negotiation, financing, trade-ins, brands, and test drives; clothing should focus on trends, collections, sizing, demand seasons, and merchandising.

## Bank

### Strengths

- Branches, vaults, deposits, loan rates, and transaction feeds have a coherent banking theme.
- Rate controls create a real strategic lever.

### Problems

- Extremely high initial price compared with shallow risk management.
- No defaults, loan duration, liquidity reserve, withdrawal runs, customer segments, or credit risk.
- Staff globally improve every branch; employees are not allocated to branches.
- Displayed hourly income hides negative outcomes.
- Interest-rate tuning has no visible demand/sensitivity explanation.

### Recommendation

Either simplify it into a branch-capacity game or deepen it into real bank risk management. The current middle ground is expensive but mechanically thin.

## Movie Studio

### Strengths

- Best attempt at unique individual staff.
- Writing/casting/filming/editing/release chain is a compelling structure.
- Movie quality and revenue decay fit the theme.

### Problems

- Salary losses are not charged.
- Staff have ratings but no names or biographies.
- Actors/crew can be double-booked across productions.
- Sets can be bought but are missing from the active production setup, so their quality bonus is effectively disconnected.
- Legacy and new systems coexist: duplicate modals, unused old movie sizes, old no-op functions, unused state/imports.
- Set cost is weak relative to later movie budgets and rewards.
- No filming/editing skip path, while staff skip exists.
- Script, production, and budget systems are not yet one clean state machine.

### Recommendation

Finish the core production model before expanding it: named staff, availability/reservation, set selection, explicit budget impact, actual negative cashflow, and one canonical production modal.

---

# UX and Layout Audit

## What works

- Visual language is generally coherent: dark base, strong accent colors, rounded cards, iconography, map overlays.
- Custom business tabs help organize complex systems.
- Timer-driven cards communicate progression reasonably well.

## What does not work

- Identical concepts appear in different layouts and with different labels: hires, deliveries, openings, sales, production, timer skips, finance, and staff.
- Some screens are overloaded single files containing map gestures, data mutation, timer processing, modal UX, styling, finance, and state orchestration.
- Finance screens often present a number as “Net Income / hour” without showing its components or reflecting actual processing.
- Multiple screens use compressed one-line JSX. This makes review, debugging, and safe iteration much harder.
- There is no universal “why can’t I do this?” explanation for locks, shortages, missing staff, insufficient budget, or unavailable ad rewards.
- The M&A action is present but explicitly unfinished.

---

# Technical Architecture Audit

## State and persistence

- User/account state uses AsyncStorage.
- Real-estate pending purchases use a separate AsyncStorage key and lifecycle.
- Business state, market state, jobs, holdings, boosts, and timing appear to have different state ownership paths.
- Several systems depend on `Date.now()` and periodic component timers. This increases risk of offline catch-up differences, stale closures, duplicate processing, and screen-specific timer behavior.

## Data model inconsistency

- Hire IDs are split between `id` and `instanceId`.
- Some staff are numbers, some are queued items, some are individual rated people.
- Time fields differ by feature: `deliveredAt`, `completesAt`, `openingAt`, `releasedAt`, `filmingCompletesAt`, and more.
- Several business functions return `{ business, cost }`; others return business directly; others return `{ updatedBusiness, income }`; others return `null` or `{ error }`.

## Duplication and dead code

- Dealership and Clothing are near duplicate data and UI systems.
- Ad countdown/reward logic is duplicated across screens.
- Staff hiring/card/timer logic is duplicated across screens.
- Movie Studio has duplicate legacy and current UI flows coexisting in the same file.
- Upgrade titles are duplicated data but not tied to per-title mechanical effects.

## Reliability risks

- Randomness is used directly from `Math.random()` throughout money-critical systems, without seed/replay/debug tools.
- Timer transitions are distributed across many component effects rather than handled centrally.
- Business processing differs between foreground UI effects and global business processing.
- There are no visible automated tests for finance, offline catch-up, state migrations, timer completion, or purchase validation.

---

# Recommended Remediation Order

## Phase 1 — Make the game truthful

1. Define a shared accounting schema and remove all hidden-loss clamps.
2. Separate gross revenue, payroll, costs, tax, net forecast, and realized cashflow in every business.
3. Create one timer/reward service with a real rewarded-ad provider abstraction.
4. Add tests for all money-changing functions.

## Phase 2 — Make systems consistent

1. Define one typed staff model: employees, roles, availability, hiring batches, salaries, ratings where relevant.
2. Define one standard result shape for actions and one standard timer entity.
3. Extract shared UI primitives for finance, timers, hire batches, ads, maps, locks, and confirmations.
4. Consolidate Dealership and Clothing onto a shared retail engine.

## Phase 3 — Balance progression

1. Create an economy spreadsheet/model with target entry cost, target payback time, hourly risk, active attention, and ad acceleration for every business tier.
2. Decide whether boosts affect gross revenue, net revenue, or only certain activities.
3. Recalibrate passive investments against operating businesses.
4. Make upgrades mechanically meaningful or reduce them to clearly labelled generic level upgrades.

## Phase 4 — Improve fun and identity

1. Make each business own a distinct decision loop.
2. Give staff identity where the fantasy benefits from it, especially Movie Studio, Game Dev, Bank, and dealership sales.
3. Explain outcomes with breakdowns rather than opaque random numbers.
4. Add meaningful failures, trade-offs, and recoveries rather than invisible clamps and arbitrary random penalties.

---

# Final Assessment

The application is a promising prototype with enough content to become a strong management game. The next milestone should not be another business or another map. It should be a stabilization and economy pass.

Until the accounting, staff allocation, reward system, and shared UI/data contracts are unified, adding more features will increase the amount of inconsistent behavior faster than it increases player value.
