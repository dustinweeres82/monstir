/**
 * Collectibles catalog — MON-58
 * Names matched to reference art sheet. Rarity from filename.
 * Each relic carries a unique `tagline` (lore one-liner) surfaced on the relic
 * detail screen and milestone hero footer.
 */

export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export interface CollectibleDef {
  key:     string;
  name:    string;
  rarity:  Rarity;
  tagline: string;
  image:   ReturnType<typeof require>;
}

export const COLLECTIBLES: CollectibleDef[] = [

  // ── Common ────────────────────────────────────────────────────────────────
  { key: 'acorn-common',    name: 'Acorn',            rarity: 'Common', tagline: 'A perfectly normal acorn. The squirrel wants it back.',          image: require('../../assets/battleui/trophyitems/trophy=acorn_rarity=common.png') },
  { key: 'booger-common',   name: 'Monster Booger',   rarity: 'Common', tagline: "Still slightly warm. Don't ask from where.",                     image: require('../../assets/battleui/trophyitems/trophy=booger_rarity=common.png') },
  { key: 'bottlecap',       name: 'Bottle Cap',       rarity: 'Common', tagline: 'Pried off something fizzy. A tiny trophy of thirst.',            image: require('../../assets/battleui/trophyitems/trophy=bottlecap_rarity=common.png') },
  { key: 'earwax-common',   name: 'Earwax Crystal',   rarity: 'Common', tagline: 'Mined from deep within. Surprisingly shiny.',                    image: require('../../assets/battleui/trophyitems/trophy=earwax_rarity=common.png') },
  { key: 'eyelid',          name: 'Shed Eyelid',      rarity: 'Common', tagline: 'It blinked once. Now it just sits there.',                       image: require('../../assets/battleui/trophyitems/trophy=eyelid_rarity=common.png') },
  { key: 'fang-common',     name: 'Crusty Fang',      rarity: 'Common', tagline: "Fell out mid-chomp. The monster didn't even notice.",            image: require('../../assets/battleui/trophyitems/trophy=fang_rarity=common.png') },
  { key: 'fish',            name: 'Slimy Fish',       rarity: 'Common', tagline: "Been in a pocket a while. It still remembers the sea.",          image: require('../../assets/battleui/trophyitems/trophy=fish_rarity=common.png') },
  { key: 'horn',            name: 'Moldy Horn Tip',   rarity: 'Common', tagline: 'Snapped off in a headbutt. Wears its dents proudly.',            image: require('../../assets/battleui/trophyitems/trophy=horn_rarity=common.png') },
  { key: 'leaf',            name: 'Leaf',             rarity: 'Common', tagline: 'Just a leaf. But it followed you home.',                          image: require('../../assets/battleui/trophyitems/trophy=leaf_rarity=common.png') },
  { key: 'pearl',           name: 'Drool Pearl',      rarity: 'Common', tagline: 'Formed over a thousand naps. Weirdly pretty.',                   image: require('../../assets/battleui/trophyitems/trophy=pearl_rarity=common.png') },
  { key: 'stone',           name: 'Plain Pebble',     rarity: 'Common', tagline: 'Aggressively ordinary. And yet you kept it.',                    image: require('../../assets/battleui/trophyitems/trophy=stone_rarity=common.png') },
  { key: 'tentacle',        name: 'Pocket Tentacle',  rarity: 'Common', tagline: "Wiggles when no one's looking. Probably.",                       image: require('../../assets/battleui/trophyitems/trophy=tentacle_rarity=common.png') },
  { key: 'toenail-common',  name: 'Slimy Toenail',    rarity: 'Common', tagline: 'Clipped with great effort. Glows faintly in the dark.',         image: require('../../assets/battleui/trophyitems/trophy=toenail_rarity=common.png') },
  { key: 'tooth-common',    name: 'Mystery Molar',    rarity: 'Common', tagline: "Whose tooth is this? Best not to investigate.",                 image: require('../../assets/battleui/trophyitems/trophy=tooth_rarity=common.png') },

  // ── Rare ─────────────────────────────────────────────────────────────────
  { key: 'badge',           name: 'Monster Badge',          rarity: 'Rare', tagline: 'Earned, not given. The monster pinned it on you itself.',     image: require('../../assets/battleui/trophyitems/trophy=badge_rarity=rare.png') },
  { key: 'bandaid',         name: 'Used Monster Bandage',   rarity: 'Rare', tagline: 'It healed a great wound. Mostly a stubbed toe.',              image: require('../../assets/battleui/trophyitems/trophy=bandaid_rarity=rare.png') },
  { key: 'booger-rare',     name: 'Shiny Booger',           rarity: 'Rare', tagline: 'Buffed to a high shine. A questionable use of time.',         image: require('../../assets/battleui/trophyitems/trophy=booger_rarity=rare.png') },
  { key: 'bug',             name: 'Half-Eaten Bug',         rarity: 'Rare', tagline: 'Someone got full halfway through. Their loss, your gain.',     image: require('../../assets/battleui/trophyitems/trophy=bug_rarity=rare.png') },
  { key: 'coupon',          name: 'Damp Coupon',            rarity: 'Rare', tagline: 'Expired in another dimension. Still feels valuable.',          image: require('../../assets/battleui/trophyitems/trophy=coupon_rarity=rare.png') },
  { key: 'eyebrow',         name: 'Loose Eyebrow',          rarity: 'Rare', tagline: 'It conveyed so much. Now it conveys nothing.',                image: require('../../assets/battleui/trophyitems/trophy=eyebrow_rarity=rare.png') },
  { key: 'fur',             name: 'Belly Fur Tumbleweed',   rarity: 'Rare', tagline: 'Rolled in from the under-couch wilderness.',                  image: require('../../assets/battleui/trophyitems/trophy=fur_rarity=rare.png') },
  { key: 'gum',             name: 'Ancient Chewing Gum',    rarity: 'Rare', tagline: 'Still has a faint flavor. Do NOT chew it.',                   image: require('../../assets/battleui/trophyitems/trophy=gum_rarity=rare.png') },
  { key: 'lint-rare',       name: 'Mystery Lint',           rarity: 'Rare', tagline: 'Every pocket grows one. This one grew teeth.',                image: require('../../assets/battleui/trophyitems/trophy=lint_rarity=rare.png') },
  { key: 'meatball',        name: 'Suspicious Meatball',    rarity: 'Rare', tagline: 'It rolled away once. You caught it. Barely.',                 image: require('../../assets/battleui/trophyitems/trophy=meatball_rarity=rare.png') },
  { key: 'nugget',          name: 'Questionable Nugget',    rarity: 'Rare', tagline: 'Origin unknown. Crunch level: alarming.',                     image: require('../../assets/battleui/trophyitems/trophy=nugget_rarity=rare.png') },
  { key: 'pebble',          name: 'Sticky Pebble',          rarity: 'Rare', tagline: 'It will not let go of your hand. Ever.',                       image: require('../../assets/battleui/trophyitems/trophy=pebble_rarity=rare.png') },
  { key: 'sock-rare',       name: 'Crunchy Sock Fragment',  rarity: 'Rare', tagline: 'All that remains of a sock that fought hard.',                image: require('../../assets/battleui/trophyitems/trophy=sock_rarity=rare.png') },
  { key: 'tail',            name: 'Tiny Tail Stub',         rarity: 'Rare', tagline: "Wags on its own when you're happy. Science can't explain it.", image: require('../../assets/battleui/trophyitems/trophy=tail_rarity=rare.png') },
  { key: 'toenail-rare',    name: 'Pickled Toenail',        rarity: 'Rare', tagline: 'Preserved at the peak of freshness. Tangy.',                  image: require('../../assets/battleui/trophyitems/trophy=toenail_rarity=rare.png') },
  { key: 'tongue',          name: 'Knotted Tongue',         rarity: 'Rare', tagline: 'Said too many tongue twisters. This is the result.',          image: require('../../assets/battleui/trophyitems/trophy=tongue_rarity=rare.png') },
  { key: 'wart',            name: 'Fuzzy Wart',             rarity: 'Rare', tagline: 'Soft, round, and weirdly loyal. A good wart.',                image: require('../../assets/battleui/trophyitems/trophy=wart_rarity=rare.png') },

  // ── Epic ─────────────────────────────────────────────────────────────────
  { key: 'acorn-epic',      name: 'Golden Acorn',       rarity: 'Epic', tagline: 'Pure gold, grown overnight. The squirrels formed a search party.', image: require('../../assets/battleui/trophyitems/trophy=acorn_rarity=epic.png') },
  { key: 'bottlecap-epic',  name: 'Cosmic Bottle Cap',  rarity: 'Epic', tagline: 'Twisted off a soda from another galaxy. Still fizzy.',           image: require('../../assets/battleui/trophyitems/trophy=bottlecap_rarity=epic.png') },
  { key: 'button',          name: 'Lucky Button',       rarity: 'Epic', tagline: 'Fell off something important. Brings 7% more luck, untested.',   image: require('../../assets/battleui/trophyitems/trophy=button_rarity=epic.png') },
  { key: 'coolrock',        name: 'Cool Rock',          rarity: 'Epic', tagline: "It's just cool, okay? You don't have to explain a cool rock.",   image: require('../../assets/battleui/trophyitems/trophy=coolrock_rarity=epic.png') },
  { key: 'diamondfang',     name: 'Diamond Fang',       rarity: 'Epic', tagline: 'Bit down on a meteor once. Won.',                                image: require('../../assets/battleui/trophyitems/trophy=diamondfang_rarity=epic.png') },
  { key: 'earwax-epic',     name: 'Sparkly Earwax',     rarity: 'Epic', tagline: 'Catches the light at exactly the wrong moment. Dazzling.',       image: require('../../assets/battleui/trophyitems/trophy=earwax_rarity=epic.png') },
  { key: 'fang-epic',       name: 'Legendary Fang',     rarity: 'Epic', tagline: 'Songs are sung about this fang. Mostly by the monster.',         image: require('../../assets/battleui/trophyitems/trophy=fang_rarity=epic.png') },
  { key: 'feather-epic',    name: 'Rainbow Feather',    rarity: 'Epic', tagline: "Molted from something that shouldn't have feathers.",            image: require('../../assets/battleui/trophyitems/trophy=feather_rarity=epic.png') },
  { key: 'goldenbooger',    name: 'Golden Booger',      rarity: 'Epic', tagline: 'Worth a fortune. Smells like a fortune too.',                    image: require('../../assets/battleui/trophyitems/trophy=goldenbooger_rarity=epic.png') },
  { key: 'kingblob',        name: 'King Slime Chunk',   rarity: 'Epic', tagline: 'A piece of royalty. It still thinks it rules.',                  image: require('../../assets/battleui/trophyitems/trophy=kingblob_rarity=epic.png') },
  { key: 'lint-epic',       name: 'Glitter Lint',       rarity: 'Epic', tagline: 'Sparkles relentlessly. You will find it for years.',            image: require('../../assets/battleui/trophyitems/trophy=lint_rarity=epic.png') },
  { key: 'marble',          name: 'Shiny Marble',       rarity: 'Epic', tagline: 'Contains a tiny frozen storm. Or a bubble. Hard to tell.',       image: require('../../assets/battleui/trophyitems/trophy=marble_rarity=epic.png') },
  { key: 'rainbowfurball',  name: 'Rainbow Furball',    rarity: 'Epic', tagline: 'Coughed up by something majestic. Mostly majestic.',            image: require('../../assets/battleui/trophyitems/trophy=rainbowfurball_rarity=epic.png') },
  { key: 'shinybug',        name: 'Shiny Bug Shell',    rarity: 'Epic', tagline: 'The bug upgraded and left this behind. Rude.',                   image: require('../../assets/battleui/trophyitems/trophy=shinybug_rarity=epic.png') },
  { key: 'sock-epic',       name: 'Golden Sock',        rarity: 'Epic', tagline: 'One of a legendary pair. The other is gone forever.',           image: require('../../assets/battleui/trophyitems/trophy=sock_rarity=epic.png') },
  { key: 'stick',           name: 'Enchanted Stick',    rarity: 'Epic', tagline: "It's THE stick. You know the one. The good stick.",              image: require('../../assets/battleui/trophyitems/trophy=stick_rarity=epic.png') },
  { key: 'toenail-epic',    name: 'Legendary Toenail',  rarity: 'Epic', tagline: 'Foretold in prophecy. Clipped on a Tuesday.',                   image: require('../../assets/battleui/trophyitems/trophy=toenail_rarity=epic.png') },
  { key: 'tooth-epic',      name: 'Mythic Molar',       rarity: 'Epic', tagline: 'Chewed through history itself. A few cavities.',                 image: require('../../assets/battleui/trophyitems/trophy=tooth_rarity=epic.png') },

  // ── Legendary ─────────────────────────────────────────────────────────────
  { key: 'burger',          name: 'Legendary Burger',    rarity: 'Legendary', tagline: 'Never gets cold. Never gets eaten. Eternally perfect.',     image: require('../../assets/battleui/trophyitems/trophy=burger_rarity=legendary.png') },
  { key: 'cosmicdandruff',  name: 'Cosmic Dandruff',     rarity: 'Legendary', tagline: "Shed from a star's scalp. Twinkles when you shake it.",      image: require('../../assets/battleui/trophyitems/trophy=cosmicdandruff_rarity=legendary.png') },
  { key: 'cosmicdrool',     name: 'Cosmic Drool',        rarity: 'Legendary', tagline: 'One drop holds an entire tiny galaxy. Gross and grand.',     image: require('../../assets/battleui/trophyitems/trophy=cosmicdrool_rarity=legendary.png') },
  { key: 'cosmiceyecrust',  name: 'Cosmic Eye Crust',    rarity: 'Legendary', tagline: 'Wiped from the eye of the universe. It saw everything.',     image: require('../../assets/battleui/trophyitems/trophy=cosmiceyecrust_rarity=legendary.png') },
  { key: 'cosmiclint',      name: 'Cosmic Lint',         rarity: 'Legendary', tagline: 'Older than time. Fuzzier than time, too.',                   image: require('../../assets/battleui/trophyitems/trophy=cosmiclint_rarity=legendary.png') },
  { key: 'crazygem',        name: 'Prism Shard',         rarity: 'Legendary', tagline: "Bends light into colors that don't have names yet.",         image: require('../../assets/battleui/trophyitems/trophy=crazygem_rarity=legendary.png') },
  { key: 'diamondscab',     name: 'Diamond Scab',        rarity: 'Legendary', tagline: 'Healed into the hardest substance known. Battle-earned.',    image: require('../../assets/battleui/trophyitems/trophy=diamondscab_rarity=legendary.png') },
  { key: 'droplet',         name: 'Diamond Droplet',     rarity: 'Legendary', tagline: 'A tear of pure joy, frozen mid-fall and never melting.',     image: require('../../assets/battleui/trophyitems/trophy=droplet_rarity=legendary.png') },
  { key: 'feather-leg',     name: 'Celestial Feather',   rarity: 'Legendary', tagline: 'Drifted down from somewhere very, very high up.',            image: require('../../assets/battleui/trophyitems/trophy=feather_rarity=legendary.png') },
  { key: 'fossilearwax',    name: 'Fossil Earwax',       rarity: 'Legendary', tagline: 'A million years in the making. Worth every year.',           image: require('../../assets/battleui/trophyitems/trophy=fossilearwax_rarity=legendary.png') },
  { key: 'gemearwax',       name: 'Gem Earwax',          rarity: 'Legendary', tagline: 'Geologists weep. You just put it in your pocket.',           image: require('../../assets/battleui/trophyitems/trophy=gemearwax_rarity=legendary.png') },
  { key: 'gemnugget',       name: 'Gem Nugget',          rarity: 'Legendary', tagline: 'Small, dense, and humming with impossible value.',           image: require('../../assets/battleui/trophyitems/trophy=gemnugget_rarity=legendary.png') },
  { key: 'goldenapple',     name: 'Platinum Toenail',    rarity: 'Legendary', tagline: 'The rarest clipping in existence. Guard it well.',           image: require('../../assets/battleui/trophyitems/trophy=goldenapple_rarity=legendary.png') },
  { key: 'goonugget',       name: 'Goo Nugget',          rarity: 'Legendary', tagline: 'Condensed slime at maximum density. It pulses.',             image: require('../../assets/battleui/trophyitems/trophy=goonugget_rarity=legendary.png') },
  { key: 'nosepearl',       name: 'Nose Pearl',          rarity: 'Legendary', tagline: 'Formed the way pearls do, but in a nose. A true marvel.',    image: require('../../assets/battleui/trophyitems/trophy=nosepearl_rarity=legendary.png') },
  { key: 'rainbownugg',     name: 'Rainbow Nugget',      rarity: 'Legendary', tagline: 'Every color at once, in one impossible lump.',               image: require('../../assets/battleui/trophyitems/trophy=rainbownugg_rarity=legendary.png') },
  { key: 'spartklytooth',   name: 'Sparkling Tooth',     rarity: 'Legendary', tagline: 'Lost from a smile so bright it left a sparkle behind.',      image: require('../../assets/battleui/trophyitems/trophy=spartklytooth_rarity=legendary.png') },
  { key: 'unicorn',         name: 'Unicorn Fragment',    rarity: 'Legendary', tagline: 'A shard of something that may not exist. And yet.',          image: require('../../assets/battleui/trophyitems/trophy=unicorn_rarity=legendary.png') },
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
