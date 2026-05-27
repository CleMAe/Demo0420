const assert = require("node:assert");
const fs = require("node:fs");

const html = fs.readFileSync("smart-office.html", "utf8");
const js = fs.readFileSync("smart-office.js", "utf8");

assert.match(html, /smart-office\.js/);
assert.match(html, /DEEPSEEK_API_KEY/);
assert.match(js, /\/api\/smart-office\/review/);
assert.match(js, /\/api\/smart-office\/config/);
assert.match(js, /开始审查（DeepSeek）/);
