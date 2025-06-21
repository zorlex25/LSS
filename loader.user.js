// ==UserScript==
// @name         Chillout-Special Loader
// @version      3.0
// @description  Secure loader for Chillout-Special
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
  // 🔐 Configuration - Only URLs, no encryption logic
  const CONFIG = {
    MAIN_CODE_URL: "https://raw.githubusercontent.com/zorlex25/LSS/main/chillout.user.js",
    USER_LIST_URL: "https://raw.githubusercontent.com/zorlex25/LSS/main/allowed_users.json",

    // Security settings
    DOMAIN_CHECK: "www.leitstellenspiel.de",
    VERSION: "3.0",
    CACHE_DURATION: 10 * 60 * 1000, // 10 minutes
    TIMEOUT: 8000,
    DEBUG: false,
  }

  // 🛡️ Basic anti-debugging (lightweight)
  if (!CONFIG.DEBUG) {
    ;(() => {
      const detectDevTools = () => {
        if (window.outerHeight - window.innerHeight > 200 || window.outerWidth - window.innerWidth > 200) {
          console.clear()
          debugger
        }
      }
      setInterval(detectDevTools, 2000)

      // Disable common shortcuts
      document.addEventListener("keydown", (e) => {
        if (e.key === "F12" || (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "C"))) {
          e.preventDefault()
        }
      })
    })()
  }

  // 🔒 Simple security check
  if (window.location.hostname !== CONFIG.DOMAIN_CHECK) {
    console.error("❌ Domain check failed")
    return
  }

  // 📡 Simple HTTP request function
  function fetchRemote(url) {
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
            reject(new Error(`HTTP ${response.status}`))
          }
        },
        onerror: () => reject(new Error("Network error")),
        ontimeout: () => reject(new Error("Timeout")),
      })
    })
  }

  // 💾 Simple cache
  const Cache = {
    set: (key, data) => {
      const cacheData = {
        data: data,
        timestamp: Date.now(),
        version: CONFIG.VERSION,
      }
      GM_setValue(`cl_${key}`, JSON.stringify(cacheData))
    },

    get: (key) => {
      try {
        const cached = GM_getValue(`cl_${key}`, null)
        if (!cached) return null

        const cacheData = JSON.parse(cached)

        // Check version and expiration
        if (cacheData.version !== CONFIG.VERSION || Date.now() - cacheData.timestamp > CONFIG.CACHE_DURATION) {
          GM_deleteValue(`cl_${key}`)
          return null
        }

        return cacheData.data
      } catch {
        GM_deleteValue(`cl_${key}`)
        return null
      }
    },
  }

  // 📥 Load files from GitHub
  async function loadFile(url, cacheKey, description) {
    try {
      let data = Cache.get(cacheKey)

      if (!data) {
        console.log(`🔄 Loading ${description}...`)
        data = await fetchRemote(url)
        Cache.set(cacheKey, data)
        console.log(`✅ ${description} loaded`)
      }

      return data
    } catch (error) {
      console.error(`❌ Failed to load ${description}:`, error.message)
      throw error
    }
  }

  // 🚀 Execute the main code
  function executeMainCode(code) {
    try {
      // Create execution environment - your obfuscated code handles everything else
      const executor = new Function(
        "window",
        "document",
        "$",
        "jQuery",
        "GM_addStyle",
        "GM_xmlhttpRequest",
        "GM_setValue",
        "GM_getValue",
        code,
      )

      // Execute with required globals
      executor(
        window,
        document,
        window.$ || window.jQuery,
        window.jQuery || window.$,
        GM_addStyle,
        GM_xmlhttpRequest,
        GM_setValue,
        GM_getValue,
      )

      console.log("✅ Chillout-Special executed successfully")
    } catch (error) {
      console.error("❌ Execution failed:", error)
      throw error
    }
  }

  // 🎯 Main initialization
  async function initialize() {
    try {
      console.log("🚀 Starting Chillout-Special Loader v" + CONFIG.VERSION)

      // Check if on correct page
      if (
        !(
          window.location.pathname === "/" ||
          window.location.pathname === "/missions" ||
          window.location.pathname.startsWith("/missions")
        )
      ) {
        return
      }

      // Load both files (your main code will handle user verification)
      const [mainCode, userList] = await Promise.all([
        loadFile(CONFIG.MAIN_CODE_URL, "main", "main code"),
        loadFile(CONFIG.USER_LIST_URL, "users", "user list"),
      ])

      // Make user list available globally for your main script
      window.chilloutUserList = userList

      // Execute your obfuscated main code
      executeMainCode(mainCode)

      console.log("🎉 Chillout-Special loaded!")
    } catch (error) {
      console.error("❌ Loader failed:", error)

      if (CONFIG.DEBUG) {
        alert(`Fehler beim Laden: ${error.message}`)
      }
    }
  }

  // 🔄 Wait for page and start
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize)
  } else {
    setTimeout(initialize, 500)
  }

  // 🧹 Cleanup
  window.addEventListener("beforeunload", () => {
    window.chilloutUserList = null
  })
})()
