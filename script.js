
const $=id=>document.getElementById(id);
const sourceLanguage=$("sourceLanguage");
const targetLanguage=$("targetLanguage");
const sourceText=$("inputText");
const translatedText=$("outputText");
const translateButton=$("translateButton");
const swapButton=$("swapButton");
const clearButton=$("clearButton");
const copyButton=$("copyButton");
const clearHistoryButton=$("clearHistoryButton");
const charCount=$("charCount");
const status=$("statusMessage");
const message=$("message");
const historyList=$("historyList");
const translatorPage=$("translatorPage");
const historyPage=$("historyPage");
const translatorPageButton=$("translatorPageButton");
const historyPageButton=$("historyPageButton");
const HISTORY_KEY="translationHistory";
const MAX_CHARACTERS=450;
const languageNames={en:"English",te:"Telugu",hi:"Hindi",ta:"Tamil",kn:"Kannada",ml:"Malayalam",fr:"French",de:"German",es:"Spanish",it:"Italian",ja:"Japanese",ko:"Korean","zh-CN":"Chinese",ar:"Arabic",pt:"Portuguese",ru:"Russian"};

function showMessage(text,type=""){
    message.textContent=text;
    message.className="message "+type;
}

function getHistory(){
    try{
        const items=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");
        return Array.isArray(items)?items:[];
    }catch{
        return [];
    }
}

function saveHistory(original,translation,from,to){
    const items=getHistory();
    items.unshift({id:Date.now().toString(36)+Math.random().toString(36).slice(2),original,translation,from,to,date:new Date().toLocaleString()});
    try{
        localStorage.setItem(HISTORY_KEY,JSON.stringify(items.slice(0,10)));
        renderHistory();
    }catch{
        showMessage("Translation completed, but history could not be saved.","error");
    }
}

function decodeEntities(text){
    const textarea=document.createElement("textarea");
    textarea.innerHTML=text;
    return textarea.value;
}

async function requestTranslation(text,from,to){
    const params=new URLSearchParams({q:text,langpair:`${from}|${to}`});
    const controller=new AbortController();
    const timeoutId=setTimeout(()=>controller.abort(),20000);
    try{
        const response=await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`,{signal:controller.signal});
        if(!response.ok){
            if(response.status===429)throw new Error("Free translation limit reached. Try again later.");
            throw new Error(`Translation service error (${response.status}).`);
        }
        const data=await response.json();
        if(Number(data.responseStatus)!==200)throw new Error(data.responseDetails||"The service could not translate this text.");
        const result=data.responseData?.translatedText;
        if(typeof result!=="string"||!result.trim())throw new Error("The service returned an empty translation.");
        return decodeEntities(result).trim();
    }finally{
        clearTimeout(timeoutId);
    }
}

function renderHistory(){
    const items=getHistory();
    historyList.replaceChildren();
    if(items.length===0){
        const empty=document.createElement("p");
        empty.className="empty-history";
        empty.textContent="No translation history yet.";
        historyList.appendChild(empty);
        return;
    }
    items.forEach(item=>{
        const card=document.createElement("article");
        card.className="history-item";
        const languages=document.createElement("div");
        languages.className="history-languages";
        languages.textContent=`${languageNames[item.from]||item.from} → ${languageNames[item.to]||item.to} · ${item.date||""}`;
        const original=document.createElement("p");
        original.className="history-original";
        original.textContent="Original: "+item.original;
        const translation=document.createElement("p");
        translation.className="history-translation";
        translation.textContent="Translation: "+item.translation;
        const actions=document.createElement("div");
        actions.className="history-actions";
        const useButton=document.createElement("button");
        useButton.type="button";
        useButton.textContent="Use Again";
        useButton.addEventListener("click",()=>{
            sourceText.value=item.original;
            translatedText.value=item.translation;
            sourceLanguage.value=item.from;
            targetLanguage.value=item.to;
            charCount.textContent=`${sourceText.value.length} / ${MAX_CHARACTERS}`;
            showPage("translator");
            status.textContent="Loaded from history";
        });
        const copyHistoryButton=document.createElement("button");
        copyHistoryButton.type="button";
        copyHistoryButton.textContent="Copy";
        copyHistoryButton.addEventListener("click",()=>copyText(item.translation));
        const deleteButton=document.createElement("button");
        deleteButton.type="button";
        deleteButton.textContent="Delete";
        deleteButton.addEventListener("click",()=>{
            const updated=getHistory().filter(entry=>entry.id!==item.id);
            localStorage.setItem(HISTORY_KEY,JSON.stringify(updated));
            renderHistory();
            showMessage("Translation deleted.","success");
        });
        actions.append(useButton,copyHistoryButton,deleteButton);
        card.append(languages,original,translation,actions);
        historyList.appendChild(card);
    });
}

function showPage(page){
    const showHistory=page==="history";
    translatorPage.hidden=showHistory;
    historyPage.hidden=!showHistory;
    if(showHistory)renderHistory();
    showMessage("");
    window.scrollTo({top:0,behavior:"smooth"});
}

historyPageButton.addEventListener("click",()=>showPage("history"));
translatorPageButton.addEventListener("click",()=>showPage("translator"));

sourceText.addEventListener("input",()=>{
    charCount.textContent=`${sourceText.value.length} / ${MAX_CHARACTERS}`;
});

translateButton.addEventListener("click",async()=>{
    const text=sourceText.value.trim();
    const from=sourceLanguage.value;
    const to=targetLanguage.value;
    if(!text){
        showMessage("Please enter text to translate.","error");
        sourceText.focus();
        return;
    }
    if(from===to){
        translatedText.value=text;
        status.textContent="Translation complete";
        saveHistory(text,text,from,to);
        showMessage("Both languages are the same.","success");
        return;
    }
    translateButton.disabled=true;
    translateButton.textContent="Translating...";
    translatedText.value="";
    showMessage("Contacting the free translation service...");
    try{
        const result=await requestTranslation(text,from,to);
        translatedText.value=result;
        status.textContent="Translation complete";
        saveHistory(text,result,from,to);
        showMessage("Translation received. Check important translations for accuracy.","success");
    }catch(error){
        status.textContent="Translation failed";
        showMessage(error.name==="AbortError"?"Request timed out. Please try again.":error.message||"Check your internet connection and try again.","error");
    }finally{
        translateButton.disabled=false;
        translateButton.textContent="Translate Text";
    }
});

swapButton.addEventListener("click",()=>{
    const oldLanguage=sourceLanguage.value;
    sourceLanguage.value=targetLanguage.value;
    targetLanguage.value=oldLanguage;
    const oldText=sourceText.value;
    sourceText.value=translatedText.value;
    translatedText.value=oldText;
    charCount.textContent=`${sourceText.value.length} / ${MAX_CHARACTERS}`;
    status.textContent="Languages swapped";
    showMessage("");
});

clearButton.addEventListener("click",()=>{
    sourceText.value="";
    translatedText.value="";
    charCount.textContent=`0 / ${MAX_CHARACTERS}`;
    status.textContent="Ready to translate";
    showMessage("");
    sourceText.focus();
});

copyButton.addEventListener("click",()=>copyText(translatedText.value));

async function copyText(text){
    if(!text.trim()){
        showMessage("There is no text to copy.","error");
        return;
    }
    try{
        await navigator.clipboard.writeText(text);
        showMessage("Text copied successfully.","success");
    }catch{
        showMessage("Copy failed. Select the text and copy it manually.","error");
    }
}

clearHistoryButton.addEventListener("click",()=>{
    if(getHistory().length===0){
        showMessage("There is no history to clear.");
        return;
    }
    if(confirm("Delete all saved translation history?")){
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
        showMessage("All history deleted.","success");
    }
});

renderHistory();
