import { LitElement } from 'lit';

export type Effect = (dispatch: (msg: any) => void, signal: AbortSignal) => void;
export type UpdateResult = object | [object, ...Effect[]];
export type Update<M, Msg> = (model: M, msg: Msg) => UpdateResult;

export const cmd = <M extends object>(model: M, ...effects: Effect[]): UpdateResult =>
  [model, ...effects];

type Constructor<T = LitElement> = new (...args: any[]) => T;

export const TeaRoot = <M extends object, Msg>(
  init: M,
  update: Update<M, Msg>
) =>
  <T extends Constructor>(Base: T) =>
    class extends Base {
      static properties = { _model: { state: true } };

      _model: M = init;
      private _controllers: AbortController[] = [];

      dispatch = (msg: Msg) => {
        const result = update(this._model, msg);
        const [newModel, ...effects] = Array.isArray(result) ? result : [result];
        this._model = newModel as M;
        (effects as Effect[]).forEach(fx => {
          const controller = new AbortController();
          this._controllers.push(controller);
          controller.signal.addEventListener('abort', () => {
            this._controllers = this._controllers.filter(c => c !== controller);
          });
          fx(m => this.dispatch(m as Msg), controller.signal);
        });
      };

      disconnectedCallback() {
        super.disconnectedCallback();
        this._controllers.forEach(c => c.abort());
        this._controllers = [];
      }

      get model(): M { return this._model; }
    };

export const TeaLeaf = <M extends object, K extends keyof M>(...keys: K[]) => {
  class TeaLeafElement extends LitElement {
    static properties = {
      model: { attribute: false },
      dispatch: { attribute: false },
    };

    model!: M;
    dispatch!: (msg: any) => void;

    get slice(): Pick<M, K> {
      return keys.reduce(
        (acc, k) => ({ ...acc, [k]: this.model[k] }),
        {} as Pick<M, K>
      );
    }

    shouldUpdate(changed: Map<string, unknown>) {
      if (!changed.has('model')) return true;
      const prev = changed.get('model') as M | undefined;
      if (!prev) return true;
      return keys.some(k => prev[k] !== this.model[k]);
    }

    send = (msg: any) => this.dispatch(msg);
  }

  return TeaLeafElement;
};
