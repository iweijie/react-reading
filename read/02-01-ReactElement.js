// ReactElement.createElement
// 给 ReactElement 返回的对象赋值

/**
 * Create and return a new ReactElement of the given type.
 * See https://facebook.github.io/react/docs/react-api.html#createelement
 */
ReactElement.createElement = function (type, config, children) {
    var propName;

    // Reserved names are extracted
    // 初始化参数
    var props = {};

    var key = null;
    var ref = null;
    var self = null;
    var source = null;

    if (config != null) {
        // config 中是否存在 ref 字段
        if (hasValidRef(config)) {
            ref = config.ref;
        }
        // config 中是否存在 key 字段
        if (hasValidKey(config)) {
            key = '' + config.key;
        }

        self = config.__self === undefined ? null : config.__self;
        source = config.__source === undefined ? null : config.__source;
        // Remaining properties are added to a new props object
        // 将config 中的字段添加到 props中 （过滤了 ref key __self __source）
        for (propName in config) {
            if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                props[propName] = config[propName];
            }
        }
    }

    // Children can be more than one argument, and those are transferred onto
    // the newly allocated props object.
    // 第三个及以后的参数作为 children
    var childrenLength = arguments.length - 2;
    if (childrenLength === 1) {
        props.children = children;
    } else if (childrenLength > 1) {
        var childArray = Array(childrenLength);
        for (var i = 0; i < childrenLength; i++) {
            childArray[i] = arguments[i + 2];
        }
        if (process.env.NODE_ENV !== 'production') {
            if (Object.freeze) {
                Object.freeze(childArray);
            }
        }
        props.children = childArray;
    }

    // Resolve default props
    // 将组件的静态变量 defaultProps 中的值 添加到 当前props 上
    if (type && type.defaultProps) {
        var defaultProps = type.defaultProps;
        for (propName in defaultProps) {
            if (props[propName] === undefined) {
                props[propName] = defaultProps[propName];
            }
        }
    }
    // 返回 ReactElement 组装后的对象
    return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
};

var ReactElement = function (type, key, ref, self, source, owner, props) {
    var element = {
        // This tag allow us to uniquely identify this as a React Element

        // REACT_ELEMENT_TYPE为 symbol值； 用于标识当前为React组件
        $$typeof: REACT_ELEMENT_TYPE,

        // Built-in properties that belong on the element

        // 挂载数据
        type: type,
        key: key,
        ref: ref,
        props: props,

        // Record the component responsible for creating this element.
        _owner: owner
    };

    return element;
};