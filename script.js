// ============================================================
// 「待ち時間で創作する」Ver.0.1
// 変更しやすい設定は、このファイルの上の方にまとめています。
// ============================================================

// 3分 = 180秒。0になっても創作は続けられます。
const TIME_LIMIT = 180;

// ジャンルを変更したい場合は、ここを書き換えてください。
const GENRES = ["ホラー", "ミステリー", "恋愛", "コメディ", "SF"];

// 常用語を変更したい場合は、ここを書き換えてください。
const NORMAL_WORDS = {
  person: ["探偵","老人","子供","警察","先生","医者","看護師","父親","母親","運転手","同僚","同級生","小学生","中学生","高校生","店員","店長","社長","配信者","宇宙人","後輩","先輩","強盗","テロリスト","受刑者","病人","赤ちゃん","聖職者","ロボット"],
  place: ["学校","保健室","体育館","ボール","体操服","靴","帽子","図書館","本","教室","筆箱","楽器","手袋","絵の具","絵画","空港","飛行機","改札","電車","校庭","ショッピングモール","博物館","水族館","魚","宝石","居酒屋","屋上","海","プール","遊園地","秘密基地","教会","神社","御神体","寺","鈴","十字架","ジム","ダンベル","船","錨","廃墟","コンビニ","パソコン","検索エンジン","ぬいぐるみ","貝","地図"],
  event: ["ゆれる","時間が止まる","強風","壊れる","腐る","割れる","触れる","時間が巻き戻る","喜ぶ","笑う","悲しむ","怒られる","笑われる"]
};

// 難易語を変更したい場合は、ここを書き換えてください。
const DIFFICULT_WORDS = {
  person: ["シェイプシフター","司祭","侍者","キメラ","クローン","学者","教員","従兄弟","再従兄弟","母親","医者","弟","父親","オートマタ","ロボット","犬"],
  place: ["風媒花","ポプリ","ルルドの泉","袋地","スペースデブリ","虫媒花","沈香","薬籠","暗渠","聖遺物","聖櫃","流星塵","中性子星","珪化木","生痕化石","放散虫","粘菌","牢獄","閼伽桶","霊場"],
  event: ["斃死","中直り","死戦期呼吸","チェンジリング","フィリバスター","回光返照","荼毘","検案","死後変化","擬死","磁気嵐","太陽風"]
};

const state = {
  mode: null,
  genre: "",
  person: "",
  place: "",
  event: "",
  hero: "",
  happening: "",
  after: "",
  ending: "",
  remaining: TIME_LIMIT,
  timerId: null,
  timerStarted: false
};

const $ = (id) => document.getElementById(id);
const screens = document.querySelectorAll(".screen");

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function chooseWords() {
  const words = state.mode === "difficult" ? DIFFICULT_WORDS : NORMAL_WORDS;
  state.person = randomItem(words.person);
  state.place = randomItem(words.place);
  state.event = randomItem(words.event);
}

function chooseGenre() {
  state.genre = randomItem(GENRES);
}

function showScreen(number) {
  screens.forEach((screen) => screen.classList.remove("active"));
  const target = $("screen" + number);
  if (!target) return;
  target.classList.add("active");

  const progress = number === 1 ? 0 : number === 7 ? 100 : ((number - 1) / 6) * 100;
  $("progress").style.width = progress + "%";
  window.scrollTo(0, 0);
}

function updateHeaderGenres() {
  // 画面2で決まったジャンルを、画面3〜6にも引き継ぎます。
  ["genre2", "genre2Text", "genre3", "genre4", "genre5", "genre6", "finalGenre"]
    .forEach((id) => {
      const element = $(id);
      if (element) element.textContent = state.genre;
    });

  // 画面2で決まった「登場人物 / もの・場所 / できごと」も、
  // 画面3〜6の上部に常に表示します。
  ["3", "4", "5", "6"].forEach((screenNo) => {
    const person = $("person" + screenNo);
    const place = $("place" + screenNo);
    const event = $("event" + screenNo);

    if (person) person.textContent = state.person;
    if (place) place.textContent = state.place;
    if (event) event.textContent = state.event;
  });
}

function updateWordScreen() {
  updateHeaderGenres();
  $("person2").textContent = state.person;
  $("place2").textContent = state.place;
  $("event2").textContent = state.event;
}

function updateStoryScreens() {
  updateHeaderGenres();
  $("hero4").textContent = state.hero;
  $("hero5").textContent = state.hero;
  $("hero6").textContent = state.hero;
  $("happening5").textContent = state.happening;
  $("happening6").textContent = state.happening;
  $("after6").textContent = state.after;
}

function updateFinalScreen() {
  $("finalGenre").textContent = state.genre;
  $("finalPerson").textContent = state.person;
  $("finalPlace").textContent = state.place;
  $("finalEvent").textContent = state.event;
  $("finalHero").textContent = state.hero;
  $("finalHappening").textContent = state.happening;
  $("finalAfter").textContent = state.after;
  $("finalEnding").textContent = state.ending;
}

function requireInput(input) {
  if (!input.value.trim()) {
    input.classList.add("invalid");
    input.focus();
    return false;
  }
  input.classList.remove("invalid");
  return true;
}

function renderTimer() {
  const minutes = Math.floor(state.remaining / 60);
  const seconds = state.remaining % 60;
  $("timer").textContent =
    String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");

  if (state.remaining === 0) $("timer").classList.add("time-up");
  else $("timer").classList.remove("time-up");
}

function startTimer() {
  if (state.timerStarted) return;
  state.timerStarted = true;

  state.timerId = setInterval(() => {
    if (state.remaining > 0) {
      state.remaining--;
      renderTimer();
    } else {
      clearInterval(state.timerId);
    }
  }, 1000);
}

function resetAll() {
  clearInterval(state.timerId);

  state.mode = null;
  state.genre = "";
  state.person = "";
  state.place = "";
  state.event = "";
  state.hero = "";
  state.happening = "";
  state.after = "";
  state.ending = "";
  state.remaining = TIME_LIMIT;
  state.timerId = null;
  state.timerStarted = false;

  ["heroInput","happeningInput","afterInput","endingInput"].forEach((id) => {
    if ($(id)) {
      $(id).value = "";
      $(id).classList.remove("invalid");
    }
  });

  renderTimer();
  showScreen(1);
}

function saveNotice() {
  // ブラウザの標準機能だけでスクリーンショット保存を行うのは難しいため、
  // Ver.0.1ではスクリーンショットを撮る方法を案内します。
  alert("完成画面をスクリーンショットで保存できます。");
}

// 画面1
document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    chooseGenre();
    chooseWords();
    updateWordScreen();
    startTimer();
    showScreen(2);
  });
});

// 画面2：引き直す
$("redrawButton").addEventListener("click", () => {
  chooseWords();
  updateWordScreen();
});

// 画面2：はじめる
$("startButton").addEventListener("click", () => {
  // 画面2で決まったジャンルを画面3へ引き継ぎます。
  updateHeaderGenres();
  updateStoryScreens();
  showScreen(3);
});

// 画面3
$("next3").addEventListener("click", () => {
  const input = $("heroInput");
  if (!requireInput(input)) return;

  state.hero = input.value.trim();
  // 画面2のジャンルを画面4へ引き継ぎます。
  updateHeaderGenres();
  updateStoryScreens();
  showScreen(4);
});

// 画面4
$("next4").addEventListener("click", () => {
  const input = $("happeningInput");
  if (!requireInput(input)) return;

  state.happening = input.value.trim();
  // 画面2のジャンルを画面5へ引き継ぎます。
  updateHeaderGenres();
  updateStoryScreens();
  showScreen(5);
});

// 画面5
$("next5").addEventListener("click", () => {
  const input = $("afterInput");
  if (!requireInput(input)) return;

  state.after = input.value.trim();
  // 画面2のジャンルを画面6へ引き継ぎます。
  updateHeaderGenres();
  updateStoryScreens();
  showScreen(6);
});

// 画面6
$("finishButton").addEventListener("click", () => {
  const input = $("endingInput");
  if (!requireInput(input)) return;

  state.ending = input.value.trim();
  updateFinalScreen();
  showScreen(7);
});

// 画面7：保存
$("saveButton").addEventListener("click", saveNotice);

// 画面7：もう一度
$("restartButton").addEventListener("click", resetAll);

renderTimer();
