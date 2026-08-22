export type StreamResourceKind = "manifest" | "segment" | "key" | "other";

export interface StreamResource {
  token: string;
  sessionId: string;
  url: string;
  kind: StreamResourceKind;
  createdAt: Date;
  expiresAt: Date;
}

export type CreateStreamResourceInput = Omit<StreamResource, "token">;

export interface StreamResourceStore {
  create(resource: CreateStreamResourceInput): Promise<string>;
  get(sessionId: string, token: string): Promise<StreamResource | null>;
  deleteSession(sessionId: string): Promise<void>;
}
