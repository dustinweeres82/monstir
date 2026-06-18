/**
 * Boss display data for Trophy Room detail views.
 * Names must match the canonical boss list in App.tsx — do not hardcode elsewhere.
 */

export interface BossDisplayData {
  name:     string;
  tagline:  string;
  weakness: string;                       // counter-chore lore (World "WEAKNESS" chip)
  // MON-82: the boss's proper battle weakness (name + icon) — mirrors the
  // `weakness` object in App.tsx BOSSES; keep the two in sync.
  battleWeakness: { name: string; icon: string };
  threat:   'Easy' | 'Medium' | 'Hard' | 'Extreme';
  jar:      ReturnType<typeof require>;   // trophy jar art
  image?:   ReturnType<typeof require>;  // boss character art (optional)
}

export const BOSS_LOOKUP: BossDisplayData[] = [
  {
    name:     'Lint Lurker',
    tagline:  "It hid under the couch. For years.",
    weakness: 'Sweeping',
    battleWeakness: { name: 'Static', icon: '⚡' },
    threat:   'Easy',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Lint_Lurker.png'),
    image:    require('../../assets/bosses/boss=lintlurker.png'),
  },
  {
    name:     'Toothpaste Ooze',
    tagline:  "It drips. It spreads. It never dries.",
    weakness: 'Wiping',
    battleWeakness: { name: 'Mint', icon: '🌿' },
    threat:   'Easy',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Toothpaste_Ooze.png'),
    image:    require('../../assets/bosses/boss=toothpaste.png'),
  },
  {
    name:     'Cracklebug',
    tagline:  "Every crumb is a throne. Every floor is its kingdom.",
    weakness: 'Vacuuming',
    battleWeakness: { name: 'Vacuum', icon: '🧹' },
    threat:   'Easy',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Cracklebug.png'),
    image:    require('../../assets/bosses/boss=cracklebug.png'),
  },
  {
    name:     'The Pile',
    tagline:  "You kept adding to it. Now it fights back.",
    weakness: 'Organizing',
    battleWeakness: { name: 'Folding', icon: '👕' },
    threat:   'Medium',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=The_Pile.png'),
    image:    require('../../assets/bosses/boss=pile.png'),
  },
  {
    name:     'Junk Giant',
    tagline:  "He Collects It All. You Clean It Up.",
    weakness: 'Organizing',
    battleWeakness: { name: 'Water', icon: '💧' },
    threat:   'Medium',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Junk_Giant.png'),
    image:    require('../../assets/bosses/boss=junkgiant.png'),
  },
  {
    name:     'The Clatter',
    tagline:  "Everything you left out. Now it's angry.",
    weakness: 'Folding',
    battleWeakness: { name: 'Sponge Slam', icon: '🧽' },
    threat:   'Medium',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=The_Clatter.png'),
    image:    require('../../assets/bosses/boss=clatter.png'),
  },
  {
    name:     'Grimelord',
    tagline:  "Filth given form. Neglect given a name.",
    weakness: 'Scrubbing',
    battleWeakness: { name: 'Lemon Blast', icon: '🍋' },
    threat:   'Hard',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Grimelord.png'),
    image:    require('../../assets/bosses/boss=grimelord.png'),
  },
  {
    name:     'Forkfang',
    tagline:  "Left in the sink too long. Now it bites.",
    weakness: 'Washing',
    battleWeakness: { name: 'Soap Suds', icon: '🫧' },
    threat:   'Hard',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Forkfang.png'),
    image:    require('../../assets/bosses/boss=forkfang.png'),
  },
  {
    name:     'Vacuumbite',
    tagline:  "It swallowed the last clean corner. Of everything.",
    weakness: 'Vacuuming',
    battleWeakness: { name: 'Unplugger', icon: '🔌' },
    threat:   'Hard',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Vacuumbite.png'),
    image:    require('../../assets/bosses/boss=vaccuumbite.png'),
  },
  {
    name:     'The Overflow',
    tagline:  "The mess spilled over. There's no containing it.",
    weakness: 'Mopping',
    battleWeakness: { name: 'Plunger', icon: '🪠' },
    threat:   'Hard',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=The_Overflow.png'),
    image:    require('../../assets/bosses/boss=overflow.png'),
  },
  {
    name:     'Mildew Queen',
    tagline:  "She's been growing in the walls since last winter.",
    weakness: 'Scrubbing',
    battleWeakness: { name: 'Sunlight Strike', icon: '☀️' },
    threat:   'Extreme',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Mildew_Queen.png'),
    image:    require('../../assets/bosses/boss=mildewqueen.png'),
  },
  {
    name:     'Dishocalypse',
    tagline:  "Every dish you ignored. Every one.",
    weakness: 'Washing',
    battleWeakness: { name: 'Dish Soap', icon: '🧴' },
    threat:   'Extreme',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Dishocalypse.png'),
    image:    require('../../assets/bosses/boss=dishocalype.png'),
  },
  {
    name:     'Void Fridge',
    tagline:  "What's inside? Nobody checks. That's the problem.",
    weakness: 'Cleaning',
    battleWeakness: { name: 'Baking Soda', icon: '🧂' },
    threat:   'Extreme',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Void_Fridge.png'),
    image:    require('../../assets/bosses/boss=voidfridge.png'),
  },
  {
    name:     'The Forgotten',
    tagline:  "It was never cleaned. It never forgot.",
    weakness: 'Consistency',
    battleWeakness: { name: 'Love', icon: '❤️' },
    threat:   'Extreme',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=The_Forgotten.png'),
    image:    require('../../assets/bosses/boss=forgotten.png'),
  },
];

export function getBossDisplay(name: string): BossDisplayData | undefined {
  return BOSS_LOOKUP.find(b => b.name === name);
}

export const THREAT_STARS: Record<string, string> = {
  Easy:    '★',
  Medium:  '★★',
  Hard:    '★★★',
  Extreme: '★★★★',
};
