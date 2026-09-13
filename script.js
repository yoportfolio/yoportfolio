// ============================================================
// 「待ち時間で創作する」Ver.0.1
// 変更しやすい設定は、このファイルの上の方にまとめています。
// ============================================================

// ジャンルを変更したい場合は、ここを書き換えてください。
const GENRES = ["ホラー", "ミステリー", "恋愛", "コメディ", "SF"];

// 常用語（かんたん）を変更したい場合は、ここを書き換えてください。
const NORMAL_WORDS = {
  person: ["探偵","老人","子供","警察","先生","医者","看護師","父親","母親","運転手","同僚","同級生","小学生","中学生","高校生","店員","店長","社長","配信者","宇宙人","後輩","先輩","強盗","テロリスト","受刑者","病人","赤ちゃん","聖職者","ロボット"],
  place: ["学校","保健室","体育館","ボール","体操服","靴","帽子","図書館","本","教室","筆箱","楽器","手袋","絵の具","絵画","空港","飛行機","改札","電車","校庭","ショッピングモール","博物館","水族館","魚","宝石","居酒屋","屋上","海","プール","遊園地","秘密基地","教会","神社","御神体","寺","鈴","十字架","ジム","ダンベル","船","錨","廃墟","コンビニ","パソコン","検索エンジン","ぬいぐるみ","貝","地図"],
  event: ["ゆれる","時間が止まる","強風","壊れる","腐る","割れる","触れる","時間が巻き戻る","喜ぶ","笑う","悲しむ","怒られる","笑われる"]
};

// 難易語（むずかしい）を変更したい場合は、ここを書き換えてください。
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
  title: "",
  author: ""
};

const $ = (id) => document.getElementById(id);
const screens = document.querySelectorAll(".screen");

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
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

function updateQuestionProgress(screenNumber) {
  const progress = $("questionProgress");

  // 説明ページ（0）では進捗バーを表示しません。
  if (screenNumber === 0) {
    progress.classList.remove("visible");
    return;
  }

  // 画面2以降は進捗バーを表示します。
  progress.classList.add("visible");

  // 4問の進捗。
  // 画面3 = 第1問開始（まだ終了していない）
  // 画面4 = 第1問終了
  // 画面5 = 第1・第2問終了
  // 画面6 = 第1〜第3問終了
  // 画面7 = 全問終了
  let completed = 0;
  if (screenNumber === 4) completed = 1;
  if (screenNumber === 5) completed = 2;
  if (screenNumber === 6) completed = 3;
  if (screenNumber === 7) completed = 4;
  if (screenNumber === 8) completed = 5;
  if (screenNumber === 9) completed = 6;

  for (let i = 1; i <= 6; i++) {
    $("step" + i).classList.toggle("done", i <= completed);
  }
}

function showScreen(number) {
  screens.forEach((screen) => screen.classList.remove("active"));
  const target = $("screen" + number);
  if (!target) return;

  target.classList.add("active");
  updateQuestionProgress(number);
  window.scrollTo(0, 0);
}

function updateHeaderGenres() {
  // 画面2で表示するジャンル名だけを更新します。
  // 画面3〜6ではジャンル表示を削除し、代わりに3つのお題の使用状態を表示します。
  ["genre2Text", "finalGenre"].forEach((id) => {
    const element = $(id);
    if (element) element.textContent = state.genre;
  });

  ["3", "4", "5", "6"].forEach((screenNo) => {
    const element = $("genreInstruction" + screenNo);
    if (element) {
      const genre = element.querySelector("span");
      if (genre) genre.textContent = state.genre;
    }
  });
}

// 4つの回答欄に入力された文章をまとめます。
// 入力途中でも使用済み表示が変わるよう、state保存前の文字も含めます。
function getAllAnswerText() {
  return [
    $("heroInput").value,
    $("happeningInput").value,
    $("afterInput").value,
    $("endingInput").value
  ].join("\n");
}

// 3つのお題のうち、どれが文章中に使われているかを判定します。
// 判定は単純な「文字列が含まれているか」です。
function getKeywordUsage() {
  const text = getAllAnswerText();
  return {
    person: Boolean(state.person) && text.includes(state.person),
    place: Boolean(state.place) && text.includes(state.place),
    event: Boolean(state.event) && text.includes(state.event)
  };
}

// 画面3〜6に表示しているお題カードを更新します。
// 使われた単語には .used を付け、グレーで塗りつぶします。
function updateKeywordTrackers() {
  const usage = getKeywordUsage();
  const items = [
    ["Person", state.person, usage.person],
    ["Place", state.place, usage.place],
    ["Event", state.event, usage.event]
  ];

  ["3", "4", "5", "6"].forEach((screenNo) => {
    items.forEach(([type, word, used]) => {
      const card = $("keyword" + type + screenNo);
      if (!card) return;

      const value = card.querySelector(".keyword-value");
      if (value) value.textContent = word;
      card.classList.toggle("used", used);
    });
  });
}

// 3つのお題がすべて使われているか確認します。
function allKeywordsUsed() {
  const usage = getKeywordUsage();
  return usage.person && usage.place && usage.event;
}

// まだ使われていないお題を返します。
function getMissingKeywords() {
  const usage = getKeywordUsage();
  const missing = [];
  if (!usage.person) missing.push(state.person);
  if (!usage.place) missing.push(state.place);
  if (!usage.event) missing.push(state.event);
  return missing;
}

function updateWordScreen() {
  updateHeaderGenres();
  $("person2").textContent = state.person;
  $("place2").textContent = state.place;
  $("event2").textContent = state.event;
  updateKeywordTrackers();
}

function updateStoryScreens() {
  updateHeaderGenres();
  updateKeywordTrackers();

  $("hero4").textContent = state.hero;
  $("hero5").textContent = state.hero;
  $("hero6").textContent = state.hero;
  $("happening5").textContent = state.happening;
  $("happening6").textContent = state.happening;
  $("after6").textContent = state.after;
}

function updateFinalScreen() {
  const coverImages = {
    "ホラー": "./ホラー表紙.JPG",
    "SF": "./SF表紙.JPG",
    "ミステリー": "./ミステリー表紙.JPG",
    "恋愛": "./恋愛表紙.JPG",
    "コメディ": "./コメディ表紙.JPG"
  };

  const taglines = {
    "SF": "期待のデビュー作！",
    "ミステリー": "あなたは最後まで騙される。期待の新星の話題作。",
    "コメディ": "この小説が凄い！SNSで話題のデビュー作！",
    "恋愛": "SNSで話題沸騰中の新作！",
    "ホラー": "異色のデビュー作！"
  };

  const cover = $("bookCover");
  cover.dataset.genre = state.genre;
  $("finalCoverImage").src = coverImages[state.genre] || coverImages["ホラー"];
  $("finalCoverImage").alt = `${state.genre}の本の表紙`;
  $("finalTitle").textContent = state.title;
  $("finalAuthor").textContent = state.author;
  $("finalStorySummary").textContent = [state.hero, state.happening, state.after, state.ending].filter(Boolean).join(" ");
  $("finalTagline").textContent = taglines[state.genre] || "期待のデビュー作！";
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


function resetAll() {
  state.mode = null;
  state.genre = "";
  state.person = "";
  state.place = "";
  state.event = "";
  state.hero = "";
  state.happening = "";
  state.after = "";
  state.ending = "";
  state.title = "";
  state.author = "";
  ["heroInput", "happeningInput", "afterInput", "endingInput", "titleInput", "authorInput"].forEach((id) => {
    $(id).value = "";
    $(id).classList.remove("invalid");
  });
  if ($("keywordError")) $("keywordError").textContent = "";

  showScreen(0);
}

// 説明ページ → 難易度選択ページ
$("introStartButton").addEventListener("click", () => {
  showScreen(1);
});

// かんたん / むずかしい
document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    chooseGenre();
    chooseWords();
    updateWordScreen();
    showScreen(2);
  });
});

// お題を引き直す
$("redrawButton").addEventListener("click", () => {
  chooseWords();
  updateWordScreen();
});

// お題決定 → 第1問
$("startButton").addEventListener("click", () => {
  updateStoryScreens();
  showScreen(3);
});

// 入力中でも、お題を使った瞬間にカードをグレー表示へ変更します。
["heroInput", "happeningInput", "afterInput", "endingInput", "titleInput", "authorInput"].forEach((id) => {
  $(id).addEventListener("input", () => {
    updateKeywordTrackers();
    if ($("keywordError")) $("keywordError").textContent = "";
  });
});

// 第1問 → 第2問
$("next3").addEventListener("click", () => {
  const input = $("heroInput");
  if (!requireInput(input)) return;

  state.hero = input.value.trim();
  updateStoryScreens();
  showScreen(4);
});

// 第2問 → 第3問
$("next4").addEventListener("click", () => {
  const input = $("happeningInput");
  if (!requireInput(input)) return;

  state.happening = input.value.trim();
  updateStoryScreens();
  showScreen(5);
});

// 第3問 → 第4問
$("next5").addEventListener("click", () => {
  const input = $("afterInput");
  if (!requireInput(input)) return;

  state.after = input.value.trim();
  updateStoryScreens();
  showScreen(6);
});

// 第4問 → 第5問（タイトル）
$("next6").addEventListener("click", () => {
  const input = $("endingInput");
  if (!requireInput(input)) return;
  updateKeywordTrackers();
  if (!allKeywordsUsed()) {
    const missing = getMissingKeywords();
    $("keywordError").textContent = "まだ使われていないお題があります：" + missing.join(" / ");
    return;
  }
  state.ending = input.value.trim();
  updateStoryScreens();
  showScreen(7);
});

// 第5問 → 第6問
$("next7").addEventListener("click", () => {
  const input = $("titleInput");
  if (!requireInput(input)) return;
  state.title = input.value.trim();
  showScreen(8);
});

// 第6問 → 完成画面
$("finishButton").addEventListener("click", () => {
  const input = $("authorInput");
  if (!requireInput(input)) return;
  state.author = input.value.trim();
  updateFinalScreen();
  showScreen(9);
});

$("restartButton").addEventListener("click", resetAll);
