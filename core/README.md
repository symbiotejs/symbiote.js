## Folder contents

### index.js
All-in-one exports.

### BaseComponent.js
Base component class. Major utility for the web-component creation, template data binding and data management.

### html.js
Template literal tag function, that transforms interpolated binding descriptions into resulting html.

### Data.js
Implements data layer for the local component context and the top level context both. The state management approach is based on simple well known pub/sub pattern.

### AppRouter.js
SPA routing utility. Based on native History API.

### tpl-rpcessors.js
Template processing functions. Implements basic template processing flow.

### repeatProcessor.js
Dynamic list rendering implementation.

### dictionary.js
Dictionary for the set of the basic keys.