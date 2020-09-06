import { types } from 'mobx-state-tree';
import {
  Model,
  model,
  ListModel,
  RootModel,
  CollectionModel,
  EntitiesModel,
} from '../src';

describe('ListModel', () => {
  class Todo extends Model({
    id: types.identifierNumber,
    title: types.string,
    isCompleted: false,
  }) {
    toggleCompleted() {
      this.isCompleted = !this.isCompleted;
    }
  }
  const TodoModel = model(Todo);

  it('Can create list model', () => {
    class TodoList extends ListModel(TodoModel, {
      fromAttribute: 'title',
      idAttribute: 'id',
    }) {
      fetchList() {
        const todos = [
          TodoModel.create({ id: 1, title: '1' }),
          {
            id: 2,
            title: '2',
          },
        ];

        const id = this.first?.id;

        console.log(id);

        this.append(todos);
      }
    }
    const TodoListModel = model(TodoList);

    class MyRoot extends RootModel({
      todoList: TodoListModel,
    }) {}

    const MyRootModel = model(MyRoot);

    const root = MyRootModel.create({});

    root.todoList.fetchList();

    expect(root.todoList.count).toBe(2);
  });

  it('Can use reference late type', () => {
    class TodoList extends ListModel(
      types.reference(types.late(() => TodoModel)),
      {
        fromAttribute: 'title',
        idAttribute: 'id',
      },
    ) {
      fetchList() {
        const todos = ['1', '2'];

        this.append(todos);
      }
    }
    const TodoListModel = model(TodoList);

    const TodosCollectionModel = model(
      class extends CollectionModel(TodoModel) {},
    );
    const MyEntitiesModel = model(
      class extends EntitiesModel({
        todos: TodosCollectionModel,
      }) {},
    );

    class MyRoot extends RootModel({
      todoList: TodoListModel,
      entities: MyEntitiesModel,
    }) {}

    const MyRootModel = model(MyRoot);

    const root = MyRootModel.create({});
    root.entities.todos.add(
      1,
      TodoModel.create({
        id: 1,
        title: 'test',
      }),
    );
    root.entities.todos.add(
      2,
      TodoModel.create({
        id: 2,
        title: 'test',
      }),
    );

    root.todoList.fetchList();

    expect(root.todoList.count).toBe(2);
  });
});
