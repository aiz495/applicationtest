let timer;
let timeLeft = 1500; // 25 minutes (Pomodoro)
let isRunning = false;
let currentMode = 'pomodoro';
let sessionCount = 0; // To track Pomodoro cycles for long break
let sessionLog = []; // To store the log of sessions

const timeDisplay = document.getElementById('time');
const startButton = document.getElementById('start');
const resetButton = document.getElementById('reset');
const pomodoroButton = document.getElementById('pomodoro');
const shortBreakButton = document.getElementById('short-break');
const longBreakButton = document.getElementById('long-break');
const logList = document.getElementById('log-list');
const bellSound = document.getElementById('bell-sound');

function updateTimeDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  timeDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  timer = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(timer);
      isRunning = false;
      sessionCount++;

      // Log session and auto switch
      sessionLog.push(currentMode);
      updateSessionLog();
      autoSwitchMode();
      resetTimer();
    } else {
      timeLeft--;
      updateTimeDisplay();
    }
  }, 1000);
}

function resetTimer() {
  if (currentMode === 'pomodoro') {
    timeLeft = 1500; // 25 minutes
  } else if (currentMode === 'short-break') {
    timeLeft = 300; // 5 minutes
  } else if (currentMode === 'long-break') {
    timeLeft = 900; // 15 minutes
  }
  updateTimeDisplay();
}

function autoSwitchMode() {
  if (sessionCount % 8 === 0) {
    // After 4 Pomodoros (8 cycles), switch to long break
    setMode('long-break');
  } else if (sessionCount % 2 === 0) {
    // After each Pomodoro, switch to short break
    setMode('short-break');
  } else {
    // After each short break, switch to Pomodoro
    setMode('pomodoro');
  }
}

function setMode(mode) {
  currentMode = mode;
  resetTimer();
  setActiveButton();
  playBellSound();
  startTimer(); // Auto start after mode switch
}

function setActiveButton() {
  const buttons = document.querySelectorAll('.timer-button');
  buttons.forEach(button => button.classList.remove('active'));
  if (currentMode === 'pomodoro') pomodoroButton.classList.add('active');
  if (currentMode === 'short-break') shortBreakButton.classList.add('active');
  if (currentMode === 'long-break') longBreakButton.classList.add('active');
}

function updateSessionLog() {
  logList.innerHTML = '';
  sessionLog.forEach((session, index) => {
    const li = document.createElement('li');
    li.textContent = `Session ${index + 1}: ${session}`;
    logList.appendChild(li);
  });
}

function playBellSound() {
  bellSound.play();
}

pomodoroButton.addEventListener('click', () => setMode('pomodoro'));
shortBreakButton.addEventListener('click', () => setMode('short-break'));
longBreakButton.addEventListener('click', () => setMode('long-break'));

startButton.addEventListener('click', startTimer);
resetButton.addEventListener('click', resetTimer);

window.onload = resetTimer;
