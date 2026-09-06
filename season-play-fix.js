/* Fix: manual season match simulation.
   The original play-mode handler closes over a local goal generator in script.js.
   We intercept only the two manual-match buttons and use the same season state,
   scorer logic and renderer, with an explicit home/away result contract. */
(function () {
    function teamName(value) {
        return typeof seasonTeamName === "function" ? seasonTeamName(value) : String(value || "").trim();
    }

    function num(value, fallback) {
        const n = Number(String(value ?? "").replace(",", "."));
        return Number.isFinite(n) ? n : fallback;
    }

    function poisson(lambda) {
        const L = Math.max(0.15, Math.min(3.2, lambda));
        const threshold = Math.exp(-L);
        let p = 1;
        let k = 0;
        do {
            k++;
            p *= Math.random();
        } while (p > threshold && k < 8);
        return Math.max(0, Math.min(6, k - 1));
    }

    function simulateManualResult(fixture) {
        const home = teamName(fixture.gospodarz) === "Widzew Łódź";
        const opponent = home ? teamName(fixture.gosc) : teamName(fixture.gospodarz);
        const row = (seasonGameState.teams || []).find(t =>
            teamName(t["drużyna"] || t["druzyna"] || t["Drużyna"]) === opponent
        );
        const opponentOverall = row ? num(row["Ogólna"], 65) : 65;
        const widzewOverall = num(window.__widzewSeasonOverall, 65);
        const diff = Math.max(-20, Math.min(20, widzewOverall - opponentOverall));

        const widzewLambda = Math.max(0.45, Math.min(2.35,
            1.25 + diff * 0.025 + (home ? 0.15 : -0.10)
        ));
        const opponentLambda = Math.max(0.45, Math.min(2.35,
            1.25 - diff * 0.025 + (home ? -0.10 : 0.15)
        ));

        const wg = poisson(widzewLambda);
        const og = poisson(opponentLambda);
        return {
            home,
            opponent,
            gf: home ? wg : og,
            ga: home ? og : wg
        };
    }

    function simulateManualMatch() {
        const fixture = getWidzewFixture(seasonGameState.currentRound);
        if (!fixture) return;
        if ((seasonGameState.widzewResults || []).some(x => Number(x.round) === Number(seasonGameState.currentRound))) return;

        const result = simulateManualResult(fixture);
        const match = {
            round: Number(seasonGameState.currentRound),
            opponent: result.opponent,
            home: result.home,
            gf: Number(result.gf),
            ga: Number(result.ga),
            scorers: typeof makeMatchScorers === "function" ? makeMatchScorers(result.gf, result.ga) : []
        };

        seasonGameState.widzewResults.push(match);
        if (typeof updateTopScorersFromMatch === "function") updateTopScorersFromMatch(match);
        if (typeof renderPlayableSeason === "function") renderPlayableSeason();
    }

    document.addEventListener("click", function (event) {
        const button = event.target && event.target.closest
            ? event.target.closest("#playMatchButton, #simulateMatchButton")
            : null;
        if (!button) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        simulateManualMatch();
    }, true);
})();
