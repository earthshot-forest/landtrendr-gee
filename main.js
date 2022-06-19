//NPM - https://developers.google.com/earth-engine/guides/npm_install
//Create Cloud Project - https://developers.google.com/earth-engine/cloud/earthengine_cloud_project_setup#create-a-client-id
//Service account https://developers.google.com/earth-engine/guides/service_account

var ee = require('@google/earthengine');
var ltgee  = require('./LandTrendr/LandTrendr.js'); 
var privateKey = require('./.private-key.json'); //holds authentication secret for GCP authentication

function landTrendr (){
  //##########################################################################################
  // START INPUTS
  //##########################################################################################
  var startYear = 1985;
  var endYear = 2022;
  var startDay = '06-20';
  var endDay = '12-31';
  var aoi = ee.Geometry.Rectangle([[-124.230912, 42.582092], [-124.163220, 42.554895]])
  
  var index = 'NBR';
  var maskThese = ['cloud', 'shadow', 'snow', 'water'];
  
  // define landtrendr parameters
  var runParams = { 
    maxSegments:            6,
    spikeThreshold:         0.9,
    vertexCountOvershoot:   3,
    preventOneYearRecovery: true,
    recoveryThreshold:      0.25,
    pvalThreshold:          0.05,
    bestModelProportion:    0.75,
    minObservationsNeeded:  6
  };
  
  // define change parameters
  var changeParams = {
    delta:  'loss',
    sort:   'greatest',
    year:   {checked:true, start:1985, end:2021},
    mag:    {checked:true, value:200,  operator:'>'},
    dur:    {checked:true, value:4,    operator:'<'},
    preval: {checked:true, value:300,  operator:'>'},
    mmu:    {checked:true, value:11},
  };
  
  //##########################################################################################
  // END INPUTS
  //##########################################################################################
  
  // add index to changeParams object
  changeParams.index = index;
  
  // run landtrendr
  var lt = ltgee.runLT(startYear, endYear, startDay, endDay, aoi, index, [], runParams, maskThese);
  
  // get the change map layers
  var changeImg = ltgee.getChangeMap(lt, changeParams);
  
  var region = aoi.buffer(100).bounds();
  var exportImg = changeImg.clip(region).unmask(0).short();

  return exportImg;
} 

// Initialize client library and run analysis.
var runAnalysis = function() {
  ee.initialize(null, null, function() {
    // GEE stuff goes in here.
    exportImg = landTrendr();

    var task = ee.batch.Export.image.toCloudStorage({
      image: exportImg,
      description: 'cascade-lt-node',
      bucket: 'gee-landtrendr',
      fileNamePrefix: 'cascade-lt-node',
      scale: 30,
      crs: 'EPSG:4326'
    });
    
    var startTask = function () {task.start(function () {
        console.log('Started task #' + task.id);
        }, function (error) {
        console.log('Error: ' + error);
        })};
  
    startTask();
  }, function(e) {
    console.error('Initialization error: ' + e);
  });
};

// Authenticate using a service account.
ee.data.authenticateViaPrivateKey(privateKey, runAnalysis, function(e) {
  console.error('Authentication error: ' + e);
});
