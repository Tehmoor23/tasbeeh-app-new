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
  View,
  Vibration,
} from 'react-native';

const STORAGE_KEYS = {
  count: '@tasbeeh_count',
  goal: '@tasbeeh_goal',
  darkMode: '@tasbeeh_darkmode',
  scheduleCache: '@tasbeeh_schedule',
  adminPin: '@tasbeeh_admin_pin',
};

const DEFAULT_GOAL = 100;
const GOAL_PRESETS = [33, 99, 100, 1000];
const DEFAULT_ADMIN_PIN = '7860';
const FIRESTORE_COLLECTION = 'config';
const FIRESTORE_DOC = 'prayerSchedule';

// Set true only if you explicitly want first-time clients to write seed data when document is missing.
const ALLOW_INITIAL_SEED_WRITE = false;

// Firebase config placeholder (replace with your real values).
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

/*
Suggested Firestore Security Rules (set in Firebase console, not here):
match /databases/{database}/documents {
  match /config/prayerSchedule {
    allow read: if true;
    allow write: if request.auth != null; // Prefer Firebase Auth for production admin security
  }
}
Note: This app currently uses client-side Admin PIN (Option A), which is NOT secure alone.
*/

const DAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

const THEME = {
  light: {
    bg: '#F5F0E7',
    paper: '#E7D7C0',
    card: 'rgba(255,255,255,0.68)',
    border: 'rgba(68,54,42,0.22)',
    text: '#1E1B18',
    muted: '#5F5247',
    accent: '#1F1A16',
    accentText: '#FFFFFF',
    inputBg: '#FCFAF6',
    danger: '#B91C1C',
    progressTrack: '#D4C6B3',
    progressFill: '#5D4B3A',
    rose: '#D7BABA',
  },
  dark: {
    bg: '#090B10',
    paper: '#1D1612',
    card: 'rgba(17,24,39,0.75)',
    border: 'rgba(148,163,184,0.3)',
    text: '#ECEFF4',
    muted: '#B4BDC9',
    accent: '#F8FAFC',
    accentText: '#0F172A',
    inputBg: '#0F172A',
    danger: '#FDA4AF',
    progressTrack: '#1F2937',
    progressFill: '#93C5FD',
    rose: '#452E33',
  },
};

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseISO = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const addDaysISO = (iso, offset) => {
  const d = parseISO(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + offset);
  return toISO(d);
};

const formatWeekRange = (startISO) => {
  const start = parseISO(startISO);
  const end = parseISO(addDaysISO(startISO, 6));
  if (!start || !end) return '--.-- - --.--';
  return `${pad(start.getDate())}.${pad(start.getMonth() + 1)} - ${pad(end.getDate())}.${pad(end.getMonth() + 1)}`;
};

const formatDayHeader = (iso) => {
  const d = parseISO(iso);
  if (!d) return { date: '--.--', day: '--' };
  return { date: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`, day: DAYS_DE[d.getDay()] };
};

const isValidTime = (value) => {
  if (!/^\d{2}:\d{2}$/.test(value || '')) return false;
  const [h, m] = value.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
};

const addMinutes = (time, min) => {
  if (!isValidTime(time)) return '--:--';
  const [h, m] = time.split(':').map(Number);
  const t = (((h * 60 + m + min) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
};

const isCurrentWeek = (weekStartISO) => {
  const start = parseISO(weekStartISO);
  if (!start) return false;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return today >= start && today <= end;
};

const getCurrentWeekStartISO = () => {
  const d = new Date();
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return toISO(d);
};

const createSeedSchedule = () => ({
  weekStartISO: '2026-02-19',
  city: 'Frankfurt am Main',
  globalTimes: {
    sohar: '13:30',
    asr: '16:00',
    ishaTara: '20:00',
    jumma: '13:15',
  },
  days: [
    { dateISO: '2026-02-19', sehriEnd: '05:58', iftar: '17:49' },
    { dateISO: '2026-02-20', sehriEnd: '05:56', iftar: '17:51' },
    { dateISO: '2026-02-21', sehriEnd: '05:54', iftar: '17:53' },
    { dateISO: '2026-02-22', sehriEnd: '05:52', iftar: '17:55' },
    { dateISO: '2026-02-23', sehriEnd: '05:50', iftar: '17:56' },
    { dateISO: '2026-02-24', sehriEnd: '05:48', iftar: '17:58' },
    { dateISO: '2026-02-25', sehriEnd: '05:46', iftar: '18:00' },
  ],
});

const normalizeSchedule = (raw) => {
  const seed = createSeedSchedule();
  if (!raw || typeof raw !== 'object') return seed;
  const weekStartISO = parseISO(raw.weekStartISO) ? raw.weekStartISO : seed.weekStartISO;
  const city = typeof raw.city === 'string' && raw.city.trim() ? raw.city.trim() : seed.city;

  const globalTimes = {
    sohar: typeof raw.globalTimes?.sohar === 'string' ? raw.globalTimes.sohar : seed.globalTimes.sohar,
    asr: typeof raw.globalTimes?.asr === 'string' ? raw.globalTimes.asr : seed.globalTimes.asr,
    ishaTara: typeof raw.globalTimes?.ishaTara === 'string' ? raw.globalTimes.ishaTara : seed.globalTimes.ishaTara,
    jumma: typeof raw.globalTimes?.jumma === 'string' ? raw.globalTimes.jumma : seed.globalTimes.jumma,
  };

  const days = Array.from({ length: 7 }, (_, i) => {
    const existing = Array.isArray(raw.days) ? raw.days[i] : null;
    return {
      dateISO: parseISO(existing?.dateISO) ? existing.dateISO : addDaysISO(weekStartISO, i),
      sehriEnd: typeof existing?.sehriEnd === 'string' ? existing.sehriEnd : '',
      iftar: typeof existing?.iftar === 'string' ? existing.iftar : '',
    };
  });

  return { weekStartISO, city, globalTimes, days };
};

const dynamicImport = (moduleName) => new Function('m', 'return import(m)')(moduleName);

let firebaseAppCache;
let firestoreCache;
let firestoreHelpers;

const initFirestore = async () => {
  if (firestoreCache && firestoreHelpers) return { db: firestoreCache, ...firestoreHelpers };
  const [{ initializeApp, getApps, getApp }, firestoreModule] = await Promise.all([
    dynamicImport(['firebase', 'app'].join('/')),
    dynamicImport(['firebase', 'firestore'].join('/')),
  ]);

  firebaseAppCache = getApps().length ? getApp() : initializeApp(firebaseConfig);
  firestoreCache = firestoreModule.getFirestore(firebaseAppCache);
  firestoreHelpers = {
    doc: firestoreModule.doc,
    getDoc: firestoreModule.getDoc,
    setDoc: firestoreModule.setDoc,
    onSnapshot: firestoreModule.onSnapshot,
  };
  return { db: firestoreCache, ...firestoreHelpers };
};

let hapticsModule;
const getHaptics = async () => {
  if (hapticsModule) return hapticsModule;
  try {
    hapticsModule = await dynamicImport('expo-haptics');
    return hapticsModule;
  } catch {
    return null;
  }
};

export default function App() {
  const systemScheme = useColorScheme();
  const [count, setCount] = useState(0);
  const [countReady, setCountReady] = useState(false);

  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [goalInput, setGoalInput] = useState(String(DEFAULT_GOAL));

  const [isDark, setIsDark] = useState(systemScheme === 'dark');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prayerOpen, setPrayerOpen] = useState(false);

  const [adminPin, setAdminPin] = useState(DEFAULT_ADMIN_PIN);
  const [pinInput, setPinInput] = useState('');
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);

  const [schedule, setSchedule] = useState(createSeedSchedule);
  const [scheduleForm, setScheduleForm] = useState(createSeedSchedule);
  const [scheduleStatus, setScheduleStatus] = useState('idle');
  const [inlineErrors, setInlineErrors] = useState({});

  const [snackbar, setSnackbar] = useState({ visible: false, text: '', type: 'ok' });

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const theme = isDark ? THEME.dark : THEME.light;
  const progress = useMemo(() => Math.min((count / goal) * 100, 100), [count, goal]);

  const derivedDays = useMemo(
    () => schedule.days.map((d) => ({ ...d, fajr: addMinutes(d.sehriEnd, 20), maghrib: addMinutes(d.iftar, 10) })),
    [schedule.days],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (snackbar.visible) setSnackbar((p) => ({ ...p, visible: false }));
    }, 2200);
    return () => clearTimeout(t);
  }, [snackbar.visible]);

  const showSnack = (text, type = 'ok') => setSnackbar({ visible: true, text, type });

  useEffect(() => {
    const load = async () => {
      try {
        const [countRaw, goalRaw, darkRaw, pinRaw, cacheRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.count),
          AsyncStorage.getItem(STORAGE_KEYS.goal),
          AsyncStorage.getItem(STORAGE_KEYS.darkMode),
          AsyncStorage.getItem(STORAGE_KEYS.adminPin),
          AsyncStorage.getItem(STORAGE_KEYS.scheduleCache),
        ]);

        if (countRaw !== null) {
          const n = Number.parseInt(countRaw, 10);
          if (!Number.isNaN(n)) setCount(n);
        }

        if (goalRaw) {
          const n = Number.parseInt(goalRaw, 10);
          if (!Number.isNaN(n) && n >= 1 && n <= 100000) {
            setGoal(n);
            setGoalInput(String(n));
          }
        }

        if (darkRaw === '1' || darkRaw === '0') setIsDark(darkRaw === '1');
        if (pinRaw) setAdminPin(pinRaw);

        if (cacheRaw) {
          const parsed = normalizeSchedule(JSON.parse(cacheRaw));
          setSchedule(parsed);
          setScheduleForm(parsed);
        }
      } catch (e) {
        console.warn('Failed loading local settings:', e);
      } finally {
        setCountReady(true);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!countReady) return;
    AsyncStorage.setItem(STORAGE_KEYS.count, String(count)).catch(() => {});
  }, [count, countReady]);

  const refreshScheduleFromCloud = async () => {
    setScheduleStatus('loading');
    try {
      const { db, doc, getDoc, setDoc } = await initFirestore();
      const ref = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        const seed = createSeedSchedule();
        if (ALLOW_INITIAL_SEED_WRITE) {
          await setDoc(ref, seed);
        }
        setSchedule(seed);
        setScheduleForm(seed);
        await AsyncStorage.setItem(STORAGE_KEYS.scheduleCache, JSON.stringify(seed));
        setScheduleStatus('ready');
        return;
      }

      const cloud = normalizeSchedule(snap.data());
      setSchedule(cloud);
      setScheduleForm(cloud);
      await AsyncStorage.setItem(STORAGE_KEYS.scheduleCache, JSON.stringify(cloud));
      setScheduleStatus('ready');
    } catch (e) {
      console.warn('Firestore unavailable, using cache fallback:', e);
      setScheduleStatus('offline');
      showSnack('Offline cache active', 'error');
    }
  };

  useEffect(() => {
    refreshScheduleFromCloud();
  }, []);

  useEffect(() => {
    let unsub;
    let mounted = true;

    const setupRealtime = async () => {
      try {
        const { db, doc, onSnapshot } = await initFirestore();
        const ref = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC);
        unsub = onSnapshot(
          ref,
          async (snap) => {
            if (!mounted || !snap.exists()) return;
            const cloud = normalizeSchedule(snap.data());
            setSchedule(cloud);
            setScheduleForm(cloud);
            await AsyncStorage.setItem(STORAGE_KEYS.scheduleCache, JSON.stringify(cloud));
          },
          () => {},
        );
      } catch {
        // Firestore SDK absent/offline: fallback already handled.
      }
    };

    setupRealtime();
    return () => {
      mounted = false;
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const animateIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true, speed: 18, bounciness: 5 }).start();
  };

  const animateOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 5 }).start();
  };

  const incrementCount = () => {
    setCount((prev) => prev + 1);
    Vibration.vibrate(8);
  };

  const saveGoal = async () => {
    const n = Number.parseInt(goalInput.trim(), 10);
    if (Number.isNaN(n) || n < 1 || n > 100000) {
      Alert.alert('Ungültiges Ziel', 'Bitte 1 bis 100000 eingeben.');
      return;
    }
    setGoal(n);
    await AsyncStorage.setItem(STORAGE_KEYS.goal, String(n));
    showSnack('Saved ✓');
  };

  const toggleDark = async (value) => {
    setIsDark(value);
    await AsyncStorage.setItem(STORAGE_KEYS.darkMode, value ? '1' : '0');
  };

  const loginAdmin = () => {
    if (pinInput.trim() !== adminPin) {
      Alert.alert('Fehler', 'PIN ist nicht korrekt.');
      return;
    }
    setAdminLoggedIn(true);
    setPinInput('');
  };

  const validateScheduleForm = () => {
    const errs = {};
    if (!parseISO(scheduleForm.weekStartISO)) errs.weekStartISO = 'YYYY-MM-DD nötig';
    if (!scheduleForm.city.trim()) errs.city = 'Stadt erforderlich';

    ['sohar', 'asr', 'ishaTara', 'jumma'].forEach((key) => {
      if (!isValidTime(scheduleForm.globalTimes[key])) errs[`g_${key}`] = 'HH:MM';
    });

    scheduleForm.days.forEach((d, i) => {
      if (!isValidTime(d.sehriEnd)) errs[`d_${i}_sehri`] = 'HH:MM';
      if (!isValidTime(d.iftar)) errs[`d_${i}_iftar`] = 'HH:MM';
    });

    setInlineErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const triggerSaveHaptic = async () => {
    const h = await getHaptics();
    if (h?.notificationAsync && h?.NotificationFeedbackType?.Success) {
      try {
        await h.notificationAsync(h.NotificationFeedbackType.Success);
        return;
      } catch {}
    }
    Vibration.vibrate(20);
  };

  const saveScheduleToCloud = async () => {
    if (!adminLoggedIn) return;
    if (!validateScheduleForm()) {
      showSnack('Save failed', 'error');
      return;
    }

    const normalized = normalizeSchedule({
      ...scheduleForm,
      days: scheduleForm.days.map((d, i) => ({
        ...d,
        dateISO: addDaysISO(scheduleForm.weekStartISO, i),
      })),
    });

    try {
      const { db, doc, setDoc } = await initFirestore();
      await setDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC), normalized);
      setSchedule(normalized);
      setScheduleForm(normalized);
      await AsyncStorage.setItem(STORAGE_KEYS.scheduleCache, JSON.stringify(normalized));
      await triggerSaveHaptic();
      showSnack('Saved ✓');
    } catch (e) {
      console.warn('Save failed:', e);
      showSnack('Save failed', 'error');
    }
  };

  const setWeekToCurrent = async () => {
    const ws = getCurrentWeekStartISO();
    const next = normalizeSchedule({
      ...schedule,
      weekStartISO: ws,
      days: Array.from({ length: 7 }, (_, i) => ({
        dateISO: addDaysISO(ws, i),
        sehriEnd: '',
        iftar: '',
      })),
    });
    setSchedule(next);
    setScheduleForm(next);
    await AsyncStorage.setItem(STORAGE_KEYS.scheduleCache, JSON.stringify(next));
    showSnack('Saved ✓');
  };

  const prayerRows = [
    { label: 'Fajr', value: '20 Min. nach Sehri' },
    { label: 'Sohar', value: `${schedule.globalTimes.sohar} Uhr` },
    { label: 'Assr', value: `${schedule.globalTimes.asr} Uhr` },
    { label: 'Maghrib', value: '10 Min. nach Iftar' },
    { label: 'Ishaa & Taravih', value: `${schedule.globalTimes.ishaTara} Uhr` },
    { label: 'Jumma', value: `${schedule.globalTimes.jumma} Uhr` },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>Tasbeeh Zähler</Text>
          <Pressable
            onPress={() => setSettingsOpen(true)}
            style={[styles.settingsBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={[styles.settingsTxt, { color: theme.text }]}>⚙️ Settings</Text>
          </Pressable>
        </View>

        <Text style={[styles.subtitle, { color: theme.muted }]}>Tippe auf den Zählerbereich, um zu erhöhen</Text>

        <Pressable onPress={incrementCount} onPressIn={animateIn} onPressOut={animateOut}>
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
            {!countReady ? <ActivityIndicator color={theme.text} /> : <Text style={[styles.counterText, { color: theme.text }]}>{count}</Text>}
          </Animated.View>
        </Pressable>

        <View style={styles.progressWrap}>
          <View style={[styles.progressTrack, { backgroundColor: theme.progressTrack }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.progressFill, width: `${progress}%` }]} />
          </View>
          <Text style={[styles.progressLabel, { color: theme.muted }]}>Ziel: {goal} • {progress.toFixed(0)}%</Text>
        </View>

        <View style={styles.buttonRow}>
          <Pressable onPress={() => setCount(0)} style={[styles.mainBtn, { backgroundColor: theme.accent }]}>
            <Text style={[styles.mainBtnTxt, { color: theme.accentText }]}>Reset</Text>
          </Pressable>
          <Pressable onPress={() => setPrayerOpen(true)} style={[styles.mainBtn, { backgroundColor: theme.accent }]}>
            <Text style={[styles.mainBtnTxt, { color: theme.accentText }]}>Gebetszeiten</Text>
          </Pressable>
        </View>

        <Text style={[styles.footer, { color: theme.muted }]}>Made by Tehmoor</Text>
      </ScrollView>

      <Modal visible={prayerOpen} animationType="slide" transparent onRequestClose={() => setPrayerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.paper, borderColor: theme.border }]}>
            <View style={styles.modalTopRow}>
              <Text style={[styles.arabicLine, { color: theme.muted }]}>بسم الله الرحمن الرحيم</Text>
              <Pressable onPress={() => setPrayerOpen(false)}><Text style={[styles.closeTxt, { color: theme.text }]}>Schließen</Text></Pressable>
            </View>

            <Text style={[styles.prayerTitle, { color: theme.text }]}>GEBETSZEITEN</Text>
            <Text style={[styles.prayerRange, { color: theme.muted }]}>{formatWeekRange(schedule.weekStartISO)}</Text>
            <Text style={[styles.prayerRange, { color: theme.muted }]}>{schedule.city}</Text>

            {!isCurrentWeek(schedule.weekStartISO) ? (
              <View style={styles.currentHint}>
                <Text style={[styles.hintText, { color: theme.danger }]}>Schedule week is not current</Text>
                <Pressable onPress={setWeekToCurrent} style={[styles.smallAction, { backgroundColor: theme.accent }]}>
                  <Text style={[styles.smallActionTxt, { color: theme.accentText }]}>Set week to current</Text>
                </Pressable>
              </View>
            ) : null}

            <Pressable onPress={refreshScheduleFromCloud} style={[styles.refreshBtn, { borderColor: theme.border }]}>
              <Text style={[styles.refreshTxt, { color: theme.text }]}>↻ Refresh Cloud</Text>
            </Pressable>

            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={styles.tableRow}>
                  <View style={[styles.leftHeaderCell, { borderColor: '#2D2119', backgroundColor: theme.rose }]}>
                    <Text style={styles.tableHeaderSmall}>Datum</Text>
                  </View>
                  {schedule.days.map((d) => {
                    const h = formatDayHeader(d.dateISO);
                    return (
                      <View key={`h_${d.dateISO}`} style={[styles.dayHeaderCell, { borderColor: '#2D2119', backgroundColor: theme.rose }]}>
                        <Text style={styles.tableHeaderDate}>{h.date}</Text>
                        <Text style={styles.tableHeaderSmall}>{h.day}</Text>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.tableRow}>
                  <View style={[styles.leftCell, { borderColor: '#2D2119', backgroundColor: theme.rose }]}>
                    <Text style={styles.rowLabel}>Tahajjud & Sehri-Ende</Text>
                  </View>
                  {schedule.days.map((d) => (
                    <View key={`s_${d.dateISO}`} style={[styles.dayCell, { borderColor: '#2D2119' }]}>
                      <Text style={styles.rowValue}>{d.sehriEnd || '--:--'}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.tableRow}>
                  <View style={[styles.leftCell, { borderColor: '#2D2119', backgroundColor: theme.rose }]}>
                    <Text style={styles.rowLabel}>Iftari</Text>
                  </View>
                  {schedule.days.map((d) => (
                    <View key={`i_${d.dateISO}`} style={[styles.dayCell, { borderColor: '#2D2119' }]}>
                      <Text style={styles.rowValue}>{d.iftar || '--:--'}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.lowerTable}>
              {prayerRows.map((r) => (
                <View key={r.label} style={styles.lowerRow}>
                  <View style={[styles.lowerLeft, { borderColor: '#2D2119', backgroundColor: theme.rose }]}>
                    <Text style={styles.lowerLeftTxt}>{r.label}</Text>
                  </View>
                  <View style={[styles.lowerRight, { borderColor: '#2D2119' }]}>
                    {r.label === 'Fajr' || r.label === 'Maghrib' ? (
                      <View>
                        <Text style={styles.lowerRightTxt}>{r.value}</Text>
                        <Text style={styles.computedMini}>
                          {r.label === 'Fajr'
                            ? derivedDays.map((d) => d.fajr).join(' | ')
                            : derivedDays.map((d) => d.maghrib).join(' | ')}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.lowerRightTxt}>{r.value}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {scheduleStatus === 'loading' ? <ActivityIndicator color={theme.text} /> : null}
          </View>
        </View>
      </Modal>

      <Modal visible={settingsOpen} animationType="slide" transparent onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.settingsSheet, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <View style={styles.modalTopRow}>
              <Text style={[styles.settingsHeader, { color: theme.text }]}>Settings</Text>
              <Pressable onPress={() => setSettingsOpen(false)}><Text style={[styles.closeTxt, { color: theme.text }]}>Schließen</Text></Pressable>
            </View>

            <ScrollView>
              <View style={[styles.settingsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.switchRow}>
                  <Text style={[styles.label, { color: theme.text }]}>Dark Mode</Text>
                  <Switch value={isDark} onValueChange={toggleDark} />
                </View>
              </View>

              <View style={[styles.settingsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.label, { color: theme.text }]}>Tasbeeh Goal</Text>
                <View style={styles.presetRow}>
                  {GOAL_PRESETS.map((g) => (
                    <Pressable key={g} onPress={() => setGoalInput(String(g))} style={[styles.presetBtn, { backgroundColor: theme.accent }]}>
                      <Text style={[styles.presetTxt, { color: theme.accentText }]}>{g}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  value={goalInput}
                  onChangeText={setGoalInput}
                  keyboardType="number-pad"
                  style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                  placeholder="1 bis 100000"
                  placeholderTextColor={theme.muted}
                />
                <Pressable onPress={saveGoal} style={[styles.saveBtn, { backgroundColor: theme.accent }]}>
                  <Text style={[styles.saveTxt, { color: theme.accentText }]}>Goal speichern</Text>
                </Pressable>
              </View>

              <View style={[styles.settingsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.label, { color: theme.text }]}>Admin Mode</Text>
                {!adminLoggedIn ? (
                  <>
                    <TextInput
                      value={pinInput}
                      onChangeText={setPinInput}
                      secureTextEntry
                      style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                      placeholder="PIN"
                      placeholderTextColor={theme.muted}
                    />
                    <Pressable onPress={loginAdmin} style={[styles.saveBtn, { backgroundColor: theme.accent }]}>
                      <Text style={[styles.saveTxt, { color: theme.accentText }]}>Login</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={[styles.note, { color: theme.muted }]}>Admin aktiv • Änderungen werden in Firestore gespeichert.</Text>

                    <Text style={[styles.subLabel, { color: theme.muted }]}>Week Start (YYYY-MM-DD)</Text>
                    <TextInput
                      value={scheduleForm.weekStartISO}
                      onChangeText={(v) => setScheduleForm((p) => ({ ...p, weekStartISO: v.trim() }))}
                      style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                    />
                    {inlineErrors.weekStartISO ? <Text style={[styles.err, { color: theme.danger }]}>{inlineErrors.weekStartISO}</Text> : null}

                    <Text style={[styles.subLabel, { color: theme.muted }]}>City</Text>
                    <TextInput
                      value={scheduleForm.city}
                      onChangeText={(v) => setScheduleForm((p) => ({ ...p, city: v }))}
                      style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                    />
                    {inlineErrors.city ? <Text style={[styles.err, { color: theme.danger }]}>{inlineErrors.city}</Text> : null}

                    {[
                      ['sohar', 'Sohar'],
                      ['asr', 'Assr'],
                      ['ishaTara', 'Ishaa & Taravih'],
                      ['jumma', 'Jumma'],
                    ].map(([key, label]) => (
                      <View key={key}>
                        <Text style={[styles.subLabel, { color: theme.muted }]}>{label} (HH:MM)</Text>
                        <TextInput
                          value={scheduleForm.globalTimes[key]}
                          onChangeText={(v) =>
                            setScheduleForm((p) => ({ ...p, globalTimes: { ...p.globalTimes, [key]: v.trim() } }))
                          }
                          style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                          maxLength={5}
                        />
                        {inlineErrors[`g_${key}`] ? <Text style={[styles.err, { color: theme.danger }]}>{inlineErrors[`g_${key}`]}</Text> : null}
                      </View>
                    ))}

                    {scheduleForm.days.map((d, i) => (
                      <View key={`${d.dateISO}_${i}`} style={[styles.dayEditWrap, { borderColor: theme.border }]}>
                        <Text style={[styles.dayEditTitle, { color: theme.text }]}>{formatDayHeader(addDaysISO(scheduleForm.weekStartISO, i)).date}</Text>
                        <TextInput
                          value={d.sehriEnd}
                          onChangeText={(v) =>
                            setScheduleForm((p) => ({
                              ...p,
                              days: p.days.map((x, idx) => (idx === i ? { ...x, sehriEnd: v.trim() } : x)),
                            }))
                          }
                          style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                          placeholder="Sehri-Ende HH:MM"
                          placeholderTextColor={theme.muted}
                          maxLength={5}
                        />
                        {inlineErrors[`d_${i}_sehri`] ? <Text style={[styles.err, { color: theme.danger }]}>{inlineErrors[`d_${i}_sehri`]}</Text> : null}

                        <TextInput
                          value={d.iftar}
                          onChangeText={(v) =>
                            setScheduleForm((p) => ({
                              ...p,
                              days: p.days.map((x, idx) => (idx === i ? { ...x, iftar: v.trim() } : x)),
                            }))
                          }
                          style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                          placeholder="Iftar HH:MM"
                          placeholderTextColor={theme.muted}
                          maxLength={5}
                        />
                        {inlineErrors[`d_${i}_iftar`] ? <Text style={[styles.err, { color: theme.danger }]}>{inlineErrors[`d_${i}_iftar`]}</Text> : null}
                      </View>
                    ))}

                    <Pressable onPress={saveScheduleToCloud} style={[styles.saveBtn, { backgroundColor: theme.accent }]}>
                      <Text style={[styles.saveTxt, { color: theme.accentText }]}>Schedule speichern (Cloud)</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {snackbar.visible ? (
        <View style={[styles.snack, { backgroundColor: snackbar.type === 'ok' ? '#166534' : '#991B1B' }]}>
          <Text style={styles.snackTxt}>{snackbar.text}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 30 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 30, fontWeight: '800' },
  subtitle: { fontSize: 14 },
  settingsBtn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  settingsTxt: { fontSize: 13, fontWeight: '700' },
  counter: { minHeight: 280, borderWidth: 1, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  counterText: { fontSize: 96, fontWeight: '800', lineHeight: 102 },
  progressWrap: { gap: 7 },
  progressTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%' },
  progressLabel: { textAlign: 'center', fontSize: 13, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 10 },
  mainBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  mainBtnTxt: { fontSize: 15, fontWeight: '700' },
  footer: { textAlign: 'center', marginTop: 4, fontSize: 12, fontWeight: '500' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,6,23,0.45)' },
  modalSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    maxHeight: '92%',
    padding: 12,
    gap: 8,
  },
  settingsSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    maxHeight: '95%',
    padding: 12,
  },
  modalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  closeTxt: { fontSize: 14, fontWeight: '700' },

  arabicLine: { fontSize: 12 },
  prayerTitle: { fontSize: 44, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5 },
  prayerRange: { textAlign: 'center', fontSize: 20, fontWeight: '700' },
  currentHint: { borderWidth: 1, borderColor: '#2D2119', borderRadius: 10, padding: 8, gap: 6 },
  hintText: { fontSize: 12, fontWeight: '700' },
  smallAction: { borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  smallActionTxt: { fontSize: 12, fontWeight: '700' },
  refreshBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  refreshTxt: { fontSize: 12, fontWeight: '700' },

  tableRow: { flexDirection: 'row' },
  leftHeaderCell: { width: 72, minHeight: 62, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 6 },
  dayHeaderCell: { width: 68, minHeight: 62, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  leftCell: { width: 72, minHeight: 58, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  dayCell: { width: 68, minHeight: 58, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tableHeaderDate: { fontSize: 20, fontWeight: '900', color: '#111' },
  tableHeaderSmall: { fontSize: 10, fontWeight: '700', color: '#111', textAlign: 'center' },
  rowLabel: { fontSize: 11, fontWeight: '700', color: '#111', textAlign: 'center' },
  rowValue: { fontSize: 30, fontWeight: '900', color: '#111' },

  lowerTable: { marginTop: 10, alignSelf: 'center' },
  lowerRow: { flexDirection: 'row' },
  lowerLeft: { width: 160, minHeight: 70, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  lowerRight: { width: 175, minHeight: 70, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  lowerLeftTxt: { fontSize: 34, fontWeight: '900', color: '#111' },
  lowerRightTxt: { fontSize: 30, fontWeight: '900', color: '#111', textAlign: 'center' },
  computedMini: { marginTop: 4, fontSize: 10, color: '#222', textAlign: 'center', fontWeight: '600' },

  settingsHeader: { fontSize: 24, fontWeight: '800' },
  settingsCard: { borderWidth: 1, borderRadius: 14, padding: 10, gap: 8, marginBottom: 10 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '700' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  presetTxt: { fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, fontSize: 14 },
  saveBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  saveTxt: { fontWeight: '700', fontSize: 14 },
  note: { fontSize: 12, fontWeight: '600' },
  subLabel: { fontSize: 12, fontWeight: '700' },
  err: { fontSize: 11, fontWeight: '700', marginTop: -4 },
  dayEditWrap: { borderWidth: 1, borderRadius: 10, padding: 8, gap: 6 },
  dayEditTitle: { fontSize: 13, fontWeight: '700' },

  snack: {
    position: 'absolute',
    bottom: 18,
    left: 16,
    right: 16,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  snackTxt: { color: '#fff', fontWeight: '700' },
});
