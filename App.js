import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const STORAGE_KEY = 'tasbeeh_count';

export default function App() {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

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

  const incrementCount = () => setCount((prev) => prev + 1);
  const resetCount = () => setCount(0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <Text style={styles.title}>Tasbeeh Zähler</Text>
        <Text style={styles.subtitle}>Tippe auf den Zählerbereich, um zu erhöhen</Text>

        <Pressable
          style={({ pressed }) => [
            styles.counterArea,
            pressed && styles.counterAreaPressed,
          ]}
          onPress={incrementCount}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color="#111111" />
          ) : (
            <Text style={styles.countText}>{count}</Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.resetButton, pressed && styles.resetPressed]}
          onPress={resetCount}
        >
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
  },
  title: {
    marginTop: 8,
    color: '#111111',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    color: '#444444',
    fontSize: 15,
  },
  counterArea: {
    flex: 1,
    width: '100%',
    maxHeight: 520,
    borderRadius: 28,
    backgroundColor: '#E5E5E5',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  counterAreaPressed: {
    backgroundColor: '#DADADA',
  },
  countText: {
    color: '#000000',
    fontSize: 96,
    fontWeight: '800',
    lineHeight: 102,
    letterSpacing: 1,
  },
  resetButton: {
    marginTop: 24,
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  resetPressed: {
    backgroundColor: '#1F1F1F',
  },
  resetText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
