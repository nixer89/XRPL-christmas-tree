import * as twitter from './api/twitterApi';
import * as xrpl from './api/xrplApi';
import * as hue from './api/hueApi';
import * as remoteControl from  './api/remoteControlApi';
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
let remoteControlApi:remoteControl.RemoteControlApi;

let christmasTreeOn:boolean = false;

initBot();

async function initBot() {
    //check if all environment variables are set
    try {
        if(config.ENABLE_REMOTE_CONTROL) {
            console.log("remote control init")
            remoteControlApi = new remoteControl.RemoteControlApi();
            if(!await remoteControlApi.init()) {
                console.log("Remote Control API could not be initialized.");
                process.stdin.resume();
            } else {
                console.log("Remote Control API initialized successfull.");
            }
        }

        console.log("xrpl init")
        xrplAPI = new xrpl.XRPLApi();

        console.log("twitter init")
        twitterAPI = new twitter.TwitterApi();
        if(!await twitterAPI.initTwitter()) {
            console.log("Twitter could not be initialized.");
            process.stdin.resume();
        } else {
            console.log("Twitter initialized successfull.");
        }

        console.log("hue init")
        hueApi = new hue.HueApi();
        if(!await hueApi.initHue()) {
            console.log("Hue could not be initialized.");
            process.stdin.resume();
        } else {
            console.log("Hue initialized successfull.");
        }

        //init storage
        await storage.init({dir: 'storage/christmasTree'});
        //clear start time parameter
        await storage.removeItem("startTime");

        //initialize with tree == off so if tree shines and program starts it will count right away
        await storage.setItem("christmasTreeOn", false);

        //check light status every 60 seconds
        setInterval(() => checkGroupLights(), 60000);
        //test();
        
    } catch(err) {
        writeToConsole(JSON.stringify(err));
    }
}

async function checkGroupLights() {
    let isCurrentlyOn = await hueApi.checkGroupStatus(config.HUE_GROUP_NAME);
    christmasTreeOn = await storage.getItem("christmasTreeOn");
    
    if(isCurrentlyOn && !christmasTreeOn) {
        handleTreeTurnedOn();
    } else if(!isCurrentlyOn && christmasTreeOn) {
        handleTreeTurnedOff();
    } else if(isCurrentlyOn && christmasTreeOn) {
        console.log("Christmas tree is still shining!");
    }
}

async function handleTreeTurnedOn(): Promise<void> {
    console.log("Christmas tree was turned on!");
    //set start time
    await storage.setItem("startTime", Date.now());
    christmasTreeOn = true;
    await storage.setItem("christmasTreeOn", christmasTreeOn);
}

async function handleTreeTurnedOff(): Promise<void> {
    console.log("Christmas tree was turned off!");
    //saving new status
    christmasTreeOn = false;
    await storage.setItem("christmasTreeOn", christmasTreeOn);

    //calculating minutes it was on
    let endTime = Date.now();
    let startTime = await storage.getItem("startTime");

    if(startTime && endTime && (endTime-startTime)>0) {
        //round to the next fulles minute
        let minutes = Math.ceil((endTime - startTime) / 1000 / 60);
        console.log("minutes: " + minutes);

        //calculate the amount of XRP to pay
        let xrpToPay:number = (minutes*config.DROPS * 0.05)/config.DROPS;
        console.log("xrpToPay: " + xrpToPay);

        if(xrpToPay > 0) {
            //generate memos
            let memo1:any = {type: "ChristmasTree", data:"IoT christmas tree, raising XRP for @GoodXrp charities."};
            let memo2:any = {type: "TreeWasShiningFor", data: minutes + " minutes"}
            let memo3:any = {type: "Sending", data: xrpToPay + " XRP to @" + config.TWITTER_USER_NAME + " -> (0.05 XRP per minute)"}

            //send XRP payment to tipbot account
            let txResult:FormattedSubmitResponse = await xrplAPI.makePayment(xrpToPay+"", [memo1, memo2, memo3]);

            //tweet about it if payment was successfull
            if(txResult && "tesSUCCESS" === txResult.resultCode)
                setTimeout( async () => tweetAboutPayment(xrpToPay, minutes, txResult), 30000);
            else
                console.log("XRPL payment not successfull. Please check previous logs.");

        } else {
            console.log("xrpToPay smaller than 0. Somthing went wrong: " + xrpToPay);
        }
    }
}

async function tweetAboutPayment(xrpPaid:number, minutes: number, txResult:FormattedSubmitResponse): Promise<void> {
    let currentBalance = await getCurrentTipbotBalance();
    let tweetMessage = ".@nixerFFM's Christmas Tree was shining for " + minutes + " minutes!\n\n";
    tweetMessage+= "The #XRPL IoT tree automatically sent " + xrpPaid + " #XRP through the XRP Ledger to @"+config.TWITTER_USER_NAME+".\n";

    if(txResult && txResult['tx_json'] && txResult['tx_json']['hash']) {
        tweetMessage+= "\nTransaction:\n";
        tweetMessage+= "https://bithomp.com/explorer/"+txResult['tx_json']['hash']+"\n\n";
    }

    if(currentBalance && currentBalance > 0) {
        tweetMessage+= "Current @xrptipbot account balance: " + currentBalance + " XRP\n";
        tweetMessage+= "(Will be sent to @GoodXrp after christmas)";
    }

    //better not send out tweets in remote control :)
    if(!config.ENABLE_REMOTE_CONTROL) {
        console.log("sending out tweet...")
        await twitterAPI.sendTweet(tweetMessage);
    }
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

function writeToConsole(message:string) {
    util.writeConsoleLog('[MAIN] ', message);
}

function test() {
    handleTreeTurnedOn();

    setTimeout(() => handleTreeTurnedOff(), 65000);
}