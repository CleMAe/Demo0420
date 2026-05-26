const assert = require("node:assert");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("portal-demos.js", "utf8");
const context = {
  window: {},
  console,
};

vm.createContext(context);
vm.runInContext(source, context);

assert.equal(typeof context.window.PortalDemos.sentimentMeta, "function");

assert.deepEqual(context.window.PortalDemos.sentimentMeta({ sentiment_label: "中性", sentiment_score: 45 }), {
  label: "中性",
  score: 45,
  hint: "模型判断为中性，保持解释清晰",
  barClass: "h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500",
});

assert.deepEqual(context.window.PortalDemos.sentimentMeta({ sentiment: "高风险负面" }), {
  label: "高风险负面",
  score: 88,
  hint: "高风险负面，建议安抚并升级",
  barClass: "h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500",
});
