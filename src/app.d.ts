import type { SessionUser } from "$lib/types";

declare global {
  namespace App {
    interface Locals {
      user: SessionUser | null;
      session: {
        sessionPk: string;
        expiresAt: Date;
      } | null;
      permissions: Set<string>;
    }
    interface PageData {
      // Optional here: only (app) and admin layouts actually return these
      // (via getSessionData()) — (auth) routes have neither. GlobalContext
      // casts `user` to non-null since it's only ever set where these exist.
      user?: SessionUser;
      permissions?: string[];
    }
    interface Error {
      message: string;
      // Set by handleError() in hooks.server.ts so a user can quote the id
      // from the error page and it can be matched against the server log.
      errorId?: string;
    }
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
