const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

require('dotenv').config();

const { OpenAI } = require('openai');
const mongoose = require('mongoose');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});


const Interaction = require('./models/Interaction'); // Import Interaction model

app.post('/chat', async (req, res) => {
    const {participantId, message, retrievalMethod} = req.body;
    if (!message) {
        return res.status(400).send('Message is required' );
    }

    try {
        const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: message }],
        max_tokens: 100,
        });

        const botResponse = response.choices[0].message.content.trim();

        // Log the interaction to MongoDB
        const interaction = new Interaction({
        participantId: participantId,
        userInput: message,
        botResponse: botResponse,
        });

        await interaction.save(); // Save the interaction to MongoDB

        res.json({ botResponse });

    } catch (error) {
        console.error('Error interacting with OpenAI API:', error.message);
        res.status(500).send('Internal Server Error');
    }

});

const EventLog = require('./models/EventLog'); // Import EventLog model

app.post('/log-event', async (req, res) => {
    const { participantId, eventType, elementName, timestamp } = req.body;

    try {
        // Log the event to MongoDB
        const event = new EventLog({ participantId, eventType, elementName, timestamp}); 
        await event.save();
        res.status(200).send('Event logged successfully');
        
    } catch (error) {
        console.error('Error logging event:', error.message);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/history', async (req, res) => {
    const { participantId } = req.body;
    
    try {
        const interactions = await Interaction.find({ participantId }).sort({ timestamp: 1 });
        res.json(interactions); // sends back array of { userInput, botResponse, timestamp }
    } catch (error) {
        console.error('Error fetching history:', error.message);
        res.status(500).send('Internal Server Error');
    }
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});






