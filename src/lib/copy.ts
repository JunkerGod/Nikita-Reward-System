// Every message in the app, in Nikita's texting voice. Buttons use Title Case elsewhere.

export const COPY = {
  greetingMorning: (name: string) => `Good morninggg ${name}`,
  greetingAfternoon: (name: string) => `Hiii ${name}`,
  greetingNight: "Hi bean ☺️",
  balanceLabel: "ur points",
  earnSmall: (n: number) => `YAY +${n}`,
  earnBig: (n: number) => `OMG +${n} \u{1F979}`,
  redeemConfirm: "Get this one",
  redeemed: "YAYYY its urs ☺️",
  notEnough: (n: number) => `Aw ${n} more to go`,
  goalReached: "U can get it now",
  emptyHistory: "Nothing yet :(",
  emptyShop: "No rewards yet :(",
  emptyWaiting: "All done ☺️",
  wishSent: "Oki sent",
  levelUp: "Oki he knows now ☺️",
  levelDown: "Oki he knows now :(",
  movedTo: (label: string) => `Nikita moved u to ${label}`,
  deleteConfirm: "Wait u sure",
  saveFailed: "Ugh that didnt save, tap to try again",
  offline: "No internet rn, will save when ur back",
  wrongPassword: "Hmm wrong password, try again",
  loading: "Loading…",
  loggedOut: "Byeee",
  loadFailed: "Ugh that didnt load, tap to try again",
  balanceNegative: "Cant delete that, points would go below 0",
  notEnoughPoints: "Aw not enough points yet",
  rewardGone: "That one isnt in the shop anymore",
  noInternetLogin: "No internet rn, try again when ur back",
} as const;

export function greeting(name: string, isNikita: boolean, now = new Date()) {
  const h = now.getHours();
  if (h >= 21 || h < 5) return isNikita ? COPY.greetingNight : COPY.greetingAfternoon(name);
  if (h < 12) return COPY.greetingMorning(name);
  return COPY.greetingAfternoon(name);
}

export const earnMessage = (n: number) => (n >= 50 ? COPY.earnBig(n) : COPY.earnSmall(n));
