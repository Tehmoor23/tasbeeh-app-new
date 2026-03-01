import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  View,
  Vibration,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

const STORAGE_KEYS = {
  darkMode: '@tasbeeh_darkmode',
  programConfigsByDate: '@tasbeeh_program_configs_by_date',
};

const CITY = 'Bait-Us-Sabuh';
const APP_LOGO_LIGHT = require('./assets/Icon3.png');
const APP_LOGO_DARK = require('./assets/Icon5.png');
const FORCE_TIME = null;
// const FORCE_TIME = '05:31'; // development override for testing
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
  'Riedberg',
  'Rödelheim',
  'Zeilsheim',
];
const TANZEEM_OPTIONS = ['ansar', 'khuddam', 'atfal'];
const TANZEEM_LABELS = {
  ansar: 'Ansar',
  khuddam: 'Khuddam',
  atfal: 'Atfal',
};
const MEMBER_DIRECTORY_COLLECTION = 'attendance_member_entries';
const MEMBER_DIRECTORY_DATA = [ {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"10007","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"10898","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"11431","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"12722","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"12770","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"18380","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"19604","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"21096","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"21323","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"21325","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"32258","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"32547","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33203","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33243","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33413","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33429","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33442","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33454","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33459","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33470","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33492","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33496","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33517","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33521","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33542","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33550","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33563","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33567","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"33591","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"35031","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"35473","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"37326","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"39580","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"42515","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"42557","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"49472","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"52117","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"53470","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"61100","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"61101","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"66696","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Nord","idNumber":"75720","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"10010","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"11435","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"11434","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"12775","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"12772","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"12773","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"13650","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"15125","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"39362","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"40812","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"21328","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"27050","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"27096","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"31634","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33209","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33245","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"35438","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"37155","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33444","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33458","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33494","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33499","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33519","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33518","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33526","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33524","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"39369","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33552","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33566","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33569","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"35432","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33593","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"33605","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"40813","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"35930","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"39582","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"39583","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"40267","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"40268","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"40438","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"42442","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"49715","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"46297","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"50083","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"51306","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"53176","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"53345","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"62890","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"59868","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"61104","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"61103","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"61759","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Nord","idNumber":"75096","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"53054","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"56041","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"63316","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"45496","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"50372","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"58749","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"59332","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"59880","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"59440","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"62891","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Nord","idNumber":"62892","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"26915","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"32118","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"32127","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"32151","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"32456","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33036","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33136","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33329","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33416","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33418","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33421","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33424","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33436","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33439","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33507","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33534","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33538","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33544","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33574","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"33586","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"34321","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"34342","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"34479","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"34487","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"35005","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"35086","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"35173","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"37095","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"37888","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"41819","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"53379","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"54926","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Baitus Sabuh Süd","idNumber":"59916","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"16303","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"39538","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"39539","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"32154","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"32155","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"32458","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"37140","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"32954","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33039","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33138","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33331","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33419","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33425","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"35433","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33482","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33511","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33523","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33537","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33536","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33549","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33561","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"33562","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"41549","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"34323","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"34340","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"34341","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"34484","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"35145","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"35146","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"49809","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"39824","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"36856","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"37097","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"37892","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"37890","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"40407","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"40408","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"40406","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"41214","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"44173","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Baitus Sabuh Süd","idNumber":"45577","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"52274","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"42742","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"47849","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"49815","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"59227","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"61530","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"57971","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"42959","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"47989","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Baitus Sabuh Süd","idNumber":"73009","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"10881","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"13811","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"16348","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"19372","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"21394","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"25867","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"26843","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33167","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33185","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33188","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33193","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33230","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33241","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33272","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33281","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33289","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33292","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33301","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33303","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33309","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33318","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33321","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33325","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33323","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"33332","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"37087","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"37393","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"37904","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"39247","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"40372","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"40434","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"40841","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"41603","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"41750","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"42225","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"43702","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"44573","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"44609","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"47617","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"49791","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"50013","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"51460","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"62054","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"62807","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bornheim","idNumber":"63924","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"13814","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"13815","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"13816","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"16352","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"16353","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"16350","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"17269","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"19124","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"65202","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"25869","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"25871","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"30774","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33175","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33183","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33184","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33195","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33271","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33283","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33284","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"40127","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33308","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33312","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"39106","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"33320","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"36419","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"38367","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"40435","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"51670","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"45463","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"45564","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"46064","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"47878","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"47901","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"63385","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"51160","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"51157","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"51159","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"66527","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bornheim","idNumber":"74265","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"57711","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"65204","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"51349","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"54643","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"42260","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"58848","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"58849","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"49648","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"55834","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"55836","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"42698","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"59817","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"41313","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"67153","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"45889","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"61545","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"51673","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"58608","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"59342","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"47621","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"70879","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bornheim","idNumber":"70880","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"15099","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"16289","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"16701","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"22534","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"27321","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"32086","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"32285","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"32287","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"32813","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33016","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33085","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33213","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33252","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33255","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33345","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33350","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33355","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33358","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33366","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33371","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33376","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33388","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33393","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33474","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"33777","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"35008","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"35027","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"35039","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"35050","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"35558","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"35977","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"36023","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"36169","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"38458","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"39775","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Eschersheim","idNumber":"56168","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"15102","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"15101","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"20400","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"26899","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"32089","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"32289","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"32887","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"47785","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"47786","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33087","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33217","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33215","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33257","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33258","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33344","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33341","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33342","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33347","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33348","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33349","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33353","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33369","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33368","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33375","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33379","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33390","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33391","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33397","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33395","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33476","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33477","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"42634","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33491","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33781","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33783","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"33784","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"35010","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"36589","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"35041","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"35055","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"49986","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"49987","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"41896","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"45274","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"55175","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"59136","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"57080","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"70397","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Eschersheim","idNumber":"75204","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"56194","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"72105","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"41734","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"47793","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"42635","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"61720","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"66414","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Eschersheim","idNumber":"56797","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"11491","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"16114","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"16290","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32257","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32334","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32357","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32359","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32401","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32411","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32437","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32481","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32487","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32489","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32499","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32510","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32530","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32549","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32554","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32558","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32563","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32580","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32581","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32743","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32753","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32765","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32784","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32818","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32840","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"32935","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"33510","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"36665","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"37522","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"37887","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"40590","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"42144","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"44895","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"45589","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"46610","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"48066","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"48850","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"50576","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Griesheim","idNumber":"70226","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"11493","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"11494","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"11495","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"11496","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"40236","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"16472","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"19401","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"20402","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"20534","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32413","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32415","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32442","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32485","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32486","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32491","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32513","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32553","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32556","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32561","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32578","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32582","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32627","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32756","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32766","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32768","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32767","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"34549","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32844","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32937","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"33352","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"40013","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"38041","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"38277","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"38278","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"39787","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32423","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"32422","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"42160","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"44097","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"53248","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"53249","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"45931","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"46593","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"50869","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"55107","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"55625","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"56257","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"57404","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"58273","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"59474","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"61117","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"66636","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"70351","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"75876","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Griesheim","idNumber":"76464","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"61195","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"64169","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"51683","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"67171","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"69442","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"59642","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"61794","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"49800","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"51900","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"59644","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"47363","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"64054","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"59064","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"51555","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"68023","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"59643","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"52376","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"74461","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Griesheim","idNumber":"74462","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"26614","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32156","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32158","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32173","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32182","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32194","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32214","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32215","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32225","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32234","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32236","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32241","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32247","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32256","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32260","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32265","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32268","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"32514","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"33278","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"33365","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"33867","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"42191","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"43145","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"43737","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"48500","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"55042","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Berg","idNumber":"60538","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"10572","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"12570","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"27042","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32175","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32185","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32186","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32199","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32228","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"39738","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32246","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32251","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32264","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"39090","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"34643","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"32270","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"38205","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"35308","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"33382","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"33737","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"37906","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"41622","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"55056","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"52449","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"47015","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"60541","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Berg","idNumber":"72011","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"49518","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"63705","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"63706","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"47440","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"49869","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"50537","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"61971","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"55057","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Berg","idNumber":"60542","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"14690","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"27322","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32083","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32090","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32109","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32123","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32130","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32137","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32160","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32167","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32170","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32171","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32178","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32202","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32254","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32273","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32296","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32306","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32321","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32328","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32490","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32532","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32533","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32861","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"32900","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"33119","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"33147","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"35059","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"35069","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"38038","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"41274","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"43892","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"45386","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"56554","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"64546","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Ginnheim","idNumber":"64944","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"11935","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"14691","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"18447","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"37971","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"23486","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32085","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32124","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32125","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32126","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32140","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32141","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32142","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32162","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32207","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"52433","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32294","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32299","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32300","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"41382","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32323","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32324","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32398","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32864","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"38435","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"32972","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"33122","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"39418","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"33173","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"33239","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"33240","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"33871","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"33997","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"35061","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"35062","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"35071","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"38039","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"44894","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"44896","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"45355","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"47834","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"49973","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"55148","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"56061","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"56556","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"56557","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"58727","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"62181","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"63583","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"68318","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"69724","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"73642","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"74369","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Ginnheim","idNumber":"74999","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"44621","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"47808","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"60321","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"43543","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"67081","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"46448","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"67241","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"58120","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"64548","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Ginnheim","idNumber":"74370","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"24285","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"26845","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"27245","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32290","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32292","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32316","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32325","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32347","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32353","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"32980","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"33427","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"33802","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"34364","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"34369","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"35597","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"45354","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"45719","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"50017","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"52377","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Goldstein","idNumber":"57131","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"12625","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"24314","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"39002","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"32349","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"46639","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"46640","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"32496","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"38840","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"35434","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33441","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33806","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33805","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33816","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33817","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33818","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"34368","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"34366","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"34970","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"36635","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"33824","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"37453","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"42306","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"45229","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"49121","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"52975","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"66138","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"73015","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"74368","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"74885","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Goldstein","idNumber":"75723","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"72305","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"44929","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"55237","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"47968","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"60807","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"47969","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"47607","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"50560","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"55261","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"55234","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Goldstein","idNumber":"59747","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"32310","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"33127","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"33152","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"33154","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"33161","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"35209","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"44329","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Hausen","idNumber":"60875","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"26792","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"26794","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"26795","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"32313","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"32315","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"33164","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"35211","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"43815","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"44159","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"54481","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"55281","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"55300","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Hausen","idNumber":"55375","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Hausen","idNumber":"54496","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Hausen","idNumber":"63683","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Hausen","idNumber":"62448","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"20103","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"20406","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"23136","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"30858","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32362","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32459","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32465","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32493","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32504","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32583","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32594","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32596","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32597","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32612","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32618","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32621","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32632","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32635","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32742","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32929","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32949","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32964","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"32967","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"35368","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"35598","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"36197","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"37520","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"39675","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"43077","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"44198","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"47252","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"51187","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"52289","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Höchst","idNumber":"52856","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"20409","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"20412","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"23139","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"23141","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"23138","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"23140","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32365","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32366","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32462","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32469","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32495","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32497","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32587","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32586","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"40998","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32616","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32620","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"38805","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32623","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32636","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"38816","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32783","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"32942","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"33018","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"33163","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"33385","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"33386","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"36796","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"42184","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"43537","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"47308","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"52291","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"54074","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"54313","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"54552","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"56218","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"60371","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"68492","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Höchst","idNumber":"70346","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"42766","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"43919","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"51094","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"57880","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"57881","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"46094","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"62455","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"67430","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"48205","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"47155","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"62368","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"47326","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Höchst","idNumber":"58215","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"12658","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"12926","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"12945","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"20238","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"24943","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32732","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32734","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32750","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32775","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32848","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32913","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"32922","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"37868","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"38875","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"40884","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"44416","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nied","idNumber":"64358","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"20241","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"20242","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"37260","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"37261","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32786","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32828","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32851","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"37351","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32910","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32915","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32916","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"34550","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32927","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"32941","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"39935","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"42857","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"44346","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"48349","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nied","idNumber":"58089","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nied","idNumber":"63757","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nied","idNumber":"46573","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nied","idNumber":"42745","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nied","idNumber":"53750","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nied","idNumber":"61827","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nied","idNumber":"54315","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"27112","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32103","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32135","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32143","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32237","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32524","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32966","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"32987","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33006","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33012","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33026","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33040","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33042","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33053","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33062","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33071","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33077","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33111","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33115","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33125","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33132","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33139","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33144","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33156","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33438","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33528","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33530","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"33950","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35045","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35063","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35065","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35080","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35083","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35220","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35352","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"35490","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"36167","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"36170","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"36811","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"36951","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"37000","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"38993","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"39333","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"39542","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"39579","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"40879","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"41795","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"43790","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"46091","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"46393","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"52875","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nordweststadt","idNumber":"69529","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"25815","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32105","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32136","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32159","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32277","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32283","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32288","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32534","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"32885","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33029","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33044","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33056","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33067","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33075","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33079","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"38374","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33083","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33099","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33113","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"42738","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33118","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33117","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33134","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33142","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33146","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"42776","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33159","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33158","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33160","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33208","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33232","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33298","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"39416","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"41223","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33823","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33953","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"33952","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"35049","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"45235","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"35068","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"41314","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"35085","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"39537","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"48671","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"44969","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"37676","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"49519","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"46236","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"51430","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"52876","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"53636","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"57798","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"16297","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"68552","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"69532","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nordweststadt","idNumber":"72783","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"65516","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"59553","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"62853","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"45303","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"59334","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"51530","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"52262","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"47965","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"61897","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"52155","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"60045","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"66669","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"64919","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"48179","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"c","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"46096","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"44970","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"49520","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"62925","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"72292","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"52877","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nordweststadt","idNumber":"63319","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"12637","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"19246","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"19767","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"20179","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"22934","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"24717","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"24719","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"26986","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"31511","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"32877","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33264","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33945","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33954","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33958","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33976","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33982","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33988","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33993","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"33999","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"34004","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"34015","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"34019","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"34024","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"34200","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"35958","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"36277","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"36280","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"36281","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"36500","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"36893","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"37079","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"42368","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"43419","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"45331","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"47692","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"47702","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"53305","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"67543","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Nuur Moschee","idNumber":"70573","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"15852","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"24707","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"24720","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"32855","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"32879","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"32880","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"32882","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33266","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33949","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33948","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33957","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33961","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33962","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33960","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33970","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33975","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33973","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33980","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33979","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33981","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33986","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33984","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"33990","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34002","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34003","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34017","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34021","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34022","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34029","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34028","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34203","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34204","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"34205","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"35078","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"35079","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"45718","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"47694","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"49328","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"54232","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"59499","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"68889","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"70576","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Nuur Moschee","idNumber":"70575","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"49989","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"69832","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"69833","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"50407","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Nuur Moschee","idNumber":"45626","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"11061","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"12568","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"20531","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"22993","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"23519","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"25241","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"26790","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"27275","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"27493","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"27882","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32161","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32416","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32451","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32865","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32875","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32896","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32969","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32978","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"32979","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"33024","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"33031","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"33051","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"34922","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"35560","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"35583","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"35812","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"35911","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"36299","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"36679","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"36990","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"38883","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"42302","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"44567","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"48838","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"50215","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"52520","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"53227","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Rödelheim","idNumber":"55982","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"12571","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"40100","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"20970","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"21166","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"22429","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"41128","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"25245","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"27280","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"27495","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"36568","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32454","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"39112","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32526","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32738","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32868","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32869","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32886","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32899","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32957","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"34476","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32973","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"41131","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"32994","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"33025","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"35661","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"39469","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"36836","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"43027","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"43487","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"44248","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"49859","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"50217","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"50631","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"54306","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"56268","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Rödelheim","idNumber":"73317","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"47792","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"76267","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"65569","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"49826","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"51015","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"53731","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"61783","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"48825","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"56361","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"55853","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"41254","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"45637","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"58452","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"53230","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"56364","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Rödelheim","idNumber":"57397","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"19645","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"20070","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"21065","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"21239","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"23220","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"32424","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"32443","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"32525","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"32588","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"32740","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"34631","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"36457","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"45037","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Zeilsheim","idNumber":"53097","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"20073","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"20074","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"20840","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"21068","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"21067","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"30226","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"32356","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"40729","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"40429","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"39334","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"39653","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"42676","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"49745","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"46210","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"46995","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"47154","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"50434","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Zeilsheim","idNumber":"72004","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"52747","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"67374","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"67375","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"49746","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"53243","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Zeilsheim","idNumber":"53099","name":"XXX"}, {"tanzeem":"Ansar","majlis":"Bad Vilbel","idNumber":"11111","name":"XXX"}, {"tanzeem":"Khuddam","majlis":"Bad Vilbel","idNumber":"22222","name":"XXX"}, {"tanzeem":"Atfal","majlis":"Bad Vilbel","idNumber":"33333","name":"XXX"} ] .map((entry) => ({ tanzeem: String(entry.tanzeem || '').trim().toLowerCase(), majlis: String(entry.majlis || '').trim(), idNumber: String(entry.idNumber || '').trim(), name: String(entry.name || '').trim(), }));
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
  riedberg: 'Riedberg',
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
  fajr: '05:30',
  sohar: '13:30',
  asr: '16:00',
  maghrib: '18:45',
  ishaa: '20:00',
  jumma: '13:15',
};

const PRAYER_OVERRIDE_COLLECTION = 'prayer_time_overrides';
const PROGRAM_ATTENDANCE_COLLECTION = 'attendance_program_entries';
const PROGRAM_DAILY_COLLECTION = 'attendance_program_daily';
const PROGRAM_CONFIG_COLLECTION = 'program_configs';
const SHOW_MEMBER_NAMES_IN_ID_GRID = false;
const STORE_MEMBER_NAMES_IN_DB = false;
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
const isGermanNightDefault = () => { const h = getGermanHour(); return h >= 22 || h < 6; };
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


const docUrl = (collection, id) => `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/${collection}/${id}?key=${FIREBASE_CONFIG.apiKey}`;
const commitUrl = () => `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents:commit?key=${FIREBASE_CONFIG.apiKey}`;
const loadFirebaseRuntime = () => {
  try {
    const { getApp, getApps, initializeApp } = require('firebase/app');
    const { doc, getFirestore, onSnapshot } = require('firebase/firestore');
    const firebaseApp = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
    return { db: getFirestore(firebaseApp), doc, onSnapshot };
  } catch {
    return null;
  }
};

const firebaseRuntime = hasFirebaseConfig() ? loadFirebaseRuntime() : null;

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

async function setDocData(collection, id, data) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const body = { fields: toFirestoreValue(data).mapValue.fields };
  const res = await fetch(docUrl(collection, id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('Firestore write failed');
}

async function deleteDocData(collection, id) {
  if (!hasFirebaseConfig()) throw new Error('Firebase config fehlt');
  const res = await fetch(docUrl(collection, id), { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error('Firestore delete failed');
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
  if (/✓|gespeichert|gezählt|entfernt/.test(value)) return 'positive';
  if (/fehler|nicht|konnte|bereits|bitte|kein\s/.test(value)) return 'negative';
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
  const [terminalMode, setTerminalMode] = useState('tanzeem');
  const [selectedTanzeem, setSelectedTanzeem] = useState('');
  const [selectedMajlis, setSelectedMajlis] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [toast, setToast] = useState('');
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsAttendance, setStatsAttendance] = useState(null);
  const [prayerOverride, setPrayerOverride] = useState(normalizePrayerOverride(null));
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideSoharAsrTime, setOverrideSoharAsrTime] = useState('');
  const [overrideMaghribIshaaTime, setOverrideMaghribIshaaTime] = useState('');
  const [manualFajrTime, setManualFajrTime] = useState('');
  const [manualSoharTime, setManualSoharTime] = useState('');
  const [manualAsrTime, setManualAsrTime] = useState('');
  const [manualMaghribTime, setManualMaghribTime] = useState('');
  const [manualIshaaTime, setManualIshaaTime] = useState('');
  const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [attendanceMode, setAttendanceMode] = useState('prayer');
  const [statsMode, setStatsMode] = useState('prayer');
  const [programNameInput, setProgramNameInput] = useState('');
  const [programStartInput, setProgramStartInput] = useState('');
  const [programConfigByDate, setProgramConfigByDate] = useState({});
  const [programStats, setProgramStats] = useState(null);

  const themePulseAnim = useRef(new Animated.Value(1)).current;
  const terminalLastCountRef = useRef(0);
  const visitorCounterRef = useRef(0);
  const statsPayloadRef = useRef('');

  const theme = isDarkMode ? THEME.dark : THEME.light;
  const insets = useSafeAreaInsets();
  const logoSource = isDarkMode ? APP_LOGO_DARK : APP_LOGO_LIGHT;
  const now = useMemo(() => {
    const d = getBerlinNow();
    if (isValidTime(FORCE_TIME)) {
      d.setHours(Number(FORCE_TIME.slice(0, 2)), Number(FORCE_TIME.slice(3)), 0, 0);
    }
    return d;
  }, [refreshTick]);
  const todayISO = toISO(now);
  const programConfigToday = programConfigByDate[todayISO] || null;
  const programWindow = useMemo(() => {
    if (!programConfigToday || !isValidTime(programConfigToday.startTime) || !String(programConfigToday.name || '').trim()) {
      return { isConfigured: false, isActive: false, label: null, minutesUntilOpen: null };
    }

    const startMinutes = Number(programConfigToday.startTime.slice(0, 2)) * 60 + Number(programConfigToday.startTime.slice(3));
    const openMinutes = startMinutes - 30;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const isActive = nowMinutes >= openMinutes;

    return {
      isConfigured: true,
      isActive,
      label: String(programConfigToday.name || '').trim(),
      startTime: programConfigToday.startTime,
      opensAt: `${pad(Math.floor((((openMinutes % 1440) + 1440) % 1440) / 60))}:${pad((((openMinutes % 1440) + 1440) % 1440) % 60)}`,
      minutesUntilOpen: isActive ? 0 : Math.max(0, openMinutes - nowMinutes),
      minutesUntilStart: Math.max(0, startMinutes - nowMinutes),
    };
  }, [now, programConfigToday]);
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
  const tomorrowISO = useMemo(() => toISO(addDays(now, 1)), [now]);
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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 1800);
    return () => clearTimeout(t);
  }, [toast]);


  useEffect(() => {
    let cancelled = false;
    setOverrideLoading(true);

    const applyOverride = (data) => {
      const normalized = normalizePrayerOverride(data);
      if (cancelled) return;
      setPrayerOverride(normalized);
      setOverrideEnabled(normalized.enabled);
      setOverrideSoharAsrTime(normalized.soharAsrTime || '');
      setOverrideMaghribIshaaTime(normalized.maghribIshaaTime || '');
      setManualFajrTime(normalized.manualTimes.fajr || '');
      setManualSoharTime(normalized.manualTimes.sohar || '');
      setManualAsrTime(normalized.manualTimes.asr || '');
      setManualMaghribTime(normalized.manualTimes.maghrib || '');
      setManualIshaaTime(normalized.manualTimes.ishaa || '');
      setOverrideLoading(false);
    };

    if (!firebaseRuntime || !hasFirebaseConfig()) {
      getDocData(PRAYER_OVERRIDE_COLLECTION, todayISO)
        .then((data) => applyOverride(data))
        .catch(() => {
          if (!cancelled) {
            setOverrideLoading(false);
            setToast('Override konnte nicht geladen werden');
          }
        });
      return () => {
        cancelled = true;
      };
    }

    const overrideRef = firebaseRuntime.doc(firebaseRuntime.db, PRAYER_OVERRIDE_COLLECTION, todayISO);
    const unsubscribe = firebaseRuntime.onSnapshot(
      overrideRef,
      (snapshot) => applyOverride(snapshot.exists() ? snapshot.data() : null),
      () => {
        if (!cancelled) {
          setOverrideLoading(false);
          setToast('Override konnte nicht geladen werden');
        }
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [todayISO]);

  const onOverrideEnabledChange = (value) => {
    setOverrideEnabled(value);
    if (!value) {
      setOverrideSoharAsrTime('');
      setOverrideMaghribIshaaTime('');
    }
  };

  const savePrayerOverride = async () => {
    const cleanSoharAsr = overrideSoharAsrTime.trim();
    const cleanMaghribIshaa = overrideMaghribIshaaTime.trim();

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
      await setDocData(PRAYER_OVERRIDE_COLLECTION, todayISO, payload);
      setPrayerOverride(normalizePrayerOverride(payload));
      setToast('Override gespeichert ✓');
      setRefreshTick((v) => v + 1);
    } catch {
      Alert.alert('Fehler', 'Override konnte nicht gespeichert werden.');
    } finally {
      setOverrideSaving(false);
    }
  };

  const saveManualPrayerTimes = async () => {
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

    const payload = {
      enabled: overrideEnabled,
      soharAsrTime: overrideSoharAsrTime.trim() || null,
      maghribIshaaTime: overrideMaghribIshaaTime.trim() || null,
      manualTimes: {
        fajr: manualEntries.fajr || null,
        sohar: manualEntries.sohar || null,
        asr: manualEntries.asr || null,
        maghrib: manualEntries.maghrib || null,
        ishaa: manualEntries.ishaa || null,
      },
      updatedAt: new Date().toISOString(),
    };

    try {
      setOverrideSaving(true);
      await setDocData(PRAYER_OVERRIDE_COLLECTION, todayISO, payload);
      setPrayerOverride(normalizePrayerOverride(payload));
      setToast('Gespeichert ✓');
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

    const hasActiveWindow = resolvePrayerWindow(now, timesToday, timesTomorrow).isActive;
    if (!hasActiveWindow) {
      const nextMinuteTs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 0, 0).getTime();
      if (nextMinuteTs > nowTs) candidates.push(nextMinuteTs);
    }
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
    const loadLocal = async () => {
      try {
        const darkRaw = await AsyncStorage.getItem(STORAGE_KEYS.darkMode);
        if (darkRaw === '1' || darkRaw === '0') setIsDarkMode(darkRaw === '1'); else setIsDarkMode(isGermanNightDefault());
      } catch (e) {
        console.warn('Failed to load local settings:', e);
      }
    };
    loadLocal();
  }, []);

  const onToggleDarkMode = async (value) => {
    Animated.sequence([
      Animated.timing(themePulseAnim, { toValue: 0.96, duration: 140, useNativeDriver: true }),
      Animated.spring(themePulseAnim, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 8 }),
    ]).start();
    setIsDarkMode(value);
    await AsyncStorage.setItem(STORAGE_KEYS.darkMode, value ? '1' : '0');
  };

  useEffect(() => {
    let cancelled = false;

    const applyProgramConfig = (data) => {
      if (cancelled) return;
      setProgramConfigByDate((prev) => {
        const next = { ...prev };
        if (data && typeof data === 'object') {
          next[todayISO] = {
            name: String(data.name || '').trim(),
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

    const programRef = firebaseRuntime.doc(firebaseRuntime.db, PROGRAM_CONFIG_COLLECTION, todayISO);
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
  }, [todayISO]);

  useEffect(() => {
    const todayConfig = programConfigByDate[todayISO] || null;
    setProgramNameInput(todayConfig?.name || '');
    setProgramStartInput(todayConfig?.startTime || '');
  }, [programConfigByDate, todayISO]);

  const saveProgramForToday = async () => {
    const name = String(programNameInput || '').trim();
    const startTime = String(programStartInput || '').trim();
    if (!name || !isValidTime(startTime)) {
      setToast('Bitte Programmname und gültige Startzeit eingeben');
      return;
    }
    const next = {
      ...programConfigByDate,
      [todayISO]: {
        name,
        startTime,
        updatedAt: new Date().toISOString(),
      },
    };
    setProgramConfigByDate(next);
    await setDocData(PROGRAM_CONFIG_COLLECTION, todayISO, {
      name,
      startTime,
      updatedAt: new Date().toISOString(),
    });
    setToast('Programm für heute gespeichert');
  };

  const clearProgramForToday = async () => {
    const next = { ...programConfigByDate };
    delete next[todayISO];
    setProgramConfigByDate(next);
    await deleteDocData(PROGRAM_CONFIG_COLLECTION, todayISO);
    setToast('Programm für heute entfernt');
  };

  const prayerWindow = useMemo(() => resolvePrayerWindow(now, timesToday, timesTomorrow), [now, timesToday, timesTomorrow]);
  const membersDirectory = MEMBER_DIRECTORY_DATA;
  const membersLoading = false;

  const majlisChoices = useMemo(() => {
    const available = new Set(
      membersDirectory
        .filter((entry) => entry.tanzeem === selectedTanzeem)
        .map((entry) => entry.majlis),
    );
    return TERMINAL_LOCATIONS.filter((majlisName) => available.has(majlisName));
  }, [membersDirectory, selectedTanzeem]);

  const memberChoices = useMemo(() => (
    membersDirectory
      .filter((entry) => entry.tanzeem === selectedTanzeem && entry.majlis === selectedMajlis)
      .sort((a, b) => {
        const aNum = Number.parseInt(String(a.idNumber), 10);
        const bNum = Number.parseInt(String(b.idNumber), 10);
        if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
        return String(a.idNumber).localeCompare(String(b.idNumber));
      })
  ), [membersDirectory, selectedMajlis, selectedTanzeem]);

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

    const attendanceRef = firebaseRuntime.doc(firebaseRuntime.db, 'attendance_daily', todayISO);
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
  }, [activeTab, todayISO]);

  useEffect(() => {
    if (activeTab !== 'stats' || statsMode !== 'program') return undefined;
    const programName = String(programConfigToday?.name || '').trim();
    if (!programName) {
      setProgramStats(null);
      return undefined;
    }

    let cancelled = false;
    const programKey = toLocationKey(programName);
    const docId = `${todayISO}_${programKey}`;

    const fetchProgramStats = () => {
      getDocData(PROGRAM_DAILY_COLLECTION, docId)
        .then((data) => {
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
  }, [activeTab, statsMode, todayISO, programConfigToday]);

  const statsPrayerKey = prayerWindow.isActive ? prayerWindow.prayerKey : nextPrayer;

  const statsView = useMemo(() => {
    if (!statsAttendance?.byPrayer || !statsPrayerKey) return null;

    const prayerData = statsAttendance.byPrayer[statsPrayerKey] || {};
    const tanzeemData = prayerData.tanzeem || {};
    const tanzeemKeys = ['ansar', 'khuddam', 'atfal'];
    const mergedCarry = statsAttendance.mergedCarry || {};
    const mergedCarrySoharAsr = Number(mergedCarry.soharAsr) || 0;
    const mergedCarryMaghribIshaa = Number(mergedCarry.maghribIshaa) || 0;

    const tanzeemTotals = tanzeemKeys.reduce((acc, tanzeem) => {
      const majlisMap = tanzeemData[tanzeem]?.majlis || {};
      acc[tanzeem] = Object.values(majlisMap).reduce((sum, val) => sum + (Number(val) || 0), 0);
      return acc;
    }, {});

    const getMajlisMapForPrayer = (prayerKey) => {
      const prayer = statsAttendance.byPrayer?.[prayerKey] || {};
      const prayerTanzeem = prayer?.tanzeem || {};
      const out = {};
      tanzeemKeys.forEach((tanzeem) => {
        const majlisMap = prayerTanzeem[tanzeem]?.majlis || {};
        Object.entries(majlisMap).forEach(([locationKey, value]) => {
          out[locationKey] = (out[locationKey] || 0) + (Number(value) || 0);
        });
      });
      return out;
    };

    const addMajlisMap = (target, source, multiplier = 1) => {
      Object.entries(source || {}).forEach(([locationKey, value]) => {
        target[locationKey] = (target[locationKey] || 0) + ((Number(value) || 0) * multiplier);
      });
    };

    const topMajlisMap = {};
    const fajrMajlis = getMajlisMapForPrayer('fajr');
    addMajlisMap(topMajlisMap, fajrMajlis, 1);

    const soharMajlis = getMajlisMapForPrayer('sohar');
    const asrMajlis = getMajlisMapForPrayer('asr');
    if (soharAsrMergedToday || hasSoharAsrOverrideToday) {
      const mergedMap = {};
      addMajlisMap(mergedMap, soharMajlis, 1);
      addMajlisMap(mergedMap, asrMajlis, 1);
      addMajlisMap(topMajlisMap, mergedMap, 1);
    } else {
      addMajlisMap(topMajlisMap, soharMajlis, 1);
      addMajlisMap(topMajlisMap, asrMajlis, 1);
    }

    const maghribMajlis = getMajlisMapForPrayer('maghrib');
    const ishaaMajlis = getMajlisMapForPrayer('ishaa');
    if (maghribIshaaMergedToday || hasMaghribIshaaOverrideToday) {
      const mergedMap = {};
      addMajlisMap(mergedMap, maghribMajlis, 1);
      addMajlisMap(mergedMap, ishaaMajlis, 1);
      addMajlisMap(topMajlisMap, mergedMap, 1);
    } else {
      addMajlisMap(topMajlisMap, maghribMajlis, 1);
      addMajlisMap(topMajlisMap, ishaaMajlis, 1);
    }

    const topMajlis = Object.entries(topMajlisMap)
      .filter(([, count]) => count > 0)
      .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
      .slice(0, 8);

    const tanzeemTotalsToday = { ansar: 0, khuddam: 0, atfal: 0 };
    Object.values(statsAttendance.byPrayer || {}).forEach((prayer) => {
      const prayerTanzeem = prayer?.tanzeem || {};
      ['ansar', 'khuddam', 'atfal'].forEach((tanzeem) => {
        const majlisMap = prayerTanzeem[tanzeem]?.majlis || {};
        tanzeemTotalsToday[tanzeem] += Object.values(majlisMap).reduce((sum, val) => sum + (Number(val) || 0), 0);
      });
    });

    const guestTotalToday = Object.values(statsAttendance.byPrayer || {}).reduce((sum, prayer) => sum + (Number(prayer?.guest) || 0), 0);
    const totalAttendance = Object.values(tanzeemTotalsToday).reduce((sum, value) => sum + value, 0) + guestTotalToday;

    return {
      guestTotal: guestTotalToday,
      tanzeemTotals,
      tanzeemTotalsToday,
      topMajlis,
      totalAttendance,
      mergedCarrySoharAsr,
      mergedCarryMaghribIshaa,
    };
  }, [statsAttendance, statsPrayerKey, soharAsrMergedToday, maghribIshaaMergedToday, hasSoharAsrOverrideToday, hasMaghribIshaaOverrideToday]);

  const formatMajlisName = (locationKey) => {
    if (MAJLIS_LABELS[locationKey]) return MAJLIS_LABELS[locationKey];
    return String(locationKey || '')
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const countAttendance = async (modeType, kind, locationName, selectedMember = null) => {
    const nowTs = Date.now();
    if (nowTs - terminalLastCountRef.current < 2000) return;
    terminalLastCountRef.current = nowTs;

    if (!hasFirebaseConfig()) {
      Alert.alert('Datenbankfehler', 'Bitte Firebase Konfiguration setzen.');
      return;
    }

    if (kind === 'member' && (!selectedMember || !selectedMember.idNumber)) {
      setToast('Bitte erst ID auswählen');
      return;
    }

    const runtimeNow = getBerlinNow();
    if (isValidTime(FORCE_TIME)) {
      runtimeNow.setHours(Number(FORCE_TIME.slice(0, 2)), Number(FORCE_TIME.slice(3)), 0, 0);
    }

    const runtimeISO = toISO(runtimeNow);
    const runtimeIsRamadanToday = runtimeISO <= RAMADAN_END_ISO;
    const runtimeSelectedISO = runtimeIsRamadanToday ? (RAMADAN_RAW[runtimeISO] ? runtimeISO : findClosestISO(runtimeISO, availableDates)) : null;
    const runtimeRaw = runtimeSelectedISO ? RAMADAN_RAW[runtimeSelectedISO] : null;
    const runtimeBaseTimesToday = buildPrayerTimes(runtimeRaw, runtimeIsRamadanToday);
    const runtimeOverride = runtimeISO === todayISO ? prayerOverride : null;
    const runtimeWithManual = applyManualPrayerAdjustments(runtimeBaseTimesToday, runtimeOverride);
    const runtimeTimesToday = applyPrayerTimeOverride(runtimeWithManual, runtimeOverride);
    const runtimeTomorrowISO = toISO(addDays(runtimeNow, 1));
    const runtimeIsRamadanTomorrow = runtimeTomorrowISO <= RAMADAN_END_ISO;
    const runtimeTomorrowRaw = runtimeIsRamadanTomorrow ? (RAMADAN_RAW[runtimeTomorrowISO] || null) : null;
    const runtimeTimesTomorrow = buildPrayerTimes(runtimeTomorrowRaw, runtimeIsRamadanTomorrow);
    const runtimePrayerWindow = resolvePrayerWindow(runtimeNow, runtimeTimesToday, runtimeTimesTomorrow);

    const runtimeProgramConfig = (programConfigByDate || {})[runtimeISO] || null;
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

    if (modeType === 'prayer' && (!runtimePrayerWindow.isActive || !runtimePrayerWindow.prayerKey)) {
      setToast('Derzeit kein aktives Gebetszeitfenster');
      setRefreshTick((v) => v + 1);
      return;
    }

    if (modeType === 'program' && !runtimeProgramWindow.isActive) {
      setToast('Aktuell kein Programm vorhanden');
      return;
    }

    const resolvedLocationName = String(locationName || selectedMajlis || 'Gast').trim();
    const locationKey = toLocationKey(resolvedLocationName || 'gast');
    const targetKeys = [];

    if (modeType === 'program') {
      targetKeys.push(toLocationKey(runtimeProgramWindow.label || 'programm'));
    } else {
      const prayer = runtimePrayerWindow.prayerKey;
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
          paths.push(`byTanzeem.${selectedTanzeem}`);
          paths.push(`byMajlis.${locationKey}`);
          paths.push('total');
        }
      } else if (kind === 'guest') {
        paths.push(`byPrayer.${targetKey}.guest`);
      } else {
        paths.push(`byPrayer.${targetKey}.tanzeem.${selectedTanzeem}.majlis.${locationKey}`);
      }
    });

    try {
      const programKey = modeType === 'program' ? targetKeys[0] : null;

      if (kind === 'member' && selectedMember?.idNumber) {
        const duplicateChecks = await Promise.all(targetKeys.map((targetKey) => {
          const memberEntryId = modeType === 'program'
            ? `${runtimeISO}_${programKey}_${selectedTanzeem}_${locationKey}_${String(selectedMember.idNumber)}`
            : `${runtimeISO}_${targetKey}_${selectedTanzeem}_${locationKey}_${String(selectedMember.idNumber)}`;
          return getDocData(modeType === 'program' ? PROGRAM_ATTENDANCE_COLLECTION : MEMBER_DIRECTORY_COLLECTION, memberEntryId);
        }));

        if (duplicateChecks.some(Boolean)) {
          setToast('Bereits gezählt');
          setTerminalMode('tanzeem');
          setSelectedTanzeem('');
          setSelectedMajlis('');
          return;
        }
      }

      if (modeType === 'program') {
        await incrementDocCounters(PROGRAM_DAILY_COLLECTION, `${runtimeISO}_${programKey}`, paths);
      } else {
        await incrementDocCounters('attendance_daily', runtimeISO, paths);
      }

      if (kind === 'member' && selectedMember?.idNumber) {
        await Promise.all(targetKeys.map((targetKey) => {
          const memberEntryId = modeType === 'program'
            ? `${runtimeISO}_${programKey}_${selectedTanzeem}_${locationKey}_${String(selectedMember.idNumber)}`
            : `${runtimeISO}_${targetKey}_${selectedTanzeem}_${locationKey}_${String(selectedMember.idNumber)}`;
          return setDocData(modeType === 'program' ? PROGRAM_ATTENDANCE_COLLECTION : MEMBER_DIRECTORY_COLLECTION, memberEntryId, {
            type: modeType,
            date: runtimeISO,
            ...(modeType === 'program' ? { programName: runtimeProgramWindow.label } : { prayer: targetKey }),
            majlis: resolvedLocationName,
            tanzeem: selectedTanzeem,
            idNumber: String(selectedMember.idNumber),
            ...(STORE_MEMBER_NAMES_IN_DB ? { name: selectedMember.name || null } : {}),
            timestamp: new Date().toISOString(),
          });
        }));

        if (modeType === 'prayer') {
          await appendMemberDetailsToDailyAttendance(
            runtimeISO,
            targetKeys,
            selectedTanzeem,
            resolvedLocationName,
            locationKey,
            selectedMember,
          );
        }
      }

      if (kind === 'guest') {
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
      setToast('Gezählt ✓');
      setTerminalMode('tanzeem');
      setSelectedTanzeem('');
      setSelectedMajlis('');
    } catch {
      Alert.alert('Datenbankfehler', 'Bitte Internet prüfen');
      setToast('Datenbankfehler – bitte Internet prüfen');
    }
  };


  const renderPrayer = () => {
    const displayDate = selectedDate || now;
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.dayCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.dayName, { color: theme.text }]}>{DAY_NAMES_DE[displayDate.getDay()]}</Text>
          <Text style={[styles.dayDate, { color: theme.muted }]}>{germanDateLong(displayDate)}</Text>
          <View style={[styles.cityBadge, { backgroundColor: theme.chipBg }]}><Text style={[styles.cityBadgeText, { color: theme.chipText }]}>{CITY}</Text></View>
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
        </View>
      </ScrollView>
    );
  };

  const renderTerminal = () => {
    const isPrayerMode = attendanceMode === 'prayer';
    const hasActiveAttendanceWindow = isPrayerMode ? prayerWindow.isActive : programWindow.isActive;
    const modeTitle = isPrayerMode ? 'Gebetsanwesenheit' : 'Programmanwesenheit';

    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        <View style={[styles.terminalBanner, { backgroundColor: isDarkMode ? '#111827' : '#FFFFFF', borderColor: isDarkMode ? '#374151' : '#111111', borderWidth: isDarkMode ? 1 : 3 }]}> 
          <Pressable style={withPressEffect(styles.modeSwitch)} onPress={() => { setAttendanceMode(isPrayerMode ? 'program' : 'prayer'); setTerminalMode('tanzeem'); setSelectedTanzeem(''); setSelectedMajlis(''); }}>
            <Text style={[styles.modeSwitchText, { color: isDarkMode ? '#FFFFFF' : '#111111' }]}>{isPrayerMode ? '<< Gebetsanwesenheit >>' : '<< Programmanwesenheit >>'}</Text>
          </Pressable>
          <Text style={[styles.terminalBannerTitle, { color: isDarkMode ? '#FFFFFF' : '#111111' }]}>{modeTitle}</Text>
          <Text style={[styles.terminalBannerArabic, { color: isDarkMode ? '#D1D5DB' : '#374151' }]}>عبادت حاضری</Text>
          <Text style={[styles.terminalBannerSubtitle, { color: isDarkMode ? '#D1D5DB' : '#4B5563' }]}>Local Amarat Frankfurt</Text>
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
          ) : (
            programWindow.isActive ? (
              <Text style={[styles.currentPrayerText, { color: theme.text }]}>Aktuelles Programm: {programWindow.label}</Text>
            ) : (
              <>
                <Text style={[styles.noPrayerTitle, isDarkMode ? styles.noPrayerTitleDark : styles.noPrayerTitleLight]}>Aktuell kein Programm vorhanden</Text>
                {programWindow.isConfigured ? (
                  <View style={[styles.programScheduledHint, { borderColor: theme.border, backgroundColor: isDarkMode ? '#1F2937' : '#FEF3C7' }]}>
                    <Text style={[styles.programScheduledLabel, { color: theme.text }]}>Programm geplant:</Text>
                    <Text style={[styles.programScheduledValue, { color: theme.text }]}>
                      {programWindow.label} beginnt in {Math.floor((programWindow.minutesUntilStart || 0) / 60)}h {String((programWindow.minutesUntilStart || 0) % 60).padStart(2, '0')}m
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginTop: 10 }]}>Für heute ist kein Programm geplant.</Text>
                )}
              </>
            )
          )}
        </View>

        {hasActiveAttendanceWindow ? terminalMode === 'tanzeem' ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text, textAlign: 'center' }]}>Bitte wählen Sie die Tanzeem</Text>
            <Text style={[styles.urduText, { color: theme.muted }]}>براہ کرم تنظیم منتخب کریں</Text>
            <View style={styles.tanzeemRow}>
              {TANZEEM_OPTIONS.map((tanzeem) => (
                <Pressable key={tanzeem} style={({ pressed }) => [[styles.tanzeemBtn, { backgroundColor: theme.button }], pressed && styles.buttonPressed]} onPress={() => { setSelectedTanzeem(tanzeem); setSelectedMajlis(''); setTerminalMode('majlis'); }}>
                  <Text style={[styles.presetBtnText, { color: theme.buttonText }]}>{TANZEEM_LABELS[tanzeem]}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => countAttendance(attendanceMode, 'guest')} style={withPressEffect(styles.guestLinkWrap)}>
              <Text style={[styles.guestLinkText, { color: theme.muted }]}>Kein Mitglied? Tragen Sie sich als Gast ein</Text>
            </Pressable>
          </>
        ) : terminalMode === 'majlis' ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text, textAlign: 'center' }]}>Bitte wählen Sie Ihre Majlis</Text>
            <Text style={[styles.urduText, { color: theme.muted }]}>براہ کرم اپنی مجلس منتخب کریں</Text>
            <Pressable style={({ pressed }) => [[styles.saveBtn, { backgroundColor: theme.button }], pressed && styles.buttonPressed]} onPress={() => { setTerminalMode('tanzeem'); setSelectedTanzeem(''); setSelectedMajlis(''); }}>
              <Text style={[styles.saveBtnText, { color: theme.buttonText }]}>Zurück</Text>
            </Pressable>
            {membersLoading ? <ActivityIndicator size="small" color={theme.text} /> : null}
            {!membersLoading && majlisChoices.length === 0 ? <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>Keine Majlis-Daten für diese Tanzeem gefunden.</Text> : null}
            <View style={styles.gridWrap}>
              {majlisChoices.map((loc) => (
                <Pressable key={loc} style={({ pressed }) => [[styles.gridItem, { backgroundColor: theme.card, borderColor: theme.border }], pressed && styles.buttonPressed]} onPress={() => { setSelectedMajlis(loc); setTerminalMode('idSelection'); }}>
                  <Text style={[styles.gridText, { color: theme.text }]}>{loc}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text, textAlign: 'center' }]}>Bitte wählen Sie Ihre ID-Nummer</Text>
            <Text style={[styles.urduText, { color: theme.muted }]}>براہ کرم اپنی آئی ڈی منتخب کریں</Text>
            <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center', marginBottom: 4 }]}>{selectedMajlis} · {TANZEEM_LABELS[selectedTanzeem] || ''}</Text>
            <Pressable style={({ pressed }) => [[styles.saveBtn, { backgroundColor: theme.button }], pressed && styles.buttonPressed]} onPress={() => setTerminalMode('majlis')}>
              <Text style={[styles.saveBtnText, { color: theme.buttonText }]}>Zurück</Text>
            </Pressable>
            {membersLoading ? <ActivityIndicator size="small" color={theme.text} /> : null}
            {!membersLoading && memberChoices.length === 0 ? <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>Keine ID-Nummern verfügbar.</Text> : null}
            <View style={styles.gridWrap}>
              {memberChoices.map((member) => (
                <Pressable key={`${member.tanzeem}_${member.majlis}_${member.idNumber}`} style={({ pressed }) => [[styles.gridItem, { backgroundColor: theme.card, borderColor: theme.border }], pressed && styles.buttonPressed]} onPress={() => countAttendance(attendanceMode, 'member', selectedMajlis, member)}>
                  <Text style={[styles.gridText, { color: theme.text }]}>{member.idNumber}</Text>
                  {SHOW_MEMBER_NAMES_IN_ID_GRID ? <Text style={[styles.gridSubText, { color: theme.muted }]} numberOfLines={1}>{member.name}</Text> : null}
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.noteText, { color: theme.muted, textAlign: 'center' }]}>{isPrayerMode ? 'Anwesenheit kann nur im aktiven Gebet erfasst werden (30 Minuten davor bzw. 60 Minuten danach).' : 'Programmanwesenheit kann nur bei aktivem Programm erfasst werden.'}</Text>
            <Text style={[styles.urduText, { color: theme.muted }]}>{isPrayerMode ? 'حاضری صرف فعال نماز کے وقت میں درج کی جا سکتی ہے (30 منٹ پہلے اور 60 منٹ بعد تک).' : 'پروگرام حاضری صرف فعال پروگرام کے دوران درج کی جا سکتی ہے۔'}</Text>
          </>
        )}

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
    const statsHeaderDate = germanWeekdayDateLong(now);
    const isProgramStatsMode = statsMode === 'program';
    const tanzeemProgramTotals = {
      ansar: Number(programStats?.byTanzeem?.ansar) || 0,
      khuddam: Number(programStats?.byTanzeem?.khuddam) || 0,
      atfal: Number(programStats?.byTanzeem?.atfal) || 0,
    };
    const programTotal = Number(programStats?.total) || 0;
    const programGuestTotal = Number(programStats?.guestTotal) || 0;
    const topProgramMajlis = Object.entries(programStats?.byMajlis || {})
      .filter(([, count]) => Number(count) > 0)
      .sort((a, b) => (Number(b[1]) - Number(a[1])) || a[0].localeCompare(b[0]))
      .slice(0, 8);

    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.statsHeaderCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <Pressable style={withPressEffect(styles.modeSwitch)} onPress={() => setStatsMode(isProgramStatsMode ? 'prayer' : 'program')}>
            <Text style={[styles.modeSwitchText, { color: theme.text }]}>{isProgramStatsMode ? '<< Programmstatistik >>' : '<< Gebetsstatistik >>'}</Text>
          </Pressable>
          <Text style={[styles.statsHeaderTitle, { color: theme.text }]}>Statistik</Text>
          <Text style={[styles.statsHeaderDate, { color: theme.muted }]}>{statsHeaderDate}</Text>
          <Text style={[styles.statsHeaderSubline, { color: theme.muted }]}>Local Amarat Frankfurt</Text>
          <View style={[styles.statsHeaderDivider, { backgroundColor: theme.border }]} />
        </View>

        {isProgramStatsMode ? (
          !programWindow.isConfigured ? (
            <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
              <Text style={[styles.noteText, { color: theme.muted }]}>Keine Programmdaten verfügbar</Text>
            </View>
          ) : (
            <>
              <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Programm heute</Text>
                <Text style={[styles.statsBigValue, { color: theme.text }]}>{programWindow.label}</Text>
              </View>

              <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Gesamt Programmanwesenheit heute</Text>
                <Text style={[styles.statsBigValue, { color: theme.text }]}>{programTotal}</Text>
              </View>

              <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Tanzeem Aufteilung (Programm)</Text>
                <View style={styles.tanzeemStatsRow}>
                  {['ansar','khuddam','atfal','guest'].map((key) => (
                    <View key={key} style={[styles.tanzeemStatBox, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                      <Text style={[styles.tanzeemStatValue, { color: theme.text }]}>{key === 'guest' ? programGuestTotal : tanzeemProgramTotals[key]}</Text>
                      <Text style={[styles.tanzeemStatLabel, { color: theme.muted }]}>{key === 'guest' ? 'Gäste' : TANZEEM_LABELS[key]}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Top Majlises (Programm)</Text>
                {topProgramMajlis.length === 0 ? (
                  <Text style={[styles.noteText, { color: theme.muted }]}>Keine Programmdaten verfügbar</Text>
                ) : (
                  (() => {
                    const maxTop = Math.max(1, ...topProgramMajlis.map(([, count]) => Number(count) || 0));
                    return topProgramMajlis.map(([locationKey, count]) => (
                      <View key={locationKey} style={styles.majlisBarRow}>
                        <Text style={[styles.majlisBarLabel, { color: theme.text }]} numberOfLines={1}>{formatMajlisName(locationKey)}</Text>
                        <View style={[styles.majlisBarTrack, { backgroundColor: theme.border }]}>
                          <View style={[styles.majlisBarFill, { backgroundColor: theme.button, width: `${((Number(count) || 0) / maxTop) * 100}%` }]} />
                        </View>
                        <Text style={[styles.majlisBarValue, { color: theme.text }]}>{Number(count) || 0}</Text>
                      </View>
                    ));
                  })()
                )}
              </View>
            </>
          )
        ) : (
          (!statsAttendance?.byPrayer || !statsView) ? (
            <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
              <Text style={[styles.noteText, { color: theme.muted }]}>Noch keine Anwesenheit für heute</Text>
            </View>
          ) : (
            <>
              <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Gesamt Anwesende heute</Text>
                <Text style={[styles.statsBigValue, { color: theme.text }]}>{statsView.totalAttendance}</Text>
              </View>

              <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Tanzeem Aufteilung (heute)</Text>
                <View style={styles.tanzeemStatsRow}>
                  {['ansar','khuddam','atfal'].map((key) => (
                    <View key={key} style={[styles.tanzeemStatBox, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                      <Text style={[styles.tanzeemStatValue, { color: theme.text }]}>{statsView.tanzeemTotalsToday[key]}</Text>
                      <Text style={[styles.tanzeemStatLabel, { color: theme.muted }]}>{TANZEEM_LABELS[key]}</Text>
                    </View>
                  ))}
                  <View style={[styles.tanzeemStatBox, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                    <Text style={[styles.tanzeemStatValue, { color: theme.text }]}>{statsView.guestTotal}</Text>
                    <Text style={[styles.tanzeemStatLabel, { color: theme.muted }]}>Gäste</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Top Majlises heute (alle Gebete)</Text>
                {statsView.topMajlis.length === 0 ? (
                  <Text style={[styles.noteText, { color: theme.muted }]}>Noch keine Anwesenheit für heute</Text>
                ) : (
                  (() => {
                    const maxTop = Math.max(1, ...statsView.topMajlis.map(([, count]) => count));
                    return statsView.topMajlis.map(([locationKey, count]) => (
                      <View key={locationKey} style={styles.majlisBarRow}>
                        <Text style={[styles.majlisBarLabel, { color: theme.text }]} numberOfLines={1}>{formatMajlisName(locationKey)}</Text>
                        <View style={[styles.majlisBarTrack, { backgroundColor: theme.border }]}>
                          <View style={[styles.majlisBarFill, { backgroundColor: theme.button, width: `${(count / maxTop) * 100}%` }]} />
                        </View>
                        <Text style={[styles.majlisBarValue, { color: theme.text }]}>{count}</Text>
                      </View>
                    ));
                  })()
                )}
              </View>

              <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                <Text style={[styles.statsCardTitle, { color: theme.muted }]}>Anzahl pro Gebet heute</Text>
                {(() => {
                  const getPrayerTotal = (prayerKey) => {
                    const prayer = statsAttendance.byPrayer?.[prayerKey] || {};
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

                  const totals = [
                    { key: 'fajr', label: 'Fajr (الفجر)', total: getPrayerTotal('fajr') },
                    ...(soharAsrMergedToday
                      ? [{ key: 'sohar_asr', label: 'Sohar/Asr (الظهر/العصر)', total: soharAsrCarryValue }]
                      : [
                        { key: 'sohar', label: 'Sohar (الظهر)', total: hasSoharAsrOverrideToday ? soharAsrCarryValue : soharTotalRaw },
                        { key: 'asr', label: 'Asr (العصر)', total: hasSoharAsrOverrideToday ? soharAsrCarryValue : asrTotalRaw },
                      ]),
                    ...(maghribIshaaMergedToday
                      ? [{ key: 'maghrib_ishaa', label: 'Maghrib/Ishaa (المغرب/العشاء)', total: maghribIshaaCarryValue }]
                      : [
                        { key: 'maghrib', label: 'Maghrib (المغرب)', total: hasMaghribIshaaOverrideToday ? maghribIshaaCarryValue : maghribTotalRaw },
                        { key: 'ishaa', label: 'Ishaa (العشاء)', total: hasMaghribIshaaOverrideToday ? maghribIshaaCarryValue : ishaaTotalRaw },
                      ]),
                  ];

                  const maxTotal = Math.max(1, ...totals.map((item) => item.total));
                  return totals.map(({ key, label, total }) => (
                    <View key={key} style={styles.barRow}>
                      <Text style={[styles.barLabel, { color: theme.text }]}>{label}</Text>
                      <View style={[styles.barTrack, { backgroundColor: theme.border }]}> 
                        <View style={[styles.barFill, { backgroundColor: theme.button, width: `${(total / maxTotal) * 100}%` }]} />
                      </View>
                      <Text style={[styles.barValue, { color: theme.text }]}>{total}</Text>
                    </View>
                  ));
                })()}
              </View>
            </>
          )
        )}
      </ScrollView>
    );
  };

  const renderSettings = () => {
    const settingsDate = germanDateLong(now);

    return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}> 
        <View style={styles.switchRow}><Text style={[styles.sectionTitle, { color: theme.text }]}>Dark Mode</Text><Switch value={isDarkMode} onValueChange={onToggleDarkMode} /></View>
      </View>

      <View style={[styles.settingsHeroCard, { backgroundColor: theme.card }]}> 
        <Text style={[styles.settingsHeroTitle, { color: theme.text }]}>Gebetszeiten zusammenlegen</Text>
        <Text style={[styles.settingsHeroMeta, { color: theme.muted }]}>{settingsDate} · Bait-Us-Sabuh</Text>

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
          <Text style={[styles.saveBtnText, { color: theme.buttonText }]}>{overrideSaving ? 'Speichert…' : 'Speichern'}</Text>
        </Pressable>
      </View>


      <View style={[styles.settingsHeroCard, { backgroundColor: theme.card }]}> 
        <Text style={[styles.settingsHeroTitle, { color: theme.text }]}>Gebetszeiten anpassen</Text>
        <Text style={[styles.settingsHeroMeta, { color: theme.muted }]}>{settingsDate} · Bait-Us-Sabuh</Text>

        <View style={styles.mergeInputWrap}>
          <TextInput value={manualFajrTime} onChangeText={setManualFajrTime} placeholder="Fajr (HH:MM)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={manualSoharTime} onChangeText={setManualSoharTime} placeholder="Sohar (HH:MM)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={manualAsrTime} onChangeText={setManualAsrTime} placeholder="Asr (HH:MM)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={manualMaghribTime} onChangeText={setManualMaghribTime} placeholder="Maghrib (HH:MM)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={manualIshaaTime} onChangeText={setManualIshaaTime} placeholder="Ishaa (HH:MM)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
        </View>

        <Pressable style={({ pressed }) => [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor: theme.button, opacity: overrideSaving ? 0.6 : 1 }], pressed && styles.buttonPressed]} disabled={overrideSaving} onPress={saveManualPrayerTimes}>
          <Text style={[styles.saveBtnText, { color: theme.buttonText }]}>{overrideSaving ? 'Speichert…' : 'Speichern'}</Text>
        </Pressable>
      </View>

      <View style={[styles.settingsHeroCard, { backgroundColor: theme.card }]}> 
        <Text style={[styles.settingsHeroTitle, { color: theme.text }]}>Programme</Text>
        <Text style={[styles.settingsHeroMeta, { color: theme.muted }]}>{settingsDate} · Heute</Text>

        <View style={styles.mergeInputWrap}>
          <TextInput value={programNameInput} onChangeText={setProgramNameInput} placeholder="Programmname (z. B. Programm 1)" placeholderTextColor={theme.muted} autoCapitalize="sentences" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
          <TextInput value={programStartInput} onChangeText={setProgramStartInput} placeholder="Programmanfang (HH:MM)" placeholderTextColor={theme.muted} autoCapitalize="none" style={[styles.mergeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]} />
        </View>

        <Pressable style={({ pressed }) => [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor: theme.button }], pressed && styles.buttonPressed]} onPress={saveProgramForToday}>
          <Text style={[styles.saveBtnText, { color: theme.buttonText }]}>Programm speichern</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [[styles.saveBtn, styles.settingsSaveBtn, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }], pressed && styles.buttonPressed]} onPress={clearProgramForToday}>
          <Text style={[styles.saveBtnText, { color: theme.text }]}>Programm deaktivieren</Text>
        </Pressable>
      </View>

      <View style={styles.appMetaWrap}>
        <Text style={[styles.appMetaVersion, { color: theme.muted }]}>Version 1.0.4</Text>
        <Text style={[styles.appMetaCopyright, { color: theme.muted }]}>© 2026 Tehmoor Bhatti. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
  };

  const body = activeTab === 'gebetsplan'
    ? renderPrayer()
    : activeTab === 'terminal'
      ? renderTerminal()
      : activeTab === 'stats'
        ? renderStats()
        : renderSettings();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}> 
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Text style={[styles.basmalaText, { color: theme.muted }]}>بِسۡمِ اللّٰہِ الرَّحۡمٰنِ الرَّحِیۡمِ</Text>
      <Pressable style={styles.logoWrap} onPress={() => setActiveTab('gebetsplan')}>
        <Image source={logoSource} style={styles.logoImage} resizeMode="contain" />
      </Pressable>
      <Animated.View style={{ flex: 1, transform: [{ scale: themePulseAnim }] }}>{body}</Animated.View>

      <View style={[styles.tabBar, { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, 6), minHeight: 60 + Math.max(insets.bottom, 6) }]}>
        {TAB_ITEMS.map((tab) => (
          <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={withPressEffect(styles.tabItem)}>
            <Text numberOfLines={1} style={[styles.tabLabel, { color: activeTab === tab.key ? theme.text : theme.muted, fontWeight: activeTab === tab.key ? '700' : '500' }]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>


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
            </ScrollView>
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
  content: { flexGrow: 1, padding: 16, gap: 10, paddingBottom: 16 },
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
  settingsHeroTitle: { textAlign: 'center', fontSize: 22, fontWeight: '700', letterSpacing: 0.2 },
  settingsHeroMeta: { textAlign: 'center', fontSize: 13, fontWeight: '500' },
  mergeSwitchWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  mergeSwitchLabel: { fontSize: 14, fontWeight: '600' },
  mergeInputWrap: { gap: 12, marginTop: 4 },
  mergeInputDisabled: { opacity: 0.45 },
  mergeInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, textAlign: 'center', fontSize: 15, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  modeSwitch: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 10, marginBottom: 6 },
  modeSwitchText: { fontSize: 14, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  presetBtnText: { fontSize: 13, fontWeight: '700' },
  saveBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  settingsSaveBtn: { marginTop: 4, alignSelf: 'center', width: '68%' },
  saveBtnText: { fontSize: 14, fontWeight: '700' },
  noteText: { fontSize: 12, fontWeight: '600' },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, minHeight: 60, paddingHorizontal: 8 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  buttonPressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  tabLabel: { fontSize: 10, textAlign: 'center', width: '100%' },
  toast: { position: 'absolute', bottom: 68, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  bigTerminalBtn: { borderRadius: 18, minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  bigTerminalText: { fontSize: 34, fontWeight: '800' },
  terminalBanner: { borderRadius: 16, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  terminalBannerTitle: { textAlign: 'center', fontSize: 20, fontWeight: '800', letterSpacing: 0.2 },
  terminalBannerArabic: { textAlign: 'center', marginTop: 2, fontSize: 16, fontFamily: Platform.select({ ios: 'Geeza Pro', default: 'serif' }) },
  terminalBannerSubtitle: { textAlign: 'center', marginTop: 4, fontSize: 13, fontWeight: '600' },
  currentPrayerCard: { borderRadius: 16, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  currentPrayerText: { textAlign: 'center', fontSize: 20, fontWeight: '800' },
  noPrayerTitle: { textAlign: 'center', alignSelf: 'center', fontSize: 18, fontWeight: '800', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, overflow: 'hidden', letterSpacing: 0.2 },
  noPrayerTitleLight: { backgroundColor: '#FFF4A3', color: '#111111' },
  noPrayerTitleDark: { backgroundColor: '#FFF4A3', color: '#111111' },
  noPrayerCountdownChip: { alignSelf: 'center', marginTop: 12, borderRadius: 12, borderWidth: 2, paddingVertical: 8, paddingHorizontal: 12 },
  noPrayerCountdownText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
  nextPrayerValue: { textAlign: 'center', fontSize: 20, fontWeight: '800', marginTop: 4 },
  programScheduledHint: { marginTop: 10, borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', gap: 4 },
  programScheduledLabel: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  programScheduledValue: { fontSize: 16, fontWeight: '700', textAlign: 'center', lineHeight: 22 },
  urduText: { textAlign: 'center', fontSize: 12, marginTop: -2, marginBottom: 2 },

  privacyNoticeWrap: { marginTop: 26, paddingHorizontal: 6, alignItems: 'center' },
  privacyNoticeText: { textAlign: 'center', fontSize: 12, lineHeight: 18, fontWeight: '400' },
  privacyNoticeLinkWrap: { marginTop: 8, paddingVertical: 2, paddingHorizontal: 4 },
  privacyNoticeLinkText: { fontSize: 12, lineHeight: 16, fontWeight: '400', textDecorationLine: 'underline' },
  privacyModalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.35)', justifyContent: 'center', padding: 16 },
  privacyModalCard: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  privacyModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  privacyModalTitle: { fontSize: 24, fontWeight: '700', letterSpacing: 0.2 },
  privacyModalCloseBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  privacyModalCloseText: { fontSize: 14, fontWeight: '500' },
  privacyModalBody: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 4 },
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
  guestLinkWrap: { alignSelf: 'center', marginTop: 8, paddingVertical: 4, paddingHorizontal: 8 },
  guestLinkText: { fontSize: 12, textDecorationLine: 'underline', fontWeight: '600' },
  tanzeemRow: { flexDirection: 'row', gap: 10 },
  tanzeemBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  statsHeaderCard: { borderRadius: 16, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  statsHeaderTitle: { fontSize: 28, fontWeight: '800', letterSpacing: 0.2, textAlign: 'center' },
  statsHeaderDate: { marginTop: 2, fontSize: 16, fontWeight: '600', textTransform: 'capitalize', textAlign: 'center' },
  statsHeaderSubline: { marginTop: 3, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  statsHeaderDivider: { marginTop: 10, height: 1, width: '100%' },
  statsCard: { borderRadius: 16, borderWidth: 1, padding: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  statsCardTitle: { fontSize: 13, fontWeight: '700' },
  statsBigValue: { fontSize: 40, fontWeight: '800', marginTop: 4 },
  tanzeemStatsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  tanzeemStatBox: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  tanzeemStatValue: { fontSize: 26, fontWeight: '800', lineHeight: 30 },
  tanzeemStatLabel: { marginTop: 2, fontSize: 12, fontWeight: '600' },
  majlisBarRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  majlisBarLabel: { width: 120, fontSize: 12, fontWeight: '600' },
  majlisBarTrack: { flex: 1, height: 10, borderRadius: 999, overflow: 'hidden' },
  majlisBarFill: { height: '100%', borderRadius: 999 },
  majlisBarValue: { width: 24, textAlign: 'right', fontSize: 12, fontWeight: '700' },
  barRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 120, fontSize: 12, fontWeight: '600' },
  barTrack: { flex: 1, height: 10, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  barValue: { width: 24, textAlign: 'right', fontSize: 12, fontWeight: '700' },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '48%', borderWidth: 1, borderRadius: 12, paddingVertical: 18, paddingHorizontal: 8 },
  gridText: { textAlign: 'center', fontWeight: '700' },
  gridSubText: { textAlign: 'center', marginTop: 4, fontSize: 11, fontWeight: '500' },
});
