# CloudFoundry Node
This repo is a Node test bed for uploading, deleting, and getting the status of Bluemix apps.

## Getting Started
To get started, pull this repo and open index.js. In there you will need to set name, space_guid, and/or appGuid on lines 2-4 depending on which funciton you are testing. You will also need to set your endpoint, username, and passowrd parameters in upload.js for each method.

## Getting Your Space GUID
1 - Install the CF cli (https://github.com/cloudfoundry/cli#downloads)
2 - Install Postman (https://www.getpostman.com/)
2 - Call cf login from your command line
3 - Call cf oauth-token from your command line once logged in
4 - Open Postman and in the "Builder" tab add a header with key as 'Authorization' (no quotes) and value as the token response you received from cf oauth-token (including the word 'bearer')
5 - Add the URL https://api.ng.bluemix.net/v2/spaces in Postman and make sure your call is a GET request

This should return a list of your spaces on Bluemix. Grab the GUID from the metadata object and use it in index.js. A full list of API calls can be found at http://apidocs.cloudfoundry.org/213/
and the documentation for the cf-client Node library can be found at https://doclets.io/IBM-Bluemix/cf-nodejs-client/
