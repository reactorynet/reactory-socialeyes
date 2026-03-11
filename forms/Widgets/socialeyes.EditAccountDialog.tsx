import Reactory from '@reactorynet/reactory-core';

interface EditAccountDialogDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface EditAccountDialogProps {
  reactory: Reactory.Client.IReactoryApi;
  open: boolean;
  account: any;
  onComplete: (account?: any) => void;
  onCancel: () => void;
}

const PLATFORMS = [
  { value: 'x', label: 'X (Twitter)', icon: 'tag', color: '#000000' },
  { value: 'reddit', label: 'Reddit', icon: 'forum', color: '#FF4500' },
];

/** Strip leading @ or u/ from a handle to get a bare username */
const stripHandle = (name: string) => name.replace(/^[@]|^u\//, '').trim();

const EditAccountDialog = (props: EditAccountDialogProps) => {
  const { reactory, open, account, onComplete, onCancel } = props;

  const {
    React,
    Material,
  } = reactory.getComponents<EditAccountDialogDependencies>([
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
    Stepper,
    Step,
    StepLabel,
    Icon,
    Chip,
    IconButton,
    Avatar,
    Tooltip,
  } = MaterialCore;

  if (!React || !Material) return null;

  const [activeStep, setActiveStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const [formData, setFormData] = React.useState({
    platform: account?.provider || '',
    accessToken: account?.accessToken || '',
    refreshToken: account?.refreshToken || '',
    providerAccountId: account?.providerAccountId || '',
    name: account?.name || '',
    email: account?.email || '',
    scopes: account?.scopes ? [...account.scopes] : [] as string[],
  });

  const [scopeInput, setScopeInput] = React.useState('');
  const [lookupUsername, setLookupUsername] = React.useState(stripHandle(account?.name || ''));
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [lookupResult, setLookupResult] = React.useState<any>(null);
  const [lookupError, setLookupError] = React.useState<string | null>(null);

  // Reset form when account prop changes or dialog opens
  React.useEffect(() => {
    if (open && account) {
      setFormData({
        platform: account.provider || '',
        accessToken: account.accessToken || '',
        refreshToken: account.refreshToken || '',
        providerAccountId: account.providerAccountId || '',
        name: account.name || '',
        email: account.email || '',
        scopes: account.scopes ? [...account.scopes] : [],
      });
      setActiveStep(0);
      setError(null);
      setSuccess(false);
      setLookupUsername(stripHandle(account.name || ''));
      setLookupResult(null);
      setLookupError(null);
    }
  }, [open, account]);

  const steps = ['Account Details', 'Credentials'];

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const addScope = () => {
    const trimmed = scopeInput.trim();
    if (trimmed && !formData.scopes.includes(trimmed)) {
      updateField('scopes', [...formData.scopes, trimmed]);
      setScopeInput('');
    }
  };

  const removeScope = (scope: string) => {
    updateField('scopes', formData.scopes.filter((s: string) => s !== scope));
  };

  const handleLookup = async () => {
    const username = lookupUsername.trim().replace(/^[@u\/]+/, '');
    if (!username) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const result = await reactory.graphqlQuery(
        `query SocialEyesLookupAccount($input: SocialEyesAccountLookupInput!) {
          socialEyesLookupAccount(input: $input) {
            id
            username
            name
            avatar
            bio
            followerCount
            verified
            url
          }
        }`,
        { input: { platform: formData.platform, username } },
      );

      const found = result?.data?.socialEyesLookupAccount;
      if (found) {
        setLookupResult(found);
        updateField('providerAccountId', found.id);
        // Update display name to match the platform convention
        const handle = formData.platform === 'reddit' ? `u/${found.username}` : `@${found.username}`;
        updateField('name', handle);
      } else {
        setLookupError('Account not found. Please verify the username or update the Platform Account ID manually.');
      }
    } catch (err: any) {
      setLookupError('Lookup failed. Please update the Platform Account ID manually.');
    } finally {
      setLookupLoading(false);
    }
  };

  const canAdvance = () => {
    switch (activeStep) {
      case 0:
        return !!formData.providerAccountId && !!formData.name;
      case 1:
        return !!formData.accessToken;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep((prev: number) => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((prev: number) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const input: Record<string, any> = {
        platform: formData.platform,
        accessToken: formData.accessToken,
        providerAccountId: formData.providerAccountId,
        name: formData.name,
      };

      if (formData.refreshToken) input.refreshToken = formData.refreshToken;
      if (formData.email) input.email = formData.email;
      if (formData.scopes.length > 0) input.scopes = formData.scopes;

      const result = await reactory.graphqlMutation(
        `mutation SocialEyesConnectAccount($input: SocialEyesConnectAccountInput!) {
          socialEyesConnectAccount(input: $input) {
            id
            provider
            providerAccountId
            name
            email
            avatar
            profileUrl
            isActive
            scopes
            createdAt
            updatedAt
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
        onComplete(result.data?.socialEyesConnectAccount);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to update account');
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onCancel();
    }
  };

  const selectedPlatform = PLATFORMS.find((p) => p.value === formData.platform);

  const renderDetailsStep = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Icon sx={{ color: selectedPlatform?.color || '#757575' }}>
          {selectedPlatform?.icon || 'public'}
        </Icon>
        <Typography variant="body2" color="text.secondary">
          Editing {selectedPlatform?.label || ''} account
        </Typography>
      </Box>

      {/* ── Account Lookup ── */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Look Up Account
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <TextField
            size="small"
            label={formData.platform === 'reddit' ? 'Reddit username (without u/)' : 'Username / handle (without @)'}
            value={lookupUsername}
            onChange={(e: any) => setLookupUsername(e.target.value)}
            onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(); } }}
            sx={{ flex: 1 }}
            disabled={lookupLoading}
          />
          <Tooltip title="Re-fetch account details from the platform to update the Platform ID">
            <span>
              <Button
                variant="outlined"
                size="small"
                onClick={handleLookup}
                disabled={!lookupUsername.trim() || lookupLoading}
                startIcon={lookupLoading ? <CircularProgress size={14} /> : <Icon>search</Icon>}
                sx={{ whiteSpace: 'nowrap', mt: 0.25 }}
              >
                {lookupLoading ? 'Looking up…' : 'Look Up'}
              </Button>
            </span>
          </Tooltip>
        </Box>

        {lookupError && (
          <Alert severity="warning" sx={{ mt: 1 }} onClose={() => setLookupError(null)}>
            {lookupError}
          </Alert>
        )}

        {lookupResult && (
          <Box
            sx={{
              mt: 1,
              p: 1.5,
              border: '1px solid',
              borderColor: 'success.light',
              borderRadius: 1,
              bgcolor: 'success.50',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            {lookupResult.avatar && (
              <Avatar src={lookupResult.avatar} sx={{ width: 40, height: 40 }} />
            )}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {lookupResult.name || lookupResult.username}
                </Typography>
                {lookupResult.verified && (
                  <Icon sx={{ fontSize: 16, color: 'primary.main' }}>verified</Icon>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" noWrap>
                @{lookupResult.username}
                {lookupResult.followerCount != null && ` · ${lookupResult.followerCount.toLocaleString()} followers`}
              </Typography>
            </Box>
            <Icon sx={{ color: 'success.main' }}>check_circle</Icon>
          </Box>
        )}
      </Box>

      {/* ── Manual / Auto-filled Fields ── */}
      <TextField
        label="Account ID on Platform"
        value={formData.providerAccountId}
        onChange={(e: any) => updateField('providerAccountId', e.target.value)}
        required
        fullWidth
        helperText={
          lookupResult
            ? 'Auto-filled from lookup — you can still edit this manually'
            : formData.platform === 'x'
            ? 'Your X/Twitter user ID (numeric)'
            : 'Your Reddit username (without u/)'
        }
      />
      <TextField
        label="Display Name / Handle"
        value={formData.name}
        onChange={(e: any) => updateField('name', e.target.value)}
        required
        fullWidth
        helperText={
          formData.platform === 'x'
            ? 'e.g. @yourusername'
            : 'e.g. u/yourusername'
        }
      />
      <TextField
        label="Email (optional)"
        value={formData.email}
        onChange={(e: any) => updateField('email', e.target.value)}
        fullWidth
        type="email"
      />
    </Box>
  );

  const renderCredentialsStep = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Update the OAuth credentials for your {selectedPlatform?.label || ''} account.
      </Typography>

      <TextField
        label="Access Token / Bearer Token"
        value={formData.accessToken}
        onChange={(e: any) => updateField('accessToken', e.target.value)}
        required
        fullWidth
        type="password"
        autoComplete="off"
      />
      <TextField
        label="Refresh Token (optional)"
        value={formData.refreshToken}
        onChange={(e: any) => updateField('refreshToken', e.target.value)}
        fullWidth
        type="password"
        autoComplete="off"
        helperText="Required for auto-refreshing tokens when they expire"
      />

      <Box>
        <Typography variant="body2" sx={{ mb: 1 }}>
          OAuth Scopes (optional)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="e.g. tweet.read"
            value={scopeInput}
            onChange={(e: any) => setScopeInput(e.target.value)}
            onKeyDown={(e: any) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addScope();
              }
            }}
            sx={{ flex: 1 }}
          />
          <Button
            size="small"
            variant="outlined"
            onClick={addScope}
            disabled={!scopeInput.trim()}
          >
            Add
          </Button>
        </Box>
        {formData.scopes.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
            {formData.scopes.map((scope: string) => (
              <Chip
                key={scope}
                label={scope}
                size="small"
                onDelete={() => removeScope(scope)}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderDetailsStep();
      case 1:
        return renderCredentialsStep();
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={submitting}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon color="primary">edit</Icon>
        Edit Account
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={handleClose} disabled={submitting}>
          <Icon>close</Icon>
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 2 }}>
          {steps.map((label: string) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Account updated successfully!
          </Alert>
        )}

        {!success && renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={submitting}>
            Back
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canAdvance()}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canAdvance() || submitting || success}
            startIcon={submitting ? <CircularProgress size={18} /> : <Icon>save</Icon>}
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

const Definition: any = {
  name: 'EditAccountDialog',
  nameSpace: 'socialeyes',
  version: '1.0.0',
  component: EditAccountDialog,
  roles: ['USER'],
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    EditAccountDialog,
    ['SocialEyes', 'Dialog'],
    Definition.roles,
    true,
    [],
    'widget',
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: EditAccountDialog,
  });
}

export default EditAccountDialog;
