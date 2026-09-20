# Open test round — 26 August to 20 September 2026

Method and results for the round that produced #306, #307, #309, #310 and #314.
Closed by #278.

This file carries the aggregates and the reasoning. The raw analytics export is
**not** in this repository: it contains city derived from IP, screen
resolution, browser, language and what visitors typed into the search box. It
is held privately alongside the project log, frozen on 20 September, and can be
produced on request. `analyse_round.py` in this folder recomputes every number
below from it.

## Window

|          |                                                                                                 |
| -------- | ----------------------------------------------------------------------------------------------- |
| Opened   | 2026-08-26 16:16 CEST (14:16 UTC), five posts until 16:39                                       |
| Closed   | 2026-09-20 09:00 CEST (07:00 UTC), when the form stopped accepting responses                    |
| Channels | class Discord, school Discord, JuniorDevSverige Discord, LinkedIn, and a private WhatsApp group |

Umami stores timestamps in UTC. The first externally tagged arrival in the data
is at 14:40:30 UTC — one minute after the last post. That is what establishes
the timezone; it was not assumed.

The last recorded event is 2026-09-19 17:00 UTC, so the 09:00 cut-off on the
20th excluded nothing. Data begins at 2026-08-26 09:02 UTC, five hours before
the round opened: that is the developer walking every route in the app before
publishing, and it sits outside the window.

## Visitors

Umami reports **60 visitors, 119 visits, 768 pageviews**. Three quarters of
that is not what the round measured.

|                                   |           |
| --------------------------------- | --------- |
| Umami's figure                    | 60        |
| less automated clients            | −16       |
| less the developer's own sessions | −7        |
| **V — other people**              | **32–37** |

**The 16 automated clients** are single-pageview sessions with zero recorded
duration, originating in data centres (Google Iowa, AWS Virginia and Oregon,
Azure). Four of them carry a `utm_source` value that no campaign used and fire
between one and eight seconds after a genuine arrival, from a different city:
link-preview crawlers following the URL a person had just clicked.

**The 7 developer sessions** account for **470 of the 768 pageviews (61%)**.
They are listed explicitly in `analyse_round.py` rather than matched by a rule,
so the judgement is visible and can be disputed.

**Five sessions cannot be resolved.** Each matches the developer's phone on
every field the analytics records — viewport, browser, operating system,
language, landing route, absence of referrer — and differs only in IP address.
Umami's visitor identity is a hash that includes the IP, so a single phone
moving between wifi and mobile data is already counted several times: the
developer's own device appears three times for exactly that reason. The city
field does not settle it, because it is the registration of the IP block and
not a location — three of the five have no city at all, and on 15 September the
same fingerprint appears in two cities 600 km apart 73 minutes apart, which is
a normal result for a Swedish mobile carrier and an impossible journey.

This uncertainty is structural rather than statistical. More visitors would not
resolve it: cookieless analytics cannot distinguish one person on two networks
from two people using the same phone model in the same language.

## Responses and response rate

M = **5** responses. Ad blocker reported by **2 of 5**, so p = **0.40**.

#278 asked for an interval built from coding "not sure" two ways. Nobody
answered "not sure", so that interval collapses to a point and the uncertainty
that remains is sampling: the 95% Wilson interval for 2/5 is **[0.12, 0.77]**.

Estimated true visitors V/(1−p); response rate M(1−p)/V:

| V   | p    | True visitors | Response rate |
| --- | ---- | ------------- | ------------- |
| 37  | 0.12 | 42            | 11.9%         |
| 37  | 0.40 | 62            | 8.1%          |
| 37  | 0.77 | 160           | 3.1%          |
| 32  | 0.40 | 53            | 9.4%          |

**Response rate: 3.1% – 13.8%** across both sources of uncertainty.

The five unidentified visitors move the figure by about one point. The sample
size moves it by ten. Whatever is wrong with the visitor count is not what
makes this number imprecise.

## Channels

One session counted once, external people only.

| Campaign                 | People |
| ------------------------ | ------ |
| School Discord           | 6      |
| JuniorDevSverige Discord | 6      |
| Class Discord            | 6      |
| LinkedIn                 | 5      |
| WhatsApp                 | 5      |
| No campaign tag          | 9      |

No channel outperformed the others. Four public channels returned between five
and six people each, and the fifth was a private group of the same size.

Three further campaign labels appear in the raw data with one visitor each.
All three are inside a single developer session between 13:15 and 13:17 UTC on
26 August, an hour before the round opened: link tests under names that were
changed before publishing. They delivered nobody.

The nine untagged sessions are returning visitors and forwarded links. A link
passed on by hand loses its query string, so UTM measures the first click and
not the channel.

## Language

Route prefix, external people only. Unprefixed routes are English, not "no
locale" (#264).

| Locale  | Pageviews | Share | Sessions using it |
| ------- | --------- | ----- | ----------------- |
| Swedish | 141       | 50%   | 19                |
| Spanish | 106       | 38%   | 13                |
| English | 35        | 12%   | 6                 |

The Spanish share is not reach: it is the private WhatsApp group, which is
Spanish-speaking. For contrast, the developer's own sessions are 61% Spanish,
23% English and 17% Swedish. The two locales have different audiences, and
neither resembles the developer's own usage.

## What "pageviews" counts

**275 of the 768 pageviews (36%) are intermediate states of the search box.**
The search writes each keystroke to the URL, so one search can produce six
pageviews, including the typing errors on the way. Any pageview figure from
this round is largely a measure of how much was typed.

Umami's own engagement figures for the unfiltered set — 34% bounce rate,
4 minutes 57 seconds mean visit duration — are reported here because they exist
only in the aggregate export and cannot be recomputed from the raw one. They
include the developer and the crawlers and should not be quoted without that
qualification.

## Hosting

Free instance hours on Render, one service:

|                        |                                |
| ---------------------- | ------------------------------ |
| August                 | 683.15 h of 744 possible (92%) |
| September, to the 20th | 226.67 h                       |

#278 set a threshold: roughly 330 hours by 20 September would mean the external
keep-warm job ran, roughly 60 hours would mean it never did. Neither month
resembles 60, so the keep-alive ran and the round did not carry a cold start.

The threshold itself was mis-specified. It was calculated for a service kept
awake by a GitHub Actions schedule, which is not what ran — that workflow was
removed on 29 August after the scheduler dropped almost every run (#276), and
an external cron service replaced it. The two months also differ by a factor of
two, and nothing in the data collected explains why. The criterion is answered
in the direction it cared about and should not be treated as a measurement.

The external keep-warm job was deleted on 2026-09-20 at 09:21 CEST.

## Limitations

**The instrument asked what was wrong and not what was right.** The only
free-text field invited complaints. A respondent pointed this out from inside
the form on 28 August and then wrote his positive answer in the complaints box
anyway, which is how it was noticed. A question — "What worked well?" — was
added afterwards but never announced to anyone, and is blank in all five
responses. Any reading of this round is therefore biased toward the negative by
construction, and the correction that was made produced no data.

**The second reminder wave did not happen.** #278 planned a reminder in four
channels around 14–15 September, on the reasoning that a second wave costs less
than the first and usually returns as much. Instead a single private message
went to one participant, deliberately, to avoid repeating the same request in
three channels. The consequence is that the assumption is **untested**, not
disproved, and the round's total remains a single-wave figure.

**No custom events were recorded.** The analytics captured page views only, so
the round can say which pages were visited and nothing about which features
were used. Watchlist additions, ratings, season marking and search type
switching are all invisible to it. The two empty event tables are retained in
the private folder as evidence of that gap.

**p is estimated from respondents, not from visitors.** People who answer a
feedback form are not a random sample of those who saw it, and there is no way
here to check whether ad blocker users were more or less likely to respond.

## Reproducing this

```
python3 analyse_round.py website_event.csv
```

The script prints every figure above. Where it applies a judgement — which
sessions belong to the developer, which are automated — the decision is a
literal list in the source with the reasoning beside it, so that disagreeing
with the result means disagreeing with something visible.
