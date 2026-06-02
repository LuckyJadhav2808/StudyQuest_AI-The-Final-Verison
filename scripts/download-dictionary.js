const fs = require('fs');
const path = require('path');
const https = require('https');

const URL = 'https://raw.githubusercontent.com/david47k/top-english-wordlists/master/top_english_words_lower_100000.txt';
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'dictionary.json');

console.log('Downloading word list from GitHub...');

https.get(URL, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Failed to download: Status Code ${res.statusCode}`);
    return;
  }

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Finished download. Processing words...');
    const lines = data.split('\n');
    const wordSet = new Set();

    for (let line of lines) {
      const word = line.trim().toLowerCase();
      // Keep only alphabetical words
      // Allow single letter 'i' and 'a'
      if (/^[a-z]+$/.test(word)) {
        if (word.length >= 2 || word === 'i' || word === 'a') {
          wordSet.add(word);
        }
      }
    }

    const sortedWords = Array.from(wordSet).sort();
    console.log(`Cleaned word count: ${sortedWords.length}`);

    // Ensure directory exists
    const dir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sortedWords));
    console.log(`Successfully saved dictionary to ${OUTPUT_PATH}`);
  });
}).on('error', (err) => {
  console.error('Error downloading:', err.message);
});
