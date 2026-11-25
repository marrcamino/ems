import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import { airTravelFlight, airTravelRoute } from "$lib/server/db/schema";
import { error, fail } from "@sveltejs/kit";
import { asc, count, eq } from "drizzle-orm";
import { findRoute, routePlaces } from "../air-travel-routes.server";
import type { AirTravelRoute } from "../air-travel-types";
import type { Actions, PageServerLoad } from "./$types";

/**
 * The routes the office flies, with their distances, kept by whoever records
 * the flights so every flight on a route has the same checked figure
 * (cards/air-travel.md). A route is never deleted, only made inactive.
 */

/** The dialog's limit: 5 digits. */
const MAX_KM = 99_999;

function deny(locals: App.Locals) {
  if (!can(locals.permissions, "air_travel:manage")) {
    return fail(403, { error: "You do not have permission to do this." });
  }
  return null;
}

function readText(form: FormData, field: string) {
  return String(form.get(field) ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

type ReadRoute =
  | { error: string }
  | {
      values: {
        placeA: string;
        placeB: string;
        distanceKm: number;
        source: string | null;
      };
    };

/** The add and edit form, checked; the places come back in stored order. */
function readRoute(form: FormData): ReadRoute {
  const one = readText(form, "placeA");
  const other = readText(form, "placeB");
  if (!one || !other) return { error: "Enter both places of the route." };
  if (one.length > 100 || other.length > 100) {
    return { error: "Shorten the place to 100 characters." };
  }
  if (one.toLowerCase() === other.toLowerCase()) {
    return { error: "Enter two different places." };
  }

  const raw = String(form.get("distanceKm") ?? "").trim();
  const distanceKm = Number(raw);
  if (
    raw === "" ||
    !Number.isInteger(distanceKm) ||
    distanceKm < 1 ||
    distanceKm > MAX_KM
  ) {
    return { error: "Enter the distance in km, a whole number from 1." };
  }

  const source = readText(form, "source");
  if (source.length > 150) {
    return { error: "Shorten the source to 150 characters." };
  }

  return {
    values: {
      ...routePlaces(one, other),
      distanceKm,
      source: source || null,
    },
  };
}

async function flightsOn(routePk: number) {
  const [row] = await db
    .select({ n: count() })
    .from(airTravelFlight)
    .where(eq(airTravelFlight.airTravelRouteFk, routePk));
  return row?.n ?? 0;
}

/** The refusal when the two places already make another route. */
function taken(existing: { status: string }) {
  return existing.status === "inactive"
    ? "This route is already on the list, as inactive. Make it active instead."
    : "This route is already on the list.";
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!can(locals.permissions, "air_travel:view")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const routes: AirTravelRoute[] = (
    await db
      .select({
        route: airTravelRoute,
        flights: count(airTravelFlight.airTravelFlightPk),
      })
      .from(airTravelRoute)
      .leftJoin(
        airTravelFlight,
        eq(airTravelFlight.airTravelRouteFk, airTravelRoute.airTravelRoutePk),
      )
      .groupBy(airTravelRoute.airTravelRoutePk)
      .orderBy(asc(airTravelRoute.placeA), asc(airTravelRoute.placeB))
  ).map(({ route: r, flights }) => ({
    routePk: r.airTravelRoutePk,
    placeA: r.placeA,
    placeB: r.placeB,
    distanceKm: r.distanceKm,
    source: r.source,
    status: r.status,
    flights,
  }));

  return { routes };
};

export const actions: Actions = {
  add: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const read = readRoute(await request.formData());
    if ("error" in read) return fail(400, { error: read.error });

    const existing = await findRoute(read.values.placeA, read.values.placeB);
    if (existing) return fail(409, { error: taken(existing) });

    await db
      .insert(airTravelRoute)
      .values({ ...read.values, createdByFk: locals.user!.userPk });
    return { success: true };
  },

  edit: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const form = await request.formData();
    const routePk = Number(form.get("routePk"));
    const [route] = await db
      .select()
      .from(airTravelRoute)
      .where(eq(airTravelRoute.airTravelRoutePk, routePk));
    if (!route) return fail(404, { error: "That route no longer exists." });

    const read = readRoute(form);
    if ("error" in read) return fail(400, { error: read.error });

    // Flights keep the places they were saved with, so a route in use keeps
    // its places; a different pair is a new route.
    const samePlaces =
      route.placeA.toLowerCase() === read.values.placeA.toLowerCase() &&
      route.placeB.toLowerCase() === read.values.placeB.toLowerCase();
    if (!samePlaces) {
      const used = await flightsOn(routePk);
      if (used > 0) {
        return fail(409, {
          error: `Its places cannot change, because ${used} ${used === 1 ? "flight uses" : "flights use"} it. Add a new route instead.`,
        });
      }
      const existing = await findRoute(read.values.placeA, read.values.placeB);
      if (existing) return fail(409, { error: taken(existing) });
    }

    await db
      .update(airTravelRoute)
      .set({ ...read.values, updatedAt: new Date() })
      .where(eq(airTravelRoute.airTravelRoutePk, routePk));
    return { success: true };
  },

  setStatus: async ({ request, locals }) => {
    const denied = deny(locals);
    if (denied) return denied;

    const form = await request.formData();
    const routePk = Number(form.get("routePk"));
    const status = form.get("status") === "inactive" ? "inactive" : "active";
    const result = await db
      .update(airTravelRoute)
      .set({ status, updatedAt: new Date() })
      .where(eq(airTravelRoute.airTravelRoutePk, routePk));
    if (result[0].affectedRows === 0) {
      return fail(404, { error: "That route no longer exists." });
    }
    return { success: true };
  },
};
