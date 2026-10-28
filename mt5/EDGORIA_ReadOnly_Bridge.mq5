//+------------------------------------------------------------------+
//| EDGORIA Read-Only Bridge for MetaTrader 5                        |
//| History API only. Does NOT place, modify or close orders.       |
//+------------------------------------------------------------------+
#property strict
#property version "3.00"
input string EDGORIA_Endpoint = "https://YOUR-EDGORIA-DOMAIN.vercel.app/api/mt5-ingest";
input string EDGORIA_Token = "";
input int SynchronizeSeconds = 300;
input int HistoryDaysFirstImport = 0; // 0 = todo el historial disponible

string EscapeJSON(const string value){
 string s=value;
 StringReplace(s,"\\","\\\\"); StringReplace(s,"\"","\\\"");
 StringReplace(s,"\r"," ");StringReplace(s,"\n"," ");
 return s;
}
string Key(){return "EDGORIA_"+IntegerToString((long)AccountInfoInteger(ACCOUNT_LOGIN))+"_LAST";}
int OnInit(){
 if(StringLen(EDGORIA_Token)!=64 || StringFind(EDGORIA_Endpoint,"https://")!=0){Print("EDGORIA: Configura el endpoint HTTPS y token de 64 caracteres.");return INIT_PARAMETERS_INCORRECT;}
 if(SynchronizeSeconds<60){Print("EDGORIA: El intervalo mínimo es 60 segundos.");return INIT_PARAMETERS_INCORRECT;}
 EventSetTimer(SynchronizeSeconds);
 Print("EDGORIA Read-Only Bridge listo. Autoriza URL en MT5: Herramientas > Opciones > Asesores Expertos > Permitir WebRequest.");
 return INIT_SUCCEEDED;
}
void OnDeinit(const int reason){EventKillTimer();}
void OnTimer(){SyncDeals();}

bool SendBatch(const string payload){
 string headers="Content-Type: application/json\r\nAuthorization: Bearer "+EDGORIA_Token+"\r\n";
 char bytes[];int copied=StringToCharArray(payload,bytes,0,WHOLE_ARRAY,CP_UTF8);
 if(copied<=1)return false;
 ArrayResize(bytes,copied-1); // exclude NUL terminator
 char response[];string responseHeaders="";
 ResetLastError();
 int code=WebRequest("POST",EDGORIA_Endpoint,headers,20000,bytes,response,responseHeaders);
 if(code!=200){Print("EDGORIA: sincronización falló, HTTP=",code," MT5 error=",GetLastError());return false;}
 return true;
}
void SyncDeals(){
 datetime end=TimeCurrent();
 datetime start=HistoryDaysFirstImport<=0?0:end-((datetime)HistoryDaysFirstImport)*86400;
 if(GlobalVariableCheck(Key()))start=(datetime)GlobalVariableGet(Key())-86400;
 if(start<0)start=0;
 if(!HistorySelect(start,end)){Print("EDGORIA: Historial MT5 no disponible.");return;}
 const long login=AccountInfoInteger(ACCOUNT_LOGIN);
 const string server=AccountInfoString(ACCOUNT_SERVER);
 const string currency=AccountInfoString(ACCOUNT_CURRENCY);
 int total=HistoryDealsTotal(),batch=0;
 Print("EDGORIA: leyendo ",total," ejecuciones MT5 disponibles para sincronización");
 string list="";
 for(int i=0;i<total;i++){
  ulong ticket=HistoryDealGetTicket(i);
  if(ticket==0)continue;
  long type=HistoryDealGetInteger(ticket,DEAL_TYPE);
  if(type!=DEAL_TYPE_BUY && type!=DEAL_TYPE_SELL)continue; // skip balance/deposit/withdrawals
  long pos=HistoryDealGetInteger(ticket,DEAL_POSITION_ID);
  if(pos<=0)continue;
  if(batch>0)list+=",";
  list+="{\"ticket\":\""+IntegerToString((long)ticket)+"\",\"position\":\""+IntegerToString(pos)+"\",\"symbol\":\""+EscapeJSON(HistoryDealGetString(ticket,DEAL_SYMBOL))+"\"";
  list+=",\"time\":"+IntegerToString((long)HistoryDealGetInteger(ticket,DEAL_TIME));
  list+=",\"type\":"+IntegerToString(type)+",\"entry\":"+IntegerToString((long)HistoryDealGetInteger(ticket,DEAL_ENTRY));
  list+=",\"volume\":"+DoubleToString(HistoryDealGetDouble(ticket,DEAL_VOLUME),4);
  list+=",\"profit\":"+DoubleToString(HistoryDealGetDouble(ticket,DEAL_PROFIT),4);
  list+=",\"commission\":"+DoubleToString(HistoryDealGetDouble(ticket,DEAL_COMMISSION),4);
  list+=",\"swap\":"+DoubleToString(HistoryDealGetDouble(ticket,DEAL_SWAP),4);
  list+=",\"fee\":"+DoubleToString(HistoryDealGetDouble(ticket,DEAL_FEE),4)+"}";
  batch++;
  if(batch==100){
   string body="{\"login\":\""+IntegerToString(login)+"\",\"server\":\""+EscapeJSON(server)+"\",\"currency\":\""+EscapeJSON(currency)+"\",\"deals\":["+list+"]}";
   if(!SendBatch(body))return;list="";batch=0;
  }
 }
 if(batch>0){
  string body="{\"login\":\""+IntegerToString(login)+"\",\"server\":\""+EscapeJSON(server)+"\",\"currency\":\""+EscapeJSON(currency)+"\",\"deals\":["+list+"]}";
  if(!SendBatch(body))return;
 }
 GlobalVariableSet(Key(),(double)end);
 Print("EDGORIA: historial enviado sin ejecutar órdenes.");
}
