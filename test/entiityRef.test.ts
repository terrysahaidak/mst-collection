import { types } from 'mobx-state-tree';
import {
  Model,
  model,
  getReferenceParentOfType,
  createEntityRef,
  castEntityRef,
} from '../src';

describe('EntityRef', () => {
  it('should resolve reference parent with given type', () => {
    class Application extends Model({
      id: types.identifierNumber,
    }) {
      action() {
        // замість getParent
        const post = getReferenceParentOfType(this, PostModel);

        return post;
      }
    }

    const ApplicationModel = model(Application);
    // мутимо спеціальний тип для референсу
    const applicationRef = createEntityRef(
      'applications',
      ApplicationModel,
    );

    class Post extends Model({
      id: types.identifierNumber,
      // обов'язково юзаємо його
      application: types.maybe(applicationRef),
    }) {
      setRef(id: number) {
        // можна і напряму id прокинути
        // але TS цього не любить

        this.application = castEntityRef(id);
      }
    }

    const PostModel = model(Post);

    const EntitiesModel = types.model('EntitiesModel', {
      applications: types.map(ApplicationModel),
      posts: types.map(PostModel),
    });

    const RootModel = types.model('Root', {
      posts: types.array(types.reference(PostModel)),
      entities: types.optional(EntitiesModel, {}),
    });

    const root = RootModel.create({
      posts: [1],
      entities: {
        posts: {
          1: {
            id: 1,
            application: 1,
          },
        },
        applications: {
          1: {
            id: 1,
          },
        },
      },
    });

    const post = root.posts[0];

    post.setRef(1);

    const resolvedPost = post.application!.current.action();

    expect(resolvedPost).not.toBeUndefined();

    expect(resolvedPost!.id).toBe(1);
  });
});
