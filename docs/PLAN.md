# AI Atlas: Build Plan

_Source: AI Atlas Build Plan.pdf (Oct 26, 2026, Sebastian Appel). Text extracted verbatim; tables flattened._


Oct 26, 2026  · ​@Sebastian Appel
AI Atlas is a free public website that shows how money and power move through the AI
industry, built in about 16 weeks across 6 phases by an AI coding agent, then kept up to
date by a second AI agent every morning.
What we decided
The one rule that matters most: every deal on the site has a source link and a date. The
site is only as good as its data, and an investor who finds one made-up deal will stop
trusting all of it.
Question
Decision
Goal
A public site anyone can use, that looks great. Not
built for a contest or college apps.
Who it's for
Investors first. An "Explain this" switch turns every
number and deal into plain English for everyone
else.
Sections
Two only: the Money Graph (a giant mind map of
companies with money flowing between them) and
the Energy Map (US data centers and where their
power comes from).
Area
United States first.
Who codes
An AI coding agent writes 100% of the code.
Sebastian writes the prompts, reviews and
decides.
Budget
Up to $20 a month.
Updates
An AI agent runs every morning to add new deals
and fix old ones.

The two sections
1. The Money Graph
One giant interactive map where every dot is a company, every line is a deal, and glowing
particles flow along the lines in the direction the money moves.
What you see
Dots = companies. About 150 at launch. Size shows annual revenue (or the latest
valuation for private companies). Color shows the company's sector (list below).
Lines = deals. Thickness shows the dollar amount on a log scale, so a $300 billion
contract doesn't hide a $2 billion one. Particles show which way money moves.
Solid vs. dashed. A solid line is money that's confirmed in filings. A dashed line is an
announced "up to" amount that hasn't fully happened.
Clusters form on their own. Connected companies pull together, so chip makers, labs
and power companies group up without you placing them.
The 10 sectors (colors): AI labs · Cloud giants (Microsoft, Amazon, Google, Oracle) ·
Neoclouds (CoreWeave, Nebius, Lambda) · Chip designers (Nvidia, AMD, Broadcom) ·
Chip factories and packaging (TSMC, Samsung) · Memory and storage (Micron, SK hynix,
SanDisk) · Networking and equipment (Arista, Corning, Vertiv) · Data center builders ·
Power companies (Vistra, Constellation, Oklo) · Investors (SoftBank, VCs, sovereign
funds)
What you can do
Click a company to open a side panel: what it does, key numbers, money in vs. money
out, every deal with its source link, and a price chart for public companies.
Hover a line to see the deal card: who, what, how much, when, status and source.
Filter by deal type, minimum size, status, and confirmed vs. announced.
Search any company with the / key or Cmd+K.
Time slider: drag from 2019 to today and watch the web grow.
Follow the money: pick a company and light up everything 1, 2 or 3 steps away.
Loop finder: highlights circular deals. Example: Nvidia invests in CoreWeave, and
CoreWeave spends money buying Nvidia chips.
Exposure score: shows how much of a public company's future revenue depends on
one customer, like how much of a cloud company's backlog comes from OpenAI.

Share links: every view has its own URL, so investors can send each other an exact
picture.
Explain this mode. One switch at the top turns on plain English. Each panel gets a short
explanation, and jargon (HBM, PPA, hyperscaler, "up to") gets a hover definition. A 60-
second guided tour shows first-time visitors around. The daily agent writes these
explanations ahead of time and saves them, so they cost nothing per visitor and load
instantly.
2. The Energy Map
A dark map of the US showing every big AI data center, plus the power plants and grid
regions that feed it.
Layers you can turn on and off
Data centers: circles sized by power use (in megawatts), colored by status: operating,
under construction or planned.
Power plants: every US plant over 50 MW, colored by fuel (gas, nuclear, coal, solar,
wind, hydro, batteries).
Power deals: curved arcs from a data center's owner to the plants it buys power from.
Example: Meta to Vistra's Ohio nuclear plants.
Grid regions: the areas run by grid operators like PJM, ERCOT and MISO. They're
colored by today's fuel mix, from hourly government data.
Electricity prices by state, with the trend over time. This is where the "what does this
mean for my power bill" story lives.
Click a data center to see its owner, main tenant (like OpenAI), power in MW, estimated
number of chips, estimated cost, build timeline, power sources and grid region.
The two sections link together. Click Meta on the map and jump to Meta in the Money
Graph, and the other way around.
The data
Almost all the background data is free, but the deals between companies (the heart of the
Money Graph) have no free feed. The agents have to collect them from filings, press
releases and news.

Where it comes from
Data
Source
Cost
Notes
Biggest AI data
centers (power,
chips, cost, timeline)
Epoch AI Frontier Data
Centers
Free (CC-BY,
credit them)
Launched with 13
huge US sites, built
from satellite photos
and permits. Covers
only the giants.
GPU clusters, AI
companies, chip
owners, HBM
memory use, AI
models
Epoch AI datasets
Free (CC-BY)
Downloadable files.
Great for revenue,
funding and who
owns which chips.
Public company
numbers (revenue,
backlog)
SEC EDGAR APIs
Free
No key. Needs your
contact info in each
request.
New deals in filings
SEC 8-K and 10-Q filings
Free
The most trustworthy
source for deals.
Every US power plant
(location, fuel, size)
EIA-860 and EIA-860M
Free (public
domain)
Free API key. Updated
monthly.
Hourly grid data by
region
EIA-930 through the
EIA API
Free
Demand and fuel mix
for each grid region.
Electricity prices by
state
EIA
Free
Monthly.
Stock price charts
TradingView embed
widgets
Free
Built for public sites.
Many free stock APIs
forbid showing their
data publicly, so
check terms.
Smaller data centers
Company
announcements, local
news, OpenStreetMap
Free, but
collected by
the agent
Start with sites of 100
MW or more.

How the data is shaped
The site stores four kinds of records. Each record lives in a JSON file in the GitHub repo.
Company: name, sector, public or private, ticker, home state, revenue (with its year and
source), valuation, one-line description and a plain-English explanation.
Deal: who pays, who gets paid, deal type, amount, amount kind (confirmed, "up to" or
estimated), date, length in years, status, sources (link, publisher, date and an exact
quote), confidence, last checked date, plain-English explanation.
Data center: name, owner, tenants, location, state, power now and planned (MW),
status, estimated chips, estimated cost, grid region, linked power deals, sources.
Power plant: imported from EIA: name, operator, fuel, size in MW and location.
Three rules the agents must follow:
1. Lines always point the way money moves. For an investment, the investor points to
the company. For a chip order, the buyer points to the chip maker. For a cloud contract,
the AI lab points to the cloud. For a power deal, the data center owner points to the
power company.
Data
Source
Cost
Notes
Deals (investments,
chip orders, cloud
contracts, power
deals)
Press releases, filings,
news
Free, but
collected by
the agent
Every deal needs a
source link and a
quote.
Private company
finances (OpenAI,
Anthropic, xAI)
News reports, Epoch
Free
Estimates. Label them
that way.
Power lines
HIFLD Open
Skip for now
The government shut
down this free site in
2025. Archived copies
exist.
Supply-chain
databases
Bloomberg, PitchBook,
FactSet
Paid,
thousands of
dollars a year
Skip.

2. Never delete a deal. If it changes or gets canceled, mark it "revised" or "canceled" and
link to the new version. Example: talk of a $100 billion Nvidia investment in OpenAI
ended up as about $30 billion in early 2026. The time slider should show both.
3. Never add "up to" amounts to confirmed ones in totals. Show them separately.
Tech stack
The stack is the most common modern web setup, because AI coding agents have seen
the most examples of it and make the fewest mistakes with it.
Part
Pick
Why
Framework
Next.js + TypeScript
The most popular web stack.
TypeScript catches the agent's
mistakes before you see them.
Look and feel
Tailwind CSS + shadcn/ui + Framer
Motion
Clean, modern parts out of the box,
plus smooth panel animations.
Money Graph
react-force-graph (2D canvas)
Has moving particles along lines
built in, which is exactly the money-
flow look. Switch to Sigma.js only if
the graph passes about 3,000 dots.
Graph layout
Worked out once a day when the
site rebuilds
The map looks the same on every
visit and loads instantly.
Energy Map
MapLibre GL + deck.gl
Free and open source. deck.gl
draws the glowing arcs and circles.
Map
background
A free dark map style (Protomaps
or MapTiler's free tier)
Check the free limits before
launch.
Small charts
Recharts
Simple bar and line charts in side
panels.
Data storage
JSON files in the GitHub repo
Free, easy for agents to read and
edit, and every change is saved in
history. Move to a database
(Supabase) only if it outgrows files.
Data checks
Zod schemas + a check-data
script
Rejects any deal with no source, a
broken date or a missing field.

Design direction: a dark "trading terminal meets star map" look. Use a near-black
background, glowing sector colors, a clean font (Inter) for text and a monospace font
(JetBrains Mono) for numbers. Keep one accent color for whatever is selected.
Set up the repo so the agent builds well
1. Give the agent the plan. Save this doc in the repo as docs/PLAN.md . Add a CLAUDE.md
that lists the stack, the folder layout, the three data rules and the commands to run
before finishing.
2. One feature per prompt, one pull request each. Open the Vercel preview link and look
at it before you merge.
3. Let the agent see its own work. Ask it to take screenshots with Playwright and check
them, since it can't otherwise see the page.
4. Start with fake sample data in Phase 0, so the screens and the real data can be built at
the same time.
5. Keep a DECISIONS.md  log. New agent sessions read it instead of re-arguing old
choices.
6. Test the logic, not the looks. Ask for tests on the loop finder, money totals and data
checks.
Phases
Six build phases plus a setup week take about 16 weeks to a public launch. The agent
writes code fast, so the pace is set by checking data and polishing the design. Don't start
a phase until the last one's "done when" boxes are ticked.
Part
Pick
Why
Hosting
Vercel (free Hobby plan)
Every pull request gets a preview
link you can click before merging.
Daily agent
GitHub Actions + the Claude API
Free for public repos. Details in the
daily update agent section.
Visitor stats
Vercel Web Analytics
Free tier, one line to turn on.

The daily agent (Phase 3) comes before the extra graph tools and the Energy Map, so the
data grows on its own while those get built.
Phase 0: Foundations (week 1)
Goal: an empty but live site, and a repo the agent can work in.
Create the Next.js project and connect it to Vercel.
Write CLAUDE.md , docs/PLAN.md  and DECISIONS.md .
Build the data schemas and the check-data  script.
Add 10 fake companies and 15 fake deals as sample data.
Set the design basics: colors for each sector, fonts and the dark theme.
Done when:
Phase 1: Seed the real data (weeks 2 to 4)
Goal: real data for about 150 companies, 300 deals, the big data centers and every US
power plant.
build timeline · 7 phases over 16 weeks
The site is live at a Vercel link
check-data  rejects a deal that has no source
A sample page uses the sector colors and fonts

Have the agent research deals one sector at a time (one prompt per sector). Each deal
needs a source link and an exact quote.
Import Epoch's datasets, EIA's power plant list and SEC revenue numbers with scripts.
Spot-check 1 in every 10 deals yourself.
Done when:
Phase 2: Money Graph, first version (weeks 5 to 7)
Goal: the main view working and looking great.
Draw the graph: sector clusters, dot sizes, line thickness, moving particles, solid vs.
dashed lines.
Add the click side panel, the hover deal card, search and filters.
Give every view its own shareable link.
On phones, show a simpler view: a searchable company list with a smaller graph.
Done when:
Phase 3: Daily update agent (weeks 8 to 9)
Goal: the data stays fresh without you doing anything most days. This comes early so data
keeps growing while you build the rest.
Build the pipeline in the next section.
Add a "What changed today" page that lists every new or updated deal.
Add a weekly re-check of older deals that are still marked "announced."
Done when:
150+ companies across all 10 sectors
300+ deals, each with a working source link
At least 29 of 30 randomly picked deals are correct when you check them by hand
Data centers and power plants imported, and check-data  passes
The graph loads in under 2 seconds on a laptop and moves smoothly
Clicking any company shows all its deals with sources
Three people who invest can answer "who pays Nvidia the most?" in under 30 seconds
It runs every morning for 2 weeks without breaking

Phase 4: Graph tools and Explain mode (weeks 10 to 11)
Goal: the features that make investors come back.
Time slider, follow the money, loop finder and exposure score.
Explain mode: the switch, hover definitions and a 60-second guided tour.
A page for every company (like /company/nvidia ), so people can find them on Google.
Done when:
Phase 5: Energy Map (weeks 12 to 14)
Goal: the second section, linked to the first.
The map with data center, power plant, power deal, grid region and electricity price
layers.
Data center cards, and links back to the Money Graph.
Grid region colors from hourly EIA data.
Done when:
Phase 6: Polish and launch (weeks 15 to 16)
Goal: a site strangers trust and share.
Speed and phone layout fixes.
Link previews (the image people see when the site is shared).
It catches at least 8 of every 10 big deals (compare with a list you keep by hand for one
week)
Zero made-up deals get published
The monthly API bill stays under $20
The time slider replays 2019 to today
The loop finder catches known loops, like Nvidia and CoreWeave
A friend who doesn't invest can explain the graph back to you after using Explain mode
Every data center from Phase 1 is on the map, with power and status
Power plants filter by fuel
Grid colors update at least once a day
Clicking a data center's owner opens it in the Money Graph

A Methodology page: where the data comes from, how it's checked, and a "not
investment advice" note.
A "Report an error" button on every deal.
A custom domain.
Launch on Reddit (r/dataisbeautiful, r/stocks), Hacker News (Show HN) and finance
X/Twitter.
Done when:
The daily update agent
Every morning a script finds new deals, checks them, and publishes only the ones it can
prove from an official source. Anything less certain waits for your one-tap approval.
Only deals that pass every check and come from an official source skip your review.
The steps, every morning at about 6 a.m. Eastern:
Pages load in under 2 seconds on a phone
Methodology page and error button are live
Launched in at least 3 places
daily update flow · 6 steps, 1 decision

1. Collect. Pull new SEC filings (8-Ks and 10-Qs) for every tracked public company,
company newsroom feeds, news feeds for search terms like "data center" and "power
purchase agreement," and any updates to the Epoch and EIA datasets.
2. Sort. A small, cheap model (Claude Haiku 5.5) reads each headline and answers one
question: is this a new deal or a change to one we already have? Most items get thrown
out here.
3. Extract. A stronger model (Claude Sonnet 5.5) reads each remaining article and fills in
the deal form. It must copy the exact sentence that proves the deal.
4. Check. Code, not AI, runs four tests:
a. Does the copied quote really appear on the source page? This is what stops made-
up deals.
b. Is it a duplicate of a deal we already have?
c. Is the amount sensible for these two companies?
d. Does it pass check-data ?
5. Publish or queue. If the source is official (an SEC filing or the company's own press
release) and every check passes, the agent saves it and the site rebuilds by itself.
Everything else becomes a pull request on GitHub that you approve or reject.
6. Write the extras. It writes the plain-English explanation for each new deal and adds it
to the "What changed today" page.
Where it runs: a GitHub Actions job on a daily schedule, calling the Claude API. It's free
for public repos, and the job is about 200 lines of code the coding agent can write. A
Claude Code scheduled routine could also work, but an Actions job is easier to log, debug
and keep cheap.
Cost estimate: about $5 to $12 a month. Sorting around 400 headlines a day with Haiku 5.5
($0.10 per million input tokens) costs almost nothing. Extracting around 15 articles a day
with Sonnet 5.5 ($2 in and $10 out per million tokens) costs about 30 cents a day. These are
October 2026 prices, and the real numbers depend on how much news there is.
How much of your time it takes: about 2 to 5 minutes a day to approve or reject the
queued items. Fully hands-off is possible, but news-only deals are where mistakes
happen, and one wrong deal can cost the site its trust.
Costs
The whole site should run for about $6 to $13 a month, well under the $20 budget.

Vercel's free plan is for non-commercial sites only. If you ever add ads or paid features,
you'd need the Pro plan at $20 a month.
Rules to stay safe
Show a "not investment advice" note in the footer and on the Methodology page.
Credit Epoch AI on every page that uses its data. Their license requires it.
Link to news articles and quote at most one sentence. Don't copy their text.
Only show stock prices through tools whose terms allow public display, like
TradingView widgets.
Hard parts and what to do about them
Item
Monthly cost
Claude API for the daily agent
About $5 to $12 (estimate)
Domain name
About $1 (roughly $12 a year)
Vercel hosting (Hobby plan)
$0
GitHub Actions (public repo)
$0
Map background tiles
$0 on a free tier
Epoch, SEC and EIA data
$0
Risk
What to do
The agent invents or misreads a deal
Quote check in code, auto-publish only from
official sources, a review queue, and a "Report an
error" button.
"Up to" amounts make totals look huge
Keep confirmed and announced money separate,
solid vs. dashed lines.
The graph turns into a tangled hairball
Start zoomed out on the 50 biggest companies.
Let people open clusters to see more.
Private company numbers are guesses
Label them "estimate" and show a range when
sources disagree.

Open questions
Keep the name "AI Atlas"? Check that a domain is available before Phase 6.
Should visitors be able to suggest new deals, or only report errors?
Open-source the data and code? It makes the daily agent free on GitHub and builds
trust, but anyone could copy the dataset.
Sources
Epoch AI data hub and license
Epoch AI: Introducing the Frontier Data Centers Hub
The Next Web: Nvidia tops $40bn in AI equity bets in 2026
WTOP / AP: Meta signs three nuclear power deals
NAPSG: Navigating the HIFLD transition
Claude API prices are from Anthropic's model list as of October 2026.
Risk
What to do
Deals change after they're announced
Never delete. Mark revised or canceled, and link
to the new version.
Phones struggle with big graphs
Give phones a list view plus a smaller graph.
Few free sources for smaller data
centers
Start with sites of 100 MW or more, and say
clearly on the map what's covered.
Scope creep
Only the two sections until launch. New ideas go
on a "Later" list.
