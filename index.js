var rest = require('rest');
var errorCodeInterceptor = require('rest/interceptor/errorCode');
var pathPrefixInterceptor = require('rest/interceptor/pathPrefix');
var entityInterceptor = require('rest/interceptor/entity');

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

Plugin.getOptionsSchema = function(){
  return {
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
};


Plugin.getMessageSchema = function(){
  return {
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
};

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

Plugin.prototype.onMessage = function(data){
  var self = this;

  if(data.getState && data.fromUuid){
    this.getState(data.getState)
    .then(function(state){
      self.messenger.send({devices: data.fromUuid, message: state});
    }, function(err){
      console.log('error getting to hue data', err);
      self.messenger.send({devices: data.fromUuid, message: err});
    });
  }

  if(data.setState){
    this.setState(data.setState)
    .then(function(value){
      if(data.fromUuid){
        self.messenger.send({devices: data.fromUuid, message: value});
      }
    }, function(err){
      console.log('error sending to hue', err);
      if(data.fromUuid){
        self.messenger.send({devices: data.fromUuid, message: err});
      }
    });
  }

};

Plugin.prototype.destroy = function(){
  //clean up
  console.log('destroying.', this.options);
};


module.exports = Plugin;
