<!--
  route-progress.svelte
  ---------------------
  A single, self-contained top loading bar for the EMS app.

  PLACEMENT: mount exactly once, in `src/routes/+layout.svelte`, OUTSIDE any
  container that has `overflow: hidden`, a `transform`, a `filter`, or
  `contain: paint`. Those properties create a new containing block and would
  silently turn our `position: fixed` bar into a bar positioned relative to
  that ancestor instead of the viewport. Putting it as the first child of the
  layout root (a sibling of {@render children()}, not a descendant of the
  scroll container) is the safe spot.

      <script lang="ts">
        import RouteProgress from '$lib/components/route-progress.svelte';
        let { children } = $props();
      </script>

      <RouteProgress />
      {@render children()}

  MANUAL API — for work that is NOT a route navigation (SvelteKit's
  `navigating` knows nothing about these):

      import { start, done, track } from '$lib/components/route-progress.svelte';

      // 1. Preferred: track() wraps a promise and ALWAYS releases, even on
      //    reject. This is the only form that cannot leak a stuck bar.
      const rows = await track(fetch('/api/fuel').then((r) => r.json()));

      // 2. Form actions. `use:enhance` submits over fetch, which is not a
      //    navigation, so the bar would otherwise never appear on a slow
      //    POST. The enhance callback's return runs after the response.
      <form method="POST" use:enhance={() => { const release = start();
        return async ({ update }) => { await update(); release(); };
      }}>

      // 3. Manual pairing (use only if you cannot use track()):
      const release = start();  // returns an idempotent release fn
      ...
      release();                // or done() — both floor the counter at 0

  Requires SvelteKit >= 2.12 for `$app/state`. On older versions swap the
  import for `$app/stores` and read `$navigating` instead.
-->

<script module lang="ts">
  import { browser } from "$app/environment";

  /**
   * Count of in-flight MANUAL tasks, shared by every importer of this file.
   *
   * WHY module-level: the bar is a singleton, but `start()` is called from
   * arbitrary components that have no reference to the instance. A counter
   * (not a boolean) is required because two slow things can overlap — a
   * boolean would let the first one to finish hide the bar while the second
   * is still running.
   *
   * WHY the `browser` guards below: module scope on the server is shared
   * between concurrent requests. Never mutating it during SSR keeps one
   * user's export from painting a progress bar into another user's HTML.
   * It also means this value is always 0 in the SSR pass, so the server
   * renders no bar and there is nothing for hydration to mismatch on.
   */
  let manual = $state(0);

  /**
   * Begin a manual task. Returns an idempotent release function.
   *
   * WHY return a function instead of relying on a bare `done()`: callers
   * double-call cleanup all the time (a `finally` plus an error handler,
   * an effect teardown that runs twice in dev). An idempotent closure makes
   * the second call a no-op instead of decrementing someone else's task to
   * zero and hiding the bar early.
   */
  export function start(): () => void {
    if (!browser) return () => {};
    manual += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      // Math.max floors at 0: a stray done() must never drive the counter
      // negative, because a negative counter can never return to "idle".
      manual = Math.max(0, manual - 1);
    };
  }

  /** Escape hatch for code that cannot hold the release closure. */
  export function done(): void {
    if (!browser) return;
    manual = Math.max(0, manual - 1);
  }

  /**
   * Preferred entry point: the bar is released in a `finally`, so a thrown
   * error, an aborted fetch, or a rejected action can never strand it.
   * Every "stuck progress bar" bug in the wild is a missing done() on an
   * error path; this shape makes that path impossible to forget.
   */
  export async function track<T>(
    work: Promise<T> | (() => Promise<T>),
  ): Promise<T> {
    const release = start();
    try {
      return await (typeof work === "function" ? work() : work);
    } finally {
      release();
    }
  }

  /** Emergency clear of all manual tasks. Rarely needed; see the watchdog. */
  export function reset(): void {
    if (browser) manual = 0;
  }
</script>

<script lang="ts">
  import { navigating } from "$app/state";
  import { untrack } from "svelte";

  type Props = {
    /** Wait this long before painting anything. See SHOW-DELAY note below. */
    delay?: number;
    /** Once painted, stay painted at least this long. */
    minDuration?: number;
    /** Hard ceiling; past this the bar gives up rather than lying. */
    maxDuration?: number;
    /** Bar thickness in px. */
    height?: number;
    /**
     * Classes applied to the bar itself. Defaults to the theme token so the
     * bar follows light/dark mode and any future re-theme automatically —
     * `text-primary` is what feeds `currentColor` to the trailing glow.
     */
    class?: string;
  };

  let {
    // 150ms: below roughly this threshold a user reads the transition as
    // instantaneous, so painting a bar only adds a flash. On a LAN most
    // EMS navigations resolve in well under 100ms and will never show one.
    delay = 150,
    // 400ms: if we DO paint, a bar that vanishes 30ms later reads as a
    // glitch. Holding it briefly makes the app feel deliberate, not janky.
    minDuration = 400,
    maxDuration = 20000,
    height = 3,
    class: className = "bg-primary text-primary",
  }: Props = $props();

  /**
   * Phase machine. Five states, because the naive two-state
   * (`{#if $navigating}`) version has no way to express "logically finished
   * but still on screen", which is exactly where the flicker guards live.
   *
   *   idle      → nothing rendered
   *   pending   → work started, delay not yet elapsed, nothing rendered
   *   visible   → painted and trickling
   *   settling  → work finished, holding for the rest of minDuration
   *   finishing → snapped to 100% and fading out
   */
  type Phase = "idle" | "pending" | "visible" | "settling" | "finishing";

  let phase = $state<Phase>("idle");
  let progress = $state(0); // 0..1

  let showTimer: ReturnType<typeof setTimeout> | undefined;
  let minTimer: ReturnType<typeof setTimeout> | undefined;
  let fadeTimer: ReturnType<typeof setTimeout> | undefined;
  let watchdogTimer: ReturnType<typeof setTimeout> | undefined;
  let trickleTimer: ReturnType<typeof setInterval> | undefined;
  let shownAt = 0;

  /** Must outlast the CSS transform (200ms) + opacity delay/duration (150+250). */
  const FADE_MS = 450;

  /**
   * Should route navigation count as "loading"?
   *
   * Note `navigating` from `$app/state` is an object whose FIELDS are null
   * when idle (unlike the old `$navigating` store, which was itself null),
   * so the test is on `.to`, not on the object.
   */
  const navLoading = $derived.by(() => {
    const to = navigating.to;
    if (!to) return false;

    // GUARD — full document unloads (external links, `data-sveltekit-reload`,
    // un-enhanced form POSTs, `type: 'leave'`). We would paint a bar that we
    // can never clear, because our JS context is about to be destroyed. Worse,
    // if a `beforeNavigate` handler or a beforeunload dialog cancels the
    // unload, the page stays put and the bar is stuck forever. The browser
    // already renders its own tab spinner for these, so we sit them out.
    if (navigating.willUnload) return false;

    const from = navigating.from;
    if (from) {
      const samePage =
        from.url.pathname === to.url.pathname &&
        from.url.search === to.url.search;
      // GUARD — hash-only navigation (#section jumps). No load function runs
      // and no data is fetched, so a bar would be pure noise. The hash
      // comparison is what keeps this from also swallowing
      // `goto(sameUrl, { invalidateAll: true })`, where pathname and search
      // are identical but the hash is too — that one IS a real data load and
      // must still show a bar.
      if (samePage && from.url.hash !== to.url.hash) return false;
    }

    return true;
  });

  /**
   * Single source of truth. Deliberately NOT a counter for the navigation
   * half: SvelteKit collapses a superseded navigation (user clicks link B
   * while link A is still loading) into one continuous non-null `navigating`,
   * so a counter would desync. A boolean OR'd with the manual counter cannot.
   */
  const active = $derived(navLoading || manual > 0);

  function clearTimers() {
    clearTimeout(showTimer);
    clearTimeout(minTimer);
    clearTimeout(fadeTimer);
    clearTimeout(watchdogTimer);
    clearInterval(trickleTimer);
    showTimer = minTimer = fadeTimer = watchdogTimer = undefined;
    trickleTimer = undefined;
  }

  function startTrickle() {
    clearInterval(trickleTimer);
    trickleTimer = setInterval(() => {
      // Asymptote at 90%: we have no idea how much work is left, so the bar
      // must never reach 100% on its own. Hitting 100% and then sitting
      // there is the single most distrust-inducing progress bar behaviour.
      // 100% is reserved for "actually done".
      if (progress >= 0.9) return;
      const step =
        progress < 0.2
          ? 0.08
          : progress < 0.5
            ? 0.04
            : progress < 0.8
              ? 0.02
              : 0.005;

      progress = Math.min(0.9, progress + step * (0.5 + Math.random() * 0.5));
    }, 220);
  }

  function armWatchdog() {
    clearTimeout(watchdogTimer);
    watchdogTimer = setTimeout(() => {
      // GUARD — the anti-stuck backstop. Historically SvelteKit could leave
      // `navigating` non-null after an aborted navigation (sveltejs/kit
      // #4660), and hand-paired start()/done() calls leak on error paths.
      // Rather than leave a bar creeping at 90% forever, we clear the manual
      // counter and animate out. Hiding a bar for work that is still running
      // is a smaller lie than a bar that never leaves.
      console.warn(
        `[route-progress] still loading after ${maxDuration}ms — hiding bar`,
      );
      manual = 0;
      finish();
    }, maxDuration);
  }

  function reveal() {
    showTimer = undefined;
    phase = "visible";
    shownAt = Date.now();
    // Start at 8%, not 0%: a bar of zero width is indistinguishable from no
    // bar, so the first frame must already read as "something is happening".
    progress = 0.08;
    startTrickle();
    armWatchdog();
  }

  function finish() {
    minTimer = undefined;
    clearInterval(trickleTimer);
    clearTimeout(watchdogTimer);
    trickleTimer = undefined;
    watchdogTimer = undefined;
    phase = "finishing";
    progress = 1;
    fadeTimer = setTimeout(() => {
      fadeTimer = undefined;
      phase = "idle";
      progress = 0;
    }, FADE_MS);
  }

  function begin() {
    switch (phase) {
      case "pending":
      case "visible":
        // Already covered. A second navigation starting mid-flight must NOT
        // restart the delay or reset progress — that is the "superseded
        // navigation" case, and restarting would make the bar jump backwards.
        return;

      case "settling":
        // New work arrived inside the minimum-visible hold. Cancel the
        // pending finish and keep trickling from where we are. Without this
        // the scheduled finish() would fire and hide the bar while the new
        // work is still running.
        clearTimeout(minTimer);
        minTimer = undefined;
        phase = "visible";
        startTrickle();
        armWatchdog();
        return;

      case "finishing":
        // Work arrived during the fade-out — e.g. a load() resolved, the
        // page rendered, and a component immediately kicked off a slow
        // client fetch. Resurrect in place rather than fading out and
        // fading straight back in, which reads as a flicker.
        clearTimeout(fadeTimer);
        fadeTimer = undefined;
        phase = "visible";
        shownAt = Date.now();
        progress = 0.08;
        startTrickle();
        armWatchdog();
        return;

      case "idle":
        // THE DELAY GUARD. Nothing is painted yet. If the work finishes
        // before `delay` elapses we cancel in end() and the user never sees
        // a thing — which is what makes sub-200ms LAN navigations silent
        // instead of strobing.
        phase = "pending";
        showTimer = setTimeout(reveal, delay);
        return;
    }
  }

  function end() {
    if (phase === "pending") {
      // Fast path: finished before we ever painted. Drop it silently.
      clearTimeout(showTimer);
      showTimer = undefined;
      phase = "idle";
      return;
    }
    // 'idle' (nothing to do), 'settling' and 'finishing' (already on their
    // way out) must be ignored, or a second end() would schedule a second
    // finish() and fight the first one's timers.
    if (phase !== "visible") return;

    clearInterval(trickleTimer);
    trickleTimer = undefined;

    // THE MINIMUM-DURATION GUARD.
    const remaining = Math.max(0, minDuration - (Date.now() - shownAt));
    phase = "settling";
    minTimer = setTimeout(finish, remaining);
  }

  $effect(() => {
    const isActive = active; // the ONLY tracked read in this effect
    // untrack: begin()/end() read and write `phase`, `progress` and the
    // timer handles. Without untrack the effect would take a dependency on
    // its own writes and re-run itself in a loop.
    untrack(() => (isActive ? begin() : end()));
  });

  $effect(() => {
    // GUARD — back/forward cache restore. If the user leaves via a full
    // document navigation and comes back with the back button, the page can
    // be restored from bfcache with our DOM and timers frozen mid-animation.
    // `persisted` is true only in that case; wipe the machine clean.
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      clearTimers();
      phase = "idle";
      progress = 0;
      manual = 0;
    };
    window.addEventListener("pageshow", onPageShow);

    // No dependencies are read above, so this cleanup runs on unmount only —
    // it is not re-run every time `active` flips. Timers outliving the
    // component would write to destroyed state.
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      clearTimers();
    };
  });
</script>

{#if phase === "visible" || phase === "settling" || phase === "finishing"}
  <div
    class="route-progress"
    class:is-finishing={phase === "finishing"}
    style="--route-progress-height: {height}px"
    role="progressbar"
    aria-label="Loading"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(progress * 100)}
  >
    <!--
			translate3d rather than width/scaleX:
			- width animates layout on every frame;
			- scaleX would squash the trailing glow along with the bar.
			Translating a full-width element leaves the glow undistorted and keeps
			the whole animation on the compositor.
		-->
    <div
      class="route-progress__bar {className}"
      style="transform: translate3d({(progress - 1) * 100}%, 0, 0)"
    >
      <div class="route-progress__peg"></div>
    </div>
  </div>
{/if}

<style>
  .route-progress {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: var(--route-progress-height);
    /* Above shadcn's dialog/sheet overlays (z-50) — a navigation triggered
		   from inside a modal still needs to be visible. */
    z-index: 9999;
    /* Non-negotiable: the bar spans the full width of the viewport and would
		   otherwise eat clicks on anything under the top few pixels. */
    pointer-events: none;
    opacity: 1;
    /* The 150ms delay lets the 100% snap actually render before we fade. */
    transition: opacity 250ms ease 150ms;
  }

  .route-progress.is-finishing {
    opacity: 0;
  }

  .route-progress__bar {
    position: relative;
    width: 100%;
    height: 100%;
    transition: transform 200ms ease-out;
    will-change: transform;
  }

  .route-progress__peg {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 100px;
    /* currentColor comes from the `text-primary` class on the bar, so the
		   glow re-themes along with the fill without a second colour token. */
    box-shadow:
      0 0 10px currentColor,
      0 0 6px currentColor;
    opacity: 0.7;
    transform: rotate(3deg) translateY(-2px);
  }

  @media (prefers-reduced-motion: reduce) {
    /* Keep the information, drop the motion: the bar still reports progress
		   via aria-valuenow and position, it just snaps instead of sliding. */
    .route-progress__bar {
      transition: none;
    }
    .route-progress {
      transition: opacity 100ms ease;
    }
    .route-progress__peg {
      display: none;
    }
  }
</style>
