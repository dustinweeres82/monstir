/**
 * Collectibles catalog — MON-58
 * Names matched to reference art sheet. Rarity from filename.
 */

export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export interface CollectibleDef {
  key:    string;
  name:   string;
  rarity: Rarity;
  image:  ReturnType<typeof require>;
}

export const COLLECTIBLES: CollectibleDef[] = [

  // ── Common ────────────────────────────────────────────────────────────────
  { key: 'acorn-common',    name: 'Acorn',            rarity: 'Common', image: require('../../assets/battleui/trophyitems/trophy=acorn_rarity=common.png') },
  { key: 'booger-common',   name: 'Monster Booger',   rarity: 'Common', image: require('../../assets/battleui/trophyitems/trophy=booger_rarity=common.png') },
  { key: 'bottlecap',       name: 'Bottle Cap',       rarity: 'Common', image: require('../../assets/battleui/trophyitems/trophy=bottlecap_rarity=common.png') },
  { key: 'earwax-common',   name: 'Earwax Crystal',   rarity: 'Common', image: require('../../assets/battleui/trophyitems/trophy=earwax_rarity=common.png') },
  { key: 'eyelid',          name: 'Shed Eyelid',      rarity: 'Common', image: require('../../assets/battleui/trophyitems/trophy=eyelid_rarity=common.png') },
  { key: 'fang-common',     name: 'Crusty Fang',      rarity: 'Common', image: require('../../assets/battleui/trophyitems/trophy=fang_rarity=common.png') },
  { key: 'fish',            name: 'Slimy Fish',       rarity: 'Common', image: require('../../assets/battleui/trophyitems/trophy=fish_rarity=common.png') },
  { key: 'horn',            name: 'Moldy Horn Tip',   rarity: 'Common', image: require('../../assets/battleui/trophyitems/trophy=horn_rarity=common.png') },
  { key: 'leaf',            name: 'Leaf',             rarity: 'Common', image: require('../../assets/battleui/trophyitems/trophy=leaf_rarity=common.png') },
  { key: 'pearl',           name: 'Drool Pearl',      rarity: 'Common', image: require('../../assets/battleui/trophyitems/trophy=pearl_rarity=common.png') },
  { key: 'stone',           name: 'Plain Pebble',     rarity: 'Common', image: require('../../assets/battleui/trophyitems/trophy=stone_rarity=common.png') },
  { key: 'tentacle',        name: 'Pocket Tentacle',  rarity: 'Common', image: require('../../assets/battleui/trophyitems/trophy=tentacle_rarity=common.png') },
  { key: 'toenail-common',  name: 'Slimy Toenail',    rarity: 'Common', image: require('../../assets/battleui/trophyitems/trophy=toenail_rarity=common.png') },
  { key: 'tooth-common',    name: 'Mystery Molar',    rarity: 'Common', image: require('../../assets/battleui/trophyitems/trophy=tooth_rarity=common.png') },

  // ── Rare ─────────────────────────────────────────────────────────────────
  { key: 'badge',           name: 'Monster Badge',          rarity: 'Rare', image: require('../../assets/battleui/trophyitems/trophy=badge_rarity=rare.png') },
  { key: 'bandaid',         name: 'Used Monster Bandage',   rarity: 'Rare', image: require('../../assets/battleui/trophyitems/trophy=bandaid_rarity=rare.png') },
  { key: 'booger-rare',     name: 'Shiny Booger',           rarity: 'Rare', image: require('../../assets/battleui/trophyitems/trophy=booger_rarity=rare.png') },
  { key: 'bug',             name: 'Half-Eaten Bug',         rarity: 'Rare', image: require('../../assets/battleui/trophyitems/trophy=bug_rarity=rare.png') },
  { key: 'coupon',          name: 'Damp Coupon',            rarity: 'Rare', image: require('../../assets/battleui/trophyitems/trophy=coupon_rarity=rare.png') },
  { key: 'eyebrow',         name: 'Loose Eyebrow',          rarity: 'Rare', image: require('../../assets/battleui/trophyitems/trophy=eyebrow_rarity=rare.png') },
  { key: 'fur',             name: 'Belly Fur Tumbleweed',   rarity: 'Rare', image: require('../../assets/battleui/trophyitems/trophy=fur_rarity=rare.png') },
  { key: 'gum',             name: 'Ancient Chewing Gum',    rarity: 'Rare', image: require('../../assets/battleui/trophyitems/trophy=gum_rarity=rare.png') },
  { key: 'lint-rare',       name: 'Mystery Lint',           rarity: 'Rare', image: require('../../assets/battleui/trophyitems/trophy=lint_rarity=rare.png') },
  { key: 'meatball',        name: 'Suspicious Meatball',    rarity: 'Rare', image: require('../../assets/battleui/trophyitems/trophy=meatball_rarity=rare.png') },
  { key: 'nugget',          name: 'Questionable Nugget',    rarity: 'Rare', image: require('../../assets/battleui/trophyitems/trophy=nugget_rarity=rare.png') },
  { key: 'pebble',          name: 'Sticky Pebble',          rarity: 'Rare', image: require('../../assets/battleui/trophyitems/trophy=pebble_rarity=rare.png') },
  { key: 'sock-rare',       name: 'Crunchy Sock Fragment',  rarity: 'Rare', image: require('../../assets/battleui/trophyitems/trophy=sock_rarity=rare.png') },
  { key: 'tail',            name: 'Tiny Tail Stub',         rarity: 'Rare', image: require('../../assets/battleui/trophyitems/trophy=tail_rarity=rare.png') },
  { key: 'toenail-rare',    name: 'Pickled Toenail',        rarity: 'Rare', image: require('../../assets/battleui/trophyitems/trophy=toenail_rarity=rare.png') },
  { key: 'tongue',          name: 'Knotted Tongue',         rarity: 'Rare', image: require('../../assets/battleui/trophyitems/trophy=tongue_rarity=rare.png') },
  { key: 'wart',            name: 'Fuzzy Wart',             rarity: 'Rare', image: require('../../assets/battleui/trophyitems/trophy=wart_rarity=rare.png') },

  // ── Epic ─────────────────────────────────────────────────────────────────
  { key: 'acorn-epic',      name: 'Golden Acorn',       rarity: 'Epic', image: require('../../assets/battleui/trophyitems/trophy=acorn_rarity=epic.png') },
  { key: 'bottlecap-epic',  name: 'Cosmic Bottle Cap',  rarity: 'Epic', image: require('../../assets/battleui/trophyitems/trophy=bottlecap_rarity=epic.png') },
  { key: 'button',          name: 'Lucky Button',       rarity: 'Epic', image: require('../../assets/battleui/trophyitems/trophy=button_rarity=epic.png') },
  { key: 'coolrock',        name: 'Cool Rock',          rarity: 'Epic', image: require('../../assets/battleui/trophyitems/trophy=coolrock_rarity=epic.png') },
  { key: 'diamondfang',     name: 'Diamond Fang',       rarity: 'Epic', image: require('../../assets/battleui/trophyitems/trophy=diamondfang_rarity=epic.png') },
  { key: 'earwax-epic',     name: 'Sparkly Earwax',     rarity: 'Epic', image: require('../../assets/battleui/trophyitems/trophy=earwax_rarity=epic.png') },
  { key: 'fang-epic',       name: 'Legendary Fang',     rarity: 'Epic', image: require('../../assets/battleui/trophyitems/trophy=fang_rarity=epic.png') },
  { key: 'feather-epic',    name: 'Rainbow Feather',    rarity: 'Epic', image: require('../../assets/battleui/trophyitems/trophy=feather_rarity=epic.png') },
  { key: 'goldenbooger',    name: 'Golden Booger',      rarity: 'Epic', image: require('../../assets/battleui/trophyitems/trophy=goldenbooger_rarity=epic.png') },
  { key: 'kingblob',        name: 'King Slime Chunk',   rarity: 'Epic', image: require('../../assets/battleui/trophyitems/trophy=kingblob_rarity=epic.png') },
  { key: 'lint-epic',       name: 'Glitter Lint',       rarity: 'Epic', image: require('../../assets/battleui/trophyitems/trophy=lint_rarity=epic.png') },
  { key: 'marble',          name: 'Shiny Marble',       rarity: 'Epic', image: require('../../assets/battleui/trophyitems/trophy=marble_rarity=epic.png') },
  { key: 'rainbowfurball',  name: 'Rainbow Furball',    rarity: 'Epic', image: require('../../assets/battleui/trophyitems/trophy=rainbowfurball_rarity=epic.png') },
  { key: 'shinybug',        name: 'Shiny Bug Shell',    rarity: 'Epic', image: require('../../assets/battleui/trophyitems/trophy=shinybug_rarity=epic.png') },
  { key: 'sock-epic',       name: 'Golden Sock',        rarity: 'Epic', image: require('../../assets/battleui/trophyitems/trophy=sock_rarity=epic.png') },
  { key: 'stick',           name: 'Enchanted Stick',    rarity: 'Epic', image: require('../../assets/battleui/trophyitems/trophy=stick_rarity=epic.png') },
  { key: 'toenail-epic',    name: 'Legendary Toenail',  rarity: 'Epic', image: require('../../assets/battleui/trophyitems/trophy=toenail_rarity=epic.png') },
  { key: 'tooth-epic',      name: 'Mythic Molar',       rarity: 'Epic', image: require('../../assets/battleui/trophyitems/trophy=tooth_rarity=epic.png') },

  // ── Legendary ─────────────────────────────────────────────────────────────
  { key: 'burger',          name: 'Legendary Burger',    rarity: 'Legendary', image: require('../../assets/battleui/trophyitems/trophy=burger_rarity=legendary.png') },
  { key: 'cosmicdandruff',  name: 'Cosmic Dandruff',     rarity: 'Legendary', image: require('../../assets/battleui/trophyitems/trophy=cosmicdandruff_rarity=legendary.png') },
  { key: 'cosmicdrool',     name: 'Cosmic Drool',        rarity: 'Legendary', image: require('../../assets/battleui/trophyitems/trophy=cosmicdrool_rarity=legendary.png') },
  { key: 'cosmiceyecrust',  name: 'Cosmic Eye Crust',    rarity: 'Legendary', image: require('../../assets/battleui/trophyitems/trophy=cosmiceyecrust_rarity=legendary.png') },
  { key: 'cosmiclint',      name: 'Cosmic Lint',         rarity: 'Legendary', image: require('../../assets/battleui/trophyitems/trophy=cosmiclint_rarity=legendary.png') },
  { key: 'crazygem',        name: 'Prism Shard',         rarity: 'Legendary', image: require('../../assets/battleui/trophyitems/trophy=crazygem_rarity=legendary.png') },
  { key: 'diamondscab',     name: 'Diamond Scab',        rarity: 'Legendary', image: require('../../assets/battleui/trophyitems/trophy=diamondscab_rarity=legendary.png') },
  { key: 'droplet',         name: 'Diamond Droplet',     rarity: 'Legendary', image: require('../../assets/battleui/trophyitems/trophy=droplet_rarity=legendary.png') },
  { key: 'feather-leg',     name: 'Celestial Feather',   rarity: 'Legendary', image: require('../../assets/battleui/trophyitems/trophy=feather_rarity=legendary.png') },
  { key: 'fossilearwax',    name: 'Fossil Earwax',       rarity: 'Legendary', image: require('../../assets/battleui/trophyitems/trophy=fossilearwax_rarity=legendary.png') },
  { key: 'gemearwax',       name: 'Gem Earwax',          rarity: 'Legendary', image: require('../../assets/battleui/trophyitems/trophy=gemearwax_rarity=legendary.png') },
  { key: 'gemnugget',       name: 'Gem Nugget',          rarity: 'Legendary', image: require('../../assets/battleui/trophyitems/trophy=gemnugget_rarity=legendary.png') },
  { key: 'goldenapple',     name: 'Platinum Toenail',     rarity: 'Legendary', image: require('../../assets/battleui/trophyitems/trophy=goldenapple_rarity=legendary.png') },
  { key: 'goonugget',       name: 'Goo Nugget',          rarity: 'Legendary', image: require('../../assets/battleui/trophyitems/trophy=goonugget_rarity=legendary.png') },
  { key: 'nosepearl',       name: 'Nose Pearl',          rarity: 'Legendary', image: require('../../assets/battleui/trophyitems/trophy=nosepearl_rarity=legendary.png') },
  { key: 'rainbownugg',     name: 'Rainbow Nugget',      rarity: 'Legendary', image: require('../../assets/battleui/trophyitems/trophy=rainbownugg_rarity=legendary.png') },
  { key: 'spartklytooth',   name: 'Sparkling Tooth',     rarity: 'Legendary', image: require('../../assets/battleui/trophyitems/trophy=spartklytooth_rarity=legendary.png') },
  { key: 'unicorn',         name: 'Unicorn Fragment',    rarity: 'Legendary', image: require('../../assets/battleui/trophyitems/trophy=unicorn_rarity=legendary.png') },
];

/** All items for a given rarity tier */
export function getByRarity(rarity: Rarity): CollectibleDef[] {
  return COLLECTIBLES.filter(c => c.rarity === rarity);
}

/** Pick a random item from a tier, falling back down the ladder if empty */
export function pickForTier(tier: Rarity): CollectibleDef {
  const ladder: Rarity[] = ['Common', 'Rare', 'Epic', 'Legendary'];
  const idx = ladder.indexOf(tier);
  for (let i = idx; i >= 0; i--) {
    const pool = getByRarity(ladder[i]);
    if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
  }
  return COLLECTIBLES[0];
}
