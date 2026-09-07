/* Widzew scorer draw mechanism.
   Stage 1: draw a position group using the requested weights.
   Stage 2: draw a player from that group, weighted by Overall rating. */
(function () {
    const STARTER_WEIGHTS = {
        N: 33,
        MID: 12,
        WING: 9,
        DEF: 7,
        CB: 5
    };

    const BENCH_WEIGHTS = {
        N: 18,
        MID: 6,
        WING: 5,
        DEF: 3,
        CB: 1
    };

    function normalizePosition(value) {
        return String(value || "")
            .toUpperCase()
            .replace(/\s+/g, "");
    }

    function getPositionGroup(player) {
        const position = normalizePosition(player?.position || player?.role);

        if (position === "N") return "N";
        if (position === "ŚO" || position === "SO") return "CB";
        if (position === "LO/PO" || position === "LOPO") return "DEF";
        if (position.includes("ŚPD") || position.includes("ŚP") || position.includes("OP")) return "MID";
        if (position.includes("LS") || position.includes("LP") || position.includes("PS") || position.includes("PP")) return "WING";

        return null;
    }

    function getOverall(player) {
        const raw = player?.stats?.["Ogólna"] ?? player?.row?.["Ogólna"] ?? player?.overall;
        const value = Number(String(raw ?? "").replace(",", "."));
        return Number.isFinite(value) && value > 0 ? value : 1;
    }

    function weightedPick(items) {
        const valid = items.filter(item => Number(item.weight) > 0);
        const total = valid.reduce((sum, item) => sum + Number(item.weight), 0);
        if (!total) return null;

        let roll = Math.random() * total;
        for (const item of valid) {
            roll -= Number(item.weight);
            if (roll < 0) return item;
        }

        return valid[valid.length - 1];
    }

    function getPlayerName(player) {
        const first = player?.first ?? player?.stats?.["Imię"] ?? player?.row?.["Imię"] ?? "";
        const last = player?.last ?? player?.stats?.["Nazwisko"] ?? player?.row?.["Nazwisko"] ?? "";
        return `${first} ${last}`.trim();
    }

    function getDatabasePlayers() {
        const db = typeof window.getWidzewSeasonPlayerDB === "function"
            ? window.getWidzewSeasonPlayerDB()
            : window.widzewSeasonPlayerDB;

        if (!db || !Array.isArray(db.players)) {
            throw new Error("Tymczasowa baza zawodników Widzewa nie została jeszcze utworzona.");
        }

        return db.players.filter(player => player && player.found !== false);
    }

    function buildGroups(players) {
        const groups = {
            starter: { N: [], MID: [], WING: [], DEF: [], CB: [] },
            bench: { N: [], MID: [], WING: [], DEF: [], CB: [] }
        };

        players.forEach(player => {
            const group = getPositionGroup(player);
            if (!group) return;

            const slot = player.slot === "starter" ? "starter" : "bench";
            groups[slot][group].push(player);
        });

        return groups;
    }

    function buildStarterWeights(groups) {
        const weights = { ...STARTER_WEIGHTS };
        const available = Object.keys(STARTER_WEIGHTS).filter(group => groups.starter[group].length > 0);
        const missing = Object.keys(STARTER_WEIGHTS).filter(group => groups.starter[group].length === 0);

        // For every missing starter position, its original weight is divided by 4
        // and that quarter is added to every remaining starter position.
        missing.forEach(group => {
            const redistributed = STARTER_WEIGHTS[group] / 4;
            available.forEach(target => {
                weights[target] += redistributed;
            });
            weights[group] = 0;
        });

        return weights;
    }

    function drawWidzewScorer() {
        const players = getDatabasePlayers();
        const groups = buildGroups(players);
        const starterWeights = buildStarterWeights(groups);

        const firstStage = [];

        Object.keys(STARTER_WEIGHTS).forEach(group => {
            if (groups.starter[group].length > 0 && starterWeights[group] > 0) {
                firstStage.push({
                    key: `starter-${group}`,
                    slot: "starter",
                    group,
                    weight: starterWeights[group]
                });
            }
        });

        Object.keys(BENCH_WEIGHTS).forEach(group => {
            if (groups.bench[group].length > 0 && BENCH_WEIGHTS[group] > 0) {
                firstStage.push({
                    key: `bench-${group}`,
                    slot: "bench",
                    group,
                    weight: BENCH_WEIGHTS[group]
                });
            }
        });

        // Own goal is always a possible result and has a fixed 1% weight.
        firstStage.push({
            key: "own-goal",
            slot: "own",
            group: "OWN",
            weight: 1
        });

        const selectedGroup = weightedPick(firstStage);
        if (!selectedGroup) {
            throw new Error("Nie udało się utworzyć puli losowania strzelca Widzewa.");
        }

        const firstStageTotal = firstStage.reduce((sum, item) => sum + item.weight, 0);
        const groupProbability = selectedGroup.weight / firstStageTotal;

        if (selectedGroup.slot === "own") {
            return {
                type: "own-goal",
                name: "Samobój",
                player: null,
                group: "OWN",
                slot: "own",
                groupWeight: selectedGroup.weight,
                groupProbability
            };
        }

        const playerPool = groups[selectedGroup.slot][selectedGroup.group];
        const secondStage = playerPool.map(player => ({
            player,
            weight: getOverall(player)
        }));
        const selectedPlayer = weightedPick(secondStage);
        if (!selectedPlayer) {
            throw new Error("Nie udało się wylosować zawodnika z wybranej grupy.");
        }

        const secondStageTotal = secondStage.reduce((sum, item) => sum + item.weight, 0);
        const playerProbability = selectedPlayer.weight / secondStageTotal;

        return {
            type: "widzew",
            name: getPlayerName(selectedPlayer.player),
            player: selectedPlayer.player,
            slot: selectedGroup.slot,
            group: selectedGroup.group,
            groupWeight: selectedGroup.weight,
            groupProbability,
            overall: getOverall(selectedPlayer.player),
            playerWeight: selectedPlayer.weight,
            playerProbability
        };
    }

    // Public API for the next season-simulation step.
    window.drawWidzewScorer = drawWidzewScorer;
    window.losujStrzelcaWidzewa = drawWidzewScorer;
})();
