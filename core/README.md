## Folder contents

### BaseComponent.js
Base component class. Major utility for web-component creation and template data binding. Unlike many other libraries, such as React, component instance is not abstract and exists as a certain DOM element with a standard DOM API methods available.

### Data.js
Implements data layer for the local component context and the top level context both. The state management approach is based on simple well known pub/sub pattern.

### TypedData.js
Wrapper for the `Data` with a runtime type checking. Useful to organize domain specific data entities.

### TypedColection.js
Normalized typed collection for dedicated domain specific data entities. Useful to organize domain specific data collections.

### AppRouter.js
SPA routing utility. Based on native History API.

### tpl-rpcessors.js
Template processing functions. Implements basic template processing flow.