import type { ZoneId } from '../world/bengaluruData';
import type { MissionDef } from '../missions/MissionSystem';

export type StoryLanguage = 'en' | 'kn' | 'hi';

export interface LocalizedText {
  en: string;
  kn: string;
  hi: string;
}

export interface StoryCharacterDef {
  id: string;
  name: string;
  alias: string;
  role: 'mentor' | 'friend' | 'official' | 'informant' | 'boss';
  roleLabel: string;
  zone: ZoneId;
  accentColor: string;
  voicePitch: number;
  voiceRate: number;
  bio: LocalizedText;
}

export interface DialogueChoice {
  id: string;
  label: LocalizedText;
  alignment: 'loyalty' | 'power' | 'neutral';
  deltaLoyalty: number;
  deltaPower: number;
  deltaCash?: number;
  deltaRespect?: number;
  setsFlag?: string;
  replySpeakerId: string;
  reply: LocalizedText;
}

export interface DialogueLine {
  speakerId: string;
  text: LocalizedText;
}

export interface DialogueSceneDef {
  id: string;
  chapterId: string;
  title: string;
  lines: DialogueLine[];
  choices: DialogueChoice[];
}

export interface CutsceneShot {
  lat: number;
  lon: number;
  camOffset: [number, number, number];
  lookOffset: [number, number, number];
  duration: number;
  caption: LocalizedText;
  speakerId?: string;
}

export interface CutsceneDef {
  id: string;
  title: string;
  subtitle: string;
  shots: CutsceneShot[];
}

export interface ChapterMissionDef extends MissionDef {
  chapterId: string;
  isBossMission?: boolean;
  bossName?: string;
  preDialogueId?: string;
  postCutsceneId?: string;
}

export interface CampaignChapterDef {
  id: string;
  number: number;
  zone: ZoneId;
  title: string;
  titleKn: string;
  bossId: string;
  summary: LocalizedText;
  introCutscene: CutsceneDef;
  dialogue: DialogueSceneDef;
  missions: ChapterMissionDef[];
}

export interface EndingDef {
  id: 'loyalty' | 'power';
  title: string;
  subtitle: string;
  epilogue: LocalizedText;
  cutscene: CutsceneDef;
}

/**
 * 12 Original Named Fictional Characters across all 8 Bengaluru zones
 * (Mentor, Loyal Friend, Fictional Corrupt Official, Informant, and 8 Rival Zone Bosses).
 */
export const STORY_CHARACTERS: StoryCharacterDef[] = [
  {
    id: 'raghav_anna',
    name: 'Raghav Rao',
    alias: 'Anna',
    role: 'mentor',
    roleLabel: 'MENTOR • RETIRED STRATEGIST',
    zone: 'central',
    accentColor: '#00E5C3',
    voicePitch: 0.85,
    voiceRate: 0.94,
    bio: {
      en: 'An old-school Cantonment tactician who raised you on Church Street. Believes respect and loyalty outlast bullets.',
      kn: 'ಚರ್ಚ್ ಸ್ಟ್ರೀಟ್‌ನಲ್ಲಿ ನಿಮ್ಮನ್ನು ಬೆಳೆಸಿದ ಹಳೆಯ ತಂತ್ರಜ್ಞ. ಗುಂಡುಗಳಿಗಿಂತ ನಿಷ್ಠೆ ಮತ್ತು ಗೌರವ ಶಾಶ್ವತ ಎಂದು ನಂಬುತ್ತಾರೆ.',
      hi: 'चर्च स्ट्रीट के पुराने रणनीतिकार जिन्होंने तुम्हें रास्ता दिखाया। मानते हैं कि वफ़ादारी गोलियों से ज़्यादा टिकाऊ है।'
    }
  },
  {
    id: 'devi_nair',
    name: 'Devika Nair',
    alias: 'Devi',
    role: 'friend',
    roleLabel: 'LOYAL FRIEND • SCOUT & DRIVER',
    zone: 'central',
    accentColor: '#FFB020',
    voicePitch: 1.18,
    voiceRate: 1.06,
    bio: {
      en: 'Your day-one partner from Brigade Road. Runs encrypted comms, steals getaway autos, and never leaves friends behind.',
      kn: 'ಬ್ರಿಗೇಡ್ ರಸ್ತೆಯ ನಿಮ್ಮ ನಂಬಿಗಸ್ತ ಗೆಳತಿ. ಕಾಮ್ಸ್ ಮತ್ತು ಗೇಟ್‌ಅವೇ ಡ್ರೈವಿಂಗ್‌ನಲ್ಲಿ ನಿಪುಣೆ.',
      hi: 'ब्रिगेड रोड से तुम्हारी सबसे भरोसेमंद दोस्त। कम्युनिकेशन और गेटअवे ड्राइविंग में माहिर।'
    }
  },
  {
    id: 'comm_kulkarni',
    name: 'Pradeep Kulkarni',
    alias: 'Directorate Fixer',
    role: 'official',
    roleLabel: 'FICTIONAL CORRUPT OFFICIAL',
    zone: 'north',
    accentColor: '#FF2E88',
    voicePitch: 0.78,
    voiceRate: 0.9,
    bio: {
      en: 'A fictional high-ranking civic bureaucrat who secretly auctions patrol lookouts to whichever crew pays highest.',
      kn: 'ಯಾರು ಹೆಚ್ಚು ಹಣ ನೀಡುತ್ತಾರೋ ಅವರಿಗೆ ರಹಸ್ಯವಾಗಿ ನೆರವು ನೀಡುವ ಕಾಲ್ಪನಿಕ ಭ್ರಷ್ಟ ಅಧಿಕಾರಿ.',
      hi: 'एक काल्पनिक भ्रष्ट अधिकारी जो सबसे ऊंची बोली लगाने वाले गैंग को गुप्त मदद बेचता है।'
    }
  },
  {
    id: 'chotu_mahesh',
    name: 'Mahesh',
    alias: 'Filter Chotu',
    role: 'informant',
    roleLabel: 'STREET INFORMANT • KR MARKET',
    zone: 'old_city',
    accentColor: '#00E5C3',
    voicePitch: 1.25,
    voiceRate: 1.14,
    bio: {
      en: 'Runs a 5 AM filter-kaapi & chai cart near KR Market. Hears every rival shipment rumor before sunrise.',
      kn: 'ಕೆ.ಆರ್. ಮಾರುಕಟ್ಟೆ ಹತ್ತಿರ ಚಹಾ ಗಾಡಿ ನಡೆಸುವ ಮಾಹಿತಿದಾರ. ಪ್ರತಿ ಗ್ಯಾಂಗ್ ಚಲನವಲನ ಇವನಿಗೆ ಗೊತ್ತು.',
      hi: 'के.आर. मार्केट के पास चाय की टपरी चलाने वाला मुखबिर। हर काफिले की खबर सबसे पहले इसके पास आती है।'
    }
  },
  {
    id: 'boss_central',
    name: 'Vikram Hegde',
    alias: 'Silk',
    role: 'boss',
    roleLabel: 'BOSS • CANTONMENT SYNDICATE',
    zone: 'central',
    accentColor: '#FFB020',
    voicePitch: 0.82,
    voiceRate: 0.96,
    bio: {
      en: 'Immaculate suit, ruthless grip over MG Road & Brigade Road protection rackets.',
      kn: 'ಎಂ.ಜಿ. ರಸ್ತೆ ಮತ್ತು ಬ್ರಿಗೇಡ್ ರಸ್ತೆಯ ಕಂಟೋನ್ಮೆಂಟ್ ಸಿಂಡಿಕೇಟ್ ನಾಯಕ.',
      hi: 'एम.जी. रोड और ब्रिगेड रोड के कैंटोनमेंट सिंडिकेट का बेरहम बॉस।'
    }
  },
  {
    id: 'boss_old_city',
    name: 'Surya Gowda',
    alias: 'Cobra',
    role: 'boss',
    roleLabel: 'BOSS • PETTAH COBRAS',
    zone: 'old_city',
    accentColor: '#FF2E88',
    voicePitch: 0.76,
    voiceRate: 0.92,
    bio: {
      en: 'Commands the dense Chickpet alleys and Majestic rail-hub smuggling rings.',
      kn: 'ಚಿಕ್ಕಪೇಟೆ ಮತ್ತು ಮೆಜೆಸ್ಟಿಕ್ ಕಳ್ಳಸಾಗಣೆ ಜಾಲದ ಪೇಟೆ ಕೋಬ್ರಾ ಬಾಸ್.',
      hi: 'चिकपेट की गलियों और मैजेस्टिक तस्करी नेटवर्क का बॉस।'
    }
  },
  {
    id: 'boss_east',
    name: 'Rhea Menon',
    alias: 'Neon',
    role: 'boss',
    roleLabel: 'BOSS • 100FT NEON VIPERS',
    zone: 'east',
    accentColor: '#FF2E88',
    voicePitch: 1.12,
    voiceRate: 1.05,
    bio: {
      en: 'Queenpin of Indiranagar 100ft Road nightlife syndicates and ORR street-racing rings.',
      kn: 'ಇಂದಿರಾನಗರ ೧೦೦ ಅಡಿ ರಸ್ತೆಯ ನಿಯಾನ್ ವೈಪರ್ಸ್ ಗ್ಯಾಂಗ್ ನಾಯಕಿ.',
      hi: 'इंदिरानगर 100 फीट रोड और ORR रेसिंग सिंडिकेट की लीडर।'
    }
  },
  {
    id: 'boss_south',
    name: 'Babu Shetty',
    alias: 'Gridlock',
    role: 'boss',
    roleLabel: 'BOSS • SILK GRID RUNNERS',
    zone: 'south',
    accentColor: '#FFB020',
    voicePitch: 0.8,
    voiceRate: 0.98,
    bio: {
      en: 'Uses Silk Board traffic jams as moving ambushes across South Bengaluru.',
      kn: 'ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಟ್ರಾಫಿಕ್ ಜಾಮ್‌ಗಳನ್ನೇ ಅಸ್ತ್ರವಾಗಿ ಬಳಸುವ ಸಿಲ್ಕ್ ಗ್ರಿಡ್ ರನ್ನರ್ಸ್ ಬಾಸ್.',
      hi: 'सिल्क बोर्ड के ट्रैफिक जाम को अपने घात का हथियार बनाने वाला बॉस।'
    }
  },
  {
    id: 'boss_ecity',
    name: 'Dr. Arvind Deshpande',
    alias: 'Cipher',
    role: 'boss',
    roleLabel: 'BOSS • SILICON SYNDICATE',
    zone: 'southeast',
    accentColor: '#00E5C3',
    voicePitch: 0.92,
    voiceRate: 1.0,
    bio: {
      en: 'Former enterprise architect who turned Electronic City Phase 1 servers into a fictional black-ledger empire.',
      kn: 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿಯ ಸಿಲಿಕಾನ್ ಸಿಂಡಿಕೇಟ್‌ನ ತಾಂತ್ರಿಕ ಮಾಸ್ಟರ್‌ಮೈಂಡ್.',
      hi: 'इलेक्ट्रॉनिक सिटी के सिलिकॉन सिंडिकेट का टेक मास्टरमाइंड।'
    }
  },
  {
    id: 'boss_west',
    name: 'Loha Reddy',
    alias: 'Anvil',
    role: 'boss',
    roleLabel: 'BOSS • PEENYA IRON WOLVES',
    zone: 'west',
    accentColor: '#FFB020',
    voicePitch: 0.7,
    voiceRate: 0.88,
    bio: {
      en: 'Armored foundry enforcer controlling Peenya industrial sheds and Yeshwanthpur freight yards.',
      kn: 'ಪೀಣ್ಯ ಕೈಗಾರಿಕಾ ಪ್ರದೇಶ ಮತ್ತು ಯಶವಂತಪುರದ ಐರನ್ ವುಲ್ವ್ಸ್ ನಾಯಕ.',
      hi: 'पीन्या इंडस्ट्रियल शेड्स और यशवंतपुर का भारी-भरकम बॉस।'
    }
  },
  {
    id: 'boss_north',
    name: 'Karan Verma',
    alias: 'Flyover',
    role: 'boss',
    roleLabel: 'BOSS • HEBBAL FLYOVER KINGS',
    zone: 'north',
    accentColor: '#00E5C3',
    voicePitch: 0.88,
    voiceRate: 1.02,
    bio: {
      en: 'Controls the Bellary Road highway toll ambush crews and works directly under Kulkarni.',
      kn: 'ಬಳ್ಳಾರಿ ರಸ್ತೆ ಮತ್ತು ಹೆಬ್ಬಾಳ ಮೇಲ್ಸೇತುವೆಯ ಫ್ಲೈಓವರ್ ಕಿಂಗ್ಸ್ ನಾಯಕ.',
      hi: 'बेल्लारी रोड और हेब्बाल फ्लाईओवर पर कब्ज़ा जमाने वाला बॉस।'
    }
  },
  {
    id: 'boss_airport',
    name: 'Raza Siddiqui',
    alias: 'Skyline',
    role: 'boss',
    roleLabel: 'FINAL BOSS • DEVANAHALLI SKY CARTEL',
    zone: 'airport',
    accentColor: '#FF2E88',
    voicePitch: 0.74,
    voiceRate: 0.91,
    bio: {
      en: 'Apex contraband broker operating fictional night-cargo charters out of Devanahalli.',
      kn: 'ದೇವನಹಳ್ಳಿ ವಿಮಾನ ನಿಲ್ದಾಣದ ಸ್ಕೈ ಕಾರ್ಟೆಲ್ ಅಂತಿಮ ಬಾಸ್.',
      hi: 'देवनहल्ली एयरपोर्ट से स्काई कार्टेल चलाने वाला अंतिम बॉस।'
    }
  }
];

export function getCharacterById(id: string): StoryCharacterDef {
  return STORY_CHARACTERS.find((c) => c.id === id) || STORY_CHARACTERS[0];
}

let globalMissionSeq = 0;
function mkMission(
  chapterId: string,
  id: string,
  title: string,
  zone: ZoneId,
  locationName: string,
  lat: number,
  lon: number,
  type: 'combat' | 'chase' | 'heist' | 'boss',
  description: string,
  enemyWave: Array<'grunt' | 'shooter' | 'brute' | 'boss'>,
  rewardCash: number,
  rewardRespect: number,
  briefing: LocalizedText,
  extra: Partial<ChapterMissionDef> = {}
): ChapterMissionDef {
  return {
    chapterId,
    id,
    index: ++globalMissionSeq,
    title,
    zone,
    locationName,
    lat,
    lon,
    type,
    description,
    enemyWave,
    rewardCash,
    rewardRespect,
    briefingEn: briefing.en,
    briefingKn: briefing.kn,
    briefingHi: briefing.hi,
    ...extra
  };
}

/**
 * 8-Chapter Campaign (1 per Bengaluru Zone, 3–4 missions each = 26 handcrafted missions,
 * skippable camera cutscenes, moral choices, and a zone boss in every chapter).
 */
export const CAMPAIGN_CHAPTERS: CampaignChapterDef[] = [
  // ================= CHAPTER 1: CENTRAL =================
  {
    id: 'ch1_central',
    number: 1,
    zone: 'central',
    title: 'Chapter 1: Spark on MG Road',
    titleKn: 'ಅಧ್ಯಾಯ ೧: ಎಂ.ಜಿ. ರಸ್ತೆಯ ಕಿಡಿ',
    bossId: 'boss_central',
    summary: {
      en: 'Raghav Anna and Devi help you reclaim Church Street & MG Road from Vikram "Silk" Hegde and the Cantonment Syndicate.',
      kn: 'ರಾಘವ್ ಅಣ್ಣ ಮತ್ತು ದೇವಿ ಜೊತೆ ಚರ್ಚ್ ಸ್ಟ್ರೀಟ್ ಮತ್ತು ಎಂ.ಜಿ. ರಸ್ತೆಯನ್ನು ಕಂಟೋನ್ಮೆಂಟ್ ಸಿಂಡಿಕೇಟ್‌ನಿಂದ ಮುಕ್ತಗೊಳಿಸಿ.',
      hi: 'राघव अन्ना और देवी के साथ चर्च स्ट्रीट और एम.जी. रोड को कैंटोनमेंट सिंडिकेट से आज़ाद कराएं।'
    },
    introCutscene: {
      id: 'cut_ch1',
      title: 'CHAPTER 1 • CENTRAL BENGALURU',
      subtitle: 'SPARK ON MG ROAD',
      shots: [
        {
          lat: 12.9756, lon: 77.6032,
          camOffset: [42, 24, 48], lookOffset: [0, 4, 0], duration: 3.4, speakerId: 'raghav_anna',
          caption: {
            en: 'Raghav Anna: "MG Road used to belong to honest merchants. Now Silk Hegde taxes every darshini from Cubbon Park to Ulsoor."',
            kn: 'ರಾಘವ್ ಅಣ್ಣ: "ಎಂ.ಜಿ. ರಸ್ತೆ ಮೊದಲು ಪ್ರಾಮಾಣಿಕ ವ್ಯಾಪಾರಿಗಳದ್ದಾಗಿತ್ತು. ಈಗ ಸಿಲ್ಕ್ ಹೆಗ್ಡೆ ಎಲ್ಲರಿಂದ ಹಣ ವಸೂಲಿ ಮಾಡುತ್ತಿದ್ದಾನೆ."',
            hi: 'राघव अन्ना: "एम.जी. रोड कभी ईमानदार दुकानदारों का था। अब सिल्क हेगड़े हर किसी से वसूली करता है।"'
          }
        },
        {
          lat: 12.9796, lon: 77.5907,
          camOffset: [-55, 32, 65], lookOffset: [0, 10, 0], duration: 3.2, speakerId: 'devi_nair',
          caption: {
            en: 'Devi: "Keep your piece tucked in your pocket until you lock eyes on Silk’s crew. Ready to shake Central awake?"',
            kn: 'ದೇವಿ: "ನಿಮ್ಮ ಗನ್ ಜೇಬಿನಲ್ಲಿ ಇರಲಿ, ಶತ್ರು ಕಂಡ ತಕ್ಷಣ ತೆಗೆಯಿರಿ. ಕೇಂದ್ರ ಬೆಂಗಳೂರನ್ನು ಗೆಲ್ಲೋಣ!"',
            hi: 'देवी: "अपनी गन जेब में रखो और दुश्मन दिखते ही निकाल लो। चलो सेंट्रल बेंगलुरु हिला देते हैं!"'
          }
        }
      ]
    },
    dialogue: {
      id: 'dlg_ch1',
      chapterId: 'ch1_central',
      title: 'Church Street Loft — First Move',
      lines: [
        {
          speakerId: 'raghav_anna',
          text: {
            en: 'Silk Hegde seized three Church Street cafes tonight. Commissioner Kulkarni is looking the other way for a cut.',
            kn: 'ಸಿಲ್ಕ್ ಹೆಗ್ಡೆ ಇಂದು ರಾತ್ರಿ ಚರ್ಚ್ ಸ್ಟ್ರೀಟ್ ಕೆಫೆಗಳನ್ನು ವಶಪಡಿಸಿಕೊಂಡಿದ್ದಾನೆ. ಕುಲಕರ್ಣಿ ಕಣ್ಣು ಮುಚ್ಚಿಕೊಂಡಿದ್ದಾನೆ.',
            hi: 'सिल्क हेगड़े ने चर्च स्ट्रीट के तीन कैफ़े कब्ज़ा लिए हैं और कुलकर्णी चुपचाप हिस्सा ले रहा है।'
          }
        },
        {
          speakerId: 'devi_nair',
          text: {
            en: 'We can either return the extortion cash to the shopkeepers to earn street loyalty—or keep the cut to buy heavier firepower fast.',
            kn: 'ನಾವು ವಸೂಲಿ ಹಣವನ್ನು ಅಂಗಡಿಯವರಿಗೆ ಹಿಂದಿರುಗಿಸಿ ನಿಷ್ಠೆ ಗಳಿಸಬಹುದು, ಅಥವಾ ನಾವೇ ಇಟ್ಟುಕೊಂಡು ಶಕ್ತಿ ಹೆಚ್ಚಿಸಿಕೊಳ್ಳಬಹುದು.',
            hi: 'हम वसूली का पैसा दुकानदारों को लौटाकर वफ़ादारी जीत सकते हैं—या खुद रखकर तेज़ी से ताकत बढ़ा सकते हैं।'
          }
        }
      ],
      choices: [
        {
          id: 'ch1_loyalty',
          alignment: 'loyalty',
          deltaLoyalty: 20,
          deltaPower: 0,
          deltaRespect: 150,
          setsFlag: 'protected_church_st',
          label: {
            en: 'Return the seized cash to MG Road shopkeepers (+Loyalty, +Respect)',
            kn: 'ಅಂಗಡಿಯವರಿಗೆ ಹಣ ಹಿಂದಿರುಗಿಸಿ (+ನಿಷ್ಠೆ, +ಗೌರವ)',
            hi: 'दुकानदारों का पैसा वापस करो (+वफ़ादारी, +सम्मान)'
          },
          replySpeakerId: 'raghav_anna',
          reply: {
            en: 'Good heart. When trouble comes, every street vendor on MG Road will watch your back.',
            kn: 'ಒಳ್ಳೆಯ ನಿರ್ಧಾರ. ಕಷ್ಟ ಬಂದಾಗ ಎಂ.ಜಿ. ರಸ್ತೆಯ ಪ್ರತಿಯೊಬ್ಬರೂ ನಿನ್ನ ಬೆನ್ನಿಗೆ ನಿಲ್ಲುತ್ತಾರೆ.',
            hi: 'शाबाश! मुसीबत आने पर एम.जी. रोड का हर दुकानदार तुम्हारे साथ खड़ा होगा।'
          }
        },
        {
          id: 'ch1_power',
          alignment: 'power',
          deltaLoyalty: 0,
          deltaPower: 20,
          deltaCash: 1500,
          setsFlag: 'kept_syndicate_cut',
          label: {
            en: 'Keep Silk’s vault cash for our own war chest (+Power, +₹1,500)',
            kn: 'ಸಿಲ್ಕ್ ಹಣವನ್ನು ನಮ್ಮ ಬಲವರ್ಧನೆಗೆ ಇಟ್ಟುಕೊಳ್ಳಿ (+ಶಕ್ತಿ, +₹1,500)',
            hi: 'सिल्क का पैसा अपने वॉर-चेस्ट में रखो (+ताकत, +₹1,500)'
          },
          replySpeakerId: 'devi_nair',
          reply: {
            en: 'Cold and sharp. That ₹1,500 buys extra ammo—just don’t let Anna catch you sounding like Silk.',
            kn: 'ಚುರುಕಾದ ನಡೆ. ಈ ಹಣದಿಂದ ಹೆಚ್ಚು ಶಸ್ತ್ರಾಸ್ತ್ರ ಸಿಗುತ್ತದೆ.',
            hi: 'तेज़ चाल! इससे ज़्यादा हथियार मिलेंगे—बस अन्ना की सीख मत भूलना।'
          }
        }
      ]
    },
    missions: [
      mkMission('ch1_central', 'c1_m1', 'Church Street Shakedown', 'central', 'MG Road & Cubbon Edge', 12.9762, 77.6012, 'combat',
        'Clear Cantonment Syndicate gunmen extorting shops along Church Street.', ['grunt', 'grunt', 'shooter'], 1500, 140,
        { en: 'Devi: "Silk’s lookouts are armed near Cubbon Park edge. Draw your gun and clear them out!"', kn: 'ದೇವಿ: "ಕಬ್ಬನ್ ಪಾರ್ಕ್ ಹತ್ತಿರ ಸಿಲ್ಕ್ ಗ್ಯಾಂಗ್ ಇದೆ. ಅವರನ್ನು ಹಿಮ್ಮೆಟ್ಟಿಸಿ!"', hi: 'देवी: "कब्बन पार्क के पास सिल्क के गुंडे हैं। गन निकालो और इलाका साफ करो!"' }),
      mkMission('ch1_central', 'c1_m2', 'Ulsoor Ledger Interception', 'central', 'Ulsoor Lake Promenade', 12.9810, 77.6175, 'combat',
        'Ambush Syndicate couriers moving tribute ledgers beside Ulsoor Lake.', ['grunt', 'shooter', 'shooter'], 2000, 180,
        { en: 'Filter Chotu: "Silk’s runners carry the whole Central ledger by Ulsoor Lake, macha!"', kn: 'ಚೋಟು: "ಹಲಸೂರು ಕೆರೆ ಹತ್ತಿರ ಸಿಲ್ಕ್ ಲೆಡ್ಜರ್ ಹೋಗುತ್ತಿದೆ!"', hi: 'छोटू: "हलासुरु झील के पास सिल्क के कुरियर लेजर लेकर जा रहे हैं!"' }),
      mkMission('ch1_central', 'c1_m3_boss', 'Boss: Silk Hegde at Brigade Road', 'central', 'Brigade Road Plaza', 12.9742, 77.6072, 'boss',
        'Defeat Vikram "Silk" Hegde and his armored guards to claim Central Bengaluru!', ['shooter', 'shooter', 'brute', 'boss'], 3500, 320,
        { en: 'Silk Hegde: "An upstart from Church Street challenging Cantonment Syndicate? Draw your iron!"', kn: 'ಸಿಲ್ಕ್ ಹೆಗ್ಡೆ: "ನನ್ನ ಎದುರು ನಿಲ್ಲುವ ಧೈರ್ಯವೇ? ಬನ್ನಿ ನೋಡೋಣ!"', hi: 'सिल्क हेगड़े: "चर्च स्ट्रीट का नया लड़का मुझसे टकराएगा? आओ मैदान में!"' },
        { isBossMission: true, bossName: 'Vikram "Silk" Hegde' })
    ]
  },

  // ================= CHAPTER 2: OLD CITY =================
  {
    id: 'ch2_old_city',
    number: 2,
    zone: 'old_city',
    title: 'Chapter 2: Cobras of Pettah',
    titleKn: 'ಅಧ್ಯಾಯ ೨: ಪೇಟೆಯ ಕೋಬ್ರಾಗಳು',
    bossId: 'boss_old_city',
    summary: {
      en: 'Follow Filter Chotu’s leads through Majestic, KR Market, and Lalbagh to dethrone Surya "Cobra" Gowda.',
      kn: 'ಮೆಜೆಸ್ಟಿಕ್, ಕೆ.ಆರ್. ಮಾರುಕಟ್ಟೆ ಮತ್ತು ಲಾಲ್‌ಬಾಗ್‌ನಲ್ಲಿ ಪೇಟೆ ಕೋಬ್ರಾ ಗ್ಯಾಂಗ್ ಅನ್ನು ಮಣಿಸಿ.',
      hi: 'मैजेस्टिक, के.आर. मार्केट और लालबाग में पेट्टा कोब्राज़ के बॉस सूर्या गौड़ा को चुनौती दें।'
    },
    introCutscene: {
      id: 'cut_ch2',
      title: 'CHAPTER 2 • OLD CITY / HEART',
      subtitle: 'COBRAS OF PETTAH',
      shots: [
        {
          lat: 12.9774, lon: 77.5713, camOffset: [46, 26, 44], lookOffset: [0, 5, 0], duration: 3.3, speakerId: 'chotu_mahesh',
          caption: {
            en: 'Filter Chotu: "Welcome to Majestic & KR Market, boss! Surya Cobra runs every alley here—remember Bull Temple is a Sacred Safe Zone!"',
            kn: 'ಚೋಟು: "ಮೆಜೆಸ್ಟಿಕ್ ಮತ್ತು ಕೆ.ಆರ್. ಮಾರುಕಟ್ಟೆಗೆ ಸ್ವಾಗತ! ಸೂರ್ಯ ಕೋಬ್ರಾ ಇಲ್ಲಿ ಆಳುತ್ತಿದ್ದಾನೆ."',
            hi: 'छोटू: "मैजेस्टिक और के.आर. मार्केट में स्वागत है! यहां सूर्या कोब्रा का राज है।"'
          }
        }
      ]
    },
    dialogue: {
      id: 'dlg_ch2',
      chapterId: 'ch2_old_city',
      title: 'KR Market Chai Stall — Chotu’s Tip',
      lines: [
        {
          speakerId: 'chotu_mahesh',
          text: {
            en: 'Surya Cobra locked down Majestic Bay 4 and plans to torch a Chickpet silk guild unless they double his tribute.',
            kn: 'ಸೂರ್ಯ ಕೋಬ್ರಾ ಮೆಜೆಸ್ಟಿಕ್ ಬೇ 4 ಮುಚ್ಚಿ ಚಿಕ್ಕಪೇಟೆ ವ್ಯಾಪಾರಿಗಳಿಗೆ ಬೆದರಿಕೆ ಹಾಕಿದ್ದಾನೆ.',
            hi: 'सूर्या कोब्रा ने मैजेस्टिक बे 4 बंद कर दिया है और चिकपेट के व्यापारियों को धमका रहा है।'
          }
        },
        {
          speakerId: 'comm_kulkarni',
          text: {
            en: '(Encrypted Call) Kulkarni: "Let Cobra burn one warehouse and I’ll hand you his Majestic transport permits for ₹2,000 bonus."',
            kn: 'ಕುಲಕರ್ಣಿ: "ಕೋಬ್ರಾ ಗೋದಾಮಿಗೆ ಬೆಂಕಿ ಹಚ್ಚಲು ಬಿಟ್ಟರೆ ನಿಮಗೆ ಮೆಜೆಸ್ಟಿಕ್ ಪರ್ಮಿಟ್ ಮತ್ತು ₹2,000 ಸಿಗುತ್ತದೆ."',
            hi: 'कुलकर्णी: "कोब्रा को गोदाम जलाने दो, मैं तुम्हें मैजेस्टिक के परमिट और ₹2,000 दिला दूंगा।"'
          }
        }
      ],
      choices: [
        {
          id: 'ch2_loyalty', alignment: 'loyalty', deltaLoyalty: 20, deltaPower: 0, deltaRespect: 180, setsFlag: 'saved_chickpet_guild',
          label: { en: 'Refuse Kulkarni — rescue the Chickpet silk weavers (+Loyalty)', kn: 'ಕುಲಕರ್ಣಿ ಆಫರ್ ತಿರಸ್ಕರಿಸಿ ಚಿಕ್ಕಪೇಟೆ ವ್ಯಾಪಾರಿಗಳನ್ನು ರಕ್ಷಿಸಿ (+ನಿಷ್ಠೆ)', hi: 'कुलकर्णी को मना करो — चिकपेट के व्यापारियों को बचाओ (+वफ़ादारी)' },
          replySpeakerId: 'chotu_mahesh',
          reply: { en: 'Now THAT is a true Bengaluru boss! I’ll guide you straight to Cobra’s Lalbagh hideout.', kn: 'ಅದೇ ನಿಜವಾದ ನಾಯಕತ್ವ! ಕೋಬ್ರಾ ಅಡಗುತಾಣದ ದಾರಿ ನಾನು ತೋರಿಸುತ್ತೇನೆ.', hi: 'यही असली लीडर की पहचान है! मैं तुम्हें कोब्रा के लालबाग अड्डे तक ले जाऊंगा।' }
        },
        {
          id: 'ch2_power', alignment: 'power', deltaLoyalty: 0, deltaPower: 20, deltaCash: 2000, setsFlag: 'kulkarni_deal_1',
          label: { en: 'Take Kulkarni’s permit deal & ₹2,000 bribe (+Power, +₹2,000)', kn: 'ಕುಲಕರ್ಣಿ ಒಪ್ಪಂದ ಮತ್ತು ₹2,000 ಸ್ವೀಕರಿಸಿ (+ಶಕ್ತಿ, +₹2,000)', hi: 'कुलकर्णी की डील और ₹2,000 लो (+ताकत, +₹2,000)' },
          replySpeakerId: 'comm_kulkarni',
          reply: { en: 'Smart. Power belongs to those who know how the city really turns.', kn: 'ಜಾಣ ನಿರ್ಧಾರ. ನಗರದ ಅಧಿಕಾರ ನಿನ್ನ ಕೈಗೆ ಬರುತ್ತಿದೆ.', hi: 'समझदार हो। शहर पर राज वही करता है जो सिस्टम को समझे।' }
        }
      ]
    },
    missions: [
      mkMission('ch2_old_city', 'c2_m1', 'Majestic Terminal Ambush', 'old_city', 'Majestic Bus & Rail Hub', 12.9768, 77.5720, 'combat',
        'Break the Pettah Cobras blockade at Majestic Bus & Rail Hub.', ['grunt', 'shooter', 'shooter', 'brute'], 2400, 210,
        { en: 'Chotu: "Pettah Cobras locked down Majestic Bay 4 — watch the crossfire!"', kn: 'ಚೋಟು: "ಮೆಜೆಸ್ಟಿಕ್ ಬೇ 4ರಲ್ಲಿ ಪೇಟೆ ಕೋಬ್ರಾಗಳು ಸುತ್ತುವರಿದಿದ್ದಾರೆ!"', hi: 'छोटू: "मैजेस्टिक में पेट्टा कोब्राज़ ने घेराबंदी कर ली है!"' }),
      mkMission('ch2_old_city', 'c2_m2', 'Chickpet Alley Counterstrike', 'old_city', 'KR Market & Chickpet', 12.9638, 77.5764, 'combat',
        'Flush Cobra gunmen out of the crowded KR Market lanes.', ['grunt', 'grunt', 'shooter', 'shooter'], 2700, 240,
        { en: 'Devi: "Keep combat away from sacred temples & mosques—pull them into the main market road!"', kn: 'ದೇವಿ: "ಪವಿತ್ರ ಸ್ಥಳಗಳಿಂದ ದೂರವಿದ್ದು ಮುಖ್ಯ ರಸ್ತೆಯಲ್ಲಿ ಹೋರಾಡಿ!"', hi: 'देवी: "पवित्र स्थलों से दूर रहकर मेन मार्केट रोड पर मुकाबला करो!"' }),
      mkMission('ch2_old_city', 'c2_m3_boss', 'Boss: Surya Cobra at Lalbagh', 'old_city', 'Lalbagh Glasshouse Edge', 12.9507, 77.5844, 'boss',
        'Defeat Surya "Cobra" Gowda in a misty showdown outside Lalbagh Glasshouse.', ['shooter', 'shooter', 'brute', 'boss'], 4200, 380,
        { en: 'Surya Cobra: "Old City has swallowed stronger crews than yours!"', kn: 'ಸೂರ್ಯ ಕೋಬ್ರಾ: "ಹಳೆಯ ಬೆಂಗಳೂರು ನಿನ್ನಂಥ ಹಲವರನ್ನು ನುಂಗಿದೆ!"', hi: 'सूर्या कोब्रा: "ओल्ड सिटी ने तुमसे बड़े खिलाड़ियों को मिट्टी में मिलाया है!"' },
        { isBossMission: true, bossName: 'Surya "Cobra" Gowda' })
    ]
  },

  // ================= CHAPTER 3: EAST / TECH CORRIDOR =================
  {
    id: 'ch3_east',
    number: 3,
    zone: 'east',
    title: 'Chapter 3: Neon Over 100ft Road',
    titleKn: 'ಅಧ್ಯಾಯ ೩: ೧೦೦ ಅಡಿ ರಸ್ತೆಯ ನಿಯಾನ್',
    bossId: 'boss_east',
    summary: {
      en: 'Infiltrate Indiranagar’s neon nightlife and Bellandur mist to take down Rhea "Neon" Menon and the 100ft Neon Vipers.',
      kn: 'ಇಂದಿರಾನಗರ ಮತ್ತು ಬೆಳ್ಳಂದೂರಿನ ನಿಯಾನ್ ವೈಪರ್ಸ್ ನಾಯಕಿ ರಿಯಾ ಮೆನನ್ ವಿರುದ್ಧ ಹೋರಾಡಿ.',
      hi: 'इंदिरानगर 100 फीट रोड और बेलंदूर में नियॉन वाइपर्स की बॉस रिया मेनन को मात दें।'
    },
    introCutscene: {
      id: 'cut_ch3',
      title: 'CHAPTER 3 • EAST / TECH CORRIDOR',
      subtitle: 'NEON OVER 100FT ROAD',
      shots: [
        {
          lat: 12.9784, lon: 77.6408, camOffset: [42, 22, 46], lookOffset: [0, 5, 0], duration: 3.3, speakerId: 'devi_nair',
          caption: {
            en: 'Devi: "100 Feet Road Indiranagar — Rhea Menon’s Neon Vipers run the clubs, street racers, and Whitefield freight."',
            kn: 'ದೇವಿ: "ಇಂದಿರಾನಗರ ೧೦೦ ಅಡಿ ರಸ್ತೆ — ಇಲ್ಲಿ ರಿಯಾ ಮೆನನ್ ನಿಯಾನ್ ವೈಪರ್ಸ್ ಆಳ್ವಿಕೆ!"',
            hi: 'देवी: "इंदिरानगर 100 फीट रोड — यहां रिया मेनन के नियॉन वाइपर्स का दबदबा है!"'
          }
        }
      ]
    },
    dialogue: {
      id: 'dlg_ch3',
      chapterId: 'ch3_east',
      title: 'Indiranagar Rooftop Parley',
      lines: [
        {
          speakerId: 'boss_east',
          text: {
            en: 'Rhea Menon: "Why fight over Indiranagar when we can split East Bengaluru’s tech-corridor tolls 50/50—and cut Anna out?"',
            kn: 'ರಿಯಾ: "ಅಣ್ಣನನ್ನು ಬಿಟ್ಟು ನಾವಿಬ್ಬರು ಪೂರ್ವ ಬೆಂಗಳೂರನ್ನು ಹಂಚಿಕೊಳ್ಳೋಣವೇ?"',
            hi: 'रिया: "अन्ना को किनारे करो और मेरे साथ ईस्ट बेंगलुरु का आधा हिस्सा बांट लो?"'
          }
        }
      ],
      choices: [
        {
          id: 'ch3_loyalty', alignment: 'loyalty', deltaLoyalty: 20, deltaPower: 0, deltaRespect: 220, setsFlag: 'loyal_to_anna',
          label: { en: 'Never betray Raghav Anna — take the Vipers head-on (+Loyalty)', kn: 'ರಾಘವ್ ಅಣ್ಣನಿಗೆ ದ್ರೋಹ ಬಗೆಯುವುದಿಲ್ಲ — ಹೋರಾಡಿ (+ನಿಷ್ಠೆ)', hi: 'राघव अन्ना से गद्दारी नहीं — वाइपर्स से सीधा मुकाबला (+वफ़ादारी)' },
          replySpeakerId: 'raghav_anna',
          reply: { en: 'Blood and trust mean everything in this city. Ride Namma Metro to Indiranagar and finish this.', kn: 'ಈ ನಗರದಲ್ಲಿ ನಂಬಿಕೆಯೇ ದೊಡ್ಡ ಶಕ್ತಿ!', hi: 'इस शहर में भरोसा ही सबसे बड़ी ताकत है!' }
        },
        {
          id: 'ch3_power', alignment: 'power', deltaLoyalty: -5, deltaPower: 25, deltaCash: 2500, setsFlag: 'extorted_rhea',
          label: { en: 'Demand ₹2,500 tribute first, then seize her turf anyway (+Power, +₹2,500)', kn: '₹2,500 ಕಪ್ಪ ತೆಗೆದುಕೊಂಡು ನಂತರ ವಶಪಡಿಸಿಕೊಳ್ಳಿ (+ಶಕ್ತಿ, +₹2,500)', hi: 'पहले ₹2,500 वसूलो, फिर उसका इलाका भी छीन लो (+ताकत, +₹2,500)' },
          replySpeakerId: 'boss_east',
          reply: { en: 'Ruthless. I respect the nerve—now let’s see if you survive 100ft Road!', kn: 'ಕ್ರೂರ ನಿರ್ಧಾರ — ಈಗ ೧೦೦ ಅಡಿ ರಸ್ತೆಯಲ್ಲಿ ನೋಡೋಣ!', hi: 'बेरहम चाल — अब 100 फीट रोड पर मिलते हैं!' }
        }
      ]
    },
    missions: [
      mkMission('ch3_east', 'c3_m1', 'Domlur Relay Takedown', 'east', 'Domlur Flyover', 12.9612, 77.6388, 'combat',
        'Disrupt the Neon Vipers signal relay squad near Domlur.', ['grunt', 'shooter', 'shooter', 'shooter'], 3000, 260,
        { en: 'Devi: "Take out Rhea’s Domlur lookouts before they call ORR reinforcements!"', kn: 'ದೇವಿ: "ದೊಮ್ಮಲೂರಿನ ವೈಪರ್ಸ್ ಗಾರ್ಡ್‌ಗಳನ್ನು ತಡೆಯಿರಿ!"', hi: 'देवी: "डोमलूर के वाइपर्स गार्ड्स को बैकअप बुलाने से पहले रोक दो!"' }),
      mkMission('ch3_east', 'c3_m2', 'Bellandur Mist Ambush', 'east', 'Bellandur Lake Shore', 12.9365, 77.6740, 'heist',
        'Intercept armored Vipers crates hidden near foggy Bellandur Lake.', ['shooter', 'shooter', 'brute', 'brute'], 3600, 310,
        { en: 'Chotu: "Heavy guards by Bellandur Lake—grab a rifle or sniper!"', kn: 'ಚೋಟು: "ಬೆಳ್ಳಂದೂರು ಕೆರೆ ಹತ್ತಿರ ಭಾರೀ ಕಾವಲು ಇದೆ!"', hi: 'छोटू: "बेलंदूर झील के पास भारी गार्ड्स हैं—राइफल तैयार रखो!"' }),
      mkMission('ch3_east', 'c3_m3_boss', 'Boss: Rhea Neon on 100ft Road', 'east', '100 Feet Road Indiranagar', 12.9782, 77.6406, 'boss',
        'Defeat Rhea "Neon" Menon in a neon-lit street battle on Indiranagar 100 Feet Road.', ['shooter', 'shooter', 'brute', 'boss'], 5200, 440,
        { en: 'Rhea Menon: "East Bengaluru runs on speed and fire. Show me what you’ve got!"', kn: 'ರಿಯಾ: "ಪೂರ್ವ ಬೆಂಗಳೂರು ವೇಗ ಮತ್ತು ಬೆಂಕಿಯಿಂದ ನಡೆಯುತ್ತದೆ!"', hi: 'रिया: "ईस्ट बेंगलुरु रफ्तार से चलता है। दिखाओ अपना दम!"' },
        { isBossMission: true, bossName: 'Rhea "Neon" Menon' })
    ]
  },

  // ================= CHAPTER 4: SOUTH / SILK BOARD =================
  {
    id: 'ch4_south',
    number: 4,
    zone: 'south',
    title: 'Chapter 4: Silk Board Gridlock',
    titleKn: 'ಅಧ್ಯಾಯ ೪: ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಜಾಮ್',
    bossId: 'boss_south',
    summary: {
      en: 'Outmaneuver Babu "Gridlock" Shetty across Silk Board’s packed lanes and claim South Bengaluru.',
      kn: 'ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಮತ್ತು ಜಯನಗರದಲ್ಲಿ ಬಾಬು ಶೆಟ್ಟಿ ಗ್ಯಾಂಗ್ ಅನ್ನು ಮಣಿಸಿ ದಕ್ಷಿಣ ಬೆಂಗಳೂರು ಗೆಲ್ಲಿ.',
      hi: 'सिल्क बोर्ड और जयनगर में बाबू शेट्टी के ग्रिडलॉक गैंग को पछाड़ें।'
    },
    introCutscene: {
      id: 'cut_ch4',
      title: 'CHAPTER 4 • SOUTH / SILK BOARD',
      subtitle: 'SILK BOARD GRIDLOCK',
      shots: [
        {
          lat: 12.9177, lon: 77.6238, camOffset: [50, 28, 52], lookOffset: [0, 4, 0], duration: 3.3, speakerId: 'boss_south',
          caption: {
            en: 'Babu Gridlock: "Nobody crosses Silk Board without paying Silk Grid Runners. Even traffic obeys me here!"',
            kn: 'ಬಾಬು: "ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ದಾಟಬೇಕಾದರೆ ನನಗೆ ಕಪ್ಪ ಕಟ್ಟಲೇಬೇಕು!"',
            hi: 'बाबू: "सिल्क बोर्ड से बिना मेरी इजाज़त कोई नहीं निकल सकता!"'
          }
        }
      ]
    },
    dialogue: {
      id: 'dlg_ch4',
      chapterId: 'ch4_south',
      title: 'Jayanagar 4th Block — Strategy Call',
      lines: [
        {
          speakerId: 'devi_nair',
          text: {
            en: 'Babu staged fake roadblocks at Silk Board to trap commuters and hijack delivery trucks. How do we hit back?',
            kn: 'ಬಾಬು ಸಿಲ್ಕ್ ಬೋರ್ಡ್‌ನಲ್ಲಿ ನಕಲಿ ತಡೆ ಹಾಕಿ ವಾಹನಗಳನ್ನು ಲೂಟಿ ಮಾಡುತ್ತಿದ್ದಾನೆ. ಏನು ಮಾಡೋಣ?',
            hi: 'बाबू ने सिल्क बोर्ड पर नकली नाके लगाकर ट्रकों को लूटा है। हम कैसे जवाब दें?'
          }
        }
      ],
      choices: [
        {
          id: 'ch4_loyalty', alignment: 'loyalty', deltaLoyalty: 20, deltaPower: 0, deltaRespect: 250,
          label: { en: 'Clear the roadblocks cleanly & protect stranded autos (+Loyalty)', kn: 'ರಸ್ತೆ ತಡೆ ತೆರವುಗೊಳಿಸಿ ಪ್ರಯಾಣಿಕರನ್ನು ರಕ್ಷಿಸಿ (+ನಿಷ್ಠೆ)', hi: 'रास्ता साफ करो और फंसे ऑटो चालकों को बचाओ (+वफ़ादारी)' },
          replySpeakerId: 'devi_nair',
          reply: { en: 'Jayanagar’s auto union will tip us off every time Babu moves.', kn: 'ಜಯನಗರದ ಆಟೋ ಚಾಲಕರು ನಮಗೆ ಸಹಾಯ ಮಾಡುತ್ತಾರೆ!', hi: 'जयनगर के ऑटो वाले अब हमारे लिए आंख-कान बनेंगे!' }
        },
        {
          id: 'ch4_power', alignment: 'power', deltaLoyalty: 0, deltaPower: 20, deltaCash: 2800,
          label: { en: 'Hijack Babu’s own toll trucks for ₹2,800 (+Power, +₹2,800)', kn: 'ಬಾಬು ಟ್ರಕ್‌ಗಳನ್ನು ವಶಪಡಿಸಿಕೊಂಡು ₹2,800 ಗಳಿಸಿ (+ಶಕ್ತಿ, +₹2,800)', hi: 'बाबू के टोल ट्रक लूट लो और ₹2,800 कमाओ (+ताकत, +₹2,800)' },
          replySpeakerId: 'raghav_anna',
          reply: { en: 'Heavy cash, heavy heat. Make sure your brakes work in Silk Board traffic.', kn: 'ಹಣದ ಜೊತೆ ಅಪಾಯವೂ ಹೆಚ್ಚು. ಎಚ್ಚರ!', hi: 'पैसा बड़ा है तो खतरा भी बड़ा है। सावधान रहना।' }
        }
      ]
    },
    missions: [
      mkMission('ch4_south', 'c4_m1', 'Silk Board Gridlock Escape', 'south', 'Silk Board Junction', 12.9178, 77.6232, 'chase',
        'Grab the 250cc bike at Silk Board and race through traffic to Jayanagar Safehouse!', ['grunt', 'shooter', 'shooter'], 3400, 300,
        { en: 'Devi: "Split lanes past the Silk Board jam and reach Jayanagar Safehouse!"', kn: 'ದೇವಿ: "ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಜಾಮ್ ದಾಟಿ ಜಯನಗರ ಸೇಫ್‌ಹೌಸ್ ತಲುಪಿ!"', hi: 'देवी: "सिल्क बोर्ड जाम से निकलकर जयनगर सेफहाउस पहुंचो!"' },
        { targetLat: 12.9278, targetLon: 77.5855, wantedTrigger: 110, spawnBike: true }),
      mkMission('ch4_south', 'c4_m2', 'BTM Stash Sweep', 'south', 'BTM Layout Main Road', 12.9165, 77.6102, 'combat',
        'Dismantle the Grid Runners lookout crew in BTM Layout.', ['grunt', 'shooter', 'shooter', 'brute'], 3800, 330,
        { en: 'Chotu: "Babu’s lieutenants are guarding fuel barrels in BTM!"', kn: 'ಚೋಟು: "ಬಿಟಿಎಂನಲ್ಲಿ ಬಾಬು ಗ್ಯಾಂಗ್ ಸಜ್ಜಾಗಿದೆ!"', hi: 'छोटू: "बीटीएम लेआउट में बाबू के गुंडे छुपे हैं!"' }),
      mkMission('ch4_south', 'c4_m3_boss', 'Boss: Babu Gridlock at Madiwala', 'south', 'Madiwala Junction', 12.9218, 77.6175, 'boss',
        'Defeat Babu "Gridlock" Shetty and claim South Bengaluru.', ['shooter', 'shooter', 'brute', 'boss'], 5600, 480,
        { en: 'Babu Gridlock: "You broke my blockade? Let’s see you survive my shotgun squad!"', kn: 'ಬಾಬು: "ನನ್ನ ತಡೆಯನ್ನು ಮುರಿದಿದ್ದೀಯಾ? ಈಗ ನನ್ನ ಎದುರು ನಿಲ್ಲು!"', hi: 'बाबू: "मेरा नाका तोड़ा? अब मेरी टीम का सामना करो!"' },
        { isBossMission: true, bossName: 'Babu "Gridlock" Shetty' })
    ]
  },

  // ================= CHAPTER 5: ELECTRONIC CITY =================
  {
    id: 'ch5_ecity',
    number: 5,
    zone: 'southeast',
    title: 'Chapter 5: Silicon Ledger',
    titleKn: 'ಅಧ್ಯಾಯ ೫: ಸಿಲಿಕಾನ್ ಲೆಡ್ಜರ್',
    bossId: 'boss_ecity',
    summary: {
      en: 'Raid Electronic City Phase 1 to expose Dr. Arvind "Cipher" Deshpande’s black-ledger server farm.',
      kn: 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ ಹಂತ ೧ರಲ್ಲಿ ಸಿಲಿಕಾನ್ ಸಿಂಡಿಕೇಟ್ ಸರ್ವರ್ ರಹಸ್ಯ ಭೇದಿಸಿ.',
      hi: 'इलेक्ट्रॉनिक सिटी फेज़ 1 में डॉ. अरविंद "साइफर" देशपांडे का सर्वर नेटवर्क ध्वस्त करें।'
    },
    introCutscene: {
      id: 'cut_ch5',
      title: 'CHAPTER 5 • ELECTRONIC CITY',
      subtitle: 'SILICON LEDGER',
      shots: [
        {
          lat: 12.8456, lon: 77.6632, camOffset: [48, 30, 50], lookOffset: [0, 8, 0], duration: 3.3, speakerId: 'boss_ecity',
          caption: {
            en: 'Dr. Cipher: "Every rupee laundered in Garden City passes through Electronic City Phase 1. Step into my glass fortress."',
            kn: 'ಸೈಫರ್: "ನಗರದ ಪ್ರತಿಯೊಂದು ರಹಸ್ಯ ವ್ಯವಹಾರವೂ ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿಯ ಮೂಲಕವೇ ನಡೆಯುತ್ತದೆ."',
            hi: 'साइफर: "शहर का हर काला लेजर इलेक्ट्रॉनिक सिटी फेज़ 1 से होकर गुजरता है।"'
          }
        }
      ]
    },
    dialogue: {
      id: 'dlg_ch5',
      chapterId: 'ch5_ecity',
      title: 'Hosur Expressway — The Black Ledger',
      lines: [
        {
          speakerId: 'devi_nair',
          text: {
            en: 'Cipher’s server has proof of Commissioner Kulkarni’s bribes AND the account keys to ₹100 crore of syndicate money.',
            kn: 'ಸೈಫರ್ ಸರ್ವರ್‌ನಲ್ಲಿ ಕುಲಕರ್ಣಿ ಭ್ರಷ್ಟಾಚಾರದ ಸಾಕ್ಷ್ಯ ಮತ್ತು ಸಿಂಡಿಕೇಟ್ ಹಣದ ಕೀಲಿಗಳಿವೆ.',
            hi: 'साइफर के सर्वर में कुलकर्णी के घूस के सबूत और सिंडिकेट के खातों की चाबियां दोनों हैं।'
          }
        }
      ],
      choices: [
        {
          id: 'ch5_loyalty', alignment: 'loyalty', deltaLoyalty: 25, deltaPower: 0, deltaRespect: 320, setsFlag: 'leaked_kulkarni_files',
          label: { en: 'Copy the evidence to expose Kulkarni & free Bengaluru (+Loyalty)', kn: 'ಸಾಕ್ಷ್ಯ ಕಾಪಿ ಮಾಡಿ ಭ್ರಷ್ಟಾಚಾರ ಬಯಲು ಮಾಡಿ (+ನಿಷ್ಠೆ)', hi: 'सबूत कॉपी करो ताकि कुलकर्णी को बेनकाब किया जा सके (+वफ़ादारी)' },
          replySpeakerId: 'raghav_anna',
          reply: { en: 'With those files, we can break Kulkarni’s stranglehold for good.', kn: 'ಈ ದಾಖಲೆಗಳಿಂದ ಕುಲಕರ್ಣಿಯ ಆಟ ಮುಗಿಯುತ್ತದೆ.', hi: 'इन फाइलों से कुलकर्णी का खेल हमेशा के लिए खत्म हो जाएगा।' }
        },
        {
          id: 'ch5_power', alignment: 'power', deltaLoyalty: 0, deltaPower: 25, deltaCash: 4000, setsFlag: 'blackmailed_kulkarni',
          label: { en: 'Keep the files to blackmail Kulkarni & siphon ₹4,000 (+Power, +₹4,000)', kn: 'ದಾಖಲೆಗಳಿಂದ ಕುಲಕರ್ಣಿಯನ್ನು ನಿಯಂತ್ರಿಸಿ ₹4,000 ಗಳಿಸಿ (+ಶಕ್ತಿ, +₹4,000)', hi: 'फाइलों से कुलकर्णी को काबू करो और ₹4,000 निकालो (+ताकत, +₹4,000)' },
          replySpeakerId: 'comm_kulkarni',
          reply: { en: 'You play chess while others play street brawls. We should talk before the finale.', kn: 'ನೀನು ಚದುರಂಗ ಆಡುತ್ತಿದ್ದೀಯ. ಅಂತಿಮ ಹಂತದಲ್ಲಿ ಭೇಟಿಯಾಗೋಣ.', hi: 'तुम शतरंज खेल रहे हो। अंत से पहले हमारी मुलाकात तय है।' }
        }
      ]
    },
    missions: [
      mkMission('ch5_ecity', 'c5_m1', 'Expressway Toll Breach', 'southeast', 'Hosur Road Electronic City Entry', 12.8510, 77.6615, 'combat',
        'Clear Silicon Syndicate tactical guards blocking the Phase 1 entry.', ['shooter', 'shooter', 'shooter', 'brute'], 4200, 380,
        { en: 'Devi: "Use cover and silenced shots if you want to drop their outer guards cleanly!"', kn: 'ದೇವಿ: "ಕವರ್ ಬಳಸಿ ಹಂತ ೧ ರ ಕಾವಲುಗಾರರನ್ನು ಸೋಲಿಸಿ!"', hi: 'देवी: "कवर लेकर फेज़ 1 के बाहरी गार्ड्स को साफ करो!"' }),
      mkMission('ch5_ecity', 'c5_m2', 'Phase 1 Data Vault Heist', 'southeast', 'Electronic City Tech Plaza', 12.8458, 77.6634, 'heist',
        'Secure the server courtyard while Devi downloads Cipher’s ledger.', ['shooter', 'shooter', 'brute', 'shooter'], 5000, 440,
        { en: 'Devi: "Hold the courtyard — upload is running at 80%!"', kn: 'ದೇವಿ: "ಸರ್ವರ್ ಡೌನ್‌ಲೋಡ್ ನಡೆಯುತ್ತಿದೆ, ಕಾವಲುಗಾರರನ್ನು ತಡೆಯಿರಿ!"', hi: 'देवी: "डाउनलोड चल रहा है—कोर्टयार्ड को संभाले रखो!"' },
        { wantedTrigger: 90 }),
      mkMission('ch5_ecity', 'c5_m3_boss', 'Boss: Dr. Cipher at Silicon Tower', 'southeast', 'Electronic City Phase 1 Core', 12.8442, 77.6670, 'boss',
        'Defeat Dr. Arvind "Cipher" Deshpande and his armored security boss detail.', ['shooter', 'shooter', 'brute', 'boss'], 6800, 560,
        { en: 'Dr. Cipher: "Logic favors the better armed—and my guards carry heavy rifles!"', kn: 'ಸೈಫರ್: "ನನ್ನ ಭದ್ರತಾ ಪಡೆಯನ್ನು ದಾಟಲು ಸಾಧ್ಯವಿಲ್ಲ!"', hi: 'साइफर: "मेरे सिक्योरिटी स्क्वाड के सामने तुम्हारी एक नहीं चलेगी!"' },
        { isBossMission: true, bossName: 'Dr. Arvind "Cipher" Deshpande' })
    ]
  },

  // ================= CHAPTER 6: WEST / PEENYA =================
  {
    id: 'ch6_west',
    number: 6,
    zone: 'west',
    title: 'Chapter 6: Iron of Peenya',
    titleKn: 'ಅಧ್ಯಾಯ ೬: ಪೀಣ್ಯದ ಕಬ್ಬಿಣ',
    bossId: 'boss_west',
    summary: {
      en: 'Storm Peenya’s factory blocks and Yeshwanthpur rail yard to crush Loha "Anvil" Reddy and the Iron Wolves.',
      kn: 'ಪೀಣ್ಯ ಕೈಗಾರಿಕಾ ಪ್ರದೇಶ ಮತ್ತು ಯಶವಂತಪುರದಲ್ಲಿ ಲೋಹಾ ರೆಡ್ಡಿ ಗ್ಯಾಂಗ್ ಅನ್ನು ಸೋಲಿಸಿ.',
      hi: 'पीन्या इंडस्ट्रियल एरिया और यशवंतपुर में लोहा "एनविल" रेड्डी के आयरन वुल्व्स को हराएं।'
    },
    introCutscene: {
      id: 'cut_ch6',
      title: 'CHAPTER 6 • WEST / PEENYA INDUSTRIAL',
      subtitle: 'IRON OF PEENYA',
      shots: [
        {
          lat: 13.0285, lon: 77.5260, camOffset: [52, 26, 48], lookOffset: [0, 5, 0], duration: 3.3, speakerId: 'boss_west',
          caption: {
            en: 'Loha Reddy: "Peenya forges steel and weapons for every crew in Bengaluru. Come take it if your hands don’t shake!"',
            kn: 'ಲೋಹಾ ರೆಡ್ಡಿ: "ಪೀಣ್ಯದ ಉಕ್ಕಿನ ಕೋಟೆಗೆ ಬರುವ ಧೈರ್ಯ ಇದೆಯೇ?"',
            hi: 'लोहा रेड्डी: "पीन्या में लोहा और हथियार दोनों ढलते हैं—दम है तो आकर छीन लो!"'
          }
        }
      ]
    },
    dialogue: {
      id: 'dlg_ch6',
      chapterId: 'ch6_west',
      title: 'Yeshwanthpur Rail Yard — Heavy Arms',
      lines: [
        {
          speakerId: 'raghav_anna',
          text: {
            en: 'Loha Reddy is shipping heavy crates to the Airport Cartel. Destroying the crates starves their finale; seizing them arms us.',
            kn: 'ಲೋಹಾ ರೆಡ್ಡಿ ವಿಮಾನ ನಿಲ್ದಾಣದ ಕಾರ್ಟೆಲ್‌ಗೆ ಶಸ್ತ್ರಾಸ್ತ್ರ ಕಳುಹಿಸುತ್ತಿದ್ದಾನೆ.',
            hi: 'लोहा रेड्डी एयरपोर्ट कार्टेल को भारी हथियार भेज रहा है। उन्हें नष्ट करें या खुद कब्ज़ा लें?'
          }
        }
      ],
      choices: [
        {
          id: 'ch6_loyalty', alignment: 'loyalty', deltaLoyalty: 20, deltaPower: 0, deltaRespect: 350,
          label: { en: 'Destroy the weapon crates so they never hit Bengaluru streets (+Loyalty)', kn: 'ಶಸ್ತ್ರಾಸ್ತ್ರ ಪೆಟ್ಟಿಗೆಗಳನ್ನು ನಾಶಮಾಡಿ ನಗರವನ್ನು ರಕ್ಷಿಸಿ (+ನಿಷ್ಠೆ)', hi: 'हथियारों के क्रेट नष्ट करो ताकि सड़कों पर खून न बहे (+वफ़ादारी)' },
          replySpeakerId: 'raghav_anna',
          reply: { en: 'You remember why we started this fight. Now bring Loha down.', kn: 'ನಾವು ಈ ಹೋರಾಟ ಏಕೆ ಶುರು ಮಾಡಿದೆವು ಎಂದು ನಿನಗೆ ನೆನಪಿದೆ.', hi: 'तुम्हें याद है हमने यह लड़ाई क्यों शुरू की थी।' }
        },
        {
          id: 'ch6_power', alignment: 'power', deltaLoyalty: 0, deltaPower: 25, deltaCash: 4500,
          label: { en: 'Seize the foundry armory & sell surplus for ₹4,500 (+Power, +₹4,500)', kn: 'ಶಸ್ತ್ರಾಗಾರ ವಶಪಡಿಸಿಕೊಂಡು ₹4,500 ಗಳಿಸಿ (+ಶಕ್ತಿ, +₹4,500)', hi: 'आर्मरी पर कब्ज़ा करो और ₹4,500 कमाओ (+ताकत, +₹4,500)' },
          replySpeakerId: 'devi_nair',
          reply: { en: 'Our Armory is stocked for war—Peenya is ours once Loha falls.', kn: 'ನಮ್ಮ ಶಸ್ತ್ರಾಗಾರ ತುಂಬಿದೆ — ಈಗ ಲೋಹಾನ ಸರದಿ!', hi: 'अब हमारे पास पूरी ताकत है — लोहा का समय खत्म!' }
        }
      ]
    },
    missions: [
      mkMission('ch6_west', 'c6_m1', 'Yeshwanthpur Freight Raid', 'west', 'Yeshwanthpur Rail Yard', 13.0235, 77.5503, 'heist',
        'Intercept Iron Wolves enforcers loading contraband onto freight trucks.', ['grunt', 'shooter', 'brute', 'brute'], 4800, 420,
        { en: 'Chotu: "Armored brutes guarding the Yeshwanthpur rail yard — aim for headshots!"', kn: 'ಚೋಟು: "ಯಶವಂತಪುರ ರೈಲು ಯಾರ್ಡ್‌ನಲ್ಲಿ ಭಾರೀ ಕಾವಲುಗಾರರು ಇದ್ದಾರೆ!"', hi: 'छोटू: "यशवंतपुर रेल यार्ड में भारी गार्ड्स हैं—हेडशॉट लो!"' }),
      mkMission('ch6_west', 'c6_m2', 'Peenya Sector 3 Stash', 'west', 'Peenya Industrial Area', 13.0282, 77.5265, 'combat',
        'Breach the Peenya Sector 3 foundry perimeter.', ['shooter', 'shooter', 'brute', 'shooter'], 5400, 470,
        { en: 'Devi: "Grab the Grenade Launcher or Heavy LMG if you unlocked them—they’re dug in!"', kn: 'ದೇವಿ: "ಪೀಣ್ಯ ಸೆಕ್ಟರ್ ೩ ರಲ್ಲಿ ಶತ್ರುಗಳು ಸಜ್ಜಾಗಿದ್ದಾರೆ!"', hi: 'देवी: "पीन्या सेक्टर 3 में दुश्मन पूरी तैयारी से बैठे हैं!"' }),
      mkMission('ch6_west', 'c6_m3_boss', 'Boss: Loha Anvil at Peenya Foundry', 'west', 'Peenya Foundry Yards', 13.0298, 77.5240, 'boss',
        'Defeat Loha "Anvil" Reddy and claim West Bengaluru!', ['shooter', 'brute', 'brute', 'boss'], 7200, 620,
        { en: 'Loha Reddy: "Let’s test your steel against Peenya’s finest!"', kn: 'ಲೋಹಾ ರೆಡ್ಡಿ: "ಪೀಣ್ಯದ ಉಕ್ಕಿನ ಶಕ್ತಿ ನೋಡು!"', hi: 'लोहा रेड्डी: "पीन्या के लोहे से टकराने की हिम्मत देखता हूं!"' },
        { isBossMission: true, bossName: 'Loha "Anvil" Reddy' })
    ]
  },

  // ================= CHAPTER 7: NORTH / HEBBAL =================
  {
    id: 'ch7_north',
    number: 7,
    zone: 'north',
    title: 'Chapter 7: Shadows on Hebbal Flyover',
    titleKn: 'ಅಧ್ಯಾಯ ೭: ಹೆಬ್ಬಾಳ ಮೇಲ್ಸೇತುವೆಯ ನೆರಳು',
    bossId: 'boss_north',
    summary: {
      en: 'Break Commissioner Kulkarni’s highway trap at Hebbal Flyover and defeat Karan "Flyover" Verma.',
      kn: 'ಹೆಬ್ಬಾಳ ಮೇಲ್ಸೇತುವೆಯಲ್ಲಿ ಕುಲಕರ್ಣಿ ಮತ್ತು ಕರಣ್ ವರ್ಮಾ ಬಲೆಯನ್ನು ಮುರಿಯಿರಿ.',
      hi: 'हेब्बाल फ्लाईओवर पर कुलकर्णी के जाल को तोड़ें और करण "फ्लाईओवर" वर्मा को हराएं।'
    },
    introCutscene: {
      id: 'cut_ch7',
      title: 'CHAPTER 7 • NORTH / HEBBAL',
      subtitle: 'SHADOWS ON HEBBAL FLYOVER',
      shots: [
        {
          lat: 13.0358, lon: 77.5970, camOffset: [58, 34, 58], lookOffset: [0, 6, 0], duration: 3.4, speakerId: 'comm_kulkarni',
          caption: {
            en: 'Kulkarni: "You grew too big, too fast. Karan Verma has orders to seal Bellary Road from Hebbal to Sankey Tank."',
            kn: 'ಕುಲಕರ್ಣಿ: "ನೀನು ತುಂಬಾ ವೇಗವಾಗಿ ಬೆಳೆದಿದ್ದೀಯ. ಬಳ್ಳಾರಿ ರಸ್ತೆಯನ್ನು ಮುಚ್ಚಲು ಆದೇಶಿಸಿದ್ದೇನೆ."',
            hi: 'कुलकर्णी: "तुम बहुत तेज़ी से बढ़ गए हो। बेल्लारी रोड को पूरी तरह सील कर दिया गया है।"'
          }
        }
      ]
    },
    dialogue: {
      id: 'dlg_ch7',
      chapterId: 'ch7_north',
      title: 'Sankey Tank — Kulkarni’s Ultimatum',
      lines: [
        {
          speakerId: 'comm_kulkarni',
          text: {
            en: 'Step aside at Devanahalli, or join me as sole Underworld Emperor of Bengaluru. Your mentor Raghav Anna is already in my crosshairs.',
            kn: 'ದೇವನಹಳ್ಳಿಯಲ್ಲಿ ನನ್ನ ಜೊತೆ ಸೇರಿ ಬೆಂಗಳೂರಿನ ಏಕೈಕ ಸಾಮ್ರಾಟನಾಗು — ಇಲ್ಲವಾದರೆ ರಾಘವ್ ಅಣ್ಣನಿಗೆ ಅಪಾಯ.',
            hi: 'देवनहल्ली में मेरे साथ मिल जाओ और बेंगलुरु के अकेले बादशाह बनो—वरना तुम्हारे गुरु राघव अन्ना मुश्किल में होंगे।'
          }
        }
      ],
      choices: [
        {
          id: 'ch7_loyalty', alignment: 'loyalty', deltaLoyalty: 30, deltaPower: 0, deltaRespect: 450, setsFlag: 'defied_kulkarni',
          label: { en: 'Protect Raghav Anna & swear to bring Kulkarni down (+Loyalty)', kn: 'ರಾಘವ್ ಅಣ್ಣನನ್ನು ರಕ್ಷಿಸಿ ಕುಲಕರ್ಣಿಯನ್ನು ಸೋಲಿಸಿ (+ನಿಷ್ಠೆ)', hi: 'राघव अन्ना की रक्षा करो और कुलकर्णी को गिराओ (+वफ़ादारी)' },
          replySpeakerId: 'devi_nair',
          reply: { en: 'We ride together to the end—just like day one on Church Street!', kn: 'ನಾವೆಲ್ಲರೂ ಕೊನೆಯವರೆಗೂ ಒಟ್ಟಿಗೆ ಹೋರಾಡೋಣ!', hi: 'पहले दिन की तरह अंत तक हम साथ लड़ेंगे!' }
        },
        {
          id: 'ch7_power', alignment: 'power', deltaLoyalty: -10, deltaPower: 30, deltaCash: 6000, setsFlag: 'pact_with_kulkarni',
          label: { en: 'Accept Kulkarni’s throne & ₹6,000 payout to rule Bengaluru (+Power, +₹6,000)', kn: 'ಬೆಂಗಳೂರಿನ ಸಿಂಹಾಸನ ಮತ್ತು ₹6,000 ಒಪ್ಪಿಕೊಳ್ಳಿ (+ಶಕ್ತಿ, +₹6,000)', hi: 'कुलकर्णी का ताज और ₹6,000 स्वीकार करो (+ताकत, +₹6,000)' },
          replySpeakerId: 'comm_kulkarni',
          reply: { en: 'Eliminate Raza at the Airport and the entire Garden City answers to you alone.', kn: 'ವಿಮಾನ ನಿಲ್ದಾಣದಲ್ಲಿ ರಝಾನನ್ನು ಮುಗಿಸಿದರೆ ಇಡೀ ನಗರ ನಿನ್ನದಾಗುತ್ತದೆ.', hi: 'एयरपोर्ट पर रज़ा को हटाओ और पूरा शहर सिर्फ तुम्हारा होगा।' }
        }
      ]
    },
    missions: [
      mkMission('ch7_north', 'c7_m1', 'Hebbal Flyover Pursuit', 'north', 'Hebbal Flyover & Bellary Road', 13.0358, 77.5968, 'chase',
        'Punch through the Bellary Road blockade and escape to Sankey Tank Safehouse!', ['shooter', 'shooter', 'brute'], 5600, 500,
        { en: 'Devi: "Grab the street bike and fly down Bellary Road to Sankey Tank!"', kn: 'ದೇವಿ: "ಬಳ್ಳಾರಿ ರಸ್ತೆಯಿಂದ ಸ್ಯಾಂಕಿ ಕೆರೆ ಸೇಫ್‌ಹೌಸ್ ತಲುಪಿ!"', hi: 'देवी: "बेल्लारी रोड से निकलकर सैंकी टैंक सेफहाउस पहुंचो!"' },
        { targetLat: 13.0068, targetLon: 77.5735, wantedTrigger: 180, spawnBike: true }),
      mkMission('ch7_north', 'c7_m2', 'Malleshwaram Convoy Strike', 'north', 'Malleshwaram Circle', 13.0032, 77.5712, 'combat',
        'Cut off Flyover Kings gunmen staging near Malleshwaram.', ['shooter', 'shooter', 'brute', 'shooter'], 6200, 540,
        { en: 'Raghav Anna: "Don’t let Karan’s crew reach Hebbal Ring Road!"', kn: 'ರಾಘವ್ ಅಣ್ಣ: "ಕರಣ್ ಗ್ಯಾಂಗ್ ಹೆಬ್ಬಾಳ ತಲುಪುವ ಮುನ್ನ ತಡೆಯಿರಿ!"', hi: 'राघव अन्ना: "करण के लोगों को हेब्बाल रिंग रोड पहुंचने से पहले रोको!"' }),
      mkMission('ch7_north', 'c7_m3_boss', 'Boss: Karan Flyover at Hebbal Lake', 'north', 'Hebbal Lake Overlook', 13.0410, 77.5915, 'boss',
        'Defeat Karan "Flyover" Verma and secure the Airport Road gateway!', ['shooter', 'shooter', 'brute', 'boss'], 8200, 700,
        { en: 'Karan Verma: "The highway north to the airport ends right here!"', kn: 'ಕರಣ್ ವರ್ಮಾ: "ವಿಮಾನ ನಿಲ್ದಾಣದ ದಾರಿ ಇಲ್ಲಿಯೇ ಮುಗಿಯುತ್ತದೆ!"', hi: 'करण वर्मा: "एयरपोर्ट जाने वाला रास्ता यहीं खत्म होता है!"' },
        { isBossMission: true, bossName: 'Karan "Flyover" Verma' })
    ]
  },

  // ================= CHAPTER 8: AIRPORT FINALE =================
  {
    id: 'ch8_airport',
    number: 8,
    zone: 'airport',
    title: 'Chapter 8: Devanahalli Reckoning',
    titleKn: 'ಅಧ್ಯಾಯ ೮: ದೇವನಹಳ್ಳಿ ಅಂತಿಮ ಸಮರ',
    bossId: 'boss_airport',
    summary: {
      en: 'Confront Raza "Skyline" Siddiqui at Kempegowda International Airport Cargo Terminal and decide Bengaluru’s fate!',
      kn: 'ದೇವನಹಳ್ಳಿ ವಿಮಾನ ನಿಲ್ದಾಣದಲ್ಲಿ ರಝಾ ಸಿದ್ದಿಕಿಯನ್ನು ಎದುರಿಸಿ ಬೆಂಗಳೂರಿನ ಭವಿಷ್ಯ ನಿರ್ಧರಿಸಿ.',
      hi: 'देवनहल्ली एयरपोर्ट पर रज़ा "स्काईलाइन" सिद्दीकी से आखिरी मुकाबला और बेंगलुरु का फैसला।'
    },
    introCutscene: {
      id: 'cut_ch8',
      title: 'CHAPTER 8 • FINALE • DEVANAHALLI AIRPORT',
      subtitle: 'RUNWAY RECKONING',
      shots: [
        {
          lat: 13.1986, lon: 77.7066, camOffset: [65, 34, 65], lookOffset: [0, 8, 0], duration: 3.6, speakerId: 'boss_airport',
          caption: {
            en: 'Raza Skyline: "Eight zones conquered, from MG Road to Devanahalli. Tonight the Garden City crowns its true legend."',
            kn: 'ರಝಾ: "ಎಂ.ಜಿ. ರಸ್ತೆಯಿಂದ ದೇವನಹಳ್ಳಿವರೆಗೆ ಗೆದ್ದು ಬಂದಿದ್ದೀಯ. ಇಂದು ಬೆಂಗಳೂರಿನ ನಿಜವಾದ ದೊರೆ ಯಾರೆಂದು ತೀರ್ಮಾನವಾಗಲಿ!"',
            hi: 'रज़ा: "एम.जी. रोड से देवनहल्ली तक आठों ज़ोन जीत लिए। आज तय होगा बेंगलुरु का असली बादशाह कौन है!"'
          }
        }
      ]
    },
    dialogue: {
      id: 'dlg_ch8',
      chapterId: 'ch8_airport',
      title: 'Devanahalli Hangar — Final Choice',
      lines: [
        {
          speakerId: 'raghav_anna',
          text: {
            en: 'Once Raza Skyline falls, the whole city is yours. Will you protect Bengaluru’s people with loyalty—or rule the underworld with iron power?',
            kn: 'ರಝಾ ಬಿದ್ದ ನಂತರ ಇಡೀ ಬೆಂಗಳೂರು ನಿನ್ನ ಕೈಯಲ್ಲಿರುತ್ತದೆ. ನಿಷ್ಠೆಯಿಂದ ನಗರವನ್ನು ರಕ್ಷಿಸುವೆಯಾ ಅಥವಾ ಅಧಿಕಾರದಿಂದ ಆಳುವೆಯಾ?',
            hi: 'रज़ा के गिरते ही पूरा बेंगलुरु तुम्हारे हाथ में होगा। क्या तुम वफ़ादारी से शहर बचाओगे, या ताकत से राज करोगे?'
          }
        }
      ],
      choices: [
        {
          id: 'ch8_loyalty_final', alignment: 'loyalty', deltaLoyalty: 35, deltaPower: 0, deltaRespect: 600, setsFlag: 'ending_loyalty_vow',
          label: { en: 'Vow Loyalty: Protect the Garden City & dismantle Kulkarni’s syndicate', kn: 'ನಿಷ್ಠೆಯ ಪ್ರತಿಜ್ಞೆ: ಗಾರ್ಡನ್ ಸಿಟಿಯನ್ನು ರಕ್ಷಿಸಿ (+ನಿಷ್ಠೆ ಅಂತ್ಯ)', hi: 'वफ़ादारी की कसम: गार्डन सिटी की रक्षा करो (+वफ़ादारी अंत)' },
          replySpeakerId: 'devi_nair',
          reply: { en: 'For Anna, for Chotu, for every street in Bengaluru—let’s finish Raza!', kn: 'ಅಣ್ಣ ಮತ್ತು ಬೆಂಗಳೂರಿಗಾಗಿ — ರಝಾನನ್ನು ಮುಗಿಸೋಣ!', hi: 'अन्ना और पूरे बेंगलुरु के लिए — चलो रज़ा को खत्म करते हैं!' }
        },
        {
          id: 'ch8_power_final', alignment: 'power', deltaLoyalty: 0, deltaPower: 35, deltaCash: 10000, setsFlag: 'ending_power_vow',
          label: { en: 'Claim Power: Seize the Sky Cartel & crown yourself Underworld Emperor (+₹10,000)', kn: 'ಅಧಿಕಾರದ ಪ್ರತಿಜ್ಞೆ: ಸ್ಕೈ ಕಾರ್ಟೆಲ್ ವಶಪಡಿಸಿಕೊಂಡು ಸಾಮ್ರಾಟನಾಗು (+ಶಕ್ತಿ ಅಂತ್ಯ)', hi: 'ताकत का रास्ता: स्काई कार्टेल पर कब्ज़ा करके बादशाह बनो (+ताकत अंत)' },
          replySpeakerId: 'comm_kulkarni',
          reply: { en: 'Then walk onto that runway and take your crown.', kn: 'ರನ್‌ವೇಗೆ ಕಾಲಿಟ್ಟು ನಿನ್ನ ಕಿರೀಟವನ್ನು ಪಡೆದುಕೋ.', hi: 'तो रनवे पर उतरो और अपना ताज छीन लो।' }
        }
      ]
    },
    missions: [
      mkMission('ch8_airport', 'c8_m1', 'Airport Access Perimeter', 'airport', 'KIA Cargo Access Road', 13.1945, 77.6980, 'combat',
        'Breach the Sky Cartel security checkpoint outside the cargo terminal.', ['shooter', 'shooter', 'brute', 'brute'], 8000, 750,
        { en: 'Devi: "Ride the Airport Express Metro or a fast coupe—the cartel perimeter is heavily armed!"', kn: 'ದೇವಿ: "ಕಾರ್ಗೋ ಟರ್ಮಿನಲ್ ಹತ್ತಿರ ಭಾರೀ ಭದ್ರತೆ ಇದೆ!"', hi: 'देवी: "कार्गो टर्मिनल के बाहर भारी सुरक्षा है—तैयार रहो!"' }),
      mkMission('ch8_airport', 'c8_m2_boss', 'FINAL BOSS: Raza Skyline at Hangar 7', 'airport', 'Kempegowda International Airport Cargo Terminal', 13.1978, 77.7052, 'boss',
        'Defeat Raza "Skyline" Siddiqui in the ultimate Garden City Underworld showdown!', ['shooter', 'shooter', 'brute', 'brute', 'boss'], 18000, 1500,
        { en: 'Raza Skyline: "Every boss in Bengaluru fell to you—let’s see if you survive the Sky Cartel!"', kn: 'ರಝಾ: "ಎಲ್ಲ ಬಾಸ್‌ಗಳನ್ನು ಸೋಲಿಸಿ ಬಂದಿದ್ದೀಯಾ? ಈಗ ನನ್ನ ಎದುರು ನಿಲ್ಲು!"', hi: 'रज़ा: "सबको हराकर आए हो—अब स्काई कार्टेल का सामना करो!"' },
        { isBossMission: true, bossName: 'Raza "Skyline" Siddiqui', wantedTrigger: 160 })
    ]
  }
];

export const STORY_ENDINGS: Record<'loyalty' | 'power', EndingDef> = {
  loyalty: {
    id: 'loyalty',
    title: 'ENDING A: PROTECTOR OF THE GARDEN CITY',
    subtitle: 'PATH OF LOYALTY • ನಿಷ್ಠೆಯ ವಿಜಯ',
    epilogue: {
      en: 'With Raza Skyline defeated and Cipher’s files exposed, Commissioner Kulkarni’s corrupt syndicate collapses overnight. Alongside Raghav Anna, Devi, and Filter Chotu, your crew keeps every neighborhood from Church Street to Electronic City safe—a true guardian of Bengaluru.',
      kn: 'ರಝಾ ಸೋಲಿನೊಂದಿಗೆ ಕುಲಕರ್ಣಿಯ ಭ್ರಷ್ಟ ಜಾಲ ಕುಸಿದಿದೆ. ರಾಘವ್ ಅಣ್ಣ, ದೇವಿ ಮತ್ತು ಚೋಟು ಜೊತೆಗೆ ನೀವು ಗಾರ್ಡನ್ ಸಿಟಿಯ ನಿಜವಾದ ರಕ್ಷಕರಾಗಿದ್ದೀರಿ.',
      hi: 'रज़ा की हार और साइफर की फाइलों से कुलकर्णी का भ्रष्ट साम्राज्य ढह गया। राघव अन्ना, देवी और छोटू के साथ आप बेंगलुरु के सच्चे रक्षक बन गए।'
    },
    cutscene: {
      id: 'cut_ending_loyalty',
      title: 'ENDING • PATH OF LOYALTY',
      subtitle: 'PROTECTOR OF THE GARDEN CITY',
      shots: [
        {
          lat: 12.9796, lon: 77.5907, camOffset: [58, 36, 62], lookOffset: [0, 10, 0], duration: 4.0, speakerId: 'raghav_anna',
          caption: {
            en: 'Raghav Anna: "You proved loyalty is stronger than fear. Look at Bengaluru tonight—it breathes free because of you."',
            kn: 'ರಾಘವ್ ಅಣ್ಣ: "ಭಯಕ್ಕಿಂತ ನಿಷ್ಠೆ ದೊಡ್ಡದು ಎಂದು ನೀನು ಸಾಬೀತುಪಡಿಸಿದೆ. ಇಡೀ ಬೆಂಗಳೂರು ಇಂದು ನಿರಾಳವಾಗಿದೆ."',
            hi: 'राघव अन्ना: "तुमने साबित कर दिया कि वफ़ादारी डर से बड़ी है। आज पूरा बेंगलुरु चैन की सांस ले रहा है।"'
          }
        },
        {
          lat: 12.9756, lon: 77.6032, camOffset: [-45, 28, 48], lookOffset: [0, 6, 0], duration: 4.0, speakerId: 'devi_nair',
          caption: {
            en: 'Devi: "Filter kaapi’s on Chotu! Eight zones united—welcome home, Legend of Garden City."',
            kn: 'ದೇವಿ: "ಎಂಟು ವಲಯಗಳೂ ಒಂದಾಗಿವೆ — ಗಾರ್ಡನ್ ಸಿಟಿಯ ವೀರನಿಗೆ ಸ್ವಾಗತ!"',
            hi: 'देवी: "आठों ज़ोन एक हो गए—गार्डन सिटी के लेजेंड का स्वागत है!"'
          }
        }
      ]
    }
  },
  power: {
    id: 'power',
    title: 'ENDING B: EMPEROR OF THE SILICON UNDERWORLD',
    subtitle: 'PATH OF POWER • ಅಧಿಕಾರದ ಸಾಮ್ರಾಜ್ಯ',
    epilogue: {
      en: 'Raza Skyline falls and every syndicate from Chickpet to Devanahalli bends the knee. With Commissioner Kulkarni on your payroll and the Sky Cartel runways under your crest, you sit alone atop the Silicon Plateau as the supreme Underworld Emperor of Bengaluru.',
      kn: 'ಚಿಕ್ಕಪೇಟೆಯಿಂದ ದೇವನಹಳ್ಳಿವರೆಗೆ ಎಲ್ಲ ಸಿಂಡಿಕೇಟ್‌ಗಳು ನಿನ್ನ ಮುಂದೆ ತಲೆಬಾಗಿವೆ. ಬೆಂಗಳೂರಿನ ಅಜೇಯ ಭೂಗತ ಸಾಮ್ರಾಟನಾಗಿ ನಿನ್ನ ಯುಗ ಆರಂಭವಾಗಿದೆ.',
      hi: 'चिकपेट से देवनहल्ली तक हर सिंडिकेट ने तुम्हारे आगे घुटने टेक दिए। कुलकर्णी तुम्हारे इशारों पर है—तुम बेंगलुरु के निर्विवाद अंडरवर्ल्ड सम्राट बन चुके हो।'
    },
    cutscene: {
      id: 'cut_ending_power',
      title: 'ENDING • PATH OF POWER',
      subtitle: 'EMPEROR OF THE SILICON UNDERWORLD',
      shots: [
        {
          lat: 13.1986, lon: 77.7066, camOffset: [62, 34, 58], lookOffset: [0, 8, 0], duration: 4.0, speakerId: 'comm_kulkarni',
          caption: {
            en: 'Kulkarni: "Every highway, every ledger, every runway from Hosur Road to Devanahalli answers to one name now: yours."',
            kn: 'ಕುಲಕರ್ಣಿ: "ಹೊಸೂರು ರಸ್ತೆಯಿಂದ ದೇವನಹಳ್ಳಿವರೆಗೆ ಎಲ್ಲವೂ ಈಗ ನಿನ್ನ ಒಂದೇ ಹೆಸರಿಗೆ ಅಧೀನ."',
            hi: 'कुलकर्णी: "होसुर रोड से देवनहल्ली तक हर रास्ता और हर रनवे अब सिर्फ तुम्हारे नाम पर चलता है।"'
          }
        },
        {
          lat: 12.9784, lon: 77.6408, camOffset: [46, 30, 50], lookOffset: [0, 6, 0], duration: 4.0, speakerId: 'raghav_anna',
          caption: {
            en: 'Raghav Anna: "You conquered the whole city, kid... just remember the crown is heavy when you wear it alone."',
            kn: 'ರಾಘವ್ ಅಣ್ಣ: "ಇಡೀ ನಗರವನ್ನು ಗೆದ್ದಿದ್ದೀಯ... ಆದರೆ ಒಬ್ಬಂಟಿಯಾಗಿ ಸಿಂಹಾಸನ ಹೊರುವುದು ಸುಲಭವಲ್ಲ."',
            hi: 'राघव अन्ना: "पूरा शहर जीत लिया तुमने... बस याद रखना, अकेले ताज का बोझ बहुत भारी होता है।"'
          }
        }
      ]
    }
  }
};
