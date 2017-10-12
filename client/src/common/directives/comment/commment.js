angular.module('directives.comment', ['directives.comment.new'])

	.directive('comment', ['$parse', 'security', function ($parse, security) {
		return {
			// We ask this directive to create a new child scope so that when we add helper methods to the scope
			// it doesn't make a mess of the parent scope.
			// - Be aware that if you write to the scope from within the form then you must remember that there is a child scope at the point
			scope: true,
			template: 
			'<new-comment></new-comment>' + 
			'<ul>' + 
				'<li ng-repeat="comment in comments track by $index">{{comment.user}} - <time>{{comment.timestamp}}</time><br><div class="content">{{comment.content}}</div></li>' + 
			'</ul>',
			restrict: 'E',
			// We need access to a form so we require a FormController from this element or a parent element
			//require: '^form',
			// This directive can only appear as an attribute
			link: function (scope, element, attrs) {
				// We extract the value of the crudEdit attribute
				// - it should be an assignable expression evaluating to the model (resource) that is going to be edited
				var resourceGetter = $parse(attrs.data);
				var resourceSetter = resourceGetter.assign;
				// Store the resource object for easy access
				var resource = resourceGetter(scope);

				var checkResourceMethod = function (methodName) {
					if (!angular.isFunction(resource[methodName])) {
						throw new Error('comment directive: The resource must expose the ' + methodName + '() instance method');
					}
				};

				var checkResourceMember = function (memberName) {
					if (resource[memberName] === "undefined") {
						throw new Error('comment directive: The resource must expose the ' + memberName + ' member');
					}
				};

				checkResourceMethod('$saveOrUpdate');
				checkResourceMethod('$id');
				checkResourceMethod('$remove');
				checkResourceMember('comments');

				// This function helps us extract the callback functions from the directive attributes
				var makeFn = function (attrName) {
					var fn = scope.$eval(attrs[attrName]);
					if (!angular.isFunction(fn)) {
						throw new Error('comment directive: The attribute "' + attrName + '" must evaluate to a function');
					}
					return fn;
				};

				// Set up callbacks with fallback
				// onSave attribute -> onSave scope -> noop
				var userOnSave = attrs.onSave ? makeFn('onSave') : (scope.onSave || angular.noop);

				var onSave = function (result, status, headers, config) {
					// Reset the original to help with reverting and pristine checks
					original = result;
					userOnSave(result, status, headers, config);
				};

				// onRemove attribute -> onRemove scope -> onSave attribute -> onSave scope -> noop
				var onRemove = attrs.onRemove ? makeFn('onRemove') : (scope.onRemove || onSave);

				// onError attribute -> onError scope -> noop
				var onError = attrs.onError ? makeFn('onError') : (scope.onError || angular.noop);

				var beforeSave = attrs.beforeSave ? makeFn('beforeSave') : (scope.beforeSave || angular.noop);

				// The following functions should be triggered by elements on the form
				// - e.g. ng-click="save()"
				scope.addComment = function (comment) {
					var d = new Date();
					var datestring = d.getDate()  + "-" + (d.getMonth()+1) + "-" + d.getFullYear() + " " + d.getHours() + ":" + d.getMinutes();
					var newComment = { content: comment, timestamp: datestring, user: security.currentUser.firstName + " " + security.currentUser.lastName }
					resource['comments'].unshift(newComment); //Add comment to front of list
					beforeSave();
					resource.$saveOrUpdate(onSave, onSave, onError, onError);

					$scope.comment = "";
				};

				scope.comments = resource['comments'];
			}
		};
	}]);