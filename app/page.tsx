"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { recipeMeals } from "./recipe-data";

type Meal = {
  mealType: "早餐" | "午餐" | "晚餐";
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

type AnalysisStatus = "done" | "ready" | "analyzing";
type MealSlot = "菜谱" | "早餐" | "午餐" | "晚餐";
type FoodMealSlot = Exclude<MealSlot,"菜谱">;
type ReferenceMatch = { recipeId:string; distance:number };
type ImageMatchOptions = Record<number,Partial<Record<FoodMealSlot,ReferenceMatch>>>;
const MEAL_SLOTS: MealSlot[] = ["菜谱", "早餐", "午餐", "晚餐"];
const FOOD_MEAL_SLOTS: FoodMealSlot[] = ["早餐","午餐","晚餐"];

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

const defaultMealPhotoSources = (["早餐","午餐","晚餐"] as const).flatMap((slot,index)=>{
  const meal=meals.find(item=>item.mealType===slot);
  return meal?[{url:meal.image,index,slot}]:[];
});

const referenceFeatureCache=new Map<string,Promise<number[]>>();

function imageFeature(url:string){
  const cached=referenceFeatureCache.get(url);
  if(cached)return cached;
  const feature=new Promise<number[]>((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>{
      const canvas=document.createElement("canvas");
      canvas.width=16;canvas.height=16;
      const context=canvas.getContext("2d",{willReadFrequently:true});
      if(!context){reject(new Error("无法读取图片"));return;}
      context.drawImage(image,0,0,16,16);
      const pixels=context.getImageData(0,0,16,16).data;
      const values:number[]=[];
      for(let index=0;index<pixels.length;index+=4){
        values.push(pixels[index]/255,pixels[index+1]/255,pixels[index+2]/255);
      }
      resolve(values);
    };
    image.onerror=()=>reject(new Error("图片加载失败"));
    image.src=url;
  });
  if(!url.startsWith("blob:"))referenceFeatureCache.set(url,feature);
  return feature;
}

function featureDistance(left:number[],right:number[]){
  const length=Math.min(left.length,right.length);
  if(!length)return 1;
  let sum=0;
  for(let index=0;index<length;index++){const delta=left[index]-right[index];sum+=delta*delta;}
  return sum/length;
}

function referencesForSlot(slot:FoodMealSlot){
  if(slot==="早餐")return recipeMeals.filter(meal=>meal.mealSlot==="早餐"||(!meal.mealSlot&&meal.kind==="早餐"));
  return recipeMeals.filter(meal=>meal.mealSlot===slot);
}

async function matchMealPhotos(previews:string[],foodIndices:number[]){
  const options:ImageMatchOptions={};
  await Promise.all(foodIndices.map(async imageIndex=>{
    const uploadedFeature=await imageFeature(previews[imageIndex]);
    options[imageIndex]={};
    await Promise.all(FOOD_MEAL_SLOTS.map(async slot=>{
      const candidates=referencesForSlot(slot);
      const scored=await Promise.all(candidates.map(async candidate=>({candidate,distance:featureDistance(uploadedFeature,await imageFeature(candidate.image))})));
      scored.sort((left,right)=>left.distance-right.distance);
      if(scored[0])options[imageIndex][slot]={recipeId:scored[0].candidate.id,distance:scored[0].distance};
    }));
  }));
  let bestAssignment:Record<number,FoodMealSlot>={};
  let bestScore=Number.POSITIVE_INFINITY;
  const search=(position:number,available:FoodMealSlot[],assignment:Record<number,FoodMealSlot>,score:number)=>{
    if(position===foodIndices.length){if(score<bestScore){bestScore=score;bestAssignment={...assignment};}return;}
    const imageIndex=foodIndices[position];
    available.forEach(slot=>{
      assignment[imageIndex]=slot;
      search(position+1,available.filter(item=>item!==slot),assignment,score+(options[imageIndex]?.[slot]?.distance??1));
    });
  };
  search(0,FOOD_MEAL_SLOTS,{},0);
  return {options,assignment:bestAssignment};
}

function estimateDish(name:string,mealType:FoodMealSlot,image:string):Meal{
  const base={mealType,name,image,focus:"50% 50%",warning:undefined as string|undefined};
  const result=(portion:string,kcal:number,carbs:number,protein:number,fiber:number,omega:number,score:number,tags:string[],warning?:string):Meal=>({...base,portion,kcal,carbs,protein,fiber,omega,score,tags,warning});
  if(/杂粮饭|糙米|藜麦|米饭/.test(name))return result("家庭份熟重约 300g",390,82,8,5,.1,80,["全谷物","复合碳水"]);
  if(/面|意粉|河粉|粉$/.test(name))return result("家庭份约 2 盘",560,86,22,7,.2,68,["主食","碳水"],"面食份量与酱汁用油需控制，搭配足量蔬菜。 ");
  if(/贝果|面包|燕麦饼|鸡蛋饼/.test(name))return result("家庭份约 2 份",480,68,19,6,.2,76,["主食","早餐"]);
  if(/果奶|燕麦牛奶|豆浆|牛奶|酸奶/.test(name))return result("约 2 碗 400ml",280,39,12,5,.5,84,["钙","植物奶"]);
  if(/坚果.*水果|水果.*坚果|综合水果/.test(name))return result("坚果约 30g + 水果",310,34,7,7,.5,91,["不饱和脂肪","多酚"]);
  if(/沙拉/.test(name))return result("家庭份约 350g",250,26,8,10,.4,92,["高纤维","多酚"]);
  if(/鳗鱼|鲭鱼|青花鱼|带鱼|蒸鱼|煎鱼|黄花鱼|鲳鱼|鱼$/.test(name))return result("可食部约 320g",520,8,65,0,1.6,91,["优质蛋白","Omega-3"]);
  if(/虾|蟹|生蚝|牡蛎|海参/.test(name))return result("可食部约 280g",360,12,48,1,.7,88,["海鲜蛋白","锌硒"]);
  if(/鸡肉|鸡腿|鸡丁|鸡丝|手撕鸡|鸡胸|鸡翅/.test(name))return result("肉类约 260g",460,16,52,3,.2,82,["优质蛋白","少油"]);
  if(/牛肉|牛腩/.test(name))return result("牛肉约 230g",560,18,49,3,.1,72,["高蛋白","红肉"],"红肉建议两人合计控制在约 200g，并少油少盐。 ");
  if(/排骨|猪舌|腊肉|猪肉|肉片|肉末|肉沫|五指毛桃/.test(name))return result("肉类约 240g",590,20,42,3,.1,66,["动物蛋白","脂肪偏高"],"猪肉或排骨脂肪与钠偏高，女主人注意控制份量。 ");
  if(/鸭/.test(name))return result("可食部约 240g",530,18,40,3,.2,70,["动物蛋白","脂肪偏高"]);
  if(/鸡蛋|蒸蛋|蛋花|炒蛋/.test(name))return result("鸡蛋约 3 个",300,12,22,3,.4,86,["优质蛋白","胆碱"]);
  if(/豆腐|腐竹|千张|豆干|豆角|芸豆|四季豆/.test(name))return result("家庭份约 320g",330,29,22,9,.5,89,["植物蛋白","高纤维"]);
  if(/汤/.test(name))return result("家庭份约 600ml",180,18,14,4,.3,84,["汤羹","补水"]);
  if(/青菜|菜花|西兰花|菠菜|秋葵|莴笋|芦笋|娃娃菜|生菜|白菜|紫甘蓝|青瓜|黄瓜|冬瓜|节瓜|丝瓜|茄子|彩椒|兰豆|荷兰豆|木耳|金针菇|蘑菇|西葫芦/.test(name))return result("家庭份约 300g",190,23,8,9,.3,92,["深色蔬菜","高纤维"]);
  if(/水果|苹果|黄桃|橙|蓝莓|火龙果/.test(name))return result("家庭份约 300g",210,49,3,7,.2,90,["水果","多酚"]);
  return result("家庭份约 280g",320,26,24,5,.2,78,["家常菜","待复核"]);
}

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
  const blob=new Blob(chunks.map(part=>part.buffer.slice(part.byteOffset,part.byteOffset+part.byteLength) as ArrayBuffer),{type:"application/pdf"});
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
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const [imageSlots, setImageSlots] = useState<MealSlot[]>([]);
  const [imageMatchOptions, setImageMatchOptions] = useState<ImageMatchOptions>({});
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("done");
  const [exporting, setExporting] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const previewUrls = useRef<string[]>([]);
  const analysisTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const results = useRef<HTMLElement>(null);
  const mealPhotoSources=useMemo(
    ()=>{
      const usedSlots=new Set<Exclude<MealSlot,"菜谱">>();
      const sources:{url:string;index:number;slot:FoodMealSlot;match?:ReferenceMatch}[]=[];
      uploadPreviews.forEach((url,index)=>{
        const slot=imageSlots[index];
        if(!slot||slot==="菜谱"||usedSlots.has(slot))return;
        usedSlots.add(slot);
        sources.push({url,index,slot,match:imageMatchOptions[index]?.[slot]});
      });
      return sources;
    },
    [uploadPreviews,imageSlots,imageMatchOptions]
  );
  const activeMeals=useMemo(()=>{
    if(!uploadCount)return meals;
    return mealPhotoSources.flatMap(source=>{
      const reference=source.match?recipeMeals.find(meal=>meal.id===source.match?.recipeId):undefined;
      const names=reference?.dishes??meals.filter(meal=>meal.mealType===source.slot).map(meal=>meal.name);
      return names.map(name=>estimateDish(name,source.slot,source.url));
    });
  },[uploadCount,mealPhotoSources]);
  const totals = useMemo(()=>activeMeals.reduce((a,m)=>({kcal:a.kcal+m.kcal,carbs:a.carbs+m.carbs,protein:a.protein+m.protein,fiber:a.fiber+m.fiber,omega:a.omega+m.omega}),{kcal:0,carbs:0,protein:0,fiber:0,omega:0}),[activeMeals]);
  const eaten = Object.fromEntries(Object.entries(totals).map(([k,v])=>[k, +(v*0.8).toFixed(1)]));
  useEffect(()=>()=>{
    previewUrls.current.forEach(url=>URL.revokeObjectURL(url));
    if(analysisTimer.current)clearTimeout(analysisTimer.current);
  },[]);
  const selectMealFiles = async (files?:FileList|null) => {
    const selected=Array.from(files||[]);
    previewUrls.current.forEach(url=>URL.revokeObjectURL(url));
    const nextPreviews=selected.map(file=>URL.createObjectURL(file));
    previewUrls.current=nextPreviews;
    const sizes=await Promise.all(nextPreviews.map(url=>new Promise<{width:number;height:number}>(resolve=>{
      const image=new Image();
      image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});
      image.onerror=()=>resolve({width:1,height:1});
      image.src=url;
    })));
    const namedRecipeIndex=selected.findIndex(file=>/菜谱|菜单|recipe|menu|截图|screenshot/.test(file.name.toLowerCase()));
    const pngRecipeIndex=selected.findIndex(file=>file.type==="image/png");
    const recipeIndex=namedRecipeIndex>=0?namedRecipeIndex:pngRecipeIndex>=0?pngRecipeIndex:selected.length===4?sizes.reduce((best,size,index)=>size.width*size.height<sizes[best].width*sizes[best].height?index:best,0):-1;
    const foodIndices=selected.map((file,index)=>({file,index})).filter(({file,index})=>index!==recipeIndex&&!/菜谱|菜单|recipe|menu|截图|screenshot/.test(file.name.toLowerCase())).slice(0,3).map(item=>item.index);
    let matchOptions:ImageMatchOptions={};
    let assignment:Record<number,FoodMealSlot>={};
    try{
      const matched=await matchMealPhotos(nextPreviews,foodIndices);
      matchOptions=matched.options;assignment=matched.assignment;
    }catch{
      foodIndices.forEach((imageIndex,position)=>{assignment[imageIndex]=FOOD_MEAL_SLOTS[position]});
    }
    const nextSlots=selected.map((_,index):MealSlot=>foodIndices.includes(index)?(assignment[index]??"早餐"):"菜谱");
    setUploadPreviews(nextPreviews);
    setImageSlots(nextSlots);
    setImageMatchOptions(matchOptions);
    setUploadCount(selected.length);
    setAnalysisStatus(selected.length?"ready":"done");
  };
  const updateImageSlot=(index:number,slot:MealSlot)=>setImageSlots(current=>{
    const previous=current[index]||"菜谱";
    if(previous===slot)return current;
    const next=[...current];
    const conflict=slot==="菜谱"?-1:current.findIndex((value,itemIndex)=>itemIndex!==index&&value===slot);
    next[index]=slot;
    if(conflict>=0)next[conflict]=previous;
    return next;
  });
  const analyzeMeal=()=>{
    if(!uploadCount||analysisStatus==="analyzing")return;
    setAnalysisStatus("analyzing");
    analysisTimer.current=setTimeout(()=>{
      setAnalysisStatus("done");
      window.requestAnimationFrame(()=>results.current?.scrollIntoView({behavior:"smooth",block:"start"}));
    },1800);
  };
  const openMealPicker=()=>{
    if(!input.current)return;
    input.current.value="";
    input.current.click();
  };
  const downloadReport=()=>{setExporting(true);window.requestAnimationFrame(()=>{try{createDailyReportPdf(eaten)}finally{setExporting(false)}})};
  const showResults=uploadCount===0||analysisStatus==="done";

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
          <div className="compact-upload">
            <input ref={input} type="file" accept="image/*" multiple hidden onChange={e=>selectMealFiles(e.target.files)}/>
            <button className="upload-trigger" onClick={openMealPicker}>＋ 上传菜谱与成品图</button>
            <button className="analysis-trigger" onClick={analyzeMeal} disabled={!uploadCount||analysisStatus==="analyzing"}>{analysisStatus==="analyzing"?<><i/>分析中…</>:"开始营养分析"}</button>
            <span>{uploadCount?`已识别 ${imageSlots.filter(slot=>slot==="菜谱").length} 张菜谱（不展示）+ ${mealPhotoSources.length} 张餐食图`:`可一次多选菜谱和餐食照片`}</span>
          </div>
          <span className="eyebrow">TODAY'S TABLE</span><h1>今天吃得怎么样？</h1><p>按图片里的菜自动匹配菜谱与早、午、晚餐，不按上传顺序判断。</p>
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

      {uploadCount>0&&analysisStatus!=="done"&&<section className={`analysis-workbench ${analysisStatus}`} aria-live="polite" aria-busy={analysisStatus==="analyzing"}>
        <div className="analysis-preview-wrap"><div className="analysis-previews">{mealPhotoSources.map(source=><div key={source.url}><img src={source.url} alt={`${source.slot}待分析餐食图`}/><label><span>餐食图</span><select value={source.slot} onChange={event=>updateImageSlot(source.index,event.target.value as MealSlot)} aria-label={`调整餐食图 ${source.index+1} 餐次标签`}>{MEAL_SLOTS.filter(slot=>slot!=="菜谱").map(slot=><option key={slot}>{slot}</option>)}</select></label></div>)}</div>{imageSlots.some(slot=>slot==="菜谱")&&<p className="recipe-hidden-note">✓ 菜谱图已读取用于校准，不在页面显示</p>}</div>
        <div className="analysis-work-copy">
          {analysisStatus==="ready"?<><span>{mealPhotoSources.length} 张餐食图已经完成内容匹配</span><h2>点击“开始营养分析”生成三餐结果</h2><p>系统已将每张成品图与菜谱库实拍样本比对；菜谱截图不展示，餐次仍可手动调整。</p><button onClick={analyzeMeal}>开始营养分析 <b>→</b></button></>:<><span>正在分析三餐</span><h2>菜谱与三张成品图交叉识别中</h2><p>菜谱截图不会出现在分析结果中，请不要关闭页面。</p><div className="analysis-progress"><i/><i/><i/></div><ol><li>比对图中菜品</li><li>匹配菜谱餐次</li><li>计算营养和建议</li></ol></>}
        </div>
      </section>}

      {showResults&&<section ref={results} className="analysis-results">
      {uploadCount>0&&<div className="analysis-complete" role="status"><span>✓</span><div><b>营养分析完成 · 一餐一张图</b><small>已匹配 {imageSlots.filter(slot=>slot==="菜谱").length} 张菜谱和 {mealPhotoSources.length} 餐；每餐只显示一张原图，菜品与营养在图内拆分</small></div><button onClick={openMealPicker}>重新上传</button></div>}

      <section className="analysis-head"><div><span className="step">1</span><div><h2>{uploadCount?"逐张餐食图片分析":"11 号菜谱营养分析"}</h2><p>{uploadCount?`自动匹配 ${mealPhotoSources.map(source=>source.slot).join("、")||"餐食"} · 每张图汇总全部菜品与热量`:"菜谱文字与成品照交叉核对 · 共识别早餐 4 项、午餐 5 项"}</p></div></div><span className="score">抗炎评分 <b>84</b><small>/100</small></span></section>

      <div className="photo-analysis-list">
        {(uploadCount>0?mealPhotoSources:defaultMealPhotoSources).map((source,photoIndex)=>{
          const photoMeals=activeMeals.filter(meal=>meal.mealType===source.slot);
          const photoKcal=photoMeals.reduce((sum,meal)=>sum+meal.kcal,0);
          const photoProtein=photoMeals.reduce((sum,meal)=>sum+meal.protein,0);
          const sourceMatch=uploadCount>0?(source as {match?:ReferenceMatch}).match:undefined;
          const matchedReference=sourceMatch?recipeMeals.find(meal=>meal.id===sourceMatch.recipeId):undefined;
          const matchLevel=sourceMatch?(sourceMatch.distance<.015?"高":sourceMatch.distance<.05?"中":"参考"):"";
          return <article className="photo-analysis-card" key={`${source.url}-${source.slot}`}>
            <div className="photo-analysis-image"><img src={source.url} alt={`${source.slot}餐食图 ${photoIndex+1}`}/><label>{uploadCount>0?<><span>图 {source.index+1}</span><select value={source.slot} onChange={event=>updateImageSlot(source.index,event.target.value as MealSlot)} aria-label={`调整餐食图 ${source.index+1} 标签`}>{MEAL_SLOTS.map(slot=><option key={slot}>{slot}</option>)}</select></>:<strong>{source.slot}</strong>}</label></div>
            <div className="photo-analysis-body"><header><div><span>{source.slot} · 一餐一图</span><h3>本餐拆分 {photoMeals.length} 道菜</h3><p>{matchedReference?`图片内容匹配：${matchedReference.recipeNo?`${matchedReference.recipeNo}号菜谱 · ${matchedReference.mealSlot}`:"历史餐食样本"} · 相似度${matchLevel}`:"原图只显示一次；各道菜的份量与营养在下方逐项分析"}</p></div><div className="photo-total"><b>{photoKcal}<small> kcal</small></b><span>本餐蛋白质 {photoProtein}g</span></div></header>
              {photoMeals.length?<div className="photo-dishes">{photoMeals.map(meal=><div className="photo-dish-row" key={`${source.index}-${meal.name}`}><div><b>{meal.name}</b><small>{meal.portion}</small></div><strong>{meal.kcal}<small> kcal</small></strong><span>碳水 {meal.carbs}g</span><span>蛋白 {meal.protein}g</span><span>纤维 {meal.fiber}g</span><em className={meal.score>80?"good":"caution"}>{meal.score>80?"推荐":"需注意"}</em></div>)}</div>:<div className="photo-empty"><b>该餐次暂未匹配成功</b><span>请调整图片餐次标签后重新分析。</span></div>}
            </div>
          </article>;
        })}
        {uploadCount>0&&!mealPhotoSources.length&&<div className="photo-empty standalone"><b>还没有餐食成品图</b><span>请把至少一张图片标签从“菜谱”改为早餐、午餐或晚餐。</span></div>}
      </div>

      <section className="summary-card">
        <div className="summary-top"><div><span className="step">2</span><div><h2>{uploadCount?`${Array.from(new Set(mealPhotoSources.map(source=>source.slot))).join(" + ")||"本次餐食"}家庭实际摄入`:"早餐 + 午餐家庭实际摄入"}</h2><p>按做菜总量的 80% 计入 · 剩余约 20%</p></div></div><b>{eaten.kcal}<small> kcal</small></b></div>
        <div className="metric-row">
          {[['热量',eaten.kcal,'kcal'],['碳水',eaten.carbs,'g'],['蛋白质',eaten.protein,'g'],['纤维素',eaten.fiber,'g'],['Omega-3',eaten.omega,'g']].map(([n,v,u])=><div key={n}><span>{n}</span><b>{v}<small>{u}</small></b></div>)}
        </div>
        <div className="people">
          <Person name="男主人" icon="男" color="blue" ratio="60%" kcal={Math.round(Number(eaten.kcal)*.6)} target={1800} eaten={eaten}/>
          <Person name="女主人" icon="女" color="coral" ratio="40%" kcal={Math.round(Number(eaten.kcal)*.4)} target={1450} eaten={eaten}/>
        </div>
      </section>

      <section className="advice"><div className="advice-icon">☀</div><div><span>基于菜谱、照片与两人体测的今日建议</span><h2>三餐已按图片内容汇总，下一餐按剩余预算安排</h2><ul><li>本次已匹配餐食合计实际摄入估算约 {eaten.kcal} 千卡；男主人分餐约 {Math.round(Number(eaten.kcal)*.6)} 千卡，对照 1,800 千卡每日预算调整下一餐。</li><li>女主人分餐约 {Math.round(Number(eaten.kcal)*.4)} 千卡，距离 1,450 千卡约余 {Math.max(0,1450-Math.round(Number(eaten.kcal)*.4))} 千卡；减脂期优先保证蛋白质与蔬菜。</li><li>当日鱼类、豆制品、深色蔬菜和坚果是 Omega-3、纤维与多酚的主要来源，建议继续保留。</li><li>标为“需注意”的菜品通常油、盐、红肉或精制碳水偏高；下次可减油并缩小约四分之一份量。</li></ul></div></section>
      <p className="disclaimer">营养结果基于图片与常见烹饪方式估算，仅用于日常饮食管理，不替代医生或营养师建议。</p>
      </section>}
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
const RATING_STORAGE_KEY="family-recipe-ratings-v1";

function RecipeLibrary() {
  const [ratings,setRatings]=useState<Record<string,Rating>>({});
  const [filter,setFilter]=useState<"全部"|"未标记"|Rating>("全部");
  const [search,setSearch]=useState("");
  const [saving,setSaving]=useState("");
  const [notice,setNotice]=useState("");
  useEffect(()=>{
    try{
      const saved=window.localStorage.getItem(RATING_STORAGE_KEY);
      if(saved)setRatings(JSON.parse(saved));
    }catch{setNotice("本机标记暂时无法读取");}
  },[]);
  const allDishes=recipeMeals.flatMap(m=>m.dishes.map((name,i)=>({id:`${m.id}-${i}`,name})));
  const calibratedMeals=recipeMeals.filter(m=>m.recipeNo).length;
  const counts={"全部":allDishes.length,"未标记":allDishes.filter(d=>!ratings[d.id]).length,"好吃":allDishes.filter(d=>ratings[d.id]==="好吃").length,"还行":allDishes.filter(d=>ratings[d.id]==="还行").length,"祛除":allDishes.filter(d=>ratings[d.id]==="祛除").length};
  const visible=recipeMeals.map(m=>({...m,dishes:m.dishes.map((name,i)=>({name,id:`${m.id}-${i}`})).filter(d=>(!search||d.name.includes(search))&&(filter==="全部"||(filter==="未标记"?!ratings[d.id]:ratings[d.id]===filter)))})).filter(m=>m.dishes.length);
  const save=(id:string,rating:Rating)=>{
    setSaving(id);setNotice("");
    setRatings(current=>{
      const next={...current,[id]:rating};
      try{window.localStorage.setItem(RATING_STORAGE_KEY,JSON.stringify(next));}
      catch{setNotice("标记已显示，但本机没有保存成功");}
      return next;
    });
    setSaving("");
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
    <p className="recipe-footnote">“菜谱校准”来自原菜谱与成品照交叉匹配；“照片识别”仍可能存在偏差。口味标记会保存在当前设备中，之后可继续修改。</p>
  </div>
}
