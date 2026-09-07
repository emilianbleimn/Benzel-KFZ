# Referenzen selbst pflegen

Auf der Seite **`verwaltung.html`** kann Herr Benzel Fotos vergangener Gutachten
selbst zur Website hinzufügen — mit Titel, Beschreibung und Kategorie, ohne dass
jemand anders etwas tun muss.

Adresse: <https://emilianbleimn.github.io/Benzel-KFZ/verwaltung.html>

Die Seite ist von der Website aus nicht verlinkt und für Suchmaschinen gesperrt
(`noindex`). Sie ist trotzdem öffentlich erreichbar — geschützt wird sie durch
den Zugangs-Schlüssel, nicht durch die unbekannte Adresse.

---

## Einmalig: Zugangs-Schlüssel erstellen

Das macht der Betreuer der Website einmal. Der Schlüssel ist ein sogenanntes
*fine-grained personal access token* von GitHub und gilt **nur für dieses eine
Projekt** und **nur für Dateiänderungen**.

1. Auf <https://github.com/settings/personal-access-tokens/new> anmelden.
2. **Token name**: `Benzel Referenzen`
3. **Expiration**: z. B. `1 year`. Merken — danach muss ein neuer Schlüssel
   erzeugt werden (siehe *Schlüssel erneuern*).
4. **Resource owner**: `emilianbleimn`
5. **Repository access**: `Only select repositories` → `Benzel-KFZ` auswählen.
6. **Permissions** → **Repository permissions** → **Contents** auf
   `Read and write` stellen. Alles andere bleibt auf `No access`.
   (`Metadata: Read-only` setzt GitHub automatisch dazu — das ist richtig so.)
7. **Generate token** und den Schlüssel kopieren. Er beginnt mit `github_pat_`
   und wird **nur ein einziges Mal angezeigt**.
8. Den Schlüssel an Herrn Benzel weitergeben — am besten über einen Messenger
   oder telefonisch, nicht über eine unverschlüsselte E-Mail.

## Einmalig: anmelden

Herr Benzel öffnet die Adresse oben, fügt den Schlüssel ein und tippt auf
**Anmelden**. Bleibt der Haken „Auf diesem Gerät gespeichert lassen" gesetzt,
muss er den Schlüssel nie wieder eingeben. Ein Lesezeichen auf dem Handy-
Startbildschirm ist praktisch.

## Laufender Betrieb

Fotos auswählen, Titel und Beschreibung eintippen, **Veröffentlichen**.
Nach ein bis zwei Minuten stehen sie unter „Einblicke aus der Praxis"
auf der Website.

- Bis zu 8 Fotos pro Eintrag. Ein Eintrag mit mehreren Fotos bekommt in der
  Galerie eine kleine Zahl („+2") und öffnet beim Antippen eine Bildergalerie.
- Fotos werden **im Browser automatisch verkleinert** (längste Kante 1600 px,
  JPEG). Aus einem 1,1-MB-Handyfoto werden rund 170 KB. Nichts muss vorbereitet
  werden.
- Alle Fotos eines Eintrags landen zusammen mit dem Verzeichnis in **einem
  einzigen Commit** — die Website wird also nur einmal neu veröffentlicht.
- **Löschen** entfernt den Eintrag und die zugehörigen Bilddateien.
  Ändern geht nicht direkt: löschen und neu anlegen.

Solange noch keine Referenz eingetragen ist, zeigt die Website die bisherigen
Platzhalter-Kacheln („Bild folgt"). Sobald der erste Eintrag da ist,
verschwinden sie automatisch.

---

## Wie es technisch funktioniert

| Datei | Aufgabe |
|---|---|
| `verwaltung.html` + `js/verwaltung.js` | Eingabemaske; schreibt über die GitHub-API direkt ins Repository |
| `data/referenzen.json` | Verzeichnis aller Einträge (Titel, Beschreibung, Kategorie, Datum, Bildpfade) |
| `assets/referenzen/*.jpg` | die hochgeladenen, bereits verkleinerten Fotos |
| `js/referenzen.js` | liest das Verzeichnis auf der Startseite und baut die Galerie |

Der Schlüssel liegt ausschließlich im `localStorage` des Browsers von Herrn
Benzel. Er wird an keine andere Stelle geschickt als an `api.github.com`.

`data/referenzen.json` wird automatisch gepflegt und sollte nicht von Hand
bearbeitet werden — sonst kann ein gleichzeitiger Upload die Änderung
überschreiben.

---

## Schlüssel erneuern

Läuft der Schlüssel ab, meldet die Seite: *„Der Zugangs-Schlüssel ist ungültig
oder abgelaufen."* Dann einfach nach derselben Anleitung oben einen neuen
erzeugen und in der Verwaltung erneut einfügen.

## Wenn ein Schlüssel abhandenkommt

Auf <https://github.com/settings/personal-access-tokens> den Eintrag
`Benzel Referenzen` aufrufen und **Revoke** klicken. Der Schlüssel ist damit
sofort wertlos. Danach einen neuen erzeugen.

Der schlimmstmögliche Schaden mit einem entwendeten Schlüssel: jemand ändert
Dateien in diesem einen Repository — z. B. unpassende Fotos in der Galerie.
Auf andere Projekte, Konten oder Daten hat er keinen Zugriff. Jede Änderung
steht in der Git-Historie und lässt sich in einer Minute zurücknehmen.
