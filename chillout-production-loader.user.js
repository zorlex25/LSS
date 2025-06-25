// ==UserScript==
// @name         Chillout-Special Production Loader
// @version      2.0
// @description  Production loader with CSRF support and automatic logout for unauthorized users
// @author       zorlex25
// @match        *://www.leitstellenspiel.de/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @updateURL    https://raw.githubusercontent.com/zorlex25/LSS/main/chillout-production-loader.user.js
// @downloadURL  https://raw.githubusercontent.com/zorlex25/LSS/main/chillout-production-loader.user.js
// ==/UserScript==

;(async () => {
  // 🔐 Configuration
  const CONFIG = {
    MAIN_CODE_URL: "https://raw.githubusercontent.com/zorlex25/LSS/main/chillout-main-clean.user.js",
    USER_LIST_URL: "https://raw.githubusercontent.com/zorlex25/LSS/main/allowed_users.json",
    ENCRYPTION_KEY: "FreiwilligeFeuerwehrLemgo",
    DOMAIN_CHECK: "www.leitstellenspiel.de",
    VERSION: "2.0",
    CACHE_DURATION: 10 * 60 * 1000, // 10 minutes
    TIMEOUT: 8000,
    DEBUG: false, // Production mode - minimal logging
  }

  // 🔒 Basic security check
  if (window.location.hostname !== CONFIG.DOMAIN_CHECK) {
    return
  }

  // --- NEU: Cache prüfen und bei Fehlern löschen ---
  function clearCacheIfCorrupt() {
    try {
      const cached = GM_getValue("cl_main_code", null)
      if (cached) {
        JSON.parse(cached)
        if (cached.includes("True")) {
          throw new Error("Invalid 'True' found in cache")
        }
      }
    } catch {
      GM_listValues().forEach((key) => {
        if (key.startsWith("cl_")) {
          GM_deleteValue(key)
          if (CONFIG.DEBUG) console.log(`Cache-Key ${key} gelöscht wegen Fehler`)
        }
      })
      if (CONFIG.DEBUG) console.log("Cache wegen fehlerhaften Daten geleert.")
    }
  }

  clearCacheIfCorrupt()
  // --- ENDE NEU ---

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

  // 🛡️ CSRF Token Management
  function getCSRFToken() {
    const metaToken = document.querySelector('meta[name="csrf-token"]')
    if (metaToken) return metaToken.getAttribute("content")

    const railsToken = document.querySelector('meta[name="authenticity_token"]')
    if (railsToken) return railsToken.getAttribute("content")

    const formToken = document.querySelector('input[name="authenticity_token"]')
    if (formToken) return formToken.value

    const laravelToken = document.querySelector('input[name="_token"]')
    if (laravelToken) return laravelToken.value

    if (window.csrfToken) return window.csrfToken

    const scripts = document.querySelectorAll("script")
    for (const script of scripts) {
      if (script.textContent) {
        const tokenMatch = script.textContent.match(/csrf[_-]?token["']?\s*[:=]\s*["']([^"']+)["']/i)
        if (tokenMatch) return tokenMatch[1]

        const authMatch = script.textContent.match(/authenticity[_-]?token["']?\s*[:=]\s*["']([^"']+)["']/i)
        if (authMatch) return authMatch[1]
      }
    }
    return null
  }

  // 🔧 Enhanced jQuery with CSRF token support
  function setupEnhancedJQuery() {
    if (typeof $ === "undefined" || typeof jQuery === "undefined") {
      return
    }
    const csrfToken = getCSRFToken()
    const originalAjax = $.ajax
    const originalPost = $.post

    $.ajax = function (options) {
      if (options.type === "POST" || options.method === "POST") {
        options.headers = options.headers || {}
        if (csrfToken) {
          options.headers["X-CSRF-Token"] = csrfToken
          options.headers["authenticity_token"] = csrfToken
          if (options.data && typeof options.data === "object") {
            options.data.authenticity_token = csrfToken
            options.data._token = csrfToken
          }
        }
        options.headers["X-Requested-With"] = "XMLHttpRequest"
        options.headers["Accept"] = "application/json, text/javascript, */*; q=0.01"
        options.headers["Content-Type"] =
          options.headers["Content-Type"] || "application/x-www-form-urlencoded; charset=UTF-8"
        options.headers["Referer"] = window.location.href
      }
      const jqXHR = originalAjax.call(this, options)

      jqXHR.fail((xhr, status, error) => {
        if (xhr.status === 401 || xhr.status === 403) {
          const newToken = getCSRFToken()
          if (newToken && newToken !== csrfToken) {
            if (options.headers) {
              options.headers["X-CSRF-Token"] = newToken
              options.headers["authenticity_token"] = newToken
            }
            setTimeout(() => {
              $.ajax(options)
            }, 1000)
          }
        }
      })

      return jqXHR
    }

    $.post = (url, data, success, dataType) => {
      const options = {
        type: "POST",
        url: url,
        data: data,
        success: success,
        dataType: dataType,
      }
      return $.ajax(options)
    }
  }

  // 👤 Get current user ID
  function getCurrentUserId() {
    const profileLink = document.querySelector('a[href^="/profile/"]')
    if (profileLink) {
      const match = profileLink.href.match(/\/profile\/(\d+)/)
      if (match) return Number.parseInt(match[1])
    }
    const userMenu = document.querySelector('#user_menu a[href^="/profile/"]')
    if (userMenu) {
      const match = userMenu.href.match(/\/profile\/(\d+)/)
      if (match) return Number.parseInt(match[1])
    }
    const scripts = document.querySelectorAll("script")
    for (const script of scripts) {
      if (script.textContent && script.textContent.includes("user_id")) {
        const match = script.textContent.match(/user_id["\s]*[:=]["\s]*(\d+)/)
        if (match) return Number.parseInt(match[1])
      }
    }
    return null
  }

  // 🏠 Check if main page
  function isMainPage() {
    return window.location.pathname === "/" || window.location.pathname === "/missions"
  }

  // 🚪 Force logout unauthorized user
  function forceLogout() {
    alert("Du bist nicht berechtigt, dieses Script zu nutzen, deaktiviere es umgehend!")
    const logoutBtn = document.getElementById("logout_button")
    if (logoutBtn) {
      logoutBtn.click()
    } else {
      window.location.href = "/users/sign_out"
    }
  }

  // 🔍 Verify user access and return allowed users list
  async function verifyUserAccess() {
    try {
      const currentUserId = getCurrentUserId()
      if (!currentUserId) {
        throw new Error("Could not determine user ID")
      }
      const cachedResult = Cache.get("user_check")
      if (cachedResult && cachedResult.userId === currentUserId) {
        return {
          allowed: cachedResult.allowed,
          allowedUsers: cachedResult.allowedUsers,
        }
      }
      const res = await fetchRemote(CONFIG.USER_LIST_URL)
      const json = JSON.parse(res)
      const encryptedText = json.encryptedUserIDs
      if (!encryptedText) {
        throw new Error("Invalid user list format")
      }
      const bytes = CryptoJS.AES.decrypt(encryptedText, CONFIG.ENCRYPTION_KEY)
      const decryptedStr = bytes.toString(CryptoJS.enc.Utf8)
      if (!decryptedStr) throw new Error("Decryption failed")
      const allowedUsers = JSON.parse(decryptedStr)
      if (!Array.isArray(allowedUsers)) {
        throw new Error("Invalid user data")
      }
      const isAllowed = allowedUsers.includes(currentUserId)
      Cache.set(
        "user_check",
        {
          userId: currentUserId,
          allowed: isAllowed,
          allowedUsers: allowedUsers,
        },
        2 * 60 * 1000,
      )
      if (!isAllowed) {
        forceLogout()
        return { allowed: false, allowedUsers: null }
      }
      return { allowed: true, allowedUsers: allowedUsers }
    } catch (error) {
      forceLogout()
      return { allowed: false, allowedUsers: null }
    }
  }

  // 📥 Load main code
  async function loadMainCode() {
    try {
      let mainCode = Cache.get("main_code")
      if (!mainCode) {
        mainCode = await fetchRemote(CONFIG.MAIN_CODE_URL)
        if (!mainCode.includes("function") && !mainCode.includes("=>")) {
          throw new Error("Invalid code received")
        }
        Cache.set("main_code", mainCode)
      }
      return mainCode
    } catch (error) {
      throw error
    }
  }

  // 🚀 Execute the main code
  function executeMainCode(code, allowedUsers) {
    try {
      window.chilloutAllowedUsers = allowedUsers
      setupEnhancedJQuery()
      const cleanCode = code.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\s*/, "")
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
    } catch (error) {
      throw error
    }
  }

  // 🎯 Main initialization
  async function initialize() {
    try {
      if (!isMainPage()) return
      const accessResult = await verifyUserAccess()
      if (!accessResult.allowed) {
        return
      }
      const mainCode = await loadMainCode()
      executeMainCode(mainCode, accessResult.allowedUsers)
      if (CONFIG.DEBUG) {
        console.log("✅ Chillout-Special loaded successfully")
      }
    } catch (error) {
      if (CONFIG.DEBUG) {
        console.error("❌ Loader failed:", error)
      }
    }
  }

  // 🔄 Wait for page readiness
  function startLoader() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initialize)
    } else {
      setTimeout(initialize, 1000)
    }
  }

  // 🎬 Start the loader
  startLoader()
})()
