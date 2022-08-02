const express = require('express');
const app = express();
const client = require('prom-client');
const port = 4000;

// Create a Registry which registers the metrics
const register = new client.Registry()

// Create a custom histogram metric
const httpRequestTimer = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10] // 0.1 to 10 seconds
});

// Mock slow endpoint, waiting between 3 and 6 seconds to return a response
const createDelayHandler = async (req, res) => {
  if ((Math.floor(Math.random() * 100)) === 0) {
    throw new Error('Internal Error')
  }
  // Generate number between 3-6, then delay by a factor of 1000 (miliseconds)
  const delaySeconds = Math.floor(Math.random() * (6 - 3)) + 3
  await new Promise(res => setTimeout(res, delaySeconds * 1000))
};

// Register the histogram
register.registerMetric(httpRequestTimer);


// Add a default label which is added to all metrics
register.setDefaultLabels({
    app: 'simple-node-app'
})

// Enable the collection of default metrics
client.collectDefaultMetrics({ register })

app.get('/metrics', async function (req, res) {
    // Return all metrics the Prometheus exposition format
    res.set('Content-Type', register.contentType);
    let metrics = await register.metrics();
    res.send(metrics);
})

app.get('/', (req, res) => {
  // Start the HTTP request timer, saving a reference to the returned method
  const end = httpRequestTimer.startTimer();
  // Save reference to the path so we can record it when ending the timer
  const route = req.route.path;

  // End timer and add labels
  end({ route, code: res.statusCode, method: req.method });
  res.send('Super fast Hello World');
});

app.get('/variable', async (req, res) => {
  const end = httpRequestTimer.startTimer();
  const route = req.route.path;
  await createDelayHandler(req, res);
  end({ route, code: res.statusCode, method: req.method });
  res.end('Hello world but super delayed');
});

app.get('/random', (req, res) => {
  // Start the HTTP request timer, saving a reference to the returned method
  const end = httpRequestTimer.startTimer();
  // Save reference to the path so we can record it when ending the timer
  const route = req.route.path;

  if (Math.floor(Math.random() * (2) + 1) === 1) {
    res.status(400);
  }
  else {
    res.status(200);
  }
  // End timer and add labels
  end({ route, code: res.statusCode, method: req.method });

  res.send('Super unstable method');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
