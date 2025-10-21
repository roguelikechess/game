# Progress Notes

## Completed in current iteration
- Shield lifecycle is now centralized in `src/game/combat.js` through `grantShield`, `decayShields`, and `absorbShieldDamage`, ensuring timed shields, duration scaling from spell power, and mitigation helpers for heal/shield reductions.
- Post-cap enemy growth is handled inside `createEnemyCombatant` in `src/game/combat.js`, layering overflow scaling with round-based ramps so late waves keep gaining base stats once level 4 enemies are standard.
- Unit resale values mirror the new progression curve via `getUnitSellValue` in `src/game/shop.js`, matching (cost − 1), (cost × 2 + 1), and (cost × 6 + 5) for level 1–3 units while keeping a level-4 premium in place.
- Shield overlays render on the battlefield health bar through the layered fill logic in `src/ui/battlefield.js`, tinting remaining health versus active shield pools.

## Follow-up ideas
- Playtest late-game encounters after multiple boss clears to confirm the new post-cap ramp still leaves room for comeback strategies and does not require additional drop tuning.
- Audit healer and consecrator kit synergy with the faster shield decay to decide if further tooltip polish or visual feedback is necessary when debuffs are cleansed.
- Revisit inventory and roster tooltips once localisation passes continue, ensuring new terminology (치유 감소, 보호막 감소) stays consistent across UI components.
