// ========================================
// MONTH NAME LOOKUP
// ========================================

const MONTHS = {
    jan: 0, feb: 1, mar: 2, apr: 3,
    may: 4, jun: 5, jul: 6, aug: 7,
    sep: 8, oct: 9, nov: 10, dec: 11
}


// ========================================
// PARSE A REAL DATE FROM SNIPPET TEXT
// ========================================
// Handles three common phrasings:
//   "Sep 28, 2026" / "Sep 28-29, 2026"  (month first)
//   "30 September 2026"                 (day first)
//   "January 2026"                      (month + year only)
// Returns an actual Date object, or null
// if nothing usable was found. Using a real
// Date object (instead of comparing raw text)
// avoids the bugs of relying on new Date(string)
// with unpredictable formats.

function parseDateFromText(text) {

    const monthPattern =
        "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec"


    // Pattern 1: Month Day(-Day)?, Year
    // e.g. "Sep 28, 2026" or "Sep 28-29, 2026"

    let match = text.match(
        new RegExp(
            `\\b(${monthPattern})[a-z]*\\s+(\\d{1,2})(?:(?:st|nd|rd|th)?\\s?[-–]\\s?\\d{1,2})?,?\\s+(\\d{4})\\b`,
            "i"
        )
    )

    if (match) {

        const monthKey = match[1].slice(0, 3).toLowerCase()
        const day = parseInt(match[2], 10)
        const year = parseInt(match[3], 10)

        if (MONTHS[monthKey] !== undefined) {
            return new Date(year, MONTHS[monthKey], day)
        }

    }


    // Pattern 2: Day Month Year
    // e.g. "30 September 2026"

    match = text.match(
        new RegExp(
            `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthPattern})[a-z]*,?\\s+(\\d{4})\\b`,
            "i"
        )
    )

    if (match) {

        const day = parseInt(match[1], 10)
        const monthKey = match[2].slice(0, 3).toLowerCase()
        const year = parseInt(match[3], 10)

        if (MONTHS[monthKey] !== undefined) {
            return new Date(year, MONTHS[monthKey], day)
        }

    }


    // Pattern 3: Month Year only, no day
    // e.g. "January 2026"
    // We treat this as the LAST day of that
    // month, so the opportunity is only
    // considered past once the whole month
    // has ended (gives it the benefit of
    // the doubt, since we don't know the
    // exact day).

    match = text.match(
        new RegExp(
            `\\b(${monthPattern})[a-z]*,?\\s+(\\d{4})\\b`,
            "i"
        )
    )

    if (match) {

        const monthKey = match[1].slice(0, 3).toLowerCase()
        const year = parseInt(match[2], 10)

        if (MONTHS[monthKey] !== undefined) {

            // Day 0 of the next month = last
            // day of this month

            return new Date(year, MONTHS[monthKey] + 1, 0)

        }

    }


    return null

}


function isPastDate(date) {

    const today = new Date()

    today.setHours(0, 0, 0, 0)

    return date < today
}


function isRelevant(item, type, domain) {

    const text = `${item.title} ${item.snippet} ${item.link}`.toLowerCase()

    // Remove articles, guides and discussions
    const excludedWords = [
        "top ",
        "best ",
        "guide",
        "how to",
        "tips",
        "discussion",
        "reddit"
    ]

    if (excludedWords.some(word => text.includes(word))) {
        return false
    }

    // Remove social media pages
    if (
        text.includes("instagram.com") ||
        text.includes("facebook.com")
    ) {
        return false
    }

    // Domain keywords are NOT required to pass
    // (many real listings never literally say
    // "hardware" or "software" even when they
    // match). Domain match is used for scoring
    // only - see calculateScore().

    // Opportunity type
    if (type === "hackathon") {
        return text.includes("hackathon")
    }

    if (type === "internship") {
        return text.includes("internship")
    }

    return true
}


// ========================================
// AGGREGATOR / DIRECTORY PAGE DETECTION
// ========================================
// These are pages that LIST many opportunities
// (job boards, "browse X internships" pages)
// instead of being one specific opportunity.
// A student clicking these has to search again,
// which defeats the point of HuntBot.

function isAggregatorPage(item) {

    const title = (item.title || "").toLowerCase()

    // Titles starting with a number count
    // ("105 Software Development Internships")
    if (/^\d+[\s+]/.test(title)) {
        return true
    }

    // Common aggregator/listing phrases
    const aggregatorPhrases = [
        "find & organize",
        "find and organize",
        "browse",
        "list of",
        "explore",
        "latest ",
        " jobs in ",
        " internships in ",
        "work from home software development internships",
        "remote internships in",
        "part time internships in"
    ]

    if (aggregatorPhrases.some(phrase => title.includes(phrase))) {
        return true
    }

    return false

}


function calculateScore(item, type, domain) {

    const text = `${item.title} ${item.snippet} ${item.link}`.toLowerCase()

    let score = 0

    // Domain match = 30 points
    const domainWords = domain === "hardware"
        ? ["hardware", "iot", "robotics", "embedded", "electronics"]
        : ["software", "web", "ai", "app", "cloud"]

    if (domainWords.some(word => text.includes(word))) {
        score += 30
    }

    // Opportunity type match = 30 points
    if (text.includes(type)) {
        score += 30
    }

    // Future date = 20 points
    const parsedDate = parseDateFromText(text)

    if (parsedDate && !isPastDate(parsedDate)) {
        score += 20
    }

    // Opportunity-related words = 20 points
    const opportunityWords = [
        "apply",
        "registration",
        "register",
        "applications",
        "deadline",
        "challenge",
        "competition"
    ]

    if (opportunityWords.some(word => text.includes(word))) {
        score += 20
    }

    // Penalize social media
    if (
        text.includes("instagram.com") ||
        text.includes("facebook.com")
    ) {
        score -= 30
    }

    return score
}


export function filterExpired(results, type, domain) {

    const filteredResults = results.filter((item) => {

        const text = `${item.title} ${item.snippet} ${item.link}`.toLowerCase()

        // Remove expired or closed opportunities
        if (
            text.includes("expired") ||
            text.includes("registration closed") ||
            text.includes("applications closed") ||
            /\bclosed\b/i.test(text) ||
            /\bended\b\s+\d+\s+(day|week|month|year)s?\s+ago/i.test(text)
        ) {
            return false
        }

        // Remove past opportunities
        const parsedDate = parseDateFromText(text)

        if (parsedDate && isPastDate(parsedDate)) {
            return false
        }

        // Remove irrelevant results
        if (!isRelevant(item, type, domain)) {
            return false
        }

        // Remove aggregator/directory pages
        if (isAggregatorPage(item)) {
            return false
        }

        return true
    })


    // Calculate score
    const scoredResults = filteredResults.map((item) => {

        const score = calculateScore(item, type, domain)

        return {
            ...item,
            score: score
        }
    })


    // Highest score first
    scoredResults.sort((a, b) => b.score - a.score)

    return scoredResults
}