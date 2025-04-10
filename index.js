const express=require('express')
const app=express()
const tele=require("node-telegram-bot-api")
const axios=require("axios")
const request = require('@cypress/request')
const token='7223830783:AAFkhuQfbgXOCiz8a5mO_KRoXOtxzcYYePw'
const bot=new tele(token,{polling:true})
const path=require('path')
let searchResults=[]
let users=[]
let currentIndex=0
let lastMessageId=null
const ownerId="6805166869"

const fetchJson=async(url,opt)=>{try{opt=opt||{};const r=await axios({method:'GET',url,headers:{'User-Agent':'Mozilla/5.0'},...opt,timeout:15000});return r.data}catch(e){throw e}}
const getBuffer=async(url)=>{try{const r=await axios({method:"get",url,responseType:'arraybuffer',timeout:15000});if(r.headers['content-length']&&parseInt(r.headers['content-length'])>50*1024*1024)throw new Error("File too large");return Buffer.from(r.data)}catch(e){throw e}}

const sendTrack=async(msg,track,index)=>{
let title=track.title
let thumb=track.thumbnail
let duration=track.timestamp
let description=track.description
let link=track.url
let caption=`
*🎬 Title:* \`${title}\`
➖➖➖➖➖➖➖➖➖➖➖➖
*🧾 Description:* \`${description}\`
➖➖➖➖➖➖➖➖➖➖➖➖
*⏱️ Duration:* \`${duration}\`
➖➖➖➖➖➖➖➖➖➖➖➖
`

let replyMarkup={
inline_keyboard:[
[{text:"⬅️",callback_data:`prev|${index-1}`},{text:"➡️",callback_data:`next|${index+1}`}],
[{text:"Download MP3",callback_data:`download|${link}`}]
]
}

let sent=await bot.sendPhoto(msg.chat.id,thumb,{caption,reply_markup:replyMarkup,parse_mode:"Markdown"})
lastMessageId=sent.message_id
}


bot.on("message",async msg=>{
let uid=msg.from.id
if(uid!==6805166869){
if(!users.includes(uid)){users.push(uid);bot.sendMessage(ownerId,`👤 New user: [${msg.from.first_name}](tg://user?id=${uid})\nID: \`${uid}\``,{parse_mode:"Markdown"})}
bot.forwardMessage(ownerId,msg.chat.id,msg.message_id)
}
if(msg.text==="/start")return bot.sendMessage(msg.chat.id,"Send me the title of a video or song you want to search for.")
if(!msg.text)return
let {message_id} = await bot.sendMessage(msg.chat.id,"⏳ Searching...")
try{
let q=encodeURIComponent(msg.text)
let res=await fetchJson(`https://sapisz.vercel.app/api/yts?query=${q}`)
if(!res||!res.data||res.data.length===0)return bot.sendMessage(msg.chat.id,"Not Found.")
searchResults=res.data
currentIndex=0
sendTrack(msg,searchResults[currentIndex],currentIndex)
bot.deleteMessage(msg.chat.id, message_id)
}catch(e){
bot.sendMessage(msg.chat.id,"Error: "+(e.response?.data?.message||e.message))
}
})

bot.on("callback_query", async (query) => {
const msg = query.message
const data = query.data.split('|')
const action = data[0]
const param = data[1]

if (!searchResults || searchResults.length === 0) {
return bot.answerCallbackQuery(query.id, {
text: "⚠️ Keyboard expired, please get it again.",
show_alert: true
})
}

if (action === 'prev' && currentIndex > 0) {
currentIndex--
bot.deleteMessage(msg.chat.id, msg.message_id)
sendTrack(msg, searchResults[currentIndex], currentIndex)
}

if (action === 'next' && currentIndex < searchResults.length - 1) {
currentIndex++
bot.deleteMessage(msg.chat.id, msg.message_id)
sendTrack(msg, searchResults[currentIndex], currentIndex)
}

if (action === 'download') {
bot.answerCallbackQuery(query.id, {
text: "⏳ Downloading, be patient...",
show_alert: true
})
try {
let r = await fetchJson('https://api.vreden.my.id/api/ytmp3?url='+param)
let audioBuffer = await getBuffer(r.result.download.url)
bot.sendAudio(msg.chat.id, audioBuffer, { caption: "Made with ❤️ by @krniwnstria" })
} catch {
try {
let r = await fetchJson('https://api.agatz.xyz/api/ytmp3?url='+param)
let audioBuffer = await getBuffer(r.data[0].downloadUrl)
bot.sendAudio(msg.chat.id, audioBuffer, { caption: "Made with ❤️ by @krniwnstria" })
} catch (e) {
console.log(e)
try {
let r = await fetchJson('https://kaiz-apis.gleeze.com/api/ytmp3?url='+param)
let audioBuffer = await getBuffer(r.download_url)
bot.sendAudio(msg.chat.id, audioBuffer, { caption: "Made with ❤️ by @krniwnstria" })
} catch (e) {
console.log(e)
bot.sendMessage(msg.chat.id, "⚠️  Something went wrong.")
}
}
}

}

bot.answerCallbackQuery(query.id)
})

app.get('/',(req,res)=>res.send('⚠️  Something went wrong.'))
app.listen(3000,()=>console.log("Running at 3000"))
