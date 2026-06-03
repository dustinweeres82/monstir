/**
 * Boss display data for Trophy Room detail views.
 * Names must match the canonical boss list in App.tsx — do not hardcode elsewhere.
 */

export interface BossDisplayData {
  name:     string;
  tagline:  string;
  weakness: string;
  threat:   'Easy' | 'Medium' | 'Hard' | 'Extreme';
  jar:      ReturnType<typeof require>;   // trophy jar art
  image?:   ReturnType<typeof require>;  // boss character art (optional)
}

export const BOSS_LOOKUP: BossDisplayData[] = [
  {
    name:     'Lint Lurker',
    tagline:  "It hid under the couch. For years.",
    weakness: 'Sweeping',
    threat:   'Easy',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Lint Lurker.png'),
    image:    require('../../assets/bosses/boss=lintlurker.png'),
  },
  {
    name:     'Toothpaste Ooze',
    tagline:  "It drips. It spreads. It never dries.",
    weakness: 'Wiping',
    threat:   'Easy',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Toothpaste Ooze.png'),
    image:    require('../../assets/bosses/boss=toothpaste.png'),
  },
  {
    name:     'Cracklebug',
    tagline:  "Every crumb is a throne. Every floor is its kingdom.",
    weakness: 'Vacuuming',
    threat:   'Easy',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Cracklebug.png'),
    image:    require('../../assets/bosses/boss=cracklebug.png'),
  },
  {
    name:     'The Pile',
    tagline:  "You kept adding to it. Now it fights back.",
    weakness: 'Organizing',
    threat:   'Medium',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=The Pile.png'),
    image:    require('../../assets/bosses/boss=pile.png'),
  },
  {
    name:     'Junk Giant',
    tagline:  "He Collects It All. You Clean It Up.",
    weakness: 'Organizing',
    threat:   'Medium',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Junk Giant.png'),
    image:    require('../../assets/bosses/boss=junkgiant.png'),
  },
  {
    name:     'The Clatter',
    tagline:  "Everything you left out. Now it's angry.",
    weakness: 'Folding',
    threat:   'Medium',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=The Clatter.png'),
    image:    require('../../assets/bosses/boss=clatter.png'),
  },
  {
    name:     'Grimelord',
    tagline:  "Filth given form. Neglect given a name.",
    weakness: 'Scrubbing',
    threat:   'Hard',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Grimelord.png'),
    image:    require('../../assets/bosses/boss=grimelord.png'),
  },
  {
    name:     'Forkfang',
    tagline:  "Left in the sink too long. Now it bites.",
    weakness: 'Washing',
    threat:   'Hard',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Forkfang.png'),
    image:    require('../../assets/bosses/boss=forkfang.png'),
  },
  {
    name:     'Vacuumbite',
    tagline:  "It swallowed the last clean corner. Of everything.",
    weakness: 'Vacuuming',
    threat:   'Hard',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Vacuumbite.png'),
    image:    require('../../assets/bosses/boss=vaccuumbite.png'),
  },
  {
    name:     'The Overflow',
    tagline:  "The mess spilled over. There's no containing it.",
    weakness: 'Mopping',
    threat:   'Hard',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=The Overflow.png'),
    image:    require('../../assets/bosses/boss=overflow.png'),
  },
  {
    name:     'Mildew Queen',
    tagline:  "She's been growing in the walls since last winter.",
    weakness: 'Scrubbing',
    threat:   'Extreme',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Mildew Queen.png'),
    image:    require('../../assets/bosses/boss=mildewqueen.png'),
  },
  {
    name:     'Dishocalypse',
    tagline:  "Every dish you ignored. Every one.",
    weakness: 'Washing',
    threat:   'Extreme',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Dishocalypse.png'),
    image:    require('../../assets/bosses/boss=dishocalype.png'),
  },
  {
    name:     'Void Fridge',
    tagline:  "What's inside? Nobody checks. That's the problem.",
    weakness: 'Cleaning',
    threat:   'Extreme',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=Void Fridge.png'),
    image:    require('../../assets/bosses/boss=voidfridge.png'),
  },
  {
    name:     'The Forgotten',
    tagline:  "It was never cleaned. It never forgot.",
    weakness: 'Consistency',
    threat:   'Extreme',
    jar:      require('../../assets/battleui/trophyitems/bossjars/boss=The Forgotten.png'),
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
