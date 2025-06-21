// ==UserScript==
// @name         Chillout-Special CSRF Fixed Loader
// @version      1.6
// @description  Fixed loader with CSRF token handling for POST requests
// @author       zorlex25
// @match        *://www.leitstellenspiel.de/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @updateURL    https://raw.githubusercontent.com/zorlex25/LSS/main/chillout-csrf-fixed-loader.user.js
// @downloadURL  https://raw.githubusercontent.com/zorlex25/LSS/main/chillout-csrf-fixed-loader.user.js
// ==/UserScript==

;(async () => {
  // 🔐 Configuration
  const CONFIG = {
    MAIN_CODE_URL: "https://raw.githubusercontent.com/zorlex25/LSS/main/chillout-main-clean.user.js",
    USER_LIST_URL: "https://raw.githubusercontent.com/zorlex25/LSS/main/allowed_users.json",

    // Encryption settings
    ENCRYPTION_KEY: "FreiwilligeFeuerwehrLemgo",

    // Security settings
    DOMAIN_CHECK: "www.leitstellenspiel.de",
    VERSION: "1.6",
    CACHE_DURATION: 10 * 60 * 1000, // 10 minutes
    TIMEOUT: 8000,
    DEBUG: true, // Enable debug mode
  }

  // 🔒 Basic security check
  if (window.location.hostname !== CONFIG.DOMAIN_CHECK) {
    console.error("❌ Domain check failed")
    return
  }

  // 🛡️ CSRF Token Management
  function getCSRFToken() {
    // Method 1: Check meta tag
    const metaToken = document.querySelector('meta[name="csrf-token"]')
    if (metaToken) {
      console.log("🛡️ Found CSRF token in meta tag:", metaToken.getAttribute("content"))
      return metaToken.getAttribute("content")
    }

    // Method 2: Check Rails CSRF token
    const railsToken = document.querySelector('meta[name="authenticity_token"]')
    if (railsToken) {
      console.log("🛡️ Found Rails CSRF token:", railsToken.getAttribute("content"))
      return railsToken.getAttribute("content")
    }

    // Method 3: Check form inputs
    const formToken = document.querySelector('input[name="authenticity_token"]')
    if (formToken) {
      console.log("🛡️ Found CSRF token in form:", formToken.value)
      return formToken.value
    }

    // Method 4: Check for _token input (Laravel style)
    const laravelToken = document.querySelector('input[name="_token"]')
    if (laravelToken) {
      console.log("🛡️ Found Laravel token:", laravelToken.value)
      return laravelToken.value
    }

    // Method 5: Check window object
    if (window.csrfToken) {
      console.log("🛡️ Found CSRF token in window:", window.csrfToken)
      return window.csrfToken
    }

    // Method 6: Check for common CSRF token patterns in scripts
    const scripts = document.querySelectorAll("script")
    for (const script of scripts) {
      if (script.textContent) {
        const tokenMatch = script.textContent.match(/csrf[_-]?token["']?\s*[:=]\s*["']([^"']+)["']/i)
        if (tokenMatch) {
          console.log("🛡️ Found CSRF token in script:", tokenMatch[1])
          return tokenMatch[1]
        }

        const authMatch = script.textContent.match(/authenticity[_-]?token["']?\s*[:=]\s*["']([^"']+)["']/i)
        if (authMatch) {
          console.log("🛡️ Found authenticity token in script:", authMatch[1])
          return authMatch[1]
        }
      }
    }

    console.warn("⚠️ No CSRF token found")
    return null
  }

  // 📡 HTTP request function
  function fetchRemote(url) {
    return new Promise((resolve, reject) => {
      if (CONFIG.DEBUG) console.log("📡 Fetching:", url)
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        timeout: CONFIG.TIMEOUT,
        headers: {
          "Cache-Control": "no-cache",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        onload: (response) => {
          if (CONFIG.DEBUG) console.log("📡 Response status:", response.status)
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

  // 🔧 Enhanced jQuery with CSRF token support
  function setupEnhancedJQuery() {
    if (typeof $ === "undefined" || typeof jQuery === "undefined") {
      console.error("❌ jQuery not available")
      return
    }

    console.log("🔧 Setting up enhanced jQuery with CSRF support")

    // Get CSRF token
    const csrfToken = getCSRFToken()

    // Store original jQuery methods
    const originalAjax = $.ajax
    const originalPost = $.post

    // Enhanced $.ajax with CSRF token and proper headers
    $.ajax = function (options) {
      console.log("🔧 jQuery.ajax called:", options)

      // Add CSRF token and required headers for POST requests
      if (options.type === "POST" || options.method === "POST") {
        console.log("🔧 Adding CSRF token and headers to POST request")

        // Ensure headers object exists
        options.headers = options.headers || {}

        // Add CSRF token
        if (csrfToken) {
          options.headers["X-CSRF-Token"] = csrfToken
          options.headers["authenticity_token"] = csrfToken

          // Also add to data if it's form data
          if (options.data && typeof options.data === "object") {
            options.data.authenticity_token = csrfToken
            options.data._token = csrfToken
          }
        }

        // Add required headers
        options.headers["X-Requested-With"] = "XMLHttpRequest"
        options.headers["Accept"] = "application/json, text/javascript, */*; q=0.01"
        options.headers["Content-Type"] =
          options.headers["Content-Type"] || "application/x-www-form-urlencoded; charset=UTF-8"

        // Add referer
        options.headers["Referer"] = window.location.href

        console.log("🔧 Enhanced POST request headers:", options.headers)
      }

      const jqXHR = originalAjax.call(this, options)

      // Enhanced error handling
      jqXHR.fail((xhr, status, error) => {
        console.error("❌ jQuery.ajax failed:", {
          url: options.url,
          method: options.type || options.method,
          status: xhr.status,
          statusText: xhr.statusText,
          error: error,
          responseText: xhr.responseText,
          headers: options.headers,
        })

        // If it's a 401/403 error, try to refresh CSRF token
        if (xhr.status === 401 || xhr.status === 403) {
          console.log("🔄 Got 401/403, attempting to refresh CSRF token...")
          const newToken = getCSRFToken()
          if (newToken && newToken !== csrfToken) {
            console.log("🔄 Found new CSRF token, retrying request...")
            // Update options with new token
            if (options.headers) {
              options.headers["X-CSRF-Token"] = newToken
              options.headers["authenticity_token"] = newToken
            }
            // Retry the request
            setTimeout(() => {
              $.ajax(options)
            }, 1000)
          }
        }
      })

      return jqXHR
    }

    // Enhanced $.post with CSRF token
    $.post = (url, data, success, dataType) => {
      console.log("🔧 jQuery.post called:", url)

      // Convert to $.ajax call with proper CSRF handling
      const options = {
        type: "POST",
        url: url,
        data: data,
        success: success,
        dataType: dataType,
      }

      return $.ajax(options)
    }

    console.log("✅ Enhanced jQuery with CSRF support setup complete")
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

  // 🔍 Verify user access and return allowed users list
  async function verifyUserAccess() {
    try {
      const currentUserId = getCurrentUserId()
      if (!currentUserId) {
        throw new Error("Could not determine user ID")
      }

      if (CONFIG.DEBUG) console.log("🔍 Current user ID:", currentUserId)

      // Check cache first
      const cachedResult = Cache.get("user_check")
      if (cachedResult && cachedResult.userId === currentUserId) {
        return {
          allowed: cachedResult.allowed,
          allowedUsers: cachedResult.allowedUsers,
        }
      }

      // Load encrypted user list from GitHub
      const res = await fetchRemote(CONFIG.USER_LIST_URL)
      const json = JSON.parse(res)
      const encryptedText = json.encryptedUserIDs

      if (!encryptedText) {
        throw new Error("Invalid user list format - missing encryptedUserIDs")
      }

      // Decrypt using CryptoJS
      const bytes = CryptoJS.AES.decrypt(encryptedText, CONFIG.ENCRYPTION_KEY)
      const decryptedStr = bytes.toString(CryptoJS.enc.Utf8)

      if (!decryptedStr) throw new Error("Entschlüsselung fehlgeschlagen")

      const allowedUsers = JSON.parse(decryptedStr)

      if (!Array.isArray(allowedUsers)) {
        throw new Error("Decrypted data is not a valid user array")
      }

      const isAllowed = allowedUsers.includes(currentUserId)

      // Cache the result
      Cache.set(
        "user_check",
        {
          userId: currentUserId,
          allowed: isAllowed,
          allowedUsers: allowedUsers,
        },
        2 * 60 * 1000,
      ) // 2 minutes

      if (!isAllowed) {
        console.error("❌ Access denied for user ID:", currentUserId)
        return { allowed: false, allowedUsers: null }
      }

      if (CONFIG.DEBUG) console.log("✅ Access granted for user ID:", currentUserId)
      return { allowed: true, allowedUsers: allowedUsers }
    } catch (error) {
      console.error("❌ User verification failed:", error)
      return { allowed: false, allowedUsers: null }
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
  function executeMainCode(code, allowedUsers) {
    try {
      // IMPORTANT: Set the global variable that your main script expects
      window.chilloutAllowedUsers = allowedUsers

      // Setup enhanced jQuery with CSRF support before executing main code
      setupEnhancedJQuery()

      if (CONFIG.DEBUG) {
        console.log("🔧 Set window.chilloutAllowedUsers:", allowedUsers)
        console.log("🔧 jQuery available:", typeof $, typeof jQuery)
        console.log("🔧 CSRF token available:", getCSRFToken() ? "Yes" : "No")
      }

      // Remove userscript headers if present
      const cleanCode = code.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\s*/, "")

      // Add global error handler for unhandled promise rejections
      window.addEventListener("unhandledrejection", (event) => {
        console.error("🚨 Unhandled promise rejection in main script:", event.reason)
        console.error("🚨 Promise:", event.promise)
      })

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
        $,
        jQuery,
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
      console.log("🚀 Chillout-Special CSRF Fixed Loader v" + CONFIG.VERSION)

      // Check if we're on the right page
      const currentPath = window.location.pathname
      if (CONFIG.DEBUG) console.log("🚀 Current path:", currentPath)

      // Allow script to run on main pages and mission-related pages
      const allowedPaths = ["/", "/missions", "/aaos", "/daily_bonuses"]

      const isAllowedPage = allowedPaths.some((path) => currentPath === path || currentPath.startsWith(path))

      if (!isAllowedPage) {
        if (CONFIG.DEBUG) console.log("ℹ️ Not on allowed page, skipping")
        return
      }

      // Verify user access with encrypted list
      const accessResult = await verifyUserAccess()
      if (!accessResult.allowed) {
        // Show access denied message
        alert(
          "❌ Zugriff verweigert!\n\nDu bist nicht berechtigt, dieses Script zu verwenden.\nKontaktiere den Administrator für weitere Informationen.",
        )
        return
      }

      // Load and execute main code with allowed users list
      const mainCode = await loadMainCode()
      executeMainCode(mainCode, accessResult.allowedUsers)

      console.log("🎉 Chillout-Special loaded successfully!")

      // Success indicator
      const indicator = document.createElement("div")
      indicator.style.cssText = `
        position: fixed; top: 10px; right: 10px; z-index: 99999;
        background: #4CAF50; color: white; padding: 8px 12px;
        border-radius: 4px; font-size: 12px; font-family: Arial;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      `
      indicator.textContent = "✅ Chillout loaded (CSRF Fixed)"
      document.body.appendChild(indicator)
      setTimeout(() => indicator.remove(), 5000)
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
