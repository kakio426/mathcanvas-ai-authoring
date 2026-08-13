import { randomBytes, randomUUID } from "node:crypto";
import type { PublicActivity } from "../shared/contract.js";

export interface StoredCard {
  activity: PublicActivity;
  draftId: string;
  activitySpecHash: string;
  previewed: boolean;
  createdAt: number;
}

export interface StoredApproval {
  cardId: string;
  createdAt: number;
  consumed: boolean;
}

export interface StoredCreation {
  creationId: string;
  status: "running" | "succeeded" | "failed";
  message: string;
  createdAt: number;
  editorUrl?: string;
}

export interface TeacherSession {
  id: string;
  lastSeenAt: number;
  cards: Map<string, StoredCard>;
  approvals: Map<string, StoredApproval>;
  creations: Map<string, StoredCreation>;
}

// A teacher may leave the preparation desk open through a school day. Keeping
// this local-only session alive avoids a confusing dead tab after lunch; the
// MathCanvas login itself still has its own independent authentication expiry.
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const CARD_TTL_MS = 30 * 60 * 1000;
export const APPROVAL_TTL_MS = 10 * 60 * 1000;

export class TeacherSessionStore {
  readonly #sessions = new Map<string, TeacherSession>();

  public create(now = Date.now()): TeacherSession {
    const session: TeacherSession = {
      id: randomBytes(32).toString("base64url"),
      lastSeenAt: now,
      cards: new Map(),
      approvals: new Map(),
      creations: new Map()
    };
    this.#sessions.set(session.id, session);
    return session;
  }

  public get(id: string | undefined, now = Date.now()): TeacherSession | undefined {
    if (!id) return undefined;
    const session = this.#sessions.get(id);
    if (!session || now - session.lastSeenAt > SESSION_TTL_MS) {
      this.#sessions.delete(id);
      return undefined;
    }
    session.lastSeenAt = now;
    for (const [cardId, card] of session.cards) {
      if (now - card.createdAt > CARD_TTL_MS) session.cards.delete(cardId);
    }
    for (const [token, approval] of session.approvals) {
      if (now - approval.createdAt > APPROVAL_TTL_MS) {
        session.approvals.delete(token);
      }
    }
    return session;
  }

  public addCard(
    session: TeacherSession,
    card: Omit<StoredCard, "createdAt">,
    now = Date.now()
  ): StoredCard {
    const stored = { ...card, createdAt: now };
    session.cards.set(card.activity.cardId, stored);
    return stored;
  }

  public issueApproval(
    session: TeacherSession,
    cardId: string,
    now = Date.now()
  ): string {
    const token = randomBytes(24).toString("base64url");
    session.approvals.set(token, { cardId, createdAt: now, consumed: false });
    return token;
  }

  public createCreation(
    session: TeacherSession,
    message: string,
    now = Date.now()
  ): StoredCreation {
    const creation: StoredCreation = {
      creationId: randomUUID(),
      status: "running",
      message,
      createdAt: now
    };
    session.creations.set(creation.creationId, creation);
    return creation;
  }
}
