const puppeteer = require('puppeteer');
const express = require('express');
const app = express();


app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <body>
      <script>
        var sseSource = new EventSource('/event-stream');
        sseSource.addEventListener('MyEvent', (e) => {
          console.log('[Page] Event Type:', e.type, '| Event Data:', e.data);
        });
      </script>
    </body>
    </html>
  `);
});

app.get('/event-stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('\n');
  const intervalId = setInterval(() => {
    res.write(`event: MyEvent\n`);
    res.write(`data: Test Message received at ${Date.now()}\n\n`);
  }, 1000);
  req.on('close', () => clearInterval(intervalId));
});

const server = app.listen(8080, async () => {
  const browser = await puppeteer.launch();

  const page = await browser.newPage();
  await page.setDefaultTimeout(0);

  const cdp = await page.target().createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Page.enable');
  cdp.on('Network.eventSourceMessageReceived', ({ eventName, data }) => console.log(`[Node] Event Type: ${eventName} | Event Data: ${data}\n`));
  page.on('console', (msg) => console.log(msg.text()));
  await page.goto('http://localhost:8080/');
  await page.waitFor(300000); // 5 minutes
  await page.close();
  await browser.close();
  server.close();
});