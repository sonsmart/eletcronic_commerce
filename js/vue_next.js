var Vue = (function (exports) {
    'use strict';
  
    /**
     * Make a map and return a function for checking if a key
     * is in that map.
     * IMPORTANT: all calls of this function must be prefixed with
     * \/\*#\_\_PURE\_\_\*\/
     * So that rollup can tree-shake them if necessary.
     */
    function makeMap(str, expectsLowerCase) {
        const map = Object.create(null);
        const list = str.split(',');
        for (let i = 0; i < list.length; i++) {
            map[list[i]] = true;
        }
        return expectsLowerCase ? val => !!map[val.toLowerCase()] : val => !!map[val];
    }
  
    /**
     * dev only flag -> name mapping
     */
    const PatchFlagNames = {
        [1 /* TEXT */]: `TEXT`,
        [2 /* CLASS */]: `CLASS`,
        [4 /* STYLE */]: `STYLE`,
        [8 /* PROPS */]: `PROPS`,
        [16 /* FULL_PROPS */]: `FULL_PROPS`,
        [32 /* HYDRATE_EVENTS */]: `HYDRATE_EVENTS`,
        [64 /* STABLE_FRAGMENT */]: `STABLE_FRAGMENT`,
        [128 /* KEYED_FRAGMENT */]: `KEYED_FRAGMENT`,
        [256 /* UNKEYED_FRAGMENT */]: `UNKEYED_FRAGMENT`,
        [512 /* NEED_PATCH */]: `NEED_PATCH`,
        [1024 /* DYNAMIC_SLOTS */]: `DYNAMIC_SLOTS`,
        [2048 /* DEV_ROOT_FRAGMENT */]: `DEV_ROOT_FRAGMENT`,
        [-1 /* HOISTED */]: `HOISTED`,
        [-2 /* BAIL */]: `BAIL`
    };
  
    /**
     * Dev only
     */
    const slotFlagsText = {
        [1 /* STABLE */]: 'STABLE',
        [2 /* DYNAMIC */]: 'DYNAMIC',
        [3 /* FORWARDED */]: 'FORWARDED'
    };
  
    const GLOBALS_WHITE_LISTED = 'Infinity,undefined,NaN,isFinite,isNaN,parseFloat,parseInt,decodeURI,' +
        'decodeURIComponent,encodeURI,encodeURIComponent,Math,Number,Date,Array,' +
        'Object,Boolean,String,RegExp,Map,Set,JSON,Intl,BigInt';
    const isGloballyWhitelisted = /*#__PURE__*/ makeMap(GLOBALS_WHITE_LISTED);
  
    const range = 2;
    function generateCodeFrame(source, start = 0, end = source.length) {
        const lines = source.split(/\r?\n/);
        let count = 0;
        const res = [];
        for (let i = 0; i < lines.length; i++) {
            count += lines[i].length + 1;
            if (count >= start) {
                for (let j = i - range; j <= i + range || end > count; j++) {
                    if (j < 0 || j >= lines.length)
                        continue;
                    const line = j + 1;
                    res.push(`${line}${' '.repeat(Math.max(3 - String(line).length, 0))}|  ${lines[j]}`);
                    const lineLength = lines[j].length;
                    if (j === i) {
                        // push underline
                        const pad = start - (count - lineLength) + 1;
                        const length = Math.max(1, end > count ? lineLength - pad : end - start);
                        res.push(`   |  ` + ' '.repeat(pad) + '^'.repeat(length));
                    }
                    else if (j > i) {
                        if (end > count) {
                            const length = Math.max(Math.min(end - count, lineLength), 1);
                            res.push(`   |  ` + '^'.repeat(length));
                        }
                        count += lineLength + 1;
                    }
                }
                break;
            }
        }
        return res.join('\n');
    }
  
    /**
     * On the client we only need to offer special cases for boolean attributes that
     * have different names from their corresponding dom properties:
     * - itemscope -> N/A
     * - allowfullscreen -> allowFullscreen
     * - formnovalidate -> formNoValidate
     * - ismap -> isMap
     * - nomodule -> noModule
     * - novalidate -> noValidate
     * - readonly -> readOnly
     */
    const specialBooleanAttrs = `itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly`;
    const isSpecialBooleanAttr = /*#__PURE__*/ makeMap(specialBooleanAttrs);
  
    function normalizeStyle(value) {
        if (isArray(value)) {
            const res = {};
            for (let i = 0; i < value.length; i++) {
                const item = value[i];
                const normalized = normalizeStyle(isString(item) ? parseStringStyle(item) : item);
                if (normalized) {
                    for (const key in normalized) {
                        res[key] = normalized[key];
                    }
                }
            }
            return res;
        }
        else if (isObject(value)) {
            return value;
        }
    }
    const listDelimiterRE = /;(?![^(]*\))/g;
    const propertyDelimiterRE = /:(.+)/;
    function parseStringStyle(cssText) {
        const ret = {};
        cssText.split(listDelimiterRE).forEach(item => {
            if (item) {
                const tmp = item.split(propertyDelimiterRE);
                tmp.length > 1 && (ret[tmp[0].trim()] = tmp[1].trim());
            }
        });
        return ret;
    }
    function normalizeClass(value) {
        let res = '';
        if (isString(value)) {
            res = value;
        }
        else if (isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                const normalized = normalizeClass(value[i]);
                if (normalized) {
                    res += normalized + ' ';
                }
            }
        }
        else if (isObject(value)) {
            for (const name in value) {
                if (value[name]) {
                    res += name + ' ';
                }
            }
        }
        return res.trim();
    }
  
    // These tag configs are shared between compiler-dom and runtime-dom, so they
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element
    const HTML_TAGS = 'html,body,base,head,link,meta,style,title,address,article,aside,footer,' +
        'header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,div,dd,dl,dt,figcaption,' +
        'figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,' +
        'data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,s,samp,small,span,strong,sub,sup,' +
        'time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,' +
        'canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,' +
        'th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,' +
        'option,output,progress,select,textarea,details,dialog,menu,' +
        'summary,template,blockquote,iframe,tfoot';
    // https://developer.mozilla.org/en-US/docs/Web/SVG/Element
    const SVG_TAGS = 'svg,animate,animateMotion,animateTransform,circle,clipPath,color-profile,' +
        'defs,desc,discard,ellipse,feBlend,feColorMatrix,feComponentTransfer,' +
        'feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,' +
        'feDistanceLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,' +
        'feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,' +
        'fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,' +
        'foreignObject,g,hatch,hatchpath,image,line,linearGradient,marker,mask,' +
        'mesh,meshgradient,meshpatch,meshrow,metadata,mpath,path,pattern,' +
        'polygon,polyline,radialGradient,rect,set,solidcolor,stop,switch,symbol,' +
        'text,textPath,title,tspan,unknown,use,view';
    const VOID_TAGS = 'area,base,br,col,embed,hr,img,input,link,meta,param,source,track,wbr';
    const isHTMLTag = /*#__PURE__*/ makeMap(HTML_TAGS);
    const isSVGTag = /*#__PURE__*/ makeMap(SVG_TAGS);
    const isVoidTag = /*#__PURE__*/ makeMap(VOID_TAGS);
  
    function looseCompareArrays(a, b) {
        if (a.length !== b.length)
            return false;
        let equal = true;
        for (let i = 0; equal && i < a.length; i++) {
            equal = looseEqual(a[i], b[i]);
        }
        return equal;
    }
    function looseEqual(a, b) {
        if (a === b)
            return true;
        let aValidType = isDate(a);
        let bValidType = isDate(b);
        if (aValidType || bValidType) {
            return aValidType && bValidType ? a.getTime() === b.getTime() : false;
        }
        aValidType = isArray(a);
        bValidType = isArray(b);
        if (aValidType || bValidType) {
            return aValidType && bValidType ? looseCompareArrays(a, b) : false;
        }
        aValidType = isObject(a);
        bValidType = isObject(b);
        if (aValidType || bValidType) {
            /* istanbul ignore if: this if will probably never be called */
            if (!aValidType || !bValidType) {
                return false;
            }
            const aKeysCount = Object.keys(a).length;
            const bKeysCount = Object.keys(b).length;
            if (aKeysCount !== bKeysCount) {
                return false;
            }
            for (const key in a) {
                const aHasKey = a.hasOwnProperty(key);
                const bHasKey = b.hasOwnProperty(key);
                if ((aHasKey && !bHasKey) ||
                    (!aHasKey && bHasKey) ||
                    !looseEqual(a[key], b[key])) {
                    return false;
                }
            }
        }
        return String(a) === String(b);
    }
    function looseIndexOf(arr, val) {
        return arr.findIndex(item => looseEqual(item, val));
    }
  
    /**
     * For converting {{ interpolation }} values to displayed strings.
     * @private
     */
    const toDisplayString = (val) => {
        return val == null
            ? ''
            : isObject(val)
                ? JSON.stringify(val, replacer, 2)
                : String(val);
    };
    const replacer = (_key, val) => {
        if (isMap(val)) {
            return {
                [`Map(${val.size})`]: [...val.entries()].reduce((entries, [key, val]) => {
                    entries[`${key} =>`] = val;
                    return entries;
                }, {})
            };
        }
        else if (isSet(val)) {
            return {
                [`Set(${val.size})`]: [...val.values()]
            };
        }
        else if (isObject(val) && !isArray(val) && !isPlainObject(val)) {
            return String(val);
        }
        return val;
    };
  
    const EMPTY_OBJ = Object.freeze({})
        ;
    const EMPTY_ARR = Object.freeze([]) ;
    const NOOP = () => { };
    /**
     * Always return false.
     */
    const NO = () => false;
    const onRE = /^on[^a-z]/;
    const isOn = (key) => onRE.test(key);
    const isModelListener = (key) => key.startsWith('onUpdate:');
    const extend = Object.assign;
    const remove = (arr, el) => {
        const i = arr.indexOf(el);
        if (i > -1) {
            arr.splice(i, 1);
        }
    };
    const hasOwnProperty = Object.prototype.hasOwnProperty;
    const hasOwn = (val, key) => hasOwnProperty.call(val, key);
    const isArray = Array.isArray;
    const isMap = (val) => toTypeString(val) === '[object Map]';
    const isSet = (val) => toTypeString(val) === '[object Set]';
    const isDate = (val) => val instanceof Date;
    const isFunction = (val) => typeof val === 'function';
    const isString = (val) => typeof val === 'string';
    const isSymbol = (val) => typeof val === 'symbol';
    const isObject = (val) => val !== null && typeof val === 'object';
    const isPromise = (val) => {
        return isObject(val) && isFunction(val.then) && isFunction(val.catch);
    };
    const objectToString = Object.prototype.toString;
    const toTypeString = (value) => objectToString.call(value);
    const toRawType = (value) => {
        // extract "RawType" from strings like "[object RawType]"
        return toTypeString(value).slice(8, -1);
    };
    const isPlainObject = (val) => toTypeString(val) === '[object Object]';
    const isIntegerKey = (key) => isString(key) &&
        key !== 'NaN' &&
        key[0] !== '-' &&
        '' + parseInt(key, 10) === key;
    const isReservedProp = /*#__PURE__*/ makeMap(
    // the leading comma is intentional so empty string "" is also included
    ',key,ref,' +
        'onVnodeBeforeMount,onVnodeMounted,' +
        'onVnodeBeforeUpdate,onVnodeUpdated,' +
        'onVnodeBeforeUnmount,onVnodeUnmounted');
    const cacheStringFunction = (fn) => {
        const cache = Object.create(null);
        return ((str) => {
            const hit = cache[str];
            return hit || (cache[str] = fn(str));
        });
    };
    const camelizeRE = /-(\w)/g;
    /**
     * @private
     */
    const camelize = cacheStringFunction((str) => {
        return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''));
    });
    const hyphenateRE = /\B([A-Z])/g;
    /**
     * @private
     */
    const hyphenate = cacheStringFunction((str) => str.replace(hyphenateRE, '-$1').toLowerCase());
    /**
     * @private
     */
    const capitalize = cacheStringFunction((str) => str.charAt(0).toUpperCase() + str.slice(1));
    /**
     * @private
     */
    const toHandlerKey = cacheStringFunction((str) => (str ? `on${capitalize(str)}` : ``));
    // compare whether a value has changed, accounting for NaN.
    const hasChanged = (value, oldValue) => value !== oldValue && (value === value || oldValue === oldValue);
    const invokeArrayFns = (fns, arg) => {
        for (let i = 0; i < fns.length; i++) {
            fns[i](arg);
        }
    };
    const def = (obj, key, value) => {
        Object.defineProperty(obj, key, {
            configurable: true,
            enumerable: false,
            value
        });
    };
    const toNumber = (val) => {
        const n = parseFloat(val);
        return isNaN(n) ? val : n;
    };
    let _globalThis;
    const getGlobalThis = () => {
        return (_globalThis ||
            (_globalThis =
                typeof globalThis !== 'undefined'
                    ? globalThis
                    : typeof self !== 'undefined'
                        ? self
                        : typeof window !== 'undefined'
                            ? window
                            : typeof global !== 'undefined'
                                ? global
                                : {}));
    };
  
    const targetMap = new WeakMap();
    const effectStack = [];
    let activeEffect;
    const ITERATE_KEY = Symbol('iterate' );
    const MAP_KEY_ITERATE_KEY = Symbol('Map key iterate' );
    function isEffect(fn) {
        return fn && fn._isEffect === true;
    }
    function effect(fn, options = EMPTY_OBJ) {
        if (isEffect(fn)) {
            fn = fn.raw;
        }
        const effect = createReactiveEffect(fn, options);
        if (!options.lazy) {
            effect();
        }
        return effect;
    }
    function stop(effect) {
        if (effect.active) {
            cleanup(effect);
            if (effect.options.onStop) {
                effect.options.onStop();
            }
            effect.active = false;
        }
    }
    let uid = 0;
    function createReactiveEffect(fn, options) {
        const effect = function reactiveEffect() {
            if (!effect.active) {
                return options.scheduler ? undefined : fn();
            }
            if (!effectStack.includes(effect)) {
                cleanup(effect);
                try {
                    enableTracking();
                    effectStack.push(effect);
                    activeEffect = effect;
                    return fn();
                }
                finally {
                    effectStack.pop();
                    resetTracking();
                    activeEffect = effectStack[effectStack.length - 1];
                }
            }
        };
        effect.id = uid++;
        effect.allowRecurse = !!options.allowRecurse;
        effect._isEffect = true;
        effect.active = true;
        effect.raw = fn;
        effect.deps = [];
        effect.options = options;
        return effect;
    }
    function cleanup(effect) {
        const { deps } = effect;
        if (deps.length) {
            for (let i = 0; i < deps.length; i++) {
                deps[i].delete(effect);
            }
            deps.length = 0;
        }
    }
    let shouldTrack = true;
    const trackStack = [];
    function pauseTracking() {
        trackStack.push(shouldTrack);
        shouldTrack = false;
    }
    function enableTracking() {
        trackStack.push(shouldTrack);
        shouldTrack = true;
    }
    function resetTracking() {
        const last = trackStack.pop();
        shouldTrack = last === undefined ? true : last;
    }
    function track(target, type, key) {
        if (!shouldTrack || activeEffect === undefined) {
            return;
        }
        let depsMap = targetMap.get(target);
        if (!depsMap) {
            targetMap.set(target, (depsMap = new Map()));
        }
        let dep = depsMap.get(key);
        if (!dep) {
            depsMap.set(key, (dep = new Set()));
        }
        if (!dep.has(activeEffect)) {
            dep.add(activeEffect);
            activeEffect.deps.push(dep);
            if (activeEffect.options.onTrack) {
                activeEffect.options.onTrack({
                    effect: activeEffect,
                    target,
                    type,
                    key
                });
            }
        }
    }
    function trigger(target, type, key, newValue, oldValue, oldTarget) {
        const depsMap = targetMap.get(target);
        if (!depsMap) {
            // never been tracked
            return;
        }
        const effects = new Set();
        const add = (effectsToAdd) => {
            if (effectsToAdd) {
                effectsToAdd.forEach(effect => {
                    if (effect !== activeEffect || effect.allowRecurse) {
                        effects.add(effect);
                    }
                });
            }
        };
        if (type === "clear" /* CLEAR */) {
            // collection being cleared
            // trigger all effects for target
            depsMap.forEach(add);
        }
        else if (key === 'length' && isArray(target)) {
            depsMap.forEach((dep, key) => {
                if (key === 'length' || key >= newValue) {
                    add(dep);
                }
            });
        }
        else {
            // schedule runs for SET | ADD | DELETE
            if (key !== void 0) {
                add(depsMap.get(key));
            }
            // also run for iteration key on ADD | DELETE | Map.SET
            switch (type) {
                case "add" /* ADD */:
                    if (!isArray(target)) {
                        add(depsMap.get(ITERATE_KEY));
                        if (isMap(target)) {
                            add(depsMap.get(MAP_KEY_ITERATE_KEY));
                        }
                    }
                    else if (isIntegerKey(key)) {
                        // new index added to array -> length changes
                        add(depsMap.get('length'));
                    }
                    break;
                case "delete" /* DELETE */:
                    if (!isArray(target)) {
                        add(depsMap.get(ITERATE_KEY));
                        if (isMap(target)) {
                            add(depsMap.get(MAP_KEY_ITERATE_KEY));
                        }
                    }
                    break;
                case "set" /* SET */:
                    if (isMap(target)) {
                        add(depsMap.get(ITERATE_KEY));
                    }
                    break;
            }
        }
        const run = (effect) => {
            if (effect.options.onTrigger) {
                effect.options.onTrigger({
                    effect,
                    target,
                    key,
                    type,
                    newValue,
                    oldValue,
                    oldTarget
                });
            }
            if (effect.options.scheduler) {
                effect.options.scheduler(effect);
            }
            else {
                effect();
            }
        };
        effects.forEach(run);
    }
  
    const isNonTrackableKeys = /*#__PURE__*/ makeMap(`__proto__,__v_isRef,__isVue`);
    const builtInSymbols = new Set(Object.getOwnPropertyNames(Symbol)
        .map(key => Symbol[key])
        .filter(isSymbol));
    const get = /*#__PURE__*/ createGetter();
    const shallowGet = /*#__PURE__*/ createGetter(false, true);
    const readonlyGet = /*#__PURE__*/ createGetter(true);
    const shallowReadonlyGet = /*#__PURE__*/ createGetter(true, true);
    const arrayInstrumentations = {};
    ['includes', 'indexOf', 'lastIndexOf'].forEach(key => {
        const method = Array.prototype[key];
        arrayInstrumentations[key] = function (...args) {
            const arr = toRaw(this);
            for (let i = 0, l = this.length; i < l; i++) {
                track(arr, "get" /* GET */, i + '');
            }
            // we run the method using the original args first (which may be reactive)
            const res = method.apply(arr, args);
            if (res === -1 || res === false) {
                // if that didn't work, run it again using raw values.
                return method.apply(arr, args.map(toRaw));
            }
            else {
                return res;
            }
        };
    });
    ['push', 'pop', 'shift', 'unshift', 'splice'].forEach(key => {
        const method = Array.prototype[key];
        arrayInstrumentations[key] = function (...args) {
            pauseTracking();
            const res = method.apply(this, args);
            resetTracking();
            return res;
        };
    });
    function createGetter(isReadonly = false, shallow = false) {
        return function get(target, key, receiver) {
            if (key === "__v_isReactive" /* IS_REACTIVE */) {
                return !isReadonly;
            }
            else if (key === "__v_isReadonly" /* IS_READONLY */) {
                return isReadonly;
            }
            else if (key === "__v_raw" /* RAW */ &&
                receiver ===
                    (isReadonly
                        ? shallow
                            ? shallowReadonlyMap
                            : readonlyMap
                        : shallow
                            ? shallowReactiveMap
                            : reactiveMap).get(target)) {
                return target;
            }
            const targetIsArray = isArray(target);
            if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
                return Reflect.get(arrayInstrumentations, key, receiver);
            }
            const res = Reflect.get(target, key, receiver);
            if (isSymbol(key)
                ? builtInSymbols.has(key)
                : isNonTrackableKeys(key)) {
                return res;
            }
            if (!isReadonly) {
                track(target, "get" /* GET */, key);
            }
            if (shallow) {
                return res;
            }
            if (isRef(res)) {
                // ref unwrapping - does not apply for Array + integer key.
                const shouldUnwrap = !targetIsArray || !isIntegerKey(key);
                return shouldUnwrap ? res.value : res;
            }
            if (isObject(res)) {
                // Convert returned value into a proxy as well. we do the isObject check
                // here to avoid invalid value warning. Also need to lazy access readonly
                // and reactive here to avoid circular dependency.
                return isReadonly ? readonly(res) : reactive(res);
            }
            return res;
        };
    }
    const set = /*#__PURE__*/ createSetter();
    const shallowSet = /*#__PURE__*/ createSetter(true);
    function createSetter(shallow = false) {
        return function set(target, key, value, receiver) {
            let oldValue = target[key];
            if (!shallow) {
                value = toRaw(value);
                oldValue = toRaw(oldValue);
                if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
                    oldValue.value = value;
                    return true;
                }
            }
            const hadKey = isArray(target) && isIntegerKey(key)
                ? Number(key) < target.length
                : hasOwn(target, key);
            const result = Reflect.set(target, key, value, receiver);
            // don't trigger if target is something up in the prototype chain of original
            if (target === toRaw(receiver)) {
                if (!hadKey) {
                    trigger(target, "add" /* ADD */, key, value);
                }
                else if (hasChanged(value, oldValue)) {
                    trigger(target, "set" /* SET */, key, value, oldValue);
                }
            }
            return result;
        };
    }
    function deleteProperty(target, key) {
        const hadKey = hasOwn(target, key);
        const oldValue = target[key];
        const result = Reflect.deleteProperty(target, key);
        if (result && hadKey) {
            trigger(target, "delete" /* DELETE */, key, undefined, oldValue);
        }
        return result;
    }
    function has(target, key) {
        const result = Reflect.has(target, key);
        if (!isSymbol(key) || !builtInSymbols.has(key)) {
            track(target, "has" /* HAS */, key);
        }
        return result;
    }
    function ownKeys(target) {
        track(target, "iterate" /* ITERATE */, isArray(target) ? 'length' : ITERATE_KEY);
        return Reflect.ownKeys(target);
    }
    const mutableHandlers = {
        get,
        set,
        deleteProperty,
        has,
        ownKeys
    };
    const readonlyHandlers = {
        get: readonlyGet,
        set(target, key) {
            {
                console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
            }
            return true;
        },
        deleteProperty(target, key) {
            {
                console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
            }
            return true;
        }
    };
    const shallowReactiveHandlers = extend({}, mutableHandlers, {
        get: shallowGet,
        set: shallowSet
    });
    // Props handlers are special in the sense that it should not unwrap top-level
    // refs (in order to allow refs to be explicitly passed down), but should
    // retain the reactivity of the normal readonly object.
    const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
        get: shallowReadonlyGet
    });
  
    const toReactive = (value) => isObject(value) ? reactive(value) : value;
    const toReadonly = (value) => isObject(value) ? readonly(value) : value;
    const toShallow = (value) => value;
    const getProto = (v) => Reflect.getPrototypeOf(v);
    function get$1(target, key, isReadonly = false, isShallow = false) {
        // #1772: readonly(reactive(Map)) should return readonly + reactive version
        // of the value
        target = target["__v_raw" /* RAW */];
        const rawTarget = toRaw(target);
        const rawKey = toRaw(key);
        if (key !== rawKey) {
            !isReadonly && track(rawTarget, "get" /* GET */, key);
        }
        !isReadonly && track(rawTarget, "get" /* GET */, rawKey);
        const { has } = getProto(rawTarget);
        const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
        if (has.call(rawTarget, key)) {
            return wrap(target.get(key));
        }
        else if (has.call(rawTarget, rawKey)) {
            return wrap(target.get(rawKey));
        }
    }
    function has$1(key, isReadonly = false) {
        const target = this["__v_raw" /* RAW */];
        const rawTarget = toRaw(target);
        const rawKey = toRaw(key);
        if (key !== rawKey) {
            !isReadonly && track(rawTarget, "has" /* HAS */, key);
        }
        !isReadonly && track(rawTarget, "has" /* HAS */, rawKey);
        return key === rawKey
            ? target.has(key)
            : target.has(key) || target.has(rawKey);
    }
    function size(target, isReadonly = false) {
        target = target["__v_raw" /* RAW */];
        !isReadonly && track(toRaw(target), "iterate" /* ITERATE */, ITERATE_KEY);
        return Reflect.get(target, 'size', target);
    }
    function add(value) {
        value = toRaw(value);
        const target = toRaw(this);
        const proto = getProto(target);
        const hadKey = proto.has.call(target, value);
        if (!hadKey) {
            target.add(value);
            trigger(target, "add" /* ADD */, value, value);
        }
        return this;
    }
    function set$1(key, value) {
        value = toRaw(value);
        const target = toRaw(this);
        const { has, get } = getProto(target);
        let hadKey = has.call(target, key);
        if (!hadKey) {
            key = toRaw(key);
            hadKey = has.call(target, key);
        }
        else {
            checkIdentityKeys(target, has, key);
        }
        const oldValue = get.call(target, key);
        target.set(key, value);
        if (!hadKey) {
            trigger(target, "add" /* ADD */, key, value);
        }
        else if (hasChanged(value, oldValue)) {
            trigger(target, "set" /* SET */, key, value, oldValue);
        }
        return this;
    }
    function deleteEntry(key) {
        const target = toRaw(this);
        const { has, get } = getProto(target);
        let hadKey = has.call(target, key);
        if (!hadKey) {
            key = toRaw(key);
            hadKey = has.call(target, key);
        }
        else {
            checkIdentityKeys(target, has, key);
        }
        const oldValue = get ? get.call(target, key) : undefined;
        // forward the operation before queueing reactions
        const result = target.delete(key);
        if (hadKey) {
            trigger(target, "delete" /* DELETE */, key, undefined, oldValue);
        }
        return result;
    }
    function clear() {
        const target = toRaw(this);
        const hadItems = target.size !== 0;
        const oldTarget = isMap(target)
                ? new Map(target)
                : new Set(target)
            ;
        // forward the operation before queueing reactions
        const result = target.clear();
        if (hadItems) {
            trigger(target, "clear" /* CLEAR */, undefined, undefined, oldTarget);
        }
        return result;
    }
    function createForEach(isReadonly, isShallow) {
        return function forEach(callback, thisArg) {
            const observed = this;
            const target = observed["__v_raw" /* RAW */];
            const rawTarget = toRaw(target);
            const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
            !isReadonly && track(rawTarget, "iterate" /* ITERATE */, ITERATE_KEY);
            return target.forEach((value, key) => {
                // important: make sure the callback is
                // 1. invoked with the reactive map as `this` and 3rd arg
                // 2. the value received should be a corresponding reactive/readonly.
                return callback.call(thisArg, wrap(value), wrap(key), observed);
            });
        };
    }
    function createIterableMethod(method, isReadonly, isShallow) {
        return function (...args) {
            const target = this["__v_raw" /* RAW */];
            const rawTarget = toRaw(target);
            const targetIsMap = isMap(rawTarget);
            const isPair = method === 'entries' || (method === Symbol.iterator && targetIsMap);
            const isKeyOnly = method === 'keys' && targetIsMap;
            const innerIterator = target[method](...args);
            const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
            !isReadonly &&
                track(rawTarget, "iterate" /* ITERATE */, isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY);
            // return a wrapped iterator which returns observed versions of the
            // values emitted from the real iterator
            return {
                // iterator protocol
                next() {
                    const { value, done } = innerIterator.next();
                    return done
                        ? { value, done }
                        : {
                            value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
                            done
                        };
                },
                // iterable protocol
                [Symbol.iterator]() {
                    return this;
                }
            };
        };
    }
    function createReadonlyMethod(type) {
        return function (...args) {
            {
                const key = args[0] ? `on key "${args[0]}" ` : ``;
                console.warn(`${capitalize(type)} operation ${key}failed: target is readonly.`, toRaw(this));
            }
            return type === "delete" /* DELETE */ ? false : this;
        };
    }
    const mutableInstrumentations = {
        get(key) {
            return get$1(this, key);
        },
        get size() {
            return size(this);
        },
        has: has$1,
        add,
        set: set$1,
        delete: deleteEntry,
        clear,
        forEach: createForEach(false, false)
    };
    const shallowInstrumentations = {
        get(key) {
            return get$1(this, key, false, true);
        },
        get size() {
            return size(this);
        },
        has: has$1,
        add,
        set: set$1,
        delete: deleteEntry,
        clear,
        forEach: createForEach(false, true)
    };
    const readonlyInstrumentations = {
        get(key) {
            return get$1(this, key, true);
        },
        get size() {
            return size(this, true);
        },
        has(key) {
            return has$1.call(this, key, true);
        },
        add: createReadonlyMethod("add" /* ADD */),
        set: createReadonlyMethod("set" /* SET */),
        delete: createReadonlyMethod("delete" /* DELETE */),
        clear: createReadonlyMethod("clear" /* CLEAR */),
        forEach: createForEach(true, false)
    };
    const shallowReadonlyInstrumentations = {
        get(key) {
            return get$1(this, key, true, true);
        },
        get size() {
            return size(this, true);
        },
        has(key) {
            return has$1.call(this, key, true);
        },
        add: createReadonlyMethod("add" /* ADD */),
        set: createReadonlyMethod("set" /* SET */),
        delete: createReadonlyMethod("delete" /* DELETE */),
        clear: createReadonlyMethod("clear" /* CLEAR */),
        forEach: createForEach(true, true)
    };
    const iteratorMethods = ['keys', 'values', 'entries', Symbol.iterator];
    iteratorMethods.forEach(method => {
        mutableInstrumentations[method] = createIterableMethod(method, false, false);
        readonlyInstrumentations[method] = createIterableMethod(method, true, false);
        shallowInstrumentations[method] = createIterableMethod(method, false, true);
        shallowReadonlyInstrumentations[method] = createIterableMethod(method, true, true);
    });
    function createInstrumentationGetter(isReadonly, shallow) {
        const instrumentations = shallow
            ? isReadonly
                ? shallowReadonlyInstrumentations
                : shallowInstrumentations
            : isReadonly
                ? readonlyInstrumentations
                : mutableInstrumentations;
        return (target, key, receiver) => {
            if (key === "__v_isReactive" /* IS_REACTIVE */) {
                return !isReadonly;
            }
            else if (key === "__v_isReadonly" /* IS_READONLY */) {
                return isReadonly;
            }
            else if (key === "__v_raw" /* RAW */) {
                return target;
            }
            return Reflect.get(hasOwn(instrumentations, key) && key in target
                ? instrumentations
                : target, key, receiver);
        };
    }
    const mutableCollectionHandlers = {
        get: createInstrumentationGetter(false, false)
    };
    const shallowCollectionHandlers = {
        get: createInstrumentationGetter(false, true)
    };
    const readonlyCollectionHandlers = {
        get: createInstrumentationGetter(true, false)
    };
    const shallowReadonlyCollectionHandlers = {
        get: createInstrumentationGetter(true, true)
    };
    function checkIdentityKeys(target, has, key) {
        const rawKey = toRaw(key);
        if (rawKey !== key && has.call(target, rawKey)) {
            const type = toRawType(target);
            console.warn(`Reactive ${type} contains both the raw and reactive ` +
                `versions of the same object${type === `Map` ? ` as keys` : ``}, ` +
                `which can lead to inconsistencies. ` +
                `Avoid differentiating between the raw and reactive versions ` +
                `of an object and only use the reactive version if possible.`);
        }
    }
  
    const reactiveMap = new WeakMap();
    const shallowReactiveMap = new WeakMap();
    const readonlyMap = new WeakMap();
    const shallowReadonlyMap = new WeakMap();
    function targetTypeMap(rawType) {
        switch (rawType) {
            case 'Object':
            case 'Array':
                return 1 /* COMMON */;
            case 'Map':
            case 'Set':
            case 'WeakMap':
            case 'WeakSet':
                return 2 /* COLLECTION */;
            default:
                return 0 /* INVALID */;
        }
    }
    function getTargetType(value) {
        return value["__v_skip" /* SKIP */] || !Object.isExtensible(value)
            ? 0 /* INVALID */
            : targetTypeMap(toRawType(value));
    }
    function reactive(target) {
        // if trying to observe a readonly proxy, return the readonly version.
        if (target && target["__v_isReadonly" /* IS_READONLY */]) {
            return target;
        }
        return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers, reactiveMap);
    }
    /**
     * Return a shallowly-reactive copy of the original object, where only the root
     * level properties are reactive. It also does not auto-unwrap refs (even at the
     * root level).
     */
    function shallowReactive(target) {
        return createReactiveObject(target, false, shallowReactiveHandlers, shallowCollectionHandlers, shallowReactiveMap);
    }
    /**
     * Creates a readonly copy of the original object. Note the returned copy is not
     * made reactive, but `readonly` can be called on an already reactive object.
     */
    function readonly(target) {
        return createReactiveObject(target, true, readonlyHandlers, readonlyCollectionHandlers, readonlyMap);
    }
    /**
     * Returns a reactive-copy of the original object, where only the root level
     * properties are readonly, and does NOT unwrap refs nor recursively convert
     * returned properties.
     * This is used for creating the props proxy object for stateful components.
     */
    function shallowReadonly(target) {
        return createReactiveObject(target, true, shallowReadonlyHandlers, shallowReadonlyCollectionHandlers, shallowReadonlyMap);
    }
    function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers, proxyMap) {
        if (!isObject(target)) {
            {
                console.warn(`value cannot be made reactive: ${String(target)}`);
            }
            return target;
        }
        // target is already a Proxy, return it.
        // exception: calling readonly() on a reactive object
        if (target["__v_raw" /* RAW */] &&
            !(isReadonly && target["__v_isReactive" /* IS_REACTIVE */])) {
            return target;
        }
        // target already has corresponding Proxy
        const existingProxy = proxyMap.get(target);
        if (existingProxy) {
            return existingProxy;
        }
        // only a whitelist of value types can be observed.
        const targetType = getTargetType(target);
        if (targetType === 0 /* INVALID */) {
            return target;
        }
        const proxy = new Proxy(target, targetType === 2 /* COLLECTION */ ? collectionHandlers : baseHandlers);
        proxyMap.set(target, proxy);
        return proxy;
    }
    function isReactive(value) {
        if (isReadonly(value)) {
            return isReactive(value["__v_raw" /* RAW */]);
        }
        return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
    }
    function isReadonly(value) {
        return !!(value && value["__v_isReadonly" /* IS_READONLY */]);
    }
    function isProxy(value) {
        return isReactive(value) || isReadonly(value);
    }
    function toRaw(observed) {
        return ((observed && toRaw(observed["__v_raw" /* RAW */])) || observed);
    }
    function markRaw(value) {
        def(value, "__v_skip" /* SKIP */, true);
        return value;
    }
  
    const convert = (val) => isObject(val) ? reactive(val) : val;
    function isRef(r) {
        return Boolean(r && r.__v_isRef === true);
    }
    function ref(value) {
        return createRef(value);
    }
    function shallowRef(value) {
        return createRef(value, true);
    }
    class RefImpl {
        constructor(_rawValue, _shallow = false) {
            this._rawValue = _rawValue;
            this._shallow = _shallow;
            this.__v_isRef = true;
            this._value = _shallow ? _rawValue : convert(_rawValue);
        }
        get value() {
            track(toRaw(this), "get" /* GET */, 'value');
            return this._value;
        }
        set value(newVal) {
            if (hasChanged(toRaw(newVal), this._rawValue)) {
                this._rawValue = newVal;
                this._value = this._shallow ? newVal : convert(newVal);
                trigger(toRaw(this), "set" /* SET */, 'value', newVal);
            }
        }
    }
    function createRef(rawValue, shallow = false) {
        if (isRef(rawValue)) {
            return rawValue;
        }
        return new RefImpl(rawValue, shallow);
    }
    function triggerRef(ref) {
        trigger(toRaw(ref), "set" /* SET */, 'value', ref.value );
    }
    function unref(ref) {
        return isRef(ref) ? ref.value : ref;
    }
    const shallowUnwrapHandlers = {
        get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
        set: (target, key, value, receiver) => {
            const oldValue = target[key];
            if (isRef(oldValue) && !isRef(value)) {
                oldValue.value = value;
                return true;
            }
            else {
                return Reflect.set(target, key, value, receiver);
            }
        }
    };
    function proxyRefs(objectWithRefs) {
        return isReactive(objectWithRefs)
            ? objectWithRefs
            : new Proxy(objectWithRefs, shallowUnwrapHandlers);
    }
    class CustomRefImpl {
        constructor(factory) {
            this.__v_isRef = true;
            const { get, set } = factory(() => track(this, "get" /* GET */, 'value'), () => trigger(this, "set" /* SET */, 'value'));
            this._get = get;
            this._set = set;
        }
        get value() {
            return this._get();
        }
        set value(newVal) {
            this._set(newVal);
        }
    }
    function customRef(factory) {
        return new CustomRefImpl(factory);
    }
    function toRefs(object) {
        if (!isProxy(object)) {
            console.warn(`toRefs() expects a reactive object but received a plain one.`);
        }
        const ret = isArray(object) ? new Array(object.length) : {};
        for (const key in object) {
            ret[key] = toRef(object, key);
        }
        return ret;
    }
    class ObjectRefImpl {
        constructor(_object, _key) {
            this._object = _object;
            this._key = _key;
            this.__v_isRef = true;
        }
        get value() {
            return this._object[this._key];
        }
        set value(newVal) {
            this._object[this._key] = newVal;
        }
    }
    function toRef(object, key) {
        return isRef(object[key])
            ? object[key]
            : new ObjectRefImpl(object, key);
    }
  
    class ComputedRefImpl {
        constructor(getter, _setter, isReadonly) {
            this._setter = _setter;
            this._dirty = true;
            this.__v_isRef = true;
            this.effect = effect(getter, {
                lazy: true,
                scheduler: () => {
                    if (!this._dirty) {
                        this._dirty = true;
                        trigger(toRaw(this), "set" /* SET */, 'value');
                    }
                }
            });
            this["__v_isReadonly" /* IS_READONLY */] = isReadonly;
        }
        get value() {
            // the computed ref may get wrapped by other proxies e.g. readonly() #3376
            const self = toRaw(this);
            if (self._dirty) {
                self._value = this.effect();
                self._dirty = false;
            }
            track(self, "get" /* GET */, 'value');
            return self._value;
        }
        set value(newValue) {
            this._setter(newValue);
        }
    }
    function computed(getterOrOptions) {
        let getter;
        let setter;
        if (isFunction(getterOrOptions)) {
            getter = getterOrOptions;
            setter = () => {
                    console.warn('Write operation failed: computed value is readonly');
                }
                ;
        }
        else {
            getter = getterOrOptions.get;
            setter = getterOrOptions.set;
        }
        return new ComputedRefImpl(getter, setter, isFunction(getterOrOptions) || !getterOrOptions.set);
    }
  
    const stack = [];
    function pushWarningContext(vnode) {
        stack.push(vnode);
    }
    function popWarningContext() {
        stack.pop();
    }
    function warn(msg, ...args) {
        // avoid props formatting or warn handler tracking deps that might be mutated
        // during patch, leading to infinite recursion.
        pauseTracking();
        const instance = stack.length ? stack[stack.length - 1].component : null;
        const appWarnHandler = instance && instance.appContext.config.warnHandler;
        const trace = getComponentTrace();
        if (appWarnHandler) {
            callWithErrorHandling(appWarnHandler, instance, 11 /* APP_WARN_HANDLER */, [
                msg + args.join(''),
                instance && instance.proxy,
                trace
                    .map(({ vnode }) => `at <${formatComponentName(instance, vnode.type)}>`)
                    .join('\n'),
                trace
            ]);
        }
        else {
            const warnArgs = [`[Vue warn]: ${msg}`, ...args];
            /* istanbul ignore if */
            if (trace.length &&
                // avoid spamming console during tests
                !false) {
                warnArgs.push(`\n`, ...formatTrace(trace));
            }
            console.warn(...warnArgs);
        }
        resetTracking();
    }
    function getComponentTrace() {
        let currentVNode = stack[stack.length - 1];
        if (!currentVNode) {
            return [];
        }
        // we can't just use the stack because it will be incomplete during updates
        // that did not start from the root. Re-construct the parent chain using
        // instance parent pointers.
        const normalizedStack = [];
        while (currentVNode) {
            const last = normalizedStack[0];
            if (last && last.vnode === currentVNode) {
                last.recurseCount++;
            }
            else {
                normalizedStack.push({
                    vnode: currentVNode,
                    recurseCount: 0
                });
            }
            const parentInstance = currentVNode.component && currentVNode.component.parent;
            currentVNode = parentInstance && parentInstance.vnode;
        }
        return normalizedStack;
    }
    /* istanbul ignore next */
    function formatTrace(trace) {
        const logs = [];
        trace.forEach((entry, i) => {
            logs.push(...(i === 0 ? [] : [`\n`]), ...formatTraceEntry(entry));
        });
        return logs;
    }
    function formatTraceEntry({ vnode, recurseCount }) {
        const postfix = recurseCount > 0 ? `... (${recurseCount} recursive calls)` : ``;
        const isRoot = vnode.component ? vnode.component.parent == null : false;
        const open = ` at <${formatComponentName(vnode.component, vnode.type, isRoot)}`;
        const close = `>` + postfix;
        return vnode.props
            ? [open, ...formatProps(vnode.props), close]
            : [open + close];
    }
    /* istanbul ignore next */
    function formatProps(props) {
        const res = [];
        const keys = Object.keys(props);
        keys.slice(0, 3).forEach(key => {
            res.push(...formatProp(key, props[key]));
        });
        if (keys.length > 3) {
            res.push(` ...`);
        }
        return res;
    }
    /* istanbul ignore next */
    function formatProp(key, value, raw) {
        if (isString(value)) {
            value = JSON.stringify(value);
            return raw ? value : [`${key}=${value}`];
        }
        else if (typeof value === 'number' ||
            typeof value === 'boolean' ||
            value == null) {
            return raw ? value : [`${key}=${value}`];
        }
        else if (isRef(value)) {
            value = formatProp(key, toRaw(value.value), true);
            return raw ? value : [`${key}=Ref<`, value, `>`];
        }
        else if (isFunction(value)) {
            return [`${key}=fn${value.name ? `<${value.name}>` : ``}`];
        }
        else {
            value = toRaw(value);
            return raw ? value : [`${key}=`, value];
        }
    }
  
    const ErrorTypeStrings = {
        ["bc" /* BEFORE_CREATE */]: 'beforeCreate hook',
        ["c" /* CREATED */]: 'created hook',
        ["bm" /* BEFORE_MOUNT */]: 'beforeMount hook',
        ["m" /* MOUNTED */]: 'mounted hook',
        ["bu" /* BEFORE_UPDATE */]: 'beforeUpdate hook',
        ["u" /* UPDATED */]: 'updated',
        ["bum" /* BEFORE_UNMOUNT */]: 'beforeUnmount hook',
        ["um" /* UNMOUNTED */]: 'unmounted hook',
        ["a" /* ACTIVATED */]: 'activated hook',
        ["da" /* DEACTIVATED */]: 'deactivated hook',
        ["ec" /* ERROR_CAPTURED */]: 'errorCaptured hook',
        ["rtc" /* RENDER_TRACKED */]: 'renderTracked hook',
        ["rtg" /* RENDER_TRIGGERED */]: 'renderTriggered hook',
        [0 /* SETUP_FUNCTION */]: 'setup function',
        [1 /* RENDER_FUNCTION */]: 'render function',
        [2 /* WATCH_GETTER */]: 'watcher getter',
        [3 /* WATCH_CALLBACK */]: 'watcher callback',
        [4 /* WATCH_CLEANUP */]: 'watcher cleanup function',
        [5 /* NATIVE_EVENT_HANDLER */]: 'native event handler',
        [6 /* COMPONENT_EVENT_HANDLER */]: 'component event handler',
        [7 /* VNODE_HOOK */]: 'vnode hook',
        [8 /* DIRECTIVE_HOOK */]: 'directive hook',
        [9 /* TRANSITION_HOOK */]: 'transition hook',
        [10 /* APP_ERROR_HANDLER */]: 'app errorHandler',
        [11 /* APP_WARN_HANDLER */]: 'app warnHandler',
        [12 /* FUNCTION_REF */]: 'ref function',
        [13 /* ASYNC_COMPONENT_LOADER */]: 'async component loader',
        [14 /* SCHEDULER */]: 'scheduler flush. This is likely a Vue internals bug. ' +
            'Please open an issue at https://new-issue.vuejs.org/?repo=vuejs/vue-next'
    };
    function callWithErrorHandling(fn, instance, type, args) {
        let res;
        try {
            res = args ? fn(...args) : fn();
        }
        catch (err) {
            handleError(err, instance, type);
        }
        return res;
    }
    function callWithAsyncErrorHandling(fn, instance, type, args) {
        if (isFunction(fn)) {
            const res = callWithErrorHandling(fn, instance, type, args);
            if (res && isPromise(res)) {
                res.catch(err => {
                    handleError(err, instance, type);
                });
            }
            return res;
        }
        const values = [];
        for (let i = 0; i < fn.length; i++) {
            values.push(callWithAsyncErrorHandling(fn[i], instance, type, args));
        }
        return values;
    }
    function handleError(err, instance, type, throwInDev = true) {
        const contextVNode = instance ? instance.vnode : null;
        if (instance) {
            let cur = instance.parent;
            // the exposed instance is the render proxy to keep it consistent with 2.x
            const exposedInstance = instance.proxy;
            // in production the hook receives only the error code
            const errorInfo = ErrorTypeStrings[type] ;
            while (cur) {
                const errorCapturedHooks = cur.ec;
                if (errorCapturedHooks) {
                    for (let i = 0; i < errorCapturedHooks.length; i++) {
                        if (errorCapturedHooks[i](err, exposedInstance, errorInfo) === false) {
                            return;
                        }
                    }
                }
                cur = cur.parent;
            }
            // app-level handling
            const appErrorHandler = instance.appContext.config.errorHandler;
            if (appErrorHandler) {
                callWithErrorHandling(appErrorHandler, null, 10 /* APP_ERROR_HANDLER */, [err, exposedInstance, errorInfo]);
                return;
            }
        }
        logError(err, type, contextVNode, throwInDev);
    }
    function logError(err, type, contextVNode, throwInDev = true) {
        {
            const info = ErrorTypeStrings[type];
            if (contextVNode) {
                pushWarningContext(contextVNode);
            }
            warn(`Unhandled error${info ? ` during execution of ${info}` : ``}`);
            if (contextVNode) {
                popWarningContext();
            }
            // crash in dev by default so it's more noticeable
            if (throwInDev) {
                throw err;
            }
            else {
                console.error(err);
            }
        }
    }
  
    let isFlushing = false;
    let isFlushPending = false;
    const queue = [];
    let flushIndex = 0;
    const pendingPreFlushCbs = [];
    let activePreFlushCbs = null;
    let preFlushIndex = 0;
    const pendingPostFlushCbs = [];
    let activePostFlushCbs = null;
    let postFlushIndex = 0;
    const resolvedPromise = Promise.resolve();
    let currentFlushPromise = null;
    let currentPreFlushParentJob = null;
    const RECURSION_LIMIT = 100;
    function nextTick(fn) {
        const p = currentFlushPromise || resolvedPromise;
        return fn ? p.then(this ? fn.bind(this) : fn) : p;
    }
    // #2768
    // Use binary-search to find a suitable position in the queue,
    // so that the queue maintains the increasing order of job's id,
    // which can prevent the job from being skipped and also can avoid repeated patching.
    function findInsertionIndex(job) {
        // the start index should be `flushIndex + 1`
        let start = flushIndex + 1;
        let end = queue.length;
        const jobId = getId(job);
        while (start < end) {
            const middle = (start + end) >>> 1;
            const middleJobId = getId(queue[middle]);
            middleJobId < jobId ? (start = middle + 1) : (end = middle);
        }
        return start;
    }
    function queueJob(job) {
        // the dedupe search uses the startIndex argument of Array.includes()
        // by default the search index includes the current job that is being run
        // so it cannot recursively trigger itself again.
        // if the job is a watch() callback, the search will start with a +1 index to
        // allow it recursively trigger itself - it is the user's responsibility to
        // ensure it doesn't end up in an infinite loop.
        if ((!queue.length ||
            !queue.includes(job, isFlushing && job.allowRecurse ? flushIndex + 1 : flushIndex)) &&
            job !== currentPreFlushParentJob) {
            const pos = findInsertionIndex(job);
            if (pos > -1) {
                queue.splice(pos, 0, job);
            }
            else {
                queue.push(job);
            }
            queueFlush();
        }
    }
    function queueFlush() {
        if (!isFlushing && !isFlushPending) {
            isFlushPending = true;
            currentFlushPromise = resolvedPromise.then(flushJobs);
        }
    }
    function invalidateJob(job) {
        const i = queue.indexOf(job);
        if (i > flushIndex) {
            queue.splice(i, 1);
        }
    }
    function queueCb(cb, activeQueue, pendingQueue, index) {
        if (!isArray(cb)) {
            if (!activeQueue ||
                !activeQueue.includes(cb, cb.allowRecurse ? index + 1 : index)) {
                pendingQueue.push(cb);
            }
        }
        else {
            // if cb is an array, it is a component lifecycle hook which can only be
            // triggered by a job, which is already deduped in the main queue, so
            // we can skip duplicate check here to improve perf
            pendingQueue.push(...cb);
        }
        queueFlush();
    }
    function queuePreFlushCb(cb) {
        queueCb(cb, activePreFlushCbs, pendingPreFlushCbs, preFlushIndex);
    }
    function queuePostFlushCb(cb) {
        queueCb(cb, activePostFlushCbs, pendingPostFlushCbs, postFlushIndex);
    }
    function flushPreFlushCbs(seen, parentJob = null) {
        if (pendingPreFlushCbs.length) {
            currentPreFlushParentJob = parentJob;
            activePreFlushCbs = [...new Set(pendingPreFlushCbs)];
            pendingPreFlushCbs.length = 0;
            {
                seen = seen || new Map();
            }
            for (preFlushIndex = 0; preFlushIndex < activePreFlushCbs.length; preFlushIndex++) {
                {
                    checkRecursiveUpdates(seen, activePreFlushCbs[preFlushIndex]);
                }
                activePreFlushCbs[preFlushIndex]();
            }
            activePreFlushCbs = null;
            preFlushIndex = 0;
            currentPreFlushParentJob = null;
            // recursively flush until it drains
            flushPreFlushCbs(seen, parentJob);
        }
    }
    function flushPostFlushCbs(seen) {
        if (pendingPostFlushCbs.length) {
            const deduped = [...new Set(pendingPostFlushCbs)];
            pendingPostFlushCbs.length = 0;
            // #1947 already has active queue, nested flushPostFlushCbs call
            if (activePostFlushCbs) {
                activePostFlushCbs.push(...deduped);
                return;
            }
            activePostFlushCbs = deduped;
            {
                seen = seen || new Map();
            }
            activePostFlushCbs.sort((a, b) => getId(a) - getId(b));
            for (postFlushIndex = 0; postFlushIndex < activePostFlushCbs.length; postFlushIndex++) {
                {
                    checkRecursiveUpdates(seen, activePostFlushCbs[postFlushIndex]);
                }
                activePostFlushCbs[postFlushIndex]();
            }
            activePostFlushCbs = null;
            postFlushIndex = 0;
        }
    }
    const getId = (job) => job.id == null ? Infinity : job.id;
    function flushJobs(seen) {
        isFlushPending = false;
        isFlushing = true;
        {
            seen = seen || new Map();
        }
        flushPreFlushCbs(seen);
        // Sort queue before flush.
        // This ensures that:
        // 1. Components are updated from parent to child. (because parent is always
        //    created before the child so its render effect will have smaller
        //    priority number)
        // 2. If a component is unmounted during a parent component's update,
        //    its update can be skipped.
        queue.sort((a, b) => getId(a) - getId(b));
        try {
            for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
                const job = queue[flushIndex];
                if (job) {
                    if (true) {
                        checkRecursiveUpdates(seen, job);
                    }
                    callWithErrorHandling(job, null, 14 /* SCHEDULER */);
                }
            }
        }
        finally {
            flushIndex = 0;
            queue.length = 0;
            flushPostFlushCbs(seen);
            isFlushing = false;
            currentFlushPromise = null;
            // some postFlushCb queued jobs!
            // keep flushing until it drains.
            if (queue.length || pendingPostFlushCbs.length) {
                flushJobs(seen);
            }
        }
    }
    function checkRecursiveUpdates(seen, fn) {
        if (!seen.has(fn)) {
            seen.set(fn, 1);
        }
        else {
            const count = seen.get(fn);
            if (count > RECURSION_LIMIT) {
                throw new Error(`Maximum recursive updates exceeded. ` +
                    `This means you have a reactive effect that is mutating its own ` +
                    `dependencies and thus recursively triggering itself. Possible sources ` +
                    `include component template, render function, updated hook or ` +
                    `watcher source function.`);
            }
            else {
                seen.set(fn, count + 1);
            }
        }
    }
  
    /* eslint-disable no-restricted-globals */
    let isHmrUpdating = false;
    const hmrDirtyComponents = new Set();
    // Expose the HMR runtime on the global object
    // This makes it entirely tree-shakable without polluting the exports and makes
    // it easier to be used in toolings like vue-loader
    // Note: for a component to be eligible for HMR it also needs the __hmrId option
    // to be set so that its instances can be registered / removed.
    {
        const globalObject = typeof global !== 'undefined'
            ? global
            : typeof self !== 'undefined'
                ? self
                : typeof window !== 'undefined'
                    ? window
                    : {};
        globalObject.__VUE_HMR_RUNTIME__ = {
            createRecord: tryWrap(createRecord),
            rerender: tryWrap(rerender),
            reload: tryWrap(reload)
        };
    }
    const map = new Map();
    function registerHMR(instance) {
        const id = instance.type.__hmrId;
        let record = map.get(id);
        if (!record) {
            createRecord(id, instance.type);
            record = map.get(id);
        }
        record.instances.add(instance);
    }
    function unregisterHMR(instance) {
        map.get(instance.type.__hmrId).instances.delete(instance);
    }
    function createRecord(id, component) {
        if (!component) {
            warn(`HMR API usage is out of date.\n` +
                `Please upgrade vue-loader/vite/rollup-plugin-vue or other relevant ` +
                `dependency that handles Vue SFC compilation.`);
            component = {};
        }
        if (map.has(id)) {
            return false;
        }
        map.set(id, {
            component: isClassComponent(component) ? component.__vccOpts : component,
            instances: new Set()
        });
        return true;
    }
    function rerender(id, newRender) {
        const record = map.get(id);
        if (!record)
            return;
        if (newRender)
            record.component.render = newRender;
        // Array.from creates a snapshot which avoids the set being mutated during
        // updates
        Array.from(record.instances).forEach(instance => {
            if (newRender) {
                instance.render = newRender;
            }
            instance.renderCache = [];
            // this flag forces child components with slot content to update
            isHmrUpdating = true;
            instance.update();
            isHmrUpdating = false;
        });
    }
    function reload(id, newComp) {
        const record = map.get(id);
        if (!record)
            return;
        // Array.from creates a snapshot which avoids the set being mutated during
        // updates
        const { component, instances } = record;
        if (!hmrDirtyComponents.has(component)) {
            // 1. Update existing comp definition to match new one
            newComp = isClassComponent(newComp) ? newComp.__vccOpts : newComp;
            extend(component, newComp);
            for (const key in component) {
                if (!(key in newComp)) {
                    delete component[key];
                }
            }
            // 2. Mark component dirty. This forces the renderer to replace the component
            // on patch.
            hmrDirtyComponents.add(component);
            // 3. Make sure to unmark the component after the reload.
            queuePostFlushCb(() => {
                hmrDirtyComponents.delete(component);
            });
        }
        Array.from(instances).forEach(instance => {
            if (instance.parent) {
                // 4. Force the parent instance to re-render. This will cause all updated
                // components to be unmounted and re-mounted. Queue the update so that we
                // don't end up forcing the same parent to re-render multiple times.
                queueJob(instance.parent.update);
            }
            else if (instance.appContext.reload) {
                // root instance mounted via createApp() has a reload method
                instance.appContext.reload();
            }
            else if (typeof window !== 'undefined') {
                // root instance inside tree created via raw render(). Force reload.
                window.location.reload();
            }
            else {
                console.warn('[HMR] Root or manually mounted instance modified. Full reload required.');
            }
        });
    }
    function tryWrap(fn) {
        return (id, arg) => {
            try {
                return fn(id, arg);
            }
            catch (e) {
                console.error(e);
                console.warn(`[HMR] Something went wrong during Vue component hot-reload. ` +
                    `Full reload required.`);
            }
        };
    }
  
    function setDevtoolsHook(hook) {
        exports.devtools = hook;
    }
    function devtoolsInitApp(app, version) {
        // TODO queue if devtools is undefined
        if (!exports.devtools)
            return;
        exports.devtools.emit("app:init" /* APP_INIT */, app, version, {
            Fragment,
            Text,
            Comment,
            Static
        });
    }
    function devtoolsUnmountApp(app) {
        if (!exports.devtools)
            return;
        exports.devtools.emit("app:unmount" /* APP_UNMOUNT */, app);
    }
    const devtoolsComponentAdded = /*#__PURE__*/ createDevtoolsComponentHook("component:added" /* COMPONENT_ADDED */);
    const devtoolsComponentUpdated = /*#__PURE__*/ createDevtoolsComponentHook("component:updated" /* COMPONENT_UPDATED */);
    const devtoolsComponentRemoved = /*#__PURE__*/ createDevtoolsComponentHook("component:removed" /* COMPONENT_REMOVED */);
    function createDevtoolsComponentHook(hook) {
        return (component) => {
            if (!exports.devtools)
                return;
            exports.devtools.emit(hook, component.appContext.app, component.uid, component.parent ? component.parent.uid : undefined, component);
        };
    }
    function devtoolsComponentEmit(component, event, params) {
        if (!exports.devtools)
            return;
        exports.devtools.emit("component:emit" /* COMPONENT_EMIT */, component.appContext.app, component, event, params);
    }
  
    function emit(instance, event, ...rawArgs) {
        const props = instance.vnode.props || EMPTY_OBJ;
        {
            const { emitsOptions, propsOptions: [propsOptions] } = instance;
            if (emitsOptions) {
                if (!(event in emitsOptions)) {
                    if (!propsOptions || !(toHandlerKey(event) in propsOptions)) {
                        warn(`Component emitted event "${event}" but it is neither declared in ` +
                            `the emits option nor as an "${toHandlerKey(event)}" prop.`);
                    }
                }
                else {
                    const validator = emitsOptions[event];
                    if (isFunction(validator)) {
                        const isValid = validator(...rawArgs);
                        if (!isValid) {
                            warn(`Invalid event arguments: event validation failed for event "${event}".`);
                        }
                    }
                }
            }
        }
        let args = rawArgs;
        const isModelListener = event.startsWith('update:');
        // for v-model update:xxx events, apply modifiers on args
        const modelArg = isModelListener && event.slice(7);
        if (modelArg && modelArg in props) {
            const modifiersKey = `${modelArg === 'modelValue' ? 'model' : modelArg}Modifiers`;
            const { number, trim } = props[modifiersKey] || EMPTY_OBJ;
            if (trim) {
                args = rawArgs.map(a => a.trim());
            }
            else if (number) {
                args = rawArgs.map(toNumber);
            }
        }
        {
            devtoolsComponentEmit(instance, event, args);
        }
        {
            const lowerCaseEvent = event.toLowerCase();
            if (lowerCaseEvent !== event && props[toHandlerKey(lowerCaseEvent)]) {
                warn(`Event "${lowerCaseEvent}" is emitted in component ` +
                    `${formatComponentName(instance, instance.type)} but the handler is registered for "${event}". ` +
                    `Note that HTML attributes are case-insensitive and you cannot use ` +
                    `v-on to listen to camelCase events when using in-DOM templates. ` +
                    `You should probably use "${hyphenate(event)}" instead of "${event}".`);
            }
        }
        let handlerName;
        let handler = props[(handlerName = toHandlerKey(event))] ||
            // also try camelCase event handler (#2249)
            props[(handlerName = toHandlerKey(camelize(event)))];
        // for v-model update:xxx events, also trigger kebab-case equivalent
        // for props passed via kebab-case
        if (!handler && isModelListener) {
            handler = props[(handlerName = toHandlerKey(hyphenate(event)))];
        }
        if (handler) {
            callWithAsyncErrorHandling(handler, instance, 6 /* COMPONENT_EVENT_HANDLER */, args);
        }
        const onceHandler = props[handlerName + `Once`];
        if (onceHandler) {
            if (!instance.emitted) {
                (instance.emitted = {})[handlerName] = true;
            }
            else if (instance.emitted[handlerName]) {
                return;
            }
            callWithAsyncErrorHandling(onceHandler, instance, 6 /* COMPONENT_EVENT_HANDLER */, args);
        }
    }
    function normalizeEmitsOptions(comp, appContext, asMixin = false) {
        if (!appContext.deopt && comp.__emits !== undefined) {
            return comp.__emits;
        }
        const raw = comp.emits;
        let normalized = {};
        // apply mixin/extends props
        let hasExtends = false;
        if (!isFunction(comp)) {
            const extendEmits = (raw) => {
                const normalizedFromExtend = normalizeEmitsOptions(raw, appContext, true);
                if (normalizedFromExtend) {
                    hasExtends = true;
                    extend(normalized, normalizedFromExtend);
                }
            };
            if (!asMixin && appContext.mixins.length) {
                appContext.mixins.forEach(extendEmits);
            }
            if (comp.extends) {
                extendEmits(comp.extends);
            }
            if (comp.mixins) {
                comp.mixins.forEach(extendEmits);
            }
        }
        if (!raw && !hasExtends) {
            return (comp.__emits = null);
        }
        if (isArray(raw)) {
            raw.forEach(key => (normalized[key] = null));
        }
        else {
            extend(normalized, raw);
        }
        return (comp.__emits = normalized);
    }
    // Check if an incoming prop key is a declared emit event listener.
    // e.g. With `emits: { click: null }`, props named `onClick` and `onclick` are
    // both considered matched listeners.
    function isEmitListener(options, key) {
        if (!options || !isOn(key)) {
            return false;
        }
        key = key.slice(2).replace(/Once$/, '');
        return (hasOwn(options, key[0].toLowerCase() + key.slice(1)) ||
            hasOwn(options, hyphenate(key)) ||
            hasOwn(options, key));
    }
  
    let isRenderingCompiledSlot = 0;
    const setCompiledSlotRendering = (n) => (isRenderingCompiledSlot += n);
    /**
     * Compiler runtime helper for rendering `<slot/>`
     * @private
     */
    function renderSlot(slots, name, props = {}, 
    // this is not a user-facing function, so the fallback is always generated by
    // the compiler and guaranteed to be a function returning an array
    fallback, noSlotted) {
        let slot = slots[name];
        if (slot && slot.length > 1) {
            warn(`SSR-optimized slot function detected in a non-SSR-optimized render ` +
                `function. You need to mark this component with $dynamic-slots in the ` +
                `parent template.`);
            slot = () => [];
        }
        // a compiled slot disables block tracking by default to avoid manual
        // invocation interfering with template-based block tracking, but in
        // `renderSlot` we can be sure that it's template-based so we can force
        // enable it.
        isRenderingCompiledSlot++;
        openBlock();
        const validSlotContent = slot && ensureValidVNode(slot(props));
        const rendered = createBlock(Fragment, { key: props.key || `_${name}` }, validSlotContent || (fallback ? fallback() : []), validSlotContent && slots._ === 1 /* STABLE */
            ? 64 /* STABLE_FRAGMENT */
            : -2 /* BAIL */);
        if (!noSlotted && rendered.scopeId) {
            rendered.slotScopeIds = [rendered.scopeId + '-s'];
        }
        isRenderingCompiledSlot--;
        return rendered;
    }
    function ensureValidVNode(vnodes) {
        return vnodes.some(child => {
            if (!isVNode(child))
                return true;
            if (child.type === Comment)
                return false;
            if (child.type === Fragment &&
                !ensureValidVNode(child.children))
                return false;
            return true;
        })
            ? vnodes
            : null;
    }
  
    /**
     * mark the current rendering instance for asset resolution (e.g.
     * resolveComponent, resolveDirective) during render
     */
    let currentRenderingInstance = null;
    let currentScopeId = null;
    /**
     * Note: rendering calls maybe nested. The function returns the parent rendering
     * instance if present, which should be restored after the render is done:
     *
     * ```js
     * const prev = setCurrentRenderingInstance(i)
     * // ...render
     * setCurrentRenderingInstance(prev)
     * ```
     */
    function setCurrentRenderingInstance(instance) {
        const prev = currentRenderingInstance;
        currentRenderingInstance = instance;
        currentScopeId = (instance && instance.type.__scopeId) || null;
        return prev;
    }
    /**
     * Set scope id when creating hoisted vnodes.
     * @private compiler helper
     */
    function pushScopeId(id) {
        currentScopeId = id;
    }
    /**
     * Technically we no longer need this after 3.0.8 but we need to keep the same
     * API for backwards compat w/ code generated by compilers.
     * @private
     */
    function popScopeId() {
        currentScopeId = null;
    }
    /**
     * Only for backwards compat
     * @private
     */
    const withScopeId = (_id) => withCtx;
    /**
     * Wrap a slot function to memoize current rendering instance
     * @private compiler helper
     */
    function withCtx(fn, ctx = currentRenderingInstance) {
        if (!ctx)
            return fn;
        const renderFnWithContext = (...args) => {
            // If a user calls a compiled slot inside a template expression (#1745), it
            // can mess up block tracking, so by default we need to push a null block to
            // avoid that. This isn't necessary if rendering a compiled `<slot>`.
            if (!isRenderingCompiledSlot) {
                openBlock(true /* null block that disables tracking */);
            }
            const prevInstance = setCurrentRenderingInstance(ctx);
            const res = fn(...args);
            setCurrentRenderingInstance(prevInstance);
            if (!isRenderingCompiledSlot) {
                closeBlock();
            }
            return res;
        };
        // mark this as a compiled slot function.
        // this is used in vnode.ts -> normalizeChildren() to set the slot
        // rendering flag.
        renderFnWithContext._c = true;
        return renderFnWithContext;
    }
  
    /**
     * dev only flag to track whether $attrs was used during render.
     * If $attrs was used during render then the warning for failed attrs
     * fallthrough can be suppressed.
     */
    let accessedAttrs = false;
    function markAttrsAccessed() {
        accessedAttrs = true;
    }
    function renderComponentRoot(instance) {
        const { type: Component, vnode, proxy, withProxy, props, propsOptions: [propsOptions], slots, attrs, emit, render, renderCache, data, setupState, ctx } = instance;
        let result;
        const prev = setCurrentRenderingInstance(instance);
        {
            accessedAttrs = false;
        }
        try {
            let fallthroughAttrs;
            if (vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */) {
                // withProxy is a proxy with a different `has` trap only for
                // runtime-compiled render functions using `with` block.
                const proxyToUse = withProxy || proxy;
                result = normalizeVNode(render.call(proxyToUse, proxyToUse, renderCache, props, setupState, data, ctx));
                fallthroughAttrs = attrs;
            }
            else {
                // functional
                const render = Component;
                // in dev, mark attrs accessed if optional props (attrs === props)
                if (true && attrs === props) {
                    markAttrsAccessed();
                }
                result = normalizeVNode(render.length > 1
                    ? render(props, true
                        ? {
                            get attrs() {
                                markAttrsAccessed();
                                return attrs;
                            },
                            slots,
                            emit
                        }
                        : { attrs, slots, emit })
                    : render(props, null /* we know it doesn't need it */));
                fallthroughAttrs = Component.props
                    ? attrs
                    : getFunctionalFallthrough(attrs);
            }
            // attr merging
            // in dev mode, comments are preserved, and it's possible for a template
            // to have comments along side the root element which makes it a fragment
            let root = result;
            let setRoot = undefined;
            if (true &&
                result.patchFlag > 0 &&
                result.patchFlag & 2048 /* DEV_ROOT_FRAGMENT */) {
                ;
                [root, setRoot] = getChildRoot(result);
            }
            if (Component.inheritAttrs !== false && fallthroughAttrs) {
                const keys = Object.keys(fallthroughAttrs);
                const { shapeFlag } = root;
                if (keys.length) {
                    if (shapeFlag & 1 /* ELEMENT */ ||
                        shapeFlag & 6 /* COMPONENT */) {
                        if (propsOptions && keys.some(isModelListener)) {
                            // If a v-model listener (onUpdate:xxx) has a corresponding declared
                            // prop, it indicates this component expects to handle v-model and
                            // it should not fallthrough.
                            // related: #1543, #1643, #1989
                            fallthroughAttrs = filterModelListeners(fallthroughAttrs, propsOptions);
                        }
                        root = cloneVNode(root, fallthroughAttrs);
                    }
                    else if (true && !accessedAttrs && root.type !== Comment) {
                        const allAttrs = Object.keys(attrs);
                        const eventAttrs = [];
                        const extraAttrs = [];
                        for (let i = 0, l = allAttrs.length; i < l; i++) {
                            const key = allAttrs[i];
                            if (isOn(key)) {
                                // ignore v-model handlers when they fail to fallthrough
                                if (!isModelListener(key)) {
                                    // remove `on`, lowercase first letter to reflect event casing
                                    // accurately
                                    eventAttrs.push(key[2].toLowerCase() + key.slice(3));
                                }
                            }
                            else {
                                extraAttrs.push(key);
                            }
                        }
                        if (extraAttrs.length) {
                            warn(`Extraneous non-props attributes (` +
                                `${extraAttrs.join(', ')}) ` +
                                `were passed to component but could not be automatically inherited ` +
                                `because component renders fragment or text root nodes.`);
                        }
                        if (eventAttrs.length) {
                            warn(`Extraneous non-emits event listeners (` +
                                `${eventAttrs.join(', ')}) ` +
                                `were passed to component but could not be automatically inherited ` +
                                `because component renders fragment or text root nodes. ` +
                                `If the listener is intended to be a component custom event listener only, ` +
                                `declare it using the "emits" option.`);
                        }
                    }
                }
            }
            // inherit directives
            if (vnode.dirs) {
                if (true && !isElementRoot(root)) {
                    warn(`Runtime directive used on component with non-element root node. ` +
                        `The directives will not function as intended.`);
                }
                root.dirs = root.dirs ? root.dirs.concat(vnode.dirs) : vnode.dirs;
            }
            // inherit transition data
            if (vnode.transition) {
                if (true && !isElementRoot(root)) {
                    warn(`Component inside <Transition> renders non-element root node ` +
                        `that cannot be animated.`);
                }
                root.transition = vnode.transition;
            }
            if (true && setRoot) {
                setRoot(root);
            }
            else {
                result = root;
            }
        }
        catch (err) {
            blockStack.length = 0;
            handleError(err, instance, 1 /* RENDER_FUNCTION */);
            result = createVNode(Comment);
        }
        setCurrentRenderingInstance(prev);
        return result;
    }
    /**
     * dev only
     * In dev mode, template root level comments are rendered, which turns the
     * template into a fragment root, but we need to locate the single element
     * root for attrs and scope id processing.
     */
    const getChildRoot = (vnode) => {
        const rawChildren = vnode.children;
        const dynamicChildren = vnode.dynamicChildren;
        const childRoot = filterSingleRoot(rawChildren);
        if (!childRoot) {
            return [vnode, undefined];
        }
        const index = rawChildren.indexOf(childRoot);
        const dynamicIndex = dynamicChildren ? dynamicChildren.indexOf(childRoot) : -1;
        const setRoot = (updatedRoot) => {
            rawChildren[index] = updatedRoot;
            if (dynamicChildren) {
                if (dynamicIndex > -1) {
                    dynamicChildren[dynamicIndex] = updatedRoot;
                }
                else if (updatedRoot.patchFlag > 0) {
                    vnode.dynamicChildren = [...dynamicChildren, updatedRoot];
                }
            }
        };
        return [normalizeVNode(childRoot), setRoot];
    };
    function filterSingleRoot(children) {
        let singleRoot;
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (isVNode(child)) {
                // ignore user comment
                if (child.type !== Comment || child.children === 'v-if') {
                    if (singleRoot) {
                        // has more than 1 non-comment child, return now
                        return;
                    }
                    else {
                        singleRoot = child;
                    }
                }
            }
            else {
                return;
            }
        }
        return singleRoot;
    }
    const getFunctionalFallthrough = (attrs) => {
        let res;
        for (const key in attrs) {
            if (key === 'class' || key === 'style' || isOn(key)) {
                (res || (res = {}))[key] = attrs[key];
            }
        }
        return res;
    };
    const filterModelListeners = (attrs, props) => {
        const res = {};
        for (const key in attrs) {
            if (!isModelListener(key) || !(key.slice(9) in props)) {
                res[key] = attrs[key];
            }
        }
        return res;
    };
    const isElementRoot = (vnode) => {
        return (vnode.shapeFlag & 6 /* COMPONENT */ ||
            vnode.shapeFlag & 1 /* ELEMENT */ ||
            vnode.type === Comment // potential v-if branch switch
        );
    };
    function shouldUpdateComponent(prevVNode, nextVNode, optimized) {
        const { props: prevProps, children: prevChildren, component } = prevVNode;
        const { props: nextProps, children: nextChildren, patchFlag } = nextVNode;
        const emits = component.emitsOptions;
        // Parent component's render function was hot-updated. Since this may have
        // caused the child component's slots content to have changed, we need to
        // force the child to update as well.
        if ((prevChildren || nextChildren) && isHmrUpdating) {
            return true;
        }
        // force child update for runtime directive or transition on component vnode.
        if (nextVNode.dirs || nextVNode.transition) {
            return true;
        }
        if (optimized && patchFlag >= 0) {
            if (patchFlag & 1024 /* DYNAMIC_SLOTS */) {
                // slot content that references values that might have changed,
                // e.g. in a v-for
                return true;
            }
            if (patchFlag & 16 /* FULL_PROPS */) {
                if (!prevProps) {
                    return !!nextProps;
                }
                // presence of this flag indicates props are always non-null
                return hasPropsChanged(prevProps, nextProps, emits);
            }
            else if (patchFlag & 8 /* PROPS */) {
                const dynamicProps = nextVNode.dynamicProps;
                for (let i = 0; i < dynamicProps.length; i++) {
                    const key = dynamicProps[i];
                    if (nextProps[key] !== prevProps[key] &&
                        !isEmitListener(emits, key)) {
                        return true;
                    }
                }
            }
        }
        else {
            // this path is only taken by manually written render functions
            // so presence of any children leads to a forced update
            if (prevChildren || nextChildren) {
                if (!nextChildren || !nextChildren.$stable) {
                    return true;
                }
            }
            if (prevProps === nextProps) {
                return false;
            }
            if (!prevProps) {
                return !!nextProps;
            }
            if (!nextProps) {
                return true;
            }
            return hasPropsChanged(prevProps, nextProps, emits);
        }
        return false;
    }
    function hasPropsChanged(prevProps, nextProps, emitsOptions) {
        const nextKeys = Object.keys(nextProps);
        if (nextKeys.length !== Object.keys(prevProps).length) {
            return true;
        }
        for (let i = 0; i < nextKeys.length; i++) {
            const key = nextKeys[i];
            if (nextProps[key] !== prevProps[key] &&
                !isEmitListener(emitsOptions, key)) {
                return true;
            }
        }
        return false;
    }
    function updateHOCHostEl({ vnode, parent }, el // HostNode
    ) {
        while (parent && parent.subTree === vnode) {
            (vnode = parent.vnode).el = el;
            parent = parent.parent;
        }
    }
  
    const isSuspense = (type) => type.__isSuspense;
    // Suspense exposes a component-like API, and is treated like a component
    // in the compiler, but internally it's a special built-in type that hooks
    // directly into the renderer.
    const SuspenseImpl = {
        name: 'Suspense',
        // In order to make Suspense tree-shakable, we need to avoid importing it
        // directly in the renderer. The renderer checks for the __isSuspense flag
        // on a vnode's type and calls the `process` method, passing in renderer
        // internals.
        __isSuspense: true,
        process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, 
        // platform-specific impl passed from renderer
        rendererInternals) {
            if (n1 == null) {
                mountSuspense(n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, rendererInternals);
            }
            else {
                patchSuspense(n1, n2, container, anchor, parentComponent, isSVG, slotScopeIds, optimized, rendererInternals);
            }
        },
        hydrate: hydrateSuspense,
        create: createSuspenseBoundary
    };
    // Force-casted public typing for h and TSX props inference
    const Suspense = (SuspenseImpl
        );
    function mountSuspense(vnode, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, rendererInternals) {
        const { p: patch, o: { createElement } } = rendererInternals;
        const hiddenContainer = createElement('div');
        const suspense = (vnode.suspense = createSuspenseBoundary(vnode, parentSuspense, parentComponent, container, hiddenContainer, anchor, isSVG, slotScopeIds, optimized, rendererInternals));
        // start mounting the content subtree in an off-dom container
        patch(null, (suspense.pendingBranch = vnode.ssContent), hiddenContainer, null, parentComponent, suspense, isSVG, slotScopeIds);
        // now check if we have encountered any async deps
        if (suspense.deps > 0) {
            // has async
            // mount the fallback tree
            patch(null, vnode.ssFallback, container, anchor, parentComponent, null, // fallback tree will not have suspense context
            isSVG, slotScopeIds);
            setActiveBranch(suspense, vnode.ssFallback);
        }
        else {
            // Suspense has no async deps. Just resolve.
            suspense.resolve();
        }
    }
    function patchSuspense(n1, n2, container, anchor, parentComponent, isSVG, slotScopeIds, optimized, { p: patch, um: unmount, o: { createElement } }) {
        const suspense = (n2.suspense = n1.suspense);
        suspense.vnode = n2;
        n2.el = n1.el;
        const newBranch = n2.ssContent;
        const newFallback = n2.ssFallback;
        const { activeBranch, pendingBranch, isInFallback, isHydrating } = suspense;
        if (pendingBranch) {
            suspense.pendingBranch = newBranch;
            if (isSameVNodeType(newBranch, pendingBranch)) {
                // same root type but content may have changed.
                patch(pendingBranch, newBranch, suspense.hiddenContainer, null, parentComponent, suspense, isSVG, slotScopeIds, optimized);
                if (suspense.deps <= 0) {
                    suspense.resolve();
                }
                else if (isInFallback) {
                    patch(activeBranch, newFallback, container, anchor, parentComponent, null, // fallback tree will not have suspense context
                    isSVG, slotScopeIds, optimized);
                    setActiveBranch(suspense, newFallback);
                }
            }
            else {
                // toggled before pending tree is resolved
                suspense.pendingId++;
                if (isHydrating) {
                    // if toggled before hydration is finished, the current DOM tree is
                    // no longer valid. set it as the active branch so it will be unmounted
                    // when resolved
                    suspense.isHydrating = false;
                    suspense.activeBranch = pendingBranch;
                }
                else {
                    unmount(pendingBranch, parentComponent, suspense);
                }
                // increment pending ID. this is used to invalidate async callbacks
                // reset suspense state
                suspense.deps = 0;
                // discard effects from pending branch
                suspense.effects.length = 0;
                // discard previous container
                suspense.hiddenContainer = createElement('div');
                if (isInFallback) {
                    // already in fallback state
                    patch(null, newBranch, suspense.hiddenContainer, null, parentComponent, suspense, isSVG, slotScopeIds, optimized);
                    if (suspense.deps <= 0) {
                        suspense.resolve();
                    }
                    else {
                        patch(activeBranch, newFallback, container, anchor, parentComponent, null, // fallback tree will not have suspense context
                        isSVG, slotScopeIds, optimized);
                        setActiveBranch(suspense, newFallback);
                    }
                }
                else if (activeBranch && isSameVNodeType(newBranch, activeBranch)) {
                    // toggled "back" to current active branch
                    patch(activeBranch, newBranch, container, anchor, parentComponent, suspense, isSVG, slotScopeIds, optimized);
                    // force resolve
                    suspense.resolve(true);
                }
                else {
                    // switched to a 3rd branch
                    patch(null, newBranch, suspense.hiddenContainer, null, parentComponent, suspense, isSVG, slotScopeIds, optimized);
                    if (suspense.deps <= 0) {
                        suspense.resolve();
                    }
                }
            }
        }
        else {
            if (activeBranch && isSameVNodeType(newBranch, activeBranch)) {
                // root did not change, just normal patch
                patch(activeBranch, newBranch, container, anchor, parentComponent, suspense, isSVG, slotScopeIds, optimized);
                setActiveBranch(suspense, newBranch);
            }
            else {
                // root node toggled
                // invoke @pending event
                const onPending = n2.props && n2.props.onPending;
                if (isFunction(onPending)) {
                    onPending();
                }
                // mount pending branch in off-dom container
                suspense.pendingBranch = newBranch;
                suspense.pendingId++;
                patch(null, newBranch, suspense.hiddenContainer, null, parentComponent, suspense, isSVG, slotScopeIds, optimized);
                if (suspense.deps <= 0) {
                    // incoming branch has no async deps, resolve now.
                    suspense.resolve();
                }
                else {
                    const { timeout, pendingId } = suspense;
                    if (timeout > 0) {
                        setTimeout(() => {
                            if (suspense.pendingId === pendingId) {
                                suspense.fallback(newFallback);
                            }
                        }, timeout);
                    }
                    else if (timeout === 0) {
                        suspense.fallback(newFallback);
                    }
                }
            }
        }
    }
    let hasWarned = false;
    function createSuspenseBoundary(vnode, parent, parentComponent, container, hiddenContainer, anchor, isSVG, slotScopeIds, optimized, rendererInternals, isHydrating = false) {
        /* istanbul ignore if */
        if (!hasWarned) {
            hasWarned = true;
            // @ts-ignore `console.info` cannot be null error
            console[console.info ? 'info' : 'log'](`<Suspense> is an experimental feature and its API will likely change.`);
        }
        const { p: patch, m: move, um: unmount, n: next, o: { parentNode, remove } } = rendererInternals;
        const timeout = toNumber(vnode.props && vnode.props.timeout);
        const suspense = {
            vnode,
            parent,
            parentComponent,
            isSVG,
            container,
            hiddenContainer,
            anchor,
            deps: 0,
            pendingId: 0,
            timeout: typeof timeout === 'number' ? timeout : -1,
            activeBranch: null,
            pendingBranch: null,
            isInFallback: true,
            isHydrating,
            isUnmounted: false,
            effects: [],
            resolve(resume = false) {
                {
                    if (!resume && !suspense.pendingBranch) {
                        throw new Error(`suspense.resolve() is called without a pending branch.`);
                    }
                    if (suspense.isUnmounted) {
                        throw new Error(`suspense.resolve() is called on an already unmounted suspense boundary.`);
                    }
                }
                const { vnode, activeBranch, pendingBranch, pendingId, effects, parentComponent, container } = suspense;
                if (suspense.isHydrating) {
                    suspense.isHydrating = false;
                }
                else if (!resume) {
                    const delayEnter = activeBranch &&
                        pendingBranch.transition &&
                        pendingBranch.transition.mode === 'out-in';
                    if (delayEnter) {
                        activeBranch.transition.afterLeave = () => {
                            if (pendingId === suspense.pendingId) {
                                move(pendingBranch, container, anchor, 0 /* ENTER */);
                            }
                        };
                    }
                    // this is initial anchor on mount
                    let { anchor } = suspense;
                    // unmount current active tree
                    if (activeBranch) {
                        // if the fallback tree was mounted, it may have been moved
                        // as part of a parent suspense. get the latest anchor for insertion
                        anchor = next(activeBranch);
                        unmount(activeBranch, parentComponent, suspense, true);
                    }
                    if (!delayEnter) {
                        // move content from off-dom container to actual container
                        move(pendingBranch, container, anchor, 0 /* ENTER */);
                    }
                }
                setActiveBranch(suspense, pendingBranch);
                suspense.pendingBranch = null;
                suspense.isInFallback = false;
                // flush buffered effects
                // check if there is a pending parent suspense
                let parent = suspense.parent;
                let hasUnresolvedAncestor = false;
                while (parent) {
                    if (parent.pendingBranch) {
                        // found a pending parent suspense, merge buffered post jobs
                        // into that parent
                        parent.effects.push(...effects);
                        hasUnresolvedAncestor = true;
                        break;
                    }
                    parent = parent.parent;
                }
                // no pending parent suspense, flush all jobs
                if (!hasUnresolvedAncestor) {
                    queuePostFlushCb(effects);
                }
                suspense.effects = [];
                // invoke @resolve event
                const onResolve = vnode.props && vnode.props.onResolve;
                if (isFunction(onResolve)) {
                    onResolve();
                }
            },
            fallback(fallbackVNode) {
                if (!suspense.pendingBranch) {
                    return;
                }
                const { vnode, activeBranch, parentComponent, container, isSVG } = suspense;
                // invoke @fallback event
                const onFallback = vnode.props && vnode.props.onFallback;
                if (isFunction(onFallback)) {
                    onFallback();
                }
                const anchor = next(activeBranch);
                const mountFallback = () => {
                    if (!suspense.isInFallback) {
                        return;
                    }
                    // mount the fallback tree
                    patch(null, fallbackVNode, container, anchor, parentComponent, null, // fallback tree will not have suspense context
                    isSVG, slotScopeIds, optimized);
                    setActiveBranch(suspense, fallbackVNode);
                };
                const delayEnter = fallbackVNode.transition && fallbackVNode.transition.mode === 'out-in';
                if (delayEnter) {
                    activeBranch.transition.afterLeave = mountFallback;
                }
                // unmount current active branch
                unmount(activeBranch, parentComponent, null, // no suspense so unmount hooks fire now
                true // shouldRemove
                );
                suspense.isInFallback = true;
                if (!delayEnter) {
                    mountFallback();
                }
            },
            move(container, anchor, type) {
                suspense.activeBranch &&
                    move(suspense.activeBranch, container, anchor, type);
                suspense.container = container;
            },
            next() {
                return suspense.activeBranch && next(suspense.activeBranch);
            },
            registerDep(instance, setupRenderEffect) {
                const isInPendingSuspense = !!suspense.pendingBranch;
                if (isInPendingSuspense) {
                    suspense.deps++;
                }
                const hydratedEl = instance.vnode.el;
                instance
                    .asyncDep.catch(err => {
                    handleError(err, instance, 0 /* SETUP_FUNCTION */);
                })
                    .then(asyncSetupResult => {
                    // retry when the setup() promise resolves.
                    // component may have been unmounted before resolve.
                    if (instance.isUnmounted ||
                        suspense.isUnmounted ||
                        suspense.pendingId !== instance.suspenseId) {
                        return;
                    }
                    // retry from this component
                    instance.asyncResolved = true;
                    const { vnode } = instance;
                    {
                        pushWarningContext(vnode);
                    }
                    handleSetupResult(instance, asyncSetupResult, false);
                    if (hydratedEl) {
                        // vnode may have been replaced if an update happened before the
                        // async dep is resolved.
                        vnode.el = hydratedEl;
                    }
                    const placeholder = !hydratedEl && instance.subTree.el;
                    setupRenderEffect(instance, vnode, 
                    // component may have been moved before resolve.
                    // if this is not a hydration, instance.subTree will be the comment
                    // placeholder.
                    parentNode(hydratedEl || instance.subTree.el), 
                    // anchor will not be used if this is hydration, so only need to
                    // consider the comment placeholder case.
                    hydratedEl ? null : next(instance.subTree), suspense, isSVG, optimized);
                    if (placeholder) {
                        remove(placeholder);
                    }
                    updateHOCHostEl(instance, vnode.el);
                    {
                        popWarningContext();
                    }
                    // only decrease deps count if suspense is not already resolved
                    if (isInPendingSuspense && --suspense.deps === 0) {
                        suspense.resolve();
                    }
                });
            },
            unmount(parentSuspense, doRemove) {
                suspense.isUnmounted = true;
                if (suspense.activeBranch) {
                    unmount(suspense.activeBranch, parentComponent, parentSuspense, doRemove);
                }
                if (suspense.pendingBranch) {
                    unmount(suspense.pendingBranch, parentComponent, parentSuspense, doRemove);
                }
            }
        };
        return suspense;
    }
    function hydrateSuspense(node, vnode, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, rendererInternals, hydrateNode) {
        /* eslint-disable no-restricted-globals */
        const suspense = (vnode.suspense = createSuspenseBoundary(vnode, parentSuspense, parentComponent, node.parentNode, document.createElement('div'), null, isSVG, slotScopeIds, optimized, rendererInternals, true /* hydrating */));
        // there are two possible scenarios for server-rendered suspense:
        // - success: ssr content should be fully resolved
        // - failure: ssr content should be the fallback branch.
        // however, on the client we don't really know if it has failed or not
        // attempt to hydrate the DOM assuming it has succeeded, but we still
        // need to construct a suspense boundary first
        const result = hydrateNode(node, (suspense.pendingBranch = vnode.ssContent), parentComponent, suspense, slotScopeIds, optimized);
        if (suspense.deps === 0) {
            suspense.resolve();
        }
        return result;
        /* eslint-enable no-restricted-globals */
    }
    function normalizeSuspenseChildren(vnode) {
        const { shapeFlag, children } = vnode;
        let content;
        let fallback;
        if (shapeFlag & 32 /* SLOTS_CHILDREN */) {
            content = normalizeSuspenseSlot(children.default);
            fallback = normalizeSuspenseSlot(children.fallback);
        }
        else {
            content = normalizeSuspenseSlot(children);
            fallback = normalizeVNode(null);
        }
        return {
            content,
            fallback
        };
    }
    function normalizeSuspenseSlot(s) {
        if (isFunction(s)) {
            s = s();
        }
        if (isArray(s)) {
            const singleChild = filterSingleRoot(s);
            if (!singleChild) {
                warn(`<Suspense> slots expect a single root node.`);
            }
            s = singleChild;
        }
        return normalizeVNode(s);
    }
    function queueEffectWithSuspense(fn, suspense) {
        if (suspense && suspense.pendingBranch) {
            if (isArray(fn)) {
                suspense.effects.push(...fn);
            }
            else {
                suspense.effects.push(fn);
            }
        }
        else {
            queuePostFlushCb(fn);
        }
    }
    function setActiveBranch(suspense, branch) {
        suspense.activeBranch = branch;
        const { vnode, parentComponent } = suspense;
        const el = (vnode.el = branch.el);
        // in case suspense is the root node of a component,
        // recursively update the HOC el
        if (parentComponent && parentComponent.subTree === vnode) {
            parentComponent.vnode.el = el;
            updateHOCHostEl(parentComponent, el);
        }
    }
  
    function initProps(instance, rawProps, isStateful, // result of bitwise flag comparison
    isSSR = false) {
        const props = {};
        const attrs = {};
        def(attrs, InternalObjectKey, 1);
        instance.propsDefaults = Object.create(null);
        setFullProps(instance, rawProps, props, attrs);
        // validation
        {
            validateProps(rawProps || {}, props, instance);
        }
        if (isStateful) {
            // stateful
            instance.props = isSSR ? props : shallowReactive(props);
        }
        else {
            if (!instance.type.props) {
                // functional w/ optional props, props === attrs
                instance.props = attrs;
            }
            else {
                // functional w/ declared props
                instance.props = props;
            }
        }
        instance.attrs = attrs;
    }
    function updateProps(instance, rawProps, rawPrevProps, optimized) {
        const { props, attrs, vnode: { patchFlag } } = instance;
        const rawCurrentProps = toRaw(props);
        const [options] = instance.propsOptions;
        if (
        // always force full diff in dev
        // - #1942 if hmr is enabled with sfc component
        // - vite#872 non-sfc component used by sfc component
        !((instance.type.__hmrId ||
                (instance.parent && instance.parent.type.__hmrId))) &&
            (optimized || patchFlag > 0) &&
            !(patchFlag & 16 /* FULL_PROPS */)) {
            if (patchFlag & 8 /* PROPS */) {
                // Compiler-generated props & no keys change, just set the updated
                // the props.
                const propsToUpdate = instance.vnode.dynamicProps;
                for (let i = 0; i < propsToUpdate.length; i++) {
                    const key = propsToUpdate[i];
                    // PROPS flag guarantees rawProps to be non-null
                    const value = rawProps[key];
                    if (options) {
                        // attr / props separation was done on init and will be consistent
                        // in this code path, so just check if attrs have it.
                        if (hasOwn(attrs, key)) {
                            attrs[key] = value;
                        }
                        else {
                            const camelizedKey = camelize(key);
                            props[camelizedKey] = resolvePropValue(options, rawCurrentProps, camelizedKey, value, instance);
                        }
                    }
                    else {
                        attrs[key] = value;
                    }
                }
            }
        }
        else {
            // full props update.
            setFullProps(instance, rawProps, props, attrs);
            // in case of dynamic props, check if we need to delete keys from
            // the props object
            let kebabKey;
            for (const key in rawCurrentProps) {
                if (!rawProps ||
                    // for camelCase
                    (!hasOwn(rawProps, key) &&
                        // it's possible the original props was passed in as kebab-case
                        // and converted to camelCase (#955)
                        ((kebabKey = hyphenate(key)) === key || !hasOwn(rawProps, kebabKey)))) {
                    if (options) {
                        if (rawPrevProps &&
                            // for camelCase
                            (rawPrevProps[key] !== undefined ||
                                // for kebab-case
                                rawPrevProps[kebabKey] !== undefined)) {
                            props[key] = resolvePropValue(options, rawProps || EMPTY_OBJ, key, undefined, instance);
                        }
                    }
                    else {
                        delete props[key];
                    }
                }
            }
            // in the case of functional component w/o props declaration, props and
            // attrs point to the same object so it should already have been updated.
            if (attrs !== rawCurrentProps) {
                for (const key in attrs) {
                    if (!rawProps || !hasOwn(rawProps, key)) {
                        delete attrs[key];
                    }
                }
            }
        }
        // trigger updates for $attrs in case it's used in component slots
        trigger(instance, "set" /* SET */, '$attrs');
        {
            validateProps(rawProps || {}, props, instance);
        }
    }
    function setFullProps(instance, rawProps, props, attrs) {
        const [options, needCastKeys] = instance.propsOptions;
        if (rawProps) {
            for (const key in rawProps) {
                const value = rawProps[key];
                // key, ref are reserved and never passed down
                if (isReservedProp(key)) {
                    continue;
                }
                // prop option names are camelized during normalization, so to support
                // kebab -> camel conversion here we need to camelize the key.
                let camelKey;
                if (options && hasOwn(options, (camelKey = camelize(key)))) {
                    props[camelKey] = value;
                }
                else if (!isEmitListener(instance.emitsOptions, key)) {
                    // Any non-declared (either as a prop or an emitted event) props are put
                    // into a separate `attrs` object for spreading. Make sure to preserve
                    // original key casing
                    attrs[key] = value;
                }
            }
        }
        if (needCastKeys) {
            const rawCurrentProps = toRaw(props);
            for (let i = 0; i < needCastKeys.length; i++) {
                const key = needCastKeys[i];
                props[key] = resolvePropValue(options, rawCurrentProps, key, rawCurrentProps[key], instance);
            }
        }
    }
    function resolvePropValue(options, props, key, value, instance) {
        const opt = options[key];
        if (opt != null) {
            const hasDefault = hasOwn(opt, 'default');
            // default values
            if (hasDefault && value === undefined) {
                const defaultValue = opt.default;
                if (opt.type !== Function && isFunction(defaultValue)) {
                    const { propsDefaults } = instance;
                    if (key in propsDefaults) {
                        value = propsDefaults[key];
                    }
                    else {
                        setCurrentInstance(instance);
                        value = propsDefaults[key] = defaultValue(props);
                        setCurrentInstance(null);
                    }
                }
                else {
                    value = defaultValue;
                }
            }
            // boolean casting
            if (opt[0 /* shouldCast */]) {
                if (!hasOwn(props, key) && !hasDefault) {
                    value = false;
                }
                else if (opt[1 /* shouldCastTrue */] &&
                    (value === '' || value === hyphenate(key))) {
                    value = true;
                }
            }
        }
        return value;
    }
    function normalizePropsOptions(comp, appContext, asMixin = false) {
        if (!appContext.deopt && comp.__props) {
            return comp.__props;
        }
        const raw = comp.props;
        const normalized = {};
        const needCastKeys = [];
        // apply mixin/extends props
        let hasExtends = false;
        if (!isFunction(comp)) {
            const extendProps = (raw) => {
                hasExtends = true;
                const [props, keys] = normalizePropsOptions(raw, appContext, true);
                extend(normalized, props);
                if (keys)
                    needCastKeys.push(...keys);
            };
            if (!asMixin && appContext.mixins.length) {
                appContext.mixins.forEach(extendProps);
            }
            if (comp.extends) {
                extendProps(comp.extends);
            }
            if (comp.mixins) {
                comp.mixins.forEach(extendProps);
            }
        }
        if (!raw && !hasExtends) {
            return (comp.__props = EMPTY_ARR);
        }
        if (isArray(raw)) {
            for (let i = 0; i < raw.length; i++) {
                if (!isString(raw[i])) {
                    warn(`props must be strings when using array syntax.`, raw[i]);
                }
                const normalizedKey = camelize(raw[i]);
                if (validatePropName(normalizedKey)) {
                    normalized[normalizedKey] = EMPTY_OBJ;
                }
            }
        }
        else if (raw) {
            if (!isObject(raw)) {
                warn(`invalid props options`, raw);
            }
            for (const key in raw) {
                const normalizedKey = camelize(key);
                if (validatePropName(normalizedKey)) {
                    const opt = raw[key];
                    const prop = (normalized[normalizedKey] =
                        isArray(opt) || isFunction(opt) ? { type: opt } : opt);
                    if (prop) {
                        const booleanIndex = getTypeIndex(Boolean, prop.type);
                        const stringIndex = getTypeIndex(String, prop.type);
                        prop[0 /* shouldCast */] = booleanIndex > -1;
                        prop[1 /* shouldCastTrue */] =
                            stringIndex < 0 || booleanIndex < stringIndex;
                        // if the prop needs boolean casting or default value
                        if (booleanIndex > -1 || hasOwn(prop, 'default')) {
                            needCastKeys.push(normalizedKey);
                        }
                    }
                }
            }
        }
        return (comp.__props = [normalized, needCastKeys]);
    }
    function validatePropName(key) {
        if (key[0] !== '$') {
            return true;
        }
        else {
            warn(`Invalid prop name: "${key}" is a reserved property.`);
        }
        return false;
    }
    // use function string name to check type constructors
    // so that it works across vms / iframes.
    function getType(ctor) {
        const match = ctor && ctor.toString().match(/^\s*function (\w+)/);
        return match ? match[1] : '';
    }
    function isSameType(a, b) {
        return getType(a) === getType(b);
    }
    function getTypeIndex(type, expectedTypes) {
        if (isArray(expectedTypes)) {
            return expectedTypes.findIndex(t => isSameType(t, type));
        }
        else if (isFunction(expectedTypes)) {
            return isSameType(expectedTypes, type) ? 0 : -1;
        }
        return -1;
    }
    /**
     * dev only
     */
    function validateProps(rawProps, props, instance) {
        const resolvedValues = toRaw(props);
        const options = instance.propsOptions[0];
        for (const key in options) {
            let opt = options[key];
            if (opt == null)
                continue;
            validateProp(key, resolvedValues[key], opt, !hasOwn(rawProps, key) && !hasOwn(rawProps, hyphenate(key)));
        }
    }
    /**
     * dev only
     */
    function validateProp(name, value, prop, isAbsent) {
        const { type, required, validator } = prop;
        // required!
        if (required && isAbsent) {
            warn('Missing required prop: "' + name + '"');
            return;
        }
        // missing but optional
        if (value == null && !prop.required) {
            return;
        }
        // type check
        if (type != null && type !== true) {
            let isValid = false;
            const types = isArray(type) ? type : [type];
            const expectedTypes = [];
            // value is valid as long as one of the specified types match
            for (let i = 0; i < types.length && !isValid; i++) {
                const { valid, expectedType } = assertType(value, types[i]);
                expectedTypes.push(expectedType || '');
                isValid = valid;
            }
            if (!isValid) {
                warn(getInvalidTypeMessage(name, value, expectedTypes));
                return;
            }
        }
        // custom validator
        if (validator && !validator(value)) {
            warn('Invalid prop: custom validator check failed for prop "' + name + '".');
        }
    }
    const isSimpleType = /*#__PURE__*/ makeMap('String,Number,Boolean,Function,Symbol,BigInt');
    /**
     * dev only
     */
    function assertType(value, type) {
        let valid;
        const expectedType = getType(type);
        if (isSimpleType(expectedType)) {
            const t = typeof value;
            valid = t === expectedType.toLowerCase();
            // for primitive wrapper objects
            if (!valid && t === 'object') {
                valid = value instanceof type;
            }
        }
        else if (expectedType === 'Object') {
            valid = isObject(value);
        }
        else if (expectedType === 'Array') {
            valid = isArray(value);
        }
        else {
            valid = value instanceof type;
        }
        return {
            valid,
            expectedType
        };
    }
    /**
     * dev only
     */
    function getInvalidTypeMessage(name, value, expectedTypes) {
        let message = `Invalid prop: type check failed for prop "${name}".` +
            ` Expected ${expectedTypes.map(capitalize).join(', ')}`;
        const expectedType = expectedTypes[0];
        const receivedType = toRawType(value);
        const expectedValue = styleValue(value, expectedType);
        const receivedValue = styleValue(value, receivedType);
        // check if we need to specify expected value
        if (expectedTypes.length === 1 &&
            isExplicable(expectedType) &&
            !isBoolean(expectedType, receivedType)) {
            message += ` with value ${expectedValue}`;
        }
        message += `, got ${receivedType} `;
        // check if we need to specify received value
        if (isExplicable(receivedType)) {
            message += `with value ${receivedValue}.`;
        }
        return message;
    }
    /**
     * dev only
     */
    function styleValue(value, type) {
        if (type === 'String') {
            return `"${value}"`;
        }
        else if (type === 'Number') {
            return `${Number(value)}`;
        }
        else {
            return `${value}`;
        }
    }
    /**
     * dev only
     */
    function isExplicable(type) {
        const explicitTypes = ['string', 'number', 'boolean'];
        return explicitTypes.some(elem => type.toLowerCase() === elem);
    }
    /**
     * dev only
     */
    function isBoolean(...args) {
        return args.some(elem => elem.toLowerCase() === 'boolean');
    }
  
    function injectHook(type, hook, target = currentInstance, prepend = false) {
        if (target) {
            const hooks = target[type] || (target[type] = []);
            // cache the error handling wrapper for injected hooks so the same hook
            // can be properly deduped by the scheduler. "__weh" stands for "with error
            // handling".
            const wrappedHook = hook.__weh ||
                (hook.__weh = (...args) => {
                    if (target.isUnmounted) {
                        return;
                    }
                    // disable tracking inside all lifecycle hooks
                    // since they can potentially be called inside effects.
                    pauseTracking();
                    // Set currentInstance during hook invocation.
                    // This assumes the hook does not synchronously trigger other hooks, which
                    // can only be false when the user does something really funky.
                    setCurrentInstance(target);
                    const res = callWithAsyncErrorHandling(hook, target, type, args);
                    setCurrentInstance(null);
                    resetTracking();
                    return res;
                });
            if (prepend) {
                hooks.unshift(wrappedHook);
            }
            else {
                hooks.push(wrappedHook);
            }
            return wrappedHook;
        }
        else {
            const apiName = toHandlerKey(ErrorTypeStrings[type].replace(/ hook$/, ''));
            warn(`${apiName} is called when there is no active component instance to be ` +
                `associated with. ` +
                `Lifecycle injection APIs can only be used during execution of setup().` +
                (` If you are using async setup(), make sure to register lifecycle ` +
                        `hooks before the first await statement.`
                    ));
        }
    }
    const createHook = (lifecycle) => (hook, target = currentInstance) => 
    // post-create lifecycle registrations are noops during SSR
    !isInSSRComponentSetup && injectHook(lifecycle, hook, target);
    const onBeforeMount = createHook("bm" /* BEFORE_MOUNT */);
    const onMounted = createHook("m" /* MOUNTED */);
    const onBeforeUpdate = createHook("bu" /* BEFORE_UPDATE */);
    const onUpdated = createHook("u" /* UPDATED */);
    const onBeforeUnmount = createHook("bum" /* BEFORE_UNMOUNT */);
    const onUnmounted = createHook("um" /* UNMOUNTED */);
    const onRenderTriggered = createHook("rtg" /* RENDER_TRIGGERED */);
    const onRenderTracked = createHook("rtc" /* RENDER_TRACKED */);
    const onErrorCaptured = (hook, target = currentInstance) => {
        injectHook("ec" /* ERROR_CAPTURED */, hook, target);
    };
  
    // Simple effect.
    function watchEffect(effect, options) {
        return doWatch(effect, null, options);
    }
    // initial value for watchers to trigger on undefined initial values
    const INITIAL_WATCHER_VALUE = {};
    // implementation
    function watch(source, cb, options) {
        if (!isFunction(cb)) {
            warn(`\`watch(fn, options?)\` signature has been moved to a separate API. ` +
                `Use \`watchEffect(fn, options?)\` instead. \`watch\` now only ` +
                `supports \`watch(source, cb, options?) signature.`);
        }
        return doWatch(source, cb, options);
    }
    function doWatch(source, cb, { immediate, deep, flush, onTrack, onTrigger } = EMPTY_OBJ, instance = currentInstance) {
        if (!cb) {
            if (immediate !== undefined) {
                warn(`watch() "immediate" option is only respected when using the ` +
                    `watch(source, callback, options?) signature.`);
            }
            if (deep !== undefined) {
                warn(`watch() "deep" option is only respected when using the ` +
                    `watch(source, callback, options?) signature.`);
            }
        }
        const warnInvalidSource = (s) => {
            warn(`Invalid watch source: `, s, `A watch source can only be a getter/effect function, a ref, ` +
                `a reactive object, or an array of these types.`);
        };
        let getter;
        let forceTrigger = false;
        if (isRef(source)) {
            getter = () => source.value;
            forceTrigger = !!source._shallow;
        }
        else if (isReactive(source)) {
            getter = () => source;
            deep = true;
        }
        else if (isArray(source)) {
            getter = () => source.map(s => {
                if (isRef(s)) {
                    return s.value;
                }
                else if (isReactive(s)) {
                    return traverse(s);
                }
                else if (isFunction(s)) {
                    return callWithErrorHandling(s, instance, 2 /* WATCH_GETTER */, [
                        instance && instance.proxy
                    ]);
                }
                else {
                    warnInvalidSource(s);
                }
            });
        }
        else if (isFunction(source)) {
            if (cb) {
                // getter with cb
                getter = () => callWithErrorHandling(source, instance, 2 /* WATCH_GETTER */, [
                    instance && instance.proxy
                ]);
            }
            else {
                // no cb -> simple effect
                getter = () => {
                    if (instance && instance.isUnmounted) {
                        return;
                    }
                    if (cleanup) {
                        cleanup();
                    }
                    return callWithAsyncErrorHandling(source, instance, 3 /* WATCH_CALLBACK */, [onInvalidate]);
                };
            }
        }
        else {
            getter = NOOP;
            warnInvalidSource(source);
        }
        if (cb && deep) {
            const baseGetter = getter;
            getter = () => traverse(baseGetter());
        }
        let cleanup;
        let onInvalidate = (fn) => {
            cleanup = runner.options.onStop = () => {
                callWithErrorHandling(fn, instance, 4 /* WATCH_CLEANUP */);
            };
        };
        let oldValue = isArray(source) ? [] : INITIAL_WATCHER_VALUE;
        const job = () => {
            if (!runner.active) {
                return;
            }
            if (cb) {
                // watch(source, cb)
                const newValue = runner();
                if (deep || forceTrigger || hasChanged(newValue, oldValue)) {
                    // cleanup before running cb again
                    if (cleanup) {
                        cleanup();
                    }
                    callWithAsyncErrorHandling(cb, instance, 3 /* WATCH_CALLBACK */, [
                        newValue,
                        // pass undefined as the old value when it's changed for the first time
                        oldValue === INITIAL_WATCHER_VALUE ? undefined : oldValue,
                        onInvalidate
                    ]);
                    oldValue = newValue;
                }
            }
            else {
                // watchEffect
                runner();
            }
        };
        // important: mark the job as a watcher callback so that scheduler knows
        // it is allowed to self-trigger (#1727)
        job.allowRecurse = !!cb;
        let scheduler;
        if (flush === 'sync') {
            scheduler = job;
        }
        else if (flush === 'post') {
            scheduler = () => queuePostRenderEffect(job, instance && instance.suspense);
        }
        else {
            // default: 'pre'
            scheduler = () => {
                if (!instance || instance.isMounted) {
                    queuePreFlushCb(job);
                }
                else {
                    // with 'pre' option, the first call must happen before
                    // the component is mounted so it is called synchronously.
                    job();
                }
            };
        }
        const runner = effect(getter, {
            lazy: true,
            onTrack,
            onTrigger,
            scheduler
        });
        recordInstanceBoundEffect(runner, instance);
        // initial run
        if (cb) {
            if (immediate) {
                job();
            }
            else {
                oldValue = runner();
            }
        }
        else if (flush === 'post') {
            queuePostRenderEffect(runner, instance && instance.suspense);
        }
        else {
            runner();
        }
        return () => {
            stop(runner);
            if (instance) {
                remove(instance.effects, runner);
            }
        };
    }
    // this.$watch
    function instanceWatch(source, cb, options) {
        const publicThis = this.proxy;
        const getter = isString(source)
            ? () => publicThis[source]
            : source.bind(publicThis);
        return doWatch(getter, cb.bind(publicThis), options, this);
    }
    function traverse(value, seen = new Set()) {
        if (!isObject(value) || seen.has(value)) {
            return value;
        }
        seen.add(value);
        if (isRef(value)) {
            traverse(value.value, seen);
        }
        else if (isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                traverse(value[i], seen);
            }
        }
        else if (isSet(value) || isMap(value)) {
            value.forEach((v) => {
                traverse(v, seen);
            });
        }
        else {
            for (const key in value) {
                traverse(value[key], seen);
            }
        }
        return value;
    }
  
    function useTransitionState() {
        const state = {
            isMounted: false,
            isLeaving: false,
            isUnmounting: false,
            leavingVNodes: new Map()
        };
        onMounted(() => {
            state.isMounted = true;
        });
        onBeforeUnmount(() => {
            state.isUnmounting = true;
        });
        return state;
    }
    const TransitionHookValidator = [Function, Array];
    const BaseTransitionImpl = {
        name: `BaseTransition`,
        props: {
            mode: String,
            appear: Boolean,
            persisted: Boolean,
            // enter
            onBeforeEnter: TransitionHookValidator,
            onEnter: TransitionHookValidator,
            onAfterEnter: TransitionHookValidator,
            onEnterCancelled: TransitionHookValidator,
            // leave
            onBeforeLeave: TransitionHookValidator,
            onLeave: TransitionHookValidator,
            onAfterLeave: TransitionHookValidator,
            onLeaveCancelled: TransitionHookValidator,
            // appear
            onBeforeAppear: TransitionHookValidator,
            onAppear: TransitionHookValidator,
            onAfterAppear: TransitionHookValidator,
            onAppearCancelled: TransitionHookValidator
        },
        setup(props, { slots }) {
            const instance = getCurrentInstance();
            const state = useTransitionState();
            let prevTransitionKey;
            return () => {
                const children = slots.default && getTransitionRawChildren(slots.default(), true);
                if (!children || !children.length) {
                    return;
                }
                // warn multiple elements
                if (children.length > 1) {
                    warn('<transition> can only be used on a single element or component. Use ' +
                        '<transition-group> for lists.');
                }
                // there's no need to track reactivity for these props so use the raw
                // props for a bit better perf
                const rawProps = toRaw(props);
                const { mode } = rawProps;
                // check mode
                if (mode && !['in-out', 'out-in', 'default'].includes(mode)) {
                    warn(`invalid <transition> mode: ${mode}`);
                }
                // at this point children has a guaranteed length of 1.
                const child = children[0];
                if (state.isLeaving) {
                    return emptyPlaceholder(child);
                }
                // in the case of <transition><keep-alive/></transition>, we need to
                // compare the type of the kept-alive children.
                const innerChild = getKeepAliveChild(child);
                if (!innerChild) {
                    return emptyPlaceholder(child);
                }
                const enterHooks = resolveTransitionHooks(innerChild, rawProps, state, instance);
                setTransitionHooks(innerChild, enterHooks);
                const oldChild = instance.subTree;
                const oldInnerChild = oldChild && getKeepAliveChild(oldChild);
                let transitionKeyChanged = false;
                const { getTransitionKey } = innerChild.type;
                if (getTransitionKey) {
                    const key = getTransitionKey();
                    if (prevTransitionKey === undefined) {
                        prevTransitionKey = key;
                    }
                    else if (key !== prevTransitionKey) {
                        prevTransitionKey = key;
                        transitionKeyChanged = true;
                    }
                }
                // handle mode
                if (oldInnerChild &&
                    oldInnerChild.type !== Comment &&
                    (!isSameVNodeType(innerChild, oldInnerChild) || transitionKeyChanged)) {
                    const leavingHooks = resolveTransitionHooks(oldInnerChild, rawProps, state, instance);
                    // update old tree's hooks in case of dynamic transition
                    setTransitionHooks(oldInnerChild, leavingHooks);
                    // switching between different views
                    if (mode === 'out-in') {
                        state.isLeaving = true;
                        // return placeholder node and queue update when leave finishes
                        leavingHooks.afterLeave = () => {
                            state.isLeaving = false;
                            instance.update();
                        };
                        return emptyPlaceholder(child);
                    }
                    else if (mode === 'in-out' && innerChild.type !== Comment) {
                        leavingHooks.delayLeave = (el, earlyRemove, delayedLeave) => {
                            const leavingVNodesCache = getLeavingNodesForType(state, oldInnerChild);
                            leavingVNodesCache[String(oldInnerChild.key)] = oldInnerChild;
                            // early removal callback
                            el._leaveCb = () => {
                                earlyRemove();
                                el._leaveCb = undefined;
                                delete enterHooks.delayedLeave;
                            };
                            enterHooks.delayedLeave = delayedLeave;
                        };
                    }
                }
                return child;
            };
        }
    };
    // export the public type for h/tsx inference
    // also to avoid inline import() in generated d.ts files
    const BaseTransition = BaseTransitionImpl;
    function getLeavingNodesForType(state, vnode) {
        const { leavingVNodes } = state;
        let leavingVNodesCache = leavingVNodes.get(vnode.type);
        if (!leavingVNodesCache) {
            leavingVNodesCache = Object.create(null);
            leavingVNodes.set(vnode.type, leavingVNodesCache);
        }
        return leavingVNodesCache;
    }
    // The transition hooks are attached to the vnode as vnode.transition
    // and will be called at appropriate timing in the renderer.
    function resolveTransitionHooks(vnode, props, state, instance) {
        const { appear, mode, persisted = false, onBeforeEnter, onEnter, onAfterEnter, onEnterCancelled, onBeforeLeave, onLeave, onAfterLeave, onLeaveCancelled, onBeforeAppear, onAppear, onAfterAppear, onAppearCancelled } = props;
        const key = String(vnode.key);
        const leavingVNodesCache = getLeavingNodesForType(state, vnode);
        const callHook = (hook, args) => {
            hook &&
                callWithAsyncErrorHandling(hook, instance, 9 /* TRANSITION_HOOK */, args);
        };
        const hooks = {
            mode,
            persisted,
            beforeEnter(el) {
                let hook = onBeforeEnter;
                if (!state.isMounted) {
                    if (appear) {
                        hook = onBeforeAppear || onBeforeEnter;
                    }
                    else {
                        return;
                    }
                }
                // for same element (v-show)
                if (el._leaveCb) {
                    el._leaveCb(true /* cancelled */);
                }
                // for toggled element with same key (v-if)
                const leavingVNode = leavingVNodesCache[key];
                if (leavingVNode &&
                    isSameVNodeType(vnode, leavingVNode) &&
                    leavingVNode.el._leaveCb) {
                    // force early removal (not cancelled)
                    leavingVNode.el._leaveCb();
                }
                callHook(hook, [el]);
            },
            enter(el) {
                let hook = onEnter;
                let afterHook = onAfterEnter;
                let cancelHook = onEnterCancelled;
                if (!state.isMounted) {
                    if (appear) {
                        hook = onAppear || onEnter;
                        afterHook = onAfterAppear || onAfterEnter;
                        cancelHook = onAppearCancelled || onEnterCancelled;
                    }
                    else {
                        return;
                    }
                }
                let called = false;
                const done = (el._enterCb = (cancelled) => {
                    if (called)
                        return;
                    called = true;
                    if (cancelled) {
                        callHook(cancelHook, [el]);
                    }
                    else {
                        callHook(afterHook, [el]);
                    }
                    if (hooks.delayedLeave) {
                        hooks.delayedLeave();
                    }
                    el._enterCb = undefined;
                });
                if (hook) {
                    hook(el, done);
                    if (hook.length <= 1) {
                        done();
                    }
                }
                else {
                    done();
                }
            },
            leave(el, remove) {
                const key = String(vnode.key);
                if (el._enterCb) {
                    el._enterCb(true /* cancelled */);
                }
                if (state.isUnmounting) {
                    return remove();
                }
                callHook(onBeforeLeave, [el]);
                let called = false;
                const done = (el._leaveCb = (cancelled) => {
                    if (called)
                        return;
                    called = true;
                    remove();
                    if (cancelled) {
                        callHook(onLeaveCancelled, [el]);
                    }
                    else {
                        callHook(onAfterLeave, [el]);
                    }
                    el._leaveCb = undefined;
                    if (leavingVNodesCache[key] === vnode) {
                        delete leavingVNodesCache[key];
                    }
                });
                leavingVNodesCache[key] = vnode;
                if (onLeave) {
                    onLeave(el, done);
                    if (onLeave.length <= 1) {
                        done();
                    }
                }
                else {
                    done();
                }
            },
            clone(vnode) {
                return resolveTransitionHooks(vnode, props, state, instance);
            }
        };
        return hooks;
    }
    // the placeholder really only handles one special case: KeepAlive
    // in the case of a KeepAlive in a leave phase we need to return a KeepAlive
    // placeholder with empty content to avoid the KeepAlive instance from being
    // unmounted.
    function emptyPlaceholder(vnode) {
        if (isKeepAlive(vnode)) {
            vnode = cloneVNode(vnode);
            vnode.children = null;
            return vnode;
        }
    }
    function getKeepAliveChild(vnode) {
        return isKeepAlive(vnode)
            ? vnode.children
                ? vnode.children[0]
                : undefined
            : vnode;
    }
    function setTransitionHooks(vnode, hooks) {
        if (vnode.shapeFlag & 6 /* COMPONENT */ && vnode.component) {
            setTransitionHooks(vnode.component.subTree, hooks);
        }
        else if (vnode.shapeFlag & 128 /* SUSPENSE */) {
            vnode.ssContent.transition = hooks.clone(vnode.ssContent);
            vnode.ssFallback.transition = hooks.clone(vnode.ssFallback);
        }
        else {
            vnode.transition = hooks;
        }
    }
    function getTransitionRawChildren(children, keepComment = false) {
        let ret = [];
        let keyedFragmentCount = 0;
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            // handle fragment children case, e.g. v-for
            if (child.type === Fragment) {
                if (child.patchFlag & 128 /* KEYED_FRAGMENT */)
                    keyedFragmentCount++;
                ret = ret.concat(getTransitionRawChildren(child.children, keepComment));
            }
            // comment placeholders should be skipped, e.g. v-if
            else if (keepComment || child.type !== Comment) {
                ret.push(child);
            }
        }
        // #1126 if a transition children list contains multiple sub fragments, these
        // fragments will be merged into a flat children array. Since each v-for
        // fragment may contain different static bindings inside, we need to de-op
        // these children to force full diffs to ensure correct behavior.
        if (keyedFragmentCount > 1) {
            for (let i = 0; i < ret.length; i++) {
                ret[i].patchFlag = -2 /* BAIL */;
            }
        }
        return ret;
    }
  
    const isKeepAlive = (vnode) => vnode.type.__isKeepAlive;
    const KeepAliveImpl = {
        name: `KeepAlive`,
        // Marker for special handling inside the renderer. We are not using a ===
        // check directly on KeepAlive in the renderer, because importing it directly
        // would prevent it from being tree-shaken.
        __isKeepAlive: true,
        props: {
            include: [String, RegExp, Array],
            exclude: [String, RegExp, Array],
            max: [String, Number]
        },
        setup(props, { slots }) {
            const instance = getCurrentInstance();
            // KeepAlive communicates with the instantiated renderer via the
            // ctx where the renderer passes in its internals,
            // and the KeepAlive instance exposes activate/deactivate implementations.
            // The whole point of this is to avoid importing KeepAlive directly in the
            // renderer to facilitate tree-shaking.
            const sharedContext = instance.ctx;
            // if the internal renderer is not registered, it indicates that this is server-side rendering,
            // for KeepAlive, we just need to render its children
            if (!sharedContext.renderer) {
                return slots.default;
            }
            const cache = new Map();
            const keys = new Set();
            let current = null;
            const parentSuspense = instance.suspense;
            const { renderer: { p: patch, m: move, um: _unmount, o: { createElement } } } = sharedContext;
            const storageContainer = createElement('div');
            sharedContext.activate = (vnode, container, anchor, isSVG, optimized) => {
                const instance = vnode.component;
                move(vnode, container, anchor, 0 /* ENTER */, parentSuspense);
                // in case props have changed
                patch(instance.vnode, vnode, container, anchor, instance, parentSuspense, isSVG, vnode.slotScopeIds, optimized);
                queuePostRenderEffect(() => {
                    instance.isDeactivated = false;
                    if (instance.a) {
                        invokeArrayFns(instance.a);
                    }
                    const vnodeHook = vnode.props && vnode.props.onVnodeMounted;
                    if (vnodeHook) {
                        invokeVNodeHook(vnodeHook, instance.parent, vnode);
                    }
                }, parentSuspense);
            };
            sharedContext.deactivate = (vnode) => {
                const instance = vnode.component;
                move(vnode, storageContainer, null, 1 /* LEAVE */, parentSuspense);
                queuePostRenderEffect(() => {
                    if (instance.da) {
                        invokeArrayFns(instance.da);
                    }
                    const vnodeHook = vnode.props && vnode.props.onVnodeUnmounted;
                    if (vnodeHook) {
                        invokeVNodeHook(vnodeHook, instance.parent, vnode);
                    }
                    instance.isDeactivated = true;
                }, parentSuspense);
            };
            function unmount(vnode) {
                // reset the shapeFlag so it can be properly unmounted
                resetShapeFlag(vnode);
                _unmount(vnode, instance, parentSuspense);
            }
            function pruneCache(filter) {
                cache.forEach((vnode, key) => {
                    const name = getComponentName(vnode.type);
                    if (name && (!filter || !filter(name))) {
                        pruneCacheEntry(key);
                    }
                });
            }
            function pruneCacheEntry(key) {
                const cached = cache.get(key);
                if (!current || cached.type !== current.type) {
                    unmount(cached);
                }
                else if (current) {
                    // current active instance should no longer be kept-alive.
                    // we can't unmount it now but it might be later, so reset its flag now.
                    resetShapeFlag(current);
                }
                cache.delete(key);
                keys.delete(key);
            }
            // prune cache on include/exclude prop change
            watch(() => [props.include, props.exclude], ([include, exclude]) => {
                include && pruneCache(name => matches(include, name));
                exclude && pruneCache(name => !matches(exclude, name));
            }, 
            // prune post-render after `current` has been updated
            { flush: 'post', deep: true });
            // cache sub tree after render
            let pendingCacheKey = null;
            const cacheSubtree = () => {
                // fix #1621, the pendingCacheKey could be 0
                if (pendingCacheKey != null) {
                    cache.set(pendingCacheKey, getInnerChild(instance.subTree));
                }
            };
            onMounted(cacheSubtree);
            onUpdated(cacheSubtree);
            onBeforeUnmount(() => {
                cache.forEach(cached => {
                    const { subTree, suspense } = instance;
                    const vnode = getInnerChild(subTree);
                    if (cached.type === vnode.type) {
                        // current instance will be unmounted as part of keep-alive's unmount
                        resetShapeFlag(vnode);
                        // but invoke its deactivated hook here
                        const da = vnode.component.da;
                        da && queuePostRenderEffect(da, suspense);
                        return;
                    }
                    unmount(cached);
                });
            });
            return () => {
                pendingCacheKey = null;
                if (!slots.default) {
                    return null;
                }
                const children = slots.default();
                const rawVNode = children[0];
                if (children.length > 1) {
                    {
                        warn(`KeepAlive should contain exactly one component child.`);
                    }
                    current = null;
                    return children;
                }
                else if (!isVNode(rawVNode) ||
                    (!(rawVNode.shapeFlag & 4 /* STATEFUL_COMPONENT */) &&
                        !(rawVNode.shapeFlag & 128 /* SUSPENSE */))) {
                    current = null;
                    return rawVNode;
                }
                let vnode = getInnerChild(rawVNode);
                const comp = vnode.type;
                const name = getComponentName(comp);
                const { include, exclude, max } = props;
                if ((include && (!name || !matches(include, name))) ||
                    (exclude && name && matches(exclude, name))) {
                    current = vnode;
                    return rawVNode;
                }
                const key = vnode.key == null ? comp : vnode.key;
                const cachedVNode = cache.get(key);
                // clone vnode if it's reused because we are going to mutate it
                if (vnode.el) {
                    vnode = cloneVNode(vnode);
                    if (rawVNode.shapeFlag & 128 /* SUSPENSE */) {
                        rawVNode.ssContent = vnode;
                    }
                }
                // #1513 it's possible for the returned vnode to be cloned due to attr
                // fallthrough or scopeId, so the vnode here may not be the final vnode
                // that is mounted. Instead of caching it directly, we store the pending
                // key and cache `instance.subTree` (the normalized vnode) in
                // beforeMount/beforeUpdate hooks.
                pendingCacheKey = key;
                if (cachedVNode) {
                    // copy over mounted state
                    vnode.el = cachedVNode.el;
                    vnode.component = cachedVNode.component;
                    if (vnode.transition) {
                        // recursively update transition hooks on subTree
                        setTransitionHooks(vnode, vnode.transition);
                    }
                    // avoid vnode being mounted as fresh
                    vnode.shapeFlag |= 512 /* COMPONENT_KEPT_ALIVE */;
                    // make this key the freshest
                    keys.delete(key);
                    keys.add(key);
                }
                else {
                    keys.add(key);
                    // prune oldest entry
                    if (max && keys.size > parseInt(max, 10)) {
                        pruneCacheEntry(keys.values().next().value);
                    }
                }
                // avoid vnode being unmounted
                vnode.shapeFlag |= 256 /* COMPONENT_SHOULD_KEEP_ALIVE */;
                current = vnode;
                return rawVNode;
            };
        }
    };
    // export the public type for h/tsx inference
    // also to avoid inline import() in generated d.ts files
    const KeepAlive = KeepAliveImpl;
    function matches(pattern, name) {
        if (isArray(pattern)) {
            return pattern.some((p) => matches(p, name));
        }
        else if (isString(pattern)) {
            return pattern.split(',').indexOf(name) > -1;
        }
        else if (pattern.test) {
            return pattern.test(name);
        }
        /* istanbul ignore next */
        return false;
    }
    function onActivated(hook, target) {
        registerKeepAliveHook(hook, "a" /* ACTIVATED */, target);
    }
    function onDeactivated(hook, target) {
        registerKeepAliveHook(hook, "da" /* DEACTIVATED */, target);
    }
    function registerKeepAliveHook(hook, type, target = currentInstance) {
        // cache the deactivate branch check wrapper for injected hooks so the same
        // hook can be properly deduped by the scheduler. "__wdc" stands for "with
        // deactivation check".
        const wrappedHook = hook.__wdc ||
            (hook.__wdc = () => {
                // only fire the hook if the target instance is NOT in a deactivated branch.
                let current = target;
                while (current) {
                    if (current.isDeactivated) {
                        return;
                    }
                    current = current.parent;
                }
                hook();
            });
        injectHook(type, wrappedHook, target);
        // In addition to registering it on the target instance, we walk up the parent
        // chain and register it on all ancestor instances that are keep-alive roots.
        // This avoids the need to walk the entire component tree when invoking these
        // hooks, and more importantly, avoids the need to track child components in
        // arrays.
        if (target) {
            let current = target.parent;
            while (current && current.parent) {
                if (isKeepAlive(current.parent.vnode)) {
                    injectToKeepAliveRoot(wrappedHook, type, target, current);
                }
                current = current.parent;
            }
        }
    }
    function injectToKeepAliveRoot(hook, type, target, keepAliveRoot) {
        // injectHook wraps the original for error handling, so make sure to remove
        // the wrapped version.
        const injected = injectHook(type, hook, keepAliveRoot, true /* prepend */);
        onUnmounted(() => {
            remove(keepAliveRoot[type], injected);
        }, target);
    }
    function resetShapeFlag(vnode) {
        let shapeFlag = vnode.shapeFlag;
        if (shapeFlag & 256 /* COMPONENT_SHOULD_KEEP_ALIVE */) {
            shapeFlag -= 256 /* COMPONENT_SHOULD_KEEP_ALIVE */;
        }
        if (shapeFlag & 512 /* COMPONENT_KEPT_ALIVE */) {
            shapeFlag -= 512 /* COMPONENT_KEPT_ALIVE */;
        }
        vnode.shapeFlag = shapeFlag;
    }
    function getInnerChild(vnode) {
        return vnode.shapeFlag & 128 /* SUSPENSE */ ? vnode.ssContent : vnode;
    }
  
    const isInternalKey = (key) => key[0] === '_' || key === '$stable';
    const normalizeSlotValue = (value) => isArray(value)
        ? value.map(normalizeVNode)
        : [normalizeVNode(value)];
    const normalizeSlot = (key, rawSlot, ctx) => withCtx((props) => {
        if (currentInstance) {
            warn(`Slot "${key}" invoked outside of the render function: ` +
                `this will not track dependencies used in the slot. ` +
                `Invoke the slot function inside the render function instead.`);
        }
        return normalizeSlotValue(rawSlot(props));
    }, ctx);
    const normalizeObjectSlots = (rawSlots, slots) => {
        const ctx = rawSlots._ctx;
        for (const key in rawSlots) {
            if (isInternalKey(key))
                continue;
            const value = rawSlots[key];
            if (isFunction(value)) {
                slots[key] = normalizeSlot(key, value, ctx);
            }
            else if (value != null) {
                {
                    warn(`Non-function value encountered for slot "${key}". ` +
                        `Prefer function slots for better performance.`);
                }
                const normalized = normalizeSlotValue(value);
                slots[key] = () => normalized;
            }
        }
    };
    const normalizeVNodeSlots = (instance, children) => {
        if (!isKeepAlive(instance.vnode)) {
            warn(`Non-function value encountered for default slot. ` +
                `Prefer function slots for better performance.`);
        }
        const normalized = normalizeSlotValue(children);
        instance.slots.default = () => normalized;
    };
    const initSlots = (instance, children) => {
        if (instance.vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
            const type = children._;
            if (type) {
                instance.slots = children;
                // make compiler marker non-enumerable
                def(children, '_', type);
            }
            else {
                normalizeObjectSlots(children, (instance.slots = {}));
            }
        }
        else {
            instance.slots = {};
            if (children) {
                normalizeVNodeSlots(instance, children);
            }
        }
        def(instance.slots, InternalObjectKey, 1);
    };
    const updateSlots = (instance, children, optimized) => {
        const { vnode, slots } = instance;
        let needDeletionCheck = true;
        let deletionComparisonTarget = EMPTY_OBJ;
        if (vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
            const type = children._;
            if (type) {
                // compiled slots.
                if (isHmrUpdating) {
                    // Parent was HMR updated so slot content may have changed.
                    // force update slots and mark instance for hmr as well
                    extend(slots, children);
                }
                else if (optimized && type === 1 /* STABLE */) {
                    // compiled AND stable.
                    // no need to update, and skip stale slots removal.
                    needDeletionCheck = false;
                }
                else {
                    // compiled but dynamic (v-if/v-for on slots) - update slots, but skip
                    // normalization.
                    extend(slots, children);
                    // #2893
                    // when rendering the optimized slots by manually written render function,
                    // we need to delete the `slots._` flag if necessary to make subsequent updates reliable,
                    // i.e. let the `renderSlot` create the bailed Fragment
                    if (!optimized && type === 1 /* STABLE */) {
                        delete slots._;
                    }
                }
            }
            else {
                needDeletionCheck = !children.$stable;
                normalizeObjectSlots(children, slots);
            }
            deletionComparisonTarget = children;
        }
        else if (children) {
            // non slot object children (direct value) passed to a component
            normalizeVNodeSlots(instance, children);
            deletionComparisonTarget = { default: 1 };
        }
        // delete stale slots
        if (needDeletionCheck) {
            for (const key in slots) {
                if (!isInternalKey(key) && !(key in deletionComparisonTarget)) {
                    delete slots[key];
                }
            }
        }
    };
  
    /**
    Runtime helper for applying directives to a vnode. Example usage:
  
    const comp = resolveComponent('comp')
    const foo = resolveDirective('foo')
    const bar = resolveDirective('bar')
  
    return withDirectives(h(comp), [
      [foo, this.x],
      [bar, this.y]
    ])
    */
    const isBuiltInDirective = /*#__PURE__*/ makeMap('bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text');
    function validateDirectiveName(name) {
        if (isBuiltInDirective(name)) {
            warn('Do not use built-in directive ids as custom directive id: ' + name);
        }
    }
    /**
     * Adds directives to a VNode.
     */
    function withDirectives(vnode, directives) {
        const internalInstance = currentRenderingInstance;
        if (internalInstance === null) {
            warn(`withDirectives can only be used inside render functions.`);
            return vnode;
        }
        const instance = internalInstance.proxy;
        const bindings = vnode.dirs || (vnode.dirs = []);
        for (let i = 0; i < directives.length; i++) {
            let [dir, value, arg, modifiers = EMPTY_OBJ] = directives[i];
            if (isFunction(dir)) {
                dir = {
                    mounted: dir,
                    updated: dir
                };
            }
            bindings.push({
                dir,
                instance,
                value,
                oldValue: void 0,
                arg,
                modifiers
            });
        }
        return vnode;
    }
    function invokeDirectiveHook(vnode, prevVNode, instance, name) {
        const bindings = vnode.dirs;
        const oldBindings = prevVNode && prevVNode.dirs;
        for (let i = 0; i < bindings.length; i++) {
            const binding = bindings[i];
            if (oldBindings) {
                binding.oldValue = oldBindings[i].value;
            }
            const hook = binding.dir[name];
            if (hook) {
                callWithAsyncErrorHandling(hook, instance, 8 /* DIRECTIVE_HOOK */, [
                    vnode.el,
                    binding,
                    vnode,
                    prevVNode
                ]);
            }
        }
    }
  
    function createAppContext() {
        return {
            app: null,
            config: {
                isNativeTag: NO,
                performance: false,
                globalProperties: {},
                optionMergeStrategies: {},
                isCustomElement: NO,
                errorHandler: undefined,
                warnHandler: undefined
            },
            mixins: [],
            components: {},
            directives: {},
            provides: Object.create(null)
        };
    }
    let uid$1 = 0;
    function createAppAPI(render, hydrate) {
        return function createApp(rootComponent, rootProps = null) {
            if (rootProps != null && !isObject(rootProps)) {
                warn(`root props passed to app.mount() must be an object.`);
                rootProps = null;
            }
            const context = createAppContext();
            const installedPlugins = new Set();
            let isMounted = false;
            const app = (context.app = {
                _uid: uid$1++,
                _component: rootComponent,
                _props: rootProps,
                _container: null,
                _context: context,
                version,
                get config() {
                    return context.config;
                },
                set config(v) {
                    {
                        warn(`app.config cannot be replaced. Modify individual options instead.`);
                    }
                },
                use(plugin, ...options) {
                    if (installedPlugins.has(plugin)) {
                        warn(`Plugin has already been applied to target app.`);
                    }
                    else if (plugin && isFunction(plugin.install)) {
                        installedPlugins.add(plugin);
                        plugin.install(app, ...options);
                    }
                    else if (isFunction(plugin)) {
                        installedPlugins.add(plugin);
                        plugin(app, ...options);
                    }
                    else {
                        warn(`A plugin must either be a function or an object with an "install" ` +
                            `function.`);
                    }
                    return app;
                },
                mixin(mixin) {
                    {
                        if (!context.mixins.includes(mixin)) {
                            context.mixins.push(mixin);
                            // global mixin with props/emits de-optimizes props/emits
                            // normalization caching.
                            if (mixin.props || mixin.emits) {
                                context.deopt = true;
                            }
                        }
                        else {
                            warn('Mixin has already been applied to target app' +
                                (mixin.name ? `: ${mixin.name}` : ''));
                        }
                    }
                    return app;
                },
                component(name, component) {
                    {
                        validateComponentName(name, context.config);
                    }
                    if (!component) {
                        return context.components[name];
                    }
                    if (context.components[name]) {
                        warn(`Component "${name}" has already been registered in target app.`);
                    }
                    context.components[name] = component;
                    return app;
                },
                directive(name, directive) {
                    {
                        validateDirectiveName(name);
                    }
                    if (!directive) {
                        return context.directives[name];
                    }
                    if (context.directives[name]) {
                        warn(`Directive "${name}" has already been registered in target app.`);
                    }
                    context.directives[name] = directive;
                    return app;
                },
                mount(rootContainer, isHydrate, isSVG) {
                    if (!isMounted) {
                        const vnode = createVNode(rootComponent, rootProps);
                        // store app context on the root VNode.
                        // this will be set on the root instance on initial mount.
                        vnode.appContext = context;
                        // HMR root reload
                        {
                            context.reload = () => {
                                render(cloneVNode(vnode), rootContainer, isSVG);
                            };
                        }
                        if (isHydrate && hydrate) {
                            hydrate(vnode, rootContainer);
                        }
                        else {
                            render(vnode, rootContainer, isSVG);
                        }
                        isMounted = true;
                        app._container = rootContainer;
                        rootContainer.__vue_app__ = app;
                        {
                            devtoolsInitApp(app, version);
                        }
                        return vnode.component.proxy;
                    }
                    else {
                        warn(`App has already been mounted.\n` +
                            `If you want to remount the same app, move your app creation logic ` +
                            `into a factory function and create fresh app instances for each ` +
                            `mount - e.g. \`const createMyApp = () => createApp(App)\``);
                    }
                },
                unmount() {
                    if (isMounted) {
                        render(null, app._container);
                        {
                            devtoolsUnmountApp(app);
                        }
                        delete app._container.__vue_app__;
                    }
                    else {
                        warn(`Cannot unmount an app that is not mounted.`);
                    }
                },
                provide(key, value) {
                    if (key in context.provides) {
                        warn(`App already provides property with key "${String(key)}". ` +
                            `It will be overwritten with the new value.`);
                    }
                    // TypeScript doesn't allow symbols as index type
                    // https://github.com/Microsoft/TypeScript/issues/24587
                    context.provides[key] = value;
                    return app;
                }
            });
            return app;
        };
    }
  
    let hasMismatch = false;
    const isSVGContainer = (container) => /svg/.test(container.namespaceURI) && container.tagName !== 'foreignObject';
    const isComment = (node) => node.nodeType === 8 /* COMMENT */;
    // Note: hydration is DOM-specific
    // But we have to place it in core due to tight coupling with core - splitting
    // it out creates a ton of unnecessary complexity.
    // Hydration also depends on some renderer internal logic which needs to be
    // passed in via arguments.
    function createHydrationFunctions(rendererInternals) {
        const { mt: mountComponent, p: patch, o: { patchProp, nextSibling, parentNode, remove, insert, createComment } } = rendererInternals;
        const hydrate = (vnode, container) => {
            if (!container.hasChildNodes()) {
                warn(`Attempting to hydrate existing markup but container is empty. ` +
                    `Performing full mount instead.`);
                patch(null, vnode, container);
                return;
            }
            hasMismatch = false;
            hydrateNode(container.firstChild, vnode, null, null, null);
            flushPostFlushCbs();
            if (hasMismatch && !false) {
                // this error should show up in production
                console.error(`Hydration completed but contains mismatches.`);
            }
        };
        const hydrateNode = (node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized = false) => {
            const isFragmentStart = isComment(node) && node.data === '[';
            const onMismatch = () => handleMismatch(node, vnode, parentComponent, parentSuspense, slotScopeIds, isFragmentStart);
            const { type, ref, shapeFlag } = vnode;
            const domType = node.nodeType;
            vnode.el = node;
            let nextNode = null;
            switch (type) {
                case Text:
                    if (domType !== 3 /* TEXT */) {
                        nextNode = onMismatch();
                    }
                    else {
                        if (node.data !== vnode.children) {
                            hasMismatch = true;
                            warn(`Hydration text mismatch:` +
                                    `\n- Client: ${JSON.stringify(node.data)}` +
                                    `\n- Server: ${JSON.stringify(vnode.children)}`);
                            node.data = vnode.children;
                        }
                        nextNode = nextSibling(node);
                    }
                    break;
                case Comment:
                    if (domType !== 8 /* COMMENT */ || isFragmentStart) {
                        nextNode = onMismatch();
                    }
                    else {
                        nextNode = nextSibling(node);
                    }
                    break;
                case Static:
                    if (domType !== 1 /* ELEMENT */) {
                        nextNode = onMismatch();
                    }
                    else {
                        // determine anchor, adopt content
                        nextNode = node;
                        // if the static vnode has its content stripped during build,
                        // adopt it from the server-rendered HTML.
                        const needToAdoptContent = !vnode.children.length;
                        for (let i = 0; i < vnode.staticCount; i++) {
                            if (needToAdoptContent)
                                vnode.children += nextNode.outerHTML;
                            if (i === vnode.staticCount - 1) {
                                vnode.anchor = nextNode;
                            }
                            nextNode = nextSibling(nextNode);
                        }
                        return nextNode;
                    }
                    break;
                case Fragment:
                    if (!isFragmentStart) {
                        nextNode = onMismatch();
                    }
                    else {
                        nextNode = hydrateFragment(node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized);
                    }
                    break;
                default:
                    if (shapeFlag & 1 /* ELEMENT */) {
                        if (domType !== 1 /* ELEMENT */ ||
                            vnode.type.toLowerCase() !==
                                node.tagName.toLowerCase()) {
                            nextNode = onMismatch();
                        }
                        else {
                            nextNode = hydrateElement(node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized);
                        }
                    }
                    else if (shapeFlag & 6 /* COMPONENT */) {
                        // when setting up the render effect, if the initial vnode already
                        // has .el set, the component will perform hydration instead of mount
                        // on its sub-tree.
                        vnode.slotScopeIds = slotScopeIds;
                        const container = parentNode(node);
                        const hydrateComponent = () => {
                            mountComponent(vnode, container, null, parentComponent, parentSuspense, isSVGContainer(container), optimized);
                        };
                        // async component
                        const loadAsync = vnode.type.__asyncLoader;
                        if (loadAsync) {
                            loadAsync().then(hydrateComponent);
                        }
                        else {
                            hydrateComponent();
                        }
                        // component may be async, so in the case of fragments we cannot rely
                        // on component's rendered output to determine the end of the fragment
                        // instead, we do a lookahead to find the end anchor node.
                        nextNode = isFragmentStart
                            ? locateClosingAsyncAnchor(node)
                            : nextSibling(node);
                    }
                    else if (shapeFlag & 64 /* TELEPORT */) {
                        if (domType !== 8 /* COMMENT */) {
                            nextNode = onMismatch();
                        }
                        else {
                            nextNode = vnode.type.hydrate(node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized, rendererInternals, hydrateChildren);
                        }
                    }
                    else if (shapeFlag & 128 /* SUSPENSE */) {
                        nextNode = vnode.type.hydrate(node, vnode, parentComponent, parentSuspense, isSVGContainer(parentNode(node)), slotScopeIds, optimized, rendererInternals, hydrateNode);
                    }
                    else {
                        warn('Invalid HostVNode type:', type, `(${typeof type})`);
                    }
            }
            if (ref != null) {
                setRef(ref, null, parentSuspense, vnode);
            }
            return nextNode;
        };
        const hydrateElement = (el, vnode, parentComponent, parentSuspense, slotScopeIds, optimized) => {
            optimized = optimized || !!vnode.dynamicChildren;
            const { props, patchFlag, shapeFlag, dirs } = vnode;
            // skip props & children if this is hoisted static nodes
            if (patchFlag !== -1 /* HOISTED */) {
                if (dirs) {
                    invokeDirectiveHook(vnode, null, parentComponent, 'created');
                }
                // props
                if (props) {
                    if (!optimized ||
                        (patchFlag & 16 /* FULL_PROPS */ ||
                            patchFlag & 32 /* HYDRATE_EVENTS */)) {
                        for (const key in props) {
                            if (!isReservedProp(key) && isOn(key)) {
                                patchProp(el, key, null, props[key]);
                            }
                        }
                    }
                    else if (props.onClick) {
                        // Fast path for click listeners (which is most often) to avoid
                        // iterating through props.
                        patchProp(el, 'onClick', null, props.onClick);
                    }
                }
                // vnode / directive hooks
                let vnodeHooks;
                if ((vnodeHooks = props && props.onVnodeBeforeMount)) {
                    invokeVNodeHook(vnodeHooks, parentComponent, vnode);
                }
                if (dirs) {
                    invokeDirectiveHook(vnode, null, parentComponent, 'beforeMount');
                }
                if ((vnodeHooks = props && props.onVnodeMounted) || dirs) {
                    queueEffectWithSuspense(() => {
                        vnodeHooks && invokeVNodeHook(vnodeHooks, parentComponent, vnode);
                        dirs && invokeDirectiveHook(vnode, null, parentComponent, 'mounted');
                    }, parentSuspense);
                }
                // children
                if (shapeFlag & 16 /* ARRAY_CHILDREN */ &&
                    // skip if element has innerHTML / textContent
                    !(props && (props.innerHTML || props.textContent))) {
                    let next = hydrateChildren(el.firstChild, vnode, el, parentComponent, parentSuspense, slotScopeIds, optimized);
                    let hasWarned = false;
                    while (next) {
                        hasMismatch = true;
                        if (!hasWarned) {
                            warn(`Hydration children mismatch in <${vnode.type}>: ` +
                                `server rendered element contains more child nodes than client vdom.`);
                            hasWarned = true;
                        }
                        // The SSRed DOM contains more nodes than it should. Remove them.
                        const cur = next;
                        next = next.nextSibling;
                        remove(cur);
                    }
                }
                else if (shapeFlag & 8 /* TEXT_CHILDREN */) {
                    if (el.textContent !== vnode.children) {
                        hasMismatch = true;
                        warn(`Hydration text content mismatch in <${vnode.type}>:\n` +
                                `- Client: ${el.textContent}\n` +
                                `- Server: ${vnode.children}`);
                        el.textContent = vnode.children;
                    }
                }
            }
            return el.nextSibling;
        };
        const hydrateChildren = (node, parentVNode, container, parentComponent, parentSuspense, slotScopeIds, optimized) => {
            optimized = optimized || !!parentVNode.dynamicChildren;
            const children = parentVNode.children;
            const l = children.length;
            let hasWarned = false;
            for (let i = 0; i < l; i++) {
                const vnode = optimized
                    ? children[i]
                    : (children[i] = normalizeVNode(children[i]));
                if (node) {
                    node = hydrateNode(node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized);
                }
                else if (vnode.type === Text && !vnode.children) {
                    continue;
                }
                else {
                    hasMismatch = true;
                    if (!hasWarned) {
                        warn(`Hydration children mismatch in <${container.tagName.toLowerCase()}>: ` +
                            `server rendered element contains fewer child nodes than client vdom.`);
                        hasWarned = true;
                    }
                    // the SSRed DOM didn't contain enough nodes. Mount the missing ones.
                    patch(null, vnode, container, null, parentComponent, parentSuspense, isSVGContainer(container), slotScopeIds);
                }
            }
            return node;
        };
        const hydrateFragment = (node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized) => {
            const { slotScopeIds: fragmentSlotScopeIds } = vnode;
            if (fragmentSlotScopeIds) {
                slotScopeIds = slotScopeIds
                    ? slotScopeIds.concat(fragmentSlotScopeIds)
                    : fragmentSlotScopeIds;
            }
            const container = parentNode(node);
            const next = hydrateChildren(nextSibling(node), vnode, container, parentComponent, parentSuspense, slotScopeIds, optimized);
            if (next && isComment(next) && next.data === ']') {
                return nextSibling((vnode.anchor = next));
            }
            else {
                // fragment didn't hydrate successfully, since we didn't get a end anchor
                // back. This should have led to node/children mismatch warnings.
                hasMismatch = true;
                // since the anchor is missing, we need to create one and insert it
                insert((vnode.anchor = createComment(`]`)), container, next);
                return next;
            }
        };
        const handleMismatch = (node, vnode, parentComponent, parentSuspense, slotScopeIds, isFragment) => {
            hasMismatch = true;
            warn(`Hydration node mismatch:\n- Client vnode:`, vnode.type, `\n- Server rendered DOM:`, node, node.nodeType === 3 /* TEXT */
                    ? `(text)`
                    : isComment(node) && node.data === '['
                        ? `(start of fragment)`
                        : ``);
            vnode.el = null;
            if (isFragment) {
                // remove excessive fragment nodes
                const end = locateClosingAsyncAnchor(node);
                while (true) {
                    const next = nextSibling(node);
                    if (next && next !== end) {
                        remove(next);
                    }
                    else {
                        break;
                    }
                }
            }
            const next = nextSibling(node);
            const container = parentNode(node);
            remove(node);
            patch(null, vnode, container, next, parentComponent, parentSuspense, isSVGContainer(container), slotScopeIds);
            return next;
        };
        const locateClosingAsyncAnchor = (node) => {
            let match = 0;
            while (node) {
                node = nextSibling(node);
                if (node && isComment(node)) {
                    if (node.data === '[')
                        match++;
                    if (node.data === ']') {
                        if (match === 0) {
                            return nextSibling(node);
                        }
                        else {
                            match--;
                        }
                    }
                }
            }
            return node;
        };
        return [hydrate, hydrateNode];
    }
  
    let supported;
    let perf;
    function startMeasure(instance, type) {
        if (instance.appContext.config.performance && isSupported()) {
            perf.mark(`vue-${type}-${instance.uid}`);
        }
    }
    function endMeasure(instance, type) {
        if (instance.appContext.config.performance && isSupported()) {
            const startTag = `vue-${type}-${instance.uid}`;
            const endTag = startTag + `:end`;
            perf.mark(endTag);
            perf.measure(`<${formatComponentName(instance, instance.type)}> ${type}`, startTag, endTag);
            perf.clearMarks(startTag);
            perf.clearMarks(endTag);
        }
    }
    function isSupported() {
        if (supported !== undefined) {
            return supported;
        }
        /* eslint-disable no-restricted-globals */
        if (typeof window !== 'undefined' && window.performance) {
            supported = true;
            perf = window.performance;
        }
        else {
            supported = false;
        }
        /* eslint-enable no-restricted-globals */
        return supported;
    }
  
    // implementation, close to no-op
    function defineComponent(options) {
        return isFunction(options) ? { setup: options, name: options.name } : options;
    }
  
    const isAsyncWrapper = (i) => !!i.type.__asyncLoader;
    function defineAsyncComponent(source) {
        if (isFunction(source)) {
            source = { loader: source };
        }
        const { loader, loadingComponent, errorComponent, delay = 200, timeout, // undefined = never times out
        suspensible = true, onError: userOnError } = source;
        let pendingRequest = null;
        let resolvedComp;
        let retries = 0;
        const retry = () => {
            retries++;
            pendingRequest = null;
            return load();
        };
        const load = () => {
            let thisRequest;
            return (pendingRequest ||
                (thisRequest = pendingRequest = loader()
                    .catch(err => {
                    err = err instanceof Error ? err : new Error(String(err));
                    if (userOnError) {
                        return new Promise((resolve, reject) => {
                            const userRetry = () => resolve(retry());
                            const userFail = () => reject(err);
                            userOnError(err, userRetry, userFail, retries + 1);
                        });
                    }
                    else {
                        throw err;
                    }
                })
                    .then((comp) => {
                    if (thisRequest !== pendingRequest && pendingRequest) {
                        return pendingRequest;
                    }
                    if (!comp) {
                        warn(`Async component loader resolved to undefined. ` +
                            `If you are using retry(), make sure to return its return value.`);
                    }
                    // interop module default
                    if (comp &&
                        (comp.__esModule || comp[Symbol.toStringTag] === 'Module')) {
                        comp = comp.default;
                    }
                    if (comp && !isObject(comp) && !isFunction(comp)) {
                        throw new Error(`Invalid async component load result: ${comp}`);
                    }
                    resolvedComp = comp;
                    return comp;
                })));
        };
        return defineComponent({
            __asyncLoader: load,
            name: 'AsyncComponentWrapper',
            setup() {
                const instance = currentInstance;
                // already resolved
                if (resolvedComp) {
                    return () => createInnerComp(resolvedComp, instance);
                }
                const onError = (err) => {
                    pendingRequest = null;
                    handleError(err, instance, 13 /* ASYNC_COMPONENT_LOADER */, !errorComponent /* do not throw in dev if user provided error component */);
                };
                // suspense-controlled or SSR.
                if ((suspensible && instance.suspense) ||
                    (false )) {
                    return load()
                        .then(comp => {
                        return () => createInnerComp(comp, instance);
                    })
                        .catch(err => {
                        onError(err);
                        return () => errorComponent
                            ? createVNode(errorComponent, {
                                error: err
                            })
                            : null;
                    });
                }
                const loaded = ref(false);
                const error = ref();
                const delayed = ref(!!delay);
                if (delay) {
                    setTimeout(() => {
                        delayed.value = false;
                    }, delay);
                }
                if (timeout != null) {
                    setTimeout(() => {
                        if (!loaded.value && !error.value) {
                            const err = new Error(`Async component timed out after ${timeout}ms.`);
                            onError(err);
                            error.value = err;
                        }
                    }, timeout);
                }
                load()
                    .then(() => {
                    loaded.value = true;
                })
                    .catch(err => {
                    onError(err);
                    error.value = err;
                });
                return () => {
                    if (loaded.value && resolvedComp) {
                        return createInnerComp(resolvedComp, instance);
                    }
                    else if (error.value && errorComponent) {
                        return createVNode(errorComponent, {
                            error: error.value
                        });
                    }
                    else if (loadingComponent && !delayed.value) {
                        return createVNode(loadingComponent);
                    }
                };
            }
        });
    }
    function createInnerComp(comp, { vnode: { ref, props, children } }) {
        const vnode = createVNode(comp, props, children);
        // ensure inner component inherits the async wrapper's ref owner
        vnode.ref = ref;
        return vnode;
    }
  
    function createDevEffectOptions(instance) {
        return {
            scheduler: queueJob,
            allowRecurse: true,
            onTrack: instance.rtc ? e => invokeArrayFns(instance.rtc, e) : void 0,
            onTrigger: instance.rtg ? e => invokeArrayFns(instance.rtg, e) : void 0
        };
    }
    const queuePostRenderEffect = queueEffectWithSuspense
        ;
    const setRef = (rawRef, oldRawRef, parentSuspense, vnode) => {
        if (isArray(rawRef)) {
            rawRef.forEach((r, i) => setRef(r, oldRawRef && (isArray(oldRawRef) ? oldRawRef[i] : oldRawRef), parentSuspense, vnode));
            return;
        }
        let value;
        if (!vnode) {
            // means unmount
            value = null;
        }
        else if (isAsyncWrapper(vnode)) {
            // when mounting async components, nothing needs to be done,
            // because the template ref is forwarded to inner component
            return;
        }
        else if (vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */) {
            value = vnode.component.exposed || vnode.component.proxy;
        }
        else {
            value = vnode.el;
        }
        const { i: owner, r: ref } = rawRef;
        if (!owner) {
            warn(`Missing ref owner context. ref cannot be used on hoisted vnodes. ` +
                `A vnode with ref must be created inside the render function.`);
            return;
        }
        const oldRef = oldRawRef && oldRawRef.r;
        const refs = owner.refs === EMPTY_OBJ ? (owner.refs = {}) : owner.refs;
        const setupState = owner.setupState;
        // unset old ref
        if (oldRef != null && oldRef !== ref) {
            if (isString(oldRef)) {
                refs[oldRef] = null;
                if (hasOwn(setupState, oldRef)) {
                    setupState[oldRef] = null;
                }
            }
            else if (isRef(oldRef)) {
                oldRef.value = null;
            }
        }
        if (isString(ref)) {
            const doSet = () => {
                refs[ref] = value;
                if (hasOwn(setupState, ref)) {
                    setupState[ref] = value;
                }
            };
            // #1789: for non-null values, set them after render
            // null values means this is unmount and it should not overwrite another
            // ref with the same key
            if (value) {
                doSet.id = -1;
                queuePostRenderEffect(doSet, parentSuspense);
            }
            else {
                doSet();
            }
        }
        else if (isRef(ref)) {
            const doSet = () => {
                ref.value = value;
            };
            if (value) {
                doSet.id = -1;
                queuePostRenderEffect(doSet, parentSuspense);
            }
            else {
                doSet();
            }
        }
        else if (isFunction(ref)) {
            callWithErrorHandling(ref, owner, 12 /* FUNCTION_REF */, [value, refs]);
        }
        else {
            warn('Invalid template ref type:', value, `(${typeof value})`);
        }
    };
    /**
     * The createRenderer function accepts two generic arguments:
     * HostNode and HostElement, corresponding to Node and Element types in the
     * host environment. For example, for runtime-dom, HostNode would be the DOM
     * `Node` interface and HostElement would be the DOM `Element` interface.
     *
     * Custom renderers can pass in the platform specific types like this:
     *
     * ``` js
     * const { render, createApp } = createRenderer<Node, Element>({
     *   patchProp,
     *   ...nodeOps
     * })
     * ```
     */
    function createRenderer(options) {
        return baseCreateRenderer(options);
    }
    // Separate API for creating hydration-enabled renderer.
    // Hydration logic is only used when calling this function, making it
    // tree-shakable.
    function createHydrationRenderer(options) {
        return baseCreateRenderer(options, createHydrationFunctions);
    }
    // implementation
    function baseCreateRenderer(options, createHydrationFns) {
        {
            const target = getGlobalThis();
            target.__VUE__ = true;
            setDevtoolsHook(target.__VUE_DEVTOOLS_GLOBAL_HOOK__);
        }
        const { insert: hostInsert, remove: hostRemove, patchProp: hostPatchProp, forcePatchProp: hostForcePatchProp, createElement: hostCreateElement, createText: hostCreateText, createComment: hostCreateComment, setText: hostSetText, setElementText: hostSetElementText, parentNode: hostParentNode, nextSibling: hostNextSibling, setScopeId: hostSetScopeId = NOOP, cloneNode: hostCloneNode, insertStaticContent: hostInsertStaticContent } = options;
        // Note: functions inside this closure should use `const xxx = () => {}`
        // style in order to prevent being inlined by minifiers.
        const patch = (n1, n2, container, anchor = null, parentComponent = null, parentSuspense = null, isSVG = false, slotScopeIds = null, optimized = false) => {
            // patching & not same type, unmount old tree
            if (n1 && !isSameVNodeType(n1, n2)) {
                anchor = getNextHostNode(n1);
                unmount(n1, parentComponent, parentSuspense, true);
                n1 = null;
            }
            if (n2.patchFlag === -2 /* BAIL */) {
                optimized = false;
                n2.dynamicChildren = null;
            }
            const { type, ref, shapeFlag } = n2;
            switch (type) {
                case Text:
                    processText(n1, n2, container, anchor);
                    break;
                case Comment:
                    processCommentNode(n1, n2, container, anchor);
                    break;
                case Static:
                    if (n1 == null) {
                        mountStaticNode(n2, container, anchor, isSVG);
                    }
                    else {
                        patchStaticNode(n1, n2, container, isSVG);
                    }
                    break;
                case Fragment:
                    processFragment(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                    break;
                default:
                    if (shapeFlag & 1 /* ELEMENT */) {
                        processElement(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                    }
                    else if (shapeFlag & 6 /* COMPONENT */) {
                        processComponent(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                    }
                    else if (shapeFlag & 64 /* TELEPORT */) {
                        type.process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, internals);
                    }
                    else if (shapeFlag & 128 /* SUSPENSE */) {
                        type.process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, internals);
                    }
                    else {
                        warn('Invalid VNode type:', type, `(${typeof type})`);
                    }
            }
            // set ref
            if (ref != null && parentComponent) {
                setRef(ref, n1 && n1.ref, parentSuspense, n2);
            }
        };
        const processText = (n1, n2, container, anchor) => {
            if (n1 == null) {
                hostInsert((n2.el = hostCreateText(n2.children)), container, anchor);
            }
            else {
                const el = (n2.el = n1.el);
                if (n2.children !== n1.children) {
                    hostSetText(el, n2.children);
                }
            }
        };
        const processCommentNode = (n1, n2, container, anchor) => {
            if (n1 == null) {
                hostInsert((n2.el = hostCreateComment(n2.children || '')), container, anchor);
            }
            else {
                // there's no support for dynamic comments
                n2.el = n1.el;
            }
        };
        const mountStaticNode = (n2, container, anchor, isSVG) => {
            [n2.el, n2.anchor] = hostInsertStaticContent(n2.children, container, anchor, isSVG);
        };
        /**
         * Dev / HMR only
         */
        const patchStaticNode = (n1, n2, container, isSVG) => {
            // static nodes are only patched during dev for HMR
            if (n2.children !== n1.children) {
                const anchor = hostNextSibling(n1.anchor);
                // remove existing
                removeStaticNode(n1);
                [n2.el, n2.anchor] = hostInsertStaticContent(n2.children, container, anchor, isSVG);
            }
            else {
                n2.el = n1.el;
                n2.anchor = n1.anchor;
            }
        };
        const moveStaticNode = ({ el, anchor }, container, nextSibling) => {
            let next;
            while (el && el !== anchor) {
                next = hostNextSibling(el);
                hostInsert(el, container, nextSibling);
                el = next;
            }
            hostInsert(anchor, container, nextSibling);
        };
        const removeStaticNode = ({ el, anchor }) => {
            let next;
            while (el && el !== anchor) {
                next = hostNextSibling(el);
                hostRemove(el);
                el = next;
            }
            hostRemove(anchor);
        };
        const processElement = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
            isSVG = isSVG || n2.type === 'svg';
            if (n1 == null) {
                mountElement(n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
            }
            else {
                patchElement(n1, n2, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
            }
        };
        const mountElement = (vnode, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
            let el;
            let vnodeHook;
            const { type, props, shapeFlag, transition, patchFlag, dirs } = vnode;
            {
                el = vnode.el = hostCreateElement(vnode.type, isSVG, props && props.is, props);
                // mount children first, since some props may rely on child content
                // being already rendered, e.g. `<select value>`
                if (shapeFlag & 8 /* TEXT_CHILDREN */) {
                    hostSetElementText(el, vnode.children);
                }
                else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                    mountChildren(vnode.children, el, null, parentComponent, parentSuspense, isSVG && type !== 'foreignObject', slotScopeIds, optimized || !!vnode.dynamicChildren);
                }
                if (dirs) {
                    invokeDirectiveHook(vnode, null, parentComponent, 'created');
                }
                // props
                if (props) {
                    for (const key in props) {
                        if (!isReservedProp(key)) {
                            hostPatchProp(el, key, null, props[key], isSVG, vnode.children, parentComponent, parentSuspense, unmountChildren);
                        }
                    }
                    if ((vnodeHook = props.onVnodeBeforeMount)) {
                        invokeVNodeHook(vnodeHook, parentComponent, vnode);
                    }
                }
                // scopeId
                setScopeId(el, vnode, vnode.scopeId, slotScopeIds, parentComponent);
            }
            {
                Object.defineProperty(el, '__vnode', {
                    value: vnode,
                    enumerable: false
                });
                Object.defineProperty(el, '__vueParentComponent', {
                    value: parentComponent,
                    enumerable: false
                });
            }
            if (dirs) {
                invokeDirectiveHook(vnode, null, parentComponent, 'beforeMount');
            }
            // #1583 For inside suspense + suspense not resolved case, enter hook should call when suspense resolved
            // #1689 For inside suspense + suspense resolved case, just call it
            const needCallTransitionHooks = (!parentSuspense || (parentSuspense && !parentSuspense.pendingBranch)) &&
                transition &&
                !transition.persisted;
            if (needCallTransitionHooks) {
                transition.beforeEnter(el);
            }
            hostInsert(el, container, anchor);
            if ((vnodeHook = props && props.onVnodeMounted) ||
                needCallTransitionHooks ||
                dirs) {
                queuePostRenderEffect(() => {
                    vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode);
                    needCallTransitionHooks && transition.enter(el);
                    dirs && invokeDirectiveHook(vnode, null, parentComponent, 'mounted');
                }, parentSuspense);
            }
        };
        const setScopeId = (el, vnode, scopeId, slotScopeIds, parentComponent) => {
            if (scopeId) {
                hostSetScopeId(el, scopeId);
            }
            if (slotScopeIds) {
                for (let i = 0; i < slotScopeIds.length; i++) {
                    hostSetScopeId(el, slotScopeIds[i]);
                }
            }
            if (parentComponent) {
                let subTree = parentComponent.subTree;
                if (subTree.patchFlag > 0 &&
                    subTree.patchFlag & 2048 /* DEV_ROOT_FRAGMENT */) {
                    subTree =
                        filterSingleRoot(subTree.children) || subTree;
                }
                if (vnode === subTree) {
                    const parentVNode = parentComponent.vnode;
                    setScopeId(el, parentVNode, parentVNode.scopeId, parentVNode.slotScopeIds, parentComponent.parent);
                }
            }
        };
        const mountChildren = (children, container, anchor, parentComponent, parentSuspense, isSVG, optimized, slotScopeIds, start = 0) => {
            for (let i = start; i < children.length; i++) {
                const child = (children[i] = optimized
                    ? cloneIfMounted(children[i])
                    : normalizeVNode(children[i]));
                patch(null, child, container, anchor, parentComponent, parentSuspense, isSVG, optimized, slotScopeIds);
            }
        };
        const patchElement = (n1, n2, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
            const el = (n2.el = n1.el);
            let { patchFlag, dynamicChildren, dirs } = n2;
            // #1426 take the old vnode's patch flag into account since user may clone a
            // compiler-generated vnode, which de-opts to FULL_PROPS
            patchFlag |= n1.patchFlag & 16 /* FULL_PROPS */;
            const oldProps = n1.props || EMPTY_OBJ;
            const newProps = n2.props || EMPTY_OBJ;
            let vnodeHook;
            if ((vnodeHook = newProps.onVnodeBeforeUpdate)) {
                invokeVNodeHook(vnodeHook, parentComponent, n2, n1);
            }
            if (dirs) {
                invokeDirectiveHook(n2, n1, parentComponent, 'beforeUpdate');
            }
            if (isHmrUpdating) {
                // HMR updated, force full diff
                patchFlag = 0;
                optimized = false;
                dynamicChildren = null;
            }
            if (patchFlag > 0) {
                // the presence of a patchFlag means this element's render code was
                // generated by the compiler and can take the fast path.
                // in this path old node and new node are guaranteed to have the same shape
                // (i.e. at the exact same position in the source template)
                if (patchFlag & 16 /* FULL_PROPS */) {
                    // element props contain dynamic keys, full diff needed
                    patchProps(el, n2, oldProps, newProps, parentComponent, parentSuspense, isSVG);
                }
                else {
                    // class
                    // this flag is matched when the element has dynamic class bindings.
                    if (patchFlag & 2 /* CLASS */) {
                        if (oldProps.class !== newProps.class) {
                            hostPatchProp(el, 'class', null, newProps.class, isSVG);
                        }
                    }
                    // style
                    // this flag is matched when the element has dynamic style bindings
                    if (patchFlag & 4 /* STYLE */) {
                        hostPatchProp(el, 'style', oldProps.style, newProps.style, isSVG);
                    }
                    // props
                    // This flag is matched when the element has dynamic prop/attr bindings
                    // other than class and style. The keys of dynamic prop/attrs are saved for
                    // faster iteration.
                    // Note dynamic keys like :[foo]="bar" will cause this optimization to
                    // bail out and go through a full diff because we need to unset the old key
                    if (patchFlag & 8 /* PROPS */) {
                        // if the flag is present then dynamicProps must be non-null
                        const propsToUpdate = n2.dynamicProps;
                        for (let i = 0; i < propsToUpdate.length; i++) {
                            const key = propsToUpdate[i];
                            const prev = oldProps[key];
                            const next = newProps[key];
                            if (next !== prev ||
                                (hostForcePatchProp && hostForcePatchProp(el, key))) {
                                hostPatchProp(el, key, prev, next, isSVG, n1.children, parentComponent, parentSuspense, unmountChildren);
                            }
                        }
                    }
                }
                // text
                // This flag is matched when the element has only dynamic text children.
                if (patchFlag & 1 /* TEXT */) {
                    if (n1.children !== n2.children) {
                        hostSetElementText(el, n2.children);
                    }
                }
            }
            else if (!optimized && dynamicChildren == null) {
                // unoptimized, full diff
                patchProps(el, n2, oldProps, newProps, parentComponent, parentSuspense, isSVG);
            }
            const areChildrenSVG = isSVG && n2.type !== 'foreignObject';
            if (dynamicChildren) {
                patchBlockChildren(n1.dynamicChildren, dynamicChildren, el, parentComponent, parentSuspense, areChildrenSVG, slotScopeIds);
                if (parentComponent && parentComponent.type.__hmrId) {
                    traverseStaticChildren(n1, n2);
                }
            }
            else if (!optimized) {
                // full diff
                patchChildren(n1, n2, el, null, parentComponent, parentSuspense, areChildrenSVG, slotScopeIds, false);
            }
            if ((vnodeHook = newProps.onVnodeUpdated) || dirs) {
                queuePostRenderEffect(() => {
                    vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, n2, n1);
                    dirs && invokeDirectiveHook(n2, n1, parentComponent, 'updated');
                }, parentSuspense);
            }
        };
        // The fast path for blocks.
        const patchBlockChildren = (oldChildren, newChildren, fallbackContainer, parentComponent, parentSuspense, isSVG, slotScopeIds) => {
            for (let i = 0; i < newChildren.length; i++) {
                const oldVNode = oldChildren[i];
                const newVNode = newChildren[i];
                // Determine the container (parent element) for the patch.
                const container = 
                // - In the case of a Fragment, we need to provide the actual parent
                // of the Fragment itself so it can move its children.
                oldVNode.type === Fragment ||
                    // - In the case of different nodes, there is going to be a replacement
                    // which also requires the correct parent container
                    !isSameVNodeType(oldVNode, newVNode) ||
                    // - In the case of a component, it could contain anything.
                    oldVNode.shapeFlag & 6 /* COMPONENT */ ||
                    oldVNode.shapeFlag & 64 /* TELEPORT */
                    ? hostParentNode(oldVNode.el)
                    : // In other cases, the parent container is not actually used so we
                        // just pass the block element here to avoid a DOM parentNode call.
                        fallbackContainer;
                patch(oldVNode, newVNode, container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, true);
            }
        };
        const patchProps = (el, vnode, oldProps, newProps, parentComponent, parentSuspense, isSVG) => {
            if (oldProps !== newProps) {
                for (const key in newProps) {
                    // empty string is not valid prop
                    if (isReservedProp(key))
                        continue;
                    const next = newProps[key];
                    const prev = oldProps[key];
                    if (next !== prev ||
                        (hostForcePatchProp && hostForcePatchProp(el, key))) {
                        hostPatchProp(el, key, prev, next, isSVG, vnode.children, parentComponent, parentSuspense, unmountChildren);
                    }
                }
                if (oldProps !== EMPTY_OBJ) {
                    for (const key in oldProps) {
                        if (!isReservedProp(key) && !(key in newProps)) {
                            hostPatchProp(el, key, oldProps[key], null, isSVG, vnode.children, parentComponent, parentSuspense, unmountChildren);
                        }
                    }
                }
            }
        };
        const processFragment = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
            const fragmentStartAnchor = (n2.el = n1 ? n1.el : hostCreateText(''));
            const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : hostCreateText(''));
            let { patchFlag, dynamicChildren, slotScopeIds: fragmentSlotScopeIds } = n2;
            if (patchFlag > 0) {
                optimized = true;
            }
            // check if this is a slot fragment with :slotted scope ids
            if (fragmentSlotScopeIds) {
                slotScopeIds = slotScopeIds
                    ? slotScopeIds.concat(fragmentSlotScopeIds)
                    : fragmentSlotScopeIds;
            }
            if (isHmrUpdating) {
                // HMR updated, force full diff
                patchFlag = 0;
                optimized = false;
                dynamicChildren = null;
            }
            if (n1 == null) {
                hostInsert(fragmentStartAnchor, container, anchor);
                hostInsert(fragmentEndAnchor, container, anchor);
                // a fragment can only have array children
                // since they are either generated by the compiler, or implicitly created
                // from arrays.
                mountChildren(n2.children, container, fragmentEndAnchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
            }
            else {
                if (patchFlag > 0 &&
                    patchFlag & 64 /* STABLE_FRAGMENT */ &&
                    dynamicChildren &&
                    // #2715 the previous fragment could've been a BAILed one as a result
                    // of renderSlot() with no valid children
                    n1.dynamicChildren) {
                    // a stable fragment (template root or <template v-for>) doesn't need to
                    // patch children order, but it may contain dynamicChildren.
                    patchBlockChildren(n1.dynamicChildren, dynamicChildren, container, parentComponent, parentSuspense, isSVG, slotScopeIds);
                    if (parentComponent && parentComponent.type.__hmrId) {
                        traverseStaticChildren(n1, n2);
                    }
                    else if (
                    // #2080 if the stable fragment has a key, it's a <template v-for> that may
                    //  get moved around. Make sure all root level vnodes inherit el.
                    // #2134 or if it's a component root, it may also get moved around
                    // as the component is being moved.
                    n2.key != null ||
                        (parentComponent && n2 === parentComponent.subTree)) {
                        traverseStaticChildren(n1, n2, true /* shallow */);
                    }
                }
                else {
                    // keyed / unkeyed, or manual fragments.
                    // for keyed & unkeyed, since they are compiler generated from v-for,
                    // each child is guaranteed to be a block so the fragment will never
                    // have dynamicChildren.
                    patchChildren(n1, n2, container, fragmentEndAnchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                }
            }
        };
        const processComponent = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
            n2.slotScopeIds = slotScopeIds;
            if (n1 == null) {
                if (n2.shapeFlag & 512 /* COMPONENT_KEPT_ALIVE */) {
                    parentComponent.ctx.activate(n2, container, anchor, isSVG, optimized);
                }
                else {
                    mountComponent(n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
                }
            }
            else {
                updateComponent(n1, n2, optimized);
            }
        };
        const mountComponent = (initialVNode, container, anchor, parentComponent, parentSuspense, isSVG, optimized) => {
            const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent, parentSuspense));
            if (instance.type.__hmrId) {
                registerHMR(instance);
            }
            {
                pushWarningContext(initialVNode);
                startMeasure(instance, `mount`);
            }
            // inject renderer internals for keepAlive
            if (isKeepAlive(initialVNode)) {
                instance.ctx.renderer = internals;
            }
            // resolve props and slots for setup context
            {
                startMeasure(instance, `init`);
            }
            setupComponent(instance);
            {
                endMeasure(instance, `init`);
            }
            // setup() is async. This component relies on async logic to be resolved
            // before proceeding
            if (instance.asyncDep) {
                parentSuspense && parentSuspense.registerDep(instance, setupRenderEffect);
                // Give it a placeholder if this is not hydration
                // TODO handle self-defined fallback
                if (!initialVNode.el) {
                    const placeholder = (instance.subTree = createVNode(Comment));
                    processCommentNode(null, placeholder, container, anchor);
                }
                return;
            }
            setupRenderEffect(instance, initialVNode, container, anchor, parentSuspense, isSVG, optimized);
            {
                popWarningContext();
                endMeasure(instance, `mount`);
            }
        };
        const updateComponent = (n1, n2, optimized) => {
            const instance = (n2.component = n1.component);
            if (shouldUpdateComponent(n1, n2, optimized)) {
                if (instance.asyncDep &&
                    !instance.asyncResolved) {
                    // async & still pending - just update props and slots
                    // since the component's reactive effect for render isn't set-up yet
                    {
                        pushWarningContext(n2);
                    }
                    updateComponentPreRender(instance, n2, optimized);
                    {
                        popWarningContext();
                    }
                    return;
                }
                else {
                    // normal update
                    instance.next = n2;
                    // in case the child component is also queued, remove it to avoid
                    // double updating the same child component in the same flush.
                    invalidateJob(instance.update);
                    // instance.update is the reactive effect runner.
                    instance.update();
                }
            }
            else {
                // no update needed. just copy over properties
                n2.component = n1.component;
                n2.el = n1.el;
                instance.vnode = n2;
            }
        };
        const setupRenderEffect = (instance, initialVNode, container, anchor, parentSuspense, isSVG, optimized) => {
            // create reactive effect for rendering
            instance.update = effect(function componentEffect() {
                if (!instance.isMounted) {
                    let vnodeHook;
                    const { el, props } = initialVNode;
                    const { bm, m, parent } = instance;
                    // beforeMount hook
                    if (bm) {
                        invokeArrayFns(bm);
                    }
                    // onVnodeBeforeMount
                    if ((vnodeHook = props && props.onVnodeBeforeMount)) {
                        invokeVNodeHook(vnodeHook, parent, initialVNode);
                    }
                    // render
                    {
                        startMeasure(instance, `render`);
                    }
                    const subTree = (instance.subTree = renderComponentRoot(instance));
                    {
                        endMeasure(instance, `render`);
                    }
                    if (el && hydrateNode) {
                        {
                            startMeasure(instance, `hydrate`);
                        }
                        // vnode has adopted host node - perform hydration instead of mount.
                        hydrateNode(initialVNode.el, subTree, instance, parentSuspense, null);
                        {
                            endMeasure(instance, `hydrate`);
                        }
                    }
                    else {
                        {
                            startMeasure(instance, `patch`);
                        }
                        patch(null, subTree, container, anchor, instance, parentSuspense, isSVG);
                        {
                            endMeasure(instance, `patch`);
                        }
                        initialVNode.el = subTree.el;
                    }
                    // mounted hook
                    if (m) {
                        queuePostRenderEffect(m, parentSuspense);
                    }
                    // onVnodeMounted
                    if ((vnodeHook = props && props.onVnodeMounted)) {
                        const scopedInitialVNode = initialVNode;
                        queuePostRenderEffect(() => {
                            invokeVNodeHook(vnodeHook, parent, scopedInitialVNode);
                        }, parentSuspense);
                    }
                    // activated hook for keep-alive roots.
                    // #1742 activated hook must be accessed after first render
                    // since the hook may be injected by a child keep-alive
                    const { a } = instance;
                    if (a &&
                        initialVNode.shapeFlag & 256 /* COMPONENT_SHOULD_KEEP_ALIVE */) {
                        queuePostRenderEffect(a, parentSuspense);
                    }
                    instance.isMounted = true;
                    {
                        devtoolsComponentAdded(instance);
                    }
                    // #2458: deference mount-only object parameters to prevent memleaks
                    initialVNode = container = anchor = null;
                }
                else {
                    // updateComponent
                    // This is triggered by mutation of component's own state (next: null)
                    // OR parent calling processComponent (next: VNode)
                    let { next, bu, u, parent, vnode } = instance;
                    let originNext = next;
                    let vnodeHook;
                    {
                        pushWarningContext(next || instance.vnode);
                    }
                    if (next) {
                        next.el = vnode.el;
                        updateComponentPreRender(instance, next, optimized);
                    }
                    else {
                        next = vnode;
                    }
                    // beforeUpdate hook
                    if (bu) {
                        invokeArrayFns(bu);
                    }
                    // onVnodeBeforeUpdate
                    if ((vnodeHook = next.props && next.props.onVnodeBeforeUpdate)) {
                        invokeVNodeHook(vnodeHook, parent, next, vnode);
                    }
                    // render
                    {
                        startMeasure(instance, `render`);
                    }
                    const nextTree = renderComponentRoot(instance);
                    {
                        endMeasure(instance, `render`);
                    }
                    const prevTree = instance.subTree;
                    instance.subTree = nextTree;
                    {
                        startMeasure(instance, `patch`);
                    }
                    patch(prevTree, nextTree, 
                    // parent may have changed if it's in a teleport
                    hostParentNode(prevTree.el), 
                    // anchor may have changed if it's in a fragment
                    getNextHostNode(prevTree), instance, parentSuspense, isSVG);
                    {
                        endMeasure(instance, `patch`);
                    }
                    next.el = nextTree.el;
                    if (originNext === null) {
                        // self-triggered update. In case of HOC, update parent component
                        // vnode el. HOC is indicated by parent instance's subTree pointing
                        // to child component's vnode
                        updateHOCHostEl(instance, nextTree.el);
                    }
                    // updated hook
                    if (u) {
                        queuePostRenderEffect(u, parentSuspense);
                    }
                    // onVnodeUpdated
                    if ((vnodeHook = next.props && next.props.onVnodeUpdated)) {
                        queuePostRenderEffect(() => {
                            invokeVNodeHook(vnodeHook, parent, next, vnode);
                        }, parentSuspense);
                    }
                    {
                        devtoolsComponentUpdated(instance);
                    }
                    {
                        popWarningContext();
                    }
                }
            }, createDevEffectOptions(instance) );
        };
        const updateComponentPreRender = (instance, nextVNode, optimized) => {
            nextVNode.component = instance;
            const prevProps = instance.vnode.props;
            instance.vnode = nextVNode;
            instance.next = null;
            updateProps(instance, nextVNode.props, prevProps, optimized);
            updateSlots(instance, nextVNode.children, optimized);
            pauseTracking();
            // props update may have triggered pre-flush watchers.
            // flush them before the render update.
            flushPreFlushCbs(undefined, instance.update);
            resetTracking();
        };
        const patchChildren = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized = false) => {
            const c1 = n1 && n1.children;
            const prevShapeFlag = n1 ? n1.shapeFlag : 0;
            const c2 = n2.children;
            const { patchFlag, shapeFlag } = n2;
            // fast path
            if (patchFlag > 0) {
                if (patchFlag & 128 /* KEYED_FRAGMENT */) {
                    // this could be either fully-keyed or mixed (some keyed some not)
                    // presence of patchFlag means children are guaranteed to be arrays
                    patchKeyedChildren(c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                    return;
                }
                else if (patchFlag & 256 /* UNKEYED_FRAGMENT */) {
                    // unkeyed
                    patchUnkeyedChildren(c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                    return;
                }
            }
            // children has 3 possibilities: text, array or no children.
            if (shapeFlag & 8 /* TEXT_CHILDREN */) {
                // text children fast path
                if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
                    unmountChildren(c1, parentComponent, parentSuspense);
                }
                if (c2 !== c1) {
                    hostSetElementText(container, c2);
                }
            }
            else {
                if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
                    // prev children was array
                    if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                        // two arrays, cannot assume anything, do full diff
                        patchKeyedChildren(c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                    }
                    else {
                        // no new children, just unmount old
                        unmountChildren(c1, parentComponent, parentSuspense, true);
                    }
                }
                else {
                    // prev children was text OR null
                    // new children is array OR null
                    if (prevShapeFlag & 8 /* TEXT_CHILDREN */) {
                        hostSetElementText(container, '');
                    }
                    // mount new if array
                    if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                        mountChildren(c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                    }
                }
            }
        };
        const patchUnkeyedChildren = (c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
            c1 = c1 || EMPTY_ARR;
            c2 = c2 || EMPTY_ARR;
            const oldLength = c1.length;
            const newLength = c2.length;
            const commonLength = Math.min(oldLength, newLength);
            let i;
            for (i = 0; i < commonLength; i++) {
                const nextChild = (c2[i] = optimized
                    ? cloneIfMounted(c2[i])
                    : normalizeVNode(c2[i]));
                patch(c1[i], nextChild, container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
            }
            if (oldLength > newLength) {
                // remove old
                unmountChildren(c1, parentComponent, parentSuspense, true, false, commonLength);
            }
            else {
                // mount new
                mountChildren(c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, commonLength);
            }
        };
        // can be all-keyed or mixed
        const patchKeyedChildren = (c1, c2, container, parentAnchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
            let i = 0;
            const l2 = c2.length;
            let e1 = c1.length - 1; // prev ending index
            let e2 = l2 - 1; // next ending index
            // 1. sync from start
            // (a b) c
            // (a b) d e
            while (i <= e1 && i <= e2) {
                const n1 = c1[i];
                const n2 = (c2[i] = optimized
                    ? cloneIfMounted(c2[i])
                    : normalizeVNode(c2[i]));
                if (isSameVNodeType(n1, n2)) {
                    patch(n1, n2, container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                }
                else {
                    break;
                }
                i++;
            }
            // 2. sync from end
            // a (b c)
            // d e (b c)
            while (i <= e1 && i <= e2) {
                const n1 = c1[e1];
                const n2 = (c2[e2] = optimized
                    ? cloneIfMounted(c2[e2])
                    : normalizeVNode(c2[e2]));
                if (isSameVNodeType(n1, n2)) {
                    patch(n1, n2, container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                }
                else {
                    break;
                }
                e1--;
                e2--;
            }
            // 3. common sequence + mount
            // (a b)
            // (a b) c
            // i = 2, e1 = 1, e2 = 2
            // (a b)
            // c (a b)
            // i = 0, e1 = -1, e2 = 0
            if (i > e1) {
                if (i <= e2) {
                    const nextPos = e2 + 1;
                    const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor;
                    while (i <= e2) {
                        patch(null, (c2[i] = optimized
                            ? cloneIfMounted(c2[i])
                            : normalizeVNode(c2[i])), container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                        i++;
                    }
                }
            }
            // 4. common sequence + unmount
            // (a b) c
            // (a b)
            // i = 2, e1 = 2, e2 = 1
            // a (b c)
            // (b c)
            // i = 0, e1 = 0, e2 = -1
            else if (i > e2) {
                while (i <= e1) {
                    unmount(c1[i], parentComponent, parentSuspense, true);
                    i++;
                }
            }
            // 5. unknown sequence
            // [i ... e1 + 1]: a b [c d e] f g
            // [i ... e2 + 1]: a b [e d c h] f g
            // i = 2, e1 = 4, e2 = 5
            else {
                const s1 = i; // prev starting index
                const s2 = i; // next starting index
                // 5.1 build key:index map for newChildren
                const keyToNewIndexMap = new Map();
                for (i = s2; i <= e2; i++) {
                    const nextChild = (c2[i] = optimized
                        ? cloneIfMounted(c2[i])
                        : normalizeVNode(c2[i]));
                    if (nextChild.key != null) {
                        if (keyToNewIndexMap.has(nextChild.key)) {
                            warn(`Duplicate keys found during update:`, JSON.stringify(nextChild.key), `Make sure keys are unique.`);
                        }
                        keyToNewIndexMap.set(nextChild.key, i);
                    }
                }
                // 5.2 loop through old children left to be patched and try to patch
                // matching nodes & remove nodes that are no longer present
                let j;
                let patched = 0;
                const toBePatched = e2 - s2 + 1;
                let moved = false;
                // used to track whether any node has moved
                let maxNewIndexSoFar = 0;
                // works as Map<newIndex, oldIndex>
                // Note that oldIndex is offset by +1
                // and oldIndex = 0 is a special value indicating the new node has
                // no corresponding old node.
                // used for determining longest stable subsequence
                const newIndexToOldIndexMap = new Array(toBePatched);
                for (i = 0; i < toBePatched; i++)
                    newIndexToOldIndexMap[i] = 0;
                for (i = s1; i <= e1; i++) {
                    const prevChild = c1[i];
                    if (patched >= toBePatched) {
                        // all new children have been patched so this can only be a removal
                        unmount(prevChild, parentComponent, parentSuspense, true);
                        continue;
                    }
                    let newIndex;
                    if (prevChild.key != null) {
                        newIndex = keyToNewIndexMap.get(prevChild.key);
                    }
                    else {
                        // key-less node, try to locate a key-less node of the same type
                        for (j = s2; j <= e2; j++) {
                            if (newIndexToOldIndexMap[j - s2] === 0 &&
                                isSameVNodeType(prevChild, c2[j])) {
                                newIndex = j;
                                break;
                            }
                        }
                    }
                    if (newIndex === undefined) {
                        unmount(prevChild, parentComponent, parentSuspense, true);
                    }
                    else {
                        newIndexToOldIndexMap[newIndex - s2] = i + 1;
                        if (newIndex >= maxNewIndexSoFar) {
                            maxNewIndexSoFar = newIndex;
                        }
                        else {
                            moved = true;
                        }
                        patch(prevChild, c2[newIndex], container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                        patched++;
                    }
                }
                // 5.3 move and mount
                // generate longest stable subsequence only when nodes have moved
                const increasingNewIndexSequence = moved
                    ? getSequence(newIndexToOldIndexMap)
                    : EMPTY_ARR;
                j = increasingNewIndexSequence.length - 1;
                // looping backwards so that we can use last patched node as anchor
                for (i = toBePatched - 1; i >= 0; i--) {
                    const nextIndex = s2 + i;
                    const nextChild = c2[nextIndex];
                    const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor;
                    if (newIndexToOldIndexMap[i] === 0) {
                        // mount new
                        patch(null, nextChild, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
                    }
                    else if (moved) {
                        // move if:
                        // There is no stable subsequence (e.g. a reverse)
                        // OR current node is not among the stable sequence
                        if (j < 0 || i !== increasingNewIndexSequence[j]) {
                            move(nextChild, container, anchor, 2 /* REORDER */);
                        }
                        else {
                            j--;
                        }
                    }
                }
            }
        };
        const move = (vnode, container, anchor, moveType, parentSuspense = null) => {
            const { el, type, transition, children, shapeFlag } = vnode;
            if (shapeFlag & 6 /* COMPONENT */) {
                move(vnode.component.subTree, container, anchor, moveType);
                return;
            }
            if (shapeFlag & 128 /* SUSPENSE */) {
                vnode.suspense.move(container, anchor, moveType);
                return;
            }
            if (shapeFlag & 64 /* TELEPORT */) {
                type.move(vnode, container, anchor, internals);
                return;
            }
            if (type === Fragment) {
                hostInsert(el, container, anchor);
                for (let i = 0; i < children.length; i++) {
                    move(children[i], container, anchor, moveType);
                }
                hostInsert(vnode.anchor, container, anchor);
                return;
            }
            if (type === Static) {
                moveStaticNode(vnode, container, anchor);
                return;
            }
            // single nodes
            const needTransition = moveType !== 2 /* REORDER */ &&
                shapeFlag & 1 /* ELEMENT */ &&
                transition;
            if (needTransition) {
                if (moveType === 0 /* ENTER */) {
                    transition.beforeEnter(el);
                    hostInsert(el, container, anchor);
                    queuePostRenderEffect(() => transition.enter(el), parentSuspense);
                }
                else {
                    const { leave, delayLeave, afterLeave } = transition;
                    const remove = () => hostInsert(el, container, anchor);
                    const performLeave = () => {
                        leave(el, () => {
                            remove();
                            afterLeave && afterLeave();
                        });
                    };
                    if (delayLeave) {
                        delayLeave(el, remove, performLeave);
                    }
                    else {
                        performLeave();
                    }
                }
            }
            else {
                hostInsert(el, container, anchor);
            }
        };
        const unmount = (vnode, parentComponent, parentSuspense, doRemove = false, optimized = false) => {
            const { type, props, ref, children, dynamicChildren, shapeFlag, patchFlag, dirs } = vnode;
            // unset ref
            if (ref != null) {
                setRef(ref, null, parentSuspense, null);
            }
            if (shapeFlag & 256 /* COMPONENT_SHOULD_KEEP_ALIVE */) {
                parentComponent.ctx.deactivate(vnode);
                return;
            }
            const shouldInvokeDirs = shapeFlag & 1 /* ELEMENT */ && dirs;
            let vnodeHook;
            if ((vnodeHook = props && props.onVnodeBeforeUnmount)) {
                invokeVNodeHook(vnodeHook, parentComponent, vnode);
            }
            if (shapeFlag & 6 /* COMPONENT */) {
                unmountComponent(vnode.component, parentSuspense, doRemove);
            }
            else {
                if (shapeFlag & 128 /* SUSPENSE */) {
                    vnode.suspense.unmount(parentSuspense, doRemove);
                    return;
                }
                if (shouldInvokeDirs) {
                    invokeDirectiveHook(vnode, null, parentComponent, 'beforeUnmount');
                }
                if (shapeFlag & 64 /* TELEPORT */) {
                    vnode.type.remove(vnode, parentComponent, parentSuspense, optimized, internals, doRemove);
                }
                else if (dynamicChildren &&
                    // #1153: fast path should not be taken for non-stable (v-for) fragments
                    (type !== Fragment ||
                        (patchFlag > 0 && patchFlag & 64 /* STABLE_FRAGMENT */))) {
                    // fast path for block nodes: only need to unmount dynamic children.
                    unmountChildren(dynamicChildren, parentComponent, parentSuspense, false, true);
                }
                else if ((type === Fragment &&
                    (patchFlag & 128 /* KEYED_FRAGMENT */ ||
                        patchFlag & 256 /* UNKEYED_FRAGMENT */)) ||
                    (!optimized && shapeFlag & 16 /* ARRAY_CHILDREN */)) {
                    unmountChildren(children, parentComponent, parentSuspense);
                }
                if (doRemove) {
                    remove(vnode);
                }
            }
            if ((vnodeHook = props && props.onVnodeUnmounted) || shouldInvokeDirs) {
                queuePostRenderEffect(() => {
                    vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode);
                    shouldInvokeDirs &&
                        invokeDirectiveHook(vnode, null, parentComponent, 'unmounted');
                }, parentSuspense);
            }
        };
        const remove = vnode => {
            const { type, el, anchor, transition } = vnode;
            if (type === Fragment) {
                removeFragment(el, anchor);
                return;
            }
            if (type === Static) {
                removeStaticNode(vnode);
                return;
            }
            const performRemove = () => {
                hostRemove(el);
                if (transition && !transition.persisted && transition.afterLeave) {
                    transition.afterLeave();
                }
            };
            if (vnode.shapeFlag & 1 /* ELEMENT */ &&
                transition &&
                !transition.persisted) {
                const { leave, delayLeave } = transition;
                const performLeave = () => leave(el, performRemove);
                if (delayLeave) {
                    delayLeave(vnode.el, performRemove, performLeave);
                }
                else {
                    performLeave();
                }
            }
            else {
                performRemove();
            }
        };
        const removeFragment = (cur, end) => {
            // For fragments, directly remove all contained DOM nodes.
            // (fragment child nodes cannot have transition)
            let next;
            while (cur !== end) {
                next = hostNextSibling(cur);
                hostRemove(cur);
                cur = next;
            }
            hostRemove(end);
        };
        const unmountComponent = (instance, parentSuspense, doRemove) => {
            if (instance.type.__hmrId) {
                unregisterHMR(instance);
            }
            const { bum, effects, update, subTree, um } = instance;
            // beforeUnmount hook
            if (bum) {
                invokeArrayFns(bum);
            }
            if (effects) {
                for (let i = 0; i < effects.length; i++) {
                    stop(effects[i]);
                }
            }
            // update may be null if a component is unmounted before its async
            // setup has resolved.
            if (update) {
                stop(update);
                unmount(subTree, instance, parentSuspense, doRemove);
            }
            // unmounted hook
            if (um) {
                queuePostRenderEffect(um, parentSuspense);
            }
            queuePostRenderEffect(() => {
                instance.isUnmounted = true;
            }, parentSuspense);
            // A component with async dep inside a pending suspense is unmounted before
            // its async dep resolves. This should remove the dep from the suspense, and
            // cause the suspense to resolve immediately if that was the last dep.
            if (parentSuspense &&
                parentSuspense.pendingBranch &&
                !parentSuspense.isUnmounted &&
                instance.asyncDep &&
                !instance.asyncResolved &&
                instance.suspenseId === parentSuspense.pendingId) {
                parentSuspense.deps--;
                if (parentSuspense.deps === 0) {
                    parentSuspense.resolve();
                }
            }
            {
                devtoolsComponentRemoved(instance);
            }
        };
        const unmountChildren = (children, parentComponent, parentSuspense, doRemove = false, optimized = false, start = 0) => {
            for (let i = start; i < children.length; i++) {
                unmount(children[i], parentComponent, parentSuspense, doRemove, optimized);
            }
        };
        const getNextHostNode = vnode => {
            if (vnode.shapeFlag & 6 /* COMPONENT */) {
                return getNextHostNode(vnode.component.subTree);
            }
            if (vnode.shapeFlag & 128 /* SUSPENSE */) {
                return vnode.suspense.next();
            }
            return hostNextSibling((vnode.anchor || vnode.el));
        };
        const render = (vnode, container, isSVG) => {
            if (vnode == null) {
                if (container._vnode) {
                    unmount(container._vnode, null, null, true);
                }
            }
            else {
                patch(container._vnode || null, vnode, container, null, null, null, isSVG);
            }
            flushPostFlushCbs();
            container._vnode = vnode;
        };
        const internals = {
            p: patch,
            um: unmount,
            m: move,
            r: remove,
            mt: mountComponent,
            mc: mountChildren,
            pc: patchChildren,
            pbc: patchBlockChildren,
            n: getNextHostNode,
            o: options
        };
        let hydrate;
        let hydrateNode;
        if (createHydrationFns) {
            [hydrate, hydrateNode] = createHydrationFns(internals);
        }
        return {
            render,
            hydrate,
            createApp: createAppAPI(render, hydrate)
        };
    }
    function invokeVNodeHook(hook, instance, vnode, prevVNode = null) {
        callWithAsyncErrorHandling(hook, instance, 7 /* VNODE_HOOK */, [
            vnode,
            prevVNode
        ]);
    }
    /**
     * #1156
     * When a component is HMR-enabled, we need to make sure that all static nodes
     * inside a block also inherit the DOM element from the previous tree so that
     * HMR updates (which are full updates) can retrieve the element for patching.
     *
     * #2080
     * Inside keyed `template` fragment static children, if a fragment is moved,
     * the children will always moved so that need inherit el form previous nodes
     * to ensure correct moved position.
     */
    function traverseStaticChildren(n1, n2, shallow = false) {
        const ch1 = n1.children;
        const ch2 = n2.children;
        if (isArray(ch1) && isArray(ch2)) {
            for (let i = 0; i < ch1.length; i++) {
                // this is only called in the optimized path so array children are
                // guaranteed to be vnodes
                const c1 = ch1[i];
                let c2 = ch2[i];
                if (c2.shapeFlag & 1 /* ELEMENT */ && !c2.dynamicChildren) {
                    if (c2.patchFlag <= 0 || c2.patchFlag === 32 /* HYDRATE_EVENTS */) {
                        c2 = ch2[i] = cloneIfMounted(ch2[i]);
                        c2.el = c1.el;
                    }
                    if (!shallow)
                        traverseStaticChildren(c1, c2);
                }
                // also inherit for comment nodes, but not placeholders (e.g. v-if which
                // would have received .el during block patch)
                if (c2.type === Comment && !c2.el) {
                    c2.el = c1.el;
                }
            }
        }
    }
    // https://en.wikipedia.org/wiki/Longest_increasing_subsequence
    function getSequence(arr) {
        const p = arr.slice();
        const result = [0];
        let i, j, u, v, c;
        const len = arr.length;
        for (i = 0; i < le