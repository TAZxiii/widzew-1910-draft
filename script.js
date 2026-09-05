document.addEventListener("DOMContentLoaded", () => {
    const startScreen = document.querySelector(".start-screen");
    const modeScreen = document.getElementById("modeScreen");
    const coachScreen = document.getElementById("coachScreen");
    const playerScreen = document.getElementById("playerScreen");

    let trainerRows = [];
    let selectedTrainer = null;
    let selectedFormation = null;

    function showScreen(screen) {
        [startScreen, modeScreen, coachScreen, playerScreen].forEach(s => {
            if (s) s.classList.add("hidden");
        });
        if (screen) screen.classList.remove("hidden");
        window.scrollTo(0, 0);
    }

    function parseCSV(text) {
        const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
        if (!lines.length) return [];

        const headers = lines.shift().split(";").map(h => h.trim());

        return lines.filter(line => line.trim()).map(line => {
            const values = line.split(";");
            return Object.fromEntries(
                headers.map((header, i) => [header, (values[i] || "").trim()])
            );
        });
    }

    async function getCSV(path) {
        // Cache-busting is useful while testing a GitHub Pages deployment.
        const separator = path.includes("?") ? "&" : "?";
        const response = await fetch(`${path}${separator}v=2`, {
            cache: "no-store"
        });
        if (!response.ok) {
            throw new Error(`${path}: HTTP ${response.status}`);
        }
        return parseCSV(await response.text());
    }

    document.getElementById("startGame").addEventListener("click", () => {
        showScreen(modeScreen);
    });

    document.getElementById("coachMode").addEventListener("click", () => {
        showScreen(coachScreen);
        loadTrainerDatabase();
    });

    document.getElementById("playerMode").addEventListener("click", () => {
        showScreen(playerScreen);
        loadFormationDatabase();
    });

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

    async function loadTrainerDatabase() {
        const status = document.getElementById("coachStatus");
        const grid = document.getElementById("coachGrid");

        status.textContent = "Wczytywanie bazy trenerów...";
        status.classList.remove("error");

        try {
            trainerRows = await getCSV("data/trener.csv");

            if (!trainerRows.length) {
                throw new Error("Baza trenerów jest pusta.");
            }

            status.textContent = `Wczytano ${trainerRows.length} rekordów sezonowych.`;
            renderCoaches();
        } catch (error) {
            status.textContent = "Nie udało się wczytać bazy trenerów.";
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

                // If a coach has multiple seasons, select one at random.
                const selected = coach.seasons[
                    Math.floor(Math.random() * coach.seasons.length)
                ];

                selectedTrainer = {
                    first: coach.first,
                    last: coach.last,
                    season: selected["Sezon"],
                    formation: selected["Taktyka"]
                };

                // For now show the result in the existing player screen.
                // The next development step will replace this with the
                // difficulty-selection screen.
                showSelectedTrainer();
            });
        });
    }

    function showSelectedTrainer() {
        const content = playerScreen.querySelector(".player-content");

        content.innerHTML = `
            <h2>WYBRANY TRENER</h2>
            <p class="screen-intro">
                ${selectedTrainer.first} ${selectedTrainer.last}
            </p>
            <div class="selection-card">
                <div><strong>Sezon</strong><span>${selectedTrainer.season}</span></div>
                <div><strong>Formacja</strong><span>${selectedTrainer.formation}</span></div>
            </div>
            <button class="next-button" id="trainerContinue">DALEJ</button>
        `;

        document.getElementById("trainerContinue").addEventListener("click", () => {
            alert("Następny etap: wybór poziomu trudności.");
        });
    }

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
                });
            });
        } catch (error) {
            const status = document.getElementById("formationStatus");
            status.textContent =
                "Nie udało się wczytać bazy formacji. Sprawdź, czy data/formacje.csv znajduje się w repozytorium.";
            status.classList.add("error");
            console.error("Błąd wczytywania formacje.csv:", error);
        }
    }
});
