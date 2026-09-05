document.addEventListener("DOMContentLoaded", () => {
    const startScreen = document.querySelector(".start-screen");
    const modeScreen = document.getElementById("modeScreen");
    const coachScreen = document.getElementById("coachScreen");
    const playerScreen = document.getElementById("playerScreen");

    function showScreen(screen) {
        [startScreen, modeScreen, coachScreen, playerScreen].forEach(s => {
            if (s) s.classList.add("hidden");
        });
        if (screen) screen.classList.remove("hidden");
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

    let trainerRows = [];

    function parseCSV(text) {
        const lines = text.trim().split(/\r?\n/);
        const headers = lines.shift().split(";").map(h => h.trim());

        return lines.filter(Boolean).map(line => {
            const values = line.split(";");
            return Object.fromEntries(
                headers.map((header, i) => [header, (values[i] || "").trim()])
            );
        });
    }

    async function loadTrainerDatabase() {
        const status = document.getElementById("coachStatus");
        status.textContent = "Wczytywanie bazy trenerów...";
        status.classList.remove("error");

        try {
            const response = await fetch("data/trener.csv", { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            trainerRows = parseCSV(await response.text());
            if (!trainerRows.length) throw new Error("Pusta baza");

            status.textContent = `Wczytano ${trainerRows.length} rekordów sezonowych.`;
            renderCoaches();
        } catch (error) {
            status.textContent = "Nie można wczytać bazy trenerów.";
            status.classList.add("error");
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

                const selected = coach.seasons[
                    Math.floor(Math.random() * coach.seasons.length)
                ];

                alert(
                    `${coach.first} ${coach.last}\n` +
                    `Sezon: ${selected["Sezon"]}\n` +
                    `Formacja: ${selected["Taktyka"]}`
                );
            });
        });
    }

    async function loadFormationDatabase() {
        const content = playerScreen.querySelector(".player-content");

        content.innerHTML = `
            <h2>Wybierz formację</h2>
            <p class="screen-intro">Wybierz jedną z pięciu losowo wylosowanych formacji.</p>
            <div id="formationStatus" class="formation-status">Wczytywanie bazy formacji...</div>
            <div id="formationGrid" class="formation-grid"></div>
        `;

        try {
            const response = await fetch("data/formacje.csv", { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const rows = parseCSV(await response.text());

            if (rows.length < 5) {
                throw new Error("Baza zawiera mniej niż 5 formacji.");
            }

            const selected = [...rows]
                .sort(() => Math.random() - 0.5)
                .slice(0, 5);

            document.getElementById("formationStatus").textContent =
                "Wybierz formację, w której chcesz zbudować swój skład.";

            const grid = document.getElementById("formationGrid");

            grid.innerHTML = selected.map((formation, i) => `
                <button class="formation-card" data-index="${i}">
                    <span class="formation-name">${formation["Formacje"]}</span>
                </button>
            `).join("");

            grid.querySelectorAll(".formation-card").forEach(card => {
                card.addEventListener("click", () => {
                    const formation = selected[Number(card.dataset.index)];
                    alert(`Wybrana formacja: ${formation["Formacje"]}`);
                });
            });
        } catch (error) {
            const status = document.getElementById("formationStatus");
            status.textContent = "Nie udało się wczytać bazy formacji.";
            status.classList.add("error");
            console.error("Błąd wczytywania formacje.csv:", error);
        }
    }
});
