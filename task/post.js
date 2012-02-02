var task        = require ('task/base'),
	util        = require ('util'),
	qs			= require ('querystring'),
	formidable  = require ('formidable');


var postTask = module.exports = function (config) {
	
	this.request = config.request;
	this.init (config);
	
};

util.inherits (postTask, task);

util.extend (postTask.prototype, {
	
	run: function () {
		
		// TODO: add data limit
		
		var self = this;
		
		if (self.request.method != 'POST' && self.request.method != 'PUT')
			return self.skipped ();
			
		if (self.request.headers['content-type'] == 'application/json') {
			
			var self = this;
			 
			self.data = "";
			 
			self.request.on("data", function (chunk) {
				self.data += chunk;
			});
			 
			self.request.on("error", function (e) {
				self.emmitError(e);
			});
			 
			// TODO: file uploads
			 
			self.request.on("end", function () {
				 
				var fields;
				 
				if (self.dumpData) {
					self.emit ('log', self.data);
				}
				 
				if (self.jsonEncoded) {
					fields = JSON.parse (self.data);
				} else {
					fields = qs.parse (self.data);
				}
				
				var body = {fields: fields};
				
				self.request.body = body;
				 
				self.completed (body);
			});
			
			return;
		}
		
		var form = new formidable.IncomingForm();
		form.parse(self.request, function(err, fields, files) {
			
			if (err) {
				self.failed (err);
				return;
			}
			
			var body = {fields: fields, files: files};
			self.request.body = body;
			
			//console.log ('<---------', body);
			
			self.completed (body);
		});
	}
});
