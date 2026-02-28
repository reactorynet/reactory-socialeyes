import Reactory from '@reactorynet/reactory-core';
import { SocialAccount } from './Account';
import { SocialListener } from './Listener';
import { SocialPost } from './Post';
import { SocialMessage } from './Message';

const SocialEyesModels: Reactory.IReactoryComponentDefinition[] = [
    {
        nameSpace: 'socialeyes',
        name: 'SocialAccount',
        version: '1.0.0',
        component: SocialAccount,
        domain: Reactory.ComponentDomain.model,
        description: 'Social media account credentials and metadata',
        tags: ['social', 'account', 'oauth'],
    },
    {
        nameSpace: 'socialeyes',
        name: 'SocialListener',
        version: '1.0.0',
        component: SocialListener,
        domain: Reactory.ComponentDomain.model,
        description: 'Social media listener/monitor configuration',
        tags: ['social', 'listener', 'monitoring'],
    },
    {
        nameSpace: 'socialeyes',
        name: 'SocialPost',
        version: '1.0.0',
        component: SocialPost,
        domain: Reactory.ComponentDomain.model,
        description: 'Normalized social media post data',
        tags: ['social', 'post', 'content'],
    },
    {
        nameSpace: 'socialeyes',
        name: 'SocialMessage',
        version: '1.0.0',
        component: SocialMessage,
        domain: Reactory.ComponentDomain.model,
        description: 'Social media direct message data',
        tags: ['social', 'message', 'dm'],
    },
];

export default SocialEyesModels;
