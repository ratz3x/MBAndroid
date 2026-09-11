// ============================================================
// Organisasi — Mercedes-Benz Club Indonesia
// Profil Federasi, Sejarah, Dewan Presiden, Pengurus Pusat, & 110 Chapters
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { Colors, Typography, Spacing, Radius, CommonStyles } from '../../src/constants/theme';
import { CLUB_CHAPTERS, REGIONS } from '../../src/constants/chapters';

// ── Images ──────────────────────────────────────────────────
const MBCI_LOGO = require('../../assets/images/logo-mbci.jpg');

const PRESIDENT_PHOTOS: Record<string, any> = {
  pohan: require('../../assets/images/presidents/pohan.png'),
  raditya: require('../../assets/images/presidents/Raditya.png'),
  aditya: require('../../assets/images/presidents/Aditya.png'),
  rheino: require('../../assets/images/presidents/Rheino.png'),
  doddy: require('../../assets/images/presidents/Doddy.png'),
  deddy: require('../../assets/images/presidents/Deddy.png'),
  idham: require('../../assets/images/presidents/Idham.png'),
  mahar: require('../../assets/images/presidents/Mahar.png'),
  cecep: require('../../assets/images/presidents/Cecep.png'),
  made: require('../../assets/images/presidents/Made.png'),
  ocha: require('../../assets/images/presidents/ocha.png'),
};

const FOUNDER_PHOTOS: Record<string, any> = {
  pohan: require('../../assets/images/founders/pohan.png'),
  tubagus: require('../../assets/images/founders/tubagus.png'),
  dharma: require('../../assets/images/founders/dharma.png'),
  bambang: require('../../assets/images/founders/bambang.png'),
};

interface FounderItem {
  name: string;
  role: string;
  club: string;
  photoKey: string;
  initials: string;
}

const FOUNDERS: FounderItem[] = [
  {
    name: 'Ridwan Pohan',
    role: 'President Pertama',
    club: 'Utusan MCCI',
    photoKey: 'pohan',
    initials: 'RP',
  },
  {
    name: 'Tubagus S. Hidayat (Didot)',
    role: 'Vice President',
    club: 'Utusan MTC',
    photoKey: 'tubagus',
    initials: 'TS',
  },
  {
    name: 'Dharma Adsasmuda',
    role: 'Treasurer',
    club: 'Utusan MCCI',
    photoKey: 'dharma',
    initials: 'DA',
  },
  {
    name: 'Bambang Hariyadi',
    role: 'Public Relations',
    club: 'Utusan MTC',
    photoKey: 'bambang',
    initials: 'BH',
  },
];

// ── Tab Keys ────────────────────────────────────────────────
type TabKey = 'profil' | 'sejarah' | 'presiden' | 'pengurus' | 'chapter';

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'profil', label: 'Profil Federasi', icon: 'business-outline' },
  { key: 'sejarah', label: 'Sejarah & Pendiri', icon: 'book-outline' },
  { key: 'presiden', label: 'Daftar Presiden', icon: 'ribbon-outline' },
  { key: 'pengurus', label: 'Struktur Pengurus', icon: 'people-outline' },
  { key: 'chapter', label: 'Daftar Klub & Chapter', icon: 'shield-outline' },
];

// ── Data: Daftar Presiden ───────────────────────────────────
interface PresidentItem {
  id: string;
  periode: string;
  name: string;
  order: string;
  bio: string;
  photoKey: string;
  isIncumbent?: boolean;
}

const PRESIDENTS: PresidentItem[] = [
  {
    id: '1',
    periode: 'Periode 2004 - 2006',
    name: 'Ridwan Pohan',
    order: 'Presiden #1',
    bio: 'Presiden pertama MB Club INA yang merintis fondasi federasi dan representasi resmi di Stuttgart.',
    photoKey: 'pohan',
  },
  {
    id: '2',
    periode: 'Periode 2006 - 2009',
    name: 'Raditya G Wardhana',
    order: 'Presiden #2',
    bio: 'Presiden MB Club INA Periode 2006-2009, memperluas konsolidasi klub dan pengakuan regional.',
    photoKey: 'raditya',
  },
  {
    id: '3',
    periode: 'Periode 2009 - 2011',
    name: 'Aditya Adinatha',
    order: 'Presiden #3',
    bio: 'Presiden MB Club INA Periode 2009-2011, memperkuat agenda nasional dan tata kelola organisasi.',
    photoKey: 'aditya',
  },
  {
    id: '4',
    periode: 'Periode 2011 - 2013',
    name: 'Rheino P Soufyan',
    order: 'Presiden #4',
    bio: 'Presiden MB Club INA Periode 2011-2013, memajukan sinergi antar chapter di luar Jakarta.',
    photoKey: 'rheino',
  },
  {
    id: '5',
    periode: 'Periode 2013 - 2015',
    name: 'Doddy Moedjito',
    order: 'Presiden #5',
    bio: 'Presiden MB Club INA Periode 2013-2015, mendorong pertumbuhan keanggotaan dan kegiatan sosial.',
    photoKey: 'doddy',
  },
  {
    id: '6',
    periode: 'Periode 2015 - 2017',
    name: 'Deddy Rachmadi',
    order: 'Presiden #6',
    bio: 'Presiden MB Club INA Periode 2015-2017, memprakarsai standardisasi legalitas dan tata laksana klub.',
    photoKey: 'deddy',
  },
  {
    id: '7',
    periode: 'Periode 2017 - 2019',
    name: 'Idham Syewket',
    order: 'Presiden #7',
    bio: 'Presiden MB Club INA Periode 2017-2019, memperkokoh solidaritas nasional dan jambore nasional akbar.',
    photoKey: 'idham',
  },
  {
    id: '8',
    periode: 'Periode 2019 - 2021',
    name: 'Mahar Corleone',
    order: 'Presiden #8',
    bio: 'Presiden MB Club INA Periode 2019-2021, memimpin federasi dalam masa adaptasi pandemi dan kepedulian sosial.',
    photoKey: 'mahar',
  },
  {
    id: '9',
    periode: 'Periode 2021 - 2023',
    name: 'Cecep Fajar',
    order: 'Presiden #9',
    bio: 'Presiden MB Club INA Periode 2021-2023, memulihkan kebangkitan mobilitas touring dan event berskala besar.',
    photoKey: 'cecep',
  },
  {
    id: '10',
    periode: 'Periode 2023 - 2025',
    name: 'I Made Yoga Mahardika',
    order: 'Presiden #10',
    bio: 'Presiden MB Club INA Periode 2023-2025, pelopor modernisasi platform digital dan integrasi keanggotaan.',
    photoKey: 'made',
  },
  {
    id: '11',
    periode: 'Periode 2025 - 2027',
    name: 'Dr. Rochady Hendra Setya Wibawa, Sp.OG., M.Kes., S.Kom.',
    order: 'Presiden #11',
    bio: 'Presiden MB Club INA periode 2025-2027. Dokter spesialis kandungan, pakar informatika, dan penggemar Mercedes-Benz.',
    photoKey: 'ocha',
    isIncumbent: true,
  },
];

// ── Data: Dewan Pembina & Kehormatan ─────────────────────────
const DEWAN_PEMBINA = [
  { name: 'Raditya G Wardhana', role: 'Ketua Dewan Pembina' },
  { name: 'Bambang Hariyadi', role: 'Anggota Dewan Pembina · MTC' },
  { name: 'Tubagus Syamsul Hidayat', role: 'Anggota Dewan Pembina · MTC' },
  { name: 'Ridwan Pohan', role: 'Anggota Dewan Pembina · MCCI' },
  { name: 'Dharma Adsasmuda', role: 'Anggota Dewan Pembina · MCCI' },
  { name: 'Aditya Adinatha', role: 'Anggota Dewan Pembina' },
  { name: 'Rheinno P Soufyan', role: 'Anggota Dewan Pembina' },
  { name: 'Doddy Moedjito', role: 'Anggota Dewan Pembina' },
  { name: 'Deddy Rachmadi', role: 'Anggota Dewan Pembina' },
  { name: 'Idham Syewket Adnan', role: 'Anggota Dewan Pembina' },
  { name: 'Mahar Malino', role: 'Anggota Dewan Pembina' },
  { name: 'Cecep Fajar', role: 'Anggota Dewan Pembina' },
  { name: 'I Made Yoga Mahardika', role: 'Penasihat Senior (Mantan Presiden ke-10)' },
];

const DEWAN_KEHORMATAN = [
  { name: 'Ferry Juliantono', role: 'Anggota Dewan Kehormatan' },
  { name: 'Dedie Rachim', role: 'Anggota Dewan Kehormatan' },
  { name: 'Moreno', role: 'Anggota Dewan Kehormatan' },
  { name: 'Ridwan Pohan', role: 'Presiden Kehormatan MB INA ke-1 (2004-2006)' },
  { name: 'Raditya G Wardhana', role: 'Presiden Kehormatan MB INA ke-2 (2006-2009)' },
  { name: 'Aditya Adinatha', role: 'Presiden Kehormatan MB INA ke-3 (2009-2011)' },
  { name: 'Rheino P. Soufyan', role: 'Presiden Kehormatan MB INA ke-4 (2011-2013)' },
  { name: 'Doddy Moedjito', role: 'Presiden Kehormatan MB INA ke-5 (2013-2015)' },
  { name: 'Deddy Rachmadi', role: 'Presiden Kehormatan MB INA ke-6 (2015-2017)' },
  { name: 'Idham Syewket', role: 'Presiden Kehormatan MB INA ke-7 (2017-2019)' },
  { name: 'Mahar Corleone', role: 'Presiden Kehormatan MB INA ke-8 (2019-2021)' },
  { name: 'Cecep Fajar', role: 'Presiden Kehormatan MB INA ke-9 (2021-2023)' },
  { name: 'I Made Yoga Mahardika', role: 'Presiden Kehormatan MB INA ke-10 (2023-2025)' },
];

const KABINET_PUSAT = [
  { level: 'PRESIDEN', title: 'Presiden MB Club INA', name: 'Dr. Rochady Hendra Setya Wibawa, Sp.OG., M.Kes., S.Kom.', origin: 'Pusat MBClubINA', period: '2025 - 2027' },
  { level: 'SEKJEN', title: 'Sekretaris Jenderal / Pusat', name: 'Mukhwan Hariri', origin: 'Pusat MBClubINA', period: '2025 - 2027' },
  { level: 'BENDUM', title: 'Bendahara Umum / Pusat', name: 'Christina Dwi Astuti', origin: 'Pusat MBClubINA', period: '2025 - 2027' },
  { level: 'VICE PRESIDENT', title: 'VP IT & Digital Innovation', name: 'Rizky Ramadhan', origin: 'Pusat MBClubINA', period: '2025 - 2027' },
  { level: 'VICE PRESIDENT', title: 'VP Event & Motorsport', name: 'Prasetyo Wishnu', origin: 'Pusat MBClubINA', period: '2025 - 2027' },
  { level: 'VICE PRESIDENT', title: 'VP Business & Sponsorship', name: 'Hasan Maulani Bahfari', origin: 'Pusat MBClubINA', period: '2025 - 2027' },
  { level: 'VICE PRESIDENT', title: 'VP Organisasi & Keanggotaan', name: 'Donny Kurniawan, S.H.', origin: 'Pusat MBClubINA', period: '2025 - 2027' },
  { level: 'VICE PRESIDENT', title: 'VP Humas & Publikasi', name: 'Bayu Wibowo, M.M.', origin: 'Pusat MBClubINA', period: '2025 - 2027' },
  { level: 'VICE PRESIDENT', title: 'VP Hukum & Advocacy', name: 'Ir. Denny Pratama', origin: 'Pusat MBClubINA', period: '2025 - 2027' },
  { level: 'VICE PRESIDENT', title: 'VP Sosial & Pengabdian Masyarakat', name: 'Dr. Budi Santoso, M.Si.', origin: 'Pusat MBClubINA', period: '2025 - 2027' },
  { level: 'VICE PRESIDENT', title: 'VP Regional Sumatra', name: 'Budhi Imanda', origin: 'Pusat MBClubINA', period: '2025 - 2027' },
  { level: 'VICE PRESIDENT', title: 'VP Regional Banten', name: 'Taufik Gaos', origin: 'Pusat MBClubINA', period: '2025 - 2027' },
  { level: 'VICE PRESIDENT', title: 'VP Regional Metro DKI Jakarta', name: 'H. Ahmad Fauzi, S.E.', origin: 'Pusat MBClubINA', period: '2025 - 2027' },
  { level: 'VICE PRESIDENT', title: 'VP Regional Jawa Barat', name: 'Dedi Herman', origin: 'Pusat MBClubINA', period: '2025 - 2027' },
  { level: 'VICE PRESIDENT', title: 'VP Regional Jawa Tengah', name: 'Rudy Hartono, S.T.', origin: 'Pusat MBClubINA', period: '2025 - 2027' },
  { level: 'VICE PRESIDENT', title: 'VP Regional Yogyakarta', name: 'Dr. M. Rizky Febrian', origin: 'Pusat MBClubINA', period: '2025 - 2027' },
  { level: 'VICE PRESIDENT', title: 'VP Regional Jawa Timur & Bali', name: 'Capt. Irwan Wijaya', origin: 'Pusat MBClubINA', period: '2025 - 2027' },
  { level: 'VICE PRESIDENT', title: 'VP Regional Kalimantan & Sulawesi', name: 'H. Bambang Sugianto', origin: 'Pusat MBClubINA', period: '2025 - 2027' },
];

export default function OrganisasiScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('profil');
  const [chapterSearch, setChapterSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('Semua');

  const filteredChapters = useMemo(() => {
    return CLUB_CHAPTERS.filter((c) => {
      const matchRegion = selectedRegion === 'Semua' || c.region === selectedRegion;
      const q = chapterSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.nama.toLowerCase().includes(q) ||
        c.kode.toLowerCase().includes(q) ||
        c.kota.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q);
      return matchRegion && matchSearch;
    });
  }, [chapterSearch, selectedRegion]);

  const sectionHeaderProps = {
    titleStyle: styles.sectionTitle,
    subtitleStyle: styles.sectionSubtitle,
    accentColor: '#C5A059',
  };

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="#F4F4F5" />
        </Pressable>
        <Text style={styles.headerTitle}>Organisasi Federasi</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Horizontal Scrollable Tabs */}
      <View style={styles.tabBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={isActive ? '#C5A059' : '#A1A1AA'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================ */}
        {/* TAB 1: PROFIL FEDERASI                                      */}
        {/* ============================================================ */}
        {activeTab === 'profil' && (
          <View style={styles.sectionContainer}>
            {/* Header Profil Card */}
            <View style={styles.profileHeroCard}>
              <View style={styles.heroLogoRow}>
                <Image source={MBCI_LOGO} style={styles.heroLogo} resizeMode="contain" />
                <View style={styles.heroLogoTextCol}>
                  <Text style={styles.heroOrgName}>Mercedes-Benz Club Indonesia</Text>
                  <Text style={styles.heroOrgShort}>MB Club INA · Club Federasi</Text>
                  <Text style={styles.heroSlogan}>"Bersama Satu Bintang"</Text>
                </View>
              </View>
            </View>

            {/* Informasi Dasar Organisasi & Sekretariat */}
            <SectionHeader
              title="Informasi Dasar & Sekretariat"
              subtitle="Data legalitas dan kontak resmi federasi"
              {...sectionHeaderProps}
            />
            <View style={styles.cardBox}>
              {[
                { label: 'Nama Resmi', value: 'Mercedes-Benz Club Indonesia' },
                { label: 'Nama Singkat', value: 'MB Club INA' },
                { label: 'Tagline & Slogan', value: '"Bersama Satu Bintang"' },
                { label: 'Tanggal & Tempat Berdiri', value: '2003-01-01 (Jakarta)' },
                { label: 'Status Organisasi', value: 'Club Federasi' },
              ].map((row, idx, arr) => (
                <View
                  key={row.label}
                  style={[styles.metaRow, idx < arr.length - 1 && styles.metaRowBorder]}
                >
                  <Text style={styles.metaLabel}>{row.label}</Text>
                  <Text style={styles.metaValue}>{row.value}</Text>
                </View>
              ))}

              {/* Interactive Contact Links */}
              <View style={[styles.metaRow, styles.metaRowBorder]}>
                <Text style={styles.metaLabel}>Website Resmi</Text>
                <Pressable
                  onPress={() => Linking.openURL('https://mbcina-portal.vercel.app/')}
                  style={styles.linkRow}
                >
                  <Ionicons name="globe-outline" size={14} color="#C5A059" />
                  <Text style={styles.linkValue}>mbcina-portal.vercel.app</Text>
                </Pressable>
              </View>

              <View style={[styles.metaRow, styles.metaRowBorder]}>
                <Text style={styles.metaLabel}>Email Resmi</Text>
                <Pressable
                  onPress={() => Linking.openURL('mailto:info@mbina.or.id')}
                  style={styles.linkRow}
                >
                  <Ionicons name="mail-outline" size={14} color="#C5A059" />
                  <Text style={styles.linkValue}>info@mbina.or.id</Text>
                </Pressable>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Nomor Telepon</Text>
                <Pressable
                  onPress={() => Linking.openURL('tel:+62217890123')}
                  style={styles.linkRow}
                >
                  <Ionicons name="call-outline" size={14} color="#C5A059" />
                  <Text style={styles.linkValue}>+62-21-7890123</Text>
                </Pressable>
              </View>
            </View>

            {/* Visi */}
            <View style={{ marginTop: Spacing.xl }}>
              <SectionHeader title="Visi MB Club INA" {...sectionHeaderProps} />
              <View style={styles.visionCard}>
                <Ionicons name="star" size={20} color="#C5A059" style={styles.visionStarIcon} />
                <Text style={styles.visionQuote}>
                  "Menjadi wadah komunitas Mercedes-Benz terbesar, terbaik, dan paling solid di Indonesia serta menjadi kebanggaan bangsa."
                </Text>
              </View>
            </View>

            {/* Misi */}
            <View style={{ marginTop: Spacing.xl }}>
              <SectionHeader title="Misi Strategis Organisasi" {...sectionHeaderProps} />
              <View style={styles.missionList}>
                {[
                  'Mempererat tali persaudaraan antar anggota dan menciptakan lingkungan yang inklusif dan saling mendukung.',
                  'Menyediakan platform edukasi tentang Mercedes-Benz dan berbagi pengalaman serta tips perawatan.',
                  'Aktif dalam kegiatan sosial dan bakti sosial serta memberikan kontribusi positif bagi masyarakat.',
                  'Terus berkembang dan beradaptasi dengan zaman serta menjangkau lebih banyak anggota di seluruh Indonesia.',
                ].map((item, idx) => (
                  <View key={idx} style={styles.missionItem}>
                    <View style={styles.missionNumBadge}>
                      <Text style={styles.missionNumText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.missionText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 2: SEJARAH & PENDIRI                                    */}
        {/* ============================================================ */}
        {activeTab === 'sejarah' && (
          <View style={styles.sectionContainer}>
            <SectionHeader
              title="Sejarah & Tonggak Sejarah"
              subtitle="Kronologi pembentukan, peresmian federasi, dan tonggak sejarah komunitas"
              {...sectionHeaderProps}
            />

            {/* Pasal 1 */}
            <View style={styles.historyCard}>
              <View style={styles.historyHeaderRow}>
                <Text style={styles.historyTitle}>Latar Belakang Pembentukan</Text>
                <View style={styles.historyEstBadge}>
                  <Text style={styles.historyEstText}>EST. 2000</Text>
                </View>
              </View>
              <Text style={styles.historyBody}>
                Pada akhir dekade 1990-an sampai dengan awal 2000-an, di Jakarta telah terbentuk beberapa klub Mercedes-Benz, yaitu MCCI, MTC, dan MJI. Klub-klub tersebut meregistrasikan keberadaannya kepada pihak principal Daimler AG di Stuttgart melalui ATPM Mercedes-Benz di Indonesia saat itu, PT Daimler Chrysler Indonesia (PT DC INA), untuk mendapatkan sertifikasi atau legitimasi sebagai klub resmi yang terdaftar.{'\n\n'}
                Pemberian sertifikasi pun dikeluarkan kepada ketiga klub tersebut (MCCI, MTC, dan MJI) oleh principal yang pada waktu itu diserahkan melalui PT DC INA dan teregistrasi di bawah MCCCI (Mercedes-Benz Classic Car Club International) Regional Asia-Pasifik yang berkedudukan di Singapura.{'\n\n'}
                Pada tahun 2003, MBCI (W124) terbentuk di Jakarta dan langsung mengajukan permohonan sertifikasi kepada pihak principal. Pada saat pengajuan sertifikasi MBCI sedang berproses (biasanya proses ini berjalan sekitar satu tahun atau lebih), pihak principal mengusulkan kepada PT DC INA agar mewacanakan pembentukan klub holding untuk klub-klub Mercedes-Benz yang ada di Indonesia. Hal ini bertujuan untuk mengantisipasi perkembangan dan pertumbuhan jumlah klub Mercedes-Benz di Indonesia pada masa depan.
              </Text>
            </View>

            {/* Pasal 2 */}
            <View style={styles.historyCard}>
              <View style={styles.historyHeaderRow}>
                <Text style={styles.historyTitle}>Proses Pembentukan & Peresmian Federasi</Text>
                <View style={styles.historyEstBadge}>
                  <Text style={styles.historyEstText}>EST. 2004</Text>
                </View>
              </View>
              <Text style={styles.historyBody}>
                Pada awal tahun 2004, PT DC INA melalui Bapak Yuniadi Hartono (Deputy Director Marketing & Communication saat itu) beserta Bapak Wim Ekel mulai berkomunikasi dengan tiga klub Mercedes-Benz yang sudah tersertifikasi—yaitu MCCI, MTC, dan MJI—untuk segera membentuk klub holding Mercedes-Benz di Indonesia yang dinamakan Mercedes-Benz Club Indonesia (MB Club Ina), dengan mengirimkan dua orang perwakilan dari masing-masing klub.{'\n\n'}
                Utusan perwakilan klub pendiri saat itu:{'\n'}
                • MCCI mengutus: Ridwan Pohan dan Dharma Adsasmuda.{'\n'}
                • MTC mengutus: Bambang Hariyadi dan Tubagus S. Hidayat (Didot).{'\n'}
                • MJI memutuskan untuk tidak mengirimkan perwakilan, tetapi tetap menyetujui dan mendukung rencana pembentukan MB Club Ina.{'\n\n'}
                Setelah melalui proses pembentukan lewat beberapa kali pertemuan, pada bulan Agustus 2004, Mercedes-Benz Club Indonesia (MB Club Ina) diresmikan oleh PT DC INA sebagai klub federasi yang beranggotakan klub-klub Mercedes-Benz di Indonesia.{'\n\n'}
                Salah satu fungsi MB Club Ina adalah mewakili Indonesia di forum dan kegiatan klub Mercedes-Benz internasional, di antaranya acara President Club Meeting yang diadakan setiap tahun pada bulan Oktober oleh MB Museum, Club Management di Stuttgart.
              </Text>
            </View>

            {/* Pasal 3 */}
            <View style={styles.historyCard}>
              <View style={styles.historyHeaderRow}>
                <Text style={styles.historyTitle}>Catatan Tambahan & Konsep 4 Pilar</Text>
                <View style={styles.historyEstBadge}>
                  <Text style={styles.historyEstText}>EST. 2005</Text>
                </View>
              </View>
              <Text style={styles.historyBody}>
                Pada saat Mercedes-Benz Museum di Stuttgart diresmikan pada tahun 2005, peran Mercedes-Benz Classic Club International (MCCCI) yang tadinya berfungsi membawahi klub-klub Mercedes-Benz di seluruh dunia digantikan oleh Mercedes-Benz Museum, Club Management yang berkedudukan di Stuttgart.{'\n\n'}
                Pada saat MB Club Ina diresmikan, PT DC INA menetapkan dan menunjuk secara langsung susunan kepengurusan pertama yang terdiri dari empat orang perwakilan MCCI dan MTC:{'\n'}
                • President: Ridwan Pohan{'\n'}
                • Vice President: Tubagus S. Hidayat{'\n'}
                • Treasurer: Dharma Adsasmuda{'\n'}
                • Public Relations: Bambang Haryadi{'\n\n'}
                Keempat orang perwakilan dari masing-masing klub inilah yang sekarang kita sebut sebagai pendiri atau founder MB Club Ina.{'\n\n'}
                Setelah MB Club Ina resmi terbentuk, masih pada tahun yang sama (2004), sertifikasi untuk MBCI dari principal/MCCCI dikeluarkan dan diserahkan langsung oleh PT DC INA. MBCI menjadi klub Mercedes-Benz terakhir di Indonesia yang tersertifikasi langsung dari MCCCI sekaligus otomatis menjadi klub anggota MB Club Ina.{'\n\n'}
                Sejak saat itu pula, Bapak Wim Ekel dari PT DC INA mengemukakan konsep 4 Pilar MB Club Ina, yaitu: MCCI, MTC, MJI, dan MBCI.
              </Text>
            </View>

            {/* 4 Pilar Pendiri MB Club INA */}
            <View style={{ marginTop: Spacing.xl }}>
              <SectionHeader
                title="4 Pilar Pendiri MB Club INA"
                subtitle="Klub pendiri federasi resmi"
                {...sectionHeaderProps}
              />
              <View style={styles.fourPillarsGrid}>
                {[
                  { code: 'MCCI', name: 'Mercedes-Benz Car Club Indonesia', icon: 'shield-checkmark' },
                  { code: 'MTC', name: 'Mercedes-Benz Tiger Club', icon: 'speedometer' },
                  { code: 'MJI', name: 'Mercedes-Benz Jip Indonesia', icon: 'car-sport' },
                  { code: 'MBCI', name: 'Mercedes-Benz Boxer Club Indonesia (W124)', icon: 'ribbon' },
                ].map((pillar) => (
                  <View key={pillar.code} style={styles.pillarCard}>
                    <View style={styles.pillarIconBox}>
                      <Ionicons name={pillar.icon as any} size={20} color="#E4E4E7" />
                    </View>
                    <Text style={styles.pillarCode}>{pillar.code}</Text>
                    <Text style={styles.pillarName}>{pillar.name}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Pendiri Organisasi (Founders) */}
            <View style={{ marginTop: Spacing.xl }}>
              <SectionHeader
                title="Pendiri Organisasi (Founders)"
                subtitle="Tokoh penggagas dan pengurus pertama 2004"
                {...sectionHeaderProps}
              />
              <View style={styles.cardBox}>
                {FOUNDERS.map((founder, idx, arr) => {
                  const photo = FOUNDER_PHOTOS[founder.photoKey];
                  return (
                    <View
                      key={founder.name}
                      style={[styles.founderRow, idx < arr.length - 1 && styles.metaRowBorder]}
                    >
                      <View style={styles.founderAvatar}>
                        {photo ? (
                          <Image
                            source={photo}
                            style={styles.founderPhoto}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={styles.founderAvatarText}>
                            {founder.initials}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.founderName}>{founder.name}</Text>
                        <Text style={styles.founderRole}>{founder.role} • {founder.club}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 3: DAFTAR PRESIDEN                                      */}
        {/* ============================================================ */}
        {activeTab === 'presiden' && (
          <View style={styles.sectionContainer}>
            <SectionHeader
              title="Timeline Dewan Presiden MB Club INA"
              subtitle="Kepemimpinan federasi dari masa ke masa (2004–2027)"
              {...sectionHeaderProps}
            />

            <View style={styles.presidentList}>
              {PRESIDENTS.map((pres) => {
                const photo = PRESIDENT_PHOTOS[pres.photoKey];
                return (
                  <View
                    key={pres.id}
                    style={[
                      styles.presidentCard,
                      pres.isIncumbent && styles.presidentCardIncumbent,
                    ]}
                  >
                    {/* Header Strip with Period & Status Badge */}
                    <View style={styles.presidentHeaderRow}>
                      <View style={styles.periodBadge}>
                        <Ionicons name="calendar-outline" size={12} color="#D4D4D8" />
                        <Text style={styles.periodBadgeText}>{pres.periode}</Text>
                      </View>
                      {pres.isIncumbent && (
                        <View style={styles.incumbentBadge}>
                          <Text style={styles.incumbentBadgeText}>INCUMBENT</Text>
                        </View>
                      )}
                    </View>

                    {/* President Details */}
                    <View style={styles.presidentBodyRow}>
                      {/* Photo */}
                      <View style={styles.presidentPhotoFrame}>
                        {photo ? (
                          <Image source={photo} style={styles.presidentPhoto} resizeMode="cover" />
                        ) : (
                          <View style={styles.presidentPhotoPlaceholder}>
                            <Ionicons name="person" size={28} color="#A1A1AA" />
                          </View>
                        )}
                      </View>

                      {/* Info */}
                      <View style={styles.presidentInfoCol}>
                        <Text style={styles.presidentOrderText}>{pres.order}</Text>
                        <Text style={styles.presidentNameText}>{pres.name}</Text>
                        <Text style={styles.presidentBioText}>{pres.bio}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 4: STRUKTUR PENGURUS PUSAT                              */}
        {/* ============================================================ */}
        {activeTab === 'pengurus' && (
          <View style={styles.sectionContainer}>
            {/* Periodisasi Badge */}
            <View style={styles.cabinetPeriodCard}>
              <Text style={styles.cabinetPeriodSub}>PERIODISASI KEPENGURUSAN PUSAT</Text>
              <Text style={styles.cabinetPeriodTitle}>Kabinet MB INA Periode 2025 - 2027</Text>
              <View style={styles.activePeriodPill}>
                <View style={styles.activeDot} />
                <Text style={styles.activePeriodText}>PERIODE AKTIF</Text>
              </View>
            </View>

            {/* Dewan Pembina */}
            <SectionHeader
              title="Dewan Pembina"
              subtitle={`${DEWAN_PEMBINA.length} Anggota Dewan Pembina Resmi`}
              {...sectionHeaderProps}
            />
            <View style={styles.cardBox}>
              {DEWAN_PEMBINA.map((p, idx, arr) => (
                <View
                  key={p.name}
                  style={[styles.memberRow, idx < arr.length - 1 && styles.metaRowBorder]}
                >
                  <View style={styles.memberAvatarBox}>
                    <Ionicons name="shield-outline" size={16} color="#A1A1AA" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberNameText}>{p.name}</Text>
                    <Text style={styles.memberRoleText}>{p.role}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Dewan Kehormatan */}
            <View style={{ marginTop: Spacing.xl }}>
              <SectionHeader
                title="Dewan Kehormatan"
                subtitle={`${DEWAN_KEHORMATAN.length} Anggota Dewan Kehormatan Resmi`}
                {...sectionHeaderProps}
              />
              <View style={styles.cardBox}>
                {DEWAN_KEHORMATAN.map((p, idx, arr) => (
                  <View
                    key={p.name}
                    style={[styles.memberRow, idx < arr.length - 1 && styles.metaRowBorder]}
                  >
                    <View style={styles.memberAvatarBox}>
                      <Ionicons name="ribbon-outline" size={16} color="#C5A059" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberNameText}>{p.name}</Text>
                      <Text style={styles.memberRoleText}>{p.role}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Struktur Kepengurusan & Kabinet Pusat */}
            <View style={{ marginTop: Spacing.xl }}>
              <SectionHeader
                title="Struktur Kepengurusan & Kabinet Pusat"
                subtitle="Daftar pengurus inti, vice president, dan koordinator regional"
                {...sectionHeaderProps}
              />
              <View style={styles.cardBox}>
                {KABINET_PUSAT.map((item, idx, arr) => (
                  <View
                    key={item.title}
                    style={[styles.cabinetRow, idx < arr.length - 1 && styles.metaRowBorder]}
                  >
                    <View style={styles.cabinetLevelBadge}>
                      <Text style={styles.cabinetLevelText}>{item.level}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cabinetTitleText}>{item.title}</Text>
                      <Text style={styles.cabinetOfficialName}>{item.name}</Text>
                      <Text style={styles.cabinetOriginText}>{item.origin} • {item.period}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 5: DAFTAR KLUB & CHAPTER (110 UNIT RESMI)                */}
        {/* ============================================================ */}
        {activeTab === 'chapter' && (
          <View style={styles.sectionContainer}>
            <SectionHeader
              title="Daftar Klub & Chapter"
              subtitle={`${CLUB_CHAPTERS.length} Klub & Chapter Resmi di 8 Region Indonesia`}
              {...sectionHeaderProps}
            />

            {/* Search Input */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color="#A1A1AA" style={{ marginRight: Spacing.sm }} />
              <TextInput
                style={styles.searchInput}
                value={chapterSearch}
                onChangeText={setChapterSearch}
                placeholder="Cari nama klub, kode, kota, atau region..."
                placeholderTextColor="#71717A"
              />
              {chapterSearch.length > 0 && (
                <Pressable onPress={() => setChapterSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#A1A1AA" />
                </Pressable>
              )}
            </View>

            {/* Region Chips Horizontal */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.regionChipScroll}
            >
              {['Semua', ...REGIONS].map((r) => {
                const isActive = selectedRegion === r;
                return (
                  <Pressable
                    key={r}
                    style={[styles.regionChip, isActive && styles.regionChipActive]}
                    onPress={() => setSelectedRegion(r)}
                  >
                    <Text style={[styles.regionChipText, isActive && styles.regionChipTextActive]}>
                      {r.replace('Regional ', '')}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Counter */}
            <Text style={styles.resultsCount}>
              Menampilkan {filteredChapters.length} dari {CLUB_CHAPTERS.length} Klub & Chapter
            </Text>

            {/* Chapters Grid / List */}
            <View style={styles.chapterList}>
              {filteredChapters.map((c) => (
                <View key={c.kode} style={styles.chapterCard}>
                  <View style={styles.chapterCardHeader}>
                    <View
                      style={[
                        styles.badgeTipe,
                        c.tipe === 'CLUB' ? styles.badgeClub : styles.badgeChapter,
                      ]}
                    >
                      <Text style={styles.badgeTipeText}>{c.tipe}</Text>
                    </View>
                    <Text style={styles.chapterCodeText}>{c.kode}</Text>
                    <Text style={styles.chapterRegionBadge}>{c.region}</Text>
                  </View>
                  <Text style={styles.chapterNameText}>{c.nama}</Text>
                  <View style={styles.chapterLocationRow}>
                    <Ionicons name="location-outline" size={13} color="#A1A1AA" />
                    <Text style={styles.chapterCityText}>Kota / Domisili: {c.kota}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.base, paddingBottom: Spacing['3xl'] },

  // Header Bar
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#090A0C',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Horizontal Tab Bar
  tabBarContainer: {
    backgroundColor: '#090A0C',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabsScroll: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabPillActive: {
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    borderColor: 'rgba(197, 160, 89, 0.45)',
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#A1A1AA',
    letterSpacing: 0.2,
  },
  tabPillTextActive: {
    color: '#F4F4F5',
    fontWeight: '700',
  },

  sectionContainer: {
    marginTop: Spacing.base,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#E4E4E7',
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: '#A1A1AA',
    marginTop: 2,
    letterSpacing: 0.2,
  },

  // Profile Hero Card
  profileHeroCard: {
    backgroundColor: 'rgba(20, 22, 28, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
    marginBottom: Spacing.lg,
  },
  heroLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroLogo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    marginRight: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  heroLogoTextCol: {
    flex: 1,
  },
  heroOrgName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  heroOrgShort: {
    fontSize: 12,
    color: '#A1A1AA',
    marginTop: 3,
    fontWeight: '500',
  },
  heroSlogan: {
    fontSize: 11.5,
    color: '#C5A059',
    fontStyle: 'italic',
    marginTop: 5,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Base Box Card
  cardBox: {
    backgroundColor: 'rgba(20, 22, 28, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: Spacing.base,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  metaRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  metaLabel: {
    fontSize: 12.5,
    color: '#A1A1AA',
    fontWeight: '500',
    flex: 1,
  },
  metaValue: {
    fontSize: 12.5,
    color: '#F4F4F5',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1.5,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkValue: {
    fontSize: 12.5,
    color: '#C5A059',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Vision & Mission
  visionCard: {
    backgroundColor: 'rgba(11, 12, 16, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.25)',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
  },
  visionStarIcon: {
    marginBottom: 10,
    opacity: 0.95,
  },
  visionQuote: {
    fontSize: 13.5,
    lineHeight: 23,
    color: '#F4F4F5',
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  missionList: {
    gap: 10,
  },
  missionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(20, 22, 28, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  missionNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionNumText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C5A059',
  },
  missionText: {
    flex: 1,
    fontSize: 13,
    color: '#D4D4D8',
    lineHeight: 20,
  },

  // History Article Cards
  historyCard: {
    backgroundColor: 'rgba(20, 22, 28, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    letterSpacing: 0.2,
  },
  historyEstBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  historyEstText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A1A1AA',
    letterSpacing: 1,
  },
  historyBody: {
    fontSize: 13,
    lineHeight: 21,
    color: '#D4D4D8',
  },

  // 4 Pillars Grid
  fourPillarsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  pillarCard: {
    width: '48%',
    backgroundColor: 'rgba(20, 22, 28, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  pillarIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pillarCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  pillarName: {
    fontSize: 11,
    color: '#A1A1AA',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },

  // Founders
  founderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  founderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#090A0C',
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  founderPhoto: {
    width: '100%',
    height: '100%',
  },
  founderAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F4F4F5',
  },
  founderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  founderRole: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
  },

  // Presidents
  presidentList: {
    gap: 14,
  },
  presidentCard: {
    backgroundColor: 'rgba(20, 22, 28, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 16,
  },
  presidentCardIncumbent: {
    borderColor: 'rgba(197, 160, 89, 0.4)',
    backgroundColor: 'rgba(24, 26, 34, 0.85)',
  },
  presidentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  periodBadgeText: {
    fontSize: 11,
    color: '#D4D4D8',
    fontWeight: '600',
  },
  incumbentBadge: {
    backgroundColor: '#C5A059',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  incumbentBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: 1,
  },
  presidentBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  presidentPhotoFrame: {
    width: 68,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#090A0C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  presidentPhoto: {
    width: '100%',
    height: '100%',
  },
  presidentPhotoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presidentInfoCol: {
    flex: 1,
  },
  presidentOrderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A1A1AA',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  presidentNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
    lineHeight: 20,
  },
  presidentBioText: {
    fontSize: 11.5,
    color: '#A1A1AA',
    marginTop: 6,
    lineHeight: 17,
  },

  // Structure / Cabinet
  cabinetPeriodCard: {
    backgroundColor: 'rgba(20, 22, 28, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 18,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  cabinetPeriodSub: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#71717A',
  },
  cabinetPeriodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
    marginBottom: 10,
  },
  activePeriodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activePeriodText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  memberAvatarBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  memberRoleText: {
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
  },
  cabinetRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  cabinetLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cabinetLevelText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#D4D4D8',
    letterSpacing: 0.5,
  },
  cabinetTitleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  cabinetOfficialName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  cabinetOriginText: {
    fontSize: 10.5,
    color: '#71717A',
    marginTop: 2,
  },

  // Chapter List
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 22, 28, 0.65)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: Spacing.md,
    height: 44,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
  },
  regionChipScroll: {
    paddingVertical: 4,
    gap: 6,
    marginBottom: Spacing.sm,
  },
  regionChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  regionChipActive: {
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    borderColor: 'rgba(197, 160, 89, 0.45)',
  },
  regionChipText: {
    fontSize: 11,
    color: '#A1A1AA',
    fontWeight: '500',
  },
  regionChipTextActive: {
    color: '#F4F4F5',
    fontWeight: '700',
  },
  resultsCount: {
    fontSize: 11,
    color: '#71717A',
    marginBottom: Spacing.md,
    marginLeft: 2,
  },
  chapterList: {
    gap: 10,
  },
  chapterCard: {
    backgroundColor: 'rgba(20, 22, 28, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 14,
  },
  chapterCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  badgeTipe: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeClub: {
    backgroundColor: '#C5A059',
  },
  badgeChapter: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  badgeTipeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#000000',
  },
  chapterCodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F4F4F5',
    letterSpacing: 0.5,
  },
  chapterRegionBadge: {
    fontSize: 10,
    color: '#71717A',
    marginLeft: 4,
  },
  chapterNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  chapterLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chapterCityText: {
    fontSize: 11.5,
    color: '#A1A1AA',
  },
});
