# OmniGrab – Werbefreier Social Media Downloader (Google Material Design 3)

OmniGrab ist eine moderne Browser-Erweiterung (Manifest V3), mit der du Videos, Tonspuren und Posts von allen großen Social-Media-Plattformen ohne Werbung, Weiterleitungen oder Spam herunterladen kannst. Das Design orientiert sich am offiziellen Google Material 3 (Material You) Design-System.

---

## Highlights

- **100 % Werbefrei**: Keine nervigen Banner, keine Pop-ups, keine Malware.
- **Google Universum Ästhetik**: Material Design 3 Tokens, abgerundete M3 Chips, Google Sans Typografie, dynamischer Dark- & Light-Mode, intuitive M3 Segmented Buttons.
- **Unterstützte Plattformen**:
  - **YouTube**: Videos, Shorts & Musik
  - **Instagram**: Reels, Posts, Stories
  - **TikTok**: Videos ohne Wasserzeichen
  - **Twitter / X**: Videos, GIFs
  - **Reddit**: Videos inklusive Tonspur
  - **SoundCloud**: Musik & Tracks
  - **Pinterest, Vimeo, Facebook** und viele mehr
- **Qualitäts- & Formatwahl**:
  - Video: `1080p Full HD`, `720p HD`, `480p SD`, `Beste Qualität (bis 4K)`
  - Audio: `MP3` (320 kbps), `WAV` (Lossless), `OPUS`, `OGG`
  - Option: Video stummschalten (ohne Ton)
- **Intelligente Tab-Erkennung**: Erkennt automatisch, ob du gerade ein Video auf YouTube, TikTok oder Instagram anschaust und bietet dir die Übernahme mit 1 Klick an.
- **In-Page Media Sniffer**: Erkennt direkt in Webseiten eingebettete `<video>`- und `<audio>`-Streams für sofortigen Download.
- **Download-Verlauf**: Behalte den Überblick über heruntergeladene Dateien und öffne sie direkt im Browser.

---

## Installation in Google Chrome (oder Brave / Edge / Opera)

Die Erweiterung ist sofort einsatzbereit und kann in wenigen Sekunden als entpackte Erweiterung geladen werden:

1. **Google Chrome öffnen** und in die Adresszeile eingeben:
   ```text
   chrome://extensions
   ```
2. Oben rechts den Schalter **„Entwicklermodus“** (Developer Mode) aktivieren.
3. Oben links auf **„Entpackte Erweiterung laden“** (Load unpacked) klicken.
4. Wähle diesen Ordner aus:
   ```text
   ~/dev/omnimedia-downloader
   ```
5. Klicke auf das **Puzzleteil-Symbol** rechts oben in Chrome und **pinne** OmniGrab an deine Leiste.

---

## Bedienung

1. **Automatischer Tab-Download**:
   - Gehe auf ein beliebiges Video (z. B. auf YouTube oder ein Instagram Reel).
   - Klicke auf das OmniGrab-Icon.
   - Klicke auf **„Diesen Link nutzen“**, wähle Video oder Audio und deine Wunschauflösung (z.B. 1080p).
   - Klicke auf **„Herunterladen“**.

2. **Per Link-Einfügen**:
   - Kopiere einen Link von einer beliebigen Plattform in die Zwischenablage.
   - Öffne OmniGrab und klicke auf **„Einfügen“**.
   - Wähle das Format und klicke auf **„Herunterladen“**.

3. **Per Rechtsklick (Kontextmenü)**:
   - Klicke mit der rechten Maustaste auf ein Video oder einen Social-Media-Link.
   - Wähle **„Mit OmniGrab herunterladen“**.

4. **Direkte In-Page Streams (Tab "Auf der Seite")**:
   - Auf Nachrichtenseiten, Blogs oder Portalen mit HTML5-Playern wechselst du im Popup einfach auf den Tab **„Auf der Seite“**.
   - OmniGrab zeigt alle erkannten Medien an und du kannst sie mit einem Klick auf **„Laden“** speichern.

---

## Einstellungen anpassen

Klicke im Popup oben rechts auf das **Zahnrad-Symbol** oder gehe über `Rechtsklick auf das Icon -> Optionen`:
- Standard-Auflösung (1080p, 720p, 480p oder 4K) festlegen
- Standard-Audioformat (MP3, WAV, OPUS)
- Farbschema (System, Hell, Dunkel)
- Eigene Server-Instanz hinterlegen (optional für Power-User)

## Öffentliche Fassung

OmniGrab braucht **keine API-Schlüssel**. Die Erweiterung spricht nur mit der lokalen Engine auf `127.0.0.1:58921`; die lädt über yt-dlp und ffmpeg auf deinem eigenen Rechner. Beachte beim Herunterladen die Nutzungsbedingungen der Plattformen und das Urheberrecht.

*English:* No API keys needed — the extension talks only to the local engine on 127.0.0.1. Respect platform terms and copyright. MIT licensed.
