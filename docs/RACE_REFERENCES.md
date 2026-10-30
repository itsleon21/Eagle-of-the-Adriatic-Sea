# 施耐德纪念赛：参考与建模约定

检索日期：2026-10-29–30。历史照片仅用于观察比例与结构，未打包或作为游戏纹理。全部游戏几何、材质图和脚本为本项目原创。比赛为虚构的亚德里亚三圈计时纪念赛，不宣称复刻某届比赛；性能为可玩性调校。

| 型号 | 建模尺寸（翼展×全长） | 主要参考 |
|---|---|---|
| Supermarine S.6（1929） | 9.14×7.87 m | [N247历史照片](https://www.friendsofstokesbay.co.uk/schneider-trophy/)、[Solent Sky保存的S.6A照片](https://commons.wikimedia.org/wiki/File:Supermarine_S.6A_N248.JPG)、[S.6数据索引](https://en.wikipedia.org/wiki/Supermarine_S.6) |
| Gloster VI | 7.92×8.23 m | [Wright State档案：1929年N249侧面原照](https://corescholar.libraries.wright.edu/special_ms223_photographs/469/)、[Napier发动机历史资料](https://www.enginehistory.org/Piston/Napier/NapierLionHx/NapierLionHx.shtml)、[尺寸索引](https://en.wikipedia.org/wiki/Gloster_VI) |
| Macchi M.67 | 9.98×7.65 m | [意大利空军博物馆资料](https://www.aeronautica.difesa.it/2023/10/05/macchi-m67-2/)、[圣迭戈航空航天博物馆历史照片](https://www.flickr.com/photos/sdasmarchives/10559774535)、[MM105博物馆实机照片](https://www.airhistory.net/photo/190217/MM105)、[博物馆实机多角度照片](https://www.warbirdphotographs.com/WBP/storico08.htm)、[尺寸索引](https://en.wikipedia.org/wiki/Macchi_M.67) |

S.6与S.6B不混用尺寸；现存S.6A实机照片只辅助观察结构和蓝银配色。金箭使用窄翼、金色漆面、三瓣Napier Lion发动机罩和双叶桨；M.67使用宽W18罩、三叶桨、红色机身与铜质表面散热器。源文件保存于art/racers，制作脚本art/build_race_aircraft.py，运行时GLB位于public/models/race。

模型含开口座舱、坐垫、仪表、风挡、发动机整流罩、排气管、机翼散热面、浮筒舭线/断阶、支柱/拉线、检修扣、独立螺旋桨与舵面节点、原创漆面分缝图和顶点AO。照片重建存在尺寸资料与视角限制，未达到工程图逐铆钉复刻标准。不同机型共用制作工具，但有独立的尺寸、机身站位、翼面参数、发动机罩、浮筒间距与桨叶数。

## 本次上传图的具体落实

- S.6：蓝银连续分色曲面、水平管状散热区、银色主翼、蓝色V底/银色甲板浮筒、流线支柱与X形拉线；翼展9.14米，全长7.87米。
- Gloster VI：金色机身、浅赭色有翼肋的圆头主翼、银色浮筒、N249三色方向舵和双叶金属桨；翼展7.92米，全长8.23米。
- M.67：宽W18一体发动机罩、下部及翼面铜质散热器、三叶金属桨、外置冷却接头、红白浮筒和贴合曲面的10号标识；翼展9.98米，全长7.65米，按意大利空军资料校正整体高度约2.97米。用户照片中的黑色博物馆支架不属于飞机，未建入模型。

三个模型分别采用机身站位曲线，非共享同一个外形缩放。机翼有翼型厚度、圆弧翼尖、贴合后缘的独立副翼，尾翼有曲线轮廓与独立舵面。浮筒包含硬舭、V形龙骨、滑行断阶。漆面为有色绝缘清漆，金属/铜材与金箭金色表面分别保留金属度与细微粗糙度，分缝和散热管细节使用可过滤纹理避免几何微细节闪烁。固定几何合并，螺旋桨及舵面仍独立，单机约25个材质绘制分组。源模型、原创贴图均打包保留。

上述为照片辅助的游戏资产重建，细节与局部曲率仍存在估计，不能替代制造蓝图；历史照片中的材质颜色也受展馆照明与老照片色差影响。尺寸检查与浏览器视觉检查分开记录。
