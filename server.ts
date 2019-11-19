import * as twitter from './api/twitterApi';
import * as xrpl from './api/xrplApi';
import * as hue from './api/hueApi';
import * as config from './config/config';
import * as util from './util';
import * as fetch from 'node-fetch';
import * as storage from 'node-persist'
import * as HttpsProxyAgent from 'https-proxy-agent';
import { FormattedSubmitResponse } from 'ripple-lib/dist/npm/transaction/submit';

import consoleStamp = require("console-stamp");
consoleStamp(console, { pattern: 'yyyy-mm-dd HH:MM:ss' });

let proxy = new HttpsProxyAgent(config.PROXY);

let twitterAPI:twitter.TwitterApi;
let xrplAPI:xrpl.XRPLApi;
let hueApi:hue.HueApi;

let christmasTreeOn:boolean = false;

initBot();

async function initBot() {
    //check if all environment variables are set
    try {

        if(!checkEnvironmentVariables()) {
            process.stdin.resume();
            return;
        }

        console.log("xrpl init")
        xrplAPI = new xrpl.XRPLApi();

        console.log("twitter init")
        twitterAPI = new twitter.TwitterApi();
        await twitterAPI.initTwitter();

        console.log("hue init")
        hueApi = new hue.HueApi();
        await hueApi.initHue(); 

        //init storage
        await storage.init({dir: 'storage/christmasTree'});

        christmasTreeOn = await storage.getItem("christmasTreeOn");
        if(!christmasTreeOn)
            await storage.setItem("christmasTreeOn", false);

        //check light status every 60 seconds
        setInterval(() => checkChristmasTreeLights(), 60000);
        //test();
        
    } catch(err) {
        writeToConsole(JSON.stringify(err));
    }
}

async function checkChristmasTreeLights() {
    let isCurrentlyOn = await hueApi.checkChristmasTreeStatus();
    christmasTreeOn = await storage.getItem("christmasTreeOn");
    
    if(isCurrentlyOn && !christmasTreeOn) {
        handleTreeTurnedOn();
    } else if(!isCurrentlyOn && christmasTreeOn) {
        handleTreeTurnedOff();
    }
}

async function handleTreeTurnedOn(): Promise<void> {
    //set start time
    await storage.setItem("startTime", Date.now());
    christmasTreeOn = true;
    await storage.setItem("christmasTreeOn", christmasTreeOn);
}

async function handleTreeTurnedOff(): Promise<void> {
    //saving new status
    christmasTreeOn = false;
    await storage.setItem("christmasTreeOn", christmasTreeOn);

    //calculating minutes it was on
    let endTime = Date.now();
    let startTime = await storage.getItem("startTime");

    if(startTime && endTime && (endTime-startTime)>0) {
        let minutes = Math.round((endTime - startTime) / 1000 / 60)*10;
        console.log("minutes: " + minutes);

        let xrpToPay:number = (minutes*config.DROPS * 0.05)/config.DROPS;
        console.log("xrpToPay: " + xrpToPay);

        let memo1:any = {type: "ChristmasTree", data:"IoT christmas tree, raising XRP for @GoodXrp charities."};
        let memo2:any = {type: "Running", data: minutes + " minutes"}
        let memo3:any = {type: "Sending", data: xrpToPay + " XRP to @" + config.TWITTER_USER_NAME + " -> (0.05 XRP per minute)"}

        let txResult:FormattedSubmitResponse = await xrplAPI.makePayment(xrpToPay+"", [memo1, memo2, memo3]);

        if("tesSUCCESS" === txResult.resultCode) {
            setTimeout( async () => tweetAboutPayment(xrpToPay, minutes, txResult), 60000);
        }
    }
}

async function tweetAboutPayment(xrpPaid:number, minutes: number, txResult:FormattedSubmitResponse): Promise<void> {
    let currentBalance = await getCurrentTipbotBalance();
    let tweetMessage = ".@nixerFFM's christmas tree was shining for " + minutes + " minutes!\n\n";
    tweetMessage+= "Therefore, this IoT tree automatically sent " + xrpPaid + " #XRP through the #XRPL to @"+config.TWITTER_USER_NAME+".\n";
    tweetMessage+= "Transaction:\n";
    tweetMessage+= "https://bithomp.com/explorer/"+txResult['tx_json']['hash']+"\n\n";
    if(currentBalance && currentBalance > 0) {
        tweetMessage+= "Current account balance: " + currentBalance + " XRP\n";
        tweetMessage+= "(Will be sent to @GoodXrp after christmas!)";
    }
    console.log(tweetMessage);
    //twitterAPI.sendTweet()
}

async function getCurrentTipbotBalance(): Promise<any> {
    try {
        let fetchResponse:any = await fetch.default('https://www.xrptipbot.com/u:'+config.TWITTER_USER_NAME+'/n:twitter/f:json', {agent: config.USE_PROXY ? proxy : null});
        let feed = await fetchResponse.json();

        return feed.stats.balance.amount
    } catch(err) {
        console.log(JSON.stringify(err))
        return null;
    }
}

function checkEnvironmentVariables(): boolean {
    
    if(!config.TWITTER_CONSUMER_KEY)
        writeToConsole("Please set the TWITTER_CONSUMER_KEY as environment variable");

    if(!config.TWITTER_CONSUMER_SECRET)
        writeToConsole("Please set the TWITTER_CONSUMER_SECRET as environment variable");

    if(!config.TWITTER_ACCESS_TOKEN)
        writeToConsole("Please set the TWITTER_ACCESS_TOKEN as environment variable");

    if(!config.TWITTER_ACCESS_SECRET)
        writeToConsole("Please set the TWITTER_ACCESS_SECRET as environment variable");

    return !(!config.TWITTER_CONSUMER_KEY
                || !config.TWITTER_CONSUMER_SECRET
                    || !config.TWITTER_ACCESS_TOKEN
                        || !config.TWITTER_ACCESS_SECRET);
}

function writeToConsole(message:string) {
    util.writeConsoleLog('[MAIN] ', message);
}

function test() {
    handleTreeTurnedOn();

    setTimeout(() => handleTreeTurnedOff(), 65000);
}