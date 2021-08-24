## Folder contents

### BaseComponent.js
Base component class. Major utility for web-component creation and template data binding. Unlike many other libraries, such as React, component instance is not abstract and exsists as a certain DOM element with a standard DOM API methods available.

### State.js
Implements data layer for local component context and the top level context both. The state management approach is based on simple well known pub/sub pattern.

### TypedState.js
Wrapper for the `State` with a runtime type checking.

### TypedColection.js
Normalized typed collection for dedicated data entities.

### AppRouter.js
SPA routing utility.