import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Alert,
  Animated,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Vibration,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

const STORAGE_KEYS = {
  darkMode: '@tasbeeh_darkmode',
};

const CITY = 'Bait-Us-Sabuh';
const APP_LOGO_LIGHT = require('./assets/Icon3.png');
const APP_LOGO_DARK = require('./assets/Icon5.png');
const FORCE_TIME = null;
// const FORCE_TIME = '05:31'; // development override for testing
const TERMINAL_LOCATIONS = [
  'Baitus Sabuh Nord',
  'Baitus Sabuh Süd',
  'Bad Vilbel',
  'Berg',
  'Bornheim',
  'Eschersheim',
  'Griesheim',
  'Ginnheim',
  'Goldstein',
  'Hausen',
  'Höchst',
  'Nied',
  'Nordweststadt',
  'Nuur Moschee',
  'Riedberg',
  'Rödelheim',
  'Zeilsheim',
];
const TAB_ITEMS = [
  { key: 'gebetsplan', label: 'Gebetszeiten' },
  { key: 'terminal', label: 'Anwesenheit' },
  { key: 'stats', label: 'Stats' },
  { key: 'settings', label: '⚙️' },
];

const PRAYER_LABELS = {
  fajr: 'Fajr',
  sohar: 'Sohar',
  asr: 'Asr',
  maghrib: 'Maghrib',
  ishaa: 'Ishaa & Taravih',
};

const MAJLIS_LABELS = {
  baitus_sabuh_nord: 'Baitus Sabuh Nord',
  baitus_sabuh_sued: 'Baitus Sabuh Süd',
  bad_vilbel: 'Bad Vilbel',
  berg: 'Berg',
  bornheim: 'Bornheim',
  eschersheim: 'Eschersheim',
  griesheim: 'Griesheim',
  ginnheim: 'Ginnheim',
  goldstein: 'Goldstein',
  hausen: 'Hausen',
  hoechst: 'Höchst',
  nied: 'Nied',
  nordweststadt: 'Nordweststadt',
  nuur_moschee: 'Nuur Moschee',
  riedberg: 'Riedberg',
  roedelheim: 'Rödelheim',
  zeilsheim: 'Zeilsheim',
};

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyC_Kz1Cxs-HQ5G994mBztV_ADlAHYsgDKs',
  authDomain: 'tasbeeh-1e356.firebaseapp.com',
  projectId: 'tasbeeh-1e356',
  storageBucket: 'tasbeeh-1e356.firebasestorage.app',
  messagingSenderId: '839190734965',
  appId: '1:839190734965:web:6bef9b34edf1f0b84cb03c',
  measurementId: 'G-908CPHGR56',
};
// Security note: Firestore Rules should strictly limit allowed writes (e.g. only specific counter increments on allowed collections).

const FIXED_TIMES = {
  fajr: '05:30',
  sohar: '13:30',
  asr: '16:00',
  maghrib: '18:45',
  ishaa: '20:00',
  jumma: '13:15',
};

const PRAYER_OVERRIDE_COLLECTION = 'prayer_time_overrides';
const RAMADAN_END_ISO = '2026-03-19';

const RAMADAN_RAW = {
  '2026-02-19': { sehriEnd: '05:58', iftar: '17:49' },
  '2026-02-20': { sehriEnd: '05:56', iftar: '17:51' },
  '2026-02-21': { sehriEnd: '05:54', iftar: '17:53' },
  '2026-02-22': { sehriEnd: '05:52', iftar: '17:55' },
  '2026-02-23': { sehriEnd: '05:50', iftar: '17:56' },
  '2026-02-24': { sehriEnd: '05:48', iftar: '17:58' },
  '2026-02-25': { sehriEnd: '05:46', iftar: '18:00' },
  '2026-02-26': { sehriEnd: '05:44', iftar: '18:01' },
  '2026-02-27': { sehriEnd: '05:42', iftar: '18:03' },
  '2026-02-28': { sehriEnd: '05:40', iftar: '18:05' },
  '2026-03-01': { sehriEnd: '05:38', iftar: '18:06' },
  '2026-03-02': { sehriEnd: '05:36', iftar: '18:08' },
  '2026-03-03': { sehriEnd: '05:34', iftar: '18:10' },
  '2026-03-04': { sehriEnd: '05:32', iftar: '18:11' },
  '2026-03-05': { sehriEnd: '05:29', iftar: '18:13' },
  '2026-03-06': { sehriEnd: '05:27', iftar: '18:15' },
  '2026-03-07': { sehriEnd: '05:25', iftar: '18:16' },
  '2026-03-08': { sehriEnd: '05:23', iftar: '18:18' },
  '2026-03-09': { sehriEnd: '05:21', iftar: '18:20' },
  '2026-03-10': { sehriEnd: '05:19', iftar: '18:21' },
  '2026-03-11': { sehriEnd: '05:17', iftar: '18:23' },
  '2026-03-12': { sehriEnd: '05:15', iftar: '18:24' },
  '2026-03-13': { sehriEnd: '05:12', iftar: '18:26' },
  '2026-03-14': { sehriEnd: '05:10', iftar: '18:28' },
  '2026-03-15': { sehriEnd: '05:08', iftar: '18:29' },
  '2026-03-16': { sehriEnd: '05:06', iftar: '18:31' },
  '2026-03-17': { sehriEnd: '05:04', iftar: '18:32' },
  '2026-03-18': { sehriEnd: '05:02', iftar: '18:34' },
  '2026-03-19': { sehriEnd: '04:59', iftar: '18:36' },
};

const THEME = {
  light: { bg: '#F4F4F5', card: '#FFFFFF', border: '#E4E4E7', text: '#09090B', muted: '#71717A', button: '#111827', buttonText: '#FFFFFF', rowActiveBg: '#ECFDF3', rowActiveBorder: '#86EFAC', chipBg: '#ECFDF3', chipText: '#166534' },
  dark: { bg: '#09090B', card: '#111827', border: '#374151', text: '#F9FAFB', muted: '#9CA3AF', button: '#F9FAFB', buttonText: '#111827', rowActiveBg: '#052E1B', rowActiveBorder: '#22C55E', chipBg: '#14532D', chipText: '#BBF7D0' },
};

const DAY_NAMES_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const pad = (n) => String(n).padStart(2, '0');
const toISO = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseISO = (iso) => (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? null : new Date(`${iso}T00:00:00`));
const isValidTime = (value) => /^\d{2}:\d{2}$/.test(value || '') && Number(value.slice(0, 2)) <= 23 && Number(value.slice(3)) <= 59;
const addMinutes = (time, minutes) => {
  if (!isValidTime(time)) return '—';
  const [h, m] = time.split(':').map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};
const germanDateLong = (date) => new Intl.DateTimeFormat('de-DE', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
const germanWeekdayDateLong = (date) => new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
const findClosestISO = (targetISO, availableISOs) => {
  const target = parseISO(targetISO);
  if (!target || availableISOs.length === 0) return null;
  const sorted = [...availableISOs].sort();
  if (targetISO <= sorted[0]) return sorted[0];
  if (targetISO >= sorted[sorted.length - 1]) return sorted[sorted.length - 1];
  return sorted.reduce((closest, iso) => {
    const d = parseISO(iso); const prev = parseISO(closest);
    return Math.abs(d - target) < Math.abs(prev - target) ? iso : closest;
  }, sorted[0]);
};

const buildPrayerTimes = (raw, isRamadanWindow = false) => ({
  fajr: isRamadanWindow ? addMinutes(raw?.sehriEnd, 20) : FIXED_TIMES.fajr,
  sohar: FIXED_TIMES.sohar,
  asr: FIXED_TIMES.asr,
  maghrib: isRamadanWindow ? addMinutes(raw?.iftar, 10) : FIXED_TIMES.maghrib,
  ishaa: FIXED_TIMES.ishaa,
  jumma: FIXED_TIMES.jumma,
});

const applyManualPrayerAdjustments = (baseTimes, overrideConfig) => {
  const manual = overrideConfig?.manualTimes || {};
  const next = { ...baseTimes };
  ['fajr', 'sohar', 'asr', 'maghrib', 'ishaa', 'jumma'].forEach((key) => {
    if (isValidTime(manual[key])) next[key] = manual[key];
  });
  return next;
};

const applyPrayerTimeOverride = (baseTimes, overrideConfig) => {
  if (!overrideConfig?.enabled) return baseTimes;
  const next = { ...baseTimes };
  if (isValidTime(overrideConfig.soharAsrTime)) {
    next.sohar = overrideConfig.soharAsrTime;
    next.asr = overrideConfig.soharAsrTime;
  }
  if (isValidTime(overrideConfig.maghribIshaaTime)) {
    next.maghrib = overrideConfig.maghribIshaaTime;
    next.ishaa = overrideConfig.maghribIshaaTime;
  }
  return next;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const atMinutesOfDay = (baseDate, minutesOfDay) => {
  const date = new Date(baseDate);
  date.setHours(0, 0, 0, 0);
  date.setMinutes(minutesOfDay, 0, 0);
  return date;
};

const getBerlinNow = () => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const byType = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    return new Date(
      Number(byType.year),
      Number(byType.month) - 1,
      Number(byType.day),
      Number(byType.hour),
      Number(byType.minute),
      Number(byType.second),
      0,
    );
  } catch {
    return new Date();
  }
};

const getGermanHour = () => {
  try {
    const parts = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', hour12: false }).formatToParts(new Date());
    const hour = Number.parseInt(parts.find((part) => part.type === 'hour')?.value || '', 10);
    if (!Number.isNaN(hour)) return hour;
  } catch {}
  return new Date().getHours();
};
const isGermanNightDefault = () => { const h = getGermanHour(); return h >= 22 || h < 6; };
const hasFirebaseConfig = () => FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.apiKey && !String(FIREBASE_CONFIG.projectId).includes('YOUR_') && !String(FIREBASE_CONFIG.apiKey).includes('YOUR_');
const withPressEffect = (style) => ({ pressed }) => [style, pressed && styles.buttonPressed];

const toFirestoreValue = (value) => {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === 'object') {
    const fields = {};
    Object.entries(value).forEach(([k, v]) => { fields[k] = toFirestoreValue(v); });
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
};

const fromFirestoreValue = (v) => {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.mapValue) {
    const out = {};
    Object.entries(v.mapValue.fields || {}).forEach(([k, val]) => { out[k] = fromFirestoreValue(val); });
    return out;
  }
  if (v.arrayValue) return (v.arrayValue.values || []).map(fromFirestoreValue);
  return null;
};

const normalizePrayerOverride = (data) => ({
  enabled: Boolean(data?.enabled),
  soharAsrTime: isValidTime(data?.soharAsrTime) ? data.soharAsrTime : null,
  maghribIshaaTime: isValidTime(data?.maghribIshaaTime) ? data.maghribIshaaTime : null,
  manualTimes: {
    fajr: isValidTime(data?.manualTimes?.fajr) ? data.manualTimes.fajr : '',
    sohar: isValidTime(data?.manualTimes?.sohar) ? data.manualTimes.sohar : '',
    asr: isValidTime(data?.manualTimes?.asr) ? data.manualTimes.asr : '',
    maghrib: isValidTime(data?.manualTimes?.maghrib) ? data.manualTimes.maghrib : '',
    ishaa: isValidTime(data?.manualTimes?.ishaa) ? data.manualTimes.ishaa : '',
  },
  updatedAt: data?.updatedAt || null,
});


const docUrl = (collection, id) => `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/${collection}/${id}?key=${FIREBASE_CONFIG.apiKey}`;
const commitUrl = () => `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents:commit?key=${FIREBASE_CONFIG.apiKey}`;
const loadFirebaseRuntime = () => {
  try {
    const { getApp, getApps, initializeApp } = require('firebase/app');
    const { doc, getFirestore, onSnapshot } = require('firebase/firestore');
    const firebaseApp = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
    return { db: getFirestore(firebaseApp), doc, onSnapshot };
  } catch {
    return null;
  }
};

const firebaseRuntime = hasFirebaseConfig() ? loadFirebaseRuntime() : null;

async function incrementDocCounters(collection, id, fieldPaths) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const document = `projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/${collection}/${id}`;
  const body = {
    writes: [{
      transform: {
        document,
        fieldTransforms: [
          ...fieldPaths.map((fieldPath) => ({ fieldPath, increment: { integerValue: '1' } })),
          { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
        ],
      },
    }],
  };
  const res = await fetch(commitUrl(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('Firestore increment failed');
}

async function getDocData(collection, id) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const res = await fetch(docUrl(collection, id));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Firestore read failed');
  const json = await res.json();
  return fromFirestoreValue({ mapValue: { fields: json.fields || {} } });
}

async function setDocData(collection, id, data) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const body = { fields: toFirestoreValue(data).mapValue.fields };
  const res = await fetch(docUrl(collection, id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('Firestore write failed');
}

async function deleteDocData(collection, id) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const res = await fetch(docUrl(collection, id), { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error('Firestore delete failed');
}

const toLocationKey = (name) => name
  .toLowerCase()
  .replace(/ä/g, 'ae')
  .replace(/ö/g, 'oe')
  .replace(/ü/g, 'ue')
  .replace(/ß/g, 'ss')
  .replace(/[^a-z0-9\s]/g, '')
  .trim()
  .replace(/\s+/g, '_');

const getNextPrayer = (now, timesToday) => {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const entries = [
    ['fajr', timesToday.fajr],
    ['sohar', timesToday.sohar],
    ['asr', timesToday.asr],
    ['maghrib', timesToday.maghrib],
    ['ishaa', timesToday.ishaa],
  ].map(([name, t]) => ({ name, t, mins: isValidTime(t) ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) : null }));
  const next = entries.find((entry) => entry.mins !== null && entry.mins >= nowMinutes);
  return (next || entries[0]).name;
};

const getDisplayPrayerLabel = (key, timesToday) => {
  const soharAsrMerged = isValidTime(timesToday?.sohar) && timesToday?.sohar === timesToday?.asr;
  const maghribIshaaMerged = isValidTime(timesToday?.maghrib) && timesToday?.maghrib === timesToday?.ishaa;
  if (soharAsrMerged && key === 'sohar') return 'Sohar/Asr';
  if (soharAsrMerged && key === 'asr') return 'Sohar/Asr';
  if (maghribIshaaMerged && key === 'maghrib') return 'Maghrib/Ishaa';
  if (maghribIshaaMerged && key === 'ishaa') return 'Maghrib/Ishaa';
  return PRAYER_LABELS[key] || key;
};


function AppContent() {
  const [activeTab, setActiveTab] = useState('gebetsplan');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [terminalMode, setTerminalMode] = useState('tanzeem');
  const [selectedTanzeem, setSelectedTanzeem] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [toast, setToast] = useState('');
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsAttendance, setStatsAttendance] = useState(null);
  const [prayerOverride, setPrayerOverride] = useState(normalizePrayerOverride(null));
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideSoharAsrTime, setOverrideSoharAsrTime] = useState('');
  const [overrideMaghribIshaaTime, setOverrideMaghribIshaaTime] = useState('');
  const [manualFajrTime, setManualFajrTime] = useState('');
  const [manualSoharTime, setManualSoharTime] = useState('');
  const [manualAsrTime, setManualAsrTime] = useState('');
  const [manualMaghribTime, setManualMaghribTime] = useState('');
  const [manualIshaaTime, setManualIshaaTime] = useState('');

  const themePulseAnim = useRef(new Animated.Value(1)).current;
  const terminalLastCountRef = useRef(0);
  const visitorCounterRef = useRef(0);
  const statsPayloadRef = useRef('');

  const theme = isDarkMode ? THEME.dark : THEME.light;
  const insets = useSafeAreaInsets();
  const logoSource = isDarkMode ? APP_LOGO_DARK : APP_LOGO_LIGHT;
  const now = useMemo(() => {
    const d = getBerlinNow();
    if (isValidTime(FORCE_TIME)) {
      d.setHours(Number(FORCE_TIME.slice(0, 2)), Number(FORCE_TIME.slice(3)), 0, 0);
    }
    return d;
  }, [refreshTick]);
  const todayISO = toISO(now);
  const availableDates = useMemo(() => Object.keys(RAMADAN_RAW).sort(), []);
  const isRamadanPeriodToday = todayISO <= RAMADAN_END_ISO;
  const selectedISO = useMemo(() => (isRamadanPeriodToday ? (RAMADAN_RAW[todayISO] ? todayISO : findClosestISO(todayISO, availableDates)) : null), [todayISO, availableDates, isRamadanPeriodToday]);
  const selectedDate = selectedISO ? parseISO(selectedISO) : now;
  const selectedRaw = selectedISO ? RAMADAN_RAW[selectedISO] : null;
  const hasTodayData = !isRamadanPeriodToday || Boolean(RAMADAN_RAW[todayISO]);

  const baseTimesToday = useMemo(() => buildPrayerTimes(selectedRaw, isRamadanPeriodToday), [selectedRaw, isRamadanPeriodToday]);
  const timesToday = useMemo(() => {
    const withManual = applyManualPrayerAdjustments(baseTimesToday, prayerOverride);
    return applyPrayerTimeOverride(withManual, prayerOverride);
  }, [baseTimesToday, prayerOverride]);
  const tomorrowISO = useMemo(() => toISO(addDays(now, 1)), [now]);
  const isRamadanPeriodTomorrow = useMemo(() => tomorrowISO <= RAMADAN_END_ISO, [tomorrowISO]);
  const tomorrowRaw = useMemo(() => (isRamadanPeriodTomorrow ? (RAMADAN_RAW[tomorrowISO] || null) : null), [tomorrowISO, isRamadanPeriodTomorrow]);
  const timesTomorrow = useMemo(() => buildPrayerTimes(tomorrowRaw, isRamadanPeriodTomorrow), [tomorrowRaw, isRamadanPeriodTomorrow]);
  const nextPrayer = useMemo(() => getNextPrayer(now, timesToday), [now, timesToday]);

  const soharAsrMergedToday = isValidTime(timesToday.sohar) && timesToday.sohar === timesToday.asr;
  const maghribIshaaMergedToday = isValidTime(timesToday.maghrib) && timesToday.maghrib === timesToday.ishaa;
  const hasSoharAsrOverrideToday = isValidTime(prayerOverride.soharAsrTime);
  const hasMaghribIshaaOverrideToday = isValidTime(prayerOverride.maghribIshaaTime);

  const prayerRows = useMemo(() => [
    { id: 'fajr', label: 'Fajr (الفجر)', time: timesToday.fajr, activeKeys: ['fajr'] },
    ...(soharAsrMergedToday
      ? [{ id: 'sohar_asr', label: 'Sohar/Asr (الظهر/العصر)', time: timesToday.sohar, activeKeys: ['sohar', 'asr'] }]
      : [
        { id: 'sohar', label: 'Sohar (الظهر)', time: timesToday.sohar, activeKeys: ['sohar'] },
        { id: 'asr', label: 'Asr (العصر)', time: timesToday.asr, activeKeys: ['asr'] },
      ]),
    ...(maghribIshaaMergedToday
      ? [{ id: 'maghrib_ishaa', label: 'Maghrib/Ishaa (المغرب/العشاء)', time: timesToday.maghrib, activeKeys: ['maghrib', 'ishaa'] }]
      : [
        { id: 'maghrib', label: 'Maghrib (المغرب)', time: timesToday.maghrib, activeKeys: ['maghrib'] },
        { id: 'ishaa', label: 'Ishaa & Taravih (العشاء / التراويح)', time: timesToday.ishaa, activeKeys: ['ishaa'] },
      ]),
    { id: 'jumma', label: 'Jumma (الجمعة)', time: timesToday.jumma, activeKeys: ['jumma'] },
  ], [timesToday, soharAsrMergedToday, maghribIshaaMergedToday]);

  const activePrayerKey = useMemo(() => {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const sequence = [
      { key: 'fajr', time: timesToday.fajr },
      { key: 'sohar', time: timesToday.sohar },
      { key: 'asr', time: timesToday.asr },
      { key: 'maghrib', time: timesToday.maghrib },
      { key: 'ishaa', time: timesToday.ishaa },
    ];
    const active = sequence.find((item) => {
      const mins = isValidTime(item.time) ? (Number(item.time.slice(0, 2)) * 60 + Number(item.time.slice(3))) : null;
      return mins !== null && nowMinutes >= mins - 30 && nowMinutes <= mins + 60;
    });
    return active?.key || null;
  }, [now, timesToday]);

  const getMinutes = (time) => (isValidTime(time) ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : null);
  const formatMinutes = (mins) => `${pad(Math.floor((((mins % 1440) + 1440) % 1440) / 60))}:${pad((((mins % 1440) + 1440) % 1440) % 60)}`;

  const resolvePrayerWindow = (referenceNow, referenceTimesToday, referenceTimesTomorrow) => {
    const nowMinutes = referenceNow.getHours() * 60 + referenceNow.getMinutes();
    const sequence = [
      { key: 'fajr', label: getDisplayPrayerLabel('fajr', referenceTimesToday), time: referenceTimesToday.fajr },
      { key: 'sohar', label: getDisplayPrayerLabel('sohar', referenceTimesToday), time: referenceTimesToday.sohar },
      { key: 'asr', label: getDisplayPrayerLabel('asr', referenceTimesToday), time: referenceTimesToday.asr },
      { key: 'maghrib', label: getDisplayPrayerLabel('maghrib', referenceTimesToday), time: referenceTimesToday.maghrib },
      { key: 'ishaa', label: getDisplayPrayerLabel('ishaa', referenceTimesToday), time: referenceTimesToday.ishaa },
    ];
    const active = sequence.find((item) => {
      const base = getMinutes(item.time);
      if (base === null) return false;
      const start = base - 30;
      const end = base + 60;
      return nowMinutes >= start && nowMinutes <= end;
    });
    const nextKeyToday = getNextPrayer(referenceNow, referenceTimesToday);
    const nextToday = sequence.find((item) => item.key === nextKeyToday) || sequence[0];
    const todayHasUpcomingPrayer = sequence.some((item) => {
      const mins = getMinutes(item.time);
      return mins !== null && mins >= nowMinutes;
    });
    const nextPrayerTime = todayHasUpcomingPrayer ? (nextToday?.time || '—') : (referenceTimesTomorrow.fajr || '—');
    const nextLabel = todayHasUpcomingPrayer
      ? `${nextToday?.label || '—'} - ${nextPrayerTime}`
      : `${getDisplayPrayerLabel('fajr', referenceTimesTomorrow)} - ${nextPrayerTime}`;
    const nextWindowStartMinutes = todayHasUpcomingPrayer
      ? ((getMinutes(nextPrayerTime) ?? 0) - 30)
      : (((getMinutes(nextPrayerTime) ?? 0) - 30) + 1440);
    const minutesUntilNextWindow = Math.max(0, nextWindowStartMinutes - nowMinutes);
    if (active) {
      const base = getMinutes(active.time);
      return {
        isActive: true,
        prayerKey: active.key,
        prayerLabel: active.label,
        prayerTime: active.time,
        windowLabel: `${formatMinutes(base - 30)} – ${formatMinutes(base + 60)}`,
        nextLabel,
        nextPrayerTime,
        minutesUntilNextWindow,
      };
    }
    return {
      isActive: false,
      prayerKey: null,
      prayerLabel: null,
      prayerTime: null,
      windowLabel: null,
      nextLabel,
      nextPrayerTime,
      minutesUntilNextWindow,
    };
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 1800);
    return () => clearTimeout(t);
  }, [toast]);


  useEffect(() => {
    let cancelled = false;
    setOverrideLoading(true);

    const applyOverride = (data) => {
      const normalized = normalizePrayerOverride(data);
      if (cancelled) return;
      setPrayerOverride(normalized);
      setOverrideEnabled(normalized.enabled);
      setOverrideSoharAsrTime(normalized.soharAsrTime || '');
      setOverrideMaghribIshaaTime(normalized.maghribIshaaTime || '');
      setManualFajrTime(normalized.manualTimes.fajr || '');
      setManualSoharTime(normalized.manualTimes.sohar || '');
      setManualAsrTime(normalized.manualTimes.asr || '');
      setManualMaghribTime(normalized.manualTimes.maghrib || '');
      setManualIshaaTime(normalized.manualTimes.ishaa || '');
      setOverrideLoading(false);
    };

    if (!firebaseRuntime || !hasFirebaseConfig()) {
      getDocData(PRAYER_OVERRIDE_COLLECTION, todayISO)
        .then((data) => applyOverride(data))
        .catch(() => {
          if (!cancelled) {
            setOverrideLoading(false);
            setToast('Override konnte nicht geladen werden');
          }
        });
      return () => {
        cancelled = true;
      };
    }

    const overrideRef = firebaseRuntime.doc(firebaseRuntime.db, PRAYER_OVERRIDE_COLLECTION, todayISO);
    const unsubscribe = firebaseRuntime.onSnapshot(
      overrideRef,
      (snapshot) => applyOverride(snapshot.exists() ? snapshot.data() : null),
      () => {
        if (!cancelled) {
          setOverrideLoading(false);
          setToast('Override konnte nicht geladen werden');
        }
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [todayISO]);

  const onOverrideEnabledChange = (value) => {
    setOverrideEnabled(value);
    if (!value) {
      setOverrideSoharAsrTime('');
      setOverrideMaghribIshaaTime('');
    }
  };

  const savePrayerOverride = async () => {
    const cleanSoharAsr = overrideSoharAsrTime.trim();
    const cleanMaghribIshaa = overrideMaghribIshaaTime.trim();

    if (cleanSoharAsr && !isValidTime(cleanSoharAsr)) {
      Alert.alert('Ungültige Zeit', 'Sohar+Asr muss im Format HH:MM sein.');
      return;
    }
    if (cleanMaghribIshaa && !isValidTime(cleanMaghribIshaa)) {
      Alert.alert('Ungültige Zeit', 'Maghrib+Ishaa muss im Format HH:MM sein.');
      return;
    }

    const payload = {
      enabled: overrideEnabled,
      soharAsrTime: cleanSoharAsr || null,
      maghribIshaaTime: cleanMaghribIshaa || null,
      manualTimes: {
        fajr: manualFajrTime.trim() || null,
        sohar: manualSoharTime.trim() || null,
        asr: manualAsrTime.trim() || null,
        maghrib: manualMaghribTime.trim() || null,
        ishaa: manualIshaaTime.trim() || null,
      },
      updatedAt: new Date().toISOString(),
    };

    try {
      setOverrideSaving(true);
      await setDocData(PRAYER_OVERRIDE_COLLECTION, todayISO, payload);
      setPrayerOverride(normalizePrayerOverride(payload));
      setToast('Override gespeichert ✓');
      setRefreshTick((v) => v + 1);
    } catch {
      Alert.alert('Fehler', 'Override konnte nicht gespeichert werden.');
    } finally {
      setOverrideSaving(false);
    }
  };

  const saveManualPrayerTimes = async () => {
    const manualEntries = {
      fajr: manualFajrTime.trim(),
      sohar: manualSoharTime.trim(),
      asr: manualAsrTime.trim(),
      maghrib: manualMaghribTime.trim(),
      ishaa: manualIshaaTime.trim(),
    };
    const invalid = Object.entries(manualEntries).find(([, value]) => value && !isValidTime(value));
    if (invalid) {
      Alert.alert('Ungültige Zeit', 'Bitte Zeiten im Format HH:MM eingeben.');
      return;
    }

    const payload = {
      enabled: overrideEnabled,
      soharAsrTime: overrideSoharAsrTime.trim() || null,
      maghribIshaaTime: overrideMaghribIshaaTime.trim() || null,
      manualTimes: {
        fajr: manualEntries.fajr || null,
        sohar: manualEntries.sohar || null,
        asr: manualEntries.asr || null,
        maghrib: manualEntries.maghrib || null,
        ishaa: manualEntries.ishaa || null,
      },
      updatedAt: new Date().toISOString(),
    };

    try {
      setOverrideSaving(true);
      await setDocData(PRAYER_OVERRIDE_COLLECTION, todayISO, payload);
      setPrayerOverride(normalizePrayerOverride(payload));
      setToast('Gespeichert ✓');
      setRefreshTick((v) => v + 1);
    } catch {
      Alert.alert('Fehler', 'Zeiten konnten nicht gespeichert werden.');
    } finally {
      setOverrideSaving(false);
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setRefreshTick((v) => v + 1);
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const nowTs = now.getTime();
    const candidates = [];
    const sequence = [timesToday.fajr, timesToday.sohar, timesToday.asr, timesToday.maghrib, timesToday.ishaa];

    sequence.forEach((time) => {
      const base = getMinutes(time);
      if (base === null) return;
      const startTs = atMinutesOfDay(now, base - 30).getTime();
      const endTs = atMinutesOfDay(now, base + 61).getTime();
      if (startTs > nowTs) candidates.push(startTs);
      if (endTs > nowTs) candidates.push(endTs);
    });

    const midnightTs = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).getTime();
    if (midnightTs > nowTs) candidates.push(midnightTs);

    const hasActiveWindow = resolvePrayerWindow(now, timesToday, timesTomorrow).isActive;
    if (!hasActiveWindow) {
      const nextMinuteTs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 0, 0).getTime();
      if (nextMinuteTs > nowTs) candidates.push(nextMinuteTs);
    }

    const nextTickTs = candidates.length ? Math.min(...candidates) : (nowTs + 60 * 1000);
    const delay = Math.max(500, nextTickTs - nowTs + 50);
    const timer = setTimeout(() => setRefreshTick((v) => v + 1), delay);

    return () => clearTimeout(timer);
  }, [now, timesToday]);

  useEffect(() => {
    const loadLocal = async () => {
      try {
        const darkRaw = await AsyncStorage.getItem(STORAGE_KEYS.darkMode);
        if (darkRaw === '1' || darkRaw === '0') setIsDarkMode(darkRaw === '1'); else setIsDarkMode(isGermanNightDefault());
      } catch (e) {
        console.warn('Failed to load local settings:', e);
      }
    };
    loadLocal();
  }, []);

  const onToggleDarkMode = async (value) => {
    Animated.sequence([
      Animated.timing(themePulseAnim, { toValue: 0.96, duration: 140, useNativeDriver: true }),
      Animated.spring(themePulseAnim, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 8 }),
    ]).start();
    setIsDarkMode(value);
    await AsyncStorage.setItem(STORAGE_KEYS.darkMode, value ? '1' : '0');
  };

  const prayerWindow = useMemo(() => resolvePrayerWindow(now, timesToday, timesTomorrow), [now, timesToday, timesTomorrow]);

  useEffect(() => {
    if (activeTab !== 'stats') return undefined;

    statsPayloadRef.current = '';
    let cancelled = false;
    const shouldShowInitialLoader = !statsAttendance;
    if (shouldShowInitialLoader) setStatsLoading(true);

    const applyIncomingAttendance = (nextData) => {
      const serialized = JSON.stringify(nextData || null);
      if (serialized === statsPayloadRef.current) {
        if (shouldShowInitialLoader && !cancelled) setStatsLoading(false);
        return;
      }
      statsPayloadRef.current = serialized;
      if (!cancelled) {
        setStatsAttendance(nextData);
        setStatsLoading(false);
      }
    };

    if (!firebaseRuntime || !hasFirebaseConfig()) {
      const fetchAttendance = () => {
        getDocData('attendance_daily', todayISO)
          .then((attendance) => applyIncomingAttendance(attendance))
          .catch(() => {
            if (!cancelled) {
              setStatsLoading(false);
              setToast('Datenbankfehler – bitte Internet prüfen');
            }
          });
      };

      fetchAttendance();
      const pollTimer = setInterval(fetchAttendance, 5000);
      return () => {
        cancelled = true;
        clearInterval(pollTimer);
      };
    }

    const attendanceRef = firebaseRuntime.doc(firebaseRuntime.db, 'attendance_daily', todayISO);
    const unsubscribe = firebaseRuntime.onSnapshot(
      attendanceRef,
      (snapshot) => {
        const nextData = snapshot.exists() ? snapshot.data() : null;
        applyIncomingAttendance(nextData);
      },
      () => {
        if (!cancelled) {
          setStatsLoading(false);
          setToast('Datenbankfehler – bitte Internet prüfen');
        }
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeTab, todayISO]);

  const statsPrayerKey = prayerWindow.isActive ? prayerWindow.prayerKey : nextPrayer;

  const statsView = useMemo(() => {
    if (!statsAttendance?.byPrayer || !statsPrayerKey) return null;

    const prayerData = statsAttendance.byPrayer[statsPrayerKey] || {};
    const tanzeemData = prayerData.tanzeem || {};
    const tanzeemKeys = ['ansar', 'khuddam', 'atfal'];
    const mergedCarry = statsAttendance.mergedCarry || {};
    const mergedCarrySoharAsr = Number(mergedCarry.soharAsr) || 0;
    const mergedCarryMaghribIshaa = Number(mergedCarry.maghribIshaa) || 0;

    const tanzeemTotals = tanzeemKeys.reduce((acc, tanzeem) => {
      const majlisMap = tanzeemData[tanzeem]?.majlis || {};
      acc[tanzeem] = Object.values(majlisMap).reduce((sum, val) => sum + (Number(val) || 0), 0);
      return acc;
    }, {});

    const getMajlisMapForPrayer = (prayerKey) => {
      const prayer = statsAttendance.byPrayer?.[prayerKey] || {};
      const prayerTanzeem = prayer?.tanzeem || {};
      const out = {};
      tanzeemKeys.forEach((tanzeem) => {
        const majlisMap = prayerTanzeem[tanzeem]?.majlis || {};
        Object.entries(majlisMap).forEach(([locationKey, value]) => {
          out[locationKey] = (out[locationKey] || 0) + (Number(value) || 0);
        });
      });
      return out;
    };

    const addMajlisMap = (target, source, multiplier = 1) => {
      Object.entries(source || {}).forEach(([locationKey, value]) => {
        target[locationKey] = (target[locationKey] || 0) + ((Number(value) || 0) * multiplier);
      });
    };

    const topMajlisMap = {};
    const fajrMajlis = getMajlisMapForPrayer('fajr');
    addMajlisMap(topMajlisMap, fajrMajlis, 1);

    const soharMajlis = getMajlisMapForPrayer('sohar');
    const asrMajlis = getMajlisMapForPrayer('asr');
    if (soharAsrMergedToday || hasSoharAsrOverrideToday) {
      const mergedMap = {};
      addMajlisMap(mergedMap, soharMajlis, 1);
      addMajlisMap(mergedMap, asrMajlis, 1);
      addMajlisMap(topMajlisMap, mergedMap, 1);
    } else {
      addMajlisMap(topMajlisMap, soharMajlis, 1);
      addMajlisMap(topMajlisMap, asrMajlis, 1);
    }

    const maghribMajlis = getMajlisMapForPrayer('maghrib');
    const ishaaMajlis = getMajlisMapForPrayer('ishaa');
    if (maghribIshaaMergedToday || hasMaghribIshaaOverrideToday) {
      const mergedMap = {};
      addMajlisMap(mergedMap, maghribMajlis, 1);
      addMajlisMap(mergedMap, ishaaMajlis, 1);
      addMajlisMap(topMajlisMap, mergedMap, 1);
    } else {
      addMajlisMap(topMajlisMap, maghribMajlis, 1);
      addMajlisMap(topMajlisMap, ishaaMajlis, 1);
    }

    const topMajlis = Object.entries(topMajlisMap)
      .filter(([, count]) => count > 0)
      .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
      .slice(0, 8);

    const tanzeemTotalsToday = { ansar: 0, khuddam: 0, atfal: 0 };
    Object.values(statsAttendance.byPrayer || {}).forEach((prayer) => {
      const prayerTanzeem = prayer?.tanzeem || {};
      ['ansar', 'khuddam', 'atfal'].forEach((tanzeem) => {
        const majlisMap = prayerTanzeem[tanzeem]?.majlis || {};
        tanzeemTotalsToday[tanzeem] += Object.values(majlisMap).reduce((sum, val) => sum + (Number(val) || 0), 0);
      });
    });

    const guestTotalToday = Object.values(statsAttendance.byPrayer || {}).reduce((sum, prayer) => sum + (Number(prayer?.guest) || 0), 0);
    const totalAttendance = Object.values(tanzeemTotalsToday).reduce((sum, value) => sum + value, 0) + guestTotalToday;

    return {
      guestTotal: guestTotalToday,
      tanzeemTotals,
      tanzeemTotalsToday,
      topMajlis,
      totalAttendance,
      mergedCarrySoharAsr,
      mergedCarryMaghribIshaa,
    };
  }, [statsAttendance, statsPrayerKey, soharAsrMergedToday, maghribIshaaMergedToday, hasSoharAsrOverrideToday, hasMaghribIshaaOverrideToday]);

  const formatMajlisName = (locationKey) => {
    if (MAJLIS_LABELS[locationKey]) return MAJLIS_LABELS[locationKey];
    return String(locationKey || '')
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const countAttendance = async (kind, locationName) => {
    const nowTs = Date.now();
    if (nowTs - terminalLastCountRef.current < 2000) return;
    terminalLastCountRef.current = nowTs;

    if (!hasFirebaseConfig()) {
      Alert.alert('Datenbankfehler', 'Bitte Firebase Konfiguration setzen.');
      return;
    }

    const runtimeNow = getBerlinNow();
    if (isValidTime(FORCE_TIME)) {
      runtimeNow.setHours(Number(FORCE_TIME.slice(0, 2)), Number(FORCE_TIME.slice(3)), 0, 0);
    }
    const runtimeISO = toISO(runtimeNow);
    const runtimeIsRamadanToday = runtimeISO <= RAMADAN_END_ISO;
    const runtimeSelectedISO = runtimeIsRamadanToday ? (RAMADAN_RAW[runtimeISO] ? runtimeISO : findClosestISO(runtimeISO, availableDates)) : null;
    const runtimeRaw = runtimeSelectedISO ? RAMADAN_RAW[runtimeSelectedISO] : null;
    const runtimeBaseTimesToday = buildPrayerTimes(runtimeRaw, runtimeIsRamadanToday);
    const runtimeOverride = runtimeISO === todayISO ? prayerOverride : null;
    const runtimeWithManual = applyManualPrayerAdjustments(runtimeBaseTimesToday, runtimeOverride);
    const runtimeTimesToday = applyPrayerTimeOverride(runtimeWithManual, runtimeOverride);
    const runtimeTomorrowISO = toISO(addDays(runtimeNow, 1));
    const runtimeIsRamadanTomorrow = runtimeTomorrowISO <= RAMADAN_END_ISO;
    const runtimeTomorrowRaw = runtimeIsRamadanTomorrow ? (RAMADAN_RAW[runtimeTomorrowISO] || null) : null;
    const runtimeTimesTomorrow = buildPrayerTimes(runtimeTomorrowRaw, runtimeIsRamadanTomorrow);
    const runtimePrayerWindow = resolvePrayerWindow(runtimeNow, runtimeTimesToday, runtimeTimesTomorrow);

    if (!runtimePrayerWindow.isActive || !runtimePrayerWindow.prayerKey) {
      setToast('Derzeit kein aktives Gebetszeitfenster');
      setRefreshTick((v) => v + 1);
      return;
    }

    const prayer = runtimePrayerWindow.prayerKey;
    const runtimeSoharAsrMerged = isValidTime(runtimeTimesToday.sohar) && runtimeTimesToday.sohar === runtimeTimesToday.asr;
    const runtimeMaghribIshaaMerged = isValidTime(runtimeTimesToday.maghrib) && runtimeTimesToday.maghrib === runtimeTimesToday.ishaa;

    const targetPrayers = runtimeSoharAsrMerged && ['sohar', 'asr'].includes(prayer)
      ? ['sohar', 'asr']
      : runtimeMaghribIshaaMerged && ['maghrib', 'ishaa'].includes(prayer)
        ? ['maghrib', 'ishaa']
        : [prayer];

    const paths = [];
    if (kind === 'guest') {
      targetPrayers.forEach((targetPrayer) => paths.push(`byPrayer.${targetPrayer}.guest`));
    } else if (locationName && selectedTanzeem) {
      const locationKey = toLocationKey(locationName);
      targetPrayers.forEach((targetPrayer) => paths.push(`byPrayer.${targetPrayer}.tanzeem.${selectedTanzeem}.majlis.${locationKey}`));
    }

    try {
      await incrementDocCounters('attendance_daily', runtimeISO, paths);
      visitorCounterRef.current += 1;
      console.log('ATTENDANCE LOG:', {
        visitorNumber: visitorCounterRef.current,
        timestamp: new Date().toISOString(),
        prayer: runtimePrayerWindow.prayerKey,
        tanzeem: kind === 'guest' ? 'guest' : selectedTanzeem,
        majlis: kind === 'guest' ? null : toLocationKey(locationName),
        platform: Platform.OS,
      });
      Vibration.vibrate(4);
      setToast('Gezählt ✓');
      setTerminalMode('tanzeem');
      setSelectedTanzeem('');
    } catch {
      Alert.alert('Datenbankfehler', 'Bitte Internet prüfen');
      setToast('Datenbankfehler – bitte Internet prüfen');
    }
  };

  const renderPrayer = () => {
    const displayDate = selectedDate || now;
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.dayCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.dayName, { color: theme.text }]}>{DAY_NAMES_DE[displayDate.getDay()]}</Text>
          <Text style={[styles.dayDate, { color: theme.muted }]}>{germanDateLong(displayDate)}</Text>
          <View style={[styles.cityBadge, { backgroundColor: theme.chipBg }]}><Text style={[styles.cityBadgeText, { color: theme.chipText }]}>{CITY}</Text></View>
          {!hasTodayData ? <Text style={[styles.syncStatus, { color: theme.muted }]}>Keine Daten für dieses Datum vorhanden.</Text> : null}
          {prayerRows.map((row) => {
            const isActive = row.activeKeys.includes(activePrayerKey || '');
            return (
              <View key={row.id} style={[styles.prayerRow, { borderBottomColor: theme.border }, isActive && { backgroundColor: theme.rowActiveBg, borderColor: theme.rowActiveBorder, borderWidth: 1, borderRadius: 10 }]}>
                <Text style={[styles.prayerLabel, { color: theme.text }]}>{row.label}</Text>
                <Text style={[styles.prayerValue, { color: theme.text }]}>{row.time || '—'}</Text>
              </View>
            );
          })}
          {isRamadanPeriodToday ? <Text style={[styles.noteText, { color: theme.muted }]}>Sehri-Ende: {selectedRaw?.sehriEnd || '—'}</Text> : null}
          {isRamadanPeriodToday ? <Text style={[styles.noteText, { color: theme.muted }]}>Iftar: {selectedRaw?.iftar || '—'}</Text> : null}
        </View>
      </ScrollView>
    );
  };

  const renderTerminal = () => (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
      <View style={[styles.terminalBanner, { backgroundColor: isDarkMode ? '#111827' : '#FFFFFF', borderColor: isDarkMode ? '#374151' : '#111111', borderWidth: isDarkMode ? 1 : 3 }]}>
        <Text style={[styles.terminalBannerTitle, { color: isDarkMode ? '#FFFFFF' : '#111111' }]}>Gebetsanwesenheit</Text>
        <Text style={[styles.terminalBannerArabic, { color: isDarkMode ? '#D1D5DB' : '#374151' }]}>عبادت حاضری</Text>
        <Text style={[styles.terminalBannerSubtitle, { color: isDarkMode ? '#D1D5DB' : '#4B5563' }]}>Local Amarat Frankfurt</Text>
      </View>

      <View style={[styles.currentPrayerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {prayerWindow.isActive ? (
          <Text style={[styles.currentPrayerText, { color: theme.text }]}>Aktuelles Gebet: {prayerWindow.prayerLabel}</Text>
        ) : (
          <>
            <Text style={[styles.noPrayerTitle, isDarkMode ? styles.noPrayerTitleDark : styles.noPrayerTitleLight]}>Derzeit kein Gebet</Text>
            <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginTop: 10 }]}>Nächstes Gebet:</Text>
            <Text style={[styles.nextPrayerValue, { color: theme.text }]}>{prayerWindow.nextLabel}</Text>
            <View style={[styles.noPrayerCountdownChip, { backgroundColor: '#FFFFFF', borderColor: '#111111' }]}>
              <Text style={[styles.noPrayerCountdownText, { color: '#111111' }]}>
                Zeitfenster öffnet sich in {Math.floor((prayerWindow.minutesUntilNextWindow || 0) / 60)}h {String((prayerWindow.minutesUntilNextWindow || 0) % 60).padStart(2, '0')}m
              </Text>
            </View>
          </>
        )}
      </View>

      {prayerWindow.isActive ? terminalMode === 'tanzeem' ? (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text, textAlign: 'center' }]}>Bitte wählen Sie die Tanzeem</Text>
          <Text style={[styles.urduText, { color: theme.muted }]}>براہ کرم تنظیم منتخب کریں</Text>
          <View style={styles.tanzeemRow}>
            {['ansar', 'khuddam', 'atfal'].map((tanzeem) => (
              <Pressable key={tanzeem} style={({ pressed }) => [[styles.tanzeemBtn, { backgroundColor: theme.button }], pressed && styles.buttonPressed]} onPress={() => { setSelectedTanzeem(tanzeem); setTerminalMode('majlis'); }}>
                <Text style={[styles.presetBtnText, { color: theme.buttonText }]}>{tanzeem.charAt(0).toUpperCase() + tanzeem.slice(1)}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => countAttendance('guest')} style={withPressEffect(styles.guestLinkWrap)}>
            <Text style={[styles.guestLinkText, { color: theme.muted }]}>Kein Mitglied? Tragen Sie sich als Gast ein</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text, textAlign: 'center' }]}>Bitte wählen Sie Ihre Majlis</Text>
          <Text style={[styles.urduText, { color: theme.muted }]}>براہ کرم اپنی مجلس منتخب کریں</Text>
          <Pressable style={({ pressed }) => [[styles.saveBtn, { backgroundColor: theme.button }], pressed && styles.buttonPressed]} onPress={() => { setTerminalMode('tanzeem'); setSelectedTanzeem(''); }}>
            <Text style={[styles.saveBtnText, { color: theme.buttonText }]}>Zurück</Text>
          </Pressable>
          <View style={styles.gridWrap}>
            {TERMINAL_LOCATIONS.map((loc) => (
              <Pressable key={loc} style={({ pressed }) => [[styles.gridItem, { backgroundColor: theme.card, borderColor: theme.border }], pressed && styles.buttonPressed]} onPress={() => countAttendance('member', loc)}>
                <Text style={[styles.gridText, { color: theme.text }]}>{loc}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <>
          <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>Anwesenheit kann nur im aktiven Gebet erfasst werden (30 Minuten davor bzw. 60 Minuten danach).</Text>
          <Text style={[styles.urduText, { color: theme.muted, marginTop: 6 }]}>حاضری صرف فعال نماز میں درج کی جا سکتی ہے (30 منٹ پہلے یا 60 منٹ بعد تک)</Text>
        </>
      )}
    </ScrollView>
  );

  const renderStats = () => {
    const statsHeaderDate = germanWeekdayDateLong(now);
    return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.statsHeaderCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.statsHeaderTitle, { color: theme.text }]}>Statistik</Text>
        <Text style={[styles.statsHeaderDate, { color: theme.muted }]}>{statsHeaderDate}</Text>
        <Text style={[styles.statsHeaderSubline, { color: theme.muted }]}>Local Amarat Frankfurt</Text>
        <View style={[styles.statsHeaderDivider, { backgroundColor: theme.border }]} />
      </View>

      {statsLoading ? <ActivityIndicator size="small" color={theme.text} /> : null}

      {!statsAttendance?.byPrayer || !statsView ? (
        <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.noteText, { color: theme.muted }]}>Noch keine Anwesenheit für heute</Text>
        </View>
      ) : (
        <>
          <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Gesamt Anwesende heute</Text>
            <Text style={[styles.statsBigValue, { color: theme.text }]}>{statsView.totalAttendance}</Text>
          </View>

          <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Tanzeem Aufteilung (heute)</Text>
            <View style={styles.tanzeemStatsRow}>
              <View style={[styles.tanzeemStatBox, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                <Text style={[styles.tanzeemStatValue, { color: theme.text }]}>{statsView.tanzeemTotalsToday.ansar}</Text>
                <Text style={[styles.tanzeemStatLabel, { color: theme.muted }]}>Ansar</Text>
              </View>
              <View style={[styles.tanzeemStatBox, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                <Text style={[styles.tanzeemStatValue, { color: theme.text }]}>{statsView.tanzeemTotalsToday.khuddam}</Text>
                <Text style={[styles.tanzeemStatLabel, { color: theme.muted }]}>Khuddam</Text>
              </View>
              <View style={[styles.tanzeemStatBox, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                <Text style={[styles.tanzeemStatValue, { color: theme.text }]}>{statsView.tanzeemTotalsToday.atfal}</Text>
                <Text style={[styles.tanzeemStatLabel, { color: theme.muted }]}>Atfal</Text>
              </View>
              <View style={[styles.tanzeemStatBox, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                <Text style={[styles.tanzeemStatValue, { color: theme.text }]}>{statsView.guestTotal}</Text>
                <Text style={[styles.tanzeemStatLabel, { color: theme.muted }]}>Gäste</Text>
              </View>
            </View>
          </View>

          <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Top Majlises heute (alle Gebete)</Text>
            {statsView.topMajlis.length === 0 ? (
              <Text style={[styles.noteText, { color: theme.muted }]}>Noch keine Anwesenheit für heute</Text>
            ) : (
              (() => {
                const maxTop = Math.max(1, ...statsView.topMajlis.map(([, count]) => count));
                return statsView.topMajlis.map(([locationKey, count]) => (
                  <View key={locationKey} style={styles.majlisBarRow}>
                    <Text style={[styles.majlisBarLabel, { color: theme.text }]} numberOfLines={1}>{formatMajlisName(locationKey)}</Text>
                    <View style={[styles.majlisBarTrack, { backgroundColor: theme.border }]}>
                      <View style={[styles.majlisBarFill, { backgroundColor: theme.button, width: `${(count / maxTop) * 100}%` }]} />
                    </View>
                    <Text style={[styles.majlisBarValue, { color: theme.text }]}>{count}</Text>
                  </View>
                ));
              })()
            )}
          </View>

          <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Anzahl pro Gebet heute</Text>
            {(() => {
              const getPrayerTotal = (prayerKey) => {
                const prayer = statsAttendance.byPrayer?.[prayerKey] || {};
                const guest = Number(prayer.guest) || 0;
                const tanzeem = prayer.tanzeem || {};
                const members = ['ansar', 'khuddam', 'atfal'].reduce((sum, tanzeemKey) => {
                  const majlis = tanzeem[tanzeemKey]?.majlis || {};
                  return sum + Object.values(majlis).reduce((x, y) => x + (Number(y) || 0), 0);
                }, 0);
                return guest + members;
              };

              const soharTotalRaw = getPrayerTotal('sohar');
              const asrTotalRaw = getPrayerTotal('asr');
              const maghribTotalRaw = getPrayerTotal('maghrib');
              const ishaaTotalRaw = getPrayerTotal('ishaa');

              const soharAsrCarryValue = soharTotalRaw + asrTotalRaw;
              const maghribIshaaCarryValue = maghribTotalRaw + ishaaTotalRaw;

              const totals = [
                { key: 'fajr', label: 'Fajr (الفجر)', total: getPrayerTotal('fajr') },
                ...(soharAsrMergedToday
                  ? [{ key: 'sohar_asr', label: 'Sohar/Asr (الظهر/العصر)', total: soharAsrCarryValue }]
                  : [
                    { key: 'sohar', label: 'Sohar (الظهر)', total: hasSoharAsrOverrideToday ? soharAsrCarryValue : soharTotalRaw },
                    { key: 'asr', label: 'Asr (العصر)', total: hasSoharAsrOverrideToday ? soharAsrCarryValue : asrTotalRaw },
                  ]),
                ...(maghribIshaaMergedToday
                  ? [{ key: 'maghrib_ishaa', label: 'Maghrib/Ishaa (المغرب/العشاء)', total: maghribIshaaCarryValue }]
                  : [
                    { key: 'maghrib', label: 'Maghrib (المغرب)', total: hasMaghribIshaaOverrideToday ? maghribIshaaCarryValue : maghribTotalRaw },
                    { key: 'ishaa', label: 'Ishaa & Taravih (العشاء / التراويح)', total: hasMaghribIshaaOverrideToday ? maghribIshaaCarryValue : ishaaTotalRaw },
                  ]),
              ];

              const maxTotal = Math.max(1, ...totals.map((item) => item.total));
              return totals.map(({ key, label, total }) => (
                <View key={key} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: theme.text }]}>{label}</Text>
                  <View style={[styles.barTrack, { backgroundColor: theme.border }]}> 
                    <View style={[styles.barFill, { backgroundColor: theme.button, width: `${(total / maxTotal) * 100}%` }]} />
                  </View>
                  <Text style={[styles.barValue, { color: theme.text }]}>{total}</Text>
                </View>
              ));
            })()}
          </View>
        </>
      )}
    </ScrollView>
  );
  };

  const renderSettings = () => {
    const settingsDate = germanDateLong(now);

    return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}> 
        <View style={styles.switchRow}><Text style={[styles.sectionTitle, { color: theme.text }]}>Dark Mode</Text><Switch value={isDarkMode} onValueChange={onToggleDarkMode} /></View>
      </View>

      <View style={[styles.settingsHeroCard, { backgroundColor: theme.card }]}> 
        <Text style={[styles.settingsHeroTitle, { color: theme.text }]}>Gebetszeiten zusammenlegen</Text>
        <Text style={[styles.settingsHeroMeta, { color: theme.muted }]}>{settingsDate} · Bait-Us-Sabuh</Text>

        {overrideLoading ? <ActivityIndicator size="small" color={theme.text} /> : null}

        <View style={styles.mergeSwitchWrap}>
          <Text style={[styles.mergeSwitchLabel, { color: theme.text }]}>Zusammenlegung aktivieren</Text>
          <Switch value={overrideEnabled} onValueChange={onOverrideEnabledChange} />
        </View>

        <View style={[styles.mergeInputWrap, !overrideEnabled && styles.mergeInputDisabled]}>
          <TextInput
            value={overrideSoharAsrTime}
            onChangeText={setOverrideSoharAsrTime}
            placeholder="Sohar/Asr (HH:MM)"
            placeholderTextColor={theme.muted}
            autoCapitalize="none"
            editable={overrideEnabled}
            style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
          />
          <TextInput
            value={overrideMaghribIshaaTime}
            onChangeText={setOverrideMaghribIshaaTime}
            placeholder="Maghrib/Ishaa (HH:MM)"
            placeholderTextColor={theme.muted}
            autoCapitalize="none"
            editable={overrideEnabled}
            style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
          />
        </View>

        <Pressable style={({ pressed }) => [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor: theme.button, opacity: overrideSaving ? 0.6 : 1 }], pressed && styles.buttonPressed]} disabled={overrideSaving} onPress={savePrayerOverride}>
          <Text style={[styles.saveBtnText, { color: theme.buttonText }]}>{overrideSaving ? 'Speichert…' : 'Speichern'}</Text>
        </Pressable>
      </View>


      <View style={[styles.settingsHeroCard, { backgroundColor: theme.card }]}> 
        <Text style={[styles.settingsHeroTitle, { color: theme.text }]}>Gebetszeiten anpassen</Text>
        <Text style={[styles.settingsHeroMeta, { color: theme.muted }]}>{settingsDate} · Bait-Us-Sabuh</Text>

        <View style={styles.mergeInputWrap}>
          <TextInput value={manualFajrTime} onChangeText={setManualFajrTime} placeholder="Fajr (HH:MM)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={manualSoharTime} onChangeText={setManualSoharTime} placeholder="Sohar (HH:MM)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={manualAsrTime} onChangeText={setManualAsrTime} placeholder="Asr (HH:MM)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={manualMaghribTime} onChangeText={setManualMaghribTime} placeholder="Maghrib (HH:MM)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={manualIshaaTime} onChangeText={setManualIshaaTime} placeholder="Ishaa (HH:MM)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
        </View>

        <Pressable style={({ pressed }) => [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor: theme.button, opacity: overrideSaving ? 0.6 : 1 }], pressed && styles.buttonPressed]} disabled={overrideSaving} onPress={saveManualPrayerTimes}>
          <Text style={[styles.saveBtnText, { color: theme.buttonText }]}>{overrideSaving ? 'Speichert…' : 'Speichern'}</Text>
        </Pressable>
      </View>

      <View style={styles.appMetaWrap}>
        <Text style={[styles.appMetaVersion, { color: theme.muted }]}>Version 1.0.0</Text>
        <Text style={[styles.appMetaCopyright, { color: theme.muted }]}>© 2026 Tehmoor Bhatti. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
  };

  const body = activeTab === 'gebetsplan'
    ? renderPrayer()
    : activeTab === 'terminal'
      ? renderTerminal()
      : activeTab === 'stats'
        ? renderStats()
        : renderSettings();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}> 
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Text style={[styles.basmalaText, { color: theme.muted }]}>بِسۡمِ اللّٰہِ الرَّحۡمٰنِ الرَّحِیۡمِ</Text>
      <View style={styles.logoWrap}>
        <Image source={logoSource} style={styles.logoImage} resizeMode="contain" />
      </View>
      <Animated.View style={{ flex: 1, transform: [{ scale: themePulseAnim }] }}>{body}</Animated.View>

      <View style={[styles.tabBar, { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, 6), minHeight: 60 + Math.max(insets.bottom, 6) }]}>
        {TAB_ITEMS.map((tab) => (
          <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={withPressEffect(styles.tabItem)}>
            <Text numberOfLines={1} style={[styles.tabLabel, { color: activeTab === tab.key ? theme.text : theme.muted, fontWeight: activeTab === tab.key ? '700' : '500' }]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {toast ? (
        <View style={[styles.toast, { backgroundColor: '#16A34A' }]}><Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{toast}</Text></View>
      ) : null}
    </SafeAreaView>
  );
}


export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  basmalaText: { textAlign: 'center', fontSize: 14, lineHeight: 20, paddingTop: 6, paddingBottom: 2, fontFamily: Platform.select({ ios: 'Geeza Pro', default: 'serif' }) },
  logoWrap: { alignItems: 'center', paddingBottom: 6 },
  logoImage: { width: 34, height: 34, opacity: 0.92, backgroundColor: 'transparent' },
  content: { flexGrow: 1, padding: 16, gap: 10, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  titleWrap: { flex: 1, alignItems: 'center' },
  title: { fontSize: 31, fontWeight: '800', textAlign: 'center', letterSpacing: 0.4 },
  subtitle: { fontSize: 14, textAlign: 'center' },
  titleArabic: { fontSize: 16, textAlign: 'center', marginTop: 0 },
  dayCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  dayName: { fontSize: 42, fontWeight: '800', textAlign: 'center' },
  dayDate: { fontSize: 20, textAlign: 'center' },
  cityBadge: { alignSelf: 'center', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 4 },
  cityBadgeText: { fontSize: 18, fontWeight: '700' },
  syncStatus: { textAlign: 'center', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  prayerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1 },
  prayerLabel: { fontSize: 17, fontWeight: '500', flex: 1, marginRight: 10 },
  prayerValue: { fontSize: 20, fontWeight: '700' },
  bottomSticky: { gap: 10 },
  footer: { textAlign: 'center', fontSize: 12, fontWeight: '500', marginTop: 2 },
  appMetaWrap: { marginTop: 6, marginBottom: 8, paddingHorizontal: 6, gap: 4 },
  appMetaVersion: { textAlign: 'center', fontSize: 12, fontWeight: '700' },
  appMetaCopyright: { textAlign: 'center', fontSize: 11, lineHeight: 16 },
  section: { borderRadius: 14, borderWidth: 1, padding: 10, gap: 8, marginBottom: 10, marginTop: 20 },
  settingsHeroCard: { borderRadius: 18, paddingVertical: 22, paddingHorizontal: 18, gap: 16, marginTop: 8, marginBottom: 4 },
  settingsHeroTitle: { textAlign: 'center', fontSize: 22, fontWeight: '700', letterSpacing: 0.2 },
  settingsHeroMeta: { textAlign: 'center', fontSize: 13, fontWeight: '500' },
  mergeSwitchWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  mergeSwitchLabel: { fontSize: 14, fontWeight: '600' },
  mergeInputWrap: { gap: 12, marginTop: 4 },
  mergeInputDisabled: { opacity: 0.45 },
  mergeInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, textAlign: 'center', fontSize: 15, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  presetBtnText: { fontSize: 13, fontWeight: '700' },
  saveBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  settingsSaveBtn: { marginTop: 4, alignSelf: 'center', width: '68%' },
  saveBtnText: { fontSize: 14, fontWeight: '700' },
  noteText: { fontSize: 12, fontWeight: '600' },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, minHeight: 60, paddingHorizontal: 8 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  buttonPressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  tabLabel: { fontSize: 10, textAlign: 'center', width: '100%' },
  toast: { position: 'absolute', bottom: 68, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  bigTerminalBtn: { borderRadius: 18, minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  bigTerminalText: { fontSize: 34, fontWeight: '800' },
  terminalBanner: { borderRadius: 16, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  terminalBannerTitle: { textAlign: 'center', fontSize: 20, fontWeight: '800', letterSpacing: 0.2 },
  terminalBannerArabic: { textAlign: 'center', marginTop: 2, fontSize: 16, fontFamily: Platform.select({ ios: 'Geeza Pro', default: 'serif' }) },
  terminalBannerSubtitle: { textAlign: 'center', marginTop: 4, fontSize: 13, fontWeight: '600' },
  currentPrayerCard: { borderRadius: 16, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  currentPrayerText: { textAlign: 'center', fontSize: 20, fontWeight: '800' },
  noPrayerTitle: { textAlign: 'center', alignSelf: 'center', fontSize: 18, fontWeight: '800', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, overflow: 'hidden', letterSpacing: 0.2 },
  noPrayerTitleLight: { backgroundColor: '#FFE866', color: '#111111' },
  noPrayerTitleDark: { backgroundColor: '#FFE866', color: '#111111' },
  noPrayerCountdownChip: { alignSelf: 'center', marginTop: 12, borderRadius: 12, borderWidth: 2, paddingVertical: 8, paddingHorizontal: 12 },
  noPrayerCountdownText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
  nextPrayerValue: { textAlign: 'center', fontSize: 20, fontWeight: '800', marginTop: 4 },
  urduText: { textAlign: 'center', fontSize: 12, marginTop: -2, marginBottom: 2 },

  guestLinkWrap: { alignSelf: 'center', marginTop: 8, paddingVertical: 4, paddingHorizontal: 8 },
  guestLinkText: { fontSize: 12, textDecorationLine: 'underline', fontWeight: '600' },
  tanzeemRow: { flexDirection: 'row', gap: 10 },
  tanzeemBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  statsHeaderCard: { borderRadius: 16, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  statsHeaderTitle: { fontSize: 28, fontWeight: '800', letterSpacing: 0.2, textAlign: 'center' },
  statsHeaderDate: { marginTop: 2, fontSize: 16, fontWeight: '600', textTransform: 'capitalize', textAlign: 'center' },
  statsHeaderSubline: { marginTop: 3, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  statsHeaderDivider: { marginTop: 10, height: 1, width: '100%' },
  statsCard: { borderRadius: 16, borderWidth: 1, padding: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  statsCardTitle: { fontSize: 13, fontWeight: '700' },
  statsBigValue: { fontSize: 40, fontWeight: '800', marginTop: 4 },
  tanzeemStatsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  tanzeemStatBox: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  tanzeemStatValue: { fontSize: 26, fontWeight: '800', lineHeight: 30 },
  tanzeemStatLabel: { marginTop: 2, fontSize: 12, fontWeight: '600' },
  majlisBarRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  majlisBarLabel: { width: 120, fontSize: 12, fontWeight: '600' },
  majlisBarTrack: { flex: 1, height: 10, borderRadius: 999, overflow: 'hidden' },
  majlisBarFill: { height: '100%', borderRadius: 999 },
  majlisBarValue: { width: 24, textAlign: 'right', fontSize: 12, fontWeight: '700' },
  barRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 148, fontSize: 11, fontWeight: '700' },
  barTrack: { flex: 1, height: 10, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  barValue: { width: 30, textAlign: 'right', fontSize: 12, fontWeight: '700' },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '48%', borderWidth: 1, borderRadius: 12, paddingVertical: 18, paddingHorizontal: 8 },
  gridText: { textAlign: 'center', fontWeight: '700' },
});
