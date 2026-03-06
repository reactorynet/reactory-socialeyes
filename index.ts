import SocialEyesGraphql from './graphql';
import services from './services';
import models from './models';
import commands from './cli';
import workflows from './workflows';
import SocialAccounts from './forms/Accounts/SocialAccounts';
import SocialFeed from './forms/Feed/SocialFeed';
import SocialMessages from './forms/Messages/SocialMessages';

const SocialEyesModule: Reactory.Server.IReactoryModule = {
    id: 'reactory-socialeyes',
    nameSpace: 'socialeyes',
    name: 'SocialEyes',
    version: '1.0.0',
    description: 'Social Media Intelligence Module - unified social media monitoring, messaging, and engagement',
    dependencies: [
        'core.ReactoryServer@1.0.0',
    ],
    priority: 3,
    graphDefinitions: SocialEyesGraphql,
    workflows,
    forms: [SocialAccounts, SocialFeed, SocialMessages],
    services,
    models,
    clientPlugins: [],
    cli: commands,
    pdfs: [],
    grpc: [],
    passportProviders: [],
};

export default SocialEyesModule;
