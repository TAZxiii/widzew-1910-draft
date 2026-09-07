/* Widzew top scorers.
   This file only reads the scorer names already displayed for Widzew matches.
   It does not change match results or scorer generation. */
(function () {
    const liveScorers = {};
    let liveOwnGoals = 0;
    const processedRounds = new Set();

    function escapeName(value) {
        if (typeof window.seasonSafe === "function") return window.seasonSafe(value);
        return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function addName(target, name) {
        const clean = String(name || "").trim();
        if (!clean || clean === "Przeciwnik" || clean === "Samobój") return;
        const key = clean.toLocaleLowerCase("pl");
        if (!target[key]) target[key] = { name: clean, goals: 0 };
        target[key].goals++;
    }

    function renderRows(scorers, ownGoals) {
        const el = document.getElementById("topScorers");
        if (!el) return;

        const rows = Object.values(scorers)
            .filter(row => Number(row.goals) > 0)
            .sort((a, b) => Number(b.goals) - Number(a.goals) || a.name.localeCompare(b.name, "pl"));

        const headerHtml = `
            <div class="scorer-table-header">
                <span class="scorer-goals-header">Liczba bramek</span>
                <span class="scorer-name-header">Zawodnik</span>
            </div>`;

        const normalHtml = rows.map(row =>
            `<div class="scorer-row"><b>${Number(row.goals)}</b><span class="scorer-dash">-</span><strong>${escapeName(row.name)}</strong></div>`
        ).join("");

        const ownHtml = Number(ownGoals) > 0
            ? `<div class="scorer-own-divider"></div><div class="scorer-row scorer-own"><b>${Number(ownGoals)}</b><span class="scorer-dash">-</span><strong>Samobój</strong></div>`
            : "";

        el.innerHTML = headerHtml + (normalHtml || ownHtml
            ? normalHtml + ownHtml
            : `<div class="scorer-empty">Brak bramek Widzewa.</div>`);
    }

    function scorerNameFromSpan(span) {
        return String(span?.textContent || "")
            .trim()
            .replace(/^\d+['’]?\s*/, "")
            .trim();
    }

    function readDisplayedScorers(matchElement) {
        const result = { names: [], own: 0 };
        if (!matchElement) return result;
        matchElement.querySelectorAll(".match-scorers span").forEach(span => {
            const name = scorerNameFromSpan(span);
            if (!name || name === "Przeciwnik") return;
            if (name === "Samobój") result.own++;
            else result.names.push(name);
        });
        return result;
    }

    function updateLiveFromCurrentMatch() {
        const match = document.querySelector("#roundMatches .round-match.widzew-match");
        if (!match) return;

        const roundLabel = document.getElementById("roundLabel")?.textContent || "";
        const roundMatch = roundLabel.match(/(\d+)/);
        const round = roundMatch ? Number(roundMatch[1]) : null;
        const key = round ?? match;
        if (processedRounds.has(key)) return;

        const displayed = readDisplayedScorers(match);
        const totalDisplayed = displayed.names.length + displayed.own;
        if (!totalDisplayed) return;

        displayed.names.forEach(name => addName(liveScorers, name));
        liveOwnGoals += displayed.own;
        processedRounds.add(key);
        renderRows(liveScorers, liveOwnGoals);
    }

    function restoreLiveRows() {
        if (Object.keys(liveScorers).length || liveOwnGoals > 0) {
            renderRows(liveScorers, liveOwnGoals);
        }
    }

    document.addEventListener("click", function (event) {
        const button = event.target?.closest?.("#playMatchButton,#simulateMatchButton");
        if (button) {
            [80, 180, 350].forEach(delay => setTimeout(updateLiveFromCurrentMatch, delay));
            return;
        }
    }, false);

    function aggregateFinalSeasonFromDOM() {
        const matches = Array.from(document.querySelectorAll(".round-match.widzew-match"));
        if (!matches.length) return;

        const scorers = {};
        let ownGoals = 0;
        let foundScorerContainer = false;

        matches.forEach(match => {
            const containers = match.querySelectorAll(".match-scorers");
            if (containers.length) foundScorerContainer = true;
            const displayed = readDisplayedScorers(match);
            displayed.names.forEach(name => addName(scorers, name));
            ownGoals += displayed.own;
        });

        if (!foundScorerContainer) return;
        renderRows(scorers, ownGoals);
    }

    const originalRenderFinalSeason = window.renderFinalSeason;
    if (typeof originalRenderFinalSeason === "function") {
        window.renderFinalSeason = function () {
            const result = originalRenderFinalSeason.apply(this, arguments);
            [100, 250, 450, 700, 1000].forEach(delay => setTimeout(aggregateFinalSeasonFromDOM, delay));
            return result;
        };
    }

    /*
       renderPlayableSeason() redraws #topScorers and the core game can clear it
       after the click handler has already run. Watch only this small container.
       When the core renderer removes our rows, immediately restore the already
       accumulated totals. The observer is disconnected while restoring so it
       cannot recurse or cause the game to freeze.
    */
    function installTopScorersGuard() {
        const el = document.getElementById("topScorers");
        if (!el || typeof MutationObserver === "undefined") return;

        const observer = new MutationObserver(function () {
            if (!Object.keys(liveScorers).length && liveOwnGoals <= 0) return;
            if (el.querySelector(".scorer-row")) return;

            observer.disconnect();
            restoreLiveRows();
            observer.observe(el, { childList: true, subtree: true });
        });

        observer.observe(el, { childList: true, subtree: true });
    }

    function startGuardWhenReady() {
        if (document.getElementById("topScorers")) {
            installTopScorersGuard();
            return;
        }
        setTimeout(startGuardWhenReady, 100);
    }
    startGuardWhenReady();

    const style = document.createElement("style");
    style.id = "seasonTopScorersFixStyles";
    style.textContent = `
        #topScorers .scorer-table-header {
            display:grid;
            grid-template-columns:90px 18px minmax(0,1fr);
            align-items:end;
            gap:8px;
            margin-bottom:8px;
            padding:0 10px 7px;
            border-bottom:1px solid rgba(255,255,255,.18);
            font-size:11px;
            font-weight:800;
            text-transform:uppercase;
            line-height:1.15;
            opacity:.72;
        }
        #topScorers .scorer-goals-header {
            grid-column:1 / 3;
            width:auto;
            justify-self:stretch;
            text-align:center;
        }
        #topScorers .scorer-name-header {
            grid-column:3;
            padding-left:0;
            text-align:left;
        }
        #topScorers .scorer-row {
            display:grid;
            grid-template-columns:90px 18px minmax(0,1fr);
            align-items:center;
            gap:8px;
            padding:4px 10px;
        }
        #topScorers .scorer-row b { text-align:right; }
        #topScorers .scorer-dash { text-align:center; opacity:.75; }
        #topScorers .scorer-row strong { min-width:0; text-align:left; }
        #topScorers .scorer-own-divider { height:1px; margin:8px 0; background:rgba(255,255,255,.2); }
        #topScorers .scorer-own { opacity:.9; }
    `;
    document.head.appendChild(style);
})();
