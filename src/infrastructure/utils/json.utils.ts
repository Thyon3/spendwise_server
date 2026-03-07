export class JsonUtils {
  static safeParse<T = any>(json: string, defaultValue: T | null = null): T | null {
    try {
      return JSON.parse(json);
    } catch {
      return defaultValue;
    }
  }

  static safeStringify(obj: any, defaultValue: string = '{}'): string {
    try {
      return JSON.stringify(obj);
    } catch {
      return defaultValue;
    }
  }

  static prettyPrint(obj: any, indent: number = 2): string {
    try {
      return JSON.stringify(obj, null, indent);
    } catch {
      return '{}';
    }
  }

  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  static removeNullValues(obj: any): any {
    return JSON.parse(JSON.stringify(obj, (key, value) => 
      value === null ? undefined : value
    ));
  }
}
