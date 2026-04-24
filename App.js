import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storageasync-storage';
import  as Crypto from 'expo-crypto';
import  as FileSystem from 'expo-file-systemlegacy';
import  as Sharing from 'expo-sharing';
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
import  as XLSX from 'xlsx';

const STORAGE_KEYS = {
  darkMode '@tasbeeh_darkmode',
  activeMosque '@tasbeeh_active_mosque',
  programConfigsByDate '@tasbeeh_program_configs_by_date',
  announcementText '@tasbeeh_announcement_text',
  qrBrowserDeviceId '@tasbeeh_qr_browser_device_id',
  qrRegistration '@tasbeeh_qr_registration',
  qrActivePage '@tasbeeh_qr_active_page',
  guestActivation '@tasbeeh_guest_activation',
  guestExternUnlocked '@tasbeeh_guest_extern_unlocked',
  guestExternalConfig '@tasbeeh_guest_external_config',
  terminalInactivityConfig '@tasbeeh_terminal_inactivity_config',
};

const QR_REGISTRATION_COLLECTION = 'attendance_qr_device_registrations';
const QR_SCAN_PARAM = 'qrCheckin';
const QR_REFRESH_INTERVAL_MS = 5  60  1000;
const QR_COUNTDOWN_SECONDS = Math.floor(QR_REFRESH_INTERVAL_MS  1000);

const getDarkModeStorageKey = (mosqueKey) = `${STORAGE_KEYS.darkMode}${String(mosqueKey  DEFAULT_MOSQUE_KEY)}`;
const getAnnouncementStorageKey = (mosqueKey) = `${STORAGE_KEYS.announcementText}${String(mosqueKey  DEFAULT_MOSQUE_KEY)}`;
const getTerminalInactivityStorageKey = (mosqueKey, externalScopeKey = '') = `${STORAGE_KEYS.terminalInactivityConfig}${String(mosqueKey  DEFAULT_MOSQUE_KEY)}${normalizeExternalScopeKey(externalScopeKey  'default')  'default'}`;

const DEFAULT_MOSQUE_KEY = 'baitus_sabuh';
const EXTERNAL_MOSQUE_KEY = 'external_guest';
const APP_MODE = 'full';  'full', 'extern' (legacy 'guest'), 'display', 'qr', 'qr_extern', 'secret' oder 'registration'
const SECRET_QR_APP_URL = 'httpsqr-terminal.web.app';  Optional eigener geheimer Scan-Host, z. B. httpsscan.example.com
const MOSQUE_OPTIONS = [
  { key DEFAULT_MOSQUE_KEY, label 'Bait-Us-Sabuh', suffix '' },
  { key 'nuur_moschee', label 'Nuur-Moschee', suffix 'NUUR' },
  { key 'roedelheim', label 'Rödelheim', suffix 'RO' },
  { key 'hoechst', label 'Höchst', suffix 'HO' },
  { key EXTERNAL_MOSQUE_KEY, label 'Extern', suffix 'EXT' },
];
const INTERNAL_SHARED_REGISTRATION_MOSQUE_KEYS = new Set([DEFAULT_MOSQUE_KEY, 'nuur_moschee', 'roedelheim', 'hoechst']);
const APP_LOGO_LIGHT = require('.assetsIcon3.png');
const APP_LOGO_DARK = require('.assetsIcon5.png');
const FORCE_TIME = null;
 const FORCE_TIME = '0531';  development override for testing
const FORCE_TEST_DATE_ENABLED = false;
const FORCE_TEST_DATE_ISO = '2026-03-15';  development override for testing (YYYY-MM-DD)
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
  ansar 'Ansar',
  khuddam 'Khuddam',
  atfal 'Atfal',
  kinder 'Kinder',
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
const MEMBER_DIRECTORY_DATA = [ {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber10007,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber10898,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber11431,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber12722,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber12770,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber18380,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber19604,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber21096,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber21323,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber21325,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber32258,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber32547,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33203,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33243,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33413,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33429,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33442,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33454,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33459,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33470,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33492,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33496,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33517,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33521,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33542,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33550,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33563,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33567,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33591,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber35031,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber35473,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber37326,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber39580,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber42515,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber42557,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber49472,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber52117,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber53470,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber61100,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber61101,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber66696,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber75720,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber10010,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber11435,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber11434,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber12775,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber12772,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber12773,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber13650,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber15125,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber39362,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber40812,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber21328,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber27050,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber27096,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber31634,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33209,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33245,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber35438,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber37155,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33444,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33458,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33494,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33499,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33519,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33518,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33526,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33524,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber39369,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33552,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33566,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33569,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber35432,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33593,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33605,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber40813,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber35930,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber39582,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber39583,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber40267,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber40268,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber40438,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber42442,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber49715,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber46297,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber50083,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber51306,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber53176,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber53345,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber62890,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber59868,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber61104,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber61103,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber61759,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber75096,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber53054,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber56041,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber63316,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber45496,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber50372,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber58749,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber59332,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber59880,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber59440,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber62891,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber62892,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber63300,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber68300,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber76494,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber75241,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber75869,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber67158,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber75915,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber73267,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber71927,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber66171,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber75866,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber26915,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber32118,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber32127,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber32151,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber32456,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33036,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33136,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33329,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33416,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33418,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33421,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33424,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33436,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33439,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33507,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33534,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33538,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33544,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33574,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33586,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber34321,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber34342,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber34479,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber34487,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber35005,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber35086,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber35173,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber37095,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber37888,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber41819,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber53379,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber54926,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber59916,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber16303,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber39538,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber39539,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber32154,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber32155,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber32458,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber37140,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber32954,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33039,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33138,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33331,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33419,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33425,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber35433,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33482,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33511,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33523,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33537,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33536,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33549,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33561,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33562,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber41549,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber34323,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber34340,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber34341,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber34484,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber35145,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber35146,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber49809,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber39824,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber36856,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber37097,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber37892,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber37890,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber40407,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber40408,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber40406,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber41214,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber44173,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber45577,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber52274,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber42742,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber47849,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber49815,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber59227,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber61530,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber57971,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber42959,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber47989,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber73009,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBaitus Sabuh Süd,idNumber66416,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBaitus Sabuh Süd,idNumber65803,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBaitus Sabuh Süd,idNumber71907,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBaitus Sabuh Süd,idNumber64287,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBaitus Sabuh Süd,idNumber66772,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBaitus Sabuh Süd,idNumber74411,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBaitus Sabuh Süd,idNumber76444,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBornheim,idNumber10881,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber13811,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber16348,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBornheim,idNumber19372,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBornheim,idNumber21394,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber25867,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBornheim,idNumber26843,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBornheim,idNumber33167,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBornheim,idNumber33185,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber33188,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBornheim,idNumber33193,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBornheim,idNumber33230,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber33241,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBornheim,idNumber33272,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBornheim,idNumber33281,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber33289,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBornheim,idNumber33292,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber33301,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBornheim,idNumber33303,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBornheim,idNumber33309,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber33318,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber33321,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber33325,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber33323,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber33332,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber37087,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber37393,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber37904,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBornheim,idNumber39247,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber40372,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBornheim,idNumber40434,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBornheim,idNumber40841,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber41603,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBornheim,idNumber41750,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber42225,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber43702,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBornheim,idNumber44573,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber44609,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBornheim,idNumber47617,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBornheim,idNumber49791,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber50013,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBornheim,idNumber51460,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber62054,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBornheim,idNumber62807,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBornheim,idNumber63924,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBornheim,idNumber13814,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBornheim,idNumber13815,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBornheim,idNumber13816,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber16352,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBornheim,idNumber16353,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBornheim,idNumber16350,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBornheim,idNumber17269,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber19124,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber65202,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber25869,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber25871,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber30774,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBornheim,idNumber33175,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber33183,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber33184,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber33195,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber33271,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber33283,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber33284,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber40127,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber33308,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBornheim,idNumber33312,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBornheim,idNumber39106,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber33320,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBornheim,idNumber36419,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber38367,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber40435,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber51670,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber45463,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBornheim,idNumber45564,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBornheim,idNumber46064,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber47878,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber47901,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber63385,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber51160,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber51157,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBornheim,idNumber51159,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBornheim,idNumber66527,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBornheim,idNumber74265,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber57711,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber65204,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber51349,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber54643,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber42260,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber58848,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber58849,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber49648,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber55834,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber55836,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber42698,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber59817,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber41313,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber67153,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber45889,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber61545,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber51673,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber58608,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber59342,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber47621,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber70879,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBornheim,idNumber70880,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBornheim,idNumber75814,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBornheim,idNumber68134,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBornheim,idNumber73577,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBornheim,idNumber76461,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBornheim,idNumber68603,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBornheim,idNumber71527,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBornheim,idNumber71528,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBornheim,idNumber64495,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBornheim,idNumber67035,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBornheim,idNumber62775,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBornheim,idNumber64342,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBornheim,idNumber70096,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisEschersheim,idNumber15099,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisEschersheim,idNumber16289,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisEschersheim,idNumber16701,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisEschersheim,idNumber22534,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisEschersheim,idNumber27321,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisEschersheim,idNumber32086,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisEschersheim,idNumber32285,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisEschersheim,idNumber32287,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisEschersheim,idNumber32813,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisEschersheim,idNumber33016,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisEschersheim,idNumber33085,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisEschersheim,idNumber33213,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisEschersheim,idNumber33252,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisEschersheim,idNumber33255,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisEschersheim,idNumber33345,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisEschersheim,idNumber33350,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisEschersheim,idNumber33355,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisEschersheim,idNumber33358,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisEschersheim,idNumber33366,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisEschersheim,idNumber33371,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisEschersheim,idNumber33376,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisEschersheim,idNumber33388,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisEschersheim,idNumber33393,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisEschersheim,idNumber33474,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisEschersheim,idNumber33777,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisEschersheim,idNumber35008,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisEschersheim,idNumber35027,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisEschersheim,idNumber35039,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisEschersheim,idNumber35050,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisEschersheim,idNumber35558,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisEschersheim,idNumber35977,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisEschersheim,idNumber36023,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisEschersheim,idNumber36169,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisEschersheim,idNumber38458,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisEschersheim,idNumber39775,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisEschersheim,idNumber56168,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisEschersheim,idNumber15102,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber15101,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber20400,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisEschersheim,idNumber26899,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisEschersheim,idNumber32089,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber32289,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber32887,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber47785,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber47786,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber33087,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber33217,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber33215,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisEschersheim,idNumber33257,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber33258,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber33344,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber33341,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisEschersheim,idNumber33342,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber33347,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber33348,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber33349,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber33353,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisEschersheim,idNumber33369,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisEschersheim,idNumber33368,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisEschersheim,idNumber33375,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisEschersheim,idNumber33379,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber33390,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber33391,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber33397,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber33395,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisEschersheim,idNumber33476,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber33477,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber42634,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber33491,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber33781,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber33783,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber33784,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber35010,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber36589,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber35041,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber35055,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber49986,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber49987,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber41896,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber45274,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisEschersheim,idNumber55175,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber59136,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber57080,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber70397,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisEschersheim,idNumber75204,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisEschersheim,idNumber56194,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisEschersheim,idNumber72105,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisEschersheim,idNumber41734,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisEschersheim,idNumber47793,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisEschersheim,idNumber42635,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisEschersheim,idNumber61720,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisEschersheim,idNumber66414,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisEschersheim,idNumber56797,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisEschersheim,idNumber68214,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisEschersheim,idNumber73489,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisEschersheim,idNumber72106,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGriesheim,idNumber11491,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGriesheim,idNumber16114,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGriesheim,idNumber16290,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGriesheim,idNumber32257,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGriesheim,idNumber32334,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGriesheim,idNumber32357,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGriesheim,idNumber32359,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisGriesheim,idNumber32401,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGriesheim,idNumber32411,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGriesheim,idNumber32437,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGriesheim,idNumber32481,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGriesheim,idNumber32487,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGriesheim,idNumber32489,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGriesheim,idNumber32499,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGriesheim,idNumber32510,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGriesheim,idNumber32530,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGriesheim,idNumber32549,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGriesheim,idNumber32554,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGriesheim,idNumber32558,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGriesheim,idNumber32563,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGriesheim,idNumber32580,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGriesheim,idNumber32581,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGriesheim,idNumber32743,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGriesheim,idNumber32753,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGriesheim,idNumber32765,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGriesheim,idNumber32784,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGriesheim,idNumber32818,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGriesheim,idNumber32840,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGriesheim,idNumber32935,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGriesheim,idNumber33510,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGriesheim,idNumber36665,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGriesheim,idNumber37522,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGriesheim,idNumber37887,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGriesheim,idNumber40590,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGriesheim,idNumber42144,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGriesheim,idNumber44895,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisGriesheim,idNumber45589,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGriesheim,idNumber46610,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGriesheim,idNumber48066,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGriesheim,idNumber48850,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisGriesheim,idNumber50576,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGriesheim,idNumber70226,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGriesheim,idNumber11493,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGriesheim,idNumber11494,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber11495,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber11496,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber40236,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber16472,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGriesheim,idNumber19401,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber20402,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber20534,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber32413,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisGriesheim,idNumber32415,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGriesheim,idNumber32442,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber32485,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisGriesheim,idNumber32486,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGriesheim,idNumber32491,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisGriesheim,idNumber32513,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber32553,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGriesheim,idNumber32556,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGriesheim,idNumber32561,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisGriesheim,idNumber32578,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber32582,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber32627,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber32756,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber32766,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisGriesheim,idNumber32768,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGriesheim,idNumber32767,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisGriesheim,idNumber34549,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber32844,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber32937,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGriesheim,idNumber33352,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisGriesheim,idNumber40013,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber38041,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber38277,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber38278,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber39787,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber32423,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber32422,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber42160,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber44097,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGriesheim,idNumber53248,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber53249,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber45931,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber46593,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber50869,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGriesheim,idNumber55107,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGriesheim,idNumber55625,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGriesheim,idNumber56257,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGriesheim,idNumber57404,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGriesheim,idNumber58273,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber59474,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGriesheim,idNumber61117,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber66636,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGriesheim,idNumber70351,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber75876,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGriesheim,idNumber76464,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGriesheim,idNumber61195,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGriesheim,idNumber64169,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGriesheim,idNumber51683,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGriesheim,idNumber67171,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGriesheim,idNumber69442,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGriesheim,idNumber59642,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGriesheim,idNumber61794,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGriesheim,idNumber49800,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGriesheim,idNumber51900,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGriesheim,idNumber59644,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGriesheim,idNumber47363,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGriesheim,idNumber64054,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGriesheim,idNumber59064,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGriesheim,idNumber51555,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGriesheim,idNumber68023,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGriesheim,idNumber59643,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGriesheim,idNumber52376,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGriesheim,idNumber74461,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGriesheim,idNumber74462,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisGriesheim,idNumber64055,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisGriesheim,idNumber66652,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisGriesheim,idNumber65536,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisGriesheim,idNumber75238,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisGriesheim,idNumber66219,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisGriesheim,idNumber71297,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisGriesheim,idNumber76385,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBerg,idNumber26614,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisBerg,idNumber32156,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBerg,idNumber32158,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBerg,idNumber32173,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBerg,idNumber32182,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBerg,idNumber32194,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBerg,idNumber32214,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBerg,idNumber32215,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBerg,idNumber32225,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBerg,idNumber32234,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBerg,idNumber32236,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBerg,idNumber32241,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBerg,idNumber32247,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBerg,idNumber32256,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBerg,idNumber32260,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBerg,idNumber32265,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBerg,idNumber32268,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBerg,idNumber32514,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBerg,idNumber33278,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBerg,idNumber33365,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBerg,idNumber33867,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBerg,idNumber42191,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBerg,idNumber43145,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBerg,idNumber43737,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisBerg,idNumber48500,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBerg,idNumber55042,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisBerg,idNumber60538,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBerg,idNumber10572,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBerg,idNumber12570,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBerg,idNumber27042,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBerg,idNumber32175,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBerg,idNumber32185,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBerg,idNumber32186,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBerg,idNumber32199,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBerg,idNumber32228,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBerg,idNumber39738,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBerg,idNumber32246,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBerg,idNumber32251,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBerg,idNumber32264,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBerg,idNumber39090,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBerg,idNumber34643,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBerg,idNumber32270,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBerg,idNumber38205,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBerg,idNumber35308,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBerg,idNumber33382,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBerg,idNumber33737,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBerg,idNumber37906,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBerg,idNumber41622,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBerg,idNumber55056,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBerg,idNumber52449,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisBerg,idNumber47015,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisBerg,idNumber60541,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBerg,idNumber72011,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBerg,idNumber49518,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBerg,idNumber63705,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBerg,idNumber63706,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBerg,idNumber47440,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBerg,idNumber49869,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBerg,idNumber50537,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBerg,idNumber61971,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBerg,idNumber55057,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBerg,idNumber60542,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBerg,idNumber69004,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBerg,idNumber71867,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBerg,idNumber65537,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBerg,idNumber70141,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBerg,idNumber66115,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisBerg,idNumber71071,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGinnheim,idNumber14690,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGinnheim,idNumber27322,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGinnheim,idNumber32083,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGinnheim,idNumber32090,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGinnheim,idNumber32109,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGinnheim,idNumber32123,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGinnheim,idNumber32130,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGinnheim,idNumber32137,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGinnheim,idNumber32160,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGinnheim,idNumber32167,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGinnheim,idNumber32170,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisGinnheim,idNumber32171,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisGinnheim,idNumber32178,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGinnheim,idNumber32202,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisGinnheim,idNumber32254,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGinnheim,idNumber32273,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGinnheim,idNumber32296,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGinnheim,idNumber32306,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGinnheim,idNumber32321,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGinnheim,idNumber32328,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGinnheim,idNumber32490,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGinnheim,idNumber32532,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGinnheim,idNumber32533,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGinnheim,idNumber32861,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGinnheim,idNumber32900,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisGinnheim,idNumber33119,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGinnheim,idNumber33147,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGinnheim,idNumber35059,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisGinnheim,idNumber35069,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGinnheim,idNumber38038,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGinnheim,idNumber41274,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGinnheim,idNumber43892,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGinnheim,idNumber45386,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGinnheim,idNumber56554,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGinnheim,idNumber64546,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGinnheim,idNumber64944,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber11935,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber14691,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber18447,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGinnheim,idNumber37971,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber23486,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGinnheim,idNumber32085,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGinnheim,idNumber32124,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber32125,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber32126,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber32140,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGinnheim,idNumber32141,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGinnheim,idNumber32142,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisGinnheim,idNumber32162,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisGinnheim,idNumber32207,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber52433,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber32294,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber32299,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber32300,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber41382,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber32323,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber32324,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber32398,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGinnheim,idNumber32864,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber38435,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber32972,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber33122,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber39418,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber33173,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber33239,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGinnheim,idNumber33240,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisGinnheim,idNumber33871,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGinnheim,idNumber33997,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisGinnheim,idNumber35061,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber35062,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGinnheim,idNumber35071,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGinnheim,idNumber38039,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber44894,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber44896,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisGinnheim,idNumber45355,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGinnheim,idNumber47834,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber49973,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGinnheim,idNumber55148,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber56061,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGinnheim,idNumber56556,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber56557,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber58727,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber62181,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisGinnheim,idNumber63583,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGinnheim,idNumber68318,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGinnheim,idNumber69724,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisGinnheim,idNumber73642,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber74369,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGinnheim,idNumber74999,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGinnheim,idNumber44621,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGinnheim,idNumber47808,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGinnheim,idNumber60321,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGinnheim,idNumber43543,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGinnheim,idNumber67081,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGinnheim,idNumber46448,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGinnheim,idNumber67241,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGinnheim,idNumber58120,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGinnheim,idNumber64548,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGinnheim,idNumber74370,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisGinnheim,idNumber64549,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisGinnheim,idNumber74371,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGoldstein,idNumber24285,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGoldstein,idNumber26845,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGoldstein,idNumber27245,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGoldstein,idNumber32290,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGoldstein,idNumber32292,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisGoldstein,idNumber32316,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGoldstein,idNumber32325,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGoldstein,idNumber32347,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGoldstein,idNumber32353,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGoldstein,idNumber32980,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGoldstein,idNumber33427,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisGoldstein,idNumber33802,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGoldstein,idNumber34364,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGoldstein,idNumber34369,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGoldstein,idNumber35597,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisGoldstein,idNumber45354,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisGoldstein,idNumber45719,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisGoldstein,idNumber50017,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGoldstein,idNumber52377,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisGoldstein,idNumber57131,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGoldstein,idNumber12625,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisGoldstein,idNumber24314,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGoldstein,idNumber39002,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGoldstein,idNumber32349,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGoldstein,idNumber46639,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGoldstein,idNumber46640,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGoldstein,idNumber32496,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisGoldstein,idNumber38840,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGoldstein,idNumber35434,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGoldstein,idNumber33441,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisGoldstein,idNumber33806,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGoldstein,idNumber33805,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGoldstein,idNumber33816,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGoldstein,idNumber33817,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGoldstein,idNumber33818,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGoldstein,idNumber34368,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGoldstein,idNumber34366,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGoldstein,idNumber34970,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisGoldstein,idNumber36635,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGoldstein,idNumber33824,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGoldstein,idNumber37453,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGoldstein,idNumber42306,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisGoldstein,idNumber45229,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGoldstein,idNumber49121,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGoldstein,idNumber52975,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGoldstein,idNumber66138,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGoldstein,idNumber73015,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisGoldstein,idNumber74368,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGoldstein,idNumber74885,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisGoldstein,idNumber75723,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGoldstein,idNumber72305,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGoldstein,idNumber44929,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGoldstein,idNumber55237,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGoldstein,idNumber47968,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGoldstein,idNumber60807,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGoldstein,idNumber47969,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGoldstein,idNumber47607,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGoldstein,idNumber50560,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGoldstein,idNumber55261,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGoldstein,idNumber55234,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisGoldstein,idNumber59747,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisGoldstein,idNumber64249,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisGoldstein,idNumber73786,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisGoldstein,idNumber67517,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisGoldstein,idNumber75724,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisHausen,idNumber32310,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisHausen,idNumber33127,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisHausen,idNumber33152,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisHausen,idNumber33154,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisHausen,idNumber33161,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisHausen,idNumber35209,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisHausen,idNumber44329,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisHausen,idNumber60875,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisHausen,idNumber26792,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHausen,idNumber26794,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHausen,idNumber26795,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHausen,idNumber32313,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisHausen,idNumber32315,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHausen,idNumber33164,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisHausen,idNumber35211,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHausen,idNumber43815,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisHausen,idNumber44159,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHausen,idNumber54481,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHausen,idNumber55281,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisHausen,idNumber55300,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHausen,idNumber55375,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAtfal,majlisHausen,idNumber54496,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisHausen,idNumber63683,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisHausen,idNumber62448,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisHausen,idNumber72091,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisHausen,idNumber74931,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisHausen,idNumber66054,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisHöchst,idNumber20103,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisHöchst,idNumber20406,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisHöchst,idNumber23136,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisHöchst,idNumber30858,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisHöchst,idNumber32362,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisHöchst,idNumber32459,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisHöchst,idNumber32465,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisHöchst,idNumber32493,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisHöchst,idNumber32504,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisHöchst,idNumber32583,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisHöchst,idNumber32594,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisHöchst,idNumber32596,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisHöchst,idNumber32597,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisHöchst,idNumber32612,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisHöchst,idNumber32618,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisHöchst,idNumber32621,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisHöchst,idNumber32632,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisHöchst,idNumber32635,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisHöchst,idNumber32742,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisHöchst,idNumber32929,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisHöchst,idNumber32949,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisHöchst,idNumber32964,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisHöchst,idNumber32967,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisHöchst,idNumber35368,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisHöchst,idNumber35598,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisHöchst,idNumber36197,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisHöchst,idNumber37520,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisHöchst,idNumber39675,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisHöchst,idNumber43077,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisHöchst,idNumber44198,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisHöchst,idNumber47252,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisHöchst,idNumber51187,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisHöchst,idNumber52289,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisHöchst,idNumber52856,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisHöchst,idNumber20409,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisHöchst,idNumber20412,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHöchst,idNumber23139,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisHöchst,idNumber23141,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHöchst,idNumber23138,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisHöchst,idNumber23140,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHöchst,idNumber32365,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisHöchst,idNumber32366,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisHöchst,idNumber32462,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisHöchst,idNumber32469,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisHöchst,idNumber32495,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHöchst,idNumber32497,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisHöchst,idNumber32587,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisHöchst,idNumber32586,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisHöchst,idNumber40998,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHöchst,idNumber32616,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHöchst,idNumber32620,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHöchst,idNumber38805,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHöchst,idNumber32623,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHöchst,idNumber32636,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHöchst,idNumber38816,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHöchst,idNumber32783,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHöchst,idNumber32942,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisHöchst,idNumber33018,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisHöchst,idNumber33163,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisHöchst,idNumber33385,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHöchst,idNumber33386,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHöchst,idNumber36796,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHöchst,idNumber42184,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHöchst,idNumber43537,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisHöchst,idNumber47308,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisHöchst,idNumber52291,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHöchst,idNumber54074,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisHöchst,idNumber54313,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisHöchst,idNumber54552,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisHöchst,idNumber56218,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisHöchst,idNumber60371,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisHöchst,idNumber68492,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisHöchst,idNumber70346,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisHöchst,idNumber42766,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisHöchst,idNumber43919,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisHöchst,idNumber51094,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisHöchst,idNumber57880,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisHöchst,idNumber57881,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisHöchst,idNumber46094,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisHöchst,idNumber62455,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisHöchst,idNumber67430,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisHöchst,idNumber48205,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisHöchst,idNumber47155,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisHöchst,idNumber62368,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisHöchst,idNumber47326,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisHöchst,idNumber58215,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisHöchst,idNumber73978,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisHöchst,idNumber65729,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisHöchst,idNumber74354,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisHöchst,idNumber69775,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisHöchst,idNumber66489,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisHöchst,idNumber70430,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisHöchst,idNumber66949,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisHöchst,idNumber72073,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisHöchst,idNumber69930,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisHöchst,idNumber74720,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisHöchst,idNumber75568,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisHöchst,idNumber66556,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNied,idNumber12658,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNied,idNumber12926,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNied,idNumber12945,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNied,idNumber20238,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNied,idNumber24943,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisNied,idNumber32732,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNied,idNumber32734,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisNied,idNumber32750,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNied,idNumber32775,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNied,idNumber32848,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNied,idNumber32913,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNied,idNumber32922,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNied,idNumber37868,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNied,idNumber38875,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNied,idNumber40884,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNied,idNumber44416,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNied,idNumber64358,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNied,idNumber20241,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNied,idNumber20242,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNied,idNumber37260,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNied,idNumber37261,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNied,idNumber32786,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisNied,idNumber32828,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNied,idNumber32851,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNied,idNumber37351,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNied,idNumber32910,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNied,idNumber32915,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNied,idNumber32916,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNied,idNumber34550,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNied,idNumber32927,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisNied,idNumber32941,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisNied,idNumber39935,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNied,idNumber42857,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisNied,idNumber44346,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNied,idNumber48349,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNied,idNumber58089,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAtfal,majlisNied,idNumber63757,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNied,idNumber46573,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNied,idNumber42745,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNied,idNumber53750,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNied,idNumber61827,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNied,idNumber54315,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNied,idNumber72082,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNied,idNumber75259,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNordweststadt,idNumber27112,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNordweststadt,idNumber32103,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber32135,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNordweststadt,idNumber32143,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNordweststadt,idNumber32237,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNordweststadt,idNumber32524,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber32966,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber32987,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNordweststadt,idNumber33006,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNordweststadt,idNumber33012,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNordweststadt,idNumber33026,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNordweststadt,idNumber33040,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNordweststadt,idNumber33042,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber33053,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNordweststadt,idNumber33062,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNordweststadt,idNumber33071,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber33077,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber33111,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber33115,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber33125,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber33132,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber33139,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber33144,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNordweststadt,idNumber33156,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNordweststadt,idNumber33438,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNordweststadt,idNumber33528,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber33530,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber33950,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNordweststadt,idNumber35045,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber35063,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNordweststadt,idNumber35065,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber35080,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNordweststadt,idNumber35083,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNordweststadt,idNumber35220,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNordweststadt,idNumber35352,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber35490,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNordweststadt,idNumber36167,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber36170,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber36811,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber36951,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNordweststadt,idNumber37000,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber38993,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNordweststadt,idNumber39333,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber39542,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNordweststadt,idNumber39579,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber40879,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNordweststadt,idNumber41795,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber43790,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber46091,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber46393,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNordweststadt,idNumber52875,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisNordweststadt,idNumber69529,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber25815,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNordweststadt,idNumber32105,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber32136,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber32159,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNordweststadt,idNumber32277,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber32283,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber32288,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNordweststadt,idNumber32534,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisNordweststadt,idNumber32885,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber33029,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNordweststadt,idNumber33044,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisNordweststadt,idNumber33056,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNordweststadt,idNumber33067,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber33075,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber33079,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber38374,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber33083,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber33099,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber33113,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber42738,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber33118,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber33117,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber33134,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber33142,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNordweststadt,idNumber33146,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber42776,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber33159,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber33158,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNordweststadt,idNumber33160,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisNordweststadt,idNumber33208,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNordweststadt,idNumber33232,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisNordweststadt,idNumber33298,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber39416,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber41223,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber33823,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNordweststadt,idNumber33953,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber33952,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber35049,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber45235,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber35068,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNordweststadt,idNumber41314,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber35085,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNordweststadt,idNumber39537,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber48671,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber44969,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber37676,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber49519,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber46236,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisNordweststadt,idNumber51430,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisNordweststadt,idNumber52876,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber53636,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber57798,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNordweststadt,idNumber16297,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNordweststadt,idNumber68552,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisNordweststadt,idNumber69532,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNordweststadt,idNumber72783,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber65516,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber59553,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber62853,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber45303,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber59334,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber51530,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber52262,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber47965,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber61897,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber52155,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber60045,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber66669,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber64919,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber48179,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumberc,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber46096,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber44970,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber49520,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber62925,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber72292,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber52877,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNordweststadt,idNumber63319,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber73247,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber71294,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber73694,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber72286,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber72287,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber63860,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber74711,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber65827,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber72464,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber72071,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber69067,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber67898,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber72185,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber74423,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber74419,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber66260,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber67899,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber72291,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber75562,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber64782,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNordweststadt,idNumber72189,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNuur Moschee,idNumber12637,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNuur Moschee,idNumber19246,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNuur Moschee,idNumber19767,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNuur Moschee,idNumber20179,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisNuur Moschee,idNumber22934,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNuur Moschee,idNumber24717,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNuur Moschee,idNumber24719,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNuur Moschee,idNumber26986,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNuur Moschee,idNumber31511,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisNuur Moschee,idNumber32877,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNuur Moschee,idNumber33264,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisNuur Moschee,idNumber33945,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisNuur Moschee,idNumber33954,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNuur Moschee,idNumber33958,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNuur Moschee,idNumber33976,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNuur Moschee,idNumber33982,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisNuur Moschee,idNumber33988,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNuur Moschee,idNumber33993,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNuur Moschee,idNumber33999,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNuur Moschee,idNumber34004,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNuur Moschee,idNumber34015,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisNuur Moschee,idNumber34019,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNuur Moschee,idNumber34024,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNuur Moschee,idNumber34200,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNuur Moschee,idNumber35958,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNuur Moschee,idNumber36277,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNuur Moschee,idNumber36280,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNuur Moschee,idNumber36281,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNuur Moschee,idNumber36500,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNuur Moschee,idNumber36893,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNuur Moschee,idNumber37079,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNuur Moschee,idNumber42368,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisNuur Moschee,idNumber43419,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNuur Moschee,idNumber45331,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNuur Moschee,idNumber47692,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNuur Moschee,idNumber47702,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisNuur Moschee,idNumber53305,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisNuur Moschee,idNumber67543,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisNuur Moschee,idNumber70573,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisNuur Moschee,idNumber15852,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber24707,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNuur Moschee,idNumber24720,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber32855,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNuur Moschee,idNumber32879,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber32880,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber32882,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33266,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33949,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33948,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33957,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33961,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33962,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33960,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33970,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33975,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33973,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33980,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33979,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33981,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33986,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33984,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33990,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34002,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34003,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34017,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34021,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34022,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34029,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34028,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34203,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34204,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34205,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber35078,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber35079,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber45718,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNuur Moschee,idNumber47694,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber49328,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNuur Moschee,idNumber54232,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisNuur Moschee,idNumber59499,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber68889,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber70576,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisNuur Moschee,idNumber70575,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNuur Moschee,idNumber49989,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNuur Moschee,idNumber69832,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNuur Moschee,idNumber69833,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNuur Moschee,idNumber50407,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisNuur Moschee,idNumber45626,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNuur Moschee,idNumber69834,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNuur Moschee,idNumber75244,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisNuur Moschee,idNumber76221,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisRödelheim,idNumber11061,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisRödelheim,idNumber12568,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisRödelheim,idNumber20531,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisRödelheim,idNumber22993,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisRödelheim,idNumber23519,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisRödelheim,idNumber25241,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisRödelheim,idNumber26790,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisRödelheim,idNumber27275,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisRödelheim,idNumber27493,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisRödelheim,idNumber27882,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisRödelheim,idNumber32161,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisRödelheim,idNumber32416,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisRödelheim,idNumber32451,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisRödelheim,idNumber32865,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisRödelheim,idNumber32875,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisRödelheim,idNumber32896,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisRödelheim,idNumber32969,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisRödelheim,idNumber32978,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisRödelheim,idNumber32979,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisRödelheim,idNumber33024,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisRödelheim,idNumber33031,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisRödelheim,idNumber33051,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisRödelheim,idNumber34922,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisRödelheim,idNumber35560,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisRödelheim,idNumber35583,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisRödelheim,idNumber35812,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisRödelheim,idNumber35911,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisRödelheim,idNumber36299,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisRödelheim,idNumber36679,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisRödelheim,idNumber36990,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisRödelheim,idNumber38883,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisRödelheim,idNumber42302,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisRödelheim,idNumber44567,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisRödelheim,idNumber48838,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisRödelheim,idNumber50215,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisRödelheim,idNumber52520,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisRödelheim,idNumber53227,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisRödelheim,idNumber55982,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisRödelheim,idNumber12571,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisRödelheim,idNumber40100,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber20970,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber21166,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisRödelheim,idNumber22429,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisRödelheim,idNumber41128,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisRödelheim,idNumber25245,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisRödelheim,idNumber27280,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisRödelheim,idNumber27495,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber36568,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber32454,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber39112,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber32526,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisRödelheim,idNumber32738,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber32868,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber32869,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber32886,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisRödelheim,idNumber32899,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisRödelheim,idNumber32957,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber34476,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber32973,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber41131,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber32994,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber33025,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisRödelheim,idNumber35661,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber39469,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber36836,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber43027,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemKhuddam,majlisRödelheim,idNumber43487,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisRödelheim,idNumber44248,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber49859,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisRödelheim,idNumber50217,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber50631,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber54306,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber56268,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisRödelheim,idNumber73317,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAtfal,majlisRödelheim,idNumber47792,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisRödelheim,idNumber76267,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisRödelheim,idNumber65569,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisRödelheim,idNumber49826,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisRödelheim,idNumber51015,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisRödelheim,idNumber53731,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisRödelheim,idNumber61783,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisRödelheim,idNumber48825,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisRödelheim,idNumber56361,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisRödelheim,idNumber55853,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisRödelheim,idNumber41254,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisRödelheim,idNumber45637,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisRödelheim,idNumber58452,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisRödelheim,idNumber53230,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisRödelheim,idNumber56364,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisRödelheim,idNumber57397,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisRödelheim,idNumber76268,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisRödelheim,idNumber71751,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisRödelheim,idNumber64243,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisRödelheim,idNumber66544,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisRödelheim,idNumber70810,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisRödelheim,idNumber72304,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisRödelheim,idNumber64420,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisRödelheim,idNumber67631,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisRödelheim,idNumber62857,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisRödelheim,idNumber76214,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisZeilsheim,idNumber19645,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisZeilsheim,idNumber20070,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisZeilsheim,idNumber21065,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisZeilsheim,idNumber21239,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisZeilsheim,idNumber23220,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisZeilsheim,idNumber32424,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_080}, {tanzeemAnsar,majlisZeilsheim,idNumber32443,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisZeilsheim,idNumber32525,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisZeilsheim,idNumber32588,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisZeilsheim,idNumber32740,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisZeilsheim,idNumber34631,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisZeilsheim,idNumber36457,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemAnsar,majlisZeilsheim,idNumber45037,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemAnsar,majlisZeilsheim,idNumber53097,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisZeilsheim,idNumber20073,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisZeilsheim,idNumber20074,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisZeilsheim,idNumber20840,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisZeilsheim,idNumber21068,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisZeilsheim,idNumber21067,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisZeilsheim,idNumber30226,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisZeilsheim,idNumber32356,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisZeilsheim,idNumber40729,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisZeilsheim,idNumber40429,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisZeilsheim,idNumber39334,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisZeilsheim,idNumber39653,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisZeilsheim,idNumber42676,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisZeilsheim,idNumber49745,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisZeilsheim,idNumber46210,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisZeilsheim,idNumber46995,nameXXX,stimmberechtigt1,wahlberechtigt1,anwesend_2026_01_081}, {tanzeemKhuddam,majlisZeilsheim,idNumber47154,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisZeilsheim,idNumber50434,nameXXX,stimmberechtigt0,wahlberechtigt0,anwesend_2026_01_080}, {tanzeemKhuddam,majlisZeilsheim,idNumber72004,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisZeilsheim,idNumber52747,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisZeilsheim,idNumber67374,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisZeilsheim,idNumber67375,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisZeilsheim,idNumber49746,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisZeilsheim,idNumber53243,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisZeilsheim,idNumber53099,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisZeilsheim,idNumber73252,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisZeilsheim,idNumber72258,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisZeilsheim,idNumber72260,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisZeilsheim,idNumber67376,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisZeilsheim,idNumber64592,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKinder,majlisZeilsheim,idNumber68502,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber33467,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber12711,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber20362,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber12623,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber43685,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber32145,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber35218,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber12822,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber42514,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber35232,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber16672,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber12604,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber51429,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber66196,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber51642,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber12621,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber35474,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber35476,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber56212,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber12675,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber12645,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber47369,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber53115,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber16535,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber49907,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber43459,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber12833,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber30313,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber36671,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber33486,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber33488,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber12796,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAnsar,majlisBad Vilbel,idNumber47867,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber35945,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber17149,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber40922,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12713,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber42258,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber59800,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber11022,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber47635,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber51174,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber31770,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12824,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12826,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12827,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12825,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber35236,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber44504,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12606,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12608,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12915,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber26617,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber72167,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber55134,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber46264,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber65611,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber65613,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber10736,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12677,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber45389,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber34555,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber46862,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber11032,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber52220,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber64468,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber64469,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber20772,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12835,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12836,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber43131,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber38787,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber43144,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber62158,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber65838,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber53188,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12799,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12800,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemKhuddam,majlisBad Vilbel,idNumber66653,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBad Vilbel,idNumber56513,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBad Vilbel,idNumber63057,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBad Vilbel,idNumber47864,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBad Vilbel,idNumber75870,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBad Vilbel,idNumber51569,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBad Vilbel,idNumber69902,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBad Vilbel,idNumber60611,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBad Vilbel,idNumber60429,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBad Vilbel,idNumber53074,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBad Vilbel,idNumber47868,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBad Vilbel,idNumber52353,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'}, {tanzeemAtfal,majlisBad Vilbel,idNumber66119,nameXXX,stimmberechtigt'-',wahlberechtigt'-',anwesend_2026_01_08'-'} ] .map((entry) = ({ tanzeem String(entry.tanzeem  '').trim().toLowerCase(), majlis String(entry.majlis  '').trim(), idNumber String(entry.idNumber  '').trim(), name String(entry.name  '').trim(), stimmberechtigt entry.stimmberechtigt, wahlberechtigt entry.wahlberechtigt, anwesend_2026_01_08 entry.anwesend_2026_01_08, }));
const MEMBER_DIRECTORY_DATA = [ {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber10007,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber10898,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber11431,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber12722,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber12770,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber18380,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber19604,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber21096,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber21323,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber21325,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber32258,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber32547,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33203,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33243,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33413,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33429,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33442,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33454,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33459,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33470,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33492,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33496,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33517,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33521,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33542,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33550,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33563,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33567,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber33591,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber35031,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber35473,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber37326,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber39580,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber42515,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber42557,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber49472,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber52117,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber53470,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber61100,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber61101,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber66696,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber75720,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber10010,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber11435,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber11434,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber12775,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber12772,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber12773,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber13650,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber15125,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber39362,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber40812,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber21328,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber27050,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber27096,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber31634,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33209,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33245,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber35438,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber37155,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33444,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33458,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33494,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33499,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33519,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33518,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33526,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33524,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber39369,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33552,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33566,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33569,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber35432,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33593,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber33605,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber40813,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber35930,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber39582,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber39583,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber40267,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber40268,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber40438,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber42442,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber49715,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber46297,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber50083,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber51306,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber53176,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber53345,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber62890,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber59868,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber61104,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber61103,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber61759,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber75096,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber53054,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber56041,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber63316,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber45496,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber50372,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber58749,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber59332,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber59880,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber59440,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber62891,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber62892,nameXXX}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber63300,nameXXX}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber68300,nameXXX}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber76494,nameXXX}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber75241,nameXXX}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber75869,nameXXX}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber67158,nameXXX}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber75915,nameXXX}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber73267,nameXXX}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber71927,nameXXX}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber66171,nameXXX}, {tanzeemKinder,majlisBaitus Sabuh Nord,idNumber75866,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber26915,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber32118,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber32127,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber32151,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber32456,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33036,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33136,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33329,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33416,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33418,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33421,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33424,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33436,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33439,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33507,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33534,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33538,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33544,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33574,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber33586,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber34321,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber34342,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber34479,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber34487,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber35005,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber35086,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber35173,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber37095,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber37888,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber41819,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber53379,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber54926,nameXXX}, {tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber59916,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber16303,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber39538,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber39539,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber32154,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber32155,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber32458,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber37140,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber32954,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33039,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33138,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33331,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33419,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33425,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber35433,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33482,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33511,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33523,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33537,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33536,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33549,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33561,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber33562,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber41549,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber34323,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber34340,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber34341,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber34484,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber35145,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber35146,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber49809,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber39824,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber36856,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber37097,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber37892,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber37890,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber40407,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber40408,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber40406,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber41214,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber44173,nameXXX}, {tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber45577,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber52274,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber42742,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber47849,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber49815,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber59227,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber61530,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber57971,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber42959,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber47989,nameXXX}, {tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber73009,nameXXX}, {tanzeemKinder,majlisBaitus Sabuh Süd,idNumber66416,nameXXX}, {tanzeemKinder,majlisBaitus Sabuh Süd,idNumber65803,nameXXX}, {tanzeemKinder,majlisBaitus Sabuh Süd,idNumber71907,nameXXX}, {tanzeemKinder,majlisBaitus Sabuh Süd,idNumber64287,nameXXX}, {tanzeemKinder,majlisBaitus Sabuh Süd,idNumber66772,nameXXX}, {tanzeemKinder,majlisBaitus Sabuh Süd,idNumber74411,nameXXX}, {tanzeemKinder,majlisBaitus Sabuh Süd,idNumber76444,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber10881,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber13811,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber16348,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber19372,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber21394,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber25867,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber26843,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber33167,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber33185,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber33188,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber33193,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber33230,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber33241,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber33272,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber33281,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber33289,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber33292,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber33301,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber33303,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber33309,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber33318,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber33321,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber33325,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber33323,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber33332,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber37087,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber37393,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber37904,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber39247,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber40372,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber40434,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber40841,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber41603,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber41750,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber42225,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber43702,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber44573,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber44609,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber47617,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber49791,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber50013,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber51460,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber62054,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber62807,nameXXX}, {tanzeemAnsar,majlisBornheim,idNumber63924,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber13814,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber13815,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber13816,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber16352,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber16353,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber16350,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber17269,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber19124,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber65202,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber25869,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber25871,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber30774,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber33175,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber33183,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber33184,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber33195,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber33271,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber33283,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber33284,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber40127,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber33308,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber33312,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber39106,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber33320,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber36419,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber38367,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber40435,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber51670,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber45463,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber45564,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber46064,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber47878,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber47901,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber63385,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber51160,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber51157,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber51159,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber66527,nameXXX}, {tanzeemKhuddam,majlisBornheim,idNumber74265,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber57711,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber65204,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber51349,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber54643,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber42260,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber58848,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber58849,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber49648,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber55834,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber55836,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber42698,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber59817,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber41313,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber67153,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber45889,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber61545,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber51673,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber58608,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber59342,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber47621,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber70879,nameXXX}, {tanzeemAtfal,majlisBornheim,idNumber70880,nameXXX}, {tanzeemKinder,majlisBornheim,idNumber75814,nameXXX}, {tanzeemKinder,majlisBornheim,idNumber68134,nameXXX}, {tanzeemKinder,majlisBornheim,idNumber73577,nameXXX}, {tanzeemKinder,majlisBornheim,idNumber76461,nameXXX}, {tanzeemKinder,majlisBornheim,idNumber68603,nameXXX}, {tanzeemKinder,majlisBornheim,idNumber71527,nameXXX}, {tanzeemKinder,majlisBornheim,idNumber71528,nameXXX}, {tanzeemKinder,majlisBornheim,idNumber64495,nameXXX}, {tanzeemKinder,majlisBornheim,idNumber67035,nameXXX}, {tanzeemKinder,majlisBornheim,idNumber62775,nameXXX}, {tanzeemKinder,majlisBornheim,idNumber64342,nameXXX}, {tanzeemKinder,majlisBornheim,idNumber70096,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber15099,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber16289,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber16701,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber22534,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber27321,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber32086,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber32285,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber32287,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber32813,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber33016,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber33085,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber33213,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber33252,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber33255,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber33345,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber33350,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber33355,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber33358,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber33366,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber33371,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber33376,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber33388,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber33393,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber33474,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber33777,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber35008,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber35027,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber35039,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber35050,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber35558,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber35977,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber36023,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber36169,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber38458,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber39775,nameXXX}, {tanzeemAnsar,majlisEschersheim,idNumber56168,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber15102,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber15101,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber20400,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber26899,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber32089,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber32289,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber32887,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber47785,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber47786,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33087,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33217,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33215,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33257,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33258,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33344,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33341,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33342,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33347,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33348,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33349,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33353,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33369,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33368,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33375,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33379,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33390,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33391,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33397,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33395,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33476,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33477,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber42634,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33491,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33781,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33783,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber33784,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber35010,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber36589,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber35041,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber35055,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber49986,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber49987,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber41896,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber45274,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber55175,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber59136,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber57080,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber70397,nameXXX}, {tanzeemKhuddam,majlisEschersheim,idNumber75204,nameXXX}, {tanzeemAtfal,majlisEschersheim,idNumber56194,nameXXX}, {tanzeemAtfal,majlisEschersheim,idNumber72105,nameXXX}, {tanzeemAtfal,majlisEschersheim,idNumber41734,nameXXX}, {tanzeemAtfal,majlisEschersheim,idNumber47793,nameXXX}, {tanzeemAtfal,majlisEschersheim,idNumber42635,nameXXX}, {tanzeemAtfal,majlisEschersheim,idNumber61720,nameXXX}, {tanzeemAtfal,majlisEschersheim,idNumber66414,nameXXX}, {tanzeemAtfal,majlisEschersheim,idNumber56797,nameXXX}, {tanzeemKinder,majlisEschersheim,idNumber68214,nameXXX}, {tanzeemKinder,majlisEschersheim,idNumber73489,nameXXX}, {tanzeemKinder,majlisEschersheim,idNumber72106,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber11491,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber16114,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber16290,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32257,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32334,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32357,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32359,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32401,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32411,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32437,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32481,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32487,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32489,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32499,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32510,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32530,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32549,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32554,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32558,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32563,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32580,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32581,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32743,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32753,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32765,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32784,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32818,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32840,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber32935,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber33510,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber36665,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber37522,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber37887,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber40590,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber42144,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber44895,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber45589,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber46610,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber48066,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber48850,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber50576,nameXXX}, {tanzeemAnsar,majlisGriesheim,idNumber70226,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber11493,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber11494,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber11495,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber11496,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber40236,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber16472,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber19401,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber20402,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber20534,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32413,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32415,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32442,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32485,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32486,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32491,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32513,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32553,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32556,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32561,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32578,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32582,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32627,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32756,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32766,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32768,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32767,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber34549,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32844,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32937,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber33352,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber40013,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber38041,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber38277,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber38278,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber39787,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32423,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber32422,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber42160,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber44097,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber53248,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber53249,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber45931,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber46593,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber50869,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber55107,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber55625,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber56257,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber57404,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber58273,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber59474,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber61117,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber66636,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber70351,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber75876,nameXXX}, {tanzeemKhuddam,majlisGriesheim,idNumber76464,nameXXX}, {tanzeemAtfal,majlisGriesheim,idNumber61195,nameXXX}, {tanzeemAtfal,majlisGriesheim,idNumber64169,nameXXX}, {tanzeemAtfal,majlisGriesheim,idNumber51683,nameXXX}, {tanzeemAtfal,majlisGriesheim,idNumber67171,nameXXX}, {tanzeemAtfal,majlisGriesheim,idNumber69442,nameXXX}, {tanzeemAtfal,majlisGriesheim,idNumber59642,nameXXX}, {tanzeemAtfal,majlisGriesheim,idNumber61794,nameXXX}, {tanzeemAtfal,majlisGriesheim,idNumber49800,nameXXX}, {tanzeemAtfal,majlisGriesheim,idNumber51900,nameXXX}, {tanzeemAtfal,majlisGriesheim,idNumber59644,nameXXX}, {tanzeemAtfal,majlisGriesheim,idNumber47363,nameXXX}, {tanzeemAtfal,majlisGriesheim,idNumber64054,nameXXX}, {tanzeemAtfal,majlisGriesheim,idNumber59064,nameXXX}, {tanzeemAtfal,majlisGriesheim,idNumber51555,nameXXX}, {tanzeemAtfal,majlisGriesheim,idNumber68023,nameXXX}, {tanzeemAtfal,majlisGriesheim,idNumber59643,nameXXX}, {tanzeemAtfal,majlisGriesheim,idNumber52376,nameXXX}, {tanzeemAtfal,majlisGriesheim,idNumber74461,nameXXX}, {tanzeemAtfal,majlisGriesheim,idNumber74462,nameXXX}, {tanzeemKinder,majlisGriesheim,idNumber64055,nameXXX}, {tanzeemKinder,majlisGriesheim,idNumber66652,nameXXX}, {tanzeemKinder,majlisGriesheim,idNumber65536,nameXXX}, {tanzeemKinder,majlisGriesheim,idNumber75238,nameXXX}, {tanzeemKinder,majlisGriesheim,idNumber66219,nameXXX}, {tanzeemKinder,majlisGriesheim,idNumber71297,nameXXX}, {tanzeemKinder,majlisGriesheim,idNumber76385,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber26614,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber32156,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber32158,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber32173,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber32182,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber32194,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber32214,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber32215,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber32225,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber32234,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber32236,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber32241,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber32247,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber32256,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber32260,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber32265,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber32268,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber32514,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber33278,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber33365,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber33867,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber42191,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber43145,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber43737,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber48500,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber55042,nameXXX}, {tanzeemAnsar,majlisBerg,idNumber60538,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber10572,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber12570,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber27042,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber32175,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber32185,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber32186,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber32199,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber32228,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber39738,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber32246,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber32251,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber32264,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber39090,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber34643,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber32270,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber38205,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber35308,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber33382,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber33737,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber37906,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber41622,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber55056,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber52449,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber47015,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber60541,nameXXX}, {tanzeemKhuddam,majlisBerg,idNumber72011,nameXXX}, {tanzeemAtfal,majlisBerg,idNumber49518,nameXXX}, {tanzeemAtfal,majlisBerg,idNumber63705,nameXXX}, {tanzeemAtfal,majlisBerg,idNumber63706,nameXXX}, {tanzeemAtfal,majlisBerg,idNumber47440,nameXXX}, {tanzeemAtfal,majlisBerg,idNumber49869,nameXXX}, {tanzeemAtfal,majlisBerg,idNumber50537,nameXXX}, {tanzeemAtfal,majlisBerg,idNumber61971,nameXXX}, {tanzeemAtfal,majlisBerg,idNumber55057,nameXXX}, {tanzeemAtfal,majlisBerg,idNumber60542,nameXXX}, {tanzeemKinder,majlisBerg,idNumber69004,nameXXX}, {tanzeemKinder,majlisBerg,idNumber71867,nameXXX}, {tanzeemKinder,majlisBerg,idNumber65537,nameXXX}, {tanzeemKinder,majlisBerg,idNumber70141,nameXXX}, {tanzeemKinder,majlisBerg,idNumber66115,nameXXX}, {tanzeemKinder,majlisBerg,idNumber71071,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber14690,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber27322,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32083,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32090,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32109,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32123,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32130,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32137,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32160,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32167,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32170,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32171,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32178,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32202,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32254,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32273,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32296,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32306,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32321,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32328,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32490,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32532,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32533,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32861,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber32900,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber33119,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber33147,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber35059,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber35069,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber38038,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber41274,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber43892,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber45386,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber56554,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber64546,nameXXX}, {tanzeemAnsar,majlisGinnheim,idNumber64944,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber11935,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber14691,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber18447,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber37971,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber23486,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber32085,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber32124,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber32125,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber32126,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber32140,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber32141,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber32142,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber32162,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber32207,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber52433,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber32294,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber32299,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber32300,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber41382,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber32323,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber32324,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber32398,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber32864,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber38435,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber32972,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber33122,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber39418,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber33173,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber33239,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber33240,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber33871,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber33997,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber35061,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber35062,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber35071,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber38039,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber44894,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber44896,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber45355,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber47834,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber49973,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber55148,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber56061,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber56556,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber56557,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber58727,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber62181,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber63583,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber68318,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber69724,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber73642,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber74369,nameXXX}, {tanzeemKhuddam,majlisGinnheim,idNumber74999,nameXXX}, {tanzeemAtfal,majlisGinnheim,idNumber44621,nameXXX}, {tanzeemAtfal,majlisGinnheim,idNumber47808,nameXXX}, {tanzeemAtfal,majlisGinnheim,idNumber60321,nameXXX}, {tanzeemAtfal,majlisGinnheim,idNumber43543,nameXXX}, {tanzeemAtfal,majlisGinnheim,idNumber67081,nameXXX}, {tanzeemAtfal,majlisGinnheim,idNumber46448,nameXXX}, {tanzeemAtfal,majlisGinnheim,idNumber67241,nameXXX}, {tanzeemAtfal,majlisGinnheim,idNumber58120,nameXXX}, {tanzeemAtfal,majlisGinnheim,idNumber64548,nameXXX}, {tanzeemAtfal,majlisGinnheim,idNumber74370,nameXXX}, {tanzeemKinder,majlisGinnheim,idNumber64549,nameXXX}, {tanzeemKinder,majlisGinnheim,idNumber74371,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber24285,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber26845,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber27245,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber32290,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber32292,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber32316,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber32325,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber32347,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber32353,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber32980,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber33427,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber33802,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber34364,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber34369,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber35597,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber45354,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber45719,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber50017,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber52377,nameXXX}, {tanzeemAnsar,majlisGoldstein,idNumber57131,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber12625,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber24314,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber39002,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber32349,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber46639,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber46640,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber32496,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber38840,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber35434,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber33441,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber33806,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber33805,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber33816,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber33817,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber33818,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber34368,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber34366,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber34970,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber36635,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber33824,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber37453,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber42306,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber45229,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber49121,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber52975,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber66138,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber73015,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber74368,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber74885,nameXXX}, {tanzeemKhuddam,majlisGoldstein,idNumber75723,nameXXX}, {tanzeemAtfal,majlisGoldstein,idNumber72305,nameXXX}, {tanzeemAtfal,majlisGoldstein,idNumber44929,nameXXX}, {tanzeemAtfal,majlisGoldstein,idNumber55237,nameXXX}, {tanzeemAtfal,majlisGoldstein,idNumber47968,nameXXX}, {tanzeemAtfal,majlisGoldstein,idNumber60807,nameXXX}, {tanzeemAtfal,majlisGoldstein,idNumber47969,nameXXX}, {tanzeemAtfal,majlisGoldstein,idNumber47607,nameXXX}, {tanzeemAtfal,majlisGoldstein,idNumber50560,nameXXX}, {tanzeemAtfal,majlisGoldstein,idNumber55261,nameXXX}, {tanzeemAtfal,majlisGoldstein,idNumber55234,nameXXX}, {tanzeemAtfal,majlisGoldstein,idNumber59747,nameXXX}, {tanzeemKinder,majlisGoldstein,idNumber64249,nameXXX}, {tanzeemKinder,majlisGoldstein,idNumber73786,nameXXX}, {tanzeemKinder,majlisGoldstein,idNumber67517,nameXXX}, {tanzeemKinder,majlisGoldstein,idNumber75724,nameXXX}, {tanzeemAnsar,majlisHausen,idNumber32310,nameXXX}, {tanzeemAnsar,majlisHausen,idNumber33127,nameXXX}, {tanzeemAnsar,majlisHausen,idNumber33152,nameXXX}, {tanzeemAnsar,majlisHausen,idNumber33154,nameXXX}, {tanzeemAnsar,majlisHausen,idNumber33161,nameXXX}, {tanzeemAnsar,majlisHausen,idNumber35209,nameXXX}, {tanzeemAnsar,majlisHausen,idNumber44329,nameXXX}, {tanzeemAnsar,majlisHausen,idNumber60875,nameXXX}, {tanzeemKhuddam,majlisHausen,idNumber26792,nameXXX}, {tanzeemKhuddam,majlisHausen,idNumber26794,nameXXX}, {tanzeemKhuddam,majlisHausen,idNumber26795,nameXXX}, {tanzeemKhuddam,majlisHausen,idNumber32313,nameXXX}, {tanzeemKhuddam,majlisHausen,idNumber32315,nameXXX}, {tanzeemKhuddam,majlisHausen,idNumber33164,nameXXX}, {tanzeemKhuddam,majlisHausen,idNumber35211,nameXXX}, {tanzeemKhuddam,majlisHausen,idNumber43815,nameXXX}, {tanzeemKhuddam,majlisHausen,idNumber44159,nameXXX}, {tanzeemKhuddam,majlisHausen,idNumber54481,nameXXX}, {tanzeemKhuddam,majlisHausen,idNumber55281,nameXXX}, {tanzeemKhuddam,majlisHausen,idNumber55300,nameXXX}, {tanzeemKhuddam,majlisHausen,idNumber55375,nameXXX}, {tanzeemAtfal,majlisHausen,idNumber54496,nameXXX}, {tanzeemAtfal,majlisHausen,idNumber63683,nameXXX}, {tanzeemAtfal,majlisHausen,idNumber62448,nameXXX}, {tanzeemKinder,majlisHausen,idNumber72091,nameXXX}, {tanzeemKinder,majlisHausen,idNumber74931,nameXXX}, {tanzeemKinder,majlisHausen,idNumber66054,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber20103,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber20406,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber23136,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber30858,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber32362,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber32459,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber32465,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber32493,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber32504,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber32583,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber32594,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber32596,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber32597,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber32612,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber32618,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber32621,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber32632,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber32635,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber32742,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber32929,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber32949,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber32964,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber32967,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber35368,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber35598,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber36197,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber37520,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber39675,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber43077,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber44198,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber47252,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber51187,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber52289,nameXXX}, {tanzeemAnsar,majlisHöchst,idNumber52856,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber20409,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber20412,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber23139,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber23141,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber23138,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber23140,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber32365,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber32366,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber32462,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber32469,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber32495,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber32497,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber32587,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber32586,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber40998,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber32616,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber32620,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber38805,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber32623,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber32636,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber38816,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber32783,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber32942,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber33018,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber33163,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber33385,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber33386,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber36796,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber42184,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber43537,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber47308,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber52291,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber54074,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber54313,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber54552,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber56218,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber60371,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber68492,nameXXX}, {tanzeemKhuddam,majlisHöchst,idNumber70346,nameXXX}, {tanzeemAtfal,majlisHöchst,idNumber42766,nameXXX}, {tanzeemAtfal,majlisHöchst,idNumber43919,nameXXX}, {tanzeemAtfal,majlisHöchst,idNumber51094,nameXXX}, {tanzeemAtfal,majlisHöchst,idNumber57880,nameXXX}, {tanzeemAtfal,majlisHöchst,idNumber57881,nameXXX}, {tanzeemAtfal,majlisHöchst,idNumber46094,nameXXX}, {tanzeemAtfal,majlisHöchst,idNumber62455,nameXXX}, {tanzeemAtfal,majlisHöchst,idNumber67430,nameXXX}, {tanzeemAtfal,majlisHöchst,idNumber48205,nameXXX}, {tanzeemAtfal,majlisHöchst,idNumber47155,nameXXX}, {tanzeemAtfal,majlisHöchst,idNumber62368,nameXXX}, {tanzeemAtfal,majlisHöchst,idNumber47326,nameXXX}, {tanzeemAtfal,majlisHöchst,idNumber58215,nameXXX}, {tanzeemKinder,majlisHöchst,idNumber73978,nameXXX}, {tanzeemKinder,majlisHöchst,idNumber65729,nameXXX}, {tanzeemKinder,majlisHöchst,idNumber74354,nameXXX}, {tanzeemKinder,majlisHöchst,idNumber69775,nameXXX}, {tanzeemKinder,majlisHöchst,idNumber66489,nameXXX}, {tanzeemKinder,majlisHöchst,idNumber70430,nameXXX}, {tanzeemKinder,majlisHöchst,idNumber66949,nameXXX}, {tanzeemKinder,majlisHöchst,idNumber72073,nameXXX}, {tanzeemKinder,majlisHöchst,idNumber69930,nameXXX}, {tanzeemKinder,majlisHöchst,idNumber74720,nameXXX}, {tanzeemKinder,majlisHöchst,idNumber75568,nameXXX}, {tanzeemKinder,majlisHöchst,idNumber66556,nameXXX}, {tanzeemAnsar,majlisNied,idNumber12658,nameXXX}, {tanzeemAnsar,majlisNied,idNumber12926,nameXXX}, {tanzeemAnsar,majlisNied,idNumber12945,nameXXX}, {tanzeemAnsar,majlisNied,idNumber20238,nameXXX}, {tanzeemAnsar,majlisNied,idNumber24943,nameXXX}, {tanzeemAnsar,majlisNied,idNumber32732,nameXXX}, {tanzeemAnsar,majlisNied,idNumber32734,nameXXX}, {tanzeemAnsar,majlisNied,idNumber32750,nameXXX}, {tanzeemAnsar,majlisNied,idNumber32775,nameXXX}, {tanzeemAnsar,majlisNied,idNumber32848,nameXXX}, {tanzeemAnsar,majlisNied,idNumber32913,nameXXX}, {tanzeemAnsar,majlisNied,idNumber32922,nameXXX}, {tanzeemAnsar,majlisNied,idNumber37868,nameXXX}, {tanzeemAnsar,majlisNied,idNumber38875,nameXXX}, {tanzeemAnsar,majlisNied,idNumber40884,nameXXX}, {tanzeemAnsar,majlisNied,idNumber44416,nameXXX}, {tanzeemAnsar,majlisNied,idNumber64358,nameXXX}, {tanzeemKhuddam,majlisNied,idNumber20241,nameXXX}, {tanzeemKhuddam,majlisNied,idNumber20242,nameXXX}, {tanzeemKhuddam,majlisNied,idNumber37260,nameXXX}, {tanzeemKhuddam,majlisNied,idNumber37261,nameXXX}, {tanzeemKhuddam,majlisNied,idNumber32786,nameXXX}, {tanzeemKhuddam,majlisNied,idNumber32828,nameXXX}, {tanzeemKhuddam,majlisNied,idNumber32851,nameXXX}, {tanzeemKhuddam,majlisNied,idNumber37351,nameXXX}, {tanzeemKhuddam,majlisNied,idNumber32910,nameXXX}, {tanzeemKhuddam,majlisNied,idNumber32915,nameXXX}, {tanzeemKhuddam,majlisNied,idNumber32916,nameXXX}, {tanzeemKhuddam,majlisNied,idNumber34550,nameXXX}, {tanzeemKhuddam,majlisNied,idNumber32927,nameXXX}, {tanzeemKhuddam,majlisNied,idNumber32941,nameXXX}, {tanzeemKhuddam,majlisNied,idNumber39935,nameXXX}, {tanzeemKhuddam,majlisNied,idNumber42857,nameXXX}, {tanzeemKhuddam,majlisNied,idNumber44346,nameXXX}, {tanzeemKhuddam,majlisNied,idNumber48349,nameXXX}, {tanzeemKhuddam,majlisNied,idNumber58089,nameXXX}, {tanzeemAtfal,majlisNied,idNumber63757,nameXXX}, {tanzeemAtfal,majlisNied,idNumber46573,nameXXX}, {tanzeemAtfal,majlisNied,idNumber42745,nameXXX}, {tanzeemAtfal,majlisNied,idNumber53750,nameXXX}, {tanzeemAtfal,majlisNied,idNumber61827,nameXXX}, {tanzeemAtfal,majlisNied,idNumber54315,nameXXX}, {tanzeemKinder,majlisNied,idNumber72082,nameXXX}, {tanzeemKinder,majlisNied,idNumber75259,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber27112,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber32103,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber32135,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber32143,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber32237,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber32524,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber32966,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber32987,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33006,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33012,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33026,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33040,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33042,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33053,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33062,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33071,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33077,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33111,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33115,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33125,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33132,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33139,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33144,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33156,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33438,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33528,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33530,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber33950,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber35045,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber35063,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber35065,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber35080,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber35083,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber35220,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber35352,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber35490,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber36167,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber36170,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber36811,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber36951,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber37000,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber38993,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber39333,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber39542,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber39579,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber40879,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber41795,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber43790,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber46091,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber46393,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber52875,nameXXX}, {tanzeemAnsar,majlisNordweststadt,idNumber69529,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber25815,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber32105,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber32136,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber32159,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber32277,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber32283,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber32288,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber32534,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber32885,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33029,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33044,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33056,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33067,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33075,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33079,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber38374,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33083,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33099,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33113,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber42738,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33118,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33117,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33134,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33142,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33146,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber42776,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33159,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33158,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33160,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33208,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33232,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33298,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber39416,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber41223,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33823,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33953,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber33952,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber35049,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber45235,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber35068,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber41314,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber35085,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber39537,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber48671,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber44969,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber37676,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber49519,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber46236,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber51430,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber52876,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber53636,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber57798,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber16297,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber68552,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber69532,nameXXX}, {tanzeemKhuddam,majlisNordweststadt,idNumber72783,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber65516,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber59553,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber62853,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber45303,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber59334,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber51530,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber52262,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber47965,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber61897,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber52155,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber60045,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber66669,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber64919,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber48179,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumberc,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber46096,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber44970,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber49520,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber62925,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber72292,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber52877,nameXXX}, {tanzeemAtfal,majlisNordweststadt,idNumber63319,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber73247,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber71294,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber73694,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber72286,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber72287,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber63860,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber74711,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber65827,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber72464,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber72071,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber69067,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber67898,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber72185,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber74423,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber74419,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber66260,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber67899,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber72291,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber75562,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber64782,nameXXX}, {tanzeemKinder,majlisNordweststadt,idNumber72189,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber12637,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber19246,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber19767,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber20179,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber22934,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber24717,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber24719,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber26986,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber31511,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber32877,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber33264,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber33945,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber33954,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber33958,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber33976,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber33982,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber33988,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber33993,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber33999,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber34004,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber34015,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber34019,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber34024,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber34200,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber35958,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber36277,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber36280,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber36281,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber36500,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber36893,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber37079,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber42368,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber43419,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber45331,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber47692,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber47702,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber53305,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber67543,nameXXX}, {tanzeemAnsar,majlisNuur Moschee,idNumber70573,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber15852,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber24707,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber24720,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber32855,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber32879,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber32880,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber32882,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33266,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33949,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33948,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33957,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33961,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33962,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33960,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33970,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33975,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33973,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33980,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33979,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33981,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33986,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33984,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber33990,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34002,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34003,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34017,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34021,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34022,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34029,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34028,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34203,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34204,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber34205,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber35078,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber35079,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber45718,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber47694,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber49328,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber54232,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber59499,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber68889,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber70576,nameXXX}, {tanzeemKhuddam,majlisNuur Moschee,idNumber70575,nameXXX}, {tanzeemAtfal,majlisNuur Moschee,idNumber49989,nameXXX}, {tanzeemAtfal,majlisNuur Moschee,idNumber69832,nameXXX}, {tanzeemAtfal,majlisNuur Moschee,idNumber69833,nameXXX}, {tanzeemAtfal,majlisNuur Moschee,idNumber50407,nameXXX}, {tanzeemAtfal,majlisNuur Moschee,idNumber45626,nameXXX}, {tanzeemKinder,majlisNuur Moschee,idNumber69834,nameXXX}, {tanzeemKinder,majlisNuur Moschee,idNumber75244,nameXXX}, {tanzeemKinder,majlisNuur Moschee,idNumber76221,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber11061,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber12568,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber20531,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber22993,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber23519,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber25241,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber26790,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber27275,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber27493,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber27882,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber32161,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber32416,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber32451,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber32865,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber32875,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber32896,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber32969,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber32978,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber32979,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber33024,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber33031,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber33051,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber34922,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber35560,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber35583,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber35812,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber35911,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber36299,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber36679,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber36990,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber38883,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber42302,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber44567,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber48838,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber50215,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber52520,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber53227,nameXXX}, {tanzeemAnsar,majlisRödelheim,idNumber55982,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber12571,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber40100,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber20970,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber21166,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber22429,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber41128,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber25245,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber27280,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber27495,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber36568,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber32454,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber39112,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber32526,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber32738,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber32868,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber32869,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber32886,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber32899,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber32957,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber34476,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber32973,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber41131,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber32994,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber33025,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber35661,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber39469,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber36836,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber43027,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber43487,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber44248,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber49859,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber50217,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber50631,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber54306,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber56268,nameXXX}, {tanzeemKhuddam,majlisRödelheim,idNumber73317,nameXXX}, {tanzeemAtfal,majlisRödelheim,idNumber47792,nameXXX}, {tanzeemAtfal,majlisRödelheim,idNumber76267,nameXXX}, {tanzeemAtfal,majlisRödelheim,idNumber65569,nameXXX}, {tanzeemAtfal,majlisRödelheim,idNumber49826,nameXXX}, {tanzeemAtfal,majlisRödelheim,idNumber51015,nameXXX}, {tanzeemAtfal,majlisRödelheim,idNumber53731,nameXXX}, {tanzeemAtfal,majlisRödelheim,idNumber61783,nameXXX}, {tanzeemAtfal,majlisRödelheim,idNumber48825,nameXXX}, {tanzeemAtfal,majlisRödelheim,idNumber56361,nameXXX}, {tanzeemAtfal,majlisRödelheim,idNumber55853,nameXXX}, {tanzeemAtfal,majlisRödelheim,idNumber41254,nameXXX}, {tanzeemAtfal,majlisRödelheim,idNumber45637,nameXXX}, {tanzeemAtfal,majlisRödelheim,idNumber58452,nameXXX}, {tanzeemAtfal,majlisRödelheim,idNumber53230,nameXXX}, {tanzeemAtfal,majlisRödelheim,idNumber56364,nameXXX}, {tanzeemAtfal,majlisRödelheim,idNumber57397,nameXXX}, {tanzeemKinder,majlisRödelheim,idNumber76268,nameXXX}, {tanzeemKinder,majlisRödelheim,idNumber71751,nameXXX}, {tanzeemKinder,majlisRödelheim,idNumber64243,nameXXX}, {tanzeemKinder,majlisRödelheim,idNumber66544,nameXXX}, {tanzeemKinder,majlisRödelheim,idNumber70810,nameXXX}, {tanzeemKinder,majlisRödelheim,idNumber72304,nameXXX}, {tanzeemKinder,majlisRödelheim,idNumber64420,nameXXX}, {tanzeemKinder,majlisRödelheim,idNumber67631,nameXXX}, {tanzeemKinder,majlisRödelheim,idNumber62857,nameXXX}, {tanzeemKinder,majlisRödelheim,idNumber76214,nameXXX}, {tanzeemAnsar,majlisZeilsheim,idNumber19645,nameXXX}, {tanzeemAnsar,majlisZeilsheim,idNumber20070,nameXXX}, {tanzeemAnsar,majlisZeilsheim,idNumber21065,nameXXX}, {tanzeemAnsar,majlisZeilsheim,idNumber21239,nameXXX}, {tanzeemAnsar,majlisZeilsheim,idNumber23220,nameXXX}, {tanzeemAnsar,majlisZeilsheim,idNumber32424,nameXXX}, {tanzeemAnsar,majlisZeilsheim,idNumber32443,nameXXX}, {tanzeemAnsar,majlisZeilsheim,idNumber32525,nameXXX}, {tanzeemAnsar,majlisZeilsheim,idNumber32588,nameXXX}, {tanzeemAnsar,majlisZeilsheim,idNumber32740,nameXXX}, {tanzeemAnsar,majlisZeilsheim,idNumber34631,nameXXX}, {tanzeemAnsar,majlisZeilsheim,idNumber36457,nameXXX}, {tanzeemAnsar,majlisZeilsheim,idNumber45037,nameXXX}, {tanzeemAnsar,majlisZeilsheim,idNumber53097,nameXXX}, {tanzeemKhuddam,majlisZeilsheim,idNumber20073,nameXXX}, {tanzeemKhuddam,majlisZeilsheim,idNumber20074,nameXXX}, {tanzeemKhuddam,majlisZeilsheim,idNumber20840,nameXXX}, {tanzeemKhuddam,majlisZeilsheim,idNumber21068,nameXXX}, {tanzeemKhuddam,majlisZeilsheim,idNumber21067,nameXXX}, {tanzeemKhuddam,majlisZeilsheim,idNumber30226,nameXXX}, {tanzeemKhuddam,majlisZeilsheim,idNumber32356,nameXXX}, {tanzeemKhuddam,majlisZeilsheim,idNumber40729,nameXXX}, {tanzeemKhuddam,majlisZeilsheim,idNumber40429,nameXXX}, {tanzeemKhuddam,majlisZeilsheim,idNumber39334,nameXXX}, {tanzeemKhuddam,majlisZeilsheim,idNumber39653,nameXXX}, {tanzeemKhuddam,majlisZeilsheim,idNumber42676,nameXXX}, {tanzeemKhuddam,majlisZeilsheim,idNumber49745,nameXXX}, {tanzeemKhuddam,majlisZeilsheim,idNumber46210,nameXXX}, {tanzeemKhuddam,majlisZeilsheim,idNumber46995,nameXXX}, {tanzeemKhuddam,majlisZeilsheim,idNumber47154,nameXXX}, {tanzeemKhuddam,majlisZeilsheim,idNumber50434,nameXXX}, {tanzeemKhuddam,majlisZeilsheim,idNumber72004,nameXXX}, {tanzeemAtfal,majlisZeilsheim,idNumber52747,nameXXX}, {tanzeemAtfal,majlisZeilsheim,idNumber67374,nameXXX}, {tanzeemAtfal,majlisZeilsheim,idNumber67375,nameXXX}, {tanzeemAtfal,majlisZeilsheim,idNumber49746,nameXXX}, {tanzeemAtfal,majlisZeilsheim,idNumber53243,nameXXX}, {tanzeemAtfal,majlisZeilsheim,idNumber53099,nameXXX}, {tanzeemKinder,majlisZeilsheim,idNumber73252,nameXXX}, {tanzeemKinder,majlisZeilsheim,idNumber72258,nameXXX}, {tanzeemKinder,majlisZeilsheim,idNumber72260,nameXXX}, {tanzeemKinder,majlisZeilsheim,idNumber67376,nameXXX}, {tanzeemKinder,majlisZeilsheim,idNumber64592,nameXXX}, {tanzeemKinder,majlisZeilsheim,idNumber68502,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber33467,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber12711,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber20362,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber12623,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber43685,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber32145,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber35218,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber12822,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber42514,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber35232,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber16672,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber12604,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber51429,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber66196,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber51642,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber12621,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber35474,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber35476,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber56212,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber12675,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber12645,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber47369,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber53115,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber16535,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber49907,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber43459,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber12833,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber30313,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber36671,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber33486,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber33488,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber12796,nameXXX}, {tanzeemAnsar,majlisBad Vilbel,idNumber47867,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber35945,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber17149,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber40922,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12713,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber42258,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber59800,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber11022,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber47635,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber51174,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber31770,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12824,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12826,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12827,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12825,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber35236,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber44504,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12606,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12608,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12915,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber26617,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber72167,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber55134,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber46264,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber65611,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber65613,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber10736,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12677,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber45389,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber34555,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber46862,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber11032,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber52220,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber64468,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber64469,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber20772,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12835,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12836,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber43131,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber38787,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber43144,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber62158,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber65838,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber53188,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12799,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber12800,nameXXX}, {tanzeemKhuddam,majlisBad Vilbel,idNumber66653,nameXXX}, {tanzeemAtfal,majlisBad Vilbel,idNumber56513,nameXXX}, {tanzeemAtfal,majlisBad Vilbel,idNumber63057,nameXXX}, {tanzeemAtfal,majlisBad Vilbel,idNumber47864,nameXXX}, {tanzeemAtfal,majlisBad Vilbel,idNumber75870,nameXXX}, {tanzeemAtfal,majlisBad Vilbel,idNumber51569,nameXXX}, {tanzeemAtfal,majlisBad Vilbel,idNumber69902,nameXXX}, {tanzeemAtfal,majlisBad Vilbel,idNumber60611,nameXXX}, {tanzeemAtfal,majlisBad Vilbel,idNumber60429,nameXXX}, {tanzeemAtfal,majlisBad Vilbel,idNumber53074,nameXXX}, {tanzeemAtfal,majlisBad Vilbel,idNumber47868,nameXXX}, {tanzeemAtfal,majlisBad Vilbel,idNumber52353,nameXXX}, {tanzeemAtfal,majlisBad Vilbel,idNumber66119,nameXXX} ] .map((entry) = ({ tanzeem String(entry.tanzeem  '').trim().toLowerCase(), majlis String(entry.majlis  '').trim(), idNumber String(entry.idNumber  '').trim(), name String(entry.name  '').trim(), }));
const MEMBER_DIRECTORY_DATA = [{tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber11559,nameAhmad Khan},{tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber11599,nameBilal Siddiqi},{tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber11639,nameSajid Ilyas},{tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber11679,nameYasir Latif},{tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber11678,nameZubair Aslam},{tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber11718,nameWaseem Hanif},{tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber11758,nameNadeem Yousaf},{tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber11798,nameFahad Nisar},{tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber11797,nameDanish Parvez},{tanzeemAnsar,majlisBaitus Sabuh Nord,idNumber11837,nameRizwan Karim},{tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber11645,nameAli Raza},{tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber11685,nameHuzaifa Malik},{tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber11725,nameRayyan Iqbal},{tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber11724,nameAmmar Faisal},{tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber11764,nameArham Siddiqui},{tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber11804,nameShayan Khalid},{tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber11844,nameEesa Latif},{tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber11843,nameAbdullah Sami},{tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber11883,nameAhsan Waqas},{tanzeemKhuddam,majlisBaitus Sabuh Nord,idNumber11923,nameHaider Imtiaz},{tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber11731,nameIlyas Tariq},{tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber11771,nameIsa Rehman},{tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber11770,nameSamee Ullah},{tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber11810,nameHanzala Noman},{tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber11850,nameAzlan Javed},{tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber11890,nameEhan Hussain},{tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber11889,nameKiyan Imran},{tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber11929,nameRahil Usman},{tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber11969,nameNuman Faisal},{tanzeemAtfal,majlisBaitus Sabuh Nord,idNumber11968,nameRameen Rashid},{tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber12017,nameFarooq Ahmed},{tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber12057,nameHamid Raza},{tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber12097,nameSohail Anwar},{tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber12137,nameShahid Rafiq},{tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber12136,nameSami Ullah},{tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber12176,nameArif Chaudhry},{tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber12216,nameNaveed Asghar},{tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber12256,nameMansoor Ali},{tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber12255,nameSalman Tariq},{tanzeemAnsar,majlisBaitus Sabuh Süd,idNumber12295,nameAhsan Mirza},{tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber12103,nameIbrahim Nadeem},{tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber12143,nameSufyan Javed},{tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber12183,nameAyaan Rahman},{tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber12182,nameHammad Anwar},{tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber12222,nameTaha Mehmood},{tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber12262,nameHashir Noman},{tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber12302,nameSubhan Nisar},{tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber12301,nameZaryab Salman},{tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber12341,nameKashan Hamid},{tanzeemKhuddam,majlisBaitus Sabuh Süd,idNumber12381,nameRafay Asghar},{tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber12189,nameZayd Qasim},{tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber12229,nameReyan Farooq},{tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber12228,nameDawood Bashir},{tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber12268,nameSarim Rauf},{tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber12308,nameAahil Nadeem},{tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber12307,nameHuzaib Arif},{tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber12347,nameSahil Parvez},{tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber12387,nameAatif Hamid},{tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber12427,nameAreeb Danish},{tanzeemAtfal,majlisBaitus Sabuh Süd,idNumber12426,nameRamees Waseem},{tanzeemAnsar,majlisBad Vilbel,idNumber12477,nameAdnan Bashir},{tanzeemAnsar,majlisBad Vilbel,idNumber12517,nameOwais Malik},{tanzeemAnsar,majlisBad Vilbel,idNumber12557,nameAdeel Rehman},{tanzeemAnsar,majlisBad Vilbel,idNumber12597,nameQasim Iqbal},{tanzeemAnsar,majlisBad Vilbel,idNumber12596,nameAsif Nawaz},{tanzeemAnsar,majlisBad Vilbel,idNumber12636,nameUsman Ghani},{tanzeemAnsar,majlisBad Vilbel,idNumber12676,nameFaisal Latif},{tanzeemAnsar,majlisBad Vilbel,idNumber12716,nameHasnain Qadir},{tanzeemAnsar,majlisBad Vilbel,idNumber12715,nameShakir Rauf},{tanzeemAnsar,majlisBad Vilbel,idNumber12755,nameRashid Mahmood},{tanzeemKhuddam,majlisBad Vilbel,idNumber12563,nameMubashir Asif},{tanzeemKhuddam,majlisBad Vilbel,idNumber12603,nameRayan Bashir},{tanzeemKhuddam,majlisBad Vilbel,idNumber12643,nameMaaz Yousuf},{tanzeemKhuddam,majlisBad Vilbel,idNumber12642,nameDaniyal Farhan},{tanzeemKhuddam,majlisBad Vilbel,idNumber12682,nameArsalan Junaid},{tanzeemKhuddam,majlisBad Vilbel,idNumber12722,nameFaris Omer},{tanzeemKhuddam,majlisBad Vilbel,idNumber12721,nameMoin Uddin},{tanzeemKhuddam,majlisBad Vilbel,idNumber12761,nameFahim Zahid},{tanzeemKhuddam,majlisBad Vilbel,idNumber12801,nameShazil Akbar},{tanzeemKhuddam,majlisBad Vilbel,idNumber12841,nameUmar Farooq},{tanzeemAtfal,majlisBad Vilbel,idNumber12649,nameSarmad Asif},{tanzeemAtfal,majlisBad Vilbel,idNumber12648,nameTaim Noor},{tanzeemAtfal,majlisBad Vilbel,idNumber12688,nameRameez Sami},{tanzeemAtfal,majlisBad Vilbel,idNumber12728,nameZavian Akhtar},{tanzeemAtfal,majlisBad Vilbel,idNumber12768,nameSaif Mahmood},{tanzeemAtfal,majlisBad Vilbel,idNumber12767,nameNahil Qadir},{tanzeemAtfal,majlisBad Vilbel,idNumber12807,nameFawad Munir},{tanzeemAtfal,majlisBad Vilbel,idNumber12847,nameZohair Naveed},{tanzeemAtfal,majlisBad Vilbel,idNumber12887,nameAdam Khan},{tanzeemAtfal,majlisBad Vilbel,idNumber12886,nameMikail Raza},{tanzeemAnsar,majlisBerg,idNumber12939,nameFahad Nisar},{tanzeemAnsar,majlisBerg,idNumber12979,nameDanish Parvez},{tanzeemAnsar,majlisBerg,idNumber13019,nameRizwan Karim},{tanzeemAnsar,majlisBerg,idNumber13018,nameJunaid Zahid},{tanzeemAnsar,majlisBerg,idNumber13058,nameMudassar Iqbal},{tanzeemAnsar,majlisBerg,idNumber13098,nameSaqib Munir},{tanzeemAnsar,majlisBerg,idNumber13138,nameAtif Shabbir},{tanzeemAnsar,majlisBerg,idNumber13137,nameTariq Mehmood},{tanzeemAnsar,majlisBerg,idNumber13177,nameKhalid Hussain},{tanzeemAnsar,majlisBerg,idNumber13217,nameImran Qureshi},{tanzeemKhuddam,majlisBerg,idNumber13025,nameAbdullah Sami},{tanzeemKhuddam,majlisBerg,idNumber13065,nameAhsan Waqas},{tanzeemKhuddam,majlisBerg,idNumber13064,nameHaider Imtiaz},{tanzeemKhuddam,majlisBerg,idNumber13104,nameJawad Nadeem},{tanzeemKhuddam,majlisBerg,idNumber13144,nameSameer Adil},{tanzeemKhuddam,majlisBerg,idNumber13184,nameZohaib Tariq},{tanzeemKhuddam,majlisBerg,idNumber13183,nameHamza Khan},{tanzeemKhuddam,majlisBerg,idNumber13223,nameZain ul Abideen},{tanzeemKhuddam,majlisBerg,idNumber13263,nameSaad Ahmad},{tanzeemKhuddam,majlisBerg,idNumber13303,nameYahya Rashid},{tanzeemAtfal,majlisBerg,idNumber13111,nameRahil Usman},{tanzeemAtfal,majlisBerg,idNumber13110,nameNuman Faisal},{tanzeemAtfal,majlisBerg,idNumber13150,nameRameen Rashid},{tanzeemAtfal,majlisBerg,idNumber13190,nameRayaan Sohail},{tanzeemAtfal,majlisBerg,idNumber13230,nameShameer Irfan},{tanzeemAtfal,majlisBerg,idNumber13229,nameFaizan Karim},{tanzeemAtfal,majlisBerg,idNumber13269,nameYusuf Ahmad},{tanzeemAtfal,majlisBerg,idNumber13309,nameAyan Malik},{tanzeemAtfal,majlisBerg,idNumber13308,nameHaris Iqbal},{tanzeemAtfal,majlisBerg,idNumber13348,nameAariz Latif},{tanzeemAnsar,majlisBornheim,idNumber13403,nameMansoor Ali},{tanzeemAnsar,majlisBornheim,idNumber13443,nameSalman Tariq},{tanzeemAnsar,majlisBornheim,idNumber13483,nameAhsan Mirza},{tanzeemAnsar,majlisBornheim,idNumber13482,nameIrfan Ashraf},{tanzeemAnsar,majlisBornheim,idNumber13522,nameAhmad Khan},{tanzeemAnsar,majlisBornheim,idNumber13562,nameBilal Siddiqi},{tanzeemAnsar,majlisBornheim,idNumber13561,nameSajid Ilyas},{tanzeemAnsar,majlisBornheim,idNumber13601,nameYasir Latif},{tanzeemAnsar,majlisBornheim,idNumber13641,nameZubair Aslam},{tanzeemAnsar,majlisBornheim,idNumber13681,nameWaseem Hanif},{tanzeemKhuddam,majlisBornheim,idNumber13489,nameZaryab Salman},{tanzeemKhuddam,majlisBornheim,idNumber13529,nameKashan Hamid},{tanzeemKhuddam,majlisBornheim,idNumber13528,nameRafay Asghar},{tanzeemKhuddam,majlisBornheim,idNumber13568,nameBurhan Rafiq},{tanzeemKhuddam,majlisBornheim,idNumber13608,nameAli Raza},{tanzeemKhuddam,majlisBornheim,idNumber13607,nameHuzaifa Malik},{tanzeemKhuddam,majlisBornheim,idNumber13647,nameRayyan Iqbal},{tanzeemKhuddam,majlisBornheim,idNumber13687,nameAmmar Faisal},{tanzeemKhuddam,majlisBornheim,idNumber13727,nameArham Siddiqui},{tanzeemKhuddam,majlisBornheim,idNumber13726,nameShayan Khalid},{tanzeemAtfal,majlisBornheim,idNumber13534,nameAatif Hamid},{tanzeemAtfal,majlisBornheim,idNumber13574,nameAreeb Danish},{tanzeemAtfal,majlisBornheim,idNumber13614,nameRamees Waseem},{tanzeemAtfal,majlisBornheim,idNumber13654,nameAqeel Junaid},{tanzeemAtfal,majlisBornheim,idNumber13653,nameIlyas Tariq},{tanzeemAtfal,majlisBornheim,idNumber13693,nameIsa Rehman},{tanzeemAtfal,majlisBornheim,idNumber13733,nameSamee Ullah},{tanzeemAtfal,majlisBornheim,idNumber13773,nameHanzala Noman},{tanzeemAtfal,majlisBornheim,idNumber13772,nameAzlan Javed},{tanzeemAtfal,majlisBornheim,idNumber13812,nameEhan Hussain},{tanzeemAnsar,majlisEschersheim,idNumber13869,nameHasnain Qadir},{tanzeemAnsar,majlisEschersheim,idNumber13909,nameShakir Rauf},{tanzeemAnsar,majlisEschersheim,idNumber13908,nameRashid Mahmood},{tanzeemAnsar,majlisEschersheim,idNumber13948,nameNaeem Akhtar},{tanzeemAnsar,majlisEschersheim,idNumber13988,nameFarooq Ahmed},{tanzeemAnsar,majlisEschersheim,idNumber14028,nameHamid Raza},{tanzeemAnsar,majlisEschersheim,idNumber14027,nameSohail Anwar},{tanzeemAnsar,majlisEschersheim,idNumber14067,nameShahid Rafiq},{tanzeemAnsar,majlisEschersheim,idNumber14107,nameSami Ullah},{tanzeemAnsar,majlisEschersheim,idNumber14106,nameArif Chaudhry},{tanzeemKhuddam,majlisEschersheim,idNumber13955,nameFahim Zahid},{tanzeemKhuddam,majlisEschersheim,idNumber13954,nameShazil Akbar},{tanzeemKhuddam,majlisEschersheim,idNumber13994,nameUmar Farooq},{tanzeemKhuddam,majlisEschersheim,idNumber14034,nameMusa Tariq},{tanzeemKhuddam,majlisEschersheim,idNumber14033,nameIbrahim Nadeem},{tanzeemKhuddam,majlisEschersheim,idNumber14073,nameSufyan Javed},{tanzeemKhuddam,majlisEschersheim,idNumber14113,nameAyaan Rahman},{tanzeemKhuddam,majlisEschersheim,idNumber14153,nameHammad Anwar},{tanzeemKhuddam,majlisEschersheim,idNumber14152,nameTaha Mehmood},{tanzeemKhuddam,majlisEschersheim,idNumber14192,nameHashir Noman},{tanzeemAtfal,majlisEschersheim,idNumber14000,nameZohair Naveed},{tanzeemAtfal,majlisEschersheim,idNumber14040,nameAdam Khan},{tanzeemAtfal,majlisEschersheim,idNumber14080,nameMikail Raza},{tanzeemAtfal,majlisEschersheim,idNumber14079,nameRafi Ahmed},{tanzeemAtfal,majlisEschersheim,idNumber14119,nameZayd Qasim},{tanzeemAtfal,majlisEschersheim,idNumber14159,nameReyan Farooq},{tanzeemAtfal,majlisEschersheim,idNumber14199,nameDawood Bashir},{tanzeemAtfal,majlisEschersheim,idNumber14198,nameSarim Rauf},{tanzeemAtfal,majlisEschersheim,idNumber14238,nameAahil Nadeem},{tanzeemAtfal,majlisEschersheim,idNumber14278,nameHuzaib Arif},{tanzeemAnsar,majlisGriesheim,idNumber14337,nameTariq Mehmood},{tanzeemAnsar,majlisGriesheim,idNumber14336,nameKhalid Hussain},{tanzeemAnsar,majlisGriesheim,idNumber14376,nameImran Qureshi},{tanzeemAnsar,majlisGriesheim,idNumber14416,nameNoman Javed},{tanzeemAnsar,majlisGriesheim,idNumber14456,nameAdnan Bashir},{tanzeemAnsar,majlisGriesheim,idNumber14455,nameOwais Malik},{tanzeemAnsar,majlisGriesheim,idNumber14495,nameAdeel Rehman},{tanzeemAnsar,majlisGriesheim,idNumber14535,nameQasim Iqbal},{tanzeemAnsar,majlisGriesheim,idNumber14534,nameAsif Nawaz},{tanzeemAnsar,majlisGriesheim,idNumber14574,nameUsman Ghani},{tanzeemKhuddam,majlisGriesheim,idNumber14382,nameZain ul Abideen},{tanzeemKhuddam,majlisGriesheim,idNumber14422,nameSaad Ahmad},{tanzeemKhuddam,majlisGriesheim,idNumber14462,nameYahya Rashid},{tanzeemKhuddam,majlisGriesheim,idNumber14461,nameTalha Qasim},{tanzeemKhuddam,majlisGriesheim,idNumber14501,nameMubashir Asif},{tanzeemKhuddam,majlisGriesheim,idNumber14541,nameRayan Bashir},{tanzeemKhuddam,majlisGriesheim,idNumber14581,nameMaaz Yousuf},{tanzeemKhuddam,majlisGriesheim,idNumber14580,nameDaniyal Farhan},{tanzeemKhuddam,majlisGriesheim,idNumber14620,nameArsalan Junaid},{tanzeemKhuddam,majlisGriesheim,idNumber14660,nameFaris Omer},{tanzeemAtfal,majlisGriesheim,idNumber14468,nameAyan Malik},{tanzeemAtfal,majlisGriesheim,idNumber14508,nameHaris Iqbal},{tanzeemAtfal,majlisGriesheim,idNumber14507,nameAariz Latif},{tanzeemAtfal,majlisGriesheim,idNumber14547,nameShayan Ali},{tanzeemAtfal,majlisGriesheim,idNumber14587,nameSarmad Asif},{tanzeemAtfal,majlisGriesheim,idNumber14627,nameTaim Noor},{tanzeemAtfal,majlisGriesheim,idNumber14626,nameRameez Sami},{tanzeemAtfal,majlisGriesheim,idNumber14666,nameZavian Akhtar},{tanzeemAtfal,majlisGriesheim,idNumber14706,nameSaif Mahmood},{tanzeemAtfal,majlisGriesheim,idNumber14746,nameNahil Qadir},{tanzeemAnsar,majlisGinnheim,idNumber14766,nameYasir Latif},{tanzeemAnsar,majlisGinnheim,idNumber14806,nameZubair Aslam},{tanzeemAnsar,majlisGinnheim,idNumber14846,nameWaseem Hanif},{tanzeemAnsar,majlisGinnheim,idNumber14845,nameNadeem Yousaf},{tanzeemAnsar,majlisGinnheim,idNumber14885,nameFahad Nisar},{tanzeemAnsar,majlisGinnheim,idNumber14925,nameDanish Parvez},{tanzeemAnsar,majlisGinnheim,idNumber14965,nameRizwan Karim},{tanzeemAnsar,majlisGinnheim,idNumber14964,nameJunaid Zahid},{tanzeemAnsar,majlisGinnheim,idNumber15004,nameMudassar Iqbal},{tanzeemAnsar,majlisGinnheim,idNumber15044,nameSaqib Munir},{tanzeemKhuddam,majlisGinnheim,idNumber14852,nameAmmar Faisal},{tanzeemKhuddam,majlisGinnheim,idNumber14892,nameArham Siddiqui},{tanzeemKhuddam,majlisGinnheim,idNumber14891,nameShayan Khalid},{tanzeemKhuddam,majlisGinnheim,idNumber14931,nameEesa Latif},{tanzeemKhuddam,majlisGinnheim,idNumber14971,nameAbdullah Sami},{tanzeemKhuddam,majlisGinnheim,idNumber15011,nameAhsan Waqas},{tanzeemKhuddam,majlisGinnheim,idNumber15010,nameHaider Imtiaz},{tanzeemKhuddam,majlisGinnheim,idNumber15050,nameJawad Nadeem},{tanzeemKhuddam,majlisGinnheim,idNumber15090,nameSameer Adil},{tanzeemKhuddam,majlisGinnheim,idNumber15130,nameZohaib Tariq},{tanzeemAtfal,majlisGinnheim,idNumber14938,nameHanzala Noman},{tanzeemAtfal,majlisGinnheim,idNumber14937,nameAzlan Javed},{tanzeemAtfal,majlisGinnheim,idNumber14977,nameEhan Hussain},{tanzeemAtfal,majlisGinnheim,idNumber15017,nameKiyan Imran},{tanzeemAtfal,majlisGinnheim,idNumber15057,nameRahil Usman},{tanzeemAtfal,majlisGinnheim,idNumber15056,nameNuman Faisal},{tanzeemAtfal,majlisGinnheim,idNumber15096,nameRameen Rashid},{tanzeemAtfal,majlisGinnheim,idNumber15136,nameRayaan Sohail},{tanzeemAtfal,majlisGinnheim,idNumber15176,nameShameer Irfan},{tanzeemAtfal,majlisGinnheim,idNumber15175,nameFaizan Karim},{tanzeemAnsar,majlisGoldstein,idNumber15238,nameShahid Rafiq},{tanzeemAnsar,majlisGoldstein,idNumber15278,nameSami Ullah},{tanzeemAnsar,majlisGoldstein,idNumber15277,nameArif Chaudhry},{tanzeemAnsar,majlisGoldstein,idNumber15317,nameNaveed Asghar},{tanzeemAnsar,majlisGoldstein,idNumber15357,nameMansoor Ali},{tanzeemAnsar,majlisGoldstein,idNumber15397,nameSalman Tariq},{tanzeemAnsar,majlisGoldstein,idNumber15396,nameAhsan Mirza},{tanzeemAnsar,majlisGoldstein,idNumber15436,nameIrfan Ashraf},{tanzeemAnsar,majlisGoldstein,idNumber15476,nameAhmad Khan},{tanzeemAnsar,majlisGoldstein,idNumber15516,nameBilal Siddiqi},{tanzeemKhuddam,majlisGoldstein,idNumber15324,nameHammad Anwar},{tanzeemKhuddam,majlisGoldstein,idNumber15323,nameTaha Mehmood},{tanzeemKhuddam,majlisGoldstein,idNumber15363,nameHashir Noman},{tanzeemKhuddam,majlisGoldstein,idNumber15403,nameSubhan Nisar},{tanzeemKhuddam,majlisGoldstein,idNumber15443,nameZaryab Salman},{tanzeemKhuddam,majlisGoldstein,idNumber15442,nameKashan Hamid},{tanzeemKhuddam,majlisGoldstein,idNumber15482,nameRafay Asghar},{tanzeemKhuddam,majlisGoldstein,idNumber15522,nameBurhan Rafiq},{tanzeemKhuddam,majlisGoldstein,idNumber15521,nameAli Raza},{tanzeemKhuddam,majlisGoldstein,idNumber15561,nameHuzaifa Malik},{tanzeemAtfal,majlisGoldstein,idNumber15369,nameSarim Rauf},{tanzeemAtfal,majlisGoldstein,idNumber15409,nameAahil Nadeem},{tanzeemAtfal,majlisGoldstein,idNumber15449,nameHuzaib Arif},{tanzeemAtfal,majlisGoldstein,idNumber15448,nameSahil Parvez},{tanzeemAtfal,majlisGoldstein,idNumber15488,nameAatif Hamid},{tanzeemAtfal,majlisGoldstein,idNumber15528,nameAreeb Danish},{tanzeemAtfal,majlisGoldstein,idNumber15568,nameRamees Waseem},{tanzeemAtfal,majlisGoldstein,idNumber15567,nameAqeel Junaid},{tanzeemAtfal,majlisGoldstein,idNumber15607,nameIlyas Tariq},{tanzeemAtfal,majlisGoldstein,idNumber15647,nameIsa Rehman},{tanzeemAnsar,majlisHausen,idNumber15712,nameQasim Iqbal},{tanzeemAnsar,majlisHausen,idNumber15711,nameAsif Nawaz},{tanzeemAnsar,majlisHausen,idNumber15751,nameUsman Ghani},{tanzeemAnsar,majlisHausen,idNumber15791,nameFaisal Latif},{tanzeemAnsar,majlisHausen,idNumber15790,nameHasnain Qadir},{tanzeemAnsar,majlisHausen,idNumber15830,nameShakir Rauf},{tanzeemAnsar,majlisHausen,idNumber15870,nameRashid Mahmood},{tanzeemAnsar,majlisHausen,idNumber15910,nameNaeem Akhtar},{tanzeemAnsar,majlisHausen,idNumber15909,nameFarooq Ahmed},{tanzeemAnsar,majlisHausen,idNumber15949,nameHamid Raza},{tanzeemKhuddam,majlisHausen,idNumber15757,nameDaniyal Farhan},{tanzeemKhuddam,majlisHausen,idNumber15797,nameArsalan Junaid},{tanzeemKhuddam,majlisHausen,idNumber15837,nameFaris Omer},{tanzeemKhuddam,majlisHausen,idNumber15836,nameMoin Uddin},{tanzeemKhuddam,majlisHausen,idNumber15876,nameFahim Zahid},{tanzeemKhuddam,majlisHausen,idNumber15916,nameShazil Akbar},{tanzeemKhuddam,majlisHausen,idNumber15956,nameUmar Farooq},{tanzeemKhuddam,majlisHausen,idNumber15955,nameMusa Tariq},{tanzeemKhuddam,majlisHausen,idNumber15995,nameIbrahim Nadeem},{tanzeemKhuddam,majlisHausen,idNumber16035,nameSufyan Javed},{tanzeemAtfal,majlisHausen,idNumber15843,nameZavian Akhtar},{tanzeemAtfal,majlisHausen,idNumber15883,nameSaif Mahmood},{tanzeemAtfal,majlisHausen,idNumber15882,nameNahil Qadir},{tanzeemAtfal,majlisHausen,idNumber15922,nameFawad Munir},{tanzeemAtfal,majlisHausen,idNumber15962,nameZohair Naveed},{tanzeemAtfal,majlisHausen,idNumber16002,nameAdam Khan},{tanzeemAtfal,majlisHausen,idNumber16001,nameMikail Raza},{tanzeemAtfal,majlisHausen,idNumber16041,nameRafi Ahmed},{tanzeemAtfal,majlisHausen,idNumber16081,nameZayd Qasim},{tanzeemAtfal,majlisHausen,idNumber16080,nameReyan Farooq},{tanzeemAnsar,majlisHöchst,idNumber16147,nameJunaid Zahid},{tanzeemAnsar,majlisHöchst,idNumber16187,nameMudassar Iqbal},{tanzeemAnsar,majlisHöchst,idNumber16227,nameSaqib Munir},{tanzeemAnsar,majlisHöchst,idNumber16226,nameAtif Shabbir},{tanzeemAnsar,majlisHöchst,idNumber16266,nameTariq Mehmood},{tanzeemAnsar,majlisHöchst,idNumber16306,nameKhalid Hussain},{tanzeemAnsar,majlisHöchst,idNumber16305,nameImran Qureshi},{tanzeemAnsar,majlisHöchst,idNumber16345,nameNoman Javed},{tanzeemAnsar,majlisHöchst,idNumber16385,nameAdnan Bashir},{tanzeemAnsar,majlisHöchst,idNumber16425,nameOwais Malik},{tanzeemKhuddam,majlisHöchst,idNumber16233,nameJawad Nadeem},{tanzeemKhuddam,majlisHöchst,idNumber16232,nameSameer Adil},{tanzeemKhuddam,majlisHöchst,idNumber16272,nameZohaib Tariq},{tanzeemKhuddam,majlisHöchst,idNumber16312,nameHamza Khan},{tanzeemKhuddam,majlisHöchst,idNumber16352,nameZain ul Abideen},{tanzeemKhuddam,majlisHöchst,idNumber16351,nameSaad Ahmad},{tanzeemKhuddam,majlisHöchst,idNumber16391,nameYahya Rashid},{tanzeemKhuddam,majlisHöchst,idNumber16431,nameTalha Qasim},{tanzeemKhuddam,majlisHöchst,idNumber16471,nameMubashir Asif},{tanzeemKhuddam,majlisHöchst,idNumber16470,nameRayan Bashir},{tanzeemAtfal,majlisHöchst,idNumber16278,nameRayaan Sohail},{tanzeemAtfal,majlisHöchst,idNumber16318,nameShameer Irfan},{tanzeemAtfal,majlisHöchst,idNumber16358,nameFaizan Karim},{tanzeemAtfal,majlisHöchst,idNumber16398,nameYusuf Ahmad},{tanzeemAtfal,majlisHöchst,idNumber16397,nameAyan Malik},{tanzeemAtfal,majlisHöchst,idNumber16437,nameHaris Iqbal},{tanzeemAtfal,majlisHöchst,idNumber16477,nameAariz Latif},{tanzeemAtfal,majlisHöchst,idNumber16517,nameShayan Ali},{tanzeemAtfal,majlisHöchst,idNumber16516,nameSarmad Asif},{tanzeemAtfal,majlisHöchst,idNumber16556,nameTaim Noor},{tanzeemAnsar,majlisNied,idNumber16625,nameIrfan Ashraf},{tanzeemAnsar,majlisNied,idNumber16624,nameAhmad Khan},{tanzeemAnsar,majlisNied,idNumber16664,nameBilal Siddiqi},{tanzeemAnsar,majlisNied,idNumber16704,nameSajid Ilyas},{tanzeemAnsar,majlisNied,idNumber16703,nameYasir Latif},{tanzeemAnsar,majlisNied,idNumber16743,nameZubair Aslam},{tanzeemAnsar,majlisNied,idNumber16783,nameWaseem Hanif},{tanzeemAnsar,majlisNied,idNumber16823,nameNadeem Yousaf},{tanzeemAnsar,majlisNied,idNumber16822,nameFahad Nisar},{tanzeemAnsar,majlisNied,idNumber16862,nameDanish Parvez},{tanzeemKhuddam,majlisNied,idNumber16670,nameBurhan Rafiq},{tanzeemKhuddam,majlisNied,idNumber16710,nameAli Raza},{tanzeemKhuddam,majlisNied,idNumber16750,nameHuzaifa Malik},{tanzeemKhuddam,majlisNied,idNumber16749,nameRayyan Iqbal},{tanzeemKhuddam,majlisNied,idNumber16789,nameAmmar Faisal},{tanzeemKhuddam,majlisNied,idNumber16829,nameArham Siddiqui},{tanzeemKhuddam,majlisNied,idNumber16869,nameShayan Khalid},{tanzeemKhuddam,majlisNied,idNumber16868,nameEesa Latif},{tanzeemKhuddam,majlisNied,idNumber16908,nameAbdullah Sami},{tanzeemKhuddam,majlisNied,idNumber16948,nameAhsan Waqas},{tanzeemAtfal,majlisNied,idNumber16756,nameAqeel Junaid},{tanzeemAtfal,majlisNied,idNumber16796,nameIlyas Tariq},{tanzeemAtfal,majlisNied,idNumber16795,nameIsa Rehman},{tanzeemAtfal,majlisNied,idNumber16835,nameSamee Ullah},{tanzeemAtfal,majlisNied,idNumber16875,nameHanzala Noman},{tanzeemAtfal,majlisNied,idNumber16915,nameAzlan Javed},{tanzeemAtfal,majlisNied,idNumber16914,nameEhan Hussain},{tanzeemAtfal,majlisNied,idNumber16954,nameKiyan Imran},{tanzeemAtfal,majlisNied,idNumber16994,nameRahil Usman},{tanzeemAtfal,majlisNied,idNumber16993,nameNuman Faisal},{tanzeemAnsar,majlisNordweststadt,idNumber17064,nameNaeem Akhtar},{tanzeemAnsar,majlisNordweststadt,idNumber17104,nameFarooq Ahmed},{tanzeemAnsar,majlisNordweststadt,idNumber17103,nameHamid Raza},{tanzeemAnsar,majlisNordweststadt,idNumber17143,nameSohail Anwar},{tanzeemAnsar,majlisNordweststadt,idNumber17183,nameShahid Rafiq},{tanzeemAnsar,majlisNordweststadt,idNumber17223,nameSami Ullah},{tanzeemAnsar,majlisNordweststadt,idNumber17222,nameArif Chaudhry},{tanzeemAnsar,majlisNordweststadt,idNumber17262,nameNaveed Asghar},{tanzeemAnsar,majlisNordweststadt,idNumber17302,nameMansoor Ali},{tanzeemAnsar,majlisNordweststadt,idNumber17342,nameSalman Tariq},{tanzeemKhuddam,majlisNordweststadt,idNumber17150,nameMusa Tariq},{tanzeemKhuddam,majlisNordweststadt,idNumber17149,nameIbrahim Nadeem},{tanzeemKhuddam,majlisNordweststadt,idNumber17189,nameSufyan Javed},{tanzeemKhuddam,majlisNordweststadt,idNumber17229,nameAyaan Rahman},{tanzeemKhuddam,majlisNordweststadt,idNumber17269,nameHammad Anwar},{tanzeemKhuddam,majlisNordweststadt,idNumber17268,nameTaha Mehmood},{tanzeemKhuddam,majlisNordweststadt,idNumber17308,nameHashir Noman},{tanzeemKhuddam,majlisNordweststadt,idNumber17348,nameSubhan Nisar},{tanzeemKhuddam,majlisNordweststadt,idNumber17388,nameZaryab Salman},{tanzeemKhuddam,majlisNordweststadt,idNumber17387,nameKashan Hamid},{tanzeemAtfal,majlisNordweststadt,idNumber17195,nameRafi Ahmed},{tanzeemAtfal,majlisNordweststadt,idNumber17235,nameZayd Qasim},{tanzeemAtfal,majlisNordweststadt,idNumber17275,nameReyan Farooq},{tanzeemAtfal,majlisNordweststadt,idNumber17315,nameDawood Bashir},{tanzeemAtfal,majlisNordweststadt,idNumber17314,nameSarim Rauf},{tanzeemAtfal,majlisNordweststadt,idNumber17354,nameAahil Nadeem},{tanzeemAtfal,majlisNordweststadt,idNumber17394,nameHuzaib Arif},{tanzeemAtfal,majlisNordweststadt,idNumber17393,nameSahil Parvez},{tanzeemAtfal,majlisNordweststadt,idNumber17433,nameAatif Hamid},{tanzeemAtfal,majlisNordweststadt,idNumber17473,nameAreeb Danish},{tanzeemAnsar,majlisNuur Moschee,idNumber17505,nameNoman Javed},{tanzeemAnsar,majlisNuur Moschee,idNumber17545,nameAdnan Bashir},{tanzeemAnsar,majlisNuur Moschee,idNumber17585,nameOwais Malik},{tanzeemAnsar,majlisNuur Moschee,idNumber17625,nameAdeel Rehman},{tanzeemAnsar,majlisNuur Moschee,idNumber17624,nameQasim Iqbal},{tanzeemAnsar,majlisNuur Moschee,idNumber17664,nameAsif Nawaz},{tanzeemAnsar,majlisNuur Moschee,idNumber17704,nameUsman Ghani},{tanzeemAnsar,majlisNuur Moschee,idNumber17703,nameFaisal Latif},{tanzeemAnsar,majlisNuur Moschee,idNumber17743,nameHasnain Qadir},{tanzeemAnsar,majlisNuur Moschee,idNumber17783,nameShakir Rauf},{tanzeemKhuddam,majlisNuur Moschee,idNumber17591,nameTalha Qasim},{tanzeemKhuddam,majlisNuur Moschee,idNumber17631,nameMubashir Asif},{tanzeemKhuddam,majlisNuur Moschee,idNumber17671,nameRayan Bashir},{tanzeemKhuddam,majlisNuur Moschee,idNumber17670,nameMaaz Yousuf},{tanzeemKhuddam,majlisNuur Moschee,idNumber17710,nameDaniyal Farhan},{tanzeemKhuddam,majlisNuur Moschee,idNumber17750,nameArsalan Junaid},{tanzeemKhuddam,majlisNuur Moschee,idNumber17749,nameFaris Omer},{tanzeemKhuddam,majlisNuur Moschee,idNumber17789,nameMoin Uddin},{tanzeemKhuddam,majlisNuur Moschee,idNumber17829,nameFahim Zahid},{tanzeemKhuddam,majlisNuur Moschee,idNumber17869,nameShazil Akbar},{tanzeemAtfal,majlisNuur Moschee,idNumber17677,nameShayan Ali},{tanzeemAtfal,majlisNuur Moschee,idNumber17676,nameSarmad Asif},{tanzeemAtfal,majlisNuur Moschee,idNumber17716,nameTaim Noor},{tanzeemAtfal,majlisNuur Moschee,idNumber17756,nameRameez Sami},{tanzeemAtfal,majlisNuur Moschee,idNumber17796,nameZavian Akhtar},{tanzeemAtfal,majlisNuur Moschee,idNumber17795,nameSaif Mahmood},{tanzeemAtfal,majlisNuur Moschee,idNumber17835,nameNahil Qadir},{tanzeemAtfal,majlisNuur Moschee,idNumber17875,nameFawad Munir},{tanzeemAtfal,majlisNuur Moschee,idNumber17915,nameZohair Naveed},{tanzeemAtfal,majlisNuur Moschee,idNumber17914,nameAdam Khan},{tanzeemAnsar,majlisRiedberg,idNumber17989,nameNadeem Yousaf},{tanzeemAnsar,majlisRiedberg,idNumber17988,nameFahad Nisar},{tanzeemAnsar,majlisRiedberg,idNumber18028,nameDanish Parvez},{tanzeemAnsar,majlisRiedberg,idNumber18068,nameRizwan Karim},{tanzeemAnsar,majlisRiedberg,idNumber18108,nameJunaid Zahid},{tanzeemAnsar,majlisRiedberg,idNumber18107,nameMudassar Iqbal},{tanzeemAnsar,majlisRiedberg,idNumber18147,nameSaqib Munir},{tanzeemAnsar,majlisRiedberg,idNumber18187,nameAtif Shabbir},{tanzeemAnsar,majlisRiedberg,idNumber18227,nameTariq Mehmood},{tanzeemAnsar,majlisRiedberg,idNumber18226,nameKhalid Hussain},{tanzeemKhuddam,majlisRiedberg,idNumber18034,nameEesa Latif},{tanzeemKhuddam,majlisRiedberg,idNumber18074,nameAbdullah Sami},{tanzeemKhuddam,majlisRiedberg,idNumber18114,nameAhsan Waqas},{tanzeemKhuddam,majlisRiedberg,idNumber18154,nameHaider Imtiaz},{tanzeemKhuddam,majlisRiedberg,idNumber18153,nameJawad Nadeem},{tanzeemKhuddam,majlisRiedberg,idNumber18193,nameSameer Adil},{tanzeemKhuddam,majlisRiedberg,idNumber18233,nameZohaib Tariq},{tanzeemKhuddam,majlisRiedberg,idNumber18273,nameHamza Khan},{tanzeemKhuddam,majlisRiedberg,idNumber18272,nameZain ul Abideen},{tanzeemKhuddam,majlisRiedberg,idNumber18312,nameSaad Ahmad},{tanzeemAtfal,majlisRiedberg,idNumber18120,nameKiyan Imran},{tanzeemAtfal,majlisRiedberg,idNumber18160,nameRahil Usman},{tanzeemAtfal,majlisRiedberg,idNumber18200,nameNuman Faisal},{tanzeemAtfal,majlisRiedberg,idNumber18199,nameRameen Rashid},{tanzeemAtfal,majlisRiedberg,idNumber18239,nameRayaan Sohail},{tanzeemAtfal,majlisRiedberg,idNumber18279,nameShameer Irfan},{tanzeemAtfal,majlisRiedberg,idNumber18278,nameFaizan Karim},{tanzeemAtfal,majlisRiedberg,idNumber18318,nameYusuf Ahmad},{tanzeemAtfal,majlisRiedberg,idNumber18358,nameAyan Malik},{tanzeemAtfal,majlisRiedberg,idNumber18398,nameHaris Iqbal},{tanzeemAnsar,majlisRödelheim,idNumber18434,nameNaveed Asghar},{tanzeemAnsar,majlisRödelheim,idNumber18474,nameMansoor Ali},{tanzeemAnsar,majlisRödelheim,idNumber18473,nameSalman Tariq},{tanzeemAnsar,majlisRödelheim,idNumber18513,nameAhsan Mirza},{tanzeemAnsar,majlisRödelheim,idNumber18553,nameIrfan Ashraf},{tanzeemAnsar,majlisRödelheim,idNumber18593,nameAhmad Khan},{tanzeemAnsar,majlisRödelheim,idNumber18592,nameBilal Siddiqi},{tanzeemAnsar,majlisRödelheim,idNumber18632,nameSajid Ilyas},{tanzeemAnsar,majlisRödelheim,idNumber18672,nameYasir Latif},{tanzeemAnsar,majlisRödelheim,idNumber18712,nameZubair Aslam},{tanzeemKhuddam,majlisRödelheim,idNumber18520,nameSubhan Nisar},{tanzeemKhuddam,majlisRödelheim,idNumber18519,nameZaryab Salman},{tanzeemKhuddam,majlisRödelheim,idNumber18559,nameKashan Hamid},{tanzeemKhuddam,majlisRödelheim,idNumber18599,nameRafay Asghar},{tanzeemKhuddam,majlisRödelheim,idNumber18639,nameBurhan Rafiq},{tanzeemKhuddam,majlisRödelheim,idNumber18638,nameAli Raza},{tanzeemKhuddam,majlisRödelheim,idNumber18678,nameHuzaifa Malik},{tanzeemKhuddam,majlisRödelheim,idNumber18718,nameRayyan Iqbal},{tanzeemKhuddam,majlisRödelheim,idNumber18758,nameAmmar Faisal},{tanzeemKhuddam,majlisRödelheim,idNumber18757,nameArham Siddiqui},{tanzeemAtfal,majlisRödelheim,idNumber18565,nameSahil Parvez},{tanzeemAtfal,majlisRödelheim,idNumber18605,nameAatif Hamid},{tanzeemAtfal,majlisRödelheim,idNumber18645,nameAreeb Danish},{tanzeemAtfal,majlisRödelheim,idNumber18685,nameRamees Waseem},{tanzeemAtfal,majlisRödelheim,idNumber18684,nameAqeel Junaid},{tanzeemAtfal,majlisRödelheim,idNumber18724,nameIlyas Tariq},{tanzeemAtfal,majlisRödelheim,idNumber18764,nameIsa Rehman},{tanzeemAtfal,majlisRödelheim,idNumber18763,nameSamee Ullah},{tanzeemAtfal,majlisRödelheim,idNumber18803,nameHanzala Noman},{tanzeemAtfal,majlisRödelheim,idNumber18843,nameAzlan Javed},{tanzeemAnsar,majlisZeilsheim,idNumber18881,nameFaisal Latif},{tanzeemAnsar,majlisZeilsheim,idNumber18921,nameHasnain Qadir},{tanzeemAnsar,majlisZeilsheim,idNumber18961,nameShakir Rauf},{tanzeemAnsar,majlisZeilsheim,idNumber18960,nameRashid Mahmood},{tanzeemAnsar,majlisZeilsheim,idNumber19000,nameNaeem Akhtar},{tanzeemAnsar,majlisZeilsheim,idNumber19040,nameFarooq Ahmed},{tanzeemAnsar,majlisZeilsheim,idNumber19080,nameHamid Raza},{tanzeemAnsar,majlisZeilsheim,idNumber19079,nameSohail Anwar},{tanzeemAnsar,majlisZeilsheim,idNumber19119,nameShahid Rafiq},{tanzeemAnsar,majlisZeilsheim,idNumber19159,nameSami Ullah},{tanzeemKhuddam,majlisZeilsheim,idNumber18967,nameMoin Uddin},{tanzeemKhuddam,majlisZeilsheim,idNumber19007,nameFahim Zahid},{tanzeemKhuddam,majlisZeilsheim,idNumber19006,nameShazil Akbar},{tanzeemKhuddam,majlisZeilsheim,idNumber19046,nameUmar Farooq},{tanzeemKhuddam,majlisZeilsheim,idNumber19086,nameMusa Tariq},{tanzeemKhuddam,majlisZeilsheim,idNumber19126,nameIbrahim Nadeem},{tanzeemKhuddam,majlisZeilsheim,idNumber19125,nameSufyan Javed},{tanzeemKhuddam,majlisZeilsheim,idNumber19165,nameAyaan Rahman},{tanzeemKhuddam,majlisZeilsheim,idNumber19205,nameHammad Anwar},{tanzeemKhuddam,majlisZeilsheim,idNumber19245,nameTaha Mehmood},{tanzeemAtfal,majlisZeilsheim,idNumber19053,nameFawad Munir},{tanzeemAtfal,majlisZeilsheim,idNumber19052,nameZohair Naveed},{tanzeemAtfal,majlisZeilsheim,idNumber19092,nameAdam Khan},{tanzeemAtfal,majlisZeilsheim,idNumber19132,nameMikail Raza},{tanzeemAtfal,majlisZeilsheim,idNumber19172,nameRafi Ahmed},{tanzeemAtfal,majlisZeilsheim,idNumber19171,nameZayd Qasim},{tanzeemAtfal,majlisZeilsheim,idNumber19211,nameReyan Farooq},{tanzeemAtfal,majlisZeilsheim,idNumber19251,nameDawood Bashir},{tanzeemAtfal,majlisZeilsheim,idNumber19250,nameSarim Rauf},{tanzeemAtfal,majlisZeilsheim,idNumber19290,nameAahil Nadeem}].map((entry) = ({
  tanzeem String(entry.tanzeem  '').trim().toLowerCase(),
  majlis String(entry.majlis  '').trim(),
  idNumber String(entry.idNumber  '').trim(),
  name String(entry.name  '').trim(),
}));


const TAB_ITEMS = [
  { key 'gebetsplan', label 'Gebetszeiten' },
  { key 'terminal', label 'Anwesenheit' },
  { key 'stats', label 'Stats' },
  { key 'settings', label '⚙️' },
];



const ADMIN_ACCOUNTS_COLLECTION = 'admin_accounts_global';
const ADMIN_EXTERNAL_ACCOUNTS_COLLECTION = 'admin_accounts_external';
const EXTERNAL_CONFIG_COLLECTION = 'external_guest_configs';
const SUPER_ADMIN_NAME = 'admin';
const SUPER_ADMIN_DEFAULT_PASSWORD = '1234';
const DEFAULT_ACCOUNT_PERMISSIONS = {
  canEditSettings false,
  canViewIdStats false,
  canExportData false,
};
const allPermissionsEnabled = () = ({ canEditSettings true, canViewIdStats true, canExportData true });
const allGuestPermissionsEnabled = () = ({ canEditSettings true, canViewIdStats true, canExportData true });
const hashLocalPassword = async (password, nameKey) = Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  `${String(nameKey  '').toLowerCase()}${String(password  '')}`,
);
const isAuthConfigurationError = (error) = {
  const code = String(error.code  '');
  return code.includes('authconfiguration-not-found')  code.includes('authoperation-not-allowed');
};
const normalizeAccountNameKey = (name) = String(name  '').trim().toLowerCase().replace(s+g, '_').replace([^a-z0-9_-äöüß]gi, '');
const buildAccountAuthEmail = (name) = {
  const key = normalizeAccountNameKey(name);
  return `${key  'user'}@tasbeeh.local`;
};

const normalizeAnnouncementText = (text) = String(text  '').replace(rng, 'n').trim();

const parseFormattedSegments = (text) = {
  const source = String(text  '');
  if (!source) return [];
  const segments = [];
  const formatPattern = ([^n]+_[^_n]+_~[^~n]+~)g;
  let lastIndex = 0;
  let match = formatPattern.exec(source);

  while (match) {
    const token = String(match[0]  '');
    const tokenStart = match.index;
    const tokenEnd = tokenStart + token.length;
    if (tokenStart  lastIndex) {
      segments.push({ text source.slice(lastIndex, tokenStart), style 'plain' });
    }

    const marker = token[0];
    const content = token.slice(1, -1);
    if (!content) {
      segments.push({ text token, style 'plain' });
    } else if (marker === '') {
      segments.push({ text content, style 'bold' });
    } else if (marker === '_') {
      segments.push({ text content, style 'italic' });
    } else if (marker === '~') {
      segments.push({ text content, style 'strike' });
    } else {
      segments.push({ text token, style 'plain' });
    }

    lastIndex = tokenEnd;
    match = formatPattern.exec(source);
  }

  if (lastIndex  source.length) {
    segments.push({ text source.slice(lastIndex), style 'plain' });
  }

  return segments;
};
const parseAnnouncementSegments = (text) = parseFormattedSegments(text);
const normalizeHeadlineText = (value) = String(value  '').trim();
const buildHeadlineConfig = (source) = ({
  title normalizeHeadlineText(source.title  source.name  ''),
  subtitle normalizeHeadlineText(source.subtitle  ''),
  extraLine normalizeHeadlineText(source.extraLine  ''),
});
const headlineToLegacyName = (headline) = normalizeHeadlineText(headline.title  '');

const PRAYER_LABELS = {
  fajr 'Fajr',
  sohar 'Sohar',
  asr 'Asr',
  maghrib 'Maghrib',
  ishaa 'Ishaa',
};

const MAJLIS_LABELS = {
  baitus_sabuh_nord 'Baitus Sabuh Nord',
  baitus_sabuh_sued 'Baitus Sabuh Süd',
  bad_vilbel 'Bad Vilbel',
  berg 'Berg',
  bornheim 'Bornheim',
  eschersheim 'Eschersheim',
  griesheim 'Griesheim',
  ginnheim 'Ginnheim',
  goldstein 'Goldstein',
  hausen 'Hausen',
  hoechst 'Höchst',
  nied 'Nied',
  nordweststadt 'Nordweststadt',
  nuur_moschee 'Nuur Moschee',
  roedelheim 'Rödelheim',
  zeilsheim 'Zeilsheim',
};

const PRIVACY_POLICY_SECTIONS = [
  {
    title '1. Gegenstand der Verarbeitung',
    paragraphs [
      'Im Rahmen der Nutzung dieser App werden bereits bestehende Mitgliedsdaten verarbeitet. Hierzu gehören insbesondere',
      'Die Mitglieds-IDs bestehen unabhängig von dieser App und wurden nicht durch diese neu erzeugt.',
    ],
    bullets [
      'Mitglieds-ID (bereits bestehende Registrierungsnummer)',
      'Name (sofern im System hinterlegt)',
      'Zuordnung zu Majlis und Tanzeem',
      'Anwesenheits- bzw. Teilnahmeeinträge',
    ],
  },
  {
    title '2. Zweck der Datenverarbeitung',
    paragraphs [
      'Die Verarbeitung erfolgt ausschließlich zur',
      'Eine Nutzung der Daten zu anderen Zwecken erfolgt nicht.',
    ],
    bullets [
      'eindeutigen Zuordnung von Mitgliedern',
      'Vermeidung von Doppeleinträgen',
      'internen organisatorischen Dokumentation (z. B. Anwesenheit)',
      'statistischen Auswertung im Rahmen der jeweiligen Veranstaltung oder Funktion',
    ],
  },
  {
    title '3. Rechtsgrundlage',
    paragraphs [
      'Die Verarbeitung erfolgt auf Grundlage von',
      'Art. 6 Abs. 1 lit. a DSGVO (Einwilligung), da die Nutzung der App sowie die Eingabe der Daten freiwillig erfolgt.',
      'Alternativ – sofern organisatorisch einschlägig – kann die Verarbeitung auch auf Grundlage von',
      'Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse) erfolgen, wobei das berechtigte Interesse in der strukturierten und effizienten internen Organisation besteht.',
    ],
  },
  {
    title '4. Freiwilligkeit',
    paragraphs [
      'Die Nutzung der App und die Eingabe der Mitgliedsdaten erfolgen freiwillig.',
      'Es entstehen keine Nachteile bei Nichtnutzung.',
    ],
  },
  {
    title '5. Speicherung und Sicherheit',
    paragraphs [
      'Die Daten werden in einer Cloud-Datenbank gespeichert, konkret in Firestore (Google Firebase).',
      'Die Speicherung erfolgt auf Servern von Google (im Rahmen von Google Firebase).',
      'Die Datenübertragung erfolgt verschlüsselt (HTTPSTLS).',
      'Es werden angemessene technische und organisatorische Maßnahmen gemäß Art. 32 DSGVO getroffen, um die Sicherheit der Daten zu gewährleisten.',
      'Es werden ausschließlich diejenigen personenbezogenen Daten verarbeitet, die für die jeweilige Funktion zwingend erforderlich sind. Eine weitergehende Profilbildung oder automatisierte Entscheidungsfindung findet nicht statt.',
      'Die Daten werden nur so lange gespeichert, wie dies für den jeweiligen Verarbeitungszweck erforderlich ist. Nicht mehr benötigte Daten werden regelmäßig gelöscht oder anonymisiert.',
    ],
  },
  {
    title '6. Betroffenenrechte',
    paragraphs [
      'Betroffene Personen haben das Recht auf',
      'Ein Widerruf einer erteilten Einwilligung ist jederzeit möglich.',
    ],
    bullets [
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
  apiKey 'AIzaSyC_Kz1Cxs-HQ5G994mBztV_ADlAHYsgDKs',
  authDomain 'tasbeeh-1e356.firebaseapp.com',
  projectId 'tasbeeh-1e356',
  storageBucket 'tasbeeh-1e356.firebasestorage.app',
  messagingSenderId '839190734965',
  appId '1839190734965web6bef9b34edf1f0b84cb03c',
  measurementId 'G-908CPHGR56',
};
 Security note Firestore Rules should strictly limit allowed writes (e.g. only specific counter increments on allowed collections).

const FIXED_TIMES = {
  fajr '0520',
  sohar '1400',
  asr '1730',
  maghrib '2150',
  ishaa '2150',
  jumma '1315',
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
    key 'prayer',
    label 'Gebetsdaten',
    collections ['attendance_daily', MEMBER_DIRECTORY_COLLECTION],
  },
  {
    key 'program',
    label 'Programmdaten',
    collections [PROGRAM_CONFIG_COLLECTION, PROGRAM_DAILY_COLLECTION, PROGRAM_DAILY_COLLECTION_LEGACY, PROGRAM_ATTENDANCE_COLLECTION],
  },
  {
    key 'registration',
    label 'Anmeldedaten',
    collections [REGISTRATION_CONFIG_COLLECTION, REGISTRATION_DAILY_COLLECTION, REGISTRATION_ATTENDANCE_COLLECTION],
  },
  {
    key 'qr',
    label 'QR-Geräte',
    collections [QR_REGISTRATION_COLLECTION],
  },
];
const SHOW_MEMBER_NAMES_IN_ID_GRID = false;
const STORE_MEMBER_NAMES_IN_DB = false;
 EXTERNAL MEMBER DIRECTORY DATA - EDIT HERE
const EXTERNAL_MEMBER_DIRECTORY_DATA = [{ amarat 'bad schwalbach', tanzeem 'Ansar', majlis 'Test', idNumber '99999', name 'Ahmad Khan' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis 'Test', idNumber '99998', name 'Ali Raza' }, { amarat 'bad schwalbach', tanzeem 'Atfal', majlis '-', idNumber '99997', name 'Zaid Ahmad' }].map((entry) = ({ amarat normalizeAccountNameKey(entry.amarat  ''), tanzeem String(entry.tanzeem  '').trim().toLowerCase(), majlis String(entry.majlis  '').trim(), idNumber String(entry.idNumber  '').trim(), name String(entry.name  '').trim(), }));
const EXTERNAL_MEMBER_DIRECTORY_DATA_BAD_SCHWALBACH = [{ amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '54349', name 'Abdul Wahid' }, { amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '52095', name 'Atiq ur Rehman' }, { amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '43664', name 'Ahmad, Mahmood' }, { amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '43643', name 'Ahmad, Rasheed' }, { amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '44444', name 'Ahmad, Zubair' }, { amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '35377', name 'Ahmed, Mirza Abdul Karim' }, { amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '26571', name 'Ahmed, Rafiq' }, { amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '18860', name 'Akram, Mohammad' }, { amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '49476', name 'Cheema, Muhammad Afzal' }, { amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '44641', name 'Faiz, Ahmad' }, { amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '47025', name 'Hamayat, Ahmed' }, { amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '48906', name 'Hunjra, Rafaqat Ali' }, { amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '41667', name 'Malik Saleem ud Din Ahmad' }, { amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '60056', name 'Muhammad, Afzaal' }, { amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '35872', name 'Rana Faheem' }, { amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '49392', name 'Shad, Abdul Rasheed' }, { amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '43778', name 'Shad, Abdul Sami' }, { amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '39395', name 'Sheikh, Omar Sharif' }, { amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '30233', name 'Ullah, Ehsan' }, { amarat 'bad schwalbach', tanzeem 'Ansar', majlis '-', idNumber '21479', name 'Waraich, Basharat Ahmad' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '54016', name 'Ahmad, Adnan' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '64458', name 'Ahmad, Faiq' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '58815', name 'Ahmad, Junaid' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '48407', name 'Ahmad, Noman' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '42599', name 'Ahmad, Rashid' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '44612', name 'Ahmad, Shamshad' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '59748', name 'Ahmad, Waleed' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '50709', name 'Ahmad, Shayan' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '50710', name 'Ahmad, Ayaan' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '39860', name 'Ahmed, Atiq' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '39861', name 'Ahmed, Anieq' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '14634', name 'Ajmal, Zieshan' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '18865', name 'Akram, Ajmal Chaudhry' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '18864', name 'Akram, Akmal' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '56837', name 'Asif, Mahmood' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '47024', name 'Athwal, Nabi Ahmad' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '45342', name 'Cheema, Basil Rehan' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '44644', name 'Faiz, Khurram Ahmad' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '44645', name 'Faiz, Fateh Ahmad' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '52018', name 'Ahmad, Afzal' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '66701', name 'Ali, Ziafat' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '58675', name 'Khan, Talal' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '42561', name 'Ahmad, Noor ud Din' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '31377', name 'Nadeem, Danial' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '53112', name 'Nagi, Umer Rasheed' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '35875', name 'Rana Aleim' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '59492', name 'Rehman, Saqib' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '13705', name 'Riaz, Shahid' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '51251', name 'Shad, Abdul Raffay' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '39397', name 'Sheikh, Shoaib Umar' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '21483', name 'Waraich, Fraset Ahmad' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '21482', name 'Waraich, Shojahat Ahmad' }, { amarat 'bad schwalbach', tanzeem 'Khuddam', majlis '-', idNumber '45258', name 'Warraich, Wajahat Ibrahim' }, { amarat 'bad schwalbach', tanzeem 'Atfal', majlis '-', idNumber '50711', name 'Ahmad, Amaan' }, { amarat 'bad schwalbach', tanzeem 'Atfal', majlis '-', idNumber '48297', name 'Malik, Daniyal Ahmad' }, { amarat 'bad schwalbach', tanzeem 'Atfal', majlis '-', idNumber '56823', name 'Nagi, Samar Ibrahim' }, { amarat 'bad schwalbach', tanzeem 'Atfal', majlis '-', idNumber '65036', name 'Riaz, Haris' }, { amarat 'bad schwalbach', tanzeem 'Atfal', majlis '-', idNumber '51534', name 'Shad, Rayasat Ahmad' }, { amarat 'bad schwalbach', tanzeem 'Atfal', majlis '-', idNumber '51252', name ', Noor Ul Shammas' }, { amarat 'bad schwalbach', tanzeem 'Atfal', majlis '-', idNumber '58717', name 'Sheikh, Muhammad Ibrahim' }, { amarat 'bad schwalbach', tanzeem 'Atfal', majlis '-', idNumber '43270', name 'Ullah, Dayan' }];
const EXTERNAL_MEMBER_DIRECTORY_DATA_NIDDA = [{ amarat 'nidda', tanzeem 'Ansar', majlis '-', idNumber '81001', name 'Hamza Qureshi' }, { amarat 'nidda', tanzeem 'Ansar', majlis '-', idNumber '81002', name 'Bilal Siddiq' }, { amarat 'nidda', tanzeem 'Ansar', majlis '-', idNumber '81003', name 'Rayan Ahmed' }, { amarat 'nidda', tanzeem 'Ansar', majlis '-', idNumber '81004', name 'Usman Khalid' }, { amarat 'nidda', tanzeem 'Ansar', majlis '-', idNumber '81005', name 'Farhan Malik' }, { amarat 'nidda', tanzeem 'Ansar', majlis '-', idNumber '81006', name 'Noman Tariq' }, { amarat 'nidda', tanzeem 'Ansar', majlis '-', idNumber '81007', name 'Adeel Rehman' }, { amarat 'nidda', tanzeem 'Ansar', majlis '-', idNumber '81008', name 'Saqib Ilyas' }, { amarat 'nidda', tanzeem 'Ansar', majlis '-', idNumber '81009', name 'Faisal Mirza' }, { amarat 'nidda', tanzeem 'Ansar', majlis '-', idNumber '81010', name 'Irfan Bashir' }, { amarat 'nidda', tanzeem 'Khuddam', majlis '-', idNumber '81011', name 'Talha Noor' }, { amarat 'nidda', tanzeem 'Khuddam', majlis '-', idNumber '81012', name 'Huzaifa Sami' }, { amarat 'nidda', tanzeem 'Khuddam', majlis '-', idNumber '81013', name 'Ayaan Rashid' }, { amarat 'nidda', tanzeem 'Khuddam', majlis '-', idNumber '81014', name 'Zain Abbas' }, { amarat 'nidda', tanzeem 'Khuddam', majlis '-', idNumber '81015', name 'Arham Waqar' }, { amarat 'nidda', tanzeem 'Khuddam', majlis '-', idNumber '81016', name 'Musa Latif' }, { amarat 'nidda', tanzeem 'Khuddam', majlis '-', idNumber '81017', name 'Daniyal Nadeem' }, { amarat 'nidda', tanzeem 'Khuddam', majlis '-', idNumber '81018', name 'Shayan Rafiq' }, { amarat 'nidda', tanzeem 'Khuddam', majlis '-', idNumber '81019', name 'Taha Karim' }, { amarat 'nidda', tanzeem 'Khuddam', majlis '-', idNumber '81020', name 'Adnan Zubair' }, { amarat 'nidda', tanzeem 'Atfal', majlis '-', idNumber '81021', name 'Rayyan Akhtar' }, { amarat 'nidda', tanzeem 'Atfal', majlis '-', idNumber '81022', name 'Mikail Ahmad' }, { amarat 'nidda', tanzeem 'Atfal', majlis '-', idNumber '81023', name 'Yahya Aslam' }, { amarat 'nidda', tanzeem 'Atfal', majlis '-', idNumber '81024', name 'Zayd Farooq' }, { amarat 'nidda', tanzeem 'Atfal', majlis '-', idNumber '81025', name 'Ammar Sohail' }, { amarat 'nidda', tanzeem 'Atfal', majlis '-', idNumber '81026', name 'Numan Javed' }, { amarat 'nidda', tanzeem 'Atfal', majlis '-', idNumber '81027', name 'Sarim Khan' }, { amarat 'nidda', tanzeem 'Atfal', majlis '-', idNumber '81028', name 'Aahil Raza' }, { amarat 'nidda', tanzeem 'Atfal', majlis '-', idNumber '81029', name 'Ehan Malik' }, { amarat 'nidda', tanzeem 'Atfal', majlis '-', idNumber '81030', name 'Zayan Qadir' }];
const EXTERNAL_MEMBER_DIRECTORY_DATA = [...EXTERNAL_MEMBER_DIRECTORY_DATA_BAD_SCHWALBACH, ...EXTERNAL_MEMBER_DIRECTORY_DATA_NIDDA].map((entry) = ({ amarat normalizeAccountNameKey(entry.amarat  ''), tanzeem String(entry.tanzeem  '').trim().toLowerCase(), majlis String(entry.majlis  '').trim(), idNumber String(entry.idNumber  '').trim(), name String(entry.name  '').trim(), }));


const RAMADAN_END_ISO = '2026-03-19';

const RAMADAN_RAW = {
  '2026-02-19' { sehriEnd '0558', iftar '1749' },
  '2026-02-20' { sehriEnd '0556', iftar '1751' },
  '2026-02-21' { sehriEnd '0554', iftar '1753' },
  '2026-02-22' { sehriEnd '0552', iftar '1755' },
  '2026-02-23' { sehriEnd '0550', iftar '1756' },
  '2026-02-24' { sehriEnd '0548', iftar '1758' },
  '2026-02-25' { sehriEnd '0546', iftar '1800' },
  '2026-02-26' { sehriEnd '0544', iftar '1801' },
  '2026-02-27' { sehriEnd '0542', iftar '1803' },
  '2026-02-28' { sehriEnd '0540', iftar '1805' },
  '2026-03-01' { sehriEnd '0538', iftar '1806' },
  '2026-03-02' { sehriEnd '0536', iftar '1808' },
  '2026-03-03' { sehriEnd '0534', iftar '1810' },
  '2026-03-04' { sehriEnd '0532', iftar '1811' },
  '2026-03-05' { sehriEnd '0529', iftar '1813' },
  '2026-03-06' { sehriEnd '0527', iftar '1815' },
  '2026-03-07' { sehriEnd '0525', iftar '1816' },
  '2026-03-08' { sehriEnd '0523', iftar '1818' },
  '2026-03-09' { sehriEnd '0521', iftar '1820' },
  '2026-03-10' { sehriEnd '0519', iftar '1821' },
  '2026-03-11' { sehriEnd '0517', iftar '1823' },
  '2026-03-12' { sehriEnd '0515', iftar '1824' },
  '2026-03-13' { sehriEnd '0512', iftar '1826' },
  '2026-03-14' { sehriEnd '0510', iftar '1828' },
  '2026-03-15' { sehriEnd '0508', iftar '1829' },
  '2026-03-16' { sehriEnd '0506', iftar '1831' },
  '2026-03-17' { sehriEnd '0504', iftar '1832' },
  '2026-03-18' { sehriEnd '0502', iftar '1834' },
  '2026-03-19' { sehriEnd '0459', iftar '1836' },
};

const THEME = {
  light { bg '#F4F4F5', card '#FFFFFF', border '#E4E4E7', text '#09090B', muted '#71717A', button '#111827', buttonText '#FFFFFF', rowActiveBg '#ECFDF3', rowActiveBorder '#86EFAC', chipBg '#ECFDF3', chipText '#166534' },
  dark { bg '#09090B', card '#111827', border '#374151', text '#F9FAFB', muted '#9CA3AF', button '#F9FAFB', buttonText '#111827', rowActiveBg '#052E1B', rowActiveBorder '#22C55E', chipBg '#14532D', chipText '#BBF7D0' },
};

const DAY_NAMES_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

const STATS_PRAYER_SEQUENCE = [
  { key 'fajr', label 'Fajr' },
  { key 'sohar', label 'Sohar' },
  { key 'asr', label 'Asr' },
  { key 'maghrib', label 'Maghrib' },
  { key 'ishaa', label 'Ishaa' },
];
const STATS_TANZEEM_KEYS = ['ansar', 'khuddam', 'atfal'];

const getPrayerCountsForStats = (attendanceData) = {
  const byPrayer = attendanceData.byPrayer  {};
  return STATS_PRAYER_SEQUENCE.map(({ key, label }) = {
    const prayer = byPrayer[key]  {};
    const guest = Number(prayer.guest)  0;
    const tanzeemMap = prayer.tanzeem  {};
    const tanzeemTotals = STATS_TANZEEM_KEYS.reduce((acc, tanzeemKey) = {
      const majlisMap = tanzeemMap[tanzeemKey].majlis  {};
      const value = Object.values(majlisMap).reduce((sum, count) = sum + (Number(count)  0), 0);
      acc[tanzeemKey] = value;
      return acc;
    }, {});
    const total = guest + STATS_TANZEEM_KEYS.reduce((sum, keyName) = sum + (tanzeemTotals[keyName]  0), 0);
    return { key, label, total, tanzeemTotals, guest };
  });
};

const getDailyTotalsForStats = (attendanceData) = {
  const prayers = getPrayerCountsForStats(attendanceData);
  return {
    total prayers.reduce((sum, row) = sum + (row.total  0), 0),
    guestTotal prayers.reduce((sum, row) = sum + (row.guest  0), 0),
    tanzeemTotals STATS_TANZEEM_KEYS.reduce((acc, key) = {
      acc[key] = prayers.reduce((sum, row) = sum + (row.tanzeemTotals.[key]  0), 0);
      return acc;
    }, {}),
  };
};
const getUniqueGuestTotalForAttendance = (attendanceData) = {
  const explicitUniqueGuestTotal = Number(attendanceData.guestUniqueTotal);
  if (Number.isFinite(explicitUniqueGuestTotal) && explicitUniqueGuestTotal = 0) return explicitUniqueGuestTotal;
  const byPrayer = attendanceData.byPrayer  {};
  return Object.values(byPrayer).reduce((sum, prayerNode) = sum + (Number(prayerNode.guest)  0), 0);
};

const buildMajlisRanking = (countsByMajlis = {}) = {
  const allKeys = Array.from(new Set([...Object.keys(MAJLIS_LABELS), ...Object.keys(countsByMajlis  {})])).filter((key) = key !== 'riedberg');
  return allKeys
    .map((key) = [key, Number(countsByMajlis.[key])  0])
    .sort((a, b) = (b[1] - a[1])  a[0].localeCompare(b[0]));
};

const startOfWeekMonday = (date) = {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
};

const getLast7Days = (baseDate) = {
  const base = new Date(baseDate);
  base.setHours(0, 0, 0, 0);
  return Array.from({ length 7 }, (_, idx) = toISO(addDays(base, idx - 6)));
};

const getWeekIsosMondayToSunday = (baseDate) = {
  const start = startOfWeekMonday(baseDate);
  return Array.from({ length 7 }, (_, idx) = toISO(addDays(start, idx)));
};

const getISOWeekNumber = (date) = {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay()  7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart)  86400000) + 1)  7);
};

const getLast8Weeks = (baseDate) = {
  const currentWeekStart = startOfWeekMonday(baseDate);
  return Array.from({ length 4 }, (_, idx) = {
    const start = addDays(currentWeekStart, (idx - 3)  7);
    const end = addDays(start, 6);
    const weekNumber = getISOWeekNumber(start);
    return {
      startISO toISO(start),
      endISO toISO(end),
      weekNumber,
      label `KW ${weekNumber} (${new Intl.DateTimeFormat('de-DE', { day '2-digit', month '2-digit' }).format(start)}–${new Intl.DateTimeFormat('de-DE', { day '2-digit', month '2-digit' }).format(end)})`,
      rangeLabel `${new Intl.DateTimeFormat('de-DE', { day '2-digit', month '2-digit' }).format(start)}–${new Intl.DateTimeFormat('de-DE', { day '2-digit', month '2-digit' }).format(end)}`,
    };
  });
};

const buildDailySeries = (logs, dayIsos) = {
  const counts = dayIsos.reduce((acc, iso) = ({ ...acc, [iso] 0 }), {});
  logs.forEach((row) = {
    const iso = String(row.date  '');
    if (counts[iso] !== undefined) counts[iso] += 1;
  });
  return dayIsos.map((iso) = ({ iso, value counts[iso]  0 }));
};

const buildWeeklySeries = (logs, weeks) = weeks.map((week) = ({
  ...week,
  value logs.reduce((sum, row) = {
    const iso = String(row.date  '');
    return (iso = week.startISO && iso = week.endISO)  (sum + 1)  sum;
  }, 0),
}));

const calculateStatus = (weekTotal, distinctDays) = {
  if (distinctDays  3) {
    return {
      provisional true,
      label 'Status vorläufig – zu wenig Daten',
      detail null,
    };
  }
  if (weekTotal = 4) return { provisional false, label '🔴 Niedrig' };
  if (weekTotal = 14) return { provisional false, label '🟡 Gut dabei' };
  if (weekTotal = 29) return { provisional false, label '🟢 Sehr gut' };
  return { provisional false, label '🟢🟢 Exzellent' };
};

function MiniLineChart({ labels, series, theme, isDarkMode, xAxisTitle = 'Zeitachse', yMaxValue = null, yTickCount = null, pointLabelFormatter = null, useEqualLabelSlots = false }) {
  const [chartWidth, setChartWidth] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const isCompactChart = chartWidth  0 && chartWidth  360;
  const chartHeight = isCompactChart  320  280;
  const plotTop = 18;
  const plotBottom = isCompactChart  74  52;
  const axisLabelWidth = isCompactChart  34  42;
  const edgeInset = isCompactChart  24  28;
  const plotRightPad = (isCompactChart  10  14) + edgeInset;
  const tickCount = yTickCount  5;

  const allValues = series.flatMap((line) = line.data.map((value) = Number(value)  0));
  const maxValueRaw = Math.max(0, ...allValues, Number(yMaxValue)  0);

  const getNiceStep = (maxValue, ticks) = {
    if (maxValue = 0) return 1;
    const rough = maxValue  Math.max(1, ticks - 1);
    const magnitude = 10  Math.floor(Math.log10(rough));
    const normalized = rough  magnitude;
    const nice = normalized = 1  1  normalized = 2  2  normalized = 5  5  10;
    return nice  magnitude;
  };

  const yStep = yMaxValue  Math.max(1, (Number(yMaxValue)  1)  Math.max(1, (tickCount - 1)))  getNiceStep(maxValueRaw, tickCount);
  const maxValue = yMaxValue  Math.max(1, Number(yMaxValue))  Math.max(yStep  (tickCount - 1), yStep);
  const yTicks = Array.from({ length tickCount }, (_, index) = maxValue - index  yStep);
  const pointCount = Math.max(2, labels.length);

  const plotLeft = axisLabelWidth + edgeInset;
  const plotWidth = Math.max(1, chartWidth - plotLeft - plotRightPad);
  const plotHeight = chartHeight - plotTop - plotBottom;

  const getX = (index) = plotLeft + (plotWidth  index)  (pointCount - 1);
  const getY = (value) = plotTop + plotHeight - ((Number(value)  0)  maxValue)  plotHeight;

  useEffect(() = {
    setSelectedPoint(null);
  }, [labels, series]);

  const getPointTooltip = (line, value, index) = {
    if (typeof pointLabelFormatter === 'function') return pointLabelFormatter({ line, value, index, label labels[index] });
    return `${line.label} · ${labels[index]  `Punkt ${index + 1}`} ${Number(value)  0}`;
  };

  return (
    View style={styles.chartWrap}
      Text style={[styles.chartAxisTitleY, { color theme.muted }]}Anzahl der GebeteText

      View
        onLayout={(event) = setChartWidth(event.nativeEvent.layout.width)}
        style={[styles.chartCanvas, { backgroundColor theme.bg, borderColor theme.border, height chartHeight }]}
      
        {chartWidth  0  (
          
            View
              style={[
                styles.chartAxisY,
                { left plotLeft, top plotTop, height plotHeight, backgroundColor isDarkMode  'rgba(255,255,255,0.35)'  'rgba(17,24,39,0.28)' },
              ]}
            
            View
              style={[
                styles.chartAxisX,
                {
                  left plotLeft,
                  top plotTop + plotHeight,
                  width plotWidth,
                  backgroundColor isDarkMode  'rgba(255,255,255,0.35)'  'rgba(17,24,39,0.28)',
                },
              ]}
            

            {yTicks.map((tickValue, index) = {
              const y = plotTop + (plotHeight  index)  Math.max(1, tickCount - 1);
              return (
                View key={`tick_${tickValue}_${index}`}
                  View
                    style={[
                      styles.chartGridLine,
                      {
                        left plotLeft,
                        right plotRightPad,
                        top y,
                        borderColor isDarkMode  'rgba(255,255,255,0.14)'  'rgba(17,24,39,0.12)',
                      },
                    ]}
                  
                  Text style={[styles.chartYTickLabel, { top y - 8, color theme.muted }]}{Math.round(tickValue)}Text
                View
              );
            })}

            {series.map((line) = line.data.map((value, index) = {
              if (index === 0) return null;
              const x1 = getX(index - 1);
              const y1 = getY(line.data[index - 1]);
              const x2 = getX(index);
              const y2 = getY(value);
              const dx = x2 - x1;
              const dy = y2 - y1;
              const length = Math.sqrt(dx  dx + dy  dy);
              const angle = Math.atan2(dy, dx);
              const thickness = line.thick  4  2;
              const midX = (x1 + x2)  2;
              const midY = (y1 + y2)  2;
              return (
                View
                  key={`${line.key}_seg_${index}`}
                  style={[
                    styles.chartSegment,
                    {
                      left midX - (length  2),
                      top midY - (thickness  2),
                      width length,
                      backgroundColor line.color,
                      transform [{ rotateZ `${angle}rad` }],
                      height thickness,
                      opacity line.thick  1  0.9,
                    },
                  ]}
                
              );
            }))}

            {series.map((line) = line.data.map((value, index) = {
              const dotSize = line.thick  9  7;
              return (
                Pressable
                  key={`${line.key}_pt_${index}`}
                  onPress={() = setSelectedPoint({
                    key `${line.key}_${index}`,
                    x getX(index),
                    y getY(value),
                    tooltip getPointTooltip(line, value, index),
                  })}
                  style={[
                    styles.chartPointTouchTarget,
                    {
                      left getX(index) - 14,
                      top getY(value) - 14,
                    },
                  ]}
                
                  View
                    style={[
                      styles.chartPoint,
                      {
                        backgroundColor line.color,
                        width dotSize,
                        height dotSize,
                        borderColor theme.card,
                      },
                    ]}
                  
                Pressable
              );
            }))}

            {selectedPoint  (
              View
                style={[
                  styles.chartTooltip,
                  {
                    left Math.min(Math.max(8, selectedPoint.x - 85), Math.max(8, chartWidth - 178)),
                    top Math.max(8, selectedPoint.y - 42),
                    backgroundColor theme.card,
                    borderColor theme.border,
                  },
                ]}
              
                Text style={[styles.chartTooltipText, { color theme.text }]}{selectedPoint.tooltip}Text
              View
            )  null}
          
        )  null}
      View

      View style={[styles.chartLabelsRow, { marginLeft axisLabelWidth, marginRight plotRightPad, height isCompactChart  52  20 }]}
        {chartWidth  0  labels.map((label, index) = {
          const rawLabel = String(label  '');
          const isDateLabel = rawLabel.includes(',');
          const isWeekdayLabel = ^[A-Za-zÄÖÜäöü]{2,3}$.test(rawLabel);
          if (useEqualLabelSlots) {
            const equalLabelWidth = isCompactChart  52  64;
            const xRelative = getX(index) - plotLeft;
            return (
              Text
                key={`${label}_${index}`}
                numberOfLines={1}
                style={[
                  styles.chartLabel,
                  isCompactChart && styles.chartLabelCompact,
                  styles.chartEqualLabel,
                  {
                    color theme.muted,
                    width equalLabelWidth,
                    left xRelative,
                    textAlign 'center',
                    transform [{ translateX -(equalLabelWidth  2) }],
                  },
                ]}
              
                {label}
              Text
            );
          }
          const shouldRotateLabel = isCompactChart && !isWeekdayLabel;
          const labelWidth = isDateLabel
             (isCompactChart  56  92)
             (isWeekdayLabel  (isCompactChart  24  28)  (isCompactChart  48  64));
          const xRelative = getX(index) - plotLeft;
          return (
            Text
              key={`${label}_${index}`}
              numberOfLines={1}
              style={[
                styles.chartLabel,
                isCompactChart && styles.chartLabelCompact,
                {
                  color theme.muted,
                  position 'absolute',
                  left xRelative,
                  width labelWidth,
                  textAlign 'center',
                  transform [{ translateX -(labelWidth  2) }, ...(shouldRotateLabel  [{ rotate '-24deg' }]  [])],
                },
              ]}
            
              {label}
            Text
          );
        })  null}
      View

      Text style={[styles.chartAxisTitleX, { color theme.muted }]}{xAxisTitle}Text

      View style={styles.chartLegendRow}
        {series.map((line) = (
          View key={`legend_${line.key}`} style={styles.chartLegendItem}
            View style={[styles.chartLegendDot, { backgroundColor line.color }]} 
            Text style={[styles.chartLegendText, { color theme.text }]}{line.label}Text
          View
        ))}
      View
    View
  );
}
const pad = (n) = String(n).padStart(2, '0');
const toISO = (date) = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseISO = (iso) = (!^d{4}-d{2}-d{2}$.test(iso  '')  null  new Date(`${iso}T000000`));
const normalizeRegistrationShortDate = (value) = {
  const raw = String(value  '').trim();
  const germanMatch = raw.match(^(d{1,2})[.-](d{1,2})$);
  if (germanMatch) {
    const day = Number(germanMatch[1]);
    const month = Number(germanMatch[2]);
    if (day = 1 && day = 31 && month = 1 && month = 12) return `${pad(day)}.${pad(month)}`;
  }
  const isoMatch = raw.match(^(d{4})-(d{2})-(d{2})$);
  if (isoMatch) {
    const day = Number(isoMatch[3]);
    const month = Number(isoMatch[2]);
    if (day = 1 && day = 31 && month = 1 && month = 12) return `${pad(day)}.${pad(month)}`;
  }
  return '';
};

const isMissingMajlisValue = (value) = {
  const raw = String(value  '').trim();
  return !raw  raw === '-';
};
const registrationShortDateToKey = (value) = {
  const normalized = normalizeRegistrationShortDate(value);
  if (!normalized) return null;
  const [dayRaw, monthRaw] = normalized.split('.');
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(day)  !Number.isFinite(month)) return null;
  return (month  100) + day;
};
const normalizeRegistrationConfig = (data, fallbackDocId = '') = {
  const id = String(data.id  fallbackDocId  '').trim();
  const headline = buildHeadlineConfig(data);
  const name = headlineToLegacyName(headline);
  const startDate = normalizeRegistrationShortDate(data.startDate  '');
  const endDate = normalizeRegistrationShortDate(data.endDate  '');
  const includeTanzeems = Array.isArray(data.advanced.includeTanzeems)
     data.advanced.includeTanzeems
     (Array.isArray(data.includeTanzeems)  data.includeTanzeems  REGISTRATION_TANZEEM_OPTIONS);
  const sanitizedTanzeems = includeTanzeems
    .map((entry) = String(entry  '').trim().toLowerCase())
    .filter((entry, index, arr) = REGISTRATION_TANZEEM_OPTIONS.includes(entry) && arr.indexOf(entry) === index);
  return {
    id id  `${startDate}_${endDate}_${toLocationKey(name  'anmeldung')}`,
    name,
    title headline.title,
    subtitle headline.subtitle,
    extraLine headline.extraLine,
    startDate,
    endDate,
    disabled Boolean(data.disabled),
    updatedAt String(data.updatedAt  ''),
    advanced {
      isPublic Boolean(data.advanced.isPublic  data.isPublic),
      includeTanzeems sanitizedTanzeems.length  sanitizedTanzeems  [...REGISTRATION_TANZEEM_OPTIONS],
      onlyEhlVoters Boolean(data.advanced.onlyEhlVoters  data.onlyEhlVoters),
      allowDecline Boolean(data.advanced.allowDecline  data.allowDecline),
      loginEnabled Boolean(data.advanced.loginEnabled  data.loginEnabled),
    },
  };
};
const normalizeVoterFlagValue = (value) = {
  if (value === '-') return '-';
  if (String(value).trim() === '-') return '-';
  if (Number(value) === 1) return 1;
  if (Number(value) === 0) return 0;
  return '-';
};
const isVotingEligibleMember = (member) = normalizeVoterFlagValue(member.stimmberechtigt) === 1;
const shouldIncludeMemberInRegistrationBase = (entry, allowedTanzeems, filterKey = 'total', onlyEhlVoters = false) = {
  const tanzeem = String(entry.tanzeem  '').toLowerCase();
  if (!allowedTanzeems.includes(tanzeem)) return false;
  if (filterKey !== 'total' && tanzeem !== filterKey) return false;
  if (onlyEhlVoters && !isVotingEligibleMember(entry)) return false;
  return true;
};
const getRegistrationWindowState = (config, todayISO) = {
  if (!config  !config.startDate  !config.endDate) return { hasRange false, isOpen false, isUpcoming false, isPast false };
  if (config.disabled) return { hasRange true, isOpen false, isUpcoming false, isPast true };
  const todayShort = normalizeRegistrationShortDate(todayISO);
  const todayKey = registrationShortDateToKey(todayShort);
  const startKey = registrationShortDateToKey(config.startDate);
  const endKey = registrationShortDateToKey(config.endDate);
  if (todayKey === null  startKey === null  endKey === null) return { hasRange false, isOpen false, isUpcoming false, isPast false };
  if (todayKey  startKey) return { hasRange true, isOpen false, isUpcoming true, isPast false };
  if (todayKey  endKey) return { hasRange true, isOpen false, isUpcoming false, isPast true };
  return { hasRange true, isOpen true, isUpcoming false, isPast false };
};
const applyForcedTestDate = (date) = {
  if (!FORCE_TEST_DATE_ENABLED) return date;
  const forcedDate = parseISO(FORCE_TEST_DATE_ISO);
  if (!forcedDate) return date;
  const next = new Date(date);
  next.setFullYear(forcedDate.getFullYear(), forcedDate.getMonth(), forcedDate.getDate());
  return next;
};
const isValidTime = (value) = ^d{2}d{2}$.test(value  '') && Number(value.slice(0, 2)) = 23 && Number(value.slice(3)) = 59;
const addMinutes = (time, minutes) = {
  if (!isValidTime(time)) return '—';
  const [h, m] = time.split('').map(Number);
  const total = (((h  60 + m + minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total  60))}${pad(total % 60)}`;
};
const germanDateLong = (date) = new Intl.DateTimeFormat('de-DE', { month 'long', day 'numeric', year 'numeric' }).format(date);
const germanWeekdayDateLong = (date) = new Intl.DateTimeFormat('de-DE', { weekday 'long', day 'numeric', month 'long', year 'numeric' }).format(date);
const findClosestISO = (targetISO, availableISOs) = {
  const target = parseISO(targetISO);
  if (!target  availableISOs.length === 0) return null;
  const sorted = [...availableISOs].sort();
  if (targetISO = sorted[0]) return sorted[0];
  if (targetISO = sorted[sorted.length - 1]) return sorted[sorted.length - 1];
  return sorted.reduce((closest, iso) = {
    const d = parseISO(iso); const prev = parseISO(closest);
    return Math.abs(d - target)  Math.abs(prev - target)  iso  closest;
  }, sorted[0]);
};

const buildPrayerTimes = (raw, isRamadanWindow = false) = ({
  fajr isRamadanWindow  addMinutes(raw.sehriEnd, 20)  FIXED_TIMES.fajr,
  sohar FIXED_TIMES.sohar,
  asr FIXED_TIMES.asr,
  maghrib isRamadanWindow  addMinutes(raw.iftar, 10)  FIXED_TIMES.maghrib,
  ishaa FIXED_TIMES.ishaa,
  jumma FIXED_TIMES.jumma,
});


const applyManualPrayerAdjustments = (baseTimes, overrideConfig) = {
  const manual = overrideConfig.manualTimes  {};
  const next = { ...baseTimes };
  ['fajr', 'sohar', 'asr', 'maghrib', 'ishaa', 'jumma'].forEach((key) = {
    if (isValidTime(manual[key])) next[key] = manual[key];
  });
  return next;
};

const applyPrayerTimeOverride = (baseTimes, overrideConfig) = {
  if (!overrideConfig.enabled) return baseTimes;
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

const addDays = (date, days) = {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const atMinutesOfDay = (baseDate, minutesOfDay) = {
  const date = new Date(baseDate);
  date.setHours(0, 0, 0, 0);
  date.setMinutes(minutesOfDay, 0, 0);
  return date;
};

const getBerlinNow = () = {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone 'EuropeBerlin',
      year 'numeric',
      month '2-digit',
      day '2-digit',
      hour '2-digit',
      minute '2-digit',
      second '2-digit',
      hour12 false,
    }).formatToParts(new Date());
    const byType = Object.fromEntries(parts.filter((part) = part.type !== 'literal').map((part) = [part.type, part.value]));
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

const getGermanHour = () = {
  try {
    const parts = new Intl.DateTimeFormat('de-DE', { timeZone 'EuropeBerlin', hour '2-digit', hour12 false }).formatToParts(new Date());
    const hour = Number.parseInt(parts.find((part) = part.type === 'hour').value  '', 10);
    if (!Number.isNaN(hour)) return hour;
  } catch {}
  return new Date().getHours();
};
const formatGermanDateTime = (value) = {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat('de-DE', {
      timeZone 'EuropeBerlin',
      day '2-digit',
      month '2-digit',
      year 'numeric',
      hour '2-digit',
      minute '2-digit',
      second '2-digit',
      hour12 false,
    }).format(date);
  } catch {
    return date.toLocaleString('de-DE');
  }
};
const hasFirebaseConfig = () = FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.apiKey && !String(FIREBASE_CONFIG.projectId).includes('YOUR_') && !String(FIREBASE_CONFIG.apiKey).includes('YOUR_');
const withPressEffect = (style) = ({ pressed }) = [style, pressed && styles.buttonPressed];

const toFirestoreValue = (value) = {
  if (value === null  value === undefined) return { nullValue null };
  if (typeof value === 'number') return Number.isInteger(value)  { integerValue String(value) }  { doubleValue value };
  if (typeof value === 'string') return { stringValue value };
  if (typeof value === 'boolean') return { booleanValue value };
  if (Array.isArray(value)) return { arrayValue { values value.map(toFirestoreValue) } };
  if (typeof value === 'object') {
    const fields = {};
    Object.entries(value).forEach(([k, v]) = { fields[k] = toFirestoreValue(v); });
    return { mapValue { fields } };
  }
  return { stringValue String(value) };
};

const fromFirestoreValue = (v) = {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.mapValue) {
    const out = {};
    Object.entries(v.mapValue.fields  {}).forEach(([k, val]) = { out[k] = fromFirestoreValue(val); });
    return out;
  }
  if (v.arrayValue) return (v.arrayValue.values  []).map(fromFirestoreValue);
  return null;
};

const normalizePrayerOverride = (data) = ({
  enabled Boolean(data.enabled),
  soharAsrTime isValidTime(data.soharAsrTime)  data.soharAsrTime  null,
  maghribIshaaTime isValidTime(data.maghribIshaaTime)  data.maghribIshaaTime  null,
  manualTimes {
    fajr isValidTime(data.manualTimes.fajr)  data.manualTimes.fajr  '',
    sohar isValidTime(data.manualTimes.sohar)  data.manualTimes.sohar  '',
    asr isValidTime(data.manualTimes.asr)  data.manualTimes.asr  '',
    maghrib isValidTime(data.manualTimes.maghrib)  data.manualTimes.maghrib  '',
    ishaa isValidTime(data.manualTimes.ishaa)  data.manualTimes.ishaa  '',
  },
  updatedAt data.updatedAt  null,
});

const normalizePendingPrayerOverride = (data) = {
  const dateISO = typeof data.dateISO === 'string' && ^d{4}-d{2}-d{2}$.test(data.dateISO)  data.dateISO  null;
  if (!dateISO) return null;
  return {
    dateISO,
    enabled Boolean(data.enabled),
    soharAsrTime isValidTime(data.soharAsrTime)  data.soharAsrTime  null,
    maghribIshaaTime isValidTime(data.maghribIshaaTime)  data.maghribIshaaTime  null,
    manualTimes {
      fajr isValidTime(data.manualTimes.fajr)  data.manualTimes.fajr  '',
      sohar isValidTime(data.manualTimes.sohar)  data.manualTimes.sohar  '',
      asr isValidTime(data.manualTimes.asr)  data.manualTimes.asr  '',
      maghrib isValidTime(data.manualTimes.maghrib)  data.manualTimes.maghrib  '',
      ishaa isValidTime(data.manualTimes.ishaa)  data.manualTimes.ishaa  '',
    },
  };
};


const docUrl = (collection, id) = `httpsfirestore.googleapis.comv1projects${FIREBASE_CONFIG.projectId}databases(default)documents${collection}${id}key=${FIREBASE_CONFIG.apiKey}`;
const commitUrl = () = `httpsfirestore.googleapis.comv1projects${FIREBASE_CONFIG.projectId}databases(default)documentscommitkey=${FIREBASE_CONFIG.apiKey}`;
const loadFirebaseRuntime = () = {
  try {
    const { getApp, getApps, initializeApp } = require('firebaseapp');
    const { doc, getFirestore, onSnapshot } = require('firebasefirestore');
    const auth = require('firebaseauth');
    const firebaseApp = getApps().length  getApp()  initializeApp(FIREBASE_CONFIG);
    let authInstance;
    try {
      if (Platform.OS !== 'web' && auth.initializeAuth && auth.getReactNativePersistence) {
        authInstance = auth.initializeAuth(firebaseApp, {
          persistence auth.getReactNativePersistence(AsyncStorage),
        });
      }
    } catch {}
    if (!authInstance) authInstance = auth.getAuth(firebaseApp);
    return {
      app firebaseApp,
      db getFirestore(firebaseApp),
      doc,
      onSnapshot,
      authApi auth,
      auth authInstance,
    };
  } catch {
    return null;
  }
};

const firebaseRuntime = hasFirebaseConfig()  loadFirebaseRuntime()  null;
let activeMosqueScopeKey = DEFAULT_MOSQUE_KEY;
let activeExternalScopeKey = '';

const getMosqueOptionByKey = (key) = MOSQUE_OPTIONS.find((item) = item.key === key)  MOSQUE_OPTIONS[0];
const normalizeExternalScopeKey = (value) = String(value  '')
  .trim()
  .toLowerCase()
  .replace(äg, 'ae')
  .replace(ög, 'oe')
  .replace(üg, 'ue')
  .replace(ßg, 'ss')
  .replace(s+g, '_')
  .replace([^a-z0-9_-]g, '');
const formatExternalScopeLabel = (value) = {
  const raw = String(value  '').trim();
  if (!raw) return '';
  if (raw.includes('_')) {
    return raw
      .split('_')
      .filter(Boolean)
      .map((part) = part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const buildExternalAccountWritePayload = (account, overrides = {}) = {
  const next = {
    name String(account.name  ''),
    nameKey String(account.nameKey  normalizeAccountNameKey(account.name  '')),
    authEmail account.authEmail  null,
    authUid account.authUid  null,
    localPassword account.localPassword  null,
    localPasswordHash account.localPasswordHash  null,
    mosqueId account.mosqueId  EXTERNAL_MOSQUE_KEY,
    mosqueIds Array.isArray(account.mosqueIds) && account.mosqueIds.length  account.mosqueIds  [EXTERNAL_MOSQUE_KEY],
    preferredMosqueId account.preferredMosqueId  EXTERNAL_MOSQUE_KEY,
    permissions account.permissions  allPermissionsEnabled(),
    isExternalGuest true,
    externalMultipleMajalis account.externalMultipleMajalis !== false,
    externalShowNames Boolean(account.externalShowNames),
    externalMosqueName String(account.externalMosqueName  ''),
    accountCollection ADMIN_EXTERNAL_ACCOUNTS_COLLECTION,
    isSuperAdmin Boolean(account.isSuperAdmin),
    active account.active !== false,
    createdAt account.createdAt  new Date().toISOString(),
    createdBy account.createdBy  'system',
    updatedAt new Date().toISOString(),
    ...overrides,
  };
  next.nameKey = String(next.nameKey  normalizeAccountNameKey(next.name  ''));
  return next;
};
const setActiveMosqueScope = (key, externalScopeKey = '') = {
  activeMosqueScopeKey = getMosqueOptionByKey(key).key;
  activeExternalScopeKey = normalizeExternalScopeKey(externalScopeKey);
};
const resolveScopedCollectionForMosque = (collection, mosqueKey) = {
  if (String(mosqueKey) === EXTERNAL_MOSQUE_KEY) {
    const externalSuffix = normalizeExternalScopeKey(activeExternalScopeKey  'default');
    return `${collection}_ext_${externalSuffix}`;
  }
  const suffix = getMosqueOptionByKey(mosqueKey).suffix;
  return suffix  `${collection}_${suffix}`  collection;
};
const resolveScopedCollection = (collection) = resolveScopedCollectionForMosque(collection, activeMosqueScopeKey);

async function incrementDocCounters(collection, id, fieldPaths) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const scopedCollection = resolveScopedCollection(collection);
  const document = `projects${FIREBASE_CONFIG.projectId}databases(default)documents${scopedCollection}${id}`;
  const body = {
    writes [{
      transform {
        document,
        fieldTransforms [
          ...fieldPaths.map((fieldPath) = ({ fieldPath, increment { integerValue '1' } })),
          { fieldPath 'updatedAt', setToServerValue 'REQUEST_TIME' },
        ],
      },
    }],
  };
  const res = await fetch(commitUrl(), { method 'POST', headers { 'Content-Type' 'applicationjson' }, body JSON.stringify(body) });
  if (!res.ok) throw new Error('Firestore increment failed');
}

async function getDocData(collection, id) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const res = await fetch(docUrl(resolveScopedCollection(collection), id));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Firestore read failed');
  const json = await res.json();
  return fromFirestoreValue({ mapValue { fields json.fields  {} } });
}

async function listDocIds(collection, pageSize = 300) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const scopedCollection = resolveScopedCollection(collection);
  let pageToken = '';
  const ids = [];
  do {
    const tokenPart = pageToken  `&pageToken=${encodeURIComponent(pageToken)}`  '';
    const url = `httpsfirestore.googleapis.comv1projects${FIREBASE_CONFIG.projectId}databases(default)documents${scopedCollection}pageSize=${pageSize}${tokenPart}&key=${FIREBASE_CONFIG.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Firestore list failed');
    const json = await res.json();
    const docs = Array.isArray(json.documents)  json.documents  [];
    docs.forEach((doc) = {
      const fullName = String(doc.name  '');
      const id = fullName.split('').pop();
      if (id) ids.push(id);
    });
    pageToken = String(json.nextPageToken  '');
  } while (pageToken);
  return ids;
}

async function listDocIdsForMosque(collection, mosqueKey, pageSize = 300) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const scopedCollection = resolveScopedCollectionForMosque(collection, mosqueKey);
  let pageToken = '';
  const ids = [];
  do {
    const tokenPart = pageToken  `&pageToken=${encodeURIComponent(pageToken)}`  '';
    const url = `httpsfirestore.googleapis.comv1projects${FIREBASE_CONFIG.projectId}databases(default)documents${scopedCollection}pageSize=${pageSize}${tokenPart}&key=${FIREBASE_CONFIG.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Firestore list failed');
    const json = await res.json();
    const docs = Array.isArray(json.documents)  json.documents  [];
    docs.forEach((doc) = {
      const fullName = String(doc.name  '');
      const id = fullName.split('').pop();
      if (id) ids.push(id);
    });
    pageToken = String(json.nextPageToken  '');
  } while (pageToken);
  return ids;
}


async function setDocData(collection, id, data) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const body = { fields toFirestoreValue(data).mapValue.fields };
  const res = await fetch(docUrl(resolveScopedCollection(collection), id), { method 'PATCH', headers { 'Content-Type' 'applicationjson' }, body JSON.stringify(body) });
  if (!res.ok) throw new Error('Firestore write failed');
}

async function deleteDocData(collection, id) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const res = await fetch(docUrl(resolveScopedCollection(collection), id), { method 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error('Firestore delete failed');
}

async function getDocDataForMosque(collection, id, mosqueKey) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const res = await fetch(docUrl(resolveScopedCollectionForMosque(collection, mosqueKey), id));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Firestore read failed');
  const json = await res.json();
  return fromFirestoreValue({ mapValue { fields json.fields  {} } });
}

async function setDocDataForMosque(collection, id, data, mosqueKey) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const body = { fields toFirestoreValue(data).mapValue.fields };
  const res = await fetch(docUrl(resolveScopedCollectionForMosque(collection, mosqueKey), id), {
    method 'PATCH',
    headers { 'Content-Type' 'applicationjson' },
    body JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Firestore write failed');
}

async function deleteDocDataForMosque(collection, id, mosqueKey) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const res = await fetch(docUrl(resolveScopedCollectionForMosque(collection, mosqueKey), id), { method 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error('Firestore delete failed');
}


async function getGlobalDocData(collection, id) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const res = await fetch(docUrl(collection, id));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Firestore read failed');
  const json = await res.json();
  return fromFirestoreValue({ mapValue { fields json.fields  {} } });
}

async function listGlobalDocIds(collection, pageSize = 300) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  let pageToken = '';
  const ids = [];
  do {
    const tokenPart = pageToken  `&pageToken=${encodeURIComponent(pageToken)}`  '';
    const url = `httpsfirestore.googleapis.comv1projects${FIREBASE_CONFIG.projectId}databases(default)documents${collection}pageSize=${pageSize}${tokenPart}&key=${FIREBASE_CONFIG.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Firestore list failed');
    const json = await res.json();
    const docs = Array.isArray(json.documents)  json.documents  [];
    docs.forEach((doc) = {
      const fullName = String(doc.name  '');
      const id = fullName.split('').pop();
      if (id) ids.push(id);
    });
    pageToken = String(json.nextPageToken  '');
  } while (pageToken);
  return ids;
}

async function findGlobalRegistrationByIdNumber(
  collection,
  idNumber,
  mosqueKey = DEFAULT_MOSQUE_KEY,
  externalScopeKey = '',
) {
  const matches = await listGlobalRegistrationsByIdNumber(collection, idNumber, mosqueKey, externalScopeKey);
  return matches[0]  null;
}

async function listGlobalRegistrationsByIdNumber(
  collection,
  idNumber,
  mosqueKey = DEFAULT_MOSQUE_KEY,
  externalScopeKey = '',
) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const targetIdNumber = String(idNumber  '').trim();
  const targetMosqueKey = getMosqueOptionByKey(mosqueKey).key;
  const targetExternalScopeKey = normalizeExternalScopeKey(externalScopeKey);
  if (!targetIdNumber) return [];
  const docIds = await listGlobalDocIds(collection);
  const matches = [];
  for (const docId of docIds) {
    const registration = await getGlobalDocData(collection, docId);
    const registrationMosqueKey = getMosqueOptionByKey(registration.mosqueKey  DEFAULT_MOSQUE_KEY).key;
    const registrationExternalScopeKey = normalizeExternalScopeKey(registration.externalScopeKey  '');
    const externalScopeMatches = targetMosqueKey === EXTERNAL_MOSQUE_KEY
       registrationExternalScopeKey === targetExternalScopeKey
       true;
    if (
      String(registration.idNumber  '').trim() === targetIdNumber
      && registrationMosqueKey === targetMosqueKey
      && externalScopeMatches
    ) {
      matches.push({
        docId,
        registration,
      });
    }
  }
  return matches;
}

async function setGlobalDocData(collection, id, data) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const body = { fields toFirestoreValue(data).mapValue.fields };
  const res = await fetch(docUrl(collection, id), { method 'PATCH', headers { 'Content-Type' 'applicationjson' }, body JSON.stringify(body) });
  if (!res.ok) throw new Error('Firestore write failed');
}

async function deleteGlobalDocData(collection, id) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const res = await fetch(docUrl(collection, id), { method 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error('Firestore delete failed');
}

async function deleteAllGlobalDocsInCollection(collection) {
  let ids = [];
  try {
    ids = await listGlobalDocIds(collection);
  } catch (error) {
    return {
      total 0,
      deleted 0,
      failed [{ id '__collection__', error `list_failed${String(error.message  error  'unknown')}` }],
    };
  }
  let deleted = 0;
  const failed = [];
  await Promise.all(ids.map(async (id) = {
    try {
      await deleteGlobalDocData(collection, id);
      deleted += 1;
    } catch (error) {
      failed.push({ id, error String(error.message  error  'delete_failed') });
    }
  }));
  return { total ids.length, deleted, failed };
}

async function deleteAllDocsInCollectionForMosque(collection, mosqueKey) {
  let ids = [];
  try {
    ids = await listDocIdsForMosque(collection, mosqueKey);
  } catch (error) {
    return {
      total 0,
      deleted 0,
      failed [{ id '__collection__', error `list_failed${String(error.message  error  'unknown')}` }],
    };
  }
  let deleted = 0;
  const failed = [];
  await Promise.all(ids.map(async (id) = {
    try {
      await deleteDocDataForMosque(collection, id, mosqueKey);
      deleted += 1;
    } catch (error) {
      failed.push({ id, error String(error.message  error  'delete_failed') });
    }
  }));
  return { total ids.length, deleted, failed };
}

async function appendMemberDetailsToDailyAttendance(dateISO, targetPrayers, tanzeemKey, locationName, locationKey, member) {
  const existing = (await getDocData('attendance_daily', dateISO))  {};
  const nextByPrayer = { ...(existing.byPrayer  {}) };

  targetPrayers.forEach((prayerKey) = {
    const prayerNode = { ...(nextByPrayer[prayerKey]  {}) };
    const memberDetails = { ...(prayerNode.memberDetails  {}) };
    const tanzeemNode = { ...(memberDetails[tanzeemKey]  {}) };
    const majlisEntries = Array.isArray(tanzeemNode[locationKey])  [...tanzeemNode[locationKey]]  [];

    const alreadyExists = majlisEntries.some((entry) = String(entry.idNumber  '') === String(member.idNumber  ''));
    if (!alreadyExists) {
      majlisEntries.push({
        idNumber String(member.idNumber  ''),
        ...(STORE_MEMBER_NAMES_IN_DB  { name member.name  '' }  {}),
        majlis locationName,
        tanzeem tanzeemKey,
        timestamp new Date().toISOString(),
      });
    }

    tanzeemNode[locationKey] = majlisEntries;
    memberDetails[tanzeemKey] = tanzeemNode;
    prayerNode.memberDetails = memberDetails;
    nextByPrayer[prayerKey] = prayerNode;
  });

  await setDocData('attendance_daily', dateISO, {
    ...existing,
    byPrayer nextByPrayer,
  });
}

const toLocationKey = (name) = name
  .toLowerCase()
  .replace(äg, 'ae')
  .replace(ög, 'oe')
  .replace(üg, 'ue')
  .replace(ßg, 'ss')
  .replace([^a-z0-9s]g, '')
  .trim()
  .replace(s+g, '_');

const getNextPrayer = (now, timesToday) = {
  const nowMinutes = now.getHours()  60 + now.getMinutes();
  const entries = [
    ['fajr', timesToday.fajr],
    ['sohar', timesToday.sohar],
    ['asr', timesToday.asr],
    ['maghrib', timesToday.maghrib],
    ['ishaa', timesToday.ishaa],
  ].map(([name, t]) = ({ name, t, mins isValidTime(t)  Number(t.slice(0, 2))  60 + Number(t.slice(3))  null }));
  const next = entries.find((entry) = entry.mins !== null && entry.mins = nowMinutes);
  return (next  entries[0]).name;
};

const getToastTone = (message) = {
  const value = String(message  '').toLowerCase();
  if (!value) return 'positive';
  if (fehlererrorfalschnichtkonntebereitsbittekeinsfehlgeschlagen.test(value)) return 'negative';
  if (✓gespeichertgezähltentfernt.test(value)) return 'positive';
  return 'positive';
};

const getDisplayPrayerLabel = (key, timesToday) = {
  const soharAsrMerged = isValidTime(timesToday.sohar) && timesToday.sohar === timesToday.asr;
  const maghribIshaaMerged = isValidTime(timesToday.maghrib) && timesToday.maghrib === timesToday.ishaa;
  if (soharAsrMerged && key === 'sohar') return 'SoharAsr';
  if (soharAsrMerged && key === 'asr') return 'SoharAsr';
  if (maghribIshaaMerged && key === 'maghrib') return 'MaghribIshaa';
  if (maghribIshaaMerged && key === 'ishaa') return 'MaghribIshaa';
  return PRAYER_LABELS[key]  key;
};


function renderInlineBoldSegments(text, textStyle, boldStyle) {
  const parts = String(text  '').split(([^]+)g).filter(Boolean);
  return parts.map((part, idx) = {
    if (part.startsWith('') && part.endsWith('')) {
      return Text key={`b_${idx}`} style={boldStyle}{part.slice(2, -2)}Text;
    }
    return Text key={`t_${idx}`} style={textStyle}{part}Text;
  });
}


const isWebRuntime = Platform.OS === 'web';

const getQrCycleStart = (timestamp = Date.now()) = Math.floor(timestamp  QR_REFRESH_INTERVAL_MS)  QR_REFRESH_INTERVAL_MS;
const normalizeQrAttendanceCategory = (value) = (String(value  '').toLowerCase() === 'program'  'program'  'prayer');
const formatQrCountdown = (seconds) = {
  const safeSeconds = Math.max(0, Number(seconds)  0);
  const mins = Math.floor(safeSeconds  60);
  const secs = safeSeconds % 60;
  return `${mins}${String(secs).padStart(2, '0')}`;
};
const createQrPayload = ({
  mosqueKey,
  cycleStart,
  attendanceCategory = 'prayer',
  externalScopeKey = '',
}) = {
  const normalizedExternalScopeKey = normalizeExternalScopeKey(externalScopeKey);
  return {
    type 'prayer_attendance',
    mosqueKey,
    attendanceCategory normalizeQrAttendanceCategory(attendanceCategory),
    ...(normalizedExternalScopeKey  { externalScopeKey normalizedExternalScopeKey }  {}),
    cycleStart,
    expiresAt cycleStart + QR_REFRESH_INTERVAL_MS,
    version 1,
  };
};
const encodeQrPayload = (payload) = {
  try {
    return encodeURIComponent(JSON.stringify(payload));
  } catch {
    return '';
  }
};
const decodeQrPayload = (value) = {
  try {
    return JSON.parse(decodeURIComponent(String(value  '')));
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
}) = {
  const payload = createQrPayload({ mosqueKey, cycleStart, attendanceCategory, externalScopeKey });
  const encodedPayload = encodeQrPayload(payload);
  if (!encodedPayload) return '';
  const preferredScanBaseUrl = String(scanBaseUrl  '').trim();
  let url;
  try {
    if (preferredScanBaseUrl) {
      url = new URL(preferredScanBaseUrl);
    } else if (isWebRuntime && typeof window !== 'undefined') {
      url = new URL(window.location.href);
    } else {
      return encodedPayload;
    }
  } catch {
    if (!isWebRuntime  typeof window === 'undefined') return encodedPayload;
    url = new URL(window.location.href);
  }
  url.searchParams.set(QR_SCAN_PARAM, encodedPayload);
  return url.toString();
};
const buildQrImageUrl = (scanUrl) = `httpsapi.qrserver.comv1create-qr-codesize=720x720&margin=24&data=${encodeURIComponent(scanUrl)}`;
function PrivacySection({ section, theme, isLast }) {
  return (
    View style={[styles.privacySection, isLast && styles.privacySectionLast]}
      Text style={[styles.privacySectionTitle, { color theme.text }]}{section.title}Text
      {(section.paragraphs  []).map((paragraph, index) = (
        Text key={`${section.title}_p_${index}`} style={[styles.privacyParagraph, { color theme.text }]}
          {renderInlineBoldSegments(paragraph, null, styles.privacyParagraphBold)}
        Text
      ))}
      {(section.bullets  []).map((bullet, index) = (
        View key={`${section.title}_b_${index}`} style={styles.privacyBulletRow}
          Text style={[styles.privacyBulletDot, { color theme.text }]}•Text
          Text style={[styles.privacyBulletText, { color theme.text }]}
            {renderInlineBoldSegments(bullet, null, styles.privacyParagraphBold)}
          Text
        View
      ))}
      {!isLast  View style={[styles.privacyDivider, { backgroundColor theme.border }]}   null}
    View
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
  const [qrRegistrationFlowSearchQuery, setQrRegistrationFlowSearchQuery] = useState('');
  const [qrRegistrationOverrideCandidate, setQrRegistrationOverrideCandidate] = useState(null);
  const [qrPendingScanAfterRegistrationPayload, setQrPendingScanAfterRegistrationPayload] = useState('');
  const [qrScanExternalScopeKey, setQrScanExternalScopeKey] = useState('');
  const [qrScanMosqueKey, setQrScanMosqueKey] = useState('');
  const [isQrQuickIdSearchVisible, setQrQuickIdSearchVisible] = useState(false);
  const [qrSubmitting, setQrSubmitting] = useState(false);
  const [qrAttendanceCategory, setQrAttendanceCategory] = useState('prayer');
  const [qrCycleStart, setQrCycleStart] = useState(() = getQrCycleStart());
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
  const [guestExternUnlocked, setGuestExternUnlocked] = useState(false);
  const [guestSessionBootstrapDone, setGuestSessionBootstrapDone] = useState(false);
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
  const [dbResetSelectionByCategory, setDbResetSelectionByCategory] = useState(() = (
    INTERNAL_RESET_CATEGORIES.reduce((acc, category) = ({ ...acc, [category.key] [] }), {})
  ));
  const [dbResetLoadingByCategory, setDbResetLoadingByCategory] = useState(() = (
    INTERNAL_RESET_CATEGORIES.reduce((acc, category) = ({ ...acc, [category.key] false }), {})
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
  const normalizedAppMode = APP_MODE === 'guest'  'extern'  APP_MODE;
  const isSecretMode = normalizedAppMode === 'secret';
  const isExternMode = normalizedAppMode === 'extern'  normalizedAppMode === 'qr_extern';
  const isQrExternMode = normalizedAppMode === 'qr_extern';
  const isGuestMode = isExternMode;
  const activeExternalScopeDependency = normalizeExternalScopeKey(guestActivation.scopeKey  guestActivation.mosqueName  '');
  const hasMultipleMajalisInGuest = isGuestMode  (guestActivation.multipleMajalis !== false)  true;


  const qrScanUrl = useMemo(
    () = buildQrScanUrl({
      mosqueKey activeMosqueKey,
      cycleStart qrCycleStart,
      attendanceCategory qrAttendanceCategory,
      externalScopeKey activeMosqueKey === EXTERNAL_MOSQUE_KEY
         normalizeExternalScopeKey(
          guestActivation.scopeKey
           guestActivation.mosqueName
           currentAccount.externalMosqueName
           currentAccount.name
           '',
        )
         '',
      scanBaseUrl SECRET_QR_APP_URL,
    }),
    [activeMosqueKey, currentAccount.externalMosqueName, currentAccount.name, guestActivation.mosqueName, guestActivation.scopeKey, qrAttendanceCategory, qrCycleStart],
  );
  const qrGuestAmaratScopeKey = normalizeExternalScopeKey(
    qrScanExternalScopeKey  guestActivation.scopeKey  guestActivation.mosqueName  '',
  );
  const shouldUseExternalQrDirectory = isGuestMode
     activeMosqueKey === EXTERNAL_MOSQUE_KEY
     qrScanMosqueKey === EXTERNAL_MOSQUE_KEY
     Boolean(qrGuestAmaratScopeKey);
  const qrMembersDirectory = shouldUseExternalQrDirectory
     EXTERNAL_MEMBER_DIRECTORY_DATA.filter((entry) = {
      const entryScope = normalizeExternalScopeKey(entry.amarat  '');
      return !entryScope  !qrGuestAmaratScopeKey  entryScope === qrGuestAmaratScopeKey;
    })
     MEMBER_DIRECTORY_DATA;
  const qrCurrentRegistrationMember = useMemo(() = {
    if (!qrRegistration.idNumber) return null;
    return qrMembersDirectory.find((entry) = String(entry.idNumber) === String(qrRegistration.idNumber))  null;
  }, [qrMembersDirectory, qrRegistration]);
  const qrCurrentRegistrationMajlisLabel = useMemo(() = {
    const rawMajlis = String(qrCurrentRegistrationMember.majlis  '').trim();
    if (rawMajlis && rawMajlis !== '-') return rawMajlis;
    const scopeKeyFromMember = normalizeExternalScopeKey(qrCurrentRegistrationMember.amarat  '');
    const configuredScopeName = externalScopeOptions.find((option) = normalizeExternalScopeKey(option.scopeKey  '') === scopeKeyFromMember).mosqueName  '';
    const fallbackAmarat = String(configuredScopeName  guestActivation.mosqueName  formatExternalScopeLabel(qrCurrentRegistrationMember.amarat  '')).trim();
    return fallbackAmarat  rawMajlis  '—';
  }, [externalScopeOptions, guestActivation.mosqueName, qrCurrentRegistrationMember.amarat, qrCurrentRegistrationMember.majlis]);
  const qrRegistrationSelectionLabel = useMemo(() = {
    const rawMajlis = String(qrRegistrationMajlis  '').trim();
    if (rawMajlis && rawMajlis !== '-') return rawMajlis;
    if (shouldUseExternalQrDirectory) {
      const scopeLabel = formatExternalScopeLabel(qrGuestAmaratScopeKey  guestActivation.scopeKey  guestActivation.mosqueName  '');
      return scopeLabel  'Jamaat';
    }
    return rawMajlis  '—';
  }, [guestActivation.mosqueName, guestActivation.scopeKey, qrGuestAmaratScopeKey, qrRegistrationMajlis, shouldUseExternalQrDirectory]);
  const qrRegistrationMajlisChoices = useMemo(() = (
    qrMembersDirectory
      .filter((entry) = entry.tanzeem === qrRegistrationTanzeem)
      .map((entry) = entry.majlis)
      .filter((value, index, arr) = value && value !== '-' && arr.indexOf(value) === index)
      .sort((a, b) = a.localeCompare(b, 'de'))
  ), [qrMembersDirectory, qrRegistrationTanzeem]);
  const hasQrMajlisChoicesForTanzeem = useCallback((tanzeemKey) = {
    const normalizedTanzeem = String(tanzeemKey  '').trim().toLowerCase();
    if (!normalizedTanzeem) return false;
    return qrMembersDirectory.some((entry) = (
      String(entry.tanzeem  '').trim().toLowerCase() === normalizedTanzeem
      && String(entry.majlis  '').trim()
      && String(entry.majlis  '').trim() !== '-'
    ));
  }, [qrMembersDirectory]);
  const shouldUseQrMajlisSelection = hasMultipleMajalisInGuest && hasQrMajlisChoicesForTanzeem(qrRegistrationTanzeem);
  const qrRegistrationMemberChoices = useMemo(() = (
    qrMembersDirectory
      .filter((entry) = (
        entry.tanzeem === qrRegistrationTanzeem
        && (shouldUseExternalQrDirectory && !shouldUseQrMajlisSelection  true  entry.majlis === qrRegistrationMajlis)
      ))
      .sort((a, b) = String(a.idNumber).localeCompare(String(b.idNumber), 'de'))
  ), [qrMembersDirectory, qrRegistrationMajlis, qrRegistrationTanzeem, shouldUseExternalQrDirectory, shouldUseQrMajlisSelection]);
  const qrRegistrationTanzeemOptions = useMemo(
    () = (qrAttendanceCategory === 'program'  PROGRAM_TANZEEM_OPTIONS  TANZEEM_OPTIONS),
    [qrAttendanceCategory],
  );
  const qrRegistrationSearchDigits = String(qrRegistrationSearchQuery  '').replace([^0-9]g, '');
  const qrRegistrationFlowSearchDigits = String(qrRegistrationFlowSearchQuery  '').replace([^0-9]g, '');
  const qrRegistrationSearchResults = useMemo(() = {
    if (qrRegistrationSearchDigits.length  4) return [];
    const allowed = new Set(qrRegistrationTanzeemOptions);
    return qrMembersDirectory
      .filter((entry) = allowed.has(String(entry.tanzeem  '').toLowerCase()))
      .filter((entry) = String(entry.idNumber  '').includes(qrRegistrationSearchDigits))
      .slice(0, 24);
  }, [qrMembersDirectory, qrRegistrationSearchDigits, qrRegistrationTanzeemOptions]);
  const qrRegistrationFilteredMemberChoices = useMemo(() = {
    if (!qrRegistrationFlowSearchDigits) return qrRegistrationMemberChoices;
    return qrRegistrationMemberChoices.filter((entry) = String(entry.idNumber  '').includes(qrRegistrationFlowSearchDigits));
  }, [qrRegistrationFlowSearchDigits, qrRegistrationMemberChoices]);
  const isQrExternScopeSelected = Boolean(normalizeExternalScopeKey(guestActivation.scopeKey  guestActivation.mosqueName  ''));

  useEffect(() = {
    if (qrRegistrationMode !== 'majlis') return;
    if (shouldUseQrMajlisSelection) return;
    setQrRegistrationMode('idSelection');
    setQrRegistrationMajlis('-');
  }, [qrRegistrationMode, shouldUseQrMajlisSelection]);

  useEffect(() = {
    if (qrRegistrationMode === 'idSelection') return;
    setQrRegistrationFlowSearchQuery('');
  }, [qrRegistrationMode]);




  const themePulseAnim = useRef(new Animated.Value(1)).current;
  const terminalScrollRef = useRef(null);
  const countAttendanceRef = useRef(null);
  const terminalLastCountRef = useRef(0);
  const visitorCounterRef = useRef(0);
  const statsPayloadRef = useRef('');
  const weeklyStatsPayloadRef = useRef('');
  const hasLoadedWeeklyRef = useRef(false);
  const detailedLogsCacheRef = useRef({});

  const theme = isDarkMode  THEME.dark  THEME.light;
  const activeMosque = useMemo(() = {
    const base = getMosqueOptionByKey(activeMosqueKey);
    if (isGuestMode) {
      const guestLabel = String(guestActivation.mosqueName  '').trim();
      if (!currentAccount) {
        return {
          ...base,
          label guestLabel  'Extern',
        };
      }
      return {
        ...base,
        label guestLabel  'Extern',
      };
    }
    return base;
  }, [activeMosqueKey, currentAccount, guestActivation.mosqueName, isGuestMode]);
  const normalizedAnnouncement = useMemo(() = normalizeAnnouncementText(announcementInput), [announcementInput]);
  const announcementSegments = useMemo(() = parseAnnouncementSegments(normalizedAnnouncement), [normalizedAnnouncement]);
  const shouldRestrictToPrayerView = normalizedAppMode === 'display' && !currentAccount;
  const shouldRestrictToQrView = isSecretMode
     (normalizedAppMode === 'qr' && !currentAccount);
  const shouldRestrictToRegistrationView = normalizedAppMode === 'registration' && !currentAccount;
  const isExternalGuestSession = isGuestMode && Boolean(currentAccount.isExternalGuest);
  const isGuestActivated = Boolean(guestActivation.scopeKey);
  const guestRequiresConfig = isGuestMode && (!isGuestActivated  !String(guestActivation.mosqueName  '').trim());

  const isSuperAdmin = Boolean(currentAccount.isSuperAdmin);
  const effectivePermissions = {
    canEditSettings isGuestMode
       Boolean(currentAccount)
       (isSuperAdmin  Boolean(currentAccount.permissions.canEditSettings)),
    canViewIdStats isGuestMode
       Boolean(currentAccount)
       (isSuperAdmin  Boolean(currentAccount.permissions.canViewIdStats)),
    canExportData isGuestMode
       Boolean(currentAccount)
       (isSuperAdmin  Boolean(currentAccount.permissions.canExportData)),
  };

  const getAllowedMosqueKeys = useCallback((account) = {
    if (!account  account.isSuperAdmin) return [];
    const list = Array.isArray(account.mosqueIds) && account.mosqueIds.length
       account.mosqueIds
       (account.mosqueId  [account.mosqueId]  []);
    return list
      .map((key) = String(key  ''))
      .filter((key, index, arr) = key && arr.indexOf(key) === index);
  }, []);

  const accountMatchesActiveMosque = useCallback((account) = {
    if (!account) return false;
    if (account.isSuperAdmin) return true;
    const allowed = getAllowedMosqueKeys(account);
    return allowed.includes(String(activeMosque.key  ''));
  }, [activeMosque.key, getAllowedMosqueKeys]);

  const resolveAccountMosquePreference = useCallback((account) = {
    const preferred = String(account.preferredMosqueId  '');
    if (account.isSuperAdmin) {
      if (preferred && MOSQUE_OPTIONS.some((item) = item.key === preferred)) return preferred;
      return DEFAULT_MOSQUE_KEY;
    }
    const allowed = getAllowedMosqueKeys(account);
    if (!allowed.length) return DEFAULT_MOSQUE_KEY;
    if (preferred && allowed.includes(preferred)) return preferred;
    if (allowed.includes(DEFAULT_MOSQUE_KEY)) return DEFAULT_MOSQUE_KEY;
    return String(allowed[0]);
  }, [getAllowedMosqueKeys]);

  const canPersistMosquePreference = useMemo(() = {
    if (!currentAccount) return false;
    if (isSuperAdmin) return true;
    return getAllowedMosqueKeys(currentAccount).length  1;
  }, [currentAccount, getAllowedMosqueKeys, isSuperAdmin]);

  const visibleTabs = useMemo(() = TAB_ITEMS.filter((tab) = {
    if (tab.key === 'settings') return effectivePermissions.canEditSettings;
    if (isGuestMode && tab.key === 'stats') return Boolean(currentAccount);
    return true;
  }), [currentAccount, effectivePermissions.canEditSettings, isGuestMode]);

  useEffect(() = {
    if (!externScopeHeaderTapCount) return undefined;
    const timer = setTimeout(() = setExternScopeHeaderTapCount(0), 1200);
    return () = clearTimeout(timer);
  }, [externScopeHeaderTapCount]);

  const loadExternalScopeOptions = useCallback(async () = {
    try {
      setExternalScopeLoading(true);
      const ids = await listGlobalDocIds(EXTERNAL_CONFIG_COLLECTION).catch(() = []);
      const docs = await Promise.all(ids.map((id) = getGlobalDocData(EXTERNAL_CONFIG_COLLECTION, id).catch(() = null)));
      const byScope = new Map();
      docs.forEach((doc, index) = {
        const fallbackId = String(ids[index]  '').trim();
        const scopeKey = normalizeExternalScopeKey(doc.scopeKey  doc.mosqueName  doc.accountNameKey  fallbackId);
        const mosqueName = String(doc.mosqueName  '').trim();
        if (!scopeKey) return;
        if (!byScope.has(scopeKey)) {
          byScope.set(scopeKey, {
            scopeKey,
            mosqueName mosqueName  scopeKey,
            multipleMajalis doc.multipleMajalis !== false,
            showNames Boolean(doc.showNames),
          });
        }
      });
      const options = Array.from(byScope.values()).sort((a, b) = String(a.mosqueName  a.scopeKey).localeCompare(String(b.mosqueName  b.scopeKey), 'de'));
      setExternalScopeOptions(options);
    } finally {
      setExternalScopeLoading(false);
    }
  }, []);

  useEffect(() = {
    if (!isGuestMode) return;
    if (externalScopeOptions.length) return;
    loadExternalScopeOptions().catch(() = {});
  }, [externalScopeOptions.length, isGuestMode, loadExternalScopeOptions]);

  const openExternalScopeModal = useCallback(async () = {
    setExternalScopeModalVisible(true);
    await loadExternalScopeOptions();
  }, [loadExternalScopeOptions]);

  const selectExternalScope = useCallback(async (option) = {
    const payload = {
      accountNameKey String(option.scopeKey  '').trim(),
      scopeKey normalizeExternalScopeKey(option.scopeKey  ''),
      mosqueName String(option.mosqueName  '').trim(),
      multipleMajalis option.multipleMajalis !== false,
      showNames Boolean(option.showNames),
    };
    if (!payload.scopeKey) return;
    setGuestActivation(payload);
    setActiveMosqueKey(EXTERNAL_MOSQUE_KEY);
    await AsyncStorage.setItem(STORAGE_KEYS.guestActivation, JSON.stringify(payload)).catch(() = {});
    setExternalScopeModalVisible(false);
    setToast(`Externe Moschee aktiv ${payload.mosqueName  payload.scopeKey}`);
  }, []);


  const getSecondaryAuth = useCallback(() = {
    if (!firebaseRuntime.authApi) return null;
    const { getApps, getApp, initializeApp } = require('firebaseapp');
    const secondaryName = '__admin_creator__';
    const secondaryApp = getApps().find((app) = app.name === secondaryName)  initializeApp(FIREBASE_CONFIG, secondaryName);
    return firebaseRuntime.authApi.getAuth(secondaryApp);
  }, []);

  const loadAdminAccounts = useCallback(async () = {
    if (!isSuperAdmin) return;
    try {
      setAdminAccountsLoading(true);
      const [globalIds, externalIds] = await Promise.all([
        listGlobalDocIds(ADMIN_ACCOUNTS_COLLECTION),
        listGlobalDocIds(ADMIN_EXTERNAL_ACCOUNTS_COLLECTION).catch(() = []),
      ]);
      const [globalDocs, externalDocs] = await Promise.all([
        Promise.all(globalIds.map((id) = getGlobalDocData(ADMIN_ACCOUNTS_COLLECTION, id))),
        Promise.all(externalIds.map((id) = getGlobalDocData(ADMIN_EXTERNAL_ACCOUNTS_COLLECTION, id))),
      ]);
      const rows = [...globalDocs, ...externalDocs]
        .filter(Boolean)
        .map((entry) = ({
          ...entry,
          key normalizeAccountNameKey(entry.name  ''),
          accountCollection entry.isExternalGuest  ADMIN_EXTERNAL_ACCOUNTS_COLLECTION  ADMIN_ACCOUNTS_COLLECTION,
        }))
        .sort((a, b) = String(a.name  '').localeCompare(String(b.name  '')));
      setAdminAccounts(rows);
    } catch (error) {
      console.error('loadAdminAccounts failed', error);
      setToast('Accounts konnten nicht geladen werden');
    } finally {
      setAdminAccountsLoading(false);
    }
  }, [isSuperAdmin]);

  const ensureSuperAdminBootstrap = useCallback(async () = {
    if (!firebaseRuntime.authApi  !hasFirebaseConfig()) return;
    const docId = normalizeAccountNameKey(SUPER_ADMIN_NAME);
    try {
      const existing = await getGlobalDocData(ADMIN_ACCOUNTS_COLLECTION, docId);
      if (existing) return;
      let uid = '';
      if (SUPER_ADMIN_DEFAULT_PASSWORD.length = 6) {
        const secondaryAuth = getSecondaryAuth();
        try {
          const cred = await firebaseRuntime.authApi.createUserWithEmailAndPassword(secondaryAuth, buildAccountAuthEmail(SUPER_ADMIN_NAME), SUPER_ADMIN_DEFAULT_PASSWORD);
          uid = String(cred.user.uid  '');
          if (firebaseRuntime.authApi.updateProfile) {
            await firebaseRuntime.authApi.updateProfile(cred.user, { displayName SUPER_ADMIN_NAME });
          }
        } catch (error) {
          if (String(error.code  '').includes('email-already-in-use')) {
            uid = '';
          } else if (!isAuthConfigurationError(error)) {
            throw error;
          }
        } finally {
          if (secondaryAuth.currentUser) {
            await firebaseRuntime.authApi.signOut(secondaryAuth).catch(() = {});
          }
        }
      }
      await setGlobalDocData(ADMIN_ACCOUNTS_COLLECTION, docId, {
        name SUPER_ADMIN_NAME,
        nameKey docId,
        authEmail buildAccountAuthEmail(SUPER_ADMIN_NAME),
        authUid uid  null,
        mosqueId null,
        permissions allPermissionsEnabled(),
        isSuperAdmin true,
        active true,
        createdAt new Date().toISOString(),
        createdBy 'bootstrap',
      });
    } catch (error) {
      if (!isAuthConfigurationError(error)) {
        console.error('ensureSuperAdminBootstrap failed', error);
      }
    }
  }, [getSecondaryAuth]);

  const loginWithHiddenModal = useCallback(async () = {
    const name = loginNameInput.trim();
    const password = loginPasswordInput;
    if (!name  !password) {
      setToast('Bitte Name und Passwort eingeben');
      return;
    }
    const docId = normalizeAccountNameKey(name);
    const targetAccountCollection = isGuestMode  ADMIN_EXTERNAL_ACCOUNTS_COLLECTION  ADMIN_ACCOUNTS_COLLECTION;
    const strictInternalCollectionLogin = normalizedAppMode === 'registration' && !isGuestMode;
    const localAccountLogin = async () = {
      const existing = await getGlobalDocData(targetAccountCollection, docId).catch(() = null);
      const isDefaultSuperAdmin = normalizeAccountNameKey(name) === normalizeAccountNameKey(SUPER_ADMIN_NAME) && password === SUPER_ADMIN_DEFAULT_PASSWORD;
      if (!existing && (strictInternalCollectionLogin  !isDefaultSuperAdmin)) {
        return false;
      }
      const fallbackAccount = existing  {
        name SUPER_ADMIN_NAME,
        nameKey normalizeAccountNameKey(SUPER_ADMIN_NAME),
        mosqueId null,
        permissions allPermissionsEnabled(),
        isSuperAdmin true,
        active true,
      };
      const hasStoredLocalPassword = Boolean(existing.localPassword);
      const hasStoredLocalPasswordHash = Boolean(existing.localPasswordHash);
      const passwordHash = hasStoredLocalPasswordHash  await hashLocalPassword(password, docId)  '';
      const hasAnyStoredLocalSecret = hasStoredLocalPassword  hasStoredLocalPasswordHash;
      const matchesStoredPassword = hasStoredLocalPasswordHash
         String(existing.localPasswordHash) === String(passwordHash)
         (hasStoredLocalPassword  String(existing.localPassword) === String(password)  false);
      const allowDefaultSuperAdminPassword = !strictInternalCollectionLogin && Boolean(fallbackAccount.isSuperAdmin) && !hasAnyStoredLocalSecret;
      const matchesLocalPassword = matchesStoredPassword
         (allowDefaultSuperAdminPassword && isDefaultSuperAdmin);
      if (!matchesLocalPassword) return false;
      if (!fallbackAccount.active) return false;

      if (existing && hasStoredLocalPassword && !hasStoredLocalPasswordHash) {
        const migratedHash = await hashLocalPassword(password, docId);
        await setGlobalDocData(targetAccountCollection, docId, {
          ...existing,
          localPasswordHash migratedHash,
          localPassword null,
          updatedAt new Date().toISOString(),
        }).catch(() = {});
        fallbackAccount.localPasswordHash = migratedHash;
        fallbackAccount.localPassword = null;
      }

      if (!existing && isDefaultSuperAdmin && !strictInternalCollectionLogin) {
        const defaultHash = await hashLocalPassword(SUPER_ADMIN_DEFAULT_PASSWORD, docId);
        await setGlobalDocData(targetAccountCollection, docId, {
          ...fallbackAccount,
          authEmail buildAccountAuthEmail(SUPER_ADMIN_NAME),
          authUid null,
          localPassword null,
          localPasswordHash defaultHash,
          createdAt new Date().toISOString(),
          createdBy 'bootstrap-local',
        }).catch(() = {});
        fallbackAccount.localPassword = null;
        fallbackAccount.localPasswordHash = defaultHash;
      }
      const preferredMosqueKey = resolveAccountMosquePreference(fallbackAccount);
      if (preferredMosqueKey) {
        setActiveMosqueKey(String(preferredMosqueKey));
      }
      if (isGuestMode && existing.isExternalGuest) {
        const activationPayload = {
          accountNameKey existing.nameKey  docId,
          scopeKey normalizeExternalScopeKey(existing.externalMosqueName  existing.name  docId),
          mosqueName String(existing.externalMosqueName  '').trim(),
          multipleMajalis existing.externalMultipleMajalis !== false,
          showNames Boolean(existing.externalShowNames),
        };
        setGuestActivation(activationPayload);
        await AsyncStorage.setItem(STORAGE_KEYS.guestActivation, JSON.stringify(activationPayload)).catch(() = {});
        await AsyncStorage.setItem(STORAGE_KEYS.guestExternUnlocked, '1').catch(() = {});
        setGuestExternUnlocked(true);
        setActiveMosqueKey(EXTERNAL_MOSQUE_KEY);
      }
      localSessionActiveRef.current = true;
      setCurrentAccount(fallbackAccount);
      setAdminLoginVisible(false);
      setLoginPasswordInput('');
      setToast(`Assalāmu ʿalaikum wa raḥmatullāhi wa barakātuhu, ${fallbackAccount.name  name}! 👋`);
      return true;
    };

    if (!firebaseRuntime.authApi) {
      const didFallbackLogin = await localAccountLogin();
      if (!didFallbackLogin) setToast('Login fehlgeschlagen');
      return;
    }

    try {
      setAuthLoading(true);
      const cred = await firebaseRuntime.authApi.signInWithEmailAndPassword(firebaseRuntime.auth, buildAccountAuthEmail(name), password);
      const account = await getGlobalDocData(targetAccountCollection, docId);
      if (!account.active) throw new Error('Account ist nicht aktiv');
      const nextMosque = resolveAccountMosquePreference(account);
      if (nextMosque) setActiveMosqueKey(String(nextMosque));
      if (account.authUid && String(account.authUid) !== String(cred.user.uid  '')) {
        await firebaseRuntime.authApi.signOut(firebaseRuntime.auth).catch(() = {});
        throw new Error('Account-Zuordnung ungültig');
      }
      localSessionActiveRef.current = false;
      setCurrentAccount(account);
      if (isGuestMode && account.isExternalGuest) {
        const activationPayload = {
          accountNameKey account.nameKey  docId,
          scopeKey normalizeExternalScopeKey(account.externalMosqueName  account.name  docId),
          mosqueName String(account.externalMosqueName  '').trim(),
          multipleMajalis account.externalMultipleMajalis !== false,
          showNames Boolean(account.externalShowNames),
        };
        setGuestActivation(activationPayload);
        await AsyncStorage.setItem(STORAGE_KEYS.guestActivation, JSON.stringify(activationPayload)).catch(() = {});
        await AsyncStorage.setItem(STORAGE_KEYS.guestExternUnlocked, '1').catch(() = {});
        setGuestExternUnlocked(true);
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
      const code = String(error.code  '').toLowerCase();
      const message = String(error.message  '').trim();
      if (code.includes('authinvalid-credential')  code.includes('authwrong-password')  code.includes('authuser-not-found')  code.includes('authinvalid-email')) {
        setToast('Name oder Passwort ist falsch');
      } else {
        setToast(message  'Login fehlgeschlagen');
      }
    } finally {
      setAuthLoading(false);
    }
  }, [isGuestMode, loginNameInput, loginPasswordInput, normalizedAppMode, resolveAccountMosquePreference]);

  const logoutAccount = useCallback(async () = {
    localSessionActiveRef.current = false;
    if (firebaseRuntime.authApi) {
      try {
        await firebaseRuntime.authApi.signOut(firebaseRuntime.auth);
      } catch {}
    }
    setCurrentAccount(null);
    setPasswordChangeInput('');
    setAdminLoginVisible(false);
    if (activeTab === 'settings') setActiveTab('gebetsplan');
    setToast('Abgemeldet');
  }, [activeTab]);

  const changeOwnPassword = useCallback(async () = {
    const nextPassword = passwordChangeInput.trim();
    if (!nextPassword) {
      setToast('Bitte neues Passwort eingeben');
      return;
    }

    try {
      setAuthLoading(true);

      const canUseFirebasePasswordChange = Boolean(firebaseRuntime.auth.currentUser && firebaseRuntime.authApi.updatePassword && !localSessionActiveRef.current);
      if (canUseFirebasePasswordChange) {
        await firebaseRuntime.authApi.updatePassword(firebaseRuntime.auth.currentUser, nextPassword);
      } else {
        const docId = normalizeAccountNameKey(currentAccount.nameKey  currentAccount.name  '');
        if (!docId) throw new Error('missing-account');
        const nextHash = await hashLocalPassword(nextPassword, docId);
        const targetCollection = isGuestMode  ADMIN_EXTERNAL_ACCOUNTS_COLLECTION  ADMIN_ACCOUNTS_COLLECTION;
        await setGlobalDocData(targetCollection, docId, {
          ...(currentAccount  {}),
          nameKey docId,
          localPassword null,
          localPasswordHash nextHash,
          updatedAt new Date().toISOString(),
        });
        setCurrentAccount((prev) = (prev  {
          ...prev,
          localPassword null,
          localPasswordHash nextHash,
        }  prev));
      }

      setPasswordChangeInput('');
      setToast('Passwort geändert ✓');
    } catch (error) {
      const code = String(error.code  '');
      if (code.includes('requires-recent-login')) setToast('Bitte neu einloggen und erneut versuchen');
      else setToast('Passwort konnte nicht geändert werden');
    } finally {
      setAuthLoading(false);
    }
  }, [currentAccount, isGuestMode, passwordChangeInput]);

  const createManagedAccount = useCallback(async () = {
    if (!isSuperAdmin) return;
    const name = adminManageName.trim();
    const password = adminManagePassword;
    if (!name  !password) {
      setToast('Name und Passwort sind erforderlich');
      return;
    }
    const docId = normalizeAccountNameKey(name);
    if (!docId) {
      setToast('Ungültiger Name');
      return;
    }
    const selectedMosqueIds = adminManageMosqueKeys
      .map((key) = String(key  ''))
      .filter((key, index, arr) = key && arr.indexOf(key) === index);
    const isExternalAccount = selectedMosqueIds.includes(EXTERNAL_MOSQUE_KEY);
    if (!selectedMosqueIds.length) {
      setToast('Bitte mindestens eine Moschee auswählen');
      return;
    }
    let secondaryAuth = null;
    let authUid = null;
    let localOnly = !firebaseRuntime.authApi;
    try {
      setAdminAccountsLoading(true);
      const targetCollection = isExternalAccount  ADMIN_EXTERNAL_ACCOUNTS_COLLECTION  ADMIN_ACCOUNTS_COLLECTION;
      const existing = await getGlobalDocData(targetCollection, docId);
      if (existing) {
        setToast('Name existiert bereits');
        return;
      }
      if (!localOnly && password.length = 6) {
        secondaryAuth = getSecondaryAuth();
        try {
          const cred = await firebaseRuntime.authApi.createUserWithEmailAndPassword(secondaryAuth, buildAccountAuthEmail(name), password);
          authUid = String(cred.user.uid  '')  null;
          if (firebaseRuntime.authApi.updateProfile) {
            await firebaseRuntime.authApi.updateProfile(cred.user, { displayName name });
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
        nameKey docId,
        authEmail buildAccountAuthEmail(name),
        authUid,
        localPassword null,
        localPasswordHash localOnly  await hashLocalPassword(password, docId)  null,
        mosqueId isExternalAccount  EXTERNAL_MOSQUE_KEY  selectedMosqueIds[0],
        mosqueIds isExternalAccount  [EXTERNAL_MOSQUE_KEY]  selectedMosqueIds,
        preferredMosqueId isExternalAccount  EXTERNAL_MOSQUE_KEY  (selectedMosqueIds.includes(DEFAULT_MOSQUE_KEY)  DEFAULT_MOSQUE_KEY  selectedMosqueIds[0]),
        permissions isExternalAccount  allGuestPermissionsEnabled()  { ...adminManagePermissions },
        isExternalGuest isExternalAccount,
        externalMultipleMajalis isExternalAccount  Boolean(adminManageExternalMultiMajlis)  null,
        externalShowNames isExternalAccount  Boolean(adminManageExternalShowNames)  null,
        externalMosqueName isExternalAccount  ''  null,
        isSuperAdmin false,
        active true,
        createdAt new Date().toISOString(),
        createdBy currentAccount.name  SUPER_ADMIN_NAME,
      });
      setAdminManageName('');
      setAdminManagePassword('');
      setAdminManageMosqueKeys([DEFAULT_MOSQUE_KEY]);
      setAdminManageExternalMultiMajlis(true);
      setAdminManageExternalShowNames(false);
      setAdminManagePermissions({ ...DEFAULT_ACCOUNT_PERMISSIONS });
      setToast(localOnly  'Account erstellt ✓ (lokal)'  'Account erstellt ✓');
      await loadAdminAccounts();
    } catch (error) {
      const code = String(error.code  '');
      if (code.includes('email-already-in-use')) setToast('Name existiert bereits');
      else if (isAuthConfigurationError(error)) setToast('Firebase Auth ist nicht korrekt eingerichtet');
      else setToast('Account konnte nicht erstellt werden');
      if (!isAuthConfigurationError(error)) {
        console.error('createManagedAccount failed', error);
      }
    } finally {
      if (secondaryAuth.currentUser) {
        await firebaseRuntime.authApi.signOut(secondaryAuth).catch(() = {});
      }
      setAdminAccountsLoading(false);
    }
  }, [adminManageExternalMultiMajlis, adminManageExternalShowNames, adminManageMosqueKeys, adminManageName, adminManagePassword, adminManagePermissions, currentAccount.name, firebaseRuntime.authApi, getSecondaryAuth, isSuperAdmin, loadAdminAccounts]);

  const deleteQrRegistrationsForExternalScope = useCallback(async (scopeKey) = {
    const normalizedScopeKey = normalizeExternalScopeKey(scopeKey  '');
    if (!normalizedScopeKey) return { deleted 0, failed [] };

    const scopeMembers = EXTERNAL_MEMBER_DIRECTORY_DATA.filter((entry) = (
      normalizeExternalScopeKey(entry.amarat  '') === normalizedScopeKey
    ));
    const scopedIdNumbers = new Set(scopeMembers.map((entry) = String(entry.idNumber  '').trim()).filter(Boolean));

    const registrationIds = await listGlobalDocIds(QR_REGISTRATION_COLLECTION).catch(() = []);
    const failures = [];
    let deleted = 0;
    await Promise.all(registrationIds.map(async (registrationDocId) = {
      try {
        const registration = await getGlobalDocData(QR_REGISTRATION_COLLECTION, registrationDocId).catch(() = null);
        if (!registration) return;
        const isExternalRegistration = String(registration.mosqueKey  '') === EXTERNAL_MOSQUE_KEY;
        if (!isExternalRegistration) return;
        const registrationIdNumber = String(registration.idNumber  '').trim();
        const matchesScope = scopedIdNumbers.has(registrationIdNumber);
        if (!matchesScope) return;
        await deleteGlobalDocData(QR_REGISTRATION_COLLECTION, registrationDocId);
        deleted += 1;
      } catch (error) {
        failures.push({ id registrationDocId, error String(error.message  error  'unknown') });
      }
    }));
    return { deleted, failed failures };
  }, []);

  const deleteManagedAccount = useCallback((account) = {
    if (!isSuperAdmin  !account  account.isSuperAdmin) return;

    const performDelete = async () = {
      try {
        const docId = String(account.nameKey  normalizeAccountNameKey(account.name));
        const targetCollection = account.isExternalGuest  ADMIN_EXTERNAL_ACCOUNTS_COLLECTION  ADMIN_ACCOUNTS_COLLECTION;
        if (account.isExternalGuest) {
          const fallbackScopeKey = normalizeExternalScopeKey(account.externalMosqueName  account.name  docId);
          const scopeKeys = new Set([fallbackScopeKey].filter(Boolean));
          const [configByNameKey, configByScopeKey] = await Promise.all([
            getGlobalDocData(EXTERNAL_CONFIG_COLLECTION, docId).catch(() = null),
            fallbackScopeKey  getGlobalDocData(EXTERNAL_CONFIG_COLLECTION, fallbackScopeKey).catch(() = null)  Promise.resolve(null),
          ]);
          [configByNameKey, configByScopeKey].forEach((cfg) = {
            const scoped = normalizeExternalScopeKey(cfg.scopeKey  cfg.mosqueName  '');
            if (scoped) scopeKeys.add(scoped);
          });
          const cleanupResults = await Promise.all(Array.from(scopeKeys).map(async (scopeKey) = {
            const scopedCollectionResults = await Promise.all(EXTERNAL_SCOPE_PURGE_BASE_COLLECTIONS.map((baseCollection) = (
              deleteAllGlobalDocsInCollection(`${baseCollection}_ext_${scopeKey}`)
            )));
            const qrCleanupResult = await deleteQrRegistrationsForExternalScope(scopeKey);
            await Promise.all([
              deleteGlobalDocData(`${PRAYER_OVERRIDE_COLLECTION}_ext_${scopeKey}`, PRAYER_OVERRIDE_GLOBAL_DOC_ID).catch(() = {}),
              deleteGlobalDocData(`${PRAYER_OVERRIDE_COLLECTION}_ext_${scopeKey}`, PRAYER_OVERRIDE_PENDING_DOC_ID).catch(() = {}),
              deleteGlobalDocData(`${ANNOUNCEMENT_COLLECTION}_ext_${scopeKey}`, ANNOUNCEMENT_DOC_ID).catch(() = {}),
            ]);
            return { scopeKey, scopedCollectionResults, qrCleanupResult };
          }));
          const cleanupWarnings = cleanupResults.flatMap((scopeResult) = (
            scopeResult.scopedCollectionResults.flatMap((collectionResult) = (
              (collectionResult.failed  [])
                .filter((failure) = String(failure.id  '') === '__collection__')
                .map((failure) = ({ ...failure, scopeKey scopeResult.scopeKey }))
            ))
          ));
          const failedDeletes = cleanupResults.flatMap((scopeResult) = (
            scopeResult.scopedCollectionResults.flatMap((collectionResult) = (
              (collectionResult.failed  [])
                .filter((failure) = String(failure.id  '') !== '__collection__')
                .map((failure) = ({ ...failure, scopeKey scopeResult.scopeKey }))
            ))
          ));
          const qrFailedDeletes = cleanupResults.flatMap((scopeResult) = (
            (scopeResult.qrCleanupResult.failed  []).map((failure) = ({ ...failure, scopeKey scopeResult.scopeKey }))
          ));
          const externalConfigDocIdsToDelete = new Set([docId, ...Array.from(scopeKeys).filter(Boolean)]);
          await Promise.all(Array.from(externalConfigDocIdsToDelete).map((configDocId) = (
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
      Alert.alert('Account löschen', `Soll der Account ${account.name} gelöscht werden`, [
        { text 'Abbrechen', style 'cancel' },
        { text 'Löschen', style 'destructive', onPress performDelete },
      ]);
      return;
    }

    const confirmed = typeof globalThis.confirm === 'function'
       globalThis.confirm(`Soll der Account ${account.name} gelöscht werden`)
       true;
    if (confirmed) performDelete();
  }, [deleteQrRegistrationsForExternalScope, isSuperAdmin, loadAdminAccounts]);

  const resetGuestScopeData = useCallback(() = {
    if (!isGuestMode) return;
    const performReset = async () = {
      const resolvedScopeKey = normalizeExternalScopeKey(guestActivation.scopeKey  guestActivation.mosqueName  externalMosqueNameInput  '');
      if (!resolvedScopeKey) {
        setExternalMosqueNameInput('');
        setToast('Keine Local Amarat zum Zurücksetzen gefunden');
        return;
      }
      try {
        setExternalConfigSaving(true);
        const cleanupResults = await Promise.all(EXTERNAL_SCOPE_PURGE_BASE_COLLECTIONS.map((baseCollection) = (
          deleteAllGlobalDocsInCollection(`${baseCollection}_ext_${resolvedScopeKey}`)
        )));
        const qrCleanupResult = await deleteQrRegistrationsForExternalScope(resolvedScopeKey);
        await Promise.all([
          deleteGlobalDocData(`${PRAYER_OVERRIDE_COLLECTION}_ext_${resolvedScopeKey}`, PRAYER_OVERRIDE_GLOBAL_DOC_ID).catch(() = {}),
          deleteGlobalDocData(`${PRAYER_OVERRIDE_COLLECTION}_ext_${resolvedScopeKey}`, PRAYER_OVERRIDE_PENDING_DOC_ID).catch(() = {}),
          deleteGlobalDocData(`${ANNOUNCEMENT_COLLECTION}_ext_${resolvedScopeKey}`, ANNOUNCEMENT_DOC_ID).catch(() = {}),
        ]);
        const cleanupWarnings = cleanupResults.flatMap((collectionResult) = (
          (collectionResult.failed  [])
            .filter((failure) = String(failure.id  '') === '__collection__')
            .map((failure) = ({ ...failure, scopeKey resolvedScopeKey }))
        ));
        const failedDeletes = cleanupResults.flatMap((collectionResult) = (
          (collectionResult.failed  [])
            .filter((failure) = String(failure.id  '') !== '__collection__')
            .map((failure) = ({ ...failure, scopeKey resolvedScopeKey }))
        ));
        if (cleanupWarnings.length) {
          console.warn('Guest scope reset list warnings', cleanupWarnings);
        }
        if (failedDeletes.length) {
          console.error('Guest scope reset cleanup failures', failedDeletes);
          throw new Error('Guest scope reset cleanup failed');
        }
        if ((qrCleanupResult.failed  []).length) {
          console.error('Guest scope reset QR cleanup failures', qrCleanupResult.failed);
          throw new Error('Guest scope reset QR cleanup failed');
        }

        const accountNameKey = currentAccount.nameKey  normalizeAccountNameKey(currentAccount.name  '');
        const configDocIds = new Set([accountNameKey, resolvedScopeKey].filter(Boolean));
        await Promise.all(Array.from(configDocIds).map((configId) = (
          deleteGlobalDocData(EXTERNAL_CONFIG_COLLECTION, configId).catch(() = {})
        )));

        await AsyncStorage.removeItem(STORAGE_KEYS.guestActivation).catch(() = {});
        setGuestActivation(null);
        setExternalMosqueNameInput('');
        if (currentAccount.nameKey) {
          await setGlobalDocData(ADMIN_EXTERNAL_ACCOUNTS_COLLECTION, currentAccount.nameKey, {
            ...buildExternalAccountWritePayload(currentAccount),
            externalMosqueName '',
            updatedAt new Date().toISOString(),
          }).catch(() = {});
        }
        setToast(`Local Amarat zurückgesetzt und Daten gelöscht (${Number(qrCleanupResult.deleted)  0} QR-Registrierungen entfernt)`);
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
        'Sollen alle Daten dieser externen Amarat gelöscht und das Feld zurückgesetzt werden',
        [
          { text 'Abbrechen', style 'cancel' },
          { text 'Zurücksetzen', style 'destructive', onPress performReset },
        ],
      );
      return;
    }
    const confirmed = typeof globalThis.confirm === 'function'
       globalThis.confirm('Sollen alle Daten dieser externen Amarat gelöscht und das Feld zurückgesetzt werden')
       true;
    if (confirmed) performReset();
  }, [currentAccount, deleteQrRegistrationsForExternalScope, externalMosqueNameInput, guestActivation.mosqueName, guestActivation.scopeKey, isGuestMode]);

  const internalMosqueOptions = useMemo(
    () = MOSQUE_OPTIONS.filter((option) = option.key !== EXTERNAL_MOSQUE_KEY),
    [],
  );
  const externalResetScopeOptions = useMemo(() = {
    const scopeKey = normalizeExternalScopeKey(
      guestActivation.scopeKey
       guestActivation.mosqueName
       currentAccount.externalMosqueName
       currentAccount.name
       '',
    );
    if (!scopeKey) return [];
    const scopeLabel = String(
      guestActivation.mosqueName
       currentAccount.externalMosqueName
       formatExternalScopeLabel(scopeKey)
       '',
    ).trim();
    return [{ key scopeKey, label scopeLabel  formatExternalScopeLabel(scopeKey) }];
  }, [currentAccount.externalMosqueName, currentAccount.name, guestActivation.mosqueName, guestActivation.scopeKey]);

  const toggleDbResetMosqueSelection = useCallback((categoryKey, mosqueKey) = {
    setDbResetSelectionByCategory((prev) = {
      const current = Array.isArray(prev.[categoryKey])  prev[categoryKey]  [];
      const exists = current.includes(mosqueKey);
      return {
        ...prev,
        [categoryKey] exists
           current.filter((key) = key !== mosqueKey)
           [...current, mosqueKey],
      };
    });
  }, []);

  const runInternalDbReset = useCallback((category) = {
    const sourceOptions = isGuestMode  externalResetScopeOptions  internalMosqueOptions;
    const allowedKeys = new Set(sourceOptions.map((option) = option.key));
    const selectedMosqueKeysRaw = Array.isArray(dbResetSelectionByCategory.[category.key])  dbResetSelectionByCategory[category.key]  [];
    const selectedMosqueKeys = selectedMosqueKeysRaw.filter((key) = allowedKeys.has(key));
    if (!selectedMosqueKeys.length) {
      setToast(isGuestMode  'Bitte mindestens eine Local Amarat auswählen'  'Bitte mindestens eine Moschee auswählen');
      return;
    }

    const performReset = async () = {
      try {
        setDbResetLoadingByCategory((prev) = ({ ...prev, [category.key] true }));
        let deletedCount = 0;
        let failureCount = 0;

        if (category.key === 'qr' && !isGuestMode) {
          const registrationIds = await listGlobalDocIds(QR_REGISTRATION_COLLECTION).catch(() = []);
          const registrationRows = await Promise.all(
            registrationIds.map((id) = getGlobalDocData(QR_REGISTRATION_COLLECTION, id).catch(() = null)),
          );
          const deleteTargets = registrationIds.filter((id, index) = {
            const mosqueKey = getMosqueOptionByKey(registrationRows[index].mosqueKey  DEFAULT_MOSQUE_KEY).key;
            return selectedMosqueKeys.includes(mosqueKey);
          });
          await Promise.all(deleteTargets.map(async (id) = {
            try {
              await deleteGlobalDocData(QR_REGISTRATION_COLLECTION, id);
              deletedCount += 1;
            } catch (error) {
              failureCount += 1;
            }
          }));
        } else if (category.key === 'qr' && isGuestMode) {
          const selectedScopeKeys = selectedMosqueKeys.map((key) = normalizeExternalScopeKey(key)).filter(Boolean);
          const registrationIds = await listGlobalDocIds(QR_REGISTRATION_COLLECTION).catch(() = []);
          const registrationRows = await Promise.all(
            registrationIds.map((id) = getGlobalDocData(QR_REGISTRATION_COLLECTION, id).catch(() = null)),
          );
          const deleteTargets = registrationIds.filter((id, index) = {
            const row = registrationRows[index]  null;
            const mosqueKey = getMosqueOptionByKey(row.mosqueKey  DEFAULT_MOSQUE_KEY).key;
            const scopeKey = normalizeExternalScopeKey(row.externalScopeKey  '');
            return mosqueKey === EXTERNAL_MOSQUE_KEY && selectedScopeKeys.includes(scopeKey);
          });
          await Promise.all(deleteTargets.map(async (id) = {
            try {
              await deleteGlobalDocData(QR_REGISTRATION_COLLECTION, id);
              deletedCount += 1;
            } catch (error) {
              failureCount += 1;
            }
          }));
        } else {
          if (isGuestMode) {
            const restoreScope = normalizeExternalScopeKey(guestActivation.scopeKey  guestActivation.mosqueName  '');
            for (const scopeKeyRaw of selectedMosqueKeys) {
              const scopeKey = normalizeExternalScopeKey(scopeKeyRaw);
              if (!scopeKey) continue;
              setActiveMosqueScope(EXTERNAL_MOSQUE_KEY, scopeKey);
               eslint-disable-next-line no-await-in-loop
              const collectionResults = await Promise.all(
                category.collections.map((collection) = deleteAllDocsInCollectionForMosque(collection, EXTERNAL_MOSQUE_KEY)),
              );
              collectionResults.forEach((result) = {
                deletedCount += Number(result.deleted)  0;
                failureCount += Array.isArray(result.failed)  result.failed.length  0;
              });
            }
            setActiveMosqueScope(activeMosqueKey, restoreScope);
          } else {
            const collectionResults = await Promise.all(
              selectedMosqueKeys.flatMap((mosqueKey) = (
                category.collections.map((collection) = deleteAllDocsInCollectionForMosque(collection, mosqueKey))
              )),
            );
            collectionResults.forEach((result) = {
              deletedCount += Number(result.deleted)  0;
              failureCount += Array.isArray(result.failed)  result.failed.length  0;
            });
          }
        }

        setToast(
          failureCount
             `${category.label} ${deletedCount} Einträge gelöscht, ${failureCount} Fehler`
             `${category.label} ${deletedCount} Einträge gelöscht ✓`,
        );
      } catch (error) {
        console.error('runInternalDbReset failed', error);
        setToast(`${category.label} konnte nicht gelöscht werden`);
      } finally {
        setDbResetLoadingByCategory((prev) = ({ ...prev, [category.key] false }));
      }
    };

    const selectedLabels = sourceOptions
      .filter((option) = selectedMosqueKeys.includes(option.key))
      .map((option) = option.label)
      .join(', ');
    const confirmText = isGuestMode
       `${category.label} für folgende Local Amarat löschen ${selectedLabels}`
       `${category.label} für folgende Moscheen löschen ${selectedLabels}`;
    const canUseAlert = Platform.OS !== 'web';
    if (canUseAlert) {
      Alert.alert(
        `${category.label} löschen`,
        confirmText,
        [
          { text 'Abbrechen', style 'cancel' },
          { text 'Löschen', style 'destructive', onPress performReset },
        ],
      );
      return;
    }
    const confirmed = typeof globalThis.confirm === 'function'
       globalThis.confirm(confirmText)
       true;
    if (confirmed) performReset();
  }, [activeMosqueKey, dbResetSelectionByCategory, externalResetScopeOptions, guestActivation.mosqueName, guestActivation.scopeKey, internalMosqueOptions, isGuestMode]);

  const updateManagedPermissions = useCallback(async (account, nextPermissions) = {
    if (!isSuperAdmin  !account  account.isSuperAdmin  account.isExternalGuest) return;
    try {
      await setGlobalDocData(ADMIN_ACCOUNTS_COLLECTION, normalizeAccountNameKey(account.name), {
        ...account,
        permissions { ...nextPermissions },
        updatedAt new Date().toISOString(),
      });
      await loadAdminAccounts();
      setToast('Rechte aktualisiert ✓');
    } catch (error) {
      console.error('updateManagedPermissions failed', error);
      setToast('Rechte konnten nicht aktualisiert werden');
    }
  }, [isSuperAdmin, loadAdminAccounts]);

  const updateManagedExternalOptions = useCallback(async (account, nextOptions) = {
    if (!isSuperAdmin  !account  !account.isExternalGuest) return;
    try {
      const docId = normalizeAccountNameKey(account.nameKey  account.name);
      await setGlobalDocData(ADMIN_EXTERNAL_ACCOUNTS_COLLECTION, docId, buildExternalAccountWritePayload(account, {
        externalMultipleMajalis Boolean(nextOptions.externalMultipleMajalis),
        externalShowNames Boolean(nextOptions.externalShowNames),
      }));
      await loadAdminAccounts();
      setToast('Extern-Optionen aktualisiert ✓');
    } catch (error) {
      console.error('updateManagedExternalOptions failed', error);
      setToast('Extern-Optionen konnten nicht aktualisiert werden');
    }
  }, [isSuperAdmin, loadAdminAccounts]);

  const handleLogoPress = useCallback(() = {
    if (isSecretMode) return;
    if (currentAccount) {
      setToast(`Bereits eingeloggt als ${currentAccount.name}`);
      return;
    }
    setActiveTab('gebetsplan');
    setAdminTapCount((prev) = {
      const next = prev + 1;
      if (next = 3) {
        setAdminLoginVisible(true);
        return 0;
      }
      return next;
    });
  }, [currentAccount, isSecretMode]);

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width = 900;
  const contentContainerStyle = [styles.content, isTablet && styles.contentTablet];
  const logoSource = isDarkMode  APP_LOGO_DARK  APP_LOGO_LIGHT;
  const now = useMemo(() = {
    const d = applyForcedTestDate(getBerlinNow());
    if (isValidTime(FORCE_TIME)) {
      d.setHours(Number(FORCE_TIME.slice(0, 2)), Number(FORCE_TIME.slice(3)), 0, 0);
    }
    return d;
  }, [refreshTick]);
  useEffect(() = {
    const guestScope = isGuestMode  guestActivation.scopeKey  '';
    setActiveMosqueScope(activeMosqueKey, guestScope);
  }, [activeMosqueKey, guestActivation.scopeKey, isGuestMode]);
  const todayISO = toISO(now);
  const tomorrowISO = useMemo(() = toISO(addDays(now, 1)), [now]);
  const overrideDisplayDate = useMemo(() = addDays(now, overrideEditDayOffset), [now, overrideEditDayOffset]);
  const overrideDisplayDateISO = useMemo(() = toISO(overrideDisplayDate), [overrideDisplayDate]);
  useEffect(() = { if (!selectedStatsDateISO) setSelectedStatsDateISO(todayISO); }, [todayISO, selectedStatsDateISO]);
  useEffect(() = {
    if (selectedStatsWeekStartISO) return;
    setSelectedStatsWeekStartISO(toISO(startOfWeekMonday(now)));
  }, [now, selectedStatsWeekStartISO]);
  const programConfigToday = programConfigByDate[todayISO]  null;
  const availableProgramConfigOptions = useMemo(() = (
    Object.entries(programConfigByDate  {})
      .filter(([iso, config]) = ^d{4}-d{2}-d{2}$.test(String(iso  ''))
        && isValidTime(config.startTime)
        && Boolean(headlineToLegacyName(buildHeadlineConfig(config))))
      .map(([iso, config]) = {
        const headline = buildHeadlineConfig(config);
        const programName = headlineToLegacyName(headline);
        const programKey = toLocationKey(programName);
        return {
          docId `${iso}_${programKey}`,
          iso String(iso),
          programKey,
          programName,
          headline,
          source 'config',
        };
      })
      .sort((a, b) = b.docId.localeCompare(a.docId))
  ), [programConfigByDate]);
  const programWindow = useMemo(() = {
    const headline = buildHeadlineConfig(programConfigToday);
    if (!programConfigToday  !isValidTime(programConfigToday.startTime)  !headlineToLegacyName(headline)) {
      return { isConfigured false, isActive false, label null, minutesUntilOpen null };
    }

    const startMinutes = Number(programConfigToday.startTime.slice(0, 2))  60 + Number(programConfigToday.startTime.slice(3));
    const openMinutes = startMinutes - 30;
    const nowMinutes = now.getHours()  60 + now.getMinutes();
    const isActive = nowMinutes = openMinutes;

    return {
      isConfigured true,
      isActive,
      label headlineToLegacyName(headline),
      headline,
      startTime programConfigToday.startTime,
      opensAt `${pad(Math.floor((((openMinutes % 1440) + 1440) % 1440)  60))}${pad((((openMinutes % 1440) + 1440) % 1440) % 60)}`,
      minutesUntilOpen isActive  0  Math.max(0, openMinutes - nowMinutes),
      minutesUntilStart Math.max(0, startMinutes - nowMinutes),
    };
  }, [now, programConfigToday]);
  const availableProgramStatsOptions = useMemo(() = {
    const normalizeProgramNameFromKey = (value) = String(value  '')
      .split('_')
      .filter(Boolean)
      .map((part) = part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const parsedDocs = programStatsDocIds
      .map((docId) = {
        const raw = String(docId  '');
        const match = raw.match(^(d{4}-d{2}-d{2})_(.+)$);
        if (!match) return null;
        return {
          docId raw,
          iso String(match[1]),
          programKey String(match[2]  ''),
          programName String(programStatsNamesByDocId[raw]  '').trim()  normalizeProgramNameFromKey(match[2]  ''),
          source 'stats',
        };
      })
      .filter(Boolean);

    const merged = [...parsedDocs, ...availableProgramConfigOptions];
    const byDocId = new Map();
    merged.forEach((entry) = {
      if (!entry.docId) return;
      const prev = byDocId.get(entry.docId);
      if (!prev  (prev.source !== 'stats' && entry.source === 'stats')) {
        byDocId.set(entry.docId, entry);
      }
    });

    return Array.from(byDocId.values())
      .sort((a, b) = b.docId.localeCompare(a.docId))
      .map((entry) = {
        const dateObj = parseISO(entry.iso);
        const dateLabel = dateObj
           (() = {
            const weekday = new Intl.DateTimeFormat('de-DE', { weekday 'short' }).format(dateObj).replace(.$, '');
            const datePart = new Intl.DateTimeFormat('de-DE', { day '2-digit', month '2-digit', year 'numeric' }).format(dateObj);
            return `${weekday}, ${datePart}`;
          })()
           entry.iso;
        return {
          ...entry,
          label `${dateLabel} · ${entry.programName}`,
        };
      });
  }, [programStatsDocIds, availableProgramConfigOptions, programStatsNamesByDocId]);

  const selectedProgramStatsOption = useMemo(() = {
    if (selectedProgramStatsDocId) {
      const selected = availableProgramStatsOptions.find((item) = item.docId === selectedProgramStatsDocId);
      if (selected) return selected;
    }
    return availableProgramStatsOptions[0]  null;
  }, [availableProgramStatsOptions, selectedProgramStatsDocId]);
  const selectedProgramConfigDateISO = String(selectedProgramStatsOption.iso  '');
  const selectedProgramConfig = selectedProgramConfigDateISO
     (programConfigByDate[selectedProgramConfigDateISO]  null)
     null;
  const selectedProgramLabel = useMemo(() = {
    const name = String(
      selectedProgramStatsOption.programName
       headlineToLegacyName(buildHeadlineConfig(selectedProgramConfig))
       '',
    ).trim();
    if (!name) return '—';
    if (selectedProgramConfigDateISO === todayISO) return `${name} (heute)`;
    const dateObj = parseISO(selectedProgramConfigDateISO  '');
    if (!dateObj) return name;
    const weekday = new Intl.DateTimeFormat('de-DE', { weekday 'short' }).format(dateObj).replace(.$, '');
    const datePart = new Intl.DateTimeFormat('de-DE', { day '2-digit', month '2-digit', year 'numeric' }).format(dateObj);
    return `${name} (${weekday}, ${datePart})`;
  }, [selectedProgramStatsOption, selectedProgramConfig, selectedProgramConfigDateISO, todayISO]);
  const availableRegistrationStatsOptions = useMemo(() = (
    Object.values(registrationConfigById  {})
      .map((config) = normalizeRegistrationConfig(config, config.id  ''))
      .filter((config) = config.startDate && config.endDate && config.name)
      .sort((a, b) = String(b.startDate  '').localeCompare(String(a.startDate  ''))  String(b.updatedAt  '').localeCompare(String(a.updatedAt  '')))
      .map((config) = ({
        ...config,
        label `${config.startDate} bis ${config.endDate} · ${headlineToLegacyName(config)}`,
      }))
  ), [registrationConfigById]);
  const selectedRegistrationStatsOption = useMemo(() = {
    if (selectedRegistrationStatsConfigId) {
      const selected = availableRegistrationStatsOptions.find((item) = item.id === selectedRegistrationStatsConfigId);
      if (selected) return selected;
    }
    return availableRegistrationStatsOptions[0]  null;
  }, [availableRegistrationStatsOptions, selectedRegistrationStatsConfigId]);
  const activeRegistrationConfig = useMemo(() = {
    const configs = Object.values(registrationConfigById  {})
      .map((config) = normalizeRegistrationConfig(config, config.id  ''))
      .filter((config) = config.startDate && config.endDate && config.name);
    if (!configs.length) return null;
    const open = configs
      .filter((config) = !config.disabled && todayISO = config.startDate && todayISO = config.endDate)
      .sort((a, b) = String(b.updatedAt  '').localeCompare(String(a.updatedAt  '')))[0];
    if (open) return open;
    return configs.sort((a, b) = String(b.updatedAt  '').localeCompare(String(a.updatedAt  '')))[0]  null;
  }, [registrationConfigById, todayISO]);
  const registrationWindow = useMemo(() = {
    const config = activeRegistrationConfig;
    const state = getRegistrationWindowState(config, todayISO);
    return {
      config,
      ...state,
      canAccess Boolean(config && state.hasRange),
      isPublic Boolean(config.advanced.isPublic),
      onlyEhlVoters !isGuestMode && Boolean(config.advanced.onlyEhlVoters),
      allowDecline isGuestMode  Boolean(config.advanced.allowDecline)  true,
      loginEnabled !isGuestMode && Boolean(config.advanced.loginEnabled),
      includeTanzeems config.advanced.includeTanzeems  [...REGISTRATION_TANZEEM_OPTIONS],
    };
  }, [activeRegistrationConfig, isGuestMode, todayISO]);
  const availableDates = useMemo(() = Object.keys(RAMADAN_RAW).sort(), []);
  const isRamadanPeriodToday = todayISO = RAMADAN_END_ISO;
  const selectedISO = useMemo(() = (isRamadanPeriodToday  (RAMADAN_RAW[todayISO]  todayISO  findClosestISO(todayISO, availableDates))  null), [todayISO, availableDates, isRamadanPeriodToday]);
  const selectedDate = selectedISO  parseISO(selectedISO)  now;
  const selectedRaw = selectedISO  RAMADAN_RAW[selectedISO]  null;
  const hasTodayData = !isRamadanPeriodToday  Boolean(RAMADAN_RAW[todayISO]);

  const baseTimesToday = useMemo(() = buildPrayerTimes(selectedRaw, isRamadanPeriodToday), [selectedRaw, isRamadanPeriodToday]);
  const timesToday = useMemo(() = {
    const withManual = applyManualPrayerAdjustments(baseTimesToday, prayerOverride);
    return applyPrayerTimeOverride(withManual, prayerOverride);
  }, [baseTimesToday, prayerOverride]);
  const isRamadanPeriodTomorrow = useMemo(() = tomorrowISO = RAMADAN_END_ISO, [tomorrowISO]);
  const tomorrowRaw = useMemo(() = (isRamadanPeriodTomorrow  (RAMADAN_RAW[tomorrowISO]  null)  null), [tomorrowISO, isRamadanPeriodTomorrow]);
  const timesTomorrow = useMemo(() = buildPrayerTimes(tomorrowRaw, isRamadanPeriodTomorrow), [tomorrowRaw, isRamadanPeriodTomorrow]);
  const nextPrayer = useMemo(() = getNextPrayer(now, timesToday), [now, timesToday]);

  const soharAsrMergedToday = isValidTime(timesToday.sohar) && timesToday.sohar === timesToday.asr;
  const maghribIshaaMergedToday = isValidTime(timesToday.maghrib) && timesToday.maghrib === timesToday.ishaa;
  const hasSoharAsrOverrideToday = isValidTime(prayerOverride.soharAsrTime);
  const hasMaghribIshaaOverrideToday = isValidTime(prayerOverride.maghribIshaaTime);

  const prayerRows = useMemo(() = [
    { id 'fajr', label 'Fajr (الفجر)', time timesToday.fajr, activeKeys ['fajr'] },
    ...(soharAsrMergedToday
       [{ id 'sohar_asr', label 'SoharAsr (الظهرالعصر)', time timesToday.sohar, activeKeys ['sohar', 'asr'] }]
       [
        { id 'sohar', label 'Sohar (الظهر)', time timesToday.sohar, activeKeys ['sohar'] },
        { id 'asr', label 'Asr (العصر)', time timesToday.asr, activeKeys ['asr'] },
      ]),
    ...(maghribIshaaMergedToday
       [{ id 'maghrib_ishaa', label 'MaghribIshaa (المغربالعشاء)', time timesToday.maghrib, activeKeys ['maghrib', 'ishaa'] }]
       [
        { id 'maghrib', label 'Maghrib (المغرب)', time timesToday.maghrib, activeKeys ['maghrib'] },
        { id 'ishaa', label 'Ishaa (العشاء)', time timesToday.ishaa, activeKeys ['ishaa'] },
      ]),
    { id 'jumma', label 'Jumma (الجمعة)', time timesToday.jumma, activeKeys ['jumma'] },
  ], [timesToday, soharAsrMergedToday, maghribIshaaMergedToday]);

  const activePrayerKey = useMemo(() = {
    const nowMinutes = now.getHours()  60 + now.getMinutes();
    const sequence = [
      { key 'fajr', time timesToday.fajr },
      { key 'sohar', time timesToday.sohar },
      { key 'asr', time timesToday.asr },
      { key 'maghrib', time timesToday.maghrib },
      { key 'ishaa', time timesToday.ishaa },
    ];
    const active = sequence.find((item) = {
      const mins = isValidTime(item.time)  (Number(item.time.slice(0, 2))  60 + Number(item.time.slice(3)))  null;
      return mins !== null && nowMinutes = mins - 30 && nowMinutes = mins + 60;
    });
    return active.key  null;
  }, [now, timesToday, programConfigToday, programWindow.isActive]);

  const getMinutes = (time) = (isValidTime(time)  Number(time.slice(0, 2))  60 + Number(time.slice(3))  null);
  const formatMinutes = (mins) = `${pad(Math.floor((((mins % 1440) + 1440) % 1440)  60))}${pad((((mins % 1440) + 1440) % 1440) % 60)}`;
  const formatMinutesUntil = (mins) = {
    const safe = Math.max(0, Number(mins)  0);
    const hours = Math.floor(safe  60);
    const minutes = safe % 60;
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  };

  const resolvePrayerWindow = (referenceNow, referenceTimesToday, referenceTimesTomorrow) = {
    const nowMinutes = referenceNow.getHours()  60 + referenceNow.getMinutes();
    const sequence = [
      { key 'fajr', label getDisplayPrayerLabel('fajr', referenceTimesToday), time referenceTimesToday.fajr },
      { key 'sohar', label getDisplayPrayerLabel('sohar', referenceTimesToday), time referenceTimesToday.sohar },
      { key 'asr', label getDisplayPrayerLabel('asr', referenceTimesToday), time referenceTimesToday.asr },
      { key 'maghrib', label getDisplayPrayerLabel('maghrib', referenceTimesToday), time referenceTimesToday.maghrib },
      { key 'ishaa', label getDisplayPrayerLabel('ishaa', referenceTimesToday), time referenceTimesToday.ishaa },
    ];
    const active = sequence.find((item) = {
      const base = getMinutes(item.time);
      if (base === null) return false;
      const start = base - 30;
      const end = base + 60;
      return nowMinutes = start && nowMinutes = end;
    });
    const nextKeyToday = getNextPrayer(referenceNow, referenceTimesToday);
    const nextToday = sequence.find((item) = item.key === nextKeyToday)  sequence[0];
    const todayHasUpcomingPrayer = sequence.some((item) = {
      const mins = getMinutes(item.time);
      return mins !== null && mins = nowMinutes;
    });
    const nextPrayerTime = todayHasUpcomingPrayer  (nextToday.time  '—')  (referenceTimesTomorrow.fajr  '—');
    const nextLabel = todayHasUpcomingPrayer
       `${nextToday.label  '—'} - ${nextPrayerTime}`
       `${getDisplayPrayerLabel('fajr', referenceTimesTomorrow)} - ${nextPrayerTime}`;
    const nextWindowStartMinutes = todayHasUpcomingPrayer
       ((getMinutes(nextPrayerTime)  0) - 30)
       (((getMinutes(nextPrayerTime)  0) - 30) + 1440);
    const minutesUntilNextWindow = Math.max(0, nextWindowStartMinutes - nowMinutes);
    if (active) {
      const base = getMinutes(active.time);
      return {
        isActive true,
        prayerKey active.key,
        prayerLabel active.label,
        prayerTime active.time,
        windowLabel `${formatMinutes(base - 30)} – ${formatMinutes(base + 60)}`,
        nextLabel,
        nextPrayerTime,
        minutesUntilNextWindow,
      };
    }
    return {
      isActive false,
      prayerKey null,
      prayerLabel null,
      prayerTime null,
      windowLabel null,
      nextLabel,
      nextPrayerTime,
      minutesUntilNextWindow,
    };
  };

  const getRuntimePrayerContext = useCallback((overrideConfig, availablePrayerDates = []) = {
    const runtimeNow = applyForcedTestDate(getBerlinNow());
    if (isValidTime(FORCE_TIME)) {
      runtimeNow.setHours(Number(FORCE_TIME.slice(0, 2)), Number(FORCE_TIME.slice(3)), 0, 0);
    }
    const runtimeISO = toISO(runtimeNow);
    const runtimeIsRamadanToday = runtimeISO = RAMADAN_END_ISO;
    const runtimeSelectedISO = runtimeIsRamadanToday  (RAMADAN_RAW[runtimeISO]  runtimeISO  findClosestISO(runtimeISO, availablePrayerDates))  null;
    const runtimeRaw = runtimeSelectedISO  RAMADAN_RAW[runtimeSelectedISO]  null;
    const runtimeBaseTimesToday = buildPrayerTimes(runtimeRaw, runtimeIsRamadanToday);
    const runtimeWithManual = applyManualPrayerAdjustments(runtimeBaseTimesToday, overrideConfig);
    const runtimeTimesToday = applyPrayerTimeOverride(runtimeWithManual, overrideConfig);
    const runtimeTomorrowISO = toISO(addDays(runtimeNow, 1));
    const runtimeIsRamadanTomorrow = runtimeTomorrowISO = RAMADAN_END_ISO;
    const runtimeTomorrowRaw = runtimeIsRamadanTomorrow  (RAMADAN_RAW[runtimeTomorrowISO]  null)  null;
    const runtimeTimesTomorrow = buildPrayerTimes(runtimeTomorrowRaw, runtimeIsRamadanTomorrow);
    const runtimePrayerWindow = resolvePrayerWindow(runtimeNow, runtimeTimesToday, runtimeTimesTomorrow);
    return {
      now runtimeNow,
      iso runtimeISO,
      timesToday runtimeTimesToday,
      timesTomorrow runtimeTimesTomorrow,
      prayerWindow runtimePrayerWindow,
    };
  }, [resolvePrayerWindow]);

  useEffect(() = {
    if (!toast) return;
    const t = setTimeout(() = setToast(''), 1800);
    return () = clearTimeout(t);
  }, [toast]);

  useEffect(() = {
    if (activeTab !== 'terminal') return;
    terminalScrollRef.current.scrollTo.({ y 0, animated false });
    const rafId = requestAnimationFrame(() = {
      terminalScrollRef.current.scrollTo.({ y 0, animated false });
    });
    return () = cancelAnimationFrame(rafId);
  }, [activeTab, terminalMode, attendanceMode]);

  useEffect(() = {
    if (terminalMode !== 'idSelection') {
      setIdSearchQuery('');
      setIsIdSearchFocused(false);
    }
  }, [terminalMode, selectedTanzeem, selectedMajlis]);

  useEffect(() = {
    if (attendanceMode !== 'registration') return;
    const allowed = registrationWindow.canAccess && (normalizedAppMode === 'registration'  true  (registrationWindow.isPublic  Boolean(currentAccount)));
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

  useEffect(() = {
    let cancelled = false;
    setPrayerOverrideReady(false);
    setOverrideLoading(true);
    const applyEditableOverride = (baseOverride, pendingOverride) = {
      const isTomorrowEdit = overrideEditDayOffset === 1;
      const hasPendingForDisplayDate = pendingOverride.dateISO === overrideDisplayDateISO;
      const source = hasPendingForDisplayDate
         pendingOverride
         (isTomorrowEdit  null  baseOverride);
      const normalized = normalizePrayerOverride(source);
      if (cancelled) return;
      setPrayerOverride(baseOverride);
      setPendingPrayerOverride(pendingOverride);
      setOverrideEnabled(normalized.enabled);
      setOverrideSoharAsrTime(normalized.soharAsrTime  '');
      setOverrideMaghribIshaaTime(normalized.maghribIshaaTime  '');
      setManualFajrTime(normalized.manualTimes.fajr  '');
      setManualSoharTime(normalized.manualTimes.sohar  '');
      setManualAsrTime(normalized.manualTimes.asr  '');
      setManualMaghribTime(normalized.manualTimes.maghrib  '');
      setManualIshaaTime(normalized.manualTimes.ishaa  '');
      setPrayerOverrideReady(true);
      setOverrideLoading(false);
    };
    const applyFromData = (globalData, pendingData) = {
      applyEditableOverride(normalizePrayerOverride(globalData), normalizePendingPrayerOverride(pendingData));
    };

    if (!firebaseRuntime  !hasFirebaseConfig()) {
      Promise.all([
        getDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_GLOBAL_DOC_ID, activeMosqueKey),
        getDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_PENDING_DOC_ID, activeMosqueKey),
      ])
        .then(([globalData, pendingData]) = applyFromData(globalData, pendingData))
        .catch(() = {
          if (!cancelled) {
            setPrayerOverrideReady(true);
            setOverrideLoading(false);
            setToast('Override konnte nicht geladen werden');
          }
        });
      return () = {
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

    const sync = () = {
      if (!globalSnapshotReady  !pendingSnapshotReady) return;
      applyFromData(latestGlobal, latestPending);
    };

    const unsubGlobal = firebaseRuntime.onSnapshot(
      globalRef,
      (snapshot) = {
        latestGlobal = snapshot.exists()  snapshot.data()  null;
        globalSnapshotReady = true;
        sync();
      },
      () = {
        if (!cancelled) {
          setPrayerOverrideReady(true);
          setOverrideLoading(false);
          setToast('Override konnte nicht geladen werden');
        }
      },
    );

    const unsubPending = firebaseRuntime.onSnapshot(
      pendingRef,
      (snapshot) = {
        latestPending = snapshot.exists()  snapshot.data()  null;
        pendingSnapshotReady = true;
        sync();
      },
      () = {
        if (!cancelled) {
          setPrayerOverrideReady(true);
          setOverrideLoading(false);
          setToast('Override konnte nicht geladen werden');
        }
      },
    );

    return () = {
      cancelled = true;
      unsubGlobal();
      unsubPending();
    };
  }, [activeExternalScopeDependency, activeMosqueKey, overrideDisplayDateISO]);

  useEffect(() = {
    setOverrideEditDayOffset(0);
    overrideEditDayOffsetRef.current = 0;
    setOverrideMetaTapCount(0);
  }, [activeExternalScopeDependency, activeMosqueKey]);

  useEffect(() = {
    overrideEditDayOffsetRef.current = overrideEditDayOffset;
  }, [overrideEditDayOffset]);

  useEffect(() = {
    if (!pendingPrayerOverride  pendingPrayerOverride.dateISO !== todayISO) return;

    const rolloutPendingOverride = async () = {
      try {
        const currentGlobalOverride = normalizePrayerOverride(await getDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_GLOBAL_DOC_ID, activeMosqueKey));
        await setDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_GLOBAL_DOC_ID, {
          enabled pendingPrayerOverride.enabled  currentGlobalOverride.enabled,
          soharAsrTime pendingPrayerOverride.soharAsrTime  currentGlobalOverride.soharAsrTime  null,
          maghribIshaaTime pendingPrayerOverride.maghribIshaaTime  currentGlobalOverride.maghribIshaaTime  null,
          manualTimes {
            fajr pendingPrayerOverride.manualTimes.fajr  currentGlobalOverride.manualTimes.fajr  null,
            sohar pendingPrayerOverride.manualTimes.sohar  currentGlobalOverride.manualTimes.sohar  null,
            asr pendingPrayerOverride.manualTimes.asr  currentGlobalOverride.manualTimes.asr  null,
            maghrib pendingPrayerOverride.manualTimes.maghrib  currentGlobalOverride.manualTimes.maghrib  null,
            ishaa pendingPrayerOverride.manualTimes.ishaa  currentGlobalOverride.manualTimes.ishaa  null,
          },
          updatedAt new Date().toISOString(),
        }, activeMosqueKey);
        await deleteDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_PENDING_DOC_ID, activeMosqueKey);
      } catch {
        setToast('Morgen-Override konnte nicht übernommen werden');
      }
    };

    rolloutPendingOverride();
  }, [activeExternalScopeDependency, pendingPrayerOverride, todayISO, activeMosqueKey]);

  const onOverrideMetaPress = () = {
    setOverrideMetaTapCount((prev) = {
      const next = prev + 1;
      if (next = 3) {
        const nextOffset = overrideEditDayOffsetRef.current === 0  1  0;
        overrideEditDayOffsetRef.current = nextOffset;
        setOverrideEditDayOffset(nextOffset);
        return 0;
      }
      return next;
    });
  };

  const onOverrideEnabledChange = (value) = {
    setOverrideEnabled(value);
    if (!value) {
      setOverrideSoharAsrTime('');
      setOverrideMaghribIshaaTime('');
    }
  };

  const savePrayerOverride = async () = {
    if (!effectivePermissions.canEditSettings) { setToast('Keine Berechtigung'); return; }
    const cleanSoharAsr = overrideSoharAsrTime.trim();
    const cleanMaghribIshaa = overrideMaghribIshaaTime.trim();
    const targetOverrideDateISO = overrideDisplayDateISO  todayISO  overrideDisplayDateISO  null;

    if (cleanSoharAsr && !isValidTime(cleanSoharAsr)) {
      Alert.alert('Ungültige Zeit', 'Sohar+Asr muss im Format HHMM sein.');
      return;
    }
    if (cleanMaghribIshaa && !isValidTime(cleanMaghribIshaa)) {
      Alert.alert('Ungültige Zeit', 'Maghrib+Ishaa muss im Format HHMM sein.');
      return;
    }

    const payload = {
      enabled overrideEnabled,
      soharAsrTime cleanSoharAsr  null,
      maghribIshaaTime cleanMaghribIshaa  null,
      manualTimes {
        fajr manualFajrTime.trim()  null,
        sohar manualSoharTime.trim()  null,
        asr manualAsrTime.trim()  null,
        maghrib manualMaghribTime.trim()  null,
        ishaa manualIshaaTime.trim()  null,
      },
      updatedAt new Date().toISOString(),
    };

    try {
      setOverrideSaving(true);
      const isFutureEdit = Boolean(targetOverrideDateISO);
      const editableOverride = normalizePrayerOverride(
        isFutureEdit && pendingPrayerOverride.dateISO === targetOverrideDateISO
           pendingPrayerOverride
           prayerOverride,
      );
      const payloadWithMergedManualTimes = {
        ...payload,
        manualTimes {
          fajr payload.manualTimes.fajr  editableOverride.manualTimes.fajr  null,
          sohar payload.manualTimes.sohar  editableOverride.manualTimes.sohar  null,
          asr payload.manualTimes.asr  editableOverride.manualTimes.asr  null,
          maghrib payload.manualTimes.maghrib  editableOverride.manualTimes.maghrib  null,
          ishaa payload.manualTimes.ishaa  editableOverride.manualTimes.ishaa  null,
        },
      };
      if (isFutureEdit) {
        await setDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_PENDING_DOC_ID, {
          ...payloadWithMergedManualTimes,
          dateISO targetOverrideDateISO,
        }, activeMosqueKey);
        setToast('Override für morgen gespeichert ✓');
      } else {
        await setDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_GLOBAL_DOC_ID, payloadWithMergedManualTimes, activeMosqueKey);
        setPrayerOverride(normalizePrayerOverride(payloadWithMergedManualTimes));
        setToast('Override gespeichert ✓');
      }
      setRefreshTick((v) = v + 1);
    } catch {
      Alert.alert('Fehler', 'Override konnte nicht gespeichert werden.');
    } finally {
      setOverrideSaving(false);
    }
  };

  const saveManualPrayerTimes = async () = {
    if (!effectivePermissions.canEditSettings) { setToast('Keine Berechtigung'); return; }
    const targetOverrideDateISO = overrideDisplayDateISO  todayISO  overrideDisplayDateISO  null;
    const manualEntries = {
      fajr manualFajrTime.trim(),
      sohar manualSoharTime.trim(),
      asr manualAsrTime.trim(),
      maghrib manualMaghribTime.trim(),
      ishaa manualIshaaTime.trim(),
    };
    const invalid = Object.entries(manualEntries).find(([, value]) = value && !isValidTime(value));
    if (invalid) {
      Alert.alert('Ungültige Zeit', 'Bitte Zeiten im Format HHMM eingeben.');
      return;
    }
    try {
      setOverrideSaving(true);
      const isFutureEdit = Boolean(targetOverrideDateISO);
      const editableOverride = normalizePrayerOverride(
        isFutureEdit && pendingPrayerOverride.dateISO === targetOverrideDateISO
           pendingPrayerOverride
           prayerOverride,
      );
      const payload = {
        enabled overrideEnabled  editableOverride.enabled,
        soharAsrTime overrideSoharAsrTime.trim()  editableOverride.soharAsrTime  null,
        maghribIshaaTime overrideMaghribIshaaTime.trim()  editableOverride.maghribIshaaTime  null,
        manualTimes {
          fajr manualEntries.fajr  editableOverride.manualTimes.fajr  null,
          sohar manualEntries.sohar  editableOverride.manualTimes.sohar  null,
          asr manualEntries.asr  editableOverride.manualTimes.asr  null,
          maghrib manualEntries.maghrib  editableOverride.manualTimes.maghrib  null,
          ishaa manualEntries.ishaa  editableOverride.manualTimes.ishaa  null,
        },
        updatedAt new Date().toISOString(),
      };
      if (isFutureEdit) {
        await setDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_PENDING_DOC_ID, {
          ...payload,
          dateISO targetOverrideDateISO,
        }, activeMosqueKey);
        setToast('Für morgen gespeichert ✓');
      } else {
        await setDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_GLOBAL_DOC_ID, payload, activeMosqueKey);
        setPrayerOverride(normalizePrayerOverride(payload));
        setToast('Gespeichert ✓');
      }
      setRefreshTick((v) = v + 1);
    } catch {
      Alert.alert('Fehler', 'Zeiten konnten nicht gespeichert werden.');
    } finally {
      setOverrideSaving(false);
    }
  };

  useEffect(() = {
    const subscription = AppState.addEventListener('change', (state) = {
      if (state === 'active') {
        setRefreshTick((v) = v + 1);
      }
    });
    return () = subscription.remove();
  }, []);

  useEffect(() = {
    const nowTs = now.getTime();
    const candidates = [];
    const sequence = [timesToday.fajr, timesToday.sohar, timesToday.asr, timesToday.maghrib, timesToday.ishaa];

    sequence.forEach((time) = {
      const base = getMinutes(time);
      if (base === null) return;
      const startTs = atMinutesOfDay(now, base - 30).getTime();
      const endTs = atMinutesOfDay(now, base + 61).getTime();
      if (startTs  nowTs) candidates.push(startTs);
      if (endTs  nowTs) candidates.push(endTs);
    });

    const midnightTs = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).getTime();
    if (midnightTs  nowTs) candidates.push(midnightTs);

    const nextMinuteTs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 0, 0).getTime();
    if (nextMinuteTs  nowTs) candidates.push(nextMinuteTs);
    if (programConfigToday && isValidTime(programConfigToday.startTime)) {
      const startMins = Number(programConfigToday.startTime.slice(0, 2))  60 + Number(programConfigToday.startTime.slice(3));
      const openTs = atMinutesOfDay(now, startMins - 30).getTime();
      if (openTs  nowTs) candidates.push(openTs);

      if (!programWindow.isActive) {
        const nextMinuteTs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 0, 0).getTime();
        if (nextMinuteTs  nowTs) candidates.push(nextMinuteTs);
      }
    }

    const nextTickTs = candidates.length  Math.min(...candidates)  (nowTs + 60  1000);
    const delay = Math.max(500, nextTickTs - nowTs + 50);
    const timer = setTimeout(() = setRefreshTick((v) = v + 1), delay);

    return () = clearTimeout(timer);
  }, [now, timesToday, programConfigToday, programWindow.isActive]);


  useEffect(() = {
    if (!adminTapCount) return undefined;
    const timer = setTimeout(() = setAdminTapCount(0), 1200);
    return () = clearTimeout(timer);
  }, [adminTapCount]);

  useEffect(() = {
    if (!mosqueSwitchTapCount) return undefined;
    const timer = setTimeout(() = setMosqueSwitchTapCount(0), 1200);
    return () = clearTimeout(timer);
  }, [mosqueSwitchTapCount]);

  useEffect(() = {
    if (!globalThemeTapCount) return undefined;
    const timer = setTimeout(() = setGlobalThemeTapCount(0), 1500);
    return () = clearTimeout(timer);
  }, [globalThemeTapCount]);

  useEffect(() = {
    if (!overrideMetaTapCount) return undefined;
    const timer = setTimeout(() = setOverrideMetaTapCount(0), 1200);
    return () = clearTimeout(timer);
  }, [overrideMetaTapCount]);

  useEffect(() = {
    ensureSuperAdminBootstrap();
  }, [ensureSuperAdminBootstrap]);

  useEffect(() = {
    if (!firebaseRuntime.authApi  !firebaseRuntime.auth) return undefined;
    const unsubscribe = firebaseRuntime.authApi.onAuthStateChanged(firebaseRuntime.auth, async (user) = {
      if (!user) {
        if (localSessionActiveRef.current) return;
        setCurrentAccount(null);
        return;
      }
      localSessionActiveRef.current = false;
      const nameKey = normalizeAccountNameKey(user.displayName  user.email.split('@')[0]  '');
      if (!nameKey) {
        setCurrentAccount(null);
        return;
      }
      try {
        const account = await getGlobalDocData(isGuestMode  ADMIN_EXTERNAL_ACCOUNTS_COLLECTION  ADMIN_ACCOUNTS_COLLECTION, nameKey);
        if (!account.active) {
          await firebaseRuntime.authApi.signOut(firebaseRuntime.auth).catch(() = {});
          setCurrentAccount(null);
          return;
        }
        const nextMosque = resolveAccountMosquePreference(account);
        if (nextMosque) {
          setActiveMosqueKey(String(nextMosque));
        } else if (!accountMatchesActiveMosque(account)) {
          await firebaseRuntime.authApi.signOut(firebaseRuntime.auth).catch(() = {});
          setCurrentAccount(null);
          return;
        }
        setCurrentAccount(account);
        if (isGuestMode && account.isExternalGuest) {
          const activationPayload = {
            accountNameKey account.nameKey  nameKey,
            scopeKey normalizeExternalScopeKey(account.externalMosqueName  account.name  nameKey),
            mosqueName String(account.externalMosqueName  '').trim(),
            multipleMajalis account.externalMultipleMajalis !== false,
            showNames Boolean(account.externalShowNames),
          };
          setGuestActivation(activationPayload);
          await AsyncStorage.setItem(STORAGE_KEYS.guestActivation, JSON.stringify(activationPayload)).catch(() = {});
          await AsyncStorage.setItem(STORAGE_KEYS.guestExternUnlocked, '1').catch(() = {});
          setGuestExternUnlocked(true);
          setActiveMosqueKey(EXTERNAL_MOSQUE_KEY);
        }
      } catch (error) {
        console.error('Auth account load failed', error);
        setCurrentAccount(null);
      }
    });
    return () = unsubscribe();
  }, [accountMatchesActiveMosque, isGuestMode, resolveAccountMosquePreference]);

  useEffect(() = {
    if (activeTab === 'settings' && !effectivePermissions.canEditSettings) {
      setActiveTab('gebetsplan');
    }
  }, [activeTab, effectivePermissions.canEditSettings]);

  useEffect(() = {
    if (isQrExternMode) return;
    if (!isGuestMode) return;
    if (!guestSessionBootstrapDone) return;
    if (!currentAccount && !guestActivation.scopeKey && !guestExternUnlocked) {
      setAdminLoginVisible(true);
    }
  }, [currentAccount, guestActivation.scopeKey, guestExternUnlocked, guestSessionBootstrapDone, isGuestMode, isQrExternMode]);

  useEffect(() = {
    if (normalizedAppMode !== 'registration') return;
    if (!registrationWindow.canAccess  !registrationWindow.loginEnabled) return;
    if (currentAccount) return;
    setAdminLoginVisible(true);
  }, [currentAccount, normalizedAppMode, registrationWindow.canAccess, registrationWindow.loginEnabled]);

  useEffect(() = {
    if (shouldRestrictToPrayerView && activeTab !== 'gebetsplan') {
      setActiveTab('gebetsplan');
    }
  }, [activeTab, shouldRestrictToPrayerView]);

  useEffect(() = {
    if (!shouldRestrictToRegistrationView) return;
    if (activeTab !== 'terminal') setActiveTab('terminal');
    if (attendanceMode !== 'registration') setAttendanceMode('registration');
  }, [activeTab, attendanceMode, shouldRestrictToRegistrationView]);

  useEffect(() = {
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

  useEffect(() = {
    if (!isSecretMode) return;
    setAdminLoginVisible(false);
  }, [isSecretMode]);

  useEffect(() = {
    if (isSuperAdmin) loadAdminAccounts();
  }, [isSuperAdmin, loadAdminAccounts]);


  useEffect(() = {
    if (!currentAccount  isSuperAdmin) return;
    const allowed = getAllowedMosqueKeys(currentAccount);
    if (!allowed.length) return;
    if (!allowed.includes(String(activeMosqueKey))) {
      setActiveMosqueKey(String(allowed[0]));
    }
  }, [activeMosqueKey, currentAccount, getAllowedMosqueKeys, isSuperAdmin]);

  useEffect(() = {
    const loadLocal = async () = {
      try {
        let loadedGuestScopeKey = '';
        if (isGuestMode) {
          const guestUnlockedRaw = await AsyncStorage.getItem(STORAGE_KEYS.guestExternUnlocked);
          const isGuestUnlocked = guestUnlockedRaw === '1';
          setGuestExternUnlocked(isGuestUnlocked);
          const activationRaw = await AsyncStorage.getItem(STORAGE_KEYS.guestActivation);
          if (activationRaw) {
            const parsed = JSON.parse(activationRaw);
            if (parsed.scopeKey) {
              loadedGuestScopeKey = String(parsed.scopeKey);
              setGuestActivation(parsed);
              setExternalMosqueNameInput(String(parsed.mosqueName  ''));
              setActiveMosqueKey(EXTERNAL_MOSQUE_KEY);
            }
          }
        }
        const mosqueRaw = await AsyncStorage.getItem(STORAGE_KEYS.activeMosque);
        const initialMosqueKey = isGuestMode
           (loadedGuestScopeKey  EXTERNAL_MOSQUE_KEY  DEFAULT_MOSQUE_KEY)
           ((mosqueRaw && MOSQUE_OPTIONS.some((item) = item.key === mosqueRaw))  mosqueRaw  DEFAULT_MOSQUE_KEY);
        setActiveMosqueKey(initialMosqueKey);
        const darkRaw = await AsyncStorage.getItem(getDarkModeStorageKey(initialMosqueKey));
        const fallbackDarkRaw = await AsyncStorage.getItem(STORAGE_KEYS.darkMode);
        const resolved = (darkRaw === '1'  darkRaw === '0')
           darkRaw
           ((fallbackDarkRaw === '1'  fallbackDarkRaw === '0')  fallbackDarkRaw  null);
        if (resolved) setIsDarkMode(resolved === '1'); else setIsDarkMode(false);
      } catch (e) {
        console.warn('Failed to load local settings', e);
      } finally {
        setGuestSessionBootstrapDone(true);
      }
    };
    loadLocal();
  }, [isGuestMode]);

  useEffect(() = {
    let cancelled = false;
    const loadMosqueTheme = async () = {
      try {
        const darkRaw = await AsyncStorage.getItem(getDarkModeStorageKey(activeMosqueKey));
        const fallbackDarkRaw = await AsyncStorage.getItem(STORAGE_KEYS.darkMode);
        if (cancelled) return;
        const resolved = (darkRaw === '1'  darkRaw === '0')
           darkRaw
           ((fallbackDarkRaw === '1'  fallbackDarkRaw === '0')  fallbackDarkRaw  null);
        if (resolved) setIsDarkMode(resolved === '1'); else setIsDarkMode(false);
      } catch {}
    };
    loadMosqueTheme();
    return () = { cancelled = true; };
  }, [activeMosqueKey]);

  useEffect(() = {
    let cancelled = false;
    const storageKey = getAnnouncementStorageKey(activeMosqueKey);

    const loadLocalFallback = async () = {
      const mosqueSpecificRaw = await AsyncStorage.getItem(storageKey);
      if (cancelled) return;
      if (mosqueSpecificRaw !== null) {
        setAnnouncementInput(String(mosqueSpecificRaw));
        return;
      }
       Backward compatibility for a previously global announcement key.
      const legacyRaw = await AsyncStorage.getItem(STORAGE_KEYS.announcementText);
      if (cancelled) return;
      setAnnouncementInput(legacyRaw !== null  String(legacyRaw)  '');
    };

    const loadMosqueAnnouncement = async () = {
      try {
        const remote = await getDocData(ANNOUNCEMENT_COLLECTION, ANNOUNCEMENT_DOC_ID);
        const remoteText = normalizeAnnouncementText(remote.text  '');
        if (cancelled) return;
        if (remoteText) {
          setAnnouncementInput(remoteText);
          await AsyncStorage.setItem(storageKey, remoteText).catch(() = {});
          return;
        }
        await loadLocalFallback();
      } catch {
        await loadLocalFallback().catch(() = {
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
        (snapshot) = {
          const remoteText = normalizeAnnouncementText(snapshot.exists()  (snapshot.data().text  '')  '');
          if (cancelled) return;
          setAnnouncementInput(remoteText);
          if (remoteText) AsyncStorage.setItem(storageKey, remoteText).catch(() = {});
          else AsyncStorage.removeItem(storageKey).catch(() = {});
        },
        () = {
          loadMosqueAnnouncement();
        },
      );

      return () = {
        cancelled = true;
        unsubAnnouncement();
      };
    }

    loadMosqueAnnouncement();
    return () = { cancelled = true; };
  }, [activeExternalScopeDependency, activeMosqueKey, firebaseRuntime]);

  const onToggleDarkMode = async (value, applyGlobally = false) = {
    Animated.sequence([
      Animated.timing(themePulseAnim, { toValue 0.96, duration 140, useNativeDriver true }),
      Animated.spring(themePulseAnim, { toValue 1, useNativeDriver true, speed 16, bounciness 8 }),
    ]).start();
    setIsDarkMode(value);
    const entries = [
      [getDarkModeStorageKey(activeMosqueKey), value  '1'  '0'],
      [STORAGE_KEYS.darkMode, value  '1'  '0'],
    ];
    if (applyGlobally) {
      MOSQUE_OPTIONS.forEach((option) = {
        const key = getDarkModeStorageKey(option.key);
        if (!entries.some(([existing]) = existing === key)) {
          entries.push([key, value  '1'  '0']);
        }
      });
    }
    await AsyncStorage.multiSet(entries);
  };

  const handleGlobalThemeToggleTrigger = useCallback(() = {
    setGlobalThemeTapCount((prev) = {
      const next = prev + 1;
      if (next  7) return next;
      onToggleDarkMode(!isDarkMode, true);
      setToast(`Globaler Modus ${!isDarkMode  'Dark'  'Light'}`);
      return 0;
    });
  }, [isDarkMode]);

  const saveAnnouncement = useCallback(async () = {
    try {
      const normalized = normalizeAnnouncementText(announcementInput);
      const storageKey = getAnnouncementStorageKey(activeMosqueKey);
      await setDocData(ANNOUNCEMENT_COLLECTION, ANNOUNCEMENT_DOC_ID, {
        text normalized  '',
        updatedAt new Date().toISOString(),
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

  const clearAnnouncement = useCallback(async () = {
    try {
      await setDocData(ANNOUNCEMENT_COLLECTION, ANNOUNCEMENT_DOC_ID, {
        text '',
        updatedAt new Date().toISOString(),
      });
      await AsyncStorage.removeItem(getAnnouncementStorageKey(activeMosqueKey));
      setAnnouncementInput('');
      setToast('Ankündigung entfernt');
    } catch (error) {
      console.error('Failed to clear announcement', error);
      setToast('Ankündigung konnte nicht entfernt werden');
    }
  }, [activeMosqueKey]);

  const onSelectMosque = async (key) = {
    if (isGuestMode && String(key) !== EXTERNAL_MOSQUE_KEY) return;
    if (currentAccount && !isSuperAdmin) {
      const allowed = getAllowedMosqueKeys(currentAccount);
      if (!allowed.includes(String(key  ''))) return;
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
    setRefreshTick((v) = v + 1);
  };

  const saveMosquePreference = useCallback(async () = {
    if (!currentAccount) return;
    if (!isSuperAdmin) {
      const allowed = getAllowedMosqueKeys(currentAccount);
      if (allowed.length = 1) {
        setToast('Keine speicherbare Auswahl');
        return;
      }
      if (!allowed.includes(String(activeMosqueKey  ''))) {
        setToast('Auswahl nicht erlaubt');
        return;
      }
    }

    const docId = normalizeAccountNameKey(currentAccount.nameKey  currentAccount.name  '');
    if (!docId) return;
    try {
      setMosquePreferenceSaving(true);
      await setGlobalDocData(ADMIN_ACCOUNTS_COLLECTION, docId, {
        ...currentAccount,
        nameKey docId,
        preferredMosqueId String(activeMosqueKey),
        updatedAt new Date().toISOString(),
      });
      setCurrentAccount((prev) = (prev  { ...prev, preferredMosqueId String(activeMosqueKey) }  prev));
      setToast('Moschee-Präferenz gespeichert ✓');
    } catch (error) {
      console.error('saveMosquePreference failed', error);
      setToast('Moschee-Präferenz konnte nicht gespeichert werden');
    } finally {
      setMosquePreferenceSaving(false);
    }
  }, [activeMosqueKey, currentAccount, getAllowedMosqueKeys, isSuperAdmin]);

  const handleMosqueSwitchTrigger = useCallback(() = {
    if (currentAccount) return;
    setMosqueSwitchTapCount((prev) = {
      const next = prev + 1;
      if (next  3) return next;
      const availableOptions = MOSQUE_OPTIONS.filter((option) = isGuestMode  option.key === EXTERNAL_MOSQUE_KEY  option.key !== EXTERNAL_MOSQUE_KEY);
      const currentIndex = availableOptions.findIndex((option) = option.key === activeMosqueKey);
      const nextOption = availableOptions[(currentIndex + 1) % availableOptions.length]  availableOptions[0];
      onSelectMosque(nextOption.key);
      setToast(`Moschee gewechselt ${nextOption.label}`);
      return 0;
    });
  }, [activeMosqueKey, currentAccount, isGuestMode, onSelectMosque]);

  const handleQrExternHeaderPress = useCallback(() = {
    if (!isQrExternMode) {
      handleMosqueSwitchTrigger();
      return;
    }
    setExternScopeHeaderTapCount((prev) = {
      const next = prev + 1;
      if (next = 3) {
        setTimeout(() = { openExternalScopeModal(); }, 0);
        return 0;
      }
      return next;
    });
  }, [handleMosqueSwitchTrigger, isQrExternMode, openExternalScopeModal]);

  useEffect(() = {
    let cancelled = false;

    const applyProgramConfig = (data) = {
      if (cancelled) return;
      setProgramConfigByDate((prev) = {
        const next = { ...prev };
        if (data && typeof data === 'object') {
          const headline = buildHeadlineConfig(data);
          next[todayISO] = {
            name headlineToLegacyName(headline),
            title headline.title,
            subtitle headline.subtitle,
            extraLine headline.extraLine,
            startTime String(data.startTime  '').trim(),
            updatedAt data.updatedAt  null,
          };
        } else {
          delete next[todayISO];
        }
        return next;
      });
    };

    if (!firebaseRuntime  !hasFirebaseConfig()) {
      getDocData(PROGRAM_CONFIG_COLLECTION, todayISO)
        .then((data) = applyProgramConfig(data))
        .catch(() = {
          if (!cancelled) setToast('Programm konnte nicht geladen werden');
        });
      return () = { cancelled = true; };
    }

    const programRef = firebaseRuntime.doc(firebaseRuntime.db, resolveScopedCollection(PROGRAM_CONFIG_COLLECTION), todayISO);
    const unsubscribe = firebaseRuntime.onSnapshot(
      programRef,
      (snapshot) = applyProgramConfig(snapshot.exists()  snapshot.data()  null),
      () = {
        if (!cancelled) setToast('Programm konnte nicht geladen werden');
      },
    );

    return () = {
      cancelled = true;
      unsubscribe();
    };
  }, [activeExternalScopeDependency, todayISO, activeMosqueKey]);

  useEffect(() = {
    const todayConfig = programConfigByDate[todayISO]  null;
    const headline = buildHeadlineConfig(todayConfig);
    setProgramNameInput(headline.title);
    setProgramSubtitleInput(headline.subtitle);
    setProgramExtraLineInput(headline.extraLine);
    setProgramStartInput(todayConfig.startTime  '');
  }, [programConfigByDate, todayISO]);

  useEffect(() = {
    let cancelled = false;
    listDocIds(REGISTRATION_CONFIG_COLLECTION)
      .then((ids) = Promise.all(ids.map(async (id) = {
        const row = await getDocData(REGISTRATION_CONFIG_COLLECTION, id).catch(() = null);
        if (!row) return null;
        return [id, normalizeRegistrationConfig({ ...row, id }, id)];
      })))
      .then((rows) = {
        if (cancelled) return;
        const nextMap = rows.filter(Boolean).reduce((acc, [id, row]) = {
          acc[id] = row;
          return acc;
        }, {});
        setRegistrationConfigById(nextMap);
      })
      .catch(() = {
        if (!cancelled) setRegistrationConfigById({});
      });
    return () = { cancelled = true; };
  }, [activeMosqueKey]);

  useEffect(() = {
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
    setRegistrationNameInput(activeRegistrationConfig.title  activeRegistrationConfig.name  '');
    setRegistrationSubtitleInput(activeRegistrationConfig.subtitle  '');
    setRegistrationExtraLineInput(activeRegistrationConfig.extraLine  '');
    setRegistrationStartDateInput(activeRegistrationConfig.startDate  '');
    setRegistrationEndDateInput(activeRegistrationConfig.endDate  '');
    setRegistrationIsPublicInput(Boolean(activeRegistrationConfig.advanced.isPublic));
    setRegistrationOnlyEhlVotersInput(isGuestMode  false  Boolean(activeRegistrationConfig.advanced.onlyEhlVoters));
    setRegistrationAllowDeclineInput(Boolean(activeRegistrationConfig.advanced.allowDecline));
    setRegistrationLoginEnabledInput(!isGuestMode && Boolean(activeRegistrationConfig.advanced.loginEnabled));
    setRegistrationIncludedTanzeemsInput(activeRegistrationConfig.advanced.includeTanzeems.length
       activeRegistrationConfig.advanced.includeTanzeems
       [...REGISTRATION_TANZEEM_OPTIONS]);
  }, [activeRegistrationConfig, isGuestMode]);

  const saveProgramForToday = async () = {
    if (!effectivePermissions.canEditSettings) { setToast('Keine Berechtigung'); return; }
    const headline = buildHeadlineConfig({
      title programNameInput,
      subtitle programSubtitleInput,
      extraLine programExtraLineInput,
    });
    const name = headlineToLegacyName(headline);
    const startTime = String(programStartInput  '').trim();
    if (!name  !isValidTime(startTime)) {
      setToast('Bitte Programmname und gültige Startzeit eingeben');
      return;
    }
    const next = {
      ...programConfigByDate,
      [todayISO] {
        name,
        title headline.title,
        subtitle headline.subtitle,
        extraLine headline.extraLine,
        startTime,
        updatedAt new Date().toISOString(),
      },
    };
    setProgramConfigByDate(next);
    await setDocData(PROGRAM_CONFIG_COLLECTION, todayISO, {
      name,
      title headline.title,
      subtitle headline.subtitle,
      extraLine headline.extraLine,
      startTime,
      updatedAt new Date().toISOString(),
    });
    setToast('Programm für heute gespeichert');
  };

  const clearProgramForToday = async () = {
    if (!effectivePermissions.canEditSettings) { setToast('Keine Berechtigung'); return; }
    const next = { ...programConfigByDate };
    delete next[todayISO];
    setProgramConfigByDate(next);
    await deleteDocData(PROGRAM_CONFIG_COLLECTION, todayISO);
    setToast('Programm für heute entfernt');
  };

  const saveRegistrationConfig = async () = {
    if (!effectivePermissions.canEditSettings) { setToast('Keine Berechtigung'); return; }
    const headline = buildHeadlineConfig({
      title registrationNameInput,
      subtitle registrationSubtitleInput,
      extraLine registrationExtraLineInput,
    });
    const name = headlineToLegacyName(headline);
    const startDate = normalizeRegistrationShortDate(registrationStartDateInput  '');
    const endDate = normalizeRegistrationShortDate(registrationEndDateInput  '');
    const startDateKey = registrationShortDateToKey(startDate);
    const endDateKey = registrationShortDateToKey(endDate);
    const includeTanzeems = registrationIncludedTanzeemsInput
      .map((entry) = String(entry  '').toLowerCase())
      .filter((entry, index, arr) = REGISTRATION_TANZEEM_OPTIONS.includes(entry) && arr.indexOf(entry) === index);
    if (!name  startDateKey === null  endDateKey === null  startDateKey  endDateKey) {
      setToast('Bitte Name und gültigen Zeitraum eingeben');
      return;
    }
    if (!includeTanzeems.length) {
      setToast('Mindestens eine Tanzeem auswählen');
      return;
    }
    const docId = `${startDate.replace('.', '-')}_${endDate.replace('.', '-')}_${toLocationKey(name)}`;
    const payload = normalizeRegistrationConfig({
      id docId,
      name,
      title headline.title,
      subtitle headline.subtitle,
      extraLine headline.extraLine,
      startDate,
      endDate,
      disabled false,
      updatedAt new Date().toISOString(),
      advanced {
        isPublic registrationIsPublicInput,
        onlyEhlVoters isGuestMode  false  registrationOnlyEhlVotersInput,
        allowDecline registrationAllowDeclineInput,
        loginEnabled isGuestMode  false  registrationLoginEnabledInput,
        includeTanzeems,
      },
    }, docId);
    try {
      setRegistrationConfigById((prev) = ({ ...prev, [docId] payload }));
      await setDocData(REGISTRATION_CONFIG_COLLECTION, docId, payload);
      setToast('Anmeldung gespeichert');
    } catch (error) {
      console.error('saveRegistrationConfig failed', error);
      setToast('Anmeldung konnte nicht gespeichert werden');
    }
  };

  const clearRegistrationConfig = async () = {
    if (!effectivePermissions.canEditSettings) { setToast('Keine Berechtigung'); return; }
    if (!activeRegistrationConfig.id) {
      setToast('Keine Anmeldung vorhanden');
      return;
    }
    const targetId = String(activeRegistrationConfig.id  '');
    setRegistrationConfigById((prev) = {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });
    await deleteDocData(REGISTRATION_CONFIG_COLLECTION, targetId);
    setToast('Anmeldung deaktiviert');
  };

  const prayerWindow = useMemo(() = resolvePrayerWindow(now, timesToday, timesTomorrow), [now, timesToday, timesTomorrow]);
  const qrRuntimeContext = useMemo(() = getRuntimePrayerContext(prayerOverride, availableDates), [availableDates, prayerOverride, qrCountdownSeconds]);
  const qrLiveNow = qrRuntimeContext.now;
  const qrLivePrayerWindow = qrRuntimeContext.prayerWindow;
  const qrLiveTimesToday = qrRuntimeContext.timesToday;
  const qrLiveProgramWindow = useMemo(() = {
    const runtimeISO = qrRuntimeContext.iso;
    const fallbackISO = toISO(qrLiveNow);
    const configByDate = programConfigByDate  {};
    const config = configByDate[runtimeISO]  configByDate[fallbackISO]  null;
    if (!config  !isValidTime(config.startTime)  !String(config.name  '').trim()) {
      return { isConfigured false, isActive false, label null, sourceISO runtimeISO  fallbackISO  '' };
    }
    const startMinutes = Number(config.startTime.slice(0, 2))  60 + Number(config.startTime.slice(3));
    const nowMinutes = qrLiveNow.getHours()  60 + qrLiveNow.getMinutes();
    const sourceISO = configByDate[runtimeISO]  runtimeISO  fallbackISO;
    return {
      isConfigured true,
      isActive nowMinutes = (startMinutes - 30),
      label String(config.name  '').trim(),
      startTime String(config.startTime  ''),
      sourceISO sourceISO  runtimeISO  fallbackISO  '',
    };
  }, [programConfigByDate, qrLiveNow, qrRuntimeContext.iso]);
  const resolveQrPrayerContext = useCallback(() = ({
    ...qrRuntimeContext,
    prayerKey qrRuntimeContext.prayerWindow.prayerKey  null,
    prayerLabel qrRuntimeContext.prayerWindow.prayerLabel  null,
    isActive Boolean(qrRuntimeContext.prayerWindow.isActive),
  }), [qrRuntimeContext]);
  const qrRegisteredGuidance = useMemo(() = {
    if (!qrRegistration.idNumber) return '';
    if (qrAttendanceCategory === 'program') {
      const isAlreadyHandled = Boolean(
        qrLiveProgramWindow.isActive
        && qrLastAttendanceDateISO === qrRuntimeContext.iso
        && qrLastAttendancePrayerKey === 'program'
        && qrLastAttendanceStatus === 'duplicate',
      );
      if (isAlreadyHandled) return 'Sie wurden bereits für das Programm eingetragen.';
      if (!qrLiveProgramWindow.isConfigured) return 'Aktuell ist kein Programm aktiv. Sobald ein Programm geplant ist, erscheint es hier.';
      if (!qrLiveProgramWindow.isActive) return `${qrLiveProgramWindow.label  'Programm'} ist geplant. Start ${qrLiveProgramWindow.startTime  '—'}.`;
      return 'Bitte den QR-Code noch einmal scannen, um sich für das Programm einzutragen.';
    }
    if (qrLastAttendanceStatus === 'registered') {
      return 'Bitte den QR-Code noch einmal scannen, um sich einzutragen.';
    }
    const hintContext = qrLastRuntimeHint && qrLastRuntimeHint.iso === qrLastAttendanceDateISO
       qrLastRuntimeHint
       null;
    const currentContext = hintContext  resolveQrPrayerContext();
    const currentPrayerKey = currentContext.prayerKey  '';
    const currentPrayerLabel = currentContext.prayerLabel  (currentPrayerKey  getDisplayPrayerLabel(currentPrayerKey, currentContext.timesToday)  '');
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
      return currentContext.prayerWindow.nextLabel
         `Gebetsfenster geschlossen. Nächstes Gebet ${currentContext.prayerWindow.nextLabel}.`
         'Gebetsfenster geschlossen.';
    }
    if (currentContext.isActive && currentPrayerLabel) {
      return `Bitte den QR-Code noch einmal scannen, um sich für ${currentPrayerLabel} einzutragen.`;
    }
    if (currentContext.prayerWindow.nextLabel) return `Gebetsfenster geschlossen. Nächstes Gebet ${currentContext.prayerWindow.nextLabel}.`;
    return 'Gebetsfenster geschlossen.';
  }, [qrAttendanceCategory, qrLastAttendanceDateISO, qrLastAttendancePrayerKey, qrLastAttendanceStatus, qrLastRuntimeHint, qrLiveProgramWindow, qrRegistration, qrRuntimeContext.iso, resolveQrPrayerContext]);
  useEffect(() = {
    if (!['counted', 'duplicate'].includes(qrLastAttendanceStatus)) return;
    if (qrAttendanceCategory === 'program') {
      const programDateCandidates = [
        qrRuntimeContext.iso,
        toISO(qrLiveNow),
        qrLiveProgramWindow.sourceISO  '',
      ].filter(Boolean);
      const sameProgramDay = qrLastAttendancePrayerKey === 'program' && programDateCandidates.includes(qrLastAttendanceDateISO);
      if (!sameProgramDay && qrStatusMessage) {
        setQrStatusMessage('');
        setQrStatusTone('neutral');
      }
      return;
    }
    const currentDateISO = toISO(qrLiveNow);
    const currentPrayerKey = qrLivePrayerWindow.prayerKey  '';
    const isSamePrayerWindow = Boolean(
      qrLivePrayerWindow.isActive
      && currentPrayerKey
      && qrLastAttendanceDateISO === currentDateISO
      && qrLastAttendancePrayerKey === currentPrayerKey
    );
    if (!isSamePrayerWindow && qrStatusMessage) {
      setQrStatusMessage('');
      setQrStatusTone('neutral');
    }
  }, [qrAttendanceCategory, qrLastAttendanceDateISO, qrLastAttendancePrayerKey, qrLastAttendanceStatus, qrLiveNow, qrLivePrayerWindow, qrLiveProgramWindow.sourceISO, qrRuntimeContext.iso, qrStatusMessage]);
  const guestAmaratScopeKey = normalizeExternalScopeKey(guestActivation.scopeKey  guestActivation.mosqueName  '');
  const membersDirectory = isGuestMode
     EXTERNAL_MEMBER_DIRECTORY_DATA.filter((entry) = {
      const entryScope = normalizeExternalScopeKey(entry.amarat  '');
      return !entryScope  !guestAmaratScopeKey  entryScope === guestAmaratScopeKey;
    })
     MEMBER_DIRECTORY_DATA;
  const membersLoading = false;
  const showMemberNamesInGrid = isGuestMode  Boolean(guestActivation.showNames)  SHOW_MEMBER_NAMES_IN_ID_GRID;
  const shouldIncludeGuestNameInExports = isGuestMode && Boolean(guestActivation.showNames);
  const guestMajlisFallbackLabel = String(guestActivation.mosqueName  activeMosque.label  '').trim();
  const formatGuestAmaratLabel = useCallback((value) = String(value  '')
    .trim()
    .replace(_g, ' ')
    .replace(s+g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) = part.charAt(0).toUpperCase() + part.slice(1))
    .join(' '), []);
  const resolveExportMajlisLabel = useCallback((majlisValue, amaratValue = '') = {
    const rawMajlis = String(majlisValue  '').trim();
    if (!isGuestMode) return rawMajlis  '—';
    if (rawMajlis && rawMajlis !== '-') return rawMajlis;
    if (guestMajlisFallbackLabel) return guestMajlisFallbackLabel;
    const rawAmarat = String(amaratValue  '').trim();
    if (rawAmarat) return formatGuestAmaratLabel(rawAmarat);
    return rawMajlis  '—';
  }, [formatGuestAmaratLabel, guestMajlisFallbackLabel, isGuestMode]);
  const getLocationLabel = useCallback((majlisValue) = (
    isGuestMode && isMissingMajlisValue(majlisValue)  'Jamaat'  'Majlis'
  ), [isGuestMode]);
  const hasGuestEntriesWithoutMajlis = useMemo(
    () = isGuestMode && membersDirectory.some((entry) = isMissingMajlisValue(entry.majlis)),
    [isGuestMode, membersDirectory],
  );
  const exportMosqueNameForFile = useMemo(() = {
    const rawName = isGuestMode
       String(guestActivation.mosqueName  activeMosque.label  'Local Amarat').trim()
       (activeMosque.key === 'nuur_moschee'  'Nuur_Moschee'  'Bait_Us_Sabuh');
    const token = String(rawName  'Moschee')
      .replace(s+g, '_')
      .replace([^A-Za-z0-9_-]g, '');
    return token  'Moschee';
  }, [activeMosque.key, activeMosque.label, guestActivation.mosqueName, isGuestMode]);
  const memberMetadataById = useMemo(() = membersDirectory.reduce((acc, entry) = {
    const id = String(entry.idNumber  '').trim();
    if (!id  acc[id]) return acc;
    acc[id] = {
      name String(entry.name  '').trim(),
      majlis String(entry.majlis  '').trim(),
      amarat String(entry.amarat  '').trim(),
    };
    return acc;
  }, {}), [membersDirectory]);

  const majlisChoices = useMemo(() = {
    if (isGuestMode && !hasMultipleMajalisInGuest) return ['-'];
    const allowedRegistration = new Set(registrationWindow.includeTanzeems  REGISTRATION_TANZEEM_OPTIONS);
    const available = Array.from(new Set(
      membersDirectory
        .filter((entry) = (attendanceMode === 'registration'  allowedRegistration.has(entry.tanzeem)  true))
        .filter((entry) = entry.tanzeem === selectedTanzeem)
        .map((entry) = String(entry.majlis  '').trim())
        .filter((entry) = entry && entry !== '-'),
    )).sort((a, b) = a.localeCompare(b, 'de'));
    if (isGuestMode) return available;
    const availableSet = new Set(available);
    return TERMINAL_LOCATIONS.filter((majlisName) = availableSet.has(majlisName));
  }, [attendanceMode, hasMultipleMajalisInGuest, isGuestMode, membersDirectory, registrationWindow.includeTanzeems, selectedTanzeem]);

  const memberChoices = useMemo(() = (
    membersDirectory
      .filter((entry) = (attendanceMode === 'registration'  registrationWindow.includeTanzeems.includes(entry.tanzeem)  true))
      .filter((entry) = entry.tanzeem === selectedTanzeem && (isGuestMode && !hasMultipleMajalisInGuest  true  entry.majlis === selectedMajlis))
      .sort((a, b) = {
        const aNum = Number.parseInt(String(a.idNumber), 10);
        const bNum = Number.parseInt(String(b.idNumber), 10);
        if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
        return String(a.idNumber).localeCompare(String(b.idNumber));
      })
  ), [attendanceMode, hasMultipleMajalisInGuest, isGuestMode, membersDirectory, registrationWindow.includeTanzeems, selectedMajlis, selectedTanzeem]);

  const filteredMemberChoices = useMemo(() = {
    if (!idSearchQuery) return [];
    return memberChoices
      .filter((entry) = String(entry.idNumber  '').startsWith(idSearchQuery))
      .sort((a, b) = {
        const aNum = Number.parseInt(String(a.idNumber), 10);
        const bNum = Number.parseInt(String(b.idNumber), 10);
        if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
        return String(a.idNumber).localeCompare(String(b.idNumber));
      });
  }, [memberChoices, idSearchQuery]);

  const visibleMemberChoices = useMemo(() = {
    if (idSearchQuery) return filteredMemberChoices;
    return memberChoices;
  }, [filteredMemberChoices, idSearchQuery, memberChoices]);

  const shouldShowCountedIdHint = Boolean(currentAccount);
  const countedMemberDocPrefixes = useMemo(() = {
    if (!shouldShowCountedIdHint) return [];
    if (!selectedTanzeem  !selectedMajlis) return [];
    const locationKey = toLocationKey(selectedMajlis);

    if (attendanceMode === 'program') {
      if (!programWindow.isActive  !programWindow.label) return [];
      const programKey = toLocationKey(programWindow.label);
      return [`${todayISO}_${programKey}_${selectedTanzeem}_${locationKey}_`];
    }
    if (attendanceMode === 'registration') {
      const configId = String(registrationWindow.config.id  '');
      if (!registrationWindow.isOpen  !configId) return [];
      return [`${configId}_${selectedTanzeem}_${locationKey}_`];
    }

    if (!prayerWindow.isActive  !prayerWindow.prayerKey) return [];
    const currentPrayerKey = String(prayerWindow.prayerKey  '');
    if (!currentPrayerKey) return [];

    const targetPrayerKeys = [];
    if (soharAsrMergedToday && ['sohar', 'asr'].includes(currentPrayerKey)) {
      targetPrayerKeys.push('sohar', 'asr');
    } else if (maghribIshaaMergedToday && ['maghrib', 'ishaa'].includes(currentPrayerKey)) {
      targetPrayerKeys.push('maghrib', 'ishaa');
    } else {
      targetPrayerKeys.push(currentPrayerKey);
    }

    return targetPrayerKeys.map((prayerKey) = `${todayISO}_${prayerKey}_${selectedTanzeem}_${locationKey}_`);
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

  useEffect(() = {
    if (terminalMode !== 'idSelection'  countedMemberDocPrefixes.length === 0) {
      setCountedMemberIdsForSelection(new Set());
      setCountedMemberResponsesForSelection(new Map());
      return undefined;
    }

    let cancelled = false;
    const targetCollection = attendanceMode === 'program'
       PROGRAM_ATTENDANCE_COLLECTION
       (attendanceMode === 'registration'  REGISTRATION_ATTENDANCE_COLLECTION  MEMBER_DIRECTORY_COLLECTION);

    const fetchCountedMemberIds = async () = {
      try {
        const ids = await listDocIds(targetCollection);
        if (cancelled) return;

        const nextSet = new Set();
        const matchedRows = [];
        ids.forEach((docId) = {
          const resolvedDocId = String(docId  '');
          const matchingPrefix = countedMemberDocPrefixes.find((prefix) = resolvedDocId.startsWith(prefix));
          if (!matchingPrefix) return;
          const extractedId = resolvedDocId.slice(matchingPrefix.length).trim();
          if (!extractedId  extractedId === 'guest') return;
          nextSet.add(extractedId);
          matchedRows.push({ docId resolvedDocId, idNumber extractedId });
        });
        setCountedMemberIdsForSelection(nextSet);

        if (attendanceMode !== 'registration') {
          setCountedMemberResponsesForSelection(new Map());
          return;
        }

        const responseRows = await Promise.all(
          matchedRows.map(async ({ docId, idNumber }) = {
            const row = await getDocData(REGISTRATION_ATTENDANCE_COLLECTION, docId).catch(() = null);
            const response = String(row.registrationResponse  '').trim().toLowerCase() === 'decline'  'decline'  'accept';
            return { idNumber, response };
          }),
        );
        if (cancelled) return;
        const responseMap = new Map();
        responseRows.forEach(({ idNumber, response }) = {
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
    return () = {
      cancelled = true;
      clearInterval(timer);
    };
  }, [attendanceMode, countedMemberDocPrefixes, terminalMode]);

  const quickSearchDigits = String(quickIdSearchQuery  '').replace([^0-9]g, '');
  const quickSearchResults = useMemo(() = {
    if (quickSearchDigits.length  4) return [];
    const allowedRegistration = new Set(registrationWindow.includeTanzeems  REGISTRATION_TANZEEM_OPTIONS);
    return membersDirectory
      .filter((entry) = (attendanceMode === 'registration'  allowedRegistration.has(String(entry.tanzeem  ''))  true))
      .filter((entry) = String(entry.idNumber  '').includes(quickSearchDigits))
      .sort((a, b) = {
        const aNum = Number.parseInt(String(a.idNumber  ''), 10);
        const bNum = Number.parseInt(String(b.idNumber  ''), 10);
        if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) return aNum - bNum;
        const byTanzeem = String(a.tanzeem  '').localeCompare(String(b.tanzeem  ''));
        if (byTanzeem !== 0) return byTanzeem;
        return String(a.majlis  '').localeCompare(String(b.majlis  ''));
      });
  }, [attendanceMode, membersDirectory, quickSearchDigits, registrationWindow.includeTanzeems]);

  useEffect(() = {
    if (activeTab !== 'stats') return undefined;

    statsPayloadRef.current = '';
    let cancelled = false;
    const shouldShowInitialLoader = !statsAttendance;
    if (shouldShowInitialLoader) setStatsLoading(true);

    const applyIncomingAttendance = (nextData) = {
      const serialized = JSON.stringify(nextData  null);
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

    if (!firebaseRuntime  !hasFirebaseConfig()) {
      const fetchAttendance = () = {
        getDocData('attendance_daily', todayISO)
          .then((attendance) = applyIncomingAttendance(attendance))
          .catch(() = {
            if (!cancelled) {
              setStatsLoading(false);
              setToast('Datenbankfehler – bitte Internet prüfen');
            }
          });
      };

      fetchAttendance();
      const pollTimer = setInterval(fetchAttendance, 5000);
      return () = {
        cancelled = true;
        clearInterval(pollTimer);
      };
    }

    const attendanceRef = firebaseRuntime.doc(firebaseRuntime.db, resolveScopedCollection('attendance_daily'), todayISO);
    const unsubscribe = firebaseRuntime.onSnapshot(
      attendanceRef,
      (snapshot) = {
        const nextData = snapshot.exists()  snapshot.data()  null;
        applyIncomingAttendance(nextData);
      },
      () = {
        if (!cancelled) {
          setStatsLoading(false);
          setToast('Datenbankfehler – bitte Internet prüfen');
        }
      },
    );

    return () = {
      cancelled = true;
      unsubscribe();
    };
  }, [activeTab, todayISO, activeMosqueKey]);

  useEffect(() = {
    if (activeTab !== 'stats'  statsMode !== 'program') return undefined;
    const selectedDocId = String(selectedProgramStatsOption.docId  '');
    if (!selectedDocId) {
      setProgramStats(null);
      return undefined;
    }

    let cancelled = false;

    const fetchProgramStats = () = {
      Promise.all([
        getDocData(PROGRAM_DAILY_COLLECTION, selectedDocId).catch(() = null),
        getDocData(PROGRAM_DAILY_COLLECTION_LEGACY, selectedDocId).catch(() = null),
      ])
        .then(([primaryData, legacyData]) = {
          const data = primaryData  legacyData  null;
          if (!cancelled) setProgramStats(data  null);
        })
        .catch(() = {
          if (!cancelled) setToast('Datenbankfehler – bitte Internet prüfen');
        });
    };

    fetchProgramStats();
    const timer = setInterval(fetchProgramStats, 5000);
    return () = {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeTab, statsMode, selectedProgramStatsOption, activeMosqueKey]);

  useEffect(() = {
    if (activeTab !== 'stats'  statsMode !== 'program') return undefined;
    const selectedDocId = String(selectedProgramStatsOption.docId  '');
    if (!selectedDocId) {
      setProgramAttendanceEntries([]);
      return undefined;
    }

    let cancelled = false;
    const idPrefix = `${selectedDocId}_`;

    const fetchProgramEntries = () = {
      listDocIds(PROGRAM_ATTENDANCE_COLLECTION)
        .then((ids) = ids.filter((docId) = String(docId  '').startsWith(idPrefix)))
        .then((ids) = Promise.all(ids.map((docId) = getDocData(PROGRAM_ATTENDANCE_COLLECTION, docId))))
        .then((rows) = {
          if (cancelled) return;
          setProgramAttendanceEntries(rows.filter(Boolean));
        })
        .catch(() = {
          if (!cancelled) setToast('Datenbankfehler – bitte Internet prüfen');
        });
    };

    fetchProgramEntries();
    const timer = setInterval(fetchProgramEntries, 5000);
    return () = {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeTab, statsMode, selectedProgramStatsOption, activeMosqueKey]);

  useEffect(() = {
    if (activeTab !== 'stats'  statsMode !== 'program') return;
    let cancelled = false;
    Promise.all([
      listDocIds(PROGRAM_DAILY_COLLECTION).catch(() = []),
      listDocIds(PROGRAM_DAILY_COLLECTION_LEGACY).catch(() = []),
      listDocIds(PROGRAM_ATTENDANCE_COLLECTION).catch(() = []),
    ])
      .then(([primaryIds, legacyIds, entryIds]) = {
        if (cancelled) return;
        const inferredPairs = entryIds
          .map((id) = String(id  ''))
          .filter((id) = ^d{4}-d{2}-d{2}_.test(id))
          .map((id) = {
            if (id.includes('_program_guest_')) return '';
            const memberPattern = ^(d{4}-d{2}-d{2})_(.+)_(ansarkhuddamatfalkinder)_.+_[^_]+$;
            const match = id.match(memberPattern);
            if (!match) return '';
            const iso = String(match[1]  '');
            const programKey = String(match[2]  '');
            if (!iso  !programKey) return '';
            return { docId `${iso}_${programKey}`, entryDocId id };
          })
          .filter(Boolean);
        const inferredDailyDocIds = inferredPairs.map((item) = item.docId);
        const sampleByDocId = inferredPairs.reduce((acc, item) = {
          if (!item.docId  !item.entryDocId) return acc;
          if (!acc[item.docId]) acc[item.docId] = item.entryDocId;
          return acc;
        }, {});
        const mergedIds = Array.from(new Set([
          ...primaryIds.map((id) = String(id  '')),
          ...legacyIds.map((id) = String(id  '')),
          ...inferredDailyDocIds,
        ]));
        setProgramStatsEntrySampleByDocId(sampleByDocId);
        setProgramStatsDocIds(
          mergedIds
            .filter((id) = ^d{4}-d{2}-d{2}_.+.test(id)),
        );
      })
      .catch(() = {
        if (!cancelled) {
          setProgramStatsEntrySampleByDocId({});
          setProgramStatsDocIds([]);
        }
      });
    return () = { cancelled = true; };
  }, [activeTab, statsMode, activeMosqueKey]);

  useEffect(() = {
    if (activeTab !== 'stats'  statsMode !== 'program') return;
    if (!availableProgramStatsOptions.length) {
      setSelectedProgramStatsDocId('');
      return;
    }
    if (selectedProgramStatsDocId && availableProgramStatsOptions.some((item) = item.docId === selectedProgramStatsDocId)) return;
    const todayCandidate = availableProgramStatsOptions.find((item) = item.iso === todayISO);
    if (todayCandidate.docId) {
      setSelectedProgramStatsDocId(todayCandidate.docId);
      return;
    }
    setSelectedProgramStatsDocId(availableProgramStatsOptions[0].docId);
  }, [activeTab, statsMode, availableProgramStatsOptions, selectedProgramStatsDocId, todayISO]);

  useEffect(() = {
    if (activeTab !== 'stats'  statsMode !== 'program') return;
    const sampleEntries = Object.entries(programStatsEntrySampleByDocId  {});
    if (!sampleEntries.length) {
      setProgramStatsNamesByDocId({});
      return;
    }
    let cancelled = false;
    Promise.all(sampleEntries.map(async ([docId, entryDocId]) = {
      const row = await getDocData(PROGRAM_ATTENDANCE_COLLECTION, entryDocId).catch(() = null);
      const name = String(row.programName  '').trim();
      return [docId, name];
    }))
      .then((rows) = {
        if (cancelled) return;
        const nextMap = rows.reduce((acc, [docId, name]) = {
          if (name) acc[docId] = name;
          return acc;
        }, {});
        setProgramStatsNamesByDocId(nextMap);
      })
      .catch(() = {
        if (!cancelled) setProgramStatsNamesByDocId({});
      });
    return () = { cancelled = true; };
  }, [activeTab, statsMode, programStatsEntrySampleByDocId, activeMosqueKey]);

  useEffect(() = {
    if (activeTab !== 'stats'  statsMode !== 'registration') return undefined;
    const selectedConfig = selectedRegistrationStatsOption;
    const configId = String(selectedConfig.id  '');
    if (!configId) {
      setRegistrationStats(null);
      setRegistrationAttendanceEntries([]);
      return undefined;
    }

    let cancelled = false;
    const fetchRegistration = () = {
      Promise.all([
        getDocData(REGISTRATION_DAILY_COLLECTION, configId).catch(() = null),
        listDocIds(REGISTRATION_ATTENDANCE_COLLECTION)
          .then((ids) = ids.filter((id) = String(id  '').startsWith(`${configId}_`)))
          .then((ids) = Promise.all(ids.map((id) = getDocData(REGISTRATION_ATTENDANCE_COLLECTION, id))))
          .catch(() = []),
      ])
        .then(([dailyDoc, entries]) = {
          if (cancelled) return;
          setRegistrationStats(dailyDoc  null);
          setRegistrationAttendanceEntries((entries  []).filter(Boolean));
        })
        .catch(() = {
          if (!cancelled) setToast('Datenbankfehler – bitte Internet prüfen');
        });
    };
    fetchRegistration();
    const timer = setInterval(fetchRegistration, 5000);
    return () = {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeTab, statsMode, selectedRegistrationStatsOption, activeMosqueKey]);

  useEffect(() = {
    if (activeTab !== 'stats'  statsMode !== 'registration') return;
    if (!availableRegistrationStatsOptions.length) {
      setSelectedRegistrationStatsConfigId('');
      setRegistrationMajlisFilter('total');
      return;
    }
    if (selectedRegistrationStatsConfigId && availableRegistrationStatsOptions.some((item) = item.id === selectedRegistrationStatsConfigId)) return;
    setSelectedRegistrationStatsConfigId(availableRegistrationStatsOptions[0].id);
    setRegistrationMajlisFilter('total');
  }, [activeTab, statsMode, availableRegistrationStatsOptions, selectedRegistrationStatsConfigId]);

  useEffect(() = {
    if (statsMode !== 'registration') return;
    const allowed = selectedRegistrationStatsOption.advanced.includeTanzeems  [];
    if (!allowed.length) return;
    if (detailedFlowTanzeem && !allowed.includes(detailedFlowTanzeem)) {
      setDetailedFlowTanzeem('');
      setDetailedFlowMajlis('');
      setDetailedIdSearchQuery('');
    }
  }, [statsMode, selectedRegistrationStatsOption, detailedFlowTanzeem]);

  const statsPrayerKey = prayerWindow.isActive  prayerWindow.prayerKey  nextPrayer;

  const statsWeekIsos = useMemo(() = {
    const selectedWeekStartDate = parseISO(selectedStatsWeekStartISO  '');
    return getWeekIsosMondayToSunday(selectedWeekStartDate  now);
  }, [now, selectedStatsWeekStartISO]);
  const statsPrevWeekIsos = useMemo(() = {
    const selectedWeekStartDate = parseISO(selectedStatsWeekStartISO  '');
    const baseStart = selectedWeekStartDate  startOfWeekMonday(now);
    const start = addDays(baseStart, -7);
    return Array.from({ length 7 }, (_, index) = toISO(addDays(start, index)));
  }, [now, selectedStatsWeekStartISO]);
  const statsRollingWeekIsos = useMemo(() = getLast7Days(now), [now]);

  const currentWeekStartISO = useMemo(() = toISO(startOfWeekMonday(now)), [now]);
  const selectedWeekNumber = useMemo(() = {
    const startDate = parseISO(selectedStatsWeekStartISO  '');
    return startDate  getISOWeekNumber(startDate)  null;
  }, [selectedStatsWeekStartISO]);
  const currentWeekLabel = useMemo(() = {
    if (!selectedWeekNumber) return 'Woche';
    const isCurrentWeek = selectedStatsWeekStartISO === currentWeekStartISO;
    return `KW ${selectedWeekNumber}${isCurrentWeek  ' (aktuell)'  ''}`;
  }, [selectedWeekNumber, selectedStatsWeekStartISO, currentWeekStartISO]);

  useEffect(() = {
    if (activeTab !== 'stats'  statsMode !== 'prayer') return undefined;

    let cancelled = false;
    const targetIsos = Array.from(new Set([...statsPrevWeekIsos, ...statsWeekIsos, ...statsRollingWeekIsos]));

    const fetchWeeklyStats = () = {
      if (!hasLoadedWeeklyRef.current) setWeeklyStatsLoading(true);
      Promise.all(targetIsos.map((iso) = getDocData('attendance_daily', iso).then((data) = [iso, data  null])))
        .then((rows) = {
          if (cancelled) return;
          const next = rows.reduce((acc, [iso, data]) = {
            acc[iso] = data;
            return acc;
          }, {});
          const serialized = JSON.stringify(next);
          if (serialized !== weeklyStatsPayloadRef.current) {
            weeklyStatsPayloadRef.current = serialized;
            setWeeklyAttendanceDocs((prev) = ({ ...prev, ...next }));
          }
          hasLoadedWeeklyRef.current = true;
          setWeeklyStatsLoading(false);
        })
        .catch(() = {
          if (cancelled) return;
          hasLoadedWeeklyRef.current = true;
          setWeeklyStatsLoading(false);
          setToast('Datenbankfehler – bitte Internet prüfen');
        });
    };

    fetchWeeklyStats();
    const timer = setInterval(fetchWeeklyStats, 20000);
    return () = {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeTab, statsMode, statsPrevWeekIsos, statsWeekIsos, statsRollingWeekIsos, activeMosqueKey]);

  useEffect(() = {
    if (activeTab !== 'stats'  statsMode !== 'prayer') return;
    let cancelled = false;
    listDocIds('attendance_daily')
      .then((ids) = {
        if (cancelled) return;
        const normalized = ids
          .filter((id) = ^d{4}-d{2}-d{2}$.test(String(id)))
          .sort()
          .reverse();
        setAvailableStatsDates(normalized);
      })
      .catch(() = {
        if (!cancelled) setToast('Datenbankfehler – bitte Internet prüfen');
      });
    return () = { cancelled = true; };
  }, [activeTab, statsMode, activeMosqueKey]);

  useEffect(() = {
    if (activeTab !== 'stats'  statsMode !== 'prayer') return;
    if (!selectedStatsDateISO  weeklyAttendanceDocs[selectedStatsDateISO] !== undefined) return;
    let cancelled = false;
    getDocData('attendance_daily', selectedStatsDateISO)
      .then((data) = {
        if (cancelled) return;
        setWeeklyAttendanceDocs((prev) = ({ ...prev, [selectedStatsDateISO] data  null }));
      })
      .catch(() = {
        if (!cancelled) setToast('Datenbankfehler – bitte Internet prüfen');
      });
    return () = { cancelled = true; };
  }, [activeTab, statsMode, selectedStatsDateISO, weeklyAttendanceDocs, activeMosqueKey]);

  const selectedDateAttendance = useMemo(() = (selectedStatsDateISO  (weeklyAttendanceDocs[selectedStatsDateISO]  null)  null), [selectedStatsDateISO, weeklyAttendanceDocs]);
  const activeDayAttendance = useMemo(() = {
    if (!selectedStatsDateISO  selectedStatsDateISO === todayISO) return statsAttendance;
    return selectedDateAttendance;
  }, [selectedStatsDateISO, todayISO, statsAttendance, selectedDateAttendance]);

  const todayGraphRows = useMemo(() = getPrayerCountsForStats(activeDayAttendance), [activeDayAttendance]);
  const todayGraphSummary = useMemo(() = {
    if (!todayGraphRows.length) return null;
    const totalValues = todayGraphRows.map((row) = row.total  0);
    const highest = todayGraphRows.reduce((best, row) = ((row.total  0)  (best.total  0)  row  best), todayGraphRows[0]);
    const lowest = todayGraphRows.reduce((worst, row) = ((row.total  0)  (worst.total  0)  row  worst), todayGraphRows[0]);
    const average = totalValues.reduce((sum, value) = sum + value, 0)  Math.max(1, totalValues.length);
    const tanzeemTotals = STATS_TANZEEM_KEYS.reduce((acc, key) = {
      acc[key] = todayGraphRows.reduce((sum, row) = sum + (row.tanzeemTotals.[key]  0), 0);
      return acc;
    }, {});
    const tanzeemGrandTotal = Object.values(tanzeemTotals).reduce((sum, value) = sum + value, 0);
    const tanzeemPercentages = STATS_TANZEEM_KEYS.reduce((acc, key) = {
      acc[key] = tanzeemGrandTotal  0  (tanzeemTotals[key]  tanzeemGrandTotal)  100  0;
      return acc;
    }, {});
    return { highest, lowest, average, tanzeemPercentages };
  }, [todayGraphRows]);

  const weekSeriesRows = useMemo(() = statsWeekIsos.map((iso) = {
    const totals = getDailyTotalsForStats(weeklyAttendanceDocs[iso]);
    const dateObj = parseISO(iso);
    const weekdayShort = dateObj  new Intl.DateTimeFormat('de-DE', { weekday 'short' }).format(dateObj).replace(.$, '')  iso;
    const dayMonth = dateObj  new Intl.DateTimeFormat('de-DE', { day '2-digit', month '2-digit' }).format(dateObj).replace(.$, '')  '';
    return {
      iso,
      label dateObj  `${weekdayShort}, ${dayMonth}`  iso,
      total totals.total,
      tanzeemTotals totals.tanzeemTotals,
    };
  }), [statsWeekIsos, weeklyAttendanceDocs]);

  const previousWeekTotal = useMemo(() = statsPrevWeekIsos.reduce((sum, iso) = {
    const totals = getDailyTotalsForStats(weeklyAttendanceDocs[iso]);
    return sum + totals.total;
  }, 0), [statsPrevWeekIsos, weeklyAttendanceDocs]);

  const weekGraphSummary = useMemo(() = {
    if (!weekSeriesRows.length) return null;
    const highest = weekSeriesRows.reduce((best, row) = (row.total  best.total  row  best), weekSeriesRows[0]);
    const lowest = weekSeriesRows.reduce((worst, row) = (row.total  worst.total  row  worst), weekSeriesRows[0]);
    const weekTotal = weekSeriesRows.reduce((sum, row) = sum + row.total, 0);
    const averagePerDay = weekTotal  Math.max(1, weekSeriesRows.length);
    const previousAvg = previousWeekTotal  7;
    const trendPercent = previousAvg  0  ((averagePerDay - previousAvg)  previousAvg)  100  0;
    return { highest, lowest, averagePerDay, trendPercent };
  }, [weekSeriesRows, previousWeekTotal]);

  const buildUniqueSummary = (attendanceData) = {
    const byPrayer = attendanceData.byPrayer  {};
    const tanzeemSets = {
      ansar new Set(),
      khuddam new Set(),
      atfal new Set(),
    };
    const guestTotal = getUniqueGuestTotalForAttendance(attendanceData);

    Object.values(byPrayer).forEach((prayerNode) = {
      const memberDetails = prayerNode.memberDetails  {};
      STATS_TANZEEM_KEYS.forEach((key) = {
        const majlisMap = memberDetails[key]  {};
        Object.values(majlisMap).forEach((entries) = {
          if (!Array.isArray(entries)) return;
          entries.forEach((entry) = {
            const id = String(entry.idNumber  '').trim();
            if (!id) return;
            tanzeemSets[key].add(id);
          });
        });
      });
    });

    const tanzeemTotals = {
      ansar tanzeemSets.ansar.size,
      khuddam tanzeemSets.khuddam.size,
      atfal tanzeemSets.atfal.size,
    };
    const membersTotal = tanzeemTotals.ansar + tanzeemTotals.khuddam + tanzeemTotals.atfal;
    return {
      tanzeemTotals,
      guestTotal,
      total membersTotal + guestTotal,
    };
  };


  const weekUniqueSummary = useMemo(() = statsWeekIsos.reduce((acc, iso) = {
    const oneDay = buildUniqueSummary(weeklyAttendanceDocs[iso]);
    acc.total += oneDay.total;
    acc.guestTotal += oneDay.guestTotal;
    acc.tanzeemTotals.ansar += oneDay.tanzeemTotals.ansar;
    acc.tanzeemTotals.khuddam += oneDay.tanzeemTotals.khuddam;
    acc.tanzeemTotals.atfal += oneDay.tanzeemTotals.atfal;
    return acc;
  }, {
    total 0,
    guestTotal 0,
    tanzeemTotals { ansar 0, khuddam 0, atfal 0 },
  }), [statsWeekIsos, weeklyAttendanceDocs]);

  const weekTopMajlis = useMemo(() = {
    const map = {};
    statsWeekIsos.forEach((iso) = {
      const byPrayer = weeklyAttendanceDocs[iso].byPrayer  {};
      Object.values(byPrayer).forEach((prayerNode) = {
        const tanzeemMap = prayerNode.tanzeem  {};
        STATS_TANZEEM_KEYS.forEach((key) = {
          const majlis = tanzeemMap[key].majlis  {};
          Object.entries(majlis).forEach(([loc, count]) = {
            map[loc] = (map[loc]  0) + (Number(count)  0);
          });
        });
      });
    });
    return buildMajlisRanking(map);
  }, [statsWeekIsos, weeklyAttendanceDocs]);

  const weekPrayerTotals = useMemo(() = {
    const agg = { fajr 0, sohar 0, asr 0, maghrib 0, ishaa 0 };
    statsWeekIsos.forEach((iso) = {
      const rows = getPrayerCountsForStats(weeklyAttendanceDocs[iso]);
      rows.forEach((row) = {
        agg[row.key] += Number(row.total)  0;
      });
    });
    return [
      { key 'fajr', label 'Fajr (الفجر)', total agg.fajr },
      { key 'sohar', label 'Sohar (الظهر)', total agg.sohar },
      { key 'asr', label 'Asr (العصر)', total agg.asr },
      { key 'maghrib', label 'Maghrib (المغرب)', total agg.maghrib },
      { key 'ishaa', label 'Ishaa (العشاء)', total agg.ishaa },
    ];
  }, [statsWeekIsos, weeklyAttendanceDocs]);

  const formatStatsDateShort = (iso) = {
    const dateObj = parseISO(iso);
    if (!dateObj) return iso;
    const weekday = new Intl.DateTimeFormat('de-DE', { weekday 'short' }).format(dateObj).replace(.$, '');
    const datePart = new Intl.DateTimeFormat('de-DE', { day '2-digit', month '2-digit', year '2-digit' }).format(dateObj);
    return `${weekday}, ${datePart}`;
  };

  const formatIsoWithWeekday = (iso) = {
    const dateObj = parseISO(iso  '');
    if (!dateObj) return iso  '—';
    const weekday = new Intl.DateTimeFormat('de-DE', { weekday 'short' }).format(dateObj).replace(.$, '');
    const datePart = new Intl.DateTimeFormat('de-DE', { day '2-digit', month '2-digit', year 'numeric' }).format(dateObj);
    return `${weekday}, ${datePart}`;
  };

  const selectedStatsDateLabel = useMemo(() = {
    if (!selectedStatsDateISO) return '—';
    const base = formatStatsDateShort(selectedStatsDateISO);
    return selectedStatsDateISO === todayISO  `${base} (heute)`  base;
  }, [selectedStatsDateISO, todayISO]);

  const selectedStatsDateToggleLabel = useMemo(() = {
    if (!selectedStatsDateISO) return '—';
    return formatStatsDateShort(selectedStatsDateISO);
  }, [selectedStatsDateISO]);

  const availableStatsWeeks = useMemo(() = {
    const seen = new Set();
    return availableStatsDates
      .map((iso) = parseISO(iso))
      .filter(Boolean)
      .map((dateObj) = startOfWeekMonday(dateObj))
      .filter((dateObj) = {
        const weekStartISO = toISO(dateObj);
        if (seen.has(weekStartISO)) return false;
        seen.add(weekStartISO);
        return true;
      })
      .sort((a, b) = b - a)
      .map((dateObj) = {
        const start = new Date(dateObj);
        const end = addDays(start, 6);
        const weekStartISO = toISO(start);
        const weekNumber = getISOWeekNumber(start);
        const startFmt = new Intl.DateTimeFormat('de-DE', { day '2-digit', month '2-digit', year 'numeric' }).format(start);
        const endFmt = new Intl.DateTimeFormat('de-DE', { day '2-digit', month '2-digit', year 'numeric' }).format(end);
        const isCurrent = weekStartISO === currentWeekStartISO;
        return {
          weekStartISO,
          weekNumber,
          label `KW ${weekNumber}${isCurrent  ' (aktuell)'  ''} · ${startFmt} – ${endFmt}`,
        };
      });
  }, [availableStatsDates, currentWeekStartISO]);

  const formatRangeFromIsos = (isos, prefix = 'Woche') = {
    const start = parseISO(isos.[0]  '');
    const endDate = parseISO(isos.[isos.length - 1]  '');
    if (!start  !endDate) return prefix;
    const startFmt = new Intl.DateTimeFormat('de-DE', { day '2-digit', month '2-digit', year 'numeric' }).format(start);
    const endFmt = new Intl.DateTimeFormat('de-DE', { day '2-digit', month '2-digit', year 'numeric' }).format(endDate);
    return `${prefix} · ${startFmt} – ${endFmt}`;
  };

  const currentWeekToggleLabel = ` ${currentWeekLabel} `;
  const previousWeekToggleLabel = ' Letzte Woche ';
  const selectedDateToggleLabel = ` ${selectedStatsDateToggleLabel} `;

  const cycleStatsRangeMode = (prev) = {
    const options = ['currentWeek', 'previousWeek', 'selectedDate'];
    const idx = options.indexOf(prev);
    return options[(idx + 1) % options.length];
  };

  const formatRangeLabel = (rangeMode) = {
    if (rangeMode === 'currentWeek') return formatRangeFromIsos(statsWeekIsos, currentWeekLabel);
    if (rangeMode === 'previousWeek') return formatRangeFromIsos(statsRollingWeekIsos, 'Letzte Woche');
    return `Tag · ${selectedStatsDateLabel}`;
  };

  const getRangeToggleLabel = (rangeMode) = {
    if (rangeMode === 'currentWeek') return currentWeekToggleLabel;
    if (rangeMode === 'previousWeek') return previousWeekToggleLabel;
    return selectedDateToggleLabel;
  };

  const getStatsExportDataset = useCallback((rangeMode) = {
    const targetRange = rangeMode === 'selectedDate'  'selectedDate'  (rangeMode === 'previousWeek'  'previousWeek'  'currentWeek');
    const isos = targetRange === 'currentWeek'
       statsWeekIsos
       (targetRange === 'previousWeek'  statsRollingWeekIsos  [selectedStatsDateISO]);
    const resolveAttendanceForIso = (iso) = {
      if (iso === todayISO) return statsAttendance  weeklyAttendanceDocs[iso]  null;
      return weeklyAttendanceDocs[iso]  null;
    };

    const summary = isos.reduce((acc, iso) = {
      const oneDay = buildUniqueSummary(resolveAttendanceForIso(iso));
      acc.total += oneDay.total;
      acc.guestTotal += oneDay.guestTotal;
      acc.tanzeemTotals.ansar += oneDay.tanzeemTotals.ansar;
      acc.tanzeemTotals.khuddam += oneDay.tanzeemTotals.khuddam;
      acc.tanzeemTotals.atfal += oneDay.tanzeemTotals.atfal;
      return acc;
    }, { total 0, guestTotal 0, tanzeemTotals { ansar 0, khuddam 0, atfal 0 } });

    const dayRows = isos.map((iso) = {
      const totals = getDailyTotalsForStats(resolveAttendanceForIso(iso));
      const dateObj = parseISO(iso);
      const weekdayShort = dateObj
         new Intl.DateTimeFormat('de-DE', { weekday 'short' }).format(dateObj).replace(.$, '')
         iso;
      const dateLabel = dateObj
         new Intl.DateTimeFormat('de-DE', { day '2-digit', month '2-digit', year 'numeric' }).format(dateObj)
         iso;
      const normalizedWeekday = weekdayShort
         weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1, 2).toLowerCase()
         '—';
      return {
        tag `${normalizedWeekday}, ${dateLabel}`,
        iso,
        anzahlGebete Number(totals.total)  0,
        ansar Number(totals.tanzeemTotals.ansar)  0,
        khuddam Number(totals.tanzeemTotals.khuddam)  0,
        atfal Number(totals.tanzeemTotals.atfal)  0,
        gaeste Number(totals.guestTotal)  0,
      };
    });

    const prayerAgg = {
      fajr { total 0, ansar 0, khuddam 0, atfal 0, guest 0 },
      sohar { total 0, ansar 0, khuddam 0, atfal 0, guest 0 },
      asr { total 0, ansar 0, khuddam 0, atfal 0, guest 0 },
      maghrib { total 0, ansar 0, khuddam 0, atfal 0, guest 0 },
      ishaa { total 0, ansar 0, khuddam 0, atfal 0, guest 0 },
    };
    isos.forEach((iso) = {
      const rows = getPrayerCountsForStats(resolveAttendanceForIso(iso));
      rows.forEach((row) = {
        if (!prayerAgg[row.key]) return;
        prayerAgg[row.key].total += Number(row.total)  0;
        prayerAgg[row.key].ansar += Number(row.tanzeemTotals.ansar)  0;
        prayerAgg[row.key].khuddam += Number(row.tanzeemTotals.khuddam)  0;
        prayerAgg[row.key].atfal += Number(row.tanzeemTotals.atfal)  0;
        prayerAgg[row.key].guest += Number(row.guest)  0;
      });
    });
    const prayerRows = [
      { gebet 'Fajr', anzahl prayerAgg.fajr.total, ansar prayerAgg.fajr.ansar, khuddam prayerAgg.fajr.khuddam, atfal prayerAgg.fajr.atfal, gaeste prayerAgg.fajr.guest },
      { gebet 'Sohr', anzahl prayerAgg.sohar.total, ansar prayerAgg.sohar.ansar, khuddam prayerAgg.sohar.khuddam, atfal prayerAgg.sohar.atfal, gaeste prayerAgg.sohar.guest },
      { gebet 'Asr', anzahl prayerAgg.asr.total, ansar prayerAgg.asr.ansar, khuddam prayerAgg.asr.khuddam, atfal prayerAgg.asr.atfal, gaeste prayerAgg.asr.guest },
      { gebet 'Maghrib', anzahl prayerAgg.maghrib.total, ansar prayerAgg.maghrib.ansar, khuddam prayerAgg.maghrib.khuddam, atfal prayerAgg.maghrib.atfal, gaeste prayerAgg.maghrib.guest },
      { gebet 'Ishaa', anzahl prayerAgg.ishaa.total, ansar prayerAgg.ishaa.ansar, khuddam prayerAgg.ishaa.khuddam, atfal prayerAgg.ishaa.atfal, gaeste prayerAgg.ishaa.guest },
    ];
    const totalPrayers = prayerRows.reduce((sum, row) = sum + (Number(row.anzahl)  0), 0);

    const topMajlisRows = (() = {
      const map = {};
      isos.forEach((iso) = {
        const byPrayer = resolveAttendanceForIso(iso).byPrayer  {};
        Object.values(byPrayer).forEach((prayerNode) = {
          const tanzeemMap = prayerNode.tanzeem  {};
          STATS_TANZEEM_KEYS.forEach((key) = {
            const majlis = tanzeemMap[key].majlis  {};
            Object.entries(majlis).forEach(([loc, count]) = {
              if (!map[loc]) map[loc] = { total 0, byTanzeem { ansar 0, khuddam 0, atfal 0 } };
              const numericCount = Number(count)  0;
              map[loc].total += numericCount;
              map[loc].byTanzeem[key] += numericCount;
            });
          });
        });
      });
      return Object.entries(map)
        .sort((a, b) = b[1].total - a[1].total)
        .map(([locationKey, value]) = ({
          majlis formatMajlisName(locationKey),
          gebeteDieseWoche Number(value.total)  0,
          davonAnsar Number(value.byTanzeem.ansar)  0,
          davonKhuddam Number(value.byTanzeem.khuddam)  0,
          davonAtfal Number(value.byTanzeem.atfal)  0,
        }));
    })();
    const prayerOrder = STATS_PRAYER_SEQUENCE.reduce((acc, item, index) = {
      acc[item.key] = index;
      return acc;
    }, {});
    const prayerLogRows = [];
    isos.forEach((iso) = {
      const byPrayer = resolveAttendanceForIso(iso).byPrayer  {};
      Object.entries(byPrayer).forEach(([prayerKey, prayerNode]) = {
        const memberDetails = prayerNode.memberDetails  {};
        Object.entries(memberDetails).forEach(([tanzeemKey, majlisMap]) = {
          Object.entries(majlisMap  {}).forEach(([locationKey, memberList]) = {
            const rows = Array.isArray(memberList)  memberList  [];
            rows.forEach((entry, index) = {
              const rawTimestamp = String(entry.timestamp  '');
              const parsedTs = rawTimestamp  new Date(rawTimestamp).getTime()  Number.NaN;
              prayerLogRows.push({
                dateISO String(iso  ''),
                prayerKey String(prayerKey  ''),
                idNumber String(entry.idNumber  ''),
                tanzeem String(entry.tanzeem  tanzeemKey  '').toLowerCase(),
                majlis String(entry.majlis  formatMajlisName(locationKey)),
                timestamp rawTimestamp,
                sortTs Number.isNaN(parsedTs)  null  parsedTs,
                seq index,
              });
            });
          });
        });
      });
    });
    prayerLogRows.sort((a, b) = {
      if (a.sortTs !== null && b.sortTs !== null) return a.sortTs - b.sortTs;
      if (a.dateISO !== b.dateISO) return a.dateISO.localeCompare(b.dateISO);
      const aPrayer = Object.prototype.hasOwnProperty.call(prayerOrder, a.prayerKey)  prayerOrder[a.prayerKey]  Number.MAX_SAFE_INTEGER;
      const bPrayer = Object.prototype.hasOwnProperty.call(prayerOrder, b.prayerKey)  prayerOrder[b.prayerKey]  Number.MAX_SAFE_INTEGER;
      if (aPrayer !== bPrayer) return aPrayer - bPrayer;
      if (a.idNumber !== b.idNumber) return a.idNumber.localeCompare(b.idNumber, 'de-DE', { numeric true, sensitivity 'base' });
      return a.seq - b.seq;
    });

    return {
      rangeMode targetRange,
      isos,
      summary,
      dayRows,
      prayerRows,
      topMajlisRows,
      prayerLogRows,
      totalPrayers,
    };
  }, [selectedStatsDateISO, statsWeekIsos, statsRollingWeekIsos, statsAttendance, todayISO, weeklyAttendanceDocs]);

  const hasStatsExportData = useMemo(() = {
    const current = getStatsExportDataset('currentWeek');
    const previous = getStatsExportDataset('previousWeek');
    const selected = getStatsExportDataset('selectedDate');
    return current.summary.total  0  previous.summary.total  0  selected.summary.total  0;
  }, [getStatsExportDataset]);

  const writeStatsWorkbook = useCallback(async (rangeMode) = {
    const dataset = getStatsExportDataset(rangeMode);
    const startISO = dataset.isos.[0]  'na';
    const endISO = dataset.isos.[dataset.isos.length - 1]  'na';
    const formatIsoForExport = (iso) = {
      const dateObj = parseISO(iso);
      if (!dateObj) return iso;
      const weekday = new Intl.DateTimeFormat('de-DE', { weekday 'short' }).format(dateObj).replace(.$, '');
      const datePart = new Intl.DateTimeFormat('de-DE', { day '2-digit', month '2-digit', year 'numeric' }).format(dateObj);
      return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${datePart}`;
    };
    const startLabel = formatIsoForExport(startISO);
    const endLabel = formatIsoForExport(endISO);
    if (!dataset.dayRows.length  dataset.summary.total = 0) {
      setToast('Keine Daten zum Export verfügbar');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const exportTimestamp = new Intl.DateTimeFormat('de-DE', {
      day '2-digit', month '2-digit', year 'numeric', hour '2-digit', minute '2-digit', second '2-digit',
    }).format(new Date());

    const overviewRows = [
      ['Moschee', activeMosque.label],
      ['Zeitraum', `${startLabel} – ${endLabel}`],
      ['Export Zeitstempel', exportTimestamp],
      [],
      ['Gesamt Gebete der Woche', Number(dataset.totalPrayers)  0],
      ['Gesamt Anwesende der Woche', Number(dataset.summary.total)  0],
      ['Gäste total', Number(dataset.summary.guestTotal)  0],
      ['Ansar total', Number(dataset.summary.tanzeemTotals.ansar)  0],
      ['Khuddam total', Number(dataset.summary.tanzeemTotals.khuddam)  0],
      ['Atfal total', Number(dataset.summary.tanzeemTotals.atfal)  0],
    ];
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewRows);
    overviewSheet['!cols'] = [{ wch 28 }, { wch 36 }];

    const dayRows = [
      ['Tag', 'Anzahl Gebete', 'Ansar', 'Khuddam', 'Atfal', 'Gäste'],
      ...dataset.dayRows.map((row) = [
        row.tag,
        Number(row.anzahlGebete)  0,
        Number(row.ansar)  0,
        Number(row.khuddam)  0,
        Number(row.atfal)  0,
        Number(row.gaeste)  0,
      ]),
    ];
    const daySheet = XLSX.utils.aoa_to_sheet(dayRows);
    daySheet['!cols'] = [{ wch 18 }, { wch 14 }, { wch 12 }, { wch 12 }, { wch 12 }, { wch 12 }];

    const prayerRows = [
      ['Gebet', 'Anzahl', 'Ansar', 'Khuddam', 'Atfal', 'Gäste'],
      ...dataset.prayerRows.map((row) = [
        row.gebet,
        Number(row.anzahl)  0,
        Number(row.ansar)  0,
        Number(row.khuddam)  0,
        Number(row.atfal)  0,
        Number(row.gaeste)  0,
      ]),
    ];
    const prayerSheet = XLSX.utils.aoa_to_sheet(prayerRows);
    prayerSheet['!cols'] = [{ wch 16 }, { wch 12 }, { wch 12 }, { wch 12 }, { wch 12 }, { wch 12 }];
    const locationHeaderLabel = hasGuestEntriesWithoutMajlis  'Jamaat'  'Majlis';

    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Übersicht');
    XLSX.utils.book_append_sheet(workbook, daySheet, 'Gebete nach Tage');
    XLSX.utils.book_append_sheet(workbook, prayerSheet, 'Gebete nach Gebetszeiten');

    if (dataset.topMajlisRows.length) {
      const topRows = [
        [locationHeaderLabel, 'Gebete diese Woche', 'davon Ansar', 'davon Khuddam', 'davon Atfal'],
        ...dataset.topMajlisRows.map((row) = [
          row.majlis,
          Number(row.gebeteDieseWoche)  0,
          Number(row.davonAnsar)  0,
          Number(row.davonKhuddam)  0,
          Number(row.davonAtfal)  0,
        ]),
      ];
      const topSheet = XLSX.utils.aoa_to_sheet(topRows);
      topSheet['!cols'] = [{ wch 30 }, { wch 22 }, { wch 14 }, { wch 16 }, { wch 14 }];
      XLSX.utils.book_append_sheet(workbook, topSheet, `Gebete nach ${locationHeaderLabel}`);
    }
    if (dataset.prayerLogRows.length) {
      const protocolHeader = shouldIncludeGuestNameInExports
         ['Datum', 'Zeitstempel', 'Gebetszeit', 'ID', 'Name', 'Tanzeem', locationHeaderLabel]
         ['Datum', 'Zeitstempel', 'Gebetszeit', 'ID', 'Tanzeem', locationHeaderLabel];
      const protocolRows = [
        protocolHeader,
        ...dataset.prayerLogRows.map((row) = {
          const metadata = memberMetadataById[String(row.idNumber  '').trim()]  {};
          const values = [
            formatIsoWithWeekday(row.dateISO),
            formatGermanDateTime(row.timestamp),
            STATS_PRAYER_SEQUENCE.find((item) = item.key === row.prayerKey).label  row.prayerKey,
            row.idNumber  '—',
          ];
          if (shouldIncludeGuestNameInExports) values.push(metadata.name  '—');
          values.push(
            TANZEEM_LABELS[row.tanzeem]  row.tanzeem  '—',
            resolveExportMajlisLabel(row.majlis, metadata.amarat),
          );
          return values;
        }),
      ];
      const protocolSheet = XLSX.utils.aoa_to_sheet(protocolRows);
      protocolSheet['!cols'] = shouldIncludeGuestNameInExports
         [{ wch 22 }, { wch 24 }, { wch 16 }, { wch 12 }, { wch 24 }, { wch 14 }, { wch 24 }]
         [{ wch 22 }, { wch 24 }, { wch 16 }, { wch 12 }, { wch 14 }, { wch 24 }];
      XLSX.utils.book_append_sheet(workbook, protocolSheet, 'Gebetsprotokoll');
    }

    const boldCellStyle = { font { bold true } };
    ['Übersicht', 'Gebete nach Tage', 'Gebete nach Gebetszeiten', `Gebete nach ${locationHeaderLabel}`, 'Gebetsprotokoll'].forEach((sheetName) = {
      const ws = workbook.Sheets[sheetName];
      if (!ws) return;
      const ref = ws['!ref'];
      if (!ref) return;
      const range = XLSX.utils.decode_range(ref);
      for (let col = range.s.c; col = range.e.c; col += 1) {
        const addr = XLSX.utils.encode_cell({ c col, r 0 });
        if (!ws[addr]) continue;
        ws[addr].s = boldCellStyle;
      }
    });

    const base64 = XLSX.write(workbook, { type 'base64', bookType 'xlsx' });
    const safeStart = startLabel.replace([,s]+g, '_').replace([^a-zA-Z0-9._-äöüÄÖÜß]g, '');
    const safeEnd = endLabel.replace([,s]+g, '_').replace([^a-zA-Z0-9._-äöüÄÖÜß]g, '');
    const fileName = `Stats_${exportMosqueNameForFile}_${safeStart}_${safeEnd}.xlsx`;

    if (Platform.OS === 'web') {
      if (!globalThis.atob) throw new Error('Base64 Dekodierung auf Web nicht verfügbar');
      const binary = globalThis.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i  binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type 'applicationvnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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

    const cacheDir = String(FileSystem.cacheDirectory  '');
    if (!cacheDir) {
      throw new Error('Dateisystem nicht verfügbar (cacheDirectory fehlt)');
    }
    const fileUri = `${cacheDir}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding FileSystem.EncodingType.Base64,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      setToast('Sharing auf diesem Gerät nicht verfügbar');
      return;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType 'applicationvnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle 'Statistik exportieren',
      UTI 'org.openxmlformats.spreadsheetml.sheet',
    });
  }, [activeMosque.label, exportMosqueNameForFile, getStatsExportDataset, hasGuestEntriesWithoutMajlis, memberMetadataById, resolveExportMajlisLabel, shouldIncludeGuestNameInExports]);

  const handleExportStats = useCallback(async (rangeMode) = {
    if (!effectivePermissions.canExportData) { setToast('Keine Berechtigung'); return; }
    if (statsExporting) return;
    setStatsExporting(true);
    try {
      await writeStatsWorkbook(rangeMode);
      setStatsExportModalVisible(false);
    } catch (error) {
      const message = String(error.message  '').trim();
      setToast(message  `Export fehlgeschlagen ${message}`  'Export fehlgeschlagen');
      console.error('Stats export failed', error);
    } finally {
      setStatsExporting(false);
    }
  }, [effectivePermissions.canExportData, statsExporting, writeStatsWorkbook]);

  const writeProgramWorkbook = useCallback(async () = {
    const dateLabel = formatIsoWithWeekday(selectedProgramConfigDateISO  todayISO);
    const activeTanzeems = [...PROGRAM_TANZEEM_OPTIONS];
    const exportTimestamp = new Intl.DateTimeFormat('de-DE', {
      day '2-digit', month '2-digit', year 'numeric', hour '2-digit', minute '2-digit', second '2-digit',
    }).format(new Date());
    const total = Number(programStats.total)  0;
    const tanzeemTotals = {
      ansar Number(programStats.byTanzeem.ansar)  0,
      khuddam Number(programStats.byTanzeem.khuddam)  0,
      atfal Number(programStats.byTanzeem.atfal)  0,
      kinder Number(programStats.byTanzeem.kinder)  0,
      guest Number(programStats.guestTotal)  0,
    };

    const registeredTotals = membersDirectory.reduce((acc, entry) = {
      const tanzeem = String(entry.tanzeem  '').toLowerCase();
      acc.total += 1;
      if (Object.prototype.hasOwnProperty.call(acc, tanzeem)) acc[tanzeem] += 1;
      return acc;
    }, { total 0, ansar 0, khuddam 0, atfal 0, kinder 0 });

    const formatRatioWithPercent = (present, registered) = {
      const safePresent = Number(present)  0;
      const safeRegistered = Number(registered)  0;
      if (safeRegistered = 0) return `${safePresent}${safeRegistered} (0%)`;
      const percentRaw = (safePresent  safeRegistered)  100;
      const percentRounded = Math.round(percentRaw  10)  10;
      const percentLabel = Number.isInteger(percentRounded)
         `${percentRounded}`
         String(percentRounded).replace('.', ',');
      return `${safePresent}${safeRegistered} (${percentLabel}%)`;
    };

    const majlisAttendanceRows = (() = {
      const buildCountsForFilter = (filterKey) = {
        const registeredByMajlis = membersDirectory
          .filter((entry) = (filterKey === 'total'  true  entry.tanzeem === filterKey))
          .reduce((acc, entry) = {
            const majlis = resolveExportMajlisLabel(entry.majlis, entry.amarat);
            if (!majlis) return acc;
            acc[majlis] = (acc[majlis]  0) + 1;
            return acc;
          }, {});

        const presentByMajlis = programAttendanceEntries
          .filter((entry) = String(entry.idNumber  '') !== 'guest')
          .filter((entry) = {
            const tanzeem = String(entry.tanzeem  '').toLowerCase();
            return filterKey === 'total'  true  tanzeem === filterKey;
          })
          .reduce((acc, entry) = {
            const majlis = resolveExportMajlisLabel(entry.majlis, entry.amarat);
            if (!majlis) return acc;
            acc[majlis] = (acc[majlis]  0) + 1;
            return acc;
          }, {});

        return { registeredByMajlis, presentByMajlis };
      };

      const totalCounts = buildCountsForFilter('total');
      const tanzeemCounts = activeTanzeems.reduce((acc, key) = {
        acc[key] = buildCountsForFilter(key);
        return acc;
      }, {});

      const allMajlises = Array.from(new Set([
        ...Object.keys(totalCounts.registeredByMajlis),
        ...Object.keys(totalCounts.presentByMajlis),
        ...Object.values(tanzeemCounts).flatMap((node) = ([
          ...Object.keys(node.registeredByMajlis),
          ...Object.keys(node.presentByMajlis),
        ])),
      ]));

      return allMajlises
        .map((majlis) = {
          const byTanzeem = activeTanzeems.reduce((acc, key) = {
            const one = tanzeemCounts[key]  { presentByMajlis {}, registeredByMajlis {} };
            acc[key] = {
              present Number(one.presentByMajlis[majlis])  0,
              registered Number(one.registeredByMajlis[majlis])  0,
            };
            return acc;
          }, {});
          return {
            majlis,
            totalPresent Number(totalCounts.presentByMajlis[majlis])  0,
            totalRegistered Number(totalCounts.registeredByMajlis[majlis])  0,
            byTanzeem,
          };
        })
        .sort((a, b) = (b.totalPresent - a.totalPresent)  a.majlis.localeCompare(b.majlis));
    })();

    if (total = 0 && majlisAttendanceRows.length === 0) {
      setToast('Keine Programmdaten zum Export verfügbar');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const overviewRows = [
      ['Moschee', activeMosque.label],
      ['Datum', dateLabel],
      ['Programm', String(selectedProgramStatsOption.programName  selectedProgramConfig.name  '').trim()  '—'],
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
    overviewSheet['!cols'] = [{ wch 28 }, { wch 36 }];
    const locationHeaderLabel = hasGuestEntriesWithoutMajlis  'Jamaat'  'Majlis';

    const majlisAttendanceSheetRows = [
      [locationHeaderLabel, 'Gesamt', ...activeTanzeems.map((key) = TANZEEM_LABELS[key]  key)],
      ...majlisAttendanceRows.map((row) = [
        row.majlis,
        formatRatioWithPercent(row.totalPresent, row.totalRegistered),
        ...activeTanzeems.map((key) = formatRatioWithPercent(row.byTanzeem.[key].present, row.byTanzeem.[key].registered)),
      ]),
    ];
    const majlisAttendanceSheet = XLSX.utils.aoa_to_sheet(majlisAttendanceSheetRows);
    majlisAttendanceSheet['!cols'] = [{ wch 28 }, ...Array.from({ length 1 + activeTanzeems.length }, () = ({ wch 24 }))];

    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Übersicht');
    XLSX.utils.book_append_sheet(workbook, majlisAttendanceSheet, `${locationHeaderLabel} Anwesenheit`);

    const boldCellStyle = { font { bold true } };
    ['Übersicht', `${locationHeaderLabel} Anwesenheit`].forEach((sheetName) = {
      const ws = workbook.Sheets[sheetName];
      if (!ws  !ws['!ref']) return;
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let col = range.s.c; col = range.e.c; col += 1) {
        const addr = XLSX.utils.encode_cell({ c col, r 0 });
        if (ws[addr]) ws[addr].s = boldCellStyle;
      }
    });

    const base64 = XLSX.write(workbook, { type 'base64', bookType 'xlsx' });
    const safeDate = dateLabel.replace([,s]+g, '_').replace([^a-zA-Z0-9._-äöüÄÖÜß]g, '');
    const fileName = `Programm_Stats_${exportMosqueNameForFile}_${safeDate}.xlsx`;

    if (Platform.OS === 'web') {
      if (!globalThis.atob) throw new Error('Base64 Dekodierung auf Web nicht verfügbar');
      const binary = globalThis.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i  binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type 'applicationvnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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

    const cacheDir = String(FileSystem.cacheDirectory  '');
    if (!cacheDir) throw new Error('Dateisystem nicht verfügbar (cacheDirectory fehlt)');
    const fileUri = `${cacheDir}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding FileSystem.EncodingType.Base64 });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      setToast('Sharing auf diesem Gerät nicht verfügbar');
      return;
    }
    await Sharing.shareAsync(fileUri, {
      mimeType 'applicationvnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle 'Programmdaten exportieren',
      UTI 'org.openxmlformats.spreadsheetml.sheet',
    });
  }, [activeMosque.key, activeMosque.label, exportMosqueNameForFile, hasGuestEntriesWithoutMajlis, membersDirectory, programAttendanceEntries, programStats, resolveExportMajlisLabel, selectedProgramConfig, selectedProgramConfigDateISO, selectedProgramStatsOption, todayISO]);

  const handleExportProgram = useCallback(async () = {
    if (!effectivePermissions.canExportData) { setToast('Keine Berechtigung'); return; }
    if (programExporting) return;
    setProgramExporting(true);
    try {
      await writeProgramWorkbook();
    } catch (error) {
      const message = String(error.message  '').trim();
      setToast(message  `Export fehlgeschlagen ${message}`  'Export fehlgeschlagen');
      console.error('Program export failed', error);
    } finally {
      setProgramExporting(false);
    }
  }, [effectivePermissions.canExportData, programExporting, writeProgramWorkbook]);

  const writeRegistrationWorkbook = useCallback(async () = {
    const option = selectedRegistrationStatsOption;
    if (!option.id) { setToast('Keine Anmeldungsdaten zum Export verfügbar'); return; }
    const activeTanzeems = option.advanced.includeTanzeems  [];
    const onlyEhlVoters = !isGuestMode && Boolean(option.advanced.onlyEhlVoters);

    const registeredTotals = membersDirectory
      .filter((entry) = shouldIncludeMemberInRegistrationBase(entry, activeTanzeems, 'total', onlyEhlVoters))
      .reduce((acc, entry) = {
        const tanzeem = String(entry.tanzeem  '').toLowerCase();
        acc.total += 1;
        if (Object.prototype.hasOwnProperty.call(acc, tanzeem)) acc[tanzeem] += 1;
        return acc;
      }, { total 0, ansar 0, khuddam 0, atfal 0, kinder 0 });

    const formatRatioWithPercent = (present, registered) = {
      const safePresent = Number(present)  0;
      const safeRegistered = Number(registered)  0;
      if (safeRegistered = 0) return `${safePresent}${safeRegistered} (0%)`;
      const percentRaw = (safePresent  safeRegistered)  100;
      const percentRounded = Math.round(percentRaw  10)  10;
      const percentLabel = Number.isInteger(percentRounded)
         `${percentRounded}`
         String(percentRounded).replace('.', ',');
      return `${safePresent}${safeRegistered} (${percentLabel}%)`;
    };

    const majlisAttendanceRows = (() = {
      const buildCountsForFilter = (filterKey) = {
        const registeredByMajlis = membersDirectory
          .filter((entry) = shouldIncludeMemberInRegistrationBase(entry, activeTanzeems, filterKey, onlyEhlVoters))
          .reduce((acc, entry) = {
            const majlis = resolveExportMajlisLabel(entry.majlis, entry.amarat);
            if (!majlis) return acc;
            acc[majlis] = (acc[majlis]  0) + 1;
            return acc;
          }, {});

        const presentByMajlis = registrationAttendanceEntries
          .filter((entry) = {
            const responseType = String(entry.registrationResponse  '').toLowerCase();
            if (responseType === 'decline') return false;
            const tanzeem = String(entry.tanzeem  '').toLowerCase();
            if (!activeTanzeems.includes(tanzeem)) return false;
            return filterKey === 'total'  true  tanzeem === filterKey;
          })
          .reduce((acc, entry) = {
            const majlis = resolveExportMajlisLabel(entry.majlis, entry.amarat);
            if (!majlis) return acc;
            acc[majlis] = (acc[majlis]  0) + 1;
            return acc;
          }, {});

        return { registeredByMajlis, presentByMajlis };
      };

      const totalCounts = buildCountsForFilter('total');
      const tanzeemCounts = activeTanzeems.reduce((acc, key) = {
        acc[key] = buildCountsForFilter(key);
        return acc;
      }, {});

      const allMajlises = Array.from(new Set([
        ...Object.keys(totalCounts.registeredByMajlis),
        ...Object.keys(totalCounts.presentByMajlis),
        ...Object.values(tanzeemCounts).flatMap((node) = ([
          ...Object.keys(node.registeredByMajlis),
          ...Object.keys(node.presentByMajlis),
        ])),
      ]));

      return allMajlises
        .map((majlis) = {
          const byTanzeem = activeTanzeems.reduce((acc, key) = {
            const one = tanzeemCounts[key]  { presentByMajlis {}, registeredByMajlis {} };
            acc[key] = {
              present Number(one.presentByMajlis[majlis])  0,
              registered Number(one.registeredByMajlis[majlis])  0,
            };
            return acc;
          }, {});
          return {
            majlis,
            totalPresent Number(totalCounts.presentByMajlis[majlis])  0,
            totalRegistered Number(totalCounts.registeredByMajlis[majlis])  0,
            byTanzeem,
          };
        })
        .sort((a, b) = (b.totalPresent - a.totalPresent)  a.majlis.localeCompare(b.majlis));
    })();

    if ((Number(registrationStats.total)  0) = 0 && majlisAttendanceRows.length === 0) {
      setToast('Keine Anmeldungsdaten zum Export verfügbar');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const totalAcceptCount = Number(registrationStats.total)  0;
    const totalDeclineCount = Number(registrationStats.declineTotal)  0;
    const tanzeemOverviewRows = activeTanzeems.map((key) = (
      [TANZEEM_LABELS[key]  key, formatRatioWithPercent(Number(registrationStats.byTanzeem.[key])  0, registeredTotals[key])]
    ));
    const overviewRows = [
      ['Moschee', activeMosque.label],
      ['Anmeldung', option.name  '—'],
      ['Zeitraum der Anmeldung', `${option.startDate} bis ${option.endDate}`],
      ['Zusagen', formatRatioWithPercent(totalAcceptCount, registeredTotals.total)],
      ['Absagen', totalDeclineCount],
      ['Gesamtanmeldungen (Absagen + Zusagen)', totalAcceptCount + totalDeclineCount],
      ...tanzeemOverviewRows,
    ];
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewRows);
    overviewSheet['!cols'] = [{ wch 24 }, { wch 36 }];
    const locationHeaderLabel = hasGuestEntriesWithoutMajlis  'Jamaat'  'Majlis';

    const majlisAttendanceSheetRows = [
      [locationHeaderLabel, 'Gesamt', ...activeTanzeems.map((key) = TANZEEM_LABELS[key]  key)],
      ...majlisAttendanceRows.map((row) = [
        row.majlis,
        formatRatioWithPercent(row.totalPresent, row.totalRegistered),
        ...activeTanzeems.map((key) = formatRatioWithPercent(row.byTanzeem.[key].present, row.byTanzeem.[key].registered)),
      ]),
    ];
    const majlisAttendanceSheet = XLSX.utils.aoa_to_sheet(majlisAttendanceSheetRows);
    majlisAttendanceSheet['!cols'] = [{ wch 28 }, ...Array.from({ length 1 + activeTanzeems.length }, () = ({ wch 24 }))];

    const majlisDeclineRows = registrationAttendanceEntries
      .filter((entry) = String(entry.registrationResponse  '').toLowerCase() === 'decline')
      .filter((entry) = {
        const tanzeem = String(entry.tanzeem  '').toLowerCase();
        return activeTanzeems.includes(tanzeem);
      })
      .reduce((acc, entry) = {
        const majlis = resolveExportMajlisLabel(entry.majlis, entry.amarat);
        if (!majlis) return acc;
        acc[majlis] = (acc[majlis]  0) + 1;
        return acc;
      }, {});
    const majlisDeclineSheetRows = [
      [locationHeaderLabel, 'Absagen'],
      ...Object.entries(majlisDeclineRows)
        .map(([majlis, count]) = [majlis, Number(count)  0])
        .sort((a, b) = (b[1] - a[1])  String(a[0]).localeCompare(String(b[0]))),
    ];

    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Übersicht');
    XLSX.utils.book_append_sheet(workbook, majlisAttendanceSheet, `${locationHeaderLabel} Zusagen`);
    if (majlisDeclineSheetRows.length  1) {
      const majlisDeclineSheet = XLSX.utils.aoa_to_sheet(majlisDeclineSheetRows);
      majlisDeclineSheet['!cols'] = [{ wch 28 }, { wch 14 }];
      XLSX.utils.book_append_sheet(workbook, majlisDeclineSheet, `${locationHeaderLabel} Absagen`);
    }

    const base64 = XLSX.write(workbook, { type 'base64', bookType 'xlsx' });
    const fileName = `Anmeldung_Stats_${toLocationKey(option.name  'anmeldung')}_${option.startDate}_${option.endDate}.xlsx`;
    if (Platform.OS === 'web') {
      const binary = globalThis.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i  binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type 'applicationvnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
    const fileUri = `${String(FileSystem.cacheDirectory  '')}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding FileSystem.EncodingType.Base64 });
    await Sharing.shareAsync(fileUri, {
      mimeType 'applicationvnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle 'Anmeldungsdaten exportieren',
      UTI 'org.openxmlformats.spreadsheetml.sheet',
    });
  }, [activeMosque.label, hasGuestEntriesWithoutMajlis, isGuestMode, membersDirectory, registrationAttendanceEntries, registrationStats, resolveExportMajlisLabel, selectedRegistrationStatsOption]);

  const handleExportRegistration = useCallback(async () = {
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

  const writeProgramDetailedIdWorkbook = useCallback(async (filterTanzeem = '') = {
    const dateLabel = formatIsoWithWeekday(selectedProgramConfigDateISO  todayISO);
    const exportTimestamp = new Intl.DateTimeFormat('de-DE', {
      day '2-digit', month '2-digit', year 'numeric', hour '2-digit', minute '2-digit', second '2-digit',
    }).format(new Date());
    const activeProgramName = String(selectedProgramStatsOption.programName  selectedProgramConfig.name  '').trim();
    const normalizedFilter = PROGRAM_TANZEEM_OPTIONS.includes(String(filterTanzeem  '').toLowerCase())
       String(filterTanzeem  '').toLowerCase()
       '';

    const tanzeemOrder = normalizedFilter  [normalizedFilter]  PROGRAM_TANZEEM_OPTIONS;
    const majlisOrderMap = PROGRAM_EXPORT_MAJLIS_ORDER.reduce((acc, name, index) = {
      acc[String(name  '').trim().toLowerCase()] = index;
      return acc;
    }, {});
    const presentMap = new Set(
      programAttendanceEntries
        .filter((entry) = String(entry.idNumber  '') !== 'guest')
        .map((entry) = {
          const resolvedMajlis = resolveExportMajlisLabel(entry.majlis, entry.amarat);
          return [
            String(entry.idNumber  ''),
            String(entry.tanzeem  '').toLowerCase(),
            String(resolvedMajlis  '').trim(),
          ].join('');
        }),
    );
    const attendanceTimestampByKey = programAttendanceEntries
      .filter((entry) = String(entry.idNumber  '') !== 'guest')
      .reduce((acc, entry) = {
        const resolvedMajlis = resolveExportMajlisLabel(entry.majlis, entry.amarat);
        const key = [
          String(entry.idNumber  ''),
          String(entry.tanzeem  '').toLowerCase(),
          String(resolvedMajlis  '').trim(),
        ].join('');
        const timestamp = String(entry.timestamp  '');
        const existing = String(acc[key]  '');
        if (!existing) acc[key] = timestamp;
        else if (timestamp && new Date(timestamp).getTime()  new Date(existing).getTime()) acc[key] = timestamp;
        return acc;
      }, {});

    const memberRows = membersDirectory
      .filter((entry) = (normalizedFilter  entry.tanzeem === normalizedFilter  true))
      .map((entry) = ({
        name String(entry.name  '').trim(),
        idNumber String(entry.idNumber  '').trim(),
        tanzeem String(entry.tanzeem  '').toLowerCase(),
        majlis resolveExportMajlisLabel(entry.majlis, entry.amarat),
      }))
      .sort((a, b) = {
        const tA = tanzeemOrder.indexOf(a.tanzeem);
        const tB = tanzeemOrder.indexOf(b.tanzeem);
        if (tA !== tB) return tA - tB;
        const mA = Object.prototype.hasOwnProperty.call(majlisOrderMap, a.majlis.toLowerCase())  majlisOrderMap[a.majlis.toLowerCase()]  Number.MAX_SAFE_INTEGER;
        const mB = Object.prototype.hasOwnProperty.call(majlisOrderMap, b.majlis.toLowerCase())  majlisOrderMap[b.majlis.toLowerCase()]  Number.MAX_SAFE_INTEGER;
        if (mA !== mB) return mA - mB;
        return a.idNumber.localeCompare(b.idNumber, 'de-DE', { numeric true, sensitivity 'base' });
      })
      .map((row) = {
        const key = [row.idNumber, row.tanzeem, row.majlis].join('');
        return {
          majlis row.majlis,
          tanzeemLabel TANZEEM_LABELS[row.tanzeem]  row.tanzeem,
          name row.name,
          idNumber row.idNumber,
          present presentMap.has(key)  'Ja'  'Nein',
          timestamp presentMap.has(key)  formatGermanDateTime(attendanceTimestampByKey[key])  '—',
        };
      });

    if (!memberRows.length) {
      setToast('Keine Mitgliedsdaten zum Export verfügbar');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const locationHeaderLabel = hasGuestEntriesWithoutMajlis  'Jamaat'  'Majlis';
    const idTableHeader = shouldIncludeGuestNameInExports
       [locationHeaderLabel, 'Tanzeem', 'ID-Nummer', 'Name', 'Anwesend', 'Zeitstempel']
       [locationHeaderLabel, 'Tanzeem', 'ID-Nummer', 'Anwesend', 'Zeitstempel'];
    const rows = [
      ['Moschee', activeMosque.label],
      ['Datum', dateLabel],
      ['Programm', activeProgramName  '—'],
      ['Filter Tanzeem', normalizedFilter  (TANZEEM_LABELS[normalizedFilter]  normalizedFilter)  'Alle'],
      ['Export Zeitstempel', exportTimestamp],
      [],
      idTableHeader,
      ...memberRows.map((row) = (
        shouldIncludeGuestNameInExports
           [row.majlis, row.tanzeemLabel, row.idNumber, row.name  '—', row.present, row.timestamp]
           [row.majlis, row.tanzeemLabel, row.idNumber, row.present, row.timestamp]
      )),
    ];

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = shouldIncludeGuestNameInExports
       [{ wch 28 }, { wch 14 }, { wch 14 }, { wch 24 }, { wch 12 }, { wch 24 }]
       [{ wch 28 }, { wch 14 }, { wch 14 }, { wch 12 }, { wch 24 }];
    XLSX.utils.book_append_sheet(workbook, sheet, 'Übersicht');

    const boldCellStyle = { font { bold true } };
    if (sheet.A1) sheet.A1.s = boldCellStyle;
    if (sheet.B1) sheet.B1.s = boldCellStyle;
    if (sheet.A7) sheet.A7.s = boldCellStyle;
    if (sheet.B7) sheet.B7.s = boldCellStyle;
    if (sheet.C7) sheet.C7.s = boldCellStyle;
    if (sheet.D7) sheet.D7.s = boldCellStyle;
    if (sheet.E7) sheet.E7.s = boldCellStyle;
    if (shouldIncludeGuestNameInExports && sheet.F7) sheet.F7.s = boldCellStyle;

    const base64 = XLSX.write(workbook, { type 'base64', bookType 'xlsx' });
    const safeDate = dateLabel.replace([,s]+g, '_').replace([^a-zA-Z0-9._-äöüÄÖÜß]g, '');
    const tanzeemFile = normalizedFilter  `_${normalizedFilter}`  '_alle';
    const fileName = `Programm_ID_Uebersicht_${exportMosqueNameForFile}${tanzeemFile}_${safeDate}.xlsx`;

    if (Platform.OS === 'web') {
      if (!globalThis.atob) throw new Error('Base64 Dekodierung auf Web nicht verfügbar');
      const binary = globalThis.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i  binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type 'applicationvnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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

    const cacheDir = String(FileSystem.cacheDirectory  '');
    if (!cacheDir) throw new Error('Dateisystem nicht verfügbar (cacheDirectory fehlt)');
    const fileUri = `${cacheDir}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding FileSystem.EncodingType.Base64 });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      setToast('Sharing auf diesem Gerät nicht verfügbar');
      return;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType 'applicationvnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle 'Programm-ID-Übersicht exportieren',
      UTI 'org.openxmlformats.spreadsheetml.sheet',
    });
  }, [activeMosque.key, activeMosque.label, exportMosqueNameForFile, hasGuestEntriesWithoutMajlis, membersDirectory, programAttendanceEntries, resolveExportMajlisLabel, selectedProgramConfig, selectedProgramConfigDateISO, selectedProgramStatsOption, shouldIncludeGuestNameInExports, todayISO]);

  const handleExportProgramDetailedIds = useCallback(async () = {
    if (!effectivePermissions.canExportData) { setToast('Keine Berechtigung'); return; }
    if (detailedProgramExporting) return;
    setDetailedProgramExporting(true);
    try {
      await writeProgramDetailedIdWorkbook(detailedFlowTanzeem);
    } catch (error) {
      const message = String(error.message  '').trim();
      setToast(message  `Export fehlgeschlagen ${message}`  'Export fehlgeschlagen');
      console.error('Program detailed export failed', error);
    } finally {
      setDetailedProgramExporting(false);
    }
  }, [detailedFlowTanzeem, detailedProgramExporting, effectivePermissions.canExportData, writeProgramDetailedIdWorkbook]);

  const writeRegistrationDetailedIdWorkbook = useCallback(async (filterTanzeem = '') = {
    const option = selectedRegistrationStatsOption;
    if (!option.id) { setToast('Keine Anmeldung ausgewählt'); return; }
    const exportTimestamp = new Intl.DateTimeFormat('de-DE', {
      day '2-digit', month '2-digit', year 'numeric', hour '2-digit', minute '2-digit', second '2-digit',
    }).format(new Date());
    const allowedTanzeems = option.advanced.includeTanzeems  [];
    const onlyEhlVoters = !isGuestMode && Boolean(option.advanced.onlyEhlVoters);
    const normalizedFilter = allowedTanzeems.includes(String(filterTanzeem  '').toLowerCase())
       String(filterTanzeem  '').toLowerCase()
       '';
    const tanzeemOrder = normalizedFilter  [normalizedFilter]  allowedTanzeems;
    const majlisOrderMap = PROGRAM_EXPORT_MAJLIS_ORDER.reduce((acc, name, index) = {
      acc[String(name  '').trim().toLowerCase()] = index;
      return acc;
    }, {});
    const attendanceResponseByKey = registrationAttendanceEntries
      .reduce((acc, entry) = {
        const resolvedMajlis = resolveExportMajlisLabel(entry.majlis, entry.amarat);
        const key = [
          String(entry.idNumber  ''),
          String(entry.tanzeem  '').toLowerCase(),
          String(resolvedMajlis  '').trim(),
        ].join('');
        const response = String(entry.registrationResponse  '').trim().toLowerCase() === 'decline'  'decline'  'accept';
        const reason = String(entry.declineReason  '').trim();
        const timestamp = String(entry.timestamp  '');
        const existingTimestamp = String(acc[key].timestamp  '');
        if (!existingTimestamp) {
          acc[key] = { response, reason, timestamp };
        } else if (timestamp && new Date(timestamp).getTime()  new Date(existingTimestamp).getTime()) {
          acc[key] = { response, reason, timestamp };
        }
        return acc;
      }, {});

    const memberRows = membersDirectory
      .filter((entry) = shouldIncludeMemberInRegistrationBase(entry, allowedTanzeems, normalizedFilter  'total', onlyEhlVoters))
      .map((entry) = ({
        name String(entry.name  '').trim(),
        idNumber String(entry.idNumber  '').trim(),
        tanzeem String(entry.tanzeem  '').toLowerCase(),
        majlis resolveExportMajlisLabel(entry.majlis, entry.amarat),
        anwesend_2026_01_08 normalizeVoterFlagValue(entry.anwesend_2026_01_08),
      }))
      .sort((a, b) = {
        const tA = tanzeemOrder.indexOf(a.tanzeem);
        const tB = tanzeemOrder.indexOf(b.tanzeem);
        if (tA !== tB) return tA - tB;
        const mA = Object.prototype.hasOwnProperty.call(majlisOrderMap, a.majlis.toLowerCase())  majlisOrderMap[a.majlis.toLowerCase()]  Number.MAX_SAFE_INTEGER;
        const mB = Object.prototype.hasOwnProperty.call(majlisOrderMap, b.majlis.toLowerCase())  majlisOrderMap[b.majlis.toLowerCase()]  Number.MAX_SAFE_INTEGER;
        if (mA !== mB) return mA - mB;
        return a.idNumber.localeCompare(b.idNumber, 'de-DE', { numeric true, sensitivity 'base' });
      })
      .map((row) = {
        const key = [row.idNumber, row.tanzeem, row.majlis].join('');
        const responseNode = attendanceResponseByKey[key];
        const responseType = String(responseNode.response  '');
        const hasDecline = responseType === 'decline';
        const hasAccept = responseType === 'accept';
        const responseTimestamp = String(responseNode.timestamp  '');
        const declineReason = String(responseNode.reason  '').trim();
        return {
          majlis row.majlis,
          tanzeemLabel TANZEEM_LABELS[row.tanzeem]  row.tanzeem,
          name row.name,
          idNumber row.idNumber,
          anwesend_2026_01_08 row.anwesend_2026_01_08,
          registeredAccept hasAccept  'Ja'  (hasDecline  'Nein'  '-'),
          declined hasDecline  'Ja'  (hasAccept  'Nein'  '-'),
          declineReason hasDecline  (declineReason  '-')  '-',
          timestamp responseTimestamp  formatGermanDateTime(responseTimestamp)  '—',
        };
      });

    if (!memberRows.length) {
      setToast('Keine Mitgliedsdaten zum Export verfügbar');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const locationHeaderLabel = hasGuestEntriesWithoutMajlis  'Jamaat'  'Majlis';
    const detailedHeader = isGuestMode
       (shouldIncludeGuestNameInExports
         [locationHeaderLabel, 'Tanzeem', 'ID-Nummer', 'Name', 'Zusage', 'Absage', 'Grund', 'Zeitstempel']
         [locationHeaderLabel, 'Tanzeem', 'ID-Nummer', 'Zusage', 'Absage', 'Grund', 'Zeitstempel'])
       ['Majlis', 'Tanzeem', 'ID-Nummer', 'Anwesend am 08.01.2026', 'Zusage', 'Absage', 'Grund', 'Zeitstempel'];
    const rows = [
      ['Moschee', activeMosque.label],
      ['Anmeldung', option.name  '—'],
      ['Zeitraum der Anmeldung', `${option.startDate} bis ${option.endDate}`],
      ['Filter Tanzeem', normalizedFilter  (TANZEEM_LABELS[normalizedFilter]  normalizedFilter)  'Alle'],
      ['Export Zeitstempel', exportTimestamp],
      [],
      detailedHeader,
      ...memberRows.map((row) = {
        if (isGuestMode) {
          if (shouldIncludeGuestNameInExports) {
            return [row.majlis, row.tanzeemLabel, row.idNumber, row.name  '—', row.registeredAccept, row.declined, row.declineReason, row.timestamp];
          }
          return [row.majlis, row.tanzeemLabel, row.idNumber, row.registeredAccept, row.declined, row.declineReason, row.timestamp];
        }
        return [
          row.majlis,
          row.tanzeemLabel,
          row.idNumber,
          row.anwesend_2026_01_08 === 1  'Ja'  (row.anwesend_2026_01_08 === 0  'Nein'  '-'),
          row.registeredAccept,
          row.declined,
          row.declineReason,
          row.timestamp,
        ];
      }),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = isGuestMode
       (shouldIncludeGuestNameInExports
         [{ wch 28 }, { wch 14 }, { wch 14 }, { wch 24 }, { wch 20 }, { wch 12 }, { wch 28 }, { wch 24 }]
         [{ wch 28 }, { wch 14 }, { wch 14 }, { wch 20 }, { wch 12 }, { wch 28 }, { wch 24 }])
       [{ wch 28 }, { wch 14 }, { wch 14 }, { wch 22 }, { wch 20 }, { wch 12 }, { wch 28 }, { wch 24 }];
    XLSX.utils.book_append_sheet(workbook, sheet, 'Übersicht');

    const base64 = XLSX.write(workbook, { type 'base64', bookType 'xlsx' });
    const fileName = `Anmeldung_ID_Uebersicht_${toLocationKey(option.name  'anmeldung')}_${option.startDate}_${option.endDate}.xlsx`;
    if (Platform.OS === 'web') {
      if (!globalThis.atob) throw new Error('Base64 Dekodierung auf Web nicht verfügbar');
      const binary = globalThis.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i  binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type 'applicationvnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
    const cacheDir = String(FileSystem.cacheDirectory  '');
    if (!cacheDir) throw new Error('Dateisystem nicht verfügbar (cacheDirectory fehlt)');
    const fileUri = `${cacheDir}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding FileSystem.EncodingType.Base64 });
    await Sharing.shareAsync(fileUri, {
      mimeType 'applicationvnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle 'Anmeldungs-ID-Übersicht exportieren',
      UTI 'org.openxmlformats.spreadsheetml.sheet',
    });
  }, [activeMosque.label, hasGuestEntriesWithoutMajlis, isGuestMode, membersDirectory, registrationAttendanceEntries, resolveExportMajlisLabel, selectedRegistrationStatsOption, shouldIncludeGuestNameInExports]);

  const handleExportRegistrationDetailedIds = useCallback(async () = {
    if (!effectivePermissions.canExportData) { setToast('Keine Berechtigung'); return; }
    if (detailedRegistrationExporting) return;
    setDetailedRegistrationExporting(true);
    try {
      await writeRegistrationDetailedIdWorkbook(detailedFlowTanzeem);
    } catch (error) {
      const message = String(error.message  '').trim();
      setToast(message  `Export fehlgeschlagen ${message}`  'Export fehlgeschlagen');
      console.error('Registration detailed export failed', error);
    } finally {
      setDetailedRegistrationExporting(false);
    }
  }, [detailedFlowTanzeem, detailedRegistrationExporting, effectivePermissions.canExportData, writeRegistrationDetailedIdWorkbook]);

  function formatMajlisName(locationKey) {
    if (isGuestMode && String(locationKey  '').trim() === 'ohne_majlis') {
      return resolveExportMajlisLabel('-');
    }
    if (MAJLIS_LABELS[locationKey]) return MAJLIS_LABELS[locationKey];
    return String(locationKey  '')
      .split('_')
      .filter(Boolean)
      .map((part) = part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  const weekRankingRows = useMemo(() = {
    const metadataById = new Map();
    membersDirectory.forEach((entry) = {
      const id = String(entry.idNumber  '').trim();
      if (!id  metadataById.has(id)) return;
      metadataById.set(id, {
        tanzeem String(entry.tanzeem  '').toLowerCase(),
        majlis String(entry.majlis  '').trim(),
      });
    });

    const rankingIsos = statsWeekRankingRange === 'previousWeek'  statsRollingWeekIsos  statsWeekIsos;
    const countsById = new Map();
    rankingIsos.forEach((iso) = {
      const byPrayer = weeklyAttendanceDocs[iso].byPrayer  {};
      Object.values(byPrayer).forEach((prayerNode) = {
        const memberDetails = prayerNode.memberDetails  {};
        STATS_TANZEEM_KEYS.forEach((tanzeemKey) = {
          const majlisMap = memberDetails[tanzeemKey]  {};
          Object.entries(majlisMap).forEach(([locationKey, entries]) = {
            if (!Array.isArray(entries)) return;
            entries.forEach((entry) = {
              const id = String(entry.idNumber  '').trim();
              if (!id) return;
              const meta = metadataById.get(id);
              const tanzeem = String(meta.tanzeem  entry.tanzeem  tanzeemKey  '').toLowerCase();
              const majlis = String(meta.majlis  entry.majlis  formatMajlisName(locationKey)  '').trim();
              if (!countsById.has(id)) countsById.set(id, { idNumber id, tanzeem, majlis, count 0 });
              const row = countsById.get(id);
              row.count += 1;
              if (!row.tanzeem && tanzeem) row.tanzeem = tanzeem;
              if (!row.majlis && majlis) row.majlis = majlis;
            });
          });
        });
      });
    });

    const filtered = Array.from(countsById.values()).filter((row) = (
      statsWeekRankingFilter === 'total'  true  row.tanzeem === statsWeekRankingFilter
    ));
    filtered.sort((a, b) = (b.count - a.count)  a.idNumber.localeCompare(b.idNumber));

    let denseRank = 0;
    let previousCount = null;
    return filtered.filter((row) = {
      if (previousCount !== row.count) {
        denseRank += 1;
        previousCount = row.count;
      }
      return denseRank = 3;
    });
  }, [membersDirectory, statsWeekIsos, statsRollingWeekIsos, weeklyAttendanceDocs, statsWeekRankingFilter, statsWeekRankingRange]);

  const detailedMajlisOptions = useMemo(() = {
    if (!detailedFlowTanzeem) return [];
    return Array.from(new Set(
      membersDirectory
        .filter((entry) = entry.tanzeem === detailedFlowTanzeem)
        .map((entry) = entry.majlis),
    )).sort((a, b) = a.localeCompare(b));
  }, [membersDirectory, detailedFlowTanzeem]);

  const detailedIdChoices = useMemo(() = {
    if (!detailedFlowTanzeem  !detailedFlowMajlis) return [];
    const query = detailedIdSearchQuery.trim();
    const isProgramDetailedMode = statsMode === 'program';
    const activeItemName = isProgramDetailedMode
       String(selectedProgramStatsOption.programName  selectedProgramConfig.name  '').trim()
       String(selectedRegistrationStatsOption.name  '').trim();
    const attendanceEntries = isProgramDetailedMode  programAttendanceEntries  registrationAttendanceEntries;
    const registrationResponseById = new Map(
      isProgramDetailedMode
         []
         attendanceEntries
          .filter((entry) = String(entry.tanzeem  '').toLowerCase() === detailedFlowTanzeem)
          .filter((entry) = String(entry.majlis  '').trim() === detailedFlowMajlis)
          .map((entry) = ([
            String(entry.idNumber  '').trim(),
            {
              response String(entry.registrationResponse  '').toLowerCase() === 'decline'  'decline'  'accept',
              hasReason Boolean(String(entry.declineReason  '').trim()),
            },
          ])),
    );
    const presentIds = new Set(
      attendanceEntries
        .filter((entry) = String(entry.tanzeem  '').toLowerCase() === detailedFlowTanzeem)
        .filter((entry) = String(entry.majlis  '').trim() === detailedFlowMajlis)
        .filter((entry) = (isProgramDetailedMode  true  String(entry.registrationResponse  '').toLowerCase() !== 'decline'))
        .map((entry) = String(entry.idNumber  '').trim())
        .filter(Boolean),
    );

    return membersDirectory
      .filter((entry) = entry.tanzeem === detailedFlowTanzeem && entry.majlis === detailedFlowMajlis)
      .filter((entry) = (
        statsMode !== 'registration'  isGuestMode
           true
           normalizeVoterFlagValue(entry.stimmberechtigt) !== '-'
      ))
      .filter((entry) = (!query  String(entry.idNumber).includes(query)))
      .map((entry) = ({
        ...entry,
        normalizedStimmberechtigt normalizeVoterFlagValue(entry.stimmberechtigt),
        isPresentInActiveFlow Boolean(presentIds.has(String(entry.idNumber))),
        registrationResponseInActiveFlow String(registrationResponseById.get(String(entry.idNumber)).response  ''),
        registrationDeclineHasReason Boolean(registrationResponseById.get(String(entry.idNumber)).hasReason),
        hasActiveFlow Boolean(activeItemName),
      }))
      .sort((a, b) = String(a.idNumber).localeCompare(String(b.idNumber)));
  }, [isGuestMode, membersDirectory, detailedFlowTanzeem, detailedFlowMajlis, detailedIdSearchQuery, selectedProgramConfig, selectedProgramStatsOption, selectedRegistrationStatsOption, programAttendanceEntries, registrationAttendanceEntries, statsMode]);

  const detailedCurrentWeekIsos = useMemo(() = {
    const selectedWeekStartDate = parseISO(selectedStatsWeekStartISO  '');
    return getWeekIsosMondayToSunday(selectedWeekStartDate  now);
  }, [now, selectedStatsWeekStartISO]);
  const detailedLast7Days = useMemo(() = {
    const selectedWeekStartDate = parseISO(selectedStatsWeekStartISO  '');
    const baseDate = addDays(selectedWeekStartDate  startOfWeekMonday(now), -1);
    return getLast7Days(baseDate);
  }, [now, selectedStatsWeekStartISO]);
  const detailedLast8Weeks = useMemo(() = {
    const selectedWeekStartDate = parseISO(selectedStatsWeekStartISO  '');
    const baseDate = addDays(selectedWeekStartDate  startOfWeekMonday(now), 6);
    return getLast8Weeks(baseDate);
  }, [now, selectedStatsWeekStartISO]);

  const loadDetailedLogsForMember = async (idNumber, minISO, maxISO, options = {}) = {
    const { bypassCache = false, silent = false } = options;
    const cacheKey = `${idNumber}_${minISO}_${maxISO}`;
    if (!bypassCache && Array.isArray(detailedLogsCacheRef.current[cacheKey])) {
      setDetailedMemberLogs(detailedLogsCacheRef.current[cacheKey]);
      return;
    }
    if (!silent) setDetailedLogsLoading(true);
    try {
      const ids = await listDocIds(MEMBER_DIRECTORY_COLLECTION);
      const relevantIds = ids.filter((docId) = {
        const id = String(docId  '');
        if (!^d{4}-d{2}-d{2}_.test(id)) return false;
        const dateISO = id.slice(0, 10);
        if (dateISO  minISO  dateISO  maxISO) return false;
        return id.endsWith(`_${String(idNumber)}`);
      });
      const rows = await Promise.all(relevantIds.map(async (docId) = {
        const doc = await getDocData(MEMBER_DIRECTORY_COLLECTION, docId);
        return doc  null;
      }));
      const filteredRows = rows
        .filter(Boolean)
        .filter((row) = String(row.idNumber  '') === String(idNumber))
        .filter((row) = {
          const iso = String(row.date  '');
          return ^d{4}-d{2}-d{2}$.test(iso) && iso = minISO && iso = maxISO;
        })
        .filter((row) = Boolean(row.prayer))
        .map((row) = ({
          date String(row.date  ''),
          prayer String(row.prayer  ''),
          tanzeem String(row.tanzeem  ''),
          majlis String(row.majlis  ''),
          timestamp String(row.timestamp  ''),
        }))
        .sort((a, b) = a.date.localeCompare(b.date));
      detailedLogsCacheRef.current[cacheKey] = filteredRows;
      setDetailedMemberLogs(filteredRows);
    } catch {
      setToast('Datenbankfehler – bitte Internet prüfen');
      setDetailedMemberLogs([]);
    } finally {
      if (!silent) setDetailedLogsLoading(false);
    }
  };

  const detailedDailySeries = useMemo(() = buildDailySeries(detailedMemberLogs, detailedLast7Days), [detailedMemberLogs, detailedLast7Days]);
  const detailedWeeklySeries = useMemo(() = buildWeeklySeries(detailedMemberLogs, detailedLast8Weeks), [detailedMemberLogs, detailedLast8Weeks]);
  const detailedCurrentWeekSeries = useMemo(() = buildDailySeries(detailedMemberLogs, detailedCurrentWeekIsos), [detailedMemberLogs, detailedCurrentWeekIsos]);
  const detailedComparisonSeries = detailedGraphRange === 'currentWeek'  detailedCurrentWeekSeries  (detailedGraphRange === 'previousWeek'  detailedDailySeries  detailedWeeklySeries);
  const detailedTopRangeLabel = detailedGraphRange === 'currentWeek'  currentWeekLabel  (detailedGraphRange === 'previousWeek'  'Letzte Woche'  '4-Wochen');
  const detailedTopRangeToggleLabel = detailedGraphRange === 'currentWeek'
     ` ${currentWeekLabel} `
     (detailedGraphRange === 'previousWeek'  ' Letzte Woche '  ' 4-Wochen ');
  const detailedTopRangePeriodLabel = useMemo(() = {
    if (detailedGraphRange === 'fourWeeks') {
      const first = detailedWeeklySeries[0];
      const last = detailedWeeklySeries[detailedWeeklySeries.length - 1];
      if (!first  !last) return 'Zeitraum —';
      const startDate = parseISO(first.startISO);
      const endDate = parseISO(last.endISO);
      const fmt = new Intl.DateTimeFormat('de-DE', { day '2-digit', month '2-digit', year 'numeric' });
      return `Zeitraum ${startDate  fmt.format(startDate)  first.startISO} – ${endDate  fmt.format(endDate)  last.endISO}`;
    }
    return `${formatIsoWithWeekday(detailedComparisonSeries[0].iso)} – ${formatIsoWithWeekday(detailedComparisonSeries[detailedComparisonSeries.length - 1].iso)}`;
  }, [detailedGraphRange, detailedComparisonSeries, detailedWeeklySeries]);

  const detailedPrayerTotalsForIsos = useCallback((isos) = {
    const isoSet = new Set((isos  []).filter(Boolean));
    return STATS_PRAYER_SEQUENCE.map(({ key, label }) = ({
      key,
      label,
      total detailedMemberLogs.reduce((sum, row) = {
        const prayerKey = String(row.prayer  '').toLowerCase();
        if (!isoSet.has(String(row.date  ''))) return sum;
        return prayerKey === key  (sum + 1)  sum;
      }, 0),
    }));
  }, [detailedMemberLogs]);

  const detailedPrayerRows = useMemo(() = {
    if (detailedPrayerRange === 'selectedDate') return detailedPrayerTotalsForIsos([selectedStatsDateISO]);
    if (detailedPrayerRange === 'previousWeek') return detailedPrayerTotalsForIsos(detailedLast7Days);
    return detailedPrayerTotalsForIsos(detailedCurrentWeekIsos);
  }, [detailedPrayerRange, detailedPrayerTotalsForIsos, selectedStatsDateISO, detailedLast7Days, detailedCurrentWeekIsos]);



  const getDetailedExportDataset = useCallback((rangeMode) = {
    const isos = rangeMode === 'previousWeek'  detailedLast7Days  detailedCurrentWeekIsos;
    const logs = (detailedMemberLogs  []).filter((row) = isos.includes(row.date));
    const dailyMap = new Map(isos.map((iso) = [iso, 0]));
    logs.forEach((row) = {
      dailyMap.set(row.date, (dailyMap.get(row.date)  0) + 1);
    });
    const dayRows = isos.map((iso) = ({
      iso,
      tag formatIsoWithWeekday(iso),
      anzahl Number(dailyMap.get(iso))  0,
    }));

    const prayerAgg = { fajr 0, sohar 0, asr 0, maghrib 0, ishaa 0 };
    logs.forEach((row) = {
      const key = String(row.prayer  '').toLowerCase();
      if (Object.prototype.hasOwnProperty.call(prayerAgg, key)) prayerAgg[key] += 1;
    });
    const prayerRows = STATS_PRAYER_SEQUENCE.map((item) = ({
      key item.key,
      label item.label,
      anzahl Number(prayerAgg[item.key])  0,
    }));

    return {
      rangeMode,
      isos,
      logs,
      dayRows,
      prayerRows,
      total logs.length,
    };
  }, [detailedCurrentWeekIsos, detailedLast7Days, detailedMemberLogs]);

  const hasDetailedExportData = useMemo(() = Boolean(selectedDetailedMember), [selectedDetailedMember]);

  const writeDetailedWorkbook = useCallback(async (rangeMode) = {
    if (!selectedDetailedMember) {
      setToast('Bitte zuerst eine ID auswählen');
      return;
    }
    const dataset = getDetailedExportDataset(rangeMode);
    if (!dataset.total) {
      setToast('Keine Daten zum Export verfügbar');
      return;
    }
    const startISO = dataset.isos[0]  '';
    const endISO = dataset.isos[dataset.isos.length - 1]  '';
    const startLabel = formatIsoWithWeekday(startISO);
    const endLabel = formatIsoWithWeekday(endISO);

    const workbook = XLSX.utils.book_new();
    const exportTimestamp = new Intl.DateTimeFormat('de-DE', {
      day '2-digit', month '2-digit', year 'numeric', hour '2-digit', minute '2-digit', second '2-digit',
    }).format(new Date());
    const overviewRows = [
      ['Moschee', activeMosque.label],
      ['Zeitraum', `${startLabel} – ${endLabel}`],
      ['Export Zeitstempel', exportTimestamp],
      ['ID', selectedDetailedMember.idNumber],
      ...(shouldIncludeGuestNameInExports  [['Name', String(selectedDetailedMember.name  memberMetadataById[String(selectedDetailedMember.idNumber  '')].name  '—')]]  []),
      ['Tanzeem', TANZEEM_LABELS[selectedDetailedMember.tanzeem]  selectedDetailedMember.tanzeem  '—'],
      [getLocationLabel(selectedDetailedMember.majlis), resolveExportMajlisLabel(selectedDetailedMember.majlis, selectedDetailedMember.amarat)],
      ['Gesamt Gebete', Number(dataset.total)  0],
    ];
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewRows);
    overviewSheet['!cols'] = [{ wch 28 }, { wch 36 }];

    const dayRows = [
      ['Tag', 'Anzahl der Gebete nach Tage'],
      ...dataset.dayRows.map((row) = [row.tag, Number(row.anzahl)  0]),
    ];
    const daySheet = XLSX.utils.aoa_to_sheet(dayRows);
    daySheet['!cols'] = [{ wch 22 }, { wch 20 }];

    const prayerRows = [
      ['Gebetszeit', 'Anzahl der Gebete nach Gebetszeiten'],
      ...dataset.prayerRows.map((row) = [row.label, Number(row.anzahl)  0]),
    ];
    const prayerSheet = XLSX.utils.aoa_to_sheet(prayerRows);
    prayerSheet['!cols'] = [{ wch 22 }, { wch 32 }];

    const logHeader = shouldIncludeGuestNameInExports
       ['Datum', 'Gebetszeit', 'ID', 'Name', 'Tanzeem', getLocationLabel(selectedDetailedMember.majlis), 'Zeitstempel']
       ['Datum', 'Gebetszeit', 'ID', 'Tanzeem', getLocationLabel(selectedDetailedMember.majlis), 'Zeitstempel'];
    const logRows = [
      logHeader,
      ...dataset.logs.map((row) = {
        const values = [
          formatIsoWithWeekday(row.date),
          STATS_PRAYER_SEQUENCE.find((item) = item.key === row.prayer).label  row.prayer,
          selectedDetailedMember.idNumber,
        ];
        if (shouldIncludeGuestNameInExports) values.push(String(selectedDetailedMember.name  memberMetadataById[String(selectedDetailedMember.idNumber  '')].name  '—'));
        values.push(
          TANZEEM_LABELS[selectedDetailedMember.tanzeem]  selectedDetailedMember.tanzeem  '—',
          resolveExportMajlisLabel(selectedDetailedMember.majlis, selectedDetailedMember.amarat),
          formatGermanDateTime(row.timestamp),
        );
        return values;
      }),
    ];
    const logsSheet = XLSX.utils.aoa_to_sheet(logRows);
    logsSheet['!cols'] = shouldIncludeGuestNameInExports
       [{ wch 22 }, { wch 18 }, { wch 12 }, { wch 24 }, { wch 14 }, { wch 24 }, { wch 24 }]
       [{ wch 22 }, { wch 18 }, { wch 12 }, { wch 14 }, { wch 24 }, { wch 24 }];

    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Übersicht');
    XLSX.utils.book_append_sheet(workbook, daySheet, 'Gebete nach Tage');
    XLSX.utils.book_append_sheet(workbook, prayerSheet, 'Gebete nach Gebetszeiten');
    XLSX.utils.book_append_sheet(workbook, logsSheet, 'Gebetsprotokoll');

    const boldCellStyle = { font { bold true } };
    ['Übersicht', 'Gebete nach Tage', 'Gebete nach Gebetszeiten', 'Gebetsprotokoll'].forEach((sheetName) = {
      const ws = workbook.Sheets[sheetName];
      if (!ws  !ws['!ref']) return;
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let col = range.s.c; col = range.e.c; col += 1) {
        const addr = XLSX.utils.encode_cell({ c col, r 0 });
        if (ws[addr]) ws[addr].s = boldCellStyle;
      }
    });

    const base64 = XLSX.write(workbook, { type 'base64', bookType 'xlsx' });
    const safeStart = startLabel.replace([,s]+g, '_').replace([^a-zA-Z0-9._-äöüÄÖÜß]g, '');
    const safeEnd = endLabel.replace([,s]+g, '_').replace([^a-zA-Z0-9._-äöüÄÖÜß]g, '');
    const fileName = `Detaillierte_ID_Uebersicht_${selectedDetailedMember.idNumber}_${safeStart}_${safeEnd}.xlsx`;

    if (Platform.OS === 'web') {
      if (!globalThis.atob) throw new Error('Base64 Dekodierung auf Web nicht verfügbar');
      const binary = globalThis.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i  binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type 'applicationvnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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

    const cacheDir = String(FileSystem.cacheDirectory  '');
    if (!cacheDir) throw new Error('Dateisystem nicht verfügbar (cacheDirectory fehlt)');
    const fileUri = `${cacheDir}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding FileSystem.EncodingType.Base64 });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      setToast('Sharing auf diesem Gerät nicht verfügbar');
      return;
    }
    await Sharing.shareAsync(fileUri, {
      mimeType 'applicationvnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle 'Detaillierte ID exportieren',
      UTI 'org.openxmlformats.spreadsheetml.sheet',
    });
  }, [activeMosque.label, getDetailedExportDataset, getLocationLabel, memberMetadataById, resolveExportMajlisLabel, selectedDetailedMember, shouldIncludeGuestNameInExports]);

  const handleExportDetailed = useCallback(async (rangeMode) = {
    if (!effectivePermissions.canExportData) { setToast('Keine Berechtigung'); return; }
    if (detailedExporting) return;
    setDetailedExporting(true);
    try {
      await writeDetailedWorkbook(rangeMode);
      setDetailedExportModalVisible(false);
    } catch (error) {
      const message = String(error.message  '').trim();
      setToast(message  `Export fehlgeschlagen ${message}`  'Export fehlgeschlagen');
      console.error('Detailed export failed', error);
    } finally {
      setDetailedExporting(false);
    }
  }, [detailedExporting, effectivePermissions.canExportData, writeDetailedWorkbook]);
  const detailedCurrentWeekCount = useMemo(() = {
    const minISO = detailedCurrentWeekIsos[0]  '';
    const maxISO = detailedCurrentWeekIsos[detailedCurrentWeekIsos.length - 1]  '';
    return detailedMemberLogs.reduce((sum, row) = ((row.date = minISO && row.date = maxISO)  (sum + 1)  sum), 0);
  }, [detailedMemberLogs, detailedCurrentWeekIsos]);
  const detailedPreviousWeekCount = useMemo(() = {
    const minISO = detailedLast7Days[0]  '';
    const maxISO = detailedLast7Days[detailedLast7Days.length - 1]  '';
    return detailedMemberLogs.reduce((sum, row) = ((row.date = minISO && row.date = maxISO)  (sum + 1)  sum), 0);
  }, [detailedMemberLogs, detailedLast7Days]);
  const detailedCurrentWeekDistinctDays = useMemo(() = {
    const minISO = detailedCurrentWeekIsos[0]  '';
    const maxISO = detailedCurrentWeekIsos[detailedCurrentWeekIsos.length - 1]  '';
    const days = new Set(
      detailedMemberLogs
        .filter((row) = row.date = minISO && row.date = maxISO)
        .map((row) = row.date),
    );
    return days.size;
  }, [detailedMemberLogs, detailedCurrentWeekIsos]);
  const detailedStatus = useMemo(() = calculateStatus(detailedCurrentWeekCount, detailedCurrentWeekDistinctDays), [detailedCurrentWeekCount, detailedCurrentWeekDistinctDays]);

  useEffect(() = {
    if (!selectedDetailedMember.idNumber  !selectedStatsDateISO) return;
    const firstWeek = detailedLast8Weeks[0];
    if (!firstWeek) return;
    if (selectedStatsDateISO = firstWeek.startISO && selectedStatsDateISO = toISO(now)) return;
    const minISO = selectedStatsDateISO  firstWeek.startISO  selectedStatsDateISO  firstWeek.startISO;
    const maxISO = selectedStatsDateISO  toISO(now)  selectedStatsDateISO  toISO(now);
    loadDetailedLogsForMember(selectedDetailedMember.idNumber, minISO, maxISO);
  }, [selectedDetailedMember, selectedStatsDateISO, detailedLast8Weeks, now]);

  useEffect(() = {
    if (!isDetailedIdOverviewVisible  !selectedDetailedMember.idNumber) return undefined;
    const firstWeek = detailedLast8Weeks[0];
    if (!firstWeek) return undefined;
    const minISO = selectedStatsDateISO && selectedStatsDateISO  firstWeek.startISO  selectedStatsDateISO  firstWeek.startISO;
    const maxISO = selectedStatsDateISO && selectedStatsDateISO  toISO(now)  selectedStatsDateISO  toISO(now);

    const refreshDetailedLogs = () = {
      loadDetailedLogsForMember(selectedDetailedMember.idNumber, minISO, maxISO, { bypassCache true, silent true });
    };

    refreshDetailedLogs();
    const timer = setInterval(refreshDetailedLogs, 5000);
    return () = clearInterval(timer);
  }, [isDetailedIdOverviewVisible, selectedDetailedMember, selectedStatsDateISO, detailedLast8Weeks, now]);


  const clearQrRegistration = useCallback(async () = {
    setQrRegistration(null);
    setQrLastAttendanceStatus('idle');
    setQrLastAttendancePrayerKey('');
    setQrLastAttendanceDateISO('');
    await AsyncStorage.removeItem(STORAGE_KEYS.qrRegistration);
  }, []);

  const ensureQrBrowserDeviceId = useCallback(async () = {
    const existingBrowserDeviceId = await AsyncStorage.getItem(STORAGE_KEYS.qrBrowserDeviceId);
    if (existingBrowserDeviceId) {
      setQrBrowserDeviceId(existingBrowserDeviceId);
      return existingBrowserDeviceId;
    }
    const generated = Crypto.randomUUID  Crypto.randomUUID()  await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${Date.now()}_${Math.random()}`);
    await AsyncStorage.setItem(STORAGE_KEYS.qrBrowserDeviceId, generated);
    setQrBrowserDeviceId(generated);
    return generated;
  }, []);

  useEffect(() = {
    const initQrRegistration = async () = {
      try {
        const browserDeviceId = await ensureQrBrowserDeviceId();
        if (!browserDeviceId  !hasFirebaseConfig()) {
          await clearQrRegistration();
          return;
        }
        const remoteRegistration = await getGlobalDocData(QR_REGISTRATION_COLLECTION, browserDeviceId);
        if (remoteRegistration.idNumber) {
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

  useEffect(() = {
    const nextImageUri = buildQrImageUrl(qrScanUrl);
    if (!qrImageUri) {
      setQrImageUri(nextImageUri);
      setQrPendingImageUri('');
      return;
    }
    if (nextImageUri !== qrImageUri) setQrPendingImageUri(nextImageUri);
  }, [qrImageUri, qrScanUrl]);

  useEffect(() = {
    const tick = () = {
      const nowMs = Date.now();
      const activeCycleStart = getQrCycleStart(nowMs);
      setQrCycleStart((prev) = (prev === activeCycleStart  prev  activeCycleStart));
      const nextRefreshAt = activeCycleStart + QR_REFRESH_INTERVAL_MS;
      setQrCountdownSeconds(Math.max(0, Math.ceil((nextRefreshAt - nowMs)  1000)));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () = clearInterval(timer);
  }, []);

  const persistQrRegistration = useCallback(async (registration) = {
    setQrRegistration(registration);
    await AsyncStorage.setItem(STORAGE_KEYS.qrRegistration, JSON.stringify(registration));
  }, []);

  const loadStoredQrRegistration = useCallback(async () = {
    const browserDeviceId = qrBrowserDeviceId  await ensureQrBrowserDeviceId();
    if (!browserDeviceId  !hasFirebaseConfig()) {
      await clearQrRegistration();
      return null;
    }
    const remoteRegistration = await getGlobalDocData(QR_REGISTRATION_COLLECTION, browserDeviceId);
    if (remoteRegistration.idNumber) {
      await persistQrRegistration(remoteRegistration);
      return remoteRegistration;
    }
    await clearQrRegistration();
    return null;
  }, [clearQrRegistration, ensureQrBrowserDeviceId, persistQrRegistration, qrBrowserDeviceId]);

  const handleQrMemberRegistration = useCallback(async (member) = {
    const browserDeviceId = qrBrowserDeviceId  await ensureQrBrowserDeviceId();
    if (!member.idNumber  !browserDeviceId) {
      setQrStatusTone('negative');
      setQrStatusMessage('Bitte zuerst eine gültige ID auswählen.');
      return;
    }
    setQrSubmitting(true);
    try {
      const targetExternalScopeKey = activeMosqueKey === EXTERNAL_MOSQUE_KEY
         normalizeExternalScopeKey(
          qrScanExternalScopeKey
           guestActivation.scopeKey
           guestActivation.mosqueName
           currentAccount.externalMosqueName
           currentAccount.name
           '',
        )
         '';
      const existingRegistration = await getGlobalDocData(QR_REGISTRATION_COLLECTION, browserDeviceId);
      const existingIdRegistrations = await listGlobalRegistrationsByIdNumber(
        QR_REGISTRATION_COLLECTION,
        member.idNumber,
        activeMosqueKey,
        targetExternalScopeKey,
      );
      const conflictingRegistrations = (existingIdRegistrations  []).filter((entry) = String(entry.docId  '') !== String(browserDeviceId));
      const hasRegistrationConflict = conflictingRegistrations.length  0;
      if (hasRegistrationConflict) {
        const conflictDocIds = conflictingRegistrations
          .map((entry) = String(entry.docId  ''))
          .filter(Boolean)
          .sort();
        const conflictDocIdsKey = conflictDocIds.join('');
        const isConfirmedTakeover = Boolean(
          qrRegistrationOverrideCandidate
          && String(qrRegistrationOverrideCandidate.idNumber  '') === String(member.idNumber)
          && String(qrRegistrationOverrideCandidate.docIdsKey  '') === conflictDocIdsKey,
        );
        if (!isConfirmedTakeover) {
          setQrRegistrationOverrideCandidate({
            idNumber String(member.idNumber),
            docIdsKey conflictDocIdsKey,
          });
          setQrStatusTone('neutral');
          setQrStatusMessage('Diese ID ist bereits registriert. Bitte dieselbe ID erneut antippen, um die Registrierung auf diesem Browser zu übernehmen.');
          return;
        }
        await Promise.all(conflictDocIds.map((docId) = deleteGlobalDocData(QR_REGISTRATION_COLLECTION, docId).catch(() = {})));
      }
      setQrRegistrationOverrideCandidate(null);
      const nextRegistration = {
        browserDeviceId,
        idNumber String(member.idNumber),
        tanzeem String(member.tanzeem  '').toLowerCase(),
        majlis String(member.majlis  ''),
        mosqueKey activeMosqueKey,
        externalScopeKey targetExternalScopeKey  '',
        updatedAt new Date().toISOString(),
        createdAt existingRegistration.createdAt  new Date().toISOString(),
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
        iso registrationHintContext.iso,
        prayerKey registrationHintContext.prayerKey  '',
        prayerLabel registrationHintContext.prayerLabel  '',
        isActive Boolean(registrationHintContext.isActive),
        prayerWindow registrationHintContext.prayerWindow  null,
        timesToday registrationHintContext.timesToday  null,
      });
      setQrStatusTone('positive');
      setQrStatusMessage('Erfolgreiche Registrierung. Bitte Browserdaten nicht löschen und möglichst immer denselben Browser verwenden.');
      setQrRegistrationSearchQuery('');
      setQrRegistrationFlowSearchQuery('');
      if (qrPendingScanAfterRegistrationPayload) {
        setPendingQrPayload(qrPendingScanAfterRegistrationPayload);
        setQrPendingScanAfterRegistrationPayload('');
      }
    } catch (error) {
      console.error('QR registration failed', error);
      setQrStatusTone('negative');
      setQrStatusMessage('Registrierung fehlgeschlagen. Bitte Internet prüfen.');
    } finally {
      setQrSubmitting(false);
    }
  }, [activeMosqueKey, currentAccount.externalMosqueName, currentAccount.name, ensureQrBrowserDeviceId, guestActivation.mosqueName, guestActivation.scopeKey, persistQrRegistration, qrBrowserDeviceId, qrPendingScanAfterRegistrationPayload, qrRegistrationOverrideCandidate, qrScanExternalScopeKey, resolveQrPrayerContext]);

  const handleQrScanFlow = useCallback(async (encodedPayload) = {
    if (!isWebRuntime  !encodedPayload) return;
    if (!prayerOverrideReady) {
      setPendingQrPayload(encodedPayload);
      setQrScanPageVisible(true);
      setQrStatusTone('neutral');
      setQrStatusMessage('Gebetszeiten werden geladen. QR-Scan wird gleich verarbeitet.');
      setQrSubmitting(false);
      return;
    }
    const payload = decodeQrPayload(encodedPayload);
    if (!payload  payload.type !== 'prayer_attendance') return;
    const payloadMosqueKey = getMosqueOptionByKey(payload.mosqueKey  DEFAULT_MOSQUE_KEY).key;
    setQrScanMosqueKey(payloadMosqueKey);
    let checkinMosqueLabel = getMosqueOptionByKey(payloadMosqueKey).label  'Moschee';
    const payloadExternalScopeKey = normalizeExternalScopeKey(payload.externalScopeKey  '');
    if (payloadMosqueKey === EXTERNAL_MOSQUE_KEY) {
      const externalLabel = formatExternalScopeLabel(payloadExternalScopeKey  guestActivation.scopeKey  guestActivation.mosqueName  '');
      if (externalLabel) checkinMosqueLabel = externalLabel;
    }
    const payloadAttendanceCategory = normalizeQrAttendanceCategory(payload.attendanceCategory  'prayer');
    if (payloadMosqueKey === EXTERNAL_MOSQUE_KEY && !payloadExternalScopeKey) {
      setQrStatusTone('negative');
      setQrStatusMessage('Dieser externe QR-Code hat keinen Amarat-Scope. Bitte einen aktuellen externen QR-Code verwenden.');
      setQrScanPageVisible(true);
      return;
    }
    const nowMs = Date.now();
    if (Number(payload.expiresAt) = nowMs) {
      setQrStatusTone('negative');
      setQrStatusMessage('Dieser QR-Code ist abgelaufen. Bitte den aktuellen QR-Code erneut scannen.');
      setQrScanPageVisible(true);
      return;
    }
    let qrPrayerContext = resolveQrPrayerContext();
    let resolvedGuestScopeForScan = payloadExternalScopeKey
       normalizeExternalScopeKey(
        guestActivation.scopeKey
         guestActivation.mosqueName
         currentAccount.externalMosqueName
         currentAccount.name
         '',
      );
    if (payloadMosqueKey === EXTERNAL_MOSQUE_KEY) {
      setQrScanExternalScopeKey(resolvedGuestScopeForScan  '');
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
      if (!registration.idNumber) {
        setQrFlowMode('register');
        setQrRegistrationMode('tanzeem');
        setQrQuickIdSearchVisible(false);
        setQrRegistrationOverrideCandidate(null);
        setQrPendingScanAfterRegistrationPayload(encodedPayload);
        setQrStatusTone('neutral');
        setQrStatusMessage('Dieser Browser ist noch nicht registriert. Bitte jetzt einmalig registrieren.');
        return;
      }
      const registrationMosqueKey = String(registration.mosqueKey  '');
      const currentPayloadMosqueKey = String(payloadMosqueKey  '');
      const canReuseInternalFrankfurtRegistration = INTERNAL_SHARED_REGISTRATION_MOSQUE_KEYS.has(registrationMosqueKey)
        && INTERNAL_SHARED_REGISTRATION_MOSQUE_KEYS.has(currentPayloadMosqueKey);
      if (registrationMosqueKey !== currentPayloadMosqueKey && !canReuseInternalFrankfurtRegistration) {
        setQrFlowMode('register');
        setQrRegistrationMode('tanzeem');
        setQrQuickIdSearchVisible(false);
        setQrRegistrationOverrideCandidate(null);
        setQrPendingScanAfterRegistrationPayload(encodedPayload);
        setQrStatusTone('neutral');
        setQrStatusMessage('Für diese Moschee ist eine separate Registrierung erforderlich. Bitte jetzt einmalig registrieren.');
        return;
      }
      if (payloadMosqueKey === EXTERNAL_MOSQUE_KEY && payloadExternalScopeKey) {
        const registrationScopeKey = normalizeExternalScopeKey(registration.externalScopeKey  '');
        if (registrationScopeKey !== payloadExternalScopeKey) {
          setQrFlowMode('register');
          setQrRegistrationMode('tanzeem');
          setQrQuickIdSearchVisible(false);
          setQrRegistrationOverrideCandidate(null);
          setQrPendingScanAfterRegistrationPayload(encodedPayload);
          setQrStatusTone('neutral');
          setQrStatusMessage('Für diese Amarat ist eine separate Registrierung erforderlich. Bitte jetzt einmalig registrieren.');
          return;
        }
      }
      const shouldUseExternalScopedMembersDirectory = payloadMosqueKey === EXTERNAL_MOSQUE_KEY
         isGuestMode
         Boolean(resolvedGuestScopeForScan);
      const scopedMembersDirectory = shouldUseExternalScopedMembersDirectory
         EXTERNAL_MEMBER_DIRECTORY_DATA.filter((entry) = {
          const entryScope = normalizeExternalScopeKey(entry.amarat  '');
          return !entryScope  !resolvedGuestScopeForScan  entryScope === resolvedGuestScopeForScan;
        })
         MEMBER_DIRECTORY_DATA;
      const member = scopedMembersDirectory.find((entry) = String(entry.idNumber) === String(registration.idNumber));
      if (!member) {
        setQrFlowMode('register');
        setQrRegistrationMode('tanzeem');
        setQrQuickIdSearchVisible(false);
        setQrRegistrationOverrideCandidate(null);
        setQrPendingScanAfterRegistrationPayload(encodedPayload);
        setQrStatusTone('negative');
        setQrStatusMessage('Die gespeicherte Registrierung wurde in der Mitgliederliste nicht gefunden. Bitte erneut registrieren.');
        return;
      }
      setQrPendingScanAfterRegistrationPayload('');
      const scopeFromMember = normalizeExternalScopeKey(member.amarat  '');
      if (scopeFromMember) {
        resolvedGuestScopeForScan = scopeFromMember;
      }
      if (String(payloadMosqueKey  activeMosqueKey) === EXTERNAL_MOSQUE_KEY && resolvedGuestScopeForScan) {
        setActiveMosqueScope(EXTERNAL_MOSQUE_KEY, resolvedGuestScopeForScan);
      }
      try {
        const [remoteGlobalOverride, remotePendingOverride] = await Promise.all([
          getDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_GLOBAL_DOC_ID, payloadMosqueKey  activeMosqueKey).catch(() = null),
          getDocDataForMosque(PRAYER_OVERRIDE_COLLECTION, PRAYER_OVERRIDE_PENDING_DOC_ID, payloadMosqueKey  activeMosqueKey).catch(() = null),
        ]);
        if (!remoteGlobalOverride && !remotePendingOverride) {
          throw new Error('no-remote-override');
        }
        const normalizedGlobalOverride = normalizePrayerOverride(remoteGlobalOverride);
        const normalizedPendingOverride = normalizePendingPrayerOverride(remotePendingOverride);
        const runtimeFromGlobal = getRuntimePrayerContext(normalizedGlobalOverride, availableDates);
        const runtimeOverride = normalizedPendingOverride.dateISO === runtimeFromGlobal.iso
           normalizePrayerOverride(normalizedPendingOverride)
           normalizedGlobalOverride;
        const runtimeContext = getRuntimePrayerContext(runtimeOverride, availableDates);
        qrPrayerContext = {
          ...runtimeContext,
          prayerKey runtimeContext.prayerWindow.prayerKey  null,
          prayerLabel runtimeContext.prayerWindow.prayerLabel  null,
          isActive Boolean(runtimeContext.prayerWindow.isActive),
        };
      } catch {
        qrPrayerContext = resolveQrPrayerContext();
      }
      setQrLastRuntimeHint({
        iso qrPrayerContext.iso,
        prayerKey qrPrayerContext.prayerKey  '',
        prayerLabel qrPrayerContext.prayerLabel  '',
        isActive Boolean(qrPrayerContext.isActive),
        prayerWindow qrPrayerContext.prayerWindow  null,
        timesToday qrPrayerContext.timesToday  null,
      });
      setQrFlowMode('registered');
      if (payloadAttendanceCategory === 'prayer' && String(member.tanzeem  '').toLowerCase() === 'kinder') {
        setQrLastAttendanceStatus('invalid_tanzeem');
        setQrLastAttendancePrayerKey('');
        setQrLastAttendanceDateISO(qrPrayerContext.iso);
        setQrStatusTone('negative');
        setQrStatusMessage('Kinder können nicht per Gebets-QR eingetragen werden. Bitte den Programm-QR verwenden.');
        return;
      }

      if (payloadAttendanceCategory === 'prayer' && (!qrPrayerContext.isActive  !qrPrayerContext.prayerKey)) {
        setQrLastAttendanceStatus('inactive_prayer');
        setQrLastAttendancePrayerKey('');
        setQrLastAttendanceDateISO(qrPrayerContext.iso);
        setQrStatusTone('negative');
        setQrStatusMessage('Kein aktives Gebetsfenster.');
        return;
      }

      const result = await countAttendanceRef.current.(payloadAttendanceCategory, 'member', registration.majlis  member.majlis, member, {
        runtimeContext qrPrayerContext,
        guestScopeKey resolvedGuestScopeForScan,
      });
      const activeQrPrayerKey = String(qrPrayerContext.prayerKey  result.targetKeys.[0]  '');
      const activeQrPrayerLabel = qrPrayerContext.prayerLabel  getDisplayPrayerLabel(activeQrPrayerKey, qrPrayerContext.timesToday);

      if (result.status === 'inactive_prayer') {
        setQrLastAttendanceStatus('inactive_prayer');
        setQrLastAttendancePrayerKey('');
        setQrLastAttendanceDateISO(qrPrayerContext.iso);
        setQrStatusTone('negative');
        setQrStatusMessage('Kein aktives Gebetsfenster.');
      } else if (result.status === 'inactive_program') {
        setQrLastAttendanceStatus('inactive_program');
        setQrLastAttendancePrayerKey('program');
        setQrLastAttendanceDateISO(qrPrayerContext.iso);
        setQrStatusTone('negative');
        setQrStatusMessage('Aktuell kein Programm aktiv.');
      } else if (result.status === 'duplicate') {
        setQrLastAttendanceStatus('duplicate');
        setQrLastAttendancePrayerKey(payloadAttendanceCategory === 'program'  'program'  activeQrPrayerKey);
        setQrLastAttendanceDateISO(qrPrayerContext.iso);
        setQrStatusTone('positive');
        setQrStatusMessage(
          payloadAttendanceCategory === 'program'
             `Sie wurden bereits für das Programm eingetragen (${checkinMosqueLabel}).`
             `Sie wurden bereits für das ${activeQrPrayerLabel} Gebet eingetragen (${checkinMosqueLabel}).`,
        );
      } else if (result.status === 'counted') {
        setQrLastAttendanceStatus('counted');
        setQrLastAttendancePrayerKey(payloadAttendanceCategory === 'program'  'program'  activeQrPrayerKey);
        setQrLastAttendanceDateISO(qrPrayerContext.iso);
        setQrStatusTone('positive');
        setQrStatusMessage(
          payloadAttendanceCategory === 'program'
             `Erfolgreiche automatische Eintragung für das Programm (${checkinMosqueLabel}).`
             `Erfolgreiche automatische Eintragung für ${activeQrPrayerLabel} (${checkinMosqueLabel}).`,
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
  }, [activeMosqueKey, availableDates, currentAccount.externalMosqueName, currentAccount.name, getRuntimePrayerContext, guestActivation.mosqueName, guestActivation.scopeKey, loadStoredQrRegistration, onSelectMosque, resolveQrPrayerContext]);

  useEffect(() = {
    if (!isWebRuntime  typeof window === 'undefined') return undefined;
    const applyQrFromUrl = () = {
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
    return () = window.removeEventListener('popstate', applyQrFromUrl);
  }, [handleQrScanFlow, prayerOverrideReady]);

  useEffect(() = {
    if (!prayerOverrideReady  !pendingQrPayload) return;
    const payload = pendingQrPayload;
    setPendingQrPayload('');
    handleQrScanFlow(payload);
  }, [handleQrScanFlow, pendingQrPayload, prayerOverrideReady]);

  useEffect(() = {
    if (!isWebRuntime  typeof window === 'undefined') return;
    const persistedQrPage = window.sessionStorage.getItem(STORAGE_KEYS.qrActivePage);
    if (persistedQrPage === 'scan') {
      setQrScanPageVisible(true);
      setQrPageVisible(false);
    } else if (persistedQrPage === 'display') {
      setQrPageVisible(true);
      setQrScanPageVisible(false);
    }
  }, []);

  useEffect(() = {
    if (!isWebRuntime  typeof window === 'undefined') return;
    if (isQrScanPageVisible) {
      window.sessionStorage.setItem(STORAGE_KEYS.qrActivePage, 'scan');
      return;
    }
    if (isQrPageVisible) {
      window.sessionStorage.setItem(STORAGE_KEYS.qrActivePage, 'display');
      return;
    }
    window.sessionStorage.removeItem(STORAGE_KEYS.qrActivePage);
  }, [isQrPageVisible, isQrScanPageVisible]);

  useEffect(() = {
    if (activeTab !== 'terminal') return;
    if (attendanceMode === 'program' && qrAttendanceCategory !== 'program') {
      setQrAttendanceCategory('program');
      return;
    }
    if (attendanceMode === 'prayer' && qrAttendanceCategory !== 'prayer') {
      setQrAttendanceCategory('prayer');
    }
  }, [activeTab, attendanceMode, qrAttendanceCategory]);

  const recordTerminalInteraction = useCallback(() = {
    inactivityLastInteractionRef.current = Date.now();
  }, []);

  const scrollTerminalToTop = useCallback(() = {
    const run = () = {
      terminalScrollRef.current.scrollTo.({ y 0, animated false });
      if (Platform.OS === 'web' && globalThis.window.scrollTo) {
        globalThis.window.scrollTo({ top 0, left 0, behavior 'auto' });
      }
    };
    if (Platform.OS === 'web' && typeof globalThis.requestAnimationFrame === 'function') {
      globalThis.requestAnimationFrame(() = globalThis.requestAnimationFrame(run));
      return;
    }
    setTimeout(run, 0);
  }, []);

  useEffect(() = {
    if (Platform.OS !== 'web') return;
    const listener = () = recordTerminalInteraction();
    const webTarget = globalThis.window;
    if (!webTarget.addEventListener) return;
    const events = ['wheel', 'scroll', 'touchmove', 'mousemove', 'mousedown', 'keydown'];
    events.forEach((eventName) = webTarget.addEventListener(eventName, listener, { passive true }));
    return () = {
      events.forEach((eventName) = webTarget.removeEventListener(eventName, listener));
    };
  }, [recordTerminalInteraction]);

  useEffect(() = {
    const loadTerminalInactivityConfig = async () = {
      const externalScopeKey = normalizeExternalScopeKey(guestActivation.scopeKey  guestActivation.mosqueName  '');
      const localStorageKey = getTerminalInactivityStorageKey(activeMosqueKey, externalScopeKey);
      const [localRaw, globalConfig] = await Promise.all([
        AsyncStorage.getItem(localStorageKey).catch(() = null),
        getDocData(TERMINAL_INACTIVITY_CONFIG_COLLECTION, TERMINAL_INACTIVITY_CONFIG_DOC_ID).catch(() = null),
      ]);
      const localConfig = localRaw  (() = { try { return JSON.parse(localRaw); } catch { return null; } })()  null;
      const preferredConfig = localConfig.scope === 'device'
         localConfig
         (globalConfig  localConfig  null);
      const timeoutSeconds = Math.max(15, Number(preferredConfig.timeoutSeconds)  90);
      setTerminalInactivityEnabledInput(Boolean(preferredConfig.enabled  true));
      setTerminalInactivityTimeoutInput(String(timeoutSeconds));
      setTerminalInactivityScopeInput(preferredConfig.scope === 'device'  'device'  'global');
      inactivityLastInteractionRef.current = Date.now();
    };
    if (normalizedAppMode !== 'full' && !isGuestMode) return;
    loadTerminalInactivityConfig();
  }, [activeMosqueKey, guestActivation.mosqueName, guestActivation.scopeKey, isGuestMode, normalizedAppMode]);

  const saveTerminalInactivityConfig = useCallback(async () = {
    const timeoutSeconds = Math.max(15, Number(String(terminalInactivityTimeoutInput  '').replace([^0-9]g, ''))  90);
    const payload = {
      enabled Boolean(terminalInactivityEnabledInput),
      timeoutSeconds,
      scope terminalInactivityScopeInput === 'device'  'device'  'global',
      updatedAt new Date().toISOString(),
    };
    const externalScopeKey = normalizeExternalScopeKey(guestActivation.scopeKey  guestActivation.mosqueName  '');
    const localStorageKey = getTerminalInactivityStorageKey(activeMosqueKey, externalScopeKey);
    try {
      setTerminalInactivitySaving(true);
      if (payload.scope === 'device') {
        await AsyncStorage.setItem(localStorageKey, JSON.stringify(payload));
      } else {
        await setDocData(TERMINAL_INACTIVITY_CONFIG_COLLECTION, TERMINAL_INACTIVITY_CONFIG_DOC_ID, payload);
      }
      setTerminalInactivityTimeoutInput(String(timeoutSeconds));
      setToast(payload.scope === 'device'  'Inactivity-Reset für dieses Gerät gespeichert ✓'  'Inactivity-Reset global gespeichert ✓');
      inactivityLastInteractionRef.current = Date.now();
    } catch (error) {
      console.error('saveTerminalInactivityConfig failed', error);
      setToast('Inactivity-Reset konnte nicht gespeichert werden');
    } finally {
      setTerminalInactivitySaving(false);
    }
  }, [activeMosqueKey, guestActivation.mosqueName, guestActivation.scopeKey, terminalInactivityEnabledInput, terminalInactivityScopeInput, terminalInactivityTimeoutInput]);

  useEffect(() = {
    if (normalizedAppMode !== 'full' && !isGuestMode) return;
    const timeoutSeconds = Math.max(15, Number(String(terminalInactivityTimeoutInput  '').replace([^0-9]g, ''))  90);
    const exactlyOneAttendanceWindowActive = prayerWindow.isActive !== programWindow.isActive;
    const shouldRun = Boolean(terminalInactivityEnabledInput)
      && !currentAccount
      && exactlyOneAttendanceWindowActive;
    if (!shouldRun) return;

    const timer = setInterval(() = {
      const elapsedMs = Date.now() - inactivityLastInteractionRef.current;
      if (elapsedMs  timeoutSeconds  1000) return;
      setActiveTab('terminal');
      setAttendanceMode(prayerWindow.isActive  'prayer'  'program');
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
    return () = clearInterval(timer);
  }, [currentAccount, isGuestMode, normalizedAppMode, prayerWindow.isActive, programWindow.isActive, scrollTerminalToTop, terminalInactivityEnabledInput, terminalInactivityTimeoutInput]);

  const handleTabPress = useCallback((tabKey) = {
    recordTerminalInteraction();
    setActiveTab(tabKey);
    setQrPageVisible(false);
    setQrScanPageVisible(false);
  }, [recordTerminalInteraction]);

  const countAttendance = async (modeType, kind, locationName, selectedMember = null, options = {}) = {
    const nowTs = Date.now();
    if (nowTs - terminalLastCountRef.current  2000) return;
    terminalLastCountRef.current = nowTs;

    if (!hasFirebaseConfig()) {
      Alert.alert('Datenbankfehler', 'Bitte Firebase Konfiguration setzen.');
      return;
    }

    if (kind === 'member' && (!selectedMember  !selectedMember.idNumber)) {
      setToast('Bitte erst ID auswählen');
      return { status 'missing_member' };
    }

    if (isGuestMode) {
      const resolvedGuestScope = normalizeExternalScopeKey(options.guestScopeKey  guestActivation.scopeKey  guestActivation.mosqueName  '');
      if (!resolvedGuestScope) {
        setToast('Bitte zuerst Local Amarat speichern');
        return { status 'missing_guest_scope' };
      }
      setActiveMosqueScope(EXTERNAL_MOSQUE_KEY, resolvedGuestScope);
    }

    const runtimeOverride = prayerOverride;
    const runtimeContext = options.runtimeContext  getRuntimePrayerContext(runtimeOverride, availableDates);
    const runtimeNow = runtimeContext.now;
    const runtimeISO = runtimeContext.iso;
    const runtimeTimesToday = runtimeContext.timesToday;
    const runtimePrayerWindow = runtimeContext.prayerWindow;

    let runtimeProgramConfig = (programConfigByDate  {})[runtimeISO]  null;
    let runtimeProgramWindow = { isConfigured false, isActive false, label null };
    if (runtimeProgramConfig && isValidTime(runtimeProgramConfig.startTime) && String(runtimeProgramConfig.name  '').trim()) {
      const startMinutes = Number(runtimeProgramConfig.startTime.slice(0, 2))  60 + Number(runtimeProgramConfig.startTime.slice(3));
      const nowMinutes = runtimeNow.getHours()  60 + runtimeNow.getMinutes();
      runtimeProgramWindow = {
        isConfigured true,
        isActive nowMinutes = (startMinutes - 30),
        label String(runtimeProgramConfig.name  '').trim(),
      };
    }
    if (modeType === 'program' && !runtimeProgramWindow.isActive) {
      try {
        const remoteProgramConfig = await getDocData(PROGRAM_CONFIG_COLLECTION, runtimeISO);
        if (remoteProgramConfig && isValidTime(remoteProgramConfig.startTime) && String(remoteProgramConfig.name  '').trim()) {
          runtimeProgramConfig = remoteProgramConfig;
          const startMinutes = Number(remoteProgramConfig.startTime.slice(0, 2))  60 + Number(remoteProgramConfig.startTime.slice(3));
          const nowMinutes = runtimeNow.getHours()  60 + runtimeNow.getMinutes();
          runtimeProgramWindow = {
            isConfigured true,
            isActive nowMinutes = (startMinutes - 30),
            label String(remoteProgramConfig.name  '').trim(),
          };
        }
      } catch {
         ignore and keep local runtimeProgramWindow fallback
      }
    }

    const forcedPrayerKey = String(options.forcedPrayerKey  '');
    if (modeType === 'prayer' && !forcedPrayerKey && (!runtimePrayerWindow.isActive  !runtimePrayerWindow.prayerKey)) {
      setToast('Derzeit kein aktives Gebetszeitfenster');
      setRefreshTick((v) = v + 1);
      return { status 'inactive_prayer' };
    }

    if (modeType === 'program' && !runtimeProgramWindow.isActive) {
      setToast('Aktuell kein Programm vorhanden');
      return { status 'inactive_program' };
    }
    if (modeType === 'registration' && (!registrationWindow.isOpen  !registrationWindow.config.id)) {
      setToast('Anmeldung aktuell nicht verfügbar');
      return { status 'inactive_registration' };
    }

    const resolvedMemberTanzeem = kind === 'member'  String(selectedMember.tanzeem  '').toLowerCase()  '';
    const effectiveTanzeem = kind === 'member'  (resolvedMemberTanzeem  selectedTanzeem)  selectedTanzeem;
    const resolvedLocationName = String(locationName  selectedMember.majlis  selectedMajlis  'Gast').trim();
    const pathTanzeemKey = toLocationKey(effectiveTanzeem  '');
    const locationKey = toLocationKey(resolvedLocationName  'gast')  'ohne_majlis';
    if (kind === 'member' && !pathTanzeemKey) {
      setToast('Tanzeem beim Mitglied fehlt');
      return { status 'missing_tanzeem' };
    }
    const registrationResponseType = modeType === 'registration' && options.registrationResponse === 'decline'  'decline'  'accept';
    const registrationDeclineReason = modeType === 'registration' && registrationResponseType === 'decline'
       String(options.declineReason  '').trim()
       '';
    const targetKeys = [];

    if (modeType === 'program') {
      targetKeys.push(toLocationKey(runtimeProgramWindow.label  'programm'));
    } else if (modeType === 'registration') {
      targetKeys.push(String(registrationWindow.config.id  ''));
    } else {
      const prayer = forcedPrayerKey  runtimePrayerWindow.prayerKey;
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
    targetKeys.forEach((targetKey) = {
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
      const programKey = modeType === 'program'  targetKeys[0]  null;
      const registrationKey = modeType === 'registration'  targetKeys[0]  null;

      if (kind === 'member' && selectedMember.idNumber) {
        const duplicateChecks = await Promise.all(targetKeys.map((targetKey) = {
          const memberEntryId = modeType === 'program'
             `${runtimeISO}_${programKey}_${effectiveTanzeem}_${locationKey}_${String(selectedMember.idNumber)}`
             (modeType === 'registration'
               `${registrationKey}_${effectiveTanzeem}_${locationKey}_${String(selectedMember.idNumber)}`
               `${runtimeISO}_${targetKey}_${effectiveTanzeem}_${locationKey}_${String(selectedMember.idNumber)}`);
          return getDocData(
            modeType === 'program'  PROGRAM_ATTENDANCE_COLLECTION  (modeType === 'registration'  REGISTRATION_ATTENDANCE_COLLECTION  MEMBER_DIRECTORY_COLLECTION),
            memberEntryId,
          );
        }));

        if (duplicateChecks.some(Boolean)) {
          setToast('Bereits gezählt');
          setQuickIdSearchQuery('');
          setTerminalMode('tanzeem');
          setSelectedTanzeem('');
          setSelectedMajlis('');
          return { status 'duplicate' };
        }
      }

      if (modeType === 'program') {
        await incrementDocCounters(PROGRAM_DAILY_COLLECTION, `${runtimeISO}_${programKey}`, paths);
      } else if (modeType === 'registration') {
        const existingRegistrationDaily = await getDocData(REGISTRATION_DAILY_COLLECTION, registrationKey).catch(() = null);
        if (!existingRegistrationDaily) {
          await setDocData(REGISTRATION_DAILY_COLLECTION, registrationKey, {
            registrationId registrationKey,
            registrationName String(registrationWindow.config.name  ''),
            total 0,
            declineTotal 0,
            byTanzeem {},
            byMajlis {},
            createdAt new Date().toISOString(),
          });
        }
        await incrementDocCounters(REGISTRATION_DAILY_COLLECTION, registrationKey, paths);
      } else {
        await incrementDocCounters('attendance_daily', runtimeISO, paths);
      }

      if (kind === 'member' && selectedMember.idNumber) {
        await Promise.all(targetKeys.map((targetKey) = {
          const memberEntryId = modeType === 'program'
             `${runtimeISO}_${programKey}_${effectiveTanzeem}_${locationKey}_${String(selectedMember.idNumber)}`
             (modeType === 'registration'
               `${registrationKey}_${effectiveTanzeem}_${locationKey}_${String(selectedMember.idNumber)}`
               `${runtimeISO}_${targetKey}_${effectiveTanzeem}_${locationKey}_${String(selectedMember.idNumber)}`);
          return setDocData(modeType === 'program'  PROGRAM_ATTENDANCE_COLLECTION  (modeType === 'registration'  REGISTRATION_ATTENDANCE_COLLECTION  MEMBER_DIRECTORY_COLLECTION), memberEntryId, {
            type modeType,
            date runtimeISO,
            ...(modeType === 'program'  { programName runtimeProgramWindow.label }  {}),
            ...(modeType === 'registration'  { registrationId registrationKey, registrationName registrationWindow.config.name  '' }  {}),
            ...(modeType === 'registration'  { registrationResponse registrationResponseType, declineReason registrationDeclineReason  null }  {}),
            ...(modeType === 'prayer'  { prayer targetKey }  {}),
            majlis resolvedLocationName,
            tanzeem effectiveTanzeem,
            idNumber String(selectedMember.idNumber),
            ...(STORE_MEMBER_NAMES_IN_DB  { name selectedMember.name  null }  {}),
            timestamp new Date().toISOString(),
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
            type 'program',
            date runtimeISO,
            programName runtimeProgramWindow.label,
            tanzeem 'guest',
            majlis resolvedLocationName,
            idNumber 'guest',
            timestamp new Date().toISOString(),
          });
        } else {
          await setDocData(MEMBER_DIRECTORY_COLLECTION, guestEntryId, {
            type 'prayer',
            date runtimeISO,
            prayer targetKeys[0],
            tanzeem 'guest',
            majlis resolvedLocationName,
            idNumber 'guest',
            timestamp new Date().toISOString(),
          });
        }
      }

      visitorCounterRef.current += 1;
      Vibration.vibrate(4);
      setToast(modeType === 'registration'  `Angemeldet für ${registrationWindow.config.name  'Anmeldung'}`  'Gezählt ✓');
      setQuickIdSearchQuery('');
      setTerminalMode('tanzeem');
      setSelectedTanzeem('');
      setSelectedMajlis('');
      return { status 'counted', targetKeys };
    } catch {
      Alert.alert('Datenbankfehler', 'Bitte Internet prüfen');
      setToast('Datenbankfehler – bitte Internet prüfen');
      return { status 'error' };
    }
  };
  countAttendanceRef.current = countAttendance;


  const renderPrayer = () = {
    const displayDate = selectedDate  now;
    return (
      ScrollView contentContainerStyle={contentContainerStyle} showsVerticalScrollIndicator={false}
        View style={[styles.dayCard, { backgroundColor theme.card, borderColor theme.border }]}
          Pressable onPress={handleGlobalThemeToggleTrigger}
            Text style={[styles.dayName, { color theme.text }]}{DAY_NAMES_DE[displayDate.getDay()]}Text
          Pressable
          Text style={[styles.dayDate, { color theme.muted }]}{germanDateLong(displayDate)}Text
          Pressable onPress={handleMosqueSwitchTrigger} style={[styles.cityBadge, { backgroundColor theme.chipBg }]}
            Text style={[styles.cityBadgeText, { color theme.chipText }]}{activeMosque.label}Text
          Pressable
          {!hasTodayData  Text style={[styles.syncStatus, { color theme.muted }]}Keine Daten für dieses Datum vorhanden.Text  null}
          {prayerRows.map((row) = {
            const isActive = row.activeKeys.includes(activePrayerKey  '');
            return (
              View key={row.id} style={[styles.prayerRow, { borderBottomColor theme.border }, isActive && { backgroundColor theme.rowActiveBg, borderColor theme.rowActiveBorder, borderWidth 1, borderRadius 10 }]}
                Text style={[styles.prayerLabel, { color theme.text }]}{row.label}Text
                Text style={[styles.prayerValue, { color theme.text }]}{row.time  '—'}Text
              View
            );
          })}
          {isRamadanPeriodToday  Text style={[styles.noteText, { color theme.muted }]}Sehri-Ende {selectedRaw.sehriEnd  '—'}Text  null}
          {isRamadanPeriodToday  Text style={[styles.noteText, { color theme.muted }]}Iftar {selectedRaw.iftar  '—'}Text  null}
          {normalizedAnnouncement  (
            View style={[styles.announcementCard, isTablet && styles.announcementCardTablet, { backgroundColor theme.bg, borderColor theme.border }]} 
              Text style={[styles.announcementTitle, isTablet && styles.announcementTitleTablet, { color theme.text }]}AnkündigungText
              Text style={[styles.announcementBody, isTablet && styles.announcementBodyTablet, { color theme.text }]}
                {announcementSegments.map((segment, index) = (
                  Text
                    key={`${segment.style}-${index}`}
                    style={[
                      styles.announcementBody,
                      isTablet && styles.announcementBodyTablet,
                      segment.style === 'bold' && styles.announcementBodyBold,
                      segment.style === 'italic' && styles.announcementBodyItalic,
                      segment.style === 'strike' && styles.announcementBodyStrike,
                      { color theme.text },
                    ]}
                  
                    {segment.text}
                  Text
                ))}
              Text
            View
          )  null}
        View
      ScrollView
    );
  };

  const renderHeadlineBlock = (headline, fallbackTitle = '') = {
    const normalized = buildHeadlineConfig(headline);
    const title = normalized.title  String(fallbackTitle  '').trim();
    if (!title) return null;
    const lines = [
      { key 'title', value title, style styles.headlineTitleText },
      { key 'subtitle', value normalized.subtitle, style styles.headlineSubtitleText },
      { key 'extra', value normalized.extraLine, style styles.headlineExtraText },
    ].filter((line) = Boolean(String(line.value  '').trim()));
    return (
      View style={styles.headlineBlock}
        {lines.map((line) = (
          Text key={line.key} style={[line.style, { color theme.text }]}
            {parseFormattedSegments(line.value).map((segment, index) = (
              Text
                key={`${line.key}_${segment.style}_${index}`}
                style={[
                  line.style,
                  segment.style === 'bold' && styles.announcementBodyBold,
                  segment.style === 'italic' && styles.announcementBodyItalic,
                  segment.style === 'strike' && styles.announcementBodyStrike,
                  { color theme.text },
                ]}
              
                {segment.text}
              Text
            ))}
          Text
        ))}
      View
    );
  };

  const renderTerminal = () = {
    const isRegistrationOnlyAppMode = normalizedAppMode === 'registration';
    const isPrayerMode = attendanceMode === 'prayer';
    const isProgramMode = attendanceMode === 'program';
    const isRegistrationMode = attendanceMode === 'registration';
    const modeSubTitle = isPrayerMode
       'Erfassung der Gebetsanwesenheit'
       (isProgramMode  'Erfassung der Programmanwesenheit'  'Erfassung von Anmeldungen');
    const registrationNeedsLogin = Boolean(registrationWindow.loginEnabled);
    const hasRegistrationLoginAccess = registrationNeedsLogin  Boolean(currentAccount)  (isRegistrationOnlyAppMode  true  (registrationWindow.isPublic  Boolean(currentAccount)));
    const canAccessRegistrationMode = registrationWindow.canAccess && hasRegistrationLoginAccess;
    const registrationLockedByLogin = registrationWindow.canAccess && registrationNeedsLogin && !currentAccount;
    const hasActiveAttendanceWindow = !guestRequiresConfig
      && (isPrayerMode
         prayerWindow.isActive
         (isProgramMode  programWindow.isActive  (registrationWindow.isOpen && canAccessRegistrationMode)));
    const cycleAttendanceMode = () = {
      if (isPrayerMode) return 'program';
      if (isProgramMode) return canAccessRegistrationMode  'registration'  'prayer';
      return 'prayer';
    };
    const pendingRegistrationVoterFlag = normalizeVoterFlagValue(pendingRegistrationMember.stimmberechtigt);
    const pendingRegistrationAnwesendFlag = normalizeVoterFlagValue(pendingRegistrationMember.anwesend_2026_01_08);
    const isPendingRegistrationAllowedByVoterRule = !registrationWindow.onlyEhlVoters  pendingRegistrationVoterFlag === 1;
    const isPendingRegistrationDisallowedByVoterRule = Boolean(
      registrationWindow.onlyEhlVoters
      && pendingRegistrationMember
      && pendingRegistrationVoterFlag !== 1,
    );
    const shouldShowAttendanceFooter = isPrayerMode
       prayerWindow.isActive
       (isProgramMode  programWindow.isActive  registrationWindow.canAccess);

    return (
      ScrollView ref={terminalScrollRef} keyboardShouldPersistTaps=handled contentContainerStyle={contentContainerStyle} showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}
        View style={[styles.terminalBanner, { backgroundColor isDarkMode  '#111827'  '#FFFFFF', borderColor isDarkMode  '#374151'  '#111111', borderWidth isDarkMode  1  3 }]}
          {!isRegistrationOnlyAppMode  (
            Pressable style={withPressEffect(styles.modeSwitch)} onPress={() = { setAttendanceMode(cycleAttendanceMode()); setTerminalMode('tanzeem'); setSelectedTanzeem(''); setSelectedMajlis(''); setPendingRegistrationMember(null); }}
              Text style={[styles.modeSwitchText, isTablet && styles.modeSwitchTextTablet, { color isDarkMode  '#FFFFFF'  '#111111' }]}
                {isPrayerMode  ' Gebetsanwesenheit '  (isProgramMode  ' Programmanwesenheit '  ' Anmeldung ')}
              Text
            Pressable
          )  null}
          Text style={[styles.terminalBannerTitle, { color isDarkMode  '#FFFFFF'  '#111111' }]}{isGuestMode  (guestActivation.mosqueName  'Local Amarat')  'Local Amarat Frankfurt'}Text
          Text style={[styles.terminalBannerArabic, { color isDarkMode  '#D1D5DB'  '#374151' }]}{isPrayerMode  'نماز حاضری'  (isProgramMode  'پروگرام حاضری'  'اندراج  رجسٹریشن')}Text
          Text style={[styles.terminalBannerSubtitle, { color isDarkMode  '#D1D5DB'  '#4B5563' }]}{modeSubTitle}Text
        View

        View style={[styles.currentPrayerCard, { backgroundColor theme.card, borderColor theme.border }]}
          {isPrayerMode  (
            prayerWindow.isActive  (
              Text style={[styles.currentPrayerText, { color theme.text }]}Aktuelles Gebet {prayerWindow.prayerLabel}Text
            )  (
              
                Text style={[styles.noPrayerTitle, isDarkMode  styles.noPrayerTitleDark  styles.noPrayerTitleLight]}Derzeit kein GebetText
                Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginTop 10 }]}Nächstes GebetText
                Text style={[styles.nextPrayerValue, { color theme.text }]}{prayerWindow.nextLabel}Text
                View style={[styles.noPrayerCountdownChip, { borderColor theme.border, backgroundColor isDarkMode  '#1F2937'  '#FEF3C7' }]}
                  Text style={[styles.noPrayerCountdownText, { color theme.text }]}
                    Das Zeitfenster öffnet sich in {formatMinutesUntil(prayerWindow.minutesUntilNextWindow)}
                  Text
                View
              
            )
          )  isProgramMode  (
            programWindow.isActive  (
              
                Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginBottom 6 }]}Aktuelles ProgrammText
                {renderHeadlineBlock(programWindow.headline, programWindow.label)}
              
            )  (
              
                Text style={[styles.noPrayerTitle, isDarkMode  styles.noPrayerTitleDark  styles.noPrayerTitleLight]}Aktuell kein Programm vorhandenText
                {programWindow.isConfigured  (
                  View style={[styles.programScheduledHint, { borderColor theme.border, backgroundColor isDarkMode  '#1F2937'  '#FEF3C7' }]}
                    Text style={[styles.programScheduledLabel, { color theme.text }]}Programm geplantText
                    {renderHeadlineBlock(programWindow.headline, programWindow.label)}
                    Text style={[styles.programScheduledValue, { color theme.text }]}
                      Beginnt in {Math.floor((programWindow.minutesUntilStart  0)  60)}h {String((programWindow.minutesUntilStart  0) % 60).padStart(2, '0')}m
                    Text
                  View
                )  (
                  Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginTop 10 }]}Für heute ist kein Programm geplant.Text
                )}
              
            )
          )  (
            registrationWindow.canAccess  (
              registrationWindow.isOpen  (
                
                  Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginBottom 6 }]}AnmeldungText
                  {renderHeadlineBlock(registrationWindow.config, registrationWindow.config.name  'Anmeldung')}
                
              )  registrationWindow.isUpcoming  (
                View style={[styles.programScheduledHint, { borderColor theme.border, backgroundColor isDarkMode  '#1F2937'  '#FEF3C7' }]}
                  Text style={[styles.programScheduledLabel, { color theme.text }]}Anmeldung startet amText
                  {renderHeadlineBlock(registrationWindow.config, registrationWindow.config.name  'Anmeldung')}
                  Text style={[styles.programScheduledValue, { color theme.text }]}{registrationWindow.config.startDate  '—'}Text
                View
              )  (
                Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginTop 10 }]}Die Anmeldung ist abgelaufen und nur noch in den Statistiken sichtbar.Text
              )
            )  (
              Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginTop 10 }]}Keine Anmeldung mit gültigem Zeitraum konfiguriert.Text
            )
          )}
        View

        {hasActiveAttendanceWindow  (
          
            {isQuickIdSearchVisible  (
              
                Pressable onPress={() = { setQuickIdSearchVisible(false); setQuickIdSearchQuery(''); }} style={withPressEffect(styles.quickSearchLinkWrap)}
                  Text style={[styles.quickSearchLinkText, { color isDarkMode  'rgba(209, 213, 219, 0.84)'  'rgba(55, 65, 81, 0.84)' }]}SchließenText
                Pressable
                View style={[styles.quickSearchPanel, { borderColor '#000000', backgroundColor theme.card }]}
                TextInput
                  value={quickIdSearchQuery}
                  onChangeText={(value) = setQuickIdSearchQuery(String(value  '').replace([^0-9]g, ''))}
                  onFocus={() = terminalScrollRef.current.scrollTo({ y 180, animated true })}
                  placeholder=ID-Nummer suchen
                  placeholderTextColor={theme.muted}
                  keyboardType=number-pad
                  inputMode=numeric
                  returnKeyType=done
                  style={[styles.idSearchInput, { marginTop 0, color theme.text, borderColor theme.border, backgroundColor theme.bg }]}
                
                {quickSearchDigits.length  4  (
                  Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginTop 8 }]}Bitte mindestens 4 Ziffern eingeben.Text
                )  quickSearchResults.length === 0  (
                  Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginTop 8 }]}Keine passende ID gefunden.Text
                )  (
                  View style={styles.quickSearchResultsWrap}
                    {quickSearchResults.map((member) = (
                      Pressable
                        key={`quick_${member.tanzeem}_${member.majlis}_${member.idNumber}`}
                        onPress={() = {
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
                        style={({ pressed }) = [[styles.quickSearchResultCard, { borderColor theme.border, backgroundColor theme.bg }], pressed && styles.buttonPressed]}
                      
                        Text style={[styles.quickSearchResultText, { color theme.text }]}{`${member.idNumber} · ${TANZEEM_LABELS[member.tanzeem]  member.tanzeem} · ${resolveExportMajlisLabel(member.majlis, member.amarat)}`}Text
                      Pressable
                    ))}
                  View
                )}
              View
              
            )  null}
          
        )  null}

        {hasActiveAttendanceWindow && !isQuickIdSearchVisible  (terminalMode === 'tanzeem'  (
          
            Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, { color theme.text, textAlign 'center' }]}Bitte wählen Sie die TanzeemText
            Text style={[styles.urduText, { color theme.muted }]}براہِ کرم تنظیم منتخب کریںText
            View style={styles.tanzeemRow}
              {(isPrayerMode  TANZEEM_OPTIONS  (isProgramMode  PROGRAM_TANZEEM_OPTIONS  registrationWindow.includeTanzeems)).map((tanzeem) = (
                Pressable key={tanzeem} style={({ pressed }) = [[styles.tanzeemBtn, isTablet && styles.tanzeemBtnTablet, { backgroundColor theme.button }], pressed && styles.buttonPressed]} onPress={() = { setSelectedTanzeem(tanzeem); setSelectedMajlis(hasMultipleMajalisInGuest  ''  '-'); setTerminalMode(hasMultipleMajalisInGuest  'majlis'  'idSelection'); }}
                  Text style={[styles.presetBtnText, isTablet && styles.presetBtnTextTablet, { color theme.buttonText }]}{TANZEEM_LABELS[tanzeem]}Text
                Pressable
              ))}
            View
            {!isRegistrationMode  (View style={styles.guestButtonRow}
              View style={styles.guestButtonSpacer} 
              Pressable
                onPress={() = countAttendance(attendanceMode, 'guest')}
                style={({ pressed }) = [[styles.tanzeemBtn, isTablet && styles.tanzeemBtnTablet, styles.guestButton, { backgroundColor theme.button }, !isDarkMode && styles.guestButtonLightOutline], pressed && styles.buttonPressed]}
              
                Text style={[styles.presetBtnText, isTablet && styles.presetBtnTextTablet, { color theme.buttonText }]}GastText
              Pressable
              View style={styles.guestButtonSpacer} 
            View)  null}
            Pressable onPress={() = setQuickIdSearchVisible((prev) = !prev)} style={withPressEffect(styles.quickSearchLinkWrap)}
              Text style={[styles.quickSearchLinkText, { color isDarkMode  'rgba(209, 213, 219, 0.84)'  'rgba(55, 65, 81, 0.84)' }]}Hier direkt ID-Nummer suchenText
            Pressable
          
        )  terminalMode === 'majlis'  (
          
            Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, { color theme.text, textAlign 'center' }]}{`Bitte wählen Sie Ihre ${hasGuestEntriesWithoutMajlis  'Jamaat'  'Majlis'}`}Text
            Text style={[styles.urduText, { color theme.muted }]}براہِ کرم اپنی مجلس منتخب کریںText
            Pressable style={({ pressed }) = [[styles.saveBtn, { backgroundColor theme.button }], pressed && styles.buttonPressed]} onPress={() = { setTerminalMode('tanzeem'); setSelectedTanzeem(''); setSelectedMajlis(''); }}
              Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.buttonText }]}ZurückText
            Pressable
            {membersLoading  ActivityIndicator size=small color={theme.text}   null}
            {!membersLoading && majlisChoices.length === 0  Text style={[styles.noteText, { color theme.muted, textAlign 'center' }]}{`Keine ${hasGuestEntriesWithoutMajlis  'Jamaat'  'Majlis'}-Daten für diese Tanzeem gefunden.`}Text  null}
            View style={styles.gridWrap}
              {majlisChoices.map((loc) = (
                Pressable key={loc} style={({ pressed }) = [[styles.gridItem, isTablet && styles.gridItemTablet, { backgroundColor theme.card, borderColor theme.border }], pressed && styles.buttonPressed]} onPress={() = { setSelectedMajlis(loc); setTerminalMode('idSelection'); }}
                  Text style={[styles.gridText, isTablet && styles.gridTextTablet, { color theme.text }]}{loc}Text
                Pressable
              ))}
            View
            {!isRegistrationMode  (View style={styles.guestButtonRow}
              View style={styles.guestButtonSpacer} 
              Pressable
                onPress={() = countAttendance(attendanceMode, 'guest')}
                style={({ pressed }) = [[styles.tanzeemBtn, isTablet && styles.tanzeemBtnTablet, { backgroundColor isDarkMode  '#FFFFFF'  '#000000' }], pressed && styles.buttonPressed]}
              
                Text style={[styles.presetBtnText, isTablet && styles.presetBtnTextTablet, { color isDarkMode  '#000000'  '#FFFFFF' }]}GastText
              Pressable
              View style={styles.guestButtonSpacer} 
            View)  null}
            Pressable onPress={() = setQuickIdSearchVisible((prev) = !prev)} style={withPressEffect(styles.quickSearchLinkWrap)}
              Text style={[styles.quickSearchLinkText, { color isDarkMode  'rgba(209, 213, 219, 0.84)'  'rgba(55, 65, 81, 0.84)' }]}Hier direkt ID-Nummer suchenText
            Pressable
          
        )  terminalMode === 'registrationConfirm'  (
          
            Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, { color theme.text, textAlign 'center' }]}Anmeldung bestätigenText
            Text style={[styles.urduText, { color theme.muted }]}براہِ کرم اندراج کی تصدیق کریںText
            {pendingRegistrationMember  (
              View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                Text style={[styles.statsCardTitle, { color theme.muted }]}Ausgewählte IDText
                Text style={[styles.statsBigValue, { color theme.text }]}{pendingRegistrationMember.idNumber}Text
                Text style={[styles.noteText, { color theme.muted }]}
                  {`${TANZEEM_LABELS[pendingRegistrationMember.tanzeem]  pendingRegistrationMember.tanzeem} · ${resolveExportMajlisLabel(pendingRegistrationMember.majlis, pendingRegistrationMember.amarat)}${
                    isGuestMode  ''  ((pendingRegistrationVoterFlag === 1  pendingRegistrationVoterFlag === 0)  ' · Ehl-Voter'  ' · Nicht-Ehl-Voter')
                  }`}
                Text
              View
            )  null}
            {registrationWindow.onlyEhlVoters && !isGuestMode && pendingRegistrationMember  (
              View style={[styles.registrationVoterInfoCard, { backgroundColor theme.card, borderColor theme.border }]}
                {pendingRegistrationVoterFlag === 1  (
                  
                    Text style={[styles.registrationVoterInfoHeadline, { color theme.text }]}Sie dürfen an der Wahl teilnehmen.Text
                    Text style={[styles.registrationVoterInfoDetail, { color theme.muted }]}
                      {pendingRegistrationAnwesendFlag === 1  'Bei der letzten Wahl am 08.01.2026 waren Sie anwesend.'  'Bei der letzten Wahl am 08.01.2026 waren Sie nicht anwesend.'}
                    Text
                  
                )  pendingRegistrationVoterFlag === 0  (
                  Text style={[styles.registrationVoterInfoHeadline, { color theme.text }]}Sie sind leider nicht stimmberechtigt.Text
                )  (
                  Text style={[styles.registrationVoterInfoHeadline, { color theme.text }]}Sie erfüllen nicht die Voraussetzungen eines Ehl-Voters.Text
                )}
              View
            )  null}
            Pressable
              style={({ pressed }) = [[styles.registrationConfirmBtn, {
                opacity pendingRegistrationMember  1  0.6,
                backgroundColor isPendingRegistrationDisallowedByVoterRule  '#DC2626'  '#16A34A',
              }], pressed && isPendingRegistrationAllowedByVoterRule && styles.buttonPressed]}
              disabled={!pendingRegistrationMember}
              onPress={async () = {
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
            
              Text style={styles.registrationConfirmBtnText}AnmeldenText
            Pressable
            {registrationWindow.allowDecline && pendingRegistrationMember && (!registrationWindow.onlyEhlVoters  pendingRegistrationVoterFlag === 1)  (
              
                Pressable
                  style={({ pressed }) = [[styles.registrationConfirmBtn, { marginTop 0, backgroundColor '#000000' }], pressed && styles.buttonPressed]}
                  onPress={() = setRegistrationDeclineConfirmVisible((prev) = !prev)}
                
                  Text style={styles.registrationConfirmBtnText}AbmeldenText
                Pressable
                {registrationDeclineConfirmVisible  (
                  View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border, marginTop 10 }]}
                    Text style={[styles.statsCardTitle, { color theme.muted }]}Optional Grund angebenText
                    TextInput
                      value={registrationDeclineReasonInput}
                      onChangeText={setRegistrationDeclineReasonInput}
                      placeholder=Optional Grund eingeben
                      placeholderTextColor={theme.muted}
                      style={[styles.mergeInput, { marginTop 8, color theme.text, borderColor theme.border, backgroundColor theme.bg }]}
                    
                    Pressable
                      style={({ pressed }) = [[styles.saveBtn, { marginTop 10, backgroundColor '#000000' }], pressed && styles.buttonPressed]}
                      onPress={async () = {
                        if (!pendingRegistrationMember) return;
                        await countAttendance('registration', 'member', pendingRegistrationMember.majlis, pendingRegistrationMember, {
                          registrationResponse 'decline',
                          declineReason registrationDeclineReasonInput,
                        });
                        setPendingRegistrationMember(null);
                        setRegistrationConfirmFromQuickSearch(false);
                        setRegistrationDeclineConfirmVisible(false);
                        setRegistrationDeclineReasonInput('');
                      }}
                    
                      Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color '#FFFFFF' }]}Abmeldung bestätigenText
                    Pressable
                  View
                )  null}
              
            )  null}
            Pressable
              style={({ pressed }) = [[styles.saveBtn, {
                backgroundColor theme.card,
                borderColor theme.border,
                borderWidth 1,
              }], pressed && styles.buttonPressed]}
              onPress={() = {
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
            
              Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.text }]}ZurückText
            Pressable
          
        )  (
          
            Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, { color theme.text, textAlign 'center' }]}Bitte wählen Sie Ihre ID-NummerText
            Text style={[styles.urduText, { color theme.muted }]}براہِ کرم اپنی آئی ڈی منتخب کریںText
            Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginBottom 4 }]}{`${resolveExportMajlisLabel(selectedMajlis)} · ${TANZEEM_LABELS[selectedTanzeem]  ''}`}Text
            Pressable style={({ pressed }) = [[styles.saveBtn, { backgroundColor theme.button }], pressed && styles.buttonPressed]} onPress={() = setTerminalMode(hasMultipleMajalisInGuest  'majlis'  'tanzeem')}
              Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.buttonText }]}ZurückText
            Pressable
            {membersLoading  ActivityIndicator size=small color={theme.text}   null}
            {!membersLoading && memberChoices.length === 0  Text style={[styles.noteText, { color theme.muted, textAlign 'center' }]}Keine ID-Nummern verfügbar.Text  null}
            {memberChoices.length  0  (
              
                TextInput
                  value={idSearchQuery}
                  onChangeText={(value) = {
                    const digitsOnly = String(value  '').replace([^0-9]g, '');
                    setIdSearchQuery(digitsOnly);
                  }}
                  onFocus={() = setIsIdSearchFocused(true)}
                  onBlur={() = setIsIdSearchFocused(false)}
                  placeholder=ID-Nummer suchen
                  placeholderTextColor={theme.muted}
                  keyboardType=number-pad
                  inputMode=numeric
                  returnKeyType=done
                  style={[styles.idSearchInput, { color theme.text, borderColor isDarkMode  '#FFFFFF'  '#000000', backgroundColor theme.card }]}
                
                {idSearchQuery && filteredMemberChoices.length === 0  (
                  Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginTop 8 }]}Keine passende ID gefundenText
                )  visibleMemberChoices.length === 0  (
                  Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginTop 8 }]}Keine ID-Nummern verfügbar.Text
                )  (
                  View style={[styles.gridWrap, styles.idGridWrap]}
                    {visibleMemberChoices.map((member) = {
                      const isAlreadyCounted = shouldShowCountedIdHint && countedMemberIdsForSelection.has(String(member.idNumber  ''));
                      const shouldUseRegistrationResponseBorders = shouldShowCountedIdHint && isRegistrationMode && (registrationWindow.onlyEhlVoters  registrationWindow.allowDecline);
                      const registrationResponse = shouldUseRegistrationResponseBorders  countedMemberResponsesForSelection.get(String(member.idNumber  ''))  '';
                      const responseBorderStyle = shouldUseRegistrationResponseBorders
                         (registrationResponse === 'decline'
                           { borderColor '#DC2626', borderWidth 3 }
                           (registrationResponse === 'accept'  { borderColor '#16A34A', borderWidth 3 }  null))
                         null;
                      return (
                        Pressable
                          key={`${member.tanzeem}_${member.majlis}_${member.idNumber}`}
                          style={({ pressed }) = [[
                            styles.gridItem,
                            isTablet && styles.gridItemTablet,
                            { backgroundColor theme.card, borderColor theme.border },
                            responseBorderStyle,
                            isAlreadyCounted && !shouldUseRegistrationResponseBorders && styles.gridItemCounted,
                            isAlreadyCounted && !shouldUseRegistrationResponseBorders && { backgroundColor isDarkMode  'rgba(75, 85, 99, 0.24)'  'rgba(209, 213, 219, 0.26)' },
                          ], pressed && styles.buttonPressed]}
                          onPress={() = {
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
                        
                          Text
                            style={[
                              styles.gridText,
                              isTablet && styles.gridTextTablet,
                              { color theme.text },
                              isAlreadyCounted && !shouldUseRegistrationResponseBorders && { color theme.muted },
                            ]}
                          
                            {member.idNumber}
                          Text
                          {showMemberNamesInGrid  Text style={[styles.gridSubText, { color theme.muted }]} numberOfLines={1}{member.name}Text  null}
                        Pressable
                      );
                    })}
                  View
                )}
             
            )  null}
            {!isRegistrationMode  (View style={styles.guestButtonRow}
              View style={styles.guestButtonSpacer} 
              Pressable
                onPress={() = countAttendance(attendanceMode, 'guest')}
                style={({ pressed }) = [[styles.tanzeemBtn, isTablet && styles.tanzeemBtnTablet, styles.guestButton, { backgroundColor isDarkMode  '#FFFFFF'  theme.button }, !isDarkMode && styles.guestButtonLightOutline], pressed && styles.buttonPressed]}
              
                Text style={[styles.presetBtnText, isTablet && styles.presetBtnTextTablet, { color isDarkMode  '#000000'  theme.buttonText }]}GastText
              Pressable
              View style={styles.guestButtonSpacer} 
            View)  null}
          
        ))  null}

        {!hasActiveAttendanceWindow  (
          
            Text style={[styles.noteText, { color theme.muted, textAlign 'center' }]}
              {isPrayerMode
                 (guestRequiresConfig
                   'Bitte zuerst die Local Amarat in den Einstellungen speichern.'
                   'Anwesenheit kann nur im aktiven Gebet erfasst werden (30 Minuten davor bzw. 60 Minuten danach).')
                 (isProgramMode
                   (guestRequiresConfig
                     'Bitte zuerst die Local Amarat in den Einstellungen speichern.'
                     'Programmanwesenheit kann nur bei aktivem Programm erfasst werden.')
                   (registrationLockedByLogin
                     'Anmeldung ist nur für eingeloggte Nutzer sichtbar.'
                     (registrationWindow.isUpcoming
                       `Anmeldung öffnet am ${registrationWindow.config.startDate  '—'}.`
                       'Anmeldung ist aktuell nicht aktiv.')))}
            Text
          
        )  null}

        {(hasActiveAttendanceWindow && (isPrayerMode  isProgramMode))  (
          View style={[styles.terminalInlineQrCard, { borderColor theme.border, backgroundColor theme.bg }]}
            Text style={[styles.terminalInlineQrTitle, { color theme.text }]}
              {isProgramMode  'QR Programmanwesenheit'  'QR Gebetsanwesenheit'}
            Text
            Text style={[styles.terminalInlineQrHint, { color theme.muted }]}
              {isProgramMode
                 'Direkt scannen oder manuell eintragen.'
                 'Direkt scannen oder manuell eintragen.'}
            Text
            View style={[styles.terminalInlineQrImageWrap, { borderColor theme.border, backgroundColor theme.card }]}
              {qrImageUri  (
                Image
                  source={{ uri qrImageUri }}
                  style={styles.terminalInlineQrImage}
                  resizeMode=contain
                  onLoad={() = { if (qrPendingImageUri === qrImageUri) setQrPendingImageUri(''); }}
                
              )  ActivityIndicator size=small color={theme.text} }
              {qrPendingImageUri  (
                Image
                  source={{ uri qrPendingImageUri }}
                  style={styles.qrCodePreloadImage}
                  resizeMode=contain
                  onLoad={() = { setQrImageUri(qrPendingImageUri); setQrPendingImageUri(''); }}
                
              )  null}
            View
            View style={[styles.terminalInlineQrTimerChip, { borderColor theme.border, backgroundColor isDarkMode  '#111827'  '#F9FAFB' }]}
              Text style={[styles.terminalInlineQrTimerText, { color theme.text }]}Aktualisierung in {formatQrCountdown(qrCountdownSeconds)}Text
            View
          View
        )  null}

        View style={styles.privacyNoticeWrap}
          Text style={[styles.privacyNoticeText, { color isDarkMode  'rgba(209, 213, 219, 0.72)'  'rgba(55, 65, 81, 0.72)' }]}Mitgliedsdaten werden ausschließlich zur Anwesenheitserfassung und internen Organisation verarbeitet.Text
          Pressable onPress={() = setPrivacyModalVisible(true)} style={withPressEffect(styles.privacyNoticeLinkWrap)}
            Text style={[styles.privacyNoticeLinkText, { color isDarkMode  'rgba(209, 213, 219, 0.84)'  'rgba(55, 65, 81, 0.84)' }]}Datenschutzerklärung anzeigenText
          Pressable
        View

        {shouldShowAttendanceFooter  (
          View style={styles.attendanceFooterWrap}
            Text style={[styles.attendanceFooterText, { color theme.muted }]}Local Amarat FrankfurtText
            View style={[styles.attendanceFooterDivider, { backgroundColor theme.muted }]} 
            Text style={[styles.attendanceFooterText, { color theme.muted }]}© 2026 Tehmoor Bhatti · All rights reserved.Text
          View
        )  null}
      ScrollView
    );
  };

  const renderStats = () = {
    const selectedStatsDateObj = parseISO(selectedStatsDateISO  '');
    const statsHeaderDate = statsMode === 'prayer' && selectedStatsDateObj
       germanWeekdayDateLong(selectedStatsDateObj)
       germanWeekdayDateLong(now);
    const isProgramStatsMode = statsMode === 'program';
    const isRegistrationStatsMode = statsMode === 'registration';
    const tanzeemProgramTotals = {
      ansar Number(programStats.byTanzeem.ansar)  0,
      khuddam Number(programStats.byTanzeem.khuddam)  0,
      atfal Number(programStats.byTanzeem.atfal)  0,
      kinder Number(programStats.byTanzeem.kinder)  0,
    };
    const programTotal = Number(programStats.total)  0;
    const programGuestTotal = Number(programStats.guestTotal)  0;
    const programMajlisRows = (() = {
      const filterKey = ['total', ...PROGRAM_TANZEEM_OPTIONS].includes(programMajlisFilter)  programMajlisFilter  'total';
      const directoryMembers = membersDirectory.filter((entry) = (
        filterKey === 'total'  true  entry.tanzeem === filterKey
      ));

      const registeredByMajlis = directoryMembers.reduce((acc, entry) = {
        const majlis = resolveExportMajlisLabel(entry.majlis, entry.amarat);
        if (!majlis) return acc;
        acc[majlis] = (acc[majlis]  0) + 1;
        return acc;
      }, {});

      const presentByMajlis = programAttendanceEntries
        .filter((entry) = {
          if (String(entry.idNumber  '') === 'guest') return false;
          const tanzeem = String(entry.tanzeem  '').toLowerCase();
          return filterKey === 'total'  true  tanzeem === filterKey;
        })
        .reduce((acc, entry) = {
          const majlis = resolveExportMajlisLabel(entry.majlis, entry.amarat);
          if (!majlis) return acc;
          acc[majlis] = (acc[majlis]  0) + 1;
          return acc;
        }, {});

      return Object.keys({ ...registeredByMajlis, ...presentByMajlis })
        .map((majlis) = ({
          majlis,
          present Number(presentByMajlis[majlis])  0,
          total Number(registeredByMajlis[majlis])  0,
        }))
        .sort((a, b) = (b.present - a.present)  a.majlis.localeCompare(b.majlis));
    })();

    const chartPalette = {
      total isDarkMode  '#F9FAFB'  '#111827',
      ansar '#2563EB',
      khuddam '#16A34A',
      atfal '#F59E0B',
      guest '#A855F7',
    };
    const graphRangeMode = statsGraphRange === 'selectedDate'  'selectedDate'  (statsGraphRange === 'previousWeek'  'previousWeek'  'currentWeek');
    const isSelectedDateChart = graphRangeMode === 'selectedDate';
    const activeGraphIsos = graphRangeMode === 'currentWeek'  statsWeekIsos  (graphRangeMode === 'previousWeek'  statsRollingWeekIsos  []);
    const graphWeekRows = activeGraphIsos.map((iso) = {
      const totals = getDailyTotalsForStats(weeklyAttendanceDocs[iso]);
      const dateObj = parseISO(iso);
      const weekdayShort = dateObj  new Intl.DateTimeFormat('de-DE', { weekday 'short' }).format(dateObj).replace(.$, '')  iso;
      return { iso, label dateObj  weekdayShort  iso, total totals.total, tanzeemTotals totals.tanzeemTotals };
    });
    const chartLabels = isSelectedDateChart
       STATS_PRAYER_SEQUENCE.map((item) = item.label)
       graphWeekRows.map((item) = item.label);

    const seriesCycleOptions = ['total', 'ansar', 'khuddam', 'atfal'];
    const activeSeriesKey = seriesCycleOptions.includes(statsGraphSeries)  statsGraphSeries  'total';

    const seriesConfig = {
      total {
        key 'total',
        label 'Gesamt',
        color chartPalette.total,
        thick true,
        data (isSelectedDateChart  todayGraphRows  graphWeekRows).map((row) = row.total  0),
      },
      ansar {
        key 'ansar',
        label 'Ansar',
        color chartPalette.ansar,
        data (isSelectedDateChart  todayGraphRows  graphWeekRows).map((row) = row.tanzeemTotals.ansar  0),
      },
      khuddam {
        key 'khuddam',
        label 'Khuddam',
        color chartPalette.khuddam,
        data (isSelectedDateChart  todayGraphRows  graphWeekRows).map((row) = row.tanzeemTotals.khuddam  0),
      },
      atfal {
        key 'atfal',
        label 'Atfal',
        color chartPalette.atfal,
        data (isSelectedDateChart  todayGraphRows  graphWeekRows).map((row) = row.tanzeemTotals.atfal  0),
      },
      guest {
        key 'guest',
        label 'Gäste',
        color chartPalette.guest,
        data todayGraphRows.map((row) = row.guest  0),
      },
    };

    const chartSeries = [seriesConfig[activeSeriesKey]  seriesConfig.total];
    const chartXAxisTitle = isSelectedDateChart  'Gebete'  'Tage';

    const activeSeriesLabel = chartSeries[0].label  'Gesamt';
    const activeSeriesData = chartSeries[0].data  [];
    const chartPointRows = chartLabels.map((label, index) = ({ label, value Number(activeSeriesData[index])  0 }));

    const selectedDateSeriesSummary = isSelectedDateChart && chartPointRows.length  0  (() = {
      const highest = chartPointRows.reduce((best, item) = (item.value  best.value  item  best), chartPointRows[0]);
      const lowest = chartPointRows.reduce((worst, item) = (item.value  worst.value  item  worst), chartPointRows[0]);
      const average = chartPointRows.reduce((sum, item) = sum + item.value, 0)  Math.max(1, chartPointRows.length);
      return { highest, lowest, average };
    })()  null;

    const previousCompareIsos = statsGraphRange === 'currentWeek'  statsPrevWeekIsos  (statsGraphRange === 'previousWeek'  statsWeekIsos  []);
    const previousWeekSeriesTotal = (!isSelectedDateChart)  previousCompareIsos.reduce((sum, iso) = {
      const totals = getDailyTotalsForStats(weeklyAttendanceDocs[iso]);
      if (activeSeriesKey === 'total') return sum + (totals.total  0);
      return sum + (totals.tanzeemTotals.[activeSeriesKey]  0);
    }, 0)  0;

    const weekSeriesSummary = (!isSelectedDateChart) && chartPointRows.length  0  (() = {
      const highest = chartPointRows.reduce((best, item) = (item.value  best.value  item  best), chartPointRows[0]);
      const lowest = chartPointRows.reduce((worst, item) = (item.value  worst.value  item  worst), chartPointRows[0]);
      const total = chartPointRows.reduce((sum, item) = sum + item.value, 0);
      const averagePerDay = total  Math.max(1, chartPointRows.length);
      const previousAvg = previousWeekSeriesTotal  Math.max(1, previousCompareIsos.length);
      const trendPercent = previousAvg  0  ((averagePerDay - previousAvg)  previousAvg)  100  0;
      return { highest, lowest, averagePerDay, trendPercent };
    })()  null;

    return (
      ScrollView contentContainerStyle={contentContainerStyle} showsVerticalScrollIndicator={false}
        View style={[styles.statsHeaderCard, { backgroundColor theme.card, borderColor theme.border }]}
          Pressable style={withPressEffect(styles.modeSwitch)} onPress={() = {
            if (statsMode === 'prayer') { setStatsMode('program'); return; }
            if (statsMode === 'program') { setStatsMode(currentAccount  'registration'  'prayer'); return; }
            setStatsMode('prayer');
          }}
            Text style={[styles.modeSwitchText, isTablet && styles.modeSwitchTextTablet, { color theme.text }]}
              {statsMode === 'prayer'  ' Gebetsstatistik '  (statsMode === 'program'  ' Programmstatistik '  ' Anmeldungsstatistik ')}
            Text
          Pressable
          Text style={[styles.statsHeaderTitle, { color theme.text }]}StatistikText
          Text style={[styles.statsHeaderDate, { color theme.muted }]}{statsHeaderDate}Text
          Text style={[styles.statsHeaderSubline, { color theme.muted }]}Local Amarat FrankfurtText
          View style={[styles.statsHeaderLocationChip, { backgroundColor theme.chipBg }]}Text style={[styles.statsHeaderLocationChipText, { color theme.chipText }]}{activeMosque.label}TextView
          View style={[styles.statsHeaderDivider, { backgroundColor theme.border }]} 
          {statsMode === 'prayer' && effectivePermissions.canExportData  (
            Pressable
              onPress={() = setStatsExportModalVisible(true)}
              disabled={!hasStatsExportData  statsExporting}
              style={[
                styles.statsExportBtn,
                {
                  borderColor theme.border,
                  backgroundColor (!hasStatsExportData  statsExporting)  theme.border  theme.bg,
                  opacity (!hasStatsExportData  statsExporting)  0.7  1,
                },
              ]}
            
              Text style={[styles.statsExportBtnText, { color theme.text }]}{statsExporting  'Export läuft…'  'Daten exportieren'}Text
            Pressable
          )  (isProgramStatsMode && effectivePermissions.canExportData  (
            Pressable
              onPress={handleExportProgram}
              disabled={programExporting  (!programStats.total && !Object.values(programStats.byMajlis  {}).some((v) = (Number(v)  0)  0))}
              style={[
                styles.statsExportBtn,
                {
                  borderColor theme.border,
                  backgroundColor (programExporting  (!programStats.total && !Object.values(programStats.byMajlis  {}).some((v) = (Number(v)  0)  0)))  theme.border  theme.bg,
                  opacity (programExporting  (!programStats.total && !Object.values(programStats.byMajlis  {}).some((v) = (Number(v)  0)  0)))  0.7  1,
                },
              ]}
            
              Text style={[styles.statsExportBtnText, { color theme.text }]}{programExporting  'Export läuft…'  'Daten exportieren'}Text
            Pressable
          )  (isRegistrationStatsMode && effectivePermissions.canExportData  (
            Pressable
              onPress={handleExportRegistration}
              disabled={registrationExporting  (!registrationStats.total)}
              style={[
                styles.statsExportBtn,
                {
                  borderColor theme.border,
                  backgroundColor (registrationExporting  (!registrationStats.total))  theme.border  theme.bg,
                  opacity (registrationExporting  (!registrationStats.total))  0.7  1,
                },
              ]}
            
              Text style={[styles.statsExportBtnText, { color theme.text }]}{registrationExporting  'Export läuft…'  'Daten exportieren'}Text
            Pressable
          )  null))}
        View

        {isProgramStatsMode  (
          
            Pressable
              onPress={() = {
                if (!availableProgramStatsOptions.length) return;
                setProgramStatsPickerVisible(true);
              }}
              disabled={!availableProgramStatsOptions.length}
              style={[
                styles.statsCalendarBtn,
                {
                  borderColor theme.border,
                  backgroundColor theme.bg,
                  opacity availableProgramStatsOptions.length  1  0.6,
                },
              ]}
            
              Text style={[styles.statsCalendarBtnText, { color theme.text }]}
                {selectedProgramConfigDateISO
                   `Programm auswählen · ${selectedProgramLabel}`
                   'Programm auswählen · Keine Programmdaten'}
              Text
            Pressable

            {!selectedProgramConfigDateISO  (
              View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                Text style={[styles.noteText, { color theme.muted }]}Keine Programmdaten verfügbarText
              View
            )  (
              
                View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                  Text style={[styles.statsCardTitle, { color theme.muted }]}ProgrammText
                  Text style={[styles.statsBigValue, { color theme.text }]}{selectedProgramLabel}Text
                View

              View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                Text style={[styles.statsCardTitle, { color theme.muted }]}Gesamt ProgrammanwesenheitText
                Text style={[styles.statsBigValue, { color theme.text }]}{programTotal}Text
              View

              View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                Text style={[styles.statsCardTitle, { color theme.muted }]}Tanzeem Aufteilung (Programm)Text
                View style={styles.tanzeemStatsRow}
                  {[...PROGRAM_TANZEEM_OPTIONS, 'guest'].map((key) = (
                    View key={key} style={[styles.tanzeemStatBox, { borderColor theme.border, backgroundColor theme.bg }]}
                      Text style={[styles.tanzeemStatValue, { color theme.text }]}{key === 'guest'  programGuestTotal  tanzeemProgramTotals[key]}Text
                      Text style={[styles.tanzeemStatLabel, { color theme.muted }]}{key === 'guest'  'Gäste'  TANZEEM_LABELS[key]}Text
                    View
                  ))}
                View
              View

              View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]} 
                View style={styles.statsCardHeaderRow}
                  Text style={[styles.statsCardTitle, { color theme.muted }]}{`Anwesenheit nach ${hasGuestEntriesWithoutMajlis  'Jamaat'  'Majlis'} (Programm)`}Text
                  Pressable
                    onPress={() = setProgramMajlisFilter((prev) = {
                      const options = ['total', ...PROGRAM_TANZEEM_OPTIONS];
                      const idx = options.indexOf(prev);
                      return options[(idx + 1) % options.length];
                    })}
                    style={[styles.statsCardMiniSwitch, !isTablet && styles.statsCardMiniSwitchMobile, { borderColor theme.border, backgroundColor theme.bg }]}
                  
                    Text numberOfLines={1} style={[styles.statsCardMiniSwitchText, !isTablet && styles.statsCardMiniSwitchTextMobile, { color theme.text }]}{programMajlisFilter === 'total'  'Gesamt'  TANZEEM_LABELS[programMajlisFilter]}Text
                  Pressable
                View
                {programMajlisRows.length === 0  (
                  Text style={[styles.noteText, { color theme.muted }]}Keine Programmdaten verfügbarText
                )  (
                  (() = {
                    const maxTop = Math.max(1, ...programMajlisRows.map((row) = Number(row.present)  0));
                    return programMajlisRows.map((row) = (
                      View key={row.majlis} style={styles.majlisBarRow}
                        Text style={[styles.majlisBarLabel, { color theme.text }]} numberOfLines={1}{row.majlis}Text
                        View style={[styles.majlisBarTrack, { backgroundColor theme.border }]} 
                          View style={[styles.majlisBarFill, { backgroundColor theme.button, width `${((Number(row.present)  0)  maxTop)  100}%` }]} 
                        View
                        Text numberOfLines={1} style={[styles.majlisBarValue, { color theme.text }]}{`${row.present}${row.total}`}Text
                      View
                    ));
                  })()
                )}
              View

              {effectivePermissions.canViewIdStats  (
              View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                Text style={[styles.statsCardTitle, { color theme.muted }]}Detaillierte ID-ÜbersichtText
                Pressable onPress={() = { setSelectedDetailedMember(null); setDetailedMemberLogs([]); setDetailedFlowTanzeem(''); setDetailedFlowMajlis(''); setDetailedIdSearchQuery(''); setDetailedIdOverviewVisible(true); }} style={[styles.statsDetailOpenBtn, { borderColor theme.border, backgroundColor theme.bg }]}
                  Text style={[styles.statsDetailOpenBtnText, { color theme.text }]}Übersicht öffnenText
                Pressable
              View
              )  null}
              
            )}
          
        )  isRegistrationStatsMode  (
          !currentAccount  (
            View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
              Text style={[styles.noteText, { color theme.muted }]}Anmeldungsstatistik nur für eingeloggte Nutzer sichtbar.Text
            View
          )  (
          
            Pressable
              onPress={() = {
                if (!availableRegistrationStatsOptions.length) return;
                setProgramStatsPickerVisible(true);
              }}
              disabled={!availableRegistrationStatsOptions.length}
              style={[styles.statsCalendarBtn, { borderColor theme.border, backgroundColor theme.bg, opacity availableRegistrationStatsOptions.length  1  0.6 }]}
            
              Text style={[styles.statsCalendarBtnText, { color theme.text }]}
                {selectedRegistrationStatsOption  `Anmeldung auswählen · ${selectedRegistrationStatsOption.label}`  'Anmeldung auswählen · Keine Daten'}
              Text
            Pressable
            {!selectedRegistrationStatsOption  (
              View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                Text style={[styles.noteText, { color theme.muted }]}Keine Anmeldungsdaten verfügbarText
              View
            )  (
              
                View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                  Text style={[styles.statsCardTitle, { color theme.muted }]}AnmeldungText
                  Text style={[styles.statsBigValue, { color theme.text }]}{selectedRegistrationStatsOption.name}Text
                  Text style={[styles.noteText, { color theme.muted }]}{`${selectedRegistrationStatsOption.startDate} bis ${selectedRegistrationStatsOption.endDate}`}Text
                View
                View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                  Text style={[styles.statsCardTitle, { color theme.muted }]}ZusagenText
                  Text style={[styles.statsBigValue, { color theme.text }]}{Number(registrationStats.total)  0}Text
                  Text style={[styles.noteText, { color theme.muted }]}{`Absagen ${Number(registrationStats.declineTotal)  0}`}Text
                View
                View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                  Text style={[styles.statsCardTitle, { color theme.muted }]}Tanzeem Aufteilung (Anmeldung)Text
                  View style={styles.tanzeemStatsRow}
                    {(selectedRegistrationStatsOption.advanced.includeTanzeems  []).map((key) = (
                      View key={key} style={[styles.tanzeemStatBox, { borderColor theme.border, backgroundColor theme.bg }]}
                        Text style={[styles.tanzeemStatValue, { color theme.text }]}{Number(registrationStats.byTanzeem.[key])  0}Text
                        Text style={[styles.tanzeemStatLabel, { color theme.muted }]}{TANZEEM_LABELS[key]}Text
                      View
                    ))}
                  View
                View
                View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                  Text style={[styles.statsCardTitle, { color theme.muted }]}{`Zusagen nach ${hasGuestEntriesWithoutMajlis  'Jamaat'  'Majlis'}`}Text
                  View style={styles.statsToggleRow}
                    Pressable
                      onPress={() = setRegistrationMajlisFilter((prev) = {
                        const options = ['total', ...(selectedRegistrationStatsOption.advanced.includeTanzeems  [])];
                        const idx = options.indexOf(prev);
                        return options[(idx + 1) % options.length];
                      })}
                      style={[styles.statsToggleBtn, { borderColor theme.button, backgroundColor theme.button }]}
                    
                      Text style={[styles.statsToggleBtnText, { color theme.buttonText }]}
                        {registrationMajlisFilter === 'total'  'Gesamt'  (TANZEEM_LABELS[registrationMajlisFilter]  registrationMajlisFilter)}
                      Text
                    Pressable
                  View
                  {(() = {
                    const filterKey = registrationMajlisFilter;
                    const allowedTanzeems = selectedRegistrationStatsOption.advanced.includeTanzeems  [];
                    const onlyEhlVoters = !isGuestMode && Boolean(selectedRegistrationStatsOption.advanced.onlyEhlVoters);
                    const includeAllAllowed = filterKey === 'total';
                    const registeredByMajlis = membersDirectory
                      .filter((entry) = shouldIncludeMemberInRegistrationBase(entry, allowedTanzeems, includeAllAllowed  'total'  filterKey, onlyEhlVoters))
                      .reduce((acc, entry) = {
                        const majlis = resolveExportMajlisLabel(entry.majlis, entry.amarat);
                        if (!majlis) return acc;
                        acc[majlis] = (acc[majlis]  0) + 1;
                        return acc;
                      }, {});
                    const presentByMajlis = registrationAttendanceEntries
                      .filter((entry) = {
                        const responseType = String(entry.registrationResponse  '').toLowerCase();
                        if (responseType === 'decline') return false;
                        const tanzeem = String(entry.tanzeem  '').toLowerCase();
                        if (!allowedTanzeems.includes(tanzeem)) return false;
                        return includeAllAllowed  true  tanzeem === filterKey;
                      })
                      .reduce((acc, entry) = {
                        const majlis = resolveExportMajlisLabel(entry.majlis, entry.amarat);
                        if (!majlis) return acc;
                        acc[majlis] = (acc[majlis]  0) + 1;
                        return acc;
                      }, {});
                    const rows = Array.from(new Set([...Object.keys(registeredByMajlis), ...Object.keys(presentByMajlis)]))
                      .map((majlis) = ({
                        majlis,
                        label formatMajlisName(majlis),
                        present Number(presentByMajlis[majlis])  0,
                        total Number(registeredByMajlis[majlis])  0,
                      }))
                      .sort((a, b) = (b.present - a.present)  a.label.localeCompare(b.label));
                    if (!rows.length) {
                      return Text style={[styles.noteText, { color theme.muted }]}Keine Anmeldungsdaten verfügbarText;
                    }
                    const maxTop = Math.max(1, ...rows.map((row) = Number(row.present)  0));
                    return rows.map((row) = (
                      View key={`${row.majlis}_${filterKey}`} style={styles.majlisBarRow}
                        Text style={[styles.majlisBarLabel, { color theme.text }]} numberOfLines={1}{row.label}Text
                        View style={[styles.majlisBarTrack, { backgroundColor theme.border }]}
                          View style={[styles.majlisBarFill, { backgroundColor theme.button, width `${((Number(row.present)  0)  maxTop)  100}%` }]} 
                        View
                        Text numberOfLines={1} style={[styles.majlisBarValue, { color theme.text }]}{`${row.present}${row.total}`}Text
                      View
                    ));
                  })()}
                View
                {effectivePermissions.canViewIdStats  (
                  View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                    Text style={[styles.statsCardTitle, { color theme.muted }]}Detaillierte ID-ÜbersichtText
                    Pressable onPress={() = { setSelectedDetailedMember(null); setDetailedMemberLogs([]); setDetailedFlowTanzeem(''); setDetailedFlowMajlis(''); setDetailedIdSearchQuery(''); setDetailedIdOverviewVisible(true); }} style={[styles.statsDetailOpenBtn, { borderColor theme.border, backgroundColor theme.bg }]}
                      Text style={[styles.statsDetailOpenBtnText, { color theme.text }]}Übersicht öffnenText
                    Pressable
                  View
                )  null}
              
            )}
          
          )
        )  (
          
            {(() = {
                            const selectedDateSummary = buildUniqueSummary(activeDayAttendance);
              const buildTopMajlisBreakdown = (docs) = {
                const map = {};
                docs.forEach((attendance) = {
                  const byPrayer = attendance.byPrayer  {};
                  Object.values(byPrayer).forEach((prayerNode) = {
                    const tanzeemMap = prayerNode.tanzeem  {};
                    STATS_TANZEEM_KEYS.forEach((key) = {
                      const majlis = tanzeemMap[key].majlis  {};
                      Object.entries(majlis).forEach(([loc, count]) = {
                        if (!map[loc]) map[loc] = { total 0, byTanzeem { ansar 0, khuddam 0, atfal 0 } };
                        const numericCount = Number(count)  0;
                        map[loc].total += numericCount;
                        map[loc].byTanzeem[key] += numericCount;
                      });
                    });
                  });
                });
                return Object.entries(map)
                  .map(([locationKey, value]) = ({
                    locationKey,
                    total Number(value.total)  0,
                    byTanzeem {
                      ansar Number(value.byTanzeem.ansar)  0,
                      khuddam Number(value.byTanzeem.khuddam)  0,
                      atfal Number(value.byTanzeem.atfal)  0,
                    },
                  }));
              };

              const selectedDateTopMajlis = buildTopMajlisBreakdown(activeDayAttendance  [activeDayAttendance]  []);

              const buildSummaryForIsos = (isos) = isos.reduce((acc, iso) = {
                const oneDay = buildUniqueSummary(weeklyAttendanceDocs[iso]);
                acc.total += oneDay.total;
                acc.guestTotal += oneDay.guestTotal;
                acc.tanzeemTotals.ansar += oneDay.tanzeemTotals.ansar;
                acc.tanzeemTotals.khuddam += oneDay.tanzeemTotals.khuddam;
                acc.tanzeemTotals.atfal += oneDay.tanzeemTotals.atfal;
                return acc;
              }, { total 0, guestTotal 0, tanzeemTotals { ansar 0, khuddam 0, atfal 0 } });

              const buildTopMajlisForIsos = (isos) = buildTopMajlisBreakdown(isos.map((iso) = weeklyAttendanceDocs[iso]));

              const buildPrayerTotalsForIsos = (isos) = {
                const agg = {
                  fajr { total 0, tanzeemTotals { ansar 0, khuddam 0, atfal 0 } },
                  sohar { total 0, tanzeemTotals { ansar 0, khuddam 0, atfal 0 } },
                  asr { total 0, tanzeemTotals { ansar 0, khuddam 0, atfal 0 } },
                  maghrib { total 0, tanzeemTotals { ansar 0, khuddam 0, atfal 0 } },
                  ishaa { total 0, tanzeemTotals { ansar 0, khuddam 0, atfal 0 } },
                };
                isos.forEach((iso) = {
                  const rows = getPrayerCountsForStats(weeklyAttendanceDocs[iso]);
                  rows.forEach((row) = {
                    if (!agg[row.key]) return;
                    agg[row.key].total += Number(row.total)  0;
                    agg[row.key].tanzeemTotals.ansar += Number(row.tanzeemTotals.ansar)  0;
                    agg[row.key].tanzeemTotals.khuddam += Number(row.tanzeemTotals.khuddam)  0;
                    agg[row.key].tanzeemTotals.atfal += Number(row.tanzeemTotals.atfal)  0;
                  });
                });
                return [
                  { key 'fajr', label 'Fajr (الفجر)', total agg.fajr.total, tanzeemTotals agg.fajr.tanzeemTotals },
                  { key 'sohar', label 'Sohar (الظهر)', total agg.sohar.total, tanzeemTotals agg.sohar.tanzeemTotals },
                  { key 'asr', label 'Asr (العصر)', total agg.asr.total, tanzeemTotals agg.asr.tanzeemTotals },
                  { key 'maghrib', label 'Maghrib (المغرب)', total agg.maghrib.total, tanzeemTotals agg.maghrib.tanzeemTotals },
                  { key 'ishaa', label 'Ishaa (العشاء)', total agg.ishaa.total, tanzeemTotals agg.ishaa.tanzeemTotals },
                ];
              };

              const getIsosForRange = (rangeMode) = {
                if (rangeMode === 'currentWeek') return statsWeekIsos;
                if (rangeMode === 'previousWeek') return statsRollingWeekIsos;
                return [selectedStatsDateISO];
              };

              const totalSource = statsTotalRange === 'selectedDate'  selectedDateSummary  buildSummaryForIsos(getIsosForRange(statsTotalRange));
              const tanzeemSource = statsTanzeemRange === 'selectedDate'  selectedDateSummary  buildSummaryForIsos(getIsosForRange(statsTanzeemRange));
              const topMajlisSource = statsMajlisRange === 'selectedDate'  selectedDateTopMajlis  buildTopMajlisForIsos(getIsosForRange(statsMajlisRange));
              const topMajlisFilterLabel = statsMajlisTanzeemFilter === 'total'  'Gesamt'  TANZEEM_LABELS[statsMajlisTanzeemFilter];

              const todayPrayerBars = (() = {
                if (!activeDayAttendance.byPrayer) return [];
                if (selectedStatsDateISO && selectedStatsDateISO !== todayISO) {
                  return getPrayerCountsForStats(activeDayAttendance).map((row) = ({
                    key row.key,
                    label `${row.label} (${row.key === 'fajr'  'الفجر'  row.key === 'sohar'  'الظهر'  row.key === 'asr'  'العصر'  row.key === 'maghrib'  'المغرب'  'العشاء'})`,
                    total row.total  0,
                    tanzeemTotals {
                      ansar Number(row.tanzeemTotals.ansar)  0,
                      khuddam Number(row.tanzeemTotals.khuddam)  0,
                      atfal Number(row.tanzeemTotals.atfal)  0,
                    },
                  }));
                }
                const prayerRowsByKey = getPrayerCountsForStats(activeDayAttendance).reduce((acc, row) = {
                  acc[row.key] = row;
                  return acc;
                }, {});

                const getPrayerTotal = (prayerKey) = {

                  const prayer = activeDayAttendance.byPrayer.[prayerKey]  {};
                  const guest = Number(prayer.guest)  0;
                  const tanzeem = prayer.tanzeem  {};
                  const members = ['ansar', 'khuddam', 'atfal'].reduce((sum, tanzeemKey) = {
                    const majlis = tanzeem[tanzeemKey].majlis  {};
                    return sum + Object.values(majlis).reduce((x, y) = x + (Number(y)  0), 0);
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
                  { key 'fajr', label 'Fajr (الفجر)', total getPrayerTotal('fajr'), tanzeemTotals prayerRowsByKey.fajr.tanzeemTotals  { ansar 0, khuddam 0, atfal 0 } },
                  ...(soharAsrMergedToday
                     [{ key 'sohar_asr', label 'SoharAsr (الظهرالعصر)', total soharAsrCarryValue, tanzeemTotals { ansar 0, khuddam 0, atfal 0 } }]
                     [
                      { key 'sohar', label 'Sohar (الظهر)', total hasSoharAsrOverrideToday  soharAsrCarryValue  soharTotalRaw, tanzeemTotals prayerRowsByKey.sohar.tanzeemTotals  { ansar 0, khuddam 0, atfal 0 } },
                      { key 'asr', label 'Asr (العصر)', total hasSoharAsrOverrideToday  soharAsrCarryValue  asrTotalRaw, tanzeemTotals prayerRowsByKey.asr.tanzeemTotals  { ansar 0, khuddam 0, atfal 0 } },
                    ]),
                  ...(maghribIshaaMergedToday
                     [{ key 'maghrib_ishaa', label 'MaghribIshaa (المغربالعشاء)', total maghribIshaaCarryValue, tanzeemTotals { ansar 0, khuddam 0, atfal 0 } }]
                     [
                      { key 'maghrib', label 'Maghrib (المغرب)', total hasMaghribIshaaOverrideToday  maghribIshaaCarryValue  maghribTotalRaw, tanzeemTotals prayerRowsByKey.maghrib.tanzeemTotals  { ansar 0, khuddam 0, atfal 0 } },
                      { key 'ishaa', label 'Ishaa (العشاء)', total hasMaghribIshaaOverrideToday  maghribIshaaCarryValue  ishaaTotalRaw, tanzeemTotals prayerRowsByKey.ishaa.tanzeemTotals  { ansar 0, khuddam 0, atfal 0 } },
                    ]),
                ];
              })();

              const prayerBars = statsPrayerRange === 'selectedDate'  todayPrayerBars  buildPrayerTotalsForIsos(getIsosForRange(statsPrayerRange));
              const prayerLineLabels = prayerBars.map((item) = item.label.split(' (')[0]);
              const prayerSeriesLabel = statsPrayerSeries === 'total'  'Gesamt'  TANZEEM_LABELS[statsPrayerSeries];
              const prayerSeriesColorMap = {
                total chartPalette.total,
                ansar chartPalette.ansar,
                khuddam chartPalette.khuddam,
                atfal chartPalette.atfal,
              };
              const prayerLineSeries = [{
                key 'prayerTotals',
                label `Anzahl der Gebete nach Gebetszeiten · ${prayerSeriesLabel}`,
                color prayerSeriesColorMap[statsPrayerSeries]  theme.button,
                thick true,
                data prayerBars.map((item) = (statsPrayerSeries === 'total'  (Number(item.total)  0)  (Number(item.tanzeemTotals.[statsPrayerSeries])  0))),
              }];
              const prayerRangeValueLabel = statsPrayerRange === 'currentWeek'
                 currentWeekLabel
                 (statsPrayerRange === 'previousWeek'  'Letzte Woche'  selectedStatsDateLabel);
              const prayerPointRows = prayerLineLabels.map((label, index) = ({ label, value Number(prayerLineSeries[0].data.[index])  0 }));
              const prayerSummary = prayerPointRows.length  0  (() = {
                const highest = prayerPointRows.reduce((best, item) = (item.value  best.value  item  best), prayerPointRows[0]);
                const lowest = prayerPointRows.reduce((worst, item) = (item.value  worst.value  item  worst), prayerPointRows[0]);
                const averagePerPrayer = prayerPointRows.reduce((sum, item) = sum + item.value, 0)  Math.max(1, prayerPointRows.length);
                return { highest, lowest, averagePerPrayer };
              })()  null;
              const prayerCompareRange = statsPrayerRange === 'currentWeek'  'previousWeek'  (statsPrayerRange === 'previousWeek'  'currentWeek'  null);
              const comparePrayerBars = prayerCompareRange  buildPrayerTotalsForIsos(getIsosForRange(prayerCompareRange))  [];
              const comparePrayerValues = comparePrayerBars.map((item) = (statsPrayerSeries === 'total'  (Number(item.total)  0)  (Number(item.tanzeemTotals.[statsPrayerSeries])  0)));
              const comparePrayerAverage = comparePrayerValues.reduce((sum, val) = sum + (Number(val)  0), 0)  Math.max(1, comparePrayerValues.length  1);
              const prayerTrendPercent = prayerSummary && prayerCompareRange && comparePrayerAverage  0
                 ((prayerSummary.averagePerPrayer - comparePrayerAverage)  comparePrayerAverage)  100
                 null;

              return (
                
                  {(statsTotalRange === 'currentWeek'  statsTanzeemRange === 'currentWeek'  statsMajlisRange === 'currentWeek'  statsPrayerRange === 'currentWeek'  statsGraphRange === 'currentWeek')  (
                    Pressable onPress={() = setStatsWeekModalVisible(true)} style={[styles.statsCalendarBtn, { borderColor theme.border, backgroundColor theme.bg }]}
                      Text style={[styles.statsCalendarBtnText, { color theme.text }]}{`KW auswählen · ${currentWeekLabel}`}Text
                    Pressable
                  )  null}
                  {(statsTotalRange === 'selectedDate'  statsTanzeemRange === 'selectedDate'  statsMajlisRange === 'selectedDate'  statsPrayerRange === 'selectedDate'  statsGraphRange === 'selectedDate')  (
                    Pressable onPress={() = setStatsCalendarVisible(true)} style={[styles.statsCalendarBtn, { borderColor theme.border, backgroundColor theme.bg }]}
                      Text style={[styles.statsCalendarBtnText, { color theme.text }]}Datum auswählen · {selectedStatsDateLabel}Text
                    Pressable
                  )  null}
                  View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                    View style={styles.statsCardHeaderRow}
                      View
                        Text style={[styles.statsCardTitle, { color theme.muted }]}Gesamt AnwesendeText
                        Text style={[styles.statsCardRangeInfo, { color theme.muted }]}{formatRangeLabel(statsTotalRange)}Text
                      View
                      Pressable onPress={() = setStatsTotalRange(cycleStatsRangeMode)} style={[styles.statsCardMiniSwitch, !isTablet && styles.statsCardMiniSwitchMobile, { borderColor theme.border, backgroundColor theme.bg }]}
                        Text numberOfLines={1} style={[styles.statsCardMiniSwitchText, !isTablet && styles.statsCardMiniSwitchTextMobile, { color theme.text }]}{getRangeToggleLabel(statsTotalRange)}Text
                      Pressable
                    View
                    Text style={[styles.statsBigValue, { color theme.text }]}{totalSource.total}Text
                  View

                  View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                    View style={styles.statsCardHeaderRow}
                      View
                        Text style={[styles.statsCardTitle, { color theme.muted }]}Tanzeem AufteilungText
                        Text style={[styles.statsCardRangeInfo, { color theme.muted }]}{formatRangeLabel(statsTanzeemRange)}Text
                      View
                      Pressable onPress={() = setStatsTanzeemRange(cycleStatsRangeMode)} style={[styles.statsCardMiniSwitch, !isTablet && styles.statsCardMiniSwitchMobile, { borderColor theme.border, backgroundColor theme.bg }]}
                        Text numberOfLines={1} style={[styles.statsCardMiniSwitchText, !isTablet && styles.statsCardMiniSwitchTextMobile, { color theme.text }]}{getRangeToggleLabel(statsTanzeemRange)}Text
                      Pressable
                    View
                    View style={styles.tanzeemStatsRow}
                      {['ansar', 'khuddam', 'atfal'].map((key) = (
                        View key={key} style={[styles.tanzeemStatBox, { borderColor theme.border, backgroundColor theme.bg }]}
                          Text style={[styles.tanzeemStatValue, { color theme.text }]}{tanzeemSource.tanzeemTotals[key]  0}Text
                          Text style={[styles.tanzeemStatLabel, { color theme.muted }]}{TANZEEM_LABELS[key]}Text
                        View
                      ))}
                      View style={[styles.tanzeemStatBox, { borderColor theme.border, backgroundColor theme.bg }]}
                        Text style={[styles.tanzeemStatValue, { color theme.text }]}{tanzeemSource.guestTotal  0}Text
                        Text style={[styles.tanzeemStatLabel, { color theme.muted }]}GästeText
                      View
                    View
                  View

                  View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                    Text style={[styles.statsCardTitle, { color theme.muted }]}Anzahl der Gebete nach GebetszeitenText
                    Text style={[styles.statsCardRangeInfo, { color theme.muted }]}{formatRangeLabel(statsPrayerRange)}Text
                    View style={styles.statsToggleRow}
                      View style={[styles.statsCycler, { backgroundColor theme.bg, borderColor theme.border }]} 
                        Pressable
                          onPress={() = {
                            setStatsPrayerRange((prev) = {
                              const options = ['currentWeek', 'previousWeek', 'selectedDate'];
                              const idx = options.indexOf(prev);
                              return options[(idx - 1 + options.length) % options.length];
                            });
                            setStatsPrayerSeries('total');
                          }}
                          style={styles.statsCyclerArrowBtn}
                        
                          Text style={[styles.statsCyclerArrow, { color theme.text }]}{''}Text
                        Pressable
                        Text style={[styles.statsCyclerValue, { color theme.text }]}{prayerRangeValueLabel}Text
                        Pressable
                          onPress={() = {
                            setStatsPrayerRange((prev) = {
                              const options = ['currentWeek', 'previousWeek', 'selectedDate'];
                              const idx = options.indexOf(prev);
                              return options[(idx + 1) % options.length];
                            });
                            setStatsPrayerSeries('total');
                          }}
                          style={styles.statsCyclerArrowBtn}
                        
                          Text style={[styles.statsCyclerArrow, { color theme.text }]}{''}Text
                        Pressable
                      View
                    View
                    View style={styles.statsToggleRow}
                      View style={[styles.statsCycler, { backgroundColor theme.bg, borderColor theme.border }]} 
                        Pressable
                          onPress={() = setStatsPrayerSeries((prev) = {
                            const options = ['total', 'ansar', 'khuddam', 'atfal'];
                            const idx = options.indexOf(prev);
                            return options[(idx - 1 + options.length) % options.length];
                          })}
                          style={styles.statsCyclerArrowBtn}
                        
                          Text style={[styles.statsCyclerArrow, { color theme.text }]}{''}Text
                        Pressable
                        Text style={[styles.statsCyclerValue, { color theme.text }]}{prayerSeriesLabel}Text
                        Pressable
                          onPress={() = setStatsPrayerSeries((prev) = {
                            const options = ['total', 'ansar', 'khuddam', 'atfal'];
                            const idx = options.indexOf(prev);
                            return options[(idx + 1) % options.length];
                          })}
                          style={styles.statsCyclerArrowBtn}
                        
                          Text style={[styles.statsCyclerArrow, { color theme.text }]}{''}Text
                        Pressable
                      View
                    View
                    MiniLineChart
                      labels={prayerLineLabels}
                      series={prayerLineSeries}
                      theme={theme}
                      isDarkMode={isDarkMode}
                      xAxisTitle=Gebete
                      useEqualLabelSlots
                      pointLabelFormatter={({ label, value }) = `${label}, ${Number(value)  0} Gebete`}
                    
                    {prayerSummary  (
                      View style={styles.statsInsightWrap}
                        Text style={[styles.statsInsightText, { color theme.text }]}Durchschnitt pro Gebet ({prayerSeriesLabel}) {prayerSummary.averagePerPrayer.toFixed(1)}Text
                        Text style={[styles.statsInsightText, { color theme.text }]}Höchstes Gebet ({prayerSeriesLabel}) {prayerSummary.highest.label} ({prayerSummary.highest.value})Text
                        Text style={[styles.statsInsightText, { color theme.text }]}Niedrigstes Gebet ({prayerSeriesLabel}) {prayerSummary.lowest.label} ({prayerSummary.lowest.value})Text
                        {prayerTrendPercent !== null  (
                          Text style={[styles.statsInsightText, { color theme.text }]}Trend vs. {statsPrayerRange === 'currentWeek'  'letzte Woche'  'aktuelle Woche'} ({prayerSeriesLabel}) {prayerTrendPercent = 0  '+'  ''}{prayerTrendPercent.toFixed(1)}%Text
                        )  null}
                      View
                    )  null}
                    {prayerBars.length === 0  (
                      Text style={[styles.noteText, { color theme.muted }]}Noch keine Anwesenheit für {statsPrayerRange === 'selectedDate'  'dieses Datum'  'diesen Zeitraum'}Text
                    )  null}
                  View

                  View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                    Text style={[styles.statsCardTitle, { color theme.muted }]}Anzahl der Gebete nach TageText
                    View style={styles.statsToggleRow}
                      View style={[styles.statsCycler, { backgroundColor theme.bg, borderColor theme.border }]}
                        Pressable
                          onPress={() = { setStatsGraphRange((prev) = { const options = ['currentWeek', 'previousWeek', 'selectedDate']; const idx = options.indexOf(prev); return options[(idx - 1 + options.length) % options.length]; }); setStatsGraphSeries('total'); }}
                          style={styles.statsCyclerArrowBtn}
                        
                          Text style={[styles.statsCyclerArrow, { color theme.text }]}{''}Text
                        Pressable
                        Text style={[styles.statsCyclerValue, { color theme.text }]}{statsGraphRange === 'currentWeek'  currentWeekLabel  (statsGraphRange === 'previousWeek'  'Letzte Woche'  selectedStatsDateLabel)}Text
                        Pressable
                          onPress={() = { setStatsGraphRange((prev) = { const options = ['currentWeek', 'previousWeek', 'selectedDate']; const idx = options.indexOf(prev); return options[(idx + 1) % options.length]; }); setStatsGraphSeries('total'); }}
                          style={styles.statsCyclerArrowBtn}
                        
                          Text style={[styles.statsCyclerArrow, { color theme.text }]}{''}Text
                        Pressable
                      View
                    View
                    View style={styles.statsToggleRow}
                      View style={[styles.statsCycler, { backgroundColor theme.bg, borderColor theme.border }]}
                        Pressable
                          onPress={() = setStatsGraphSeries((prev) = {
                            const options = ['total', 'ansar', 'khuddam', 'atfal'];
                            const idx = options.indexOf(prev);
                            return options[(idx - 1 + options.length) % options.length];
                          })}
                          style={styles.statsCyclerArrowBtn}
                        
                          Text style={[styles.statsCyclerArrow, { color theme.text }]}{''}Text
                        Pressable
                        Text style={[styles.statsCyclerValue, { color theme.text }]}{chartSeries[0].label  'Gesamt'}Text
                        Pressable
                          onPress={() = setStatsGraphSeries((prev) = {
                            const options = ['total', 'ansar', 'khuddam', 'atfal'];
                            const idx = options.indexOf(prev);
                            return options[(idx + 1) % options.length];
                          })}
                          style={styles.statsCyclerArrowBtn}
                        
                          Text style={[styles.statsCyclerArrow, { color theme.text }]}{''}Text
                        Pressable
                      View
                    View

                    MiniLineChart labels={chartLabels} series={chartSeries} theme={theme} isDarkMode={isDarkMode} xAxisTitle={chartXAxisTitle} 

                    {false && selectedDateSeriesSummary  (
                      View style={styles.statsInsightWrap}
                        Text style={[styles.statsInsightText, { color theme.text }]}Höchstes Gebet ({activeSeriesLabel}) {selectedDateSeriesSummary.highest.label} ({selectedDateSeriesSummary.highest.value})Text
                        Text style={[styles.statsInsightText, { color theme.text }]}Schwächstes Gebet ({activeSeriesLabel}) {selectedDateSeriesSummary.lowest.label} ({selectedDateSeriesSummary.lowest.value})Text
                        Text style={[styles.statsInsightText, { color theme.text }]}Durchschnitt pro Gebet ({activeSeriesLabel}) {selectedDateSeriesSummary.average.toFixed(1)}Text
                      View
                    )  null}

                    {weekSeriesSummary  (
                      View style={styles.statsInsightWrap}
                        Text style={[styles.statsInsightText, { color theme.text }]}Durchschnitt pro Tag ({activeSeriesLabel}) {weekSeriesSummary.averagePerDay.toFixed(1)}Text
                        Text style={[styles.statsInsightText, { color theme.text }]}Höchster Tag ({activeSeriesLabel}) {weekSeriesSummary.highest.label} ({weekSeriesSummary.highest.value})Text
                        Text style={[styles.statsInsightText, { color theme.text }]}Niedrigster Tag ({activeSeriesLabel}) {weekSeriesSummary.lowest.label} ({weekSeriesSummary.lowest.value})Text
                        Text style={[styles.statsInsightText, { color theme.text }]}Trend vs. vorherige 7 Tage ({activeSeriesLabel}) {weekSeriesSummary.trendPercent = 0  '+'  ''}{weekSeriesSummary.trendPercent.toFixed(1)}%Text
                      View
                    )  null}

                    {weeklyStatsLoading  Text style={[styles.noteText, { color theme.muted }]}Wochendaten werden aktualisiert…Text  null}
                  View

                  View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                    View style={styles.statsCardHeaderRow}
                      View
                        Text style={[styles.statsCardTitle, { color theme.muted }]}{`Anzahl der Gebete nach ${hasGuestEntriesWithoutMajlis  'Jamaat'  'Majlis'}`}Text
                        Text style={[styles.statsCardRangeInfo, { color theme.muted }]}{formatRangeLabel(statsMajlisRange)}Text
                      View
                    View
                    View style={styles.statsToggleRow}
                      View style={[styles.statsCycler, { backgroundColor theme.bg, borderColor theme.border }]}
                        Pressable
                          onPress={() = {
                            setStatsMajlisRange((prev) = {
                              const options = ['currentWeek', 'previousWeek', 'selectedDate'];
                              const idx = options.indexOf(prev);
                              return options[(idx - 1 + options.length) % options.length];
                            });
                            setStatsMajlisShowAll(false);
                          }}
                          style={styles.statsCyclerArrowBtn}
                        
                          Text style={[styles.statsCyclerArrow, { color theme.text }]}{''}Text
                        Pressable
                        Text style={[styles.statsCyclerValue, { color theme.text }]}{statsMajlisRange === 'currentWeek'  currentWeekLabel  (statsMajlisRange === 'previousWeek'  'Letzte Woche'  selectedStatsDateLabel)}Text
                        Pressable
                          onPress={() = {
                            setStatsMajlisRange((prev) = {
                              const options = ['currentWeek', 'previousWeek', 'selectedDate'];
                              const idx = options.indexOf(prev);
                              return options[(idx + 1) % options.length];
                            });
                            setStatsMajlisShowAll(false);
                          }}
                          style={styles.statsCyclerArrowBtn}
                        
                          Text style={[styles.statsCyclerArrow, { color theme.text }]}{''}Text
                        Pressable
                      View
                    View
                    View style={styles.statsToggleRow}
                      View style={[styles.statsCycler, { backgroundColor theme.bg, borderColor theme.border }]}
                        Pressable
                          onPress={() = {
                            setStatsMajlisTanzeemFilter((prev) = {
                              const options = ['total', 'ansar', 'khuddam', 'atfal'];
                              const idx = options.indexOf(prev);
                              return options[(idx - 1 + options.length) % options.length];
                            });
                            setStatsMajlisShowAll(false);
                          }}
                          style={styles.statsCyclerArrowBtn}
                        
                          Text style={[styles.statsCyclerArrow, { color theme.text }]}{''}Text
                        Pressable
                        Text style={[styles.statsCyclerValue, { color theme.text }]}{topMajlisFilterLabel}Text
                        Pressable
                          onPress={() = {
                            setStatsMajlisTanzeemFilter((prev) = {
                              const options = ['total', 'ansar', 'khuddam', 'atfal'];
                              const idx = options.indexOf(prev);
                              return options[(idx + 1) % options.length];
                            });
                            setStatsMajlisShowAll(false);
                          }}
                          style={styles.statsCyclerArrowBtn}
                        
                          Text style={[styles.statsCyclerArrow, { color theme.text }]}{''}Text
                        Pressable
                      View
                    View
                    {topMajlisSource.length === 0  (
                      Text style={[styles.noteText, { color theme.muted }]}Noch keine Anwesenheit für {statsMajlisRange === 'selectedDate'  'dieses Datum'  'diesen Zeitraum'}Text
                    )  (
                      (() = {
                        const getMajlisCount = (row) = {
                          if (statsMajlisTanzeemFilter === 'total') return Number(row.total)  0;
                          return Number(row.byTanzeem.[statsMajlisTanzeemFilter])  0;
                        };
                        const sortedRows = [...topMajlisSource]
                          .map((row) = ({ ...row, currentCount getMajlisCount(row) }))
                          .sort((a, b) = b.currentCount - a.currentCount  String(a.locationKey).localeCompare(String(b.locationKey)));
                        const visibleRows = statsMajlisShowAll  sortedRows  sortedRows.slice(0, 10);
                        const maxTop = Math.max(1, ...visibleRows.map((row) = row.currentCount));
                        return (
                          
                            {visibleRows.map((row) = {
                              const count = row.currentCount;
                              return (
                                View key={row.locationKey} style={styles.majlisBarRow}
                                  Text style={[styles.majlisBarLabel, { color theme.text }]} numberOfLines={1}{formatMajlisName(row.locationKey)}Text
                                  View style={[styles.majlisBarTrack, { backgroundColor theme.border }]}
                                    View style={[styles.majlisBarFill, { backgroundColor theme.button, width `${(count  maxTop)  100}%` }]} 
                                  View
                                  Text style={[styles.majlisBarValue, { color theme.text }]}{count}Text
                                View
                              );
                            })}
                            {sortedRows.length  10  (
                              Pressable
                                onPress={() = setStatsMajlisShowAll((prev) = !prev)}
                                style={[styles.statsDetailOpenBtn, { borderColor theme.border, backgroundColor theme.bg, marginTop 10 }]}
                              
                                Text style={[styles.statsDetailOpenBtnText, { color theme.text }]}{statsMajlisShowAll  'Weniger anzeigen'  `Mehr anzeigen (${sortedRows.length - 10} weitere)`}Text
                              Pressable
                            )  null}
                          
                        );
                      })()
                    )}
                  View

                  {currentAccount  (
                  View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                    Text style={[styles.statsCardTitle, { color theme.muted }]}Wochen Ranking (Gebete)Text
                    Text style={[styles.statsCardRangeInfo, { color theme.muted }]}{formatRangeLabel(statsWeekRankingRange)}Text
                    View style={styles.statsToggleRow}
                      View style={[styles.statsCycler, { backgroundColor theme.bg, borderColor theme.border }]} 
                        Pressable
                          onPress={() = setStatsWeekRankingRange((prev) = (prev === 'currentWeek'  'previousWeek'  'currentWeek'))}
                          style={styles.statsCyclerArrowBtn}
                        
                          Text style={[styles.statsCyclerArrow, { color theme.text }]}{''}Text
                        Pressable
                        Text style={[styles.statsCyclerValue, { color theme.text }]}{statsWeekRankingRange === 'currentWeek'  currentWeekLabel  'Letzte Woche'}Text
                        Pressable
                          onPress={() = setStatsWeekRankingRange((prev) = (prev === 'currentWeek'  'previousWeek'  'currentWeek'))}
                          style={styles.statsCyclerArrowBtn}
                        
                          Text style={[styles.statsCyclerArrow, { color theme.text }]}{''}Text
                        Pressable
                      View
                    View
                    View style={styles.statsToggleRow}
                      View style={[styles.statsCycler, { backgroundColor theme.bg, borderColor theme.border }]} 
                        Pressable
                          onPress={() = setStatsWeekRankingFilter((prev) = {
                            const options = ['total', 'ansar', 'khuddam', 'atfal'];
                            const idx = options.indexOf(prev);
                            return options[(idx - 1 + options.length) % options.length];
                          })}
                          style={styles.statsCyclerArrowBtn}
                        
                          Text style={[styles.statsCyclerArrow, { color theme.text }]}{''}Text
                        Pressable
                        Text style={[styles.statsCyclerValue, { color theme.text }]}{statsWeekRankingFilter === 'total'  'Gesamt'  TANZEEM_LABELS[statsWeekRankingFilter]}Text
                        Pressable
                          onPress={() = setStatsWeekRankingFilter((prev) = {
                            const options = ['total', 'ansar', 'khuddam', 'atfal'];
                            const idx = options.indexOf(prev);
                            return options[(idx + 1) % options.length];
                          })}
                          style={styles.statsCyclerArrowBtn}
                        
                          Text style={[styles.statsCyclerArrow, { color theme.text }]}{''}Text
                        Pressable
                      View
                    View
                    {weekRankingRows.length === 0  (
                      Text style={[styles.noteText, { color theme.muted }]}Keine Daten für diesen ZeitraumText
                    )  (() = {
                      const maxRankCount = Math.max(1, ...weekRankingRows.map((row) = row.count  0));
                      let currentRank = 0;
                      let previousCount = null;
                      return weekRankingRows.map((row) = {
                        const tanzeemLabel = TANZEEM_LABELS[row.tanzeem]  (row.tanzeem  row.tanzeem.charAt(0).toUpperCase() + row.tanzeem.slice(1)  '—');
                        const majlisLabel = resolveExportMajlisLabel(row.majlis);
                        const descriptor = statsWeekRankingFilter === 'total'
                           `${row.idNumber} (${tanzeemLabel} · ${majlisLabel})`
                           `${row.idNumber} (${majlisLabel})`;
                        if (previousCount !== row.count) {
                          currentRank += 1;
                          previousCount = row.count;
                        }
                        return (
                          View key={`${row.idNumber}_${row.count}`} style={styles.barRow}
                            Text style={[styles.statsRankingBarLabel, { color theme.text }]} numberOfLines={1}{`${currentRank}. ${descriptor}`}Text
                            View style={[styles.barTrack, { backgroundColor theme.border }]}
                              View style={[styles.barFill, { backgroundColor theme.button, width `${((row.count  0)  maxRankCount)  100}%` }]} 
                            View
                            Text style={[styles.barValue, { color theme.text }]}{row.count}Text
                          View
                        );
                      });
                    })()}
                  View
                  )  null}

                  {effectivePermissions.canViewIdStats  (
                  View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]} 
                    Text style={[styles.statsCardTitle, { color theme.muted }]}Detaillierte ID-ÜbersichtText
                    Pressable onPress={() = { setSelectedDetailedMember(null); setDetailedMemberLogs([]); setDetailedFlowTanzeem(''); setDetailedFlowMajlis(''); setDetailedIdSearchQuery(''); setDetailedIdOverviewVisible(true); }} style={[styles.statsDetailOpenBtn, { borderColor theme.border, backgroundColor theme.bg }]}
                      Text style={[styles.statsDetailOpenBtnText, { color theme.text }]}Übersicht öffnenText
                    Pressable
                  View
                  )  null}
                
              );
            })()}
          
        )}
      ScrollView
    );
  };

  const renderSettings = () = {
    const settingsDate = germanDateLong(overrideDisplayDate);
    const programSettingsDate = germanDateLong(now);
    const mosqueOptionsForSelection = isGuestMode
       MOSQUE_OPTIONS.filter((option) = option.key === EXTERNAL_MOSQUE_KEY)
       MOSQUE_OPTIONS.filter((option) = option.key !== EXTERNAL_MOSQUE_KEY);
    if (false && isGuestMode) {
      return (
        ScrollView contentContainerStyle={contentContainerStyle} showsVerticalScrollIndicator={false}
          View style={[styles.settingsMosqueHighlightCard, { backgroundColor theme.chipBg, borderColor theme.rowActiveBorder }]}
            Text style={[styles.settingsMosqueHighlightTitle, { color theme.chipText }]}Externe MoscheeText
            Text style={[styles.settingsMosqueHighlightValue, { color theme.chipText }]}{guestActivation.mosqueName  'Nicht gesetzt'}Text
          View
          View style={[styles.settingsHeroCard, { backgroundColor theme.card }]}
            Text style={[styles.settingsHeroTitle, { color theme.text }]}Local Amarat  MoscheeText
            TextInput value={externalMosqueNameInput} onChangeText={setExternalMosqueNameInput} placeholder=z. B. Hamburg placeholderTextColor={theme.muted} autoCapitalize=words style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
            Pressable
              style={({ pressed }) = [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor theme.button, opacity externalConfigSaving  0.7  1 }], pressed && styles.buttonPressed]}
              disabled={externalConfigSaving}
              onPress={async () = {
                const cleanName = String(externalMosqueNameInput  '').trim();
                if (!cleanName) { setToast('Bitte zuerst die Local Amarat speichern.'); return; }
                const scopeKey = normalizeExternalScopeKey(cleanName);
                const accountNameKey = currentAccount.nameKey  normalizeAccountNameKey(currentAccount.name  '')  scopeKey;
                const nextActivation = {
                  accountNameKey,
                  mosqueName cleanName,
                  scopeKey,
                  multipleMajalis currentAccount.externalMultipleMajalis !== false,
                  showNames Boolean(currentAccount.externalShowNames),
                };
                try {
                  setExternalConfigSaving(true);
                  await AsyncStorage.setItem(STORAGE_KEYS.guestActivation, JSON.stringify(nextActivation));
                  setGuestActivation(nextActivation);
                  await setGlobalDocData(EXTERNAL_CONFIG_COLLECTION, `${nextActivation.accountNameKey}`, {
                    ...nextActivation,
                    updatedAt new Date().toISOString(),
                  }).catch(() = {});
                  if (currentAccount.nameKey) {
                    await setGlobalDocData(ADMIN_EXTERNAL_ACCOUNTS_COLLECTION, currentAccount.nameKey, {
                      ...buildExternalAccountWritePayload(currentAccount),
                      externalMosqueName cleanName,
                      updatedAt new Date().toISOString(),
                    }).catch(() = {});
                  }
                  setToast('Externe Moschee gespeichert ✓');
                } finally {
                  setExternalConfigSaving(false);
                }
              }}
            
              Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.buttonText }]}{externalConfigSaving  'Speichert…'  'Speichern'}Text
            Pressable
          View
        ScrollView
      );
    }

    return (
    ScrollView contentContainerStyle={contentContainerStyle} showsVerticalScrollIndicator={false}
      {!isGuestMode  (
        View style={[styles.settingsMosqueHighlightCard, { backgroundColor theme.chipBg, borderColor theme.rowActiveBorder }]} 
          Text style={[styles.settingsMosqueHighlightTitle, { color theme.chipText }]}Aktive MoscheeText
          Text style={[styles.settingsMosqueHighlightValue, { color theme.chipText }]}{activeMosque.label}Text
        View
      )  null}

      View style={[styles.section, { backgroundColor theme.card, borderColor theme.border }]} 
        View style={styles.switchRow}Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, { color theme.text }]}Dark ModeTextSwitch value={isDarkMode} onValueChange={onToggleDarkMode} View
      View

      {!isGuestMode  (
      View style={[styles.section, styles.activeMosqueSection, { backgroundColor theme.card, borderColor theme.border }]} 
        Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, styles.activeMosqueSectionTitle, { color theme.text }]}Aktive MoscheeText
        Text style={[styles.noteText, styles.activeMosqueSectionCurrent, { color theme.muted }]}{activeMosque.label}Text
        View style={[styles.statsToggleRow, styles.activeMosqueToggleRow]}
          {mosqueOptionsForSelection.map((option) = {
            const isActive = activeMosqueKey === option.key;
            return (
              Pressable
                key={option.key}
                onPress={() = onSelectMosque(option.key)}
                style={[styles.statsToggleBtn, { borderColor isActive  theme.button  theme.border, backgroundColor isActive  theme.button  theme.bg }]}
              
                Text style={[styles.statsToggleBtnText, { color isActive  theme.buttonText  theme.text }]}{option.label}Text
              Pressable
            );
          })}
        View
        {canPersistMosquePreference  (
          Pressable
            style={({ pressed }) = [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor theme.button, opacity mosquePreferenceSaving  0.7  1 }], pressed && styles.buttonPressed]}
            onPress={saveMosquePreference}
            disabled={mosquePreferenceSaving}
          
            Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.buttonText }]}{mosquePreferenceSaving  'Speichert…'  'Speichern'}Text
          Pressable
        )  null}
      View
      )  null}

      {(normalizedAppMode === 'full'  isGuestMode)  (
        View style={[styles.settingsHeroCard, { backgroundColor theme.card }]}
          Text style={[styles.settingsHeroTitle, { color theme.text }]}Kiosk Inactivity ResetText
          Text style={[styles.settingsHeroMeta, { color theme.muted }]}Automatischer Rücksprung zur Anwesenheit bei Inaktivität.Text

          View style={styles.mergeSwitchWrap}
            Text style={[styles.mergeSwitchLabel, { color theme.text }]}Funktion aktivierenText
            Switch value={terminalInactivityEnabledInput} onValueChange={setTerminalInactivityEnabledInput} 
          View

          View style={styles.mergeInputWrap}
            TextInput
              value={terminalInactivityTimeoutInput}
              onChangeText={(value) = setTerminalInactivityTimeoutInput(String(value  '').replace([^0-9]g, ''))}
              placeholder=Timeout in Sekunden (mind. 15)
              placeholderTextColor={theme.muted}
              keyboardType=number-pad
              inputMode=numeric
              autoCapitalize=none
              style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]}
            
          View

          View style={styles.statsToggleRow}
            Pressable
              onPress={() = setTerminalInactivityScopeInput('global')}
              style={[styles.statsToggleBtn, { borderColor terminalInactivityScopeInput === 'global'  theme.button  theme.border, backgroundColor terminalInactivityScopeInput === 'global'  theme.button  theme.bg }]}
            
              Text style={[styles.statsToggleBtnText, { color terminalInactivityScopeInput === 'global'  theme.buttonText  theme.text }]}GlobalText
            Pressable
            Pressable
              onPress={() = setTerminalInactivityScopeInput('device')}
              style={[styles.statsToggleBtn, { borderColor terminalInactivityScopeInput === 'device'  theme.button  theme.border, backgroundColor terminalInactivityScopeInput === 'device'  theme.button  theme.bg }]}
            
              Text style={[styles.statsToggleBtnText, { color terminalInactivityScopeInput === 'device'  theme.buttonText  theme.text }]}Nur dieses GerätText
            Pressable
          View

          Text style={[styles.noteText, { color theme.muted }]}Aktiv nur bei offenem Gebets-Programmfenster und wenn niemand eingeloggt ist.Text

          Pressable
            style={({ pressed }) = [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor theme.button, opacity terminalInactivitySaving  0.7  1 }], pressed && styles.buttonPressed]}
            disabled={terminalInactivitySaving}
            onPress={saveTerminalInactivityConfig}
          
            Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.buttonText }]}{terminalInactivitySaving  'Speichert…'  'Speichern'}Text
          Pressable
        View
      )  null}

      {isGuestMode  (
        View style={[styles.settingsHeroCard, { backgroundColor theme.card }]}
          Text style={[styles.settingsHeroTitle, { color theme.text }]}Local Amarat  MoscheeText
          Text style={[styles.settingsHeroMeta, { color theme.muted }]}Pflichtfeld für externen ModusText
          TextInput value={externalMosqueNameInput} onChangeText={setExternalMosqueNameInput} placeholder=z. B. Hamburg placeholderTextColor={theme.muted} autoCapitalize=words style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
          Pressable
            style={({ pressed }) = [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor theme.button, opacity externalConfigSaving  0.7  1 }], pressed && styles.buttonPressed]}
            disabled={externalConfigSaving}
            onPress={async () = {
              const cleanName = String(externalMosqueNameInput  '').trim();
              if (!cleanName) { setToast('Bitte zuerst die Local Amarat speichern.'); return; }
              const scopeKey = normalizeExternalScopeKey(cleanName);
              const accountNameKey = currentAccount.nameKey  normalizeAccountNameKey(currentAccount.name  '')  scopeKey;
              const nextActivation = {
                accountNameKey,
                mosqueName cleanName,
                scopeKey,
                multipleMajalis currentAccount.externalMultipleMajalis !== false,
                showNames Boolean(currentAccount.externalShowNames),
              };
              try {
                setExternalConfigSaving(true);
                await AsyncStorage.setItem(STORAGE_KEYS.guestActivation, JSON.stringify(nextActivation));
                setGuestActivation(nextActivation);
                await setGlobalDocData(EXTERNAL_CONFIG_COLLECTION, `${nextActivation.accountNameKey}`, {
                  ...nextActivation,
                  updatedAt new Date().toISOString(),
                }).catch(() = {});
                if (currentAccount.nameKey) {
                  await setGlobalDocData(ADMIN_EXTERNAL_ACCOUNTS_COLLECTION, currentAccount.nameKey, {
                    ...buildExternalAccountWritePayload(currentAccount),
                    externalMosqueName cleanName,
                    updatedAt new Date().toISOString(),
                  }).catch(() = {});
                }
                setToast('Externe Moschee gespeichert ✓');
              } finally {
                setExternalConfigSaving(false);
              }
            }}
          
            Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.buttonText }]}{externalConfigSaving  'Speichert…'  'Speichern'}Text
          Pressable
          Pressable
            style={({ pressed }) = [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor '#B91C1C', opacity externalConfigSaving  0.7  1 }], pressed && styles.buttonPressed]}
            disabled={externalConfigSaving}
            onPress={resetGuestScopeData}
          
            Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color '#FFFFFF' }]}Zurücksetzen & Daten löschenText
          Pressable
        View
      )  null}

      View style={[styles.settingsHeroCard, { backgroundColor theme.card }]} 
        Text style={[styles.settingsHeroTitle, { color theme.text }]}AnkündigungText
        Text style={[styles.settingsHeroMeta, { color theme.muted }]}Optionaler Freitext für den Bereich „Gebetszeiten“Text
        TextInput
          value={announcementInput}
          onChangeText={setAnnouncementInput}
          placeholder=z. B. Nach Isha findet ein Janazah-Gebet statt.
          placeholderTextColor={theme.muted}
          multiline
          textAlignVertical=top
          autoCapitalize=sentences
          style={[styles.announcementInput, isTablet && styles.announcementInputTablet, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]}
        
        Text style={[styles.noteText, { color theme.muted }]}Formatierung fett · _kursiv_ · ~durchgestrichen~Text
        View style={[styles.announcementActions, isTablet && styles.announcementActionsTablet]}
          Pressable style={({ pressed }) = [[styles.saveBtn, styles.announcementActionBtn, { backgroundColor theme.button }], pressed && styles.buttonPressed]} onPress={saveAnnouncement}
            Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.buttonText }]}SpeichernText
          Pressable
          Pressable style={({ pressed }) = [[styles.saveBtn, styles.announcementActionBtn, { backgroundColor theme.card, borderWidth 1, borderColor theme.border }], pressed && styles.buttonPressed]} onPress={clearAnnouncement}
            Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.text }]}LeerenText
          Pressable
        View
      View

      View style={[styles.settingsHeroCard, { backgroundColor theme.card }]}
        Text style={[styles.settingsHeroTitle, { color theme.text }]}Gebetszeiten zusammenlegenText
        Pressable onPress={onOverrideMetaPress}
          Text style={[styles.settingsHeroMeta, { color theme.muted }]}{`${settingsDate} · ${activeMosque.label}`}Text
        Pressable

        {overrideLoading  ActivityIndicator size=small color={theme.text}   null}

        View style={styles.mergeSwitchWrap}
          Text style={[styles.mergeSwitchLabel, { color theme.text }]}Zusammenlegung aktivierenText
          Switch value={overrideEnabled} onValueChange={onOverrideEnabledChange} 
        View

        View style={[styles.mergeInputWrap, !overrideEnabled && styles.mergeInputDisabled]}
          TextInput
            value={overrideSoharAsrTime}
            onChangeText={setOverrideSoharAsrTime}
            placeholder=SoharAsr (HHMM)
            placeholderTextColor={theme.muted}
            autoCapitalize=none
            editable={overrideEnabled}
            style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]}
          
          TextInput
            value={overrideMaghribIshaaTime}
            onChangeText={setOverrideMaghribIshaaTime}
            placeholder=MaghribIshaa (HHMM)
            placeholderTextColor={theme.muted}
            autoCapitalize=none
            editable={overrideEnabled}
            style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]}
          
        View

        Pressable style={({ pressed }) = [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor theme.button, opacity overrideSaving  0.6  1 }], pressed && styles.buttonPressed]} disabled={overrideSaving} onPress={savePrayerOverride}
          Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.buttonText }]}{overrideSaving  'Speichert…'  'Speichern'}Text
        Pressable
      View


      View style={[styles.settingsHeroCard, { backgroundColor theme.card }]}
        Text style={[styles.settingsHeroTitle, { color theme.text }]}Gebetszeiten anpassenText
        Pressable onPress={onOverrideMetaPress}
          Text style={[styles.settingsHeroMeta, { color theme.muted }]}{`${settingsDate} · ${activeMosque.label}`}Text
        Pressable

        View style={styles.mergeInputWrap}
          TextInput value={manualFajrTime} onChangeText={setManualFajrTime} placeholder=Fajr (HHMM) placeholderTextColor={theme.muted} autoCapitalize=none style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
          TextInput value={manualSoharTime} onChangeText={setManualSoharTime} placeholder=Sohar (HHMM) placeholderTextColor={theme.muted} autoCapitalize=none style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
          TextInput value={manualAsrTime} onChangeText={setManualAsrTime} placeholder=Asr (HHMM) placeholderTextColor={theme.muted} autoCapitalize=none style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
          TextInput value={manualMaghribTime} onChangeText={setManualMaghribTime} placeholder=Maghrib (HHMM) placeholderTextColor={theme.muted} autoCapitalize=none style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
          TextInput value={manualIshaaTime} onChangeText={setManualIshaaTime} placeholder=Ishaa (HHMM) placeholderTextColor={theme.muted} autoCapitalize=none style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
        View

        Pressable style={({ pressed }) = [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor theme.button, opacity overrideSaving  0.6  1 }], pressed && styles.buttonPressed]} disabled={overrideSaving} onPress={saveManualPrayerTimes}
          Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.buttonText }]}{overrideSaving  'Speichert…'  'Speichern'}Text
        Pressable
      View

      View style={[styles.settingsHeroCard, { backgroundColor theme.card }]} 
        Text style={[styles.settingsHeroTitle, { color theme.text }]}ProgrammeText
        Text style={[styles.settingsHeroMeta, { color theme.muted }]}{programSettingsDate} · HeuteText

        View style={styles.mergeInputWrap}
          TextInput value={programNameInput} onChangeText={setProgramNameInput} placeholder=Haupttitel  Name (z. B. Wahl 2026) placeholderTextColor={theme.muted} autoCapitalize=sentences style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
          TextInput value={programSubtitleInput} onChangeText={setProgramSubtitleInput} placeholder=Untertitel (optional) placeholderTextColor={theme.muted} autoCapitalize=sentences style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
          TextInput value={programExtraLineInput} onChangeText={setProgramExtraLineInput} placeholder=Zusatzzeile (optional) placeholderTextColor={theme.muted} autoCapitalize=sentences style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
          TextInput value={programStartInput} onChangeText={setProgramStartInput} placeholder=Programmanfang (HHMM) placeholderTextColor={theme.muted} autoCapitalize=none style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
        View
        Text style={[styles.noteText, { color theme.muted, textAlign 'center' }]}Formatierung fett · _kursiv_ · ~durchgestrichen~Text

        Pressable style={({ pressed }) = [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor theme.button }], pressed && styles.buttonPressed]} onPress={saveProgramForToday}
          Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.buttonText }]}Programm speichernText
        Pressable
        Pressable style={({ pressed }) = [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor theme.card, borderWidth 1, borderColor theme.border }], pressed && styles.buttonPressed]} onPress={clearProgramForToday}
          Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.text }]}Programm deaktivierenText
        Pressable
      View

      View style={[styles.settingsHeroCard, { backgroundColor theme.card }]}
        Text style={[styles.settingsHeroTitle, { color theme.text }]}AnmeldungText
        View style={styles.mergeInputWrap}
          TextInput value={registrationNameInput} onChangeText={setRegistrationNameInput} placeholder=Haupttitel  Name (z. B. Wahl 2026) placeholderTextColor={theme.muted} autoCapitalize=sentences style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
          TextInput value={registrationSubtitleInput} onChangeText={setRegistrationSubtitleInput} placeholder=Untertitel (optional) placeholderTextColor={theme.muted} autoCapitalize=sentences style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
          TextInput value={registrationExtraLineInput} onChangeText={setRegistrationExtraLineInput} placeholder=Zusatzzeile (optional) placeholderTextColor={theme.muted} autoCapitalize=sentences style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
          TextInput value={registrationStartDateInput} onChangeText={setRegistrationStartDateInput} placeholder=Von (TT.MM) placeholderTextColor={theme.muted} autoCapitalize=none style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
          TextInput value={registrationEndDateInput} onChangeText={setRegistrationEndDateInput} placeholder=Bis (TT.MM) placeholderTextColor={theme.muted} autoCapitalize=none style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
        View
        Text style={[styles.noteText, { color theme.muted, textAlign 'center' }]}Formatierung fett · _kursiv_ · ~durchgestrichen~Text
        Pressable style={({ pressed }) = [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor theme.card, borderWidth 1, borderColor theme.border }], pressed && styles.buttonPressed]} onPress={clearRegistrationConfig}
          Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.text }]}Anmeldung deaktivierenText
        Pressable
        {isRegistrationAdvancedVisible  (
          
            View style={styles.mergeSwitchWrap}
              Text style={[styles.mergeSwitchLabel, { color theme.text }]}Öffentlich anzeigenText
              Switch value={registrationIsPublicInput} onValueChange={setRegistrationIsPublicInput} 
            View
            {!isGuestMode  (
              View style={styles.mergeSwitchWrap}
                Text style={[styles.mergeSwitchLabel, { color theme.text }]}Nur Ehl-VotersText
                Switch value={registrationOnlyEhlVotersInput} onValueChange={setRegistrationOnlyEhlVotersInput} 
              View
            )  null}
            {isGuestMode  (
              View style={styles.mergeSwitchWrap}
                Text style={[styles.mergeSwitchLabel, { color theme.text }]}Abmeldung erlaubenText
                Switch value={registrationAllowDeclineInput} onValueChange={setRegistrationAllowDeclineInput} 
              View
            )  null}
            {!isGuestMode  (
              View style={styles.mergeSwitchWrap}
                Text style={[styles.mergeSwitchLabel, { color theme.text }]}Login aktivierenText
                Switch value={registrationLoginEnabledInput} onValueChange={setRegistrationLoginEnabledInput} 
              View
            )  null}
            Text style={[styles.noteText, { color theme.muted }]}Berücksichtigte Tanzeem auswählenText
            View style={styles.statsToggleRow}
              {REGISTRATION_TANZEEM_OPTIONS.map((key) = {
                const isActive = registrationIncludedTanzeemsInput.includes(key);
                return (
                  Pressable
                    key={`registration_tanzeem_${key}`}
                    onPress={() = setRegistrationIncludedTanzeemsInput((prev) = {
                      if (prev.includes(key)) return prev.length  1  prev.filter((entry) = entry !== key)  prev;
                      return [...prev, key];
                    })}
                    style={[styles.statsToggleBtn, { borderColor isActive  theme.button  theme.border, backgroundColor isActive  theme.button  theme.bg }]}
                  
                    Text style={[styles.statsToggleBtnText, { color isActive  theme.buttonText  theme.text }]}{TANZEEM_LABELS[key]}Text
                  Pressable
                );
              })}
            View
          
        )  null}
        Pressable style={({ pressed }) = [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor theme.button }], pressed && styles.buttonPressed]} onPress={saveRegistrationConfig}
          Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.buttonText }]}Anmeldung speichernText
        Pressable
        Pressable onPress={() = setRegistrationAdvancedVisible((prev) = !prev)} style={[styles.privacyNoticeLinkWrap, { alignSelf 'center', marginTop 6 }]}
          Text style={[styles.privacyNoticeLinkText, { color isDarkMode  'rgba(209, 213, 219, 0.84)'  'rgba(55, 65, 81, 0.84)' }]}Erweiterte EinstellungenText
        Pressable
      View


      {currentAccount  (
        View style={[styles.settingsHeroCard, { backgroundColor theme.card }]}
          Text style={[styles.settingsHeroTitle, { color theme.text }]}AccountText
          Text style={[styles.settingsHeroMeta, { color theme.muted }]}{`${currentAccount.name} · ${isSuperAdmin  'Super-Admin'  activeMosque.label}`}Text
          View style={styles.mergeInputWrap}
            TextInput value={passwordChangeInput} onChangeText={setPasswordChangeInput} placeholder=Neues Passwort placeholderTextColor={theme.muted} autoCapitalize=none secureTextEntry style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
          View
          Pressable style={({ pressed }) = [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor theme.button }], pressed && styles.buttonPressed]} onPress={changeOwnPassword}
            Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.buttonText }]}Passwort ändernText
          Pressable
          Pressable style={({ pressed }) = [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor theme.card, borderWidth 1, borderColor theme.border }], pressed && styles.buttonPressed]} onPress={logoutAccount}
            Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.text }]}LogoutText
          Pressable
        View
      )  null}

      {isSuperAdmin  (
        View style={[styles.settingsHeroCard, { backgroundColor theme.card }]}
          Text style={[styles.settingsHeroTitle, { color theme.text }]}AccountverwaltungText
          View style={styles.mergeInputWrap}
            TextInput value={adminManageName} onChangeText={setAdminManageName} placeholder=Name (Login) placeholderTextColor={theme.muted} autoCapitalize=none style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
            TextInput value={adminManagePassword} onChangeText={setAdminManagePassword} placeholder=Passwort placeholderTextColor={theme.muted} secureTextEntry autoCapitalize=none style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
          View
          View style={styles.statsToggleRow}
            {MOSQUE_OPTIONS.map((mosque) = (
              Pressable
                key={mosque.key}
                onPress={() = setAdminManageMosqueKeys((prev) = {
                  if (mosque.key === EXTERNAL_MOSQUE_KEY) {
                    return prev.includes(EXTERNAL_MOSQUE_KEY)  [DEFAULT_MOSQUE_KEY]  [EXTERNAL_MOSQUE_KEY];
                  }
                  if (prev.includes(EXTERNAL_MOSQUE_KEY)) {
                    return [mosque.key];
                  }
                  const exists = prev.includes(mosque.key);
                  if (exists) {
                    const next = prev.filter((key) = key !== mosque.key);
                    return next.length  next  prev;
                  }
                  return [...prev, mosque.key];
                })}
                style={[styles.statsToggleBtn, { borderColor adminManageMosqueKeys.includes(mosque.key)  theme.button  theme.border, backgroundColor adminManageMosqueKeys.includes(mosque.key)  theme.button  theme.bg }]}
              
                Text style={[styles.statsToggleBtnText, { color adminManageMosqueKeys.includes(mosque.key)  theme.buttonText  theme.text }]}{mosque.label}Text
              Pressable
            ))}
          View
          {adminManageMosqueKeys.includes(EXTERNAL_MOSQUE_KEY)  (
            
              View style={styles.mergeSwitchWrap}Text style={[styles.mergeSwitchLabel, { color theme.text }]}Mehrere MajlisTextSwitch value={adminManageExternalMultiMajlis} onValueChange={setAdminManageExternalMultiMajlis} View
              View style={styles.mergeSwitchWrap}Text style={[styles.mergeSwitchLabel, { color theme.text }]}Namen anzeigenTextSwitch value={adminManageExternalShowNames} onValueChange={setAdminManageExternalShowNames} View
            
          )  null}
          {!adminManageMosqueKeys.includes(EXTERNAL_MOSQUE_KEY)  (
            
              View style={styles.mergeSwitchWrap}Text style={[styles.mergeSwitchLabel, { color theme.text }]}Einstellungen ändernTextSwitch value={adminManagePermissions.canEditSettings} onValueChange={(v) = setAdminManagePermissions((prev) = ({ ...prev, canEditSettings v }))} View
              View style={styles.mergeSwitchWrap}Text style={[styles.mergeSwitchLabel, { color theme.text }]}ID-Statistiken sehenTextSwitch value={adminManagePermissions.canViewIdStats} onValueChange={(v) = setAdminManagePermissions((prev) = ({ ...prev, canViewIdStats v }))} View
              View style={styles.mergeSwitchWrap}Text style={[styles.mergeSwitchLabel, { color theme.text }]}Daten exportierenTextSwitch value={adminManagePermissions.canExportData} onValueChange={(v) = setAdminManagePermissions((prev) = ({ ...prev, canExportData v }))} View
              View style={styles.statsToggleRow}
                Pressable onPress={() = setAdminManagePermissions(allPermissionsEnabled())} style={[styles.statsCardMiniSwitch, { borderColor theme.border, backgroundColor theme.bg }]}Text style={[styles.statsCardMiniSwitchText, { color theme.text }]}Alle RechteTextPressable
                Pressable onPress={() = setAdminManagePermissions({ ...DEFAULT_ACCOUNT_PERMISSIONS })} style={[styles.statsCardMiniSwitch, { borderColor theme.border, backgroundColor theme.bg }]}Text style={[styles.statsCardMiniSwitchText, { color theme.text }]}Alles entfernenTextPressable
              View
            
          )  null}
          Pressable style={({ pressed }) = [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor theme.button, opacity adminAccountsLoading  0.7  1 }], pressed && styles.buttonPressed]} onPress={createManagedAccount} disabled={adminAccountsLoading}
            Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.buttonText }]}{adminAccountsLoading  'Lädt…'  'Account erstellen'}Text
          Pressable
          View style={[styles.statsCard, { backgroundColor theme.bg, borderColor theme.border }]}
            Text style={[styles.statsCardTitle, { color theme.muted }]}Bestehende AccountsText
            {adminAccounts.map((account) = (
              View key={account.nameKey  account.name} style={{ marginTop 8, gap 6 }}
                View style={styles.statsCardHeaderRow}
                  View style={{ flex 1 }}
                    Text style={{ color theme.text, fontWeight '700' }}{account.name}Text
                    Text style={{ color theme.muted }}{account.isSuperAdmin
                       'Super-Admin'
                       (() = {
                        if (account.isExternalGuest) return 'Extern';
                        const keys = Array.isArray(account.mosqueIds) && account.mosqueIds.length
                           account.mosqueIds
                           (account.mosqueId  [account.mosqueId]  []);
                        if (!keys.length) return '—';
                        return keys
                          .map((key) = MOSQUE_OPTIONS.find((m) = m.key === key).label  key)
                          .join(' · ');
                      })()}Text
                  View
                  {!account.isSuperAdmin  (
                    Pressable onPress={() = deleteManagedAccount(account)} style={[styles.statsCardMiniSwitch, { borderColor theme.border, backgroundColor theme.card }]}
                      Text style={[styles.statsCardMiniSwitchText, { color theme.text }]}LöschenText
                    Pressable
                  )  null}
                View
                {!account.isSuperAdmin && account.isExternalGuest  (
                  View style={styles.statsToggleRow}
                    Pressable
                      onPress={() = updateManagedExternalOptions(account, {
                        externalMultipleMajalis !(account.externalMultipleMajalis !== false),
                        externalShowNames Boolean(account.externalShowNames),
                      })}
                      style={[styles.statsToggleBtn, { borderColor (account.externalMultipleMajalis !== false)  theme.button  theme.border, backgroundColor (account.externalMultipleMajalis !== false)  theme.button  theme.bg }]}
                    
                      Text style={[styles.statsToggleBtnText, { color (account.externalMultipleMajalis !== false)  theme.buttonText  theme.text }]}Mehrere MajlisText
                    Pressable
                    Pressable
                      onPress={() = updateManagedExternalOptions(account, {
                        externalMultipleMajalis account.externalMultipleMajalis !== false,
                        externalShowNames !Boolean(account.externalShowNames),
                      })}
                      style={[styles.statsToggleBtn, { borderColor Boolean(account.externalShowNames)  theme.button  theme.border, backgroundColor Boolean(account.externalShowNames)  theme.button  theme.bg }]}
                    
                      Text style={[styles.statsToggleBtnText, { color Boolean(account.externalShowNames)  theme.buttonText  theme.text }]}Namen anzeigenText
                    Pressable
                  View
                )  null}
                {!account.isSuperAdmin && !account.isExternalGuest  (
                  View style={styles.statsToggleRow}
                    {[
                      ['canEditSettings', 'Settings'],
                      ['canViewIdStats', 'ID-Stats'],
                      ['canExportData', 'Export'],
                    ].map(([permKey, label]) = {
                      const isOn = Boolean(account.permissions.[permKey]);
                      return (
                        Pressable
                          key={`${account.name}_${permKey}`}
                          onPress={() = updateManagedPermissions(account, { ...(account.permissions  {}), [permKey] !isOn })}
                          style={[styles.statsToggleBtn, { borderColor isOn  theme.button  theme.border, backgroundColor isOn  theme.button  theme.bg }]}
                        
                          Text style={[styles.statsToggleBtnText, { color isOn  theme.buttonText  theme.text }]}{label}Text
                        Pressable
                      );
                    })}
                  View
                )  null}
              View
            ))}
          View
        View
      )  null}

      View style={[styles.settingsHeroCard, { backgroundColor theme.card }]}
          Text style={[styles.settingsHeroTitle, { color theme.text }]}{isGuestMode  'DB-Reset (Extern)'  'DB-Reset (Intern)'}Text
          Text style={[styles.settingsHeroMeta, { color theme.muted }]}
            {isGuestMode
               'Löscht Einträge der gewählten Kategorie(n) pro ausgewählter Local Amarat.'
               'Löscht Einträge der gewählten Kategorie(n) pro ausgewählter Moschee.'}
          Text
          {INTERNAL_RESET_CATEGORIES.map((category) = {
            const selected = Array.isArray(dbResetSelectionByCategory.[category.key])  dbResetSelectionByCategory[category.key]  [];
            const isLoading = Boolean(dbResetLoadingByCategory.[category.key]);
            const resetOptions = isGuestMode  externalResetScopeOptions  internalMosqueOptions;
            return (
              View key={category.key} style={[styles.statsCard, { backgroundColor theme.bg, borderColor theme.border }]}
                Text style={[styles.statsCardTitle, { color theme.text }]}{category.label}Text
                View style={styles.statsToggleRow}
                  {resetOptions.map((mosque) = {
                    const isActive = selected.includes(mosque.key);
                    return (
                      Pressable
                        key={`${category.key}_${mosque.key}`}
                        onPress={() = toggleDbResetMosqueSelection(category.key, mosque.key)}
                        style={[styles.statsToggleBtn, { borderColor isActive  theme.button  theme.border, backgroundColor isActive  theme.button  theme.bg }]}
                      
                        Text style={[styles.statsToggleBtnText, { color isActive  theme.buttonText  theme.text }]}{mosque.label}Text
                      Pressable
                    );
                  })}
                View
                {isGuestMode && resetOptions.length === 0  (
                  Text style={[styles.noteText, { color theme.muted, textAlign 'center' }]}Keine Local Amarat verfügbar.Text
                )  null}
                Pressable
                  style={({ pressed }) = [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor '#B91C1C', opacity isLoading  0.7  1 }], pressed && styles.buttonPressed]}
                  onPress={() = runInternalDbReset(category)}
                  disabled={isLoading}
                
                  Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color '#FFFFFF' }]}
                    {isLoading  'Löscht…'  `${category.label} löschen`}
                  Text
                Pressable
              View
            );
          })}
          Text style={[styles.noteText, { color theme.muted }]}Hinweis Es werden Einträge gelöscht, Collections bleiben bestehen.Text
        View

      View style={styles.appMetaWrap}
        Text style={[styles.appMetaVersion, { color theme.muted }]}Version 1.1.0Text
        Text style={[styles.appMetaCopyright, { color theme.muted }]}© 2026 Tehmoor Bhatti. All rights reserved.Text
      View
    ScrollView
  );
  };

  const renderQrPage = () = (
    ScrollView contentContainerStyle={contentContainerStyle} showsVerticalScrollIndicator={false}
      View style={[styles.dayCard, styles.qrPageCard, { backgroundColor theme.card, borderColor theme.border }]}
        Pressable onPress={() = setQrAttendanceCategory((prev) = (prev === 'prayer'  'program'  'prayer'))} style={withPressEffect(styles.quickSearchLinkWrap)}
          Text style={[styles.quickSearchLinkText, { color theme.muted }]}« Kategorie wechseln »Text
        Pressable
        Text style={[styles.qrPageTitle, { color theme.text }]}{qrAttendanceCategory === 'program'  'QR-Code Programmerfassung'  'QR-Code Gebetserfassung'}Text
        Pressable onPress={handleQrExternHeaderPress} style={[styles.cityBadge, { backgroundColor theme.chipBg }]}
          Text style={[styles.cityBadgeText, { color theme.chipText }]}{activeMosque.label}Text
        Pressable
        {isQrExternMode && !isQrExternScopeSelected  (
          
            Text style={[styles.noPrayerTitle, isDarkMode  styles.noPrayerTitleDark  styles.noPrayerTitleLight]}Erst Moschee auswählenText
            Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginTop 10 }]}Tippe 3x auf den grünen Header, um eine externe Moschee auszuwählen oder zu wechseln.Text
          
        )  qrAttendanceCategory === 'program'  (
          qrLiveProgramWindow.isActive  (
            
              Text style={[styles.qrPageSubtitle, { color theme.muted }]}Aktuelles Programm {qrLiveProgramWindow.label  'Programm'}Text
              Text style={[styles.qrPageHint, { color theme.muted }]}Dieser QR-Code erneuert sich automatisch alle 5 Minuten für die Programmanwesenheit.Text
              View style={[styles.qrCodeCard, { borderColor theme.border, backgroundColor theme.bg }]}
                {qrImageUri  Image source={{ uri qrImageUri }} style={styles.qrCodeImage} resizeMode=contain onLoad={() = { if (qrPendingImageUri === qrImageUri) setQrPendingImageUri(''); }}   ActivityIndicator size=large color={theme.text} }
                {qrPendingImageUri  Image source={{ uri qrPendingImageUri }} style={styles.qrCodePreloadImage} resizeMode=contain onLoad={() = { setQrImageUri(qrPendingImageUri); setQrPendingImageUri(''); }}   null}
              View
              View style={[styles.qrTimerChip, { borderColor theme.border, backgroundColor isDarkMode  '#111827'  '#F9FAFB' }]}
                Text style={[styles.qrTimerText, { color theme.text }]}Aktualisierung in {formatQrCountdown(qrCountdownSeconds)}Text
              View
            
          )  (
            
              Text style={[styles.noPrayerTitle, isDarkMode  styles.noPrayerTitleDark  styles.noPrayerTitleLight]}Aktuell kein Programm aktivText
              {!qrLiveProgramWindow.isConfigured  (
                Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginTop 10 }]}Für heute ist noch kein Programm hinterlegt.Text
              )  (
                Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginTop 10 }]}Programm startet um {qrLiveProgramWindow.startTime  '—'} ({qrLiveProgramWindow.label  'Programm'}).Text
              )}
            
          )
        )  qrLivePrayerWindow.isActive && qrLivePrayerWindow.prayerKey  (
          
            Text style={[styles.qrPageSubtitle, { color theme.muted }]}Aktuelles Gebet {getDisplayPrayerLabel(qrLivePrayerWindow.prayerKey, qrLiveTimesToday)}Text
            Text style={[styles.qrPageHint, { color theme.muted }]}Dieser QR-Code erneuert sich automatisch alle 5 Minuten für die Gebetsanwesenheit.Text
            View style={[styles.qrCodeCard, { borderColor theme.border, backgroundColor theme.bg }]}
              {qrImageUri  Image source={{ uri qrImageUri }} style={styles.qrCodeImage} resizeMode=contain onLoad={() = { if (qrPendingImageUri === qrImageUri) setQrPendingImageUri(''); }}   ActivityIndicator size=large color={theme.text} }
              {qrPendingImageUri  Image source={{ uri qrPendingImageUri }} style={styles.qrCodePreloadImage} resizeMode=contain onLoad={() = { setQrImageUri(qrPendingImageUri); setQrPendingImageUri(''); }}   null}
            View
            View style={[styles.qrTimerChip, { borderColor theme.border, backgroundColor isDarkMode  '#111827'  '#F9FAFB' }]}
              Text style={[styles.qrTimerText, { color theme.text }]}Aktualisierung in {formatQrCountdown(qrCountdownSeconds)}Text
            View
          
        )  (
          
            Text style={[styles.noPrayerTitle, isDarkMode  styles.noPrayerTitleDark  styles.noPrayerTitleLight]}Derzeit kein GebetText
            Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginTop 10 }]}Nächstes GebetText
            Text style={[styles.nextPrayerValue, { color theme.text }]}{prayerWindow.nextLabel}Text
            View style={[styles.noPrayerCountdownChip, { borderColor theme.border, backgroundColor isDarkMode  '#1F2937'  '#FEF3C7' }]}
              Text style={[styles.noPrayerCountdownText, { color theme.text }]}QR-Code verfügbar in {formatMinutesUntil(prayerWindow.minutesUntilNextWindow)}Text
            View
            Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginTop 18 }]}Anwesenheit kann nur im aktiven Gebet erfasst werden (30 Minuten davor bzw. 60 Minuten danach).Text
            Text style={[styles.urduText, { color theme.muted }]}حاضری صرف فعال نماز کے وقت میں درج کی جا سکتی ہے (30 منٹ پہلے اور 60 منٹ بعد تک)۔Text
          
        )}
      View
    ScrollView
  );

  const renderQrScanPage = () = (

    ScrollView ref={terminalScrollRef} keyboardShouldPersistTaps=handled contentContainerStyle={contentContainerStyle} showsVerticalScrollIndicator={false}
      View style={[styles.dayCard, { backgroundColor theme.card, borderColor theme.border }]} 
        Text style={[styles.qrPageTitle, { color theme.text }]}QR AnwesenheitText
        {isSecretMode && qrFlowMode === 'landing'  (
          View style={[styles.qrDeviceHintCard, { borderColor theme.border, backgroundColor theme.bg }]} 
            Text style={[styles.qrDeviceHintText, { color theme.text }]}Bitte scannen Sie den QR-Code am Terminal, um die Eintragung zu starten.Text
          View
        )  null}
        {qrSubmitting  ActivityIndicator size=small color={theme.text}   null}
        {qrStatusMessage  (
          View style={[styles.qrStatusCard, qrStatusTone === 'negative'  styles.qrStatusCardNegative  qrStatusTone === 'positive'  styles.qrStatusCardPositive  null, { borderColor theme.border }]} 
            Text style={[styles.qrStatusText, { color theme.text }]}{qrStatusMessage}Text
          View
        )  null}
        {qrRegistration.idNumber && qrCurrentRegistrationMember  (
          Text style={[styles.qrRegisteredMeta, { color theme.muted }]}Registriert {qrCurrentRegistrationMember.idNumber} · {TANZEEM_LABELS[qrCurrentRegistrationMember.tanzeem]  qrCurrentRegistrationMember.tanzeem} · {qrCurrentRegistrationMajlisLabel}Text
        )  null}

        {qrFlowMode === 'registered'  (
          View style={[styles.qrDeviceHintCard, { borderColor theme.border, backgroundColor theme.bg }]} 
            Text style={[styles.qrDeviceHintText, { color theme.text }]}{qrRegisteredGuidance}Text
          View
        )  null}

        {qrFlowMode === 'register'  (
          
            {isQrQuickIdSearchVisible  (
              
                Pressable onPress={() = setQrQuickIdSearchVisible(false)} style={withPressEffect(styles.quickSearchLinkWrap)}
                  Text style={[styles.quickSearchLinkText, { color isDarkMode  'rgba(209, 213, 219, 0.84)'  'rgba(55, 65, 81, 0.84)' }]}SchließenText
                Pressable
                View style={[styles.quickSearchPanel, { borderColor '#000000', backgroundColor theme.card }]} 
                  TextInput
                    value={qrRegistrationSearchQuery}
                    onChangeText={(value) = setQrRegistrationSearchQuery(String(value  '').replace([^0-9]g, ''))}
                    onFocus={() = terminalScrollRef.current.scrollTo({ y 180, animated true })}
                    placeholder=ID-Nummer suchen
                    placeholderTextColor={theme.muted}
                    keyboardType=number-pad
                    inputMode=numeric
                    returnKeyType=done
                    style={[styles.idSearchInput, { marginTop 0, color theme.text, borderColor theme.border, backgroundColor theme.bg }]}
                  
                  {qrRegistrationSearchDigits.length  4  (
                    Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginTop 8 }]}Bitte mindestens 4 Ziffern eingeben.Text
                  )  qrRegistrationSearchResults.length === 0  (
                    Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginTop 8 }]}Keine passende ID gefunden.Text
                  )  (
                    View style={styles.quickSearchResultsWrap}
                      {qrRegistrationSearchResults.map((member) = (
                        Pressable
                          key={`qr_quick_${member.tanzeem}_${member.majlis}_${member.idNumber}`}
                          onPress={() = handleQrMemberRegistration(member)}
                          style={({ pressed }) = [[styles.quickSearchResultCard, { borderColor theme.border, backgroundColor theme.bg }], pressed && styles.buttonPressed]}
                        
                        Text style={[styles.quickSearchResultText, { color theme.text }]}{`${member.idNumber} · ${TANZEEM_LABELS[member.tanzeem]  member.tanzeem} · ${resolveExportMajlisLabel(member.majlis, member.amarat)}`}Text
                      Pressable
                    ))}
                    View
                  )}
                View
              
            )  qrRegistrationMode === 'tanzeem'  (
              
                Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, { color theme.text, textAlign 'center' }]}Bitte wählen Sie die TanzeemText
                Text style={[styles.urduText, { color theme.muted }]}براہِ کرم تنظیم منتخب کریںText
                View style={styles.tanzeemRow}
                  {qrRegistrationTanzeemOptions.map((tanzeem) = (
                    Pressable key={`qr_${tanzeem}`} style={({ pressed }) = [[styles.tanzeemBtn, isTablet && styles.tanzeemBtnTablet, { backgroundColor theme.button }], pressed && styles.buttonPressed]} onPress={() = {
                      const useMajlisSelection = hasMultipleMajalisInGuest && hasQrMajlisChoicesForTanzeem(tanzeem);
                      setQrRegistrationTanzeem(tanzeem);
                      setQrRegistrationMajlis(useMajlisSelection  ''  '-');
                      setQrRegistrationMode(useMajlisSelection  'majlis'  'idSelection');
                    }}
                      Text style={[styles.presetBtnText, isTablet && styles.presetBtnTextTablet, { color theme.buttonText }]}{TANZEEM_LABELS[tanzeem]}Text
                    Pressable
                  ))}
                View
                Pressable onPress={() = setQrQuickIdSearchVisible(true)} style={withPressEffect(styles.quickSearchLinkWrap)}
                  Text style={[styles.quickSearchLinkText, { color isDarkMode  'rgba(209, 213, 219, 0.84)'  'rgba(55, 65, 81, 0.84)' }]}Hier direkt ID-Nummer suchenText
                Pressable
              
            )  qrRegistrationMode === 'majlis'  (
              
                Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, { color theme.text, textAlign 'center' }]}{`Bitte wählen Sie Ihre ${hasGuestEntriesWithoutMajlis  'Jamaat'  'Majlis'}`}Text
                Text style={[styles.urduText, { color theme.muted }]}براہِ کرم اپنی مجلس منتخب کریںText
                Pressable style={({ pressed }) = [[styles.saveBtn, { backgroundColor theme.button }], pressed && styles.buttonPressed]} onPress={() = { setQrRegistrationMode('tanzeem'); setQrRegistrationMajlis(''); }}
                  Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.buttonText }]}ZurückText
                Pressable
                View style={styles.gridWrap}
                  {qrRegistrationMajlisChoices.map((loc) = (
                    Pressable key={`qr_majlis_${loc}`} style={({ pressed }) = [[styles.gridItem, isTablet && styles.gridItemTablet, { backgroundColor theme.card, borderColor theme.border }], pressed && styles.buttonPressed]} onPress={() = { setQrRegistrationMajlis(loc); setQrRegistrationMode('idSelection'); }}
                      Text style={[styles.gridText, isTablet && styles.gridTextTablet, { color theme.text }]}{loc}Text
                    Pressable
                  ))}
                View
                Pressable onPress={() = setQrQuickIdSearchVisible(true)} style={withPressEffect(styles.quickSearchLinkWrap)}
                  Text style={[styles.quickSearchLinkText, { color isDarkMode  'rgba(209, 213, 219, 0.84)'  'rgba(55, 65, 81, 0.84)' }]}Hier direkt ID-Nummer suchenText
                Pressable
              
            )  (
              
                Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet, { color theme.text, textAlign 'center' }]}Bitte wählen Sie Ihre ID-NummerText
                Text style={[styles.urduText, { color theme.muted }]}براہِ کرم اپنی آئی ڈی منتخب کریںText
                Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginBottom 4 }]}{qrRegistrationSelectionLabel} · {TANZEEM_LABELS[qrRegistrationTanzeem]  ''}Text
                TextInput
                  value={qrRegistrationFlowSearchQuery}
                  onChangeText={(value) = setQrRegistrationFlowSearchQuery(String(value  '').replace([^0-9]g, ''))}
                  placeholder=ID-Nummer filtern
                  placeholderTextColor={theme.muted}
                  keyboardType=number-pad
                  inputMode=numeric
                  returnKeyType=done
                  style={[styles.idSearchInput, { marginTop 6, color theme.text, borderColor theme.border, backgroundColor theme.bg }]}
                
                Pressable style={({ pressed }) = [[styles.saveBtn, { backgroundColor theme.button }], pressed && styles.buttonPressed]} onPress={() = setQrRegistrationMode(shouldUseQrMajlisSelection  'majlis'  'tanzeem')}
                  Text style={[styles.saveBtnText, isTablet && styles.saveBtnTextTablet, { color theme.buttonText }]}ZurückText
                Pressable
                {qrRegistrationFilteredMemberChoices.length === 0  (
                  Text style={[styles.noteText, { color theme.muted, textAlign 'center' }]}
                    {qrRegistrationFlowSearchDigits  'Keine passende ID gefunden.'  'Keine ID-Nummern verfügbar.'}
                  Text
                )  (
                  View style={[styles.gridWrap, styles.idGridWrap]}
                    {qrRegistrationFilteredMemberChoices.map((member) = (
                      Pressable
                        key={`qr_member_${member.tanzeem}_${member.majlis}_${member.idNumber}`}
                        style={({ pressed }) = [[styles.gridItem, isTablet && styles.gridItemTablet, { backgroundColor theme.card, borderColor theme.border }], pressed && styles.buttonPressed]}
                        onPress={() = handleQrMemberRegistration(member)}
                      
                        Text style={[styles.gridText, isTablet && styles.gridTextTablet, { color theme.text }]}{member.idNumber}Text
                        {showMemberNamesInGrid  Text style={[styles.gridSubText, { color theme.muted }]} numberOfLines={1}{member.name}Text  null}
                      Pressable
                    ))}
                  View
                )}
              
            )}
          
        )  null}

        {qrFlowMode === 'registered'  (
          View style={[styles.qrDeviceHintCard, { borderColor theme.border, backgroundColor theme.bg }]} 
            Text style={[styles.qrDeviceHintText, { color theme.text }]}Bitte Browserdaten nicht löschen, möglichst immer denselben Browser verwenden und bei gelöschten Daten erneut registrieren.Text
          View
        )  null}

      View
    ScrollView
  );

  const body = shouldRestrictToQrView
     (isQrScanPageVisible  renderQrScanPage()  renderQrPage())
     isGuestMode
     (activeTab === 'stats'
       (currentAccount  renderStats()  renderPrayer())
       activeTab === 'settings'
         (currentAccount  renderSettings()  renderPrayer())
         activeTab === 'terminal'
           renderTerminal()
           renderPrayer())
     shouldRestrictToRegistrationView
       renderTerminal()
     shouldRestrictToPrayerView
       renderPrayer()
       isQrScanPageVisible
       renderQrScanPage()
       isQrPageVisible
         renderQrPage()
         activeTab === 'gebetsplan'
         renderPrayer()
         activeTab === 'terminal'
           renderTerminal()
           activeTab === 'stats'
             renderStats()
             (effectivePermissions.canEditSettings  renderSettings()  renderPrayer());
  const isPrayerTimeBootstrapPending = !prayerOverrideReady;

  return (
    SafeAreaView
      style={[styles.safeArea, { backgroundColor theme.bg }]}
      onTouchStart={recordTerminalInteraction}
      onStartShouldSetResponderCapture={() = {
        recordTerminalInteraction();
        return false;
      }}
      onMouseDown={Platform.OS === 'web'  recordTerminalInteraction  undefined}
    
      StatusBar style={isDarkMode  'light'  'dark'} 
      Text style={[styles.basmalaText, { color theme.muted }]}بِسۡمِ اللّٰہِ الرَّحۡمٰنِ الرَّحِیۡمِText
      Pressable style={styles.logoWrap} onPress={handleLogoPress}
        Image source={logoSource} style={styles.logoImage} resizeMode=contain 
      Pressable
      {currentAccount && !isSecretMode  (
        View style={styles.accountSessionCenterWrap}
          Text style={[styles.accountSessionCenterName, { color theme.text }]} numberOfLines={1}{currentAccount.name}Text
          Pressable onPress={logoutAccount} style={({ pressed }) = [styles.accountSessionCenterLogoutBtn, pressed && styles.buttonPressed]}
            Text style={[styles.accountSessionCenterLogoutText, { color theme.muted }]}LogoutText
          Pressable
        View
      )  null}
      Animated.View style={{ flex 1, opacity isPrayerTimeBootstrapPending  0  1, transform [{ scale themePulseAnim }] }}{body}Animated.View

      {!shouldRestrictToPrayerView && !shouldRestrictToQrView && !shouldRestrictToRegistrationView && (!isQrPageVisible && !isQrScanPageVisible  Boolean(currentAccount)  isGuestMode)  (
        View style={[styles.tabBar, isTablet && styles.tabBarTablet, isTablet && Platform.OS === 'web' && styles.tabBarTabletWebCompact, { backgroundColor theme.card, borderTopColor theme.border, paddingBottom Math.max(insets.bottom, isTablet && Platform.OS === 'web'  2  4), minHeight (isTablet && Platform.OS === 'web'  44  52) + Math.max(insets.bottom, isTablet && Platform.OS === 'web'  2  4) }]}
          {visibleTabs.map((tab) = (
            Pressable key={tab.key} onPress={() = handleTabPress(tab.key)} style={withPressEffect([styles.tabItem, isTablet && Platform.OS === 'web' && styles.tabItemTabletWebCompact])}
              Text numberOfLines={1} style={[styles.tabLabel, isTablet && styles.tabLabelTablet, isTablet && Platform.OS === 'web' && styles.tabLabelTabletWebCompact, { color activeTab === tab.key  theme.text  theme.muted, fontWeight activeTab === tab.key  '700'  '500' }]}{tab.label}Text
            Pressable
          ))}
        View
      )  null}


      Modal
        visible={isAdminLoginVisible}
        animationType=fade
        transparent
        onRequestClose={() = {
          if (normalizedAppMode === 'registration' && registrationWindow.canAccess && registrationWindow.loginEnabled && !currentAccount) return;
          setAdminLoginVisible(false);
        }}
      
        View style={styles.privacyModalBackdrop}
          View style={[styles.statsExportModalCard, { backgroundColor theme.card, borderColor theme.border }]} 
            Text style={[styles.statsExportModalTitle, { color theme.text }]}Account LoginText
            Text style={[styles.noteText, { color theme.muted, textAlign 'center' }]}{isGuestMode  'Externer Zugang'  'Interner Zugang (Frankfurt)'}Text
            View style={styles.mergeInputWrap}
              TextInput value={loginNameInput} onChangeText={setLoginNameInput} placeholder=Name placeholderTextColor={theme.muted} autoCapitalize=none style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
              TextInput value={loginPasswordInput} onChangeText={setLoginPasswordInput} placeholder=Passwort placeholderTextColor={theme.muted} autoCapitalize=none secureTextEntry style={[styles.mergeInput, { color theme.text, borderColor theme.border, backgroundColor theme.bg }]} 
            View
            View style={styles.statsExportModalActions}
              Pressable onPress={loginWithHiddenModal} disabled={authLoading} style={[styles.statsExportOptionBtn, { borderColor '#000000', backgroundColor '#000000', opacity authLoading  0.7  1 }]} 
                Text style={[styles.statsExportOptionBtnText, { color '#FFFFFF' }]}{authLoading  'Prüft…'  'Einloggen'}Text
              Pressable
              {(!isGuestMode  Boolean(guestActivation.scopeKey))
                && !(normalizedAppMode === 'registration' && registrationWindow.canAccess && registrationWindow.loginEnabled && !currentAccount)  (
                Pressable onPress={() = setAdminLoginVisible(false)} style={[styles.statsExportCloseBtn, { borderColor theme.border }]}
                  Text style={[styles.statsExportCloseBtnText, { color theme.text }]}SchließenText
                Pressable
              )  null}
            View
          View
        View
      Modal

      Modal visible={isExternalScopeModalVisible} animationType=fade transparent onRequestClose={() = setExternalScopeModalVisible(false)}
        View style={styles.privacyModalBackdrop}
          View style={[styles.statsExportModalCard, { backgroundColor theme.card, borderColor theme.border }]}
            Text style={[styles.statsExportModalTitle, { color theme.text }]}Externe Moschee wählenText
            Text style={[styles.noteText, { color theme.muted, textAlign 'center' }]}Öffnen über 3x Klick auf den grünen Header.Text
            {externalScopeLoading  (
              ActivityIndicator size=small color={theme.text} style={{ marginTop 10 }} 
            )  externalScopeOptions.length === 0  (
              Text style={[styles.noteText, { color theme.muted, textAlign 'center', marginTop 10 }]}Keine externen Moscheen gefunden.Text
            )  (
              ScrollView style={{ maxHeight 280, width '100%', marginTop 10 }} contentContainerStyle={{ gap 8 }}
                {externalScopeOptions.map((option) = {
                  const optionLabel = String(option.mosqueName  option.scopeKey  '').trim()  'Extern';
                  const isSelected = normalizeExternalScopeKey(guestActivation.scopeKey  guestActivation.mosqueName  '') === normalizeExternalScopeKey(option.scopeKey  '');
                  return (
                    Pressable
                      key={`ext_scope_${option.scopeKey}`}
                      onPress={() = selectExternalScope(option)}
                      style={({ pressed }) = [[styles.statsExportOptionBtn, { borderColor isSelected  theme.button  theme.border, backgroundColor isSelected  theme.button  theme.bg }], pressed && styles.buttonPressed]}
                    
                      Text style={[styles.statsExportOptionBtnText, { color isSelected  theme.buttonText  theme.text }]}{optionLabel}Text
                    Pressable
                  );
                })}
              ScrollView
            )}
            View style={styles.statsExportModalActions}
              Pressable onPress={() = { loadExternalScopeOptions(); }} style={[styles.statsExportOptionBtn, { borderColor theme.border, backgroundColor theme.bg }]}
                Text style={[styles.statsExportOptionBtnText, { color theme.text }]}AktualisierenText
              Pressable
              Pressable onPress={() = setExternalScopeModalVisible(false)} style={[styles.statsExportCloseBtn, { borderColor theme.border }]}
                Text style={[styles.statsExportCloseBtnText, { color theme.text }]}SchließenText
              Pressable
            View
          View
        View
      Modal


      Modal visible={isPrivacyModalVisible} animationType=slide transparent onRequestClose={() = setPrivacyModalVisible(false)}
        View style={styles.privacyModalBackdrop}
          SafeAreaView style={[styles.privacyModalCard, { backgroundColor theme.bg }]}
            View style={styles.privacyModalHeader}
              Text style={[styles.privacyModalTitle, { color theme.text }]}DatenschutzerklärungText
              Pressable onPress={() = setPrivacyModalVisible(false)} style={withPressEffect(styles.privacyModalCloseBtn)}
                Text style={[styles.privacyModalCloseText, { color theme.muted }]}SchließenText
              Pressable
            View
            ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.privacyModalBody}
              Text style={[styles.privacyModalHeroTitle, { color theme.text }]}Datenschutzerklärung – Verarbeitung von MitgliedsdatenText
              {PRIVACY_POLICY_SECTIONS.map((section, index) = (
                PrivacySection
                  key={section.title}
                  section={section}
                  theme={theme}
                  isLast={index === PRIVACY_POLICY_SECTIONS.length - 1}
                
              ))}
              Text style={[styles.privacyParagraph, { color theme.text, marginBottom 0 }]}
                Mehr Informationen zum Datenschutz finden Sie{' '}
                Text style={{ textDecorationLine 'underline' }} onPress={() = Linking.openURL('httpsahmadiyya.dedatenschutz')}
                  hier
                Text
                .
              Text
            ScrollView
          SafeAreaView
        View
      Modal

      Modal visible={isStatsCalendarVisible} animationType=slide transparent onRequestClose={() = setStatsCalendarVisible(false)}
        View style={styles.privacyModalBackdrop}
          SafeAreaView style={[styles.privacyModalCard, { backgroundColor theme.bg }]}
            View style={styles.privacyModalHeader}
              Text style={[styles.privacyModalTitle, { color theme.text }]}Datum auswählenText
              Pressable onPress={() = { setStatsCalendarVisible(false); }} style={withPressEffect(styles.privacyModalCloseBtn)}
                Text style={[styles.privacyModalCloseText, { color theme.muted }]}SchließenText
              Pressable
            View
            ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.statsCalendarBody}
              {selectedStatsDateISO && selectedStatsDateISO !== todayISO  (
                Pressable
                  onPress={() = { setSelectedStatsDateISO(todayISO); setStatsCalendarVisible(false); }}
                  style={[styles.statsCalendarResetBtn, { borderColor theme.border, backgroundColor theme.bg }]}
                
                  Text style={[styles.statsCalendarResetBtnText, { color theme.text }]}Auf heute zurücksetzen ({formatStatsDateShort(todayISO)})Text
                Pressable
              )  null}
              {availableStatsDates.length === 0  (
                Text style={[styles.noteText, { color theme.muted, textAlign 'center' }]}Keine Datumswerte verfügbar.Text
              )  availableStatsDates.map((iso) = {
                const dateObj = parseISO(iso);
                const label = dateObj  formatStatsDateShort(iso)  iso;
                const isActive = iso === selectedStatsDateISO;
                const isTodayEntry = iso === todayISO;
                return (
                  Pressable
                    key={iso}
                    onPress={() = { setSelectedStatsDateISO(iso); setStatsCalendarVisible(false); }}
                    style={[styles.statsCalendarItem, { borderColor theme.border, backgroundColor isActive  theme.button  theme.card }]}
                  
                    Text style={{ color isActive  theme.buttonText  theme.text, fontWeight '700' }}{isTodayEntry  `${label} (heute)`  label}Text
                  Pressable
                );
              })}
            ScrollView
          SafeAreaView
        View
      Modal

      Modal visible={isStatsWeekModalVisible} animationType=slide transparent onRequestClose={() = setStatsWeekModalVisible(false)}
        View style={styles.privacyModalBackdrop}
          SafeAreaView style={[styles.privacyModalCard, { backgroundColor theme.bg }]} 
            View style={styles.privacyModalHeader}
              Text style={[styles.privacyModalTitle, { color theme.text }]}KW auswählenText
              Pressable onPress={() = setStatsWeekModalVisible(false)} style={withPressEffect(styles.privacyModalCloseBtn)}
                Text style={[styles.privacyModalCloseText, { color theme.muted }]}SchließenText
              Pressable
            View
            ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.statsCalendarBody}
              {availableStatsWeeks.length === 0  (
                Text style={[styles.noteText, { color theme.muted, textAlign 'center' }]}Keine Kalenderwochen verfügbar.Text
              )  availableStatsWeeks.map((week) = {
                const isActive = week.weekStartISO === selectedStatsWeekStartISO;
                return (
                  Pressable
                    key={`week_${week.weekStartISO}`}
                    onPress={() = { setSelectedStatsWeekStartISO(week.weekStartISO); setStatsWeekModalVisible(false); }}
                    style={[styles.statsCalendarItem, { borderColor theme.border, backgroundColor isActive  theme.button  theme.card }]}
                  
                    Text style={{ color isActive  theme.buttonText  theme.text, fontWeight '700' }}{week.label}Text
                  Pressable
                );
              })}
            ScrollView
          SafeAreaView
        View
      Modal

      Modal visible={isStatsExportModalVisible} animationType=fade transparent onRequestClose={() = setStatsExportModalVisible(false)}
        View style={styles.privacyModalBackdrop}
          View style={[styles.statsExportModalCard, { backgroundColor theme.card, borderColor theme.border }]} 
            Text style={[styles.statsExportModalTitle, { color theme.text }]}Daten exportierenText
            Text style={[styles.noteText, { color theme.muted, textAlign 'center' }]}Wählen Sie den Zeitraum für den Excel-Export.Text
            View style={styles.statsExportModalActions}
              Pressable
                disabled={statsExporting  !hasStatsExportData}
                onPress={() = handleExportStats('currentWeek')}
                style={[styles.statsExportOptionBtn, { borderColor theme.border, backgroundColor theme.bg, opacity (statsExporting  !hasStatsExportData)  0.6  1 }]}
              
                Text style={[styles.statsExportOptionBtnText, { color theme.text }]}{`${currentWeekLabel} (.xlsx)`}Text
              Pressable
              Pressable
                disabled={statsExporting  !hasStatsExportData}
                onPress={() = handleExportStats('previousWeek')}
                style={[styles.statsExportOptionBtn, { borderColor theme.border, backgroundColor theme.bg, opacity (statsExporting  !hasStatsExportData)  0.6  1 }]}
              
                Text style={[styles.statsExportOptionBtnText, { color theme.text }]}Letzte Woche (.xlsx)Text
              Pressable
              Pressable
                disabled={statsExporting  !selectedStatsDateISO}
                onPress={() = handleExportStats('selectedDate')}
                style={[styles.statsExportOptionBtn, { borderColor theme.border, backgroundColor theme.bg, opacity (statsExporting  !selectedStatsDateISO)  0.6  1 }]}
              
                Text style={[styles.statsExportOptionBtnText, { color theme.text }]}{`Ausgewähltes Datum (${selectedStatsDateToggleLabel}) (.xlsx)`}Text
              Pressable
              {!hasStatsExportData  Text style={[styles.noteText, { color theme.muted, textAlign 'center' }]}Keine Daten zum Export verfügbarText  null}
            View
            Pressable onPress={() = setStatsExportModalVisible(false)} style={[styles.statsExportCloseBtn, { borderColor theme.border }]}
              Text style={[styles.statsExportCloseBtnText, { color theme.text }]}SchließenText
            Pressable
          View
        View
      Modal

      Modal visible={isProgramStatsPickerVisible} animationType=slide transparent onRequestClose={() = setProgramStatsPickerVisible(false)}
        View style={styles.privacyModalBackdrop}
          SafeAreaView style={[styles.privacyModalCard, { backgroundColor theme.bg }]}
            View style={styles.privacyModalHeader}
              Text style={[styles.privacyModalTitle, { color theme.text }]}{statsMode === 'registration'  'Anmeldung auswählen'  'Programm auswählen'}Text
              Pressable onPress={() = setProgramStatsPickerVisible(false)} style={withPressEffect(styles.privacyModalCloseBtn)}
                Text style={[styles.privacyModalCloseText, { color theme.muted }]}SchließenText
              Pressable
            View
            ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.statsCalendarBody}
              {(statsMode === 'registration'  availableRegistrationStatsOptions  availableProgramStatsOptions).length === 0  (
                Text style={[styles.noteText, { color theme.muted, textAlign 'center' }]}{statsMode === 'registration'  'Keine Anmeldungsdaten verfügbar.'  'Keine Programmdaten verfügbar.'}Text
              )  (statsMode === 'registration'  availableRegistrationStatsOptions  availableProgramStatsOptions).map((item) = {
                const itemId = statsMode === 'registration'  item.id  item.docId;
                const selectedId = statsMode === 'registration'  selectedRegistrationStatsOption.id  selectedProgramStatsOption.docId;
                const isActive = itemId === selectedId;
                return (
                  Pressable
                    key={`program_stats_${itemId}`}
                    onPress={() = {
                      if (statsMode === 'registration') setSelectedRegistrationStatsConfigId(item.id);
                      else setSelectedProgramStatsDocId(item.docId);
                      setProgramStatsPickerVisible(false);
                    }}
                    style={[styles.statsCalendarItem, { borderColor theme.border, backgroundColor isActive  theme.button  theme.card }]}
                  
                    Text style={{ color isActive  theme.buttonText  theme.text, fontWeight '700' }}{item.label}Text
                  Pressable
                );
              })}
            ScrollView
          SafeAreaView
        View
      Modal



      Modal visible={isDetailedIdOverviewVisible} animationType=slide transparent onRequestClose={() = setDetailedIdOverviewVisible(false)}
        View style={styles.privacyModalBackdrop}
          SafeAreaView style={[styles.privacyModalCard, { backgroundColor theme.bg }]}
            View style={styles.privacyModalHeader}
              Text style={[styles.privacyModalTitle, { color theme.text }]}Detaillierte ID-ÜbersichtText
              Pressable onPress={() = { setDetailedIdOverviewVisible(false); setDetailedCalendarVisible(false); setDetailedWeekPickerVisible(false); setDetailedExportModalVisible(false); setSelectedDetailedMember(null); setDetailedMemberLogs([]); }} style={withPressEffect(styles.privacyModalCloseBtn)}
                Text style={[styles.privacyModalCloseText, { color theme.muted }]}SchließenText
              Pressable
            View

            ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.detailedIdModalBody, !selectedDetailedMember && (!detailedFlowTanzeem  !detailedFlowMajlis) && styles.detailedIdModalBodyCompact]}
            
              {!selectedDetailedMember  (
                
                  {statsMode === 'program'  statsMode === 'registration'  (
                    Pressable
                      onPress={statsMode === 'program'  handleExportProgramDetailedIds  handleExportRegistrationDetailedIds}
                      disabled={(statsMode === 'program'  detailedProgramExporting  detailedRegistrationExporting)  !effectivePermissions.canExportData}
                      style={[styles.statsExportBtn, { borderColor theme.border, backgroundColor ((statsMode === 'program'  detailedProgramExporting  detailedRegistrationExporting)  !effectivePermissions.canExportData)  theme.border  theme.bg, opacity ((statsMode === 'program'  detailedProgramExporting  detailedRegistrationExporting)  !effectivePermissions.canExportData)  0.7  1 }]}
                    
                      Text style={[styles.statsExportBtnText, { color theme.text }]}{(statsMode === 'program'  detailedProgramExporting  detailedRegistrationExporting)  'Export läuft…'  'Daten exportieren'}Text
                    Pressable
                  )  null}

                  View style={[styles.detailedGuideCard, { borderColor theme.border, backgroundColor theme.card }]} 
                    Text style={[styles.detailedGuideTitle, { color theme.text }]}Bitte zuerst auswählenText
                    Text style={[styles.detailedGuideText, { color theme.muted }]}{`Flow Tanzeem → ${hasGuestEntriesWithoutMajlis  'Jamaat'  'Majlis'} → ID Suche`}Text
                  View
                  View style={styles.statsToggleRow}
                    {(statsMode === 'program'
                       PROGRAM_TANZEEM_OPTIONS
                       (statsMode === 'registration'
                         (selectedRegistrationStatsOption.advanced.includeTanzeems  [])
                         TANZEEM_OPTIONS)).map((key) = {
                      const isActive = detailedFlowTanzeem === key;
                      return (
                        Pressable
                          key={key}
                          onPress={() = { setDetailedFlowTanzeem(key); setDetailedFlowMajlis(''); setDetailedIdSearchQuery(''); }}
                          style={[styles.statsToggleBtn, { borderColor isActive  theme.button  theme.border, backgroundColor isActive  theme.button  theme.bg }]}
                        
                          Text style={[styles.statsToggleBtnText, { color isActive  theme.buttonText  theme.text }]}{TANZEEM_LABELS[key]}Text
                        Pressable
                      );
                    })}
                  View

                  {detailedFlowTanzeem  (
                    View style={styles.detailedIdSectionWrap}
                      Text style={[styles.statsCardTitle, { color theme.muted }]}{getLocationLabel(detailedFlowMajlis  detailedMajlisOptions[0])}Text
                      View style={styles.detailedIdChipsWrap}
                        {detailedMajlisOptions.map((majlis) = {
                          const isActive = detailedFlowMajlis === majlis;
                          return (
                            Pressable
                              key={majlis}
                              onPress={() = setDetailedFlowMajlis(majlis)}
                              style={[styles.detailedIdChip, { borderColor isActive  theme.button  theme.border, backgroundColor isActive  theme.button  theme.bg }]}
                            
                              Text style={{ color isActive  theme.buttonText  theme.text, fontWeight '700' }}{resolveExportMajlisLabel(majlis)}Text
                            Pressable
                          );
                        })}
                      View
                    View
                  )  null}

                  {detailedFlowMajlis  (
                  TextInput
                    value={detailedIdSearchQuery}
                    onChangeText={setDetailedIdSearchQuery}
                    placeholder=ID-Nummer suchen
                    placeholderTextColor={theme.muted}
                    keyboardType=number-pad
                    style={[styles.idSearchInput, { marginTop 8, color theme.text, borderColor theme.border, backgroundColor theme.bg }]}
                  

                  View style={styles.detailedIdListWrap}
                    {detailedIdChoices.map((member) = (
                      Pressable
                        key={`${member.tanzeem}_${member.majlis}_${member.idNumber}`}
                        onPress={statsMode === 'program'  statsMode === 'registration'  undefined  () = {
                          setSelectedDetailedMember(member);
                          setDetailedGraphRange('currentWeek');
                          setDetailedPrayerRange('currentWeek');
                          const firstWeek = getLast8Weeks(now)[0];
                          const minISO = selectedStatsDateISO && selectedStatsDateISO  firstWeek.startISO  selectedStatsDateISO  firstWeek.startISO;
                          const maxISO = selectedStatsDateISO && selectedStatsDateISO  toISO(now)  selectedStatsDateISO  toISO(now);
                          loadDetailedLogsForMember(member.idNumber, minISO, maxISO);
                        }}
                        style={[styles.detailedIdRow, { borderColor theme.border, backgroundColor theme.card }]}
                      
                        {statsMode === 'program'  statsMode === 'registration'  (
                          Text style={{ color theme.text, fontWeight '700' }}{`${member.idNumber} ${TANZEEM_LABELS[member.tanzeem]} ${resolveExportMajlisLabel(member.majlis, member.amarat)}`}Text
                        )  (
                          
                            Text style={{ color theme.text, fontWeight '700' }}{member.idNumber}Text
                            Text style={{ color theme.muted, fontSize 12 }}{`${TANZEEM_LABELS[member.tanzeem]} · ${resolveExportMajlisLabel(member.majlis, member.amarat)}`}Text
                          
                        )}
                        {statsMode === 'program'  statsMode === 'registration'  (
                          Text style={{
                            color member.hasActiveFlow
                               (statsMode === 'registration' && member.registrationResponseInActiveFlow === 'decline'
                                 '#D97706'
                                 (member.isPresentInActiveFlow  '#16A34A'  '#DC2626'))
                               theme.muted,
                            fontSize 12,
                            marginTop 4,
                          }}
                            {member.hasActiveFlow
                               (statsMode === 'registration'
                                 (member.registrationResponseInActiveFlow === 'decline'
                                   `● Absage ${member.registrationDeclineHasReason  '(mit Grund)'  '(ohne Grund)'}`
                                   (member.isPresentInActiveFlow  '● angemeldet'  '● nicht angemeldet'))
                                 (member.isPresentInActiveFlow  '● angemeldet'  '● nicht angemeldet'))
                               (statsMode === 'program'  'Kein aktives Programm konfiguriert'  'Keine aktive Anmeldung ausgewählt')}
                          Text
                        )  null}
                        {statsMode === 'registration' && member.normalizedStimmberechtigt === 0  (
                          Text style={{ color theme.muted, fontSize 12, marginTop 2 }}Darf nicht teilnehmen.Text
                        )  null}
                      Pressable
                    ))}
                    {detailedIdChoices.length === 0  Text style={[styles.noteText, { color theme.muted }]}Keine IDs gefunden.Text  null}
                    {statsMode === 'program' && !String(selectedProgramStatsOption.programName  selectedProgramConfig.name  '').trim()  (
                      Text style={[styles.noteText, { color theme.muted }]}Kein Programm ausgewählt. IDs werden ohne Anwesenheitsstatus angezeigt.Text
                    )  null}
                  View
                  )  null}
                  {!detailedFlowTanzeem  !detailedFlowMajlis  (
                    Text style={[styles.detailedGuideHint, { color theme.button }]}{`Bitte Tanzeem und ${hasGuestEntriesWithoutMajlis  'Jamaat'  'Majlis'} auswählen, dann erscheinen die IDs.`}Text
                  )  null}
                
              )  (
                
                  Pressable
                    onPress={() = {
                      setDetailedGraphRange('currentWeek');
                      setDetailedPrayerRange('currentWeek');
                      setDetailedWeekPickerVisible(true);
                    }}
                    style={[styles.statsCalendarBtn, { borderColor theme.border, backgroundColor theme.bg }]}
                  
                    Text style={[styles.statsCalendarBtnText, { color theme.text }]}{`KW auswählen · ${currentWeekLabel}`}Text
                  Pressable

                  Pressable onPress={() = { setSelectedDetailedMember(null); setDetailedMemberLogs([]); }} style={[styles.statsCardMiniSwitch, { alignSelf 'flex-start', borderColor theme.border, backgroundColor theme.bg }]}
                    Text style={[styles.statsCardMiniSwitchText, { color theme.text }]}ZurückText
                  Pressable

                  View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                    Text style={[styles.statsCardTitle, { color theme.muted }]}ID {selectedDetailedMember.idNumber}Text
                    Text style={{ color theme.text, fontWeight '700', marginTop 4 }}{`${getLocationLabel(selectedDetailedMember.majlis)} ${resolveExportMajlisLabel(selectedDetailedMember.majlis, selectedDetailedMember.amarat)}`}Text
                    Text style={[styles.noteText, { color theme.muted, marginTop 2 }]}{TANZEEM_LABELS[selectedDetailedMember.tanzeem]}Text
                  View

                  View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]}
                    Text style={[styles.statsCardTitle, { color theme.muted }]}Status (wöchentlich)Text
                    {detailedLogsLoading  ActivityIndicator size=small color={theme.text} style={{ marginTop 8 }}   null}
                    Text style={[styles.statsInsightText, { color theme.text, marginTop 6 }]}{`Diese Woche ${detailedCurrentWeekCount}  35`}Text
                    Text style={[styles.statsInsightText, { color theme.text }]}{`Letzte Woche ${detailedPreviousWeekCount}  35`}Text
                    Text style={[styles.statsInsightText, { color theme.text }]}{`Differenz (Δ) ${detailedCurrentWeekCount - detailedPreviousWeekCount = 0  '+'  ''}${detailedCurrentWeekCount - detailedPreviousWeekCount}`}Text
                    Text style={[styles.statsInsightText, { color theme.text }]}{`Durchschnitt pro Tag ${(detailedCurrentWeekCount  7).toFixed(1)}`}Text
                    Text style={[styles.statsInsightText, { color theme.text, marginTop 6 }]}{detailedStatus.label}Text
                    Text style={[styles.noteText, { color theme.muted, marginTop 4 }]}{`Entspricht ca. ${(detailedCurrentWeekCount  7).toFixed(1)} Gebeten pro Tag (Ø)`}Text
                  View

                  View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]} 
                    View style={styles.statsCardHeaderRow}
                      Text style={[styles.statsCardTitle, { color theme.muted }]}Anzahl der Gebete nach TageText
                      Pressable
                        onPress={() = setDetailedGraphRange((prev) = {
                          const options = ['currentWeek', 'previousWeek', 'fourWeeks'];
                          const idx = options.indexOf(prev);
                          return options[(idx + 1) % options.length];
                        })}
                        style={[styles.statsCardMiniSwitch, !isTablet && styles.statsCardMiniSwitchMobile, { borderColor theme.border, backgroundColor theme.bg }]}
                      
                        Text numberOfLines={1} style={[styles.statsCardMiniSwitchText, !isTablet && styles.statsCardMiniSwitchTextMobile, { color theme.text }]}{detailedTopRangeToggleLabel}Text
                      Pressable
                    View
                    Text style={[styles.statsCardRangeInfo, { color theme.muted }]}{`${detailedTopRangeLabel} · ${detailedTopRangePeriodLabel}`}Text
                    MiniLineChart
                      labels={detailedGraphRange === 'fourWeeks'
                         detailedComparisonSeries.map((row) = `KW ${row.weekNumber}`)
                         detailedComparisonSeries.map((row) = {
                          const d = parseISO(row.iso);
                          return d  new Intl.DateTimeFormat('de-DE', { weekday 'short' }).format(d).replace(.$, '')  row.iso;
                        })}
                      series={[{
                        key detailedGraphRange === 'fourWeeks'  'weekly'  'daily',
                        label detailedGraphRange === 'fourWeeks'  'GebeteWoche'  'GebeteTag',
                        color theme.button,
                        thick true,
                        data detailedComparisonSeries.map((row) = row.value),
                      }]}
                      theme={theme}
                      isDarkMode={isDarkMode}
                      xAxisTitle={detailedGraphRange === 'fourWeeks'  'Kalenderwochen'  'Tage'}
                      yMaxValue={detailedGraphRange === 'fourWeeks'  35  5}
                      yTickCount={detailedGraphRange === 'fourWeeks'  6  6}
                    
                  View

                  View style={[styles.statsCard, { backgroundColor theme.card, borderColor theme.border }]} 
                    View style={styles.statsCardHeaderRow}
                      View
                        Text style={[styles.statsCardTitle, { color theme.muted }]}Anzahl der Gebete nach GebetszeitenText
                        Text style={[styles.statsCardRangeInfo, { color theme.muted }]}{formatRangeLabel(detailedPrayerRange)}Text
                      View
                      Pressable onPress={() = setDetailedPrayerRange(cycleStatsRangeMode)} style={[styles.statsCardMiniSwitch, !isTablet && styles.statsCardMiniSwitchMobile, { borderColor theme.border, backgroundColor theme.bg }]}
                        Text numberOfLines={1} style={[styles.statsCardMiniSwitchText, !isTablet && styles.statsCardMiniSwitchTextMobile, { color theme.text }]}{getRangeToggleLabel(detailedPrayerRange)}Text
                      Pressable
                    View
                    {detailedPrayerRange === 'selectedDate'  (
                      Pressable onPress={() = setDetailedCalendarVisible(true)} style={[styles.statsCalendarBtn, { borderColor theme.border, backgroundColor theme.bg, marginTop 10 }]}
                        Text style={[styles.statsCalendarBtnText, { color theme.text }]}{`Datum auswählen · ${selectedStatsDateLabel}`}Text
                      Pressable
                    )  null}
                    MiniLineChart
                      labels={detailedPrayerRows.map((row) = row.label)}
                      series={[{ key 'detailedPrayerTotals', label 'Anzahl der Gebete nach Gebetszeiten', color theme.button, thick true, data detailedPrayerRows.map((row) = row.total) }]}
                      theme={theme}
                      isDarkMode={isDarkMode}
                      xAxisTitle=Gebete
                      useEqualLabelSlots
                      pointLabelFormatter={({ label, value }) = `${label}, ${Number(value)  0} Gebete`}
                    
                  View

                  Pressable
                    onPress={() = setDetailedExportModalVisible(true)}
                    disabled={detailedExporting  !hasDetailedExportData  !effectivePermissions.canExportData}
                    style={[styles.statsExportBtn, { borderColor theme.border, backgroundColor (detailedExporting  !hasDetailedExportData)  theme.border  theme.bg, opacity (detailedExporting  !hasDetailedExportData)  0.7  1 }]}
                  
                    Text style={[styles.statsExportBtnText, { color theme.text }]}{detailedExporting  'Export läuft…'  'Daten exportieren'}Text
                  Pressable
                
              )}
            ScrollView

            {isDetailedExportModalVisible  (
              View style={styles.detailedInlineCalendarOverlay}
                View style={[styles.statsExportModalCard, { backgroundColor theme.card, borderColor theme.border }]} 
                  Text style={[styles.statsExportModalTitle, { color theme.text }]}Detaillierte ID exportierenText
                  Text style={[styles.noteText, { color theme.muted, textAlign 'center' }]}Wählen Sie den Zeitraum für den Excel-Export.Text
                  View style={styles.statsExportModalActions}
                    Pressable
                      disabled={detailedExporting  !hasDetailedExportData  !effectivePermissions.canExportData}
                      onPress={() = handleExportDetailed('currentWeek')}
                      style={[styles.statsExportOptionBtn, { borderColor theme.border, backgroundColor theme.bg, opacity (detailedExporting  !hasDetailedExportData)  0.6  1 }]}
                    
                      Text style={[styles.statsExportOptionBtnText, { color theme.text }]}{`Ausgewählte ${currentWeekLabel} (.xlsx)`}Text
                    Pressable
                    Pressable
                      disabled={detailedExporting  !hasDetailedExportData  !effectivePermissions.canExportData}
                      onPress={() = handleExportDetailed('previousWeek')}
                      style={[styles.statsExportOptionBtn, { borderColor theme.border, backgroundColor theme.bg, opacity (detailedExporting  !hasDetailedExportData)  0.6  1 }]}
                    
                      Text style={[styles.statsExportOptionBtnText, { color theme.text }]}Letzte Woche (.xlsx)Text
                    Pressable
                  View
                  Pressable onPress={() = setDetailedExportModalVisible(false)} style={[styles.statsExportCloseBtn, { borderColor theme.border }]}
                    Text style={[styles.statsExportCloseBtnText, { color theme.text }]}SchließenText
                  Pressable
                View
              View
            )  null}

            {isDetailedWeekPickerVisible  (
              View style={styles.detailedInlineCalendarOverlay}
                View style={[styles.detailedInlineCalendarCard, { backgroundColor theme.bg, borderColor theme.border }]} 
                  View style={styles.privacyModalHeader}
                    Text style={[styles.privacyModalTitle, { color theme.text }]}KW auswählenText
                    Pressable onPress={() = setDetailedWeekPickerVisible(false)} style={withPressEffect(styles.privacyModalCloseBtn)}
                      Text style={[styles.privacyModalCloseText, { color theme.muted }]}SchließenText
                    Pressable
                  View
                  ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.statsCalendarBody}
                    {availableStatsWeeks.length === 0  (
                      Text style={[styles.noteText, { color theme.muted, textAlign 'center' }]}Keine Kalenderwochen verfügbar.Text
                    )  availableStatsWeeks.map((week) = {
                      const isActive = week.weekStartISO === selectedStatsWeekStartISO;
                      return (
                        Pressable
                          key={`detailed_week_${week.weekStartISO}`}
                          onPress={() = { setSelectedStatsWeekStartISO(week.weekStartISO); setDetailedGraphRange('currentWeek'); setDetailedPrayerRange('currentWeek'); setDetailedWeekPickerVisible(false); }}
                          style={[styles.statsCalendarItem, { borderColor theme.border, backgroundColor isActive  theme.button  theme.card }]}
                        
                          Text style={{ color isActive  theme.buttonText  theme.text, fontWeight '700' }}{week.label}Text
                        Pressable
                      );
                    })}
                  ScrollView
                View
              View
            )  null}

            {isDetailedCalendarVisible  (
              View style={styles.detailedInlineCalendarOverlay}
                View style={[styles.detailedInlineCalendarCard, { backgroundColor theme.bg, borderColor theme.border }]} 
                  View style={styles.privacyModalHeader}
                    Text style={[styles.privacyModalTitle, { color theme.text }]}Datum auswählenText
                    Pressable onPress={() = setDetailedCalendarVisible(false)} style={withPressEffect(styles.privacyModalCloseBtn)}
                      Text style={[styles.privacyModalCloseText, { color theme.muted }]}SchließenText
                    Pressable
                  View
                  ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.statsCalendarBody}
                    {selectedStatsDateISO && selectedStatsDateISO !== todayISO  (
                      Pressable
                        onPress={() = { setSelectedStatsDateISO(todayISO); setDetailedCalendarVisible(false); }}
                        style={[styles.statsCalendarResetBtn, { borderColor theme.border, backgroundColor theme.bg }]}
                      
                        Text style={[styles.statsCalendarResetBtnText, { color theme.text }]}Auf heute zurücksetzen ({formatStatsDateShort(todayISO)})Text
                      Pressable
                    )  null}
                    {availableStatsDates.length === 0  (
                      Text style={[styles.noteText, { color theme.muted, textAlign 'center' }]}Keine Datumswerte verfügbar.Text
                    )  availableStatsDates.map((iso) = {
                      const dateObj = parseISO(iso);
                      const label = dateObj  formatStatsDateShort(iso)  iso;
                      const isActive = iso === selectedStatsDateISO;
                      const isTodayEntry = iso === todayISO;
                      return (
                        Pressable
                          key={`detailed_${iso}`}
                          onPress={() = { setSelectedStatsDateISO(iso); setDetailedCalendarVisible(false); }}
                          style={[styles.statsCalendarItem, { borderColor theme.border, backgroundColor isActive  theme.button  theme.card }]}
                        
                          Text style={{ color isActive  theme.buttonText  theme.text, fontWeight '700' }}{isTodayEntry  `${label} (heute)`  label}Text
                        Pressable
                      );
                    })}
                  ScrollView
                View
              View
            )  null}
          SafeAreaView
        View
      Modal


      {toast  (
        View style={[styles.toast, { backgroundColor getToastTone(toast) === 'negative'  '#DC2626'  '#16A34A' }]}Text style={{ color '#FFFFFF', fontWeight '700' }}{toast}TextView
      )  null}
    SafeAreaView
  );
}


export default function App() {
  return (
    SafeAreaProvider
      AppContent 
    SafeAreaProvider
  );
}

const styles = StyleSheet.create({
  safeArea { flex 1 },
  basmalaText { textAlign 'center', fontSize 14, lineHeight 20, paddingTop 6, paddingBottom 2, fontFamily Platform.select({ ios 'Geeza Pro', default 'serif' }), transform [{ translateY 8 }] },
  logoWrap { alignItems 'center', paddingBottom 6, transform [{ translateY 8 }] },
  logoImage { width 34, height 34, opacity 0.92, backgroundColor 'transparent' },
  accountSessionCenterWrap { alignItems 'center', marginTop 2, marginBottom 8 },
  accountSessionCenterName { fontSize 13, fontWeight '700' },
  accountSessionCenterLogoutBtn { marginTop 2, paddingVertical 2, paddingHorizontal 8 },
  accountSessionCenterLogoutText { fontSize 12, fontWeight '600' },
  content { flexGrow 1, padding 16, gap 10, paddingBottom 16 },
  contentTablet { width '100%', maxWidth 1180, alignSelf 'center', paddingHorizontal 26, gap 14 },
  headerRow { flexDirection 'row', justifyContent 'center', alignItems 'center', position 'relative' },
  titleWrap { flex 1, alignItems 'center' },
  title { fontSize 31, fontWeight '800', textAlign 'center', letterSpacing 0.4 },
  subtitle { fontSize 14, textAlign 'center' },
  titleArabic { fontSize 16, textAlign 'center', marginTop 0 },
  dayCard { borderRadius 16, borderWidth 1, padding 14, gap 8 },
  dayName { fontSize 42, fontWeight '800', textAlign 'center' },
  dayDate { fontSize 20, textAlign 'center' },
  cityBadge { alignSelf 'center', borderRadius 12, paddingVertical 8, paddingHorizontal 14, marginBottom 4 },
  cityBadgeText { fontSize 18, fontWeight '700' },
  syncStatus { textAlign 'center', fontSize 12, fontWeight '700', marginBottom 6 },
  prayerRow { flexDirection 'row', alignItems 'center', justifyContent 'space-between', paddingVertical 12, paddingHorizontal 8, borderBottomWidth 1 },
  prayerLabel { fontSize 17, fontWeight '500', flex 1, marginRight 10 },
  prayerValue { fontSize 20, fontWeight '700' },
  bottomSticky { gap 10 },
  footer { textAlign 'center', fontSize 12, fontWeight '500', marginTop 2 },
  appMetaWrap { marginTop 6, marginBottom 8, paddingHorizontal 6, gap 4 },
  appMetaVersion { textAlign 'center', fontSize 12, fontWeight '700' },
  appMetaCopyright { textAlign 'center', fontSize 11, lineHeight 16 },
  section { borderRadius 14, borderWidth 1, padding 10, gap 8, marginBottom 10, marginTop 20 },
  settingsHeroCard { borderRadius 18, paddingVertical 22, paddingHorizontal 18, gap 16, marginTop 8, marginBottom 4 },
  settingsMosqueHighlightCard { borderWidth 1, borderRadius 16, paddingVertical 12, paddingHorizontal 14, alignItems 'center', marginTop 6 },
  settingsMosqueHighlightTitle { fontSize 12, fontWeight '800', letterSpacing 0.3, textTransform 'uppercase' },
  settingsMosqueHighlightValue { marginTop 4, fontSize 20, fontWeight '800' },
  settingsHeroTitle { textAlign 'center', fontSize 22, fontWeight '700', letterSpacing 0.2 },
  settingsHeroMeta { textAlign 'center', fontSize 13, fontWeight '500' },
  mergeSwitchWrap { flexDirection 'row', justifyContent 'space-between', alignItems 'center', marginTop 4 },
  mergeSwitchLabel { fontSize 14, fontWeight '600' },
  mergeInputWrap { gap 12, marginTop 4 },
  mergeInputDisabled { opacity 0.45 },
  mergeInput { borderWidth 1, borderRadius 12, paddingHorizontal 12, paddingVertical 11, textAlign 'center', fontSize 15, fontWeight '600' },
  sectionTitle { fontSize 16, fontWeight '700' },
  sectionTitleTablet { fontSize 22 },
  activeMosqueSection { alignItems 'center' },
  activeMosqueSectionTitle { textAlign 'center' },
  activeMosqueSectionCurrent { marginTop 4, textAlign 'center' },
  activeMosqueToggleRow { width '100%', justifyContent 'center' },
  modeSwitch { alignSelf 'center', paddingVertical 6, paddingHorizontal 10, marginBottom 6 },
  modeSwitchText { fontSize 14, fontWeight '700' },
  modeSwitchTextTablet { fontSize 20 },
  switchRow { flexDirection 'row', justifyContent 'space-between', alignItems 'center' },
  presetBtnText { fontSize 13, fontWeight '700' },
  presetBtnTextTablet { fontSize 18 },
  saveBtn { borderRadius 10, paddingVertical 11, alignItems 'center' },
  settingsSaveBtn { marginTop 4, alignSelf 'center', width '68%' },
  saveBtnText { fontSize 14, fontWeight '700' },
  saveBtnTextTablet { fontSize 18 },
  registrationConfirmBtn { borderRadius 12, paddingVertical 16, alignItems 'center', backgroundColor '#16A34A' },
  registrationConfirmBtnText { color '#FFFFFF', fontSize 22, fontWeight '800' },
  registrationVoterInfoCard { borderWidth 1, borderRadius 12, paddingVertical 12, paddingHorizontal 14, marginBottom 10 },
  registrationVoterInfoHeadline { fontSize 18, fontWeight '800', textAlign 'center', lineHeight 24 },
  registrationVoterInfoDetail { marginTop 6, fontSize 13, fontWeight '600', textAlign 'center' },
  noteText { fontSize 12, fontWeight '600' },
  announcementCard { marginTop 14, borderWidth 1, borderRadius 14, paddingVertical 14, paddingHorizontal 14, gap 8 },
  announcementCardTablet { marginTop 18, borderRadius 16, paddingVertical 18, paddingHorizontal 18 },
  announcementTitle { fontSize 13, fontWeight '800', letterSpacing 0.3, textTransform 'uppercase' },
  announcementTitleTablet { fontSize 14 },
  announcementBody { fontSize 16, lineHeight 24, fontWeight '500' },
  announcementBodyTablet { fontSize 18, lineHeight 28 },
  announcementBodyBold { fontWeight '800' },
  announcementBodyItalic { fontStyle 'italic' },
  announcementBodyStrike { textDecorationLine 'line-through' },
  announcementInput { borderWidth 1, borderRadius 12, minHeight 124, paddingHorizontal 12, paddingVertical 12, fontSize 15, lineHeight 22 },
  announcementInputTablet { minHeight 154, fontSize 17, lineHeight 26, paddingHorizontal 14, paddingVertical 14 },
  announcementActions { flexDirection 'row', gap 10, marginTop 2 },
  announcementActionsTablet { marginTop 6, gap 12 },
  announcementActionBtn { flex 1 },
  tabBar { flexDirection 'row', borderTopWidth 1, minHeight 52, paddingHorizontal 6 },
  tabBarTablet { minHeight 72, paddingHorizontal 16 },
  tabBarTabletWebCompact { minHeight 44, paddingHorizontal 10 },
  tabItem { flex 1, alignItems 'center', justifyContent 'center', paddingVertical 8, paddingHorizontal 4 },
  tabItemTabletWebCompact { paddingVertical 5 },
  buttonPressed { transform [{ scale 0.96 }], opacity 0.9 },
  qrPageCard { alignItems 'center', paddingVertical 22, gap 14 },
  qrPageTitle { textAlign 'center', fontSize 24, fontWeight '800' },
  qrPageSubtitle { textAlign 'center', fontSize 14, fontWeight '600' },
  qrPageHint { textAlign 'center', fontSize 12, fontWeight '600' },
  qrPageCloseBtn { alignSelf 'stretch', marginTop 4 },
  qrCodeCard { borderWidth 1, borderRadius 20, padding 16, alignItems 'center', justifyContent 'center' },
  qrCodeImage { width 280, height 280 },
  qrCodePreloadImage { width 1, height 1, opacity 0, position 'absolute' },
  qrTimerChip { alignSelf 'center', borderWidth 1, borderRadius 999, paddingVertical 8, paddingHorizontal 14 },
  qrTimerText { fontSize 14, fontWeight '800' },
  qrStatusCard { borderWidth 1, borderRadius 14, padding 12, backgroundColor 'rgba(59,130,246,0.08)' },
  qrStatusCardPositive { backgroundColor 'rgba(34,197,94,0.14)' },
  qrStatusCardNegative { backgroundColor 'rgba(239,68,68,0.14)' },
  qrStatusText { textAlign 'center', fontSize 14, fontWeight '700' },
  qrRegisteredMeta { textAlign 'center', fontSize 12, fontWeight '600' },
  qrDeviceHintCard { borderWidth 1, borderRadius 14, padding 12 },
  qrDeviceHintText { textAlign 'center', fontSize 13, lineHeight 20, fontWeight '600' },
  terminalInlineQrCard { marginTop 14, borderWidth 1, borderRadius 16, paddingVertical 12, paddingHorizontal 12, alignItems 'center' },
  terminalInlineQrTitle { fontSize 14, fontWeight '800', textAlign 'center' },
  terminalInlineQrHint { marginTop 4, fontSize 12, fontWeight '600', textAlign 'center' },
  terminalInlineQrImageWrap { marginTop 10, borderWidth 1, borderRadius 12, padding 8 },
  terminalInlineQrImage { width 180, height 180 },
  terminalInlineQrTimerChip { marginTop 10, borderWidth 1, borderRadius 999, paddingVertical 6, paddingHorizontal 12 },
  terminalInlineQrTimerText { fontSize 12, fontWeight '800', textAlign 'center' },
  tabLabel { fontSize 9, textAlign 'center', width '100%' },
  tabLabelTablet { fontSize 12 },
  tabLabelTabletWebCompact { fontSize 10 },
  toast { position 'absolute', bottom 68, alignSelf 'center', paddingHorizontal 14, paddingVertical 10, borderRadius 10 },
  bigTerminalBtn { borderRadius 18, minHeight 120, alignItems 'center', justifyContent 'center' },
  bigTerminalText { fontSize 34, fontWeight '800' },
  terminalBanner { borderRadius 16, borderWidth 1, paddingVertical 14, paddingHorizontal 12, shadowColor '#000', shadowOpacity 0.08, shadowRadius 12, shadowOffset { width 0, height 6 }, elevation 2 },
  terminalBannerTitle { textAlign 'center', fontSize 20, fontWeight '800', letterSpacing 0.2 },
  terminalBannerArabic { textAlign 'center', marginTop 2, fontSize 16, fontFamily Platform.select({ ios 'Geeza Pro', default 'serif' }) },
  terminalBannerSubtitle { textAlign 'center', marginTop 4, fontSize 13, fontWeight '600' },
  currentPrayerCard { borderRadius 16, borderWidth 1, paddingVertical 14, paddingHorizontal 12, shadowColor '#000', shadowOpacity 0.08, shadowRadius 12, shadowOffset { width 0, height 6 }, elevation 2 },
  currentPrayerText { textAlign 'center', fontSize 20, fontWeight '800' },
  headlineBlock { alignItems 'center', gap 4 },
  headlineTitleText { textAlign 'center', fontSize 24, fontWeight '900', lineHeight 30 },
  headlineSubtitleText { textAlign 'center', fontSize 17, fontWeight '700', lineHeight 23 },
  headlineExtraText { textAlign 'center', fontSize 14, fontWeight '600', lineHeight 20, opacity 0.85 },
  noPrayerTitle { textAlign 'center', alignSelf 'center', fontSize 18, fontWeight '800', paddingVertical 6, paddingHorizontal 14, borderRadius 999, overflow 'hidden', letterSpacing 0.2 },
  noPrayerTitleLight { backgroundColor '#FFF4A3', color '#111111' },
  noPrayerTitleDark { backgroundColor '#FFF4A3', color '#111111' },
  noPrayerCountdownChip { alignSelf 'center', marginTop 12, borderRadius 12, borderWidth 2, paddingVertical 8, paddingHorizontal 12 },
  noPrayerCountdownText { fontSize 13, fontWeight '600', letterSpacing 0.1 },
  nextPrayerValue { textAlign 'center', fontSize 20, fontWeight '800', marginTop 4 },
  programScheduledHint { marginTop 10, borderRadius 12, borderWidth 1, paddingVertical 10, paddingHorizontal 12, alignItems 'center', gap 4 },
  programScheduledLabel { fontSize 14, fontWeight '800', textAlign 'center' },
  programScheduledValue { fontSize 16, fontWeight '700', textAlign 'center', lineHeight 22 },
  urduText { textAlign 'center', fontSize 16, marginTop -2, marginBottom 4 },

  privacyNoticeWrap { marginTop 34, paddingHorizontal 6, alignItems 'center' },
  privacyNoticeText { textAlign 'center', fontSize 12, lineHeight 18, fontWeight '400' },
  privacyNoticeLinkWrap { marginTop 8, paddingVertical 2, paddingHorizontal 4 },
  privacyNoticeLinkText { fontSize 12, lineHeight 16, fontWeight '400', textDecorationLine 'underline' },
  attendanceFooterWrap { marginTop 46, marginBottom 2, alignItems 'center', alignSelf 'stretch' },
  attendanceFooterText { textAlign 'center', fontSize 10, lineHeight 14, fontWeight '400', letterSpacing 0.1 },
  attendanceFooterDivider { width '72%', maxWidth 320, height StyleSheet.hairlineWidth, marginVertical 8, opacity 0.4 },
  quickSearchLinkWrap { marginTop 6, alignSelf 'center' },
  quickSearchLinkText { fontSize 12, lineHeight 16, fontWeight '400', textDecorationLine 'underline' },
  quickSearchPanel { marginTop -2, borderWidth 1, borderRadius 12, padding 10, gap 8 },
  quickSearchResultsWrap { gap 8, marginTop 4 },
  quickSearchResultCard { borderWidth 1, borderRadius 10, paddingVertical 10, paddingHorizontal 10 },
  quickSearchResultText { fontSize 14, fontWeight '700' },
  privacyModalBackdrop { flex 1, backgroundColor 'rgba(0, 0, 0, 0.35)', justifyContent 'center', padding 16 },
  privacyModalCard { flex 1, borderRadius 16, overflow 'hidden' },
  privacyModalHeader { flexDirection 'row', justifyContent 'space-between', alignItems 'center', paddingHorizontal 20, paddingTop 10, paddingBottom 10 },
  privacyModalTitle { fontSize 24, fontWeight '700', letterSpacing 0.2 },
  privacyModalCloseBtn { paddingVertical 6, paddingHorizontal 4 },
  privacyModalCloseText { fontSize 14, fontWeight '500' },
  privacyModalBody { paddingHorizontal 20, paddingBottom 32, paddingTop 4 },
  statsCalendarBody { paddingHorizontal 20, paddingBottom 24, gap 10 },
  statsCalendarItem { borderWidth 1, borderRadius 12, paddingVertical 12, paddingHorizontal 12 },
  statsCalendarResetBtn { borderWidth 1, borderRadius 12, paddingVertical 10, paddingHorizontal 12, alignItems 'center', marginBottom 2 },
  statsCalendarResetBtnText { fontSize 12, fontWeight '700' },
  privacyModalHeroTitle { fontSize 23, fontWeight '700', lineHeight 30, marginTop 4, marginBottom 8 },
  privacySection { marginTop 18 },
  privacySectionLast { marginBottom 10 },
  privacySectionTitle { fontSize 17, fontWeight '600', lineHeight 24, marginBottom 10 },
  privacyParagraph { fontSize 15, lineHeight 24, fontWeight '400', marginBottom 10 },
  privacyParagraphBold { fontWeight '700' },
  privacyBulletRow { flexDirection 'row', alignItems 'flex-start', paddingLeft 4, marginBottom 8 },
  privacyBulletDot { width 16, fontSize 15, lineHeight 24, fontWeight '500' },
  privacyBulletText { flex 1, fontSize 15, lineHeight 24, fontWeight '400' },
  privacyDivider { height 1, marginTop 10, opacity 0.45 },
  guestButtonRow { flexDirection 'row', gap 10, marginTop 10 },
  guestButtonSpacer { flex 1 },
  guestButton { flex 1 },
  guestButtonLightOutline { borderWidth 1, borderColor '#FFFFFF' },
  idSearchInput { marginTop -8, borderWidth 1, borderRadius 12, paddingHorizontal 12, paddingVertical 12, fontSize 16 },
  idGridWrap { marginTop 12 },
  tanzeemRow { flexDirection 'row', gap 10 },
  tanzeemBtn { flex 1, borderRadius 12, paddingVertical 14, alignItems 'center' },
  tanzeemBtnTablet { minHeight 72, justifyContent 'center' },
  statsHeaderCard { borderRadius 16, borderWidth 1, paddingVertical 14, paddingHorizontal 16, shadowColor '#000', shadowOpacity 0.08, shadowRadius 12, shadowOffset { width 0, height 6 }, elevation 2 },
  statsHeaderTitle { fontSize 28, fontWeight '800', letterSpacing 0.2, textAlign 'center' },
  statsHeaderDate { marginTop 2, fontSize 16, fontWeight '600', textTransform 'capitalize', textAlign 'center' },
  statsHeaderSubline { marginTop 3, fontSize 12, fontWeight '600', textAlign 'center' },
  statsHeaderLocationChip { alignSelf 'center', borderRadius 10, paddingVertical 5, paddingHorizontal 10, marginTop 6 },
  statsHeaderLocationChipText { fontSize 15, fontWeight '700' },
  statsHeaderDivider { marginTop 10, height 1, width '100%' },
  statsExportBtn { marginTop 12, borderWidth 1, borderRadius 12, paddingVertical 10, alignItems 'center' },
  statsExportBtnText { fontSize 13, fontWeight '700' },
  statsExportModalCard { borderWidth 1, borderRadius 16, paddingVertical 16, paddingHorizontal 14, gap 12, width '100%', maxWidth 460, alignSelf 'center' },
  statsExportModalTitle { fontSize 20, fontWeight '800', textAlign 'center' },
  statsExportModalActions { gap 8 },
  statsExportOptionBtn { borderWidth 1, borderRadius 12, paddingVertical 12, paddingHorizontal 12, alignItems 'center' },
  statsExportOptionBtnText { fontSize 14, fontWeight '700' },
  statsExportCloseBtn { marginTop 2, borderWidth 1, borderRadius 12, paddingVertical 10, alignItems 'center' },
  statsExportCloseBtnText { fontSize 13, fontWeight '700' },
  statsToggleRow { flexDirection 'row', gap 8, marginTop 10 },
  statsToggleBtn { flex 1, borderWidth 1, borderRadius 12, paddingVertical 9, alignItems 'center' },
  statsToggleBtnText { fontSize 12, fontWeight '700' },
  statsCycler { flex 1, borderWidth 1, borderRadius 12, minHeight 42, flexDirection 'row', alignItems 'center', justifyContent 'space-between', paddingHorizontal 8 },
  statsCyclerArrowBtn { paddingHorizontal 8, paddingVertical 6 },
  statsCyclerArrow { fontSize 14, fontWeight '800' },
  statsCyclerValue { fontSize 14, fontWeight '700' },
  statsCalendarBtn { marginTop 8, borderWidth 1, borderRadius 10, paddingVertical 8, paddingHorizontal 10, alignItems 'center' },
  statsCalendarBtnText { fontSize 12, fontWeight '700' },
  chartWrap { marginTop 12 },
  chartCanvas { width '100%', borderWidth 1, borderRadius 12, position 'relative', overflow 'hidden' },
  chartAxisTitleY { marginBottom 6, marginLeft 6, fontSize 11, fontWeight '800' },
  chartAxisY { position 'absolute', width 2 },
  chartAxisX { position 'absolute', height 2 },
  chartGridLine { position 'absolute', borderTopWidth 1 },
  chartYTickLabel { position 'absolute', left 4, width 26, textAlign 'right', fontSize 10, fontWeight '600' },
  chartSegment { position 'absolute', borderRadius 999 },
  chartPointTouchTarget { position 'absolute', width 28, height 28, alignItems 'center', justifyContent 'center' },
  chartPoint { borderWidth 2, borderRadius 999 },
  chartTooltip { position 'absolute', maxWidth 170, borderWidth 1, borderRadius 8, paddingHorizontal 8, paddingVertical 5 },
  chartTooltipText { fontSize 11, fontWeight '700' },
  chartLabelsRow { marginTop 8, position 'relative' },
  chartEqualLabel { position 'absolute', width 56 },
  chartAxisTitleX { marginTop 6, textAlign 'center', fontSize 11, fontWeight '800' },
  chartLabel { textAlign 'center', fontSize 11, fontWeight '600' },
  chartLabelCompact { fontSize 9, textAlign 'center' },
  chartLegendRow { marginTop 10, flexDirection 'row', flexWrap 'wrap', gap 10 },
  chartLegendItem { flexDirection 'row', alignItems 'center', gap 6 },
  chartLegendDot { width 10, height 10, borderRadius 999 },
  chartLegendText { fontSize 12, fontWeight '600' },
  statsInsightWrap { marginTop 12, gap 4 },
  statsInsightText { fontSize 13, fontWeight '600', lineHeight 18 },
  statsCard { borderRadius 16, borderWidth 1, padding 14, shadowColor '#000', shadowOpacity 0.06, shadowRadius 10, shadowOffset { width 0, height 4 }, elevation 1 },
  statsCardHeaderRow { flexDirection 'row', justifyContent 'space-between', alignItems 'center', gap 8 },
  statsCardMiniSwitch { borderWidth 1, borderRadius 999, paddingHorizontal 10, paddingVertical 4 },
  statsCardMiniSwitchMobile { maxWidth '50%', paddingHorizontal 8 },
  statsCardMiniSwitchText { fontSize 11, fontWeight '700' },
  statsCardMiniSwitchTextMobile { fontSize 10 },
  statsCardTitle { fontSize 13, fontWeight '700' },
  statsCardRangeInfo { marginTop 2, fontSize 11, fontWeight '600' },
  statsBigValue { fontSize 40, fontWeight '800', marginTop 4 },
  tanzeemStatsRow { flexDirection 'row', gap 8, marginTop 8 },
  tanzeemStatBox { flex 1, borderWidth 1, borderRadius 12, paddingVertical 12, alignItems 'center' },
  tanzeemStatValue { fontSize 26, fontWeight '800', lineHeight 30 },
  tanzeemStatLabel { marginTop 2, fontSize 12, fontWeight '600' },
  majlisBarRow { marginTop 10, flexDirection 'row', alignItems 'center', gap 8 },
  majlisBarLabel { width 120, fontSize 12, fontWeight '600' },
  majlisBarTrack { flex 1, height 10, borderRadius 999, overflow 'hidden' },
  majlisBarFill { height '100%', borderRadius 999 },
  majlisBarValue { width 40, textAlign 'right', fontSize 11, fontWeight '700' },
  barRow { marginTop 10, flexDirection 'row', alignItems 'center', gap 8 },
  barLabel { width 120, fontSize 12, fontWeight '600' },
  barTrack { flex 1, height 10, borderRadius 999, overflow 'hidden' },
  barFill { height '100%', borderRadius 999 },
  barValue { width 24, textAlign 'right', fontSize 12, fontWeight '700' },
  statsRankingRow { marginTop 10, flexDirection 'row', alignItems 'center', justifyContent 'space-between', gap 8 },
  statsRankingLabel { flex 1, fontSize 13, fontWeight '600' },
  statsRankingValue { minWidth 30, textAlign 'right', fontSize 14, fontWeight '800' },
  statsRankingBarLabel { width 230, fontSize 12, fontWeight '600' },
  statsDetailOpenBtn { marginTop 10, borderWidth 1, borderRadius 10, paddingVertical 10, alignItems 'center' },
  statsDetailOpenBtnText { fontSize 13, fontWeight '700' },
  detailedIdModalBody { paddingHorizontal 14, paddingBottom 18, gap 8 },
  detailedIdModalBodyCompact { justifyContent 'flex-start', paddingTop 6, paddingBottom 8 },
  detailedInlineCalendarOverlay { ...StyleSheet.absoluteFillObject, backgroundColor 'rgba(0,0,0,0.35)', justifyContent 'center', padding 12, zIndex 5 },
  detailedInlineCalendarCard { borderWidth 1, borderRadius 16, maxHeight '82%', overflow 'hidden' },
  detailedGuideCard { borderWidth 1, borderRadius 12, paddingVertical 12, paddingHorizontal 10, alignItems 'center', justifyContent 'center' },
  detailedGuideTitle { fontSize 15, fontWeight '800' },
  detailedGuideText { fontSize 13, marginTop 4, textAlign 'center' },
  detailedGuideHint { textAlign 'center', fontSize 13, fontWeight '700', marginTop 10 },
  detailedIdSectionWrap { marginTop 6, gap 6 },
  detailedIdChipsWrap { flexDirection 'row', flexWrap 'wrap', gap 8 },
  detailedIdChip { borderWidth 1, borderRadius 10, paddingVertical 6, paddingHorizontal 8 },
  detailedIdListWrap { marginTop 8, gap 6 },
  detailedIdRow { borderWidth 1, borderRadius 10, paddingVertical 8, paddingHorizontal 10 },
  gridWrap { flexDirection 'row', flexWrap 'wrap', gap 10 },
  gridItem { width '48%', borderWidth 1, borderRadius 12, paddingVertical 18, paddingHorizontal 8 },
  gridItemTablet { width '31.8%', paddingVertical 24 },
  gridItemCounted { opacity 0.9 },
  gridText { textAlign 'center', fontWeight '700' },
  gridTextTablet { fontSize 18 },
  gridSubText { textAlign 'center', marginTop 4, fontSize 11, fontWeight '500' },
});
