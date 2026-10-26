// scripts/indexnow.mjs
const KEY = '826f91132875a9c1547b5971fa84f5cf';
const HOST = 'focalyst.online';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const URLS = [
  `https://${HOST}`,
  `https://${HOST}/app`,
  `https://${HOST}/pricing`,
  `https://${HOST}/blog`,
  `https://${HOST}/about`,
  `https://${HOST}/contact`,
  `https://${HOST}/help`,
  `https://${HOST}/mcp-preview`,
  `https://${HOST}/privacy`,
  `https://${HOST}/terms`,
];

async function submitIndexNow() {
  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: URLS,
  };

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    console.log(`IndexNow submission response status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    if (text) {
      console.log(`Response body: ${text}`);
    }
  } catch (err) {
    console.error('Error submitting to IndexNow:', err);
    process.exit(1);
  }
}

submitIndexNow();
