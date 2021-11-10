import * as twitter from './api/twitterApi';
import * as xrpl from './api/xrplApi';
import * as hue from './api/hueApi';
import * as remoteControl from  './api/remoteControlApi';
import * as config from './config/local_config';
import * as util from './util';
import * as storage from 'node-persist'
import { AccountInfoRequest, AccountInfoResponse, convertStringToHex, SubmitResponse, TxResponse } from 'xrpl';

import consoleStamp = require("console-stamp");
import { AccountRoot } from 'xrpl/dist/npm/models/ledger';
import { Memo } from 'xrpl/dist/npm/models/common';
consoleStamp(console, { pattern: 'yyyy-mm-dd HH:MM:ss' });

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
            //try to reinitialize in different way!
            if(!await hueApi.initHue(true)) {
                console.log("Hue could not be initialized.");
                process.stdin.resume();
            } else {
                console.log("Hue initialized successfull.");
            }
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
        console.log("error starting bot. Could not initialize bot.")
        writeToConsole(err);
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
            let memo1:Memo = {Memo : {MemoType: convertStringToHex("ChristmasTree"), MemoData: convertStringToHex("IoT christmas tree")}}
            let memo2:Memo = {Memo : {MemoType: convertStringToHex("TreeWasShiningFor"), MemoData: convertStringToHex(minutes + " minutes")}}
            let memo3:Memo = {Memo : {MemoType: convertStringToHex("Sending"), MemoData: convertStringToHex(xrpToPay + " XRP to @" + config.TWITTER_USER_NAME + " -> (0.05 XRP per minute)")}}

            //send XRP payment to tipbot account
            let txResult:TxResponse = await xrplAPI.makePayment(xrpToPay+"", [memo1, memo2, memo3]);

            //tweet about it if payment was successfull
            if(txResult && typeof(txResult.result.meta) === 'object' && "tesSUCCESS" === txResult.result.meta.TransactionResult)
                setTimeout( async () => tweetAboutPayment(xrpToPay, minutes, txResult), 30000);
            else
                console.log("XRPL payment not successfull. Please check previous logs.");

        } else {
            console.log("xrpToPay smaller than 0. Somthing went wrong: " + xrpToPay);
        }
    }
}

async function tweetAboutPayment(xrpPaid:number, minutes: number, txResult:TxResponse): Promise<void> {
    let currentBalance = await getCurrentTreeAccountBalance();
    let tweetMessage = ".@nixerFFM's Christmas Tree was shining for " + minutes + " minutes!\n\n";
    tweetMessage+= "The #XRPL IoT tree automatically sent " + xrpPaid + " #XRP through the XRP Ledger to @"+config.TWITTER_USER_NAME+".\n";

    if(txResult && txResult.result && txResult.result.hash) {
        tweetMessage+= "\nTransaction:\n";
        tweetMessage+= "https://bithomp.com/explorer/"+txResult.result.hash+"\n\n";
    }

    if(currentBalance && currentBalance > 0) {
        tweetMessage+= "Current XRP Ledger account balance: " + currentBalance + " XRP\n";
    }

    console.log("tweet message:");
    console.log(tweetMessage)

    //better not send out tweets in remote control :)
    if(!config.ENABLE_REMOTE_CONTROL) {
        console.log("sending out tweet...")
        await twitterAPI.sendTweet(tweetMessage);
    }
}

async function getCurrentTreeAccountBalance(): Promise<number> {

    try {
        if(!xrplAPI.xrplClient.isConnected()) {
            await xrplAPI.xrplClient.connect()
        }
        let accountInfoRequest:AccountInfoRequest = {
            account: config.XRPL_DESTINATION_ACCOUNT,
            command: 'account_info',
            strict: true
        }

        let accontInfo:AccountInfoResponse = await xrplAPI.xrplClient.request(accountInfoRequest);
        if(accontInfo && accontInfo.result && accontInfo.result.account_data) {
            let accountData:AccountRoot = accontInfo.result.account_data;

            return parseInt(accountData.Balance)/1000000;
        }
    } catch(err) {
        console.log("error getting account balance")
        console.log(err)
    }

    return 0
}

function writeToConsole(message:string) {
    util.writeConsoleLog('[MAIN] ', message);
}

function test() {
    handleTreeTurnedOn();

    setTimeout(() => handleTreeTurnedOff(), 65000);
}