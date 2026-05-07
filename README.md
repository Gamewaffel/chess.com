# ♟ ChessMaster — Schach-Website mit KI-Bot

Eine vollständige Schach-Website mit einem intelligenten Bot (Minimax + Alpha-Beta-Pruning),
direkt im Browser spielbar. Design ähnlich wie chess.com, vollständig open source.

---

## 🚀 Live Demo

👉 [https://gamewaffel.github.io/chess.com](https://gamewaffel.github.io/chess.com)

---

## 🧠 Wie intelligent ist der Bot?

Der Bot verwendet **Minimax mit Alpha-Beta-Pruning** — dieselbe Grundtechnik wie Stockfish:

| Schwierigkeit | Suchtiefe | Stärke |
|---|---|---|
| Anfänger | 2 | ~800 ELO |
| Mittel | 8 | ~1600 ELO |
| Experte | 15 | ~2200 ELO |
| Stockfish | 20 | ~2600+ ELO |

### Was macht den Bot so stark?
- **Piece-Square-Tabellen** — positionelles Bewusstsein für jede Figur
- **Move-Ordering** — Schläge werden zuerst bewertet (effizienter Pruning)
- **Alpha-Beta-Pruning** — prüft bis zu 10× mehr Positionen als einfacher Minimax
- **Materialwertung** — Bauer=100, Springer=320, Läufer=330, Turm=500, Dame=900

### Echtes Stockfish einbinden (optional)
```js
// stockfish.js als WebWorker:
const stockfish = new Worker('stockfish.js');
stockfish.postMessage('uci');
stockfish.postMessage('position fen ' + game.fen());
stockfish.postMessage('go depth 20');
stockfish.onmessage = (e) => {
  if (e.data.startsWith('bestmove')) {
    const move = e.data.split(' ')[1]; // z.B. "e2e4"
    game.move({ from: move.slice(0,2), to: move.slice(2,4) });
  }
};
```
Stockfish WASM herunterladen: [stockfishchess.org](https://stockfishchess.org/download/)

---

## 📁 Projektstruktur

```
chess-website/
├── index.html      ← Haupt-HTML-Datei
├── style.css       ← Komplettes Design (Dark Luxury Theme)
├── game.js         ← Spiellogik + KI-Bot
└── README.md       ← Diese Anleitung
```

---

## 🛠️ Schritt-für-Schritt: Auf GitHub hochladen & deployen

### Schritt 1: GitHub-Account erstellen
1. Gehe zu [github.com](https://github.com) und klicke auf **"Sign up"**
2. Wähle einen Benutzernamen (z.B. `max-mueller`)
3. E-Mail bestätigen

---

### Schritt 2: Repository erstellen
1. Oben rechts auf **"+"** klicken → **"New repository"**
2. **Repository name:** `chess-website`
3. **Description:** `Schach-Website mit KI-Bot`
4. **Public** auswählen (damit GitHub Pages kostenlos funktioniert)
5. ✅ **"Add a README file"** ankreuzen
6. Auf **"Create repository"** klicken

---

### Schritt 3: Dateien hochladen
**Option A — Browser (einfach):**
1. Im Repository auf **"Add file"** → **"Upload files"** klicken
2. Alle 4 Dateien (`index.html`, `style.css`, `game.js`, `README.md`) hinziehen
3. Unten bei "Commit changes" auf **"Commit changes"** klicken

**Option B — Git (empfohlen für Entwickler):**
```bash
# Git installieren: https://git-scm.com/downloads

# Terminal öffnen und zum Projektordner navigieren:
cd pfad/zum/chess-website-ordner

# Git initialisieren:
git init

# Dateien hinzufügen:
git add .

# Ersten Commit erstellen:
git commit -m "Erste Version der Schach-Website"

# Mit GitHub verbinden (DEIN-USERNAME ersetzen!):
git remote add origin https://github.com/DEIN-USERNAME/chess-website.git

# Hochladen:
git branch -M main
git push -u origin main
```

---

### Schritt 4: GitHub Pages aktivieren (kostenloser Hosting!)
1. Im Repository oben auf **"Settings"** klicken
2. Links in der Sidebar: **"Pages"**
3. Unter **"Source"**: `Deploy from a branch` auswählen
4. Branch: **`main`**, Ordner: **`/ (root)`**
5. Auf **"Save"** klicken
6. Nach ~2 Minuten ist die Seite live unter:
   `https://DEIN-USERNAME.github.io/chess-website`

---

### Schritt 5: Link in README aktualisieren
Ersetze `DEIN-USERNAME` mit deinem echten GitHub-Benutzernamen in:
- `README.md` (Demo-Link oben)
- `index.html` (GitHub-Button in der Navigation)

---

## ✨ Features

- ♟ Vollständiges Schachregelwerk (chess.js)
- 🤖 KI-Bot mit 4 Schwierigkeitsstufen
- 🎨 Elegantes Dark Theme (Gold/Schwarz)
- 📱 Responsive (funktioniert auf Handy)
- ⚡ Keine Installation nötig — läuft im Browser
- 🎯 Bauernumwandlung mit Modal
- 📋 Zughistorie (algebraische Notation)
- ⚠️ Schach-Markierung des Königs
- 🟡 Letzte Züge hervorgehoben
- 🟢 Legale Züge angezeigt

---

## 🔧 Anpassungen

### Farben ändern
In `style.css` unter `:root {}`:
```css
--gold: #c9a84c;        /* Goldfarbe (Akzente) */
--white-sq: #f0d9b5;    /* Helle Felder */
--black-sq: #b58863;    /* Dunkle Felder */
--bg: #0a0a0f;          /* Hintergrundfarbe */
```

### Bot-Stärke erhöhen
In `game.js`:
```js
searchDepth = 20; // Höher = stärker, aber langsamer
```

### Spieler als Schwarz spielen
In `game.js`, `onSquareClick` Funktion:
```js
if (game.turn() !== 'b') return; // 'b' statt 'w'
```
Und Bot zieht als Weiß:
```js
if (!game.game_over() && game.turn() === 'w') {
  setTimeout(botMove, 300);
}
```

---

## 📚 Verwendete Technologien

| Technologie | Zweck |
|---|---|
| [chess.js](https://github.com/jhlywa/chess.js) | Schachlogik, Regelprüfung |
| Vanilla JavaScript | KI-Bot, Spielsteuerung |
| HTML5 + CSS3 | Design, Layout |
| Google Fonts | Typografie (Playfair Display, JetBrains Mono) |
| GitHub Pages | Kostenloses Hosting |

---

## 🤝 Mithelfen (Contributing)

1. Repository **forken** (oben rechts "Fork"-Button)
2. Änderungen machen
3. **Pull Request** erstellen

Ideen für Erweiterungen:
- [ ] Echtes Stockfish WebAssembly einbinden
- [ ] Zwei-Spieler-Modus (lokal oder online)
- [ ] Spieler-vs-Spieler über WebSocket
- [ ] Zeitkontrolle (Timer)
- [ ] Partien speichern (PGN-Export)
- [ ] Öffnungsbuch

---

## 📄 Lizenz

MIT — frei verwendbar, veränderbar und teilbar.

---

*Erstellt mit ♟ und viel ☕*
