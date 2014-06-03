"use strict";
var rest = require('rest');
var errorCodeInterceptor = require('rest/interceptor/errorCode');
var pathPrefixInterceptor = require('rest/interceptor/pathPrefix');
var entityInterceptor = require('rest/interceptor/entity');
var mimeInterceptor = require('rest/interceptor/mime');

function getRestCall(prefix){
  return rest
  .chain(mimeInterceptor, { mime: 'application/json'})
  .chain(pathPrefixInterceptor, {
    prefix: prefix
  })
  .chain(entityInterceptor)
  .chain(errorCodeInterceptor);
}

function getDefaultOptions(callback){
  getRestCall('http://www.meethue.com/api/nupnp')({method: 'GET'})
  .then(function(val){
    if(val && val.length){
      //grab last ip in case new ones are being added
      var retVal = {ipAddress: val[val.length - 1].internalipaddress};
      console.log('hue api site response', val);
      callback(null, retVal);
    }else{
      callback(null,  /* val */ {});
    }
  },function(err){
    callback(err, null);
  });

}

var optionsSchema = {
  type: 'object',
  properties: {
    ipAddress: {
      type: 'string',
      required: true
    },
    apiUsername:{
      type: 'string',
      required: true
    }
  }
};



var messageSchema = {
  type: 'object',
  properties: {
    setState: {
      type: 'object',
      properties: {
        lightNumber: {
          type: 'number',
          required: true
        },
        options: {
          type: 'object',
          required: true,
          properties: {
            on: {
              type: 'boolean'
            },
            bri: {
              type: 'number'
            },
            hue: {
              type: 'number'
            },
            sat: {
              type: 'number'
            },
            transitiontime: {
              type: 'number'
            },
            alert: {
              type: 'string'
            },
            effect: {
              type: 'string'
            }
          }
        }
      }
    },
    getState: {
      type: 'number'
    }
  }
};




function Plugin(messenger, options){
  this.messenger = messenger;
  this.options = options;

  var prefix = 'http://' + options.ipAddress + '/api/' + options.apiUsername + '/lights/';
  console.log(options, prefix);
  this.restCall = getRestCall(prefix);
  return this;
}

Plugin.prototype.getState = function(lightNumber){

  return this.restCall({
      path: lightNumber,
      method: 'GET'
  });

};

Plugin.prototype.setState = function(data){
  var options = {
      path: data.lightNumber + '/state',
      method: 'PUT',
      entity: data.options
  };

  return this.restCall(options);
};

Plugin.prototype.onMessage = function(data, cb){
  var self = this;
  var payload = data.payload || data.message || {};

  if(payload.getState && data.fromUuid){
    this.getState(payload.getState)
    .then(function(state){
      if(cb){
        cb({result: state});
      }else{
        self.messenger.send({devices: data.fromUuid, message: state});
      }
    }, function(err){
      console.log('error getting to hue data', err);
      if(cb){
        cb({error:err});
      }else{
        self.messenger.send({devices: data.fromUuid, message: err});
      }

    });
  }

  if(payload.setState){
    this.setState(payload.setState)
    .then(function(value){
      if(data.fromUuid){
        if(cb){
          cb(null, value);
        }else{
          self.messenger.send({devices: data.fromUuid, message: value});
        }
      }
    }, function(err){
      console.log('error sending to hue', err);
      if(data.fromUuid){
        if(cb){
          cb(err, null);
        }else{
          self.messenger.send({devices: data.fromUuid, message: err});
        }
      }
    });
  }

};

Plugin.prototype.destroy = function(){
  //clean up
  console.log('destroying.', this.options);
};


module.exports = {
  Plugin : Plugin,
  messageSchema : messageSchema,
  optionsSchema : optionsSchema,
  getDefaultOptions : getDefaultOptions
};
