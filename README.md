# Chrono Vanguard Prototype

This repository hosts a dependency-free browser prototype for **Chrono Vanguard**. It demonstrates the roguelike loop with a
five-unit party layout, automated combat preview, shop flow, and branching map traversal without requiring a bundler or
framework runtime.

## Getting started

Because the project ships as standard ES modules, any lightweight static server can host it. Two quick options:

1. **Using Python (built-in on most systems):**
   ```bash
   python -m http.server 4173
   ```
   Then open [http://localhost:4173/index.html](http://localhost:4173/index.html) in your browser.

2. **Opening the file directly:** Some browsers block module imports from `file://` URLs. If you see module loading errors,
   prefer the local server approach above.

No `npm install` step is required—the repository already contains everything needed to run the prototype.

## Project structure

```
.
├── index.html
├── src/
│   ├── main.js
│   ├── styles.css
│   ├── data/
│   │   ├── assets.js
│   │   ├── characters.js
│   │   ├── jobs.js
│   │   ├── skills.js
│   │   └── traits.js
│   ├── game/
│   │   ├── combat.js
│   │   ├── jobs.js
│   │   ├── party.js
│   │   ├── rewards.js
│   │   ├── roster.js
│   │   ├── run.js
│   │   ├── shop.js
│   │   ├── traits.js
│   │   ├── units.js
│   │   └── world.js
│   ├── pages/
│   │   ├── combat.js
│   │   ├── map.js
│   │   └── shop.js
│   ├── ui/
│   │   ├── dom.js
│   │   ├── partyView.js
│   │   ├── unitCard.js
│   │   ├── battlefield.js
│   │   ├── audio.js
│   │   ├── tooltip.js
│   │   └── upgradeOverlay.js
│   └── utils/
│       └── nanoid.js
```

## Feature summary

- **Realtime role-driven auto-battler:** Frontline chargers sprint to the nearest foe, midline skirmishers kite to their
  preferred range, and backline supports heal, bless, or curse depending on their calling. Everyone advances and attacks at
  once using per-unit move/attack speeds, simultaneous range checks, and retreat logic that keeps fragile roles safely spaced
  while the battlefield continuously emits attack, heal, shield, and ability events for the canvas playback.
- **Enemy wave variety:** Each encounter now blends bespoke hero-grade foes with skill-less raider grunts, slingers, medics,
  and cult acolytes so QA can see how generic mobs and signature characters interact across the three battlefield rows.
- **Character roster & data atlas:** Eight jobs (검사, 기사, 전사, 궁수, 마법사, 치유사, 축성사, 저주술사) each ship with three named heroes,
  bespoke stat tweaks, signature skills, portrait metadata, and randomized traits. All references live in dedicated modules
  under `src/data/` so designers can tune jobs, skills, traits, and assets independently of the runtime systems.
- **Shop flow:** Generates three random recruits from the 24-character roster, shows their job, skills, traits, and cost, and
  injects them onto the bench while tracking reroll spend.
- **Party management UI:** Role-tinted cards now surface full combat stats, mana pools, skill blurbs, and portrait colours so QA
  can sanity-check frontline/midline/backline compositions at a glance, hover traits for Korean tooltips, and swap bench units
  directly into any frontline/midline/backline slot.
- **Combat viewer:** A responsive 16:9 battlefield frame interpolates unit movement as they close or retreat, draws mana
  bars, highlights abilities/heals with colour-coded tracers, supports realtime fast-forwarding, and relies solely on the
  playback (no more pre-battle outcome forecast) while Web Audio layers ambience and impact effects.
- **Run progression:** Continues to track node depth, completed encounters, and map traversal while keeping party swaps and
  upgraded units intact between pages.
- **Unit fusion:** Collecting three copies of the same hero still triggers the upgrade overlay to merge duplicates and elevate a
  chosen instance with beefed-up stats.

### QA checklist

1. Open the **Shop** to confirm that recruits span 검사/기사/전사/궁수/마법사/치유사/축성사/저주술사 jobs and that each card exposes the
   hero’s unique skill, portrait tint, randomised trait tags, and hover tooltips.
2. Add duplicate heroes to trigger the **three-of-a-kind fusion overlay**, select a preferred instance, and verify that its
   stats increase while the extras are consumed.
3. Launch the **Combat Viewer** and press **Play Battle**. Observe frontline heroes charging forward, midline units
   retreating when threatened, backline supports casting heals/buffs/debuffs, and all units moving/attacking simultaneously.
   Toggle the **Speed ×1/×2** control to fast-forward the realtime playback, and resize the window to confirm the 16:9
   battlefield frame adapts while coloured tracers (yellow for attacks, green for heals, blue for shields) fire and the combat
   log updates.
4. Swap a bench hero into any formation slot from the **Shop**, **Combat**, or **Map** pages to ensure bench-party exchanges
   apply instantly.
5. Resolve the encounter to keep progressing along the **Map** and confirm that run depth, gold, and party state persist
   between pages.

These checkpoints exercise the roguelike loop end-to-end with the new role-based combat and data-driven roster.
