# Firebase Hosting mit 2 Seiten (Main + Display)

Diese App ist jetzt für **zwei getrennte Hosting-Seiten** konfiguriert:

- `main` → Standard-App (volle Navigation)
- `display` → Gebetszeiten-Anzeige-Modus

## Einmalige Prüfung

Stelle sicher, dass in `.firebaserc` die Site-IDs korrekt sind:

- `main`: `tasbeeh-1e356`
- `display`: `la-gebetszeiten`

Wenn deine zweite Site anders heißt, dort einfach anpassen.

## PowerShell-Befehle

### 1) Nur Standardseite bauen + deployen (`main`)

```powershell
$env:EXPO_PUBLIC_APP_MODE = "full"
npx expo export -p web --output-dir dist-main
firebase deploy --only hosting:main
```

### 2) Nur Gebetszeiten-Seite bauen + deployen (`display`)

```powershell
$env:EXPO_PUBLIC_APP_MODE = "display"
npx expo export -p web --output-dir dist-display
firebase deploy --only hosting:display
```

### 3) Beide Seiten nacheinander deployen

```powershell
$env:EXPO_PUBLIC_APP_MODE = "full"
npx expo export -p web --output-dir dist-main

$env:EXPO_PUBLIC_APP_MODE = "display"
npx expo export -p web --output-dir dist-display

firebase deploy --only hosting
```

## Wichtig

- `APP_MODE` wird beim Build über `EXPO_PUBLIC_APP_MODE` gesetzt.
- Ohne Variable ist der Standard automatisch `full`.
- So kannst du beide Seiten getrennt bauen/deployen, ohne Code hin- und herzuschalten.
