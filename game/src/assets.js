// Image loading. Missing images are tolerated: the renderer falls back to code shapes.
export const IMG = {};
const LIST = {
  'bld-burrow': 'sprites/bld-burrow.png', 'bld-stone-hall': 'sprites/bld-stone-hall.png', 'bld-tree-house': 'sprites/bld-tree-house.png',
  'bld-troll-bridge': 'sprites/bld-troll-bridge.png', 'bld-goblin-warren': 'sprites/bld-goblin-warren.png', 'bld-dragon-lair': 'sprites/bld-dragon-lair.png',
  'bld-farm': 'sprites/bld-farm.png', 'bld-orchard': 'sprites/bld-orchard.png', 'bld-woodcutter': 'sprites/bld-woodcutter.png',
  'bld-mine': 'sprites/bld-mine.png', 'bld-smithy': 'sprites/bld-smithy.png', 'bld-dock': 'sprites/bld-dock.png',
  'bld-mushroom': 'sprites/bld-mushroom.png', 'bld-bridge': 'sprites/bld-bridge.png', 'bld-inn': 'sprites/bld-inn.png',
  'bld-garden': 'sprites/bld-garden.png', 'bld-market': 'sprites/bld-market.png', 'bld-music-glade': 'sprites/bld-music-glade.png',
  'bld-festival': 'sprites/bld-festival.png', 'bld-well': 'sprites/bld-well.png',
  'ter-grass': 'tiles/ter-grass.png', 'ter-grass-2': 'tiles/ter-grass-2.png', 'ter-water': 'tiles/ter-water.png',
  'ter-trees': 'tiles/ter-trees.png', 'ter-rock': 'tiles/ter-rock.png',
  'folk-halfling': 'sprites/folk-halfling.png', 'folk-dwarf': 'sprites/folk-dwarf.png', 'folk-elf': 'sprites/folk-elf.png',
  'folk-troll': 'sprites/folk-troll.png', 'folk-goblin': 'sprites/folk-goblin.png', 'folk-dragon': 'sprites/folk-dragon.png',
  'dragon-fly': 'sprites/dragon-fly.png',
  'ui-food': 'ui/ui-food.png', 'ui-wood': 'ui/ui-wood.png', 'ui-stone': 'ui/ui-stone.png',
  'title-bg': 'bg/title-bg.jpg',
};
export const SPRITE_OF = {
  burrow: 'bld-burrow', hall: 'bld-stone-hall', tree: 'bld-tree-house', troll: 'bld-troll-bridge', warren: 'bld-goblin-warren',
  lair: 'bld-dragon-lair', farm: 'bld-farm', orchard: 'bld-orchard', wood: 'bld-woodcutter', mine: 'bld-mine', smithy: 'bld-smithy',
  dock: 'bld-dock', mush: 'bld-mushroom', bridge: 'bld-bridge', inn: 'bld-inn', garden: 'bld-garden', market: 'bld-market',
  glade: 'bld-music-glade', green: 'bld-festival', well: 'bld-well',
};

export function loadImages() {
  return Promise.all(Object.entries(LIST).map(([id, path]) => new Promise(res => {
    const im = new Image();
    im.onload = () => { IMG[id] = im; res(); };
    im.onerror = () => res();
    im.src = 'assets/' + path;
  })));
}
