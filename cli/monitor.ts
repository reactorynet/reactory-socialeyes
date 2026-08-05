import Reactory from '@reactorynet/reactory-core';

/**
 * CLI Command to start monitoring listeners
 */
const monitorCommand: Reactory.Server.TCli = {
    nameSpace: 'reactory-socialeyes',
    name: 'Monitor',
    version: '1.0.0',   
    description: 'Start monitoring social media listeners',
    component: async (args: string[], context: Reactory.Server.IReactoryContext): Promise<void> => {
        try {
            const listeningService = context.getService('socialeyes.ListeningService@1.0.0');
            
            if (!listeningService) {
                context.log('ListeningService not found', {}, 'error');
                return;
            }
            
            context.log('Starting all listeners...', {}, 'info');
            await (listeningService as any).startAllListeners();
            context.log('All listeners started', {}, 'info');
            
        } catch (error) {
            context.log('Failed to start listeners', { error }, 'error');
        }
    }
};

export default monitorCommand;
