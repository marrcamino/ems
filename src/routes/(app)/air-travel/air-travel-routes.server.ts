import { db } from "$lib/server/db";
import { airTravelRoute } from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * The two places of a route in the order they are stored: alphabetical,
 * ignoring case, so Manila – Butuan and Butuan – Manila are one route.
 */
export function routePlaces(one: string, other: string) {
  return one.toLowerCase() <= other.toLowerCase()
    ? { placeA: one, placeB: other }
    : { placeA: other, placeB: one };
}

/** The route between two places, in either direction, or null. */
export async function findRoute(one: string, other: string) {
  const { placeA, placeB } = routePlaces(one, other);
  // MySQL compares these without case, so "butuan" finds "Butuan".
  const [row] = await db
    .select()
    .from(airTravelRoute)
    .where(
      and(eq(airTravelRoute.placeA, placeA), eq(airTravelRoute.placeB, placeB)),
    );
  return row ?? null;
}
