const fs = require('fs');
const path = require('path');

// Bible JSON 파일 읽기
const bibleJsonPath = '/Users/seraph/Desktop/개발/bible.json';
const bibleData = JSON.parse(fs.readFileSync(bibleJsonPath, 'utf-8'));

// SQL INSERT 문 생성
const sqlStatements = [];

// 책 이름 매핑 (약어 -> 전체 이름)
const bookNames = {
    '창': '창세기', '출': '출애굽기', '레': '레위기', '민': '민수기', '신': '신명기',
    '수': '여호수아', '삿': '사사기', '룻': '룻기', '삼상': '사무엘상', '삼하': '사무엘하',
    '왕상': '열왕기상', '왕하': '열왕기하', '대상': '역대상', '대하': '역대하',
    '스': '에스라', '느': '느헤미야', '에': '에스더', '욥': '욥기', '시': '시편',
    '잠': '잠언', '전': '전도서', '아': '아가', '사': '이사야', '렘': '예레미야',
    '애': '예레미야애가', '겔': '에스겔', '단': '다니엘', '호': '호세아', '욜': '요엘',
    '암': '아모스', '옵': '오바댜', '욘': '요나', '미': '미가', '나': '나훔',
    '합': '하박국', '습': '스바냐', '학': '학개', '슥': '스가랴', '말': '말라기',
    '마': '마태복음', '막': '마가복음', '눅': '누가복음', '요': '요한복음', '행': '사도행전',
    '롬': '로마서', '고전': '고린도전서', '고후': '고린도후서', '갈': '갈라디아서',
    '엡': '에베소서', '빌': '빌립보서', '골': '골로새서', '살전': '데살로니가전서',
    '살후': '데살로니가후서', '딤전': '디모데전서', '딤후': '디모데후서', '딛': '디도서',
    '몬': '빌레몬서', '히': '히브리서', '약': '야고보서', '벧전': '베드로전서',
    '벧후': '베드로후서', '요일': '요한1서', '요이': '요한2서', '요삼': '요한3서',
    '유': '유다서', '계': '요한계시록'
};

let insertCount = 0;
const batchSize = 100;
let currentBatch = [];

// JSON 데이터 파싱
for (const [key, text] of Object.entries(bibleData)) {
    // 키 형식: "창1:1" -> 책(창), 장(1), 절(1)
    const match = key.match(/^([가-힣]+)(\d+):(\d+)$/);

    if (!match) {
        console.warn(`Invalid key format: ${key}`);
        continue;
    }

    const bookAbbr = match[1];
    const chapter = parseInt(match[2]);
    const verse = parseInt(match[3]);
    const bookName = bookNames[bookAbbr] || bookAbbr;

    // SQL INSERT 문 생성
    const escapedText = text
        .replace(/\\/g, '\\\\')  // Backslash first
        .replace(/'/g, "''");     // Single quotes

    currentBatch.push(`('${bookName}', ${chapter}, ${verse}, '${escapedText}')`);
    insertCount++;

    // 배치 크기에 도달하면 SQL 문 생성
    if (currentBatch.length >= batchSize) {
        sqlStatements.push(
            `INSERT INTO bible_texts (book_name, chapter, verse, text) VALUES\n${currentBatch.join(',\n')};`
        );
        currentBatch = [];
    }
}

// 남은 데이터 처리
if (currentBatch.length > 0) {
    sqlStatements.push(
        `INSERT INTO bible_texts (book_name, chapter, verse, text) VALUES\n${currentBatch.join(',\n')};`
    );
}

// SQL 파일 저장
const sqlFilePath = path.join(__dirname, 'bible-import.sql');
const sqlContent = `-- Bible Import SQL
-- Total verses: ${insertCount}

-- Clear existing data
DELETE FROM bible_texts;

-- Insert Bible verses
${sqlStatements.join('\n\n')}
`;

fs.writeFileSync(sqlFilePath, sqlContent, 'utf-8');

console.log(`✅ SQL file created: ${sqlFilePath}`);
console.log(`📖 Total verses: ${insertCount}`);
console.log(`📝 SQL statements: ${sqlStatements.length}`);
console.log(`\nRun this command to import:`);
console.log(`npx wrangler d1 execute harash-bible-reading-db --local --file=scripts/bible-import.sql`);
