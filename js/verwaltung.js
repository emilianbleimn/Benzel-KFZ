/* Referenzen-Verwaltung.
   Schreibt Fotos und Texte direkt ins GitHub-Repository der Website.
   Der Zugangs-Schlüssel liegt ausschließlich im Browser des Nutzers
   (localStorage) und wird nie an eine andere Stelle geschickt als an
   api.github.com. */
(function () {
  "use strict";

  var cfg = document.body.dataset;
  var OWNER = cfg.owner;
  var REPO = cfg.repo;
  var BRANCH = cfg.branch || "main";
  var JSON_PFAD = "data/referenzen.json";
  var BILD_ORDNER = "assets/referenzen/";
  var SPEICHER = "benzel-referenzen-schluessel";
  var MAX_KANTE = 1600;      // längste Bildkante in Pixeln
  var QUALITAET = 0.82;      // JPEG-Qualität
  var MAX_FOTOS = 8;

  var schluessel = null;
  var eintraege = [];

  var $ = function (id) { return document.getElementById(id); };

  /* ================= Anmeldung ================= */

  var gespeichert = null;
  try { gespeichert = localStorage.getItem(SPEICHER); } catch (e) { /* Privatmodus */ }

  if (gespeichert) {
    $("schluessel").value = gespeichert;
    anmelden(gespeichert, false);
  }

  $("anmeldung").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var wert = $("schluessel").value.trim();
    if (!wert) return;
    anmelden(wert, $("merken").checked);
  });

  $("abmelden").addEventListener("click", function () {
    try { localStorage.removeItem(SPEICHER); } catch (e) {}
    schluessel = null;
    $("schluessel").value = "";
    $("schritt-verwaltung").hidden = true;
    $("schritt-anmeldung").hidden = false;
  });

  function anmelden(wert, merken) {
    fehlerZeigen("");
    knopfSperren($("anmelden"), true, "Prüfe …");

    api("GET", "/repos/" + OWNER + "/" + REPO)
      .then(function () {
        schluessel = wert;
        if (merken) { try { localStorage.setItem(SPEICHER, wert); } catch (e) {} }
        $("schritt-anmeldung").hidden = true;
        $("schritt-verwaltung").hidden = false;
        return listeLaden();
      })
      .catch(function (err) {
        schluessel = null;
        fehlerZeigen(lesbar(err));
      })
      .then(function () { knopfSperren($("anmelden"), false, "Anmelden"); });

    // api() nutzt die Variable "schluessel"; beim Prüfen ist die noch leer:
    function api(methode, pfad, koerper) { return anfrage(methode, pfad, koerper, wert); }
  }

  function fehlerZeigen(text) {
    var el = $("anmeldung-fehler");
    el.textContent = text;
    el.hidden = !text;
  }

  /* ================= Vorhandene Einträge ================= */

  function listeLaden() {
    return jsonLaden().then(function (daten) {
      eintraege = daten.eintraege;
      listeZeichnen();
    });
  }

  function jsonLaden() {
    return anfrage("GET", "/repos/" + OWNER + "/" + REPO + "/contents/" + JSON_PFAD + "?ref=" + BRANCH)
      .then(function (datei) {
        var text = new TextDecoder().decode(base64ZuBytes(datei.content.replace(/\n/g, "")));
        var daten = JSON.parse(text);
        if (!Array.isArray(daten.eintraege)) daten.eintraege = [];
        return daten;
      })
      .catch(function (err) {
        if (err.status === 404) return { eintraege: [] };
        throw err;
      });
  }

  function listeZeichnen() {
    var ziel = $("liste");
    ziel.innerHTML = "";

    if (!eintraege.length) {
      var leer = document.createElement("p");
      leer.className = "vw__leer";
      leer.textContent = "Noch keine Referenzen veröffentlicht.";
      ziel.appendChild(leer);
      return;
    }

    eintraege.forEach(function (eintrag) {
      var zeile = document.createElement("div");
      zeile.className = "vw__zeile";

      var bild = document.createElement("img");
      bild.className = "vw__mini";
      bild.src = eintrag.bilder[0];
      bild.alt = "";
      bild.loading = "lazy";
      zeile.appendChild(bild);

      var text = document.createElement("div");
      text.className = "vw__zeile-text";
      var t = document.createElement("strong");
      t.textContent = eintrag.titel;
      text.appendChild(t);
      var meta = document.createElement("span");
      meta.textContent = [eintrag.kategorie, eintrag.datum, eintrag.bilder.length + " Foto" + (eintrag.bilder.length > 1 ? "s" : "")]
        .filter(Boolean).join(" · ");
      text.appendChild(meta);
      if (eintrag.beschreibung) {
        var b = document.createElement("span");
        b.textContent = eintrag.beschreibung;
        text.appendChild(b);
      }
      zeile.appendChild(text);

      var weg = document.createElement("button");
      weg.type = "button";
      weg.className = "vw__loeschen";
      weg.textContent = "Löschen";
      weg.addEventListener("click", function () { loeschen(eintrag, weg); });
      zeile.appendChild(weg);

      ziel.appendChild(zeile);
    });
  }

  /* ================= Neue Referenz ================= */

  $("fotos").addEventListener("change", function () {
    var dateien = [].slice.call(this.files || []);
    var vorschau = $("vorschau");
    vorschau.innerHTML = "";

    if (dateien.length > MAX_FOTOS) {
      statusZeigen("Bitte höchstens " + MAX_FOTOS + " Fotos auf einmal auswählen.", "fehler");
      this.value = "";
      return;
    }
    statusZeigen("", "");

    dateien.forEach(function (datei) {
      var img = document.createElement("img");
      img.className = "vw__vorschau-bild";
      img.alt = "";
      img.src = URL.createObjectURL(datei);
      img.onload = function () { URL.revokeObjectURL(img.src); };
      vorschau.appendChild(img);
    });
  });

  $("formular").addEventListener("submit", function (ev) {
    ev.preventDefault();

    var titel = $("titel").value.trim();
    var beschreibung = $("beschreibung").value.trim();
    var kategorie = $("kategorie").value;
    var dateien = [].slice.call($("fotos").files || []);

    if (!titel) { statusZeigen("Bitte einen Titel eingeben.", "fehler"); return; }
    if (!dateien.length) { statusZeigen("Bitte mindestens ein Foto auswählen.", "fehler"); return; }

    knopfSperren($("speichern"), true, "Wird veröffentlicht …");
    statusZeigen("Fotos werden verkleinert …", "info");

    var datum = heute();
    var kennung = Math.random().toString(36).slice(2, 8);
    var basis = datum + "-" + kuerzel(titel) + "-" + kennung;

    Promise.all(dateien.map(function (datei, i) {
      return verkleinern(datei, MAX_KANTE, QUALITAET).then(function (blob) {
        return alsBase64(blob).then(function (b64) {
          return { pfad: BILD_ORDNER + basis + "-" + (i + 1) + ".jpg", inhalt: b64 };
        });
      });
    }))
      .then(function (bilder) {
        statusZeigen("Wird hochgeladen …", "info");
        var neu = {
          id: basis,
          titel: titel,
          beschreibung: beschreibung,
          kategorie: kategorie,
          datum: datum,
          bilder: bilder.map(function (b) { return b.pfad; })
        };
        return veroeffentlichen({
          nachricht: "Referenz hinzugefügt: " + titel,
          neueDateien: bilder,
          entfernen: [],
          aendern: function (daten) { daten.eintraege.unshift(neu); return daten; }
        });
      })
      .then(function (daten) {
        $("formular").reset();
        $("vorschau").innerHTML = "";
        statusZeigen("Veröffentlicht. In ein bis zwei Minuten ist die Referenz auf der Website zu sehen.", "erfolg");
        eintraege = daten.eintraege;
        listeZeichnen();
      })
      .catch(function (err) { statusZeigen(lesbar(err), "fehler"); })
      .then(function () { knopfSperren($("speichern"), false, "Veröffentlichen"); });
  });

  /* ================= Löschen ================= */

  function loeschen(eintrag, knopf) {
    if (!window.confirm("„" + eintrag.titel + "“ wirklich löschen? Das lässt sich nicht rückgängig machen.")) return;

    knopfSperren(knopf, true, "Lösche …");
    statusZeigen("Wird gelöscht …", "info");

    veroeffentlichen({
      nachricht: "Referenz gelöscht: " + eintrag.titel,
      neueDateien: [],
      entfernen: eintrag.bilder.slice(),
      aendern: function (daten) {
        daten.eintraege = daten.eintraege.filter(function (e) { return e.id !== eintrag.id; });
        return daten;
      }
    })
      .then(function (daten) {
        statusZeigen("Gelöscht. In ein bis zwei Minuten ist die Änderung auf der Website zu sehen.", "erfolg");
        eintraege = daten.eintraege;
        listeZeichnen();
      })
      .catch(function (err) {
        statusZeigen(lesbar(err), "fehler");
        knopfSperren(knopf, false, "Löschen");
      });
  }

  /* ================= Ein Commit mit allen Änderungen =================
     Bilder und die JSON-Datei landen zusammen in einem einzigen Commit.
     Das hält die Historie sauber und löst nur eine Neuveröffentlichung
     der Website aus, statt einer pro Datei. */

  function veroeffentlichen(auftrag) {
    var pfad = "/repos/" + OWNER + "/" + REPO;
    var basisCommit, basisBaum, geschrieben;

    return anfrage("GET", pfad + "/git/ref/heads/" + BRANCH)
      .then(function (ref) {
        basisCommit = ref.object.sha;
        return anfrage("GET", pfad + "/git/commits/" + basisCommit);
      })
      .then(function (commit) {
        basisBaum = commit.tree.sha;
        return jsonLaden();
      })
      .then(function (daten) {
        daten = auftrag.aendern(daten);
        daten.hinweis = "Diese Datei wird von der Seite verwaltung.html automatisch gepflegt. Bitte nicht von Hand bearbeiten.";
        geschrieben = daten;

        var blobs = auftrag.neueDateien.map(function (datei) {
          return anfrage("POST", pfad + "/git/blobs", { content: datei.inhalt, encoding: "base64" })
            .then(function (b) { return { path: datei.pfad, mode: "100644", type: "blob", sha: b.sha }; });
        });

        blobs.push(
          anfrage("POST", pfad + "/git/blobs", {
            content: utf8ZuBase64(JSON.stringify(daten, null, 2) + "\n"),
            encoding: "base64"
          }).then(function (b) { return { path: JSON_PFAD, mode: "100644", type: "blob", sha: b.sha }; })
        );

        return Promise.all(blobs);
      })
      .then(function (baumEintraege) {
        auftrag.entfernen.forEach(function (p) {
          baumEintraege.push({ path: p, mode: "100644", type: "blob", sha: null });
        });
        return anfrage("POST", pfad + "/git/trees", { base_tree: basisBaum, tree: baumEintraege });
      })
      .then(function (baum) {
        return anfrage("POST", pfad + "/git/commits", {
          message: auftrag.nachricht,
          tree: baum.sha,
          parents: [basisCommit]
        });
      })
      .then(function (commit) {
        return anfrage("PATCH", pfad + "/git/refs/heads/" + BRANCH, { sha: commit.sha });
      })
      .then(function () { return geschrieben; });
  }

  /* ================= GitHub-Anfrage ================= */

  function anfrage(methode, pfad, koerper, schluesselOverride) {
    var token = schluesselOverride || schluessel;
    return fetch("https://api.github.com" + pfad, {
      method: methode,
      headers: {
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: koerper ? JSON.stringify(koerper) : undefined
    }).then(function (antwort) {
      if (antwort.status === 204) return null;
      return antwort.json().catch(function () { return {}; }).then(function (daten) {
        if (!antwort.ok) {
          var fehler = new Error(daten.message || ("HTTP " + antwort.status));
          fehler.status = antwort.status;
          throw fehler;
        }
        return daten;
      });
    });
  }

  function lesbar(err) {
    if (!err) return "Unbekannter Fehler.";
    if (err.status === 401) return "Der Zugangs-Schlüssel ist ungültig oder abgelaufen. Bitte einen neuen anfordern.";
    if (err.status === 403) return "Keine Berechtigung. Der Schlüssel darf dieses Projekt nicht ändern.";
    if (err.status === 404) return "Projekt nicht gefunden. Bitte prüfen, ob der Schlüssel zum richtigen Projekt gehört.";
    if (err.status === 409 || err.status === 422) return "Da war jemand schneller. Bitte die Seite neu laden und noch einmal versuchen.";
    if (err.message === "Failed to fetch") return "Keine Verbindung. Bitte Internetverbindung prüfen.";
    return err.message || "Unbekannter Fehler.";
  }

  /* ================= Hilfsfunktionen ================= */

  function verkleinern(datei, maxKante, qualitaet) {
    return new Promise(function (erfolg, fehler) {
      if (!/^image\//.test(datei.type)) {
        fehler(new Error("„" + datei.name + "“ ist kein Bild."));
        return;
      }
      var url = URL.createObjectURL(datei);
      var img = new Image();
      img.onload = function () {
        var b = img.naturalWidth, h = img.naturalHeight;
        var f = Math.min(1, maxKante / Math.max(b, h));
        var leinwand = document.createElement("canvas");
        leinwand.width = Math.max(1, Math.round(b * f));
        leinwand.height = Math.max(1, Math.round(h * f));
        var ctx = leinwand.getContext("2d");
        ctx.drawImage(img, 0, 0, leinwand.width, leinwand.height);
        URL.revokeObjectURL(url);
        leinwand.toBlob(function (blob) {
          blob ? erfolg(blob) : fehler(new Error("„" + datei.name + "“ konnte nicht umgewandelt werden."));
        }, "image/jpeg", qualitaet);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        fehler(new Error("„" + datei.name + "“ konnte nicht gelesen werden."));
      };
      img.src = url;
    });
  }

  function alsBase64(blob) {
    return new Promise(function (erfolg, fehler) {
      var leser = new FileReader();
      leser.onload = function () { erfolg(String(leser.result).split(",")[1]); };
      leser.onerror = function () { fehler(new Error("Datei konnte nicht gelesen werden.")); };
      leser.readAsDataURL(blob);
    });
  }

  function utf8ZuBase64(text) {
    var bytes = new TextEncoder().encode(text);
    var binaer = "";
    for (var i = 0; i < bytes.length; i++) binaer += String.fromCharCode(bytes[i]);
    return btoa(binaer);
  }

  function base64ZuBytes(b64) {
    var binaer = atob(b64);
    var bytes = new Uint8Array(binaer.length);
    for (var i = 0; i < binaer.length; i++) bytes[i] = binaer.charCodeAt(i);
    return bytes;
  }

  function kuerzel(text) {
    return String(text).toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "referenz";
  }

  function heute() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var t = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + t;
  }

  function knopfSperren(knopf, gesperrt, text) {
    knopf.disabled = gesperrt;
    if (text) knopf.textContent = text;
  }

  function statusZeigen(text, art) {
    var el = $("status");
    el.textContent = text;
    el.className = "vw__status" + (art ? " vw__status--" + art : "");
    el.hidden = !text;
    if (text && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }
})();
