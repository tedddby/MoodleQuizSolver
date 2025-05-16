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
    const optionsText = options.map((opt, index) => {
        const letter = String.fromCharCode(65 + index);
        return `${letter}. ${opt}`;
    }).join('\n');

    const prompt = `Question: ${questionText}\n\nOptions:\n${optionsText}\n\nPlease provide the correct answer by stating the letter only (e.g., "A").`;

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

    return answer.trim().toUpperCase();
};


const startSolving = async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    console.log(1);

    await page.goto('https://el.sustech.edu/login/index.php');
    await page.type('#username', MOODLE_USERNAME);
    await page.type('#password', MOODLE_PASSWORD);
    await Promise.all([
        page.click('#loginbtn'),
        page.waitForNavigation()
    ]);

    await page.goto('https://el.sustech.edu/mod/quiz/view.php?id='+QUIZ_ID);

    console.log('⏳ Waiting 2 minutes for password input...');
    await page.waitForNavigation();
    await new Promise(resolve => setTimeout(resolve, 4 * 60 * 1000));
    console.log('Starting quiz solving...');

    const questions = await page.$$('.que');
    for (const question of questions) {
        const qText = await question.$eval('.qtext', el => el.innerText.trim());

        const optionLabels = await question.$$('label');
        const optionTexts = [];

        for (const label of optionLabels) {
            const text = await label.evaluate(el => el.innerText.trim());
            optionTexts.push(text);
        }

        const answerLetter = await getAnswerFromGemini(qText, optionTexts);
        const selectedIndex = answerLetter.charCodeAt(0) - 65;

        if (optionLabels[selectedIndex]) {
            const forAttr = await optionLabels[selectedIndex].evaluate(el => el.getAttribute('for'));
            const input = await question.$(`#${forAttr}`);
            if (input) await input.click();
            console.log(`[✅] Answered: ${qText} → ${answerLetter}`);
        } else {
            console.warn(`[⚠️] Gemini returned invalid answer: "${answerLetter}"`);
        }
    }

    const finishBtn = await page.$('input[type="submit"][value*="Finish"]');
    if (finishBtn) {
        console.log("[✅][✅] All questions have been answered, now go check them manually and submit your attempt");
    }

    //await browser.close();
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
