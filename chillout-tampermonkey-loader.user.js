// ==UserScript==
// @name         Chillout-Special Debug Loader
// @version      1.1
// @description  Debug version to troubleshoot user verification
// @author       zorlex25
// @match        *://www.leitstellenspiel.de/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
// @updateURL    https://raw.githubusercontent.com/zorlex25/LSS/main/chillout-debug-loader.user.js
// @downloadURL  https://raw.githubusercontent.com/zorlex25/LSS/main/chillout-debug-loader.user.js
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
    VERSION: "1.1",
    CACHE_DURATION: 10 * 60 * 1000, // 10 minutes
    TIMEOUT: 8000,
    DEBUG: true, // Enable debug mode
  }

  console.log("🔧 DEBUG MODE ENABLED - Detailed logging active")

  // 🔒 Basic security check
  if (window.location.hostname !== CONFIG.DOMAIN_CHECK) {
    console.error("❌ Domain check failed")
    return
  }

  // 📡 HTTP request function
  function fetchRemote(url) {
    return new Promise((resolve, reject) => {
      console.log("📡 Fetching:", url)
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        timeout: CONFIG.TIMEOUT,
        headers: {
          "Cache-Control": "no-cache",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        onload: (response) => {
          console.log("📡 Response status:", response.status)
          if (response.status === 200) {
            console.log("📡 Response received, length:", response.responseText.length)
            resolve(response.responseText)
          } else {
            reject(new Error(`HTTP ${response.status}: ${response.statusText}`))
          }
        },
        onerror: (error) => {
          console.error("📡 Network error:", error)
          reject(new Error("Network error: " + error))
        },
        ontimeout: () => {
          console.error("📡 Request timeout")
          reject(new Error("Request timeout"))
        },
      })
    })
  }

  // 👤 Get current user ID with detailed logging
  function getCurrentUserId() {
    console.log("👤 Attempting to get current user ID...")

    // Method 1: Profile link
    const profileLink = document.querySelector('a[href^="/profile/"]')
    if (profileLink) {
      console.log("👤 Found profile link:", profileLink.href)
      const match = profileLink.href.match(/\/profile\/(\d+)/)
      if (match) {
        const userId = Number.parseInt(match[1])
        console.log("👤 Extracted user ID from profile link:", userId)
        return userId
      }
    }

    // Method 2: User menu
    const userMenu = document.querySelector('#user_menu a[href^="/profile/"]')
    if (userMenu) {
      console.log("👤 Found user menu link:", userMenu.href)
      const match = userMenu.href.match(/\/profile\/(\d+)/)
      if (match) {
        const userId = Number.parseInt(match[1])
        console.log("👤 Extracted user ID from user menu:", userId)
        return userId
      }
    }

    // Method 3: Page source analysis
    const scripts = document.querySelectorAll("script")
    console.log("👤 Checking", scripts.length, "script tags for user_id...")
    for (const script of scripts) {
      if (script.textContent && script.textContent.includes("user_id")) {
        console.log("👤 Found script with user_id")
        const match = script.textContent.match(/user_id["\s]*[:=]["\s]*(\d+)/)
        if (match) {
          const userId = Number.parseInt(match[1])
          console.log("👤 Extracted user ID from script:", userId)
          return userId
        }
      }
    }

    console.error("👤 Could not find user ID using any method")
    return null
  }

  // 🔍 Verify user access with detailed debugging
  async function verifyUserAccess() {
    try {
      console.log("🔍 Starting user access verification...")

      const currentUserId = getCurrentUserId()
      if (!currentUserId) {
        console.error("🔍 No user ID found - cannot verify access")
        throw new Error("Could not determine user ID")
      }

      console.log("🔍 Current user ID:", currentUserId)
      console.log("🔍 Loading encrypted user list from GitHub...")

      // Load encrypted user list from GitHub
      const res = await fetchRemote(CONFIG.USER_LIST_URL)
      console.log("🔍 Raw response from GitHub:", res)

      const json = JSON.parse(res)
      console.log("🔍 Parsed JSON:", json)

      const encryptedText = json.encryptedUserIDs
      if (!encryptedText) {
        console.error("🔍 No encryptedUserIDs field found in JSON")
        throw new Error("Invalid user list format - missing encryptedUserIDs")
      }

      console.log("🔍 Encrypted text:", encryptedText)
      console.log("🔍 Encryption key:", CONFIG.ENCRYPTION_KEY)
      console.log("🔍 Attempting decryption...")

      // Decrypt using CryptoJS
      const bytes = CryptoJS.AES.decrypt(encryptedText, CONFIG.ENCRYPTION_KEY)
      console.log("🔍 Decryption bytes:", bytes)

      const decryptedStr = bytes.toString(CryptoJS.enc.Utf8)
      console.log("🔍 Decrypted string:", decryptedStr)

      if (!decryptedStr) {
        console.error("🔍 Decryption failed - empty result")
        throw new Error("Entschlüsselung fehlgeschlagen")
      }

      console.log("🔍 Parsing decrypted JSON...")
      const allowedUsers = JSON.parse(decryptedStr)
      console.log("🔍 Allowed users array:", allowedUsers)
      console.log("🔍 Allowed users type:", typeof allowedUsers)
      console.log("🔍 Is array:", Array.isArray(allowedUsers))

      if (!Array.isArray(allowedUsers)) {
        console.error("🔍 Decrypted data is not an array")
        throw new Error("Decrypted data is not a valid user array")
      }

      console.log("🔍 Checking if user", currentUserId, "is in allowed list:", allowedUsers)
      const isAllowed = allowedUsers.includes(currentUserId)
      console.log("🔍 Access check result:", isAllowed)

      if (!isAllowed) {
        console.error("❌ Access denied for user ID:", currentUserId)
        console.error("❌ User not found in allowed list:", allowedUsers)

        // Show detailed debug info in alert
        alert(`DEBUG INFO:
Current User ID: ${currentUserId}
Allowed Users: ${JSON.stringify(allowedUsers)}
User ID Type: ${typeof currentUserId}
Allowed Users Types: ${allowedUsers.map((id) => typeof id).join(", ")}`)

        return false
      }

      console.log("✅ Access granted for user ID:", currentUserId)
      return true
    } catch (error) {
      console.error("❌ User verification failed:", error)
      alert(`VERIFICATION ERROR: ${error.message}`)
      return false
    }
  }

  // 🎯 Main initialization
  async function initialize() {
    try {
      console.log("🚀 Chillout-Special Debug Loader v" + CONFIG.VERSION)

      // Check if we're on the right page
      const currentPath = window.location.pathname
      console.log("🚀 Current path:", currentPath)

      if (!(currentPath === "/" || currentPath === "/missions")) {
        console.log("ℹ️ Not on main page, skipping")
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

      console.log("🎉 Access granted - would load main script now")
      alert("✅ DEBUG: Access granted! Check console for details.")
    } catch (error) {
      console.error("❌ Loader initialization failed:", error)
      alert(`Loader Error: ${error.message}`)
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
