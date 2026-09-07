/* Cosmetic season table fix: adds Ekstraklasa logo and column headers after the table is rendered. */
(function () {
    function enhanceLeagueTable() {
        const table = document.getElementById("leagueTable");
        if (!table) return;

        const panel = table.closest(".league-table-panel");
        if (panel && !panel.querySelector(".league-competition-logo")) {
            const logo = document.createElement("img");
            logo.className = "league-competition-logo";
            logo.src = "data/logos/ekstraklasa.png";
            logo.alt = "Ekstraklasa";
            panel.appendChild(logo);
        }

        if (!table.querySelector(".league-table-header")) {
            const header = document.createElement("div");
            header.className = "league-table-header";
            ["#", "Drużyna", "M", "Z", "R", "P", "B", "Pkt"].forEach(label => {
                const cell = document.createElement("span");
                cell.textContent = label;
                header.appendChild(cell);
            });
            table.insertBefore(header, table.firstChild);
        }
    }

    function addStyles() {
        if (document.getElementById("seasonTableFixStyles")) return;
        const style = document.createElement("style");
        style.id = "seasonTableFixStyles";
        style.textContent = `
            .league-table-panel { position: relative; }
            .league-competition-logo {
                position: absolute;
                top: 16px;
                left: 18px;
                width: 72px;
                height: 72px;
                object-fit: contain;
                z-index: 2;
            }
            .league-table-panel .season-panel-title { padding-left: 88px; }
            .league-table-header,
            .league-row {
                display: grid;
                grid-template-columns: 32px minmax(190px, 1fr) 28px 28px 28px 28px 58px 38px;
                gap: 5px;
                align-items: center;
            }
            .league-table-header {
                min-height: 32px;
                padding: 3px 7px;
                color: #aaa;
                font-size: 10px;
                font-weight: 900;
                letter-spacing: .08em;
                text-transform: uppercase;
                text-align: center;
                border-bottom: 1px solid rgba(255,255,255,.14);
                margin-bottom: 4px;
            }
            .league-table-header span:nth-child(2) { text-align: left; }
            @media (max-width: 700px) {
                .league-competition-logo { width: 56px; height: 56px; top: 12px; left: 12px; }
                .league-table-panel .season-panel-title { padding-left: 70px; }
                .league-table-header,
                .league-row {
                    grid-template-columns: 25px minmax(120px, 1fr) 25px 25px 25px 25px 48px 35px;
                    gap: 3px;
                }
                .league-table-header { font-size: 9px; }
                .league-row { font-size: 11px; }
            }
        `;
        document.head.appendChild(style);
    }

    function start() {
        addStyles();
        enhanceLeagueTable();

        const board = document.getElementById("seasonBoardContent") || document.body;
        const observer = new MutationObserver(() => enhanceLeagueTable());
        observer.observe(board, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
        start();
    }
})();
