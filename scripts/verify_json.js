const fs = require('fs');
const data = JSON.parse(fs.readFileSync('d:\\VAL\\GATE\\data\\formatted_all.json', 'utf8'));

const vol = data.volumes.volume1;
for (const chapter of vol.chapters) {
    for (const q of chapter.questions) {
        if (q.answer && q.answer.includes('[')) {
            console.log("MSQ Answer:", q.answer);
        } else if (q.answer && q.answer.includes('{')) {
            console.log("NAT Answer:", q.answer);
        } else if (q.answer) {
            console.log("MCQ Answer:", q.answer);
        }
    }
}
