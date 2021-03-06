/**
 * <Telemon>
 * Author       : Captain Crypto
 * Date Created : 8/5/2019
 * Copyright PAI-TECH 2018, all right reserved

 * This file is the entry point of your base module.

 *      This program is free software; you can redistribute it and/or
 *        modify it under the terms of the GNU General Public License
 *        as published by the Free Software Foundation; either version
 *        3 of the License, or (at your option) any later version.
 */
const got = require('got');
const FileType = require('file-type');
const {PAICodeCommand, PAICodeCommandContext, PAICodeModule, PAICode, PAIModuleConfigParam, PAIModuleConfig, PAILogger, PAIModuleCommandSchema, PAIModuleCommandParamSchema} = require('@pai-tech/pai-code');
const pai_module_data = require("./data/pai-module-data").get_instance;
const path = require("path");
let fs = require('fs');
const Telegraf = require('telegraf')
const pai_code_interface = require("./pai-code-interface");
const {v4: uuidv4} = require('uuid');

class PCM_Telemon extends PAICodeModule {
    constructor() {

        // Module description that will be shown on info command [your-module-name info]
        let infoText = `
        Welcome to Telemon:
        This module will enable you to monitor your PAI-BOT using Telegram.
        Required settings:
        telegram-bot-id = Telegram bot token (provided by the @BotFather)
        monitor-channel-id = Telegram chanel ID that the bot will monitor
        bot-name = your bot name
        `;

        super(infoText);

        this.can_run = false;
        this.running = false;
        this.tbot = null;

        this.config.schema = [
            //PAIModuleConfigParam(label, description, paramName, defaultValue)
            // TODO: add configuration parameters
        ];


    }


    /**
     * This method runs when the module is being loaded by the bot it load basic module commands from super
     *
     * and load all the functions for this module
     */
    async load() {
        await super.load(this);


        const pai_code_commands = pai_code_interface["pai-code-commands"];

        /* load commands from pai-code-interface.json file */
        if (pai_code_commands) {
            for (let cmd in pai_code_commands) {
                console.log("command: " + pai_code_commands[cmd]["command-name"]);
                let pai_code_command_params = pai_code_commands[cmd]["params"];
                let schema_params = {};
                if (pai_code_command_params) {
                    schema_params.params = {};
                    for (let param in pai_code_command_params) {
                        console.log("param: " + pai_code_command_params[param].name);
                        let new_param = new PAIModuleCommandParamSchema(pai_code_command_params[param].name, pai_code_command_params[param].description, pai_code_command_params[param].required, pai_code_command_params[param].label, pai_code_command_params[param]["default-value"]);
                        schema_params.params[pai_code_command_params[param].name] = new_param;
                    }
                    //console.log(schema_params);
                }
                let pai_code_command_schema = new PAIModuleCommandSchema({
                    op: pai_code_commands[cmd]["command-name"],
                    func: pai_code_commands[cmd]["js-function"],
                    params: schema_params.params

                });
                this.loadCommandWithSchema(pai_code_command_schema);
            }
        }

        //Use this way to "bind" pai-code ops to function
        // this.loadCommandWithSchema(new PAIModuleCommandSchema({
        //     op: "version",
        //     func: "version"
        // }));

        this.loadCommandWithSchema(new PAIModuleCommandSchema({
            op: "set-telegram-bot-id",
            func: "set_tbot_id",
            params: {
                "bot-id": new PAIModuleCommandParamSchema("bot-id", "place-holder", true, "bot-id")
            }
        }));

        this.loadCommandWithSchema(new PAIModuleCommandSchema({
            op: "set-monitor-channel-id",
            func: "set_mon_channel_id",
            params: {
                "channel-id": new PAIModuleCommandParamSchema("channel-id", "place-holder", true, "channel-id")
            }
        }));


        pai_module_data.config = this.config;
        await pai_module_data.load_params("telegram-bot-id");
        await pai_module_data.load_params("monitor-channel-id");
        await pai_module_data.load_params("bot-name");

        if (pai_module_data.get_param("telegram-bot-id") == "please define") {
            console.log("pm = " + pai_module_data.get_param("telegram-bot-id"));
        } else {
            this.can_run = true;
            this.start_telegram(null);
        }
    }

    get_release_notes(cmd) {
        var pai_release_notes = fs.readFileSync(path.resolve(__dirname, "release-notes.txt"), 'utf8');
        return pai_release_notes;
    }

    start_telegram(cmd) {
        if (this.can_run) {
            this.tbot = new Telegraf(pai_module_data.get_param("telegram-bot-id"));
            let c_message = `Hi I am pai bot, Let the games begin...`;
            this.tbot.start((ctx) => ctx.reply(c_message));
            this.tbot.help((ctx) => ctx.reply('How can I help you if you dont know what you want?'));
            //this.tbot.make((ctx) => ctx.reply(ctx.message.chat_id));
            //this.tbot.on('sticker', (ctx) => ctx.reply('👍'));
            //this.tbot.hears('hi', (ctx) => ctx.reply('Hey there'));
            this.tbot.on('text', /*(ctx) => ctx.reply('Hey there')*/ this.analyze_message);
            this.run_telegram();
            return "Telegram bot is running";
        } else {
            return "No Telegram bot id defined";
        }
    }

    async analyze_message(ctx) {
        let msg = ctx.message.text;

        if (msg === "hi") {
            ctx.reply("hey");
        } else {
            let response = await PAICode.executeString(msg, null);
            ctx.reply(JSON.stringify(response[0].response.data));
        }

    }

    send_monitor_message(cmd) {
        let ch_id = pai_module_data.get_param("monitor-channel-id");
        if (this.tbot && ch_id.length > 0 && ch_id != "please define") {
            let msg = cmd.params["msg"].value;
            msg = msg.replace(/<br\s*\/?>/mg, "\n");
            this.tbot.telegram.sendMessage(ch_id, msg);
            return "Message sent";
        } else {
            return "Channel is is not defined";
        }
    }

    async downloadImage(url, file_name) {
        const Fs = require('fs');
        const Axios = require('axios');
        if (!fs.existsSync(path.resolve(__dirname, 'videos'))) {
            fs.mkdirSync(path.resolve(__dirname, 'videos'));
        }

        // const response = await Axios({
        //     url,
        //     method: 'GET',
        //     responseType: 'stream'
        // });
        const stream = got.stream(url);
        let type = await FileType.fromStream(stream);
        const Path = path.resolve(__dirname, 'videos', file_name + '.' + type.ext);
        const writer = fs.createWriteStream(Path);
        return Axios({
            method: 'get',
            url: url,
            responseType: 'stream',
        }).then(response => {

            //ensure that the user can call `then()` only when the file has
            //been downloaded entirely.

            return new Promise((resolve, reject) => {
                response.data.pipe(writer);
                let error = null;
                writer.on('error', err => {
                    error = err;
                    writer.close();
                    reject(err);
                });
                writer.on('close', () => {
                    if (!error) {
                        resolve(type.ext);
                    }
                    //no need to call the reject here, as it will have been called in the
                    //'error' stream;
                });
            });
        });
        // const writer = Fs.createWriteStream(Path);
        //
        // //=> {ext: 'jpg', mime: 'image/jpeg'}
        //
        // response.data.pipe(writer);
        //
        // return new Promise((resolve, reject) => {
        //     writer.on('finish', resolve(type.ext));
        //     writer.on('error', reject)
        // })
    }


    async send_video(cmd) {

        let ch_id = pai_module_data.get_param("monitor-channel-id");
        if (this.tbot) {

            let video_url = cmd.params["video-url"].value;
            let video_caption = cmd.params["video-caption"].value;
            video_caption = video_caption.replace(/<br\s*\/?>/mg, "\n");
            let file_name = uuidv4();
            let type = await this.downloadImage(video_url, file_name);
            if (type === 'mp4') {
                await this.tbot.telegram.sendVideo(ch_id, {source: __dirname + '/videos/' + file_name + '.mp4'}, {caption: video_caption});
            } else {
                await this.tbot.telegram.sendAnimation(ch_id, video_url, {caption: video_caption});
            }
            fs.unlinkSync(path.resolve(__dirname, 'videos', file_name + '.' + type));

            return "Message sent";


        } else {
            return "Channel is is not defined";
        }
    }

    send_photo(cmd) {

        let ch_id = pai_module_data.get_param("monitor-channel-id");
        if (this.tbot) {

            let image_url = cmd.params["photo-url"].value;
            let image_caption = cmd.params["photo-caption"].value;
            //let file = fs.readFileSync();
            this.tbot.telegram.sendPhoto(ch_id,/*open(image_url,"rb")*/image_url, {caption: image_caption});
            return "Message sent";
        } else {
            return "Channel is is not defined";
        }
    }

    //


    stop_telegram(cmd) {
        if (this.tbot && this.running) {
            this.tbot.stop();
            return "Telegram bot is STOPPED";
        } else {
            return "No Telegram bot id defined";
        }

    }

    run_telegram() {
        if (this.tbot) {
            if (this.running) {
                this.tbot.stop();
            }
            this.tbot.launch();
            this.running = true;
        }
    }

    set_tbot_id(cmd) {
        let tbot_id = cmd.params["bot-id"].value;
        //if(bank_url && bank_url.startsWith("http"))
        {
            pai_module_data.set_param("telegram-bot-id", tbot_id);
            this.can_run = true;
            return "Telegram bot id is " + tbot_id;
        }
    }


    set_mon_channel_id(cmd) {
        let telegram_channel_id = cmd.params["channel-id"].value;
        //if(bank_url && bank_url.startsWith("http"))
        {
            pai_module_data.set_param("monitor-channel-id", telegram_channel_id);
            return "Telegram monitor channel id is " + telegram_channel_id;

        }
    }

    set_param(cmd) {
        let param_name = cmd.params["param-name"].value;
        let param_value = cmd.params["param-value"].value;
        if (param_name && param_value) {
            pai_module_data.set_param(param_name, param_value);
        }
    }

    get_all_params(cmd) {
        let out = "Module Parameters:\n--------------------------\n"
        for (let k in pai_module_data.module_data) {
            if (pai_module_data.module_data.hasOwnProperty(k)) {
                out += k + " = " + pai_module_data.module_data[k] + "\n";
            }
        }
        return out;
    }

    setModuleName() {
        return 'Telemon';
    }


    /**
     * Echo version number of your module
     * @param {PAICodeCommand} cmd
     */
    version(cmd) {
        return require("./../../package").version;
    }


}

module.exports = PCM_Telemon;
