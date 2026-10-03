# HuntBot — AI-Powered Opportunity Hunter

HuntBot helps students find real hackathons and internships that match their
interests, instead of manually checking Unstop, Internshala, LinkedIn, and
other sites one by one.

A student picks a domain (Software / Hardware) and an opportunity type
(Hackathon / Internship), and HuntBot searches the web live using SerpApi,
filters out expired, irrelevant, and listing/aggregator pages, ranks the
results, and shows a clean list with a match score, deadline (when available),
and required skills (for internships, when available).

## Problem it solves

Students miss real opportunities because they're scattered across many
platforms, with no single place that searches across all of them and filters
down to what's actually relevant to a specific student. HuntBot automates
that search and filtering step.

## Track

**Track 01 — AI Agents.** HuntBot plans multiple searches based on user input,
compares and scores results against relevance criteria, and filters/ranks
them — rather than just displaying raw search results.

## How it uses SerpApi

HuntBot calls **SerpApi's Google Search engine** (`engine=google`) with
site-restricted queries (`site:unstop.com`, `site:internshala.com`, etc.) to
pull results directly from trusted hackathon/internship platforms, biased
toward India using the `gl`/`hl` parameters.

When a site-restricted search returns too few usable results after filtering,
HuntBot automatically runs a broader fallback search (still India-biased) so
the user isn't left with an empty results page.

**Why SerpApi is essential:** opportunity listings change daily — deadlines
pass, new hackathons appear. A static dataset would go stale within days.
HuntBot depends on live search data to stay accurate, which is the core of
what it does.

## Tech stack

- **Backend:** Node.js + Express
- **Frontend:** HTML, CSS, vanilla JavaScript
- **Search data:** SerpApi (Google Search engine)
- **Storage:** Browser localStorage for saved/bookmarked opportunities (no
  database needed for this version)

## How it works

1. User selects a domain (Software/Hardware) and type (Hackathon/Internship)
2. Backend builds site-restricted search queries for trusted platforms
   (Unstop, Internshala, LinkedIn, Wellfound for internships; Unstop,
   Devfolio, Devpost, MLH for hackathons)
3. Each query is sent to SerpApi
4. Results are verified against the intended source domain (Google sometimes
   ignores `site:` restrictions when too few matches exist)
5. Results are filtered: expired/closed listings, irrelevant pages, and
   aggregator/directory pages ("105 Internships in X") are removed
6. If too few results remain after filtering, a broader fallback search runs
7. Remaining results are scored (domain match, type match, recency,
   opportunity-related keywords) and sorted by score
8. Deadline and required skills are extracted from the snippet text when
   mentioned
9. Results are sent to the frontend and displayed as cards with a match
   percentage, deadline, and skills (where available)

## Setup instructions

### Prerequisites
- Node.js installed
- A free SerpApi account and API key ([serpapi.com](https://serpapi.com))

### Steps

1. Clone the repository
   ```
   git clone https://github.com/coder-vishnu-176/HuntBot.git
   cd HuntBot
   ```

2. Install backend dependencies
   ```
   cd backend
   npm install
   ```

3. Create a `.env` file inside the `backend` folder with your SerpApi key
   ```
   SERPAPI_KEY=your_serpapi_key_here
   ```

4. Start the backend server
   ```
   node server.js
   ```
   The server runs on `http://localhost:3000`

5. Open the frontend
   Open `frontend/index.html` in your browser (e.g. using VS Code's Live
   Server extension, or by opening the file directly).

6. Select a domain and opportunity type, then click **Find Opportunities**.

## Known limitations

- **Deadlines and skills are extracted from search snippet text**, which
  doesn't always mention them explicitly. When not found, the card shows
  "Check listing" or "Not specified" rather than guessing.
- Results depend on what Google has indexed from the listed platforms at
  search time; very recently posted opportunities may not appear yet.
- Currently supports two domains (Software/Hardware) and two opportunity
  types (Hackathon/Internship); scholarships and off-campus drives are not
  yet included.

## AI tools used

Claude (Anthropic) was used for code assistance, debugging, and planning
throughout development.