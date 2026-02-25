import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  Vibration,
  View,
} from 'react-native';

const STORAGE_KEYS = {
  count: '@tasbeeh_count',
  goal: '@tasbeeh_goal',
  darkMode: '@tasbeeh_darkmode',
  scheduleCache: '@tasbeeh_schedule',
  adminPin: '@tasbeeh_admin_pin',
  adminSession: '@tasbeeh_admin_session',
};

const DEFAULT_GOAL = 100;
const GOAL_PRESETS = [33, 99, 100, 1000];
const DEFAULT_ADMIN_PIN = '7860'; // MVP only; client PIN is not secure by itself.

const FIRESTORE_COLLECTION = 'config';
const FIRESTORE_DOC = 'prayerSchedule';

// Insert your Firebase keys here.
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

/*
Firestore Rules guidance (configure in Firebase console):
match /databases/{database}/documents {
  match /config/prayerSchedule {
    allow read: if true;
    allow write: if request.auth != null; // recommended with Firebase Auth admin
  }
}
*/

const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const THEME = {
  light: {
    bg: '#F4F4F5',
    card: '#FFFFFF',
    border: '#E4E4E7',
    text: '#09090B',
    muted: '#71717A',
    accent: '#166534',
    accentSoft: '#DCFCE7',
    button: '#111827',
    buttonText: '#FFFFFF',
    progressTrack: '#E4E4E7',
    progressFill: '#111827',
    rowActiveBg: '#ECFDF3',
    rowActiveBorder: '#86EFAC',
    chipBg: '#ECFDF3',
    chipText: '#166534',
    danger: '#B91C1C',
  },
  dark: {
    bg: '#09090B',
    card: '#111827',
    border: '#374151',
    text: '#F9FAFB',
    muted: '#9CA3AF',
    accent: '#86EFAC',
    accentSoft: '#14532D',
    button: '#F9FAFB',
    buttonText: '#111827',
    progressTrack: '#1F2937',
    progressFill: '#93C5FD',
    rowActiveBg: '#052E1B',
    rowActiveBorder: '#22C55E',
    chipBg: '#14532D',
    chipText: '#BBF7D0',
    danger: '#FCA5A5',
  },
};

const pad = (value) => String(value).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseISO = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const addDaysISO = (iso, days) => {
  const d = parseISO(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + days);
  return toISO(d);
};

const isValidTime = (value) => {
  if (!/^\d{2}:\d{2}$/.test(value || '')) return false;
  const [h, m] = value.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
};

const addMinutes = (time, mins) => {
  if (!isValidTime(time)) return '--:--';
  const [h, m] = time.split(':').map(Number);
  const total = (((h * 60 + m + mins) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

const timeToMinutes = (time) => {
  if (!isValidTime(time)) return null;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const createDefaultSchedule = () => {
  const weekStartISO = '2026-02-19';
  const daily = {
    '2026-02-19': { sehriEnd: '05:58', iftar: '17:49' },
    '2026-02-20': { sehriEnd: '05:56', iftar: '17:51' },
    '2026-02-21': { sehriEnd: '05:54', iftar: '17:53' },
    '2026-02-22': { sehriEnd: '05:52', iftar: '17:55' },
    '2026-02-23': { sehriEnd: '05:50', iftar: '17:56' },
    '2026-02-24': { sehriEnd: '05:48', iftar: '17:58' },
    '2026-02-25': { sehriEnd: '05:46', iftar: '18:00' },
  };

  return {
    weekStartISO,
    city: 'Frankfurt am Main',
    globals: {
      sohAr: '13:30',
      assr: '16:00',
      ishaTara: '20:00',
      jumma: '13:15',
    },
    daily,
  };
};

const normalizeSchedule = (raw) => {
  const base = createDefaultSchedule();
  if (!raw || typeof raw !== 'object') return base;
  return {
    weekStartISO: parseISO(raw.weekStartISO) ? raw.weekStartISO : base.weekStartISO,
    city: typeof raw.city === 'string' && raw.city.trim() ? raw.city.trim() : base.city,
    globals: {
      sohAr: typeof raw.globals?.sohAr === 'string' ? raw.globals.sohAr : base.globals.sohAr,
      assr: typeof raw.globals?.assr === 'string' ? raw.globals.assr : base.globals.assr,
      ishaTara: typeof raw.globals?.ishaTara === 'string' ? raw.globals.ishaTara : base.globals.ishaTara,
      jumma: typeof raw.globals?.jumma === 'string' ? raw.globals.jumma : base.globals.jumma,
    },
    daily: typeof raw.daily === 'object' && raw.daily ? raw.daily : base.daily,
  };
};

const dynamicImport = (moduleName) => new Function('m', 'return import(m)')(moduleName);

let firebaseCache;
let firestoreCache;
let firestoreFns;

const initFirestore = async () => {
  if (firebaseCache && firestoreCache && firestoreFns) {
    return { app: firebaseCache, db: firestoreCache, ...firestoreFns };
  }

  const [{ initializeApp, getApps, getApp }, fs] = await Promise.all([
    dynamicImport(['firebase', 'app'].join('/')),
    dynamicImport(['firebase', 'firestore'].join('/')),
  ]);

  firebaseCache = getApps().length ? getApp() : initializeApp(firebaseConfig);
  firestoreCache = fs.getFirestore(firebaseCache);
  firestoreFns = {
    doc: fs.doc,
    getDoc: fs.getDoc,
    setDoc: fs.setDoc,
    onSnapshot: fs.onSnapshot,
  };

  return { app: firebaseCache, db: firestoreCache, ...firestoreFns };
};

let hapticsCache;
const successHaptic = async () => {
  try {
    if (!hapticsCache) hapticsCache = await dynamicImport('expo-haptics');
    if (hapticsCache?.notificationAsync && hapticsCache?.NotificationFeedbackType?.Success) {
      await hapticsCache.notificationAsync(hapticsCache.NotificationFeedbackType.Success);
      return;
    }
  } catch {
    // Ignore; fallback vibration below.
  }
  Vibration.vibrate(18);
};

const englishDateLong = (date) => {
  const opts = { month: 'long', day: 'numeric', year: 'numeric' };
  try {
    return new Intl.DateTimeFormat('en-US', opts).format(date);
  } catch {
    return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
  }
};

export default function App() {
  const systemScheme = useColorScheme();
  const [count, setCount] = useState(0);
  const [isCountLoaded, setIsCountLoaded] = useState(false);

  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [goalInput, setGoalInput] = useState(String(DEFAULT_GOAL));

  const [isDarkMode, setIsDarkMode] = useState(false); // default light mode as requested
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [adminPin, setAdminPin] = useState(DEFAULT_ADMIN_PIN);
  const [pinInput, setPinInput] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const [schedule, setSchedule] = useState(createDefaultSchedule);
  const [scheduleForm, setScheduleForm] = useState(createDefaultSchedule);
  const [scheduleState, setScheduleState] = useState('loading'); // loading | cloud | cached
  const [errors, setErrors] = useState({});

  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'ok' });

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const theme = isDarkMode ? THEME.dark : THEME.light;

  const today = new Date();
  const todayISO = toISO(today);
  const todayWeekday = DAY_NAMES_EN[today.getDay()];

  const todayDaily = schedule.daily[todayISO] || { sehriEnd: '', iftar: '' };
  const fajrTime = addMinutes(todayDaily.sehriEnd, 20);
  const maghribTime = addMinutes(todayDaily.iftar, 10);
  const jummaToday = today.getDay() === 5 ? schedule.globals.jumma : '—';

  const prayerRows = useMemo(
    () => [
      { key: 'fajr', label: 'Fajr (الفجر)', time: fajrTime, includeInActiveCheck: true },
      { key: 'sohar', label: 'Sohar (الظهر)', time: schedule.globals.sohAr, includeInActiveCheck: true },
      { key: 'assr', label: 'Assr (العصر)', time: schedule.globals.assr, includeInActiveCheck: true },
      { key: 'maghrib', label: 'Maghrib (المغرب)', time: maghribTime, includeInActiveCheck: true },
      { key: 'isha', label: 'Ishaa/Taravih (العشاء)', time: schedule.globals.ishaTara, includeInActiveCheck: true },
      { key: 'jumma', label: 'Jumma', time: jummaToday, includeInActiveCheck: false },
      { key: 'sehri', label: 'Tahajjud/Sehri-Ende', time: todayDaily.sehriEnd || '—', includeInActiveCheck: false },
      { key: 'iftari', label: 'Iftari', time: todayDaily.iftar || '—', includeInActiveCheck: false },
    ],
    [fajrTime, schedule.globals, maghribTime, jummaToday, todayDaily],
  );

  const activePrayerKey = useMemo(() => {
    const nowMinutes = today.getHours() * 60 + today.getMinutes();
    const candidates = prayerRows
      .filter((r) => r.includeInActiveCheck)
      .map((r) => ({ key: r.key, mins: timeToMinutes(r.time) }))
      .filter((r) => r.mins !== null)
      .sort((a, b) => a.mins - b.mins);

    let lastKey = null;
    candidates.forEach((r) => {
      if (r.mins <= nowMinutes) lastKey = r.key;
    });
    return lastKey;
  }, [prayerRows, today]);

  const progress = useMemo(() => Math.min((count / goal) * 100, 100), [count, goal]);

  const showSnack = (message, type = 'ok') => setSnackbar({ visible: true, message, type });

  useEffect(() => {
    if (!snackbar.visible) return undefined;
    const timer = setTimeout(() => setSnackbar((p) => ({ ...p, visible: false })), 2200);
    return () => clearTimeout(timer);
  }, [snackbar.visible]);

  useEffect(() => {
    const loadLocal = async () => {
      try {
        const [countRaw, goalRaw, darkRaw, pinRaw, adminSessionRaw, scheduleRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.count),
          AsyncStorage.getItem(STORAGE_KEYS.goal),
          AsyncStorage.getItem(STORAGE_KEYS.darkMode),
          AsyncStorage.getItem(STORAGE_KEYS.adminPin),
          AsyncStorage.getItem(STORAGE_KEYS.adminSession),
          AsyncStorage.getItem(STORAGE_KEYS.scheduleCache),
        ]);

        if (countRaw !== null) {
          const parsedCount = Number.parseInt(countRaw, 10);
          if (!Number.isNaN(parsedCount)) setCount(parsedCount);
        }

        if (goalRaw) {
          const parsedGoal = Number.parseInt(goalRaw, 10);
          if (!Number.isNaN(parsedGoal) && parsedGoal >= 1 && parsedGoal <= 100000) {
            setGoal(parsedGoal);
            setGoalInput(String(parsedGoal));
          }
        }

        if (darkRaw === '1' || darkRaw === '0') {
          setIsDarkMode(darkRaw === '1');
        } else {
          setIsDarkMode(systemScheme === 'dark' ? false : false);
        }

        if (pinRaw) setAdminPin(pinRaw);
        if (adminSessionRaw === '1') setIsAdmin(true);

        if (scheduleRaw) {
          const parsedSchedule = normalizeSchedule(JSON.parse(scheduleRaw));
          setSchedule(parsedSchedule);
          setScheduleForm(parsedSchedule);
          setScheduleState('cached');
        }
      } catch (error) {
        console.warn('Failed to load local data:', error);
      } finally {
        setIsCountLoaded(true);
      }
    };

    loadLocal();
  }, [systemScheme]);

  useEffect(() => {
    if (!isCountLoaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.count, String(count)).catch(() => {});
  }, [count, isCountLoaded]);

  const pullScheduleFromCloud = async () => {
    try {
      const { db, doc, getDoc, setDoc } = await initFirestore();
      const ref = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        const seed = createDefaultSchedule();
        // Firestore remains source of truth; seed the document if missing.
        await setDoc(ref, seed, { merge: true });
        setSchedule(seed);
        setScheduleForm(seed);
        setScheduleState('cloud');
        await AsyncStorage.setItem(STORAGE_KEYS.scheduleCache, JSON.stringify(seed));
        return;
      }

      const cloudSchedule = normalizeSchedule(snap.data());
      setSchedule(cloudSchedule);
      setScheduleForm(cloudSchedule);
      setScheduleState('cloud');
      await AsyncStorage.setItem(STORAGE_KEYS.scheduleCache, JSON.stringify(cloudSchedule));
    } catch (error) {
      console.warn('Cloud load failed, staying on cache:', error);
      setScheduleState('cached');
      showSnack('Offline / cached', 'error');
    }
  };

  useEffect(() => {
    pullScheduleFromCloud();
  }, []);

  useEffect(() => {
    let unsubscribe;

    const setupSnapshot = async () => {
      try {
        const { db, doc, onSnapshot } = await initFirestore();
        const ref = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC);
        unsubscribe = onSnapshot(
          ref,
          async (snap) => {
            if (!snap.exists()) return;
            const cloudSchedule = normalizeSchedule(snap.data());
            setSchedule(cloudSchedule);
            setScheduleForm(cloudSchedule);
            setScheduleState('cloud');
            await AsyncStorage.setItem(STORAGE_KEYS.scheduleCache, JSON.stringify(cloudSchedule));
          },
          (error) => {
            console.warn('Snapshot listener error:', error);
            setScheduleState((prev) => (prev === 'cloud' ? prev : 'cached'));
            showSnack('Offline / cached', 'error');
          },
        );
      } catch {
        // Keep cache mode.
      }
    };

    setupSnapshot();
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const onCounterPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.975,
      useNativeDriver: true,
      speed: 18,
      bounciness: 5,
    }).start();
  };

  const onCounterPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 5,
    }).start();
  };

  const incrementCount = () => {
    setCount((prev) => prev + 1);
    Vibration.vibrate(8);
  };

  const saveGoal = async () => {
    const parsedGoal = Number.parseInt(goalInput.trim(), 10);
    if (Number.isNaN(parsedGoal) || parsedGoal < 1 || parsedGoal > 100000) {
      Alert.alert('Ungültiges Ziel', 'Bitte eine Zahl zwischen 1 und 100000 eingeben.');
      return;
    }
    setGoal(parsedGoal);
    await AsyncStorage.setItem(STORAGE_KEYS.goal, String(parsedGoal));
    showSnack('Saved ✓');
  };

  const onDarkModeChange = async (value) => {
    setIsDarkMode(value);
    await AsyncStorage.setItem(STORAGE_KEYS.darkMode, value ? '1' : '0');
  };

  const adminLogin = async () => {
    if (pinInput.trim() !== adminPin) {
      Alert.alert('Fehler', 'PIN ist nicht korrekt.');
      return;
    }
    setIsAdmin(true);
    setPinInput('');
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.adminSession, '1');
    } catch (error) {
      console.warn('Failed to persist admin session:', error);
    }
  };

  const updateFormGlobal = (key, value) => {
    setScheduleForm((prev) => ({
      ...prev,
      globals: {
        ...prev.globals,
        [key]: value.trim(),
      },
    }));
  };

  const updateFormDaily = (dateISO, key, value) => {
    setScheduleForm((prev) => ({
      ...prev,
      daily: {
        ...prev.daily,
        [dateISO]: {
          sehriEnd: prev.daily[dateISO]?.sehriEnd || '',
          iftar: prev.daily[dateISO]?.iftar || '',
          [key]: value.trim(),
        },
      },
    }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!scheduleForm.city.trim()) nextErrors.city = 'City required';

    ['sohAr', 'assr', 'ishaTara', 'jumma'].forEach((k) => {
      if (!isValidTime(scheduleForm.globals[k])) nextErrors[`g_${k}`] = 'HH:MM';
    });

    const toCheck = [todayISO, ...Array.from({ length: 7 }, (_, i) => addDaysISO(todayISO, i))];
    toCheck.forEach((dateISO) => {
      const row = scheduleForm.daily[dateISO] || { sehriEnd: '', iftar: '' };
      if (!isValidTime(row.sehriEnd)) nextErrors[`d_${dateISO}_sehriEnd`] = 'HH:MM';
      if (!isValidTime(row.iftar)) nextErrors[`d_${dateISO}_iftar`] = 'HH:MM';
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveSchedule = async () => {
    if (!isAdmin) return;
    if (!validateForm()) {
      showSnack('Save failed', 'error');
      return;
    }

    const normalized = normalizeSchedule(scheduleForm);

    try {
      const { db, doc, setDoc } = await initFirestore();
      await setDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC), normalized);
      setSchedule(normalized);
      setScheduleForm(normalized);
      setScheduleState('cloud');
      await AsyncStorage.setItem(STORAGE_KEYS.scheduleCache, JSON.stringify(normalized));
      await successHaptic();
      showSnack('Saved ✓');
    } catch (error) {
      console.warn('Failed to save cloud schedule:', error);
      showSnack('Save failed', 'error');
    }
  };

  const nowStatusText = scheduleState === 'cloud' ? 'Live synced' : scheduleState === 'cached' ? 'Offline / cached' : 'Loading...';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>Tasbeeh Zähler</Text>
          <Pressable
            onPress={() => setSettingsOpen(true)}
            style={({ pressed }) => [
              styles.settingsBtn,
              { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.settingsBtnText, { color: theme.text }]}>⚙️</Text>
          </Pressable>
        </View>

        <Text style={[styles.subtitle, { color: theme.muted }]}>Tippe auf den Zählerbereich, um zu erhöhen</Text>

        <Pressable onPress={incrementCount} onPressIn={onCounterPressIn} onPressOut={onCounterPressOut}>
          <Animated.View
            style={[
              styles.counter,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {!isCountLoaded ? <ActivityIndicator size="large" color={theme.text} /> : <Text style={[styles.counterText, { color: theme.text }]}>{count}</Text>}
          </Animated.View>
        </Pressable>

        <View style={styles.progressWrap}>
          <View style={[styles.progressTrack, { backgroundColor: theme.progressTrack }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.progressFill, width: `${progress}%` }]} />
          </View>
          <Text style={[styles.progressText, { color: theme.muted }]}>Ziel: {goal} • {progress.toFixed(0)}%</Text>
        </View>

        <Pressable style={[styles.resetBtn, { backgroundColor: theme.button }]} onPress={() => setCount(0)}>
          <Text style={[styles.resetText, { color: theme.buttonText }]}>Reset</Text>
        </Pressable>

        <View style={[styles.dayCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.dayName, { color: theme.text }]}>{todayWeekday}</Text>
          <Text style={[styles.dayDate, { color: theme.muted }]}>{englishDateLong(today)}</Text>

          <View style={[styles.cityBadge, { backgroundColor: theme.chipBg }]}>
            <Text style={[styles.cityBadgeText, { color: theme.chipText }]}>{schedule.city}</Text>
          </View>

          <Text style={[styles.syncStatus, { color: scheduleState === 'cloud' ? theme.accent : theme.danger }]}>{nowStatusText}</Text>

          {prayerRows.map((row) => {
            const isActive = row.key === activePrayerKey;
            return (
              <View
                key={row.key}
                style={[
                  styles.prayerRow,
                  { borderBottomColor: theme.border },
                  isActive && { backgroundColor: theme.rowActiveBg, borderColor: theme.rowActiveBorder, borderWidth: 1, borderRadius: 10 },
                ]}
              >
                <Text
                  style={[
                    styles.prayerLabel,
                    {
                      color: theme.text,
                      fontFamily: row.label.includes('(') ? 'Amiri, Noto Naskh Arabic, serif' : undefined,
                    },
                  ]}
                >
                  {row.label}
                </Text>
                <Text style={[styles.prayerValue, { color: theme.text }]}>{row.time || '—'}</Text>
              </View>
            );
          })}
        </View>

        <Text style={[styles.footer, { color: theme.muted }]}>Made by Tehmoor</Text>
      </ScrollView>

      <Modal visible={settingsOpen} transparent animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Settings</Text>
              <Pressable onPress={() => setSettingsOpen(false)}>
                <Text style={[styles.closeText, { color: theme.text }]}>Schließen</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.switchRow}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Dark Mode</Text>
                  <Switch value={isDarkMode} onValueChange={onDarkModeChange} />
                </View>
              </View>

              <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Tasbeeh Goal</Text>
                <View style={styles.presetRow}>
                  {GOAL_PRESETS.map((preset) => (
                    <Pressable
                      key={preset}
                      style={[styles.presetBtn, { backgroundColor: theme.button }]}
                      onPress={() => setGoalInput(String(preset))}
                    >
                      <Text style={[styles.presetBtnText, { color: theme.buttonText }]}>{preset}</Text>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  value={goalInput}
                  onChangeText={setGoalInput}
                  keyboardType="number-pad"
                  style={[styles.input, { borderColor: theme.border, backgroundColor: theme.bg, color: theme.text }]}
                  placeholder="1 bis 100000"
                  placeholderTextColor={theme.muted}
                />

                <Pressable style={[styles.saveBtn, { backgroundColor: theme.button }]} onPress={saveGoal}>
                  <Text style={[styles.saveBtnText, { color: theme.buttonText }]}>Goal speichern</Text>
                </Pressable>
              </View>

              <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Admin Mode</Text>

                {!isAdmin ? (
                  <>
                    <TextInput
                      value={pinInput}
                      onChangeText={setPinInput}
                      secureTextEntry
                      style={[styles.input, { borderColor: theme.border, backgroundColor: theme.bg, color: theme.text }]}
                      placeholder="Admin PIN"
                      placeholderTextColor={theme.muted}
                    />
                    <Pressable style={[styles.saveBtn, { backgroundColor: theme.button }]} onPress={adminLogin}>
                      <Text style={[styles.saveBtnText, { color: theme.buttonText }]}>Login</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={[styles.noteText, { color: theme.muted }]}>Logged in. (MVP PIN only, not secure for production.)</Text>

                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>City</Text>
                    <TextInput
                      value={scheduleForm.city}
                      onChangeText={(v) => setScheduleForm((p) => ({ ...p, city: v }))}
                      style={[styles.input, { borderColor: theme.border, backgroundColor: theme.bg, color: theme.text }]}
                    />
                    {errors.city ? <Text style={[styles.errorText, { color: theme.danger }]}>{errors.city}</Text> : null}

                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>Sohar (HH:MM)</Text>
                    <TextInput
                      value={scheduleForm.globals.sohAr}
                      onChangeText={(v) => updateFormGlobal('sohAr', v)}
                      style={[styles.input, { borderColor: theme.border, backgroundColor: theme.bg, color: theme.text }]}
                    />
                    {errors.g_sohAr ? <Text style={[styles.errorText, { color: theme.danger }]}>{errors.g_sohAr}</Text> : null}

                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>Assr (HH:MM)</Text>
                    <TextInput
                      value={scheduleForm.globals.assr}
                      onChangeText={(v) => updateFormGlobal('assr', v)}
                      style={[styles.input, { borderColor: theme.border, backgroundColor: theme.bg, color: theme.text }]}
                    />
                    {errors.g_assr ? <Text style={[styles.errorText, { color: theme.danger }]}>{errors.g_assr}</Text> : null}

                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>Ishaa & Taravih (HH:MM)</Text>
                    <TextInput
                      value={scheduleForm.globals.ishaTara}
                      onChangeText={(v) => updateFormGlobal('ishaTara', v)}
                      style={[styles.input, { borderColor: theme.border, backgroundColor: theme.bg, color: theme.text }]}
                    />
                    {errors.g_ishaTara ? <Text style={[styles.errorText, { color: theme.danger }]}>{errors.g_ishaTara}</Text> : null}

                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>Jumma (HH:MM)</Text>
                    <TextInput
                      value={scheduleForm.globals.jumma}
                      onChangeText={(v) => updateFormGlobal('jumma', v)}
                      style={[styles.input, { borderColor: theme.border, backgroundColor: theme.bg, color: theme.text }]}
                    />
                    {errors.g_jumma ? <Text style={[styles.errorText, { color: theme.danger }]}>{errors.g_jumma}</Text> : null}

                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>Today Sehri-Ende/Tahajjud (HH:MM)</Text>
                    <TextInput
                      value={scheduleForm.daily[todayISO]?.sehriEnd || ''}
                      onChangeText={(v) => updateFormDaily(todayISO, 'sehriEnd', v)}
                      style={[styles.input, { borderColor: theme.border, backgroundColor: theme.bg, color: theme.text }]}
                    />
                    {errors[`d_${todayISO}_sehriEnd`] ? <Text style={[styles.errorText, { color: theme.danger }]}>{errors[`d_${todayISO}_sehriEnd`]}</Text> : null}

                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>Today Iftar (HH:MM)</Text>
                    <TextInput
                      value={scheduleForm.daily[todayISO]?.iftar || ''}
                      onChangeText={(v) => updateFormDaily(todayISO, 'iftar', v)}
                      style={[styles.input, { borderColor: theme.border, backgroundColor: theme.bg, color: theme.text }]}
                    />
                    {errors[`d_${todayISO}_iftar`] ? <Text style={[styles.errorText, { color: theme.danger }]}>{errors[`d_${todayISO}_iftar`]}</Text> : null}

                    {Array.from({ length: 7 }, (_, i) => addDaysISO(todayISO, i)).map((dateISO) => (
                      <View key={dateISO} style={[styles.dayEditBox, { borderColor: theme.border }]}>
                        <Text style={[styles.dayEditTitle, { color: theme.text }]}>{dateISO}</Text>
                        <TextInput
                          value={scheduleForm.daily[dateISO]?.sehriEnd || ''}
                          onChangeText={(v) => updateFormDaily(dateISO, 'sehriEnd', v)}
                          style={[styles.input, { borderColor: theme.border, backgroundColor: theme.bg, color: theme.text }]}
                          placeholder="Sehri-Ende HH:MM"
                          placeholderTextColor={theme.muted}
                        />
                        {errors[`d_${dateISO}_sehriEnd`] ? <Text style={[styles.errorText, { color: theme.danger }]}>{errors[`d_${dateISO}_sehriEnd`]}</Text> : null}

                        <TextInput
                          value={scheduleForm.daily[dateISO]?.iftar || ''}
                          onChangeText={(v) => updateFormDaily(dateISO, 'iftar', v)}
                          style={[styles.input, { borderColor: theme.border, backgroundColor: theme.bg, color: theme.text }]}
                          placeholder="Iftar HH:MM"
                          placeholderTextColor={theme.muted}
                        />
                        {errors[`d_${dateISO}_iftar`] ? <Text style={[styles.errorText, { color: theme.danger }]}>{errors[`d_${dateISO}_iftar`]}</Text> : null}
                      </View>
                    ))}

                    <Pressable style={[styles.saveBtn, { backgroundColor: theme.button }]} onPress={saveSchedule}>
                      <Text style={[styles.saveBtnText, { color: theme.buttonText }]}>Schedule speichern</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.saveBtn, { backgroundColor: theme.button }]}
                      onPress={async () => {
                        setIsAdmin(false);
                        await AsyncStorage.setItem(STORAGE_KEYS.adminSession, '0');
                        showSnack('Logged out');
                      }}
                    >
                      <Text style={[styles.saveBtnText, { color: theme.buttonText }]}>Logout</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {snackbar.visible ? (
        <View style={[styles.snackbar, { backgroundColor: snackbar.type === 'ok' ? '#166534' : '#991B1B' }]}>
          <Text style={styles.snackbarText}>{snackbar.message}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '800' },
  settingsBtn: { borderRadius: 12, borderWidth: 1, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  settingsBtnText: { fontSize: 20 },
  subtitle: { fontSize: 14 },

  counter: {
    borderRadius: 26,
    borderWidth: 1,
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
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

  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  prayerLabel: { fontSize: 17, fontWeight: '500', flex: 1, marginRight: 10 },
  prayerValue: { fontSize: 20, fontWeight: '700' },

  footer: { textAlign: 'center', fontSize: 12, fontWeight: '500' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.32)' },
  modalSheet: { maxHeight: '92%', borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, padding: 12 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 24, fontWeight: '800' },
  closeText: { fontSize: 14, fontWeight: '700' },

  section: { borderRadius: 14, borderWidth: 1, padding: 10, gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: { borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  presetBtnText: { fontSize: 13, fontWeight: '700' },

  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontSize: 14 },
  saveBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700' },
  noteText: { fontSize: 12, fontWeight: '600' },
  fieldLabel: { fontSize: 12, fontWeight: '700' },
  errorText: { fontSize: 11, fontWeight: '700', marginTop: -5 },
  dayEditBox: { borderWidth: 1, borderRadius: 10, padding: 8, gap: 6 },
  dayEditTitle: { fontSize: 12, fontWeight: '700' },

  snackbar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  snackbarText: { color: '#fff', fontWeight: '700' },
});
