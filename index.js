const axios = require('axios');
const moment = require('moment');

async function getOnThisDayEvents(date = moment()) {
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

function printEvents(events) {
    console.log(`\nOn This Day (${moment().format('MMMM D')}):`)
    console.log('----------------------------------------');
    
    events.sort((a, b) => b.year - a.year);
    
    events.forEach(event => {
        console.log(`\n${event.year}: ${event.text}`);
    });
}

async function main() {
    const events = await getOnThisDayEvents();
    printEvents(events);
}

main();
