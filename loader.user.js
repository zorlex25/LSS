// ==UserScript==
// @name         Chillout-Special Minimal Loader
// @version      3.1
// @description  Minimal secure loader for Chillout-Special
// @author       zorlex25
// @match        *://www.leitstellenspiel.de/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @updateURL    https://raw.githubusercontent.com/zorlex25/LSS/main/loader.user.js
// @downloadURL  https://raw.githubusercontent.com/zorlex25/LSS/main/loader.user.js
// ==/UserScript==

;(async () => {
  // 🔐 Minimal Configuration
  const CONFIG = {
    MAIN_CODE_URL: "https://raw.githubusercontent.com/zorlex25/LSS/main/chillout.user.js",
    DOMAIN_CHECK: "www.leitstellenspiel.de",
    VERSION: "3.1",
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    TIMEOUT: 10000,
    DEBUG: false,
  }

  // 🔒 Basic domain check
  if (window.location.hostname !== CONFIG.DOMAIN_CHECK) {
    console.error("❌ Domain check failed")
    return
  }

  // 🛡️ Minimal anti-debugging (only if not debug mode)
  if (!CONFIG.DEBUG) {
    setInterval(() => {
      if (window.outerHeight - window.innerHeight > 200) {
        debugger
      }
    }, 3000)
  }

  // 📡 Simple fetch function
  function fetchCode(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        timeout: CONFIG.TIMEOUT,
        headers: {
          "Cache-Control": "no-cache",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        onload: (response) => {
          if (response.status === 200) {
            resolve(response.responseText)
          } else {
            reject(new Error(`HTTP ${response.status}: ${response.statusText}`))
          }
        },
        onerror: (error) => reject(new Error("Network error")),
        ontimeout: () => reject(new Error("Request timeout")),
      })
    })
  }

  // 💾 Simple cache system
  const Cache = {
    set: (key, data) => {
      const item = {
        data: data,
        timestamp: Date.now(),
        version: CONFIG.VERSION,
      }
      GM_setValue(`loader_${key}`, JSON.stringify(item))
    },

    get: (key) => {
      try {
        const cached = GM_getValue(`loader_${key}`, null)
        if (!cached) return null

        const item = JSON.parse(cached)

        // Check version and expiration
        if (item.version !== CONFIG.VERSION || Date.now() - item.timestamp > CONFIG.CACHE_DURATION) {
          GM_deleteValue(`loader_${key}`)
          return null
        }

        return item.data
      } catch {
        GM_deleteValue(`loader_${key}`)
        return null
      }
    },
  }

  // 📥 Load main code
  async function loadMainCode() {
    try {
      let mainCode = Cache.get("main_code")

      if (!mainCode) {
        console.log("🔄 Loading Chillout-Special from GitHub...")
        mainCode = await fetchCode(CONFIG.MAIN_CODE_URL)

        // Basic validation - check if it looks like a userscript
        if (!mainCode.includes("==UserScript==") && !mainCode.includes("function")) {
          throw new Error("Invalid code format received")
        }

        Cache.set("main_code", mainCode)
        console.log("✅ Code loaded and cached")
      } else {
        console.log("✅ Using cached code")
      }

      return mainCode
    } catch (error) {
      console.error("❌ Failed to load main code:", error)
      throw error
    }
  }

  // 🚀 Execute the main code with full environment
  function executeMainCode(code) {
    try {
      // Remove userscript headers if present (they're not needed for execution)
      const cleanCode = code.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\s*/, "")

      // Create execution function with all necessary globals
      const executor = new Function(
        "window",
        "document",
        "$",
        "jQuery",
        "GM_xmlhttpRequest",
        "GM_addStyle",
        "GM_setValue",
        "GM_getValue",
        "GM_deleteValue",
        "console",
        "alert",
        "setTimeout",
        "setInterval",
        "clearTimeout",
        "clearInterval",
        cleanCode,
      )

      // Execute with full environment
      executor(
        window,
        document,
        window.$ || window.jQuery,
        window.jQuery || window.$,
        GM_xmlhttpRequest,
        GM_addStyle,
        GM_setValue,
        GM_getValue,
        GM_deleteValue,
        console,
        alert,
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
      )

      console.log("✅ Chillout-Special executed successfully")
    } catch (error) {
      console.error("❌ Code execution failed:", error)
      throw error
    }
  }

  // 🎯 Main initialization
  async function initialize() {
    try {
      console.log("🚀 Chillout-Special Loader v" + CONFIG.VERSION)

      // Check if we're on the right page
      const currentPath = window.location.pathname
      if (
        !(
          currentPath === "/" ||
          currentPath === "/missions" ||
          currentPath.startsWith("/missions") ||
          currentPath === "/aaos" ||
          document.querySelector("#mission_list") ||
          document.querySelector(".mission_panel")
        )
      ) {
        console.log("ℹ️ Not on missions page, skipping")
        return
      }

      // Load and execute main code
      const mainCode = await loadMainCode()
      executeMainCode(mainCode)

      console.log("🎉 Chillout-Special loaded successfully!")

      // Optional success indicator (only in debug mode)
      if (CONFIG.DEBUG) {
        const indicator = document.createElement("div")
        indicator.style.cssText = `
          position: fixed; top: 10px; right: 10px; z-index: 99999;
          background: #4CAF50; color: white; padding: 8px 12px;
          border-radius: 4px; font-size: 12px; font-family: Arial;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        `
        indicator.textContent = "✅ Chillout loaded"
        document.body.appendChild(indicator)
        setTimeout(() => indicator.remove(), 3000)
      }
    } catch (error) {
      console.error("❌ Loader initialization failed:", error)

      // Clear cache on error
      Cache.get = () => null

      // Show error only in debug mode
      if (CONFIG.DEBUG) {
        alert(`Loader Error: ${error.message}`)
      }
    }
  }

  // 🔄 Wait for page readiness
  function startLoader() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initialize)
    } else {
      // Small delay to ensure page is fully loaded
      setTimeout(initialize, 1000)
    }
  }

  // 🧹 Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    // Clear any sensitive references
    CONFIG.MAIN_CODE_URL = null
  })

  // 🎬 Start the loader
  startLoader()
})()
