# Firestore Kompatibilitäts- & Sicherheitsprüfung (Final)

## Ziel
Maximale **Kompatibilität** mit der bestehenden App (kein Flow-Break) bei gleichzeitiger Härtung gegenüber Open-Test-Mode.

## Verifizierte kritische Schreibmuster (Spread/UI-Hilfsfelder)

### `admin_accounts_global` (kritisch)
- `loadAdminAccounts` ergänzt geladene Docs lokal um UI-Feld `key`.
- `updateManagedPermissions` schreibt danach `...account` zurück -> kann `key` in Firestore mitschreiben.
- Weitere Writes nutzen ebenfalls komplette Objekte via Spread (`...existing`, `...fallbackAccount`, `...(currentAccount||{})`, `...currentAccount`).
- Konsequenz: **striktes `hasOnly(...)` ist hier nicht sicher kompatibel**.

## Collection-by-Collection Kompatibilitätsbewertung

| Collection | Read | Create/Update | Delete | Striktes `hasOnly(...)` sicher kompatibel? | `request.auth` ohne Funktionsbruch möglich? | Besondere Risiken |
|---|---|---|---|---|---|---|
| `admin_accounts_global` | ✅ | ✅ | ✅ | **Nein** | **Nein** | UI-Feld `key`, mehrere `...obj`-Writes, Pre-Auth-Zugriffe |
| `prayer_time_overrides*` | ✅ | ✅ | ✅ (`pending_next_day`) | Ja (vorsichtig) | Nein (aktuell nicht erzwungen) | `global` + `pending_next_day`, optional `dateISO` |
| `prayer_announcements*` | ✅ | ✅ | ❌ | Ja | Nein (aktuell nicht erzwungen) | nur Doc `current` |
| `program_configs*` | ✅ | ✅ | ✅ | Ja | Nein (aktuell nicht erzwungen) | Doc-ID ist ISO-Datum |
| `attendance_daily*` | ✅ (inkl. List) | ✅ | ❌ | **Nein** | Nein | List-Reads dürfen nicht per DocID-Regex eingeschränkt werden (sonst KW/Datum-Listen brechen) |
| `attendance_program_daily*` | ✅ | ✅ | ❌ | Nein (geringer Nutzen) | Nein | rein transform/increment mit dynamischen Pfaden |
| `attendance_member_entries*` | ✅ | ✅ | ❌ | Ja | Nein | feste Payloads, optional `name` |
| `attendance_program_entries*` | ✅ | ✅ | ❌ | Ja | Nein | feste Payloads, optional `name` |
| `attendance_qr_device_registrations` | ✅ | ✅ | ❌ | Ja | Nein | Doc-ID = `browserDeviceId` |

## Konkrete Stellen, die mit dem früheren strikten Vorschlag `permission-denied` auslösen können

1. `admin_accounts_global` Rechte-Update (`...account`) inkl. möglichem UI-Feld `key`.
2. `admin_accounts_global` weitere Flows mit Spread kompletter Objekte (unbekannte Alt-/Zusatzfelder).
3. `attendance_daily*` schreibt mit `...existing` den kompletten bisherigen Dokumentinhalt zurück.

4. `attendance_daily*` Read mit `docId`-Regex kann Collection-`list` blockieren (KW/Datum in Stats), sobald irgendein nicht passendes Doc im Collection-Scope existiert.

## `admin_accounts_global` und Auth-Zwang (`request.auth != null`)

### Wird vor Login gelesen/geschrieben/gelöscht?
Ja.
- Vor erfolgreichem Firebase-Login wird im lokalen Login-Fallback `admin_accounts_global` gelesen.
- Beim Bootstrap kann `admin_accounts_global` geschrieben werden.

### Würde `request.auth != null` die App brechen?
**Ja**, mit hoher Wahrscheinlichkeit.
- Lokaler Fallback-Login liest Accounts ohne vorausgesetzte gültige Firebase-Session.
- Bootstrap/Recovery-Pfade können vor stabiler Session laufen.

➡️ Daher im finalen kompatiblen Ruleset **kein Auth-Zwang** auf `admin_accounts_global`.

---

# Finaler Firestore Rules Block (kompatibel + gehärtet)

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isIsoDate(v) {
      return v is string && v.matches('^\\d{4}-\\d{2}-\\d{2}$');
    }

    function isScopedCollection(c, base) {
      return c == base
        || c == base + '_NUUR'
        || c == base + '_RO'
        || c == base + '_HO';
    }

    function isPrayerOverrideCollection(c) {
      return isScopedCollection(c, 'prayer_time_overrides');
    }

    function isAnnouncementCollection(c) {
      return isScopedCollection(c, 'prayer_announcements');
    }

    function isProgramConfigCollection(c) {
      return isScopedCollection(c, 'program_configs');
    }

    function isAttendanceDailyCollection(c) {
      return isScopedCollection(c, 'attendance_daily');
    }

    function isProgramDailyCollection(c) {
      return isScopedCollection(c, 'attendance_program_daily');
    }

    function isMemberEntriesCollection(c) {
      return isScopedCollection(c, 'attendance_member_entries');
    }

    function isProgramEntriesCollection(c) {
      return isScopedCollection(c, 'attendance_program_entries');
    }

    function isAllowedQrRegistrationDoc(deviceId) {
      return request.resource.data.keys().hasOnly([
        'browserDeviceId', 'idNumber', 'tanzeem', 'majlis', 'mosqueKey', 'updatedAt', 'createdAt'
      ])
      && request.resource.data.browserDeviceId == deviceId;
    }

    // prayer_time_overrides*
    match /{collection}/{docId} {
      allow read: if isPrayerOverrideCollection(collection)
                  && (docId == 'global' || docId == 'pending_next_day');

      allow create, update: if isPrayerOverrideCollection(collection)
                            && (docId == 'global' || docId == 'pending_next_day')
                            && request.resource.data.keys().hasOnly([
                              'enabled', 'soharAsrTime', 'maghribIshaaTime', 'manualTimes', 'updatedAt', 'dateISO'
                            ])
                            && (!('dateISO' in request.resource.data) || isIsoDate(request.resource.data.dateISO));

      allow delete: if isPrayerOverrideCollection(collection)
                    && docId == 'pending_next_day';
    }

    // prayer_announcements*
    match /{collection}/{docId} {
      allow read: if isAnnouncementCollection(collection) && docId == 'current';

      allow create, update: if isAnnouncementCollection(collection)
                            && docId == 'current'
                            && request.resource.data.keys().hasOnly(['text', 'updatedAt'])
                            && request.resource.data.text is string;

      allow delete: if false;
    }

    // program_configs*
    match /{collection}/{docId} {
      allow read: if isProgramConfigCollection(collection) && isIsoDate(docId);

      allow create, update: if isProgramConfigCollection(collection)
                            && isIsoDate(docId)
                            && request.resource.data.keys().hasOnly(['name', 'startTime', 'updatedAt'])
                            && request.resource.data.name is string
                            && request.resource.data.startTime is string;

      allow delete: if isProgramConfigCollection(collection) && isIsoDate(docId);
    }

    // attendance_daily* (bewusst ohne strikte Feldvalidierung wegen ...existing und dynamischen Pfaden)
    // WICHTIG: read darf hier NICHT an docId-Regex hängen, sonst scheitern Collection-Listings
    // (z. B. KW-/Datumslisten in Stats), wenn alte/abweichende Doc-IDs existieren.
    match /{collection}/{docId} {
      allow read: if isAttendanceDailyCollection(collection);
      allow create, update: if isAttendanceDailyCollection(collection) && isIsoDate(docId);
      allow delete: if false;
    }

    // attendance_program_daily* (dynamische increment-Pfade)
    match /{collection}/{docId} {
      allow read: if isProgramDailyCollection(collection)
                  && docId.matches('^\\d{4}-\\d{2}-\\d{2}_.+$');
      allow create, update: if isProgramDailyCollection(collection)
                            && docId.matches('^\\d{4}-\\d{2}-\\d{2}_.+$');
      allow delete: if false;
    }

    // attendance_member_entries*
    match /{collection}/{docId} {
      allow read: if isMemberEntriesCollection(collection);

      allow create, update: if isMemberEntriesCollection(collection)
                            && request.resource.data.keys().hasOnly([
                              'type', 'date', 'prayer', 'programName', 'majlis', 'tanzeem', 'idNumber', 'name', 'timestamp'
                            ])
                            && request.resource.data.type is string
                            && request.resource.data.date is string
                            && request.resource.data.tanzeem is string
                            && request.resource.data.majlis is string
                            && request.resource.data.idNumber is string
                            && request.resource.data.timestamp is string;

      allow delete: if false;
    }

    // attendance_program_entries*
    match /{collection}/{docId} {
      allow read: if isProgramEntriesCollection(collection);

      allow create, update: if isProgramEntriesCollection(collection)
                            && request.resource.data.keys().hasOnly([
                              'type', 'date', 'prayer', 'programName', 'majlis', 'tanzeem', 'idNumber', 'name', 'timestamp'
                            ])
                            && request.resource.data.type is string
                            && request.resource.data.date is string
                            && request.resource.data.tanzeem is string
                            && request.resource.data.majlis is string
                            && request.resource.data.idNumber is string
                            && request.resource.data.timestamp is string;

      allow delete: if false;
    }

    // attendance_qr_device_registrations (global)
    match /attendance_qr_device_registrations/{deviceId} {
      allow read: if true;
      allow create, update: if isAllowedQrRegistrationDoc(deviceId);
      allow delete: if false;
    }

    // admin_accounts_global (global, bewusst kompatibel gehalten)
    // KEIN hasOnly(...) und KEIN request.auth-Zwang, um bestehende Flows nicht zu brechen.
    match /admin_accounts_global/{nameKey} {
      allow read: if true;
      allow create, update: if true;
      allow delete: if true;
    }

    // Alles andere blockieren.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```
