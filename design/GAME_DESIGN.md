# Sim Shire

*Build one cozy shire where every kind of folk, even a dragon, lives side by side in peace.*

## Pitch

A gentle grid-based settlement builder. You place homes, farms, orchards,
bridges and gathering places on a hand-made 16x9 map, and folk move in. Each
folk loves some things and can't stand others nearby, and every folk is
happier with a neighbour of another kind, so the fun is weaving halflings,
dwarves, elves, trolls, goblins and finally a dragon into **one** village
where everyone is content at once. Finish the last map and everybody gathers
on the Festival Green for a lantern-lit party with fireworks.

## Settings

- Platform: both (desktop mouse/keyboard, phone touch in landscape)
- Target: web (plain HTML and JavaScript ES modules, no build step)
- Scope: medium (5 levels, ~34 images, 1 animation, 5 songs, 20 sounds)
- Budget: $20 for generated art and audio
- Tools available: imagegen2, nanogen, anim8gen, audiogen (all keys ok),
  Python + Pillow, node, npm (for @fontsource fonts), playwright-cli for
  play-testing
- Decisions made on the player's behalf:
  - Landscape only on phones; portrait shows a "turn your phone" note.
  - Five levels, one new folk per level (two in level 4), the dragon in the
    fifth.
  - No game over: unhappy households move out, and you can always fix it.
    Clearing a building gives back everything it cost, so experimenting is
    free.
  - From level 2 on, each map starts with a small, already settled hamlet of
    folk you met before, so you never rebuild the same starter village.
  - Generic fantasy folk (halflings, not any trademarked race); all building
    and place names are our own.
  - No roads to draw: any tile you can reach from the Old Well over land or
    bridges is "in the shire".
  - One screen layout for desktop and phone (a tool column on the right), so
    there is only one layout to build and test.

## The player's fantasy

You're the friendly steward of a little valley, the one who knows that the
dwarves need their forge, the elves need their quiet trees, and the halflings
need an orchard within strolling distance, and who finds the spot where they
can all live next door to each other anyway. The reward is a valley full of
tiny contented folk visiting each other, hearts over their roofs, and finally
a party where a dragon lights the sky.

## Core loop

- **10 seconds:** pick a building from the tool column, hover or tap a tile,
  read the preview (its 5x5 range lights up; every home whose happiness would
  change shows its net change, green or red; a home's ghost shows its own
  predicted number and mood), place it. Folk wander, numbers tick up.
- **1 minute:** up to two settlers arrive each day while there's food and a
  happy enough home with room; you earn wood and stone, and fix the one grumpy
  household by moving the noisy Smithy or putting an Inn between rivals.
- **Session:** each level adds a new folk with new likes and grudges, a
  bigger goal and a bigger **Neighbours** goal: more homes that live next to
  a different folk. Finish five levels for the party.

**The mechanic the game lives or dies by: neighbourhood happiness.** Every
home scores itself from what's within 2 tiles of it (a 5x5 square), including
whether a different folk lives there. The preview must make that score
instantly readable, so arranging the village feels like a cozy puzzle, not
spreadsheet work.

## The rules (exact)

These rules are the single source of truth. `game/src/sim.js` implements them
as pure functions (no DOM, no randomness), and the same module runs in Node for
the headless solution check. A working reference implementation is kept in
`.gamegen/refsim/` (sim.js, levels.js, run.js, report.js, hunger.js); every
number in this document comes from it.

### Grid and terrain

- Map: 16 columns x 9 rows. Tile (x,y), x 0–15 left to right, y 0–8 top to
  bottom, (0,0) top-left.
- Terrain letters: `.` grass, `T` forest, `~` water, `^` rock, `L` lair shelf
  (counts as **rock** for every rule; only the Dragon Lair may be built on it),
  `W` the Old Well (a grass tile with the pre-placed Well on it).
- **Terrain never changes.** Building on a tile does not remove its terrain:
  a Tree House still stands in forest, a Troll Bridge over water, the Lair on
  rock. (The terrain *prop* is not drawn under a building; see Art.)
- **All water that needs crossing runs top to bottom**, so every bridge
  crosses west–east and one bridge sprite (and one Troll Bridge sprite)
  suffices.
- **Edge-touch** ("touches") means one of the 4 orthogonal neighbours.
  **Range** means the 5x5 square: tiles with max(|dx|,|dy|) ≤ 2.

### In the shire (reachability)

`inShire` = flood fill (4-neighbour) from the Well tile over every non-water
tile, plus water tiles that hold a Bridge or Troll Bridge. Recomputed whenever
a building is placed or cleared.

### Placement table

A tile must be empty (no building, not the Well). Other rules:

| Building | Tab · key | Stands on | Must also | Cost wood/stone | Does | Limit |
|---|---|---|---|---|---|---|
| Burrow (halflings) | Homes · 1 | grass, in shire | — | 6 / 0 | home, holds 4 | — |
| Stone Hall (dwarves) | Homes · 2 | grass, in shire | touch rock | 4 / 4 | home, holds 3 | — |
| Tree House (elves) | Homes · 3 | forest, in shire | — | 8 / 0 | home, holds 3 | — |
| Troll Bridge (trolls) | Homes · 4 | water | west or east neighbour in shire | 4 / 4 | home, holds 2; also a bridge | — |
| Goblin Warren (goblins) | Homes · 5 | grass, in shire | touch rock or forest | 5 / 0 | home, holds 5 | — |
| Dragon Lair (dragon) | Homes · 6 | lair shelf `L`, in shire | — | 0 / 12 | home, holds 1 | 1 per map |
| Farm | Food · 1 | grass, in shire | — | 4 / 0 | +8 food/day | — |
| Orchard | Food · 2 | grass, in shire | — | 6 / 0 | +4 food/day | — |
| Fishing Dock | Food · 3 | grass, in shire | touch water | 5 / 0 | +5 food/day | — |
| Mushroom Patch | Food · 4 | grass, in shire | — | 3 / 0 | +5 food/day | — |
| Woodcutter | Food · 5 | grass, in shire | touch forest | 4 / 0 | +3 wood/day | — |
| Mine | Food · 6 | grass, in shire | touch rock | 6 / 0 | +2 stone/day | — |
| Market | Food · 7 | grass, in shire | — | 6 / 4 | +3 food, +1 wood, +1 stone/day | — |
| Garden | Gather · 1 | grass, in shire | — | 3 / 0 | liked | — |
| Inn | Gather · 2 | grass, in shire | — | 8 / 4 | liked; halves grudges in range | — |
| Smithy | Gather · 3 | grass, in shire | — | 4 / 4 | liked/disliked | — |
| Music Glade | Gather · 4 | grass, in shire | — | 6 / 0 | liked/disliked | — |
| Festival Green | Gather · 5 | grass, in shire | — | 8 / 8 | +10 to homes in range; calms Lair fear; party spot | — |
| Bridge | Gather · 6 | water | west or east neighbour in shire | 4 / 2 | joins land | — |
| Clear | every tab · 8 | any building but the Well | see below | refund 100% | removes it | — |

- "Food" tab is labelled **Food & Goods**, "Gather" is **Gathering & Paths**.
  Buildings not yet unlocked show a padlock and the level that unlocks them.
- **Clear** removes a building and refunds **its full cost** (starter-hamlet
  buildings too), so moving something is free (clear, then place). Residents
  of a cleared home leave. Clear is refused (with a reason) if it would leave
  any other building outside the shire. The Well can't be cleared.
- Placement failure reasons ("Needs grass", "Must touch rock", "Across the
  water: build a bridge first", "Only one Lair", "Need 3 more wood", …) show
  as a **toast over the map next to the tile** (see Preview).

### Folk

| Folk | Home | Holds | Loves (+10 each kind) | Can't stand (−12 each kind; −6 with an Inn in range) |
|---|---|---|---|---|
| Halflings | Burrow | 4 | Orchard, Garden, Inn | Smithy, Woodcutter, Dragon Lair |
| Dwarves | Stone Hall | 3 | rock, Mine, Smithy, Inn | Tree House, Music Glade |
| Elves | Tree House | 3 | forest, water, Music Glade, Garden | Woodcutter, Smithy, Goblin Warren |
| Trolls | Troll Bridge | 2 | water, Fishing Dock, Inn | Music Glade, Market |
| Goblins | Goblin Warren | 5 | Mushroom Patch, Mine, Market | Tree House, Garden |
| Dragon | Dragon Lair | 1 | rock, Mine, Smithy | Woodcutter, Music Glade |

Every folk also likes **good neighbours** (+5, below). Because terrain is
permanent and the home's own tile is in range, elves always have forest,
trolls always water, and dwarves and the dragon always rock.

### Happiness (pseudocode, in this order)

```
happiness(home):                       # pure; call any time
 1. v = 50
 2. if hungry(): v -= 15               # hungry() = residents() > foodGrown()
 3. kinds = set of building kinds on tiles in range, EXCLUDING the home's own tile
                                       # (the Well counts as kind 'well', liked by no one)
    terr  = set of terrains (forest, water, rock) of ALL tiles in range,
            INCLUDING the home's own tile; 'L' counts as rock
    has(k) = k in kinds or k in terr
 4. for each k in folk.loves: if has(k): v += 10          # each kind once
 5. inn   = 'inn' in kinds
    green = 'green' in kinds
 6. for each k in folk.hates: if has(k):
        if k == 'lair' and green: skip                     # card line "±0 Lair (Green)"
        v -= (inn ? 6 : 12)                                # card line "−6 Smithy (Inn)"
 7. if green: v += 10                                      # once, however many Greens
 8. if neighbourly(home): v += 5                           # "+5 Neighbours"
 9. if home is not the Lair and dragonCheerful(): v += 5   # dragon's warmth
10. return clamp(v, 0, 100)

neighbourly(home): some OTHER home of a DIFFERENT folk, with ≥ 1 resident,
    stands within range of it. (The Lair counts; the dragon is a folk.)
dragonCheerful(): the Lair exists, has its 1 resident, and steps 1–8 + 10
    for the Lair give ≥ 70.
```

- Empty homes have a happiness too (it decides whether settlers come).
- Moods: **Delighted** 85–100 (double heart), **Cheerful** 70–84 (heart),
  **Content** 40–69 (smile), **Grumpy** 0–39 (little storm cloud). "Dragon
  cheerful" in goals means happiness ≥ 70 (Cheerful or Delighted).
- **Harmony** = resident-weighted average: Σ(happiness × residents) /
  Σ(residents) over all homes; 0 when nobody lives in the shire. Shown as
  `floor(harmony)`; goals compare the exact value.
- **Neighbours** (a goal from level 2 on) = number of homes with ≥ 1 resident
  for which `neighbourly(home)` is true. One definition, used for both the +5
  and the goal.
- No rounding anywhere else: all values are integers (12 halves to 6).

### Food, wood and stone

- **Food is a rate, not a stock.** `foodGrown()` = sum of food/day of every
  Farm, Orchard, Fishing Dock, Mushroom Patch and Market. Each resident
  (dragon included) eats 1. HUD shows `eaten / grown`.
- Settlers only arrive while `grown ≥ residents + 1`, so **growth alone never
  makes the shire hungry**. Hunger happens only when you clear food buildings
  (or clear them to move them) so that residents > grown. Then **every home
  gets −15** until you build food again. That does not empty homes by itself:
  a home only loses residents if the −15 drops it below 40 (Grumpy), and then
  one resident leaves every 3 days while it stays Grumpy (see the tick). A
  Cheerful home that turns hungry just becomes Content.
- **Wood and stone are stocks.** Level start: level 1 = 30 wood, 0 stone;
  levels 2–5 = 40 wood, 20 stone. Every level has a grass tile touching forest
  and (levels 2–5) one touching rock that is in the shire at the start, with
  no bridge (checked by verify.mjs). With full refunds you can never get stuck.

### Starter hamlet (levels 2–5)

Each level's data lists `hamlet: [[kind, x, y, residents], …]`. They are
placed at level start in that order (ids 1…k, after the Well's id 0), cost
nothing, start with the listed residents and `grumpyDays = 0`, and are
ordinary buildings from then on (clear for full refund, residents leave). The
listed hamlets are fed (grown ≥ residents) and nobody in them is Grumpy.

### Day tick (one day = 3 s at 1x, 1.5 s at 2x, 1 s at 3x)

```
tick():
 1. Production: wood += 3 per Woodcutter + 1 per Market;
                stone += 2 per Mine + 1 per Market.
 2. Snapshot: hap[h] = happiness(h) for every home (with current residents).
 3. Move-outs: for each home with residents ≥ 1:
        if hap[h] < 40: h.grumpyDays += 1
            if h.grumpyDays ≥ 3: h.residents -= 1; h.grumpyDays = 0   (sfx-moveout)
        else h.grumpyDays = 0
    Homes with 0 residents: grumpyDays = 0.
 4. Settlers (for the whole shire, at most 2 per day):
        n = 2 if (after step 3) no home with residents ≥ 1 has hap[h] < 40, else 1
        repeat n times:
            if foodGrown() < residents() + 1: stop
            candidates = homes with residents < holds and hap[h] ≥ 40
            if none: stop
            pick the one with the fewest residents (current count);
            ties → lowest id; its residents += 1                     (sfx-settler)
 5. Goals: evaluate goalsMet() with fresh happiness;
        if met: gatherDays += 1 else gatherDays = 0
 6. day += 1
 7. if gatherDays ≥ 3: level complete.
```

Placing or clearing happens between ticks. Every building id is its creation
order (`nextId` is saved); this decides ties.

## Levels

Goals are shown as chips (icon + number) in the bottom strip; tapping one
opens a card with the full sentence. All goals must be true at the end of a
day tick for **3 days in a row** ("The folk are gathering… 3, 2, 1"); then
the level is complete.

| # | Level | New folk | Unlocks | Goal | Par days |
|---|---|---|---|---|---|
| 1 | Green Hollow | Halflings | Burrow, Farm, Orchard, Woodcutter, Garden | 12 folk; harmony 65 | 12 |
| 2 | Stonebrook | Dwarves | Bridge, Stone Hall, Mine, Smithy, Inn | 24 folk incl. 6 dwarves; 4 neighbours; harmony 72 | 15 |
| 3 | Elderwood | Elves | Tree House, Fishing Dock, Music Glade | 34 folk incl. 6 elves; 6 neighbours; harmony 75 | 33 |
| 4 | Fenmarsh Crossing | Trolls, Goblins | Troll Bridge, Goblin Warren, Mushroom Patch, Market | 44 folk incl. 4 trolls and 8 goblins; 10 neighbours; harmony 75 | 26 |
| 5 | Ember Fell | the Dragon | Dragon Lair, Festival Green | 56 folk; ≥ 2 lived-in homes each of halflings, dwarves, elves, trolls and goblins; dragon in its Lair and Cheerful; a Festival Green with a lived-in home of **every** folk (dragon too) within its range; 14 neighbours; harmony 82 | 51 |

Par = reference days × 1.5, rounded up. Stars: 3 if days ≤ par, 2 if ≤ 2 ×
par, else 1. Days only pass while the game runs, so thinking while paused is
free.

**Goal chips** (128x96 logical; icon 48 + number 28): folk `👥 25/24`, a
folk portrait with count (`6/6` dwarves), harmony heart `79/72`, neighbours
(two little roofs with a heart) `7/4`, level 5: "every folk ×2" (row of five
mini portraits) `4/5`, dragon portrait `✓/✗`, Green icon `5/6` (folk within
the Green's range). A met chip turns green with a tick (sfx-goal-tick). Card
text examples: "Neighbours: 7 of 4 homes have a neighbour of another folk
within 2 tiles." "Festival Green: a home of every folk (dragon too) within 2
tiles of a Festival Green. Missing: elves."

**Harmony help:** while the harmony goal is unmet, every lived-in home shows
its happiness number (26 logical) above its mood icon. Tapping the harmony
chip outlines (pulsing amber) every home below the target and its card says
"Harmony 76 of 82. 4 homes are below 82 (outlined). Add things they love, a
neighbour of another folk, or an Inn near their grudges."

Learning curve: level 1's hint scroll walks through Burrow → Farm ("folk need
food to move in") → Orchard and Garden within 2 tiles ("halflings love
these") → Woodcutter by the trees, away from Burrows. Harmony 65 can't be met
with one liked thing per Burrow (60), so the tutorial teaches stacking likes.
Level 2 starts beside a settled halfling hamlet; the dwarves' rock is right
next to it, the dwarves love the Smithy the halflings can't stand, and the
Neighbours goal asks them to live together, so the Inn becomes the
peacemaker (its card line "−6 Smithy (Inn)" teaches the halving). Level 3
puts the elves' copse in the middle of the village, between halflings and
dwarves. Level 4 joins two banks with Troll Bridges, between halflings and a
goblin-and-dwarf knoll, with the Market kept away from the trolls. Level 5
asks for every folk around one Festival Green beside the Lair shelf: the
Green calms the halflings' fear of the Lair, and the Inn calms the dwarves
next to the elves.

### Maps (each row is exactly 16 characters)

Legend: `.` grass, `T` forest, `~` water, `^` rock, `L` lair shelf (rock), `W`
Old Well.

**Level 1 — Green Hollow** (meadow, a pond, two little woods; no hamlet)

```
   0123456789012345
 0 TTTT............
 1 TTT.......~~....
 2 TT.......~~~~...
 3 T.........~~....
 4 .......W........
 5 ................
 6 ....TT..........
 7 ...TTT.......TTT
 8 ..TTTT......TTTT
```

**Level 2 — Stonebrook** (a brook at x=8; a rock knoll just south of the
hamlet; big hills on the far bank)

```
   0123456789012345
 0 TTT.....~.....^^
 1 TT......~.....^^
 2 T.......~......^
 3 ........~.......
 4 ......W.~.......
 5 ........~......^
 6 ........~......^
 7 ...^^...~....^^^
 8 ..^^^...~...^^^^
```

Hamlet: Farm 2,3 · Orchard 4,3 · Burrow 3,4 (4) · Burrow 5,4 (4). Start: 8
folk, food 8/12, harmony 60.

**Level 3 — Elderwood** (deep forest round a lake; a copse in the middle of
the meadow; hills to the east)

```
   0123456789012345
 0 TTTTTTT....TTTTT
 1 TTTTTT..~~..TTTT
 2 TTTTT..~~~~..TTT
 3 TTT....~~~.....T
 4 T.....W........^
 5 .............^^^
 6 TT.....TT.....^^
 7 TTTT...TT.......
 8 TTTTT.......TTT^
```

Hamlet: Farm 2,4 · Orchard 4,4 · Burrow 4,3 (4) · Burrow 5,5 (4) · Mine 14,4
· Stone Hall 12,5 (3). Start: 11 folk, food 11/12, harmony 62.73.

**Level 4 — Fenmarsh Crossing** (a two-wide fen channel at x=7–8; a rocky
knoll on the far bank; woods south-east)

```
   0123456789012345
 0 TTT....~~....^^^
 1 TT.....~~.....^^
 2 T......~~......^
 3 .......~~.......
 4 ....W..~~.......
 5 .......~~.^^....
 6 ^^.....~~.^^..TT
 7 ^^^....~~....TTT
 8 ^^^^...~~...TTTT
```

Hamlet: Farm 0,3 · Farm 0,4 · Orchard 2,4 · Garden 2,2 · Tree House 1,1 (3)
· Burrow 3,3 (4) · Burrow 3,5 (4) · Stone Hall 2,6 (3). Start: 14 folk, food
14/20, harmony 70.

**Level 5 — Ember Fell** (hills ring a valley; a river at x=10; the lair
shelf sits at the valley's heart, west of the river)

```
   0123456789012345
 0 ^^^^^^..TT~TTT^^
 1 ^^^^^...TT~...^^
 2 TT^^..L..T~.....
 3 TT....L...~.....
 4 T.........~.....
 5 ...W......~...TT
 6 ......^...~..TTT
 7 ^^........~...TT
 8 ^^^.......~...^^
```

Hamlet: Farm 3,7 · Farm 4,7 · Orchard 2,5 · Burrow 3,4 (4) · Tree House 1,3
(3) · Burrow 2,6 (4) · Stone Hall 1,6 (3). Start: 14 folk, food 14/20,
harmony 65.

### Reference layouts (proof each goal is reachable)

Each layout was run through `.gamegen/refsim` (exactly the rules above):
start from the hamlet, build in the order listed; when a building isn't
affordable yet, run day ticks until it is; after the last building, tick
until complete. Final state below. Map letters: b Burrow, h Stone Hall, t
Tree House, r Troll Bridge, g Goblin Warren, D Dragon Lair, f Farm, o
Orchard, w Woodcutter, m Mine, s Smithy, k Fishing Dock, u Mushroom Patch, =
Bridge, I Inn, n Garden, M Market, G Music Glade, F Festival Green. `*` =
starter-hamlet home.

| Level | Pop / goal | Harmony / target | Neighbours / goal | Placements | Done on day |
|---|---|---|---|---|---|
| 1 | 16 / 12 | 70.00 / 65 | — | 9 | 8 |
| 2 | 25 / 24 (9 dwarves) | 79.56 / 72 | 7 / 4 | 12 | 10 |
| 3 | 34 / 34 (12 elves) | 79.62 / 75 | 8 / 6 | 17 | 22 |
| 4 | 46 / 44 (6 trolls, 10 goblins) | 78.26 / 75 | 14 / 10 | 21 | 17 |
| 5 | 56 / 56 (all folk ×2, dragon 85, 6/6 at the Green) | 83.96 / 82 | 15 / 14 | 25 | 34 |

Without the Inn the same layouts score 66.92 (L2), 74.09 (L3) and 80.96 (L5),
all below target; without the Festival Green level 5's halfling homes beside
the Lair take −12 instead of ±0.

#### Level 1

Build: Burrow 9,4 · Farm 6,5 · Orchard 10,5 · Garden 10,4 · Woodcutter 3,6 ·
Burrow 11,4 · Farm 5,4 · Burrow 9,5 · Burrow 11,5.

```
   0123456789012345
 4 .....f.W.bnb....
 5 ......f..bob....
 6 ...wTT..........
```

Food 2 Farm × 8 + Orchard 4 = 20; residents 16. All four Burrows 4/4 at
**70** (50 +10 Orchard +10 Garden). Harmony 1120 / 16 = 70.00. (Woodcutter
3,6 is 6+ tiles from every Burrow.)

#### Level 2

Build: Woodcutter 2,1 · Mine 2,7 · Stone Hall 3,6 · Inn 4,5 · Smithy 4,6 ·
Stone Hall 5,7 · Garden 5,5 · Burrow 6,5 · Farm 2,4 · Farm 1,4 · Burrow 6,6 ·
Stone Hall 5,8.

```
   0123456789012345
 0 TTT.....~.....^^
 1 TTw.....~.....^^
 2 T.......~......^
 3 ..f.o...~.......
 4 .ffb.bW.~.......
 5 ....Inb.~......^
 6 ...hs.b.~......^
 7 ..m^^h..~....^^^
 8 ..^^^h..~...^^^^
```

Food 3 Farm × 8 + Orchard 4 = 28; residents 25.

| Home | Tile | Res | Happy | How it adds up |
|---|---|---|---|---|
| Burrow * | 3,4 | 4/4 | 79 | 50 +10 Orchard +10 Garden +10 Inn −6 Smithy (Inn) +5 Neighbours |
| Burrow * | 5,4 | 4/4 | 79 | same |
| Stone Hall | 3,6 | 3/3 | 95 | 50 +10 rock +10 Mine +10 Smithy +10 Inn +5 Neighbours |
| Stone Hall | 5,7 | 3/3 | 85 | 50 +10 rock +10 Smithy +10 Inn +5 Neighbours |
| Burrow | 6,5 | 4/4 | 79 | 50 +10 Orchard +10 Garden +10 Inn −6 Smithy (Inn) +5 Neighbours |
| Burrow | 6,6 | 4/4 | 69 | 50 +10 Garden +10 Inn −6 Smithy (Inn) +5 Neighbours |
| Stone Hall | 5,8 | 3/3 | 75 | 50 +10 rock +10 Smithy +5 Neighbours |

Harmony 1989 / 25 = 79.56; neighbours 7.

#### Level 3

Build: Woodcutter 13,7 · Tree House 7,6 · Garden 6,6 · Music Glade 9,7 ·
Tree House 8,7 · Farm 2,5 · Fishing Dock 6,3 · Inn 11,4 · Burrow 10,5 ·
Smithy 11,6 · Stone Hall 13,6 · Orchard 10,6 · Tree House 7,7 · Farm 1,5 ·
Burrow 9,4 · Tree House 8,6 · Garden 5,2.

```
   0123456789012345
 0 TTTTTTT....TTTTT
 1 TTTTTT..~~..TTTT
 2 TTTTTn.~~~~..TTT
 3 TTT.b.k~~~.....T
 4 T.f.o.W..b.I..m^
 5 .ff..b....b.h^^^
 6 TT....ntt.os.h^^
 7 TTTT...ttG...w..
 8 TTTTT.......TTT^
```

Food 3 Farm × 8 + 2 Orchard × 4 + Dock 5 = 37; residents 34.

| Home | Tile | Res | Happy | How it adds up |
|---|---|---|---|---|
| Burrow * | 4,3 | 4/4 | 70 | 50 +10 Orchard +10 Garden |
| Burrow * | 5,5 | 4/4 | 75 | 50 +10 Orchard +10 Garden +5 Neighbours |
| Stone Hall * | 12,5 | 3/3 | 95 | 50 +10 rock +10 Mine +10 Smithy +10 Inn +5 Neighbours |
| Tree House | 7,6 · 8,7 · 7,7 · 8,6 | 3/3 each | 85 | 50 +10 forest +10 Glade +10 Garden +5 Neighbours |
| Burrow | 10,5 | 4/4 | 69 | 50 +10 Orchard +10 Inn −6 Smithy (Inn) +5 Neighbours |
| Stone Hall | 13,6 | 3/3 | 90 | 50 +10 rock +10 Mine +10 Smithy +10 Inn |
| Burrow | 9,4 | 4/4 | 69 | 50 +10 Orchard +10 Inn −6 Smithy (Inn) +5 Neighbours |

Harmony 2707 / 34 = 79.62; neighbours 8.

#### Level 4

Build: Troll Bridge 7,3 · Troll Bridge 8,3 · Woodcutter 12,7 · Fishing Dock
6,2 · Inn 6,4 · Burrow 5,3 · Mine 11,4 · Goblin Warren 10,4 · Mushroom Patch
11,3 · Market 12,3 · Goblin Warren 12,5 · Stone Hall 12,6 · Farm 13,3 · Stone
Hall 9,5 · Farm 4,7 · Orchard 4,6 · Burrow 5,5 · Troll Bridge 7,5 · Garden
4,3 · Farm 5,7 · Stone Hall 9,6.

```
   0123456789012345
 0 TTT....~~....^^^
 1 Tt.....~~.....^^
 2 T.n...k~~......^
 3 f..bnb.rr..uMf..
 4 f.o.W.I~~.gm....
 5 ...b.b.r~h^^g...
 6 ^^h.o..~~h^^h.TT
 7 ^^^.ff.~~...wTTT
 8 ^^^^...~~...TTTT
```

Food 5 Farm × 8 + 2 Orchard × 4 + Dock 5 + Mushroom 5 + Market 3 = 61;
residents 46 (the goal completes before every home is full).

| Home | Tile | Res | Happy | How it adds up |
|---|---|---|---|---|
| Tree House * | 1,1 | 3/3 | 75 | 50 +10 forest +10 Garden +5 Neighbours |
| Burrow * | 3,3 · 3,5 | 4/4 each | 75 | 50 +10 Orchard +10 Garden +5 Neighbours |
| Stone Hall * | 2,6 | 3/3 | 65 | 50 +10 rock +5 Neighbours |
| Troll Bridge | 7,3 · 8,3 | 2/2 each | 85 | 50 +10 water +10 Dock +10 Inn +5 Neighbours |
| Burrow | 5,3 | 4/4 | 75 | 50 +10 Garden +10 Inn +5 Neighbours |
| Goblin Warren | 10,4 · 12,5 | 5/5 each | 85 | 50 +10 Mushroom +10 Mine +10 Market +5 Neighbours |
| Stone Hall | 12,6 · 9,5 | 3/3 each | 75 | 50 +10 rock +10 Mine +5 Neighbours |
| Burrow | 5,5 | 4/4 | 85 | 50 +10 Orchard +10 Garden +10 Inn +5 Neighbours |
| Troll Bridge | 7,5 | 2/2 | 75 | 50 +10 water +10 Inn +5 Neighbours |
| Stone Hall | 9,6 | 2/3 | 75 | 50 +10 rock +10 Mine +5 Neighbours |

Harmony 3600 / 46 = 78.26; neighbours 14. The Market 12,3 is 4 columns from
the nearest troll. Troll Bridges 7,3 + 8,3 are the crossing.

#### Level 5

Build: Troll Bridge 10,4 · Woodcutter 12,6 · Mine 5,3 · Stone Hall 7,3 · Inn
8,3 · Dragon Lair 6,2 · Festival Green 8,4 · Burrow 7,4 · Tree House 9,2 ·
Goblin Warren 7,6 · Mushroom Patch 8,7 · Fishing Dock 9,6 · Troll Bridge 10,5
· Burrow 8,2 · Orchard 7,2 · Goblin Warren 6,5 · Stone Hall 5,6 · Tree House
9,1 · Garden 11,2 · Farm 11,4 · Farm 11,5 · Farm 12,4 · Garden 1,4 · Burrow
4,5 · Tree House 0,3.

```
   0123456789012345
 0 ^^^^^^..TT~TTT^^
 1 ^^^^^...Tt~...^^
 2 TT^^..Dobt~n....
 3 tt...mLhI.~.....
 4 Tn.b...bF.rff...
 5 ..oWb.g...rf..TT
 6 .hb..h^g.k~.wTTT
 7 ^^.ff...u.~...TT
 8 ^^^.......~...^^
```

Food 5 Farm × 8 + 2 Orchard × 4 + Mushroom 5 + Dock 5 = 58; residents 56.
Within range of the Green 8,4: Lair 6,2, Stone Hall 7,3, Burrows 7,4 and 8,2,
Tree House 9,2, Troll Bridges 10,4 and 10,5, Warrens 7,6 and 6,5: all six folk.

| Home | Tile | Res | Happy | How it adds up |
|---|---|---|---|---|
| Dragon Lair | 6,2 | 1/1 | 85 | 50 +10 rock +10 Mine +10 Green +5 Neighbours → Cheerful (warms everyone) |
| Burrow | 7,4 | 4/4 | 90 | 50 +10 Orchard +10 Inn ±0 Lair (Green) +10 Green +5 Neighbours +5 dragon |
| Burrow | 8,2 | 4/4 | 90 | same as 7,4 |
| Stone Hall | 7,3 | 3/3 | 94 | 50 +10 rock +10 Mine +10 Inn −6 Tree House (Inn) +10 Green +5 Neighbours +5 dragon |
| Tree House | 9,2 | 3/3 | 100 | 50 +10 forest +10 water +10 Garden +10 Green +5 Neighbours +5 dragon |
| Tree House | 9,1 | 3/3 | 90 | 50 +10 forest +10 water +10 Garden +5 Neighbours +5 dragon |
| Troll Bridge | 10,4 | 2/2 | 100 | 50 +10 water +10 Dock +10 Inn +10 Green +5 Neighbours +5 dragon |
| Troll Bridge | 10,5 | 2/2 | 95 | 50 +10 water +10 Dock +10 Inn +10 Green +5 dragon |
| Goblin Warren | 7,6 | 5/5 | 80 | 50 +10 Mushroom +10 Green +5 Neighbours +5 dragon |
| Goblin Warren | 6,5 | 5/5 | 90 | 50 +10 Mushroom +10 Mine +10 Green +5 Neighbours +5 dragon |
| Stone Hall | 5,6 | 3/3 | 70 | 50 +10 rock +5 Neighbours +5 dragon |
| Burrow | 4,5 | 4/4 | 70 | 50 +10 Orchard +5 Neighbours +5 dragon |
| Tree House | 0,3 | 3/3 | 75 | 50 +10 forest +10 Garden +5 dragon |
| Burrow * | 3,4 · 2,6 | 4/4 each | 80 | 50 +10 Orchard +10 Garden +5 Neighbours +5 dragon |
| Tree House * | 1,3 | 3/3 | 80 | 50 +10 forest +10 Garden +5 Neighbours +5 dragon |
| Stone Hall * | 1,6 | 3/3 | 70 | 50 +10 rock +5 Neighbours +5 dragon |

Harmony 4702 / 56 = 83.96; neighbours 15 of 17 lived-in homes. Lived-in
homes: halflings 5, dwarves 3, elves 4, trolls 2, goblins 2, dragon 1.

### Solutions for play-testing

Each level's solution is a JSON step list, `design/solutions/level-<n>.json`
(copied from `.gamegen/refsim/steps-<n>.json`, generated by `report.js`):

```json
[{"op":"place","tool":"wood","tile":[2,1]},
 {"op":"advanceDays","n":1},
 {"op":"clear","tile":[6,5]}, ...]
```

- The reference inserts `advanceDays` wherever the next building isn't
  affordable yet, and a final `advanceDays` that runs until the level
  completes. Days at completion: L1 8, L2 10, L3 22, L4 17, L5 34.
- Tool ids: `burrow hall tree troll warren lair farm orchard dock mush wood
  mine market garden inn smithy glade green bridge clear`.
- `design/solutions/hunger.json` (from `refsim/hunger.js`), on level 1:
  place Burrow 9,4 and Farm 6,5 · 2 days (4 halflings, happiness 50) · clear
  the Farm (food 4/0, "Hungry!", Burrow 35 Grumpy) · 3 days (one halfling
  leaves: 3 left) · place the Farm again (50) · 1 day (back to 4).
- **In the browser**: `__game.goToLevel(n)` (straight into play, no intro
  scroll), `__game.freeze(true)` (no day ticks, no modal), then for each
  `place` step click the tool's palette slot (switching tab first) and the
  tile at `__game.tileToScreen(x,y)` (phone: tap the tile, then tap ✓);
  `clear` the same with the Clear slot. `advanceDays` calls
  `__game.stepDays(n)`. After the last step, `__game.state().levelComplete`
  must be true.
- **Headless**: `design/solutions/verify.mjs` imports `game/src/sim.js` and
  `game/src/data.js` in Node, checks every map is 9 rows of 16, every hamlet
  is fed and on legal tiles, that a grass tile touching forest (and, levels
  2–5, one touching rock) is in the shire at the start with no bridge,
  replays every step list and fails if a placement or clear is refused or the
  final pop / harmony / neighbours / completion day differ from the table
  above, and replays hunger.json checking residents go 4 → 3 → 4. Run it
  after any change to rules, data or maps.

## Controls

One layout and one set of actions for both platforms.

Desktop:

| Action | Mouse | Keyboard |
|---|---|---|
| Switch tab | Click a tab | Q / E (or Tab / Shift+Tab, default prevented) |
| Choose a building | Click its slot in the tool column | 1–7 in the current tab |
| Clear tool | Click slot 8 | 8 or X |
| Preview | Hover a tile | Arrow keys / WASD move a tile cursor |
| Build | Left click (or ✓) | Space or Enter |
| Cancel tool, close card | Right click, or ✕ | Esc |
| Inspect | Click a building or tile with no tool selected | Enter with no tool selected |
| Pause | Pause button | P (Esc also opens it when nothing else is open) |
| Speed 1x / 2x / 3x | Speed button cycles | F |
| Mute | Speaker button (music+sound) | M |

The tool stays selected after building, for placing several in a row.

Touch (landscape):

| Action | Touch |
|---|---|
| Choose a building / tab / Clear | Tap the slot / tab |
| Preview | Tap a tile: ghost, range square, net change numbers (and a toast if it can't be built) |
| Build | Tap the same tile again, or tap ✓ |
| Cancel | ✕, or tap the selected slot again |
| Inspect | With no tool selected, tap a building: the info card slides over the far half of the map |
| Goal details | Tap a goal chip |
| Pause / speed / mute / fullscreen | Top of the tool column |

The map never scrolls or zooms: all 16x9 tiles are always visible.

### Screen layout (logical 1440x720, both platforms)

The canvas (2:1) is fitted, aspect kept and letterboxed in parchment colour,
into the **safe-area rectangle** (window minus `env(safe-area-inset-*)`, or
minus the `?insets=l,r,t,b` debug values in CSS px when given). Sized for the
worst case, **iPhone Safari landscape with toolbars, 734x343 CSS**: scale =
min(734/1440, 343/720) = **0.476**. (Fullscreen 852x393 with 59/59/0/21
insets: usable 734x372, scale 0.510. Desktop 1280x720: 0.889; 800x600:
0.556.) So: palette cells ≥ 135 logical (64 CSS), every other tap target ≥ 93
logical (44 CSS), text ≥ 26 logical (12.4 CSS).

| Region | Rect x, y, w, h (logical) | At 0.476 (CSS px) |
|---|---|---|
| HUD strip (read-only): food eaten/grown, wood, stone, folk/goal, harmony heart, day | 0, 0, 1024, 48 | 487 x 23 |
| Map (16x9 tiles of 64) — tile (x,y) at (64x, 48+64y) | 0, 48, 1024, 576 | tile 30.5 |
| Goal chips (up to 6, each 128 x 96, tappable) | 0, 624, 768, 96 | 61 x 45.7 |
| ✓ Build | 768, 624, 128, 96 | 61 x 45.7 |
| ✕ Cancel | 896, 624, 128, 96 | 61 x 45.7 |
| Pause / Speed / Mute / Fullscreen | 1024 + 104·i, 0, 104, 96 (i = 0…3) | 49.5 x 45.7 each |
| Tabs: Homes / Food & Goods / Gathering & Paths (icon + short label) | 1024, 96, 139, 96 · 1163, 96, 139, 96 · 1302, 96, 138, 96 | 66 x 45.7 each |
| Tool palette, slots 1–8 (3 columns x 3 rows; slot 8 = Clear, slot 9 empty) | slot k: x = 1024 + 139·((k−1) mod 3), y = 192 + 136·floor((k−1)/3), 138 x 136 | 65.7 x 64.7 each |
| Loves / grudges strip (display only, while a home tool or home is selected) | 1024, 600, 416, 120 | 198 x 57 |
| Info / goal card (slides over the map half away from the selected tile) | 0, 48, 512, 576 or 512, 48, 512, 576 | 244 x 274 |
| Card close button | card.x + 416, 56, 96, 96 | 45.7 x 45.7 |
| Placement toast (over the map near the tile, 1.5 s) | ≤ 480 x 56, above the tile (below it on rows 0–1), clamped inside the map | — |
| Modals (pause, level complete, folk book) | 360, 60, 720, 600; buttons 560 x 96 | buttons 266 x 45.7 |

- **Fullscreen** button (four corners icon) shows on touch devices where
  `document.documentElement.requestFullscreen` exists (Android, iPad); on
  iPhone it's hidden and the slot is empty. Leaving fullscreen pauses
  nothing.
- **Touch sizes:** the map tiles can't grow: 9 rows of 64 logical plus two
  strips fill the 720 height. Tile taps are made safe instead: the first tap
  only previews with the tile clearly outlined, and nothing is built until a
  second tap on that tile or ✓. Clear also previews first.
- **Text:** never below 26 logical; HUD numbers 28, chips 28, card body 26,
  card titles 36, modal buttons 32. Top-row building sprites overlap the
  bottom 24 px of the HUD strip: draw the HUD background, then map and
  sprites, then HUD items on small parchment pills inside y 4–44.
- **Loves/grudges strip:** a heart row and a cloud row of 52-logical icons
  (see Art), up to 4 loves + 3 grudges + a neighbours icon, for the selected
  home tool's folk (or the selected home). Empty otherwise.

### Preview and info

- **Placement preview** (hover, or first tap): the ghost sprite (tinted red if
  illegal), the 5x5 range outlined, liked things in the ghost's range outlined
  green and disliked ones red, and for a home its predicted happiness number
  and mood icon above the ghost. **Net changes:** the game clones the state,
  applies the placement (or the clear), recomputes every home's happiness with
  the full function (hunger, dragon warmth, neighbours, clamps all included)
  and shows the difference over every home that changes: "+15" green, "−6"
  red. The same code previews Clear.
- **Toast:** when the previewed placement is illegal, its reason appears as a
  parchment toast near the tile (sfx-cant if you try to build).
- **Info card (home):** folk portrait, residents n/holds, happiness and mood,
  and the step-by-step lines from the happiness function ("+10 Orchard",
  "−6 Smithy (Inn)", "±0 Lair (Green)", "+5 Neighbours", "−15 Hungry", "+5
  Dragon's warmth").
- **Info card (other building):** what it makes per day, and the portraits of
  folk who love it (heart) or can't stand it (cloud).
- **Folk book** (pause menu): loves and grudges of every folk unlocked so far.
- **Food chip in HUD:** "eaten / grown". Amber "Need food for new settlers"
  when grown < residents + 1; red "Hungry!" when residents > grown
  (sfx-hungry once).
- **Gathering countdown:** when all goals are met at a day's end, a banner
  "The folk are gathering… 3" counts down with sfx-gathering on start; if a
  goal breaks, "Gathering paused" and the count resets.

## Win, lose and progress

- **Level win:** goals met at the end of 3 days in a row. Then the
  level-complete card: days taken, best, stars (sfx-star per star), Next.
- **Game win:** level 5's win starts the **party**: every resident walks to
  the Festival Green, lanterns light up, music switches to the jig, the
  dragon flies a lap and launches fireworks for ~15 s, then the victory card
  "Every folk, one happy shire" with total stars and Play again.
- **No losing.** Hunger and grudges empty homes; chips, numbers and cards say
  what's wrong. "Restart level" is in the pause menu.
- **Saved** (`localStorage` key `simshire-save-v1`, JSON with `v: 1`, read in
  try/catch): levels unlocked, stars and best days per level, music and sound
  mute, and the in-progress level (`level, day, wood, stone, gatherDays,
  nextId, buildings: [{id, kind, x, y, residents, grumpyDays}]`), saved after
  every tick, placement and clear, so Continue resumes it.

## Screens

- **Title:** painted valley art (title-bg) with the name in the title font,
  Play/Continue, Levels, How to play, mute. The first tap or key starts audio.
- **How to play:** three cards composed in code from game art: build homes
  (Burrow sprite), feed them (Farm + food chip), mind likes, grudges and
  neighbours (a mini info card).
- **Level select:** five cards, each a code-drawn mini map from the level's
  terrain letters, with the new folk's portrait, stars and a padlock.
- **Level intro:** a code-drawn parchment scroll naming the new folk with
  portrait, loves and grudges icons, and "A little hamlet is already here."
- **Gameplay:** the layout above.
- **Pause:** Resume, Folk book, How to play, Restart level, Levels, Music
  on/off, Sound on/off. Opens automatically on `visibilitychange`/blur
  (not while `__game.freeze(true)` is set).
- **Level complete**, **Party + Victory**, **Turn your phone** (portrait on
  touch devices).

## Juice

Must-haves:

- Buildings pop in with a squash-and-stretch bounce and a puff of dust.
- Net change numbers and range outline in the preview.
- Mood icons (double heart / heart / smile / storm cloud) bob above homes; a
  heart burst when a home turns Cheerful or Delighted.
- Residents wander between their home, liked buildings and **neighbouring
  homes of other folk** in range (up to 3 per home, code-moved sprites with a
  walking bob; seeded RNG, visual only), so the mixed village visibly mingles.
- Resource numbers tick up with a pop; "+1" floater per settler.
- Water shimmer and shoreline foam, trees sway gently (code).
- Soft contact-shadow ellipse under every building and folk (code).
- Sound on every action.
- Fireworks, lanterns and confetti in the finale; gentle screen shake when the
  dragon lands.

Nice:

- Day/evening tint cycling slowly.
- Chimney and smithy smoke, butterflies over Gardens, fish near Docks, code
  reeds on Fenmarsh.

## Art direction

- **Style line (in every image prompt):** "cozy storybook illustration, soft
  watercolor and gouache with warm brown ink outlines, gentle golden afternoon
  light, rounded friendly shapes, palette of meadow green, honey gold, warm
  earth brown, river blue and lantern orange, top-down three-quarter view as
  in a tabletop game map, no text".
- **Ground clause** for buildings and props (not bridges): "sits on a small
  soft-edged patch of its own ground, no cast shadow beyond the patch". After
  trimming, the patch's alpha is feathered over its outer ~6 px (Pillow
  Gaussian on the alpha edge) so it melts into the grass.
- **Bridges** (bld-bridge, bld-troll-bridge): no ground clause, no water
  painted, "a bridge deck spanning straight left to right, both ends cut off
  square at the image edges, on a transparent background". After fitting, the
  deck is stretched to exactly 128 px wide (edge to edge) so two bridges side
  by side join with no gap; checked by a Pillow side-by-side test image of two
  copies and of bridge + troll bridge over a water tile.
- **Style anchor:** the halfling Burrow (round green door in a grassy mound
  with a little chimney), made first at quality high. Every later image uses
  it as `--image` reference; folk also use **folk-halfling** as a second
  reference once it exists; bld-troll-bridge uses **bld-bridge** as its
  second reference.
- **Camera:** fixed top-down three-quarter view. Tile 64x64 logical.
- **Sprite canvas:** buildings and props are stored at **128x176** and drawn
  at **64x88**, anchored bottom-centre on the tile's bottom-centre; the bottom
  64x64 is the footprint. Pipeline: generate 1024x1536 transparent, trim,
  scale by **min(120/w, 172/h)** (aspect kept), paste bottom-centred
  (bridges: then stretch to 128 wide). A contact sheet of every sprite on a
  grass tile, at drawn size, is checked by eye before the build.
- **No terrain prop under a building:** forest and rock tiles draw
  ter-trees / ter-rock only when empty. The Tree House prompt includes its own
  big tree, the Lair its own rock, a Troll Bridge its own bridge over the
  code-drawn water.
- **Troll Bridge vs Bridge:** Bridge = plain grey stone arch with low rails.
  Troll Bridge = slate-blue mossy stones, a turf roof over the middle, a round
  den door with a little window, a hanging lantern; must read as a home at
  64 px (checked on the contact sheet).
- **Fishing Dock:** a small boathouse with a jetty stub and a rowing boat,
  symmetric front-on, so it reads the same whichever side the water is.
- **Folk:** stored **256x256** (dragon **384x384**), bottom-centre anchored,
  drawn at: halfling 28 px tall, dwarf 26, elf 36, troll 44, goblin 24,
  dragon 80 (sitting beside the Lair, nudged up-right); portraits (cards,
  chips, intro) use the same image in a parchment circle. Colour and
  silhouette keys: halfling honey-gold curls, green waistcoat; dwarf
  rust-red beard, wide and stocky; elf tall and slim, teal cloak; troll big,
  slate-blue with moss on its shoulders; goblin small, orange-tan, big ears;
  dragon ember-red with a golden belly, wings folded and visible.
- **Love/grudge icons (code-composed at load):** for a building, its
  footprint crop (the bottom 128x128 of the stored sprite) in a parchment
  circle; for forest, rock and water, a crop of ter-trees, ter-rock or
  ter-water; drawn ≥ 40 logical (52 in the strip, 44 on cards) with a small
  heart or storm-cloud badge at the lower right. Hungry (empty bowl), dragon's
  warmth (little flame), neighbours (two little roofs with a heart) and Green
  calm (a lantern) are code-drawn icons.
- **Resolution:** logical 1440x720, backing store multiplied by
  devicePixelRatio.
- **Palette:** meadow green #7DB45A, deep leaf #3F6E3A, honey #E8B64C, earth
  #8A5A3B, river #5B9BC8, lantern orange #F08A3C, parchment #F4E6C4, ink
  #4A3426.
- **Terrain:** **ter-grass** is made in Pillow from a crop of the Burrow
  anchor's own ground (made seamless by offset-and-blend, tiled 4x4 to check
  seams), so building patches and grass match; a second grass variant is the
  first flipped and slightly hue-shifted, mixed by a per-tile hash.
  **ter-water** is a nanogen seamless texture (text-only prompt, then checked
  4x4). Forest tiles draw ter-trees with per-tile hash variation (mirror or
  not, scale ±6%, nudge ±3 px); rock tiles draw ter-rock the same way. Lair
  shelf = ter-rock plus a code-drawn warm ledge glow. Shorelines are
  code-drawn from each water tile's neighbour mask.
- **Per-level colour grade (code overlay):** Green Hollow neutral, Stonebrook
  slightly cool-grey, Elderwood deeper green, Fenmarsh cooler teal with code
  reeds, Ember Fell warmer amber.
- **Code-drawn:** UI panels (parchment with ink borders), tab and button
  icons (incl. fullscreen), the Clear icon (a little spade), mood icons, goal
  chip icons, grid cursor and range outline, ✓/✕, toasts, water shimmer,
  shorelines, shadows, particles, lanterns, fireworks, confetti, butterflies,
  fish, smoke, the intro scroll, level map cards, how-to cards (composited from
  sprites), portraits and love/grudge icons (composited), text.
- **Dragon flight (anim-dragon-fly):** 4 frames, wings up / mid / down / mid,
  with frame 4 = `reuseFrame` of frame 2 (3 generations); drawn at 112
  logical wide, bottom-centre on its flight path, 8 fps.
- **Fonts:** Fredoka (UI and body) and IM Fell English SC (titles), OFL,
  bundled as woff2 from `@fontsource/fredoka` and
  `@fontsource/im-fell-english-sc` (npm, latin subset), with their OFL.txt.
- **Generator settings:** imagegen2 default model (gpt-image-2.5-flare),
  quality medium, high for the anchor; nanogen pro, 16:9 2K for title-bg,
  stored 1920x1080, with an open sky area top-centre for the title. Record
  model, quality and reported usage/cost of every generation in ASSETS.md.

## Audio direction

Music (looping instrumental, ~90 s; prompt "steady tempo throughout, no
intro, no fade-out"). audiogen music has no loop flag, so trim leading and
trailing silence and loop in Web Audio with a ~2 s crossfade at the seam.

- **Title — "Hearth and Hill":** warm pastoral tune, penny whistle, acoustic
  guitar, soft fiddle.
- **Levels 1–2 — "Meadow Morning":** light, plucky, folk strings and flute.
- **Levels 3–4 — "Wood and Fen":** a little more mysterious, harp and low
  whistle, still calm.
- **Level 5 — "Ember Fell":** broader and warmer, gentle drums, horn.
- **Party — "Lantern Jig":** a merry fiddle-and-bodhrán jig (60 s).

Sound effects (short, soft, friendly). A sound id plays at most once per
frame (so `stepDays` and two settlers in one tick give one chime):

| ID | Used for | Sound |
|---|---|---|
| sfx-click | UI tap, tab, preview tap, pause, speed | soft wooden click |
| sfx-build | build | hammer taps and a cheerful thunk |
| sfx-clear | clear | gentle crumble |
| sfx-cant | can't build | soft low bonk |
| sfx-settler | settler arrives | tiny door bell |
| sfx-cheerful | home turns Cheerful or Delighted | bright chime |
| sfx-grumpy | home turns Grumpy | comic grumble |
| sfx-moveout | resident leaves | sad little slide whistle |
| sfx-hungry | shire turns hungry | soft tummy rumble |
| sfx-goal-tick | a goal chip ticks | single bright pluck |
| sfx-gathering | gathering countdown starts | small hand bell |
| sfx-level | level complete | rising flute-and-bells fanfare |
| sfx-star | each star revealed | twinkle ding |
| sfx-unlock | new folk / building unlocked | magical shimmer |
| sfx-dragon | dragon selected / cheerful | friendly rumbling purr |
| sfx-dragon-land | dragon lands in the finale | wing whoosh and soft thump |
| sfx-fw-launch | firework launch | whoosh |
| sfx-fw-burst | firework burst | soft crackle pop |
| sfx-cheer | party | small happy crowd |
| amb-meadow | ambience under levels | birds and brook, `--loop`, 25 s |

## Asset list

| ID | What it is | Tool | Stored size | Transparent | Animation | Priority |
|---|---|---|---|---|---|---|
| bld-burrow | Halfling burrow — STYLE ANCHOR | imagegen2 (high) | 128x176 png | yes | — | must |
| bld-stone-hall | Dwarf stone hall | imagegen2 | 128x176 png | yes | — | must |
| bld-tree-house | Elf tree house built into its own big tree | imagegen2 | 128x176 png | yes | — | must |
| bld-bridge | Plain grey stone arch bridge with low rails, deck edge to edge, no ground, no water | imagegen2 | 128x176 png | yes | — | must |
| bld-troll-bridge | Slate-blue mossy bridge with turf roof, round den door, window, lantern; edge to edge (refs: anchor + bld-bridge) | imagegen2 | 128x176 png | yes | — | must |
| bld-goblin-warren | Goblin warren, mushroom-capped hut | imagegen2 | 128x176 png | yes | — | must |
| bld-dragon-lair | Rocky cave on its own rock outcrop, warm glow | imagegen2 | 128x176 png | yes | — | must |
| bld-farm | Small wheat field, fence, scarecrow | imagegen2 | 128x176 png | yes | — | must |
| bld-orchard | Cluster of apple trees | imagegen2 | 128x176 png | yes | — | must |
| bld-woodcutter | Woodcutter's hut with log pile | imagegen2 | 128x176 png | yes | — | must |
| bld-mine | Mine entrance with cart | imagegen2 | 128x176 png | yes | — | must |
| bld-smithy | Smithy with chimney and anvil | imagegen2 | 128x176 png | yes | — | must |
| bld-dock | Small symmetric boathouse with jetty stub and rowing boat | imagegen2 | 128x176 png | yes | — | must |
| bld-mushroom | Mushroom patch | imagegen2 | 128x176 png | yes | — | must |
| bld-inn | Inn, round-windowed tavern | imagegen2 | 128x176 png | yes | — | must |
| bld-garden | Flower garden with bench | imagegen2 | 128x176 png | yes | — | must |
| bld-market | Market stalls with awnings | imagegen2 | 128x176 png | yes | — | must |
| bld-music-glade | Ring of stones with harp and lanterns | imagegen2 | 128x176 png | yes | — | must |
| bld-festival | Festival green, maypole with bunting | imagegen2 | 128x176 png | yes | — | must |
| bld-well | The Old Well | imagegen2 | 128x176 png | yes | — | must |
| ter-grass | Seamless grass from a crop of the anchor's ground | Pillow (from bld-burrow source) | 128x128 png | no | — | must |
| ter-water | Seamless water texture | nanogen | 128x128 png | no | — | must |
| ter-trees | Clump of trees (forest prop) | imagegen2 | 128x176 png | yes | — | must |
| ter-rock | Rocky outcrop (rock prop) | imagegen2 | 128x176 png | yes | — | must |
| folk-halfling | Halfling villager (second anchor for folk) | imagegen2 | 256x256 png | yes | — | must |
| folk-dwarf | Dwarf villager | imagegen2 | 256x256 png | yes | — | must |
| folk-elf | Elf villager | imagegen2 | 256x256 png | yes | — | must |
| folk-troll | Friendly troll | imagegen2 | 256x256 png | yes | — | must |
| folk-goblin | Friendly goblin | imagegen2 | 256x256 png | yes | — | must |
| folk-dragon | Friendly dragon sitting, wings folded but visible | imagegen2 | 384x384 png | yes | — | must |
| anim-dragon-fly | Dragon flying loop: refs folk-dragon, bld-burrow; 3/4 top-down; wings up / mid / down, frame 4 = reuseFrame 2; bottom-centre anchor; 8 fps; `noshow` | anim8gen | 4 frames 384x384 | yes | 4 frames (3 generated) | should |
| ui-food | Food icon (bread and apple) | imagegen2 | 64x64 png | yes | — | should |
| ui-wood | Wood icon (log) | imagegen2 | 64x64 png | yes | — | should |
| ui-stone | Stone icon | imagegen2 | 64x64 png | yes | — | should |
| title-bg | The valley at golden hour, open sky top-centre | nanogen pro 16:9 2K | 1920x1080 jpg | no | — | must |
| app-icon | Square icon from the Burrow | imagegen2 edit of anchor | 512 png | no | — | should |
| social-card | Link preview card | code (screenshot) | 1200x630 jpg | no | — | must |
| font-fredoka, font-fell | Fredoka, IM Fell English SC + OFL.txt | npm @fontsource | woff2 | — | — | must |
| mus-title | Title music | audiogen | ~90 s mp3 | — | — | must |
| mus-meadow | Levels 1–2 | audiogen | ~90 s mp3 | — | — | must |
| mus-woodfen | Levels 3–4 | audiogen | ~90 s mp3 | — | — | should |
| mus-ember | Level 5 | audiogen | ~90 s mp3 | — | — | should |
| mus-party | Party jig | audiogen | ~60 s mp3 | — | — | must |
| sfx-* (19) and amb-meadow | Listed in the sound table | audiogen | mp3 | — | — | must (amb nice) |

Code-drawn or code-composed, no asset: everything listed under "Code-drawn"
in Art direction, the grass variant, the lair shelf glow, portraits and
love/grudge icons, folk walking (bob), the dragon's finale flight if
anim-dragon-fly is cut. Pipeline checks: the bridge side-by-side image and
the sprite contact sheet.

## Tech plan

- `game/index.html` (canvas, meta, manifest link); `game/src/*.js` ES
  modules: `main.js` (loop, screens), `data.js` (folk, buildings, levels:
  maps as the strings above, hamlets, goals, start resources, par), `sim.js`
  (pure: inShire, canPlace, place, clear, happiness with breakdown,
  neighbourly, harmony, goalsMet with per-goal progress, tick returning
  events, clone, serialize — no DOM, no randomness, importable in Node; port
  of `.gamegen/refsim/sim.js`), `layout.js` (the rects above, fit to the safe
  area / `?insets=`), `render.js`, `ui.js` (HUD, palette, chips, cards,
  toasts, modals with hit-testing), `input.js` (pointer + keyboard to
  actions, "just pressed" latching), `audio.js` (Web Audio, crossfade loops,
  per-frame sfx de-duplication), `save.js`, `fx.js` (particles, fireworks).
- **Preview** = `sim.clone(state)`, apply place/clear on the clone, diff
  `happiness()` of every home against the live state.
- Fixed-timestep update at 60 Hz; the day tick fires when accumulated sim time
  × speed passes 3 s. Pause on `visibilitychange` and blur.
- Saving, service worker, manifest, landscape lock per web-target.md.
- **Debug hook** `window.__game`: `state()` (screen, level, day, food
  {grown, eaten}, wood, stone, pop, harmony, neighbours, goals [{id, met,
  value, target}], gatherDays, homes [{id, kind, x, y, residents,
  happiness}], levelComplete, gameWon), `levels()`, `goToLevel(n)` (loads the
  level with its hamlet straight into play: no intro scroll, no modal),
  `freeze(bool)` (stops day ticks and auto-pause, opens nothing),
  `audioState()`, `tileToScreen(x, y)` and `slotToScreen(tab, slot)` (CSS
  pixel centres), `setSpeed(n)` (up to 20, testing only), `stepDays(n)`
  (runs up to n ticks through the same code path as real time — events,
  floaters, sfx de-duplicated, saves — and stops early when the level
  completes; returns `state()`).
- `design/solutions/level-<n>.json`, `hunger.json` and `verify.mjs` as in
  "Solutions for play-testing".

## Cut list

In order:

1. Day/evening tint, butterflies, fish, chimney smoke, Fenmarsh reeds.
2. Ambience loop (amb-meadow).
3. Separate level 3–4 and level 5 songs (reuse Meadow and Title).
4. UI resource icons (code-drawn instead).
5. Dragon flying animation (the sitting sprite moves along a code arc with a
   bob in the finale).
6. Star ratings (keep days taken).
7. Folk book page (the info card, strip and level intro still show loves and
   grudges).
8. The Delighted tier (fall back to three moods; numbers unchanged).

Never cut: the happiness preview with net changes, the Neighbours goal and
+5, the starter hamlets, the five folk plus the dragon, the five maps as
specified, full-refund Clear, the party finale. The Market stays: it is one
sprite, and the goblin–troll tension needs it.

## Budget estimate

- imagegen2: 31 images + ~15 retries ≈ 46 generations at flare/medium ≈ $5
- anim8gen: 1 animation, 3 frames + retries ≈ 7 generations ≈ $1.3
- nanogen: title-bg (pro) + water texture + retries ≈ $0.8
- audiogen: music ~7 min × $0.30 ≈ $2.1, + one retry each ≈ $1.5; 20 sfx ×
  $0.12 ≈ $2.4, + retries ≈ $1
- Fonts: free (npm). Grass: Pillow.
- Total ≈ $14 of $20. Track the reported usage per generation in ASSETS.md
  and stop to re-plan if spending passes $17.

## Definition of done

- [ ] `node design/solutions/verify.mjs` passes: maps and hamlets valid,
      forest/rock spots reachable without bridges, every placement and clear
      legal, each level completes, final pop / harmony / neighbours /
      completion day match the reference table (or the table is updated with
      the reason), and hunger.json gives residents 4 → 3 → 4.
- [ ] Starts with no console errors at 1280x720, 800x600, phone 734x343, and
      phone 852x393 with `?insets=59,59,0,21`; portrait shows "turn your
      phone".
- [ ] At 734x343 every region matches the layout table: palette cells ≥ 64
      CSS px, every other tappable thing ≥ 44 CSS px, no text under 12 CSS px,
      nothing inside the (simulated) insets; fullscreen button shows where
      supported.
- [ ] All five levels complete by replaying their solutions with real clicks
      (desktop) and taps (phone) using `goToLevel`, `freeze(true)` and
      `stepDays`; the game can be won and the party plays.
- [ ] Hunger scenario (hunger.json) in the browser: after clearing the Farm
      the HUD shows "Hungry!", the Burrow card shows "−15 Hungry" and 35
      Grumpy, 3 days later one halfling has moved out (sfx-moveout), and after
      rebuilding one moves back in. Clear refunds the full cost; a bridge with
      buildings beyond it can't be cleared.
- [ ] Preview numbers equal the actual change after building (checked on 3
      placements, incl. one that turns the dragon Cheerful), and Clear
      previews the same way.
- [ ] Harmony help: with harmony unmet, numbers show over homes; tapping the
      harmony chip outlines homes below target. Failure reasons appear as a
      toast by the tile.
- [ ] Every control in the Controls tables works with mouse, keyboard and
      touch; Tab, Space and arrows don't scroll the page.
- [ ] Music and sound start after the first tap/key, loop without a gap,
      pause with the game; mute works and is saved.
- [ ] Progress and the in-progress level (incl. nextId) are saved and
      restored.
- [ ] Installs as an app and works offline (`?sw=1`).
