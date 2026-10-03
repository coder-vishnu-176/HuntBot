import "dotenv/config"
import express from "express"
import cors from "cors"
import axios from "axios"

import { filterExpired } from "./utils/filter.js"

const app = express()

app.use(cors())


// HOME
app.get("/", (req, res) => {

    res.send("HuntBot is running")

})


// SEARCH
app.get("/api/search", async (req, res) => {

    try {

        const domain = req.query.domain
        const type = req.query.type


        // --------------------------------
        // SELECT SOURCES
        // --------------------------------

        let sources = []


        if (type === "hackathon") {

            sources = [
                "unstop.com",
                "devfolio.co",
                "devpost.com",
                "mlh.io"
            ]

        }


        else if (type === "internship") {

            sources = [
                "unstop.com",
                "internshala.com",
                "linkedin.com",
                "wellfound.com"
            ]

        }


        // --------------------------------
        // SEARCH EACH SOURCE
        // --------------------------------

        let allResults = []


        for (const source of sources) {

            const query =
                `site:${source} ${domain} ${type} India 2026`


            console.log(
                `Searching: ${query}`
            )


            const response =
                await axios.get(
                    "https://serpapi.com/search",
                    {
                        params: {

                            engine: "google",

                            q: query,

                            // Bias results toward India,
                            // in case Google broadens
                            // the search beyond site:

                            gl: "in",

                            hl: "en",

                            api_key:
                                process.env.SERPAPI_KEY

                        }
                    }
                )


            const results =
                response.data.organic_results || []


            // --------------------------------
            // VERIFY RESULTS ACTUALLY MATCH
            // THE REQUESTED SOURCE
            // --------------------------------
            // Google sometimes ignores "site:"
            // when too few matches are found,
            // and returns unrelated pages instead.
            // We check the link ourselves so a
            // stray result never slips through.

            const verifiedResults =
                results.filter((item) => {

                    const link =
                        (item.link || "").toLowerCase()

                    return link.includes(source)

                })


            console.log(
                `  -> ${results.length} raw, ${verifiedResults.length} verified from ${source}`
            )


            allResults.push(
                ...verifiedResults
            )

        }


        console.log(
            `Total verified results from sources: ${allResults.length}`
        )


        // --------------------------------
        // FILTER + SCORE + SORT
        // --------------------------------
        // Filter first, BEFORE deciding
        // whether a fallback is needed - a
        // source can return results that all
        // get filtered out (wrong type, spam,
        // expired), so checking the raw count
        // alone is not enough.

        let filteredResults =
            filterExpired(
                allResults,
                type,
                domain
            )


        console.log(
            `Results after filtering (before fallback check): ${filteredResults.length}`
        )


        // --------------------------------
        // FALLBACK IF TOO FEW USABLE RESULTS
        // --------------------------------
        // Run one broader search (no site:
        // restriction) when the FILTERED
        // result count is thin, so the user
        // still gets something useful.

        if (filteredResults.length < 3) {

            const fallbackQuery =
                `${domain} ${type} India 2026`


            console.log(
                `Fallback searching: ${fallbackQuery}`
            )


            const fallbackResponse =
                await axios.get(
                    "https://serpapi.com/search",
                    {
                        params: {

                            engine: "google",

                            q: fallbackQuery,

                            gl: "in",

                            hl: "en",

                            api_key:
                                process.env.SERPAPI_KEY

                        }
                    }
                )


            const fallbackResults =
                fallbackResponse.data.organic_results || []


            allResults.push(
                ...fallbackResults
            )


            filteredResults =
                filterExpired(
                    allResults,
                    type,
                    domain
                )

        }


        console.log(
            `Final results sent to frontend: ${filteredResults.length}`
        )


        // --------------------------------
        // SEND RESULTS TO FRONTEND
        // --------------------------------

        res.json(
            filteredResults
        )

    }


    catch (error) {

        console.error(error)

        res.status(500).json({

            error:
                "Failed to search opportunities"

        })

    }

})


app.listen(3000, () => {

    console.log(
        "Server is running on port 3000"
    )

})