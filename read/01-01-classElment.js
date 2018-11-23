// createClass

// 1. 方法自动绑定this
// 2. 注入更新器
// 3. 初始化 state
// 4. 混入方法到 Constructor.prototype
// 5. 初始化 props
// 6. 将 ReactClassInterface 上没有挂载的方法设置为 null

function createClass(spec) {
    var Constructor = identity(function (props, context, updater) {

        // 自动绑定this,函数在下面
        if (this.__reactAutoBindPairs.length) {
            bindAutoBindMethods(this);
        }

        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        //  更新器 是依赖注入
        this.updater = updater || ReactNoopUpdateQueue;

        this.state = null;
        // 初始化 state ； 为了兼容之前的版本
        var initialState = this.getInitialState ? this.getInitialState() : null;

        this.state = initialState;
    });

    // 继承于 ReactClassComponent
    Constructor.prototype = new ReactClassComponent();
    Constructor.prototype.constructor = Constructor;
    Constructor.prototype.__reactAutoBindPairs = [];

    // 1 保留 一些关键词；具体 可以查看 ReactClassInterface对象 
    // 2 挂载一些方法到 Constructor.prototype 上 ；

    mixSpecIntoComponent(Constructor, spec);

    // Initialize the defaultProps property after all mixins have been merged.

    // 初始化 props
    if (Constructor.getDefaultProps) {
        Constructor.defaultProps = Constructor.getDefaultProps();
    }

    // Reduce time spent doing lookups by setting these on the prototype.

    // 遍历 ReactClassInterface ； 当前没有挂载的方法设置为null
    for (var methodName in ReactClassInterface) {
        if (!Constructor.prototype[methodName]) {
            Constructor.prototype[methodName] = null;
        }
    }

    return Constructor;
}

/**
 * Binds all auto-bound methods in a component.
 *
 * @param {object} component Component whose method is going to be bound.
 */
function bindAutoBindMethods(component) {
    var pairs = component.__reactAutoBindPairs;
    for (var i = 0; i < pairs.length; i += 2) {
        var autoBindKey = pairs[i];
        var method = pairs[i + 1];
        component[autoBindKey] = bindAutoBindMethod(component, method);
    }
}


/**
 * Mixin helper which handles policy validation and reserved
 * specification keys when building React classes.
 */
function mixSpecIntoComponent(Constructor, spec) {
    if (!spec) return;

    var proto = Constructor.prototype;
    var autoBindPairs = proto.__reactAutoBindPairs;

    // By handling mixins before any other properties, we ensure the same
    // chaining order is applied to methods with DEFINE_MANY policy, whether
    // mixins are listed before or after these methods in the spec.

    // var MIXINS_KEY = 'mixins';
    if (spec.hasOwnProperty(MIXINS_KEY)) {

        // mixins: function (Constructor, mixins) {
        //     if (mixins) {
        //         for (var i = 0; i < mixins.length; i++) {
        //             mixSpecIntoComponent(Constructor, mixins[i]);
        //         }
        //     }
        // },

        //  混入 mixins 里面的方法
        RESERVED_SPEC_KEYS.mixins(Constructor, spec.mixins);
    }

    for (var name in spec) {
        if (!spec.hasOwnProperty(name)) {
            continue;
        }

        if (name === MIXINS_KEY) {
            // We have already handled mixins in a special case above.
            continue;
        }

        var property = spec[name];
        var isAlreadyDefined = proto.hasOwnProperty(name);
        validateMethodOverride(isAlreadyDefined, name);
        // 如果该方法存在于 RESERVED_SPEC_KEYS 中 ， 就直接调用
        if (RESERVED_SPEC_KEYS.hasOwnProperty(name)) {
            RESERVED_SPEC_KEYS[name](Constructor, property);
        } else {
            // Setup methods on prototype:
            // The following member methods should not be automatically bound:
            // 1. Expected ReactClass methods (in the "interface").
            // 2. Overridden methods (that were mixed in).

            // 以下的方法不自动绑定
            // 1 存在于 ReactClassInterface
            // 2 覆盖的方法

            var isReactClassMethod = ReactClassInterface.hasOwnProperty(name);
            var isFunction = typeof property === 'function';
            var shouldAutoBind = isFunction && !isReactClassMethod && !isAlreadyDefined && spec.autobind !== false;

            if (shouldAutoBind) {
                // 添加到 proto.__reactAutoBindPairs  用于自动绑定
                autoBindPairs.push(name, property);
                // 挂载到 proto 
                proto[name] = property;
            } else {
                // 存在于  Constructor.prototype 里面的方法
                if (isAlreadyDefined) {
                    var specPolicy = ReactClassInterface[name];

                    // For methods which are defined more than once, call the existing
                    // methods before calling the new property, merging if appropriate.



                    if (specPolicy === 'DEFINE_MANY_MERGED') {
                        // getDefaultProps getInitialState getChildContext
                        // 如上 三个方法 合并返回值 ， 前者返回值会被后者替换
                        proto[name] = createMergedResultFunction(proto[name], property);
                    } else if (specPolicy === 'DEFINE_MANY') {
                        // mixins
                        // 创建调用两个函数并忽略其返回值的函数。
                        proto[name] = createChainedFunction(proto[name], property);
                    }
                } else {
                    proto[name] = property;
                }
            }
        }
    }
}

/**
 * Creates a function that invokes two functions and merges their return values.
 *
 * @param {function} one Function to invoke first.
 * @param {function} two Function to invoke second.
 * @return {function} Function that invokes the two argument functions.
 * @private
 */
function createMergedResultFunction(one, two) {
    return function mergedResult() {
        var a = one.apply(this, arguments);
        var b = two.apply(this, arguments);
        if (a == null) {
            return b;
        } else if (b == null) {
            return a;
        }
        var c = {};
        mergeIntoWithNoDuplicateKeys(c, a);
        mergeIntoWithNoDuplicateKeys(c, b);
        return c;
    };
}

/**
 * Creates a function that invokes two functions and ignores their return vales.
 *
 * @param {function} one Function to invoke first.
 * @param {function} two Function to invoke second.
 * @return {function} Function that invokes the two argument functions.
 * @private
 */
function createChainedFunction(one, two) {
    return function chainedFunction() {
        one.apply(this, arguments);
        two.apply(this, arguments);
    };
}

/**
 * Merge two objects, but throw if both contain the same key.
 *
 * @param {object} one The first object, which is mutated.
 * @param {object} two The second object
 * @return {object} one after it has been mutated to contain everything in two.
 */
function mergeIntoWithNoDuplicateKeys(one, two) {
    for (var key in two) {
        if (two.hasOwnProperty(key)) {
            one[key] = two[key];
        }
    }
    return one;
}