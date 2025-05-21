const express = require('express');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const app = express();
require('dotenv').config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MOODLE_USERNAME = '';
const MOODLE_PASSWORD = '';
const QUIZ_ID = '';

const getAnswerFromGemini = async (questionText, options) => {
    const optionsText = options.join('\n\n');
    const prompt = `Question: ${questionText}\n\nOptions:\n${optionsText}\n\nPlease provide the correct answer by stating the full exact answer text (e.g., "a. this is the correct answer").`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }]
        }),
    });

    if (!response.ok) {
        console.log("gemini err");
        throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!answer) {
        throw new Error('No answer returned from Gemini');
    }

    return answer.trim();
};


const startSolving = async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://el.sustech.edu/login/index.php');
    await page.type('#username', MOODLE_USERNAME);
    await page.type('#password', MOODLE_PASSWORD);
    await Promise.all([
        page.click('#loginbtn'),
        page.waitForNavigation()
    ]);

    await page.goto('https://el.sustech.edu/mod/quiz/view.php?id='+QUIZ_ID);

    console.log('⏳ Waiting for password input...');
    await page.waitForNavigation();
    console.log('Starting quiz solving...');

    let nextPage = await page.$('input[type="submit"][value*="Next page"]');
    if(nextPage){
        while (nextPage !== null) {
            await solveQuestion(page);
            await nextPage.click();
            await page.waitForNavigation();
            nextPage = await page.$('input[type="submit"][value*="Next page"]');
        }
        await solveQuestion(page);
    }else{
        await solveQuestion(page);
    }

    const finishBtn = await page.$('input[type="submit"][value*="Finish"]');

    if (finishBtn) {
        console.log("[✅][✅] All questions have been answered, now go check them manually and submit your attempt");
    }
}

const solveQuestion = async (page) => {
    try{
        const qText = await page.$eval('.qtext', el => el.innerText.trim());
        const options = await page.$$eval('.que.multichoice .answer div[data-region="answer-label"]', els =>
            els.map(el => el.textContent.trim())
        );

        const correctAnswer = await getAnswerFromGemini(qText, options);

        await page.$$eval('.answer div[data-region="answer-label"]', (labels, correctAnswerText) => {
            for (const label of labels) {
                const text = label.textContent.trim().replace(/\s+/g, ' ');
                if (text.toLowerCase() === correctAnswerText.trim().toLowerCase()) {
                    const container = label.closest('.r0, .r1');
                    if (container) {
                        const input = container.querySelector('input[type="radio"]');
                        if (input) {
                            input.click();
                            break;
                        }
                    }
                }
            }
        }, correctAnswer);


        console.log(`[✅] Question: ${qText} --> Answer: ${correctAnswer}`);
    }catch (e){
        console.log(e)
        let url = await page.url();
        console.log(`[⚠️] Question flagged -> ${url}`);
    }
}

app.get('/start', async (req, res) => {
    try {
        await startSolving()
    } catch (error) {
        console.error(error);
        res.status(500).send('Error occurred');
    }
});

app.listen(3344, () => {
    console.log("running")
});
