// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Load Google Service Account JSON from file
const keysPath = path.join(__dirname, 'keys/service-account.json');
if (!fs.existsSync(keysPath)) {
  console.error('Service account JSON file not found:', keysPath);
  process.exit(1);
}

const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
const auth = new google.auth.GoogleAuth({
  credentials: keys,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

// Use environment variable for spreadsheet ID
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
if (!SPREADSHEET_ID) {
  console.error('Please set SPREADSHEET_ID environment variable');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // serve HTML/CSS/JS

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('barcode-scanned', async (barcode) => {
    console.log('Barcode scanned:', barcode);

    // Save barcode to Google Sheet
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A:A', // adjust sheet/range as needed
        valueInputOption: 'RAW',
        requestBody: {
          values: [[barcode]],
        },
      });
      console.log('Saved to Google Sheet');
    } catch (err) {
      console.error('Error saving to Google Sheet:', err);
    }

    // Broadcast to all connected clients
    io.emit('new-barcode', barcode);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
