var define;
if (typeof define === "undefined")
	define = function (classInstance) {
		classInstance (require, exports, module);
	}

define (function (require, exports, module) {

var util	 = require('util');
var common	 = require('../common');
var workflow = require('../workflow');
var task	 = require('./base');

var EveryTask = function (cfg) {
	this.init(cfg);
	this.count = 0;
	this.results = [];

	if ((this.$collect || this.$collectArray) && this.$collectObject) {
		console.error ('options $collectArray and $collectObject are mutually exclusive');
		this.failed ('Configuration error');
	}
	
	if (this.$collectObject) {
		this.results = {};
	}

};

util.inherits(EveryTask, task);

util.extend(EveryTask.prototype, {
	constructor: EveryTask,

	DEFAULT_CONFIG: {
		$tasks: [],
		$every: [],
		$collect: '',
		$set: ''
	},

	getProperty: function (obj, path) {
		var val = obj;
		var hasProp = path.split('.').every(function (prop) {
			val = val[prop];
			return null != val;
		});
		return hasProp ? val : undefined;
	},

	onWorkflowResult: function () {
		this.count += 1;

		// TODO: failed dataflows and completed ones must be separated
		// so, every task must fail only when one or more dataflows is failed
		// otherwise, we need to emit empty
		if (this.count >= this.$every.length) {
			if (this.$collect || this.$collectArray) {
				if (this.results.length) {
					this.completed(this.results);
				} else {
					this.failed('No results');
				}
			} else if (this.$collectObject) {
				if (Object.keys(this.results).length) {
					this.completed(this.results);
				} else {
					this.failed('No results');
				}
			} else {
				this.completed({ ok: true });
			}
		}
	},

	_onCompleted: function (wf) {
		if (this.$collect || this.$collectArray) {
			var propertyName = this.$collect || this.$collectArray;
			var result = this.getProperty(wf.data, propertyName);
			if (undefined !== result) {
				this.results.push(result);
			}
		} else if (this.$collectObject) {
			var result = this.getProperty(wf.data, this.$collectObject);
			if (undefined !== result) {
				for (var objectField in result) {
					this.results[objectField] = result[objectField];
				}
			}
		} 
		
		this.onWorkflowResult();
	},

	_onFailed: function (wf) {
		this.onWorkflowResult();
	},

	unquote: function unquote(source, dest, origKey) {
		var pattern = /\[([$*][^\]]+)\]/g;
		var replacement = '{$1}';

		var recur = function (tree, collect, key) {
			var branch = tree[key];
			var type = Object.typeOf(branch);

			if ('String' == type) {
				var interpol = branch.replace(pattern, replacement);
				if (interpol != branch) {
					collect[key] = interpol;
				}
			} else if ('Array' == type) {
				branch.forEach(function (_, k) {
					recur(branch, collect[key], k);
				});
			} else if ('Object' == type) {
				Object.keys(branch).forEach(function (k) {
					if (origKey != k) {
						recur(branch, collect[key], k);
					}
				});
			}
		};

		recur(source, dest, origKey);
	},

	run: function () {
		var self = this;

		/**
		 * Walk the original config tree and replace [$...] with {$...},
		 * modifying the interpolated config tree (i.e. `this').
		 * Don't touch [$...] refs inside nested $every loops.
		 */
		// katspaugh is so stupid
		// if we run already interpolated values second time,
		// we face a problem with double interpolated values
		// and missing functions
		var everyTasks = util.extend (true, {}, this.originalConfig);
		this.unquote(everyTasks, everyTasks, '$tasks');
		
		this.$every.forEach(function (item, index, array) {
			var every = {
				item:  item,
				index: index,
				array: array
			};
			// dict the same between every, so we need to host a local copy
			var dict = util.extend (true, {}, self.getDict());
			dict.every = every;

			var wf = new workflow({
				tasks: everyTasks.$tasks,
				idPrefix: self.flowId + '>'
			}, dict);

			wf.on('completed', self._onCompleted.bind(self));
			wf.on('failed', self._onFailed.bind(self));

			wf.run();
		});
	}
});

module.exports = EveryTask;

return EveryTask;

});