# 亚德里亚之鹰

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

驾驶水上飞机，漫游阳光下的亚德里亚风格群岛。

[在线体验](https://eagle-of-the-adriatic-playtest.zola.chatgpt.site) · [三语介绍](https://eagle-of-the-adriatic-playtest.zola.chatgpt.site/about.html?lang=zh)

体验站当前仅所有者可访问，需登录对应 ChatGPT 账号。本地运行无需账号。

## 游戏特色

- 六座岛屿、海岸小镇、灯塔、隐秘海湾和停泊栈桥。
- 红翼一号、M5、Macchi MC.72，三种飞行风格。
- 环岛挑战、岛屿委托、空中特技与摄影。
- Supermarine S.6、Gloster VI、Macchi M.67 专属比赛机库，三圈计时赛及完赛烟花。
- 晨午昏夜、五种天气、体积云与动态海浪。

## 本地运行

需要 Node.js 22.12 或更新版本，建议使用开启硬件加速的 Chrome。

```sh
npm ci
npm run dev
```

打开终端显示的地址。验证和构建：

```sh
npm test
npm run build
npm run preview
```

静态输出位于 `dist/`，介绍页为 `about.html`。

## 操作

W / S 俯仰，A / D 转弯，Q / E 偏航，Shift / Ctrl 油门。
C 视角，M 航图，F 靠泊，J 手册，P 摄影，L 着水指导，Esc 暂停，H 完整指南。
空格 + A / D 翻滚（红翼一号、MC.72）；MC.72：X 筋斗、Z 殷麦曼。I 反转俯仰。

进度保存在当前浏览器。性能为游戏调校，纪念赛并非历史赛事复刻。

Three.js · TypeScript · Vite · Blender

[资产来源](docs/ASSET_MANIFEST.md) · [飞机参考](docs/RACE_REFERENCES.md)
