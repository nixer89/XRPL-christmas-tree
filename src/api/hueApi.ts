import * as hue from 'huejay';
import * as config from '../config/config';

import * as process  from 'child_process';

export class HueApi {
    
    client:any;

    async initHue(isReinit?:boolean): Promise<boolean> {
        try {
            this.client = new hue.Client({
                host:     config.HUE_BRIDGE_IP,
                username: config.HUE_USER_NAME,
            });

            console.log("connect hue");
            //restart PI in case nothing works
            if(isReinit && (!this.client || !this.client.isAuthenticated())) {
                // try to rediscover bridge
                let bridge = await this.discoverBridges();

                console.log("bridges discovered");

                this.client = new hue.Client({
                    host:     bridge.ip,
                    username: config.HUE_USER_NAME,
                });

                //nothing works, restart!
                if(!this.client || !this.client.isAuthenticated()) {
                    console.log("could not connect hue!");
                    process.exec('sudo init 6')
                }
            }

            return this.client && this.client.bridge.isAuthenticated();

        } catch(err) {
            console.log("Error discovering bridges");
            console.log(JSON.stringify(err));
        }
    }

    async discoverBridges(): Promise<any> {
        //only search for local bridges!
        let bridges:any[] = await hue.discover();
        console.log("discovered bridges: " + JSON.stringify(bridges));

        return bridges[0];
    }

    async checkGroupStatus(groupName:string): Promise<boolean> {
        let lightOn = false;
        
        try {
            let groups = await this.client.groups.getAll();
            
            groups.forEach(group => {
                if(groupName === group.name) {
                    lightOn = group.allOn;
                }
            });
        } catch(err) {
            console.log("Error getting light data");
            console.log(JSON.stringify(err));
            //try to reinitialize
            await this.initHue(true);
        }

        return lightOn;
    }

    async changeGroupStatus(groupName: string, turnOn:boolean): Promise<void> {
        console.log("setting group: " + groupName + " to: " + (turnOn ? 'on' : 'off'));
        try {
            let groups = await this.client.groups.getAll();
            
            groups.forEach(group => {
                if(groupName === group.name) {
                    group.on = turnOn;
                    this.client.groups.save(group);
                }
            });
        } catch(err) {
            console.log("Error changing light status");
            console.log(JSON.stringify(err));
        }
    }
}