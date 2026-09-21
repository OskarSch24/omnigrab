# Chrome Web Store Listing — OmniGrab

> Last Updated: 2026-09-03

## Store Listing

**Extension Name** [REQUIRED]
OmniGrab – Social Media Downloader

**Short Description** [REQUIRED]
Werbefreier Media Downloader für Videos, Audio und Posts von YouTube, Instagram, TikTok, X, Reddit und mehr im Google Design.

**Detailed Description** [REQUIRED]
OmniGrab ist ein werbefreier, eleganter Social Media Downloader, der sich mit modernem Material Design 3 perfekt in das Google Ökosystem einfügt.

Hauptfunktionen:
- 100% werbefrei: Keine Pop-ups, keine Weiterleitungen, keine dubiosen Weiterleitungsseiten.
- Umfassende Plattform-Unterstützung: Lade Medien von YouTube, Instagram (Reels & Posts), TikTok (ohne Wasserzeichen), Twitter/X, Reddit, Pinterest, SoundCloud, Vimeo und mehr herunter.
- Flexible Qualitätsstufen: Wähle zwischen 1080p Full HD, 720p HD, 480p oder 4K/Beste Qualität.
- Reine Audio-Extraktion: Extrahiere Tonspuren und Musikstücke als MP3 (320 kbps), WAV oder OPUS.
- Intelligente Erkennung: Erkennt automatisch das Video auf dem aktuellen Tab oder scannt direkt eingebettete Web-Streams per In-Page Sniffer.
- Schneller Verlauf: Verwalte deine letzten Downloads direkt im Popup.
- Material You Design: Dynamischer Dark- und Light-Mode mit harmonischen Farben und intuitiver Google-Bedienung.

So verwendest du OmniGrab:
1. Öffne ein Video auf einer beliebigen Plattform (z. B. YouTube oder Instagram).
2. Klicke auf das OmniGrab-Symbol in deiner Browserleiste.
3. Klicke auf "Diesen Link nutzen" oder füge einen Link per Klick ein.
4. Wähle dein gewünschtes Format (Video oder Audio) und die Qualität.
5. Klicke auf "Herunterladen" – fertig!

Datenschutz & Sicherheit:
OmniGrab sammelt keine personenbezogenen Daten, trackt nicht dein Surfverhalten und blendet niemals Werbung ein. Alle Einstellungen werden lokal im Browser gespeichert.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Ermöglicht das werbefreie Herunterladen von Videos und Audiodateien von Social-Media-Plattformen und Webseiten in verschiedenen Qualitäten.

**Primary Language** [REQUIRED]
German

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | icons/icon-128.png |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| downloads | permissions | Ermöglicht das Speichern der ausgewählten Video- und Audiodateien im Download-Ordner des Nutzers. |
| tabs | permissions | Wird benötigt, um die URL und den Titel des aktiven Tabs auszulesen, damit der Nutzer nicht manuell kopieren und einfügen muss. |
| activeTab | permissions | Gewährt temporären Zugriff auf den aktuellen Tab zur Erkennung eingebetteter Medien beim Öffnen des Popups. |
| storage | permissions | Speichert Nutzerpräferenzen (Standard-Auflösung, Theme, Audio-Format) sowie die lokale Download-Historie. |
| contextMenus | permissions | Ermöglicht das Herunterladen per Rechtsklick auf Links oder Videostreams ("Mit OmniGrab herunterladen"). |
| scripting | permissions | Führt den In-Page Scanner aus, um nativ eingebettete Video- und Audio-Tags auf der aktiven Webseite zu finden. |
| https://*/* | host_permissions | Notwendig zur Kommunikation mit den werbefreien Download-APIs und zum Herunterladen von Mediendateien über sichere HTTPS-Verbindungen. |
| http://*/* | host_permissions | Notwendig für den Download von Medien-Streams auf HTTP-Servern oder lokalen Testinstanzen. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-09-03 | Initialer Release: Werbefreier Multi-Plattform Downloader mit Google Material You UI. | Draft |
