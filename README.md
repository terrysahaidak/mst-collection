# mst-collection <!-- omit in toc -->

> Collection abstraction over mobx-state-tree models.

- [Installation](#installation)
- [Usage](#usage)
  - [Using classes to define models](#using-classes-to-define-models)
  - [Adding actions](#adding-actions)
  - [Adding views](#adding-views)
  - [Adding views with arguments](#adding-views-with-arguments)
  - [Adding volatile](#adding-volatile)
  - [Extending models](#extending-models)
- [Main Concepts and architecture](#main-concepts-and-architecture)
  - [RootModel](#rootmodel)
  - [CollectionModel](#collectionmodel)
  - [EntitiesModel](#entitiesmodel)
  - [entityRef](#entityref)
  - [Thunks](#thunks)
  - [Using models inside React components](#using-models-inside-react-components)
- [TODOs](#todos)
- [Limitations](#limitations)
- [Acknowledging](#acknowledging)
- [LICENSE](#license)

## Installation

Since mst-collection is just a wrapper around `mobx-state-tree`, we need to make sure we install them all.

```sh
npm add mst-collection mobx-state-tree mobx
```

## Usage

### Using classes to define models

MST-Collections promotes the way to define models using regular es6 classes which gets rid of `this/self` mix in views/actions. Also, it's just easier to read and write and works well with TypeScript.

In order to define a model, we need to use `Model` function:

```ts
import { types } from 'mobx-state-tree';
import { Model } from 'mst-collection';

const BaseTodo = Model({
  // here we can pass any props you would pass to types.model({})
  title: types.string,
  isCompleted: false,
});
```

The Model works pretty much the same as `types.model` but doesn't return the action model. Instead it returns the base class which we can extend with our actions/views:

```ts
class Todo extends BaseTodo {
  // all the actions/views can be defined here
}
```

In order to avoid some of the naming collisions we can get rid of BaseTodo and run that fabric directly:

```ts
class Todo extends Model({
  // here we can pass any props you would pass to types.model({})
  title: types.string,
  isCompleted: false,
}) {
  get info() {
    // we no longer need self
    return `${this.title} - Completed: ${this.isCompleted}`;
  }

  printInfo() {
    // `this` has access to both model and class properties
    console.log(this.info);
  }
}
```

But still this Todo class is not a MST model. In order to convert it - we should use `model` function and then we can use it as a regular model:

```ts
import { model } from 'mst-collection';

const TodoModel = model(Todo);

const todo = TodoModel.create({
  title: 'Create docs for mst-collection',
});

todo.printInfo(); // prints: Create docs for mst-collection - Completed: false
```

### Adding actions

All the methods in the model class are actions. They should be defined ES6 class methods. Arrow functions won't work (see Limitations sections). Also, they are bound to the model context under the hood se no need for `bind` in the constructor.

```ts
class Todo extends Model({
  // ...
}) {
  toggleCompleted() {
    // this is going to be executed in action context
    // you can synchronously mutate model's props and run other actions
    this.isCompleted = !this.isCompleted;
  }
}
```

Actions can be async, too. You can mark them as with `async` and use `await` in the body of the method. But you can't mutate the props of the model in the async actions, only using other actions:

```ts
class Todo extends Model({
  // ...
  id: types.optional(types.number, uuid),
  toggleCompletedStatus: types.enum(['pending', 'running', 'error']),
}) {
  setToggleCompletedStatus(status: 'pending' | 'running' | 'error') {
    this.toggleCompletedStatus = status;
  }

  setIsCompleted(value: boolean) {
    this.isCompleted = value;
  }

  async toggleCompleted() {
    const prevValue = this.isCompleted;

    try {
      this.setToggleCompletedStatus('running');

      this.setIsCompleted(!prevValue);

      await Api.Todo.setCompleted(this.id);

      this.setToggleCompletedStatus('pending');
    } catch (err) {
      this.setToggleCompletedStatus('error');

      this.setIsCompleted(prevValue);
    }
  }
}
```

### Adding views

Views in MST are getters which access some observables and return some value. It works in the same way in our class-based models.

In order to define a view, we need to define a getter:

```ts
class Todo extends Model({
  // here we can pass any props you would pass to types.model({})
  title: types.string,
  isCompleted: false,
}) {
  // this is view/computed property
  get info() {
    // we no longer need self
    return `${this.title} - Completed: ${this.isCompleted}`;
  }

  // this will be an ACTION
  // you can use it too but it won't be computed and memoized
  info() {
    // we no longer need self
    return `${this.title} - Completed: ${this.isCompleted}`;
  }
}
```

### Adding views with arguments

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

### Adding volatile

All the instance properties of the model are volatile.

```ts
class Counter extends Model({
  count: 1,
}) {
  // volatile field
  countOfIncrements = 0;

  // this is an action
  increment() {
    // this is observable
    this.count += 1;

    this.incrementCountOfIncrements();
  }

  // this is not an actions
  // you can't mutate model props here
  incrementCountOfIncrements = () => {
    // this is just a local state field
    // so we can mutate it
    this.countOfIncrements += 1;
  }
}
```

### Extending models

TODO

## Main Concepts and architecture

TODO: Write about entities, collections, entity refs and why we use them, how we name our models, what is the folder structure and how we inject them into our react components.

### RootModel

TODO

### CollectionModel

TODO

### EntitiesModel

TODO

### entityRef

TODO

### Thunks

TODO

### Using models inside React components

TODO

## TODOs

- [ ] - Add persist
- [ ] - Add ListModel
- [ ] - Add second param to the model function to specify decorators
- [ ] - Add ability to config the ref id generator function
- [ ] - Add ability to change thunk model (add new stuff)
- [ ] - Add more tests

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

## Acknowledging

This project is inspired by [mobx-keystone](https://github.com/xaviergonz/mobx-keystone) by @xaviergonz, [mst-decorators](https://github.com/farwayer/mst-decorators) by @farwayer and [classy-mst](https://github.com/charto/classy-mst) by @charto.

Special thanks to @mweststrate and the team behind mobx for mobx and mobx-state-tree!

Also, big thanks to [Apiko](https://apiko.com) and [LetApp](https://let.app) where all those ideas have been born, implemented, and used by many projects.

## LICENSE

MIT
