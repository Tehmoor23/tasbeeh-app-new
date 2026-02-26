import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
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
const FIXED_TIMES = {
  sohar: '13:30',
  assr: '16:00',
  ishaaTaravih: '20:00',
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
  light: {
    bg: '#F4F4F5',
    card: '#FFFFFF',
    border: '#E4E4E7',
    text: '#09090B',
    muted: '#71717A',
    button: '#111827',
    buttonText: '#FFFFFF',
    progressTrack: '#E4E4E7',
    progressFill: '#111827',
    rowActiveBg: '#ECFDF3',
    rowActiveBorder: '#86EFAC',
    chipBg: '#ECFDF3',
    chipText: '#166534',
  },
  dark: {
    bg: '#09090B',
    card: '#111827',
    border: '#374151',
    text: '#F9FAFB',
    muted: '#9CA3AF',
    button: '#F9FAFB',
    buttonText: '#111827',
    progressTrack: '#1F2937',
    progressFill: '#93C5FD',
    rowActiveBg: '#052E1B',
    rowActiveBorder: '#22C55E',
    chipBg: '#14532D',
    chipText: '#BBF7D0',
  },
};

const pad = (n) => String(n).padStart(2, '0');
const toISO = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseISO = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};
const isValidTime = (value) => {
  if (!/^\d{2}:\d{2}$/.test(value || '')) return false;
  const [h, m] = value.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
};

const addMinutes = (time, minutes) => {
  if (!isValidTime(time)) return '—';
  const [h, m] = time.split(':').map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

const englishDateLong = (date) => {
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
  } catch {
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
  }
};

const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const findClosestISO = (targetISO, availableISOs) => {
  const target = parseISO(targetISO);
  if (!target || availableISOs.length === 0) return null;
  const sorted = [...availableISOs].sort();
  if (targetISO <= sorted[0]) return sorted[0];
  if (targetISO >= sorted[sorted.length - 1]) return sorted[sorted.length - 1];
  return sorted.reduce((closest, iso) => {
    const d = parseISO(iso);
    const prev = parseISO(closest);
    if (!d || !prev) return closest;
    const diff = Math.abs(d.getTime() - target.getTime());
    const prevDiff = Math.abs(prev.getTime() - target.getTime());
    return diff < prevDiff ? iso : closest;
  }, sorted[0]);
};

export default function App() {
  const systemScheme = useColorScheme();
  const [screen, setScreen] = useState('tasbeeh');

  const [count, setCount] = useState(0);
  const [countLoaded, setCountLoaded] = useState(false);

  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [goalInput, setGoalInput] = useState(String(DEFAULT_GOAL));

  const [isDarkMode, setIsDarkMode] = useState(false); // default light mode
  const [settingsOpen, setSettingsOpen] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const theme = isDarkMode ? THEME.dark : THEME.light;

  const now = new Date();
  const todayISO = toISO(now);
  const availableDates = useMemo(() => Object.keys(RAMADAN_RAW).sort(), []);

  const selectedISO = useMemo(() => {
    if (RAMADAN_RAW[todayISO]) return todayISO;
    return findClosestISO(todayISO, availableDates);
  }, [todayISO, availableDates]);

  const selectedDate = selectedISO ? parseISO(selectedISO) : now;
  const selectedRaw = selectedISO ? RAMADAN_RAW[selectedISO] : null;

  const hasTodayData = Boolean(RAMADAN_RAW[todayISO]);

  const fajrTime = addMinutes(selectedRaw?.sehriEnd, 20);
  const maghribTime = addMinutes(selectedRaw?.iftar, 10);

  const prayerRows = useMemo(
    () => [
      { key: 'fajr', label: 'Fajr (الفجر)', time: fajrTime, activeCheck: true },
      { key: 'sohar', label: 'Sohar (الظهر)', time: FIXED_TIMES.sohar, activeCheck: true },
      { key: 'assr', label: 'Asr (العصر)', time: FIXED_TIMES.assr, activeCheck: true },
      { key: 'maghrib', label: 'Maghrib (المغرب)', time: maghribTime, activeCheck: true },
      { key: 'ishaa', label: 'Ishaa & Taravih (العشاء / التراويح)', time: FIXED_TIMES.ishaaTaravih, activeCheck: true },
      { key: 'jumma', label: 'Jumma (الجمعة)', time: FIXED_TIMES.jumma, activeCheck: false },
    ],
    [fajrTime, maghribTime],
  );

  const activePrayerKey = useMemo(() => {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let current = null;
    prayerRows
      .filter((r) => r.activeCheck)
      .forEach((row) => {
        if (isValidTime(row.time)) {
          const [h, m] = row.time.split(':').map(Number);
          const mins = h * 60 + m;
          if (mins <= nowMinutes) current = row.key;
        }
      });
    return current;
  }, [prayerRows, now]);

  const progress = useMemo(() => Math.min((count / goal) * 100, 100), [count, goal]);

  useEffect(() => {
    const loadLocal = async () => {
      try {
        const [countRaw, goalRaw, darkRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.count),
          AsyncStorage.getItem(STORAGE_KEYS.goal),
          AsyncStorage.getItem(STORAGE_KEYS.darkMode),
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

        if (darkRaw === '1' || darkRaw === '0') {
          setIsDarkMode(darkRaw === '1');
        } else {
          setIsDarkMode(false);
        }
      } catch (e) {
        console.warn('Failed to load local settings:', e);
      } finally {
        setCountLoaded(true);
      }
    };

    loadLocal();
  }, [systemScheme]);

  useEffect(() => {
    if (!countLoaded) return;
    AsyncStorage.setItem(STORAGE_KEYS.count, String(count)).catch(() => {});
  }, [count, countLoaded]);

  const onPressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true, speed: 18, bounciness: 5 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 5 }).start();
  };

  const incrementCount = () => {
    setCount((prev) => prev + 1);
    Vibration.vibrate(8);
  };

  const saveGoal = async () => {
    const n = Number.parseInt(goalInput.trim(), 10);
    if (Number.isNaN(n) || n < 1 || n > 100000) return;
    setGoal(n);
    await AsyncStorage.setItem(STORAGE_KEYS.goal, String(n));
  };

  const onToggleDarkMode = async (value) => {
    setIsDarkMode(value);
    await AsyncStorage.setItem(STORAGE_KEYS.darkMode, value ? '1' : '0');
  };

  if (screen === 'prayer') {
    const displayDate = selectedDate || now;
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.dayCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.dayName, { color: theme.text }]}>{DAY_NAMES_EN[displayDate.getDay()]}</Text>
            <Text style={[styles.dayDate, { color: theme.muted }]}>{englishDateLong(displayDate)}</Text>

            <View style={[styles.cityBadge, { backgroundColor: theme.chipBg }]}>
              <Text style={[styles.cityBadgeText, { color: theme.chipText }]}>{CITY}</Text>
            </View>

            {!hasTodayData ? (
              <Text style={[styles.syncStatus, { color: theme.muted }]}>Keine Daten für dieses Datum vorhanden.</Text>
            ) : null}

            {prayerRows.map((row) => {
              const isActive = row.key === activePrayerKey;
              return (
                <View
                  key={row.key}
                  style={[
                    styles.prayerRow,
                    { borderBottomColor: theme.border },
                    isActive && {
                      backgroundColor: theme.rowActiveBg,
                      borderColor: theme.rowActiveBorder,
                      borderWidth: 1,
                      borderRadius: 10,
                    },
                  ]}
                >
                  <Text style={[styles.prayerLabel, { color: theme.text }]}>{row.label}</Text>
                  <Text style={[styles.prayerValue, { color: theme.text }]}>{row.time || '—'}</Text>
                </View>
              );
            })}

            <Text style={[styles.noteText, { color: theme.muted }]}>Sehri-Ende: {selectedRaw?.sehriEnd || '—'}</Text>
            <Text style={[styles.noteText, { color: theme.muted }]}>Iftar: {selectedRaw?.iftar || '—'}</Text>
          </View>

          <Pressable onPress={() => setScreen('tasbeeh')} style={[styles.resetBtn, { backgroundColor: theme.button }]}>
            <Text style={[styles.resetText, { color: theme.buttonText }]}>Zurück</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={[styles.title, { color: theme.text }]}>Tasbeeh</Text>
          </View>
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

        <View style={styles.mainFlex}>
          <Pressable style={styles.counterPressable} onPress={incrementCount} onPressIn={onPressIn} onPressOut={onPressOut}>
            <Animated.View
            style={[
              styles.counter,
              { backgroundColor: theme.card, borderColor: theme.border, transform: [{ scale: scaleAnim }] },
            ]}
          >
            {!countLoaded ? <ActivityIndicator size="large" color={theme.text} /> : <Text style={[styles.counterText, { color: theme.text }]}>{count}</Text>}
            </Animated.View>
          </Pressable>

          <View style={styles.bottomSticky}>
            <View style={styles.progressWrap}>
          <View style={[styles.progressTrack, { backgroundColor: theme.progressTrack }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.progressFill, width: `${progress}%` }]} />
          </View>
              <Text style={[styles.progressText, { color: theme.muted }]}>Ziel: {goal} • {progress.toFixed(0)}%</Text>
            </View>

            <Pressable style={[styles.resetBtn, { backgroundColor: theme.button }]} onPress={() => setCount(0)}>
          <Text style={[styles.resetText, { color: theme.buttonText }]}>Reset</Text>
        </Pressable>

            <Pressable style={[styles.resetBtn, { backgroundColor: theme.button }]} onPress={() => setScreen('prayer')}>
              <Text style={[styles.resetText, { color: theme.buttonText }]}>Gebetszeiten</Text>
            </Pressable>

            <Text style={[styles.footer, { color: theme.muted }]}>Made by Tehmoor</Text>
          </View>
        </View>
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
                  <Switch value={isDarkMode} onValueChange={onToggleDarkMode} />
                </View>
              </View>

              <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Tasbeeh Goal</Text>
                <View style={styles.presetRow}>
                  {GOAL_PRESETS.map((preset) => (
                    <Pressable key={preset} style={[styles.presetBtn, { backgroundColor: theme.button }]} onPress={() => setGoalInput(String(preset))}>
                      <Text style={[styles.presetBtnText, { color: theme.buttonText }]}>{preset}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.noteText, { color: theme.muted }]}>Aktuelles Ziel: {goalInput}</Text>

                <Pressable style={[styles.saveBtn, { backgroundColor: theme.button }]} onPress={saveGoal}>
                  <Text style={[styles.saveBtnText, { color: theme.buttonText }]}>Goal speichern</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flexGrow: 1, padding: 16, gap: 10, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  titleWrap: { flex: 1, alignItems: 'center' },
  title: { fontSize: 36, fontWeight: '700', textAlign: 'center', letterSpacing: 0.5, fontFamily: 'serif' },
  settingsBtn: { position: 'absolute', right: 0, borderRadius: 12, borderWidth: 1, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  settingsBtnText: { fontSize: 20 },
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

  bottomSticky: { gap: 10 },
  footer: { textAlign: 'center', fontSize: 12, fontWeight: '500', marginTop: 2 },

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

  saveBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700' },
  noteText: { fontSize: 12, fontWeight: '600' },
});
