## Folder contents

### symbiote.js
All-in-one exports.

### BaseComponent.js
Base component class. Major utility for the web-component creation, template data binding and data management.

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

### repeatProcessor.js
Dynamic list rendering implementation.