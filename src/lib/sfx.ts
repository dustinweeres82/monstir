import { createAudioPlayer } from 'expo-audio';

const CASH_REGISTER = require('../../assets/sounds/cashRegister.mp3');

/** Fire-and-forget "cha-ching" — chore payout, kid collecting a payout, or a
 *  parent confirming one. Creates a fresh player per call (payouts can fire
 *  back-to-back, e.g. approving several chores in a row) and tears it down
 *  once playback finishes so players don't pile up. */
export function playCashRegister() {
  const player = createAudioPlayer(CASH_REGISTER);
  const sub = player.addListener('playbackStatusUpdate', status => {
    if (status.didJustFinish) {
      sub.remove();
      player.remove();
    }
  });
  player.play();
}
