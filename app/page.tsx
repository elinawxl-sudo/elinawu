"use client";

import { useMemo, useRef, useState } from "react";

type Meal = {
  name: string;
  portion: string;
  kcal: number;
  carbs: number;
  protein: number;
  fiber: number;
  omega: number;
  score: number;
  tags: string[];
  warning?: string;
};

const meals: Meal[] = [
  { name: "香煎三文鱼", portion: "约 180g", kcal: 374, carbs: 2, protein: 39, fiber: 0, omega: 3.7, score: 94, tags: ["高 Omega-3", "优质蛋白"] },
  { name: "蒜蓉西兰花", portion: "约 220g", kcal: 132, carbs: 18, protein: 8, fiber: 7, omega: 0.3, score: 91, tags: ["高纤维", "十字花科"] },
  { name: "藜麦南瓜饭", portion: "约 260g", kcal: 346, carbs: 63, protein: 11, fiber: 9, omega: 0.4, score: 86, tags: ["全谷物", "β-胡萝卜素"] },
  { name: "糖醋里脊", portion: "约 150g", kcal: 428, carbs: 37, protein: 24, fiber: 1, omega: 0.1, score: 42, tags: ["高油", "添加糖"], warning: "油炸与糖醋汁会增加精制糖和饱和脂肪。建议改为烤里脊，酱汁减半。" },
];

const foodData: Record<string, {name:string; note:string}[]> = {
  "肉类·蛋白": [
    ["深海三文鱼", "Omega-3 丰富"], ["沙丁鱼", "低汞高钙"], ["鲭鱼", "EPA/DHA 丰富"], ["鳟鱼", "优质蛋白"], ["虾", "低脂高蛋白"],
    ["去皮鸡腿", "嫩且脂肪适中"], ["鸡胸肉", "低脂高蛋白"], ["火鸡肉", "瘦肉优选"], ["鸡蛋", "营养密度高"], ["豆腐", "植物蛋白"]
  ].map(([name,note])=>({name,note})),
  "蔬菜瓜类": [
    ["西兰花", "萝卜硫素"], ["菠菜", "叶酸与镁"], ["羽衣甘蓝", "多酚丰富"], ["番茄", "番茄红素"], ["紫甘蓝", "花青素"],
    ["彩椒", "维生素 C"], ["芦笋", "益生元纤维"], ["秋葵", "可溶性纤维"], ["南瓜", "β-胡萝卜素"], ["茄子", "花青素"]
  ].map(([name,note])=>({name,note})),
  "水果": [
    ["蓝莓", "花青素之王"], ["草莓", "低糖高维 C"], ["樱桃", "天然多酚"], ["石榴", "鞣花酸"], ["牛油果", "单不饱和脂肪"],
    ["橙子", "维 C 与纤维"], ["猕猴桃", "维 C 丰富"], ["苹果", "果胶丰富"], ["葡萄柚", "低糖清爽"], ["树莓", "高纤低糖"]
  ].map(([name,note])=>({name,note})),
  "调料": [
    ["特级初榨橄榄油", "多酚与好脂肪"], ["姜黄", "姜黄素"], ["生姜", "姜辣素"], ["大蒜", "含硫化合物"], ["肉桂", "帮助控糖"],
    ["迷迭香", "抗氧化香草"], ["黑胡椒", "提升姜黄素吸收"], ["苹果醋", "凉拌优选"], ["孜然", "增香少盐"], ["薄荷", "清爽解腻"]
  ].map(([name,note])=>({name,note})),
};

function Icon({children}:{children:string}) { return <span className="icon" aria-hidden="true">{children}</span>; }

export default function Home() {
  const [tab, setTab] = useState<"today"|"foods">("today");
  const [foodTab, setFoodTab] = useState("肉类·蛋白");
  const [uploaded, setUploaded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const totals = useMemo(()=>meals.reduce((a,m)=>({kcal:a.kcal+m.kcal,carbs:a.carbs+m.carbs,protein:a.protein+m.protein,fiber:a.fiber+m.fiber,omega:a.omega+m.omega}),{kcal:0,carbs:0,protein:0,fiber:0,omega:0}),[]);
  const eaten = Object.fromEntries(Object.entries(totals).map(([k,v])=>[k, +(v*0.8).toFixed(1)]));
  const analyze = (file?:File) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file)); setAnalyzing(true); setUploaded(false);
    window.setTimeout(()=>{setAnalyzing(false);setUploaded(true)}, 1500);
  };

  return <main>
    <header className="topbar">
      <button className="brand" onClick={()=>setTab("today")}><span className="brandmark">食</span><span><b>家味健康</b><small>家庭饮食管理</small></span></button>
      <nav aria-label="主导航">
        <button className={tab==="today"?"active":""} onClick={()=>setTab("today")}><Icon>⌂</Icon>今日饮食</button>
        <button className={tab==="foods"?"active":""} onClick={()=>setTab("foods")}><Icon>♧</Icon>健康食材库</button>
      </nav>
      <div className="date">8月11日 · 星期二</div>
    </header>

    {tab==="today" ? <div className="page">
      <section className="welcome">
        <div><span className="eyebrow">TODAY'S TABLE</span><h1>今天吃得怎么样？</h1><p>拍下做好的菜，营养和建议交给我们。</p></div>
        <div className="goal-mini"><span>今日家庭目标</span><b>2,800 <small>kcal</small></b><em>女主人 1,000 · 男主人 1,800</em></div>
      </section>

      <section className="upload-card">
        <div className="upload-copy"><span className="step">1</span><div><h2>上传今天的菜</h2><p>一张照片可以同时识别多道菜</p></div></div>
        <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={e=>analyze(e.target.files?.[0])}/>
        <button className="upload-zone" onClick={()=>input.current?.click()}>
          {preview ? <img src={preview} alt="待分析的菜品"/> : <div className="camera"><Icon>◉</Icon></div>}
          <div><strong>{preview?"重新拍一张":"拍照或选择照片"}</strong><span>支持 JPG、PNG，建议从菜品正上方拍摄</span></div>
          <b>选择照片</b>
        </button>
        {analyzing && <div className="analyzing"><i/><span>正在识别菜品与估算分量…</span></div>}
      </section>

      <section className="analysis-head"><div><span className="step">2</span><div><h2>营养分析</h2><p>{uploaded?"已识别 4 道菜 · AI 估算，请按实际用料校正":"今日午餐示例 · 4 道菜"}</p></div></div><span className="score">抗炎评分 <b>82</b><small>/100</small></span></section>

      <div className="meal-grid">
        {meals.map((m,i)=><article className="meal" key={m.name}>
          <div className={`dish dish-${i}`}><span>{["🐟","🥦","🎃","🍖"][i]}</span><b className={m.score>80?"good":"caution"}>{m.score>80?"推荐":"需注意"}</b></div>
          <div className="meal-body"><div className="meal-title"><div><h3>{m.name}</h3><span>{m.portion}</span></div><button aria-label={`编辑${m.name}`}>✎</button></div>
          <div className="macros"><b>{m.kcal}<small>千卡</small></b><span>碳水 <strong>{m.carbs}g</strong></span><span>蛋白 <strong>{m.protein}g</strong></span><span>纤维 <strong>{m.fiber}g</strong></span></div>
          <div className="tags">{m.tags.map(t=><span key={t}>✦ {t}</span>)}</div>{m.warning&&<p className="warning">! {m.warning}</p>}</div>
        </article>)}
      </div>

      <section className="summary-card">
        <div className="summary-top"><div><span className="step">3</span><div><h2>家庭实际摄入</h2><p>按做菜总量的 80% 计入 · 剩余约 20%</p></div></div><b>{eaten.kcal}<small> kcal</small></b></div>
        <div className="metric-row">
          {[['热量',eaten.kcal,'kcal'],['碳水',eaten.carbs,'g'],['蛋白质',eaten.protein,'g'],['纤维素',eaten.fiber,'g'],['Omega-3',eaten.omega,'g']].map(([n,v,u])=><div key={n}><span>{n}</span><b>{v}<small>{u}</small></b></div>)}
        </div>
        <div className="people">
          <Person name="男主人" icon="男" color="blue" ratio="60%" kcal={Math.round(Number(eaten.kcal)*.6)} target={1800} eaten={eaten}/>
          <Person name="女主人" icon="女" color="coral" ratio="40%" kcal={Math.round(Number(eaten.kcal)*.4)} target={1000} eaten={eaten}/>
        </div>
      </section>

      <section className="advice"><div className="advice-icon">☀</div><div><span>今日营养师建议</span><h2>整体搭配不错，再做两个小调整</h2><ul><li>晚餐用清蒸鱼或豆腐替代糖醋里脊，减少约 180 千卡和添加糖。</li><li>女主人今日还可摄入约 590 千卡，晚餐主食减半，多加一份深色蔬菜。</li><li>Omega-3 表现优秀；明天可换成沙丁鱼或核桃，丰富食材来源。</li></ul></div></section>
      <p className="disclaimer">营养结果基于图片与常见烹饪方式估算，仅用于日常饮食管理，不替代医生或营养师建议。</p>
    </div> : <FoodLibrary foodTab={foodTab} setFoodTab={setFoodTab}/>} 
  </main>
}

function Person({name,icon,color,ratio,kcal,target,eaten}:{name:string;icon:string;color:string;ratio:string;kcal:number;target:number;eaten:Record<string,number>}) {
  const p=Math.round(kcal/target*100);
  const factor=name==="男主人"?.6:.4;
  return <div className="person"><div className={`avatar ${color}`}>{icon}</div><div className="person-main"><div className="person-name"><h3>{name}<span>分餐 {ratio}</span></h3><b>{kcal}<small> / {target} kcal</small></b></div><div className="bar"><i style={{width:`${Math.min(p,100)}%`}}/></div><div className="person-metrics"><span>碳水 <b>{Math.round(eaten.carbs*factor)}g</b></span><span>蛋白 <b>{Math.round(eaten.protein*factor)}g</b></span><span>纤维 <b>{(eaten.fiber*factor).toFixed(1)}g</b></span><span>Omega-3 <b>{(eaten.omega*factor).toFixed(1)}g</b></span></div></div></div>
}

function FoodLibrary({foodTab,setFoodTab}:{foodTab:string;setFoodTab:(s:string)=>void}) {
 return <div className="page library"><section className="library-hero"><span className="eyebrow">ANTI-INFLAMMATORY PANTRY</span><h1>健康食材库</h1><p>遵循地中海饮食与抗炎原则，好吃、好买、好搭配。</p><div className="principles"><span>✓ 优质脂肪</span><span>✓ 丰富多酚</span><span>✓ 高纤低加工</span><span>✓ 多样天然色彩</span></div></section>
 <section className="food-panel"><div className="food-tabs">{Object.keys(foodData).map(k=><button className={foodTab===k?"active":""} onClick={()=>setFoodTab(k)} key={k}>{k}</button>)}</div><div className="top-title"><div><span>TOP</span><b>10</b></div><h2>{foodTab}推荐清单<small>按抗炎价值、营养密度与家常易做程度综合排序</small></h2></div><div className="food-grid">{foodData[foodTab].map((f,i)=><article key={f.name}><span className={i<3?"rank top":"rank"}>{String(i+1).padStart(2,'0')}</span><div className={`food-dot dot-${i%5}`}>{["✦","●","◆","✿","▲"][i%5]}</div><div><h3>{f.name}</h3><p>{f.note}</p></div><button aria-label={`收藏${f.name}`}>＋</button></article>)}</div></section>
 <section className="tip"><span>本周采购小建议</span><h2>每类选 3–5 种，颜色尽量不重复</h2><p>深绿色蔬菜 + 红紫色水果 + 深海鱼 + 橄榄油，是最容易坚持的抗炎组合。调料用姜黄配黑胡椒，更利于姜黄素吸收。</p></section></div>
}
