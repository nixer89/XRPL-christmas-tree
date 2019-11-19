//general
export const DROPS = 1000000;
export const XRP_PER_MINUTE = 0.05;
export const USE_PROXY = true;
export const PROXY = "http://proxy.wincor-nixdorf.com:81";

//hue api
export const HUE_USER_NAME = process.env.HUE_USER_NAME || '';
export const HUE_GROUP_NAME = process.env.HUE_GROUP_NAME || ''

//twitter api real
export const TWITTER_USER_NAME = process.env.TWITTER_USER_NAME || 'nixerFFM';
export const TWITTER_CONSUMER_KEY = process.env.TWITTER_CONSUMER_KEY;
export const TWITTER_CONSUMER_SECRET = process.env.TWITTER_CONSUMER_SECRET;
export const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN;
export const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET;

//XRPL
export const XRPL_SERVER = process.env.XRPL_SERVER || 'wss://s.altnet.rippletest.net';
//Source Account
export const XRPL_SOURCE_ACCOUNT = process.env.XRPL_SOURCE_ACCOUNT || 'rNZ72DKSUCPtQgx5SrEWqPZXKyWRS2bfVh';
export const XRPL_SOURCE_ACCOUNT_SECRET = process.env.XRPL_SOURCE_ACCOUNT_SECRET || 'ssTaAZ31UUPt7oKZkcikVn9iT3xyR'
//Destination Account im X-Address format
export const XRPL_DESTINATION_ACCOUNT_X_ADDRESS = process.env.XRPL_DESTINATION_ACCOUNT_X_ADDRESS || 'XV4DUpDDhGe6uwTitMx8kzfSbe5Jiyy85DEKbWSV8ckMah5'