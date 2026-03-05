import { LitElement, html } from 'lit';
import { TeaRoot, TeaLeaf, cmd, Update, Effect } from 'lit-tea';

// ─── TYPES ─────────────────────────────────────────────────────────────────

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

type Filter = 'all' | 'active' | 'done';

type Msg =
  | { type: 'ADD_TODO'; text: string }
  | { type: 'TOGGLE_TODO'; id: string }
  | { type: 'DELETE_TODO'; id: string }
  | { type: 'SET_FILTER'; filter: Filter }
  | { type: 'LOAD_TODOS' }
  | { type: 'TODOS_LOADED'; todos: Todo[] }
  | { type: 'LOAD_ERROR'; error: string };

interface Model {
  todos: Todo[];
  filter: Filter;
  loading: boolean;
  error: string | null;
}

const init: Model = {
  todos: [],
  filter: 'all',
  loading: false,
  error: null,
};

// ─── EFFECTS ───────────────────────────────────────────────────────────────

const INITIAL_TODOS: Todo[] = [
  { id: crypto.randomUUID(), text: 'Buy milk', done: false },
  { id: crypto.randomUUID(), text: 'Walk the dog', done: true },
  { id: crypto.randomUUID(), text: 'Write some Lit', done: false },
];

const fetchTodos = (): Effect => async (dispatch, signal) => {
  // Simulate async load
  await new Promise(res => setTimeout(res, 300));
  if (signal.aborted) return;
  dispatch({ type: 'TODOS_LOADED', todos: INITIAL_TODOS });
};

// ─── UPDATE ────────────────────────────────────────────────────────────────

const update: Update<Model, Msg> = (model, msg) => {
  switch (msg.type) {
    case 'LOAD_TODOS':
      return cmd({ ...model, loading: true, error: null }, fetchTodos());

    case 'TODOS_LOADED':
      return { ...model, loading: false, todos: msg.todos };

    case 'LOAD_ERROR':
      return { ...model, loading: false, error: msg.error };

    case 'ADD_TODO':
      return {
        ...model,
        todos: [...model.todos, { id: crypto.randomUUID(), text: msg.text, done: false }],
      };

    case 'TOGGLE_TODO':
      return {
        ...model,
        todos: model.todos.map(t => t.id === msg.id ? { ...t, done: !t.done } : t),
      };

    case 'DELETE_TODO':
      return {
        ...model,
        todos: model.todos.filter(t => t.id !== msg.id),
      };

    case 'SET_FILTER':
      return { ...model, filter: msg.filter };
  }
};

// ─── ROOT ──────────────────────────────────────────────────────────────────

class TodoApp extends TeaRoot(init, update)(LitElement) {
  static properties = { _model: { state: true } };

  connectedCallback() {
    super.connectedCallback();
    this.dispatch({ type: 'LOAD_TODOS' });
  }

  render() {
    return html`
      <todo-input
        .model=${this.model}
        .dispatch=${this.dispatch}
      ></todo-input>
      <todo-filters
        .model=${this.model}
        .dispatch=${this.dispatch}
      ></todo-filters>
      <todo-list
        .model=${this.model}
        .dispatch=${this.dispatch}
      ></todo-list>
    `;
  }
}
customElements.define('todo-app', TodoApp);

// ─── LEAVES ────────────────────────────────────────────────────────────────

// Only re-renders when loading or error changes
class TodoInput extends TeaLeaf<Model>('loading', 'error') {
  #text = '';

  render() {
    const { loading, error } = this.slice;
    return html`
      <input
        placeholder="What needs doing?"
        ?disabled=${loading}
        @input=${(e: InputEvent) => this.#text = (e.target as HTMLInputElement).value}
        @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.#submit()}
      />
      <button @click=${this.#submit} ?disabled=${loading}>Add</button>
      ${error ? html`<p class="error">${error}</p>` : ''}
    `;
  }

  #submit = () => {
    if (this.#text.trim()) {
      this.send({ type: 'ADD_TODO', text: this.#text.trim() });
      this.#text = '';
    }
  };
}
customElements.define('todo-input', TodoInput);


// Only re-renders when filter changes
class TodoFilters extends TeaLeaf<Model>('filter') {
  #filters: Filter[] = ['all', 'active', 'done'];

  render() {
    const { filter } = this.slice;
    return html`
      ${this.#filters.map(f => html`
        <button
          ?disabled=${filter === f}
          @click=${() => this.send({ type: 'SET_FILTER', filter: f })}
        >${f}</button>
      `)}
    `;
  }
}
customElements.define('todo-filters', TodoFilters);


// Only re-renders when todos or filter changes
class TodoList extends TeaLeaf<Model>('todos', 'filter', 'loading') {
  get #visible() {
    const { todos, filter } = this.slice;
    switch (filter) {
      case 'active': return todos.filter(t => !t.done);
      case 'done':   return todos.filter(t => t.done);
      default:       return todos;
    }
  }

  render() {
    const { loading } = this.slice;

    if (loading) return html`<p>Loading...</p>`;
    if (!this.#visible.length) return html`<p>Nothing here.</p>`;

    return html`
      <ul>
        ${this.#visible.map(t => html`
          <li>
            <input
              type="checkbox"
              .checked=${t.done}
              @change=${() => this.send({ type: 'TOGGLE_TODO', id: t.id })}
            />
            <span style=${t.done ? 'text-decoration: line-through' : ''}>${t.text}</span>
            <button @click=${() => this.send({ type: 'DELETE_TODO', id: t.id })}>✕</button>
          </li>
        `)}
      </ul>
    `;
  }
}
customElements.define('todo-list', TodoList);
