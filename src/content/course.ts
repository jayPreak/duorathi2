import type { GuidebookTip, Level, Section, Skill, Unit } from './types';

// Beginner Marathi (मराठी) for English speakers. Verb forms are taught in the
// masculine first-person (जातो, खातो…); the guidebook calls out feminine forms.

const SESSIONS_PER_SKILL = 3;

/** Lay out a unit's path the way Duolingo's path does: skills with a chest
 * after the second, then a practice level and a closing unit review. */
const buildLevels = (unitId: string, skills: Skill[]): Level[] => {
  const levels: Level[] = [];
  skills.forEach((skill, i) => {
    levels.push({
      id: `${unitId}-${skill.id}`,
      type: 'skill',
      title: skill.title,
      skillId: skill.id,
      totalSessions: SESSIONS_PER_SKILL,
    });
    if (i === 1) {
      levels.push({ id: `${unitId}-chest`, type: 'chest', title: 'Treasure', totalSessions: 1 });
    }
  });
  levels.push({ id: `${unitId}-practice`, type: 'practice', title: 'Practice', totalSessions: 1 });
  levels.push({ id: `${unitId}-review`, type: 'unit_review', title: 'Unit review', totalSessions: 1 });
  return levels;
};

const unit = (
  def: Omit<Unit, 'levels'> & { levels?: Level[] },
): Unit => ({ ...def, levels: def.levels ?? buildLevels(def.id, def.skills) });

const GREETINGS: Skill = {
  id: 'greetings',
  title: 'Greetings',
  lexemes: [
    { mr: 'नमस्कार', tr: 'namaskār', en: 'hello', emoji: '👋' },
    { mr: 'धन्यवाद', tr: 'dhanyavād', en: 'thank you', emoji: '🙏' },
    { mr: 'होय', tr: 'hoy', en: 'yes', emoji: '✅' },
    { mr: 'नाही', tr: 'nāhī', en: 'no', emoji: '❌' },
    { mr: 'कृपया', tr: 'kṛpayā', en: 'please', emoji: '🥺' },
    { mr: 'माफ करा', tr: 'māph karā', en: 'sorry', emoji: '🙇' },
  ],
  sentences: [
    { mr: 'होय धन्यवाद', tr: 'hoy dhanyavād', en: 'yes thank you', enAlt: ['yes thanks'] },
    { mr: 'नाही धन्यवाद', tr: 'nāhī dhanyavād', en: 'no thank you', enAlt: ['no thanks'] },
    { mr: 'नमस्कार माफ करा', tr: 'namaskār māph karā', en: 'hello sorry', enAlt: ['hello excuse me'] },
  ],
};

const INTRODUCTIONS: Skill = {
  id: 'intro',
  title: 'Introductions',
  lexemes: [
    { mr: 'मी', tr: 'mī', en: 'I', emoji: '🙋' },
    { mr: 'तू', tr: 'tū', en: 'you', emoji: '👉' },
    { mr: 'नाव', tr: 'nāv', en: 'name', emoji: '🏷️' },
    { mr: 'माझे', tr: 'mājhe', en: 'my', emoji: '🫵' },
    { mr: 'तुझे', tr: 'tujhe', en: 'your', emoji: '👈' },
    { mr: 'काय', tr: 'kāy', en: 'what', emoji: '❓' },
    { mr: 'आहे', tr: 'āhe', en: 'is', emoji: '🟰' },
    { mr: 'ठीक', tr: 'ṭhīk', en: 'fine', emoji: '👌' },
  ],
  sentences: [
    { mr: 'माझे नाव राज आहे', tr: 'mājhe nāv rāj āhe', en: 'my name is raj' },
    { mr: 'तुझे नाव काय आहे', tr: 'tujhe nāv kāy āhe', en: 'what is your name' },
    { mr: 'मी राज आहे', tr: 'mī rāj āhe', en: 'i am raj' },
    { mr: 'तू कसा आहेस', tr: 'tū kasā āhes', en: 'how are you' },
    { mr: 'मी ठीक आहे', tr: 'mī ṭhīk āhe', en: 'i am fine', enAlt: ["i'm fine", 'i am okay'] },
  ],
};

const NUMBERS_1: Skill = {
  id: 'num1',
  title: 'One to five',
  lexemes: [
    { mr: 'एक', tr: 'ek', en: 'one', emoji: '1️⃣' },
    { mr: 'दोन', tr: 'don', en: 'two', emoji: '2️⃣' },
    { mr: 'तीन', tr: 'tīn', en: 'three', emoji: '3️⃣' },
    { mr: 'चार', tr: 'chār', en: 'four', emoji: '4️⃣' },
    { mr: 'पाच', tr: 'pāch', en: 'five', emoji: '5️⃣' },
  ],
  sentences: [],
};

const NUMBERS_2: Skill = {
  id: 'num2',
  title: 'Six to ten',
  lexemes: [
    { mr: 'सहा', tr: 'sahā', en: 'six', emoji: '6️⃣' },
    { mr: 'सात', tr: 'sāt', en: 'seven', emoji: '7️⃣' },
    { mr: 'आठ', tr: 'āṭh', en: 'eight', emoji: '8️⃣' },
    { mr: 'नऊ', tr: 'naū', en: 'nine', emoji: '9️⃣' },
    { mr: 'दहा', tr: 'dahā', en: 'ten', emoji: '🔟' },
  ],
  sentences: [],
};

const FAMILY_1: Skill = {
  id: 'family1',
  title: 'Parents & siblings',
  lexemes: [
    { mr: 'आई', tr: 'āī', en: 'mother', emoji: '👩' },
    { mr: 'बाबा', tr: 'bābā', en: 'father', emoji: '👨' },
    { mr: 'भाऊ', tr: 'bhāū', en: 'brother', emoji: '👦' },
    { mr: 'बहीण', tr: 'bahīṇ', en: 'sister', emoji: '👧' },
    { mr: 'हा', tr: 'hā', en: 'this (m)', emoji: '👇' },
    { mr: 'ही', tr: 'hī', en: 'this (f)', emoji: '👇' },
    { mr: 'माझा', tr: 'mājhā', en: 'my (m)', emoji: '🫵' },
    { mr: 'माझी', tr: 'mājhī', en: 'my (f)', emoji: '🫵' },
  ],
  sentences: [
    { mr: 'ही माझी आई आहे', tr: 'hī mājhī āī āhe', en: 'this is my mother', enAlt: ['this is my mom'] },
    { mr: 'हा माझा भाऊ आहे', tr: 'hā mājhā bhāū āhe', en: 'this is my brother' },
    { mr: 'ही माझी बहीण आहे', tr: 'hī mājhī bahīṇ āhe', en: 'this is my sister' },
    { mr: 'हे माझे बाबा आहेत', tr: 'he mājhe bābā āhet', en: 'this is my father', enAlt: ['this is my dad'] },
  ],
};

const FAMILY_2: Skill = {
  id: 'family2',
  title: 'Friends & elders',
  lexemes: [
    { mr: 'आजी', tr: 'ājī', en: 'grandmother', emoji: '👵' },
    { mr: 'आजोबा', tr: 'ājobā', en: 'grandfather', emoji: '👴' },
    { mr: 'मित्र', tr: 'mitra', en: 'friend (m)', emoji: '🧑‍🤝‍🧑' },
    { mr: 'मैत्रीण', tr: 'maitrīṇ', en: 'friend (f)', emoji: '👭' },
    { mr: 'तो', tr: 'to', en: 'he', emoji: '🙎‍♂️' },
    { mr: 'ती', tr: 'tī', en: 'she', emoji: '🙎‍♀️' },
  ],
  sentences: [
    { mr: 'तो माझा मित्र आहे', tr: 'to mājhā mitra āhe', en: 'he is my friend' },
    { mr: 'ती माझी मैत्रीण आहे', tr: 'tī mājhī maitrīṇ āhe', en: 'she is my friend' },
    { mr: 'ही माझी आजी आहे', tr: 'hī mājhī ājī āhe', en: 'this is my grandmother', enAlt: ['this is my grandma'] },
    { mr: 'हे माझे आजोबा आहेत', tr: 'he mājhe ājobā āhet', en: 'this is my grandfather', enAlt: ['this is my grandpa'] },
  ],
};

const DRINKS: Skill = {
  id: 'drinks',
  title: 'Drinks',
  lexemes: [
    { mr: 'पाणी', tr: 'pāṇī', en: 'water', emoji: '💧' },
    { mr: 'चहा', tr: 'chahā', en: 'tea', emoji: '🍵' },
    { mr: 'दूध', tr: 'dūdh', en: 'milk', emoji: '🥛' },
    { mr: 'मला', tr: 'malā', en: 'to me', emoji: '🙋' },
    { mr: 'हवा', tr: 'havā', en: 'want (m)', emoji: '🤲' },
    { mr: 'हवे', tr: 'have', en: 'want (n)', emoji: '🤲' },
  ],
  sentences: [
    { mr: 'मला चहा हवा आहे', tr: 'malā chahā havā āhe', en: 'i want tea' },
    { mr: 'मला पाणी हवे आहे', tr: 'malā pāṇī have āhe', en: 'i want water' },
    { mr: 'मला दूध हवे आहे', tr: 'malā dūdh have āhe', en: 'i want milk' },
    { mr: 'तुला चहा हवा आहे का', tr: 'tulā chahā havā āhe kā', en: 'do you want tea' },
  ],
};

const FOOD: Skill = {
  id: 'food',
  title: 'Food',
  lexemes: [
    { mr: 'भात', tr: 'bhāt', en: 'rice', emoji: '🍚' },
    { mr: 'पोळी', tr: 'poḷī', en: 'chapati', emoji: '🫓' },
    { mr: 'आंबा', tr: 'āmbā', en: 'mango', emoji: '🥭' },
    { mr: 'केळे', tr: 'keḷe', en: 'banana', emoji: '🍌' },
    { mr: 'आवडतो', tr: 'āvaḍto', en: 'like (m)', emoji: '😋' },
    { mr: 'आवडते', tr: 'āvaḍte', en: 'like (f/n)', emoji: '😋' },
  ],
  sentences: [
    { mr: 'मला आंबा आवडतो', tr: 'malā āmbā āvaḍto', en: 'i like mango', enAlt: ['i like mangoes'] },
    { mr: 'मला भात आवडतो', tr: 'malā bhāt āvaḍto', en: 'i like rice' },
    { mr: 'मला पोळी आवडते', tr: 'malā poḷī āvaḍte', en: 'i like chapati' },
    { mr: 'मला केळे आवडते', tr: 'malā keḷe āvaḍte', en: 'i like bananas', enAlt: ['i like banana'] },
  ],
};

const PLACES: Skill = {
  id: 'places',
  title: 'Places',
  lexemes: [
    { mr: 'घर', tr: 'ghar', en: 'house', emoji: '🏠' },
    { mr: 'शाळा', tr: 'śāḷā', en: 'school', emoji: '🏫' },
    { mr: 'बाजार', tr: 'bājār', en: 'market', emoji: '🛒' },
    { mr: 'दुकान', tr: 'dukān', en: 'shop', emoji: '🏪' },
    { mr: 'कुठे', tr: 'kuṭhe', en: 'where', emoji: '🧭' },
    { mr: 'इथे', tr: 'ithe', en: 'here', emoji: '📍' },
    { mr: 'तिथे', tr: 'tithe', en: 'there', emoji: '👉' },
  ],
  sentences: [
    { mr: 'घर कुठे आहे', tr: 'ghar kuṭhe āhe', en: 'where is the house', enAlt: ['where is the home'] },
    { mr: 'शाळा इथे आहे', tr: 'śāḷā ithe āhe', en: 'the school is here' },
    { mr: 'बाजार तिथे आहे', tr: 'bājār tithe āhe', en: 'the market is there' },
    { mr: 'दुकान कुठे आहे', tr: 'dukān kuṭhe āhe', en: 'where is the shop', enAlt: ['where is the store'] },
  ],
};

const GOING: Skill = {
  id: 'going',
  title: 'Going places',
  lexemes: [
    { mr: 'जातो', tr: 'jāto', en: 'go (m)', emoji: '🚶' },
    { mr: 'येतो', tr: 'yeto', en: 'come (m)', emoji: '🏃' },
    { mr: 'शाळेत', tr: 'śāḷet', en: 'to school', emoji: '🏫' },
    { mr: 'बाजारात', tr: 'bājārāt', en: 'to the market', emoji: '🛒' },
    { mr: 'घरी', tr: 'gharī', en: 'home', emoji: '🏠' },
  ],
  sentences: [
    { mr: 'मी शाळेत जातो', tr: 'mī śāḷet jāto', en: 'i go to school' },
    { mr: 'मी बाजारात जातो', tr: 'mī bājārāt jāto', en: 'i go to the market' },
    { mr: 'मी घरी जातो', tr: 'mī gharī jāto', en: 'i go home' },
    { mr: 'तो घरी येतो', tr: 'to gharī yeto', en: 'he comes home' },
  ],
};

const COLORS: Skill = {
  id: 'colors',
  title: 'Colors',
  lexemes: [
    { mr: 'लाल', tr: 'lāl', en: 'red', emoji: '🔴' },
    { mr: 'निळे', tr: 'niḷe', en: 'blue', emoji: '🔵' },
    { mr: 'हिरवा', tr: 'hiravā', en: 'green', emoji: '🟢' },
    { mr: 'पिवळा', tr: 'pivaḷā', en: 'yellow', emoji: '🟡' },
    { mr: 'काळा', tr: 'kāḷā', en: 'black', emoji: '⚫' },
    { mr: 'आकाश', tr: 'ākāś', en: 'sky', emoji: '🌌' },
  ],
  sentences: [
    { mr: 'हा आंबा पिवळा आहे', tr: 'hā āmbā pivaḷā āhe', en: 'this mango is yellow' },
    { mr: 'आकाश निळे आहे', tr: 'ākāś niḷe āhe', en: 'the sky is blue' },
    { mr: 'हा आंबा हिरवा आहे', tr: 'hā āmbā hiravā āhe', en: 'this mango is green' },
  ],
};

const DESCRIBING: Skill = {
  id: 'describe',
  title: 'Describing',
  lexemes: [
    { mr: 'मोठे', tr: 'moṭhe', en: 'big', emoji: '🐘' },
    { mr: 'लहान', tr: 'lahān', en: 'small', emoji: '🐭' },
    { mr: 'छान', tr: 'chān', en: 'nice', emoji: '✨' },
    { mr: 'नवीन', tr: 'navīn', en: 'new', emoji: '🆕' },
    { mr: 'जुने', tr: 'june', en: 'old', emoji: '🏚️' },
  ],
  sentences: [
    { mr: 'घर मोठे आहे', tr: 'ghar moṭhe āhe', en: 'the house is big' },
    { mr: 'माझे घर लहान आहे', tr: 'mājhe ghar lahān āhe', en: 'my house is small' },
    { mr: 'हा चहा छान आहे', tr: 'hā chahā chān āhe', en: 'this tea is nice', enAlt: ['this tea is good'] },
    { mr: 'दुकान नवीन आहे', tr: 'dukān navīn āhe', en: 'the shop is new', enAlt: ['the store is new'] },
  ],
};

const DAILY: Skill = {
  id: 'daily',
  title: 'Eat & drink',
  lexemes: [
    { mr: 'खातो', tr: 'khāto', en: 'eat (m)', emoji: '🍽️' },
    { mr: 'पितो', tr: 'pito', en: 'drink (m)', emoji: '🥤' },
    { mr: 'रोज', tr: 'roj', en: 'every day', emoji: '📅' },
    { mr: 'सकाळी', tr: 'sakāḷī', en: 'in the morning', emoji: '🌅' },
  ],
  sentences: [
    { mr: 'मी पाणी पितो', tr: 'mī pāṇī pito', en: 'i drink water' },
    { mr: 'मी भात खातो', tr: 'mī bhāt khāto', en: 'i eat rice' },
    { mr: 'मी रोज चहा पितो', tr: 'mī roj chahā pito', en: 'i drink tea every day' },
    { mr: 'मी सकाळी दूध पितो', tr: 'mī sakāḷī dūdh pito', en: 'i drink milk in the morning' },
  ],
};

const SPEAKING: Skill = {
  id: 'speak',
  title: 'Read & speak',
  lexemes: [
    { mr: 'बोलतो', tr: 'bolto', en: 'speak (m)', emoji: '🗣️' },
    { mr: 'वाचतो', tr: 'vāchto', en: 'read (m)', emoji: '📖' },
    { mr: 'मराठी', tr: 'marāṭhī', en: 'Marathi', emoji: '🟠' },
    { mr: 'पुस्तक', tr: 'pustak', en: 'book', emoji: '📕' },
    { mr: 'का', tr: 'kā', en: '(question)', emoji: '❔' },
  ],
  sentences: [
    { mr: 'मी मराठी बोलतो', tr: 'mī marāṭhī bolto', en: 'i speak marathi' },
    { mr: 'मी पुस्तक वाचतो', tr: 'mī pustak vāchto', en: 'i read a book', enAlt: ['i read the book'] },
    { mr: 'तू मराठी बोलतोस का', tr: 'tū marāṭhī boltos kā', en: 'do you speak marathi' },
    { mr: 'तो रोज पुस्तक वाचतो', tr: 'to roj pustak vāchto', en: 'he reads a book every day' },
  ],
};

const tip = (heading: string, body: string, examples: GuidebookTip['examples'] = []): GuidebookTip => ({
  heading,
  body,
  examples,
});

export const COURSE: Section[] = [
  {
    id: 's1',
    title: 'Section 1 · Rookie',
    units: [
      unit({
        id: 'u1',
        title: 'Say hello',
        description: 'Greet people and introduce yourself',
        color: '#58cc02',
        skills: [GREETINGS, INTRODUCTIONS],
        guidebook: [
          tip('नमस्कार works all day', 'Use नमस्कार (namaskār) for hello and goodbye, with anyone.', [
            GREETINGS.sentences[0],
          ]),
          tip(
            'आहे = is / am',
            'Marathi puts the verb last: "My name Raj is". आहे (āhe) covers is/am; with तू it becomes आहेस (āhes).',
            [INTRODUCTIONS.sentences[0], INTRODUCTIONS.sentences[3]],
          ),
        ],
      }),
      unit({
        id: 'u2',
        title: 'Count to ten',
        description: 'Numbers one to ten',
        color: '#ce82ff',
        skills: [NUMBERS_1, NUMBERS_2],
        guidebook: [tip('Numbers', 'Marathi numerals also have their own digits: १ २ ३ ४ ५ ६ ७ ८ ९ १०.')],
      }),
      unit({
        id: 'u3',
        title: 'Family',
        description: 'Talk about the people close to you',
        color: '#00cd9c',
        skills: [FAMILY_1, FAMILY_2],
        guidebook: [
          tip(
            'Gendered "this" and "my"',
            'हा / माझा go with masculine nouns, ही / माझी with feminine ones. Elders take the respectful plural हे / माझे … आहेत.',
            [FAMILY_1.sentences[1], FAMILY_1.sentences[0], FAMILY_1.sentences[3]],
          ),
        ],
      }),
    ],
  },
  {
    id: 's2',
    title: 'Section 2 · Explorer',
    units: [
      unit({
        id: 'u4',
        title: 'Food & drink',
        description: 'Order tea and say what you like',
        color: '#ff9600',
        skills: [DRINKS, FOOD],
        guidebook: [
          tip(
            'मला … हवा / हवे आहे',
            'Literally "to me … is wanted". हवा agrees with masculine nouns (चहा), हवे with neuter ones (पाणी, दूध).',
            [DRINKS.sentences[0], DRINKS.sentences[1]],
          ),
          tip('Questions with का', 'Add का (kā) at the end to turn a statement into a yes/no question.', [
            DRINKS.sentences[3],
          ]),
        ],
      }),
      unit({
        id: 'u5',
        title: 'Around town',
        description: 'Find places and get around',
        color: '#1cb0f6',
        skills: [PLACES, GOING],
        guidebook: [
          tip(
            '-त / -आत = "to / in"',
            'शाळा → शाळेत (to school), बाजार → बाजारात (to the market). घर becomes घरी for "home".',
            [GOING.sentences[0], GOING.sentences[2]],
          ),
          tip('Feminine speakers', 'Women say जाते / येते instead of जातो / येतो.'),
        ],
      }),
      unit({
        id: 'u6',
        title: 'Describe it',
        description: 'Colors and describing words',
        color: '#ff4b4b',
        skills: [COLORS, DESCRIBING],
        guidebook: [
          tip(
            'Adjectives agree too',
            'Adjectives ending in -आ change with gender: पिवळा (m), पिवळी (f), पिवळे (n). लाल and लहान never change.',
            [COLORS.sentences[0], COLORS.sentences[1]],
          ),
        ],
      }),
      unit({
        id: 'u7',
        title: 'Daily life',
        description: 'Eating, drinking, reading and speaking',
        color: '#2b70c9',
        skills: [DAILY, SPEAKING],
        guidebook: [
          tip(
            'Present habitual',
            'खातो / पितो / वाचतो describe what you usually do. Feminine: खाते / पिते / वाचते. With तू add -स: बोलतोस.',
            [DAILY.sentences[2], SPEAKING.sentences[2]],
          ),
        ],
      }),
    ],
  },
];

export const ALL_UNITS: Unit[] = COURSE.flatMap((s) => s.units);
export const ALL_LEVELS: Level[] = ALL_UNITS.flatMap((u) => u.levels);

export const findUnitForLevel = (levelId: string): Unit | undefined =>
  ALL_UNITS.find((u) => u.levels.some((l) => l.id === levelId));

export const findLevel = (levelId: string): Level | undefined =>
  ALL_LEVELS.find((l) => l.id === levelId);
