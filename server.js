// server/server.js

const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

// Load environment variables from .env file
dotenv.config();

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.error("MongoDB connection error:", err));

// Document Schema and Model
const Document = mongoose.model('Document', new mongoose.Schema({
    content: {
        type: String,
        required: true
    }
}));

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Real-time collaboration logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('get-document', async (documentId) => {
        let document = await Document.findById(documentId);
        if (!document) {
            document = await Document.create({ _id: documentId, content: '' });
        }
        socket.join(documentId);
        socket.emit('load-document', document.content);

        socket.on('send-changes', (delta) => {
            socket.broadcast.to(documentId).emit('receive-changes', delta);
        });

        socket.on('save-document', async (data) => {
            await Document.findByIdAndUpdate(documentId, { content: data });
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
