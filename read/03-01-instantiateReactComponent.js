// instantiateReactComponent
// 当前函数 就是用来统一处理

function instantiateReactComponent(node, shouldHaveDebugID) {
	// node  为 ReactElement  方法的返回对象

	var instance;

	if (node === null || node === false) {
		// 当前判断是否为空，为空则返回 空组件
		instance = ReactEmptyComponent.create(instantiateReactComponent);
	} else if (typeof node === 'object') {
		var element = node;
		var type = element.type;
		if (typeof type !== 'function' && typeof type !== 'string') {
			var info = '';
			info += getDeclarationErrorAddendum(element._owner);
		}

		// Special case string values

		// 根据ReactElement中的type字段区分
		if (typeof element.type === 'string') {
			// type 为 string ； 表示为原生DOM元素
			instance = ReactHostComponent.createInternalComponent(element);
		} else if (isInternalComponentType(element.type)) {
			// This is temporarily available for custom components that are not string
			// representations. I.e. ART. Once those are updated to use the string
			// representation, we can drop this code path.

			// 里面有四个判断
			//  typeof type === 'function' && 
			//  typeof type.prototype !== 'undefined' && 
			//  typeof type.prototype.mountComponent === 'function' && 
			//  typeof type.prototype.receiveComponent === 'function';
			// 具体 没弄懂....
			instance = new element.type(element);

			// We renamed this. Allow the old name for compat. :(
			if (!instance.getHostNode) {
				instance.getHostNode = instance.getNativeNode;
			}
		} else {
			// 其他的就是 react 自定义组件啦
			instance = new ReactCompositeComponentWrapper(element);
		}
	} else if (typeof node === 'string' || typeof node === 'number') {
		// 当为 string or number  表示为文本
		instance = ReactHostComponent.createInstanceForText(node);
	} else {
		// 然后其他的报错
		!false ? "development" !== 'production' ? invariant(false, 'Encountered invalid React node of type %s', typeof node) : _prodInvariant('131', typeof node) : void 0;
	}

	// These two fields are used by the DOM and ART diffing algorithms
	// respectively. Instead of using expandos on components, we should be
	// storing the state needed by the diffing algorithms elsewhere.

	// 上面的注解意思是 当前两个属性 使用于 diff 算法中；
	instance._mountIndex = 0;
	instance._mountImage = null;

	// Internal instances should fully constructed at this point, so they should
	// not get any new fields added to them at this point.

	return instance;
}