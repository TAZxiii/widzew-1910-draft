/* Widzew top scorers.
   Play mode: update after every revealed match.
   Full-season simulation: aggregate the scorers displayed under all 34 matches.
   This file does not alter match result generation or scorer drawing. */
(function () {
    function escapeName(value) {
        if (typeof window.seasonSafe === "function") return window.seasonSafe(value);
        return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function ensureState() {
        if (!window.seasonGameState) return null;
        if (!seasonGameState.scorers || Array.isArray(seasonGameState.scorers)) seasonGameState.scorers = {};
        if (!Number.isFinite(Number(seasonGameState.ownGoals))) seasonGameState.ownGoals = 0;
        return seasonGameState;
    }
    function addScorer(name) {
        const state = ensureState();
        if (!state || !name) return;
        const clean = String(name).trim();
        if (!clean) return;
        const key = clean.toLocaleLowerCase("pl");
        if (!state.scorers[key]) state.scorers[key] = { name: clean, goals: 0 };
        state.scorers[key].goals++;
    }
    function addMatchToTopScorers(match) {
        if (!match || !Array.isArray(match.scorers)) return;
        const state = ensureState();
        if (!state) return;
        match.scorers.forEach(scorer => {
            if (scorer?.type === "widzew") {
                const name = scorer.name || `${scorer.player?.row?.["Imię"] || ""} ${scorer.player?.row?.["Nazwisko"] || ""}`.trim();
                addScorer(name);
            } else if (scorer?.type === "own" || scorer?.type === "own-goal") {
                state.ownGoals++;
            }
        });
    }
    function renderTopScorers() {
        const el = document.getElementById("topScorers");
        if (!el) return;
        const state = ensureState();
        if (!state) return;
        const rows = Object.values(state.scorers || {}).filter(row => Number(row.goals) > 0).sort((a, b) => Number(b.goals) - Number(a.goals) || a.name.localeCompare(b.name, "pl"));
        const normalHtml = rows.map(row => `<div class="scorer-row"><b>${Number(row.goals)}</b><span class="scorer-dash">-</span><strong>${escapeName(row.name)}</strong></div>`).join("");
        const ownHtml = Number(state.ownGoals) > 0 ? `<div class="scorer-own-divider"></div><div class="scorer-row scorer-own"><b>${Number(state.ownGoals)}</b><span class="scorer-dash">-</span><strong>Samobój</strong></div>` : "";
        el.innerHTML = normalHtml || ownHtml ? normalHtml + ownHtml : `<div class="scorer-empty">Brak bramek Widzewa.</div>`;
    }
    window.updateTopScorersFromMatch = addMatchToTopScorers;
    window.renderTopScorers = renderTopScorers;

    function aggregateFinalSeasonFromDOM() {
        const matches = Array.from(document.querySelectorAll(".round-match.widzew-match"));
        if (!matches.length) return;
        const state = ensureState();
        if (!state) return;
        state.scorers = {};
        state.ownGoals = 0;
        matches.forEach(match => {
            Array.from(match.querySelectorAll(".match-scorers span")).forEach(span => {
                const text = String(span.textContent || "").trim();
                const name = text.replace(/^\d+['’]?\s*/, "").trim();
                if (!name || name === "Przeciwnik") return;
                if (name === "Samobój") { state.ownGoals++; return; }
                addScorer(name);
            });
        });
        renderTopScorers();
    }

    const originalRenderFinalSeason = window.renderFinalSeason;
    if (typeof originalRenderFinalSeason === "function") {
        window.renderFinalSeason = function () {
            const result = originalRenderFinalSeason.apply(this, arguments);
            [400, 550, 750].forEach(delay => setTimeout(aggregateFinalSeasonFromDOM, delay));
            return result;
        };
    }
    const style = document.createElement("style");
    style.id = "seasonTopScorersFixStyles";
    style.textContent = `
        #topScorers .scorer-row { display:flex; align-items:center; gap:8px; }
        #topScorers .scorer-row b { min-width:24px; text-align:right; }
        #topScorers .scorer-row strong { flex:1; }
        #topScorers .scorer-dash { opacity:.75; }
        #topScorers .scorer-own-divider { height:1px; margin:8px 0; background:rgba(255,255,255,.2); }
        #topScorers .scorer-own { opacity:.9; }
    `;
    document.head.appendChild(style);
    setTimeout(renderTopScorers, 0);
})();
