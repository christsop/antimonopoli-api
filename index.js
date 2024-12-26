const express = require('express');
const { JSDOM } = require('jsdom');

const app = express();
const PORT = 4000;



// Function to get the total number of pages in the winners section
async function getTotalPages() {
    const url = 'https://www.monopoli.gr/diagonismoi/winners/';
    const response = await fetch(url);
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const paginationLinks = document.querySelectorAll('.nav-links a.page-numbers');
    
    let maxPage = 1;
    paginationLinks.forEach(link => {
        const pageNum = parseInt(link.textContent);
        if (!isNaN(pageNum) && pageNum > maxPage) {
            maxPage = pageNum;
        }
    });

    return maxPage;
}

// Function to extract all event links from a page
async function extractEventLinks(pageNumber) {
    const url = `https://www.monopoli.gr/diagonismoi/winners/page/${pageNumber}/`;
    const response = await fetch(url);
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const eventLinks = Array.from(document.querySelectorAll('.winners_contest_box')).map(link => link.href);
    return eventLinks;
}

// Function to extract winners and event title from an event page
async function extractEventDetails(eventUrl) {
    const response = await fetch(eventUrl);
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract winners
    const winnersContainer = document.querySelector('.art_article_text.wrapptext p');
    const winnersText = winnersContainer ? winnersContainer.textContent : '';
    const winners = winnersText.split(/<br>|\n/).map(winner => winner.trim()).filter(winner => winner);

    // Extract event title and clean it up
    const titleElement = document.querySelector('.art_info_main_ti');
    let eventTitle = titleElement ? titleElement.textContent : '';
    eventTitle = eventTitle.replace('Νικητές Διαγωνισμού:', '').replace('Νικητες Διαγωνισμου:', '').trim();

    return {
        eventTitle,
        winners
    };
}

// Main function to process all pages and extract data
async function scrapeWinners() {
    // const totalPages = await getTotalPages();
    const totalPages = Math.min(await getTotalPages(), 2); // Only fetch 2 pages

    const allEventLinks = [];
    const allEventDetails = [];

    // Dynamically import `p-limit`
    const { default: pLimit } = await import('p-limit'); 
    const limit = pLimit(3); // Adjust concurrency level (5 concurrent tasks)

    console.log('Fetching all event links...');
    
    // Fetch all event links concurrently
    const pagePromises = Array.from({ length: totalPages }, (_, i) =>
        limit(() => extractEventLinks(i + 1))
    );
    const eventLinksPerPage = await Promise.all(pagePromises);
    eventLinksPerPage.forEach(links => allEventLinks.push(...links));

    console.log('Total event links fetched:', allEventLinks.length);

    // Fetch all event details concurrently
    const detailPromises = allEventLinks.map(eventUrl =>
        limit(() => extractEventDetails(eventUrl))
    );
    const eventDetails = await Promise.all(detailPromises);

    console.log('Total event details fetched:', eventDetails.length);


    // Combine event URLs with their respective details
    eventDetails.forEach((details, index) => {
        allEventDetails.push({
            eventUrl: allEventLinks[index],
            ...details
        });
    });

    return allEventDetails;
}


let cachedWinners = null;

app.get('/winners', async (req, res) => {
    try {
        // Serve cached data if available
        if (cachedWinners) {
            return res.json(cachedWinners);
        }

        const winnersData = await scrapeWinners();
        cachedWinners = winnersData; // Cache the data
        res.json(winnersData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch winners data' });
    }
});

app.get('/test-fetch', async (req, res) => {
    try {
        const response = await fetch('https://www.monopoli.gr/diagonismoi/winners/');
        const html = await response.text();
        res.send(html); // Verify if Vercel can fetch this page
    } catch (error) {
        res.status(500).json({ error: 'Fetch failed', details: error.message });
    }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = app;