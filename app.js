const express = require('express');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const app = express();
require('dotenv').config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MOODLE_USERNAME = 'student';
const MOODLE_PASSWORD = 'moodle25';
const QUIZ_ID = '1655';

const getAnswerFromGemini = async (questionText, options) => {
    const optionsText = options.join('\n\n');
    const prompt = `Question: ${questionText}\n\nOptions:\n${optionsText}\n\nPlease provide the correct answer by stating the full exact answer text (only one answer can be correct) (e.g., "this is the correct answer").`;

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
        throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!answer) {
        throw new Error('No answer returned from Gemini');
    }

    //console.log(answer);

    return answer.trim();
};


const startSolving = async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://school.moodledemo.net/login/index.php'); //https://el.sustech.edu/login/index.php
    await page.type('#username', MOODLE_USERNAME);
    await page.type('#password', MOODLE_PASSWORD);
    await Promise.all([
        page.click('#loginbtn'),
        page.waitForNavigation()
    ]);

    await page.goto('https://school.moodledemo.net/mod/quiz/view.php?id='+QUIZ_ID); //'https://el.sustech.edu/mod/quiz/view.php?id='+QUIZ_ID

    console.log('⏳ Waiting for password input...');
    await page.waitForNavigation();
    console.log('Starting quiz solving...');

    let nextPage = await page.$('input[type="submit"][value*="Next page"]');
    if(nextPage){
        while (nextPage !== null) {
            let questions = await page.$$('.que');
            if(questions.length > 1){
                for (const question of questions) {
                    await solveQuestion(question);
                }
            }else{
                await solveQuestion(questions);
            }
            await nextPage.click();
            await page.waitForNavigation();
            nextPage = await page.$('input[type="submit"][value*="Next page"]');
        }
    }else{
        let questions = await page.$$('.que');
        for (const question of questions) {
            await solveQuestion(question);
        }
    }

    const finishBtn = await page.$('input[type="submit"][value*="Finish"]');
    if (finishBtn) {
        console.log("[✅][✅] All questions have been answered, now go check them manually and submit your attempt");
    }

    //await browser.close();
}

const solveQuestion = async (question) => {
    const qText = await question.$eval('.qtext', el => el.innerText.trim());
    const options = await question.$$eval('.answer [data-region="answer-label"] p', elements =>
        elements.map(el => el.innerText.trim())
    );

    const correctAnswer = await getAnswerFromGemini(qText, options);

    await question.$$eval('.answer div[data-region="answer-label"]', (labels, text) => {
        for (const label of labels) {
            const p = label.querySelector('p');
            if (p && p.innerText.trim() === text.trim()) {
                const input = label.closest('.r0, .r1')?.querySelector('input[type="radio"]');
                if (input) input.click();
                break;
            }
        }
    }, correctAnswer);
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
