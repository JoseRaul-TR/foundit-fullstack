#!/usr/bin/env python3
"""
FoundIt — open test round, 26 Aug – 20 Sep 2026. Reproducible analysis (#278).

Input: website_event.csv, the raw event export from Umami Cloud
       (Settings -> Websites -> <site> -> Data -> Export).

Umami stores created_at in UTC. The round opened with five posts between
16:16 and 16:39 CEST on 26 August, i.e. 14:16–14:39 UTC, and closed when the
Google Form stopped accepting responses at 09:00 CEST on 20 September
(07:00 UTC). The first externally-tagged arrival in the data is 14:40:30 UTC,
one minute after the last post — which is what confirms the timezone.

Run: python3 analyse_round.py website_event.csv
"""
import csv, collections, sys
from math import sqrt

ROUND_OPEN = "2026-08-26 14:16:00"   # UTC
ROUND_CLOSE = "2026-09-20 07:00:00"  # UTC

# Sessions belonging to the developer, identified by: starting before the round
# opened, Karlstad, es-ES, and walking every route in the app in sequence.
# The three short Karlstad sessions and the two long ones are the same person
# on laptop and phone. Listed explicitly rather than inferred by rule, so the
# judgement is visible and can be disagreed with.
DEVELOPER = {"01c92c0d", "133c4e0d", "1237cc82", "bab285a9",
             "f0460bf5", "fdde1a75", "7882e809"}

# Five sessions that cannot be resolved, and are therefore reported as a range
# rather than decided. Each one matches the developer's phone on every field
# Umami records — 414x896, iOS Safari, es-ES, mobile, landing directly on /es
# with no UTM and no referrer — and differs only in IP. Umami's session_id is a
# hash that includes the IP, so one phone moving between wifi and mobile data
# is already counted as several visitors here: the developer's own device
# appears three times for that reason.
#
# The city field does not settle it. It is the registration of the IP block,
# not a location: three of these five have no city at all, and on 15 September
# the same fingerprint appears in Karlstad at 08:00 and in "Kävlinge", 600 km
# away, at 09:13 — a journey nobody made, and a normal result for a Swedish
# mobile carrier. No event of the five falls within 15 minutes of a developer
# event, which is what one device switching networks looks like and also what
# two people who never coincided look like. Twelve events over three weeks do
# not separate those.
#
# The uncertainty is structural, not statistical: more visitors would not
# resolve it, because cookieless analytics cannot distinguish one person on two
# networks from two people on one device model.
UNRESOLVED = {"1323399e", "57fe0a1b", "b41b669e", "f41c0693", "f3b9d71e"}

DATACENTRE = {"US", "BR", "AR"}   # no Swedish round reaches these organically

M = 5          # form responses
BLOCKERS = 2   # respondents reporting an ad blocker; nobody answered "not sure"


def wilson(k, n, z=1.96):
    """95% interval for a proportion. At n=5 the normal approximation is
    useless and Wald would give a negative lower bound."""
    p, d = k / n, 1 + z * z / n
    centre = (p + z * z / (2 * n)) / d
    half = (z / d) * sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return max(0.0, centre - half), min(1.0, centre + half)


def locale(path):
    """Unprefixed routes are English, not 'no locale' (#264)."""
    if path.startswith("/sv"): return "sv"
    if path.startswith("/es"): return "es"
    return "en"


def main(path):
    rows = [r for r in csv.DictReader(open(path))
            if ROUND_OPEN <= r["created_at"] <= ROUND_CLOSE
            or r["created_at"] < ROUND_OPEN]          # keep, then report separately
    sessions = collections.defaultdict(list)
    for r in rows:
        sessions[r["session_id"]].append(r)

    dev = {s for s in sessions if s[:8] in DEVELOPER}
    unresolved = {s for s in sessions if s[:8] in UNRESOLVED}
    crawlers = {s for s, e in sessions.items() if len(e) == 1 and (
        e[0]["country"] in DATACENTRE or e[0]["utm_source"].startswith("aDqCFYf"))}
    external = set(sessions) - dev - crawlers

    print(f"Umami reports          : {len(sessions)} visitors, "
          f"{len({r['visit_id'] for r in rows})} visits, {len(rows)} pageviews")
    print(f"  less crawlers        : -{len(crawlers)}")
    print(f"  less the developer   : -{len(dev)}")
    print(f"  V (other people)     : {len(external)}"
          f"   (range {len(external) - len(unresolved)}–{len(external)})")

    dev_views = sum(len(sessions[s]) for s in dev)
    print(f"\nPageviews by the developer: {dev_views} of {len(rows)} "
          f"({dev_views / len(rows):.0%})")

    searches = [r for r in rows if r["url_query"].startswith("q=")]
    print(f"Pageviews that are search-box states: {len(searches)} "
          f"({len(searches) / len(rows):.0%}) — the search writes each "
          f"keystroke to the URL, so 'pageviews' is not pages seen")

    print("\nBy campaign, external people only, one session counted once:")
    per = collections.Counter()
    for s in external:
        tags = sorted({e["utm_source"] for e in sessions[s] if e["utm_source"]})
        per[tags[0] if tags else "(untagged)"] += 1
    for name, n in per.most_common():
        print(f"  {name:22s} {n:3d}")

    print("\nBy route locale, external people only:")
    views = collections.Counter()
    who = collections.defaultdict(set)
    for s in external:
        for e in sessions[s]:
            views[locale(e["url_path"])] += 1
            who[locale(e["url_path"])].add(s)
    total = sum(views.values())
    for k in ("sv", "en", "es"):
        print(f"  {k}  {views[k]:4d} views ({views[k] / total:4.0%})  "
              f"used by {len(who[k])} sessions")

    p = BLOCKERS / M
    lo, hi = wilson(BLOCKERS, M)
    print(f"\np = {p:.2f}, 95% interval [{lo:.2f}, {hi:.2f}]. Nobody answered "
          f'"not sure", so the interval the ticket asked for collapses to a '
          f"point and this sampling interval replaces it.")
    V = len(external)
    print(f"\nWith V = {V}:")
    for label, pv in (("lower", lo), ("point", p), ("upper", hi)):
        print(f"  {label:6s} p={pv:.2f}  true visitors V/(1-p) = {V / (1 - pv):6.1f}"
              f"   response rate M(1-p)/V = {M * (1 - pv) / V:6.1%}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "website_event.csv")
