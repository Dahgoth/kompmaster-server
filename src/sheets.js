import { google } from 'googleapis';
function sheetId(url){const m=String(url||'').match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);return m?.[1]||'';}
function normalizeHeader(v){return String(v||'').trim().toLowerCase().replace(/ё/g,'е');}
function findIndex(headers, variants){return headers.findIndex(h=>variants.some(v=>h.includes(v)));}
export async function fetchSheetProducts(sheetUrl){
  if(!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON не настроен');
  const credentials=JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth=new google.auth.GoogleAuth({credentials,scopes:['https://www.googleapis.com/auth/spreadsheets.readonly']});
  const sheets=google.sheets({version:'v4',auth});
  const spreadsheetId=sheetId(sheetUrl);if(!spreadsheetId)throw new Error('Не удалось определить ID Google Sheets');
  const meta=await sheets.spreadsheets.get({spreadsheetId,fields:'sheets.properties'});
  const title=meta.data.sheets?.[0]?.properties?.title;if(!title)throw new Error('В таблице нет листов');
  const resp=await sheets.spreadsheets.values.get({spreadsheetId,range:`${title}!A:Z`});
  const rows=resp.data.values||[];if(rows.length<2)return [];
  const headers=rows[0].map(normalizeHeader);
  const ni=findIndex(headers,['наимен','назван','товар','name','модель']);
  const pi=findIndex(headers,['цена','price','стоим']);
  const qi=findIndex(headers,['колич','остат','доступ','qty','quantity']);
  if(ni<0||pi<0)throw new Error('Не найдены колонки названия и цены. Первая строка должна содержать заголовки.');
  return rows.slice(1).map((r,i)=>({name:String(r[ni]||'').trim(),price:Number(String(r[pi]||'').replace(/[^0-9.,]/g,'').replace(',','.')),quantity:qi>=0?Number(String(r[qi]||'0').replace(/[^0-9]/g,'')):0,sortOrder:i})).filter(x=>x.name&&Number.isFinite(x.price)&&x.price>=0).map(x=>({...x,price:Math.round(x.price),quantity:Number.isFinite(x.quantity)?Math.max(0,Math.round(x.quantity)):0}));
}
