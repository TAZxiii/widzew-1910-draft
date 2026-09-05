document.addEventListener("DOMContentLoaded", () => {
    const startScreen = document.querySelector(".start-screen");
    const modeScreen = document.getElementById("modeScreen");
    const coachScreen = document.getElementById("coachScreen");
    const playerScreen = document.getElementById("playerScreen");
    const difficultyScreen = document.getElementById("difficultyScreen");
    const draftScreen = document.getElementById("draftScreen");

    let trainerRows = [];
    let selectedTrainer = null;
    let selectedFormation = null;
    let selectedFormationRow = null;
    let formationRows = [];
    let selectedDifficulty = null;
    let playerDatabase = {
        br: [],
        loPo: [],
        so: [],
        pomoc: [],
        skrzydlowi: [],
        napastnicy: []
    };

    function showScreen(screen) {
        [startScreen, modeScreen, coachScreen, playerScreen, difficultyScreen, draftScreen]
            .forEach(s => {
                if (s) s.classList.add("hidden");
            });

        if (screen) screen.classList.remove("hidden");
        window.scrollTo(0, 0);
    }

    function parseCSV(text) {
        const clean = text.replace(/^\uFEFF/, "").trim();
        if (!clean) return [];

        const lines = clean.split(/\r?\n/);
        const headers = lines.shift().split(";").map(h => h.trim());

        return lines.filter(line => line.trim()).map(line => {
            const values = line.split(";");
            return Object.fromEntries(
                headers.map((header, i) => [header, (values[i] || "").trim()])
            );
        });
    }

    async function getCSV(path) {
        const response = await fetch(`${path}?v=${Date.now()}`, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`${path}: HTTP ${response.status}`);
        }

        return parseCSV(await response.text());
    }

    // START
    document.getElementById("startGame").addEventListener("click", () => {
        showScreen(modeScreen);
    });

    // MODE: TRAINER
    document.getElementById("coachMode").addEventListener("click", () => {
        showScreen(coachScreen);
        loadTrainerDatabase();
    });

    // MODE: PLAYER
    document.getElementById("playerMode").addEventListener("click", () => {
        showScreen(playerScreen);
        loadFormationDatabase();
    });

    // HOW TO PLAY
    const modal = document.getElementById("howToPlayModal");
    document.getElementById("howToPlay").addEventListener("click", () => {
        modal.classList.remove("hidden");
    });
    document.getElementById("closeModal").addEventListener("click", () => {
        modal.classList.add("hidden");
    });
    document.getElementById("modalOk").addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    // TRAINER DATABASE
    async function loadTrainerDatabase() {
        const status = document.getElementById("coachStatus");
        const grid = document.getElementById("coachGrid");

        status.textContent = "Wczytywanie bazy trenerów...";
        status.classList.remove("error");

        try {
            trainerRows = await getCSV("data/trener.csv");

            if (!trainerRows.length) {
                throw new Error("Pusta baza trenerów.");
            }

            status.textContent =
                ``;

            renderCoaches();
        } catch (error) {
            status.textContent =
                "Nie udało się wczytać bazy trenerów.";
            status.classList.add("error");
            grid.innerHTML = "";
            console.error(error);
        }
    }

    function getUniqueCoaches() {
        const map = new Map();

        trainerRows.forEach(row => {
            const key = `${row["Imię"]}|${row["Nazwisko"]}`;

            if (!map.has(key)) {
                map.set(key, {
                    first: row["Imię"],
                    last: row["Nazwisko"],
                    seasons: []
                });
            }

            map.get(key).seasons.push(row);
        });

        return [...map.values()];
    }

    function renderCoaches() {
        const grid = document.getElementById("coachGrid");
        const coaches = getUniqueCoaches();

        grid.innerHTML = coaches.map((coach, i) => `
            <button class="coach-card" data-index="${i}">
                <span class="coach-first">${coach.first}</span>
                <span class="coach-last">${coach.last}</span>
            </button>
        `).join("");

        grid.querySelectorAll(".coach-card").forEach(card => {
            card.addEventListener("click", () => {
                const coach = coaches[Number(card.dataset.index)];

                // Multiple seasons = random season.
                const season =
                    coach.seasons[Math.floor(Math.random() * coach.seasons.length)];

                selectedTrainer = {
                    first: coach.first,
                    last: coach.last,
                    season: season["Sezon"],
                    formation: season["Taktyka"]
                };

                showSelectedTrainer();

            });
        });
    }


    function showSelectedTrainer() {
        const content = coachScreen.querySelector(".coach-content");

        content.innerHTML = `
            <h2>WYBRANY TRENER</h2>
            <div class="trainer-summary">
                <div class="trainer-name">
                    <span>${selectedTrainer.first}</span>
                    <span>${selectedTrainer.last}</span>
                </div>
                <div class="trainer-details">
                    <div>
                        <span>SEZON</span>
                        <strong>${selectedTrainer.season}</strong>
                    </div>
                    <div>
                        <span>FORMACJA</span>
                        <strong>${selectedTrainer.formation}</strong>
                    </div>
                </div>
            </div>
            <button id="trainerContinue" class="next-button">DALEJ</button>
        `;

        document.getElementById("trainerContinue").addEventListener("click", () => {
            showDifficultyScreen(
                `Wybrany trener: <strong>${selectedTrainer.first} ${selectedTrainer.last}</strong><br>
                 Sezon: ${selectedTrainer.season} · Formacja: ${selectedTrainer.formation}`
            );
        });
    }

    // FORMATIONS DATABASE
    async function loadFormationDatabase() {
        const content = playerScreen.querySelector(".player-content");

        content.innerHTML = `
            <h2>WYBIERZ FORMACJĘ</h2>
            <p class="screen-intro">
                Wybierz jedną z pięciu losowo wylosowanych formacji.
            </p>
            <div id="formationStatus" class="formation-status">
                Wczytywanie bazy formacji...
            </div>
            <div id="formationGrid" class="formation-grid"></div>
        `;

        try {
            const rows = await getCSV("data/formacje.csv");
            formationRows = rows;

            if (rows.length < 5) {
                throw new Error(`Znaleziono tylko ${rows.length} formacji.`);
            }

            const selected = [...rows]
                .sort(() => Math.random() - 0.5)
                .slice(0, 5);

            const status = document.getElementById("formationStatus");
            const grid = document.getElementById("formationGrid");

            status.textContent =
                "Wybierz formację, w której chcesz zbudować swój skład.";

            grid.innerHTML = selected.map((formation, i) => `
                <button class="formation-card" data-index="${i}">
                    <span class="formation-name">${formation["Formacje"]}</span>
                </button>
            `).join("");

            grid.querySelectorAll(".formation-card").forEach(card => {
                card.addEventListener("click", () => {
                    selectedFormationRow = selected[Number(card.dataset.index)];
                    selectedFormation = selectedFormationRow["Formacje"];

                    grid.querySelectorAll(".formation-card").forEach(c =>
                        c.classList.remove("selected")
                    );
                    card.classList.add("selected");

                    status.textContent =
                        `Wybrano formację: ${selectedFormation}`;

                    let button = document.getElementById("formationContinue");

                    if (!button) {
                        button = document.createElement("button");
                        button.id = "formationContinue";
                        button.className = "next-button formation-continue";
                        button.textContent = "DALEJ";
                        content.appendChild(button);

                        button.addEventListener("click", () => {
                            showDifficultyScreen(
                                `Wybrana formacja: <strong>${selectedFormation}</strong>`
                            );
                        });
                    }
                });
            });
        } catch (error) {
            const status = document.getElementById("formationStatus");
            status.textContent =
                "Nie udało się wczytać bazy formacji. Sprawdź folder data.";
            status.classList.add("error");
            console.error(error);
        }
    }

    // DEDICATED DIFFICULTY SCREEN
    function showDifficultyScreen(context) {
        selectedDifficulty = null;

        const contextElement = document.getElementById("difficultyContext");
        const selection = document.getElementById("difficultySelection");
        const continueButton = document.getElementById("difficultyContinue");

        contextElement.innerHTML = context;
        selection.textContent = "Wybierz poziom trudności.";
        continueButton.disabled = true;

        document.querySelectorAll(".difficulty-card").forEach(card => {
            card.classList.remove("selected");
        });

        showScreen(difficultyScreen);
    }

    document.querySelectorAll(".difficulty-card").forEach(card => {
        card.addEventListener("click", () => {
            selectedDifficulty = card.dataset.difficulty;

            document.querySelectorAll(".difficulty-card").forEach(c =>
                c.classList.remove("selected")
            );
            card.classList.add("selected");

            document.getElementById("difficultySelection").textContent =
                selectedDifficulty === "easy"
                    ? "Wybrano tryb ŁATWY — oceny zawodników będą widoczne."
                    : "Wybrano tryb TRUDNY — oceny zawodników będą ukryte.";

            document.getElementById("difficultyContinue").disabled = false;
        });
    });

    async function loadPlayerDatabase() {
        const files = {
            br: "data/br.csv",
            loPo: "data/lo-po.csv",
            so: "data/so.csv",
            pomoc: "data/pomoc.csv",
            skrzydlowi: "data/skrzydlowi.csv",
            napastnicy: "data/napastnicy.csv"
        };

        const entries = Object.entries(files);
        const loaded = await Promise.all(entries.map(async ([key, path]) => {
            const rows = await getCSV(path);
            return [key, rows];
        }));

        playerDatabase = Object.fromEntries(loaded);
        return playerDatabase;
    }

    // =========================
    // WŁAŚCIWY DRAFT
    // =========================
    let draft = {
        mode: null,
        formation: null,
        difficulty: null,
        available: [],
        selected: [],
        stage: "starting",
        positionIndex: 0,
        positions: [],
        candidates: [],
        bench: [],
        benchIndex: 0
    };

    const positionLabels = {
        br: "BR",
        loPo: "LO/PO",
        so: "ŚO",
        pomoc: "ŚPD/ŚP/OP",
        skrzydlowi: "LS/LP/PS/PP",
        napastnicy: "N"
    };

    function playerKey(row) {
        return `${row["Imię"]}|${row["Nazwisko"]}`.trim().toLowerCase();
    }

    function allPlayerRows() {
        return Object.values(playerDatabase).flat();
    }

    function createPositionSequence() {
        const f = draft.formation;
        const result = [];

        const add = (key, count) => {
            for (let i = 0; i < Number(count || 0); i++) result.push(key);
        };

        add("br", f["BR"]);
        add("loPo", f["LO/PO"]);
        add("so", f["ŚO"]);
        add("pomoc", f["ŚPD/śP/OP"]);
        add("skrzydlowi", f["LS/SP/PS/PP"]);
        add("napastnicy", f["N"]);

        return result;
    }

    function uniqueAvailablePlayers(rows) {
        const map = new Map();
        rows.forEach(row => {
            const key = playerKey(row);
            if (!draft.available.includes(key)) return;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(row);
        });
        return [...map.entries()];
    }

    function randomFiveForPosition(positionKey) {
        let rows;

        if (positionKey === "loPo") rows = playerDatabase.loPo;
        else if (positionKey === "so") rows = playerDatabase.so;
        else if (positionKey === "pomoc") rows = playerDatabase.pomoc;
        else if (positionKey === "skrzydlowi") rows = playerDatabase.skrzydlowi;
        else if (positionKey === "br") rows = playerDatabase.br;
        else rows = playerDatabase.napastnicy;

        const unique = uniqueAvailablePlayers(rows);
        const shuffled = unique.sort(() => Math.random() - 0.5).slice(0, 5);

        return shuffled.map(([key, records]) => {
            // Season is selected only after the player identity has been drawn.
            const record = records[Math.floor(Math.random() * records.length)];
            return { key, row: record };
        });
    }

    function randomFiveForBench(type) {
        let rows = [];
        if (type === "def") rows = [...playerDatabase.loPo, ...playerDatabase.so];
        if (type === "mid") rows = [...playerDatabase.pomoc, ...playerDatabase.skrzydlowi];
        if (type === "br") rows = playerDatabase.br;
        if (type === "n") rows = playerDatabase.napastnicy;

        const unique = uniqueAvailablePlayers(rows);
        return unique.sort(() => Math.random() - 0.5).slice(0, 5).map(([key, records]) => ({
            key,
            row: records[Math.floor(Math.random() * records.length)]
        }));
    }

    function displayName(row) {
        return `<span>${row["Imię"]}</span><span>${row["Nazwisko"]}</span>`;
    }

    function displayCandidate(card, index) {
        const row = card.row;
        const rating = row["Ogólna"];
        const value = row["Wartość"];

        return `
            <button class="candidate-card" data-index="${index}">
                <div class="candidate-number">${index + 1}</div>
                <div class="candidate-name">${displayName(row)}</div>
                <div class="candidate-season">${row["Sezon"]}</div>
                ${draft.difficulty === "easy"
                    ? `<div class="candidate-rating">${rating}</div>`
                    : ""}
                <div class="candidate-value">${value} tys. €</div>
            </button>
        `;
    }

    async function startDraft() {
        draft.mode = selectedTrainer ? "trainer" : "player";
        if (selectedTrainer && !formationRows.length) {
            formationRows = await getCSV("data/formacje.csv");
        }
        draft.formation = selectedTrainer
            ? (formationRows.find(row => row["Formacje"] === selectedTrainer.formation) || findFormationByName(selectedTrainer.formation))
            : (selectedFormationRow || findFormationByName(selectedFormation));
        draft.difficulty = selectedDifficulty;
        draft.available = [...new Set(allPlayerRows().map(playerKey))];
        draft.selected = [];
        draft.positions = createPositionSequence();
        draft.positionIndex = 0;
        draft.stage = "starting";
        draft.bench = [];
        draft.benchIndex = 0;

        showScreen(draftScreen);
        renderDraftPosition();
    }

    function findFormationByName(name) {
        // Formation counts are already represented by the currently selected row
        // when the player chose it. For trainer mode, load the row matching the
        // selected formation from the database.
        return { "Formacje": name, "BR": 1, "LO/PO": 2, "ŚO": 2, "ŚPD/śP/OP": 3, "LS/SP/PS/PP": 2, "N": 1 };
    }

    // Keep exact formation row selected by player, including its position counts.
    const originalLoadFormationDatabase = loadFormationDatabase;

    function renderDraftPosition() {
        const header = document.getElementById("draftHeader");
        const progress = document.getElementById("draftProgress");
        const position = document.getElementById("draftPosition");
        const instruction = document.getElementById("draftInstruction");
        const grid = document.getElementById("candidateGrid");
        const action = document.getElementById("draftAction");

        header.innerHTML = `<span>WIDZEW 1910 DRAFT</span><strong>${draft.formation["Formacje"]}</strong>`;
        progress.textContent = `Jedenastka: ${draft.selected.length}/11`;

        const key = draft.positions[draft.positionIndex];
        const occurrence = draft.positions.slice(0, draft.positionIndex + 1)
            .filter(x => x === key).length;
        const total = draft.positions.filter(x => x === key).length;

        position.textContent = `WYBIERZ ${positionLabels[key]}${total > 1 ? ` · ${occurrence}/${total}` : ""}`;
        instruction.textContent = "Wybierz 1 z 5 wylosowanych zawodników.";
        action.innerHTML = "";

        draft.candidates = randomFiveForPosition(key);
        grid.innerHTML = draft.candidates.map(displayCandidate).join("");

        grid.querySelectorAll(".candidate-card").forEach(card => {
            card.addEventListener("click", () => selectStartingPlayer(Number(card.dataset.index)));
        });
    }

    function selectStartingPlayer(index) {
        const candidate = draft.candidates[index];
        if (!candidate) return;

        draft.selected.push({ ...candidate, role: draft.positions[draft.positionIndex] });
        draft.available = draft.available.filter(key => key !== candidate.key);
        draft.positionIndex++;

        if (draft.positionIndex >= draft.positions.length) {
            startBenchDraft();
        } else {
            renderDraftPosition();
        }
    }

    function startBenchDraft() {
        draft.stage = "bench";
        draft.bench = ["br", "def", "def", "def", "mid", "mid", "mid", "n", "n"];
        draft.benchIndex = 0;
        renderBenchPosition();
    }

    function renderBenchPosition() {
        const labels = { br: "BR", def: "OBROŃCA", mid: "POMOCNIK / SKRZYDŁOWY", n: "N" };
        const type = draft.bench[draft.benchIndex];
        const grid = document.getElementById("candidateGrid");
        const position = document.getElementById("draftPosition");
        const instruction = document.getElementById("draftInstruction");
        const progress = document.getElementById("draftProgress");
        const header = document.getElementById("draftHeader");
        const action = document.getElementById("draftAction");

        header.innerHTML = `<span>WIDZEW 1910 DRAFT</span><strong>${draft.formation["Formacje"]}</strong>`;
        progress.textContent = `Ławka: ${draft.benchIndex}/9 · Cały skład: ${draft.selected.length}/20`;
        position.textContent = `WYBIERZ ${labels[type]}`;
        instruction.textContent = "Wybierz 1 z 5 wylosowanych zawodników.";
        action.innerHTML = "";

        draft.candidates = randomFiveForBench(type);
        grid.innerHTML = draft.candidates.map(displayCandidate).join("");
        grid.querySelectorAll(".candidate-card").forEach(card => {
            card.addEventListener("click", () => selectBenchPlayer(Number(card.dataset.index)));
        });
    }

    function selectBenchPlayer(index) {
        const candidate = draft.candidates[index];
        if (!candidate) return;

        draft.selected.push({ ...candidate, role: `bench-${draft.bench[draft.benchIndex]}` });
        draft.available = draft.available.filter(key => key !== candidate.key);
        draft.benchIndex++;

        if (draft.benchIndex >= draft.bench.length) {
            finishDraft();
        } else {
            renderBenchPosition();
        }
    }

    function finishDraft() {
        const grid = document.getElementById("candidateGrid");
        const position = document.getElementById("draftPosition");
        const instruction = document.getElementById("draftInstruction");
        const progress = document.getElementById("draftProgress");
        const action = document.getElementById("draftAction");

        position.textContent = "SKŁAD GOTOWY";
        instruction.textContent = "Wybrano 20 zawodników. W kolejnym etapie dodamy podsumowanie i ocenę zespołu.";
        progress.textContent = "Cały skład: 20/20";
        grid.innerHTML = draft.selected.map((p, i) => `
            <div class="selected-mini-card">
                <span>${i + 1}</span>
                <strong>${p.row["Imię"]} ${p.row["Nazwisko"]}</strong>
                <small>${p.row["Sezon"]}${draft.difficulty === "easy" ? ` · ${p.row["Ogólna"]}` : ""}</small>
            </div>
        `).join("");
        action.innerHTML = `<div class="draft-finished">DRAFT ZAKOŃCZONY</div>`;
    }

    document.getElementById("difficultyContinue").addEventListener("click", async () => {
        const button = document.getElementById("difficultyContinue");
        button.disabled = true;
        button.textContent = "WCZYTYWANIE BAZY...";
        try {
            await loadPlayerDatabase();
            await startDraft();
        } catch (error) {
            console.error(error);
            alert("Nie udało się wczytać bazy zawodników. Sprawdź folder data.");
        } finally {
            button.disabled = false;
            button.textContent = "ROZPOCZNIJ DRAFT";
        }
    });


});
