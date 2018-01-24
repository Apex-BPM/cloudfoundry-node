const cfUpload = require("./upload");  	//require in the upload.js file so we can use it's methods

let name = "My Test App";			
let space_guid = "#########";			//Get your space GUIDs by calling https://api.ng.bluemix.net/v2/spaces
let appGuid = "########";				//Only needed for deleteApp.

upload(); 								//Call anyone of these 3 to test it's functionality
// getStatuses();						//Call anyone of these 3 to test it's functionality
// deleteApp();							//Call anyone of these 3 to test it's functionality

function upload() {
	cfUpload.provisionMyApp(name, space_guid, (err, results)=>{
		if(err){
			console.log("We got an error:", err);
		}else{
			console.log("Token successful:", results);
		}
	});
}

function deleteApp() {
	cfUpload.removeDeployment(appGuid, (err, results)=>{
		if(err){
			console.log("We got an error:", err);
		}else{
			console.log("Token successful:", results);
		}
	});
}

function getStatuses() {
	cfUpload.appStatuses((err, results)=>{
		if(err){
			console.log("We got an error:", err);
		}else{
			console.log("We got apps:", results);
		}
	});
}