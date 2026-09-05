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
            status.textContent = "Nie można wczytać CSV. Na GitHub Pages zadziała poprawnie, gdy folder data będzie w repozytorium.";
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
                <span class="coach-name">${coach.first} ${coach.last}</span>
            </button>
        `).join("");

        grid.querySelectorAll(".coach-card").forEach(card => {
            card.addEventListener("click", () => {
                const coach = coaches[Number(card.dataset.index)];
                const selected = coach.seasons[
                    Math.floor(Math.random() * coach.seasons.length)
                ];
                alert(`${coach.first} ${coach.last}\nSezon: ${selected["Sezon"]}\nFormacja: ${selected["Taktyka"]}`);
            });
        });
    }
});
