const tap = require('tap');
const { getSdk } = require('balena-sdk');
const Bluebird = require('bluebird');

const balena = getSdk({
    apiUrl: "https://api.balena-cloud.com/",
});

async function main(){

    // log in to balena sdk with api key
    tap.comment(`logging into balena sdk`)
    await balena.auth.loginWithToken(process.env.BALENA_API_KEY);
    tap.comment(`logged into balena sdk!`)

    tap.comment(`getting all releases for application: ${process.env.BALENA_APP}`)
    // find the draft release hash from the github commit sha
    let releases = await balena.models.release.getAllByApplication(process.env.BALENA_APP);

    let draftRelease = null;
    for(let release of releases){
        // get tags for release
        tags = await balena.models.release.tags.getAllByRelease(release.id)
        // check if there is a tag_key `sha`, and if it has the value we want
        for(tag of tags){
            if(tag.tag_key === 'balena-ci-commit-sha' && tag.value === process.env.GITHUB_COMMIT){
                tap.comment(`Release ID is ${release.id}`);
                draftRelease = release.id
            }
        }
    }

    /// just pass if no new releae is found... nothing new to test
    if(draftRelease === null){
        tap.pass(`No release found in app: ${process.env.BALENA_APP} for release id: ${process.env.GITHUB_COMMIT}!`)
    } else {
        // pin the DUT to release (created in previous action, how do we get it)
        tap.comment(`Pinning teset device to release`)
        await balena.models.device.pinToRelease(process.env.TEST_DEVICE_UUID, draftRelease)

        // confirm release is downloaded
        let running = false
        while(!running){
            tap.comment(`Waiting for device: ${process.env.TEST_DEVICE_UUID} to run services at commit: ${draftRelease}...`);
            let deviceServices = await balena.models.device.getWithServiceDetails(
                process.env.TEST_DEVICE_UUID
            );

            for(let service in deviceServices.current_services){
                tap.comment(`STATUS: ${deviceServices.current_services[service][0].status}, release id: ${deviceServices.current_services[service][0].release_id}`)
                if((deviceServices.current_services[service][0].status === "Running") && (deviceServices.current_services[service][0].release_id === draftRelease)){
                    running = true
                }
            }
            await Bluebird.delay(1000*5);
        }
        

        // confirm release started (check message in logs)
        let started = false
        let logs = await balena.logs.history(process.env.TEST_DEVICE_UUID, { count: 20 });
        for(let line of logs){
            if(line.message.includes(`HELLO_WORLD`)){
                started = true
            }
        }

        tap.ok(started, 'Device should start container')
    }
}

main();