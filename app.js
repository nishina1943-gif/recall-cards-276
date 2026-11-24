const el=id=>document.getElementById(id);
const storage='cgab-recall-v1';
let history={},cards=[],quizzes=[],queue=[],index=0,correct=0;
const quizMode=()=>el('mode').value==='quiz';
try{history=JSON.parse(localStorage.getItem(storage))||{}}catch{}
function show(screen){for(const id of ['home','study','done'])el(id).hidden=id!==screen}
function pool(){return (quizMode()?quizzes:cards).filter(c=>el('subject').value==='すべて'||el('subject').value===c.subject)}
function home(){
 const list=pool(),miss=list.filter(c=>history[c.id]==='retry').length;
 el('guide').textContent=quizMode()?'練習用の本文・数値を読んで選択してください。言語は3択、英語と計数は4択です。':'答えを思い出してからカードをめくります。';
 el('stats').textContent=list.length+'問中　覚えた '+list.filter(c=>history[c.id]==='known').length+'問 ／ 要復習 '+miss+'問';
 el('review').disabled=!miss;show('home');
}
function start(review){
 let list=pool().filter(c=>!review||history[c.id]==='retry');
 for(let j=list.length-1;j>0;j--){const k=Math.floor(Math.random()*(j+1));[list[k],list[j]]=[list[j],list[k]]}
 if(!review)list.sort((a,b)=>Number(history[a.id]==='known')-Number(history[b.id]==='known'));
 queue=list.slice(0,10);index=0;correct=0;if(!queue.length)return home();show('study');draw();
}
function draw(){
 const c=queue[index];el('position').textContent=(index+1)+' / '+queue.length+'問';el('bar').max=queue.length;el('bar').value=index;
 el('theme').textContent=[c.subject,c.topic].filter(Boolean).join('　／　');el('question').textContent=c.q;
 el('value').textContent=c.a;el('answer').hidden=true;el('ratings').hidden=true;el('flip').hidden=false;
 el('answer').firstElementChild.textContent='解答';
 el('next').hidden=true;el('passage').hidden=!quizMode();el('choices').hidden=!quizMode();
 if(!quizMode())return;
 el('flip').hidden=true;el('passage').textContent=c.passage;
 const answers=[c.a,...c.distractors];
 for(let j=answers.length-1;j>0;j--){const k=Math.floor(Math.random()*(j+1));[answers[k],answers[j]]=[answers[j],answers[k]]}
 const buttons=answers.map((text,i)=>{
  const button=document.createElement('button');button.textContent=(i+1)+'　'+text;
  button.onclick=()=>{
   const ok=text===c.a;record(ok);
   buttons.forEach((b,j)=>{b.disabled=true;if(answers[j]===c.a)b.classList.add('right')});
   if(!ok)button.classList.add('wrong');
   el('answer').firstElementChild.textContent=ok?'正解':'不正解　／　正しい答え';
   el('answer').hidden=false;el('next').hidden=false;el('next').textContent=index===queue.length-1?'結果を見る':'次の問題へ';
  };return button;
 });el('choices').replaceChildren(...buttons);
}
function record(ok){
 history[queue[index].id]=ok?'known':'retry';if(ok)correct++;
 try{localStorage.setItem(storage,JSON.stringify(history))}catch{el('status').hidden=false;el('status').textContent='このブラウザでは履歴を今回の利用中のみ保持します。'}
}
function advance(){
 if(++index<queue.length)return draw();
 el('summary').textContent='今回の'+queue.length+'問　／　覚えた '+correct+'問・もう一度 '+(queue.length-correct)+'問';
 el('again').disabled=!pool().some(c=>history[c.id]==='retry');show('done');
 if(quizMode())el('summary').textContent=queue.length+'問中 '+correct+'問正解　／　要復習 '+(queue.length-correct)+'問';
}
function rate(ok){record(ok);advance()}
el('mode').onchange=home;el('next').onclick=advance;
el('begin').onclick=()=>start(false);el('review').onclick=el('again').onclick=()=>start(true);
el('exit').onclick=el('menu').onclick=el('subject').onchange=home;
el('flip').onclick=()=>{el('answer').hidden=false;el('ratings').hidden=false;el('flip').hidden=true};
el('know').onclick=()=>rate(true);el('miss').onclick=()=>rate(false);
try{
 const raw=location.hash.slice(1);if(!raw)throw Error();
 const key=await crypto.subtle.importKey('raw',Uint8Array.from(atob(raw.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)),'AES-GCM',false,['decrypt']);
 const response=await fetch('deck.bin');if(!response.ok)throw Error();
 const data=new Uint8Array(await response.arrayBuffer());
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:data.slice(0,12)},key,data.slice(12));
 const groups=JSON.parse(new TextDecoder().decode(plain));
 cards=Object.entries(groups).flatMap(([subject,rows])=>rows.map(([topic,q,a],i)=>({subject,topic,q,a,id:subject+i})));
 const qr=await fetch('quiz.bin');if(!qr.ok)throw Error();
 const bytes=new Uint8Array(await qr.arrayBuffer());
 const quizGroups=JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12)},key,bytes.slice(12))));
 quizzes=Object.entries(quizGroups).flatMap(([subject,rows])=>rows.map(([passage,q,a,...distractors],i)=>({subject,passage,q,a,distractors,id:'quiz-'+subject+i})));
 el('status').hidden=true;home();
}catch{el('status').textContent='カードを開けません。共有URLを末尾までコピーして開き直してください。'}
