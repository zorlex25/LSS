// ==UserScript==
// @name         Chillout-Special Production Loader
// @version      2.1
// @description  Production loader
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
      // Beispiel: Cached main_code prüfen
      const cached = GM_getValue("cl_main_code", null)
      if (cached) {
        // JSON.parse prüfen
        JSON.parse(cached)

        // Falls das JSON unerwünschte 'True' (Großschreibung) enthält -> Fehler auslösen
        if (cached.includes("True")) {
          throw new Error("Invalid 'True' found in cache")
        }
      }
    } catch {
      // Fehler beim Parsen oder ungültige Werte => Cache löschen
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

  // ... (Der restliche Code bleibt unverändert)

  // 🛡️ CSRF Token Management
  function getCSRFToken() {
    // Check meta tag
    const metaToken = document.querySelector('meta[name="csrf-token"]')
    if (metaToken) return metaToken.getAttribute("content")

    // Check Rails CSRF token
    const railsToken = document.querySelector('meta[name="authenticity_token"]')
    if (railsToken) return railsToken.getAttribute("content")

    // Check form inputs
    const formToken = document.querySelector('input[name="authenticity_token"]')
    if (formToken) return formToken.value

    // Check for _token input (Laravel style)
    const laravelToken = document.querySelector('input[name="_token"]')
    if (laravelToken) return laravelToken.value

    // Check window object
    if (window.csrfToken) return window.csrfToken

    // Check for common CSRF token patterns in scripts
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

  // ... (Restlicher Code wie setupEnhancedJQuery, getCurrentUserId, isMainPage, forceLogout, verifyUserAccess, loadMainCode, executeMainCode, initialize, startLoader)

  // 🎬 Start the loader
  startLoader()
})()
