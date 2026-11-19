# Symbiote HTML-app VS htmx

Both let you describe interactions in HTML and use an external library script without an application build step. Both can fetch server-rendered HTML and update part of a page.

[htmx](https://htmx.org/docs/#introduction) specializes in declarative HTTP requests and response-driven DOM updates.

[HTML-app](../html-app/README.md) combines HTML imports with reactive state, record operations and reusable components. A Symbiote application can load views from a server, update them locally through data bindings, or combine both approaches.

## Fetching server-rendered HTML

With htmx, an element can fetch a fragment when it loads:

```html
<section hx-get="/tasks/view" hx-trigger="load">
  <p>Loading tasks...</p>
</section>
```

With HTML-app, `sym-import` can fetch the same endpoint:

```html
<sym-import src="/tasks/view">
  <p>Loading tasks...</p>
</sym-import>
```

In both cases, the server can query a database, apply application rules and return the resulting HTML. The endpoint can generate each response dynamically. `sym-import` also accepts static fragments, and its `src` can be bound to reactive state to load another view.

Imported markup participates in Symbiote's component and binding model. It can consume caller-provided data, publish changes to surrounding contexts and declare components with their own state. A server can return an interactive fragment whose subsequent edits happen locally. See the [HTML fragment contract](../html-app/README.md#html-fragments) for supported markup and loading behavior.

## Adding a task

With htmx, a form can submit to an endpoint and append the returned task markup:

```html
<form hx-post="/tasks" hx-target="#tasks" hx-swap="beforeend">
  <input name="title" required>
  <button>Add task</button>
</form>
<ul id="tasks"></ul>
```

The application supplies `/tasks`, including validation, any persistence and the task's HTML. [`hx-post`](https://htmx.org/attributes/hx-post/) sends the request; [`hx-swap="beforeend"`](https://htmx.org/attributes/hx-swap/) appends the response inside the list. This fits an application whose server already renders its UI.

HTML-app also supports local record operations. In the [HTML-app Todo](../html-app/examples/todo-ref.html), the form operates on a declared record array:

```html
<sym-context bind="$: APP/draft" pub-to="APP/draft">
  <form action-data="APP/draft" action-reset="APP/draft"
    bind="onsubmit: [append]APP/tasks">
    <input required bind="value: title; oninput: [pub-to]title">
    <button>Add task</button>
  </form>
</sym-context>
```

This excerpt uses the `APP/draft` object and `APP/tasks` array declared in the complete Todo. Submission validates the form, appends a record and resets the draft. A collection renders the array through an Itemize template. Adding, editing and completing tasks can happen locally, with no request for replacement markup. The feature guide extends this with filtering and explicit browser saving.

These examples show two ways to implement task creation. The local Todo demonstrates an additional HTML-app capability; server-rendered fragments remain available through `sym-import`.

## Built-in request behavior

htmx provides dedicated declarations for [request triggers](https://htmx.org/attributes/hx-trigger/), [response targets](https://htmx.org/attributes/hx-target/) and [swap strategies](https://htmx.org/attributes/hx-swap/). These cover workflows such as submitting a form and appending its HTML response, polling an endpoint, or replacing another element.

HTML-app's current `sym-import` contract uses GET and replaces the import's own content. Its separate context sync action sends JSON with PUT, POST or PATCH and accepts a JSON acknowledgment or a 204 response. Sync does not insert an HTML response. Reproducing an htmx POST-and-append workflow would require additional application behavior, such as a custom Symbiote component or action.

Symbiote's component API allows applications to implement further request and rendering behavior. Its broader application model provides capabilities beyond HTML fetching, while the built-in HTML-app declarations and htmx attributes cover different sets of operations.

## What Symbiote HTML-app brings to the page

- **Shared reactive data.** Named contexts connect controls and views. Incoming bindings and explicit `pub-to` or `pub-map` publication describe data flow without application event handlers.
- **Static and dynamic JSON requests.** Use `<sym-context src="./data.json">` for a fixed source URL, or `<sym-context bind="@src: dataSrcPath">` to bind the URL to parent state and request data when the path changes. Either form can load a static JSON file or a server-generated JSON object. Fetched fields merge into the context and update bound views while preserving local edits. Loading and error states are available declaratively. See [JSON requests](../html-app/README.md#json-sources-and-explicit-synchronization).
- **Local record operations.** Declarative actions create, edit, complete and remove records. Collection filters, search and sorting derive views while preserving the source array.
- **HTML-only component creation.** Declare your own custom element with `sym-component reg`, an inline template or `use-template`, and JSON defaults. Each instance has its own state and can use bindings and declarative actions, without a JavaScript class.
- **Portable HTML composition.** Assemble screens from imported HTML chunks, conditional sections and reusable templates. Chunks can bind to caller-provided data or contain components with their own state, so the same markup can serve different views. RAT keeps the templates portable; Symbiote provides the runtime behavior.
- **SPA and non-SPA routing.** The built-in `sym-router` declares path or query-string routes in HTML, with URL parameters, page titles and Back/Forward support. Bind the selected route to `sym-import` to switch views while keeping shared contexts mounted. Ordinary links retain full-page navigation for non-SPA pages, so both styles can coexist. See [declarative routing](../html-app/README.md#declarative-routing).
- **Explicit persistence.** Load JSON into a context, save selected fields in browser storage, or send them to a configured HTTP endpoint. Local edits, browser saves and server acknowledgments remain separate operations.
- **Markdown and compact AI output.** A host that loads HTML-app and preserves embedded HTML when rendering Markdown can combine prose and interactive components in one document. Agents can reuse declarative actions and templates, which can reduce output tokens spent on event handlers and state-management boilerplate.
- **Optional agent access.** WebMCP exposes declared UI actions through Symbiote's existing discovery and invocation APIs.

These features suit applications that combine server-rendered views with local editing, including interactive editors, task lists and tools built against existing JSON APIs. A static server is enough for local interaction; shared or protected data still needs an appropriate backend.

For complete applications, start with the [HTML-app feature guide](../html-app/examples/full-app.html).
