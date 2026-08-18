import type { useWatchParty } from "./useWatchParty";
export type ReturnTypeUseWatchParty = ReturnType<typeof useWatchParty> & {
  feedback: string | null;
  setFeedback: (value: string | null) => void;
};
