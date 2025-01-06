const express = require('express');
const axios = require('axios');
const moment = require('moment');
const path = require('path');

const app = express();
const port = 3000;

let crashFrequencyCache = null;
let lastCacheUpdate = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.locals.moment = moment;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getOnThisDayEvents(date) {
    const month = date.format('M');
    const day = date.format('D');
    
    try {
        const response = await axios.get(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`);
        return response.data.events;
    } catch (error) {
        console.error('Error fetching events:', error.message);
        return [];
    }
}

async function getAircraftCrashes(date) {
    const month = date.format('M');
    const day = date.format('D');
    
    try {
        const response = await axios.get(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`);
        const events = response.data.events;
        const crashEvents = events.filter(event => {
            const text = event.text.toLowerCase();
            // Include aircraft crashes but exclude space-related incidents
            return text.includes('crash') && 
                   (text.includes('aircraft') || text.includes('plane') || 
                    text.includes('flight') || text.includes('airline')) &&
                   !text.includes('space') && 
                   !text.includes('spacecraft') && 
                   !text.includes('shuttle') &&
                   !text.includes('rocket') &&
                   !text.includes('satellite');
        }).map(event => {
            // Extract death count from text using regex
            const text = event.text.toLowerCase();
            const deathMatch = text.match(/killing (\d+)|(\d+) people killed|(\d+) deaths|(\d+) died|(\d+) dead|(\d+) passengers? and crew|all (\d+) (people |passengers? )?aboard/);
            let deaths = 0;
            if (deathMatch) {
                // Find the first non-null capture group that contains a number
                deaths = parseInt(deathMatch.slice(1).find(match => match !== undefined)) || 0;
            }
            return { ...event, deaths };
        });
        return crashEvents;
    } catch (error) {
        console.error('Error fetching crash events:', error.message);
        return [];
    }
}

async function getAllCrashFrequencies() {
    if (crashFrequencyCache && lastCacheUpdate && (Date.now() - lastCacheUpdate < CACHE_DURATION)) {
        return crashFrequencyCache;
    }

    const frequencies = [];
    const startDate = moment().startOf('year');
    const endDate = moment().endOf('year');
    const currentDate = startDate.clone();

    while (currentDate.isSameOrBefore(endDate)) {
        try {
            const crashes = await getAircraftCrashes(currentDate.clone());
            frequencies.push({
                date: currentDate.format('YYYY-MM-DD'),
                month: currentDate.format('M'),
                day: currentDate.format('D'),
                crashes: crashes.length,
                deaths: crashes.reduce((sum, crash) => sum + crash.deaths, 0),
                details: crashes
            });
            
            await delay(100);
            
            currentDate.add(1, 'day');
        } catch (error) {
            console.error('Error fetching data for', currentDate.format('YYYY-MM-DD'), error);
            currentDate.add(1, 'day');
        }
    }

    crashFrequencyCache = frequencies;
    lastCacheUpdate = Date.now();
    return frequencies;
}

app.get('/api/events', async (req, res) => {
    const dateStr = req.query.date;
    let date;
    
    if (dateStr) {
        date = moment(dateStr, 'YYYY-MM-DD', true);
        if (!date.isValid()) {
            date = moment(); 
        }
    } else {
        date = moment();
    }
    
    const events = await getOnThisDayEvents(date);
    events.sort((a, b) => b.year - a.year);
    
    res.json({
        events,
        formattedDate: date.format('MMMM D')
    });
});

app.get('/api/crash-frequencies', async (req, res) => {
    const frequencies = await getAllCrashFrequencies();
    res.json(frequencies);
});

app.get('/', async (req, res) => {
    const frequencies = await getAllCrashFrequencies();
    
    const dateStr = req.query.date;
    let selectedDate;
    let selectedCrashes = [];
    
    if (dateStr) {
        selectedDate = moment(dateStr, 'YYYY-MM-DD', true);
        if (selectedDate.isValid()) {
            const dateData = frequencies.find(f => f.date === dateStr);
            if (dateData) {
                selectedCrashes = dateData.details;
            }
        }
    }
    
    res.render('index', {
        frequencies,
        crashes: selectedCrashes,
        currentDate: selectedDate ? selectedDate.format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        formattedDate: selectedDate ? selectedDate.format('MMMM D') : moment().format('MMMM D')
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
