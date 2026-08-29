// Twi (Akuapem) – select chapters for offline use
const twiChapters: Record<string, Record<number, Record<string, string>>> = {
    'Matthew': {
      1: {
        '1': 'Nhoma a ɛkyerɛ Yesu Kristo a ɔyɛ David ba, na ɔyɛ Abraham ba no mmusuyɛ ho asɛm.',
        '2': 'Abraham woo Isak; Isak woo Yakob; Yakob woo Yuda ne ne nuanom.',
        '3': 'Yuda ne Tamar woo Peres ne Sera; Peres woo Hesron; Hesron woo Ram.',
        '4': 'Ram woo Aminadab; Aminadab woo Nason; Nason woo Salmon.',
        '5': 'Salmon ne Rahab woo Boas; Boas ne Rut woo Obed; Obed woo Yesse.',
        '6': 'Yesse woo Ɔhene David. David ne Uria yere woo Salomo.',
        '7': 'Salomo woo Rehoboam; Rehoboam woo Abia; Abia woo Asa.',
        '8': 'Asa woo Yehosafat; Yehosafat woo Yoram; Yoram woo Usia.',
        '9': 'Usia woo Yotam; Yotam woo Ahas; Ahas woo Hesekia.',
        '10': 'Hesekia woo Manase; Manase woo Amon; Amon woo Yosia.',
        '11': 'Yosia woo Yekonia ne ne nuanom, bere a wɔfaa wɔn nnommum kɔɔ Babilon no.',
        '12': 'Wɔfaa wɔn kɔɔ Babilon akyi no, Yekonia woo Salatiel; Salatiel woo Serubabel.',
        '13': 'Serubabel woo Abiud; Abiud woo Eliakim; Eliakim woo Asor.',
        '14': 'Asor woo Sadok; Sadok woo Akim; Akim woo Eliud.',
        '15': 'Eliud woo Eleasar; Eleasar woo Matan; Matan woo Yakob.',
        '16': 'Yakob woo Yosef a ɔyɛ Maria kunu; na Maria woo Yesu a wɔfrɛ no Kristo no.',
        '17': 'Enti awoɔ ntoatoasoɔ no nyinaa fi Abraham so kosi David so yɛ awoɔ ntoatoasoɔ dunan; na fi David so kosi bere a wɔfaa wɔn nnommum kɔɔ Babilon no yɛ awoɔ ntoatoasoɔ dunan; na fi bere a wɔfaa wɔn nnommum kɔɔ Babilon no kosi Kristo so nso yɛ awoɔ ntoatoasoɔ dunan.',
        '18': 'Na Yesu Kristo awoɔ no sii sɛɛ: na wɔayɛ ne na Maria ɛna Yosef aware, na ansa na wɔrehyia no, wɔhunuu sɛ wanyinsɛn firi Honhom Kronkron mu.',
        '19': 'Na Yosef a ɔyɛ ne kunu no, esiane sɛ na ɔyɛ ɔtreneeni na ɔmpɛ sɛ ɔbɔ no din aguam nti, ɔyɛɛ n’adwene sɛ ɔbɛgyaa no kokoa mu.',
        '20': 'Nanso ɔredwene eyi ho no, hwɛ, Awurade bɔfoɔ daeɛ mu yii ne ho adi kyerɛɛ no sɛ: “Yosef, David ba, nsuo sɛ wofa wo yere Maria; na deɛ ɔda ne yafunu mu no firi Honhom Kronkron mu.',
        '21': 'Na ɔbɛwo ɔbabarima, na wobɛfrɛ no Yesu, ɛfiri sɛ ɔno na ɔbɛgye ne nkurɔfoɔ afiri wɔn bɔne mu.”',
        '22': 'Na yei nyinaa sii sɛdeɛ ɛbɛyɛ na asɛm a Awurade nam Kɔmhyɛni no so kaa no bɛba mu a wɔka sɛ:',
        '23': '“Hwɛ, ɔbaabun bɛnyinsɛn na awo ɔbabarima, na wɔbɛfrɛ no Immanuel” – a ɛkyerɛ sɛ: Onyankopɔn ne yɛn.',
        '24': 'Na Yosef fi nna mu sɔree no, ɔyɛɛ sɛdeɛ Awurade bɔfoɔ no hyɛɛ no no; na ɔfaa ne yere.',
        '25': 'Na wannim no kɔsii sɛ ɔwoo ɔbabarima no; na ɔtoo ne din Yesu.',
      },
    },
    'John': {
      1: {
        '1': 'Mfitiaseɛ no na Asɛm no wɔ hɔ, na Asɛm no ne Onyankopɔn na ɛwɔ hɔ, na Asɛm no yɛ Onyankopɔn.',
        '2': 'Ɔno na mfitiaseɛ no na ɔne Onyankopɔn na ɛwɔ hɔ.',
        '3': 'Ne mu na wɔnam so yɛɛ ade nyinaa; na wɔamfa no anyɛ ade baako a wɔyɛeɛ no mu biara.',
        // ... keep all the existing John 1 verses as before, up to 51
      },
      2: { /* existing */ },
      3: { /* existing */ },
    },
  };
  
  export function getBundledTwiChapter(book: string, chapter: number): Record<string, string> | null {
    const bookData = twiChapters[book];
    if (!bookData) return null;
    return bookData[chapter] || null;
  } 