module.exports.provisionMyApp = function (name, space_guid, cb) {

  const async = require('async');
  const AWS = require('ibm-cos-sdk');
  var fs = require('fs-extra');

  const endpoint = "https://api.ng.bluemix.net";
  const username = "bluemixUsername";
  const password = "bluemixPassword";
  
  const CloudController = new (require("cf-client")).CloudController(endpoint);
  const UsersUAA = new (require("cf-client")).UsersUAA(endpoint);
  const ServiceBindings = new (require("cf-client")).ServiceBindings(endpoint);
  const Apps = new (require("cf-client")).Apps(endpoint);
  const Routes = new (require("cf-client")).Routes(endpoint);
  const ServiceInstances = new (require("cf-client")).ServiceInstances(endpoint);

  async.auto({
      getLoginToken: [function(callback) {
        CloudController.getInfo().then( (result) => {
          UsersUAA.setEndPoint(result.authorization_endpoint);
          UsersUAA.login(username, password).then((result)=>{
            process.nextTick(function(){
              callback(null,result);
            });
          });
        });
      }],
      createApp: ['getLoginToken', function(results, callback) {
        Apps.setToken(results.getLoginToken);
        let app = {
          "name": name,                   //required field
          "space_guid": space_guid,       //required field
          "memory" : 1024,                //defaults to 512 
          "disk_quota": 2048,             //defaults to 512
          "buildpack": 'sdk-for-nodejs',  //will attempt to autodetect if not specified
          "instances": 1                  //defaults to 1
        };
        Apps.add(app).then((result)=>{
          console.log("Guid:",result["metadata"]["guid"]);  //Log this in case we need to query on it in Postman
          process.nextTick(function(){                      //process.nextTick prevents the success and catch scenarios firing simultaneously
            callback(null,result);                          //callback out of createApp
          });
        }).catch((err)=>{
          process.nextTick(function(){
            callback(err);
          });
        });
      }],
      createRoute: ['getLoginToken', function(results, callback) {
        Routes.setToken(results.getLoginToken);
        var urlSafeName = name.replace(/ /g, "-");    //Replace spaces with hyphens
        urlSafeName = urlSafeName.replace(/\?/g, ""); //Replace ? with nothing
        //Domain GUIDs
        var mybluemixDomainGuid = "XXXXXXXXX";  //Any domain associated with your Bluemix account can be used. By default each account gets a mybluemix.net domain.

        let routeOptions = {
          "domain_guid": mybluemixDomainGuid,
          "space_guid": space_guid,
          "host": urlSafeName
        };
        Routes.add(routeOptions).then((result)=>{
          process.nextTick(function(){
            console.log("Route created successfully.");
            callback(null,result);
          });        
        }).catch((err)=>{
          process.nextTick(function(){
            console.log("Route error.");
            callback(err);
          });
        });

      }],
      associateRoute: ['getLoginToken','createApp','createRoute', function(results, callback) {
        let appGuid = results['createApp']['metadata']['guid'];
        let routeGuid = results['createRoute']['metadata']['guid'];

        Apps.associateRoute(appGuid,routeGuid).then((result)=>{
          process.nextTick(function(){
            console.log("Route associated successfully.");
            callback(null,result);
          });        
        }).catch((err)=>{
          process.nextTick(function(){
            console.log("Route associated error.");
            callback(err);
          });
        })
      }],
      uploadApexDesigner: ['getLoginToken', 'createApp', function(results, callback) {

        const s3 = new AWS.S3({"apiKeyId": "############",
          endpoint: "########",
          ibmAuthEndpoint: "########",
          serviceInstanceId: "#########"
        });

        let filepath = __dirname + "/my-app.zip";
        var appGuid = results['createApp']['metadata']['guid'];

        var file = fs.createWriteStream(filepath);
  	    s3.getObject({
  	        Bucket: 'my-app-bucket',  //This is the name of the bucket in the AWS S3 account
  	        Key: 'my-app-name.zip'    //This is the name of the file in the AWS bucket
  	    }).createReadStream()
        .pipe(file)
        .on('finish', function(err) {

          if(err) return callback(err);

          Apps.upload(appGuid, filepath, true).then((result)=>{
              console.log("Upload complete");
              file.close();
              process.nextTick(function(){
                callback(null,result);
              });
          }).catch((err)=>{
              console.log("Error on upload", err);
              file.close();          
              process.nextTick(function(){
                callback(err);
              });
          });
        });	    
      }],
      createServiceInstance: ['getLoginToken', function(results, callback) {
        ServiceInstances.setToken(results.getLoginToken);
        let service_guid = "########"; //This is the service GUID for "Compose for PostgreSQL." Get this GUID by querying https://api.ng.bluemix.net/v2/services.
        let params = {
          "name": name,
          "service_plan_guid": service_guid,
          "space_guid": space_guid 
        };
        ServiceInstances.create(params).then((result)=>{
          process.nextTick(function(){
            console.log("Service instance created successfully.");
            callback(null,result);
          });
        }).catch((err)=>{
          process.nextTick(function(){
            console.log("Service instance error.");
            callback(err);
          });
        });
      }],
      createServiceBinding: ['getLoginToken', 'createApp', 'createServiceInstance', function(results, callback) {
        ServiceBindings.setToken(results.getLoginToken);
        let service_instance_guid = results['createServiceInstance']['metadata']['guid'];
        let app_guid = results['createApp']['metadata']['guid'];

        ServiceBindings.associateServiceWithApp(service_instance_guid,app_guid).then((result)=>{
          process.nextTick(function(){
            console.log("Service instance binding created successfully.");
            callback(null,result);
          });
        }).catch((err)=>{
          process.nextTick(function(){
            console.log("Service instance binding error.");
            callback(err);
          });
        });
      }],
      startApp: ['createApp','associateRoute','uploadApexDesigner','createServiceBinding', function(results, callback){
        let app_guid = results['createApp']['metadata']['guid'];
        Apps.start(app_guid).then((result)=>{
          process.nextTick(function(){
            console.log("App is now running.");
            callback(null,result);
          });
        }).catch((err)=>{
          process.nextTick(function(){
            console.log("App did not start.", err);
            callback(err);
          });
        });
      }]
  }, function(err, results) {
    cb(err,results);
  });
};

module.exports.removeDeployment = function (appGuid, cb) {

  const async = require('async');

  const endpoint = "#######";
  const username = "#######";
  const password = "#######";
  
  const CloudController = new (require("cf-client")).CloudController(endpoint);
  const UsersUAA = new (require("cf-client")).UsersUAA;
  const ServiceBindings = new (require("cf-client")).ServiceBindings(endpoint);
  const Apps = new (require("cf-client")).Apps(endpoint);
  const Routes = new (require("cf-client")).Routes(endpoint);
  const ServiceInstances = new (require("cf-client")).ServiceInstances(endpoint);

  //var deployment = this; //need to get this from Loopback


  async.auto({
      getLoginToken: [function(callback) {
        CloudController.getInfo().then( (result) => {
          UsersUAA.setEndPoint(result.authorization_endpoint);
          UsersUAA.login(username, password).then((result)=>{
            callback(null,result);
          });
        });
      }],
      getAppRoutes: ['getLoginToken', function(results, callback) {
        Apps.setToken(results.getLoginToken);
        Apps.getAppRoutes(appGuid).then((result)=>{
          process.nextTick(function(){
            callback(null,result);
          });
        }).catch((err)=>{
          process.nextTick(function(){
            callback(err);
          });
        });
      }],
      dissociateRoutes: ['getLoginToken', 'getAppRoutes', function(results, callback) {
        Routes.setToken(results.getLoginToken);
        async.each(results.getAppRoutes.resources, (routeObject, callback) => {
          let routeGuid = routeObject.metadata.guid;
          console.log("Route guid is:", routeGuid);
          Routes.remove(routeGuid).then((result)=>{
            process.nextTick(function(){
              console.log("Success in Routes.remove");
              callback(null,result);
            }); 
          }).catch((err)=>{
            process.nextTick(function(){
              console.log("Error in Routes.remove");
              callback(err);
            });
          });        
        }, function(err) {
          if(err){
            console.log("We got an error in dissociateRoutes.each", err);
            callback(err);
          }else{
            console.log("dissociateRoutes worked!");
            callback();
          }
        });
      }],
      getServiceBindings: ['getLoginToken', function(results, callback) {
        Apps.getServiceBindings(appGuid).then((result)=>{
          process.nextTick(function(){
            callback(null,result);
          });        
        }).catch((err)=>{
          process.nextTick(function(){
            callback(err);
          });
        })
      }],
      removeServiceBindings: ['getLoginToken', 'getServiceBindings', function(results, callback) {
        ServiceBindings.setToken(results.getLoginToken);
        ServiceInstances.setToken(results.getLoginToken);
        async.each(results.getServiceBindings.resources, (serviceBindingObject, callback) => {
          let serviceBindingGuid = serviceBindingObject.metadata.guid;
          let serviceInstanceGuid = serviceBindingObject.entity.service_instance_guid;
          ServiceBindings.remove(serviceBindingGuid).then((result)=>{
            ServiceInstances.remove(serviceInstanceGuid).then((result)=>{
              process.nextTick(function(){
                console.log("Success in ServiceInstances.remove");
                callback(null,result);
              });        
            }).catch((err)=>{
              process.nextTick(function(){
                console.log("Error in ServiceInstances.remove");
                callback(err);
              });
            });       
          }).catch((err)=>{
            process.nextTick(function(){
              console.log("Error in ServiceBindings.remove");
              callback(err);
            });
          })
        }, function(err) {
          if(err){
            console.log("We got an error in removeServiceBindings.each", err);
            callback(err);
          }else{
            console.log("removeServiceBindings worked!");
            callback();
          }
        });
      }],
      removeApp: ['getLoginToken', 'dissociateRoutes', 'removeServiceBindings', function(results, callback) {
        console.log("removeApp started");
        Apps.remove(appGuid).then((result)=>{
          process.nextTick(function(){
            console.log("Success in Apps.remove");
            callback(null,result);
          });
        }).catch((err)=>{
          process.nextTick(function(){
            console.log("Error in Apps.remove");
            callback(err);
          });
        });
      }]
  }, function(err, results) {
    cb(err,results);
  });
};

module.exports.appStatuses = function (filter, cb) {

  const endpoint = "########";
  const username = "########";
  const password = "########";
  
  const CloudController = new (require("cf-client")).CloudController(endpoint);
  const UsersUAA = new (require("cf-client")).UsersUAA;
  const Apps = new (require("cf-client")).Apps(endpoint);
  const Spaces = new (require("cf-client")).Spaces(endpoint);
  
  console.log("Starting to get statuses");
  async.auto({
      getLoginToken: [function(callback) {
        CloudController.getInfo().then( (result) => {
          UsersUAA.setEndPoint(result.authorization_endpoint);
          UsersUAA.login(username, password).then((result)=>{
            process.nextTick(function(){
              callback(null,result);
            });
          }).catch((err)=>{
            process.nextTick(function(){
              callback(err);
            });
          });
        }).catch((err)=>{
          process.nextTick(function(){
            callback(err);
          });
        });
      }],
      getStatuses: ['getLoginToken', function(results, callback) {
        Apps.setToken(results.getLoginToken);
        Deployment.find((err, models)=>{
          if(err) return callback(err);
          let filter = 'name IN ';
          for(let model of models){
            filter += model.name + ',';
          }
          Apps.getApps({'q':filter}).then((result)=>{
            for(let app of result.resources){
              for(let m of models){
                if(app.entity.name == m.name){
                  if(app.entity.package_state == "PENDING"){
                    m.status = app.entity.package_state;
                  }else{
                    m.status = app.entity.state;
                  }
                }
                if(m.space == "5ea4119c-038f-4dea-b98a-14e1774711d0"){
                  m.space = "Dev";
                }
              }
            }
            process.nextTick(function(){
              callback(null,models);
            });
          }).catch((err)=>{
            process.nextTick(function(){
              callback(err);
            });
          });
        });
      }]
  }, function(err,results) {
    console.log("Done", err);
    cb(err,results.getStatuses);
  });
};