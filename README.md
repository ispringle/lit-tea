# lit-tea

The [Elm Architecture](https://guide.elm-lang.org/architecture/) for
[Lit](https://lit.dev). Unidirectional data flow, explicit state transitions,
and managed side effects. 100 lines and no dependencies beyond Lit itself.

## Concepts

**Model** - a plain object representing all component state.

**Msg** - a discriminated union describing every possible state transition.

**Update** - a pure function that takes the current model and a message, and
returns a new model (and optionally side effects).

**Effect** — an async function that runs a side effect and dispatches messages
when done. Receives an `AbortSignal` that fires when the root component
disconnects.

## API

### `TeaRoot(init, update)`

A class mixin factory. Takes an initial model and an update function. Returns a
mixin to apply to `LitElement`.

Owns the model, runs effects, cancels in-flight effects on disconnect, and
exposes `model` and `dispatch` for passing to leaves.

```ts
class MyApp extends TeaRoot(init, update)(LitElement) {
  render() {
    return html`<my-leaf .model=${this.model} .dispatch=${this.dispatch}></my-leaf>`;
  }
}
```

### `TeaLeaf(...keys)`

A base class factory. Takes the model keys this component cares about. Returns a
base class with:

- `slice` - the projected subset of the model
- `send(msg)` - shorthand for `this.dispatch(msg)`
- `shouldUpdate` - only re-renders when declared keys change

```ts
class MyLeaf extends TeaLeaf<Model>('count', 'loading') {
  render() {
    const { count, loading } = this.slice;
    return html`...`;
  }
}
```

### `cmd(model, ...effects)`

Sugar for returning a model and one or more effects from `update`.

```ts
case 'FETCH':
  return cmd({ ...model, loading: true }, fetchData(model.query));
```
