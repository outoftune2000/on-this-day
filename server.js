const express = require('express');
const axios = require('axios');
const moment = require('moment');
const path = require('path');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));

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

app.get('/', async (req, res) => {
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
    
    res.render('index', {
        events,
        currentDate: date.format('YYYY-MM-DD'),
        formattedDate: date.format('MMMM D')
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
