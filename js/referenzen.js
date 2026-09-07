/* Referenzen-Galerie: liest data/referenzen.json und ersetzt die Platzhalter.
   Schlägt der Abruf fehl oder gibt es noch keine Einträge, bleiben die
   Platzhalter im HTML stehen – die Seite sieht dann aus wie bisher. */
(function () {
  "use strict";

  var wrap = document.getElementById("galerie");
  if (!wrap || !window.fetch) return;

  var BILD_PREFIX = "assets/referenzen/";

  fetch("data/referenzen.json?t=" + Date.now(), { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (daten) {
      var liste = daten && Array.isArray(daten.eintraege) ? daten.eintraege : [];
      liste = liste.filter(gueltig);
      if (liste.length) zeichnen(liste);
    })
    .catch(function () { /* Platzhalter stehen lassen */ });

  /* Nur Einträge mit mindestens einem Bild aus dem erwarteten Ordner.
     Das verhindert, dass eine fehlerhafte JSON-Datei fremde URLs einschleust. */
  function gueltig(e) {
    return e && typeof e.titel === "string" &&
      Array.isArray(e.bilder) &&
      e.bilder.some(istEigenesBild);
  }

  function istEigenesBild(pfad) {
    return typeof pfad === "string" &&
      pfad.indexOf(BILD_PREFIX) === 0 &&
      pfad.indexOf("..") === -1;
  }

  function zeichnen(liste) {
    var frag = document.createDocumentFragment();

    liste.forEach(function (eintrag) {
      var bilder = eintrag.bilder.filter(istEigenesBild);

      var fig = document.createElement("figure");
      fig.className = "gallery__item";

      var img = document.createElement("img");
      img.className = "gallery__img";
      img.src = bilder[0];
      img.alt = "Referenz: " + eintrag.titel;
      img.loading = "lazy";
      img.decoding = "async";
      fig.appendChild(img);

      if (bilder.length > 1) {
        var badge = document.createElement("span");
        badge.className = "gallery__badge";
        badge.textContent = "+" + (bilder.length - 1);
        fig.appendChild(badge);
        fig.classList.add("is-klickbar");
        fig.tabIndex = 0;
        fig.setAttribute("role", "button");
        fig.setAttribute("aria-label", eintrag.titel + " – alle " + bilder.length + " Fotos ansehen");
        fig.addEventListener("click", function () { lightbox(bilder, eintrag.titel); });
        fig.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); lightbox(bilder, eintrag.titel); }
        });
      }

      var cap = document.createElement("figcaption");
      cap.className = "gallery__cap";

      var titel = document.createElement("strong");
      titel.textContent = eintrag.titel;
      cap.appendChild(titel);

      if (eintrag.beschreibung) {
        var text = document.createElement("span");
        text.textContent = eintrag.beschreibung;
        cap.appendChild(text);
      }

      fig.appendChild(cap);
      frag.appendChild(fig);
    });

    wrap.innerHTML = "";
    wrap.appendChild(frag);
  }

  /* ---------- Einfache Bildergalerie für Einträge mit mehreren Fotos ---------- */
  var box = null, boxImg = null, boxZaehler = null, aktuell = 0, aktuelleBilder = [], vorher = null;

  function lightbox(bilder, titel) {
    if (!box) aufbauen();
    aktuelleBilder = bilder;
    aktuell = 0;
    vorher = document.activeElement;
    box.querySelector(".lb__titel").textContent = titel;
    zeigen(0);
    box.hidden = false;
    document.body.style.overflow = "hidden";
    box.querySelector(".lb__zu").focus();
  }

  function aufbauen() {
    box = document.createElement("div");
    box.className = "lb";
    box.hidden = true;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.innerHTML =
      '<div class="lb__buehne">' +
        '<button type="button" class="lb__zu" aria-label="Schließen">&times;</button>' +
        '<button type="button" class="lb__pfeil lb__pfeil--zurueck" aria-label="Vorheriges Foto">&#8249;</button>' +
        '<img class="lb__bild" alt="" />' +
        '<button type="button" class="lb__pfeil lb__pfeil--vor" aria-label="Nächstes Foto">&#8250;</button>' +
        '<p class="lb__fuss"><span class="lb__titel"></span> <span class="lb__zaehler"></span></p>' +
      '</div>';
    document.body.appendChild(box);

    boxImg = box.querySelector(".lb__bild");
    boxZaehler = box.querySelector(".lb__zaehler");

    box.querySelector(".lb__zu").addEventListener("click", schliessen);
    box.querySelector(".lb__pfeil--zurueck").addEventListener("click", function () { zeigen(aktuell - 1); });
    box.querySelector(".lb__pfeil--vor").addEventListener("click", function () { zeigen(aktuell + 1); });
    box.addEventListener("click", function (ev) { if (ev.target === box) schliessen(); });
    document.addEventListener("keydown", function (ev) {
      if (box.hidden) return;
      if (ev.key === "Escape") schliessen();
      if (ev.key === "ArrowLeft") zeigen(aktuell - 1);
      if (ev.key === "ArrowRight") zeigen(aktuell + 1);
    });
  }

  function zeigen(i) {
    var n = aktuelleBilder.length;
    aktuell = (i + n) % n;
    boxImg.src = aktuelleBilder[aktuell];
    boxZaehler.textContent = (aktuell + 1) + " / " + n;
  }

  function schliessen() {
    box.hidden = true;
    boxImg.removeAttribute("src");
    document.body.style.overflow = "";
    if (vorher && vorher.focus) vorher.focus();
  }
})();
