const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('app.js', 'utf8');

const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost/" });
const window = dom.window;

// Setup mock localStorage
window.localStorage = {
  getItem: function (key) {
    return this[key];
  },
  setItem: function (key, value) {
    this[key] = value;
  }
};

window.console.error = function(msg) {
  console.log("ERROR:", msg);
};
window.console.log = function(msg) {
  console.log("LOG:", msg);
};
window.alert = function() {};

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
  if (reason && reason.stack) console.log(reason.stack);
});
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception:', err);
  if (err && err.stack) console.log(err.stack);
});

try {
  window.eval(script);
} catch (e) {
  console.log("EXECUTION ERROR:", e.message);
  console.log(e.stack);
}
