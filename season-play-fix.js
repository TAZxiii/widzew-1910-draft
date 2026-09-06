/* Season play fixes: use the exact 20-player squad selected before the season. */
(function () {
    let preparedResults = null;
    let capturedSquad = null;

    function readFinalSquadFromDOM() {
        const pool = [];
        const starters = Array.from(document.querySelectorAll(".squad-list-player"));
        const bench = Array.from(document.querySelectorAll(".bench-player"));

        const starterRole = {
            "BR": "br",
            "LO/PO": "loPo",
            "ŚO": "so",
            "ŚPD/ŚP/OP": "pomoc",
            "LS/LP/PS/PP": "skrzydlowi",
            "N": "napastnicy"
        };

        const makePlayer = (name, role, position) => {
            const parts = String(name || "").trim().split(/\s+/);
            if (parts.length < 2 || !role) return null;
            const first = parts.shift();
            const last = parts.join(" ");
            return { row: { "Imię": first, "Nazwisko": last }, role, position };
        };

        starters.forEach(el => {
            const info = el.querySelector(".squad-player-info");
            const name = info?.querySelector("strong")?.textContent || "";
            const position = info?.querySelector("small")?.textContent.trim() || "";
            const p = makePlayer(name, starterRole[position], position);
            if (p) pool.push(p);
        });

        bench.forEach(el => {
            const info = el.querySelector(".bench-info");
            const name = info?.querySelector("strong")?.textContent || "";
            const position = info?.querySelector("small")?.textContent.trim() || "";
            const normalized = position.toUpperCase().replace(/\s+/g, "");
            let role = "bench-mid";
            if (normalized === "BR") role = "bench-br";
            else if (normalized === "N") role = "bench-n";
            else if (["ŚO", "SO", "LO/PO", "LOPO"].includes(normalized)) role = "bench-def";
            const p = makePlayer(name, role, position);
            if (p) pool.push(p);
        });

        return pool.length === 20 ? pool : null;
    }

    // Capture the squad while the final squad screen is still active.
    // This is more reliable than looking for it after the season screen opens.
    document.addEventListener("click", function (event) {
        const button = event.target?.closest?.("#playSeasonButton");
        if (!button) return;
        const squad = readFinalSquadFromDOM();
        if (squad) capturedSquad = squad;
    }, true);

    function getScorerSquad() {
        if (capturedSquad && capturedSquad.length === 20) return capturedSquad;
        return readFinalSquadFromDOM() || [];
    }

    function category(p) {
        const pos = String(p.position || "").toUpperCase().replace(/\s+/g, "");
        if (pos === "N") return "N";
        if (pos === "ŚO" || pos === "SO") return "CB";
        if (pos === "LO/PO" || pos === "LOPO") return "DEF";
        if (pos.includes("ŚPD") || pos.includes("ŚP") || pos.includes("OP")) return "MID";
        if (pos.includes("LS") || pos.includes("LP") || pos.includes("PS") || pos.includes("PP")) return "WING";
        const role = String(p.role || "");
        if (role === "napastnicy" || role === "bench-n") return "N";
        if (role === "so") return "CB";
        if (role === "loPo" || role === "bench-def") return "DEF";
        if (role === "pomoc" || role === "bench-mid") return "MID";
        if (role === "skrzydlowi") return "WING";
        return "N";
    }

    function chooseWeightedScorerFrom20() {
        const squad = getScorerSquad();
        const starters = squad.filter(p => !String(p.role).startsWith("bench-"));
        const bench = squad.filter(p => String(p.role).startsWith("bench-"));

        const sp = { N: [], MID: [], WING: [], DEF: [], CB: [] };
        const bp = { N: [], MID: [], WING: [], DEF: [], CB: [] };
        starters.forEach(p => sp[category(p)]?.push(p));
        bench.forEach(p => bp[category(p)]?.push(p));

        const base = { N: 33, MID: 12, WING: 9, DEF: 7, CB: 5 };
        const sw = { ...base };
        const available = Object.keys(base).filter(c => sp[c].length);

        // Missing starting categories redistribute 1/4 of their weight
        // to every available starting category, exactly as specified.
        Object.keys(base).forEach(c => {
            if (!sp[c].length && available.length) {
                const bonus = base[c] / 4;
                available.forEach(a => sw[a] += bonus);
            }
        });

        const candidates = [];
        available.forEach(c => candidates.push(["starter", c, sw[c]]));
        const bw = { N: 18, MID: 6, WING: 5, DEF: 3, CB: 1 };
        Object.keys(bw).forEach(c => {
            if (bp[c].length) candidates.push(["bench", c, bw[c]]);
        });
        candidates.push(["own", "OWN", 1]);

        // Never turn a Widzew goal into an opponent goal just because the
        // visual squad could not be parsed. Use the captured 20-player squad.
        const fallback = [...starters, ...bench].filter(p => category(p) !== "GK");
        if (!fallback.length) return { type: "widzew", name: "Zawodnik Widzewa", player: null };

        const total = candidates.reduce((sum, x) => sum + x[2], 0);
        let roll = Math.random() * total;
        for (const [side, cat, weight] of candidates) {
            roll -= weight;
            if (roll <= 0) {
                if (side === "own") return { type: "own", name: "Samobój", player: null };
                const pool = side === "starter" ? sp[cat] : bp[cat];
                if (pool.length) {
                    const player = pool[Math.floor(Math.random() * pool.length)];
                    return {
                        type: "widzew",
                        player,
                        name: `${player.row["Imię"]} ${player.row["Nazwisko"]}`.trim()
                    };
                }
            }
        }

        const player = fallback[Math.floor(Math.random() * fallback.length)];
        return {
            type: "widzew",
            player,
            name: `${player.row["Imię"]} ${player.row["Nazwisko"]}`.trim()
        };
    }

    function makeScorersUsing20(widzewGoals, opponentGoals) {
        const usedMinutes = new Set();
        const minute = () => {
            let m = 1 + Math.floor(Math.random() * 90);
            while (usedMinutes.has(m) && usedMinutes.size < 90) {
                m = 1 + Math.floor(Math.random() * 90);
            }
            usedMinutes.add(m);
            return m;
        };

        const scorers = [];
        for (let i = 0; i < Number(widzewGoals || 0); i++) {
            const s = chooseWeightedScorerFrom20();
            scorers.push({ minute: minute(), type: s.type, name: s.name, player: s.player || null });
        }
        for (let i = 0; i < Number(opponentGoals || 0); i++) {
            scorers.push({ minute: minute(), type: "opponent", name: "Przeciwnik", player: null });
        }
        return scorers.sort((a, b) => a.minute - b.minute);
    }

    // script.js uses this global generator for both playable and full-season modes.
    window.makeMatchScorers = makeScorersUsing20;

    function cloneMatch(match) {
        return {
            round: Number(match.round),
            opponent: match.opponent,
            home: !!match.home,
            gf: Number(match.gf),
            ga: Number(match.ga),
            scorers: Array.isArray(match.scorers) ? match.scorers.map(s => ({ ...s })) : []
        };
    }

    function prepareResults() {
        if (preparedResults) return preparedResults;
        const originalRenderFinalSeason = window.renderFinalSeason;
        try {
            window.renderFinalSeason = function () {};
            window.simulateWholeSeason();
            preparedResults = (seasonGameState.widzewResults || []).map(cloneMatch);
        } finally {
            window.renderFinalSeason = originalRenderFinalSeason;
        }
        seasonGameState.widzewResults = [];
        seasonGameState.scorers = {};
        return preparedResults;
    }

    function decorateVisibleScorers(match) {
        const container = document.querySelector(".round-match.widzew-match .match-scorers");
        if (!container || !match?.scorers) return;
        container.innerHTML = match.scorers
            .slice()
            .sort((a, b) => Number(a.minute || 0) - Number(b.minute || 0))
            .map(s => {
                const color = s.type === "opponent" ? "scorer-opponent" : "scorer-widzew";
                const name = s.type === "opponent" ? "Przeciwnik" : (s.type === "own" ? "Samobój" : s.name);
                return `<span class="${color}">${Math.max(1, Math.min(90, Number(s.minute) || 1))}' ${seasonSafe(name)}</span>`;
            }).join("");
    }

    function addStyles() {
        if (document.getElementById("seasonScorerFixStyles")) return;
        const style = document.createElement("style");
        style.id = "seasonScorerFixStyles";
        style.textContent = `
            .match-scorers{display:flex;flex-direction:column;align-items:center;gap:3px;margin-top:7px;font-size:13px;font-weight:800;line-height:1.25}
            .match-scorers .scorer-widzew{color:#39d353}
            .match-scorers .scorer-opponent{color:#ff4d4f}
        `;
        document.head.appendChild(style);
    }

    function revealCurrentRound() {
        const round = Number(seasonGameState.currentRound);
        if ((seasonGameState.widzewResults || []).some(m => Number(m.round) === round)) return;
        const match = prepareResults().find(m => Number(m.round) === round);
        if (!match) return;
        const revealed = cloneMatch(match);
        seasonGameState.widzewResults.push(revealed);
        updateTopScorersFromMatch(revealed);
        renderPlayableSeason();
        decorateVisibleScorers(revealed);
    }

    addStyles();

    const originalInitSeasonMode = window.initSeasonMode;
    if (typeof originalInitSeasonMode === "function") {
        window.initSeasonMode = async function (mode) {
            preparedResults = null;
            // New season = new captured squad only when the user has not yet
            // captured one from the current final-squad screen.
            if (!capturedSquad) capturedSquad = readFinalSquadFromDOM();
            return await originalInitSeasonMode.call(this, mode);
        };
    }

    window.simulateCurrentWidzewMatch = revealCurrentRound;

    document.addEventListener("click", function (event) {
        const button = event.target?.closest?.("#playMatchButton, #simulateMatchButton");
        if (!button) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (button.id === "simulateMatchButton") revealCurrentRound();
    }, true);
})();
