(function () {
  window.PORTAL_DEFAULT_BRAND = "智能体Demo平台";
  window.PORTAL_CONFIG = { brandName: window.PORTAL_DEFAULT_BRAND };

  function apiBase() {
    if (!window.location.host) {
      return "http://127.0.0.1";
    }
    return "";
  }

  function applyBrand() {
    var n =
      (window.PORTAL_CONFIG && window.PORTAL_CONFIG.brandName) ||
      window.PORTAL_DEFAULT_BRAND;
    var el = document.getElementById("portal-brand-name");
    if (el) {
      el.textContent = n;
    }
    var page = document.documentElement.getAttribute("data-portal-page");
    if (page === "login") {
      document.title = "登录 · " + n;
    } else if (page === "workbench") {
      document.title = "工作台 · " + n;
    } else if (page === "detail") {
      document.title = "产品详情 · " + n;
    }
  }

  function loadConfig() {
    var s = document.createElement("script");
    s.src = apiBase() + "/config.js";
    s.onload = applyBrand;
    s.onerror = applyBrand;
    document.head.appendChild(s);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadConfig);
  } else {
    loadConfig();
  }
})();
