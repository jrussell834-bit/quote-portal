const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'quotes-data.json');

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { quotes: [] };
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { quotes: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function getQuotes() {
  return readData().quotes;
}

function saveQuotes(quotes) {
  writeData({ quotes });
}

module.exports = {
  getQuotes,
  saveQuotes
};

