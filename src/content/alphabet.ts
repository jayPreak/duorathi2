import type { CharacterGroup } from './types';

// Devanagari as used for Marathi. Duolingo ships "alphabet" levels for
// non-Latin scripts (session types AlphabetLesson / AlphabetPractice); these
// groups feed the Characters tab.

export const ALPHABET: CharacterGroup[] = [
  {
    id: 'vowels',
    title: 'Vowels · स्वर',
    characters: [
      { ch: 'अ', tr: 'a', example: { mr: 'अननस', tr: 'ananas', en: 'pineapple', emoji: '🍍' } },
      { ch: 'आ', tr: 'ā', example: { mr: 'आई', tr: 'āī', en: 'mother', emoji: '👩' } },
      { ch: 'इ', tr: 'i', example: { mr: 'इमारत', tr: 'imārat', en: 'building', emoji: '🏢' } },
      { ch: 'ई', tr: 'ī' },
      { ch: 'उ', tr: 'u', example: { mr: 'उंदीर', tr: 'undīr', en: 'mouse', emoji: '🐭' } },
      { ch: 'ऊ', tr: 'ū', example: { mr: 'ऊस', tr: 'ūs', en: 'sugarcane', emoji: '🎋' } },
      { ch: 'ए', tr: 'e', example: { mr: 'एक', tr: 'ek', en: 'one', emoji: '1️⃣' } },
      { ch: 'ऐ', tr: 'ai' },
      { ch: 'ओ', tr: 'o' },
      { ch: 'औ', tr: 'au' },
    ],
  },
  {
    id: 'velar-palatal',
    title: 'क to ञ',
    characters: [
      { ch: 'क', tr: 'ka', example: { mr: 'कमळ', tr: 'kamaḷ', en: 'lotus', emoji: '🪷' } },
      { ch: 'ख', tr: 'kha', example: { mr: 'खार', tr: 'khār', en: 'squirrel', emoji: '🐿️' } },
      { ch: 'ग', tr: 'ga', example: { mr: 'गाय', tr: 'gāy', en: 'cow', emoji: '🐄' } },
      { ch: 'घ', tr: 'gha', example: { mr: 'घर', tr: 'ghar', en: 'house', emoji: '🏠' } },
      { ch: 'च', tr: 'cha', example: { mr: 'चहा', tr: 'chahā', en: 'tea', emoji: '🍵' } },
      { ch: 'छ', tr: 'chha', example: { mr: 'छत्री', tr: 'chhatrī', en: 'umbrella', emoji: '☂️' } },
      { ch: 'ज', tr: 'ja', example: { mr: 'जहाज', tr: 'jahāj', en: 'ship', emoji: '🚢' } },
      { ch: 'झ', tr: 'jha', example: { mr: 'झाड', tr: 'jhāḍ', en: 'tree', emoji: '🌳' } },
    ],
  },
  {
    id: 'retroflex-dental',
    title: 'ट to न',
    characters: [
      { ch: 'ट', tr: 'ṭa', example: { mr: 'टपाल', tr: 'ṭapāl', en: 'mail', emoji: '✉️' } },
      { ch: 'ठ', tr: 'ṭha' },
      { ch: 'ड', tr: 'ḍa', example: { mr: 'डबा', tr: 'ḍabā', en: 'box', emoji: '📦' } },
      { ch: 'ढ', tr: 'ḍha', example: { mr: 'ढग', tr: 'ḍhag', en: 'cloud', emoji: '☁️' } },
      { ch: 'ण', tr: 'ṇa' },
      { ch: 'त', tr: 'ta', example: { mr: 'तारा', tr: 'tārā', en: 'star', emoji: '⭐' } },
      { ch: 'थ', tr: 'tha' },
      { ch: 'द', tr: 'da', example: { mr: 'दूध', tr: 'dūdh', en: 'milk', emoji: '🥛' } },
      { ch: 'ध', tr: 'dha', example: { mr: 'धनुष्य', tr: 'dhanuṣya', en: 'bow', emoji: '🏹' } },
      { ch: 'न', tr: 'na', example: { mr: 'नाक', tr: 'nāk', en: 'nose', emoji: '👃' } },
    ],
  },
  {
    id: 'labial-other',
    title: 'प to ळ',
    characters: [
      { ch: 'प', tr: 'pa', example: { mr: 'पाणी', tr: 'pāṇī', en: 'water', emoji: '💧' } },
      { ch: 'फ', tr: 'pha', example: { mr: 'फूल', tr: 'phūl', en: 'flower', emoji: '🌸' } },
      { ch: 'ब', tr: 'ba', example: { mr: 'बदक', tr: 'badak', en: 'duck', emoji: '🦆' } },
      { ch: 'भ', tr: 'bha', example: { mr: 'भात', tr: 'bhāt', en: 'rice', emoji: '🍚' } },
      { ch: 'म', tr: 'ma', example: { mr: 'मासा', tr: 'māsā', en: 'fish', emoji: '🐟' } },
      { ch: 'य', tr: 'ya' },
      { ch: 'र', tr: 'ra', example: { mr: 'रथ', tr: 'rath', en: 'chariot', emoji: '🛺' } },
      { ch: 'ल', tr: 'la', example: { mr: 'लाल', tr: 'lāl', en: 'red', emoji: '🔴' } },
      { ch: 'व', tr: 'va', example: { mr: 'वाघ', tr: 'vāgh', en: 'tiger', emoji: '🐅' } },
      { ch: 'श', tr: 'śa', example: { mr: 'शाळा', tr: 'śāḷā', en: 'school', emoji: '🏫' } },
      { ch: 'स', tr: 'sa', example: { mr: 'ससा', tr: 'sasā', en: 'rabbit', emoji: '🐇' } },
      { ch: 'ह', tr: 'ha', example: { mr: 'हत्ती', tr: 'hattī', en: 'elephant', emoji: '🐘' } },
      { ch: 'ळ', tr: 'ḷa' },
    ],
  },
];

export const findCharacterGroup = (id: string) => ALPHABET.find((g) => g.id === id);
