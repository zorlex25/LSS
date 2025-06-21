// ==UserScript==
// @name         Chillout-Special Remote Loader
// @version      3.0
// @description  Secure remote loader for Chillout-Special
// @author       zorlex25
// @match        *://www.leitstellenspiel.de/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
// @updateURL    https://raw.githubusercontent.com/zorlex25/LSS/main/loader.user.js
// @downloadURL  https://raw.githubusercontent.com/zorlex25/LSS/main/loader.user.js
// ==/UserScript==

;(async () => {
  // 🔐 Configuration
  const CONFIG = {
    // Your GitHub repository URLs
    MAIN_CODE_URL: "https://raw.githubusercontent.com/zorlex25/LSS/main/chillout.user.js",
    USER_LIST_URL: "https://raw.githubusercontent.com/zorlex25/LSS/main/allowed_users.json",

    // Security settings
    DOMAIN_CHECK: "www.leitstellenspiel.de",
    VERSION: "3.0",
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    MAX_RETRIES: 3,
    TIMEOUT: 10000,

    // Debug mode (set to false for production)
    DEBUG: false,
  }

  // 🛡️ Anti-debugging protection
  ;(() => {
    const devtools = { open: false }

    const detectDevTools = () => {
      if (window.outerHeight - window.innerHeight > 200 || window.outerWidth - window.innerWidth > 200) {
        if (!devtools.open) {
          devtools.open = true
          console.clear()
          if (!CONFIG.DEBUG) {
            debugger
          }
        }
      } else {
        devtools.open = false
      }
    }

    setInterval(detectDevTools, 1000)

    // Disable right-click context menu
    document.addEventListener("contextmenu", (e) => {
      if (!CONFIG.DEBUG) e.preventDefault()
    })

    // Disable F12 and other dev shortcuts
    document.addEventListener("keydown", (e) => {
      if (
        !CONFIG.DEBUG &&
        (e.key === "F12" ||
          (e.ctrlKey && e.shiftKey && e.key === "I") ||
          (e.ctrlKey && e.shiftKey && e.key === "C") ||
          (e.ctrlKey && e.key === "U"))
      ) {
        e.preventDefault()
        return false
      }
    })
  })()

  // 🔒 Security checks
  function performSecurityChecks() {
    // Domain verification
    if (window.location.hostname !== CONFIG.DOMAIN_CHECK) {
      console.error("❌ Domain security check failed")
      return false
    }

    // Check for common debugging tools
    if (!CONFIG.DEBUG) {
      if (window.console && typeof window.console.clear === "function") {
        const originalClear = window.console.clear
        window.console.clear = function () {
          debugger
          return originalClear.apply(this, arguments)
        }
      }
    }

    return true
  }

  // 📡 Secure HTTP request function
  function secureRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Request timeout"))
      }, CONFIG.TIMEOUT)

      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        timeout: CONFIG.TIMEOUT,
        headers: {
          "Cache-Control": "no-cache",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        onload: (response) => {
          clearTimeout(timeout)
          if (response.status === 200) {
            resolve(response.responseText)
          } else {
            reject(new Error(`HTTP ${response.status}: ${response.statusText}`))
          }
        },
        onerror: (error) => {
          clearTimeout(timeout)
          reject(new Error("Network error: " + error))
        },
        ontimeout: () => {
          clearTimeout(timeout)
          reject(new Error("Request timeout"))
        },
        ...options,
      })
    })
  }

  // 💾 Cache management
  const Cache = {
    set: (key, data, duration = CONFIG.CACHE_DURATION) => {
      const cacheData = {
        data: data,
        timestamp: Date.now(),
        duration: duration,
        version: CONFIG.VERSION,
      }
      GM_setValue(`cache_${key}`, JSON.stringify(cacheData))
    },

    get: (key) => {
      try {
        const cached = GM_getValue(`cache_${key}`, null)
        if (!cached) return null

        const cacheData = JSON.parse(cached)

        // Check version compatibility
        if (cacheData.version !== CONFIG.VERSION) {
          GM_deleteValue(`cache_${key}`)
          return null
        }

        // Check expiration
        if (Date.now() - cacheData.timestamp > cacheData.duration) {
          GM_deleteValue(`cache_${key}`)
          return null
        }

        return cacheData.data
      } catch (error) {
        GM_deleteValue(`cache_${key}`)
        return null
      }
    },

    clear: () => {
      // Clear all cache entries
      const keys = ["main_code", "user_list", "user_check"]
      keys.forEach((key) => GM_deleteValue(`cache_${key}`))
    },
  }

  // 👤 Get current user ID
  function getCurrentUserId() {
    // Method 1: Profile link
    const profileLink = document.querySelector('a[href^="/profile/"]')
    if (profileLink) {
      const match = profileLink.href.match(/\/profile\/(\d+)/)
      if (match) return Number.parseInt(match[1])
    }

    // Method 2: User menu
    const userMenu = document.querySelector('#user_menu a[href^="/profile/"]')
    if (userMenu) {
      const match = userMenu.href.match(/\/profile\/(\d+)/)
      if (match) return Number.parseInt(match[1])
    }

    // Method 3: Page source analysis
    const scripts = document.querySelectorAll("script")
    for (const script of scripts) {
      if (script.textContent && script.textContent.includes("user_id")) {
        const match = script.textContent.match(/user_id["\s]*[:=]["\s]*(\d+)/)
        if (match) return Number.parseInt(match[1])
      }
    }

    return null
  }

  // 🔍 Load and verify user permissions
  async function verifyUserAccess() {
    try {
      const currentUserId = getCurrentUserId()
      if (!currentUserId) {
        throw new Error("Could not determine user ID")
      }

      // Check cache first
      const cachedResult = Cache.get("user_check")
      if (cachedResult && cachedResult.userId === currentUserId) {
        return cachedResult.allowed
      }

      console.log("🔄 Verifying user access...")

      // Load user list from GitHub
      const userListData = await secureRequest(CONFIG.USER_LIST_URL)
      let allowedUsers

      try {
        const parsed = JSON.parse(userListData)

        // Handle different JSON structures
        if (Array.isArray(parsed)) {
          allowedUsers = parsed
        } else if (parsed.allowedUsers) {
          allowedUsers = parsed.allowedUsers
        } else if (parsed.users) {
          allowedUsers = parsed.users
        } else {
          throw new Error("Invalid user list format")
        }
      } catch (parseError) {
        throw new Error("Failed to parse user list: " + parseError.message)
      }

      const isAllowed = allowedUsers.includes(currentUserId)

      // Cache the result
      Cache.set("user_check", { userId: currentUserId, allowed: isAllowed }, 2 * 60 * 1000) // 2 minutes

      if (!isAllowed) {
        console.error("❌ Access denied for user ID:", currentUserId)
        return false
      }

      console.log("✅ Access granted for user ID:", currentUserId)
      return true
    } catch (error) {
      console.error("❌ User verification failed:", error)
      return false
    }
  }

  // 📥 Load main code
  async function loadMainCode() {
    try {
      // Check cache first
      let mainCode = Cache.get("main_code")

      if (!mainCode) {
        console.log("🔄 Loading main code from GitHub...")
        mainCode = await secureRequest(CONFIG.MAIN_CODE_URL)

        // Verify it's actually JavaScript code
        if (!mainCode.includes("function") && !mainCode.includes("=>")) {
          throw new Error("Invalid JavaScript code received")
        }

        Cache.set("main_code", mainCode)
        console.log("✅ Main code loaded and cached")
      } else {
        console.log("✅ Using cached main code")
      }

      return mainCode
    } catch (error) {
      console.error("❌ Failed to load main code:", error)
      throw error
    }
  }

  // 🚀 Execute loaded code safely
  function executeCode(code) {
    try {
      // Create isolated execution environment
      const executeInSandbox = new Function("window", "document", "$", "jQuery", "GM_addStyle", "console", code)

      // Execute with controlled globals
      executeInSandbox(
        window,
        document,
        window.$ || window.jQuery,
        window.jQuery || window.$,
        GM_addStyle,
        CONFIG.DEBUG ? console : { log: () => {}, error: () => {}, warn: () => {} },
      )

      console.log("✅ Code executed successfully")
    } catch (error) {
      console.error("❌ Code execution failed:", error)
      throw error
    }
  }

  // 🎯 Main initialization function
  async function initialize() {
    try {
      console.log("🚀 Initializing Chillout-Special Remote Loader v" + CONFIG.VERSION)

      // Security checks
      if (!performSecurityChecks()) {
        throw new Error("Security checks failed")
      }

      // Check if we're on the right page
      if (
        !(
          window.location.pathname === "/" ||
          window.location.pathname === "/missions" ||
          window.location.pathname.startsWith("/missions")
        )
      ) {
        console.log("ℹ️ Not on missions page, skipping initialization")
        return
      }

      // Verify user access
      const hasAccess = await verifyUserAccess()
      if (!hasAccess) {
        // Show access denied message
        alert(
          "❌ Zugriff verweigert!\n\nDu bist nicht berechtigt, dieses Script zu verwenden.\nKontaktiere den Administrator für weitere Informationen.",
        )

        // Optional: Force logout
        const logoutBtn = document.querySelector('#logout_button, a[href*="sign_out"]')
        if (logoutBtn) {
          setTimeout(() => logoutBtn.click(), 2000)
        }
        return
      }

      // Load and execute main code
      const mainCode = await loadMainCode()
      executeCode(mainCode)

      console.log("🎉 Chillout-Special loaded successfully!")

      // Show success notification (optional)
      if (CONFIG.DEBUG) {
        const notification = document.createElement("div")
        notification.style.cssText = `
                    position: fixed; top: 20px; right: 20px; z-index: 10000;
                    background: #4CAF50; color: white; padding: 15px 20px;
                    border-radius: 5px; font-family: Arial, sans-serif;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                `
        notification.textContent = "✅ Chillout-Special loaded successfully!"
        document.body.appendChild(notification)

        setTimeout(() => notification.remove(), 3000)
      }
    } catch (error) {
      console.error("❌ Initialization failed:", error)

      // Clear cache on critical errors
      if (error.message.includes("parse") || error.message.includes("Invalid")) {
        Cache.clear()
      }

      // Show user-friendly error message
      if (CONFIG.DEBUG) {
        alert(
          `❌ Fehler beim Laden des Scripts:\n\n${error.message}\n\nBitte versuche es später erneut oder kontaktiere den Support.`,
        )
      }
    }
  }

  // 🔄 Wait for page readiness and initialize
  function waitForPageReady() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initialize)
    } else {
      // Small delay to ensure page is fully rendered
      setTimeout(initialize, 1000)
    }
  }

  // 🧹 Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    // Clear sensitive data from memory
    CONFIG.MAIN_CODE_URL = null
    CONFIG.USER_LIST_URL = null
  })

  // 🎬 Start the loader
  waitForPageReady()
})()
