import * as hue from 'huejay';
import * as config from '../config/config';

export class HueApi {
    
    client:any;
    partyModeTimer:NodeJS.Timeout;

    async initHue(): Promise<boolean> {
        try {
            this.client = new hue.Client({
                host:     config.HUE_BRIDGE_IP,
                username: config.HUE_USER_NAME,
            });

            if(this.client)
                return this.client.bridge.isAuthenticated();
            else
                return false;
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

    async checkGroupStatus(): Promise<boolean> {
        let lightOn = false;
        
        try {
            let groups = await this.client.groups.getAll();
            
            groups.forEach(group => {
                if(config.HUE_GROUP_NAME === group.name) {
                    lightOn = group.allOn;
                }
            });
        } catch(err) {
            console.log("Error getting light data");
            console.log(JSON.stringify(err));
            //try to reinitialize
            await this.initHue();
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

    async startPartyMode(): Promise<void> {
        try {
            let scenes = await this.client.scenes.getAll();
            scenes.forEach(scene => {
                if(config.HUE_PARTY_SCENE_NAME === scene.name) {
                    this.client.scenes.recall(scene);
                    //stop party mode after 2 minutes
                    if(this.partyModeTimer) {
                        this.partyModeTimer.refresh();
                    } else {
                        this.partyModeTimer = setTimeout(() => this.stopPartyMode(), 60000);
                    }
                }
            });
        } catch(err) {
            console.log(JSON.stringify(err));
        }
    }

    async stopPartyMode(): Promise<any> {
        this.changeGroupStatus(config.HUE_PARTY_GROUP_NAME, false);
    }
}