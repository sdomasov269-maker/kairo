import { randomBytes } from "node:crypto";
import type {
  CreateStreamResourceInput,
  StreamResource,
  StreamResourceStore,
} from "./StreamResourceStore";

export class InMemoryStreamResourceStore implements StreamResourceStore {
  private readonly resources = new Map<string, StreamResource>();
  private readonly now: () => Date;
  private readonly createToken: () => string;

  constructor(
    now: () => Date = () => new Date(),
    createToken: () => string = () => randomBytes(24).toString("hex"),
  ) {
    this.now = now;
    this.createToken = createToken;
  }

  async create(resource: CreateStreamResourceInput): Promise<string> {
    let token = this.createToken();
    while (this.resources.has(token)) token = this.createToken();
    this.resources.set(token, { ...structuredClone(resource), token });
    return token;
  }

  async get(sessionId: string, token: string): Promise<StreamResource | null> {
    const resource = this.resources.get(token);
    if (!resource || resource.sessionId !== sessionId) return null;
    if (resource.expiresAt.getTime() <= this.now().getTime()) {
      this.resources.delete(token);
      return null;
    }
    return resource;
  }

  async deleteSession(sessionId: string): Promise<void> {
    for (const [token, resource] of this.resources)
      if (resource.sessionId === sessionId) this.resources.delete(token);
  }
}
