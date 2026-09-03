const express=require('express'),webpush=require('web-push'),Parser=require('rss-parser'),fs=require('fs');
const app=express(),parser=new Parser(),file='subscriptions.json';let subs=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):[],
feeds={us:'https://news.google.com/rss/headlines/section/topic/NATION?hl=en-US&gl=US&ceid=US:en',world:'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en',tech:'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en',local:'https://news.google.com/rss/search?q=Ponca%20City%20Oklahoma&hl=en-US&gl=US&ceid=US:en'};
if(process.env.VAPID_SUBJECT&&process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY){webpush.setVapidDetails(process.env.VAPID_SUBJECT,process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);}
app.use(express.json());app.use(express.static('public'));
async function getFeed(url){return(await parser.parseURL(url)).items.slice(0,8)}
async function build(){const [us,world,tech,local]=await Promise.all(Object.values(feeds).map(getFeed));
const make=(title,icon,a)=>({title,icon,stories:a.slice(0,5).map(x=>({title:x.title,summary:(x.contentSnippet||x.content||'').replace(/\s+/g,' ').slice(0,320)||'Read the full story for details.',url:x.link}))});
return{sections:[make('Top Stories','⭐',[...us.slice(0,3),...world.slice(0,3),...tech.slice(0,2)]),make('U.S. News','🇺🇸',us),make('World News','🌎',world),make('Technology','💻',tech),make('Local News','📍',local)]}}
app.use(express.static(__dirname));
app.post('/api/subscribe',(q,r)=>{if(q.body?.endpoint&&!subs.some(s=>s.endpoint===q.body.endpoint)){subs.push(q.body);fs.writeFileSync(file,JSON.stringify(subs,null,2))}r.sendStatus(201)});
app.post('/api/send',async(q,r)=>{try{const b=await build(),top=b.sections[0].stories[0],payload=JSON.stringify({title:'Your Morning News is Ready',body:top?top.title:'Your morning briefing is ready.'});const results=await Promise.allSettled(subs.map(s=>webpush.sendNotification(s,payload)));subs=subs.filter((s,i)=>results[i].status==='fulfilled'||results[i].reason?.statusCode!==404);fs.writeFileSync(file,JSON.stringify(subs,null,2));r.sendStatus(201)}catch(e){console.error(e);r.sendStatus(500)}});
app.listen(process.env.PORT||3000,()=>console.log('Morning News running'));
