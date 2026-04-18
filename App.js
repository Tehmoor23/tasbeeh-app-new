import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  Linking,
  View,
  Vibration,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as XLSX from 'xlsx';

const STORAGE_KEYS = {
  darkMode: '@tasbeeh_darkmode',
  activeMosque: '@tasbeeh_active_mosque',
  programConfigsByDate: '@tasbeeh_program_configs_by_date',
  announcementText: '@tasbeeh_announcement_text',
  qrBrowserDeviceId: '@tasbeeh_qr_browser_device_id',
  qrRegistration: '@tasbeeh_qr_registration',
  qrActivePage: '@tasbeeh_qr_active_page',
  guestActivation: '@tasbeeh_guest_activation',
  guestExternalConfig: '@tasbeeh_guest_external_config',
  terminalInactivityConfig: '@tasbeeh_terminal_inactivity_config',
};

const QR_REGISTRATION_COLLECTION = 'attendance_qr_device_registrations';
const QR_SCAN_PARAM = 'qrCheckin';
const QR_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const QR_COUNTDOWN_SECONDS = Math.floor(QR_REFRESH_INTERVAL_MS / 1000);

const getDarkModeStorageKey = (mosqueKey) => `${STORAGE_KEYS.darkMode}:${String(mosqueKey || DEFAULT_MOSQUE_KEY)}`;
const getAnnouncementStorageKey = (mosqueKey) => `${STORAGE_KEYS.announcementText}:${String(mosqueKey || DEFAULT_MOSQUE_KEY)}`;
const getTerminalInactivityStorageKey = (mosqueKey, externalScopeKey = '') => `${STORAGE_KEYS.terminalInactivityConfig}:${String(mosqueKey || DEFAULT_MOSQUE_KEY)}:${normalizeExternalScopeKey(externalScopeKey || 'default') || 'default'}`;

const DEFAULT_MOSQUE_KEY = 'baitus_sabuh';
const EXTERNAL_MOSQUE_KEY = 'external_guest';
const APP_MODE = 'full'; // 'full', 'extern' (legacy: 'guest'), 'display', 'qr', 'qr_extern', 'secret' oder 'registration'
const SECRET_QR_APP_URL = 'https://qr-terminal.web.app'; // Optional: eigener geheimer Scan-Host, z. B. https://scan.example.com
const MOSQUE_OPTIONS = [
  { key: DEFAULT_MOSQUE_KEY, label: 'Bait-Us-Sabuh', suffix: '' },
  { key: 'nuur_moschee', label: 'Nuur-Moschee', suffix: 'NUUR' },
  { key: 'roedelheim', label: 'Rödelheim', suffix: 'RO' },
  { key: 'hoechst', label: 'Höchst', suffix: 'HO' },
  { key: EXTERNAL_MOSQUE_KEY, label: 'Extern', suffix: 'EXT' },
];
const APP_LOGO_LIGHT = require('./assets/Icon3.png');
const APP_LOGO_DARK = require('./assets/Icon5.png');
const FORCE_TIME = null;
// const FORCE_TIME = '05:31'; // development override for testing
const FORCE_TEST_DATE_ENABLED = false;
const FORCE_TEST_DATE_ISO = '2026-03-15'; // development override for testing (YYYY-MM-DD)
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
  'Rödelheim',
  'Zeilsheim',
];
const TANZEEM_OPTIONS = ['ansar', 'khuddam', 'atfal'];
const PROGRAM_TANZEEM_OPTIONS = ['ansar', 'khuddam', 'atfal', 'kinder'];
const REGISTRATION_TANZEEM_OPTIONS = ['ansar', 'khuddam', 'atfal', 'kinder'];
const TANZEEM_LABELS = {
  ansar: 'Ansar',
  khuddam: 'Khuddam',
  atfal: 'Atfal',
  kinder: 'Kinder',
};
const PROGRAM_EXPORT_MAJLIS_ORDER = [
  'Baitus Sabuh Nord',
  'Baitus Sabuh Süd',
  'Bornheim',
  'Eschersheim',
  'Griesheim',
  'Berg',
  'Ginnheim',
  'Goldstein',
  'Hausen',
  'Höchst',
  'Nied',
  'Nordweststadt',
  'Nuur Moschee',
  'Rödelheim',
  'Zeilsheim',
  'Bad Vilbel',
];
const MEMBER_DIRECTORY_COLLECTION = 'attendance_member_entries';
const MEMBER_DIRECTORY_DATA = [ {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"10007","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"10898","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"11431","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"12722","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"12770","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"18380","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"19604","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"21096","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"21323","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"21325","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"32258","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"32547","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33203","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33243","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33413","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33429","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33442","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33454","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33459","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33470","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33492","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33496","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33517","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33521","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33542","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33550","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33563","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33567","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33591","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"35031","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"35473","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"37326","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"39580","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"42515","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"42557","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"49472","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"52117","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"53470","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"61100","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"61101","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"66696","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"75720","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"10010","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"11435","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"11434","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"12775","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"12772","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"12773","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"13650","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"15125","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"39362","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"40812","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"21328","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"27050","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"27096","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"31634","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33209","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33245","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"35438","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"37155","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33444","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33458","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33494","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33499","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33519","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33518","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33526","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33524","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"39369","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33552","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33566","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33569","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"35432","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33593","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33605","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"40813","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"35930","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"39582","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"39583","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"40267","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"40268","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"40438","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"42442","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"49715","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"46297","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"50083","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"51306","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"53176","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"53345","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"62890","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"59868","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"61104","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"61103","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"61759","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"75096","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"53054","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"56041","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"63316","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"45496","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"50372","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"58749","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"59332","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"59880","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"59440","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"62891","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"62892","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"63300","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"68300","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"76494","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"75241","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"75869","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"67158","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"75915","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"73267","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"71927","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"66171","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"75866","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"26915","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"32118","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"32127","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"32151","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"32456","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33036","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33136","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33329","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33416","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33418","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33421","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33424","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33436","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33439","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33507","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33534","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33538","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33544","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33574","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33586","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"34321","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"34342","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"34479","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"34487","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"35005","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"35086","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"35173","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"37095","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"37888","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"41819","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"53379","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"54926","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"59916","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"16303","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"39538","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"39539","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"32154","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"32155","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"32458","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"37140","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"32954","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33039","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33138","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33331","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33419","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33425","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"35433","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33482","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33511","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33523","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33537","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33536","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33549","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33561","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33562","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"41549","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"34323","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"34340","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"34341","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"34484","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"35145","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"35146","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"49809","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"39824","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"36856","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"37097","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"37892","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"37890","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"40407","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"40408","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"40406","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"41214","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"44173","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"45577","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"52274","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"42742","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"47849","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"49815","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"59227","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"61530","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"57971","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"42959","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"47989","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"73009","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Süd","idNumber":"66416","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Süd","idNumber":"65803","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Süd","idNumber":"71907","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Süd","idNumber":"64287","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Süd","idNumber":"66772","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Süd","idNumber":"74411","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Süd","idNumber":"76444","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"10881","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"13811","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"16348","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"19372","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"21394","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"25867","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"26843","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33167","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33185","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33188","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33193","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33230","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33241","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33272","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33281","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33289","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33292","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33301","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33303","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33309","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33318","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33321","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33325","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33323","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33332","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"37087","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"37393","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"37904","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"39247","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"40372","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"40434","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"40841","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"41603","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"41750","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"42225","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"43702","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"44573","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"44609","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"47617","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"49791","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"50013","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"51460","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"62054","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"62807","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"63924","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"13814","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"13815","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"13816","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"16352","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"16353","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"16350","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"17269","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"19124","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"65202","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"25869","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"25871","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"30774","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33175","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33183","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33184","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33195","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33271","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33283","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33284","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"40127","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33308","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33312","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"39106","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33320","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"36419","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"38367","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"40435","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"51670","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"45463","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"45564","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"46064","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"47878","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"47901","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"63385","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"51160","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"51157","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"51159","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"66527","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"74265","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"57711","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"65204","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"51349","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"54643","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"42260","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"58848","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"58849","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"49648","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"55834","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"55836","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"42698","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"59817","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"41313","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"67153","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"45889","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"61545","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"51673","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"58608","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"59342","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"47621","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"70879","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"70880","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"75814","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"68134","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"73577","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"76461","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"68603","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"71527","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"71528","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"64495","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"67035","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"62775","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"64342","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"70096","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"15099","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"16289","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"16701","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"22534","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"27321","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"32086","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"32285","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"32287","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"32813","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33016","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33085","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33213","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33252","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33255","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33345","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33350","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33355","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33358","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33366","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33371","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33376","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33388","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33393","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33474","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33777","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"35008","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"35027","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"35039","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"35050","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"35558","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"35977","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"36023","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"36169","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"38458","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"39775","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"56168","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"15102","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"15101","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"20400","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"26899","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"32089","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"32289","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"32887","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"47785","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"47786","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33087","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33217","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33215","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33257","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33258","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33344","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33341","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33342","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33347","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33348","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33349","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33353","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33369","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33368","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33375","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33379","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33390","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33391","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33397","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33395","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33476","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33477","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"42634","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33491","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33781","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33783","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33784","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"35010","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"36589","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"35041","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"35055","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"49986","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"49987","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"41896","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"45274","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"55175","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"59136","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"57080","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"70397","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"75204","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"56194","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"72105","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"41734","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"47793","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"42635","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"61720","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"66414","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"56797","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Eschersheim","idNumber":"68214","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Eschersheim","idNumber":"73489","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Eschersheim","idNumber":"72106","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"11491","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"16114","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"16290","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32257","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32334","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32357","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32359","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32401","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32411","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32437","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32481","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32487","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32489","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32499","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32510","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32530","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32549","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32554","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32558","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32563","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32580","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32581","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32743","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32753","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32765","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32784","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32818","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32840","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32935","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"33510","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"36665","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"37522","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"37887","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"40590","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"42144","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"44895","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"45589","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"46610","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"48066","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"48850","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"50576","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"70226","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"11493","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"11494","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"11495","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"11496","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"40236","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"16472","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"19401","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"20402","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"20534","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32413","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32415","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32442","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32485","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32486","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32491","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32513","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32553","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32556","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32561","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32578","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32582","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32627","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32756","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32766","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32768","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32767","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"34549","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32844","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32937","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"33352","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"40013","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"38041","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"38277","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"38278","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"39787","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32423","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32422","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"42160","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"44097","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"53248","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"53249","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"45931","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"46593","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"50869","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"55107","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"55625","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"56257","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"57404","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"58273","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"59474","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"61117","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"66636","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"70351","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"75876","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"76464","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"61195","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"64169","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"51683","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"67171","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"69442","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"59642","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"61794","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"49800","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"51900","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"59644","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"47363","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"64054","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"59064","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"51555","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"68023","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"59643","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"52376","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"74461","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"74462","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Griesheim","idNumber":"64055","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Griesheim","idNumber":"66652","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Griesheim","idNumber":"65536","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Griesheim","idNumber":"75238","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Griesheim","idNumber":"66219","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Griesheim","idNumber":"71297","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Griesheim","idNumber":"76385","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"26614","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32156","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32158","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32173","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32182","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32194","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32214","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32215","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32225","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32234","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32236","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32241","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32247","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32256","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32260","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32265","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32268","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32514","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"33278","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"33365","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"33867","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"42191","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"43145","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"43737","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"48500","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"55042","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"60538","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"10572","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"12570","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"27042","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32175","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32185","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32186","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32199","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32228","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"39738","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32246","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32251","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32264","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"39090","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"34643","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32270","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"38205","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"35308","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"33382","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"33737","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"37906","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"41622","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"55056","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"52449","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"47015","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"60541","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"72011","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"49518","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"63705","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"63706","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"47440","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"49869","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"50537","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"61971","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"55057","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"60542","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Berg","idNumber":"69004","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Berg","idNumber":"71867","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Berg","idNumber":"65537","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Berg","idNumber":"70141","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Berg","idNumber":"66115","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Berg","idNumber":"71071","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"14690","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"27322","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32083","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32090","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32109","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32123","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32130","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32137","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32160","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32167","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32170","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32171","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32178","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32202","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32254","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32273","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32296","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32306","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32321","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32328","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32490","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32532","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32533","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32861","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32900","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"33119","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"33147","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"35059","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"35069","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"38038","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"41274","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"43892","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"45386","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"56554","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"64546","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"64944","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"11935","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"14691","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"18447","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"37971","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"23486","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32085","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32124","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32125","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32126","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32140","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32141","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32142","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32162","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32207","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"52433","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32294","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32299","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32300","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"41382","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32323","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32324","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32398","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32864","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"38435","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32972","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"33122","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"39418","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"33173","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"33239","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"33240","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"33871","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"33997","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"35061","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"35062","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"35071","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"38039","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"44894","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"44896","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"45355","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"47834","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"49973","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"55148","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"56061","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"56556","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"56557","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"58727","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"62181","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"63583","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"68318","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"69724","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"73642","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"74369","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"74999","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"44621","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"47808","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"60321","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"43543","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"67081","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"46448","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"67241","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"58120","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"64548","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"74370","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Ginnheim","idNumber":"64549","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Ginnheim","idNumber":"74371","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"24285","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"26845","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"27245","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32290","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32292","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32316","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32325","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32347","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32353","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32980","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"33427","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"33802","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"34364","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"34369","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"35597","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"45354","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"45719","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"50017","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"52377","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"57131","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"12625","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"24314","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"39002","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"32349","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"46639","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"46640","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"32496","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"38840","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"35434","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33441","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33806","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33805","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33816","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33817","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33818","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"34368","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"34366","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"34970","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"36635","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33824","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"37453","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"42306","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"45229","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"49121","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"52975","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"66138","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"73015","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"74368","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"74885","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"75723","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"72305","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"44929","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"55237","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"47968","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"60807","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"47969","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"47607","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"50560","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"55261","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"55234","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"59747","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Goldstein","idNumber":"64249","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Goldstein","idNumber":"73786","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Goldstein","idNumber":"67517","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Goldstein","idNumber":"75724","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"32310","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"33127","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"33152","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"33154","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"33161","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"35209","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"44329","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"60875","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"26792","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"26794","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"26795","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"32313","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"32315","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"33164","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"35211","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"43815","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"44159","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"54481","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"55281","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"55300","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"55375","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Atfal","majlis":"Hausen","idNumber":"54496","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Hausen","idNumber":"63683","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Hausen","idNumber":"62448","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Hausen","idNumber":"72091","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Hausen","idNumber":"74931","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Hausen","idNumber":"66054","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"20103","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"20406","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"23136","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"30858","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32362","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32459","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32465","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32493","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32504","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32583","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32594","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32596","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32597","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32612","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32618","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32621","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32632","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32635","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32742","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32929","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32949","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32964","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32967","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"35368","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"35598","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"36197","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"37520","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"39675","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"43077","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"44198","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"47252","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"51187","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"52289","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"52856","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"20409","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"20412","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"23139","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"23141","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"23138","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"23140","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32365","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32366","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32462","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32469","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32495","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32497","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32587","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32586","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"40998","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32616","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32620","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"38805","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32623","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32636","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"38816","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32783","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32942","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"33018","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"33163","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"33385","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"33386","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"36796","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"42184","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"43537","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"47308","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"52291","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"54074","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"54313","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"54552","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"56218","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"60371","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"68492","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"70346","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"42766","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"43919","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"51094","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"57880","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"57881","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"46094","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"62455","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"67430","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"48205","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"47155","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"62368","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"47326","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"58215","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"73978","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"65729","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"74354","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"69775","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"66489","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"70430","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"66949","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"72073","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"69930","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"74720","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"75568","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"66556","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"12658","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"12926","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"12945","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"20238","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"24943","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32732","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32734","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32750","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32775","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32848","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32913","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32922","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"37868","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"38875","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"40884","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"44416","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"64358","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"20241","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"20242","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"37260","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"37261","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32786","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32828","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32851","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"37351","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32910","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32915","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32916","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"34550","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32927","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32941","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"39935","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"42857","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"44346","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"48349","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"58089","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Atfal","majlis":"Nied","idNumber":"63757","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nied","idNumber":"46573","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nied","idNumber":"42745","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nied","idNumber":"53750","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nied","idNumber":"61827","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nied","idNumber":"54315","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nied","idNumber":"72082","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nied","idNumber":"75259","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"27112","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32103","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32135","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32143","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32237","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32524","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32966","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32987","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33006","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33012","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33026","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33040","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33042","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33053","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33062","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33071","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33077","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33111","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33115","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33125","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33132","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33139","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33144","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33156","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33438","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33528","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33530","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33950","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35045","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35063","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35065","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35080","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35083","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35220","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35352","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35490","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"36167","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"36170","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"36811","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"36951","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"37000","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"38993","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"39333","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"39542","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"39579","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"40879","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"41795","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"43790","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"46091","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"46393","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"52875","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"69529","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"25815","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32105","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32136","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32159","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32277","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32283","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32288","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32534","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32885","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33029","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33044","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33056","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33067","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33075","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33079","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"38374","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33083","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33099","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33113","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"42738","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33118","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33117","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33134","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33142","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33146","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"42776","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33159","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33158","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33160","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33208","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33232","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33298","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"39416","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"41223","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33823","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33953","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33952","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"35049","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"45235","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"35068","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"41314","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"35085","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"39537","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"48671","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"44969","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"37676","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"49519","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"46236","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"51430","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"52876","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"53636","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"57798","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"16297","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"68552","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"69532","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"72783","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"65516","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"59553","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"62853","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"45303","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"59334","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"51530","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"52262","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"47965","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"61897","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"52155","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"60045","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"66669","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"64919","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"48179","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"c","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"46096","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"44970","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"49520","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"62925","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"72292","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"52877","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"63319","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"73247","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"71294","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"73694","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"72286","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"72287","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"63860","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"74711","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"65827","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"72464","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"72071","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"69067","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"67898","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"72185","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"74423","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"74419","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"66260","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"67899","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"72291","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"75562","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"64782","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"72189","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"12637","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"19246","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"19767","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"20179","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"22934","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"24717","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"24719","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"26986","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"31511","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"32877","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33264","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33945","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33954","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33958","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33976","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33982","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33988","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33993","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33999","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"34004","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"34015","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"34019","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"34024","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"34200","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"35958","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"36277","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"36280","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"36281","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"36500","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"36893","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"37079","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"42368","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"43419","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"45331","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"47692","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"47702","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"53305","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"67543","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"70573","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"15852","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"24707","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"24720","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"32855","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"32879","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"32880","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"32882","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33266","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33949","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33948","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33957","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33961","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33962","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33960","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33970","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33975","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33973","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33980","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33979","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33981","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33986","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33984","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33990","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34002","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34003","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34017","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34021","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34022","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34029","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34028","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34203","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34204","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34205","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"35078","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"35079","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"45718","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"47694","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"49328","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"54232","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"59499","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"68889","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"70576","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"70575","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"49989","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"69832","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"69833","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"50407","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"45626","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nuur Moschee","idNumber":"69834","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nuur Moschee","idNumber":"75244","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Nuur Moschee","idNumber":"76221","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"11061","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"12568","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"20531","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"22993","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"23519","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"25241","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"26790","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"27275","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"27493","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"27882","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32161","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32416","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32451","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32865","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32875","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32896","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32969","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32978","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32979","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"33024","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"33031","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"33051","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"34922","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"35560","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"35583","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"35812","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"35911","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"36299","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"36679","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"36990","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"38883","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"42302","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"44567","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"48838","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"50215","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"52520","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"53227","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"55982","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"12571","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"40100","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"20970","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"21166","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"22429","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"41128","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"25245","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"27280","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"27495","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"36568","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32454","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"39112","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32526","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32738","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32868","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32869","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32886","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32899","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32957","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"34476","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32973","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"41131","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32994","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"33025","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"35661","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"39469","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"36836","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"43027","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"43487","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"44248","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"49859","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"50217","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"50631","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"54306","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"56268","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"73317","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"47792","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"76267","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"65569","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"49826","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"51015","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"53731","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"61783","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"48825","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"56361","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"55853","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"41254","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"45637","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"58452","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"53230","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"56364","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"57397","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"76268","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"71751","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"64243","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"66544","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"70810","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"72304","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"64420","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"67631","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"62857","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"76214","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"19645","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"20070","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"21065","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"21239","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"23220","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"32424","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"32443","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"32525","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"32588","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"32740","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"34631","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"36457","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"45037","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"53097","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"20073","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"20074","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"20840","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"21068","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"21067","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"30226","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"32356","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"40729","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"40429","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"39334","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"39653","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"42676","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"49745","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"46210","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"46995","name":"XXX","stimmberechtigt":1,"wahlberechtigt":1,"anwesend_2026_01_08":1}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"47154","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"50434","name":"XXX","stimmberechtigt":0,"wahlberechtigt":0,"anwesend_2026_01_08":0}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"72004","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"52747","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"67374","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"67375","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"49746","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"53243","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"53099","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Zeilsheim","idNumber":"73252","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Zeilsheim","idNumber":"72258","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Zeilsheim","idNumber":"72260","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Zeilsheim","idNumber":"67376","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Zeilsheim","idNumber":"64592","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Kinder","majlis":"Zeilsheim","idNumber":"68502","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"33467","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12711","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"20362","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12623","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"43685","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"32145","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"35218","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12822","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"42514","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"35232","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"16672","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12604","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"51429","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"66196","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"51642","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12621","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"35474","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"35476","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"56212","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12675","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12645","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"47369","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"53115","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"16535","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"49907","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"43459","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12833","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"30313","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"36671","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"33486","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"33488","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12796","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"47867","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"35945","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"17149","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"40922","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12713","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"42258","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"59800","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"11022","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"47635","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"51174","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"31770","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12824","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12826","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12827","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12825","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"35236","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"44504","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12606","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12608","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12915","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"26617","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"72167","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"55134","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"46264","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"65611","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"65613","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"10736","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12677","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"45389","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"34555","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"46862","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"11032","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"52220","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"64468","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"64469","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"20772","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12835","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12836","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"43131","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"38787","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"43144","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"62158","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"65838","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"53188","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12799","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12800","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"66653","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"56513","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"63057","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"47864","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"75870","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"51569","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"69902","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"60611","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"60429","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"53074","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"47868","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"52353","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"66119","name":"XXX","stimmberechtigt":'-',"wahlberechtigt":'-',"anwesend_2026_01_08":'-'} ] .map((entry) => ({ tanzeem: String(entry.tanzeem || '').trim().toLowerCase(), majlis: String(entry.majlis || '').trim(), idNumber: String(entry.idNumber || '').trim(), name: String(entry.name || '').trim(), stimmberechtigt: entry.stimmberechtigt, wahlberechtigt: entry.wahlberechtigt, anwesend_2026_01_08: entry.anwesend_2026_01_08, }));
//const MEMBER_DIRECTORY_DATA = [ {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"10007","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"10898","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"11431","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"12722","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"12770","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"18380","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"19604","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"21096","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"21323","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"21325","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"32258","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"32547","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33203","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33243","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33413","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33429","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33442","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33454","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33459","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33470","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33492","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33496","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33517","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33521","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33542","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33550","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33563","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33567","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33591","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"35031","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"35473","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"37326","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"39580","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"42515","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"42557","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"49472","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"52117","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"53470","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"61100","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"61101","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"66696","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"75720","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"10010","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"11435","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"11434","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"12775","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"12772","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"12773","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"13650","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"15125","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"39362","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"40812","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"21328","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"27050","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"27096","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"31634","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33209","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33245","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"35438","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"37155","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33444","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33458","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33494","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33499","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33519","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33518","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33526","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33524","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"39369","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33552","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33566","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33569","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"35432","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33593","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33605","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"40813","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"35930","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"39582","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"39583","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"40267","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"40268","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"40438","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"42442","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"49715","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"46297","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"50083","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"51306","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"53176","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"53345","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"62890","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"59868","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"61104","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"61103","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"61759","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"75096","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"53054","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"56041","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"63316","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"45496","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"50372","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"58749","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"59332","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"59880","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"59440","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"62891","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"62892","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"63300","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"68300","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"76494","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"75241","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"75869","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"67158","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"75915","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"73267","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"71927","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"66171","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Nord","idNumber":"75866","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"26915","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"32118","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"32127","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"32151","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"32456","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33036","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33136","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33329","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33416","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33418","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33421","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33424","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33436","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33439","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33507","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33534","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33538","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33544","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33574","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33586","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"34321","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"34342","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"34479","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"34487","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"35005","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"35086","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"35173","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"37095","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"37888","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"41819","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"53379","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"54926","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"59916","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"16303","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"39538","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"39539","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"32154","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"32155","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"32458","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"37140","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"32954","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33039","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33138","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33331","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33419","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33425","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"35433","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33482","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33511","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33523","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33537","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33536","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33549","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33561","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33562","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"41549","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"34323","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"34340","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"34341","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"34484","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"35145","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"35146","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"49809","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"39824","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"36856","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"37097","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"37892","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"37890","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"40407","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"40408","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"40406","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"41214","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"44173","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"45577","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"52274","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"42742","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"47849","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"49815","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"59227","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"61530","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"57971","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"42959","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"47989","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"73009","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Süd","idNumber":"66416","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Süd","idNumber":"65803","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Süd","idNumber":"71907","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Süd","idNumber":"64287","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Süd","idNumber":"66772","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Süd","idNumber":"74411","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Baitus Sabuh Süd","idNumber":"76444","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"10881","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"13811","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"16348","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"19372","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"21394","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"25867","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"26843","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33167","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33185","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33188","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33193","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33230","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33241","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33272","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33281","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33289","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33292","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33301","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33303","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33309","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33318","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33321","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33325","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33323","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33332","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"37087","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"37393","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"37904","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"39247","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"40372","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"40434","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"40841","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"41603","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"41750","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"42225","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"43702","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"44573","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"44609","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"47617","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"49791","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"50013","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"51460","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"62054","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"62807","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"63924","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"13814","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"13815","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"13816","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"16352","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"16353","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"16350","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"17269","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"19124","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"65202","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"25869","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"25871","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"30774","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33175","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33183","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33184","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33195","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33271","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33283","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33284","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"40127","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33308","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33312","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"39106","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33320","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"36419","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"38367","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"40435","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"51670","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"45463","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"45564","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"46064","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"47878","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"47901","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"63385","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"51160","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"51157","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"51159","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"66527","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"74265","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"57711","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"65204","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"51349","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"54643","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"42260","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"58848","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"58849","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"49648","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"55834","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"55836","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"42698","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"59817","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"41313","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"67153","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"45889","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"61545","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"51673","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"58608","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"59342","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"47621","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"70879","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"70880","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"75814","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"68134","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"73577","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"76461","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"68603","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"71527","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"71528","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"64495","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"67035","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"62775","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"64342","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Bornheim","idNumber":"70096","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"15099","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"16289","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"16701","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"22534","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"27321","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"32086","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"32285","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"32287","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"32813","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33016","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33085","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33213","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33252","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33255","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33345","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33350","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33355","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33358","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33366","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33371","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33376","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33388","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33393","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33474","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33777","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"35008","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"35027","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"35039","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"35050","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"35558","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"35977","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"36023","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"36169","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"38458","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"39775","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"56168","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"15102","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"15101","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"20400","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"26899","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"32089","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"32289","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"32887","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"47785","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"47786","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33087","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33217","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33215","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33257","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33258","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33344","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33341","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33342","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33347","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33348","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33349","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33353","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33369","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33368","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33375","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33379","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33390","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33391","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33397","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33395","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33476","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33477","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"42634","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33491","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33781","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33783","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33784","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"35010","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"36589","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"35041","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"35055","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"49986","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"49987","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"41896","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"45274","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"55175","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"59136","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"57080","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"70397","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"75204","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"56194","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"72105","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"41734","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"47793","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"42635","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"61720","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"66414","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"56797","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Eschersheim","idNumber":"68214","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Eschersheim","idNumber":"73489","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Eschersheim","idNumber":"72106","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"11491","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"16114","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"16290","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32257","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32334","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32357","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32359","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32401","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32411","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32437","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32481","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32487","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32489","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32499","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32510","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32530","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32549","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32554","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32558","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32563","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32580","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32581","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32743","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32753","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32765","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32784","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32818","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32840","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32935","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"33510","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"36665","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"37522","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"37887","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"40590","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"42144","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"44895","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"45589","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"46610","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"48066","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"48850","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"50576","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"70226","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"11493","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"11494","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"11495","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"11496","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"40236","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"16472","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"19401","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"20402","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"20534","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32413","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32415","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32442","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32485","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32486","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32491","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32513","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32553","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32556","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32561","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32578","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32582","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32627","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32756","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32766","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32768","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32767","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"34549","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32844","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32937","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"33352","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"40013","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"38041","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"38277","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"38278","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"39787","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32423","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32422","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"42160","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"44097","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"53248","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"53249","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"45931","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"46593","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"50869","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"55107","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"55625","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"56257","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"57404","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"58273","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"59474","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"61117","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"66636","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"70351","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"75876","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"76464","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"61195","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"64169","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"51683","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"67171","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"69442","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"59642","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"61794","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"49800","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"51900","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"59644","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"47363","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"64054","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"59064","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"51555","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"68023","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"59643","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"52376","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"74461","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"74462","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Griesheim","idNumber":"64055","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Griesheim","idNumber":"66652","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Griesheim","idNumber":"65536","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Griesheim","idNumber":"75238","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Griesheim","idNumber":"66219","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Griesheim","idNumber":"71297","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Griesheim","idNumber":"76385","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"26614","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32156","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32158","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32173","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32182","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32194","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32214","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32215","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32225","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32234","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32236","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32241","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32247","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32256","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32260","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32265","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32268","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32514","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"33278","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"33365","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"33867","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"42191","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"43145","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"43737","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"48500","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"55042","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"60538","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"10572","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"12570","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"27042","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32175","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32185","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32186","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32199","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32228","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"39738","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32246","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32251","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32264","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"39090","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"34643","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32270","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"38205","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"35308","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"33382","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"33737","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"37906","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"41622","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"55056","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"52449","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"47015","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"60541","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"72011","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"49518","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"63705","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"63706","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"47440","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"49869","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"50537","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"61971","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"55057","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"60542","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Berg","idNumber":"69004","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Berg","idNumber":"71867","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Berg","idNumber":"65537","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Berg","idNumber":"70141","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Berg","idNumber":"66115","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Berg","idNumber":"71071","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"14690","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"27322","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32083","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32090","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32109","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32123","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32130","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32137","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32160","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32167","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32170","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32171","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32178","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32202","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32254","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32273","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32296","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32306","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32321","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32328","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32490","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32532","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32533","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32861","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32900","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"33119","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"33147","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"35059","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"35069","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"38038","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"41274","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"43892","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"45386","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"56554","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"64546","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"64944","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"11935","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"14691","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"18447","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"37971","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"23486","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32085","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32124","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32125","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32126","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32140","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32141","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32142","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32162","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32207","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"52433","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32294","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32299","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32300","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"41382","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32323","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32324","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32398","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32864","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"38435","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32972","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"33122","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"39418","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"33173","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"33239","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"33240","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"33871","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"33997","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"35061","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"35062","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"35071","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"38039","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"44894","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"44896","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"45355","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"47834","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"49973","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"55148","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"56061","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"56556","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"56557","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"58727","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"62181","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"63583","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"68318","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"69724","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"73642","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"74369","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"74999","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"44621","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"47808","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"60321","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"43543","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"67081","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"46448","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"67241","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"58120","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"64548","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"74370","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Ginnheim","idNumber":"64549","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Ginnheim","idNumber":"74371","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"24285","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"26845","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"27245","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32290","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32292","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32316","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32325","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32347","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32353","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32980","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"33427","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"33802","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"34364","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"34369","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"35597","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"45354","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"45719","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"50017","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"52377","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"57131","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"12625","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"24314","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"39002","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"32349","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"46639","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"46640","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"32496","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"38840","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"35434","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33441","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33806","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33805","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33816","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33817","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33818","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"34368","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"34366","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"34970","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"36635","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33824","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"37453","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"42306","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"45229","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"49121","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"52975","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"66138","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"73015","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"74368","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"74885","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"75723","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"72305","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"44929","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"55237","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"47968","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"60807","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"47969","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"47607","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"50560","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"55261","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"55234","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"59747","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Goldstein","idNumber":"64249","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Goldstein","idNumber":"73786","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Goldstein","idNumber":"67517","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Goldstein","idNumber":"75724","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"32310","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"33127","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"33152","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"33154","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"33161","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"35209","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"44329","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"60875","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"26792","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"26794","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"26795","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"32313","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"32315","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"33164","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"35211","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"43815","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"44159","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"54481","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"55281","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"55300","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"55375","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Hausen","idNumber":"54496","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Hausen","idNumber":"63683","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Hausen","idNumber":"62448","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Hausen","idNumber":"72091","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Hausen","idNumber":"74931","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Hausen","idNumber":"66054","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"20103","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"20406","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"23136","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"30858","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32362","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32459","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32465","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32493","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32504","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32583","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32594","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32596","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32597","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32612","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32618","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32621","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32632","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32635","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32742","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32929","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32949","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32964","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32967","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"35368","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"35598","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"36197","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"37520","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"39675","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"43077","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"44198","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"47252","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"51187","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"52289","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"52856","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"20409","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"20412","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"23139","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"23141","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"23138","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"23140","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32365","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32366","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32462","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32469","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32495","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32497","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32587","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32586","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"40998","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32616","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32620","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"38805","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32623","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32636","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"38816","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32783","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32942","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"33018","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"33163","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"33385","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"33386","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"36796","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"42184","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"43537","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"47308","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"52291","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"54074","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"54313","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"54552","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"56218","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"60371","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"68492","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"70346","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"42766","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"43919","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"51094","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"57880","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"57881","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"46094","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"62455","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"67430","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"48205","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"47155","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"62368","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"47326","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"58215","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"73978","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"65729","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"74354","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"69775","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"66489","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"70430","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"66949","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"72073","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"69930","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"74720","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"75568","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Höchst","idNumber":"66556","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"12658","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"12926","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"12945","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"20238","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"24943","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32732","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32734","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32750","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32775","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32848","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32913","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32922","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"37868","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"38875","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"40884","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"44416","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"64358","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"20241","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"20242","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"37260","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"37261","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32786","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32828","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32851","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"37351","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32910","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32915","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32916","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"34550","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32927","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32941","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"39935","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"42857","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"44346","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"48349","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"58089","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nied","idNumber":"63757","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nied","idNumber":"46573","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nied","idNumber":"42745","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nied","idNumber":"53750","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nied","idNumber":"61827","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nied","idNumber":"54315","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nied","idNumber":"72082","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nied","idNumber":"75259","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"27112","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32103","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32135","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32143","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32237","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32524","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32966","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32987","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33006","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33012","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33026","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33040","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33042","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33053","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33062","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33071","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33077","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33111","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33115","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33125","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33132","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33139","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33144","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33156","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33438","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33528","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33530","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33950","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35045","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35063","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35065","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35080","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35083","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35220","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35352","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35490","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"36167","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"36170","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"36811","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"36951","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"37000","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"38993","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"39333","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"39542","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"39579","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"40879","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"41795","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"43790","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"46091","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"46393","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"52875","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"69529","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"25815","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32105","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32136","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32159","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32277","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32283","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32288","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32534","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32885","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33029","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33044","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33056","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33067","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33075","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33079","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"38374","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33083","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33099","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33113","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"42738","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33118","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33117","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33134","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33142","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33146","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"42776","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33159","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33158","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33160","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33208","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33232","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33298","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"39416","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"41223","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33823","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33953","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33952","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"35049","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"45235","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"35068","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"41314","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"35085","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"39537","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"48671","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"44969","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"37676","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"49519","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"46236","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"51430","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"52876","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"53636","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"57798","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"16297","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"68552","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"69532","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"72783","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"65516","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"59553","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"62853","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"45303","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"59334","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"51530","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"52262","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"47965","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"61897","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"52155","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"60045","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"66669","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"64919","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"48179","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"c","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"46096","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"44970","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"49520","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"62925","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"72292","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"52877","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"63319","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"73247","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"71294","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"73694","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"72286","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"72287","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"63860","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"74711","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"65827","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"72464","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"72071","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"69067","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"67898","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"72185","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"74423","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"74419","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"66260","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"67899","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"72291","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"75562","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"64782","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nordweststadt","idNumber":"72189","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"12637","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"19246","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"19767","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"20179","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"22934","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"24717","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"24719","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"26986","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"31511","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"32877","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33264","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33945","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33954","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33958","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33976","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33982","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33988","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33993","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33999","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"34004","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"34015","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"34019","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"34024","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"34200","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"35958","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"36277","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"36280","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"36281","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"36500","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"36893","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"37079","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"42368","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"43419","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"45331","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"47692","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"47702","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"53305","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"67543","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"70573","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"15852","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"24707","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"24720","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"32855","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"32879","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"32880","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"32882","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33266","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33949","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33948","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33957","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33961","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33962","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33960","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33970","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33975","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33973","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33980","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33979","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33981","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33986","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33984","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33990","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34002","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34003","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34017","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34021","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34022","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34029","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34028","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34203","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34204","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34205","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"35078","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"35079","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"45718","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"47694","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"49328","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"54232","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"59499","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"68889","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"70576","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"70575","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"49989","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"69832","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"69833","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"50407","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"45626","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nuur Moschee","idNumber":"69834","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nuur Moschee","idNumber":"75244","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Nuur Moschee","idNumber":"76221","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"11061","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"12568","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"20531","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"22993","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"23519","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"25241","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"26790","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"27275","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"27493","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"27882","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32161","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32416","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32451","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32865","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32875","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32896","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32969","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32978","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32979","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"33024","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"33031","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"33051","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"34922","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"35560","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"35583","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"35812","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"35911","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"36299","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"36679","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"36990","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"38883","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"42302","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"44567","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"48838","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"50215","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"52520","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"53227","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"55982","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"12571","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"40100","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"20970","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"21166","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"22429","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"41128","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"25245","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"27280","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"27495","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"36568","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32454","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"39112","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32526","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32738","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32868","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32869","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32886","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32899","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32957","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"34476","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32973","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"41131","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32994","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"33025","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"35661","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"39469","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"36836","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"43027","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"43487","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"44248","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"49859","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"50217","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"50631","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"54306","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"56268","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"73317","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"47792","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"76267","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"65569","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"49826","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"51015","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"53731","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"61783","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"48825","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"56361","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"55853","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"41254","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"45637","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"58452","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"53230","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"56364","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"57397","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"76268","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"71751","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"64243","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"66544","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"70810","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"72304","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"64420","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"67631","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"62857","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Rödelheim","idNumber":"76214","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"19645","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"20070","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"21065","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"21239","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"23220","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"32424","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"32443","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"32525","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"32588","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"32740","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"34631","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"36457","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"45037","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"53097","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"20073","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"20074","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"20840","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"21068","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"21067","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"30226","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"32356","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"40729","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"40429","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"39334","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"39653","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"42676","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"49745","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"46210","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"46995","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"47154","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"50434","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"72004","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"52747","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"67374","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"67375","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"49746","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"53243","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"53099","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Zeilsheim","idNumber":"73252","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Zeilsheim","idNumber":"72258","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Zeilsheim","idNumber":"72260","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Zeilsheim","idNumber":"67376","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Zeilsheim","idNumber":"64592","name":"XXX"}, {"tanzeem":"Kinder","majlis":"Zeilsheim","idNumber":"68502","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"33467","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12711","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"20362","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12623","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"43685","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"32145","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"35218","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12822","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"42514","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"35232","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"16672","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12604","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"51429","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"66196","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"51642","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12621","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"35474","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"35476","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"56212","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12675","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12645","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"47369","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"53115","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"16535","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"49907","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"43459","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12833","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"30313","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"36671","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"33486","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"33488","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12796","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"47867","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"35945","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"17149","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"40922","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12713","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"42258","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"59800","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"11022","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"47635","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"51174","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"31770","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12824","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12826","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12827","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12825","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"35236","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"44504","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12606","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12608","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12915","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"26617","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"72167","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"55134","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"46264","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"65611","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"65613","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"10736","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12677","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"45389","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"34555","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"46862","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"11032","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"52220","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"64468","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"64469","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"20772","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12835","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12836","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"43131","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"38787","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"43144","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"62158","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"65838","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"53188","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12799","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12800","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"66653","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"56513","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"63057","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"47864","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"75870","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"51569","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"69902","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"60611","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"60429","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"53074","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"47868","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"52353","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"66119","name":"XXX"} ] .map((entry) => ({ tanzeem: String(entry.tanzeem || '').trim().toLowerCase(), majlis: String(entry.majlis || '').trim(), idNumber: String(entry.idNumber || '').trim(), name: String(entry.name || '').trim(), }));
//const MEMBER_DIRECTORY_DATA = [{"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"11559","name":"Ahmad Khan"},{"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"11599","name":"Bilal Siddiqi"},{"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"11639","name":"Sajid Ilyas"},{"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"11679","name":"Yasir Latif"},{"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"11678","name":"Zubair Aslam"},{"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"11718","name":"Waseem Hanif"},{"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"11758","name":"Nadeem Yousaf"},{"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"11798","name":"Fahad Nisar"},{"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"11797","name":"Danish Parvez"},{"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"11837","name":"Rizwan Karim"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"11645","name":"Ali Raza"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"11685","name":"Huzaifa Malik"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"11725","name":"Rayyan Iqbal"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"11724","name":"Ammar Faisal"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"11764","name":"Arham Siddiqui"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"11804","name":"Shayan Khalid"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"11844","name":"Eesa Latif"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"11843","name":"Abdullah Sami"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"11883","name":"Ahsan Waqas"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"11923","name":"Haider Imtiaz"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"11731","name":"Ilyas Tariq"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"11771","name":"Isa Rehman"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"11770","name":"Samee Ullah"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"11810","name":"Hanzala Noman"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"11850","name":"Azlan Javed"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"11890","name":"Ehan Hussain"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"11889","name":"Kiyan Imran"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"11929","name":"Rahil Usman"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"11969","name":"Numan Faisal"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"11968","name":"Rameen Rashid"},{"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"12017","name":"Farooq Ahmed"},{"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"12057","name":"Hamid Raza"},{"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"12097","name":"Sohail Anwar"},{"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"12137","name":"Shahid Rafiq"},{"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"12136","name":"Sami Ullah"},{"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"12176","name":"Arif Chaudhry"},{"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"12216","name":"Naveed Asghar"},{"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"12256","name":"Mansoor Ali"},{"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"12255","name":"Salman Tariq"},{"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"12295","name":"Ahsan Mirza"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"12103","name":"Ibrahim Nadeem"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"12143","name":"Sufyan Javed"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"12183","name":"Ayaan Rahman"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"12182","name":"Hammad Anwar"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"12222","name":"Taha Mehmood"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"12262","name":"Hashir Noman"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"12302","name":"Subhan Nisar"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"12301","name":"Zaryab Salman"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"12341","name":"Kashan Hamid"},{"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"12381","name":"Rafay Asghar"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"12189","name":"Zayd Qasim"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"12229","name":"Reyan Farooq"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"12228","name":"Dawood Bashir"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"12268","name":"Sarim Rauf"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"12308","name":"Aahil Nadeem"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"12307","name":"Huzaib Arif"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"12347","name":"Sahil Parvez"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"12387","name":"Aatif Hamid"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"12427","name":"Areeb Danish"},{"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"12426","name":"Ramees Waseem"},{"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12477","name":"Adnan Bashir"},{"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12517","name":"Owais Malik"},{"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12557","name":"Adeel Rehman"},{"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12597","name":"Qasim Iqbal"},{"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12596","name":"Asif Nawaz"},{"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12636","name":"Usman Ghani"},{"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12676","name":"Faisal Latif"},{"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12716","name":"Hasnain Qadir"},{"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12715","name":"Shakir Rauf"},{"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"12755","name":"Rashid Mahmood"},{"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12563","name":"Mubashir Asif"},{"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12603","name":"Rayan Bashir"},{"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12643","name":"Maaz Yousuf"},{"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12642","name":"Daniyal Farhan"},{"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12682","name":"Arsalan Junaid"},{"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12722","name":"Faris Omer"},{"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12721","name":"Moin Uddin"},{"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12761","name":"Fahim Zahid"},{"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12801","name":"Shazil Akbar"},{"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"12841","name":"Umar Farooq"},{"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"12649","name":"Sarmad Asif"},{"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"12648","name":"Taim Noor"},{"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"12688","name":"Rameez Sami"},{"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"12728","name":"Zavian Akhtar"},{"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"12768","name":"Saif Mahmood"},{"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"12767","name":"Nahil Qadir"},{"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"12807","name":"Fawad Munir"},{"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"12847","name":"Zohair Naveed"},{"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"12887","name":"Adam Khan"},{"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"12886","name":"Mikail Raza"},{"tanzeem":"Ansar","majlis":"Berg","idNumber":"12939","name":"Fahad Nisar"},{"tanzeem":"Ansar","majlis":"Berg","idNumber":"12979","name":"Danish Parvez"},{"tanzeem":"Ansar","majlis":"Berg","idNumber":"13019","name":"Rizwan Karim"},{"tanzeem":"Ansar","majlis":"Berg","idNumber":"13018","name":"Junaid Zahid"},{"tanzeem":"Ansar","majlis":"Berg","idNumber":"13058","name":"Mudassar Iqbal"},{"tanzeem":"Ansar","majlis":"Berg","idNumber":"13098","name":"Saqib Munir"},{"tanzeem":"Ansar","majlis":"Berg","idNumber":"13138","name":"Atif Shabbir"},{"tanzeem":"Ansar","majlis":"Berg","idNumber":"13137","name":"Tariq Mehmood"},{"tanzeem":"Ansar","majlis":"Berg","idNumber":"13177","name":"Khalid Hussain"},{"tanzeem":"Ansar","majlis":"Berg","idNumber":"13217","name":"Imran Qureshi"},{"tanzeem":"Khuddam","majlis":"Berg","idNumber":"13025","name":"Abdullah Sami"},{"tanzeem":"Khuddam","majlis":"Berg","idNumber":"13065","name":"Ahsan Waqas"},{"tanzeem":"Khuddam","majlis":"Berg","idNumber":"13064","name":"Haider Imtiaz"},{"tanzeem":"Khuddam","majlis":"Berg","idNumber":"13104","name":"Jawad Nadeem"},{"tanzeem":"Khuddam","majlis":"Berg","idNumber":"13144","name":"Sameer Adil"},{"tanzeem":"Khuddam","majlis":"Berg","idNumber":"13184","name":"Zohaib Tariq"},{"tanzeem":"Khuddam","majlis":"Berg","idNumber":"13183","name":"Hamza Khan"},{"tanzeem":"Khuddam","majlis":"Berg","idNumber":"13223","name":"Zain ul Abideen"},{"tanzeem":"Khuddam","majlis":"Berg","idNumber":"13263","name":"Saad Ahmad"},{"tanzeem":"Khuddam","majlis":"Berg","idNumber":"13303","name":"Yahya Rashid"},{"tanzeem":"Atfal","majlis":"Berg","idNumber":"13111","name":"Rahil Usman"},{"tanzeem":"Atfal","majlis":"Berg","idNumber":"13110","name":"Numan Faisal"},{"tanzeem":"Atfal","majlis":"Berg","idNumber":"13150","name":"Rameen Rashid"},{"tanzeem":"Atfal","majlis":"Berg","idNumber":"13190","name":"Rayaan Sohail"},{"tanzeem":"Atfal","majlis":"Berg","idNumber":"13230","name":"Shameer Irfan"},{"tanzeem":"Atfal","majlis":"Berg","idNumber":"13229","name":"Faizan Karim"},{"tanzeem":"Atfal","majlis":"Berg","idNumber":"13269","name":"Yusuf Ahmad"},{"tanzeem":"Atfal","majlis":"Berg","idNumber":"13309","name":"Ayan Malik"},{"tanzeem":"Atfal","majlis":"Berg","idNumber":"13308","name":"Haris Iqbal"},{"tanzeem":"Atfal","majlis":"Berg","idNumber":"13348","name":"Aariz Latif"},{"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"13403","name":"Mansoor Ali"},{"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"13443","name":"Salman Tariq"},{"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"13483","name":"Ahsan Mirza"},{"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"13482","name":"Irfan Ashraf"},{"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"13522","name":"Ahmad Khan"},{"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"13562","name":"Bilal Siddiqi"},{"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"13561","name":"Sajid Ilyas"},{"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"13601","name":"Yasir Latif"},{"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"13641","name":"Zubair Aslam"},{"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"13681","name":"Waseem Hanif"},{"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"13489","name":"Zaryab Salman"},{"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"13529","name":"Kashan Hamid"},{"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"13528","name":"Rafay Asghar"},{"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"13568","name":"Burhan Rafiq"},{"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"13608","name":"Ali Raza"},{"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"13607","name":"Huzaifa Malik"},{"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"13647","name":"Rayyan Iqbal"},{"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"13687","name":"Ammar Faisal"},{"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"13727","name":"Arham Siddiqui"},{"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"13726","name":"Shayan Khalid"},{"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"13534","name":"Aatif Hamid"},{"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"13574","name":"Areeb Danish"},{"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"13614","name":"Ramees Waseem"},{"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"13654","name":"Aqeel Junaid"},{"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"13653","name":"Ilyas Tariq"},{"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"13693","name":"Isa Rehman"},{"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"13733","name":"Samee Ullah"},{"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"13773","name":"Hanzala Noman"},{"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"13772","name":"Azlan Javed"},{"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"13812","name":"Ehan Hussain"},{"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"13869","name":"Hasnain Qadir"},{"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"13909","name":"Shakir Rauf"},{"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"13908","name":"Rashid Mahmood"},{"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"13948","name":"Naeem Akhtar"},{"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"13988","name":"Farooq Ahmed"},{"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"14028","name":"Hamid Raza"},{"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"14027","name":"Sohail Anwar"},{"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"14067","name":"Shahid Rafiq"},{"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"14107","name":"Sami Ullah"},{"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"14106","name":"Arif Chaudhry"},{"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"13955","name":"Fahim Zahid"},{"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"13954","name":"Shazil Akbar"},{"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"13994","name":"Umar Farooq"},{"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"14034","name":"Musa Tariq"},{"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"14033","name":"Ibrahim Nadeem"},{"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"14073","name":"Sufyan Javed"},{"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"14113","name":"Ayaan Rahman"},{"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"14153","name":"Hammad Anwar"},{"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"14152","name":"Taha Mehmood"},{"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"14192","name":"Hashir Noman"},{"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"14000","name":"Zohair Naveed"},{"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"14040","name":"Adam Khan"},{"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"14080","name":"Mikail Raza"},{"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"14079","name":"Rafi Ahmed"},{"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"14119","name":"Zayd Qasim"},{"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"14159","name":"Reyan Farooq"},{"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"14199","name":"Dawood Bashir"},{"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"14198","name":"Sarim Rauf"},{"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"14238","name":"Aahil Nadeem"},{"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"14278","name":"Huzaib Arif"},{"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"14337","name":"Tariq Mehmood"},{"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"14336","name":"Khalid Hussain"},{"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"14376","name":"Imran Qureshi"},{"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"14416","name":"Noman Javed"},{"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"14456","name":"Adnan Bashir"},{"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"14455","name":"Owais Malik"},{"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"14495","name":"Adeel Rehman"},{"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"14535","name":"Qasim Iqbal"},{"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"14534","name":"Asif Nawaz"},{"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"14574","name":"Usman Ghani"},{"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"14382","name":"Zain ul Abideen"},{"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"14422","name":"Saad Ahmad"},{"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"14462","name":"Yahya Rashid"},{"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"14461","name":"Talha Qasim"},{"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"14501","name":"Mubashir Asif"},{"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"14541","name":"Rayan Bashir"},{"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"14581","name":"Maaz Yousuf"},{"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"14580","name":"Daniyal Farhan"},{"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"14620","name":"Arsalan Junaid"},{"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"14660","name":"Faris Omer"},{"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"14468","name":"Ayan Malik"},{"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"14508","name":"Haris Iqbal"},{"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"14507","name":"Aariz Latif"},{"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"14547","name":"Shayan Ali"},{"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"14587","name":"Sarmad Asif"},{"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"14627","name":"Taim Noor"},{"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"14626","name":"Rameez Sami"},{"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"14666","name":"Zavian Akhtar"},{"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"14706","name":"Saif Mahmood"},{"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"14746","name":"Nahil Qadir"},{"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"14766","name":"Yasir Latif"},{"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"14806","name":"Zubair Aslam"},{"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"14846","name":"Waseem Hanif"},{"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"14845","name":"Nadeem Yousaf"},{"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"14885","name":"Fahad Nisar"},{"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"14925","name":"Danish Parvez"},{"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"14965","name":"Rizwan Karim"},{"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"14964","name":"Junaid Zahid"},{"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"15004","name":"Mudassar Iqbal"},{"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"15044","name":"Saqib Munir"},{"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"14852","name":"Ammar Faisal"},{"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"14892","name":"Arham Siddiqui"},{"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"14891","name":"Shayan Khalid"},{"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"14931","name":"Eesa Latif"},{"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"14971","name":"Abdullah Sami"},{"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"15011","name":"Ahsan Waqas"},{"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"15010","name":"Haider Imtiaz"},{"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"15050","name":"Jawad Nadeem"},{"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"15090","name":"Sameer Adil"},{"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"15130","name":"Zohaib Tariq"},{"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"14938","name":"Hanzala Noman"},{"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"14937","name":"Azlan Javed"},{"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"14977","name":"Ehan Hussain"},{"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"15017","name":"Kiyan Imran"},{"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"15057","name":"Rahil Usman"},{"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"15056","name":"Numan Faisal"},{"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"15096","name":"Rameen Rashid"},{"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"15136","name":"Rayaan Sohail"},{"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"15176","name":"Shameer Irfan"},{"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"15175","name":"Faizan Karim"},{"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"15238","name":"Shahid Rafiq"},{"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"15278","name":"Sami Ullah"},{"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"15277","name":"Arif Chaudhry"},{"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"15317","name":"Naveed Asghar"},{"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"15357","name":"Mansoor Ali"},{"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"15397","name":"Salman Tariq"},{"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"15396","name":"Ahsan Mirza"},{"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"15436","name":"Irfan Ashraf"},{"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"15476","name":"Ahmad Khan"},{"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"15516","name":"Bilal Siddiqi"},{"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"15324","name":"Hammad Anwar"},{"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"15323","name":"Taha Mehmood"},{"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"15363","name":"Hashir Noman"},{"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"15403","name":"Subhan Nisar"},{"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"15443","name":"Zaryab Salman"},{"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"15442","name":"Kashan Hamid"},{"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"15482","name":"Rafay Asghar"},{"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"15522","name":"Burhan Rafiq"},{"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"15521","name":"Ali Raza"},{"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"15561","name":"Huzaifa Malik"},{"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"15369","name":"Sarim Rauf"},{"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"15409","name":"Aahil Nadeem"},{"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"15449","name":"Huzaib Arif"},{"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"15448","name":"Sahil Parvez"},{"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"15488","name":"Aatif Hamid"},{"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"15528","name":"Areeb Danish"},{"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"15568","name":"Ramees Waseem"},{"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"15567","name":"Aqeel Junaid"},{"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"15607","name":"Ilyas Tariq"},{"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"15647","name":"Isa Rehman"},{"tanzeem":"Ansar","majlis":"Hausen","idNumber":"15712","name":"Qasim Iqbal"},{"tanzeem":"Ansar","majlis":"Hausen","idNumber":"15711","name":"Asif Nawaz"},{"tanzeem":"Ansar","majlis":"Hausen","idNumber":"15751","name":"Usman Ghani"},{"tanzeem":"Ansar","majlis":"Hausen","idNumber":"15791","name":"Faisal Latif"},{"tanzeem":"Ansar","majlis":"Hausen","idNumber":"15790","name":"Hasnain Qadir"},{"tanzeem":"Ansar","majlis":"Hausen","idNumber":"15830","name":"Shakir Rauf"},{"tanzeem":"Ansar","majlis":"Hausen","idNumber":"15870","name":"Rashid Mahmood"},{"tanzeem":"Ansar","majlis":"Hausen","idNumber":"15910","name":"Naeem Akhtar"},{"tanzeem":"Ansar","majlis":"Hausen","idNumber":"15909","name":"Farooq Ahmed"},{"tanzeem":"Ansar","majlis":"Hausen","idNumber":"15949","name":"Hamid Raza"},{"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"15757","name":"Daniyal Farhan"},{"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"15797","name":"Arsalan Junaid"},{"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"15837","name":"Faris Omer"},{"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"15836","name":"Moin Uddin"},{"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"15876","name":"Fahim Zahid"},{"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"15916","name":"Shazil Akbar"},{"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"15956","name":"Umar Farooq"},{"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"15955","name":"Musa Tariq"},{"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"15995","name":"Ibrahim Nadeem"},{"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"16035","name":"Sufyan Javed"},{"tanzeem":"Atfal","majlis":"Hausen","idNumber":"15843","name":"Zavian Akhtar"},{"tanzeem":"Atfal","majlis":"Hausen","idNumber":"15883","name":"Saif Mahmood"},{"tanzeem":"Atfal","majlis":"Hausen","idNumber":"15882","name":"Nahil Qadir"},{"tanzeem":"Atfal","majlis":"Hausen","idNumber":"15922","name":"Fawad Munir"},{"tanzeem":"Atfal","majlis":"Hausen","idNumber":"15962","name":"Zohair Naveed"},{"tanzeem":"Atfal","majlis":"Hausen","idNumber":"16002","name":"Adam Khan"},{"tanzeem":"Atfal","majlis":"Hausen","idNumber":"16001","name":"Mikail Raza"},{"tanzeem":"Atfal","majlis":"Hausen","idNumber":"16041","name":"Rafi Ahmed"},{"tanzeem":"Atfal","majlis":"Hausen","idNumber":"16081","name":"Zayd Qasim"},{"tanzeem":"Atfal","majlis":"Hausen","idNumber":"16080","name":"Reyan Farooq"},{"tanzeem":"Ansar","majlis":"Höchst","idNumber":"16147","name":"Junaid Zahid"},{"tanzeem":"Ansar","majlis":"Höchst","idNumber":"16187","name":"Mudassar Iqbal"},{"tanzeem":"Ansar","majlis":"Höchst","idNumber":"16227","name":"Saqib Munir"},{"tanzeem":"Ansar","majlis":"Höchst","idNumber":"16226","name":"Atif Shabbir"},{"tanzeem":"Ansar","majlis":"Höchst","idNumber":"16266","name":"Tariq Mehmood"},{"tanzeem":"Ansar","majlis":"Höchst","idNumber":"16306","name":"Khalid Hussain"},{"tanzeem":"Ansar","majlis":"Höchst","idNumber":"16305","name":"Imran Qureshi"},{"tanzeem":"Ansar","majlis":"Höchst","idNumber":"16345","name":"Noman Javed"},{"tanzeem":"Ansar","majlis":"Höchst","idNumber":"16385","name":"Adnan Bashir"},{"tanzeem":"Ansar","majlis":"Höchst","idNumber":"16425","name":"Owais Malik"},{"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"16233","name":"Jawad Nadeem"},{"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"16232","name":"Sameer Adil"},{"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"16272","name":"Zohaib Tariq"},{"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"16312","name":"Hamza Khan"},{"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"16352","name":"Zain ul Abideen"},{"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"16351","name":"Saad Ahmad"},{"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"16391","name":"Yahya Rashid"},{"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"16431","name":"Talha Qasim"},{"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"16471","name":"Mubashir Asif"},{"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"16470","name":"Rayan Bashir"},{"tanzeem":"Atfal","majlis":"Höchst","idNumber":"16278","name":"Rayaan Sohail"},{"tanzeem":"Atfal","majlis":"Höchst","idNumber":"16318","name":"Shameer Irfan"},{"tanzeem":"Atfal","majlis":"Höchst","idNumber":"16358","name":"Faizan Karim"},{"tanzeem":"Atfal","majlis":"Höchst","idNumber":"16398","name":"Yusuf Ahmad"},{"tanzeem":"Atfal","majlis":"Höchst","idNumber":"16397","name":"Ayan Malik"},{"tanzeem":"Atfal","majlis":"Höchst","idNumber":"16437","name":"Haris Iqbal"},{"tanzeem":"Atfal","majlis":"Höchst","idNumber":"16477","name":"Aariz Latif"},{"tanzeem":"Atfal","majlis":"Höchst","idNumber":"16517","name":"Shayan Ali"},{"tanzeem":"Atfal","majlis":"Höchst","idNumber":"16516","name":"Sarmad Asif"},{"tanzeem":"Atfal","majlis":"Höchst","idNumber":"16556","name":"Taim Noor"},{"tanzeem":"Ansar","majlis":"Nied","idNumber":"16625","name":"Irfan Ashraf"},{"tanzeem":"Ansar","majlis":"Nied","idNumber":"16624","name":"Ahmad Khan"},{"tanzeem":"Ansar","majlis":"Nied","idNumber":"16664","name":"Bilal Siddiqi"},{"tanzeem":"Ansar","majlis":"Nied","idNumber":"16704","name":"Sajid Ilyas"},{"tanzeem":"Ansar","majlis":"Nied","idNumber":"16703","name":"Yasir Latif"},{"tanzeem":"Ansar","majlis":"Nied","idNumber":"16743","name":"Zubair Aslam"},{"tanzeem":"Ansar","majlis":"Nied","idNumber":"16783","name":"Waseem Hanif"},{"tanzeem":"Ansar","majlis":"Nied","idNumber":"16823","name":"Nadeem Yousaf"},{"tanzeem":"Ansar","majlis":"Nied","idNumber":"16822","name":"Fahad Nisar"},{"tanzeem":"Ansar","majlis":"Nied","idNumber":"16862","name":"Danish Parvez"},{"tanzeem":"Khuddam","majlis":"Nied","idNumber":"16670","name":"Burhan Rafiq"},{"tanzeem":"Khuddam","majlis":"Nied","idNumber":"16710","name":"Ali Raza"},{"tanzeem":"Khuddam","majlis":"Nied","idNumber":"16750","name":"Huzaifa Malik"},{"tanzeem":"Khuddam","majlis":"Nied","idNumber":"16749","name":"Rayyan Iqbal"},{"tanzeem":"Khuddam","majlis":"Nied","idNumber":"16789","name":"Ammar Faisal"},{"tanzeem":"Khuddam","majlis":"Nied","idNumber":"16829","name":"Arham Siddiqui"},{"tanzeem":"Khuddam","majlis":"Nied","idNumber":"16869","name":"Shayan Khalid"},{"tanzeem":"Khuddam","majlis":"Nied","idNumber":"16868","name":"Eesa Latif"},{"tanzeem":"Khuddam","majlis":"Nied","idNumber":"16908","name":"Abdullah Sami"},{"tanzeem":"Khuddam","majlis":"Nied","idNumber":"16948","name":"Ahsan Waqas"},{"tanzeem":"Atfal","majlis":"Nied","idNumber":"16756","name":"Aqeel Junaid"},{"tanzeem":"Atfal","majlis":"Nied","idNumber":"16796","name":"Ilyas Tariq"},{"tanzeem":"Atfal","majlis":"Nied","idNumber":"16795","name":"Isa Rehman"},{"tanzeem":"Atfal","majlis":"Nied","idNumber":"16835","name":"Samee Ullah"},{"tanzeem":"Atfal","majlis":"Nied","idNumber":"16875","name":"Hanzala Noman"},{"tanzeem":"Atfal","majlis":"Nied","idNumber":"16915","name":"Azlan Javed"},{"tanzeem":"Atfal","majlis":"Nied","idNumber":"16914","name":"Ehan Hussain"},{"tanzeem":"Atfal","majlis":"Nied","idNumber":"16954","name":"Kiyan Imran"},{"tanzeem":"Atfal","majlis":"Nied","idNumber":"16994","name":"Rahil Usman"},{"tanzeem":"Atfal","majlis":"Nied","idNumber":"16993","name":"Numan Faisal"},{"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"17064","name":"Naeem Akhtar"},{"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"17104","name":"Farooq Ahmed"},{"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"17103","name":"Hamid Raza"},{"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"17143","name":"Sohail Anwar"},{"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"17183","name":"Shahid Rafiq"},{"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"17223","name":"Sami Ullah"},{"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"17222","name":"Arif Chaudhry"},{"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"17262","name":"Naveed Asghar"},{"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"17302","name":"Mansoor Ali"},{"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"17342","name":"Salman Tariq"},{"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"17150","name":"Musa Tariq"},{"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"17149","name":"Ibrahim Nadeem"},{"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"17189","name":"Sufyan Javed"},{"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"17229","name":"Ayaan Rahman"},{"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"17269","name":"Hammad Anwar"},{"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"17268","name":"Taha Mehmood"},{"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"17308","name":"Hashir Noman"},{"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"17348","name":"Subhan Nisar"},{"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"17388","name":"Zaryab Salman"},{"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"17387","name":"Kashan Hamid"},{"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"17195","name":"Rafi Ahmed"},{"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"17235","name":"Zayd Qasim"},{"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"17275","name":"Reyan Farooq"},{"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"17315","name":"Dawood Bashir"},{"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"17314","name":"Sarim Rauf"},{"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"17354","name":"Aahil Nadeem"},{"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"17394","name":"Huzaib Arif"},{"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"17393","name":"Sahil Parvez"},{"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"17433","name":"Aatif Hamid"},{"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"17473","name":"Areeb Danish"},{"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"17505","name":"Noman Javed"},{"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"17545","name":"Adnan Bashir"},{"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"17585","name":"Owais Malik"},{"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"17625","name":"Adeel Rehman"},{"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"17624","name":"Qasim Iqbal"},{"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"17664","name":"Asif Nawaz"},{"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"17704","name":"Usman Ghani"},{"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"17703","name":"Faisal Latif"},{"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"17743","name":"Hasnain Qadir"},{"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"17783","name":"Shakir Rauf"},{"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"17591","name":"Talha Qasim"},{"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"17631","name":"Mubashir Asif"},{"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"17671","name":"Rayan Bashir"},{"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"17670","name":"Maaz Yousuf"},{"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"17710","name":"Daniyal Farhan"},{"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"17750","name":"Arsalan Junaid"},{"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"17749","name":"Faris Omer"},{"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"17789","name":"Moin Uddin"},{"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"17829","name":"Fahim Zahid"},{"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"17869","name":"Shazil Akbar"},{"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"17677","name":"Shayan Ali"},{"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"17676","name":"Sarmad Asif"},{"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"17716","name":"Taim Noor"},{"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"17756","name":"Rameez Sami"},{"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"17796","name":"Zavian Akhtar"},{"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"17795","name":"Saif Mahmood"},{"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"17835","name":"Nahil Qadir"},{"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"17875","name":"Fawad Munir"},{"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"17915","name":"Zohair Naveed"},{"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"17914","name":"Adam Khan"},{"tanzeem":"Ansar","majlis":"Riedberg","idNumber":"17989","name":"Nadeem Yousaf"},{"tanzeem":"Ansar","majlis":"Riedberg","idNumber":"17988","name":"Fahad Nisar"},{"tanzeem":"Ansar","majlis":"Riedberg","idNumber":"18028","name":"Danish Parvez"},{"tanzeem":"Ansar","majlis":"Riedberg","idNumber":"18068","name":"Rizwan Karim"},{"tanzeem":"Ansar","majlis":"Riedberg","idNumber":"18108","name":"Junaid Zahid"},{"tanzeem":"Ansar","majlis":"Riedberg","idNumber":"18107","name":"Mudassar Iqbal"},{"tanzeem":"Ansar","majlis":"Riedberg","idNumber":"18147","name":"Saqib Munir"},{"tanzeem":"Ansar","majlis":"Riedberg","idNumber":"18187","name":"Atif Shabbir"},{"tanzeem":"Ansar","majlis":"Riedberg","idNumber":"18227","name":"Tariq Mehmood"},{"tanzeem":"Ansar","majlis":"Riedberg","idNumber":"18226","name":"Khalid Hussain"},{"tanzeem":"Khuddam","majlis":"Riedberg","idNumber":"18034","name":"Eesa Latif"},{"tanzeem":"Khuddam","majlis":"Riedberg","idNumber":"18074","name":"Abdullah Sami"},{"tanzeem":"Khuddam","majlis":"Riedberg","idNumber":"18114","name":"Ahsan Waqas"},{"tanzeem":"Khuddam","majlis":"Riedberg","idNumber":"18154","name":"Haider Imtiaz"},{"tanzeem":"Khuddam","majlis":"Riedberg","idNumber":"18153","name":"Jawad Nadeem"},{"tanzeem":"Khuddam","majlis":"Riedberg","idNumber":"18193","name":"Sameer Adil"},{"tanzeem":"Khuddam","majlis":"Riedberg","idNumber":"18233","name":"Zohaib Tariq"},{"tanzeem":"Khuddam","majlis":"Riedberg","idNumber":"18273","name":"Hamza Khan"},{"tanzeem":"Khuddam","majlis":"Riedberg","idNumber":"18272","name":"Zain ul Abideen"},{"tanzeem":"Khuddam","majlis":"Riedberg","idNumber":"18312","name":"Saad Ahmad"},{"tanzeem":"Atfal","majlis":"Riedberg","idNumber":"18120","name":"Kiyan Imran"},{"tanzeem":"Atfal","majlis":"Riedberg","idNumber":"18160","name":"Rahil Usman"},{"tanzeem":"Atfal","majlis":"Riedberg","idNumber":"18200","name":"Numan Faisal"},{"tanzeem":"Atfal","majlis":"Riedberg","idNumber":"18199","name":"Rameen Rashid"},{"tanzeem":"Atfal","majlis":"Riedberg","idNumber":"18239","name":"Rayaan Sohail"},{"tanzeem":"Atfal","majlis":"Riedberg","idNumber":"18279","name":"Shameer Irfan"},{"tanzeem":"Atfal","majlis":"Riedberg","idNumber":"18278","name":"Faizan Karim"},{"tanzeem":"Atfal","majlis":"Riedberg","idNumber":"18318","name":"Yusuf Ahmad"},{"tanzeem":"Atfal","majlis":"Riedberg","idNumber":"18358","name":"Ayan Malik"},{"tanzeem":"Atfal","majlis":"Riedberg","idNumber":"18398","name":"Haris Iqbal"},{"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"18434","name":"Naveed Asghar"},{"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"18474","name":"Mansoor Ali"},{"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"18473","name":"Salman Tariq"},{"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"18513","name":"Ahsan Mirza"},{"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"18553","name":"Irfan Ashraf"},{"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"18593","name":"Ahmad Khan"},{"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"18592","name":"Bilal Siddiqi"},{"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"18632","name":"Sajid Ilyas"},{"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"18672","name":"Yasir Latif"},{"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"18712","name":"Zubair Aslam"},{"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"18520","name":"Subhan Nisar"},{"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"18519","name":"Zaryab Salman"},{"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"18559","name":"Kashan Hamid"},{"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"18599","name":"Rafay Asghar"},{"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"18639","name":"Burhan Rafiq"},{"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"18638","name":"Ali Raza"},{"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"18678","name":"Huzaifa Malik"},{"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"18718","name":"Rayyan Iqbal"},{"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"18758","name":"Ammar Faisal"},{"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"18757","name":"Arham Siddiqui"},{"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"18565","name":"Sahil Parvez"},{"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"18605","name":"Aatif Hamid"},{"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"18645","name":"Areeb Danish"},{"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"18685","name":"Ramees Waseem"},{"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"18684","name":"Aqeel Junaid"},{"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"18724","name":"Ilyas Tariq"},{"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"18764","name":"Isa Rehman"},{"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"18763","name":"Samee Ullah"},{"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"18803","name":"Hanzala Noman"},{"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"18843","name":"Azlan Javed"},{"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"18881","name":"Faisal Latif"},{"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"18921","name":"Hasnain Qadir"},{"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"18961","name":"Shakir Rauf"},{"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"18960","name":"Rashid Mahmood"},{"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"19000","name":"Naeem Akhtar"},{"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"19040","name":"Farooq Ahmed"},{"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"19080","name":"Hamid Raza"},{"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"19079","name":"Sohail Anwar"},{"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"19119","name":"Shahid Rafiq"},{"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"19159","name":"Sami Ullah"},{"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"18967","name":"Moin Uddin"},{"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"19007","name":"Fahim Zahid"},{"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"19006","name":"Shazil Akbar"},{"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"19046","name":"Umar Farooq"},{"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"19086","name":"Musa Tariq"},{"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"19126","name":"Ibrahim Nadeem"},{"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"19125","name":"Sufyan Javed"},{"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"19165","name":"Ayaan Rahman"},{"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"19205","name":"Hammad Anwar"},{"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"19245","name":"Taha Mehmood"},{"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"19053","name":"Fawad Munir"},{"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"19052","name":"Zohair Naveed"},{"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"19092","name":"Adam Khan"},{"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"19132","name":"Mikail Raza"},{"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"19172","name":"Rafi Ahmed"},{"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"19171","name":"Zayd Qasim"},{"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"19211","name":"Reyan Farooq"},{"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"19251","name":"Dawood Bashir"},{"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"19250","name":"Sarim Rauf"},{"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"19290","name":"Aahil Nadeem"}].map((entry) => ({
  //tanzeem: String(entry.tanzeem || '').trim().toLowerCase(),
  //majlis: String(entry.majlis || '').trim(),
  //idNumber: String(entry.idNumber || '').trim(),
  //name: String(entry.name || '').trim(),
//}));


const TAB_ITEMS = [
  { key: 'gebetsplan', label: 'Gebetszeiten' },
  { key: 'terminal', label: 'Anwesenheit' },
  { key: 'stats', label: 'Stats' },
  { key: 'settings', label: '⚙️' },
];



const ADMIN_ACCOUNTS_COLLECTION = 'admin_accounts_global';
const ADMIN_EXTERNAL_ACCOUNTS_COLLECTION = 'admin_accounts_external';
const EXTERNAL_CONFIG_COLLECTION = 'external_guest_configs';
const SUPER_ADMIN_NAME = 'admin';
const SUPER_ADMIN_DEFAULT_PASSWORD = '1234';
const DEFAULT_ACCOUNT_PERMISSIONS = {
  canEditSettings: false,
  canViewIdStats: false,
  canExportData: false,
};
const allPermissionsEnabled = () => ({ canEditSettings: true, canViewIdStats: true, canExportData: true });
const allGuestPermissionsEnabled = () => ({ canEditSettings: true, canViewIdStats: true, canExportData: true });
const hashLocalPassword = async (password, nameKey) => Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  `${String(nameKey || '').toLowerCase()}::${String(password || '')}`,
);
const isAuthConfigurationError = (error) => {
  const code = String(error?.code || '');
  return code.includes('auth/configuration-not-found') || code.includes('auth/operation-not-allowed');
};
const normalizeAccountNameKey = (name) => String(name || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-äöüß]/gi, '');
const buildAccountAuthEmail = (name) => {
  const key = normalizeAccountNameKey(name);
  return `${key || 'user'}@tasbeeh.local`;
};

const normalizeAnnouncementText = (text) => String(text || '').replace(/\r\n/g, '\n').trim();

const parseFormattedSegments = (text) => {
  const source = String(text || '');
  if (!source) return [];
  const segments = [];
  const formatPattern = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;
  let lastIndex = 0;
  let match = formatPattern.exec(source);

  while (match) {
    const token = String(match[0] || '');
    const tokenStart = match.index;
    const tokenEnd = tokenStart + token.length;
    if (tokenStart > lastIndex) {
      segments.push({ text: source.slice(lastIndex, tokenStart), style: 'plain' });
    }

    const marker = token[0];
    const content = token.slice(1, -1);
    if (!content) {
      segments.push({ text: token, style: 'plain' });
    } else if (marker === '*') {
      segments.push({ text: content, style: 'bold' });
    } else if (marker === '_') {
      segments.push({ text: content, style: 'italic' });
    } else if (marker === '~') {
      segments.push({ text: content, style: 'strike' });
    } else {
      segments.push({ text: token, style: 'plain' });
    }

    lastIndex = tokenEnd;
    match = formatPattern.exec(source);
  }

  if (lastIndex < source.length) {
    segments.push({ text: source.slice(lastIndex), style: 'plain' });
  }

  return segments;
};
const parseAnnouncementSegments = (text) => parseFormattedSegments(text);
const normalizeHeadlineText = (value) => String(value || '').trim();
const buildHeadlineConfig = (source) => ({
  title: normalizeHeadlineText(source?.title ?? source?.name ?? ''),
  subtitle: normalizeHeadlineText(source?.subtitle || ''),
  extraLine: normalizeHeadlineText(source?.extraLine || ''),
});
const headlineToLegacyName = (headline) => normalizeHeadlineText(headline?.title || '');

const PRAYER_LABELS = {
  fajr: 'Fajr',
  sohar: 'Sohar',
  asr: 'Asr',
  maghrib: 'Maghrib',
  ishaa: 'Ishaa',
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
  roedelheim: 'Rödelheim',
  zeilsheim: 'Zeilsheim',
};

const PRIVACY_POLICY_SECTIONS = [
  {
    title: '1. Gegenstand der Verarbeitung',
    paragraphs: [
      'Im Rahmen der Nutzung dieser App werden bereits bestehende Mitgliedsdaten verarbeitet. Hierzu gehören insbesondere:',
      'Die Mitglieds-IDs bestehen unabhängig von dieser App und wurden nicht durch diese neu erzeugt.',
    ],
    bullets: [
      '**Mitglieds-ID** (bereits bestehende Registrierungsnummer)',
      'Name (sofern im System hinterlegt)',
      'Zuordnung zu Majlis und Tanzeem',
      'Anwesenheits- bzw. Teilnahmeeinträge',
    ],
  },
  {
    title: '2. Zweck der Datenverarbeitung',
    paragraphs: [
      'Die Verarbeitung erfolgt ausschließlich zur:',
      'Eine Nutzung der Daten zu anderen Zwecken erfolgt nicht.',
    ],
    bullets: [
      'eindeutigen Zuordnung von Mitgliedern',
      'Vermeidung von Doppeleinträgen',
      'internen organisatorischen Dokumentation (z. B. Anwesenheit)',
      'statistischen Auswertung im Rahmen der jeweiligen Veranstaltung oder Funktion',
    ],
  },
  {
    title: '3. Rechtsgrundlage',
    paragraphs: [
      'Die Verarbeitung erfolgt auf Grundlage von:',
      '**Art. 6 Abs. 1 lit. a DSGVO** (**Einwilligung**), da die Nutzung der App sowie die Eingabe der Daten freiwillig erfolgt.',
      'Alternativ – sofern organisatorisch einschlägig – kann die Verarbeitung auch auf Grundlage von:',
      '**Art. 6 Abs. 1 lit. f DSGVO** (**berechtigtes Interesse**) erfolgen, wobei das berechtigte Interesse in der strukturierten und effizienten internen Organisation besteht.',
    ],
  },
  {
    title: '4. Freiwilligkeit',
    paragraphs: [
      'Die Nutzung der App und die Eingabe der Mitgliedsdaten erfolgen freiwillig.',
      'Es entstehen keine Nachteile bei Nichtnutzung.',
    ],
  },
  {
    title: '5. Speicherung und Sicherheit',
    paragraphs: [
      'Die Daten werden in einer Cloud-Datenbank gespeichert, konkret in Firestore (Google Firebase).',
      'Die Speicherung erfolgt auf Servern von Google (im Rahmen von Google Firebase).',
      'Die Datenübertragung erfolgt verschlüsselt (**HTTPS/TLS**).',
      'Es werden angemessene technische und organisatorische Maßnahmen gemäß Art. 32 DSGVO getroffen, um die Sicherheit der Daten zu gewährleisten.',
      'Es werden ausschließlich diejenigen personenbezogenen Daten verarbeitet, die für die jeweilige Funktion zwingend erforderlich sind. Eine weitergehende Profilbildung oder automatisierte Entscheidungsfindung findet nicht statt.',
      'Die Daten werden nur so lange gespeichert, wie dies für den jeweiligen Verarbeitungszweck erforderlich ist. Nicht mehr benötigte Daten werden regelmäßig gelöscht oder anonymisiert.',
    ],
  },
  {
    title: '6. Betroffenenrechte',
    paragraphs: [
      'Betroffene Personen haben das Recht auf:',
      'Ein Widerruf einer erteilten Einwilligung ist jederzeit möglich.',
    ],
    bullets: [
      'Auskunft (Art. 15 DSGVO)',
      'Berichtigung (Art. 16 DSGVO)',
      'Löschung (Art. 17 DSGVO)',
      'Einschränkung der Verarbeitung (Art. 18 DSGVO)',
      'Widerspruch (Art. 21 DSGVO)',
      'Datenübertragbarkeit (Art. 20 DSGVO)',
    ],
  },
];

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
  fajr: '05:20',
  sohar: '14:00',
  asr: '17:30',
  maghrib: '21:50',
  ishaa: '21:50',
  jumma: '13:15',
};

const PRAYER_OVERRIDE_COLLECTION = 'prayer_time_overrides';
const PRAYER_OVERRIDE_GLOBAL_DOC_ID = 'global';
const PRAYER_OVERRIDE_PENDING_DOC_ID = 'pending_next_day';
const ANNOUNCEMENT_COLLECTION = 'prayer_announcements';
const ANNOUNCEMENT_DOC_ID = 'current';
const PROGRAM_ATTENDANCE_COLLECTION = 'attendance_program_entries';
const PROGRAM_DAILY_COLLECTION = 'attendance_program_daily';
const PROGRAM_DAILY_COLLECTION_LEGACY = 'attendance_programm_daily';
const PROGRAM_CONFIG_COLLECTION = 'program_configs';
const REGISTRATION_ATTENDANCE_COLLECTION = 'attendance_registration_entries';
const REGISTRATION_DAILY_COLLECTION = 'attendance_registration_daily';
const REGISTRATION_CONFIG_COLLECTION = 'registration_configs';
const TERMINAL_INACTIVITY_CONFIG_COLLECTION = 'terminal_inactivity_configs';
const TERMINAL_INACTIVITY_CONFIG_DOC_ID = 'default';
const EXTERNAL_SCOPE_PURGE_BASE_COLLECTIONS = [
  PRAYER_OVERRIDE_COLLECTION,
  ANNOUNCEMENT_COLLECTION,
  PROGRAM_CONFIG_COLLECTION,
  REGISTRATION_CONFIG_COLLECTION,
  'attendance_daily',
  PROGRAM_DAILY_COLLECTION,
  PROGRAM_DAILY_COLLECTION_LEGACY,
  REGISTRATION_DAILY_COLLECTION,
  MEMBER_DIRECTORY_COLLECTION,
  PROGRAM_ATTENDANCE_COLLECTION,
  REGISTRATION_ATTENDANCE_COLLECTION,
];
const INTERNAL_RESET_CATEGORIES = [
  {
    key: 'prayer',
    label: 'Gebetsdaten',
    collections: ['attendance_daily', MEMBER_DIRECTORY_COLLECTION],
  },
  {
    key: 'program',
    label: 'Programmdaten',
    collections: [PROGRAM_CONFIG_COLLECTION, PROGRAM_DAILY_COLLECTION, PROGRAM_DAILY_COLLECTION_LEGACY, PROGRAM_ATTENDANCE_COLLECTION],
  },
  {
    key: 'registration',
    label: 'Anmeldedaten',
    collections: [REGISTRATION_CONFIG_COLLECTION, REGISTRATION_DAILY_COLLECTION, REGISTRATION_ATTENDANCE_COLLECTION],
  },
  {
    key: 'qr',
    label: 'QR-Geräte',
    collections: [QR_REGISTRATION_COLLECTION],
  },
];
const SHOW_MEMBER_NAMES_IN_ID_GRID = false;
const STORE_MEMBER_NAMES_IN_DB = false;
// EXTERNAL MEMBER DIRECTORY DATA - EDIT HERE
//const EXTERNAL_MEMBER_DIRECTORY_DATA = [{ amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: 'Test', idNumber: '99999', name: 'Ahmad Khan' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: 'Test', idNumber: '99998', name: 'Ali Raza' }, { amarat: 'bad schwalbach', tanzeem: 'Atfal', majlis: '-', idNumber: '99997', name: 'Zaid Ahmad' }].map((entry) => ({ amarat: normalizeAccountNameKey(entry.amarat || ''), tanzeem: String(entry.tanzeem || '').trim().toLowerCase(), majlis: String(entry.majlis || '').trim(), idNumber: String(entry.idNumber || '').trim(), name: String(entry.name || '').trim(), }));
const EXTERNAL_MEMBER_DIRECTORY_DATA = [{ amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '54349', name: 'Abdul Wahid' }, { amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '52095', name: 'Atiq ur Rehman' }, { amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '43664', name: 'Ahmad, Mahmood' }, { amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '43643', name: 'Ahmad, Rasheed' }, { amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '44444', name: 'Ahmad, Zubair' }, { amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '35377', name: 'Ahmed, Mirza Abdul Karim' }, { amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '26571', name: 'Ahmed, Rafiq' }, { amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '18860', name: 'Akram, Mohammad' }, { amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '49476', name: 'Cheema, Muhammad Afzal' }, { amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '44641', name: 'Faiz, Ahmad' }, { amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '47025', name: 'Hamayat, Ahmed' }, { amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '48906', name: 'Hunjra, Rafaqat Ali' }, { amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '41667', name: 'Malik Saleem ud Din Ahmad' }, { amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '60056', name: 'Muhammad, Afzaal' }, { amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '35872', name: 'Rana Faheem' }, { amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '49392', name: 'Shad, Abdul Rasheed' }, { amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '43778', name: 'Shad, Abdul Sami' }, { amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '39395', name: 'Sheikh, Omar Sharif' }, { amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '30233', name: 'Ullah, Ehsan' }, { amarat: 'bad schwalbach', tanzeem: 'Ansar', majlis: '-', idNumber: '21479', name: 'Waraich, Basharat Ahmad' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '54016', name: 'Ahmad, Adnan' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '64458', name: 'Ahmad, Faiq' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '58815', name: 'Ahmad, Junaid' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '48407', name: 'Ahmad, Noman' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '42599', name: 'Ahmad, Rashid' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '44612', name: 'Ahmad, Shamshad' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '59748', name: 'Ahmad, Waleed' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '50709', name: 'Ahmad, Shayan' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '50710', name: 'Ahmad, Ayaan' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '39860', name: 'Ahmed, Atiq' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '39861', name: 'Ahmed, Anieq' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '14634', name: 'Ajmal, Zieshan' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '18865', name: 'Akram, Ajmal Chaudhry' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '18864', name: 'Akram, Akmal' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '56837', name: 'Asif, Mahmood' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '47024', name: 'Athwal, Nabi Ahmad' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '45342', name: 'Cheema, Basil Rehan' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '44644', name: 'Faiz, Khurram Ahmad' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '44645', name: 'Faiz, Fateh Ahmad' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '52018', name: 'Ahmad, Afzal' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '66701', name: 'Ali, Ziafat' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '58675', name: 'Khan, Talal' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '42561', name: 'Ahmad, Noor ud Din' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '31377', name: 'Nadeem, Danial' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '53112', name: 'Nagi, Umer Rasheed' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '35875', name: 'Rana Aleim' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '59492', name: 'Rehman, Saqib' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '13705', name: 'Riaz, Shahid' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '51251', name: 'Shad, Abdul Raffay' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '39397', name: 'Sheikh, Shoaib Umar' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '21483', name: 'Waraich, Fraset Ahmad' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '21482', name: 'Waraich, Shojahat Ahmad' }, { amarat: 'bad schwalbach', tanzeem: 'Khuddam', majlis: '-', idNumber: '45258', name: 'Warraich, Wajahat Ibrahim' }, { amarat: 'bad schwalbach', tanzeem: 'Atfal', majlis: '-', idNumber: '50711', name: 'Ahmad, Amaan' }, { amarat: 'bad schwalbach', tanzeem: 'Atfal', majlis: '-', idNumber: '48297', name: 'Malik, Daniyal Ahmad' }, { amarat: 'bad schwalbach', tanzeem: 'Atfal', majlis: '-', idNumber: '56823', name: 'Nagi, Samar Ibrahim' }, { amarat: 'bad schwalbach', tanzeem: 'Atfal', majlis: '-', idNumber: '65036', name: 'Riaz, Haris' }, { amarat: 'bad schwalbach', tanzeem: 'Atfal', majlis: '-', idNumber: '51534', name: 'Shad, Rayasat Ahmad' }, { amarat: 'bad schwalbach', tanzeem: 'Atfal', majlis: '-', idNumber: '51252', name: ', Noor Ul Shammas' }, { amarat: 'bad schwalbach', tanzeem: 'Atfal', majlis: '-', idNumber: '58717', name: 'Sheikh, Muhammad Ibrahim' }, { amarat: 'bad schwalbach', tanzeem: 'Atfal', majlis: '-', idNumber: '43270', name: 'Ullah, Dayan' }].map((entry) => ({ amarat: normalizeAccountNameKey(entry.amarat || ''), tanzeem: String(entry.tanzeem || '').trim().toLowerCase(), majlis: String(entry.majlis || '').trim(), idNumber: String(entry.idNumber || '').trim(), name: String(entry.name || '').trim(), }));


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

const STATS_PRAYER_SEQUENCE = [
  { key: 'fajr', label: 'Fajr' },
  { key: 'sohar', label: 'Sohar' },
  { key: 'asr', label: 'Asr' },
  { key: 'maghrib', label: 'Maghrib' },
  { key: 'ishaa', label: 'Ishaa' },
];
const STATS_TANZEEM_KEYS = ['ansar', 'khuddam', 'atfal'];

const getPrayerCountsForStats = (attendanceData) => {
  const byPrayer = attendanceData?.byPrayer || {};
  return STATS_PRAYER_SEQUENCE.map(({ key, label }) => {
    const prayer = byPrayer[key] || {};
    const guest = Number(prayer.guest) || 0;
    const tanzeemMap = prayer.tanzeem || {};
    const tanzeemTotals = STATS_TANZEEM_KEYS.reduce((acc, tanzeemKey) => {
      const majlisMap = tanzeemMap[tanzeemKey]?.majlis || {};
      const value = Object.values(majlisMap).reduce((sum, count) => sum + (Number(count) || 0), 0);
      acc[tanzeemKey] = value;
      return acc;
    }, {});
    const total = guest + STATS_TANZEEM_KEYS.reduce((sum, keyName) => sum + (tanzeemTotals[keyName] || 0), 0);
    return { key, label, total, tanzeemTotals, guest };
  });
};

const getDailyTotalsForStats = (attendanceData) => {
  const prayers = getPrayerCountsForStats(attendanceData);
  return {
    total: prayers.reduce((sum, row) => sum + (row.total || 0), 0),
    guestTotal: prayers.reduce((sum, row) => sum + (row.guest || 0), 0),
    tanzeemTotals: STATS_TANZEEM_KEYS.reduce((acc, key) => {
      acc[key] = prayers.reduce((sum, row) => sum + (row.tanzeemTotals?.[key] || 0), 0);
      return acc;
    }, {}),
  };
};
const getUniqueGuestTotalForAttendance = (attendanceData) => {
  const explicitUniqueGuestTotal = Number(attendanceData?.guestUniqueTotal);
  if (Number.isFinite(explicitUniqueGuestTotal) && explicitUniqueGuestTotal >= 0) return explicitUniqueGuestTotal;
  const byPrayer = attendanceData?.byPrayer || {};
  return Object.values(byPrayer).reduce((sum, prayerNode) => sum + (Number(prayerNode?.guest) || 0), 0);
};

const buildMajlisRanking = (countsByMajlis = {}) => {
  const allKeys = Array.from(new Set([...Object.keys(MAJLIS_LABELS), ...Object.keys(countsByMajlis || {})])).filter((key) => key !== 'riedberg');
  return allKeys
    .map((key) => [key, Number(countsByMajlis?.[key]) || 0])
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
};

const startOfWeekMonday = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
};

const getLast7Days = (baseDate) => {
  const base = new Date(baseDate);
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, idx) => toISO(addDays(base, idx - 6)));
};

const getWeekIsosMondayToSunday = (baseDate) => {
  const start = startOfWeekMonday(baseDate);
  return Array.from({ length: 7 }, (_, idx) => toISO(addDays(start, idx)));
};

const getISOWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const getLast8Weeks = (baseDate) => {
  const currentWeekStart = startOfWeekMonday(baseDate);
  return Array.from({ length: 4 }, (_, idx) => {
    const start = addDays(currentWeekStart, (idx - 3) * 7);
    const end = addDays(start, 6);
    const weekNumber = getISOWeekNumber(start);
    return {
      startISO: toISO(start),
      endISO: toISO(end),
      weekNumber,
      label: `KW ${weekNumber} (${new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(start)}–${new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(end)})`,
      rangeLabel: `${new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(start)}–${new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(end)}`,
    };
  });
};

const buildDailySeries = (logs, dayIsos) => {
  const counts = dayIsos.reduce((acc, iso) => ({ ...acc, [iso]: 0 }), {});
  logs.forEach((row) => {
    const iso = String(row?.date || '');
    if (counts[iso] !== undefined) counts[iso] += 1;
  });
  return dayIsos.map((iso) => ({ iso, value: counts[iso] || 0 }));
};

const buildWeeklySeries = (logs, weeks) => weeks.map((week) => ({
  ...week,
  value: logs.reduce((sum, row) => {
    const iso = String(row?.date || '');
    return (iso >= week.startISO && iso <= week.endISO) ? (sum + 1) : sum;
  }, 0),
}));

const calculateStatus = (weekTotal, distinctDays) => {
  if (distinctDays < 3) {
    return {
      provisional: true,
      label: 'Status vorläufig – zu wenig Daten',
      detail: null,
    };
  }
  if (weekTotal <= 4) return { provisional: false, label: '🔴 Niedrig' };
  if (weekTotal <= 14) return { provisional: false, label: '🟡 Gut dabei' };
  if (weekTotal <= 29) return { provisional: false, label: '🟢 Sehr gut' };
  return { provisional: false, label: '🟢🟢 Exzellent' };
};

function MiniLineChart({ labels, series, theme, isDarkMode, xAxisTitle = 'Zeitachse', yMaxValue = null, yTickCount = null, pointLabelFormatter = null, useEqualLabelSlots = false }) {
  const [chartWidth, setChartWidth] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const isCompactChart = chartWidth > 0 && chartWidth < 360;
  const chartHeight = isCompactChart ? 320 : 280;
  const plotTop = 18;
  const plotBottom = isCompactChart ? 74 : 52;
  const axisLabelWidth = isCompactChart ? 34 : 42;
  const edgeInset = isCompactChart ? 24 : 28;
  const plotRightPad = (isCompactChart ? 10 : 14) + edgeInset;
  const tickCount = yTickCount || 5;

  const allValues = series.flatMap((line) => line.data.map((value) => Number(value) || 0));
  const maxValueRaw = Math.max(0, ...allValues, Number(yMaxValue) || 0);

  const getNiceStep = (maxValue, ticks) => {
    if (maxValue <= 0) return 1;
    const rough = maxValue / Math.max(1, ticks - 1);
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const normalized = rough / magnitude;
    const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return nice * magnitude;
  };

  const yStep = yMaxValue ? Math.max(1, (Number(yMaxValue) || 1) / Math.max(1, (tickCount - 1))) : getNiceStep(maxValueRaw, tickCount);
  const maxValue = yMaxValue ? Math.max(1, Number(yMaxValue)) : Math.max(yStep * (tickCount - 1), yStep);
  const yTicks = Array.from({ length: tickCount }, (_, index) => maxValue - index * yStep);
  const pointCount = Math.max(2, labels.length);

  const plotLeft = axisLabelWidth + edgeInset;
  const plotWidth = Math.max(1, chartWidth - plotLeft - plotRightPad);
  const plotHeight = chartHeight - plotTop - plotBottom;

  const getX = (index) => plotLeft + (plotWidth * index) / (pointCount - 1);
  const getY = (value) => plotTop + plotHeight - ((Number(value) || 0) / maxValue) * plotHeight;

  useEffect(() => {
    setSelectedPoint(null);
  }, [labels, series]);

  const getPointTooltip = (line, value, index) => {
    if (typeof pointLabelFormatter === 'function') return pointLabelFormatter({ line, value, index, label: labels[index] });
    return `${line.label} · ${labels[index] || `Punkt ${index + 1}`}: ${Number(value) || 0}`;
  };

  return (
    <View style={styles.chartWrap}>
      <Text style={[styles.chartAxisTitleY, { color: theme.muted }]}>Anzahl der Gebete</Text>

      <View
        onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
        style={[styles.chartCanvas, { backgroundColor: theme.bg, borderColor: theme.border, height: chartHeight }]}
      >
        {chartWidth > 0 ? (
          <>
            <View
              style={[
                styles.chartAxisY,
                { left: plotLeft, top: plotTop, height: plotHeight, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(17,24,39,0.28)' },
              ]}
            />
            <View
              style={[
                styles.chartAxisX,
                {
                  left: plotLeft,
                  top: plotTop + plotHeight,
                  width: plotWidth,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(17,24,39,0.28)',
                },
              ]}
            />

            {yTicks.map((tickValue, index) => {
              const y = plotTop + (plotHeight * index) / Math.max(1, tickCount - 1);
              return (
                <View key={`tick_${tickValue}_${index}`}>
                  <View
                    style={[
                      styles.chartGridLine,
                      {
                        left: plotLeft,
                        right: plotRightPad,
                        top: y,
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(17,24,39,0.12)',
                      },
                    ]}
                  />
                  <Text style={[styles.chartYTickLabel, { top: y - 8, color: theme.muted }]}>{Math.round(tickValue)}</Text>
                </View>
              );
            })}

            {series.map((line) => line.data.map((value, index) => {
              if (index === 0) return null;
              const x1 = getX(index - 1);
              const y1 = getY(line.data[index - 1]);
              const x2 = getX(index);
              const y2 = getY(value);
              const dx = x2 - x1;
              const dy = y2 - y1;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx);
              const thickness = line.thick ? 4 : 2;
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;
              return (
                <View
                  key={`${line.key}_seg_${index}`}
                  style={[
                    styles.chartSegment,
                    {
                      left: midX - (length / 2),
                      top: midY - (thickness / 2),
                      width: length,
                      backgroundColor: line.color,
                      transform: [{ rotateZ: `${angle}rad` }],
                      height: thickness,
                      opacity: line.thick ? 1 : 0.9,
                    },
                  ]}
                />
              );
            }))}

            {series.map((line) => line.data.map((value, index) => {
              const dotSize = line.thick ? 9 : 7;
              return (
                <Pressable
                  key={`${line.key}_pt_${index}`}
                  onPress={() => setSelectedPoint({
                    key: `${line.key}_${index}`,
                    x: getX(index),
                    y: getY(value),
                    tooltip: getPointTooltip(line, value, index),
                  })}
                  style={[
                    styles.chartPointTouchTarget,
                    {
                      left: getX(index) - 14,
                      top: getY(value) - 14,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.chartPoint,
                      {
                        backgroundColor: line.color,
                        width: dotSize,
                        height: dotSize,
                        borderColor: theme.card,
                      },
                    ]}
                  />
                </Pressable>
              );
            }))}

            {selectedPoint ? (
              <View
                style={[
                  styles.chartTooltip,
                  {
                    left: Math.min(Math.max(8, selectedPoint.x - 85), Math.max(8, chartWidth - 178)),
                    top: Math.max(8, selectedPoint.y - 42),
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.chartTooltipText, { color: theme.text }]}>{selectedPoint.tooltip}</Text>
              </View>
            ) : null}
          </>
        ) : null}
      </View>

      <View style={[styles.chartLabelsRow, { marginLeft: axisLabelWidth, marginRight: plotRightPad, height: isCompactChart ? 52 : 20 }]}>
        {chartWidth > 0 ? labels.map((label, index) => {
          const rawLabel = String(label || '');
          const isDateLabel = rawLabel.includes(',');
          const isWeekdayLabel = /^[A-Za-zÄÖÜäöü]{2,3}$/.test(rawLabel);
          if (useEqualLabelSlots) {
            const equalLabelWidth = isCompactChart ? 52 : 64;
            const xRelative = getX(index) - plotLeft;
            return (
              <Text
                key={`${label}_${index}`}
                numberOfLines={1}
                style={[
                  styles.chartLabel,
                  isCompactChart && styles.chartLabelCompact,
                  styles.chartEqualLabel,
                  {
                    color: theme.muted,
                    width: equalLabelWidth,
                    left: xRelative,
                    textAlign: 'center',
                    transform: [{ translateX: -(equalLabelWidth / 2) }],
                  },
                ]}
              >
                {label}
              </Text>
            );
          }
          const shouldRotateLabel = isCompactChart && !isWeekdayLabel;
          const labelWidth = isDateLabel
            ? (isCompactChart ? 56 : 92)
            : (isWeekdayLabel ? (isCompactChart ? 24 : 28) : (isCompactChart ? 48 : 64));
          const xRelative = getX(index) - plotLeft;
          return (
            <Text
              key={`${label}_${index}`}
              numberOfLines={1}
              style={[
                styles.chartLabel,
                isCompactChart && styles.chartLabelCompact,
                {
                  color: theme.muted,
                  position: 'absolute',
                  left: xRelative,
                  width: labelWidth,
                  textAlign: 'center',
                  transform: [{ translateX: -(labelWidth / 2) }, ...(shouldRotateLabel ? [{ rotate: '-24deg' }] : [])],
                },
              ]}
            >
              {label}
            </Text>
          );
        }) : null}
      </View>

      <Text style={[styles.chartAxisTitleX, { color: theme.muted }]}>{xAxisTitle}</Text>

      <View style={styles.chartLegendRow}>
        {series.map((line) => (
          <View key={`legend_${line.key}`} style={styles.chartLegendItem}>
            <View style={[styles.chartLegendDot, { backgroundColor: line.color }]} />
            <Text style={[styles.chartLegendText, { color: theme.text }]}>{line.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const pad = (n) => String(n).padStart(2, '0');
const toISO = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseISO = (iso) => (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? null : new Date(`${iso}T00:00:00`));
const normalizeRegistrationShortDate = (value) => {
  const raw = String(value || '').trim();
  const germanMatch = raw.match(/^(\d{1,2})[.\-/](\d{1,2})$/);
  if (germanMatch) {
    const day = Number(germanMatch[1]);
    const month = Number(germanMatch[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) return `${pad(day)}.${pad(month)}`;
  }
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const day = Number(isoMatch[3]);
    const month = Number(isoMatch[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) return `${pad(day)}.${pad(month)}`;
  }
  return '';
};

const isMissingMajlisValue = (value) => {
  const raw = String(value || '').trim();
  return !raw || raw === '-';
};
const registrationShortDateToKey = (value) => {
  const normalized = normalizeRegistrationShortDate(value);
  if (!normalized) return null;
  const [dayRaw, monthRaw] = normalized.split('.');
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(day) || !Number.isFinite(month)) return null;
  return (month * 100) + day;
};
const normalizeRegistrationConfig = (data, fallbackDocId = '') => {
  const id = String(data?.id || fallbackDocId || '').trim();
  const headline = buildHeadlineConfig(data);
  const name = headlineToLegacyName(headline);
  const startDate = normalizeRegistrationShortDate(data?.startDate || '');
  const endDate = normalizeRegistrationShortDate(data?.endDate || '');
  const includeTanzeems = Array.isArray(data?.advanced?.includeTanzeems)
    ? data.advanced.includeTanzeems
    : (Array.isArray(data?.includeTanzeems) ? data.includeTanzeems : REGISTRATION_TANZEEM_OPTIONS);
  const sanitizedTanzeems = includeTanzeems
    .map((entry) => String(entry || '').trim().toLowerCase())
    .filter((entry, index, arr) => REGISTRATION_TANZEEM_OPTIONS.includes(entry) && arr.indexOf(entry) === index);
  return {
    id: id || `${startDate}_${endDate}_${toLocationKey(name || 'anmeldung')}`,
    name,
    title: headline.title,
    subtitle: headline.subtitle,
    extraLine: headline.extraLine,
    startDate,
    endDate,
    disabled: Boolean(data?.disabled),
    updatedAt: String(data?.updatedAt || ''),
    advanced: {
      isPublic: Boolean(data?.advanced?.isPublic ?? data?.isPublic),
      includeTanzeems: sanitizedTanzeems.length ? sanitizedTanzeems : [...REGISTRATION_TANZEEM_OPTIONS],
      onlyEhlVoters: Boolean(data?.advanced?.onlyEhlVoters ?? data?.onlyEhlVoters),
      allowDecline: Boolean(data?.advanced?.allowDecline ?? data?.allowDecline),
      loginEnabled: Boolean(data?.advanced?.loginEnabled ?? data?.loginEnabled),
    },
  };
};
const normalizeVoterFlagValue = (value) => {
  if (value === '-') return '-';
  if (String(value).trim() === '-') return '-';
  if (Number(value) === 1) return 1;
  if (Number(value) === 0) return 0;
  return '-';
};
const isVotingEligibleMember = (member) => normalizeVoterFlagValue(member?.stimmberechtigt) === 1;
const shouldIncludeMemberInRegistrationBase = (entry, allowedTanzeems, filterKey = 'total', onlyEhlVoters = false) => {
  const tanzeem = String(entry?.tanzeem || '').toLowerCase();
  if (!allowedTanzeems.includes(tanzeem)) return false;
  if (filterKey !== 'total' && tanzeem !== filterKey) return false;
  if (onlyEhlVoters && !isVotingEligibleMember(entry)) return false;
  return true;
};
const getRegistrationWindowState = (config, todayISO) => {
  if (!config || !config.startDate || !config.endDate) return { hasRange: false, isOpen: false, isUpcoming: false, isPast: false };
  if (config.disabled) return { hasRange: true, isOpen: false, isUpcoming: false, isPast: true };
  const todayShort = normalizeRegistrationShortDate(todayISO);
  const todayKey = registrationShortDateToKey(todayShort);
  const startKey = registrationShortDateToKey(config.startDate);
  const endKey = registrationShortDateToKey(config.endDate);
  if (todayKey === null || startKey === null || endKey === null) return { hasRange: false, isOpen: false, isUpcoming: false, isPast: false };
  if (todayKey < startKey) return { hasRange: true, isOpen: false, isUpcoming: true, isPast: false };
  if (todayKey > endKey) return { hasRange: true, isOpen: false, isUpcoming: false, isPast: true };
  return { hasRange: true, isOpen: true, isUpcoming: false, isPast: false };
};
const applyForcedTestDate = (date) => {
  if (!FORCE_TEST_DATE_ENABLED) return date;
  const forcedDate = parseISO(FORCE_TEST_DATE_ISO);
  if (!forcedDate) return date;
  const next = new Date(date);
  next.setFullYear(forcedDate.getFullYear(), forcedDate.getMonth(), forcedDate.getDate());
  return next;
};
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
const formatGermanDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return date.toLocaleString('de-DE');
  }
};
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

const normalizePendingPrayerOverride = (data) => {
  const dateISO = typeof data?.dateISO === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.dateISO) ? data.dateISO : null;
  if (!dateISO) return null;
  return {
    dateISO,
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
  };
};


const docUrl = (collection, id) => `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/${collection}/${id}?key=${FIREBASE_CONFIG.apiKey}`;
const commitUrl = () => `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents:commit?key=${FIREBASE_CONFIG.apiKey}`;
const loadFirebaseRuntime = () => {
  try {
    const { getApp, getApps, initializeApp } = require('firebase/app');
    const { doc, getFirestore, onSnapshot } = require('firebase/firestore');
    const auth = require('firebase/auth');
    const firebaseApp = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
    let authInstance;
    try {
      if (Platform.OS !== 'web' && auth.initializeAuth && auth.getReactNativePersistence) {
        authInstance = auth.initializeAuth(firebaseApp, {
          persistence: auth.getReactNativePersistence(AsyncStorage),
        });
      }
    } catch {}
    if (!authInstance) authInstance = auth.getAuth(firebaseApp);
    return {
      app: firebaseApp,
      db: getFirestore(firebaseApp),
      doc,
      onSnapshot,
      authApi: auth,
      auth: authInstance,
    };
  } catch {
    return null;
  }
};

const firebaseRuntime = hasFirebaseConfig() ? loadFirebaseRuntime() : null;
let activeMosqueScopeKey = DEFAULT_MOSQUE_KEY;
let activeExternalScopeKey = '';

const getMosqueOptionByKey = (key) => MOSQUE_OPTIONS.find((item) => item.key === key) || MOSQUE_OPTIONS[0];
const normalizeExternalScopeKey = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/ä/g, 'ae')
  .replace(/ö/g, 'oe')
  .replace(/ü/g, 'ue')
  .replace(/ß/g, 'ss')
  .replace(/\s+/g, '_')
  .replace(/[^a-z0-9_\-]/g, '');
const formatExternalScopeLabel = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.includes('_')) {
    return raw
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  return raw;
};

const buildExternalAccountWritePayload = (account, overrides = {}) => {
  const next = {
    name: String(account?.name || ''),
    nameKey: String(account?.nameKey || normalizeAccountNameKey(account?.name || '')),
    authEmail: account?.authEmail ?? null,
    authUid: account?.authUid ?? null,
    localPassword: account?.localPassword ?? null,
    localPasswordHash: account?.localPasswordHash ?? null,
    mosqueId: account?.mosqueId ?? EXTERNAL_MOSQUE_KEY,
    mosqueIds: Array.isArray(account?.mosqueIds) && account.mosqueIds.length ? account.mosqueIds : [EXTERNAL_MOSQUE_KEY],
    preferredMosqueId: account?.preferredMosqueId ?? EXTERNAL_MOSQUE_KEY,
    permissions: account?.permissions || allPermissionsEnabled(),
    isExternalGuest: true,
    externalMultipleMajalis: account?.externalMultipleMajalis !== false,
    externalShowNames: Boolean(account?.externalShowNames),
    externalMosqueName: String(account?.externalMosqueName || ''),
    accountCollection: ADMIN_EXTERNAL_ACCOUNTS_COLLECTION,
    isSuperAdmin: Boolean(account?.isSuperAdmin),
    active: account?.active !== false,
    createdAt: account?.createdAt || new Date().toISOString(),
    createdBy: account?.createdBy || 'system',
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
  next.nameKey = String(next.nameKey || normalizeAccountNameKey(next.name || ''));
  return next;
};
const setActiveMosqueScope = (key, externalScopeKey = '') => {
  activeMosqueScopeKey = getMosqueOptionByKey(key).key;
  activeExternalScopeKey = normalizeExternalScopeKey(externalScopeKey);
};
const resolveScopedCollectionForMosque = (collection, mosqueKey) => {
  if (String(mosqueKey) === EXTERNAL_MOSQUE_KEY) {
    const externalSuffix = normalizeExternalScopeKey(activeExternalScopeKey || 'default');
    return `${collection}_ext_${externalSuffix}`;
  }
  const suffix = getMosqueOptionByKey(mosqueKey).suffix;
  return suffix ? `${collection}_${suffix}` : collection;
};
const resolveScopedCollection = (collection) => resolveScopedCollectionForMosque(collection, activeMosqueScopeKey);

async function incrementDocCounters(collection, id, fieldPaths) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const scopedCollection = resolveScopedCollection(collection);
  const document = `projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/${scopedCollection}/${id}`;
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
  const res = await fetch(docUrl(resolveScopedCollection(collection), id));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Firestore read failed');
  const json = await res.json();
  return fromFirestoreValue({ mapValue: { fields: json.fields || {} } });
}

async function listDocIds(collection, pageSize = 300) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const scopedCollection = resolveScopedCollection(collection);
  let pageToken = '';
  const ids = [];
  do {
    const tokenPart = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/${scopedCollection}?pageSize=${pageSize}${tokenPart}&key=${FIREBASE_CONFIG.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Firestore list failed');
    const json = await res.json();
    const docs = Array.isArray(json.documents) ? json.documents : [];
    docs.forEach((doc) => {
      const fullName = String(doc?.name || '');
      const id = fullName.split('/').pop();
      if (id) ids.push(id);
    });
    pageToken = String(json.nextPageToken || '');
  } while (pageToken);
  return ids;
}

async function listDocIdsForMosque(collection, mosqueKey, pageSize = 300) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const scopedCollection = resolveScopedCollectionForMosque(collection, mosqueKey);
  let pageToken = '';
  const ids = [];
  do {
    const tokenPart = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/${scopedCollection}?pageSize=${pageSize}${tokenPart}&key=${FIREBASE_CONFIG.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Firestore list failed');
    const json = await res.json();
    const docs = Array.isArray(json.documents) ? json.documents : [];
    docs.forEach((doc) => {
      const fullName = String(doc?.name || '');
      const id = fullName.split('/').pop();
      if (id) ids.push(id);
    });
    pageToken = String(json.nextPageToken || '');
  } while (pageToken);
  return ids;
}


async function setDocData(collection, id, data) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const body = { fields: toFirestoreValue(data).mapValue.fields };
  const res = await fetch(docUrl(resolveScopedCollection(collection), id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('Firestore write failed');
}

async function deleteDocData(collection, id) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const res = await fetch(docUrl(resolveScopedCollection(collection), id), { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error('Firestore delete failed');
}

async function getDocDataForMosque(collection, id, mosqueKey) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const res = await fetch(docUrl(resolveScopedCollectionForMosque(collection, mosqueKey), id));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Firestore read failed');
  const json = await res.json();
  return fromFirestoreValue({ mapValue: { fields: json.fields || {} } });
}

async function setDocDataForMosque(collection, id, data, mosqueKey) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const body = { fields: toFirestoreValue(data).mapValue.fields };
  const res = await fetch(docUrl(resolveScopedCollectionForMosque(collection, mosqueKey), id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Firestore write failed');
}

async function deleteDocDataForMosque(collection, id, mosqueKey) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const res = await fetch(docUrl(resolveScopedCollectionForMosque(collection, mosqueKey), id), { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error('Firestore delete failed');
}


async function getGlobalDocData(collection, id) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const res = await fetch(docUrl(collection, id));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Firestore read failed');
  const json = await res.json();
  return fromFirestoreValue({ mapValue: { fields: json.fields || {} } });
}

async function listGlobalDocIds(collection, pageSize = 300) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  let pageToken = '';
  const ids = [];
  do {
    const tokenPart = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/${collection}?pageSize=${pageSize}${tokenPart}&key=${FIREBASE_CONFIG.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Firestore list failed');
    const json = await res.json();
    const docs = Array.isArray(json.documents) ? json.documents : [];
    docs.forEach((doc) => {
      const fullName = String(doc?.name || '');
      const id = fullName.split('/').pop();
      if (id) ids.push(id);
    });
    pageToken = String(json.nextPageToken || '');
  } while (pageToken);
  return ids;
}

async function findGlobalRegistrationByIdNumber(
  collection,
  idNumber,
  mosqueKey = DEFAULT_MOSQUE_KEY,
  externalScopeKey = '',
) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const targetIdNumber = String(idNumber || '').trim();
  const targetMosqueKey = getMosqueOptionByKey(mosqueKey).key;
  const targetExternalScopeKey = normalizeExternalScopeKey(externalScopeKey);
  if (!targetIdNumber) return null;
  const docIds = await listGlobalDocIds(collection);
  for (const docId of docIds) {
    const registration = await getGlobalDocData(collection, docId);
    const registrationMosqueKey = getMosqueOptionByKey(registration?.mosqueKey || DEFAULT_MOSQUE_KEY).key;
    const registrationExternalScopeKey = normalizeExternalScopeKey(registration?.externalScopeKey || '');
    const externalScopeMatches = targetMosqueKey === EXTERNAL_MOSQUE_KEY
      ? registrationExternalScopeKey === targetExternalScopeKey
      : true;
    if (
      String(registration?.idNumber || '').trim() === targetIdNumber
      && registrationMosqueKey === targetMosqueKey
      && externalScopeMatches
    ) {
      return {
        docId,
        registration,
      };
    }
  }
  return null;
}

async function setGlobalDocData(collection, id, data) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const body = { fields: toFirestoreValue(data).mapValue.fields };
  const res = await fetch(docUrl(collection, id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('Firestore write failed');
}

async function deleteGlobalDocData(collection, id) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const res = await fetch(docUrl(collection, id), { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error('Firestore delete failed');
}

async function deleteAllGlobalDocsInCollection(collection) {
  let ids = [];
  try {
    ids = await listGlobalDocIds(collection);
  } catch (error) {
    return {
      total: 0,
      deleted: 0,
      failed: [{ id: '__collection__', error: `list_failed:${String(error?.message || error || 'unknown')}` }],
    };
  }
  let deleted = 0;
  const failed = [];
  await Promise.all(ids.map(async (id) => {
    try {
      await deleteGlobalDocData(collection, id);
      deleted += 1;
    } catch (error) {
      failed.push({ id, error: String(error?.message || error || 'delete_failed') });
    }
  }));
  return { total: ids.length, deleted, failed };
}

async function deleteAllDocsInCollectionForMosque(collection, mosqueKey) {
  let ids = [];
  try {
    ids = await listDocIdsForMosque(collection, mosqueKey);
  } catch (error) {
    return {
      total: 0,
      deleted: 0,
      failed: [{ id: '__collection__', error: `list_failed:${String(error?.message || error || 'unknown')}` }],
    };
  }
  let deleted = 0;
  const failed = [];
  await Promise.all(ids.map(async (id) => {
    try {
      await deleteDocDataForMosque(collection, id, mosqueKey);
      deleted += 1;
    } catch (error) {
      failed.push({ id, error: String(error?.message || error || 'delete_failed') });
    }
  }));
  return { total: ids.length, deleted, failed };
}

async function appendMemberDetailsToDailyAttendance(dateISO, targetPrayers, tanzeemKey, locationName, locationKey, member) {
  const existing = (await getDocData('attendance_daily', dateISO)) || {};
  const nextByPrayer = { ...(existing.byPrayer || {}) };

  targetPrayers.forEach((prayerKey) => {
    const prayerNode = { ...(nextByPrayer[prayerKey] || {}) };
    const memberDetails = { ...(prayerNode.memberDetails || {}) };
    const tanzeemNode = { ...(memberDetails[tanzeemKey] || {}) };
    const majlisEntries = Array.isArray(tanzeemNode[locationKey]) ? [...tanzeemNode[locationKey]] : [];

    const alreadyExists = majlisEntries.some((entry) => String(entry?.idNumber || '') === String(member?.idNumber || ''));
    if (!alreadyExists) {
      majlisEntries.push({
        idNumber: String(member?.idNumber || ''),
        ...(STORE_MEMBER_NAMES_IN_DB ? { name: member?.name || '' } : {}),
        majlis: locationName,
        tanzeem: tanzeemKey,
        timestamp: new Date().toISOString(),
      });
    }

    tanzeemNode[locationKey] = majlisEntries;
    memberDetails[tanzeemKey] = tanzeemNode;
    prayerNode.memberDetails = memberDetails;
    nextByPrayer[prayerKey] = prayerNode;
  });

  await setDocData('attendance_daily', dateISO, {
    ...existing,
    byPrayer: nextByPrayer,
  });
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

const getToastTone = (message) => {
  const value = String(message || '').toLowerCase();
  if (!value) return 'positive';
  if (/fehler|error|falsch|nicht|konnte|bereits|bitte|kein\s|fehlgeschlagen/.test(value)) return 'negative';
  if (/✓|gespeichert|gezählt|entfernt/.test(value)) return 'positive';
  return 'positive';
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


function renderInlineBoldSegments(text, textStyle, boldStyle) {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={`b_${idx}`} style={boldStyle}>{part.slice(2, -2)}</Text>;
    }
    return <Text key={`t_${idx}`} style={textStyle}>{part}</Text>;
  });
}


const isWebRuntime = Platform.OS === 'web';

const getQrCycleStart = (timestamp = Date.now()) => Math.floor(timestamp / QR_REFRESH_INTERVAL_MS) * QR_REFRESH_INTERVAL_MS;
const normalizeQrAttendanceCategory = (value) => (String(value || '').toLowerCase() === 'program' ? 'program' : 'prayer');
const formatQrCountdown = (seconds) => {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};
const createQrPayload = ({
  mosqueKey,
  cycleStart,
  attendanceCategory = 'prayer',
  externalScopeKey = '',
}) => {
  const normalizedExternalScopeKey = normalizeExternalScopeKey(externalScopeKey);
  return {
    type: 'prayer_attendance',
    mosqueKey,
    attendanceCategory: normalizeQrAttendanceCategory(attendanceCategory),
    ...(normalizedExternalScopeKey ? { externalScopeKey: normalizedExternalScopeKey } : {}),
    cycleStart,
    expiresAt: cycleStart + QR_REFRESH_INTERVAL_MS,
    version: 1,
  };
};
const encodeQrPayload = (payload) => {
  try {
    return encodeURIComponent(JSON.stringify(payload));
  } catch {
    return '';
  }
};
const decodeQrPayload = (value) => {
  try {
    return JSON.parse(decodeURIComponent(String(value || '')));
  } catch {
    return null;
  }
};
const buildQrScanUrl = ({
  mosqueKey,
  cycleStart,
  attendanceCategory = 'prayer',
  externalScopeKey = '',
  scanBaseUrl = '',
}) => {
  const payload = createQrPayload({ mosqueKey, cycleStart, attendanceCategory, externalScopeKey });
  const encodedPayload = encodeQrPayload(payload);
  if (!encodedPayload) return '';
  if (!isWebRuntime || typeof window === 'undefined') return encodedPayload;
  const preferredScanBaseUrl = String(scanBaseUrl || '').trim();
  let url;
  try {
    url = preferredScanBaseUrl ? new URL(preferredScanBaseUrl) : new URL(window.location.href);
  } catch {
    url = new URL(window.location.href);
  }
  url.searchParams.set(QR_SCAN_PARAM, encodedPayload);
  return url.toString();
};
const buildQrImageUrl = (scanUrl) => `https://api.qrserver.com/v1/create-qr-code/?size=720x720&margin=24&data=${encodeURIComponent(scanUrl)}`;
function PrivacySection({ section, theme, isLast }) {
  return (
    <View style={[styles.privacySection, isLast && styles.privacySectionLast]}>
      <Text style={[styles.privacySectionTitle, { color: theme.text }]}>{section.title}</Text>
      {(section.paragraphs || []).map((paragraph, index) => (
        <Text key={`${section.title}_p_${index}`} style={[styles.privacyParagraph, { color: theme.text }]}>
          {renderInlineBoldSegments(paragraph, null, styles.privacyParagraphBold)}
        </Text>
      ))}
      {(section.bullets || []).map((bullet, index) => (
        <View key={`${section.title}_b_${index}`} style={styles.privacyBulletRow}>
          <Text style={[styles.privacyBulletDot, { color: theme.text }]}>•</Text>
          <Text style={[styles.privacyBulletText, { color: theme.text }]}>
            {renderInlineBoldSegments(bullet, null, styles.privacyParagraphBold)}
          </Text>
        </View>
      ))}
      {!isLast ? <View style={[styles.privacyDivider, { backgroundColor: theme.border }]} /> : null}
    </View>
  );
}


function AppContent() {
  const [activeTab, setActiveTab] = useState('gebetsplan');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeMosqueKey, setActiveMosqueKey] = useState(DEFAULT_MOSQUE_KEY);
  const [terminalMode, setTerminalMode] = useState('tanzeem');
  const [selectedTanzeem, setSelectedTanzeem] = useState('');
  const [selectedMajlis, setSelectedMajlis] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [toast, setToast] = useState('');
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsAttendance, setStatsAttendance] = useState(null);
  const [statsGraphRange, setStatsGraphRange] = useState('currentWeek');
  const [statsGraphSeries, setStatsGraphSeries] = useState('total');
  const [statsTotalRange, setStatsTotalRange] = useState('currentWeek');
  const [statsTanzeemRange, setStatsTanzeemRange] = useState('currentWeek');
  const [statsMajlisRange, setStatsMajlisRange] = useState('currentWeek');
  const [statsPrayerRange, setStatsPrayerRange] = useState('currentWeek');
  const [statsPrayerSeries, setStatsPrayerSeries] = useState('total');
  const [statsWeekRankingFilter, setStatsWeekRankingFilter] = useState('total');
  const [statsWeekRankingRange, setStatsWeekRankingRange] = useState('currentWeek');
  const [statsMajlisTanzeemFilter, setStatsMajlisTanzeemFilter] = useState('total');
  const [statsMajlisShowAll, setStatsMajlisShowAll] = useState(false);
  const [programMajlisFilter, setProgramMajlisFilter] = useState('total');
  const [isStatsExportModalVisible, setStatsExportModalVisible] = useState(false);
  const [statsExporting, setStatsExporting] = useState(false);
  const [programExporting, setProgramExporting] = useState(false);
  const [registrationExporting, setRegistrationExporting] = useState(false);
  const [programAttendanceEntries, setProgramAttendanceEntries] = useState([]);
  const [registrationAttendanceEntries, setRegistrationAttendanceEntries] = useState([]);
  const [isDetailedIdOverviewVisible, setDetailedIdOverviewVisible] = useState(false);
  const [detailedFlowTanzeem, setDetailedFlowTanzeem] = useState('');
  const [detailedFlowMajlis, setDetailedFlowMajlis] = useState('');
  const [detailedIdSearchQuery, setDetailedIdSearchQuery] = useState('');
  const [selectedDetailedMember, setSelectedDetailedMember] = useState(null);
  const [detailedMemberLogs, setDetailedMemberLogs] = useState([]);
  const [detailedLogsLoading, setDetailedLogsLoading] = useState(false);
  const [detailedGraphRange, setDetailedGraphRange] = useState('currentWeek');
  const [detailedPrayerRange, setDetailedPrayerRange] = useState('currentWeek');
  const [isDetailedExportModalVisible, setDetailedExportModalVisible] = useState(false);
  const [detailedExporting, setDetailedExporting] = useState(false);
  const [detailedProgramExporting, setDetailedProgramExporting] = useState(false);
  const [detailedRegistrationExporting, setDetailedRegistrationExporting] = useState(false);
  const [weeklyAttendanceDocs, setWeeklyAttendanceDocs] = useState({});
  const [weeklyStatsLoading, setWeeklyStatsLoading] = useState(false);
  const [selectedStatsDateISO, setSelectedStatsDateISO] = useState('');
  const [selectedProgramStatsDocId, setSelectedProgramStatsDocId] = useState('');
  const [programStatsDocIds, setProgramStatsDocIds] = useState([]);
  const [programStatsEntrySampleByDocId, setProgramStatsEntrySampleByDocId] = useState({});
  const [programStatsNamesByDocId, setProgramStatsNamesByDocId] = useState({});
  const [selectedStatsWeekStartISO, setSelectedStatsWeekStartISO] = useState('');
  const [isStatsCalendarVisible, setStatsCalendarVisible] = useState(false);
  const [isStatsWeekModalVisible, setStatsWeekModalVisible] = useState(false);
  const [isDetailedCalendarVisible, setDetailedCalendarVisible] = useState(false);
  const [isDetailedWeekPickerVisible, setDetailedWeekPickerVisible] = useState(false);
  const [isProgramStatsPickerVisible, setProgramStatsPickerVisible] = useState(false);
  const [availableStatsDates, setAvailableStatsDates] = useState([]);
  const [prayerOverride, setPrayerOverride] = useState(normalizePrayerOverride(null));
  const [pendingPrayerOverride, setPendingPrayerOverride] = useState(null);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [prayerOverrideReady, setPrayerOverrideReady] = useState(false);
  const [pendingQrPayload, setPendingQrPayload] = useState('');
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideEditDayOffset, setOverrideEditDayOffset] = useState(0);
  const overrideEditDayOffsetRef = useRef(0);
  const [overrideMetaTapCount, setOverrideMetaTapCount] = useState(0);
  const [overrideSoharAsrTime, setOverrideSoharAsrTime] = useState('');
  const [overrideMaghribIshaaTime, setOverrideMaghribIshaaTime] = useState('');
  const [manualFajrTime, setManualFajrTime] = useState('');
  const [manualSoharTime, setManualSoharTime] = useState('');
  const [manualAsrTime, setManualAsrTime] = useState('');
  const [manualMaghribTime, setManualMaghribTime] = useState('');
  const [manualIshaaTime, setManualIshaaTime] = useState('');
  const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [isQrPageVisible, setQrPageVisible] = useState(false);
  const [isQrScanPageVisible, setQrScanPageVisible] = useState(false);
  const [qrBrowserDeviceId, setQrBrowserDeviceId] = useState('');
  const [qrRegistration, setQrRegistration] = useState(null);
  const [qrStatusMessage, setQrStatusMessage] = useState('');
  const [qrStatusTone, setQrStatusTone] = useState('neutral');
  const [qrLastAttendanceStatus, setQrLastAttendanceStatus] = useState('idle');
  const [qrLastAttendancePrayerKey, setQrLastAttendancePrayerKey] = useState('');
  const [qrLastAttendanceDateISO, setQrLastAttendanceDateISO] = useState('');
  const [qrLastRuntimeHint, setQrLastRuntimeHint] = useState(null);
  const [qrFlowMode, setQrFlowMode] = useState('landing');
  const [qrRegistrationMode, setQrRegistrationMode] = useState('tanzeem');
  const [qrRegistrationTanzeem, setQrRegistrationTanzeem] = useState('');
  const [qrRegistrationMajlis, setQrRegistrationMajlis] = useState('');
  const [qrRegistrationSearchQuery, setQrRegistrationSearchQuery] = useState('');
  const [qrScanExternalScopeKey, setQrScanExternalScopeKey] = useState('');
  const [isQrQuickIdSearchVisible, setQrQuickIdSearchVisible] = useState(false);
  const [qrSubmitting, setQrSubmitting] = useState(false);
  const [qrAttendanceCategory, setQrAttendanceCategory] = useState('prayer');
  const [qrCycleStart, setQrCycleStart] = useState(() => getQrCycleStart());
  const [qrCountdownSeconds, setQrCountdownSeconds] = useState(QR_COUNTDOWN_SECONDS);
  const [qrImageUri, setQrImageUri] = useState('');
  const [qrPendingImageUri, setQrPendingImageUri] = useState('');
  const [attendanceMode, setAttendanceMode] = useState('prayer');
  const [statsMode, setStatsMode] = useState('prayer');
  const [countedMemberIdsForSelection, setCountedMemberIdsForSelection] = useState(new Set());
  const [countedMemberResponsesForSelection, setCountedMemberResponsesForSelection] = useState(new Map());

  const [isAdminLoginVisible, setAdminLoginVisible] = useState(false);
  const [loginNameInput, setLoginNameInput] = useState('');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [guestActivation, setGuestActivation] = useState(null);
  const [externalScopeOptions, setExternalScopeOptions] = useState([]);
  const [externalScopeLoading, setExternalScopeLoading] = useState(false);
  const [isExternalScopeModalVisible, setExternalScopeModalVisible] = useState(false);
  const [externScopeHeaderTapCount, setExternScopeHeaderTapCount] = useState(0);
  const [externalMosqueNameInput, setExternalMosqueNameInput] = useState('');
  const [externalConfigSaving, setExternalConfigSaving] = useState(false);
  const [adminTapCount, setAdminTapCount] = useState(0);
  const [mosqueSwitchTapCount, setMosqueSwitchTapCount] = useState(0);
  const [globalThemeTapCount, setGlobalThemeTapCount] = useState(0);
  const localSessionActiveRef = useRef(false);
  const [adminManageName, setAdminManageName] = useState('');
  const [adminManagePassword, setAdminManagePassword] = useState('');
  const [adminManageMosqueKeys, setAdminManageMosqueKeys] = useState([DEFAULT_MOSQUE_KEY]);
  const [adminManageExternalMultiMajlis, setAdminManageExternalMultiMajlis] = useState(true);
  const [adminManageExternalShowNames, setAdminManageExternalShowNames] = useState(false);
  const [adminManagePermissions, setAdminManagePermissions] = useState({ ...DEFAULT_ACCOUNT_PERMISSIONS });
  const [adminAccounts, setAdminAccounts] = useState([]);
  const [adminAccountsLoading, setAdminAccountsLoading] = useState(false);
  const [mosquePreferenceSaving, setMosquePreferenceSaving] = useState(false);
  const [passwordChangeInput, setPasswordChangeInput] = useState('');
  const [dbResetSelectionByCategory, setDbResetSelectionByCategory] = useState(() => (
    INTERNAL_RESET_CATEGORIES.reduce((acc, category) => ({ ...acc, [category.key]: [] }), {})
  ));
  const [dbResetLoadingByCategory, setDbResetLoadingByCategory] = useState(() => (
    INTERNAL_RESET_CATEGORIES.reduce((acc, category) => ({ ...acc, [category.key]: false }), {})
  ));

  const [programNameInput, setProgramNameInput] = useState('');
  const [programSubtitleInput, setProgramSubtitleInput] = useState('');
  const [programExtraLineInput, setProgramExtraLineInput] = useState('');
  const [programStartInput, setProgramStartInput] = useState('');
  const [announcementInput, setAnnouncementInput] = useState('');
  const [programConfigByDate, setProgramConfigByDate] = useState({});
  const [programStats, setProgramStats] = useState(null);
  const [registrationConfigById, setRegistrationConfigById] = useState({});
  const [registrationStats, setRegistrationStats] = useState(null);
  const [selectedRegistrationStatsConfigId, setSelectedRegistrationStatsConfigId] = useState('');
  const [registrationMajlisFilter, setRegistrationMajlisFilter] = useState('total');
  const [registrationNameInput, setRegistrationNameInput] = useState('');
  const [registrationSubtitleInput, setRegistrationSubtitleInput] = useState('');
  const [registrationExtraLineInput, setRegistrationExtraLineInput] = useState('');
  const [registrationStartDateInput, setRegistrationStartDateInput] = useState('');
  const [registrationEndDateInput, setRegistrationEndDateInput] = useState('');
  const [registrationIsPublicInput, setRegistrationIsPublicInput] = useState(false);
  const [registrationOnlyEhlVotersInput, setRegistrationOnlyEhlVotersInput] = useState(false);
  const [registrationAllowDeclineInput, setRegistrationAllowDeclineInput] = useState(false);
  const [registrationLoginEnabledInput, setRegistrationLoginEnabledInput] = useState(false);
  const [registrationIncludedTanzeemsInput, setRegistrationIncludedTanzeemsInput] = useState([...REGISTRATION_TANZEEM_OPTIONS]);
  const [isRegistrationAdvancedVisible, setRegistrationAdvancedVisible] = useState(false);
  const [pendingRegistrationMember, setPendingRegistrationMember] = useState(null);
  const [registrationConfirmFromQuickSearch, setRegistrationConfirmFromQuickSearch] = useState(false);
  const [registrationDeclineConfirmVisible, setRegistrationDeclineConfirmVisible] = useState(false);
  const [registrationDeclineReasonInput, setRegistrationDeclineReasonInput] = useState('');
  const [terminalInactivityEnabledInput, setTerminalInactivityEnabledInput] = useState(true);
  const [terminalInactivityTimeoutInput, setTerminalInactivityTimeoutInput] = useState('90');
  const [terminalInactivityScopeInput, setTerminalInactivityScopeInput] = useState('global');
  const [terminalInactivitySaving, setTerminalInactivitySaving] = useState(false);
  const inactivityLastInteractionRef = useRef(Date.now());
  const [idSearchQuery, setIdSearchQuery] = useState('');
  const [isIdSearchFocused, setIsIdSearchFocused] = useState(false);
  const [quickIdSearchQuery, setQuickIdSearchQuery] = useState('');
  const [isQuickIdSearchVisible, setQuickIdSearchVisible] = useState(false);
  const normalizedAppMode = APP_MODE === 'guest' ? 'extern' : APP_MODE;
  const isSecretMode = normalizedAppMode === 'secret';
  const isExternMode = normalizedAppMode === 'extern' || normalizedAppMode === 'qr_extern';
  const isQrExternMode = normalizedAppMode === 'qr_extern';
  const isGuestMode = isExternMode;
  const activeExternalScopeDependency = normalizeExternalScopeKey(guestActivation?.scopeKey || guestActivation?.mosqueName || '');
  const hasMultipleMajalisInGuest = isGuestMode ? (guestActivation?.multipleMajalis !== false) : true;


  const qrScanUrl = useMemo(
    () => buildQrScanUrl({
      mosqueKey: activeMosqueKey,
      cycleStart: qrCycleStart,
      attendanceCategory: qrAttendanceCategory,
      externalScopeKey: activeMosqueKey === EXTERNAL_MOSQUE_KEY
        ? normalizeExternalScopeKey(
          guestActivation?.scopeKey
          || guestActivation?.mosqueName
          || currentAccount?.externalMosqueName
          || currentAccount?.name
          || '',
        )
        : '',
      scanBaseUrl: SECRET_QR_APP_URL,
    }),
    [activeMosqueKey, currentAccount?.externalMosqueName, currentAccount?.name, guestActivation?.mosqueName, guestActivation?.scopeKey, qrAttendanceCategory, qrCycleStart],
  );
  const qrGuestAmaratScopeKey = normalizeExternalScopeKey(
    qrScanExternalScopeKey || guestActivation?.scopeKey || guestActivation?.mosqueName || '',
  );
  const qrMembersDirectory = isGuestMode
    ? EXTERNAL_MEMBER_DIRECTORY_DATA.filter((entry) => {
      const entryScope = normalizeExternalScopeKey(entry?.amarat || '');
      return !entryScope || !qrGuestAmaratScopeKey || entryScope === qrGuestAmaratScopeKey;
    })
    : MEMBER_DIRECTORY_DATA;
  const qrCurrentRegistrationMember = useMemo(() => {
    if (!qrRegistration?.idNumber) return null;
    return qrMembersDirectory.find((entry) => String(entry.idNumber) === String(qrRegistration.idNumber)) || null;
  }, [qrMembersDirectory, qrRegistration]);
  const qrCurrentRegistrationMajlisLabel = useMemo(() => {
    const rawMajlis = String(qrCurrentRegistrationMember?.majlis || '').trim();
    if (rawMajlis && rawMajlis !== '-') return rawMajlis;
    const scopeKeyFromMember = normalizeExternalScopeKey(qrCurrentRegistrationMember?.amarat || '');
    const configuredScopeName = externalScopeOptions.find((option) => normalizeExternalScopeKey(option?.scopeKey || '') === scopeKeyFromMember)?.mosqueName || '';
    const fallbackAmarat = String(configuredScopeName || guestActivation?.mosqueName || formatExternalScopeLabel(qrCurrentRegistrationMember?.amarat || '')).trim();
    return fallbackAmarat || rawMajlis || '—';
  }, [externalScopeOptions, guestActivation?.mosqueName, qrCurrentRegistrationMember?.amarat, qrCurrentRegistrationMember?.majlis]);
  const qrRegistrationMajlisChoices = useMemo(() => (
    qrMembersDirectory
      .filter((entry) => entry.tanzeem === qrRegistrationTanzeem)
      .map((entry) => entry.majlis)
      .filter((value, index, arr) => value && value !== '-' && arr.indexOf(value) === index)
      .sort((a, b) => a.localeCompare(b, 'de'))
  ), [qrMembersDirectory, qrRegistrationTanzeem]);
  const hasQrMajlisChoicesForTanzeem = useCallback((tanzeemKey) => {
    const normalizedTanzeem = String(tanzeemKey || '').trim().toLowerCase();
    if (!normalizedTanzeem) return false;
    return qrMembersDirectory.some((entry) => (
      String(entry?.tanzeem || '').trim().toLowerCase() === normalizedTanzeem
      && String(entry?.majlis || '').trim()
      && String(entry?.majlis || '').trim() !== '-'
    ));
  }, [qrMembersDirectory]);
  const shouldUseQrMajlisSelection = hasMultipleMajalisInGuest && hasQrMajlisChoicesForTanzeem(qrRegistrationTanzeem);
  const qrRegistrationMemberChoices = useMemo(() => (
    qrMembersDirectory
      .filter((entry) => (
        entry.tanzeem === qrRegistrationTanzeem
        && (isGuestMode && !shouldUseQrMajlisSelection ? true : entry.majlis === qrRegistrationMajlis)
      ))
      .sort((a, b) => String(a.idNumber).localeCompare(String(b.idNumber), 'de'))
  ), [isGuestMode, qrMembersDirectory, qrRegistrationMajlis, qrRegistrationTanzeem, shouldUseQrMajlisSelection]);
  const qrRegistrationTanzeemOptions = useMemo(
    () => (qrAttendanceCategory === 'program' ? PROGRAM_TANZEEM_OPTIONS : TANZEEM_OPTIONS),
    [qrAttendanceCategory],
  );
  const qrRegistrationSearchDigits = String(qrRegistrationSearchQuery || '').replace(/[^0-9]/g, '');
  const qrRegistrationSearchResults = useMemo(() => {
    if (qrRegistrationSearchDigits.length < 4) return [];
    const allowed = new Set(qrRegistrationTanzeemOptions);
    return qrMembersDirectory
      .filter((entry) => allowed.has(String(entry.tanzeem || '').toLowerCase()))
      .filter((entry) => String(entry.idNumber || '').includes(qrRegistrationSearchDigits))
      .slice(0, 24);
  }, [qrMembersDirectory, qrRegistrationSearchDigits, qrRegistrationTanzeemOptions]);
  const isQrExternScopeSelected = Boolean(normalizeExternalScopeKey(guestActivation?.scopeKey || guestActivation?.mosqueName || ''));

  useEffect(() => {
    if (qrRegistrationMode !== 'majlis') return;
    if (shouldUseQrMajlisSelection) return;
    setQrRegistrationMode('idSelection');
    setQrRegistrationMajlis('-');
  }, [qrRegistrationMode, shouldUseQrMajlisSelection]);




  const themePulseAnim = useRef(new Animated.Value(1)).current;
  const terminalScrollRef = useRef(null);
  const countAttendanceRef = useRef(null);
  const terminalLastCountRef = useRef(0);
  const visitorCounterRef = useRef(0);
  const statsPayloadRef = useRef('');
  const weeklyStatsPayloadRef = useRef('');
  const hasLoadedWeeklyRef = useRef(false);
  const detailedLogsCacheRef = useRef({});

  const theme = isDarkMode ? THEME.dark : THEME.light;
  const activeMosque = useMemo(() => {
    const base = getMosqueOptionByKey(activeMosqueKey);
    if (isGuestMode) {
      const guestLabel = String(guestActivation?.mosqueName || '').trim();
      if (!currentAccount) {
        return {
          ...base,
          label: guestLabel || 'Extern',
        };
      }
      return {
        ...base,
        label: guestLabel || 'Extern',
      };
    }
    return base;
  }, [activeMosqueKey, currentAccount, guestActivation?.mosqueName, isGuestMode]);
  const normalizedAnnouncement = useMemo(() => normalizeAnnouncementText(announcementInput), [announcementInput]);
  const announcementSegments = useMemo(() => parseAnnouncementSegments(normalizedAnnouncement), [normalizedAnnouncement]);
  const shouldRestrictToPrayerView = normalizedAppMode === 'display' && !currentAccount;
  const shouldRestrictToQrView = ((normalizedAppMode === 'qr' || isSecretMode) && !currentAccount)
    || isQrExternMode;
  const shouldRestrictToRegistrationView = normalizedAppMode === 'registration' && !currentAccount;
  const isExternalGuestSession = isGuestMode && Boolean(currentAccount?.isExternalGuest);
  const isGuestActivated = Boolean(guestActivation?.scopeKey);
  const guestRequiresConfig = isGuestMode && (!isGuestActivated || !String(guestActivation?.mosqueName || '').trim());

  const isSuperAdmin = Boolean(currentAccount?.isSuperAdmin);
  const effectivePermissions = {
    canEditSettings: isGuestMode
      ? Boolean(currentAccount)
      : (isSuperAdmin || Boolean(currentAccount?.permissions?.canEditSettings)),
    canViewIdStats: isGuestMode
      ? Boolean(currentAccount)
      : (isSuperAdmin || Boolean(currentAccount?.permissions?.canViewIdStats)),
    canExportData: isGuestMode
      ? Boolean(currentAccount)
      : (isSuperAdmin || Boolean(currentAccount?.permissions?.canExportData)),
  };

  const getAllowedMosqueKeys = useCallback((account) => {
    if (!account || account.isSuperAdmin) return [];
    const list = Array.isArray(account.mosqueIds) && account.mosqueIds.length
      ? account.mosqueIds
      : (account.mosqueId ? [account.mosqueId] : []);
    return list
      .map((key) => String(key || ''))
      .filter((key, index, arr) => key && arr.indexOf(key) === index);
  }, []);

  const accountMatchesActiveMosque = useCallback((account) => {
    if (!account) return false;
    if (account.isSuperAdmin) return true;
    const allowed = getAllowedMosqueKeys(account);
    return allowed.includes(String(activeMosque.key || ''));
  }, [activeMosque.key, getAllowedMosqueKeys]);

  const resolveAccountMosquePreference = useCallback((account) => {
    const preferred = String(account?.preferredMosqueId || '');
    if (account?.isSuperAdmin) {
      if (preferred && MOSQUE_OPTIONS.some((item) => item.key === preferred)) return preferred;
      return DEFAULT_MOSQUE_KEY;
    }
    const allowed = getAllowedMosqueKeys(account);
    if (!allowed.length) return DEFAULT_MOSQUE_KEY;
    if (preferred && allowed.includes(preferred)) return preferred;
    if (allowed.includes(DEFAULT_MOSQUE_KEY)) return DEFAULT_MOSQUE_KEY;
    return String(allowed[0]);
  }, [getAllowedMosqueKeys]);

  const canPersistMosquePreference = useMemo(() => {
    if (!currentAccount) return false;
    if (isSuperAdmin) return true;
    return getAllowedMosqueKeys(currentAccount).length > 1;
  }, [currentAccount, getAllowedMosqueKeys, isSuperAdmin]);

  const visibleTabs = useMemo(() => TAB_ITEMS.filter((tab) => {
    if (tab.key === 'settings') return effectivePermissions.canEditSettings;
    if (isGuestMode && tab.key === 'stats') return Boolean(currentAccount);
    return true;
  }), [currentAccount, effectivePermissions.canEditSettings, isGuestMode]);

  useEffect(() => {
    if (!externScopeHeaderTapCount) return undefined;
    const timer = setTimeout(() => setExternScopeHeaderTapCount(0), 1200);
    return () => clearTimeout(timer);
  }, [externScopeHeaderTapCount]);

  const loadExternalScopeOptions = useCallback(async () => {
    try {
      setExternalScopeLoading(true);
      const ids = await listGlobalDocIds(EXTERNAL_CONFIG_COLLECTION).catch(() => []);
      const docs = await Promise.all(ids.map((id) => getGlobalDocData(EXTERNAL_CONFIG_COLLECTION, id).catch(() => null)));
      const byScope = new Map();
      docs.forEach((doc, index) => {
        const fallbackId = String(ids[index] || '').trim();
        const scopeKey = normalizeExternalScopeKey(doc?.scopeKey || doc?.mosqueName || doc?.accountNameKey || fallbackId);
        const mosqueName = String(doc?.mosqueName || '').trim();
        if (!scopeKey) return;
        if (!byScope.has(scopeKey)) {
          byScope.set(scopeKey, {
            scopeKey,
            mosqueName: mosqueName || scopeKey,
            multipleMajalis: doc?.multipleMajalis !== false,
            showNames: Boolean(doc?.showNames),
          });
        }
      });
      const options = Array.from(byScope.values()).sort((a, b) => String(a.mosqueName || a.scopeKey).localeCompare(String(b.mosqueName || b.scopeKey), 'de'));
      setExternalScopeOptions(options);
    } finally {
      setExternalScopeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isGuestMode) return;
    if (externalScopeOptions.length) return;
    loadExternalScopeOptions().catch(() => {});
  }, [externalScopeOptions.length, isGuestMode, loadExternalScopeOptions]);

  const openExternalScopeModal = useCallback(async () => {
    setExternalScopeModalVisible(true);
    await loadExternalScopeOptions();
  }, [loadExternalScopeOptions]);

  const selectExternalScope = useCallback(async (option) => {
    const payload = {
      accountNameKey: String(option?.scopeKey || '').trim(),
      scopeKey: normalizeExternalScopeKey(option?.scopeKey || ''),
      mosqueName: String(option?.mosqueName || '').trim(),
      multipleMajalis: option?.multipleMajalis !== false,
      showNames: Boolean(option?.showNames),
    };
    if (!payload.scopeKey) return;
    setGuestActivation(payload);
    setActiveMosqueKey(EXTERNAL_MOSQUE_KEY);
    await AsyncStorage.setItem(STORAGE_KEYS.guestActivation, JSON.stringify(payload)).catch(() => {});
    setExternalScopeModalVisible(false);
    setToast(`Externe Moschee aktiv: ${payload.mosqueName || payload.scopeKey}`);
  }, []);


  const getSecondaryAuth = useCallback(() => {
    if (!firebaseRuntime?.authApi) return null;
    const { getApps, getApp, initializeApp } = require('firebase/app');
    const secondaryName = '__admin_creator__';
    const secondaryApp = getApps().find((app) => app.name === secondaryName) || initializeApp(FIREBASE_CONFIG, secondaryName);
    return firebaseRuntime.authApi.getAuth(secondaryApp);
  }, []);

  const loadAdminAccounts = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      setAdminAccountsLoading(true);
      const [globalIds, externalIds] = await Promise.all([
        listGlobalDocIds(ADMIN_ACCOUNTS_COLLECTION),
        listGlobalDocIds(ADMIN_EXTERNAL_ACCOUNTS_COLLECTION).catch(() => []),
      ]);
      const [globalDocs, externalDocs] = await Promise.all([
        Promise.all(globalIds.map((id) => getGlobalDocData(ADMIN_ACCOUNTS_COLLECTION, id))),
        Promise.all(externalIds.map((id) => getGlobalDocData(ADMIN_EXTERNAL_ACCOUNTS_COLLECTION, id))),
      ]);
      const rows = [...globalDocs, ...externalDocs]
        .filter(Boolean)
        .map((entry) => ({
          ...entry,
          key: normalizeAccountNameKey(entry.name || ''),
          accountCollection: entry?.isExternalGuest ? ADMIN_EXTERNAL_ACCOUNTS_COLLECTION : ADMIN_ACCOUNTS_COLLECTION,
        }))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      setAdminAccounts(rows);
    } catch (error) {
      console.error('loadAdminAccounts failed', error);
      setToast('Accounts konnten nicht geladen werden');
    } finally {
      setAdminAccountsLoading(false);
    }
  }, [isSuperAdmin]);

  const ensureSuperAdminBootstrap = useCallback(async () => {
    if (!firebaseRuntime?.authApi || !hasFirebaseConfig()) return;
    const docId = normalizeAccountNameKey(SUPER_ADMIN_NAME);
    try {
      const existing = await getGlobalDocData(ADMIN_ACCOUNTS_COLLECTION, docId);
      if (existing) return;
      let uid = '';
      if (SUPER_ADMIN_DEFAULT_PASSWORD.length >= 6) {
        const secondaryAuth = getSecondaryAuth();
        try {
          const cred = await firebaseRuntime.authApi.createUserWithEmailAndPassword(secondaryAuth, buildAccountAuthEmail(SUPER_ADMIN_NAME), SUPER_ADMIN_DEFAULT_PASSWORD);
          uid = String(cred?.user?.uid || '');
          if (firebaseRuntime.authApi.updateProfile) {
            await firebaseRuntime.authApi.updateProfile(cred.user, { displayName: SUPER_ADMIN_NAME });
          }
        } catch (error) {
          if (String(error?.code || '').includes('email-already-in-use')) {
            uid = '';
          } else if (!isAuthConfigurationError(error)) {
            throw error;
          }
        } finally {
          if (secondaryAuth?.currentUser) {
            await firebaseRuntime.authApi.signOut(secondaryAuth).catch(() => {});
          }
        }
      }
      await setGlobalDocData(ADMIN_ACCOUNTS_COLLECTION, docId, {
        name: SUPER_ADMIN_NAME,
        nameKey: docId,
        authEmail: buildAccountAuthEmail(SUPER_ADMIN_NAME),
        authUid: uid || null,
        mosqueId: null,
        permissions: allPermissionsEnabled(),
        isSuperAdmin: true,
        active: true,
        createdAt: new Date().toISOString(),
        createdBy: 'bootstrap',
      });
    } catch (error) {
      if (!isAuthConfigurationError(error)) {
        console.error('ensureSuperAdminBootstrap failed', error);
      }
    }
  }, [getSecondaryAuth]);

  const loginWithHiddenModal = useCallback(async () => {
    const name = loginNameInput.trim();
    const password = loginPasswordInput;
    if (!name || !password) {
      setToast('Bitte Name und Passwort eingeben');
      return;
    }
    const docId = normalizeAccountNameKey(name);
    const targetAccountCollection = isGuestMode ? ADMIN_EXTERNAL_ACCOUNTS_COLLECTION : ADMIN_ACCOUNTS_COLLECTION;
    const strictInternalCollectionLogin = normalizedAppMode === 'registration' && !isGuestMode;
    const localAccountLogin = async () => {
      const existing = await getGlobalDocData(targetAccountCollection, docId).catch(() => null);
      const isDefaultSuperAdmin = normalizeAccountNameKey(name) === normalizeAccountNameKey(SUPER_ADMIN_NAME) && password === SUPER_ADMIN_DEFAULT_PASSWORD;
      if (!existing && (strictInternalCollectionLogin || !isDefaultSuperAdmin)) {
        return false;
      }
      const fallbackAccount = existing || {
        name: SUPER_ADMIN_NAME,
        nameKey: normalizeAccountNameKey(SUPER_ADMIN_NAME),
        mosqueId: null,
        permissions: allPermissionsEnabled(),
        isSuperAdmin: true,
        active: true,
      };
      const hasStoredLocalPassword = Boolean(existing?.localPassword);
      const hasStoredLocalPasswordHash = Boolean(existing?.localPasswordHash);
      const passwordHash = hasStoredLocalPasswordHash ? await hashLocalPassword(password, docId) : '';
      const hasAnyStoredLocalSecret = hasStoredLocalPassword || hasStoredLocalPasswordHash;
      const matchesStoredPassword = hasStoredLocalPasswordHash
        ? String(existing.localPasswordHash) === String(passwordHash)
        : (hasStoredLocalPassword ? String(existing.localPassword) === String(password) : false);
      const allowDefaultSuperAdminPassword = !strictInternalCollectionLogin && Boolean(fallbackAccount?.isSuperAdmin) && !hasAnyStoredLocalSecret;
      const matchesLocalPassword = matchesStoredPassword
        || (allowDefaultSuperAdminPassword && isDefaultSuperAdmin);
      if (!matchesLocalPassword) return false;
      if (!fallbackAccount?.active) return false;

      if (existing && hasStoredLocalPassword && !hasStoredLocalPasswordHash) {
        const migratedHash = await hashLocalPassword(password, docId);
        await setGlobalDocData(targetAccountCollection, docId, {
          ...existing,
          localPasswordHash: migratedHash,
          localPassword: null,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
        fallbackAccount.localPasswordHash = migratedHash;
        fallbackAccount.localPassword = null;
      }

      if (!existing && isDefaultSuperAdmin && !strictInternalCollectionLogin) {
        const defaultHash = await hashLocalPassword(SUPER_ADMIN_DEFAULT_PASSWORD, docId);
        await setGlobalDocData(targetAccountCollection, docId, {
          ...fallbackAccount,
          authEmail: buildAccountAuthEmail(SUPER_ADMIN_NAME),
          authUid: null,
          localPassword: null,
          localPasswordHash: defaultHash,
          createdAt: new Date().toISOString(),
          createdBy: 'bootstrap-local',
        }).catch(() => {});
        fallbackAccount.localPassword = null;
        fallbackAccount.localPasswordHash = defaultHash;
      }
      const preferredMosqueKey = resolveAccountMosquePreference(fallbackAccount);
      if (preferredMosqueKey) {
        setActiveMosqueKey(String(preferredMosqueKey));
      }
      if (isGuestMode && existing?.isExternalGuest) {
        const activationPayload = {
          accountNameKey: existing.nameKey || docId,
          scopeKey: normalizeExternalScopeKey(existing.externalMosqueName || existing.name || docId),
          mosqueName: String(existing.externalMosqueName || '').trim(),
          multipleMajalis: existing.externalMultipleMajalis !== false,
          showNames: Boolean(existing.externalShowNames),
        };
        setGuestActivation(activationPayload);
        await AsyncStorage.setItem(STORAGE_KEYS.guestActivation, JSON.stringify(activationPayload)).catch(() => {});
        setActiveMosqueKey(EXTERNAL_MOSQUE_KEY);
      }
      localSessionActiveRef.current = true;
      setCurrentAccount(fallbackAccount);
      setAdminLoginVisible(false);
      setLoginPasswordInput('');
      setToast(`Assalāmu ʿalaikum wa raḥmatullāhi wa barakātuhu, ${fallbackAccount.name || name}! 👋`);
      return true;
    };

    if (!firebaseRuntime?.authApi) {
      const didFallbackLogin = await localAccountLogin();
      if (!didFallbackLogin) setToast('Login fehlgeschlagen');
      return;
    }

    try {
      setAuthLoading(true);
      const cred = await firebaseRuntime.authApi.signInWithEmailAndPassword(firebaseRuntime.auth, buildAccountAuthEmail(name), password);
      const account = await getGlobalDocData(targetAccountCollection, docId);
      if (!account?.active) throw new Error('Account ist nicht aktiv');
      const nextMosque = resolveAccountMosquePreference(account);
      if (nextMosque) setActiveMosqueKey(String(nextMosque));
      if (account.authUid && String(account.authUid) !== String(cred?.user?.uid || '')) {
        await firebaseRuntime.authApi.signOut(firebaseRuntime.auth).catch(() => {});
        throw new Error('Account-Zuordnung ungültig');
      }
      localSessionActiveRef.current = false;
      setCurrentAccount(account);
      if (isGuestMode && account?.isExternalGuest) {
        const activationPayload = {
          accountNameKey: account.nameKey || docId,
          scopeKey: normalizeExternalScopeKey(account.externalMosqueName || account.name || docId),
          mosqueName: String(account.externalMosqueName || '').trim(),
          multipleMajalis: account.externalMultipleMajalis !== false,
          showNames: Boolean(account.externalShowNames),
        };
        setGuestActivation(activationPayload);
        await AsyncStorage.setItem(STORAGE_KEYS.guestActivation, JSON.stringify(activationPayload)).catch(() => {});
        setActiveMosqueKey(EXTERNAL_MOSQUE_KEY);
      }
      setAdminLoginVisible(false);
      setLoginPasswordInput('');
      setToast(`Assalāmu ʿalaikum wa raḥmatullāhi wa barakātuhu, ${account.name}! 👋`);
    } catch (error) {
      if (isAuthConfigurationError(error)) {
        const didFallbackLogin = await localAccountLogin();
        if (didFallbackLogin) return;
        setToast('Name oder Passwort ist falsch');
        return;
      }
      const code = String(error?.code || '').toLowerCase();
      const message = String(error?.message || '').trim();
      if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password') || code.includes('auth/user-not-found') || code.includes('auth/invalid-email')) {
        setToast('Name oder Passwort ist falsch');
      } else {
        setToast(message || 'Login fehlgeschlagen');
      }
    } finally {
      setAuthLoading(false);
    }
  }, [isGuestMode, loginNameInput, loginPasswordInput, normalizedAppMode, resolveAccountMosquePreference]);

  const logoutAccount = useCallback(async () => {
    localSessionActiveRef.current = false;
    if (firebaseRuntime?.authApi) {
      try {
        await firebaseRuntime.authApi.signOut(firebaseRuntime.auth);
      } catch {}
    }
    setCurrentAccount(null);
    setPasswordChangeInput('');
    if (activeTab === 'settings') setActiveTab('gebetsplan');
    setToast('Abgemeldet');
  }, [activeTab]);

  const changeOwnPassword = useCallback(async () => {
    const nextPassword = passwordChangeInput.trim();
    if (!nextPassword) {
      setToast('Bitte neues Passwort eingeben');
      return;
    }

    try {
      setAuthLoading(true);

      const canUseFirebasePasswordChange = Boolean(firebaseRuntime?.auth?.currentUser && firebaseRuntime?.authApi?.updatePassword && !localSessionActiveRef.current);
      if (canUseFirebasePasswordChange) {
        await firebaseRuntime.authApi.updatePassword(firebaseRuntime.auth.currentUser, nextPassword);
      } else {
        const docId = normalizeAccountNameKey(currentAccount?.nameKey || currentAccount?.name || '');
        if (!docId) throw new Error('missing-account');
        const nextHash = await hashLocalPassword(nextPassword, docId);
        const targetCollection = isGuestMode ? ADMIN_EXTERNAL_ACCOUNTS_COLLECTION : ADMIN_ACCOUNTS_COLLECTION;
        await setGlobalDocData(targetCollection, docId, {
          ...(currentAccount || {}),
          nameKey: docId,
          localPassword: null,
          localPasswordHash: nextHash,
          updatedAt: new Date().toISOString(),
        });
        setCurrentAccount((prev) => (prev ? {
          ...prev,
          localPassword: null,
          localPasswordHash: nextHash,
        } : prev));
      }

      setPasswordChangeInput('');
      setToast('Passwort geändert ✓');
    } catch (error) {
      const code = String(error?.code || '');
      if (code.includes('requires-recent-login')) setToast('Bitte neu einloggen und erneut versuchen');
      else setToast('Passwort konnte nicht geändert werden');
    } finally {
      setAuthLoading(false);
    }
  }, [currentAccount, isGuestMode, passwordChangeInput]);

  const createManagedAccount = useCallback(async () => {
    if (!isSuperAdmin) return;
    const name = adminManageName.trim();
    const password = adminManagePassword;
    if (!name || !password) {
      setToast('Name und Passwort sind erforderlich');
      return;
    }
    const docId = normalizeAccountNameKey(name);
    if (!docId) {
      setToast('Ungültiger Name');
      return;
    }
    const selectedMosqueIds = adminManageMosqueKeys
      .map((key) => String(key || ''))
      .filter((key, index, arr) => key && arr.indexOf(key) === index);
    const isExternalAccount = selectedMosqueIds.includes(EXTERNAL_MOSQUE_KEY);
    if (!selectedMosqueIds.length) {
      setToast('Bitte mindestens eine Moschee auswählen');
      return;
    }
    let secondaryAuth = null;
    let authUid = null;
    let localOnly = !firebaseRuntime?.authApi;
    try {
      setAdminAccountsLoading(true);
      const targetCollection = isExternalAccount ? ADMIN_EXTERNAL_ACCOUNTS_COLLECTION : ADMIN_ACCOUNTS_COLLECTION;
      const existing = await getGlobalDocData(targetCollection, docId);
      if (existing) {
        setToast('Name existiert bereits');
        return;
      }
      if (!localOnly && password.length >= 6) {
        secondaryAuth = getSecondaryAuth();
        try {
          const cred = await firebaseRuntime.authApi.createUserWithEmailAndPassword(secondaryAuth, buildAccountAuthEmail(name), password);
          authUid = String(cred?.user?.uid || '') || null;
          if (firebaseRuntime.authApi.updateProfile) {
            await firebaseRuntime.authApi.updateProfile(cred.user, { displayName: name });
          }
        } catch (error) {
          if (isAuthConfigurationError(error)) {
            localOnly = true;
          } else {
            throw error;
          }
        }
      } else {
        localOnly = true;
      }
      await setGlobalDocData(targetCollection, docId, {
        name,
        nameKey: docId,
        authEmail: buildAccountAuthEmail(name),
        authUid,
        localPassword: null,
        localPasswordHash: localOnly ? await hashLocalPassword(password, docId) : null,
        mosqueId: isExternalAccount ? EXTERNAL_MOSQUE_KEY : selectedMosqueIds[0],
        mosqueIds: isExternalAccount ? [EXTERNAL_MOSQUE_KEY] : selectedMosqueIds,
        preferredMosqueId: isExternalAccount ? EXTERNAL_MOSQUE_KEY : (selectedMosqueIds.includes(DEFAULT_MOSQUE_KEY) ? DEFAULT_MOSQUE_KEY : selectedMosqueIds[0]),
        permissions: isExternalAccount ? allGuestPermissionsEnabled() : { ...adminManagePermissions },
        isExternalGuest: isExternalAccount,
        externalMultipleMajalis: isExternalAccount ? Boolean(adminManageExternalMultiMajlis) : null,
        externalShowNames: isExternalAccount ? Boolean(adminManageExternalShowNames) : null,
        externalMosqueName: isExternalAccount ? '' : null,
        isSuperAdmin: false,
        active: true,
        createdAt: new Date().toISOString(),
        createdBy: currentAccount?.name || SUPER_ADMIN_NAME,
      });
      setAdminManageName('');
      setAdminManagePassword('');
      setAdminManageMosqueKeys([DEFAULT_MOSQUE_KEY]);
      setAdminManageExternalMultiMajlis(true);
      setAdminManageExternalShowNames(false);
      setAdminManagePermissions({ ...DEFAULT_ACCOUNT_PERMISSIONS });
      setToast(localOnly ? 'Account erstellt ✓ (lokal)' : 'Account erstellt ✓');
      await loadAdminAccounts();
    } catch (error) {
      const code = String(error?.code || '');
      if (code.includes('email-already-in-use')) setToast('Name existiert bereits');
      else if (isAuthConfigurationError(error)) setToast('Firebase Auth ist nicht korrekt eingerichtet');
      else setToast('Account konnte nicht erstellt werden');
      if (!isAuthConfigurationError(error)) {
        console.error('createManagedAccount failed', error);
      }
    } finally {
      if (secondaryAuth?.currentUser) {
        await firebaseRuntime.authApi.signOut(secondaryAuth).catch(() => {});
      }
      setAdminAccountsLoading(false);
    }
  }, [adminManageExternalMultiMajlis, adminManageExternalShowNames, adminManageMosqueKeys, adminManageName, adminManagePassword, adminManagePermissions, currentAccount?.name, firebaseRuntime?.authApi, getSecondaryAuth, isSuperAdmin, loadAdminAccounts]);

  const deleteQrRegistrationsForExternalScope = useCallback(async (scopeKey) => {
    const normalizedScopeKey = normalizeExternalScopeKey(scopeKey || '');
    if (!normalizedScopeKey) return { deleted: 0, failed: [] };

    const scopeMembers = EXTERNAL_MEMBER_DIRECTORY_DATA.filter((entry) => (
      normalizeExternalScopeKey(entry?.amarat || '') === normalizedScopeKey
    ));
    const scopedIdNumbers = new Set(scopeMembers.map((entry) => String(entry?.idNumber || '').trim()).filter(Boolean));

    const registrationIds = await listGlobalDocIds(QR_REGISTRATION_COLLECTION).catch(() => []);
    const failures = [];
    let deleted = 0;
    await Promise.all(registrationIds.map(async (registrationDocId) => {
      try {
        const registration = await getGlobalDocData(QR_REGISTRATION_COLLECTION, registrationDocId).catch(() => null);
        if (!registration) return;
        const isExternalRegistration = String(registration?.mosqueKey || '') === EXTERNAL_MOSQUE_KEY;
        if (!isExternalRegistration) return;
        const registrationIdNumber = String(registration?.idNumber || '').trim();
        const matchesScope = scopedIdNumbers.has(registrationIdNumber);
        if (!matchesScope) return;
        await deleteGlobalDocData(QR_REGISTRATION_COLLECTION, registrationDocId);
        deleted += 1;
      } catch (error) {
        failures.push({ id: registrationDocId, error: String(error?.message || error || 'unknown') });
      }
    }));
    return { deleted, failed: failures };
  }, []);

  const deleteManagedAccount = useCallback((account) => {
    if (!isSuperAdmin || !account || account.isSuperAdmin) return;

    const performDelete = async () => {
      try {
        const docId = String(account.nameKey || normalizeAccountNameKey(account.name));
        const targetCollection = account?.isExternalGuest ? ADMIN_EXTERNAL_ACCOUNTS_COLLECTION : ADMIN_ACCOUNTS_COLLECTION;
        if (account?.isExternalGuest) {
          const fallbackScopeKey = normalizeExternalScopeKey(account?.externalMosqueName || account?.name || docId);
          const scopeKeys = new Set([fallbackScopeKey].filter(Boolean));
          const [configByNameKey, configByScopeKey] = await Promise.all([
            getGlobalDocData(EXTERNAL_CONFIG_COLLECTION, docId).catch(() => null),
            fallbackScopeKey ? getGlobalDocData(EXTERNAL_CONFIG_COLLECTION, fallbackScopeKey).catch(() => null) : Promise.resolve(null),
          ]);
          [configByNameKey, configByScopeKey].forEach((cfg) => {
            const scoped = normalizeExternalScopeKey(cfg?.scopeKey || cfg?.mosqueName || '');
            if (scoped) scopeKeys.add(scoped);
          });
          const cleanupResults = await Promise.all(Array.from(scopeKeys).map(async (scopeKey) => {
            const scopedCollectionResults = await Promise.all(EXTERNAL_SCOPE_PURGE_BASE_COLLECTIONS.map((baseCollection) => (
              deleteAllGlobalDocsInCollection(`${baseCollection}_ext_${scopeKey}`)
            )));
            const qrCleanupResult = await deleteQrRegistrationsForExternalScope(scopeKey);
            await Promise.all([
              deleteGlobalDocData(`${PRAYER_OVERRIDE_COLLECTION}_ext_${scopeKey}`, PRAYER_OVERRIDE_GLOBAL_DOC_ID).catch(() => {}),
              deleteGlobalDocData(`${PRAYER_OVERRIDE_COLLECTION}_ext_${scopeKey}`, PRAYER_OVERRIDE_PENDING_DOC_ID).catch(() => {}),
              deleteGlobalDocData(`${ANNOUNCEMENT_COLLECTION}_ext_${scopeKey}`, ANNOUNCEMENT_DOC_ID).catch(() => {}),
            ]);
            return { scopeKey, scopedCollectionResults, qrCleanupResult };
          }));
          const cleanupWarnings = cleanupResults.flatMap((scopeResult) => (
            scopeResult.scopedCollectionResults.flatMap((collectionResult) => (
              (collectionResult.failed || [])
                .filter((failure) => String(failure?.id || '') === '__collection__')
                .map((failure) => ({ ...failure, scopeKey: scopeResult.scopeKey }))
            ))
          ));
          const failedDeletes = cleanupResults.flatMap((scopeResult) => (
            scopeResult.scopedCollectionResults.flatMap((collectionResult) => (
              (collectionResult.failed || [])
                .filter((failure) => String(failure?.id || '') !== '__collection__')
                .map((failure) => ({ ...failure, scopeKey: scopeResult.scopeKey }))
            ))
          ));
          const qrFailedDeletes = cleanupResults.flatMap((scopeResult) => (
            (scopeResult.qrCleanupResult?.failed || []).map((failure) => ({ ...failure, scopeKey: scopeResult.scopeKey }))
          ));
          const externalConfigDocIdsToDelete = new Set([docId, ...Array.from(scopeKeys).filter(Boolean)]);
          await Promise.all(Array.from(externalConfigDocIdsToDelete).map((configDocId) => (
            deleteGlobalDocData(EXTERNAL_CONFIG_COLLECTION, configDocId)
          )));
          if (cleanupWarnings.length) {
            console.warn('External scoped cleanup list warnings', cleanupWarnings);
          }
          if (failedDeletes.length) {
            console.error('External scoped cleanup delete failures', failedDeletes);
            throw new Error('External scoped cleanup failed');
          }
          if (qrFailedDeletes.length) {
            console.error('External QR cleanup delete failures', qrFailedDeletes);
            throw new Error('External QR cleanup failed');
          }
        }
        await deleteGlobalDocData(targetCollection, docId);
        setToast('Account gelöscht (Auth-Zugang ggf. separat entfernen)');
        await loadAdminAccounts();
      } catch (error) {
        console.error('deleteManagedAccount failed', error);
        setToast('Account konnte nicht gelöscht werden');
      }
    };

    const canUseAlert = Platform.OS !== 'web';
    if (canUseAlert) {
      Alert.alert('Account löschen', `Soll der Account ${account.name} gelöscht werden?`, [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Löschen', style: 'destructive', onPress: performDelete },
      ]);
      return;
    }

    const confirmed = typeof globalThis?.confirm === 'function'
      ? globalThis.confirm(`Soll der Account ${account.name} gelöscht werden?`)
      : true;
    if (confirmed) performDelete();
  }, [deleteQrRegistrationsForExternalScope, isSuperAdmin, loadAdminAccounts]);

  const resetGuestScopeData = useCallback(() => {
    if (!isGuestMode) return;
    const performReset = async () => {
      const resolvedScopeKey = normalizeExternalScopeKey(guestActivation?.scopeKey || guestActivation?.mosqueName || externalMosqueNameInput || '');
      if (!resolvedScopeKey) {
        setExternalMosqueNameInput('');
        setToast('Keine Local Amarat zum Zurücksetzen gefunden');
        return;
      }
      try {
        setExternalConfigSaving(true);
        const cleanupResults = await Promise.all(EXTERNAL_SCOPE_PURGE_BASE_COLLECTIONS.map((baseCollection) => (
          deleteAllGlobalDocsInCollection(`${baseCollection}_ext_${resolvedScopeKey}`)
        )));
        const qrCleanupResult = await deleteQrRegistrationsForExternalScope(resolvedScopeKey);
        await Promise.all([
          deleteGlobalDocData(`${PRAYER_OVERRIDE_COLLECTION}_ext_${resolvedScopeKey}`, PRAYER_OVERRIDE_GLOBAL_DOC_ID).catch(() => {}),
          deleteGlobalDocData(`${PRAYER_OVERRIDE_COLLECTION}_ext_${resolvedScopeKey}`, PRAYER_OVERRIDE_PENDING_DOC_ID).catch(() => {}),
          deleteGlobalDocData(`${ANNOUNCEMENT_COLLECTION}_ext_${resolvedScopeKey}`, ANNOUNCEMENT_DOC_ID).catch(() => {}),
        ]);
        const cleanupWarnings = cleanupResults.flatMap((collectionResult) => (
          (collectionResult.failed || [])
            .filter((failure) => String(failure?.id || '') === '__collection__')
            .map((failure) => ({ ...failure, scopeKey: resolvedScopeKey }))
        ));
        const failedDeletes = cleanupResults.flatMap((collectionResult) => (
          (collectionResult.failed || [])
            .filter((failure) => String(failure?.id || '') !== '__collection__')
            .map((failure) => ({ ...failure, scopeKey: resolvedScopeKey }))
        ));
        if (cleanupWarnings.length) {
          console.warn('Guest scope reset list warnings', cleanupWarnings);
        }
        if (failedDeletes.length) {
          console.error('Guest scope reset cleanup failures', failedDeletes);
          throw new Error('Guest scope reset cleanup failed');
        }
        if ((qrCleanupResult?.failed || []).length) {
          console.error('Guest scope reset QR cleanup failures', qrCleanupResult.failed);
          throw new Error('Guest scope reset QR cleanup failed');
        }

        const accountNameKey = currentAccount?.nameKey || normalizeAccountNameKey(currentAccount?.name || '');
        const configDocIds = new Set([accountNameKey, resolvedScopeKey].filter(Boolean));
        await Promise.all(Array.from(configDocIds).map((configId) => (
          deleteGlobalDocData(EXTERNAL_CONFIG_COLLECTION, configId).catch(() => {})
        )));

        await AsyncStorage.removeItem(STORAGE_KEYS.guestActivation).catch(() => {});
        setGuestActivation(null);
        setExternalMosqueNameInput('');
        if (currentAccount?.nameKey) {
          await setGlobalDocData(ADMIN_EXTERNAL_ACCOUNTS_COLLECTION, currentAccount.nameKey, {
            ...buildExternalAccountWritePayload(currentAccount),
            externalMosqueName: '',
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        }
        setToast(`Local Amarat zurückgesetzt und Daten gelöscht (${Number(qrCleanupResult?.deleted) || 0} QR-Registrierungen entfernt)`);
      } catch (error) {
        console.error('resetGuestScopeData failed', error);
        setToast('Zurücksetzen fehlgeschlagen');
      } finally {
        setExternalConfigSaving(false);
      }
    };

    const canUseAlert = Platform.OS !== 'web';
    if (canUseAlert) {
      Alert.alert(
        'Local Amarat zurücksetzen',
        'Sollen alle Daten dieser externen Amarat gelöscht und das Feld zurückgesetzt werden?',
        [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Zurücksetzen', style: 'destructive', onPress: performReset },
        ],
      );
      return;
    }
    const confirmed = typeof globalThis?.confirm === 'function'
      ? globalThis.confirm('Sollen alle Daten dieser externen Amarat gelöscht und das Feld zurückgesetzt werden?')
      : true;
    if (confirmed) performReset();
  }, [currentAccount, deleteQrRegistrationsForExternalScope, externalMosqueNameInput, guestActivation?.mosqueName, guestActivation?.scopeKey, isGuestMode]);

  const internalMosqueOptions = useMemo(
    () => MOSQUE_OPTIONS.filter((option) => option.key !== EXTERNAL_MOSQUE_KEY),
    [],
  );

  const toggleDbResetMosqueSelection = useCallback((categoryKey, mosqueKey) => {
    setDbResetSelectionByCategory((prev) => {
      const current = Array.isArray(prev?.[categoryKey]) ? prev[categoryKey] : [];
      const exists = current.includes(mosqueKey);
      return {
        ...prev,
        [categoryKey]: exists
          ? current.filter((key) => key !== mosqueKey)
          : [...current, mosqueKey],
      };
    });
  }, []);

  const runInternalDbReset = useCallback((category) => {
    if (isGuestMode) return;
    const selectedMosqueKeys = Array.isArray(dbResetSelectionByCategory?.[category.key]) ? dbResetSelectionByCategory[category.key] : [];
    if (!selectedMosqueKeys.length) {
      setToast('Bitte mindestens eine Moschee auswählen');
      return;
    }

    const performReset = async () => {
      try {
        setDbResetLoadingByCategory((prev) => ({ ...prev, [category.key]: true }));
        let deletedCount = 0;
        let failureCount = 0;

        if (category.key === 'qr') {
          const registrationIds = await listGlobalDocIds(QR_REGISTRATION_COLLECTION).catch(() => []);
          const registrationRows = await Promise.all(
            registrationIds.map((id) => getGlobalDocData(QR_REGISTRATION_COLLECTION, id).catch(() => null)),
          );
          const deleteTargets = registrationIds.filter((id, index) => {
            const mosqueKey = getMosqueOptionByKey(registrationRows[index]?.mosqueKey || DEFAULT_MOSQUE_KEY).key;
            return selectedMosqueKeys.includes(mosqueKey);
          });
          await Promise.all(deleteTargets.map(async (id) => {
            try {
              await deleteGlobalDocData(QR_REGISTRATION_COLLECTION, id);
              deletedCount += 1;
            } catch (error) {
              failureCount += 1;
            }
          }));
        } else {
          const collectionResults = await Promise.all(
            selectedMosqueKeys.flatMap((mosqueKey) => (
              category.collections.map((collection) => deleteAllDocsInCollectionForMosque(collection, mosqueKey))
            )),
          );
          collectionResults.forEach((result) => {
            deletedCount += Number(result?.deleted) || 0;
            failureCount += Array.isArray(result?.failed) ? result.failed.length : 0;
          });
        }

        setToast(
          failureCount
            ? `${category.label}: ${deletedCount} Einträge gelöscht, ${failureCount} Fehler`
            : `${category.label}: ${deletedCount} Einträge gelöscht ✓`,
        );
      } catch (error) {
        console.error('runInternalDbReset failed', error);
        setToast(`${category.label} konnte nicht gelöscht werden`);
      } finally {
        setDbResetLoadingByCategory((prev) => ({ ...prev, [category.key]: false }));
      }
    };

    const selectedLabels = internalMosqueOptions
      .filter((option) => selectedMosqueKeys.includes(option.key))
      .map((option) => option.label)
      .join(', ');
    const confirmText = `${category.label} für folgende Moscheen löschen: ${selectedLabels}?`;
    const canUseAlert = Platform.OS !== 'web';
    if (canUseAlert) {
      Alert.alert(
        `${category.label} löschen`,
        confirmText,
        [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Löschen', style: 'destructive', onPress: performReset },
        ],
      );
      return;
    }
    const confirmed = typeof globalThis?.confirm === 'function'
      ? globalThis.confirm(confirmText)
      : true;
    if (confirmed) performReset();
  }, [dbResetSelectionByCategory, internalMosqueOptions, isGuestMode]);

  const updateManagedPermissions = useCallback(async (account, nextPermissions) => {
    if (!isSuperAdmin || !account || account.isSuperAdmin || account?.isExternalGuest) return;
    try {
      await setGlobalDocData(ADMIN_ACCOUNTS_COLLECTION, normalizeAccountNameKey(account.name), {
        ...account,
        permissions: { ...nextPermissions },
        updatedAt: new Date().toISOString(),
      });
      await loadAdminAccounts();
      setToast('Rechte aktualisiert ✓');
    } catch (error) {
      console.error('updateManagedPermissions failed', error);
      setToast('Rechte konnten nicht aktualisiert werden');
    }
  }, [isSuperAdmin, loadAdminAccounts]);

  const updateManagedExternalOptions = useCallback(async (account, nextOptions) => {
    if (!isSuperAdmin || !account || !account?.isExternalGuest) return;
    try {
      const docId = normalizeAccountNameKey(account.nameKey || account.name);
      await setGlobalDocData(ADMIN_EXTERNAL_ACCOUNTS_COLLECTION, docId, buildExternalAccountWritePayload(account, {
        externalMultipleMajalis: Boolean(nextOptions?.externalMultipleMajalis),
        externalShowNames: Boolean(nextOptions?.externalShowNames),
      }));
      await loadAdminAccounts();
      setToast('Extern-Optionen aktualisiert ✓');
    } catch (error) {
      console.error('updateManagedExternalOptions failed', error);
      setToast('Extern-Optionen konnten nicht aktualisiert werden');
    }
  }, [isSuperAdmin, loadAdminAccounts]);

  const handleLogoPress = useCallback(() => {
    if (currentAccount) {
      setToast(`Bereits eingeloggt als ${currentAccount.name}`);
      return;
    }
    setActiveTab('gebetsplan');
    setAdminTapCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setAdminLoginVisible(true);
        return 0;
      }
      return next;
    });
  }, [currentAccount]);

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 900;
  const contentContainerStyle = [styles.content, isTablet && styles.contentTablet];
  const logoSource = isDarkMode ? APP_LOGO_DARK : APP_LOGO_LIGHT;
  const now = useMemo(() => {
    const d = applyForcedTestDate(getBerlinNow());
    if (isValidTime(FORCE_TIME)) {
      d.setHours(Number(FORCE_TIME.slice(0, 2)), Number(FORCE_TIME.slice(3)), 0, 0);
    }
    return d;
  }, [refreshTick]);
  useEffect(() => {
    const guestScope = isGuestMode ? guestActivation?.scopeKey : '';
    setActiveMosqueScope(activeMosqueKey, guestScope);
  }, [activeMosqueKey, guestActivation?.scopeKey, isGuestMode]);
  const todayISO = toISO(now);
  const tomorrowISO = useMemo(() => toISO(addDays(now, 1)), [now]);
  const overrideDisplayDate = useMemo(() => addDays(now, overrideEditDayOffset), [now, overrideEditDayOffset]);
  const overrideDisplayDateISO = useMemo(() => toISO(overrideDisplayDate), [overrideDisplayDate]);
  useEffect(() => { if (!selectedStatsDateISO) setSelectedStatsDateISO(todayISO); }, [todayISO, selectedStatsDateISO]);
  useEffect(() => {
    if (selectedStatsWeekStartISO) return;
    setSelectedStatsWeekStartISO(toISO(startOfWeekMonday(now)));
  }, [now, selectedStatsWeekStartISO]);
  const programConfigToday = programConfigByDate[todayISO] || null;
  const availableProgramConfigOptions = useMemo(() => (
    Object.entries(programConfigByDate || {})
      .filter(([iso, config]) => /^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))
        && isValidTime(config?.startTime)
        && Boolean(headlineToLegacyName(buildHeadlineConfig(config))))
      .map(([iso, config]) => {
        const headline = buildHeadlineConfig(config);
        const programName = headlineToLegacyName(headline);
        const programKey = toLocationKey(programName);
        return {
          docId: `${iso}_${programKey}`,
          iso: String(iso),
          programKey,
          programName,
          headline,
          source: 'config',
        };
      })
      .sort((a, b) => b.docId.localeCompare(a.docId))
  ), [programConfigByDate]);
  const programWindow = useMemo(() => {
    const headline = buildHeadlineConfig(programConfigToday);
    if (!programConfigToday || !isValidTime(programConfigToday.startTime) || !headlineToLegacyName(headline)) {
      return { isConfigured: false, isActive: false, label: null, minutesUntilOpen: null };
    }

    const startMinutes = Number(programConfigToday.startTime.slice(0, 2)) * 60 + Number(programConfigToday.startTime.slice(3));
    const openMinutes = startMinutes - 30;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const isActive = nowMinutes >= openMinutes;

    return {
      isConfigured: true,
      isActive,
      label: headlineToLegacyName(headline),
      headline,
      startTime: programConfigToday.startTime,
      opensAt: `${pad(Math.floor((((openMinutes % 1440) + 1440) % 1440) / 60))}:${pad((((openMinutes % 1440) + 1440) % 1440) % 60)}`,
      minutesUntilOpen: isActive ? 0 : Math.max(0, openMinutes - nowMinutes),
      minutesUntilStart: Math.max(0, startMinutes - nowMinutes),
    };
  }, [now, programConfigToday]);
  const availableProgramStatsOptions = useMemo(() => {
    const normalizeProgramNameFromKey = (value) => String(value || '')
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const parsedDocs = programStatsDocIds
      .map((docId) => {
        const raw = String(docId || '');
        const match = raw.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
        if (!match) return null;
        return {
          docId: raw,
          iso: String(match[1]),
          programKey: String(match[2] || ''),
          programName: String(programStatsNamesByDocId[raw] || '').trim() || normalizeProgramNameFromKey(match[2] || ''),
          source: 'stats',
        };
      })
      .filter(Boolean);

    const merged = [...parsedDocs, ...availableProgramConfigOptions];
    const byDocId = new Map();
    merged.forEach((entry) => {
      if (!entry?.docId) return;
      const prev = byDocId.get(entry.docId);
      if (!prev || (prev.source !== 'stats' && entry.source === 'stats')) {
        byDocId.set(entry.docId, entry);
      }
    });

    return Array.from(byDocId.values())
      .sort((a, b) => b.docId.localeCompare(a.docId))
      .map((entry) => {
        const dateObj = parseISO(entry.iso);
        const dateLabel = dateObj
          ? (() => {
            const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(dateObj).replace(/\.$/, '');
            const datePart = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dateObj);
            return `${weekday}, ${datePart}`;
          })()
          : entry.iso;
        return {
          ...entry,
          label: `${dateLabel} · ${entry.programName}`,
        };
      });
  }, [programStatsDocIds, availableProgramConfigOptions, programStatsNamesByDocId]);

  const selectedProgramStatsOption = useMemo(() => {
    if (selectedProgramStatsDocId) {
      const selected = availableProgramStatsOptions.find((item) => item.docId === selectedProgramStatsDocId);
      if (selected) return selected;
    }
    return availableProgramStatsOptions[0] || null;
  }, [availableProgramStatsOptions, selectedProgramStatsDocId]);
  const selectedProgramConfigDateISO = String(selectedProgramStatsOption?.iso || '');
  const selectedProgramConfig = selectedProgramConfigDateISO
    ? (programConfigByDate[selectedProgramConfigDateISO] || null)
    : null;
  const selectedProgramLabel = useMemo(() => {
    const name = String(
      selectedProgramStatsOption?.programName
      || headlineToLegacyName(buildHeadlineConfig(selectedProgramConfig))
      || '',
    ).trim();
    if (!name) return '—';
    if (selectedProgramConfigDateISO === todayISO) return `${name} (heute)`;
    const dateObj = parseISO(selectedProgramConfigDateISO || '');
    if (!dateObj) return name;
    const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(dateObj).replace(/\.$/, '');
    const datePart = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dateObj);
    return `${name} (${weekday}, ${datePart})`;
  }, [selectedProgramStatsOption, selectedProgramConfig, selectedProgramConfigDateISO, todayISO]);
  const availableRegistrationStatsOptions = useMemo(() => (
    Object.values(registrationConfigById || {})
      .map((config) => normalizeRegistrationConfig(config, config?.id || ''))
      .filter((config) => config.startDate && config.endDate && config.name)
      .sort((a, b) => String(b.startDate || '').localeCompare(String(a.startDate || '')) || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
      .map((config) => ({
        ...config,
        label: `${config.startDate} bis ${config.endDate} · ${headlineToLegacyName(config)}`,
      }))
  ), [registrationConfigById]);
  const selectedRegistrationStatsOption = useMemo(() => {
    if (selectedRegistrationStatsConfigId) {
      const selected = availableRegistrationStatsOptions.find((item) => item.id === selectedRegistrationStatsConfigId);
      if (selected) return selected;
    }
    return availableRegistrationStatsOptions[0] || null;
  }, [availableRegistrationStatsOptions, selectedRegistrationStatsConfigId]);
  const activeRegistrationConfig = useMemo(() => {
    const configs = Object.values(registrationConfigById || {})
      .map((config) => normalizeRegistrationConfig(config, config?.id || ''))
      .filter((config) => config.startDate && config.endDate && config.name);
    if (!configs.length) return null;
    const open = configs
      .filter((config) => !config.disabled && todayISO >= config.startDate && todayISO <= config.endDate)
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0];
    if (open) return open;
    return configs.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0] || null;
  }, [registrationConfigById, todayISO]);
  const registrationWindow = useMemo(() => {
    const config = activeRegistrationConfig;
    const state = getRegistrationWindowState(config, todayISO);
    return {
      config,
      ...state,
      canAccess: Boolean(config && state.hasRange),
      isPublic: Boolean(config?.advanced?.isPublic),
      onlyEhlVoters: !isGuestMode && Boolean(config?.advanced?.onlyEhlVoters),
      allowDecline: isGuestMode ? Boolean(config?.advanced?.allowDecline) : true,
      loginEnabled: !isGuestMode && Boolean(config?.advanced?.loginEnabled),
      includeTanzeems: config?.advanced?.includeTanzeems || [...REGISTRATION_TANZEEM_OPTIONS],
    };
  }, [activeRegistrationConfig, isGuestMode, todayISO]);
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
        { id: 'ishaa', label: 'Ishaa (العشاء)', time: timesToday.ishaa, activeKeys: ['ishaa'] },
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
  }, [now, timesToday, programConfigToday, programWindow.isActive]);

  const getMinutes = (time) => (isValidTime(time) ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : null);
  const formatMinutes = (mins) => `${pad(Math.floor((((mins % 1440) + 1440) % 1440) / 60))}:${pad((((mins % 1440) + 1440) % 1440) % 60)}`;
  const formatMinutesUntil = (mins) => {
    const safe = Math.max(0, Number(mins) || 0);
    const hours = Math.floor(safe / 60);
    const minutes = safe % 60;
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  };

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

  const getRuntimePrayerContext = useCallback((overrideConfig, availablePrayerDates = []) => {
    const runtimeNow = applyForcedTestDate(getBerlinNow());
    if (isValidTime(FORCE_TIME)) {
      runtimeNow.setHours(Number(FORCE_TIME.slice(0, 2)), Number(FORCE_TIME.slice(3)), 0, 0);
    }
    const runtimeISO = toISO(runtimeNow);
    const runtimeIsRamadanToday = runtimeISO <= RAMADAN_END_ISO;
    const runtimeSelectedISO = runtimeIsRamadanToday ? (RAMADAN_RAW[runtimeISO] ? runtimeISO : findClosestISO(runtimeISO, availablePrayerDates)) : null;
    const runtimeRaw = runtimeSelectedISO ? RAMADAN_RAW[runtimeSelectedISO] : null;
    const runtimeBaseTimesToday = buildPrayerTimes(runtimeRaw, runtimeIsRamadanToday);
    const runtimeWithManual = applyManualPrayerAdjustments(runtimeBaseTimesToday, overrideConfig);
    const runtimeTimesToday = applyPrayerTimeOverride(runtimeWithManual, overrideConfig);
    const runtimeTomorrowISO = toISO(addDays(runtimeNow, 1));
    const runtimeIsRamadanTomorrow = runtimeTomorrowISO <= RAMADAN_END_ISO;
    const runtimeTomorrowRaw = runtimeIsRamadanTomorrow ? (RAMADAN_RAW[runtimeTomorrowISO] || null) : null;
    const runtimeTimesTomorrow = buildPrayerTimes(runtimeTomorrowRaw, runtimeIsRamadanTomorrow);
    const runtimePrayerWindow = resolvePrayerWindow(runtimeNow, runtimeTimesToday, runtimeTimesTomorrow);
    return {
      now: runtimeNow,
      iso: runtimeISO,
      timesToday: runtimeTimesToday,
      timesTomorrow: runtimeTimesTomorrow,
      prayerWindow: runtimePrayerWindow,
    };
  }, [resolvePrayerWindow]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (activeTab !== 'terminal') return;
    terminalScrollRef.current?.scrollTo?.({ y: 0, animated: false });
    const rafId = requestAnimationFrame(() => {
      terminalScrollRef.current?.scrollTo?.({ y: 0, animated: false });
    });
    return () => cancelAnimationFrame(rafId);
  }, [activeTab, terminalMode, attendanceMode]);

  useEffect(() => {
    if (terminalMode !== 'idSelection') {
      setIdSearchQuery('');
      setIsIdSearchFocused(false);
    }
  }, [terminalMode, selectedTanzeem, selectedMajlis]);

  useEffect(() => {
    if (attendanceMode !== 'registration') return;
    const allowed = registrationWindow.canAccess && (normalizedAppMode === 'registration' ? true : (registrationWindow.isPublic || Boolean(currentAccount)));
    if (!allowed) {
      if (normalizedAppMode === 'registration') {
        setTerminalMode('tanzeem');
        setPendingRegistrationMember(null);
        return;
      }
      setAttendanceMode('prayer');
      setTerminalMode('tanzeem');
      setPendingRegistrationMember(null);
    }
  }, [attendanceMode, currentAccount, registrationWindow.canAccess, registrationWindow.isPublic]);

  useEffect(() => {
    let cancelled = false;
    setPrayerOverrideReady(false);
    setOverrideLoading(true);
    const applyEditableOverride = (baseOverride, pendingOverride) => {
      const isTomorrowEdit = overrideEditDayOffset === 1;
      const hasPendingForDisplayDate = pendingOverride?.dateISO === overrideDisplayDateISO;
      const source = hasPendingForDisplayDate
        ? pendingOverride
        : (isTomorrowEdit ? null : baseOverride);
      const normalized = normalizePrayerOverride(source);
      if (cancelled) return;
      setPrayerOverride(baseOverride);
      setPendingPrayerOverride(pendingOverride);
      setOverrideEnabled(normalized.enabled);
      setOverrideSoharAsrTime(normalized.soharAsrTime || '');
      setOverrideMaghribIshaaTime(normalized.maghribIshaaTime || '');
      setManualFajrTime(normalized.manualTimes.fajr || '');
      setManualSoharTime(normalized.manualTimes.sohar || '');
      setManualAsrTime(normalized.manualTimes.asr || '');
      setManualMaghribTime(normalized.manualTimes.maghrib || '');
      setManualIshaaTime(normalized.manualTimes.ishaa || '');
      setPrayerOverrideReady(true);
      setOverrideLoading(false);
    };
    const applyFromData = (globalData, pendingData) => {
      applyEditableOverride(normalizePrayerOverride(globalData), normalizePendingPrayerOverride(pendingData));
    };

    if (!firebaseRuntime || !hasFirebaseConfig()) {
      Promise.all([
        getDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_GLOBAL_DOC_ID, activeMosqueKey),
        getDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_PENDING_DOC_ID, activeMosqueKey),
      ])
        .then(([globalData, pendingData]) => applyFromData(globalData, pendingData))
        .catch(() => {
          if (!cancelled) {
            setPrayerOverrideReady(true);
            setOverrideLoading(false);
            setToast('Override konnte nicht geladen werden');
          }
        });
      return () => {
        cancelled = true;
      };
    }

    const baseCollection = resolveScopedCollectionForMosque(PRAYER_OVERRIDE_COLLECTION, activeMosqueKey);
    const globalRef = firebaseRuntime.doc(firebaseRuntime.db, baseCollection, PRAYER_OVERRIDE_GLOBAL_DOC_ID);
    const pendingRef = firebaseRuntime.doc(firebaseRuntime.db, baseCollection, PRAYER_OVERRIDE_PENDING_DOC_ID);
    let latestGlobal = null;
    let latestPending = null;
    let globalSnapshotReady = false;
    let pendingSnapshotReady = false;

    const sync = () => {
      if (!globalSnapshotReady || !pendingSnapshotReady) return;
      applyFromData(latestGlobal, latestPending);
    };

    const unsubGlobal = firebaseRuntime.onSnapshot(
      globalRef,
      (snapshot) => {
        latestGlobal = snapshot.exists() ? snapshot.data() : null;
        globalSnapshotReady = true;
        sync();
      },
      () => {
        if (!cancelled) {
          setPrayerOverrideReady(true);
          setOverrideLoading(false);
          setToast('Override konnte nicht geladen werden');
        }
      },
    );

    const unsubPending = firebaseRuntime.onSnapshot(
      pendingRef,
      (snapshot) => {
        latestPending = snapshot.exists() ? snapshot.data() : null;
        pendingSnapshotReady = true;
        sync();
      },
      () => {
        if (!cancelled) {
          setPrayerOverrideReady(true);
          setOverrideLoading(false);
          setToast('Override konnte nicht geladen werden');
        }
      },
    );

    return () => {
      cancelled = true;
      unsubGlobal();
      unsubPending();
    };
  }, [activeExternalScopeDependency, activeMosqueKey, overrideDisplayDateISO]);

  useEffect(() => {
    setOverrideEditDayOffset(0);
    overrideEditDayOffsetRef.current = 0;
    setOverrideMetaTapCount(0);
  }, [activeExternalScopeDependency, activeMosqueKey]);

  useEffect(() => {
    overrideEditDayOffsetRef.current = overrideEditDayOffset;
  }, [overrideEditDayOffset]);

  useEffect(() => {
    if (!pendingPrayerOverride || pendingPrayerOverride.dateISO !== todayISO) return;

    const rolloutPendingOverride = async () => {
      try {
        const currentGlobalOverride = normalizePrayerOverride(await getDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_GLOBAL_DOC_ID, activeMosqueKey));
        await setDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_GLOBAL_DOC_ID, {
          enabled: pendingPrayerOverride.enabled || currentGlobalOverride.enabled,
          soharAsrTime: pendingPrayerOverride.soharAsrTime || currentGlobalOverride.soharAsrTime || null,
          maghribIshaaTime: pendingPrayerOverride.maghribIshaaTime || currentGlobalOverride.maghribIshaaTime || null,
          manualTimes: {
            fajr: pendingPrayerOverride.manualTimes.fajr || currentGlobalOverride.manualTimes.fajr || null,
            sohar: pendingPrayerOverride.manualTimes.sohar || currentGlobalOverride.manualTimes.sohar || null,
            asr: pendingPrayerOverride.manualTimes.asr || currentGlobalOverride.manualTimes.asr || null,
            maghrib: pendingPrayerOverride.manualTimes.maghrib || currentGlobalOverride.manualTimes.maghrib || null,
            ishaa: pendingPrayerOverride.manualTimes.ishaa || currentGlobalOverride.manualTimes.ishaa || null,
          },
          updatedAt: new Date().toISOString(),
        }, activeMosqueKey);
        await deleteDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_PENDING_DOC_ID, activeMosqueKey);
      } catch {
        setToast('Morgen-Override konnte nicht übernommen werden');
      }
    };

    rolloutPendingOverride();
  }, [activeExternalScopeDependency, pendingPrayerOverride, todayISO, activeMosqueKey]);

  const onOverrideMetaPress = () => {
    setOverrideMetaTapCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        const nextOffset = overrideEditDayOffsetRef.current === 0 ? 1 : 0;
        overrideEditDayOffsetRef.current = nextOffset;
        setOverrideEditDayOffset(nextOffset);
        return 0;
      }
      return next;
    });
  };

  const onOverrideEnabledChange = (value) => {
    setOverrideEnabled(value);
    if (!value) {
      setOverrideSoharAsrTime('');
      setOverrideMaghribIshaaTime('');
    }
  };

  const savePrayerOverride = async () => {
    if (!effectivePermissions.canEditSettings) { setToast('Keine Berechtigung'); return; }
    const cleanSoharAsr = overrideSoharAsrTime.trim();
    const cleanMaghribIshaa = overrideMaghribIshaaTime.trim();
    const targetOverrideDateISO = overrideDisplayDateISO > todayISO ? overrideDisplayDateISO : null;

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
      const isFutureEdit = Boolean(targetOverrideDateISO);
      const editableOverride = normalizePrayerOverride(
        isFutureEdit && pendingPrayerOverride?.dateISO === targetOverrideDateISO
          ? pendingPrayerOverride
          : prayerOverride,
      );
      const payloadWithMergedManualTimes = {
        ...payload,
        manualTimes: {
          fajr: payload.manualTimes.fajr || editableOverride.manualTimes.fajr || null,
          sohar: payload.manualTimes.sohar || editableOverride.manualTimes.sohar || null,
          asr: payload.manualTimes.asr || editableOverride.manualTimes.asr || null,
          maghrib: payload.manualTimes.maghrib || editableOverride.manualTimes.maghrib || null,
          ishaa: payload.manualTimes.ishaa || editableOverride.manualTimes.ishaa || null,
        },
      };
      if (isFutureEdit) {
        await setDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_PENDING_DOC_ID, {
          ...payloadWithMergedManualTimes,
          dateISO: targetOverrideDateISO,
        }, activeMosqueKey);
        setToast('Override für morgen gespeichert ✓');
      } else {
        await setDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_GLOBAL_DOC_ID, payloadWithMergedManualTimes, activeMosqueKey);
        setPrayerOverride(normalizePrayerOverride(payloadWithMergedManualTimes));
        setToast('Override gespeichert ✓');
      }
      setRefreshTick((v) => v + 1);
    } catch {
      Alert.alert('Fehler', 'Override konnte nicht gespeichert werden.');
    } finally {
      setOverrideSaving(false);
    }
  };

  const saveManualPrayerTimes = async () => {
    if (!effectivePermissions.canEditSettings) { setToast('Keine Berechtigung'); return; }
    const targetOverrideDateISO = overrideDisplayDateISO > todayISO ? overrideDisplayDateISO : null;
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
    try {
      setOverrideSaving(true);
      const isFutureEdit = Boolean(targetOverrideDateISO);
      const editableOverride = normalizePrayerOverride(
        isFutureEdit && pendingPrayerOverride?.dateISO === targetOverrideDateISO
          ? pendingPrayerOverride
          : prayerOverride,
      );
      const payload = {
        enabled: overrideEnabled || editableOverride.enabled,
        soharAsrTime: overrideSoharAsrTime.trim() || editableOverride.soharAsrTime || null,
        maghribIshaaTime: overrideMaghribIshaaTime.trim() || editableOverride.maghribIshaaTime || null,
        manualTimes: {
          fajr: manualEntries.fajr || editableOverride.manualTimes.fajr || null,
          sohar: manualEntries.sohar || editableOverride.manualTimes.sohar || null,
          asr: manualEntries.asr || editableOverride.manualTimes.asr || null,
          maghrib: manualEntries.maghrib || editableOverride.manualTimes.maghrib || null,
          ishaa: manualEntries.ishaa || editableOverride.manualTimes.ishaa || null,
        },
        updatedAt: new Date().toISOString(),
      };
      if (isFutureEdit) {
        await setDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_PENDING_DOC_ID, {
          ...payload,
          dateISO: targetOverrideDateISO,
        }, activeMosqueKey);
        setToast('Für morgen gespeichert ✓');
      } else {
        await setDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_GLOBAL_DOC_ID, payload, activeMosqueKey);
        setPrayerOverride(normalizePrayerOverride(payload));
        setToast('Gespeichert ✓');
      }
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

    const nextMinuteTs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 0, 0).getTime();
    if (nextMinuteTs > nowTs) candidates.push(nextMinuteTs);
    if (programConfigToday && isValidTime(programConfigToday.startTime)) {
      const startMins = Number(programConfigToday.startTime.slice(0, 2)) * 60 + Number(programConfigToday.startTime.slice(3));
      const openTs = atMinutesOfDay(now, startMins - 30).getTime();
      if (openTs > nowTs) candidates.push(openTs);

      if (!programWindow.isActive) {
        const nextMinuteTs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 0, 0).getTime();
        if (nextMinuteTs > nowTs) candidates.push(nextMinuteTs);
      }
    }

    const nextTickTs = candidates.length ? Math.min(...candidates) : (nowTs + 60 * 1000);
    const delay = Math.max(500, nextTickTs - nowTs + 50);
    const timer = setTimeout(() => setRefreshTick((v) => v + 1), delay);

    return () => clearTimeout(timer);
  }, [now, timesToday, programConfigToday, programWindow.isActive]);


  useEffect(() => {
    if (!adminTapCount) return undefined;
    const timer = setTimeout(() => setAdminTapCount(0), 1200);
    return () => clearTimeout(timer);
  }, [adminTapCount]);

  useEffect(() => {
    if (!mosqueSwitchTapCount) return undefined;
    const timer = setTimeout(() => setMosqueSwitchTapCount(0), 1200);
    return () => clearTimeout(timer);
  }, [mosqueSwitchTapCount]);

  useEffect(() => {
    if (!globalThemeTapCount) return undefined;
    const timer = setTimeout(() => setGlobalThemeTapCount(0), 1500);
    return () => clearTimeout(timer);
  }, [globalThemeTapCount]);

  useEffect(() => {
    if (!overrideMetaTapCount) return undefined;
    const timer = setTimeout(() => setOverrideMetaTapCount(0), 1200);
    return () => clearTimeout(timer);
  }, [overrideMetaTapCount]);

  useEffect(() => {
    ensureSuperAdminBootstrap();
  }, [ensureSuperAdminBootstrap]);

  useEffect(() => {
    if (!firebaseRuntime?.authApi || !firebaseRuntime?.auth) return undefined;
    const unsubscribe = firebaseRuntime.authApi.onAuthStateChanged(firebaseRuntime.auth, async (user) => {
      if (!user) {
        if (localSessionActiveRef.current) return;
        setCurrentAccount(null);
        return;
      }
      localSessionActiveRef.current = false;
      const nameKey = normalizeAccountNameKey(user.displayName || user.email?.split('@')[0] || '');
      if (!nameKey) {
        setCurrentAccount(null);
        return;
      }
      try {
        const account = await getGlobalDocData(isGuestMode ? ADMIN_EXTERNAL_ACCOUNTS_COLLECTION : ADMIN_ACCOUNTS_COLLECTION, nameKey);
        if (!account?.active) {
          await firebaseRuntime.authApi.signOut(firebaseRuntime.auth).catch(() => {});
          setCurrentAccount(null);
          return;
        }
        const nextMosque = resolveAccountMosquePreference(account);
        if (nextMosque) {
          setActiveMosqueKey(String(nextMosque));
        } else if (!accountMatchesActiveMosque(account)) {
          await firebaseRuntime.authApi.signOut(firebaseRuntime.auth).catch(() => {});
          setCurrentAccount(null);
          return;
        }
        setCurrentAccount(account);
        if (isGuestMode && account?.isExternalGuest) {
          const activationPayload = {
            accountNameKey: account.nameKey || nameKey,
            scopeKey: normalizeExternalScopeKey(account.externalMosqueName || account.name || nameKey),
            mosqueName: String(account.externalMosqueName || '').trim(),
            multipleMajalis: account.externalMultipleMajalis !== false,
            showNames: Boolean(account.externalShowNames),
          };
          setGuestActivation(activationPayload);
          await AsyncStorage.setItem(STORAGE_KEYS.guestActivation, JSON.stringify(activationPayload)).catch(() => {});
          setActiveMosqueKey(EXTERNAL_MOSQUE_KEY);
        }
      } catch (error) {
        console.error('Auth account load failed', error);
        setCurrentAccount(null);
      }
    });
    return () => unsubscribe();
  }, [accountMatchesActiveMosque, isGuestMode, resolveAccountMosquePreference]);

  useEffect(() => {
    if (activeTab === 'settings' && !effectivePermissions.canEditSettings) {
      setActiveTab('gebetsplan');
    }
  }, [activeTab, effectivePermissions.canEditSettings]);

  useEffect(() => {
    if (isQrExternMode) return;
    if (!isGuestMode) return;
    if (!currentAccount && !guestActivation?.scopeKey) {
      setAdminLoginVisible(true);
    }
  }, [currentAccount, guestActivation?.scopeKey, isGuestMode, isQrExternMode]);

  useEffect(() => {
    if (normalizedAppMode !== 'registration') return;
    if (!registrationWindow.canAccess || !registrationWindow.loginEnabled) return;
    if (currentAccount) return;
    setAdminLoginVisible(true);
  }, [currentAccount, normalizedAppMode, registrationWindow.canAccess, registrationWindow.loginEnabled]);

  useEffect(() => {
    if (shouldRestrictToPrayerView && activeTab !== 'gebetsplan') {
      setActiveTab('gebetsplan');
    }
  }, [activeTab, shouldRestrictToPrayerView]);

  useEffect(() => {
    if (!shouldRestrictToRegistrationView) return;
    if (activeTab !== 'terminal') setActiveTab('terminal');
    if (attendanceMode !== 'registration') setAttendanceMode('registration');
  }, [activeTab, attendanceMode, shouldRestrictToRegistrationView]);

  useEffect(() => {
    if (!shouldRestrictToQrView) return;
    if (isSecretMode) {
      setQrScanPageVisible(true);
      setQrPageVisible(false);
      return;
    }
    if (!isQrScanPageVisible) {
      setQrPageVisible(true);
    }
  }, [isQrScanPageVisible, isSecretMode, shouldRestrictToQrView]);

  useEffect(() => {
    if (isSuperAdmin) loadAdminAccounts();
  }, [isSuperAdmin, loadAdminAccounts]);


  useEffect(() => {
    if (!currentAccount || isSuperAdmin) return;
    const allowed = getAllowedMosqueKeys(currentAccount);
    if (!allowed.length) return;
    if (!allowed.includes(String(activeMosqueKey))) {
      setActiveMosqueKey(String(allowed[0]));
    }
  }, [activeMosqueKey, currentAccount, getAllowedMosqueKeys, isSuperAdmin]);

  useEffect(() => {
    const loadLocal = async () => {
      try {
        let loadedGuestScopeKey = '';
        if (isGuestMode) {
          const activationRaw = await AsyncStorage.getItem(STORAGE_KEYS.guestActivation);
          if (activationRaw) {
            const parsed = JSON.parse(activationRaw);
            if (parsed?.scopeKey) {
              loadedGuestScopeKey = String(parsed.scopeKey);
              setGuestActivation(parsed);
              setExternalMosqueNameInput(String(parsed?.mosqueName || ''));
              setActiveMosqueKey(EXTERNAL_MOSQUE_KEY);
            }
          }
        }
        const mosqueRaw = await AsyncStorage.getItem(STORAGE_KEYS.activeMosque);
        const initialMosqueKey = isGuestMode
          ? (loadedGuestScopeKey ? EXTERNAL_MOSQUE_KEY : DEFAULT_MOSQUE_KEY)
          : ((mosqueRaw && MOSQUE_OPTIONS.some((item) => item.key === mosqueRaw)) ? mosqueRaw : DEFAULT_MOSQUE_KEY);
        setActiveMosqueKey(initialMosqueKey);
        const darkRaw = await AsyncStorage.getItem(getDarkModeStorageKey(initialMosqueKey));
        const fallbackDarkRaw = await AsyncStorage.getItem(STORAGE_KEYS.darkMode);
        const resolved = (darkRaw === '1' || darkRaw === '0')
          ? darkRaw
          : ((fallbackDarkRaw === '1' || fallbackDarkRaw === '0') ? fallbackDarkRaw : null);
        if (resolved) setIsDarkMode(resolved === '1'); else setIsDarkMode(false);
      } catch (e) {
        console.warn('Failed to load local settings:', e);
      }
    };
    loadLocal();
  }, [isGuestMode]);

  useEffect(() => {
    let cancelled = false;
    const loadMosqueTheme = async () => {
      try {
        const darkRaw = await AsyncStorage.getItem(getDarkModeStorageKey(activeMosqueKey));
        const fallbackDarkRaw = await AsyncStorage.getItem(STORAGE_KEYS.darkMode);
        if (cancelled) return;
        const resolved = (darkRaw === '1' || darkRaw === '0')
          ? darkRaw
          : ((fallbackDarkRaw === '1' || fallbackDarkRaw === '0') ? fallbackDarkRaw : null);
        if (resolved) setIsDarkMode(resolved === '1'); else setIsDarkMode(false);
      } catch {}
    };
    loadMosqueTheme();
    return () => { cancelled = true; };
  }, [activeMosqueKey]);

  useEffect(() => {
    let cancelled = false;
    const storageKey = getAnnouncementStorageKey(activeMosqueKey);

    const loadLocalFallback = async () => {
      const mosqueSpecificRaw = await AsyncStorage.getItem(storageKey);
      if (cancelled) return;
      if (mosqueSpecificRaw !== null) {
        setAnnouncementInput(String(mosqueSpecificRaw));
        return;
      }
      // Backward compatibility for a previously global announcement key.
      const legacyRaw = await AsyncStorage.getItem(STORAGE_KEYS.announcementText);
      if (cancelled) return;
      setAnnouncementInput(legacyRaw !== null ? String(legacyRaw) : '');
    };

    const loadMosqueAnnouncement = async () => {
      try {
        const remote = await getDocData(ANNOUNCEMENT_COLLECTION, ANNOUNCEMENT_DOC_ID);
        const remoteText = normalizeAnnouncementText(remote?.text || '');
        if (cancelled) return;
        if (remoteText) {
          setAnnouncementInput(remoteText);
          await AsyncStorage.setItem(storageKey, remoteText).catch(() => {});
          return;
        }
        await loadLocalFallback();
      } catch {
        await loadLocalFallback().catch(() => {
          if (cancelled) return;
          setAnnouncementInput('');
        });
      }
    };

    if (firebaseRuntime && hasFirebaseConfig()) {
      const announcementRef = firebaseRuntime.doc(
        firebaseRuntime.db,
        resolveScopedCollection(ANNOUNCEMENT_COLLECTION),
        ANNOUNCEMENT_DOC_ID,
      );

      const unsubAnnouncement = firebaseRuntime.onSnapshot(
        announcementRef,
        (snapshot) => {
          const remoteText = normalizeAnnouncementText(snapshot.exists() ? (snapshot.data()?.text || '') : '');
          if (cancelled) return;
          setAnnouncementInput(remoteText);
          if (remoteText) AsyncStorage.setItem(storageKey, remoteText).catch(() => {});
          else AsyncStorage.removeItem(storageKey).catch(() => {});
        },
        () => {
          loadMosqueAnnouncement();
        },
      );

      return () => {
        cancelled = true;
        unsubAnnouncement();
      };
    }

    loadMosqueAnnouncement();
    return () => { cancelled = true; };
  }, [activeExternalScopeDependency, activeMosqueKey, firebaseRuntime]);

  const onToggleDarkMode = async (value, applyGlobally = false) => {
    Animated.sequence([
      Animated.timing(themePulseAnim, { toValue: 0.96, duration: 140, useNativeDriver: true }),
      Animated.spring(themePulseAnim, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 8 }),
    ]).start();
    setIsDarkMode(value);
    const entries = [
      [getDarkModeStorageKey(activeMosqueKey), value ? '1' : '0'],
      [STORAGE_KEYS.darkMode, value ? '1' : '0'],
    ];
    if (applyGlobally) {
      MOSQUE_OPTIONS.forEach((option) => {
        const key = getDarkModeStorageKey(option.key);
        if (!entries.some(([existing]) => existing === key)) {
          entries.push([key, value ? '1' : '0']);
        }
      });
    }
    await AsyncStorage.multiSet(entries);
  };

  const handleGlobalThemeToggleTrigger = useCallback(() => {
    setGlobalThemeTapCount((prev) => {
      const next = prev + 1;
      if (next < 7) return next;
      onToggleDarkMode(!isDarkMode, true);
      setToast(`Globaler Modus: ${!isDarkMode ? 'Dark' : 'Light'}`);
      return 0;
    });
  }, [isDarkMode]);

  const saveAnnouncement = useCallback(async () => {
    try {
      const normalized = normalizeAnnouncementText(announcementInput);
      const storageKey = getAnnouncementStorageKey(activeMosqueKey);
      await setDocData(ANNOUNCEMENT_COLLECTION, ANNOUNCEMENT_DOC_ID, {
        text: normalized || '',
        updatedAt: new Date().toISOString(),
      });
      if (normalized) {
        await AsyncStorage.setItem(storageKey, normalized);
        setToast('Ankündigung gespeichert');
      } else {
        await AsyncStorage.removeItem(storageKey);
        setToast('Ankündigung entfernt');
      }
      setAnnouncementInput(normalized);
    } catch (error) {
      console.error('Failed to save announcement', error);
      setToast('Ankündigung konnte nicht gespeichert werden');
    }
  }, [activeMosqueKey, announcementInput]);

  const clearAnnouncement = useCallback(async () => {
    try {
      await setDocData(ANNOUNCEMENT_COLLECTION, ANNOUNCEMENT_DOC_ID, {
        text: '',
        updatedAt: new Date().toISOString(),
      });
      await AsyncStorage.removeItem(getAnnouncementStorageKey(activeMosqueKey));
      setAnnouncementInput('');
      setToast('Ankündigung entfernt');
    } catch (error) {
      console.error('Failed to clear announcement', error);
      setToast('Ankündigung konnte nicht entfernt werden');
    }
  }, [activeMosqueKey]);

  const onSelectMosque = async (key) => {
    if (isGuestMode && String(key) !== EXTERNAL_MOSQUE_KEY) return;
    if (currentAccount && !isSuperAdmin) {
      const allowed = getAllowedMosqueKeys(currentAccount);
      if (!allowed.includes(String(key || ''))) return;
    }
    const next = getMosqueOptionByKey(key).key;
    setActiveMosqueScope(next);
    setActiveMosqueKey(next);
    await AsyncStorage.setItem(STORAGE_KEYS.activeMosque, next);
    detailedLogsCacheRef.current = {};
    setSelectedDetailedMember(null);
    setDetailedMemberLogs([]);
    setProgramConfigByDate({});
    setStatsAttendance(null);
    setWeeklyAttendanceDocs({});
    setRefreshTick((v) => v + 1);
  };

  const saveMosquePreference = useCallback(async () => {
    if (!currentAccount) return;
    if (!isSuperAdmin) {
      const allowed = getAllowedMosqueKeys(currentAccount);
      if (allowed.length <= 1) {
        setToast('Keine speicherbare Auswahl');
        return;
      }
      if (!allowed.includes(String(activeMosqueKey || ''))) {
        setToast('Auswahl nicht erlaubt');
        return;
      }
    }

    const docId = normalizeAccountNameKey(currentAccount?.nameKey || currentAccount?.name || '');
    if (!docId) return;
    try {
      setMosquePreferenceSaving(true);
      await setGlobalDocData(ADMIN_ACCOUNTS_COLLECTION, docId, {
        ...currentAccount,
        nameKey: docId,
        preferredMosqueId: String(activeMosqueKey),
        updatedAt: new Date().toISOString(),
      });
      setCurrentAccount((prev) => (prev ? { ...prev, preferredMosqueId: String(activeMosqueKey) } : prev));
      setToast('Moschee-Präferenz gespeichert ✓');
    } catch (error) {
      console.error('saveMosquePreference failed', error);
      setToast('Moschee-Präferenz konnte nicht gespeichert werden');
    } finally {
      setMosquePreferenceSaving(false);
    }
  }, [activeMosqueKey, currentAccount, getAllowedMosqueKeys, isSuperAdmin]);

  const handleMosqueSwitchTrigger = useCallback(() => {
    if (currentAccount) return;
    setMosqueSwitchTapCount((prev) => {
      const next = prev + 1;
      if (next < 3) return next;
      const availableOptions = MOSQUE_OPTIONS.filter((option) => isGuestMode ? option.key === EXTERNAL_MOSQUE_KEY : option.key !== EXTERNAL_MOSQUE_KEY);
      const currentIndex = availableOptions.findIndex((option) => option.key === activeMosqueKey);
      const nextOption = availableOptions[(currentIndex + 1) % availableOptions.length] || availableOptions[0];
      onSelectMosque(nextOption.key);
      setToast(`Moschee gewechselt: ${nextOption.label}`);
      return 0;
    });
  }, [activeMosqueKey, currentAccount, isGuestMode, onSelectMosque]);

  const handleQrExternHeaderPress = useCallback(() => {
    if (!isQrExternMode) {
      handleMosqueSwitchTrigger();
      return;
    }
    setExternScopeHeaderTapCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setTimeout(() => { openExternalScopeModal(); }, 0);
        return 0;
      }
      return next;
    });
  }, [handleMosqueSwitchTrigger, isQrExternMode, openExternalScopeModal]);

  useEffect(() => {
    let cancelled = false;

    const applyProgramConfig = (data) => {
      if (cancelled) return;
      setProgramConfigByDate((prev) => {
        const next = { ...prev };
        if (data && typeof data === 'object') {
          const headline = buildHeadlineConfig(data);
          next[todayISO] = {
            name: headlineToLegacyName(headline),
            title: headline.title,
            subtitle: headline.subtitle,
            extraLine: headline.extraLine,
            startTime: String(data.startTime || '').trim(),
            updatedAt: data.updatedAt || null,
          };
        } else {
          delete next[todayISO];
        }
        return next;
      });
    };

    if (!firebaseRuntime || !hasFirebaseConfig()) {
      getDocData(PROGRAM_CONFIG_COLLECTION, todayISO)
        .then((data) => applyProgramConfig(data))
        .catch(() => {
          if (!cancelled) setToast('Programm konnte nicht geladen werden');
        });
      return () => { cancelled = true; };
    }

    const programRef = firebaseRuntime.doc(firebaseRuntime.db, resolveScopedCollection(PROGRAM_CONFIG_COLLECTION), todayISO);
    const unsubscribe = firebaseRuntime.onSnapshot(
      programRef,
      (snapshot) => applyProgramConfig(snapshot.exists() ? snapshot.data() : null),
      () => {
        if (!cancelled) setToast('Programm konnte nicht geladen werden');
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeExternalScopeDependency, todayISO, activeMosqueKey]);

  useEffect(() => {
    const todayConfig = programConfigByDate[todayISO] || null;
    const headline = buildHeadlineConfig(todayConfig);
    setProgramNameInput(headline.title);
    setProgramSubtitleInput(headline.subtitle);
    setProgramExtraLineInput(headline.extraLine);
    setProgramStartInput(todayConfig?.startTime || '');
  }, [programConfigByDate, todayISO]);

  useEffect(() => {
    let cancelled = false;
    listDocIds(REGISTRATION_CONFIG_COLLECTION)
      .then((ids) => Promise.all(ids.map(async (id) => {
        const row = await getDocData(REGISTRATION_CONFIG_COLLECTION, id).catch(() => null);
        if (!row) return null;
        return [id, normalizeRegistrationConfig({ ...row, id }, id)];
      })))
      .then((rows) => {
        if (cancelled) return;
        const nextMap = rows.filter(Boolean).reduce((acc, [id, row]) => {
          acc[id] = row;
          return acc;
        }, {});
        setRegistrationConfigById(nextMap);
      })
      .catch(() => {
        if (!cancelled) setRegistrationConfigById({});
      });
    return () => { cancelled = true; };
  }, [activeMosqueKey]);

  useEffect(() => {
    if (!activeRegistrationConfig) {
      setRegistrationNameInput('');
      setRegistrationSubtitleInput('');
      setRegistrationExtraLineInput('');
      setRegistrationStartDateInput('');
      setRegistrationEndDateInput('');
      setRegistrationIsPublicInput(false);
      setRegistrationOnlyEhlVotersInput(false);
      setRegistrationAllowDeclineInput(false);
      setRegistrationLoginEnabledInput(false);
      setRegistrationIncludedTanzeemsInput([...REGISTRATION_TANZEEM_OPTIONS]);
      return;
    }
    setRegistrationNameInput(activeRegistrationConfig.title || activeRegistrationConfig.name || '');
    setRegistrationSubtitleInput(activeRegistrationConfig.subtitle || '');
    setRegistrationExtraLineInput(activeRegistrationConfig.extraLine || '');
    setRegistrationStartDateInput(activeRegistrationConfig.startDate || '');
    setRegistrationEndDateInput(activeRegistrationConfig.endDate || '');
    setRegistrationIsPublicInput(Boolean(activeRegistrationConfig.advanced?.isPublic));
    setRegistrationOnlyEhlVotersInput(isGuestMode ? false : Boolean(activeRegistrationConfig.advanced?.onlyEhlVoters));
    setRegistrationAllowDeclineInput(Boolean(activeRegistrationConfig.advanced?.allowDecline));
    setRegistrationLoginEnabledInput(!isGuestMode && Boolean(activeRegistrationConfig.advanced?.loginEnabled));
    setRegistrationIncludedTanzeemsInput(activeRegistrationConfig.advanced?.includeTanzeems?.length
      ? activeRegistrationConfig.advanced.includeTanzeems
      : [...REGISTRATION_TANZEEM_OPTIONS]);
  }, [activeRegistrationConfig, isGuestMode]);

  const saveProgramForToday = async () => {
    if (!effectivePermissions.canEditSettings) { setToast('Keine Berechtigung'); return; }
    const headline = buildHeadlineConfig({
      title: programNameInput,
      subtitle: programSubtitleInput,
      extraLine: programExtraLineInput,
    });
    const name = headlineToLegacyName(headline);
    const startTime = String(programStartInput || '').trim();
    if (!name || !isValidTime(startTime)) {
      setToast('Bitte Programmname und gültige Startzeit eingeben');
      return;
    }
    const next = {
      ...programConfigByDate,
      [todayISO]: {
        name,
        title: headline.title,
        subtitle: headline.subtitle,
        extraLine: headline.extraLine,
        startTime,
        updatedAt: new Date().toISOString(),
      },
    };
    setProgramConfigByDate(next);
    await setDocData(PROGRAM_CONFIG_COLLECTION, todayISO, {
      name,
      title: headline.title,
      subtitle: headline.subtitle,
      extraLine: headline.extraLine,
      startTime,
      updatedAt: new Date().toISOString(),
    });
    setToast('Programm für heute gespeichert');
  };

  const clearProgramForToday = async () => {
    if (!effectivePermissions.canEditSettings) { setToast('Keine Berechtigung'); return; }
    const next = { ...programConfigByDate };
    delete next[todayISO];
    setProgramConfigByDate(next);
    await deleteDocData(PROGRAM_CONFIG_COLLECTION, todayISO);
    setToast('Programm für heute entfernt');
  };

  const saveRegistrationConfig = async () => {
    if (!effectivePermissions.canEditSettings) { setToast('Keine Berechtigung'); return; }
    const headline = buildHeadlineConfig({
      title: registrationNameInput,
      subtitle: registrationSubtitleInput,
      extraLine: registrationExtraLineInput,
    });
    const name = headlineToLegacyName(headline);
    const startDate = normalizeRegistrationShortDate(registrationStartDateInput || '');
    const endDate = normalizeRegistrationShortDate(registrationEndDateInput || '');
    const startDateKey = registrationShortDateToKey(startDate);
    const endDateKey = registrationShortDateToKey(endDate);
    const includeTanzeems = registrationIncludedTanzeemsInput
      .map((entry) => String(entry || '').toLowerCase())
      .filter((entry, index, arr) => REGISTRATION_TANZEEM_OPTIONS.includes(entry) && arr.indexOf(entry) === index);
    if (!name || startDateKey === null || endDateKey === null || startDateKey > endDateKey) {
      setToast('Bitte Name und gültigen Zeitraum eingeben');
      return;
    }
    if (!includeTanzeems.length) {
      setToast('Mindestens eine Tanzeem auswählen');
      return;
    }
    const docId = `${startDate.replace('.', '-')}_${endDate.replace('.', '-')}_${toLocationKey(name)}`;
    const payload = normalizeRegistrationConfig({
      id: docId,
      name,
      title: headline.title,
      subtitle: headline.subtitle,
      extraLine: headline.extraLine,
      startDate,
      endDate,
      disabled: false,
      updatedAt: new Date().toISOString(),
      advanced: {
        isPublic: registrationIsPublicInput,
        onlyEhlVoters: isGuestMode ? false : registrationOnlyEhlVotersInput,
        allowDecline: registrationAllowDeclineInput,
        loginEnabled: isGuestMode ? false : registrationLoginEnabledInput,
        includeTanzeems,
      },
    }, docId);
    try {
      setRegistrationConfigById((prev) => ({ ...prev, [docId]: payload }));
      await setDocData(REGISTRATION_CONFIG_COLLECTION, docId, payload);
      setToast('Anmeldung gespeichert');
    } catch (error) {
      console.error('saveRegistrationConfig failed', error);
      setToast('Anmeldung konnte nicht gespeichert werden');
    }
  };

  const clearRegistrationConfig = async () => {
    if (!effectivePermissions.canEditSettings) { setToast('Keine Berechtigung'); return; }
    if (!activeRegistrationConfig?.id) {
      setToast('Keine Anmeldung vorhanden');
      return;
    }
    const targetId = String(activeRegistrationConfig.id || '');
    setRegistrationConfigById((prev) => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });
    await deleteDocData(REGISTRATION_CONFIG_COLLECTION, targetId);
    setToast('Anmeldung deaktiviert');
  };

  const prayerWindow = useMemo(() => resolvePrayerWindow(now, timesToday, timesTomorrow), [now, timesToday, timesTomorrow]);
  const qrRuntimeContext = useMemo(() => getRuntimePrayerContext(prayerOverride, availableDates), [availableDates, prayerOverride, qrCountdownSeconds]);
  const qrLiveNow = qrRuntimeContext.now;
  const qrLivePrayerWindow = qrRuntimeContext.prayerWindow;
  const qrLiveTimesToday = qrRuntimeContext.timesToday;
  const qrLiveProgramWindow = useMemo(() => {
    const runtimeISO = qrRuntimeContext.iso;
    const config = (programConfigByDate || {})[runtimeISO] || null;
    if (!config || !isValidTime(config.startTime) || !String(config.name || '').trim()) {
      return { isConfigured: false, isActive: false, label: null };
    }
    const startMinutes = Number(config.startTime.slice(0, 2)) * 60 + Number(config.startTime.slice(3));
    const nowMinutes = qrLiveNow.getHours() * 60 + qrLiveNow.getMinutes();
    return {
      isConfigured: true,
      isActive: nowMinutes >= (startMinutes - 30),
      label: String(config.name || '').trim(),
      startTime: String(config.startTime || ''),
    };
  }, [programConfigByDate, qrLiveNow, qrRuntimeContext.iso]);
  const resolveQrPrayerContext = useCallback(() => ({
    ...qrRuntimeContext,
    prayerKey: qrRuntimeContext.prayerWindow?.prayerKey || null,
    prayerLabel: qrRuntimeContext.prayerWindow?.prayerLabel || null,
    isActive: Boolean(qrRuntimeContext.prayerWindow?.isActive),
  }), [qrRuntimeContext]);
  const qrRegisteredGuidance = useMemo(() => {
    if (!qrRegistration?.idNumber) return '';
    if (qrAttendanceCategory === 'program') {
      const isAlreadyHandled = Boolean(
        qrLiveProgramWindow.isActive
        && qrLastAttendanceDateISO === qrRuntimeContext.iso
        && qrLastAttendancePrayerKey === 'program'
        && qrLastAttendanceStatus === 'duplicate',
      );
      if (isAlreadyHandled) return 'Sie wurden bereits für das Programm eingetragen.';
      if (!qrLiveProgramWindow.isConfigured) return 'Aktuell ist kein Programm hinterlegt.';
      if (!qrLiveProgramWindow.isActive) return `Programm ist noch nicht aktiv. Start: ${qrLiveProgramWindow.startTime || '—'}.`;
      return 'Bitte den QR-Code noch einmal scannen, um sich für das Programm einzutragen.';
    }
    if (qrLastAttendanceStatus === 'registered') {
      return 'Bitte den QR-Code noch einmal scannen, um sich einzutragen.';
    }
    const hintContext = qrLastRuntimeHint && qrLastRuntimeHint.iso === qrLastAttendanceDateISO
      ? qrLastRuntimeHint
      : null;
    const currentContext = hintContext || resolveQrPrayerContext();
    const currentPrayerKey = currentContext.prayerKey || '';
    const currentPrayerLabel = currentContext.prayerLabel || (currentPrayerKey ? getDisplayPrayerLabel(currentPrayerKey, currentContext.timesToday) : '');
    const isCurrentPrayerAlreadyHandled = Boolean(
      currentContext.isActive
      && currentPrayerKey
      && qrLastAttendanceDateISO === currentContext.iso
      && qrLastAttendancePrayerKey === currentPrayerKey
      && ['counted', 'duplicate'].includes(qrLastAttendanceStatus),
    );

    if (isCurrentPrayerAlreadyHandled) {
      return `Sie wurden bereits für das ${currentPrayerLabel} Gebet eingetragen.`;
    }
    if (qrLastAttendanceStatus === 'inactive_prayer') {
      return currentContext.prayerWindow?.nextLabel
        ? `Gebetsfenster geschlossen. Nächstes Gebet: ${currentContext.prayerWindow.nextLabel}.`
        : 'Gebetsfenster geschlossen.';
    }
    if (currentContext.isActive && currentPrayerLabel) {
      return `Bitte den QR-Code noch einmal scannen, um sich für ${currentPrayerLabel} einzutragen.`;
    }
    if (currentContext.prayerWindow?.nextLabel) return `Gebetsfenster geschlossen. Nächstes Gebet: ${currentContext.prayerWindow.nextLabel}.`;
    return 'Gebetsfenster geschlossen.';
  }, [qrAttendanceCategory, qrLastAttendanceDateISO, qrLastAttendancePrayerKey, qrLastAttendanceStatus, qrLastRuntimeHint, qrLiveProgramWindow, qrRegistration, qrRuntimeContext.iso, resolveQrPrayerContext]);



  useEffect(() => {
    if (!['counted', 'duplicate'].includes(qrLastAttendanceStatus)) return;
    if (qrAttendanceCategory === 'program') {
      const sameProgramDay = qrLastAttendanceDateISO === toISO(qrLiveNow) && qrLastAttendancePrayerKey === 'program';
      if (!sameProgramDay && qrStatusMessage) {
        setQrStatusMessage('');
        setQrStatusTone('neutral');
      }
      return;
    }
    const currentDateISO = toISO(qrLiveNow);
    const currentPrayerKey = qrLivePrayerWindow?.prayerKey || '';
    const isSamePrayerWindow = Boolean(
      qrLivePrayerWindow?.isActive
      && currentPrayerKey
      && qrLastAttendanceDateISO === currentDateISO
      && qrLastAttendancePrayerKey === currentPrayerKey
    );
    if (!isSamePrayerWindow && qrStatusMessage) {
      setQrStatusMessage('');
      setQrStatusTone('neutral');
    }
  }, [qrAttendanceCategory, qrLastAttendanceDateISO, qrLastAttendancePrayerKey, qrLastAttendanceStatus, qrLiveNow, qrLivePrayerWindow, qrStatusMessage]);
  const guestAmaratScopeKey = normalizeExternalScopeKey(guestActivation?.scopeKey || guestActivation?.mosqueName || '');
  const membersDirectory = isGuestMode
    ? EXTERNAL_MEMBER_DIRECTORY_DATA.filter((entry) => {
      const entryScope = normalizeExternalScopeKey(entry?.amarat || '');
      return !entryScope || !guestAmaratScopeKey || entryScope === guestAmaratScopeKey;
    })
    : MEMBER_DIRECTORY_DATA;
  const membersLoading = false;
  const showMemberNamesInGrid = isGuestMode ? Boolean(guestActivation?.showNames) : SHOW_MEMBER_NAMES_IN_ID_GRID;
  const shouldIncludeGuestNameInExports = isGuestMode && Boolean(guestActivation?.showNames);
  const guestMajlisFallbackLabel = String(guestActivation?.mosqueName || activeMosque.label || '').trim();
  const formatGuestAmaratLabel = useCallback((value) => String(value || '')
    .trim()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' '), []);
  const resolveExportMajlisLabel = useCallback((majlisValue, amaratValue = '') => {
    const rawMajlis = String(majlisValue || '').trim();
    if (!isGuestMode) return rawMajlis || '—';
    if (rawMajlis && rawMajlis !== '-') return rawMajlis;
    if (guestMajlisFallbackLabel) return guestMajlisFallbackLabel;
    const rawAmarat = String(amaratValue || '').trim();
    if (rawAmarat) return formatGuestAmaratLabel(rawAmarat);
    return rawMajlis || '—';
  }, [formatGuestAmaratLabel, guestMajlisFallbackLabel, isGuestMode]);
  const getLocationLabel = useCallback((majlisValue) => (
    isGuestMode && isMissingMajlisValue(majlisValue) ? 'Jamaat' : 'Majlis'
  ), [isGuestMode]);
  const hasGuestEntriesWithoutMajlis = useMemo(
    () => isGuestMode && membersDirectory.some((entry) => isMissingMajlisValue(entry?.majlis)),
    [isGuestMode, membersDirectory],
  );
  const exportMosqueNameForFile = useMemo(() => {
    const rawName = isGuestMode
      ? String(guestActivation?.mosqueName || activeMosque.label || 'Local Amarat').trim()
      : (activeMosque.key === 'nuur_moschee' ? 'Nuur_Moschee' : 'Bait_Us_Sabuh');
    const token = String(rawName || 'Moschee')
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9_\-]/g, '');
    return token || 'Moschee';
  }, [activeMosque.key, activeMosque.label, guestActivation?.mosqueName, isGuestMode]);
  const memberMetadataById = useMemo(() => membersDirectory.reduce((acc, entry) => {
    const id = String(entry?.idNumber || '').trim();
    if (!id || acc[id]) return acc;
    acc[id] = {
      name: String(entry?.name || '').trim(),
      majlis: String(entry?.majlis || '').trim(),
      amarat: String(entry?.amarat || '').trim(),
    };
    return acc;
  }, {}), [membersDirectory]);

  const majlisChoices = useMemo(() => {
    if (isGuestMode && !hasMultipleMajalisInGuest) return ['-'];
    const allowedRegistration = new Set(registrationWindow.includeTanzeems || REGISTRATION_TANZEEM_OPTIONS);
    const available = Array.from(new Set(
      membersDirectory
        .filter((entry) => (attendanceMode === 'registration' ? allowedRegistration.has(entry.tanzeem) : true))
        .filter((entry) => entry.tanzeem === selectedTanzeem)
        .map((entry) => String(entry.majlis || '').trim())
        .filter((entry) => entry && entry !== '-'),
    )).sort((a, b) => a.localeCompare(b, 'de'));
    if (isGuestMode) return available;
    const availableSet = new Set(available);
    return TERMINAL_LOCATIONS.filter((majlisName) => availableSet.has(majlisName));
  }, [attendanceMode, hasMultipleMajalisInGuest, isGuestMode, membersDirectory, registrationWindow.includeTanzeems, selectedTanzeem]);

  const memberChoices = useMemo(() => (
    membersDirectory
      .filter((entry) => (attendanceMode === 'registration' ? registrationWindow.includeTanzeems.includes(entry.tanzeem) : true))
      .filter((entry) => entry.tanzeem === selectedTanzeem && (isGuestMode && !hasMultipleMajalisInGuest ? true : entry.majlis === selectedMajlis))
      .sort((a, b) => {
        const aNum = Number.parseInt(String(a.idNumber), 10);
        const bNum = Number.parseInt(String(b.idNumber), 10);
        if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
        return String(a.idNumber).localeCompare(String(b.idNumber));
      })
  ), [attendanceMode, hasMultipleMajalisInGuest, isGuestMode, membersDirectory, registrationWindow.includeTanzeems, selectedMajlis, selectedTanzeem]);

  const filteredMemberChoices = useMemo(() => {
    if (!idSearchQuery) return [];
    return memberChoices
      .filter((entry) => String(entry.idNumber || '').startsWith(idSearchQuery))
      .sort((a, b) => {
        const aNum = Number.parseInt(String(a.idNumber), 10);
        const bNum = Number.parseInt(String(b.idNumber), 10);
        if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
        return String(a.idNumber).localeCompare(String(b.idNumber));
      });
  }, [memberChoices, idSearchQuery]);

  const visibleMemberChoices = useMemo(() => {
    if (idSearchQuery) return filteredMemberChoices;
    return memberChoices;
  }, [filteredMemberChoices, idSearchQuery, memberChoices]);

  const shouldShowCountedIdHint = Boolean(currentAccount);
  const countedMemberDocPrefixes = useMemo(() => {
    if (!shouldShowCountedIdHint) return [];
    if (!selectedTanzeem || !selectedMajlis) return [];
    const locationKey = toLocationKey(selectedMajlis);

    if (attendanceMode === 'program') {
      if (!programWindow?.isActive || !programWindow?.label) return [];
      const programKey = toLocationKey(programWindow.label);
      return [`${todayISO}_${programKey}_${selectedTanzeem}_${locationKey}_`];
    }
    if (attendanceMode === 'registration') {
      const configId = String(registrationWindow.config?.id || '');
      if (!registrationWindow.isOpen || !configId) return [];
      return [`${configId}_${selectedTanzeem}_${locationKey}_`];
    }

    if (!prayerWindow?.isActive || !prayerWindow?.prayerKey) return [];
    const currentPrayerKey = String(prayerWindow.prayerKey || '');
    if (!currentPrayerKey) return [];

    const targetPrayerKeys = [];
    if (soharAsrMergedToday && ['sohar', 'asr'].includes(currentPrayerKey)) {
      targetPrayerKeys.push('sohar', 'asr');
    } else if (maghribIshaaMergedToday && ['maghrib', 'ishaa'].includes(currentPrayerKey)) {
      targetPrayerKeys.push('maghrib', 'ishaa');
    } else {
      targetPrayerKeys.push(currentPrayerKey);
    }

    return targetPrayerKeys.map((prayerKey) => `${todayISO}_${prayerKey}_${selectedTanzeem}_${locationKey}_`);
  }, [
    attendanceMode,
    maghribIshaaMergedToday,
    prayerWindow,
    programWindow,
    selectedMajlis,
    selectedTanzeem,
    soharAsrMergedToday,
    shouldShowCountedIdHint,
    todayISO,
  ]);

  useEffect(() => {
    if (terminalMode !== 'idSelection' || countedMemberDocPrefixes.length === 0) {
      setCountedMemberIdsForSelection(new Set());
      setCountedMemberResponsesForSelection(new Map());
      return undefined;
    }

    let cancelled = false;
    const targetCollection = attendanceMode === 'program'
      ? PROGRAM_ATTENDANCE_COLLECTION
      : (attendanceMode === 'registration' ? REGISTRATION_ATTENDANCE_COLLECTION : MEMBER_DIRECTORY_COLLECTION);

    const fetchCountedMemberIds = async () => {
      try {
        const ids = await listDocIds(targetCollection);
        if (cancelled) return;

        const nextSet = new Set();
        const matchedRows = [];
        ids.forEach((docId) => {
          const resolvedDocId = String(docId || '');
          const matchingPrefix = countedMemberDocPrefixes.find((prefix) => resolvedDocId.startsWith(prefix));
          if (!matchingPrefix) return;
          const extractedId = resolvedDocId.slice(matchingPrefix.length).trim();
          if (!extractedId || extractedId === 'guest') return;
          nextSet.add(extractedId);
          matchedRows.push({ docId: resolvedDocId, idNumber: extractedId });
        });
        setCountedMemberIdsForSelection(nextSet);

        if (attendanceMode !== 'registration') {
          setCountedMemberResponsesForSelection(new Map());
          return;
        }

        const responseRows = await Promise.all(
          matchedRows.map(async ({ docId, idNumber }) => {
            const row = await getDocData(REGISTRATION_ATTENDANCE_COLLECTION, docId).catch(() => null);
            const response = String(row?.registrationResponse || '').trim().toLowerCase() === 'decline' ? 'decline' : 'accept';
            return { idNumber, response };
          }),
        );
        if (cancelled) return;
        const responseMap = new Map();
        responseRows.forEach(({ idNumber, response }) => {
          if (!idNumber) return;
          responseMap.set(idNumber, response);
        });
        setCountedMemberResponsesForSelection(responseMap);
      } catch (_error) {
        if (cancelled) return;
        setCountedMemberIdsForSelection(new Set());
        setCountedMemberResponsesForSelection(new Map());
      }
    };

    fetchCountedMemberIds();
    const timer = setInterval(fetchCountedMemberIds, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [attendanceMode, countedMemberDocPrefixes, terminalMode]);

  const quickSearchDigits = String(quickIdSearchQuery || '').replace(/[^0-9]/g, '');
  const quickSearchResults = useMemo(() => {
    if (quickSearchDigits.length < 4) return [];
    const allowedRegistration = new Set(registrationWindow.includeTanzeems || REGISTRATION_TANZEEM_OPTIONS);
    return membersDirectory
      .filter((entry) => (attendanceMode === 'registration' ? allowedRegistration.has(String(entry?.tanzeem || '')) : true))
      .filter((entry) => String(entry?.idNumber || '').includes(quickSearchDigits))
      .sort((a, b) => {
        const aNum = Number.parseInt(String(a?.idNumber || ''), 10);
        const bNum = Number.parseInt(String(b?.idNumber || ''), 10);
        if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) return aNum - bNum;
        const byTanzeem = String(a?.tanzeem || '').localeCompare(String(b?.tanzeem || ''));
        if (byTanzeem !== 0) return byTanzeem;
        return String(a?.majlis || '').localeCompare(String(b?.majlis || ''));
      });
  }, [attendanceMode, membersDirectory, quickSearchDigits, registrationWindow.includeTanzeems]);

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

    const attendanceRef = firebaseRuntime.doc(firebaseRuntime.db, resolveScopedCollection('attendance_daily'), todayISO);
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
  }, [activeTab, todayISO, activeMosqueKey]);

  useEffect(() => {
    if (activeTab !== 'stats' || statsMode !== 'program') return undefined;
    const selectedDocId = String(selectedProgramStatsOption?.docId || '');
    if (!selectedDocId) {
      setProgramStats(null);
      return undefined;
    }

    let cancelled = false;

    const fetchProgramStats = () => {
      Promise.all([
        getDocData(PROGRAM_DAILY_COLLECTION, selectedDocId).catch(() => null),
        getDocData(PROGRAM_DAILY_COLLECTION_LEGACY, selectedDocId).catch(() => null),
      ])
        .then(([primaryData, legacyData]) => {
          const data = primaryData || legacyData || null;
          if (!cancelled) setProgramStats(data || null);
        })
        .catch(() => {
          if (!cancelled) setToast('Datenbankfehler – bitte Internet prüfen');
        });
    };

    fetchProgramStats();
    const timer = setInterval(fetchProgramStats, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeTab, statsMode, selectedProgramStatsOption, activeMosqueKey]);

  useEffect(() => {
    if (activeTab !== 'stats' || statsMode !== 'program') return undefined;
    const selectedDocId = String(selectedProgramStatsOption?.docId || '');
    if (!selectedDocId) {
      setProgramAttendanceEntries([]);
      return undefined;
    }

    let cancelled = false;
    const idPrefix = `${selectedDocId}_`;

    const fetchProgramEntries = () => {
      listDocIds(PROGRAM_ATTENDANCE_COLLECTION)
        .then((ids) => ids.filter((docId) => String(docId || '').startsWith(idPrefix)))
        .then((ids) => Promise.all(ids.map((docId) => getDocData(PROGRAM_ATTENDANCE_COLLECTION, docId))))
        .then((rows) => {
          if (cancelled) return;
          setProgramAttendanceEntries(rows.filter(Boolean));
        })
        .catch(() => {
          if (!cancelled) setToast('Datenbankfehler – bitte Internet prüfen');
        });
    };

    fetchProgramEntries();
    const timer = setInterval(fetchProgramEntries, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeTab, statsMode, selectedProgramStatsOption, activeMosqueKey]);

  useEffect(() => {
    if (activeTab !== 'stats' || statsMode !== 'program') return;
    let cancelled = false;
    Promise.all([
      listDocIds(PROGRAM_DAILY_COLLECTION).catch(() => []),
      listDocIds(PROGRAM_DAILY_COLLECTION_LEGACY).catch(() => []),
      listDocIds(PROGRAM_ATTENDANCE_COLLECTION).catch(() => []),
    ])
      .then(([primaryIds, legacyIds, entryIds]) => {
        if (cancelled) return;
        const inferredPairs = entryIds
          .map((id) => String(id || ''))
          .filter((id) => /^\d{4}-\d{2}-\d{2}_/.test(id))
          .map((id) => {
            if (id.includes('_program_guest_')) return '';
            const memberPattern = /^(\d{4}-\d{2}-\d{2})_(.+)_(ansar|khuddam|atfal|kinder)_.+_[^_]+$/;
            const match = id.match(memberPattern);
            if (!match) return '';
            const iso = String(match[1] || '');
            const programKey = String(match[2] || '');
            if (!iso || !programKey) return '';
            return { docId: `${iso}_${programKey}`, entryDocId: id };
          })
          .filter(Boolean);
        const inferredDailyDocIds = inferredPairs.map((item) => item.docId);
        const sampleByDocId = inferredPairs.reduce((acc, item) => {
          if (!item?.docId || !item?.entryDocId) return acc;
          if (!acc[item.docId]) acc[item.docId] = item.entryDocId;
          return acc;
        }, {});
        const mergedIds = Array.from(new Set([
          ...primaryIds.map((id) => String(id || '')),
          ...legacyIds.map((id) => String(id || '')),
          ...inferredDailyDocIds,
        ]));
        setProgramStatsEntrySampleByDocId(sampleByDocId);
        setProgramStatsDocIds(
          mergedIds
            .filter((id) => /^\d{4}-\d{2}-\d{2}_.+/.test(id)),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setProgramStatsEntrySampleByDocId({});
          setProgramStatsDocIds([]);
        }
      });
    return () => { cancelled = true; };
  }, [activeTab, statsMode, activeMosqueKey]);

  useEffect(() => {
    if (activeTab !== 'stats' || statsMode !== 'program') return;
    if (!availableProgramStatsOptions.length) {
      setSelectedProgramStatsDocId('');
      return;
    }
    if (selectedProgramStatsDocId && availableProgramStatsOptions.some((item) => item.docId === selectedProgramStatsDocId)) return;
    const todayCandidate = availableProgramStatsOptions.find((item) => item.iso === todayISO);
    if (todayCandidate?.docId) {
      setSelectedProgramStatsDocId(todayCandidate.docId);
      return;
    }
    setSelectedProgramStatsDocId(availableProgramStatsOptions[0].docId);
  }, [activeTab, statsMode, availableProgramStatsOptions, selectedProgramStatsDocId, todayISO]);

  useEffect(() => {
    if (activeTab !== 'stats' || statsMode !== 'program') return;
    const sampleEntries = Object.entries(programStatsEntrySampleByDocId || {});
    if (!sampleEntries.length) {
      setProgramStatsNamesByDocId({});
      return;
    }
    let cancelled = false;
    Promise.all(sampleEntries.map(async ([docId, entryDocId]) => {
      const row = await getDocData(PROGRAM_ATTENDANCE_COLLECTION, entryDocId).catch(() => null);
      const name = String(row?.programName || '').trim();
      return [docId, name];
    }))
      .then((rows) => {
        if (cancelled) return;
        const nextMap = rows.reduce((acc, [docId, name]) => {
          if (name) acc[docId] = name;
          return acc;
        }, {});
        setProgramStatsNamesByDocId(nextMap);
      })
      .catch(() => {
        if (!cancelled) setProgramStatsNamesByDocId({});
      });
    return () => { cancelled = true; };
  }, [activeTab, statsMode, programStatsEntrySampleByDocId, activeMosqueKey]);

  useEffect(() => {
    if (activeTab !== 'stats' || statsMode !== 'registration') return undefined;
    const selectedConfig = selectedRegistrationStatsOption;
    const configId = String(selectedConfig?.id || '');
    if (!configId) {
      setRegistrationStats(null);
      setRegistrationAttendanceEntries([]);
      return undefined;
    }

    let cancelled = false;
    const fetchRegistration = () => {
      Promise.all([
        getDocData(REGISTRATION_DAILY_COLLECTION, configId).catch(() => null),
        listDocIds(REGISTRATION_ATTENDANCE_COLLECTION)
          .then((ids) => ids.filter((id) => String(id || '').startsWith(`${configId}_`)))
          .then((ids) => Promise.all(ids.map((id) => getDocData(REGISTRATION_ATTENDANCE_COLLECTION, id))))
          .catch(() => []),
      ])
        .then(([dailyDoc, entries]) => {
          if (cancelled) return;
          setRegistrationStats(dailyDoc || null);
          setRegistrationAttendanceEntries((entries || []).filter(Boolean));
        })
        .catch(() => {
          if (!cancelled) setToast('Datenbankfehler – bitte Internet prüfen');
        });
    };
    fetchRegistration();
    const timer = setInterval(fetchRegistration, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeTab, statsMode, selectedRegistrationStatsOption, activeMosqueKey]);

  useEffect(() => {
    if (activeTab !== 'stats' || statsMode !== 'registration') return;
    if (!availableRegistrationStatsOptions.length) {
      setSelectedRegistrationStatsConfigId('');
      setRegistrationMajlisFilter('total');
      return;
    }
    if (selectedRegistrationStatsConfigId && availableRegistrationStatsOptions.some((item) => item.id === selectedRegistrationStatsConfigId)) return;
    setSelectedRegistrationStatsConfigId(availableRegistrationStatsOptions[0].id);
    setRegistrationMajlisFilter('total');
  }, [activeTab, statsMode, availableRegistrationStatsOptions, selectedRegistrationStatsConfigId]);

  useEffect(() => {
    if (statsMode !== 'registration') return;
    const allowed = selectedRegistrationStatsOption?.advanced?.includeTanzeems || [];
    if (!allowed.length) return;
    if (detailedFlowTanzeem && !allowed.includes(detailedFlowTanzeem)) {
      setDetailedFlowTanzeem('');
      setDetailedFlowMajlis('');
      setDetailedIdSearchQuery('');
    }
  }, [statsMode, selectedRegistrationStatsOption, detailedFlowTanzeem]);

  const statsPrayerKey = prayerWindow.isActive ? prayerWindow.prayerKey : nextPrayer;

  const statsWeekIsos = useMemo(() => {
    const selectedWeekStartDate = parseISO(selectedStatsWeekStartISO || '');
    return getWeekIsosMondayToSunday(selectedWeekStartDate || now);
  }, [now, selectedStatsWeekStartISO]);
  const statsPrevWeekIsos = useMemo(() => {
    const selectedWeekStartDate = parseISO(selectedStatsWeekStartISO || '');
    const baseStart = selectedWeekStartDate || startOfWeekMonday(now);
    const start = addDays(baseStart, -7);
    return Array.from({ length: 7 }, (_, index) => toISO(addDays(start, index)));
  }, [now, selectedStatsWeekStartISO]);
  const statsRollingWeekIsos = useMemo(() => getLast7Days(now), [now]);

  const currentWeekStartISO = useMemo(() => toISO(startOfWeekMonday(now)), [now]);
  const selectedWeekNumber = useMemo(() => {
    const startDate = parseISO(selectedStatsWeekStartISO || '');
    return startDate ? getISOWeekNumber(startDate) : null;
  }, [selectedStatsWeekStartISO]);
  const currentWeekLabel = useMemo(() => {
    if (!selectedWeekNumber) return 'Woche';
    const isCurrentWeek = selectedStatsWeekStartISO === currentWeekStartISO;
    return `KW ${selectedWeekNumber}${isCurrentWeek ? ' (aktuell)' : ''}`;
  }, [selectedWeekNumber, selectedStatsWeekStartISO, currentWeekStartISO]);

  useEffect(() => {
    if (activeTab !== 'stats' || statsMode !== 'prayer') return undefined;

    let cancelled = false;
    const targetIsos = Array.from(new Set([...statsPrevWeekIsos, ...statsWeekIsos, ...statsRollingWeekIsos]));

    const fetchWeeklyStats = () => {
      if (!hasLoadedWeeklyRef.current) setWeeklyStatsLoading(true);
      Promise.all(targetIsos.map((iso) => getDocData('attendance_daily', iso).then((data) => [iso, data || null])))
        .then((rows) => {
          if (cancelled) return;
          const next = rows.reduce((acc, [iso, data]) => {
            acc[iso] = data;
            return acc;
          }, {});
          const serialized = JSON.stringify(next);
          if (serialized !== weeklyStatsPayloadRef.current) {
            weeklyStatsPayloadRef.current = serialized;
            setWeeklyAttendanceDocs((prev) => ({ ...prev, ...next }));
          }
          hasLoadedWeeklyRef.current = true;
          setWeeklyStatsLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          hasLoadedWeeklyRef.current = true;
          setWeeklyStatsLoading(false);
          setToast('Datenbankfehler – bitte Internet prüfen');
        });
    };

    fetchWeeklyStats();
    const timer = setInterval(fetchWeeklyStats, 20000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeTab, statsMode, statsPrevWeekIsos, statsWeekIsos, statsRollingWeekIsos, activeMosqueKey]);

  useEffect(() => {
    if (activeTab !== 'stats' || statsMode !== 'prayer') return;
    let cancelled = false;
    listDocIds('attendance_daily')
      .then((ids) => {
        if (cancelled) return;
        const normalized = ids
          .filter((id) => /^\d{4}-\d{2}-\d{2}$/.test(String(id)))
          .sort()
          .reverse();
        setAvailableStatsDates(normalized);
      })
      .catch(() => {
        if (!cancelled) setToast('Datenbankfehler – bitte Internet prüfen');
      });
    return () => { cancelled = true; };
  }, [activeTab, statsMode, activeMosqueKey]);

  useEffect(() => {
    if (activeTab !== 'stats' || statsMode !== 'prayer') return;
    if (!selectedStatsDateISO || weeklyAttendanceDocs[selectedStatsDateISO] !== undefined) return;
    let cancelled = false;
    getDocData('attendance_daily', selectedStatsDateISO)
      .then((data) => {
        if (cancelled) return;
        setWeeklyAttendanceDocs((prev) => ({ ...prev, [selectedStatsDateISO]: data || null }));
      })
      .catch(() => {
        if (!cancelled) setToast('Datenbankfehler – bitte Internet prüfen');
      });
    return () => { cancelled = true; };
  }, [activeTab, statsMode, selectedStatsDateISO, weeklyAttendanceDocs, activeMosqueKey]);

  const selectedDateAttendance = useMemo(() => (selectedStatsDateISO ? (weeklyAttendanceDocs[selectedStatsDateISO] || null) : null), [selectedStatsDateISO, weeklyAttendanceDocs]);
  const activeDayAttendance = useMemo(() => {
    if (!selectedStatsDateISO || selectedStatsDateISO === todayISO) return statsAttendance;
    return selectedDateAttendance;
  }, [selectedStatsDateISO, todayISO, statsAttendance, selectedDateAttendance]);

  const todayGraphRows = useMemo(() => getPrayerCountsForStats(activeDayAttendance), [activeDayAttendance]);
  const todayGraphSummary = useMemo(() => {
    if (!todayGraphRows.length) return null;
    const totalValues = todayGraphRows.map((row) => row.total || 0);
    const highest = todayGraphRows.reduce((best, row) => ((row.total || 0) > (best.total || 0) ? row : best), todayGraphRows[0]);
    const lowest = todayGraphRows.reduce((worst, row) => ((row.total || 0) < (worst.total || 0) ? row : worst), todayGraphRows[0]);
    const average = totalValues.reduce((sum, value) => sum + value, 0) / Math.max(1, totalValues.length);
    const tanzeemTotals = STATS_TANZEEM_KEYS.reduce((acc, key) => {
      acc[key] = todayGraphRows.reduce((sum, row) => sum + (row.tanzeemTotals?.[key] || 0), 0);
      return acc;
    }, {});
    const tanzeemGrandTotal = Object.values(tanzeemTotals).reduce((sum, value) => sum + value, 0);
    const tanzeemPercentages = STATS_TANZEEM_KEYS.reduce((acc, key) => {
      acc[key] = tanzeemGrandTotal > 0 ? (tanzeemTotals[key] / tanzeemGrandTotal) * 100 : 0;
      return acc;
    }, {});
    return { highest, lowest, average, tanzeemPercentages };
  }, [todayGraphRows]);

  const weekSeriesRows = useMemo(() => statsWeekIsos.map((iso) => {
    const totals = getDailyTotalsForStats(weeklyAttendanceDocs[iso]);
    const dateObj = parseISO(iso);
    const weekdayShort = dateObj ? new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(dateObj).replace(/\.$/, '') : iso;
    const dayMonth = dateObj ? new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' }).format(dateObj).replace(/\.$/, '') : '';
    return {
      iso,
      label: dateObj ? `${weekdayShort}, ${dayMonth}` : iso,
      total: totals.total,
      tanzeemTotals: totals.tanzeemTotals,
    };
  }), [statsWeekIsos, weeklyAttendanceDocs]);

  const previousWeekTotal = useMemo(() => statsPrevWeekIsos.reduce((sum, iso) => {
    const totals = getDailyTotalsForStats(weeklyAttendanceDocs[iso]);
    return sum + totals.total;
  }, 0), [statsPrevWeekIsos, weeklyAttendanceDocs]);

  const weekGraphSummary = useMemo(() => {
    if (!weekSeriesRows.length) return null;
    const highest = weekSeriesRows.reduce((best, row) => (row.total > best.total ? row : best), weekSeriesRows[0]);
    const lowest = weekSeriesRows.reduce((worst, row) => (row.total < worst.total ? row : worst), weekSeriesRows[0]);
    const weekTotal = weekSeriesRows.reduce((sum, row) => sum + row.total, 0);
    const averagePerDay = weekTotal / Math.max(1, weekSeriesRows.length);
    const previousAvg = previousWeekTotal / 7;
    const trendPercent = previousAvg > 0 ? ((averagePerDay - previousAvg) / previousAvg) * 100 : 0;
    return { highest, lowest, averagePerDay, trendPercent };
  }, [weekSeriesRows, previousWeekTotal]);

  const buildUniqueSummary = (attendanceData) => {
    const byPrayer = attendanceData?.byPrayer || {};
    const tanzeemSets = {
      ansar: new Set(),
      khuddam: new Set(),
      atfal: new Set(),
    };
    const guestTotal = getUniqueGuestTotalForAttendance(attendanceData);

    Object.values(byPrayer).forEach((prayerNode) => {
      const memberDetails = prayerNode?.memberDetails || {};
      STATS_TANZEEM_KEYS.forEach((key) => {
        const majlisMap = memberDetails[key] || {};
        Object.values(majlisMap).forEach((entries) => {
          if (!Array.isArray(entries)) return;
          entries.forEach((entry) => {
            const id = String(entry?.idNumber || '').trim();
            if (!id) return;
            tanzeemSets[key].add(id);
          });
        });
      });
    });

    const tanzeemTotals = {
      ansar: tanzeemSets.ansar.size,
      khuddam: tanzeemSets.khuddam.size,
      atfal: tanzeemSets.atfal.size,
    };
    const membersTotal = tanzeemTotals.ansar + tanzeemTotals.khuddam + tanzeemTotals.atfal;
    return {
      tanzeemTotals,
      guestTotal,
      total: membersTotal + guestTotal,
    };
  };


  const weekUniqueSummary = useMemo(() => statsWeekIsos.reduce((acc, iso) => {
    const oneDay = buildUniqueSummary(weeklyAttendanceDocs[iso]);
    acc.total += oneDay.total;
    acc.guestTotal += oneDay.guestTotal;
    acc.tanzeemTotals.ansar += oneDay.tanzeemTotals.ansar;
    acc.tanzeemTotals.khuddam += oneDay.tanzeemTotals.khuddam;
    acc.tanzeemTotals.atfal += oneDay.tanzeemTotals.atfal;
    return acc;
  }, {
    total: 0,
    guestTotal: 0,
    tanzeemTotals: { ansar: 0, khuddam: 0, atfal: 0 },
  }), [statsWeekIsos, weeklyAttendanceDocs]);

  const weekTopMajlis = useMemo(() => {
    const map = {};
    statsWeekIsos.forEach((iso) => {
      const byPrayer = weeklyAttendanceDocs[iso]?.byPrayer || {};
      Object.values(byPrayer).forEach((prayerNode) => {
        const tanzeemMap = prayerNode?.tanzeem || {};
        STATS_TANZEEM_KEYS.forEach((key) => {
          const majlis = tanzeemMap[key]?.majlis || {};
          Object.entries(majlis).forEach(([loc, count]) => {
            map[loc] = (map[loc] || 0) + (Number(count) || 0);
          });
        });
      });
    });
    return buildMajlisRanking(map);
  }, [statsWeekIsos, weeklyAttendanceDocs]);

  const weekPrayerTotals = useMemo(() => {
    const agg = { fajr: 0, sohar: 0, asr: 0, maghrib: 0, ishaa: 0 };
    statsWeekIsos.forEach((iso) => {
      const rows = getPrayerCountsForStats(weeklyAttendanceDocs[iso]);
      rows.forEach((row) => {
        agg[row.key] += Number(row.total) || 0;
      });
    });
    return [
      { key: 'fajr', label: 'Fajr (الفجر)', total: agg.fajr },
      { key: 'sohar', label: 'Sohar (الظهر)', total: agg.sohar },
      { key: 'asr', label: 'Asr (العصر)', total: agg.asr },
      { key: 'maghrib', label: 'Maghrib (المغرب)', total: agg.maghrib },
      { key: 'ishaa', label: 'Ishaa (العشاء)', total: agg.ishaa },
    ];
  }, [statsWeekIsos, weeklyAttendanceDocs]);

  const formatStatsDateShort = (iso) => {
    const dateObj = parseISO(iso);
    if (!dateObj) return iso;
    const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(dateObj).replace(/\.$/, '');
    const datePart = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(dateObj);
    return `${weekday}, ${datePart}`;
  };

  const formatIsoWithWeekday = (iso) => {
    const dateObj = parseISO(iso || '');
    if (!dateObj) return iso || '—';
    const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(dateObj).replace(/\.$/, '');
    const datePart = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dateObj);
    return `${weekday}, ${datePart}`;
  };

  const selectedStatsDateLabel = useMemo(() => {
    if (!selectedStatsDateISO) return '—';
    const base = formatStatsDateShort(selectedStatsDateISO);
    return selectedStatsDateISO === todayISO ? `${base} (heute)` : base;
  }, [selectedStatsDateISO, todayISO]);

  const selectedStatsDateToggleLabel = useMemo(() => {
    if (!selectedStatsDateISO) return '—';
    return formatStatsDateShort(selectedStatsDateISO);
  }, [selectedStatsDateISO]);

  const availableStatsWeeks = useMemo(() => {
    const seen = new Set();
    return availableStatsDates
      .map((iso) => parseISO(iso))
      .filter(Boolean)
      .map((dateObj) => startOfWeekMonday(dateObj))
      .filter((dateObj) => {
        const weekStartISO = toISO(dateObj);
        if (seen.has(weekStartISO)) return false;
        seen.add(weekStartISO);
        return true;
      })
      .sort((a, b) => b - a)
      .map((dateObj) => {
        const start = new Date(dateObj);
        const end = addDays(start, 6);
        const weekStartISO = toISO(start);
        const weekNumber = getISOWeekNumber(start);
        const startFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(start);
        const endFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(end);
        const isCurrent = weekStartISO === currentWeekStartISO;
        return {
          weekStartISO,
          weekNumber,
          label: `KW ${weekNumber}${isCurrent ? ' (aktuell)' : ''} · ${startFmt} – ${endFmt}`,
        };
      });
  }, [availableStatsDates, currentWeekStartISO]);

  const formatRangeFromIsos = (isos, prefix = 'Woche') => {
    const start = parseISO(isos?.[0] || '');
    const endDate = parseISO(isos?.[isos.length - 1] || '');
    if (!start || !endDate) return prefix;
    const startFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(start);
    const endFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(endDate);
    return `${prefix} · ${startFmt} – ${endFmt}`;
  };

  const currentWeekToggleLabel = `<< ${currentWeekLabel} >>`;
  const previousWeekToggleLabel = '<< Letzte Woche >>';
  const selectedDateToggleLabel = `<< ${selectedStatsDateToggleLabel} >>`;

  const cycleStatsRangeMode = (prev) => {
    const options = ['currentWeek', 'previousWeek', 'selectedDate'];
    const idx = options.indexOf(prev);
    return options[(idx + 1) % options.length];
  };

  const formatRangeLabel = (rangeMode) => {
    if (rangeMode === 'currentWeek') return formatRangeFromIsos(statsWeekIsos, currentWeekLabel);
    if (rangeMode === 'previousWeek') return formatRangeFromIsos(statsRollingWeekIsos, 'Letzte Woche');
    return `Tag · ${selectedStatsDateLabel}`;
  };

  const getRangeToggleLabel = (rangeMode) => {
    if (rangeMode === 'currentWeek') return currentWeekToggleLabel;
    if (rangeMode === 'previousWeek') return previousWeekToggleLabel;
    return selectedDateToggleLabel;
  };

  const getStatsExportDataset = useCallback((rangeMode) => {
    const targetRange = rangeMode === 'selectedDate' ? 'selectedDate' : (rangeMode === 'previousWeek' ? 'previousWeek' : 'currentWeek');
    const isos = targetRange === 'currentWeek'
      ? statsWeekIsos
      : (targetRange === 'previousWeek' ? statsRollingWeekIsos : [selectedStatsDateISO]);

    const summary = isos.reduce((acc, iso) => {
      const oneDay = buildUniqueSummary(weeklyAttendanceDocs[iso]);
      acc.total += oneDay.total;
      acc.guestTotal += oneDay.guestTotal;
      acc.tanzeemTotals.ansar += oneDay.tanzeemTotals.ansar;
      acc.tanzeemTotals.khuddam += oneDay.tanzeemTotals.khuddam;
      acc.tanzeemTotals.atfal += oneDay.tanzeemTotals.atfal;
      return acc;
    }, { total: 0, guestTotal: 0, tanzeemTotals: { ansar: 0, khuddam: 0, atfal: 0 } });

    const dayRows = isos.map((iso) => {
      const totals = getDailyTotalsForStats(weeklyAttendanceDocs[iso]);
      const dateObj = parseISO(iso);
      const weekdayShort = dateObj
        ? new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(dateObj).replace(/\.$/, '')
        : iso;
      const dateLabel = dateObj
        ? new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dateObj)
        : iso;
      const normalizedWeekday = weekdayShort
        ? weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1, 2).toLowerCase()
        : '—';
      return {
        tag: `${normalizedWeekday}, ${dateLabel}`,
        iso,
        anzahlGebete: Number(totals.total) || 0,
        ansar: Number(totals.tanzeemTotals?.ansar) || 0,
        khuddam: Number(totals.tanzeemTotals?.khuddam) || 0,
        atfal: Number(totals.tanzeemTotals?.atfal) || 0,
        gaeste: Number(totals.guestTotal) || 0,
      };
    });

    const prayerAgg = {
      fajr: { total: 0, ansar: 0, khuddam: 0, atfal: 0, guest: 0 },
      sohar: { total: 0, ansar: 0, khuddam: 0, atfal: 0, guest: 0 },
      asr: { total: 0, ansar: 0, khuddam: 0, atfal: 0, guest: 0 },
      maghrib: { total: 0, ansar: 0, khuddam: 0, atfal: 0, guest: 0 },
      ishaa: { total: 0, ansar: 0, khuddam: 0, atfal: 0, guest: 0 },
    };
    isos.forEach((iso) => {
      const rows = getPrayerCountsForStats(weeklyAttendanceDocs[iso]);
      rows.forEach((row) => {
        if (!prayerAgg[row.key]) return;
        prayerAgg[row.key].total += Number(row.total) || 0;
        prayerAgg[row.key].ansar += Number(row.tanzeemTotals?.ansar) || 0;
        prayerAgg[row.key].khuddam += Number(row.tanzeemTotals?.khuddam) || 0;
        prayerAgg[row.key].atfal += Number(row.tanzeemTotals?.atfal) || 0;
        prayerAgg[row.key].guest += Number(row.guest) || 0;
      });
    });
    const prayerRows = [
      { gebet: 'Fajr', anzahl: prayerAgg.fajr.total, ansar: prayerAgg.fajr.ansar, khuddam: prayerAgg.fajr.khuddam, atfal: prayerAgg.fajr.atfal, gaeste: prayerAgg.fajr.guest },
      { gebet: 'Sohr', anzahl: prayerAgg.sohar.total, ansar: prayerAgg.sohar.ansar, khuddam: prayerAgg.sohar.khuddam, atfal: prayerAgg.sohar.atfal, gaeste: prayerAgg.sohar.guest },
      { gebet: 'Asr', anzahl: prayerAgg.asr.total, ansar: prayerAgg.asr.ansar, khuddam: prayerAgg.asr.khuddam, atfal: prayerAgg.asr.atfal, gaeste: prayerAgg.asr.guest },
      { gebet: 'Maghrib', anzahl: prayerAgg.maghrib.total, ansar: prayerAgg.maghrib.ansar, khuddam: prayerAgg.maghrib.khuddam, atfal: prayerAgg.maghrib.atfal, gaeste: prayerAgg.maghrib.guest },
      { gebet: 'Ishaa', anzahl: prayerAgg.ishaa.total, ansar: prayerAgg.ishaa.ansar, khuddam: prayerAgg.ishaa.khuddam, atfal: prayerAgg.ishaa.atfal, gaeste: prayerAgg.ishaa.guest },
    ];
    const totalPrayers = prayerRows.reduce((sum, row) => sum + (Number(row.anzahl) || 0), 0);

    const topMajlisRows = (() => {
      const map = {};
      isos.forEach((iso) => {
        const byPrayer = weeklyAttendanceDocs[iso]?.byPrayer || {};
        Object.values(byPrayer).forEach((prayerNode) => {
          const tanzeemMap = prayerNode?.tanzeem || {};
          STATS_TANZEEM_KEYS.forEach((key) => {
            const majlis = tanzeemMap[key]?.majlis || {};
            Object.entries(majlis).forEach(([loc, count]) => {
              if (!map[loc]) map[loc] = { total: 0, byTanzeem: { ansar: 0, khuddam: 0, atfal: 0 } };
              const numericCount = Number(count) || 0;
              map[loc].total += numericCount;
              map[loc].byTanzeem[key] += numericCount;
            });
          });
        });
      });
      return Object.entries(map)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([locationKey, value]) => ({
          majlis: formatMajlisName(locationKey),
          gebeteDieseWoche: Number(value.total) || 0,
          davonAnsar: Number(value.byTanzeem.ansar) || 0,
          davonKhuddam: Number(value.byTanzeem.khuddam) || 0,
          davonAtfal: Number(value.byTanzeem.atfal) || 0,
        }));
    })();
    const prayerOrder = STATS_PRAYER_SEQUENCE.reduce((acc, item, index) => {
      acc[item.key] = index;
      return acc;
    }, {});
    const prayerLogRows = [];
    isos.forEach((iso) => {
      const byPrayer = weeklyAttendanceDocs[iso]?.byPrayer || {};
      Object.entries(byPrayer).forEach(([prayerKey, prayerNode]) => {
        const memberDetails = prayerNode?.memberDetails || {};
        Object.entries(memberDetails).forEach(([tanzeemKey, majlisMap]) => {
          Object.entries(majlisMap || {}).forEach(([locationKey, memberList]) => {
            const rows = Array.isArray(memberList) ? memberList : [];
            rows.forEach((entry, index) => {
              const rawTimestamp = String(entry?.timestamp || '');
              const parsedTs = rawTimestamp ? new Date(rawTimestamp).getTime() : Number.NaN;
              prayerLogRows.push({
                dateISO: String(iso || ''),
                prayerKey: String(prayerKey || ''),
                idNumber: String(entry?.idNumber || ''),
                tanzeem: String(entry?.tanzeem || tanzeemKey || '').toLowerCase(),
                majlis: String(entry?.majlis || formatMajlisName(locationKey)),
                timestamp: rawTimestamp,
                sortTs: Number.isNaN(parsedTs) ? null : parsedTs,
                seq: index,
              });
            });
          });
        });
      });
    });
    prayerLogRows.sort((a, b) => {
      if (a.sortTs !== null && b.sortTs !== null) return a.sortTs - b.sortTs;
      if (a.dateISO !== b.dateISO) return a.dateISO.localeCompare(b.dateISO);
      const aPrayer = Object.prototype.hasOwnProperty.call(prayerOrder, a.prayerKey) ? prayerOrder[a.prayerKey] : Number.MAX_SAFE_INTEGER;
      const bPrayer = Object.prototype.hasOwnProperty.call(prayerOrder, b.prayerKey) ? prayerOrder[b.prayerKey] : Number.MAX_SAFE_INTEGER;
      if (aPrayer !== bPrayer) return aPrayer - bPrayer;
      if (a.idNumber !== b.idNumber) return a.idNumber.localeCompare(b.idNumber, 'de-DE', { numeric: true, sensitivity: 'base' });
      return a.seq - b.seq;
    });

    return {
      rangeMode: targetRange,
      isos,
      summary,
      dayRows,
      prayerRows,
      topMajlisRows,
      prayerLogRows,
      totalPrayers,
    };
  }, [selectedStatsDateISO, statsWeekIsos, statsRollingWeekIsos, weeklyAttendanceDocs]);

  const hasStatsExportData = useMemo(() => {
    const current = getStatsExportDataset('currentWeek');
    const previous = getStatsExportDataset('previousWeek');
    const selected = getStatsExportDataset('selectedDate');
    return current.summary.total > 0 || previous.summary.total > 0 || selected.summary.total > 0;
  }, [getStatsExportDataset]);

  const writeStatsWorkbook = useCallback(async (rangeMode) => {
    const dataset = getStatsExportDataset(rangeMode);
    const startISO = dataset.isos?.[0] || 'na';
    const endISO = dataset.isos?.[dataset.isos.length - 1] || 'na';
    const formatIsoForExport = (iso) => {
      const dateObj = parseISO(iso);
      if (!dateObj) return iso;
      const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(dateObj).replace(/\.$/, '');
      const datePart = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dateObj);
      return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${datePart}`;
    };
    const startLabel = formatIsoForExport(startISO);
    const endLabel = formatIsoForExport(endISO);
    if (!dataset.dayRows.length || dataset.summary.total <= 0) {
      setToast('Keine Daten zum Export verfügbar');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const exportTimestamp = new Intl.DateTimeFormat('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date());

    const overviewRows = [
      ['Moschee', activeMosque.label],
      ['Zeitraum', `${startLabel} – ${endLabel}`],
      ['Export Zeitstempel', exportTimestamp],
      [],
      ['Gesamt Gebete der Woche', Number(dataset.totalPrayers) || 0],
      ['Gesamt Anwesende der Woche', Number(dataset.summary.total) || 0],
      ['Gäste total', Number(dataset.summary.guestTotal) || 0],
      ['Ansar total', Number(dataset.summary.tanzeemTotals.ansar) || 0],
      ['Khuddam total', Number(dataset.summary.tanzeemTotals.khuddam) || 0],
      ['Atfal total', Number(dataset.summary.tanzeemTotals.atfal) || 0],
    ];
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewRows);
    overviewSheet['!cols'] = [{ wch: 28 }, { wch: 36 }];

    const dayRows = [
      ['Tag', 'Anzahl Gebete', 'Ansar', 'Khuddam', 'Atfal', 'Gäste'],
      ...dataset.dayRows.map((row) => [
        row.tag,
        Number(row.anzahlGebete) || 0,
        Number(row.ansar) || 0,
        Number(row.khuddam) || 0,
        Number(row.atfal) || 0,
        Number(row.gaeste) || 0,
      ]),
    ];
    const daySheet = XLSX.utils.aoa_to_sheet(dayRows);
    daySheet['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];

    const prayerRows = [
      ['Gebet', 'Anzahl', 'Ansar', 'Khuddam', 'Atfal', 'Gäste'],
      ...dataset.prayerRows.map((row) => [
        row.gebet,
        Number(row.anzahl) || 0,
        Number(row.ansar) || 0,
        Number(row.khuddam) || 0,
        Number(row.atfal) || 0,
        Number(row.gaeste) || 0,
      ]),
    ];
    const prayerSheet = XLSX.utils.aoa_to_sheet(prayerRows);
    prayerSheet['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    const locationHeaderLabel = hasGuestEntriesWithoutMajlis ? 'Jamaat' : 'Majlis';

    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Übersicht');
    XLSX.utils.book_append_sheet(workbook, daySheet, 'Gebete nach Tage');
    XLSX.utils.book_append_sheet(workbook, prayerSheet, 'Gebete nach Gebetszeiten');

    if (dataset.topMajlisRows.length) {
      const topRows = [
        [locationHeaderLabel, 'Gebete diese Woche', 'davon Ansar', 'davon Khuddam', 'davon Atfal'],
        ...dataset.topMajlisRows.map((row) => [
          row.majlis,
          Number(row.gebeteDieseWoche) || 0,
          Number(row.davonAnsar) || 0,
          Number(row.davonKhuddam) || 0,
          Number(row.davonAtfal) || 0,
        ]),
      ];
      const topSheet = XLSX.utils.aoa_to_sheet(topRows);
      topSheet['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(workbook, topSheet, `Gebete nach ${locationHeaderLabel}`);
    }
    if (dataset.prayerLogRows.length) {
      const protocolHeader = shouldIncludeGuestNameInExports
        ? ['Datum', 'Zeitstempel', 'Gebetszeit', 'ID', 'Name', 'Tanzeem', locationHeaderLabel]
        : ['Datum', 'Zeitstempel', 'Gebetszeit', 'ID', 'Tanzeem', locationHeaderLabel];
      const protocolRows = [
        protocolHeader,
        ...dataset.prayerLogRows.map((row) => {
          const metadata = memberMetadataById[String(row.idNumber || '').trim()] || {};
          const values = [
            formatIsoWithWeekday(row.dateISO),
            formatGermanDateTime(row.timestamp),
            STATS_PRAYER_SEQUENCE.find((item) => item.key === row.prayerKey)?.label || row.prayerKey,
            row.idNumber || '—',
          ];
          if (shouldIncludeGuestNameInExports) values.push(metadata?.name || '—');
          values.push(
            TANZEEM_LABELS[row.tanzeem] || row.tanzeem || '—',
            resolveExportMajlisLabel(row.majlis, metadata?.amarat),
          );
          return values;
        }),
      ];
      const protocolSheet = XLSX.utils.aoa_to_sheet(protocolRows);
      protocolSheet['!cols'] = shouldIncludeGuestNameInExports
        ? [{ wch: 22 }, { wch: 24 }, { wch: 16 }, { wch: 12 }, { wch: 24 }, { wch: 14 }, { wch: 24 }]
        : [{ wch: 22 }, { wch: 24 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 24 }];
      XLSX.utils.book_append_sheet(workbook, protocolSheet, 'Gebetsprotokoll');
    }

    const boldCellStyle = { font: { bold: true } };
    ['Übersicht', 'Gebete nach Tage', 'Gebete nach Gebetszeiten', `Gebete nach ${locationHeaderLabel}`, 'Gebetsprotokoll'].forEach((sheetName) => {
      const ws = workbook.Sheets[sheetName];
      if (!ws) return;
      const ref = ws['!ref'];
      if (!ref) return;
      const range = XLSX.utils.decode_range(ref);
      for (let col = range.s.c; col <= range.e.c; col += 1) {
        const addr = XLSX.utils.encode_cell({ c: col, r: 0 });
        if (!ws[addr]) continue;
        ws[addr].s = boldCellStyle;
      }
    });

    const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const safeStart = startLabel.replace(/[,\s]+/g, '_').replace(/[^a-zA-Z0-9._-äöüÄÖÜß]/g, '');
    const safeEnd = endLabel.replace(/[,\s]+/g, '_').replace(/[^a-zA-Z0-9._-äöüÄÖÜß]/g, '');
    const fileName = `Stats_${exportMosqueNameForFile}_${safeStart}_${safeEnd}.xlsx`;

    if (Platform.OS === 'web') {
      if (!globalThis.atob) throw new Error('Base64 Dekodierung auf Web nicht verfügbar');
      const binary = globalThis.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
      return;
    }

    const cacheDir = String(FileSystem.cacheDirectory || '');
    if (!cacheDir) {
      throw new Error('Dateisystem nicht verfügbar (cacheDirectory fehlt)');
    }
    const fileUri = `${cacheDir}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      setToast('Sharing auf diesem Gerät nicht verfügbar');
      return;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Statistik exportieren',
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
  }, [activeMosque.label, exportMosqueNameForFile, getStatsExportDataset, hasGuestEntriesWithoutMajlis, memberMetadataById, resolveExportMajlisLabel, shouldIncludeGuestNameInExports]);

  const handleExportStats = useCallback(async (rangeMode) => {
    if (!effectivePermissions.canExportData) { setToast('Keine Berechtigung'); return; }
    if (statsExporting) return;
    setStatsExporting(true);
    try {
      await writeStatsWorkbook(rangeMode);
      setStatsExportModalVisible(false);
    } catch (error) {
      const message = String(error?.message || '').trim();
      setToast(message ? `Export fehlgeschlagen: ${message}` : 'Export fehlgeschlagen');
      console.error('Stats export failed', error);
    } finally {
      setStatsExporting(false);
    }
  }, [effectivePermissions.canExportData, statsExporting, writeStatsWorkbook]);

  const writeProgramWorkbook = useCallback(async () => {
    const dateLabel = formatIsoWithWeekday(selectedProgramConfigDateISO || todayISO);
    const activeTanzeems = [...PROGRAM_TANZEEM_OPTIONS];
    const exportTimestamp = new Intl.DateTimeFormat('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date());
    const total = Number(programStats?.total) || 0;
    const tanzeemTotals = {
      ansar: Number(programStats?.byTanzeem?.ansar) || 0,
      khuddam: Number(programStats?.byTanzeem?.khuddam) || 0,
      atfal: Number(programStats?.byTanzeem?.atfal) || 0,
      kinder: Number(programStats?.byTanzeem?.kinder) || 0,
      guest: Number(programStats?.guestTotal) || 0,
    };

    const registeredTotals = membersDirectory.reduce((acc, entry) => {
      const tanzeem = String(entry?.tanzeem || '').toLowerCase();
      acc.total += 1;
      if (Object.prototype.hasOwnProperty.call(acc, tanzeem)) acc[tanzeem] += 1;
      return acc;
    }, { total: 0, ansar: 0, khuddam: 0, atfal: 0, kinder: 0 });

    const formatRatioWithPercent = (present, registered) => {
      const safePresent = Number(present) || 0;
      const safeRegistered = Number(registered) || 0;
      if (safeRegistered <= 0) return `${safePresent}/${safeRegistered} (0%)`;
      const percentRaw = (safePresent / safeRegistered) * 100;
      const percentRounded = Math.round(percentRaw * 10) / 10;
      const percentLabel = Number.isInteger(percentRounded)
        ? `${percentRounded}`
        : String(percentRounded).replace('.', ',');
      return `${safePresent}/${safeRegistered} (${percentLabel}%)`;
    };

    const majlisAttendanceRows = (() => {
      const buildCountsForFilter = (filterKey) => {
        const registeredByMajlis = membersDirectory
          .filter((entry) => (filterKey === 'total' ? true : entry.tanzeem === filterKey))
          .reduce((acc, entry) => {
            const majlis = resolveExportMajlisLabel(entry?.majlis, entry?.amarat);
            if (!majlis) return acc;
            acc[majlis] = (acc[majlis] || 0) + 1;
            return acc;
          }, {});

        const presentByMajlis = programAttendanceEntries
          .filter((entry) => String(entry?.idNumber || '') !== 'guest')
          .filter((entry) => {
            const tanzeem = String(entry?.tanzeem || '').toLowerCase();
            return filterKey === 'total' ? true : tanzeem === filterKey;
          })
          .reduce((acc, entry) => {
            const majlis = resolveExportMajlisLabel(entry?.majlis, entry?.amarat);
            if (!majlis) return acc;
            acc[majlis] = (acc[majlis] || 0) + 1;
            return acc;
          }, {});

        return { registeredByMajlis, presentByMajlis };
      };

      const totalCounts = buildCountsForFilter('total');
      const tanzeemCounts = activeTanzeems.reduce((acc, key) => {
        acc[key] = buildCountsForFilter(key);
        return acc;
      }, {});

      const allMajlises = Array.from(new Set([
        ...Object.keys(totalCounts.registeredByMajlis),
        ...Object.keys(totalCounts.presentByMajlis),
        ...Object.values(tanzeemCounts).flatMap((node) => ([
          ...Object.keys(node.registeredByMajlis),
          ...Object.keys(node.presentByMajlis),
        ])),
      ]));

      return allMajlises
        .map((majlis) => {
          const byTanzeem = activeTanzeems.reduce((acc, key) => {
            const one = tanzeemCounts[key] || { presentByMajlis: {}, registeredByMajlis: {} };
            acc[key] = {
              present: Number(one.presentByMajlis[majlis]) || 0,
              registered: Number(one.registeredByMajlis[majlis]) || 0,
            };
            return acc;
          }, {});
          return {
            majlis,
            totalPresent: Number(totalCounts.presentByMajlis[majlis]) || 0,
            totalRegistered: Number(totalCounts.registeredByMajlis[majlis]) || 0,
            byTanzeem,
          };
        })
        .sort((a, b) => (b.totalPresent - a.totalPresent) || a.majlis.localeCompare(b.majlis));
    })();

    if (total <= 0 && majlisAttendanceRows.length === 0) {
      setToast('Keine Programmdaten zum Export verfügbar');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const overviewRows = [
      ['Moschee', activeMosque.label],
      ['Datum', dateLabel],
      ['Programm', String(selectedProgramStatsOption?.programName || selectedProgramConfig?.name || '').trim() || '—'],
      ['Export Zeitstempel', exportTimestamp],
      [],
      ['Gesamt Programmanwesenheit', formatRatioWithPercent(total, registeredTotals.total)],
      ['Ansar', formatRatioWithPercent(tanzeemTotals.ansar, registeredTotals.ansar)],
      ['Khuddam', formatRatioWithPercent(tanzeemTotals.khuddam, registeredTotals.khuddam)],
      ['Atfal', formatRatioWithPercent(tanzeemTotals.atfal, registeredTotals.atfal)],
      ['Kinder', formatRatioWithPercent(tanzeemTotals.kinder, registeredTotals.kinder)],
      ['Gäste', tanzeemTotals.guest],
    ];
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewRows);
    overviewSheet['!cols'] = [{ wch: 28 }, { wch: 36 }];
    const locationHeaderLabel = hasGuestEntriesWithoutMajlis ? 'Jamaat' : 'Majlis';

    const majlisAttendanceSheetRows = [
      [locationHeaderLabel, 'Gesamt', ...activeTanzeems.map((key) => TANZEEM_LABELS[key] || key)],
      ...majlisAttendanceRows.map((row) => [
        row.majlis,
        formatRatioWithPercent(row.totalPresent, row.totalRegistered),
        ...activeTanzeems.map((key) => formatRatioWithPercent(row.byTanzeem?.[key]?.present, row.byTanzeem?.[key]?.registered)),
      ]),
    ];
    const majlisAttendanceSheet = XLSX.utils.aoa_to_sheet(majlisAttendanceSheetRows);
    majlisAttendanceSheet['!cols'] = [{ wch: 28 }, ...Array.from({ length: 1 + activeTanzeems.length }, () => ({ wch: 24 }))];

    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Übersicht');
    XLSX.utils.book_append_sheet(workbook, majlisAttendanceSheet, `${locationHeaderLabel} Anwesenheit`);

    const boldCellStyle = { font: { bold: true } };
    ['Übersicht', `${locationHeaderLabel} Anwesenheit`].forEach((sheetName) => {
      const ws = workbook.Sheets[sheetName];
      if (!ws || !ws['!ref']) return;
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let col = range.s.c; col <= range.e.c; col += 1) {
        const addr = XLSX.utils.encode_cell({ c: col, r: 0 });
        if (ws[addr]) ws[addr].s = boldCellStyle;
      }
    });

    const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const safeDate = dateLabel.replace(/[,\s]+/g, '_').replace(/[^a-zA-Z0-9._-äöüÄÖÜß]/g, '');
    const fileName = `Programm_Stats_${exportMosqueNameForFile}_${safeDate}.xlsx`;

    if (Platform.OS === 'web') {
      if (!globalThis.atob) throw new Error('Base64 Dekodierung auf Web nicht verfügbar');
      const binary = globalThis.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
      return;
    }

    const cacheDir = String(FileSystem.cacheDirectory || '');
    if (!cacheDir) throw new Error('Dateisystem nicht verfügbar (cacheDirectory fehlt)');
    const fileUri = `${cacheDir}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      setToast('Sharing auf diesem Gerät nicht verfügbar');
      return;
    }
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Programmdaten exportieren',
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
  }, [activeMosque.key, activeMosque.label, exportMosqueNameForFile, hasGuestEntriesWithoutMajlis, membersDirectory, programAttendanceEntries, programStats, resolveExportMajlisLabel, selectedProgramConfig, selectedProgramConfigDateISO, selectedProgramStatsOption, todayISO]);

  const handleExportProgram = useCallback(async () => {
    if (!effectivePermissions.canExportData) { setToast('Keine Berechtigung'); return; }
    if (programExporting) return;
    setProgramExporting(true);
    try {
      await writeProgramWorkbook();
    } catch (error) {
      const message = String(error?.message || '').trim();
      setToast(message ? `Export fehlgeschlagen: ${message}` : 'Export fehlgeschlagen');
      console.error('Program export failed', error);
    } finally {
      setProgramExporting(false);
    }
  }, [effectivePermissions.canExportData, programExporting, writeProgramWorkbook]);

  const writeRegistrationWorkbook = useCallback(async () => {
    const option = selectedRegistrationStatsOption;
    if (!option?.id) { setToast('Keine Anmeldungsdaten zum Export verfügbar'); return; }
    const activeTanzeems = option.advanced?.includeTanzeems || [];
    const onlyEhlVoters = !isGuestMode && Boolean(option.advanced?.onlyEhlVoters);

    const registeredTotals = membersDirectory
      .filter((entry) => shouldIncludeMemberInRegistrationBase(entry, activeTanzeems, 'total', onlyEhlVoters))
      .reduce((acc, entry) => {
        const tanzeem = String(entry?.tanzeem || '').toLowerCase();
        acc.total += 1;
        if (Object.prototype.hasOwnProperty.call(acc, tanzeem)) acc[tanzeem] += 1;
        return acc;
      }, { total: 0, ansar: 0, khuddam: 0, atfal: 0, kinder: 0 });

    const formatRatioWithPercent = (present, registered) => {
      const safePresent = Number(present) || 0;
      const safeRegistered = Number(registered) || 0;
      if (safeRegistered <= 0) return `${safePresent}/${safeRegistered} (0%)`;
      const percentRaw = (safePresent / safeRegistered) * 100;
      const percentRounded = Math.round(percentRaw * 10) / 10;
      const percentLabel = Number.isInteger(percentRounded)
        ? `${percentRounded}`
        : String(percentRounded).replace('.', ',');
      return `${safePresent}/${safeRegistered} (${percentLabel}%)`;
    };

    const majlisAttendanceRows = (() => {
      const buildCountsForFilter = (filterKey) => {
        const registeredByMajlis = membersDirectory
          .filter((entry) => shouldIncludeMemberInRegistrationBase(entry, activeTanzeems, filterKey, onlyEhlVoters))
          .reduce((acc, entry) => {
            const majlis = resolveExportMajlisLabel(entry?.majlis, entry?.amarat);
            if (!majlis) return acc;
            acc[majlis] = (acc[majlis] || 0) + 1;
            return acc;
          }, {});

        const presentByMajlis = registrationAttendanceEntries
          .filter((entry) => {
            const responseType = String(entry?.registrationResponse || '').toLowerCase();
            if (responseType === 'decline') return false;
            const tanzeem = String(entry?.tanzeem || '').toLowerCase();
            if (!activeTanzeems.includes(tanzeem)) return false;
            return filterKey === 'total' ? true : tanzeem === filterKey;
          })
          .reduce((acc, entry) => {
            const majlis = resolveExportMajlisLabel(entry?.majlis, entry?.amarat);
            if (!majlis) return acc;
            acc[majlis] = (acc[majlis] || 0) + 1;
            return acc;
          }, {});

        return { registeredByMajlis, presentByMajlis };
      };

      const totalCounts = buildCountsForFilter('total');
      const tanzeemCounts = activeTanzeems.reduce((acc, key) => {
        acc[key] = buildCountsForFilter(key);
        return acc;
      }, {});

      const allMajlises = Array.from(new Set([
        ...Object.keys(totalCounts.registeredByMajlis),
        ...Object.keys(totalCounts.presentByMajlis),
        ...Object.values(tanzeemCounts).flatMap((node) => ([
          ...Object.keys(node.registeredByMajlis),
          ...Object.keys(node.presentByMajlis),
        ])),
      ]));

      return allMajlises
        .map((majlis) => {
          const byTanzeem = activeTanzeems.reduce((acc, key) => {
            const one = tanzeemCounts[key] || { presentByMajlis: {}, registeredByMajlis: {} };
            acc[key] = {
              present: Number(one.presentByMajlis[majlis]) || 0,
              registered: Number(one.registeredByMajlis[majlis]) || 0,
            };
            return acc;
          }, {});
          return {
            majlis,
            totalPresent: Number(totalCounts.presentByMajlis[majlis]) || 0,
            totalRegistered: Number(totalCounts.registeredByMajlis[majlis]) || 0,
            byTanzeem,
          };
        })
        .sort((a, b) => (b.totalPresent - a.totalPresent) || a.majlis.localeCompare(b.majlis));
    })();

    if ((Number(registrationStats?.total) || 0) <= 0 && majlisAttendanceRows.length === 0) {
      setToast('Keine Anmeldungsdaten zum Export verfügbar');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const totalAcceptCount = Number(registrationStats?.total) || 0;
    const totalDeclineCount = Number(registrationStats?.declineTotal) || 0;
    const tanzeemOverviewRows = activeTanzeems.map((key) => (
      [TANZEEM_LABELS[key] || key, formatRatioWithPercent(Number(registrationStats?.byTanzeem?.[key]) || 0, registeredTotals[key])]
    ));
    const overviewRows = [
      ['Moschee', activeMosque.label],
      ['Anmeldung', option.name || '—'],
      ['Zeitraum der Anmeldung', `${option.startDate} bis ${option.endDate}`],
      ['Zusagen', formatRatioWithPercent(totalAcceptCount, registeredTotals.total)],
      ['Absagen', totalDeclineCount],
      ['Gesamtanmeldungen (Absagen + Zusagen)', totalAcceptCount + totalDeclineCount],
      ...tanzeemOverviewRows,
    ];
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewRows);
    overviewSheet['!cols'] = [{ wch: 24 }, { wch: 36 }];
    const locationHeaderLabel = hasGuestEntriesWithoutMajlis ? 'Jamaat' : 'Majlis';

    const majlisAttendanceSheetRows = [
      [locationHeaderLabel, 'Gesamt', ...activeTanzeems.map((key) => TANZEEM_LABELS[key] || key)],
      ...majlisAttendanceRows.map((row) => [
        row.majlis,
        formatRatioWithPercent(row.totalPresent, row.totalRegistered),
        ...activeTanzeems.map((key) => formatRatioWithPercent(row.byTanzeem?.[key]?.present, row.byTanzeem?.[key]?.registered)),
      ]),
    ];
    const majlisAttendanceSheet = XLSX.utils.aoa_to_sheet(majlisAttendanceSheetRows);
    majlisAttendanceSheet['!cols'] = [{ wch: 28 }, ...Array.from({ length: 1 + activeTanzeems.length }, () => ({ wch: 24 }))];

    const majlisDeclineRows = registrationAttendanceEntries
      .filter((entry) => String(entry?.registrationResponse || '').toLowerCase() === 'decline')
      .filter((entry) => {
        const tanzeem = String(entry?.tanzeem || '').toLowerCase();
        return activeTanzeems.includes(tanzeem);
      })
      .reduce((acc, entry) => {
        const majlis = resolveExportMajlisLabel(entry?.majlis, entry?.amarat);
        if (!majlis) return acc;
        acc[majlis] = (acc[majlis] || 0) + 1;
        return acc;
      }, {});
    const majlisDeclineSheetRows = [
      [locationHeaderLabel, 'Absagen'],
      ...Object.entries(majlisDeclineRows)
        .map(([majlis, count]) => [majlis, Number(count) || 0])
        .sort((a, b) => (b[1] - a[1]) || String(a[0]).localeCompare(String(b[0]))),
    ];

    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Übersicht');
    XLSX.utils.book_append_sheet(workbook, majlisAttendanceSheet, `${locationHeaderLabel} Zusagen`);
    if (majlisDeclineSheetRows.length > 1) {
      const majlisDeclineSheet = XLSX.utils.aoa_to_sheet(majlisDeclineSheetRows);
      majlisDeclineSheet['!cols'] = [{ wch: 28 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(workbook, majlisDeclineSheet, `${locationHeaderLabel} Absagen`);
    }

    const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const fileName = `Anmeldung_Stats_${toLocationKey(option.name || 'anmeldung')}_${option.startDate}_${option.endDate}.xlsx`;
    if (Platform.OS === 'web') {
      const binary = globalThis.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
      return;
    }
    const fileUri = `${String(FileSystem.cacheDirectory || '')}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Anmeldungsdaten exportieren',
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
  }, [activeMosque.label, hasGuestEntriesWithoutMajlis, isGuestMode, membersDirectory, registrationAttendanceEntries, registrationStats, resolveExportMajlisLabel, selectedRegistrationStatsOption]);

  const handleExportRegistration = useCallback(async () => {
    if (!effectivePermissions.canExportData) { setToast('Keine Berechtigung'); return; }
    if (registrationExporting) return;
    setRegistrationExporting(true);
    try {
      await writeRegistrationWorkbook();
    } catch (error) {
      setToast('Export fehlgeschlagen');
    } finally {
      setRegistrationExporting(false);
    }
  }, [effectivePermissions.canExportData, registrationExporting, writeRegistrationWorkbook]);

  const writeProgramDetailedIdWorkbook = useCallback(async (filterTanzeem = '') => {
    const dateLabel = formatIsoWithWeekday(selectedProgramConfigDateISO || todayISO);
    const exportTimestamp = new Intl.DateTimeFormat('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date());
    const activeProgramName = String(selectedProgramStatsOption?.programName || selectedProgramConfig?.name || '').trim();
    const normalizedFilter = PROGRAM_TANZEEM_OPTIONS.includes(String(filterTanzeem || '').toLowerCase())
      ? String(filterTanzeem || '').toLowerCase()
      : '';

    const tanzeemOrder = normalizedFilter ? [normalizedFilter] : PROGRAM_TANZEEM_OPTIONS;
    const majlisOrderMap = PROGRAM_EXPORT_MAJLIS_ORDER.reduce((acc, name, index) => {
      acc[String(name || '').trim().toLowerCase()] = index;
      return acc;
    }, {});
    const presentMap = new Set(
      programAttendanceEntries
        .filter((entry) => String(entry?.idNumber || '') !== 'guest')
        .map((entry) => {
          const resolvedMajlis = resolveExportMajlisLabel(entry?.majlis, entry?.amarat);
          return [
            String(entry?.idNumber || ''),
            String(entry?.tanzeem || '').toLowerCase(),
            String(resolvedMajlis || '').trim(),
          ].join('||');
        }),
    );
    const attendanceTimestampByKey = programAttendanceEntries
      .filter((entry) => String(entry?.idNumber || '') !== 'guest')
      .reduce((acc, entry) => {
        const resolvedMajlis = resolveExportMajlisLabel(entry?.majlis, entry?.amarat);
        const key = [
          String(entry?.idNumber || ''),
          String(entry?.tanzeem || '').toLowerCase(),
          String(resolvedMajlis || '').trim(),
        ].join('||');
        const timestamp = String(entry?.timestamp || '');
        const existing = String(acc[key] || '');
        if (!existing) acc[key] = timestamp;
        else if (timestamp && new Date(timestamp).getTime() < new Date(existing).getTime()) acc[key] = timestamp;
        return acc;
      }, {});

    const memberRows = membersDirectory
      .filter((entry) => (normalizedFilter ? entry.tanzeem === normalizedFilter : true))
      .map((entry) => ({
        name: String(entry?.name || '').trim(),
        idNumber: String(entry?.idNumber || '').trim(),
        tanzeem: String(entry?.tanzeem || '').toLowerCase(),
        majlis: resolveExportMajlisLabel(entry?.majlis, entry?.amarat),
      }))
      .sort((a, b) => {
        const tA = tanzeemOrder.indexOf(a.tanzeem);
        const tB = tanzeemOrder.indexOf(b.tanzeem);
        if (tA !== tB) return tA - tB;
        const mA = Object.prototype.hasOwnProperty.call(majlisOrderMap, a.majlis.toLowerCase()) ? majlisOrderMap[a.majlis.toLowerCase()] : Number.MAX_SAFE_INTEGER;
        const mB = Object.prototype.hasOwnProperty.call(majlisOrderMap, b.majlis.toLowerCase()) ? majlisOrderMap[b.majlis.toLowerCase()] : Number.MAX_SAFE_INTEGER;
        if (mA !== mB) return mA - mB;
        return a.idNumber.localeCompare(b.idNumber, 'de-DE', { numeric: true, sensitivity: 'base' });
      })
      .map((row) => {
        const key = [row.idNumber, row.tanzeem, row.majlis].join('||');
        return {
          majlis: row.majlis,
          tanzeemLabel: TANZEEM_LABELS[row.tanzeem] || row.tanzeem,
          name: row.name,
          idNumber: row.idNumber,
          present: presentMap.has(key) ? 'Ja' : 'Nein',
          timestamp: presentMap.has(key) ? formatGermanDateTime(attendanceTimestampByKey[key]) : '—',
        };
      });

    if (!memberRows.length) {
      setToast('Keine Mitgliedsdaten zum Export verfügbar');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const locationHeaderLabel = hasGuestEntriesWithoutMajlis ? 'Jamaat' : 'Majlis';
    const idTableHeader = shouldIncludeGuestNameInExports
      ? [locationHeaderLabel, 'Tanzeem', 'ID-Nummer', 'Name', 'Anwesend', 'Zeitstempel']
      : [locationHeaderLabel, 'Tanzeem', 'ID-Nummer', 'Anwesend', 'Zeitstempel'];
    const rows = [
      ['Moschee', activeMosque.label],
      ['Datum', dateLabel],
      ['Programm', activeProgramName || '—'],
      ['Filter Tanzeem', normalizedFilter ? (TANZEEM_LABELS[normalizedFilter] || normalizedFilter) : 'Alle'],
      ['Export Zeitstempel', exportTimestamp],
      [],
      idTableHeader,
      ...memberRows.map((row) => (
        shouldIncludeGuestNameInExports
          ? [row.majlis, row.tanzeemLabel, row.idNumber, row.name || '—', row.present, row.timestamp]
          : [row.majlis, row.tanzeemLabel, row.idNumber, row.present, row.timestamp]
      )),
    ];

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = shouldIncludeGuestNameInExports
      ? [{ wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 24 }]
      : [{ wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(workbook, sheet, 'Übersicht');

    const boldCellStyle = { font: { bold: true } };
    if (sheet.A1) sheet.A1.s = boldCellStyle;
    if (sheet.B1) sheet.B1.s = boldCellStyle;
    if (sheet.A7) sheet.A7.s = boldCellStyle;
    if (sheet.B7) sheet.B7.s = boldCellStyle;
    if (sheet.C7) sheet.C7.s = boldCellStyle;
    if (sheet.D7) sheet.D7.s = boldCellStyle;
    if (sheet.E7) sheet.E7.s = boldCellStyle;
    if (shouldIncludeGuestNameInExports && sheet.F7) sheet.F7.s = boldCellStyle;

    const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const safeDate = dateLabel.replace(/[\,\s]+/g, '_').replace(/[^a-zA-Z0-9._-äöüÄÖÜß]/g, '');
    const tanzeemFile = normalizedFilter ? `_${normalizedFilter}` : '_alle';
    const fileName = `Programm_ID_Uebersicht_${exportMosqueNameForFile}${tanzeemFile}_${safeDate}.xlsx`;

    if (Platform.OS === 'web') {
      if (!globalThis.atob) throw new Error('Base64 Dekodierung auf Web nicht verfügbar');
      const binary = globalThis.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
      return;
    }

    const cacheDir = String(FileSystem.cacheDirectory || '');
    if (!cacheDir) throw new Error('Dateisystem nicht verfügbar (cacheDirectory fehlt)');
    const fileUri = `${cacheDir}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      setToast('Sharing auf diesem Gerät nicht verfügbar');
      return;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Programm-ID-Übersicht exportieren',
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
  }, [activeMosque.key, activeMosque.label, exportMosqueNameForFile, hasGuestEntriesWithoutMajlis, membersDirectory, programAttendanceEntries, resolveExportMajlisLabel, selectedProgramConfig, selectedProgramConfigDateISO, selectedProgramStatsOption, shouldIncludeGuestNameInExports, todayISO]);

  const handleExportProgramDetailedIds = useCallback(async () => {
    if (!effectivePermissions.canExportData) { setToast('Keine Berechtigung'); return; }
    if (detailedProgramExporting) return;
    setDetailedProgramExporting(true);
    try {
      await writeProgramDetailedIdWorkbook(detailedFlowTanzeem);
    } catch (error) {
      const message = String(error?.message || '').trim();
      setToast(message ? `Export fehlgeschlagen: ${message}` : 'Export fehlgeschlagen');
      console.error('Program detailed export failed', error);
    } finally {
      setDetailedProgramExporting(false);
    }
  }, [detailedFlowTanzeem, detailedProgramExporting, effectivePermissions.canExportData, writeProgramDetailedIdWorkbook]);

  const writeRegistrationDetailedIdWorkbook = useCallback(async (filterTanzeem = '') => {
    const option = selectedRegistrationStatsOption;
    if (!option?.id) { setToast('Keine Anmeldung ausgewählt'); return; }
    const exportTimestamp = new Intl.DateTimeFormat('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date());
    const allowedTanzeems = option.advanced?.includeTanzeems || [];
    const onlyEhlVoters = !isGuestMode && Boolean(option.advanced?.onlyEhlVoters);
    const normalizedFilter = allowedTanzeems.includes(String(filterTanzeem || '').toLowerCase())
      ? String(filterTanzeem || '').toLowerCase()
      : '';
    const tanzeemOrder = normalizedFilter ? [normalizedFilter] : allowedTanzeems;
    const majlisOrderMap = PROGRAM_EXPORT_MAJLIS_ORDER.reduce((acc, name, index) => {
      acc[String(name || '').trim().toLowerCase()] = index;
      return acc;
    }, {});
    const attendanceResponseByKey = registrationAttendanceEntries
      .reduce((acc, entry) => {
        const resolvedMajlis = resolveExportMajlisLabel(entry?.majlis, entry?.amarat);
        const key = [
          String(entry?.idNumber || ''),
          String(entry?.tanzeem || '').toLowerCase(),
          String(resolvedMajlis || '').trim(),
        ].join('||');
        const response = String(entry?.registrationResponse || '').trim().toLowerCase() === 'decline' ? 'decline' : 'accept';
        const reason = String(entry?.declineReason || '').trim();
        const timestamp = String(entry?.timestamp || '');
        const existingTimestamp = String(acc[key]?.timestamp || '');
        if (!existingTimestamp) {
          acc[key] = { response, reason, timestamp };
        } else if (timestamp && new Date(timestamp).getTime() < new Date(existingTimestamp).getTime()) {
          acc[key] = { response, reason, timestamp };
        }
        return acc;
      }, {});

    const memberRows = membersDirectory
      .filter((entry) => shouldIncludeMemberInRegistrationBase(entry, allowedTanzeems, normalizedFilter || 'total', onlyEhlVoters))
      .map((entry) => ({
        name: String(entry?.name || '').trim(),
        idNumber: String(entry?.idNumber || '').trim(),
        tanzeem: String(entry?.tanzeem || '').toLowerCase(),
        majlis: resolveExportMajlisLabel(entry?.majlis, entry?.amarat),
        anwesend_2026_01_08: normalizeVoterFlagValue(entry?.anwesend_2026_01_08),
      }))
      .sort((a, b) => {
        const tA = tanzeemOrder.indexOf(a.tanzeem);
        const tB = tanzeemOrder.indexOf(b.tanzeem);
        if (tA !== tB) return tA - tB;
        const mA = Object.prototype.hasOwnProperty.call(majlisOrderMap, a.majlis.toLowerCase()) ? majlisOrderMap[a.majlis.toLowerCase()] : Number.MAX_SAFE_INTEGER;
        const mB = Object.prototype.hasOwnProperty.call(majlisOrderMap, b.majlis.toLowerCase()) ? majlisOrderMap[b.majlis.toLowerCase()] : Number.MAX_SAFE_INTEGER;
        if (mA !== mB) return mA - mB;
        return a.idNumber.localeCompare(b.idNumber, 'de-DE', { numeric: true, sensitivity: 'base' });
      })
      .map((row) => {
        const key = [row.idNumber, row.tanzeem, row.majlis].join('||');
        const responseNode = attendanceResponseByKey[key];
        const responseType = String(responseNode?.response || '');
        const hasDecline = responseType === 'decline';
        const hasAccept = responseType === 'accept';
        const responseTimestamp = String(responseNode?.timestamp || '');
        const declineReason = String(responseNode?.reason || '').trim();
        return {
          majlis: row.majlis,
          tanzeemLabel: TANZEEM_LABELS[row.tanzeem] || row.tanzeem,
          name: row.name,
          idNumber: row.idNumber,
          anwesend_2026_01_08: row.anwesend_2026_01_08,
          registeredAccept: hasAccept ? 'Ja' : (hasDecline ? 'Nein' : '-'),
          declined: hasDecline ? 'Ja' : (hasAccept ? 'Nein' : '-'),
          declineReason: hasDecline ? (declineReason || '-') : '-',
          timestamp: responseTimestamp ? formatGermanDateTime(responseTimestamp) : '—',
        };
      });

    if (!memberRows.length) {
      setToast('Keine Mitgliedsdaten zum Export verfügbar');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const locationHeaderLabel = hasGuestEntriesWithoutMajlis ? 'Jamaat' : 'Majlis';
    const detailedHeader = isGuestMode
      ? (shouldIncludeGuestNameInExports
        ? [locationHeaderLabel, 'Tanzeem', 'ID-Nummer', 'Name', 'Zusage', 'Absage', 'Grund', 'Zeitstempel']
        : [locationHeaderLabel, 'Tanzeem', 'ID-Nummer', 'Zusage', 'Absage', 'Grund', 'Zeitstempel'])
      : ['Majlis', 'Tanzeem', 'ID-Nummer', 'Anwesend am 08.01.2026', 'Zusage', 'Absage', 'Grund', 'Zeitstempel'];
    const rows = [
      ['Moschee', activeMosque.label],
      ['Anmeldung', option.name || '—'],
      ['Zeitraum der Anmeldung', `${option.startDate} bis ${option.endDate}`],
      ['Filter Tanzeem', normalizedFilter ? (TANZEEM_LABELS[normalizedFilter] || normalizedFilter) : 'Alle'],
      ['Export Zeitstempel', exportTimestamp],
      [],
      detailedHeader,
      ...memberRows.map((row) => {
        if (isGuestMode) {
          if (shouldIncludeGuestNameInExports) {
            return [row.majlis, row.tanzeemLabel, row.idNumber, row.name || '—', row.registeredAccept, row.declined, row.declineReason, row.timestamp];
          }
          return [row.majlis, row.tanzeemLabel, row.idNumber, row.registeredAccept, row.declined, row.declineReason, row.timestamp];
        }
        return [
          row.majlis,
          row.tanzeemLabel,
          row.idNumber,
          row.anwesend_2026_01_08 === 1 ? 'Ja' : (row.anwesend_2026_01_08 === 0 ? 'Nein' : '-'),
          row.registeredAccept,
          row.declined,
          row.declineReason,
          row.timestamp,
        ];
      }),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = isGuestMode
      ? (shouldIncludeGuestNameInExports
        ? [{ wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 24 }, { wch: 20 }, { wch: 12 }, { wch: 28 }, { wch: 24 }]
        : [{ wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 28 }, { wch: 24 }])
      : [{ wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 12 }, { wch: 28 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(workbook, sheet, 'Übersicht');

    const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const fileName = `Anmeldung_ID_Uebersicht_${toLocationKey(option.name || 'anmeldung')}_${option.startDate}_${option.endDate}.xlsx`;
    if (Platform.OS === 'web') {
      if (!globalThis.atob) throw new Error('Base64 Dekodierung auf Web nicht verfügbar');
      const binary = globalThis.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
      return;
    }
    const cacheDir = String(FileSystem.cacheDirectory || '');
    if (!cacheDir) throw new Error('Dateisystem nicht verfügbar (cacheDirectory fehlt)');
    const fileUri = `${cacheDir}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Anmeldungs-ID-Übersicht exportieren',
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
  }, [activeMosque.label, hasGuestEntriesWithoutMajlis, isGuestMode, membersDirectory, registrationAttendanceEntries, resolveExportMajlisLabel, selectedRegistrationStatsOption, shouldIncludeGuestNameInExports]);

  const handleExportRegistrationDetailedIds = useCallback(async () => {
    if (!effectivePermissions.canExportData) { setToast('Keine Berechtigung'); return; }
    if (detailedRegistrationExporting) return;
    setDetailedRegistrationExporting(true);
    try {
      await writeRegistrationDetailedIdWorkbook(detailedFlowTanzeem);
    } catch (error) {
      const message = String(error?.message || '').trim();
      setToast(message ? `Export fehlgeschlagen: ${message}` : 'Export fehlgeschlagen');
      console.error('Registration detailed export failed', error);
    } finally {
      setDetailedRegistrationExporting(false);
    }
  }, [detailedFlowTanzeem, detailedRegistrationExporting, effectivePermissions.canExportData, writeRegistrationDetailedIdWorkbook]);

  function formatMajlisName(locationKey) {
    if (isGuestMode && String(locationKey || '').trim() === 'ohne_majlis') {
      return resolveExportMajlisLabel('-');
    }
    if (MAJLIS_LABELS[locationKey]) return MAJLIS_LABELS[locationKey];
    return String(locationKey || '')
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  const weekRankingRows = useMemo(() => {
    const metadataById = new Map();
    membersDirectory.forEach((entry) => {
      const id = String(entry?.idNumber || '').trim();
      if (!id || metadataById.has(id)) return;
      metadataById.set(id, {
        tanzeem: String(entry?.tanzeem || '').toLowerCase(),
        majlis: String(entry?.majlis || '').trim(),
      });
    });

    const rankingIsos = statsWeekRankingRange === 'previousWeek' ? statsRollingWeekIsos : statsWeekIsos;
    const countsById = new Map();
    rankingIsos.forEach((iso) => {
      const byPrayer = weeklyAttendanceDocs[iso]?.byPrayer || {};
      Object.values(byPrayer).forEach((prayerNode) => {
        const memberDetails = prayerNode?.memberDetails || {};
        STATS_TANZEEM_KEYS.forEach((tanzeemKey) => {
          const majlisMap = memberDetails[tanzeemKey] || {};
          Object.entries(majlisMap).forEach(([locationKey, entries]) => {
            if (!Array.isArray(entries)) return;
            entries.forEach((entry) => {
              const id = String(entry?.idNumber || '').trim();
              if (!id) return;
              const meta = metadataById.get(id);
              const tanzeem = String(meta?.tanzeem || entry?.tanzeem || tanzeemKey || '').toLowerCase();
              const majlis = String(meta?.majlis || entry?.majlis || formatMajlisName(locationKey) || '').trim();
              if (!countsById.has(id)) countsById.set(id, { idNumber: id, tanzeem, majlis, count: 0 });
              const row = countsById.get(id);
              row.count += 1;
              if (!row.tanzeem && tanzeem) row.tanzeem = tanzeem;
              if (!row.majlis && majlis) row.majlis = majlis;
            });
          });
        });
      });
    });

    const filtered = Array.from(countsById.values()).filter((row) => (
      statsWeekRankingFilter === 'total' ? true : row.tanzeem === statsWeekRankingFilter
    ));
    filtered.sort((a, b) => (b.count - a.count) || a.idNumber.localeCompare(b.idNumber));

    let denseRank = 0;
    let previousCount = null;
    return filtered.filter((row) => {
      if (previousCount !== row.count) {
        denseRank += 1;
        previousCount = row.count;
      }
      return denseRank <= 3;
    });
  }, [membersDirectory, statsWeekIsos, statsRollingWeekIsos, weeklyAttendanceDocs, statsWeekRankingFilter, statsWeekRankingRange]);

  const detailedMajlisOptions = useMemo(() => {
    if (!detailedFlowTanzeem) return [];
    return Array.from(new Set(
      membersDirectory
        .filter((entry) => entry.tanzeem === detailedFlowTanzeem)
        .map((entry) => entry.majlis),
    )).sort((a, b) => a.localeCompare(b));
  }, [membersDirectory, detailedFlowTanzeem]);

  const detailedIdChoices = useMemo(() => {
    if (!detailedFlowTanzeem || !detailedFlowMajlis) return [];
    const query = detailedIdSearchQuery.trim();
    const isProgramDetailedMode = statsMode === 'program';
    const activeItemName = isProgramDetailedMode
      ? String(selectedProgramStatsOption?.programName || selectedProgramConfig?.name || '').trim()
      : String(selectedRegistrationStatsOption?.name || '').trim();
    const attendanceEntries = isProgramDetailedMode ? programAttendanceEntries : registrationAttendanceEntries;
    const registrationResponseById = new Map(
      isProgramDetailedMode
        ? []
        : attendanceEntries
          .filter((entry) => String(entry?.tanzeem || '').toLowerCase() === detailedFlowTanzeem)
          .filter((entry) => String(entry?.majlis || '').trim() === detailedFlowMajlis)
          .map((entry) => ([
            String(entry?.idNumber || '').trim(),
            {
              response: String(entry?.registrationResponse || '').toLowerCase() === 'decline' ? 'decline' : 'accept',
              hasReason: Boolean(String(entry?.declineReason || '').trim()),
            },
          ])),
    );
    const presentIds = new Set(
      attendanceEntries
        .filter((entry) => String(entry?.tanzeem || '').toLowerCase() === detailedFlowTanzeem)
        .filter((entry) => String(entry?.majlis || '').trim() === detailedFlowMajlis)
        .filter((entry) => (isProgramDetailedMode ? true : String(entry?.registrationResponse || '').toLowerCase() !== 'decline'))
        .map((entry) => String(entry?.idNumber || '').trim())
        .filter(Boolean),
    );

    return membersDirectory
      .filter((entry) => entry.tanzeem === detailedFlowTanzeem && entry.majlis === detailedFlowMajlis)
      .filter((entry) => (
        statsMode !== 'registration' || isGuestMode
          ? true
          : normalizeVoterFlagValue(entry?.stimmberechtigt) !== '-'
      ))
      .filter((entry) => (!query || String(entry.idNumber).includes(query)))
      .map((entry) => ({
        ...entry,
        normalizedStimmberechtigt: normalizeVoterFlagValue(entry?.stimmberechtigt),
        isPresentInActiveFlow: Boolean(presentIds.has(String(entry.idNumber))),
        registrationResponseInActiveFlow: String(registrationResponseById.get(String(entry.idNumber))?.response || ''),
        registrationDeclineHasReason: Boolean(registrationResponseById.get(String(entry.idNumber))?.hasReason),
        hasActiveFlow: Boolean(activeItemName),
      }))
      .sort((a, b) => String(a.idNumber).localeCompare(String(b.idNumber)));
  }, [isGuestMode, membersDirectory, detailedFlowTanzeem, detailedFlowMajlis, detailedIdSearchQuery, selectedProgramConfig, selectedProgramStatsOption, selectedRegistrationStatsOption, programAttendanceEntries, registrationAttendanceEntries, statsMode]);

  const detailedCurrentWeekIsos = useMemo(() => {
    const selectedWeekStartDate = parseISO(selectedStatsWeekStartISO || '');
    return getWeekIsosMondayToSunday(selectedWeekStartDate || now);
  }, [now, selectedStatsWeekStartISO]);
  const detailedLast7Days = useMemo(() => {
    const selectedWeekStartDate = parseISO(selectedStatsWeekStartISO || '');
    const baseDate = addDays(selectedWeekStartDate || startOfWeekMonday(now), -1);
    return getLast7Days(baseDate);
  }, [now, selectedStatsWeekStartISO]);
  const detailedLast8Weeks = useMemo(() => {
    const selectedWeekStartDate = parseISO(selectedStatsWeekStartISO || '');
    const baseDate = addDays(selectedWeekStartDate || startOfWeekMonday(now), 6);
    return getLast8Weeks(baseDate);
  }, [now, selectedStatsWeekStartISO]);

  const loadDetailedLogsForMember = async (idNumber, minISO, maxISO, options = {}) => {
    const { bypassCache = false, silent = false } = options;
    const cacheKey = `${idNumber}_${minISO}_${maxISO}`;
    if (!bypassCache && Array.isArray(detailedLogsCacheRef.current[cacheKey])) {
      setDetailedMemberLogs(detailedLogsCacheRef.current[cacheKey]);
      return;
    }
    if (!silent) setDetailedLogsLoading(true);
    try {
      const ids = await listDocIds(MEMBER_DIRECTORY_COLLECTION);
      const relevantIds = ids.filter((docId) => {
        const id = String(docId || '');
        if (!/^\d{4}-\d{2}-\d{2}_/.test(id)) return false;
        const dateISO = id.slice(0, 10);
        if (dateISO < minISO || dateISO > maxISO) return false;
        return id.endsWith(`_${String(idNumber)}`);
      });
      const rows = await Promise.all(relevantIds.map(async (docId) => {
        const doc = await getDocData(MEMBER_DIRECTORY_COLLECTION, docId);
        return doc || null;
      }));
      const filteredRows = rows
        .filter(Boolean)
        .filter((row) => String(row?.idNumber || '') === String(idNumber))
        .filter((row) => {
          const iso = String(row?.date || '');
          return /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso >= minISO && iso <= maxISO;
        })
        .filter((row) => Boolean(row?.prayer))
        .map((row) => ({
          date: String(row?.date || ''),
          prayer: String(row?.prayer || ''),
          tanzeem: String(row?.tanzeem || ''),
          majlis: String(row?.majlis || ''),
          timestamp: String(row?.timestamp || ''),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      detailedLogsCacheRef.current[cacheKey] = filteredRows;
      setDetailedMemberLogs(filteredRows);
    } catch {
      setToast('Datenbankfehler – bitte Internet prüfen');
      setDetailedMemberLogs([]);
    } finally {
      if (!silent) setDetailedLogsLoading(false);
    }
  };

  const detailedDailySeries = useMemo(() => buildDailySeries(detailedMemberLogs, detailedLast7Days), [detailedMemberLogs, detailedLast7Days]);
  const detailedWeeklySeries = useMemo(() => buildWeeklySeries(detailedMemberLogs, detailedLast8Weeks), [detailedMemberLogs, detailedLast8Weeks]);
  const detailedCurrentWeekSeries = useMemo(() => buildDailySeries(detailedMemberLogs, detailedCurrentWeekIsos), [detailedMemberLogs, detailedCurrentWeekIsos]);
  const detailedComparisonSeries = detailedGraphRange === 'currentWeek' ? detailedCurrentWeekSeries : (detailedGraphRange === 'previousWeek' ? detailedDailySeries : detailedWeeklySeries);
  const detailedTopRangeLabel = detailedGraphRange === 'currentWeek' ? currentWeekLabel : (detailedGraphRange === 'previousWeek' ? 'Letzte Woche' : '4-Wochen');
  const detailedTopRangeToggleLabel = detailedGraphRange === 'currentWeek'
    ? `<< ${currentWeekLabel} >>`
    : (detailedGraphRange === 'previousWeek' ? '<< Letzte Woche >>' : '<< 4-Wochen >>');
  const detailedTopRangePeriodLabel = useMemo(() => {
    if (detailedGraphRange === 'fourWeeks') {
      const first = detailedWeeklySeries[0];
      const last = detailedWeeklySeries[detailedWeeklySeries.length - 1];
      if (!first || !last) return 'Zeitraum: —';
      const startDate = parseISO(first.startISO);
      const endDate = parseISO(last.endISO);
      const fmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      return `Zeitraum: ${startDate ? fmt.format(startDate) : first.startISO} – ${endDate ? fmt.format(endDate) : last.endISO}`;
    }
    return `${formatIsoWithWeekday(detailedComparisonSeries[0]?.iso)} – ${formatIsoWithWeekday(detailedComparisonSeries[detailedComparisonSeries.length - 1]?.iso)}`;
  }, [detailedGraphRange, detailedComparisonSeries, detailedWeeklySeries]);

  const detailedPrayerTotalsForIsos = useCallback((isos) => {
    const isoSet = new Set((isos || []).filter(Boolean));
    return STATS_PRAYER_SEQUENCE.map(({ key, label }) => ({
      key,
      label,
      total: detailedMemberLogs.reduce((sum, row) => {
        const prayerKey = String(row?.prayer || '').toLowerCase();
        if (!isoSet.has(String(row?.date || ''))) return sum;
        return prayerKey === key ? (sum + 1) : sum;
      }, 0),
    }));
  }, [detailedMemberLogs]);

  const detailedPrayerRows = useMemo(() => {
    if (detailedPrayerRange === 'selectedDate') return detailedPrayerTotalsForIsos([selectedStatsDateISO]);
    if (detailedPrayerRange === 'previousWeek') return detailedPrayerTotalsForIsos(detailedLast7Days);
    return detailedPrayerTotalsForIsos(detailedCurrentWeekIsos);
  }, [detailedPrayerRange, detailedPrayerTotalsForIsos, selectedStatsDateISO, detailedLast7Days, detailedCurrentWeekIsos]);



  const getDetailedExportDataset = useCallback((rangeMode) => {
    const isos = rangeMode === 'previousWeek' ? detailedLast7Days : detailedCurrentWeekIsos;
    const logs = (detailedMemberLogs || []).filter((row) => isos.includes(row.date));
    const dailyMap = new Map(isos.map((iso) => [iso, 0]));
    logs.forEach((row) => {
      dailyMap.set(row.date, (dailyMap.get(row.date) || 0) + 1);
    });
    const dayRows = isos.map((iso) => ({
      iso,
      tag: formatIsoWithWeekday(iso),
      anzahl: Number(dailyMap.get(iso)) || 0,
    }));

    const prayerAgg = { fajr: 0, sohar: 0, asr: 0, maghrib: 0, ishaa: 0 };
    logs.forEach((row) => {
      const key = String(row?.prayer || '').toLowerCase();
      if (Object.prototype.hasOwnProperty.call(prayerAgg, key)) prayerAgg[key] += 1;
    });
    const prayerRows = STATS_PRAYER_SEQUENCE.map((item) => ({
      key: item.key,
      label: item.label,
      anzahl: Number(prayerAgg[item.key]) || 0,
    }));

    return {
      rangeMode,
      isos,
      logs,
      dayRows,
      prayerRows,
      total: logs.length,
    };
  }, [detailedCurrentWeekIsos, detailedLast7Days, detailedMemberLogs]);

  const hasDetailedExportData = useMemo(() => Boolean(selectedDetailedMember), [selectedDetailedMember]);

  const writeDetailedWorkbook = useCallback(async (rangeMode) => {
    if (!selectedDetailedMember) {
      setToast('Bitte zuerst eine ID auswählen');
      return;
    }
    const dataset = getDetailedExportDataset(rangeMode);
    if (!dataset.total) {
      setToast('Keine Daten zum Export verfügbar');
      return;
    }
    const startISO = dataset.isos[0] || '';
    const endISO = dataset.isos[dataset.isos.length - 1] || '';
    const startLabel = formatIsoWithWeekday(startISO);
    const endLabel = formatIsoWithWeekday(endISO);

    const workbook = XLSX.utils.book_new();
    const exportTimestamp = new Intl.DateTimeFormat('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date());
    const overviewRows = [
      ['Moschee', activeMosque.label],
      ['Zeitraum', `${startLabel} – ${endLabel}`],
      ['Export Zeitstempel', exportTimestamp],
      ['ID', selectedDetailedMember.idNumber],
      ...(shouldIncludeGuestNameInExports ? [['Name', String(selectedDetailedMember?.name || memberMetadataById[String(selectedDetailedMember?.idNumber || '')]?.name || '—')]] : []),
      ['Tanzeem', TANZEEM_LABELS[selectedDetailedMember.tanzeem] || selectedDetailedMember.tanzeem || '—'],
      [getLocationLabel(selectedDetailedMember?.majlis), resolveExportMajlisLabel(selectedDetailedMember.majlis, selectedDetailedMember?.amarat)],
      ['Gesamt Gebete', Number(dataset.total) || 0],
    ];
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewRows);
    overviewSheet['!cols'] = [{ wch: 28 }, { wch: 36 }];

    const dayRows = [
      ['Tag', 'Anzahl der Gebete nach Tage'],
      ...dataset.dayRows.map((row) => [row.tag, Number(row.anzahl) || 0]),
    ];
    const daySheet = XLSX.utils.aoa_to_sheet(dayRows);
    daySheet['!cols'] = [{ wch: 22 }, { wch: 20 }];

    const prayerRows = [
      ['Gebetszeit', 'Anzahl der Gebete nach Gebetszeiten'],
      ...dataset.prayerRows.map((row) => [row.label, Number(row.anzahl) || 0]),
    ];
    const prayerSheet = XLSX.utils.aoa_to_sheet(prayerRows);
    prayerSheet['!cols'] = [{ wch: 22 }, { wch: 32 }];

    const logHeader = shouldIncludeGuestNameInExports
      ? ['Datum', 'Gebetszeit', 'ID', 'Name', 'Tanzeem', getLocationLabel(selectedDetailedMember?.majlis), 'Zeitstempel']
      : ['Datum', 'Gebetszeit', 'ID', 'Tanzeem', getLocationLabel(selectedDetailedMember?.majlis), 'Zeitstempel'];
    const logRows = [
      logHeader,
      ...dataset.logs.map((row) => {
        const values = [
          formatIsoWithWeekday(row.date),
          STATS_PRAYER_SEQUENCE.find((item) => item.key === row.prayer)?.label || row.prayer,
          selectedDetailedMember.idNumber,
        ];
        if (shouldIncludeGuestNameInExports) values.push(String(selectedDetailedMember?.name || memberMetadataById[String(selectedDetailedMember?.idNumber || '')]?.name || '—'));
        values.push(
          TANZEEM_LABELS[selectedDetailedMember.tanzeem] || selectedDetailedMember.tanzeem || '—',
          resolveExportMajlisLabel(selectedDetailedMember.majlis, selectedDetailedMember?.amarat),
          formatGermanDateTime(row.timestamp),
        );
        return values;
      }),
    ];
    const logsSheet = XLSX.utils.aoa_to_sheet(logRows);
    logsSheet['!cols'] = shouldIncludeGuestNameInExports
      ? [{ wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 24 }, { wch: 14 }, { wch: 24 }, { wch: 24 }]
      : [{ wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 24 }, { wch: 24 }];

    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Übersicht');
    XLSX.utils.book_append_sheet(workbook, daySheet, 'Gebete nach Tage');
    XLSX.utils.book_append_sheet(workbook, prayerSheet, 'Gebete nach Gebetszeiten');
    XLSX.utils.book_append_sheet(workbook, logsSheet, 'Gebetsprotokoll');

    const boldCellStyle = { font: { bold: true } };
    ['Übersicht', 'Gebete nach Tage', 'Gebete nach Gebetszeiten', 'Gebetsprotokoll'].forEach((sheetName) => {
      const ws = workbook.Sheets[sheetName];
      if (!ws || !ws['!ref']) return;
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let col = range.s.c; col <= range.e.c; col += 1) {
        const addr = XLSX.utils.encode_cell({ c: col, r: 0 });
        if (ws[addr]) ws[addr].s = boldCellStyle;
      }
    });

    const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const safeStart = startLabel.replace(/[,\s]+/g, '_').replace(/[^a-zA-Z0-9._-äöüÄÖÜß]/g, '');
    const safeEnd = endLabel.replace(/[,\s]+/g, '_').replace(/[^a-zA-Z0-9._-äöüÄÖÜß]/g, '');
    const fileName = `Detaillierte_ID_Uebersicht_${selectedDetailedMember.idNumber}_${safeStart}_${safeEnd}.xlsx`;

    if (Platform.OS === 'web') {
      if (!globalThis.atob) throw new Error('Base64 Dekodierung auf Web nicht verfügbar');
      const binary = globalThis.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
      return;
    }

    const cacheDir = String(FileSystem.cacheDirectory || '');
    if (!cacheDir) throw new Error('Dateisystem nicht verfügbar (cacheDirectory fehlt)');
    const fileUri = `${cacheDir}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      setToast('Sharing auf diesem Gerät nicht verfügbar');
      return;
    }
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Detaillierte ID exportieren',
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
  }, [activeMosque.label, getDetailedExportDataset, getLocationLabel, memberMetadataById, resolveExportMajlisLabel, selectedDetailedMember, shouldIncludeGuestNameInExports]);

  const handleExportDetailed = useCallback(async (rangeMode) => {
    if (!effectivePermissions.canExportData) { setToast('Keine Berechtigung'); return; }
    if (detailedExporting) return;
    setDetailedExporting(true);
    try {
      await writeDetailedWorkbook(rangeMode);
      setDetailedExportModalVisible(false);
    } catch (error) {
      const message = String(error?.message || '').trim();
      setToast(message ? `Export fehlgeschlagen: ${message}` : 'Export fehlgeschlagen');
      console.error('Detailed export failed', error);
    } finally {
      setDetailedExporting(false);
    }
  }, [detailedExporting, effectivePermissions.canExportData, writeDetailedWorkbook]);
  const detailedCurrentWeekCount = useMemo(() => {
    const minISO = detailedCurrentWeekIsos[0] || '';
    const maxISO = detailedCurrentWeekIsos[detailedCurrentWeekIsos.length - 1] || '';
    return detailedMemberLogs.reduce((sum, row) => ((row.date >= minISO && row.date <= maxISO) ? (sum + 1) : sum), 0);
  }, [detailedMemberLogs, detailedCurrentWeekIsos]);
  const detailedPreviousWeekCount = useMemo(() => {
    const minISO = detailedLast7Days[0] || '';
    const maxISO = detailedLast7Days[detailedLast7Days.length - 1] || '';
    return detailedMemberLogs.reduce((sum, row) => ((row.date >= minISO && row.date <= maxISO) ? (sum + 1) : sum), 0);
  }, [detailedMemberLogs, detailedLast7Days]);
  const detailedCurrentWeekDistinctDays = useMemo(() => {
    const minISO = detailedCurrentWeekIsos[0] || '';
    const maxISO = detailedCurrentWeekIsos[detailedCurrentWeekIsos.length - 1] || '';
    const days = new Set(
      detailedMemberLogs
        .filter((row) => row.date >= minISO && row.date <= maxISO)
        .map((row) => row.date),
    );
    return days.size;
  }, [detailedMemberLogs, detailedCurrentWeekIsos]);
  const detailedStatus = useMemo(() => calculateStatus(detailedCurrentWeekCount, detailedCurrentWeekDistinctDays), [detailedCurrentWeekCount, detailedCurrentWeekDistinctDays]);

  useEffect(() => {
    if (!selectedDetailedMember?.idNumber || !selectedStatsDateISO) return;
    const firstWeek = detailedLast8Weeks[0];
    if (!firstWeek) return;
    if (selectedStatsDateISO >= firstWeek.startISO && selectedStatsDateISO <= toISO(now)) return;
    const minISO = selectedStatsDateISO < firstWeek.startISO ? selectedStatsDateISO : firstWeek.startISO;
    const maxISO = selectedStatsDateISO > toISO(now) ? selectedStatsDateISO : toISO(now);
    loadDetailedLogsForMember(selectedDetailedMember.idNumber, minISO, maxISO);
  }, [selectedDetailedMember, selectedStatsDateISO, detailedLast8Weeks, now]);

  useEffect(() => {
    if (!isDetailedIdOverviewVisible || !selectedDetailedMember?.idNumber) return undefined;
    const firstWeek = detailedLast8Weeks[0];
    if (!firstWeek) return undefined;
    const minISO = selectedStatsDateISO && selectedStatsDateISO < firstWeek.startISO ? selectedStatsDateISO : firstWeek.startISO;
    const maxISO = selectedStatsDateISO && selectedStatsDateISO > toISO(now) ? selectedStatsDateISO : toISO(now);

    const refreshDetailedLogs = () => {
      loadDetailedLogsForMember(selectedDetailedMember.idNumber, minISO, maxISO, { bypassCache: true, silent: true });
    };

    refreshDetailedLogs();
    const timer = setInterval(refreshDetailedLogs, 5000);
    return () => clearInterval(timer);
  }, [isDetailedIdOverviewVisible, selectedDetailedMember, selectedStatsDateISO, detailedLast8Weeks, now]);


  const clearQrRegistration = useCallback(async () => {
    setQrRegistration(null);
    setQrLastAttendanceStatus('idle');
    setQrLastAttendancePrayerKey('');
    setQrLastAttendanceDateISO('');
    await AsyncStorage.removeItem(STORAGE_KEYS.qrRegistration);
  }, []);

  const ensureQrBrowserDeviceId = useCallback(async () => {
    const existingBrowserDeviceId = await AsyncStorage.getItem(STORAGE_KEYS.qrBrowserDeviceId);
    if (existingBrowserDeviceId) {
      setQrBrowserDeviceId(existingBrowserDeviceId);
      return existingBrowserDeviceId;
    }
    const generated = Crypto.randomUUID ? Crypto.randomUUID() : await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${Date.now()}_${Math.random()}`);
    await AsyncStorage.setItem(STORAGE_KEYS.qrBrowserDeviceId, generated);
    setQrBrowserDeviceId(generated);
    return generated;
  }, []);

  useEffect(() => {
    const initQrRegistration = async () => {
      try {
        const browserDeviceId = await ensureQrBrowserDeviceId();
        if (!browserDeviceId || !hasFirebaseConfig()) {
          await clearQrRegistration();
          return;
        }
        const remoteRegistration = await getGlobalDocData(QR_REGISTRATION_COLLECTION, browserDeviceId);
        if (remoteRegistration?.idNumber) {
          await AsyncStorage.setItem(STORAGE_KEYS.qrRegistration, JSON.stringify(remoteRegistration));
          setQrRegistration(remoteRegistration);
        } else {
          await clearQrRegistration();
        }
      } catch (error) {
        console.error('QR registration init failed', error);
      }
    };
    initQrRegistration();
  }, [clearQrRegistration, ensureQrBrowserDeviceId]);

  useEffect(() => {
    const nextImageUri = buildQrImageUrl(qrScanUrl);
    if (!qrImageUri) {
      setQrImageUri(nextImageUri);
      setQrPendingImageUri('');
      return;
    }
    if (nextImageUri !== qrImageUri) setQrPendingImageUri(nextImageUri);
  }, [qrImageUri, qrScanUrl]);

  useEffect(() => {
    const tick = () => {
      const nowMs = Date.now();
      const activeCycleStart = getQrCycleStart(nowMs);
      setQrCycleStart((prev) => (prev === activeCycleStart ? prev : activeCycleStart));
      const nextRefreshAt = activeCycleStart + QR_REFRESH_INTERVAL_MS;
      setQrCountdownSeconds(Math.max(0, Math.ceil((nextRefreshAt - nowMs) / 1000)));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const persistQrRegistration = useCallback(async (registration) => {
    setQrRegistration(registration);
    await AsyncStorage.setItem(STORAGE_KEYS.qrRegistration, JSON.stringify(registration));
  }, []);

  const loadStoredQrRegistration = useCallback(async () => {
    const browserDeviceId = qrBrowserDeviceId || await ensureQrBrowserDeviceId();
    if (!browserDeviceId || !hasFirebaseConfig()) {
      await clearQrRegistration();
      return null;
    }
    const remoteRegistration = await getGlobalDocData(QR_REGISTRATION_COLLECTION, browserDeviceId);
    if (remoteRegistration?.idNumber) {
      await persistQrRegistration(remoteRegistration);
      return remoteRegistration;
    }
    await clearQrRegistration();
    return null;
  }, [clearQrRegistration, ensureQrBrowserDeviceId, persistQrRegistration, qrBrowserDeviceId]);

  const handleQrMemberRegistration = useCallback(async (member) => {
    const browserDeviceId = qrBrowserDeviceId || await ensureQrBrowserDeviceId();
    if (!member?.idNumber || !browserDeviceId) {
      setQrStatusTone('negative');
      setQrStatusMessage('Bitte zuerst eine gültige ID auswählen.');
      return;
    }
    setQrSubmitting(true);
    try {
      const targetExternalScopeKey = activeMosqueKey === EXTERNAL_MOSQUE_KEY
        ? normalizeExternalScopeKey(
          qrScanExternalScopeKey
          || guestActivation?.scopeKey
          || guestActivation?.mosqueName
          || currentAccount?.externalMosqueName
          || currentAccount?.name
          || '',
        )
        : '';
      const existingRegistration = await getGlobalDocData(QR_REGISTRATION_COLLECTION, browserDeviceId);
      const existingExternalScopeKey = normalizeExternalScopeKey(existingRegistration?.externalScopeKey || '');
      const isExistingScopeDifferent = activeMosqueKey === EXTERNAL_MOSQUE_KEY
        && existingExternalScopeKey
        && targetExternalScopeKey
        && existingExternalScopeKey !== targetExternalScopeKey;
      if (
        existingRegistration?.idNumber
        && String(existingRegistration.idNumber) !== String(member.idNumber)
        && !isExistingScopeDifferent
      ) {
        setQrStatusTone('negative');
        setQrStatusMessage('Browser/Gerät bereits für eine andere ID registriert.');
        return;
      }
      const existingIdRegistration = await findGlobalRegistrationByIdNumber(
        QR_REGISTRATION_COLLECTION,
        member.idNumber,
        activeMosqueKey,
        targetExternalScopeKey,
      );
      if (existingIdRegistration?.registration?.idNumber && String(existingIdRegistration.docId) !== String(browserDeviceId)) {
        setQrStatusTone('negative');
        setQrStatusMessage('Diese ID ist in dieser Moschee bereits auf einem anderen Gerät/Browser registriert.');
        return;
      }
      const nextRegistration = {
        browserDeviceId,
        idNumber: String(member.idNumber),
        tanzeem: String(member.tanzeem || '').toLowerCase(),
        majlis: String(member.majlis || ''),
        mosqueKey: activeMosqueKey,
        externalScopeKey: targetExternalScopeKey || '',
        updatedAt: new Date().toISOString(),
        createdAt: existingRegistration?.createdAt || new Date().toISOString(),
      };
      await setGlobalDocData(QR_REGISTRATION_COLLECTION, browserDeviceId, nextRegistration);
      await persistQrRegistration(nextRegistration);
      setQrFlowMode('registered');
      setQrRegistrationMode('tanzeem');
      setQrQuickIdSearchVisible(false);
      setQrLastAttendanceStatus('registered');
      setQrLastAttendancePrayerKey('');
      setQrLastAttendanceDateISO('');
      const registrationHintContext = resolveQrPrayerContext();
      setQrLastRuntimeHint({
        iso: registrationHintContext.iso,
        prayerKey: registrationHintContext.prayerKey || '',
        prayerLabel: registrationHintContext.prayerLabel || '',
        isActive: Boolean(registrationHintContext.isActive),
        prayerWindow: registrationHintContext.prayerWindow || null,
        timesToday: registrationHintContext.timesToday || null,
      });
      setQrStatusTone('positive');
      setQrStatusMessage('Erfolgreiche Registrierung. Bitte Browserdaten nicht löschen und möglichst immer denselben Browser verwenden.');
      setQrRegistrationSearchQuery('');
    } catch (error) {
      console.error('QR registration failed', error);
      setQrStatusTone('negative');
      setQrStatusMessage('Registrierung fehlgeschlagen. Bitte Internet prüfen.');
    } finally {
      setQrSubmitting(false);
    }
  }, [activeMosqueKey, currentAccount?.externalMosqueName, currentAccount?.name, ensureQrBrowserDeviceId, guestActivation?.mosqueName, guestActivation?.scopeKey, persistQrRegistration, qrBrowserDeviceId, qrScanExternalScopeKey, resolveQrPrayerContext]);

  const handleQrScanFlow = useCallback(async (encodedPayload) => {
    if (!isWebRuntime || !encodedPayload) return;
    if (!prayerOverrideReady) {
      setPendingQrPayload(encodedPayload);
      setQrScanPageVisible(true);
      setQrStatusTone('neutral');
      setQrStatusMessage('Gebetszeiten werden geladen. QR-Scan wird gleich verarbeitet.');
      setQrSubmitting(false);
      return;
    }
    const payload = decodeQrPayload(encodedPayload);
    if (!payload || payload.type !== 'prayer_attendance') return;
    const payloadMosqueKey = getMosqueOptionByKey(payload?.mosqueKey || DEFAULT_MOSQUE_KEY).key;
    const payloadExternalScopeKey = normalizeExternalScopeKey(payload?.externalScopeKey || '');
    const payloadAttendanceCategory = normalizeQrAttendanceCategory(payload?.attendanceCategory || 'prayer');
    if (payloadMosqueKey === EXTERNAL_MOSQUE_KEY && !payloadExternalScopeKey) {
      setQrStatusTone('negative');
      setQrStatusMessage('Dieser externe QR-Code hat keinen Amarat-Scope. Bitte einen aktuellen externen QR-Code verwenden.');
      setQrScanPageVisible(true);
      return;
    }
    const nowMs = Date.now();
    if (Number(payload.expiresAt) <= nowMs) {
      setQrStatusTone('negative');
      setQrStatusMessage('Dieser QR-Code ist abgelaufen. Bitte den aktuellen QR-Code erneut scannen.');
      setQrScanPageVisible(true);
      return;
    }
    let qrPrayerContext = resolveQrPrayerContext();
    let resolvedGuestScopeForScan = payloadExternalScopeKey
      || normalizeExternalScopeKey(
        guestActivation?.scopeKey
        || guestActivation?.mosqueName
        || currentAccount?.externalMosqueName
        || currentAccount?.name
        || '',
      );
    if (payloadMosqueKey === EXTERNAL_MOSQUE_KEY) {
      setQrScanExternalScopeKey(resolvedGuestScopeForScan || '');
    } else {
      setQrScanExternalScopeKey('');
    }
    setQrAttendanceCategory(payloadAttendanceCategory);
    setAttendanceMode(payloadAttendanceCategory);
    setQrScanPageVisible(true);
    setQrStatusMessage('');
    setQrStatusTone('neutral');
    setQrSubmitting(true);
    try {
      if (payloadMosqueKey !== activeMosqueKey) {
        await onSelectMosque(payloadMosqueKey);
        qrPrayerContext = resolveQrPrayerContext();
      }
      const registration = await loadStoredQrRegistration();
      if (!registration?.idNumber) {
        setQrFlowMode('register');
        setQrRegistrationMode('tanzeem');
        setQrQuickIdSearchVisible(false);
        setQrStatusTone('neutral');
        setQrStatusMessage('Dieser Browser ist noch nicht registriert. Bitte jetzt einmalig registrieren.');
        return;
      }
      if (payloadMosqueKey === EXTERNAL_MOSQUE_KEY && payloadExternalScopeKey) {
        const registrationScopeKey = normalizeExternalScopeKey(registration?.externalScopeKey || '');
        if (registrationScopeKey !== payloadExternalScopeKey) {
          setQrFlowMode('register');
          setQrRegistrationMode('tanzeem');
          setQrQuickIdSearchVisible(false);
          setQrStatusTone('neutral');
          setQrStatusMessage('Für diese Amarat ist eine separate Registrierung erforderlich. Bitte jetzt einmalig registrieren.');
          return;
        }
      }
      const scopedMembersDirectory = isGuestMode
        ? EXTERNAL_MEMBER_DIRECTORY_DATA.filter((entry) => {
          const entryScope = normalizeExternalScopeKey(entry?.amarat || '');
          return !entryScope || !resolvedGuestScopeForScan || entryScope === resolvedGuestScopeForScan;
        })
        : MEMBER_DIRECTORY_DATA;
      const member = scopedMembersDirectory.find((entry) => String(entry.idNumber) === String(registration.idNumber));
      if (!member) {
        setQrFlowMode('register');
        setQrRegistrationMode('tanzeem');
        setQrQuickIdSearchVisible(false);
        setQrStatusTone('negative');
        setQrStatusMessage('Die gespeicherte Registrierung wurde in der Mitgliederliste nicht gefunden. Bitte erneut registrieren.');
        return;
      }
      const scopeFromMember = normalizeExternalScopeKey(member?.amarat || '');
      if (scopeFromMember) {
        resolvedGuestScopeForScan = scopeFromMember;
      }
      if (String(payloadMosqueKey || activeMosqueKey) === EXTERNAL_MOSQUE_KEY && resolvedGuestScopeForScan) {
        setActiveMosqueScope(EXTERNAL_MOSQUE_KEY, resolvedGuestScopeForScan);
      }
      try {
        const [remoteGlobalOverride, remotePendingOverride] = await Promise.all([
          getDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_GLOBAL_DOC_ID, payloadMosqueKey || activeMosqueKey).catch(() => null),
          getDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_PENDING_DOC_ID, payloadMosqueKey || activeMosqueKey).catch(() => null),
        ]);
        if (!remoteGlobalOverride && !remotePendingOverride) {
          throw new Error('no-remote-override');
        }
        const normalizedGlobalOverride = normalizePrayerOverride(remoteGlobalOverride);
        const normalizedPendingOverride = normalizePendingPrayerOverride(remotePendingOverride);
        const runtimeFromGlobal = getRuntimePrayerContext(normalizedGlobalOverride, availableDates);
        const runtimeOverride = normalizedPendingOverride?.dateISO === runtimeFromGlobal.iso
          ? normalizePrayerOverride(normalizedPendingOverride)
          : normalizedGlobalOverride;
        const runtimeContext = getRuntimePrayerContext(runtimeOverride, availableDates);
        qrPrayerContext = {
          ...runtimeContext,
          prayerKey: runtimeContext.prayerWindow?.prayerKey || null,
          prayerLabel: runtimeContext.prayerWindow?.prayerLabel || null,
          isActive: Boolean(runtimeContext.prayerWindow?.isActive),
        };
      } catch {
        qrPrayerContext = resolveQrPrayerContext();
      }
      setQrLastRuntimeHint({
        iso: qrPrayerContext.iso,
        prayerKey: qrPrayerContext.prayerKey || '',
        prayerLabel: qrPrayerContext.prayerLabel || '',
        isActive: Boolean(qrPrayerContext.isActive),
        prayerWindow: qrPrayerContext.prayerWindow || null,
        timesToday: qrPrayerContext.timesToday || null,
      });
      setQrFlowMode('registered');
      if (payloadAttendanceCategory === 'prayer' && String(member.tanzeem || '').toLowerCase() === 'kinder') {
        setQrLastAttendanceStatus('invalid_tanzeem');
        setQrLastAttendancePrayerKey('');
        setQrLastAttendanceDateISO(qrPrayerContext.iso);
        setQrStatusTone('negative');
        setQrStatusMessage('Kinder können nicht per Gebets-QR eingetragen werden. Bitte den Programm-QR verwenden.');
        return;
      }

      if (payloadAttendanceCategory === 'prayer' && (!qrPrayerContext.isActive || !qrPrayerContext.prayerKey)) {
        setQrLastAttendanceStatus('inactive_prayer');
        setQrLastAttendancePrayerKey('');
        setQrLastAttendanceDateISO(qrPrayerContext.iso);
        setQrStatusTone('negative');
        setQrStatusMessage('Kein aktives Gebetsfenster.');
        return;
      }

      const result = await countAttendanceRef.current?.(payloadAttendanceCategory, 'member', registration.majlis || member.majlis, member, {
        runtimeContext: qrPrayerContext,
        guestScopeKey: resolvedGuestScopeForScan,
      });
      const activeQrPrayerKey = String(qrPrayerContext.prayerKey || result?.targetKeys?.[0] || '');
      const activeQrPrayerLabel = qrPrayerContext.prayerLabel || getDisplayPrayerLabel(activeQrPrayerKey, qrPrayerContext.timesToday);

      if (result?.status === 'inactive_prayer') {
        setQrLastAttendanceStatus('inactive_prayer');
        setQrLastAttendancePrayerKey('');
        setQrLastAttendanceDateISO(qrPrayerContext.iso);
        setQrStatusTone('negative');
        setQrStatusMessage('Kein aktives Gebetsfenster.');
      } else if (result?.status === 'inactive_program') {
        setQrLastAttendanceStatus('inactive_program');
        setQrLastAttendancePrayerKey('program');
        setQrLastAttendanceDateISO(qrPrayerContext.iso);
        setQrStatusTone('negative');
        setQrStatusMessage('Aktuell kein Programm aktiv.');
      } else if (result?.status === 'duplicate') {
        setQrLastAttendanceStatus('duplicate');
        setQrLastAttendancePrayerKey(payloadAttendanceCategory === 'program' ? 'program' : activeQrPrayerKey);
        setQrLastAttendanceDateISO(qrPrayerContext.iso);
        setQrStatusTone('positive');
        setQrStatusMessage(
          payloadAttendanceCategory === 'program'
            ? 'Sie wurden bereits für das Programm eingetragen.'
            : `Sie wurden bereits für das ${activeQrPrayerLabel} Gebet eingetragen.`,
        );
      } else if (result?.status === 'counted') {
        setQrLastAttendanceStatus('counted');
        setQrLastAttendancePrayerKey(payloadAttendanceCategory === 'program' ? 'program' : activeQrPrayerKey);
        setQrLastAttendanceDateISO(qrPrayerContext.iso);
        setQrStatusTone('positive');
        setQrStatusMessage(
          payloadAttendanceCategory === 'program'
            ? 'Erfolgreiche automatische Eintragung für das Programm.'
            : `Erfolgreiche automatische Eintragung für ${activeQrPrayerLabel}.`,
        );
      } else {
        setQrLastAttendanceStatus('error');
        setQrLastAttendancePrayerKey('');
        setQrLastAttendanceDateISO(qrPrayerContext.iso);
        setQrStatusTone('negative');
        setQrStatusMessage('QR-Check-in konnte nicht verarbeitet werden.');
      }
    } catch (error) {
      console.error('QR scan flow failed', error);
      setQrStatusTone('negative');
      setQrStatusMessage('QR-Check-in fehlgeschlagen. Bitte Internet prüfen.');
    } finally {
      setQrSubmitting(false);
    }
  }, [activeMosqueKey, availableDates, currentAccount?.externalMosqueName, currentAccount?.name, getRuntimePrayerContext, guestActivation?.mosqueName, guestActivation?.scopeKey, loadStoredQrRegistration, onSelectMosque, resolveQrPrayerContext]);

  useEffect(() => {
    if (!isWebRuntime || typeof window === 'undefined') return undefined;
    const applyQrFromUrl = () => {
      const url = new URL(window.location.href);
      const encodedPayload = url.searchParams.get(QR_SCAN_PARAM);
      if (!encodedPayload) return;
      url.searchParams.delete(QR_SCAN_PARAM);
      window.history.replaceState({}, '', url.toString());
      if (!prayerOverrideReady) {
        setPendingQrPayload(encodedPayload);
        setQrScanPageVisible(true);
        setQrStatusTone('neutral');
        setQrStatusMessage('Gebetszeiten werden geladen. QR-Scan wird gleich verarbeitet.');
        return;
      }
      handleQrScanFlow(encodedPayload);
    };
    applyQrFromUrl();
    window.addEventListener('popstate', applyQrFromUrl);
    return () => window.removeEventListener('popstate', applyQrFromUrl);
  }, [handleQrScanFlow, prayerOverrideReady]);

  useEffect(() => {
    if (!prayerOverrideReady || !pendingQrPayload) return;
    const payload = pendingQrPayload;
    setPendingQrPayload('');
    handleQrScanFlow(payload);
  }, [handleQrScanFlow, pendingQrPayload, prayerOverrideReady]);

  useEffect(() => {
    if (!isWebRuntime || typeof window === 'undefined') return;
    const persistedQrPage = window.sessionStorage?.getItem(STORAGE_KEYS.qrActivePage);
    if (persistedQrPage === 'scan') {
      setQrScanPageVisible(true);
      setQrPageVisible(false);
    } else if (persistedQrPage === 'display') {
      setQrPageVisible(true);
      setQrScanPageVisible(false);
    }
  }, []);

  useEffect(() => {
    if (!isWebRuntime || typeof window === 'undefined') return;
    if (isQrScanPageVisible) {
      window.sessionStorage?.setItem(STORAGE_KEYS.qrActivePage, 'scan');
      return;
    }
    if (isQrPageVisible) {
      window.sessionStorage?.setItem(STORAGE_KEYS.qrActivePage, 'display');
      return;
    }
    window.sessionStorage?.removeItem(STORAGE_KEYS.qrActivePage);
  }, [isQrPageVisible, isQrScanPageVisible]);

  useEffect(() => {
    if (activeTab !== 'terminal') return;
    if (attendanceMode === 'program' && qrAttendanceCategory !== 'program') {
      setQrAttendanceCategory('program');
      return;
    }
    if (attendanceMode === 'prayer' && qrAttendanceCategory !== 'prayer') {
      setQrAttendanceCategory('prayer');
    }
  }, [activeTab, attendanceMode, qrAttendanceCategory]);

  const recordTerminalInteraction = useCallback(() => {
    inactivityLastInteractionRef.current = Date.now();
  }, []);

  const scrollTerminalToTop = useCallback(() => {
    const run = () => {
      terminalScrollRef.current?.scrollTo?.({ y: 0, animated: false });
      if (Platform.OS === 'web' && globalThis?.window?.scrollTo) {
        globalThis.window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    };
    if (Platform.OS === 'web' && typeof globalThis?.requestAnimationFrame === 'function') {
      globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(run));
      return;
    }
    setTimeout(run, 0);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const listener = () => recordTerminalInteraction();
    const webTarget = globalThis?.window;
    if (!webTarget?.addEventListener) return;
    const events = ['wheel', 'scroll', 'touchmove', 'mousemove', 'mousedown', 'keydown'];
    events.forEach((eventName) => webTarget.addEventListener(eventName, listener, { passive: true }));
    return () => {
      events.forEach((eventName) => webTarget.removeEventListener(eventName, listener));
    };
  }, [recordTerminalInteraction]);

  useEffect(() => {
    const loadTerminalInactivityConfig = async () => {
      const externalScopeKey = normalizeExternalScopeKey(guestActivation?.scopeKey || guestActivation?.mosqueName || '');
      const localStorageKey = getTerminalInactivityStorageKey(activeMosqueKey, externalScopeKey);
      const [localRaw, globalConfig] = await Promise.all([
        AsyncStorage.getItem(localStorageKey).catch(() => null),
        getDocData(TERMINAL_INACTIVITY_CONFIG_COLLECTION, TERMINAL_INACTIVITY_CONFIG_DOC_ID).catch(() => null),
      ]);
      const localConfig = localRaw ? (() => { try { return JSON.parse(localRaw); } catch { return null; } })() : null;
      const preferredConfig = localConfig?.scope === 'device'
        ? localConfig
        : (globalConfig || localConfig || null);
      const timeoutSeconds = Math.max(15, Number(preferredConfig?.timeoutSeconds) || 90);
      setTerminalInactivityEnabledInput(Boolean(preferredConfig?.enabled ?? true));
      setTerminalInactivityTimeoutInput(String(timeoutSeconds));
      setTerminalInactivityScopeInput(preferredConfig?.scope === 'device' ? 'device' : 'global');
      inactivityLastInteractionRef.current = Date.now();
    };
    if (normalizedAppMode !== 'full') return;
    loadTerminalInactivityConfig();
  }, [activeMosqueKey, guestActivation?.mosqueName, guestActivation?.scopeKey, normalizedAppMode]);

  const saveTerminalInactivityConfig = useCallback(async () => {
    const timeoutSeconds = Math.max(15, Number(String(terminalInactivityTimeoutInput || '').replace(/[^0-9]/g, '')) || 90);
    const payload = {
      enabled: Boolean(terminalInactivityEnabledInput),
      timeoutSeconds,
      scope: terminalInactivityScopeInput === 'device' ? 'device' : 'global',
      updatedAt: new Date().toISOString(),
    };
    const externalScopeKey = normalizeExternalScopeKey(guestActivation?.scopeKey || guestActivation?.mosqueName || '');
    const localStorageKey = getTerminalInactivityStorageKey(activeMosqueKey, externalScopeKey);
    try {
      setTerminalInactivitySaving(true);
      if (payload.scope === 'device') {
        await AsyncStorage.setItem(localStorageKey, JSON.stringify(payload));
      } else {
        await setDocData(TERMINAL_INACTIVITY_CONFIG_COLLECTION, TERMINAL_INACTIVITY_CONFIG_DOC_ID, payload);
      }
      setTerminalInactivityTimeoutInput(String(timeoutSeconds));
      setToast(payload.scope === 'device' ? 'Inactivity-Reset für dieses Gerät gespeichert ✓' : 'Inactivity-Reset global gespeichert ✓');
      inactivityLastInteractionRef.current = Date.now();
    } catch (error) {
      console.error('saveTerminalInactivityConfig failed', error);
      setToast('Inactivity-Reset konnte nicht gespeichert werden');
    } finally {
      setTerminalInactivitySaving(false);
    }
  }, [activeMosqueKey, guestActivation?.mosqueName, guestActivation?.scopeKey, terminalInactivityEnabledInput, terminalInactivityScopeInput, terminalInactivityTimeoutInput]);

  useEffect(() => {
    if (normalizedAppMode !== 'full') return;
    const timeoutSeconds = Math.max(15, Number(String(terminalInactivityTimeoutInput || '').replace(/[^0-9]/g, '')) || 90);
    const exactlyOneAttendanceWindowActive = prayerWindow.isActive !== programWindow.isActive;
    const shouldRun = Boolean(terminalInactivityEnabledInput)
      && !currentAccount
      && exactlyOneAttendanceWindowActive;
    if (!shouldRun) return;

    const timer = setInterval(() => {
      const elapsedMs = Date.now() - inactivityLastInteractionRef.current;
      if (elapsedMs < timeoutSeconds * 1000) return;
      setActiveTab('terminal');
      setAttendanceMode(prayerWindow.isActive ? 'prayer' : 'program');
      setTerminalMode('tanzeem');
      setSelectedTanzeem('');
      setSelectedMajlis('');
      setPendingRegistrationMember(null);
      setQuickIdSearchVisible(false);
      setQuickIdSearchQuery('');
      setIdSearchQuery('');
      setQrPageVisible(false);
      setQrScanPageVisible(false);
      scrollTerminalToTop();
      inactivityLastInteractionRef.current = Date.now();
    }, 1000);
    return () => clearInterval(timer);
  }, [currentAccount, normalizedAppMode, prayerWindow.isActive, programWindow.isActive, scrollTerminalToTop, terminalInactivityEnabledInput, terminalInactivityTimeoutInput]);

  const handleTabPress = useCallback((tabKey) => {
    recordTerminalInteraction();
    setActiveTab(tabKey);
    setQrPageVisible(false);
    setQrScanPageVisible(false);
  }, [recordTerminalInteraction]);

  const countAttendance = async (modeType, kind, locationName, selectedMember = null, options = {}) => {
    const nowTs = Date.now();
    if (nowTs - terminalLastCountRef.current < 2000) return;
    terminalLastCountRef.current = nowTs;

    if (!hasFirebaseConfig()) {
      Alert.alert('Datenbankfehler', 'Bitte Firebase Konfiguration setzen.');
      return;
    }

    if (kind === 'member' && (!selectedMember || !selectedMember.idNumber)) {
      setToast('Bitte erst ID auswählen');
      return { status: 'missing_member' };
    }

    if (isGuestMode) {
      const resolvedGuestScope = normalizeExternalScopeKey(options?.guestScopeKey || guestActivation?.scopeKey || guestActivation?.mosqueName || '');
      if (!resolvedGuestScope) {
        setToast('Bitte zuerst Local Amarat speichern');
        return { status: 'missing_guest_scope' };
      }
      setActiveMosqueScope(EXTERNAL_MOSQUE_KEY, resolvedGuestScope);
    }

    const runtimeOverride = prayerOverride;
    const runtimeContext = options?.runtimeContext || getRuntimePrayerContext(runtimeOverride, availableDates);
    const runtimeNow = runtimeContext.now;
    const runtimeISO = runtimeContext.iso;
    const runtimeTimesToday = runtimeContext.timesToday;
    const runtimePrayerWindow = runtimeContext.prayerWindow;

    let runtimeProgramConfig = (programConfigByDate || {})[runtimeISO] || null;
    let runtimeProgramWindow = { isConfigured: false, isActive: false, label: null };
    if (runtimeProgramConfig && isValidTime(runtimeProgramConfig.startTime) && String(runtimeProgramConfig.name || '').trim()) {
      const startMinutes = Number(runtimeProgramConfig.startTime.slice(0, 2)) * 60 + Number(runtimeProgramConfig.startTime.slice(3));
      const nowMinutes = runtimeNow.getHours() * 60 + runtimeNow.getMinutes();
      runtimeProgramWindow = {
        isConfigured: true,
        isActive: nowMinutes >= (startMinutes - 30),
        label: String(runtimeProgramConfig.name || '').trim(),
      };
    }
    if (modeType === 'program' && !runtimeProgramWindow.isActive) {
      try {
        const remoteProgramConfig = await getDocData(PROGRAM_CONFIG_COLLECTION, runtimeISO);
        if (remoteProgramConfig && isValidTime(remoteProgramConfig.startTime) && String(remoteProgramConfig.name || '').trim()) {
          runtimeProgramConfig = remoteProgramConfig;
          const startMinutes = Number(remoteProgramConfig.startTime.slice(0, 2)) * 60 + Number(remoteProgramConfig.startTime.slice(3));
          const nowMinutes = runtimeNow.getHours() * 60 + runtimeNow.getMinutes();
          runtimeProgramWindow = {
            isConfigured: true,
            isActive: nowMinutes >= (startMinutes - 30),
            label: String(remoteProgramConfig.name || '').trim(),
          };
        }
      } catch {
        // ignore and keep local runtimeProgramWindow fallback
      }
    }

    const forcedPrayerKey = String(options?.forcedPrayerKey || '');
    if (modeType === 'prayer' && !forcedPrayerKey && (!runtimePrayerWindow.isActive || !runtimePrayerWindow.prayerKey)) {
      setToast('Derzeit kein aktives Gebetszeitfenster');
      setRefreshTick((v) => v + 1);
      return { status: 'inactive_prayer' };
    }

    if (modeType === 'program' && !runtimeProgramWindow.isActive) {
      setToast('Aktuell kein Programm vorhanden');
      return { status: 'inactive_program' };
    }
    if (modeType === 'registration' && (!registrationWindow.isOpen || !registrationWindow.config?.id)) {
      setToast('Anmeldung aktuell nicht verfügbar');
      return { status: 'inactive_registration' };
    }

    const resolvedMemberTanzeem = kind === 'member' ? String(selectedMember?.tanzeem || '').toLowerCase() : '';
    const effectiveTanzeem = kind === 'member' ? (resolvedMemberTanzeem || selectedTanzeem) : selectedTanzeem;
    const resolvedLocationName = String(locationName || selectedMember?.majlis || selectedMajlis || 'Gast').trim();
    const pathTanzeemKey = toLocationKey(effectiveTanzeem || '');
    const locationKey = toLocationKey(resolvedLocationName || 'gast') || 'ohne_majlis';
    if (kind === 'member' && !pathTanzeemKey) {
      setToast('Tanzeem beim Mitglied fehlt');
      return { status: 'missing_tanzeem' };
    }
    const registrationResponseType = modeType === 'registration' && options?.registrationResponse === 'decline' ? 'decline' : 'accept';
    const registrationDeclineReason = modeType === 'registration' && registrationResponseType === 'decline'
      ? String(options?.declineReason || '').trim()
      : '';
    const targetKeys = [];

    if (modeType === 'program') {
      targetKeys.push(toLocationKey(runtimeProgramWindow.label || 'programm'));
    } else if (modeType === 'registration') {
      targetKeys.push(String(registrationWindow.config?.id || ''));
    } else {
      const prayer = forcedPrayerKey || runtimePrayerWindow.prayerKey;
      const runtimeSoharAsrMerged = isValidTime(runtimeTimesToday.sohar) && runtimeTimesToday.sohar === runtimeTimesToday.asr;
      const runtimeMaghribIshaaMerged = isValidTime(runtimeTimesToday.maghrib) && runtimeTimesToday.maghrib === runtimeTimesToday.ishaa;
      if (runtimeSoharAsrMerged && ['sohar', 'asr'].includes(prayer)) {
        targetKeys.push('sohar', 'asr');
      } else if (runtimeMaghribIshaaMerged && ['maghrib', 'ishaa'].includes(prayer)) {
        targetKeys.push('maghrib', 'ishaa');
      } else {
        targetKeys.push(prayer);
      }
    }

    const paths = [];
    targetKeys.forEach((targetKey) => {
      if (modeType === 'program') {
        if (kind === 'guest') {
          paths.push('guestTotal');
          paths.push('total');
        } else {
          paths.push(`byTanzeem.${pathTanzeemKey}`);
          paths.push(`byMajlis.${locationKey}`);
          paths.push('total');
        }
      } else if (modeType === 'registration') {
        if (registrationResponseType === 'decline') {
          paths.push('declineTotal');
        } else {
          paths.push(`byTanzeem.${pathTanzeemKey}`);
          paths.push(`byMajlis.${locationKey}`);
          paths.push('total');
        }
      } else if (kind === 'guest') {
        paths.push(`byPrayer.${targetKey}.guest`);
      } else {
        paths.push(`byPrayer.${targetKey}.tanzeem.${pathTanzeemKey}.majlis.${locationKey}`);
      }
    });
    if (modeType === 'prayer' && kind === 'guest') {
      paths.push('guestUniqueTotal');
    }

    try {
      const programKey = modeType === 'program' ? targetKeys[0] : null;
      const registrationKey = modeType === 'registration' ? targetKeys[0] : null;

      if (kind === 'member' && selectedMember?.idNumber) {
        const duplicateChecks = await Promise.all(targetKeys.map((targetKey) => {
          const memberEntryId = modeType === 'program'
            ? `${runtimeISO}_${programKey}_${effectiveTanzeem}_${locationKey}_${String(selectedMember.idNumber)}`
            : (modeType === 'registration'
              ? `${registrationKey}_${effectiveTanzeem}_${locationKey}_${String(selectedMember.idNumber)}`
              : `${runtimeISO}_${targetKey}_${effectiveTanzeem}_${locationKey}_${String(selectedMember.idNumber)}`);
          return getDocData(
            modeType === 'program' ? PROGRAM_ATTENDANCE_COLLECTION : (modeType === 'registration' ? REGISTRATION_ATTENDANCE_COLLECTION : MEMBER_DIRECTORY_COLLECTION),
            memberEntryId,
          );
        }));

        if (duplicateChecks.some(Boolean)) {
          setToast('Bereits gezählt');
          setQuickIdSearchQuery('');
          setTerminalMode('tanzeem');
          setSelectedTanzeem('');
          setSelectedMajlis('');
          return { status: 'duplicate' };
        }
      }

      if (modeType === 'program') {
        await incrementDocCounters(PROGRAM_DAILY_COLLECTION, `${runtimeISO}_${programKey}`, paths);
      } else if (modeType === 'registration') {
        const existingRegistrationDaily = await getDocData(REGISTRATION_DAILY_COLLECTION, registrationKey).catch(() => null);
        if (!existingRegistrationDaily) {
          await setDocData(REGISTRATION_DAILY_COLLECTION, registrationKey, {
            registrationId: registrationKey,
            registrationName: String(registrationWindow.config?.name || ''),
            total: 0,
            declineTotal: 0,
            byTanzeem: {},
            byMajlis: {},
            createdAt: new Date().toISOString(),
          });
        }
        await incrementDocCounters(REGISTRATION_DAILY_COLLECTION, registrationKey, paths);
      } else {
        await incrementDocCounters('attendance_daily', runtimeISO, paths);
      }

      if (kind === 'member' && selectedMember?.idNumber) {
        await Promise.all(targetKeys.map((targetKey) => {
          const memberEntryId = modeType === 'program'
            ? `${runtimeISO}_${programKey}_${effectiveTanzeem}_${locationKey}_${String(selectedMember.idNumber)}`
            : (modeType === 'registration'
              ? `${registrationKey}_${effectiveTanzeem}_${locationKey}_${String(selectedMember.idNumber)}`
              : `${runtimeISO}_${targetKey}_${effectiveTanzeem}_${locationKey}_${String(selectedMember.idNumber)}`);
          return setDocData(modeType === 'program' ? PROGRAM_ATTENDANCE_COLLECTION : (modeType === 'registration' ? REGISTRATION_ATTENDANCE_COLLECTION : MEMBER_DIRECTORY_COLLECTION), memberEntryId, {
            type: modeType,
            date: runtimeISO,
            ...(modeType === 'program' ? { programName: runtimeProgramWindow.label } : {}),
            ...(modeType === 'registration' ? { registrationId: registrationKey, registrationName: registrationWindow.config?.name || '' } : {}),
            ...(modeType === 'registration' ? { registrationResponse: registrationResponseType, declineReason: registrationDeclineReason || null } : {}),
            ...(modeType === 'prayer' ? { prayer: targetKey } : {}),
            majlis: resolvedLocationName,
            tanzeem: effectiveTanzeem,
            idNumber: String(selectedMember.idNumber),
            ...(STORE_MEMBER_NAMES_IN_DB ? { name: selectedMember.name || null } : {}),
            timestamp: new Date().toISOString(),
          });
        }));

        if (modeType === 'prayer') {
          await appendMemberDetailsToDailyAttendance(
            runtimeISO,
            targetKeys,
            effectiveTanzeem,
            resolvedLocationName,
            locationKey,
            selectedMember,
          );
        }
      }

      if (kind === 'guest' && modeType !== 'registration') {
        const guestEntryId = `${runtimeISO}_${modeType}_guest_${nowTs}_${visitorCounterRef.current + 1}`;
        if (modeType === 'program') {
          await setDocData(PROGRAM_ATTENDANCE_COLLECTION, guestEntryId, {
            type: 'program',
            date: runtimeISO,
            programName: runtimeProgramWindow.label,
            tanzeem: 'guest',
            majlis: resolvedLocationName,
            idNumber: 'guest',
            timestamp: new Date().toISOString(),
          });
        } else {
          await setDocData(MEMBER_DIRECTORY_COLLECTION, guestEntryId, {
            type: 'prayer',
            date: runtimeISO,
            prayer: targetKeys[0],
            tanzeem: 'guest',
            majlis: resolvedLocationName,
            idNumber: 'guest',
            timestamp: new Date().toISOString(),
          });
        }
      }

      visitorCounterRef.current += 1;
      Vibration.vibrate(4);
      setToast(modeType === 'registration' ? `Angemeldet für ${registrationWindow.config?.name || 'Anmeldung'}` : 'Gezählt ✓');
      setQuickIdSearchQuery('');
      setTerminalMode('tanzeem');
      setSelectedTanzeem('');
      setSelectedMajlis('');
      return { status: 'counted', targetKeys };
    } catch {
      Alert.alert('Datenbankfehler', 'Bitte Internet prüfen');
      setToast('Datenbankfehler – bitte Internet prüfen');
      return { status: 'error' };
    }
  };
  countAttendanceRef.current = countAttendance;


  const renderPrayer = () => {
    const displayDate = selectedDate || now;
    return (
      <ScrollView contentContainerStyle={contentContainerStyle} showsVerticalScrollIndicator={false}>
        <View style={[styles.dayCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Pressable onPress={handleGlobalThemeToggleTrigger}>
            <Text style={[styles.dayName, { color: theme.text }]}>{DAY_NAMES_DE[displayDate.getDay()]}</Text>
          </Pressable>
          <Text style={[styles.dayDate, { color: theme.muted }]}>{germanDateLong(displayDate)}</Text>
          <Pressable onPress={handleMosqueSwitchTrigger} style={[styles.cityBadge, { backgroundColor: theme.chipBg }]}>
            <Text style={[styles.cityBadgeText, { color: theme.chipText }]}>{activeMosque.label}</Text>
          </Pressable>
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
          {normalizedAnnouncement ? (
            <View style={[styles.announcementCard, isTablet && styles.announcementCardTablet, { backgroundColor: theme.bg, borderColor: theme.border }]}> 
              <Text style={[styles.announcementTitle, isTablet && styles.announcementTitleTablet, { color: theme.text }]}>Ankündigung</Text>
              <Text style={[styles.announcementBody, isTablet && styles.announcementBodyTablet, { color: theme.text }]}>
                {announcementSegments.map((segment, index) => (
                  <Text
                    key={`${segment.style}-${index}`}
                    style={[
                      styles.announcementBody,
                      isTablet && styles.announcementBodyTablet,
                      segment.style === 'bold' && styles.announcementBodyBold,
                      segment.style === 'italic' && styles.announcementBodyItalic,
                      segment.style === 'strike' && styles.announcementBodyStrike,
                      { color: theme.text },
                    ]}
                  >
                    {segment.text}
                  </Text>
                ))}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    );
  };

  const renderHeadlineBlock = (headline, fallbackTitle = '') => {
    const normalized = buildHeadlineConfig(headline);
    const title = normalized.title || String(fallbackTitle || '').trim();
    if (!title) return null;
    const lines = [
      { key: 'title', value: title, style: styles.headlineTitleText },
      { key: 'subtitle', value: normalized.subtitle, style: styles.headlineSubtitleText },
      { key: 'extra', value: normalized.extraLine, style: styles.headlineExtraText },
    ].filter((line) => Boolean(String(line.value || '').trim()));
    return (
      <View style={styles.headlineBlock}>
        {lines.map((line) => (
          <Text key={line.key} style={[line.style, { color: theme.text }]}>
            {parseFormattedSegments(line.value).map((segment, index) => (
              <Text
                key={`${line.key}_${segment.style}_${index}`}
                style={[
                  line.style,
                  segment.style === 'bold' && styles.announcementBodyBold,
                  segment.style === 'italic' && styles.announcementBodyItalic,
                  segment.style === 'strike' && styles.announcementBodyStrike,
                  { color: theme.text },
                ]}
              >
                {segment.text}
              </Text>
            ))}
          </Text>
        ))}
      </View>
    );
  };

  const renderTerminal = () => {
    const isRegistrationOnlyAppMode = normalizedAppMode === 'registration';
    const isPrayerMode = attendanceMode === 'prayer';
    const isProgramMode = attendanceMode === 'program';
    const isRegistrationMode = attendanceMode === 'registration';
    const modeSubTitle = isPrayerMode
      ? 'Erfassung der Gebetsanwesenheit'
      : (isProgramMode ? 'Erfassung der Programmanwesenheit' : 'Erfassung von Anmeldungen');
    const registrationNeedsLogin = Boolean(registrationWindow.loginEnabled);
    const hasRegistrationLoginAccess = registrationNeedsLogin ? Boolean(currentAccount) : (isRegistrationOnlyAppMode ? true : (registrationWindow.isPublic || Boolean(currentAccount)));
    const canAccessRegistrationMode = registrationWindow.canAccess && hasRegistrationLoginAccess;
    const registrationLockedByLogin = registrationWindow.canAccess && registrationNeedsLogin && !currentAccount;
    const hasActiveAttendanceWindow = !guestRequiresConfig
      && (isPrayerMode
        ? prayerWindow.isActive
        : (isProgramMode ? programWindow.isActive : (registrationWindow.isOpen && canAccessRegistrationMode)));
    const cycleAttendanceMode = () => {
      if (isPrayerMode) return 'program';
      if (isProgramMode) return canAccessRegistrationMode ? 'registration' : 'prayer';
      return 'prayer';
    };
    const pendingRegistrationVoterFlag = normalizeVoterFlagValue(pendingRegistrationMember?.stimmberechtigt);
    const pendingRegistrationAnwesendFlag = normalizeVoterFlagValue(pendingRegistrationMember?.anwesend_2026_01_08);
    const isPendingRegistrationAllowedByVoterRule = !registrationWindow.onlyEhlVoters || pendingRegistrationVoterFlag === 1;
    const isPendingRegistrationDisallowedByVoterRule = Boolean(
      registrationWindow.onlyEhlVoters
      && pendingRegistrationMember
      && pendingRegistrationVoterFlag !== 1,
    );

    return (
      <ScrollView ref={terminalScrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={contentContainerStyle} showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        <View style={[styles.terminalBanner, { backgroundColor: isDarkMode ? '#111827' : '#FFFFFF', borderColor: isDarkMode ? '#374151' : '#111111', borderWidth: isDarkMode ? 1 : 3 }]}>
          {!isRegistrationOnlyAppMode ? (
            <Pressable style={withPressEffect(styles.modeSwitch)} onPress={() => { setAttendanceMode(cycleAttendanceMode()); setTerminalMode('tanzeem'); setSelectedTanzeem(''); setSelectedMajlis(''); setPendingRegistrationMember(null); }}>
              <Text style={[styles.modeSwitchText, isTablet && styles.modeSwitchTextTablet, { color: isDarkMode ? '#FFFFFF' : '#111111' }]}>
                {isPrayerMode ? '<< Gebetsanwesenheit >>' : (isProgramMode ? '<< Programmanwesenheit >>' : '<< Anmeldung >>')}
              </Text>
            </Pressable>
          ) : null}
          <Text style={[styles.terminalBannerTitle, { color: isDarkMode ? '#FFFFFF' : '#111111' }]}>{isGuestMode ? (guestActivation?.mosqueName || 'Local Amarat') : 'Local Amarat Frankfurt'}</Text>
          <Text style={[styles.terminalBannerArabic, { color: isDarkMode ? '#D1D5DB' : '#374151' }]}>{isPrayerMode ? 'نماز حاضری' : (isProgramMode ? 'پروگرام حاضری' : 'اندراج / رجسٹریشن')}</Text>
          <Text style={[styles.terminalBannerSubtitle, { color: isDarkMode ? '#D1D5DB' : '#4B5563' }]}>{modeSubTitle}</Text>
        </View>

        <View style={[styles.currentPrayerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {isPrayerMode ? (
            prayerWindow.isActive ? (
              <Text style={[styles.currentPrayerText, { color: theme.text }]}>Aktuelles Gebet: {prayerWindow.prayerLabel}</Text>
            ) : (
              <>
                <Text style={[styles.noPrayerTitle, isDarkMode ? styles.noPrayerTitleDark : styles.noPrayerTitleLight]}>Derzeit kein Gebet</Text>
                <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginTop: 10 }]}>Nächstes Gebet:</Text>
                <Text style={[styles.nextPrayerValue, { color: theme.text }]}>{prayerWindow.nextLabel}</Text>
                <View style={[styles.noPrayerCountdownChip, { borderColor: theme.border, backgroundColor: isDarkMode ? '#1F2937' : '#FEF3C7' }]}>
                  <Text style={[styles.noPrayerCountdownText, { color: theme.text }]}>
                    Das Zeitfenster öffnet sich in {formatMinutesUntil(prayerWindow.minutesUntilNextWindow)}
                  </Text>
                </View>
              </>
            )
          ) : isProgramMode ? (
            programWindow.isActive ? (
              <>
                <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginBottom: 6 }]}>Aktuelles Programm</Text>
                {renderHeadlineBlock(programWindow.headline, programWindow.label)}
              </>
            ) : (
              <>
                <Text style={[styles.noPrayerTitle, isDarkMode ? styles.noPrayerTitleDark : styles.noPrayerTitleLight]}>Aktuell kein Programm vorhanden</Text>
                {programWindow.isConfigured ? (
                  <View style={[styles.programScheduledHint, { borderColor: theme.border, backgroundColor: isDarkMode ? '#1F2937' : '#FEF3C7' }]}>
                    <Text style={[styles.programScheduledLabel, { color: theme.text }]}>Programm geplant:</Text>
                    {renderHeadlineBlock(programWindow.headline, programWindow.label)}
                    <Text style={[styles.programScheduledValue, { color: theme.text }]}>
                      Beginnt in {Math.floor((programWindow.minutesUntilStart || 0) / 60)}h {String((programWindow.minutesUntilStart || 0) % 60).padStart(2, '0')}m
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginTop: 10 }]}>Für heute ist kein Programm geplant.</Text>
                )}
              </>
            )
          ) : (
            registrationWindow.canAccess ? (
              registrationWindow.isOpen ? (
                <>
                  <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginBottom: 6 }]}>Anmeldung</Text>
                  {renderHeadlineBlock(registrationWindow.config, registrationWindow.config?.name || 'Anmeldung')}
                </>
              ) : registrationWindow.isUpcoming ? (
                <View style={[styles.programScheduledHint, { borderColor: theme.border, backgroundColor: isDarkMode ? '#1F2937' : '#FEF3C7' }]}>
                  <Text style={[styles.programScheduledLabel, { color: theme.text }]}>Anmeldung startet am:</Text>
                  {renderHeadlineBlock(registrationWindow.config, registrationWindow.config?.name || 'Anmeldung')}
                  <Text style={[styles.programScheduledValue, { color: theme.text }]}>{registrationWindow.config?.startDate || '—'}</Text>
                </View>
              ) : (
                <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginTop: 10 }]}>Die Anmeldung ist abgelaufen und nur noch in den Statistiken sichtbar.</Text>
              )
            ) : (
              <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginTop: 10 }]}>Keine Anmeldung mit gültigem Zeitraum konfiguriert.</Text>
            )
          )}
        </View>

        {hasActiveAttendanceWindow ? (
          <>
            {isQuickIdSearchVisible ? (
              <>
                <Pressable onPress={() => { setQuickIdSearchVisible(false); setQuickIdSearchQuery(''); }} style={withPressEffect(styles.quickSearchLinkWrap)}>
                  <Text style={[styles.quickSearchLinkText, { color: isDarkMode ? 'rgba(209, 213, 219, 0.84)' : 'rgba(55, 65, 81, 0.84)' }]}>Schließen</Text>
                </Pressable>
                <View style={[styles.quickSearchPanel, { borderColor: '#000000', backgroundColor: theme.card }]}>
                <TextInput
                  value={quickIdSearchQuery}
                  onChangeText={(value) => setQuickIdSearchQuery(String(value || '').replace(/[^0-9]/g, ''))}
                  onFocus={() => terminalScrollRef.current?.scrollTo({ y: 180, animated: true })}
                  placeholder="ID-Nummer suchen"
                  placeholderTextColor={theme.muted}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  returnKeyType="done"
                  style={[styles.idSearchInput, { marginTop: 0, color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                />
                {quickSearchDigits.length < 4 ? (
                  <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginTop: 8 }]}>Bitte mindestens 4 Ziffern eingeben.</Text>
                ) : quickSearchResults.length === 0 ? (
                  <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginTop: 8 }]}>Keine passende ID gefunden.</Text>
                ) : (
                  <View style={styles.quickSearchResultsWrap}>
                    {quickSearchResults.map((member) => (
                      <Pressable
                        key={`quick_${member.tanzeem}_${member.majlis}_${member.idNumber}`}
                        onPress={() => {
                          if (isRegistrationMode) {
                            setQuickIdSearchVisible(false);
                            setRegistrationConfirmFromQuickSearch(true);
                            setRegistrationDeclineConfirmVisible(false);
                            setRegistrationDeclineReasonInput('');
                            setPendingRegistrationMember(member);
                            setTerminalMode('registrationConfirm');
                            return;
                          }
                          countAttendance(attendanceMode, 'member', member.majlis, member);
                        }}
                        style={({ pressed }) => [[styles.quickSearchResultCard, { borderColor: theme.border, backgroundColor: theme.bg }], pressed && styles.buttonPressed]}
                      >
                        <Text style={[styles.quickSearchResultText, { color: theme.text }]}>{`${member.idNumber} · ${TANZEEM_LABELS[member.tanzeem] || member.tanzeem} · ${resolveExportMajlisLabel(member.majlis, member?.amarat)}`}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
              </>
            ) : null}
          </>
        ) : null}

        {hasActiveAttendanceWindow && !isQuickIdSearchVisible ? (terminalMode === 'tanzeem' ? (
          <>
            <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, { color: theme.text, textAlign: 'center' }]}>Bitte wählen Sie die Tanzeem</Text>
            <Text style={[styles.urduText, { color: theme.muted }]}>براہِ کرم تنظیم منتخب کریں</Text>
            <View style={styles.tanzeemRow}>
              {(isPrayerMode ? TANZEEM_OPTIONS : (isProgramMode ? PROGRAM_TANZEEM_OPTIONS : registrationWindow.includeTanzeems)).map((tanzeem) => (
                <Pressable key={tanzeem} style={({ pressed }) => [[styles.tanzeemBtn, isTablet && styles.tanzeemBtnTablet, { backgroundColor: theme.button }], pressed && styles.buttonPressed]} onPress={() => { setSelectedTanzeem(tanzeem); setSelectedMajlis(hasMultipleMajalisInGuest ? '' : '-'); setTerminalMode(hasMultipleMajalisInGuest ? 'majlis' : 'idSelection'); }}>
                  <Text style={[styles.presetBtnText, isTablet && styles.presetBtnTextTablet, { color: theme.buttonText }]}>{TANZEEM_LABELS[tanzeem]}</Text>
                </Pressable>
              ))}
            </View>
            {!isRegistrationMode ? (<View style={styles.guestButtonRow}>
              <View style={styles.guestButtonSpacer} />
              <Pressable
                onPress={() => countAttendance(attendanceMode, 'guest')}
                style={({ pressed }) => [[styles.tanzeemBtn, isTablet && styles.tanzeemBtnTablet, styles.guestButton, { backgroundColor: theme.button }, !isDarkMode && styles.guestButtonLightOutline], pressed && styles.buttonPressed]}
              >
                <Text style={[styles.presetBtnText, isTablet && styles.presetBtnTextTablet, { color: theme.buttonText }]}>Gast</Text>
              </Pressable>
              <View style={styles.guestButtonSpacer} />
            </View>) : null}
            <Pressable onPress={() => setQuickIdSearchVisible((prev) => !prev)} style={withPressEffect(styles.quickSearchLinkWrap)}>
              <Text style={[styles.quickSearchLinkText, { color: isDarkMode ? 'rgba(209, 213, 219, 0.84)' : 'rgba(55, 65, 81, 0.84)' }]}>Hier direkt ID-Nummer suchen</Text>
            </Pressable>
          </>
        ) : terminalMode === 'majlis' ? (
          <>
            <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, { color: theme.text, textAlign: 'center' }]}>{`Bitte wählen Sie Ihre ${hasGuestEntriesWithoutMajlis ? 'Jamaat' : 'Majlis'}`}</Text>
            <Text style={[styles.urduText, { color: theme.muted }]}>براہِ کرم اپنی مجلس منتخب کریں</Text>
            <Pressable style={({ pressed }) => [[styles.saveBtn, { backgroundColor: theme.button }], pressed && styles.buttonPressed]} onPress={() => { setTerminalMode('tanzeem'); setSelectedTanzeem(''); setSelectedMajlis(''); }}>
              <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.buttonText }]}>Zurück</Text>
            </Pressable>
            {membersLoading ? <ActivityIndicator size="small" color={theme.text} /> : null}
            {!membersLoading && majlisChoices.length === 0 ? <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>{`Keine ${hasGuestEntriesWithoutMajlis ? 'Jamaat' : 'Majlis'}-Daten für diese Tanzeem gefunden.`}</Text> : null}
            <View style={styles.gridWrap}>
              {majlisChoices.map((loc) => (
                <Pressable key={loc} style={({ pressed }) => [[styles.gridItem, isTablet && styles.gridItemTablet, { backgroundColor: theme.card, borderColor: theme.border }], pressed && styles.buttonPressed]} onPress={() => { setSelectedMajlis(loc); setTerminalMode('idSelection'); }}>
                  <Text style={[styles.gridText, isTablet && styles.gridTextTablet, { color: theme.text }]}>{loc}</Text>
                </Pressable>
              ))}
            </View>
            {!isRegistrationMode ? (<View style={styles.guestButtonRow}>
              <View style={styles.guestButtonSpacer} />
              <Pressable
                onPress={() => countAttendance(attendanceMode, 'guest')}
                style={({ pressed }) => [[styles.tanzeemBtn, isTablet && styles.tanzeemBtnTablet, { backgroundColor: isDarkMode ? '#FFFFFF' : '#000000' }], pressed && styles.buttonPressed]}
              >
                <Text style={[styles.presetBtnText, isTablet && styles.presetBtnTextTablet, { color: isDarkMode ? '#000000' : '#FFFFFF' }]}>Gast</Text>
              </Pressable>
              <View style={styles.guestButtonSpacer} />
            </View>) : null}
            <Pressable onPress={() => setQuickIdSearchVisible((prev) => !prev)} style={withPressEffect(styles.quickSearchLinkWrap)}>
              <Text style={[styles.quickSearchLinkText, { color: isDarkMode ? 'rgba(209, 213, 219, 0.84)' : 'rgba(55, 65, 81, 0.84)' }]}>Hier direkt ID-Nummer suchen</Text>
            </Pressable>
          </>
        ) : terminalMode === 'registrationConfirm' ? (
          <>
            <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, { color: theme.text, textAlign: 'center' }]}>Anmeldung bestätigen</Text>
            <Text style={[styles.urduText, { color: theme.muted }]}>براہِ کرم اندراج کی تصدیق کریں</Text>
            {pendingRegistrationMember ? (
              <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Ausgewählte ID</Text>
                <Text style={[styles.statsBigValue, { color: theme.text }]}>{pendingRegistrationMember.idNumber}</Text>
                <Text style={[styles.noteText, { color: theme.muted }]}>
                  {`${TANZEEM_LABELS[pendingRegistrationMember.tanzeem] || pendingRegistrationMember.tanzeem} · ${resolveExportMajlisLabel(pendingRegistrationMember.majlis, pendingRegistrationMember?.amarat)}${
                    isGuestMode ? '' : ((pendingRegistrationVoterFlag === 1 || pendingRegistrationVoterFlag === 0) ? ' · Ehl-Voter' : ' · Nicht-Ehl-Voter')
                  }`}
                </Text>
              </View>
            ) : null}
            {registrationWindow.onlyEhlVoters && !isGuestMode && pendingRegistrationMember ? (
              <View style={[styles.registrationVoterInfoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {pendingRegistrationVoterFlag === 1 ? (
                  <>
                    <Text style={[styles.registrationVoterInfoHeadline, { color: theme.text }]}>Sie dürfen an der Wahl teilnehmen.</Text>
                    <Text style={[styles.registrationVoterInfoDetail, { color: theme.muted }]}>
                      {pendingRegistrationAnwesendFlag === 1 ? 'Bei der letzten Wahl am 08.01.2026 waren Sie anwesend.' : 'Bei der letzten Wahl am 08.01.2026 waren Sie nicht anwesend.'}
                    </Text>
                  </>
                ) : pendingRegistrationVoterFlag === 0 ? (
                  <Text style={[styles.registrationVoterInfoHeadline, { color: theme.text }]}>Sie sind leider nicht stimmberechtigt.</Text>
                ) : (
                  <Text style={[styles.registrationVoterInfoHeadline, { color: theme.text }]}>Sie erfüllen nicht die Voraussetzungen eines Ehl-Voters.</Text>
                )}
              </View>
            ) : null}
            <Pressable
              style={({ pressed }) => [[styles.registrationConfirmBtn, {
                opacity: pendingRegistrationMember ? 1 : 0.6,
                backgroundColor: isPendingRegistrationDisallowedByVoterRule ? '#DC2626' : '#16A34A',
              }], pressed && isPendingRegistrationAllowedByVoterRule && styles.buttonPressed]}
              disabled={!pendingRegistrationMember}
              onPress={async () => {
                if (!pendingRegistrationMember) return;
                if (!isPendingRegistrationAllowedByVoterRule) {
                  if (pendingRegistrationVoterFlag === 0) setToast('Sie sind leider nicht stimmberechtigt.');
                  else setToast('Sie erfüllen nicht die Voraussetzungen eines Ehl-Voters.');
                  return;
                }
                await countAttendance('registration', 'member', pendingRegistrationMember.majlis, pendingRegistrationMember);
                setPendingRegistrationMember(null);
                setRegistrationConfirmFromQuickSearch(false);
                setRegistrationDeclineConfirmVisible(false);
                setRegistrationDeclineReasonInput('');
              }}
            >
              <Text style={styles.registrationConfirmBtnText}>Anmelden</Text>
            </Pressable>
            {registrationWindow.allowDecline && pendingRegistrationMember && (!registrationWindow.onlyEhlVoters || pendingRegistrationVoterFlag === 1) ? (
              <>
                <Pressable
                  style={({ pressed }) => [[styles.registrationConfirmBtn, { marginTop: 0, backgroundColor: '#000000' }], pressed && styles.buttonPressed]}
                  onPress={() => setRegistrationDeclineConfirmVisible((prev) => !prev)}
                >
                  <Text style={styles.registrationConfirmBtnText}>Abmelden</Text>
                </Pressable>
                {registrationDeclineConfirmVisible ? (
                  <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
                    <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Optional Grund angeben</Text>
                    <TextInput
                      value={registrationDeclineReasonInput}
                      onChangeText={setRegistrationDeclineReasonInput}
                      placeholder="Optional Grund eingeben"
                      placeholderTextColor={theme.muted}
                      style={[styles.mergeInput, { marginTop: 8, color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                    />
                    <Pressable
                      style={({ pressed }) => [[styles.saveBtn, { marginTop: 10, backgroundColor: '#000000' }], pressed && styles.buttonPressed]}
                      onPress={async () => {
                        if (!pendingRegistrationMember) return;
                        await countAttendance('registration', 'member', pendingRegistrationMember.majlis, pendingRegistrationMember, {
                          registrationResponse: 'decline',
                          declineReason: registrationDeclineReasonInput,
                        });
                        setPendingRegistrationMember(null);
                        setRegistrationConfirmFromQuickSearch(false);
                        setRegistrationDeclineConfirmVisible(false);
                        setRegistrationDeclineReasonInput('');
                      }}
                    >
                      <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: '#FFFFFF' }]}>Abmeldung bestätigen</Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            ) : null}
            <Pressable
              style={({ pressed }) => [[styles.saveBtn, {
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderWidth: 1,
              }], pressed && styles.buttonPressed]}
              onPress={() => {
                const shouldBackToTanzeem = Boolean(
                  registrationWindow.onlyEhlVoters
                  && pendingRegistrationMember
                  && !isVotingEligibleMember(pendingRegistrationMember),
                );
                if (shouldBackToTanzeem) {
                  setPendingRegistrationMember(null);
                  setRegistrationConfirmFromQuickSearch(false);
                  setRegistrationDeclineConfirmVisible(false);
                  setRegistrationDeclineReasonInput('');
                  setSelectedTanzeem('');
                  setSelectedMajlis('');
                  setTerminalMode('tanzeem');
                  setQuickIdSearchVisible(false);
                  setQuickIdSearchQuery('');
                  return;
                }
                if (registrationConfirmFromQuickSearch) {
                  setPendingRegistrationMember(null);
                  setRegistrationConfirmFromQuickSearch(false);
                  setRegistrationDeclineConfirmVisible(false);
                  setRegistrationDeclineReasonInput('');
                  setSelectedTanzeem('');
                  setSelectedMajlis('');
                  setTerminalMode('tanzeem');
                  setQuickIdSearchVisible(true);
                  setQuickIdSearchQuery('');
                  return;
                }
                setRegistrationDeclineConfirmVisible(false);
                setRegistrationDeclineReasonInput('');
                setTerminalMode('idSelection');
              }}
            >
              <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.text }]}>Zurück</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, { color: theme.text, textAlign: 'center' }]}>Bitte wählen Sie Ihre ID-Nummer</Text>
            <Text style={[styles.urduText, { color: theme.muted }]}>براہِ کرم اپنی آئی ڈی منتخب کریں</Text>
            <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginBottom: 4 }]}>{`${resolveExportMajlisLabel(selectedMajlis)} · ${TANZEEM_LABELS[selectedTanzeem] || ''}`}</Text>
            <Pressable style={({ pressed }) => [[styles.saveBtn, { backgroundColor: theme.button }], pressed && styles.buttonPressed]} onPress={() => setTerminalMode(hasMultipleMajalisInGuest ? 'majlis' : 'tanzeem')}>
              <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.buttonText }]}>Zurück</Text>
            </Pressable>
            {membersLoading ? <ActivityIndicator size="small" color={theme.text} /> : null}
            {!membersLoading && memberChoices.length === 0 ? <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>Keine ID-Nummern verfügbar.</Text> : null}
            {memberChoices.length > 0 ? (
              <>
                <TextInput
                  value={idSearchQuery}
                  onChangeText={(value) => {
                    const digitsOnly = String(value || '').replace(/[^0-9]/g, '');
                    setIdSearchQuery(digitsOnly);
                  }}
                  onFocus={() => setIsIdSearchFocused(true)}
                  onBlur={() => setIsIdSearchFocused(false)}
                  placeholder="ID-Nummer suchen"
                  placeholderTextColor={theme.muted}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  returnKeyType="done"
                  style={[styles.idSearchInput, { color: theme.text, borderColor: isDarkMode ? '#FFFFFF' : '#000000', backgroundColor: theme.card }]}
                />
                {idSearchQuery && filteredMemberChoices.length === 0 ? (
                  <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginTop: 8 }]}>Keine passende ID gefunden</Text>
                ) : visibleMemberChoices.length === 0 ? (
                  <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginTop: 8 }]}>Keine ID-Nummern verfügbar.</Text>
                ) : (
                  <View style={[styles.gridWrap, styles.idGridWrap]}>
                    {visibleMemberChoices.map((member) => {
                      const isAlreadyCounted = shouldShowCountedIdHint && countedMemberIdsForSelection.has(String(member.idNumber || ''));
                      const shouldUseRegistrationResponseBorders = shouldShowCountedIdHint && isRegistrationMode && (registrationWindow.onlyEhlVoters || registrationWindow.allowDecline);
                      const registrationResponse = shouldUseRegistrationResponseBorders ? countedMemberResponsesForSelection.get(String(member.idNumber || '')) : '';
                      const responseBorderStyle = shouldUseRegistrationResponseBorders
                        ? (registrationResponse === 'decline'
                          ? { borderColor: '#DC2626', borderWidth: 3 }
                          : (registrationResponse === 'accept' ? { borderColor: '#16A34A', borderWidth: 3 } : null))
                        : null;
                      return (
                        <Pressable
                          key={`${member.tanzeem}_${member.majlis}_${member.idNumber}`}
                          style={({ pressed }) => [[
                            styles.gridItem,
                            isTablet && styles.gridItemTablet,
                            { backgroundColor: theme.card, borderColor: theme.border },
                            responseBorderStyle,
                            isAlreadyCounted && !shouldUseRegistrationResponseBorders && styles.gridItemCounted,
                            isAlreadyCounted && !shouldUseRegistrationResponseBorders && { backgroundColor: isDarkMode ? 'rgba(75, 85, 99, 0.24)' : 'rgba(209, 213, 219, 0.26)' },
                          ], pressed && styles.buttonPressed]}
                          onPress={() => {
                            if (isRegistrationMode) {
                              setRegistrationConfirmFromQuickSearch(false);
                              setRegistrationDeclineConfirmVisible(false);
                              setRegistrationDeclineReasonInput('');
                              setPendingRegistrationMember(member);
                              setTerminalMode('registrationConfirm');
                              return;
                            }
                            countAttendance(attendanceMode, 'member', selectedMajlis, member);
                          }}
                        >
                          <Text
                            style={[
                              styles.gridText,
                              isTablet && styles.gridTextTablet,
                              { color: theme.text },
                              isAlreadyCounted && !shouldUseRegistrationResponseBorders && { color: theme.muted },
                            ]}
                          >
                            {member.idNumber}
                          </Text>
                          {showMemberNamesInGrid ? <Text style={[styles.gridSubText, { color: theme.muted }]} numberOfLines={1}>{member.name}</Text> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
             </>
            ) : null}
            {!isRegistrationMode ? (<View style={styles.guestButtonRow}>
              <View style={styles.guestButtonSpacer} />
              <Pressable
                onPress={() => countAttendance(attendanceMode, 'guest')}
                style={({ pressed }) => [[styles.tanzeemBtn, isTablet && styles.tanzeemBtnTablet, styles.guestButton, { backgroundColor: isDarkMode ? '#FFFFFF' : theme.button }, !isDarkMode && styles.guestButtonLightOutline], pressed && styles.buttonPressed]}
              >
                <Text style={[styles.presetBtnText, isTablet && styles.presetBtnTextTablet, { color: isDarkMode ? '#000000' : theme.buttonText }]}>Gast</Text>
              </Pressable>
              <View style={styles.guestButtonSpacer} />
            </View>) : null}
          </>
        )) : null}

        {!hasActiveAttendanceWindow ? (
          <>
            <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>
              {isPrayerMode
                ? (guestRequiresConfig
                  ? 'Bitte zuerst die Local Amarat in den Einstellungen speichern.'
                  : 'Anwesenheit kann nur im aktiven Gebet erfasst werden (30 Minuten davor bzw. 60 Minuten danach).')
                : (isProgramMode
                  ? (guestRequiresConfig
                    ? 'Bitte zuerst die Local Amarat in den Einstellungen speichern.'
                    : 'Programmanwesenheit kann nur bei aktivem Programm erfasst werden.')
                  : (registrationLockedByLogin
                    ? 'Anmeldung ist nur für eingeloggte Nutzer sichtbar.'
                    : (registrationWindow.isUpcoming
                      ? `Anmeldung öffnet am ${registrationWindow.config?.startDate || '—'}.`
                      : 'Anmeldung ist aktuell nicht aktiv.')))}
            </Text>
          </>
        ) : null}

        {(hasActiveAttendanceWindow && (isPrayerMode || isProgramMode)) ? (
          <View style={[styles.terminalInlineQrCard, { borderColor: theme.border, backgroundColor: theme.bg }]}>
            <Text style={[styles.terminalInlineQrTitle, { color: theme.text }]}>
              {isProgramMode ? 'QR Programmanwesenheit' : 'QR Gebetsanwesenheit'}
            </Text>
            <Text style={[styles.terminalInlineQrHint, { color: theme.muted }]}>
              {isProgramMode
                ? 'Direkt scannen oder manuell eintragen.'
                : 'Direkt scannen oder manuell eintragen.'}
            </Text>
            <View style={[styles.terminalInlineQrImageWrap, { borderColor: theme.border, backgroundColor: theme.card }]}>
              {qrImageUri ? (
                <Image
                  source={{ uri: qrImageUri }}
                  style={styles.terminalInlineQrImage}
                  resizeMode="contain"
                  onLoad={() => { if (qrPendingImageUri === qrImageUri) setQrPendingImageUri(''); }}
                />
              ) : <ActivityIndicator size="small" color={theme.text} />}
              {qrPendingImageUri ? (
                <Image
                  source={{ uri: qrPendingImageUri }}
                  style={styles.qrCodePreloadImage}
                  resizeMode="contain"
                  onLoad={() => { setQrImageUri(qrPendingImageUri); setQrPendingImageUri(''); }}
                />
              ) : null}
            </View>
            <View style={[styles.terminalInlineQrTimerChip, { borderColor: theme.border, backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }]}>
              <Text style={[styles.terminalInlineQrTimerText, { color: theme.text }]}>Aktualisierung in {formatQrCountdown(qrCountdownSeconds)}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.privacyNoticeWrap}>
          <Text style={[styles.privacyNoticeText, { color: isDarkMode ? 'rgba(209, 213, 219, 0.72)' : 'rgba(55, 65, 81, 0.72)' }]}>Mitgliedsdaten werden ausschließlich zur Anwesenheitserfassung und internen Organisation verarbeitet.</Text>
          <Pressable onPress={() => setPrivacyModalVisible(true)} style={withPressEffect(styles.privacyNoticeLinkWrap)}>
            <Text style={[styles.privacyNoticeLinkText, { color: isDarkMode ? 'rgba(209, 213, 219, 0.84)' : 'rgba(55, 65, 81, 0.84)' }]}>Datenschutzerklärung anzeigen</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  };

  const renderStats = () => {
    const selectedStatsDateObj = parseISO(selectedStatsDateISO || '');
    const statsHeaderDate = statsMode === 'prayer' && selectedStatsDateObj
      ? germanWeekdayDateLong(selectedStatsDateObj)
      : germanWeekdayDateLong(now);
    const isProgramStatsMode = statsMode === 'program';
    const isRegistrationStatsMode = statsMode === 'registration';
    const tanzeemProgramTotals = {
      ansar: Number(programStats?.byTanzeem?.ansar) || 0,
      khuddam: Number(programStats?.byTanzeem?.khuddam) || 0,
      atfal: Number(programStats?.byTanzeem?.atfal) || 0,
      kinder: Number(programStats?.byTanzeem?.kinder) || 0,
    };
    const programTotal = Number(programStats?.total) || 0;
    const programGuestTotal = Number(programStats?.guestTotal) || 0;
    const programMajlisRows = (() => {
      const filterKey = ['total', ...PROGRAM_TANZEEM_OPTIONS].includes(programMajlisFilter) ? programMajlisFilter : 'total';
      const directoryMembers = membersDirectory.filter((entry) => (
        filterKey === 'total' ? true : entry.tanzeem === filterKey
      ));

      const registeredByMajlis = directoryMembers.reduce((acc, entry) => {
        const majlis = resolveExportMajlisLabel(entry?.majlis, entry?.amarat);
        if (!majlis) return acc;
        acc[majlis] = (acc[majlis] || 0) + 1;
        return acc;
      }, {});

      const presentByMajlis = programAttendanceEntries
        .filter((entry) => {
          if (String(entry?.idNumber || '') === 'guest') return false;
          const tanzeem = String(entry?.tanzeem || '').toLowerCase();
          return filterKey === 'total' ? true : tanzeem === filterKey;
        })
        .reduce((acc, entry) => {
          const majlis = resolveExportMajlisLabel(entry?.majlis, entry?.amarat);
          if (!majlis) return acc;
          acc[majlis] = (acc[majlis] || 0) + 1;
          return acc;
        }, {});

      return Object.keys({ ...registeredByMajlis, ...presentByMajlis })
        .map((majlis) => ({
          majlis,
          present: Number(presentByMajlis[majlis]) || 0,
          total: Number(registeredByMajlis[majlis]) || 0,
        }))
        .sort((a, b) => (b.present - a.present) || a.majlis.localeCompare(b.majlis));
    })();

    const chartPalette = {
      total: isDarkMode ? '#F9FAFB' : '#111827',
      ansar: '#2563EB',
      khuddam: '#16A34A',
      atfal: '#F59E0B',
      guest: '#A855F7',
    };
    const graphRangeMode = statsGraphRange === 'selectedDate' ? 'selectedDate' : (statsGraphRange === 'previousWeek' ? 'previousWeek' : 'currentWeek');
    const isSelectedDateChart = graphRangeMode === 'selectedDate';
    const activeGraphIsos = graphRangeMode === 'currentWeek' ? statsWeekIsos : (graphRangeMode === 'previousWeek' ? statsRollingWeekIsos : []);
    const graphWeekRows = activeGraphIsos.map((iso) => {
      const totals = getDailyTotalsForStats(weeklyAttendanceDocs[iso]);
      const dateObj = parseISO(iso);
      const weekdayShort = dateObj ? new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(dateObj).replace(/\.$/, '') : iso;
      return { iso, label: dateObj ? weekdayShort : iso, total: totals.total, tanzeemTotals: totals.tanzeemTotals };
    });
    const chartLabels = isSelectedDateChart
      ? STATS_PRAYER_SEQUENCE.map((item) => item.label)
      : graphWeekRows.map((item) => item.label);

    const seriesCycleOptions = ['total', 'ansar', 'khuddam', 'atfal'];
    const activeSeriesKey = seriesCycleOptions.includes(statsGraphSeries) ? statsGraphSeries : 'total';

    const seriesConfig = {
      total: {
        key: 'total',
        label: 'Gesamt',
        color: chartPalette.total,
        thick: true,
        data: (isSelectedDateChart ? todayGraphRows : graphWeekRows).map((row) => row.total || 0),
      },
      ansar: {
        key: 'ansar',
        label: 'Ansar',
        color: chartPalette.ansar,
        data: (isSelectedDateChart ? todayGraphRows : graphWeekRows).map((row) => row.tanzeemTotals?.ansar || 0),
      },
      khuddam: {
        key: 'khuddam',
        label: 'Khuddam',
        color: chartPalette.khuddam,
        data: (isSelectedDateChart ? todayGraphRows : graphWeekRows).map((row) => row.tanzeemTotals?.khuddam || 0),
      },
      atfal: {
        key: 'atfal',
        label: 'Atfal',
        color: chartPalette.atfal,
        data: (isSelectedDateChart ? todayGraphRows : graphWeekRows).map((row) => row.tanzeemTotals?.atfal || 0),
      },
      guest: {
        key: 'guest',
        label: 'Gäste',
        color: chartPalette.guest,
        data: todayGraphRows.map((row) => row.guest || 0),
      },
    };

    const chartSeries = [seriesConfig[activeSeriesKey] || seriesConfig.total];
    const chartXAxisTitle = isSelectedDateChart ? 'Gebete' : 'Tage';

    const activeSeriesLabel = chartSeries[0]?.label || 'Gesamt';
    const activeSeriesData = chartSeries[0]?.data || [];
    const chartPointRows = chartLabels.map((label, index) => ({ label, value: Number(activeSeriesData[index]) || 0 }));

    const selectedDateSeriesSummary = isSelectedDateChart && chartPointRows.length > 0 ? (() => {
      const highest = chartPointRows.reduce((best, item) => (item.value > best.value ? item : best), chartPointRows[0]);
      const lowest = chartPointRows.reduce((worst, item) => (item.value < worst.value ? item : worst), chartPointRows[0]);
      const average = chartPointRows.reduce((sum, item) => sum + item.value, 0) / Math.max(1, chartPointRows.length);
      return { highest, lowest, average };
    })() : null;

    const previousCompareIsos = statsGraphRange === 'currentWeek' ? statsPrevWeekIsos : (statsGraphRange === 'previousWeek' ? statsWeekIsos : []);
    const previousWeekSeriesTotal = (!isSelectedDateChart) ? previousCompareIsos.reduce((sum, iso) => {
      const totals = getDailyTotalsForStats(weeklyAttendanceDocs[iso]);
      if (activeSeriesKey === 'total') return sum + (totals.total || 0);
      return sum + (totals.tanzeemTotals?.[activeSeriesKey] || 0);
    }, 0) : 0;

    const weekSeriesSummary = (!isSelectedDateChart) && chartPointRows.length > 0 ? (() => {
      const highest = chartPointRows.reduce((best, item) => (item.value > best.value ? item : best), chartPointRows[0]);
      const lowest = chartPointRows.reduce((worst, item) => (item.value < worst.value ? item : worst), chartPointRows[0]);
      const total = chartPointRows.reduce((sum, item) => sum + item.value, 0);
      const averagePerDay = total / Math.max(1, chartPointRows.length);
      const previousAvg = previousWeekSeriesTotal / Math.max(1, previousCompareIsos.length);
      const trendPercent = previousAvg > 0 ? ((averagePerDay - previousAvg) / previousAvg) * 100 : 0;
      return { highest, lowest, averagePerDay, trendPercent };
    })() : null;

    return (
      <ScrollView contentContainerStyle={contentContainerStyle} showsVerticalScrollIndicator={false}>
        <View style={[styles.statsHeaderCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Pressable style={withPressEffect(styles.modeSwitch)} onPress={() => {
            if (statsMode === 'prayer') { setStatsMode('program'); return; }
            if (statsMode === 'program') { setStatsMode(currentAccount ? 'registration' : 'prayer'); return; }
            setStatsMode('prayer');
          }}>
            <Text style={[styles.modeSwitchText, isTablet && styles.modeSwitchTextTablet, { color: theme.text }]}>
              {statsMode === 'prayer' ? '<< Gebetsstatistik >>' : (statsMode === 'program' ? '<< Programmstatistik >>' : '<< Anmeldungsstatistik >>')}
            </Text>
          </Pressable>
          <Text style={[styles.statsHeaderTitle, { color: theme.text }]}>Statistik</Text>
          <Text style={[styles.statsHeaderDate, { color: theme.muted }]}>{statsHeaderDate}</Text>
          <Text style={[styles.statsHeaderSubline, { color: theme.muted }]}>Local Amarat Frankfurt</Text>
          <View style={[styles.statsHeaderLocationChip, { backgroundColor: theme.chipBg }]}><Text style={[styles.statsHeaderLocationChipText, { color: theme.chipText }]}>{activeMosque.label}</Text></View>
          <View style={[styles.statsHeaderDivider, { backgroundColor: theme.border }]} />
          {statsMode === 'prayer' && effectivePermissions.canExportData ? (
            <Pressable
              onPress={() => setStatsExportModalVisible(true)}
              disabled={!hasStatsExportData || statsExporting}
              style={[
                styles.statsExportBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: (!hasStatsExportData || statsExporting) ? theme.border : theme.bg,
                  opacity: (!hasStatsExportData || statsExporting) ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.statsExportBtnText, { color: theme.text }]}>{statsExporting ? 'Export läuft…' : 'Daten exportieren'}</Text>
            </Pressable>
          ) : (isProgramStatsMode && effectivePermissions.canExportData ? (
            <Pressable
              onPress={handleExportProgram}
              disabled={programExporting || (!programStats?.total && !Object.values(programStats?.byMajlis || {}).some((v) => (Number(v) || 0) > 0))}
              style={[
                styles.statsExportBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: (programExporting || (!programStats?.total && !Object.values(programStats?.byMajlis || {}).some((v) => (Number(v) || 0) > 0))) ? theme.border : theme.bg,
                  opacity: (programExporting || (!programStats?.total && !Object.values(programStats?.byMajlis || {}).some((v) => (Number(v) || 0) > 0))) ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.statsExportBtnText, { color: theme.text }]}>{programExporting ? 'Export läuft…' : 'Daten exportieren'}</Text>
            </Pressable>
          ) : (isRegistrationStatsMode && effectivePermissions.canExportData ? (
            <Pressable
              onPress={handleExportRegistration}
              disabled={registrationExporting || (!registrationStats?.total)}
              style={[
                styles.statsExportBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: (registrationExporting || (!registrationStats?.total)) ? theme.border : theme.bg,
                  opacity: (registrationExporting || (!registrationStats?.total)) ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.statsExportBtnText, { color: theme.text }]}>{registrationExporting ? 'Export läuft…' : 'Daten exportieren'}</Text>
            </Pressable>
          ) : null))}
        </View>

        {isProgramStatsMode ? (
          <>
            <Pressable
              onPress={() => {
                if (!availableProgramStatsOptions.length) return;
                setProgramStatsPickerVisible(true);
              }}
              disabled={!availableProgramStatsOptions.length}
              style={[
                styles.statsCalendarBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.bg,
                  opacity: availableProgramStatsOptions.length ? 1 : 0.6,
                },
              ]}
            >
              <Text style={[styles.statsCalendarBtnText, { color: theme.text }]}>
                {selectedProgramConfigDateISO
                  ? `Programm auswählen · ${selectedProgramLabel}`
                  : 'Programm auswählen · Keine Programmdaten'}
              </Text>
            </Pressable>

            {!selectedProgramConfigDateISO ? (
              <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.noteText, { color: theme.muted }]}>Keine Programmdaten verfügbar</Text>
              </View>
            ) : (
              <>
                <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Programm</Text>
                  <Text style={[styles.statsBigValue, { color: theme.text }]}>{selectedProgramLabel}</Text>
                </View>

              <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Gesamt Programmanwesenheit</Text>
                <Text style={[styles.statsBigValue, { color: theme.text }]}>{programTotal}</Text>
              </View>

              <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Tanzeem Aufteilung (Programm)</Text>
                <View style={styles.tanzeemStatsRow}>
                  {[...PROGRAM_TANZEEM_OPTIONS, 'guest'].map((key) => (
                    <View key={key} style={[styles.tanzeemStatBox, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                      <Text style={[styles.tanzeemStatValue, { color: theme.text }]}>{key === 'guest' ? programGuestTotal : tanzeemProgramTotals[key]}</Text>
                      <Text style={[styles.tanzeemStatLabel, { color: theme.muted }]}>{key === 'guest' ? 'Gäste' : TANZEEM_LABELS[key]}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                <View style={styles.statsCardHeaderRow}>
                  <Text style={[styles.statsCardTitle, { color: theme.muted }]}>{`Anwesenheit nach ${hasGuestEntriesWithoutMajlis ? 'Jamaat' : 'Majlis'} (Programm)`}</Text>
                  <Pressable
                    onPress={() => setProgramMajlisFilter((prev) => {
                      const options = ['total', ...PROGRAM_TANZEEM_OPTIONS];
                      const idx = options.indexOf(prev);
                      return options[(idx + 1) % options.length];
                    })}
                    style={[styles.statsCardMiniSwitch, !isTablet && styles.statsCardMiniSwitchMobile, { borderColor: theme.border, backgroundColor: theme.bg }]}
                  >
                    <Text numberOfLines={1} style={[styles.statsCardMiniSwitchText, !isTablet && styles.statsCardMiniSwitchTextMobile, { color: theme.text }]}>{programMajlisFilter === 'total' ? 'Gesamt' : TANZEEM_LABELS[programMajlisFilter]}</Text>
                  </Pressable>
                </View>
                {programMajlisRows.length === 0 ? (
                  <Text style={[styles.noteText, { color: theme.muted }]}>Keine Programmdaten verfügbar</Text>
                ) : (
                  (() => {
                    const maxTop = Math.max(1, ...programMajlisRows.map((row) => Number(row.present) || 0));
                    return programMajlisRows.map((row) => (
                      <View key={row.majlis} style={styles.majlisBarRow}>
                        <Text style={[styles.majlisBarLabel, { color: theme.text }]} numberOfLines={1}>{row.majlis}</Text>
                        <View style={[styles.majlisBarTrack, { backgroundColor: theme.border }]}> 
                          <View style={[styles.majlisBarFill, { backgroundColor: theme.button, width: `${((Number(row.present) || 0) / maxTop) * 100}%` }]} />
                        </View>
                        <Text numberOfLines={1} style={[styles.majlisBarValue, { color: theme.text }]}>{`${row.present}/${row.total}`}</Text>
                      </View>
                    ));
                  })()
                )}
              </View>

              {effectivePermissions.canViewIdStats ? (
              <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Detaillierte ID-Übersicht</Text>
                <Pressable onPress={() => { setSelectedDetailedMember(null); setDetailedMemberLogs([]); setDetailedFlowTanzeem(''); setDetailedFlowMajlis(''); setDetailedIdSearchQuery(''); setDetailedIdOverviewVisible(true); }} style={[styles.statsDetailOpenBtn, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                  <Text style={[styles.statsDetailOpenBtnText, { color: theme.text }]}>Übersicht öffnen</Text>
                </Pressable>
              </View>
              ) : null}
              </>
            )}
          </>
        ) : isRegistrationStatsMode ? (
          !currentAccount ? (
            <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.noteText, { color: theme.muted }]}>Anmeldungsstatistik nur für eingeloggte Nutzer sichtbar.</Text>
            </View>
          ) : (
          <>
            <Pressable
              onPress={() => {
                if (!availableRegistrationStatsOptions.length) return;
                setProgramStatsPickerVisible(true);
              }}
              disabled={!availableRegistrationStatsOptions.length}
              style={[styles.statsCalendarBtn, { borderColor: theme.border, backgroundColor: theme.bg, opacity: availableRegistrationStatsOptions.length ? 1 : 0.6 }]}
            >
              <Text style={[styles.statsCalendarBtnText, { color: theme.text }]}>
                {selectedRegistrationStatsOption ? `Anmeldung auswählen · ${selectedRegistrationStatsOption.label}` : 'Anmeldung auswählen · Keine Daten'}
              </Text>
            </Pressable>
            {!selectedRegistrationStatsOption ? (
              <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.noteText, { color: theme.muted }]}>Keine Anmeldungsdaten verfügbar</Text>
              </View>
            ) : (
              <>
                <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Anmeldung</Text>
                  <Text style={[styles.statsBigValue, { color: theme.text }]}>{selectedRegistrationStatsOption.name}</Text>
                  <Text style={[styles.noteText, { color: theme.muted }]}>{`${selectedRegistrationStatsOption.startDate} bis ${selectedRegistrationStatsOption.endDate}`}</Text>
                </View>
                <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Zusagen</Text>
                  <Text style={[styles.statsBigValue, { color: theme.text }]}>{Number(registrationStats?.total) || 0}</Text>
                  <Text style={[styles.noteText, { color: theme.muted }]}>{`Absagen: ${Number(registrationStats?.declineTotal) || 0}`}</Text>
                </View>
                <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Tanzeem Aufteilung (Anmeldung)</Text>
                  <View style={styles.tanzeemStatsRow}>
                    {(selectedRegistrationStatsOption.advanced?.includeTanzeems || []).map((key) => (
                      <View key={key} style={[styles.tanzeemStatBox, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                        <Text style={[styles.tanzeemStatValue, { color: theme.text }]}>{Number(registrationStats?.byTanzeem?.[key]) || 0}</Text>
                        <Text style={[styles.tanzeemStatLabel, { color: theme.muted }]}>{TANZEEM_LABELS[key]}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.statsCardTitle, { color: theme.muted }]}>{`Zusagen nach ${hasGuestEntriesWithoutMajlis ? 'Jamaat' : 'Majlis'}`}</Text>
                  <View style={styles.statsToggleRow}>
                    <Pressable
                      onPress={() => setRegistrationMajlisFilter((prev) => {
                        const options = ['total', ...(selectedRegistrationStatsOption.advanced?.includeTanzeems || [])];
                        const idx = options.indexOf(prev);
                        return options[(idx + 1) % options.length];
                      })}
                      style={[styles.statsToggleBtn, { borderColor: theme.button, backgroundColor: theme.button }]}
                    >
                      <Text style={[styles.statsToggleBtnText, { color: theme.buttonText }]}>
                        {registrationMajlisFilter === 'total' ? 'Gesamt' : (TANZEEM_LABELS[registrationMajlisFilter] || registrationMajlisFilter)}
                      </Text>
                    </Pressable>
                  </View>
                  {(() => {
                    const filterKey = registrationMajlisFilter;
                    const allowedTanzeems = selectedRegistrationStatsOption.advanced?.includeTanzeems || [];
                    const onlyEhlVoters = !isGuestMode && Boolean(selectedRegistrationStatsOption.advanced?.onlyEhlVoters);
                    const includeAllAllowed = filterKey === 'total';
                    const registeredByMajlis = membersDirectory
                      .filter((entry) => shouldIncludeMemberInRegistrationBase(entry, allowedTanzeems, includeAllAllowed ? 'total' : filterKey, onlyEhlVoters))
                      .reduce((acc, entry) => {
                        const majlis = resolveExportMajlisLabel(entry?.majlis, entry?.amarat);
                        if (!majlis) return acc;
                        acc[majlis] = (acc[majlis] || 0) + 1;
                        return acc;
                      }, {});
                    const presentByMajlis = registrationAttendanceEntries
                      .filter((entry) => {
                        const responseType = String(entry?.registrationResponse || '').toLowerCase();
                        if (responseType === 'decline') return false;
                        const tanzeem = String(entry?.tanzeem || '').toLowerCase();
                        if (!allowedTanzeems.includes(tanzeem)) return false;
                        return includeAllAllowed ? true : tanzeem === filterKey;
                      })
                      .reduce((acc, entry) => {
                        const majlis = resolveExportMajlisLabel(entry?.majlis, entry?.amarat);
                        if (!majlis) return acc;
                        acc[majlis] = (acc[majlis] || 0) + 1;
                        return acc;
                      }, {});
                    const rows = Array.from(new Set([...Object.keys(registeredByMajlis), ...Object.keys(presentByMajlis)]))
                      .map((majlis) => ({
                        majlis,
                        label: formatMajlisName(majlis),
                        present: Number(presentByMajlis[majlis]) || 0,
                        total: Number(registeredByMajlis[majlis]) || 0,
                      }))
                      .sort((a, b) => (b.present - a.present) || a.label.localeCompare(b.label));
                    if (!rows.length) {
                      return <Text style={[styles.noteText, { color: theme.muted }]}>Keine Anmeldungsdaten verfügbar</Text>;
                    }
                    const maxTop = Math.max(1, ...rows.map((row) => Number(row.present) || 0));
                    return rows.map((row) => (
                      <View key={`${row.majlis}_${filterKey}`} style={styles.majlisBarRow}>
                        <Text style={[styles.majlisBarLabel, { color: theme.text }]} numberOfLines={1}>{row.label}</Text>
                        <View style={[styles.majlisBarTrack, { backgroundColor: theme.border }]}>
                          <View style={[styles.majlisBarFill, { backgroundColor: theme.button, width: `${((Number(row.present) || 0) / maxTop) * 100}%` }]} />
                        </View>
                        <Text numberOfLines={1} style={[styles.majlisBarValue, { color: theme.text }]}>{`${row.present}/${row.total}`}</Text>
                      </View>
                    ));
                  })()}
                </View>
                {effectivePermissions.canViewIdStats ? (
                  <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Detaillierte ID-Übersicht</Text>
                    <Pressable onPress={() => { setSelectedDetailedMember(null); setDetailedMemberLogs([]); setDetailedFlowTanzeem(''); setDetailedFlowMajlis(''); setDetailedIdSearchQuery(''); setDetailedIdOverviewVisible(true); }} style={[styles.statsDetailOpenBtn, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                      <Text style={[styles.statsDetailOpenBtnText, { color: theme.text }]}>Übersicht öffnen</Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            )}
          </>
          )
        ) : (
          <>
            {(() => {
                            const selectedDateSummary = buildUniqueSummary(activeDayAttendance);
              const buildTopMajlisBreakdown = (docs) => {
                const map = {};
                docs.forEach((attendance) => {
                  const byPrayer = attendance?.byPrayer || {};
                  Object.values(byPrayer).forEach((prayerNode) => {
                    const tanzeemMap = prayerNode?.tanzeem || {};
                    STATS_TANZEEM_KEYS.forEach((key) => {
                      const majlis = tanzeemMap[key]?.majlis || {};
                      Object.entries(majlis).forEach(([loc, count]) => {
                        if (!map[loc]) map[loc] = { total: 0, byTanzeem: { ansar: 0, khuddam: 0, atfal: 0 } };
                        const numericCount = Number(count) || 0;
                        map[loc].total += numericCount;
                        map[loc].byTanzeem[key] += numericCount;
                      });
                    });
                  });
                });
                return Object.entries(map)
                  .map(([locationKey, value]) => ({
                    locationKey,
                    total: Number(value.total) || 0,
                    byTanzeem: {
                      ansar: Number(value.byTanzeem.ansar) || 0,
                      khuddam: Number(value.byTanzeem.khuddam) || 0,
                      atfal: Number(value.byTanzeem.atfal) || 0,
                    },
                  }));
              };

              const selectedDateTopMajlis = buildTopMajlisBreakdown(activeDayAttendance ? [activeDayAttendance] : []);

              const buildSummaryForIsos = (isos) => isos.reduce((acc, iso) => {
                const oneDay = buildUniqueSummary(weeklyAttendanceDocs[iso]);
                acc.total += oneDay.total;
                acc.guestTotal += oneDay.guestTotal;
                acc.tanzeemTotals.ansar += oneDay.tanzeemTotals.ansar;
                acc.tanzeemTotals.khuddam += oneDay.tanzeemTotals.khuddam;
                acc.tanzeemTotals.atfal += oneDay.tanzeemTotals.atfal;
                return acc;
              }, { total: 0, guestTotal: 0, tanzeemTotals: { ansar: 0, khuddam: 0, atfal: 0 } });

              const buildTopMajlisForIsos = (isos) => buildTopMajlisBreakdown(isos.map((iso) => weeklyAttendanceDocs[iso]));

              const buildPrayerTotalsForIsos = (isos) => {
                const agg = {
                  fajr: { total: 0, tanzeemTotals: { ansar: 0, khuddam: 0, atfal: 0 } },
                  sohar: { total: 0, tanzeemTotals: { ansar: 0, khuddam: 0, atfal: 0 } },
                  asr: { total: 0, tanzeemTotals: { ansar: 0, khuddam: 0, atfal: 0 } },
                  maghrib: { total: 0, tanzeemTotals: { ansar: 0, khuddam: 0, atfal: 0 } },
                  ishaa: { total: 0, tanzeemTotals: { ansar: 0, khuddam: 0, atfal: 0 } },
                };
                isos.forEach((iso) => {
                  const rows = getPrayerCountsForStats(weeklyAttendanceDocs[iso]);
                  rows.forEach((row) => {
                    if (!agg[row.key]) return;
                    agg[row.key].total += Number(row.total) || 0;
                    agg[row.key].tanzeemTotals.ansar += Number(row.tanzeemTotals?.ansar) || 0;
                    agg[row.key].tanzeemTotals.khuddam += Number(row.tanzeemTotals?.khuddam) || 0;
                    agg[row.key].tanzeemTotals.atfal += Number(row.tanzeemTotals?.atfal) || 0;
                  });
                });
                return [
                  { key: 'fajr', label: 'Fajr (الفجر)', total: agg.fajr.total, tanzeemTotals: agg.fajr.tanzeemTotals },
                  { key: 'sohar', label: 'Sohar (الظهر)', total: agg.sohar.total, tanzeemTotals: agg.sohar.tanzeemTotals },
                  { key: 'asr', label: 'Asr (العصر)', total: agg.asr.total, tanzeemTotals: agg.asr.tanzeemTotals },
                  { key: 'maghrib', label: 'Maghrib (المغرب)', total: agg.maghrib.total, tanzeemTotals: agg.maghrib.tanzeemTotals },
                  { key: 'ishaa', label: 'Ishaa (العشاء)', total: agg.ishaa.total, tanzeemTotals: agg.ishaa.tanzeemTotals },
                ];
              };

              const getIsosForRange = (rangeMode) => {
                if (rangeMode === 'currentWeek') return statsWeekIsos;
                if (rangeMode === 'previousWeek') return statsRollingWeekIsos;
                return [selectedStatsDateISO];
              };

              const totalSource = statsTotalRange === 'selectedDate' ? selectedDateSummary : buildSummaryForIsos(getIsosForRange(statsTotalRange));
              const tanzeemSource = statsTanzeemRange === 'selectedDate' ? selectedDateSummary : buildSummaryForIsos(getIsosForRange(statsTanzeemRange));
              const topMajlisSource = statsMajlisRange === 'selectedDate' ? selectedDateTopMajlis : buildTopMajlisForIsos(getIsosForRange(statsMajlisRange));
              const topMajlisFilterLabel = statsMajlisTanzeemFilter === 'total' ? 'Gesamt' : TANZEEM_LABELS[statsMajlisTanzeemFilter];

              const todayPrayerBars = (() => {
                if (!activeDayAttendance?.byPrayer) return [];
                if (selectedStatsDateISO && selectedStatsDateISO !== todayISO) {
                  return getPrayerCountsForStats(activeDayAttendance).map((row) => ({
                    key: row.key,
                    label: `${row.label} (${row.key === 'fajr' ? 'الفجر' : row.key === 'sohar' ? 'الظهر' : row.key === 'asr' ? 'العصر' : row.key === 'maghrib' ? 'المغرب' : 'العشاء'})`,
                    total: row.total || 0,
                    tanzeemTotals: {
                      ansar: Number(row.tanzeemTotals?.ansar) || 0,
                      khuddam: Number(row.tanzeemTotals?.khuddam) || 0,
                      atfal: Number(row.tanzeemTotals?.atfal) || 0,
                    },
                  }));
                }
                const prayerRowsByKey = getPrayerCountsForStats(activeDayAttendance).reduce((acc, row) => {
                  acc[row.key] = row;
                  return acc;
                }, {});

                const getPrayerTotal = (prayerKey) => {

                  const prayer = activeDayAttendance.byPrayer?.[prayerKey] || {};
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

                return [
                  { key: 'fajr', label: 'Fajr (الفجر)', total: getPrayerTotal('fajr'), tanzeemTotals: prayerRowsByKey.fajr?.tanzeemTotals || { ansar: 0, khuddam: 0, atfal: 0 } },
                  ...(soharAsrMergedToday
                    ? [{ key: 'sohar_asr', label: 'Sohar/Asr (الظهر/العصر)', total: soharAsrCarryValue, tanzeemTotals: { ansar: 0, khuddam: 0, atfal: 0 } }]
                    : [
                      { key: 'sohar', label: 'Sohar (الظهر)', total: hasSoharAsrOverrideToday ? soharAsrCarryValue : soharTotalRaw, tanzeemTotals: prayerRowsByKey.sohar?.tanzeemTotals || { ansar: 0, khuddam: 0, atfal: 0 } },
                      { key: 'asr', label: 'Asr (العصر)', total: hasSoharAsrOverrideToday ? soharAsrCarryValue : asrTotalRaw, tanzeemTotals: prayerRowsByKey.asr?.tanzeemTotals || { ansar: 0, khuddam: 0, atfal: 0 } },
                    ]),
                  ...(maghribIshaaMergedToday
                    ? [{ key: 'maghrib_ishaa', label: 'Maghrib/Ishaa (المغرب/العشاء)', total: maghribIshaaCarryValue, tanzeemTotals: { ansar: 0, khuddam: 0, atfal: 0 } }]
                    : [
                      { key: 'maghrib', label: 'Maghrib (المغرب)', total: hasMaghribIshaaOverrideToday ? maghribIshaaCarryValue : maghribTotalRaw, tanzeemTotals: prayerRowsByKey.maghrib?.tanzeemTotals || { ansar: 0, khuddam: 0, atfal: 0 } },
                      { key: 'ishaa', label: 'Ishaa (العشاء)', total: hasMaghribIshaaOverrideToday ? maghribIshaaCarryValue : ishaaTotalRaw, tanzeemTotals: prayerRowsByKey.ishaa?.tanzeemTotals || { ansar: 0, khuddam: 0, atfal: 0 } },
                    ]),
                ];
              })();

              const prayerBars = statsPrayerRange === 'selectedDate' ? todayPrayerBars : buildPrayerTotalsForIsos(getIsosForRange(statsPrayerRange));
              const prayerLineLabels = prayerBars.map((item) => item.label.split(' (')[0]);
              const prayerSeriesLabel = statsPrayerSeries === 'total' ? 'Gesamt' : TANZEEM_LABELS[statsPrayerSeries];
              const prayerSeriesColorMap = {
                total: chartPalette.total,
                ansar: chartPalette.ansar,
                khuddam: chartPalette.khuddam,
                atfal: chartPalette.atfal,
              };
              const prayerLineSeries = [{
                key: 'prayerTotals',
                label: `Anzahl der Gebete nach Gebetszeiten · ${prayerSeriesLabel}`,
                color: prayerSeriesColorMap[statsPrayerSeries] || theme.button,
                thick: true,
                data: prayerBars.map((item) => (statsPrayerSeries === 'total' ? (Number(item.total) || 0) : (Number(item.tanzeemTotals?.[statsPrayerSeries]) || 0))),
              }];
              const prayerRangeValueLabel = statsPrayerRange === 'currentWeek'
                ? currentWeekLabel
                : (statsPrayerRange === 'previousWeek' ? 'Letzte Woche' : selectedStatsDateLabel);
              const prayerPointRows = prayerLineLabels.map((label, index) => ({ label, value: Number(prayerLineSeries[0]?.data?.[index]) || 0 }));
              const prayerSummary = prayerPointRows.length > 0 ? (() => {
                const highest = prayerPointRows.reduce((best, item) => (item.value > best.value ? item : best), prayerPointRows[0]);
                const lowest = prayerPointRows.reduce((worst, item) => (item.value < worst.value ? item : worst), prayerPointRows[0]);
                const averagePerPrayer = prayerPointRows.reduce((sum, item) => sum + item.value, 0) / Math.max(1, prayerPointRows.length);
                return { highest, lowest, averagePerPrayer };
              })() : null;
              const prayerCompareRange = statsPrayerRange === 'currentWeek' ? 'previousWeek' : (statsPrayerRange === 'previousWeek' ? 'currentWeek' : null);
              const comparePrayerBars = prayerCompareRange ? buildPrayerTotalsForIsos(getIsosForRange(prayerCompareRange)) : [];
              const comparePrayerValues = comparePrayerBars.map((item) => (statsPrayerSeries === 'total' ? (Number(item.total) || 0) : (Number(item.tanzeemTotals?.[statsPrayerSeries]) || 0)));
              const comparePrayerAverage = comparePrayerValues.reduce((sum, val) => sum + (Number(val) || 0), 0) / Math.max(1, comparePrayerValues.length || 1);
              const prayerTrendPercent = prayerSummary && prayerCompareRange && comparePrayerAverage > 0
                ? ((prayerSummary.averagePerPrayer - comparePrayerAverage) / comparePrayerAverage) * 100
                : null;

              return (
                <>
                  {(statsTotalRange === 'currentWeek' || statsTanzeemRange === 'currentWeek' || statsMajlisRange === 'currentWeek' || statsPrayerRange === 'currentWeek' || statsGraphRange === 'currentWeek') ? (
                    <Pressable onPress={() => setStatsWeekModalVisible(true)} style={[styles.statsCalendarBtn, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                      <Text style={[styles.statsCalendarBtnText, { color: theme.text }]}>{`KW auswählen · ${currentWeekLabel}`}</Text>
                    </Pressable>
                  ) : null}
                  {(statsTotalRange === 'selectedDate' || statsTanzeemRange === 'selectedDate' || statsMajlisRange === 'selectedDate' || statsPrayerRange === 'selectedDate' || statsGraphRange === 'selectedDate') ? (
                    <Pressable onPress={() => setStatsCalendarVisible(true)} style={[styles.statsCalendarBtn, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                      <Text style={[styles.statsCalendarBtnText, { color: theme.text }]}>Datum auswählen · {selectedStatsDateLabel}</Text>
                    </Pressable>
                  ) : null}
                  <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.statsCardHeaderRow}>
                      <View>
                        <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Gesamt Anwesende</Text>
                        <Text style={[styles.statsCardRangeInfo, { color: theme.muted }]}>{formatRangeLabel(statsTotalRange)}</Text>
                      </View>
                      <Pressable onPress={() => setStatsTotalRange(cycleStatsRangeMode)} style={[styles.statsCardMiniSwitch, !isTablet && styles.statsCardMiniSwitchMobile, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                        <Text numberOfLines={1} style={[styles.statsCardMiniSwitchText, !isTablet && styles.statsCardMiniSwitchTextMobile, { color: theme.text }]}>{getRangeToggleLabel(statsTotalRange)}</Text>
                      </Pressable>
                    </View>
                    <Text style={[styles.statsBigValue, { color: theme.text }]}>{totalSource.total}</Text>
                  </View>

                  <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.statsCardHeaderRow}>
                      <View>
                        <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Tanzeem Aufteilung</Text>
                        <Text style={[styles.statsCardRangeInfo, { color: theme.muted }]}>{formatRangeLabel(statsTanzeemRange)}</Text>
                      </View>
                      <Pressable onPress={() => setStatsTanzeemRange(cycleStatsRangeMode)} style={[styles.statsCardMiniSwitch, !isTablet && styles.statsCardMiniSwitchMobile, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                        <Text numberOfLines={1} style={[styles.statsCardMiniSwitchText, !isTablet && styles.statsCardMiniSwitchTextMobile, { color: theme.text }]}>{getRangeToggleLabel(statsTanzeemRange)}</Text>
                      </Pressable>
                    </View>
                    <View style={styles.tanzeemStatsRow}>
                      {['ansar', 'khuddam', 'atfal'].map((key) => (
                        <View key={key} style={[styles.tanzeemStatBox, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                          <Text style={[styles.tanzeemStatValue, { color: theme.text }]}>{tanzeemSource.tanzeemTotals[key] || 0}</Text>
                          <Text style={[styles.tanzeemStatLabel, { color: theme.muted }]}>{TANZEEM_LABELS[key]}</Text>
                        </View>
                      ))}
                      <View style={[styles.tanzeemStatBox, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                        <Text style={[styles.tanzeemStatValue, { color: theme.text }]}>{tanzeemSource.guestTotal || 0}</Text>
                        <Text style={[styles.tanzeemStatLabel, { color: theme.muted }]}>Gäste</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Anzahl der Gebete nach Gebetszeiten</Text>
                    <Text style={[styles.statsCardRangeInfo, { color: theme.muted }]}>{formatRangeLabel(statsPrayerRange)}</Text>
                    <View style={styles.statsToggleRow}>
                      <View style={[styles.statsCycler, { backgroundColor: theme.bg, borderColor: theme.border }]}> 
                        <Pressable
                          onPress={() => {
                            setStatsPrayerRange((prev) => {
                              const options = ['currentWeek', 'previousWeek', 'selectedDate'];
                              const idx = options.indexOf(prev);
                              return options[(idx - 1 + options.length) % options.length];
                            });
                            setStatsPrayerSeries('total');
                          }}
                          style={styles.statsCyclerArrowBtn}
                        >
                          <Text style={[styles.statsCyclerArrow, { color: theme.text }]}>{'<<'}</Text>
                        </Pressable>
                        <Text style={[styles.statsCyclerValue, { color: theme.text }]}>{prayerRangeValueLabel}</Text>
                        <Pressable
                          onPress={() => {
                            setStatsPrayerRange((prev) => {
                              const options = ['currentWeek', 'previousWeek', 'selectedDate'];
                              const idx = options.indexOf(prev);
                              return options[(idx + 1) % options.length];
                            });
                            setStatsPrayerSeries('total');
                          }}
                          style={styles.statsCyclerArrowBtn}
                        >
                          <Text style={[styles.statsCyclerArrow, { color: theme.text }]}>{'>>'}</Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.statsToggleRow}>
                      <View style={[styles.statsCycler, { backgroundColor: theme.bg, borderColor: theme.border }]}> 
                        <Pressable
                          onPress={() => setStatsPrayerSeries((prev) => {
                            const options = ['total', 'ansar', 'khuddam', 'atfal'];
                            const idx = options.indexOf(prev);
                            return options[(idx - 1 + options.length) % options.length];
                          })}
                          style={styles.statsCyclerArrowBtn}
                        >
                          <Text style={[styles.statsCyclerArrow, { color: theme.text }]}>{'<<'}</Text>
                        </Pressable>
                        <Text style={[styles.statsCyclerValue, { color: theme.text }]}>{prayerSeriesLabel}</Text>
                        <Pressable
                          onPress={() => setStatsPrayerSeries((prev) => {
                            const options = ['total', 'ansar', 'khuddam', 'atfal'];
                            const idx = options.indexOf(prev);
                            return options[(idx + 1) % options.length];
                          })}
                          style={styles.statsCyclerArrowBtn}
                        >
                          <Text style={[styles.statsCyclerArrow, { color: theme.text }]}>{'>>'}</Text>
                        </Pressable>
                      </View>
                    </View>
                    <MiniLineChart
                      labels={prayerLineLabels}
                      series={prayerLineSeries}
                      theme={theme}
                      isDarkMode={isDarkMode}
                      xAxisTitle="Gebete"
                      useEqualLabelSlots
                      pointLabelFormatter={({ label, value }) => `${label}, ${Number(value) || 0} Gebete`}
                    />
                    {prayerSummary ? (
                      <View style={styles.statsInsightWrap}>
                        <Text style={[styles.statsInsightText, { color: theme.text }]}>Durchschnitt pro Gebet ({prayerSeriesLabel}): {prayerSummary.averagePerPrayer.toFixed(1)}</Text>
                        <Text style={[styles.statsInsightText, { color: theme.text }]}>Höchstes Gebet ({prayerSeriesLabel}): {prayerSummary.highest.label} ({prayerSummary.highest.value})</Text>
                        <Text style={[styles.statsInsightText, { color: theme.text }]}>Niedrigstes Gebet ({prayerSeriesLabel}): {prayerSummary.lowest.label} ({prayerSummary.lowest.value})</Text>
                        {prayerTrendPercent !== null ? (
                          <Text style={[styles.statsInsightText, { color: theme.text }]}>Trend vs. {statsPrayerRange === 'currentWeek' ? 'letzte Woche' : 'aktuelle Woche'} ({prayerSeriesLabel}): {prayerTrendPercent >= 0 ? '+' : ''}{prayerTrendPercent.toFixed(1)}%</Text>
                        ) : null}
                      </View>
                    ) : null}
                    {prayerBars.length === 0 ? (
                      <Text style={[styles.noteText, { color: theme.muted }]}>Noch keine Anwesenheit für {statsPrayerRange === 'selectedDate' ? 'dieses Datum' : 'diesen Zeitraum'}</Text>
                    ) : null}
                  </View>

                  <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Anzahl der Gebete nach Tage</Text>
                    <View style={styles.statsToggleRow}>
                      <View style={[styles.statsCycler, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                        <Pressable
                          onPress={() => { setStatsGraphRange((prev) => { const options = ['currentWeek', 'previousWeek', 'selectedDate']; const idx = options.indexOf(prev); return options[(idx - 1 + options.length) % options.length]; }); setStatsGraphSeries('total'); }}
                          style={styles.statsCyclerArrowBtn}
                        >
                          <Text style={[styles.statsCyclerArrow, { color: theme.text }]}>{'<<'}</Text>
                        </Pressable>
                        <Text style={[styles.statsCyclerValue, { color: theme.text }]}>{statsGraphRange === 'currentWeek' ? currentWeekLabel : (statsGraphRange === 'previousWeek' ? 'Letzte Woche' : selectedStatsDateLabel)}</Text>
                        <Pressable
                          onPress={() => { setStatsGraphRange((prev) => { const options = ['currentWeek', 'previousWeek', 'selectedDate']; const idx = options.indexOf(prev); return options[(idx + 1) % options.length]; }); setStatsGraphSeries('total'); }}
                          style={styles.statsCyclerArrowBtn}
                        >
                          <Text style={[styles.statsCyclerArrow, { color: theme.text }]}>{'>>'}</Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.statsToggleRow}>
                      <View style={[styles.statsCycler, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                        <Pressable
                          onPress={() => setStatsGraphSeries((prev) => {
                            const options = ['total', 'ansar', 'khuddam', 'atfal'];
                            const idx = options.indexOf(prev);
                            return options[(idx - 1 + options.length) % options.length];
                          })}
                          style={styles.statsCyclerArrowBtn}
                        >
                          <Text style={[styles.statsCyclerArrow, { color: theme.text }]}>{'<<'}</Text>
                        </Pressable>
                        <Text style={[styles.statsCyclerValue, { color: theme.text }]}>{chartSeries[0]?.label || 'Gesamt'}</Text>
                        <Pressable
                          onPress={() => setStatsGraphSeries((prev) => {
                            const options = ['total', 'ansar', 'khuddam', 'atfal'];
                            const idx = options.indexOf(prev);
                            return options[(idx + 1) % options.length];
                          })}
                          style={styles.statsCyclerArrowBtn}
                        >
                          <Text style={[styles.statsCyclerArrow, { color: theme.text }]}>{'>>'}</Text>
                        </Pressable>
                      </View>
                    </View>

                    <MiniLineChart labels={chartLabels} series={chartSeries} theme={theme} isDarkMode={isDarkMode} xAxisTitle={chartXAxisTitle} />

                    {false && selectedDateSeriesSummary ? (
                      <View style={styles.statsInsightWrap}>
                        <Text style={[styles.statsInsightText, { color: theme.text }]}>Höchstes Gebet ({activeSeriesLabel}): {selectedDateSeriesSummary.highest.label} ({selectedDateSeriesSummary.highest.value})</Text>
                        <Text style={[styles.statsInsightText, { color: theme.text }]}>Schwächstes Gebet ({activeSeriesLabel}): {selectedDateSeriesSummary.lowest.label} ({selectedDateSeriesSummary.lowest.value})</Text>
                        <Text style={[styles.statsInsightText, { color: theme.text }]}>Durchschnitt pro Gebet ({activeSeriesLabel}): {selectedDateSeriesSummary.average.toFixed(1)}</Text>
                      </View>
                    ) : null}

                    {weekSeriesSummary ? (
                      <View style={styles.statsInsightWrap}>
                        <Text style={[styles.statsInsightText, { color: theme.text }]}>Durchschnitt pro Tag ({activeSeriesLabel}): {weekSeriesSummary.averagePerDay.toFixed(1)}</Text>
                        <Text style={[styles.statsInsightText, { color: theme.text }]}>Höchster Tag ({activeSeriesLabel}): {weekSeriesSummary.highest.label} ({weekSeriesSummary.highest.value})</Text>
                        <Text style={[styles.statsInsightText, { color: theme.text }]}>Niedrigster Tag ({activeSeriesLabel}): {weekSeriesSummary.lowest.label} ({weekSeriesSummary.lowest.value})</Text>
                        <Text style={[styles.statsInsightText, { color: theme.text }]}>Trend vs. vorherige 7 Tage ({activeSeriesLabel}): {weekSeriesSummary.trendPercent >= 0 ? '+' : ''}{weekSeriesSummary.trendPercent.toFixed(1)}%</Text>
                      </View>
                    ) : null}

                    {weeklyStatsLoading ? <Text style={[styles.noteText, { color: theme.muted }]}>Wochendaten werden aktualisiert…</Text> : null}
                  </View>

                  <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.statsCardHeaderRow}>
                      <View>
                        <Text style={[styles.statsCardTitle, { color: theme.muted }]}>{`Anzahl der Gebete nach ${hasGuestEntriesWithoutMajlis ? 'Jamaat' : 'Majlis'}`}</Text>
                        <Text style={[styles.statsCardRangeInfo, { color: theme.muted }]}>{formatRangeLabel(statsMajlisRange)}</Text>
                      </View>
                    </View>
                    <View style={styles.statsToggleRow}>
                      <View style={[styles.statsCycler, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                        <Pressable
                          onPress={() => {
                            setStatsMajlisRange((prev) => {
                              const options = ['currentWeek', 'previousWeek', 'selectedDate'];
                              const idx = options.indexOf(prev);
                              return options[(idx - 1 + options.length) % options.length];
                            });
                            setStatsMajlisShowAll(false);
                          }}
                          style={styles.statsCyclerArrowBtn}
                        >
                          <Text style={[styles.statsCyclerArrow, { color: theme.text }]}>{'<<'}</Text>
                        </Pressable>
                        <Text style={[styles.statsCyclerValue, { color: theme.text }]}>{statsMajlisRange === 'currentWeek' ? currentWeekLabel : (statsMajlisRange === 'previousWeek' ? 'Letzte Woche' : selectedStatsDateLabel)}</Text>
                        <Pressable
                          onPress={() => {
                            setStatsMajlisRange((prev) => {
                              const options = ['currentWeek', 'previousWeek', 'selectedDate'];
                              const idx = options.indexOf(prev);
                              return options[(idx + 1) % options.length];
                            });
                            setStatsMajlisShowAll(false);
                          }}
                          style={styles.statsCyclerArrowBtn}
                        >
                          <Text style={[styles.statsCyclerArrow, { color: theme.text }]}>{'>>'}</Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.statsToggleRow}>
                      <View style={[styles.statsCycler, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                        <Pressable
                          onPress={() => {
                            setStatsMajlisTanzeemFilter((prev) => {
                              const options = ['total', 'ansar', 'khuddam', 'atfal'];
                              const idx = options.indexOf(prev);
                              return options[(idx - 1 + options.length) % options.length];
                            });
                            setStatsMajlisShowAll(false);
                          }}
                          style={styles.statsCyclerArrowBtn}
                        >
                          <Text style={[styles.statsCyclerArrow, { color: theme.text }]}>{'<<'}</Text>
                        </Pressable>
                        <Text style={[styles.statsCyclerValue, { color: theme.text }]}>{topMajlisFilterLabel}</Text>
                        <Pressable
                          onPress={() => {
                            setStatsMajlisTanzeemFilter((prev) => {
                              const options = ['total', 'ansar', 'khuddam', 'atfal'];
                              const idx = options.indexOf(prev);
                              return options[(idx + 1) % options.length];
                            });
                            setStatsMajlisShowAll(false);
                          }}
                          style={styles.statsCyclerArrowBtn}
                        >
                          <Text style={[styles.statsCyclerArrow, { color: theme.text }]}>{'>>'}</Text>
                        </Pressable>
                      </View>
                    </View>
                    {topMajlisSource.length === 0 ? (
                      <Text style={[styles.noteText, { color: theme.muted }]}>Noch keine Anwesenheit für {statsMajlisRange === 'selectedDate' ? 'dieses Datum' : 'diesen Zeitraum'}</Text>
                    ) : (
                      (() => {
                        const getMajlisCount = (row) => {
                          if (statsMajlisTanzeemFilter === 'total') return Number(row.total) || 0;
                          return Number(row.byTanzeem?.[statsMajlisTanzeemFilter]) || 0;
                        };
                        const sortedRows = [...topMajlisSource]
                          .map((row) => ({ ...row, currentCount: getMajlisCount(row) }))
                          .sort((a, b) => b.currentCount - a.currentCount || String(a.locationKey).localeCompare(String(b.locationKey)));
                        const visibleRows = statsMajlisShowAll ? sortedRows : sortedRows.slice(0, 10);
                        const maxTop = Math.max(1, ...visibleRows.map((row) => row.currentCount));
                        return (
                          <>
                            {visibleRows.map((row) => {
                              const count = row.currentCount;
                              return (
                                <View key={row.locationKey} style={styles.majlisBarRow}>
                                  <Text style={[styles.majlisBarLabel, { color: theme.text }]} numberOfLines={1}>{formatMajlisName(row.locationKey)}</Text>
                                  <View style={[styles.majlisBarTrack, { backgroundColor: theme.border }]}>
                                    <View style={[styles.majlisBarFill, { backgroundColor: theme.button, width: `${(count / maxTop) * 100}%` }]} />
                                  </View>
                                  <Text style={[styles.majlisBarValue, { color: theme.text }]}>{count}</Text>
                                </View>
                              );
                            })}
                            {sortedRows.length > 10 ? (
                              <Pressable
                                onPress={() => setStatsMajlisShowAll((prev) => !prev)}
                                style={[styles.statsDetailOpenBtn, { borderColor: theme.border, backgroundColor: theme.bg, marginTop: 10 }]}
                              >
                                <Text style={[styles.statsDetailOpenBtnText, { color: theme.text }]}>{statsMajlisShowAll ? 'Weniger anzeigen' : `Mehr anzeigen (${sortedRows.length - 10} weitere)`}</Text>
                              </Pressable>
                            ) : null}
                          </>
                        );
                      })()
                    )}
                  </View>

                  {currentAccount ? (
                  <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Wochen Ranking (Gebete)</Text>
                    <Text style={[styles.statsCardRangeInfo, { color: theme.muted }]}>{formatRangeLabel(statsWeekRankingRange)}</Text>
                    <View style={styles.statsToggleRow}>
                      <View style={[styles.statsCycler, { backgroundColor: theme.bg, borderColor: theme.border }]}> 
                        <Pressable
                          onPress={() => setStatsWeekRankingRange((prev) => (prev === 'currentWeek' ? 'previousWeek' : 'currentWeek'))}
                          style={styles.statsCyclerArrowBtn}
                        >
                          <Text style={[styles.statsCyclerArrow, { color: theme.text }]}>{'<<'}</Text>
                        </Pressable>
                        <Text style={[styles.statsCyclerValue, { color: theme.text }]}>{statsWeekRankingRange === 'currentWeek' ? currentWeekLabel : 'Letzte Woche'}</Text>
                        <Pressable
                          onPress={() => setStatsWeekRankingRange((prev) => (prev === 'currentWeek' ? 'previousWeek' : 'currentWeek'))}
                          style={styles.statsCyclerArrowBtn}
                        >
                          <Text style={[styles.statsCyclerArrow, { color: theme.text }]}>{'>>'}</Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.statsToggleRow}>
                      <View style={[styles.statsCycler, { backgroundColor: theme.bg, borderColor: theme.border }]}> 
                        <Pressable
                          onPress={() => setStatsWeekRankingFilter((prev) => {
                            const options = ['total', 'ansar', 'khuddam', 'atfal'];
                            const idx = options.indexOf(prev);
                            return options[(idx - 1 + options.length) % options.length];
                          })}
                          style={styles.statsCyclerArrowBtn}
                        >
                          <Text style={[styles.statsCyclerArrow, { color: theme.text }]}>{'<<'}</Text>
                        </Pressable>
                        <Text style={[styles.statsCyclerValue, { color: theme.text }]}>{statsWeekRankingFilter === 'total' ? 'Gesamt' : TANZEEM_LABELS[statsWeekRankingFilter]}</Text>
                        <Pressable
                          onPress={() => setStatsWeekRankingFilter((prev) => {
                            const options = ['total', 'ansar', 'khuddam', 'atfal'];
                            const idx = options.indexOf(prev);
                            return options[(idx + 1) % options.length];
                          })}
                          style={styles.statsCyclerArrowBtn}
                        >
                          <Text style={[styles.statsCyclerArrow, { color: theme.text }]}>{'>>'}</Text>
                        </Pressable>
                      </View>
                    </View>
                    {weekRankingRows.length === 0 ? (
                      <Text style={[styles.noteText, { color: theme.muted }]}>Keine Daten für diesen Zeitraum</Text>
                    ) : (() => {
                      const maxRankCount = Math.max(1, ...weekRankingRows.map((row) => row.count || 0));
                      let currentRank = 0;
                      let previousCount = null;
                      return weekRankingRows.map((row) => {
                        const tanzeemLabel = TANZEEM_LABELS[row.tanzeem] || (row.tanzeem ? row.tanzeem.charAt(0).toUpperCase() + row.tanzeem.slice(1) : '—');
                        const majlisLabel = resolveExportMajlisLabel(row.majlis);
                        const descriptor = statsWeekRankingFilter === 'total'
                          ? `${row.idNumber} (${tanzeemLabel} · ${majlisLabel})`
                          : `${row.idNumber} (${majlisLabel})`;
                        if (previousCount !== row.count) {
                          currentRank += 1;
                          previousCount = row.count;
                        }
                        return (
                          <View key={`${row.idNumber}_${row.count}`} style={styles.barRow}>
                            <Text style={[styles.statsRankingBarLabel, { color: theme.text }]} numberOfLines={1}>{`${currentRank}. ${descriptor}`}</Text>
                            <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                              <View style={[styles.barFill, { backgroundColor: theme.button, width: `${((row.count || 0) / maxRankCount) * 100}%` }]} />
                            </View>
                            <Text style={[styles.barValue, { color: theme.text }]}>{row.count}</Text>
                          </View>
                        );
                      });
                    })()}
                  </View>
                  ) : null}

                  {effectivePermissions.canViewIdStats ? (
                  <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                    <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Detaillierte ID-Übersicht</Text>
                    <Pressable onPress={() => { setSelectedDetailedMember(null); setDetailedMemberLogs([]); setDetailedFlowTanzeem(''); setDetailedFlowMajlis(''); setDetailedIdSearchQuery(''); setDetailedIdOverviewVisible(true); }} style={[styles.statsDetailOpenBtn, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                      <Text style={[styles.statsDetailOpenBtnText, { color: theme.text }]}>Übersicht öffnen</Text>
                    </Pressable>
                  </View>
                  ) : null}
                </>
              );
            })()}
          </>
        )}
      </ScrollView>
    );
  };

  const renderSettings = () => {
    const settingsDate = germanDateLong(overrideDisplayDate);
    const programSettingsDate = germanDateLong(now);
    const mosqueOptionsForSelection = isGuestMode
      ? MOSQUE_OPTIONS.filter((option) => option.key === EXTERNAL_MOSQUE_KEY)
      : MOSQUE_OPTIONS.filter((option) => option.key !== EXTERNAL_MOSQUE_KEY);
    if (false && isGuestMode) {
      return (
        <ScrollView contentContainerStyle={contentContainerStyle} showsVerticalScrollIndicator={false}>
          <View style={[styles.settingsMosqueHighlightCard, { backgroundColor: theme.chipBg, borderColor: theme.rowActiveBorder }]}>
            <Text style={[styles.settingsMosqueHighlightTitle, { color: theme.chipText }]}>Externe Moschee</Text>
            <Text style={[styles.settingsMosqueHighlightValue, { color: theme.chipText }]}>{guestActivation?.mosqueName || 'Nicht gesetzt'}</Text>
          </View>
          <View style={[styles.settingsHeroCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.settingsHeroTitle, { color: theme.text }]}>Local Amarat / Moschee</Text>
            <TextInput value={externalMosqueNameInput} onChangeText={setExternalMosqueNameInput} placeholder="z. B. Hamburg" placeholderTextColor={theme.muted} autoCapitalize="words" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
            <Pressable
              style={({ pressed }) => [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor: theme.button, opacity: externalConfigSaving ? 0.7 : 1 }], pressed && styles.buttonPressed]}
              disabled={externalConfigSaving}
              onPress={async () => {
                const cleanName = String(externalMosqueNameInput || '').trim();
                if (!cleanName) { setToast('Bitte zuerst die Local Amarat speichern.'); return; }
                const scopeKey = normalizeExternalScopeKey(cleanName);
                const accountNameKey = currentAccount?.nameKey || normalizeAccountNameKey(currentAccount?.name || '') || scopeKey;
                const nextActivation = {
                  accountNameKey,
                  mosqueName: cleanName,
                  scopeKey,
                  multipleMajalis: currentAccount?.externalMultipleMajalis !== false,
                  showNames: Boolean(currentAccount?.externalShowNames),
                };
                try {
                  setExternalConfigSaving(true);
                  await AsyncStorage.setItem(STORAGE_KEYS.guestActivation, JSON.stringify(nextActivation));
                  setGuestActivation(nextActivation);
                  await setGlobalDocData(EXTERNAL_CONFIG_COLLECTION, `${nextActivation.accountNameKey}`, {
                    ...nextActivation,
                    updatedAt: new Date().toISOString(),
                  }).catch(() => {});
                  if (currentAccount?.nameKey) {
                    await setGlobalDocData(ADMIN_EXTERNAL_ACCOUNTS_COLLECTION, currentAccount.nameKey, {
                      ...buildExternalAccountWritePayload(currentAccount),
                      externalMosqueName: cleanName,
                      updatedAt: new Date().toISOString(),
                    }).catch(() => {});
                  }
                  setToast('Externe Moschee gespeichert ✓');
                } finally {
                  setExternalConfigSaving(false);
                }
              }}
            >
              <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.buttonText }]}>{externalConfigSaving ? 'Speichert…' : 'Speichern'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      );
    }

    return (
    <ScrollView contentContainerStyle={contentContainerStyle} showsVerticalScrollIndicator={false}>
      {!isGuestMode ? (
        <View style={[styles.settingsMosqueHighlightCard, { backgroundColor: theme.chipBg, borderColor: theme.rowActiveBorder }]}> 
          <Text style={[styles.settingsMosqueHighlightTitle, { color: theme.chipText }]}>Aktive Moschee</Text>
          <Text style={[styles.settingsMosqueHighlightValue, { color: theme.chipText }]}>{activeMosque.label}</Text>
        </View>
      ) : null}

      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}> 
        <View style={styles.switchRow}><Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, { color: theme.text }]}>Dark Mode</Text><Switch value={isDarkMode} onValueChange={onToggleDarkMode} /></View>
      </View>

      {!isGuestMode ? (
      <View style={[styles.section, styles.activeMosqueSection, { backgroundColor: theme.card, borderColor: theme.border }]}> 
        <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, styles.activeMosqueSectionTitle, { color: theme.text }]}>Aktive Moschee</Text>
        <Text style={[styles.noteText, styles.activeMosqueSectionCurrent, { color: theme.muted }]}>{activeMosque.label}</Text>
        <View style={[styles.statsToggleRow, styles.activeMosqueToggleRow]}>
          {mosqueOptionsForSelection.map((option) => {
            const isActive = activeMosqueKey === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => onSelectMosque(option.key)}
                style={[styles.statsToggleBtn, { borderColor: isActive ? theme.button : theme.border, backgroundColor: isActive ? theme.button : theme.bg }]}
              >
                <Text style={[styles.statsToggleBtnText, { color: isActive ? theme.buttonText : theme.text }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {canPersistMosquePreference ? (
          <Pressable
            style={({ pressed }) => [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor: theme.button, opacity: mosquePreferenceSaving ? 0.7 : 1 }], pressed && styles.buttonPressed]}
            onPress={saveMosquePreference}
            disabled={mosquePreferenceSaving}
          >
            <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.buttonText }]}>{mosquePreferenceSaving ? 'Speichert…' : 'Speichern'}</Text>
          </Pressable>
        ) : null}
      </View>
      ) : null}

      {normalizedAppMode === 'full' ? (
        <View style={[styles.settingsHeroCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.settingsHeroTitle, { color: theme.text }]}>Kiosk Inactivity Reset</Text>
          <Text style={[styles.settingsHeroMeta, { color: theme.muted }]}>Automatischer Rücksprung zur Anwesenheit bei Inaktivität.</Text>

          <View style={styles.mergeSwitchWrap}>
            <Text style={[styles.mergeSwitchLabel, { color: theme.text }]}>Funktion aktivieren</Text>
            <Switch value={terminalInactivityEnabledInput} onValueChange={setTerminalInactivityEnabledInput} />
          </View>

          <View style={styles.mergeInputWrap}>
            <TextInput
              value={terminalInactivityTimeoutInput}
              onChangeText={(value) => setTerminalInactivityTimeoutInput(String(value || '').replace(/[^0-9]/g, ''))}
              placeholder="Timeout in Sekunden (mind. 15)"
              placeholderTextColor={theme.muted}
              keyboardType="number-pad"
              inputMode="numeric"
              autoCapitalize="none"
              style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
            />
          </View>

          <View style={styles.statsToggleRow}>
            <Pressable
              onPress={() => setTerminalInactivityScopeInput('global')}
              style={[styles.statsToggleBtn, { borderColor: terminalInactivityScopeInput === 'global' ? theme.button : theme.border, backgroundColor: terminalInactivityScopeInput === 'global' ? theme.button : theme.bg }]}
            >
              <Text style={[styles.statsToggleBtnText, { color: terminalInactivityScopeInput === 'global' ? theme.buttonText : theme.text }]}>Global</Text>
            </Pressable>
            <Pressable
              onPress={() => setTerminalInactivityScopeInput('device')}
              style={[styles.statsToggleBtn, { borderColor: terminalInactivityScopeInput === 'device' ? theme.button : theme.border, backgroundColor: terminalInactivityScopeInput === 'device' ? theme.button : theme.bg }]}
            >
              <Text style={[styles.statsToggleBtnText, { color: terminalInactivityScopeInput === 'device' ? theme.buttonText : theme.text }]}>Nur dieses Gerät</Text>
            </Pressable>
          </View>

          <Text style={[styles.noteText, { color: theme.muted }]}>Aktiv nur bei offenem Gebets-/Programmfenster und wenn niemand eingeloggt ist.</Text>

          <Pressable
            style={({ pressed }) => [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor: theme.button, opacity: terminalInactivitySaving ? 0.7 : 1 }], pressed && styles.buttonPressed]}
            disabled={terminalInactivitySaving}
            onPress={saveTerminalInactivityConfig}
          >
            <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.buttonText }]}>{terminalInactivitySaving ? 'Speichert…' : 'Speichern'}</Text>
          </Pressable>
        </View>
      ) : null}

      {isGuestMode ? (
        <View style={[styles.settingsHeroCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.settingsHeroTitle, { color: theme.text }]}>Local Amarat / Moschee</Text>
          <Text style={[styles.settingsHeroMeta, { color: theme.muted }]}>Pflichtfeld für externen Modus</Text>
          <TextInput value={externalMosqueNameInput} onChangeText={setExternalMosqueNameInput} placeholder="z. B. Hamburg" placeholderTextColor={theme.muted} autoCapitalize="words" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <Pressable
            style={({ pressed }) => [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor: theme.button, opacity: externalConfigSaving ? 0.7 : 1 }], pressed && styles.buttonPressed]}
            disabled={externalConfigSaving}
            onPress={async () => {
              const cleanName = String(externalMosqueNameInput || '').trim();
              if (!cleanName) { setToast('Bitte zuerst die Local Amarat speichern.'); return; }
              const scopeKey = normalizeExternalScopeKey(cleanName);
              const accountNameKey = currentAccount?.nameKey || normalizeAccountNameKey(currentAccount?.name || '') || scopeKey;
              const nextActivation = {
                accountNameKey,
                mosqueName: cleanName,
                scopeKey,
                multipleMajalis: currentAccount?.externalMultipleMajalis !== false,
                showNames: Boolean(currentAccount?.externalShowNames),
              };
              try {
                setExternalConfigSaving(true);
                await AsyncStorage.setItem(STORAGE_KEYS.guestActivation, JSON.stringify(nextActivation));
                setGuestActivation(nextActivation);
                await setGlobalDocData(EXTERNAL_CONFIG_COLLECTION, `${nextActivation.accountNameKey}`, {
                  ...nextActivation,
                  updatedAt: new Date().toISOString(),
                }).catch(() => {});
                if (currentAccount?.nameKey) {
                  await setGlobalDocData(ADMIN_EXTERNAL_ACCOUNTS_COLLECTION, currentAccount.nameKey, {
                    ...buildExternalAccountWritePayload(currentAccount),
                    externalMosqueName: cleanName,
                    updatedAt: new Date().toISOString(),
                  }).catch(() => {});
                }
                setToast('Externe Moschee gespeichert ✓');
              } finally {
                setExternalConfigSaving(false);
              }
            }}
          >
            <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.buttonText }]}>{externalConfigSaving ? 'Speichert…' : 'Speichern'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor: '#B91C1C', opacity: externalConfigSaving ? 0.7 : 1 }], pressed && styles.buttonPressed]}
            disabled={externalConfigSaving}
            onPress={resetGuestScopeData}
          >
            <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: '#FFFFFF' }]}>Zurücksetzen & Daten löschen</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.settingsHeroCard, { backgroundColor: theme.card }]}> 
        <Text style={[styles.settingsHeroTitle, { color: theme.text }]}>Ankündigung</Text>
        <Text style={[styles.settingsHeroMeta, { color: theme.muted }]}>Optionaler Freitext für den Bereich „Gebetszeiten“</Text>
        <TextInput
          value={announcementInput}
          onChangeText={setAnnouncementInput}
          placeholder="z. B. Nach *Isha* findet ein Janazah-Gebet statt."
          placeholderTextColor={theme.muted}
          multiline
          textAlignVertical="top"
          autoCapitalize="sentences"
          style={[styles.announcementInput, isTablet && styles.announcementInputTablet, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
        />
        <Text style={[styles.noteText, { color: theme.muted }]}>Formatierung: *fett* · _kursiv_ · ~durchgestrichen~</Text>
        <View style={[styles.announcementActions, isTablet && styles.announcementActionsTablet]}>
          <Pressable style={({ pressed }) => [[styles.saveBtn, styles.announcementActionBtn, { backgroundColor: theme.button }], pressed && styles.buttonPressed]} onPress={saveAnnouncement}>
            <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.buttonText }]}>Speichern</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [[styles.saveBtn, styles.announcementActionBtn, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }], pressed && styles.buttonPressed]} onPress={clearAnnouncement}>
            <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.text }]}>Leeren</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.settingsHeroCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.settingsHeroTitle, { color: theme.text }]}>Gebetszeiten zusammenlegen</Text>
        <Pressable onPress={onOverrideMetaPress}>
          <Text style={[styles.settingsHeroMeta, { color: theme.muted }]}>{`${settingsDate} · ${activeMosque.label}`}</Text>
        </Pressable>

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
          <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.buttonText }]}>{overrideSaving ? 'Speichert…' : 'Speichern'}</Text>
        </Pressable>
      </View>


      <View style={[styles.settingsHeroCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.settingsHeroTitle, { color: theme.text }]}>Gebetszeiten anpassen</Text>
        <Pressable onPress={onOverrideMetaPress}>
          <Text style={[styles.settingsHeroMeta, { color: theme.muted }]}>{`${settingsDate} · ${activeMosque.label}`}</Text>
        </Pressable>

        <View style={styles.mergeInputWrap}>
          <TextInput value={manualFajrTime} onChangeText={setManualFajrTime} placeholder="Fajr (HH:MM)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={manualSoharTime} onChangeText={setManualSoharTime} placeholder="Sohar (HH:MM)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={manualAsrTime} onChangeText={setManualAsrTime} placeholder="Asr (HH:MM)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={manualMaghribTime} onChangeText={setManualMaghribTime} placeholder="Maghrib (HH:MM)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={manualIshaaTime} onChangeText={setManualIshaaTime} placeholder="Ishaa (HH:MM)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
        </View>

        <Pressable style={({ pressed }) => [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor: theme.button, opacity: overrideSaving ? 0.6 : 1 }], pressed && styles.buttonPressed]} disabled={overrideSaving} onPress={saveManualPrayerTimes}>
          <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.buttonText }]}>{overrideSaving ? 'Speichert…' : 'Speichern'}</Text>
        </Pressable>
      </View>

      <View style={[styles.settingsHeroCard, { backgroundColor: theme.card }]}> 
        <Text style={[styles.settingsHeroTitle, { color: theme.text }]}>Programme</Text>
        <Text style={[styles.settingsHeroMeta, { color: theme.muted }]}>{programSettingsDate} · Heute</Text>

        <View style={styles.mergeInputWrap}>
          <TextInput value={programNameInput} onChangeText={setProgramNameInput} placeholder="Haupttitel / Name (z. B. Wahl 2026)" placeholderTextColor={theme.muted} autoCapitalize="sentences" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={programSubtitleInput} onChangeText={setProgramSubtitleInput} placeholder="Untertitel (optional)" placeholderTextColor={theme.muted} autoCapitalize="sentences" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={programExtraLineInput} onChangeText={setProgramExtraLineInput} placeholder="Zusatzzeile (optional)" placeholderTextColor={theme.muted} autoCapitalize="sentences" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={programStartInput} onChangeText={setProgramStartInput} placeholder="Programmanfang (HH:MM)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
        </View>
        <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>Formatierung: *fett* · _kursiv_ · ~durchgestrichen~</Text>

        <Pressable style={({ pressed }) => [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor: theme.button }], pressed && styles.buttonPressed]} onPress={saveProgramForToday}>
          <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.buttonText }]}>Programm speichern</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }], pressed && styles.buttonPressed]} onPress={clearProgramForToday}>
          <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.text }]}>Programm deaktivieren</Text>
        </Pressable>
      </View>

      <View style={[styles.settingsHeroCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.settingsHeroTitle, { color: theme.text }]}>Anmeldung</Text>
        <View style={styles.mergeInputWrap}>
          <TextInput value={registrationNameInput} onChangeText={setRegistrationNameInput} placeholder="Haupttitel / Name (z. B. Wahl 2026)" placeholderTextColor={theme.muted} autoCapitalize="sentences" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={registrationSubtitleInput} onChangeText={setRegistrationSubtitleInput} placeholder="Untertitel (optional)" placeholderTextColor={theme.muted} autoCapitalize="sentences" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={registrationExtraLineInput} onChangeText={setRegistrationExtraLineInput} placeholder="Zusatzzeile (optional)" placeholderTextColor={theme.muted} autoCapitalize="sentences" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={registrationStartDateInput} onChangeText={setRegistrationStartDateInput} placeholder="Von (TT.MM)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={registrationEndDateInput} onChangeText={setRegistrationEndDateInput} placeholder="Bis (TT.MM)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
        </View>
        <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>Formatierung: *fett* · _kursiv_ · ~durchgestrichen~</Text>
        <Pressable style={({ pressed }) => [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }], pressed && styles.buttonPressed]} onPress={clearRegistrationConfig}>
          <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.text }]}>Anmeldung deaktivieren</Text>
        </Pressable>
        {isRegistrationAdvancedVisible ? (
          <>
            <View style={styles.mergeSwitchWrap}>
              <Text style={[styles.mergeSwitchLabel, { color: theme.text }]}>Öffentlich anzeigen</Text>
              <Switch value={registrationIsPublicInput} onValueChange={setRegistrationIsPublicInput} />
            </View>
            {!isGuestMode ? (
              <View style={styles.mergeSwitchWrap}>
                <Text style={[styles.mergeSwitchLabel, { color: theme.text }]}>Nur Ehl-Voters</Text>
                <Switch value={registrationOnlyEhlVotersInput} onValueChange={setRegistrationOnlyEhlVotersInput} />
              </View>
            ) : null}
            {isGuestMode ? (
              <View style={styles.mergeSwitchWrap}>
                <Text style={[styles.mergeSwitchLabel, { color: theme.text }]}>Abmeldung erlauben</Text>
                <Switch value={registrationAllowDeclineInput} onValueChange={setRegistrationAllowDeclineInput} />
              </View>
            ) : null}
            {!isGuestMode ? (
              <View style={styles.mergeSwitchWrap}>
                <Text style={[styles.mergeSwitchLabel, { color: theme.text }]}>Login aktivieren</Text>
                <Switch value={registrationLoginEnabledInput} onValueChange={setRegistrationLoginEnabledInput} />
              </View>
            ) : null}
            <Text style={[styles.noteText, { color: theme.muted }]}>Berücksichtigte Tanzeem auswählen</Text>
            <View style={styles.statsToggleRow}>
              {REGISTRATION_TANZEEM_OPTIONS.map((key) => {
                const isActive = registrationIncludedTanzeemsInput.includes(key);
                return (
                  <Pressable
                    key={`registration_tanzeem_${key}`}
                    onPress={() => setRegistrationIncludedTanzeemsInput((prev) => {
                      if (prev.includes(key)) return prev.length > 1 ? prev.filter((entry) => entry !== key) : prev;
                      return [...prev, key];
                    })}
                    style={[styles.statsToggleBtn, { borderColor: isActive ? theme.button : theme.border, backgroundColor: isActive ? theme.button : theme.bg }]}
                  >
                    <Text style={[styles.statsToggleBtnText, { color: isActive ? theme.buttonText : theme.text }]}>{TANZEEM_LABELS[key]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
        <Pressable style={({ pressed }) => [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor: theme.button }], pressed && styles.buttonPressed]} onPress={saveRegistrationConfig}>
          <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.buttonText }]}>Anmeldung speichern</Text>
        </Pressable>
        <Pressable onPress={() => setRegistrationAdvancedVisible((prev) => !prev)} style={[styles.privacyNoticeLinkWrap, { alignSelf: 'center', marginTop: 6 }]}>
          <Text style={[styles.privacyNoticeLinkText, { color: isDarkMode ? 'rgba(209, 213, 219, 0.84)' : 'rgba(55, 65, 81, 0.84)' }]}>Erweiterte Einstellungen</Text>
        </Pressable>
      </View>


      {currentAccount ? (
        <View style={[styles.settingsHeroCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.settingsHeroTitle, { color: theme.text }]}>Account</Text>
          <Text style={[styles.settingsHeroMeta, { color: theme.muted }]}>{`${currentAccount.name} · ${isSuperAdmin ? 'Super-Admin' : activeMosque.label}`}</Text>
          <View style={styles.mergeInputWrap}>
            <TextInput value={passwordChangeInput} onChangeText={setPasswordChangeInput} placeholder="Neues Passwort" placeholderTextColor={theme.muted} autoCapitalize="none" secureTextEntry style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          </View>
          <Pressable style={({ pressed }) => [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor: theme.button }], pressed && styles.buttonPressed]} onPress={changeOwnPassword}>
            <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.buttonText }]}>Passwort ändern</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }], pressed && styles.buttonPressed]} onPress={logoutAccount}>
            <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.text }]}>Logout</Text>
          </Pressable>
        </View>
      ) : null}

      {isSuperAdmin ? (
        <View style={[styles.settingsHeroCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.settingsHeroTitle, { color: theme.text }]}>Accountverwaltung</Text>
          <View style={styles.mergeInputWrap}>
            <TextInput value={adminManageName} onChangeText={setAdminManageName} placeholder="Name (Login)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
            <TextInput value={adminManagePassword} onChangeText={setAdminManagePassword} placeholder="Passwort" placeholderTextColor={theme.muted} secureTextEntry autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          </View>
          <View style={styles.statsToggleRow}>
            {MOSQUE_OPTIONS.map((mosque) => (
              <Pressable
                key={mosque.key}
                onPress={() => setAdminManageMosqueKeys((prev) => {
                  if (mosque.key === EXTERNAL_MOSQUE_KEY) {
                    return prev.includes(EXTERNAL_MOSQUE_KEY) ? [DEFAULT_MOSQUE_KEY] : [EXTERNAL_MOSQUE_KEY];
                  }
                  if (prev.includes(EXTERNAL_MOSQUE_KEY)) {
                    return [mosque.key];
                  }
                  const exists = prev.includes(mosque.key);
                  if (exists) {
                    const next = prev.filter((key) => key !== mosque.key);
                    return next.length ? next : prev;
                  }
                  return [...prev, mosque.key];
                })}
                style={[styles.statsToggleBtn, { borderColor: adminManageMosqueKeys.includes(mosque.key) ? theme.button : theme.border, backgroundColor: adminManageMosqueKeys.includes(mosque.key) ? theme.button : theme.bg }]}
              >
                <Text style={[styles.statsToggleBtnText, { color: adminManageMosqueKeys.includes(mosque.key) ? theme.buttonText : theme.text }]}>{mosque.label}</Text>
              </Pressable>
            ))}
          </View>
          {adminManageMosqueKeys.includes(EXTERNAL_MOSQUE_KEY) ? (
            <>
              <View style={styles.mergeSwitchWrap}><Text style={[styles.mergeSwitchLabel, { color: theme.text }]}>Mehrere Majlis</Text><Switch value={adminManageExternalMultiMajlis} onValueChange={setAdminManageExternalMultiMajlis} /></View>
              <View style={styles.mergeSwitchWrap}><Text style={[styles.mergeSwitchLabel, { color: theme.text }]}>Namen anzeigen</Text><Switch value={adminManageExternalShowNames} onValueChange={setAdminManageExternalShowNames} /></View>
            </>
          ) : null}
          {!adminManageMosqueKeys.includes(EXTERNAL_MOSQUE_KEY) ? (
            <>
              <View style={styles.mergeSwitchWrap}><Text style={[styles.mergeSwitchLabel, { color: theme.text }]}>Einstellungen ändern</Text><Switch value={adminManagePermissions.canEditSettings} onValueChange={(v) => setAdminManagePermissions((prev) => ({ ...prev, canEditSettings: v }))} /></View>
              <View style={styles.mergeSwitchWrap}><Text style={[styles.mergeSwitchLabel, { color: theme.text }]}>ID-Statistiken sehen</Text><Switch value={adminManagePermissions.canViewIdStats} onValueChange={(v) => setAdminManagePermissions((prev) => ({ ...prev, canViewIdStats: v }))} /></View>
              <View style={styles.mergeSwitchWrap}><Text style={[styles.mergeSwitchLabel, { color: theme.text }]}>Daten exportieren</Text><Switch value={adminManagePermissions.canExportData} onValueChange={(v) => setAdminManagePermissions((prev) => ({ ...prev, canExportData: v }))} /></View>
              <View style={styles.statsToggleRow}>
                <Pressable onPress={() => setAdminManagePermissions(allPermissionsEnabled())} style={[styles.statsCardMiniSwitch, { borderColor: theme.border, backgroundColor: theme.bg }]}><Text style={[styles.statsCardMiniSwitchText, { color: theme.text }]}>Alle Rechte</Text></Pressable>
                <Pressable onPress={() => setAdminManagePermissions({ ...DEFAULT_ACCOUNT_PERMISSIONS })} style={[styles.statsCardMiniSwitch, { borderColor: theme.border, backgroundColor: theme.bg }]}><Text style={[styles.statsCardMiniSwitchText, { color: theme.text }]}>Alles entfernen</Text></Pressable>
              </View>
            </>
          ) : null}
          <Pressable style={({ pressed }) => [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor: theme.button, opacity: adminAccountsLoading ? 0.7 : 1 }], pressed && styles.buttonPressed]} onPress={createManagedAccount} disabled={adminAccountsLoading}>
            <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.buttonText }]}>{adminAccountsLoading ? 'Lädt…' : 'Account erstellen'}</Text>
          </Pressable>
          <View style={[styles.statsCard, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Bestehende Accounts</Text>
            {adminAccounts.map((account) => (
              <View key={account.nameKey || account.name} style={{ marginTop: 8, gap: 6 }}>
                <View style={styles.statsCardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: '700' }}>{account.name}</Text>
                    <Text style={{ color: theme.muted }}>{account.isSuperAdmin
                      ? 'Super-Admin'
                      : (() => {
                        if (account?.isExternalGuest) return 'Extern';
                        const keys = Array.isArray(account.mosqueIds) && account.mosqueIds.length
                          ? account.mosqueIds
                          : (account.mosqueId ? [account.mosqueId] : []);
                        if (!keys.length) return '—';
                        return keys
                          .map((key) => MOSQUE_OPTIONS.find((m) => m.key === key)?.label || key)
                          .join(' · ');
                      })()}</Text>
                  </View>
                  {!account.isSuperAdmin ? (
                    <Pressable onPress={() => deleteManagedAccount(account)} style={[styles.statsCardMiniSwitch, { borderColor: theme.border, backgroundColor: theme.card }]}>
                      <Text style={[styles.statsCardMiniSwitchText, { color: theme.text }]}>Löschen</Text>
                    </Pressable>
                  ) : null}
                </View>
                {!account.isSuperAdmin && account?.isExternalGuest ? (
                  <View style={styles.statsToggleRow}>
                    <Pressable
                      onPress={() => updateManagedExternalOptions(account, {
                        externalMultipleMajalis: !(account?.externalMultipleMajalis !== false),
                        externalShowNames: Boolean(account?.externalShowNames),
                      })}
                      style={[styles.statsToggleBtn, { borderColor: (account?.externalMultipleMajalis !== false) ? theme.button : theme.border, backgroundColor: (account?.externalMultipleMajalis !== false) ? theme.button : theme.bg }]}
                    >
                      <Text style={[styles.statsToggleBtnText, { color: (account?.externalMultipleMajalis !== false) ? theme.buttonText : theme.text }]}>Mehrere Majlis</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => updateManagedExternalOptions(account, {
                        externalMultipleMajalis: account?.externalMultipleMajalis !== false,
                        externalShowNames: !Boolean(account?.externalShowNames),
                      })}
                      style={[styles.statsToggleBtn, { borderColor: Boolean(account?.externalShowNames) ? theme.button : theme.border, backgroundColor: Boolean(account?.externalShowNames) ? theme.button : theme.bg }]}
                    >
                      <Text style={[styles.statsToggleBtnText, { color: Boolean(account?.externalShowNames) ? theme.buttonText : theme.text }]}>Namen anzeigen</Text>
                    </Pressable>
                  </View>
                ) : null}
                {!account.isSuperAdmin && !account?.isExternalGuest ? (
                  <View style={styles.statsToggleRow}>
                    {[
                      ['canEditSettings', 'Settings'],
                      ['canViewIdStats', 'ID-Stats'],
                      ['canExportData', 'Export'],
                    ].map(([permKey, label]) => {
                      const isOn = Boolean(account?.permissions?.[permKey]);
                      return (
                        <Pressable
                          key={`${account.name}_${permKey}`}
                          onPress={() => updateManagedPermissions(account, { ...(account.permissions || {}), [permKey]: !isOn })}
                          style={[styles.statsToggleBtn, { borderColor: isOn ? theme.button : theme.border, backgroundColor: isOn ? theme.button : theme.bg }]}
                        >
                          <Text style={[styles.statsToggleBtnText, { color: isOn ? theme.buttonText : theme.text }]}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {!isGuestMode ? (
        <View style={[styles.settingsHeroCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.settingsHeroTitle, { color: theme.text }]}>DB-Reset (Intern)</Text>
          <Text style={[styles.settingsHeroMeta, { color: theme.muted }]}>Löscht Einträge der gewählten Kategorie(n) pro ausgewählter Moschee.</Text>
          {INTERNAL_RESET_CATEGORIES.map((category) => {
            const selected = Array.isArray(dbResetSelectionByCategory?.[category.key]) ? dbResetSelectionByCategory[category.key] : [];
            const isLoading = Boolean(dbResetLoadingByCategory?.[category.key]);
            return (
              <View key={category.key} style={[styles.statsCard, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                <Text style={[styles.statsCardTitle, { color: theme.text }]}>{category.label}</Text>
                <View style={styles.statsToggleRow}>
                  {internalMosqueOptions.map((mosque) => {
                    const isActive = selected.includes(mosque.key);
                    return (
                      <Pressable
                        key={`${category.key}_${mosque.key}`}
                        onPress={() => toggleDbResetMosqueSelection(category.key, mosque.key)}
                        style={[styles.statsToggleBtn, { borderColor: isActive ? theme.button : theme.border, backgroundColor: isActive ? theme.button : theme.bg }]}
                      >
                        <Text style={[styles.statsToggleBtnText, { color: isActive ? theme.buttonText : theme.text }]}>{mosque.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  style={({ pressed }) => [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor: '#B91C1C', opacity: isLoading ? 0.7 : 1 }], pressed && styles.buttonPressed]}
                  onPress={() => runInternalDbReset(category)}
                  disabled={isLoading}
                >
                  <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: '#FFFFFF' }]}>
                    {isLoading ? 'Löscht…' : `${category.label} löschen`}
                  </Text>
                </Pressable>
              </View>
            );
          })}
          <Text style={[styles.noteText, { color: theme.muted }]}>Hinweis: Es werden Einträge gelöscht, Collections bleiben bestehen.</Text>
        </View>
      ) : null}

      <View style={styles.appMetaWrap}>
        <Text style={[styles.appMetaVersion, { color: theme.muted }]}>Version 1.1.0</Text>
        <Text style={[styles.appMetaCopyright, { color: theme.muted }]}>© 2026 Tehmoor Bhatti. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
  };

  const renderQrPage = () => (
    <ScrollView contentContainerStyle={contentContainerStyle} showsVerticalScrollIndicator={false}>
      <View style={[styles.dayCard, styles.qrPageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Pressable onPress={() => setQrAttendanceCategory((prev) => (prev === 'prayer' ? 'program' : 'prayer'))} style={withPressEffect(styles.quickSearchLinkWrap)}>
          <Text style={[styles.quickSearchLinkText, { color: theme.muted }]}>« Kategorie wechseln »</Text>
        </Pressable>
        <Text style={[styles.qrPageTitle, { color: theme.text }]}>{qrAttendanceCategory === 'program' ? 'QR-Code Programmerfassung' : 'QR-Code Gebetserfassung'}</Text>
        <Pressable onPress={handleQrExternHeaderPress} style={[styles.cityBadge, { backgroundColor: theme.chipBg }]}>
          <Text style={[styles.cityBadgeText, { color: theme.chipText }]}>{activeMosque.label}</Text>
        </Pressable>
        {isQrExternMode && !isQrExternScopeSelected ? (
          <>
            <Text style={[styles.noPrayerTitle, isDarkMode ? styles.noPrayerTitleDark : styles.noPrayerTitleLight]}>Erst Moschee auswählen</Text>
            <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginTop: 10 }]}>Tippe 3x auf den grünen Header, um eine externe Moschee auszuwählen oder zu wechseln.</Text>
          </>
        ) : qrAttendanceCategory === 'program' ? (
          qrLiveProgramWindow.isActive ? (
            <>
              <Text style={[styles.qrPageSubtitle, { color: theme.muted }]}>Aktuelles Programm: {qrLiveProgramWindow.label || 'Programm'}</Text>
              <Text style={[styles.qrPageHint, { color: theme.muted }]}>Dieser QR-Code erneuert sich automatisch alle 5 Minuten für die Programmanwesenheit.</Text>
              <View style={[styles.qrCodeCard, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                {qrImageUri ? <Image source={{ uri: qrImageUri }} style={styles.qrCodeImage} resizeMode="contain" onLoad={() => { if (qrPendingImageUri === qrImageUri) setQrPendingImageUri(''); }} /> : <ActivityIndicator size="large" color={theme.text} />}
                {qrPendingImageUri ? <Image source={{ uri: qrPendingImageUri }} style={styles.qrCodePreloadImage} resizeMode="contain" onLoad={() => { setQrImageUri(qrPendingImageUri); setQrPendingImageUri(''); }} /> : null}
              </View>
              <View style={[styles.qrTimerChip, { borderColor: theme.border, backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }]}>
                <Text style={[styles.qrTimerText, { color: theme.text }]}>Aktualisierung in {formatQrCountdown(qrCountdownSeconds)}</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.noPrayerTitle, isDarkMode ? styles.noPrayerTitleDark : styles.noPrayerTitleLight]}>Aktuell kein Programm aktiv</Text>
              {!qrLiveProgramWindow.isConfigured ? (
                <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginTop: 10 }]}>Für heute ist noch kein Programm hinterlegt.</Text>
              ) : (
                <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginTop: 10 }]}>Programm startet um {qrLiveProgramWindow.startTime || '—'} ({qrLiveProgramWindow.label || 'Programm'}).</Text>
              )}
            </>
          )
        ) : qrLivePrayerWindow.isActive && qrLivePrayerWindow.prayerKey ? (
          <>
            <Text style={[styles.qrPageSubtitle, { color: theme.muted }]}>Aktuelles Gebet: {getDisplayPrayerLabel(qrLivePrayerWindow.prayerKey, qrLiveTimesToday)}</Text>
            <Text style={[styles.qrPageHint, { color: theme.muted }]}>Dieser QR-Code erneuert sich automatisch alle 5 Minuten für die Gebetsanwesenheit.</Text>
            <View style={[styles.qrCodeCard, { borderColor: theme.border, backgroundColor: theme.bg }]}>
              {qrImageUri ? <Image source={{ uri: qrImageUri }} style={styles.qrCodeImage} resizeMode="contain" onLoad={() => { if (qrPendingImageUri === qrImageUri) setQrPendingImageUri(''); }} /> : <ActivityIndicator size="large" color={theme.text} />}
              {qrPendingImageUri ? <Image source={{ uri: qrPendingImageUri }} style={styles.qrCodePreloadImage} resizeMode="contain" onLoad={() => { setQrImageUri(qrPendingImageUri); setQrPendingImageUri(''); }} /> : null}
            </View>
            <View style={[styles.qrTimerChip, { borderColor: theme.border, backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }]}>
              <Text style={[styles.qrTimerText, { color: theme.text }]}>Aktualisierung in {formatQrCountdown(qrCountdownSeconds)}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.noPrayerTitle, isDarkMode ? styles.noPrayerTitleDark : styles.noPrayerTitleLight]}>Derzeit kein Gebet</Text>
            <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginTop: 10 }]}>Nächstes Gebet:</Text>
            <Text style={[styles.nextPrayerValue, { color: theme.text }]}>{prayerWindow.nextLabel}</Text>
            <View style={[styles.noPrayerCountdownChip, { borderColor: theme.border, backgroundColor: isDarkMode ? '#1F2937' : '#FEF3C7' }]}>
              <Text style={[styles.noPrayerCountdownText, { color: theme.text }]}>QR-Code verfügbar in {formatMinutesUntil(prayerWindow.minutesUntilNextWindow)}</Text>
            </View>
            <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginTop: 18 }]}>Anwesenheit kann nur im aktiven Gebet erfasst werden (30 Minuten davor bzw. 60 Minuten danach).</Text>
            <Text style={[styles.urduText, { color: theme.muted }]}>حاضری صرف فعال نماز کے وقت میں درج کی جا سکتی ہے (30 منٹ پہلے اور 60 منٹ بعد تک)۔</Text>
          </>
        )}
      </View>
    </ScrollView>
  );

  const renderQrScanPage = () => (

    <ScrollView ref={terminalScrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={contentContainerStyle} showsVerticalScrollIndicator={false}>
      <View style={[styles.dayCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
        <Text style={[styles.qrPageTitle, { color: theme.text }]}>{qrAttendanceCategory === 'program' ? 'QR Programmanwesenheit' : 'QR Gebetsanwesenheit'}</Text>
        {qrSubmitting ? <ActivityIndicator size="small" color={theme.text} /> : null}
        {qrStatusMessage ? (
          <View style={[styles.qrStatusCard, qrStatusTone === 'negative' ? styles.qrStatusCardNegative : qrStatusTone === 'positive' ? styles.qrStatusCardPositive : null, { borderColor: theme.border }]}> 
            <Text style={[styles.qrStatusText, { color: theme.text }]}>{qrStatusMessage}</Text>
          </View>
        ) : null}
        {qrRegistration?.idNumber && qrCurrentRegistrationMember ? (
          <Text style={[styles.qrRegisteredMeta, { color: theme.muted }]}>Registriert: {qrCurrentRegistrationMember.idNumber} · {TANZEEM_LABELS[qrCurrentRegistrationMember.tanzeem] || qrCurrentRegistrationMember.tanzeem} · {qrCurrentRegistrationMajlisLabel}</Text>
        ) : null}

        {qrFlowMode === 'registered' ? (
          <View style={[styles.qrDeviceHintCard, { borderColor: theme.border, backgroundColor: theme.bg }]}> 
            <Text style={[styles.qrDeviceHintText, { color: theme.text }]}>{qrRegisteredGuidance}</Text>
          </View>
        ) : null}

        {qrFlowMode === 'register' ? (
          <>
            {isQrQuickIdSearchVisible ? (
              <>
                <Pressable onPress={() => setQrQuickIdSearchVisible(false)} style={withPressEffect(styles.quickSearchLinkWrap)}>
                  <Text style={[styles.quickSearchLinkText, { color: isDarkMode ? 'rgba(209, 213, 219, 0.84)' : 'rgba(55, 65, 81, 0.84)' }]}>Schließen</Text>
                </Pressable>
                <View style={[styles.quickSearchPanel, { borderColor: '#000000', backgroundColor: theme.card }]}> 
                  <TextInput
                    value={qrRegistrationSearchQuery}
                    onChangeText={(value) => setQrRegistrationSearchQuery(String(value || '').replace(/[^0-9]/g, ''))}
                    onFocus={() => terminalScrollRef.current?.scrollTo({ y: 180, animated: true })}
                    placeholder="ID-Nummer suchen"
                    placeholderTextColor={theme.muted}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    returnKeyType="done"
                    style={[styles.idSearchInput, { marginTop: 0, color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                  />
                  {qrRegistrationSearchDigits.length < 4 ? (
                    <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginTop: 8 }]}>Bitte mindestens 4 Ziffern eingeben.</Text>
                  ) : qrRegistrationSearchResults.length === 0 ? (
                    <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginTop: 8 }]}>Keine passende ID gefunden.</Text>
                  ) : (
                    <View style={styles.quickSearchResultsWrap}>
                      {qrRegistrationSearchResults.map((member) => (
                        <Pressable
                          key={`qr_quick_${member.tanzeem}_${member.majlis}_${member.idNumber}`}
                          onPress={() => handleQrMemberRegistration(member)}
                          style={({ pressed }) => [[styles.quickSearchResultCard, { borderColor: theme.border, backgroundColor: theme.bg }], pressed && styles.buttonPressed]}
                        >
                        <Text style={[styles.quickSearchResultText, { color: theme.text }]}>{`${member.idNumber} · ${TANZEEM_LABELS[member.tanzeem] || member.tanzeem} · ${resolveExportMajlisLabel(member.majlis, member?.amarat)}`}</Text>
                      </Pressable>
                    ))}
                    </View>
                  )}
                </View>
              </>
            ) : qrRegistrationMode === 'tanzeem' ? (
              <>
                <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, { color: theme.text, textAlign: 'center' }]}>Bitte wählen Sie die Tanzeem</Text>
                <Text style={[styles.urduText, { color: theme.muted }]}>براہِ کرم تنظیم منتخب کریں</Text>
                <View style={styles.tanzeemRow}>
                  {qrRegistrationTanzeemOptions.map((tanzeem) => (
                    <Pressable key={`qr_${tanzeem}`} style={({ pressed }) => [[styles.tanzeemBtn, isTablet && styles.tanzeemBtnTablet, { backgroundColor: theme.button }], pressed && styles.buttonPressed]} onPress={() => {
                      const useMajlisSelection = hasMultipleMajalisInGuest && hasQrMajlisChoicesForTanzeem(tanzeem);
                      setQrRegistrationTanzeem(tanzeem);
                      setQrRegistrationMajlis(useMajlisSelection ? '' : '-');
                      setQrRegistrationMode(useMajlisSelection ? 'majlis' : 'idSelection');
                    }}>
                      <Text style={[styles.presetBtnText, isTablet && styles.presetBtnTextTablet, { color: theme.buttonText }]}>{TANZEEM_LABELS[tanzeem]}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={() => setQrQuickIdSearchVisible(true)} style={withPressEffect(styles.quickSearchLinkWrap)}>
                  <Text style={[styles.quickSearchLinkText, { color: isDarkMode ? 'rgba(209, 213, 219, 0.84)' : 'rgba(55, 65, 81, 0.84)' }]}>Hier direkt ID-Nummer suchen</Text>
                </Pressable>
              </>
            ) : qrRegistrationMode === 'majlis' ? (
              <>
                <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, { color: theme.text, textAlign: 'center' }]}>{`Bitte wählen Sie Ihre ${hasGuestEntriesWithoutMajlis ? 'Jamaat' : 'Majlis'}`}</Text>
                <Text style={[styles.urduText, { color: theme.muted }]}>براہِ کرم اپنی مجلس منتخب کریں</Text>
                <Pressable style={({ pressed }) => [[styles.saveBtn, { backgroundColor: theme.button }], pressed && styles.buttonPressed]} onPress={() => { setQrRegistrationMode('tanzeem'); setQrRegistrationMajlis(''); }}>
                  <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.buttonText }]}>Zurück</Text>
                </Pressable>
                <View style={styles.gridWrap}>
                  {qrRegistrationMajlisChoices.map((loc) => (
                    <Pressable key={`qr_majlis_${loc}`} style={({ pressed }) => [[styles.gridItem, isTablet && styles.gridItemTablet, { backgroundColor: theme.card, borderColor: theme.border }], pressed && styles.buttonPressed]} onPress={() => { setQrRegistrationMajlis(loc); setQrRegistrationMode('idSelection'); }}>
                      <Text style={[styles.gridText, isTablet && styles.gridTextTablet, { color: theme.text }]}>{loc}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={() => setQrQuickIdSearchVisible(true)} style={withPressEffect(styles.quickSearchLinkWrap)}>
                  <Text style={[styles.quickSearchLinkText, { color: isDarkMode ? 'rgba(209, 213, 219, 0.84)' : 'rgba(55, 65, 81, 0.84)' }]}>Hier direkt ID-Nummer suchen</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, { color: theme.text, textAlign: 'center' }]}>Bitte wählen Sie Ihre ID-Nummer</Text>
                <Text style={[styles.urduText, { color: theme.muted }]}>براہِ کرم اپنی آئی ڈی منتخب کریں</Text>
                <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginBottom: 4 }]}>{qrRegistrationMajlis} · {TANZEEM_LABELS[qrRegistrationTanzeem] || ''}</Text>
                <Pressable style={({ pressed }) => [[styles.saveBtn, { backgroundColor: theme.button }], pressed && styles.buttonPressed]} onPress={() => setQrRegistrationMode(shouldUseQrMajlisSelection ? 'majlis' : 'tanzeem')}>
                  <Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color: theme.buttonText }]}>Zurück</Text>
                </Pressable>
                {qrRegistrationMemberChoices.length === 0 ? (
                  <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>Keine ID-Nummern verfügbar.</Text>
                ) : (
                  <View style={[styles.gridWrap, styles.idGridWrap]}>
                    {qrRegistrationMemberChoices.map((member) => (
                      <Pressable
                        key={`qr_member_${member.tanzeem}_${member.majlis}_${member.idNumber}`}
                        style={({ pressed }) => [[styles.gridItem, isTablet && styles.gridItemTablet, { backgroundColor: theme.card, borderColor: theme.border }], pressed && styles.buttonPressed]}
                        onPress={() => handleQrMemberRegistration(member)}
                      >
                        <Text style={[styles.gridText, isTablet && styles.gridTextTablet, { color: theme.text }]}>{member.idNumber}</Text>
                        {showMemberNamesInGrid ? <Text style={[styles.gridSubText, { color: theme.muted }]} numberOfLines={1}>{member.name}</Text> : null}
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        ) : null}

        {qrFlowMode === 'registered' ? (
          <View style={[styles.qrDeviceHintCard, { borderColor: theme.border, backgroundColor: theme.bg }]}> 
            <Text style={[styles.qrDeviceHintText, { color: theme.text }]}>Bitte Browserdaten nicht löschen, möglichst immer denselben Browser verwenden und bei gelöschten Daten erneut registrieren.</Text>
          </View>
        ) : null}

      </View>
    </ScrollView>
  );

  const body = shouldRestrictToQrView
    ? (isQrScanPageVisible ? renderQrScanPage() : renderQrPage())
    : isGuestMode
    ? (activeTab === 'stats'
      ? (currentAccount ? renderStats() : renderPrayer())
      : activeTab === 'settings'
        ? (currentAccount ? renderSettings() : renderPrayer())
        : activeTab === 'terminal'
          ? renderTerminal()
          : renderPrayer())
    : shouldRestrictToRegistrationView
      ? renderTerminal()
    : shouldRestrictToPrayerView
      ? renderPrayer()
      : isQrScanPageVisible
      ? renderQrScanPage()
      : isQrPageVisible
        ? renderQrPage()
        : activeTab === 'gebetsplan'
        ? renderPrayer()
        : activeTab === 'terminal'
          ? renderTerminal()
          : activeTab === 'stats'
            ? renderStats()
            : (effectivePermissions.canEditSettings ? renderSettings() : renderPrayer());
  const isPrayerTimeBootstrapPending = !prayerOverrideReady;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.bg }]}
      onTouchStart={recordTerminalInteraction}
      onStartShouldSetResponderCapture={() => {
        recordTerminalInteraction();
        return false;
      }}
      onMouseDown={Platform.OS === 'web' ? recordTerminalInteraction : undefined}
    >
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Text style={[styles.basmalaText, { color: theme.muted }]}>بِسۡمِ اللّٰہِ الرَّحۡمٰنِ الرَّحِیۡمِ</Text>
      <Pressable style={styles.logoWrap} onPress={handleLogoPress}>
        <Image source={logoSource} style={styles.logoImage} resizeMode="contain" />
      </Pressable>
      {currentAccount ? (
        <View style={styles.accountSessionCenterWrap}>
          <Text style={[styles.accountSessionCenterName, { color: theme.text }]} numberOfLines={1}>{currentAccount.name}</Text>
          <Pressable onPress={logoutAccount} style={({ pressed }) => [styles.accountSessionCenterLogoutBtn, pressed && styles.buttonPressed]}>
            <Text style={[styles.accountSessionCenterLogoutText, { color: theme.muted }]}>Logout</Text>
          </Pressable>
        </View>
      ) : null}
      <Animated.View style={{ flex: 1, opacity: isPrayerTimeBootstrapPending ? 0 : 1, transform: [{ scale: themePulseAnim }] }}>{body}</Animated.View>

      {!shouldRestrictToPrayerView && !shouldRestrictToQrView && !shouldRestrictToRegistrationView && (!isQrPageVisible && !isQrScanPageVisible || Boolean(currentAccount) || isGuestMode) ? (
        <View style={[styles.tabBar, isTablet && styles.tabBarTablet, isTablet && Platform.OS === 'web' && styles.tabBarTabletWebCompact, { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, isTablet && Platform.OS === 'web' ? 2 : 4), minHeight: (isTablet && Platform.OS === 'web' ? 44 : 52) + Math.max(insets.bottom, isTablet && Platform.OS === 'web' ? 2 : 4) }]}>
          {visibleTabs.map((tab) => (
            <Pressable key={tab.key} onPress={() => handleTabPress(tab.key)} style={withPressEffect([styles.tabItem, isTablet && Platform.OS === 'web' && styles.tabItemTabletWebCompact])}>
              <Text numberOfLines={1} style={[styles.tabLabel, isTablet && styles.tabLabelTablet, isTablet && Platform.OS === 'web' && styles.tabLabelTabletWebCompact, { color: activeTab === tab.key ? theme.text : theme.muted, fontWeight: activeTab === tab.key ? '700' : '500' }]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}


      <Modal
        visible={isAdminLoginVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (normalizedAppMode === 'registration' && registrationWindow.canAccess && registrationWindow.loginEnabled && !currentAccount) return;
          setAdminLoginVisible(false);
        }}
      >
        <View style={styles.privacyModalBackdrop}>
          <View style={[styles.statsExportModalCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
            <Text style={[styles.statsExportModalTitle, { color: theme.text }]}>Account Login</Text>
            <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>{isGuestMode ? 'Externer Zugang' : 'Interner Zugang (Frankfurt)'}</Text>
            <View style={styles.mergeInputWrap}>
              <TextInput value={loginNameInput} onChangeText={setLoginNameInput} placeholder="Name" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
              <TextInput value={loginPasswordInput} onChangeText={setLoginPasswordInput} placeholder="Passwort" placeholderTextColor={theme.muted} autoCapitalize="none" secureTextEntry style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
            </View>
            <View style={styles.statsExportModalActions}>
              <Pressable onPress={loginWithHiddenModal} disabled={authLoading} style={[styles.statsExportOptionBtn, { borderColor: '#000000', backgroundColor: '#000000', opacity: authLoading ? 0.7 : 1 }]}> 
                <Text style={[styles.statsExportOptionBtnText, { color: '#FFFFFF' }]}>{authLoading ? 'Prüft…' : 'Einloggen'}</Text>
              </Pressable>
              {(!isGuestMode || Boolean(guestActivation?.scopeKey))
                && !(normalizedAppMode === 'registration' && registrationWindow.canAccess && registrationWindow.loginEnabled && !currentAccount) ? (
                <Pressable onPress={() => setAdminLoginVisible(false)} style={[styles.statsExportCloseBtn, { borderColor: theme.border }]}>
                  <Text style={[styles.statsExportCloseBtnText, { color: theme.text }]}>Schließen</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isExternalScopeModalVisible} animationType="fade" transparent onRequestClose={() => setExternalScopeModalVisible(false)}>
        <View style={styles.privacyModalBackdrop}>
          <View style={[styles.statsExportModalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.statsExportModalTitle, { color: theme.text }]}>Externe Moschee wählen</Text>
            <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>Öffnen über 3x Klick auf den grünen Header.</Text>
            {externalScopeLoading ? (
              <ActivityIndicator size="small" color={theme.text} style={{ marginTop: 10 }} />
            ) : externalScopeOptions.length === 0 ? (
              <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginTop: 10 }]}>Keine externen Moscheen gefunden.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 280, width: '100%', marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
                {externalScopeOptions.map((option) => {
                  const optionLabel = String(option?.mosqueName || option?.scopeKey || '').trim() || 'Extern';
                  const isSelected = normalizeExternalScopeKey(guestActivation?.scopeKey || guestActivation?.mosqueName || '') === normalizeExternalScopeKey(option?.scopeKey || '');
                  return (
                    <Pressable
                      key={`ext_scope_${option.scopeKey}`}
                      onPress={() => selectExternalScope(option)}
                      style={({ pressed }) => [[styles.statsExportOptionBtn, { borderColor: isSelected ? theme.button : theme.border, backgroundColor: isSelected ? theme.button : theme.bg }], pressed && styles.buttonPressed]}
                    >
                      <Text style={[styles.statsExportOptionBtnText, { color: isSelected ? theme.buttonText : theme.text }]}>{optionLabel}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            <View style={styles.statsExportModalActions}>
              <Pressable onPress={() => { loadExternalScopeOptions(); }} style={[styles.statsExportOptionBtn, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                <Text style={[styles.statsExportOptionBtnText, { color: theme.text }]}>Aktualisieren</Text>
              </Pressable>
              <Pressable onPress={() => setExternalScopeModalVisible(false)} style={[styles.statsExportCloseBtn, { borderColor: theme.border }]}>
                <Text style={[styles.statsExportCloseBtnText, { color: theme.text }]}>Schließen</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>


      <Modal visible={isPrivacyModalVisible} animationType="slide" transparent onRequestClose={() => setPrivacyModalVisible(false)}>
        <View style={styles.privacyModalBackdrop}>
          <SafeAreaView style={[styles.privacyModalCard, { backgroundColor: theme.bg }]}>
            <View style={styles.privacyModalHeader}>
              <Text style={[styles.privacyModalTitle, { color: theme.text }]}>Datenschutzerklärung</Text>
              <Pressable onPress={() => setPrivacyModalVisible(false)} style={withPressEffect(styles.privacyModalCloseBtn)}>
                <Text style={[styles.privacyModalCloseText, { color: theme.muted }]}>Schließen</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.privacyModalBody}>
              <Text style={[styles.privacyModalHeroTitle, { color: theme.text }]}>Datenschutzerklärung – Verarbeitung von Mitgliedsdaten</Text>
              {PRIVACY_POLICY_SECTIONS.map((section, index) => (
                <PrivacySection
                  key={section.title}
                  section={section}
                  theme={theme}
                  isLast={index === PRIVACY_POLICY_SECTIONS.length - 1}
                />
              ))}
              <Text style={[styles.privacyParagraph, { color: theme.text, marginBottom: 0 }]}>
                Mehr Informationen zum Datenschutz finden Sie{' '}
                <Text style={{ textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://ahmadiyya.de/datenschutz/')}>
                  hier
                </Text>
                .
              </Text>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={isStatsCalendarVisible} animationType="slide" transparent onRequestClose={() => setStatsCalendarVisible(false)}>
        <View style={styles.privacyModalBackdrop}>
          <SafeAreaView style={[styles.privacyModalCard, { backgroundColor: theme.bg }]}>
            <View style={styles.privacyModalHeader}>
              <Text style={[styles.privacyModalTitle, { color: theme.text }]}>Datum auswählen</Text>
              <Pressable onPress={() => { setStatsCalendarVisible(false); }} style={withPressEffect(styles.privacyModalCloseBtn)}>
                <Text style={[styles.privacyModalCloseText, { color: theme.muted }]}>Schließen</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.statsCalendarBody}>
              {selectedStatsDateISO && selectedStatsDateISO !== todayISO ? (
                <Pressable
                  onPress={() => { setSelectedStatsDateISO(todayISO); setStatsCalendarVisible(false); }}
                  style={[styles.statsCalendarResetBtn, { borderColor: theme.border, backgroundColor: theme.bg }]}
                >
                  <Text style={[styles.statsCalendarResetBtnText, { color: theme.text }]}>Auf heute zurücksetzen ({formatStatsDateShort(todayISO)})</Text>
                </Pressable>
              ) : null}
              {availableStatsDates.length === 0 ? (
                <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>Keine Datumswerte verfügbar.</Text>
              ) : availableStatsDates.map((iso) => {
                const dateObj = parseISO(iso);
                const label = dateObj ? formatStatsDateShort(iso) : iso;
                const isActive = iso === selectedStatsDateISO;
                const isTodayEntry = iso === todayISO;
                return (
                  <Pressable
                    key={iso}
                    onPress={() => { setSelectedStatsDateISO(iso); setStatsCalendarVisible(false); }}
                    style={[styles.statsCalendarItem, { borderColor: theme.border, backgroundColor: isActive ? theme.button : theme.card }]}
                  >
                    <Text style={{ color: isActive ? theme.buttonText : theme.text, fontWeight: '700' }}>{isTodayEntry ? `${label} (heute)` : label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={isStatsWeekModalVisible} animationType="slide" transparent onRequestClose={() => setStatsWeekModalVisible(false)}>
        <View style={styles.privacyModalBackdrop}>
          <SafeAreaView style={[styles.privacyModalCard, { backgroundColor: theme.bg }]}> 
            <View style={styles.privacyModalHeader}>
              <Text style={[styles.privacyModalTitle, { color: theme.text }]}>KW auswählen</Text>
              <Pressable onPress={() => setStatsWeekModalVisible(false)} style={withPressEffect(styles.privacyModalCloseBtn)}>
                <Text style={[styles.privacyModalCloseText, { color: theme.muted }]}>Schließen</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.statsCalendarBody}>
              {availableStatsWeeks.length === 0 ? (
                <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>Keine Kalenderwochen verfügbar.</Text>
              ) : availableStatsWeeks.map((week) => {
                const isActive = week.weekStartISO === selectedStatsWeekStartISO;
                return (
                  <Pressable
                    key={`week_${week.weekStartISO}`}
                    onPress={() => { setSelectedStatsWeekStartISO(week.weekStartISO); setStatsWeekModalVisible(false); }}
                    style={[styles.statsCalendarItem, { borderColor: theme.border, backgroundColor: isActive ? theme.button : theme.card }]}
                  >
                    <Text style={{ color: isActive ? theme.buttonText : theme.text, fontWeight: '700' }}>{week.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={isStatsExportModalVisible} animationType="fade" transparent onRequestClose={() => setStatsExportModalVisible(false)}>
        <View style={styles.privacyModalBackdrop}>
          <View style={[styles.statsExportModalCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
            <Text style={[styles.statsExportModalTitle, { color: theme.text }]}>Daten exportieren</Text>
            <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>Wählen Sie den Zeitraum für den Excel-Export.</Text>
            <View style={styles.statsExportModalActions}>
              <Pressable
                disabled={statsExporting || !hasStatsExportData}
                onPress={() => handleExportStats('currentWeek')}
                style={[styles.statsExportOptionBtn, { borderColor: theme.border, backgroundColor: theme.bg, opacity: (statsExporting || !hasStatsExportData) ? 0.6 : 1 }]}
              >
                <Text style={[styles.statsExportOptionBtnText, { color: theme.text }]}>{`${currentWeekLabel} (.xlsx)`}</Text>
              </Pressable>
              <Pressable
                disabled={statsExporting || !hasStatsExportData}
                onPress={() => handleExportStats('previousWeek')}
                style={[styles.statsExportOptionBtn, { borderColor: theme.border, backgroundColor: theme.bg, opacity: (statsExporting || !hasStatsExportData) ? 0.6 : 1 }]}
              >
                <Text style={[styles.statsExportOptionBtnText, { color: theme.text }]}>Letzte Woche (.xlsx)</Text>
              </Pressable>
              <Pressable
                disabled={statsExporting || !selectedStatsDateISO}
                onPress={() => handleExportStats('selectedDate')}
                style={[styles.statsExportOptionBtn, { borderColor: theme.border, backgroundColor: theme.bg, opacity: (statsExporting || !selectedStatsDateISO) ? 0.6 : 1 }]}
              >
                <Text style={[styles.statsExportOptionBtnText, { color: theme.text }]}>{`Ausgewähltes Datum (${selectedStatsDateToggleLabel}) (.xlsx)`}</Text>
              </Pressable>
              {!hasStatsExportData ? <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>Keine Daten zum Export verfügbar</Text> : null}
            </View>
            <Pressable onPress={() => setStatsExportModalVisible(false)} style={[styles.statsExportCloseBtn, { borderColor: theme.border }]}>
              <Text style={[styles.statsExportCloseBtnText, { color: theme.text }]}>Schließen</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={isProgramStatsPickerVisible} animationType="slide" transparent onRequestClose={() => setProgramStatsPickerVisible(false)}>
        <View style={styles.privacyModalBackdrop}>
          <SafeAreaView style={[styles.privacyModalCard, { backgroundColor: theme.bg }]}>
            <View style={styles.privacyModalHeader}>
              <Text style={[styles.privacyModalTitle, { color: theme.text }]}>{statsMode === 'registration' ? 'Anmeldung auswählen' : 'Programm auswählen'}</Text>
              <Pressable onPress={() => setProgramStatsPickerVisible(false)} style={withPressEffect(styles.privacyModalCloseBtn)}>
                <Text style={[styles.privacyModalCloseText, { color: theme.muted }]}>Schließen</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.statsCalendarBody}>
              {(statsMode === 'registration' ? availableRegistrationStatsOptions : availableProgramStatsOptions).length === 0 ? (
                <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>{statsMode === 'registration' ? 'Keine Anmeldungsdaten verfügbar.' : 'Keine Programmdaten verfügbar.'}</Text>
              ) : (statsMode === 'registration' ? availableRegistrationStatsOptions : availableProgramStatsOptions).map((item) => {
                const itemId = statsMode === 'registration' ? item.id : item.docId;
                const selectedId = statsMode === 'registration' ? selectedRegistrationStatsOption?.id : selectedProgramStatsOption?.docId;
                const isActive = itemId === selectedId;
                return (
                  <Pressable
                    key={`program_stats_${itemId}`}
                    onPress={() => {
                      if (statsMode === 'registration') setSelectedRegistrationStatsConfigId(item.id);
                      else setSelectedProgramStatsDocId(item.docId);
                      setProgramStatsPickerVisible(false);
                    }}
                    style={[styles.statsCalendarItem, { borderColor: theme.border, backgroundColor: isActive ? theme.button : theme.card }]}
                  >
                    <Text style={{ color: isActive ? theme.buttonText : theme.text, fontWeight: '700' }}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>



      <Modal visible={isDetailedIdOverviewVisible} animationType="slide" transparent onRequestClose={() => setDetailedIdOverviewVisible(false)}>
        <View style={styles.privacyModalBackdrop}>
          <SafeAreaView style={[styles.privacyModalCard, { backgroundColor: theme.bg }]}>
            <View style={styles.privacyModalHeader}>
              <Text style={[styles.privacyModalTitle, { color: theme.text }]}>Detaillierte ID-Übersicht</Text>
              <Pressable onPress={() => { setDetailedIdOverviewVisible(false); setDetailedCalendarVisible(false); setDetailedWeekPickerVisible(false); setDetailedExportModalVisible(false); setSelectedDetailedMember(null); setDetailedMemberLogs([]); }} style={withPressEffect(styles.privacyModalCloseBtn)}>
                <Text style={[styles.privacyModalCloseText, { color: theme.muted }]}>Schließen</Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.detailedIdModalBody, !selectedDetailedMember && (!detailedFlowTanzeem || !detailedFlowMajlis) && styles.detailedIdModalBodyCompact]}
            >
              {!selectedDetailedMember ? (
                <>
                  {statsMode === 'program' || statsMode === 'registration' ? (
                    <Pressable
                      onPress={statsMode === 'program' ? handleExportProgramDetailedIds : handleExportRegistrationDetailedIds}
                      disabled={(statsMode === 'program' ? detailedProgramExporting : detailedRegistrationExporting) || !effectivePermissions.canExportData}
                      style={[styles.statsExportBtn, { borderColor: theme.border, backgroundColor: ((statsMode === 'program' ? detailedProgramExporting : detailedRegistrationExporting) || !effectivePermissions.canExportData) ? theme.border : theme.bg, opacity: ((statsMode === 'program' ? detailedProgramExporting : detailedRegistrationExporting) || !effectivePermissions.canExportData) ? 0.7 : 1 }]}
                    >
                      <Text style={[styles.statsExportBtnText, { color: theme.text }]}>{(statsMode === 'program' ? detailedProgramExporting : detailedRegistrationExporting) ? 'Export läuft…' : 'Daten exportieren'}</Text>
                    </Pressable>
                  ) : null}

                  <View style={[styles.detailedGuideCard, { borderColor: theme.border, backgroundColor: theme.card }]}> 
                    <Text style={[styles.detailedGuideTitle, { color: theme.text }]}>Bitte zuerst auswählen</Text>
                    <Text style={[styles.detailedGuideText, { color: theme.muted }]}>{`Flow: Tanzeem → ${hasGuestEntriesWithoutMajlis ? 'Jamaat' : 'Majlis'} → ID Suche`}</Text>
                  </View>
                  <View style={styles.statsToggleRow}>
                    {(statsMode === 'program'
                      ? PROGRAM_TANZEEM_OPTIONS
                      : (statsMode === 'registration'
                        ? (selectedRegistrationStatsOption?.advanced?.includeTanzeems || [])
                        : TANZEEM_OPTIONS)).map((key) => {
                      const isActive = detailedFlowTanzeem === key;
                      return (
                        <Pressable
                          key={key}
                          onPress={() => { setDetailedFlowTanzeem(key); setDetailedFlowMajlis(''); setDetailedIdSearchQuery(''); }}
                          style={[styles.statsToggleBtn, { borderColor: isActive ? theme.button : theme.border, backgroundColor: isActive ? theme.button : theme.bg }]}
                        >
                          <Text style={[styles.statsToggleBtnText, { color: isActive ? theme.buttonText : theme.text }]}>{TANZEEM_LABELS[key]}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {detailedFlowTanzeem ? (
                    <View style={styles.detailedIdSectionWrap}>
                      <Text style={[styles.statsCardTitle, { color: theme.muted }]}>{getLocationLabel(detailedFlowMajlis || detailedMajlisOptions[0])}</Text>
                      <View style={styles.detailedIdChipsWrap}>
                        {detailedMajlisOptions.map((majlis) => {
                          const isActive = detailedFlowMajlis === majlis;
                          return (
                            <Pressable
                              key={majlis}
                              onPress={() => setDetailedFlowMajlis(majlis)}
                              style={[styles.detailedIdChip, { borderColor: isActive ? theme.button : theme.border, backgroundColor: isActive ? theme.button : theme.bg }]}
                            >
                              <Text style={{ color: isActive ? theme.buttonText : theme.text, fontWeight: '700' }}>{resolveExportMajlisLabel(majlis)}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}

                  {detailedFlowMajlis ? (<>
                  <TextInput
                    value={detailedIdSearchQuery}
                    onChangeText={setDetailedIdSearchQuery}
                    placeholder="ID-Nummer suchen"
                    placeholderTextColor={theme.muted}
                    keyboardType="number-pad"
                    style={[styles.idSearchInput, { marginTop: 8, color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                  />

                  <View style={styles.detailedIdListWrap}>
                    {detailedIdChoices.map((member) => (
                      <Pressable
                        key={`${member.tanzeem}_${member.majlis}_${member.idNumber}`}
                        onPress={statsMode === 'program' || statsMode === 'registration' ? undefined : () => {
                          setSelectedDetailedMember(member);
                          setDetailedGraphRange('currentWeek');
                          setDetailedPrayerRange('currentWeek');
                          const firstWeek = getLast8Weeks(now)[0];
                          const minISO = selectedStatsDateISO && selectedStatsDateISO < firstWeek.startISO ? selectedStatsDateISO : firstWeek.startISO;
                          const maxISO = selectedStatsDateISO && selectedStatsDateISO > toISO(now) ? selectedStatsDateISO : toISO(now);
                          loadDetailedLogsForMember(member.idNumber, minISO, maxISO);
                        }}
                        style={[styles.detailedIdRow, { borderColor: theme.border, backgroundColor: theme.card }]}
                      >
                        {statsMode === 'program' || statsMode === 'registration' ? (
                          <Text style={{ color: theme.text, fontWeight: '700' }}>{`${member.idNumber} ${TANZEEM_LABELS[member.tanzeem]} ${resolveExportMajlisLabel(member.majlis, member?.amarat)}`}</Text>
                        ) : (
                          <>
                            <Text style={{ color: theme.text, fontWeight: '700' }}>{member.idNumber}</Text>
                            <Text style={{ color: theme.muted, fontSize: 12 }}>{`${TANZEEM_LABELS[member.tanzeem]} · ${resolveExportMajlisLabel(member.majlis, member?.amarat)}`}</Text>
                          </>
                        )}
                        {statsMode === 'program' || statsMode === 'registration' ? (
                          <Text style={{
                            color: member.hasActiveFlow
                              ? (statsMode === 'registration' && member.registrationResponseInActiveFlow === 'decline'
                                ? '#D97706'
                                : (member.isPresentInActiveFlow ? '#16A34A' : '#DC2626'))
                              : theme.muted,
                            fontSize: 12,
                            marginTop: 4,
                          }}>
                            {member.hasActiveFlow
                              ? (statsMode === 'registration'
                                ? (member.registrationResponseInActiveFlow === 'decline'
                                  ? `● Absage ${member.registrationDeclineHasReason ? '(mit Grund)' : '(ohne Grund)'}`
                                  : (member.isPresentInActiveFlow ? '● angemeldet' : '● nicht angemeldet'))
                                : (member.isPresentInActiveFlow ? '● angemeldet' : '● nicht angemeldet'))
                              : (statsMode === 'program' ? 'Kein aktives Programm konfiguriert' : 'Keine aktive Anmeldung ausgewählt')}
                          </Text>
                        ) : null}
                        {statsMode === 'registration' && member.normalizedStimmberechtigt === 0 ? (
                          <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>Darf nicht teilnehmen.</Text>
                        ) : null}
                      </Pressable>
                    ))}
                    {detailedIdChoices.length === 0 ? <Text style={[styles.noteText, { color: theme.muted }]}>Keine IDs gefunden.</Text> : null}
                    {statsMode === 'program' && !String(selectedProgramStatsOption?.programName || selectedProgramConfig?.name || '').trim() ? (
                      <Text style={[styles.noteText, { color: theme.muted }]}>Kein Programm ausgewählt. IDs werden ohne Anwesenheitsstatus angezeigt.</Text>
                    ) : null}
                  </View>
                  </>) : null}
                  {!detailedFlowTanzeem || !detailedFlowMajlis ? (
                    <Text style={[styles.detailedGuideHint, { color: theme.button }]}>{`Bitte Tanzeem und ${hasGuestEntriesWithoutMajlis ? 'Jamaat' : 'Majlis'} auswählen, dann erscheinen die IDs.`}</Text>
                  ) : null}
                </>
              ) : (
                <>
                  <Pressable
                    onPress={() => {
                      setDetailedGraphRange('currentWeek');
                      setDetailedPrayerRange('currentWeek');
                      setDetailedWeekPickerVisible(true);
                    }}
                    style={[styles.statsCalendarBtn, { borderColor: theme.border, backgroundColor: theme.bg }]}
                  >
                    <Text style={[styles.statsCalendarBtnText, { color: theme.text }]}>{`KW auswählen · ${currentWeekLabel}`}</Text>
                  </Pressable>

                  <Pressable onPress={() => { setSelectedDetailedMember(null); setDetailedMemberLogs([]); }} style={[styles.statsCardMiniSwitch, { alignSelf: 'flex-start', borderColor: theme.border, backgroundColor: theme.bg }]}>
                    <Text style={[styles.statsCardMiniSwitchText, { color: theme.text }]}>Zurück</Text>
                  </Pressable>

                  <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.statsCardTitle, { color: theme.muted }]}>ID {selectedDetailedMember.idNumber}</Text>
                    <Text style={{ color: theme.text, fontWeight: '700', marginTop: 4 }}>{`${getLocationLabel(selectedDetailedMember?.majlis)}: ${resolveExportMajlisLabel(selectedDetailedMember?.majlis, selectedDetailedMember?.amarat)}`}</Text>
                    <Text style={[styles.noteText, { color: theme.muted, marginTop: 2 }]}>{TANZEEM_LABELS[selectedDetailedMember.tanzeem]}</Text>
                  </View>

                  <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Status (wöchentlich)</Text>
                    {detailedLogsLoading ? <ActivityIndicator size="small" color={theme.text} style={{ marginTop: 8 }} /> : null}
                    <Text style={[styles.statsInsightText, { color: theme.text, marginTop: 6 }]}>{`Diese Woche: ${detailedCurrentWeekCount} / 35`}</Text>
                    <Text style={[styles.statsInsightText, { color: theme.text }]}>{`Letzte Woche: ${detailedPreviousWeekCount} / 35`}</Text>
                    <Text style={[styles.statsInsightText, { color: theme.text }]}>{`Differenz (Δ): ${detailedCurrentWeekCount - detailedPreviousWeekCount >= 0 ? '+' : ''}${detailedCurrentWeekCount - detailedPreviousWeekCount}`}</Text>
                    <Text style={[styles.statsInsightText, { color: theme.text }]}>{`Durchschnitt pro Tag: ${(detailedCurrentWeekCount / 7).toFixed(1)}`}</Text>
                    <Text style={[styles.statsInsightText, { color: theme.text, marginTop: 6 }]}>{detailedStatus.label}</Text>
                    <Text style={[styles.noteText, { color: theme.muted, marginTop: 4 }]}>{`Entspricht ca. ${(detailedCurrentWeekCount / 7).toFixed(1)} Gebeten pro Tag (Ø)`}</Text>
                  </View>

                  <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                    <View style={styles.statsCardHeaderRow}>
                      <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Anzahl der Gebete nach Tage</Text>
                      <Pressable
                        onPress={() => setDetailedGraphRange((prev) => {
                          const options = ['currentWeek', 'previousWeek', 'fourWeeks'];
                          const idx = options.indexOf(prev);
                          return options[(idx + 1) % options.length];
                        })}
                        style={[styles.statsCardMiniSwitch, !isTablet && styles.statsCardMiniSwitchMobile, { borderColor: theme.border, backgroundColor: theme.bg }]}
                      >
                        <Text numberOfLines={1} style={[styles.statsCardMiniSwitchText, !isTablet && styles.statsCardMiniSwitchTextMobile, { color: theme.text }]}>{detailedTopRangeToggleLabel}</Text>
                      </Pressable>
                    </View>
                    <Text style={[styles.statsCardRangeInfo, { color: theme.muted }]}>{`${detailedTopRangeLabel} · ${detailedTopRangePeriodLabel}`}</Text>
                    <MiniLineChart
                      labels={detailedGraphRange === 'fourWeeks'
                        ? detailedComparisonSeries.map((row) => `KW ${row.weekNumber}`)
                        : detailedComparisonSeries.map((row) => {
                          const d = parseISO(row.iso);
                          return d ? new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(d).replace(/\.$/, '') : row.iso;
                        })}
                      series={[{
                        key: detailedGraphRange === 'fourWeeks' ? 'weekly' : 'daily',
                        label: detailedGraphRange === 'fourWeeks' ? 'Gebete/Woche' : 'Gebete/Tag',
                        color: theme.button,
                        thick: true,
                        data: detailedComparisonSeries.map((row) => row.value),
                      }]}
                      theme={theme}
                      isDarkMode={isDarkMode}
                      xAxisTitle={detailedGraphRange === 'fourWeeks' ? 'Kalenderwochen' : 'Tage'}
                      yMaxValue={detailedGraphRange === 'fourWeeks' ? 35 : 5}
                      yTickCount={detailedGraphRange === 'fourWeeks' ? 6 : 6}
                    />
                  </View>

                  <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                    <View style={styles.statsCardHeaderRow}>
                      <View>
                        <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Anzahl der Gebete nach Gebetszeiten</Text>
                        <Text style={[styles.statsCardRangeInfo, { color: theme.muted }]}>{formatRangeLabel(detailedPrayerRange)}</Text>
                      </View>
                      <Pressable onPress={() => setDetailedPrayerRange(cycleStatsRangeMode)} style={[styles.statsCardMiniSwitch, !isTablet && styles.statsCardMiniSwitchMobile, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                        <Text numberOfLines={1} style={[styles.statsCardMiniSwitchText, !isTablet && styles.statsCardMiniSwitchTextMobile, { color: theme.text }]}>{getRangeToggleLabel(detailedPrayerRange)}</Text>
                      </Pressable>
                    </View>
                    {detailedPrayerRange === 'selectedDate' ? (
                      <Pressable onPress={() => setDetailedCalendarVisible(true)} style={[styles.statsCalendarBtn, { borderColor: theme.border, backgroundColor: theme.bg, marginTop: 10 }]}>
                        <Text style={[styles.statsCalendarBtnText, { color: theme.text }]}>{`Datum auswählen · ${selectedStatsDateLabel}`}</Text>
                      </Pressable>
                    ) : null}
                    <MiniLineChart
                      labels={detailedPrayerRows.map((row) => row.label)}
                      series={[{ key: 'detailedPrayerTotals', label: 'Anzahl der Gebete nach Gebetszeiten', color: theme.button, thick: true, data: detailedPrayerRows.map((row) => row.total) }]}
                      theme={theme}
                      isDarkMode={isDarkMode}
                      xAxisTitle="Gebete"
                      useEqualLabelSlots
                      pointLabelFormatter={({ label, value }) => `${label}, ${Number(value) || 0} Gebete`}
                    />
                  </View>

                  <Pressable
                    onPress={() => setDetailedExportModalVisible(true)}
                    disabled={detailedExporting || !hasDetailedExportData || !effectivePermissions.canExportData}
                    style={[styles.statsExportBtn, { borderColor: theme.border, backgroundColor: (detailedExporting || !hasDetailedExportData) ? theme.border : theme.bg, opacity: (detailedExporting || !hasDetailedExportData) ? 0.7 : 1 }]}
                  >
                    <Text style={[styles.statsExportBtnText, { color: theme.text }]}>{detailedExporting ? 'Export läuft…' : 'Daten exportieren'}</Text>
                  </Pressable>
                </>
              )}
            </ScrollView>

            {isDetailedExportModalVisible ? (
              <View style={styles.detailedInlineCalendarOverlay}>
                <View style={[styles.statsExportModalCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                  <Text style={[styles.statsExportModalTitle, { color: theme.text }]}>Detaillierte ID exportieren</Text>
                  <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>Wählen Sie den Zeitraum für den Excel-Export.</Text>
                  <View style={styles.statsExportModalActions}>
                    <Pressable
                      disabled={detailedExporting || !hasDetailedExportData || !effectivePermissions.canExportData}
                      onPress={() => handleExportDetailed('currentWeek')}
                      style={[styles.statsExportOptionBtn, { borderColor: theme.border, backgroundColor: theme.bg, opacity: (detailedExporting || !hasDetailedExportData) ? 0.6 : 1 }]}
                    >
                      <Text style={[styles.statsExportOptionBtnText, { color: theme.text }]}>{`Ausgewählte ${currentWeekLabel} (.xlsx)`}</Text>
                    </Pressable>
                    <Pressable
                      disabled={detailedExporting || !hasDetailedExportData || !effectivePermissions.canExportData}
                      onPress={() => handleExportDetailed('previousWeek')}
                      style={[styles.statsExportOptionBtn, { borderColor: theme.border, backgroundColor: theme.bg, opacity: (detailedExporting || !hasDetailedExportData) ? 0.6 : 1 }]}
                    >
                      <Text style={[styles.statsExportOptionBtnText, { color: theme.text }]}>Letzte Woche (.xlsx)</Text>
                    </Pressable>
                  </View>
                  <Pressable onPress={() => setDetailedExportModalVisible(false)} style={[styles.statsExportCloseBtn, { borderColor: theme.border }]}>
                    <Text style={[styles.statsExportCloseBtnText, { color: theme.text }]}>Schließen</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {isDetailedWeekPickerVisible ? (
              <View style={styles.detailedInlineCalendarOverlay}>
                <View style={[styles.detailedInlineCalendarCard, { backgroundColor: theme.bg, borderColor: theme.border }]}> 
                  <View style={styles.privacyModalHeader}>
                    <Text style={[styles.privacyModalTitle, { color: theme.text }]}>KW auswählen</Text>
                    <Pressable onPress={() => setDetailedWeekPickerVisible(false)} style={withPressEffect(styles.privacyModalCloseBtn)}>
                      <Text style={[styles.privacyModalCloseText, { color: theme.muted }]}>Schließen</Text>
                    </Pressable>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.statsCalendarBody}>
                    {availableStatsWeeks.length === 0 ? (
                      <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>Keine Kalenderwochen verfügbar.</Text>
                    ) : availableStatsWeeks.map((week) => {
                      const isActive = week.weekStartISO === selectedStatsWeekStartISO;
                      return (
                        <Pressable
                          key={`detailed_week_${week.weekStartISO}`}
                          onPress={() => { setSelectedStatsWeekStartISO(week.weekStartISO); setDetailedGraphRange('currentWeek'); setDetailedPrayerRange('currentWeek'); setDetailedWeekPickerVisible(false); }}
                          style={[styles.statsCalendarItem, { borderColor: theme.border, backgroundColor: isActive ? theme.button : theme.card }]}
                        >
                          <Text style={{ color: isActive ? theme.buttonText : theme.text, fontWeight: '700' }}>{week.label}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            ) : null}

            {isDetailedCalendarVisible ? (
              <View style={styles.detailedInlineCalendarOverlay}>
                <View style={[styles.detailedInlineCalendarCard, { backgroundColor: theme.bg, borderColor: theme.border }]}> 
                  <View style={styles.privacyModalHeader}>
                    <Text style={[styles.privacyModalTitle, { color: theme.text }]}>Datum auswählen</Text>
                    <Pressable onPress={() => setDetailedCalendarVisible(false)} style={withPressEffect(styles.privacyModalCloseBtn)}>
                      <Text style={[styles.privacyModalCloseText, { color: theme.muted }]}>Schließen</Text>
                    </Pressable>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.statsCalendarBody}>
                    {selectedStatsDateISO && selectedStatsDateISO !== todayISO ? (
                      <Pressable
                        onPress={() => { setSelectedStatsDateISO(todayISO); setDetailedCalendarVisible(false); }}
                        style={[styles.statsCalendarResetBtn, { borderColor: theme.border, backgroundColor: theme.bg }]}
                      >
                        <Text style={[styles.statsCalendarResetBtnText, { color: theme.text }]}>Auf heute zurücksetzen ({formatStatsDateShort(todayISO)})</Text>
                      </Pressable>
                    ) : null}
                    {availableStatsDates.length === 0 ? (
                      <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>Keine Datumswerte verfügbar.</Text>
                    ) : availableStatsDates.map((iso) => {
                      const dateObj = parseISO(iso);
                      const label = dateObj ? formatStatsDateShort(iso) : iso;
                      const isActive = iso === selectedStatsDateISO;
                      const isTodayEntry = iso === todayISO;
                      return (
                        <Pressable
                          key={`detailed_${iso}`}
                          onPress={() => { setSelectedStatsDateISO(iso); setDetailedCalendarVisible(false); }}
                          style={[styles.statsCalendarItem, { borderColor: theme.border, backgroundColor: isActive ? theme.button : theme.card }]}
                        >
                          <Text style={{ color: isActive ? theme.buttonText : theme.text, fontWeight: '700' }}>{isTodayEntry ? `${label} (heute)` : label}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            ) : null}
          </SafeAreaView>
        </View>
      </Modal>


      {toast ? (
        <View style={[styles.toast, { backgroundColor: getToastTone(toast) === 'negative' ? '#DC2626' : '#16A34A' }]}><Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{toast}</Text></View>
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
  basmalaText: { textAlign: 'center', fontSize: 14, lineHeight: 20, paddingTop: 6, paddingBottom: 2, fontFamily: Platform.select({ ios: 'Geeza Pro', default: 'serif' }), transform: [{ translateY: 8 }] },
  logoWrap: { alignItems: 'center', paddingBottom: 6, transform: [{ translateY: 8 }] },
  logoImage: { width: 34, height: 34, opacity: 0.92, backgroundColor: 'transparent' },
  accountSessionCenterWrap: { alignItems: 'center', marginTop: 2, marginBottom: 8 },
  accountSessionCenterName: { fontSize: 13, fontWeight: '700' },
  accountSessionCenterLogoutBtn: { marginTop: 2, paddingVertical: 2, paddingHorizontal: 8 },
  accountSessionCenterLogoutText: { fontSize: 12, fontWeight: '600' },
  content: { flexGrow: 1, padding: 16, gap: 10, paddingBottom: 16 },
  contentTablet: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 26, gap: 14 },
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
  settingsMosqueHighlightCard: { borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', marginTop: 6 },
  settingsMosqueHighlightTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  settingsMosqueHighlightValue: { marginTop: 4, fontSize: 20, fontWeight: '800' },
  settingsHeroTitle: { textAlign: 'center', fontSize: 22, fontWeight: '700', letterSpacing: 0.2 },
  settingsHeroMeta: { textAlign: 'center', fontSize: 13, fontWeight: '500' },
  mergeSwitchWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  mergeSwitchLabel: { fontSize: 14, fontWeight: '600' },
  mergeInputWrap: { gap: 12, marginTop: 4 },
  mergeInputDisabled: { opacity: 0.45 },
  mergeInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, textAlign: 'center', fontSize: 15, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionTitleTablet: { fontSize: 22 },
  activeMosqueSection: { alignItems: 'center' },
  activeMosqueSectionTitle: { textAlign: 'center' },
  activeMosqueSectionCurrent: { marginTop: 4, textAlign: 'center' },
  activeMosqueToggleRow: { width: '100%', justifyContent: 'center' },
  modeSwitch: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 10, marginBottom: 6 },
  modeSwitchText: { fontSize: 14, fontWeight: '700' },
  modeSwitchTextTablet: { fontSize: 20 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  presetBtnText: { fontSize: 13, fontWeight: '700' },
  presetBtnTextTablet: { fontSize: 18 },
  saveBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  settingsSaveBtn: { marginTop: 4, alignSelf: 'center', width: '68%' },
  saveBtnText: { fontSize: 14, fontWeight: '700' },
  saveBtnTextTablet: { fontSize: 18 },
  registrationConfirmBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', backgroundColor: '#16A34A' },
  registrationConfirmBtnText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  registrationVoterInfoCard: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10 },
  registrationVoterInfoHeadline: { fontSize: 18, fontWeight: '800', textAlign: 'center', lineHeight: 24 },
  registrationVoterInfoDetail: { marginTop: 6, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  noteText: { fontSize: 12, fontWeight: '600' },
  announcementCard: { marginTop: 14, borderWidth: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14, gap: 8 },
  announcementCardTablet: { marginTop: 18, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 18 },
  announcementTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  announcementTitleTablet: { fontSize: 14 },
  announcementBody: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  announcementBodyTablet: { fontSize: 18, lineHeight: 28 },
  announcementBodyBold: { fontWeight: '800' },
  announcementBodyItalic: { fontStyle: 'italic' },
  announcementBodyStrike: { textDecorationLine: 'line-through' },
  announcementInput: { borderWidth: 1, borderRadius: 12, minHeight: 124, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, lineHeight: 22 },
  announcementInputTablet: { minHeight: 154, fontSize: 17, lineHeight: 26, paddingHorizontal: 14, paddingVertical: 14 },
  announcementActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  announcementActionsTablet: { marginTop: 6, gap: 12 },
  announcementActionBtn: { flex: 1 },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, minHeight: 52, paddingHorizontal: 6 },
  tabBarTablet: { minHeight: 72, paddingHorizontal: 16 },
  tabBarTabletWebCompact: { minHeight: 44, paddingHorizontal: 10 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  tabItemTabletWebCompact: { paddingVertical: 5 },
  buttonPressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  qrPageCard: { alignItems: 'center', paddingVertical: 22, gap: 14 },
  qrPageTitle: { textAlign: 'center', fontSize: 24, fontWeight: '800' },
  qrPageSubtitle: { textAlign: 'center', fontSize: 14, fontWeight: '600' },
  qrPageHint: { textAlign: 'center', fontSize: 12, fontWeight: '600' },
  qrPageCloseBtn: { alignSelf: 'stretch', marginTop: 4 },
  qrCodeCard: { borderWidth: 1, borderRadius: 20, padding: 16, alignItems: 'center', justifyContent: 'center' },
  qrCodeImage: { width: 280, height: 280 },
  qrCodePreloadImage: { width: 1, height: 1, opacity: 0, position: 'absolute' },
  qrTimerChip: { alignSelf: 'center', borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  qrTimerText: { fontSize: 14, fontWeight: '800' },
  qrStatusCard: { borderWidth: 1, borderRadius: 14, padding: 12, backgroundColor: 'rgba(59,130,246,0.08)' },
  qrStatusCardPositive: { backgroundColor: 'rgba(34,197,94,0.14)' },
  qrStatusCardNegative: { backgroundColor: 'rgba(239,68,68,0.14)' },
  qrStatusText: { textAlign: 'center', fontSize: 14, fontWeight: '700' },
  qrRegisteredMeta: { textAlign: 'center', fontSize: 12, fontWeight: '600' },
  qrDeviceHintCard: { borderWidth: 1, borderRadius: 14, padding: 12 },
  qrDeviceHintText: { textAlign: 'center', fontSize: 13, lineHeight: 20, fontWeight: '600' },
  terminalInlineQrCard: { marginTop: 14, borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center' },
  terminalInlineQrTitle: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  terminalInlineQrHint: { marginTop: 4, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  terminalInlineQrImageWrap: { marginTop: 10, borderWidth: 1, borderRadius: 12, padding: 8 },
  terminalInlineQrImage: { width: 180, height: 180 },
  terminalInlineQrTimerChip: { marginTop: 10, borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  terminalInlineQrTimerText: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  tabLabel: { fontSize: 9, textAlign: 'center', width: '100%' },
  tabLabelTablet: { fontSize: 12 },
  tabLabelTabletWebCompact: { fontSize: 10 },
  toast: { position: 'absolute', bottom: 68, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  bigTerminalBtn: { borderRadius: 18, minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  bigTerminalText: { fontSize: 34, fontWeight: '800' },
  terminalBanner: { borderRadius: 16, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  terminalBannerTitle: { textAlign: 'center', fontSize: 20, fontWeight: '800', letterSpacing: 0.2 },
  terminalBannerArabic: { textAlign: 'center', marginTop: 2, fontSize: 16, fontFamily: Platform.select({ ios: 'Geeza Pro', default: 'serif' }) },
  terminalBannerSubtitle: { textAlign: 'center', marginTop: 4, fontSize: 13, fontWeight: '600' },
  currentPrayerCard: { borderRadius: 16, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  currentPrayerText: { textAlign: 'center', fontSize: 20, fontWeight: '800' },
  headlineBlock: { alignItems: 'center', gap: 4 },
  headlineTitleText: { textAlign: 'center', fontSize: 24, fontWeight: '900', lineHeight: 30 },
  headlineSubtitleText: { textAlign: 'center', fontSize: 17, fontWeight: '700', lineHeight: 23 },
  headlineExtraText: { textAlign: 'center', fontSize: 14, fontWeight: '600', lineHeight: 20, opacity: 0.85 },
  noPrayerTitle: { textAlign: 'center', alignSelf: 'center', fontSize: 18, fontWeight: '800', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, overflow: 'hidden', letterSpacing: 0.2 },
  noPrayerTitleLight: { backgroundColor: '#FFF4A3', color: '#111111' },
  noPrayerTitleDark: { backgroundColor: '#FFF4A3', color: '#111111' },
  noPrayerCountdownChip: { alignSelf: 'center', marginTop: 12, borderRadius: 12, borderWidth: 2, paddingVertical: 8, paddingHorizontal: 12 },
  noPrayerCountdownText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
  nextPrayerValue: { textAlign: 'center', fontSize: 20, fontWeight: '800', marginTop: 4 },
  programScheduledHint: { marginTop: 10, borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', gap: 4 },
  programScheduledLabel: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  programScheduledValue: { fontSize: 16, fontWeight: '700', textAlign: 'center', lineHeight: 22 },
  urduText: { textAlign: 'center', fontSize: 16, marginTop: -2, marginBottom: 4 },

  privacyNoticeWrap: { marginTop: 34, paddingHorizontal: 6, alignItems: 'center' },
  privacyNoticeText: { textAlign: 'center', fontSize: 12, lineHeight: 18, fontWeight: '400' },
  privacyNoticeLinkWrap: { marginTop: 8, paddingVertical: 2, paddingHorizontal: 4 },
  privacyNoticeLinkText: { fontSize: 12, lineHeight: 16, fontWeight: '400', textDecorationLine: 'underline' },
  quickSearchLinkWrap: { marginTop: 6, alignSelf: 'center' },
  quickSearchLinkText: { fontSize: 12, lineHeight: 16, fontWeight: '400', textDecorationLine: 'underline' },
  quickSearchPanel: { marginTop: -2, borderWidth: 1, borderRadius: 12, padding: 10, gap: 8 },
  quickSearchResultsWrap: { gap: 8, marginTop: 4 },
  quickSearchResultCard: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 10 },
  quickSearchResultText: { fontSize: 14, fontWeight: '700' },
  privacyModalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.35)', justifyContent: 'center', padding: 16 },
  privacyModalCard: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  privacyModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  privacyModalTitle: { fontSize: 24, fontWeight: '700', letterSpacing: 0.2 },
  privacyModalCloseBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  privacyModalCloseText: { fontSize: 14, fontWeight: '500' },
  privacyModalBody: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 4 },
  statsCalendarBody: { paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  statsCalendarItem: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12 },
  statsCalendarResetBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', marginBottom: 2 },
  statsCalendarResetBtnText: { fontSize: 12, fontWeight: '700' },
  privacyModalHeroTitle: { fontSize: 23, fontWeight: '700', lineHeight: 30, marginTop: 4, marginBottom: 8 },
  privacySection: { marginTop: 18 },
  privacySectionLast: { marginBottom: 10 },
  privacySectionTitle: { fontSize: 17, fontWeight: '600', lineHeight: 24, marginBottom: 10 },
  privacyParagraph: { fontSize: 15, lineHeight: 24, fontWeight: '400', marginBottom: 10 },
  privacyParagraphBold: { fontWeight: '700' },
  privacyBulletRow: { flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 4, marginBottom: 8 },
  privacyBulletDot: { width: 16, fontSize: 15, lineHeight: 24, fontWeight: '500' },
  privacyBulletText: { flex: 1, fontSize: 15, lineHeight: 24, fontWeight: '400' },
  privacyDivider: { height: 1, marginTop: 10, opacity: 0.45 },
  guestButtonRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  guestButtonSpacer: { flex: 1 },
  guestButton: { flex: 1 },
  guestButtonLightOutline: { borderWidth: 1, borderColor: '#FFFFFF' },
  idSearchInput: { marginTop: -8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  idGridWrap: { marginTop: 12 },
  tanzeemRow: { flexDirection: 'row', gap: 10 },
  tanzeemBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  tanzeemBtnTablet: { minHeight: 72, justifyContent: 'center' },
  statsHeaderCard: { borderRadius: 16, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  statsHeaderTitle: { fontSize: 28, fontWeight: '800', letterSpacing: 0.2, textAlign: 'center' },
  statsHeaderDate: { marginTop: 2, fontSize: 16, fontWeight: '600', textTransform: 'capitalize', textAlign: 'center' },
  statsHeaderSubline: { marginTop: 3, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  statsHeaderLocationChip: { alignSelf: 'center', borderRadius: 10, paddingVertical: 5, paddingHorizontal: 10, marginTop: 6 },
  statsHeaderLocationChipText: { fontSize: 15, fontWeight: '700' },
  statsHeaderDivider: { marginTop: 10, height: 1, width: '100%' },
  statsExportBtn: { marginTop: 12, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  statsExportBtnText: { fontSize: 13, fontWeight: '700' },
  statsExportModalCard: { borderWidth: 1, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 14, gap: 12, width: '100%', maxWidth: 460, alignSelf: 'center' },
  statsExportModalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  statsExportModalActions: { gap: 8 },
  statsExportOptionBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center' },
  statsExportOptionBtnText: { fontSize: 14, fontWeight: '700' },
  statsExportCloseBtn: { marginTop: 2, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  statsExportCloseBtnText: { fontSize: 13, fontWeight: '700' },
  statsToggleRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  statsToggleBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 9, alignItems: 'center' },
  statsToggleBtnText: { fontSize: 12, fontWeight: '700' },
  statsCycler: { flex: 1, borderWidth: 1, borderRadius: 12, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  statsCyclerArrowBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  statsCyclerArrow: { fontSize: 14, fontWeight: '800' },
  statsCyclerValue: { fontSize: 14, fontWeight: '700' },
  statsCalendarBtn: { marginTop: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center' },
  statsCalendarBtnText: { fontSize: 12, fontWeight: '700' },
  chartWrap: { marginTop: 12 },
  chartCanvas: { width: '100%', borderWidth: 1, borderRadius: 12, position: 'relative', overflow: 'hidden' },
  chartAxisTitleY: { marginBottom: 6, marginLeft: 6, fontSize: 11, fontWeight: '800' },
  chartAxisY: { position: 'absolute', width: 2 },
  chartAxisX: { position: 'absolute', height: 2 },
  chartGridLine: { position: 'absolute', borderTopWidth: 1 },
  chartYTickLabel: { position: 'absolute', left: 4, width: 26, textAlign: 'right', fontSize: 10, fontWeight: '600' },
  chartSegment: { position: 'absolute', borderRadius: 999 },
  chartPointTouchTarget: { position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  chartPoint: { borderWidth: 2, borderRadius: 999 },
  chartTooltip: { position: 'absolute', maxWidth: 170, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  chartTooltipText: { fontSize: 11, fontWeight: '700' },
  chartLabelsRow: { marginTop: 8, position: 'relative' },
  chartEqualLabel: { position: 'absolute', width: 56 },
  chartAxisTitleX: { marginTop: 6, textAlign: 'center', fontSize: 11, fontWeight: '800' },
  chartLabel: { textAlign: 'center', fontSize: 11, fontWeight: '600' },
  chartLabelCompact: { fontSize: 9, textAlign: 'center' },
  chartLegendRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chartLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chartLegendDot: { width: 10, height: 10, borderRadius: 999 },
  chartLegendText: { fontSize: 12, fontWeight: '600' },
  statsInsightWrap: { marginTop: 12, gap: 4 },
  statsInsightText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  statsCard: { borderRadius: 16, borderWidth: 1, padding: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  statsCardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  statsCardMiniSwitch: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statsCardMiniSwitchMobile: { maxWidth: '50%', paddingHorizontal: 8 },
  statsCardMiniSwitchText: { fontSize: 11, fontWeight: '700' },
  statsCardMiniSwitchTextMobile: { fontSize: 10 },
  statsCardTitle: { fontSize: 13, fontWeight: '700' },
  statsCardRangeInfo: { marginTop: 2, fontSize: 11, fontWeight: '600' },
  statsBigValue: { fontSize: 40, fontWeight: '800', marginTop: 4 },
  tanzeemStatsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  tanzeemStatBox: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  tanzeemStatValue: { fontSize: 26, fontWeight: '800', lineHeight: 30 },
  tanzeemStatLabel: { marginTop: 2, fontSize: 12, fontWeight: '600' },
  majlisBarRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  majlisBarLabel: { width: 120, fontSize: 12, fontWeight: '600' },
  majlisBarTrack: { flex: 1, height: 10, borderRadius: 999, overflow: 'hidden' },
  majlisBarFill: { height: '100%', borderRadius: 999 },
  majlisBarValue: { width: 40, textAlign: 'right', fontSize: 11, fontWeight: '700' },
  barRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 120, fontSize: 12, fontWeight: '600' },
  barTrack: { flex: 1, height: 10, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  barValue: { width: 24, textAlign: 'right', fontSize: 12, fontWeight: '700' },
  statsRankingRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  statsRankingLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  statsRankingValue: { minWidth: 30, textAlign: 'right', fontSize: 14, fontWeight: '800' },
  statsRankingBarLabel: { width: 230, fontSize: 12, fontWeight: '600' },
  statsDetailOpenBtn: { marginTop: 10, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  statsDetailOpenBtnText: { fontSize: 13, fontWeight: '700' },
  detailedIdModalBody: { paddingHorizontal: 14, paddingBottom: 18, gap: 8 },
  detailedIdModalBodyCompact: { justifyContent: 'flex-start', paddingTop: 6, paddingBottom: 8 },
  detailedInlineCalendarOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 12, zIndex: 5 },
  detailedInlineCalendarCard: { borderWidth: 1, borderRadius: 16, maxHeight: '82%', overflow: 'hidden' },
  detailedGuideCard: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  detailedGuideTitle: { fontSize: 15, fontWeight: '800' },
  detailedGuideText: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  detailedGuideHint: { textAlign: 'center', fontSize: 13, fontWeight: '700', marginTop: 10 },
  detailedIdSectionWrap: { marginTop: 6, gap: 6 },
  detailedIdChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailedIdChip: { borderWidth: 1, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 8 },
  detailedIdListWrap: { marginTop: 8, gap: 6 },
  detailedIdRow: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '48%', borderWidth: 1, borderRadius: 12, paddingVertical: 18, paddingHorizontal: 8 },
  gridItemTablet: { width: '31.8%', paddingVertical: 24 },
  gridItemCounted: { opacity: 0.9 },
  gridText: { textAlign: 'center', fontWeight: '700' },
  gridTextTablet: { fontSize: 18 },
  gridSubText: { textAlign: 'center', marginTop: 4, fontSize: 11, fontWeight: '500' },
});
