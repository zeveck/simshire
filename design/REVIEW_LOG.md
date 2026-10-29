# Design review log

## Round 1 — findings

### Player
1. MUST: Side cards (128 logical px ≈ 69 CSS px on 844x390 phone) unreadable; notch eats edges. → phone: slide-over info card, goals as tappable icon strip; min 12 CSS px text.
2. MUST: Level 1 harmony 60% is met by base 50 + fed 10 with no likes — tutorial teaches nothing. Re-check all targets vs fed baseline 60 (+5 dragon in L5).
3. SHOULD: No move tool; 50% refund punishes experimenting. → Move tool, or full refund same day + Undo.
4. SHOULD: Players forget loves/grudges. → when a building is selected, show folk portraits with heart/cloud; home ghost shows its folk's loves/grudges; Folk page in pause menu.
5. SHOULD: Preview lacks 5x5 range and the new home's own predicted score. → range highlight, predicted mood on home ghost, outline liked/disliked things.
6. SHOULD: Hunger hits every home at once (−25 → grumpy → mass exodus). → food +X/day in HUD, warning, softer "peckish" stage, pause arrivals when food/day negative.
7. SHOULD: Late levels = rows of farms (60 folk / 6 = 10 farms). → better food scaling; aim food ≈ 1/4 of buildable tiles.
8. SHOULD: Phone top bar 56 logical ≈ 30 CSS; ✓/✕ over map corner. → ≥44 CSS buttons; ✓/✕ fixed outside the map.
9. NICE: "≥2 households each" vs Lair holds 1 unclear; waiting time (2x max). → state "one Lair, dragon Cheerful"; add 3x/fast speed; lively gathering countdown.

### Builder
1. MUST: Maps not designed; can't check that 50/60-folk goals fit 16x9. → ASCII 16x9 map per level (. grass, T forest, ~ water, ^ rock, W well) + reference layout per level with pop/harmony/days; verify headless in node before art.
2. MUST: Happiness model ambiguous: own tile counts for terrain? 4 vs 8 adjacency? Inn halving rounding? Festival Green "within 2" of what? Dragon dislike radius 1 incl. troll bridges? dragon +5 includes itself / evaluation order? empty homes' happiness? harmony weighting & 0/0? L5 ≥2 households vs 1 lair; multiple lairs? → numbered pseudocode in fixed order; defaults suggested: 8-neighbour, own tile counts, round toward zero, max 1 lair, dragon excluded from ≥2 rule, harmony resident-weighted, 0 with no residents.
3. MUST: Day tick order unset → hunger flicker. → (1) production (2) eating, clamp 0, record shortfall (3) fed = no shortfall (4) happiness (5) grumpy counters/move-outs (6) settlers. HUD shows ±food/day.
4. MUST: Placement terrain rules for non-home buildings unset (can a farm go on forest? does building remove forest? Mine on rock or next to? Dock on grass or water? Lair where?). → placement table: terrain, adjacency need, count limit, what happens to terrain. Defaults: non-homes on grass only, forest/rock never consumed, 1 Lair.
5. MUST: Phone sizes: scale ≈0.51 after safe areas; side cards ≈66 CSS px; bar buttons ≈41 CSS; HUD ≈29 CSS; ✓/✕ over map. web-target asks ≥64 CSS for touch controls. → drop side margins on touch, slide-over panels, hit areas ≥96 logical tall, ✓/✕ in bar, info as bottom sheet with ≥28 logical px text.
6. SHOULD: Softlock risks: Market only L4 and costly; L2 rock only on far bank; L4 stone needs (2 troll bridges 16 + bridges 8 > 20); refund rounding. → every level has forest and rock reachable without bridges; refund rounds up; hint "Clear a building to get half back"; headless worst-case check.
7. MUST: Recorded solutions not deterministic with real-time fast-forward. → solutions as steps: {place, tile} while paused, {advanceDays:n}; __game.stepDays(n); run same scripts headless in node; par = reference days × 1.2.
8. SHOULD: Keys 1–7 vs 8–9 buildings in Food & Goods tab; which tab holds Bridge/Troll Bridge; Tab key needs preventDefault; Enter = build vs inspect. → list tab contents; keys 1–9 or 4th tab; Enter builds with tool, inspects otherwise.
9. SHOULD: Bridge only horizontal; shorelines unspecified; "drawn at 64x64" vs "rise 24 px" contradiction. → vertical variants or all crossings one direction; shoreline = soft gradient + foam line from neighbour masks; sprites stored 128x176 drawn 64x88 bottom-anchored.
10. SHOULD: Cut list order: Market cut breaks goblin/troll balance and wood fallback; L4→L5 merge overloads map; stars cheap to keep. → move dragon anim & UI icons ahead; if Market cut give goblin like to Mine; drop the merge.

### Art and sound director
1. MUST: Buildings no headroom (128x128 drawn 64x64). → canvas 128x176 stored, 64x88 drawn, footprint bottom 64x64, bottom-centre anchor; flat items share ground line.
2. MUST: Bridges one direction; rivers both ways in L4. → add bld-bridge-v and bld-troll-bridge-v (imagegen2 edits), or all channels run one way (check in level data).
3. SHOULD: Folk have no draw size / character anchor; trolls & goblins both green. → draw sizes (folk ~28 px tall, dragon ~72); folk-halfling as second anchor; colour/silhouette keys: halfling honey + green waistcoat; dwarf rust beard, wide; elf tall teal cloak; troll big slate-blue mossy; goblin small orange-tan big ears; dragon ember red gold belly.
4. SHOULD: Ground-cover buildings float. → prompt clause "sits on a small soft-edged patch of its own ground, no cast shadow beyond the patch"; code-drawn soft ellipse contact shadow under every building and folk.
5. SHOULD: Missing sounds: hunger, gathering countdown start/interrupt, preview tap, tab/pause/speed, resource tick, star reveal, dragon land; goal tick shares level-complete fanfare. → add sfx-hungry, sfx-gathering, sfx-goal-tick, sfx-star, sfx-dragon-land; UI click covers preview/tab/pause/speed.
6. SHOULD: Music won't loop cleanly (no loop flag in audiogen music). → prompt steady tempo, no fade, 90 s; trim silence, ~2 s crossfade at loop in Web Audio; ambience as separate sfx --loop ≤30 s.
7. SHOULD: Screens need art not listed (how-to cards, level map cards, portraits, intro scroll, tab icons, clear icon, lanterns; butterflies/fish/smoke). → declare these code/composites of existing assets.
8. SHOULD: Halfling-only walk anim inconsistent; dragon-fly brief lacks view/reference. → cut halfling walk; all folk code bob. Dragon: ref folk-dragon first, burrow second, 3/4 top-down, wings up/mid/down/mid, 4 frames 192x192, bottom-centre, 8 fps, noshow; generate folk-dragon with folded wings visible.
9. NICE: Texture seams; levels look alike. → tile-check 4x4, Pillow offset-blend; 2 grass variants; per-level colour grade (fen cooler + code reeds, Ember Fell warmer).
10. NICE: Set imagegen2 model/quality (flare, medium; high for anchor), note price/date in ASSETS.md; title-bg nanogen pro 16:9 2K stored 1920x1080, open sky area top centre for title.

## Round 1 — outcomes

All 29 findings fixed (two "no evidence" art findings fixed anyway since cheap). Highlights:
- Exact 16x9 ASCII maps + reference layouts; headless sim (kept in .gamegen/refsim/) completes every level: days 14/26/39/46/58, harmony 70.0/65, 75.8/70, 76.5/72, 75.9/70, 85.4/80.
- Rules simplified: likes +10, grudges −12 (−6 near Inn), no fed bonus, food as a rate, one settler/day, Clear refunds 100%, terrain never changes, crossings run west–east only.
- Goals: L4 44 folk, L5 56 folk + Festival Green. Day = 3 s at 1x; 2x/3x speeds. Par = reference days × 1.5.
- One layout for desktop and phone: tool column on right, ✓/✕ strip under map, slide-over cards; every tappable ≥44 CSS px.
- 20 sfx incl. ambience; music crossfade loop; step-list solutions with __game.stepDays.

## Round 2 — findings

Builder confirmed doc and reference sim agree exactly (maps, layouts, numbers).

### Player
1. SHOULD: Spreading folk into separate corners always wins; Inn halving and Green lair-calming never used; not "one community". → mixing goal; tighter land; reference must rely on Inn and Green somewhere.
2. SHOULD: All hearts (70) can still fail harmony 72/80, no hint why. → show numbers when harmony chip unmet / highlight low homes / "Delighted" 85+ tier.
3. SHOULD: Every level starts empty → rebuild halfling hamlet 5 times; L5 = 39 placements. → pre-built settled starter hamlet from L2.
4. SHOULD: Goal chips 79x45 CSS too small for text; reason line shares strip. → icon+number chips; failure reason as toast near tile.
5. NICE: Love/grudge icons under ghost unreadable on phone. → fixed strip ≥24 logical icons.
6. NICE: Long wait at end (1 settler/day, 3x max). → more settlers/day when all cheerful or faster speed.

### Builder
1. MUST: Browser replay "pause" opens modal covering map; no setSpeed(0); goToLevel and intro; stepDays semantics. → __game.freeze(true) / setSpeed(0); goToLevel skips intro; stepDays runs normal tick path, stops at completion.
2. SHOULD: Phone sizes assume 852x393 fullscreen; Safari landscape is 734x343 (scale 0.476) → palette 61 CSS, buttons 40, text 11.4; test session lacks insets. → size for 734x343; test session at 734x343; ?insets= debug param; fullscreen button.
3. SHOULD: Goal chip text overflows. → short icon labels; reason replaces chip row temporarily.
4. SHOULD: DoD hunger test impossible (−15 from 70 → 55, no move-out). → rewrite rule text; concrete DoD scenario.
5. SHOULD: Preview floaters must be net delta (clone state, apply, diff all homes incl. dragon warmth, hunger, clamps).
6. SHOULD: Sprite pipeline: fit trimmed sprite inside 120x172 keeping aspect; contact sheet check.
7. NICE: Folk 96x96 too small for portraits → store 256 (dragon 384).
8. NICE: No woff2 tooling → ttf or @fontsource woff2.
9. NICE: verify.mjs should include reachable forest/rock checks.
10. NICE: Save nextId.

### Art and sound director
1. MUST: Bridge sprites gap at ends and grass patch over water; L4 double bridge must join. → exempt from ground clause; deck edge to edge 128 px; no water painted; check side by side.
2. SHOULD: Terrain prop under Tree House/Lair. → don't draw terrain prop under a building.
3. SHOULD: Dock pier direction vs water side. → boathouse with no direction, or mirror + code plank.
4. SHOULD: Grass texture vs building ground patches mismatch; nanogen --image = edit mode. → make grass from crop of burrow ground; feather patch alpha at rim.
5. SHOULD: Love/grudge icons undefined. → footprint crop in parchment circle ≥40 logical, heart/cloud badge; hungry and warmth icons.
6. SHOULD: Folk 96 too small for portraits → 256/384.
7. SHOULD: Tall subjects overflow → min(120/w,176/h).
8. SHOULD: Troll Bridge must read differently from Bridge → visible den door, window, lantern, turf roof; plain bridge grey with rails.
9. NICE: Forest prop repetition → hash mirror/scale/nudge; optional second tree prop.
10. NICE: Dragon fly duplicate frame → reuseFrame; flying draw size.

## Round 2 — outcomes

All 26 findings verified and fixed. Key: Neighbours rule (+5 and a goal from L2), L5 needs every folk in the Festival Green's range; maps redrawn so folk share one village (references rely on the Inn halving in L2/L3/L5 and Green calming in L5); settled starter hamlets L2–L5; Delighted tier 85+; up to 2 settlers/day when no one is grumpy; logical canvas 1440x720 sized for 734x343 Safari landscape; icon goal chips; freeze()/stepDays semantics; art pipeline fixes.

Reference: L1 16/12 pop, 70.0/65, day 8 · L2 25/24, 79.6/72, nb 7/4, day 10 · L3 34/34, 79.6/75, nb 8/6, day 22 · L4 46/44, 78.3/75, nb 14/10, day 17 · L5 56/56, 84.0/82, nb 15/14, day 34.

Decision: converged (no must-fix or should-fix left open); stopping after round 2 as configured.

## Final review (built game)

Playtester and bug hunter: no must-fix. Fixed:
- Party kept running (fireworks + fanfare) on menus after victory → party cleared on leaving; updateParty only on the party screen.
- Touch laptops treated as phones → hover preview per pointer type; turn overlay only for coarse pointers on small screens.
- Game loop had no error guard; bad saves froze the game → try/catch in frame; deserialize validates level, Well, terrain, residents.
- Title waited for all audio → audio loads in the background; music decoded on demand (≤2 tracks kept); resume when not running (iOS interrupted).
- Victory not closable by keyboard; Enter auto-repeat skipped intros; keyboard cursor overrode taps → fixed.
- Level card shows Continue for the level in progress.
- Loves/grudges icons now labelled (intro, folk book); folk book redesigned one folk per row.
- Goals card puts the tapped goal first (L5 harmony help visible).
- Days start at the first build ("Days start when you build").
- "Need more food" warning moved and only while the population goal is unmet; Woodcutter hint moved to step 3.
- Restart asks for confirmation; victory shows stars per level; bigger party dragon and fireworks; hungry bowl icon over homes; stronger per-level colour grades.
Not changed: sw.js keeps the template's cache:'reload' install (correctness after deploys beats one-time double download).
All five solutions re-replayed by clicks (desktop) and taps (phone) after the fixes; verify.mjs passes; no console errors.
