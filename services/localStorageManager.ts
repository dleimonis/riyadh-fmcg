
export function getInitialState<T>(key: string, defaultValue: T): T {
    try {
        const storedValue = localStorage.getItem(key);
        if (storedValue) {
            return JSON.parse(storedValue) as T;
        }
    } catch (error) {
        console.error(`Error reading from localStorage key “${key}”:`, error);
        return defaultValue;
    }
    return defaultValue;
}
