# HTML-app and htmx

Both let you describe interactions in HTML and use an external library script without an application build step. Their main difference is how an interaction produces the next view.

[htmx](https://htmx.org/docs/#introduction) makes HTTP interactions declarative. An element issues a request; the server typically returns HTML that htmx inserts into a target. [HTML-app](../html-app/README.md) makes reactive application state and record operations declarative. A control publishes a value or invokes an action, and Symbiote updates the views bound to that data.

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

In the [HTML-app Todo](../html-app/examples/todo-ref.html), the form operates on a declared record array:

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

## What HTML-app brings to the page

- **Shared reactive data.** Named contexts connect controls and views. Incoming bindings and explicit `pub-to` or `pub-map` publication describe data flow without application event handlers.
- **Local record operations.** Declarative actions create, edit, complete and remove records. Collection filters, search and sorting derive views while preserving the source array.
- **HTML-only component creation.** Declare your own custom element with `sym-component reg`, an inline template or `use-template`, and JSON defaults. Each instance has its own state and can use bindings and declarative actions, without a JavaScript class.
- **Portable HTML composition.** Assemble screens from imported HTML chunks, conditional sections and reusable templates. Chunks can bind to caller-provided data or contain components with their own state, so the same markup can serve different views. RAT keeps the templates portable; Symbiote provides the runtime behavior.
- **Explicit persistence.** Load JSON into a context, save selected fields in browser storage, or send them to a configured HTTP endpoint. Local edits, browser saves and server acknowledgments remain separate operations.
- **Markdown and compact AI output.** A host that loads HTML-app and preserves embedded HTML when rendering Markdown can combine prose and interactive components in one document. Agents can reuse declarative actions and templates, which can reduce output tokens spent on event handlers and state-management boilerplate.
- **Optional agent access.** WebMCP exposes declared UI actions through Symbiote's existing discovery and invocation APIs.

These features suit interactive editors, task lists and tools that need several views of locally editable data, including applications built against existing JSON APIs. A static server is enough for local interaction; shared or protected data still needs an appropriate backend.

For complete applications, start with the [HTML-app feature guide](../html-app/examples/full-app.html).
