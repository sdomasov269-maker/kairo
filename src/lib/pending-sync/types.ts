export type PendingSyncType =
  | "progress-upsert"
  | "progress-delete"
  | "progress-clear"
  | "list-upsert"
  | "list-delete"
  | "list-clear"
  | "preferences-update";
export type PendingSyncOperation = {
  id: string;
  userId: string;
  type: PendingSyncType;
  entityKey: string;
  payload: unknown;
  createdAt: string;
  attempts: number;
  nextAttemptAt: string | null;
};
