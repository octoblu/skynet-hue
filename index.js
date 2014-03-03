var rest = require('rest');
var errorCodeInterceptor = require('rest/interceptor/errorCode');
var pathPrefixInterceptor = require('rest/interceptor/pathPrefix');
var entityInterceptor = require('rest/interceptor/entity');


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
  this.restCall = rest
  .chain(pathPrefixInterceptor, {
    prefix: prefix
  })
  .chain(entityInterceptor)
  .chain(errorCodeInterceptor);
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
      path: data.lightNumber + '/state/',
      method: 'PUT',
      entity: JSON.stringify(data.options)
  };

  return this.restCall(options);
};

Plugin.prototype.onMessage = function(data, cb){
  var self = this;

  if(data.message && data.message.getState && data.fromUuid){
    this.getState(data.message.getState)
    .then(function(state){
      if(cb){
        cb(null, state);
      }else{
        self.messenger.send({devices: data.fromUuid, message: state});
      }
    }, function(err){
      console.log('error getting to hue data', err);
      if(cb){
        cb(err, null);
      }else{
        self.messenger.send({devices: data.fromUuid, message: err});
      }

    });
  }

  if(data.message && data.message.setState){
    this.setState(data.message.setState)
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


module.exports.Plugin = Plugin;
module.exports.messageSchema = messageSchema;
module.exports.optionsSchema = optionsSchema;

