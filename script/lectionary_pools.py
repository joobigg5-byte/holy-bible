"""
Curated reference pools, one per watch.

Morning   — mercy, light, waking, strength for the day ahead, praise at dawn.
Afternoon — endurance, work, patience under load, integrity, the middle of things.
Evening   — peace, rest, protection through the night, stillness, examination.

References are (book, chapter, verse_start, verse_end_or_None).
Hand-picked; the generator fills any shortfall from themed search.
"""

MORNING = [
    ("Lamentations",3,22,23),("Psalms",5,3,None),("Psalms",30,5,None),("Psalms",143,8,None),
    ("Psalms",90,14,None),("Psalms",59,16,None),("Psalms",57,8,None),("Psalms",63,1,None),
    ("Isaiah",40,31,None),("Isaiah",50,4,None),("Isaiah",43,19,None),("Isaiah",60,1,None),
    ("Mark",1,35,None),("Psalms",118,24,None),("Psalms",19,1,None),("Psalms",92,2,None),
    ("Proverbs",8,17,None),("Psalms",46,5,None),("Zephaniah",3,17,None),("Psalms",103,1,None),
    ("Psalms",103,2,None),("Psalms",103,3,None),("Psalms",103,4,None),("Psalms",103,5,None),
    ("Ecclesiastes",11,6,None),("Psalms",108,2,None),("Job",38,12,None),("Hosea",6,3,None),
    ("Psalms",65,8,None),("2 Corinthians",4,16,None),("Romans",12,1,None),("Romans",12,2,None),
    ("Ephesians",5,14,None),("Colossians",3,1,None),("Colossians",3,2,None),("Philippians",3,13,14),
    ("Psalms",139,17,18),("Psalms",121,1,2),("Psalms",121,3,4),("Psalms",121,7,8),
    ("Deuteronomy",33,25,None),("Joshua",1,9,None),("Isaiah",41,10,None),("Isaiah",41,13,None),
    ("Jeremiah",29,11,None),("Proverbs",3,5,6),("Proverbs",16,3,None),("Psalms",37,5,None),
    ("Psalms",32,8,None),("Psalms",25,4,5),("Psalms",143,10,None),("Psalms",119,105,None),
    ("Matthew",6,33,None),("Matthew",6,34,None),("Lamentations",3,25,26),("Psalms",27,1,None),
    ("Psalms",27,14,None),("Isaiah",26,3,None),("Psalms",16,8,None),("Psalms",16,11,None),
    ("Nehemiah",8,10,None),("Habakkuk",3,19,None),("Psalms",18,32,None),("Psalms",28,7,None),
    ("Isaiah",12,2,None),("Exodus",15,2,None),("Psalms",84,11,None),("Psalms",89,15,16),
    ("Psalms",113,3,None),("Malachi",4,2,None),("Luke",1,78,79),("John",8,12,None),
    ("Matthew",5,14,16),("2 Peter",1,19,None),("Proverbs",4,18,None),("1 Thessalonians",5,5,None),
    ("Romans",13,12,None),("Psalms",36,9,None),("Psalms",97,11,None),("Isaiah",58,8,None),
    ("Psalms",30,11,12),("Psalms",100,1,2),("Psalms",100,4,5),("Psalms",95,1,2),
    ("Psalms",34,1,None),("Psalms",34,8,None),("Psalms",145,2,None),("Psalms",146,2,None),
    ("Isaiah",55,12,None),("Nehemiah",9,6,None),("Genesis",1,3,None),("Genesis",8,22,None),
    ("Psalms",104,23,None),("Psalms",127,1,None),("Proverbs",6,6,8),("Proverbs",13,4,None),
]

AFTERNOON = [
    ("Galatians",6,9,None),("Colossians",3,23,24),("Ecclesiastes",9,10,None),("1 Corinthians",15,58,None),
    ("Proverbs",12,11,None),("Proverbs",14,23,None),("Proverbs",21,5,None),("Proverbs",22,29,None),
    ("Hebrews",12,1,None),("Hebrews",12,2,None),("Hebrews",12,3,None),("Hebrews",10,36,None),
    ("James",1,2,3),("James",1,4,None),("James",1,12,None),("Romans",5,3,4),
    ("Romans",8,25,None),("Romans",12,11,None),("Romans",12,12,None),("2 Thessalonians",3,13,None),
    ("Philippians",4,13,None),("Philippians",2,14,15),("Philippians",1,6,None),("Philippians",3,14,None),
    ("2 Timothy",2,3,None),("2 Timothy",4,7,None),("1 Timothy",6,11,None),("1 Timothy",4,12,None),
    ("Psalms",90,17,None),("Psalms",128,2,None),("Proverbs",16,9,None),("Proverbs",19,21,None),
    ("Proverbs",3,9,10),("Proverbs",11,25,None),("Proverbs",15,1,None),("Proverbs",15,22,None),
    ("Proverbs",17,17,None),("Proverbs",18,24,None),("Proverbs",27,17,None),("Ecclesiastes",4,9,10),
    ("Matthew",5,16,None),("Matthew",7,12,None),("Matthew",25,21,None),("Luke",16,10,None),
    ("Micah",6,8,None),("Isaiah",1,17,None),("Proverbs",31,8,9),("James",2,17,None),
    ("Galatians",5,22,23),("Galatians",6,2,None),("Ephesians",4,29,None),("Ephesians",4,32,None),
    ("Colossians",3,12,None),("Colossians",3,13,None),("1 Peter",3,8,None),("1 Peter",4,10,None),
    ("Romans",12,18,None),("Romans",14,19,None),("Hebrews",13,16,None),("1 John",3,18,None),
    ("Proverbs",25,11,None),("Proverbs",16,24,None),("James",1,19,None),("James",3,17,None),
    ("Proverbs",10,4,None),("Proverbs",13,11,None),("Proverbs",24,27,None),("Proverbs",27,23,None),
    ("2 Corinthians",4,8,9),("2 Corinthians",12,9,None),("Isaiah",40,29,None),("Psalms",73,26,None),
    ("Psalms",138,8,None),("Psalms",57,2,None),("Nehemiah",6,3,None),("Ezra",10,4,None),
    ("1 Chronicles",28,20,None),("Haggai",2,4,None),("Zechariah",4,6,None),("Isaiah",43,2,None),
    ("Deuteronomy",31,8,None),("Psalms",55,22,None),("1 Peter",5,7,None),("Matthew",11,29,None),
    ("Proverbs",28,20,None),("Proverbs",20,4,None),("Colossians",4,5,None),("Ephesians",5,15,16),
    ("Titus",2,7,None),("Titus",3,14,None),("Romans",13,8,None),("Luke",6,38,None),
]

EVENING = [
    ("John",14,27,None),("Psalms",4,8,None),("Psalms",3,5,None),("Psalms",127,2,None),
    ("Proverbs",3,24,None),("Psalms",63,6,None),("Psalms",42,8,None),("Psalms",77,6,None),
    ("Psalms",119,148,None),("Psalms",134,1,None),("Psalms",141,2,None),("Psalms",16,7,None),
    ("Psalms",46,10,None),("Psalms",23,1,2),("Psalms",23,3,None),("Psalms",23,4,None),
    ("Psalms",23,5,6),("Matthew",11,28,None),("Matthew",11,29,30),("Isaiah",30,15,None),
    ("Exodus",33,14,None),("Hebrews",4,9,10),("Jeremiah",6,16,None),("Mark",6,31,None),
    ("Psalms",91,1,None),("Psalms",91,2,None),("Psalms",91,4,None),("Psalms",91,5,None),
    ("Psalms",91,11,None),("Psalms",121,5,6),("Psalms",34,7,None),("Psalms",56,3,None),
    ("Psalms",62,1,2),("Psalms",62,5,6),("Psalms",61,2,None),("Psalms",18,2,None),
    ("Psalms",31,5,None),("Luke",23,46,None),("Psalms",139,7,8),("Psalms",139,11,12),
    ("Psalms",139,23,24),("Lamentations",3,40,None),("Psalms",4,4,None),("Psalms",26,2,None),
    ("2 Corinthians",13,5,None),("1 John",1,9,None),("Psalms",51,10,None),("Psalms",32,5,None),
    ("Ephesians",4,26,None),("Colossians",3,15,None),("Philippians",4,6,None),("Philippians",4,7,None),
    ("Philippians",4,8,None),("Philippians",4,19,None),("Isaiah",26,3,None),("John",16,33,None),
    ("Romans",15,13,None),("2 Thessalonians",3,16,None),("Numbers",6,24,26),("Psalms",29,11,None),
    ("Psalms",147,3,None),("Psalms",34,18,None),("Psalms",145,18,None),("Psalms",116,7,None),
    ("Psalms",131,2,None),("Isaiah",57,15,None),("Matthew",6,6,None),("Psalms",19,14,None),
    ("Psalms",90,1,None),("Psalms",90,12,None),("Deuteronomy",33,27,None),("Psalms",73,25,26),
    ("Psalms",143,8,None),("Psalms",130,5,6),("Psalms",30,5,None),("Isaiah",54,10,None),
    ("Romans",8,38,39),("John",10,28,None),("Hebrews",13,5,None),("Hebrews",13,8,None),
    ("Psalms",136,1,None),("1 Thessalonians",5,18,None),("Psalms",103,8,None),("Psalms",145,8,9),
    ("Psalms",86,15,None),("Micah",7,18,None),("Psalms",8,3,4),("Psalms",33,20,21),
    ("Revelation",21,4,None),("John",14,1,None),("John",14,2,3),("Psalms",17,8,None),
]
