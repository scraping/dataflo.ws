var facebookConfig	= project.config.consumerConfig.facebook;
	
// - - -

var OAuth = require('oauth').OAuth,
	querystring = require('querystring'),
	task = require('task/base'),
	util = require('util');
	
	console.log ('<------facebookConfig', facebookConfig);

var facebookLogin = module.exports = function(config) {

	this.scopes = [
		"user_about_me",
		"read_friendlists"
	];

	this.init (config);		

};

util.inherits (facebookLogin, task);

util.extend (facebookLogin.prototype, {

	run: function () {
		
		var self = this;
		var req = self.req;
		var res = self.res;
		var query = req.url.query;
		
		var getParams = {
			client_id: facebookConfig.appId,
			redirect_uri: facebookConfig.callbackUrl,
			scope: self.scopes.join(','),
		};
		
		var redirectUrl = facebookConfig.requestTokenUrl + "?" + querystring.stringify(getParams);
		
		// store the oa config in the session
				
		req._requestUrl			= facebookConfig.requestTokenUrl + "?scope=" + self.scopes.join(',');
		req._authorize_callback = facebookConfig.callbackUrl + ( query.action && query.action != "" ? "?action="+querystring.escape(query.action) : "" );
			
		self.completed(redirectUrl);
	}
});