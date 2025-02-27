/************************************
 * タイマー用変数
 ************************************/
let timer;
let timeLeft = 1500; // 25分(秒単位)
let isRunning = false;
let currentMode = 'pomodoro';
let sessionCount = 0; // 自動切り替え判定用
let sessionLog = []; // セッションログ（モード記録など）

/************************************
 * レポート用変数・関数
 ************************************/
/*
  1. localStorageに「日付ごとの合計フォーカス時間」を保存
     形式: { "yyyy-mm-dd": 合計分数(または秒数), ... }
  2. 連続稼働日数( day streak ) を算出
  3. 過去7日ぶんなどをチャート表示
*/
const STORAGE_KEY = 'pomodoroFocusData'; // localStorageのキー名

// 日付文字列(YYYY-MM-DD)を取得
function getTodayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// セッション完了したら、25分・5分などを加算する
function addFocusTime(seconds) {
  // localStorageから取得
  let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  const today = getTodayString();

  // 今日の分数を加算
  if (!data[today]) {
    data[today] = 0;
  }
  data[today] += seconds;

  // localStorageに保存
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 連続稼働日数を求める（シンプル計算）
function calculateStreak(dataObj) {
  // dataObjのキーが、'2025-02-25'などの日付。  
  // ソートして連続日数をカウント
  const dates = Object.keys(dataObj).sort();
  if (dates.length === 0) return 0;

  let streak = 1;
  let maxStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);
    // 日付差分(ミリ秒)を計算 → 日数に変換
    const diff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 1;
    }
  }
  return maxStreak;
}

// 過去7日分のデータ配列を作る → [日付, 秒数], ...
function getLast7DaysData(dataObj) {
  const result = [];
  // 今日から逆算して7日分取得
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const seconds = dataObj[key] || 0;
    // ラベル用に "(Fri) 21-Feb" みたいにしたい
    const label = d.toDateString().split(' ').slice(0, 3).join(' '); // "Fri Feb 21"
    result.push({ label, seconds });
  }
  return result;
}

/************************************
 * DOM要素の取得
 ************************************/
const timeDisplay = document.getElementById('time');
const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
const resetButton = document.getElementById('reset');
const pomodoroButton = document.getElementById('pomodoro');
const shortBreakButton = document.getElementById('short-break');
const longBreakButton = document.getElementById('long-break');
const logList = document.getElementById('log-list');
const bellSound = document.getElementById('bell-sound');

// レポート関連
const reportBtn = document.getElementById('reportBtn');
const reportModal = document.getElementById('reportModal');
const closeReportBtn = document.getElementById('closeReport');
const hoursFocusedEl = document.getElementById('hoursFocused');
const daysAccessedEl = document.getElementById('daysAccessed');
const dayStreakEl = document.getElementById('dayStreak');
const focusChartCanvas = document.getElementById('focusChart');

/************************************
 * タイマー関連のメイン関数
 ************************************/
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

      // セッション終了時の処理
      sessionLog.push(currentMode);
      updateSessionLog();

      // 今回のモードの秒数をレポートに加算
      // (Pomodoro 25分の場合は1500秒、Short Break 5分なら300秒 など)
      let sessionSec = 0;
      if (currentMode === 'pomodoro') sessionSec = 1500;
      else if (currentMode === 'short-break') sessionSec = 300;
      else if (currentMode === 'long-break') sessionSec = 900;
      addFocusTime(sessionSec);

      // モード自動切り替え
      autoSwitchMode();
      resetTimer();
    } else {
      timeLeft--;
      updateTimeDisplay();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timer);
  isRunning = false;
}

function resetTimer() {
  clearInterval(timer);
  isRunning = false;
  if (currentMode === 'pomodoro') {
    timeLeft = 1500; // 25分
  } else if (currentMode === 'short-break') {
    timeLeft = 300; // 5分
  } else if (currentMode === 'long-break') {
    timeLeft = 900; // 15分
  }
  updateTimeDisplay();
}

function autoSwitchMode() {
  // 簡易ロジック:
  //  - sessionCountが8の倍数のとき long-break へ
  //  - sessionCountが偶数のとき short-break へ
  //  - それ以外は pomodoro へ
  if (sessionCount % 8 === 0) {
    setMode('long-break');
  } else if (sessionCount % 2 === 0) {
    setMode('short-break');
  } else {
    setMode('pomodoro');
  }
}

function setMode(mode) {
  currentMode = mode;
  resetTimer();
  setActiveButton();
  playBellSound();
  startTimer(); // モード切り替え後は自動スタート
}

function setActiveButton() {
  [pomodoroButton, shortBreakButton, longBreakButton].forEach(btn => {
    btn.classList.remove('active');
  });
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

/************************************
 * レポート表示関連
 ************************************/
function openReportModal() {
  // レポート用データを読み込み
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};

  // 1. Hours Focused (全期間合計時間)  
  //    秒数 => 時間 にして小数第1位などに丸める
  const totalSeconds = Object.values(data).reduce((sum, val) => sum + val, 0);
  const hours = (totalSeconds / 3600).toFixed(1); // 時間表記
  hoursFocusedEl.textContent = hours;

  // 2. Days Accessed (何日利用したか)
  const dayCount = Object.keys(data).length;
  daysAccessedEl.textContent = dayCount;

  // 3. Day Streak (連続稼働日数の最大)
  const streak = calculateStreak(data);
  dayStreakEl.textContent = streak;

  // 4. フォーカス時間 (直近7日分) のグラフ描画
  const last7Data = getLast7DaysData(data);
  drawChart(focusChartCanvas, last7Data);

  // モーダルを表示
  reportModal.style.display = 'flex';
}

function closeReportModal() {
  reportModal.style.display = 'none';
}

// Chart.jsなどを使ってグラフを描画する例
// 公式: https://www.chartjs.org/
function drawChart(canvas, last7Data) {
  // もし既存のChartインスタンスがあれば破棄する、などの処理が必要
  // 簡単に new するだけのサンプル
  const labels = last7Data.map(d => d.label);
  const secondsArr = last7Data.map(d => (d.seconds / 60).toFixed(1)); // 分単位表示

  // CDNscriptingでChart.jsを使うなら、index.htmlに<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>を追加
  if (typeof Chart === 'undefined') {
    // Chart.jsがなければ何もしない
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.fillText('Chart.jsが読み込まれていません。', 10, 50);
    return;
  }

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Focus (minutes)',
          data: secondsArr,
          backgroundColor: 'rgba(220, 53, 69, 0.7)',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

/************************************
 * イベントリスナー設定
 ************************************/
pomodoroButton.addEventListener('click', () => setMode('pomodoro'));
shortBreakButton.addEventListener('click', () => setMode('short-break'));
longBreakButton.addEventListener('click', () => setMode('long-break'));
startButton.addEventListener('click', startTimer);
stopButton.addEventListener('click', stopTimer);
resetButton.addEventListener('click', resetTimer);

reportBtn.addEventListener('click', openReportModal);
closeReportBtn.addEventListener('click', closeReportModal);

// モーダルの外側クリックで閉じたい場合
window.addEventListener('click', (e) => {
  if (e.target === reportModal) {
    closeReportModal();
  }
});

/************************************
 * ページ読み込み時の処理
 ************************************/
window.onload = () => {
  resetTimer();
  updateSessionLog();
};
