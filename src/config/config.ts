//general
export const DROPS:number = 1000000;
export const XRP_PER_MINUTE:number = (process.env.XRP_PER_MINUTE ? parseFloat(process.env.XRP_PER_MINUTE) : 0.05);
export const USE_PROXY:boolean = (process.env.USE_PROXY ? (process.env.USE_PROXY.toLowerCase() === 'true') : false);
export const PROXY:string = "http://proxy.wincor-nixdorf.com:81";
export const XRPTIPBOT_MQTT_URL:string = process.env.XRPTIPBOT_MQTT_URL || 'mqtt://mqtt.api.xrptipbot-stats.com:4001';

//hue api
export const HUE_BRIDGE_IP:string = process.env.HUE_BRIDGE_IP;
export const HUE_USER_NAME:string = process.env.HUE_USER_NAME;
export const HUE_GROUP_NAME:string = process.env.HUE_GROUP_NAME;
export const HUE_PARTY_GROUP_NAME:string = process.env.HUE_PARTY_GROUP_NAME;

//twitter api real
export const TWITTER_USER_NAME:string = process.env.TWITTER_USER_NAME || 'XRP_IoT_Tree';
export const TWITTER_CONSUMER_KEY:string = process.env.TWITTER_CONSUMER_KEY;
export const TWITTER_CONSUMER_SECRET:string = process.env.TWITTER_CONSUMER_SECRET;
export const TWITTER_ACCESS_TOKEN:string = process.env.TWITTER_ACCESS_TOKEN;
export const TWITTER_ACCESS_SECRET:string = process.env.TWITTER_ACCESS_SECRET;

//XRPL
export const XRPL_SERVER:string = process.env.XRPL_SERVER || 'wss://s.altnet.rippletest.net';
//Source Account
export const XRPL_SOURCE_ACCOUNT:string = process.env.XRPL_SOURCE_ACCOUNT || 'rNZ72DKSUCPtQgx5SrEWqPZXKyWRS2bfVh';
export const XRPL_SOURCE_ACCOUNT_SECRET:string = process.env.XRPL_SOURCE_ACCOUNT_SECRET;
//Destination Account im X-Address format
export const XRPL_DESTINATION_ACCOUNT_X_ADDRESS:string = process.env.XRPL_DESTINATION_ACCOUNT_X_ADDRESS || 'XV4DUpDDhGe6uwTitMx8kzfSbe5Jiyy85DEKbWSV8ckMah5';

//REMOTECONTROL
export const ENABLE_REMOTE_CONTROL:boolean = (process.env.ENABLE_REMOTE_CONTROL? (process.env.ENABLE_REMOTE_CONTROL.toLocaleLowerCase() === 'true') : false);
