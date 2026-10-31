# アドリア海の翼

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

水上機で、陽光あふれるアドリア海風の島々を巡るシングルプレイヤーゲーム。

[オンライン体験](https://eagle-of-the-adriatic-playtest.zola.chatgpt.site) · [紹介ページ](https://eagle-of-the-adriatic-playtest.zola.chatgpt.site/about.html?lang=ja)

オンライン体験は現在、所有者の ChatGPT アカウントでのみ利用できます。ローカルプレイにはアカウントは不要です。

## ゲーム内容

- 個性豊かな6つの島、海辺の町、灯台、隠れた入り江、係留桟橋。
- レッドウィング1号、M5、Macchi MC.72。異なる操縦感を楽しめます。
- リング飛行チャレンジ、島の依頼、曲技飛行、写真撮影。
- Supermarine S.6、Gloster VI、Macchi M.67 の専用レース格納庫。3周のタイムトライアルと完走後の花火。
- 朝昼夕夜、5つの天候、立体的な雲、動く波。

## ローカルで起動

Node.js 22.12 以降が必要です。ハードウェアアクセラレーションを有効にした Chrome を推奨します。

```sh
npm ci
npm run dev
```

表示されたアドレスを開いてください。検証とビルド：

```sh
npm test
npm run build
npm run preview
```

静的ファイルの出力先は `dist/`。紹介ページは `about.html` です。

## 操作

W / S ピッチ、A / D 旋回、Q / E ヨー、Shift / Ctrl スロットル。
C 視点、M 海図、F 係留、J 手冊、P 撮影、L 着水ガイド、Esc 一時停止、H 全操作ガイド。
レッドウィング1号と MC.72：スペース + A / D でロール。MC.72：X ループ、Z インメルマン。I でピッチ操作を反転。

進行状況はブラウザーに保存されます。性能はゲーム向けの調整で、記念レースは実際の歴史的大会の再現ではありません。

Three.js · TypeScript · Vite · Blender

[アセット出典](docs/ASSET_MANIFEST.md) · [参考資料](docs/RACE_REFERENCES.md)
