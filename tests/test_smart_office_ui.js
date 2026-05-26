const assert = require("node:assert");
const fs = require("node:fs");
const vm = require("node:vm");

function makeRoot() {
  const handlers = {};
  const fields = { content: { value: "" } };
  const root = {
    _html: "",
    querySelector(selector) {
      if (selector === '[data-action="review"]') {
        return {
          disabled: false,
          innerHTML: "",
          textContent: "开始审查",
          addEventListener: function (event, handler) {
            if (event === "click") handlers.review = handler;
          }
        };
      }
      if (selector === '[data-field="content"]') {
        return fields.content;
      }
      if (selector === '[data-slot="result"]') {
        return {
          className: "",
          classList: { remove: function () {} },
          textContent: "",
          innerHTML: ""
        };
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-scenario]") {
        return ["expense", "resume", "tender", "contract"].map(function (key) {
          return {
            getAttribute: function (name) {
              return name === "data-scenario" ? key : null;
            },
            className: "",
            addEventListener: function () {}
          };
        });
      }
      return [];
    }
  };
  Object.defineProperty(root, "innerHTML", {
    get: function () {
      return root._html;
    },
    set: function (value) {
      root._html = value;
    }
  });
  return { root: root, handlers: handlers, fields: fields };
}

const source = fs.readFileSync("portal-demos.js", "utf8");
const mock = makeRoot();
const context = {
  window: {},
  console,
  localStorage: {
    getItem: function () {
      return "test-token";
    }
  },
  fetch: function () {
    return Promise.resolve({
      ok: true,
      json: function () {
        return Promise.resolve({
          success: true,
          data: {
            scenario: "expense",
            scenario_label: "报销单据",
            risk_level: "中",
            score: 68,
            summary: "存在费用超标与说明缺失风险。",
            findings: ["差旅餐费超过标准 12%"],
            suggestions: ["补充招待对象与事由说明"],
            next_step: "退回申请人补充材料后重新提交"
          }
        });
      }
    });
  }
};

vm.createContext(context);
vm.runInContext(source, context);

context.window.PortalDemos.mount(mock.root, {
  id: 15,
  name: "智能办公智能体",
  tech_stack: "NLP 与文档智能"
});

assert.match(mock.root.innerHTML, /开始审查/);
assert.match(mock.root.innerHTML, /报销单据/);
assert.match(mock.root.innerHTML, /data-field="content"/);
