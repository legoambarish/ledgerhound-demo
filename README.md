# LedgerHound: interactive demo

A showcase site for **LedgerHound** (Hunt → Prove → Protect), built for the TBO hackathon pitch.
Everything about the fictional platform **TripGrid** is simulated. The cryptography is real: every leaf, node, root, block hash and audit-chain hash is SHA-256 computed in the browser with WebCrypto.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # runs tsc --noEmit, then outputs a static build to dist/ (deploy to Vercel / Netlify as-is)
npm run preview      # serve the built dist/
```

No backend, no external calls, and the fonts are self-hosted, so it works offline on venue Wi-Fi.

## How to present

| Key | Action |
|---|---|
| `T` | Toggle **Overview** ⇄ **Under the hood** (simulation state is kept) |
| `Space` | Pause / resume autoplay |
| `←` / `→` | Previous / next autoplay step |
| `R` | Reset everything to the seeded state (same hashes every time) |

- **▶ Run full demo** plays a scripted ~3-minute story with a caption bar. Clicking, scrolling or touching anything pauses it, so you can take questions. Press Space to carry on.
- **Status pill** (bottom-right) shows the latest block, the current root, and Intact / Verifying / Tamper / Repaired. Click it to jump to the Tamper Lab.
- **Deep links:** `?mode=overview`, `?mode=tech&section=t1` … `t9`. For example, `?mode=tech&section=t5` opens the Tamper Lab directly.

### Suggested live flow

1. Overview → **Try to cheat the system** → "Change a ₹18,400 fare to ₹1". All three lanes play; the end card reads *Caught in 1.xs. Repaired. Sealed in block #…*
2. "A real customer books a trip" gives *Normal business. No false alarm.* This contrast is the key message.
3. **See exactly how →** takes you to the matching technical section.
4. T2 **Ship a new release** shows the deploy → inventory diff → plan → execute → state-change proof → auto-revert → ticket sequence.
5. T5 Tamper Lab: turn off auto-repair, edit a cell, explain the red path and the Merkle proof, then press **Repair now**.
6. T8: **Edit an entry** shows the chain breaking from that entry onward.

## Sections

**Overview:** hero, the problem, Try to cheat (3 synchronised lanes), Hunt · Prove · Protect, demo-target metrics, who it's for, final CTA.

**Under the hood:** each section has an "In plain words" box.

| | Section |
|---|---|
| T1 | Architecture (interactive diagram; edges animate while a scenario runs) |
| T2 | Change detection and API inventory (active / zombie / shadow, generated OpenAPI) |
| T3 | Attack planner (with reasoning), executor log, rate and health gauge, approval queue, kill switch, scope allowlist |
| T4 | Integrity Ledger: rows → leaves → tree → root → chain, plus a live "Verify root" with timing |
| T5 | Tamper Lab: editable cells, presets, legitimate app write, watchdog pipeline, Merkle proof, settings |
| T6 | State-change proof for F-12 (root before and after, row diff, auto-revert) |
| T7 | Findings board with business-context severity and Mark fixed → Retest |
| T8 | Audit-log hash chain: verify, and a simulated cover-up |
| T9 | Demo vs production, cost, honest limits, mapping to the judging criteria |

## What's simulated vs. real

| Real (in your browser) | Simulated |
|---|---|
| `leaf = SHA256(0x00 ‖ canonicalJSON(row))` | TripGrid, its 16 rows, agencies, people, and findings F-02…F-12 |
| `node = SHA256(0x01 ‖ L ‖ R)`, 16 leaves → 5 levels | The EVM chain: blocks every ~4 s, filler txs, and the `IntegrityAnchor` calls |
| Merkle proofs (sibling path, recomputed root ✓/✗) | Hunt agents, LLM planner and executors (scripted scenarios) |
| `block.hash = SHA256(parentHash ‖ txHashes)` | Postgres CDC journal (an in-memory list) |
| `entryHash = SHA256(prevHash ‖ canonicalJSON(entry))` | WORM vault (a copy of the last anchored rows) |
| Watchdog logic: diff walk, journal check, restore, re-verify | Timings are sped up for the stage |

The seeded Merkle root is `3c6d11b2…2c55`. A separate Node `crypto` implementation reproduces the same value.

## Code map

```
src/sim/          pure TypeScript engine (no React)
  crypto.ts       SHA-256, canonical JSON, Merkle build/proof/verify, diff walk, hash chain
  seed.ts         deterministic seeded world (rows, endpoints, findings, audit log, planner)
  chain.ts        mock EVM chain
  scenarios.ts    scenarios as data + watchdog/animation timings (CONFIG)
  store.ts        zustand store: rows, tree, journal, vault, chain, findings, audit, events, watchdog
  director.ts     autoplay script
src/modes/overview/   advert-style sections
src/modes/technical/  T1–T9
src/components/       MerkleTree, BlockStrip, EventFeed, RowTable, StatusPill, TopBar, DirectorBar…
```

Both modes read the **same store**. A tamper you trigger in Overview is already reflected in the tree, chain, feed and status pill when you switch modes.
