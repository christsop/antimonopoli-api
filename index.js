const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors'); // Import the cors module

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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
