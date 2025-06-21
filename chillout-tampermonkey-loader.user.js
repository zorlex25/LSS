// ==UserScript==
// @name         Chillout-Special Clean
// @version      2.3
// @author       Lenni
// @match        *://www.leitstellenspiel.de/*
// @grant        GM_addStyle
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==

/* global $, CryptoJS, GM_addStyle */

(async function () {
    'use strict';

    // This will be set by the loader
    if (!window.chilloutAllowedUsers) {
        console.error("❌ User list not available");
        return;
    }

    let AllowedUserIDs = window.chilloutAllowedUsers;
    let autoRunActive = false;

    // Aktuelle User-ID aus Profil-Link extrahieren
    function getCurrentUserId() {
        const profileLink = document.querySelector('a[href^="/profile/"]');
        if (profileLink) {
            const match = profileLink.href.match(/\/profile\/(\d+)/);
            return match ? Number(match[1]) : null;
        }
        return null;
    }

    // Prüfen ob Hauptseite (hier anpassen, falls nötig)
    function isMainPage() {
        return window.location.pathname === '/' || window.location.pathname === '/missions';
    }

    const currentUserId = getCurrentUserId();

    if (!isMainPage()) return;

    if (!AllowedUserIDs.includes(currentUserId)) {
        alert("Du bist nicht berechtigt, dieses Script zu nutzen, deaktiviere es umgehend!");
        const logoutBtn = document.getElementById("logout_button");
        if (logoutBtn) logoutBtn.click();
        else window.location.href = "/users/sign_out";
        return;
    }

    console.log(`✅ Zugriff erlaubt für User #${currentUserId}`);

    if (!sessionStorage.aMissions || JSON.parse(sessionStorage.aMissions).lastUpdate < (new Date().getTime() - 5 * 60 * 1000)) {
        await $.getJSON('/einsaetze.json').done(data => sessionStorage.setItem('aMissions', JSON.stringify({ lastUpdate: new Date().getTime(), value: data })));
    }

    const aMissions = JSON.parse(sessionStorage.aMissions).value;
    let config = localStorage.chiAConfig ? JSON.parse(localStorage.chiAConfig) : { credits: 0, vehicles: [] };
    config.colorThresholds = config.colorThresholds ?? {
        green: 10000,
        yellow: 50000,
        red: 100000,
    };

    const allianceMissions = [];

    GM_addStyle(`
    .modal {
        display: none;
        position: fixed;
        padding-top: 100px;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        overflow: auto;
        background-color: rgba(0,0,0,0.4);
        z-index: 9999;
    }
    .modal-body {
        height: 650px;
        overflow-y: auto;
    }`);

    $(".mission-state-filters").append(`
        <a id="chilloutArea" data-toggle="modal" data-target="#chiAModal" class="btn btn-xs btn-danger" title="Chillout starten">
            <span class="glyphicon glyphicon-ice-lolly-tasted"></span> Chillout
        </a>`);

    $("body").prepend(`
        <div class="modal fade bd-example-modal-lg" id="chiAModal" tabindex="-1" role="dialog" aria-hidden="true">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&#x274C;</span>
                        </button>
                        <h5 class="modal-title text-center">Let's chillout🏖️!</h5>
                        <div class="btn-group">
                            <a class="btn btn-success btn-xs" id="chiAScan">Scan</a>
                            <a class="btn btn-success btn-xs" id="chiAStart">Start</a>
                            <a class="btn btn-success btn-xs" id="chiAPreferences">
                                <span class="glyphicon glyphicon-cog" style="color:LightSteelBlue"></span>
                            </a>
                        </div>
                    </div>
                    <div class="modal-body" id="chiAModalBody"></div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-danger" data-dismiss="modal">Schließen</button>
                        <div class="pull-left">v 2.3</div>
                    </div>
                </div>
            </div>
        </div>`);

    const vehicleList = [
        { id: 0, name: 'LF 20' },
        { id: 1, name: 'LF 10' },
        { id: 2, name: 'DLK 23' },
        { id: 3, name: 'ELW 1' },
        { id: 4, name: 'RW' },
        { id: 5, name: 'GW' },
        { id: 6, name: 'LF 8/6' },
        { id: 7, name: 'LF 20/16' },
        { id: 8, name: 'LF 10/6' },
        { id: 9, name: 'LF 16' },
        { id: 10, name: 'GW' },
        { id: 11, name: 'GW' },
        { id: 12, name: 'GW' },
        { id: 13, name: 'SW 1000' },
        { id: 14, name: 'SW 2000' },
        { id: 15, name: 'SW 2000' },
        { id: 16, name: 'SW' },
        { id: 17, name: 'TLF 2000' },
        { id: 18, name: 'TLF 3000' },
        { id: 19, name: 'TLF 8/8' },
        { id: 20, name: 'TLF 8/18' },
        { id: 21, name: 'TLF 16/24' },
        { id: 22, name: 'TLF 16/25' },
        { id: 23, name: 'TLF 16/45' },
        { id: 24, name: 'TLF 20/40' },
        { id: 25, name: 'TLF 20/40' },
        { id: 26, name: 'TLF 16' },
        { id: 27, name: 'GW' },
        { id: 28, name: 'RTW' },
        { id: 29, name: 'NEF' },
        { id: 30, name: 'HLF 20' },
        { id: 31, name: 'RTH' },
        { id: 32, name: 'FuStW' },
        { id: 33, name: 'GW' },
        { id: 34, name: 'ELW 2' },
        { id: 35, name: 'leBefKw' },
        { id: 36, name: 'MTW' },
        { id: 37, name: 'TSF' },
        { id: 38, name: 'KTW' },
        { id: 39, name: 'GKW' },
        { id: 40, name: 'MTW' },
        { id: 41, name: 'MzGW (FGr N)' },
        { id: 42, name: 'LKW K 9' },
        { id: 43, name: 'BRmG R' },
        { id: 44, name: 'Anh DLE' },
        { id: 45, name: 'MLW 5' },
        { id: 46, name: 'WLF' },
        { id: 47, name: 'AB' },
        { id: 48, name: 'AB' },
        { id: 49, name: 'AB' },
        { id: 50, name: 'GruKw' },
        { id: 51, name: 'FüKW (Polizei)' },
        { id: 52, name: 'GefKw' },
        { id: 53, name: 'Dekon' },
        { id: 54, name: 'AB' },
        { id: 55, name: 'KdoW' },
        { id: 56, name: 'KdoW' },
        { id: 57, name: 'FwK' },
        { id: 58, name: 'KTW Typ B' },
        { id: 59, name: 'ELW 1 (SEG)' },
        { id: 60, name: 'GW' },
        { id: 61, name: 'Polizeihubschrauber' },
        { id: 62, name: 'AB' },
        { id: 63, name: 'GW' },
        { id: 64, name: 'GW' },
        { id: 65, name: 'LKW 7 Lkr 19 tm' },
        { id: 66, name: 'Anh MzB' },
        { id: 67, name: 'Anh SchlB' },
        { id: 68, name: 'Anh MzAB' },
        { id: 69, name: 'Tauchkraftwagen' },
        { id: 70, name: 'MZB' },
        { id: 71, name: 'AB' },
        { id: 72, name: 'WaWe 10' },
        { id: 73, name: 'GRTW' },
        { id: 74, name: 'NAW' },
        { id: 75, name: 'FLF' },
        { id: 76, name: 'Rettungstreppe' },
        { id: 77, name: 'AB' },
        { id: 78, name: 'AB' },
        { id: 79, name: 'SEK' },
        { id: 80, name: 'SEK' },
        { id: 81, name: 'MEK' },
        { id: 82, name: 'MEK' },
        { id: 83, name: 'GW' },
        { id: 84, name: 'ULF mit Löscharm' },
        { id: 85, name: 'TM 50' },
        { id: 86, name: 'Turbolöscher' },
        { id: 87, name: 'TLF 4000' },
        { id: 88, name: 'KLF' },
        { id: 89, name: 'MLF' },
        { id: 90, name: 'HLF 10' },
        { id: 91, name: 'Rettungshundefahrzeug' },
        { id: 92, name: 'Anh Hund' },
        { id: 93, name: 'MTW' },
        { id: 94, name: 'DHuFüKW' },
        { id: 95, name: 'Polizeimotorrad' },
        { id: 96, name: 'Außenlastbehälter (allgemein)' },
        { id: 97, name: 'ITW' },
        { id: 98, name: 'Zivilstreifenwagen' },
        { id: 99, name: 'LKW 7 Lbw' },
        { id: 100, name: 'MLW 4' },
        { id: 101, name: 'Anh SwPu' },
        { id: 102, name: 'Anh 7' },
        { id: 103, name: 'FuStW (DGL)' },
        { id: 104, name: 'GW' },
        { id: 105, name: 'GW' },
        { id: 106, name: 'MTF' },
        { id: 107, name: 'LF' },
        { id: 108, name: 'AB' },
        { id: 109, name: 'MzGW SB' },
        { id: 110, name: 'NEA50' },
        { id: 111, name: 'NEA50' },
        { id: 112, name: 'NEA200' },
        { id: 113, name: 'NEA200' },
        { id: 114, name: 'GW' },
        { id: 115, name: 'Anh Lüfter' },
        { id: 116, name: 'AB' },
        { id: 117, name: 'AB' },
        { id: 118, name: 'Kleintankwagen' },
        { id: 119, name: 'AB' },
        { id: 120, name: 'Tankwagen' },
        { id: 121, name: 'GTLF' },
        { id: 122, name: 'LKW 7 Lbw (FGr E)' },
        { id: 123, name: 'LKW 7 Lbw (FGr WP)' },
        { id: 124, name: 'MTW' },
        { id: 125, name: 'MTW' },
        { id: 126, name: 'MTF Drohne' },
        { id: 127, name: 'GW' },
        { id: 128, name: 'ELW Drohne' },
        { id: 129, name: 'ELW 2 Drohne' },
        { id: 130, name: 'GW' },
        { id: 131, name: 'Bt' },
        { id: 132, name: 'FKH' },
        { id: 133, name: 'Bt LKW' },
        { id: 134, name: 'Pferdetransporter klein' },
        { id: 135, name: 'Pferdetransporter groß' },
        { id: 136, name: 'Anh Pferdetransport' },
        { id: 137, name: 'Zugfahrzeug Pferdetransport' },
        { id: 138, name: 'GW' },
        { id: 139, name: 'GW' },
        { id: 140, name: 'MTW' },
        { id: 141, name: 'FKH' },
        { id: 142, name: 'AB' },
        { id: 143, name: 'Anh Schlauch' },
        { id: 144, name: 'FüKW (THW)' },
        { id: 145, name: 'FüKomKW' },
        { id: 146, name: 'Anh FüLa' },
        { id: 147, name: 'FmKW' },
        { id: 148, name: 'MTW' },
        { id: 149, name: 'GW' },
        { id: 150, name: 'GW' },
        { id: 151, name: 'ELW Bergrettung' },
        { id: 152, name: 'ATV' },
        { id: 153, name: 'Hundestaffel (Bergrettung)' },
        { id: 154, name: 'Schneefahrzeug' },
        { id: 155, name: 'Anh Höhenrettung (Bergrettung)' },
        { id: 156, name: 'Polizeihubschrauber mit verbauter Winde' },
        { id: 157, name: 'RTH Winde' },
        { id: 158, name: 'GW' },
        { id: 159, name: 'Seenotrettungskreuzer' },
        { id: 160, name: 'Seenotrettungsboot' },
        { id: 161, name: 'Hubschrauber (Seenotrettung)' },
        { id: 162, name: 'RW' },
        { id: 163, name: 'HLF Schiene' },
        { id: 164, name: 'AB' },
        { id: 165, name: 'LauKw' },
        { id: 166, name: 'PTLF 4000' },
        { id: 167, name: 'SLF' },
        { id: 168, name: 'Anh Sonderlöschmittel' },
        { id: 169, name: 'AB' },
        { id: 170, name: 'AB' }
    ];

    $("body").on("click", "#chilloutArea", function () {
        autoRunActive = false;
        $("#chiAModalBody").html(`
            <center>
                <img src="https://forum.leitstellenspiel.de/cms/index.php?attachment/93832-zivilpolizei-audi-forum-png/"
                     style="max-width:100%; height:auto;">
            </center>
        `);
        allianceMissions.length = 0;
    });

    // Holt den tatsächlichen Durchschnitts-Credit-Wert aus der Einsatzseite
    async function fetchAverageCredits(missionId) {
        try {
            const html = await $.get(`/einsaetze/${missionId}`);
            const parsed = $.parseHTML(html);
            const row = $(parsed).find("table.table-striped tbody tr:contains('Credits im Durchschnitt')");
            const value = row.find("td:last").text().trim().replace(/\./g, '').replace(/\D/g, '');
            return parseInt(value, 10) || 50000;
        } catch (err) {
            console.warn(`Fehler beim Holen der Credits für Einsatz ${missionId}`, err);
            return 50000;
        }
    }

    $("body").on("click", "#chiAScan", async function () {
        autoRunActive = false;
        allianceMissions.length = 0;
        const missionsToScan = [];

        // Modalinhalt mit Progressbar vorbereiten
        $("#chiAModalBody").html(`
            <div style="margin-bottom: 10px;">
                <div class="progress">
                    <div id="chiAProgressBar" class="progress-bar progress-bar-striped active" role="progressbar"
                         style="width: 0%">0%</div>
                </div>
            </div>
        `);

        const selectors = [];
        if (config.useOwnMissions) selectors.push("#mission_list");
        if (config.useAllianceMissions) selectors.push("#mission_list_alliance");
        if (config.useAllianceEvents) selectors.push("#mission_list_alliance_event");
        if (config.useSecurityMissions) selectors.push("#mission_list_sicherheitswache");
        if (config.useSecurityMissionsAlliance) selectors.push("#mission_list_sicherheitswache_alliance");

        selectors.forEach(sel => {
            $(`${sel} .missionSideBarEntry:not(.mission_deleted)`).each(function () {
                const id = +this.id.replace(/\D+/g, "");
                if (!$(`#mission_participant_new_${id}`).hasClass("hidden")) {
                    missionsToScan.push({
                        id,
                        typeId: +$(this).attr("mission_type_id"),
                        name: $(`#mission_caption_${id}`).contents().not($(`#mission_caption_${id}`).children()).text().trim(),
                        address: $(`#mission_address_${id}`).text().trim(),
                    });
                }
            });
        });

        for (let i = 0; i < missionsToScan.length; i++) {
            const m = missionsToScan[i];
            const credits = await fetchAverageCredits(m.typeId);
            allianceMissions.push({ ...m, credits });

            const percent = Math.round(((i + 1) / missionsToScan.length) * 100);
            $("#chiAProgressBar")
                .css("width", `${percent}%`)
                .text(`${percent}%`);
        }

        $("#chiAProgressBar")
            .removeClass("progress-bar-striped active")
            .addClass("progress-bar-success")
            .text("Fertig");

        allianceMissions.sort((a, b) => b.credits - a.credits);

        const thresholds = config.colorThresholds ?? { green: 10000, yellow: 50000, red: 100000 };

        const tableRows = allianceMissions.map(e => {
            if (e.credits < config.credits) return "";

            const colorClass = e.credits >= thresholds.red
                ? "alert-danger"
                : e.credits >= thresholds.yellow
                ? "alert-warning"
                : e.credits >= thresholds.green
                ? "alert-success"
                : "alert-info";

            return `
                <tr id="tr_${e.id}" class="alert ${colorClass}">
                    <td><input type="checkbox" class="batch-alarm-checkbox" data-mission-id="${e.id}"></td>
                    <td><a class="lightbox-open" href="/missions/${e.id}">${e.name}</a></td>
                    <td>${e.address}</td>
                    <td>${e.credits.toLocaleString()}</td>
                    <td id="status_${e.id}"></td>
                    <td>
                        <button class="btn btn-primary btn-xs single-alarm-btn" data-mission-id="${e.id}">Ein Fahrzeug schicken</button>
                    </td>
                </tr>
            `;
        }).join("");

        const table = `
        <table class="table">
            <thead><tr><th></th><th>Name</th><th>Adresse</th><th>Credits</th><th>Status</th><th>Aktion</th></tr></thead>
            <tbody>${tableRows}</tbody>
        </table>
        <button id="batchAlarmBtn" class="btn btn-danger" style="margin-top:10px;">Alle ausgewählten Einsätze alarmieren</button>
    `;

        $("#chiAModalBody").append(table);
    });

    // Einzelalarm-Button
    $("body").on("click", ".single-alarm-btn", async function () {
        const missionId = $(this).data("mission-id");
        const statusCell = $(`#status_${missionId}`);
        statusCell.text("suche ...");

        async function loadMissingVehicles(htmlDoc) {
            const loadButton = $(htmlDoc).find(".missing_vehicles_load").first();
            if (loadButton.length === 0) return null;
            const url = loadButton.attr("href");
            if (!url) return null;
            const data = await $.get(url);
            return $.parseHTML(data);
        }

        let html = $.parseHTML(await $.get(`/missions/${missionId}`));
        let reloadCount = 0;
        let vehicleIdToAlarm = null;

        while (reloadCount <= 5) {
            const checkboxes = $(html).find(".vehicle_checkbox").toArray();

            vehicleIdToAlarm = null;
            const vehicleListToUse = config.usePriority ? (config.vehiclePriority || []) : (config.vehicles || []);
            for (let vType of vehicleListToUse) {
                const cb = checkboxes.find(cb => +cb.getAttribute("vehicle_type_id") === vType);
                if (cb) {
                    vehicleIdToAlarm = +cb.value;
                    break;
                }
            }

            if (vehicleIdToAlarm !== null) break;

            const newHtml = await loadMissingVehicles(html);
            if (newHtml === null) break;
            html = newHtml;
            reloadCount++;
        }

        if (vehicleIdToAlarm !== null) {
            statusCell.text("alarmiere ...");
            await $.post(`/missions/${missionId}/alarm`, { vehicle_ids: [vehicleIdToAlarm] });
            statusCell.text("alarmiert");
            $(`#tr_${missionId}`).remove();
        } else {
            statusCell.text("keine passenden Fahrzeuge");
        }
    });

    // Batch-Alarm-Button
    $("body").on("click", "#batchAlarmBtn", async function () {
        const selectedMissions = $(".batch-alarm-checkbox:checked").map(function() {
            return $(this).data("mission-id");
        }).get();

        if (selectedMissions.length === 0) {
            alert("Bitte mindestens einen Einsatz auswählen!");
            return;
        }

        for (const missionId of selectedMissions) {
            const statusCell = $("#status_" + missionId);
            statusCell.text("suche ...");

            async function loadMissingVehicles(htmlDoc) {
                const loadButton = $(htmlDoc).find(".missing_vehicles_load").first();
                if (loadButton.length === 0) return null;
                const url = loadButton.attr("href");
                if (!url) return null;
                const data = await $.get(url);
                return $.parseHTML(data);
            }

            let html = $.parseHTML(await $.get(`/missions/${missionId}`));
            let reloadCount = 0;
            let vehicleIdToAlarm = null;

            while (reloadCount <= 5) {
                const checkboxes = $(html).find(".vehicle_checkbox").toArray();

                vehicleIdToAlarm = null;
                const vehicleListToUse = config.usePriority ? (config.vehiclePriority || []) : (config.vehicles || []);
                for (let vType of vehicleListToUse) {
                    const cb = checkboxes.find(cb => +cb.getAttribute("vehicle_type_id") === vType);
                    if (cb) {
                        vehicleIdToAlarm = +cb.value;
                        break;
                    }
                }

                if (vehicleIdToAlarm !== null) break;

                const newHtml = await loadMissingVehicles(html);
                if (newHtml === null) break;
                html = newHtml;
                reloadCount++;
            }

            if (vehicleIdToAlarm !== null) {
                statusCell.text("alarmiere ...");
                await $.post(`/missions/${missionId}/alarm`, { vehicle_ids: [vehicleIdToAlarm] });
                statusCell.text("alarmiert");
                $(`#tr_${missionId}`).remove();
            } else {
                statusCell.text("keine passenden Fahrzeuge");
            }
        }
    });

    $("body").on("click", "#chiAStart", async function () {
        autoRunActive = false;
        for (let e of allianceMissions) {
            const mId = e.id;
            $("#status_" + mId).text("suche ...");

            async function loadMissingVehicles(htmlDoc) {
                const loadButton = $(htmlDoc).find(".missing_vehicles_load").first();
                if (loadButton.length === 0) return null;
                const url = loadButton.attr("href");
                if (!url) return null;
                const data = await $.get(url);
                return $.parseHTML(data);
            }

            let html = $.parseHTML(await $.get(`/missions/${mId}`));
            let reloadCount = 0;
            let vehicleIdToAlarm = null;

            while (reloadCount <= 5) {
                const checkboxes = $(html).find(".vehicle_checkbox").toArray();

                vehicleIdToAlarm = null;
                const vehicleListToUse = config.usePriority ? (config.vehiclePriority || []) : (config.vehicles || []);
                for (let vType of vehicleListToUse) {
                    const cb = checkboxes.find(cb => +cb.getAttribute("vehicle_type_id") === vType);
                    if (cb) {
                        vehicleIdToAlarm = +cb.value;
                        break;
                    }
                }

                if (vehicleIdToAlarm !== null) break;

                const newHtml = await loadMissingVehicles(html);
                if (newHtml === null) break;
                html = newHtml;
                reloadCount++;
            }

            if (vehicleIdToAlarm !== null) {
                $("#status_" + mId).text("alarmiere ...");
                await $.post(`/missions/${mId}/alarm`, { vehicle_ids: [vehicleIdToAlarm] });
                $("#status_" + mId).text("alarmiert");
                $(`#tr_${mId}`).remove();
            } else {
                $("#status_" + mId).text("keine passenden Fahrzeuge");
            }
        }
    });

    // Preferences/Settings
    $("body").on("click", "#chiAPreferences", function () {
        const currentSelected = Array.isArray(config.vehicles) ? config.vehicles : [];
        const currentPriority = Array.isArray(config.vehiclePriority) ? config.vehiclePriority : [];
        const isChecked = config.autoRun ?? false;
        config.usePriority = config.usePriority ?? false;

        config.useOwnMissions = config.useOwnMissions ?? false;
        config.useAllianceMissions = config.useAllianceMissions ?? true;
        config.useAllianceEvents = config.useAllianceEvents ?? true;
        config.useSecurityMissions = config.useSecurityMissions ?? true;
        config.useSecurityMissionsAlliance = config.useSecurityMissionsAlliance ?? false;

        config.colorThresholds = config.colorThresholds ?? {
            green: 10000,
            yellow: 50000,
            red: 100000
        };
        config.autoRunStart = config.autoRunStart || "08:00";
        config.autoRunEnd = config.autoRunEnd || "22:00";
        config.autoRunInterval = config.autoRunInterval || 30;

        $("#chiAModalBody").html(`
        <div>
            <label>Einsätze ab <input type="number" id="chiACredits" value="${config.credits || 0}" style="width:5em" /> Credits anzeigen</label><br><br>

            <label>Fahrzeugtypen (Strg + Klick für mehrere):</label><br>
            <select multiple id="chiAVehicleTypes" class="form-control" style="height:20em; width:40em;">
                ${vehicleList.map(v => `<option value="${v.id}" ${(currentSelected.includes(v.id) ? "selected" : "")}>${v.name}</option>`).join("")}
            </select><br><br>

            <fieldset>
                <legend>Fahrzeug-Priorität aktivieren:</legend>
                <label><input type="checkbox" id="chiAUsePriority" ${config.usePriority ? "checked" : ""}> Prioritäten verwenden</label>
            </fieldset><br>

            <div id="prioritySettings" style="display: ${config.usePriority ? "block" : "none"};">
                <label>Fahrzeug-Priorität (Reihenfolge, Strg + Klick für mehrere):</label><br>
                <select multiple id="chiAVehiclePriority" class="form-control" style="height:15em; width:40em;">
                    ${vehicleList
                        .filter(v => currentSelected.includes(v.id))
                        .map(v => `<option value="${v.id}" ${(currentPriority.includes(v.id) ? "selected" : "")}>${v.name}</option>`)
                        .join("")}
                </select><br><br>
            </div>

            <fieldset>
                <legend>Einsatzarten auswählen:</legend>
                <label><input type="checkbox" id="chiAUseOwn" ${config.useOwnMissions ? "checked" : ""}> Eigene Einsätze</label><br>
                <label><input type="checkbox" id="chiAUseAlliance" ${config.useAllianceMissions ? "checked" : ""}> Verbandseinsätze</label><br>
                <label><input type="checkbox" id="chiAUseEvent" ${config.useAllianceEvents ? "checked" : ""}> Verbandseventeinsätze</label><br>
                <label><input type="checkbox" id="chiAUseSecurity" ${config.useSecurityMissions ? "checked" : ""}> Sicherheitswachen</label><br>
                <label><input type="checkbox" id="chiAUseSecurityAlliance" ${config.useSecurityMissionsAlliance ? "checked" : ""}> Sicherheitswachen (Verband)</label>
            </fieldset><br>

            <fieldset>
                <legend>Farbliche Markierung nach Credits:</legend>
                <label>🟩 Grün ab <input type="number" id="chiAColorGreen" value="${config.colorThresholds.green}" style="width:6em" /> Credits</label><br>
                <label>🟨 Gelb ab <input type="number" id="chiAColorYellow" value="${config.colorThresholds.yellow}" style="width:6em" /> Credits</label><br>
                <label>🟥 Rot ab <input type="number" id="chiAColorRed" value="${config.colorThresholds.red}" style="width:6em" /> Credits</label><br>
            </fieldset><br>

            <fieldset>
                <legend>Auto-Run</legend>
                <label><input type="checkbox" id="chiAAutoRun" ${isChecked ? "checked" : ""}> Auto-Run aktivieren</label><br><br>
                <div id="autoRunTimeSettings" style="display: ${isChecked ? "block" : "none"}; margin-left: 20px;">
                    <legend>Auto-Run Zeitsteuerung:</legend>
                    <label>Startzeit <input type="time" id="chiAAutoRunStart" value="${config.autoRunStart}" /></label><br>
                    <label>Endzeit <input type="time" id="chiAAutoRunEnd" value="${config.autoRunEnd}" /></label><br>
                    <label>Intervall (Minuten) <input type="number" id="chiAAutoRunInterval" value="${config.autoRunInterval}" style="width:5em" /></label>
                </div>
            </fieldset><br>

            <button class="btn btn-success" id="chiABtnSave">Speichern</button>
        </div>
        `);

        $("body").off("change", "#chiAUsePriority").on("change", "#chiAUsePriority", function () {
            $("#prioritySettings").slideToggle(this.checked);
        });

        $("body").off("change", "#chiAVehicleTypes").on("change", "#chiAVehicleTypes", function () {
            const selected = $(this).val().map(Number);
            const newOptions = vehicleList
                .filter(v => selected.includes(v.id))
                .map(v => `<option value="${v.id}">${v.name}</option>`)
                .join("");
            $("#chiAVehiclePriority").html(newOptions);
        });
    });

    $("body").off("change", "#chiAAutoRun").on("change", "#chiAAutoRun", function() {
        if ($(this).prop("checked")) {
            $("#autoRunTimeSettings").slideDown();
        } else {
            $("#autoRunTimeSettings").slideUp();
        }
    });

    $("body").on("click", "#chiABtnSave", function () {
        const selected = $("#chiAVehicleTypes").val() || [];
        const priority = $("#chiAVehiclePriority").val() || [];

        config.credits = +$("#chiACredits").val();
        config.vehicles = selected.map(Number);
        config.vehiclePriority = priority.map(Number);
        config.usePriority = $("#chiAUsePriority").prop("checked");
        config.autoRun = $("#chiAAutoRun").prop("checked");

        config.useOwnMissions = $("#chiAUseOwn").prop("checked");
        config.useAllianceMissions = $("#chiAUseAlliance").prop("checked");
        config.useAllianceEvents = $("#chiAUseEvent").prop("checked");
        config.useSecurityMissions = $("#chiAUseSecurity").prop("checked");
        config.useSecurityMissionsAlliance = $("#chiAUseSecurityAlliance").prop("checked");

        config.colorThresholds = {
            green: +$("#chiAColorGreen").val(),
            yellow: +$("#chiAColorYellow").val(),
            red: +$("#chiAColorRed").val(),
        };

        config.autoRunStart = $("#chiAAutoRunStart").val();
        config.autoRunEnd = $("#chiAAutoRunEnd").val();
        config.autoRunInterval = +$("#chiAAutoRunInterval").val();

        localStorage.chiAConfig = JSON.stringify(config);
        $("#chiAModalBody").html("<h3><center>Einstellungen gespeichert</center></h3>");

        if (config.autoRun) {
            setTimeout(runChilloutAuto, 1000);
        }
    });

    // Auto-Chillout
    async function runChilloutAuto() {
        if (autoRunActive) {
            console.log("⚠️ Auto-Run bereits aktiv – Abbruch");
            return;
        }
        autoRunActive = true;

        $("#chiAScan").click();
        await new Promise(r => setTimeout(r, 2000));
        $("#chiAStart").click();

        autoRunActive = false;
    }

    if (config.autoRun) {
        function checkAndRunAuto() {
            const now = new Date();
            const start = config.autoRunStart?.split(":").map(Number) || [8, 0];
            const end = config.autoRunEnd?.split(":").map(Number) || [22, 0];

            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            const startMinutes = start[0] * 60 + start[1];
            const endMinutes = end[0] * 60 + end[1];

            if (nowMinutes >= startMinutes && nowMinutes <= endMinutes) {
                runChilloutAuto();
            } else {
                console.log("⏰ Auto-Run: außerhalb der Zeitspanne");
            }
        }

        setTimeout(checkAndRunAuto, 3000);
        setInterval(checkAndRunAuto, (config.autoRunInterval || 30) * 60 * 1000);
    }

})();
