/**
 * Native book name translations for all 66 books.
 * Used by the book selector to show "{Native} | {English}".
 * For languages without verified translations, the English name is reused.
 */
import type { LanguageCode } from './languages';

type BookMap = Record<string, string>;

const EN: BookMap = {
  Genesis: 'Genesis', Exodus: 'Exodus', Leviticus: 'Leviticus', Numbers: 'Numbers',
  Deuteronomy: 'Deuteronomy', Joshua: 'Joshua', Judges: 'Judges', Ruth: 'Ruth',
  '1 Samuel': '1 Samuel', '2 Samuel': '2 Samuel', '1 Kings': '1 Kings', '2 Kings': '2 Kings',
  '1 Chronicles': '1 Chronicles', '2 Chronicles': '2 Chronicles', Ezra: 'Ezra',
  Nehemiah: 'Nehemiah', Esther: 'Esther', Job: 'Job', Psalms: 'Psalms', Proverbs: 'Proverbs',
  Ecclesiastes: 'Ecclesiastes', 'Song of Solomon': 'Song of Solomon', Isaiah: 'Isaiah',
  Jeremiah: 'Jeremiah', Lamentations: 'Lamentations', Ezekiel: 'Ezekiel', Daniel: 'Daniel',
  Hosea: 'Hosea', Joel: 'Joel', Amos: 'Amos', Obadiah: 'Obadiah', Jonah: 'Jonah',
  Micah: 'Micah', Nahum: 'Nahum', Habakkuk: 'Habakkuk', Zephaniah: 'Zephaniah',
  Haggai: 'Haggai', Zechariah: 'Zechariah', Malachi: 'Malachi',
  Matthew: 'Matthew', Mark: 'Mark', Luke: 'Luke', John: 'John', Acts: 'Acts',
  Romans: 'Romans', '1 Corinthians': '1 Corinthians', '2 Corinthians': '2 Corinthians',
  Galatians: 'Galatians', Ephesians: 'Ephesians', Philippians: 'Philippians',
  Colossians: 'Colossians', '1 Thessalonians': '1 Thessalonians',
  '2 Thessalonians': '2 Thessalonians', '1 Timothy': '1 Timothy', '2 Timothy': '2 Timothy',
  Titus: 'Titus', Philemon: 'Philemon', Hebrews: 'Hebrews', James: 'James',
  '1 Peter': '1 Peter', '2 Peter': '2 Peter', '1 John': '1 John', '2 John': '2 John',
  '3 John': '3 John', Jude: 'Jude', Revelation: 'Revelation',
};

const ES: BookMap = {
  Genesis: 'Génesis', Exodus: 'Éxodo', Leviticus: 'Levítico', Numbers: 'Números',
  Deuteronomy: 'Deuteronomio', Joshua: 'Josué', Judges: 'Jueces', Ruth: 'Rut',
  '1 Samuel': '1 Samuel', '2 Samuel': '2 Samuel', '1 Kings': '1 Reyes', '2 Kings': '2 Reyes',
  '1 Chronicles': '1 Crónicas', '2 Chronicles': '2 Crónicas', Ezra: 'Esdras',
  Nehemiah: 'Nehemías', Esther: 'Ester', Job: 'Job', Psalms: 'Salmos', Proverbs: 'Proverbios',
  Ecclesiastes: 'Eclesiastés', 'Song of Solomon': 'Cantares', Isaiah: 'Isaías',
  Jeremiah: 'Jeremías', Lamentations: 'Lamentaciones', Ezekiel: 'Ezequiel', Daniel: 'Daniel',
  Hosea: 'Oseas', Joel: 'Joel', Amos: 'Amós', Obadiah: 'Abdías', Jonah: 'Jonás',
  Micah: 'Miqueas', Nahum: 'Nahúm', Habakkuk: 'Habacuc', Zephaniah: 'Sofonías',
  Haggai: 'Hageo', Zechariah: 'Zacarías', Malachi: 'Malaquías',
  Matthew: 'Mateo', Mark: 'Marcos', Luke: 'Lucas', John: 'Juan', Acts: 'Hechos',
  Romans: 'Romanos', '1 Corinthians': '1 Corintios', '2 Corinthians': '2 Corintios',
  Galatians: 'Gálatas', Ephesians: 'Efesios', Philippians: 'Filipenses',
  Colossians: 'Colosenses', '1 Thessalonians': '1 Tesalonicenses',
  '2 Thessalonians': '2 Tesalonicenses', '1 Timothy': '1 Timoteo', '2 Timothy': '2 Timoteo',
  Titus: 'Tito', Philemon: 'Filemón', Hebrews: 'Hebreos', James: 'Santiago',
  '1 Peter': '1 Pedro', '2 Peter': '2 Pedro', '1 John': '1 Juan', '2 John': '2 Juan',
  '3 John': '3 Juan', Jude: 'Judas', Revelation: 'Apocalipsis',
};

const PT: BookMap = {
  Genesis: 'Gênesis', Exodus: 'Êxodo', Leviticus: 'Levítico', Numbers: 'Números',
  Deuteronomy: 'Deuteronômio', Joshua: 'Josué', Judges: 'Juízes', Ruth: 'Rute',
  '1 Samuel': '1 Samuel', '2 Samuel': '2 Samuel', '1 Kings': '1 Reis', '2 Kings': '2 Reis',
  '1 Chronicles': '1 Crônicas', '2 Chronicles': '2 Crônicas', Ezra: 'Esdras',
  Nehemiah: 'Neemias', Esther: 'Ester', Job: 'Jó', Psalms: 'Salmos', Proverbs: 'Provérbios',
  Ecclesiastes: 'Eclesiastes', 'Song of Solomon': 'Cantares', Isaiah: 'Isaías',
  Jeremiah: 'Jeremias', Lamentations: 'Lamentações', Ezekiel: 'Ezequiel', Daniel: 'Daniel',
  Hosea: 'Oséias', Joel: 'Joel', Amos: 'Amós', Obadiah: 'Obadias', Jonah: 'Jonas',
  Micah: 'Miquéias', Nahum: 'Naum', Habakkuk: 'Habacuque', Zephaniah: 'Sofonias',
  Haggai: 'Ageu', Zechariah: 'Zacarias', Malachi: 'Malaquias',
  Matthew: 'Mateus', Mark: 'Marcos', Luke: 'Lucas', John: 'João', Acts: 'Atos',
  Romans: 'Romanos', '1 Corinthians': '1 Coríntios', '2 Corinthians': '2 Coríntios',
  Galatians: 'Gálatas', Ephesians: 'Efésios', Philippians: 'Filipenses',
  Colossians: 'Colossenses', '1 Thessalonians': '1 Tessalonicenses',
  '2 Thessalonians': '2 Tessalonicenses', '1 Timothy': '1 Timóteo', '2 Timothy': '2 Timóteo',
  Titus: 'Tito', Philemon: 'Filemom', Hebrews: 'Hebreus', James: 'Tiago',
  '1 Peter': '1 Pedro', '2 Peter': '2 Pedro', '1 John': '1 João', '2 John': '2 João',
  '3 John': '3 João', Jude: 'Judas', Revelation: 'Apocalipse',
};

const FR: BookMap = {
  Genesis: 'Genèse', Exodus: 'Exode', Leviticus: 'Lévitique', Numbers: 'Nombres',
  Deuteronomy: 'Deutéronome', Joshua: 'Josué', Judges: 'Juges', Ruth: 'Ruth',
  '1 Samuel': '1 Samuel', '2 Samuel': '2 Samuel', '1 Kings': '1 Rois', '2 Kings': '2 Rois',
  '1 Chronicles': '1 Chroniques', '2 Chronicles': '2 Chroniques', Ezra: 'Esdras',
  Nehemiah: 'Néhémie', Esther: 'Esther', Job: 'Job', Psalms: 'Psaumes', Proverbs: 'Proverbes',
  Ecclesiastes: 'Ecclésiaste', 'Song of Solomon': 'Cantique', Isaiah: 'Ésaïe',
  Jeremiah: 'Jérémie', Lamentations: 'Lamentations', Ezekiel: 'Ézéchiel', Daniel: 'Daniel',
  Hosea: 'Osée', Joel: 'Joël', Amos: 'Amos', Obadiah: 'Abdias', Jonah: 'Jonas',
  Micah: 'Michée', Nahum: 'Nahum', Habakkuk: 'Habacuc', Zephaniah: 'Sophonie',
  Haggai: 'Aggée', Zechariah: 'Zacharie', Malachi: 'Malachie',
  Matthew: 'Matthieu', Mark: 'Marc', Luke: 'Luc', John: 'Jean', Acts: 'Actes',
  Romans: 'Romains', '1 Corinthians': '1 Corinthiens', '2 Corinthians': '2 Corinthiens',
  Galatians: 'Galates', Ephesians: 'Éphésiens', Philippians: 'Philippiens',
  Colossians: 'Colossiens', '1 Thessalonians': '1 Thessaloniciens',
  '2 Thessalonians': '2 Thessaloniciens', '1 Timothy': '1 Timothée', '2 Timothy': '2 Timothée',
  Titus: 'Tite', Philemon: 'Philémon', Hebrews: 'Hébreux', James: 'Jacques',
  '1 Peter': '1 Pierre', '2 Peter': '2 Pierre', '1 John': '1 Jean', '2 John': '2 Jean',
  '3 John': '3 Jean', Jude: 'Jude', Revelation: 'Apocalypse',
};

const SW: BookMap = {
  Genesis: 'Mwanzo', Exodus: 'Kutoka', Leviticus: 'Mambo ya Walawi', Numbers: 'Hesabu',
  Deuteronomy: 'Kumbukumbu', Joshua: 'Yoshua', Judges: 'Waamuzi', Ruth: 'Ruthu',
  '1 Samuel': '1 Samweli', '2 Samuel': '2 Samweli', '1 Kings': '1 Wafalme', '2 Kings': '2 Wafalme',
  '1 Chronicles': '1 Mambo ya Nyakati', '2 Chronicles': '2 Mambo ya Nyakati', Ezra: 'Ezra',
  Nehemiah: 'Nehemia', Esther: 'Esta', Job: 'Ayubu', Psalms: 'Zaburi', Proverbs: 'Mithali',
  Ecclesiastes: 'Mhubiri', 'Song of Solomon': 'Wimbo Ulio Bora', Isaiah: 'Isaya',
  Jeremiah: 'Yeremia', Lamentations: 'Maombolezo', Ezekiel: 'Ezekieli', Daniel: 'Danieli',
  Hosea: 'Hosea', Joel: 'Yoeli', Amos: 'Amosi', Obadiah: 'Obadia', Jonah: 'Yona',
  Micah: 'Mika', Nahum: 'Nahumu', Habakkuk: 'Habakuki', Zephaniah: 'Sefania',
  Haggai: 'Hagai', Zechariah: 'Zekaria', Malachi: 'Malaki',
  Matthew: 'Mathayo', Mark: 'Marko', Luke: 'Luka', John: 'Yohana', Acts: 'Matendo',
  Romans: 'Warumi', '1 Corinthians': '1 Wakorintho', '2 Corinthians': '2 Wakorintho',
  Galatians: 'Wagalatia', Ephesians: 'Waefeso', Philippians: 'Wafilipi',
  Colossians: 'Wakolosai', '1 Thessalonians': '1 Wathesalonike',
  '2 Thessalonians': '2 Wathesalonike', '1 Timothy': '1 Timotheo', '2 Timothy': '2 Timotheo',
  Titus: 'Tito', Philemon: 'Filemoni', Hebrews: 'Waebrania', James: 'Yakobo',
  '1 Peter': '1 Petro', '2 Peter': '2 Petro', '1 John': '1 Yohana', '2 John': '2 Yohana',
  '3 John': '3 Yohana', Jude: 'Yuda', Revelation: 'Ufunuo',
};

const TW: BookMap = {
  Genesis: 'Genesis', Exodus: 'Exodus', Leviticus: 'Leviticus', Numbers: 'Numeri',
  Deuteronomy: 'Deuteronomium', Joshua: 'Yosua', Judges: 'Atemmufo', Ruth: 'Rut',
  '1 Samuel': '1 Samuel', '2 Samuel': '2 Samuel', '1 Kings': '1 Ahemfo', '2 Kings': '2 Ahemfo',
  '1 Chronicles': '1 Beresosɛm', '2 Chronicles': '2 Beresosɛm', Ezra: 'Esra',
  Nehemiah: 'Nehemia', Esther: 'Ester', Job: 'Hiob', Psalms: 'Nnwom', Proverbs: 'Mmebusɛm',
  Ecclesiastes: 'Ɔsɛnkafo', 'Song of Solomon': 'Nnwom Mu Dɔ', Isaiah: 'Yesaia',
  Jeremiah: 'Yeremia', Lamentations: 'Kwadwom', Ezekiel: 'Hesekiel', Daniel: 'Daniel',
  Hosea: 'Hosea', Joel: 'Yoel', Amos: 'Amos', Obadiah: 'Obadia', Jonah: 'Yona',
  Micah: 'Mika', Nahum: 'Nahum', Habakkuk: 'Habakuk', Zephaniah: 'Sefania',
  Haggai: 'Hagai', Zechariah: 'Sakaria', Malachi: 'Malaki',
  Matthew: 'Mateo', Mark: 'Marko', Luke: 'Luka', John: 'Yohane', Acts: 'Asomafo',
  Romans: 'Romafo', '1 Corinthians': '1 Korintofo', '2 Corinthians': '2 Korintofo',
  Galatians: 'Galatifo', Ephesians: 'Efesofo', Philippians: 'Filipifo',
  Colossians: 'Kolosefo', '1 Thessalonians': '1 Tesalonikafo',
  '2 Thessalonians': '2 Tesalonikafo', '1 Timothy': '1 Timoteo', '2 Timothy': '2 Timoteo',
  Titus: 'Tito', Philemon: 'Filemon', Hebrews: 'Hebrifo', James: 'Yakobo',
  '1 Peter': '1 Petro', '2 Peter': '2 Petro', '1 John': '1 Yohane', '2 John': '2 Yohane',
  '3 John': '3 Yohane', Jude: 'Yuda', Revelation: 'Adiyisɛm',
};

const YO: BookMap = {
  Genesis: 'Jẹ́nẹ́sísì', Exodus: 'Ẹ́kísódù', Leviticus: 'Léfítíkù', Numbers: 'Númérì',
  Deuteronomy: 'Diutarónómì', Joshua: 'Jóṣúà', Judges: 'Àwọn Onídàájọ́', Ruth: 'Rúùtù',
  '1 Samuel': '1 Sámúẹ́lì', '2 Samuel': '2 Sámúẹ́lì', '1 Kings': '1 Àwọn Ọba', '2 Kings': '2 Àwọn Ọba',
  '1 Chronicles': '1 Kíróníkà', '2 Chronicles': '2 Kíróníkà', Ezra: 'Ẹ́sírà',
  Nehemiah: 'Nehemáyà', Esther: 'Ẹ́sítérì', Job: 'Jóòbù', Psalms: 'Sáàmù', Proverbs: 'Òwe',
  Ecclesiastes: 'Oníwàásù', 'Song of Solomon': 'Orin Sólómọ́nì', Isaiah: 'Aísáyà',
  Jeremiah: 'Jeremáyà', Lamentations: 'Ìpohùnréré', Ezekiel: 'Ìsíkíẹ́lì', Daniel: 'Dáníẹ́lì',
  Hosea: 'Hóséà', Joel: 'Jóẹ́lì', Amos: 'Ámósì', Obadiah: 'Ọbadáyà', Jonah: 'Jónà',
  Micah: 'Míkà', Nahum: 'Náhúmù', Habakkuk: 'Hábákúkù', Zephaniah: 'Sefanáyà',
  Haggai: 'Hagáyì', Zechariah: 'Sekaráyà', Malachi: 'Málákì',
  Matthew: 'Mátíù', Mark: 'Máàkù', Luke: 'Lúùkù', John: 'Jòhánù', Acts: 'Ìṣe Àwọn Àpọ́stélì',
  Romans: 'Róòmù', '1 Corinthians': '1 Kọ́ríńtì', '2 Corinthians': '2 Kọ́ríńtì',
  Galatians: 'Gálátíà', Ephesians: 'Éfésù', Philippians: 'Fílípì',
  Colossians: 'Kólósè', '1 Thessalonians': '1 Tẹsalóníkà',
  '2 Thessalonians': '2 Tẹsalóníkà', '1 Timothy': '1 Tímótì', '2 Timothy': '2 Tímótì',
  Titus: 'Títù', Philemon: 'Fílémónì', Hebrews: 'Hébérù', James: 'Jákọ́bù',
  '1 Peter': '1 Pétérù', '2 Peter': '2 Pétérù', '1 John': '1 Jòhánù', '2 John': '2 Jòhánù',
  '3 John': '3 Jòhánù', Jude: 'Júúdà', Revelation: 'Ìfihàn',
};

const TABLES: Partial<Record<LanguageCode, BookMap>> = {
  kjv: EN, twi: TW, yor: YO, swa: SW, rv1960: ES, jfa: PT, lsg: FR,
};

/** English canonical → display label "{Native} | {English}" (or just the native if same). */
export function bookLabel(englishName: string, lang: LanguageCode): string {
  const native = TABLES[lang]?.[englishName] ?? englishName;
  if (native === englishName) return englishName;
  return `${native} | ${englishName}`;
}

/** Just the native name (no English). */
export function bookNative(englishName: string, lang: LanguageCode): string {
  return TABLES[lang]?.[englishName] ?? englishName;
}
