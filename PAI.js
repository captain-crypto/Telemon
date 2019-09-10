
/*
 Module test page

 Export module to the bot engine
 Author       : Captain Crypto
 Date Created : 8/5/2019
 Copyright PAI-TECH 2018, all right reserved

 *      This program is free software; you can redistribute it and/or
 *		modify it under the terms of the GNU General Public License
 *		as published by the Free Software Foundation; either version
 *		3 of the License, or (at your option) any later version.
  */


const { PAICodeCommand, PAICodeCommandContext, PAICodeModule, PAICode } = require('@pai-tech/pai-code');
const { Module } = require('./index');

async function start(){
    
    let module = new Module();
    
    if(PAICode.modules["pai-bot"])
        await PAICode.modules["pai-bot"].applyBotDataSource(module);
    
    await module.registerModule(); // register the module to PAICode
    
    let context = new PAICodeCommandContext('host','HardCoded');
    // let response = await PAICode.executeString(`Telemon send-video video-url:"https://startups.discovery-platform.com/pai-cdn/get-file?cdn-key=7280cf49-841f-4529-a14b-63428e894677" video-caption:"Posted by PAI-Marketing-Bot, James Bot."`,context);
    //
    // let toPrint = JSON.stringify(response[0].response.data);
    //console.log(toPrint);
    
    PAICode.start();
}

start().then().catch(e => {
    console.log(e)
});






