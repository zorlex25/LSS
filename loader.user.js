// ==UserScript==
// @name         Chillout-Special Loader
// @version      1.0
// @description  Loader for Chillout-Special with encrypted user verification
// @author       zorlex25
// @match        *://www.leitstellenspiel.de/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
// @updateURL    https://raw.githubusercontent.com/zorlex25/LSS/main/chillout-tampermonkey-loader.user.js
// @downloadURL  https://raw.githubusercontent.com/zorlex25/LSS/main/chillout-tampermonkey-loader.user.js
// ==/UserScript==

;(async () => {
  // 🔐 Configuration
  const CONFIG = {
    // Your GitHub URLs
    MAIN_CODE_URL: "https://raw.githubusercontent.com/zorlex25/LSS/main/chillout-main-clean.user.js",
    USER_LIST_URL: "https://raw.githubusercontent.com/zorlex25/LSS/main/allowed_users.json",

    // Encryption settings
    ENCRYPTION_KEY: "FreiwilligeFeuerwehrLemgo",

    // Security settings
    DOMAIN_CHECK: "www.leitstellenspiel.de",
    VERSION: "1.0",
    CACHE_DURATION: 10 * 60 * 1000, // 10 minutes
    TIMEOUT: 8000,
    DEBUG: false,
  }

  // 🔒 Basic security check
  if (window.location.hostname !== CONFIG.DOMAIN_CHECK) {
    console.error("❌ Domain check failed")
    return
  }

  // 📡 HTTP request function
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
            reject(new Error(`HTTP ${response.status}: ${response.statusText}`))
          }
        },
        onerror: (error) => reject(new Error("Network error: " + error)),
        ontimeout: () => reject(new Error("Request timeout")),
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

  // 🔓 Decrypt user list
  function decryptUserList(encryptedData, key) {
    try {
      // Your encrypted data format: Base64 encoded
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key)
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8)

      if (!decryptedText) {
        throw new Error("Decryption failed - invalid key or data")
      }

      return JSON.parse(decryptedText)
    } catch (error) {
      console.error("❌ Decryption error:", error)
      throw new Error("Failed to decrypt user list")
    }
  }

  // 🔍 Verify user access
  async function verifyUserAccess() {
    try {
      const currentUserId = getCurrentUserId()
      if (!currentUserId) {
        throw new Error("Could not determine user ID")
      }

      console.log("🔄 Verifying access for user ID:", currentUserId)

      // Check cache first
      const cachedResult = Cache.get("user_check")
      if (cachedResult && cachedResult.userId === currentUserId) {
        return cachedResult.allowed
      }

      // Load encrypted user list from GitHub
      const userListResponse = await fetchRemote(CONFIG.USER_LIST_URL)
      const userListData = JSON.parse(userListResponse)

      if (!userListData.encryptedUserIDs) {
        throw new Error("Invalid user list format - missing encryptedUserIDs")
      }

      // Decrypt the user list
      const allowedUsers = decryptUserList(userListData.encryptedUserIDs, CONFIG.ENCRYPTION_KEY)

      if (!Array.isArray(allowedUsers)) {
        throw new Error("Decrypted data is not a valid user array")
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
      let mainCode = Cache.get("main_code")

      if (!mainCode) {
        console.log("🔄 Loading main code from GitHub...")
        mainCode = await fetchRemote(CONFIG.MAIN_CODE_URL)

        // Basic validation
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

  // 🚀 Execute the main code
  function executeMainCode(code) {
    try {
      // Remove userscript headers if present
      const cleanCode = code.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\s*/, "")

      // Create execution function with necessary globals
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

      // Verify user access with encrypted list
      const hasAccess = await verifyUserAccess()
      if (!hasAccess) {
        // Show access denied message
        alert(
          "❌ Zugriff verweigert!\n\nDu bist nicht berechtigt, dieses Script zu verwenden.\nKontaktiere den Administrator für weitere Informationen.",
        )
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

  // 🎬 Start the loader
  startLoader()
})()
