# mst-collection

> Collection abstraction over mobx-state-tree models.

Documentation will coming soon.

## Installation

```sh
npm add mst-collection
```

## Concepts

TODO: Write about entities, collections, entity refs and why we use them.

## Usage

### Using classes to define models

TODO

#### Creating models

TODO

#### Adding actions

TODO

#### Adding views

TODO

#### Adding volatile

TODO

#### Adding views with arguments

Views in mobx-state-tree should be getters in order to apply memoization. But getters don't accept arguments. As a workaround, we use [computedFn from mobx-utils](https://github.com/mobxjs/mobx-utils#computedfn). In order to mark some method as view - use `@view` decorator. It's got its own limitations - refer to [mobx-utils](https://github.com/mobxjs/mobx-utils#computedfnhttps://github.com/mobxjs/mobx-utils#computedfn) for more info.

```ts
import { view, Model, model } from 'mst-collection';

class Counter extends Model({
  count: 1,
}) {
  // notice @view decorator is used before the method
  // we can't use default parameters here
  // also, number of params should be the same each time
  @view getCountPlus(value: number) {
    return this.count + value;
  }
}

const CounterModel = model(Counter);
```

## Limitations

1. Volatile function don't have access to the props of the model.

```ts
 class Counter extends Model({
   count: types.number,
 }) {
  // this is not a action but volatile function
  getCount = () => {
    // this here doesn't have Model properties
    // so count is undefined
    console.log(this.count);
  };

   // this is an action and it hac access to context
   getCountAction() {
     // logs value of count
     console.log(this.count)
   }
 }

 const CounterModel = model(Counter);
 ```

## LICENSE

MIT
