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
                <span>Liczba zdobytych bramek</span>
                <span>Imię i nazwisko</span>
            </div>`;

        const normalHtml = rows.map(row =>
            `<div class="scorer-row"><b>${Number(row.goals)}</b><span class="scorer-dash">-</span><strong>${escapeName(row.name)}</strong></div>`
        ).join("");

        const ownHtml = Number(ownGoals) > 0
            ? `<div class="scorer-own-divider"></div><div class="scorer-row scorer-own"><b>${Number(ownGoals)}</b><span class="scorer-dash">-</span><strong>Samobój</strong></div>`
            : "";

        el.innerHTML = (normalHtml || ownHtml)
            ? headerHtml + normalHtml + ownHtml
            : `<div class="scorer-empty">Brak bramek Widzewa.</div>`;
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

    // After a match is played/simulated, read the scorers that are actually
    // displayed on the board and add them to the running season total.
    document.addEventListener("click", function (event) {
        const button = event.target?.closest?.("#playMatchButton,#simulateMatchButton");
        if (!button) return;
        [80, 180, 350].forEach(delay => setTimeout(updateLiveFromCurrentMatch, delay));
    }, false);

    // renderPlayableSeason() redraws the board when moving to the next round.
    // The running scorer totals live in this file, so redraw them after that
    // render instead of waiting for the next match to be played.
    document.addEventListener("click", function (event) {
        const button = event.target?.closest?.("#roundActions button");
        if (!button) return;
        if (button.id === "playMatchButton" || button.id === "simulateMatchButton") return;

        [50, 150, 300].forEach(delay => {
            setTimeout(() => renderRows(liveScorers, liveOwnGoals), delay);
        });
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

    const style = document.createElement("style");
    style.id = "seasonTopScorersFixStyles";
    style.textContent = `
        #topScorers .scorer-table-header {
            display:grid;
            grid-template-columns: 145px 1fr;
            align-items:center;
            gap:8px;
            margin-bottom:8px;
            padding-bottom:6px;
            border-bottom:1px solid rgba(255,255,255,.18);
            font-size:11px;
            font-weight:800;
            text-transform:uppercase;
            opacity:.72;
        }
        #topScorers .scorer-table-header span:first-child { text-align:center; }
        #topScorers .scorer-table-header span:last-child { text-align:left; }
        #topScorers .scorer-row { display:grid; grid-template-columns:24px 18px 1fr; align-items:center; gap:8px; }
        #topScorers .scorer-row b { text-align:right; }
        #topScorers .scorer-row strong { min-width:0; }
        #topScorers .scorer-dash { opacity:.75; text-align:center; }
        #topScorers .scorer-own-divider { height:1px; margin:8px 0; background:rgba(255,255,255,.2); }
        #topScorers .scorer-own { opacity:.9; }
    `;
    document.head.appendChild(style);
})();
