const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors'); // Import the cors module
const { log } = require('console');
require('dotenv').config();

const app = express();
const PORT = 4000;
app.use(cors());
app.use(cors({
    origin: '*' // Replace with your frontend URL
}));

const DATA_FILE_PATH = path.join(__dirname, 'winners.json');

app.get('/winners', async (req, res) => {
    try {
        // Check if the local JSON file exists
        if (fs.existsSync(DATA_FILE_PATH)) {
            console.log('Returning cached data...');
            const cachedData = JSON.parse(fs.readFileSync(DATA_FILE_PATH, 'utf8'));
            return res.json(cachedData);
        }

    } catch (error) {
        console.error('Error fetching winners data:', error);
        res.status(500).json({ error: 'Failed to fetch winners data' });
    }
});

async function updateWinners() {
    const token = process.env.GITHUB_TOKEN;
    const repoOwner = 'christsop';
    const repoName = 'antimonopoli-api';
    const workflowFileName = 'update-winners.yml'; 
    const branch = 'main'; 

    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflowFileName}/dispatches`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`, // Authenticate using the token
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ref: branch }), // Pass the branch name in the body
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                `Failed to trigger workflow: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
            );
        }

        console.log('Workflow triggered successfully!');
    } catch (error) {
        console.error('Error triggering workflow:', error.message);
    } finally {
        console.log('Request to trigger workflow completed.');
    }
}

app.get('/updateWinners', async (req, res) => {
    try {
        updateWinners();
    } catch (error) {
        console.error('Error triggering github action:', error);
        res.status(500).json({ error: 'Failed to trigger github action' });
    }
});

// app.get('/update-data', async (req, res) => {
//     try {
//         // Check if the local JSON file exists
//         updateDatabase();
//         console.log('runssss');
//         if (fs.existsSync(DATA_FILE_PATH)) {
//             console.log('Returning cached data...');
//             const cachedData = JSON.parse(fs.readFileSync(DATA_FILE_PATH, 'utf8'));
//             return res.json(cachedData);
//         }

//     } catch (error) {
//         console.error('Error fetching winners data:', error);
//         res.status(500).json({ error: 'Failed to fetch winners data' });
//     }
// });

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
