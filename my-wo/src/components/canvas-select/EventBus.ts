export default class EventBus {
  public _eventTree: Record<string, any> = {};

  on(eventName: string, cb: Function) {
    const fns = this._eventTree[eventName];
    if (Array.isArray(fns)) {
      fns.push(cb);
    } else {
      this._eventTree[eventName] = cb;
    }
  }

  emit(eventName: string, ...payload: any) {
    const fns = this._eventTree[eventName];
    if (Array.isArray(fns)) {
      fns.forEach(fn => fn(...payload));
    }
  }

  off(eventName: string, cb: Function) {
    const fns = this._eventTree[eventName];
    const index = fns.find((fn: Function) => fn === cb);
    if (Array.isArray(fns) && index) {
      fns.splice(index, 1);
    }
  }
}