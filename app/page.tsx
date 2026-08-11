"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { recipeMeals } from "./recipe-data";

type Meal = {
  mealType: "早餐" | "午餐";
  name: string;
  portion: string;
  kcal: number;
  carbs: number;
  protein: number;
  fiber: number;
  omega: number;
  score: number;
  tags: string[];
  image: string;
  focus: string;
  warning?: string;
};

const meals: Meal[] = [
  { mealType:"早餐", name:"贝果配奶酪火腿黄桃", portion:"家庭份约 2 个贝果", kcal:820, carbs:108, protein:31, fiber:7, omega:0.2, score:61, tags:["主食", "乳制品"], image:"/current-meal/2026-08-11-breakfast.jpg", focus:"18% 20%", warning:"火腿与奶酪的钠和饱和脂肪偏高；建议火腿减半，部分换成鸡蛋或低盐鱼肉。" },
  { mealType:"早餐", name:"鸡蛋时蔬沙拉", portion:"鸡蛋约 3 个 + 时蔬", kcal:385, carbs:24, protein:24, fiber:9, omega:0.4, score:88, tags:["优质蛋白", "高纤维"], image:"/current-meal/2026-08-11-breakfast.jpg", focus:"63% 40%" },
  { mealType:"早餐", name:"果奶／酸奶饮", portion:"约 2 碗 400ml", kcal:310, carbs:42, protein:16, fiber:5, omega:0.6, score:84, tags:["钙", "益生菌"], image:"/current-meal/2026-08-11-breakfast.jpg", focus:"90% 30%" },
  { mealType:"早餐", name:"坚果与黄桃", portion:"坚果约 30g + 水果", kcal:265, carbs:30, protein:7, fiber:6, omega:0.5, score:90, tags:["不饱和脂肪", "多酚"], image:"/current-meal/2026-08-11-breakfast.jpg", focus:"57% 72%" },
  { mealType:"午餐", name:"清蒸鱼", portion:"整鱼可食部约 350g", kcal:560, carbs:7, protein:72, fiber:0, omega:1.7, score:92, tags:["优质蛋白", "Omega-3"], image:"/current-meal/2026-08-11-lunch.jpg", focus:"46% 17%" },
  { mealType:"午餐", name:"虫草花牛肉片", portion:"牛肉约 250g", kcal:620, carbs:18, protein:52, fiber:3, omega:0.1, score:73, tags:["高蛋白", "红肉"], image:"/current-meal/2026-08-11-lunch.jpg", focus:"55% 76%", warning:"牛肉份量和炒油偏高；两人合计建议控制在 200g 左右，并少油少盐。" },
  { mealType:"午餐", name:"木耳炒荷兰豆", portion:"约 320g", kcal:245, carbs:28, protein:8, fiber:9, omega:0.2, score:91, tags:["高纤维", "菌菇多糖"], image:"/current-meal/2026-08-11-lunch.jpg", focus:"21% 66%" },
  { mealType:"午餐", name:"清炒青菜", portion:"约 300g", kcal:185, carbs:14, protein:7, fiber:6, omega:0.2, score:93, tags:["深色蔬菜", "叶酸"], image:"/current-meal/2026-08-11-lunch.jpg", focus:"78% 35%" },
  { mealType:"午餐", name:"杂粮饭（照片补充）", portion:"熟重约 320g", kcal:390, carbs:82, protein:8, fiber:5, omega:0.1, score:80, tags:["全谷物", "复合碳水"], image:"/current-meal/2026-08-11-lunch.jpg", focus:"88% 75%" },
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

function canvasPdf(canvas:HTMLCanvasElement,filename:string){
  const encoded=canvas.toDataURL("image/jpeg",.94).split(",")[1];
  const binary=atob(encoded);
  const image=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)image[i]=binary.charCodeAt(i);
  const encoder=new TextEncoder();
  const chunks:Uint8Array[]=[];
  const offsets:number[]=[];
  let cursor=0;
  const push=(value:string|Uint8Array)=>{const part=typeof value==="string"?encoder.encode(value):value;chunks.push(part);cursor+=part.length};
  const object=(id:number,write:()=>void)=>{offsets[id]=cursor;push(`${id} 0 obj\n`);write();push("\nendobj\n")};
  push("%PDF-1.4\n");
  object(1,()=>push("<< /Type /Catalog /Pages 2 0 R >>"));
  object(2,()=>push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
  object(3,()=>push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>"));
  object(4,()=>{push(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`);push(image);push("\nendstream")});
  const content="q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n";
  object(5,()=>push(`<< /Length ${content.length} >>\nstream\n${content}endstream`));
  const xref=cursor;
  push("xref\n0 6\n0000000000 65535 f \n");
  for(let i=1;i<=5;i++)push(`${String(offsets[i]).padStart(10,"0")} 00000 n \n`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const blob=new Blob(chunks,{type:"application/pdf"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");link.href=url;link.download=filename;link.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function createDailyReportPdf(eaten:Record<string,number>){
  const canvas=document.createElement("canvas");canvas.width=1240;canvas.height=1754;
  const ctx=canvas.getContext("2d");if(!ctx)return;
  const ink="#202521",muted="#747c77",green="#315c49",line="#e2e6e3",paper="#f7f8f6",white="#ffffff",coral="#b97764",blue="#607d88";
  const font='"PingFang SC","Microsoft YaHei",sans-serif';
  const card=(x:number,y:number,w:number,h:number,fill=white)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,18);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=line;ctx.lineWidth=2;ctx.stroke()};
  const write=(text:string,x:number,y:number,size:number,color=ink,weight=400,align:CanvasTextAlign="left")=>{ctx.font=`${weight} ${size}px ${font}`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(text,x,y)};
  const wrapped=(text:string,x:number,y:number,maxWidth:number,lineHeight:number,maxLines=3)=>{let lineText="",lines=0;for(const char of text){const next=lineText+char;if(ctx.measureText(next).width>maxWidth&&lineText){ctx.fillText(lineText,x,y+lines*lineHeight);lineText=char;lines++;if(lines===maxLines-1)break}else lineText=next}if(lineText&&lines<maxLines)ctx.fillText(lineText,x,y+lines*lineHeight);return lines+1};
  ctx.fillStyle=paper;ctx.fillRect(0,0,canvas.width,canvas.height);
  write("朱医生 & 巫豆豆",70,82,27,green,650);write("家庭饮食健康管理",70,118,18,muted,400);
  const now=new Date();const date=new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(now);
  write(date,1170,82,18,muted,400,"right");write("今日饮食营养报告",70,190,49,ink,650);write("成品照 + 菜谱/用料截图交叉分析 · 按做菜总量的 80% 计入实际摄入",70,230,19,muted,400);
  ctx.fillStyle=green;ctx.fillRect(70,263,1100,4);
  write("01  菜品识别",70,315,22,green,650);
  meals.forEach((meal,index)=>{const col=index%3,row=Math.floor(index/3);const x=70+col*370,y=342+row*145;card(x,y,350,128);write(`${meal.mealType} · ${meal.name}`,x+18,y+32,17,ink,650);write(meal.portion,x+18,y+55,11,muted,400);write(String(meal.kcal),x+18,y+91,27,green,650);write("kcal",x+77,y+91,11,muted,400);write(`碳 ${meal.carbs}g`,x+132,y+85,12,ink,500);write(`蛋 ${meal.protein}g`,x+204,y+85,12,ink,500);write(`纤 ${meal.fiber}g`,x+276,y+85,12,ink,500);ctx.fillStyle=meal.score>80?"#e7f0e9":"#f7e8e3";ctx.beginPath();ctx.roundRect(x+270,y+14,62,22,11);ctx.fill();write(`${meal.score}分`,x+301,y+30,11,meal.score>80?green:coral,650,"center")});
  write("02  早餐 + 午餐家庭实际摄入",70,795,22,green,650);card(70,820,1100,145);
  const metrics:[[string,number,string],[string,number,string],[string,number,string],[string,number,string],[string,number,string]]=[["热量",eaten.kcal,"kcal"],["碳水",eaten.carbs,"g"],["蛋白质",eaten.protein,"g"],["纤维素",eaten.fiber,"g"],["Omega-3",eaten.omega,"g"]];
  metrics.forEach(([name,value,unit],index)=>{const x=70+index*220;write(name,x+110,858,15,muted,400,"center");write(String(value),x+110,906,30,index===0?green:ink,650,"center");write(unit,x+110,936,13,muted,400,"center");if(index<4){ctx.fillStyle=line;ctx.fillRect(x+219,842,2,98)}});
  write("03  男女主人分餐",70,1000,22,green,650);
  const people=[{name:"男主人",ratio:"60%",kcal:Math.round(eaten.kcal*.6),target:1800,color:blue,factor:.6,note:"目标体重 <70kg"},{name:"女主人",ratio:"40%",kcal:Math.round(eaten.kcal*.4),target:1450,color:coral,factor:.4,note:"60 天减脂计划"}];
  people.forEach((person,index)=>{const x=70+index*560,y=1028;card(x,y,540,195);ctx.fillStyle=person.color;ctx.beginPath();ctx.arc(x+48,y+47,24,0,Math.PI*2);ctx.fill();write(person.name[0],x+48,y+56,20,white,650,"center");write(person.name,x+86,y+43,22,ink,650);write(`分餐 ${person.ratio} · ${person.note}`,x+86,y+70,14,muted,400);write(`${person.kcal} / ${person.target} kcal`,x+515,y+48,18,ink,650,"right");ctx.fillStyle="#e9eeeb";ctx.beginPath();ctx.roundRect(x+25,y+96,490,9,5);ctx.fill();ctx.fillStyle=green;ctx.beginPath();ctx.roundRect(x+25,y+96,Math.min(490,490*person.kcal/person.target),9,5);ctx.fill();write(`碳水 ${Math.round(eaten.carbs*person.factor)}g`,x+25,y+151,15,muted,500);write(`蛋白 ${Math.round(eaten.protein*person.factor)}g`,x+145,y+151,15,muted,500);write(`纤维 ${(eaten.fiber*person.factor).toFixed(1)}g`,x+270,y+151,15,muted,500);write(`Omega-3 ${(eaten.omega*person.factor).toFixed(1)}g`,x+390,y+151,15,muted,500)});
  write("04  今日反馈建议",70,1280,22,green,650);card(70,1308,1100,340);
  const advice=[`男主人早餐午餐分餐约 ${Math.round(eaten.kcal*.6)} kcal，已接近 1,800 kcal 预算，晚餐宜清淡。`,`女主人早餐午餐分餐约 ${Math.round(eaten.kcal*.4)} kcal，晚餐可安排约 ${Math.max(0,1450-Math.round(eaten.kcal*.4))} kcal。`,"清蒸鱼、木耳荷兰豆、青菜和坚果提供较好的 Omega-3、纤维与多酚。","火腿奶酪与牛肉的钠、红肉和饱和脂肪偏高；下次火腿减半，牛肉两人合计约 200g。"];
  advice.forEach((text,index)=>{const y=1360+index*70;ctx.fillStyle=index===3?coral:green;ctx.beginPath();ctx.arc(100,y-7,7,0,Math.PI*2);ctx.fill();ctx.font=`400 18px ${font}`;ctx.fillStyle=ink;ctx.textAlign="left";wrapped(text,125,y,990,29,2)});
  ctx.fillStyle=line;ctx.fillRect(70,1690,1100,2);write("营养结果基于图片与常见烹饪方式估算，仅用于家庭日常饮食管理。",70,1723,13,muted,400);write("ONE PAGE · PRIVATE FAMILY REPORT",1170,1723,12,muted,500,"right");
  const stamp=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  canvasPdf(canvas,`朱医生巫豆豆-今日饮食报告-${stamp}.pdf`);
}

export default function Home() {
  const [tab, setTab] = useState<"today"|"foods"|"recipes">("today");
  const [foodTab, setFoodTab] = useState("肉类·蛋白");
  const [uploadCount, setUploadCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const totals = useMemo(()=>meals.reduce((a,m)=>({kcal:a.kcal+m.kcal,carbs:a.carbs+m.carbs,protein:a.protein+m.protein,fiber:a.fiber+m.fiber,omega:a.omega+m.omega}),{kcal:0,carbs:0,protein:0,fiber:0,omega:0}),[]);
  const eaten = Object.fromEntries(Object.entries(totals).map(([k,v])=>[k, +(v*0.8).toFixed(1)]));
  const selectMealFiles = (files?:FileList|null) => setUploadCount(files?.length||0);
  const downloadReport=()=>{setExporting(true);window.requestAnimationFrame(()=>{try{createDailyReportPdf(eaten)}finally{setExporting(false)}})};

  return <main>
    <header className="topbar">
      <button className="brand" onClick={()=>setTab("today")}><span><b>朱医生 <em>&amp;</em> 巫豆豆</b><small>家庭饮食健康管理</small></span></button>
      <nav aria-label="主导航">
        <button className={tab==="today"?"active":""} onClick={()=>setTab("today")}><Icon>⌂</Icon>今日饮食</button>
        <button className={tab==="foods"?"active":""} onClick={()=>setTab("foods")}><Icon>♧</Icon>健康食材库</button>
        <button className={tab==="recipes"?"active":""} onClick={()=>setTab("recipes")}><Icon>▦</Icon>菜谱数据库</button>
      </nav>
      <button className="download-report" onClick={downloadReport} disabled={exporting} aria-label="下载今日饮食单页报告"><span aria-hidden="true">↓</span><b>{exporting?"生成中…":"下载今日报告"}</b></button>
    </header>

    {tab==="today" ? <div className="page">
      <section className="welcome">
        <div className="welcome-main">
          <div className="compact-upload"><input ref={input} type="file" accept="image/*" multiple hidden onChange={e=>selectMealFiles(e.target.files)}/><button onClick={()=>input.current?.click()}>＋ 上传菜谱与成品图</button><span>{uploadCount?`已选择 ${uploadCount} 张图片`:`可一次多选菜谱和餐食照片`}</span></div>
          <span className="eyebrow">TODAY'S TABLE</span><h1>今天吃得怎么样？</h1><p>11 号菜谱已与早餐、午餐照片对应分析。</p>
        </div>
        <div className="goal-mini"><span>今日家庭目标</span><b>3,250 <small>kcal</small></b><em>女主人 1,450 · 男主人 1,800</em></div>
      </section>

      <section className="body-plan">
        <div className="plan-title"><div className="avatar coral">女</div><div><span>女主人 · 60 天减脂计划</span><h2>56.45 → 51.45 kg</h2><p>目标体脂 ≤ 25% · 预计 9 月 19 日达成</p></div></div>
        <div className="plan-progress"><div><span>第 22 天 / 60 天</span><b>还需减 5.0 kg</b></div><div className="goalbar"><i style={{width:"37%"}}/></div><small>建议每周下降 0.5–0.7 kg，优先保住肌肉</small></div>
        <div className="body-stats"><div><span>当前体脂</span><b>29.8<small>%</small></b></div><div><span>每日建议</span><b>1,450<small>kcal</small></b></div><div><span>蛋白目标</span><b>90<small>g+</small></b></div><div><span>静息消耗</span><b>1,318<small>kcal</small></b></div></div>
      </section>

      <section className="male-plan">
        <div className="male-plan-main">
          <div className="plan-title"><div className="avatar blue">男</div><div><span>男主人 · 70kg 以下维持计划</span><h2>71.75 → &lt; 70 kg</h2><p>体测基线 2026.05.09 · BMI 23.7</p></div></div>
          <div className="male-stats"><div><span>基线体脂</span><b>18.2<small>%</small></b></div><div><span>骨骼肌</span><b>27.79<small>kg</small></b></div><div><span>每日预算</span><b>1,800<small>kcal 起</small></b></div><div><span>静息消耗</span><b>1,676<small>kcal</small></b></div></div>
          <div className="male-rule"><span>维持逻辑</span><b>先缓慢回到 70kg 内，再按两周均重小幅调整</b><p>每周固定 3 次晨起称重；达到目标后若体重仍持续下降，每次增加 100–200 kcal，不因单日波动改变饮食。</p></div>
        </div>
      </section>

      <section className="analysis-head"><div><span className="step">1</span><div><h2>11 号菜谱营养分析</h2><p>菜谱文字与两张成品照交叉核对 · 共识别早餐 4 项、午餐 5 项</p></div></div><span className="score">抗炎评分 <b>84</b><small>/100</small></span></section>

      <div className="meal-grid">
        {meals.map(m=><article className="meal" key={m.name}>
          <div className="dish dish-photo"><img src={m.image} alt={`${m.mealType}餐食照片` } style={{objectPosition:m.focus}}/><em>{m.mealType}</em><b className={m.score>80?"good":"caution"}>{m.score>80?"推荐":"需注意"}</b></div>
          <div className="meal-body"><div className="meal-title"><div><h3>{m.name}</h3><span>{m.portion}</span></div><button aria-label={`编辑${m.name}`}>✎</button></div>
          <div className="macros"><b>{m.kcal}<small>千卡</small></b><span>碳水 <strong>{m.carbs}g</strong></span><span>蛋白 <strong>{m.protein}g</strong></span><span>纤维 <strong>{m.fiber}g</strong></span></div>
          <div className="tags">{m.tags.map(t=><span key={t}>✦ {t}</span>)}</div>{m.warning&&<p className="warning">! {m.warning}</p>}</div>
        </article>)}
      </div>

      <section className="summary-card">
        <div className="summary-top"><div><span className="step">2</span><div><h2>早餐 + 午餐家庭实际摄入</h2><p>按做菜总量的 80% 计入 · 剩余约 20%</p></div></div><b>{eaten.kcal}<small> kcal</small></b></div>
        <div className="metric-row">
          {[['热量',eaten.kcal,'kcal'],['碳水',eaten.carbs,'g'],['蛋白质',eaten.protein,'g'],['纤维素',eaten.fiber,'g'],['Omega-3',eaten.omega,'g']].map(([n,v,u])=><div key={n}><span>{n}</span><b>{v}<small>{u}</small></b></div>)}
        </div>
        <div className="people">
          <Person name="男主人" icon="男" color="blue" ratio="60%" kcal={Math.round(Number(eaten.kcal)*.6)} target={1800} eaten={eaten}/>
          <Person name="女主人" icon="女" color="coral" ratio="40%" kcal={Math.round(Number(eaten.kcal)*.4)} target={1450} eaten={eaten}/>
        </div>
      </section>

      <section className="advice"><div className="advice-icon">☀</div><div><span>基于菜谱、照片与两人体测的今日建议</span><h2>鱼、蔬菜和坚果表现很好，晚餐宜清淡收口</h2><ul><li>本次早餐与午餐合计实际摄入估算约 {eaten.kcal} 千卡；男主人分餐约 {Math.round(Number(eaten.kcal)*.6)} 千卡，已接近 1,800 千卡预算，晚餐如饿可选无油蔬菜汤或少量低脂蛋白。</li><li>女主人分餐约 {Math.round(Number(eaten.kcal)*.4)} 千卡，距离 1,450 千卡约余 {Math.max(0,1450-Math.round(Number(eaten.kcal)*.4))} 千卡；晚餐以蔬菜和少量豆腐、虾仁为主。</li><li>清蒸鱼、木耳荷兰豆、青菜和坚果提供较好的 Omega-3、纤维与多酚，是今天抗炎得分的主要来源。</li><li>贝果配火腿奶酪与虫草花牛肉的钠、红肉和饱和脂肪相对偏高；下次火腿减半、牛肉两人合计控制在约 200g。</li></ul></div></section>
      <p className="disclaimer">营养结果基于图片与常见烹饪方式估算，仅用于日常饮食管理，不替代医生或营养师建议。</p>
    </div> : tab==="foods" ? <FoodLibrary foodTab={foodTab} setFoodTab={setFoodTab}/> : <RecipeLibrary/>} 
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

type Rating = "好吃"|"还行"|"祛除";

function RecipeLibrary() {
  const [ratings,setRatings]=useState<Record<string,Rating>>({});
  const [filter,setFilter]=useState<"全部"|"未标记"|Rating>("全部");
  const [search,setSearch]=useState("");
  const [saving,setSaving]=useState("");
  const [notice,setNotice]=useState("正在同步标记…");
  useEffect(()=>{fetch("/api/recipe-ratings").then(r=>r.json()).then(data=>{
    const next:Record<string,Rating>={};
    for(const row of data.ratings||[]) next[row.dishId]=row.rating;
    setRatings(next); setNotice("");
  }).catch(()=>setNotice("暂时无法同步，刷新后重试"));},[]);
  const allDishes=recipeMeals.flatMap(m=>m.dishes.map((name,i)=>({id:`${m.id}-${i}`,name})));
  const calibratedMeals=recipeMeals.filter(m=>m.recipeNo).length;
  const counts={"全部":allDishes.length,"未标记":allDishes.filter(d=>!ratings[d.id]).length,"好吃":allDishes.filter(d=>ratings[d.id]==="好吃").length,"还行":allDishes.filter(d=>ratings[d.id]==="还行").length,"祛除":allDishes.filter(d=>ratings[d.id]==="祛除").length};
  const visible=recipeMeals.map(m=>({...m,dishes:m.dishes.map((name,i)=>({name,id:`${m.id}-${i}`})).filter(d=>(!search||d.name.includes(search))&&(filter==="全部"||(filter==="未标记"?!ratings[d.id]:ratings[d.id]===filter)))})).filter(m=>m.dishes.length);
  const save=async(id:string,rating:Rating)=>{
    const old=ratings[id]; setRatings(v=>({...v,[id]:rating})); setSaving(id); setNotice("");
    try{const res=await fetch("/api/recipe-ratings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dishId:id,rating})});if(!res.ok)throw new Error();}
    catch{setRatings(v=>{const n={...v};if(old)n[id]=old;else delete n[id];return n});setNotice("这次没有保存成功，请再点一次");}
    finally{setSaving("")}
  };
  return <div className="page recipes-page">
    <section className="recipe-hero"><div><span className="eyebrow">FAMILY RECIPE ARCHIVE</span><h1>菜谱数据库</h1><p>已从 33 顿历史餐食中拆出 {allDishes.length} 道菜，其中 {calibratedMeals} 顿已用原菜谱逐项校准；其余保留为照片识别，方便继续复核与打标。</p></div><div className="mark-progress"><span>首轮打标进度</span><b>{allDishes.length-counts.未标记}<small> / {allDishes.length} 道</small></b><div><i style={{width:`${Math.round((allDishes.length-counts.未标记)/allDishes.length*100)}%`}}/></div></div></section>
    <section className="recipe-tools">
      <div className="rating-filters">{(["全部","未标记","好吃","还行","祛除"] as const).map(f=><button key={f} className={`${filter===f?"active":""} filter-${f}`} onClick={()=>setFilter(f)}>{f}<b>{counts[f]}</b></button>)}</div>
      <label className="recipe-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索菜名" aria-label="搜索菜名"/></label>
    </section>
    {notice&&<p className="sync-notice">{notice}</p>}
    <div className="recipe-grid">{visible.map((m,index)=><article className="recipe-card" key={m.id}>
      <div className={`meal-photo ${m.recipeNo?"calibrated":""}`}><img src={m.image} alt={`历史餐食 ${index+1}`}/><span>{m.recipeNo?`${m.recipeNo}号菜谱 · ${m.mealSlot}`:m.kind}</span><b>{m.recipeNo?"菜谱校准":`照片识别 · 餐食 ${String(recipeMeals.findIndex(x=>x.id===m.id)+1).padStart(2,"0")}`}</b></div>
      <div className="recipe-list"><div className="recipe-card-title"><h2>{m.recipeNo?"菜谱校准菜品":"照片识别菜品"}</h2><span>{m.dishes.length} 道</span></div>
        {m.dishes.map(d=><div className="recipe-row" key={d.id}><div><span className="dish-check">{ratings[d.id]?"✓":""}</span><strong>{d.name}</strong></div><div className={`rating-buttons ${saving===d.id?"saving":""}`}>{(["好吃","还行","祛除"] as Rating[]).map(r=><button key={r} className={ratings[d.id]===r?`selected selected-${r}`:""} onClick={()=>save(d.id,r)} aria-pressed={ratings[d.id]===r}>{r}</button>)}</div></div>)}
      </div>
    </article>)}</div>
    {!visible.length&&<div className="empty-recipes"><b>没有找到对应菜品</b><span>换个筛选条件或搜索词试试</span></div>}
    <p className="recipe-footnote">“菜谱校准”来自原菜谱与成品照交叉匹配；“照片识别”仍可能存在偏差。口味标记会保存在家庭数据库中，之后可继续修改。</p>
  </div>
}
