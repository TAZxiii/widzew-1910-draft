document.addEventListener("DOMContentLoaded", () => {
    const startScreen = document.querySelector(".start-screen");
    const modeScreen = document.getElementById("modeScreen");
    const coachScreen = document.getElementById("coachScreen");
    const playerScreen = document.getElementById("playerScreen");
    const difficultyScreen = document.getElementById("difficultyScreen");

    let trainerRows = [];
    let selectedTrainer = null;
    let selectedFormation = null;
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
        [startScreen, modeScreen, coachScreen, playerScreen, difficultyScreen]
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
                    selectedFormation =
                        selected[Number(card.dataset.index)]["Formacje"];

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

    document.getElementById("difficultyContinue").addEventListener("click", async () => {
        const button = document.getElementById("difficultyContinue");
        button.disabled = true;
        button.textContent = "WCZYTYWANIE BAZY...";

        try {
            await loadPlayerDatabase();

            const total = Object.values(playerDatabase)
                .reduce((sum, rows) => sum + rows.length, 0);

            alert(
                `Baza zawodników została poprawnie wczytana!\n\n` +
                `Łącznie rekordów sezonowych: ${total}\n` +
                `BR: ${playerDatabase.br.length}\n` +
                `LO/PO: ${playerDatabase.loPo.length}\n` +
                `ŚO: ${playerDatabase.so.length}\n` +
                `Pomocnicy: ${playerDatabase.pomoc.length}\n` +
                `Skrzydłowi: ${playerDatabase.skrzydlowi.length}\n` +
                `Napastnicy: ${playerDatabase.napastnicy.length}\n\n` +
                `Następny etap: właściwy draft.`
            );
        } catch (error) {
            console.error(error);
            alert("Nie udało się wczytać bazy zawodników. Sprawdź folder data.");
        } finally {
            button.disabled = false;
            button.textContent = "ROZPOCZNIJ DRAFT";
        }
    });
});
