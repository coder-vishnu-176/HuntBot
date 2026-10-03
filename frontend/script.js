// ========================================
// ELEMENTS
// ========================================

const software =
    document.getElementById("software")

const hardware =
    document.getElementById("hardware")

const hackathon =
    document.getElementById("hackathon")

const internship =
    document.getElementById("internship")

const button =
    document.getElementById("searchbtn")

const results =
    document.getElementById("results")

const savedBtn =
    document.getElementById("savedBtn")

const savedCount =
    document.getElementById("savedCount")

const themeToggle =
    document.getElementById("themeToggle")


// ========================================
// CURRENT SEARCH
// ========================================

let currentDomain = null

let currentType = null


// ========================================
// BOOKMARK STORAGE
// ========================================

let savedOpportunities =
    JSON.parse(
        localStorage.getItem("huntbotSaved")
    ) || []


// Show saved count when page loads
updateSavedCount()


// ========================================
// DOMAIN SELECTION
// ========================================

software.addEventListener("click", () => {

    software.classList.add("active")

    hardware.classList.remove("active")

})


hardware.addEventListener("click", () => {

    hardware.classList.add("active")

    software.classList.remove("active")

})


// ========================================
// OPPORTUNITY TYPE SELECTION
// ========================================

hackathon.addEventListener("click", () => {

    hackathon.classList.add("active")

    internship.classList.remove("active")

})


internship.addEventListener("click", () => {

    internship.classList.add("active")

    hackathon.classList.remove("active")

})


// ========================================
// SEARCH BUTTON
// ========================================

button.addEventListener("click", () => {

    searchOpportunities()

})


// ========================================
// SEARCH FUNCTION
// ========================================

async function searchOpportunities() {

    let domain

    let type


    // ------------------------------------
    // CHECK DOMAIN
    // ------------------------------------

    if (
        software.classList.contains("active")
    ) {

        domain = "software"

    }

    else if (
        hardware.classList.contains("active")
    ) {

        domain = "hardware"

    }

    else {

        showMessage(
            "Select a domain first",
            "Choose Software or Hardware before searching."
        )

        return

    }


    // ------------------------------------
    // CHECK OPPORTUNITY TYPE
    // ------------------------------------

    if (
        hackathon.classList.contains("active")
    ) {

        type = "hackathon"

    }

    else if (
        internship.classList.contains("active")
    ) {

        type = "internship"

    }

    else {

        showMessage(
            "Select an opportunity type",
            "Choose Hackathons or Internships before searching."
        )

        return

    }


    // Save current search

    currentDomain = domain

    currentType = type


    // ------------------------------------
    // LOADING
    // ------------------------------------

    setLoading(true)


    results.innerHTML = `

        <div class="message-card">

            <div class="scan-animation">

                <span class="scan-dot"></span>
                <span class="scan-dot"></span>
                <span class="scan-dot"></span>

            </div>

            <h2>
                Hunting opportunities...
            </h2>

            <p>
                Searching the web for relevant
                ${type}s in ${domain}.
            </p>

        </div>

    `


    try {

        const response = await fetch(
            `http://localhost:3000/api/search?domain=${domain}&type=${type}`
        )


        if (!response.ok) {

            throw new Error(
                "Server error"
            )

        }


        const data =
            await response.json()


        // ------------------------------------
        // REMOVE DUPLICATES
        // ------------------------------------

        const uniqueResults =
            removeDuplicates(data)


        // ------------------------------------
        // NO RESULTS
        // ------------------------------------

        if (
            uniqueResults.length === 0
        ) {

            showMessage(
                "No opportunities found",
                "HuntBot couldn't find matching opportunities right now."
            )

            return

        }


        // ------------------------------------
        // DISPLAY RESULTS
        // ------------------------------------

        displayResults(uniqueResults)

    }

    catch (error) {

        console.error(error)


        showMessage(
            "Something went wrong",
            "Make sure your HuntBot backend is running on port 3000."
        )

    }

    finally {

        setLoading(false)

    }

}


// ========================================
// REMOVE DUPLICATES
// ========================================

function removeDuplicates(data) {

    const seenLinks =
        new Set()

    const seenTitles =
        new Set()

    const unique = []


    data.forEach(item => {

        const link =
            (item.link || "")
                .trim()
                .toLowerCase()


        const title =
            (item.title || "")
                .trim()
                .toLowerCase()


        // Same link OR same title
        // means duplicate

        if (
            seenLinks.has(link) ||
            seenTitles.has(title)
        ) {

            return

        }


        seenLinks.add(link)

        seenTitles.add(title)

        unique.push(item)

    })


    return unique

}


// ========================================
// EXTRACT DEADLINE FROM SNIPPET
// ========================================
// Tries a few common phrasings people use
// to mention a deadline in a listing:
//   "Apply by Oct 15"
//   "deadline: 15th October"
//   "15 Oct 2026"
// Not every snippet mentions one, so we
// fall back to a clear message instead of
// leaving the card blank.

function extractDeadline(snippet) {

    const months =
        "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec"


    // "Apply by Oct 15" or "Apply by 15 Oct"

    const applyByMatch = snippet.match(
        new RegExp(
            `apply\\s+by\\s+(\\d{1,2}(st|nd|rd|th)?\\s)?(${months})[a-z]*(\\s\\d{1,2}(st|nd|rd|th)?)?(,?\\s\\d{4})?`,
            "i"
        )
    )

    if (applyByMatch) {
        return applyByMatch[0]
    }


    // "deadline: 15th October" or "deadline Oct 15, 2026"

    const deadlineMatch = snippet.match(
        new RegExp(
            `deadline[:\\s]+(\\d{1,2}(st|nd|rd|th)?\\s)?(${months})[a-z]*(\\s\\d{1,2}(st|nd|rd|th)?)?(,?\\s\\d{4})?`,
            "i"
        )
    )

    if (deadlineMatch) {
        return deadlineMatch[0]
    }


    // Plain date, e.g. "15 Oct 2026" or "Oct 15, 2026"

    const plainDateMatch = snippet.match(
        new RegExp(
            `\\b(\\d{1,2}\\s)?(${months})[a-z]*\\s?(\\d{1,2},?)?\\s\\d{4}\\b`,
            "i"
        )
    )

    if (plainDateMatch) {
        return plainDateMatch[0]
    }


    return "Check listing"

}


// ========================================
// EXTRACT SKILLS FROM SNIPPET
// ========================================
// Only meaningful for internships. Looks
// for a "skills:" or "requirements:" style
// phrase, and stops at the first sentence
// break or a hard length limit so it stays
// readable on the card.

function extractSkills(snippet) {

    const match = snippet.match(
        /(skills?|requirements?)[:\s]+([^.;]+)/i
    )

    if (!match) {
        return "Not specified"
    }

    let skillsText = match[2].trim()


    // Stop at a natural break word if present
    // (avoids grabbing unrelated trailing text)

    const stopWords = [
        " ability to",
        " must be",
        " should be",
        " candidates",
        " we are"
    ]

    for (const stopWord of stopWords) {

        const index =
            skillsText.toLowerCase().indexOf(stopWord)

        if (index !== -1) {

            skillsText =
                skillsText.slice(0, index).trim()

        }

    }


    // Hard cap length so long matches don't

    // break the card layout

    if (skillsText.length > 60) {

        skillsText =
            skillsText.slice(0, 60).trim() + "…"

    }


    return skillsText || "Not specified"

}


// ========================================
// CONVERT SCORE TO MATCH PERCENT
// ========================================
// filter.js scores results out of a max of
// 100 (30 + 30 + 20 + 20, minus penalties).
// Clamp to a sensible visible range so the
// badge never shows something odd like 0%
// or a negative number.

function matchPercent(score) {

    const safeScore =
        typeof score === "number"
            ? score
            : 0

    const clamped =
        Math.max(40, Math.min(100, safeScore))

    return clamped

}


// ========================================
// DISPLAY SEARCH RESULTS
// ========================================

function displayResults(data) {

    let html = ""


    // ------------------------------------
    // RESULTS HEADER
    // ------------------------------------

    html += `

        <div class="results-header">

            <div>

                <span class="results-label">
                    HUNT RESULTS
                </span>

                <h3>
                    ${data.length} opportunities found
                </h3>

            </div>

        </div>

    `


    // ------------------------------------
    // RESULT CARDS
    // ------------------------------------

    data.forEach((item, index) => {

        const saved =
            isSaved(item.link)


        const snippetText =
            item.snippet || ""


        const deadline =
            extractDeadline(snippetText)


        html += `

            <div
                class="opportunity-card"
                style="animation-delay: ${index * 0.06}s"
            >

                <div class="opportunity-top">

                    <div>

                        <span class="opportunity-type">
                            ${currentType}
                        </span>

                        <h2>
                            ${item.title}
                        </h2>

                    </div>


                    <div class="opportunity-top-actions">

                        <span class="match-badge">
                            ${matchPercent(item.score)}% match
                        </span>

                        <button
                            class="bookmark-btn ${saved ? "saved" : ""}"
                            data-link="${encodeURIComponent(item.link)}"
                            title="Save opportunity"
                        >
                            ${saved ? "★" : "☆"}
                        </button>

                    </div>

                </div>


                <p>
                    ${snippetText || "No description available."}
                </p>


                <div class="opportunity-info-row">

                    <span class="info-chip">
                        <strong>Deadline:</strong> ${deadline}
                    </span>

                    ${
                        currentType === "internship"
                            ? `<span class="info-chip"><strong>Skills:</strong> ${extractSkills(snippetText)}</span>`
                            : ""
                    }

                </div>


                <div class="opportunity-bottom">

                    <a
                        href="${item.link}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        View Opportunity →
                    </a>

                </div>

            </div>

        `

    })


    results.innerHTML = html


    // ------------------------------------
    // BOOKMARK BUTTONS
    // ------------------------------------

    const bookmarkButtons =
        document.querySelectorAll(
            ".bookmark-btn"
        )


    bookmarkButtons.forEach(btn => {

        btn.addEventListener(
            "click",
            () => {

                const link =
                    decodeURIComponent(
                        btn.dataset.link
                    )


                const opportunity =
                    data.find(item =>
                        item.link === link
                    )


                if (!opportunity) {

                    return

                }


                // Save / remove bookmark

                toggleBookmark(opportunity)


                // Check new bookmark state

                const nowSaved =
                    isSaved(
                        opportunity.link
                    )


                // Change star

                btn.classList.toggle(
                    "saved",
                    nowSaved
                )


                btn.textContent =
                    nowSaved
                        ? "★"
                        : "☆"


                // Restart animation

                btn.classList.remove(
                    "bookmark-pop"
                )


                void btn.offsetWidth


                btn.classList.add(
                    "bookmark-pop"
                )

            }
        )

    })

}


// ========================================
// TOGGLE BOOKMARK
// ========================================

function toggleBookmark(item) {

    const index =
        savedOpportunities.findIndex(
            saved =>
                saved.link === item.link
        )


    // ------------------------------------
    // REMOVE BOOKMARK
    // ------------------------------------

    if (index !== -1) {

        savedOpportunities.splice(
            index,
            1
        )

    }


    // ------------------------------------
    // ADD BOOKMARK
    // ------------------------------------

    else {

        savedOpportunities.push({

            title:
                item.title,

            link:
                item.link,

            snippet:
                item.snippet || "",

            type:
                currentType,

            savedAt:
                new Date().toISOString()

        })

    }


    saveBookmarks()

}


// ========================================
// SAVE BOOKMARKS TO LOCAL STORAGE
// ========================================

function saveBookmarks() {

    localStorage.setItem(
        "huntbotSaved",
        JSON.stringify(
            savedOpportunities
        )
    )


    updateSavedCount()

}


// ========================================
// CHECK IF OPPORTUNITY IS SAVED
// ========================================

function isSaved(link) {

    return savedOpportunities.some(
        item =>
            item.link === link
    )

}


// ========================================
// UPDATE SAVED COUNT
// ========================================

function updateSavedCount() {

    savedCount.textContent =
        savedOpportunities.length

}


// ========================================
// SAVED BUTTON
// ========================================

savedBtn.addEventListener(
    "click",
    () => {

        // --------------------------------
        // SAVED BUTTON ANIMATION
        // --------------------------------

        savedBtn.classList.remove(
            "saved-button-pop"
        )


        // Force browser to restart animation

        void savedBtn.offsetWidth


        savedBtn.classList.add(
            "saved-button-pop"
        )


        // --------------------------------
        // SHOW SAVED OPPORTUNITIES
        // --------------------------------

        showSavedOpportunities()


        // --------------------------------
        // SCROLL TO SAVED SECTION
        // --------------------------------

        setTimeout(() => {

            results.scrollIntoView({

                behavior: "smooth",

                block: "start"

            })

        }, 100)

    }
)


// ========================================
// SHOW SAVED OPPORTUNITIES
// ========================================

function showSavedOpportunities() {

    // ------------------------------------
    // NO SAVED ITEMS
    // ------------------------------------

    if (
        savedOpportunities.length === 0
    ) {

        showMessage(
            "No saved opportunities",
            "Bookmark an opportunity and it will appear here."
        )

        return

    }


    let cardsHTML = ""


    // ------------------------------------
    // CREATE SAVED CARDS
    // ------------------------------------

    savedOpportunities.forEach(
        (item, index) => {

            const snippetText =
                item.snippet || ""


            const deadline =
                extractDeadline(snippetText)


            cardsHTML += `

                <div
                    class="opportunity-card"
                    style="animation-delay: ${index * 0.08}s"
                >

                    <div class="opportunity-top">

                        <div>

                            <span class="opportunity-type">
                                ${item.type || "Opportunity"}
                            </span>

                            <h2>
                                ${item.title}
                            </h2>

                        </div>


                        <button
                            class="bookmark-btn saved"
                            data-saved-link="${encodeURIComponent(item.link)}"
                            title="Remove bookmark"
                        >
                            ★
                        </button>

                    </div>


                    <p>
                        ${snippetText || "No description available."}
                    </p>


                    <div class="opportunity-info-row">

                        <span class="info-chip">
                            <strong>Deadline:</strong> ${deadline}
                        </span>

                        ${
                            item.type === "internship"
                                ? `<span class="info-chip"><strong>Skills:</strong> ${extractSkills(snippetText)}</span>`
                                : ""
                        }

                    </div>


                    <div class="opportunity-bottom">

                        <a
                            href="${item.link}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View Opportunity →
                        </a>

                    </div>

                </div>

            `

        }
    )


    // ------------------------------------
    // INSERT SAVED PAGE
    // ------------------------------------

    results.innerHTML = `

        <div class="saved-page">

            <div class="results-header">

                <div>

                    <span class="results-label">
                        BOOKMARKS
                    </span>

                    <h3>
                        Your saved opportunities
                    </h3>

                </div>

            </div>


            ${cardsHTML}

        </div>

    `


    // ------------------------------------
    // REMOVE SAVED BOOKMARKS
    // ------------------------------------

    document
        .querySelectorAll(
            "[data-saved-link]"
        )
        .forEach(btn => {

            btn.addEventListener(
                "click",
                () => {

                    const link =
                        decodeURIComponent(
                            btn.dataset.savedLink
                        )


                    // Play bookmark animation

                    btn.classList.remove(
                        "bookmark-pop"
                    )


                    void btn.offsetWidth


                    btn.classList.add(
                        "bookmark-pop"
                    )


                    // Remove bookmark

                    savedOpportunities =
                        savedOpportunities.filter(
                            item =>
                                item.link !== link
                        )


                    saveBookmarks()


                    // Re-render after animation

                    setTimeout(
                        () => {

                            showSavedOpportunities()

                        },
                        250
                    )

                }
            )

        })

}


// ========================================
// MESSAGE
// ========================================

function showMessage(
    title,
    message
) {

    results.innerHTML = `

        <div class="message-card">

            <h2>
                ${title}
            </h2>

            <p>
                ${message}
            </p>

        </div>

    `

}


// ========================================
// SEARCH BUTTON LOADING
// ========================================

function setLoading(isLoading) {

    const text =
        button.querySelector(
            ".button-text"
        )

    const arrow =
        button.querySelector(
            ".button-arrow"
        )


    if (isLoading) {

        button.disabled = true

        text.textContent =
            "Hunting opportunities..."

        arrow.textContent =
            "↻"

    }

    else {

        button.disabled = false

        text.textContent =
            "Find Opportunities"

        arrow.textContent =
            "→"

    }

}


// ========================================
// THEME
// ========================================

const savedTheme =
    localStorage.getItem("theme")


if (
    savedTheme === "light"
) {

    document.body.classList.add(
        "light"
    )

}


themeToggle.addEventListener(
    "click",
    () => {

        document.body.classList.toggle(
            "light"
        )


        if (
            document.body.classList.contains(
                "light"
            )
        ) {

            localStorage.setItem(
                "theme",
                "light"
            )

        }

        else {

            localStorage.setItem(
                "theme",
                "dark"
            )

        }

    }
)