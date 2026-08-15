# Analytics Plan (Plausible)

Goal: understand how people actually use the core loop — *type a claim → watch it stream → do something with the result* — without collecting anything that looks like PII. Plausible already gives you pageviews, referrers, devices, and countries for free; everything below is the **custom event layer** on top of that, mapped to this codebase.

## Principles

- **No raw user text as a prop.** The claim (`input`) and the AI reply (`reply`) can contain arbitrary user-typed content. Never send them verbatim as Plausible custom properties — bucket or count them instead (e.g. `length_bucket: "short" | "medium" | "long"`), or omit the prop entirely.
- **Low cardinality only.** Plausible's custom properties work best (and are priced) as low-cardinality dimensions — enums, booleans, small buckets. Avoid free text, IDs, or timestamps as prop values.
- **Every event should answer a specific question.** If you can't say what decision it informs, don't add it yet.
- **Wrap `window.plausible` once.** Add a tiny `src/lib/analytics.ts`:

  ```ts
  export function track(event: string, props?: Record<string, string | number | boolean>) {
    if (typeof window === "undefined") return;
    window.plausible?.(event, props ? { props } : undefined);
  }
  ```

  Call `track(...)` from the hooks/components below instead of hand-rolling `window.plausible` calls everywhere.

---

## Event catalog

### 1. Core submission funnel

This is the funnel that matters most: **land → write a claim → submit → see a result**.

| Event | Trigger | Props | Why |
|---|---|---|---|
| `Example Clicked` | `ChallengeForm.handleExampleClick` (`src/components/ChallengeForm/ChallengeForm.tsx:49`) | `example_index` (0–4) | Tells you whether people even read the examples, and which one is most tempting — useful for picking better defaults/placeholders. |
| `Challenge Submitted` | `ChallengeForm.handleSubmit`, right after validation passes, before calling `onSubmit` | `input_length_bucket` (`short`/`medium`/`long`, e.g. <50/50–200/>200 chars), `used_example` (bool — did the current value match one of `EXAMPLES`) | Core funnel entry. `used_example` tells you if example chips are a crutch people lean on vs. writing their own claim. |
| `Challenge Validation Failed` | `ChallengeForm.handleSubmit`, when `parsed.success` is false | `reason` (the zod issue code/short reason, not the message string) | Signals if your input constraints (length, empty, etc.) are actually blocking real users. |
| `Challenge Streaming` *(optional, low priority)* | first `phase` event in `useChallengeStream.start` | — | Confirms the SSE/stream connection actually opened. Only add if you suspect connection failures upstream of the `error` event. |
| `Challenge Completed` | `complete` event in `useChallengeStream.start` (`src/hooks/useChallengeStream.ts:50`) | `duration_ms_bucket` (fast/normal/slow — measure from `start()` call to `complete`), `reply_length_bucket` | The other half of the funnel. Pair with `Challenge Submitted` to get a completion rate, and `duration_ms_bucket` tells you if slow streams correlate with drop-off (compare against abandonment, see below). |
| `Challenge Errored` | `error` event and the `catch` block in `useChallengeStream.start` (`src/hooks/useChallengeStream.ts:54,59`) | `error_type` (`stream_error` vs `network_error`/`aborted`) | Directly actionable reliability signal. If this trends up after a deploy, you know immediately. |
| `Challenge Abandoned` | in the `useEffect` cleanup / `reset()` path, when `status === "active"` and the user navigates away or hits "Retry" mid-stream | — | Distinguishes "the model was too slow and they gave up" from a clean error. This is the metric most tools never track and most wish they had. |

**Funnel to build in Plausible:** `Challenge Submitted` → `Challenge Completed` → (`Reply Copied` or `Challenge Retried` or `Result Shared`). Drop-off between step 1 and 2 is your reliability/latency signal; drop-off after step 2 tells you if the output is actually good enough to act on.

### 2. Result actions

Once a reply exists (`ResultView`, `src/components/ResultView/ResultView.tsx`), what do people *do* with it?

| Event | Trigger | Props | Why |
|---|---|---|---|
| `Reply Copied` | `ResultView.handleCopy` (`:19`) | — | Best proxy you have for "the answer was good enough to use elsewhere." |
| `Challenge Retried` | the "Retry" button — both the `onAgain` callback path (home page) and the plain `<Link href="/">` path (shared-result page) | `from` (`"home"` / `"shared_result"`) | High retry rate from `home` after completion suggests the first reply often isn't satisfying. High retry from `shared_result` tells you visitors from shared links engage, not just bounce. |
| `Result Link Shared` | there's currently no explicit share button — see note below | `via` (`"copy_link"` if you add one) | See recommendation below; right now the only way a `/nope/[id]` URL gets shared is manual URL copy, which you can't track. |

**Recommendation:** add an explicit "Copy link" / "Share" button next to "Copy reply" in `ResultView`. Right now virality is invisible — you only find out a result was shared when someone else's browser hits `/nope/[id]`, and you can't tell *how* they got the link (paste from address bar vs. deliberate share). A tracked share button turns "people are sharing this" from a guess into a number.

### 3. Shared-result page (`/nope/[id]`)

`src/app/nope/[id]/page.tsx` is a plain server-rendered page, so Plausible's automatic pageview + referrer already covers "someone landed on a shared result." Two things worth adding:

| Event | Trigger | Props | Why |
|---|---|---|---|
| *(automatic pageview goal)* | Configure a Plausible **Custom Goal** on path pattern `/nope/**` | — | Distinguishes "shared result views" from homepage visits without any code change — just a dashboard config. |
| `Shared Result Not Found` | `notFound()` branch in `ResultPage` (`:36`) — fire client-side isn't possible since it's a server 404; instead track via a small client component or `not-found.tsx` (`src/app/nope/[id]/not-found.tsx`) | — | Catches broken/expired share links — a bad first impression for anyone arriving from a shared URL. |

### 4. Theme

| Event | Trigger | Props | Why |
|---|---|---|---|
| `Theme Toggled` | `ThemeToggle.setTheme` call site (`src/components/ThemeToggle/ThemeToggle.tsx:37`) | `theme` (`"dark"`/`"light"`) | Cheap to add, tells you the default theme choice and whether it's worth polishing dark mode further. |

### 5. History (currently disabled on the homepage)

`HistoryList` and the `<HistoryList />` render are commented out in `src/app/page.tsx:9,106`, but the components/hooks (`useHistory.ts`, `HistoryItem.tsx`) are fully wired. If/when you re-enable it:

| Event | Trigger | Props | Why |
|---|---|---|---|
| `History Item Opened` | click on a `HistoryItem` | — | Tells you if history is actually used for revisiting past claims, which justifies keeping the feature. |
| `History Item Deleted` | `HistoryList`'s `deleteMutation` call (`:48`) | — | Low priority; mostly useful for gauging whether people care about curating their history at all. |
| `History Cleared` | `clearMutation` call (`:37`) | — | Same as above. |

Until it's re-enabled, none of this is worth instrumenting — don't track dead code paths.

---

## Funnels & goals to configure in the Plausible dashboard

1. **Core loop:** `Challenge Submitted` → `Challenge Completed` → `Reply Copied` *or* `Challenge Retried`.
2. **Reliability:** `Challenge Submitted` → `Challenge Errored` / `Challenge Abandoned`, watched as a rate, not raw count — spikes after a deploy are your canary for the SSE endpoint (`src/app/api/challenge-me/route.ts`).
3. **Virality:** goal on `/nope/**` pageviews, segmented by referrer (Plausible does this automatically) — tells you where shared links actually get clicked (Twitter/X, Slack, iMessage previews, etc.).
4. **Onboarding friction:** `Example Clicked` vs. `Challenge Submitted` with `used_example: false` — ratio tells you if the blank-textarea state is intimidating people into leaning on examples.

## What *not* to bother with

- Don't track individual keystrokes/focus events in the textarea — Plausible isn't a session-replay tool, and it adds noise for no decision you can act on.
- Don't send the claim text, the reply text, or any substring of them as props, even truncated — a "short" claim can still be identifying.
- Don't create a prop per unique error message — bucket into a handful of `error_type` values or you'll blow past useful cardinality and get a dashboard full of one-off values.
