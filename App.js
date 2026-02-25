import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useColorScheme,
  Vibration,
  View,
} from 'react-native';

const STORAGE_KEY = 'tasbeeh_count';
const THEME_STORAGE_KEY = 'tasbeeh_theme';
const DEFAULT_GOAL = 99;

const THEMES = {
  light: {
    background: '#F8FAFC',
    title: '#0F172A',
    subtitle: '#64748B',
    card: '#EEF2F7',
    cardPressed: '#E2E8F0',
    count: '#0F172A',
    border: '#D7DFEA',
    resetBg: '#0F172A',
    resetPressed: '#1E293B',
    resetText: '#FFFFFF',
    toggleBg: '#E2E8F0',
    toggleText: '#0F172A',
    progressTrack: '#E2E8F0',
    progressFill: '#334155',
    footer: '#94A3B8',
  },
  dark: {
    background: '#0B1220',
    title: '#E2E8F0',
    subtitle: '#94A3B8',
    card: '#111827',
    cardPressed: '#1F2937',
    count: '#F8FAFC',
    border: '#334155',
    resetBg: '#F8FAFC',
    resetPressed: '#E2E8F0',
    resetText: '#0F172A',
    toggleBg: '#1F2937',
    toggleText: '#E2E8F0',
    progressTrack: '#1E293B',
    progressFill: '#60A5FA',
    footer: '#94A3B8',
  },
};

export default function App() {
  const systemScheme = useColorScheme();
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [themeMode, setThemeMode] = useState(systemScheme === 'dark' ? 'dark' : 'light');
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
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
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
        await AsyncStorage.setItem(THEME_STORAGE_KEY, themeMode);
      } catch (error) {
        console.warn('Failed to save theme:', error);
      }
    };

    persistTheme();
  }, [themeMode]);

  const theme = THEMES[themeMode];
  const progress = useMemo(() => Math.min((count / DEFAULT_GOAL) * 100, 100), [count]);

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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
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
                  backgroundColor: pressed ? theme.cardPressed : theme.card,
                  borderColor: theme.border,
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

        <Text style={[styles.footerText, { color: theme.footer }]}>Made by Tehmoor</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
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
    marginTop: 10,
    marginBottom: 18,
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
    minHeight: 330,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  countText: {
    fontSize: 98,
    fontWeight: '800',
    lineHeight: 106,
    letterSpacing: 1,
  },
  progressSection: {
    marginTop: 14,
    marginBottom: 18,
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
    paddingVertical: 15,
  },
  resetText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footerText: {
    marginTop: 'auto',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    paddingTop: 16,
  },
});
