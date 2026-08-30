# GDG connpass デザインガイドライン

connpass のイベント説明欄で GDG らしい見た目を作るための HTML + CSS ガイド。
すべてのスニペットは `scripts/lint_connpass.py` をエラー 0・警告 0 で通る。

前提となる 2 つの外部ドキュメントは、それぞれが唯一の情報源である。ここでは再掲しない。

- **記法とサニタイザ** — `connpass-syntax` skill の `references/syntax.md`
- **ブランド（パレット・ロゴ・ステッカー・構成原則）** — `gdg-design` skill の `references/brand-system.md`

## 目次

1. [3 つの規則](#1-3-つの規則)
2. [色の使い分け](#2-色の使い分け)
3. [地とページの骨格](#3-地とページの骨格)
4. [見出しとステッカー](#4-見出しとステッカー)
5. [パネル](#5-パネル)
6. [開催概要](#6-開催概要)
7. [一目サマリ](#7-一目サマリ)
8. [タイムテーブル（単一トラック）](#8-タイムテーブル単一トラック)
9. [タイムテーブル（複数トラック）](#9-タイムテーブル複数トラック)
10. [セッションと登壇者ブロック](#10-セッションと登壇者ブロック)
11. [コールアウト](#11-コールアウト)
12. [バナー画像](#12-バナー画像)
13. [末尾セクションは飾らない](#13-末尾セクションは飾らない)
14. [ステッカー URL カタログ](#14-ステッカー-url-カタログ)
15. [落とし穴](#15-落とし穴)

---

## 1. 3 つの規則

connpass のサニタイザが通すのは 22 個の CSS プロパティだけで、`border-radius`・`line-height`・
`display`・`width`・`border-collapse` はいずれも消える。GDG のビジュアル言語をこの中で再構成すると、
守るべき規則は 3 つに収束する。

### 規則 1 — パネルは白地 + Black 02 の枠線

```
background-color:#FFFFFF;  border:2px solid #1E1E1E;  color:#1E1E1E;  padding:16px;
```

**セクションはすべてパネルで囲む。** 見出しもパネルの中に入れて、
1 セクション = 1 枚のカードにする。Off White の地の上に白いカードが並ぶ構図が骨格になる。

パネルの地は常に白で、色は付けない。角丸は使えないので直角のまま置く。
丸みが欲しい箇所はステッカー画像で足す。

### 規則 2 — 色は表のセルにだけ置く

パネルを全部同じ白にすることで、**色が出てきた場所が「意味のある場所」になる。**
Pastel の面を使ってよいのは、色が分類を表している表のセルだけである。

| 使ってよい | 使わない |
| --- | --- |
| タイムテーブルのセル（トラックごとの色、休憩の減光） | パネルの地 |
| トラック凡例のセル | 見出しの背景 |
| | 本文の段落 |

分類がないところでは色を出さない。イベントごとの支配色は、
登壇者アイコンのキーラインのような**線**として効かせる。

### 規則 3 — 装飾の階層は 1 段まで

```
<div>  背景 #F0F0F0                      ← 地。ページに 1 枚だけ。これはパネルではない
  ├ <img>  バナー                          ← 地の直下に置けるのは、バナーとパネルだけ
  ├ <div panel>  <h1> + 2〜3 行の説明
  ├ <div panel>  一目サマリ
  ├ <div panel>  <h2>開催概要</h2>  + 枠線なしの表
  ├ <div panel>  <h2>タイムテーブル</h2> + 表（セルに色が付く）
  └ <div panel>  <h2>セッション</h2> + 登壇者ブロック
```

**パネルの中にパネルを入れない。** 入れ子にすると connpass の本文幅では境界が読めなくなり、
どこからどこまでが 1 つの情報か分からなくなる。

**表のセルの色付けはパネルではない。** だからタイムテーブルはパネルの中に入れてよい。
`scripts/lint_connpass.py` もこの線引きで検査する
（`div` の地は白のみ、`td` の地は自由、装飾 `div` の深さは 2 まで）。

## 2. 色の使い分け

値の出典は `gdg-design` の `references/brand-system.md`。ここでは connpass 上での役割だけを書く。

| 役割 | 値 |
| --- | --- |
| 地（ページ全体） | Off White `#F0F0F0` |
| パネルの地 | `#FFFFFF` |
| 文字・パネルの枠線 | Black 02 `#1E1E1E` |

表のセルに置く色。Core を枠線、Pastel を地に使う。

| 系統 | Core（枠線） | Pastel（地） | 割り当て |
| --- | --- | --- | --- |
| Blue | `#4285F4` | `#C3ECF6` | Track A / 既定の支配色 |
| Green | `#34A853` | `#CCF6C5` | Track B |
| Yellow | `#F9AB00` | `#FFE7A5` | Track C |
| Red | `#EA4335` | `#F8D8D8` | Track D |
| 減光 | `#9AA0A6` | `#F0F0F0` | 受付・休憩・終了 |

- **Pastel 地の上には必ず `#1E1E1E` の文字を載せる。** 他の色を載せるとコントラストが落ちる
- 減光の組（`#9AA0A6` 枠 + `#F0F0F0` 地 + `#9AA0A6` 文字）だけは例外で、
  読めなくすることが目的なので文字色を薄くしてよい
- 支配色は、登壇者アイコンのキーラインなど**線**として使う。面には使わない

`<a>` は `style` 属性を受け付けないため、リンクの色は指定できない。connpass の既定色に任せる。

## 3. 地とページの骨格

説明欄の全体を Off White の地で包む。これがページに 1 枚だけ存在してよい「地」で、パネルではない。

```html
<div style="background-color:#F0F0F0; color:#1E1E1E; padding:16px;">

<!-- ここに バナー と パネル だけを兄弟として並べる -->

</div>
```

地の直下に置けるのは **バナー画像とパネルだけ**。掲載順のとおりに並べる。

1. バナー画像（パネルに入れない）
2. パネル: `<h1>` イベント名 + 2〜3 行の説明
3. パネル: 一目サマリ
4. パネル: 開催概要
5. パネル: タイムテーブル
6. パネル: セッション
7. （ここで地の `</div>` を閉じる）

主催・共催・アンチハラスメントポリシー・Code of Conduct は地の**外**に、装飾なしの Markdown で置く。
理由は [13](#13-末尾セクションは飾らない) に書いた。

## 4. 見出しとステッカー

見出しはパネルの中に入れる。1 セクション = 1 枚のカードで、その先頭行が見出しになる。

```html
<div style="background-color:#FFFFFF; border:2px solid #1E1E1E; color:#1E1E1E; padding:16px; margin:0 0 16px 0;">
  <h2 style="margin:0 0 12px 0; font-size:22px; border:none;">
    <img src="https://img.gdgs.jp/gdg-sticker-hash-green" alt="" height="22" /> 開催概要
  </h2>
  <!-- 中身 -->
</div>
```

- `border:none` は必須。connpass の既定スタイルが見出しに下罫を引くため、消さないと
  パネルの枠線と喧嘩した見た目になる
- ステッカーは **`height` 属性だけ**を指定する。`width` も指定すると縦横比が崩れる。
  見出しに添えるなら 20〜24px が読みやすい
- 装飾なので `alt=""` にする。スクリーンリーダーに「ハッシュ記号」と読ませても意味がない

セクションごとにステッカーを変えると、色を絞った意味がなくなる。
**1 つ選んで全セクションで使い回す**のが基本。
括弧の左右ペアだけは、タイトルやコールアウトを挟む用途で別に使ってよい。

## 5. パネル

```html
<div style="background-color:#FFFFFF; border:2px solid #1E1E1E; color:#1E1E1E; padding:16px; margin:0 0 16px 0;">
  <h2 style="margin:0 0 12px 0; font-size:22px; border:none;">
    <img src="https://img.gdgs.jp/gdg-sticker-hash-green" alt="" height="22" /> イベントについて
  </h2>
  <p style="margin:0 0 10px 0; font-weight:bold; font-size:18px;">Gemma 4 をローカル環境で動かしてみよう</p>
  <p style="margin:0;">講師と一緒に手を動かしながら、ローカル環境で LLM を扱う体験をします。</p>
</div>
```

パネルの中に置いてよいもの / いけないもの:

| 置いてよい | 置いてはいけない |
| --- | --- |
| 見出し、素の `<p>` `<strong>` `<ul>` `<li>` | 別のパネル（背景色や枠線を持つ `<div>`） |
| 枠線なしの表 | パネルの地に色を付けること |
| セルに色が付いた表（タイムテーブル、トラック凡例） | |
| ステッカー画像、登壇者アイコン | |

`line-height` は使えないので、行間を空けたいときは `<br/>` ではなく `<p>` を分ける。
`<p style="margin:0 0 10px 0;">` を積むと段落間が制御できる。

## 6. 開催概要

パネル 1 枚の中に、枠線なしの 2 列表を入れる。**公式サイト・日時・会場・参加費の 4 行は必須。**

```html
<div style="background-color:#FFFFFF; border:2px solid #1E1E1E; color:#1E1E1E; padding:16px; margin:0 0 16px 0;">
  <h2 style="margin:0 0 12px 0; font-size:22px; border:none;">
    <img src="https://img.gdgs.jp/gdg-sticker-hash-green" alt="" height="22" /> 開催概要
  </h2>
  <table border="0" style="border:none;">
    <tbody>
      <tr>
        <td align="left" style="border:none; padding:6px 18px 6px 0; font-weight:bold;">🌐 公式サイト</td>
        <td style="border:none; padding:6px 0;"><a href="https://example.com/devfest">devfest.example.com</a></td>
      </tr>
      <tr>
        <td align="left" style="border:none; padding:6px 18px 6px 0; font-weight:bold;">📅 日時</td>
        <td style="border:none; padding:6px 0;">2026/09/30（水）19:00–21:00</td>
      </tr>
      <tr>
        <td align="left" style="border:none; padding:6px 18px 6px 0; font-weight:bold;">📍 会場</td>
        <td style="border:none; padding:6px 0;">
          LINEヤフー株式会社 大阪オフィス<br/>
          グランフロント大阪 タワーA 37階
        </td>
      </tr>
      <tr>
        <td align="left" style="border:none; padding:6px 18px 6px 0; font-weight:bold;">🎫 参加費</td>
        <td style="border:none; padding:6px 0;">無料</td>
      </tr>
    </tbody>
  </table>
</div>
```

絵文字はリテラルの Unicode を使う。`:calendar:` のようなショートコード記法は
`connpass-syntax` の検証範囲外なので依存しない。

持ち物・軽食・懇親会など**行動を促す情報**があるときは、この表に足さず、別のパネルとして分ける。
色を付けたくなるが、パネルの地は白のままにして、見出しの文言と絵文字で区別する。

## 7. 一目サマリ

説明文のすぐ下に、登壇者やテーマを一望させる。ここは「申し込むかどうか」を判断する材料を
最短距離で見せる位置なので、散文にすると効かない。

パネルの中に、枠線なしのテーブルで横並びにする。**画像の行と文字の行は別の `<tr>` に分ける。**

```html
<div style="background-color:#FFFFFF; border:2px solid #1E1E1E; color:#1E1E1E; padding:16px; margin:0 0 16px 0;">
  <table border="0" style="border:none;">
    <tbody>
      <tr>
        <td align="center" style="border:none; padding:0 12px 0 0;">
          <img src="https://gdg-tokyo.github.io/web-assets/speakers/gde/example.jpg" alt="Sho Tanaka" width="120" style="border:3px solid #4285F4;" />
        </td>
        <td align="center" style="border:none; padding:0 12px 0 0;">
          <img src="https://gdg-tokyo.github.io/web-assets/speakers/gde/example2.jpg" alt="Yuki Sato" width="120" style="border:3px solid #4285F4;" />
        </td>
      </tr>
      <tr>
        <td align="center" style="border:none; padding:8px 12px 0 0; font-weight:bold;">Sho Tanaka</td>
        <td align="center" style="border:none; padding:8px 12px 0 0; font-weight:bold;">Yuki Sato</td>
      </tr>
      <tr>
        <td align="center" style="border:none; padding:2px 12px 0 0; font-size:13px;">Snowflake / Lead DevRel</td>
        <td align="center" style="border:none; padding:2px 12px 0 0; font-size:13px;">Google / Software Engineer</td>
      </tr>
    </tbody>
  </table>
</div>
```

複数トラックのイベントなら、登壇者の代わりに**トラック凡例**を置く。
ここはセルの色が分類を表すので、Pastel を使ってよい数少ない場所である。

```html
<div style="background-color:#FFFFFF; border:2px solid #1E1E1E; color:#1E1E1E; padding:16px; margin:0 0 16px 0;">
  <table border="0">
    <tbody>
      <tr>
        <td style="border:2px solid #4285F4; background-color:#C3ECF6; color:#1E1E1E; padding:12px 16px;">
          <strong>Track A — AI / ML</strong><br/><span style="font-size:14px;">Gemini、エージェント、評価</span>
        </td>
        <td style="border:2px solid #34A853; background-color:#CCF6C5; color:#1E1E1E; padding:12px 16px;">
          <strong>Track B — Cloud</strong><br/><span style="font-size:14px;">Cloud Run、可観測性、IaC</span>
        </td>
        <td style="border:2px solid #F9AB00; background-color:#FFE7A5; color:#1E1E1E; padding:12px 16px;">
          <strong>Track C — Mobile / Web</strong><br/><span style="font-size:14px;">Flutter、Android、Web</span>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

登壇者が 5 名を超えるときは、横並びの形は潰れる。
`gdg-design` で 1 枚の画像を作り、`gdg-img` で `img.gdgs.jp` に上げて `<img>` で貼るほうが読みやすい。
その場合も**登壇者名のテキストを画像の下に併記する**。画像だけでは検索にも読み上げにも乗らない。

## 8. タイムテーブル（単一トラック）

パネルの中に表を置く。`<table>` 自身には枠線も背景も与えない（`border="0"` 属性だけ）。
セルに色を持たせるので、表にも装飾を付けると重なって読みにくくなる。

**時間列は素のテキスト**にして、色はセッション列だけが持つようにする。
時間まで色を付けると、どの行が本題なのかが分からなくなる。

```html
<div style="background-color:#FFFFFF; border:2px solid #1E1E1E; color:#1E1E1E; padding:16px; margin:0 0 16px 0;">
  <h2 style="margin:0 0 12px 0; font-size:22px; border:none;">
    <img src="https://img.gdgs.jp/gdg-sticker-hash-green" alt="" height="22" /> タイムテーブル
  </h2>
  <table border="0">
    <tbody>
      <tr>
        <td align="right" style="border:none; padding:10px 14px 10px 0; color:#9AA0A6; font-weight:bold;">18:30</td>
        <td style="border:2px solid #9AA0A6; background-color:#F0F0F0; color:#9AA0A6; padding:10px 14px; font-size:14px;">受付</td>
      </tr>
      <tr>
        <td align="right" style="border:none; padding:10px 14px 10px 0; font-weight:bold;">19:00</td>
        <td style="border:2px solid #4285F4; background-color:#C3ECF6; color:#1E1E1E; padding:10px 14px;">
          <strong>Gemma 4 でローカル LLM ハンズオン</strong><br/>
          Sho Tanaka
        </td>
      </tr>
      <tr>
        <td align="right" style="border:none; padding:10px 14px 10px 0; color:#9AA0A6; font-weight:bold;">20:25</td>
        <td style="border:2px solid #9AA0A6; background-color:#F0F0F0; color:#9AA0A6; padding:10px 14px; font-size:14px;">休憩</td>
      </tr>
    </tbody>
  </table>
</div>
```

規約:

- 1 列目は時間。`19:00` または `10:00〜10:30` の形式で揃える
- 1 セルにセッションタイトル（`<strong>`）と登壇者名を入れる。改行は `<br/>`
- **受付・休憩・終了・懇親会の案内は減光する。** 枠 `#9AA0A6` / 地 `#F0F0F0` / 文字 `#9AA0A6`、
  `font-size:14px`、太字にしない。本題のセッションと同じ強さで置くと、
  タイムテーブル全体が「等しく重要な行の羅列」に見えて走査できなくなる

## 9. タイムテーブル（複数トラック）

1 列目が時間、2 列目以降がトラック A・B・C… の順。トラックごとに色を固定する。
ヘッダにトラック名を書き、色だけに頼らない。

```html
<div style="background-color:#FFFFFF; border:2px solid #1E1E1E; color:#1E1E1E; padding:16px; margin:0 0 16px 0;">
  <h2 style="margin:0 0 12px 0; font-size:22px; border:none;">
    <img src="https://img.gdgs.jp/gdg-sticker-hash-green" alt="" height="22" /> タイムテーブル
  </h2>
  <table border="0">
    <thead>
      <tr>
        <th style="border:none; padding:8px;"></th>
        <th style="border:2px solid #4285F4; background-color:#C3ECF6; color:#1E1E1E; padding:10px 14px;">Track A</th>
        <th style="border:2px solid #34A853; background-color:#CCF6C5; color:#1E1E1E; padding:10px 14px;">Track B</th>
        <th style="border:2px solid #F9AB00; background-color:#FFE7A5; color:#1E1E1E; padding:10px 14px;">Track C</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td align="right" style="border:none; padding:10px 14px 10px 0; font-weight:bold;">10:00〜10:40</td>
        <td style="border:2px solid #4285F4; background-color:#C3ECF6; color:#1E1E1E; padding:10px 14px; font-size:14px;">
          <strong>Gemini でマルチモーダル検索を作る</strong><br/>Sho Tanaka
        </td>
        <td style="border:2px solid #34A853; background-color:#CCF6C5; color:#1E1E1E; padding:10px 14px; font-size:14px;">
          <strong>Cloud Run で始める本番運用</strong><br/>Yuki Sato
        </td>
        <td style="border:2px solid #F9AB00; background-color:#FFE7A5; color:#1E1E1E; padding:10px 14px; font-size:14px;">
          <strong>Flutter の描画パイプライン入門</strong><br/>Kenji Ito
        </td>
      </tr>
      <tr>
        <td align="right" style="border:none; padding:10px 14px 10px 0; color:#9AA0A6; font-weight:bold;">12:00〜13:00</td>
        <td colspan="3" align="center" style="border:2px solid #9AA0A6; background-color:#F0F0F0; color:#9AA0A6; padding:8px 14px; font-size:14px;">休憩・ランチ</td>
      </tr>
    </tbody>
  </table>
</div>
```

- **全トラック共通の休憩は `colspan` で 1 セルにまとめる。** 3 つ並べると休憩が本題より場所を取る
- 空きコマがあるトラックは、そのセルを減光の空セルにするか `rowspan` で前のセッションを伸ばす
- 3 トラックを超えると connpass の本文幅では文字が潰れる。4 トラック以上なら、
  `gdg-design` + `gdg-img` で画像化したタイムテーブルを貼り、テキスト版を
  トラック別の箇条書きとして下に併記する

`border-collapse` は効かないため、セル同士は必ず 2px 程度離れる。これは直せない。
枠線をつなげた「格子」ではなく、**独立したチップが並んでいる**構図として設計すると破綻しない。

## 10. セッションと登壇者ブロック

セッションはまとめて 1 枚のパネルに入れる。中に各セッションの見出し・概要・登壇者を並べる。
**Opening と Closing はセッション一覧の一番下に置く。** 先頭に置くと本題のセッションが下がる。

登壇者を横並びにするときは枠線を消したテーブルを使う。

```html
<div style="background-color:#FFFFFF; border:2px solid #1E1E1E; color:#1E1E1E; padding:16px; margin:0 0 16px 0;">
  <h2 style="margin:0 0 12px 0; font-size:22px; border:none;">
    <img src="https://img.gdgs.jp/gdg-sticker-hash-green" alt="" height="22" /> セッション
  </h2>

  <h3 style="margin:20px 0 8px 0; border:none;">Gemma 4 でローカル LLM ハンズオン</h3>

  <p style="margin:0 0 14px 0;">
    Gemma 4 を手元の PC で動かし、量子化・推論・簡単な RAG までを一気に体験します。
  </p>

  <table border="0" style="border:none;">
    <tbody>
      <tr>
        <td style="border:none; padding:0 18px 0 0;">
          <p>　</p>
          <img src="https://gdg-tokyo.github.io/web-assets/speakers/gde/example.jpg" alt="Sho Tanaka" width="160" style="border:3px solid #4285F4;" />
        </td>
        <td style="border:none; padding:0;">
          <h4 style="margin:0 0 6px 0; border:none;"><a href="https://x.com/example">Sho Tanaka</a></h4>
          <p style="margin:0 0 10px 0; font-weight:bold;">Snowflake, Lead Developer Advocate</p>
          <p style="margin:0;">
            Google Developer Expert AI/ML として、MLOps・JAX・TPU の登壇やコミュニティ運営で活動。
            登録者 6,000 人以上の MLOps / LLMOps コミュニティの初期オーガナイザーの一人です。
          </p>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

セッション数が多いイベントでは、**トラックごとにパネルを分ける**と 1 枚が長くなりすぎない。
パネルを分けても兄弟として並ぶので、階層は増えない。

### アイコンのキーライン

パネルの地を白で統一したぶん、支配色は**線**として効かせる。
登壇者アイコンの `border:3px solid` に、そのイベントの支配色（複数トラックならそのセッションの
トラック色）を当てる。これがページ上で色が出てくる数少ない場所になる。

`border-radius` は消えるので、アイコンを丸くはできない。**正方形のまま**キーラインを付ける。
120〜160px 幅が読みやすい。`width` 属性だけ指定し、`height` は書かない
（元画像が正方形でないときに潰れる）。

### `<p>　</p>` を入れる理由

画像だけの列があると、隣の列のテキストが画像のかなり下から始まってしまう。
セルの既定の縦位置は中央揃えで、背の高い画像に対して短いテキストが真ん中に置かれるためである。
`vertical-align` は 22 プロパティに入っておらず**サニタイザに消される**ので、CSS では直せない。

代わりに、**画像セルの先頭に全角スペースだけの段落 `<p>　</p>` を置く。**
画像セルの中身が 1 行分背が高くなり、画像がその分だけ下がるので、
相対的にテキストの開始位置が画像の上端に近づく。

実測では、画像上端からテキスト先頭までのずれが **63px から 36px に縮む**（160px 幅のアイコン、
自己紹介 2 行の場合）。**完全に揃うわけではない**ので、ぴったり揃わなくても壊れてはいない。
自己紹介文が長くテキスト列の背が画像に近づくほど、中央揃えのままでも自然に揃うため、
この小細工が要るのは自己紹介が 1〜2 行と短いときである。

## 11. コールアウト

参加を促す 1 文だけを、白いパネルに入れて中央寄せする。1 ページに 1 つまで。
地に色を付けたくなるが、色はタイムテーブルのために取っておく。
括弧ステッカーと中央寄せと太字だけで十分目立つ。

```html
<div style="background-color:#FFFFFF; border:2px solid #1E1E1E; color:#1E1E1E; padding:16px; margin:0 0 16px 0;text-align:center; font-weight:bold;">
  <img src="https://img.gdgs.jp/gdg-sticker-brace-left-pastel-green" alt="" height="20" />
  ノートPCをお持ちのうえ、お気軽にご参加ください
  <img src="https://img.gdgs.jp/gdg-sticker-brace-right-pastel-green" alt="" height="20" />
</div>
```

括弧ステッカーの左右ペアで文言を挟むのは GDG の定番の組み方。
ペアで使うこと、間に 1 文だけ置くことが条件で、複数行を挟むと括弧が意味を失う。

## 12. バナー画像

```html
<img src="https://img.gdgs.jp/{{バナーの画像ID}}" alt="{{イベント名}} のバナー" width="1000" />
```

- **`width` 属性で指定する。** CSS の `width:100%` は消える
- `height` は書かない。書くと縦横比が崩れる
- `display:block` も消えるので、中央寄せしたいときは親の `text-align:center` を使う
- バナーは `gdg-img` で `img.gdgs.jp` にアップロードして URL を得る

---

## 13. 末尾セクションは飾らない

注意事項・主催・共催・アンチハラスメントポリシー・Code of Conduct は、
地の `</div>` より**外**に、装飾なしの Markdown で書く。

```markdown
## ⚠️ 注意事項

* タイムテーブルやセッション内容は予告なく変更となる場合があります。
* イベントの様子は主催・共催団体のレポートとして公開される可能性があります。

## 主催 - GDG Greater Kwansai
X: [@gdgkwansai](https://x.com/gdgkwansai)
> GDG Greater Kwansai は、広域関西圏で活動する Google Developer Group です。
```

理由は 2 つある。ここは申し込みの判断材料ではなく、読む人が必要になったときに探す情報なので、
パネルにして視線を奪う価値がない。そして、末尾まで装飾を続けると、
本題のパネル群（開催概要・タイムテーブル・セッション）が相対的に弱くなる。

定型文は `assets/boilerplate-ja.md` にある。そのまま貼って団体名だけ差し替える。

---

## 14. ステッカー URL カタログ

`img.gdgs.jp` にホストされた PNG。すべて透過で、白地でも Off White 地でも使える。
`<img ... height="20" />` のように **`height` だけ**指定して縦横比を保つ。

### 用途の当て方

| 用途 | 使うステッカー |
| --- | --- |
| セクション見出しの目印（全セクション共通で 1 つ） | `gdg-sticker-hash-green` / `gdg-sticker-hash-outline` / `gdg-sticker-asterisk-outline` |
| タイトルやコールアウトを挟む | `gdg-sticker-brace-left-pastel-green` + `gdg-sticker-brace-right-pastel-green`、`gdg-sticker-square-brackets-outline` |
| 「次へ」「詳細はこちら」の導線 | `gdg-sticker-arrow-right-yellow` / `gdg-sticker-arrow-right-outline` |
| 公式サイト・オンライン開催 | `gdg-sticker-globe-outline` |
| 引用・参加者の声 | `gdg-sticker-opening-quotes-green` + `gdg-sticker-closing-quotes-green` |
| 共催・コラボレーション | `gdg-sticker-plus-blue` / `gdg-sticker-multiply-pink` |

### 全 URL

| 名前 | URL |
| --- | --- |
| `gdg` | `https://img.gdgs.jp/gdg-logo` |
| `01-ellipsis-green` | `https://img.gdgs.jp/gdg-sticker-ellipsis-green` |
| `02-square-brackets-filled-pastel-yellow` | `https://img.gdgs.jp/gdg-sticker-square-brackets-filled-pastel-yellow` |
| `03-pill-pastel-blue` | `https://img.gdgs.jp/gdg-sticker-pill-pastel-blue` |
| `04-arrow-right-yellow` | `https://img.gdgs.jp/gdg-sticker-arrow-right-yellow` |
| `05-double-slash-blue` | `https://img.gdgs.jp/gdg-sticker-double-slash-blue` |
| `06-brace-left-pastel-green` | `https://img.gdgs.jp/gdg-sticker-brace-left-pastel-green` |
| `07-brace-right-pastel-green` | `https://img.gdgs.jp/gdg-sticker-brace-right-pastel-green` |
| `08-equals-blue` | `https://img.gdgs.jp/gdg-sticker-equals-blue` |
| `09-scalloped-pill-pastel-red` | `https://img.gdgs.jp/gdg-sticker-scalloped-pill-pastel-red` |
| `10-opening-quotes-green` | `https://img.gdgs.jp/gdg-sticker-opening-quotes-green` |
| `11-closing-quotes-green` | `https://img.gdgs.jp/gdg-sticker-closing-quotes-green` |
| `12-colon-blue` | `https://img.gdgs.jp/gdg-sticker-colon-blue` |
| `13-period-red` | `https://img.gdgs.jp/gdg-sticker-period-red` |
| `14-chevron-right-pink` | `https://img.gdgs.jp/gdg-sticker-chevron-right-pink` |
| `15-chevron-left-pink` | `https://img.gdgs.jp/gdg-sticker-chevron-left-pink` |
| `16-hash-outline` | `https://img.gdgs.jp/gdg-sticker-hash-outline` |
| `17-brace-right-outline` | `https://img.gdgs.jp/gdg-sticker-brace-right-outline` |
| `18-brace-left-outline` | `https://img.gdgs.jp/gdg-sticker-brace-left-outline` |
| `19-equals-outline` | `https://img.gdgs.jp/gdg-sticker-equals-outline` |
| `20-at-sign-outline` | `https://img.gdgs.jp/gdg-sticker-at-sign-outline` |
| `21-multi-brace-left-outline` | `https://img.gdgs.jp/gdg-sticker-multi-brace-left-outline` |
| `22-multi-brace-right-outline` | `https://img.gdgs.jp/gdg-sticker-multi-brace-right-outline` |
| `23-triple-brace-left-outline` | `https://img.gdgs.jp/gdg-sticker-triple-brace-left-outline` |
| `24-triple-brace-right-outline` | `https://img.gdgs.jp/gdg-sticker-triple-brace-right-outline` |
| `25-parentheses-outline` | `https://img.gdgs.jp/gdg-sticker-parentheses-outline` |
| `26-square-brackets-outline` | `https://img.gdgs.jp/gdg-sticker-square-brackets-outline` |
| `27-asterisk-outline` | `https://img.gdgs.jp/gdg-sticker-asterisk-outline` |
| `28-double-slash-outline` | `https://img.gdgs.jp/gdg-sticker-double-slash-outline` |
| `29-semicolon-colon-outline` | `https://img.gdgs.jp/gdg-sticker-semicolon-colon-outline` |
| `30-arrow-right-outline` | `https://img.gdgs.jp/gdg-sticker-arrow-right-outline` |
| `31-less-than-three-outline` | `https://img.gdgs.jp/gdg-sticker-less-than-three-outline` |
| `32-angle-brackets-outline` | `https://img.gdgs.jp/gdg-sticker-angle-brackets-outline` |
| `33-parenthesis-right-pink` | `https://img.gdgs.jp/gdg-sticker-parenthesis-right-pink` |
| `34-parenthesis-left-yellow` | `https://img.gdgs.jp/gdg-sticker-parenthesis-left-yellow` |
| `35-multiply-pink` | `https://img.gdgs.jp/gdg-sticker-multiply-pink` |
| `36-hash-green` | `https://img.gdgs.jp/gdg-sticker-hash-green` |
| `37-plus-red` | `https://img.gdgs.jp/gdg-sticker-plus-red` |
| `38-semicolon-yellow` | `https://img.gdgs.jp/gdg-sticker-semicolon-yellow` |
| `39-plus-blue` | `https://img.gdgs.jp/gdg-sticker-plus-blue` |
| `40-globe-outline` | `https://img.gdgs.jp/gdg-sticker-globe-outline` |

`gdg` は GDG ロゴ。`gdg-design` の指示どおり、変形・再配色・切り抜きをせず、
他の要素から視覚的に離して置く。

---

## 15. 落とし穴

### サニタイザに消されるもの

書いた本人のブラウザでは正しく見えるのに、connpass に貼ると消える。
特に上 2 つは**枠線が丸ごと消滅する**ので、公開してから気づくことになる。

| やりがち | 何が起きるか | 代わりに |
| --- | --- | --- |
| `border-width` + `border-style` + `border-color` | 3 宣言とも消えて**枠線が消滅する** | `border:2px solid #4285F4` の 1 行にまとめる |
| `border-radius:30px` | 消えて直角になる | 直角を前提に組む。丸みはステッカーで足す |
| CSS の `width:100%` / `height` | 消えて画像が原寸で出る | `width` **属性**を使う。`height` は書かない |
| `line-height:1.8` | 消えて既定の行間になる | `<p>` を分けて `margin` で間隔を作る |
| `display:block` で画像を中央寄せ | 消えて左寄せのまま | 親要素の `text-align:center` |
| `border-collapse` / `border-spacing` | 消えてセルが離れる | 離れる前提で、独立したチップとして設計する |
| `vertical-align:top` | 消えてセルが中央揃えになる | 画像セルの先頭に `<p>　</p>` |
| `<table style="width:100%">` | 消える。`table` は `width` 属性も受け付けない | 表は中身の幅に縮む。**全幅にする手段はない**ので、縮む前提で列数と文字量を決める |
| `class` / `id` / `<style>` | 消える | すべてインラインの `style` に展開する |
| `<ul style="...">` | `ul` は属性を一切受け付けないので `style` ごと消える | `<li>` を囲む `<div>` 側で調整する |

### ブランドに反するもの

サニタイザは通るが、GDG の見た目にならない。

| やりがち | なぜダメか | 代わりに |
| --- | --- | --- |
| パネルの地に Pastel を塗る | 色が至るところにあると、色が情報を運ばなくなる | パネルは白。色は表のセルへ（規則 2） |
| `border-left:6px solid` の片側アクセントバー | GDG のビジュアル言語にない形 | 4 辺の `border` |
| セクションごとに色を変える | 分類がないのに色が意味を持って見える | パネルは全部同じ白（規則 1） |
| 行ごとに Blue → Green → Yellow → Red を巡回 | 同上。トラックのような分類があるときだけ色を分ける | 単一トラックなら支配色 1 色 |
| パネルの中にパネル | 境界が読めず、情報の単位が分からなくなる | 兄弟として並べる（規則 3） |
| セクションの中身をパネルに入れない | 地の上に裸のテキストが浮いて、区切りが消える | セクションは必ずパネルで囲む |
| Pastel セルの上に Core 色の文字 | コントラストが落ちる | Pastel 地には `#1E1E1E` |
| セクションごとに違うステッカー | 装飾が主張して見出しが読みにくくなる | 1 つ選んで使い回す |
| 休憩行を本題と同じ強さで置く | タイムテーブルが等価な行の羅列に見える | 減光グレーで沈める |

### 検証

貼る前に必ず走らせる。エラーもワーニングも 0 になってから納品する。

```bash
python3 scripts/lint_connpass.py path/to/description.html
```

Markdown の中の HTML フェンスだけを検査したいときは `--extract-fences` を付ける。
