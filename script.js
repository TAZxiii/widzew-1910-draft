document.addEventListener("DOMContentLoaded", () => {


function positionColorClass(position, role) {
    const r = String(role || "");
    const p = String(position || "").toUpperCase().replace(/\s/g, "");

    // Dla zawodników z ławki kolor wynika z ich rzeczywistej pozycji,
    // a nie tylko z ogólnej kategorii miejsca na ławce.
    if (r.startsWith("bench-")) {
        if (p === "BR") return "position-gk";
        if (p === "LO/PO" || p === "LOPO") return "position-fullback";
        if (p === "ŚO" || p === "SO") return "position-cb";
        if (p.includes("ŚPD") || p.includes("ŚP") || p.includes("OP")) return "position-mid";
        if (p.includes("LS") || p.includes("LP") || p.includes("PS") || p.includes("PP")) return "position-wing";
        if (p === "N") return "position-n";
    }

    if (r === "br") return "position-gk";
    if (r === "loPo") return "position-fullback";
    if (r === "so") return "position-cb";
    if (r === "pomoc") return "position-mid";
    if (r === "skrzydlowi") return "position-wing";
    if (r === "napastnicy") return "position-n";

    if (p === "BR") return "position-gk";
    if (p === "LO/PO" || p === "LOPO") return "position-fullback";
    if (p === "ŚO" || p === "SO") return "position-cb";
    if (p.includes("ŚPD") || p.includes("ŚP") || p.includes("OP")) return "position-mid";
    if (p.includes("LS") || p.includes("LP") || p.includes("PS") || p.includes("PP")) return "position-wing";
    if (p === "N") return "position-n";
    return "";
}

function calculateTotalSquadValue(players) {
    return players.reduce((sum, player) => {
        const value = parseFloat(
            String((player.row && player.row["Wartość"]) || player["Wartość"] || "0")
                .replace(/\s/g, "")
                .replace(",", ".")
        );
        return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
}

function formatSquadValue(value) {
    return new Intl.NumberFormat("pl-PL", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value / 1000) + " mln €";
}

    const startScreen = document.querySelector(".start-screen");
    const modeScreen = document.getElementById("modeScreen");
    const coachScreen = document.getElementById("coachScreen");
    const playerScreen = document.getElementById("playerScreen");
    const playerNameScreen = document.getElementById("playerNameScreen");
    const difficultyScreen = document.getElementById("difficultyScreen");
    const draftScreen = document.getElementById("draftScreen");
    const seasonScreen = document.getElementById("seasonScreen");

    let trainerRows = [];
    let selectedTrainer = null;
    let selectedFormation = null;
    let selectedFormationRow = null;
    let formationRows = [];
    let selectedDifficulty = null;
    let playerName = "";
    let playerDatabase = {
        br: [],
        loPo: [],
        so: [],
        pomoc: [],
        skrzydlowi: [],
        napastnicy: []
    };

    function showScreen(screen) {
        [startScreen, modeScreen, coachScreen, playerScreen, difficultyScreen, draftScreen, seasonScreen]
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
        showPlayerNameScreen();
    });

    function showPlayerNameScreen() {
        showScreen(playerScreen);

        const content = playerScreen.querySelector(".player-content");
        content.innerHTML = `
            <h2>JAK MAMY CIĘ NAZWAĆ?</h2>
            <p class="screen-intro">
                Wpisz swoje imię i nazwisko albo nazwę, pod którą chcesz poprowadzić Widzew.
            </p>

            <div class="player-name-form">
                <input id="playerNameInput" class="player-name-input" type="text"
                       maxlength="30" autocomplete="off"
                       placeholder="Imię, nazwisko lub nazwa gracza">
                <button id="playerNameConfirm" class="next-button" type="button">POTWIERDŹ</button>
            </div>

            <div id="playerNameMessage" class="player-name-message hidden"></div>
            <button id="playerNameContinue" class="next-button hidden" type="button">DALEJ</button>
        `;

        const input = document.getElementById("playerNameInput");
        const confirm = document.getElementById("playerNameConfirm");
        const message = document.getElementById("playerNameMessage");
        const continueButton = document.getElementById("playerNameContinue");

        const confirmName = () => {
            const value = input.value.trim();
            if (!value) {
                input.focus();
                message.textContent = "Najpierw wpisz swoją nazwę.";
                message.classList.remove("hidden");
                message.classList.add("error");
                return;
            }

            playerName = value;
            input.disabled = true;
            confirm.classList.add("hidden");
            message.classList.remove("hidden", "error");
            message.innerHTML =
                "Mówią, że trzeba lata doświadczeń i kurs UEFA PRO, aby prowadzić zespół w PKO Ekstraklasie. Tobie wystarczyło tylko szczęście...";
            continueButton.classList.remove("hidden");
        };

        confirm.addEventListener("click", confirmName);
        input.addEventListener("keydown", event => {
            if (event.key === "Enter") confirmName();
        });

        continueButton.addEventListener("click", () => {
            loadFormationDatabase();
        });

        setTimeout(() => input.focus(), 0);
    }

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
        playerName: "",
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


    // Indywidualny układ pozycji dla każdej z 12 formacji.
    // x/y są procentami szerokości/wysokości boiska; y rośnie w dół (nasza bramka jest na dole).
    const FORMATION_LAYOUTS = {
        "3-1-4-2": [["br",50,90],["so",27,74],["so",50,74],["so",73,74],["skrzydlowi",12,47],["pomoc",50,54],["pomoc",36,45],["pomoc",64,45],["skrzydlowi",88,47],["napastnicy",38,25],["napastnicy",62,25]],
        "3-4-1-2": [
            ["br",50,90],
            ["so",27,74],["so",50,74],["so",73,74],
            ["skrzydlowi",8,50],["pomoc",35,50],["pomoc",65,50],["skrzydlowi",92,50],
            ["pomoc",50,38],
            ["napastnicy",35,25],["napastnicy",65,25]
        ],
        "3-4-2-1": [
            ["br",50,90],
            ["so",27,74],["so",50,74],["so",73,74],
            ["skrzydlowi",8,50],["pomoc",35,50],["pomoc",65,50],["skrzydlowi",92,50],
            ["skrzydlowi",25,27],["skrzydlowi",75,27],["napastnicy",50,14]
        ],
        "3-4-3": [
            ["br",50,90],
            ["so",27,74],["so",50,74],["so",73,74],
            ["skrzydlowi",8,47],["pomoc",32,50],["pomoc",68,50],["pomoc",50,50],["skrzydlowi",92,47],
            ["skrzydlowi",14,27],["skrzydlowi",86,27],["napastnicy",50,15]
        ],
        "4-1-4-1": [
            ["br",50,90],
            ["loPo",9,74],["so",36,74],["so",64,74],["loPo",91,74],
            ["skrzydlowi",9,43],["pomoc",50,57],["pomoc",35,43],["pomoc",65,43],["skrzydlowi",91,43],
            ["napastnicy",50,15]
        ],
        "4-1-3-2": [["br",50,90],["loPo",10,72],["so",36,74],["so",64,74],["loPo",90,72],["pomoc",34,45],["pomoc",50,54],["pomoc",50,42],["pomoc",66,45],["napastnicy",37,25],["napastnicy",63,25]],
        "4-2-1-3": [["br",50,90],["loPo",10,72],["so",36,74],["so",64,74],["loPo",90,72],["pomoc",35,50],["pomoc",65,50],["pomoc",50,44],["napastnicy",22,25],["napastnicy",78,25],["napastnicy",50,17]],
        "4-3-3": [
            ["br",50,90],
            ["loPo",9,74],["so",36,74],["so",64,74],["loPo",91,74],
            ["pomoc",33,50],["pomoc",67,50],["pomoc",50,50],
            ["skrzydlowi",14,27],["skrzydlowi",86,27],["napastnicy",50,15]
        ],
        "4-4-1-1": [["br",50,90],["loPo",10,72],["so",36,74],["so",64,74],["loPo",90,72],["skrzydlowi",12,47],["pomoc",36,50],["pomoc",64,50],["pomoc",50,39],["skrzydlowi",88,47],["napastnicy",50,25]],
        "4-4-2": [
            ["br",50,90],
            ["loPo",9,74],["so",36,74],["so",64,74],["loPo",91,74],
            ["skrzydlowi",9,50],["pomoc",35,50],["pomoc",65,50],["skrzydlowi",91,50],
            ["napastnicy",35,25],["napastnicy",65,25]
        ],
        "5-4-1": [
            ["br",50,90],
            ["loPo",7,69],["so",29,74],["so",50,74],["so",71,74],["loPo",93,69],
            ["skrzydlowi",8,44],["pomoc",35,50],["pomoc",65,50],["skrzydlowi",92,44],
            ["napastnicy",50,15]
        ],
        "5-3-2": [["br",50,90],["loPo",12,69],["so",34,75],["so",50,77],["so",66,75],["loPo",88,69],["pomoc",37,50],["pomoc",50,50],["pomoc",63,50],["napastnicy",37,25],["napastnicy",63,25]]
    };

    function actualBenchPosition(p) {
        if (!String(p.role || "").startsWith("bench-")) return p.position || p.row?.["Pozycja"] || "";
        const key = p.key || playerKey(p.row);
        const hasPlayer = (arr) => Array.isArray(arr) && arr.some(row => playerKey(row) === key);
        if (p.role === "bench-br") return "BR";
        if (p.role === "bench-def") return hasPlayer(playerDatabase.loPo) ? "LO/PO" : (hasPlayer(playerDatabase.so) ? "ŚO" : "LO/PO");
        if (p.role === "bench-mid") return hasPlayer(playerDatabase.skrzydlowi) ? "LP/LS/PP/PS" : (hasPlayer(playerDatabase.pomoc) ? "ŚPD/ŚP/OP" : "LP/LS/PP/PS");
        if (p.role === "bench-n") return "N";
        return p.position || p.row?.["Pozycja"] || "";
    }

    function pitchCoordinates(formationName, role, occurrence) {
        const layout = FORMATION_LAYOUTS[String(formationName || "").trim()] || [];
        const matches = layout.filter(item => item[0] === role);
        const point = matches[occurrence - 1] || matches[0];
        return point ? { x: point[1], y: point[2] } : null;
    }

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
            for (let i = 0; i < Number(String(count ?? "0").replace(",", ".")); i++) result.push(key);
        };

        add("br", f["BR"]);
        add("loPo", f["LO/PO"]);
        add("so", f["ŚO"]);
        add("pomoc", f["ŚPD/śP/OP"]);
        add("skrzydlowi", f["LS/LP/PS/PP"] || f["LS/SP/PS/PP"]);
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
                ${draft.difficulty === "easy" ? `<div class="candidate-value">${value} tys. €</div>` : ""}
            </button>
        `;
    }

    async function startDraft() {
        draft.mode = selectedTrainer ? "trainer" : "player";
        if (selectedTrainer) {
            draft.gameSeason = selectedTrainer.season || selectedTrainer.Sezon ||
                selectedTrainer.seasonName || selectedTrainer["Sezon"] || null;
        } else {
            draft.gameSeason = "22/23";
        }
        if (selectedTrainer && !formationRows.length) {
            formationRows = await getCSV("data/formacje.csv");
        }
        draft.formation = selectedTrainer
            ? (formationRows.find(row => row["Formacje"] === selectedTrainer.formation) || findFormationByName(selectedTrainer.formation))
            : (selectedFormationRow || findFormationByName(selectedFormation));

        if (!draft.formation) {
            throw new Error("Nie znaleziono wybranej formacji w bazie formacje.csv.");
        }
        draft.difficulty = selectedDifficulty;
        draft.playerName = playerName;
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
        const wanted = String(name || "").trim();
        const found = formationRows.find(row => String(row["Formacje"] || "").trim() === wanted);
        if (found) return found;
        return null;
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

        header.innerHTML = `<span><b class="brand-red">Widzew</b> <b class="brand-white">1910</b> <b class="brand-red">Draft</b></span>`;
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

        header.innerHTML = `<span><b class="brand-red">Widzew</b> <b class="brand-white">1910</b> <b class="brand-red">Draft</b></span>`;
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
            try {
                finishDraft();
            } catch (error) {
                console.error("Błąd ekranu końcowego:", error);
                const instruction = document.getElementById("draftInstruction");
                if (instruction) instruction.textContent = "Wystąpił błąd ekranu końcowego. Sprawdź konsolę przeglądarki.";
            }
        } else {
            renderBenchPosition();
        }
    }

    function roundScore(value) {
        return Math.round(Number(value) || 0);
    }

    function weightedGroupScore(players) {
        if (!players.length) return 0;
        let weightedSum = 0;
        let weightSum = 0;
        players.forEach(p => {
            const isBench = String(p.role).startsWith("bench-");
            const weight = isBench ? 0.25 : 0.75;
            weightedSum += (Number(p.row["Ogólna"]) || 0) * weight;
            weightSum += weight;
        });
        return weightSum ? weightedSum / weightSum : 0;
    }

    function getTeamScores() {
        const goalkeepers = draft.selected.filter(p => p.role === "br" || p.role === "bench-br");
        const defenders = draft.selected.filter(p => ["loPo", "so", "bench-def"].includes(p.role));
        const midfielders = draft.selected.filter(p => ["pomoc", "skrzydlowi", "bench-mid"].includes(p.role));
        const forwards = draft.selected.filter(p => ["napastnicy", "bench-n"].includes(p.role));

        const br = weightedGroupScore(goalkeepers);
        const defense = weightedGroupScore(defenders);
        const midfield = weightedGroupScore(midfielders);
        const attack = weightedGroupScore(forwards);
        const overall = (br + defense + midfield + attack) / 4;

        return { br, defense, midfield, attack, overall };
    }


    function getSwapPosition(p) {
        if (!p) return "";
        const role = String(p.role || "");

        // Dla zawodnika z jedenastki pozycję określa jego slot formacji.
        if (role === "br" || role === "loPo" || role === "so" ||
            role === "pomoc" || role === "skrzydlowi" || role === "napastnicy") {
            const rolePosition = {
                br: "BR",
                loPo: "LO/PO",
                so: "ŚO",
                pomoc: "ŚPD/ŚP/OP",
                skrzydlowi: "LP/LS/PP/PS",
                napastnicy: "N"
            };
            return rolePosition[role];
        }

        if (role.startsWith("bench-")) {
            return actualBenchPosition(p);
        }

        return String(p.position || p.row?.["Pozycja"] || "").trim();
    }

    function normalizeSwapPosition(pos) {
        return String(pos || "")
            .trim()
            .toUpperCase()
            .replace(/\s+/g, "");
    }

    function sameSwapPosition(a, b) {
        const pa = normalizeSwapPosition(getSwapPosition(a));
        const pb = normalizeSwapPosition(getSwapPosition(b));
        return pa !== "" && pa === pb;
    }

    function clearSwapSelection() {
        document.querySelectorAll(".swap-player.swap-selected, .swap-player.swap-target").forEach(el => {
            el.classList.remove("swap-selected", "swap-target");
        });
        finalSwapIndex = null;
    }

    let finalSwapIndex = null;

    function setupFinalSwapInteractions() {
        const grid = document.getElementById("candidateGrid");
        if (!grid) return;

        // Jedna obsługa kliknięć dla całego ekranu końcowego.
        if (grid.dataset.swapBound !== "1") {
            grid.dataset.swapBound = "1";

            grid.addEventListener("click", (event) => {
                const row = event.target.closest(".swap-player");
                if (!row || !grid.contains(row)) return;

                const starterAttr = row.getAttribute("data-starter-index");
                const benchAttr = row.getAttribute("data-bench-index");

                // 1. Kliknięcie zawodnika z jedenastki.
                if (starterAttr !== null) {
                    const idx = Number(starterAttr);
                    if (!Number.isInteger(idx) || !draft.selected[idx]) return;

                    // Drugie kliknięcie na innym zawodniku XI = wybór nowego źródła.
                    finalSwapIndex = idx;

                    grid.querySelectorAll(".swap-player").forEach(el => {
                        el.classList.remove("swap-selected", "swap-target");
                    });
                    row.classList.add("swap-selected");

                    // Podświetlamy tylko rezerwowych z tej samej pozycji.
                    grid.querySelectorAll("[data-bench-index]").forEach(el => {
                        const bi = Number(el.getAttribute("data-bench-index"));
                        if (Number.isInteger(bi) &&
                            draft.selected[bi] &&
                            sameSwapPosition(draft.selected[idx], draft.selected[bi])) {
                            el.classList.add("swap-target");
                        }
                    });
                    return;
                }

                // 2. Kliknięcie rezerwowego po wybraniu zawodnika z XI.
                if (benchAttr !== null && finalSwapIndex !== null) {
                    const benchIdx = Number(benchAttr);
                    const starterIdx = finalSwapIndex;

                    if (!Number.isInteger(benchIdx) ||
                        !Number.isInteger(starterIdx) ||
                        !draft.selected[benchIdx] ||
                        !draft.selected[starterIdx]) return;

                    const starter = draft.selected[starterIdx];
                    const bench = draft.selected[benchIdx];

                    if (!sameSwapPosition(starter, bench)) {
                        showSwapMessage("Możesz zamienić zawodnika tylko z zawodnikiem z tej samej pozycji.");
                        return;
                    }

                    // Prawdziwa zamiana miejsc w 20-osobowym składzie.
                    // XI zachowuje rolę formacji, ławka zachowuje swój slot ławki.
                    draft.selected[starterIdx] = {
                        ...bench,
                        role: starter.role
                    };
                    draft.selected[benchIdx] = {
                        ...starter,
                        role: bench.role
                    };

                    finalSwapIndex = null;

                    // Ponownie renderujemy cały ekran, dzięki czemu
                    // boisko, listy i wszystkie oceny są aktualizowane.
                    finishDraft();
                }
            });
        }

        // Przy każdym renderze usuwamy stare podświetlenia.
        grid.querySelectorAll(".swap-player").forEach(el => {
            el.classList.remove("swap-selected", "swap-target");
        });
    }

    function showSwapMessage(message) {
        let box = document.getElementById("swapMessage");
        if (!box) {
            box = document.createElement("div");
            box.id = "swapMessage";
            box.className = "swap-message";
            document.body.appendChild(box);
        }
        box.textContent = message;
        box.classList.add("visible");
        clearTimeout(window.__swapMessageTimer);
        window.__swapMessageTimer = setTimeout(() => box.classList.remove("visible"), 2600);
    }

    function finishDraft() {
        const grid = document.getElementById("candidateGrid");
        const position = document.getElementById("draftPosition");
        const instruction = document.getElementById("draftInstruction");
        const progress = document.getElementById("draftProgress");
        const action = document.getElementById("draftAction");
        const scores = getTeamScores();

        // Bezpieczne wstawianie danych do HTML musi być zdefiniowane
        // przed pierwszym użyciem (inaczej ekran końcowy wywala się przy 20. wyborze).
        const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({
            "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
        }[c]));

        position.textContent = "SKŁAD GOTOWY";
        instruction.textContent = "Twój 20-osobowy skład Widzewa.";
        const finalCoachName = selectedTrainer
            ? `${selectedTrainer.first} ${selectedTrainer.last}`
            : (draft.playerName || playerName);
        const finalSeason = selectedTrainer
            ? (selectedTrainer.season || selectedTrainer.Sezon || selectedTrainer.seasonName || draft.gameSeason || "")
            : "22/23";

        progress.innerHTML = `Cały skład: 20/20<br>
            <span class="final-coach-name">Trener: ${safe(finalCoachName)}</span><br>
            <span class="final-season">Sezon: ${safe(finalSeason)}</span>`;

        const starters = draft.selected.filter(p => !String(p.role).startsWith("bench-"));
        const bench = draft.selected.filter(p => String(p.role).startsWith("bench-"));

        const roleNames = {
            br: "BR", loPo: "LO/PO", so: "ŚO", pomoc: "ŚPD/ŚP/OP",
            skrzydlowi: "LS/LP/PS/PP", napastnicy: "N"
        };

        const playerName = p => `${safe(p.row["Imię"])} ${safe(p.row["Nazwisko"])}`;

        const formationName = String(
            selectedFormation ||
            (selectedTrainer && selectedTrainer.formation) ||
            (typeof draft.formation === "string" ? draft.formation : "")
        ).trim();

        const pitchPlayer = (p, occurrence) => {
            const point = pitchCoordinates(formationName, p.role, occurrence);
            const positionStyle = point ? `left:${point.x}%; top:${point.y}%;` : "";
            return `
            <div class="pitch-player ${positionColorClass(p.position || p["Pozycja"], p.role)}" style="${positionStyle}" title="${playerName(p)}">
                <span class="pitch-shirt ${positionColorClass(p.position || p["Pozycja"], p.role)}">${safe(p.row["#"])}</span>
                <span class="pitch-name"><span class="pitch-first-name">${safe(p.row["Imię"])}</span><span class="pitch-last-name">${safe(p.row["Nazwisko"])}</span></span>
            </div>`;
        };

        const pitchPlayers = starters.map(p => {
            const occurrence = starters.slice(0, starters.indexOf(p) + 1).filter(x => x.role === p.role).length;
            return pitchPlayer(p, occurrence);
        }).join("");

        const benchItem = (p, i, selectedIndex) => {
            const actualPos = actualBenchPosition(p);
            const colorClass = positionColorClass(actualPos, p.role);
            return `
            <div class="bench-player swap-player" data-bench-index="${selectedIndex}">
                <span class="bench-number">${i + 1}</span>
                <div class="bench-info">
                    <strong>${playerName(p)}</strong>
                    <small>${safe(actualPos)}</small>
                </div>
                <strong class="bench-rating ${colorClass}">${roundScore(p.row["Ogólna"])}</strong>
            </div>`;
        };

        const starterItem = (p, i, selectedIndex) => `
            <div class="squad-list-player swap-player" data-starter-index="${selectedIndex}">
                <span class="squad-number">${i + 1}</span>
                <div class="squad-player-info">
                    <strong>${playerName(p)}</strong>
                    <small>${roleNames[p.role] || ""}</small>
                </div>
                <strong class="squad-rating ${positionColorClass(p.position || p["Pozycja"], p.role)}">${roundScore(p.row["Ogólna"])}</strong>
            </div>`;

        const formation = safe(
            selectedFormation ||
            (selectedTrainer && selectedTrainer.formation) ||
            (typeof draft.formation === "string" ? draft.formation : "")
        );

        grid.innerHTML = `
            <div class="final-layout">
                <section class="final-pitch-panel">
                    <div class="swap-instruction-final">Kliknij zawodnika z jedenastki, a następnie zawodnika z ławki, aby dokonać zamiany na tej samej pozycji.</div>
                    <div class="final-panel-heading">
                        <div class="final-branding">
                            <img src="data/widzew-crest.png" alt="Herb Widzewa Łódź" class="final-crest">
                            <div class="final-team-rating">
                                <span>OCENA OGÓLNA</span>
                                <strong>${roundScore(scores.overall)}</strong>
                            </div>
                        </div>
                        <div class="final-formation">
                            <span>FORMACJA</span>
                            <strong>${formation}</strong>
                        </div>
                    </div>

                    <div class="football-pitch">
                        <div class="pitch-lines"></div>
                        <div class="pitch-penalty-area pitch-penalty-top"></div>
                        <div class="pitch-goal-area pitch-goal-top"></div>
                        <div class="pitch-penalty-area pitch-penalty-bottom"></div>
                        <div class="pitch-goal-area pitch-goal-bottom"></div>
                        <div class="pitch-center-circle"></div>
                        <div class="pitch-center-dot"></div>
                        ${pitchPlayers}
                    </div>
                </section>

                <section class="final-list-panel">
                    <div class="final-list-heading">
                        <span>SKŁAD</span>
                        <h3>Jedenastka</h3>
                    </div>
                    <div class="squad-list">
                        ${starters.map((p, i) => starterItem(p, i, draft.selected.indexOf(p))).join("")}
                    </div>

                    <div class="final-divider"></div>

                    <div class="final-list-heading bench-heading">
                        <span>REZERWOWI</span>
                        <h3>Ławka rezerwowych</h3>
                    </div>
                    <div class="bench-list">
                        ${bench.map((p, i) => benchItem(p, i, draft.selected.indexOf(p))).join("")}
                    </div>

                    <div class="final-value">
                        <span>ŁĄCZNA WARTOŚĆ</span>
                        <strong>${formatSquadValue(calculateTotalSquadValue(draft.selected))}</strong>
                    </div>
                </section>
            </div>

            <div class="final-score-breakdown compact-stats">
                <div><span>BR</span><strong>${roundScore(scores.br)}</strong></div>
                <div><span>OBRONA</span><strong>${roundScore(scores.defense)}</strong></div>
                <div><span>POMOC</span><strong>${roundScore(scores.midfield)}</strong></div>
                <div><span>ATAK</span><strong>${roundScore(scores.attack)}</strong></div>
            </div>
        `;
        const seasonButtonLabel = finalSeason ? `ROZEGRAJ SEZON ${safe(finalSeason)}` : "ROZEGRAJ SEZON";
        action.innerHTML = `
            <div class="draft-finished">DRAFT ZAKOŃCZONY</div>
            <div class="season-launch">
                <button id="playSeasonButton" class="season-launch-button" type="button">${seasonButtonLabel}</button>
                <p>Jeśli jesteś gotowy z wyborem swojego składu to pora podbić PKO Ekstraklasę.</p>
            </div>`;

        document.getElementById("playSeasonButton")?.addEventListener("click", () => {
            openSeasonScreen(finalSeason);
        });
        if (!window.finalSquadAlertShown) {
            window.finalSquadAlertShown = true;
            alert('W teorii powinni grać najlepsi, jednak każdy trener ma swoich ulubieńców. Możesz na tym etapie rozgrywki wymienić zawodników ze swojej jedenastki. Pamiętaj, że bycie w podstawowej jedenastce wpływa na zaangażowanie i rozwój zawodnika.');
        }
        setupFinalSwapInteractions();
        updateFinalSeasonLabel();
    }

    document.getElementById("difficultyContinue").addEventListener("click", async () => {
        const button = document.getElementById("difficultyContinue");
        if (!selectedDifficulty) return;

        button.disabled = true;
        button.textContent = "WCZYTYWANIE...";

        try {
            await loadPlayerDatabase();
            selectedDifficulty = selectedDifficulty === "easy" ? "easy" : "hard";
            await startDraft();
        } catch (error) {
            console.error("Błąd uruchamiania draftu:", error);
            button.disabled = false;
            button.textContent = "ROZPOCZNIJ DRAFT";
            const selection = document.getElementById("difficultySelection");
            selection.textContent = "Nie udało się uruchomić draftu. Sprawdź folder data i konsolę przeglądarki.";
            selection.classList.add("error");
        }
    });


});

function openSeasonScreen(season) {
    const seasonValue = season || ((draft.mode === "player" || draft.mode === "gracz") ? "22/23" : draft.gameSeason || "");
    const title = document.getElementById("seasonTitle");
    const intro = document.getElementById("seasonIntro");
    if (title) title.textContent = `ROZGRYWKI SEZONU ${seasonValue}`;
    if (intro) intro.textContent = `Trener: ${draft.playerName || playerName || (selectedTrainer ? `${selectedTrainer.first} ${selectedTrainer.last}` : "Widzew")}`;
    showScreen(seasonScreen);
}

function updateFinalSeasonLabel() {
    const root = document.getElementById("candidateGrid");
    if (!root) return;
    let season = (draft.mode === "player" || draft.mode === "gracz") ? "22/23" : (draft.gameSeason || "");
    if (!season) return;
    let el = root.querySelector(".final-season");
    if (!el) {
        const coach = Array.from(root.querySelectorAll("*")).find(x =>
            x.children.length === 0 && /Trener\s*:/.test((x.textContent || "").trim())
        );
        if (coach) {
            el=document.createElement("div");
            el.className="final-season";
            coach.insertAdjacentElement("afterend",el);
        }
    }
    if (el) el.textContent="Sezon: "+season;
}
