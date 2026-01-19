const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store: sessionId -> state (1-5)
const studentStates = new Map();

// Calculate statistics
function getStats() {
    const states = Array.from(studentStates.values());
    const count = states.length;
    
    if (count === 0) {
        return {
            count: 0,
            mean: 0,
            histogram: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
    }
    
    const sum = states.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    
    const histogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    states.forEach(state => {
        histogram[state]++;
    });
    
    return { count, mean, histogram };
}

// API Routes
app.post('/api/state', (req, res) => {
    const { sessionId, state } = req.body;
    
    if (!sessionId || !state || state < 1 || state > 5) {
        return res.status(400).json({ error: 'Invalid session or state' });
    }
    
    studentStates.set(sessionId, state);
    
    // Broadcast updated stats to all connected clients
    io.emit('stats-update', getStats());
    
    res.json({ success: true });
});

app.get('/api/stats', (req, res) => {
    res.json(getStats());
});

// Reset endpoint for lecturer
app.post('/api/reset', (req, res) => {
    studentStates.clear();
    io.emit('stats-update', getStats());
    res.json({ success: true });
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('Client connected');
    
    // Send current stats on connection
    socket.emit('stats-update', getStats());
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`LectureLive server running on http://localhost:${PORT}`);
    console.log(`Student page: http://localhost:${PORT}/student.html`);
    console.log(`Lecturer dashboard: http://localhost:${PORT}/lecturer.html`);
});
