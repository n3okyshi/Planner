const proxyMap = new WeakMap();
const rawMap = new WeakMap();

export function createReactiveState(target, callback, path = "") {
    if (typeof target !== "object" || target === null) {
        return target;
    }

    // Se já é um proxy registrado neste sistema de reatividade, retorna ele mesmo
    if (rawMap.has(target)) {
        return target;
    }

    // Se já existe um proxy criado para este objeto bruto, reaproveita o proxy em cache
    if (proxyMap.has(target)) {
        return proxyMap.get(target);
    }

    const proxy = new Proxy(target, {
        get(obj, prop, receiver) {
            const res = Reflect.get(obj, prop, receiver);

            // Interceptação de métodos de mutação em Arrays (push, pop, shift, unshift, splice, sort, reverse)
            if (Array.isArray(obj) && typeof res === 'function') {
                const arrayMutationMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
                if (arrayMutationMethods.includes(String(prop))) {
                    return function (...args) {
                        const result = Array.prototype[prop].apply(obj, args);
                        const currentPath = path ? `${path}.${String(prop)}` : String(prop);
                        if (typeof callback === 'function') {
                            callback(currentPath, obj, undefined);
                        }
                        return result;
                    };
                }
            }

            // Lazy proxying sob demanda apenas quando uma propriedade objeto é acessada
            if (typeof res === 'object' && res !== null && !(res instanceof Date) && !(res instanceof RegExp)) {
                const currentPath = path ? `${path}.${String(prop)}` : String(prop);
                return createReactiveState(res, callback, currentPath);
            }
            return res;
        },
        set(obj, prop, value, receiver) {
            const oldValue = obj[prop];

            // Evita disparos desnecessários se o valor primitivo for idêntico
            if (oldValue === value && typeof value !== 'object') {
                return true;
            }

            // Desembrulha caso o valor atribuído já seja um proxy para armazenar o dado bruto internamente
            const rawValue = rawMap.get(value) || value;
            const currentPath = path ? `${path}.${String(prop)}` : String(prop);

            const result = Reflect.set(obj, prop, rawValue, receiver);
            if (oldValue !== value && typeof callback === 'function') {
                callback(currentPath, rawValue, oldValue);
            }
            return result;
        },
        deleteProperty(obj, prop) {
            const currentPath = path ? `${path}.${String(prop)}` : String(prop);
            const hadKey = Object.prototype.hasOwnProperty.call(obj, prop);
            const result = Reflect.deleteProperty(obj, prop);
            if (hadKey && typeof callback === 'function') {
                callback(currentPath, undefined, undefined);
            }
            return result;
        }
    });

    proxyMap.set(target, proxy);
    rawMap.set(proxy, target);
    return proxy;
}
