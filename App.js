import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  I18nManager,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  Vibration,
  View,
} from 'react-native';

const STORAGE_KEY = 'tasbeeh_count';
const APP_STORAGE_KEYS = {
  theme: 'tasbeeh_theme',
  schedule: 'tasbeeh_schedule_v1',
  adminPin: 'tasbeeh_admin_pin_v1',
};

const DEFAULT_GOAL = 99;
const DEFAULT_ADMIN_PIN = '7860';
const PRAYER_FIELDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const RAMADAN_FIELDS = ['tahajjud', 'suhoorEnd', 'iftar'];

const THEMES = {
  light: {
    background: '#F1F5F9',
    title: '#0F172A',
    subtitle: '#64748B',
    glass: 'rgba(255,255,255,0.72)',
    glassPressed: 'rgba(255,255,255,0.88)',
    glassBorder: 'rgba(148,163,184,0.34)',
    count: '#0F172A',
    resetBg: '#111827',
    resetPressed: '#1F2937',
    resetText: '#FFFFFF',
    toggleBg: '#E2E8F0',
    toggleText: '#0F172A',
    progressTrack: '#DCE4EE',
    progressFill: '#334155',
    footer: '#94A3B8',
    inputBg: 'rgba(248,250,252,0.98)',
    inputBorder: '#CBD5E1',
    hint: '#B91C1C',
    sectionTitle: '#1E293B',
  },
  dark: {
    background: '#020617',
    title: '#E2E8F0',
    subtitle: '#94A3B8',
    glass: 'rgba(15,23,42,0.72)',
    glassPressed: 'rgba(15,23,42,0.9)',
    glassBorder: 'rgba(148,163,184,0.34)',
    count: '#F8FAFC',
    resetBg: '#F8FAFC',
    resetPressed: '#E2E8F0',
    resetText: '#0F172A',
    toggleBg: '#1E293B',
    toggleText: '#E2E8F0',
    progressTrack: '#1E293B',
    progressFill: '#60A5FA',
    footer: '#94A3B8',
    inputBg: 'rgba(15,23,42,0.95)',
    inputBorder: '#334155',
    hint: '#FCA5A5',
    sectionTitle: '#E2E8F0',
  },
};

const DAY_LABELS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const FIELD_LABELS = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
  tahajjud: 'Tahajjud',
  suhoorEnd: 'Suhoor End',
  iftar: 'Iftar',
};

const ARABIC_PRAYER_LABEL = 'مواقيت الصلاة';

const pad = (value) => String(value).padStart(2, '0');

const formatDateISO = (date) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
};

const parseISODate = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const addDaysISO = (iso, days) => {
  const baseDate = parseISODate(iso);
  if (!baseDate) return iso;
  baseDate.setDate(baseDate.getDate() + days);
  return formatDateISO(baseDate);
};

const getCurrentWeekStartISO = () => {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  today.setDate(today.getDate() + mondayOffset);
  return formatDateISO(today);
};

const createDaysFromStart = (weekStartISO) =>
  Array.from({ length: 7 }, (_, index) => ({
    dateISO: addDaysISO(weekStartISO, index),
    fajr: '',
    dhuhr: '',
    asr: '',
    maghrib: '',
    isha: '',
    tahajjud: '',
    suhoorEnd: '',
    iftar: '',
  }));

const createDefaultSchedule = () => {
  const weekStartISO = '2026-02-19';
  return {
    weekStartISO,
    city: 'Frankfurt am Main',
    days: createDaysFromStart(weekStartISO),
  };
};

const normalizeSchedule = (rawSchedule) => {
  const fallback = createDefaultSchedule();
  if (!rawSchedule || typeof rawSchedule !== 'object') {
    return fallback;
  }

  const weekStartISO = typeof rawSchedule.weekStartISO === 'string' && parseISODate(rawSchedule.weekStartISO)
    ? rawSchedule.weekStartISO
    : fallback.weekStartISO;

  const city = typeof rawSchedule.city === 'string' && rawSchedule.city.trim()
    ? rawSchedule.city.trim()
    : fallback.city;

  const normalizedDays = Array.from({ length: 7 }, (_, index) => {
    const existing = Array.isArray(rawSchedule.days) ? rawSchedule.days[index] : null;
    return {
      dateISO: typeof existing?.dateISO === 'string' && parseISODate(existing.dateISO)
        ? existing.dateISO
        : addDaysISO(weekStartISO, index),
      fajr: typeof existing?.fajr === 'string' ? existing.fajr : '',
      dhuhr: typeof existing?.dhuhr === 'string' ? existing.dhuhr : '',
      asr: typeof existing?.asr === 'string' ? existing.asr : '',
      maghrib: typeof existing?.maghrib === 'string' ? existing.maghrib : '',
      isha: typeof existing?.isha === 'string' ? existing.isha : '',
      tahajjud: typeof existing?.tahajjud === 'string' ? existing.tahajjud : '',
      suhoorEnd: typeof existing?.suhoorEnd === 'string' ? existing.suhoorEnd : '',
      iftar: typeof existing?.iftar === 'string' ? existing.iftar : '',
    };
  });

  return { weekStartISO, city, days: normalizedDays };
};

const formatWeekRange = (weekStartISO) => {
  const start = parseISODate(weekStartISO);
  if (!start) return 'Ungültige Woche';
  const end = parseISODate(addDaysISO(weekStartISO, 6));
  return `${pad(start.getDate())}.${pad(start.getMonth() + 1)} – ${pad(end.getDate())}.${pad(end.getMonth() + 1)}`;
};

const isTodayWithinSchedule = (weekStartISO) => {
  const start = parseISODate(weekStartISO);
  if (!start) return false;

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return current >= start && current <= end;
};

const formatReadableDate = (dateISO) => {
  const date = parseISODate(dateISO);
  if (!date) return dateISO;
  return `${DAY_LABELS_DE[date.getDay()]}, ${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
};

const isValidTime = (value) => {
  if (!value) return true;
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(':').map(Number);
  if (hours < 0 || hours > 23) return false;
  if (minutes < 0 || minutes > 59) return false;
  return true;
};

const normalizeTimeInput = (value) => value.trim();

export default function App() {
  const systemScheme = useColorScheme();
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [themeMode, setThemeMode] = useState(systemScheme === 'dark' ? 'dark' : 'light');
  const [schedule, setSchedule] = useState(createDefaultSchedule);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);
  const [adminPin, setAdminPin] = useState(DEFAULT_ADMIN_PIN);
  const [adminMode, setAdminMode] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [weekStartInput, setWeekStartInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [timeErrors, setTimeErrors] = useState({});
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loadCount = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedValue !== null) {
          const parsedValue = Number.parseInt(storedValue, 10);
          if (!Number.isNaN(parsedValue)) {
            setCount(parsedValue);
          }
        }
      } catch (error) {
        console.warn('Failed to load tasbeeh count:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCount();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const persistCount = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, String(count));
      } catch (error) {
        console.warn('Failed to save tasbeeh count:', error);
      }
    };

    persistCount();
  }, [count, isLoading]);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(APP_STORAGE_KEYS.theme);
        if (storedTheme === 'light' || storedTheme === 'dark') {
          setThemeMode(storedTheme);
        }
      } catch (error) {
        console.warn('Failed to load theme:', error);
      }
    };

    loadTheme();
  }, []);

  useEffect(() => {
    const persistTheme = async () => {
      try {
        await AsyncStorage.setItem(APP_STORAGE_KEYS.theme, themeMode);
      } catch (error) {
        console.warn('Failed to save theme:', error);
      }
    };

    persistTheme();
  }, [themeMode]);

  useEffect(() => {
    const loadScheduleAndAdminData = async () => {
      try {
        const [storedSchedule, storedPin] = await Promise.all([
          AsyncStorage.getItem(APP_STORAGE_KEYS.schedule),
          AsyncStorage.getItem(APP_STORAGE_KEYS.adminPin),
        ]);

        const normalized = storedSchedule ? normalizeSchedule(JSON.parse(storedSchedule)) : createDefaultSchedule();
        setSchedule(normalized);
        setWeekStartInput(normalized.weekStartISO);
        setCityInput(normalized.city);

        if (storedPin && typeof storedPin === 'string') {
          setAdminPin(storedPin);
        }
      } catch (error) {
        console.warn('Failed to load schedule/admin settings:', error);
        const fallback = createDefaultSchedule();
        setSchedule(fallback);
        setWeekStartInput(fallback.weekStartISO);
        setCityInput(fallback.city);
      } finally {
        setScheduleLoaded(true);
      }
    };

    loadScheduleAndAdminData();
  }, []);

  const theme = THEMES[themeMode];
  const progress = useMemo(() => Math.min((count / DEFAULT_GOAL) * 100, 100), [count]);
  const weekIsCurrent = useMemo(() => isTodayWithinSchedule(schedule.weekStartISO), [schedule.weekStartISO]);

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

  const triggerHaptic = () => {
    if (typeof Vibration?.vibrate === 'function') {
      Vibration.vibrate(8);
    }
  };

  const incrementCount = () => {
    setCount((prev) => prev + 1);
    triggerHaptic();
  };

  const resetCount = () => setCount(0);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const persistSchedule = async (nextSchedule) => {
    const normalized = normalizeSchedule(nextSchedule);
    setSchedule(normalized);
    setWeekStartInput(normalized.weekStartISO);
    setCityInput(normalized.city);

    try {
      await AsyncStorage.setItem(APP_STORAGE_KEYS.schedule, JSON.stringify(normalized));
    } catch (error) {
      console.warn('Failed to save schedule:', error);
    }
  };

  const setScheduleToCurrentWeek = async () => {
    const weekStartISO = getCurrentWeekStartISO();
    const nextSchedule = {
      weekStartISO,
      city: schedule.city,
      days: createDaysFromStart(weekStartISO),
    };
    await persistSchedule(nextSchedule);
  };

  const onAdminLogin = () => {
    if (pinInput.trim() === adminPin) {
      setAdminMode(true);
      setPinInput('');
      return;
    }
    Alert.alert('Fehler', 'PIN ist nicht korrekt.');
  };

  const onAdminLogout = () => {
    setAdminMode(false);
    setNewPinInput('');
    setTimeErrors({});
  };

  const onChangeDayField = (dayIndex, field, rawValue) => {
    if (!adminMode) return;
    const normalizedValue = normalizeTimeInput(rawValue);

    setSchedule((prev) => {
      const nextDays = prev.days.map((day, index) => {
        if (index !== dayIndex) return day;
        return { ...day, [field]: normalizedValue };
      });
      return { ...prev, days: nextDays };
    });

    const key = `${dayIndex}_${field}`;
    setTimeErrors((prev) => {
      if (isValidTime(normalizedValue)) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: 'Bitte HH:MM verwenden' };
    });
  };

  const onSaveSchedule = async () => {
    if (!adminMode) return;

    const normalizedWeekStart = weekStartInput.trim();
    if (!parseISODate(normalizedWeekStart)) {
      Alert.alert('Ungültiges Datum', 'Week Start muss im Format YYYY-MM-DD sein.');
      return;
    }

    if (!cityInput.trim()) {
      Alert.alert('Ungültige Stadt', 'Bitte eine Stadt eintragen.');
      return;
    }

    const invalidEntries = [];
    schedule.days.forEach((day, dayIndex) => {
      [...PRAYER_FIELDS, ...RAMADAN_FIELDS].forEach((field) => {
        if (!isValidTime(day[field])) {
          invalidEntries.push(`${formatReadableDate(day.dateISO)} / ${FIELD_LABELS[field]}`);
          setTimeErrors((prev) => ({ ...prev, [`${dayIndex}_${field}`]: 'Bitte HH:MM verwenden' }));
        }
      });
    });

    if (invalidEntries.length > 0) {
      Alert.alert('Ungültige Zeit', 'Bitte korrigiere die Zeitfelder im Format HH:MM.');
      return;
    }

    const nextSchedule = {
      weekStartISO: normalizedWeekStart,
      city: cityInput.trim(),
      days: schedule.days.map((day, index) => ({
        ...day,
        dateISO: addDaysISO(normalizedWeekStart, index),
      })),
    };

    await persistSchedule(nextSchedule);
    Alert.alert('Gespeichert', 'Der Wochenplan wurde gespeichert.');
  };

  const onSaveNewPin = async () => {
    if (!adminMode) return;

    const candidate = newPinInput.trim();
    if (candidate.length < 4) {
      Alert.alert('PIN zu kurz', 'Bitte mindestens 4 Zeichen verwenden.');
      return;
    }

    try {
      await AsyncStorage.setItem(APP_STORAGE_KEYS.adminPin, candidate);
      setAdminPin(candidate);
      setNewPinInput('');
      Alert.alert('Erfolg', 'Admin PIN wurde aktualisiert.');
    } catch (error) {
      console.warn('Failed to save admin PIN:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.topRow}>
            <Text style={[styles.title, { color: theme.title }]}>Tasbeeh Zähler</Text>
            <Pressable
              style={({ pressed }) => [
                styles.toggleButton,
                { backgroundColor: theme.toggleBg },
                pressed && { opacity: 0.8 },
              ]}
              onPress={toggleTheme}
            >
              <Text style={[styles.toggleText, { color: theme.toggleText }]}>
                {themeMode === 'dark' ? 'Hell' : 'Dunkel'}
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.subtitle, { color: theme.subtitle }]}>Tippe auf den Zählerbereich, um zu erhöhen</Text>

          <Pressable onPressIn={animatePressIn} onPressOut={animatePressOut} onPress={incrementCount}>
            {({ pressed }) => (
              <Animated.View
                style={[
                  styles.counterArea,
                  {
                    backgroundColor: pressed ? theme.glassPressed : theme.glass,
                    borderColor: theme.glassBorder,
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator size="large" color={theme.count} />
                ) : (
                  <Text style={[styles.countText, { color: theme.count }]}>{count}</Text>
                )}
              </Animated.View>
            )}
          </Pressable>

          <View style={styles.progressSection}>
            <View style={[styles.progressTrack, { backgroundColor: theme.progressTrack }]}>
              <View style={[styles.progressFill, { backgroundColor: theme.progressFill, width: `${progress}%` }]} />
            </View>
            <Text style={[styles.progressText, { color: theme.subtitle }]}>Ziel: {DEFAULT_GOAL} • {progress.toFixed(0)}%</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.resetButton,
              { backgroundColor: pressed ? theme.resetPressed : theme.resetBg },
            ]}
            onPress={resetCount}
          >
            <Text style={[styles.resetText, { color: theme.resetText }]}>Reset</Text>
          </Pressable>

          <View style={[styles.glassCard, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
            <View style={styles.scheduleHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.sectionTitle }]}>Prayer Times</Text>
              <Text style={[styles.arabicLabel, { color: theme.subtitle, writingDirection: I18nManager.isRTL ? 'rtl' : 'rtl' }]}>
                {ARABIC_PRAYER_LABEL}
              </Text>
            </View>
            <Text style={[styles.metaText, { color: theme.subtitle }]}>Week: {formatWeekRange(schedule.weekStartISO)}</Text>
            <Text style={[styles.metaText, { color: theme.subtitle }]}>City: {schedule.city}</Text>

            {!weekIsCurrent && (
              <View style={[styles.warningBox, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}>
                <Text style={[styles.warningText, { color: theme.hint }]}>Schedule week is not current.</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.smallActionButton,
                    { backgroundColor: pressed ? theme.resetPressed : theme.resetBg },
                  ]}
                  onPress={setScheduleToCurrentWeek}
                >
                  <Text style={[styles.smallActionText, { color: theme.resetText }]}>Set week to current (keep times empty)</Text>
                </Pressable>
              </View>
            )}

            {!adminMode ? (
              <View style={styles.adminLoginRow}>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.title },
                  ]}
                  value={pinInput}
                  onChangeText={setPinInput}
                  placeholder="Admin PIN"
                  placeholderTextColor={theme.subtitle}
                  secureTextEntry
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.adminButton,
                    { backgroundColor: pressed ? theme.resetPressed : theme.resetBg },
                  ]}
                  onPress={onAdminLogin}
                >
                  <Text style={[styles.adminButtonText, { color: theme.resetText }]}>Admin Mode</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.adminPanel}>
                <Text style={[styles.adminTitle, { color: theme.sectionTitle }]}>Admin Einstellungen</Text>

                <Text style={[styles.inputLabel, { color: theme.subtitle }]}>Week Start (YYYY-MM-DD)</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.title },
                  ]}
                  value={weekStartInput}
                  onChangeText={setWeekStartInput}
                  autoCapitalize="none"
                />

                <Text style={[styles.inputLabel, { color: theme.subtitle }]}>Stadt</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.title },
                  ]}
                  value={cityInput}
                  onChangeText={setCityInput}
                />

                <Text style={[styles.inputLabel, { color: theme.subtitle }]}>Neuer Admin PIN</Text>
                <View style={styles.pinRow}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.pinInput,
                      { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.title },
                    ]}
                    value={newPinInput}
                    onChangeText={setNewPinInput}
                    secureTextEntry
                    placeholder="Neuer PIN"
                    placeholderTextColor={theme.subtitle}
                  />
                  <Pressable
                    style={({ pressed }) => [
                      styles.smallActionButton,
                      { backgroundColor: pressed ? theme.resetPressed : theme.resetBg },
                    ]}
                    onPress={onSaveNewPin}
                  >
                    <Text style={[styles.smallActionText, { color: theme.resetText }]}>PIN speichern</Text>
                  </Pressable>
                </View>

                {schedule.days.map((day, dayIndex) => (
                  <View key={day.dateISO} style={[styles.dayCard, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}>
                    <Text style={[styles.dayTitle, { color: theme.sectionTitle }]}>{formatReadableDate(day.dateISO)}</Text>

                    <Text style={[styles.groupTitle, { color: theme.subtitle }]}>Prayer Times</Text>
                    <View style={styles.grid}>
                      {PRAYER_FIELDS.map((field) => (
                        <View key={`${day.dateISO}_${field}`} style={styles.gridItem}>
                          <Text style={[styles.fieldLabel, { color: theme.subtitle }]}>{FIELD_LABELS[field]}</Text>
                          <TextInput
                            style={[
                              styles.input,
                              styles.timeInput,
                              { backgroundColor: theme.background, borderColor: theme.inputBorder, color: theme.title },
                            ]}
                            value={day[field]}
                            onChangeText={(value) => onChangeDayField(dayIndex, field, value)}
                            placeholder="HH:MM"
                            placeholderTextColor={theme.subtitle}
                            autoCapitalize="none"
                            maxLength={5}
                            editable={adminMode}
                          />
                          {timeErrors[`${dayIndex}_${field}`] ? (
                            <Text style={[styles.errorText, { color: theme.hint }]}>{timeErrors[`${dayIndex}_${field}`]}</Text>
                          ) : null}
                        </View>
                      ))}
                    </View>

                    <Text style={[styles.groupTitle, { color: theme.subtitle }]}>Ramadan Times</Text>
                    <View style={styles.grid}>
                      {RAMADAN_FIELDS.map((field) => (
                        <View key={`${day.dateISO}_${field}`} style={styles.gridItem}>
                          <Text style={[styles.fieldLabel, { color: theme.subtitle }]}>{FIELD_LABELS[field]}</Text>
                          <TextInput
                            style={[
                              styles.input,
                              styles.timeInput,
                              { backgroundColor: theme.background, borderColor: theme.inputBorder, color: theme.title },
                            ]}
                            value={day[field]}
                            onChangeText={(value) => onChangeDayField(dayIndex, field, value)}
                            placeholder="HH:MM"
                            placeholderTextColor={theme.subtitle}
                            autoCapitalize="none"
                            maxLength={5}
                            editable={adminMode}
                          />
                          {timeErrors[`${dayIndex}_${field}`] ? (
                            <Text style={[styles.errorText, { color: theme.hint }]}>{timeErrors[`${dayIndex}_${field}`]}</Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  </View>
                ))}

                <View style={styles.adminActionRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.adminButton,
                      { backgroundColor: pressed ? theme.resetPressed : theme.resetBg },
                    ]}
                    onPress={onSaveSchedule}
                  >
                    <Text style={[styles.adminButtonText, { color: theme.resetText }]}>Schedule speichern</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.adminButton,
                      { backgroundColor: pressed ? theme.resetPressed : theme.resetBg },
                    ]}
                    onPress={onAdminLogout}
                  >
                    <Text style={[styles.adminButtonText, { color: theme.resetText }]}>Admin ausloggen</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {!scheduleLoaded ? (
              <View style={styles.scheduleLoading}>
                <ActivityIndicator size="small" color={theme.subtitle} />
              </View>
            ) : null}
          </View>

          <Text style={[styles.footerText, { color: theme.footer }]}>Made by Tehmoor</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 22,
  },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  counterArea: {
    width: '100%',
    borderRadius: 30,
    borderWidth: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 6,
  },
  countText: {
    fontSize: 96,
    fontWeight: '800',
    lineHeight: 104,
    letterSpacing: 1,
  },
  progressSection: {
    marginTop: 4,
    marginBottom: 4,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  resetButton: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  resetText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  glassCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    gap: 8,
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  arabicLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  warningBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginTop: 4,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
  },
  smallActionButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallActionText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  adminLoginRow: {
    marginTop: 8,
    gap: 8,
  },
  adminPanel: {
    gap: 10,
    marginTop: 8,
  },
  adminTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  pinRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  pinInput: {
    flex: 1,
  },
  dayCard: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  groupTitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: '48%',
  },
  fieldLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  timeInput: {
    paddingVertical: 8,
  },
  errorText: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  adminActionRow: {
    marginTop: 8,
    gap: 8,
  },
  adminButton: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  adminButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scheduleLoading: {
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    paddingTop: 8,
  },
});
