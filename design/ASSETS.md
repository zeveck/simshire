# Sim Shire — assets and spending

Pricing note (2026-10-29): gpt-image-2.5-flare output tokens ≈ $30 / 1M (tokencost.app, unconfirmed by OpenAI). Estimates use reported usage, rounded up; a minimum of $0.03 per medium image and $0.08 per high image is assumed to stay safe. nanogen and audiogen use their skills' price tables.

| ID | File | Tool | Prompt (short) | Tries | Est. cost |
|---|---|---|---|---|---|
| bld-burrow (anchor) | game/assets/sprites/bld-burrow.png (+ style-anchor.png) | imagegen2 flare high | round green door in a grassy mound | 1 | $0.08 |

| mus-title | game/assets/audio/music/mus-title.mp3 | audiogen | 90 s pastoral | 1 | $0.45 |
| mus-meadow | game/assets/audio/music/mus-meadow.mp3 | audiogen | 90 s folk strings/flute | 1 | $0.45 |
| mus-woodfen | game/assets/audio/music/mus-woodfen.mp3 | audiogen | 90 s harp/whistle | 1 | $0.45 |
| mus-ember | game/assets/audio/music/mus-ember.mp3 | audiogen | 90 s drum/horn | 1 | $0.45 |
| mus-party | game/assets/audio/music/mus-party.mp3 | audiogen | 60 s jig | 1 | $0.30 |
| sfx-click | game/assets/audio/sfx/sfx-click.mp3 | audiogen | sfx | 1 | $0.12 |
| sfx-build | game/assets/audio/sfx/sfx-build.mp3 | audiogen | sfx | 1 | $0.12 |
| sfx-clear | game/assets/audio/sfx/sfx-clear.mp3 | audiogen | sfx | 1 | $0.12 |
| sfx-cant | game/assets/audio/sfx/sfx-cant.mp3 | audiogen | sfx | 1 | $0.12 |
| sfx-settler | game/assets/audio/sfx/sfx-settler.mp3 | audiogen | sfx | 1 | $0.12 |
| sfx-cheerful | game/assets/audio/sfx/sfx-cheerful.mp3 | audiogen | sfx | 1 | $0.12 |
| sfx-grumpy | game/assets/audio/sfx/sfx-grumpy.mp3 | audiogen | sfx | 1 | $0.12 |
| sfx-moveout | game/assets/audio/sfx/sfx-moveout.mp3 | audiogen | sfx | 1 | $0.12 |
| sfx-hungry | game/assets/audio/sfx/sfx-hungry.mp3 | audiogen | sfx | 1 | $0.12 |
| sfx-goal-tick | game/assets/audio/sfx/sfx-goal-tick.mp3 | audiogen | sfx | 1 | $0.12 |
| sfx-gathering | game/assets/audio/sfx/sfx-gathering.mp3 | audiogen | sfx | 1 | $0.12 |
| sfx-level | game/assets/audio/sfx/sfx-level.mp3 | audiogen | sfx | 1 | $0.12 |
| sfx-star | game/assets/audio/sfx/sfx-star.mp3 | audiogen | sfx | 1 | $0.12 |
| sfx-unlock | game/assets/audio/sfx/sfx-unlock.mp3 | audiogen | sfx | 1 | $0.12 |
| sfx-dragon | game/assets/audio/sfx/sfx-dragon.mp3 | audiogen | sfx | 1 | $0.12 |
| sfx-dragon-land | game/assets/audio/sfx/sfx-dragon-land.mp3 | audiogen | sfx | 1 | $0.12 |
| sfx-fw-launch | game/assets/audio/sfx/sfx-fw-launch.mp3 | audiogen | sfx | 1 | $0.12 |
| sfx-fw-burst | game/assets/audio/sfx/sfx-fw-burst.mp3 | audiogen | sfx | 1 | $0.12 |
| sfx-cheer | game/assets/audio/sfx/sfx-cheer.mp3 | audiogen | sfx | 1 | $0.12 |
| amb-meadow | game/assets/audio/sfx/amb-meadow.mp3 | audiogen --loop | birds and brook 25 s | 1 | $0.12 |
| bld-stone-hall | game/assets/sprites/bld-stone-hall.png | imagegen2 flare medium | building sprite, anchor ref | 2 | $0.06 |
| bld-tree-house | game/assets/sprites/bld-tree-house.png | imagegen2 flare medium | building sprite, anchor ref | 1 | $0.03 |
| bld-bridge | game/assets/sprites/bld-bridge.png | imagegen2 flare medium | building sprite, anchor ref | 2 | $0.06 |
| bld-troll-bridge | game/assets/sprites/bld-troll-bridge.png | imagegen2 flare medium | building sprite, anchor ref | 2 | $0.06 |
| bld-goblin-warren | game/assets/sprites/bld-goblin-warren.png | imagegen2 flare medium | building sprite, anchor ref | 1 | $0.03 |
| bld-dragon-lair | game/assets/sprites/bld-dragon-lair.png | imagegen2 flare medium | building sprite, anchor ref | 1 | $0.03 |
| bld-farm | game/assets/sprites/bld-farm.png | imagegen2 flare medium | building sprite, anchor ref | 2 | $0.06 |
| bld-orchard | game/assets/sprites/bld-orchard.png | imagegen2 flare medium | building sprite, anchor ref | 1 | $0.03 |
| bld-woodcutter | game/assets/sprites/bld-woodcutter.png | imagegen2 flare medium | building sprite, anchor ref | 1 | $0.03 |
| bld-mine | game/assets/sprites/bld-mine.png | imagegen2 flare medium | building sprite, anchor ref | 1 | $0.03 |
| bld-smithy | game/assets/sprites/bld-smithy.png | imagegen2 flare medium | building sprite, anchor ref | 1 | $0.03 |
| bld-dock | game/assets/sprites/bld-dock.png | imagegen2 flare medium | building sprite, anchor ref | 1 | $0.03 |
| bld-mushroom | game/assets/sprites/bld-mushroom.png | imagegen2 flare medium | building sprite, anchor ref | 1 | $0.03 |
| bld-inn | game/assets/sprites/bld-inn.png | imagegen2 flare medium | building sprite, anchor ref | 2 | $0.06 |
| bld-garden | game/assets/sprites/bld-garden.png | imagegen2 flare medium | building sprite, anchor ref | 2 | $0.06 |
| bld-market | game/assets/sprites/bld-market.png | imagegen2 flare medium | building sprite, anchor ref | 1 | $0.03 |
| bld-music-glade | game/assets/sprites/bld-music-glade.png | imagegen2 flare medium | building sprite, anchor ref | 2 | $0.06 |
| bld-festival | game/assets/sprites/bld-festival.png | imagegen2 flare medium | building sprite, anchor ref | 2 | $0.06 |
| bld-well | game/assets/sprites/bld-well.png | imagegen2 flare medium | building sprite, anchor ref | 1 | $0.03 |
| ter-trees | game/assets/tiles/ter-trees.png | imagegen2 | tree clump prop | 1 | $0.03 |
| ter-rock | game/assets/tiles/ter-rock.png | imagegen2 | rock outcrop prop | 1 | $0.03 |
| ter-grass (+2) | game/assets/tiles/ter-grass.png, ter-grass-2.png | Pillow from anchor | crop of anchor grass | - | $0.00 |
| ter-water | game/assets/tiles/ter-water.png | nanogen flash | seamless water | 1 | $0.07 |
| folk-halfling | game/assets/sprites/folk-halfling.png | imagegen2 | halfling, folk anchor | 1 | $0.03 |
| folk-dwarf | game/assets/sprites/folk-dwarf.png | imagegen2 | dwarf | 1 | $0.03 |
| folk-elf | game/assets/sprites/folk-elf.png | imagegen2 | elf | 1 | $0.03 |
| folk-troll | game/assets/sprites/folk-troll.png | imagegen2 | troll | 1 | $0.03 |
| folk-goblin | game/assets/sprites/folk-goblin.png | imagegen2 | goblin | 2 | $0.06 |
| folk-dragon | game/assets/sprites/folk-dragon.png | imagegen2 | sitting dragon | 1 | $0.03 |
| anim-dragon-fly | game/assets/sprites/dragon-fly.png (+frames) | anim8gen | wings up/mid/down | 5 | $0.18 |
| ui-food/wood/stone | game/assets/ui/ui-*.png | imagegen2 | resource icons | 3 | $0.09 |
| title-bg | game/assets/bg/title-bg.jpg | nanogen pro 2K | valley at golden hour | 1 | $0.14 |
| app-icon | game/assets/ui/app-icon.png | imagegen2 edit | burrow app icon | 1 | $0.03 |

**Total: about $6.17 of $20** (audio $4.50, images $1.67). Estimate in the design was ~$14.
