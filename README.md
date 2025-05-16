
# 🧠 Moodle Quiz Solver with Gemini AI

This Node.js project automates solving Moodle quizzes by using Puppeteer to interact with the Moodle web interface and Google's Gemini AI to fetch the correct answers.

---

## ✨ Features

- 🚀 Automates Moodle quiz solving using Puppeteer
- 🤖 Leverages Gemini API to get AI-generated answers
- 📦 Simple Express server to trigger the solving process via API
- 🔐 Environment variables for secure configuration

---

## 📁 Project Structure

```
project/
├── app.js                  # Main server & logic
├── .env                    # Environment variables
├── package.json            # Project metadata and dependencies
├── node_modules/           # Installed dependencies
```

---

## 🔧 Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/tedddby/MoodleQuizSolver.git
cd MoodleQuizSolver
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env` file

Create a `.env` file in the root directory with the following variables:

```env
GEMINI_API=your_gemini_api_key
MOODLE_USERNAME=your_moodle_username
MOODLE_PASSWORD=your_moodle_password
QUIZ_ID=quiz_id
```

---

## 🚀 Running the App

Start the server:

```bash
node app.js
```

Then trigger the solving process by sending a request to your endpoint (e.g., `/start` or similar depending on the defined routes in `app.js`).

---

## 📦 API Overview

If your `app.js` exposes an endpoint like `/start`, you can trigger the solving using:

```bash
curl -X GET http://localhost:4433/start
```

> ⚠️ Make sure you’ve set the correct quiz ID and login credentials in your `.env`.

---

## 🧠 How It Works

1. Puppeteer logs into Moodle using the credentials.
2. It navigates to the quiz and reads each question and its options.
3. For each question, the app sends a prompt to Gemini API.
4. The AI responds with the most likely correct option.
5. Puppeteer selects the answer and moves to the next.

---

## 🛡️ Security Considerations

- Store your API keys and credentials only in `.env`.
- Do not commit `.env` or any sensitive data to version control.

---

## 📄 License

This project is licensed under the MIT License. Feel free to use and modify it as needed.

---

## 🤝 Contributions

Feel free to fork and submit pull requests if you'd like to improve this project!
