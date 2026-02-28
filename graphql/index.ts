import Reactory from '@reactorynet/reactory-core';
import Directives from './directives';
import Types from './schema';
import Resolvers from './resolvers';

const SocialEyesGraphql: Reactory.Graph.IGraphDefinitions = {
  Resolvers,
  Types,
  Directives
};

export default SocialEyesGraphql;
