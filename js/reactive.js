
export function createReactiveState(target, callback, path = "") {
    if (typeof target !== "object" || target === null) {
        return target;
    }
    for (const key in target) {
        target[key] = createReactiveState(target[key], callback, path ? `${path}.${key}` : key);
    }
    return new Proxy(target, {
        set(obj, prop, value) {
            const currentPath = path ? `${path}.${prop}` : prop;
            const oldValue = obj[prop];
            obj[prop] = createReactiveState(value, callback, currentPath);
            if (oldValue !== value) {
                callback(currentPath, value, oldValue);
            }
            return true;
        },
        deleteProperty(obj, prop) {
            const currentPath = path ? `${path}.${prop}` : prop;
            delete obj[prop];
            callback(currentPath, undefined, undefined);
            return true;
        }
    });
}
