import { loadYamlWorkflow } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/YamlToWorkflow';

// ─────────────────────────────────────────────
// Load all YAML workflow definitions
// ─────────────────────────────────────────────

const WORKFLOW_FILES = [
    { filename: 'ProcessDirectMessages.yaml', nameSpace: 'reactory-socialeyes', name: 'ProcessDirectMessages', version: '1.0.0' },
    { filename: 'ContentTakedown.yaml', nameSpace: 'reactory-socialeyes', name: 'ContentTakedown', version: '1.0.0' },
    { filename: 'SocialListeningOrchestration.yaml', nameSpace: 'reactory-socialeyes', name: 'SocialListeningOrchestration', version: '1.0.0' },
    { filename: 'SentimentAnalysisPipeline.yaml', nameSpace: 'reactory-socialeyes', name: 'SentimentAnalysisPipeline', version: '1.0.0' },
];

const workflows: Reactory.Workflow.IWorkflow[] = WORKFLOW_FILES
    .map(({ nameSpace, name, filename, version }) => loadYamlWorkflow(nameSpace, name, filename, version, __dirname))
    .filter((w): w is Reactory.Workflow.IWorkflow => w !== null);

export default workflows;
