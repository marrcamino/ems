import { type User } from "$lib/types";

type SessionUser = Omit<
  User,
  | "passwordHash"
  | "failedLoginAttempts"
  | "lockedUntil"
  | "lastLoginAt"
  | "createdByFk"
  | "createdAt"
  | "updatedAt"
>;

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
    // interface Error {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
