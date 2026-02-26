import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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

const STORAGE_KEYS = {
  count: '@tasbeeh_count',
  goal: '@tasbeeh_goal',
  darkMode: '@tasbeeh_darkmode',
};

const DEFAULT_GOAL = 100;
const GOAL_PRESETS = [33, 99, 100, 1000];
const CITY = 'Bait-Us-Sabuh';
const FORCE_TIME = '13:05'; // development override, set null for real time
const TERMINAL_LOCATIONS = [
  'Baitus Sabuh Nord',
  'Baitus Sabuh Süd',
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
  { key: 'tasbeeh', label: 'Tasbeeh' },
  { key: 'gebetsplan', label: 'Gebetsplan' },
  { key: 'terminal', label: 'Gebetsanwesenheit' },
  { key: 'stats', label: 'Stats' },
];

const PRAYER_LABELS = {
  fajr: 'Fajr',
  sohar: 'Sohar',
  asr: 'Asr',
  maghrib: 'Maghrib',
  ishaa: 'Ishaa & Taravih',
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
  sohar: '13:30',
  asr: '16:00',
  ishaa: '20:00',
  jumma: '13:15',
};

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
  light: { bg: '#F4F4F5', card: '#FFFFFF', border: '#E4E4E7', text: '#09090B', muted: '#71717A', button: '#111827', buttonText: '#FFFFFF', progressTrack: '#E4E4E7', progressFill: '#111827', rowActiveBg: '#ECFDF3', rowActiveBorder: '#86EFAC', chipBg: '#ECFDF3', chipText: '#166534' },
  dark: { bg: '#09090B', card: '#111827', border: '#374151', text: '#F9FAFB', muted: '#9CA3AF', button: '#F9FAFB', buttonText: '#111827', progressTrack: '#1F2937', progressFill: '#93C5FD', rowActiveBg: '#052E1B', rowActiveBorder: '#22C55E', chipBg: '#14532D', chipText: '#BBF7D0' },
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
const englishDateLong = (date) => new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
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

const docUrl = (collection, id) => `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/${collection}/${id}?key=${FIREBASE_CONFIG.apiKey}`;
const commitUrl = () => `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents:commit?key=${FIREBASE_CONFIG.apiKey}`;

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

async function setDocData(collection, id, data, merge = true) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const body = { fields: toFirestoreValue(data).mapValue.fields };
  const url = merge ? `${docUrl(collection, id)}&currentDocument.exists=false` : docUrl(collection, id);
  const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok && res.status !== 409) throw new Error('Firestore write failed');
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

export default function App() {
  const [activeTab, setActiveTab] = useState('tasbeeh');
  const [count, setCount] = useState(0);
  const [countLoaded, setCountLoaded] = useState(false);
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [goalInput, setGoalInput] = useState(String(DEFAULT_GOAL));
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [terminalMode, setTerminalMode] = useState('tanzeem');
  const [selectedTanzeem, setSelectedTanzeem] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [toast, setToast] = useState('');
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsAttendance, setStatsAttendance] = useState(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const themePulseAnim = useRef(new Animated.Value(1)).current;
  const terminalLastCountRef = useRef(0);

  const theme = isDarkMode ? THEME.dark : THEME.light;
  const now = useMemo(() => {
    const d = new Date();
    if (isValidTime(FORCE_TIME)) {
      d.setHours(Number(FORCE_TIME.slice(0, 2)), Number(FORCE_TIME.slice(3)), 0, 0);
    }
    return d;
  }, [refreshTick]);
  const todayISO = toISO(now);
  const availableDates = useMemo(() => Object.keys(RAMADAN_RAW).sort(), []);
  const selectedISO = useMemo(() => RAMADAN_RAW[todayISO] ? todayISO : findClosestISO(todayISO, availableDates), [todayISO, availableDates]);
  const selectedDate = selectedISO ? parseISO(selectedISO) : now;
  const selectedRaw = selectedISO ? RAMADAN_RAW[selectedISO] : null;
  const hasTodayData = Boolean(RAMADAN_RAW[todayISO]);

  const timesToday = useMemo(() => ({
    fajr: addMinutes(selectedRaw?.sehriEnd, 20),
    sohar: FIXED_TIMES.sohar,
    asr: FIXED_TIMES.asr,
    maghrib: addMinutes(selectedRaw?.iftar, 10),
    ishaa: FIXED_TIMES.ishaa,
    jumma: FIXED_TIMES.jumma,
  }), [selectedRaw]);
  const nextPrayer = useMemo(() => getNextPrayer(now, timesToday), [now, timesToday]);

  const prayerRows = useMemo(() => [
    { key: 'fajr', label: 'Fajr (الفجر)', time: timesToday.fajr, activeCheck: true },
    { key: 'sohar', label: 'Sohar (الظهر)', time: timesToday.sohar, activeCheck: true },
    { key: 'asr', label: 'Asr (العصر)', time: timesToday.asr, activeCheck: true },
    { key: 'maghrib', label: 'Maghrib (المغرب)', time: timesToday.maghrib, activeCheck: true },
    { key: 'ishaa', label: 'Ishaa & Taravih (العشاء / التراويح)', time: timesToday.ishaa, activeCheck: true },
    { key: 'jumma', label: 'Jumma (الجمعة)', time: timesToday.jumma, activeCheck: false },
  ], [timesToday]);

  const activePrayerKey = useMemo(() => {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const weekday = now.getDay();
    const active = prayerRows.find((row) => {
      if (!isValidTime(row.time)) return false;
      if (row.key === 'jumma' && weekday !== 5) return false;
      const mins = Number(row.time.slice(0, 2)) * 60 + Number(row.time.slice(3));
      return nowMinutes >= mins - 30 && nowMinutes <= mins + 60;
    });
    return active?.key || null;
  }, [prayerRows, now]);

  const progress = useMemo(() => Math.min((count / goal) * 100, 100), [count, goal]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const loadLocal = async () => {
      try {
        const [countRaw, goalRaw, darkRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.count),
          AsyncStorage.getItem(STORAGE_KEYS.goal),
          AsyncStorage.getItem(STORAGE_KEYS.darkMode),
        ]);
        if (countRaw !== null) { const n = Number.parseInt(countRaw, 10); if (!Number.isNaN(n)) setCount(n); }
        if (goalRaw) { const n = Number.parseInt(goalRaw, 10); if (!Number.isNaN(n) && n >= 1 && n <= 100000) { setGoal(n); setGoalInput(String(n)); } }
        if (darkRaw === '1' || darkRaw === '0') setIsDarkMode(darkRaw === '1'); else setIsDarkMode(isGermanNightDefault());
      } catch (e) {
        console.warn('Failed to load local settings:', e);
      } finally {
        setCountLoaded(true);
      }
    };
    loadLocal();
  }, []);

  useEffect(() => { if (countLoaded) AsyncStorage.setItem(STORAGE_KEYS.count, String(count)).catch(() => {}); }, [count, countLoaded]);

  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true, speed: 18, bounciness: 5 }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 5 }).start();

  const incrementCount = () => { setCount((prev) => prev + 1); Vibration.vibrate(4); };
  const saveGoal = async () => {
    const n = Number.parseInt(goalInput.trim(), 10);
    if (Number.isNaN(n) || n < 1 || n > 100000) return;
    setGoal(n);
    await AsyncStorage.setItem(STORAGE_KEYS.goal, String(n));
    setToast('Gespeichert ✓');
  };
  const onToggleDarkMode = async (value) => {
    Animated.sequence([
      Animated.timing(themePulseAnim, { toValue: 0.96, duration: 140, useNativeDriver: true }),
      Animated.spring(themePulseAnim, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 8 }),
    ]).start();
    setIsDarkMode(value);
    await AsyncStorage.setItem(STORAGE_KEYS.darkMode, value ? '1' : '0');
  };

  const getMinutes = (time) => (isValidTime(time) ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : null);
  const formatMinutes = (mins) => `${pad(Math.floor((((mins % 1440) + 1440) % 1440) / 60))}:${pad((((mins % 1440) + 1440) % 1440) % 60)}`;

  const prayerWindow = useMemo(() => {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const sequence = [
      { key: 'fajr', label: 'Fajr', time: timesToday.fajr },
      { key: 'sohar', label: 'Sohar', time: timesToday.sohar },
      { key: 'asr', label: 'Asr', time: timesToday.asr },
      { key: 'maghrib', label: 'Maghrib', time: timesToday.maghrib },
      { key: 'ishaa', label: 'Ishaa & Taravih', time: timesToday.ishaa },
    ];
    const active = sequence.find((item) => {
      const base = getMinutes(item.time);
      if (base === null) return false;
      const start = base - 30;
      const end = base + 60;
      return nowMinutes >= start && nowMinutes <= end;
    });
    const nextKey = getNextPrayer(now, timesToday);
    const next = sequence.find((item) => item.key === nextKey) || sequence[0];
    if (active) {
      const base = getMinutes(active.time);
      return {
        isActive: true,
        prayerKey: active.key,
        prayerLabel: active.label,
        prayerTime: active.time,
        windowLabel: `${formatMinutes(base - 30)} – ${formatMinutes(base + 60)}`,
        nextLabel: null,
      };
    }
    return {
      isActive: false,
      prayerKey: null,
      prayerLabel: null,
      prayerTime: null,
      windowLabel: null,
      nextLabel: `${next?.label || '—'} – ${next?.time || '—'}`,
    };
  }, [now, timesToday]);

  useEffect(() => {
    if (activeTab !== 'stats') return;

    let isMounted = true;
    let intervalId;

    const loadAttendance = async () => {
      setStatsLoading(true);
      try {
        const attendance = await getDocData('attendance_daily', todayISO);
        if (isMounted) {
          setStatsAttendance(attendance);
        }
      } catch {
        if (isMounted) {
          setToast('Datenbankfehler – bitte Internet prüfen');
        }
      } finally {
        if (isMounted) {
          setStatsLoading(false);
        }
      }
    };

    loadAttendance();
    intervalId = setInterval(loadAttendance, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [activeTab, todayISO]);

  const statsPrayerKey = prayerWindow.isActive ? prayerWindow.prayerKey : nextPrayer;

  const statsView = useMemo(() => {
    if (!statsAttendance?.byPrayer || !statsPrayerKey) return null;

    const prayerData = statsAttendance.byPrayer[statsPrayerKey] || {};
    const tanzeemData = prayerData.tanzeem || {};
    const tanzeemKeys = ['ansar', 'khuddam', 'atfal'];

    const tanzeemTotals = tanzeemKeys.reduce((acc, tanzeem) => {
      const majlisMap = tanzeemData[tanzeem]?.majlis || {};
      acc[tanzeem] = Object.values(majlisMap).reduce((sum, val) => sum + (Number(val) || 0), 0);
      return acc;
    }, {});

    const topMajlisMap = {};
    Object.values(statsAttendance.byPrayer || {}).forEach((prayer) => {
      const prayerTanzeem = prayer?.tanzeem || {};
      tanzeemKeys.forEach((tanzeem) => {
        const majlisMap = prayerTanzeem[tanzeem]?.majlis || {};
        Object.entries(majlisMap).forEach(([locationKey, value]) => {
          topMajlisMap[locationKey] = (topMajlisMap[locationKey] || 0) + (Number(value) || 0);
        });
      });
    });

    const topMajlis = Object.entries(topMajlisMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const guestTotal = Number(prayerData.guest) || 0;
    const totalAttendance = guestTotal + Object.values(tanzeemTotals).reduce((sum, value) => sum + value, 0);

    return {
      guestTotal,
      tanzeemTotals,
      topMajlis,
      totalAttendance,
    };
  }, [statsAttendance, statsPrayerKey]);

  const countAttendance = async (kind, locationName) => {
    const nowTs = Date.now();
    if (nowTs - terminalLastCountRef.current < 2000) return;
    terminalLastCountRef.current = nowTs;

    if (!hasFirebaseConfig()) {
      Alert.alert('Datenbankfehler', 'Bitte Firebase Konfiguration setzen.');
      return;
    }

    if (!prayerWindow.isActive || !prayerWindow.prayerKey) {
      setToast('Derzeit kein aktives Gebetszeitfenster');
      return;
    }

    const prayer = prayerWindow.prayerKey;
    const paths = [];
    if (kind === 'guest') {
      paths.push(`byPrayer.${prayer}.guest`);
    } else if (locationName && selectedTanzeem) {
      paths.push(`byPrayer.${prayer}.tanzeem.${selectedTanzeem}.majlis.${toLocationKey(locationName)}`);
    }

    try {
      await incrementDocCounters('attendance_daily', todayISO, paths);
      Vibration.vibrate(4);
      setToast('Gezählt ✓');
      setTerminalMode('tanzeem');
      setSelectedTanzeem('');
    } catch {
      Alert.alert('Datenbankfehler', 'Bitte Internet prüfen');
      setToast('Datenbankfehler – bitte Internet prüfen');
    }
  };

  const renderTasbeeh = () => (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}><View style={styles.titleWrap}><Text style={[styles.title, { color: theme.text }]}>Tasbeeh (تسبيح)</Text></View></View>
      <Text style={[styles.subtitle, { color: theme.muted }]}>Tippe auf den Zählerbereich, um zu erhöhen</Text>
      <View style={styles.mainFlex}>
        <Pressable style={styles.counterPressable} onPress={incrementCount} onPressIn={onPressIn} onPressOut={onPressOut}>
          <Animated.View style={[styles.counter, { backgroundColor: theme.card, borderColor: theme.border, transform: [{ scale: scaleAnim }] }]}>
            {!countLoaded ? <ActivityIndicator size="large" color={theme.text} /> : <Text style={[styles.counterText, { color: theme.text }]}>{count}</Text>}
          </Animated.View>
        </Pressable>
        <View style={styles.bottomSticky}>
          <View style={styles.progressWrap}><View style={[styles.progressTrack, { backgroundColor: theme.progressTrack }]}><View style={[styles.progressFill, { backgroundColor: theme.progressFill, width: `${progress}%` }]} /></View><Text style={[styles.progressText, { color: theme.muted }]}>Ziel: {goal} • {progress.toFixed(0)}%</Text></View>
          <Pressable style={[styles.resetBtn, { backgroundColor: theme.button }]} onPress={() => setCount(0)}><Text style={[styles.resetText, { color: theme.buttonText }]}>Reset</Text></Pressable>
          <Text style={[styles.footer, { color: theme.muted }]}>Made by Tehmoor</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderPrayer = () => {
    const displayDate = selectedDate || now;
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.dayCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.dayName, { color: theme.text }]}>{DAY_NAMES_DE[displayDate.getDay()]}</Text>
          <Text style={[styles.dayDate, { color: theme.muted }]}>{englishDateLong(displayDate)}</Text>
          <View style={[styles.cityBadge, { backgroundColor: theme.chipBg }]}><Text style={[styles.cityBadgeText, { color: theme.chipText }]}>{CITY}</Text></View>
          {!hasTodayData ? <Text style={[styles.syncStatus, { color: theme.muted }]}>Keine Daten für dieses Datum vorhanden.</Text> : null}
          {prayerRows.map((row) => {
            const isActive = row.key === activePrayerKey;
            return (
              <View key={row.key} style={[styles.prayerRow, { borderBottomColor: theme.border }, isActive && { backgroundColor: theme.rowActiveBg, borderColor: theme.rowActiveBorder, borderWidth: 1, borderRadius: 10 }]}>
                <Text style={[styles.prayerLabel, { color: theme.text }]}>{row.label}</Text>
                <Text style={[styles.prayerValue, { color: theme.text }]}>{row.time || '—'}</Text>
              </View>
            );
          })}
          <Text style={[styles.noteText, { color: theme.muted }]}>Sehri-Ende: {selectedRaw?.sehriEnd || '—'}</Text>
          <Text style={[styles.noteText, { color: theme.muted }]}>Iftar: {selectedRaw?.iftar || '—'}</Text>
        </View>
      </ScrollView>
    );
  };

  const renderTerminal = () => (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
      <View style={[styles.terminalBanner, { backgroundColor: isDarkMode ? '#111827' : '#111111', borderColor: isDarkMode ? '#374151' : '#111111' }]}>
        <Text style={[styles.terminalBannerTitle, { color: '#FFFFFF' }]}>Gebetsanwesenheit (عبادت حاضری)</Text>
        <Text style={[styles.terminalBannerSubtitle, { color: '#D1D5DB' }]}>Local Amarat Frankfurt</Text>
      </View>

      <View style={[styles.currentPrayerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {prayerWindow.isActive ? (
          <Text style={[styles.currentPrayerText, { color: theme.text }]}>Aktuelles Gebet: {prayerWindow.prayerLabel}</Text>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text, textAlign: 'center' }]}>Derzeit kein Gebet</Text>
            <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginTop: 6 }]}>Nächstes Gebet: {prayerWindow.nextLabel}</Text>
            <Pressable style={[styles.saveBtn, { backgroundColor: theme.button, marginTop: 12 }]} onPress={() => setRefreshTick((v) => v + 1)}>
              <Text style={[styles.saveBtnText, { color: theme.buttonText }]}>Aktualisieren</Text>
            </Pressable>
          </>
        )}
      </View>

      {prayerWindow.isActive ? terminalMode === 'tanzeem' ? (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text, textAlign: 'center' }]}>Bitte wählen Sie die Tanzeem</Text>
          <Text style={[styles.urduText, { color: theme.muted }]}>براہ کرم تنظیم منتخب کریں</Text>
          <View style={styles.tanzeemRow}>
            {['ansar', 'khuddam', 'atfal'].map((tanzeem) => (
              <Pressable key={tanzeem} style={[styles.tanzeemBtn, { backgroundColor: theme.button }]} onPress={() => { setSelectedTanzeem(tanzeem); setTerminalMode('majlis'); }}>
                <Text style={[styles.presetBtnText, { color: theme.buttonText }]}>{tanzeem.charAt(0).toUpperCase() + tanzeem.slice(1)}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => countAttendance('guest')} style={styles.guestLinkWrap}>
            <Text style={[styles.guestLinkText, { color: theme.muted }]}>Kein Mitglied? Tragen Sie sich als Gast ein</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text, textAlign: 'center' }]}>Bitte wählen Sie Ihre Majlis</Text>
          <Text style={[styles.urduText, { color: theme.muted }]}>براہ کرم اپنی مجلس منتخب کریں</Text>
          <Pressable style={[styles.saveBtn, { backgroundColor: theme.button }]} onPress={() => { setTerminalMode('tanzeem'); setSelectedTanzeem(''); }}>
            <Text style={[styles.saveBtnText, { color: theme.buttonText }]}>Zurück</Text>
          </Pressable>
          <View style={styles.gridWrap}>
            {TERMINAL_LOCATIONS.map((loc) => (
              <Pressable key={loc} style={[styles.gridItem, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => countAttendance('member', loc)}>
                <Text style={[styles.gridText, { color: theme.text }]}>{loc}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>Anwesenheit kann nur im aktiven Gebetszeitfenster gezählt werden.</Text>
      )}
    </ScrollView>
  );

  const renderStats = () => (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.statsHeaderCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.statsHeaderTitle, { color: theme.text }]}>Heutige Gebetsstatistik</Text>
      </View>

      {statsLoading ? <ActivityIndicator size="small" color={theme.text} /> : null}

      {!statsAttendance?.byPrayer || !statsView ? (
        <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.noteText, { color: theme.muted }]}>Keine Daten vorhanden</Text>
        </View>
      ) : (
        <>
          <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Gesamt Anwesende heute</Text>
            <Text style={[styles.statsBigValue, { color: theme.text }]}>{statsView.totalAttendance}</Text>
          </View>

          <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Top Majlises heute (alle Gebete)</Text>
            {statsView.topMajlis.length === 0 ? (
              <Text style={[styles.noteText, { color: theme.muted }]}>Keine Daten vorhanden</Text>
            ) : (
              (() => {
                const maxTop = Math.max(1, ...statsView.topMajlis.map(([, count]) => count));
                return statsView.topMajlis.map(([locationKey, count], idx) => (
                  <View key={locationKey} style={styles.rankRow}>
                    <Text style={[styles.rankText, { color: theme.muted }]}>{idx + 1}</Text>
                    <View style={styles.rankContent}>
                      <View style={styles.rankLabelRow}>
                        <Text style={[styles.noteText, { color: theme.text, textTransform: 'capitalize' }]}>{locationKey.replace(/_/g, ' ')}</Text>
                        <Text style={[styles.noteText, { color: theme.text, fontWeight: '800' }]}>{count}</Text>
                      </View>
                      <View style={[styles.rankTrack, { backgroundColor: theme.border }]}>
                        <View style={[styles.rankFill, { backgroundColor: theme.button, width: `${(count / maxTop) * 100}%` }]} />
                      </View>
                    </View>
                  </View>
                ));
              })()
            )}
          </View>

          <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Anzahl pro Gebet heute</Text>
            {(() => {
              const prayerKeys = ['fajr', 'sohar', 'asr', 'maghrib', 'ishaa'];
              const totals = prayerKeys.map((prayerKey) => {
                const prayer = statsAttendance.byPrayer?.[prayerKey] || {};
                const guest = Number(prayer.guest) || 0;
                const tanzeem = prayer.tanzeem || {};
                const members = ['ansar', 'khuddam', 'atfal'].reduce((sum, tanzeemKey) => {
                  const majlis = tanzeem[tanzeemKey]?.majlis || {};
                  return sum + Object.values(majlis).reduce((x, y) => x + (Number(y) || 0), 0);
                }, 0);
                return { prayerKey, total: guest + members };
              });
              const maxTotal = Math.max(1, ...totals.map((item) => item.total));
              return totals.map(({ prayerKey, total }) => (
                <View key={prayerKey} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: theme.text }]}>{PRAYER_LABELS[prayerKey]}</Text>
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

  const renderSettings = () => (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.switchRow}><Text style={[styles.sectionTitle, { color: theme.text }]}>Dark Mode</Text><Switch value={isDarkMode} onValueChange={onToggleDarkMode} /></View>
      </View>
      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Tasbeeh Goal</Text>
        <View style={styles.presetRow}>{GOAL_PRESETS.map((preset) => <Pressable key={preset} style={[styles.presetBtn, { backgroundColor: theme.button }]} onPress={() => setGoalInput(String(preset))}><Text style={[styles.presetBtnText, { color: theme.buttonText }]}>{preset}</Text></Pressable>)}</View>
        <TextInput value={goalInput} onChangeText={setGoalInput} keyboardType="number-pad" style={[styles.goalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
        <Pressable style={[styles.saveBtn, { backgroundColor: theme.button }]} onPress={saveGoal}><Text style={[styles.saveBtnText, { color: theme.buttonText }]}>Goal speichern</Text></Pressable>
      </View>
    </ScrollView>
  );

  const body = activeTab === 'tasbeeh'
    ? renderTasbeeh()
    : activeTab === 'gebetsplan'
      ? renderPrayer()
      : activeTab === 'terminal'
        ? renderTerminal()
        : activeTab === 'stats'
          ? renderStats()
          : renderSettings();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={styles.topSettingsOverlay}>
        <Pressable style={[styles.settingsFab, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setActiveTab(activeTab === 'settings' ? 'tasbeeh' : 'settings')}>
          <Text style={[styles.settingsFabText, { color: theme.text }]}>{activeTab === 'settings' ? '←' : '⚙️'}</Text>
        </Pressable>
      </View>
      <Animated.View style={{ flex: 1, transform: [{ scale: themePulseAnim }] }}>{body}</Animated.View>

      <View style={[styles.tabBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        {TAB_ITEMS.map((tab) => (
          <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={styles.tabItem}>
            <Text style={{ color: activeTab === tab.key ? theme.text : theme.muted, fontWeight: activeTab === tab.key ? '700' : '500', fontSize: 12 }}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {toast ? (
        <View style={[styles.toast, { backgroundColor: theme.button }]}><Text style={{ color: theme.buttonText, fontWeight: '700' }}>{toast}</Text></View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flexGrow: 1, padding: 16, gap: 10, paddingBottom: 16 },
  topSettingsOverlay: { position: 'absolute', top: 8, right: 16, zIndex: 20 },
  settingsFab: { width: 30, height: 30, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  settingsFabText: { fontSize: 14, fontWeight: '700' },
  headerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  titleWrap: { flex: 1, alignItems: 'center' },
  title: { fontSize: 36, fontWeight: '800', textAlign: 'center', letterSpacing: 0.5 },
  subtitle: { fontSize: 14, textAlign: 'center' },
  mainFlex: { flex: 1, justifyContent: 'space-between', gap: 10 },
  counterPressable: { flex: 1 },
  counter: { flex: 1, borderRadius: 26, borderWidth: 1, minHeight: 340, alignItems: 'center', justifyContent: 'center' },
  counterText: { fontSize: 92, fontWeight: '800', lineHeight: 98 },
  progressWrap: { gap: 8 },
  progressTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%' },
  progressText: { textAlign: 'center', fontSize: 13, fontWeight: '600' },
  resetBtn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  resetText: { fontSize: 17, fontWeight: '700' },
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
  section: { borderRadius: 14, borderWidth: 1, padding: 10, gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: { borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  presetBtnText: { fontSize: 13, fontWeight: '700' },
  saveBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700' },
  noteText: { fontSize: 12, fontWeight: '600' },
  goalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  tabBar: { flexDirection: 'row', borderTopWidth: 1 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  toast: { position: 'absolute', bottom: 68, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  bigTerminalBtn: { borderRadius: 18, minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  bigTerminalText: { fontSize: 34, fontWeight: '800' },
  terminalBanner: { borderRadius: 16, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  terminalBannerTitle: { textAlign: 'center', fontSize: 20, fontWeight: '800', letterSpacing: 0.2 },
  terminalBannerSubtitle: { textAlign: 'center', marginTop: 4, fontSize: 13, fontWeight: '600' },
  currentPrayerCard: { borderRadius: 16, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  currentPrayerText: { textAlign: 'center', fontSize: 20, fontWeight: '800' },
  urduText: { textAlign: 'center', fontSize: 12, marginTop: -2, marginBottom: 2 },
  guestLinkWrap: { alignSelf: 'center', marginTop: 8, paddingVertical: 4, paddingHorizontal: 8 },
  guestLinkText: { fontSize: 12, textDecorationLine: 'underline', fontWeight: '600' },
  tanzeemRow: { flexDirection: 'row', gap: 10 },
  tanzeemBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  statsHeaderCard: { borderRadius: 16, borderWidth: 1, padding: 14, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  statsHeaderTitle: { fontSize: 24, fontWeight: '800' },
  statsHeaderSub: { marginTop: 2, fontSize: 13, fontWeight: '600' },
  statsCard: { borderRadius: 16, borderWidth: 1, padding: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  statsCardTitle: { fontSize: 13, fontWeight: '700' },
  statsBigValue: { fontSize: 40, fontWeight: '800', marginTop: 4 },
  topMajlisRow: { borderBottomWidth: 1, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 76, fontSize: 12, fontWeight: '700' },
  barTrack: { flex: 1, height: 10, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  barValue: { width: 30, textAlign: 'right', fontSize: 12, fontWeight: '700' },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '48%', borderWidth: 1, borderRadius: 12, paddingVertical: 18, paddingHorizontal: 8 },
  gridText: { textAlign: 'center', fontWeight: '700' },
});
