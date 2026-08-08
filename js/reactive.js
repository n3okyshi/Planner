/**
 * @file reactive.js
 * @description Motor reativo 100% Vanilla JS usando Proxy. Intercepta mudanças no estado e dispara callbacks.
 */

export function createReactiveState(target, callback, path = "") {
    if (typeof target !== "object" || target === null) {
        return target;
    }

    // Envolve recursivamente todos os objetos e arrays aninhados
    for (const key in target) {
        target[key] = createReactiveState(target[key], callback, path ? `${path}.${key}` : key);
    }

    return new Proxy(target, {
        set(obj, prop, value) {
            const currentPath = path ? `${path}.${prop}` : prop;
            const oldValue = obj[prop];

            // Se o novo valor for um objeto/array, torna ele reativo também
            obj[prop] = createReactiveState(value, callback, currentPath);

            // Só aciona o callback se o valor realmente tiver mudado (evita loops)
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