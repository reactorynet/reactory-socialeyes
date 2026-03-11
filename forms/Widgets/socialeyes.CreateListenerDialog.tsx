import Reactory from '@reactorynet/reactory-core';

interface CreateListenerDialogDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface CreateListenerDialogProps {
  reactory: Reactory.Client.IReactoryApi;
  open: boolean;
  account: any;
  onComplete: (listener?: any) => void;
  onCancel: () => void;
}

const LISTENER_TYPES = [
  { value: 'keyword', label: 'Keyword', icon: 'search', description: 'Monitor posts containing specific keywords' },
  { value: 'hashtag', label: 'Hashtag', icon: 'tag', description: 'Track posts with specific hashtags' },
  { value: 'mention', label: 'Mention', icon: 'alternate_email', description: 'Watch for mentions of a user or brand' },
  { value: 'user', label: 'User', icon: 'person', description: 'Follow posts from a specific user' },
  { value: 'group', label: 'Group', icon: 'group', description: 'Monitor a group or subreddit' },
];

const CreateListenerDialog = (props: CreateListenerDialogProps) => {
  const { reactory, open, account, onComplete, onCancel } = props;

  const {
    React,
    Material,
  } = reactory.getComponents<CreateListenerDialogDependencies>([
    'react.React',
    'material-ui.Material',
  ]);

  const { MaterialCore } = Material;
  const {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Alert,
    CircularProgress,
    Icon,
    IconButton,
    MenuItem,
  } = MaterialCore;

  if (!React || !Material) return null;

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const [formData, setFormData] = React.useState({
    name: '',
    type: '',
    query: '',
    intervalMinutes: 15,
  });

  React.useEffect(() => {
    if (open) {
      setFormData({ name: '', type: '', query: '', intervalMinutes: 15 });
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const canSubmit = () => {
    return !!formData.name && !!formData.type && !!formData.query && formData.intervalMinutes >= 0;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const input: Record<string, any> = {
        name: formData.name,
        platform: account.provider,
        type: formData.type,
        query: formData.query,
        intervalMinutes: formData.intervalMinutes,
      };

      const result = await reactory.graphqlMutation(
        `mutation SocialEyesCreateListener($input: SocialEyesCreateListenerInput!) {
          socialEyesCreateListener(input: $input) {
            id
            name
            platform
            type
            query
            intervalMinutes
            isActive
            lastRun
          }
        }`,
        { input },
        {},
      );

      if (result.errors && result.errors.length > 0) {
        setError(result.errors.map((e: any) => e.message).join('; '));
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setSubmitting(false);

      setTimeout(() => {
        onComplete(result.data?.socialEyesCreateListener);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to create listener');
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onCancel();
    }
  };

  const selectedType = LISTENER_TYPES.find((t) => t.value === formData.type);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={submitting}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon color="primary">hearing</Icon>
        Create Listener
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={handleClose} disabled={submitting}>
          <Icon>close</Icon>
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Listener created successfully!
          </Alert>
        )}

        {!success && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Create a new listener for the {account?.provider?.toUpperCase()} platform.
            </Typography>

            <TextField
              label="Listener Name"
              value={formData.name}
              onChange={(e: any) => updateField('name', e.target.value)}
              required
              fullWidth
              helperText="A descriptive name for this listener"
            />

            <TextField
              label="Listener Type"
              value={formData.type}
              onChange={(e: any) => updateField('type', e.target.value)}
              required
              fullWidth
              select
              helperText={selectedType?.description || 'Select the type of content to monitor'}
            >
              {LISTENER_TYPES.map((lt) => (
                <MenuItem key={lt.value} value={lt.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon fontSize="small">{lt.icon}</Icon>
                    {lt.label}
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Search Query"
              value={formData.query}
              onChange={(e: any) => updateField('query', e.target.value)}
              required
              fullWidth
              helperText={
                formData.type === 'hashtag' ? 'Enter hashtag without #' :
                formData.type === 'mention' ? 'Enter username to watch for mentions' :
                formData.type === 'user' ? 'Enter the username to follow' :
                formData.type === 'group' ? 'Enter the group or subreddit name' :
                'Enter the keyword or phrase to search for'
              }
            />

            <TextField
              label="Polling Interval (minutes)"
              value={formData.intervalMinutes}
              onChange={(e: any) => updateField('intervalMinutes', parseInt(e.target.value, 10) || 0)}
              fullWidth
              type="number"
              inputProps={{ min: 0 }}
              helperText="How often to check for new content (0 for webhook-based)"
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit() || submitting || success}
          startIcon={submitting ? <CircularProgress size={18} /> : <Icon>add</Icon>}
        >
          {submitting ? 'Creating...' : 'Create Listener'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Definition: any = {
  name: 'CreateListenerDialog',
  nameSpace: 'socialeyes',
  version: '1.0.0',
  component: CreateListenerDialog,
  roles: ['USER'],
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    CreateListenerDialog,
    ['SocialEyes', 'Dialog'],
    Definition.roles,
    true,
    [],
    'widget',
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: CreateListenerDialog,
  });
}

export default CreateListenerDialog;
