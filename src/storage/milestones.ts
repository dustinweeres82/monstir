import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'monstir:milestones';

export interface EarnedMilestone {
  id:       string;
  earnedAt: string;  // ISO
}

export async function getEarnedMilestones(): Promise<EarnedMilestone[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as EarnedMilestone[]; }
  catch { return []; }
}

export async function hasMilestone(id: string): Promise<boolean> {
  const earned = await getEarnedMilestones();
  return earned.some(m => m.id === id);
}

export async function earnMilestone(id: string): Promise<boolean> {
  const earned = await getEarnedMilestones();
  if (earned.some(m => m.id === id)) return false; // already earned
  earned.unshift({ id, earnedAt: new Date().toISOString() });
  await AsyncStorage.setItem(KEY, JSON.stringify(earned));
  return true; // newly earned
}

export async function clearMilestones(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
