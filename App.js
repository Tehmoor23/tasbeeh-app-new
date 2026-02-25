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

const STORAGE_KEY = '@tasbeeh_count';
const STORAGE_KEYS = {
  goal: '@tasbeeh_goal',
  darkMode: '@tasbeeh_darkmode',
  schedule: '@tasbeeh_schedule',
  adminPin: '@tasbeeh_admin_pin',
};

const DEFAULT_ADMIN_PIN = '7860';
const DEFAULT_GOAL = 100;
const GOAL_PRESETS = [33, 99, 100, 1000];

const DAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

const THEME = {
  light: {
    bg: '#F1F5F9',
    card: 'rgba(255,255,255,0.78)',
    cardBorder: 'rgba(148,163,184,0.35)',
    text: '#0F172A',
    muted: '#64748B',
    accent: '#0F172A',
    accentText: '#FFFFFF',
    inputBg: '#F8FAFC',
    inputBorder: '#CBD5E1',
    danger: '#B91C1C',
    progressTrack: '#E2E8F0',
    progressFill: '#334155',
  },
  dark: {
    bg: '#020617',
    card: 'rgba(15,23,42,0.78)',
    cardBorder: 'rgba(148,163,184,0.35)',
    text: '#E2E8F0',
    muted: '#94A3B8',
    accent: '#F8FAFC',
    accentText: '#0F172A',
    inputBg: '#0F172A',
    inputBorder: '#334155',
    danger: '#FCA5A5',
    progressTrack: '#1E293B',
    progressFill: '#60A5FA',
  },
};

const pad = (n) => String(n).padStart(2, '0');

const toISO = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

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

const formatDay = (iso) => {
  const d = parseISO(iso);
  if (!d) return iso;
  return `${DAYS_DE[d.getDay()]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

const formatWeekRange = (startISO) => {
  const start = parseISO(startISO);
  if (!start) return '--.-- – --.--';
  const endISO = addDaysISO(startISO, 6);
  const end = parseISO(endISO);
  return `${pad(start.getDate())}.${pad(start.getMonth() + 1)} – ${pad(end.getDate())}.${pad(end.getMonth() + 1)}`;
};

const isValidTime = (value) => {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
};

const addMinutesToTime = (time, mins) => {
  if (!isValidTime(time)) return '--:--';
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const wrapped = ((total % 1440) + 1440) % 1440;
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
};

const getCurrentWeekStartISO = () => {
  const d = new Date();
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return toISO(d);
};

const createSchedule = (weekStartISO = '2026-02-19') => ({
  weekStartISO,
  city: 'Frankfurt am Main',
  globalTimes: {
    dhuhr: '13:30',
    asr: '16:00',
    ishaTaraweeh: '20:00',
    jumma: '13:15',
  },
  days: Array.from({ length: 7 }, (_, idx) => ({
    dateISO: addDaysISO(weekStartISO, idx),
    sehriEndTahajjud: '',
    iftar: '',
  })),
});

const normalizeSchedule = (raw) => {
  const fallback = createSchedule();
  if (!raw || typeof raw !== 'object') return fallback;

  const weekStartISO = parseISO(raw.weekStartISO) ? raw.weekStartISO : fallback.weekStartISO;
  const city = typeof raw.city === 'string' && raw.city.trim() ? raw.city.trim() : fallback.city;

  const globalTimes = {
    dhuhr: typeof raw.globalTimes?.dhuhr === 'string' ? raw.globalTimes.dhuhr : fallback.globalTimes.dhuhr,
    asr: typeof raw.globalTimes?.asr === 'string' ? raw.globalTimes.asr : fallback.globalTimes.asr,
    ishaTaraweeh:
      typeof raw.globalTimes?.ishaTaraweeh === 'string' ? raw.globalTimes.ishaTaraweeh : fallback.globalTimes.ishaTaraweeh,
    jumma: typeof raw.globalTimes?.jumma === 'string' ? raw.globalTimes.jumma : fallback.globalTimes.jumma,
  };

  const days = Array.from({ length: 7 }, (_, idx) => {
    const day = Array.isArray(raw.days) ? raw.days[idx] : null;
    return {
      dateISO: parseISO(day?.dateISO) ? day.dateISO : addDaysISO(weekStartISO, idx),
      sehriEndTahajjud: typeof day?.sehriEndTahajjud === 'string' ? day.sehriEndTahajjud : '',
      iftar: typeof day?.iftar === 'string' ? day.iftar : '',
    };
  });

  return { weekStartISO, city, globalTimes, days };
};

const isCurrentWeek = (startISO) => {
  const start = parseISO(startISO);
  if (!start) return false;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return today >= start && today <= end;
};

export default function App() {
  const systemScheme = useColorScheme();
  const [count, setCount] = useState(0);
  const [isLoadingCount, setIsLoadingCount] = useState(true);

  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [goalInput, setGoalInput] = useState(String(DEFAULT_GOAL));

  const [isDarkMode, setIsDarkMode] = useState(systemScheme === 'dark');

  const [schedule, setSchedule] = useState(createSchedule);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminPin, setAdminPin] = useState(DEFAULT_ADMIN_PIN);
  const [pinInput, setPinInput] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const [weekStartInput, setWeekStartInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [globalInputs, setGlobalInputs] = useState({ dhuhr: '', asr: '', ishaTaraweeh: '', jumma: '' });
  const [dayInputs, setDayInputs] = useState([]);
  const [errors, setErrors] = useState({});

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const theme = isDarkMode ? THEME.dark : THEME.light;
  const progress = useMemo(() => Math.min((count / goal) * 100, 100), [count, goal]);
  const weekCurrent = useMemo(() => isCurrentWeek(schedule.weekStartISO), [schedule.weekStartISO]);

  useEffect(() => {
    const loadCounter = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          const n = Number.parseInt(stored, 10);
          if (!Number.isNaN(n)) setCount(n);
        }
      } catch (e) {
        console.warn('Failed to load count:', e);
      } finally {
        setIsLoadingCount(false);
      }
    };
    loadCounter();
  }, []);

  useEffect(() => {
    if (isLoadingCount) return;
    AsyncStorage.setItem(STORAGE_KEY, String(count)).catch((e) => console.warn('Failed to save count:', e));
  }, [count, isLoadingCount]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [storedDark, storedGoal, storedSchedule, storedPin] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.darkMode),
          AsyncStorage.getItem(STORAGE_KEYS.goal),
          AsyncStorage.getItem(STORAGE_KEYS.schedule),
          AsyncStorage.getItem(STORAGE_KEYS.adminPin),
        ]);

        if (storedDark === '1' || storedDark === '0') setIsDarkMode(storedDark === '1');

        if (storedGoal) {
          const n = Number.parseInt(storedGoal, 10);
          if (!Number.isNaN(n) && n >= 1 && n <= 100000) {
            setGoal(n);
            setGoalInput(String(n));
          }
        }

        const normalized = storedSchedule ? normalizeSchedule(JSON.parse(storedSchedule)) : createSchedule();
        setSchedule(normalized);
        setWeekStartInput(normalized.weekStartISO);
        setCityInput(normalized.city);
        setGlobalInputs(normalized.globalTimes);
        setDayInputs(normalized.days.map((d) => ({ ...d })));

        if (storedPin && typeof storedPin === 'string') setAdminPin(storedPin);
      } catch (e) {
        console.warn('Failed to load app settings:', e);
        const fallback = createSchedule();
        setSchedule(fallback);
        setWeekStartInput(fallback.weekStartISO);
        setCityInput(fallback.city);
        setGlobalInputs(fallback.globalTimes);
        setDayInputs(fallback.days.map((d) => ({ ...d })));
      } finally {
        setScheduleLoaded(true);
      }
    };

    loadSettings();
  }, []);

  const animatePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.975,
      useNativeDriver: true,
      speed: 18,
      bounciness: 5,
    }).start();
  };

  const animatePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 5,
    }).start();
  };

  const increment = () => {
    setCount((prev) => prev + 1);
    if (typeof Vibration?.vibrate === 'function') Vibration.vibrate(8);
  };

  const toggleDarkMode = async (nextValue) => {
    setIsDarkMode(nextValue);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.darkMode, nextValue ? '1' : '0');
    } catch (e) {
      console.warn('Failed to save dark mode:', e);
    }
  };

  const selectGoalPreset = (value) => {
    setGoalInput(String(value));
  };

  const saveGoal = async () => {
    const parsed = Number.parseInt(goalInput.trim(), 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 100000) {
      Alert.alert('Ungültiges Ziel', 'Bitte eine Zahl zwischen 1 und 100000 eingeben.');
      return;
    }
    setGoal(parsed);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.goal, String(parsed));
    } catch (e) {
      console.warn('Failed to save goal:', e);
    }
  };

  const loginAdmin = () => {
    if (pinInput.trim() === adminPin) {
      setIsAdmin(true);
      setPinInput('');
      return;
    }
    Alert.alert('Fehler', 'PIN ist nicht korrekt.');
  };

  const persistSchedule = async (next) => {
    const normalized = normalizeSchedule(next);
    setSchedule(normalized);
    setWeekStartInput(normalized.weekStartISO);
    setCityInput(normalized.city);
    setGlobalInputs(normalized.globalTimes);
    setDayInputs(normalized.days.map((d) => ({ ...d })));
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.schedule, JSON.stringify(normalized));
    } catch (e) {
      console.warn('Failed to save schedule:', e);
    }
  };

  const setWeekToCurrent = async () => {
    const currentStart = getCurrentWeekStartISO();
    await persistSchedule({
      ...schedule,
      weekStartISO: currentStart,
      days: Array.from({ length: 7 }, (_, idx) => ({
        dateISO: addDaysISO(currentStart, idx),
        sehriEndTahajjud: '',
        iftar: '',
      })),
    });
  };

  const updateDayInput = (idx, field, value) => {
    setDayInputs((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value.trim() } : d)));
    setErrors((prev) => ({ ...prev, [`${idx}_${field}`]: undefined }));
  };

  const validateAndSaveSchedule = async () => {
    if (!isAdmin) return;

    const nextErrors = {};
    if (!parseISO(weekStartInput.trim())) nextErrors.weekStart = 'Format YYYY-MM-DD erforderlich';
    if (!cityInput.trim()) nextErrors.city = 'Stadt darf nicht leer sein';

    ['dhuhr', 'asr', 'ishaTaraweeh', 'jumma'].forEach((k) => {
      if (!isValidTime(globalInputs[k])) nextErrors[`global_${k}`] = 'HH:MM erforderlich';
    });

    dayInputs.forEach((d, idx) => {
      if (!isValidTime(d.sehriEndTahajjud)) nextErrors[`${idx}_sehriEndTahajjud`] = 'HH:MM erforderlich';
      if (!isValidTime(d.iftar)) nextErrors[`${idx}_iftar`] = 'HH:MM erforderlich';
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      Alert.alert('Ungültige Eingaben', 'Bitte alle Felder korrekt im Format HH:MM ausfüllen.');
      return;
    }

    const ws = weekStartInput.trim();
    const next = {
      weekStartISO: ws,
      city: cityInput.trim(),
      globalTimes: { ...globalInputs },
      days: dayInputs.map((d, idx) => ({
        dateISO: addDaysISO(ws, idx),
        sehriEndTahajjud: d.sehriEndTahajjud,
        iftar: d.iftar,
      })),
    };

    await persistSchedule(next);
    Alert.alert('Gespeichert', 'Prayer Times wurden aktualisiert.');
  };

  const derivedDays = useMemo(
    () =>
      schedule.days.map((d) => ({
        ...d,
        fajr: addMinutesToTime(d.sehriEndTahajjud, 20),
        maghrib: addMinutesToTime(d.iftar, 10),
      })),
    [schedule.days],
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>Tasbeeh Zähler</Text>
          <Pressable
            onPress={() => setSettingsOpen(true)}
            style={({ pressed }) => [
              styles.settingsButton,
              { backgroundColor: theme.card, borderColor: theme.cardBorder, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <Text style={[styles.settingsIcon, { color: theme.text }]}>⚙️</Text>
            <Text style={[styles.settingsText, { color: theme.text }]}>Settings</Text>
          </Pressable>
        </View>

        <Text style={[styles.subtitle, { color: theme.muted }]}>Tippe auf den Zählerbereich, um zu erhöhen</Text>

        <Pressable onPress={increment} onPressIn={animatePressIn} onPressOut={animatePressOut}>
          {({ pressed }) => (
            <Animated.View
              style={[
                styles.counterArea,
                {
                  backgroundColor: pressed ? theme.inputBg : theme.card,
                  borderColor: theme.cardBorder,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {isLoadingCount ? (
                <ActivityIndicator size="large" color={theme.text} />
              ) : (
                <Text style={[styles.countText, { color: theme.text }]}>{count}</Text>
              )}
            </Animated.View>
          )}
        </Pressable>

        <View style={styles.progressWrap}>
          <View style={[styles.progressTrack, { backgroundColor: theme.progressTrack }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.progressFill, width: `${progress}%` }]} />
          </View>
          <Text style={[styles.progressText, { color: theme.muted }]}>Ziel: {goal} • {progress.toFixed(0)}%</Text>
        </View>

        <Pressable
          onPress={() => setCount(0)}
          style={({ pressed }) => [
            styles.resetButton,
            { backgroundColor: pressed ? theme.muted : theme.accent, borderColor: theme.cardBorder },
          ]}
        >
          <Text style={[styles.resetText, { color: theme.accentText }]}>Reset</Text>
        </Pressable>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.prayerHeaderRow}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Prayer Times</Text>
            <Text style={[styles.arabic, { color: theme.muted }]}>مواقيت الصلاة</Text>
          </View>
          <Text style={[styles.meta, { color: theme.muted }]}>Week: {formatWeekRange(schedule.weekStartISO)}</Text>
          <Text style={[styles.meta, { color: theme.muted }]}>City: {schedule.city}</Text>

          {!weekCurrent ? (
            <View style={[styles.warningBox, { borderColor: theme.inputBorder }]}>
              <Text style={[styles.warningText, { color: theme.danger }]}>Schedule week is not current.</Text>
              <Pressable
                onPress={setWeekToCurrent}
                style={({ pressed }) => [styles.smallBtn, { backgroundColor: pressed ? theme.muted : theme.accent }]}
              >
                <Text style={[styles.smallBtnText, { color: theme.accentText }]}>Set week to current</Text>
              </Pressable>
            </View>
          ) : null}

          {derivedDays.map((d) => {
            const date = parseISO(d.dateISO);
            const isFriday = date?.getDay() === 5;
            return (
              <View key={d.dateISO} style={[styles.dayCard, { borderColor: theme.inputBorder }]}>
                <Text style={[styles.dayTitle, { color: theme.text }]}>{formatDay(d.dateISO)}</Text>

                <View style={styles.row}><Text style={[styles.k, { color: theme.muted }]}>Sehri/Tahajjud</Text><Text style={[styles.v, { color: theme.text }]}>{d.sehriEndTahajjud || '--:--'}</Text></View>
                <View style={styles.row}><Text style={[styles.k, { color: theme.muted }]}>Iftar</Text><Text style={[styles.v, { color: theme.text }]}>{d.iftar || '--:--'}</Text></View>
                <View style={styles.row}><Text style={[styles.k, { color: theme.muted }]}>Fajr (auto)</Text><Text style={[styles.v, { color: theme.text }]}>{d.fajr}</Text></View>
                <View style={styles.row}><Text style={[styles.k, { color: theme.muted }]}>Dhuhr</Text><Text style={[styles.v, { color: theme.text }]}>{schedule.globalTimes.dhuhr}</Text></View>
                <View style={styles.row}><Text style={[styles.k, { color: theme.muted }]}>Asr</Text><Text style={[styles.v, { color: theme.text }]}>{schedule.globalTimes.asr}</Text></View>
                <View style={styles.row}><Text style={[styles.k, { color: theme.muted }]}>Maghrib (auto)</Text><Text style={[styles.v, { color: theme.text }]}>{d.maghrib}</Text></View>
                <View style={styles.row}><Text style={[styles.k, { color: theme.muted }]}>Isha/Taraweeh</Text><Text style={[styles.v, { color: theme.text }]}>{schedule.globalTimes.ishaTaraweeh}</Text></View>
                <View style={styles.row}><Text style={[styles.k, { color: isFriday ? theme.danger : theme.muted }]}>Jumma</Text><Text style={[styles.v, { color: theme.text }]}>{schedule.globalTimes.jumma}</Text></View>
              </View>
            );
          })}

          {!scheduleLoaded ? <ActivityIndicator size="small" color={theme.muted} /> : null}
        </View>

        <Text style={[styles.footer, { color: theme.muted }]}>Made by Tehmoor</Text>
      </ScrollView>

      <Modal animationType="slide" transparent visible={settingsOpen} onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: theme.bg, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Settings</Text>
              <Pressable onPress={() => setSettingsOpen(false)}>
                <Text style={[styles.closeText, { color: theme.text }]}>Schließen</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={styles.switchRow}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Dark Mode</Text>
                  <Switch value={isDarkMode} onValueChange={toggleDarkMode} />
                </View>
              </View>

              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Tasbeeh Goal</Text>
                <View style={styles.presetsRow}>
                  {GOAL_PRESETS.map((preset) => (
                    <Pressable
                      key={preset}
                      onPress={() => selectGoalPreset(preset)}
                      style={({ pressed }) => [styles.presetBtn, { backgroundColor: pressed ? theme.muted : theme.accent }]}
                    >
                      <Text style={[styles.presetText, { color: theme.accentText }]}>{preset}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  value={goalInput}
                  onChangeText={setGoalInput}
                  keyboardType="number-pad"
                  style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="1 bis 100000"
                  placeholderTextColor={theme.muted}
                />
                <Pressable
                  onPress={saveGoal}
                  style={({ pressed }) => [styles.saveBtn, { backgroundColor: pressed ? theme.muted : theme.accent }]}
                >
                  <Text style={[styles.saveBtnText, { color: theme.accentText }]}>Goal speichern</Text>
                </Pressable>
              </View>

              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Admin Mode</Text>
                {!isAdmin ? (
                  <>
                    <TextInput
                      value={pinInput}
                      onChangeText={setPinInput}
                      secureTextEntry
                      style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                      placeholder="PIN"
                      placeholderTextColor={theme.muted}
                    />
                    <Pressable
                      onPress={loginAdmin}
                      style={({ pressed }) => [styles.saveBtn, { backgroundColor: pressed ? theme.muted : theme.accent }]}
                    >
                      <Text style={[styles.saveBtnText, { color: theme.accentText }]}>Login</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={[styles.meta, { color: theme.muted }]}>Admin aktiv</Text>
                    <Text style={[styles.label, { color: theme.muted }]}>Week Start (YYYY-MM-DD)</Text>
                    <TextInput
                      value={weekStartInput}
                      onChangeText={setWeekStartInput}
                      autoCapitalize="none"
                      style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                    />
                    {errors.weekStart ? <Text style={[styles.error, { color: theme.danger }]}>{errors.weekStart}</Text> : null}

                    <Text style={[styles.label, { color: theme.muted }]}>City</Text>
                    <TextInput
                      value={cityInput}
                      onChangeText={setCityInput}
                      style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                    />
                    {errors.city ? <Text style={[styles.error, { color: theme.danger }]}>{errors.city}</Text> : null}

                    <Text style={[styles.cardTitle, { color: theme.text, marginTop: 6 }]}>Globale Wochenzeiten</Text>
                    {[
                      ['dhuhr', 'Dhuhr (Sohar)'],
                      ['asr', 'Asr'],
                      ['ishaTaraweeh', 'Isha/Taraweeh'],
                      ['jumma', 'Jumma'],
                    ].map(([key, label]) => (
                      <View key={key} style={styles.fieldBlock}>
                        <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
                        <TextInput
                          value={globalInputs[key]}
                          onChangeText={(v) => {
                            setGlobalInputs((prev) => ({ ...prev, [key]: v.trim() }));
                            setErrors((prev) => ({ ...prev, [`global_${key}`]: undefined }));
                          }}
                          style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                          placeholder="HH:MM"
                          placeholderTextColor={theme.muted}
                          maxLength={5}
                        />
                        {errors[`global_${key}`] ? (
                          <Text style={[styles.error, { color: theme.danger }]}>{errors[`global_${key}`]}</Text>
                        ) : null}
                      </View>
                    ))}

                    <Text style={[styles.cardTitle, { color: theme.text, marginTop: 6 }]}>Tageswerte (Ramadan)</Text>
                    {dayInputs.map((d, idx) => (
                      <View key={d.dateISO || String(idx)} style={[styles.dayEditCard, { borderColor: theme.inputBorder }]}>
                        <Text style={[styles.dayTitle, { color: theme.text }]}>{formatDay(addDaysISO(weekStartInput || schedule.weekStartISO, idx))}</Text>

                        <Text style={[styles.label, { color: theme.muted }]}>Sehri-Ende/Tahajjud</Text>
                        <TextInput
                          value={d.sehriEndTahajjud}
                          onChangeText={(v) => updateDayInput(idx, 'sehriEndTahajjud', v)}
                          style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                          placeholder="HH:MM"
                          placeholderTextColor={theme.muted}
                          maxLength={5}
                        />
                        {errors[`${idx}_sehriEndTahajjud`] ? (
                          <Text style={[styles.error, { color: theme.danger }]}>{errors[`${idx}_sehriEndTahajjud`]}</Text>
                        ) : null}

                        <Text style={[styles.label, { color: theme.muted }]}>Iftar</Text>
                        <TextInput
                          value={d.iftar}
                          onChangeText={(v) => updateDayInput(idx, 'iftar', v)}
                          style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                          placeholder="HH:MM"
                          placeholderTextColor={theme.muted}
                          maxLength={5}
                        />
                        {errors[`${idx}_iftar`] ? (
                          <Text style={[styles.error, { color: theme.danger }]}>{errors[`${idx}_iftar`]}</Text>
                        ) : null}
                      </View>
                    ))}

                    <Pressable
                      onPress={validateAndSaveSchedule}
                      style={({ pressed }) => [styles.saveBtn, { backgroundColor: pressed ? theme.muted : theme.accent }]}
                    >
                      <Text style={[styles.saveBtnText, { color: theme.accentText }]}>Schedule speichern</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setIsAdmin(false)}
                      style={({ pressed }) => [styles.saveBtn, { backgroundColor: pressed ? theme.muted : theme.accent, marginTop: 8 }]}
                    >
                      <Text style={[styles.saveBtnText, { color: theme.accentText }]}>Logout</Text>
                    </Pressable>
                  </>
                )}
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
  scroll: { padding: 16, paddingBottom: 28, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 30, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: -2 },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  settingsIcon: { fontSize: 15 },
  settingsText: { fontSize: 13, fontWeight: '700' },
  counterArea: {
    borderWidth: 1,
    borderRadius: 28,
    minHeight: 280,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  countText: { fontSize: 96, fontWeight: '800', lineHeight: 104 },
  progressWrap: { gap: 8 },
  progressTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  progressText: { textAlign: 'center', fontSize: 13, fontWeight: '600' },
  resetButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  resetText: { fontSize: 17, fontWeight: '700' },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  prayerHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  arabic: { fontSize: 14, writingDirection: 'rtl' },
  meta: { fontSize: 13, fontWeight: '500' },
  warningBox: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 8 },
  warningText: { fontSize: 12, fontWeight: '700' },
  smallBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  smallBtnText: { fontSize: 12, fontWeight: '700' },
  dayCard: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 4 },
  dayTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  k: { fontSize: 12, fontWeight: '600' },
  v: { fontSize: 12, fontWeight: '700' },
  footer: { textAlign: 'center', marginTop: 2, fontSize: 12, fontWeight: '500' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(2,6,23,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  closeText: { fontSize: 14, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  presetText: { fontSize: 13, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  saveBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '600' },
  error: { fontSize: 11, fontWeight: '700', marginTop: -2 },
  fieldBlock: { gap: 5 },
  dayEditCard: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 5 },
});
