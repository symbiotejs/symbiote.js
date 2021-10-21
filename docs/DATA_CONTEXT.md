## $ - is for state

With Symbiote.js you don't need any external state management library. It's easy to connect, but you really just don't need it in most cases.

All components created with Symbiote.js are present in some data context. Some of properties in that context are local and accesible for certain component only. Some of data could be recieved form one of the parent components in document tree. Some of data could be recieved from the abstract data layers using unique names. You can organize your application data flow with a high level of flexibility. Let's clarify what does it mean.

```javascript
class MyComponent extends BaseComponent {
  init$ = {

  }
}
```
## Local context

## Hierarchical context

## Named context (abstract)