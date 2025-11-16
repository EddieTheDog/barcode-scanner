const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// Google Sheets setup
const keys = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const auth = new google.auth.GoogleAuth({
  credentials: keys,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// WebSocket logic
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('scan', async (barcode) => {
    console.log('Scanned barcode:', barcode);

    // Fetch from Google Sheets
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:B'
    });

    const rows = res.data.values || [];
    const row = rows.find(r => r[0] === barcode);
    socket.emit('barcodeData', row || ['Not found']);
  });

  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
