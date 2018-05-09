

function isFunction(functionToCheck) {
 return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

var app = {
	store: {},
	actions: {},
	components: {},
	reducers: {}
};

var EntryPoint = (function(){
	var elementInstance, componentInstance, originalRender;
	function render(){
		while (elementInstance.firstChild) {
			elementInstance.removeChild(elementInstance.firstChild);
		}
		elementInstance.appendChild(componentInstance.render());
	}
	return {		
		DOMRender: function(elementId, component){
			elementInstance = document.getElementById(elementId);
			componentInstance = component;
			render();
		},
		update: function(){
			render();
		},
		getComponent: function(){
			return componentInstance;
		}
	};
})();

var Component = function(component){		
	var newComponent = function(props){
		this.props = props;
	};

	newComponent.prototype.didMount = function(){};
	newComponent.prototype.didUpdate = function(){};
	newComponent.prototype.render = function(){};

	Object.assign(newComponent.prototype, component);

	return newComponent;
};

var Connect = function(component, mapToProps){
	if(isFunction(mapToProps)){
		Object.defineProperty(component.prototype, 'props', {
			get: function(){
				return mapToProps(app.store.getState());
			}
		});
	}
	return component;
};

var View = function(viewName, componentsList, variables, events){
	var template = document.getElementById(viewName).innerHTML;

	for (var variable in variables) {
		template = template.replace(new RegExp('{' + variable + '}', 'g'), variables[variable]);
	}

	var fragment = document.createElement('div');
	fragment.innerHTML = template;

	var rootElement = fragment.querySelectorAll('*')[0] || {};
	if (events && events.hasOwnProperty('onclick')) {
		rootElement.addEventListener('click', function(ev){
			events.onclick.call(this, ev);	
		});
	}
	for(var component in componentsList){
		var componentElement = rootElement.querySelector(component.toLowerCase());		
		var theComponents = [].concat(componentsList[component]);
		for(var index in theComponents){
			var renderResult = theComponents[index].render();
			if (typeof renderResult === 'string') {
				var renderResultString = renderResult;
				renderResult = document.createElement('span');
				renderResult.innerHTML = renderResultString;
			}			
			componentElement.appendChild(renderResult);
		}		
	}
	return rootElement;
}

app.store = (function(){
	var state = {};
	return {
		dispatch: function(action){
			var newState = {};
			for(var reducer in app.reducers){
				newState = app.reducers[reducer](state, action);
			}
			state = newState;
			EntryPoint.update();
		},		
		getState: function(){
			return state;
		} 
	};
})();

app.reducers.environments = function(state, action){
	if(action.type == 'ENVIRONMENTS_LOADED'){
		return Object.assign(state, {
			environments: action.payload
		})
	}
	return state;
};

app.actions.getEnvironments = function(){
	setTimeout(function(){
		app.store.dispatch({
			type: 'ENVIRONMENTS_LOADED',
			payload: [
				'dev1', 'dev2', 'staging1'
			]
		});	
	}, 1000);	
};

app.components.Application = (function(){

	var Application = Component({
		didMount: function(){
			app.actions.getEnvironments();
		},

		render: function(){
			return View('Application', {
				'EnvironmentMenu': new app.components.EnvironmentMenu(this.props)
			});
		}
	});

	function mapToProps(state){
		return {
			environments: state.environments
		};
	};

	return Connect(Application, mapToProps);
})();

app.components.EnvironmentMenu = Component({
	render: function(){
		if(this.props.environments !== undefined){
			var MenuItemList = [];
			for(var i in this.props.environments){
				MenuItemList.push(new app.components.MenuItem({
					name: this.props.environments[i]
				}));
			}
			return View('EnvironmentMenu', {
				'MenuItem': MenuItemList
			});
		}
		return 'Loading...';
	}
});

app.components.MenuItem = Component({
	render: function(){
		var name = this.props.name;
		return View('MenuItem', {}, {
			name: name
		}, {
			onclick: function(ev){
				console.log(this, ev);
				alert(name);
			}
		});
	}
});

EntryPoint.DOMRender('entry-point', new app.components.Application());

window.addEventListener('DOMContentLoaded', function(){
	EntryPoint.getComponent().didMount();
	EntryPoint.update();
});