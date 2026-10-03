function extractDate(text) {

    // Allow optional spaces around the dash,
    // since real snippets write dates as
    // both "Apr 13-14, 2026" and "Apr 13 - 14, 2026"

    const match = text.match(
        /([A-Z][a-z]+)\s+\d{1,2}(?:\s?[-–]\s?\d{1,2})?,?\s+\d{4}/i
    )

    if (!match) {
        return null
    }

    const dateText = match[0]

    const rangeMatch = dateText.match(
        /([A-Z][a-z]+)\s+\d{1,2}\s?[-–]\s?(\d{1,2}),?\s+(\d{4})/i
    )

    if (rangeMatch) {
        const month = rangeMatch[1]
        const endDay = rangeMatch[2]
        const year = rangeMatch[3]

        return `${month} ${endDay}, ${year}`
    }

    return dateText
}


function isPastDate(dateText) {

    const date = new Date(dateText)
    const today = new Date()

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
    const dateText = extractDate(text)

    if (dateText && !isPastDate(dateText)) {
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
        const dateText = extractDate(text)

        if (dateText && isPastDate(dateText)) {
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