const tap = require('tap');
const { getSdk } = require('balena-sdk');

const balena = getSdk({
    apiUrl: "https://api.balena-cloud.com/",
});

async function main(){

    // log in to balena sdk with api key
    tap.comment(`logging into balena sdk`)
    await balena.auth.loginWithToken(process.env.BALENA_TOKEN);
    tap.comment(`logged into balena sdk!`)

    let started = false
    let logs = await balena.logs.history(process.env.DEVICE_UUID, { count: 10 });
    for(let line of logs){
        if(line.message.includes(`HELLO_WORLD`)){
            started = true
        }
    }

    tap.ok(started, 'Device should start container and container "HELLO_WORLD"')
}

main();